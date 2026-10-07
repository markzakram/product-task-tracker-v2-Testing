const test = require('node:test');
const assert = require('node:assert/strict');
const { ubah, platformV2, tahap, kategori, idOrang, waktu, leadDari, LCI_SUB } = require('../scripts/_v1ke2');

/* Tarikan v1 buatan, berbentuk persis db/dump/*.json — isinya karangan. */
function dumpV1() {
  const task = (o) => ({
    task_id: 'TSK-001', created_date: '2026-07-01', due_date: '2026-07-05', status: 'Done', kesulitan: 'Normal',
    task_name: 'Tugas', stage: 'QC', platform: 'JadiASN', pic: 'Kiki', support: '', document: '', pic_notes: '',
    pm_notes: '', divisi_tujuan: '', kontak_divisi: '', kata_kerja: '', jumlah: '', objek: '', detail: '',
    dibuat_oleh: 'Nynda (PM)', lintas_view: '', status_by: '', __baris: 2, ...o,
  });
  const langkah = (collab, urutan, o) => ({ collab_id: collab, urutan, step: 'Langkah', pic: 'Kiki', deadline: '', done: 0, done_by: '', done_at: '', note: '', stage: 'QC', link: '', __baris: 100 + urutan, ...o });
  return {
    tasks: [
      task({ task_id: 'TSK-099', task_name: 'Melakukan Riset SKD CPNS', stage: 'RnD', platform: '', pic: 'Andika', support: 'Uma, Andika', kesulitan: 'High',
        jumlah: '1', objek: 'laporan riset', document: 'https://docs.google.com/document/d/abc', pm_notes: 'Fokus ke TIU', status_by: 'Nynda (PM) • 2026-08-31 15:01:49' }),
      task({ task_id: 'TSK-100', task_name: 'Melakukan 40 QC Ops Tryout', stage: 'QC', status: 'In progress', platform: 'JadiASN, JadiSekdin', __baris: 3 }),
      task({ task_id: 'TSK-101', task_name: 'Memonitor 5 liveclass jadiasn', stage: 'Operasional', status: 'Todo', pic: 'Bilar', platform: 'All Platform, Markaz', __baris: 4 }),
      task({ task_id: 'TSK-102', task_name: 'Membuat 12 Soal Liveclass TIU', stage: 'Develop Konten (materi/soal)', status: 'Review PM', pic: 'Arifah',
        platform: 'JadiASN, Markaz', status_by: 'Arifah • 2026-09-01 10:00:00', __baris: 5 }),
      task({ task_id: 'TSK-103', task_name: 'Membuat 1 PPT Data Report Center', stage: 'Develop Konten (materi/soal)', status: 'Hold', pic: 'Dhea', pic_notes: 'Data FR belum masuk', __baris: 6 }),
      task({ task_id: 'TSK-104', task_name: 'Menyusun 1 Kurikulum SIPSS', stage: 'RnD', status: 'Done', platform: '', pic: 'Andika', due_date: '2026-07-20', __baris: 7 }),
      task({ task_id: 'TSK-105', task_name: 'Rekap fee guru', stage: '', status: 'Done', due_date: '', created_date: '2026-07-02', __baris: 8 }),
    ],
    collabs: [
      { collab_id: 'COL-021', platform: '', title: 'BUMN_PT.KAI_Rancangan', description: 'Paket KAI', created_by: 'Nynda (PM)', created_at: '2026-07-20 11:36:00', __baris: 2 },
      { collab_id: 'COL-030', platform: 'JadiASN', title: 'Jadwal Liveclass Oktober', description: '', created_by: 'Nynda (PM)', created_at: '2026-09-20 09:00:00', __baris: 3 },
    ],
    collab_steps: [
      langkah('COL-021', 3, { step: 'Input soal', pic: 'Kiki', deadline: '2026-08-03', stage: 'Operasional' }),
      langkah('COL-021', 1, { step: 'Riset kisi-kisi KAI', pic: 'Andika', deadline: '2026-07-25', done: 1, done_by: 'Andika', done_at: '2026-07-22 13:37:00', stage: 'RnD', link: 'https://docs.google.com/spreadsheets/d/xyz' }),
      langkah('COL-021', 2, { step: 'Develop 200 soal', pic: 'Uma', deadline: '2026-07-30', note: 'tunggu kisi-kisi', stage: 'Develop Konten (materi/soal)' }),
      langkah('COL-021', 4, { step: 'Riset ulang kompetitor', pic: 'Andika', stage: 'RnD' }),
      langkah('COL-030', 1, { step: 'Susun jadwal', pic: 'Bilar', done: 1, done_by: 'Bilar', done_at: '2026-09-25 10:00:00', stage: 'Operasional' }),
    ],
    checklists: [
      { task_id: 'TSK-100', item: 'QC paket 1', done: 1, created_by: 'Alya', checked_by: 'Kiki', checked_at: '2026-07-20 09:52:00', link: '', __baris: 2 },
      { task_id: 'COL-021#2', item: 'TIU 100 soal', done: 0, created_by: 'Nynda (PM)', checked_by: '', checked_at: '', link: '', __baris: 3 },
      { task_id: 'TSK-999', item: 'yatim', done: 0, created_by: '', checked_by: '', checked_at: '', link: '', __baris: 4 },
    ],
    comments: [
      { dibuat_at: '2026-07-21 10:00:00', task_id: 'COL-021', author: 'Nynda (PM)', message: 'Kick-off', __baris: 2 },
      { dibuat_at: '2026-07-02 09:00:00', task_id: 'TSK-099', author: 'Ali', message: 'Data scraping siap', __baris: 3 },
      { dibuat_at: '2026-07-02 09:00:00', task_id: 'COL-999', author: 'Ali', message: 'yatim', __baris: 4 },
    ],
    packages: [{
      paket_id: 'PKG-002', platform: '', marsel_pic: 'Alya', program: 'Rekrutmen BUMN', nama_paket: 'PT.KAI_BUMN', tagline: 'Lolos KAI', benefit: '', tanggal: '2026-09-01',
      tujuan: 'Naikkan konversi', produk_pic: 'Andika', dibimbing: '', latsol: '3 September', materi: '', tryout: '', drilling: '', live_class: '',
      catatan: 'DL 23 Sept', updated_by: 'Nynda (PM)', updated_at: '2026-10-02 11:35:00', mirror: 1, __baris: 2,
    }],
    package_items: [
      { item_id: 'ITM-2', paket_id: 'PKG-002', urutan: 2, kategori: 'Dibimbing', grup: '', nama: 'Kelas TPA', target: 4, satuan: 'Sesi', awal: 1, catatan: '', __baris: 3 },
      { item_id: 'ITM-1', paket_id: 'PKG-002', urutan: 1, kategori: 'Tryout', grup: 'Psikologi', nama: 'TO Akbar', target: '2', satuan: '', awal: '', catatan: 'pakai bank lama', __baris: 2 },
    ],
    package_links: [
      { paket_id: 'PKG-002', urutan: 1, label: 'Brief', url: 'https://docs.google.com/document/d/brief', __baris: 2 },
      { paket_id: 'PKG-002', urutan: 2, label: 'Rusak', url: 'bukan tautan', __baris: 3 },
    ],
    dashboards: [
      { title: 'Proyek Freelance', deskripsi: 'Rekap freelance', icon: 'timeline', url: 'https://contoh.id/freelance', __baris: 2 },
      { title: 'Bukan tautan', deskripsi: '', icon: '', url: 'tidak ada', __baris: 3 },
      { title: 'Admin', deskripsi: 'Pass : RAHASIA-DASHBOARD-123 lalu login', icon: 'assignment', url: 'https://contoh.id/admin', __baris: 4 },
    ],
    user_links: [
      { user_nama: 'Ali', title: 'Bank soal', url: 'https://docs.google.com/spreadsheets/d/bank', folder: 'Kerja', __baris: 2 },
      { user_nama: 'Nynda (PM)', title: '', url: 'https://drive.google.com/drive/x', folder: '', __baris: 3 },
      { user_nama: 'Arifah', title: 'Di luar organogram', url: 'https://contoh.id/a', folder: '', __baris: 4 },
      { user_nama: 'Ali', title: 'Rusak', url: 'bukan tautan', folder: '', __baris: 5 },
    ],
    activity_log: [
      { terjadi_at: '2026-08-27 10:39:00', user_nama: 'Kiki', action: 'Checklist Add', task_id: 'TSK-100', detail: 'QC paket 1', status_lama: '', status_baru: '', __baris: 3 },
      { terjadi_at: '2026-08-26 09:00:00', user_nama: 'Nynda (PM)', action: 'Update Task', task_id: 'TSK-104', detail: 'Kurikulum', status_lama: 'In progress', status_baru: 'Done', __baris: 2 },
      { terjadi_at: '2026-08-28 08:00:00', user_nama: 'Dev', action: 'User Rename', task_id: '', detail: 'Hargianti → Tri', status_lama: '', status_baru: '', __baris: 4 },
      { terjadi_at: '2026-08-25 08:00:00', user_nama: 'Alya', action: 'Delete Task', task_id: 'TSK-455', detail: 'Riset Tes Pauli', status_lama: '', status_baru: '', __baris: 5 },
    ],
    // Ikut di dump v1 tapi TIDAK boleh terbawa:
    auth_pins: [{ user_nama: 'Nynda (PM)', pin_hash: 'HASH-RAHASIA-JANGAN-BOCOR' }],
    user_notes: [{ user_nama: 'Ali', title: 'Pribadi', body: 'CATATAN-PRIBADI-JANGAN-BOCOR' }],
    notifications: [{ id: 'N1', for_user: 'Ali', teks: 'NOTIF-PRIBADI-JANGAN-BOCOR' }],
  };
}

