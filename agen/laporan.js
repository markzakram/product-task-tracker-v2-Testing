/* =============================================================================
   agen/laporan.js — isi ringkasan pagi dan pengingat untuk agen AI Ali (2.17.0).

   Fungsi murni di atas keadaan dari klien.js (data, susunan obrolan, hari ini). Tak ada
   jaringan dan tak ada AI, jadi bisa diuji langsung dan dijalankan Agent Office tanpa token.
   Hasilnya { baris, singkat }: baris = laporan lengkap (tampil di obrolan Agent Office),
   singkat = satu kalimat untuk notifikasi HP.
   ========================================================================== */
'use strict';

const I = require('../public/inti.js');
const K = require('./klien');

const jumlah = (n, kata) => `${n} ${kata}`;

/* Ringkasan pagi: pekerjaan, tenggat, tinjauan, revisi, dan pesan yang menunggu. */
function ringkasanPagi(k) {
  const p = I.pekerjaanSaya(k.data, k.me, k.hari);
  const grup = Object.fromEntries(p.grup.map(g => [g.kunci, g.isi]));
  const ambil = kunci => grup[kunci] || [];
  const rev = K.revisi(k);
  const pesan = K.pesanMenunggu(k);
  const tanya = pesan.filter(x => x.jenis === 'tanya');
  const sebut = pesan.filter(x => x.jenis === 'sebut');
  const baris = [`Ringkasan pagi untuk ${K.pendek(k.me)} · ${K.tglPanjang(k.hari)} · ${k.mode === 'real' ? 'data real' : 'data contoh'}`];
  const bagian = (judul, isi, tulis, maks = 8) => {
    if (!isi.length) return;
    baris.push('', `${judul} (${isi.length})`);
    for (const x of isi.slice(0, maks)) baris.push('  • ' + tulis(x));
    if (isi.length > maks) baris.push(`  • …dan ${isi.length - maks} lagi`);
  };
  bagian('Perlu Anda tinjau', ambil('tinjau'), x => K.barisTask(x.t, k, x.alasan));
  bagian('Dikembalikan untuk direvisi', rev, t => {
    const r = (t.tinjauan || []).filter(x => x.action === 'Dikembalikan').sort((a, b) => b.at - a.at)[0];
    return K.barisTask(t, k, r ? `oleh ${K.pendek(r.by)}${r.note ? `: "${K.potong(r.note, 100)}"` : ''}` : '');
  });
  bagian('Terlambat', ambil('telat'), x => K.barisTask(x.t, k));
  bagian('Tenggat hari ini', ambil('hari'), x => K.barisTask(x.t, k));
  bagian('7 hari ke depan', ambil('minggu'), x => K.barisTask(x.t, k));
  bagian('Antrean tim · siap dibagi', ambil('antrean'), x => K.barisTask(x.t, k));
  bagian('Sub-task untuk Anda', ambil('sub'), x => `${x.t.id} · ${x.alasan}`);
  bagian('Pertanyaan menunggu jawaban Anda', tanya, x => K.barisPesan(x, k));
  bagian('Sebutan yang belum Anda balas', sebut, x => K.barisPesan(x, k));
  const tunggu = ambil('tunggu').length;
  const nanti = ambil('nanti').length;
  if (tunggu || nanti) baris.push('', `Lainnya: ${[nanti && jumlah(nanti, 'task tanpa tenggat dekat'), tunggu && jumlah(tunggu, 'task belum bisa dikerjakan')].filter(Boolean).join(', ')}.`);

  const singkat = [
    ambil('telat').length && jumlah(ambil('telat').length, 'telat'),
    ambil('hari').length && jumlah(ambil('hari').length, 'tenggat hari ini'),
    ambil('tinjau').length && jumlah(ambil('tinjau').length, 'perlu ditinjau'),
    rev.length && jumlah(rev.length, 'revisi'),
    tanya.length && jumlah(tanya.length, 'pertanyaan menunggu'),
    sebut.length && jumlah(sebut.length, 'sebutan'),
  ].filter(Boolean).join(' · ') || 'tidak ada yang mendesak';
  if (baris.length === 1) baris.push('', 'Tidak ada pekerjaan aktif, tinjauan, atau pesan yang menunggu.');
  if (tanya.length || sebut.length) baris.push('', 'Untuk menyiapkan balasan: kirim tugas "@Ali jawab pesan yang menunggu" di Agent Office.');
  return { baris, singkat };
}

