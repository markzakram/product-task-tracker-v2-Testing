const { transaksi, GalatMySQL, kutip } = require('../api/_mysql-core');
const { SCHEMA, flatten, siapkanBaris, validasiRelasi, insertRows } = require('./_mysql-model');
const { ROOTS, validasiSnapshot, hash } = require('./_mysql-snapshot');

function persiapkan(input) {
  const snapshot = validasiSnapshot(input), rows = flatten(snapshot.real.data);
  for (const name of ['orang', 'pin', 'foto', 'tampilan', 'master', 'pribadi', 'setelan']) rows[name] = snapshot.aplikasi[name];
  rows.master = snapshot.aplikasi.master.map(({ jenis, kunci, aktif, urutan, diperbarui, ...data }) => ({ jenis, kunci, aktif, urutan, diperbarui, data }));
  rows.agenda = snapshot.aplikasi.agenda.map(({ id, orang, diperbarui, dihapus, ...data }) => ({ id, orang, diperbarui, dihapus, data }));
  rows.obrolan = snapshot.aplikasi.obrolan;
  validasiRelasi(rows);
  // Parent harus masuk lebih dulu untuk foreign key task turunan.
  const tasks = rows.tasks, byId = new Map(tasks.map(t => [t.id, t])), visited = new Set(), visiting = new Set(), ordered = [];
  function visit(t) {
    if (visited.has(t.id)) return;
    if (visiting.has(t.id)) throw new GalatMySQL('Task turunan memiliki siklus induk.');
    visiting.add(t.id);
    if (t.induk && byId.has(t.induk)) visit(byId.get(t.induk));
    visiting.delete(t.id); visited.add(t.id); ordered.push(t);
  }
  tasks.forEach(visit); rows.tasks = ordered;
  const ready = Object.fromEntries(Object.entries(rows).map(([name, list]) => [name, siapkanBaris(name, list)]));
  return { snapshot, ready };
}

async function verifikasi(c, snapshot) {
  const count = {}, mismatches = [];
  const { ready } = persiapkan(snapshot);
  const json = value => typeof value === 'string' ? JSON.parse(value) : value;
  const equalValue = (name, key, value) => {
    if (value === null) return null;
    const type = key === '_payload' ? 'JSON' : SCHEMA.get(name).columns.get(key)?.type;
    if (type === 'JSON') return json(value);
    if (type === 'DATETIME') return new Date(String(value).replace(' ', 'T').replace(/Z?$/, 'Z')).toISOString();
    if (['BOOLEAN', 'INT', 'BIGINT', 'DOUBLE', 'DECIMAL', 'TINYINT'].includes(type)) return Number(value);
    return value;
  };
  for (const [name, expected] of Object.entries(ready)) {
    const table = SCHEMA.get(name);
    const [actual] = await c.query('SELECT * FROM ' + kutip(name) + ' ORDER BY ' + table.primary.map(kutip).join(','));
    if (actual.length !== expected.length) { mismatches.push(name + ':jumlah'); continue; }
    const byKey = new Map(actual.map(r => [JSON.stringify(table.primary.map(k => r[k])), r]));
    const byPosition = new Map(actual.map(r => [Number(r._position), r]));
    for (let n = 0; n < expected.length; n++) {
      const row = expected[n];
      const found = table.primary.every(k => row[k] !== undefined) ? byKey.get(JSON.stringify(table.primary.map(k => row[k])))
        : row._position !== undefined ? byPosition.get(row._position) : actual[n];
      if (!found || Object.entries(row).some(([key, value]) => hash(equalValue(name, key, found[key])) !== hash(equalValue(name, key, value)))) {
        mismatches.push(name + ':isi'); break;
      }
    }
  }
  for (const [collection, table] of Object.entries(ROOTS)) {
    const [rows] = await c.query('SELECT _payload FROM ' + kutip(table) + ' ORDER BY _position');
    const actual = rows.map(r => typeof r._payload === 'string' ? JSON.parse(r._payload) : r._payload);
    const expected = snapshot.real.data[collection] || [];
    const sort = list => [...list].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    count[collection] = actual.length;
    if (hash(sort(actual)) !== hash(sort(expected))) mismatches.push(collection);
  }
  const [events] = await c.query('SELECT payload FROM `real` ORDER BY seq');
  const payloads = events.map(r => typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload);
  if (hash(payloads) !== hash(snapshot.real.events)) mismatches.push('jurnal');
  const [example] = await c.query('SELECT payload FROM `contoh` WHERE id=1');
  const expectedExample = { ...snapshot.contoh, orang: snapshot.aplikasi.orang, master: snapshot.aplikasi.master, obrolan: snapshot.aplikasi.obrolanContoh };
  if (!example[0] || hash(json(example[0].payload)) !== hash(expectedExample)) mismatches.push('contoh');
  if (mismatches.length) throw new GalatMySQL('Hasil impor tidak cocok: ' + mismatches.join(', '));
  return { cocok: true, jurnal: events.length, koleksi: count };
}

async function impor(pool, input, { terapkan = false, sebelumCommit } = {}) {
  const { snapshot, ready } = persiapkan(input);
  if (!terapkan) return { diterapkan: false, checksum: snapshot.checksum, tabel: Object.fromEntries(Object.entries(ready).map(([k, v]) => [k, v.length])) };
  return transaksi(pool, async c => {
    const [marker] = await c.query("SELECT nilai FROM `meta` WHERE kunci='app' FOR UPDATE");
    if (marker[0]?.nilai !== 'producttrack-v2') throw new GalatMySQL('Penanda tujuan bukan ProductTrack v2.');
    const [old] = await c.query("SELECT nilai FROM `meta` WHERE kunci='import_checksum'");
    if (old[0]?.nilai === snapshot.checksum) return { sudahDiimpor: true, ...(await verifikasi(c, snapshot)) };
    for (const name of [...SCHEMA.keys()].filter(n => !['meta', 'migrations'].includes(n))) {
      const [count] = await c.query('SELECT COUNT(*) AS n FROM ' + kutip(name));
      if (Number(count[0].n)) throw new GalatMySQL('Tujuan sudah berisi data (' + name + '). Impor tidak menimpa data yang ada.');
    }
    for (const name of SCHEMA.keys()) if (ready[name]?.length) await insertRows(c, name, ready[name]);
    await insertRows(c, 'real', snapshot.real.events.map(e => ({ seq: e.seq, id: e.id, at: e.at || 0, sah: Number(e.sah), payload: JSON.stringify(e) })));
    await insertRows(c, 'contoh', [{ id: 1, payload: JSON.stringify({ ...snapshot.contoh, orang: snapshot.aplikasi.orang, master: snapshot.aplikasi.master,
      obrolan: snapshot.aplikasi.obrolanContoh }) }]);
    const metadata = {
      import_checksum: snapshot.checksum, import_sumber: snapshot.sumber.spreadsheet,
      import_waktu: new Date().toISOString(), runtime_seq: String(snapshot.real.events.length),
      runtime_generasi: snapshot.real.generasi || 'mysql-' + snapshot.checksum.slice(0, 16),
      runtime_sah: String(snapshot.real.sahTerakhir),
    };
    for (const [key, value] of Object.entries(metadata)) await c.execute('INSERT INTO `meta` (kunci,nilai) VALUES (?,?) ON DUPLICATE KEY UPDATE nilai=VALUES(nilai)', [key, value]);
    const result = await verifikasi(c, snapshot);
    if (sebelumCommit) await sebelumCommit(snapshot);
    return { diterapkan: true, checksum: snapshot.checksum, ...result };
  });
}

module.exports = { persiapkan, verifikasi, impor };
