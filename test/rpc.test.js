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
  for (const k of ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GOOGLE_APPLICATION_CREDENTIALS', 'VERCEL', 'VERCEL_ENV']) delete process.env[k];
  sheet.klien = klienAsli;
});

test('GET melaporkan setelan apa saja yang ada, tanpa satu pun nilainya', async () => {
  const r = await panggil({ method: 'GET' });
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);
  assert.equal(r.json.app, 'producttrack-v2');
  assert.equal(r.json.env, 'lokal');
  assert.deepEqual(r.json.setelan, { spreadsheet: true, kredensial: false, pin: true, rahasiaSesi: true });
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
