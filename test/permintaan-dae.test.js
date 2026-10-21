/* Permintaan ke tim DAE (2.46.0, permintaan user): anggota tim lain meminta DAE dari detail proyek,
   Lead DAE menerima (jadi task di inisiatif), bertanya, atau menolak, dan task yang lahir WAJIB
   ditinjau pengirimnya (setujui atau kembalikan untuk revisi). Manager hanya mengawasi. Yang diuji:
   aturan siapa boleh apa, transisi status, izin, notifikasi, data contoh, dan penyimpanan
   (perintah → perubahan → spreadsheet, data contoh dan data real). */
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JEDA_PIN_SALAH_MS = '0';
const I = require('../public/inti');
const rpc = require('../api/rpc');
const sheet = require('../api/_sheets');
const skema = require('../api/_skema');
const { tambahDemo } = require('../scripts/_demo');
const { dataDemo, SEKARANG } = require('./bantu/data-demo');
const { sheetPalsu } = require('./bantu/sheet-palsu');

const WAKTU = Date.UTC(2026, 9, 21, 3, 0, 0);
const jam = n => WAKTU + n * 3600e3;
const HARI = I.isoHari(WAKTU);
const BESOK = I.tambahHari(HARI, 1);
const DUE = I.tambahHari(HARI, 15);
const DAE_STAFF = { id: 'rio', nama: 'Rio Engineer', pendek: 'Rio', peran: 'staff', jabatan: 'Engineer', lead: 'ali', aktif: true };

test.afterEach(() => { I.aturOrang([]); I.aturMaster([]); });

/* Proyek OJK dengan task RAD, LNA, dan CLO (Manager menyusunnya), empat inisiatif DAE yang sudah
   dipetakan ke jenis permintaan. */
function dasar() {
  const d = I.dataKosong();
  const p = I.proyekBaru(d, { name: 'Riset OJK PCAM 10', platform: 'OJK' }, 'nynda', jam(-48));
  const t = (sub, pic, judul) => I.taskBaru(d, { title: judul, project: p.id, sub, pic }, 'nynda', jam(-47), I.isoHari(jam(-47)));
  t('A2', 'andika', 'Riset pola soal'); t('DV8', 'alya', 'Input soal'); t('I6', 'dhea', 'Live class');
  const ini = {};
  for (const nama of ['Generator Soal', 'Scraper dan data kompetitor', 'Dashboard dan laporan', 'Otomasi operasional']) {
    ini[nama] = I.inisiatifBaru(d, { nama, pic: 'ali' }, 'ali', jam(-40));
  }
  I.aturPetaMintaDae(d, { generator: ini['Generator Soal'].id, scraper: ini['Scraper dan data kompetitor'].id, dashboard: ini['Dashboard dan laporan'].id, lainnya: ini['Otomasi operasional'].id }, 'ali', jam(-39));
  return { d, p, ini };
}
const isi = (o = {}) => ({
  judul: 'Generator OJK Tahap 1', jenis: 'generator', kebutuhan: 'Butuh generator soal TPA dan TBI yang mengikuti blueprint D2.', due: DUE,
  bahan: [{ label: 'Blueprint soal OJK', url: 'https://contoh.id/blueprint' }, { label: '', url: 'https://contoh.id/rekap' }], ...o,
});
const kirim = (d, p, dari = 'andika', f = isi(), w = jam(0)) => I.kirimMintaDae(d, p, f, dari, w, I.isoHari(w));
/* Permintaan RAD yang sudah diterima Ali sebagai PIC: [m, task]. */
function diterima(o = {}) {
  const b = dasar();
  const m = kirim(b.d, b.p);
  const t = I.terimaMintaDae(b.d, m, { inisiatif: b.ini['Generator Soal'].id, pic: o.pic || 'ali', due: DUE }, 'ali', jam(1), HARI);
  return { ...b, m, t };
}
const aksi = (t, me, d) => I.aksiUntuk(t, me, I.indeks(d)).map(a => a.kunci);
const jenisNotif = (d, me) => I.notifikasi(d, me, 300).map(n => n.jenis);
const galat = (fn, pola) => assert.throws(fn, typeof pola === 'string' ? { message: pola } : pola);
const BUKAN_LEAD = /Hanya Lead yang menerima/;
const BUKAN_DAE = /diterima anggota tim DAE/;

test('izin baru: terima dan peta bawaannya Lead saja (Manager tidak), kirim dan tinjau tetap; Dev selalu boleh', () => {
  const x = k => I.IZIN.find(y => y.kunci === k);
  assert.deepEqual([x('permintaan.terima').peran, !!x('permintaan.terima').tetap], [['lead'], false]);
  assert.deepEqual([x('permintaan.peta').peran, !!x('permintaan.peta').tetap], [['lead'], false]);
  assert.deepEqual([!!x('permintaan.kirim').tetap, !!x('permintaan.tinjau').tetap], [true, true]);
  assert.ok(!x('permintaan.kirim').peran.includes('manager') && !x('permintaan.tinjau').peran.includes('manager'), 'Manager tak mengirim dan tak meninjau');
  assert.ok(I.daftarMaster('izin').some(y => y.kunci === 'permintaan.terima'), 'bisa diatur di Panel Dev → Izin');
  assert.ok(!I.daftarMaster('izin').some(y => y.kunci === 'permintaan.kirim'), 'yang tetap tak bisa diatur');
  // Lead DAE saja: Lead tim lain punya peran Lead tetapi bukan anggota DAE, Manager tak punya izin.
  assert.deepEqual(['ali', 'andika', 'alya', 'nynda', 'uma', I.DEV].map(me => I.bolehKelolaMintaDae(me)), [true, false, false, false, false, true]);
  assert.deepEqual(['ali', 'andika', 'nynda', 'uma', I.DEV, 'tidakada'].map(me => I.bolehLihatMintaDae(me)), [true, false, true, false, true, false], 'halaman: DAE, Manager (mengawasi), dan Dev');
  galat(() => I.tolakMintaDae({ permintaanDae: [], tasks: [], log: [] }, { status: 'menunggu' }, 'tidak cocok', 'nynda', 1), 'Hanya Lead yang menerima permintaan ke tim DAE.');
  galat(() => I.tolakMintaDae({ permintaanDae: [], tasks: [], log: [] }, { status: 'menunggu' }, 'tidak cocok', 'andika', 1), 'Permintaan ke tim DAE diterima anggota tim DAE.');
});

test('izin diatur Panel Dev: staff DAE bisa diberi izin terima; tim lain tetap tak bisa; Manager hanya bila dicentang', () => {
  I.aturOrang([DAE_STAFF]);
  assert.equal(I.bolehKelolaMintaDae('rio'), false, 'staff tanpa izin');
  I.aturMaster([I.periksaMaster('izin', { kunci: 'permintaan.terima', peran: ['lead', 'staff'] })]);
  assert.equal(I.bolehKelolaMintaDae('rio'), true);
  assert.equal(I.bolehKelolaMintaDae('uma'), false, 'staff RAD bukan anggota DAE');
  assert.equal(I.bolehKelolaMintaDae('nynda'), false, 'Manager tetap tidak');
  I.aturMaster([I.periksaMaster('izin', { kunci: 'permintaan.terima', peran: ['manager', 'lead'] })]);
  assert.equal(I.bolehKelolaMintaDae('nynda'), true, 'Manager boleh kalau Dev mencentangnya');
  I.aturMaster([I.periksaMaster('izin', { kunci: 'permintaan.terima', peran: [] })]);
  assert.equal(I.bolehKelolaMintaDae('ali'), false);
  assert.equal(I.bolehKelolaMintaDae(I.DEV), true);
  galat(() => I.tolakMintaDae({}, { status: 'menunggu' }, 'x', 'ali', 1), 'Tak ada peran yang boleh menerima permintaan ke tim DAE (diatur di Panel Dev → Izin).');
});

