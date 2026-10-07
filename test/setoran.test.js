/* Rancangan paket → proyek → setoran (0.5.0). Progres paket tidak pernah ditulis saat
   task selesai; ia dihitung dari status task. Tes di sini memastikan angka itu ikut naik
   dan turun bersama alur tinjauan yang sesungguhnya (terapkanAksi). */
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
const elaborasi = (d, f = {}, me = 'nynda') =>
  I.elaborasiPaket(d, paket(d), { lead: 'andika', pic: 'uma', items: SEMUA, ...f }, me, WAKTU, HARI);

test('elaborasi: satu task per target yang masih terbuka, tahap Development, setoran = sisanya', () => {
  const d = data();
  const { project, tasks } = elaborasi(d);
  assert.deepEqual([project.id, project.stage, project.lead, project.paket, project.name], ['PRJ-1', 'V', 'andika', 'PKG-001', 'Produksi TKA_CEREBRUM']);
  assert.deepEqual(tasks.map(t => t.title), ['Latsol · Fisika — 3 Paket', 'Live Class · Kelas Strategi — 4 Sesi'],
    'Biologi sudah penuh dan TO Akbar sudah lebih: tak dibuatkan task');
  assert.deepEqual(tasks.map(t => [t.lane, t.project, t.stage, t.pic, t.status, t.kategori]),
    [['proyek', 'PRJ-1', 'V', 'uma', 'Antre', 'Develop Konten'], ['proyek', 'PRJ-1', 'V', 'uma', 'Antre', 'Develop Konten']]);
  assert.deepEqual(tasks.map(t => t.sub), ['3.1 Academic Content Development', '3.3 Content Production']);
  assert.deepEqual(d.setoran.map(s => [s.paket, s.item, s.task, s.jumlah]), [['PKG-001', 'ITM-A', tasks[0].id, 3], ['PKG-001', 'ITM-C', tasks[1].id, 4]]);
  assert.match(d.log.map(l => l.detail).join('\n'), /Proyek dari rancangan paket PKG-001, tahap Development/);
  assert.throws(() => elaborasi(d), /Tidak ada target terbuka/, 'yang sedang digarap tak dibuatkan task kedua');
});

test('elaborasi dengan jumlah sendiri: target 10 cukup dikerjakan 5 dulu, sisanya dielaborasi lagi nanti', () => {
  const d = data();
  paket(d).items.push({ id: 'ITM-E', urutan: 5, kategori: 'Tryout', grup: '', nama: 'TO UTBK', target: 10, satuan: 'Paket', awal: 0, catatan: '' });
  const pertama = elaborasi(d, { items: ['ITM-E'], jumlah: { 'ITM-E': '5' } });
  assert.deepEqual(pertama.tasks.map(t => t.title), ['Tryout · TO UTBK — 5 Paket']);
  assert.deepEqual(d.setoran.map(s => [s.item, s.jumlah]), [['ITM-E', 5]]);
  const sisa = () => I.sisaTerbuka(paket(d).items.find(i => i.id === 'ITM-E'), I.setoranPaket(d, paket(d)).get('ITM-E'));
  assert.equal(sisa(), 5, 'lima sisanya masih terbuka');
  const t = pertama.tasks[0];
  I.terapkanAksi(d, t, 'mulai', 'uma', WAKTU);
  I.terapkanAksi(d, t, 'ajukan', 'uma', WAKTU);
  I.terapkanAksi(d, t, 'setujui', 'andika', WAKTU);
  assert.deepEqual([target(d, 'ITM-E').terpenuhi, target(d, 'ITM-E').status], [5, 'sebagian'], 'setengah target terpenuhi, bukan penuh');
  assert.throws(() => elaborasi(d, { items: ['ITM-E'], jumlah: { 'ITM-E': 6 } }), /6 melebihi sisa yang belum ditangani \(5 Paket\)/);
  const kedua = elaborasi(d, { items: ['ITM-E'], jumlah: { 'ITM-E': 5 } });
  assert.equal(kedua.tasks[0].title, 'Tryout · TO UTBK — 5 Paket');
  assert.equal(sisa(), 0);
  assert.throws(() => elaborasi(data(), { items: ['ITM-A'], jumlah: { 'ITM-A': '0' } }), /Tidak ada target terbuka/, 'jumlah 0 = tidak dikerjakan');
  assert.deepEqual(elaborasi(data(), { items: ['ITM-A'], jumlah: { 'ITM-A': '' } }).tasks.map(x => x.title), ['Latsol · Fisika — 3 Paket'], 'kosong = seluruh sisa');
});

test('progres paket bergerak sendiri: disetujui → terpenuhi, dibuka kembali → turun lagi', () => {
  const d = data();
  const { tasks: [fisika] } = elaborasi(d);
  assert.deepEqual([target(d, 'ITM-A').status, target(d, 'ITM-A').terpenuhi, target(d, 'ITM-A').digarap], ['digarap', 2, 3]);
  I.terapkanAksi(d, fisika, 'mulai', 'uma', WAKTU);
  I.terapkanAksi(d, fisika, 'ajukan', 'uma', WAKTU);
  assert.equal(target(d, 'ITM-A').status, 'digarap', 'diajukan belum dihitung: menunggu peninjau');
  I.terapkanAksi(d, fisika, 'setujui', 'andika', WAKTU);
  assert.deepEqual([target(d, 'ITM-A').status, target(d, 'ITM-A').terpenuhi, target(d, 'ITM-A').masuk], ['penuh', 5, 3]);
  const r = I.ringkasPaket(paket(d), I.setoranPaket(d, paket(d)));
  assert.deepEqual([r.target, r.terpenuhi, r.digarap, r.penuh, r.sedang, r.terbuka], [16, 12, 4, 2, 1, 0]);
  I.terapkanAksi(d, fisika, 'buka', 'andika', WAKTU);
  assert.deepEqual([target(d, 'ITM-A').status, target(d, 'ITM-A').terpenuhi], ['digarap', 2], 'dibuka kembali: angkanya turun sendiri');
});

