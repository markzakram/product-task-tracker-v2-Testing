const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JEDA_PIN_SALAH_MS = '0';
const rpc = require('../api/rpc');
const sheet = require('../api/_sheets');

const PIN = '135790';
const RAHASIA = 's'.repeat(48);
const ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcd';
const EMAIL = 'producttrack-v2@contoh.iam.gserviceaccount.com';

function panggil({ method = 'POST', body, cookie, https } = {}) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (cookie) headers.cookie = cookie;
    if (https) headers['x-forwarded-proto'] = 'https';
    const res = {
      statusCode: 200,
      h: {},
      setHeader(k, v) { this.h[k.toLowerCase()] = v; },
      end(teks) { resolve({ status: this.statusCode, headers: this.h, teks, json: JSON.parse(teks) }); },
    };
    Promise.resolve(rpc({ method, headers, body }, res)).catch(reject);
  });
}

async function masuk() {
  const r = await panggil({ body: { action: 'masuk', args: [PIN] } });
  assert.equal(r.status, 200);
  return r.headers['set-cookie'].split(';')[0];
}

/* Lapisan sheet diganti tiruan bersama (test/bantu/sheet-palsu.js). */
const { sheetPalsu } = require('./bantu/sheet-palsu');
function pasangSheet(tabs) {
  const p = sheetPalsu(tabs, { email: EMAIL });
  sheet.klien = async () => p.k;
  return p.tulisan;
}

const klienAsli = sheet.klien;
test.beforeEach(() => {
  process.env.ACCESS_PIN = PIN;
  process.env.SESSION_SECRET = RAHASIA;
  process.env.SPREADSHEET_ID = ID;
  // Env dari shell pengembang atau CI tidak boleh mengubah hasil tes.
  for (const k of ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GOOGLE_APPLICATION_CREDENTIALS', 'VERCEL', 'VERCEL_ENV', 'APP_ENV', 'DEV_PIN']) delete process.env[k];
  sheet.klien = klienAsli;
});

test('di Cloud Run nama lingkungan dari APP_ENV (diisi CI GitLab); di Vercel VERCEL_ENV tetap menang', async () => {
  process.env.APP_ENV = 'production';
  assert.equal((await panggil({ method: 'GET' })).json.env, 'production');
  process.env.VERCEL_ENV = 'preview';
  assert.equal((await panggil({ method: 'GET' })).json.env, 'preview');
});

test('GET melaporkan setelan apa saja yang ada, tanpa satu pun nilainya', async () => {
  const r = await panggil({ method: 'GET' });
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);
  assert.equal(r.json.app, 'producttrack-v2');
  assert.equal(r.json.env, 'lokal');
  assert.deepEqual(r.json.setelan, { spreadsheet: true, kredensial: false, pin: true, rahasiaSesi: true, pinDev: false });
  for (const rahasia of [PIN, RAHASIA, ID]) assert.ok(!r.teks.includes(rahasia));
  assert.equal(r.headers['cache-control'], 'no-store');
});

test('gerbang yang belum disetel menolak semuanya, termasuk masuk dengan PIN kosong', async () => {
  delete process.env.ACCESS_PIN;
  const r = await panggil({ body: { action: 'masuk', args: [''] } });
  assert.equal(r.status, 503);
  assert.equal(r.json.kode, 'SETELAN');
  assert.equal(r.headers['set-cookie'], undefined);

  process.env.ACCESS_PIN = PIN;
  process.env.SESSION_SECRET = 'pendek';
  assert.equal((await panggil({ body: { action: 'status' } })).status, 503);
});

test('tanpa cookie: 401 dan diminta masuk', async () => {
  const r = await panggil({ body: { action: 'status' } });
  assert.equal(r.status, 401);
  assert.equal(r.json.kode, 'MASUK');
});

test('PIN salah: 401, tanpa cookie', async () => {
  const r = await panggil({ body: { action: 'masuk', args: ['000000'] } });
  assert.equal(r.status, 401);
  assert.equal(r.json.kode, 'PIN');
  assert.equal(r.headers['set-cookie'], undefined);
});

test('PIN benar: cookie HttpOnly, dan Secure hanya lewat HTTPS', async () => {
  const lokal = await panggil({ body: { action: 'masuk', args: [PIN] } });
  assert.match(lokal.headers['set-cookie'], /^sesi=[\w-]+\.[\w-]+; Path=\/; HttpOnly; SameSite=Strict; Max-Age=\d+$/);
  const https = await panggil({ body: { action: 'masuk', args: [PIN] }, https: true });
  assert.match(https.headers['set-cookie'], /; Secure/);
});

test('cookie palsu ditolak', async () => {
  const r = await panggil({ body: { action: 'status' }, cookie: 'sesi=eyJleHAiOjk5OTk5OTk5OTk5OTl9.palsu' });
  assert.equal(r.status, 401);
});

test('status: akun dan kepemilikan dari lapisan sheet', async () => {
  pasangSheet([{ title: 'Sheet1', sheetId: 0, values: [] }]);
  const r = await panggil({ body: { action: 'status' }, cookie: await masuk() });
  assert.equal(r.status, 200);
  assert.equal(r.json.success, true);
  assert.equal(r.json.akun, EMAIL);
  assert.equal(r.json.spreadsheet.kepemilikan, 'kosong');
});