test('mengirim: anggota tim yang punya task di proyek; bukan Manager, bukan DAE, bukan proyek arsip', () => {
  const { d, p } = dasar();
  for (const dari of ['andika', 'uma', 'alya', 'kiki', 'dhea', 'bagas']) assert.equal(I.bolehMintaDae(d, p, dari), true, dari);
  const x = me => I.alasanTakBisaMintaDae(d, p, me);
  assert.match(x('nynda'), /Manager hanya mengawasi/);
  assert.match(x('ali'), /Anggota tim DAE membuat task biasa/);
  assert.match(x('tidakada'), /anggota tim pemilik proyek/);
  assert.match(x(I.DEV), /anggota tim pemilik proyek/);
  const sepi = I.proyekBaru(d, { name: 'Proyek LNA saja' }, 'nynda', jam(-3));
  I.taskBaru(d, { title: 'Input', project: sepi.id, sub: 'DV8', pic: 'alya' }, 'nynda', jam(-3), HARI);
  assert.equal(I.bolehMintaDae(d, sepi, 'alya'), true);
  assert.match(I.alasanTakBisaMintaDae(d, sepi, 'andika'), /yang punya task tim RAD/, 'RAD tak punya task di proyek itu');
  assert.deepEqual(I.timPemilikProyek(d, p).sort(), ['AK', 'CO', 'LA']);
  p.arsip = true;
  assert.match(x('andika'), /sudah diarsipkan/);
  galat(() => kirim(d, p), /sudah diarsipkan/);
  galat(() => kirim(d, null), 'Proyek tidak ditemukan.');
});

test('mengirim: isian divalidasi, tercatat dengan proyek asal, tim peminta, dan pengirim; statusnya Menunggu', () => {
  const { d, p } = dasar();
  const m = kirim(d, p, 'uma', isi({ judul: '  Generator   OJK  Tahap 1 ' }));
  assert.equal(m.id, 'MDA-001');
  assert.deepEqual([m.proyek, m.timPeminta, m.dari, m.judul, m.jenis, m.status, m.due, m.revisi], [p.id, 'AK', 'uma', 'Generator OJK Tahap 1', 'generator', 'menunggu', DUE, 0]);
  assert.deepEqual(m.bahan.map(l => [l.id, l.urutan, l.label]), [['MDA-001-b1', 1, 'Blueprint soal OJK'], ['MDA-001-b2', 2, 'contoh.id']], 'judul tautan kosong diisi dari alamatnya');
  assert.deepEqual([m.task, m.inisiatif, m.pic, m.oleh, m.utas], ['', '', '', '', []]);
  assert.equal(d.permintaanDae[0], m);
  assert.equal(kirim(d, p, 'alya').id, 'MDA-002');
  assert.ok(d.log.some(l => l.task.startsWith('MDA-001') && /Permintaan ke tim DAE dari Riset OJK/.test(l.detail)));
  galat(() => kirim(d, p, 'andika', isi({ judul: '' })), 'Tulis yang diminta.');
  galat(() => kirim(d, p, 'andika', isi({ judul: 'x'.repeat(201) })), /paling panjang 200/);
  galat(() => kirim(d, p, 'andika', isi({ jenis: '' })), 'Pilih jenis permintaan.');
  galat(() => kirim(d, p, 'andika', isi({ jenis: 'robot' })), 'Pilih jenis permintaan.');
  galat(() => kirim(d, p, 'andika', isi({ kebutuhan: 'x'.repeat(2001) })), /paling panjang 2.000/);
  galat(() => kirim(d, p, 'andika', isi({ due: 'kemarin' })), 'Tanggal tenggat tidak valid.');
  galat(() => kirim(d, p, 'andika', isi({ due: I.tambahHari(HARI, -1) })), 'Tenggat yang diharapkan sudah lewat.');
  galat(() => kirim(d, p, 'andika', isi({ bahan: [{ label: 'x', url: 'ftp://contoh.id' }] })), /bukan alamat web/);
  assert.equal(kirim(d, p, 'andika', isi({ due: '', bahan: [], kebutuhan: '' })).due, '', 'tenggat, bahan, dan kebutuhan boleh kosong');
  galat(() => I.kirimMintaDae(d, p, isi(), 'nynda', jam(0), HARI), /Manager hanya mengawasi/);
  assert.equal(d.permintaanDae.length, 3, 'yang ditolak tak tercatat');
});

test('tanya dulu → ditanya; pengirim membalas (kembali Menunggu) atau menyunting; tiap butir masuk utas', () => {
  const { d, p } = dasar();
  const m = kirim(d, p);
  galat(() => I.tanyaMintaDae(d, m, 'Berapa soal?', 'andika', jam(1)), BUKAN_DAE);
  galat(() => I.tanyaMintaDae(d, m, 'Berapa soal?', 'nynda', jam(1)), BUKAN_LEAD);
  galat(() => I.tanyaMintaDae(d, m, ' ', 'ali', jam(1)), 'Tulis pesannya dulu.');
  I.tanyaMintaDae(d, m, 'Berapa soal per tipe?', 'ali', jam(1));
  assert.deepEqual([m.status, m.utas.map(u => [u.jenis, u.oleh, u.teks])], ['ditanya', [['tanya', 'ali', 'Berapa soal per tipe?']]]);
  assert.deepEqual(I.langkahMintaDae(d, m), { kunci: 'dikirim', no: 1, tambahan: 'ditanya' });
  galat(() => I.balasMintaDae(d, m, '50 soal', 'uma', jam(2)), 'Hanya pengirim permintaan yang membalas pertanyaan.');
  // Pengirim menyunting selagi ditanya: status tetap Ditanya sampai ia membalas.
  I.ubahMintaDae(d, m, { kebutuhan: 'Tiap tipe 50 soal.', due: BESOK }, 'andika', jam(2), I.isoHari(jam(2)));
  assert.deepEqual([m.status, m.kebutuhan, m.due, m.judul, m.bahan.length], ['ditanya', 'Tiap tipe 50 soal.', BESOK, 'Generator OJK Tahap 1', 2]);
  galat(() => I.ubahMintaDae(d, m, { judul: 'Lain' }, 'alya', jam(2), HARI), /Hanya pengirim yang menyunting/);
  galat(() => I.ubahMintaDae(d, m, { jenis: 'x' }, 'andika', jam(2), HARI), 'Pilih jenis permintaan.');
  I.balasMintaDae(d, m, '50 soal per tipe, sudah saya tulis di kebutuhan.', 'andika', jam(3));
  assert.deepEqual([m.status, m.utas.map(u => u.jenis)], ['menunggu', ['tanya', 'catatan', 'balas']]);
  galat(() => I.balasMintaDae(d, m, 'lagi', 'andika', jam(4)), 'Tak ada pertanyaan yang menunggu balasan.');
  // Bisa ditanya lagi; ditolak juga boleh langsung dari Ditanya.
  I.tanyaMintaDae(d, m, 'Format keluaran?', 'ali', jam(5));
  assert.equal(m.status, 'ditanya');
  I.tolakMintaDae(d, m, 'Antrean penuh sampai akhir bulan.', 'ali', jam(6));
  assert.equal(m.status, 'ditolak');
  galat(() => I.tanyaMintaDae(d, m, 'masih?', 'ali', jam(7)), 'Permintaan ini sudah dijawab.');
  galat(() => I.ubahMintaDae(d, m, { judul: 'Lain' }, 'andika', jam(7), HARI), /Hanya pengirim yang menyunting/);
});

test('menolak: alasan wajib, hanya yang punya izin, pengirim dikabari; tak bisa diterima sesudahnya', () => {
  const { d, p, ini } = dasar();
  const m = kirim(d, p);
  galat(() => I.tolakMintaDae(d, m, 'Tidak ada waktu.', 'nynda', jam(1)), BUKAN_LEAD);
  galat(() => I.tolakMintaDae(d, m, 'Tidak ada waktu.', 'andika', jam(1)), BUKAN_DAE);
  galat(() => I.tolakMintaDae(d, m, ' ok ', 'ali', jam(1)), /Tulis alasannya/);
  galat(() => I.tolakMintaDae(d, m, 'x'.repeat(1001), 'ali', jam(1)), /paling panjang 1.000/);
  assert.equal(m.status, 'menunggu', 'yang ditolak aturan tak mengubah apa pun');
  I.tolakMintaDae(d, m, 'Lebih cocok dikerjakan tim CLO dengan template baru.', 'ali', jam(1));
  assert.deepEqual([m.status, m.alasan, m.oleh, m.jawabAt], ['ditolak', 'Lebih cocok dikerjakan tim CLO dengan template baru.', 'ali', jam(1)]);
  assert.deepEqual(I.langkahMintaDae(d, m), { kunci: 'ditolak', no: 0, tambahan: '' });
  galat(() => I.terimaMintaDae(d, m, { inisiatif: ini['Generator Soal'].id }, 'ali', jam(2), HARI), 'Permintaan ini sudah dijawab.');
  galat(() => I.tolakMintaDae(d, m, 'dua kali', 'ali', jam(2)), 'Permintaan ini sudah dijawab.');
  assert.equal(d.tasks.filter(t => t.permintaanDae).length, 0, 'tidak ada task yang dibuat');
});

