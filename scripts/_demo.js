/* =============================================================================
   _demo.js — skenario contoh di atas data v1: rancangan paket → proyek → setoran.

     npm run impor:v1 -- --demo

   Tujuannya supaya alur kerja v2 langsung terlihat: elaborasi paket menjadi batch langkah
   (mis. Latsol DV1 › E1 › DV8 › I1 › E4 › E5 › E6 › I4), langkah dipegang Lead tim pemilik lalu
   DIBAGI ke staff timnya lewat task turunan, gate per langkah, progres paket yang naik per
   capaian, dan proyek yang berjalan per tim (2.19.0): tiap tim menjalankan fase ADDIE-nya
   sendiri, tim yang berbeda sejajar, ditambah serah-terima antartim dan gerbang Manager di
   Analysis. Semua langkah memakai aturan yang sama dengan tombol di aplikasi (public/inti.js):
   elaborasiPaket, taskAnak, isiOutput, tambahBukti, terapkanAksi. Yang tampil adalah hasil alur
   sungguhan, bukan angka yang ditulis tangan.

   Tiga paket v1 dipakai:
   - PKG-001 TKA_CEREBRUM: target ASLI dari v1. Dielaborasi dua pekan lalu. Design sudah tuntas
     dan proyeknya kini di Development: ada batch yang sudah ter-input, langkah Lead yang
     menunggu tinjauan Manager, task turunan yang sedang dikerjakan, terlambat, tertahan,
     dikembalikan, dan menunggu tinjauan Lead, serta langkah yang masih di antrean Lead.
     Implementation dan Evaluation tiap tim menunggu fase Development tim itu.
   - PKG-004 OJK: di v1 belum ada target. Diberi target contoh, lalu proyeknya dijalankan penuh:
     intake (A1) dan target (A6) oleh Manager sebagai gerbang, lalu langkah-langkah batch
     dikerjakan begitu tak menunggu apa pun lagi — soal RAD dan live class CLO lebih dulu, input
     LNA sesudah soalnya jadi, tayang sesudah QC — sampai semua batch tayang, lalu siklusnya
     ditutup E12 — menunggu Manager memulai siklus berikutnya.
   - PKG-006 UTBK: di v1 belum ada target. Diberi target contoh tapi BELUM dielaborasi,
     untuk dicoba sendiri lewat tombol "Elaborasi jadi proyek".
   Ditambah satu proyek TANPA paket (2.29.1): "Tes Psikologi PAPI Kostick", dua tim. RAD
   (Andika) meriset dan merancang instrumennya; DAE (Ali) merancang sistem penilaian sejajar,
   lalu membuat prototype yang menunggu rancangan RAD (serah-terima lewat Atur urutan tunggu).
   Rancangan RAD masih dikerjakan: begitu Andika mengajukannya, prototype Ali terbuka (2.30.0:
   yang diajukan tak lagi menahan), sementara Manager meninjau rancangannya.
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

/* Staff yang menerima task turunan per sub-stage, mengikuti organogram: soal oleh staff akademik
   (tim Andika; batch 4 paket ke atas dibagi ke dua orang), input/generate/QC aplikasi/
   show-hide oleh Kiki dan live class oleh Bilar (tim Alya), materi dan guru oleh Nadya
   (tim Dhea). D5 dikerjakan Alya sendiri. */
const AKADEMIK = ['uma', 'tri', 'wildan'];
function stafUntuk(kode, i, jumlah) {
  if (['DV1', 'DV2'].includes(kode)) return jumlah >= 4 ? [AKADEMIK[i % 3], AKADEMIK[(i + 2) % 3]] : [AKADEMIK[i % 3]];
  if (['E1', 'E2'].includes(kode)) return [AKADEMIK[(i + 1) % 3]];      // QC oleh staff lain, bukan pembuatnya
  if (['DV3', 'I6'].includes(kode)) return ['nadya'];
  if (kode === 'I7') return ['bilar'];
  if (kode === 'D5') return [];
  return ['kiki'];
}

