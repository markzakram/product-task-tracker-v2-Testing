/* Rancangan paket → proyek → setoran (0.6.0, selaras PRD v3). Elaborasi membuat satu BATCH
   per target: rangkaian langkah sesuai jenisnya (mis. Latsol: DV1 › E1 › DV8 › I1 › E4 › E5 ›
   E6 › I4), diserahkan ke Lead tim pemilik tiap sub-stage. Progres paket dihitung dari status
   task — naik per capaian (konten siap, ter-input, lolos QC, tayang) dan turun lagi bila
   langkahnya dibuka kembali. Semua langkah dijalankan dengan aturan sungguhan (terapkanAksi). */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');

const HARI = '2026-10-07';
const WAKTU = Date.UTC(2026, 9, 7, 3, 0, 0);

function data() {
  return {
    tasks: [], projects: [], log: [], dashboards: [], links: [], notes: [], setoran: [],
    packages: [{
      id: 'PKG-001', platform: 'Cerebrum', program: '', namaPaket: 'TKA_CEREBRUM', produkPic: '', mirror: false,
      dibimbing: '', latsol: '', materi: '', tryout: '', drilling: '', liveClass: '', catatan: '',
      items: [
        { id: 'ITM-A', urutan: 1, kategori: 'Latsol', grup: '', nama: 'Fisika', target: 5, satuan: 'Paket', awal: 2, catatan: '' },
        { id: 'ITM-B', urutan: 2, kategori: 'Latsol', grup: '', nama: 'Biologi', target: 5, satuan: 'Paket', awal: 5, catatan: '' },
        { id: 'ITM-C', urutan: 3, kategori: 'Live Class', grup: '', nama: 'Kelas Strategi', target: 4, satuan: 'Sesi', awal: 0, catatan: '' },
        { id: 'ITM-D', urutan: 4, kategori: 'Tryout', grup: '', nama: 'TO Akbar', target: 2, satuan: 'Paket', awal: 3, catatan: '' },
      ],
      links: [],
    }],
  };
}
const SEMUA = ['ITM-A', 'ITM-B', 'ITM-C', 'ITM-D'];
const paket = d => d.packages[0];
const target = (d, id) => {
  const p = paket(d);
  return I.hitungTarget(p.items.find(i => i.id === id), I.setoranPaket(d, p).get(id));
};
const elaborasi = (d, f = {}, me = 'nynda') => I.elaborasiPaket(d, paket(d), { items: SEMUA, ...f }, me, WAKTU, HARI);

/* Satu langkah sampai lolos gate: PIC mengerjakan, melengkapi syarat, mengajukan; peninjau menyetujui. */
function lolos(d, t, w = WAKTU) {
  I.terapkanAksi(d, t, 'mulai', t.pic, w);
  I.isiOutput(d, t, 'Selesai sesuai target', t.pic, w);
  I.tambahBukti(d, t, { url: 'https://contoh.id/bukti/' + t.id }, t.pic, w);
  const tinjau = I.peninjau(t);
  if (tinjau) {
    I.terapkanAksi(d, t, 'ajukan', t.pic, w);
    I.terapkanAksi(d, t, 'setujui', tinjau, w);
  } else I.terapkanAksi(d, t, 'selesai', t.pic, w);
}

