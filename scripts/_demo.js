/* =============================================================================
   _demo.js — skenario contoh di atas data v1: rancangan paket → proyek → setoran.

     npm run impor:v1 -- --demo

   Tujuannya supaya alur PRD v3 langsung terlihat: elaborasi paket menjadi batch beralur
   (DV1 › E1 › DV8 › I1 › QC › I4), langkah diserahkan ke Lead tim pemilik lalu
   didelegasikan ke staff, gate per langkah, dan progres paket yang naik per capaian.
   Semua langkah memakai aturan yang sama dengan tombol di aplikasi (public/inti.js):
   elaborasiPaket, isiOutput, tambahBukti, terapkanAksi. Yang tampil adalah hasil alur
   sungguhan, bukan angka yang ditulis tangan.

   Tiga paket v1 dipakai:
   - PKG-001 TKA_CEREBRUM: target ASLI dari v1. Dielaborasi dua pekan lalu; batch-batchnya
     sampai di capaian yang berbeda — ada yang sudah tayang, lolos QC, ter-input, konten
     siap, dikembalikan untuk revisi, terlambat, tertahan, dan yang masih di antrean Lead.
   - PKG-004 OJK: di v1 belum ada target. Diberi target contoh, lalu proyeknya dijalankan
     penuh: intake (A1) dan target (A6) oleh Manager, semua batch tayang, dan siklusnya
     ditutup E12 — menunggu Manager memulai siklus berikutnya.
   - PKG-006 UTBK: di v1 belum ada target. Diberi target contoh tapi BELUM dielaborasi,
     untuk dicoba sendiri lewat tombol "Elaborasi jadi proyek".
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
    ['Tryout', 'Tes Potensi Akademik (TPA)', 'OJK — TPA', 5, 'Paket', 0],
    ['Tryout', 'Tes Bahasa Inggris (TBI)', 'OJK — TBI', 3, 'Paket', 0],
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

/* Staff yang menerima delegasi per sub-stage, mengikuti organogram: soal oleh staff akademik
   (tim Andika), input/generate/QC aplikasi/show-hide oleh Kiki dan live class oleh Bilar
   (tim Alya), materi dan guru oleh Nadya (tim Dhea). D5 dirancang Alya sendiri. */
const AKADEMIK = ['uma', 'tri', 'wildan'];
function stafUntuk(kode, i) {
  if (['DV1', 'DV2'].includes(kode)) return AKADEMIK[i % 3];
  if (['E1', 'E2'].includes(kode)) return AKADEMIK[(i + 1) % 3];      // QC oleh staff lain, bukan pembuatnya
  if (['DV3', 'I6'].includes(kode)) return 'nadya';
  if (kode === 'I7') return 'bilar';
  if (kode === 'D5') return '';                                        // tetap di Lead
  return 'kiki';
}

function beriTarget(p, daftar, waktu) {
  p.items = daftar.map(([kategori, grup, nama, target, satuan, awal], i) => ({
    id: `ITM-C${p.id.slice(4)}${String(i + 1).padStart(2, '0')}`, urutan: i + 1, kategori, grup, nama, target, satuan, awal,
    catatan: 'Target contoh (data dummy)',
  }));
  p.catatan = p.catatan || 'Target di paket ini adalah data contoh untuk mencoba alur elaborasi.';
  Object.assign(p, { updatedBy: MANAGER, updatedAt: waktu });
}

