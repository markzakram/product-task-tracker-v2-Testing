/* Pembaruan proyek (2.45.0). Permintaan user: tim DAE sering membuat task rutin yang sebenarnya
   pembaruan inisiatif atau proyek yang berjalan terus; task itu bisa disambungkan ke proyeknya,
   tetap punya hasil kerja, ceklis, dan diskusi, dan Manager bisa menanggapinya. Keputusan user:
   tab Pembaruan di proyek, sementara khusus tim DAE dan Manager. */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');

const HARI = '2026-10-20';
const WAKTU = Date.UTC(2026, 9, 20, 3, 0, 0);
const proyek = o => ({ id: 'PRJ-1', name: 'ProductTrack v2', platform: 'All Platform', stage: 'V', cycle: 1, decision: 'Build', goal: '', lead: '', history: [], ...o });
const data = (projects = [proyek()]) => ({ tasks: [], projects, inisiatif: [], log: [], packages: [], setoran: [], dashboards: [], links: [], notes: [] });

test('task rutin jadi pembaruan proyek: tetap rutin, tanpa tinjauan, tak masuk siklus ADDIE proyeknya', () => {
  const d = data();
  const p = d.projects[0];
  const dv = I.taskBaru(d, { title: 'DV7 prototype', project: 'PRJ-1', sub: 'DV7', pic: 'ali' }, 'nynda', WAKTU, HARI);
  const e12 = I.taskBaru(d, { title: 'E12 tutup', project: 'PRJ-1', sub: 'E12', pic: 'alya' }, 'nynda', WAKTU, HARI);
  const sebelum = I.ringkasProyek(d, p, HARI, I.indeks(d));
  const t = I.taskBaru(d, { title: 'ProductTrack v2: sinkron data real', pic: 'ali', due: HARI, pembaruanProyek: 'PRJ-1' }, 'ali', WAKTU + 1, HARI);
  assert.deepEqual([t.pembaruanProyek, t.lane, t.project, t.inisiatif, t.kategori, I.peninjau(t)], ['PRJ-1', 'rutin', '', '', 'ProductTrack v2', null]);
  const perId = I.indeks(d);
  const sesudah = I.ringkasProyek(d, p, HARI, perId);
  assert.deepEqual([sesudah.totalSiklus, sesudah.selesaiSiklus], [sebelum.totalSiklus, sebelum.selesaiSiklus], 'progres siklus tak berubah');
  assert.ok(!I.depsBelum(e12, perId).some(x => x.id === t.id), 'E12 tak menunggu pembaruan');
  assert.ok(I.depsBelum(e12, perId).some(x => x.id === dv.id));
  assert.equal(I.laporan(d, HARI).perOrang.find(o => o.id === 'ali').aktif, 2, 'tetap terhitung di beban');
  // Hasil kerja, ceklis, dan langsung selesai seperti task rutin lain.
  I.terapkanAksi(d, t, 'mulai', 'ali', WAKTU + 2);
  I.tambahSubtask(d, t, { title: 'Uji Preview' }, 'ali', WAKTU + 3);
  assert.equal(t.subtasks.length, 1);
  I.terapkanAksi(d, t, 'selesai', 'ali', WAKTU + 4);
  assert.equal(t.status, 'Selesai');
  const r = I.ringkasPembaruanProyek(d, p, HARI);
  assert.deepEqual([r.buka.length, r.beres.map(x => x.id), r.selesai30], [0, [t.id], 1]);
  assert.deepEqual(I.linimasaInisiatif(r.beres).map(g => g.hari), [HARI]);
  assert.equal(I.judulPembaruan(t, { nama: p.name }), 'Sinkron data real', 'awalan nama proyek dibersihkan');
  // Tanggapan Manager = pesan di ruang task-nya.
  const ruang = new Map([[I.ruangTask(t.id), [{ oleh: 'nynda', teks: '**Bagus**', at: WAKTU + 5 }]]]);
  assert.equal(I.tanggapanPembaruan(t, ruang.get(I.ruangTask(t.id))).length, 1);
  assert.deepEqual(I.belumDitanggapi(r.beres, ruang, 'nynda'), []);
  assert.deepEqual(I.belumDitanggapi(r.beres, new Map(), 'nynda').map(x => x.id), [t.id]);
});

