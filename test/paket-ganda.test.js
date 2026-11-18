/* Rancangan paket → proyek (2.61.0). Permintaan user: (1) proyek dan task-nya boleh menyetor ke lebih
   dari satu paket, dan hasil kerja yang sama dihitung penuh di setiap paket (keputusan user);
   (2) halaman Proyek dikelompokkan per paket seperti folder; (3) task ditandai perlu atau tidak perlu
   setoran sejak dibuat, dan yang belum disetor terlihat. */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');

const H = '2026-11-18';
const W = Date.UTC(2026, 10, 18, 3, 0, 0);
const paket = (id, nama, items) => ({ id, namaPaket: nama, program: nama, platform: ['All Platform'], items, links: [] });
const target = (id, kategori, nama, t = 10) => ({ id, kategori, nama, target: t, awal: 0, satuan: 'Paket' });
function dasar() {
  const d = I.dataKosong();
  d.packages = [
    paket('PKG-001', 'TKA Cerebrum', [target('it-1', 'Latsol', 'TKP Tingkat A')]),
    paket('PKG-002', 'UTBK SNBT', [target('it-2', 'Latsol', 'TKP Dasar'), target('it-3', 'Materi', 'Penalaran')]),
  ];
  const p = I.proyekBaru(d, { name: 'Live Class TKA', platform: 'All Platform' }, 'nynda', W);
  return { d, p };
}
const tugas = (d, p, f) => I.taskBaru(d, { title: 'Task', project: p.id, pic: 'andika', due: '2026-11-27', ...f }, 'nynda', W + 1, H);

test('proyek mengisi beberapa paket: utama + ikut; urutan dan pelepasan', () => {
  const { d, p } = dasar();
  assert.deepEqual(I.paketTertaut(p), []);
  I.ikutPaket(d, p, 'PKG-002', true, 'nynda', W);
  assert.deepEqual([p.paket, p.paketLain], ['PKG-002', []], 'paket pertama jadi utama');
  I.ikutPaket(d, p, 'PKG-001', true, 'nynda', W);
  assert.deepEqual(I.paketTertaut(p), ['PKG-002', 'PKG-001']);
  I.tautkanPaket(d, p, 'PKG-001', 'nynda', W);
  assert.deepEqual([p.paket, p.paketLain], ['PKG-001', ['PKG-002']], 'paket lain yang dijadikan utama tak dobel');
  assert.deepEqual(I.paketProyek(d, p).map(x => x.id), ['PKG-001', 'PKG-002'], 'utama lebih dulu');
  assert.deepEqual(I.proyekPengisi(d, 'PKG-002').map(x => x.id), [p.id]);
  I.ikutPaket(d, p, 'PKG-001', false, 'nynda', W);
  assert.deepEqual([p.paket, p.paketLain], ['PKG-002', []], 'melepas utama menaikkan paket lain');
  assert.throws(() => I.ikutPaket(d, p, 'PKG-009', true, 'nynda', W), /tidak ditemukan/);
  assert.throws(() => I.ikutPaket(d, p, 'PKG-001', true, 'kiki', W), /Hanya/);
});

test('setoran ke dua paket: hasil kerja yang sama dihitung penuh di keduanya', () => {
  const { d, p } = dasar();
  I.ikutPaket(d, p, 'PKG-001', true, 'nynda', W);
  I.ikutPaket(d, p, 'PKG-002', true, 'nynda', W);
  const t = tugas(d, p, { sub: 'E1' });
  I.setorkan(d, t, { paket: 'PKG-001', item: 'it-1', jumlah: 5, tahap: 'tayang' }, 'nynda', W + 2);
  I.setorkan(d, t, { paket: 'PKG-002', item: 'it-2', jumlah: 5, tahap: 'tayang' }, 'nynda', W + 2);
  Object.assign(t, { status: 'Selesai', selesaiAt: W + 3 });
  const hitung = (pk, it) => I.hitungTarget(d.packages.find(x => x.id === pk).items.find(x => x.id === it), I.setoranPaket(d, d.packages.find(x => x.id === pk)).get(it));
  assert.deepEqual([hitung('PKG-001', 'it-1').terpenuhi, hitung('PKG-002', 'it-2').terpenuhi], [5, 5]);
  I.ikutPaket(d, p, 'PKG-002', false, 'nynda', W + 4);
  assert.equal(hitung('PKG-002', 'it-2').terpenuhi, 5, 'berhenti ikut tak menghapus setoran yang sudah ada');
  assert.ok(I.paketProyek(d, p).some(x => x.id === 'PKG-002'), 'tetap terbaca lewat setorannya');
});

test('elaborasi paket lain ke proyek yang sudah ada menambahkannya sebagai paket yang ikut diisi', () => {
  const { d, p } = dasar();
  I.tautkanPaket(d, p, 'PKG-001', 'nynda', W);
  I.elaborasiPaket(d, d.packages[1], { proyek: p.id, items: ['it-2'], due: '2026-11-27' }, 'nynda', W + 1, H);
  assert.deepEqual([p.paket, p.paketLain], ['PKG-001', ['PKG-002']]);
  I.elaborasiPaket(d, d.packages[1], { proyek: p.id, items: ['it-3'], due: '2026-11-27' }, 'nynda', W + 2, H);
  assert.deepEqual(p.paketLain, ['PKG-002'], 'tak dobel');
  I.hapusPaket(d, d.packages[0], 'nynda', W + 3);
  assert.deepEqual([p.paket, p.paketLain], ['PKG-002', []], 'paket utama dihapus: yang lain naik');
  assert.equal(I.paketUtamaProyek(d, p), 'PKG-002');
});

