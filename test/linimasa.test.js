/* Halaman inisiatif sebagai linimasa (2.39.0, permintaan user): angka kerja dari kolom output,
   judul tanpa awalan nama inisiatif, pengelompokan per hari, dan tanggapan (Manager). */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');

const HARI = '2026-10-19';
const jam = (hari, j) => new Date(`${hari}T${String(j).padStart(2, '0')}:00:00`).getTime();
let n = 0;
const task = o => ({
  id: 'PRD-' + String(++n).padStart(3, '0'), project: '', lane: 'rutin', title: 'Task ' + n, pic: 'ali', status: 'Selesai',
  due: '', tertahan: false, output: '', inisiatif: 'INI-004', cycle: 1, createdAt: 1, updatedAt: 1, selesaiAt: 0,
  subtasks: [], comments: [], tinjauan: [], evidence: [], ...o,
});
const x = { id: 'INI-004', nama: 'Agent AI (Staff Tim DAE)', tim: 'SI', pic: 'ali', status: 'aktif', updatedAt: 0 };

test('angka kerja dibaca dari kolom output yang diisi agen', () => {
  assert.deepEqual(I.angkaKerja('7 commit, 1 sesi Claude Code'), { commit: 7, file: 0, sesi: 1 });
  assert.deepEqual(I.angkaKerja('2 file disentuh, 1 sesi Claude Code'), { commit: 0, file: 2, sesi: 1 });
  assert.deepEqual(I.angkaKerja('Laporan mingguan terkirim'), { commit: 0, file: 0, sesi: 0 });
  assert.deepEqual(I.jumlahAngka([{ output: '1 commit' }, { output: '6 commit, 1 sesi' }, { output: '8 file disentuh' }]), { commit: 7, file: 8, sesi: 1 });
});

test('judul tanpa awalan nama inisiatif; awalan lain dibiarkan', () => {
  assert.equal(I.judulPembaruan({ title: 'Agent AI: perbaikan hasil audit' }, x), 'Perbaikan hasil audit');
  assert.equal(I.judulPembaruan({ title: 'agent ai: first commit' }, x), 'First commit', 'huruf besar-kecil tak dibedakan');
  assert.equal(I.judulPembaruan({ title: 'DV7: prototype generator' }, x), 'DV7: prototype generator');
  assert.equal(I.judulPembaruan({ title: 'Tanpa awalan' }, x), 'Tanpa awalan');
});

test('linimasa: per hari, terbaru dulu, dengan angka kerja tiap hari', () => {
  const a = task({ selesaiAt: jam('2026-10-19', 9), output: '7 commit, 1 sesi' });
  const b = task({ selesaiAt: jam('2026-10-19', 15), output: '1 commit' });
  const c = task({ selesaiAt: jam('2026-10-17', 10), output: '2 file disentuh' });
  const g = I.linimasaInisiatif([a, c, b]);
  assert.deepEqual(g.map(h => [h.hari, h.tasks.map(t => t.id)]), [['2026-10-19', [b.id, a.id]], ['2026-10-17', [c.id]]]);
  assert.deepEqual(g[0].angka, { commit: 8, file: 0, sesi: 1 });
});

test('ringkasan inisiatif: angka 7 hari dan apakah pembaruannya mencatat angka kerja', () => {
  const d = {
    tasks: [
      task({ selesaiAt: jam('2026-10-19', 9), output: '7 commit, 1 sesi' }),
      task({ selesaiAt: jam('2026-10-13', 9), output: '1 commit, 1 sesi' }),
      task({ selesaiAt: jam('2026-10-12', 9), output: '9 commit' }),
      task({ status: 'Dikerjakan', output: '' }),
    ],
  };
  const r = I.ringkasInisiatif(d, x, HARI);
  assert.deepEqual(r.angka7, { commit: 8, file: 0, sesi: 2 }, '13–19 Okt; 12 Okt di luar');
  assert.equal(r.adaAngka, true);
  assert.equal(I.ringkasInisiatif({ tasks: [task({ selesaiAt: jam(HARI, 9), output: 'Notulen rapat' })] }, x, HARI).adaAngka, false);
});

test('tanggapan: pesan orang selain PIC; Manager melihat yang belum ia tanggapi', () => {
  const a = task({ selesaiAt: jam(HARI, 9) });
  const b = task({ selesaiAt: jam(HARI, 10) });
  const pesanA = [
    { id: 'm1', oleh: 'ali', teks: 'catatan saya', at: 1 },
    { id: 'm2', oleh: 'nynda', teks: '**Perlu dibahas** · sudah bisa dipakai RAD?', at: 2 },
    { id: 'm3', oleh: 'andika', teks: 'dihapus', at: 3, dihapus: true },
  ];
  assert.deepEqual(I.tanggapanPembaruan(a, pesanA).map(m => m.id), ['m2'], 'pesan PIC sendiri dan yang dihapus tak dihitung');
  const perRuang = new Map([[I.ruangTask(a.id), pesanA]]);
  assert.deepEqual(I.belumDitanggapi([a, b], perRuang, 'nynda').map(t => t.id), [b.id]);
  assert.deepEqual(I.belumDitanggapi([a, b], perRuang, 'andika').map(t => t.id), [a.id, b.id], 'pesan yang dihapus tak dihitung');
  assert.deepEqual(I.belumDitanggapi([a, b], perRuang, 'ali'), [], 'pembaruan sendiri tak perlu ditanggapi');
});