function beriTarget(p, daftar, waktu) {
  p.items = daftar.map(([kategori, grup, nama, target, satuan, awal], i) => ({
    id: `ITM-C${p.id.slice(4)}${String(i + 1).padStart(2, '0')}`, urutan: i + 1, kategori, grup, nama, target, satuan, awal,
    catatan: 'Target contoh (data dummy)',
  }));
  p.catatan = p.catatan || 'Target di paket ini adalah data contoh untuk mencoba alur elaborasi.';
  Object.assign(p, { updatedBy: MANAGER, updatedAt: waktu });
}

function komentar(data, t, author, text, at) {
  t.comments.push({ id: `k-demo-${t.id}-${t.comments.length}`, author, text, at });
  Inti.catatLog(data, 'comment', `${t.id} · ${t.title}`, text.slice(0, 120), author, at);
}
/* PIC mengerjakan: mulai (kalau belum), isi output & bukti (syarat gate), lalu ajukan — atau
   tandai selesai bila tanpa peninjau. */
function kerjakan(data, t, mulai, ajukanPada) {
  if (t.status === 'Antre') Inti.terapkanAksi(data, t, 'mulai', t.pic, mulai);
  if (!ajukanPada) return;
  Inti.isiOutput(data, t, `${t.output || t.title.split(' · ').slice(1).join(' · ')} — sesuai target`, t.pic, ajukanPada - 2 * JAM);
  Inti.tambahBukti(data, t, { label: 'Hasil kerja', url: `https://docs.google.com/spreadsheets/d/contoh-${t.id.toLowerCase()}` }, t.pic, ajukanPada - JAM);
  Inti.terapkanAksi(data, t, Inti.peninjau(t) ? 'ajukan' : 'selesai', t.pic, ajukanPada);
}
const setujui = (data, t, w) => Inti.terapkanAksi(data, t, 'setujui', Inti.peninjau(t), w);

/* Lead membagi langkah yang ia pegang ke staff timnya lewat task turunan (sejak 0.15.0 task Lead
   tak diserahkan ke staff). Membagi langkah yang masih antre sekaligus memulainya. */
function bagi(data, t, staf, waktu) {
  const nama = Inti.subTahap(t.sub).nama;
  const batch = t.title.split(' · ').slice(1).join(' · ');
  return staf.map((s, k) => Inti.taskAnak(data, t, {
    title: `${nama} · ${batch}${staf.length > 1 ? ` (bagian ${k + 1}/${staf.length})` : ''}`, pic: s, due: t.due,
  }, t.pic, waktu + k * 10 * 60e3, Inti.isoHari(waktu)));
}

/* Satu langkah sampai lolos gate: Lead membagi ke staff, staff mengerjakan lalu Lead
   menyetujui; Lead melengkapi langkahnya dan Manager menyetujui. Tanpa staff, PIC-nya
   mengerjakan sendiri. */
function tuntaskan(data, t, staf, mulai, lolos) {
  t.due = Inti.isoHari(lolos);
  bagi(data, t, staf, mulai).forEach((a, k) => {
    kerjakan(data, a, mulai + (1 + k) * JAM, lolos - 8 * JAM);
    setujui(data, a, lolos - 6 * JAM);
  });
  kerjakan(data, t, mulai, lolos - 2 * JAM);
  if (t.status === 'Ditinjau') setujui(data, t, lolos);
}

/* Seluruh langkah sebuah batch, dikelompokkan dari task hasil elaborasi (deps mencatat urutan
   langkahnya), dan jumlah target yang dibawanya. */
function batchDari(tasks) {
  const daftar = [];
  for (const t of tasks) {
    const akhir = daftar.length ? daftar[daftar.length - 1] : null;
    if (akhir && t.deps[0] === akhir[akhir.length - 1].id) akhir.push(t);
    else daftar.push([t]);
  }
  return daftar;
}
const jumlahBatch = (data, langkah) => {
  const s = (data.setoran || []).find(x => x.batch === 'B-' + langkah[0].id);
  return s ? Number(s.jumlah) || 1 : 1;
};

