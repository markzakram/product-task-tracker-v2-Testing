/* Tab master yang baris judulnya rusak (2.58.1, keluhan user: "notifnya berhasil ditambahin,
   tapi setelah direfresh ga nambah sub stagenya"). Di spreadsheet tim, tab master berisi 69 baris
   tetapi terbaca 0: server membacanya menurut judul di baris 1, sedangkan aplikasi selalu
   menulis menurut posisi MASTER_KOLOM. Semua perubahan Master tersimpan, tak satu pun berlaku.
   Tes ini menjaga supaya tab seperti itu tetap terbaca, penulisan berikutnya tak menambah
   kerusakan, dan aplikasi tak lagi menyebut "berhasil" untuk perubahan yang tak berlaku. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

process.env.JEDA_PIN_SALAH_MS = '0';
const rpc = require('../api/rpc');
const sheet = require('../api/_sheets');
const S = require('../api/_skema');
const I = require('../public/inti');
const snapshot = require('../scripts/_mysql-snapshot');
const { sheetPalsu } = require('./bantu/sheet-palsu');

const PIN = '135790';
const ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcd';
const KOLOM = S.MASTER_KOLOM;
const baris = m => S.masterKeBaris({ aktif: true, diperbarui: 1790000000000, ...m });
const D8 = baris({ jenis: 'substage', kunci: 'D8', nama: 'Rancangan asesmen', tim: 'AK', reviewManager: false });
const IZIN = baris({ jenis: 'izin', kunci: 'task.pulihkan', peran: ['manager'] });
const kode = daftar => daftar.map(m => `${m.jenis}:${m.kunci}`);

test.beforeEach(() => {
  process.env.ACCESS_PIN = PIN;
  process.env.SESSION_SECRET = 's'.repeat(48);
  process.env.SPREADSHEET_ID = ID;
  for (const k of ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GOOGLE_APPLICATION_CREDENTIALS', 'VERCEL', 'VERCEL_ENV', 'APP_ENV', 'DEV_PIN']) delete process.env[k];
});
test.afterEach(() => { I.aturMaster([]); });

test('tabelMaster: judul sah dibaca menurut nama (huruf besar-kecil, spasi, dan urutan bebas)', () => {
  assert.deepEqual(kode(S.tabelMaster([KOLOM, D8, IZIN]).baris.map(x => x.m)), ['substage:D8', 'izin:task.pulihkan']);
  const acak = [' Kunci', 'JENIS ', 'aktif', 'data', 'diperbarui', 'urutan'];
  const urut = r => acak.map(j => r[KOLOM.indexOf(j.trim().toLowerCase())]);
  const t = S.tabelMaster([acak, urut(D8)]);
  assert.equal(t.keadaan, 'sah');
  assert.deepEqual(t.baris.map(x => [x.m.kunci, x.m.nama, x.n]), [['D8', 'Rancangan asesmen', 2]]);
  assert.deepEqual(S.tabelMaster([]).baris, []);
  assert.deepEqual(S.tabelMaster(undefined).baris, []);
});

test('tabelMaster: baris judul kosong, tak lengkap, terhapus, atau tergeser tetap terbaca menurut posisi', () => {
  for (const [nama, nilai, keadaan, n] of [
    ['baris 1 kosong', [[], D8, IZIN], 'kosong', [2, 3]],
    ['baris 1 judul tak lengkap', [['jenis', 'kunci'], D8, IZIN], 'rusak', [2, 3]],
    ['judul dihapus: baris 1 data', [D8, IZIN], 'data', [1, 2]],
    ['tab diurutkan: judul di tengah', [D8, KOLOM, IZIN], 'data', [1, 3]],
    ['judul diganti nama', [['Jenis Master', 'Kode', 'Isi', 'Status', 'No', 'Waktu'], D8, IZIN], 'data', [2, 3]],
  ]) {
    const t = S.tabelMaster(nilai);
    assert.equal(t.keadaan, keadaan, nama);
    const sah = t.baris.filter(x => ['substage', 'izin'].includes(x.m.jenis));
    assert.deepEqual(kode(sah.map(x => x.m)), ['substage:D8', 'izin:task.pulihkan'], nama);
    assert.deepEqual(sah.map(x => x.n), n, `${nama}: nomor baris`);
    assert.equal(sah[0].m.nama, 'Rancangan asesmen', nama);
  }
});

/* Tab master di sheet palsu dalam keadaan tertentu, lalu tambah sub-stage lewat server. */
function sheetDenganMaster(isiMaster) {
  const p = sheetPalsu([
    { title: '_meta', sheetId: 1, values: [['app', 'producttrack-v2']] },
    { title: 'master', sheetId: 2, values: isiMaster.map(b => b.slice()) },
  ]);
  return p;
}

