/* Penugasan Manager di Pengembangan (2.54.0). Permintaan user: Manager memberi task ke anggota DAE
   yang masuk ke Pengembangan, dengan tenggat. Keputusan user: penugasan langsung (bukan request
   dulu) yang ditinjau Manager sebelum selesai; tenggat cukup per pembaruan. */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');

const H = '2026-11-03';
const W = Date.UTC(2026, 10, 3, 3, 0, 0);
const dasar = () => {
  const d = I.dataKosong();
  const x = I.inisiatifBaru(d, { nama: 'Generator Soal OJK' }, 'ali', W);
  return { d, x };
};
const lengkap = t => Object.assign(t, { output: 'Integrasi berjalan', evidence: [{ id: 'e1', label: 'Demo', url: 'https://contoh.id/demo' }] });

test('Manager menugaskan pembaruan bertenggat: ditinjau Manager, diajukan dengan hasil kerja', () => {
  const { d, x } = dasar();
  const t = I.taskBaru(d, { title: 'Integrasi bank soal ke latihan', pic: 'ali', due: '2026-11-06', inisiatif: x.id, penugasan: true }, 'nynda', W, H);
  assert.deepEqual([t.penugasan, t.lane, t.due, I.penugasanManager(t), I.peninjau(t)], ['nynda', 'rutin', '2026-11-06', true, 'nynda']);
  I.terapkanAksi(d, t, 'mulai', 'ali', W + 1);
  const aksi = I.aksiUntuk(t, 'ali', I.indeks(d));
  assert.ok(!aksi.some(a => a.kunci === 'selesai'), 'tak bisa langsung ditandai selesai');
  assert.match(aksi.find(a => a.kunci === 'ajukan').alasan, /output/);
  lengkap(t);
  I.terapkanAksi(d, t, 'ajukan', 'ali', W + 2);
  assert.equal(t.status, 'Ditinjau');
  assert.ok(I.notifikasi(d, 'nynda').some(n => n.jenis === 'tinjau' && n.task === t.id));
  assert.throws(() => I.terapkanAksi(d, t, 'setujui', 'ali', W + 3), /tidak tersedia/);
  I.terapkanAksi(d, t, 'setujui', 'nynda', W + 3);
  assert.equal(t.status, 'Selesai');
  assert.ok(I.notifikasi(d, 'ali').some(n => n.jenis === 'setuju' && n.task === t.id));
});

test('bukan penugasan: tanpa tanda, dibuat bukan Manager, untuk Manager sendiri, atau task proyek', () => {
  const { d, x } = dasar();
  const biasa = I.taskBaru(d, { title: 'Catatan Manager', pic: 'ali', inisiatif: x.id }, 'nynda', W, H);
  assert.deepEqual([biasa.penugasan, I.peninjau(biasa)], [undefined, null], 'tanpa centang Penugasan tetap tanpa tinjauan');
  assert.equal(I.taskBaru(d, { title: 'Sendiri', pic: 'ali', inisiatif: x.id, penugasan: true }, 'ali', W, H).penugasan, undefined);
  assert.equal(I.taskBaru(d, { title: 'Untuk saya', pic: 'nynda', inisiatif: x.id, penugasan: true }, 'nynda', W, H).penugasan, undefined);
  assert.equal(I.taskBaru(d, { title: 'Rutin', pic: 'ali', sub: 'R3', penugasan: true }, 'nynda', W, H).penugasan, undefined, 'hanya pembaruan inisiatif');
  // Tanda tanpa inisiatif (mis. dilepas dari inisiatif) tak berlaku.
  assert.equal(I.penugasanManager({ ...biasa, penugasan: 'nynda', inisiatif: '' }), false);
});

test('Manager menandai pembaruan lama sebagai penugasan lewat Ubah; perpanjangan ke Manager', () => {
  const { d, x } = dasar();
  const t = I.taskBaru(d, { title: 'Pembaruan dari agen', pic: 'ali', due: '2026-11-05', inisiatif: x.id }, 'ali', W, H);
  assert.equal(I.pemberiTask(t, I.indeks(d)), 'nynda', 'Lead DAE = Ali sendiri, jadi ke Manager');
  I.ubahTask(d, t, { penugasan: true }, 'ali', W + 1);
  assert.equal(t.penugasan, undefined, 'hanya Manager yang menandai');
  I.ubahTask(d, t, { penugasan: true }, 'nynda', W + 2);
  assert.deepEqual([t.penugasan, I.peninjau(t)], ['nynda', 'nynda']);
  assert.match(d.log[0].detail, /jadi penugasan Manager/);
  I.terapkanAksi(d, t, 'mulai', 'ali', W + 3);
  lengkap(t);
  I.terapkanAksi(d, t, 'ajukan', 'ali', W + 4);
  assert.throws(() => I.ubahTask(d, t, { penugasan: false }, 'nynda', W + 5), /sedang ditinjau/);
  I.terapkanAksi(d, t, 'kembalikan', 'nynda', W + 5, 'Tambahkan contoh soal');
  I.ubahTask(d, t, { penugasan: false }, 'nynda', W + 6);
  assert.deepEqual([t.penugasan, I.peninjau(t)], [undefined, null]);
  assert.ok(I.aksiUntuk(t, 'ali', I.indeks(d)).some(a => a.kunci === 'selesai'), 'kembali jadi pembaruan biasa');
  // Lewat perintah data real juga.
  const r = I.jalankanPerintah(d, { aksi: 'taskBaru', isi: { f: { title: 'Lewat perintah', pic: 'ali', due: H, inisiatif: x.id, penugasan: true } }, oleh: 'nynda', at: W + 7, hari: H });
  assert.ok(r.ok, r.galat);
  assert.equal(d.tasks[0].penugasan, 'nynda');
});
