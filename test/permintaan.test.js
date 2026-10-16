/* Permintaan lanjutan (2.36.0, permintaan user): dari task yang sudah diajukan atau selesai,
   minta orang lain (tim mana pun) melanjutkannya; penerima menerima dulu. Juga label terlambat
   di kepala proyek yang mengikuti tim yang melihat (sorotProyek). */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');

const HARI = '2026-10-07';
const WAKTU = Date.UTC(2026, 9, 7, 3, 0, 0);

let n = 0;
function task(o) {
  n++;
  return {
    id: 'PRD-' + String(n).padStart(3, '0'), project: 'PRJ-1', lane: 'proyek', kategori: '', title: 'Task ' + n, platform: 'ASN',
    stage: 'D', sub: 'D2', detail: '', pic: 'andika', support: [], priority: 'Normal', start: '2026-10-01', due: '', status: 'Antre',
    tertahan: false, alasanTertahan: '', output: '', deps: [], tunggu: [], notes: '', assignedBy: 'andika', cycle: 1,
    createdAt: WAKTU, updatedAt: WAKTU, selesaiAt: 0, subtasks: [], comments: [], tinjauan: [], evidence: [], ...o,
  };
}
const proyek = o => ({ id: 'PRJ-1', name: 'SKD CPNS 2027', platform: 'ASN', stage: 'D', cycle: 1, decision: 'Build', goal: '', lead: 'andika', history: [], ...o });
const data = tasks => ({ ...I.dataKosong(), tasks, projects: [proyek()] });
const notif = (d, me, jenis) => I.notifikasi(d, me, 200).filter(x => x.jenis === jenis);

test('yang boleh meminta: PIC, Lead-nya, atau Manager, dari task yang sudah diajukan atau selesai', () => {
  const t = task({ pic: 'uma', status: 'Selesai', selesaiAt: WAKTU });
  assert.equal(I.bolehMinta(t, 'uma'), true, 'PIC');
  assert.equal(I.bolehMinta(t, 'andika'), true, 'Lead PIC');
  assert.equal(I.bolehMinta(t, 'nynda'), true, 'Manager');
  assert.equal(I.bolehMinta(t, 'ali'), false, 'orang lain');
  assert.equal(I.bolehMinta(t, 'tri'), false, 'rekan setim');
  assert.equal(I.bolehMinta({ ...t, status: 'Ditinjau' }, 'uma'), true, 'sudah diajukan');
  assert.equal(I.bolehMinta({ ...t, status: 'Dikerjakan' }, 'uma'), false, 'belum diajukan');
});

test('Andika meminta Ali, Ali menerima: task baru di proyek yang sama, tertaut, Andika diberi tahu', () => {
  const asal = task({ title: 'Blueprint soal SKD', status: 'Selesai', selesaiAt: WAKTU });
  const d = data([asal]);
  const m = I.mintaLanjutan(d, asal, { ke: 'ali', judul: '  Prototype   dari blueprint ', rincian: 'Uji 20 soal', sub: 'DV7', due: '2026-10-24' }, 'andika', WAKTU + 1, HARI);
  assert.equal(m.id, 'MNT-001');
  assert.equal(m.judul, 'Prototype dari blueprint');
  assert.deepEqual([m.status, m.dari, m.ke, m.sub, m.due], ['menunggu', 'andika', 'ali', 'DV7', '2026-10-24']);
  assert.equal(d.log[0].type, 'update', 'bukan create: notifikasi tak membacanya sebagai task baru');
  assert.deepEqual(I.permintaanMasuk(d, 'ali').map(x => [x.m.id, x.tim]), [['MNT-001', false]]);
  assert.equal(notif(d, 'ali', 'minta').length, 1);
  assert.equal(notif(d, 'ali', 'minta')[0].task, asal.id, 'notifikasi membuka task asal');
  assert.deepEqual(I.permintaanMasuk(d, 'andika'), [], 'peminta tak melihatnya sebagai permintaan masuk');

  assert.throws(() => I.terimaPermintaan(d, m, { pic: 'ali', sub: 'DV7' }, 'andika', WAKTU + 2, HARI), /bukan untuk Anda/);
  const baru = I.terimaPermintaan(d, m, { pic: 'ali', sub: 'DV7' }, 'ali', WAKTU + 2, HARI);
  assert.deepEqual([baru.project, baru.sub, baru.pic, baru.status, baru.due, baru.detail], ['PRJ-1', 'DV7', 'ali', 'Antre', '2026-10-24', 'Uji 20 soal']);
  assert.deepEqual(baru.deps, [], 'task asal sudah selesai: tak perlu ditunggu');
  assert.deepEqual([m.status, m.task, m.oleh], ['diterima', baru.id, 'ali']);
  assert.equal(I.asalPermintaan(d, baru.id), m);
  assert.deepEqual(I.permintaanDari(d, asal.id), [m]);
  assert.deepEqual(I.permintaanMasuk(d, 'ali'), []);
  const terima = notif(d, 'andika', 'mintaTerima');
  assert.equal(terima.length, 1);
  assert.equal(terima[0].task, baru.id, 'notifikasi membuka task barunya');
  assert.throws(() => I.terimaPermintaan(d, m, { pic: 'ali', sub: 'DV7' }, 'ali', WAKTU + 3, HARI), /sudah dijawab/);
});