test('siapkan di sheet v1: 409, pesan menjelaskan, dan tak ada tulisan', async () => {
  const tulisan = pasangSheet([
    { title: 'Main', sheetId: 0, values: [['', 'Task ID']] },
    { title: 'OPTIONS', sheetId: 1, values: [] },
  ]);
  const r = await panggil({ body: { action: 'siapkan' }, cookie: await masuk() });
  assert.equal(r.status, 409);
  assert.equal(r.json.success, false);
  assert.match(r.json.message, /bukan milik v2/);
  assert.equal(tulisan.length, 0);
});

test('siapkan di sheet kosong: 200 dan menjadi milik v2', async () => {
  const tulisan = pasangSheet([{ title: 'Sheet1', sheetId: 0, values: [] }]);
  const r = await panggil({ body: { action: 'siapkan' }, cookie: await masuk() });
  assert.equal(r.status, 200);
  assert.equal(r.json.spreadsheet.kepemilikan, 'v2');
  assert.equal(r.json.message, 'Penanda v2 terpasang.');
  assert.equal(tulisan.length, 1);
});

test('SPREADSHEET_ID hilang: 503 dengan pesan setelan', async () => {
  pasangSheet([{ title: 'Sheet1', sheetId: 0, values: [] }]);
  const cookie = await masuk();
  delete process.env.SPREADSHEET_ID;
  const r = await panggil({ body: { action: 'status' }, cookie });
  assert.equal(r.status, 503);
  assert.match(r.json.message, /SPREADSHEET_ID belum diisi/);
});

test('aksi tak dikenal ditolak, termasuk nama bawaan objek', async () => {
  const cookie = await masuk();
  for (const action of ['hapusSemua', '__proto__', 'constructor', 'toString', '']) {
    const r = await panggil({ body: { action }, cookie });
    assert.equal(r.status, 400, `seharusnya 400: ${action}`);
  }
});

test('body berupa teks JSON tetap terbaca', async () => {
  pasangSheet([{ title: 'Sheet1', sheetId: 0, values: [] }]);
  const r = await panggil({ body: JSON.stringify({ action: 'status' }), cookie: await masuk() });
  assert.equal(r.status, 200);
});

test('keluar menghapus cookie; metode lain 405', async () => {
  const k = await panggil({ body: { action: 'keluar' } });
  assert.match(k.headers['set-cookie'], /^sesi=; .*Max-Age=0$/);
  const m = await panggil({ method: 'PUT' });
  assert.equal(m.status, 405);
  assert.equal(m.headers.allow, 'GET, POST');
});

test('muatContoh: perlu sesi, lalu mengembalikan data contoh utuh', async () => {
  const { urai } = require('../api/_skema');
  const p = sheetPalsu([{ title: 'Sheet1', sheetId: 0 }], { email: EMAIL });
  sheet.klien = async () => p.k;
  await sheet.tulisContoh(p.k, ID, urai({
    projects: [{ id: 'PRJ-21', name: 'KAI', platform: 'BUMN', stage: 'V', cycle: 1, decision: 'Build', goal: '' }],
    tasks: [{ id: 'PRD-099', project: 'PRJ-21', title: 'Riset', platform: 'BUMN', stage: 'A', sub: 'Market analysis', pic: 'andika', support: [], status: 'Done', gate: 'Lolos', deps: [], output: '', cycle: 1, createdAt: 1, updatedAt: 1 }],
    packages: [{ id: 'PKG-011', platform: 'BUMN', namaPaket: 'KAI', items: [], links: [] }], dashboards: [], links: [], notes: [], log: [],
  }), { sumber: 'uji' });

  assert.equal((await panggil({ body: { action: 'muatContoh' } })).status, 401);
  const r = await panggil({ body: { action: 'muatContoh' }, cookie: await masuk() });
  assert.equal(r.status, 200);
  assert.equal(r.json.sumber, 'uji');
  assert.equal(r.json.data.tasks[0].id, 'PRD-099');
  assert.deepEqual(r.json.data.tasks[0].subtasks, []);
  assert.deepEqual(r.json.seq, { task: 99, prj: 21, pkg: 11 });
});

test('muatContoh sebelum ada impor: data null, bukan galat', async () => {
  const p = sheetPalsu([{ title: 'Sheet1', sheetId: 0 }], { email: EMAIL });
  sheet.klien = async () => p.k;
  await sheet.siapkan(p.k, ID);
  const r = await panggil({ body: { action: 'muatContoh' }, cookie: await masuk() });
  assert.equal(r.status, 200);
  assert.equal(r.json.data, null);
});

/* ---------- Obrolan (Komunikasi bersama, 0.10.0) ---------- */

const JUDUL_OBROLAN = ['id', 'jenis', 'ruang', 'oleh', 'at', 'teks', 'target', 'kode', 'tanya', 'judul'];

