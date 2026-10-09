/* Editor blok Catatan Saya (0.14.0): isi catatan tetap teks biasa; editornya bekerja per blok. */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');

const CONTOH = [
  '# Rapat produksi',
  'Teks biasa dengan **tebal** dan [tautan](https://contoh.id)',
  '## Agenda',
  '- butir satu',
  '  - butir dalam',
  '* butir bintang',
  '1. pertama',
  '2. kedua',
  '  1. dalam',
  '3. ketiga',
  '[ ] belum',
  '[x] sudah → PRD-1201',
  '- [ ] gaya lama',
  '> kutipan',
  '---',
  '| Item | PIC | Tenggat |',
  '| --- | --- | --- |',
  '| TO 3 | Kiki | 12 Okt |',
  '| Latsol \\| bonus |  |  |',
  '',
  '### Penutup',
].join('\n');

test('blokCatatan: tiap jenis blok dikenali', () => {
  const b = I.blokCatatan(CONTOH);
  assert.deepEqual(b.map(x => x.jenis), ['h1', 'p', 'h2', 'li', 'li', 'li', 'ol', 'ol', 'ol', 'ol', 'todo', 'todo', 'todo', 'kutip', 'hr', 'tabel', 'p', 'h3']);
  assert.equal(b[4].tingkat, 1);
  assert.equal(b[5].tanda, '*');
  assert.deepEqual([b[10].cek, b[11].cek, b[12].titik], [false, true, true]);
  assert.equal(b[11].teks, 'sudah → PRD-1201');
  const t = b[15];
  assert.equal(t.kepala, true);
  assert.deepEqual(t.sel, [['Item', 'PIC', 'Tenggat'], ['TO 3', 'Kiki', '12 Okt'], ['Latsol | bonus', '', '']]);
});

test('teksBlok: teks yang ditulis editor kembali persis; nomor mengikuti urutan', () => {
  assert.equal(I.teksBlok(I.blokCatatan(CONTOH)), CONTOH);
  const b = I.blokCatatan(CONTOH);
  assert.deepEqual(I.nomorDaftar(b).slice(6, 10), [1, 2, 1, 3]);
  // Butir disisipkan di tengah: nomor sesudahnya ikut bergeser.
  b.splice(7, 0, { jenis: 'ol', teks: 'sisipan', tingkat: 0 });
  assert.match(I.teksBlok(b), /1\. pertama\n2\. sisipan\n3\. kedua\n {2}1\. dalam\n4\. ketiga/);
  // Nomor awal yang tertulis dipakai (paragraf "2020. …" tak berubah jadi "1.").
  assert.equal(I.teksBlok(I.blokCatatan('2020. Rencana tahunan')), '2020. Rencana tahunan');
});

test('teksBlok: tabel dirapikan, sel kosong dan | di dalam sel aman; baris awal tiap blok', () => {
  const b = [
    { jenis: 'p', teks: 'Judul' },
    { jenis: 'tabel', kepala: true, sel: [['A', 'B'], ['x|y', ''], ['z']] },
    { jenis: 'todo', cek: false, teks: 'lanjut' },
  ];
  const { teks, baris } = I.teksBlokDanBaris(b);
  assert.equal(teks, 'Judul\n| A | B |\n| --- | --- |\n| x\\|y |  |\n| z |  |\n[ ] lanjut');
  assert.deepEqual(baris, [0, 1, 5]);
  assert.deepEqual(I.blokCatatan(teks)[1].sel, [['A', 'B'], ['x|y', ''], ['z', '']]);
  // Teks satu blok tak boleh memecah baris.
  assert.equal(I.teksBlok([{ jenis: 'p', teks: 'a\nb' }]), 'a b');
});

test('blokCatatan: teks lama tetap terbaca (butir kosong, tabel tanpa kepala, checklist tanpa spasi)', () => {
  assert.deepEqual(I.blokCatatan('-').map(x => [x.jenis, x.teks]), [['li', '']]);
  assert.deepEqual(I.blokCatatan('[ ]').map(x => [x.jenis, x.cek, x.teks]), [['todo', false, '']]);
  assert.deepEqual(I.blokCatatan('[x]beres').map(x => [x.jenis, x.cek, x.teks]), [['todo', true, 'beres']]);
  assert.deepEqual(I.blokCatatan('|a|b|\n|c|d|')[0], { jenis: 'tabel', kepala: false, sel: [['a', 'b'], ['c', 'd']] });
  assert.deepEqual(I.blokCatatan('#tagar bukan judul\n--\n**tebal** di awal').map(x => x.jenis), ['p', 'p', 'p']);
  assert.deepEqual(I.blokCatatan(''), [{ jenis: 'p', teks: '' }]);
});

test('teksBarisCatatan: baris tabel jadi isi selnya; garis dan pemisah jadi kosong; kutipan tanpa penanda', () => {
  const isi = '| Item | PIC |\n| --- | --- |\n| **TO 3** | Kiki |\n---\n> catat ini\n1) langkah';
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(n => I.teksBarisCatatan(isi, n)), ['Item · PIC', '', 'TO 3 · Kiki', '', 'catat ini', 'langkah']);
  assert.equal(I.hitungChecklist('[ ] a\n| [ ] bukan |\n[x] b').total, 2);
});