test('menerima: task DAE di inisiatif pilihan (jalur rutin), keterangan dari kebutuhan dan bahan, tertaut ke permintaan dan proyek asal', () => {
  const { d, p, ini } = dasar();
  const m = kirim(d, p);
  galat(() => I.terimaMintaDae(d, m, { inisiatif: ini['Generator Soal'].id }, 'nynda', jam(1), HARI), BUKAN_LEAD);
  galat(() => I.terimaMintaDae(d, m, { inisiatif: ini['Generator Soal'].id }, 'andika', jam(1), HARI), BUKAN_DAE);
  galat(() => I.terimaMintaDae(d, m, {}, 'ali', jam(1), HARI), 'Pilih inisiatif tujuannya.');
  galat(() => I.terimaMintaDae(d, m, { inisiatif: 'INI-099' }, 'ali', jam(1), HARI), 'Pilih inisiatif tujuannya.');
  galat(() => I.terimaMintaDae(d, m, { inisiatif: ini['Generator Soal'].id, pic: 'uma' }, 'ali', jam(1), HARI), /PIC adalah anggota tim DAE/);
  galat(() => I.terimaMintaDae(d, m, { inisiatif: ini['Generator Soal'].id, due: 'besok' }, 'ali', jam(1), HARI), 'Tanggal tenggat tidak valid.');
  I.ubahInisiatif(d, ini['Scraper dan data kompetitor'], { status: 'ditunda' }, 'ali', jam(0));
  galat(() => I.terimaMintaDae(d, m, { inisiatif: ini['Scraper dan data kompetitor'].id }, 'ali', jam(1), HARI), /tidak aktif/);
  assert.deepEqual([m.status, d.tasks.filter(t => t.permintaanDae).length], ['menunggu', 0], 'penolakan tak meninggalkan sisa');

  const t = I.terimaMintaDae(d, m, { inisiatif: ini['Generator Soal'].id, pic: 'ali' }, 'ali', jam(1), HARI);
  assert.deepEqual([t.title, t.lane, t.project, t.inisiatif, t.kategori, t.pic, t.assignedBy, t.status, t.due, t.platform],
    ['Generator OJK Tahap 1', 'rutin', '', ini['Generator Soal'].id, 'Generator Soal', 'ali', 'ali', 'Antre', DUE, 'OJK'], 'tenggat bawaan = tenggat yang diharapkan');
  assert.deepEqual([t.permintaanDae, t.peminta], [m.id, 'andika']);
  assert.match(t.detail, /^Butuh generator soal TPA dan TBI/);
  assert.match(t.detail, /Bahan riset:\n- Blueprint soal OJK: https:\/\/contoh\.id\/blueprint\n- contoh\.id: https:\/\/contoh\.id\/rekap$/);
  assert.deepEqual([m.status, m.task, m.inisiatif, m.pic, m.oleh, m.dueTerima, m.jawabAt], ['diterima', t.id, ini['Generator Soal'].id, 'ali', 'ali', DUE, jam(1)]);
  assert.deepEqual(I.langkahMintaDae(d, m), { kunci: 'diterima', no: 2, tambahan: '' });
  assert.equal(I.asalMintaDae(d, t), m);
  assert.equal(I.taskMintaDae(d, m), t);
  galat(() => I.terimaMintaDae(d, m, { inisiatif: ini['Generator Soal'].id }, 'ali', jam(2), HARI), 'Permintaan ini sudah dijawab.');
  galat(() => I.tanyaMintaDae(d, m, 'lagi?', 'ali', jam(2)), 'Permintaan ini sudah dijawab.');
  // Tenggat boleh diganti saat menerima, dan dikosongkan.
  const m2 = kirim(d, p, 'alya', isi({ judul: 'Dashboard', jenis: 'dashboard' }), jam(2));
  assert.equal(I.terimaMintaDae(d, m2, { inisiatif: ini['Dashboard dan laporan'].id, due: BESOK }, 'ali', jam(3), HARI).due, BESOK);
});

test('PIC bisa staff DAE; tanpa orang sah yang bisa meninjau selain PIC, permintaan tak bisa diterima', () => {
  I.aturOrang([DAE_STAFF]);
  const { d, m, t } = diterima({ pic: 'rio' });
  assert.deepEqual([t.pic, t.assignedBy, I.peninjau(t)], ['rio', 'ali', 'andika']);
  // Pengirim yang ternyata anggota DAE (pindah tim) dan sekaligus PIC: tak ada Lead lain yang bisa meninjau.
  const { d: d2, p: p2, ini } = dasar();
  const m2 = kirim(d2, p2);
  m2.dari = 'ali';
  galat(() => I.terimaMintaDae(d2, m2, { inisiatif: ini['Generator Soal'].id, pic: 'ali' }, 'ali', jam(1), HARI), /Tak ada orang di tim peminta yang bisa meninjau/);
  assert.equal(I.terimaMintaDae(d2, m2, { inisiatif: ini['Generator Soal'].id, pic: 'rio' }, 'ali', jam(1), HARI).pic, 'rio', 'PIC lain: pengirim meninjau');
  assert.ok(m.id);
  assert.equal(d.tasks.length, 4);
});

test('peninjau = pengirim; pengirim tak aktif atau sekaligus PIC digantikan Lead tim peminta; tak pernah PIC, tak pernah Manager', () => {
  const { t } = diterima();
  assert.equal(I.peninjau(t), 'andika');
  assert.equal(I.peninjauDae(t), 'andika');
  const baru = peminta => ({ permintaanDae: 'MDA-001', peminta, pic: 'ali' });
  assert.equal(I.peninjauDae(baru('uma')), 'uma', 'staff RAD meninjau permintaannya sendiri');
  assert.equal(I.peninjauDae({ permintaanDae: 'MDA-001', peminta: 'ali', pic: 'ali' }), I.DEV, 'pengirim = PIC dan Lead-nya PIC juga: jatuh ke Dev');
  assert.equal(I.peninjauDae({ permintaanDae: 'MDA-001', peminta: 'uma', pic: 'uma' }), 'andika', 'pengirim = PIC: Lead tim peminta');
  assert.equal(I.peninjauDae({ permintaanDae: 'MDA-001', peminta: 'nynda', pic: 'ali' }), I.DEV, 'Manager tak pernah jadi gerbang');
  assert.equal(I.peninjauDae({ permintaanDae: '', peminta: 'uma', pic: 'ali' }), '', 'bukan task dari permintaan');
  // Pengirim yang juga PIC tak bisa menyetujui task-nya sendiri; Lead timnya yang bisa.
  const sendiri = { lane: 'rutin', status: 'Ditinjau', permintaanDae: 'MDA-001', peminta: 'uma', pic: 'uma', tinjauan: [], subtasks: [], evidence: [] };
  const kosong = I.indeks(I.dataKosong());
  assert.deepEqual([I.aksiUntuk(sendiri, 'uma', kosong), I.aksiUntuk(sendiri, 'andika', kosong), I.aksiUntuk(sendiri, 'nynda', kosong)].map(a => a.map(x => x.kunci)), [['tarik'], ['setujui', 'kembalikan'], []]);
  // Pengirim dinonaktifkan: Lead timnya. Lead yang dinonaktifkan: Lead penggantinya, atau Dev kalau tak ada.
  I.aturOrang([{ id: 'uma', nama: 'Uma', pendek: 'Uma', peran: 'staff', jabatan: 'Akademik', lead: 'andika', aktif: false }]);
  assert.equal(I.peninjauDae(baru('uma')), 'andika');
  // Lead yang dinonaktifkan (stafnya dipindah dulu, kalau tidak organogram ditolak): Lead pengganti timnya, atau Dev kalau tim itu dipegang Manager.
  const andikaMati = { id: 'andika', nama: 'Andika', pendek: 'Andika', peran: 'lead', jabatan: 'Riset', lead: 'nynda', tim: 'AK', aktif: false };
  const staf = lead => ['uma', 'tri', 'wildan'].map(id => ({ id, nama: id, pendek: id[0].toUpperCase() + id.slice(1), peran: 'staff', jabatan: 'Akademik', lead, aktif: true }));
  assert.equal(I.aturOrang([andikaMati, ...staf('alya')]), '');
  assert.equal(I.peninjauDae(baru('andika')), I.DEV, 'tim RAD sementara dipegang Manager: Dev, bukan Manager');
  assert.equal(I.aturOrang([andikaMati, { id: 'rani', nama: 'Rani', pendek: 'Rani', peran: 'lead', jabatan: 'Akademik', lead: 'nynda', tim: 'AK', aktif: true }, ...staf('rani')]), '');
  assert.equal(I.peninjauDae(baru('andika')), 'rani', 'Lead pengganti tim RAD');
});