test('tulisMaster di tab rusak: yang lama tetap ada, yang baru terbaca, judul kosong/tak lengkap ditulis ulang', async () => {
  for (const [nama, isi, judulSesudah] of [
    ['baris 1 kosong', [[], D8], KOLOM],
    ['judul tak lengkap', [['jenis', 'kunci'], D8], KOLOM],
    ['judul dihapus', [D8], D8],
    ['judul tergeser', [D8, KOLOM], D8],
  ]) {
    const p = sheetDenganMaster(isi);
    const hasil = await sheet.tulisMaster(p.k, ID, { jenis: 'substage', kunci: 'D9', nama: 'Uji coba desain', tim: '', reviewManager: false, aktif: true });
    assert.deepEqual(kode(hasil).filter(k => k.startsWith('substage')), ['substage:D8', 'substage:D9'], nama);
    assert.deepEqual(p.tab('master').values[0], judulSesudah, `${nama}: baris 1`);
    // Mengubah yang sudah ada menimpa barisnya, termasuk di baris 1 tanpa judul.
    const ubah = await sheet.tulisMaster(p.k, ID, { jenis: 'substage', kunci: 'D8', nama: 'Rancangan asesmen baru', tim: 'AK', reviewManager: false, aktif: true });
    assert.deepEqual(ubah.filter(m => m.kunci === 'D8').map(m => m.nama), ['Rancangan asesmen baru'], nama);
    assert.equal(p.tab('master').values.filter(b => b[1] === 'D8').length, 1, `${nama}: tak ada baris D8 ganda`);
  }
});

test('tulisMaster di tab yang judulnya urutan lain: isi ditulis menurut judul itu', async () => {
  const acak = ['kunci', 'jenis', 'aktif', 'data', 'diperbarui', 'urutan'];
  const p = sheetDenganMaster([acak]);
  await sheet.tulisMaster(p.k, ID, { jenis: 'substage', kunci: 'D8', nama: 'Rancangan asesmen', tim: '', reviewManager: false, aktif: true });
  const [, b] = p.tab('master').values;
  assert.deepEqual([b[0], b[1], b[2]], ['D8', 'substage', 'ya']);
  assert.deepEqual(kode(await sheet.bacaMaster(p.k, ID)), ['substage:D8']);
});

/* ---------- Ujung ke ujung: simpan, muat ulang, berlaku di browser ---------- */

function panggil({ body, cookie } = {}) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200, h: {},
      setHeader(k, v) { this.h[k.toLowerCase()] = v; },
      end(teks) { resolve({ status: this.statusCode, headers: this.h, json: JSON.parse(teks), teks }); },
    };
    Promise.resolve(rpc({ method: 'POST', headers: cookie ? { cookie } : {}, body }, res)).catch(reject);
  });
}
async function masuk() {
  const r = await panggil({ body: { action: 'masuk', args: [PIN] } });
  return r.headers['set-cookie'].split(';')[0];
}

