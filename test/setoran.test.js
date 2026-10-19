/* Rancangan paket → proyek → setoran (0.6.0, selaras PRD v3). Elaborasi membuat satu BATCH
   per target: rangkaian langkah sesuai jenisnya (mis. Latsol: DV1 › E1 › DV8 › I1 › E4 › E5 ›
   E6 › I4), diserahkan ke Lead tim pemilik tiap sub-stage. Progres paket dihitung dari status
   task — naik per capaian (konten siap, ter-input, lolos QC, tayang) dan turun lagi bila
   langkahnya dibuka kembali. Sejak 2.19.0 langkah dikerjakan menurut fase ADDIE tiap tim,
   ditambah urutan yang dipasang elaborasi: serah-terima antartim dan urutan alur di dalam tim
   (I4 tayang menunggu QC). Semua langkah dijalankan dengan aturan sungguhan. */
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
  assert.deepEqual(fisika.slice(1).map((t, i) => t.deps), fisika.slice(0, -1).map(t => [t.id]), 'urutan langkah tercatat (untuk menemukan batch-nya)');
  const perId = I.indeks(d);
  assert.deepEqual(fisika.map(t => I.depsBelum(t, perId).length > 0), [false, true, true, true, true, true, true, true],
    'hanya produksi soal yang langsung jalan');
  const id = kode => fisika.find(t => t.sub === kode).id;
  assert.deepEqual(fisika.map(t => t.tunggu), [[], [], [id('DV1')], [], [], [], [], [id('E4'), id('E5'), id('E6')]],
    'serah-terima: input LNA menunggu produksi soal RAD (bukan QC-nya); I4 tayang menunggu QC LNA yang di alur datang lebih dulu');
  const tunggu = kode => I.ditunggu(fisika.find(t => t.sub === kode), perId).map(x => `${x.jenis}:${x.t.sub}`).sort();
  assert.deepEqual(tunggu('E1'), ['fase:DV1'], 'QC soal menunggu fase Development RAD');
  assert.deepEqual(tunggu('I1'), ['fase:DV8']);
  assert.deepEqual(tunggu('E4'), ['fase:DV8', 'fase:I1', 'fase:I7'],
    'fase Evaluation LNA menunggu Implementation LNA di batch mana pun (I7 live class); I4 berdiri di Evaluation karena menunggu E4–E6, jadi tak ditunggu');
  assert.deepEqual(tunggu('I4'), ['atur:E4', 'atur:E5', 'atur:E6', 'fase:DV8']);
  const kelas = tasks.filter(t => /Kelas Strategi/.test(t.title));
  assert.deepEqual(kelas.map(t => [t.sub, t.pic]), [['I6', 'dhea'], ['I7', 'alya']]);
  assert.deepEqual(kelas.map(t => t.tunggu), [[], [kelas[0].id]], 'tayang live class LNA menunggu pelaksanaan CLO');
  assert.equal(I.depsBelum(kelas[0], perId).length, 0, 'CLO tak menunggu tim lain');
  const st = d.setoran.filter(s => s.item === 'ITM-A');
  assert.deepEqual(st.map(s => [tasks.find(t => t.id === s.task).sub, s.tahap, s.jumlah]), [['E1', 'konten', 3], ['DV8', 'input', 3], ['E6', 'qc', 3], ['I4', 'tayang', 3]]);
  assert.equal(new Set(st.map(s => s.batch)).size, 1, 'satu batch');
  assert.deepEqual(I.timProyek(d, project), ['AK', 'LA', 'CO'], 'proyek tanpa Lead: tim yang terlibat terbaca dari task');
  assert.throws(() => elaborasi(d), /Tidak ada target terbuka/, 'yang sedang digarap tak dibuatkan batch kedua');
});

