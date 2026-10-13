#!/usr/bin/env node
/* Rekap tim untuk Lead: status semua task tim per proyek dan fase ADDIE, yang
   telat/tertahan/revisi/menunggu tinjauan, beban per orang, dan pemakaian task turunan.
   Pekerjaan tanpa token di Agent Office (agen/agent-office.json).
     node agen/rekap-tim.js
   Baris terakhir "RINGKAS: …" dibaca Agent Office; galat = "GAGAL: …". */
'use strict';

const { buatKlien } = require('./klien');
const { rekapTim } = require('./tim');

(async () => {
  const k = await buatKlien().keadaan();
  const r = rekapTim(k);
  for (const b of r.baris) console.log(b);
  console.log(`RINGKAS: ${r.singkat}`);
})().catch(e => {
  console.log(`GAGAL: ${e.message}`);
  process.exitCode = 1;
});
