/* Pulihkan task yang terhapus (2.44.0). Permintaan user: task PRD-190 ikut terhapus bersama
   proyeknya; "pulihkan saja tetapi dalam bentuk task rutin yang nantinya terhubung dengan
   inisiatif (opsional)". ID-nya tetap, supaya percakapannya di Komunikasi tersambung lagi. */
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JEDA_PIN_SALAH_MS = '0';
const rpc = require('../api/rpc');
const sheet = require('../api/_sheets');
const I = require('../public/inti');
const { sheetPalsu } = require('./bantu/sheet-palsu');

const HARI = '2026-10-20';
const WAKTU = Date.UTC(2026, 9, 20, 3, 0, 0);

/* Proyek Product knowledge dengan satu task Ali yang sedang ditinjau: ceklis, output, bukti. */
function keadaan() {
  const d = I.dataKosong();
  const p = I.proyekBaru(d, { name: 'Product knowledge', platform: 'All Platform' }, 'nynda', WAKTU);
  const t = I.taskBaru(d, { title: 'Membangun sistem Product Knowledge', project: p.id, sub: 'A1', pic: 'ali', due: '2026-10-19' }, 'nynda', WAKTU, HARI);
  Object.assign(t, {
    status: 'Ditinjau', output: 'Draf sistem', evidence: [{ id: 'e1', label: 'Docs', url: 'https://contoh.id/docs' }],
    subtasks: [{ id: 's1', title: 'PCPM', done: true, link: '' }, { id: 's2', title: 'PPPK', done: false, link: '' }],
    tinjauan: [{ id: 'r1', action: 'Diajukan', by: 'ali', at: WAKTU + 1, note: '' }],
  });
  const ini = I.inisiatifBaru(d, { nama: 'ProductKnowledge' }, 'ali', WAKTU);
  return { d, p, t, ini };
}

test('pulihkanTask: ID sama, jadi task rutin di luar proyek; ceklis, output, bukti, dan riwayat tinjauan ikut; boleh ditempel ke inisiatif', () => {
  const { d, p, t, ini } = keadaan();
  const asal = structuredClone(t);
  I.hapusProyek(d, p, 'nynda', WAKTU + 2);
  assert.equal(d.tasks.length, 0, 'task ikut terhapus bersama proyeknya');
  const r = I.jalankanPerintah(d, { aksi: 'pulihkanTask', isi: { task: t.id, asal, inisiatif: ini.id, due: '2026-10-24' }, oleh: 'ali', at: WAKTU + 3 });
  assert.equal(r.ok, true, r.galat);
  const b = d.tasks.find(x => x.id === t.id);
  assert.deepEqual([b.project, b.lane, b.sub, b.stage, b.status, b.due, b.inisiatif, b.kategori], ['', 'rutin', '', '', 'Dikerjakan', '2026-10-24', ini.id, 'ProductKnowledge']);
  assert.deepEqual([b.title, b.pic, b.assignedBy, b.output], ['Membangun sistem Product Knowledge', 'ali', 'nynda', 'Draf sistem']);
  assert.deepEqual([b.subtasks.length, b.evidence.length, b.tinjauan.length, b.createdAt], [2, 1, 1, asal.createdAt]);
  assert.equal(I.peninjau(b), null, 'task rutin tak ditinjau');
  assert.ok(I.aksiUntuk(b, 'ali', I.indeks(d)).some(a => a.kunci === 'selesai'), 'PIC bisa langsung menandai selesai');
  assert.ok(I.ringkasInisiatif(d, ini, HARI).tasks.some(x => x.id === t.id), 'tampil sebagai pembaruan inisiatif');
  assert.match(d.log[0].detail, /^Dipulihkan sebagai task rutin \(sebelumnya di proyek PRJ-\d+\) · inisiatif ProductKnowledge$/);
  // Tanpa inisiatif dan tenggat baru: tenggat lama tetap, kategori lama.
  const d2 = keadaan();
  const asal2 = structuredClone(d2.t);
  I.hapusProyek(d2.d, d2.p, 'nynda', WAKTU + 2);
  const b2 = I.pulihkanTask(d2.d, { task: d2.t.id, asal: asal2 }, 'nynda', WAKTU + 3);
  assert.deepEqual([b2.inisiatif, b2.due, b2.kategori], ['', '2026-10-19', 'Umum']);
});

test('pulihkanTask: hanya Lead atau Manager; isi harus milik ID itu; task yang masih ada dan inisiatif yang selesai ditolak', () => {
  const { d, p, t, ini } = keadaan();
  const asal = structuredClone(t);
  assert.throws(() => I.pulihkanTask(d, { task: t.id, asal }, 'ali', WAKTU), /masih ada/);
  I.hapusProyek(d, p, 'nynda', WAKTU + 2);
  assert.throws(() => I.pulihkanTask(d, { task: t.id, asal }, 'kiki', WAKTU), /Hanya Lead atau Manager yang memulihkan task yang terhapus/);
  assert.throws(() => I.pulihkanTask(d, { task: 'PRD-999', asal }, 'ali', WAKTU), /tidak ditemukan di riwayat/);
  assert.throws(() => I.pulihkanTask(d, { task: 'PRJ-1', asal }, 'ali', WAKTU), /ID task tidak valid/);
  I.ubahInisiatif(d, ini, { nama: ini.nama, status: 'selesai' }, 'ali', WAKTU);
  assert.throws(() => I.pulihkanTask(d, { task: t.id, asal, inisiatif: ini.id }, 'ali', WAKTU), /sudah selesai/);
  assert.equal(d.tasks.length, 0, 'yang ditolak tak menambah apa pun');
  assert.deepEqual(I.izinPeran('task.pulihkan').sort(), ['lead', 'manager']);
  assert.ok(!I.AKSI_AGEN.includes('pulihkanTask'), 'agen AI tak memulihkan task');
});

