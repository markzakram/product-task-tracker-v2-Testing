/* =============================================================================
   _demo.js — skenario contoh di atas data v1: rancangan paket → proyek → setoran.

     npm run impor:v1 -- --demo

   Tujuannya supaya alur "progres paket bergerak sendiri" langsung terlihat. Semua langkah
   memakai aturan yang sama dengan tombol di aplikasi (public/inti.js): elaborasiPaket untuk
   membuat proyek dan task, terapkanAksi untuk mulai/ajukan/setujui/kembalikan/tahan. Yang
   tampil adalah hasil alur sungguhan, bukan angka yang ditulis tangan.

   Tiga paket v1 dipakai:
   - PKG-001 TKA_CEREBRUM: target ASLI dari v1. Dielaborasi 10 hari lalu; sebagian task sudah
     disetujui, ada yang ditinjau, dikerjakan, terlambat, tertahan, dan masih antre.
   - PKG-004 OJK: di v1 belum ada target. Diberi target contoh, dielaborasi 16 hari lalu, dan
     semua task-nya sudah disetujui → proyeknya menunggu keputusan Manager untuk maju.
   - PKG-006 UTBK: di v1 belum ada target. Diberi target contoh tapi BELUM dielaborasi, untuk
     dicoba sendiri lewat tombol "Elaborasi jadi proyek".
   Ditambah beberapa Catatan Saya dan Link Saya contoh (folder "Contoh") memakai tautan
   Dashboard Lain dan tautan paket yang memang sudah ada di data contoh.

   Fungsi murni terhadap `data` (hasil _v1ke2.ubah); tidak menyentuh jaringan maupun berkas.
   ========================================================================== */

const Inti = require('../public/inti');

const JAM = 3600e3;
const HARI = 24 * JAM;
const MANAGER = Inti.MANAGER;

/* Target contoh untuk paket v1 yang belum punya target. Kolom: kategori, grup, nama,
   target, satuan, sudah ada. Nama grup TPA/TBI meniru grup yang dipakai paket v1 lain. */
const TARGET_CONTOH = {
  'PKG-004': [
    ['Tryout', 'Tes Potensi Akademik (TPA)', 'Tryout OJK — TPA', 5, 'Paket', 0],
    ['Tryout', 'Tes Bahasa Inggris (TBI)', 'Tryout OJK — TBI', 3, 'Paket', 0],
    ['Latsol', 'Tes Potensi Akademik (TPA)', 'Verbal, Numerik, Logika', 6, 'Paket', 2],
    ['Latsol', 'Tes Bahasa Inggris (TBI)', 'Structure & Reading', 4, 'Paket', 0],
    ['Live Class', '', 'Kelas Strategi Seleksi OJK', 2, 'Sesi', 0],
  ],
  'PKG-006': [
    ['Tryout', '', 'Tryout UTBK SNBT', 5, 'Paket', 2],
    ['Latsol', 'TPS', 'Penalaran Umum', 3, 'Paket', 0],
    ['Latsol', 'TPS', 'Pengetahuan Kuantitatif', 3, 'Paket', 0],
    ['Latsol', 'Literasi', 'Literasi Bahasa Indonesia', 3, 'Paket', 1],
    ['Latsol', 'Literasi', 'Literasi Bahasa Inggris', 3, 'Paket', 0],
    ['Live Class', '', 'Kelas Strategi UTBK', 2, 'Sesi', 0],
  ],
};

/* PIC per kategori target, mengikuti organogram: konten akademik oleh tim Andika,
   live class oleh Bilar (tim Alya), kelas bimbingan oleh Nadya (tim Dhea). */
const AKADEMIK = ['uma', 'tri', 'wildan'];
function picUntuk(kategori, i) {
  if (kategori === 'Live Class') return 'bilar';
  if (kategori === 'Dibimbing') return 'nadya';
  return AKADEMIK[i % AKADEMIK.length];
}

function beriTarget(p, daftar, waktu) {
  p.items = daftar.map(([kategori, grup, nama, target, satuan, awal], i) => ({
    id: `ITM-C${p.id.slice(4)}${String(i + 1).padStart(2, '0')}`, urutan: i + 1, kategori, grup, nama, target, satuan, awal,
    catatan: 'Target contoh (data dummy)',
  }));
  p.catatan = p.catatan || 'Target di paket ini adalah data contoh untuk mencoba alur elaborasi.';
  Object.assign(p, { updatedBy: MANAGER, updatedAt: waktu });
}

