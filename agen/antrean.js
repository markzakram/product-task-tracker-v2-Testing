#!/usr/bin/env node
/* Antrean tim siap dibagi + saran PIC: langkah proyek yang sudah bisa dimulai dan
   belum dibagi, dengan saran staff berbeban paling ringan (lalu yang pernah mengerjakan
   sub-stage yang sama). Hanya saran: tidak ada yang ditulis ke ProductTrack.
     node agen/antrean.js
   Baris terakhir "RINGKAS: …" dibaca Agent Office; galat = "GAGAL: …". */
'use strict';

const { buatKlien } = require('./klien');
const { antreanSaran } = require('./tim');

(async () => {
  const k = await buatKlien().keadaan();
  const r = antreanSaran(k);
  for (const b of r.baris) console.log(b);
  console.log(`RINGKAS: ${r.singkat}`);
})().catch(e => {
  console.log(`GAGAL: ${e.message}`);
  process.exitCode = 1;
});
