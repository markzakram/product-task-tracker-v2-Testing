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
   ========================================================================== */

const crypto = require('crypto');

const NAMA_COOKIE = 'sesi';
const UMUR_HARI = 30;
const PANJANG_RAHASIA_MIN = 32;

function setelan() {
  return {
    pin: String(process.env.ACCESS_PIN || '').trim(),
    rahasia: String(process.env.SESSION_SECRET || '').trim(),
  };
}

/* Untuk pemeriksaan kesehatan: ada atau tidak, tanpa nilainya. */
function setelanAda() {
  const { pin, rahasia } = setelan();
  return { pin: !!pin, rahasiaSesi: rahasia.length >= PANJANG_RAHASIA_MIN };
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
function cocokPin(masukan) {
  const { pin } = setelan();
  if (!pin || masukan === undefined || masukan === null) return false;
  const a = crypto.createHash('sha256').update(String(masukan).trim()).digest();
  const b = crypto.createHash('sha256').update(pin).digest();
  return crypto.timingSafeEqual(a, b);
}

function terbitkan(sekarang = Date.now()) {
  const s = setelan();
  const isi = Buffer.from(JSON.stringify({ exp: sekarang + UMUR_HARI * 864e5 })).toString('base64url');
  return isi + '.' + tandai(isi, s).toString('base64url');
}

function sah(token, sekarang = Date.now()) {
  const s = setelan();
  if (kurangnya().length) return false;
  const bagian = String(token || '').split('.');
  if (bagian.length !== 2 || !bagian[0] || !bagian[1]) return false;
  const [isi, tanda] = bagian;
  const harus = tandai(isi, s);
  const dapat = Buffer.from(tanda, 'base64url');
  if (dapat.length !== harus.length || !crypto.timingSafeEqual(dapat, harus)) return false;
  try {
    const o = JSON.parse(Buffer.from(isi, 'base64url').toString('utf8'));
    return typeof o.exp === 'number' && o.exp > sekarang;
  } catch (e) {
    return false;
  }
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
  NAMA_COOKIE, UMUR_HARI, PANJANG_RAHASIA_MIN,
  setelanAda, kurangnya, cocokPin, terbitkan, sah, bacaCookie, cookieMasuk, cookieKeluar,
};
