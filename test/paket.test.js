/* Rancangan Paket 2.18.0: satu paket boleh beberapa platform, jadwal pendaftaran buka–tutup
   dengan slicer rentang (irisan), dan nama paket yang diganti di tempat. Aturannya di
   public/inti.js; urutan kartu hasil seret hanya preferensi browser, jadi tak ada di sini. */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');

const HARI = '2026-10-09';
const WAKTU = Date.UTC(2026, 9, 9, 3, 0, 0);
const kosong = () => ({ ...I.dataKosong(), packages: [], setoran: [] });

test('platform paket: lebih dari satu, urut mengikuti Master, satu kolom teks yang tetap terbaca', () => {
  const d = kosong();
  const p = I.paketBaru(d, { namaPaket: 'Paket Gabungan', platform: ['BUMN', 'ASN', 'BUMN', ' '] }, 'nynda', WAKTU);
  assert.equal(p.platform, 'ASN, BUMN', 'ASN lebih dulu di daftar Platform Master; ganda dibuang');
  assert.deepEqual(I.platformPaket(p), ['ASN', 'BUMN']);
  assert.deepEqual(I.platformPaket({ platform: 'OJK' }), ['OJK'], 'data lama (satu platform) tetap terbaca');
  assert.deepEqual(I.platformPaket({ platform: '' }), []);
  assert.equal(I.rapikanPlatform('Platform Baru, OJK'), 'OJK, Platform Baru', 'yang tak ada di Master di belakang');
  I.simpanPaket(d, p, { namaPaket: 'Paket Gabungan', items: [], links: [] }, 'nynda', WAKTU);
  assert.equal(p.platform, 'ASN, BUMN', 'simpan tanpa isian platform tak menghapusnya');
  I.simpanPaket(d, p, { namaPaket: 'Paket Gabungan', platform: [], items: [], links: [] }, 'nynda', WAKTU);
  assert.equal(p.platform, '', 'semua centang dilepas = tanpa platform');
});

test('jadwal pendaftaran: tanggal sah, tutup tak sebelum buka, salah satu saja = satu hari', () => {
  const d = kosong();
  const p = I.paketBaru(d, { namaPaket: 'PCPM III', platform: 'PCPM', daftarBuka: '2026-10-01', daftarTutup: '2026-10-20' }, 'nynda', WAKTU);
  assert.deepEqual(I.jadwalDaftar(p), { buka: '2026-10-01', tutup: '2026-10-20' });
  const simpan = f => I.simpanPaket(d, p, { namaPaket: 'PCPM III', items: [], links: [], ...f }, 'nynda', WAKTU);
  assert.throws(() => simpan({ daftarBuka: '2026-10-21', daftarTutup: '2026-10-20' }), /ditutup sebelum dibuka/);
  assert.throws(() => simpan({ daftarBuka: '2026-02-30' }), /bukan tanggal yang benar/);
  assert.deepEqual(I.jadwalDaftar(p), { buka: '2026-10-01', tutup: '2026-10-20' }, 'yang ditolak tak mengubah apa pun');
  simpan({ daftarBuka: '', daftarTutup: '2026-11-05' });
  assert.deepEqual(I.jadwalDaftar(p), { buka: '2026-11-05', tutup: '2026-11-05' });
  simpan({ daftarBuka: '', daftarTutup: '' });
  assert.equal(I.jadwalDaftar(p), null);
});

test('slicer: paket masuk bila masa pendaftarannya bersinggungan dengan rentang; tanpa jadwal tak pernah masuk', () => {
  const p = { daftarBuka: '2026-10-01', daftarTutup: '2026-10-20' };
  const kasus = [
    ['2026-10-10', '2026-10-15', true, 'rentang di dalam masa pendaftaran'],
    ['2026-09-01', '2026-10-01', true, 'bersentuhan di hari buka'],
    ['2026-10-20', '2026-12-31', true, 'bersentuhan di hari tutup'],
    ['2026-10-21', '2026-12-31', false, 'sesudah tutup'],
    ['2026-09-01', '2026-09-30', false, 'sebelum buka'],
    ['', '2026-09-30', false, 'tanpa batas awal, berakhir sebelum buka'],
    ['2026-10-15', '', true, 'tanpa batas akhir'],
  ];
  for (const [dari, sampai, harap, ket] of kasus) assert.equal(I.daftarBeririsan(p, dari, sampai), harap, ket);
  assert.equal(I.daftarBeririsan({ daftarBuka: '', daftarTutup: '' }, '2026-01-01', '2026-12-31'), false);
});

test('nama paket di tempat: hanya yang boleh menyunting, tercatat di aktivitas, tanpa menyentuh isi lain', () => {
  const d = kosong();
  const p = I.paketBaru(d, { namaPaket: 'PCPM III', platform: 'PCPM', produkPic: 'kiki' }, 'nynda', WAKTU);
  p.items.push({ id: 'i1', kategori: 'Latsol', nama: 'TIU', target: 3, satuan: 'Paket', awal: 0 });
  const r = I.jalankanPerintah(d, { aksi: 'ubahNamaPaket', isi: { paket: p.id, nama: '  PCPM Tahap III  ' }, oleh: 'kiki', at: WAKTU + 1, hari: HARI });
  assert.equal(r.ok, true, r.galat);
  assert.deepEqual([p.namaPaket, p.updatedBy, p.items.length], ['PCPM Tahap III', 'kiki', 1], 'PIC produk boleh; target tetap');
  assert.match(d.log[0].detail, /Nama paket diubah dari "PCPM III"/);
  assert.match(I.jalankanPerintah(d, { aksi: 'ubahNamaPaket', isi: { paket: p.id, nama: 'X' }, oleh: 'bilar', at: WAKTU, hari: HARI }).galat, /tidak bisa menyunting/);
  assert.match(I.jalankanPerintah(d, { aksi: 'ubahNamaPaket', isi: { paket: p.id, nama: '   ' }, oleh: 'nynda', at: WAKTU, hari: HARI }).galat, /wajib diisi/);
});

test('elaborasi paket berplatform banyak: proyek dan task memakai platform yang dipilih, bawaannya yang pertama', () => {
  const buat = () => {
    const d = kosong();
    const p = I.paketBaru(d, { namaPaket: 'Gabungan', platform: ['BUMN', 'ASN'] }, 'nynda', WAKTU);
    p.items.push({ id: 'i1', urutan: 1, kategori: 'Latsol', grup: '', nama: 'TIU', target: 2, satuan: 'Paket', awal: 0, catatan: '' });
    return [d, p];
  };
  let [d, p] = buat();
  let h = I.elaborasiPaket(d, p, { items: ['i1'] }, 'nynda', WAKTU, HARI);
  assert.equal(h.project.platform, 'ASN');
  assert.ok(h.tasks.every(t => t.platform === 'ASN'));
  [d, p] = buat();
  h = I.elaborasiPaket(d, p, { items: ['i1'], platform: 'BUMN' }, 'nynda', WAKTU, HARI);
  assert.deepEqual([h.project.platform, [...new Set(h.tasks.map(t => t.platform))]], ['BUMN', ['BUMN']]);
  [d, p] = buat();
  h = I.elaborasiPaket(d, p, { items: ['i1'], platform: 'OJK' }, 'nynda', WAKTU, HARI);
  assert.equal(h.project.platform, 'ASN', 'platform di luar paket diabaikan');
});
