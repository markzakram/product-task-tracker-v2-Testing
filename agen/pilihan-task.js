#!/usr/bin/env node
/* Pilihan form "Tambah task" untuk Ali: pekerjaan tanpa token di Agent Office
   (agen/agent-office.json). Hanya membaca ProductTrack; tak ada yang ditulis ke sana.
     node agen/pilihan-task.js [--keluaran <berkas atau folder>] [--env <berkas>]
   Isinya: proyek aktif, sub-stage proyek dan rutin, inisiatif, orang yang boleh jadi PIC, status
   awal yang sah, dan aturan tenggat (skemanya di agen/README.md). Dipakai Agent Office untuk
   mengisi form usulan task, supaya pilihannya selalu sama dengan form Tambah task.
   "BERKAS: …" = berkas yang jadi, baris terakhir "HASIL: …"; galat = "GAGAL: …". */
'use strict';

const path = require('path');
const { buatKlien } = require('./klien');
const T = require('./task');

const BANTUAN = `Pilihan form "Tambah task" untuk Ali dari ProductTrack (hanya membaca, tanpa token).

Pemakaian: node agen/pilihan-task.js [--keluaran <berkas atau folder>] [--env <berkas>]

  --keluaran <berkas>  tujuan JSON; kalau folder, namanya pilihan-task.json.
                       Bawaan: agen/.data/pilihan-task.json
  --env <berkas>       setelan lain (PT_ALAMAT, AGEN_KUNCI) selain agen/.env; hanya dibaca
  --help               tampilkan bantuan ini

Baris "BERKAS: …" menyebut berkas yang jadi; baris terakhir "HASIL: …" meringkas isinya.`;

(async () => {
  const a = T.bacaArgumen(process.argv.slice(2), { nilai: ['--keluaran', '--env'], tanda: ['--help'] });
  if (a['--help']) { console.log(BANTUAN); return; }
  const klien = buatKlien(T.opsiKlien(a['--env']));
  const k = await klien.muat();
  const pilihan = T.susunPilihan(k, { sekarang: klien.jam() });
  const berkas = T.tujuanKeluaran(a['--keluaran'], path.join(klien.folderData, 'pilihan-task.json'));
  T.tulisJson(berkas, pilihan);
  console.log(`BERKAS: ${berkas}`);
  console.log(`HASIL: ${T.ringkasPilihan(pilihan)}`);
})().catch(e => {
  console.log(`GAGAL: ${e.message}`);
  process.exitCode = 1;
});