test('pengerjaan: PIC mengisi output lalu mengajukan ke pengirim; pengirim menyetujui → task dan permintaan Selesai', () => {
  const { d, m, t } = diterima();
  // PIC tak punya tombol Tandai selesai: hasilnya wajib ditinjau pengirim.
  assert.deepEqual(aksi(t, 'ali', d), ['mulai', 'tahan']);
  I.terapkanAksi(d, t, 'mulai', 'ali', jam(2));
  assert.deepEqual(I.langkahMintaDae(d, m), { kunci: 'dikerjakan', no: 3, tambahan: '' });
  const ajukan = () => I.aksiUntuk(t, 'ali', I.indeks(d)).find(a => a.kunci === 'ajukan');
  assert.equal(ajukan().nonaktif, true);
  assert.match(ajukan().alasan, /output terisi/);
  assert.equal(ajukan().label, 'Ajukan tinjau ke Andika');
  assert.ok(!aksi(t, 'ali', d).includes('selesai'));
  galat(() => I.terapkanAksi(d, t, 'selesai', 'ali', jam(3)), 'Aksi ini tidak tersedia untuk Anda.');
  galat(() => I.terapkanAksi(d, t, 'ajukan', 'ali', jam(3)), /output terisi/);
  I.isiOutput(d, t, 'Generator TPA dan TBI, 200 soal, repo dan CSV', 'ali', jam(4));
  assert.equal(ajukan().nonaktif, false);
  I.terapkanAksi(d, t, 'ajukan', 'ali', jam(5));
  assert.deepEqual([t.status, I.langkahMintaDae(d, m).kunci, I.waktuKumpul(t)], ['Ditinjau', 'ditinjau', jam(5)]);
  // Pengirim menyetujui atau mengembalikan; PIC dan Manager tidak.
  assert.deepEqual(aksi(t, 'andika', d), ['setujui', 'kembalikan']);
  assert.deepEqual(aksi(t, 'ali', d), ['tarik'], 'PIC tak bisa menyetujui task-nya sendiri');
  assert.deepEqual(aksi(t, 'nynda', d), [], 'Manager hanya memantau');
  assert.deepEqual(aksi(t, 'alya', d), []);
  galat(() => I.terapkanAksi(d, t, 'setujui', 'nynda', jam(6)), 'Aksi ini tidak tersedia untuk Anda.');
  galat(() => I.terapkanAksi(d, t, 'setujui', 'ali', jam(6)), 'Aksi ini tidak tersedia untuk Anda.');
  I.terapkanAksi(d, t, 'setujui', 'andika', jam(7));
  assert.deepEqual([t.status, t.selesaiAt, m.status, m.selesaiAt, I.langkahMintaDae(d, m)], ['Selesai', jam(7), 'selesai', jam(7), { kunci: 'selesai', no: 5, tambahan: '' }]);
  // Dibuka kembali PIC: permintaan kembali Diterima sampai disetujui lagi.
  I.terapkanAksi(d, t, 'buka', 'ali', jam(8));
  assert.deepEqual([t.status, m.status, m.selesaiAt, I.langkahMintaDae(d, m).kunci], ['Dikerjakan', 'diterima', 0, 'dikerjakan']);
});

test('revisi: dikembalikan pengirim dengan catatan wajib, PIC dikabari, putaran dihitung dan bisa berulang', () => {
  const { d, m, t } = diterima();
  I.terapkanAksi(d, t, 'mulai', 'ali', jam(2));
  I.isiOutput(d, t, 'Versi 1', 'ali', jam(3));
  I.terapkanAksi(d, t, 'ajukan', 'ali', jam(4));
  galat(() => I.terapkanAksi(d, t, 'kembalikan', 'andika', jam(5), ''), 'Tulis alasannya dulu.');
  assert.equal(t.status, 'Ditinjau', 'tanpa catatan tak berubah');
  I.terapkanAksi(d, t, 'kembalikan', 'andika', jam(5), 'Tipe verbal belum ada kunci jawaban.');
  assert.deepEqual([t.status, m.status, m.revisi, I.labelKeadaan(t, I.indeks(d))], ['Dikerjakan', 'diterima', 1, 'Revisi']);
  assert.deepEqual(I.langkahMintaDae(d, m), { kunci: 'dikerjakan', no: 3, tambahan: 'revisi' });
  assert.equal(I.revisiTerakhir(t).note, 'Tipe verbal belum ada kunci jawaban.');
  const kembali = I.notifikasi(d, 'ali', 100).find(n => n.jenis === 'kembali');
  assert.deepEqual([kembali.oleh, kembali.teks, kembali.task], ['andika', 'Tipe verbal belum ada kunci jawaban.', t.id], 'PIC dikabari beserta catatannya');
  // Putaran kedua; sesudah diajukan lagi, tak lagi berlabel revisi.
  I.terapkanAksi(d, t, 'ajukan', 'ali', jam(6));
  assert.deepEqual(I.langkahMintaDae(d, m), { kunci: 'ditinjau', no: 4, tambahan: '' });
  I.terapkanAksi(d, t, 'kembalikan', 'andika', jam(7), 'Tambahkan pembahasan.');
  assert.equal(m.revisi, 2);
  I.terapkanAksi(d, t, 'ajukan', 'ali', jam(8));
  I.terapkanAksi(d, t, 'setujui', 'andika', jam(9));
  assert.deepEqual([m.status, m.revisi, t.tinjauan.map(r => r.action)], ['selesai', 2, ['Diajukan', 'Dikembalikan', 'Diajukan', 'Dikembalikan', 'Diajukan', 'Disetujui']]);
});

test('PIC menarik dari tinjauan: kembali Dikerjakan tanpa menghitung revisi', () => {
  const { d, m, t } = diterima();
  I.terapkanAksi(d, t, 'mulai', 'ali', jam(2));
  I.isiOutput(d, t, 'Draf', 'ali', jam(3));
  I.terapkanAksi(d, t, 'ajukan', 'ali', jam(4));
  I.terapkanAksi(d, t, 'tarik', 'ali', jam(5));
  assert.deepEqual([t.status, m.revisi, I.langkahMintaDae(d, m).tambahan], ['Dikerjakan', 0, '']);
});

test('task dari permintaan tetap di inisiatifnya (boleh pindah ke inisiatif lain); task turunannya tanpa tinjauan', () => {
  const { d, t, m, ini } = diterima();
  galat(() => I.tempelInisiatif(d, t, '', 'ali', jam(2)), /tetap berada di sebuah inisiatif/);
  galat(() => I.sambungProyek(d, t, d.projects[0].id, 'ali', jam(2)), /tetap berada di inisiatifnya/);
  I.tempelInisiatif(d, t, ini['Otomasi operasional'].id, 'ali', jam(2));
  assert.deepEqual([t.inisiatif, t.permintaanDae, I.peninjau(t)], [ini['Otomasi operasional'].id, m.id, 'andika']);
  const anak = I.taskAnak(d, t, { title: 'Validator', pic: 'ali' }, 'ali', jam(3), HARI);
  assert.deepEqual([anak.permintaanDae, I.peninjau(anak)], ['', null], 'turunan rutin biasa, tanpa tinjauan');
  assert.equal(t.status, 'Dikerjakan', 'dibagi ke task turunan = langsung dimulai');
  I.isiOutput(d, t, 'x', 'ali', jam(5));
  assert.match(I.aksiUntuk(t, 'ali', I.indeks(d)).find(a => a.kunci === 'ajukan').alasan, /task turunan/);
});

test('task dihapus selagi dikerjakan: permintaan kembali Menunggu dan bisa diterima lagi; pemulihan melepas tautannya', () => {
  const { d, p, m, t, ini } = diterima();
  I.terapkanAksi(d, t, 'mulai', 'ali', jam(2));
  I.hapusTask(d, [t.id], 'ali', jam(3));
  assert.deepEqual([m.status, m.task, m.inisiatif, m.pic, m.oleh, m.utas.map(u => u.jenis)], ['menunggu', '', '', '', '', ['catatan']]);
  assert.match(m.utas[0].teks, new RegExp(`Task ${t.id} dihapus Ali`));
  const t2 = I.terimaMintaDae(d, m, { inisiatif: ini['Generator Soal'].id, pic: 'ali' }, 'ali', jam(4), HARI);
  assert.notEqual(t2.id, t.id, 'nomor task tak dipakai ulang');
  assert.equal(m.task, t2.id);
  // Task yang sudah disetujui lalu dihapus: permintaan tetap Selesai.
  I.terapkanAksi(d, t2, 'mulai', 'ali', jam(5));
  I.isiOutput(d, t2, 'x', 'ali', jam(6));
  I.terapkanAksi(d, t2, 'ajukan', 'ali', jam(7));
  I.terapkanAksi(d, t2, 'setujui', 'andika', jam(8));
  I.hapusTask(d, [t2.id], 'ali', jam(9));
  assert.equal(m.status, 'selesai');
  assert.equal(I.langkahMintaDae(d, m).kunci, 'selesai');
  assert.equal(I.taskMintaDae(d, m), null);
  // Pulihkan: jadi rutin biasa, tanpa tautan ke permintaan.
  const pulih = I.pulihkanTask(d, { task: t2.id, asal: { ...t2 }, inisiatif: ini['Generator Soal'].id }, 'ali', jam(10));
  assert.deepEqual([pulih.permintaanDae, pulih.peminta, I.peninjau(pulih)], ['', '', null]);
  assert.ok(p.id);
});

