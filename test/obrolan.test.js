/* Komunikasi bersama (0.10.0): peristiwa obrolan diperiksa, disusun menjadi pesan per ruang,
   lalu dipakai untuk sebutan, pertanyaan, utas, dan notifikasi. */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');

let n = 0;
function task(o) {
  n++;
  return {
    id: 'PRD-' + String(n).padStart(3, '0'), project: '', lane: 'rutin', kategori: 'QC', title: 'Task ' + n, platform: 'ASN',
    stage: '', sub: '', detail: '', pic: 'kiki', support: [], priority: 'Normal', start: '2026-10-01', due: '', status: 'Antre',
    tertahan: false, alasanTertahan: '', output: '', deps: [], notes: '', assignedBy: 'alya', cycle: 1,
    createdAt: 1, updatedAt: 1, selesaiAt: 0, subtasks: [], comments: [], tinjauan: [], evidence: [], ...o,
  };
}
const data = (tasks = [], projects = []) => ({ tasks, projects, log: [], packages: [], dashboards: [], links: [], notes: [] });
const pesan = (id, ruang, oleh, at, teks, o = {}) => ({ id, jenis: 'pesan', ruang, oleh, at, teks, target: '', kode: '', tanya: [], judul: '', ...o });

test.beforeEach(() => { n = 0; });

test('periksaPeristiwa: bentuk dibersihkan, yang tak masuk akal ditolak', () => {
  const sah = I.periksaPeristiwa({ jenis: 'pesan', ruang: 'task:PRD-12', oleh: 'kiki', teks: 'Halo\r\nsemua   ', tanya: ['alya', 'kiki', 'alya', 'siapa'], judul: '  QC web  ', id: 'x', at: 5 });
  assert.deepEqual(sah, { jenis: 'pesan', ruang: 'task:PRD-12', oleh: 'kiki', teks: 'Halo\nsemua', target: '', kode: '', tanya: ['alya'], judul: 'QC web' },
    'id & waktu dari browser dibuang (diberikan server); yang ditanya: profil sah selain pengirim');
  const tolak = (e, pola) => assert.throws(() => I.periksaPeristiwa(e), pola);
  tolak({ jenis: 'sapa', ruang: 'task:PRD-1', oleh: 'kiki', teks: 'x' }, /Jenis/);
  tolak({ jenis: 'pesan', ruang: 'task:abc', oleh: 'kiki', teks: 'x' }, /Ruang/);
  tolak({ jenis: 'pesan', ruang: 'tim:MG', oleh: 'kiki', teks: 'x' }, /Ruang/, 'ruang tim Manager tidak ada');
  tolak({ jenis: 'pesan', ruang: 'task:PRD-1', oleh: 'Arifah', teks: 'x' }, /Pengirim/);
  tolak({ jenis: 'pesan', ruang: 'task:PRD-1', oleh: 'kiki', teks: '   ' }, /kosong/);
  tolak({ jenis: 'pesan', ruang: 'task:PRD-1', oleh: 'kiki', teks: 'x'.repeat(I.BATAS_PESAN + 1) }, /terlalu panjang/);
  tolak({ jenis: 'ubah', ruang: 'task:PRD-1', oleh: 'kiki', teks: 'x' }, /dirujuk/);
  tolak({ jenis: 'reaksi', ruang: 'task:PRD-1', oleh: 'kiki', target: 'o1', kode: 'api' }, /Reaksi/);
  tolak({ jenis: 'hapus', ruang: 'task:PRD-1', oleh: 'kiki', target: 'o 1' }, /dirujuk/);
  assert.deepEqual(I.periksaPeristiwa({ jenis: 'reaksi', ruang: 'proyek:PRJ-3', oleh: 'uma', target: 'o1', kode: 'jempol', teks: 'abaikan' }),
    { jenis: 'reaksi', ruang: 'proyek:PRJ-3', oleh: 'uma', teks: '', target: 'o1', kode: 'jempol', tanya: [], judul: '' });
});