const cari = (data, id) => data.tasks.find(t => t.id === id);

test('task lepas v1 → Jalur Rutin: nomor tetap, stage v1 jadi kategori, tanpa tahap ADDIE', () => {
  const { data } = ubah(dumpV1());
  const t = cari(data, 'PRD-099');
  assert.deepEqual([t.lane, t.kategori, t.stage, t.project], ['rutin', 'RnD', '', '']);
  assert.equal(kategori('Develop Konten (materi/soal)'), 'Develop Konten');
  assert.equal(kategori(''), 'Umum');
  assert.equal(cari(data, 'PRD-105').kategori, 'Umum');
});

test('orang: "Nynda (PM)" → nynda, nama di luar organogram dibiarkan, PIC tak ikut jadi support', () => {
  assert.equal(idOrang('Nynda (PM)'), 'nynda');
  assert.equal(idOrang('Arifah'), 'Arifah');
  assert.equal(idOrang(''), '');
  const t = cari(ubah(dumpV1()).data, 'PRD-099');
  assert.equal(t.pic, 'andika');
  assert.deepEqual(t.support, ['uma']);
  assert.equal(t.assignedBy, 'nynda');
});

test('platform: tunggal, campuran, sistem, dan tebakan dari judul', () => {
  assert.equal(platformV2('JadiASN', '').nilai, 'ASN');
  assert.deepEqual(platformV2('JadiASN, JadiSekdin', ''), { nilai: 'All Platform', catatan: 'Platform di v1: JadiASN, JadiSekdin' });
  assert.equal(platformV2('All Platform, Markaz', '').nilai, 'All Platform');
  assert.equal(platformV2('JadiASN, Markaz', '').nilai, 'ASN');
  assert.equal(platformV2('', 'Melakukan Riset SKD CPNS').nilai, 'ASN');
  assert.equal(platformV2('', 'PT.KAI_BUMN').nilai, 'BUMN');
  assert.equal(platformV2('', 'Membangun ProductTrack V2').nilai, 'All Platform');
  assert.match(cari(ubah(dumpV1()).data, 'PRD-100').detail, /Platform di v1: JadiASN, JadiSekdin/);
});