test('komentar: pengirim, anggota DAE, dan Manager (pengawas) boleh; tim lain tidak; status tak berubah', () => {
  const { d, p } = dasar();
  const m = kirim(d, p);
  I.komentariMintaDae(d, m, 'Prioritaskan TPA dulu.', 'nynda', jam(1));
  I.komentariMintaDae(d, m, 'Siap, TPA dulu.', 'andika', jam(2));
  I.komentariMintaDae(d, m, 'Dicatat.', 'ali', jam(3));
  assert.deepEqual([m.status, m.utas.map(u => [u.jenis, u.oleh])], ['menunggu', [['komentar', 'nynda'], ['komentar', 'andika'], ['komentar', 'ali']]]);
  galat(() => I.komentariMintaDae(d, m, 'Saya ikut ya', 'uma', jam(4)), /ditulis pengirimnya, anggota tim DAE, atau Manager/);
  galat(() => I.komentariMintaDae(d, m, ' ', 'nynda', jam(4)), 'Tulis pesannya dulu.');
  assert.equal(I.bolehKomentarMintaDae(m, 'nynda'), true);
  assert.equal(I.bolehKomentarMintaDae(m, 'uma'), false);
  // Manager tetap bisa berkomentar sesudah diterima dan selesai, tetapi tak bisa menerima atau meninjau.
  I.terimaMintaDae(d, m, { inisiatif: d.inisiatif[0].id }, 'ali', jam(5), HARI);
  I.komentariMintaDae(d, m, 'Tolong kabari kalau ada kendala.', 'nynda', jam(6));
  assert.equal(m.utas.length, 4);
  galat(() => I.terimaMintaDae(d, kirim(d, p, 'alya'), { inisiatif: d.inisiatif[0].id }, 'nynda', jam(7), HARI), /Hanya Lead yang menerima/);
});

test('peta jenis → inisiatif: disimpan di inisiatif, satu jenis satu inisiatif, hanya Lead DAE; jenis kosong = wajib pilih saat menerima', () => {
  const { d, ini } = dasar();
  const g = ini['Generator Soal'].id, s = ini['Scraper dan data kompetitor'].id;
  assert.deepEqual(I.petaMintaDae(d), { generator: g, scraper: s, dashboard: ini['Dashboard dan laporan'].id, lainnya: ini['Otomasi operasional'].id });
  assert.deepEqual(d.inisiatif.find(x => x.id === g).menerima, ['generator']);
  assert.deepEqual(I.inisiatifBaru(d, { nama: 'Baru', pic: 'ali' }, 'ali', jam(1)).menerima, [], 'inisiatif baru belum menerima apa pun');
  // Memindahkan generator ke Scraper melepasnya dari Generator Soal.
  I.aturPetaMintaDae(d, { generator: s, scraper: s }, 'ali', jam(2));
  assert.deepEqual(d.inisiatif.find(x => x.id === s).menerima, ['generator', 'scraper']);
  assert.deepEqual(d.inisiatif.find(x => x.id === g).menerima, []);
  assert.deepEqual(I.petaMintaDae(d), { generator: s, scraper: s }, 'yang tak dipilih dilepas: dashboard dan lainnya kosong');
  assert.ok(d.log.some(l => /Peta jenis → inisiatif diubah/.test(l.detail)));
  const log = d.log.length;
  I.aturPetaMintaDae(d, { generator: s, scraper: s }, 'ali', jam(3));
  assert.equal(d.log.length, log, 'tanpa perubahan, tanpa catatan');
  galat(() => I.aturPetaMintaDae(d, { generator: g }, 'nynda', jam(4)), 'Hanya Lead yang mengatur peta jenis permintaan.');
  galat(() => I.aturPetaMintaDae(d, { generator: g }, 'andika', jam(4)), 'Peta jenis permintaan diatur anggota tim DAE.');
  galat(() => I.aturPetaMintaDae(d, { generator: 'INI-099' }, 'ali', jam(4)), /tidak ditemukan/);
  I.ubahInisiatif(d, d.inisiatif.find(x => x.id === g), { status: 'selesai' }, 'ali', jam(4));
  galat(() => I.aturPetaMintaDae(d, { generator: g }, 'ali', jam(5)), /sudah selesai/);
  // Inisiatif yang tak aktif tidak jadi bawaan.
  I.ubahInisiatif(d, d.inisiatif.find(x => x.id === s), { status: 'ditunda' }, 'ali', jam(5));
  assert.deepEqual(I.petaMintaDae(d), {});
  assert.deepEqual(d.inisiatif.find(x => x.id === s).menerima, ['generator', 'scraper'], 'ubah inisiatif tak menghapus petanya');
});

test('permintaan terbuka per inisiatif: yang belum dijawab menurut peta, ditambah yang diterima dan belum selesai', () => {
  const { d, p, ini } = dasar();
  const n = nama => I.mintaDaeTerbuka(d, ini[nama]);
  assert.deepEqual(['Generator Soal', 'Scraper dan data kompetitor', 'Dashboard dan laporan', 'Otomasi operasional'].map(n), [0, 0, 0, 0]);
  const m1 = kirim(d, p);
  const m2 = kirim(d, p, 'alya', isi({ judul: 'Scraper', jenis: 'scraper' }), jam(1));
  kirim(d, p, 'dhea', isi({ judul: 'Rapikan PDF', jenis: 'lainnya' }), jam(2));
  assert.deepEqual(['Generator Soal', 'Scraper dan data kompetitor', 'Dashboard dan laporan', 'Otomasi operasional'].map(n), [1, 1, 0, 1]);
  I.tanyaMintaDae(d, m2, 'Sumbernya apa?', 'ali', jam(3));
  assert.equal(n('Scraper dan data kompetitor'), 1, 'ditanya masih terbuka');
  // Diterima ke inisiatif lain dari yang dipetakan: terhitung di tempatnya diterima.
  const t = I.terimaMintaDae(d, m1, { inisiatif: ini['Otomasi operasional'].id }, 'ali', jam(4), HARI);
  assert.deepEqual([n('Generator Soal'), n('Otomasi operasional')], [0, 2]);
  I.tolakMintaDae(d, m2, 'Belum ada kapasitas.', 'ali', jam(5));
  assert.equal(n('Scraper dan data kompetitor'), 0, 'ditolak tak terbuka');
  I.terapkanAksi(d, t, 'mulai', 'ali', jam(6));
  I.isiOutput(d, t, 'x', 'ali', jam(7));
  I.terapkanAksi(d, t, 'ajukan', 'ali', jam(8));
  I.terapkanAksi(d, t, 'setujui', 'andika', jam(9));
  assert.equal(n('Otomasi operasional'), 1, 'yang selesai tak terbuka; tinggal permintaan CLO yang menunggu');
  assert.equal(I.mintaDaeMenunggu(d).length, 1);
});

