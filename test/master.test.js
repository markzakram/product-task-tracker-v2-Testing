/* Master (0.14.0): daftar pilihan yang diatur Manager/Dev (sub-stage, platform, kategori &
   alurnya, satuan, prioritas, capaian, tim) dan PIN tiap profil. */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');

test.afterEach(() => { I.aturMaster([]); I.aturOrang([]); });

test('bawaan: daftar PRD tetap jalan tanpa tab master', () => {
  assert.deepEqual(I.aturMaster([]), {});
  assert.equal(I.SUB_TAHAP.length, 46);
  assert.ok(I.SUB_TAHAP.every(s => s.aktif));
  assert.equal(I.PLATFORM.length, 15);
  assert.deepEqual(I.KATEGORI_PAKET.map(([l]) => l), ['Dibimbing', 'Latsol', 'Materi', 'Tryout', 'Drilling', 'Live Class']);
  assert.deepEqual(I.CAPAIAN.map(c => c.bobot), [0.4, 0.6, 0.85, 1]);
  assert.equal(I.labelPrioritas('Urgent'), 'Mendesak');
});

test('periksaMaster: isian dibersihkan; yang merusak ditolak dengan alasan yang bisa ditindaklanjuti', () => {
  assert.deepEqual(I.periksaMaster('substage', { baru: true, kunci: 'dv10', nama: ' Produksi  soal AI ', tim: 'ak', reviewManager: true }),
    { jenis: 'substage', kunci: 'DV10', nama: 'Produksi soal AI', tim: 'AK', reviewManager: true, aktif: true });
  assert.equal(I.periksaMaster('substage', { baru: true, kunci: 'R5', nama: 'Rekap mingguan', reviewManager: true }).reviewManager, false, 'rutin tak ditinjau');
  const k = I.periksaMaster('kategori', { baru: true, label: 'Bank Soal', alur: 'DV1, E1:konten, DV8:input, E6:qc, I4:tayang' });
  assert.equal(k.kunci, 'banksoal');
  assert.deepEqual(k.alur, ['DV1', 'E1:konten', 'DV8:input', 'E6:qc', 'I4:tayang']);
  for (const [jenis, isian, pola] of [
    ['substage', { baru: true, kunci: 'X1', nama: 'Salah' }, /diawali/],
    ['substage', { baru: true, kunci: 'DV1', nama: 'Ganda' }, /sudah ada/],
    ['substage', { kunci: 'DV1', nama: 'Produksi soal manual', tim: 'AK', aktif: false }, /dipakai alur/],
    ['substage', { kunci: 'ZZ9', nama: 'Tak ada' }, /diawali/],
    ['platform', { baru: true, kunci: 'asn' }, /sudah ada/],
    ['platform', { kunci: 'Mars', aktif: false }, /tidak ditemukan/],
    ['kategori', { baru: true, label: 'Coba', alur: ['DV1', 'E1:konten'] }, /tayang/],
    ['kategori', { baru: true, label: 'Coba', alur: ['DV1:input', 'E1:konten', 'I4:tayang'] }, /berurutan/],
    ['kategori', { baru: true, label: 'Coba', alur: ['R1', 'I4:tayang'] }, /bukan sub-stage ADDIE/],
    ['kategori', { baru: true, label: 'Latsol', alur: ['DV1', 'I4:tayang'] }, /ganda/],
    ['capaian', { kunci: 'konten', nama: 'Konten siap', bobot: 70 }, /naik berurutan/],
    ['capaian', { kunci: 'tayang', nama: 'Tayang', bobot: 90 }, /100%/],
    ['prioritas', { kunci: 'Kritis', label: 'Kritis' }, /tidak dikenal/],
    ['tim', { kunci: 'XX', nama: 'Tim baru' }, /tidak dikenal/],
    ['warna', { kunci: 'biru' }, /Jenis master/],
  ]) assert.throws(() => I.periksaMaster(jenis, isian), pola, `${jenis} ${JSON.stringify(isian)}`);
});