test('status v1 → empat status v2; Hold jadi tanda tertahan dengan alasannya', () => {
  const { data } = ubah(dumpV1());
  const st = id => [cari(data, id).status, cari(data, id).tertahan];
  assert.deepEqual(st('PRD-099'), ['Selesai', false]);
  assert.deepEqual(st('PRD-100'), ['Dikerjakan', false]);
  assert.deepEqual(st('PRD-101'), ['Antre', false]);
  assert.deepEqual(st('PRD-102'), ['Ditinjau', false]);
  assert.deepEqual(st('PRD-103'), ['Antre', true]);
  assert.equal(cari(data, 'PRD-103').alasanTertahan, 'Ditahan (Hold) di v1');
  assert.match(cari(data, 'PRD-103').notes, /Data FR belum masuk/, 'catatan PIC tetap ada di notes');
});

test('riwayat tinjauan diambil dari status_by v1, termasuk jam WIB-nya', () => {
  const { data } = ubah(dumpV1());
  assert.deepEqual(cari(data, 'PRD-099').tinjauan, [{ id: 'r-PRD-099', by: 'nynda', action: 'Disetujui', note: 'Ditandai selesai di v1', at: Date.UTC(2026, 7, 31, 8, 1, 49) }]);
  assert.deepEqual(cari(data, 'PRD-102').tinjauan.map(r => [r.action, r.by]), [['Diajukan', 'Arifah']]);
  assert.deepEqual(cari(data, 'PRD-104').tinjauan, [], 'tanpa status_by, tak ada riwayat yang dikarang');
});

