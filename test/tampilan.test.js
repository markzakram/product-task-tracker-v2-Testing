/* Tampilan pribadi & status (2.21.0): aturan di inti (setelan, status, warna aksen yang tetap
   terbaca) dan penyimpanan per profil lewat RPC di tab tampilan (sheet tiruan). */
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JEDA_PIN_SALAH_MS = '0';
const I = require('../public/inti');
const rpc = require('../api/rpc');
const sheet = require('../api/_sheets');
const { sheetPalsu } = require('./bantu/sheet-palsu');

const PIN = '135790';
const ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcd';
const EMAIL = 'producttrack-v2@contoh.iam.gserviceaccount.com';
const SEKARANG = Date.UTC(2026, 9, 13, 3, 0, 0);
const gambarUji = (n, isi = 'A') => 'data:image/jpeg;base64,' + isi.repeat(n);

test('periksaTampilan: isian dibersihkan; yang tak sah ditolak (ketat) atau jadi bawaan (dari tab)', () => {
  assert.deepEqual(I.periksaTampilan({}), I.tampilanBawaan());
  const t = I.periksaTampilan({ aksen: '#6e3fc1', latar: 'senja', kuatLatar: 95, padat: 'ringkas', huruf: 'besar', awal: 'task', bahasa: 'en', lain: 'x' }, { ketat: true });
  assert.deepEqual(t, { aksen: '#6E3FC1', latar: 'senja', kuatLatar: I.KUAT_LATAR[1], padat: 'ringkas', huruf: 'besar', awal: 'task', bahasa: 'en', status: null, sampulAt: 0 });
  assert.equal(I.periksaTampilan({ aksen: I.AKSEN_BAWAAN }).aksen, '', 'biru bawaan = tanpa penimpaan');
  assert.equal(I.periksaTampilan({ kuatLatar: 2 }).kuatLatar, I.KUAT_LATAR[0]);
  for (const [isian, pola] of [
    [{ aksen: 'merah' }, /aksen/], [{ aksen: '#12345' }, /aksen/], [{ latar: 'pantai' }, /Latar/], [{ padat: 'sangat' }, /Kepadatan/],
    [{ huruf: 'raksasa' }, /huruf/], [{ awal: 'dev' }, /Halaman awal/], [{ bahasa: 'fr' }, /Bahasa/], [{ status: { emoji: '<b>', teks: 'x' } }, /Emoji/],
    [{ status: { emoji: '🎯', teks: 'x'.repeat(61) } }, /60 karakter/], [{ status: { emoji: '🎯', sampai: SEKARANG + 40 * 864e5 } }, /31 hari/],
  ]) {
    assert.throws(() => I.periksaTampilan(isian, { ketat: true, sekarang: SEKARANG }), pola, JSON.stringify(isian));
    assert.doesNotThrow(() => I.periksaTampilan(isian, { sekarang: SEKARANG }), 'baris tab yang rusak tak menghentikan aplikasi');
  }
  assert.equal(I.periksaTampilan({ awal: 'dev' }).awal, '');
});

test('status: emoji dari daftar + teks pendek; tanpa emoji = 💬; yang lewat waktunya tak tampil', () => {
  const pasang = s => I.periksaTampilan({ status: s }, { ketat: true, sekarang: SEKARANG }).status;
  assert.deepEqual(pasang({ emoji: '🏖️', teks: '  Cuti   sampai Jumat ', sampai: SEKARANG + 864e5 }), { emoji: '🏖️', teks: 'Cuti sampai Jumat', sampai: SEKARANG + 864e5 });
  assert.deepEqual(pasang({ teks: 'Di kantor cabang' }), { emoji: '💬', teks: 'Di kantor cabang', sampai: 0 });
  assert.equal(pasang({ emoji: '', teks: '  ' }), null, 'kosong = tanpa status');
  assert.equal(pasang({ emoji: '🎯', sampai: SEKARANG - 1 }), null, 'yang sudah lewat tak disimpan');
  const setelan = { status: { emoji: '🎯', teks: 'Fokus', sampai: SEKARANG + 3600e3 } };
  assert.equal(I.statusAktif(setelan, SEKARANG).teks, 'Fokus');
  assert.equal(I.statusAktif(setelan, SEKARANG + 3600e3), null, 'hilang sendiri tepat waktunya');
  assert.equal(I.statusAktif({ status: { emoji: '🎯', teks: '', sampai: 0 } }, SEKARANG).emoji, '🎯', 'tanpa batas');
  assert.ok(I.STATUS_SIAP.every(([e]) => I.EMOJI_STATUS.includes(e)));
});

