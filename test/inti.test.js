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
const data = (tasks, projects = []) => ({ tasks, projects, log: [], packages: [], setoran: [], dashboards: [], links: [], notes: [] });
/* Task proyek yang syarat ajukannya lengkap: output dan tautan bukti terisi. */
const siap = o => task({ lane: 'proyek', output: 'Hasil kerja', evidence: [{ id: 'e1', label: 'Bukti', url: 'https://contoh.id/bukti' }], ...o });

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
  const t = siap({ project: 'PRJ-1', stage: 'V', sub: 'DV8', pic: 'kiki', status: 'Dikerjakan' });
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

test('syarat ajukan (PRD): output, tautan bukti, sub-task, dependency, tidak tertahan', () => {
  const dulu = task({ pic: 'tri', status: 'Dikerjakan' });
  const t = task({ lane: 'proyek', sub: 'DV1', pic: 'uma', status: 'Dikerjakan', deps: [dulu.id],
    subtasks: [{ id: 's1', title: 'Soal 1–20', pic: 'uma', due: '', done: false }] });
  const d = data([dulu, t]);
  const ajukan = () => I.aksiUntuk(t, 'uma', I.indeks(d)).find(a => a.kunci === 'ajukan');
  assert.equal(ajukan().nonaktif, true);
  assert.equal(ajukan().alasan, 'Lengkapi dulu: output terisi, minimal satu tautan bukti, semua sub-task selesai, task yang ditunggu sudah selesai');
  I.isiOutput(d, t, '20 soal TIU + pembahasan', 'uma', WAKTU);
  I.tambahBukti(d, t, { url: 'docs.google.com/spreadsheets/d/soal' }, 'uma', WAKTU);
  t.subtasks[0].done = true;
  dulu.status = 'Selesai';
  assert.equal(ajukan().nonaktif, false, 'staff mengisi output & bukti task-nya sendiri');
  assert.deepEqual(t.evidence.map(e => [e.label, e.url]), [['Google Sheets', 'https://docs.google.com/spreadsheets/d/soal']]);
  assert.throws(() => I.tambahBukti(d, t, { url: 'javascript:alert(1)' }, 'uma', WAKTU), /tidak valid/);
  assert.throws(() => I.isiOutput(d, t, 'x', 'kiki', WAKTU), /Hanya PIC/);
  const rutin = task({ status: 'Dikerjakan' });
  assert.equal(I.aksiUntuk(rutin, 'kiki', I.indeks(data([rutin]))).find(a => a.kunci === 'selesai').nonaktif, false, 'rutin tanpa gate, tanpa syarat');
});