test('progres per capaian mengikuti urutan tim: DV8 → 60%, QC → 85%, I4 → tayang; dibuka kembali turun ke capaian yang masih lolos', () => {
  const d = data();
  const { project, tasks } = elaborasi(d, { items: ['ITM-A'] });
  const langkah = kode => tasks.find(t => t.sub === kode);
  const persen = () => target(d, 'ITM-A').persen;
  assert.deepEqual([persen(), target(d, 'ITM-A').digarap, target(d, 'ITM-A').status], [40, 3, 'digarap'], 'sudah ada 2 dari 5');
  assert.throws(() => lolos(d, langkah('E1')), /Menunggu fase Development RAD selesai: PRD-\d+ "DV1 · Latsol Fisika — 3 Paket" \(RAD · Andika\)/,
    'QC soal (Evaluation) menunggu fase Development timnya');
  assert.throws(() => lolos(d, langkah('DV8')), /Menunggu PRD-\d+ "DV1 · Latsol Fisika — 3 Paket" \(RAD · Andika\)/, 'serah-terima dari RAD');
  lolos(d, langkah('DV1'));
  assert.equal(persen(), 40, 'produksi saja tak menaikkan progres');
  lolos(d, langkah('DV8'));
  assert.equal(persen(), 76, 'ter-input: 2 + 3×60% — input tak menunggu QC soal');
  lolos(d, langkah('E1'));
  assert.equal(persen(), 76, 'capaian tertinggi yang lolos tetap input');
  I.segarkanTahap(d);
  assert.equal(project.stage, 'I', 'tahap proyek ikut task terbuka paling awal');
  lolos(d, langkah('I1'));
  assert.equal(persen(), 76);
  assert.throws(() => lolos(d, langkah('I4')), /Menunggu PRD-\d+ "E4 · /, 'tayang menunggu QC');
  for (const k of ['E4', 'E5', 'E6']) lolos(d, langkah(k));
  assert.equal(persen(), 91, 'lolos QC: 2 + 3×85%');
  lolos(d, langkah('I4'));
  assert.deepEqual([persen(), target(d, 'ITM-A').terpenuhi, target(d, 'ITM-A').status], [100, 5, 'penuh'], 'tayang');
  I.terapkanAksi(d, langkah('I4'), 'buka', 'nynda', WAKTU);
  assert.deepEqual([persen(), target(d, 'ITM-A').status], [91, 'digarap'], 'show/hide dibuka kembali: turun ke capaian tertinggi yang masih lolos (QC 85%)');
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
  assert.throws(() => elaborasi(data(), { items: [] }), /Centang dulu target/, 'tanpa target tercentang: pesan yang jelas');
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

test('hapus proyek (2.22.0; sejak 2.42.0 Manager dan Lead): staff tidak; task, turunan, dan setorannya ikut hilang, target terbuka lagi', () => {
  const d = data();
  const { project, tasks } = elaborasi(d, { items: ['ITM-A'] });
  const lain = elaborasi(d, { items: ['ITM-C'] });
  const induk = tasks.find(t => t.sub === 'DV1');
  I.taskAnak(d, induk, { title: 'Soal 1–10', pic: 'andika' }, 'andika', WAKTU, HARI);
  assert.equal(target(d, 'ITM-A').digarap, 3);
  assert.throws(() => I.hapusProyek(d, project, 'uma', WAKTU), /Hanya Lead atau Manager/, 'staff tidak boleh');
  assert.equal(I.izin('andika', 'proyek.hapus'), true, 'Lead boleh (2.42.0)');
  const r = I.ringkasHapusProyek(d, project);
  assert.deepEqual([r.task, r.turunan, r.terbuka, r.setoran, r.paket], [9, 1, 9, 4, ['PKG-001']]);

  // Lewat perintah data real: perubahannya hanya daftar baris yang dihapus.
  const sebelum = JSON.parse(JSON.stringify(d));
  const h = I.jalankanPerintah(d, { aksi: 'hapusProyek', isi: { proyek: project.id }, oleh: 'nynda', at: WAKTU + 1, hari: HARI });
  assert.equal(h.ok, true, h.galat);
  assert.deepEqual([h.hasil.proyek, h.hasil.task], [project.id, 9]);
  assert.equal(d.projects.some(p => p.id === project.id), false);
  assert.equal(d.tasks.some(t => t.project === project.id), false);
  assert.equal(d.setoran.some(s => tasks.some(t => t.id === s.task)), false);
  assert.ok(d.tasks.some(t => t.project === lain.project.id) && d.setoran.some(s => s.item === 'ITM-C'), 'proyek lain utuh');
  assert.equal(target(d, 'ITM-A').digarap, 0, 'targetnya terbuka lagi untuk dielaborasi');
  const beda = I.bedaData(sebelum, d);
  assert.deepEqual(beda.projects.hapus, [project.id]);
  assert.equal(beda.tasks.hapus.length, 9);
  assert.equal(beda.tasks.pasang, undefined, 'task lain tak ditulis ulang');
  assert.equal(d.log[0].detail, 'Proyek dihapus beserta 9 task dan 4 setoran paket');
  assert.match(I.jalankanPerintah(d, { aksi: 'hapusProyek', isi: { proyek: project.id }, oleh: 'nynda', at: WAKTU + 2, hari: HARI }).galat, /tidak ditemukan/);
});

test('capaian bersama (2.26.0): satu capaian di beberapa langkah, tercapai setelah semuanya selesai; mundur tetap ditolak', () => {
  // Alur Latsol seperti yang disusun user: Konten siap di DV1 & E1, Lolos QC di E4–E7.
  const alur = 'DV1:konten, E1:konten, DV8:input, I1, E4:qc, E5:qc, E6:qc, E7:qc, I4:tayang';
  const kat = I.periksaMaster('kategori', { kunci: 'latsol', alur }, []);
  assert.throws(() => I.periksaMaster('kategori', { kunci: 'latsol', alur: alur.replace('I1,', 'I1:konten,') }, []), /Konten siap di I1 dipasang sesudah Ter-input di DV8/);
  I.aturMaster([kat]);
  try {
    const d = data();
    const { tasks } = elaborasi(d, { items: ['ITM-A'] });
    assert.deepEqual(d.setoran.map(s => [tasks.find(t => t.id === s.task).sub, s.tahap]),
      [['DV1', 'konten'], ['E1', 'konten'], ['DV8', 'input'], ['E4', 'qc'], ['E5', 'qc'], ['E6', 'qc'], ['E7', 'qc'], ['I4', 'tayang']]);
    const e5 = tasks.find(t => t.sub === 'E5');
    assert.match(e5.detail, /Lolos QC output" di progres paket setelah semua langkah bertanda itu disetujui: E4, E5, E6, E7/);
    assert.match(tasks.find(t => t.sub === 'DV8').detail, /Saat langkah ini disetujui, batch ini menjadi "Ter-input"/);

    // Progres: tiap capaian baru terhitung setelah semua langkah bertanda itu selesai.
    const k = (sub, selesai) => ({ ...d.setoran.find(s => tasks.find(t => t.id === s.task).sub === sub), selesai, hilang: false });
    const capai = selesai => I.batchSetoran(['DV1', 'E1', 'DV8', 'E4', 'E5', 'E6', 'E7', 'I4'].map(s => k(s, selesai.includes(s))))[0].capai;
    assert.equal(capai(['DV1']), '', 'Konten siap belum: E1 belum selesai');
    assert.equal(capai(['DV1', 'E1']), 'konten');
    assert.equal(capai(['DV1', 'E1', 'DV8', 'E4', 'E5', 'E6']), 'input', 'Lolos QC belum: E7 belum selesai');
    assert.equal(capai(['DV1', 'E1', 'DV8', 'E4', 'E5', 'E6', 'E7']), 'qc');
    assert.equal(capai(['DV1', 'DV8']), 'input', 'capaian lebih tinggi yang lengkap tetap terhitung, seperti sebelumnya');
    // I4 tayang tetap menunggu semua QC LNA (fase Evaluation) lewat urutan alur.
    const i4 = tasks.find(t => t.sub === 'I4');
    assert.deepEqual(['E4', 'E5', 'E6', 'E7'].every(s => i4.tunggu.includes(tasks.find(t => t.sub === s).id)), true);
  } finally { I.aturMaster([]); }
});