test('obrolan: perlu sesi; pesan pertama membuat tab berjudul, lalu terbaca lagi, juga bertahap', async () => {
  const p = sheetPalsu([{ title: 'Sheet1', sheetId: 0 }], { email: EMAIL });
  sheet.klien = async () => p.k;
  await sheet.siapkan(p.k, ID);
  const e = { jenis: 'pesan', ruang: 'task:PRD-12', oleh: 'kiki', teks: 'Halo @Alya', tanya: ['alya'], judul: 'QC web', at: 1, id: 'palsu' };
  assert.equal((await panggil({ body: { action: 'kirimObrolan', args: [e] } })).status, 401);
  const cookie = await masuk();
  const r = await panggil({ body: { action: 'kirimObrolan', args: [e] }, cookie });
  assert.equal(r.status, 200);
  const satu = r.json.peristiwa;
  assert.match(satu.id, /^o[a-z0-9]+$/, 'id dari server, bukan dari browser');
  assert.ok(satu.at > 1000, 'waktu dari server');
  assert.deepEqual(p.tab('obrolan').values[0], JUDUL_OBROLAN);
  assert.deepEqual(p.tab('obrolan').values[1].slice(1, 4), ['pesan', 'task:PRD-12', 'kiki']);

  const balas = { jenis: 'reaksi', ruang: 'task:PRD-12', oleh: 'alya', target: satu.id, kode: 'jempol' };
  const dua = (await panggil({ body: { action: 'kirimObrolan', args: [balas] }, cookie })).json.peristiwa;
  const semua = await panggil({ body: { action: 'muatObrolan', args: [0] }, cookie });
  assert.equal(semua.status, 200);
  assert.deepEqual(semua.json.peristiwa.map(x => [x.id, x.jenis, x.teks, x.tanya, x.judul, x.target, x.kode]),
    [[satu.id, 'pesan', 'Halo @Alya', ['alya'], 'QC web', '', ''], [dua.id, 'reaksi', '', [], '', satu.id, 'jempol']],
    'rujukan pesan (target) tetap teks setelah lewat spreadsheet, bukan angka');
  const sejak = await panggil({ body: { action: 'muatObrolan', args: [dua.at] }, cookie });
  assert.deepEqual(sejak.json.peristiwa.map(x => x.id), [dua.id], 'tarikan bertahap: yang sejak waktu itu saja');
});

test('obrolan: belum ada pesan = daftar kosong, tanpa menulis apa pun', async () => {
  const tulisan = pasangSheet([{ title: '_meta', sheetId: 1, values: [['app', 'producttrack-v2']] }]);
  const r = await panggil({ body: { action: 'muatObrolan', args: [0] }, cookie: await masuk() });
  assert.equal(r.status, 200);
  assert.deepEqual(r.json.peristiwa, []);
  assert.equal(tulisan.length, 0);
});

test('obrolan: isian tak sah 400 tanpa tulisan; spreadsheet v1 ditolak 409 tanpa tulisan', async () => {
  pasangSheet([{ title: '_meta', sheetId: 1, values: [['app', 'producttrack-v2']] }]);
  const cookie = await masuk();
  for (const [e, pola] of [
    [{ jenis: 'pesan', ruang: 'task:PRD-1', oleh: 'kiki', teks: '' }, /kosong/],
    [{ jenis: 'pesan', ruang: 'catatan:1', oleh: 'kiki', teks: 'x' }, /Ruang/],
    [{ jenis: 'pesan', ruang: 'task:PRD-1', oleh: 'tamu', teks: 'x' }, /Pengirim/],
    [{ jenis: 'reaksi', ruang: 'task:PRD-1', oleh: 'kiki', target: 'o1', kode: 'api' }, /Reaksi/],
    ['bukan objek', /Jenis/],
  ]) {
    const r = await panggil({ body: { action: 'kirimObrolan', args: [e] }, cookie });
    assert.equal(r.status, 400, JSON.stringify(e));
    assert.match(r.json.message, pola);
  }
  const { sheetV1 } = require('./bantu/sheet-palsu');
  const v1 = sheetV1();
  sheet.klien = async () => v1.k;
  const pesan = { jenis: 'pesan', ruang: 'task:PRD-1', oleh: 'kiki', teks: 'Halo' };
  const r = await panggil({ body: { action: 'kirimObrolan', args: [pesan] }, cookie });
  assert.equal(r.status, 409);
  assert.match(r.json.message, /bukan milik v2/);
  assert.equal((await panggil({ body: { action: 'muatObrolan', args: [0] }, cookie })).status, 409);
  assert.equal(v1.tulisan.length, 0, 'sheet v1 tak ditulisi sama sekali');
});

