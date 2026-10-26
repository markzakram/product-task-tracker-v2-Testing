/* Proyek umum (2.51.0). Permintaan user: proyek di luar rancangan paket untuk semua tim (contoh:
   cari guru). Keputusan user: tahap bebas (tak menahan), task ditinjau Lead, pembuatnya Lead
   (untuk timnya) dan Manager; tampilan Daftar per tahap, dengan Papan dan Linimasa sebagai pilihan. */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');

const HARI = '2026-10-26';
const WAKTU = Date.UTC(2026, 9, 26, 3, 0, 0);
const data = () => ({ tasks: [], projects: [], log: [], packages: [], setoran: [], dashboards: [], links: [], notes: [], inisiatif: [], permintaan: [] });
const rekrutmen = (d, me = 'dhea') => I.proyekBaru(d, { jenis: 'umum', name: 'Rekrutmen guru liveclass', tim: ['CO', 'LA'], tahap: I.TEMPLAT_TAHAP.rekrutmen, tenggat: '2026-11-15' }, me, WAKTU);
const tugas = (d, p, f, me = 'dhea') => I.taskBaru(d, { project: p.id, title: 'Task', ...f }, me, WAKTU, HARI);
const lengkap = t => Object.assign(t, { output: 'Hasil', evidence: [{ id: 'e1', label: 'Bukti', url: 'https://contoh.id/b' }] });

test('membuat Proyek umum: Lead untuk timnya, Manager untuk tim mana pun; staff tidak', () => {
  const d = data();
  const p = rekrutmen(d);
  assert.deepEqual([p.jenis, p.stage, p.timProyek, p.lead, p.tenggat, p.paket], ['umum', '', ['CO', 'LA'], 'dhea', '2026-11-15', '']);
  assert.deepEqual(p.tahapUmum.map(x => [x.id, x.nama]), [['tp1', 'Lowongan'], ['tp2', 'Seleksi'], ['tp3', 'Wawancara'], ['tp4', 'Onboarding']]);
  assert.ok(I.proyekUmum(p));
  assert.throws(() => I.proyekBaru(d, { jenis: 'umum', name: 'X', tim: ['AK'], timPemilik: 'AK' }, 'dhea', WAKTU), /untuk timnya sendiri \(CLO\)/);
  assert.throws(() => I.proyekBaru(d, { jenis: 'umum', name: 'X', tim: ['CO'] }, 'nadya', WAKTU), /Hanya .*Lead.* yang membuat Proyek umum/);
  const m = I.proyekBaru(d, { jenis: 'umum', name: 'Webinar orang tua', tim: ['CO'], timPemilik: 'CO', tahap: ['Persiapan', ' Pelaksanaan ', ''] }, 'nynda', WAKTU);
  assert.deepEqual([m.timProyek, m.lead, m.tahapUmum.map(x => x.nama)], [['CO'], 'dhea', ['Persiapan', 'Pelaksanaan']]);
  assert.throws(() => I.proyekBaru(d, { jenis: 'umum', name: 'Y', tim: ['CO'], lead: 'andika' }, 'nynda', WAKTU), /Lead proyek adalah Lead salah satu tim/);
  assert.throws(() => I.proyekBaru(d, { jenis: 'umum', name: 'Y', tim: ['CO'], tahap: ['A', 'a'] }, 'dhea', WAKTU), /dua kali/);
  assert.throws(() => I.proyekBaru(d, { jenis: 'umum', name: 'Y', tim: ['CO'], tahap: Array.from({ length: 13 }, (_, i) => 'T' + i) }, 'dhea', WAKTU), /paling banyak 12/);
  assert.deepEqual(I.izinPeran('proyek.buatUmum').sort(), ['lead', 'manager']);
  assert.deepEqual(I.izinPeran('proyek.buat'), ['manager'], 'proyek ADDIE tetap Manager');
});

