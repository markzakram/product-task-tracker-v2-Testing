/* =============================================================================
   _v1ke2.js — tarikan v1 (db/dump/*.json di repo v1) → data contoh v2,
   mengikuti alur v2 (lihat public/inti.js).

   Fungsi murni: tidak menyentuh jaringan maupun berkas. Yang memanggilnya
   scripts/impor-v1.js.

   Bentuk alur v2 yang dituju:
   - Task lepas v1 (602 task) → JALUR RUTIN: tanpa tahap ADDIE, tanpa tinjauan.
     Stage v1 (QC, Operasional, …) dibawa sebagai `kategori`.
   - Kolaborasi v1 → PROYEK dengan tahap ADDIE. Proses-prosesnya → task proyek
     yang saling menunggu sesuai urutan. Lead proyek = Lead yang timnya paling
     banyak memegang proses itu.
   - Status v1 → empat status v2. Hold bukan status lagi, melainkan tanda tertahan.

   Semua keputusan pemetaan ada di tabel-tabel di bawah. Ubah tabelnya, cek dengan
   `npm run impor:v1 -- --kering`, lalu impor ulang.

   Yang ikut dibawa selain task: rancangan paket beserta target dan tautannya, dan
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

/* Untuk task PROYEK, fungsi kerja itu dipetakan ke tahap ADDIE + sub-tahap. */
const LCI_SUB = '3.2 Learning Content Implementation';
const TAHAP = {
  'rnd': ['A', 'Market analysis'],
  'data & intelligence': ['V', '3.4 System & Data Development'],
  'develop konten (materi/soal)': ['V', '3.1 Academic Content Development'],
  'manajemen sistem': ['V', LCI_SUB],
  'qc': ['V', LCI_SUB],
  'operasional': ['V', LCI_SUB],
  'kreatif': ['V', '3.3 Content Production'],
  'manajemen guru': ['V', '3.3 Content Production'],
};
const TAHAP_LAIN = ['V', ''];
/* Pengecualian berdasarkan judul — mengisi tahap yang tak punya padanan langsung di
   v1. `di` membatasi aturan ke stage v1 tertentu: "membuat soal liveclass" adalah
   pengembangan konten, bukan pelaksanaan liveclass. */
const TAHAP_KATA = [
  { pola: /report center/i, jadi: ['E', 'Report Center'] },
  { pola: /\bevaluasi\b/i, jadi: ['E', 'Evaluasi efektivitas produk'] },
  { pola: /\briset\b|\bresearch\b/i, jadi: ['A', 'Market analysis'] },
  { pola: /\bkurikulum\b|\bblueprint\b/i, jadi: ['D', 'Academic blueprint'] },
  { pola: /live ?class/i, jadi: ['I', 'Liveclass'], di: ['operasional', 'manajemen guru'] },
];

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

function tahap(stageV1, judul) {
  const s = kecil(stageV1);
  for (const a of TAHAP_KATA) {
    if ((!a.di || a.di.includes(s)) && a.pola.test(judulBersih(judul))) return a.jadi;
  }
  return TAHAP[s] || TAHAP_LAIN;
}

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

/* Lead proyek = Lead yang timnya paling banyak memegang proses kolaborasi itu. */
function leadDari(langkah) {
  const hitung = {};
  for (const s of langkah) {
    const o = Inti.orang(idOrang(s.pic));
    const l = o.peran === 'lead' ? o.id : o.peran === 'staff' && o.lead ? o.lead : null;
    if (l) hitung[l] = (hitung[l] || 0) + 1;
  }
  const urut = Object.entries(hitung).sort((a, b) => b[1] - a[1]);
  return urut.length ? urut[0][0] : MANAGER;
}

/* ---------- Pengubah per jenis ------------------------------------------ */

/* Task lepas v1 → task Jalur Rutin. */
function taskDariV1(t, id, selesaiLog) {
  const st = kecil(t.status);
  const pl = platformV2(t.platform, t.task_name);
  const pic = idOrang(t.pic);
  const dokumen = teks(t.document);
  const [olehMentah, kapanMentah] = teks(t.status_by).split('•').map(x => x.trim());
  const kapan = waktu(kapanMentah);
  const dibuat = waktu(t.created_date);
  const status = STATUS[st] || 'Antre';

  const tinjauan = [];
  if (TINJAUAN[st] && olehMentah && kapan) {
    tinjauan.push({ id: 'r-' + id, by: idOrang(olehMentah), action: TINJAUAN[st][0], note: TINJAUAN[st][1], at: kapan });
  }
  /* Kapan selesai: dari status_by, lalu riwayat aktivitas v1, lalu tenggat, lalu tanggal dibuat. */
  const selesaiAt = status !== 'Selesai' ? 0
    : (kapan || selesaiLog.get(t.task_id) || waktu(t.due_date) || dibuat);

  return {
    id, project: '', lane: 'rutin', kategori: kategori(t.stage),
    title: teks(t.task_name), platform: pl.nilai, stage: '', sub: '',
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
    const [stage, sub] = tahap(s.stage, s.step);
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
  /* Tahap proyek = tahap proses yang sedang berjalan. Kalau semuanya selesai,
     tahap proses terakhir — proyeknya lalu menunggu keputusan Manager untuk maju. */
  const berjalan = tasks.find(t => t.status !== 'Selesai') || tasks[tasks.length - 1];
  const stageProyek = berjalan ? berjalan.stage : 'A';
  /* Task proyek di tahap SEBELUM tahap aktif yang belum selesai tak boleh menahan
     proyek di belakang: ia tetap dikerjakan, tapi tahapnya ikut tahap aktif. */
  const urutanTahap = ['A', 'D', 'V', 'I', 'E'];
  for (const t of tasks) {
    if (t.status !== 'Selesai' && urutanTahap.indexOf(t.stage) < urutanTahap.indexOf(stageProyek)) t.stage = stageProyek;
  }
  const project = {
    id: prj, name: teks(c.title), platform: pl.nilai, stage: stageProyek,
    cycle: 1, decision: 'Build', goal: [teks(c.description), pl.catatan].filter(Boolean).join('\n\n'),
    lead: leadDari(urut),
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
  const dibuang = { ceklisYatim: 0, komentarYatim: 0, logTerpotong: 0, linkTanpaProfil: 0 };
  const idTask = new Map();     // 'TSK-099' → 'PRD-099', 'COL-021#3' → 'PRD-7xx'
  const proyekV1 = new Map();   // 'COL-021' → proyek PRJ-21
  const langkahPertama = new Map();

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
    projects.push(project);
    tasks.push(...milik);
    jumlahLangkah += milik.length;
  }
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
    data: { projects, tasks, packages, dashboards, links, notes: [], log },
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
      dashboard: dashboards.length,
      link: links.length,
      log: log.length,
      dibuang,
    },
  };
}

module.exports = { ubah, platformV2, tahap, kategori, idOrang, waktu, leadDari, LCI_SUB };
