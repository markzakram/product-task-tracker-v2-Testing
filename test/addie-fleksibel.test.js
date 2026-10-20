/* Urutan ADDIE fleksibel (2.43.0). Permintaan user: "ketika statusnya masih di A, V tetap bisa
   dikerjakan". Bawaannya fase tim dan gerbang Manager hanya pengingat; urutan yang diatur Lead
   (tunggu) dan E12 tetap menahan. Proyek yang diketatkan memakai aturan lama. */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');

const HARI = '2026-10-20';
const WAKTU = Date.UTC(2026, 9, 20, 3, 0, 0);
const proyek = o => ({ id: 'PRJ-1', name: 'Paket Uji', platform: 'PCPM', stage: 'A', cycle: 1, decision: 'Build', goal: '', lead: '', history: [], ...o });
const data = (projects = [proyek()]) => ({ tasks: [], projects, log: [], packages: [], setoran: [], dashboards: [], links: [], notes: [] });
const baru = (d, sub, pic, me = 'nynda') => I.taskBaru(d, { title: sub + ' uji', project: 'PRJ-1', sub, pic }, me, WAKTU, HARI);
const jenis = (xs) => xs.map(x => `${x.jenis}:${x.t.sub}`).sort();

test('bawaan fleksibel: Development boleh mulai selagi Analysis dan gerbang Manager belum selesai; keduanya jadi pengingat', () => {
  const d = data();
  const a1 = baru(d, 'A1', 'nynda');
  const a2 = baru(d, 'A2', 'uma', 'andika');
  const dv1 = baru(d, 'DV1', 'uma', 'andika');
  const perId = () => I.indeks(d);
  assert.equal(I.proyekKetat(perId(), 'PRJ-1'), false);
  assert.deepEqual(I.depsBelum(dv1, perId()), [], 'tak ada yang menahan');
  assert.deepEqual(jenis(I.pengingatFase(dv1, perId())), ['fase:A2', 'gerbang:A1']);
  assert.ok(I.ditunggu(dv1, perId()).every(x => x.saran), 'fase dan gerbang bertanda saran');
  assert.equal(I.alasanTunggu(dv1, perId()), '');
  assert.notEqual(I.labelKeadaan(dv1, perId()), 'Menunggu');
  const mulai = I.aksiUntuk(dv1, 'uma', perId()).find(a => a.kunci === 'mulai');
  assert.ok(mulai && !mulai.nonaktif, 'tombol Mulai tak dinonaktifkan');
  I.terapkanAksi(d, dv1, 'mulai', 'uma', WAKTU + 1);
  assert.equal(dv1.status, 'Dikerjakan');
  // Yang sudah selesai, diajukan, atau tertahan tak lagi diingatkan.
  Object.assign(a1, { status: 'Selesai', selesaiAt: WAKTU + 2 });
  Object.assign(a2, { tertahan: true, alasanTertahan: 'menunggu data' });
  assert.deepEqual(I.pengingatFase(dv1, perId()), []);
});

test('fleksibel: urutan yang diatur Lead dan E12 tetap menahan', () => {
  const d = data();
  baru(d, 'A1', 'nynda');
  const dv1 = baru(d, 'DV1', 'uma', 'andika');
  const i1 = baru(d, 'I1', 'alya');
  const e12 = baru(d, 'E12', 'alya');
  I.aturTunggu(d, i1, { tunggu: [dv1.id] }, 'alya', WAKTU + 1);
  const perId = () => I.indeks(d);
  assert.deepEqual(I.depsBelum(i1, perId()).map(x => x.id), [dv1.id], 'serah-terima dari RAD tetap menahan');
  assert.match(I.alasanTunggu(i1, perId()), new RegExp('^Menunggu ' + dv1.id));
  assert.ok(I.depsBelum(e12, perId()).length >= 3, 'E12 menunggu semua task lain di siklusnya');
  assert.equal(I.labelKeadaan(e12, perId()), 'Menunggu');
});