test('task Proyek umum: tanpa sub-stage, PIC tim sendiri atau Lead tim yang terlibat, ditinjau Lead', () => {
  const d = data();
  const p = rekrutmen(d);
  const a = tugas(d, p, { title: 'Saring CV', pic: 'nadya', tahapProyek: 'tp2' });
  assert.deepEqual([a.lane, a.stage, a.sub, a.tahapProyek, a.cycle, I.peninjau(a)], ['proyek', '', '', 'tp2', 1, 'dhea']);
  assert.equal(tugas(d, p, { title: 'Soal microteaching', pic: 'alya', tahapProyek: 'tp2' }).pic, 'alya', 'Lead tim lain yang terlibat');
  assert.throws(() => tugas(d, p, { pic: 'andika' }), /bukan Lead tim yang terlibat/);
  assert.throws(() => tugas(d, p, { pic: 'nadya', sub: 'DV1' }), /tak memakai sub-stage/);
  assert.throws(() => tugas(d, p, { pic: 'nadya', tahapProyek: 'tp9' }), /Tahap itu tidak ada/);
  assert.equal(tugas(d, p, { title: 'Sendiri', pic: 'nadya' }, 'nadya').tahapProyek, '', 'staff tim terlibat untuk dirinya; tanpa tahap boleh');
  assert.throws(() => tugas(d, p, { pic: 'uma' }, 'uma'), /melibatkan timnya/);
  assert.equal(I.peninjau(tugas(d, p, { title: 'Wawancara', pic: 'dhea', tahapProyek: 'tp3' })), I.MANAGER, 'task Lead ditinjau Manager');
  // Alur tinjauan seperti task proyek; tak ada fase, gerbang, atau E12 yang menahan.
  const perId = I.indeks(d);
  assert.deepEqual(I.depsBelum(a, perId), []);
  I.terapkanAksi(d, a, 'mulai', 'nadya', WAKTU + 1);
  assert.match(I.aksiUntuk(a, 'nadya', I.indeks(d)).find(x => x.kunci === 'ajukan').alasan || '', /output/);
  lengkap(a);
  I.terapkanAksi(d, a, 'ajukan', 'nadya', WAKTU + 2);
  assert.throws(() => I.terapkanAksi(d, a, 'setujui', 'alya', WAKTU + 3), /tidak tersedia/);
  I.terapkanAksi(d, a, 'setujui', 'dhea', WAKTU + 3);
  assert.equal(a.status, 'Selesai');
});

test('ringkasan per tahap, tak ada fase ADDIE: tahap proyek tak berpindah, tak masuk antrean keputusan', () => {
  const d = data();
  const p = rekrutmen(d);
  const t1 = tugas(d, p, { title: 'Kriteria', pic: 'dhea', tahapProyek: 'tp1' });
  const t2 = tugas(d, p, { title: 'CV', pic: 'nadya', tahapProyek: 'tp2', due: '2026-10-24' });
  tugas(d, p, { title: 'Lain', pic: 'nadya' });
  Object.assign(t1, { status: 'Selesai', selesaiAt: WAKTU });
  const nLog = d.log.length;
  assert.deepEqual(I.segarkanTahap(d, WAKTU + 1, 'dhea'), []);
  assert.equal(p.stage, '');
  assert.equal(d.log.length, nLog, 'tanpa catatan perpindahan tahap otomatis');
  const r = I.ringkasProyekUmum(d, p, HARI);
  assert.deepEqual(r.tahap.map(x => [x.nama, x.selesai, x.total]), [['Lowongan', 1, 1], ['Seleksi', 0, 1], ['Wawancara', 0, 0], ['Onboarding', 0, 0]]);
  assert.deepEqual([r.tanpa.total, r.total, r.selesai, r.telat, r.berjalan, r.tenggat], [1, 3, 1, 1, 'tp2', '2026-11-15']);
  assert.equal(I.ringkasProyek(d, p, HARI).keadaan, 'risiko');
  for (const t of d.tasks) Object.assign(t, { status: 'Selesai', selesaiAt: WAKTU });
  assert.equal(I.ringkasProyek(d, p, HARI).keadaan, 'tuntas', 'bukan "sepi" yang menunggu E12');
  assert.deepEqual(I.antreKeputusan(d, HARI), []);
  assert.throws(() => I.mulaiSiklus(d, p, 'nynda', WAKTU), /tak memakai siklus/);
  void t2;
});