test('elaborasi beralur: satu batch per target terbuka, langkah sesuai jenis, diserahkan ke Lead tim pemilik', () => {
  const d = data();
  const { project, tasks } = elaborasi(d);
  assert.deepEqual([project.id, project.lead, project.paket, project.name, project.stage], ['PRJ-1', '', 'PKG-001', 'Produksi TKA_CEREBRUM', 'V']);
  const fisika = tasks.filter(t => / Latsol Fisika /.test(t.title));
  assert.deepEqual(fisika.map(t => t.sub), ['DV1', 'E1', 'DV8', 'I1', 'E4', 'E5', 'E6', 'I4'], 'Biologi penuh & TO Akbar lebih: tak dibuatkan batch');
  assert.deepEqual(fisika.map(t => t.pic), ['andika', 'andika', 'alya', 'alya', 'alya', 'alya', 'alya', 'alya']);
  assert.deepEqual(fisika.map(t => t.stage), ['V', 'E', 'V', 'I', 'E', 'E', 'E', 'I']);
  assert.equal(fisika[0].title, 'DV1 · Latsol Fisika — 3 Paket');
  assert.deepEqual(fisika.slice(1).map((t, i) => t.deps), fisika.slice(0, -1).map(t => [t.id]), 'tiap langkah menunggu langkah sebelumnya');
  const kelas = tasks.filter(t => /Kelas Strategi/.test(t.title));
  assert.deepEqual(kelas.map(t => [t.sub, t.pic]), [['I6', 'dhea'], ['I7', 'alya']]);
  const st = d.setoran.filter(s => s.item === 'ITM-A');
  assert.deepEqual(st.map(s => [tasks.find(t => t.id === s.task).sub, s.tahap, s.jumlah]), [['E1', 'konten', 3], ['DV8', 'input', 3], ['E6', 'qc', 3], ['I4', 'tayang', 3]]);
  assert.equal(new Set(st.map(s => s.batch)).size, 1, 'satu batch');
  assert.deepEqual(I.timProyek(d, project), ['AK', 'LA', 'CO'], 'proyek tanpa Lead: tim yang terlibat terbaca dari task');
  assert.throws(() => elaborasi(d), /Tidak ada target terbuka/, 'yang sedang digarap tak dibuatkan batch kedua');
});

test('progres per capaian: E1 → 40%, DV8 → 60%, QC terakhir → 85%, I4 → tayang; dibuka kembali turun lagi', () => {
  const d = data();
  const { project, tasks } = elaborasi(d, { items: ['ITM-A'] });
  const langkah = kode => tasks.find(t => t.sub === kode);
  const persen = () => target(d, 'ITM-A').persen;
  assert.deepEqual([persen(), target(d, 'ITM-A').digarap, target(d, 'ITM-A').status], [40, 3, 'digarap'], 'sudah ada 2 dari 5');
  lolos(d, langkah('DV1'));
  assert.equal(persen(), 40, 'produksi saja belum menaikkan progres');
  lolos(d, langkah('E1'));
  assert.equal(persen(), 64, 'konten siap: 2 + 3×40%');
  lolos(d, langkah('DV8'));
  assert.equal(persen(), 76, 'ter-input: 2 + 3×60%');
  I.segarkanTahap(d);
  assert.equal(project.stage, 'I', 'tahap proyek ikut task terbuka paling awal');
  for (const k of ['I1', 'E4', 'E5']) lolos(d, langkah(k));
  assert.equal(persen(), 76);
  lolos(d, langkah('E6'));
  assert.equal(persen(), 91, 'lolos QC output: 2 + 3×85%');
  lolos(d, langkah('I4'));
  assert.deepEqual([persen(), target(d, 'ITM-A').terpenuhi, target(d, 'ITM-A').status], [100, 5, 'penuh'], 'tayang');
  I.terapkanAksi(d, langkah('I4'), 'buka', 'nynda', WAKTU);
  assert.deepEqual([persen(), target(d, 'ITM-A').status], [91, 'digarap'], 'show/hide dibuka kembali: turun ke capaian sebelumnya');
});

test('mode satu task, dan langkah yang dicoret per jenis', () => {
  const satu = elaborasi(data(), { mode: 'satu' });
  assert.deepEqual(satu.tasks.map(t => [t.sub, t.pic, t.title]), [
    ['DV1', 'andika', 'DV1 · Latsol Fisika — 3 Paket'], ['I6', 'dhea', 'I6 · Live Class Kelas Strategi — 4 Sesi'],
  ]);
  const d = data();
  const { tasks } = elaborasi(d, { items: ['ITM-A'], langkah: { Latsol: ['DV1', 'E1', 'DV8', 'I4'] } });
  assert.deepEqual(tasks.map(t => t.sub), ['DV1', 'E1', 'DV8', 'I4']);
  assert.deepEqual(d.setoran.map(s => s.tahap), ['konten', 'input', 'tayang']);
  const d2 = data();
  elaborasi(d2, { items: ['ITM-A'], langkah: { Latsol: ['DV1', 'E1'] } });
  assert.deepEqual(d2.setoran.map(s => s.tahap), ['tayang'], 'langkah terakhir yang tersisa menandai tayang');
  assert.throws(() => elaborasi(data(), { items: ['ITM-A'], langkah: { Latsol: [] } }), /minimal satu langkah untuk Latsol/);
});