test('obrolan: impor ulang data contoh tidak menghapus tab obrolan', async () => {
  const { urai } = require('../api/_skema');
  const p = sheetPalsu([{ title: 'Sheet1', sheetId: 0 }], { email: EMAIL });
  sheet.klien = async () => p.k;
  const isi = { projects: [], tasks: [], packages: [], dashboards: [], links: [], notes: [], log: [] };
  await sheet.tulisContoh(p.k, ID, urai(isi), { sumber: 'uji' });
  const cookie = await masuk();
  await panggil({ body: { action: 'kirimObrolan', args: [{ jenis: 'pesan', ruang: 'tim:LA', oleh: 'alya', teks: 'Rapat jam 2' }] }, cookie });
  await sheet.tulisContoh(p.k, ID, urai(isi), { sumber: 'uji lagi' });
  assert.equal(p.tab('obrolan').values.length, 2, 'judul + satu pesan tetap ada');
  const r = await panggil({ body: { action: 'muatObrolan', args: [0] }, cookie });
  assert.deepEqual(r.json.peristiwa.map(x => x.teks), ['Rapat jam 2']);
});


/* ---------- Foto profil (0.12.0) ---------- */

const fotoUji = (n, isi = 'A') => 'data:image/jpeg;base64,' + isi.repeat(n);

test('aturan foto: hanya data URL gambar base64 yang kecil; kosong = hapus', () => {
  const I = require('../public/inti');
  assert.ok(I.fotoSah(fotoUji(200)));
  assert.ok(I.fotoSah('data:image/webp;base64,QUJD'));
  for (const salah of ['data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,AA")}', 'https://contoh.test/a.jpg',
    'data:text/html;base64,PGI+', fotoUji(I.FOTO_MAKS), '', null]) assert.equal(I.fotoSah(salah), false, String(salah).slice(0, 40));
  assert.deepEqual(I.periksaFoto({ orang: 'kiki', gambar: '' }), { orang: 'kiki', gambar: '' });
  assert.deepEqual(I.periksaFoto({ orang: 'kiki', gambar: fotoUji(8), lain: 'x' }), { orang: 'kiki', gambar: fotoUji(8) });
});

test('foto: perlu sesi; unggahan pertama membuat tab berjudul, ganti menimpa baris orang itu, hapus = gambar kosong', async () => {
  const p = sheetPalsu([{ title: 'Sheet1', sheetId: 0 }], { email: EMAIL });
  sheet.klien = async () => p.k;
  await sheet.siapkan(p.k, ID);
  const kiki = { orang: 'kiki', gambar: fotoUji(300) };
  assert.equal((await panggil({ body: { action: 'simpanFoto', args: [kiki] } })).status, 401);
  const cookie = await masuk();
  const r = await panggil({ body: { action: 'simpanFoto', args: [kiki] }, cookie });
  assert.equal(r.status, 200);
  assert.equal(r.json.foto.orang, 'kiki');
  assert.ok(r.json.foto.diperbarui > 1000, 'waktu dari server');
  assert.deepEqual(p.tab('foto').values[0], ['orang', 'gambar', 'diperbarui']);
  assert.deepEqual(p.tab('foto').values[1].slice(0, 2), ['kiki', kiki.gambar]);

  await panggil({ body: { action: 'simpanFoto', args: [{ orang: 'alya', gambar: fotoUji(100, 'B') }] }, cookie });
  const baru = fotoUji(120, 'C');
  const ganti = (await panggil({ body: { action: 'simpanFoto', args: [{ orang: 'kiki', gambar: baru }] }, cookie })).json.foto;
  assert.equal(p.tab('foto').values.length, 3, 'judul + kiki + alya: foto kiki ditimpa, bukan ditambah');

  const semua = await panggil({ body: { action: 'muatFoto', args: [0] }, cookie });
  assert.equal(semua.status, 200);
  assert.deepEqual(semua.json.foto.map(f => [f.orang, f.gambar.length]).sort(), [['alya', 123], ['kiki', 143]]);
  const sejak = (await panggil({ body: { action: 'muatFoto', args: [ganti.diperbarui] }, cookie })).json.foto;
  assert.ok(sejak.some(f => f.orang === 'kiki' && f.gambar === baru), 'tarikan bertahap memuat yang baru diganti');
  assert.ok(sejak.every(f => f.diperbarui >= ganti.diperbarui), 'dan tak mengirim ulang yang lebih lama');

  await panggil({ body: { action: 'simpanFoto', args: [{ orang: 'kiki', gambar: '' }] }, cookie });
  const sesudah = (await panggil({ body: { action: 'muatFoto', args: [0] }, cookie })).json.foto;
  assert.equal(sesudah.find(f => f.orang === 'kiki').gambar, '', 'dihapus = gambar kosong (browser kembali ke inisial)');
  assert.equal(p.tab('foto').values.length, 3);
});