test('susunObrolan: komentar data contoh + peristiwa; hanya pengirim yang mengubah atau menghapus', () => {
  const t = task({ comments: [{ id: 'k1', author: 'alya', text: 'Cek batch 2', at: 100 }] });
  const d = data([t]);
  const r = 'task:' + t.id;
  const s = I.susunObrolan(d, [
    pesan('o2', r, 'kiki', 300, 'Siap'),
    pesan('o1', r, 'kiki', 200, 'Sebentar', { target: 'k1' }),
    { id: 'o3', jenis: 'ubah', ruang: r, oleh: 'kiki', at: 310, target: 'o2', teks: 'Siap, sudah' },
    { id: 'o4', jenis: 'ubah', ruang: r, oleh: 'alya', at: 320, target: 'o1', teks: 'dibajak' },
    { id: 'o5', jenis: 'hapus', ruang: r, oleh: 'kiki', at: 330, target: 'o1' },
    { id: 'o6', jenis: 'reaksi', ruang: r, oleh: 'alya', at: 340, target: 'o2', kode: 'jempol' },
    { id: 'o7', jenis: 'reaksi', ruang: r, oleh: 'uma', at: 341, target: 'o2', kode: 'jempol' },
    { id: 'o8', jenis: 'lepas', ruang: r, oleh: 'uma', at: 342, target: 'o2', kode: 'jempol' },
    { id: 'o9', jenis: 'reaksi', ruang: 'tim:LA', oleh: 'uma', at: 343, target: 'o2', kode: 'mata' },
    pesan('o2', r, 'kiki', 999, 'ganda diabaikan'),
  ]);
  const isi = s.perRuang.get(r);
  assert.deepEqual(isi.map(m => [m.id, m.oleh, m.teks, m.bersama]), [['k1', 'alya', 'Cek batch 2', false], ['o1', 'kiki', '', true], ['o2', 'kiki', 'Siap, sudah', true]]);
  assert.equal(s.perId.get('o1').dihapus, true);
  assert.equal(s.perId.get('o1').balas, 'k1');
  assert.equal(s.perId.get('o2').diubah, 310);
  assert.deepEqual(s.perId.get('o2').reaksi, { jempol: ['alya'] }, 'lepas mencabut reaksi; peristiwa ruang lain diabaikan');
});

test('sebutan & pertanyaan: @nama, @peran, dan kapan pertanyaan dianggap terjawab', () => {
  assert.deepEqual(I.sebutan('Halo @Kiki dan @alya, cc @Ali @staff email a@kiki.id'), { orang: ['kiki', 'alya', 'ali'], peran: ['staff'] });
  assert.ok(I.menyebut('tolong @semua', 'uma'));
  assert.ok(I.menyebut('@lead mohon cek', 'dhea'));
  assert.ok(!I.menyebut('@lead mohon cek', 'kiki'));
  assert.ok(!I.menyebut('kirim ke a@kiki.id', 'kiki'), 'alamat email bukan sebutan');
  assert.ok(!I.menyebut('@Alyaa', 'alya'), 'nama harus utuh');

  const t = task({});
  const r = 'task:' + t.id;
  const d = data([t]);
  const tanya = pesan('q1', r, 'alya', 100, '@Kiki kapan selesai?', { tanya: ['kiki'] });
  let s = I.susunObrolan(d, [tanya, pesan('x1', r, 'uma', 150, 'Bukan saya yang ditanya')]);
  assert.ok(I.tanyaTerbuka(s.perId.get('q1'), s.perRuang.get(r)), 'balasan orang lain tak menjawab');
  s = I.susunObrolan(d, [tanya, pesan('x2', r, 'kiki', 160, 'Besok')]);
  assert.ok(!I.tanyaTerbuka(s.perId.get('q1'), s.perRuang.get(r)), 'dijawab yang ditanya');
  s = I.susunObrolan(d, [tanya, { id: 'b1', jenis: 'beres', ruang: r, oleh: 'uma', at: 170, target: 'q1' }]);
  assert.ok(I.tanyaTerbuka(s.perId.get('q1'), s.perRuang.get(r)), 'yang tak ditanya tak bisa menandai beres');
  s = I.susunObrolan(d, [tanya, { id: 'b2', jenis: 'beres', ruang: r, oleh: 'alya', at: 170, target: 'q1' }]);
  assert.deepEqual(s.perId.get('q1').beres, { oleh: 'alya', at: 170 }, 'penanya boleh menandai beres');
  assert.ok(!I.tanyaTerbuka(s.perId.get('q1'), s.perRuang.get(r)));
});

test('ruang: tim hanya untuk anggotanya dan Manager; task dan proyek terbuka', () => {
  assert.deepEqual(I.ruangTimSaya('kiki'), ['LA']);
  assert.deepEqual(I.ruangTimSaya('alya'), ['LA']);
  assert.deepEqual(I.ruangTimSaya('ali'), ['SI']);
  assert.deepEqual(I.ruangTimSaya('nynda'), ['AK', 'LA', 'CO', 'SI']);
  assert.deepEqual(I.anggotaTim('AK'), ['andika', 'uma', 'tri', 'wildan']);
  assert.ok(!I.bolehRuang('uma', 'tim:LA'));
  assert.ok(I.bolehRuang('uma', 'task:PRD-9') && I.bolehRuang('uma', 'proyek:PRJ-2'));
  assert.ok(!I.bolehRuang('nynda', 'tim:MG') && !I.bolehRuang('nynda', 'catatan:x'));
});

