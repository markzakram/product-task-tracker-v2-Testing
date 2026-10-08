/* =============================================================================
   /api/rpc — satu pintu untuk semua aksi v2, pola yang sama dengan v1.

     GET  /api/rpc                                 kesehatan + setelan mana yang sudah ada
                                                   (hanya ya/tidak, tak pernah nilainya)
     POST /api/rpc  { action: 'masuk', args: [pin] } menerbitkan cookie sesi
     POST /api/rpc  { action: 'keluar' }             menghapusnya
     POST /api/rpc  { action: 'status' }             akun, spreadsheet, kepemilikan
     POST /api/rpc  { action: 'siapkan' }            pasang penanda v2 di spreadsheet kosong
     POST /api/rpc  { action: 'muatContoh' }         data contoh untuk prototipe
     POST /api/rpc  { action: 'muatObrolan', args: [sejak] }   pesan Komunikasi sejak waktu itu
     POST /api/rpc  { action: 'kirimObrolan', args: [peristiwa] } satu pesan/ubah/hapus/reaksi/beres
     POST /api/rpc  { action: 'muatFoto', args: [sejak] }      foto profil yang berubah sejak waktu itu
     POST /api/rpc  { action: 'simpanFoto', args: [{ orang, gambar }] }  ganti atau hapus (gambar '')

   Balasan berbentuk { success, message, ... } seperti v1.

   Ditulis dengan API inti Node (statusCode/setHeader/end), bukan res.status() milik
   Vercel, supaya berkas yang sama jalan di scripts/dev.js — dan nanti di server Node
   biasa kalau v2 pindah dari Vercel.
   ========================================================================== */

const sesi = require('./_sesi');
const sheet = require('./_sheets');
// Aturan pesan yang sama dengan browser (public/inti.js), supaya isian diperiksa di dua sisi.
const Inti = require('../public/inti.js');

/* Isian dari browser yang tak masuk akal: 400, bukan 409 (yang khusus aturan kepemilikan). */
class GalatIsian extends Error {}

const lingkungan = () => process.env.VERCEL_ENV || 'lokal';
const lewatHttps = req => req.headers['x-forwarded-proto'] === 'https' || !!process.env.VERCEL;
const tidur = ms => new Promise(r => setTimeout(r, ms));

/* Jeda setelah PIN salah: memperlambat tebak-tebakan, bukan pengganti pembatas laju.
   JEDA_PIN_SALAH_MS hanya untuk tes. */
function jedaPinSalah() {
  const n = Number(process.env.JEDA_PIN_SALAH_MS);
  return Number.isFinite(n) && n >= 0 ? n : 700;
}

function kirim(res, kode, isi, cookie) {
  res.statusCode = kode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (cookie) res.setHeader('Set-Cookie', cookie);
  res.end(JSON.stringify(isi));
}