/* Lead tim pemilik menyerahkan langkah ke staff-nya (sama dengan mengganti PIC lewat Ubah). */
function delegasikan(data, t, staf, waktu) {
  if (!staf || staf === t.pic) return;
  const lead = t.pic;
  t.pic = staf;
  t.updatedAt = waktu;
  Inti.catatLog(data, 'update', `${t.id} · ${t.title}`, `Didelegasikan ke ${Inti.orang(staf).pendek}`, lead, waktu);
}
function komentar(data, t, author, text, at) {
  t.comments.push({ id: `k-demo-${t.id}-${t.comments.length}`, author, text, at });
  Inti.catatLog(data, 'comment', `${t.id} · ${t.title}`, text.slice(0, 120), author, at);
}
/* PIC mengerjakan: mulai, isi output & bukti (syarat gate), lalu ajukan (atau selesai bila tanpa peninjau). */
function kerjakan(data, t, mulai, ajukanPada) {
  Inti.terapkanAksi(data, t, 'mulai', t.pic, mulai);
  if (!ajukanPada) return;
  Inti.isiOutput(data, t, `${t.output || t.title.split(' · ').slice(1).join(' · ')} — sesuai target`, t.pic, ajukanPada - 2 * JAM);
  Inti.tambahBukti(data, t, { label: 'Hasil kerja', url: `https://docs.google.com/spreadsheets/d/contoh-${t.id.toLowerCase()}` }, t.pic, ajukanPada - JAM);
  Inti.terapkanAksi(data, t, Inti.peninjau(t) ? 'ajukan' : 'selesai', t.pic, ajukanPada);
}
const setujui = (data, t, w) => Inti.terapkanAksi(data, t, 'setujui', Inti.peninjau(t), w);

/* Seluruh langkah sebuah batch, dikelompokkan dari task hasil elaborasi. */
function batchDari(tasks) {
  const daftar = [];
  for (const t of tasks) {
    const akhir = daftar.length ? daftar[daftar.length - 1] : null;
    if (akhir && t.deps[0] === akhir[akhir.length - 1].id) akhir.push(t);
    else daftar.push([t]);
  }
  return daftar;
}

/* Menjalankan satu batch sampai keadaan tertentu. `n` = jumlah langkah yang sudah lolos;
   langkah ke-n (kalau ada) diberi keadaan `lalu`. */
function jalankanBatch(data, langkah, n, lalu, akhirLolos, sekarang, i) {
  const hariIni = Inti.isoHari(sekarang);
  langkah.forEach((t, k) => {
    if (k < n) {
      const setuju = akhirLolos - (n - 1 - k) * 1.1 * HARI;
      const mulai = setuju - 18 * JAM;
      delegasikan(data, t, stafUntuk(t.sub, i), mulai - JAM);
      t.due = Inti.isoHari(setuju);
      kerjakan(data, t, mulai, setuju - 4 * JAM);
      if (t.status === 'Ditinjau') setujui(data, t, setuju);
    } else if (k === n) {
      const staf = stafUntuk(t.sub, i);
      if (lalu === 'antrean') { t.due = Inti.tambahHari(hariIni, 6); return; }   // masih di Lead, menunggu didelegasikan
      delegasikan(data, t, staf, sekarang - 3 * HARI);
      if (lalu === 'antre') { t.due = Inti.tambahHari(hariIni, 5); return; }
      if (lalu === 'dikerjakan') {
        t.due = Inti.tambahHari(hariIni, 3);
        kerjakan(data, t, sekarang - 2 * HARI);
      } else if (lalu === 'telat') {
        t.due = Inti.tambahHari(hariIni, -2);
        kerjakan(data, t, sekarang - 4 * HARI);
        komentar(data, t, Inti.orang(t.pic).lead || MANAGER, 'Ini sudah lewat tenggat. Ada yang bisa dibantu?', sekarang - 1 * HARI);
        komentar(data, t, t.pic, 'Tinggal satu paket lagi, besok saya ajukan.', sekarang - 20 * JAM);
      } else if (lalu === 'tertahan') {
        t.due = Inti.tambahHari(hariIni, 4);
        kerjakan(data, t, sekarang - 2 * HARI);
        Inti.terapkanAksi(data, t, 'tahan', t.pic, sekarang - 1 * HARI, 'Menunggu akses SIADU untuk tahun ajaran baru.');
      } else if (lalu === 'ditinjau') {
        t.due = Inti.tambahHari(hariIni, 1);
        kerjakan(data, t, sekarang - 3 * HARI, sekarang - 5 * JAM);
      } else if (lalu === 'revisi') {
        t.due = Inti.tambahHari(hariIni, 2);
        t.priority = 'High';
        kerjakan(data, t, sekarang - 5 * HARI, sekarang - 3 * HARI);
        Inti.terapkanAksi(data, t, 'kembalikan', Inti.peninjau(t), sekarang - 2 * HARI, 'Bobot soal nomor 12–15 belum sesuai kisi-kisi TKA terbaru.');
        komentar(data, t, t.pic, 'Siap, nomor 12–15 saya revisi dulu ya.', sekarang - 2 * HARI + 2 * JAM);
      }
    } else {
      t.due = Inti.tambahHari(hariIni, 7 + k);
    }
  });
}

