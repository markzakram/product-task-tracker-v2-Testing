#!/usr/bin/env node
/* Cek kerapian data tim: task tanpa tenggat atau sub-stage, output kosong padahal
   sudah diajukan, turunan yang tertinggal, menunggu task yang sudah tidak ada, PIC nonaktif,
   dan sejenisnya. Hanya membaca; perbaikannya tetap di ProductTrack.
     node agen/cek-data.js
   Baris terakhir "RINGKAS: …" dibaca Agent Office; galat = "GAGAL: …". */
'use strict';

const { buatKlien } = require('./klien');
const { cekData } = require('./tim');

(async () => {
  const k = await buatKlien().keadaan();
  const r = cekData(k);
  for (const b of r.baris) console.log(b);
  console.log(`RINGKAS: ${r.singkat}`);
})().catch(e => {
  console.log(`GAGAL: ${e.message}`);
  process.exitCode = 1;
});
