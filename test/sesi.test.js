const test = require('node:test');
const assert = require('node:assert/strict');
const sesi = require('../api/_sesi');

const PIN = '246810';
const RAHASIA = 'r'.repeat(40);
const HARI = 864e5;

test.beforeEach(() => {
  process.env.ACCESS_PIN = PIN;
  process.env.SESSION_SECRET = RAHASIA;
});

test('PIN benar cocok, termasuk dengan spasi di tepinya', () => {
  assert.equal(sesi.cocokPin(PIN), true);
  assert.equal(sesi.cocokPin(` ${PIN} `), true);
});

test('PIN salah, kosong, dan null tidak cocok', () => {
  for (const salah of ['246811', '24681', '', null, undefined]) {
    assert.equal(sesi.cocokPin(salah), false, `seharusnya ditolak: ${salah}`);
  }
});

test('tanpa ACCESS_PIN tak ada PIN yang cocok — termasuk string kosong', () => {
  process.env.ACCESS_PIN = '';
  assert.equal(sesi.cocokPin(''), false);
  assert.equal(sesi.cocokPin(PIN), false);
});

test('cookie yang diterbitkan sah sampai kedaluwarsa', () => {
  const t = sesi.terbitkan();
  assert.equal(sesi.sah(t), true);
  assert.equal(sesi.sah(t, Date.now() + (sesi.UMUR_HARI - 1) * HARI), true);
  assert.equal(sesi.sah(t, Date.now() + (sesi.UMUR_HARI + 1) * HARI), false);
});

test('cookie yang diubah satu karakter tak sah', () => {
  const t = sesi.terbitkan();
  const i = t.indexOf('.') + 3;
  const ubah = t.slice(0, i) + (t[i] === 'A' ? 'B' : 'A') + t.slice(i + 1);
  assert.equal(sesi.sah(ubah), false);
  // Isi diganti (misalnya exp dipanjangkan) tanpa tanda baru juga ditolak.
  const isiPalsu = Buffer.from(JSON.stringify({ exp: Date.now() + 999 * HARI })).toString('base64url');
  assert.equal(sesi.sah(isiPalsu + '.' + t.split('.')[1]), false);
});

test('mengganti ACCESS_PIN membatalkan semua sesi lama', () => {
  const t = sesi.terbitkan();
  process.env.ACCESS_PIN = '999999';
  assert.equal(sesi.sah(t), false);
});

test('mengganti SESSION_SECRET membatalkan semua sesi lama', () => {
  const t = sesi.terbitkan();
  process.env.SESSION_SECRET = 'x'.repeat(40);
  assert.equal(sesi.sah(t), false);
});

test('cookie tidak memuat PIN', () => {
  const t = sesi.terbitkan();
  assert.ok(!t.includes(PIN));
  assert.ok(!Buffer.from(t.split('.')[0], 'base64url').toString().includes(PIN));
});

test('token rusak ditolak tanpa melempar galat', () => {
  for (const rusak of ['', 'a', '.', 'a.', '.b', 'a.b.c', 'xx.yy', null, undefined, '%%%.***']) {
    assert.equal(sesi.sah(rusak), false, `seharusnya ditolak: ${rusak}`);
  }
});

test('SESSION_SECRET pendek dianggap belum disetel, dan sesi apa pun ditolak', () => {
  const t = sesi.terbitkan();
  process.env.SESSION_SECRET = 'pendek';
  assert.equal(sesi.setelanAda().rahasiaSesi, false);
  assert.match(sesi.kurangnya().join(' '), /SESSION_SECRET terlalu pendek/);
  assert.equal(sesi.sah(t), false);
});

test('kurangnya() kosong saat semua sudah disetel, dan menyebut yang hilang', () => {
  assert.deepEqual(sesi.kurangnya(), []);
  delete process.env.ACCESS_PIN;
  delete process.env.SESSION_SECRET;
  const kurang = sesi.kurangnya().join(' ');
  assert.match(kurang, /ACCESS_PIN belum diisi/);
  assert.match(kurang, /SESSION_SECRET belum diisi/);
});

test('bacaCookie menemukan sesi di antara cookie lain', () => {
  const req = { headers: { cookie: 'a=1; sesiku=salah; sesi=abc.def; z=9' } };
  assert.equal(sesi.bacaCookie(req), 'abc.def');
  assert.equal(sesi.bacaCookie({ headers: {} }), '');
});

test('cookie masuk: HttpOnly dan SameSite=Strict selalu, Secure hanya lewat HTTPS', () => {
  const lewatHttps = sesi.cookieMasuk('t.t', true);
  const lokal = sesi.cookieMasuk('t.t', false);
  for (const c of [lewatHttps, lokal]) {
    assert.match(c, /HttpOnly/);
    assert.match(c, /SameSite=Strict/);
    assert.match(c, /Path=\//);
  }
  assert.match(lewatHttps, /Secure/);
  assert.doesNotMatch(lokal, /Secure/);
  assert.match(sesi.cookieKeluar(true), /Max-Age=0/);
});
