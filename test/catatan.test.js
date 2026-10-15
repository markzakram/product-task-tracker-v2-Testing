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

test('pilih banyak catatan (2.34.0): pindah folder, hapus sekaligus, lalu Urungkan ke tempat semula', () => {
  const d = data();
  const [a, b, c] = ['A', 'B', 'C'].map((t, i) => I.simpanCatatan(d, 'kiki', { title: t, body: 'isi', folder: 'Rapat' }, '', i + 1));
  const lain = I.simpanCatatan(d, 'alya', { title: 'Punya Alya', body: 'isi' }, '', 9);
  I.sematkanCatatan(d, 'kiki', a.id, true);
  // Pindah folder: sematan dan waktu ubah tetap; "Umum"/"General" = tanpa folder.
  assert.equal(I.pindahFolderCatatan(d, 'kiki', [a.id, b.id, a.id], 'Ide'), 2);
  assert.deepEqual([a.folder, b.folder, c.folder, a.pin, a.updatedAt], ['Ide', 'Ide', 'Rapat', true, 1]);
  I.pindahFolderCatatan(d, 'kiki', [c.id], 'General');
  assert.equal(c.folder, '');
  assert.throws(() => I.pindahFolderCatatan(d, 'kiki', [b.id, lain.id], 'X'), /bukan milik/);
  assert.equal(b.folder, 'Ide', 'ditolak utuh');
  // Hapus sekaligus (urutan semula: lain, c, b, a) lalu pulihkan ke posisi yang sama.
  const urut = () => d.notes.map(n => n.title).join(',');
  const semula = urut();
  assert.throws(() => I.hapusCatatan(d, 'kiki', [a.id, lain.id]), /bukan milik/);
  assert.equal(urut(), semula, 'tak satu pun terhapus');
  const jejak = I.hapusCatatan(d, 'kiki', [a.id, c.id]);
  assert.deepEqual(jejak.map(x => x.catatan.title), ['C', 'A']);
  assert.equal(urut(), 'Punya Alya,B');
  assert.equal(I.pulihkanCatatan(d, 'alya', jejak), 0, 'hanya pemiliknya');
  assert.equal(I.pulihkanCatatan(d, 'kiki', jejak), 2);
  assert.equal(urut(), semula);
  assert.equal(I.pulihkanCatatan(d, 'kiki', jejak), 0, 'yang sudah kembali tak digandakan');
  assert.equal(d.notes.find(n => n.id === a.id).pin, true);
});
