/* Agen AI Ali (2.17.0): kunci agen sendiri, sesi terkunci pada Ali dan pada aksi yang
   diizinkan, tanda AI dari server, lalu klien agen (agen/klien.js), ringkasan & pengingat
   (agen/laporan.js), dan alat MCP (agen/mcp.js) lewat stdio sungguhan. */
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

process.env.JEDA_PIN_SALAH_MS = '0';
const rpc = require('../api/rpc');
const sheet = require('../api/_sheets');
const I = require('../public/inti');
const { sheetPalsu } = require('./bantu/sheet-palsu');
const { buatKlien, GalatAgen } = require('../agen/klien');
const { ringkasanPagi, pengingat } = require('../agen/laporan');
const { ALAT } = require('../agen/mcp');

const PIN = '135790';
const PIN_DEV = '908172';
const KUNCI = crypto.randomBytes(24).toString('hex');
const ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcd';
const AKAR = path.join(__dirname, '..');

function panggil({ body, cookie } = {}) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      h: {},
      setHeader(k, v) { this.h[k.toLowerCase()] = v; },
      end(teks) { resolve({ status: this.statusCode, headers: this.h, teks, json: JSON.parse(teks) }); },
    };
    Promise.resolve(rpc({ method: 'POST', headers: cookie ? { cookie } : {}, body }, res)).catch(reject);
  });
}
const pakai = r => r.headers['set-cookie'].split(';')[0];
const aksi = (cookie, action, ...args) => panggil({ body: { action, args }, cookie });
const masuk = async () => pakai(await aksi(null, 'masuk', PIN));
async function sebagai(cookie, orang) {
  const r = await aksi(cookie, 'masukProfil', orang, '');
  assert.equal(r.status, 200, r.teks);
  return pakai(r);
}
async function masukAgen() {
  const r = await aksi(null, 'masukAgen', KUNCI);
  assert.equal(r.status, 200, r.teks);
  return pakai(r);
}
function sheetV2() {
  const p = sheetPalsu([{ title: '_meta', sheetId: 1, values: [['app', 'producttrack-v2']] }], { email: 'producttrack-v2@contoh.iam.gserviceaccount.com' });
  sheet.klien = async () => p.k;
  return p;
}
let nomor = 0;
const perintah = (aksiData, isi) => ({ id: 'uji' + String(++nomor).padStart(5, '0'), aksi: aksiData, isi, at: Date.now(), hari: I.isoHari(Date.now()) });
/* Data real: proyek dan satu task untuk Ali, dibuat Nynda. */
async function siapkanReal(f = {}) {
  const dev = pakai(await aksi(null, 'masukDev', PIN_DEV));
  await aksi(dev, 'aturSumber', 'real');
  const nynda = await sebagai(await masuk(), 'nynda');
  assert.equal((await aksi(nynda, 'simpanReal', perintah('proyekBaru', { f: { name: 'Otomasi laporan' } }))).status, 200);
  const t = await aksi(nynda, 'simpanReal', perintah('taskBaru', { f: { title: 'Skrip tarik data', project: 'PRJ-1', sub: 'DV6', pic: 'ali', ...f } }));
  assert.equal(t.status, 200, t.teks);
  return { dev, nynda };
}
const susunDari = peristiwa => { const d = I.dataKosong(); for (const e of peristiwa) if (e.sah !== false) I.terapkanUbah(d, e.ubah); return d; };

