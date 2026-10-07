const test = require('node:test');
const assert = require('node:assert/strict');
const { ubah, platformV2, tahap, statusV2, idOrang, waktu, LCI_SUB } = require('../scripts/_v1ke2');

/* Tarikan v1 buatan, berbentuk persis db/dump/*.json — isinya karangan. */
function dumpV1() {
  const task = (o) => ({
    task_id: 'TSK-001', created_date: '2026-07-01', due_date: '2026-07-05', status: 'Done', kesulitan: 'Normal',
    task_name: 'Tugas', stage: 'QC', platform: 'JadiASN', pic: 'Kiki', support: '', document: '', pic_notes: '',
    pm_notes: '', divisi_tujuan: '', kontak_divisi: '', kata_kerja: '', jumlah: '', objek: '', detail: '',
    dibuat_oleh: 'Nynda (PM)', lintas_view: '', status_by: '', __baris: 2, ...o,
  });
  return {
    tasks: [
      task({ task_id: 'TSK-099', task_name: 'Melakukan Riset SKD CPNS', stage: 'RnD', platform: '', pic: 'Andika', support: 'Uma, Andika', kesulitan: 'High',
        jumlah: '1', objek: 'laporan riset', document: 'https://docs.google.com/document/d/abc', pm_notes: 'Fokus ke TIU', status_by: 'Nynda (PM) • 2026-08-31 15:01:49' }),
      task({ task_id: 'TSK-100', task_name: 'Melakukan 40 QC Ops Tryout', stage: 'QC', status: 'In progress', platform: 'JadiASN, JadiSekdin', __baris: 3 }),
      task({ task_id: 'TSK-101', task_name: 'Memonitor 5 liveclass jadiasn', stage: 'Operasional', status: 'Todo', pic: 'Bilar', platform: 'All Platform, Markaz', __baris: 4 }),
      task({ task_id: 'TSK-102', task_name: 'Membuat 12 Soal Liveclass TIU', stage: 'Develop Konten (materi/soal)', status: 'Review PM', pic: 'Arifah',
        platform: 'JadiASN, Markaz', status_by: 'Arifah • 2026-09-01 10:00:00', __baris: 5 }),
      task({ task_id: 'TSK-103', task_name: 'Membuat 1 PPT Data Report Center', stage: 'Develop Konten (materi/soal)', status: 'Hold', pic: 'Dhea', __baris: 6 }),
      task({ task_id: 'TSK-104', task_name: 'Menyusun 1 Kurikulum SIPSS', stage: 'RnD', status: 'Done', platform: '', pic: 'Andika', __baris: 7 }),
    ],
    collabs: [{ collab_id: 'COL-021', platform: '', title: 'BUMN_PT.KAI_Rancangan', description: 'Paket KAI', created_by: 'Nynda (PM)', created_at: '2026-07-20 11:36:00', deadline: '', tipe: '', paket_id: '', __baris: 2 }],
    collab_steps: [
      { collab_id: 'COL-021', urutan: 3, step: 'Input soal', pic: 'Kiki', deadline: '2026-08-03', done: 0, done_by: '', done_at: '', note: '', stage: 'Operasional', link: '', __baris: 4 },
      { collab_id: 'COL-021', urutan: 1, step: 'Riset kisi-kisi KAI', pic: 'Andika', deadline: '2026-07-25', done: 1, done_by: 'Andika', done_at: '2026-07-22 13:37:00', note: '', stage: 'RnD', link: 'https://docs.google.com/spreadsheets/d/xyz', __baris: 2 },
      { collab_id: 'COL-021', urutan: 2, step: 'Develop 200 soal', pic: 'Uma', deadline: '2026-07-30', done: 0, done_by: '', done_at: '', note: 'tunggu kisi-kisi', stage: 'Develop Konten (materi/soal)', link: '', __baris: 3 },
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
    packages: [{ paket_id: 'PKG-002', platform: '', program: '', nama_paket: 'PT.KAI_BUMN', latsol: '3 September', materi: '', tryout: '', drilling: '', live_class: '', tujuan: '', catatan: 'DL 23 Sept', mirror: 1, __baris: 2 }],
    package_items: [{ item_id: 'I1', paket_id: 'PKG-002', kategori: 'Tryout', __baris: 2 }, { item_id: 'I2', paket_id: 'PKG-002', kategori: 'Dibimbing', __baris: 3 }],
    dashboards: [{ title: 'Proyek Freelance', deskripsi: '', icon: '', url: 'https://contoh.id/freelance', __baris: 2 }, { title: 'Bukan tautan', url: 'tidak ada', __baris: 3 }],
    activity_log: [
      { terjadi_at: '2026-08-27 10:39:00', user_nama: 'Kiki', action: 'Checklist Add', task_id: 'TSK-100', detail: 'QC paket 1', status_lama: '', status_baru: '', __baris: 3 },
      { terjadi_at: '2026-08-26 09:00:00', user_nama: 'Nynda (PM)', action: 'Update Task', task_id: 'TSK-099', detail: 'Riset', status_lama: 'In progress', status_baru: 'Done', __baris: 2 },
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

test('nomor task v1 dipertahankan: TSK-099 → PRD-099', () => {
  const { data } = ubah(dumpV1());
  assert.ok(cari(data, 'PRD-099'));
  assert.ok(cari(data, 'PRD-104'));
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

test('tahap ADDIE: tabel stage v1, plus pengecualian dari judul', () => {
  assert.deepEqual(tahap('QC', 'Melakukan 40 QC Ops Tryout'), ['V', LCI_SUB]);
  assert.deepEqual(tahap('Operasional', 'Memonitor 5 liveclass jadiasn'), ['I', 'Liveclass']);
  assert.deepEqual(tahap('Develop Konten (materi/soal)', 'Membuat 12 Soal Liveclass TIU'), ['V', '3.1 Academic Content Development'],
    'soal untuk liveclass adalah pengembangan konten, bukan pelaksanaan liveclass');
  assert.deepEqual(tahap('Develop Konten (materi/soal)', 'Membuat 1 PPT Data Report Center'), ['E', 'Report Center']);
  assert.deepEqual(tahap('RnD', 'Menyusun 1 Kurikulum SIPSS'), ['D', 'Academic blueprint']);
  assert.deepEqual(tahap('RnD', 'Melakukan Riset SKD CPNS'), ['A', 'Market analysis']);
  assert.deepEqual(tahap('', 'To Do List'), ['V', '']);
});

test('status: daftar umum dan daftar LCI tak tertukar', () => {
  assert.equal(statusV2('Done', 'QC', LCI_SUB), 'Published');
  assert.equal(statusV2('In progress', 'QC', LCI_SUB), 'QC');
  assert.equal(statusV2('In progress', 'Manajemen Sistem', LCI_SUB), 'Input');
  assert.equal(statusV2('Review PM', 'QC', LCI_SUB), 'Approved');
  assert.equal(statusV2('Done', 'RnD', 'Market analysis'), 'Done');
  assert.equal(statusV2('Todo', 'RnD', 'Market analysis'), 'Ready');
  assert.equal(statusV2('Hold', 'RnD', 'Market analysis'), 'Blocked');
});

test('gate dan log gate diambil dari status_by v1, termasuk jam WIB-nya', () => {
  const { data } = ubah(dumpV1());
  const selesai = cari(data, 'PRD-099');
  assert.equal(selesai.gate, 'Lolos');
  assert.deepEqual(selesai.gateLog, [{ id: 'g-PRD-099', by: 'nynda', action: 'Lolos', note: 'Ditandai Done di v1', at: Date.UTC(2026, 7, 31, 8, 1, 49) }]);
  const review = cari(data, 'PRD-102');
  assert.equal(review.status, 'Review');
  assert.equal(review.gate, 'Diajukan');
  assert.equal(review.gateLog[0].by, 'Arifah');
  assert.equal(cari(data, 'PRD-104').gateLog.length, 0, 'tanpa status_by, tak ada log gate yang dikarang');
});

test('isi task: output, evidence, catatan PM, dan Hold', () => {
  const { data } = ubah(dumpV1());
  const t = cari(data, 'PRD-099');
  assert.equal(t.output, '1 laporan riset');
  assert.equal(t.priority, 'High');
  assert.deepEqual(t.evidence, [{ id: 'e-PRD-099', label: 'Google Docs', url: 'https://docs.google.com/document/d/abc' }]);
  assert.match(t.notes, /^Catatan PM: Fokus ke TIU$/);
  const hold = cari(data, 'PRD-103');
  assert.equal(hold.status, 'Blocked');
  assert.match(hold.notes, /Hold/);
  assert.equal(hold.stage, 'E');
});

test('kolaborasi → proyek; langkahnya jadi task berantai sesuai urutan', () => {
  const { data, ringkasan } = ubah(dumpV1());
  const p = data.projects.find(x => x.id === 'PRJ-21');
  assert.equal(p.platform, 'BUMN', 'ditebak dari judul BUMN_PT.KAI_…');
  assert.equal(p.goal, 'Paket KAI');
  const langkah = data.tasks.filter(t => t.project === 'PRJ-21');
  assert.deepEqual(langkah.map(t => t.id), ['PRD-105', 'PRD-106', 'PRD-107'], 'nomor sesudah task v1 terbesar, urut menurut urutan');
  assert.deepEqual(langkah.map(t => t.title), ['Riset kisi-kisi KAI', 'Develop 200 soal', 'Input soal']);
  assert.deepEqual(langkah.map(t => t.deps), [[], ['PRD-105'], ['PRD-106']]);
  assert.deepEqual(langkah.map(t => t.status), ['Done', 'In Progress', 'Ready to Input'], 'yang pertama belum selesai sedang berjalan; sisanya menunggu');
  assert.equal(p.stage, 'V', 'tahap proyek = tahap langkah yang sedang berjalan');
  assert.equal(langkah[0].evidence[0].label, 'Google Sheets');
  assert.equal(langkah[0].gateLog[0].by, 'andika');
  assert.equal(langkah[1].notes, 'tunggu kisi-kisi');
  assert.equal(ringkasan.langkahJadiTask, 3);
});

test('ceklis dan komentar ikut ke induknya; yang yatim dihitung, bukan dikarang', () => {
  const { data, ringkasan } = ubah(dumpV1());
  assert.deepEqual(cari(data, 'PRD-100').subtasks, [{ id: 's2', title: 'QC paket 1', pic: 'kiki', due: '', status: 'Done' }]);
  assert.deepEqual(cari(data, 'PRD-106').subtasks.map(s => [s.title, s.pic, s.status]), [['TIU 100 soal', 'uma', 'Todo']],
    'ceklis COL-021#2 milik langkah 2; yang belum dicentang dipegang PIC langkahnya');
  assert.deepEqual(cari(data, 'PRD-105').comments.map(c => c.text), ['Kick-off'], 'diskusi kolaborasi ditampung di langkah pertama');
  assert.deepEqual(cari(data, 'PRD-099').comments.map(c => c.author), ['ali']);
  assert.deepEqual(ringkasan.dibuang, { ceklisYatim: 1, komentarYatim: 1, logTerpotong: 0 });
});

test('paket dan bookmark', () => {
  const { data } = ubah(dumpV1());
  assert.deepEqual(data.packages, [{ id: 'PKG-002', platform: 'BUMN', name: 'PT.KAI_BUMN', type: 'Premium', status: 'Aktif', components: ['Tryout', 'Latsol', 'Liveclass'], note: 'DL 23 Sept' }]);
  assert.deepEqual(data.bookmarks, [{ id: 'f-dashboard', name: 'Dashboard tim (v1)', emoji: '📈', links: [{ id: 'b2', title: 'Proyek Freelance', url: 'https://contoh.id/freelance' }] }]);
});

test('riwayat: terbaru dulu, jenis & label dipetakan, task yang dihapus tetap terbaca', () => {
  const { data } = ubah(dumpV1());
  assert.deepEqual(data.log.map(l => [l.type, l.task, l.by]), [
    ['system', 'Pengguna', 'Dev'],
    ['update', 'PRD-100 · Melakukan 40 QC Ops Tryout', 'kiki'],
    ['update', 'PRD-099 · Melakukan Riset SKD CPNS', 'nynda'],
    ['delete', 'PRD-455 (sudah dihapus di v1)', 'alya'],
  ]);
  assert.equal(data.log[1].detail, 'Sub-task ditambah: QC paket 1');
  assert.equal(data.log[2].detail, 'Riset · Status: In progress → Done');
});

test('riwayat dipotong di 1000 terbaru, sama dengan batas prototipe', () => {
  const d = dumpV1();
  d.activity_log = Array.from({ length: 1005 }, (_, i) => ({ terjadi_at: `2026-08-01 ${String(Math.floor(i / 60) % 24).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00`, user_nama: 'Ali', action: 'Update Task', task_id: 'TSK-099', detail: '', status_lama: '', status_baru: '', __baris: i + 2 }));
  const { data, ringkasan } = ubah(d);
  assert.equal(data.log.length, 1000);
  assert.equal(ringkasan.dibuang.logTerpotong, 5);
});

test('PIN, catatan pribadi, dan notifikasi v1 tidak terbawa sama sekali', () => {
  const { data } = ubah(dumpV1());
  assert.deepEqual(Object.keys(data), ['projects', 'tasks', 'backlog', 'packages', 'bookmarks', 'log']);
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