test('pindah tahap, ubah proyek (tahap dihapus = tanpa tahap), tunda dan arsip oleh Lead proyek', () => {
  const d = data();
  const p = rekrutmen(d);
  const t = tugas(d, p, { title: 'CV', pic: 'nadya', tahapProyek: 'tp2' });
  I.pindahTahapUmum(d, t, 'tp3', 'nadya', WAKTU + 1);
  assert.equal(t.tahapProyek, 'tp3');
  assert.match(d.log[0].detail, /Seleksi → Wawancara/);
  assert.throws(() => I.pindahTahapUmum(d, t, 'tp2', 'uma', WAKTU), /Hanya PIC/);
  assert.throws(() => I.pindahTahapUmum(d, t, 'tp9', 'dhea', WAKTU), /tidak ada/);
  assert.ok(I.jalankanPerintah(d, { aksi: 'pindahTahapUmum', isi: { task: t.id, tahap: '' }, oleh: 'dhea', at: WAKTU + 2 }).ok);
  assert.equal(t.tahapProyek, '');
  I.ubahTask(d, t, { tahapProyek: 'tp3' }, 'dhea', WAKTU + 3);
  assert.equal(t.tahapProyek, 'tp3');
  assert.throws(() => I.ubahTask(d, t, { sub: 'DV1' }, 'dhea', WAKTU), /tak memakai sub-stage/);
  // Ubah tahap: nama diganti (ID tetap), Wawancara dihapus → task-nya tanpa tahap.
  assert.throws(() => I.ubahProyek(d, p, { name: 'Lain' }, 'andika', WAKTU), /Hanya Lead proyek/);
  I.ubahProyek(d, p, { tahap: [{ id: 'tp1', nama: 'Lowongan dibuka' }, { id: 'tp2', nama: 'Seleksi' }, { nama: 'Kontrak' }] }, 'dhea', WAKTU + 4);
  assert.deepEqual(p.tahapUmum.map(x => [x.id, x.nama]), [['tp1', 'Lowongan dibuka'], ['tp2', 'Seleksi'], ['tp5', 'Kontrak']]);
  assert.equal(t.tahapProyek, '');
  I.ubahProyek(d, p, { tim: ['CO', 'LA', 'AK'], lead: 'alya', tenggat: '2026-11-30' }, 'nynda', WAKTU + 5);
  assert.deepEqual([p.timProyek, p.lead, p.tenggat], [['CO', 'LA', 'AK'], 'alya', '2026-11-30']);
  assert.ok(I.bolehKelolaUmum('alya', p) && I.bolehKelolaUmum('dhea', p) && !I.bolehKelolaUmum('andika', p));
  I.setKeputusan(d, p, 'Hold', 'dhea', WAKTU + 6);
  assert.equal(I.ringkasProyek(d, p, HARI).keadaan, 'ditahan');
  // Menutup lewat tinjauan Manager (2.52.0): Lead tak mengarsipkan sendiri.
  assert.throws(() => I.setArsip(d, p, true, 'alya', WAKTU + 7), /ditinjau Manager/);
  I.setArsip(d, p, true, 'nynda', WAKTU + 7);
  assert.deepEqual([p.arsip, p.penutupan.status, p.penutupan.peninjau], [true, 'disetujui', 'nynda']);
  assert.throws(() => tugas(d, p, { pic: 'nadya' }), /melibatkan timnya|diarsipkan|Pilih profil/);
  const addie = I.proyekBaru(d, { name: 'ADDIE' }, 'nynda', WAKTU);
  assert.throws(() => I.setArsip(d, addie, true, 'dhea', WAKTU), /Hanya Manager/);
});

test('duplikat Proyek umum membawa tim, tahap, dan task di tahapnya; lewat perintah data juga', () => {
  const d = data();
  const r = I.jalankanPerintah(d, { aksi: 'proyekBaru', isi: { f: { jenis: 'umum', name: 'Rekrutmen', tim: ['CO'], tahap: ['Lowongan', 'Seleksi'] } }, oleh: 'dhea', at: WAKTU, hari: HARI });
  assert.ok(r.ok, r.galat);
  const p = d.projects[0];
  tugas(d, p, { title: 'CV', pic: 'nadya', tahapProyek: 'tp2' });
  const h = I.duplikatProyek(d, p, { name: 'Rekrutmen gelombang 2' }, 'dhea', WAKTU + 1, HARI);
  assert.deepEqual([h.project.jenis, h.project.timProyek, h.project.tahapUmum.map(x => x.id)], ['umum', ['CO'], ['tp1', 'tp2']]);
  assert.deepEqual(h.tasks.map(t => [t.title, t.tahapProyek, t.status, t.stage]), [['CV', 'tp2', 'Antre', '']]);
  assert.throws(() => I.duplikatProyek(d, p, {}, 'alya', WAKTU, HARI), /untuk timnya sendiri/);
});

