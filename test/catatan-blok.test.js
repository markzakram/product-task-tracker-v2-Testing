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

test('pindah & gandakan baris (2.34.0): rentang dipindah utuh, ujung ditolak, salinan tabel tak berbagi isi', () => {
  const blok = () => I.blokCatatan('# Judul\n- satu\n- dua\n[ ] tugas\n---\n| a | b |\n| c | d |\npenutup');
  const teks = b => I.teksBlok(b).split('\n');
  // Seret "- satu" dan "- dua" ke paling bawah, lalu ke paling atas.
  const b1 = blok();
  assert.equal(I.pindahBlokKe(b1, 1, 2, b1.length), 5);
  assert.deepEqual(teks(b1).slice(-3), ['penutup', '- satu', '- dua']);
  assert.equal(I.pindahBlokKe(b1, 5, 6, 0), 0);
  assert.deepEqual(teks(b1).slice(0, 3), ['- satu', '- dua', '# Judul']);
  // Tempat yang sama (di dalam atau tepat di tepi rentang): tak berubah.
  const b2 = blok();
  const awal = I.teksBlok(b2);
  for (const s of [1, 2, 3]) assert.equal(I.pindahBlokKe(b2, 1, 2, s), 1);
  assert.equal(I.teksBlok(b2), awal);
  // Naik/turun satu: -1 di ujung, tabel ikut sebagai satu baris.
  const b3 = blok();
  assert.equal(I.geserBlok(b3, 0, 0, -1), -1);
  assert.equal(I.geserBlok(b3, b3.length - 1, b3.length - 1, 1), -1);
  assert.equal(I.geserBlok(b3, 5, 5, -1), 4);
  assert.equal(b3[4].jenis, 'tabel');
  assert.equal(b3[5].jenis, 'hr');
  // Gandakan: salinan tepat di bawah; isi tabel salinan berdiri sendiri.
  const b4 = blok();
  assert.equal(I.duplikatBlok(b4, 3, 5), 6);
  assert.deepEqual(b4.slice(6, 9).map(b => b.jenis), ['todo', 'hr', 'tabel']);
  b4[8].sel[0][0] = 'ubah';
  assert.equal(b4[5].sel[0][0], 'a');
});
