/* Agen Ali membuat task dari rekap (2.37.0), aturan murni di agen/task.js: pilihan form Tambah
   task, pemeriksaan butir (jalur proyek, rutin, dan inisiatif) dengan aturan Inti, idempotensi,
   dan urutan penulisan lewat klien tiruan. Tanpa server: ujung ke ujung ada di
   test/agen-task-e2e.test.js. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const I = require('../public/inti');
const T = require('../agen/task');
const { GalatAgen } = require('../agen/klien');

const HARI = '2026-10-16'; // Jumat
const WAKTU = new Date(`${HARI}T09:00:00`).getTime();
const STAFF = [{ id: 'budi', nama: 'Budi', pendek: 'Budi', peran: 'staff', jabatan: 'Data', lead: 'ali', aktif: true }];
const CTX = { tanggal: HARI, hari: HARI, waktu: WAKTU };

test.afterEach(() => { I.aturMaster([]); I.aturOrang([]); });

/* Data real kecil: PRJ-1 (tim DAE terlibat), PRJ-2 (tim RAD), PRJ-3 (diarsipkan), dan empat
   inisiatif: INI-001 dan INI-002 aktif, INI-003 ditunda, INI-004 selesai. */
function keadaanUji({ staff = false, me = 'ali' } = {}) {
  I.aturMaster([]);
  assert.equal(I.aturOrang(staff ? STAFF : []), '');
  const d = I.dataKosong();
  const p1 = I.proyekBaru(d, { name: 'Otomasi laporan' }, 'nynda', WAKTU);
  const p2 = I.proyekBaru(d, { name: 'Bank soal' }, 'nynda', WAKTU);
  const lama = I.proyekBaru(d, { name: 'Proyek lama' }, 'nynda', WAKTU);
  lama.arsip = true;
  I.taskBaru(d, { project: p1.id, title: 'Skrip tarik data', sub: 'DV6', pic: 'ali' }, 'nynda', WAKTU, HARI);
  I.taskBaru(d, { project: p2.id, title: 'Soal manual', sub: 'DV1', pic: 'andika' }, 'nynda', WAKTU, HARI);
  const ini = f => assert.equal(I.jalankanPerintah(d, { id: 'x', aksi: 'inisiatifBaru', isi: { f }, oleh: 'ali', at: WAKTU, hari: HARI }).ok, true);
  ini({ nama: 'ProductTrack' });
  ini({ nama: 'ProductKnowledge' });
  ini({ nama: 'ProductFreelance', status: 'ditunda' });
  ini({ nama: 'Arsip lama', status: 'selesai' });
  return { k: { mode: 'real', me, data: d }, d };
}
const periksa = (k, butir, ctx = CTX) => T.periksaSemua(k, butir, ctx);
const satu = (k, b, ctx) => periksa(k, [b], ctx)[0];
const rutin = (f = {}) => ({ id: 'r', judul: 'Rekap data', jalur: 'rutin', sub: 'R1', ...f });
const proyek = (f = {}) => ({ id: 'p', judul: 'Skrip generator', jalur: 'proyek', proyek: 'PRJ-1', sub: 'DV6', ...f });

/* ---------- Pilihan form ---------- */

test('pilihan: proyek aktif beserta timnya, sub-stage (tim sendiri di atas), rutin dari Master, inisiatif, dan orang', () => {
  const { k } = keadaanUji({ staff: true });
  I.aturMaster([
    { jenis: 'substage', kunci: 'E7', nama: 'QC iOS', tim: 'LA', aktif: false },
    { jenis: 'substage', kunci: 'R5', nama: 'Laporan bulanan', tim: 'CO', aktif: true },
  ]);
  const p = T.susunPilihan(k, { sekarang: WAKTU });
  assert.deepEqual([p.versi, p.hari, p.mode, p.bisaBuat, p.profil.id, p.profil.tim, p.profil.timSingkat], [1, HARI, 'real', true, 'ali', 'SI', 'DAE']);
  assert.equal(p.dibuat, new Date(WAKTU).toISOString());
  // Proyek: yang diarsipkan tak ditawarkan; yang melibatkan tim Ali di depan.
  assert.deepEqual(p.proyek.map(x => [x.id, x.nama, x.tim, x.timSingkat, x.timSaya]), [['PRJ-1', 'Otomasi laporan', ['SI'], ['DAE'], true], ['PRJ-2', 'Bank soal', ['AK'], ['RAD'], false]]);
  assert.deepEqual(p.proyek[0].substage.slice(0, 6), ['A3', 'D4', 'DV6', 'DV7', 'I5', 'E8']);
  assert.ok(p.proyek[0].substage.every(kode => p.substage.proyek.some(s => s.kode === kode)) && p.proyek[0].substage.length === p.substage.proyek.length);
  assert.ok(!p.substage.proyek.some(s => s.kode === 'E7'), 'sub-stage yang dinonaktifkan di Master tak ditawarkan');
  assert.deepEqual(p.substage.rutin.map(s => s.kode), ['R1', 'R2', 'R3', 'R4', 'R5'], 'jenis rutin mengikuti Master');
  assert.ok(p.substage.proyek.every(s => s.tahap !== 'R'));
  // PIC per sub-stage mengikuti Inti.picSah, profil agen di depan: staff Ali, dan Lead tim pemilik sub-stage.
  const pic = kode => p.substage.proyek.find(s => s.kode === kode).pic;
  assert.deepEqual([pic('DV6'), pic('D2'), pic('A1')], [['ali', 'budi'], ['ali', 'andika', 'budi'], ['ali', 'nynda', 'budi']]);
  assert.deepEqual(p.substage.rutin.find(s => s.kode === 'R3').pic, ['ali', 'alya', 'budi']);
  assert.deepEqual(p.orang.filter(o => o.bolehPic).map(o => o.id), ['ali', 'budi']);
  assert.equal(p.orang.length, 13);
  assert.deepEqual(p.orang.find(o => o.id === 'budi'), { id: 'budi', nama: 'Budi', pendek: 'Budi', peran: 'staff', jabatan: 'Data', tim: 'SI', bolehPic: true });
  // Inisiatif: yang selesai tak ditawarkan; yang ditunda terlihat tapi tak dipilih.
  assert.deepEqual(p.inisiatif.map(x => [x.id, x.nama, x.status, x.bisaDipilih, x.tim, x.pic]), [
    ['INI-001', 'ProductTrack', 'aktif', true, 'SI', 'ali'], ['INI-002', 'ProductKnowledge', 'aktif', true, 'SI', 'ali'], ['INI-003', 'ProductFreelance', 'ditunda', false, 'SI', 'ali']]);
  // Status awal per jalur, tenggat, dan jalur inisiatif yang dikirim sebagai rutin.
  assert.deepEqual([p.statusAwal.proyek, p.statusAwal.rutin, p.statusAwal.inisiatif, p.statusAwal.bawaan], [['Antre', 'Dikerjakan', 'Ditinjau'], ['Antre', 'Dikerjakan', 'Selesai'], ['Antre', 'Dikerjakan', 'Selesai'], 'Antre']);
  assert.match(p.statusAwal.keterangan.Ditinjau, /ditinjau Nynda/);
  assert.deepEqual(p.saranRekap.selesai, { proyek: 'Ditinjau', rutin: 'Selesai', inisiatif: 'Selesai' });
  assert.deepEqual(p.saranRekap.berjalan, { proyek: 'Dikerjakan', rutin: 'Dikerjakan', inisiatif: 'Dikerjakan' });
  assert.deepEqual(p.jalur.map(j => [j.kode, j.jalurButir, j.tersedia, j.wajib, j.opsional]), [
    ['proyek', 'proyek', true, ['proyek', 'sub'], []], ['rutin', 'rutin', true, ['sub'], []], ['inisiatif', 'rutin', true, ['inisiatif'], ['sub']]]);
  assert.deepEqual(p.pic.bawaan, 'ali');
  assert.deepEqual(p.tenggat, { ...p.tenggat, format: 'YYYY-MM-DD', wajib: false, bawaan: 'tanggal-rekap' });
  assert.deepEqual(p.batas, { judul: 200, deskripsi: 3000, output: 200, bukti: 50, panjangBukti: 300, pendukung: 10 });
  assert.equal(T.ringkasPilihan(p), `2 proyek, ${p.substage.proyek.length + 5} sub-stage (5 rutin), 13 orang, 3 inisiatif · data real`);
  // Bentuk JSON tetap utuh (dipakai Agent Office).
  assert.deepEqual(JSON.parse(JSON.stringify(p)), p);
  const teks = T.teksPilihan(p);
  assert.match(teks, /^Pilihan form Tambah task untuk Ali \(DAE\) · data real · Jumat, 16 Oktober 2026/);
  assert.match(teks, /- PRJ-2 · Bank soal · tahap Development · tim RAD\n/);
  assert.match(teks, /- INI-003 · ProductFreelance · Ditunda \(tidak dipilih\) · PIC Ali/);
  assert.match(teks, /- inisiatif \(dikirim sebagai jalur rutin\): butuh inisiatif, sub opsional\. Status: Antre, Dikerjakan, Selesai\./);
});

