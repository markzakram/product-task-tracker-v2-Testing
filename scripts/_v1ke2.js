/* =============================================================================
   _v1ke2.js — tarikan v1 (db/dump/*.json di repo v1) → data contoh v2,
   mengikuti alur v2 (lihat public/inti.js).

   Fungsi murni: tidak menyentuh jaringan maupun berkas. Yang memanggilnya
   scripts/impor-v1.js.

   Bentuk alur v2 yang dituju (selaras PRD v3):
   - Setiap task diberi SUB-STAGE berkode (DV1, E4, R2, …) dari kata kunci judul, lalu
     stage v1 sebagai cadangan — langkah migrasi 2 di PRD. QC masuk Evaluation (E1–E7).
   - Task v1 tanpa kolaborasi (602 task) tetap di luar proyek, tanpa tinjauan: yang
     berupa pekerjaan berulang jadi JALUR RUTIN (R1–R4), sisanya "lepas" — pekerjaan
     produk di luar proyek, menunggu ditautkan Lead (PRD langkah 3 & 5).
   - Kolaborasi v1 → PROYEK. Proses-prosesnya → task proyek yang saling menunggu sesuai
     urutan; tahap tiap task ikut kodenya. Proyek tanpa Lead tetap; tahapnya dihitung
     dari task terbuka paling awal.
   - Status v1 → empat status v2. Hold bukan status lagi, melainkan tanda tertahan.

   Semua keputusan pemetaan ada di tabel-tabel di bawah. Ubah tabelnya, cek dengan
   `npm run impor:v1 -- --kering`, lalu impor ulang.

   Yang ikut dibawa selain task: rancangan paket beserta target dan tautannya,
   tautan kolaborasi → paket (jadi proyek.paket), setoran (package_contribs), dan
   Dashboard Lain. Link Saya (user_links) dipetakan bila diberikan, tapi impor-v1.js
   hanya memberikannya dengan --dengan-link: di v1 link itu terlindung PIN pribadi.

   Yang SENGAJA tidak dibawa dari v1:
     auth_pins       hash PIN — kredensial tak pernah dijadikan data contoh
     user_notes      catatan pribadi; Catatan Saya di v2 mulai kosong
     notifications   kotak masuk pribadi
     users, options  v2 memakai organogram di public/inti.js
   ========================================================================== */

const Inti = require('../public/inti');

const MANAGER = Inti.MANAGER;
const BATAS_LOG = 1000;   // sama dengan batas riwayat yang disimpan aplikasi
const ORANG_V2 = new Set(Inti.ORANG.map(o => o.id));

/* Platform v1 → nama platform v2. */
const PLATFORM = {
  'jadiasn': 'ASN', 'jadisekdin': 'Sekdin', 'jago tpa': 'TPA', 'jadipppk': 'PPPK', 'jadippg': 'PPG',
  'jadibumn': 'BUMN', 'jadiojk': 'OJK', 'jadipcpm': 'PCPM', 'psikotes kerja': 'Psikotes Kerja',
  'cerebrum': 'Cerebrum', 'jadipolisi': 'Polisi', 'jadiprajurit': 'Prajurit', 'toefl academy': 'TOEFL',
  'jadibeasiswa': 'Beasiswa',
};
/* Sistem dan divisi, bukan platform produk. Kalau bersanding dengan platform produk,
   platform produknya yang dipakai; kalau sendirian, jadi All Platform. */
const BUKAN_PRODUK = new Set(['all platform', 'markaz', 'siadu', 'marketing', 'sales']);
/* Platform yang kosong ditebak dari judul. Yang pertama cocok dipakai. */
const TEBAK_PLATFORM = [
  [/\bpcpm\b/i, 'PCPM'], [/\b(bumn|kai)\b/i, 'BUMN'], [/\bojk\b/i, 'OJK'], [/psikotes kerja/i, 'Psikotes Kerja'],
  [/\b(ipdn|stan|sekdin|kedinasan)\b/i, 'Sekdin'], [/\bpppk\b/i, 'PPPK'], [/\bppg\b/i, 'PPG'],
  [/\b(skd|cpns|asn)\b/i, 'ASN'], [/\btoefl\b/i, 'TOEFL'], [/\btpa\b/i, 'TPA'],
  [/\b(sipss|polisi|polri)\b/i, 'Polisi'], [/\b(prajurit|tni|papk)\b/i, 'Prajurit'],
  [/\b(cerebrum|tka|snbt|utbk)\b/i, 'Cerebrum'], [/\bbeasiswa\b/i, 'Beasiswa'],
];