test('waktu selesai: status_by, lalu riwayat aktivitas, lalu tenggat, lalu tanggal dibuat', () => {
  const { data } = ubah(dumpV1());
  assert.equal(cari(data, 'PRD-099').selesaiAt, Date.UTC(2026, 7, 31, 8, 1, 49));
  assert.equal(cari(data, 'PRD-104').selesaiAt, Date.UTC(2026, 7, 26, 2, 0, 0), 'dari Update Task → Done');
  assert.equal(cari(data, 'PRD-105').selesaiAt, Date.UTC(2026, 6, 2, 1, 0, 0), 'tanpa tenggat → tanggal dibuat');
  assert.equal(cari(data, 'PRD-100').selesaiAt, 0);
});

test('isi task: output, evidence, catatan PM, prioritas', () => {
  const t = cari(ubah(dumpV1()).data, 'PRD-099');
  assert.equal(t.output, '1 laporan riset');
  assert.equal(t.priority, 'High');
  assert.deepEqual(t.evidence, [{ id: 'e-PRD-099', label: 'Google Docs', url: 'https://docs.google.com/document/d/abc' }]);
  assert.equal(t.notes, 'Catatan PM: Fokus ke TIU');
});

test('tahap ADDIE untuk task proyek: tabel stage v1, plus pengecualian dari judul', () => {
  assert.deepEqual(tahap('QC', 'Melakukan 40 QC Ops Tryout'), ['V', LCI_SUB]);
  assert.deepEqual(tahap('Operasional', 'Memonitor 5 liveclass jadiasn'), ['I', 'Liveclass']);
  assert.deepEqual(tahap('Develop Konten (materi/soal)', 'Membuat 12 Soal Liveclass TIU'), ['V', '3.1 Academic Content Development'],
    'soal untuk liveclass adalah pengembangan konten, bukan pelaksanaan liveclass');
  assert.deepEqual(tahap('Develop Konten (materi/soal)', 'Membuat 1 PPT Data Report Center'), ['E', 'Report Center']);
  assert.deepEqual(tahap('RnD', 'Menyusun 1 Kurikulum SIPSS'), ['D', 'Academic blueprint']);
  assert.deepEqual(tahap('', 'To Do List'), ['V', '']);
});