test('pilihan: profil di luar tim DAE tak mendapat inisiatif; Manager tanpa peninjau berhenti di Selesai; data contoh tak bisa dibuat', () => {
  const andika = T.susunPilihan(keadaanUji({ me: 'andika' }).k, { sekarang: WAKTU });
  assert.deepEqual([andika.profil.tim, andika.inisiatif, andika.jalur.find(j => j.kode === 'inisiatif').tersedia], ['AK', [], false]);
  assert.match(andika.jalur.find(j => j.kode === 'inisiatif').alasan, /hanya untuk tim DAE dan Manager/);
  assert.deepEqual(andika.proyek.map(x => [x.id, x.timSaya]), [['PRJ-2', true], ['PRJ-1', false]], 'proyek tim RAD di depan');
  assert.equal(andika.pic.bawaan, 'andika');
  const nynda = T.susunPilihan(keadaanUji({ me: 'nynda' }).k, { sekarang: WAKTU });
  assert.deepEqual(nynda.statusAwal.proyek, ['Antre', 'Dikerjakan', 'Selesai'], 'Manager tak ditinjau');
  assert.equal(nynda.inisiatif.length, 3, 'Manager melihat inisiatif');
  const contoh = T.susunPilihan({ ...keadaanUji().k, mode: 'contoh' }, { sekarang: WAKTU });
  assert.deepEqual([contoh.mode, contoh.bisaBuat], ['contoh', false]);
  assert.match(T.ringkasPilihan(contoh), /data contoh \(task belum bisa dibuat\)$/);
  assert.match(T.teksPilihan(contoh), /Catatan: data contoh aktif, task belum bisa dibuat/);
  const kosong = T.susunPilihan({ mode: 'real', me: 'ali', data: I.dataKosong() }, { sekarang: WAKTU });
  assert.deepEqual([kosong.proyek, kosong.inisiatif, kosong.jalur.map(j => j.tersedia)], [[], [], [false, true, false]]);
  assert.match(kosong.jalur[2].alasan, /Belum ada inisiatif aktif/);
});

/* ---------- Pemetaan jalur ---------- */

test('pemetaan jalur: proyek → task proyek ber-tahap, rutin → kategori sub-stage, inisiatif → rutin yang tertaut ke inisiatif', () => {
  const { k, d } = keadaanUji();
  const hasil = periksa(k, [
    proyek({ id: 'a', status: 'Ditinjau', output: 'Generator jalan', tenggat: '2026-10-20', deskripsi: 'Dibuat.', bukti: ['abc1234', 'agen/task.js'] }),
    rutin({ id: 'b', status: 'Selesai' }),
    { id: 'c', judul: 'Pembaruan ProductTrack', jalur: 'rutin', inisiatif: 'INI-001', status: 'Selesai', output: 'Selesai' },
    { id: 'd', judul: 'Pembaruan dengan jenis rutin', jalur: 'rutin', inisiatif: 'INI-002', sub: 'R2' },
    { id: 'e', judul: 'Pakai nama jalur form', jalur: 'inisiatif', inisiatif: 'INI-001' },
    proyek({ id: 'f', judul: 'Blueprint untuk Andika', sub: 'D2', pic: 'andika' }),
  ]);
  assert.deepEqual(hasil.map(x => x.status), ['sah', 'sah', 'sah', 'sah', 'sah', 'sah'], JSON.stringify(hasil.filter(x => x.alasan)));
  // Setiap rencana dijalankan lewat Inti.taskBaru, persis yang dilakukan server.
  const buat = x => I.taskBaru(d, x.f, 'ali', WAKTU, HARI);
  const [a, b, c, dd, e, f] = hasil.map(buat);
  assert.deepEqual([a.lane, a.project, a.sub, a.stage, a.pic, a.due, a.status, a.output, a.start], ['proyek', 'PRJ-1', 'DV6', 'V', 'ali', '2026-10-20', 'Antre', 'Generator jalan', HARI]);
  assert.equal(a.detail, `Dibuat.\n\nBukti:\n- abc1234\n- agen/task.js\n\nDicatat agen AI dari rekap kerja ${HARI}.`);
  assert.deepEqual([b.lane, b.project, b.sub, b.stage, b.kategori, b.inisiatif, b.due], ['rutin', '', 'R1', '', 'Rekap & administrasi', '', HARI], 'tenggat bawaan = tanggal rekap');
  assert.deepEqual([c.lane, c.project, c.sub, c.kategori, c.inisiatif], ['rutin', '', '', 'ProductTrack', 'INI-001']);
  assert.deepEqual([dd.lane, dd.sub, dd.kategori, dd.inisiatif], ['rutin', 'R2', 'Report berkala', 'INI-002']);
  assert.deepEqual([e.lane, e.inisiatif], ['rutin', 'INI-001']);
  assert.deepEqual([f.pic, f.sub, f.stage, f.assignedBy], ['andika', 'D2', 'D', 'ali']);
  // Rantai status: proyek sampai diajukan, rutin dan inisiatif sampai selesai.
  assert.deepEqual(hasil.map(x => x.rantai.map(l => l.kunci)), [['mulai', 'ajukan'], ['mulai', 'selesai'], ['mulai', 'selesai'], [], [], []]);
  assert.deepEqual(hasil.map(x => x.statusTask), ['Ditinjau', 'Selesai', 'Selesai', 'Antre', 'Antre', 'Antre']);
  assert.deepEqual(T.rantaiStatus('proyek', 'Ditinjau', 'ali').map(l => l.ke), ['Dikerjakan', 'Ditinjau']);
  assert.deepEqual(T.rantaiStatus('proyek', 'Selesai', 'nynda').map(l => l.kunci), ['mulai', 'selesai'], 'Manager tak punya peninjau');
  assert.deepEqual([T.rantaiStatus('rutin', 'Antre', 'ali'), T.statusJalur('proyek', 'ali'), T.statusJalur('rutin', 'ali')], [[], ['Antre', 'Dikerjakan', 'Ditinjau'], ['Antre', 'Dikerjakan', 'Selesai']]);
});