test('daftarUtas: saringan Belum dibaca, Menyebut saya, Perlu jawaban; ruang tim & proyek ikut', () => {
  const a = task({ title: 'Input Kimia', pic: 'kiki' });
  const b = task({ title: 'QC Web', pic: 'kiki' });
  const lain = task({ title: 'Punya Uma', pic: 'uma', assignedBy: 'andika' });
  const d = data([a, b, lain], [{ id: 'PRJ-1', name: 'Produksi OJK', stage: 'V', cycle: 1 }]);
  const s = I.susunObrolan(d, [
    pesan('m1', 'task:' + a.id, 'alya', 500, 'Batch 2 siap'),
    pesan('m2', 'task:' + b.id, 'alya', 100, 'Sudah lama'),
    pesan('m3', 'tim:LA', 'alya', 600, '@staff rapat jam 2', { tanya: ['kiki'] }),
    pesan('m4', 'proyek:PRJ-1', 'nynda', 700, 'Target OJK naik'),
    pesan('m5', 'tim:AK', 'andika', 800, 'Khusus tim AK'),
    pesan('m6', 'task:' + lain.id, 'uma', 900, 'Bukan urusan Kiki'),
    pesan('m7', 'task:PRD-999', 'alya', 950, '@Kiki task ini dari browser lain', { judul: 'Task baru Alya' }),
  ]);
  const utas = (saring, o = {}) => I.daftarUtas(d, 'kiki', s, { saring, sejak: () => 200, ...o });
  assert.deepEqual(utas('semua').map(x => [x.ruang, x.judul, x.baru]), [
    ['task:PRD-999', 'Task baru Alya', 1], ['proyek:PRJ-1', 'Produksi OJK', 1], ['tim:LA', 'Tim Learning Architecture', 1],
    ['task:' + a.id, 'Input Kimia', 1], ['task:' + b.id, 'QC Web', 0],
  ], 'ruang tim AK dan task yang tak melibatkan Kiki tak muncul; task dari browser lain memakai judul pesannya');
  assert.deepEqual(utas('baru').map(x => x.ruang), ['task:PRD-999', 'proyek:PRJ-1', 'tim:LA', 'task:' + a.id]);
  assert.deepEqual(utas('sebut').map(x => [x.ruang, x.sebutBaru]), [['task:PRD-999', 1], ['tim:LA', 1]]);
  assert.deepEqual(utas('tanya').map(x => [x.ruang, x.tanya]), [['tim:LA', 1]]);
  assert.deepEqual(utas('semua', { q: 'rapat' }).map(x => x.ruang), ['tim:LA'], 'pencarian ikut isi pesan');
  assert.ok(I.daftarUtas(d, 'nynda', s, { lingkup: 'semua' }).some(x => x.ruang === 'tim:AK'), 'Manager melihat semua ruang tim');
});

test('notifikasi dari pesan: pertanyaan > sebutan > pesan di task yang melibatkan; ruang tim cukup lewat sebutan', () => {
  const a = task({ title: 'Input Kimia', pic: 'kiki' });
  const d = data([a]);
  const r = 'task:' + a.id;
  const s = I.susunObrolan(d, [
    pesan('m1', r, 'alya', 100, 'Batch 2 siap'),
    pesan('m2', r, 'alya', 200, '@Kiki tolong cek', { tanya: ['kiki'] }),
    pesan('m3', 'tim:LA', 'alya', 300, 'Info umum tim'),
    pesan('m4', 'tim:LA', 'bilar', 400, '@semua libur besok'),
    pesan('m5', r, 'kiki', 500, 'Pesan saya sendiri'),
    pesan('m6', r, 'alya', 600, 'Dihapus'),
    { id: 'h6', jenis: 'hapus', ruang: r, oleh: 'alya', at: 601, target: 'm6' },
  ]);
  const jenis = me => I.notifikasi(d, me, 60, s).map(x => `${x.jenis}:${x.pesan}`);
  assert.deepEqual(jenis('kiki'), ['sebut:m4', 'tanya:m2', 'komentar:m1']);
  assert.deepEqual(jenis('alya'), ['komentar:m5', 'sebut:m4'], 'Alya pemberi task: pesan Kiki masuk; info umum tim tidak');
  assert.equal(I.notifikasi(d, 'kiki', 60, s).find(x => x.pesan === 'm2').task, a.id);
});

test('aktivitasTask: tinjauan beserta catatannya dan jejak log task itu, tanpa komentar', () => {
  const t = task({ tinjauan: [{ id: 'r1', by: 'kiki', action: 'Diajukan', note: '', at: 300 }, { id: 'r2', by: 'alya', action: 'Dikembalikan', note: 'No. 7 pecah', at: 400 }] });
  const d = data([t]);
  d.log = [
    { id: 'l3', type: 'tinjau', task: `${t.id} · x`, detail: 'Diajukan untuk ditinjau', by: 'kiki', at: 300 },
    { id: 'l2', type: 'comment', task: `${t.id} · x`, detail: 'halo', by: 'alya', at: 250 },
    { id: 'l1', type: 'update', task: `${t.id} · x`, detail: 'Mulai dikerjakan', by: 'kiki', at: 200 },
    { id: 'l0', type: 'update', task: 'PRD-999 · y', detail: 'lain', by: 'kiki', at: 100 },
  ];
  assert.deepEqual(I.aktivitasTask(d, t).map(x => [x.at, x.oleh, x.aksi || x.teks]), [[200, 'kiki', 'Mulai dikerjakan'], [300, 'kiki', 'Diajukan'], [400, 'alya', 'Dikembalikan']]);
  assert.equal(I.aktivitasTask(d, t)[2].teks, 'No. 7 pecah');
});