/* Satu langkah alur, dijalankan dengan aturan aplikasi pada waktu tertentu di masa lalu. */
const aksi = (data, t, kunci, oleh, waktu, catatan) => Inti.terapkanAksi(data, t, kunci, oleh, waktu, catatan);
function komentar(data, t, author, text, at) {
  t.comments.push({ id: `k-demo-${t.id}-${t.comments.length}`, author, text, at });
  Inti.catatLog(data, 'comment', `${t.id} · ${t.title}`, text.slice(0, 120), author, at);
}

/* PKG-001: progres campuran. Urutan keadaan dipakai berulang kalau task-nya lebih banyak. */
function skenarioCampuran(data, sekarang) {
  const p = data.packages.find(x => x.id === 'PKG-001');
  if (!p || !p.items.length) return null;
  const mulaiProyek = sekarang - 10 * HARI;
  const { project, tasks } = Inti.elaborasiPaket(data, p, {
    lead: 'andika', pic: 'andika', stage: 'V', items: p.items.map(i => i.id),
  }, MANAGER, mulaiProyek, Inti.isoHari(mulaiProyek));
  const hariIni = Inti.isoHari(sekarang);
  tasks.forEach((t, i) => {
    const kategori = t.title.split(' · ')[0];
    t.pic = picUntuk(kategori, i);
    t.start = Inti.isoHari(mulaiProyek);
    const tinjau = Inti.peninjau(t);
    const k = i % 11;
    if (k <= 4) {                       // sudah disetujui → masuk ke progres paket
      const mulai = sekarang - (9 - k) * HARI;
      t.due = Inti.tambahHari(hariIni, -(5 - k));
      aksi(data, t, 'mulai', t.pic, mulai);
      aksi(data, t, 'ajukan', t.pic, mulai + 2 * HARI);
      aksi(data, t, 'setujui', tinjau, mulai + 3 * HARI);
    } else if (k === 5) {               // pernah dikembalikan, kini diajukan lagi
      t.due = Inti.tambahHari(hariIni, 1);
      t.priority = 'High';
      aksi(data, t, 'mulai', t.pic, sekarang - 6 * HARI);
      aksi(data, t, 'ajukan', t.pic, sekarang - 4 * HARI);
      aksi(data, t, 'kembalikan', tinjau, sekarang - 3 * HARI, 'Bobot soal nomor 12–15 belum sesuai kisi-kisi TKA terbaru.');
      komentar(data, t, t.pic, 'Siap, saya revisi nomor 12–15 dulu ya.', sekarang - 3 * HARI + 2 * JAM);
      aksi(data, t, 'ajukan', t.pic, sekarang - 1 * HARI);
      komentar(data, t, t.pic, 'Sudah direvisi sesuai kisi-kisi, mohon dicek lagi.', sekarang - 1 * HARI + 10 * 60e3);
    } else if (k === 6) {               // menunggu tinjauan
      t.due = Inti.tambahHari(hariIni, 2);
      aksi(data, t, 'mulai', t.pic, sekarang - 3 * HARI);
      aksi(data, t, 'ajukan', t.pic, sekarang - 5 * JAM);
    } else if (k === 7) {               // dikerjakan, sudah lewat tenggat
      t.due = Inti.tambahHari(hariIni, -2);
      aksi(data, t, 'mulai', t.pic, sekarang - 4 * HARI);
      komentar(data, t, tinjau, 'Ini sudah lewat tenggat. Ada yang bisa dibantu?', sekarang - 1 * HARI);
      komentar(data, t, t.pic, 'Tinggal 1 paket lagi, besok saya ajukan.', sekarang - 20 * JAM);
    } else if (k === 8) {               // dikerjakan tapi tertahan
      t.due = Inti.tambahHari(hariIni, 4);
      aksi(data, t, 'mulai', t.pic, sekarang - 2 * HARI);
      aksi(data, t, 'tahan', t.pic, sekarang - 1 * HARI, 'Menunggu kisi-kisi TKA terbaru dari Pusmendik.');
    } else {                            // masih antre
      t.due = Inti.tambahHari(hariIni, 7 + k - 9);
    }
  });
  return { project, tasks };
}