test('normalisasi: huruf besar-kecil, spasi, nama pendek, tenggat dan status bawaan, kolom asing diabaikan dengan peringatan', () => {
  const { k } = keadaanUji({ staff: true });
  const x = satu(k, { id: '  b-1 ', judul: '  Rekap   data\nmingguan ', jalur: ' RUTIN ', sub: 'r2', status: ' selesai ', deskripsi: 'Baris 1 \n\n\n\nBaris 2   ', warna: 'merah', prioritas: 'High' });
  assert.equal(x.status, 'sah', x.alasan);
  assert.deepEqual([x.id, x.judul, x.jalur, x.sub, x.pic, x.statusTask, x.tenggat], ['b-1', 'Rekap data mingguan', 'rutin', 'R2', 'ali', 'Selesai', HARI]);
  assert.equal(x.f.detail.split('\n\nDicatat')[0], 'Baris 1\n\nBaris 2', 'baris kosong beruntun diringkas, spasi di ujung baris dibuang');
  assert.deepEqual(x.peringatan, ['Kolom tak dikenal diabaikan: warna, prioritas.']);
  // PIC lewat nama pendek; pendukung tanpa PIC-nya sendiri dan tanpa ganda. Task untuk orang lain mulai di Antre.
  const lain = satu(k, rutin({ pic: 'BUDI', pendukung: ['Budi', 'andika', 'ANDIKA', 'ali'] }));
  assert.deepEqual([lain.status, lain.pic, lain.pendukung, lain.f.support, lain.statusTask], ['sah', 'budi', ['andika', 'ali'], ['andika', 'ali'], 'Antre']);
  const bawaan = satu(k, rutin());
  assert.deepEqual([bawaan.pic, bawaan.tenggat, bawaan.statusTask, bawaan.pendukung, bawaan.peringatan, bawaan.f.priority, bawaan.f.induk], ['ali', HARI, 'Antre', [], [], 'Normal', '']);
  assert.deepEqual([satu(k, proyek({ proyek: ' prj-1 ', sub: 'dv6', status: 'ditinjau', output: 'ok' })).f.project, satu(k, { id: 'i', judul: 'x', jalur: 'rutin', inisiatif: 'productknowledge' }).f.inisiatif], ['PRJ-1', 'INI-002'], 'proyek tanpa beda huruf; inisiatif lewat nama yang persis');
  assert.equal(satu(k, { id: 'n', judul: 'x', jalur: 'rutin', inisiatif: 'ini-001' }).f.inisiatif, 'INI-001');
  // angka sebagai id butir dibaca sebagai teks
  assert.equal(satu(k, rutin({ id: 42 })).id, '42');
});

/* ---------- Butir yang tidak sah ---------- */