/* Stage v1 adalah fungsi kerja. Di v2 ia menjadi kategori task. */
const KATEGORI = {
  'rnd': 'RnD', 'data & intelligence': 'Data & Intelligence', 'develop konten (materi/soal)': 'Develop Konten',
  'manajemen sistem': 'Manajemen Sistem', 'qc': 'QC', 'operasional': 'Operasional', 'kreatif': 'Kreatif',
  'manajemen guru': 'Manajemen Guru',
};

/* Sub-stage dari judul (PRD v3). Aturan pertama yang cocok dipakai, jadi yang lebih khusus
   ditaruh lebih dulu: "Membuat 12 soal liveclass" adalah produksi soal (DV1), bukan
   pelaksanaan liveclass (I7); "Mengedit video live class" adalah editing (DV5). Nilai
   fungsi = pilihan bergantung isi judul. Ubah tabel ini lalu cek dengan --kering. */
const SUB_KATA = [
  [/rekap.*fee|fee guru|honor/i, 'R1'],
  [/ppt.*report|report center|laporan report/i, 'E10'],
  [/menyelesaikan \d* ?report|\d+ report/i, 'R4'],
  [/show ?\/? ?hide|untuk di ?show|tampilkan/i, 'I4'],
  [/qc .*(android|andro)|qc (android|andro)/i, 'E6'],
  [/qc .*ios|qc ios/i, 'E7'],
  [/qc .*web|qc web/i, 'E5'],
  [/qc .*video/i, 'E3'],
  [/qc .*(materi|modul|booklet)/i, 'E2'],
  [/qc (\d+ )?soal/i, 'E1'],
  [/qc ops|qc otomatis|qc .*(siadu|tryout|latsol|paket|apk|jadi)/i, 'E4'],
  [/qc|evaluasi soal|cek soal/i, 'E1'],
  [/sistem penilaian|konversi/i, 'E8'],
  [/scrap/i, 'A3'],
  [/riset|research|kompetitor/i, 'A2'],
  // Menyusun struktur course di SIADU (category/lesson/chapter) adalah setup, walau menyebut "mapping".
  [/^(?!.*(migrat|thumbnail|icon)).*\b(menyusun|mengatur|setup)\b.*\b(category|kategori|lesson|chapter|course)\b/i, 'I2'],
  [/kurikulum|mapping|kisi|prediksi materi/i, 'A4'],
  [/komparasi|analisis/i, 'A3'],
  [/blueprint|prompt produksi/i, 'D2'],
  [/journey|dibimbing/i, j => (/rancang|susun/i.test(j) ? 'D5' : 'I3')],
  [/rancang/i, 'D1'],
  [/\bsop\b|panduan|briefing|template(?! ppt)/i, 'D6'],
  [/(susun|rancang|menyusun).*(paket|tryout|\bto\b)|perencanaan paket/i, 'D7'],
  // "Membuat sistem generate …" adalah membangun alatnya (DV6), bukan menjalankan generate (I1).
  [/\b(membuat|membangun|bangun) sistem\b/i, 'DV6'],
  [/generat.*(pdf|paket|latsol|tryout|\bto\b)/i, 'I1'],
  [/generate.*soal|generat.*\d+ soal|ai produksi soal/i, 'DV2'],
  [/generat/i, 'I1'],
  [/prototype|prototipe/i, 'DV7'],
  [/deploy/i, 'I5'],
  [/dashboard|sistem|plugin|pluggin|fitur|automasi|\bcode\b|bangun/i, 'DV6'],
  [/syuting|shooting|take video|rekam/i, 'DV4'],
  [/edit|thumbnail|icon|bumper|desain|canva|template ppt/i, 'DV5'],
  [/option legacy|migrat|perbaik|memperbarui|merapikan|calibrate/i, 'DV9'],
  [/input|menginput|upload|copas/i, 'DV8'],
  [/setup|kategori baru|buat kategori|chapter|course/i, 'I2'],
  [/distribusi|mendistribusikan|broadcast|brodcast|\bbc\b|cari guru|matching|mentor/i, 'I6'],
  [/script|naskah/i, 'D3'],
  [/soal|develop|pembahasan|\d+ paket/i, 'DV1'],
  [/live ?class|liveclass|jadwal/i, 'I7'],
  [/monitor/i, 'E9'],
  [/evaluasi|laporan/i, 'E10'],
  [/materi|modul|rangkuman|pdf|booklet|product knowledge|bacaan/i, 'DV3'],
];
/* Cadangan per stage v1 bila judul tak cocok dengan aturan mana pun. */
const SUB_STAGE_V1 = {
  'qc': 'E4', 'operasional': 'DV8', 'develop konten (materi/soal)': 'DV1', 'manajemen sistem': 'I1',
  'kreatif': 'DV5', 'manajemen guru': 'I6', 'data & intelligence': 'DV6', 'rnd': 'A2',
};
/* Kode yang di luar proyek berarti pekerjaan berulang (PRD R1–R4), dan kebalikannya untuk
   task proyek yang tak boleh berkode rutin. */
