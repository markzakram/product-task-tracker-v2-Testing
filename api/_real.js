/* =============================================================================
   _real.js — data real di server (2.16.0).

   Keadaan terkini disusun dari tab data_real: setiap perubahan diterapkan apa adanya
   (Inti.terapkanUbah), tanpa menjalankan aturan lagi. Perintah baru dari browser dijalankan
   dengan aturan yang sama dengan browser (Inti.jalankanPerintah) di atas SALINAN keadaan itu;
   kalau lolos, perubahannya (Inti.bedaData) disimpan sebagai baris baru di spreadsheet. Perintah
   di satu instance diproses satu per satu, supaya dua perintah tak diperiksa terhadap keadaan
   yang sama.

   Antrean itu hanya berlaku di dalam satu instance, padahal Cloud Run boleh menjalankan dua
   (--max-instances 2). Karena itu setiap perubahan mencatat `dasar`: banyaknya perubahan yang
   sudah dilihat server saat memeriksanya. Perubahan itu SAH kalau sesudah dasar-nya tak ada
   perubahan sah lain, artinya tak ada yang menyelip di antara pemeriksaan dan penulisannya.
   Yang tidak sah dilewati saat keadaan disusun, di server maupun di browser; server yang
   menulisnya memeriksa ulang perintahnya terhadap keadaan terbaru, lalu menulis lagi atau
   menolaknya. Sah-tidaknya hanya bergantung pada urutan baris, jadi semua instance dan browser
   sampai pada keadaan yang sama.
   ========================================================================== */

const Inti = require('../public/inti.js');
const sheet = require('./_sheets');

/* Perintah yang ditolak aturan aplikasi (mis. bukan peninjaunya): 400 dengan pesannya. */
class GalatAturan extends Error {}

/* Jam browser dipakai, supaya keadaan di browser pengirim sama persis dengan yang tersimpan —
   asal tak meleset lebih dari lima menit dari jam server. */
const MELESET_MAKS = 5 * 60 * 1000;
/* Berapa kali satu perintah diperiksa ulang kalau terus kalah dari perubahan yang bersamaan. */
const PERCOBAAN_MAKS = 5;

/* Baris tanpa dasar (ditulis sebelum kolom itu ada) selalu sah. */
const sahDi = (e, sahTerakhir) => !Number.isInteger(e.dasar) || e.dasar >= sahTerakhir;

let susunan = null;   // { k, kunci, jumlah, sah, tanda, data }
/* Keadaan dari bacaan r, disusun bertahap: hanya perubahan yang baru dibaca yang diterapkan.
   tanda[i] = perubahan nomor i+1 sah; sah = nomor perubahan sah terakhir. */
function keadaan(k, id, r) {
  const kunci = `${id}|${r.generasi}`;
  if (!susunan || susunan.k !== k || susunan.kunci !== kunci || susunan.jumlah > r.peristiwa.length) {
    susunan = { k, kunci, jumlah: 0, sah: 0, tanda: [], data: Inti.dataKosong() };
  }
  for (; susunan.jumlah < r.peristiwa.length; susunan.jumlah++) {
    const e = r.peristiwa[susunan.jumlah];
    const sah = sahDi(e, susunan.sah);
    susunan.tanda.push(sah);
    if (!sah) continue;
    Inti.terapkanUbah(susunan.data, e.ubah);
    susunan.sah = susunan.jumlah + 1;
  }
  return susunan;
}

/* Perubahan dari agen AI (2.17.0): aktivitas dan tinjauan baru atas nama pelakunya ditandai
   ai: true, supaya semua orang melihat bahwa yang bertindak adalah agen. Ditandai di sini, di
   server, sebelum disimpan; browser tak bisa menandai atau menghapus tandanya. */
function tandaiAi(ubah, dasar, oleh) {
  for (const l of ubah.log || []) if (l.by === oleh) l.ai = true;
  const lama = new Map((dasar.tasks || []).map(t => [t.id, new Set((t.tinjauan || []).map(r => r.id))]));
  for (const t of (ubah.tasks && ubah.tasks.pasang) || []) {
    const ada = lama.get(t.id) || new Set();
    for (const r of t.tinjauan || []) if (!ada.has(r.id) && r.by === oleh) r.ai = true;
  }
}

