const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');

const HARI = '2026-10-07';
const WAKTU = Date.UTC(2026, 9, 7, 3, 0, 0);

let n = 0;
function task(o) {
  n++;
  return {
    id: 'PRD-' + String(n).padStart(3, '0'), project: '', lane: 'rutin', kategori: 'QC', title: 'Task ' + n, platform: 'ASN',
    stage: '', sub: '', detail: '', pic: 'kiki', support: [], priority: 'Normal', start: '2026-10-01', due: '', status: 'Antre',
    tertahan: false, alasanTertahan: '', output: '', deps: [], notes: '', assignedBy: 'alya', cycle: 1,
    createdAt: WAKTU, updatedAt: WAKTU, selesaiAt: 0, subtasks: [], comments: [], tinjauan: [], evidence: [], ...o,
  };
}
const proyek = o => ({ id: 'PRJ-1', name: 'Paket Uji', platform: 'PCPM', stage: 'V', cycle: 1, decision: 'Build', goal: '', lead: 'alya', history: [], ...o });
const data = (tasks, projects = []) => ({ tasks, projects, log: [], packages: [], dashboards: [], links: [], notes: [] });

test.beforeEach(() => { n = 0; });

test('peninjau: rutin tanpa tinjauan; staff ditinjau Lead-nya; Lead ditinjau Manager; Manager tidak', () => {
  assert.equal(I.peninjau(task({ lane: 'rutin', pic: 'kiki' })), null);
  assert.equal(I.peninjau(task({ lane: 'proyek', pic: 'kiki' })), 'alya');
  assert.equal(I.peninjau(task({ lane: 'proyek', pic: 'uma' })), 'andika');
  assert.equal(I.peninjau(task({ lane: 'proyek', pic: 'alya' })), 'nynda');
  assert.equal(I.peninjau(task({ lane: 'proyek', pic: 'nynda' })), null);
  assert.equal(I.peninjau(task({ lane: 'proyek', pic: 'Arifah' })), 'nynda', 'di luar organogram → Manager');
});

test('alur rutin: Antre → Dikerjakan → Selesai, langsung oleh PIC', () => {
  const t = task({ lane: 'rutin', pic: 'kiki' });
  const d = data([t]);
  I.terapkanAksi(d, t, 'mulai', 'kiki', WAKTU);
  assert.equal(t.status, 'Dikerjakan');
  assert.deepEqual(I.aksiUntuk(t, 'kiki', I.indeks(d)).map(a => a.kunci), ['selesai', 'tahan']);
  I.terapkanAksi(d, t, 'selesai', 'kiki', WAKTU + 1);
  assert.equal(t.status, 'Selesai');
  assert.equal(t.selesaiAt, WAKTU + 1);
  assert.equal(d.log[0].detail, 'Ditandai selesai');
});

test('alur proyek: staff mengajukan, hanya Lead-nya (atau Manager) yang menyetujui', () => {
  const t = task({ lane: 'proyek', project: 'PRJ-1', stage: 'V', pic: 'kiki', status: 'Dikerjakan' });
  const d = data([t], [proyek()]);
  assert.deepEqual(I.aksiUntuk(t, 'kiki', I.indeks(d)).map(a => a.kunci), ['ajukan', 'tahan'], 'tak ada jalan pintas ke Selesai');
  I.terapkanAksi(d, t, 'ajukan', 'kiki', WAKTU);
  assert.equal(t.status, 'Ditinjau');
  assert.throws(() => I.terapkanAksi(d, t, 'setujui', 'andika', WAKTU), /tidak tersedia/, 'Lead lain tak bisa menyetujui');
  assert.throws(() => I.terapkanAksi(d, t, 'setujui', 'kiki', WAKTU), /tidak tersedia/, 'PIC tak bisa menyetujui sendiri');
  I.terapkanAksi(d, t, 'setujui', 'alya', WAKTU + 5);
  assert.equal(t.status, 'Selesai');
  assert.deepEqual(t.tinjauan.map(r => [r.action, r.by]), [['Diajukan', 'kiki'], ['Disetujui', 'alya']]);
});

test('mengembalikan wajib memberi alasan, dan task kembali Dikerjakan', () => {
  const t = task({ lane: 'proyek', pic: 'kiki', status: 'Ditinjau' });
  const d = data([t]);
  assert.throws(() => I.terapkanAksi(d, t, 'kembalikan', 'alya', WAKTU, '  '), /alasannya/);
  I.terapkanAksi(d, t, 'kembalikan', 'alya', WAKTU, 'Bobot skor paket 3 belum diganti');
  assert.equal(t.status, 'Dikerjakan');
  assert.equal(t.tinjauan[0].note, 'Bobot skor paket 3 belum diganti');
});