test('notifikasi: permintaan baru, ditanya, dibalas, komentar, ditolak, diterima, siap ditinjau, revisi, selesai', () => {
  I.aturOrang([DAE_STAFF]);
  const { d, p, ini } = dasar();
  const m = kirim(d, p);
  // Baru: Lead DAE saja (bukan Manager, bukan pengirim, bukan tim lain).
  assert.deepEqual(['ali', 'nynda', 'andika', 'alya', 'rio'].map(me => jenisNotif(d, me).includes('daeBaru')), [true, false, false, false, false]);
  const baru = I.notifikasi(d, 'ali', 50).find(n => n.jenis === 'daeBaru');
  assert.deepEqual([baru.oleh, baru.minta, baru.mintaDae, baru.proyek, baru.at], ['andika', 'Generator OJK Tahap 1', m.id, p.id, m.createdAt]);
  I.tanyaMintaDae(d, m, 'Berapa soal?', 'ali', jam(1));
  const tanya = I.notifikasi(d, 'andika', 50).find(n => n.jenis === 'daeTanya');
  assert.deepEqual([tanya.oleh, tanya.teks, tanya.proyek], ['ali', 'Berapa soal?', p.id]);
  assert.ok(!jenisNotif(d, 'ali').includes('daeTanya'), 'penanya tak diberi tahu pertanyaannya sendiri');
  I.balasMintaDae(d, m, '200 soal', 'andika', jam(2));
  assert.deepEqual([jenisNotif(d, 'ali').includes('daeBalas'), jenisNotif(d, 'andika').includes('daeBalas'), jenisNotif(d, 'nynda').includes('daeBalas')], [true, false, false]);
  I.komentariMintaDae(d, m, 'Mohon dikerjakan sebelum TO 1.', 'nynda', jam(3));
  assert.deepEqual([jenisNotif(d, 'ali').includes('daeKomentar'), jenisNotif(d, 'andika').includes('daeKomentar'), jenisNotif(d, 'nynda').includes('daeKomentar'), jenisNotif(d, 'uma').includes('daeKomentar')], [true, true, false, false]);
  // Ditolak: pengirim.
  const tolak = kirim(d, p, 'alya', isi({ judul: 'Scraper', jenis: 'scraper' }), jam(4));
  I.tolakMintaDae(d, tolak, 'Belum ada kapasitas.', 'ali', jam(5));
  const nt = I.notifikasi(d, 'alya', 50).find(n => n.jenis === 'daeTolak');
  assert.deepEqual([nt.oleh, nt.teks, nt.minta], ['ali', 'Belum ada kapasitas.', 'Scraper']);
  assert.ok(!jenisNotif(d, 'andika').includes('daeTolak'));
  // Diterima: pengirim; PIC (staff DAE) mendapat task baru.
  const t = I.terimaMintaDae(d, m, { inisiatif: ini['Generator Soal'].id, pic: 'rio' }, 'ali', jam(6), HARI);
  const nr = I.notifikasi(d, 'andika', 50).find(n => n.jenis === 'daeTerima');
  assert.deepEqual([nr.oleh, nr.task, nr.mintaDae], ['ali', t.id, m.id]);
  assert.ok(jenisNotif(d, 'rio').includes('baru'), 'PIC mendapat notifikasi task baru');
  // Siap ditinjau: pengirim (bukan Manager, bukan Lead DAE).
  I.terapkanAksi(d, t, 'mulai', 'rio', jam(7));
  I.isiOutput(d, t, 'Repo generator', 'rio', jam(8));
  I.terapkanAksi(d, t, 'ajukan', 'rio', jam(9));
  assert.deepEqual(['andika', 'nynda', 'ali', 'rio'].map(me => jenisNotif(d, me).includes('tinjau')), [true, false, false, false]);
  // Revisi: PIC. Lalu selesai: Lead yang menerima dan PIC ("setuju"), bukan penyetujunya.
  I.terapkanAksi(d, t, 'kembalikan', 'andika', jam(10), 'Perlu pembahasan.');
  assert.ok(jenisNotif(d, 'rio').includes('kembali'));
  I.terapkanAksi(d, t, 'ajukan', 'rio', jam(11));
  I.terapkanAksi(d, t, 'setujui', 'andika', jam(12));
  assert.deepEqual(['rio', 'ali', 'andika', 'nynda'].map(me => [jenisNotif(d, me).includes('setuju'), jenisNotif(d, me).includes('daeSelesai')]),
    [[true, false], [false, true], [false, false], [false, false]]);
  const selesai = I.notifikasi(d, 'ali', 100).find(n => n.jenis === 'daeSelesai');
  assert.deepEqual([selesai.oleh, selesai.task, selesai.at], ['andika', t.id, jam(12)]);
  // Dev tak diberi tahu soal permintaan.
  assert.ok(!jenisNotif(d, I.DEV).some(j => /^dae/.test(j)));
});

test('Hari Ini: task yang menunggu tinjauan masuk daftar tinjauan pengirim, bukan Manager', () => {
  const { d, m, t } = diterima();
  I.terapkanAksi(d, t, 'mulai', 'ali', jam(2));
  I.isiOutput(d, t, 'Hasil', 'ali', jam(3));
  I.terapkanAksi(d, t, 'ajukan', 'ali', jam(4));
  const tinjau = me => (I.pekerjaanSaya(d, me, HARI).grup.find(g => g.kunci === 'tinjau') || { isi: [] }).isi.map(x => x.t.id);
  assert.deepEqual([tinjau('andika'), tinjau('nynda'), tinjau('ali')], [[t.id], [], []]);
  assert.deepEqual([I.perhatian(d, null, 'andika', HARI).tinjau, I.perhatian(d, null, 'nynda', HARI).tinjau], [1, 0]);
  assert.match(I.alasanTunggu(t, I.indeks(d)), /Menunggu tinjauan Andika/);
  assert.ok(m.id);
});

test('perintah data real: dijalankan dengan aturan yang sama, perubahan disimpan dan diterapkan apa adanya', () => {
  for (const nama of ['kirimMintaDae', 'ubahMintaDae', 'terimaMintaDae', 'tolakMintaDae', 'tanyaMintaDae', 'balasMintaDae', 'komentariMintaDae', 'aturPetaMintaDae']) {
    assert.ok(Object.prototype.hasOwnProperty.call(I.AKSI_DATA, nama), nama);
    assert.doesNotThrow(() => I.periksaPerintah({ id: 'abc123', aksi: nama, isi: {} }), nama);
  }
  assert.ok(I.KOLEKSI_REAL.includes('permintaanDae'));
  assert.deepEqual(I.dataKosong().permintaanDae, []);

  const a = I.dataKosong(), b = I.dataKosong();
  let n = 0;
  const jalan = (aksi, isiPerintah, oleh, w) => {
    const sebelum = JSON.parse(JSON.stringify(a));
    const r = I.jalankanPerintah(a, { id: 'p' + String(++n).padStart(6, '0'), aksi, isi: isiPerintah, oleh, at: w, hari: I.isoHari(w) });
    assert.ok(r.ok, `${aksi} oleh ${oleh}: ${r.galat}`);
    I.terapkanUbah(b, JSON.parse(JSON.stringify(I.bedaData(sebelum, a))));
    return r.hasil;
  };
  const prj = jalan('proyekBaru', { f: { name: 'Riset OJK' } }, 'nynda', jam(0));
  jalan('taskBaru', { f: { title: 'Riset', project: prj.id, sub: 'A2', pic: 'andika' } }, 'nynda', jam(1));
  const ini = jalan('inisiatifBaru', { f: { nama: 'Generator Soal', pic: 'ali' } }, 'ali', jam(2));
  jalan('aturPetaMintaDae', { peta: { generator: ini.id } }, 'ali', jam(3));
  const m = jalan('kirimMintaDae', { proyek: prj.id, f: isi({ due: '' }) }, 'andika', jam(4));
  jalan('tanyaMintaDae', { permintaan: m.id, teks: 'Berapa soal?' }, 'ali', jam(5));
  jalan('balasMintaDae', { permintaan: m.id, teks: '200' }, 'andika', jam(6));
  jalan('komentariMintaDae', { permintaan: m.id, teks: 'Ok' }, 'nynda', jam(7));
  jalan('ubahMintaDae', { permintaan: m.id, f: { kebutuhan: 'Lebih rinci' } }, 'andika', jam(8));
  const t = jalan('terimaMintaDae', { permintaan: m.id, f: { inisiatif: ini.id, pic: 'ali' } }, 'ali', jam(9));
  jalan('terapkanAksi', { task: t.id, kunci: 'mulai' }, 'ali', jam(10));
  jalan('isiOutput', { task: t.id, isi: 'Hasil' }, 'ali', jam(11));
  jalan('terapkanAksi', { task: t.id, kunci: 'ajukan' }, 'ali', jam(12));
  jalan('terapkanAksi', { task: t.id, kunci: 'kembalikan', catatan: 'Perbaiki' }, 'andika', jam(13));
  jalan('terapkanAksi', { task: t.id, kunci: 'ajukan' }, 'ali', jam(14));
  jalan('terapkanAksi', { task: t.id, kunci: 'setujui' }, 'andika', jam(15));
  const m2 = jalan('kirimMintaDae', { proyek: prj.id, f: isi({ judul: 'Lain', due: '' }) }, 'andika', jam(16));
  jalan('tolakMintaDae', { permintaan: m2.id, alasan: 'Tidak sekarang' }, 'ali', jam(17));
  const bersama = x => JSON.stringify(Object.fromEntries([...I.KOLEKSI_REAL, 'log'].map(k => [k, x[k]])));
  assert.equal(bersama(b), bersama(a), 'data browser = data server');
  assert.deepEqual(b.permintaanDae.map(x => [x.id, x.status, x.revisi]), [['MDA-002', 'ditolak', 0], ['MDA-001', 'selesai', 1]], 'terbaru di depan');
  assert.deepEqual(b.permintaanDae[1].utas.map(u => u.jenis), ['tanya', 'balas', 'komentar', 'catatan']);
  // Yang melanggar aturan ditolak dengan pesannya dan tak mengubah apa pun.
  const ditolak = I.jalankanPerintah(a, { id: 'p999999', aksi: 'terimaMintaDae', isi: { permintaan: m2.id, f: { inisiatif: ini.id } }, oleh: 'nynda', at: jam(20), hari: HARI });
  assert.deepEqual([ditolak.ok, ditolak.galat], [false, 'Hanya Lead yang menerima permintaan ke tim DAE.']);
  assert.equal(I.jalankanPerintah(a, { id: 'p999998', aksi: 'tolakMintaDae', isi: { permintaan: 'MDA-404', alasan: 'x' }, oleh: 'ali', at: jam(20), hari: HARI }).galat, 'Permintaan ke tim DAE MDA-404 tidak ditemukan.');
});