test('butir tidak sah ditolak dengan alasan yang jelas; butir lain tetap diperiksa', () => {
  const { k } = keadaanUji();
  const kasus = [
    [{ judul: 'x', jalur: 'rutin', sub: 'R1' }, /id butir wajib/],
    ['bukan objek', /Butir harus berupa objek/],
    [rutin({ judul: '   ' }), /Judul task wajib diisi/],
    [rutin({ judul: 'x'.repeat(201) }), /Judul paling panjang 200 karakter \(sekarang 201\)/],
    [rutin({ judul: ['a'] }), /judul harus berupa teks/],
    [rutin({ jalur: 'harian' }), /jalur harus "proyek" atau "rutin".+bukan "harian"/],
    [rutin({ jalur: undefined }), /jalur harus "proyek" atau "rutin"/],
    [proyek({ proyek: '' }), /Jalur proyek butuh proyek/],
    [proyek({ proyek: 'PRJ-9' }), /Proyek PRJ-9 tidak ditemukan/],
    [proyek({ proyek: 'PRJ-3' }), /Proyek PRJ-3 sudah diarsipkan/],
    [proyek({ sub: '' }), /Sub-stage ADDIE wajib untuk task proyek/],
    [proyek({ sub: 'R1' }), /Pilih sub-stage ADDIE untuk task proyek/],
    [proyek({ sub: 'ZZ9' }), /Sub-stage ZZ9 tidak dikenal/],
    [rutin({ sub: '' }), /Jenis rutin \(sub-stage R1–R4\) wajib untuk task rutin/],
    [rutin({ sub: 'DV6' }), /Task di luar proyek memakai sub-stage rutin \(kode R\)/],
    [rutin({ proyek: 'PRJ-1' }), /Jalur rutin tidak memakai proyek/],
    [rutin({ pic: 'siapa' }), /PIC "siapa" tidak dikenal\. Pilihan: nynda, ali,/],
    [rutin({ pic: 'uma' }), /PIC itu di luar tim Anda, dan bukan Lead tim pemilik sub-stage ini/],
    [rutin({ pendukung: 'andika' }), /pendukung harus berupa daftar id orang/],
    [rutin({ pendukung: ['nobody'] }), /Pendukung "nobody" tidak dikenal/],
    [rutin({ tenggat: '2026-02-30' }), /Tenggat "2026-02-30" bukan tanggal YYYY-MM-DD yang sah/],
    [rutin({ tenggat: '16/10/2026' }), /bukan tanggal YYYY-MM-DD yang sah/],
    [rutin({ status: 'Ngantri' }), /Status "Ngantri" tidak dikenal\. Pilihan: Antre, Dikerjakan, Selesai/],
    [rutin({ status: 'Ditinjau' }), /Jalur rutin dan inisiatif tanpa tinjauan: pakai Selesai, bukan Ditinjau/],
    [proyek({ status: 'Selesai', output: 'x' }), /Task proyek ditinjau dulu, jadi tidak bisa langsung Selesai: pakai Ditinjau/],
    [proyek({ status: 'Ditinjau' }), /Status Ditinjau wajib output/],
    [rutin({ pic: 'dhea', status: 'Selesai' }), /Status Selesai hanya untuk task yang PIC-nya Ali\. Task untuk Dhea dibuat di Antre/],
    [rutin({ output: 'x'.repeat(201) }), /Output paling panjang 200 karakter/],
    [rutin({ deskripsi: 'x'.repeat(3001) }), /Deskripsi paling panjang 3000 karakter/],
    [rutin({ bukti: 'abc' }), /bukti harus berupa daftar teks/],
    [rutin({ bukti: [{ hash: 'abc' }] }), /Isi bukti harus berupa teks/],
    [rutin({ bukti: ['x'.repeat(301)] }), /Satu bukti paling panjang 300 karakter/],
    [rutin({ bukti: Array.from({ length: 51 }, (_, i) => 'c' + i) }), /Bukti paling banyak 50 butir/],
    [{ id: 'i', judul: 'x', jalur: 'inisiatif' }, /^Jalur inisiatif butuh isian inisiatif \(id, mis\. INI-001\)\.$/],
    [{ id: 'i', judul: 'x', jalur: 'rutin', inisiatif: 'INI-099' }, /Inisiatif INI-099 tidak ditemukan \(yang ada: INI-001, INI-002, INI-003\)/],
    [{ id: 'i', judul: 'x', jalur: 'rutin', inisiatif: 'INI-004' }, /Inisiatif INI-004 · Arsip lama sudah selesai\. Aktifkan lagi dulu/],
    [{ id: 'i', judul: 'x', jalur: 'rutin', inisiatif: 'INI-001', sub: 'DV6' }, /Task di luar proyek memakai sub-stage rutin \(kode R\)/],
    [{ id: 'i', judul: 'x', jalur: 'proyek', proyek: 'PRJ-1', sub: 'DV6', inisiatif: 'INI-001' }, /Inisiatif hanya untuk task di luar proyek \(jalur rutin\)/],
    [rutin({ deskripsi: 'kunci sk-ant-api03-abcdefghij1234' }), /memuat rahasia/],
    [rutin({ bukti: ['https://contoh.id/x?token=abcdef123'] }), /memuat rahasia/],
    [rutin({ output: 'AGEN_KUNCI=rahasia' }), /memuat rahasia/],
    [rutin({ deskripsi: 'password = hunter2xyz' }), /memuat rahasia/],
  ];
  for (const [b, pola] of kasus) {
    const x = satu(k, b);
    assert.equal(x.status, 'ditolak', JSON.stringify(b));
    assert.match(x.alasan, pola, JSON.stringify(b));
  }
  // Beberapa kesalahan dilaporkan sekaligus.
  const banyak = satu(k, { id: 'm', judul: '', jalur: 'proyek', proyek: 'PRJ-9', sub: 'R1', tenggat: 'besok', status: 'Mulai' });
  assert.match(banyak.alasan, /Judul task wajib diisi\. Proyek PRJ-9 tidak ditemukan\. Pilih sub-stage ADDIE untuk task proyek\. Tenggat "besok".+Status "Mulai" tidak dikenal/);
  // Yang tidak sah tidak menghentikan yang lain, dan id ganda atau kosong ditolak tersendiri.
  const campur = periksa(k, [rutin({ id: 'a' }), rutin({ id: 'b', sub: 'DV6' }), rutin({ id: 'a', judul: 'ganda' }), rutin({ id: 'c' }), { judul: 'tanpa id' }]);
  assert.deepEqual(campur.map(x => [x.id, x.status]), [['a', 'sah'], ['b', 'ditolak'], ['a', 'ditolak'], ['c', 'sah'], ['', 'ditolak']]);
  assert.match(campur[2].alasan, /id butir ganda/);
});

test('inisiatif: ditunda diterima dengan peringatan; profil di luar tim DAE ditolak; sub-stage rutin boleh kosong', () => {
  const { k } = keadaanUji();
  const ditunda = satu(k, { id: 'd', judul: 'Pembaruan', jalur: 'rutin', inisiatif: 'INI-003' });
  assert.equal(ditunda.status, 'sah');
  assert.deepEqual(ditunda.peringatan, ['Inisiatif INI-003 · ProductFreelance sedang ditunda; pembaruan tetap dicatat.']);
  const kosong = satu(k, { id: 'k', judul: 'Pembaruan', jalur: 'rutin', inisiatif: 'INI-001', sub: '' });
  assert.deepEqual([kosong.status, kosong.sub, kosong.f.sub], ['sah', '', '']);
  const luar = keadaanUji({ me: 'andika' }).k;
  const x = satu(luar, { id: 'l', judul: 'Pembaruan', jalur: 'rutin', inisiatif: 'INI-001', sub: 'R1' });
  assert.deepEqual([x.status, x.alasan], ['ditolak', 'Inisiatif sementara khusus tim DAE dan Manager.']);
  const manager = satu(keadaanUji({ me: 'nynda' }).k, { id: 'm', judul: 'Pembaruan', jalur: 'rutin', inisiatif: 'INI-001' });
  assert.equal(manager.status, 'sah', 'Manager boleh');
  // Inti tetap penentu akhir: profil staff lain tak lolos walau isiannya terlihat sah.
  assert.equal(satu(luar, rutin({ id: 'n' })).status, 'sah');
});

test('peringatan: tenggat yang sudah lewat, tenggat sebelum tanggal rekap, dan bukti yang tak muat di Keterangan', () => {
  const { k } = keadaanUji();
  const lewat = satu(k, rutin({ tenggat: '2026-10-10', status: 'Dikerjakan' }));
  assert.deepEqual(lewat.peringatan, ['Tenggat lebih awal dari tanggal rekap.', 'Tenggat sudah lewat, jadi task langsung terbaca terlambat.']);
  assert.deepEqual(satu(k, rutin({ tenggat: '2026-10-10', status: 'Selesai' })).peringatan, ['Tenggat lebih awal dari tanggal rekap.'], 'yang selesai tak dihitung terlambat');
  const kemarin = satu(k, rutin({ status: 'Dikerjakan' }), { ...CTX, tanggal: '2026-10-15' });
  assert.deepEqual([kemarin.tenggat, kemarin.peringatan], ['2026-10-15', ['Tenggat sudah lewat, jadi task langsung terbaca terlambat.']], 'rekap kemarin: tenggat bawaan sudah lewat');
  const panjang = satu(k, rutin({ deskripsi: 'd'.repeat(3000), bukti: Array.from({ length: 40 }, (_, i) => `commit-${i}-` + 'x'.repeat(200)) }));
  assert.equal(panjang.status, 'sah', panjang.alasan);
  assert.ok(panjang.f.detail.length <= 4000, `${panjang.f.detail.length}`);
  assert.match(panjang.f.detail, /\n- …dan \d+ lainnya\n\nDicatat agen AI dari rekap kerja 2026-10-16\.$/);
  assert.match(panjang.peringatan[0], /^\d+ bukti tidak muat di Keterangan task\.$/);
  const utuh = satu(k, rutin({ deskripsi: 'd'.repeat(3000), bukti: ['abc'] }));
  assert.deepEqual([utuh.peringatan, utuh.f.detail.length < 4000], [[], true]);
});

