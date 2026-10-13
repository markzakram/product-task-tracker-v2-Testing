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
    ['kategori', { baru: true, label: 'Coba', alur: ['DV1:input', 'E1:konten', 'I4:tayang'] }, /Konten siap di E1 dipasang sesudah Ter-input di DV1/],
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
  assert.equal(I.singkatTim('SI'), 'DAE', 'baris tim sebelum 2.19.0 (tanpa singkatan) memakai singkatan bawaan');
  assert.equal(I.labelPrioritas('Urgent'), 'Darurat');
  assert.ok(I.SATUAN_PAKET.includes('Modul'));
  assert.ok(!I.KATEGORI_PAKET.some(([l]) => l === 'Drilling'), 'kategori nonaktif tak ditawarkan untuk item baru');
  assert.ok(I.KATEGORI_SEMUA.some(([l]) => l === 'Drilling'), 'tapi item lamanya tetap punya kategori');
  assert.deepEqual(I.langkahAlur('Bank Soal').map(x => x.kode), ['DV10', 'E1', 'I4']);
  assert.deepEqual(I.PAKET_PRODUK.map(([k]) => k).slice(-2), ['banksoal', 'catatan']);
});

test('tim (2.19.0): singkatan DAE · RAD · LNA · CLO, bisa diganti di Master, dan tak boleh kembar', () => {
  assert.deepEqual(I.TIM_PROYEK.map(I.singkatTim), ['DAE', 'RAD', 'LNA', 'CLO']);
  assert.deepEqual(['SI', 'AK', 'LA', 'CO', 'MG'].map(k => I.TIM[k].nama),
    ['Data & AI Engineer', 'Research, Academic & Development', 'Learning & Architecture', 'Content & Learning Operation', 'Manager']);
  assert.deepEqual(I.periksaMaster('tim', { kunci: 'SI', singkat: ' dai ' }), { jenis: 'tim', kunci: 'SI', nama: 'Data & AI Engineer', singkat: 'DAI', aktif: true });
  assert.throws(() => I.periksaMaster('tim', { kunci: 'SI', singkat: 'rad' }), /Singkatan tim "RAD" ganda/);
  assert.throws(() => I.periksaMaster('tim', { kunci: 'SI', singkat: 'D-AE' }), /2–6 huruf atau angka/);
  assert.deepEqual(I.aturMaster([{ jenis: 'tim', kunci: 'CO', nama: 'Content Ops', singkat: 'COPS' }]), {});
  assert.deepEqual([I.TIM.CO.nama, I.singkatTim('CO'), I.TIM.CO.kode], ['Content Ops', 'COPS', 'CO'], 'kode tetap: data tak berubah');
  I.aturMaster([]);
  assert.equal(I.singkatTim('CO'), 'CLO', 'kembali ke bawaan');
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

test('hapus sub-stage (2.24.0): penanda dihapus, kode tak dipakai ulang, nomor lain tak bergeser, E12 terkunci', () => {
  const baris = [];
  const simpan = isian => { const x = I.periksaMaster('substage', isian, baris); baris.splice(0, baris.length, ...baris.filter(b => b.kunci !== x.kunci), x); I.aturMaster(baris); return x; };
  assert.deepEqual(['A', 'D', 'V', 'I', 'E', 'R'].map(I.kodeSubBerikut), ['A7', 'D8', 'DV10', 'I9', 'E13', 'R5'], 'sesudah nomor terbesar');

  // E8 belum dipakai alur mana pun: bisa dihapus; E9 dst. tetap kodenya.
  const e8 = simpan({ kunci: 'E8', dihapus: true });
  assert.deepEqual([e8.dihapus, e8.aktif, e8.nama], [true, false, 'QC akun dan sistem penilaian']);
  assert.equal(I.SUB_TAHAP.some(s => s.kode === 'E8'), false, 'tak ditawarkan di mana pun');
  assert.ok(I.SUB_TAHAP.some(s => s.kode === 'E9') && I.SUB_TAHAP.some(s => s.kode === 'E12'), 'nomor lain tak bergeser');
  assert.equal(I.subTahap('E8').nama, 'QC akun dan sistem penilaian', 'data lama tetap terbaca');
  assert.equal(I.kodeSubBerikut('E'), 'E13');
  assert.throws(() => I.periksaMaster('substage', { baru: true, kunci: 'E8', nama: 'QC baru' }, baris), /tak dipakai ulang supaya .*; pakai E13./);
  assert.throws(() => I.periksaMaster('substage', { kunci: 'E8', nama: 'Ganti' }, baris), /sudah dihapus/);

  // Menghapus yang terbesar pun tak membuat nomornya dipakai lagi.
  simpan({ baru: true, kunci: 'E13', nama: 'QC aksesibilitas', tim: 'LA' });
  simpan({ kunci: 'E13', dihapus: true });
  assert.equal(I.kodeSubBerikut('E'), 'E14');

  // Penanda tetap terbaca dari tab (baris longgar) dan menimpa bawaan.
  I.aturMaster(baris.map(b => ({ ...b, dihapus: 'true' })).filter(b => b.kunci === 'E8'));
  assert.equal(I.SUB_TAHAP.some(s => s.kode === 'E8'), false);
  I.aturMaster(baris);

  // Yang dipakai alur paket dan E12 tak bisa dihapus; E12 juga tak bisa dinonaktifkan.
  assert.throws(() => I.periksaMaster('substage', { kunci: 'E1', dihapus: true }, baris), /alur kategori paket Latsol/);
  assert.throws(() => I.periksaMaster('substage', { kunci: 'E12', dihapus: true }, baris), /menutup siklus/);
  assert.throws(() => I.periksaMaster('substage', { kunci: 'E12', aktif: false }, baris), /menutup siklus/);

  // Task baru tak bisa memakai kode yang dihapus.
  const d = { tasks: [], projects: [], log: [] };
  assert.throws(() => I.taskBaru(d, { title: 'x', sub: 'E8', pic: 'ali' }, 'ali', 1, '2026-10-13'), /sudah dihapus/);

  // Dipulihkan dengan kode yang sama.
  const pulih = simpan({ kunci: 'E8', dihapus: false, aktif: true });
  assert.deepEqual([pulih.dihapus, pulih.aktif], [undefined, true]);
  assert.ok(I.SUB_TAHAP.some(s => s.kode === 'E8' && s.aktif));
});

test('salahHapusSub: kode yang dipakai task ditolak dengan jumlah dan sumbernya', () => {
  assert.equal(I.salahHapusSub('E8', [{ label: 'data contoh', tasks: [{ sub: 'E4' }] }, { label: 'data real', tasks: [] }]), '');
  assert.match(I.salahHapusSub('E4', [{ label: 'data contoh', tasks: [{ sub: 'E4' }, { sub: 'E4' }] }, { label: 'data real', tasks: [{ sub: 'E4' }] }]),
    /^E4 dipakai 2 task di data contoh dan 1 task di data real, jadi tak bisa dihapus\. Nonaktifkan saja/);
});

test('pindahSub (2.25.0): kegiatan pindah ke kode baru, alur ikut, kode lama dihapus atau dinonaktifkan', () => {
  // Belum dipakai task: kode lama dihapus (tak dipakai ulang).
  let tulis = I.pindahSub('E9', 'I9', [], 0);
  assert.deepEqual(tulis.map(x => [x.kunci, x.aktif, !!x.dihapus]), [['I9', true, false], ['E9', false, true]]);
  assert.deepEqual([I.subTahap('I9').nama, I.subTahap('I9').tim, I.subTahap('I9').tahap], ['Monitoring dan evaluasi guru', 'CO', 'I']);
  assert.equal(I.SUB_TAHAP.some(s => s.kode === 'E9'), false);
  assert.equal(I.kodeSubBerikut('E'), 'E13', 'nomor lain tak bergeser');
  I.aturMaster([]);

  // Dipakai task dan alur paket: alur ikut kode baru, kode lama dinonaktifkan (task lama tetap terbaca).
  tulis = I.pindahSub('E1', 'E13', [], 3);
  assert.deepEqual(tulis.map(x => x.kunci), ['E13', 'latsol', 'tryout', 'drilling', 'E1']);
  assert.deepEqual([I.subTahap('E1').aktif, I.subTahap('E1').nama, I.subTahap('E13').nama], [false, 'QC soal', 'QC soal']);
  assert.ok(I.ALUR_PAKET.Latsol.includes('E13:konten') && !I.ALUR_PAKET.Latsol.some(l => l.startsWith('E1:')));
  const baris = tulis.slice();
  I.aturMaster(baris);
  assert.deepEqual(I.aturMaster(baris), {}, 'baris hasilnya utuh saat dimuat ulang');
  I.aturMaster([]);

  // Ditolak, dan daftar hidup kembali seperti semula.
  for (const [dari, ke, pesan] of [
    ['E12', 'E13', /menutup siklus/], ['E9', 'E1', /E1 sudah dipakai sub-stage "QC soal"/], ['E9', 'E9', /selain E9/],
    ['X1', 'E13', /tidak ditemukan/], ['DV1', 'R5', /harus sub-stage ADDIE/], ['E9', 'Q1', /Kode sub-stage diawali/], ['E9', ' ', /Isi kode tujuan/],
  ]) assert.throws(() => I.pindahSub(dari, ke, [], 0), pesan);
  assert.equal(I.SUB_TAHAP.length, 46);
  assert.ok(I.ALUR_PAKET.Latsol.includes('E1:konten'));
  // Kode yang pernah dihapus juga tak bisa jadi tujuan.
  const hapus = I.periksaMaster('substage', { kunci: 'E8', dihapus: true }, []);
  I.aturMaster([hapus]);
  assert.throws(() => I.pindahSub('E9', 'E8', [hapus], 0), /tak dipakai ulang/);
});
