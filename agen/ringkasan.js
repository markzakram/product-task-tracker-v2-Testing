#!/usr/bin/env node
/* Ringkasan pagi untuk Ali: pekerjaan tanpa token di Agent Office (agen/agent-office.json).
     node agen/ringkasan.js
   Baris terakhir "RINGKAS: …" dibaca Agent Office sebagai ringkasan hasil; galat = "GAGAL: …". */
'use strict';

const { buatKlien } = require('./klien');
const { ringkasanPagi } = require('./laporan');

(async () => {
  const klien = buatKlien();
  const k = await klien.keadaan();
  const r = ringkasanPagi(k);
  for (const b of r.baris) console.log(b);
  console.log(`RINGKAS: ${r.singkat}`);
})().catch(e => {
  console.log(`GAGAL: ${e.message}`);
  process.exitCode = 1;
});