async function bacaBody(req) {
  let b;
  try { b = req.body; } catch (e) { return {}; }   // Vercel melempar di sini kalau JSON-nya rusak
  if (b && typeof b === 'object' && !Buffer.isBuffer(b)) return b;
  if (typeof b === 'string' || Buffer.isBuffer(b)) {
    try { return JSON.parse(String(b)) || {}; } catch (e) { return {}; }
  }
  return await new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

/* Aksi di balik gerbang. Argumen dari browser diteruskan sesuai urutan. */
const AKSI = {
  async status() {
    const k = await sheet.klien();
    return { akun: k.email, spreadsheet: await sheet.periksa(k, sheet.idSpreadsheet()) };
  },
  async siapkan() {
    const k = await sheet.klien();
    const hasil = await sheet.siapkan(k, sheet.idSpreadsheet());
    return {
      akun: k.email,
      spreadsheet: hasil,
      message: hasil.berubah ? 'Penanda v2 terpasang.' : 'Spreadsheet ini sudah milik v2.',
    };
  },
  /* Seluruh data contoh dalam bentuk yang langsung dipakai prototipe.
     data null = belum pernah diimpor (npm run impor:v1). */
  async muatContoh() {
    const k = await sheet.klien();
    return await sheet.bacaContoh(k, sheet.idSpreadsheet());
  },
  /* Komunikasi bersama (0.10.0): satu-satunya data yang ditulis aplikasi ke spreadsheet. */
  async muatObrolan(sejak) {
    const k = await sheet.klien();
    return await sheet.bacaObrolan(k, sheet.idSpreadsheet(), sejak);
  },
  async kirimObrolan(peristiwa) {
    let bersih;
    try { bersih = Inti.periksaPeristiwa(peristiwa); } catch (err) { throw new GalatIsian(err.message); }
    const k = await sheet.klien();
    return { peristiwa: await sheet.tulisObrolan(k, sheet.idSpreadsheet(), bersih) };
  },
  /* Foto profil (0.12.0): tab foto di spreadsheet v2, satu baris per orang. */
  async muatFoto(sejak) {
    const k = await sheet.klien();
    return await sheet.bacaFoto(k, sheet.idSpreadsheet(), sejak);
  },
  async simpanFoto(foto) {
    let bersih;
    try { bersih = Inti.periksaFoto(foto); } catch (err) { throw new GalatIsian(err.message); }
    const k = await sheet.klien();
    return { foto: await sheet.tulisFoto(k, sheet.idSpreadsheet(), bersih) };
  },
};

function kodeUntuk(err) {
  if (err instanceof GalatIsian) return 400;
  if (err instanceof sheet.GalatSetelan) return 503;
  if (err instanceof sheet.GalatDitolak) return 409;
  if (err && (err.response || err.config || err.status)) return 502;   // dari Google
  return 500;
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    return kirim(res, 200, {
      ok: true,
      app: sheet.PENANDA.app,
      env: lingkungan(),
      setelan: { ...sheet.setelanAda(), ...sesi.setelanAda() },
    });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return kirim(res, 405, { success: false, message: 'Metode tidak didukung.' });
  }

  const body = await bacaBody(req);
  const aksi = typeof body.action === 'string' ? body.action : '';
  const args = Array.isArray(body.args) ? body.args : [];

  // Gerbang yang belum disetel berarti TERTUTUP. Lihat catatan di _sesi.js.
  const kurang = sesi.kurangnya();
  if (kurang.length) {
    return kirim(res, 503, { success: false, kode: 'SETELAN', message: 'Gerbang PIN belum disetel. ' + kurang.join(' ') });
  }

  if (aksi === 'masuk') {
    if (!sesi.cocokPin(args[0])) {
      await tidur(jedaPinSalah());
      return kirim(res, 401, { success: false, kode: 'PIN', message: 'PIN salah.' });
    }
    return kirim(res, 200, { success: true, message: 'Berhasil masuk.' },
      sesi.cookieMasuk(sesi.terbitkan(), lewatHttps(req)));
  }
  if (aksi === 'keluar') {
    return kirim(res, 200, { success: true, message: 'Sudah keluar.' }, sesi.cookieKeluar(lewatHttps(req)));
  }

  if (!sesi.sah(sesi.bacaCookie(req))) {
    return kirim(res, 401, { success: false, kode: 'MASUK', message: 'Perlu PIN.' });
  }

  const fungsi = Object.prototype.hasOwnProperty.call(AKSI, aksi) ? AKSI[aksi] : null;
  if (!fungsi) return kirim(res, 400, { success: false, message: `Aksi tidak dikenal: ${aksi || '(kosong)'}` });

  try {
    return kirim(res, 200, { success: true, env: lingkungan(), ...(await fungsi(...args)) });
  } catch (err) {
    const kode = kodeUntuk(err);
    if (kode === 500 || kode === 502) console.error(`[rpc] aksi=${aksi}`, err);
    const akun = sheet.emailAkun();
    const message = err instanceof GalatIsian ? err.message : sheet.jelaskanGalat(err, akun);
    return kirim(res, kode, { success: false, env: lingkungan(), akun, message });
  }
};
