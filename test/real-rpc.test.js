/* Data real lewat /api/rpc (2.16.0): sumber data diatur mode Dev untuk semua pengguna; setiap
   perubahan data real diperiksa server dengan aturan aplikasi dan disimpan di tab data_real atas
   nama profil sesi itu; browser menariknya bertahap; obrolannya terpisah dari data contoh. */
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JEDA_PIN_SALAH_MS = '0';
const rpc = require('../api/rpc');
const sheet = require('../api/_sheets');
const dataReal = require('../api/_real');
const I = require('../public/inti');
const { sheetPalsu } = require('./bantu/sheet-palsu');

const PIN = '135790';
const PIN_DEV = '908172';
const ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcd';
const EMAIL = 'producttrack-v2@contoh.iam.gserviceaccount.com';

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
async function masuk() { return pakai(await aksi(null, 'masuk', PIN)); }
async function sebagai(cookie, orang) {
  const r = await aksi(cookie, 'masukProfil', orang, '');
  assert.equal(r.status, 200, r.teks);
  return pakai(r);
}
function sheetV2() {
  const p = sheetPalsu([{ title: '_meta', sheetId: 1, values: [['app', 'producttrack-v2']] }], { email: EMAIL });
  sheet.klien = async () => p.k;
  return p;
}
let nomor = 0;
const perintah = (aksiData, isi) => ({ id: 'uji' + String(++nomor).padStart(5, '0'), aksi: aksiData, isi, at: Date.now(), hari: '2026-10-09' });