test('status yang tak bisa dicapai ditolak sebelum menulis; pemeriksaan butir berurutan memakai keadaan yang sudah menerima butir sebelumnya', () => {
  const { k } = keadaanUji();
  // Proyek dengan urutan ADDIE ketat (2.43.0); bawaannya fleksibel, lihat test/addie-fleksibel.test.js.
  k.data.projects.find(p => p.id === 'PRJ-1').ketat = true;
  // PRJ-1 belum punya task Design milik DAE: DV7 boleh Dikerjakan.
  assert.equal(satu(k, proyek({ sub: 'DV7', status: 'Dikerjakan' })).status, 'sah');
  // D4 (Design, DAE) dibuat dulu di Antre: DV7 sesudahnya menunggu fase Design timnya.
  const urut = periksa(k, [proyek({ id: 'a', sub: 'DV7', status: 'Dikerjakan' }), proyek({ id: 'b', judul: 'Rancang', sub: 'D4' }), proyek({ id: 'c', sub: 'DV7', status: 'Dikerjakan' }), proyek({ id: 'd', sub: 'DV7' })]);
  assert.deepEqual(urut.map(x => x.status), ['sah', 'sah', 'ditolak', 'sah']);
  assert.match(urut[2].alasan, /^Status Dikerjakan belum bisa dicapai: Menunggu fase Design DAE selesai: PRD-\d+ "Rancang" \(DAE · Ali\)\. Pakai status Antre kalau belum bisa dimulai\.$/);
  // Urutan sebaliknya: DV7 lebih dulu, lalu D4: keduanya sah (D4 dibuat sesudah DV7 dimulai).
  assert.deepEqual(periksa(k, [proyek({ id: 'x', sub: 'DV7', status: 'Dikerjakan' }), proyek({ id: 'y', sub: 'D4' })]).map(x => x.status), ['sah', 'sah']);
  // Butir yang ditolak tidak mengubah keadaan untuk butir sesudahnya.
  assert.deepEqual(periksa(k, [proyek({ id: 'p', sub: 'D4', status: 'Ditinjau' }), proyek({ id: 'q', sub: 'DV7', status: 'Dikerjakan' })]).map(x => x.status), ['ditolak', 'sah']);
  // Task yang tertahan (bukan antre) tak menahan langkah berikutnya, seperti di aplikasi.
  assert.equal(k.data.tasks.length, 2, 'data asli tak berubah oleh pemeriksaan');
});

/* ---------- Idempotensi ---------- */

test('idempotensi: kunci catatan = tanggal + id; ID perintah tetap, sah, dan berbeda per butir, tanggal, dan langkah', () => {
  const kunci = T.kunciRekap(HARI, 'butir-1');
  assert.equal(kunci, '2026-10-16/butir-1');
  const ids = [['baru'], ['mulai'], ['ajukan'], ['selesai']].map(([l]) => T.idPerintah(kunci, l));
  assert.equal(new Set(ids).size, 4);
  assert.deepEqual(ids, [['baru'], ['mulai'], ['ajukan'], ['selesai']].map(([l]) => T.idPerintah(kunci, l)), 'tetap dari jalan ke jalan');
  for (const id of ids) assert.match(id, /^[A-Za-z0-9_-]{6,40}$/, 'lolos Inti.periksaPerintah');
  assert.notEqual(T.idPerintah(T.kunciRekap('2026-10-15', 'butir-1'), 'baru'), ids[0]);
  assert.notEqual(T.idPerintah(T.kunciRekap(HARI, 'butir-2'), 'baru'), ids[0]);
  assert.equal(I.periksaPerintah({ id: ids[0], aksi: 'taskBaru', isi: { f: {} }, hari: HARI }).id, ids[0]);
  // Butir yang tercatat dilewati tanpa diperiksa lagi (isinya boleh sudah tak sah).
  const { k } = keadaanUji();
  const sudah = { [kunci]: { task: 'PRD-040', pada: WAKTU } };
  const [x, y, z] = periksa(k, [rutin({ id: 'butir-1', sub: 'DV6' }), rutin({ id: 'butir-2' }), rutin({ id: 'butir-1', judul: 'ganda' })], { ...CTX, sudah });
  assert.deepEqual([x.status, x.task, y.status, z.status], ['dilewati', 'PRD-040', 'sah', 'ditolak']);
  assert.match(x.alasan, /^Sudah dibuat sebagai PRD-040 \(16 Okt 09\.00\); tidak dibuat lagi\.$/);
  assert.match(z.alasan, /id butir ganda/);
  // Tanggal lain = butir lain.
  assert.equal(periksa(k, [rutin({ id: 'butir-1' })], { ...CTX, tanggal: '2026-10-15', sudah })[0].status, 'sah');
});

/* ---------- Penulisan lewat klien tiruan ---------- */

function folderSementara() { return fs.mkdtempSync(path.join(os.tmpdir(), 'agen-task-unit-')); }
/* Klien tiruan yang meniru server: menjalankan perintah dengan aturan Inti, menyimpan perubahannya, dan
   membuang perintah ber-ID sama (ulang: true, tanpa `hasil` seperti baris yang tersimpan). gagal[langkah] =
   [galat, ...]: galat yang dilempar berturut-turut pada langkah itu (baru, mulai, ajukan, selesai). */
function klienPalsu(data, { folder, gagal = {}, mode = 'real' } = {}) {
  const tersimpan = new Map();
  const panggilan = [];
  let seq = 0;
  let tik = 0;
  const jam = () => WAKTU + 60000 + (tik++);
  return {
    panggilan, folderData: folder, jam,
    async muat() { return { mode, data: structuredClone(data), me: 'ali', seq }; },
    async ubah(aksi, isi, { id, hari }) {
      const langkah = aksi === 'terapkanAksi' ? isi.kunci : 'baru';
      panggilan.push({ langkah, id, hari });
      if (!I.AKSI_AGEN.includes(aksi)) throw new GalatAgen(`Agen tidak boleh melakukan "${aksi}".`, 'AGEN');
      if (gagal[langkah] && gagal[langkah].length) throw gagal[langkah].shift();
      if (tersimpan.has(id)) { const { hasil, ...sisa } = tersimpan.get(id); return { ...sisa, ulang: true }; }
      const salinan = structuredClone(data);
      const p = { id, aksi, isi, oleh: 'ali', at: jam(), hari };
      const r = I.jalankanPerintah(salinan, p);
      if (!r.ok) throw new GalatAgen(r.galat, 'ATURAN', 400);
      const e = { id, aksi, oleh: 'ali', at: p.at, ubah: I.bedaData(data, salinan), seq: ++seq, hasil: I.ringkasHasil(r.hasil) };
      Object.assign(data, salinan);
      tersimpan.set(id, e);
      return e;
    },
  };
}
const putus = () => new GalatAgen('ProductTrack tak terjangkau (ECONNRESET).', 'JARINGAN');
const bacaRekap = folder => JSON.parse(fs.readFileSync(path.join(folder, 'rekap-terkirim.json'), 'utf8'));

