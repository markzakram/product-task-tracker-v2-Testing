/* Aturan halaman-halaman pendukung (0.4.0): Rancangan Paket, Link Saya, Catatan Saya,
   Dashboard Lain, Laporan berkala, Task List, Kalender, Komunikasi, Riwayat. */
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
const data = (tasks = [], projects = []) => ({ tasks, projects, log: [], packages: [], dashboards: [], links: [], notes: [] });

test.beforeEach(() => { n = 0; });

test('simpan paket: target dirapikan & diurutkan, tautan wajib http(s), mirror hanya Lead/Manager', () => {
  const d = data();
  const p = I.paketBaru(d, { namaPaket: 'KAI', produkPic: 'kiki' }, 'alya', WAKTU);
  I.simpanPaket(d, p, {
    namaPaket: ' KAI 2026 ', program: 'BUMN', platform: 'BUMN', produkPic: 'kiki', latsol: '3 paket  ',
    items: [
      { kategori: 'Tryout', nama: 'TO Akbar', target: '2', satuan: '', awal: '1,5' },
      { kategori: 'Ngawur', nama: 'Kelas', target: -3, awal: 'x' },
      { kategori: 'Latsol', nama: '', target: '', awal: '' },
    ],
    links: [{ label: '', url: 'docs.google.com/document/d/x' }, { label: '', url: '' }],
  }, 'kiki', WAKTU);
  assert.equal(p.namaPaket, 'KAI 2026');
  assert.equal(p.latsol, '3 paket', 'spasi di ujung dibuang, isinya dipertahankan');
  assert.deepEqual(p.items.map(i => [i.urutan, i.kategori, i.nama, i.target, i.satuan, i.awal]),
    [[1, 'Tryout', 'TO Akbar', 2, 'Paket', 1.5], [2, 'Dibimbing', 'Kelas', 0, 'Paket', 0]], 'baris kosong dibuang, angka negatif jadi 0');
  assert.deepEqual(p.links.map(l => [l.label, l.url]), [['Google Docs', 'https://docs.google.com/document/d/x']]);
  assert.equal(d.log[0].detail, 'Rancangan paket diubah');
  assert.throws(() => I.simpanPaket(d, p, { namaPaket: 'KAI', links: [{ label: 'x', url: 'javascript:alert(1)' }] }, 'kiki', WAKTU), /bukan alamat web/);
  assert.throws(() => I.simpanPaket(d, p, { namaPaket: '  ' }, 'kiki', WAKTU), /wajib diisi/);
  assert.throws(() => I.simpanPaket(d, p, { namaPaket: 'KAI', mirror: true }, 'kiki', WAKTU), /Hanya Lead atau Manager/);
  I.simpanPaket(d, p, { namaPaket: 'KAI', mirror: true }, 'alya', WAKTU);
  assert.equal(p.mirror, true);
  assert.throws(() => I.simpanPaket(d, p, { namaPaket: 'KAI' }, 'bilar', WAKTU), /tidak bisa menyunting/);
  assert.throws(() => I.hapusPaket(d, p, 'alya', WAKTU), /Hanya Manager/);
  I.hapusPaket(d, p, 'nynda', WAKTU);
  assert.equal(d.packages.length, 0);
});

test('tautan: tanpa skema diberi https, selain http(s) ditolak', () => {
  assert.equal(I.tautanRapi('docs.google.com/x'), 'https://docs.google.com/x');
  assert.equal(I.tautanRapi(' http://contoh.id/a '), 'http://contoh.id/a');
  for (const buruk of ['javascript:alert(1)', 'data:text/html,x', 'file:///c:/x', 'localhost:3000', 'bukan tautan', '']) {
    assert.equal(I.tautanRapi(buruk), '', buruk);
  }
});