test('keluhan user: sub-stage yang ditambah di tab tanpa judul tetap ada sesudah dimuat ulang (data real)', async () => {
  const p = sheetPalsu([
    { title: '_meta', sheetId: 1, values: [['app', 'producttrack-v2']] },
    { title: 'setelan', sheetId: 3, values: [S.SETELAN_KOLOM, S.setelanKeBaris({ kunci: 'sumber_data', nilai: 'real', oleh: 'dev', diperbarui: 1 })] },
    // Seperti di spreadsheet tim: baris data tanpa baris judul di atasnya.
    { title: 'master', sheetId: 2, values: [IZIN.slice(), D8.slice()] },
  ]);
  const klienAsli = sheet.klien;
  sheet.klien = async () => p.k;
  try {
    const cookie = await masuk();
    const awal = await panggil({ body: { action: 'muatContoh' }, cookie });
    assert.equal(awal.json.mode, 'real');
    assert.deepEqual(kode(awal.json.master), ['izin:task.pulihkan', 'substage:D8'], 'baris lama terbaca (sampai 2.58.0: kosong)');
    I.aturMaster(awal.json.master);
    const kunci = I.kodeSubBerikut('D');
    assert.equal(kunci, 'D9', 'kode berikut melanjutkan D8 yang tersimpan');
    const r = await panggil({ body: { action: 'simpanMaster', args: ['substage', { baru: true, kunci, nama: 'Uji coba desain', tim: 'LA' }] }, cookie });
    assert.equal(r.status, 200, r.teks);
    const lagi = await panggil({ body: { action: 'muatContoh' }, cookie });
    I.aturMaster(lagi.json.master);
    assert.deepEqual(I.daftarMaster('substage').filter(s => /^D\d+$/.test(s.kunci)).map(s => s.kunci), ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9']);
    assert.equal(I.subTahap('D9').nama, 'Uji coba desain');
  } finally { sheet.klien = klienAsli; }
});

test('data contoh yang belum diimpor: Master dan organogram tetap terbaca saat dimuat ulang', async () => {
  const p = sheetPalsu([{ title: 'Sheet1', sheetId: 0 }]);
  const klienAsli = sheet.klien;
  sheet.klien = async () => p.k;
  try {
    await sheet.siapkan(p.k, ID);
    const cookie = await masuk();
    const r = await panggil({ body: { action: 'simpanMaster', args: ['substage', { baru: true, kunci: 'D8', nama: 'Rancangan asesmen', tim: '' }] }, cookie });
    assert.equal(r.status, 200, r.teks);
    const lagi = await panggil({ body: { action: 'muatContoh' }, cookie });
    assert.equal(lagi.json.data, null);
    assert.deepEqual(kode(lagi.json.master), ['substage:D8'], 'sampai 2.58.0 master tak dikirim di sini');
    assert.deepEqual(lagi.json.orang, []);
  } finally { sheet.klien = klienAsli; }
});

test('migrasi MySQL membaca tab master tanpa judul seperti aplikasi', () => {
  const s = snapshot.susun({ _meta: [['app', 'producttrack-v2']], master: [IZIN, D8, KOLOM] }, { spreadsheet: 'uji' });
  assert.deepEqual(kode(s.aplikasi.master), ['izin:task.pulihkan', 'substage:D8']);
});

test('app.js: "ditambahkan" hanya kalau perubahannya berlaku di daftar yang dikirim balik server', () => {
  const APP = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
  const simpan = APP.slice(APP.indexOf('async function simpanMaster('), APP.indexOf('function terapkanMasterUji('));
  assert.match(simpan, /S\.masterSalah = I\.aturMaster\(S\.masterBaris\);\s*if \(!masterBerlaku\(bersih\)\) return gagalMaster\(masterTakTerbaca\(\), form\);\s*return true;/);
  assert.match(simpan, /function masterBerlaku\(x\) \{\s*if \(S\.masterSalah\[x\.jenis\]\) return false;/);
  const pindah = APP.slice(APP.indexOf('async function pindahMaster('), APP.indexOf('function gagalMaster('));
  assert.match(pindah, /return gagalMaster\(masterTakTerbaca\(\), form\);\s*return tulis;/);
});

test('masterBerlaku (aturan yang sama dengan app.js): baris yang berlaku cocok; yang tak terbaca tidak', () => {
  // Salinan aturan app.js (S.masterSalah diganti argumen), supaya kecocokan isian ikut teruji.
  const berlaku = (x, salah) => {
    if (salah[x.jenis]) return false;
    const kini = I.daftarMaster(x.jenis).find(d => String(d.kunci).toLowerCase() === String(x.kunci).toLowerCase());
    return !!kini && Object.keys(x).filter(k => k !== 'jenis' && k !== 'diperbarui').every(k => JSON.stringify(kini[k]) === JSON.stringify(x[k]));
  };
  const APP = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
  assert.ok(APP.includes("return !!kini && Object.keys(x).filter(k => k !== 'jenis' && k !== 'diperbarui').every(k => JSON.stringify(kini[k]) === JSON.stringify(x[k]));"), 'aturannya sama dengan app.js');
  I.aturMaster([]);
  for (const [jenis, isian] of [
    ['substage', { baru: true, kunci: 'D8', nama: 'Rancangan asesmen', tim: 'AK', reviewManager: true }],
    ['kategori', { baru: true, label: 'Bank Soal', alur: 'DV1, E1:konten, DV8:input, E6:qc, I4:tayang', urutan: 7 }],
    ['platform', { kunci: 'TOEFL', aktif: false }],
    ['izin', { kunci: 'task.pulihkan', peran: ['manager'] }],
  ]) {
    I.aturMaster([]);
    const x = I.periksaMaster(jenis, isian, []);
    // Seperti server: ditulis lalu dibaca ulang dari tab.
    const dariTab = S.tabelMaster([KOLOM, S.masterKeBaris({ ...x, diperbarui: Date.now() })]).baris.map(b => b.m);
    const salah = I.aturMaster(dariTab);
    assert.equal(berlaku(x, salah), true, `${jenis} berlaku sesudah dibaca ulang`);
    // Tab yang tak terbaca (seperti sampai 2.58.0): perubahannya tak berlaku.
    assert.equal(berlaku(x, I.aturMaster([])), false, `${jenis} tak berlaku tanpa barisnya`);
  }
});