test('skema spreadsheet: tab permintaan_dae beserta bahan dan utasnya tertulis dan terbaca kembali; sheet lama tanpa tab itu tetap terbaca', async () => {
  for (const tab of ['permintaan_dae', 'permintaan_dae_links', 'permintaan_dae_utas']) {
    assert.ok(skema.TAB[tab], tab);
    assert.ok(skema.TAB_OPSIONAL.has(tab), `${tab}: sheet yang diimpor sebelum 2.46.0 tetap terbaca`);
  }
  assert.ok(skema.TAB.tasks.includes('permintaanDae') && skema.TAB.tasks.includes('peminta'));
  assert.ok(skema.TAB.inisiatif.includes('menerima'));
  const { d, t } = (() => {
    const b = dasar();
    const m = kirim(b.d, b.p);
    I.tanyaMintaDae(b.d, m, 'Berapa?', 'ali', jam(1));
    I.balasMintaDae(b.d, m, '200', 'andika', jam(2));
    return { ...b, t: I.terimaMintaDae(b.d, m, { inisiatif: b.ini['Generator Soal'].id, pic: 'ali' }, 'ali', jam(3), HARI) };
  })();
  const p = sheetPalsu([{ title: 'Sheet1', sheetId: 0 }]);
  const ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcd';
  const tulis = await sheet.tulisContoh(p.k, ID, skema.urai(d), { sumber: 'uji' });
  assert.deepEqual([tulis.jumlah.permintaan_dae, tulis.jumlah.permintaan_dae_links, tulis.jumlah.permintaan_dae_utas], [1, 2, 2]);
  const baca = (await sheet.bacaContoh(p.k, ID)).data;
  assert.deepEqual(baca.permintaanDae, d.permintaanDae);
  assert.deepEqual(baca.inisiatif.map(x => x.menerima).sort(), d.inisiatif.map(x => x.menerima).sort());
  const tb = baca.tasks.find(x => x.id === t.id);
  assert.deepEqual([tb.permintaanDae, tb.peminta, tb.inisiatif, tb.lane, tb.pic], [t.permintaanDae, 'andika', t.inisiatif, 'rutin', 'ali'], 'tautan task ke permintaan ikut tersimpan');
  assert.deepEqual(baca.tasks.filter(x => x.permintaanDae).map(x => x.id), [t.id]);
  // Sheet yang diimpor sebelum 2.46.0: tiga tab itu tak ada.
  for (const nama of ['permintaan_dae', 'permintaan_dae_links', 'permintaan_dae_utas']) {
    await p.k.api.spreadsheets.batchUpdate({ spreadsheetId: ID, requestBody: { requests: [{ deleteSheet: { sheetId: p.tab(nama).sheetId } }] } });
  }
  const lama = (await sheet.bacaContoh(p.k, ID)).data;
  assert.deepEqual(lama.permintaanDae, []);
  assert.equal(lama.tasks.length, d.tasks.length);
});

test('data contoh (scripts/_demo.js): empat permintaan, enam inisiatif dengan peta jenis, lewat aturan yang sama dengan tombolnya', () => {
  const d = dataDemo();
  const r = tambahDemo(d, SEKARANG);
  assert.deepEqual([r.inisiatif, r.permintaanDae, d.permintaanDae.length], [6, 4, 4]);
  assert.deepEqual(d.inisiatif.map(x => x.nama).sort(), ['Dashboard dan laporan', 'Generator Soal', 'Otomasi operasional', 'Product Knowledge', 'ProductTrack v2', 'Scraper dan data kompetitor']);
  const per = judul => d.permintaanDae.find(m => m.judul === judul);
  const ojk = d.projects.find(x => x.paket === 'PKG-004');
  const tka = d.projects.find(x => x.paket === 'PKG-001');
  const gen = per('Generator OJK Tahap 1');
  assert.deepEqual([gen.dari, gen.timPeminta, gen.proyek, gen.status, gen.jenis, gen.pic, gen.oleh], ['andika', 'AK', ojk.id, 'diterima', 'generator', 'ali', 'ali']);
  assert.equal(d.inisiatif.find(x => x.id === gen.inisiatif).nama, 'Generator Soal');
  assert.deepEqual(I.langkahMintaDae(d, gen), { kunci: 'dikerjakan', no: 3, tambahan: '' });
  assert.deepEqual(gen.utas.map(u => [u.jenis, u.oleh]), [['komentar', 'nynda']], 'Manager mengawasi dengan satu komentar');
  assert.equal(gen.bahan.length, 3);
  const lna = per('Scraper bank soal TKA SMA');
  assert.deepEqual([lna.dari, lna.timPeminta, lna.proyek, lna.status, lna.jenis], ['alya', 'LA', tka.id, 'menunggu', 'scraper']);
  const tolak = per('Rapikan 200 PDF materi lama');
  assert.deepEqual([tolak.dari, tolak.timPeminta, tolak.status, tolak.oleh], ['bagas', 'CO', 'ditolak', 'ali']);
  assert.match(tolak.alasan, /Lebih cocok dikerjakan tim CLO/);
  const tinjau = per('Dashboard rekap pendaftar tryout');
  const tt = I.taskMintaDae(d, tinjau);
  assert.deepEqual([tinjau.dari, tinjau.status, tinjau.revisi, tt.status, I.peninjau(tt), tt.permintaanDae, I.langkahMintaDae(d, tinjau).kunci], ['dhea', 'diterima', 1, 'Ditinjau', 'dhea', tinjau.id, 'ditinjau']);
  // Peta jenis, jumlah terbuka, dan pemakai.
  const peta = I.petaMintaDae(d);
  assert.deepEqual(Object.keys(peta).sort(), ['dashboard', 'generator', 'lainnya', 'scraper']);
  const nama = id => d.inisiatif.find(x => x.id === id).nama;
  assert.deepEqual(Object.fromEntries(Object.entries(peta).map(([k, v]) => [k, nama(v)])),
    { generator: 'Generator Soal', scraper: 'Scraper dan data kompetitor', dashboard: 'Dashboard dan laporan', lainnya: 'Otomasi operasional' });
  const terbuka = Object.fromEntries(d.inisiatif.map(x => [x.nama, I.mintaDaeTerbuka(d, x)]));
  assert.deepEqual([terbuka['Generator Soal'], terbuka['Scraper dan data kompetitor'], terbuka['Dashboard dan laporan'], terbuka['Otomasi operasional'], terbuka['ProductTrack v2']], [1, 1, 1, 0, 0]);
  assert.equal(I.mintaDaeMenunggu(d).length, 1);
  assert.ok(d.permintaanDae.every(m => I.bolehMintaDae({ ...d, projects: d.projects.map(x => ({ ...x, arsip: false })) }, d.projects.find(x => x.id === m.proyek), m.dari)), 'semua pengirim sah menurut aturan');
  // Notifikasi dan Hari Ini yang diharapkan di data contoh.
  assert.ok(jenisNotif(d, 'ali').includes('daeBaru'));
  assert.ok(jenisNotif(d, 'dhea').includes('tinjau') && jenisNotif(d, 'alya').length >= 0);
  assert.ok(!jenisNotif(d, 'nynda').includes('tinjau') || I.notifikasi(d, 'nynda', 300).filter(n => n.jenis === 'tinjau').every(n => n.task !== tt.id), 'Manager tak diminta meninjau');
  const hariIni = I.isoHari(SEKARANG);
  assert.ok(I.pekerjaanSaya(d, 'dhea', hariIni).grup.find(g => g.kunci === 'tinjau').isi.some(x => x.t.id === tt.id));
  // Bisa ditulis ke spreadsheet contoh dan dibaca kembali utuh.
  const urai = skema.urai(d);
  assert.equal(urai.permintaan_dae.length - 1, 4);
  assert.equal(urai.permintaan_dae_links.length - 1, 3 + 1 + 1 + 1);
  assert.ok(urai.inisiatif.slice(1).some(b => b[urai.inisiatif[0].indexOf('menerima')] === 'generator'));
  assert.ok(d.log.every((l, i) => i === 0 || d.log[i - 1].at >= l.at), 'riwayat tetap terbaru di atas');
  assert.ok(d.log.every(l => l.at <= SEKARANG));
});

