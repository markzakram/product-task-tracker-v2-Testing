/* Mode Dev (0.13.0): kelola orang (organogram bawaan + tab orang), akun Dev, dan moderasi pesan. */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');

const staf = (id, pendek, lead, lain = {}) => ({ id, nama: pendek + ' Uji', pendek, peran: 'staff', jabatan: 'Uji', lead, ...lain });

test.afterEach(() => I.aturOrang([]));

test('akun Dev: bukan anggota organogram, hak lihat setara Manager', () => {
  const d = I.orang(I.DEV);
  assert.equal(d.nama, 'Dev');
  assert.equal(d.peran, 'manager');
  assert.equal(I.inisial(I.DEV), 'DEV');
  assert.ok(!I.ORANG.some(o => o.id === I.DEV), 'tak bisa dipilih jadi PIC, tak ada di laporan');
  assert.equal(I.bolehBuatTask(I.DEV), false);
});

test('periksaOrang: isian dibersihkan; organogram yang rusak ditolak dengan alasan yang bisa ditindaklanjuti', () => {
  assert.deepEqual(I.periksaOrang({ ...staf('rina', 'Rina', 'alya'), nama: '  Rina   Putri ' }),
    { id: 'rina', nama: 'Rina Putri', pendek: 'Rina', peran: 'staff', jabatan: 'Uji', lead: 'alya', aktif: true });
  const lead = I.periksaOrang({ id: 'ali', nama: 'Ali', pendek: 'Ali', peran: 'lead', tim: 'si', lead: 'kiki', jabatan: 'Data' });
  assert.equal(lead.lead, I.MANAGER, 'atasan Lead selalu Manager');
  assert.equal(lead.tim, 'SI');
  for (const [b, pola] of [
    [staf('Rina!', 'Rina', 'alya'), /ID orang/],
    [staf('dev', 'Rina', 'alya'), /ID orang/],
    [staf('rina', 'Ri na', 'alya'), /Nama panggilan/],
    [staf('rina', 'Semua', 'alya'), /dipakai sistem/],
    [staf('rina', 'Kiki', 'alya'), /unik/],
    [staf('rina', 'Rina', 'kiki'), /Atasan Rina/],
    [staf('rina', 'Rina', ''), /atasan/],
    [{ id: 'kiki', nama: 'Kiki', pendek: 'Kiki', peran: 'lead', tim: 'SI' }, /Tim SI punya 2 Lead/],
    [{ id: 'kiki', nama: 'Kiki', pendek: 'Kiki', peran: 'lead', tim: 'XX' }, /salah satu tim/],
    [{ id: 'nynda', nama: 'Nynda', pendek: 'Nynda', peran: 'lead', tim: 'AK' }, /Manager \(Nynda\)/],
    [{ id: 'kiki', nama: 'Kiki', pendek: 'Kiki', peran: 'manager' }, /satu Manager/],
    [{ id: 'alya', nama: 'Alya', pendek: 'Alya', peran: 'lead', tim: 'LA', aktif: false }, /Alya nonaktif: pindahkan dulu staff-nya/],
  ]) assert.throws(() => I.periksaOrang(b), pola, JSON.stringify(b));
});

