/* Berkas statis: index.html memuat CSS & JS dengan ?v= = versi package.json. Tanpa itu, browser
   atau proxy kantor bisa memakai inti.js lama bersama app.js baru, dan aplikasi berhenti di
   "Memuat data…" (terjadi saat 0.11.0 dirilis). Setiap menaikkan versi, naikkan juga ?v=. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('index.html memuat berkas statis dengan ?v= sama dengan versi package.json', () => {
  const versi = require('../package.json').version;
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  const rujukan = [...html.matchAll(/(?:src|href)="(\/[^"?]+\.(?:js|css))(\?[^"]*)?"/g)].map(m => ({ berkas: m[1], kueri: m[2] || '' }));
  assert.deepEqual(rujukan.map(r => r.berkas).sort(), ['/app.css', '/app.js', '/inti.js', '/panduan.js']);
  for (const r of rujukan) assert.equal(r.kueri, `?v=${versi}`, `${r.berkas} harus memakai ?v=${versi}`);
});