test('elaborasi dengan jumlah sendiri: target 10 cukup dikerjakan 5 dulu, sisanya dielaborasi lagi nanti', () => {
  const d = data();
  paket(d).items.push({ id: 'ITM-E', urutan: 5, kategori: 'Tryout', grup: '', nama: 'TO UTBK', target: 10, satuan: 'Paket', awal: 0, catatan: '' });
  const pertama = elaborasi(d, { items: ['ITM-E'], jumlah: { 'ITM-E': '5' }, mode: 'satu' });
  assert.deepEqual(pertama.tasks.map(t => t.title), ['DV1 · Tryout TO UTBK — 5 Paket']);
  assert.deepEqual(d.setoran.map(s => [s.item, s.jumlah]), [['ITM-E', 5]]);
  const sisa = () => I.sisaTerbuka(paket(d).items.find(i => i.id === 'ITM-E'), I.setoranPaket(d, paket(d)).get('ITM-E'));
  assert.equal(sisa(), 5, 'lima sisanya masih terbuka');
  lolos(d, pertama.tasks[0]);
  assert.deepEqual([target(d, 'ITM-E').terpenuhi, target(d, 'ITM-E').status], [5, 'sebagian'], 'setengah target terpenuhi, bukan penuh');
  assert.throws(() => elaborasi(d, { items: ['ITM-E'], jumlah: { 'ITM-E': 6 } }), /6 melebihi sisa yang belum ditangani \(5 Paket\)/);
  elaborasi(d, { items: ['ITM-E'], jumlah: { 'ITM-E': 5 } });
  assert.equal(sisa(), 0);
  assert.throws(() => elaborasi(data(), { items: ['ITM-A'], jumlah: { 'ITM-A': '0' } }), /Tidak ada target terbuka/, 'jumlah 0 = tidak dikerjakan');
  assert.equal(elaborasi(data(), { items: ['ITM-A'], jumlah: { 'ITM-A': '' }, mode: 'satu' }).tasks[0].title, 'DV1 · Latsol Fisika — 3 Paket', 'kosong = seluruh sisa');
});

test('elaborasi ke proyek yang sudah ada: satu proyek boleh mengerjakan beberapa paket', () => {
  const d = data();
  d.packages.push({ ...paket(data()), id: 'PKG-002', namaPaket: 'UTBK', items: [{ id: 'ITM-U', urutan: 1, kategori: 'Materi', grup: '', nama: 'Penalaran', target: 2, satuan: 'BAB', awal: 0, catatan: '' }] });
  const { project } = elaborasi(d, { items: ['ITM-A'], mode: 'satu' });
  const kedua = I.elaborasiPaket(d, d.packages[1], { items: ['ITM-U'], proyek: project.id }, 'nynda', WAKTU, HARI);
  assert.equal(kedua.project, project);
  assert.deepEqual(kedua.tasks.map(t => t.sub), ['DV3', 'E2', 'DV8', 'I2', 'E5', 'I4']);
  assert.equal(project.paket, 'PKG-001', 'tautan utama tak tertimpa');
  assert.deepEqual(I.paketProyek(d, project).map(p => p.id), ['PKG-001', 'PKG-002']);
  assert.deepEqual(I.proyekPengisi(d, 'PKG-002').map(p => p.id), [project.id]);
  assert.throws(() => I.elaborasiPaket(d, d.packages[1], { items: ['ITM-U'], proyek: 'PRJ-404' }, 'nynda', WAKTU, HARI), /tidak ditemukan/);
});

test('elaborasi oleh Lead: langkah tim lain diserahkan ke Lead tim pemiliknya; Staff tak boleh', () => {
  const d = data();
  const { project, tasks } = elaborasi(d, { items: ['ITM-A'] }, 'alya');
  assert.equal(project.lead, '');
  assert.deepEqual([...new Set(tasks.map(t => t.pic))], ['andika', 'alya'], 'Alya menyerahkan DV1 & E1 ke Andika');
  assert.ok(tasks.every(t => t.assignedBy === 'alya'));
  assert.throws(() => elaborasi(data(), {}, 'kiki'), /Hanya Lead atau Manager/);
});