test('penanda setoran: saran dari sub-stage, pilihan sendiri menang, dan yang belum disetor terbaca', () => {
  const { d, p } = dasar();
  const tanpaPaket = tugas(d, p, { sub: 'E1' });
  assert.equal(I.saranSetor(d, tanpaPaket), 'tidak', 'proyek tanpa paket');
  I.tautkanPaket(d, p, 'PKG-001', 'nynda', W);
  assert.deepEqual([I.saranSetor(d, { project: p.id, sub: 'E1' }), I.capaianSub(d, { project: p.id, sub: 'E1' })], ['perlu', 'konten']);
  assert.deepEqual([I.saranSetor(d, { project: p.id, sub: 'DV8' }), I.capaianSub(d, { project: p.id, sub: 'DV8' })], ['perlu', 'input']);
  assert.equal(I.saranSetor(d, { project: p.id, sub: 'A2' }), 'tidak');
  const qc = tugas(d, p, { sub: 'E1', setor: 'perlu' });
  const riset = tugas(d, p, { sub: 'A2' });
  const tidak = tugas(d, p, { sub: 'E1', setor: 'tidak' });
  const lama = tugas(d, p, { sub: 'DV8' });   // tanpa penanda: dinilai dari saran
  assert.deepEqual([qc.setor, riset.setor, tidak.setor, lama.setor], ['perlu', undefined, 'tidak', undefined]);
  const belum = () => d.tasks.filter(t => I.belumDisetor(d, t)).map(t => t.id).sort();
  assert.deepEqual(belum(), [qc.id, lama.id, tanpaPaket.id].sort());
  I.setorkan(d, qc, { paket: 'PKG-001', item: 'it-1', jumlah: 3, tahap: 'konten' }, 'nynda', W + 2);
  I.ubahTask(d, lama, { setor: 'tidak' }, 'nynda', W + 3);
  Object.assign(tanpaPaket, { status: 'Selesai', selesaiAt: W + 4 });
  assert.deepEqual(belum(), [], 'sudah disetor, ditandai tidak perlu, atau sudah selesai tanpa penanda');
  I.ubahTask(d, lama, { setor: '' }, 'nynda', W + 5);
  assert.equal(lama.setor, undefined, 'kembali mengikuti saran');
  const tetap = tugas(d, p, { sub: 'A2', setor: 'perlu' });
  Object.assign(tetap, { status: 'Selesai', selesaiAt: W + 6 });
  assert.ok(I.belumDisetor(d, tetap), 'ditandai perlu: tetap terbaca walau sudah selesai');
});

test('langkah hasil elaborasi dan task turunan tak ditandai belum disetor', () => {
  const { d, p } = dasar();
  I.tautkanPaket(d, p, 'PKG-001', 'nynda', W);
  I.elaborasiPaket(d, d.packages[0], { proyek: p.id, items: ['it-1'], due: '2026-11-27' }, 'nynda', W + 1, H);
  const perId = I.indeks(d);
  const langkah = d.tasks.filter(t => t.project === p.id);
  assert.ok(langkah.length > 3);
  assert.ok(langkah.every(t => !I.belumDisetor(d, t, perId)), 'menyetor lewat batch-nya');
  const e1 = langkah.find(t => t.sub === 'E1');
  const anak = I.taskAnak(d, e1, { title: 'QC bagian 1', pic: 'uma' }, 'andika', W + 2, H);
  assert.equal(I.belumDisetor(d, anak), false, 'turunan tanpa penanda tak ditandai');
});

test('lewat perintah data real: penanda dan paket yang ikut diisi tersimpan', () => {
  const { d, p } = dasar();
  I.tautkanPaket(d, p, 'PKG-001', 'nynda', W);
  const salin = JSON.parse(JSON.stringify(d));
  const r = I.jalankanPerintah(salin, { aksi: 'ikutPaket', isi: { proyek: p.id, paket: 'PKG-002', ikut: true }, oleh: 'nynda', at: W + 1, hari: H });
  assert.equal(r.ok, true, r.galat);
  const r2 = I.jalankanPerintah(salin, { aksi: 'taskBaru', isi: { f: { title: 'QC', project: p.id, sub: 'E1', pic: 'andika', setor: 'perlu' } }, oleh: 'nynda', at: W + 2, hari: H });
  assert.equal(r2.ok, true, r2.galat);
  const akhir = I.terapkanUbah(JSON.parse(JSON.stringify(d)), I.bedaData(d, salin));
  assert.deepEqual(akhir.projects.find(x => x.id === p.id).paketLain, ['PKG-002']);
  assert.equal(akhir.tasks.find(t => t.title === 'QC').setor, 'perlu');
});