const KE_RUTIN = { I4: 'R3', DV9: 'R4', E10: 'R2', E11: 'R4' };
const KE_PROYEK = { R1: 'I6', R2: 'E10', R3: 'I4', R4: 'DV9' };

/* Status v1 → v2. Hold menjadi Antre + tanda tertahan; Revisi menjadi Dikerjakan
   (dengan catatan "Dikembalikan" di riwayat tinjauan bila tercatat siapa). */
const STATUS = { 'done': 'Selesai', 'in progress': 'Dikerjakan', 'todo': 'Antre', 'hold': 'Antre', 'review pm': 'Ditinjau', 'revisi': 'Dikerjakan' };
const TINJAUAN = { 'done': ['Disetujui', 'Ditandai selesai di v1'], 'review pm': ['Diajukan', 'Diajukan ke Review PM di v1'], 'revisi': ['Dikembalikan', 'Dikembalikan untuk revisi di v1'] };
const PRIORITAS = { 'urgent': 'Urgent', 'high': 'High', 'normal': 'Normal', 'low': 'Low' };

const LOG_JENIS = {
  'create task': 'create', 'collab create': 'create',
  'delete task': 'delete', 'collab delete': 'delete',
  'comment': 'comment',
  'user add': 'system', 'user update': 'system', 'user delete': 'system', 'user rename': 'system',
};
const LOG_AWALAN = {
  'checklist add': 'Sub-task ditambah', 'checklist delete': 'Sub-task dihapus', 'checklist copy': 'Sub-task disalin',
  'checklist link': 'Tautan sub-task', 'collab step done': 'Langkah selesai', 'collab step undone': 'Langkah dibatalkan',
  'user add': 'Pengguna ditambah', 'user update': 'Pengguna diubah', 'user delete': 'Pengguna dihapus', 'user rename': 'Pengguna diganti nama',
};

/* ---------- Pembantu --------------------------------------------------- */

const kecil = s => String(s == null ? '' : s).trim().toLowerCase();
const teks = s => String(s == null ? '' : s).trim();
const pad = n => String(n).padStart(3, '0');
const nomor = id => { const m = /-(\d+)/.exec(String(id)); return m ? Number(m[1]) : 0; };
const tautanSah = u => /^https?:\/\/\S+$/i.test(teks(u));
/* "PT.KAI_BUMN" → "PT KAI BUMN". Garis bawah termasuk karakter kata bagi regex, jadi
   tanpa ini \bkai\b tak pernah cocok di nama paket dan proyek v1. */
const judulBersih = s => teks(s).replace(/[_.]+/g, ' ');
/* Kata sandi yang terlanjur ditulis di deskripsi v1 ("Pass : …") tidak ikut ke v2:
   data contoh dibuka siapa pun yang tahu PIN bersama. */
