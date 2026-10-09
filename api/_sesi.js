/* =============================================================================
   _sesi.js — gerbang PIN dan sesi cookie.

   Bedanya dengan v1, dan disengaja:

   1. PIN tidak disimpan di browser. v1 mengirim PIN di header setiap permintaan,
      jadi PIN-nya harus tersimpan di halaman. Di sini PIN dikirim SEKALI saat masuk;
      server membalas dengan cookie HttpOnly bertanda tangan yang tak bisa dibaca
      JavaScript halaman.

   2. Gerbang yang belum disetel berarti TERTUTUP. v1 membuka aplikasi kalau semua
      PIN kosong (supaya tak terkunci). URL Vercel bisa dibuka siapa saja, jadi di v2
      env yang lupa diisi tidak boleh berarti data terbuka.

   Kunci tanda tangan diturunkan dari SESSION_SECRET + ACCESS_PIN. Mengganti PIN di
   Vercel otomatis membatalkan semua sesi lama, tanpa ada daftar sesi yang perlu
   dihapus. Cookie-nya tidak memuat PIN maupun hash PIN.

   3. Agen AI (2.17.0) masuk dengan kuncinya sendiri (env AGEN_KUNCI), bukan PIN aplikasi,
      dan sesinya terkunci pada satu profil (env AGEN_PROFIL, bawaannya ali). Sesi agen
      membawa sidik kunci itu: kunci diganti atau dikosongkan = semua sesi agen batal, dan
      sesi bertanda agen yang sidiknya tak cocok ditolak seluruhnya (tak pernah turun
      menjadi sesi biasa yang bisa memilih profil lain).
   ========================================================================== */

const crypto = require('crypto');

const NAMA_COOKIE = 'sesi';
const UMUR_HARI = 30;
/* Mode Dev (0.13.0) berumur pendek: sesudahnya sesi tetap jalan sebagai sesi biasa. */
const UMUR_DEV_JAM = 12;
/* Sesi agen AI juga pendek; agen cukup masuk lagi dengan kuncinya. */
const UMUR_AGEN_JAM = 12;
const PANJANG_RAHASIA_MIN = 32;

function setelan() {
  return {
    pin: String(process.env.ACCESS_PIN || '').trim(),
    rahasia: String(process.env.SESSION_SECRET || '').trim(),
    /* Tanpa nilai bawaan (v1 memakai 3108 kalau kosong): DEV_PIN kosong = mode Dev tertutup. */
    pinDev: String(process.env.DEV_PIN || '').trim(),
    /* Kunci agen AI: kosong atau kurang dari 32 karakter = agen tertutup. */
    kunciAgen: String(process.env.AGEN_KUNCI || '').trim(),
    profilAgen: String(process.env.AGEN_PROFIL || 'ali').trim(),
  };
}
const agenAktif = s => s.kunciAgen.length >= PANJANG_RAHASIA_MIN && !!s.profilAgen;

/* Untuk pemeriksaan kesehatan: ada atau tidak, tanpa nilainya. */
function setelanAda() {
  const s = setelan();
  return { pin: !!s.pin, rahasiaSesi: s.rahasia.length >= PANJANG_RAHASIA_MIN, pinDev: !!s.pinDev, agen: agenAktif(s) };
}
/* Agen AI: aktif atau tidak, dan profil yang dipakainya (bukan kuncinya). */
function setelanAgen() {
  const s = setelan();
  return { aktif: agenAktif(s), profil: s.profilAgen, pendek: s.kunciAgen.length > 0 && !agenAktif(s) };
}

/* Apa yang belum lengkap, ditulis sebagai langkah yang bisa langsung dikerjakan.
   Daftar kosong = gerbang siap. */
function kurangnya() {
  const { pin, rahasia } = setelan();
  const kurang = [];
  if (!pin) kurang.push('ACCESS_PIN belum diisi.');
  if (rahasia.length < PANJANG_RAHASIA_MIN) {
    kurang.push(`SESSION_SECRET ${rahasia ? 'terlalu pendek' : 'belum diisi'} — minimal ${PANJANG_RAHASIA_MIN} karakter acak.`);
  }
  return kurang;
}

function kunciTanda({ pin, rahasia }) {
  return crypto.createHmac('sha256', rahasia).update('sesi-v2|' + pin).digest();
}

function tandai(isi, s) {
  return crypto.createHmac('sha256', kunciTanda(s)).update(isi).digest();
}

/* Dibandingkan lewat hash berpanjang tetap supaya timingSafeEqual bisa dipakai
   tanpa membocorkan panjang PIN. Spasi di tepi diabaikan, seperti ACCESS_PIN-nya. */
function samaPin(masukan, pin) {
  if (!pin || masukan === undefined || masukan === null) return false;
  const a = crypto.createHash('sha256').update(String(masukan).trim()).digest();
  const b = crypto.createHash('sha256').update(pin).digest();
  return crypto.timingSafeEqual(a, b);
}
const cocokPin = masukan => samaPin(masukan, setelan().pin);
const cocokPinDev = masukan => samaPin(masukan, setelan().pinDev);
const cocokKunciAgen = masukan => { const s = setelan(); return agenAktif(s) && samaPin(masukan, s.kunciAgen); };

/* Sidik DEV_PIN di dalam sesi: mengganti DEV_PIN di Vercel membatalkan semua sesi Dev lama
   (sesinya sendiri tetap jalan sebagai sesi biasa). Bukan PIN maupun hash PIN-nya. */
function sidikDev({ rahasia, pinDev }) {
  return crypto.createHmac('sha256', rahasia).update('dev-v2|' + pinDev).digest('base64url').slice(0, 22);
}

