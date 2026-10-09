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
     POST /api/rpc  { action: 'masukDev', args: [pinDev] }     sesi mode Dev (12 jam), tanpa sesi pun boleh
     POST /api/rpc  { action: 'keluarDev' }                    kembali ke sesi biasa
     POST /api/rpc  { action: 'sistem' }                       [Dev] diagnosa server & spreadsheet
     POST /api/rpc  { action: 'simpanOrang', args: [orang] }   [Dev] ubah/tambah orang di tab orang
     kirimObrolan dengan jenis 'moderasi'                      [Dev] sembunyikan pesan siapa pun
     POST /api/rpc  { action: 'masukProfil', args: [orang, pin] }  pilih profil (PIN kalau profil itu ber-PIN)
     POST /api/rpc  { action: 'simpanMaster', args: [jenis, isian] } [Manager/Dev] daftar pilihan (halaman Master)
     POST /api/rpc  { action: 'aturPin', args: [orang, pin] }    [Manager/Dev] atur atau hapus (pin '') PIN profil

   Balasan berbentuk { success, message, ... } seperti v1.

   Ditulis dengan API inti Node (statusCode/setHeader/end), bukan res.status() milik
   Vercel, supaya berkas yang sama jalan di scripts/dev.js — dan nanti di server Node
   biasa kalau v2 pindah dari Vercel.
   ========================================================================== */

const crypto = require('crypto');
const sesi = require('./_sesi');
const sheet = require('./_sheets');
// Aturan pesan yang sama dengan browser (public/inti.js), supaya isian diperiksa di dua sisi.
const Inti = require('../public/inti.js');

/* Isian dari browser yang tak masuk akal: 400, bukan 409 (yang khusus aturan kepemilikan). */
class GalatIsian extends Error {}
/* Aksi khusus mode Dev dari sesi biasa: 403. */
class GalatIzin extends Error {}
const hanyaDev = konteks => { if (!konteks.dev) throw new GalatIzin('Hanya mode Dev. Masuk lewat tekan-tahan logo ProductTrack, lalu isi PIN Dev.'); };

/* Pengirim pesan dan pemilik foto diperiksa dengan organogram terkini (bawaan + tab orang). */
async function terapkanOrang(k) {
  Inti.aturOrang(await sheet.bacaOrang(k, sheet.idSpreadsheet()));
}
/* Profil yang terbukti di sesi ini (lewat PIN-nya, atau tak ber-PIN), atau ''. */
async function meSah(konteks, k) {
  if (!konteks.meKlaim) return '';
  const pin = await sheet.bacaPin(k, sheet.idSpreadsheet());
  const p = pin.get(konteks.meKlaim);
  return konteks.meSidik === sesi.sidikMe(konteks.meKlaim, p ? p.hash : '') ? konteks.meKlaim : '';
}
/* kode PERLU_PIN: browser meminta PIN profil itu lagi (mis. PIN-nya baru diganti). */
const perluPin = orang => Object.assign(new GalatIzin(`Profil ${Inti.orang(orang).pendek} memakai PIN. Pilih profil itu lagi dan masukkan PIN-nya.`), { kode: 'PERLU_PIN' });
/* Menulis atas nama profil ber-PIN hanya dari sesi yang sudah memasukkan PIN profil itu. */
async function wajibProfil(konteks, k, orang) {
  const pin = await sheet.bacaPin(k, sheet.idSpreadsheet());
  if (!pin.has(orang)) return;
  if (await meSah(konteks, k) === orang) return;
  throw perluPin(orang);
}
/* Halaman Master & PIN: Dev, atau Manager yang terbukti lewat PIN. Selama belum ada Manager
   yang ber-PIN, siapa pun yang memilih profil Manager boleh (seperti data prototipe lainnya). */
async function bolehMaster(konteks, k) {
  if (konteks.dev) return;
  const me = await meSah(konteks, k);
  if (me && Inti.orang(me).peran === 'manager') return;
  const pin = await sheet.bacaPin(k, sheet.idSpreadsheet());
  if (!Inti.ORANG.some(o => o.peran === 'manager' && pin.has(o.id))) return;
  // Sesi yang mengaku Manager tapi PIN-nya belum (atau tak lagi) cocok: minta PIN-nya lagi.
  if (konteks.meKlaim && pin.has(konteks.meKlaim) && Inti.orang(konteks.meKlaim).peran === 'manager') throw perluPin(konteks.meKlaim);
  throw new GalatIzin('Hanya Manager (dengan PIN-nya) atau mode Dev yang bisa mengubah Master.');
}
const POLA_PIN = /^\d{4,8}$/;
const hashPin = (pin, garam) => crypto.scryptSync(String(pin), garam, 32).toString('hex');