/* Pengingat sejak pemeriksaan terakhir: tenggat (besok, hari ini, lewat), dan kabar baru
   dari Inti.notifikasi (dikembalikan, perlu ditinjau, pertanyaan, sebutan, task baru, siap
   dimulai). jejak = { sudah: {id: at}, mulai } dari pemeriksaan sebelumnya; yang sudah pernah
   diingatkan tak diulang. Jejak pertama hanya melihat 24 jam terakhir, supaya tak membanjir. */
const JENIS_KABAR = {
  kembali: n => `${n.task} dikembalikan ${K.pendek(n.oleh)}${n.teks ? `: "${K.potong(n.teks, 100)}"` : ''}`,
  tinjau: n => `${n.task} diajukan ${K.pendek(n.oleh)}, menunggu tinjauan Anda`,
  tanya: n => `pertanyaan dari ${K.pendek(n.oleh)}: "${K.potong(n.teks, 100)}"`,
  sebut: n => `${K.pendek(n.oleh)} menyebut Anda: "${K.potong(n.teks, 100)}"`,
  baru: n => `task baru untuk Anda: ${n.task}`,
  serah: n => `${n.task} diserahkan ke Anda`,
  siap: n => `${n.task} sudah bisa dimulai`,
};
function pengingat(k, jejak = null) {
  const sudah = { ...((jejak && jejak.sudah) || {}) };
  const mulai = jejak && jejak.mulai ? jejak.mulai : k.sekarang;
  const batasLama = Math.max(mulai - 864e5, k.sekarang - 3 * 864e5);
  const besok = I.tambahHari(k.hari, 1);
  const item = [];
  const tambah = (id, teks) => { if (!sudah[id]) { item.push(teks); sudah[id] = k.sekarang; } };

  // Sama dengan "Terlambat" di ringkasan: task yang masih menunggu (tahap sebelumnya, tertahan)
  // belum diingatkan; begitu bisa dikerjakan dan tenggatnya lewat, baru diingatkan.
  for (const t of k.data.tasks) {
    if (t.pic !== k.me || !I.aktif(t) || t.status === 'Ditinjau' || !t.due || I.terhambat(t, k.perId)) continue;
    const judul = `${t.id} ${K.potong(t.title, 60)}`;
    if (t.due === besok) tambah(`besok-${t.id}-${t.due}`, `${judul}: tenggat besok (${K.tglPendek(t.due)})`);
    else if (t.due === k.hari) tambah(`hari-${t.id}-${t.due}`, `${judul}: tenggat hari ini`);
    else if (t.due < k.hari) tambah(`telat-${t.id}-${t.due}`, `${judul}: lewat tenggat ${K.selisihHari(t.due, k.hari)} hari`);
  }
  for (const n of I.notifikasi(k.data, k.me, 200, k.susunan)) {
    const tulis = JENIS_KABAR[n.jenis];
    if (!tulis || n.at < batasLama) continue;
    tambah(n.id, tulis(n) + (n.ai ? ' (AI)' : ''));
  }
  // Jejak lebih dari 30 hari dibuang supaya berkasnya tak terus membesar.
  for (const [id, at] of Object.entries(sudah)) if (at < k.sekarang - 30 * 864e5) delete sudah[id];
  const singkat = item.length ? `${item.length} pengingat: ${item.slice(0, 3).map(x => K.potong(x, 60)).join(' · ')}${item.length > 3 ? ' · …' : ''}` : 'tidak ada pengingat baru';
  return { baris: item.map(x => '• ' + x), singkat, jejak: { mulai, sudah } };
}

module.exports = { ringkasanPagi, pengingat };