const SANDI = /\b(pass(?:word)?|pwd|sandi|kata sandi|pin)(\s*[:=]\s*)\S+/gi;
const sensor = s => teks(s).replace(SANDI, '$1$2•••• (disembunyikan saat impor)');

/* Stempel v1 tertulis dalam WIB tanpa zona: "2026-08-31 15:01:49". */
function waktu(s) {
  const m = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(teks(s));
  if (!m) return 0;
  const jam = m[2] ? `${m[2]}:${m[3]}:${m[4] || '00'}` : '08:00:00';
  const t = Date.parse(`${m[1]}T${jam}+07:00`);
  return Number.isFinite(t) ? t : 0;
}
const tanggal = s => { const m = /^\d{4}-\d{2}-\d{2}/.exec(teks(s)); return m ? m[0] : ''; };

function idOrang(nama) {
  const bersih = teks(nama).replace(/\(.*?\)/g, '').trim();
  if (!bersih) return '';
  return ORANG_V2.has(bersih.toLowerCase()) ? bersih.toLowerCase() : bersih;
}
const daftarOrang = s => [...new Set(teks(s).split(',').map(idOrang).filter(Boolean))];

function labelTautan(url) {
  const u = teks(url);
  if (/docs\.google\.com\/spreadsheets/i.test(u)) return 'Google Sheets';
  if (/docs\.google\.com\/document/i.test(u)) return 'Google Docs';
  if (/docs\.google\.com\/presentation/i.test(u)) return 'Google Slides';
  if (/drive\.google\.com/i.test(u)) return 'Google Drive';
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return 'Tautan'; }
}

function platformV2(mentah, judul) {
  const bagian = teks(mentah).split(',').map(x => x.trim()).filter(Boolean);
  const produk = [...new Set(bagian.filter(b => !BUKAN_PRODUK.has(kecil(b))).map(b => PLATFORM[kecil(b)] || b))];
  if (produk.length === 1) return { nilai: produk[0], catatan: '' };
  if (produk.length > 1) return { nilai: 'All Platform', catatan: `Platform di v1: ${bagian.join(', ')}` };
  if (bagian.length) return { nilai: 'All Platform', catatan: '' };
  const tebak = TEBAK_PLATFORM.find(([pola]) => pola.test(judulBersih(judul)));
  return { nilai: tebak ? tebak[1] : 'All Platform', catatan: '' };
}

/* Kode sub-stage untuk satu task v1. '' = belum dipetakan (PRD: dipetakan manual oleh Lead). */
function subDariV1(stageV1, judul, proyek) {
  const j = judulBersih(judul);
  let kode = '';
  for (const [pola, jadi] of SUB_KATA) {
    if (pola.test(j)) { kode = typeof jadi === 'function' ? jadi(j) : jadi; break; }
  }
  if (!kode) kode = SUB_STAGE_V1[kecil(stageV1)] || '';
  return (proyek ? KE_PROYEK : KE_RUTIN)[kode] || kode;
}
/* Tahap ADDIE dari kode; '' untuk kode rutin atau yang belum dipetakan. */
const tahapKode = kode => { const t = Inti.tahapDariKode(kode); return t === 'R' ? '' : t; };

const kategori = stageV1 => KATEGORI[kecil(stageV1)] || 'Umum';

function kelompok(daftar, kunci) {
  const m = new Map();
  for (const x of daftar || []) {
    const k = kunci(x);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  }
  return m;
}

/* ---------- Pengubah per jenis ------------------------------------------ */