/* ---------- Lewat server (data real) ---------- */
const PIN = '135790';
const PIN_DEV = '908172';
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
let nomor = 0;
const perintah = (aksiData, isi) => ({ id: 'pulih' + String(++nomor).padStart(5, '0'), aksi: aksiData, isi, at: Date.now(), hari: HARI });

const klienAsli = sheet.klien;
test.beforeEach(() => {
  process.env.ACCESS_PIN = PIN;
  process.env.SESSION_SECRET = 's'.repeat(48);
  process.env.SPREADSHEET_ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcd';
  process.env.DEV_PIN = PIN_DEV;
  for (const k of ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GOOGLE_APPLICATION_CREDENTIALS', 'VERCEL', 'VERCEL_ENV', 'APP_ENV']) delete process.env[k];
  sheet.klien = klienAsli;
});
test.after(() => { sheet.klien = klienAsli; I.aturOrang([]); I.aturMaster([]); });

test('taskTerhapus + simpanReal pulihkanTask: isi diambil server dari riwayat data_real, bukan dari kiriman browser', async () => {
  const p = sheetPalsu([{ title: '_meta', sheetId: 1, values: [['app', 'producttrack-v2']] }], { email: 'producttrack-v2@contoh.iam.gserviceaccount.com' });
  sheet.klien = async () => p.k;
  const dev = pakai(await aksi(null, 'masukDev', PIN_DEV));
  await aksi(dev, 'aturSumber', 'real');
  const biasa = pakai(await aksi(null, 'masuk', PIN));
  const sebagai = async orang => pakai(await aksi(biasa, 'masukProfil', orang, ''));
  const [nynda, ali, kiki] = [await sebagai('nynda'), await sebagai('ali'), await sebagai('kiki')];
  const simpan = async (cookie, nama, isi) => {
    const r = await aksi(cookie, 'simpanReal', perintah(nama, isi));
    assert.equal(r.status, 200, r.teks);
    return r.json.peristiwa;
  };
  const proyek = await simpan(nynda, 'proyekBaru', { f: { name: 'Product knowledge' } });
  const task = await simpan(nynda, 'taskBaru', { f: { title: 'Membangun sistem Product Knowledge', project: proyek.hasil.id, sub: 'A1', pic: 'ali', due: '2026-10-19' } });
  const tid = task.hasil.id;
  await simpan(ali, 'tambahSubtask', { task: tid, f: { title: 'PCPM', link: '' } });
  assert.equal((await aksi(ali, 'taskTerhapus', tid)).json.terhapus, null, 'task yang masih ada tak terhitung terhapus');
  await simpan(nynda, 'hapusProyek', { proyek: proyek.hasil.id });

  const info = await aksi(kiki, 'taskTerhapus', tid);
  assert.equal(info.status, 200, info.teks);
  const x = info.json.terhapus;
  assert.deepEqual([x.task.id, x.task.subtasks.length, x.oleh, x.aksi, x.proyek.nama], [tid, 1, 'nynda', 'hapusProyek', 'Product knowledge']);
  assert.equal((await aksi(kiki, 'taskTerhapus', 'PRD-999')).json.terhapus, null);
  assert.equal((await aksi(kiki, 'taskTerhapus', 'PRJ-1')).status, 400);

  const tolak = await aksi(kiki, 'simpanReal', perintah('pulihkanTask', { task: tid, asal: x.task }));
  assert.deepEqual([tolak.status, tolak.json.message], [400, 'Hanya Lead atau Manager yang memulihkan task yang terhapus.']);
  const palsu = { ...x.task, title: 'Judul karangan browser', pic: 'kiki' };
  const e = await simpan(ali, 'pulihkanTask', { task: tid, asal: palsu, due: '2026-10-24' });
  const b = e.ubah.tasks.pasang.find(t => t.id === tid);
  assert.deepEqual([b.title, b.pic, b.lane, b.project, b.due, b.subtasks.length], ['Membangun sistem Product Knowledge', 'ali', 'rutin', '', '2026-10-24', 1]);
  assert.equal(e.oleh, 'ali');
  assert.equal((await aksi(ali, 'taskTerhapus', tid)).json.terhapus, null, 'sudah dipulihkan');
  const lagi = await aksi(ali, 'simpanReal', perintah('pulihkanTask', { task: tid }));
  assert.equal(lagi.status, 400, 'tak bisa dipulihkan dua kali');
  const tak = await aksi(ali, 'simpanReal', perintah('pulihkanTask', { task: 'PRD-999' }));
  assert.match(tak.json.message, /PRD-999 tidak ada di riwayat task yang terhapus/);
});