test('Link Saya: milik sendiri, folder Umum di akhir, hapus folder memindah isinya ke Umum', () => {
  const d = data();
  I.simpanLink(d, 'ali', { url: 'contoh.id/bank', folder: 'Kerja' }, '', WAKTU);
  I.simpanLink(d, 'ali', { url: 'https://a.id', title: 'A', folder: 'umum' }, '', WAKTU + 1);
  I.simpanLink(d, 'ali', { url: 'https://b.id', title: 'B', folder: 'Arsip' }, '', WAKTU + 2);
  const milikKiki = I.simpanLink(d, 'kiki', { url: 'https://k.id', title: 'K' }, '', WAKTU + 3);
  const punyaAli = () => d.links.filter(l => l.user === 'ali');
  assert.deepEqual(I.kelompokFolder(punyaAli()).map(g => [g.folder, g.isi.length]), [['Arsip', 1], ['Kerja', 1], ['Umum', 1]]);
  assert.equal(d.links[0].title, 'contoh.id', 'tanpa judul → nama situsnya');
  assert.throws(() => I.simpanLink(d, 'ali', { url: 'ftp://x.id' }, '', WAKTU), /tidak valid/);
  assert.throws(() => I.simpanLink(d, 'ali', { url: 'https://x.id' }, milikKiki.id, WAKTU), /bukan milik Anda/);
  assert.throws(() => I.hapusMilik(d.links, milikKiki.id, 'ali'), /bukan milik Anda/);
  assert.equal(I.gantiNamaFolder(d.links, 'ali', 'Kerja', 'Kantor'), 1);
  assert.throws(() => I.gantiNamaFolder(d.links, 'ali', 'Umum', 'X'), /tidak bisa/);
  assert.throws(() => I.gantiNamaFolder(d.links, 'ali', 'Kantor', 'umum'), /hapus foldernya/);
  assert.equal(I.hapusFolder(d.links, 'ali', 'Kantor'), 1);
  assert.deepEqual(I.kelompokFolder(punyaAli()).map(g => g.folder), ['Arsip', 'Umum']);
  assert.equal(d.links.length, 4, 'menghapus folder tak menghapus link');
});

test('Catatan Saya: tak boleh kosong, suntingan memperbarui waktu, hanya pemilik yang menghapus', () => {
  const d = data();
  const c = I.simpanCatatan(d, 'ali', { title: '', body: 'isi\n\n' }, '', WAKTU);
  assert.deepEqual([c.title, c.body, c.folder, c.updatedAt], ['', 'isi', '', WAKTU]);
  assert.throws(() => I.simpanCatatan(d, 'ali', { title: ' ', body: ' ' }, '', WAKTU), /tidak boleh kosong/);
  I.simpanCatatan(d, 'ali', { title: 'Ide', body: 'isi', folder: 'Rapat' }, c.id, WAKTU + 9);
  assert.deepEqual([c.title, c.folder, c.updatedAt], ['Ide', 'Rapat', WAKTU + 9]);
  assert.throws(() => I.hapusMilik(d.notes, c.id, 'kiki'), /bukan milik Anda/);
  I.hapusMilik(d.notes, c.id, 'ali');
  assert.equal(d.notes.length, 0);
});

test('Dashboard Lain: hanya Manager yang mengelola, ikon dibatasi', () => {
  const d = data();
  assert.throws(() => I.simpanDashboard(d, 'alya', { title: 'X', url: 'https://x.id' }, '', WAKTU), /Hanya Manager/);
  const x = I.simpanDashboard(d, 'nynda', { title: 'Freelance', url: 'lookerstudio.google.com/r', icon: 'roket' }, '', WAKTU);
  assert.deepEqual([x.url, x.icon], ['https://lookerstudio.google.com/r', 'dashboard']);
  I.simpanDashboard(d, 'nynda', { title: 'Freelance 2', url: 'https://x.id', icon: 'timeline' }, x.id, WAKTU);
  assert.deepEqual([d.dashboards.length, x.title, x.icon], [1, 'Freelance 2', 'timeline']);
  assert.throws(() => I.simpanDashboard(d, 'nynda', { title: '', url: 'https://x.id' }, '', WAKTU), /Judul/);
  assert.throws(() => I.hapusDashboard(d, 'ali', x.id, WAKTU), /Hanya Manager/);
  I.hapusDashboard(d, 'nynda', x.id, WAKTU);
  assert.equal(d.dashboards.length, 0);
});

