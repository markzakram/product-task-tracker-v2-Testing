/* Catatan & Link pribadi di beberapa tab (2.46.1). Keluhan user: catatan yang sudah dimasukkan
   di data real hilang. Penyebabnya: tiap tab menulis ulang salinan catatannya setiap kali ada
   perubahan data real, jadi tab yang lama terbuka menimpa catatan baru dari tab lain. Kini
   sebelum menulis, isi tab digabung tiga arah dengan yang tersimpan (Inti.gabungPribadi). */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');

const n = (id, title, updatedAt = 1) => ({ id, user: 'ali', title, body: '', folder: '', pin: false, createdAt: 1, updatedAt });
const ids = xs => xs.map(x => x.id);

test('tab lama tak lagi menimpa catatan baru dari tab lain', () => {
  const asal = { links: [], notes: [n('a', 'A')] };          // yang dibaca kedua tab saat dibuka
  const tabB = { links: [], notes: [n('b', 'Baru di B', 5), n('a', 'A')] };
  const tersimpan = I.gabungPribadi(asal, tabB, asal);        // tab B menulis lebih dulu
  assert.deepEqual(ids(tersimpan.notes), ['b', 'a']);
  // Tab A (salinan lama) lalu menyimpan perubahannya sendiri: catatan B tetap ada.
  const tabA = { links: [], notes: [n('a', 'A diubah di A', 6)] };
  const hasil = I.gabungPribadi(asal, tabA, tersimpan);
  assert.deepEqual(hasil.notes.map(x => [x.id, x.title]), [['b', 'Baru di B'], ['a', 'A diubah di A']]);
});

test('hapus di satu tab tetap terhapus; yang diubah di tab lain menang atas hapus', () => {
  const asal = { links: [], notes: [n('a', 'A'), n('b', 'B')] };
  // Tab ini menghapus a; tersimpan tak berubah sejak dibaca → a ikut terhapus.
  assert.deepEqual(ids(I.gabungPribadi(asal, { links: [], notes: [n('b', 'B')] }, asal).notes), ['b']);
  // Tab lain sempat mengubah a: perubahannya tak hilang karena dihapus di sini dari salinan lama.
  const kini = { links: [], notes: [n('a', 'A diubah', 9), n('b', 'B')] };
  assert.deepEqual(I.gabungPribadi(asal, { links: [], notes: [n('b', 'B')] }, kini).notes.map(x => x.title), ['B', 'A diubah']);
  // Tab lain menghapus b, tab ini tak mengubahnya → b terhapus; catatan baru tab ini tetap.
  const kini2 = { links: [], notes: [n('a', 'A')] };
  const saya = { links: [], notes: [n('c', 'Baru', 3), n('a', 'A'), n('b', 'B')] };
  assert.deepEqual(ids(I.gabungPribadi(asal, saya, kini2).notes), ['c', 'a']);
});

test('diubah di dua tab: yang paling baru menang; Link Saya ikut digabung', () => {
  const asal = { links: [{ id: 'l1', user: 'ali', label: 'Repo', url: 'https://x', updatedAt: 1 }], notes: [n('a', 'A')] };
  const saya = { links: asal.links, notes: [n('a', 'A versi tab ini', 7)] };
  const kini = { links: [...asal.links, { id: 'l2', user: 'ali', label: 'Docs', url: 'https://y', updatedAt: 2 }], notes: [n('a', 'A versi tab lain', 8)] };
  const g = I.gabungPribadi(asal, saya, kini);
  assert.equal(g.notes[0].title, 'A versi tab lain');
  assert.deepEqual(ids(g.links).sort(), ['l1', 'l2']);
  // Tanpa salinan asal (pertama kali): gabungan semuanya, tak ada yang hilang.
  assert.deepEqual(ids(I.gabungPribadi(null, { notes: [n('x', 'X')] }, { notes: [n('y', 'Y')] }).notes).sort(), ['x', 'y']);
});

test('app.js: salinan cepat data real tak lagi menulis data pribadi; ada pemulihan dari riwayat versi', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '../public/app.js'), 'utf8');
  const cache = src.slice(src.indexOf('function simpanCacheReal()'), src.indexOf('function bacaPribadi()'));
  assert.ok(cache.length > 0 && !cache.includes("simpan('pribadi_real'"), 'simpanCacheReal tak menulis pribadi_real');
  assert.match(src, /addEventListener\('storage'/);
  assert.match(src, /function catatanYatim\(\)/);
});