/* Berapa langkah sebuah batch sudah lolos supaya sampai di capaian tertentu. */
function langkahSampai(langkah, setoran, capaian) {
  if (capaian === 'tayang') return langkah.length;
  const idx = langkah.findIndex(t => setoran.some(s => s.task === t.id && s.tahap === capaian));
  return idx < 0 ? 0 : idx + 1;
}

/* PKG-001: progres campuran dari target asli v1. */
function skenarioTka(data, sekarang) {
  const p = data.packages.find(x => x.id === 'PKG-001');
  if (!p || !p.items.length) return null;
  const mulaiProyek = sekarang - 14 * HARI;
  const { project, tasks } = Inti.elaborasiPaket(data, p, { items: p.items.map(i => i.id) }, MANAGER, mulaiProyek, Inti.isoHari(mulaiProyek));
  // [capaian yang sudah lolos, keadaan langkah berikutnya]
  const RENCANA = [
    ['tayang'], ['tayang'], ['qc', 'dikerjakan'], ['input', 'ditinjau'], ['input', 'antrean'], ['konten', 'antrean'],
    ['konten', 'tertahan'], [1, 'revisi'], [0, 'ditinjau'], [0, 'telat'], [0, 'antrean'],
  ];
  batchDari(tasks).forEach((langkah, i) => {
    const [capai, lalu] = RENCANA[i % RENCANA.length];
    const n = typeof capai === 'number' ? capai : langkahSampai(langkah, data.setoran, capai);
    jalankanBatch(data, langkah, n, lalu, sekarang - (1 + (i % 4) * 0.7) * HARI, sekarang, i);
  });
  return { project, tasks };
}