test('laporan berkala: selesai & baru dalam periode, terlambat keadaan hari ini, tepat waktu', () => {
  const pada = iso => Date.parse(iso + 'T05:00:00Z');
  const d = data([
    task({ pic: 'kiki', status: 'Selesai', due: '2026-10-06', selesaiAt: pada('2026-10-06'), createdAt: pada('2026-09-01') }),
    task({ pic: 'kiki', status: 'Selesai', due: '2026-10-01', selesaiAt: pada('2026-10-05'), createdAt: pada('2026-09-01') }),
    task({ pic: 'kiki', status: 'Selesai', selesaiAt: pada('2026-09-20'), createdAt: pada('2026-09-01') }),
    task({ pic: 'kiki', status: 'Dikerjakan', due: '2026-10-02', createdAt: pada('2026-10-06') }),
    task({ pic: 'bilar', status: 'Antre', tertahan: true, alasanTertahan: 'x', due: '2026-10-01', createdAt: pada('2026-09-01') }),
  ], [{ id: 'PRJ-1', name: 'P', history: [{ dari: 'A', ke: 'D', oleh: 'nynda', at: pada('2026-10-06') }, { dari: 'D', ke: 'V', oleh: 'nynda', at: pada('2026-09-01') }] }]);
  assert.deepEqual(I.rentang('minggu', HARI), { dari: '2026-10-05', sampai: HARI });
  assert.deepEqual(I.rentang('lalu', HARI), { dari: '2026-09-28', sampai: '2026-10-04' });
  assert.deepEqual(I.rentang('bulan', HARI), { dari: '2026-10-01', sampai: HARI });
  assert.deepEqual(I.rentang('30', HARI), { dari: '2026-09-08', sampai: HARI });
  const { dari, sampai } = I.rentang('minggu', HARI);
  const r = I.laporanPeriode(d, ['kiki', 'bilar'], dari, sampai, HARI);
  const kiki = r.baris[0];
  assert.deepEqual([kiki.aktif, kiki.selesai.length, kiki.tepat, kiki.baru, kiki.telat.length], [1, 2, 1, 1, 1]);
  assert.deepEqual([r.baris[1].telat.length, r.baris[1].tertahan.length], [0, 1], 'yang ditandai tertahan tak dihitung terlambat');
  assert.deepEqual(r.total, { aktif: 2, selesai: 2, tepat: 1, baru: 1, telat: 1, tertahan: 1 });
  assert.deepEqual(r.proyek.map(x => x.ke), ['D'], 'hanya perpindahan tahap dalam periode');
});

test('Task List: saring status/kata, urut per kolom dua arah', () => {
  const d = data([
    task({ title: 'Banding', due: '2026-10-09', status: 'Dikerjakan' }),
    task({ title: 'Agenda', due: '2026-10-08', status: 'Selesai', selesaiAt: WAKTU }),
    task({ title: 'Cetak', due: '', status: 'Antre', pic: 'bilar' }),
  ]);
  const judul = f => I.daftarTask(d, f, HARI).map(t => t.title);
  assert.deepEqual(judul({}), ['Agenda', 'Banding', 'Cetak'], 'tanpa tenggat di akhir');
  assert.deepEqual(judul({ urut: 'due', arah: -1 }), ['Cetak', 'Banding', 'Agenda']);
  assert.deepEqual(judul({ status: 'aktif' }), ['Banding', 'Cetak']);
  assert.deepEqual(judul({ status: 'Selesai' }), ['Agenda']);
  assert.deepEqual(judul({ q: 'bilar' }), ['Cetak'], 'nama PIC ikut dicari');
  assert.deepEqual(judul({ urut: 'title' }), ['Agenda', 'Banding', 'Cetak']);
  assert.deepEqual(judul({ urut: 'status' }), ['Cetak', 'Banding', 'Agenda']);
  assert.deepEqual(judul({ orang: ['bilar'] }), ['Cetak']);
});