test('proses: task dibuat lalu status dinaikkan dengan aksi yang sama dengan tombol, tercatat, dan jalan ulang melewatinya', async () => {
  const { k, d } = keadaanUji();
  const folder = folderSementara();
  try {
    const klien = klienPalsu(d, { folder });
    const butir = [proyek({ id: 'a', status: 'Ditinjau', output: 'ok', bukti: ['abc'] }), rutin({ id: 'b', status: 'Selesai' }), { id: 'c', judul: 'Pembaruan', jalur: 'rutin', inisiatif: 'INI-001', status: 'Dikerjakan' }, rutin({ id: 'd', sub: 'DV6' }), rutin({ id: 'e' })];
    const r = await T.proses(klien, { tanggal: HARI, butir, folder });
    assert.deepEqual(r.hasil.map(x => [x.id, x.status, x.task || '', x.statusTask || '']), [
      ['a', 'dibuat', 'PRD-003', 'Ditinjau'], ['b', 'dibuat', 'PRD-004', 'Selesai'], ['c', 'dibuat', 'PRD-005', 'Dikerjakan'], ['d', 'ditolak', '', ''], ['e', 'dibuat', 'PRD-006', 'Antre']]);
    assert.ok(r.hasil.filter(x => x.status === 'dibuat').every(x => x.peringatan === undefined && x.bisaDiulang === undefined));
    assert.deepEqual(klien.panggilan.map(p => p.langkah), ['baru', 'mulai', 'ajukan', 'baru', 'mulai', 'selesai', 'baru', 'mulai', 'baru'], 'butir yang ditolak tak menulis; Antre tanpa aksi status');
    assert.ok(klien.panggilan.every(p => p.hari === HARI && /^[A-Za-z0-9_-]{6,40}$/.test(p.id)));
    assert.equal(new Set(klien.panggilan.map(p => p.id)).size, klien.panggilan.length);
    const t = id => d.tasks.find(x => x.id === id);
    assert.deepEqual([t('PRD-003').status, t('PRD-004').status, t('PRD-005').status, t('PRD-006').status], ['Ditinjau', 'Selesai', 'Dikerjakan', 'Antre']);
    assert.deepEqual(Object.keys(bacaRekap(folder).butir), [`${HARI}/a`, `${HARI}/b`, `${HARI}/c`, `${HARI}/e`]);
    assert.deepEqual(bacaRekap(folder).butir[`${HARI}/a`], { task: 'PRD-003', status: 'Ditinjau', diminta: 'Ditinjau', pada: bacaRekap(folder).butir[`${HARI}/a`].pada });
    assert.equal(fs.readdirSync(folder).filter(f => f.endsWith('.tmp')).length, 0);
    assert.equal(T.barisHasil(r), '4 task dibuat, 1 ditolak');
    assert.deepEqual(T.barisButir(r.hasil[0]), ['  • a · dibuat PRD-003 · Ditinjau · Skrip generator']);
    assert.equal(T.hasilBerkas(r, '/x/u.json').ringkas.dibuat, 4);

    // Jalan ulang: dilewati, tak ada panggilan tulis.
    const sebelum = klien.panggilan.length;
    const ulang = await T.proses(klien, { tanggal: HARI, butir, folder });
    assert.deepEqual(ulang.hasil.map(x => x.status), ['dilewati', 'dilewati', 'dilewati', 'ditolak', 'dilewati']);
    assert.equal(klien.panggilan.length, sebelum);
    assert.equal(T.barisHasil(ulang), '0 task dibuat, 1 ditolak (4 dilewati)');
    // Mode uji: tidak menulis dan tidak mencatat.
    const uji = await T.proses(klien, { tanggal: HARI, butir: [rutin({ id: 'baru-1' })], uji: true, folder });
    assert.deepEqual([uji.hasil[0].status, uji.hasil[0].statusTask, klien.panggilan.length, Object.keys(bacaRekap(folder).butir).length], ['sah', 'Antre', sebelum, 4]);
    assert.equal(T.barisHasil(uji), 'uji: 1 butir sah, 0 ditolak');
    assert.deepEqual(T.barisButir(uji.hasil[0]), ['  • baru-1 · sah (rutin R1) · akan Antre · Rekap data']);
  } finally { fs.rmSync(folder, { recursive: true, force: true }); }
});

test('proses: catatan lokal hilang → server mengenali ID perintah yang sama, task tak digandakan dan status dilanjutkan', async () => {
  const { d } = keadaanUji();
  const folder = folderSementara();
  try {
    const klien = klienPalsu(d, { folder });
    const butir = [rutin({ id: 'b', status: 'Selesai' }), proyek({ id: 'a', status: 'Ditinjau', output: 'ok' })];
    const pertama = await T.proses(klien, { tanggal: HARI, butir, folder });
    assert.deepEqual(pertama.hasil.map(x => x.status), ['dibuat', 'dibuat']);
    const jumlah = d.tasks.length;
    const idPertama = klien.panggilan.map(p => p.id);
    fs.rmSync(path.join(folder, 'rekap-terkirim.json'));
    const kedua = await T.proses(klien, { tanggal: HARI, butir, folder });
    assert.equal(d.tasks.length, jumlah, 'tidak ada task baru');
    assert.deepEqual(kedua.hasil.map(x => [x.status, x.task, x.statusTask]), [['dilewati', 'PRD-003', 'Selesai'], ['dilewati', 'PRD-004', 'Ditinjau']]);
    assert.match(kedua.hasil[0].alasan, /^Sudah dibuat sebagai PRD-003 \(dikenali server\); tidak dibuat lagi\.$/);
    assert.deepEqual(klien.panggilan.slice(idPertama.length).map(p => p.langkah), ['baru', 'baru'], 'hanya pembuatan yang dikirim ulang; status sudah sampai');
    assert.deepEqual(klien.panggilan.slice(idPertama.length).map(p => p.id), [idPertama[0], idPertama[3]], 'ID perintah sama dengan jalan pertama');
    assert.deepEqual(Object.keys(bacaRekap(folder).butir), [`${HARI}/b`, `${HARI}/a`], 'catatan disusun lagi');
  } finally { fs.rmSync(folder, { recursive: true, force: true }); }
});

