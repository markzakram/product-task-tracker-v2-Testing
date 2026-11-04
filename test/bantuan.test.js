/* Bantuan luar tim di task turunan (2.56.0). Permintaan user: mis. Dhea (CLO) membantu tim RAD lewat
   task turunan, dan task-nya tetap di RAD. Keputusan user: PIC dari tim lain mengambil atau menolak
   dulu dengan catatannya; PIC atau Lead-nya boleh menjawab; selama belum diambil, terlambatnya
   dihitung ke tim pemilik. */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');

const H = '2026-11-04';
const W = Date.UTC(2026, 10, 4, 3, 0, 0);
const CATATAN = 'Bantu rapikan materi paket 1, bahan di Drive.';
const dasar = () => {
  const d = I.dataKosong();
  const p = I.proyekBaru(d, { name: 'Paket UKP', platform: 'All Platform' }, 'nynda', W, H);
  const induk = I.taskBaru(d, { title: 'Produksi soal', project: p.id, sub: 'D2', pic: 'andika', due: '2026-11-20' }, 'nynda', W + 1, H);
  return { d, p, induk };
};
const bantuan = (x, pic = 'dhea', f = {}) => I.taskAnak(x.d, x.induk, { title: 'Rapikan materi', pic, due: '2026-11-10', detail: CATATAN, ...f }, 'andika', W + 2, H);
const notif = (d, me, jenis) => I.notifikasi(d, me).filter(n => n.jenis === jenis);

test('PIC dari tim lain: catatan dan tenggat wajib; Manager dan orang tak dikenal ditolak', () => {
  const x = dasar();
  assert.throws(() => bantuan(x, 'dhea', { detail: '' }), /Tulis catatan/);
  assert.throws(() => bantuan(x, 'dhea', { due: '' }), /Isi tenggat/);
  assert.throws(() => bantuan(x, 'nynda'), /selain Manager/);
  assert.throws(() => bantuan(x, 'siapa'), /selain Manager/);
  const biasa = I.taskAnak(x.d, x.induk, { title: 'Bagian tim sendiri', pic: 'uma' }, 'andika', W + 3, H);
  assert.deepEqual([biasa.bantuan, biasa.bantuanTunggu, I.bantuanLuarTim(biasa), I.peninjau(biasa)], [undefined, undefined, false, 'andika'], 'turunan di dalam tim tetap langsung');
});

test('sebelum diambil: tetap di tim pemilik, tak bisa dikerjakan, dan catatannya sudah terbaca', () => {
  const x = dasar();
  const t = bantuan(x);
  const perId = I.indeks(x.d);
  assert.deepEqual([t.bantuan, t.bantuanTunggu, t.detail, t.induk], ['andika', true, CATATAN, x.induk.id]);
  assert.equal(I.timTask(t), 'AK');
  assert.equal(I.timJalur(t, perId), 'AK');
  assert.deepEqual(I.aksiUntuk(t, 'dhea', perId), [], 'belum ada aksi sebelum dijawab');
  assert.deepEqual(I.aksiUntuk(t, 'andika', perId), []);
  assert.throws(() => I.terapkanAksi(x.d, t, 'mulai', 'dhea', W + 3), /tidak tersedia/);
  assert.equal(I.bolehUbah(t, 'dhea'), false, 'PIC belum bisa mengisi');
  assert.equal(I.bolehUbah(t, 'andika'), true);
  assert.equal(I.labelKeadaan(t, perId), 'Menunggu');
  assert.equal(I.alasanTunggu(t, perId), 'Menunggu konfirmasi Dhea');
  assert.equal(I.bolehAjukanPanjang(x.d, t, 'dhea'), false);
  const n = notif(x.d, 'dhea', 'bantuan');
  assert.equal(n.length, 1);
  assert.equal(n[0].teks, CATATAN, 'catatan ikut di notifikasi');
  assert.equal(notif(x.d, 'dhea', 'baru').length, 0);
});

