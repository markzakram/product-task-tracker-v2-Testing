/* Isian target rancangan paket seperti spreadsheet (2.60.0, permintaan user: "pengisian jumlah
   kuantitas paket bisa dengan mudah diisi dengan arrow pada keyboard saja"). ↓/↑ dan Enter pindah
   ke kolom yang sama di baris target lain, Enter tak lagi menyimpan paket tanpa sengaja, dan Ctrl/⌘+D
   menyalin isian baris di atasnya. app.js berjalan di browser, jadi yang dijaga di sini aturannya di
   sumber; perilakunya dicoba di browser saat rilis. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const APP = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
const CSS = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.css'), 'utf8');
const awal = APP.indexOf("const KOLOM_TARGET = ['i-grup', 'i-nama', 'i-awal', 'i-target', 'i-catatan'];");
const bagian = APP.slice(awal, APP.indexOf('// Blok yang sedang diketik menampilkan teks mentah', awal));

test('kolom yang ikut: grup, nama, ada, target, catatan; dropdown Satuan tidak', () => {
  assert.ok(awal > 0, 'KOLOM_TARGET ada');
  assert.ok(!bagian.includes("'i-satuan'"));
  assert.match(bagian, /el\.matches\('form\[data-form="paket"\] \[data-item\] input'\)/, 'hanya isian baris target di form paket');
});

test('↓/↑ dan Enter pindah baris (Shift+Enter naik), lintas kategori, isinya terpilih; Enter tak menyimpan form', () => {
  assert.match(bagian, /const panah = \(e\.key === 'ArrowDown' \|\| e\.key === 'ArrowUp'\) && !e\.shiftKey;/, 'Shift+panah tetap memilih teks');
  assert.match(bagian, /if \(!mod && !e\.altKey && \(panah \|\| e\.key === 'Enter'\)\) \{\s*e\.preventDefault\(\);/, 'preventDefault: Enter tak mengirim form');
  assert.match(bagian, /e\.key === 'ArrowUp' \|\| \(e\.key === 'Enter' && e\.shiftKey\) \? -1 : 1/);
  assert.match(bagian, /\$\$\('\[data-item\]', el\.closest\('form\[data-form="paket"\]'\)\)/, 'semua baris form, bukan hanya kategorinya');
  assert.match(bagian, /tuju\.focus\(\);\s*tuju\.select\(\);/);
});

test('Ctrl/⌘+D menyalin isian baris di atasnya dan menandai form berubah', () => {
  assert.match(bagian, /mod && !e\.altKey && !e\.shiftKey && String\(e\.key\)\.toLowerCase\(\) === 'd'/);
  assert.match(bagian, /el\.value = atas\.value;\s*el\.dispatchEvent\(new Event\('input', \{ bubbles: true \}\)\);/);
  assert.match(APP, /if \(el\.closest\('\[data-form="paket"\]'\)\) \{ S\.pkt\.kotor = true; return; \}/, 'input di form paket = ada perubahan');
});

test('petunjuknya tampil di form, disembunyikan di layar sentuh', () => {
  assert.match(APP, /<p class="hint petunjuk-papan-ketik">\$\{tr\('Tabel target: ↓\/↑ atau Enter pindah baris \(Shift\+Enter naik\), \{pintasan\} menyalin isian baris di atasnya\.'/);
  assert.match(CSS, /@media \(hover: none\) \{ \.petunjuk-papan-ketik \{ display: none; \} \}/);
});