test('kolaborasi → proyek ADDIE: proses berantai, Lead dari tim terbanyak, tahap = proses berjalan', () => {
  const { data, ringkasan } = ubah(dumpV1());
  const p = data.projects.find(x => x.id === 'PRJ-21');
  assert.deepEqual([p.platform, p.stage, p.lead, p.arsip, p.goal], ['BUMN', 'V', 'andika', false, 'Paket KAI']);
  const langkah = data.tasks.filter(t => t.project === 'PRJ-21');
  assert.deepEqual(langkah.map(t => t.id), ['PRD-106', 'PRD-107', 'PRD-108', 'PRD-109'], 'nomor sesudah task v1 terbesar, urut menurut urutan');
  assert.deepEqual(langkah.map(t => t.lane), ['proyek', 'proyek', 'proyek', 'proyek']);
  assert.deepEqual(langkah.map(t => t.deps), [[], ['PRD-106'], ['PRD-107'], ['PRD-108']]);
  assert.deepEqual(langkah.map(t => t.status), ['Selesai', 'Dikerjakan', 'Antre', 'Antre']);
  assert.deepEqual(langkah.map(t => t.stage), ['A', 'V', 'V', 'V'],
    'proses yang belum selesai tak boleh tertinggal di tahap sebelum tahap proyek');
  assert.equal(langkah[0].evidence[0].label, 'Google Sheets');
  assert.equal(langkah[0].tinjauan[0].by, 'andika');
  assert.equal(langkah[1].notes, 'tunggu kisi-kisi');
  assert.equal(ringkasan.proyekArsip, 1);
});

test('kolaborasi yang semua prosesnya tuntas → proyek arsip', () => {
  const p = ubah(dumpV1()).data.projects.find(x => x.id === 'PRJ-30');
  assert.deepEqual([p.arsip, p.lead, p.platform], [true, 'alya', 'ASN']);
  assert.equal(leadDari([]), 'nynda');
});

test('ceklis dan komentar ikut ke induknya; yang yatim dihitung, bukan dikarang', () => {
  const { data, ringkasan } = ubah(dumpV1());
  assert.deepEqual(cari(data, 'PRD-100').subtasks, [{ id: 's2', title: 'QC paket 1', pic: 'kiki', due: '', done: true }]);
  assert.deepEqual(cari(data, 'PRD-107').subtasks.map(s => [s.title, s.pic, s.done]), [['TIU 100 soal', 'uma', false]],
    'ceklis COL-021#2 milik proses 2; yang belum dicentang dipegang PIC prosesnya');
  assert.deepEqual(cari(data, 'PRD-106').comments.map(c => c.text), ['Kick-off'], 'diskusi kolaborasi ditampung di proses pertama');
  assert.deepEqual(cari(data, 'PRD-099').comments.map(c => c.author), ['ali']);
  assert.deepEqual(ringkasan.dibuang, { ceklisYatim: 1, komentarYatim: 1, logTerpotong: 0, linkTanpaProfil: 1 });
});

test('rancangan paket dibawa utuh: identitas, produk, area marketing, target urut, tautan sah', () => {
  const { data, ringkasan } = ubah(dumpV1());
  const { items, links, ...p } = data.packages[0];
  assert.deepEqual(p, {
    id: 'PKG-002', platform: 'BUMN', program: 'Rekrutmen BUMN', namaPaket: 'PT.KAI_BUMN', produkPic: 'andika',
    dibimbing: '', latsol: '3 September', materi: '', tryout: '', drilling: '', liveClass: '', catatan: 'DL 23 Sept', mirror: true,
    marselPic: 'alya', tagline: 'Lolos KAI', benefit: '', tanggal: '2026-09-01', tujuan: 'Naikkan konversi',
    updatedBy: 'nynda', updatedAt: Date.UTC(2026, 9, 2, 4, 35, 0),
  });
  assert.deepEqual(items, [
    { id: 'ITM-1', urutan: 1, kategori: 'Tryout', grup: 'Psikologi', nama: 'TO Akbar', target: 2, satuan: 'Paket', awal: 0, catatan: 'pakai bank lama' },
    { id: 'ITM-2', urutan: 2, kategori: 'Dibimbing', grup: '', nama: 'Kelas TPA', target: 4, satuan: 'Sesi', awal: 1, catatan: '' },
  ], 'urut menurut urutan; angka teks jadi angka; satuan kosong → Paket');
  assert.deepEqual(links, [{ id: 'pl2', urutan: 1, label: 'Brief', url: 'https://docs.google.com/document/d/brief' }]);
  assert.equal(ringkasan.targetPaket, 2);
});

