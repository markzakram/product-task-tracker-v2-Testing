/* Catatan Saya (0.11.0): checklist, warna, dan baris catatan yang dijadikan task. */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');

const data = () => ({ tasks: [], projects: [], log: [], packages: [], dashboards: [], links: [], notes: [] });

test('checklist: dihitung, dicentang per baris, baris lain tak berubah', () => {
  const isi = '# Rapat\n[x] Cek bottleneck\n- [ ] Siapkan rilis\n[ ]tanpa spasi\nbukan [ ] checklist\n  [X] menjorok';
  assert.deepEqual(I.hitungChecklist(isi), { selesai: 2, total: 4 });
  const sesudah = I.centangBaris(isi, 2);
  assert.equal(sesudah.split('\n')[2], '- [x] Siapkan rilis');
  assert.equal(I.centangBaris(sesudah, 2), isi, 'dicentang dua kali kembali seperti semula');
  assert.equal(I.centangBaris(isi, 5).split('\n')[5], '  [ ] menjorok');
  assert.equal(I.centangBaris(isi, 0), isi, 'baris bukan checklist tak berubah');
  assert.equal(I.centangBaris(isi, 99), isi);
  assert.deepEqual(I.hitungChecklist(''), { selesai: 0, total: 0 });
});

test('baris catatan → judul task: penanda dan format dibuang; nomor task ditempel sekali', () => {
  const isi = '[ ] Siapkan **rilis** TO 3\n- Kabari [Marsel](https://x.id/a) soal `UTBK`\n## Judul bagian\n[x] Sudah → PRD-120';
  assert.equal(I.teksBarisCatatan(isi, 0), 'Siapkan rilis TO 3');
  assert.equal(I.teksBarisCatatan(isi, 1), 'Kabari Marsel soal UTBK');
  assert.equal(I.teksBarisCatatan(isi, 2), 'Judul bagian');
  assert.equal(I.teksBarisCatatan(isi, 3), 'Sudah', 'nomor task lama tak ikut jadi judul');
  assert.equal(I.teksBarisCatatan(isi, 9), '');
  const ditandai = I.tandaiBarisTask(isi, 0, 'PRD-131');
  assert.equal(ditandai.split('\n')[0], '[ ] Siapkan **rilis** TO 3 → PRD-131');
  assert.equal(I.tandaiBarisTask(ditandai, 0, 'PRD-131'), ditandai, 'tak ditempel dua kali');
  assert.equal(I.hitungChecklist(ditandai).total, 2, 'tetap checklist sesudah ditandai');
});

test('warna catatan: hanya pemiliknya, warna tak dikenal jadi tanpa warna', () => {
  const d = data();
  const n = I.simpanCatatan(d, 'kiki', { title: 'Ide', body: 'isi' }, '', 1);
  assert.equal(I.warnaiCatatan(d, 'kiki', n.id, 'hijau').warna, 'hijau');
  assert.equal(I.warnaiCatatan(d, 'kiki', n.id, 'emas').warna, '');
  assert.throws(() => I.warnaiCatatan(d, 'alya', n.id, 'biru'), /bukan milik/);
  I.simpanCatatan(d, 'kiki', { title: 'Ide 2', body: 'isi', folder: '' }, n.id, 2);
  I.warnaiCatatan(d, 'kiki', n.id, 'ungu');
  I.simpanCatatan(d, 'kiki', { title: 'Ide 3', body: 'isi', folder: '' }, n.id, 3);
  assert.equal(d.notes[0].warna, 'ungu', 'menyimpan isi tak menghapus warna');
});
