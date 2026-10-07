/* =============================================================================
   _skema.js — bentuk tab spreadsheet v2, dan cara baris ↔ objek aplikasi.

   Satu tab per koleksi. Baris 1 berisi judul kolom, data mulai baris 2. Judul
   kolom sama dengan nama field di aplikasi, jadi pemetaannya terbaca sekilas.

   Larik bersarang dipecah ke tab sendiri dengan kolom induknya:
     task  → subtasks, comments, tinjauan, evidence   (kolom `task`)
     paket → package_items, package_links             (kolom `paket`)
   Setoran (task → target paket) berdiri sendiri di tab `setoran`, karena ia menaut
   dua induk sekaligus.
   Larik sederhana (support, deps) ditulis dipisah koma dalam satu sel.

   Waktu (createdAt, updatedAt, selesaiAt, at) disimpan sebagai teks ISO supaya
   terbaca di spreadsheet; di aplikasi menjadi milidetik. Semua sel ditulis RAW,
   jadi tanggal "2026-10-07" tetap teks dan tidak diubah Google menjadi angka seri.
   Angka seri itu sumber kerumitan terbesar migrasi v1.
   ========================================================================== */

const TAB = {
  projects: ['id', 'name', 'platform', 'stage', 'cycle', 'decision', 'goal', 'lead', 'arsip', 'paket'],
  tasks: ['id', 'project', 'lane', 'kategori', 'title', 'platform', 'stage', 'sub', 'detail', 'pic', 'support',
    'priority', 'start', 'due', 'status', 'tertahan', 'alasanTertahan', 'output', 'deps', 'notes', 'assignedBy',
    'cycle', 'createdAt', 'updatedAt', 'selesaiAt'],
  subtasks: ['id', 'task', 'title', 'pic', 'due', 'done'],
  comments: ['id', 'task', 'author', 'text', 'at'],
  tinjauan: ['id', 'task', 'by', 'action', 'note', 'at'],
  evidence: ['id', 'task', 'label', 'url'],
  packages: ['id', 'platform', 'program', 'namaPaket', 'produkPic', 'dibimbing', 'latsol', 'materi', 'tryout',
    'drilling', 'liveClass', 'catatan', 'mirror', 'marselPic', 'tagline', 'benefit', 'tanggal', 'tujuan',
    'updatedBy', 'updatedAt'],
  package_items: ['id', 'paket', 'urutan', 'kategori', 'grup', 'nama', 'target', 'satuan', 'awal', 'catatan'],
  package_links: ['id', 'paket', 'urutan', 'label', 'url'],
  dashboards: ['id', 'title', 'deskripsi', 'icon', 'url'],
  links: ['id', 'user', 'folder', 'title', 'url'],
  notes: ['id', 'user', 'folder', 'title', 'body', 'updatedAt'],
  setoran: ['id', 'paket', 'item', 'task', 'jumlah', 'tahap', 'batch', 'catatan'],
  log: ['id', 'type', 'task', 'detail', 'by', 'at'],
};
/* Tab yang baru ada sejak versi tertentu. Spreadsheet yang diimpor sebelum itu tetap
   terbaca: tab ini dianggap kosong, bukan galat. Begitu juga sebaliknya — versi lama
   mengabaikan tab dan kolom yang tak dikenalnya — jadi impor ulang tak memutus versi
   yang sedang live. */
const TAB_OPSIONAL = new Set(['setoran']);
/* Tab bentuk lama. Dihapus saat impor ulang supaya tak tertinggal jadi tab yatim. */
const USANG = ['gate_log', 'backlog', 'bookmarks'];

const DAFTAR = new Set(['support', 'deps']);
const ANGKA = new Set(['urutan', 'target', 'awal', 'jumlah']);
const WAKTU = new Set(['createdAt', 'updatedAt', 'selesaiAt', 'at']);
const BENAR = new Set(['tertahan', 'done', 'arsip', 'mirror']);

function keSel(kolom, nilai) {
  if (nilai === undefined || nilai === null) return '';
  if (DAFTAR.has(kolom)) return (Array.isArray(nilai) ? nilai : []).join(', ');
  if (BENAR.has(kolom)) return nilai ? 'ya' : '';
  if (WAKTU.has(kolom)) {
    return typeof nilai === 'number' && Number.isFinite(nilai) && nilai > 0 ? new Date(nilai).toISOString() : '';
  }
  return typeof nilai === 'number' ? nilai : String(nilai);
}

