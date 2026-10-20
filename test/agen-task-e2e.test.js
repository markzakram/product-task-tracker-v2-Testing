/* Agen Ali membuat task dari rekap kerja harian (2.37.0), dari ujung ke ujung: server uji lokal
   (rpc.js dengan Google Sheets tiruan), klien agen lewat HTTP sungguhan, dan skrip
   pilihan-task.js, buat-task.js, serta alat MCP lewat proses sendiri. Tidak menyentuh
   ProductTrack sungguhan. Aturan murni (validasi, idempotensi, pemetaan jalur) ada di
   test/agen-task.test.js. */
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
const { ALAT } = require('../agen/mcp');

const PIN = '135790';
const PIN_DEV = '908172';
const KUNCI = crypto.randomBytes(24).toString('hex');
const ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcd';
const AKAR = path.join(__dirname, '..');
const HARI = I.isoHari(Date.now());
const BESOK = I.tambahHari(HARI, 1);

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
const perintah = (aksiData, isi) => ({ id: 'uji' + String(++nomor).padStart(5, '0'), aksi: aksiData, isi, at: Date.now(), hari: HARI });
const kirimPerintah = async (cookie, aksiData, isi) => {
  const r = await aksi(cookie, 'simpanReal', perintah(aksiData, isi));
  assert.equal(r.status, 200, `${aksiData}: ${r.teks}`);
  return r.json.peristiwa;
};
/* Data real: proyek PRJ-1 (aktif) dan PRJ-2 (diarsipkan), satu task DV6 milik Ali dari Nynda, dan
   inisiatif INI-001 yang dideklarasikan Ali sendiri di aplikasi (bukan agen). */
async function siapkanReal() {
  const dev = pakai(await aksi(null, 'masukDev', PIN_DEV));
  await aksi(dev, 'aturSumber', 'real');
  const nynda = await sebagai(await masuk(), 'nynda');
  const ali = await sebagai(await masuk(), 'ali');
  await kirimPerintah(nynda, 'proyekBaru', { f: { name: 'Otomasi laporan' } });
  await kirimPerintah(nynda, 'proyekBaru', { f: { name: 'Proyek lama' } });
  await kirimPerintah(nynda, 'setArsip', { proyek: 'PRJ-2', arsip: true });
  await kirimPerintah(nynda, 'taskBaru', { f: { title: 'Skrip tarik data', project: 'PRJ-1', sub: 'DV6', pic: 'ali' } });
  await kirimPerintah(ali, 'inisiatifBaru', { f: { nama: 'ProductTrack', tujuan: 'Aplikasi pelacak task tim' } });
  return { dev, nynda, ali };
}
const susunDari = peristiwa => { const d = I.dataKosong(); for (const e of peristiwa) if (e.sah !== false) I.terapkanUbah(d, e.ubah); return d; };
const dataServer = async cookie => susunDari((await aksi(cookie, 'sinkron', { realSejak: 0 })).json.real.peristiwa);
const nomorTerakhir = async cookie => (await aksi(cookie, 'sinkron', { realSejak: 0 })).json.real.seq;

const klienAsli = sheet.klien;
test.beforeEach(() => {
  Object.assign(process.env, { ACCESS_PIN: PIN, SESSION_SECRET: 's'.repeat(48), SPREADSHEET_ID: ID, DEV_PIN: PIN_DEV, AGEN_KUNCI: KUNCI });
  for (const k of ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GOOGLE_APPLICATION_CREDENTIALS', 'VERCEL', 'VERCEL_ENV', 'APP_ENV', 'AGEN_PROFIL']) delete process.env[k];
  sheet.klien = klienAsli;
});
test.after(() => { I.aturOrang([]); I.aturMaster([]); delete process.env.AGEN_KUNCI; });

function nyalakanServer() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => rpc(req, res));
    srv.listen(0, '127.0.0.1', () => resolve({ srv, alamat: `http://127.0.0.1:${srv.address().port}` }));
  });
}
const folderSementara = () => fs.mkdtempSync(path.join(os.tmpdir(), 'agen-task-'));
/* Skrip agen sebagai proses sendiri (server uji jalan di proses ini, jadi tak boleh spawnSync).
   tanpa = nama env yang dibuang dari lingkungan anak, supaya setelan dari --env yang terbaca. */
function jalankanSkrip(nama, args, env, tanpa = []) {
  return new Promise(resolve => {
    const lingkungan = { ...process.env, ...env };
    for (const k of tanpa) delete lingkungan[k];
    const anak = spawn(process.execPath, [path.join(AKAR, 'agen', nama), ...args], { env: lingkungan, stdio: ['ignore', 'pipe', 'pipe'] });
    let keluar = '';
    anak.stdout.on('data', d => { keluar += d; });
    anak.stderr.on('data', d => { keluar += d; });
    anak.on('close', kode => resolve({ kode, keluar }));
  });
}
const tulisBerkas = (folder, nama, isi) => { const f = path.join(folder, nama); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(isi)); return f; };
const bacaJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));

/* Satu berkas usulan: empat butir sah (proyek, rutin, inisiatif, dan task untuk orang lain) dan
   delapan yang tidak sah. */