let versiPaket = '';
try { versiPaket = require('../package.json').version; } catch (e) { /* tak terbawa ke fungsi: biarkan kosong */ }

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
    const id = sheet.idSpreadsheet();
    const contoh = await sheet.bacaContoh(k, id);
    // Profil ber-PIN (tanpa hash-nya) dan profil yang sudah terbukti di sesi ini.
    if (!contoh.data) return contoh;
    const pin = await sheet.bacaPin(k, id);
    return { ...contoh, berpin: [...pin.keys()], me: await meSah(this, k) };
  },
  /* Komunikasi bersama (0.10.0): satu-satunya data yang ditulis aplikasi ke spreadsheet. */
  async muatObrolan(sejak) {
    const k = await sheet.klien();
    return await sheet.bacaObrolan(k, sheet.idSpreadsheet(), sejak);
  },
  async kirimObrolan(peristiwa) {
    const k = await sheet.klien();
    // Moderasi hanya dari sesi Dev, dan selalu atas nama Dev (apa pun yang dikirim browser).
    const moderasi = peristiwa && typeof peristiwa === 'object' && peristiwa.jenis === 'moderasi';
    if (moderasi) hanyaDev(this);
    else {
      await terapkanOrang(k);
      if (peristiwa && typeof peristiwa === 'object') await wajibProfil(this, k, String(peristiwa.oleh || ''));
    }
    let bersih;
    try { bersih = Inti.periksaPeristiwa(moderasi ? { ...peristiwa, oleh: Inti.DEV } : peristiwa); } catch (err) { throw new GalatIsian(err.message); }
    return { peristiwa: await sheet.tulisObrolan(k, sheet.idSpreadsheet(), bersih) };
  },
  /* Foto profil (0.12.0): tab foto di spreadsheet v2, satu baris per orang. */
  async muatFoto(sejak) {
    const k = await sheet.klien();
    return await sheet.bacaFoto(k, sheet.idSpreadsheet(), sejak);
  },
  async simpanFoto(foto) {
    const k = await sheet.klien();
    await terapkanOrang(k);
    // Dev boleh menghapus foto siapa pun (moderasi); mengganti foto profil ber-PIN perlu PIN-nya.
    const hapus = foto && typeof foto === 'object' && !foto.gambar;
    if (!(this.dev && hapus) && foto && typeof foto === 'object') await wajibProfil(this, k, String(foto.orang || ''));
    let bersih;
    try { bersih = Inti.periksaFoto(foto); } catch (err) { throw new GalatIsian(err.message); }
    return { foto: await sheet.tulisFoto(k, sheet.idSpreadsheet(), bersih) };
  },
  /* ----- Master & PIN (0.14.0) ----- */
  async simpanMaster(jenis, isian) {
    const k = await sheet.klien();
    await bolehMaster(this, k);
    const id = sheet.idSpreadsheet();
    const baris = await sheet.bacaMaster(k, id);
    Inti.aturMaster(baris);
    let bersih;
    try { bersih = Inti.periksaMaster(String(jenis || ''), isian && typeof isian === 'object' ? isian : {}, baris); } catch (err) { throw new GalatIsian(err.message); }
    return { master: await sheet.tulisMaster(k, id, bersih) };
  },
  async aturPin(orang, pin) {
    const k = await sheet.klien();
    await bolehMaster(this, k);
    await terapkanOrang(k);
    const siapa = String(orang || '');
    if (!Inti.ORANG.some(o => o.id === siapa)) throw new GalatIsian('Profil tidak dikenal.');
    const baru = String(pin == null ? '' : pin).trim();
    if (baru && !POLA_PIN.test(baru)) throw new GalatIsian('PIN 4–8 angka.');
    const garam = baru ? crypto.randomBytes(16).toString('hex') : '';
    const peta = await sheet.tulisPin(k, sheet.idSpreadsheet(), siapa, baru ? hashPin(baru, garam) : '', garam);
    return { berpin: [...peta.keys()] };
  },
  /* ----- Mode Dev (0.13.0) ----- */
  async sistem() {
    hanyaDev(this);
    const k = await sheet.klien();
    const id = sheet.idSpreadsheet();
    const [spreadsheet, tab] = await Promise.all([sheet.periksa(k, id), sheet.hitungTab(k, id)]);
    return {
      akun: k.email, spreadsheet, tab, versi: versiPaket, lingkungan: lingkungan(),
      wilayah: process.env.VERCEL_REGION || '', waktuServer: Date.now(), devSampai: this.devSampai,
    };
  },
  async simpanOrang(baris) {
    hanyaDev(this);
    const k = await sheet.klien();
    const id = sheet.idSpreadsheet();
    const lain = await sheet.bacaOrang(k, id, { segar: true });
    let bersih;
    try { bersih = Inti.periksaOrang(baris, lain); } catch (err) { throw new GalatIsian(err.message); }
    return { orang: await sheet.tulisOrang(k, id, bersih) };
  },
};

