/* Unduh PDF catatan (2.58.0), tanpa pustaka luar: catatan digambar ulang di #cetak-catatan, lalu
   jendela cetak browser dibuka dan pengguna memilih "Simpan sebagai PDF". Tes ini menjaga nama
   berkasnya, tombolnya di samping .txt, dan CSS cetaknya: hanya catatan itu yang tercetak, dan
   tetap hitam di atas putih walau tema gelap aktif. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const I = require('../public/inti');

const baca = f => fs.readFileSync(path.join(__dirname, '..', 'public', f), 'utf8');
const APP = baca('app.js');
const CSS = baca('app.css').replace(/\/\*[\s\S]*?\*\//g, '');
const blokCetak = () => {
  const m = /(?:^|\n)#cetak-catatan \{([^}]*)\}/.exec(CSS);
  assert.ok(m, 'aturan #cetak-catatan ada');
  return m[1];
};

test('namaBerkas: dari judul, tanpa karakter terlarang, ujungnya dirapikan, paling banyak 80 karakter', () => {
  assert.equal(I.namaBerkas('Notulen: rapat 3/11 "final"?'), 'Notulen rapat 3 11 final');
  assert.equal(I.namaBerkas('a\\b|c<d>e*f'), 'a b c d e f');
  assert.equal(I.namaBerkas('  ..rahasia..  '), 'rahasia', 'tanpa titik di depan (tersembunyi) atau di ujung');
  assert.equal(I.namaBerkas('Baris\tsatu\nbaris dua'), 'Baris satu baris dua');
  assert.equal(I.namaBerkas('Rencana Q4 → TO 3 · UTBK'), 'Rencana Q4 → TO 3 · UTBK', 'huruf di luar ASCII tetap');
  assert.equal(I.namaBerkas('', 'catatan'), 'catatan');
  assert.equal(I.namaBerkas('???', 'note'), 'note');
  assert.equal(I.namaBerkas(null), 'catatan');
  assert.equal(I.namaBerkas('a'.repeat(79) + '😀' + 'b'), 'a'.repeat(79) + '😀', 'emoji di karakter ke-80 tak terbelah');
  assert.equal(I.namaBerkas('x'.repeat(79) + ' y'), 'x'.repeat(79), 'spasi di ujung potongan dibuang');
});

test('app.js: tombol Unduh PDF tepat sesudah .txt, untuk catatan yang sedang dibuka', () => {
  const aksi = APP.slice(APP.indexOf('const aksiCatatan'), APP.indexOf('const warnaCatatanHtml'));
  const txt = aksi.indexOf('data-aksi="catatan-unduh"');
  const pdf = aksi.indexOf('data-aksi="catatan-pdf"');
  assert.ok(txt > 0 && pdf > txt, 'tombol PDF sesudah tombol .txt');
  assert.ok(!aksi.slice(txt + 1, pdf).includes('data-aksi='), 'bersebelahan');
  assert.match(aksi, /data-aksi="catatan-pdf" title="\$\{tr\('Unduh PDF'\)\}" aria-label="\$\{tr\('Unduh catatan sebagai PDF'\)\}"/);
  // Ketikan yang belum tersimpan ikut, dan catatan baru yang masih kosong tak diunduh (sama dengan .txt).
  assert.match(APP, /case 'catatan-pdf': \{\s*simpanCatatanTertunda\(\);\s*const n = catatanAktif\(\);\s*if \(n && n\.id !== '__baru'\) unduhPdfCatatan\(n\);/);
});

test('app.js: PDF berisi judul, folder, waktu diperbarui, dan isi seperti kartu catatan; nama berkas sama dengan .txt', () => {
  const fn = APP.slice(APP.indexOf('function htmlCetakCatatan('), APP.indexOf('/* ---------- Foto profil'));
  assert.ok(fn.length > 0);
  assert.match(fn, /n\.title \? `<h1 class="cetak-judul">\$\{esc\(n\.title\)\}<\/h1>`/);
  assert.match(fn, /tr\('Folder'\)\}: \$\{esc\(n\.folder \|\| tr\(I\.FOLDER_UMUM\)\)\}/);
  assert.match(fn, /tr\('Diperbarui \{waktu\}', \{ waktu: esc\(fmtWaktuPanjang\(n\.updatedAt\)\) \}\)/);
  assert.match(fn, /renderIsiCatatan\(n\.body, 0, formatCetak\)/, 'semua baris, dengan format dan tautan');
  assert.match(APP, /const formatCetak = s => formatPesan\(s\)/, 'tautan tetap tautan (pratinjau kartu membuangnya)');
  // Nama PDF = judul halaman saat dicetak; sama dengan nama .txt.
  assert.match(APP, /a\.download = `\$\{namaBerkasCatatan\(n\)\}\.txt`/);
  assert.match(fn, /const nama = namaBerkasCatatan\(n\);/);
  assert.match(fn, /document\.title = nama;/);
  assert.match(fn, /window\.print\(\)/);
  assert.match(APP, /if \(!beresCetak\) document\.title =/, 'render tak menimpa judul selama mencetak');
  assert.doesNotMatch(fn, /window\.open|<script|https?:\/\//, 'tanpa jendela baru atau pustaka luar');
});

test('app.css: saat mencetak hanya #cetak-catatan yang tampil, utuh di beberapa halaman; di layar tak pernah', () => {
  assert.match(blokCetak(), /^\s*display: none;/);
  const awal = CSS.indexOf('@media print {');
  assert.ok(awal >= 0, 'ada @media print');
  const cetak = CSS.slice(awal, CSS.indexOf('\n}', awal));
  assert.match(cetak, /html\.cetak-catatan body > :not\(#cetak-catatan\) \{ display: none !important; \}/);
  assert.match(cetak, /html\.cetak-catatan #cetak-catatan \{ display: block; \}/);
  assert.match(cetak, /height: auto !important; min-height: 0 !important; overflow: visible !important; background: #fff !important/,
    'catatan panjang tak terpotong di halaman pertama; tanpa latar gelap');
  // :root[data-tema="gelap"] { color-scheme: dark } lebih spesifik; tanpa !important margin PDF ikut gelap.
  assert.match(cetak, /html\.cetak-catatan, html\.cetak-catatan body \{[^}]*color-scheme: light !important;/);
});

test('PDF terbaca di tema gelap: setiap token warna isi catatan diganti hitam-putih di #cetak-catatan', () => {
  const blok = blokCetak();
  const diganti = new Set([...blok.matchAll(/(--[a-z0-9-]+):/g)].map(m => m[1]));
  const KELAS = /\.(ctt-baris|ctt-teks|ctt-titik|ctt-cek|ctt-nomor|ctt-rujuk-task|ctt-tabel-kecil|ctt-garis|km-sebut|cetak-[a-z]+)\b/;
  const bukanWarna = new Set(['--font', '--skala-huruf', '--tingkat', '--radius']);
  const kurang = new Set();
  let diperiksa = 0;
  for (const m of CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim();
    // Hover tak berlaku di kertas; .ctt-baca dan daftar pilih sebutan tak ikut tercetak.
    if (!KELAS.test(sel) || /:hover|\.ctt-baca|-pilih\b/.test(sel)) continue;
    diperiksa++;
    for (const v of m[2].matchAll(/var\((--[a-z0-9-]+)/g)) if (!bukanWarna.has(v[1]) && !diganti.has(v[1])) kurang.add(`${v[1]} di ${sel}`);
  }
  assert.ok(diperiksa > 20, 'aturan isi catatan terbaca');
  assert.deepEqual([...kurang], []);
  for (const [t, w] of [['--tinta', '#000'], ['--muka', '#fff'], ['--navy', '#000']]) assert.match(blok, new RegExp(`${t}: ${w};`));
  assert.match(blok, /color-scheme: light; color: #000; background: #fff;/);
  // Checklist tercentang: tanda centang hitam di kotak putih, tercetak walau "Grafik latar" mati.
  assert.match(CSS, /#cetak-catatan \.ctt-cek \{[^}]*background: #fff; color: #000; \}/);
  assert.match(CSS, /#cetak-catatan \.ctt-titik \{[^}]*background: none; border: 3px solid/);
});