/* PKG-004: semua target selesai dikerjakan dan disetujui → proyek siap maju tahap. */
function skenarioTuntas(data, sekarang) {
  const p = data.packages.find(x => x.id === 'PKG-004');
  if (!p) return null;
  beriTarget(p, TARGET_CONTOH['PKG-004'], sekarang - 18 * HARI);
  const mulaiProyek = sekarang - 16 * HARI;
  const { project, tasks } = Inti.elaborasiPaket(data, p, {
    lead: 'andika', pic: 'andika', stage: 'V', items: p.items.map(i => i.id),
  }, MANAGER, mulaiProyek, Inti.isoHari(mulaiProyek));
  tasks.forEach((t, i) => {
    t.pic = picUntuk(t.title.split(' · ')[0], i);
    t.start = Inti.isoHari(mulaiProyek);
    const mulai = mulaiProyek + (1 + i) * HARI;
    t.due = Inti.isoHari(mulai + 6 * HARI);
    aksi(data, t, 'mulai', t.pic, mulai);
    aksi(data, t, 'ajukan', t.pic, mulai + 3 * HARI);
    aksi(data, t, 'setujui', Inti.peninjau(t), mulai + 4 * HARI);
  });
  return { project, tasks };
}

/* Catatan Saya & Link Saya contoh, di folder "Contoh". Link-nya hanya tautan yang sudah ada
   di data contoh (Dashboard Lain dan tautan paket), bukan Link Saya pribadi dari v1. */
function ruangSayaContoh(data, sekarang) {
  const sumber = [
    ...data.dashboards.map(d => ({ title: d.title, url: d.url })),
    ...data.packages.flatMap(p => p.links.map(l => ({ title: `${l.label} (${p.namaPaket || p.id})`, url: l.url }))),
  ];
  const catatan = {
    nynda: [['Rapat mingguan produk', 'Agenda:\n1. Progres paket TKA_CEREBRUM\n2. Keputusan tahap proyek OJK\n3. Rencana paket UTBK'],
      ['Prioritas Oktober', '- Tuntaskan Latsol TKA\n- Siapkan Implementation OJK\n- Elaborasi UTBK minggu depan']],
    andika: [['Kisi-kisi TKA', 'Cek ulang bobot soal tiap mapel sebelum diajukan.\nKoordinasi dengan Uma, Tri, Wildan.']],
    alya: [['Checklist QC live class', '- Rekaman tersimpan\n- Materi diunggah\n- Absensi terisi']],
    ali: [['Ide fitur', 'Notifikasi saat target paket terpenuhi.']],
  };
  let n = 0;
  for (const [user, isi] of Object.entries(catatan)) {
    isi.forEach(([title, body], i) => {
      data.notes.push({ id: `n-demo-${user}-${i}`, user, folder: 'Contoh', title, body, updatedAt: sekarang - (i + 1) * 5 * JAM });
      n++;
    });
  }
  let m = 0;
  for (const user of ['nynda', 'andika', 'alya', 'ali']) {
    sumber.slice(0, 4).forEach((s, i) => {
      data.links.push({ id: `u-demo-${user}-${i}`, user, folder: 'Contoh', title: s.title, url: s.url });
      m++;
    });
  }
  return { catatan: n, link: m };
}

function tambahDemo(data, sekarang = Date.now()) {
  data.setoran = data.setoran || [];
  const campuran = skenarioCampuran(data, sekarang);
  const tuntas = skenarioTuntas(data, sekarang);
  const utbk = data.packages.find(x => x.id === 'PKG-006');
  if (utbk && !utbk.items.length) beriTarget(utbk, TARGET_CONTOH['PKG-006'], sekarang - 2 * HARI);
  const ruang = ruangSayaContoh(data, sekarang);
  // Langkah alur di atas dicatat dengan waktu lampau; riwayat harus tetap terbaru di atas.
  data.log.sort((a, b) => b.at - a.at);
  if (data.log.length > 1000) data.log.length = 1000;
  const proyek = [campuran, tuntas].filter(Boolean);
  return {
    proyek: proyek.map(x => `${x.project.id} ${x.project.name} (${x.tasks.length} task)`),
    task: proyek.reduce((n, x) => n + x.tasks.length, 0),
    setoran: data.setoran.length,
    ...ruang,
  };
}

module.exports = { tambahDemo, TARGET_CONTOH };