test('proses: terputus di tengah → task tetap satu, tak dicatat selesai, dan jalan ulang melanjutkan status', async () => {
  const { d } = keadaanUji();
  const folder = folderSementara();
  try {
    const klien = klienPalsu(d, { folder, gagal: { selesai: [putus()] } });
    const butir = [rutin({ id: 'b', status: 'Selesai' })];
    const pertama = await T.proses(klien, { tanggal: HARI, butir, folder });
    const x = pertama.hasil[0];
    assert.deepEqual([x.status, x.task, x.statusTask, x.bisaDiulang], ['dibuat', 'PRD-003', 'Dikerjakan', true]);
    assert.deepEqual(x.peringatan, ['Terputus saat mengubah status (ProductTrack tak terjangkau (ECONNRESET)). Jalankan ulang untuk melanjutkan; task tidak akan digandakan.']);
    assert.equal(fs.existsSync(path.join(folder, 'rekap-terkirim.json')), false, 'belum tercatat selesai');
    assert.equal(T.barisHasil(pertama), '1 task dibuat, 0 ditolak (1 terputus, jalankan ulang)');
    const kedua = await T.proses(klien, { tanggal: HARI, butir, folder });
    const y = kedua.hasil[0];
    assert.deepEqual([y.status, y.task, y.statusTask, y.bisaDiulang], ['dilewati', 'PRD-003', 'Selesai', undefined]);
    assert.match(y.alasan, /Sudah dibuat sebagai PRD-003 \(dikenali server\); tidak dibuat lagi\. Status dilanjutkan sampai Selesai\./);
    assert.equal(d.tasks.filter(t => t.title === 'Rekap data').length, 1);
    assert.equal(d.tasks.find(t => t.id === 'PRD-003').status, 'Selesai');
    assert.equal(bacaRekap(folder).butir[`${HARI}/b`].status, 'Selesai');
    assert.deepEqual(klien.panggilan.map(p => p.langkah), ['baru', 'mulai', 'selesai', 'baru', 'selesai'], 'mulai tak diulang karena sudah tercapai');
  } finally { fs.rmSync(folder, { recursive: true, force: true }); }
});

test('proses: gangguan saat membuat → ditolak bisa diulang; penolakan aturan saat menaikkan status → tetap dibuat, status berhenti, tercatat', async () => {
  const { d } = keadaanUji();
  const folder = folderSementara();
  try {
    const klien = klienPalsu(d, { folder, gagal: {
      baru: [new GalatAgen('Server sibuk', 'BALASAN', 503)],
      mulai: [new GalatAgen('Aksi ini tidak tersedia untuk Anda.', 'ATURAN', 400)],
    } });
    const r = await T.proses(klien, { tanggal: HARI, butir: [rutin({ id: 'a' }), rutin({ id: 'b', status: 'Dikerjakan' })], folder });
    const [a, b] = r.hasil;
    assert.deepEqual([a.status, a.bisaDiulang, a.task], ['ditolak', true, undefined]);
    assert.match(a.alasan, /^Task tidak dibuat: Server sibuk$/);
    assert.deepEqual([b.status, b.statusTask, b.bisaDiulang], ['dibuat', 'Antre', undefined]);
    assert.deepEqual(b.peringatan, ['Status berhenti di Antre: Aksi ini tidak tersedia untuk Anda.']);
    assert.deepEqual(Object.keys(bacaRekap(folder).butir), [`${HARI}/b`], 'yang dibuat tercatat; yang gagal sementara tidak');
    assert.equal(T.barisHasil(r), '1 task dibuat, 1 ditolak (1 terputus, jalankan ulang)');
    // Penolakan permanen saat membuat (aturan berubah di server): ditolak biasa, tak ditandai bisa diulang.
    const ditolak = klienPalsu(d, { folder: folderSementara(), gagal: { baru: [new GalatAgen('Proyek tidak ditemukan.', '', 400)] } });
    const x = (await T.proses(ditolak, { tanggal: HARI, butir: [rutin({ id: 'z' })], folder: ditolak.folderData })).hasil[0];
    assert.deepEqual([x.status, x.bisaDiulang, x.alasan], ['ditolak', undefined, 'Task tidak dibuat: Proyek tidak ditemukan.']);
    fs.rmSync(ditolak.folderData, { recursive: true, force: true });
  } finally { fs.rmSync(folder, { recursive: true, force: true }); }
});

test('proses: server yang menolak taskBaru dari agen (belum diperbarui) menghentikan seluruh jalan dengan petunjuk deploy', async () => {
  const { d } = keadaanUji();
  const folder = folderSementara();
  try {
    const lama = new GalatAgen('Agen AI tidak boleh melakukan "taskBaru". Itu dikerjakan Ali sendiri di aplikasi.', '', 403);
    const klien = klienPalsu(d, { folder, gagal: { baru: [lama] } });
    await assert.rejects(T.proses(klien, { tanggal: HARI, butir: [rutin({ id: 'a' }), rutin({ id: 'b' })], folder }),
      e => e instanceof GalatAgen && e.kode === 'SERVER_LAMA' && /butuh versi 2\.37\.0 atau lebih baru\)\. Deploy server dulu/.test(e.message));
    assert.deepEqual(klien.panggilan.map(p => p.langkah), ['baru'], 'berhenti di penolakan pertama');
    assert.equal(fs.existsSync(path.join(folder, 'rekap-terkirim.json')), false);
    // Penolakan 403 lain (izin) hanyalah butir yang ditolak.
    const izin = klienPalsu(d, { folder, gagal: { baru: [new GalatAgen('Hanya Lead atau Manager yang membuat paket.', '', 403)] } });
    const r = await T.proses(izin, { tanggal: HARI, butir: [rutin({ id: 'a' })], folder });
    assert.deepEqual([r.hasil[0].status, r.hasil[0].bisaDiulang], ['ditolak', undefined]);
  } finally { fs.rmSync(folder, { recursive: true, force: true }); }
});