/* Task v1 tanpa kolaborasi → task di luar proyek: rutin (R1–R4) atau lepas (kode ADDIE). */
function taskDariV1(t, id, selesaiLog) {
  const st = kecil(t.status);
  const pl = platformV2(t.platform, t.task_name);
  const pic = idOrang(t.pic);
  const dokumen = teks(t.document);
  const [olehMentah, kapanMentah] = teks(t.status_by).split('•').map(x => x.trim());
  const kapan = waktu(kapanMentah);
  const dibuat = waktu(t.created_date);
  const status = STATUS[st] || 'Antre';
  const sub = subDariV1(t.stage, t.task_name, false);

  const tinjauan = [];
  if (TINJAUAN[st] && olehMentah && kapan) {
    tinjauan.push({ id: 'r-' + id, by: idOrang(olehMentah), action: TINJAUAN[st][0], note: TINJAUAN[st][1], at: kapan });
  }
  /* Kapan selesai: dari status_by, lalu riwayat aktivitas v1, lalu tenggat, lalu tanggal dibuat. */
  const selesaiAt = status !== 'Selesai' ? 0
    : (kapan || selesaiLog.get(t.task_id) || waktu(t.due_date) || dibuat);

  return {
    id, project: '', lane: 'rutin', kategori: kategori(t.stage),
    title: teks(t.task_name), platform: pl.nilai, stage: tahapKode(sub), sub,
    detail: [teks(t.detail), pl.catatan, dokumen && !tautanSah(dokumen) ? `Dokumen: ${dokumen}` : ''].filter(Boolean).join('\n\n'),
    pic, support: daftarOrang(t.support).filter(x => x !== pic),
    priority: PRIORITAS[kecil(t.kesulitan)] || 'Normal',
    start: tanggal(t.created_date), due: tanggal(t.due_date),
    status, tertahan: st === 'hold', alasanTertahan: st === 'hold' ? 'Ditahan (Hold) di v1' : '',
    output: [teks(t.jumlah), teks(t.objek)].filter(Boolean).join(' '),
    deps: [],
    notes: [teks(t.pic_notes), teks(t.pm_notes) && `Catatan PM: ${teks(t.pm_notes)}`].filter(Boolean).join('\n\n'),
    assignedBy: idOrang(t.dibuat_oleh) || MANAGER, cycle: 1,
    createdAt: dibuat, updatedAt: kapan || selesaiAt || dibuat, selesaiAt,
    subtasks: [], comments: [], tinjauan,
    evidence: tautanSah(dokumen) ? [{ id: 'e-' + id, label: labelTautan(dokumen), url: dokumen }] : [],
  };
}

/* Kolaborasi v1 → proyek. Prosesnya yang beruntun → task yang saling menunggu:
   proses N menunggu proses N-1, persis aturan dependency di v2. */
function proyekDariV1(c, langkah, idBaru, idTask) {
  const prj = 'PRJ-' + nomor(c.collab_id);
  const pl = platformV2(c.platform, c.title);
  const dibuat = waktu(c.created_at);
  const urut = [...langkah].sort((a, b) => Number(a.urutan) - Number(b.urutan));
  const tasks = [];
  let sebelumnya = '';
  let adaAktif = false;
  for (const s of urut) {
    const id = idBaru();
    idTask.set(`${c.collab_id}#${s.urutan}`, id);
    const sub = subDariV1(s.stage, s.step, true);
    const stage = tahapKode(sub) || 'V';
    const beres = Number(s.done) === 1;
    let status;
    if (beres) status = 'Selesai';
    else if (!adaAktif) { status = 'Dikerjakan'; adaAktif = true; }
    else status = 'Antre';
    const oleh = idOrang(s.done_by);
    const kapan = waktu(s.done_at);
    tasks.push({
      id, project: prj, lane: 'proyek', kategori: kategori(s.stage),
      title: teks(s.step) || `Langkah ${s.urutan}`, platform: pl.nilai, stage, sub,
      detail: `Langkah ${s.urutan} dari kolaborasi v1 ${c.collab_id}.`,
      pic: idOrang(s.pic), support: [], priority: 'Normal',
      start: tanggal(c.created_at), due: tanggal(s.deadline),
      status, tertahan: false, alasanTertahan: '', output: '', deps: sebelumnya ? [sebelumnya] : [],
      notes: teks(s.note), assignedBy: idOrang(c.created_by) || MANAGER, cycle: 1,
      createdAt: dibuat, updatedAt: kapan || dibuat, selesaiAt: beres ? (kapan || dibuat) : 0,
      subtasks: [], comments: [],
      tinjauan: beres && oleh && kapan ? [{ id: 'r-' + id, by: oleh, action: 'Disetujui', note: 'Langkah dicentang selesai di v1', at: kapan }] : [],
      evidence: tautanSah(s.link) ? [{ id: 'e-' + id, label: labelTautan(s.link), url: teks(s.link) }] : [],
    });
    sebelumnya = id;
  }
  /* Tahap proyek dihitung inti.js dari task terbuka paling awal (lihat ubah()); proyek
     tanpa Lead tetap — tanggung jawabnya mengikuti tim pemilik sub-stage tiap prosesnya. */
  const project = {
    id: prj, name: teks(c.title), platform: pl.nilai, stage: 'A',
    cycle: 1, decision: 'Build', goal: [teks(c.description), pl.catatan].filter(Boolean).join('\n\n'),
    lead: '',
    paket: '',   // diisi sesudah paket dipetakan (kolom paket_id kolaborasi)
    // Kolaborasi v1 yang tuntas = proyek selesai: masuk arsip, bukan antrean keputusan.
    arsip: tasks.length > 0 && tasks.every(t => t.status === 'Selesai'),
  };
  return { project, tasks };
}