/* ---------- Lewat server: data real disimpan di spreadsheet dan dibaca kembali ---------- */

const PIN = '135790';
const PIN_DEV = '908172';
const ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcd';
const EMAIL = 'producttrack-v2@contoh.iam.gserviceaccount.com';
function panggil({ body, cookie } = {}) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      h: {},
      setHeader(k, v) { this.h[k.toLowerCase()] = v; },
      end(teks) { resolve({ status: this.statusCode, headers: this.h, teks, json: JSON.parse(teks) }); },
    };
    Promise.resolve(rpc({ method: 'POST', headers: cookie ? { cookie } : {}, body }, res)).catch(reject);
  });
}
const pakai = r => r.headers['set-cookie'].split(';')[0];
const rpcAksi = (cookie, action, ...args) => panggil({ body: { action, args }, cookie });
let nomorPerintah = 0;
const perintah = (aksiData, isiPerintah) => ({ id: 'dae' + String(++nomorPerintah).padStart(5, '0'), aksi: aksiData, isi: isiPerintah, at: Date.now(), hari: '2026-10-09' });
const klienAsli = sheet.klien;
test.beforeEach(() => {
  process.env.ACCESS_PIN = PIN;
  process.env.SESSION_SECRET = 's'.repeat(48);
  process.env.SPREADSHEET_ID = ID;
  process.env.DEV_PIN = PIN_DEV;
  for (const k of ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GOOGLE_APPLICATION_CREDENTIALS', 'VERCEL', 'VERCEL_ENV', 'APP_ENV']) delete process.env[k];
  sheet.klien = klienAsli;
});

test('data real lewat server: kirim, tanya, terima, tinjau — hanya yang berhak, dan browser lain membaca keadaan yang sama', async () => {
  const p = sheetPalsu([{ title: '_meta', sheetId: 1, values: [['app', 'producttrack-v2']] }], { email: EMAIL });
  sheet.klien = async () => p.k;
  const dev = pakai(await rpcAksi(null, 'masukDev', PIN_DEV));
  await rpcAksi(dev, 'aturSumber', 'real');
  const biasa = pakai(await rpcAksi(null, 'masuk', PIN));
  const sebagai = async orang => pakai(await rpcAksi(biasa, 'masukProfil', orang, ''));
  const [nynda, andika, ali, kiki] = [await sebagai('nynda'), await sebagai('andika'), await sebagai('ali'), await sebagai('kiki')];
  const simpan = async (cookie, nama, isiPerintah, status = 200) => {
    const r = await rpcAksi(cookie, 'simpanReal', perintah(nama, isiPerintah));
    assert.equal(r.status, status, r.teks);
    return status === 200 ? r.json.peristiwa : r.json;
  };
  const prj = (await simpan(nynda, 'proyekBaru', { f: { name: 'Riset OJK PCAM 10', platform: 'OJK' } })).hasil.id;
  await simpan(nynda, 'taskBaru', { f: { title: 'Riset pola soal', project: prj, sub: 'A2', pic: 'andika' } });
  const ini = (await simpan(ali, 'inisiatifBaru', { f: { nama: 'Generator Soal', pic: 'ali' } })).hasil.id;
  assert.equal((await simpan(nynda, 'aturPetaMintaDae', { peta: { generator: ini } }, 400)).message, 'Hanya Lead yang mengatur peta jenis permintaan.');
  await simpan(ali, 'aturPetaMintaDae', { peta: { generator: ini } });

  // Mengirim: Manager dan DAE ditolak server; anggota tim yang punya task di proyek lolos.
  const kirimIsi = { proyek: prj, f: isi({ due: '2026-12-01' }) };
  assert.match((await simpan(nynda, 'kirimMintaDae', kirimIsi, 400)).message, /Manager hanya mengawasi/);
  assert.match((await simpan(ali, 'kirimMintaDae', kirimIsi, 400)).message, /Anggota tim DAE membuat task biasa/);
  assert.match((await simpan(kiki, 'kirimMintaDae', kirimIsi, 400)).message, /yang punya task tim LNA/, 'LNA tak punya task di proyek itu');
  const dikirim = await simpan(andika, 'kirimMintaDae', kirimIsi);
  assert.deepEqual([dikirim.oleh, dikirim.hasil], ['andika', { id: 'MDA-001' }], 'pengirim = profil sesi');
  assert.equal(dikirim.ubah.permintaanDae.pasang[0].status, 'menunggu');
  const tabs = p.tabs.map(t => t.title);
  assert.ok(tabs.includes('data_real') && !tabs.includes('permintaan_dae'), 'data real hidup di data_real, tanpa tab baru');

  // Terima: hanya Lead DAE.
  const terimaIsi = { permintaan: 'MDA-001', f: { inisiatif: ini, pic: 'ali' } };
  assert.equal((await simpan(nynda, 'terimaMintaDae', terimaIsi, 400)).message, 'Hanya Lead yang menerima permintaan ke tim DAE.');
  assert.equal((await simpan(andika, 'terimaMintaDae', terimaIsi, 400)).message, 'Permintaan ke tim DAE diterima anggota tim DAE.', 'Lead tim lain bukan anggota DAE');
  const terima = await simpan(ali, 'terimaMintaDae', terimaIsi);
  const tid = terima.hasil.id;
  await simpan(ali, 'terapkanAksi', { task: tid, kunci: 'mulai' });
  await simpan(ali, 'isiOutput', { task: tid, isi: 'Hasil generator' });
  await simpan(ali, 'terapkanAksi', { task: tid, kunci: 'ajukan' });
  // Tinjauan: Manager dan PIC ditolak; pengirim menyetujui.
  assert.equal((await simpan(nynda, 'terapkanAksi', { task: tid, kunci: 'setujui' }, 400)).message, 'Aksi ini tidak tersedia untuk Anda.');
  assert.equal((await simpan(ali, 'terapkanAksi', { task: tid, kunci: 'setujui' }, 400)).message, 'Aksi ini tidak tersedia untuk Anda.');
  await simpan(andika, 'terapkanAksi', { task: tid, kunci: 'kembalikan', catatan: 'Tambahkan pembahasan' });
  await simpan(ali, 'terapkanAksi', { task: tid, kunci: 'ajukan' });
  await simpan(andika, 'terapkanAksi', { task: tid, kunci: 'setujui' });

  // Browser lain menarik semua perubahan dari awal dan sampai pada keadaan yang sama.
  const sinkron = await rpcAksi(nynda, 'sinkron', {});
  assert.equal(sinkron.status, 200, sinkron.teks);
  const b = I.dataKosong();
  for (const e of sinkron.json.real.peristiwa) if (e.sah !== false) I.terapkanUbah(b, e.ubah);
  const m = b.permintaanDae[0];
  assert.deepEqual([b.permintaanDae.length, m.id, m.status, m.revisi, m.task, m.inisiatif, m.dari, m.timPeminta, m.oleh], [1, 'MDA-001', 'selesai', 1, tid, ini, 'andika', 'AK', 'ali']);
  assert.deepEqual([m.bahan.length, b.tasks.find(t => t.id === tid).permintaanDae, b.tasks.find(t => t.id === tid).peminta, b.tasks.find(t => t.id === tid).status], [2, 'MDA-001', 'andika', 'Selesai']);
  assert.deepEqual(b.inisiatif[0].menerima, ['generator']);
  assert.deepEqual(I.langkahMintaDae(b, m), { kunci: 'selesai', no: 5, tambahan: '' });
});
