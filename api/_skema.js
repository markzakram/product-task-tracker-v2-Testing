/* =============================================================================
   _skema.js — bentuk tab spreadsheet v2, dan cara baris ↔ objek prototipe.

   Satu tab per koleksi. Baris 1 berisi judul kolom, data mulai baris 2. Judul
   kolom sama dengan nama field di prototipe, jadi pemetaannya terbaca sekilas.

   Larik bersarang di task (subtasks, comments, gateLog, evidence) dipecah ke tab
   sendiri dengan kolom `task`. Larik sederhana (support, deps, components) ditulis
   dipisah koma dalam satu sel.

   Waktu (createdAt, updatedAt, at) disimpan sebagai teks ISO supaya terbaca di
   spreadsheet; di prototipe menjadi milidetik. Semua sel ditulis RAW, jadi tanggal
   "2026-10-07" tetap teks dan tidak diubah Google menjadi angka seri. Angka seri itu
   sumber kerumitan terbesar migrasi v1.
   ========================================================================== */

const TAB = {
  projects: ['id', 'name', 'platform', 'stage', 'cycle', 'decision', 'goal'],
  tasks: ['id', 'project', 'title', 'platform', 'stage', 'sub', 'detail', 'pic', 'support', 'priority',
    'start', 'due', 'status', 'output', 'gate', 'deps', 'issue', 'notes', 'assignedBy', 'cycle',
    'decision', 'createdAt', 'updatedAt'],
  subtasks: ['id', 'task', 'title', 'pic', 'due', 'status'],
  comments: ['id', 'task', 'author', 'text', 'at'],
  gate_log: ['id', 'task', 'by', 'action', 'note', 'at'],
  evidence: ['id', 'task', 'label', 'url'],
  backlog: ['id', 'project', 'platform', 'source', 'finding', 'rec', 'status', 'by', 'at', 'task'],
  packages: ['id', 'platform', 'name', 'type', 'status', 'components', 'note'],
  bookmarks: ['id', 'folder', 'emoji', 'title', 'url'],
  log: ['id', 'type', 'task', 'detail', 'by', 'at'],
};

const DAFTAR = new Set(['support', 'deps', 'components']);
const ANGKA = new Set(['cycle']);
const WAKTU = new Set(['createdAt', 'updatedAt', 'at']);

function keSel(kolom, nilai) {
  if (nilai === undefined || nilai === null) return '';
  if (DAFTAR.has(kolom)) return (Array.isArray(nilai) ? nilai : []).join(', ');
  if (WAKTU.has(kolom)) {
    return typeof nilai === 'number' && Number.isFinite(nilai) && nilai > 0 ? new Date(nilai).toISOString() : '';
  }
  return typeof nilai === 'number' ? nilai : String(nilai);
}

function dariSel(kolom, sel) {
  const s = sel === undefined || sel === null ? '' : String(sel);
  if (DAFTAR.has(kolom)) return s.split(',').map(x => x.trim()).filter(Boolean);
  if (ANGKA.has(kolom)) {
    const n = parseInt(s, 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
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

/* Data prototipe → baris per tab, judul kolom di baris pertama. */
function urai(data) {
  const isi = Object.fromEntries(Object.keys(TAB).map(t => [t, []]));
  for (const p of data.projects || []) isi.projects.push(p);
  for (const t of data.tasks || []) {
    const { subtasks = [], comments = [], gateLog = [], evidence = [], ...inti } = t;
    isi.tasks.push(inti);
    for (const s of subtasks) isi.subtasks.push({ ...s, task: t.id });
    for (const c of comments) isi.comments.push({ ...c, task: t.id });
    for (const g of gateLog) isi.gate_log.push({ ...g, task: t.id });
    for (const e of evidence) isi.evidence.push({ ...e, task: t.id });
  }
  for (const b of data.backlog || []) isi.backlog.push(b);
  for (const p of data.packages || []) isi.packages.push(p);
  for (const f of data.bookmarks || []) {
    for (const l of f.links || []) isi.bookmarks.push({ id: l.id, folder: f.name, emoji: f.emoji || '', title: l.title, url: l.url });
  }
  for (const l of data.log || []) isi.log.push(l);
  return Object.fromEntries(Object.entries(isi).map(([t, daftar]) => [t, [TAB[t], ...daftar.map(o => keBaris(t, o))]]));
}

/* Baris per tab → data prototipe, lengkap dengan larik bersarangnya. */
function rakit(tabs) {
  const kelompok = daftar => {
    const m = new Map();
    for (const r of daftar || []) {
      if (!m.has(r.task)) m.set(r.task, []);
      const { task, ...sisa } = r;
      m.get(task).push(sisa);
    }
    return m;
  };
  const sub = kelompok(tabs.subtasks), kom = kelompok(tabs.comments);
  const gl = kelompok(tabs.gate_log), ev = kelompok(tabs.evidence);

  const tasks = (tabs.tasks || []).map(t => ({
    ...t,
    subtasks: sub.get(t.id) || [],
    comments: kom.get(t.id) || [],
    gateLog: gl.get(t.id) || [],
    evidence: ev.get(t.id) || [],
  }));

  const folder = new Map();
  for (const b of tabs.bookmarks || []) {
    if (!folder.has(b.folder)) folder.set(b.folder, { id: 'f-' + (folder.size + 1), name: b.folder, emoji: b.emoji, links: [] });
    folder.get(b.folder).links.push({ id: b.id, title: b.title, url: b.url });
  }

  return {
    projects: (tabs.projects || []).map(p => ({ ...p, history: [] })),
    tasks,
    backlog: tabs.backlog || [],
    packages: tabs.packages || [],
    bookmarks: [...folder.values()],
    log: tabs.log || [],
  };
}

/* Nomor terbesar per awalan ID, supaya ID baru di prototipe tak bertabrakan. */
function nomorTerbesar(daftar, awalan) {
  let n = 0;
  for (const x of daftar || []) {
    const m = new RegExp('^' + awalan + '-(\\d+)$').exec(String(x.id));
    if (m) n = Math.max(n, Number(m[1]));
  }
  return n;
}

module.exports = { TAB, keBaris, dariBaris, urai, rakit, nomorTerbesar };