/* Rancangan paket v1 dibawa utuh, termasuk target per komponen (package_items).
   Area marketing (tagline, benefit, tanggal, tujuan) ikut disimpan walau tak
   ditampilkan — sama dengan v1 — supaya datanya tak hilang. */
function paketDariV1(p, items, links) {
  const nama = teks(p.nama_paket) || teks(p.program) || p.paket_id;
  const angka = v => { const n = Number(String(v == null ? '' : v).replace(',', '.')); return Number.isFinite(n) ? n : 0; };
  return {
    id: p.paket_id, platform: platformV2(p.platform, nama).nilai,
    program: teks(p.program), namaPaket: teks(p.nama_paket), produkPic: idOrang(p.produk_pic),
    dibimbing: teks(p.dibimbing), latsol: teks(p.latsol), materi: teks(p.materi), tryout: teks(p.tryout),
    drilling: teks(p.drilling), liveClass: teks(p.live_class), catatan: teks(p.catatan),
    mirror: Number(p.mirror) === 1 || /^(true|ya)$/i.test(teks(p.mirror)),
    marselPic: idOrang(p.marsel_pic), tagline: teks(p.tagline), benefit: teks(p.benefit), tanggal: tanggal(p.tanggal), tujuan: teks(p.tujuan),
    daftarBuka: '', daftarTutup: '',
    updatedBy: idOrang(p.updated_by), updatedAt: waktu(p.updated_at),
    items: items.map(i => ({
      id: teks(i.item_id) || 'i' + i.__baris, urutan: angka(i.urutan), kategori: teks(i.kategori), grup: teks(i.grup),
      nama: teks(i.nama), target: angka(i.target), satuan: teks(i.satuan) || 'Paket', awal: angka(i.awal), catatan: teks(i.catatan),
    })).sort((a, b) => a.urutan - b.urutan),
    links: links.filter(l => tautanSah(l.url)).map(l => ({ id: 'pl' + l.__baris, urutan: angka(l.urutan), label: teks(l.label) || labelTautan(l.url), url: teks(l.url) })),
  };
}

/* ---------- Utama ------------------------------------------------------- */