test('gate selaras: proyek hasil elaborasi baru bisa maju setelah semua targetnya disetujui', () => {
  const d = data();
  const { project, tasks } = elaborasi(d);
  const siap = () => I.ringkasProyek(d, project, HARI).siapMaju;
  for (const t of tasks) { I.terapkanAksi(d, t, 'mulai', 'uma', WAKTU); I.terapkanAksi(d, t, 'ajukan', 'uma', WAKTU); }
  I.terapkanAksi(d, tasks[0], 'setujui', 'andika', WAKTU);
  assert.equal(siap(), false);
  I.terapkanAksi(d, tasks[1], 'setujui', 'andika', WAKTU);
  assert.equal(siap(), true);
  assert.deepEqual(I.antreKeputusan(d, HARI).map(p => p.id), [project.id]);
  assert.equal(I.ringkasPaket(paket(d), I.setoranPaket(d, paket(d))).kurang, 0, 'semua target paket terpenuhi');
});

test('elaborasi oleh Lead: Lead proyeknya dirinya sendiri, PIC hanya dari timnya; Staff tak boleh', () => {
  const d = data();
  const { project } = elaborasi(d, { lead: 'andika', pic: 'kiki' }, 'alya');
  assert.equal(project.lead, 'alya');
  assert.throws(() => elaborasi(data(), { pic: 'uma' }, 'alya'), /di luar tim Anda/);
  assert.throws(() => elaborasi(data(), {}, 'kiki'), /Hanya Lead atau Manager/);
  assert.throws(() => elaborasi(data(), { lead: 'kiki' }), /harus Lead atau Manager/);
});

test('setoran manual: hanya Lead/Manager task itu, menyetor lagi mengganti jumlah', () => {
  const d = data();
  const t = I.taskBaru(d, { title: 'Bikin kelas strategi', pic: 'kiki', kategori: 'Operasional' }, 'alya', WAKTU, HARI);
  I.setorkan(d, t, { paket: 'PKG-001', item: 'ITM-C', jumlah: '2' }, 'alya', WAKTU);
  I.setorkan(d, t, { paket: 'PKG-001', item: 'ITM-C', jumlah: '1,5' }, 'alya', WAKTU);
  assert.deepEqual(d.setoran.map(s => [s.task, s.item, s.jumlah]), [[t.id, 'ITM-C', 1.5]]);
  assert.throws(() => I.setorkan(d, t, { paket: 'PKG-001', item: 'ITM-C', jumlah: 1 }, 'kiki', WAKTU), /Hanya Lead atau Manager/);
  assert.throws(() => I.setorkan(d, t, { paket: 'PKG-001', item: 'ITM-C', jumlah: 1 }, 'andika', WAKTU), /Hanya Lead atau Manager/, 'Lead tim lain');
  assert.throws(() => I.setorkan(d, t, { paket: 'PKG-001', item: 'ITM-X', jumlah: 1 }, 'alya', WAKTU), /Pilih target/);
  assert.throws(() => I.setorkan(d, t, { paket: 'PKG-001', item: 'ITM-C', jumlah: 0 }, 'alya', WAKTU), /lebih dari 0/);
  assert.equal(target(d, 'ITM-C').digarap, 1.5);
  I.hapusSetoran(d, d.setoran[0].id, 'alya', WAKTU);
  assert.equal(d.setoran.length, 0);
});

test('setoran yang task-nya hilang ditandai dan tidak dihitung', () => {
  const d = data();
  d.setoran.push({ id: 'st-x', paket: 'PKG-001', item: 'ITM-C', task: 'PRD-999', jumlah: 4, catatan: '' });
  const k = I.setoranPaket(d, paket(d)).get('ITM-C');
  assert.deepEqual([k[0].hilang, k[0].selesai], [true, false]);
  assert.deepEqual([target(d, 'ITM-C').terpenuhi, target(d, 'ITM-C').digarap, target(d, 'ITM-C').status], [0, 0, 'belum']);
});

test('target dihapus membawa setorannya; paket dihapus melepas tautan proyek', () => {
  const d = data();
  const { project } = elaborasi(d);
  const p = paket(d);
  I.simpanPaket(d, p, { namaPaket: p.namaPaket, items: p.items.filter(i => i.id !== 'ITM-C') }, 'nynda', WAKTU);
  assert.deepEqual(d.setoran.map(s => s.item), ['ITM-A']);
  I.hapusPaket(d, p, 'nynda', WAKTU);
  assert.deepEqual([d.setoran.length, project.paket], [0, '']);
});

test('menautkan proyek lama ke paket hanya oleh Manager', () => {
  const d = data();
  const proj = I.proyekBaru(d, { name: 'Kolaborasi lama', lead: 'alya' }, 'nynda', WAKTU);
  assert.equal(proj.paket, '');
  assert.throws(() => I.tautkanPaket(d, proj, 'PKG-001', 'alya', WAKTU), /Hanya Manager/);
  assert.throws(() => I.tautkanPaket(d, proj, 'PKG-404', 'nynda', WAKTU), /tidak ditemukan/);
  I.tautkanPaket(d, proj, 'PKG-001', 'nynda', WAKTU);
  assert.equal(proj.paket, 'PKG-001');
  I.tautkanPaket(d, proj, '', 'nynda', WAKTU);
  assert.equal(proj.paket, '');
});
