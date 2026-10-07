/* =============================================================================
   scripts/impor-v1.js — data v1 → data contoh di spreadsheet v2.

     npm run impor:v1                     tarikan v1 di ../task-tracker-vercel/db/dump
     npm run impor:v1 -- <folder>         tarikan di folder lain
     npm run impor:v1 -- --kering         petakan dan tampilkan ringkasan saja, tanpa menulis

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
const { urai } = require('../api/_skema');
const sheet = require('../api/_sheets');

const AKAR = path.join(__dirname, '..');
muatEnv(path.join(AKAR, '.env'));

const BERKAS = ['tasks', 'collabs', 'collab_steps', 'checklists', 'comments', 'packages', 'package_items', 'dashboards', 'activity_log'];

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
  const folder = path.resolve(args.find(a => !a.startsWith('--')) || path.join(AKAR, '..', 'task-tracker-vercel', 'db', 'dump'));

  const { d, asal } = bacaDump(folder);
  const { data, ringkasan: r } = ubah(d);

  console.log(`\n  Sumber : ${folder}`);
  if (asal.waktu) console.log(`  Ditarik: ${asal.waktu}`);
  console.log('\n  Hasil pemetaan');
  baris('task v1', r.taskV1);
  baris('langkah kolaborasi', r.langkahJadiTask, `→ task di ${r.proyek} proyek`);
  baris('task total', r.task);
  baris('sub-task (ceklis)', r.subtask);
  baris('komentar', r.komentar);
  baris('log gate', r.gateLog);
  baris('evidence', r.evidence);
  baris('paket', r.paket);
  baris('bookmark', r.bookmark);
  baris('riwayat aktivitas', r.log);
  const b = r.dibuang;
  console.log(`\n  Dibuang: ${b.ceklisYatim} ceklis & ${b.komentarYatim} komentar yang induknya sudah dihapus di v1, `
    + `${b.logTerpotong} aktivitas lama (hanya ${r.log} terbaru yang dibawa).`);
  console.log('  Tidak dibawa: PIN, catatan & tautan pribadi, notifikasi, rincian target paket.');

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
  const hasil = await sheet.tulisContoh(k, id, urai(data), { sumber: `Tarikan v1 ${asal.waktu || '(waktu tak diketahui)'}` });
  console.log('\n  Tertulis');
  for (const [tab, n] of Object.entries(hasil.jumlah)) baris(tab, n);
  console.log(`\n  Versi data contoh: ${hasil.versi}`);
  console.log(`  https://docs.google.com/spreadsheets/d/${id}/edit\n`);
}

main().catch(err => {
  console.error('\n  Gagal: ' + sheet.jelaskanGalat(err, sheet.emailAkun()) + '\n');
  process.exit(1);
});