/* Membawa satu langkah Development sampai keadaan contoh tertentu (PKG-001). Task turunannya yang
   pertama memperlihatkan keadaan itu; anak kedua (batch besar) sedang dikerjakan. */
function sampaiKeadaan(data, t, staf, keadaan, sekarang) {
  const hariIni = Inti.isoHari(sekarang);
  if (keadaan === 'antrean') { t.due = Inti.tambahHari(hariIni, 6); return; }   // masih di Lead, belum dibagi
  t.due = Inti.tambahHari(hariIni, 4);
  if (keadaan === 'tinjau-manager') {
    // Task turunannya sudah lolos; Lead mengajukan langkahnya ke Manager.
    bagi(data, t, staf, sekarang - 4 * HARI).forEach((a, k) => {
      kerjakan(data, a, sekarang - 4 * HARI + (1 + k) * JAM, sekarang - 2 * HARI);
      setujui(data, a, sekarang - 1.5 * HARI);
    });
    kerjakan(data, t, sekarang - 4 * HARI, sekarang - 6 * JAM);
    return;
  }
  const mulai = { dikerjakan: 2, telat: 4, tertahan: 2, ditinjau: 3, revisi: 5 }[keadaan] || 2;
  const [a, ...lain] = bagi(data, t, staf, sekarang - mulai * HARI - 2 * JAM);
  lain.forEach(x => { x.due = t.due; kerjakan(data, x, sekarang - mulai * HARI); });
  if (keadaan === 'dikerjakan') {
    a.due = Inti.tambahHari(hariIni, 3);
    kerjakan(data, a, sekarang - 2 * HARI);
  } else if (keadaan === 'telat') {
    a.due = Inti.tambahHari(hariIni, -2);
    kerjakan(data, a, sekarang - 4 * HARI);
    komentar(data, a, t.pic, 'Ini sudah lewat tenggat. Ada yang bisa dibantu?', sekarang - 1 * HARI);
    komentar(data, a, a.pic, 'Tinggal satu paket lagi, besok saya ajukan.', sekarang - 20 * JAM);
  } else if (keadaan === 'tertahan') {
    a.due = Inti.tambahHari(hariIni, 4);
    kerjakan(data, a, sekarang - 2 * HARI);
    Inti.terapkanAksi(data, a, 'tahan', a.pic, sekarang - 1 * HARI, 'Menunggu kisi-kisi TKA terbaru dari tim kurikulum.');
  } else if (keadaan === 'ditinjau') {
    a.due = Inti.tambahHari(hariIni, 1);
    kerjakan(data, a, sekarang - 3 * HARI, sekarang - 5 * JAM);
  } else if (keadaan === 'revisi') {
    a.due = Inti.tambahHari(hariIni, 2);
    a.priority = 'High';
    kerjakan(data, a, sekarang - 5 * HARI, sekarang - 3 * HARI);
    Inti.terapkanAksi(data, a, 'kembalikan', Inti.peninjau(a), sekarang - 2 * HARI, 'Bobot soal nomor 12–15 belum sesuai kisi-kisi TKA terbaru.');
    komentar(data, a, a.pic, 'Siap, nomor 12–15 saya revisi dulu ya.', sekarang - 2 * HARI + 2 * JAM);
  }
}

/* PKG-001: Design tuntas, Development berjalan. Per batch: [langkah Development yang sedang
   berjalan, keadaannya]. 'semua' = seluruh langkah Development batch itu sudah lolos; 'akhir' =
   produksi soal RAD sudah lolos dan input LNA (yang menunggunya) sedang berjalan. */