const klienAsli = sheet.klien;
test.beforeEach(() => {
  Object.assign(process.env, { ACCESS_PIN: PIN, SESSION_SECRET: 's'.repeat(48), SPREADSHEET_ID: ID, DEV_PIN: PIN_DEV, AGEN_KUNCI: KUNCI });
  for (const k of ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GOOGLE_APPLICATION_CREDENTIALS', 'VERCEL', 'VERCEL_ENV', 'APP_ENV', 'AGEN_PROFIL']) delete process.env[k];
  sheet.klien = klienAsli;
});
test.after(() => { I.aturOrang([]); I.aturMaster([]); delete process.env.AGEN_KUNCI; });

test('masukAgen: tertutup tanpa kunci, kunci pendek ditolak, kunci salah 401, kunci benar = sesi Ali', async () => {
  sheetV2();
  delete process.env.AGEN_KUNCI;
  let r = await aksi(null, 'masukAgen', 'apa saja');
  assert.deepEqual([r.status, r.json.kode], [403, 'AGEN_MATI']);
  process.env.AGEN_KUNCI = 'pendek';
  r = await aksi(null, 'masukAgen', 'pendek');
  assert.equal(r.status, 403);
  assert.match(r.json.message, /32 karakter/);
  process.env.AGEN_KUNCI = KUNCI;
  r = await aksi(null, 'masukAgen', KUNCI.slice(1));
  assert.deepEqual([r.status, r.json.kode, r.headers['set-cookie']], [401, 'KUNCI_AGEN', undefined]);
  r = await aksi(null, 'masukAgen', KUNCI);
  assert.deepEqual([r.status, r.json.me, r.json.agen], [200, 'ali', true]);
  assert.equal((await aksi(pakai(r), 'muatContoh', {})).status, 200);
  const sehat = await new Promise(resolve => rpc({ method: 'GET', headers: {} }, { setHeader() {}, end: teks => resolve(JSON.parse(teks)) }));
  assert.equal(sehat.setelan.agen, true, 'GET hanya melaporkan agen aktif, tanpa kuncinya');
  assert.ok(!JSON.stringify(sehat).includes(KUNCI));
});

test('sesi agen: hanya aksi yang diizinkan dan atas nama Ali; kunci diganti = sesi agen batal seluruhnya', async () => {
  const p = sheetV2();
  const agen = await masukAgen();
  const larang = [['masukProfil', 'nynda', ''], ['keluarDev'], ['aturSumber', 'real'], ['sistem'], ['status'], ['siapkan'],
    ['simpanFoto', { orang: 'ali', gambar: '' }], ['simpanMaster', 'platform', {}], ['aturPin', 'ali', '1234'], ['simpanOrang', {}]];
  for (const [a, ...args] of larang) {
    const r = await aksi(agen, a, ...args);
    assert.deepEqual([r.status, r.json.kode], [403, 'AGEN'], a);
  }
  const lain = await aksi(agen, 'kirimObrolan', { jenis: 'pesan', ruang: 'tim:SI', oleh: 'nynda', teks: 'Atas nama Nynda' });
  assert.equal(lain.status, 403, 'tak bisa menulis atas nama orang lain');
  const mod = await aksi(agen, 'kirimObrolan', { jenis: 'moderasi', ruang: 'tim:SI', oleh: 'dev', target: 'x1' });
  assert.equal(mod.status, 403);
  assert.equal(p.tab('obrolan'), undefined, 'tak ada yang tertulis');
  process.env.AGEN_KUNCI = crypto.randomBytes(24).toString('hex');
  for (const [a, ...args] of [['muatContoh', {}], ['masukProfil', 'nynda', ''], ['keluarDev']]) {
    const r = await aksi(agen, a, ...args);
    assert.deepEqual([r.status, r.json.kode], [401, 'AGEN'], `${a}: sesi agen lama tak turun jadi sesi biasa`);
  }
  delete process.env.AGEN_KUNCI;
  assert.equal((await aksi(agen, 'muatContoh', {})).status, 401, 'agen dimatikan: sesinya ikut batal');
});

test('data real dari agen: hanya aksi agen, atas nama Ali, aktivitas dan tinjauannya bertanda AI', async () => {
  sheetV2();
  const { nynda } = await siapkanReal();
  const agen = await masukAgen();
  for (const [a, isi] of [['proyekBaru', { f: { name: 'X' } }], ['taskBaru', { f: { title: 'Y', pic: 'ali', sub: 'R1' } }], ['hapusBukti', { task: 'PRD-001', bukti: 'e1' }]]) {
    const r = await aksi(agen, 'simpanReal', perintah(a, isi));
    assert.equal(r.status, 403, a);
  }
  for (const [a, isi] of [['isiOutput', { task: 'PRD-001', isi: 'Skrip jalan tiap Senin 07.00.' }], ['tambahBukti', { task: 'PRD-001', f: { url: 'https://github.com/contoh/skrip' } }],
    ['terapkanAksi', { task: 'PRD-001', kunci: 'mulai' }], ['terapkanAksi', { task: 'PRD-001', kunci: 'ajukan' }]]) {
    const r = await aksi(agen, 'simpanReal', perintah(a, isi));
    assert.equal(r.status, 200, `${a}: ${r.teks}`);
    assert.equal(r.json.peristiwa.oleh, 'ali');
  }
  // Ali sendiri (lewat aplikasi) menarik tinjauannya: tak bertanda AI.
  const aliManusia = await sebagai(await masuk(), 'ali');
  assert.equal((await aksi(aliManusia, 'simpanReal', perintah('terapkanAksi', { task: 'PRD-001', kunci: 'tarik' }))).status, 200);
  const d = susunDari((await aksi(nynda, 'sinkron', { realSejak: 0 })).json.real.peristiwa);
  const t = d.tasks.find(x => x.id === 'PRD-001');
  assert.deepEqual(t.tinjauan.map(r => [r.action, r.by, !!r.ai]), [['Diajukan', 'ali', true], ['Ditarik', 'ali', false]]);
  const log = d.log.filter(l => l.by === 'ali');
  assert.deepEqual(log.map(l => !!l.ai), [false, true, true, true, true], 'terbaru dulu: tarik oleh Ali sendiri, lalu empat dari agen');
  assert.ok(d.log.filter(l => l.by === 'nynda').every(l => !l.ai));
  // Tanda AI ikut ke jejak percakapan task dan notifikasi peninjaunya.
  assert.ok(I.aktivitasTask(d, t).some(a => a.oleh === 'ali' && a.ai));
});

test('pesan dari agen bertanda AI; isian browser tak bisa memalsukan tandanya', async () => {
  sheetV2();
  const agen = await masukAgen();
  const nynda = await sebagai(await masuk(), 'nynda');
  const r = await aksi(agen, 'kirimObrolan', { jenis: 'pesan', ruang: 'tim:SI', oleh: 'ali', teks: 'Laporan mingguan sudah terkirim.' });
  assert.equal(r.status, 200, r.teks);
  assert.equal(r.json.peristiwa.kode, I.KODE_AI);
  const palsu = await aksi(nynda, 'kirimObrolan', { jenis: 'pesan', ruang: 'tim:SI', oleh: 'nynda', teks: 'Bukan AI', kode: I.KODE_AI });
  assert.equal(palsu.json.peristiwa.kode, '');
  const ubah = await aksi(agen, 'kirimObrolan', { jenis: 'ubah', ruang: 'tim:SI', oleh: 'ali', target: r.json.peristiwa.id, teks: 'Laporan mingguan sudah terkirim ke Nynda.' });
  assert.equal(ubah.json.peristiwa.kode, I.KODE_AI);
  const susunan = I.susunObrolan(I.dataKosong(), (await aksi(nynda, 'muatObrolan', 0)).json.peristiwa);
  assert.deepEqual(susunan.perRuang.get('tim:SI').map(m => [m.oleh, m.ai, m.teks]), [['ali', true, 'Laporan mingguan sudah terkirim ke Nynda.'], ['nynda', false, 'Bukan AI']]);
});

/* ---------- Klien agen lewat HTTP sungguhan ---------- */
function nyalakanServer() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => rpc(req, res));
    srv.listen(0, '127.0.0.1', () => resolve({ srv, alamat: `http://127.0.0.1:${srv.address().port}` }));
  });
}
const folderSementara = () => fs.mkdtempSync(path.join(os.tmpdir(), 'agen-uji-'));
const tanpaEnv = path.join(os.tmpdir(), 'tak-ada-agen.env');