test('foto: belum ada tab = daftar kosong tanpa menulis; isian tak sah 400 dan v1 409, keduanya tanpa tulisan', async () => {
  const tulisan = pasangSheet([{ title: '_meta', sheetId: 1, values: [['app', 'producttrack-v2']] }]);
  const cookie = await masuk();
  const kosong = await panggil({ body: { action: 'muatFoto', args: [0] }, cookie });
  assert.equal(kosong.status, 200);
  assert.deepEqual(kosong.json.foto, []);
  for (const [f, pola] of [
    [{ orang: 'tamu', gambar: fotoUji(10) }, /Profil/],
    [{ orang: 'kiki', gambar: 'data:image/svg+xml;base64,PHN2Zz4=' }, /Format/],
    [{ orang: 'kiki', gambar: 'data:image/png;base64,AA")}' }, /Format/],
    [{ orang: 'kiki', gambar: fotoUji(50000) }, /terlalu besar/],
    ['bukan objek', /Profil/],
  ]) {
    const r = await panggil({ body: { action: 'simpanFoto', args: [f] }, cookie });
    assert.equal(r.status, 400, JSON.stringify(f).slice(0, 60));
    assert.match(r.json.message, pola);
  }
  assert.equal(tulisan.length, 0);
  const { sheetV1 } = require('./bantu/sheet-palsu');
  const v1 = sheetV1();
  sheet.klien = async () => v1.k;
  assert.equal((await panggil({ body: { action: 'simpanFoto', args: [{ orang: 'kiki', gambar: fotoUji(10) }] }, cookie })).status, 409);
  assert.equal((await panggil({ body: { action: 'muatFoto', args: [0] }, cookie })).status, 409);
  assert.equal(v1.tulisan.length, 0, 'sheet v1 tak ditulisi sama sekali');
});

test('foto: impor ulang data contoh tidak menghapus tab foto', async () => {
  const { urai } = require('../api/_skema');
  const p = sheetPalsu([{ title: 'Sheet1', sheetId: 0 }], { email: EMAIL });
  sheet.klien = async () => p.k;
  const isi = { projects: [], tasks: [], packages: [], dashboards: [], links: [], notes: [], log: [] };
  await sheet.tulisContoh(p.k, ID, urai(isi), { sumber: 'uji' });
  const cookie = await masuk();
  await panggil({ body: { action: 'simpanFoto', args: [{ orang: 'alya', gambar: fotoUji(40) }] }, cookie });
  await sheet.tulisContoh(p.k, ID, urai(isi), { sumber: 'uji lagi' });
  assert.equal(p.tab('foto').values.length, 2, 'judul + satu foto tetap ada');
  const r = await panggil({ body: { action: 'muatFoto', args: [0] }, cookie });
  assert.deepEqual(r.json.foto.map(f => f.orang), ['alya']);
});


/* ---------- Mode Dev (0.13.0) ---------- */

const PIN_DEV = '908172';
async function masukDev() {
  const r = await panggil({ body: { action: 'masukDev', args: [PIN_DEV] } });
  assert.equal(r.status, 200, r.teks);
  return r.headers['set-cookie'].split(';')[0];
}
const sheetV2 = () => sheetPalsu([{ title: '_meta', sheetId: 1, values: [['app', 'producttrack-v2']] }], { email: EMAIL });

test('mode Dev: tanpa DEV_PIN tertutup; PIN salah 401; PIN benar memberi sesi Dev yang terbaca di tiap balasan', async () => {
  const p = sheetV2();
  sheet.klien = async () => p.k;
  const tutup = await panggil({ body: { action: 'masukDev', args: ['3108'] } });
  assert.equal(tutup.status, 403);
  assert.equal(tutup.json.kode, 'DEV_MATI');
  assert.ok(!tutup.headers['set-cookie']);
  process.env.DEV_PIN = PIN_DEV;
  const salah = await panggil({ body: { action: 'masukDev', args: [PIN] } });
  assert.equal(salah.status, 401);
  assert.equal(salah.json.kode, 'PIN_DEV');
  const biasa = await masuk();
  assert.equal((await panggil({ body: { action: 'muatObrolan', args: [0] }, cookie: biasa })).json.dev, false);
  const dev = await masukDev();
  const r = await panggil({ body: { action: 'muatObrolan', args: [0] }, cookie: dev });
  assert.equal(r.status, 200);
  assert.equal(r.json.dev, true);
  const keluar = await panggil({ body: { action: 'keluarDev' }, cookie: dev });
  assert.equal(keluar.json.dev, false);
  const lagi = keluar.headers['set-cookie'].split(';')[0];
  assert.equal((await panggil({ body: { action: 'muatObrolan', args: [0] }, cookie: lagi })).json.dev, false, 'kembali ke sesi biasa, tetap masuk');
});

test('mode Dev: aksi khusus Dev 403 untuk sesi biasa, tanpa tulisan apa pun', async () => {
  process.env.DEV_PIN = PIN_DEV;
  const p = sheetV2();
  sheet.klien = async () => p.k;
  const biasa = await masuk();
  for (const [action, args] of [
    ['sistem', []],
    ['simpanOrang', [{ id: 'rina', nama: 'Rina', pendek: 'Rina', peran: 'staff', lead: 'alya' }]],
    ['kirimObrolan', [{ jenis: 'moderasi', ruang: 'task:PRD-1', oleh: 'kiki', target: 'o1abc' }]],
  ]) {
    const r = await panggil({ body: { action, args }, cookie: biasa });
    assert.equal(r.status, 403, action);
    assert.match(r.json.message, /mode Dev/);
  }
  assert.equal(p.tulisan.length, 0);
});