const BUTIR = [
  { id: 'proyek-1', judul: 'Generator laporan harian', jalur: 'proyek', proyek: 'PRJ-1', sub: 'DV6', status: 'Ditinjau', output: 'Generator jalan tiap sore', deskripsi: 'Menambah generator laporan harian.', bukti: ['a1b2c3d', 'agen/task.js'], tenggat: BESOK },
  { id: 'rutin-1', judul: 'Rekap data mingguan', jalur: 'rutin', sub: 'R1', status: 'Selesai', deskripsi: 'Rekap data minggu ini.' },
  { id: 'ini-1', judul: 'Perbarui halaman Inisiatif', jalur: 'rutin', inisiatif: 'INI-001', status: 'Selesai', output: 'Halaman diperbarui' },
  { id: 'proyek-2', judul: 'Blueprint soal untuk Andika', jalur: 'proyek', proyek: 'PRJ-1', sub: 'D2', pic: 'andika' },
  { id: 'salah-1', judul: 'Proyek tak ada', jalur: 'proyek', proyek: 'PRJ-9', sub: 'DV6' },
  { id: 'salah-2', judul: 'Proyek diarsipkan', jalur: 'proyek', proyek: 'PRJ-2', sub: 'DV6' },
  { id: 'salah-3', judul: 'Sub-stage rutin di proyek', jalur: 'proyek', proyek: 'PRJ-1', sub: 'R1' },
  { id: 'salah-4', judul: 'Sub-stage ADDIE di rutin', jalur: 'rutin', sub: 'DV6' },
  { id: 'salah-5', judul: 'Proyek langsung selesai', jalur: 'proyek', proyek: 'PRJ-1', sub: 'DV6', status: 'Selesai', output: 'x' },
  { id: 'salah-6', judul: 'Inisiatif tak ada', jalur: 'rutin', inisiatif: 'INI-099' },
  { id: 'salah-7', judul: 'Inisiatif di proyek', jalur: 'proyek', proyek: 'PRJ-1', sub: 'DV6', inisiatif: 'INI-001' },
  { id: 'salah-8', judul: 'PIC di luar tim', jalur: 'rutin', sub: 'R1', pic: 'uma' },
];

test('server: agen boleh membuat task (taskBaru) atas nama Ali dengan tanda AI; aksi lain dan aturan form tetap berlaku', async () => {
  sheetV2();
  const { nynda } = await siapkanReal();
  const agen = await masukAgen();
  // Yang tetap pekerjaan Ali di aplikasi.
  for (const [a, isi] of [['proyekBaru', { f: { name: 'X' } }], ['inisiatifBaru', { f: { nama: 'Y' } }], ['hapusTask', { task: 'PRD-001' }],
    ['ubahTask', { task: 'PRD-001', f: { title: 'Z' } }], ['hapusBukti', { task: 'PRD-001', bukti: 'e1' }], ['mintaLanjutan', { task: 'PRD-001', f: { ke: 'andika', judul: 'Q' } }]]) {
    const r = await aksi(agen, 'simpanReal', perintah(a, isi));
    assert.equal(r.status, 403, a);
  }
  assert.deepEqual(I.AKSI_AGEN.filter(a => /Baru$/.test(a)), ['taskBaru']);
  // Aturan form Tambah task berlaku juga untuk agen: proyek, sub-stage, PIC, dan inisiatif diperiksa server.
  for (const [f, pola] of [
    [{ title: 'Y', project: 'PRJ-9', sub: 'DV6', pic: 'ali' }, /Proyek tidak ditemukan/],
    [{ title: 'Y', sub: 'DV6', pic: 'ali' }, /sub-stage rutin/],
    [{ title: 'Y', sub: 'R1', pic: 'uma' }, /di luar tim Anda/],
    [{ title: 'Y', sub: 'R1', pic: 'ali', inisiatif: 'INI-099' }, /Inisiatif tidak ditemukan/],
    [{ title: '  ', sub: 'R1', pic: 'ali' }, /Judul task wajib/],
  ]) {
    const r = await aksi(agen, 'simpanReal', perintah('taskBaru', { f }));
    assert.deepEqual([r.status, pola.test(r.json.message)], [400, true], r.teks);
  }
  const r = await aksi(agen, 'simpanReal', perintah('taskBaru', { f: { title: 'Catatan dari agen', sub: 'R1', pic: 'ali' } }));
  assert.equal(r.status, 200, r.teks);
  assert.deepEqual([r.json.peristiwa.oleh, r.json.peristiwa.hasil], ['ali', { id: 'PRD-002' }]);
  const d = await dataServer(nynda);
  const t = d.tasks.find(x => x.id === 'PRD-002');
  assert.deepEqual([t.lane, t.sub, t.pic, t.assignedBy, t.status], ['rutin', 'R1', 'ali', 'ali', 'Antre']);
  const dibuat = d.log.find(l => /^PRD-002 /.test(l.task) && l.type === 'create');
  assert.deepEqual([dibuat.by, dibuat.ai], ['ali', true], 'aktivitas pembuatan bertanda AI dari server');
  assert.equal(d.log.find(l => /^INI-001 /.test(l.task)).ai, undefined, 'deklarasi inisiatif oleh Ali sendiri tidak bertanda AI');
});