test('keadaan turunan: Siap / Menunggu dari dependency, Revisi sesudah dikembalikan', () => {
  const dulu = task({ status: 'Dikerjakan' });
  const t = task({ deps: [dulu.id] });
  const p = siap({ sub: 'DV1', pic: 'uma', status: 'Dikerjakan' });
  const d = data([dulu, t, p]);
  const k = x => I.labelKeadaan(x, I.indeks(d));
  assert.equal(k(t), 'Menunggu');
  dulu.status = 'Selesai';
  assert.equal(k(t), 'Siap');
  I.terapkanAksi(d, p, 'ajukan', 'uma', WAKTU);
  I.terapkanAksi(d, p, 'kembalikan', 'andika', WAKTU + 1, 'Pembahasan nomor 5 salah');
  assert.equal(k(p), 'Revisi');
  I.terapkanAksi(d, p, 'ajukan', 'uma', WAKTU + 2);
  assert.equal(k(p), '');
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
  const proj = siap({ status: 'Dikerjakan' });
  const kosong = task({ lane: 'proyek', status: 'Dikerjakan', pic: 'kiki' });
  const d = data([rutin, proj, kosong]);
  const perId = I.indeks(d);
  assert.deepEqual(I.aksiPindah(rutin, 'Selesai', 'kiki', perId), { kunci: 'selesai', perluCatatan: false });
  assert.match(I.aksiPindah(proj, 'Selesai', 'kiki', perId).galat, /perlu ditinjau Alya/);
  assert.deepEqual(I.aksiPindah(proj, 'Ditinjau', 'kiki', perId), { kunci: 'ajukan', perluCatatan: false });
  assert.match(I.aksiPindah(kosong, 'Ditinjau', 'kiki', perId).galat, /Lengkapi dulu: output terisi/, 'seret tak bisa melewati syarat');
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

test('tahap proyek dihitung dari task terbuka paling awal; perpindahannya tercatat', () => {
  const p = proyek({ stage: 'A' });
  const a = siap({ project: 'PRJ-1', stage: 'V', sub: 'DV1', pic: 'uma', status: 'Dikerjakan' });
  const b = siap({ project: 'PRJ-1', stage: 'I', sub: 'I1', pic: 'kiki' });
  const d = data([a, b], [p]);
  assert.equal(I.tahapDihitung(d, p), 'V');
  I.segarkanTahap(d, WAKTU, 'uma');
  assert.equal(p.stage, 'V');
  assert.deepEqual(p.history.map(h => [h.dari, h.ke]), [['A', 'V']]);
  I.terapkanAksi(d, a, 'ajukan', 'uma', WAKTU);
  I.terapkanAksi(d, a, 'setujui', 'andika', WAKTU);
  I.segarkanTahap(d, WAKTU + 1, 'andika');
  assert.equal(p.stage, 'I', 'Development tuntas → tahap ikut task terbuka berikutnya, tanpa klik Manager');
  assert.match(d.log[0].detail, /Development → Implementation/);
  b.status = 'Selesai';
  assert.equal(I.tahapDihitung(d, p), 'I', 'semua selesai → tahap terakhir yang dikerjakan');
  assert.equal(I.ringkasProyek(d, p, HARI).keadaan, 'sepi');
});

test('siklus ditutup task E12 yang disetujui; Manager memulai siklus berikutnya', () => {
  const p = proyek({ stage: 'E' });
  const e12 = siap({ project: 'PRJ-1', stage: 'E', sub: 'E12', pic: 'alya', status: 'Dikerjakan' });
  const d = data([e12], [p]);
  assert.equal(I.peninjau(e12), 'nynda', 'E12 bertanda Manager');
  assert.throws(() => I.mulaiSiklus(d, p, 'nynda', WAKTU), /E12/);
  I.terapkanAksi(d, e12, 'ajukan', 'alya', WAKTU);
  I.terapkanAksi(d, e12, 'setujui', 'nynda', WAKTU);
  assert.deepEqual(I.antreKeputusan(d, HARI).map(x => x.id), ['PRJ-1']);
  assert.equal(I.ringkasProyek(d, p, HARI).keadaan, 'tunggu');
  assert.throws(() => I.mulaiSiklus(d, p, 'alya', WAKTU), /Hanya Manager/);
  I.mulaiSiklus(d, p, 'nynda', WAKTU);
  assert.deepEqual([p.stage, p.cycle, p.history[0].ke], ['A', 2, 'A']);
  assert.deepEqual(I.antreKeputusan(d, HARI), [], 'siklus baru belum ditutup');
  assert.equal(I.tahapDihitung(d, p), 'A', 'task siklus lama tak menentukan tahap siklus baru');
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

test('membuat task: sub-stage wajib & menentukan tahap; Lead untuk timnya atau Lead tim pemilik', () => {
  const p = proyek();
  const d = data([task({})], [p]);
  const t = I.taskBaru(d, { title: 'QC paket 4', project: 'PRJ-1', sub: 'E4', pic: 'kiki', due: '2026-10-10' }, 'alya', WAKTU, HARI);
  assert.deepEqual([t.id, t.lane, t.stage, t.sub, t.status, t.assignedBy], ['PRD-002', 'proyek', 'E', 'E4', 'Antre', 'alya']);
  assert.throws(() => I.taskBaru(d, { title: 'x', project: 'PRJ-1', pic: 'kiki' }, 'alya', WAKTU, HARI), /Pilih sub-stage/);
  assert.throws(() => I.taskBaru(d, { title: 'x', project: 'PRJ-1', sub: 'R1', pic: 'kiki' }, 'alya', WAKTU, HARI), /Pilih sub-stage ADDIE/);
  assert.throws(() => I.taskBaru(d, { title: 'x', sub: 'DV1', pic: 'kiki' }, 'alya', WAKTU, HARI), /R1–R4/);
  assert.throws(() => I.taskBaru(d, { title: 'x', project: 'PRJ-1', sub: 'E4', pic: 'uma' }, 'alya', WAKTU, HARI), /di luar tim/);
  const serah = I.taskBaru(d, { title: 'Produksi soal batch 2', project: 'PRJ-1', sub: 'DV1', pic: 'andika' }, 'alya', WAKTU, HARI);
  assert.equal(serah.pic, 'andika', 'Alya menyerahkan DV1 ke Andika, Lead tim pemiliknya');
  assert.equal(I.bolehBuatTask('kiki'), false);
  const r = I.taskBaru(d, { title: 'Rekap fee guru', sub: 'R1', pic: 'nadya' }, 'nynda', WAKTU, HARI);
  assert.deepEqual([r.lane, r.stage, r.sub, r.kategori], ['rutin', '', 'R1', 'Rekap & administrasi']);
});

test('ubah task: delegasi dari antrean tim, sub-stage menentukan tahap, batas PIC & jalur', () => {
  const t = task({ lane: 'proyek', project: 'PRJ-1', stage: 'V', sub: 'DV8', pic: 'alya', assignedBy: 'andika' });
  const d = data([t], [proyek({ lead: '' })]);
  assert.equal(I.pekerjaanSaya(d, 'alya', HARI).grup.find(g => g.kunci === 'antrean').isi.length, 1);
  I.ubahTask(d, t, { pic: 'kiki' }, 'alya', WAKTU);
  assert.equal(t.pic, 'kiki');
  assert.match(d.log[0].detail, /diserahkan ke Kiki/);
  assert.equal(I.pekerjaanSaya(d, 'alya', HARI).grup.find(g => g.kunci === 'antrean'), undefined, 'keluar dari antrean');
  assert.throws(() => I.ubahTask(d, t, { pic: 'uma' }, 'alya', WAKTU), /di luar tim/);
  assert.throws(() => I.ubahTask(d, t, { sub: 'R3' }, 'alya', WAKTU), /ADDIE/);
  assert.throws(() => I.ubahTask(d, t, { title: ' ' }, 'alya', WAKTU), /Judul/);
  I.ubahTask(d, t, { sub: 'I1' }, 'alya', WAKTU);
  assert.deepEqual([t.sub, t.stage], ['I1', 'I']);
  assert.throws(() => I.ubahTask(d, t, { title: 'x' }, 'kiki', WAKTU), /Hanya Lead atau Manager/);

  const lepas = task({ sub: 'A2', kategori: 'RnD', pic: 'uma', assignedBy: 'andika' });
  d.tasks.push(lepas);
  I.ubahTask(d, lepas, { title: 'Riset kompetitor' }, 'andika', WAKTU);
  assert.equal(lepas.sub, 'A2', 'kode ADDIE task lepas warisan v1 boleh tetap');
  assert.throws(() => I.ubahTask(d, lepas, { sub: 'A3' }, 'andika', WAKTU), /R1–R4/);
  I.ubahTask(d, lepas, { sub: 'R2' }, 'andika', WAKTU);
  assert.deepEqual([I.jenisJalur(lepas), lepas.kategori], ['rutin', 'Report berkala']);
  assert.deepEqual(I.cari(d, 'r2').map(x => x.id), [lepas.id], 'kode sub-stage ikut dicari');
});

test('riwayat tahap: perpindahan otomatis dan siklus baru dibedakan', () => {
  const p = proyek({ stage: 'A' });
  const e12 = siap({ project: 'PRJ-1', stage: 'E', sub: 'E12', pic: 'alya', status: 'Selesai' });
  const d = data([e12], [p]);
  I.segarkanTahap(d, WAKTU, 'nynda');
  I.mulaiSiklus(d, p, 'nynda', WAKTU + 1);
  assert.deepEqual(p.history.map(h => [h.jenis, h.dari, h.ke, h.siklus]), [['siklus', 'E', 'A', 2], ['otomatis', 'A', 'E', 1]]);
});

test('sub-stage & tim: kode → tahap, tim pemilik, Lead pendelegasi; rumpun platform', () => {
  assert.equal(I.SUB_TAHAP.length, 46);
  assert.deepEqual(['A4', 'D7', 'DV8', 'I4', 'E12', 'R2'].map(I.tahapDariKode), ['A', 'D', 'V', 'I', 'E', 'R']);
  assert.deepEqual(['DV1', 'DV8', 'DV3', 'DV6', 'A1'].map(I.leadSub), ['andika', 'alya', 'dhea', 'ali', 'nynda']);
  assert.equal(I.peninjau(task({ lane: 'proyek', sub: 'D1', pic: 'kiki' })), 'nynda', 'D1 direview Manager walau PIC staff');
  assert.deepEqual([I.timOrang('kiki').kode, I.timOrang('ali').kode, I.timOrang('nynda').kode], ['LA', 'SI', 'MG']);
  assert.deepEqual(['OJK', 'Sekdin', 'TOEFL', 'Cerebrum', 'Apa saja'].map(I.rumpunDari), ['BUMN & Keuangan', 'Kedinasan & TNI/Polri', 'Bahasa & Beasiswa', 'Lainnya', 'Lainnya']);
  assert.deepEqual([I.jenisJalur(task({ lane: 'proyek' })), I.jenisJalur(task({ sub: 'R3' })), I.jenisJalur(task({ sub: 'E4' })), I.jenisJalur(task({}))], ['proyek', 'rutin', 'lepas', 'rutin']);
  const d = data([task({ sub: 'E4', platform: 'OJK' }), task({ sub: 'DV1', pic: 'uma', platform: 'ASN' }), task({ sub: 'R2', platform: 'OJK' })]);
  const judul = f => I.daftarTask(d, f, HARI).map(t => t.sub);
  assert.deepEqual(judul({ tim: 'LA' }), ['E4']);
  assert.deepEqual(judul({ rumpun: 'BUMN & Keuangan' }), ['E4', 'R2']);
  assert.deepEqual(judul({ jalur: 'lepas' }), ['E4', 'DV1']);
  assert.deepEqual(judul({ sub: 'R2' }), ['R2']);
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
  const p = proyek({ arsip: true, stage: 'E' });
  const d = data([task({ lane: 'proyek', project: 'PRJ-1', stage: 'E', sub: 'E12', status: 'Selesai' })], [p]);
  assert.equal(I.ringkasProyek(d, p, HARI).keadaan, 'arsip');
  assert.deepEqual(I.antreKeputusan(d, HARI), []);
  I.setArsip(d, p, false, 'nynda', WAKTU);
  assert.deepEqual(I.antreKeputusan(d, HARI).map(x => x.id), ['PRJ-1']);
  assert.throws(() => I.setKeputusan(d, p, 'Lanjut', 'nynda', WAKTU), /tidak dikenal/);
  I.setKeputusan(d, p, 'Improve', 'nynda', WAKTU);
  assert.equal(p.decision, 'Improve');
  const r = task({ lane: 'rutin', status: 'Ditinjau', pic: 'kiki' });
  assert.equal(I.peninjau(r), 'nynda');
  assert.equal(I.peninjau({ ...r, status: 'Dikerjakan' }), null);
});

test('proyek tanpa Lead tetap: tim yang terlibat dihitung dari task terbuka', () => {
  const p = proyek({ lead: '' });
  const d = data([
    task({ lane: 'proyek', project: 'PRJ-1', sub: 'DV1', pic: 'andika' }),
    task({ lane: 'proyek', project: 'PRJ-1', sub: 'DV8', pic: 'alya' }),
    task({ lane: 'proyek', project: 'PRJ-1', sub: 'E10', pic: 'dhea', status: 'Selesai' }),
  ], [p]);
  assert.deepEqual(I.timProyek(d, p), ['AK', 'LA']);
  const baru = I.proyekBaru(d, { name: 'UTBK 2027' }, 'nynda', WAKTU);
  assert.equal(baru.lead, '');
});

test('target paket: status dihitung dari target dan yang sudah ada, kelebihan tetap terlihat', () => {
  const pilih = h => [h.target, h.terpenuhi, h.digarap, h.sisa, h.lebih, h.status, h.persen];
  assert.deepEqual(pilih(I.hitungTarget({ target: 5, awal: 0 })), [5, 0, 0, 5, 0, 'belum', 0]);
  assert.equal(I.hitungTarget({ target: 5, awal: 2 }).status, 'sebagian');
  assert.equal(I.hitungTarget({ target: 5, awal: 5 }).status, 'penuh');
  assert.deepEqual(pilih(I.hitungTarget({ target: 5, awal: 7 })), [5, 7, 0, 0, 2, 'lebih', 100]);
  const r = I.ringkasPaket({ items: [{ target: 5, awal: 5 }, { target: 10, awal: 4 }, { target: 2, awal: 3 }], latsol: 'DL 28 Sept', tryout: '' });
  assert.deepEqual([r.target, r.terpenuhi, r.sisa, r.penuh, r.lebih, r.kurang, r.isiProduk], [17, 11, 6, 1, 1, 1, 1],
    'kelebihan tak menambah persentase di atas target');
});

test('capaian berbobot (PRD): konten 40%, input 60%, QC 85%, tayang 100%; batch dihitung sekali', () => {
  const t = (selesaiKah, tahap, batch) => ({ jumlah: 4, tahap, batch, selesai: selesaiKah, hilang: false });
  const it = { target: 8, awal: 0 };
  // Batch A (4) sudah ter-input; batch B (4) baru konten siap.
  const h = I.hitungTarget(it, [t(true, 'konten', 'A'), t(true, 'input', 'A'), t(false, 'qc', 'A'), t(false, 'tayang', 'A'), t(true, 'konten', 'B'), t(false, 'input', 'B'), t(false, 'tayang', 'B')]);
  assert.deepEqual([h.terpenuhi, h.digarap, h.capaian.input, h.capaian.konten], [0, 8, 4, 8]);
  assert.equal(h.kemajuan, 4 * 0.6 + 4 * 0.4);
  assert.equal(h.persen, 50);
  assert.equal(h.status, 'digarap');
  const r = I.ringkasPaket({ items: [{ id: 'x', ...it }] }, new Map([['x', [t(true, 'tayang'), t(false, 'tayang'), t(true, 'konten')]]]));
  assert.deepEqual([r.terpenuhi, r.persen, r.persenTayang, r.persenDigarap], [4, 70, 50, 30],
    'setoran lama tanpa tahap = tayang; batang: 70% berbobot, sisa batch berjalan 30%');
  const b = I.batchSetoran([t(true, 'konten', 'A'), t(false, 'tayang', 'A'), t(true, 'input', 'A'), { ...t(true, 'tayang', 'B'), hilang: true }]);
  assert.equal(b.length, 1, 'setoran yang task-nya hilang tak membentuk batch');
  assert.deepEqual([b[0].capai, b[0].tertunda, b[0].berikut.tahap, b[0].setoran.map(k => k.tahap)], ['input', true, 'tayang', ['konten', 'input', 'tayang']]);
});

test('dashboard: per tahap, per tim, per rumpun, dan skor bottleneck', () => {
  const blok = task({ lane: 'proyek', sub: 'DV1', stage: 'V', pic: 'uma', status: 'Dikerjakan', due: '2026-10-01' });
  const tunggu = task({ lane: 'proyek', sub: 'DV8', stage: 'V', pic: 'kiki', deps: [blok.id] });
  const tinjau = siap({ sub: 'E1', stage: 'E', pic: 'tri', status: 'Ditinjau' });
  const r = I.laporan(data([blok, tunggu, tinjau, task({ sub: 'R2', platform: 'OJK' })]), HARI);
  assert.deepEqual(r.perTahap.map(x => [x.id, x.jumlah]), [['A', 0], ['D', 0], ['V', 2], ['I', 0], ['E', 1], ['R', 1]]);
  assert.deepEqual(r.perTim.map(x => [x.kode, x.jumlah]), [['MG', 0], ['AK', 2], ['LA', 1], ['CO', 1], ['SI', 0]]);
  assert.equal(r.perRumpun.find(x => x.nama === 'BUMN & Keuangan').jumlah, 1);
  const o = id => r.perOrang.find(x => x.id === id);
  assert.deepEqual([o('uma').menahan, o('uma').telat, o('uma').bottleneck], [1, 1, 3], 'menahan 1 task × 2 + 1 telat');
  assert.deepEqual([o('andika').tinjau, o('andika').bottleneck], [1, 2], 'gate menunggu review × 2');
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