test('Hari Ini: yang dimintai punya grup konfirmasi; Lead pembagi melihat yang belum dijawab', () => {
  const x = dasar();
  const t = bantuan(x);
  const grup = (me, k) => (I.pekerjaanSaya(x.d, me, H).grup.find(g => g.kunci === k) || { isi: [] }).isi.map(y => y.t.id);
  assert.deepEqual(grup('dhea', 'konfirmasi'), [t.id]);
  assert.deepEqual(grup('dhea', 'minggu'), [], 'belum masuk pekerjaannya');
  assert.deepEqual(grup('andika', 'jawabBantuan'), [t.id]);
  I.ambilBantuan(x.d, t, 'dhea', W + 3);
  assert.deepEqual(grup('dhea', 'konfirmasi'), []);
  assert.deepEqual(grup('dhea', 'nanti').concat(grup('dhea', 'minggu')), [t.id], 'sesudah diambil jadi pekerjaannya');
  assert.deepEqual(grup('andika', 'jawabBantuan'), []);
});

test('Ambil: catatan tetap, berjalan biasa, diajukan ke Lead pembagi, dan Andika diberi tahu', () => {
  const x = dasar();
  const t = bantuan(x);
  assert.throws(() => I.ambilBantuan(x.d, t, 'uma', W + 3), /bukan untuk Anda/);
  assert.throws(() => I.ambilBantuan(x.d, t, 'andika', W + 3), /bukan untuk Anda/);
  I.ambilBantuan(x.d, t, 'dhea', W + 3);
  assert.deepEqual([t.bantuan, t.bantuanTunggu, t.detail, t.pic], ['andika', undefined, CATATAN, 'dhea']);
  assert.throws(() => I.ambilBantuan(x.d, t, 'dhea', W + 4), /sudah dijawab/);
  assert.equal(notif(x.d, 'andika', 'bantuanAmbil').length, 1);
  assert.equal(I.peninjau(t), 'andika', 'Lead yang membantu tetap ditinjau Lead pembagi');
  I.terapkanAksi(x.d, t, 'mulai', 'dhea', W + 4);
  I.isiOutput(x.d, t, 'Materi rapi', 'dhea', W + 5);
  I.tambahBukti(x.d, t, { url: 'https://contoh.id/materi' }, 'dhea', W + 5);
  const perId = I.indeks(x.d);
  const ajukan = I.aksiUntuk(t, 'dhea', perId).find(a => a.kunci === 'ajukan');
  assert.equal(ajukan.label, 'Ajukan tinjau ke Andika');
  assert.equal(ajukan.nonaktif, false);
  I.terapkanAksi(x.d, t, 'ajukan', 'dhea', W + 6);
  assert.equal(notif(x.d, 'andika', 'tinjau').length, 1);
  assert.ok(!notif(x.d, 'nynda', 'tinjau').some(n => n.task === t.id), 'tak jatuh ke Manager');
  I.terapkanAksi(x.d, t, 'setujui', 'andika', W + 7);
  assert.equal(t.status, 'Selesai');
});

test('Tolak: alasan wajib, kembali ke Lead pembagi, dan bisa diberikan ke orang lain', () => {
  const x = dasar();
  const t = bantuan(x);
  assert.throws(() => I.tolakBantuan(x.d, t, '  ', 'dhea', W + 3), /alasannya/);
  assert.throws(() => I.tolakBantuan(x.d, t, 'Penuh', 'alya', W + 3), /bukan untuk Anda/);
  I.tolakBantuan(x.d, t, 'Antrean CLO penuh', 'dhea', W + 3);
  assert.deepEqual([t.pic, t.bantuan, t.bantuanTunggu, t.bantuanDitolak, t.bantuanDitolakOleh, t.detail], ['andika', undefined, undefined, 'Antrean CLO penuh', 'dhea', CATATAN]);
  assert.equal(notif(x.d, 'andika', 'bantuanTolak')[0].teks, 'Antrean CLO penuh');
  assert.equal(I.peninjau(t), null, 'kembali jadi turunan yang dipegang Lead sendiri');
  I.ubahTask(x.d, t, { pic: 'kiki' }, 'andika', W + 4);
  assert.deepEqual([t.pic, t.bantuan, t.bantuanTunggu, t.bantuanDitolak], ['kiki', 'andika', true, undefined], 'PIC baru dari tim lain menjawab lagi');
  I.ubahTask(x.d, t, { pic: 'uma' }, 'andika', W + 5);
  assert.deepEqual([t.pic, t.bantuan, t.bantuanTunggu, I.peninjau(t)], ['uma', undefined, undefined, 'andika'], 'kembali ke tim sendiri: langsung');
});