test('dependency belum selesai: Mulai nonaktif, dengan alasan yang menyebut task-nya', () => {
  const dulu = task({ pic: 'tri', status: 'Dikerjakan' });
  const t = task({ pic: 'kiki', deps: [dulu.id] });
  const d = data([dulu, t]);
  const mulai = I.aksiUntuk(t, 'kiki', I.indeks(d)).find(a => a.kunci === 'mulai');
  assert.equal(mulai.nonaktif, true);
  assert.equal(mulai.alasan, 'Menunggu PRD-001 "Task 1" (Tri)');
  assert.throws(() => I.terapkanAksi(d, t, 'mulai', 'kiki', WAKTU), /Menunggu PRD-001/);
  dulu.status = 'Selesai';
  I.terapkanAksi(d, t, 'mulai', 'kiki', WAKTU);
  assert.equal(t.status, 'Dikerjakan');
});

test('tertahan adalah tanda: status tetap, alasan wajib, Selesai terkunci sampai dilepas', () => {
  const t = task({ status: 'Dikerjakan' });
  const d = data([t]);
  I.terapkanAksi(d, t, 'tahan', 'kiki', WAKTU, 'Menunggu tabel konversi');
  assert.equal(t.status, 'Dikerjakan');
  assert.equal(t.tertahan, true);
  assert.throws(() => I.terapkanAksi(d, t, 'selesai', 'kiki', WAKTU), /Lepas tanda tertahan/);
  I.terapkanAksi(d, t, 'lanjutkan', 'kiki', WAKTU);
  I.terapkanAksi(d, t, 'selesai', 'kiki', WAKTU);
  assert.equal(t.status, 'Selesai');
});

test('hak ubah: staff hanya task-nya; Lead task timnya; Manager semua', () => {
  const t = task({ pic: 'kiki', assignedBy: 'nynda' });
  assert.equal(I.bolehUbah(t, 'kiki'), true);
  assert.equal(I.bolehUbah(t, 'bilar'), false);
  assert.equal(I.bolehUbah(t, 'alya'), true, 'Kiki tim Alya');
  assert.equal(I.bolehUbah(t, 'andika'), false);
  assert.equal(I.bolehUbah(t, 'nynda'), true);
  assert.deepEqual(I.aksiUntuk(t, 'bilar', I.indeks(data([t]))), []);
});

test('pindah kolom papan memakai aturan yang sama', () => {
  const rutin = task({ status: 'Dikerjakan' });
  const proj = task({ lane: 'proyek', status: 'Dikerjakan' });
  const d = data([rutin, proj]);
  const perId = I.indeks(d);
  assert.deepEqual(I.aksiPindah(rutin, 'Selesai', 'kiki', perId), { kunci: 'selesai', perluCatatan: false });
  assert.match(I.aksiPindah(proj, 'Selesai', 'kiki', perId).galat, /perlu ditinjau Alya/);
  assert.deepEqual(I.aksiPindah(proj, 'Ditinjau', 'kiki', perId), { kunci: 'ajukan', perluCatatan: false });
  assert.match(I.aksiPindah(rutin, 'Antre', 'kiki', perId).galat, /Tidak bisa memindah/);
  proj.status = 'Ditinjau';
  assert.deepEqual(I.aksiPindah(proj, 'Dikerjakan', 'alya', perId), { kunci: 'kembalikan', perluCatatan: true });
  assert.deepEqual(I.aksiPindah(proj, 'Dikerjakan', 'kiki', perId), { kunci: 'tarik', perluCatatan: false });
});