test('proyek yang diketatkan: fase dan gerbang kembali menahan; hanya Lead atau Manager yang mengaturnya', () => {
  const d = data();
  const a1 = baru(d, 'A1', 'nynda');
  baru(d, 'A2', 'uma', 'andika');
  const dv1 = baru(d, 'DV1', 'uma', 'andika');
  const p = d.projects[0];
  assert.throws(() => I.aturUrutanProyek(d, p, true, 'uma', WAKTU), /Hanya Lead atau Manager yang mengatur urutan ADDIE proyek/);
  I.aturUrutanProyek(d, p, true, 'andika', WAKTU + 1);
  assert.equal(p.ketat, true);
  assert.match(d.log[0].detail, /diketatkan/);
  const perId = () => I.indeks(d);
  assert.deepEqual(I.depsBelum(dv1, perId()).map(x => x.sub).sort(), ['A1', 'A2']);
  assert.deepEqual(I.pengingatFase(dv1, perId()), []);
  assert.match(I.alasanTunggu(dv1, perId()), new RegExp('^Menunggu gerbang Manager: ' + a1.id));
  assert.ok(I.aksiUntuk(dv1, 'uma', perId()).find(a => a.kunci === 'mulai').nonaktif);
  // Mengatur ke keadaan yang sama tak menulis riwayat lagi; melonggarkan lewat perintah data.
  const n = d.log.length;
  I.aturUrutanProyek(d, p, true, 'nynda', WAKTU + 2);
  assert.equal(d.log.length, n);
  const r = I.jalankanPerintah(d, { aksi: 'aturUrutanProyek', isi: { proyek: 'PRJ-1', ketat: false }, oleh: 'nynda', at: WAKTU + 3 });
  assert.equal(r.ok, true);
  assert.equal(p.ketat, false);
  assert.deepEqual(I.depsBelum(dv1, I.indeks(d)), []);
  assert.deepEqual(I.izinPeran('proyek.urutan').sort(), ['lead', 'manager']);
});

test('notifikasi "siap" hanya untuk yang tadinya tertahan sungguhan, bukan karena pengingat beres', () => {
  const d = data();
  const a2 = baru(d, 'A2', 'uma', 'andika');
  const dv1 = baru(d, 'DV1', 'uma', 'andika');
  const i1 = baru(d, 'I1', 'alya');
  I.aturTunggu(d, i1, { tunggu: [dv1.id] }, 'alya', WAKTU + 1);
  Object.assign(a2, { status: 'Selesai', selesaiAt: WAKTU + 5 });
  assert.ok(!I.notifikasi(d, 'uma').some(n => n.jenis === 'siap' && n.task === dv1.id), 'DV1 sudah boleh mulai sejak dibuat');
  Object.assign(dv1, { status: 'Selesai', selesaiAt: WAKTU + 9 });
  assert.ok(I.notifikasi(d, 'alya').some(n => n.jenis === 'siap' && n.task === i1.id), 'I1 siap setelah serah-terima tuntas');
});

test('duplikat proyek ikut menyalin urutan yang diketatkan', () => {
  const d = data([proyek({ ketat: true }), proyek({ id: 'PRJ-2', name: 'Longgar' })]);
  const a = I.duplikatProyek(d, d.projects[0], { name: 'Salinan ketat' }, 'nynda', WAKTU, HARI);
  const b = I.duplikatProyek(d, d.projects.find(p => p.id === 'PRJ-2'), { name: 'Salinan longgar' }, 'nynda', WAKTU, HARI);
  assert.equal(a.project.ketat, true);
  assert.ok(!b.project.ketat);
});

test('tabel Daftar: urut kolom Task menurut tahap dan kode sub-stage, lalu judul; tanpa sub-stage di belakang', () => {
  const t = (id, sub, title) => ({ id, sub, title, project: '', lane: 'rutin', status: 'Antre', pic: 'kiki', platform: '', due: '', deps: [], support: [], tinjauan: [], evidence: [], subtasks: [], comments: [] });
  const d = data([]);
  d.tasks.push(t('PRD-1', '', 'Agenda'), t('PRD-2', 'E2', 'Banding'), t('PRD-3', 'E12', 'Cetak'), t('PRD-4', 'DV2', 'Draf'), t('PRD-5', 'A2', 'Evaluasi'), t('PRD-6', 'R1', 'Format'));
  const urut = arah => I.daftarTask(d, { urut: 'title', arah }, HARI).map(x => x.sub || x.title);
  assert.deepEqual(urut(1), ['A2', 'DV2', 'E2', 'E12', 'R1', 'Agenda']);
  assert.deepEqual(urut(-1), ['Agenda', 'R1', 'E12', 'E2', 'DV2', 'A2']);
});