function dariSel(kolom, sel) {
  const s = sel === undefined || sel === null ? '' : String(sel);
  if (DAFTAR.has(kolom)) return s.split(',').map(x => x.trim()).filter(Boolean);
  if (BENAR.has(kolom)) return /^(ya|true|1|x)$/i.test(s.trim());
  if (kolom === 'cycle') {
    const n = parseInt(s, 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }
  if (ANGKA.has(kolom)) {
    const n = Number(s.replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }
  if (WAKTU.has(kolom)) {
    const t = Date.parse(s);
    return Number.isFinite(t) ? t : 0;
  }
  return s;
}

const keBaris = (tab, objek) => TAB[tab].map(k => keSel(k, objek[k]));

/* Dipetakan lewat judul kolom yang tertulis di sheet, bukan urutannya: kolom yang
   digeser orang di spreadsheet tidak membuat isinya tertukar. */
function dariBaris(tab, judul, baris) {
  const o = {};
  for (const k of TAB[tab]) {
    const i = judul.indexOf(k);
    o[k] = dariSel(k, i >= 0 ? baris[i] : '');
  }
  return o;
}

/* Data aplikasi → baris per tab, judul kolom di baris pertama. */
function urai(data) {
  const isi = Object.fromEntries(Object.keys(TAB).map(t => [t, []]));
  for (const p of data.projects || []) isi.projects.push(p);
  for (const t of data.tasks || []) {
    const { subtasks = [], comments = [], tinjauan = [], evidence = [], ...inti } = t;
    isi.tasks.push(inti);
    for (const s of subtasks) isi.subtasks.push({ ...s, task: t.id });
    for (const c of comments) isi.comments.push({ ...c, task: t.id });
    for (const r of tinjauan) isi.tinjauan.push({ ...r, task: t.id });
    for (const e of evidence) isi.evidence.push({ ...e, task: t.id });
  }
  for (const p of data.packages || []) {
    const { items = [], links = [], ...inti } = p;
    isi.packages.push(inti);
    for (const it of items) isi.package_items.push({ ...it, paket: p.id });
    for (const l of links) isi.package_links.push({ ...l, paket: p.id });
  }
  for (const k of ['dashboards', 'links', 'notes', 'setoran', 'log']) for (const x of data[k] || []) isi[k].push(x);
  return Object.fromEntries(Object.entries(isi).map(([t, daftar]) => [t, [TAB[t], ...daftar.map(o => keBaris(t, o))]]));
}

function kelompok(daftar, induk) {
  const m = new Map();
  for (const r of daftar || []) {
    const { [induk]: kunci, ...sisa } = r;
    if (!m.has(kunci)) m.set(kunci, []);
    m.get(kunci).push(sisa);
  }
  return m;
}

/* Baris per tab → data aplikasi, lengkap dengan larik bersarangnya. */
function rakit(tabs) {
  const sub = kelompok(tabs.subtasks, 'task'), kom = kelompok(tabs.comments, 'task');
  const tj = kelompok(tabs.tinjauan, 'task'), ev = kelompok(tabs.evidence, 'task');
  const item = kelompok(tabs.package_items, 'paket'), tautan = kelompok(tabs.package_links, 'paket');
  const urut = daftar => daftar.sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
  return {
    projects: (tabs.projects || []).map(p => ({ ...p, history: [] })),
    tasks: (tabs.tasks || []).map(t => ({
      ...t,
      subtasks: sub.get(t.id) || [],
      comments: kom.get(t.id) || [],
      tinjauan: tj.get(t.id) || [],
      evidence: ev.get(t.id) || [],
    })),
    packages: (tabs.packages || []).map(p => ({ ...p, items: urut(item.get(p.id) || []), links: urut(tautan.get(p.id) || []) })),
    dashboards: tabs.dashboards || [],
    links: tabs.links || [],
    notes: tabs.notes || [],
    setoran: tabs.setoran || [],
    log: tabs.log || [],
  };
}

/* Nomor terbesar per awalan ID, supaya ID baru di aplikasi tak bertabrakan. */
function nomorTerbesar(daftar, awalan) {
  let n = 0;
  for (const x of daftar || []) {
    const m = new RegExp('^' + awalan + '-(\\d+)$').exec(String(x.id));
    if (m) n = Math.max(n, Number(m[1]));
  }
  return n;
}

module.exports = { TAB, TAB_OPSIONAL, USANG, keBaris, dariBaris, urai, rakit, nomorTerbesar };