let antrean = Promise.resolve();
/* perintah sudah dibersihkan Inti.periksaPerintah; oleh = profil yang terbukti di sesi ini;
   opsi.ai = sesi agen AI. Mengembalikan perubahan yang tersimpan beserta nomor urutnya (seq)
   dan hasil ringkasnya. */
function simpan(k, id, perintah, oleh, { sekarang = Date.now(), ai = false } = {}) {
  const kerja = antrean.then(async () => {
    const at = Math.abs((perintah.at || 0) - sekarang) <= MELESET_MAKS ? perintah.at : sekarang;
    const p = { ...perintah, oleh, at };
    let r = await sheet.bacaReal(k, id, { segar: true });
    for (let coba = 1; ; coba++) {
      const s = keadaan(k, id, r);
      // Kiriman ulang (balasan pertama tak sampai ke browser): sudah tersimpan, jangan dua kali.
      const i = r.peristiwa.findIndex((e, n) => e.id === p.id && s.tanda[n]);
      if (i >= 0) return { ...r.peristiwa[i], seq: i + 1, generasi: r.generasi, ulang: true };
      const salinan = structuredClone(s.data);
      const h = Inti.jalankanPerintah(salinan, p);
      if (!h.ok) throw new GalatAturan(h.galat);
      const ubah = Inti.bedaData(s.data, salinan);
      if (ai) tandaiAi(ubah, s.data, oleh);
      const hasil = Inti.ringkasHasil(h.hasil);
      // Tak ada yang berubah: tak perlu baris baru.
      if (!Object.keys(ubah).length) return { ...p, ubah, seq: r.peristiwa.length, generasi: r.generasi, kosong: true, hasil };
      r = await sheet.tulisReal(k, id, { ...p, ubah, dasar: r.peristiwa.length });
      const t = keadaan(k, id, r);
      const j = r.peristiwa.findLastIndex(e => e.id === p.id);
      if (j >= 0 && t.tanda[j]) return { ...r.peristiwa[j], seq: j + 1, generasi: r.generasi, hasil };
      // Kalah dari perubahan instance lain yang menyelip: diperiksa ulang terhadap keadaan terbaru.
      if (coba >= PERCOBAAN_MAKS) throw new Error('Spreadsheet sedang ramai menerima perubahan lain. Perubahan ini dicoba lagi sebentar lagi.');
    }
  });
  antrean = kerja.catch(() => {});
  return kerja;
}

/* Bagian data real untuk browser: perubahan sesudah nomor urut `nomor`, atau semuanya dari awal
   kalau generasinya lain (tab dibuat ulang) atau browser mengaku lebih maju dari server.
   Perubahan yang tidak sah tetap dikirim karena nomornya terpakai, tanpa isi dan bertanda
   sah: false. */
async function sejak(k, id, nomor, generasi) {
  const r = await sheet.bacaReal(k, id);
  const s = keadaan(k, id, r);
  const n = Number(nomor) || 0;
  const dariAwal = !n || generasi !== r.generasi || n > r.peristiwa.length;
  const awal = dariAwal ? 0 : n;
  return {
    generasi: r.generasi, seq: r.peristiwa.length, dariAwal, rusak: r.rusak,
    peristiwa: r.peristiwa.slice(awal).map((e, i) => (s.tanda[awal + i]
      ? { ...e, seq: awal + i + 1 }
      : { ...e, ubah: {}, seq: awal + i + 1, sah: false })),
  };
}

/* Panel Dev: perubahan yang sah, yang kalah lalu diulang server, baris rusak, dan perkiraan
   besarnya riwayat (karakter di sel ≈ byte). Riwayat itu dibaca utuh oleh setiap instance yang
   baru menyala dan oleh browser yang baru pertama membuka data real. */
async function ringkasan(k, id) {
  const r = await sheet.bacaReal(k, id);
  const s = keadaan(k, id, r);
  const sah = s.tanda.filter(Boolean).length;
  const ukuran = r.peristiwa.reduce((n, e) => n + (e.panjang || 0), 0);
  return { perubahan: sah, diulang: r.peristiwa.length - sah, generasi: r.generasi, rusak: r.rusak, ukuran };
}

module.exports = { GalatAturan, MELESET_MAKS, PERCOBAAN_MAKS, simpan, sejak, ringkasan };