test('klien agen: ringkasan pagi, pengingat tanpa ulangan, pesan dan perubahan atas nama Ali', async () => {
  sheetV2();
  const besok = I.tambahHari(I.isoHari(Date.now()), 1);
  const { nynda } = await siapkanReal({ due: besok });
  const tanya = await aksi(nynda, 'kirimObrolan', { jenis: 'pesan', ruang: 'task:PRD-001', oleh: 'nynda', teks: 'Ali, skripnya sudah jalan?', tanya: ['ali'] });
  assert.equal(tanya.status, 200);
  const { srv, alamat } = await nyalakanServer();
  const folder = folderSementara();
  try {
    assert.throws(() => buatKlien({ alamat: '', kunci: KUNCI, berkasEnv: tanpaEnv }), /PT_ALAMAT/);
    const klien = buatKlien({ alamat, kunci: KUNCI, folderData: folder, berkasEnv: tanpaEnv });
    const k = await klien.keadaan();
    assert.deepEqual([k.mode, k.me, k.data.tasks.map(t => t.id)], ['real', 'ali', ['PRD-001']]);
    assert.ok(fs.existsSync(path.join(folder, 'real.json')), 'salinan cepat tersimpan');

    const r = ringkasanPagi(k);
    const teks = r.baris.join('\n');
    assert.match(teks, /Ringkasan pagi untuk Ali/);
    assert.match(teks, /7 hari ke depan \(1\)\n {2}• PRD-001 · DV6 · Skrip tarik data/);
    assert.match(teks, /Pertanyaan menunggu jawaban Anda \(1\)\n {2}• Nynda di Skrip tarik data \[task:PRD-001, pesan /);
    assert.equal(r.singkat, '1 pertanyaan menunggu');

    const p1 = pengingat(k, null);
    assert.deepEqual(p1.baris.map(b => b.replace(/ \(\d+ \w+\)$/, '')), [
      '• PRD-001 Skrip tarik data: tenggat besok',
      '• pertanyaan dari Nynda: "Ali, skripnya sudah jalan?"',
      '• task baru untuk Anda: PRD-001',
    ]);
    assert.match(p1.singkat, /^3 pengingat: /);
    const p2 = pengingat(await klien.keadaan(), p1.jejak);
    assert.deepEqual([p2.baris, p2.singkat], [[], 'tidak ada pengingat baru'], 'yang sudah diingatkan tak diulang');

    const balas = await klien.kirimPesan({ ruang: 'task:PRD-001', teks: 'Sudah, jalan tiap Senin pagi.', balas: tanya.json.peristiwa.id });
    assert.deepEqual([balas.oleh, balas.kode, balas.target], ['ali', I.KODE_AI, tanya.json.peristiwa.id]);
    await klien.beres({ ruang: 'task:PRD-001', pesan: tanya.json.peristiwa.id });
    await assert.rejects(klien.kirimPesan({ ruang: 'task:PRD-404', teks: 'Halo' }), /PRD-404 tidak ada/);
    await assert.rejects(klien.ubah('proyekBaru', { f: { name: 'X' } }), e => e instanceof GalatAgen && e.kode === 'AGEN');
    await assert.rejects(klien.ubah('terapkanAksi', { task: 'PRD-001', kunci: 'setujui' }), e => e.kode === 'ATURAN', 'diperiksa dulu di klien');
    const e = await klien.ubah('isiOutput', { task: 'PRD-001', isi: 'Skrip tarik data jalan tiap Senin 07.00.' });
    assert.equal(e.oleh, 'ali');
    const sesudah = await klien.keadaan();
    assert.equal(sesudah.data.tasks[0].output, 'Skrip tarik data jalan tiap Senin 07.00.');
    assert.equal(ringkasanPagi(sesudah).singkat, 'tidak ada yang mendesak', 'pertanyaannya sudah dijawab dan ditandai beres');
  } finally {
    srv.close();
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

/* Satu sesi MCP lewat stdio: kirim permintaan, tunggu balasan dengan id yang sama. */
function sesiMcp(env) {
  const anak = spawn(process.execPath, [path.join(AKAR, 'agen', 'mcp.js')], { env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
  const tunggu = new Map();
  let sisa = '';
  anak.stdout.on('data', d => {
    sisa += d;
    let i;
    while ((i = sisa.indexOf('\n')) >= 0) {
      const pesan = JSON.parse(sisa.slice(0, i));
      sisa = sisa.slice(i + 1);
      if (tunggu.has(pesan.id)) { tunggu.get(pesan.id)(pesan); tunggu.delete(pesan.id); }
    }
  });
  let urut = 0;
  const minta = (method, params = {}) => new Promise(resolve => {
    const id = ++urut;
    tunggu.set(id, resolve);
    anak.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
  const beri = (method, params = {}) => anak.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
  const tutup = () => new Promise(resolve => { anak.on('exit', resolve); anak.stdin.end(); });
  return { minta, beri, tutup };
}

test('alat MCP lewat stdio: daftar alat, baca pekerjaan, aksi yang tak tersedia ditolak, pesan terkirim', async () => {
  sheetV2();
  await siapkanReal();
  const { srv, alamat } = await nyalakanServer();
  const folder = folderSementara();
  const mcp = sesiMcp({ PT_ALAMAT: alamat, AGEN_KUNCI: KUNCI, AGEN_DATA: folder });
  try {
    const awal = await mcp.minta('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'uji', version: '1' } });
    assert.deepEqual([awal.result.protocolVersion, awal.result.serverInfo.name, !!awal.result.capabilities.tools], ['2025-06-18', 'producttrack', true]);
    mcp.beri('notifications/initialized');
    const daftar = (await mcp.minta('tools/list')).result.tools;
    assert.deepEqual(daftar.map(t => t.name), ALAT.map(a => a.name));
    assert.deepEqual(daftar.filter(t => t.annotations.readOnlyHint).map(t => t.name), ['pekerjaan_saya', 'ringkasan_pagi', 'detail_task', 'pesan_menunggu', 'baca_ruang', 'cari_task']);
    const kerja = (await mcp.minta('tools/call', { name: 'pekerjaan_saya', arguments: {} })).result;
    assert.equal(kerja.isError, undefined, kerja.content[0].text);
    assert.match(kerja.content[0].text, /PRD-001 · DV6 · Skrip tarik data/);
    const detail = (await mcp.minta('tools/call', { name: 'detail_task', arguments: { task: 'prd-001' } })).result.content[0].text;
    assert.match(detail, /Aksi untuk Ali: mulai \(Mulai kerjakan\)/);
    const tolak = (await mcp.minta('tools/call', { name: 'aksi_task', arguments: { task: 'PRD-001', aksi: 'setujui' } })).result;
    assert.equal(tolak.isError, true);
    assert.match(tolak.content[0].text, /tidak tersedia/);
    const kirim = (await mcp.minta('tools/call', { name: 'kirim_pesan', arguments: { ruang: 'task:PRD-001', teks: 'Mulai dikerjakan hari ini.' } })).result;
    assert.match(kirim.content[0].text, /Pesan terkirim di task:PRD-001/);
    const asing = await mcp.minta('metode/asing');
    assert.equal(asing.error.code, -32601);
  } finally {
    await mcp.tutup();
    srv.close();
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('folder agen: izin alat baca saja, pekerjaan Agent Office menunjuk skrip yang ada', () => {
  const setelan = JSON.parse(fs.readFileSync(path.join(AKAR, 'agen', '.claude', 'settings.json'), 'utf8'));
  const baca = ALAT.filter(a => a.baca).map(a => `mcp__producttrack__${a.name}`);
  assert.deepEqual(setelan.permissions.allow, baca, 'alat tulis selalu menunggu persetujuan');
  assert.ok(['Bash', 'Write', 'Edit'].every(x => setelan.permissions.deny.includes(x)));
  assert.deepEqual(setelan.enabledMcpjsonServers, ['producttrack']);
  const mcp = JSON.parse(fs.readFileSync(path.join(AKAR, 'agen', '.mcp.json'), 'utf8'));
  assert.deepEqual(mcp.mcpServers.producttrack.args, ['mcp.js']);
  const kantor = JSON.parse(fs.readFileSync(path.join(AKAR, 'agen', 'agent-office.json'), 'utf8'));
  for (const j of kantor.pekerjaan) {
    assert.ok(fs.existsSync(path.join(AKAR, 'agen', j.perintah[0])), j.id);
    assert.equal(new RegExp(j.hasil, 'm').exec('baris\nRINGKAS: 2 telat\n')[1], '2 telat');
  }
  assert.ok(new RegExp(kantor.pekerjaan.find(j => j.id === 'pengingat').senyap, 'i').test('Pengingat ProductTrack (tidak ada pengingat baru). Tanpa token.'));
});