test('penutupan Proyek umum (2.52.0): Lead mengajukan setelah semua task selesai, Manager meninjau', () => {
  const d = data();
  const p = rekrutmen(d);
  const t = tugas(d, p, { title: 'CV', pic: 'nadya', tahapProyek: 'tp2' });
  assert.equal(I.bolehAjukanTutup(d, p, 'dhea'), false, 'masih ada task terbuka');
  assert.throws(() => I.ajukanTutupUmum(d, p, '', 'dhea', WAKTU), /setelah semua task proyek selesai/);
  Object.assign(t, { status: 'Selesai', selesaiAt: WAKTU + 1 });
  assert.equal(I.ringkasProyek(d, p, HARI).keadaan, 'tuntas');
  assert.ok(I.bolehAjukanTutup(d, p, 'dhea') && !I.bolehAjukanTutup(d, p, 'nadya') && !I.bolehAjukanTutup(d, p, 'nynda'));
  assert.throws(() => I.ajukanTutupUmum(d, p, '', 'nadya', WAKTU), /Hanya Lead proyek/);
  I.ajukanTutupUmum(d, p, '8 guru siap mengajar', 'dhea', WAKTU + 2);
  assert.deepEqual([p.penutupan.status, p.penutupan.oleh, p.arsip, I.ringkasProyek(d, p, HARI).keadaan], ['diajukan', 'dhea', false, 'tinjauTutup']);
  assert.deepEqual(I.antreTutupUmum(d).map(x => x.id), [p.id]);
  assert.ok(I.notifikasi(d, 'nynda').some(n => n.jenis === 'tutupAju' && n.proyek === p.id && n.oleh === 'dhea'));
  assert.throws(() => I.ajukanTutupUmum(d, p, '', 'dhea', WAKTU), /sudah diajukan/);
  assert.throws(() => I.jawabTutupUmum(d, p, true, '', 'alya', WAKTU), /Hanya Manager/);
  // Dikembalikan dengan alasan; Lead diberi tahu, lalu mengajukan lagi.
  assert.throws(() => I.jawabTutupUmum(d, p, false, '', 'nynda', WAKTU), /Tulis alasannya/);
  I.jawabTutupUmum(d, p, false, 'Lampirkan daftar guru yang diterima', 'nynda', WAKTU + 3);
  assert.deepEqual([p.penutupan.status, p.arsip], ['dikembalikan', false]);
  assert.ok(I.notifikasi(d, 'dhea').some(n => n.jenis === 'tutupKembali' && n.teks === 'Lampirkan daftar guru yang diterima'));
  I.ajukanTutupUmum(d, p, '', 'dhea', WAKTU + 4);
  // Task baru membatalkan pengajuan.
  const baru = tugas(d, p, { title: 'Daftar guru', pic: 'nadya' });
  assert.equal(p.penutupan, null);
  Object.assign(baru, { status: 'Selesai', selesaiAt: WAKTU + 5 });
  I.ajukanTutupUmum(d, p, '', 'dhea', WAKTU + 6);
  I.jawabTutupUmum(d, p, true, '', 'nynda', WAKTU + 7);
  assert.deepEqual([p.arsip, p.penutupan.status, p.penutupan.peninjau, I.ringkasProyek(d, p, HARI).keadaan], [true, 'disetujui', 'nynda', 'arsip']);
  assert.ok(I.notifikasi(d, 'dhea').some(n => n.jenis === 'tutupSetuju' && n.proyek === p.id));
  assert.deepEqual(I.antreTutupUmum(d), []);
  // Diaktifkan lagi oleh Lead: penutupan lama tak berlaku.
  I.setArsip(d, p, false, 'dhea', WAKTU + 8);
  assert.deepEqual([p.arsip, p.penutupan], [false, null]);
  assert.ok(I.jalankanPerintah(d, { aksi: 'ajukanTutupUmum', isi: { proyek: p.id, catatan: '' }, oleh: 'dhea', at: WAKTU + 9 }).ok);
  assert.ok(I.jalankanPerintah(d, { aksi: 'jawabTutupUmum', isi: { proyek: p.id, setuju: true }, oleh: 'nynda', at: WAKTU + 10 }).ok);
  assert.equal(p.arsip, true);
});