const RENCANA_TKA = [
  ['semua'], ['semua'], ['akhir', 'tinjau-manager'], ['akhir', 'dikerjakan'], ['akhir', 'antrean'], ['akhir', 'antrean'],
  ['awal', 'tertahan'], ['awal', 'revisi'], ['awal', 'ditinjau'], ['awal', 'telat'], ['awal', 'antrean'],
];
function skenarioTka(data, sekarang) {
  const p = data.packages.find(x => x.id === 'PKG-001');
  if (!p || !p.items.length) return null;
  const mulaiProyek = sekarang - 14 * HARI;
  const hariIni = Inti.isoHari(sekarang);
  const { project, tasks } = Inti.elaborasiPaket(data, p, { items: p.items.map(i => i.id) }, MANAGER, mulaiProyek, Inti.isoHari(mulaiProyek));
  const batch = batchDari(tasks);
  // Design (D5 rancangan Dibimbing) dikerjakan Alya sendiri di hari pertama.
  batch.forEach(langkah => langkah.filter(t => t.stage === 'D').forEach(t => tuntaskan(data, t, [], mulaiProyek + 3 * JAM, mulaiProyek + HARI)));
  batch.forEach((langkah, i) => {
    const [posisi, keadaan] = RENCANA_TKA[i % RENCANA_TKA.length];
    const jumlah = jumlahBatch(data, langkah);
    const dev = langkah.filter(t => t.stage === 'V');
    const kini = posisi === 'semua' ? dev.length : posisi === 'akhir' ? dev.length - 1 : 0;
    let w = mulaiProyek + 1.2 * HARI + i * 0.35 * HARI;
    dev.forEach((t, k) => {
      if (k < kini) { tuntaskan(data, t, stafUntuk(t.sub, i, jumlah), w, w + 3 * HARI); w += 3.3 * HARI; }
      else if (k === kini) sampaiKeadaan(data, t, stafUntuk(t.sub, i, jumlah), keadaan, sekarang);
      else t.due = Inti.tambahHari(hariIni, 6 + k);
    });
    // Implementation dan Evaluation menunggu fase Development timnya selesai.
    langkah.filter(t => ['I', 'E'].includes(t.stage)).forEach((t, k) => { t.due = Inti.tambahHari(hariIni, 10 + k); });
  });
  return { project, tasks };
}

/* PKG-004: proyek penuh satu siklus — A1 & A6 oleh Manager (gerbang), lalu langkah-langkah
   batch per putaran menurut urutan yang berlaku, dan E12 menutup siklus. */
function skenarioOjk(data, sekarang) {
  const p = data.packages.find(x => x.id === 'PKG-004');
  if (!p) return null;
  beriTarget(p, TARGET_CONTOH['PKG-004'], sekarang - 30 * HARI);
  const awal = sekarang - 28 * HARI;
  const hari = w => Inti.isoHari(w);
  const proj = Inti.proyekBaru(data, { name: 'Produksi OJK', platform: 'OJK', goal: 'Paket TO & latsol OJK 2026 sesuai rancangan PKG-004.' }, MANAGER, awal);
  proj.paket = p.id;
  // Analysis oleh Manager: intake & target (sub-stage bertanda Manager), berjalan bersamaan.
  const a1 = Inti.taskBaru(data, { title: 'A1 · Intake kebutuhan paket OJK dari tim bisnis', project: proj.id, sub: 'A1', pic: MANAGER, due: hari(awal + 2 * HARI) }, MANAGER, awal, hari(awal));
  const a6 = Inti.taskBaru(data, { title: 'A6 · Target & indikator keberhasilan paket OJK', project: proj.id, sub: 'A6', pic: MANAGER, due: hari(awal + 4 * HARI) }, MANAGER, awal, hari(awal));
  kerjakan(data, a1, awal + 6 * JAM, awal + 1.5 * HARI);
  kerjakan(data, a6, awal + HARI, awal + 3.5 * HARI);
  Inti.setKeputusan(data, proj, 'Build', MANAGER, awal + 3.5 * HARI + JAM);
  // Batch-batch dari rancangan paket. Tiap putaran mengerjakan bersamaan semua langkah yang
  // sudah tak menunggu apa pun — fase tim, serah-terima antartim, gerbang Manager — sampai
  // semuanya tuntas. Tim yang berbeda berjalan sejajar; di dalam tim menurut fase ADDIE-nya.
  const mulaiBatch = awal + 4 * HARI;
  const { tasks } = Inti.elaborasiPaket(data, p, { items: p.items.map(i => i.id), proyek: proj.id }, MANAGER, mulaiBatch, hari(mulaiBatch));
  const batch = batchDari(tasks);
  const asal = new Map(batch.flatMap((langkah, i) => langkah.map(t => [t.id, [i, langkah]])));
  let w = mulaiBatch + 4 * JAM;
  for (let putaran = 0; putaran < 20; putaran++) {
    const perId = Inti.indeks(data);
    const siap = tasks.filter(t => t.status === 'Antre' && !Inti.depsBelum(t, perId).length);
    if (!siap.length) break;
    let akhir = w;
    siap.forEach((t, j) => {
      const [i, langkah] = asal.get(t.id);
      const mulai = w + j * 3 * JAM;
      tuntaskan(data, t, stafUntuk(t.sub, i, jumlahBatch(data, langkah)), mulai, mulai + 2.5 * HARI);
      akhir = Math.max(akhir, mulai + 2.5 * HARI);
    });
    w = akhir + 6 * JAM;
  }
  // E12 menutup siklus setelah semua task lain tuntas: Alya menyiapkan, Manager menyetujui.
  const e12 = Inti.taskBaru(data, { title: 'E12 · Final approval & penutupan siklus paket OJK', project: proj.id, sub: 'E12', pic: 'alya', due: hari(w + HARI) }, MANAGER, mulaiBatch, hari(mulaiBatch));
  tuntaskan(data, e12, [], w, w + 0.8 * HARI);
  return { project: proj, tasks: [a1, a6, ...tasks, e12] };
}