test('isian permintaan diperiksa', () => {
  const asal = task({ status: 'Selesai', selesaiAt: WAKTU });
  const d = data([asal]);
  const minta = f => () => I.mintaLanjutan(d, asal, { ke: 'ali', judul: 'Prototype', ...f }, 'andika', WAKTU, HARI);
  assert.throws(minta({ ke: 'andika' }), /orang lain/);
  assert.throws(minta({ ke: 'siapa' }), /Pilih orang/);
  assert.throws(minta({ judul: ' ' }), /yang dibutuhkan/);
  assert.throws(minta({ sub: 'R1' }), /sub-stage ADDIE/);
  assert.throws(minta({ sub: 'ZZ9' }), /tidak ada di Master/);
  assert.throws(minta({ due: '2026-10-01' }), /sudah lewat/);
  assert.throws(() => I.mintaLanjutan(d, { ...asal, status: 'Dikerjakan' }, { ke: 'ali', judul: 'x' }, 'andika', WAKTU, HARI), /diajukan atau selesai/);
  assert.equal(minta({})().sub, '', 'sub-stage boleh dikosongkan: penerima yang memilih');
});

test('staff diminta: Lead-nya ikut tahu dan bisa mengalihkan; task asal yang masih ditinjau ditunggu', () => {
  const asal = task({ pic: 'uma', status: 'Ditinjau' });
  const d = data([asal]);
  const m = I.mintaLanjutan(d, asal, { ke: 'kiki', judul: 'Input 120 soal ke SIADU', sub: 'DV8' }, 'uma', WAKTU, HARI);
  assert.equal(notif(d, 'alya', 'mintaTim').length, 1, 'Lead penerima diberi tahu');
  assert.deepEqual(I.permintaanMasuk(d, 'alya').map(x => x.tim), [true]);
  assert.equal(I.bolehAlihkanMinta(m, 'alya'), true);
  assert.equal(I.bolehAlihkanMinta(m, 'kiki'), false, 'staff tak mengalihkan');
  assert.throws(() => I.alihkanPermintaan(d, m, 'tri', 'alya', WAKTU + 1), /anggota tim Anda/);
  I.alihkanPermintaan(d, m, 'bilar', 'alya', WAKTU + 1);
  assert.deepEqual([m.ke, m.dialihkan], ['bilar', 'kiki']);
  assert.equal(I.bolehJawabMinta(m, 'kiki'), false);
  assert.equal(notif(d, 'kiki', 'mintaAlih').length, 1, 'penerima lama diberi tahu');
  assert.equal(notif(d, 'uma', 'mintaAlih').length, 1, 'peminta diberi tahu');
  assert.equal(notif(d, 'bilar', 'minta')[0].alih, 'alya');
  assert.equal(notif(d, 'alya', 'mintaTim').length, 0, 'sesudah dialihkan Lead sendiri, tak perlu diberi tahu lagi');
  // Staff menerima untuk dirinya sendiri, dengan sub-stage timnya.
  assert.throws(() => I.terimaPermintaan(d, m, { pic: 'bilar', sub: 'DV7' }, 'bilar', WAKTU + 2, HARI), /tim lain/);
  const baru = I.terimaPermintaan(d, m, { pic: 'bilar', sub: 'DV8' }, 'bilar', WAKTU + 2, HARI);
  assert.deepEqual(baru.deps, [asal.id], 'task asal belum disetujui: task baru menunggunya');
});