const klienAsli = sheet.klien;
test.beforeEach(() => {
  process.env.ACCESS_PIN = PIN;
  process.env.SESSION_SECRET = 's'.repeat(48);
  process.env.SPREADSHEET_ID = ID;
  process.env.DEV_PIN = PIN_DEV;
  for (const k of ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GOOGLE_APPLICATION_CREDENTIALS', 'VERCEL', 'VERCEL_ENV', 'APP_ENV']) delete process.env[k];
  sheet.klien = klienAsli;
});
test.after(() => { I.aturOrang([]); I.aturMaster([]); });

test('sumber data: hanya mode Dev yang mengganti, untuk semua pengguna; data contoh tetap bawaan', async () => {
  const p = sheetV2();
  const biasa = await masuk();
  assert.equal((await aksi(biasa, 'muatContoh')).json.mode, 'contoh', 'belum ada setelan = data contoh');
  assert.equal((await aksi(biasa, 'aturSumber', 'real')).status, 403);
  const dev = pakai(await aksi(null, 'masukDev', PIN_DEV));
  assert.equal((await aksi(dev, 'aturSumber', 'semua')).status, 400);
  assert.equal(p.tab('setelan'), undefined, 'penolakan tak menulis apa pun');
  const r = await aksi(dev, 'aturSumber', 'real');
  assert.equal(r.status, 200, r.teks);
  assert.deepEqual(p.tab('setelan').values.slice(0, 2).map(b => b.slice(0, 3)), [['kunci', 'nilai', 'oleh'], ['sumber_data', 'real', 'dev']]);
  const muat = await aksi(biasa, 'muatContoh', {});
  assert.equal(muat.status, 200, muat.teks);
  assert.deepEqual([muat.json.mode, muat.json.data, muat.json.sumber, muat.json.real.seq, muat.json.real.peristiwa], ['real', null, 'Data real', 0, []]);
  assert.ok(Array.isArray(muat.json.master) && Array.isArray(muat.json.orang), 'organogram & Master tetap terkirim');
  await aksi(dev, 'aturSumber', 'contoh');
  assert.equal((await aksi(biasa, 'sinkron', {})).json.mode, 'contoh');
  assert.equal(p.tab('setelan').values.length, 2, 'setelan ditimpa, bukan ditambah');
});

test('simpanReal: hanya saat data real aktif, atas nama profil sesi, dan hanya yang lolos aturan', async () => {
  const p = sheetV2();
  const biasa = await masuk();
  const dev = pakai(await aksi(null, 'masukDev', PIN_DEV));
  const buat = perintah('proyekBaru', { f: { name: 'Produksi OJK 2027', platform: 'OJK' } });
  const contoh = await aksi(await sebagai(biasa, 'nynda'), 'simpanReal', buat);
  assert.deepEqual([contoh.status, contoh.json.kode], [403, 'SUMBER'], 'data contoh aktif: tak masuk data real');
  await aksi(dev, 'aturSumber', 'real');
  assert.equal((await aksi(biasa, 'simpanReal', buat)).status, 403, 'tanpa profil ditolak');
  const kiki = await sebagai(biasa, 'kiki');
  const tolak = await aksi(kiki, 'simpanReal', buat);
  assert.deepEqual([tolak.status, tolak.json.message], [400, 'Hanya Manager yang membuat proyek.'], 'aturan aplikasi berlaku di server');
  assert.equal(p.tab('data_real'), undefined, 'yang ditolak tak menulis apa pun');

  const nynda = await sebagai(biasa, 'nynda');
  const r = await aksi(nynda, 'simpanReal', { ...buat, oleh: 'kiki' });
  assert.equal(r.status, 200, r.teks);
  const e = r.json.peristiwa;
  assert.deepEqual([e.seq, e.oleh, e.aksi, e.hasil, e.generasi], [1, 'nynda', 'proyekBaru', { id: 'PRJ-1' }, buat.id], 'pelaku = profil sesi, bukan isian browser');
  assert.equal(e.ubah.projects.pasang[0].name, 'Produksi OJK 2027');
  assert.deepEqual(p.tab('data_real').values[0], ['id', 'bagian', 'at', 'oleh', 'aksi', 'hari', 'perintah', 'ubah', 'dasar']);
  // Kiriman ulang dengan id yang sama (balasan pertama hilang di jalan) tak menambah baris.
  const ulang = await aksi(nynda, 'simpanReal', buat);
  assert.deepEqual([ulang.json.peristiwa.seq, ulang.json.peristiwa.ulang, p.tab('data_real').values.length], [1, true, 2]);
  // Perintah berikutnya diperiksa terhadap keadaan sesudah perintah pertama.
  const task = await aksi(nynda, 'simpanReal', perintah('taskBaru', { f: { title: 'A1 intake', project: 'PRJ-1', sub: 'A1', pic: 'nynda' } }));
  assert.deepEqual([task.status, task.json.peristiwa.seq, task.json.peristiwa.hasil], [200, 2, { id: 'PRD-001' }], task.teks);
  const salah = await aksi(nynda, 'simpanReal', perintah('terapkanAksi', { task: 'PRD-001', kunci: 'setujui' }));
  assert.equal(salah.status, 400, 'aksi yang tak tersedia untuk task Antre ditolak');
  assert.equal((await aksi(nynda, 'simpanReal', { id: 'x', aksi: 'taskBaru', isi: {} })).status, 400, 'perintah yang tak rapi ditolak');
});

test('sinkron: perubahan bertahap sejak nomor urut, dari awal kalau generasinya lain; obrolan data real terpisah', async () => {
  const p = sheetV2();
  const biasa = await masuk();
  const dev = pakai(await aksi(null, 'masukDev', PIN_DEV));
  const nynda = await sebagai(biasa, 'nynda');
  // Pesan di data contoh dulu.
  const pesan = { jenis: 'pesan', ruang: 'task:PRD-001', oleh: 'nynda', teks: 'Pesan data contoh' };
  assert.equal((await aksi(nynda, 'kirimObrolan', pesan)).status, 200);
  await aksi(dev, 'aturSumber', 'real');
  for (const nama of ['P1', 'P2', 'P3']) await aksi(nynda, 'simpanReal', perintah('proyekBaru', { f: { name: nama } }));
  const awal = (await aksi(nynda, 'sinkron', { realSejak: 0 })).json;
  assert.deepEqual([awal.mode, awal.real.seq, awal.real.dariAwal, awal.real.peristiwa.map(e => e.seq)], ['real', 3, true, [1, 2, 3]]);
  assert.deepEqual(awal.obrolan.peristiwa, [], 'obrolan data contoh tak terbawa ke data real');
  const lanjut = (await aksi(nynda, 'sinkron', { realSejak: 2, generasi: awal.real.generasi })).json.real;
  assert.deepEqual([lanjut.dariAwal, lanjut.peristiwa.map(e => [e.seq, e.ubah.projects.pasang[0].name])], [false, [[3, 'P3']]]);
  const lain = (await aksi(nynda, 'sinkron', { realSejak: 2, generasi: 'tab-lama' })).json.real;
  assert.deepEqual([lain.dariAwal, lain.peristiwa.length], [true, 3], 'generasi lain: semua dari awal');
  // Obrolan data real di tab sendiri.
  await aksi(nynda, 'kirimObrolan', { ...pesan, teks: 'Pesan data real' });
  assert.deepEqual(p.tab('obrolan_real').values.slice(1).map(b => b[5]), ['Pesan data real']);
  assert.deepEqual((await aksi(nynda, 'muatObrolan', 0)).json.peristiwa.map(e => e.teks), ['Pesan data real']);
  assert.equal(p.tab('obrolan').values.length, 2, 'obrolan data contoh tetap utuh');
});

test('perubahan besar terpecah ke beberapa baris berurutan dan terbaca utuh; baca bertahap mengikuti tab yang dibuat ulang', async () => {
  const p = sheetV2();
  const dev = pakai(await aksi(null, 'masukDev', PIN_DEV));
  await aksi(dev, 'aturSumber', 'real');
  const nynda = await sebagai(await masuk(), 'nynda');
  await aksi(nynda, 'simpanReal', perintah('proyekBaru', { f: { name: 'Besar' } }));
  const besar = await aksi(nynda, 'simpanReal', perintah('taskBaru', { f: { title: 'Task panjang', project: 'PRJ-1', sub: 'A2', pic: 'nynda', detail: 'Keterangan '.repeat(3500) } }));
  assert.equal(besar.status, 200, besar.teks);
  // Detail 38.500 karakter muncul di perubahan task dan di catatan perintahnya: tetap satu perubahan, beberapa baris.
  const baris = p.tab('data_real').values.slice(1);
  assert.ok(baris.length >= 2 && baris.every(b => b[7].length <= 45000), `${baris.length} baris`);
  const baca = await sheet.bacaReal(p.k, ID, { segar: true });
  assert.deepEqual([baca.peristiwa.length, baca.rusak, baca.peristiwa[1].ubah.tasks.pasang[0].detail.length], [2, 0, 'Keterangan '.repeat(3500).trim().length]);
  // Tab dihapus lalu terisi lagi (mis. data real dimulai ulang dengan tangan): generasi baru, dibaca dari awal.
  p.tabs.splice(p.tabs.indexOf(p.tab('data_real')), 1);
  await aksi(nynda, 'simpanReal', perintah('proyekBaru', { f: { name: 'Mulai lagi' } }));
  const ulang = await sheet.bacaReal(p.k, ID, { segar: true });
  assert.deepEqual([ulang.peristiwa.length, ulang.peristiwa[0].ubah.projects.pasang[0].id], [1, 'PRJ-1'], 'nomor proyek mulai lagi dari data kosong');
  assert.notEqual(ulang.generasi, baca.generasi);
});

/* Instance server kedua: antrean dan susunan keadaannya sendiri, modul spreadsheet bersama. */
function instanceLain() {
  const jalur = require.resolve('../api/_real');
  const asli = require.cache[jalur];
  delete require.cache[jalur];
  const lain = require('../api/_real');
  require.cache[jalur] = asli;
  return lain;
}

test('dua instance bersamaan: yang menyelip menang; yang kalah diperiksa ulang, lalu ditulis lagi atau ditolak', async () => {
  const p = sheetV2();
  const dev = pakai(await aksi(null, 'masukDev', PIN_DEV));
  await aksi(dev, 'aturSumber', 'real');
  const nynda = await sebagai(await masuk(), 'nynda');
  await aksi(nynda, 'simpanReal', perintah('proyekBaru', { f: { name: 'Bersama' } }));
  const lain = instanceLain();
  const tulisAsli = sheet.tulisReal;
  // Instance lain menyimpan perintahnya tepat di antara pemeriksaan dan penulisan instance ini.
  const selipkan = (buat, kali = 1) => {
    let dalam = false;
    sheet.tulisReal = async (...a) => {
      if (!dalam && kali-- > 0) {
        dalam = true;
        try { await lain.simpan(p.k, ID, buat(), 'nynda'); } finally { dalam = false; }
      }
      return tulisAsli(...a);
    };
  };
  try {
    // Dua task baru dihitung dari keadaan yang sama, jadi nomornya sama-sama PRD-001.
    selipkan(() => perintah('taskBaru', { f: { title: 'Dari instance lain', project: 'PRJ-1', sub: 'A1', pic: 'nynda' } }));
    const kita = perintah('taskBaru', { f: { title: 'Dari instance ini', project: 'PRJ-1', sub: 'A2', pic: 'nynda' } });
    const r = await aksi(nynda, 'simpanReal', kita);
    assert.equal(r.status, 200, r.teks);
    assert.deepEqual([r.json.peristiwa.seq, r.json.peristiwa.hasil], [4, { id: 'PRD-002' }], 'diperiksa ulang: dapat nomor berikutnya');
    assert.deepEqual(p.tab('data_real').values.slice(1).map(b => [b[0] === kita.id, b[8]]), [[false, '0'], [false, '1'], [true, '1'], [true, '3']]);
    const s = (await aksi(nynda, 'sinkron', { realSejak: 0 })).json.real;
    assert.deepEqual([s.seq, s.peristiwa.map(e => e.sah !== false), s.peristiwa[2].ubah], [4, [true, true, false, true], {}], 'yang kalah dikirim tanpa isi');
    const d = I.dataKosong();
    for (const e of s.peristiwa) if (e.sah !== false) I.terapkanUbah(d, e.ubah);
    assert.deepEqual(d.tasks.map(t => [t.id, t.title]).sort(), [['PRD-001', 'Dari instance lain'], ['PRD-002', 'Dari instance ini']], 'tak ada task yang tertimpa');
    const ulang = await aksi(nynda, 'simpanReal', kita);
    assert.deepEqual([ulang.json.peristiwa.seq, ulang.json.peristiwa.ulang], [4, true], 'baris yang kalah tak dihitung sudah tersimpan');

    // Aksi yang sama dua kali: yang kalah kini tak lolos aturan.
    selipkan(() => perintah('terapkanAksi', { task: 'PRD-001', kunci: 'mulai' }));
    const dobel = await aksi(nynda, 'simpanReal', perintah('terapkanAksi', { task: 'PRD-001', kunci: 'mulai' }));
    assert.equal(dobel.status, 400, dobel.teks);

    // Terus kalah: berhenti setelah PERCOBAAN_MAKS kali; browser mengirim lagi nanti.
    selipkan(() => perintah('proyekBaru', { f: { name: 'Proyek instance lain' } }), Infinity);
    const ramai = await aksi(nynda, 'simpanReal', perintah('proyekBaru', { f: { name: 'Proyek ramai' } }));
    assert.equal(ramai.status, 500, ramai.teks);
    sheet.tulisReal = tulisAsli;
    const sistem = (await aksi(dev, 'sistem')).json.real;
    const kalah = 1 + 1 + dataReal.PERCOBAAN_MAKS;
    assert.deepEqual([sistem.perubahan, sistem.diulang], [p.tab('data_real').values.length - 1 - kalah, kalah]);
    const sel = p.tab('data_real').values.slice(1).reduce((n, b) => n + b[6].length + b[7].length, 0);
    assert.equal(sistem.ukuran, sel, 'perkiraan besar riwayat = isi sel perintah dan ubah');
  } finally {
    sheet.tulisReal = tulisAsli;
  }
});