test('pilihan-task.js: membaca pilihan form dari server tanpa menulis apa pun, ke berkas pilihan (--keluaran, --env)', async () => {
  const p = sheetV2();
  await siapkanReal();
  const { srv, alamat } = await nyalakanServer();
  const folder = folderSementara();
  try {
    const env = { PT_ALAMAT: alamat, AGEN_KUNCI: KUNCI, AGEN_DATA: path.join(folder, 'data') };
    const tulisSebelum = p.tulisan.length;
    const tujuan = path.join(folder, 'keluar', 'pilihan.json');
    const r = await jalankanSkrip('pilihan-task.js', ['--keluaran', tujuan], env);
    assert.equal(r.kode, 0, r.keluar);
    assert.equal(r.keluar.match(/^BERKAS: (.+)$/m)[1], tujuan);
    assert.match(r.keluar, /\nHASIL: 1 proyek, 46 sub-stage \(4 rutin\), 12 orang, 1 inisiatif · data real\n$/);
    assert.equal(p.tulisan.length, tulisSebelum, 'hanya membaca: tak ada tulisan ke spreadsheet');

    const pil = bacaJson(tujuan);
    assert.deepEqual([pil.versi, pil.mode, pil.bisaBuat, pil.hari, pil.profil.id, pil.profil.peran, pil.profil.tim, pil.profil.timSingkat], [1, 'real', true, HARI, 'ali', 'lead', 'SI', 'DAE']);
    assert.deepEqual(pil.proyek.map(x => [x.id, x.nama, x.tim, x.timSaya]), [['PRJ-1', 'Otomasi laporan', ['SI'], true]], 'proyek yang diarsipkan tak ditawarkan');
    assert.deepEqual(pil.proyek[0].substage.slice(0, 6), ['A3', 'D4', 'DV6', 'DV7', 'I5', 'E8'], 'sub-stage tim DAE di atas');
    assert.equal(pil.proyek[0].substage.length, pil.substage.proyek.length);
    assert.deepEqual(pil.substage.rutin.map(s => s.kode), ['R1', 'R2', 'R3', 'R4']);
    assert.deepEqual(pil.substage.proyek.find(s => s.kode === 'D2'), { kode: 'D2', nama: 'Blueprint soal', tahap: 'D', namaTahap: 'Design', tim: 'AK', timSingkat: 'RAD', timSaya: false, reviewManager: false, pic: ['ali', 'andika'] });
    assert.deepEqual(pil.substage.proyek.find(s => s.kode === 'DV6').pic, ['ali']);
    assert.deepEqual(pil.substage.proyek.find(s => s.kode === 'A1').pic, ['ali', 'nynda'], 'Lead tim pemilik sub-stage boleh jadi PIC');
    assert.ok(pil.substage.proyek.every(s => s.tahap !== 'R') && pil.substage.rutin.every(s => s.tahap === 'R'));
    assert.deepEqual(pil.inisiatif, [{ id: 'INI-001', nama: 'ProductTrack', status: 'aktif', statusLabel: 'Aktif', tim: 'SI', timSingkat: 'DAE', pic: 'ali', bisaDipilih: true }]);
    assert.equal(pil.orang.length, 12);
    assert.deepEqual(pil.orang.filter(o => o.bolehPic).map(o => o.id), ['ali']);
    assert.deepEqual(pil.statusAwal.proyek, ['Antre', 'Dikerjakan', 'Ditinjau']);
    assert.deepEqual(pil.statusAwal.rutin, ['Antre', 'Dikerjakan', 'Selesai']);
    assert.deepEqual(pil.statusAwal.inisiatif, ['Antre', 'Dikerjakan', 'Selesai']);
    assert.deepEqual([pil.pic.bawaan, pil.tenggat.bawaan, pil.tenggat.format, pil.tenggat.wajib], ['ali', 'tanggal-rekap', 'YYYY-MM-DD', false]);
    assert.deepEqual(pil.jalur.map(j => [j.kode, j.jalurButir, j.tersedia]), [['proyek', 'proyek', true], ['rutin', 'rutin', true], ['inisiatif', 'rutin', true]]);
    assert.deepEqual(pil.jalur.find(j => j.kode === 'inisiatif').wajib, ['inisiatif']);
    assert.match(pil.aturan.join('\n'), /Inisiatif: kirim sebagai jalur rutin.+Khusus tim DAE dan Manager/);
    assert.ok(!JSON.stringify(pil).includes(KUNCI) && !JSON.stringify(pil).includes(alamat), 'tanpa rahasia dan alamat server');

    // Bawaan keluaran: <AGEN_DATA>/pilihan-task.json; setelan dari --env (PT_ALAMAT tak ada di lingkungan).
    const berkasEnv = path.join(folder, 'setelan.env');
    fs.writeFileSync(berkasEnv, `# setelan uji\nPT_ALAMAT=${alamat}\nAGEN_KUNCI="${KUNCI}"\n`);
    const r2 = await jalankanSkrip('pilihan-task.js', ['--env', berkasEnv], { AGEN_DATA: path.join(folder, 'data') }, ['PT_ALAMAT']);
    assert.equal(r2.kode, 0, r2.keluar);
    assert.equal(r2.keluar.match(/^BERKAS: (.+)$/m)[1], path.join(folder, 'data', 'pilihan-task.json'));
    assert.equal(bacaJson(path.join(folder, 'data', 'pilihan-task.json')).proyek.length, 1);
    assert.ok(!r2.keluar.includes(KUNCI), 'kunci tak pernah dicetak');

    const salah = await jalankanSkrip('pilihan-task.js', ['--env', path.join(folder, 'tidak-ada.env')], env);
    assert.deepEqual([salah.kode, /^GAGAL: Berkas --env tidak ditemukan/.test(salah.keluar)], [1, true], salah.keluar);
    const asing = await jalankanSkrip('pilihan-task.js', ['--ngawur'], env);
    assert.deepEqual([asing.kode, /^GAGAL: Opsi tidak dikenal: --ngawur/.test(asing.keluar)], [1, true], asing.keluar);
  } finally {
    srv.close();
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('pilihan-task.js saat ProductTrack memakai data contoh: pilihan tetap terbaca, tapi task belum bisa dibuat', async () => {
  sheetV2();
  const { srv, alamat } = await nyalakanServer();
  const folder = folderSementara();
  try {
    const env = { PT_ALAMAT: alamat, AGEN_KUNCI: KUNCI, AGEN_DATA: path.join(folder, 'data') };
    const r = await jalankanSkrip('pilihan-task.js', ['--keluaran', folder + path.sep], env);
    assert.equal(r.kode, 0, r.keluar);
    assert.match(r.keluar, /HASIL: 0 proyek, 46 sub-stage \(4 rutin\), 12 orang, 0 inisiatif · data contoh \(task belum bisa dibuat\)\n$/);
    const pil = bacaJson(path.join(folder, 'pilihan-task.json'));
    assert.deepEqual([pil.mode, pil.bisaBuat, pil.jalur.find(j => j.kode === 'proyek').tersedia, pil.jalur.find(j => j.kode === 'inisiatif').tersedia], ['contoh', false, false, false]);
    const berkas = tulisBerkas(folder, 'usulan.json', { tanggal: HARI, butir: [{ id: 'a', judul: 'Rekap', jalur: 'rutin', sub: 'R1' }] });
    const b = await jalankanSkrip('buat-task.js', ['--berkas', berkas], env);
    assert.deepEqual([b.kode, /^GAGAL: ProductTrack sedang memakai data contoh\. Task hanya bisa dibuat di data real/.test(b.keluar)], [1, true], b.keluar);
    assert.ok(!fs.existsSync(berkas + '.hasil.json'));
  } finally {
    srv.close();
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('buat-task.js --uji: memeriksa dengan aturan ProductTrack tanpa menulis apa pun', async () => {
  const p = sheetV2();
  const { nynda } = await siapkanReal();
  const { srv, alamat } = await nyalakanServer();
  const folder = folderSementara();
  try {
    const env = { PT_ALAMAT: alamat, AGEN_KUNCI: KUNCI, AGEN_DATA: path.join(folder, 'data') };
    const berkas = tulisBerkas(folder, 'usulan/usulan-uji.json', { tanggal: HARI, butir: BUTIR });
    const tulisSebelum = p.tulisan.length;
    const seqSebelum = await nomorTerakhir(nynda);
    const r = await jalankanSkrip('buat-task.js', ['--berkas', berkas, '--uji'], env);
    assert.equal(r.kode, 0, r.keluar);
    assert.match(r.keluar, /\nHASIL: uji: 4 butir sah, 8 ditolak\n$/);
    assert.equal(p.tulisan.length, tulisSebelum, 'tak ada tulisan ke spreadsheet');
    assert.equal(await nomorTerakhir(nynda), seqSebelum, 'tak ada perubahan data real');
    assert.ok(!fs.existsSync(path.join(folder, 'data', 'rekap-terkirim.json')), 'catatan butir tak ditulis saat uji');
    const hasil = bacaJson(berkas + '.hasil.json');
    assert.deepEqual([hasil.uji, hasil.tanggal, hasil.ringkas], [true, HARI, { dibuat: 0, sah: 4, ditolak: 8, dilewati: 0 }]);
    assert.deepEqual(hasil.butir.map(b => [b.id, b.status]), BUTIR.map(b => [b.id, b.id.startsWith('salah') ? 'ditolak' : 'sah']));
    const alasan = id => hasil.butir.find(b => b.id === id).alasan;
    assert.match(alasan('salah-1'), /Proyek PRJ-9 tidak ditemukan/);
    assert.match(alasan('salah-2'), /Proyek PRJ-2 sudah diarsipkan/);
    assert.match(alasan('salah-3'), /Pilih sub-stage ADDIE untuk task proyek/);
    assert.match(alasan('salah-4'), /sub-stage rutin \(kode R\)/);
    assert.match(alasan('salah-5'), /tidak bisa langsung Selesai: pakai Ditinjau/);
    assert.match(alasan('salah-6'), /Inisiatif INI-099 tidak ditemukan \(yang ada: INI-001\)/);
    assert.match(alasan('salah-7'), /Inisiatif hanya untuk task di luar proyek/);
    assert.match(alasan('salah-8'), /PIC itu di luar tim Anda/);
    assert.deepEqual(hasil.butir.find(b => b.id === 'ini-1'), { id: 'ini-1', status: 'sah', judul: 'Perbarui halaman Inisiatif', jalur: 'rutin', proyek: '', inisiatif: 'INI-001', sub: '', pic: 'ali', statusTask: 'Selesai' });
    assert.match(r.keluar, /  • salah-3 · DITOLAK · Pilih sub-stage ADDIE/);
  } finally {
    srv.close();
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('buat-task.js: task proyek, rutin, dan inisiatif dibuat atas nama Ali (AI); yang tak sah ditolak; jalan ulang tak menggandakan', async () => {
  sheetV2();
  const { nynda } = await siapkanReal();
  const { srv, alamat } = await nyalakanServer();
  const folder = folderSementara();
  try {
    const env = { PT_ALAMAT: alamat, AGEN_KUNCI: KUNCI, AGEN_DATA: path.join(folder, 'data') };
    const berkas = tulisBerkas(folder, 'usulan/usulan-nyata.json', { tanggal: HARI, butir: BUTIR });
    const r = await jalankanSkrip('buat-task.js', ['--berkas', berkas], env);
    assert.equal(r.kode, 0, r.keluar);
    assert.match(r.keluar, /\nBERKAS: .+usulan-nyata\.json\.hasil\.json\nHASIL: 4 task dibuat, 8 ditolak\n$/);
    assert.match(r.keluar, /  • proyek-1 · dibuat PRD-002 · Ditinjau · Generator laporan harian/);

    const d = await dataServer(nynda);
    const t = id => d.tasks.find(x => x.id === id);
    assert.equal(d.tasks.length, 5, 'PRD-001 milik Nynda + empat dari agen; butir yang ditolak tak menulis apa pun');
    // Jalur proyek: sub-stage menentukan tahap, diajukan ke peninjau (Nynda); bukti ada di Keterangan.
    const proyek = t('PRD-002');
    assert.deepEqual([proyek.lane, proyek.project, proyek.sub, proyek.stage, proyek.pic, proyek.assignedBy, proyek.status, proyek.due, proyek.start],
      ['proyek', 'PRJ-1', 'DV6', 'V', 'ali', 'ali', 'Ditinjau', BESOK, HARI]);
    assert.equal(proyek.output, 'Generator jalan tiap sore');
    assert.equal(proyek.detail, `Menambah generator laporan harian.\n\nBukti:\n- a1b2c3d\n- agen/task.js\n\nDicatat agen AI dari rekap kerja ${HARI}.`);
    assert.deepEqual(proyek.tinjauan.map(x => [x.action, x.by, x.ai]), [['Diajukan', 'ali', true]]);
    assert.equal(I.peninjau(proyek), 'nynda');
    // Jalur rutin: tanpa tinjauan, langsung selesai; kategori mengikuti sub-stage; tenggat bawaan = tanggal rekap.
    const rutin = t('PRD-003');
    assert.deepEqual([rutin.lane, rutin.project, rutin.sub, rutin.stage, rutin.kategori, rutin.status, rutin.due, rutin.inisiatif], ['rutin', '', 'R1', '', 'Rekap & administrasi', 'Selesai', HARI, '']);
    assert.ok(rutin.selesaiAt > 0 && rutin.tinjauan.length === 0);
    // Inisiatif: jalur rutin yang tertaut ke INI-001; kategori = nama inisiatif karena jenis rutin kosong.
    const ini = t('PRD-004');
    assert.deepEqual([ini.lane, ini.project, ini.sub, ini.kategori, ini.inisiatif, ini.status, ini.output], ['rutin', '', '', 'ProductTrack', 'INI-001', 'Selesai', 'Halaman diperbarui']);
    assert.deepEqual(I.ringkasInisiatif(d, d.inisiatif[0], HARI).beres.map(x => x.id), ['PRD-004'], 'tampil sebagai pembaruan di halaman Inisiatif');
    // Task untuk orang lain: dibuat di Antre, dipegang Andika.
    const lain = t('PRD-005');
    assert.deepEqual([lain.pic, lain.assignedBy, lain.sub, lain.status, lain.tinjauan.length], ['andika', 'ali', 'D2', 'Antre', 0]);
    // Semua aktivitas dari agen bertanda AI.
    const logAgen = d.log.filter(l => /^PRD-00[2-5] /.test(l.task));
    assert.ok(logAgen.length >= 8 && logAgen.every(l => l.by === 'ali' && l.ai === true), JSON.stringify(logAgen.filter(l => !l.ai)));
    assert.deepEqual(logAgen.filter(l => l.type === 'create').map(l => l.detail).sort(), ['Dibuat untuk Ali · DV6', 'Dibuat untuk Ali', 'Dibuat untuk Ali · R1', 'Dibuat untuk Andika · D2'].sort());

    // Berkas hasil dan catatan butir yang sudah dibuat.
    const hasil = bacaJson(berkas + '.hasil.json');
    assert.deepEqual(hasil.ringkas, { dibuat: 4, sah: 0, ditolak: 8, dilewati: 0 });
    assert.deepEqual(hasil.butir.filter(b => b.status === 'dibuat').map(b => [b.id, b.task, b.statusTask]), [['proyek-1', 'PRD-002', 'Ditinjau'], ['rutin-1', 'PRD-003', 'Selesai'], ['ini-1', 'PRD-004', 'Selesai'], ['proyek-2', 'PRD-005', 'Antre']]);
    assert.ok(hasil.butir.filter(b => b.status === 'ditolak').every(b => b.alasan && !b.task));
    assert.ok(hasil.butir.filter(b => b.status === 'dibuat').every(b => b.peringatan === undefined && b.bisaDiulang === undefined), 'butir yang mulus tak membawa peringatan');
    const rekap = bacaJson(path.join(folder, 'data', 'rekap-terkirim.json'));
    assert.deepEqual(Object.entries(rekap.butir).map(([k, v]) => [k, v.task, v.status]), [
      [`${HARI}/proyek-1`, 'PRD-002', 'Ditinjau'], [`${HARI}/rutin-1`, 'PRD-003', 'Selesai'], [`${HARI}/ini-1`, 'PRD-004', 'Selesai'], [`${HARI}/proyek-2`, 'PRD-005', 'Antre']]);

    // Jalan ulang: butir yang sudah dibuat dilewati, yang tak sah tetap ditolak, tak ada task baru.
    const seq = await nomorTerakhir(nynda);
    const ulang = await jalankanSkrip('buat-task.js', ['--berkas', berkas], env);
    assert.equal(ulang.kode, 0, ulang.keluar);
    assert.match(ulang.keluar, /\nHASIL: 0 task dibuat, 8 ditolak \(4 dilewati\)\n$/);
    assert.match(ulang.keluar, /  • proyek-1 · dilewati · Sudah dibuat sebagai PRD-002/);
    assert.equal(await nomorTerakhir(nynda), seq, 'tak ada perubahan data real');
    assert.deepEqual(bacaJson(berkas + '.hasil.json').ringkas, { dibuat: 0, sah: 0, ditolak: 8, dilewati: 4 });

    // Catatan lokal hilang: server mengenali perintah yang sama (ID tetap), jadi tetap tak ada task ganda.
    fs.rmSync(path.join(folder, 'data', 'rekap-terkirim.json'));
    const hilang = await jalankanSkrip('buat-task.js', ['--berkas', berkas], env);
    assert.equal(hilang.kode, 0, hilang.keluar);
    assert.match(hilang.keluar, /\nHASIL: 0 task dibuat, 8 ditolak \(4 dilewati\)\n$/);
    assert.match(hilang.keluar, /  • rutin-1 · dilewati · Sudah dibuat sebagai PRD-003 \(dikenali server\)/);
    assert.equal(await nomorTerakhir(nynda), seq);
    assert.equal(Object.keys(bacaJson(path.join(folder, 'data', 'rekap-terkirim.json')).butir).length, 4, 'catatan disusun lagi');

    // Tanggal lain = butir lain (kunci catatan = tanggal + id), tetapi ID butir yang sama di tanggal itu hanya sekali.
    const kemarin = I.tambahHari(HARI, -1);
    const berkas2 = tulisBerkas(folder, 'usulan/usulan-kemarin.json', { tanggal: kemarin, butir: [{ id: 'rutin-1', judul: 'Rekap data mingguan', jalur: 'rutin', sub: 'R1', status: 'Selesai', tenggat: kemarin }] });
    const hari2 = await jalankanSkrip('buat-task.js', ['--berkas', berkas2], env);
    assert.match(hari2.keluar, /HASIL: 1 task dibuat, 0 ditolak\n$/, hari2.keluar);
    const d2 = await dataServer(nynda);
    assert.equal(d2.tasks.length, 6);
    assert.equal(d2.tasks.find(x => x.id === 'PRD-006').start, kemarin, 'tanggal mulai = tanggal rekap');
  } finally {
    srv.close();
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('buat-task.js terhadap server yang belum diperbarui: GAGAL dengan petunjuk deploy, tak ada yang ditulis; --uji tetap jalan', async () => {
  const p = sheetV2();
  const { nynda } = await siapkanReal();
  const { srv, alamat } = await nyalakanServer();
  const folder = folderSementara();
  // Server 2.36.0 menolak taskBaru dari agen: daftar aksi agen di proses server ini dikurangi sementara.
  const posisi = I.AKSI_AGEN.indexOf('taskBaru');
  I.AKSI_AGEN.splice(posisi, 1);
  try {
    const env = { PT_ALAMAT: alamat, AGEN_KUNCI: KUNCI, AGEN_DATA: path.join(folder, 'data') };
    const berkas = tulisBerkas(folder, 'u.json', { tanggal: HARI, butir: BUTIR.slice(0, 4) });
    const tulisSebelum = p.tulisan.length;
    const seq = await nomorTerakhir(nynda);
    const r = await jalankanSkrip('buat-task.js', ['--berkas', berkas], env);
    assert.equal(r.kode, 1, r.keluar);
    assert.match(r.keluar, /^GAGAL: Server ProductTrack belum mendukung agen membuat task \(butuh versi 2\.37\.0 atau lebih baru\)\. Deploy server dulu; belum ada task yang dibuat\.\n$/);
    assert.deepEqual([p.tulisan.length, await nomorTerakhir(nynda)], [tulisSebelum, seq]);
    assert.ok(!fs.existsSync(berkas + '.hasil.json') && !fs.existsSync(path.join(folder, 'data', 'rekap-terkirim.json')));
    const uji = await jalankanSkrip('buat-task.js', ['--berkas', berkas, '--uji'], env);
    assert.equal(uji.kode, 0, uji.keluar);
    assert.match(uji.keluar, /HASIL: uji: 4 butir sah, 0 ditolak\n$/);
    const baca = await jalankanSkrip('pilihan-task.js', ['--keluaran', path.join(folder, 'p.json')], env);
    assert.equal(baca.kode, 0, baca.keluar);
  } finally {
    I.AKSI_AGEN.splice(posisi, 0, 'taskBaru');
    srv.close();
    fs.rmSync(folder, { recursive: true, force: true });
  }
  assert.ok(I.AKSI_AGEN.includes('taskBaru'));
});

test('buat-task.js: butir yang menunggu fase sebelumnya ditolak dengan alasannya, berlaku juga terhadap butir lain di berkas yang sama', async () => {
  sheetV2();
  const { nynda } = await siapkanReal();
  const { srv, alamat } = await nyalakanServer();
  const folder = folderSementara();
  try {
    const env = { PT_ALAMAT: alamat, AGEN_KUNCI: KUNCI, AGEN_DATA: path.join(folder, 'data') };
    // Proyek diketatkan (2.43.0: bawaannya fleksibel, fase hanya pengingat).
    await kirimPerintah(nynda, 'aturUrutanProyek', { proyek: 'PRJ-1', ketat: true });
    // D4 (Design) dibuat dulu di Antre; sesudahnya DV6 yang ingin Dikerjakan harus menunggu fase Design timnya.
    const berkas = tulisBerkas(folder, 'u.json', { tanggal: HARI, butir: [
      { id: 'a-implementasi', judul: 'Implementasi sebelum rancangan', jalur: 'proyek', proyek: 'PRJ-1', sub: 'DV7', status: 'Dikerjakan' },
      { id: 'b-rancang', judul: 'Rancang plugin', jalur: 'proyek', proyek: 'PRJ-1', sub: 'D4' },
      { id: 'c-implementasi', judul: 'Implementasi sesudah rancangan', jalur: 'proyek', proyek: 'PRJ-1', sub: 'DV7', status: 'Dikerjakan' },
      { id: 'd-antre', judul: 'Implementasi menunggu', jalur: 'proyek', proyek: 'PRJ-1', sub: 'DV7' },
    ] });
    const r = await jalankanSkrip('buat-task.js', ['--berkas', berkas], env);
    assert.equal(r.kode, 0, r.keluar);
    assert.match(r.keluar, /\nHASIL: 3 task dibuat, 1 ditolak\n$/);
    const hasil = bacaJson(berkas + '.hasil.json').butir;
    assert.deepEqual(hasil.map(b => [b.id, b.status]), [['a-implementasi', 'dibuat'], ['b-rancang', 'dibuat'], ['c-implementasi', 'ditolak'], ['d-antre', 'dibuat']]);
    assert.match(hasil[2].alasan, /Status Dikerjakan belum bisa dicapai: Menunggu fase Design DAE selesai: PRD-003 "Rancang plugin".+Pakai status Antre/);
    const d = await dataServer(nynda);
    assert.deepEqual(d.tasks.filter(t => t.id !== 'PRD-001').map(t => [t.id, t.sub, t.status]).sort(), [['PRD-002', 'DV7', 'Dikerjakan'], ['PRD-003', 'D4', 'Antre'], ['PRD-004', 'DV7', 'Antre']]);
  } finally {
    srv.close();
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('buat-task.js: galat tingkat berkas dan server dilaporkan sebagai GAGAL; hasil lama tak tertukar', async () => {
  sheetV2();
  await siapkanReal();
  const { srv, alamat } = await nyalakanServer();
  const folder = folderSementara();
  try {
    const env = { PT_ALAMAT: alamat, AGEN_KUNCI: KUNCI, AGEN_DATA: path.join(folder, 'data') };
    const gagal = async (args, pola, e = env) => {
      const r = await jalankanSkrip('buat-task.js', args, e);
      assert.deepEqual([r.kode, pola.test(r.keluar)], [1, true], `${args.join(' ')}\n${r.keluar}`);
      assert.ok(!r.keluar.includes(KUNCI));
    };
    await gagal([], /^GAGAL: Opsi --berkas wajib/);
    await gagal(['--berkas'], /^GAGAL: Opsi --berkas butuh nilai/);
    await gagal(['--berkas', path.join(folder, 'tidak-ada.json')], /^GAGAL: Berkas tidak ditemukan/);
    const rusak = path.join(folder, 'rusak.json');
    fs.writeFileSync(rusak, '{ bukan json');
    await gagal(['--berkas', rusak], /^GAGAL: Berkas bukan JSON yang sah/);
    await gagal(['--berkas', tulisBerkas(folder, 'tanpa-tanggal.json', { butir: [] })], /^GAGAL: tanggal di berkas wajib berbentuk YYYY-MM-DD/);
    await gagal(['--berkas', tulisBerkas(folder, 'tanggal-salah.json', { tanggal: '2026-02-30', butir: [] })], /^GAGAL: tanggal di berkas wajib/);
    await gagal(['--berkas', tulisBerkas(folder, 'tanpa-butir.json', { tanggal: HARI })], /^GAGAL: butir di berkas harus berupa daftar/);
    await gagal(['--berkas', tulisBerkas(folder, 'besok.json', { tanggal: BESOK, butir: [] })], new RegExp(`^GAGAL: Tanggal rekap ${BESOK} belum terjadi`));
    await gagal(['--berkas', tulisBerkas(folder, 'kosong.json', { tanggal: HARI, butir: [] }), '--ngawur'], /^GAGAL: Opsi tidak dikenal: --ngawur/);
    // Server tak terjangkau: hasil lama dari jalan sebelumnya dihapus supaya tak disangka hasil jalan ini.
    const berkas = tulisBerkas(folder, 'u.json', { tanggal: HARI, butir: [{ id: 'a', judul: 'Rekap', jalur: 'rutin', sub: 'R1' }] });
    fs.writeFileSync(berkas + '.hasil.json', '{"lama":true}');
    await gagal(['--berkas', berkas], /^GAGAL: ProductTrack di http:\/\/127\.0\.0\.1:1 tak terjangkau/, { ...env, PT_ALAMAT: 'http://127.0.0.1:1' });
    assert.ok(!fs.existsSync(berkas + '.hasil.json'));
    // Kunci agen salah.
    await gagal(['--berkas', berkas], /^GAGAL: Kunci agen salah/, { ...env, AGEN_KUNCI: 'k'.repeat(48) });
    // Berkas kosong tidak apa-apa: tak ada yang dibuat.
    const kosong = await jalankanSkrip('buat-task.js', ['--berkas', tulisBerkas(folder, 'kosong2.json', { tanggal: HARI, butir: [] })], env);
    assert.equal(kosong.kode, 0, kosong.keluar);
    assert.match(kosong.keluar, /\nHASIL: 0 task dibuat, 0 ditolak\n$/);
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
  const tutup = () => new Promise(resolve => { anak.on('exit', resolve); anak.stdin.end(); });
  return { minta, tutup };
}

test('alat MCP pilihan_task dan buat_task lewat stdio: baca pilihan, buat task, pemanggilan ulang tak menggandakan, yang tak sah ditolak', async () => {
  sheetV2();
  const { nynda } = await siapkanReal();
  const { srv, alamat } = await nyalakanServer();
  const folder = folderSementara();
  const mcp = sesiMcp({ PT_ALAMAT: alamat, AGEN_KUNCI: KUNCI, AGEN_DATA: folder });
  try {
    await mcp.minta('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'uji', version: '1' } });
    const daftar = (await mcp.minta('tools/list')).result.tools;
    assert.deepEqual(daftar.map(t => t.name), ALAT.map(a => a.name));
    const pilihan = daftar.find(t => t.name === 'pilihan_task');
    const buat = daftar.find(t => t.name === 'buat_task');
    assert.equal(pilihan.annotations.readOnlyHint, true, 'membaca: jalan tanpa kartu izin');
    assert.equal(buat.annotations.readOnlyHint, false, 'menulis: menunggu persetujuan Ali');
    assert.deepEqual(buat.inputSchema.required, ['judul', 'jalur']);
    assert.deepEqual(buat.inputSchema.properties.jalur.enum, ['proyek', 'rutin', 'inisiatif']);
    const teks = (await mcp.minta('tools/call', { name: 'pilihan_task', arguments: {} })).result.content[0].text;
    assert.match(teks, /^Pilihan form Tambah task untuk Ali \(DAE\) · data real/);
    assert.match(teks, /- PRJ-1 · Otomasi laporan · tahap Development · tim DAE \(termasuk tim Anda\)/);
    assert.match(teks, /- INI-001 · ProductTrack · Aktif · PIC Ali/);
    assert.match(teks, /Sub-stage rutin: R1 Rekap & administrasi \(CLO\); R2 /);

    const panggil = async (args) => (await mcp.minta('tools/call', { name: 'buat_task', arguments: args })).result;
    const a = await panggil({ judul: 'Perbarui rekap harian', jalur: 'rutin', sub: 'R2', status: 'Selesai', deskripsi: 'Skrip rekap diperbarui.', bukti: ['abc1234'] });
    assert.equal(a.isError, undefined, a.content[0].text);
    assert.match(a.content[0].text, /^PRD-002 dibuat untuk Ali · rutin · R2 · status Selesai\. Tampil di ProductTrack dengan tanda AI\./);
    const sama = await panggil({ judul: 'Perbarui rekap harian', jalur: 'rutin', sub: 'R2', status: 'Selesai', deskripsi: 'Skrip rekap diperbarui.', bukti: ['abc1234'] });
    assert.equal(sama.isError, undefined);
    assert.match(sama.content[0].text, /^Butir ini sudah dibuat sebagai PRD-002; tidak dibuat lagi\./);
    const ini = await panggil({ judul: 'Pembaruan ProductTrack', jalur: 'inisiatif', inisiatif: 'INI-001' });
    assert.match(ini.content[0].text, /^PRD-003 dibuat untuk Ali · inisiatif INI-001 · status Antre/);
    const proyek = await panggil({ judul: 'Generator', jalur: 'proyek', proyek: 'PRJ-1', sub: 'DV6', status: 'Ditinjau', output: 'Generator jalan' });
    assert.match(proyek.content[0].text, /^PRD-004 dibuat untuk Ali · proyek PRJ-1 · DV6 · status Ditinjau/);
    for (const [args, pola] of [
      [{ judul: 'X', jalur: 'proyek', proyek: 'PRJ-1', sub: 'DV6', status: 'Selesai', output: 'x' }, /tidak bisa langsung Selesai/],
      [{ judul: 'X', jalur: 'rutin', sub: 'DV6' }, /sub-stage rutin \(kode R\)/],
      [{ judul: 'X', jalur: 'proyek', proyek: 'PRJ-9', sub: 'DV6' }, /Proyek PRJ-9 tidak ditemukan/],
      [{ judul: 'X', jalur: 'rutin', sub: 'R1', tanggal: BESOK }, /belum terjadi/],
      [{ judul: 'X', jalur: 'rutin', sub: 'R1', tanggal: 'kemarin' }, /tanggal harus YYYY-MM-DD/],
    ]) {
      const r = await panggil(args);
      assert.equal(r.isError, true);
      assert.match(r.content[0].text, pola);
      assert.match(r.content[0].text, /^Gagal: /);
    }
    const d = await dataServer(nynda);
    assert.equal(d.tasks.length, 4, 'PRD-001 + tiga dari agen');
    assert.ok(d.log.filter(l => /^PRD-00[2-4] /.test(l.task)).every(l => l.ai === true));
    assert.equal(d.tasks.find(t => t.id === 'PRD-004').status, 'Ditinjau');
  } finally {
    await mcp.tutup();
    srv.close();
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('agent-office.json: pekerjaan pilihantask dan buattask menunjuk skrip yang ada, opsinya tertulis di --help, dan hasilnya cocok dengan keluaran skrip', async () => {
  const kantor = bacaJson(path.join(AKAR, 'agen', 'agent-office.json'));
  assert.deepEqual(kantor.pekerjaan.map(j => j.id).slice(-2), ['pilihantask', 'buattask']);
  assert.equal(new Set(kantor.pekerjaan.map(j => j.id)).size, kantor.pekerjaan.length, 'id unik');
  const [pilihan, buat] = kantor.pekerjaan.slice(-2);
  assert.deepEqual([pilihan.singkat, buat.singkat], ['Ambil pilihan form task', 'Simpan task dari rekap']);
  assert.deepEqual(pilihan.perintah, ['pilihan-task.js']);
  assert.deepEqual(buat.perintah, ['buat-task.js', ['--berkas', '{berkas}'], '{uji?--uji}']);
  const berkasParam = buat.parameter.berkas;
  assert.deepEqual([berkasParam.jenis, berkasParam.folder, berkasParam.ekstensi, berkasParam.wajib, berkasParam.kecuali], ['file', '.data/usulan', '.json', true, '\\.hasil\\.json$']);
  assert.deepEqual([buat.parameter.uji.jenis, buat.parameter.uji.bawaan], ['tanda', undefined], 'uji saja hanya kalau diminta');
  assert.equal(new RegExp(buat.parameter.berkas.kecuali, 'i').test('usulan-2026-10-16.json.hasil.json'), true, 'berkas hasil tak ditawarkan sebagai usulan');
  assert.equal(new RegExp(buat.parameter.berkas.kecuali, 'i').test('usulan-2026-10-16.json'), false);
  // Kata kunci spesifik: tak ada kata umum yang merebut perintah lain ("task", "tugas", "rekap", "proyek" sendirian).
  for (const j of [pilihan, buat]) {
    for (const kata of [...j.kata_kunci, ...j.wajib_salah_satu]) assert.ok(kata.trim().split(/\s+/).length >= 2, `kata kunci "${kata}" terlalu umum`);
    assert.ok(j.wajib_salah_satu.every(k => j.kata_kunci.includes(k)));
  }
  // Opsi di perintah ada di --help dan di isi skrip.
  for (const [skrip, opsi] of [['pilihan-task.js', ['--keluaran', '--env', '--help']], ['buat-task.js', ['--berkas', '--env', '--uji', '--help']]]) {
    assert.ok(fs.existsSync(path.join(AKAR, 'agen', skrip)), skrip);
    const h = await jalankanSkrip(skrip, ['--help'], {});
    assert.equal(h.kode, 0, h.keluar);
    const isi = fs.readFileSync(path.join(AKAR, 'agen', skrip), 'utf8');
    for (const o of opsi) assert.ok(h.keluar.includes(o) && isi.includes(`'${o}'`), `${skrip} ${o}`);
  }
  for (const o of buat.perintah.flat().filter(x => /^-/.test(x) || /^\{.*\?/.test(x))) {
    const opsi = o.startsWith('{') ? o.split('?')[1].replace('}', '') : o;
    assert.ok(fs.readFileSync(path.join(AKAR, 'agen', 'buat-task.js'), 'utf8').includes(opsi), opsi);
  }
  // hasil mencocokkan keluaran sungguhan.
  const keluaranBuat = 'Rekap 2026-10-16 · 2 butir\n  • a · dibuat PRD-002 · Selesai · Rekap\nBERKAS: /x/u.json.hasil.json\nHASIL: 1 task dibuat, 1 ditolak (1 dilewati)\n';
  assert.equal(new RegExp(buat.hasil, 'm').exec(keluaranBuat)[1], '1 task dibuat, 1 ditolak (1 dilewati)');
  const kena = [...'BERKAS: /x/pilihan-task.json\nHASIL: 1 proyek, 46 sub-stage (4 rutin), 12 orang, 1 inisiatif · data real\n'.matchAll(new RegExp(pilihan.hasil, 'gm'))].map(m => m[1]);
  assert.deepEqual(kena, ['/x/pilihan-task.json', '1 proyek, 46 sub-stage (4 rutin), 12 orang, 1 inisiatif · data real']);
});
