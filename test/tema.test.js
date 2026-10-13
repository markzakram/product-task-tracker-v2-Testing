/* Mode gelap (2.20.0): semua warna lewat token di :root, dan setiap token warna punya nilai
   gelap. Tes ini menjaga supaya warna baru tak tertulis langsung (yang tak ikut gelap) dan token
   baru tak lupa diberi nilai gelapnya. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.css'), 'utf8');
const blok = pembuka => {
  const awal = css.indexOf(pembuka);
  assert.ok(awal >= 0, `blok ${pembuka} ada`);
  return css.slice(awal, css.indexOf('\n}', awal));
};
const token = isi => new Set([...isi.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map(m => m[1]));

test('setiap token warna di :root punya nilai di mode gelap', () => {
  const terang = token(blok(':root {'));
  const gelap = token(blok(':root[data-tema="gelap"] {'));
  const bukanWarna = new Set(['--radius', '--font', '--skala-huruf']);
  const kurang = [...terang].filter(t => !bukanWarna.has(t) && !gelap.has(t));
  assert.deepEqual(kurang, [], 'token tanpa nilai gelap');
  assert.deepEqual([...gelap].filter(t => !terang.has(t)), [], 'token gelap tanpa pasangan terang');
});

test('warna tak tertulis langsung di luar token (kecuali yang memang sama di kedua tema)', () => {
  // Di luar dua blok token: putih untuk teks di atas isi pekat, alas logo, alas foto, maska,
  // titik status, warna catatan versi terang (versi gelapnya di blok gelap), dan preset wallpaper
  // (2.21.0; di bawah kabut --kabut-latar yang berganti per tema, jadi tetap terbaca).
  const boleh = new Set(['#fff', '#10151C', '#000', '#1A9E5C']);
  const luar = css.replace(blok(':root {'), '').replace(blok(':root[data-tema="gelap"] {'), '').replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').filter(b => !b.startsWith(':root[data-tema="gelap"]') && !/^\.w-(biru|hijau|merah|ungu) \{/.test(b) && !b.startsWith('#latar['));
  const salah = luar.filter(b => (b.match(/#[0-9A-Fa-f]{3,8}\b/g) || []).some(w => !boleh.has(w)));
  assert.deepEqual(salah, []);
});

test('index.html memasang tema sebelum CSS dimuat, supaya tak berkedip terang', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  const skrip = html.indexOf("setAttribute('data-tema'");
  assert.ok(skrip > 0 && skrip < html.indexOf('/app.css'), 'skrip tema sebelum app.css');
  assert.match(html, /localStorage\.getItem\('pt2_tema'\)/);
});
