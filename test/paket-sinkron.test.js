/* Hasil elaborasi mengikuti rancangan paket (2.59.1, keluhan user: "hasil elaborasi tidak sinkron
   dengan rancangan paket"). Di data real (PKG-015) nama dan jumlah target diubah sesudah dielaborasi;
   judul task dan jumlah batch tetap angka lama, lalu setorannya dihapus dan disetor ulang manual tanpa
   batch, sehingga satu batch terhitung dua kali. Tes ini menjaga: menyunting paket ikut memperbarui
   batch-nya, setor manual pada langkah elaborasi tetap di batch-nya, dan setoran lama tanpa batch
   dihitung bersama batch aslinya. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const I = require('../public/inti');

const HARI = '2026-11-02';
const WAKTU = Date.UTC(2026, 10, 2, 3, 0, 0);
const target = (id, nama, n, kategori = 'Latsol', satuan = 'Paket') => ({ id, urutan: 1, kategori, grup: '', nama, target: n, satuan, awal: 0, catatan: '' });
function siapkan(...items) {
  const d = { ...I.dataKosong(), packages: [], setoran: [] };
  const p = I.paketBaru(d, { namaPaket: 'UKP', platform: ['ASN'] }, 'nynda', WAKTU);
  p.items.push(...items);
  return { d, p };
}
const simpan = (d, p, items, w = WAKTU + 100) => I.simpanPaket(d, p, { namaPaket: p.namaPaket, items: items.map(x => ({ ...x, target: String(x.target) })), links: [] }, 'nynda', w);
const batch = (d, p, item) => I.batchSetoran(I.setoranPaket(d, p).get(item));
const jumlahSetoran = (d, item) => (d.setoran || []).filter(s => s.item === item).map(s => s.jumlah);

test('ganti nama dan jumlah target: judul, keterangan, dan jumlah batch yang belum tayang ikut', () => {
  const { d, p } = siapkan(target('i1', 'Latsol Tingkat A', 5));
  const { tasks } = I.elaborasiPaket(d, p, { items: ['i1'] }, 'nynda', WAKTU, HARI);
  assert.equal(tasks.length, 8);
  assert.equal(tasks[0].title, 'DV1 · Latsol Latsol Tingkat A — 5 Paket');
  tasks[3].title = 'Generate latsol khusus';   // disunting orang: tak disentuh
  tasks[7].detail = 'catatan tim';              // keterangan langkah terakhir disunting: tetap ikut batch-nya
  const baru = [{ ...target('i1', 'Latsol Tingkat B', 4) }];
  assert.equal(I.rencanaSinkronPaket(d, p, I.bersihItemPaket(baru, 0)).length, 1, 'pratinjau di browser');
  simpan(d, p, baru);
  assert.deepEqual(tasks.filter((_, i) => i !== 3).map(t => t.title.replace(/^\S+ · /, '')), Array(7).fill('Latsol Latsol Tingkat B — 4 Paket'));
  assert.equal(tasks[3].title, 'Generate latsol khusus');
  assert.ok(tasks[0].detail.includes('Target paket PKG-001 · Latsol · Latsol Tingkat B: 4 Paket.'));
  assert.deepEqual(jumlahSetoran(d, 'i1'), [4, 4, 4, 4], 'konten, input, qc, tayang');
  const h = I.hitungTarget(p.items[0], I.setoranPaket(d, p).get('i1'));
  assert.deepEqual([h.target, h.digarap, I.sisaTerbuka(p.items[0], I.setoranPaket(d, p).get('i1'))], [4, 4, 0]);
  assert.match(d.log[0].detail, /1 batch hasil elaborasi ikut diperbarui/);
});

test('batch yang sudah tayang tak ikut jumlah baru (sisanya terbuka lagi); nama tetap ikut di semua batch', () => {
  const { d, p } = siapkan(target('i1', 'TIU', 5));
  const a = I.elaborasiPaket(d, p, { items: ['i1'] }, 'nynda', WAKTU, HARI).tasks;
  for (const t of a) Object.assign(t, { status: 'Selesai', selesaiAt: WAKTU + 1 });
  simpan(d, p, [target('i1', 'TIU', 6)]);
  assert.deepEqual(jumlahSetoran(d, 'i1'), [5, 5, 5, 5], 'yang sudah tayang tetap 5');
  assert.equal(a[0].title, 'DV1 · Latsol TIU — 5 Paket');
  assert.equal(I.sisaTerbuka(p.items[0], I.setoranPaket(d, p).get('i1')), 1, 'tambahan 1 bisa dielaborasi lagi');
  const b = I.elaborasiPaket(d, p, { items: ['i1'], proyek: d.projects[0].id }, 'nynda', WAKTU + 2, HARI).tasks;
  assert.equal(b[0].title, 'DV1 · Latsol TIU — 1 Paket');
  // Dua batch: jumlahnya tetap, namanya ikut.
  simpan(d, p, [target('i1', 'TIU Dasar', 8)], WAKTU + 200);
  assert.deepEqual([a[0].title, b[0].title], ['DV1 · Latsol TIU Dasar — 5 Paket', 'DV1 · Latsol TIU Dasar — 1 Paket']);
  assert.deepEqual(batch(d, p, 'i1').map(x => x.jumlah).sort(), [1, 5]);
});

test('elaborasi sebagian (lebih dari satu batch) tak mengubah jumlah; target yang dihapus tetap membawa setorannya', () => {
  const { d, p } = siapkan(target('i1', 'TWK', 5), target('i2', 'TKP', 2));
  I.elaborasiPaket(d, p, { items: ['i1', 'i2'], jumlah: { i1: 3 } }, 'nynda', WAKTU, HARI);
  const proyek = d.projects[0].id;
  I.elaborasiPaket(d, p, { items: ['i1'], proyek }, 'nynda', WAKTU + 1, HARI);
  assert.deepEqual(batch(d, p, 'i1').map(x => x.jumlah), [3, 2]);
  simpan(d, p, [target('i1', 'TWK', 4)]);
  assert.deepEqual(batch(d, p, 'i1').map(x => x.jumlah), [3, 2], 'tak ditebak batch mana yang dikurangi');
  assert.equal(jumlahSetoran(d, 'i2').length, 0, 'TKP dihapus dari paket: setorannya ikut hilang, seperti sebelumnya');
});

test('setor manual pada langkah hasil elaborasi: tetap di batch-nya, dan satu batch satu jumlah', () => {
  const { d, p } = siapkan(target('i1', 'Akuntansi Perpajakan', 6, 'Materi', 'Ebook'));
  const t = I.elaborasiPaket(d, p, { items: ['i1'] }, 'nynda', WAKTU, HARI).tasks;
  const tayang = d.setoran.find(s => s.item === 'i1' && s.tahap === 'tayang');
  I.hapusSetoran(d, tayang.id, 'nynda', WAKTU + 1);
  const terakhir = t[t.length - 1];
  I.setorkan(d, terakhir, { paket: p.id, item: 'i1', jumlah: 5, tahap: 'tayang' }, 'nynda', WAKTU + 2);
  const kini = d.setoran.filter(s => s.item === 'i1');
  assert.ok(kini.every(s => s.batch === 'B-' + t[0].id), 'disetor ulang: tetap batch langkah pertamanya');
  assert.deepEqual(kini.map(s => s.jumlah), [5, 5, 5, 5], 'langkah lain di batch itu ikut 5');
  assert.equal(batch(d, p, 'i1').length, 1);
  assert.match(d.log[0].detail, /3 langkah lain di batch ini ikut 5/);
});

test('setoran lama tanpa batch pada langkah elaborasi dihitung sekali (kasus PKG-015), juga bila keterangannya dikosongkan', () => {
  const { d, p } = siapkan(target('i1', 'PPh Badan', 3, 'Materi', 'Ebook'));
  const t = I.elaborasiPaket(d, p, { items: ['i1'] }, 'nynda', WAKTU, HARI).tasks;
  for (const x of t) Object.assign(x, { status: 'Selesai', selesaiAt: WAKTU + 1 });
  // Seperti di data real: setoran dihapus lalu disetor ulang manual (tanpa batch) sebelum 2.59.1.
  d.setoran = d.setoran.filter(s => s.item !== 'i1');
  const dv8 = t.find(x => x.sub === 'DV8'), i4 = t.find(x => x.sub === 'I4');
  d.setoran.push({ id: `st-${dv8.id}-i1`, paket: p.id, item: 'i1', task: dv8.id, jumlah: 3, tahap: 'input', catatan: '' });
  d.setoran.push({ id: `st-${i4.id}-i1`, paket: p.id, item: 'i1', task: i4.id, jumlah: 3, tahap: 'tayang', catatan: '' });
  i4.detail = '';
  const b = batch(d, p, 'i1');
  assert.deepEqual([b.length, b[0].kunci, b[0].jumlah, b[0].capai], [1, 'B-' + t[0].id, 3, 'tayang']);
  const h = I.hitungTarget(p.items[0], I.setoranPaket(d, p).get('i1'));
  assert.deepEqual([h.terpenuhi, h.capaian.input, h.status], [3, 3, 'penuh'], 'dulu: 2 batch, capaian Ter-input 6 dari 3');
  // Task biasa (bukan langkah elaborasi) yang disetor manual tetap batch-nya sendiri.
  const lepas = I.taskBaru(d, { title: 'Materi tambahan', project: d.projects[0].id, sub: 'DV3', pic: 'andika' }, 'nynda', WAKTU + 2, HARI);
  assert.equal(I.batchLangkah(lepas, I.indeks(d)), '');
});

test('app.js: pesan simpan paket menyebut batch hasil elaborasi yang ikut diperbarui', () => {
  const APP = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
  assert.match(APP, /I\.rencanaSinkronPaket\(S\.data, paket, I\.bersihItemPaket\(f\.items, 0\)\)\.length/);
  assert.match(APP, /tr\('Rancangan paket disimpan\. \{n\} batch hasil elaborasi ikut diperbarui\.', \{ n \}\)/);
});