test('warna aksen: teks dan isi pekatnya selalu terbaca di tema terang dan gelap, apa pun warnanya', () => {
  assert.equal(I.tokenAksen(''), null, 'tanpa aksen: lembar gaya bawaan');
  assert.equal(I.tokenAksen(I.AKSEN_BAWAAN), null);
  assert.equal(I.tokenAksen('bukan warna'), null);
  const warna = [...I.AKSEN.map(([, w]) => w), '#FFEE00', '#FFFFFF', '#000000', '#FF0000', '#00FF00', '#7FDBFF', '#888888'];
  for (const w of warna) {
    const t = I.tokenAksen(w);
    if (w === I.AKSEN_BAWAAN) continue;
    assert.ok(I.kontras(t.terang['--biru'], '#F6F7F9') >= 4.5, `${w}: teks aksen di latar terang`);
    assert.ok(I.kontras(t.terang['--isi-biru'], '#FFFFFF') >= 4.5, `${w}: tombol utama bertulisan putih`);
    assert.ok(I.kontras(t.terang['--biru-tua'], t.terang['--biru-muda']) >= 4.5, `${w}: menu aktif (teks tua di latar muda)`);
    assert.ok(I.kontras(t.gelap['--biru'], '#171C23') >= 4.5, `${w}: teks aksen di latar gelap`);
    assert.ok(I.kontras(t.gelap['--isi-biru'], '#FFFFFF') >= 4.5, `${w}: tombol utama di tema gelap`);
    assert.ok(I.kontras(t.gelap['--biru-tua'], t.gelap['--biru-muda']) >= 4.5, `${w}: menu aktif di tema gelap`);
    for (const v of [...Object.values(t.terang), ...Object.values(t.gelap)]) assert.match(v, /^#[0-9A-F]{6}$/);
  }
});

/* ---------- RPC ---------- */

function panggil({ body, cookie } = {}) {
  return new Promise((resolve, reject) => {
    const headers = cookie ? { cookie } : {};
    const res = {
      statusCode: 200,
      h: {},
      setHeader(k, v) { this.h[k.toLowerCase()] = v; },
      end(teks) { resolve({ status: this.statusCode, headers: this.h, teks, json: JSON.parse(teks) }); },
    };
    Promise.resolve(rpc({ method: 'POST', headers, body }, res)).catch(reject);
  });
}
const kuki = r => r.headers['set-cookie'].split(';')[0];
async function masuk() {
  const r = await panggil({ body: { action: 'masuk', args: [PIN] } });
  assert.equal(r.status, 200);
  return kuki(r);
}
const klienAsli = sheet.klien;
test.beforeEach(() => {
  process.env.ACCESS_PIN = PIN;
  process.env.SESSION_SECRET = 's'.repeat(48);
  process.env.SPREADSHEET_ID = ID;
  for (const k of ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GOOGLE_APPLICATION_CREDENTIALS', 'VERCEL', 'VERCEL_ENV', 'APP_ENV', 'DEV_PIN']) delete process.env[k];
  sheet.klien = klienAsli;
});
test.after(() => { sheet.klien = klienAsli; });
async function sheetBaru() {
  const p = sheetPalsu([{ title: 'Sheet1', sheetId: 0 }], { email: EMAIL });
  sheet.klien = async () => p.k;
  await sheet.siapkan(p.k, ID);
  return p;
}

test('tampilan: per profil di tab tampilan; tarikan rutin tanpa gambar sampul; sampul tetap/ganti/hapus', async () => {
  const p = await sheetBaru();
  const setelan = { aksen: '#0E7C86', latar: 'laut', kuatLatar: 40, padat: 'ringkas', huruf: '', awal: 'task', status: { emoji: '🏠', teks: 'WFH', sampai: 0 } };
  assert.equal((await panggil({ body: { action: 'simpanTampilan', args: [{ orang: 'kiki', setelan }] } })).status, 401, 'perlu sesi');
  const cookie = await masuk();
  const kosong = await panggil({ body: { action: 'muatTampilan', args: [0] }, cookie });
  assert.deepEqual(kosong.json.tampilan, [], 'belum ada tab: daftar kosong');

  const r = await panggil({ body: { action: 'simpanTampilan', args: [{ orang: 'kiki', setelan, sampul: gambarUji(500) }] }, cookie });
  assert.equal(r.status, 200, r.teks);
  assert.equal(r.json.tampilan.setelan.aksen, '#0E7C86');
  assert.ok(r.json.tampilan.setelan.sampulAt > 1000, 'waktu sampul dari server');
  assert.equal(r.json.tampilan.sampul, undefined, 'balasan tak membawa gambar');
  assert.deepEqual(p.tab('tampilan').values[0], ['orang', 'setelan', 'diperbarui', 'sampul']);

  // Simpan lagi tanpa sampul: sampul tetap, baris ditimpa (bukan ditambah).
  const lagi = await panggil({ body: { action: 'simpanTampilan', args: [{ orang: 'kiki', setelan: { ...setelan, latar: 'sampul' } }] }, cookie });
  assert.equal(lagi.json.tampilan.setelan.sampulAt, r.json.tampilan.setelan.sampulAt, 'sampul tak diubah');
  const alya = (await panggil({ body: { action: 'simpanTampilan', args: [{ orang: 'alya', setelan: { status: { emoji: '🎯', teks: 'Fokus' } } }] }, cookie })).json.tampilan;
  assert.equal(p.tab('tampilan').values.length, 3, 'judul + kiki + alya');

  const muat = await panggil({ body: { action: 'muatTampilan', args: [0] }, cookie });
  assert.deepEqual(muat.json.tampilan.map(t => [t.orang, t.setelan.latar, t.setelan.status && t.setelan.status.teks]).sort(), [['alya', '', 'Fokus'], ['kiki', 'sampul', 'WFH']]);
  assert.ok(!muat.teks.includes('base64'), 'tarikan rutin tak membawa gambar sampul');
  const sejak = await panggil({ body: { action: 'muatTampilan', args: [alya.diperbarui] }, cookie });
  assert.ok(sejak.json.tampilan.some(t => t.orang === 'alya'), 'tarikan bertahap memuat yang baru berubah');
  assert.ok(sejak.json.tampilan.every(t => t.diperbarui >= alya.diperbarui), 'dan tak mengirim ulang yang lebih lama');

  const sampul = await panggil({ body: { action: 'muatSampul', args: ['kiki'] }, cookie });
  assert.deepEqual([sampul.json.sampul, sampul.json.sampulAt], [gambarUji(500), r.json.tampilan.setelan.sampulAt]);
  const hapus = await panggil({ body: { action: 'simpanTampilan', args: [{ orang: 'kiki', setelan, sampul: '' }] }, cookie });
  assert.equal(hapus.json.tampilan.setelan.sampulAt, 0);
  assert.equal((await panggil({ body: { action: 'muatSampul', args: ['kiki'] }, cookie })).json.sampul, '');
});

test('tampilan: isian tak sah 400 tanpa menulis; profil tak dikenal ditolak; profil ber-PIN perlu PIN-nya', async () => {
  const p = await sheetBaru();
  const cookie = await masuk();
  for (const [isian, pola] of [
    [{ orang: 'kiki', setelan: { latar: 'pantai' } }, /Latar/],
    [{ orang: 'kiki', setelan: { status: { emoji: '<b>' } } }, /Emoji/],
    [{ orang: 'kiki', setelan: {}, sampul: gambarUji(50000) }, /terlalu besar/],
    [{ orang: 'kiki', setelan: {}, sampul: 'data:image/svg+xml;base64,PHN2Zz4=' }, /Format/],
    [{ orang: 'tamu', setelan: {} }, /Profil tidak dikenal/],
    [{ orang: 'dev', setelan: {} }, /Akun Dev/],
  ]) {
    const r = await panggil({ body: { action: 'simpanTampilan', args: [isian] }, cookie });
    assert.equal(r.status, 400, JSON.stringify(isian).slice(0, 60));
    assert.match(r.json.message, pola);
  }
  assert.equal(p.tab('tampilan'), undefined, 'tak ada yang tertulis');

  // Profil ber-PIN: seperti foto, hanya dari sesi yang sudah memasukkan PIN-nya.
  process.env.DEV_PIN = '908172';
  const dev = kuki(await panggil({ body: { action: 'masukDev', args: ['908172'] } }));
  assert.equal((await panggil({ body: { action: 'aturPin', args: ['kiki', '2468'] }, cookie: dev })).status, 200);
  const tolak = await panggil({ body: { action: 'simpanTampilan', args: [{ orang: 'kiki', setelan: {} }] }, cookie });
  assert.equal(tolak.status, 403);
  assert.equal(tolak.json.kode, 'PERLU_PIN');
  const kiki = kuki(await panggil({ body: { action: 'masukProfil', args: ['kiki', '2468'] }, cookie }));
  assert.equal((await panggil({ body: { action: 'simpanTampilan', args: [{ orang: 'kiki', setelan: { aksen: '#6E3FC1' } }] }, cookie: kiki })).status, 200);
});