test('mode Dev: sistem melaporkan akun, kepemilikan, isi tiap tab, dan versi', async () => {
  process.env.DEV_PIN = PIN_DEV;
  const p = sheetPalsu([{ title: 'Sheet1', sheetId: 0 }], { email: EMAIL });
  sheet.klien = async () => p.k;
  await sheet.siapkan(p.k, ID);
  const dev = await masukDev();
  await panggil({ body: { action: 'kirimObrolan', args: [{ jenis: 'pesan', ruang: 'tim:LA', oleh: 'alya', teks: 'Halo' }] }, cookie: dev });
  const r = await panggil({ body: { action: 'sistem' }, cookie: dev });
  assert.equal(r.status, 200, r.teks);
  assert.equal(r.json.akun, EMAIL);
  assert.equal(r.json.spreadsheet.kepemilikan, 'v2');
  assert.equal(r.json.versi, require('../package.json').version);
  assert.ok(r.json.devSampai > Date.now());
  assert.deepEqual(r.json.tab.find(t => t.nama === 'obrolan'), { nama: 'obrolan', baris: 1 });
  for (const rahasia of [PIN, PIN_DEV, RAHASIA]) assert.ok(!r.teks.includes(rahasia));
});

test('mode Dev: kelola orang — tersimpan di tab orang, ikut data contoh, dan langsung berlaku di server', async () => {
  const I = require('../public/inti');
  process.env.DEV_PIN = PIN_DEV;
  const { urai } = require('../api/_skema');
  const p = sheetPalsu([{ title: 'Sheet1', sheetId: 0 }], { email: EMAIL });
  sheet.klien = async () => p.k;
  const isi = { projects: [], tasks: [], packages: [], dashboards: [], links: [], notes: [], log: [] };
  await sheet.tulisContoh(p.k, ID, urai(isi), { sumber: 'uji' });
  const dev = await masukDev();
  try {
    const buruk = await panggil({ body: { action: 'simpanOrang', args: [{ id: 'rina', nama: 'Rina', pendek: 'Kiki', peran: 'staff', lead: 'alya' }] }, cookie: dev });
    assert.equal(buruk.status, 400);
    assert.match(buruk.json.message, /unik/);
    const r = await panggil({ body: { action: 'simpanOrang', args: [{ id: 'rina', nama: 'Rina Putri', pendek: 'Rina', peran: 'staff', lead: 'alya', jabatan: 'Magang' }] }, cookie: dev });
    assert.equal(r.status, 200, r.teks);
    assert.deepEqual(p.tab('orang').values[0], ['id', 'nama', 'pendek', 'peran', 'jabatan', 'lead', 'tim', 'aktif', 'diperbarui']);
    assert.deepEqual(r.json.orang.map(o => [o.id, o.pendek, o.aktif]), [['rina', 'Rina', true]]);
    // Ganti jabatan: baris yang sama ditimpa.
    await panggil({ body: { action: 'simpanOrang', args: [{ id: 'rina', nama: 'Rina Putri', pendek: 'Rina', peran: 'staff', lead: 'kiki', jabatan: 'QC' }] }, cookie: dev })
      .then(x => assert.equal(x.status, 400, 'atasan harus Lead/Manager'));
    await panggil({ body: { action: 'simpanOrang', args: [{ id: 'rina', nama: 'Rina Putri', pendek: 'Rina', peran: 'staff', lead: 'dhea', jabatan: 'QC' }] }, cookie: dev });
    assert.equal(p.tab('orang').values.length, 2, 'judul + satu orang');
    // Orang baru sah sebagai pengirim pesan dan pemilik foto (sesi biasa pun).
    const biasa = await masuk();
    const kirim = await panggil({ body: { action: 'kirimObrolan', args: [{ jenis: 'pesan', ruang: 'tim:CO', oleh: 'rina', teks: 'Halo tim' }] }, cookie: biasa });
    assert.equal(kirim.status, 200, kirim.teks);
    // Moderasi dari Dev selalu atas nama Dev, apa pun kiriman browser.
    const mod = await panggil({ body: { action: 'kirimObrolan', args: [{ jenis: 'moderasi', ruang: 'tim:CO', oleh: 'kiki', target: kirim.json.peristiwa.id }] }, cookie: dev });
    assert.equal(mod.status, 200, mod.teks);
    assert.equal(mod.json.peristiwa.oleh, I.DEV);
    // Data contoh membawa baris orang, supaya browser menerapkannya sebelum layar pertama.
    const contoh = await panggil({ body: { action: 'muatContoh' }, cookie: biasa });
    assert.deepEqual(contoh.json.orang.map(o => [o.id, o.lead, o.jabatan]), [['rina', 'dhea', 'QC']]);
    // Impor ulang data contoh tidak menyentuh tab orang.
    await sheet.tulisContoh(p.k, ID, urai(isi), { sumber: 'uji lagi' });
    assert.equal(p.tab('orang').values.length, 2);
  } finally {
    I.aturOrang([]);
  }
});


/* ---------- Master & PIN profil (0.14.0) ---------- */

