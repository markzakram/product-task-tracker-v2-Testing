/* =============================================================================
   scripts/impor-v1.js — data v1 → data contoh di spreadsheet v2.

     npm run impor:v1                     tarikan v1 di ../task-tracker-vercel/db/dump
     npm run impor:v1 -- <folder>         tarikan di folder lain
     npm run impor:v1 -- --kering         petakan dan tampilkan ringkasan saja, tanpa menulis
     npm run impor:v1 -- --dengan-link    ikut membawa Link Saya tiap orang dari v1
     npm run impor:v1 -- --demo           tambah skenario contoh rancangan paket → proyek
                                          (lihat scripts/_demo.js)

   Link Saya di v1 hanya terlihat oleh pemiliknya (PIN per orang). Di v2 PIN-nya
   bersama dan profil dipilih sendiri, jadi siapa pun yang memegang PIN bisa membuka
   Link Saya orang lain. Karena itu bawaannya TIDAK dibawa; --dengan-link hanya
   dipakai kalau pemilik link-nya setuju.

   Sumbernya BERKAS, bukan spreadsheet v1. Tarikannya dibuat di repo v1 dengan
   `node scripts/migrasi/tarik.js` (baca-saja, kredensial v1). Skrip ini tak pernah
   memegang kredensial v1, dan service account v2 memang tak punya akses ke sheet
   v1: kedua sisi hanya bertemu lewat berkas JSON di disk.

   Setiap kali dijalankan, SEMUA tab data contoh ditulis ulang. Suntingan yang dibuat
   orang langsung di tab-tab itu ikut hilang.
   ========================================================================== */

const fs = require('fs');
const path = require('path');
const { muatEnv } = require('./_env');
const { ubah } = require('./_v1ke2');
const { tambahDemo } = require('./_demo');
const { urai } = require('../api/_skema');
const sheet = require('../api/_sheets');

const AKAR = path.join(__dirname, '..');
muatEnv(path.join(AKAR, '.env'));

const BERKAS = ['tasks', 'collabs', 'collab_steps', 'checklists', 'comments', 'packages', 'package_items', 'package_links', 'package_contribs',
  'dashboards', 'user_links', 'activity_log'];

function bacaDump(folder) {
  const d = {};
  for (const n of BERKAS) {
    const f = path.join(folder, n + '.json');
    if (!fs.existsSync(f)) {
      throw new sheet.GalatSetelan(`Tak ada ${f}. Buat tarikannya dulu di repo v1: node scripts/migrasi/tarik.js`);
    }
    d[n] = JSON.parse(fs.readFileSync(f, 'utf8'));
  }
  let asal = {};
  try { asal = JSON.parse(fs.readFileSync(path.join(folder, 'ringkasan.json'), 'utf8')); } catch (e) { /* opsional */ }
  return { d, asal };
}

const baris = (label, n, ket = '') => console.log(`    ${label.padEnd(22)} ${String(n).padStart(5)}${ket ? '  ' + ket : ''}`);

async function main() {
  const args = process.argv.slice(2);
  const kering = args.includes('--kering');
  const denganLink = args.includes('--dengan-link');
  const demo = args.includes('--demo');
  const folder = path.resolve(args.find(a => !a.startsWith('--')) || path.join(AKAR, '..', 'task-tracker-vercel', 'db', 'dump'));

  const { d, asal } = bacaDump(folder);
  if (!denganLink) d.user_links = [];
  const { data, ringkasan: r } = ubah(d);

  console.log(`\n  Sumber : ${folder}`);
  if (asal.waktu) console.log(`  Ditarik: ${asal.waktu}`);
  console.log('\n  Hasil pemetaan');
  baris('task v1', r.taskV1, `→ di luar proyek: ${r.rutin} rutin (R1–R4), ${r.lepas} lepas berkode ADDIE`);
  baris('belum dipetakan', r.belumDipetakan, 'tanpa sub-stage; dipetakan manual oleh Lead (PRD langkah 3)');
  baris('proses kolaborasi', r.langkahJadiTask, `→ task proyek di ${r.proyek} proyek (${r.proyekArsip} tuntas → arsip)`);
  baris('task total', r.task, `${r.aktif} masih aktif, ${r.tertahan} tertahan`);
  baris('sub-task (ceklis)', r.subtask);
  baris('komentar', r.komentar);
  baris('riwayat tinjauan', r.tinjauan);
  baris('evidence', r.evidence);
  baris('rancangan paket', r.paket, `${r.targetPaket} baris target, ${r.proyekPaket} proyek tertaut`);
  baris('setoran ke paket', r.setoran);
  baris('dashboard lain', r.dashboard);
  baris('link saya', r.link, denganLink ? 'terlihat oleh siapa pun yang memegang PIN bersama' : 'tidak dibawa (pakai --dengan-link kalau pemiliknya setuju)');
  baris('riwayat aktivitas', r.log);
  const b = r.dibuang;
  console.log(`\n  Dibuang: ${b.ceklisYatim} ceklis & ${b.komentarYatim} komentar yang induknya sudah dihapus di v1, `
    + `${b.logTerpotong} aktivitas lama (hanya ${r.log} terbaru yang dibawa)`
    + (denganLink ? `, ${b.linkTanpaProfil} link milik orang yang tak punya profil di v2.` : '.'));
  console.log(`  Tidak dibawa: PIN, catatan pribadi${denganLink ? '' : ', Link Saya'}, notifikasi.`);

  if (demo) {
    const c = tambahDemo(data);
    console.log('\n  Skenario contoh (--demo)');
    for (const p of c.proyek) console.log('    proyek dari paket     ' + p);
    baris('task hasil elaborasi', c.task);
    baris('setoran ke paket', c.setoran);
    baris('catatan & link contoh', c.catatan + c.link, 'folder "Contoh"');
  }

  if (kering) {
    console.log('\n  --kering: tidak ada yang ditulis.\n');
    return;
  }

  const id = sheet.idSpreadsheet();
  if (asal.spreadsheet && asal.spreadsheet === id) {
    throw new sheet.GalatDitolak('SPREADSHEET_ID v2 sama dengan spreadsheet sumber v1. Ditolak.');
  }
  const k = await sheet.klien();
  console.log(`\n  Menulis ke spreadsheet v2 sebagai ${k.email} …`);
  const hasil = await sheet.tulisContoh(k, id, urai(data), { sumber: `Tarikan v1 ${asal.waktu || '(waktu tak diketahui)'}${demo ? ' + skenario contoh' : ''}` });
  console.log('\n  Tertulis');
  for (const [tab, n] of Object.entries(hasil.jumlah)) baris(tab, n);
  console.log(`\n  Versi data contoh: ${hasil.versi}`);
  console.log(`  https://docs.google.com/spreadsheets/d/${id}/edit\n`);
}

main().catch(err => {
  console.error('\n  Gagal: ' + sheet.jelaskanGalat(err, sheet.emailAkun()) + '\n');
  process.exit(1);
});