test('staff tim lain: PIC atau Lead-nya menjawab, Lead-nya diberi tahu, dan peninjaunya tetap Lead pembagi', () => {
  const x = dasar();
  const t = bantuan(x, 'nadya');
  assert.equal(I.peninjau(t), 'andika', 'bukan Dhea, atasan Nadya');
  assert.equal(notif(x.d, 'dhea', 'bantuanTim').length, 1);
  assert.equal(notif(x.d, 'nadya', 'bantuan').length, 1);
  assert.deepEqual(['nadya', 'dhea', 'andika', 'alya', 'nynda'].map(me => I.bolehJawabBantuan(t, me)), [true, true, false, false, false]);
  I.ambilBantuan(x.d, t, 'dhea', W + 3);
  assert.equal(t.pic, 'nadya', 'Lead mengambilkan untuk staff-nya');
  assert.equal(I.bolehAjukanPanjang(x.d, t, 'nadya'), true);
  assert.equal(I.pemberiTask(t, I.indeks(x.d)), 'andika', 'perpanjangan ke Lead pembagi');
});

test('Lead yang membantu boleh mengalihkan ke staff-nya tanpa konfirmasi lagi; task tetap di tim pemilik', () => {
  const x = dasar();
  const t = bantuan(x);
  I.ambilBantuan(x.d, t, 'dhea', W + 3);
  const perId = I.indeks(x.d);
  assert.deepEqual(I.pilihanPicUbah(t, 'dhea', perId).sort(), ['bagas', 'dhea', 'nadya'].sort());
  assert.throws(() => I.ubahTask(x.d, t, { pic: 'kiki' }, 'dhea', W + 4), /PIC task turunan/);
  I.ubahTask(x.d, t, { pic: 'nadya' }, 'dhea', W + 4);
  assert.deepEqual([t.pic, t.bantuan, t.bantuanTunggu, I.peninjau(t), I.timTask(t)], ['nadya', 'andika', undefined, 'andika', 'AK']);
  assert.ok(I.pilihanPicUbah(t, 'andika', perId).includes('kiki'), 'Lead pembagi tetap bisa memilih siapa saja');
  assert.ok(!I.pilihanPicUbah(t, 'andika', perId).includes('nynda'), 'Manager bukan calon');
});

test('Ubah task ke PIC tim lain: perlu catatan dan tenggat, dan tak boleh selagi ditinjau', () => {
  const x = dasar();
  const t = I.taskAnak(x.d, x.induk, { title: 'Bagian', pic: 'uma' }, 'andika', W + 2, H);
  assert.throws(() => I.ubahTask(x.d, t, { pic: 'dhea' }, 'andika', W + 3), /Tulis catatan/);
  assert.throws(() => I.ubahTask(x.d, t, { pic: 'dhea', detail: CATATAN }, 'andika', W + 3), /Isi tenggat/);
  I.terapkanAksi(x.d, t, 'mulai', 'uma', W + 3);
  I.isiOutput(x.d, t, 'Hasil', 'uma', W + 3);
  I.tambahBukti(x.d, t, { url: 'https://contoh.id/a' }, 'uma', W + 3);
  I.terapkanAksi(x.d, t, 'ajukan', 'uma', W + 4);
  assert.throws(() => I.ubahTask(x.d, t, { pic: 'dhea', detail: CATATAN, due: '2026-11-12' }, 'andika', W + 5), /sedang ditinjau/);
  I.terapkanAksi(x.d, t, 'kembalikan', 'andika', W + 5, 'Perbaiki');
  I.ubahTask(x.d, t, { pic: 'dhea', detail: CATATAN, due: '2026-11-12' }, 'andika', W + 6);
  assert.equal(notif(x.d, 'dhea', 'bantuan').length, 1, 'penyerahan juga memberi tahu');
  assert.deepEqual(I.aksiUntuk(t, 'dhea', I.indeks(x.d)), [], 'yang sudah berjalan pun menunggu jawaban');
  I.ambilBantuan(x.d, t, 'dhea', W + 7);
  assert.equal(t.status, 'Dikerjakan');
});