/* Sidik kunci agen dan profilnya: mengganti AGEN_KUNCI atau AGEN_PROFIL membatalkan sesi agen lama. */
function sidikAgen({ rahasia, kunciAgen, profilAgen }) {
  return crypto.createHmac('sha256', rahasia).update(`agen-v2|${profilAgen}|${kunciAgen}`).digest('base64url').slice(0, 22);
}

/* Sidik profil (0.14.0): profil yang dipilih lewat PIN-nya (atau yang tak ber-PIN). hashPin =
   hash PIN profil itu saat ini ('' kalau tak ber-PIN): mengganti atau menghapus PIN membuat
   sidik lama tak cocok lagi, jadi profil itu harus dipilih ulang. */
function sidikMe(orang, hashPin) {
  const { rahasia } = setelan();
  return crypto.createHmac('sha256', rahasia).update(`me-v2|${orang}|${hashPin || ''}`).digest('base64url').slice(0, 22);
}

/* dev = true: sesi mode Dev, berlaku UMUR_DEV_JAM jam (devExp = lanjutkan masa yang ada).
   me + meSidik = profil yang terbukti (lihat sidikMe). agen = true: sesi agen AI, hanya profil
   AGEN_PROFIL, tanpa mode Dev. */
function terbitkan(sekarang = Date.now(), { dev = false, devExp = 0, me = '', meSidik = '', agen = false } = {}) {
  const s = setelan();
  if (agen) {
    if (!agenAktif(s)) throw new Error('Agen AI belum diaktifkan.');
    const isi = { exp: sekarang + UMUR_AGEN_JAM * 36e5, agen: sidikAgen(s), me: s.profilAgen };
    const teks = Buffer.from(JSON.stringify(isi)).toString('base64url');
    return teks + '.' + tandai(teks, s).toString('base64url');
  }
  const isi = { exp: sekarang + UMUR_HARI * 864e5 };
  if (dev && s.pinDev) Object.assign(isi, { dev: sidikDev(s), devExp: devExp > sekarang ? devExp : sekarang + UMUR_DEV_JAM * 36e5 });
  if (me && meSidik) Object.assign(isi, { me: String(me), meSidik: String(meSidik) });
  const teks = Buffer.from(JSON.stringify(isi)).toString('base64url');
  return teks + '.' + tandai(teks, s).toString('base64url');
}

/* Isi sesi yang tanda tangannya sah dan belum kedaluwarsa, atau null. */
function isiSesi(token, sekarang = Date.now()) {
  const s = setelan();
  if (kurangnya().length) return null;
  const bagian = String(token || '').split('.');
  if (bagian.length !== 2 || !bagian[0] || !bagian[1]) return null;
  const [isi, tanda] = bagian;
  const harus = tandai(isi, s);
  const dapat = Buffer.from(tanda, 'base64url');
  if (dapat.length !== harus.length || !crypto.timingSafeEqual(dapat, harus)) return null;
  try {
    const o = JSON.parse(Buffer.from(isi, 'base64url').toString('utf8'));
    return typeof o.exp === 'number' && o.exp > sekarang ? o : null;
  } catch (e) {
    return null;
  }
}
const sah = (token, sekarang = Date.now()) => !!isiSesi(token, sekarang);

/* Sesi Dev: sah, belum lewat UMUR_DEV_JAM, dan DEV_PIN-nya masih yang sama. */
function dev(token, sekarang = Date.now()) {
  const o = isiSesi(token, sekarang);
  const s = setelan();
  return !!(o && s.pinDev && o.dev === sidikDev(s) && typeof o.devExp === 'number' && o.devExp > sekarang);
}
/* Kapan mode Dev sesi ini berakhir (ms), atau 0. */
function akhirDev(token, sekarang = Date.now()) {
  return dev(token, sekarang) ? isiSesi(token, sekarang).devExp : 0;
}
/* Sesi agen AI yang masih berlaku: profilnya, atau ''. */
function agen(token, sekarang = Date.now()) {
  const o = isiSesi(token, sekarang);
  const s = setelan();
  return o && o.agen && agenAktif(s) && o.agen === sidikAgen(s) && o.me === s.profilAgen ? s.profilAgen : '';
}

function bacaCookie(req, nama = NAMA_COOKIE) {
  const mentah = String((req.headers && req.headers.cookie) || '');
  for (const bagian of mentah.split(';')) {
    const i = bagian.indexOf('=');
    if (i > 0 && bagian.slice(0, i).trim() === nama) return bagian.slice(i + 1).trim();
  }
  return '';
}

/* Secure hanya saat permintaannya memang lewat HTTPS. Kalau selalu dipasang, server
   lokal yang dibuka lewat IP jaringan (http://192.168.x.x) tak akan pernah bisa masuk. */
function atribut(aman) {
  return '; Path=/; HttpOnly; SameSite=Strict' + (aman ? '; Secure' : '');
}
function cookieMasuk(token, aman) {
  return `${NAMA_COOKIE}=${token}${atribut(aman)}; Max-Age=${UMUR_HARI * 86400}`;
}
function cookieKeluar(aman) {
  return `${NAMA_COOKIE}=${atribut(aman)}; Max-Age=0`;
}

module.exports = {
  NAMA_COOKIE, UMUR_HARI, UMUR_DEV_JAM, UMUR_AGEN_JAM, PANJANG_RAHASIA_MIN,
  setelanAda, setelanAgen, kurangnya, cocokPin, cocokPinDev, cocokKunciAgen, terbitkan, isiSesi, sah, dev, akhirDev, agen, sidikMe,
  bacaCookie, cookieMasuk, cookieKeluar,
};