test('aturMaster: daftar hidup ikut (di tempat); yang nonaktif tak ditawarkan tapi data lamanya tetap terbaca', () => {
  const subLama = I.SUB_TAHAP;
  assert.deepEqual(I.aturMaster([
    { jenis: 'substage', kunci: 'DV10', nama: 'Produksi soal AI', tim: 'AK', aktif: true },
    { jenis: 'substage', kunci: 'A2', nama: 'Riset pengguna', tim: 'AK', aktif: false },
    { jenis: 'platform', kunci: 'TOEFL', aktif: false, urutan: 13 },
    { jenis: 'platform', kunci: 'SNBT', aktif: true, urutan: 16 },
    { jenis: 'capaian', kunci: 'konten', nama: 'Konten jadi', bobot: 30 },
    { jenis: 'tim', kunci: 'SI', nama: 'Data & Otomasi' },
    { jenis: 'prioritas', kunci: 'Urgent', label: 'Darurat' },
    { jenis: 'satuan', kunci: 'Modul', aktif: true, urutan: 7 },
    { jenis: 'kategori', kunci: 'drilling', label: 'Drilling', alur: ['DV1', 'E1:konten', 'DV8:input', 'I1', 'E6:qc', 'I4:tayang'], aktif: false, urutan: 5 },
    { jenis: 'kategori', kunci: 'banksoal', label: 'Bank Soal', alur: ['DV10', 'E1:konten', 'I4:tayang'], aktif: true, urutan: 7 },
  ]), {});
  assert.equal(I.SUB_TAHAP, subLama, 'diubah di tempat');
  assert.deepEqual(I.subTahap('DV10'), { kode: 'DV10', nama: 'Produksi soal AI', tim: 'AK', reviewManager: false, tahap: 'V', aktif: true });
  assert.equal(I.leadSub('DV10'), 'andika');
  assert.equal(I.subTahap('A2').aktif, false, 'nonaktif tetap terbaca untuk task lama');
  assert.ok(!I.PLATFORM.includes('TOEFL') && I.PLATFORM.includes('SNBT'));
  assert.equal(I.CAPAIAN[0].bobot, 0.3);
  assert.equal(I.TIM.SI.nama, 'Data & Otomasi');
  assert.equal(I.labelPrioritas('Urgent'), 'Darurat');
  assert.ok(I.SATUAN_PAKET.includes('Modul'));
  assert.ok(!I.KATEGORI_PAKET.some(([l]) => l === 'Drilling'), 'kategori nonaktif tak ditawarkan untuk item baru');
  assert.ok(I.KATEGORI_SEMUA.some(([l]) => l === 'Drilling'), 'tapi item lamanya tetap punya kategori');
  assert.deepEqual(I.langkahAlur('Bank Soal').map(x => x.kode), ['DV10', 'E1', 'I4']);
  assert.deepEqual(I.PAKET_PRODUK.map(([k]) => k).slice(-2), ['banksoal', 'catatan']);
});

test('aturMaster: jenis yang rusak (tab diubah manual) kembali ke bawaan, alasannya dikembalikan', () => {
  const salah = I.aturMaster([
    { jenis: 'capaian', kunci: 'tayang', nama: 'Tayang', bobot: 50 },
    { jenis: 'platform', kunci: 'SNBT', aktif: true, urutan: 0.5 },
    { jenis: 'kategori', kunci: 'baru', label: 'Baru', alur: ['ZZ1', 'I4:tayang'], aktif: true },
  ]);
  assert.match(salah.capaian, /berurutan/);
  assert.deepEqual(I.CAPAIAN.map(c => c.bobot), [0.4, 0.6, 0.85, 1]);
  assert.equal(I.PLATFORM[0], 'SNBT', 'jenis lain tetap diterapkan');
  assert.equal(salah.kategori, undefined, 'langkah tak sah dilewati saat dibaca, bukan merusak semuanya');
});

test('periksaMaster: mengubah sebagian (mis. menonaktifkan atau memindah urutan) tak mengubah isian lain', () => {
  const sub = I.periksaMaster('substage', { kunci: 'A2', aktif: false });
  assert.deepEqual(sub, { jenis: 'substage', kunci: 'A2', nama: 'Riset pengguna dan kompetitor', tim: 'AK', reviewManager: false, aktif: false });
  assert.deepEqual(I.periksaMaster('platform', { kunci: 'TOEFL', aktif: false }), { jenis: 'platform', kunci: 'TOEFL', aktif: false, urutan: 13 });
  assert.deepEqual(I.periksaMaster('platform', { kunci: 'TOEFL', urutan: 0.5 }), { jenis: 'platform', kunci: 'TOEFL', aktif: true, urutan: 0.5 });
  const latsol = I.periksaMaster('kategori', { kunci: 'latsol', aktif: false });
  assert.equal(latsol.label, 'Latsol');
  assert.equal(latsol.alur.length, 8);
  assert.equal(latsol.urutan, 2);
});

test('periksaMaster: nama kategori tetap, dan kuncinya tak menabrak isian paket', () => {
  assert.throws(() => I.periksaMaster('kategori', { kunci: 'latsol', label: 'Latihan Soal' }), /tak bisa diganti/);
  const k = I.periksaMaster('kategori', { baru: true, label: 'Platform', alur: ['DV1', 'I4:tayang'] });
  assert.equal(k.kunci, 'platform2', 'bukan p.platform');
  assert.equal(I.periksaMaster('kategori', { baru: true, label: 'Catatan', alur: ['DV1', 'I4:tayang'] }).kunci, 'catatan2');
  // Baris tab yang kuncinya bentrok dilewati, bukan menimpa isian paket.
  I.aturMaster([{ jenis: 'kategori', kunci: 'platform', label: 'Platform', alur: ['DV1', 'I4:tayang'], aktif: true }]);
  assert.ok(!I.KATEGORI_SEMUA.some(([, kunci]) => kunci === 'platform'));
});

test('simpan paket: kategori nonaktif dan catatan produk yang tak tampil di form tidak hilang', () => {
  I.aturMaster([{ jenis: 'kategori', kunci: 'drilling', label: 'Drilling', alur: ['DV1', 'E1:konten', 'I4:tayang'], aktif: false, urutan: 5 }]);
  const data = { packages: [], projects: [], tasks: [], log: [] };
  const p = I.paketBaru(data, { namaPaket: 'Uji', platform: 'ASN' }, 'nynda', 1);
  p.drilling = 'catatan lama';
  I.simpanPaket(data, p, { namaPaket: 'Uji', platform: 'ASN', items: [{ kategori: 'Drilling', nama: 'Drill 1', target: 2 }], latsol: 'baru' }, 'nynda', 2);
  assert.equal(p.items[0].kategori, 'Drilling');
  assert.equal(p.drilling, 'catatan lama');
  assert.equal(p.latsol, 'baru');
});