test('hitungan: belum diambil dan terlambat ditanggung tim pemilik; sesudah diambil tampil di kedua tim', () => {
  const x = dasar();
  const t = bantuan(x, 'dhea', { due: '2026-11-01' });
  const ANDIKA = I.lingkupOrang('andika', 'tim'), DHEA = I.lingkupOrang('dhea', 'tim');
  const papan = (ids, setim, fokus = '') => I.kolomPapan(x.d, { orang: ids, setim, fokus }, H).flatMap(k => k.isi).map(y => y.id);

  assert.equal(I.penanggung(t), 'andika');
  assert.deepEqual([I.menanggung(t, ANDIKA, true), I.menanggung(t, DHEA, true), I.menanggung(t, ['dhea'], false), I.menanggung(t, ['andika'], false), I.menanggung(t, null)], [true, false, false, false, true]);
  assert.deepEqual(papan(ANDIKA, true, 'telat'), [t.id]);
  assert.deepEqual(papan(DHEA, true, 'telat'), [], 'bukan terlambat Dhea');
  assert.ok(papan(['dhea'], false).includes(t.id), 'tetap terlihat di Task saya Dhea untuk dijawab');
  assert.ok(!papan(['andika'], false).includes(t.id), 'Task saya Andika tetap yang ia pegang');
  assert.equal(I.perhatian(x.d, ANDIKA, 'andika', H).telat, 1);
  assert.equal(I.perhatian(x.d, DHEA, 'dhea', H).telat, 0);
  assert.deepEqual([I.sorotProyek(x.d, x.p, H, 'andika').telat, I.sorotProyek(x.d, x.p, H, 'dhea').telat], [1, 0]);
  const orang = id => I.laporan(x.d, H).perOrang.find(o => o.id === id);
  assert.deepEqual([orang('andika').telat, orang('dhea').telat], [1, 0]);
  assert.deepEqual(I.bebanOrang(x.d, ['dhea']).map(b => b.aktif), [0]);
  const lapDhea = I.laporanPeriode(x.d, DHEA, '2026-11-01', H, H);
  assert.equal(lapDhea.total.telat, 0);
  assert.equal(I.laporanPeriode(x.d, ANDIKA, '2026-11-01', H, H).baris.find(b => b.id === 'andika').telat.length, 1);
  assert.deepEqual(I.laporan(x.d, H).perTim.filter(y => y.kode === 'CO').map(y => y.jumlah), [0], 'tim pemiliknya tetap RAD');
  assert.deepEqual(I.timProyek(x.d, x.p), ['AK']);

  I.ambilBantuan(x.d, t, 'dhea', W + 3);
  assert.equal(I.penanggung(t), 'dhea');
  assert.deepEqual([I.menanggung(t, ANDIKA, true), I.menanggung(t, DHEA, true), I.menanggung(t, ['dhea'], false), I.menanggung(t, ['andika'], false)], [true, true, true, false]);
  assert.deepEqual([I.sorotProyek(x.d, x.p, H, 'andika').telat, I.sorotProyek(x.d, x.p, H, 'dhea').telat], [1, 1]);
  assert.deepEqual(I.bebanOrang(x.d, ['dhea']).map(b => b.aktif), [1], 'sesudah diambil masuk beban kerjanya');
  const lapAndika = I.laporanPeriode(x.d, ANDIKA, '2026-11-01', H, H);
  const baris = lapAndika.baris.find(b => b.id === 'dhea');
  assert.deepEqual([baris.bantuan, baris.aktif], [true, 1], 'laporan tim pemilik punya baris tambahan pembantunya');
  assert.equal(I.laporanPeriode(x.d, DHEA, '2026-11-01', H, H).baris.find(b => b.id === 'dhea').bantuan, undefined);
  assert.deepEqual(I.timProyek(x.d, x.p), ['AK']);
});

