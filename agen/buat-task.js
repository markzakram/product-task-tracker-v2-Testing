#!/usr/bin/env node
/* Menyimpan butir rekap kerja harian yang sudah diterima Ali sebagai task di ProductTrack,
   atas nama Ali dan bertanda AI: pekerjaan tanpa token di Agent Office (agen/agent-office.json).
     node agen/buat-task.js --berkas <berkas.json> [--env <berkas>] [--uji]
   Berkasnya { "tanggal": "YYYY-MM-DD", "butir": [...] } (skema di agen/README.md). Tiap butir
   diperiksa dengan aturan ProductTrack lebih dulu; yang tidak sah ditolak dengan alasannya
   tanpa menghentikan butir lain. --uji memeriksa saja tanpa membuat task.
   IDEMPOTEN: butir yang sudah dibuat dicatat di agen/.data/rekap-terkirim.json, jadi jalan ulang
   tidak menggandakan task. Hasil per butir ditulis ke <berkas>.hasil.json.
   "BERKAS: …" = berkas hasil, baris terakhir "HASIL: …"; galat = "GAGAL: …". */
'use strict';

const fs = require('fs');
const path = require('path');
const { buatKlien, GalatAgen } = require('./klien');
const T = require('./task');

const BANTUAN = `Menyimpan butir rekap kerja harian sebagai task di ProductTrack atas nama Ali (bertanda AI).

Pemakaian: node agen/buat-task.js --berkas <berkas.json> [--env <berkas>] [--uji]

  --berkas <berkas.json>  usulan yang sudah diterima: { "tanggal": "YYYY-MM-DD", "butir": [...] }
  --env <berkas>          setelan lain (PT_ALAMAT, AGEN_KUNCI) selain agen/.env; hanya dibaca
  --uji                   periksa saja dengan aturan ProductTrack, tanpa membuat task
  --help                  tampilkan bantuan ini

Butir yang tidak sah ditolak dengan alasannya; butir lain tetap diproses. Butir yang sudah
dibuat dicatat di agen/.data/rekap-terkirim.json, jadi jalan ulang tidak menggandakan task.
Hasil per butir (dibuat / ditolak / dilewati) ditulis ke <berkas>.hasil.json.
Baris terakhir "HASIL: N task dibuat, M ditolak"; galat = "GAGAL: …".`;

(async () => {
  const a = T.bacaArgumen(process.argv.slice(2), { nilai: ['--berkas', '--env'], tanda: ['--uji', '--help'] });
  if (a['--help']) { console.log(BANTUAN); return; }
  if (!a['--berkas']) throw new GalatAgen('Opsi --berkas wajib: berkas JSON berisi tanggal dan butir usulan.', 'OPSI');
  const berkas = path.resolve(a['--berkas']);
  const isi = T.bacaBerkasButir(berkas);
  const klien = buatKlien(T.opsiKlien(a['--env']));
  // Hasil jalan sebelumnya tak boleh tertukar dengan hasil jalan ini kalau yang ini gagal di tengah.
  const keluar = berkas + '.hasil.json';
  fs.rmSync(keluar, { force: true });
  const r = await T.proses(klien, { tanggal: isi.tanggal, butir: isi.butir, uji: !!a['--uji'], folder: klien.folderData });
  T.tulisJson(keluar, T.hasilBerkas(r, berkas));
  console.log(`${r.uji ? 'Uji' : 'Rekap'} ${r.tanggal} · ${isi.butir.length} butir${r.uji ? ' (tidak ada yang ditulis)' : ''}`);
  for (const x of r.hasil) for (const b of T.barisButir(x)) console.log(b);
  console.log(`BERKAS: ${keluar}`);
  console.log(`HASIL: ${T.barisHasil(r)}`);
})().catch(e => {
  console.log(`GAGAL: ${e.message}`);
  process.exitCode = 1;
});
