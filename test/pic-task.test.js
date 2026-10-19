/* Regresi dropdown Ubah task: semua anggota aktif tim tersedia, termasuk pada induk
   yang sudah punya turunan. Daftar yang sama dipakai UI dan validasi data real. */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');

const WAKTU = Date.UTC(2026, 9, 19, 3);
const HARI = '2026-10-19';
function siapkan(sub = 'DV1', pic = 'andika', oleh = 'nynda') {
  const d = I.dataKosong();
  const p = I.proyekBaru(d, { name: 'PCAM OJK 2026' }, 'nynda', WAKTU);
  const t = I.taskBaru(d, { title: 'Develop materi', project: p.id, sub, pic }, oleh, WAKTU, HARI);
  return { d, t };
}
test.afterEach(() => { I.aturOrang([]); I.aturMaster([]); });

test('dropdown edit memuat Lead dan semua staff tim pemilik, juga bagi Lead pemberi dari tim lain', () => {
  for (const [sub, lead, staff] of [['DV1', 'andika', ['uma', 'tri', 'wildan']], ['DV8', 'alya', ['kiki', 'bilar']], ['DV3', 'dhea', ['nadya', 'bagas']]]) {
    const { d, t } = siapkan(sub, lead, 'ali');
    for (const me of ['nynda', lead, 'ali']) {
      const opsi = I.pilihanPicUbah(t, me, I.indeks(d));
      assert.deepEqual(opsi.slice(0, staff.length + 1), [lead, ...staff], `${me}: tim pemilik di awal dropdown`);
      for (const pic of [lead, ...staff]) {
        I.ubahTask(d, t, { pic }, me, WAKTU + 1);
        assert.equal(t.pic, pic, `${me} bisa menyimpan pilihan ${pic}`);
      }
      I.ubahTask(d, t, { pic: lead }, 'nynda', WAKTU + 2);
    }
  }
});

test('induk dengan lima turunan bisa berpindah Lead ↔ staff tanpa mengubah PIC dan tinjauan turunannya', () => {
  const { d, t } = siapkan();
  const anak = Array.from({ length: 5 }, (_, i) => I.taskAnak(d, t, { title: 'Bagian ' + i, pic: ['uma', 'tri', 'wildan'][i % 3] }, 'andika', WAKTU + i + 1, HARI));
  const awal = structuredClone(anak);
  const ceklis = I.tambahSubtask(d, t, { title: 'Periksa hasil' }, 'andika', WAKTU + 6);
  I.isiOutput(d, t, 'Materi siap diperiksa', 'andika', WAKTU + 7);
  I.centangSubtask(d, t, ceklis.id, true, 'andika', WAKTU + 8);
  for (const me of ['andika', 'nynda']) {
    for (const pic of ['uma', 'tri', 'wildan', 'andika']) {
      assert.deepEqual(I.pilihanPicUbah(t, me, I.indeks(d)), ['andika', 'uma', 'tri', 'wildan']);
      I.ubahTask(d, t, { pic }, me, WAKTU + 9);
      assert.equal(t.pic, pic);
      assert.equal(ceklis.pic, pic);
      assert.deepEqual(anak, awal, 'mengganti induk tidak memindahkan task turunannya');
      assert.ok(anak.every(a => I.peninjau(a) === 'andika'));
      assert.equal(I.peninjau(t), pic === 'andika' ? 'nynda' : 'andika');
      assert.throws(() => I.terapkanAksi(d, t, 'ajukan', pic, WAKTU + 10), /task turunan selesai/);
    }
  }
  I.ubahTask(d, t, { pic: 'uma' }, 'andika', WAKTU + 11);
  assert.deepEqual(I.pilihanPicUbah(anak[0], 'andika', I.indeks(d)), ['andika', 'uma', 'tri', 'wildan']);
  I.ubahTask(d, anak[0], { pic: 'andika' }, 'andika', WAKTU + 12);
  I.ubahTask(d, anak[0], { pic: 'wildan' }, 'andika', WAKTU + 13);
  assert.equal(I.peninjau(anak[0]), 'andika');
  assert.throws(() => I.ubahTask(d, t, { pic: 'alya' }, 'nynda', WAKTU + 14), /tim yang sama/);
  assert.throws(() => I.ubahTask(d, t, { sub: 'DV8' }, 'nynda', WAKTU + 14), /tim pembaginya tetap/);
  assert.throws(() => I.ubahTask(d, t, { sub: 'E1' }, 'andika', WAKTU + 14), /tetap di tahap/);
  assert.equal(t.pic, 'uma');
  assert.equal(t.sub, 'DV1');
});

test('pilihan PIC mengikuti organogram terkini; profil nonaktif tidak menerima penugasan baru', () => {
  const { d, t } = siapkan();
  I.taskAnak(d, t, { title: 'Bagian', pic: 'uma' }, 'andika', WAKTU + 1, HARI);
  assert.equal(I.aturOrang([
    { ...I.orang('tri'), aktif: false },
    { id: 'baru', nama: 'Staff Baru', pendek: 'Baru', peran: 'staff', lead: 'andika', aktif: true },
  ]), '');
  assert.deepEqual(I.pilihanPicUbah(t, 'andika', I.indeks(d)), ['andika', 'uma', 'wildan', 'baru']);
  I.ubahTask(d, t, { pic: 'baru' }, 'andika', WAKTU + 2);
  assert.equal(t.pic, 'baru');
  assert.throws(() => I.ubahTask(d, t, { pic: 'tri' }, 'nynda', WAKTU + 3), /staff aktif/);
  I.aturOrang([{ ...I.orang('baru'), aktif: false }]);
  assert.ok(I.pilihanPicUbah(t, 'andika', I.indeks(d)).includes('baru'), 'PIC lama tetap terbaca');
  I.ubahTask(d, t, { title: 'Judul baru' }, 'andika', WAKTU + 4);
  I.ubahTask(d, t, { pic: 'wildan' }, 'andika', WAKTU + 5);
  assert.ok(!I.pilihanPicUbah(t, 'andika', I.indeks(d)).includes('baru'));
});

test('izin edit tetap berlaku: staff hanya dirinya, Lead lain tak mengambil alih; pilihan berubah bersama sub-stage', () => {
  const { d, t } = siapkan('DV1', 'uma', 'uma');
  assert.deepEqual(I.pilihanPicUbah(t, 'uma', I.indeks(d)), ['uma']);
  assert.throws(() => I.ubahTask(d, t, { pic: 'tri' }, 'uma', WAKTU + 1), /di luar tim/);
  assert.deepEqual(I.pilihanPicUbah(t, 'alya', I.indeks(d)), []);
  assert.throws(() => I.ubahTask(d, t, { pic: 'kiki' }, 'alya', WAKTU + 1), /Hanya Lead atau Manager/);
  assert.throws(() => I.ubahTask(d, t, { pic: 'tidak-ada' }, 'nynda', WAKTU + 1), /di luar tim/);
  const opsi = I.pilihanPicUbah(t, 'andika', I.indeks(d), 'DV8');
  assert.deepEqual(opsi.slice(0, 3), ['alya', 'kiki', 'bilar']);
  I.ubahTask(d, t, { sub: 'DV8', pic: 'kiki' }, 'andika', WAKTU + 2);
  assert.equal(t.pic, 'kiki');
  assert.equal(t.sub, 'DV8');
});