test('Hari Ini: dikelompokkan per tenggat, yang terhambat dan yang ditinjau terpisah', () => {
  const tasks = [
    task({ pic: 'kiki', due: '2026-10-05', title: 'telat' }),
    task({ pic: 'kiki', due: '2026-10-07', title: 'hari ini' }),
    task({ pic: 'kiki', due: '2026-10-09', title: 'minggu' }),
    task({ pic: 'kiki', due: '2026-11-01', title: 'nanti' }),
    task({ pic: 'kiki', due: '2026-10-01', tertahan: true, alasanTertahan: 'tunggu Tri', title: 'tertahan' }),
    task({ lane: 'proyek', pic: 'kiki', status: 'Ditinjau', title: 'ditinjau' }),
    task({ pic: 'bilar', support: ['kiki'], title: 'bantu' }),
    task({ pic: 'alya', subtasks: [{ id: 's1', title: 'Input 20 soal', pic: 'kiki', due: '', done: false }], title: 'induk' }),
    task({ pic: 'kiki', status: 'Selesai', selesaiAt: WAKTU, title: 'beres' }),
    task({ pic: 'bilar', title: 'bukan milik' }),
  ];
  const h = I.pekerjaanSaya(data(tasks), 'kiki', HARI);
  const peta = Object.fromEntries(h.grup.map(g => [g.kunci, g.isi.map(x => x.t.title)]));
  assert.deepEqual(peta, {
    telat: ['telat'], hari: ['hari ini'], minggu: ['minggu'], nanti: ['nanti'],
    sub: ['induk'], tunggu: ['tertahan', 'ditinjau'], bantu: ['bantu'],
  });
  assert.equal(h.grup.find(g => g.kunci === 'tunggu').isi[0].alasan, 'Tertahan: tunggu Tri');
  assert.equal(h.grup.find(g => g.kunci === 'tunggu').isi[1].alasan, 'Menunggu tinjauan Alya');
  assert.deepEqual(h.selesaiHariIni.map(t => t.title), ['beres']);
  const lead = I.pekerjaanSaya(data(tasks), 'alya', HARI);
  assert.deepEqual(lead.grup.find(g => g.kunci === 'tinjau').isi.map(x => x.t.title), ['ditinjau']);
});

test('papan: kolom Selesai hanya 7 hari terakhir; lingkup tim mengikuti Lead', () => {
  const lama = Date.UTC(2026, 8, 1);
  const tasks = [
    task({ pic: 'kiki', status: 'Selesai', selesaiAt: WAKTU, title: 'baru' }),
    task({ pic: 'kiki', status: 'Selesai', selesaiAt: lama, title: 'arsip' }),
    task({ pic: 'uma', status: 'Dikerjakan', title: 'tim lain' }),
  ];
  const kol = I.kolomPapan(data(tasks), { orang: I.lingkupOrang('kiki', 'tim') }, HARI);
  assert.deepEqual(kol.map(k => [k.status, k.isi.map(t => t.title)]), [['Antre', []], ['Dikerjakan', []], ['Ditinjau', []], ['Selesai', ['baru']]]);
  assert.deepEqual(I.lingkupOrang('kiki', 'tim'), ['alya', 'kiki', 'bilar']);
  assert.equal(I.lingkupOrang('nynda', 'tim'), null, 'Manager: seluruh divisi');
});

test('gate proyek: maju hanya bila semua task tahap ini selesai; dari Evaluation ke siklus baru', () => {
  const p = proyek({ stage: 'V' });
  const a = task({ lane: 'proyek', project: 'PRJ-1', stage: 'V', status: 'Selesai', selesaiAt: WAKTU });
  const b = task({ lane: 'proyek', project: 'PRJ-1', stage: 'V', status: 'Dikerjakan' });
  const d = data([a, b], [p]);
  assert.equal(I.ringkasProyek(d, p, HARI).keadaan, 'aman');
  assert.throws(() => I.majukan(d, p, 'nynda', WAKTU, HARI), /belum selesai/);
  b.status = 'Selesai';
  assert.deepEqual(I.antreKeputusan(d, HARI).map(x => x.id), ['PRJ-1']);
  assert.throws(() => I.majukan(d, p, 'alya', WAKTU, HARI), /Hanya Manager/);
  I.majukan(d, p, 'nynda', WAKTU, HARI);
  assert.equal(p.stage, 'I');
  assert.equal(I.ringkasProyek(d, p, HARI).keadaan, 'kosong', 'tahap baru belum punya task');
  const e = proyek({ id: 'PRJ-2', stage: 'E' });
  const t = task({ lane: 'proyek', project: 'PRJ-2', stage: 'E', status: 'Selesai' });
  const d2 = data([t], [e]);
  I.majukan(d2, e, 'nynda', WAKTU, HARI);
  assert.deepEqual([e.stage, e.cycle, e.history[0].dari], ['A', 2, 'E']);
});

test('keadaan proyek: risiko kalau ada yang telat; ditahan tak masuk antrean keputusan', () => {
  const p = proyek();
  const d = data([task({ lane: 'proyek', project: 'PRJ-1', stage: 'V', due: '2026-10-01' })], [p]);
  assert.equal(I.ringkasProyek(d, p, HARI).keadaan, 'risiko');
  d.tasks[0].status = 'Selesai';
  I.setKeputusan(d, p, 'Hold', 'nynda', WAKTU);
  assert.equal(I.ringkasProyek(d, p, HARI).keadaan, 'ditahan');
  assert.deepEqual(I.antreKeputusan(d, HARI), []);
});