test('setoran manual: hanya Lead/Manager task itu, capaian bisa dipilih, menyetor lagi mengganti', () => {
  const d = data();
  const t = I.taskBaru(d, { title: 'Bikin kelas strategi', pic: 'kiki', sub: 'R4' }, 'alya', WAKTU, HARI);
  I.setorkan(d, t, { paket: 'PKG-001', item: 'ITM-C', jumlah: '2' }, 'alya', WAKTU);
  I.setorkan(d, t, { paket: 'PKG-001', item: 'ITM-C', jumlah: '1,5', tahap: 'qc' }, 'alya', WAKTU);
  assert.deepEqual(d.setoran.map(s => [s.task, s.item, s.jumlah, s.tahap]), [[t.id, 'ITM-C', 1.5, 'qc']]);
  assert.throws(() => I.setorkan(d, t, { paket: 'PKG-001', item: 'ITM-C', jumlah: 1 }, 'kiki', WAKTU), /Hanya Lead atau Manager/);
  assert.throws(() => I.setorkan(d, t, { paket: 'PKG-001', item: 'ITM-C', jumlah: 1 }, 'andika', WAKTU), /Hanya Lead atau Manager/, 'Lead tim lain');
  assert.throws(() => I.setorkan(d, t, { paket: 'PKG-001', item: 'ITM-X', jumlah: 1 }, 'alya', WAKTU), /Pilih target/);
  assert.throws(() => I.setorkan(d, t, { paket: 'PKG-001', item: 'ITM-C', jumlah: 0 }, 'alya', WAKTU), /lebih dari 0/);
  assert.equal(target(d, 'ITM-C').digarap, 1.5);
  I.terapkanAksi(d, t, 'mulai', 'kiki', WAKTU);
  I.terapkanAksi(d, t, 'selesai', 'kiki', WAKTU);
  assert.deepEqual([target(d, 'ITM-C').terpenuhi, target(d, 'ITM-C').capaian.qc, target(d, 'ITM-C').digarap], [0, 1.5, 0], 'dihitung sampai lolos QC saja');
  I.hapusSetoran(d, d.setoran[0].id, 'alya', WAKTU);
  assert.equal(d.setoran.length, 0);
});

test('setoran yang task-nya hilang ditandai dan tidak dihitung', () => {
  const d = data();
  d.setoran.push({ id: 'st-x', paket: 'PKG-001', item: 'ITM-C', task: 'PRD-999', jumlah: 4, catatan: '' });
  const k = I.setoranPaket(d, paket(d)).get('ITM-C');
  assert.deepEqual([k[0].hilang, k[0].selesai, k[0].tahap], [true, false, 'tayang']);
  assert.deepEqual([target(d, 'ITM-C').terpenuhi, target(d, 'ITM-C').digarap, target(d, 'ITM-C').status], [0, 0, 'belum']);
});

test('target dihapus membawa setorannya; paket dihapus melepas tautan proyek', () => {
  const d = data();
  const { project } = elaborasi(d);
  const p = paket(d);
  I.simpanPaket(d, p, { namaPaket: p.namaPaket, items: p.items.filter(i => i.id !== 'ITM-C') }, 'nynda', WAKTU);
  assert.ok(d.setoran.length && d.setoran.every(s => s.item === 'ITM-A'));
  I.hapusPaket(d, p, 'nynda', WAKTU);
  assert.deepEqual([d.setoran.length, project.paket], [0, '']);
});

test('menautkan proyek lama ke paket hanya oleh Manager', () => {
  const d = data();
  const proj = I.proyekBaru(d, { name: 'Kolaborasi lama' }, 'nynda', WAKTU);
  assert.equal(proj.paket, '');
  assert.throws(() => I.tautkanPaket(d, proj, 'PKG-001', 'alya', WAKTU), /Hanya Manager/);
  assert.throws(() => I.tautkanPaket(d, proj, 'PKG-404', 'nynda', WAKTU), /tidak ditemukan/);
  I.tautkanPaket(d, proj, 'PKG-001', 'nynda', WAKTU);
  assert.equal(proj.paket, 'PKG-001');
  I.tautkanPaket(d, proj, '', 'nynda', WAKTU);
  assert.equal(proj.paket, '');
});