test('Dashboard Lain dan Link Saya: hanya tautan sah, Link Saya hanya untuk profil v2', () => {
  const { data, ringkasan } = ubah(dumpV1());
  assert.deepEqual(data.dashboards.map(d => [d.id, d.title, d.icon]), [['d2', 'Proyek Freelance', 'timeline'], ['d4', 'Admin', 'assignment']]);
  assert.equal(data.dashboards[0].deskripsi, 'Rekap freelance');
  assert.equal(data.dashboards[1].deskripsi, 'Pass : •••• (disembunyikan saat impor) lalu login', 'kata sandi di deskripsi v1 tak ikut ke v2');
  assert.ok(!JSON.stringify(data).includes('RAHASIA-DASHBOARD-123'));
  assert.deepEqual(data.links, [
    { id: 'u2', user: 'ali', folder: 'Kerja', title: 'Bank soal', url: 'https://docs.google.com/spreadsheets/d/bank' },
    { id: 'u3', user: 'nynda', folder: '', title: 'Google Drive', url: 'https://drive.google.com/drive/x' },
  ]);
  assert.deepEqual([ringkasan.dashboard, ringkasan.link, ringkasan.dibuang.linkTanpaProfil], [2, 2, 1]);
  assert.deepEqual(data.notes, [], 'Catatan Saya mulai kosong');
});

test('riwayat: terbaru dulu, jenis & label dipetakan, task yang dihapus tetap terbaca', () => {
  const { data } = ubah(dumpV1());
  assert.deepEqual(data.log.map(l => [l.type, l.task, l.by]), [
    ['system', 'Pengguna', 'Dev'],
    ['update', 'PRD-100 · Melakukan 40 QC Ops Tryout', 'kiki'],
    ['update', 'PRD-104 · Menyusun 1 Kurikulum SIPSS', 'nynda'],
    ['delete', 'PRD-455 (sudah dihapus di v1)', 'alya'],
  ]);
  assert.equal(data.log[1].detail, 'Sub-task ditambah: QC paket 1');
  assert.equal(data.log[2].detail, 'Kurikulum · Status: In progress → Done');
});

test('riwayat dipotong di 1000 terbaru', () => {
  const d = dumpV1();
  d.activity_log = Array.from({ length: 1005 }, (_, i) => ({ terjadi_at: `2026-08-01 ${String(Math.floor(i / 60) % 24).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00`, user_nama: 'Ali', action: 'Update Task', task_id: 'TSK-099', detail: '', status_lama: '', status_baru: '', __baris: i + 2 }));
  const { data, ringkasan } = ubah(d);
  assert.equal(data.log.length, 1000);
  assert.equal(ringkasan.dibuang.logTerpotong, 5);
});

test('PIN, catatan pribadi, dan notifikasi v1 tidak terbawa sama sekali', () => {
  const { data } = ubah(dumpV1());
  assert.deepEqual(Object.keys(data), ['projects', 'tasks', 'packages', 'dashboards', 'links', 'notes', 'log']);
  const semua = JSON.stringify(data);
  for (const rahasia of ['HASH-RAHASIA-JANGAN-BOCOR', 'CATATAN-PRIBADI-JANGAN-BOCOR', 'NOTIF-PRIBADI-JANGAN-BOCOR']) {
    assert.ok(!semua.includes(rahasia), rahasia);
  }
});

test('waktu v1 dibaca sebagai WIB', () => {
  assert.equal(waktu('2026-08-31 15:01:49'), Date.UTC(2026, 7, 31, 8, 1, 49));
  assert.equal(waktu('2026-07-01'), Date.UTC(2026, 6, 1, 1, 0, 0), 'tanggal saja → pukul 08.00 WIB');
  assert.equal(waktu(''), 0);
  assert.equal(waktu('selesai'), 0);
});