/* PKG-004: proyek penuh satu siklus — A1 & A6 oleh Manager, semua batch tayang, E12 ditutup. */
function skenarioOjk(data, sekarang) {
  const p = data.packages.find(x => x.id === 'PKG-004');
  if (!p) return null;
  beriTarget(p, TARGET_CONTOH['PKG-004'], sekarang - 30 * HARI);
  const awal = sekarang - 28 * HARI;
  const hari = w => Inti.isoHari(w);
  const proj = Inti.proyekBaru(data, { name: 'Produksi OJK', platform: 'OJK', goal: 'Paket TO & latsol OJK 2026 sesuai rancangan PKG-004.' }, MANAGER, awal);
  proj.paket = p.id;
  // Analysis oleh Manager: intake & target (sub-stage bertanda Manager).
  const a1 = Inti.taskBaru(data, { title: 'A1 · Intake kebutuhan paket OJK dari tim bisnis', project: proj.id, sub: 'A1', pic: MANAGER, due: hari(awal + 2 * HARI) }, MANAGER, awal, hari(awal));
  const a6 = Inti.taskBaru(data, { title: 'A6 · Target & indikator keberhasilan paket OJK', project: proj.id, sub: 'A6', pic: MANAGER, due: hari(awal + 4 * HARI), deps: [a1.id] }, MANAGER, awal, hari(awal));
  kerjakan(data, a1, awal + 6 * JAM, awal + 1.5 * HARI);
  kerjakan(data, a6, awal + 2 * HARI, awal + 3.5 * HARI);
  Inti.setKeputusan(data, proj, 'Build', MANAGER, awal + 3.5 * HARI + JAM);
  // Batch-batch dari rancangan paket, semuanya sampai tayang.
  const mulaiBatch = awal + 4 * HARI;
  const { tasks } = Inti.elaborasiPaket(data, p, { items: p.items.map(i => i.id), proyek: proj.id }, MANAGER, mulaiBatch, hari(mulaiBatch));
  const batch = batchDari(tasks);
  batch.forEach((langkah, i) => jalankanBatch(data, langkah, langkah.length, '', sekarang - (5 - i * 0.5) * HARI, sekarang, i));
  // E12 menutup siklus: Alya menyiapkan penutupan, Manager menyetujui.
  const terakhir = batch.map(l => l[l.length - 1].id);
  const e12 = Inti.taskBaru(data, { title: 'E12 · Final approval & penutupan siklus paket OJK', project: proj.id, sub: 'E12', pic: 'alya', due: hari(sekarang - HARI), deps: terakhir }, MANAGER, mulaiBatch, hari(mulaiBatch));
  kerjakan(data, e12, sekarang - 2 * HARI, sekarang - 1.5 * HARI);
  setujui(data, e12, sekarang - 1.2 * HARI);
  return { project: proj, tasks: [a1, a6, ...tasks, e12] };
}

/* Catatan Saya & Link Saya contoh, di folder "Contoh". Link-nya hanya tautan yang sudah ada
   di data contoh (Dashboard Lain dan tautan paket), bukan Link Saya pribadi dari v1. */
function ruangSayaContoh(data, sekarang) {
  const sumber = [
    ...data.dashboards.map(d => ({ title: d.title, url: d.url })),
    ...data.packages.flatMap(p => p.links.map(l => ({ title: `${l.label} (${p.namaPaket || p.id})`, url: l.url }))),
  ];
  const catatan = {
    nynda: [['Rapat mingguan produk', 'Agenda:\n1. Progres paket TKA_CEREBRUM\n2. Mulai siklus berikutnya untuk OJK\n3. Elaborasi paket UTBK'],
      ['Prioritas Oktober', '- Tuntaskan batch Latsol TKA\n- Evaluasi siklus 1 OJK\n- Elaborasi UTBK minggu depan']],
    andika: [['Kisi-kisi TKA', 'Cek ulang bobot soal tiap mapel sebelum E1 di-ACC.\nKoordinasi dengan Uma, Tri, Wildan.']],
    alya: [['Antrean input & QC', '- Delegasikan DV8 yang sudah konten siap ke Kiki\n- QC Web/Android sebelum show/hide']],
    ali: [['Ide fitur', 'Notifikasi saat batch naik capaian (konten siap, ter-input, tayang).']],
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
  const tka = skenarioTka(data, sekarang);
  const ojk = skenarioOjk(data, sekarang);
  const utbk = data.packages.find(x => x.id === 'PKG-006');
  if (utbk && !utbk.items.length) beriTarget(utbk, TARGET_CONTOH['PKG-006'], sekarang - 2 * HARI);
  const ruang = ruangSayaContoh(data, sekarang);
  Inti.segarkanTahap(data);
  // Langkah alur di atas dicatat dengan waktu lampau; riwayat harus tetap terbaru di atas.
  data.log.sort((a, b) => b.at - a.at);
  if (data.log.length > 1000) data.log.length = 1000;
  const proyek = [tka, ojk].filter(Boolean);
  return {
    proyek: proyek.map(x => `${x.project.id} ${x.project.name} (${x.tasks.length} task)`),
    task: proyek.reduce((n, x) => n + x.tasks.length, 0),
    setoran: data.setoran.length,
    ...ruang,
  };
}

module.exports = { tambahDemo, TARGET_CONTOH };