test('membuat task: Lead hanya untuk timnya, staff tidak membuat task', () => {
  const p = proyek();
  const d = data([task({})], [p]);
  const t = I.taskBaru(d, { title: 'QC paket 4', project: 'PRJ-1', pic: 'kiki', due: '2026-10-10' }, 'alya', WAKTU, HARI);
  assert.deepEqual([t.id, t.lane, t.stage, t.status, t.assignedBy], ['PRD-002', 'proyek', 'V', 'Antre', 'alya']);
  assert.throws(() => I.taskBaru(d, { title: 'x', pic: 'uma' }, 'alya', WAKTU, HARI), /di luar tim/);
  assert.equal(I.bolehBuatTask('kiki'), false);
  const r = I.taskBaru(d, { title: 'Rekap fee guru', pic: 'nadya', kategori: 'Operasional' }, 'nynda', WAKTU, HARI);
  assert.deepEqual([r.lane, r.stage, r.kategori], ['rutin', '', 'Operasional']);
});

test('laporan: hitungan aktif, telat, dan selesai per minggu', () => {
  const tasks = [
    task({ due: '2026-10-01' }),
    task({ status: 'Selesai', selesaiAt: WAKTU }),
    task({ status: 'Selesai', selesaiAt: Date.UTC(2026, 8, 30, 3) }),
  ];
  const r = I.laporan(data(tasks), HARI);
  assert.deepEqual(r.kpi, { aktif: 1, telat: 1, tertahan: 0, ditinjau: 0, selesai30: 2 });
  assert.equal(r.mingguan.length, 8);
  assert.equal(r.mingguan[7].jumlah, 1, 'minggu ini (mulai Senin 5 Okt)');
  assert.equal(r.mingguan[6].jumlah, 1, 'minggu lalu');
});

test('proyek arsip tak masuk antrean keputusan; task rutin bawaan Review PM ditinjau Manager', () => {
  const p = proyek({ arsip: true });
  const d = data([task({ lane: 'proyek', project: 'PRJ-1', stage: 'V', status: 'Selesai' })], [p]);
  assert.equal(I.ringkasProyek(d, p, HARI).keadaan, 'arsip');
  assert.deepEqual(I.antreKeputusan(d, HARI), []);
  I.setArsip(d, p, false, 'nynda', WAKTU);
  assert.deepEqual(I.antreKeputusan(d, HARI).map(x => x.id), ['PRJ-1']);
  const r = task({ lane: 'rutin', status: 'Ditinjau', pic: 'kiki' });
  assert.equal(I.peninjau(r), 'nynda');
  assert.equal(I.peninjau({ ...r, status: 'Dikerjakan' }), null);
});

test('target paket: status dihitung dari target dan yang sudah ada, kelebihan tetap terlihat', () => {
  assert.deepEqual(I.hitungTarget({ target: 5, awal: 0 }), { target: 5, terpenuhi: 0, sisa: 5, lebih: 0, status: 'belum' });
  assert.equal(I.hitungTarget({ target: 5, awal: 2 }).status, 'sebagian');
  assert.equal(I.hitungTarget({ target: 5, awal: 5 }).status, 'penuh');
  assert.deepEqual(I.hitungTarget({ target: 5, awal: 7 }), { target: 5, terpenuhi: 7, sisa: 0, lebih: 2, status: 'lebih' });
  const r = I.ringkasPaket({ items: [{ target: 5, awal: 5 }, { target: 10, awal: 4 }, { target: 2, awal: 3 }], latsol: 'DL 28 Sept', tryout: '' });
  assert.deepEqual([r.target, r.terpenuhi, r.sisa, r.penuh, r.lebih, r.kurang, r.isiProduk], [17, 11, 6, 1, 1, 1, 1],
    'kelebihan tak menambah persentase di atas target');
});

test('paket: Lead/Manager menyusun, PIC Produk menyunting paketnya, staff lain tidak', () => {
  const d = data([]);
  d.packages = [];
  const p = I.paketBaru(d, { namaPaket: 'PCPM Tahap III', platform: 'PCPM', produkPic: 'kiki' }, 'alya', WAKTU);
  assert.deepEqual([p.id, p.namaPaket, p.mirror], ['PKG-001', 'PCPM Tahap III', false]);
  assert.throws(() => I.paketBaru(d, { namaPaket: 'x' }, 'kiki', WAKTU), /Hanya Lead atau Manager/);
  assert.equal(I.bolehUbahPaket(p, 'kiki'), true);
  assert.equal(I.bolehUbahPaket(p, 'bilar'), false);
  assert.equal(I.bolehUbahPaket(p, 'andika'), true);
});
