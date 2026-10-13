#!/usr/bin/env node
/* Laporan mingguan tim: selesai, diajukan, tinjauan, terlambat & tertahan, dan rencana
   7 hari ke depan. Ringkasannya tampil di obrolan Agent Office; lengkapnya ditulis sebagai
   HTML (buka di browser, bisa dicetak jadi PDF) dan Markdown (untuk ditempel ke chat/email)
   di agen/laporan/ (tidak ikut git; AGEN_LAPORAN memindahkan folder itu).
     node agen/mingguan.js           minggu ini (Senin sampai hari ini)
     node agen/mingguan.js --lalu    minggu lalu (Senin–Minggu)
   "BERKAS: …" = berkas yang jadi, baris terakhir "RINGKAS: …"; galat = "GAGAL: …". */
'use strict';

const fs = require('fs');
const path = require('path');
const { buatKlien } = require('./klien');
const { laporanMingguan } = require('./tim');

(async () => {
  const k = await buatKlien().keadaan();
  const r = laporanMingguan(k, process.argv.includes('--lalu') ? 'lalu' : 'minggu');
  for (const b of r.baris) console.log(b);
  const folder = process.env.AGEN_LAPORAN || path.join(__dirname, 'laporan');
  fs.mkdirSync(folder, { recursive: true });
  const nama = `${r.sampai}-mingguan-${r.tim.toLowerCase()}`;
  const tampil = f => (path.relative(__dirname, f).startsWith('..') ? f : path.relative(__dirname, f));
  console.log('');
  for (const [ext, isi] of [['html', r.html], ['md', r.md]]) {
    const f = path.join(folder, `${nama}.${ext}`);
    fs.writeFileSync(f, isi);
    console.log(`BERKAS: ${tampil(f)}`);
  }
  console.log(`RINGKAS: ${r.singkat}`);
})().catch(e => {
  console.log(`GAGAL: ${e.message}`);
  process.exitCode = 1;
});