async function sheetContoh() {
  const { urai } = require('../api/_skema');
  const p = sheetPalsu([{ title: 'Sheet1', sheetId: 0 }], { email: EMAIL });
  sheet.klien = async () => p.k;
  const isi = { projects: [], tasks: [], packages: [], dashboards: [], links: [], notes: [], log: [] };
  await sheet.tulisContoh(p.k, ID, urai(isi), { sumber: 'uji' });
  return { p, urai, isi };
}
const pakai = r => r.headers['set-cookie'].split(';')[0];

test('master: tersimpan di tab master, ikut data contoh, dan berlaku saat dimuat', async () => {
  const I = require('../public/inti');
  const { p, urai, isi } = await sheetContoh();
  const cookie = await masuk();
  try {
    const r = await panggil({ body: { action: 'simpanMaster', args: ['substage', { baru: true, kunci: 'dv10', nama: 'Produksi soal AI', tim: 'AK' }] }, cookie });
    assert.equal(r.status, 200, r.teks);
    assert.deepEqual(p.tab('master').values[0], ['jenis', 'kunci', 'data', 'aktif', 'urutan', 'diperbarui']);
    assert.deepEqual(r.json.master.map(m => [m.jenis, m.kunci, m.nama, m.tim]), [['substage', 'DV10', 'Produksi soal AI', 'AK']]);
    const buruk = await panggil({ body: { action: 'simpanMaster', args: ['capaian', { kunci: 'tayang', nama: 'Tayang', bobot: 90 }] }, cookie });
    assert.equal(buruk.status, 400);
    assert.match(buruk.json.message, /100%/);
    // Ganti nama: baris yang sama ditimpa.
    await panggil({ body: { action: 'simpanMaster', args: ['substage', { kunci: 'DV10', nama: 'Produksi soal berbantuan AI', tim: 'AK' }] }, cookie });
    assert.equal(p.tab('master').values.length, 2);
    const contoh = await panggil({ body: { action: 'muatContoh' }, cookie });
    assert.deepEqual(contoh.json.master.map(m => m.nama), ['Produksi soal berbantuan AI']);
    assert.deepEqual(contoh.json.berpin, []);
    await sheet.tulisContoh(p.k, ID, urai(isi), { sumber: 'uji lagi' });
    assert.equal(p.tab('master').values.length, 2, 'impor ulang tak menyentuh tab master');
  } finally { I.aturMaster([]); }
});

test('PIN profil: hanya mode Dev yang mengatur; hash tak pernah keluar; PIN salah 401; menulis atas nama profil ber-PIN perlu PIN-nya', async () => {
  const { p } = await sheetContoh();
  const cookie = await masuk();
  process.env.DEV_PIN = PIN_DEV;
  const dev = await masukDev();
  // Sesi biasa, juga Manager, tak mengatur PIN (0.14.1: bagian PIN profil hanya untuk mode Dev).
  assert.equal((await panggil({ body: { action: 'aturPin', args: ['kiki', '2468'] }, cookie })).status, 403);
  const manager = pakai(await panggil({ body: { action: 'masukProfil', args: ['nynda', ''] }, cookie }));
  assert.equal((await panggil({ body: { action: 'aturPin', args: ['kiki', '2468'] }, cookie: manager })).status, 403);
  assert.equal(p.tab('pin'), undefined, 'penolakan tak menulis apa pun');
  const atur = await panggil({ body: { action: 'aturPin', args: ['kiki', '2468'] }, cookie: dev });
  assert.equal(atur.status, 200, atur.teks);
  assert.deepEqual(atur.json.berpin, ['kiki']);
  const baris = p.tab('pin').values[1];
  assert.equal(baris[0], 'kiki');
  assert.ok(!baris.join('|').includes('2468'), 'PIN disimpan sebagai hash');
  const contoh = await panggil({ body: { action: 'muatContoh' }, cookie });
  assert.deepEqual(contoh.json.berpin, ['kiki']);
  assert.ok(!contoh.teks.includes(baris[1]), 'hash tak dikirim ke browser');
  assert.equal((await panggil({ body: { action: 'aturPin', args: ['kiki', '12'] }, cookie: dev })).status, 400, 'PIN 4–8 angka');

  const pesan = { jenis: 'pesan', ruang: 'tim:LA', oleh: 'kiki', teks: 'Halo' };
  const tolak = await panggil({ body: { action: 'kirimObrolan', args: [pesan] }, cookie });
  assert.equal(tolak.status, 403);
  assert.match(tolak.json.message, /PIN/);
  assert.equal(tolak.json.kode, 'PERLU_PIN', 'browser meminta PIN profil itu');
  assert.equal(tolak.json.dev, false, 'galat membawa status Dev sesi');
  assert.equal((await panggil({ body: { action: 'simpanFoto', args: [{ orang: 'kiki', gambar: '' }] }, cookie })).status, 403);
  // Profil tanpa PIN tetap bebas.
  assert.equal((await panggil({ body: { action: 'kirimObrolan', args: [{ ...pesan, oleh: 'alya' }] }, cookie })).status, 200);

  const salah = await panggil({ body: { action: 'masukProfil', args: ['kiki', '1111'] }, cookie });
  assert.equal(salah.status, 401);
  assert.equal(salah.json.kode, 'PIN_PROFIL');
  const benar = await panggil({ body: { action: 'masukProfil', args: ['kiki', '2468'] }, cookie });
  assert.equal(benar.status, 200);
  const kiki = pakai(benar);
  assert.equal((await panggil({ body: { action: 'muatContoh' }, cookie: kiki })).json.me, 'kiki');
  assert.equal((await panggil({ body: { action: 'kirimObrolan', args: [pesan] }, cookie: kiki })).status, 200);
  // Sesi Kiki tak bisa menulis atas nama profil ber-PIN lain.
  await panggil({ body: { action: 'aturPin', args: ['alya', '1357'] }, cookie: dev });
  assert.equal((await panggil({ body: { action: 'kirimObrolan', args: [{ ...pesan, oleh: 'alya' }] }, cookie: kiki })).status, 403);
  // PIN Kiki diganti: sesi lama tak lagi terbukti sebagai Kiki.
  await panggil({ body: { action: 'aturPin', args: ['kiki', '9999'] }, cookie: dev });
  assert.equal((await panggil({ body: { action: 'kirimObrolan', args: [pesan] }, cookie: kiki })).status, 403);
  assert.equal((await panggil({ body: { action: 'muatContoh' }, cookie: kiki })).json.me, '');
  // Hapus PIN: profil bebas lagi.
  const hapus = await panggil({ body: { action: 'aturPin', args: ['kiki', ''] }, cookie: dev });
  assert.deepEqual(hapus.json.berpin, ['alya']);
  assert.equal((await panggil({ body: { action: 'kirimObrolan', args: [pesan] }, cookie })).status, 200);
});