test('yang boleh: tim DAE dan Manager; proyek aktif saja; satu tempat saja; task proyek tak disambungkan', () => {
  const d = data([proyek(), proyek({ id: 'PRJ-2', name: 'Lama', arsip: true })]);
  d.inisiatif.push({ id: 'INI-001', nama: 'Agent AI', tim: 'SI', pic: 'ali', status: 'aktif', links: [] });
  assert.deepEqual(['ali', 'nynda', 'alya', 'kiki'].map(I.bolehPembaruanProyek), [true, true, false, false]);
  assert.throws(() => I.taskBaru(d, { title: 'x', pic: 'alya', pembaruanProyek: 'PRJ-1' }, 'alya', WAKTU, HARI), /khusus tim DAE dan Manager/);
  assert.throws(() => I.taskBaru(d, { title: 'x', pic: 'ali', pembaruanProyek: 'PRJ-2' }, 'ali', WAKTU, HARI), /diarsipkan/);
  assert.throws(() => I.taskBaru(d, { title: 'x', pic: 'ali', pembaruanProyek: 'PRJ-9' }, 'ali', WAKTU, HARI), /Proyek tidak ditemukan/);
  assert.throws(() => I.taskBaru(d, { title: 'x', pic: 'ali', inisiatif: 'INI-001', pembaruanProyek: 'PRJ-1' }, 'ali', WAKTU, HARI), /satu tempat saja/);
  assert.throws(() => I.taskBaru(d, { title: 'x', project: 'PRJ-1', sub: 'DV7', pic: 'ali', pembaruanProyek: 'PRJ-1' }, 'nynda', WAKTU, HARI), /Task proyek sudah berada/);
  assert.equal(I.taskBaru(d, { title: 'Manager juga', pic: 'ali', pembaruanProyek: 'PRJ-1' }, 'nynda', WAKTU, HARI).pembaruanProyek, 'PRJ-1');
});

test('menyambungkan task lama: ke proyek, pindah ke inisiatif, dan dilepas; tercatat di Riwayat', () => {
  const d = data();
  d.inisiatif.push({ id: 'INI-001', nama: 'Agent AI', tim: 'SI', pic: 'ali', status: 'aktif', links: [] });
  const t = I.taskBaru(d, { title: 'Perbaikan notifikasi @all', pic: 'ali', sub: 'R3' }, 'ali', WAKTU, HARI);
  const kategori = t.kategori;
  assert.throws(() => I.sambungProyek(d, t, 'PRJ-1', 'kiki', WAKTU), /Hanya PIC, Lead-nya, atau Manager/);
  I.sambungProyek(d, t, 'PRJ-1', 'ali', WAKTU + 1);
  assert.deepEqual([t.pembaruanProyek, t.inisiatif, t.kategori], ['PRJ-1', '', kategori], 'jenis rutin tetap jadi kategorinya');
  assert.match(d.log[0].detail, /Disambungkan sebagai pembaruan proyek PRJ-1/);
  const n = d.log.length;
  I.sambungProyek(d, t, 'PRJ-1', 'ali', WAKTU + 2);
  assert.equal(d.log.length, n, 'tanpa perubahan, tanpa catatan');
  I.tempelInisiatif(d, t, 'INI-001', 'ali', WAKTU + 3);
  assert.deepEqual([t.inisiatif, t.pembaruanProyek], ['INI-001', ''], 'pindah ke inisiatif melepas proyeknya');
  const r = I.jalankanPerintah(d, { aksi: 'sambungProyek', isi: { task: t.id, proyek: 'PRJ-1' }, oleh: 'ali', at: WAKTU + 4 });
  assert.ok(r.ok, r.galat);
  assert.deepEqual([t.inisiatif, t.pembaruanProyek], ['', 'PRJ-1']);
  I.sambungProyek(d, t, '', 'ali', WAKTU + 5);
  assert.equal(t.pembaruanProyek, '');
  assert.match(d.log[0].detail, /Dilepas dari pembaruan proyek ProductTrack v2/);
});

test('menghapus proyek melepas pembaruannya, task-nya tetap ada', () => {
  const d = data();
  const t = I.taskBaru(d, { title: 'Pembaruan', pic: 'ali', pembaruanProyek: 'PRJ-1' }, 'ali', WAKTU, HARI);
  I.taskBaru(d, { title: 'DV7', project: 'PRJ-1', sub: 'DV7', pic: 'ali' }, 'nynda', WAKTU, HARI);
  assert.equal(I.ringkasHapusProyek(d, d.projects[0]).pembaruan, 1);
  const h = I.hapusProyek(d, d.projects[0], 'nynda', WAKTU + 1);
  assert.deepEqual([h.task, d.tasks.map(x => x.id), t.pembaruanProyek], [1, [t.id], '']);
  assert.match(d.log[0].detail, /1 pembaruan rutin dilepas/);
});