/* Proyek lintas tim tanpa rancangan paket (2.29.1): PAPI Kostick. Analysis: intake & target oleh
   Manager (gerbang) dan riset RAD (sebagian dibagi ke Uma). Design sejajar: blueprint instrumen
   oleh Andika (RAD) dan rancangan sistem penilaian oleh Ali (DAE, tanpa staff). Ali memasang
   prototype DV7 menunggu blueprint D2 RAD. Keadaannya kini: D2 masih dikerjakan Andika (output
   sudah terisi), jadi DV7 (dan produksi butir RAD) masih menunggu. Begitu D2 diajukan, keduanya
   bisa mulai sejajar selagi Manager meninjau D2 (2.30.0). */
function skenarioPapi(data, sekarang) {
  const awal = sekarang - 12 * HARI;
  const hari = w => Inti.isoHari(w);
  const proj = Inti.proyekBaru(data, { name: 'Tes Psikologi PAPI Kostick', platform: 'All Platform',
    goal: 'Tes kepribadian kerja PAPI Kostick (90 pasang pernyataan, 20 aspek) dengan skor dan laporan otomatis, mulai dari prototype untuk uji coba internal.' }, MANAGER, awal);
  const baru = (sub, judul, pic, due) => Inti.taskBaru(data, { title: `${sub} · ${judul}`, project: proj.id, sub, pic, due: hari(due) }, MANAGER, awal, hari(awal));
  const a1 = baru('A1', 'Intake kebutuhan tes PAPI Kostick dari tim bisnis', MANAGER, awal + HARI);
  const a2 = baru('A2', 'Riset tes kepribadian kerja & pesaing PAPI Kostick', 'andika', awal + 4 * HARI);
  const a6 = baru('A6', 'Target & indikator keberhasilan tes PAPI Kostick', MANAGER, awal + 4 * HARI);
  const d2 = baru('D2', 'Blueprint instrumen PAPI Kostick (90 pasang pernyataan, 20 aspek, norma skor)', 'andika', sekarang + HARI);
  const d4 = baru('D4', 'Rancangan sistem penilaian & laporan PAPI Kostick', 'ali', awal + 7 * HARI);
  const dv1 = baru('DV1', 'Produksi butir PAPI Kostick (90 pasang pernyataan)', 'andika', sekarang + 6 * HARI);
  const dv7 = baru('DV7', 'Prototype tes PAPI Kostick (pengerjaan & skor otomatis)', 'ali', sekarang + 7 * HARI);
  const i5 = baru('I5', 'Uji coba terbatas prototype PAPI Kostick (internal)', 'ali', sekarang + 10 * HARI);
  const e1 = baru('E1', 'QC butir PAPI Kostick', 'andika', sekarang + 9 * HARI);
  const e8 = baru('E8', 'QC akun & sistem penilaian prototype PAPI Kostick', 'ali', sekarang + 12 * HARI);
  const e12 = baru('E12', 'Final approval & penutupan siklus PAPI Kostick', MANAGER, sekarang + 14 * HARI);
  // Analysis: gerbang Manager, riset RAD (pembanding pesaing dibagi ke Uma).
  kerjakan(data, a1, awal + 2 * JAM, awal + 0.8 * HARI);
  const riset = Inti.taskAnak(data, a2, { title: 'Bandingkan tes PAPI Kostick di platform pesaing', pic: 'uma', due: hari(awal + 3 * HARI) }, 'andika', awal + 0.5 * HARI, hari(awal));
  kerjakan(data, riset, awal + 0.6 * HARI, awal + 2.5 * HARI);
  setujui(data, riset, awal + 2.8 * HARI);
  kerjakan(data, a6, awal + HARI, awal + 3 * HARI);
  Inti.setKeputusan(data, proj, 'Build', MANAGER, awal + 3 * HARI + JAM);
  kerjakan(data, a2, awal + 0.5 * HARI, awal + 3.5 * HARI);
  setujui(data, a2, awal + 4 * HARI);
  // Design sejajar: DAE tak menunggu riset RAD; blueprint RAD menunggu riset RAD (fase timnya).
  kerjakan(data, d4, awal + 3.2 * HARI, awal + 6.5 * HARI);
  setujui(data, d4, awal + 7 * HARI);
  // Serah-terima: Ali (Lead DAE) memasang prototype menunggu blueprint RAD.
  Inti.aturTunggu(data, dv7, { tunggu: [d2.id] }, 'ali', awal + 7 * HARI + 2 * JAM);
  kerjakan(data, d2, awal + 4.2 * HARI);
  Inti.isiOutput(data, d2, 'Blueprint 90 pasang pernyataan, 20 aspek, dan norma skor per aspek', 'andika', sekarang - 5 * JAM);
  komentar(data, d2, 'ali', 'Begitu blueprint ini diajukan, prototype DV7 langsung saya mulai. Mohon sertakan norma skor per aspek.', sekarang - 3 * JAM);
  return { project: proj, tasks: [a1, a2, a6, d2, d4, dv1, dv7, i5, e1, e8, e12] };
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
      ['Prioritas Oktober', '- Tuntaskan Development batch Latsol TKA\n- Evaluasi siklus 1 OJK\n- Elaborasi UTBK minggu depan']],
    andika: [['Kisi-kisi TKA', 'Bagi DV1 per mapel ke Uma, Tri, Wildan lewat task turunan.\nCek ulang bobot soal sebelum menyetujui.']],
    alya: [['Antrean input & QC', '- Bagi DV8 ke Kiki lewat task turunan begitu soalnya siap\n- QC Web/Android/iOS di tahap Evaluation']],
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
  const papi = skenarioPapi(data, sekarang);
  const utbk = data.packages.find(x => x.id === 'PKG-006');
  if (utbk && !utbk.items.length) beriTarget(utbk, TARGET_CONTOH['PKG-006'], sekarang - 2 * HARI);
  const ruang = ruangSayaContoh(data, sekarang);
  Inti.segarkanTahap(data);
  // Langkah alur di atas dicatat dengan waktu lampau; riwayat harus tetap terbaru di atas.
  data.log.sort((a, b) => b.at - a.at);
  if (data.log.length > 1000) data.log.length = 1000;
  const proyek = [tka, ojk, papi].filter(Boolean).map(x => ({ ...x, semua: data.tasks.filter(t => t.project === x.project.id) }));
  return {
    proyek: proyek.map(x => `${x.project.id} ${x.project.name} (${x.semua.length} task, ${x.semua.filter(t => t.induk).length} di antaranya task turunan)`),
    task: proyek.reduce((n, x) => n + x.semua.length, 0),
    setoran: data.setoran.length,
    ...ruang,
  };
}

module.exports = { tambahDemo, TARGET_CONTOH };