test('task turunan rutin dari tim lain: tetap milik tim pembagi, dan tanpa tinjauan seperti task rutin', () => {
  const d = I.dataKosong();
  const induk = I.taskBaru(d, { title: 'Rekap bulanan', pic: 'andika' }, 'andika', W, H);
  const t = I.taskAnak(d, induk, { title: 'Rekap CLO', pic: 'dhea', due: '2026-11-10', detail: CATATAN }, 'andika', W + 1, H);
  assert.deepEqual([I.timTask(t), I.peninjau(t), t.lane], ['AK', null, 'rutin']);
  I.ambilBantuan(d, t, 'dhea', W + 2);
  I.terapkanAksi(d, t, 'mulai', 'dhea', W + 3);
  I.terapkanAksi(d, t, 'selesai', 'dhea', W + 4);
  assert.equal(t.status, 'Selesai');
});

test('Proyek umum: task turunan bisa memakai PIC dari tim yang tak terlibat', () => {
  const d = I.dataKosong();
  const p = I.proyekBaru(d, { jenis: 'umum', name: 'Cari guru', tim: ['AK'], tahap: [], tenggat: '2026-12-01' }, 'andika', W);
  const induk = I.taskBaru(d, { title: 'Saring pelamar', project: p.id, pic: 'andika', due: '2026-11-20' }, 'andika', W + 1, H);
  assert.throws(() => I.taskBaru(d, { title: 'Bukan turunan', project: p.id, pic: 'dhea' }, 'andika', W + 2, H), /di luar tim Anda/);
  const t = I.taskAnak(d, induk, { title: 'Wawancara', pic: 'dhea', due: '2026-11-10', detail: CATATAN }, 'andika', W + 2, H);
  assert.deepEqual([t.bantuan, t.bantuanTunggu, I.peninjau(t), I.timTask(t), t.lane], ['andika', true, 'andika', 'AK', 'proyek']);
});

test('lewat perintah data real: jawaban dan penghapusan tandanya ikut tersimpan', () => {
  const x = dasar();
  const t = bantuan(x);
  const salin = JSON.parse(JSON.stringify(x.d));
  I.AKSI_DATA.ambilBantuan(salin, { task: t.id }, 'dhea', W + 3);
  const beda = I.bedaData(x.d, salin);
  const akhir = I.terapkanUbah(JSON.parse(JSON.stringify(x.d)), beda);
  const jadi = akhir.tasks.find(y => y.id === t.id);
  assert.deepEqual([jadi.bantuan, Object.prototype.hasOwnProperty.call(jadi, 'bantuanTunggu'), jadi.detail], ['andika', false, CATATAN]);
  const salin2 = JSON.parse(JSON.stringify(x.d));
  I.AKSI_DATA.tolakBantuan(salin2, { task: t.id, alasan: 'Penuh' }, 'dhea', W + 3);
  const akhir2 = I.terapkanUbah(JSON.parse(JSON.stringify(x.d)), I.bedaData(x.d, salin2));
  const jadi2 = akhir2.tasks.find(y => y.id === t.id);
  assert.deepEqual([jadi2.pic, Object.prototype.hasOwnProperty.call(jadi2, 'bantuan'), jadi2.bantuanDitolak], ['andika', false, 'Penuh']);
});

test('task dipulihkan lepas dari induknya: tandanya tak lagi berlaku', () => {
  const t = { id: 'PRD-9', induk: '', bantuan: 'andika', bantuanTunggu: true, pic: 'dhea', status: 'Antre', lane: 'rutin' };
  assert.deepEqual([I.bantuanLuarTim(t), I.menungguAmbil(t), I.penanggung(t)], [false, false, 'dhea']);
});