test('proses: data contoh dan tanggal yang belum terjadi dihentikan sebelum menulis; satu butir (alat MCP) memakai ID dari isinya', async () => {
  const { d } = keadaanUji();
  const folder = folderSementara();
  try {
    const contoh = klienPalsu(d, { folder, mode: 'contoh' });
    await assert.rejects(T.proses(contoh, { tanggal: HARI, butir: [rutin()], folder }), e => e instanceof GalatAgen && e.kode === 'SUMBER' && /data contoh/.test(e.message));
    const klien = klienPalsu(d, { folder });
    await assert.rejects(T.proses(klien, { tanggal: '2099-01-01', butir: [rutin()], folder }), e => e.kode === 'TANGGAL' && /belum terjadi/.test(e.message));
    assert.equal(klien.panggilan.length + contoh.panggilan.length, 0);
    const a = { judul: 'Rekap harian', jalur: 'rutin', sub: 'R1', status: 'Selesai' };
    const x = await T.buatSatu(klien, a);
    assert.deepEqual([x.status, x.task, x.statusTask], ['dibuat', 'PRD-003', 'Selesai']);
    assert.match(T.teksHasilSatu(x), /^PRD-003 dibuat untuk Ali · rutin · R1 · status Selesai\. Tampil di ProductTrack dengan tanda AI\.$/);
    const lagi = await T.buatSatu(klien, a);
    assert.deepEqual([lagi.status, lagi.task], ['dilewati', 'PRD-003']);
    assert.equal(T.teksHasilSatu(lagi), 'Butir ini sudah dibuat sebagai PRD-003; tidak dibuat lagi.');
    assert.equal(d.tasks.filter(t => t.title === 'Rekap harian').length, 1);
    await assert.rejects(T.buatSatu(klien, { judul: 'X', jalur: 'rutin', sub: 'DV6' }), e => e.kode === 'ATURAN' && /sub-stage rutin \(kode R\)/.test(e.message));
    await assert.rejects(T.buatSatu(klien, { ...a, tanggal: 'kemarin' }), /tanggal harus YYYY-MM-DD/);
    // Isi lain atau tanggal lain = butir lain; id eksplisit menentukan sendiri.
    assert.equal((await T.buatSatu(klien, { ...a, judul: 'Rekap lain' })).status, 'dibuat');
    assert.equal((await T.buatSatu(klien, { ...a, tanggal: '2026-10-15' })).status, 'dibuat');
    assert.equal((await T.buatSatu(klien, { ...a, id: 'pilihan-sendiri' })).status, 'dibuat');
    assert.equal((await T.buatSatu(klien, { ...a, id: 'pilihan-sendiri' })).status, 'dilewati');
    // Judul sama untuk PIC yang berbeda = task yang berbeda.
    const review = { judul: 'Review soal', jalur: 'rutin', sub: 'R1' };
    assert.deepEqual([(await T.buatSatu(klien, { ...review, pic: 'dhea' })).status, (await T.buatSatu(klien, { ...review, pic: 'ali' })).status, (await T.buatSatu(klien, { ...review, pic: 'dhea' })).status], ['dibuat', 'dibuat', 'dilewati']);
  } finally { fs.rmSync(folder, { recursive: true, force: true }); }
});

/* ---------- Berkas dan opsi ---------- */

test('berkas butir dan opsi baris perintah: galat tingkat berkas jelas; --opsi nilai dan --opsi=nilai', () => {
  const folder = folderSementara();
  try {
    const tulis = (nama, isi) => { const f = path.join(folder, nama); fs.writeFileSync(f, typeof isi === 'string' ? isi : JSON.stringify(isi)); return f; };
    const galat = (f, pola) => assert.throws(() => T.bacaBerkasButir(f), e => e instanceof GalatAgen && e.kode === 'BERKAS' && pola.test(e.message), String(pola));
    galat(path.join(folder, 'tidak-ada.json'), /Berkas tidak ditemukan/);
    galat(folder, /Bukan berkas/);
    galat(tulis('rusak.json', '{ bukan'), /Berkas bukan JSON yang sah/);
    galat(tulis('larik.json', '[]'), /Isi berkas harus objek/);
    galat(tulis('tgl.json', { tanggal: '16-10-2026', butir: [] }), /tanggal di berkas wajib berbentuk YYYY-MM-DD/);
    galat(tulis('tgl2.json', { tanggal: '2026-02-30', butir: [] }), /tanggal di berkas wajib/);
    galat(tulis('butir.json', { tanggal: HARI, butir: 'x' }), /butir di berkas harus berupa daftar/);
    galat(tulis('banyak.json', { tanggal: HARI, butir: Array.from({ length: 201 }, (_, i) => ({ id: String(i) })) }), /Terlalu banyak butir \(201; maks\. 200 per berkas\)/);
    assert.deepEqual(T.bacaBerkasButir(tulis('ok.json', { tanggal: HARI, butir: [{ id: 'a' }], lain: 1 })), { tanggal: HARI, butir: [{ id: 'a' }] });
    assert.deepEqual(T.bacaBerkasButir(tulis('bom.json', String.fromCharCode(0xFEFF) + JSON.stringify({ tanggal: HARI, butir: [] }))), { tanggal: HARI, butir: [] }, 'BOM dari editor Windows diterima');
    assert.equal(T.tanggalSah('2024-02-29'), true);
    assert.deepEqual(['2025-02-29', '2026-13-01', '2026-1-1', '', null, 20261016].map(T.tanggalSah), [false, false, false, false, false, false]);

    const spek = { nilai: ['--berkas', '--env'], tanda: ['--uji', '--help'] };
    assert.deepEqual(T.bacaArgumen(['--berkas', 'a.json', '--uji', '--env=b.env'], spek), { '--berkas': 'a.json', '--uji': true, '--env': 'b.env' });
    assert.deepEqual(T.bacaArgumen([], spek), {});
    for (const [args, pola] of [[['--berkas'], /--berkas butuh nilai/], [['--berkas', '--uji'], /--berkas butuh nilai/], [['--berkas='], /--berkas butuh nilai/], [['--uji=ya'], /--uji tidak memakai nilai/], [['--ngawur'], /Opsi tidak dikenal: --ngawur/], [['berkas.json'], /Opsi tidak dikenal: berkas\.json/]]) {
      assert.throws(() => T.bacaArgumen(args, spek), e => e instanceof GalatAgen && e.kode === 'OPSI' && pola.test(e.message), args.join(' '));
    }
    assert.deepEqual(T.opsiKlien(''), {});
    assert.deepEqual(T.opsiKlien(tulis('setelan.env', 'PT_ALAMAT=x')), { berkasEnv: path.join(folder, 'setelan.env') });
    assert.throws(() => T.opsiKlien(path.join(folder, 'hilang.env')), /Berkas --env tidak ditemukan/);
    assert.throws(() => T.opsiKlien(folder), /Berkas --env tidak ditemukan/);
    assert.equal(T.tujuanKeluaran('', '/bawaan/pilihan-task.json'), '/bawaan/pilihan-task.json');
    assert.equal(T.tujuanKeluaran(folder, '/bawaan/pilihan-task.json'), path.join(folder, 'pilihan-task.json'), 'folder: nama bawaan di dalamnya');
    assert.equal(T.tujuanKeluaran(path.join(folder, 'baru') + path.sep, '/bawaan/pilihan-task.json'), path.join(folder, 'baru', 'pilihan-task.json'));
    assert.equal(T.tujuanKeluaran(path.join(folder, 'x.json'), '/bawaan/pilihan-task.json'), path.join(folder, 'x.json'));
  } finally { fs.rmSync(folder, { recursive: true, force: true }); }
});