test('kalender & jadwal: kotak bulan mulai Senin, rentang task aman', () => {
  const okt = I.gridBulan('2026-10');
  assert.deepEqual([okt[0], okt[okt.length - 1], okt.length], ['2026-09-28', '2026-11-01', 35]);
  assert.equal(I.gridBulan('2026-08').length, 42, 'Agustus 2026 butuh 6 minggu');
  assert.equal(I.geserBulan('2026-01', -1), '2025-12');
  assert.equal(I.geserBulan('2026-12', 1), '2027-01');
  assert.deepEqual(I.rentangTask({ start: '2026-10-01', due: '2026-10-05' }), { mulai: '2026-10-01', akhir: '2026-10-05' });
  assert.deepEqual(I.rentangTask({ start: '2026-10-09', due: '2026-10-05' }), { mulai: '2026-10-05', akhir: '2026-10-09' });
  assert.deepEqual(I.rentangTask({ start: '', due: '2026-10-05', createdAt: 0 }), { mulai: '2026-10-05', akhir: '2026-10-05' });
});

test('komunikasi: utas yang belum dibaca di atas; komentar sendiri tak dihitung', () => {
  const k = (author, at) => ({ id: 'k' + at, author, text: 'x', at });
  const d = data([
    task({ title: 'Lama', pic: 'kiki', comments: [k('alya', 100)] }),
    task({ title: 'Baru dibalas', pic: 'kiki', comments: [k('kiki', 50), k('alya', 300)] }),
    task({ title: 'Saya saja', pic: 'kiki', comments: [k('kiki', 400)] }),
    task({ title: 'Tanpa komentar', pic: 'kiki' }),
    task({ title: 'Orang lain', pic: 'bagas', assignedBy: 'dhea', comments: [k('dhea', 500)] }),
  ]);
  const sejak = () => 200;
  const u = I.utasDiskusi(d, 'kiki', 'terlibat', sejak, '');
  assert.deepEqual(u.map(x => [x.t.title, x.baru]), [['Baru dibalas', 1], ['Saya saja', 0], ['Lama', 0]]);
  assert.deepEqual(I.utasDiskusi(d, 'kiki', 'semua', sejak, '').map(x => x.t.title), ['Orang lain', 'Baru dibalas', 'Saya saja', 'Lama'],
    'lingkup semua: utas orang lain ikut, juga dihitung belum dibaca');
  assert.ok(!u.some(x => x.t.title === 'Orang lain'), 'tak terlibat → tak muncul di "terlibat"');
  assert.deepEqual(I.utasDiskusi(d, 'kiki', 'terlibat', sejak, 'tanpa').map(x => x.t.title), ['Tanpa komentar'], 'pencarian juga menemukan task tanpa komentar');
});

test('riwayat aktivitas: saring jenis, orang, kata', () => {
  const log = [
    { id: 'l1', type: 'create', task: 'PRD-1 · Riset', detail: 'Dibuat', by: 'alya', at: 1 },
    { id: 'l2', type: 'tinjau', task: 'PRD-2 · QC', detail: 'Disetujui', by: 'nynda', at: 2 },
  ];
  assert.deepEqual(I.saringLog(log, { jenis: 'tinjau' }).map(l => l.id), ['l2']);
  assert.deepEqual(I.saringLog(log, { orang: 'alya' }).map(l => l.id), ['l1']);
  assert.deepEqual(I.saringLog(log, { q: 'nynda' }).map(l => l.id), ['l2'], 'nama orang ikut dicari');
});

test('dashboard per lingkup: hanya task orang dalam lingkup yang dihitung', () => {
  const d = data([task({ pic: 'kiki', status: 'Dikerjakan' }), task({ pic: 'uma', status: 'Antre' }), task({ pic: 'kiki', status: 'Ditinjau' })]);
  const r = I.laporan(d, HARI, ['alya', 'kiki', 'bilar']);
  assert.equal(r.kpi.aktif, 2);
  assert.deepEqual(r.perStatus.map(x => x.jumlah), [0, 1, 1]);
  assert.deepEqual(r.perOrang.map(x => x.id), ['alya', 'kiki', 'bilar']);
  assert.equal(I.laporan(d, HARI).kpi.aktif, 3);
});