function kodeUntuk(err) {
  if (err instanceof GalatIsian) return 400;
  if (err instanceof GalatIzin) return 403;
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
  /* Mode Dev: PIN Dev sendiri (env DEV_PIN). Boleh dari layar PIN, tanpa sesi biasa. */
  if (aksi === 'masukDev') {
    if (!sesi.setelanAda().pinDev) {
      return kirim(res, 403, { success: false, kode: 'DEV_MATI', message: 'Mode Dev belum diaktifkan. Isi DEV_PIN di Vercel (Settings → Environment Variables), lalu Redeploy.' });
    }
    if (!sesi.cocokPinDev(args[0])) {
      await tidur(jedaPinSalah());
      return kirim(res, 401, { success: false, kode: 'PIN_DEV', message: 'PIN Dev salah.' });
    }
    const lama = sesi.isiSesi(sesi.bacaCookie(req)) || {};
    const token = sesi.terbitkan(Date.now(), { dev: true, me: lama.me, meSidik: lama.meSidik });
    return kirim(res, 200, { success: true, dev: true, devSampai: sesi.akhirDev(token), message: 'Mode Dev aktif.' },
      sesi.cookieMasuk(token, lewatHttps(req)));
  }

  const cookie = sesi.bacaCookie(req);
  if (!sesi.sah(cookie)) {
    return kirim(res, 401, { success: false, kode: 'MASUK', message: 'Perlu PIN.' });
  }
  const dev = sesi.dev(cookie);
  const isi = sesi.isiSesi(cookie) || {};
  if (aksi === 'keluarDev') {
    return kirim(res, 200, { success: true, dev: false, message: 'Keluar dari mode Dev.' },
      sesi.cookieMasuk(sesi.terbitkan(Date.now(), { me: isi.me, meSidik: isi.meSidik }), lewatHttps(req)));
  }
  /* Pilih profil: yang ber-PIN harus dengan PIN-nya. Sesi baru membawa profil itu (lihat sesi.sidikMe). */
  if (aksi === 'masukProfil') {
    try {
      const k = await sheet.klien();
      await terapkanOrang(k);
      const orang = String(args[0] || '');
      if (!Inti.ORANG.some(o => o.id === orang)) return kirim(res, 400, { success: false, message: 'Profil tidak dikenal.' });
      const p = (await sheet.bacaPin(k, sheet.idSpreadsheet())).get(orang);
      if (p) {
        const masukan = String(args[1] == null ? '' : args[1]).trim();
        const cocok = POLA_PIN.test(masukan) && crypto.timingSafeEqual(Buffer.from(hashPin(masukan, p.garam), 'hex'), Buffer.from(p.hash, 'hex'));
        if (!cocok) {
          await tidur(jedaPinSalah());
          return kirim(res, 401, { success: false, kode: 'PIN_PROFIL', message: `PIN ${Inti.orang(orang).pendek} salah.` });
        }
      }
      const token = sesi.terbitkan(Date.now(), { dev, devExp: isi.devExp, me: orang, meSidik: sesi.sidikMe(orang, p ? p.hash : '') });
      return kirim(res, 200, { success: true, me: orang, dev }, sesi.cookieMasuk(token, lewatHttps(req)));
    } catch (err) {
      const kode = kodeUntuk(err);
      if (kode === 500 || kode === 502) console.error('[rpc] aksi=masukProfil', err);
      return kirim(res, kode, { success: false, message: sheet.jelaskanGalat(err, sheet.emailAkun()) });
    }
  }

  const fungsi = Object.prototype.hasOwnProperty.call(AKSI, aksi) ? AKSI[aksi] : null;
  if (!fungsi) return kirim(res, 400, { success: false, message: `Aksi tidak dikenal: ${aksi || '(kosong)'}` });

  try {
    const konteks = { dev, devSampai: dev ? sesi.akhirDev(cookie) : 0, meKlaim: isi.me || '', meSidik: isi.meSidik || '' };
    return kirim(res, 200, { success: true, env: lingkungan(), dev, ...(dev ? { devSampai: konteks.devSampai } : {}), ...(await fungsi.apply(konteks, args)) });
  } catch (err) {
    const kode = kodeUntuk(err);
    if (kode === 500 || kode === 502) console.error(`[rpc] aksi=${aksi}`, err);
    const akun = sheet.emailAkun();
    const message = err instanceof GalatIsian ? err.message : sheet.jelaskanGalat(err, akun);
    return kirim(res, kode, { success: false, env: lingkungan(), akun, dev, message, ...(err && err.kode ? { kode: err.kode } : {}) });
  }
};
