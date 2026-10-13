/* Bahasa EN/ID (2.28.0): teks yang dibungkus tr() di app.js punya terjemahan Inggris di
   public/bahasa.js dengan {isian} yang sama, dan yang belum diterjemahkan tetap tampil apa adanya
   (bahasa Indonesia), supaya terjemahan bisa ditambah bertahap. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const B = require('../public/bahasa');

const APP = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
/* Semua tr('…') dengan teks tetap (kutip tunggal) di app.js. */
const DIPAKAI = [...APP.matchAll(/\btr\('((?:[^'\\]|\\.)*)'/g)].map(m => m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
const isian = s => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();

test('setiap teks tr() di app.js punya terjemahan Inggris', () => {
  assert.ok(DIPAKAI.length > 50, 'tr() dipakai');
  const kurang = [...new Set(DIPAKAI.filter(s => !Object.prototype.hasOwnProperty.call(B.EN, s)))];
  assert.deepEqual(kurang, []);
});

test('{isian} di terjemahan sama dengan teks aslinya', () => {
  for (const [id, en] of Object.entries(B.EN)) {
    assert.deepEqual(isian(en), isian(id), `"${id}" → "${en}"`);
    assert.ok(String(en).trim(), `terjemahan "${id}" kosong`);
  }
});

test('tr(): Indonesia apa adanya; English memakai terjemahan, yang belum ada tetap Indonesia', () => {
  try {
    B.atur('id');
    assert.equal(B.tr('Hari Ini'), 'Hari Ini');
    assert.equal(B.tr('{n} jam lalu', { n: 3 }), '3 jam lalu');
    assert.equal(B.lokal(), 'id-ID');
    B.atur('en');
    assert.equal(B.tr('Hari Ini'), 'Today');
    assert.equal(B.tr('{n} jam lalu', { n: 3 }), '3 h ago');
    assert.equal(B.tr('Teks yang belum diterjemahkan'), 'Teks yang belum diterjemahkan');
    assert.equal(B.lokal(), 'en-GB');
    assert.equal(B.atur('fr'), 'id', 'bahasa lain = Indonesia');
  } finally { B.atur('id'); }
});