test('menolak butuh alasan; peminta bisa membatalkan selama belum dijawab', () => {
  const asal = task({ status: 'Selesai', selesaiAt: WAKTU });
  const d = data([asal]);
  const m = I.mintaLanjutan(d, asal, { ke: 'dhea', judul: 'Video pembahasan TWK' }, 'andika', WAKTU, HARI);
  assert.throws(() => I.tolakPermintaan(d, m, ' no', 'dhea', WAKTU + 1), /alasannya/);
  I.tolakPermintaan(d, m, 'Tim CLO baru bisa mulai November.', 'dhea', WAKTU + 1);
  assert.deepEqual([m.status, m.alasan, m.oleh], ['ditolak', 'Tim CLO baru bisa mulai November.', 'dhea']);
  assert.equal(notif(d, 'andika', 'mintaTolak')[0].teks, 'Tim CLO baru bisa mulai November.');
  assert.throws(() => I.batalkanPermintaan(d, m, 'andika', WAKTU + 2), /belum dijawab/);
  const m2 = I.mintaLanjutan(d, asal, { ke: 'alya', judul: 'Input soal' }, 'andika', WAKTU + 3, HARI);
  assert.equal(m2.id, 'MNT-002');
  assert.throws(() => I.batalkanPermintaan(d, m2, 'alya', WAKTU + 4), /Hanya peminta/);
  I.batalkanPermintaan(d, m2, 'andika', WAKTU + 4);
  assert.equal(m2.status, 'batal');
  assert.deepEqual(I.permintaanMasuk(d, 'alya'), []);
});

test('hari kerja dan permintaan yang terlalu lama belum dijawab', () => {
  assert.equal(I.hariKerja('2026-10-16', '2026-10-19'), 1, 'Jumat → Senin: satu hari kerja');
  assert.equal(I.hariKerja('2026-10-16', '2026-10-20'), 2);
  assert.equal(I.hariKerja('2026-10-16', '2026-10-16'), 0);
  const m = { status: 'menunggu', createdAt: new Date(2026, 9, 16, 10).getTime(), dialihkanAt: 0 };
  assert.equal(I.mintaLama(m, '2026-10-19'), false);
  assert.equal(I.mintaLama(m, '2026-10-20'), true, `${I.BATAS_MINTA} hari kerja`);
  assert.equal(I.mintaLama({ ...m, status: 'diterima' }, '2026-10-30'), false);
});

test('permintaan ikut data real: perintah, perubahan, dan penerapannya', () => {
  const asal = task({ status: 'Selesai', selesaiAt: WAKTU });
  const a = data([asal]);
  const b = structuredClone(a);
  const r = I.jalankanPerintah(b, { aksi: 'mintaLanjutan', isi: { task: asal.id, f: { ke: 'ali', judul: 'Prototype' } }, oleh: 'andika', at: WAKTU, hari: HARI });
  assert.equal(r.ok, true, r.galat);
  const ubah = I.bedaData(a, b);
  assert.equal(ubah.permintaan.pasang.length, 1);
  const c = I.terapkanUbah(structuredClone(a), ubah);
  assert.equal(c.permintaan[0].ke, 'ali');
  const r2 = I.jalankanPerintah(b, { aksi: 'terimaPermintaan', isi: { permintaan: 'MNT-001', f: { sub: 'DV7' } }, oleh: 'ali', at: WAKTU + 1, hari: HARI });
  assert.equal(r2.ok, true, r2.galat);
  assert.equal(I.ringkasHasil(r2.hasil).id, b.permintaan[0].task, 'hasilnya task baru, supaya ID-nya bisa disamakan dengan server');
});

test('label terlambat dan tertahan di kepala proyek mengikuti tim yang melihat (Manager: semua)', () => {
  const d = data([
    task({ pic: 'kiki', sub: 'DV8', status: 'Dikerjakan', due: '2026-10-01' }),
    task({ pic: 'uma', status: 'Dikerjakan', due: '2026-10-01' }),
    task({ pic: 'tri', status: 'Dikerjakan', tertahan: true, alasanTertahan: 'x' }),
    task({ pic: 'ali', sub: 'DV7', status: 'Selesai', due: '2026-10-01' }),
  ]);
  const p = d.projects[0];
  const angka = me => { const s = I.sorotProyek(d, p, HARI, me); return [s.telat, s.tertahan, s.lingkup]; };
  assert.deepEqual(angka('nynda'), [2, 1, 'semua']);
  assert.deepEqual(angka('andika'), [1, 1, 'tim']);
  assert.deepEqual(angka('wildan'), [1, 1, 'tim'], 'staff melihat angka timnya');
  assert.deepEqual(angka('alya'), [1, 0, 'tim']);
  assert.deepEqual(angka('ali'), [0, 0, 'tim'], 'tim tanpa yang terlambat: label tak muncul');
  // Diklik: Task dengan lingkup "Tim saya", staff juga, selagi disaring ke proyek itu.
  assert.deepEqual(I.lingkupTask('kiki', 'tim', 'PRJ-1'), ['alya', 'kiki', 'bilar']);
  assert.deepEqual(I.lingkupTask('kiki', 'tim', ''), ['kiki'], 'tanpa saringan proyek staff kembali ke Saya');
});