function ubah(d) {
  const dibuang = { ceklisYatim: 0, komentarYatim: 0, logTerpotong: 0, linkTanpaProfil: 0, setoranYatim: 0 };
  const idTask = new Map();     // 'TSK-099' → 'PRD-099', 'COL-021#3' → 'PRD-7xx'
  const proyekV1 = new Map();   // 'COL-021' → proyek PRJ-21
  const langkahPertama = new Map();
  const langkahTerakhir = new Map();

  // Waktu selesai yang tercatat di riwayat aktivitas v1, per task.
  const selesaiLog = new Map();
  for (const a of d.activity_log || []) {
    if (kecil(a.status_baru) !== 'done') continue;
    const w = waktu(a.terjadi_at);
    if (w > (selesaiLog.get(a.task_id) || 0)) selesaiLog.set(a.task_id, w);
  }

  // 1) Task v1 → Jalur Rutin. Nomornya dipertahankan: TSK-099 di v1 = PRD-099 di v2.
  const tasks = [];
  for (const t of d.tasks || []) {
    const id = 'PRD-' + pad(nomor(t.task_id));
    idTask.set(t.task_id, id);
    tasks.push(taskDariV1(t, id, selesaiLog));
  }

  // 2) Kolaborasi → proyek. Prosesnya diberi nomor sesudah nomor task v1 terbesar.
  let berikut = Math.max(0, ...(d.tasks || []).map(t => nomor(t.task_id)));
  const idBaru = () => 'PRD-' + pad(++berikut);
  const langkahPer = kelompok(d.collab_steps, s => s.collab_id);
  const projects = [];
  let jumlahLangkah = 0;
  for (const c of d.collabs || []) {
    const { project, tasks: milik } = proyekDariV1(c, langkahPer.get(c.collab_id) || [], idBaru, idTask);
    proyekV1.set(c.collab_id, project);
    if (milik.length) langkahPertama.set(c.collab_id, milik[0].id);
    if (milik.length) langkahTerakhir.set(c.collab_id, milik[milik.length - 1].id);
    projects.push(project);
    tasks.push(...milik);
    jumlahLangkah += milik.length;
  }
  Inti.segarkanTahap({ projects, tasks, log: [] });
  const perId = new Map(tasks.map(t => [t.id, t]));

  // 3) Ceklis → sub-task. Ceklis milik proses kolaborasi ("COL-021#3") ikut ke task prosesnya.
  for (const c of d.checklists || []) {
    const t = perId.get(idTask.get(c.task_id));
    if (!t) { dibuang.ceklisYatim++; continue; }
    const beres = Number(c.done) === 1;
    t.subtasks.push({ id: 's' + c.__baris, title: teks(c.item), pic: (beres && idOrang(c.checked_by)) || t.pic, due: '', done: beres });
    if (tautanSah(c.link)) t.evidence.push({ id: 'e' + c.__baris, label: teks(c.item).slice(0, 60) || labelTautan(c.link), url: teks(c.link) });
  }

  // 4) Komentar. v2 tak punya utas tingkat proyek, jadi diskusi kolaborasi
  //    ditampung di proses pertamanya.
  for (const k of d.comments || []) {
    const t = perId.get(idTask.get(k.task_id) || langkahPertama.get(k.task_id));
    if (!t) { dibuang.komentarYatim++; continue; }
    t.comments.push({ id: 'k' + k.__baris, author: idOrang(k.author), text: teks(k.message), at: waktu(k.dibuat_at) });
  }
  for (const t of tasks) t.comments.sort((a, b) => a.at - b.at);

  // 5) Rancangan paket (dengan target & tautannya), Dashboard Lain, Link Saya.
  const itemPer = kelompok(d.package_items, i => i.paket_id);
  const tautanPer = kelompok(d.package_links, l => l.paket_id);
  const packages = (d.packages || []).map(p => paketDariV1(p, itemPer.get(p.paket_id) || [], tautanPer.get(p.paket_id) || []));

  /* Kolaborasi v1 yang tertaut paket (kolom paket_id) → proyek bertaut paket. Kolom itu
     sempat diisi hal lain (nama stage) sebelum jadi Paket ID, jadi hanya ID paket yang
     benar-benar ada yang dipakai. */
  const adaPaket = new Set(packages.map(p => p.id));
  for (const c of d.collabs || []) {
    const pid = teks(c.paket_id);
    const proj = proyekV1.get(c.collab_id);
    if (proj && adaPaket.has(pid)) proj.paket = pid;
  }
  /* Setoran v1 (PACKAGE_CONTRIB): proses kolaborasi → target paket. Nomor proses 0 berarti
     "dihitung saat seluruh kolaborasi selesai" → disetorkan oleh proses terakhirnya, yang
     di v2 memang menunggu semua proses sebelumnya. */
  const itemAda = new Set(packages.flatMap(p => p.items.map(i => `${p.id}|${i.id}`)));
  const setoran = [];
  for (const k of d.package_contribs || []) {
    const paket = teks(k.paket_id), item = teks(k.item_id), cid = teks(k.collab_id);
    const urutan = Number(k.step_order) || 0;
    const task = urutan ? idTask.get(`${cid}#${urutan}`) : langkahTerakhir.get(cid);
    if (!task || !itemAda.has(`${paket}|${item}`)) { dibuang.setoranYatim++; continue; }
    setoran.push({ id: 'st' + k.__baris, paket, item, task, jumlah: Number(k.jumlah) || 0, catatan: teks(k.catatan) });
  }

  const dashboards = (d.dashboards || []).filter(x => tautanSah(x.url))
    .map(x => ({ id: 'd' + x.__baris, title: sensor(x.title), deskripsi: sensor(x.deskripsi), icon: teks(x.icon), url: teks(x.url) }));
  /* Link Saya hanya untuk orang yang punya profil di v2; selain itu tak ada yang bisa melihatnya. */
  const links = [];
  for (const l of d.user_links || []) {
    const user = idOrang(l.user_nama);
    if (!tautanSah(l.url)) continue;
    if (!ORANG_V2.has(user)) { dibuang.linkTanpaProfil++; continue; }
    links.push({ id: 'u' + l.__baris, user, folder: teks(l.folder), title: sensor(l.title) || labelTautan(l.url), url: teks(l.url) });
  }

  // 6) Riwayat aktivitas: yang terbaru saja, sebanyak yang disimpan aplikasi.
  const label = idV1 => {
    if (!idV1) return 'Sistem';
    const t = perId.get(idTask.get(idV1));
    if (t) return `${t.id} · ${t.title}`;
    const p = proyekV1.get(idV1);
    if (p) return `${p.id} · ${p.name}`;
    const tsk = /^TSK-(\d+)$/.exec(idV1);
    if (tsk) return `PRD-${pad(Number(tsk[1]))} (sudah dihapus di v1)`;
    const col = /^COL-(\d+)(#\d+)?$/.exec(idV1);
    if (col) return `PRJ-${Number(col[1])}${col[2] || ''} (sudah dihapus di v1)`;
    return idV1;
  };
  const aktivitas = [...(d.activity_log || [])].sort((a, b) => waktu(b.terjadi_at) - waktu(a.terjadi_at));
  dibuang.logTerpotong = Math.max(0, aktivitas.length - BATAS_LOG);
  const log = aktivitas.slice(0, BATAS_LOG).map(a => {
    const aksi = kecil(a.action);
    const status = teks(a.status_lama) || teks(a.status_baru) ? `Status: ${teks(a.status_lama) || '—'} → ${teks(a.status_baru) || '—'}` : '';
    return {
      id: 'l' + a.__baris,
      type: LOG_JENIS[aksi] || 'update',
      task: aksi.startsWith('user ') ? 'Pengguna' : label(teks(a.task_id)),
      detail: [LOG_AWALAN[aksi], teks(a.detail), status].filter(Boolean).join(': ').replace(/: (Status:)/, ' · $1'),
      by: idOrang(a.user_nama),
      at: waktu(a.terjadi_at),
    };
  });

  const hitung = kunci => tasks.reduce((n, t) => n + t[kunci].length, 0);
  const aktif = tasks.filter(t => t.status !== 'Selesai');
  return {
    data: { projects, tasks, packages, setoran, dashboards, links, notes: [], log },
    ringkasan: {
      taskV1: (d.tasks || []).length,
      langkahJadiTask: jumlahLangkah,
      proyek: projects.length,
      proyekArsip: projects.filter(p => p.arsip).length,
      task: tasks.length,
      aktif: aktif.length,
      tertahan: aktif.filter(t => t.tertahan).length,
      subtask: hitung('subtasks'),
      komentar: hitung('comments'),
      tinjauan: hitung('tinjauan'),
      evidence: hitung('evidence'),
      paket: packages.length,
      targetPaket: packages.reduce((n, p) => n + p.items.length, 0),
      proyekPaket: projects.filter(p => p.paket).length,
      belumDipetakan: tasks.filter(t => !t.sub).length,
      rutin: tasks.filter(t => Inti.jenisJalur(t) === 'rutin').length,
      lepas: tasks.filter(t => Inti.jenisJalur(t) === 'lepas').length,
      setoran: setoran.length,
      dashboard: dashboards.length,
      link: links.length,
      log: log.length,
      dibuang,
    },
  };
}

module.exports = { ubah, platformV2, subDariV1, kategori, idOrang, waktu };