test('Master: begitu Manager ber-PIN, hanya Manager (lewat PIN) atau Dev yang bisa mengubahnya', async () => {
  const I = require('../public/inti');
  await sheetContoh();
  const cookie = await masuk();
  process.env.DEV_PIN = PIN_DEV;
  const dev = await masukDev();
  try {
    assert.equal((await panggil({ body: { action: 'aturPin', args: ['nynda', '8642'] }, cookie: dev })).status, 200);
    const isian = ['platform', { baru: true, kunci: 'SNBT' }];
    const tolak = await panggil({ body: { action: 'simpanMaster', args: isian }, cookie });
    assert.equal(tolak.status, 403);
    assert.match(tolak.json.message, /Manager/);
    // Staff yang terbukti lewat PIN-nya pun tak bisa.
    const kiki = pakai(await panggil({ body: { action: 'masukProfil', args: ['kiki', ''] }, cookie }));
    assert.equal((await panggil({ body: { action: 'simpanMaster', args: isian }, cookie: kiki })).status, 403);
    const nynda = pakai(await panggil({ body: { action: 'masukProfil', args: ['nynda', '8642'] }, cookie }));
    assert.equal((await panggil({ body: { action: 'simpanMaster', args: isian }, cookie: nynda })).status, 200);
    // Manager yang terbukti pun tak mengatur PIN: hanya mode Dev.
    assert.equal((await panggil({ body: { action: 'aturPin', args: ['kiki', '2468'] }, cookie: nynda })).status, 403);
    // PIN Manager diganti Dev: sesi lama Manager diminta PIN lagi, bukan ditolak begitu saja.
    assert.equal((await panggil({ body: { action: 'aturPin', args: ['nynda', '7531'] }, cookie: dev })).status, 200);
    const lagi = await panggil({ body: { action: 'simpanMaster', args: ['platform', { kunci: 'SNBT', urutan: 0.5 }] }, cookie: nynda });
    assert.equal(lagi.status, 403);
    assert.equal(lagi.json.kode, 'PERLU_PIN');
    assert.equal(tolak.json.kode, undefined, 'tanpa klaim Manager: ditolak biasa');
    const nynda2 = pakai(await panggil({ body: { action: 'masukProfil', args: ['nynda', '7531'] }, cookie }));
    assert.equal((await panggil({ body: { action: 'simpanMaster', args: ['platform', { kunci: 'SNBT', urutan: 0.5 }] }, cookie: nynda2 })).status, 200);
    assert.equal((await panggil({ body: { action: 'simpanMaster', args: ['platform', { kunci: 'SNBT', aktif: false }] }, cookie: dev })).status, 200);
    // Dev boleh menghapus foto profil ber-PIN (moderasi), tapi tidak menggantinya.
    assert.equal((await panggil({ body: { action: 'simpanFoto', args: [{ orang: 'nynda', gambar: '' }] }, cookie: dev })).status, 200);
    assert.equal((await panggil({ body: { action: 'simpanFoto', args: [{ orang: 'nynda', gambar: fotoUji(10) }] }, cookie: dev })).status, 403);
    // Masuk Dev dari sesi Nynda: profil terbuktinya tetap.
    const devNynda = (await panggil({ body: { action: 'masukDev', args: [PIN_DEV] }, cookie: nynda2 })).headers['set-cookie'].split(';')[0];
    assert.equal((await panggil({ body: { action: 'muatContoh' }, cookie: devNynda })).json.me, 'nynda');
  } finally { I.aturMaster([]); }
});
