/* Snapshot baca-saja dari Sheets. Jurnal direplay dengan aturan kesahihan yang sama
   seperti api/_real.js; tidak menjalankan ulang aturan bisnis historis. */
const crypto = require('node:crypto');
const S = require('../api/_skema');
const I = require('../public/inti');
const sheet = require('../api/_sheets');
const { GalatMySQL } = require('../api/_mysql-core');

const ROOTS = {
  projects: 'projects', tasks: 'tasks', packages: 'packages', inisiatif: 'inisiatif',
  permintaan: 'permintaan', permintaanDae: 'permintaan_dae', perpanjangan: 'perpanjangan',
  dashboards: 'dashboards', links: 'links', notes: 'notes', setoran: 'setoran', nomor: 'nomor', log: 'log',
};
function stabil(v) {
  if (Array.isArray(v)) return v.map(stabil);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, stabil(v[k])]));
  return v;
}
const hash = v => crypto.createHash('sha256').update(JSON.stringify(stabil(v))).digest('hex');
const isi = (raw, nama, parse) => {
  const [judul = [], ...rows] = raw[nama] || [];
  return rows.filter(r => r.some(v => String(v ?? '').trim())).map(r => parse(judul, r));
};
function terbaru(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const id = key(row);
    if (!id) continue;
    const old = map.get(id);
    if (!old || (row.diperbarui || 0) >= (old.diperbarui || 0)) map.set(id, row);
  }
  return [...map.values()];
}

function susun(raw, sumber = {}) {
  const marker = Object.fromEntries((raw._meta || []).filter(r => r.length >= 2).map(r => [String(r[0]), String(r[1])]));
  if (marker.app !== 'producttrack-v2') throw new GalatMySQL('Sumber bukan spreadsheet ProductTrack v2. Migrasi ditolak.');
  const [judul = S.REAL_KOLOM, ...rows] = raw.data_real || [];
  const journal = S.realDariBaris(judul, rows);
  if (journal.rusak) throw new GalatMySQL('Jurnal data real memuat baris rusak. Perbaiki sumber sebelum migrasi.');
  const data = I.dataKosong();
  let sahTerakhir = 0;
  const events = journal.peristiwa.map((e, n) => {
    const sah = !Number.isInteger(e.dasar) || e.dasar >= sahTerakhir;
    if (sah) { I.terapkanUbah(data, e.ubah); sahTerakhir = n + 1; }
    return { ...e, seq: n + 1, sah };
  });
  const tables = Object.fromEntries(Object.keys(S.TAB).map(t => [t, isi(raw, t, (h, r) => S.dariBaris(t, h, r))]));
  const contoh = marker.contoh_versi ? {
    versi: marker.contoh_versi, sumber: marker.contoh_sumber || '', data: S.rakit(tables),
  } : { versi: '', sumber: '', data: null };
  if (contoh.data) contoh.seq = {
    task: S.nomorTerbesar(contoh.data.tasks, 'PRD'), prj: S.nomorTerbesar(contoh.data.projects, 'PRJ'), pkg: S.nomorTerbesar(contoh.data.packages, 'PKG'),
  };
  const aplikasi = {
    orang: terbaru(isi(raw, 'orang', S.orangDariBaris), x => x.id),
    pin: terbaru(isi(raw, 'pin', S.pinDariBaris), x => x.orang),
    foto: terbaru(isi(raw, 'foto', S.fotoDariBaris), x => x.orang),
    tampilan: terbaru(isi(raw, 'tampilan', S.tampilanDariBaris), x => x.orang),
    master: terbaru(isi(raw, 'master', S.masterDariBaris), x => x.jenis && x.kunci ? x.jenis + ':' + x.kunci.toLowerCase() : ''),
    agenda: terbaru(isi(raw, 'agenda', S.agendaDariBaris), x => x.id),
    pribadi: terbaru(isi(raw, 'pribadi', S.pribadiDariBaris), x => x.orang),
    setelan: terbaru(isi(raw, 'setelan', S.setelanDariBaris), x => x.kunci),
    obrolan: isi(raw, 'obrolan_real', S.obrolanDariBaris),
    obrolanContoh: isi(raw, 'obrolan', S.obrolanDariBaris),
  };
  const snapshot = {
    format: 'producttrack-v2-mysql', versi: 1, sumber, marker, raw,
    real: { data, events, generasi: journal.peristiwa[0]?.id || '', sahTerakhir }, aplikasi, contoh,
  };
  snapshot.checksum = hash({ raw, sumber: sumber.spreadsheet });
  return snapshot;
}

async function bacaRaw() {
  const k = await sheet.klien(), id = sheet.idSpreadsheet();
  const info = await sheet.periksa(k, id);
  if (info.kepemilikan !== 'v2') throw new GalatMySQL('Spreadsheet sumber tidak memiliki penanda v2.');
  const ranges = info.tab.map(t => "'" + t.replace(/'/g, "''") + "'!A:ZZ");
  const result = await sheet.panggil(() => k.api.spreadsheets.values.batchGet({ spreadsheetId: id, ranges }));
  return {
    raw: Object.fromEntries(info.tab.map((t, i) => [t, result.data.valueRanges?.[i]?.values || []])),
    sumber: { spreadsheet: id, judul: info.judul, ditarik: new Date().toISOString() },
  };
}

async function ekspor() {
  const first = await bacaRaw();
  const second = await bacaRaw();
  if (hash(first.raw) !== hash(second.raw)) throw new GalatMySQL('Spreadsheet berubah ketika ditarik. Coba ekspor lagi saat aktivitas penulisan berhenti.');
  return susun(second.raw, second.sumber);
}

function validasiSnapshot(snapshot) {
  if (snapshot?.format !== 'producttrack-v2-mysql' || snapshot.versi !== 1 || !snapshot.raw) throw new GalatMySQL('Format backup migrasi tidak dikenali.');
  const rebuilt = susun(snapshot.raw, snapshot.sumber);
  if (rebuilt.checksum !== snapshot.checksum || hash(rebuilt.real) !== hash(snapshot.real)
    || hash(rebuilt.aplikasi) !== hash(snapshot.aplikasi) || hash(rebuilt.contoh) !== hash(snapshot.contoh)) {
    throw new GalatMySQL('Checksum/isi backup tidak cocok. Impor dibatalkan.');
  }
  return rebuilt;
}

function ringkasan(snapshot) {
  return {
    checksum: snapshot.checksum, perubahan: snapshot.real.events.length,
    perubahanSah: snapshot.real.events.filter(e => e.sah).length,
    koleksi: Object.fromEntries(Object.keys(ROOTS).map(k => [k, snapshot.real.data[k]?.length || 0])),
    aplikasi: Object.fromEntries(Object.entries(snapshot.aplikasi).map(([k, rows]) => [k, rows.length])),
    contoh: !!snapshot.contoh.data,
  };
}

module.exports = { ROOTS, hash, susun, ekspor, bacaRaw, validasiSnapshot, ringkasan };