test('aturOrang: ganti Lead tim, staf baru, nonaktif — daftar hidup ikut, nama lama tetap terbaca', () => {
  const baris = [
    { id: 'ali', nama: 'Ali', pendek: 'Ali', peran: 'staff', lead: 'nynda', jabatan: 'Data', aktif: true },
    { id: 'kiki', nama: 'Kiki', pendek: 'Kiki', peran: 'lead', tim: 'SI', jabatan: 'Lead Sistem', aktif: true },
    { id: 'rina', nama: 'Rina Putri', pendek: 'Rina', peran: 'staff', lead: 'kiki', jabatan: 'Magang', aktif: true },
    { id: 'bagas', nama: 'Bagas', pendek: 'Bagas', peran: 'staff', lead: 'dhea', jabatan: 'Kreatif', aktif: false },
  ];
  const daftarAwal = I.ORANG;
  assert.equal(I.aturOrang(baris), '');
  assert.equal(I.ORANG, daftarAwal, 'daftar diubah di tempat: rujukan lama ikut');
  assert.equal(I.TIM.SI.lead, 'kiki');
  assert.equal(I.timOrang('rina').kode, 'SI');
  assert.equal(I.leadSub('DV6'), 'kiki', 'sub-stage tim SI kini didelegasikan Kiki');
  assert.ok(!I.ORANG.some(o => o.id === 'bagas'), 'nonaktif tak bisa dipilih');
  assert.equal(I.orang('bagas').nama, 'Bagas', 'tapi namanya tetap terbaca di riwayat');
  assert.deepEqual(I.nonaktif().map(o => o.id), ['bagas']);
  assert.equal(I.bolehBuatTask('rina'), true);
  assert.ok(I.periksaFoto({ orang: 'rina', gambar: '' }));
  assert.throws(() => I.periksaFoto({ orang: 'bagas', gambar: 'data:image/jpeg;base64,QUJD' }), /Profil/, 'foto orang nonaktif tak bisa diganti');
  assert.deepEqual(I.periksaFoto({ orang: 'bagas', gambar: '' }), { orang: 'bagas', gambar: '' }, 'tapi masih bisa dihapus (moderasi)');
  // Tim tanpa Lead sementara dipegang Manager.
  I.aturOrang([{ id: 'ali', nama: 'Ali', pendek: 'Ali', peran: 'staff', lead: 'nynda', jabatan: 'Data', aktif: true }]);
  assert.equal(I.TIM.SI.lead, I.MANAGER);
});

test('aturOrang: tab yang rusak (diubah manual) tak diterapkan — kembali ke bawaan, alasannya dikembalikan', () => {
  const salah = I.aturOrang([{ id: 'nynda', nama: 'Nynda', pendek: 'Nynda', peran: 'staff', lead: 'alya' }]);
  assert.match(salah, /Manager/);
  assert.equal(I.orang('nynda').peran, 'manager');
  assert.equal(I.ORANG.length, I.ORANG_BAWAAN.length);
  // Baris yang tak terbaca dilewati, sisanya tetap dipakai.
  assert.equal(I.aturOrang([{ id: '', nama: 'x' }, { ...staf('rina', 'Rina', 'alya'), aktif: 'ya' }]), '');
  assert.equal(I.orang('rina').lead, 'alya');
});

test('moderasi: hanya atas nama Dev, menyembunyikan pesan siapa pun', () => {
  assert.throws(() => I.periksaPeristiwa({ jenis: 'moderasi', ruang: 'task:PRD-1', oleh: 'kiki', target: 'o1abc' }), /mode Dev/);
  assert.throws(() => I.periksaPeristiwa({ jenis: 'moderasi', ruang: 'task:PRD-1', oleh: I.DEV }), /dirujuk/);
  const e = I.periksaPeristiwa({ jenis: 'moderasi', ruang: 'task:PRD-1', oleh: I.DEV, target: 'o1abc', teks: 'abaikan' });
  assert.equal(e.oleh, I.DEV);
  assert.throws(() => I.periksaPeristiwa({ jenis: 'pesan', ruang: 'task:PRD-1', oleh: I.DEV, teks: 'halo' }), /terdaftar/, 'Dev tidak menulis pesan');
  const data = { tasks: [] };
  const peristiwa = [
    { id: 'o1abc', jenis: 'pesan', ruang: 'task:PRD-1', oleh: 'kiki', at: 1, teks: 'tes' },
    { id: 'o2abc', jenis: 'reaksi', ruang: 'task:PRD-1', oleh: 'alya', at: 2, target: 'o1abc', kode: 'jempol' },
    { id: 'o3abc', jenis: 'moderasi', ruang: 'task:PRD-1', oleh: I.DEV, at: 3, target: 'o1abc' },
    { id: 'o4abc', jenis: 'pesan', ruang: 'task:PRD-1', oleh: 'alya', at: 4, teks: 'tetap' },
    { id: 'o5abc', jenis: 'moderasi', ruang: 'task:PRD-1', oleh: 'kiki', at: 5, target: 'o4abc' },
  ];
  const { perId } = I.susunObrolan(data, peristiwa);
  assert.deepEqual([perId.get('o1abc').dihapus, perId.get('o1abc').dimoderasi, perId.get('o1abc').teks, perId.get('o1abc').reaksi], [true, true, '', {}]);
  assert.equal(perId.get('o4abc').dihapus, false, 'moderasi palsu (bukan Dev) diabaikan');
});
