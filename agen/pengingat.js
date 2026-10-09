#!/usr/bin/env node
/* Pengingat tenggat & tinjauan untuk Ali: pekerjaan tanpa token di Agent Office, dijadwalkan
   beberapa kali sehari. Hanya yang baru sejak pemeriksaan sebelumnya (jejaknya di
   agen/.data/pengingat.json); kalau tak ada, "tidak ada pengingat baru" dan Agent Office tak
   mengirim notifikasi (lihat "senyap" di agen/agent-office.json).
     node agen/pengingat.js            pemeriksaan biasa
     node agen/pengingat.js --semua    tanpa jejak: semua tenggat yang berlaku + kabar 24 jam terakhir
   Baris terakhir "RINGKAS: …" dibaca Agent Office; galat = "GAGAL: …". */
'use strict';

const fs = require('fs');
const path = require('path');
const { buatKlien } = require('./klien');
const { pengingat } = require('./laporan');

(async () => {
  const semua = process.argv.includes('--semua');
  const klien = buatKlien();
  const JEJAK = path.join(klien.folderData, 'pengingat.json');
  const k = await klien.keadaan();
  let jejak = null;
  if (!semua) {
    try { jejak = JSON.parse(fs.readFileSync(JEJAK, 'utf8')); } catch (e) { jejak = null; }
  }
  const r = pengingat(k, jejak);
  for (const b of r.baris) console.log(b);
  if (!semua) {
    fs.mkdirSync(path.dirname(JEJAK), { recursive: true });
    fs.writeFileSync(JEJAK, JSON.stringify(r.jejak));
  }
  console.log(`RINGKAS: ${r.singkat}`);
})().catch(e => {
  console.log(`GAGAL: ${e.message}`);
  process.exitCode = 1;
});
