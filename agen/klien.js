/* =============================================================================
   agen/klien.js — klien ProductTrack untuk agen AI Ali (2.17.0).

   Dipakai ringkasan.js dan pengingat.js (pekerjaan tanpa token di Agent Office) serta mcp.js
   (alat untuk sesi AI). Klien ini:
     - masuk dengan kunci agen (aksi masukAgen), bukan PIN aplikasi. Server mengunci sesinya
       pada satu profil (AGEN_PROFIL, bawaannya ali);
     - menyusun data real dengan public/inti.js yang sama dengan browser. Perubahan yang
       bertanda sah: false dilewati, persis seperti di browser;
     - menulis lewat aksi yang sama dengan browser: simpanReal untuk perubahan task, dan
       kirimObrolan untuk pesan. Server memeriksa ulang semuanya dan menandainya AI.

   Setelan di agen/.env (contoh: agen/.env.contoh). Env proses menang, supaya tes bisa
   mengarahkannya:
     PT_ALAMAT   alamat ProductTrack, mis. https://product-task-tracker.cerehub.id
     AGEN_KUNCI  kunci agen, sama dengan AGEN_KUNCI di server
   Salinan cepat data ada di agen/.data (real.json, obrolan-*.json), supaya setiap jalan cukup
   menarik perubahan yang baru. AGEN_DATA memindahkan folder itu (untuk tes).
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const I = require('../public/inti.js');

const FOLDER = __dirname;

class GalatAgen extends Error {
  constructor(pesan, kode = '', http = 0) {
    super(pesan);
    this.kode = kode;
    this.http = http;
  }
}

/* KUNCI=nilai per baris; baris lain diabaikan. Tanda kutip di tepi nilai dibuang. */
function bacaEnv(berkas) {
  const hasil = {};
  let teks = '';
  try { teks = fs.readFileSync(berkas, 'utf8'); } catch (e) { return hasil; }
  for (const baris of teks.split(/\r?\n/)) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(baris);
    if (m) hasil[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return hasil;
}

/* Data contoh dari server dirapikan seperti di browser (rapikan di public/app.js). */
function rapikan(d) {
  const daftar = x => (Array.isArray(x) ? x : []);
  return {
    ...I.dataKosong(),
    projects: daftar(d.projects).map(p => ({ ...p, lead: p.lead || '', paket: p.paket || '', history: daftar(p.history) })),
    tasks: daftar(d.tasks).map(t => ({
      ...t, sub: t.sub || '', support: daftar(t.support), deps: daftar(t.deps), subtasks: daftar(t.subtasks), comments: daftar(t.comments),
      tinjauan: daftar(t.tinjauan), evidence: daftar(t.evidence), output: t.output || '', selesaiAt: Number(t.selesaiAt) || 0, induk: t.induk || '',
    })),
    packages: daftar(d.packages),
    setoran: daftar(d.setoran),
    dashboards: daftar(d.dashboards),
    log: daftar(d.log),
  };
}

/* ---------- Teks ---------- */
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const potong = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t; };
function tglPendek(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  return m ? `${Number(m[3])} ${BULAN[Number(m[2]) - 1]}` : '';
}
function tglPanjang(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) return '';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return `${HARI[d.getDay()]}, ${Number(m[3])} ${BULAN_PANJANG[Number(m[2]) - 1]} ${m[1]}`;
}
function jamLalu(at, sekarang) {
  const menit = Math.max(0, Math.round((sekarang - at) / 60000));
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.round(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  return `${Math.round(jam / 24)} hari lalu`;
}
const selisihHari = (a, b) => Math.round((Date.parse(b + 'T00:00:00') - Date.parse(a + 'T00:00:00')) / 864e5);
const pendek = id => I.orang(id).pendek;

/* Judul ruang obrolan, sama dengan di browser. */
function judulRuang(data, ruang, susunan = null) {
  const { jenis, id } = I.bacaRuang(ruang);
  if (jenis === 'task') {
    const t = data.tasks.find(x => x.id === id);
    if (t) return t.title;
    const m = susunan && (susunan.perRuang.get(ruang) || []).find(x => x.judul);
    return m ? m.judul : id;
  }
  if (jenis === 'proyek') { const p = data.projects.find(x => x.id === id); return p ? p.name : id; }
  return 'Tim ' + ((I.TIM[id] || {}).nama || id);
}

/* Satu baris ringkas untuk sebuah task. */
function barisTask(t, k, catatan = '') {
  const tenggat = t.due ? ` · tenggat ${tglPendek(t.due)}${t.due < k.hari ? ` (telat ${selisihHari(t.due, k.hari)} hari)` : ''}` : '';
  const label = I.labelKeadaan(t, k.perId);
  return `${t.id}${t.sub ? ' · ' + t.sub : ''} · ${potong(t.title, 80)} — ${t.status}${label ? ', ' + label : ''}${tenggat}${catatan ? ` · ${catatan}` : ''}`;
}

/* ---------- Pekerjaan dan pesan untuk agen ---------- */

/* Task yang dikembalikan peninjau dan belum diajukan lagi. */
const revisi = k => k.data.tasks.filter(t => t.pic === k.me && I.labelKeadaan(t, k.perId) === 'Revisi');

/* Pertanyaan yang menunggu jawaban saya, dan sebutan yang belum saya balas (14 hari). */
function pesanMenunggu(k, { hariSebut = 14 } = {}) {
  const out = [];
  const batasSebut = k.sekarang - hariSebut * 864e5;
  for (const [ruang, pesan] of k.susunan.perRuang) {
    if (!I.bolehRuang(k.me, ruang)) continue;
    for (const m of pesan) {
      if (m.oleh === k.me || m.dihapus || !m.at) continue;
      const tanya = m.tanya.includes(k.me) && I.tanyaTerbuka(m, pesan);
      const sebut = !tanya && m.at >= batasSebut && I.menyebut(m.teks, k.me)
        && !pesan.some(x => x.at > m.at && x.oleh === k.me && !x.dihapus);
      if (tanya || sebut) out.push({ jenis: tanya ? 'tanya' : 'sebut', ruang, judul: judulRuang(k.data, ruang, k.susunan), pesan: m });
    }
  }
  return out.sort((a, b) => a.pesan.at - b.pesan.at);
}
const barisPesan = (x, k) => `${pendek(x.pesan.oleh)}${x.pesan.ai ? ' (AI)' : ''} di ${potong(x.judul, 50)} [${x.ruang}, pesan ${x.pesan.id}], ${jamLalu(x.pesan.at, k.sekarang)}: "${potong(x.pesan.teks, 160)}"`;

/* ---------- Klien ---------- */
function buatKlien(opsi = {}) {
  const env = { ...bacaEnv(opsi.berkasEnv || path.join(FOLDER, '.env')), ...process.env };
  const alamat = String(opsi.alamat || env.PT_ALAMAT || '').trim().replace(/\/+$/, '');
  const kunci = String(opsi.kunci || env.AGEN_KUNCI || '').trim();
  const folderData = opsi.folderData || env.AGEN_DATA || path.join(FOLDER, '.data');
  const jam = opsi.jam || (() => Date.now());
  if (!alamat) throw new GalatAgen('PT_ALAMAT belum diisi di agen/.env (alamat ProductTrack, mis. https://product-task-tracker.cerehub.id).', 'SETELAN');
  if (!/^https?:\/\/[^\s/]+/.test(alamat)) throw new GalatAgen('PT_ALAMAT harus diawali http:// atau https://.', 'SETELAN');
  if (!kunci) throw new GalatAgen('AGEN_KUNCI belum diisi di agen/.env (sama dengan AGEN_KUNCI di server ProductTrack).', 'SETELAN');

  let cookie = '';
  let me = '';

  const jalur = nama => path.join(folderData, nama);
  function baca(nama, bawaan) {
    try { return JSON.parse(fs.readFileSync(jalur(nama), 'utf8')); } catch (e) { return bawaan; }
  }
  function tulis(nama, isi) {
    fs.mkdirSync(folderData, { recursive: true });
    const sementara = jalur(nama) + '.tmp';
    fs.writeFileSync(sementara, JSON.stringify(isi));
    fs.renameSync(sementara, jalur(nama));
  }

  async function kirim(action, args, pakaiCookie = true) {
    let r;
    try {
      r = await fetch(alamat + '/api/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(pakaiCookie && cookie ? { cookie } : {}) },
        body: JSON.stringify({ action, args }),
        signal: AbortSignal.timeout(opsi.batasMs || 45000),
      });
    } catch (e) {
      const sebab = (e.cause && (e.cause.code || e.cause.message)) || e.message;
      throw new GalatAgen(`ProductTrack di ${alamat} tak terjangkau (${sebab}).`, 'JARINGAN');
    }
    const c = r.headers.get('set-cookie');
    if (c) cookie = c.split(';')[0];
    let isi;
    try { isi = await r.json(); } catch (e) { throw new GalatAgen(`Balasan ProductTrack tak terbaca (HTTP ${r.status}).`, 'BALASAN', r.status); }
    return { ...isi, http: r.status };
  }

  async function masuk() {
    cookie = '';
    const h = await kirim('masukAgen', [kunci], false);
    if (!h.success) throw new GalatAgen(h.message || 'Gagal masuk sebagai agen.', h.kode || '', h.http);
    me = h.me;
    return me;
  }

  /* Satu aksi /api/rpc. Sesi agen berumur 12 jam: kalau habis, masuk lagi sekali. */
  async function rpc(action, args = []) {
    if (!cookie) await masuk();
    let h = await kirim(action, args);
    if (h.http === 401 && (h.kode === 'MASUK' || h.kode === 'AGEN')) {
      await masuk();
      h = await kirim(action, args);
    }
    if (!h.success) throw new GalatAgen(h.message || `Aksi ${action} gagal.`, h.kode || '', h.http);
    return h;
  }

  /* Data yang sedang aktif. Data real: salinan cepat + perubahan sesudahnya, seperti browser. */
  async function muat(dariAwal = false) {
    const cache = dariAwal ? null : baca('real.json', null);
    const ada = !!(cache && cache.dasar && cache.seq > 0);
    const h = await rpc('muatContoh', [{ realSejak: ada ? cache.seq : 0, generasi: ada ? cache.generasi : '' }]);
    I.aturOrang(Array.isArray(h.orang) ? h.orang : []);
    I.aturMaster(Array.isArray(h.master) ? h.master : []);
    me = h.me || me;
    if (h.mode !== 'real') {
      const data = rapikan(h.data || {});
      I.segarkanTahap(data);
      return { mode: 'contoh', data, me };
    }
    const r = h.real || { generasi: '', peristiwa: [] };
    const lanjut = ada && !r.dariAwal && r.generasi === cache.generasi;
    let dasar = lanjut ? { ...I.dataKosong(), ...cache.dasar } : I.dataKosong();
    let seq = lanjut ? cache.seq : 0;
    for (const e of r.peristiwa || []) {
      if (e.seq <= seq) continue;
      if (e.seq !== seq + 1) {
        if (dariAwal) throw new GalatAgen('Urutan perubahan data real dari server tidak utuh.', 'URUTAN');
        return muat(true);
      }
      seq = e.seq;
      if (e.sah === false) continue;   // kalah dari perubahan yang bersamaan (api/_real.js)
      I.terapkanUbah(dasar, e.ubah);
    }
    tulis('real.json', { generasi: r.generasi || '', seq, dasar });
    return { mode: 'real', data: dasar, me, seq, rusak: r.rusak || 0 };
  }

  /* Peristiwa obrolan sumber yang aktif, ditarik bertahap. */
  async function obrolan(mode) {
    const nama = `obrolan-${mode}.json`;
    const c = baca(nama, { sejak: 0, peristiwa: [] });
    const h = await rpc('muatObrolan', [c.sejak || 0]);
    const ada = new Set(c.peristiwa.map(e => e.id));
    const semua = c.peristiwa.concat((h.peristiwa || []).filter(e => !ada.has(e.id)));
    tulis(nama, { sejak: semua.reduce((m, e) => Math.max(m, Number(e.at) || 0), 0), peristiwa: semua });
    return semua;
  }

  /* Keadaan lengkap untuk ringkasan, pengingat, dan alat AI. */
  async function keadaan() {
    const m = await muat();
    const peristiwa = await obrolan(m.mode);
    const sekarang = jam();
    return { ...m, peristiwa, susunan: I.susunObrolan(m.data, peristiwa), perId: I.indeks(m.data), hari: I.isoHari(sekarang), sekarang };
  }

  let urut = 0;
  const idPerintah = () => 'a' + jam().toString(36) + (urut++ % 1296).toString(36).padStart(2, '0') + Math.random().toString(36).slice(2, 6);

  /* Perubahan data real atas nama agen. Diperiksa dulu di sini dengan aturan yang sama,
     supaya galatnya jelas sebelum dikirim; server memeriksanya lagi. */
  async function ubah(aksi, isi) {
    if (!I.AKSI_AGEN.includes(aksi)) throw new GalatAgen(`Agen tidak boleh melakukan "${aksi}".`, 'AGEN');
    const k = await keadaan();
    if (k.mode !== 'real') throw new GalatAgen('ProductTrack sedang memakai data contoh. Perubahan task hanya tersimpan di data real; minta Dev memindahkan sumber datanya.', 'SUMBER');
    const p = { id: idPerintah(), aksi, isi, oleh: k.me, at: jam(), hari: k.hari };
    const coba = I.jalankanPerintah(structuredClone(k.data), p);
    if (!coba.ok) throw new GalatAgen(coba.galat, 'ATURAN', 400);
    const h = await rpc('simpanReal', [{ id: p.id, aksi, isi, at: p.at, hari: p.hari }]);
    return h.peristiwa;
  }

  /* Pesan baru atas nama agen. tanya = profil yang ditunggu jawabannya (id atau nama pendek). */
  async function kirimPesan({ ruang, teks, balas = '', tanya = [] }) {
    const k = await keadaan();
    if (!I.bolehRuang(k.me, ruang)) throw new GalatAgen(`Ruang ${ruang} tidak bisa dibuka ${pendek(k.me)}.`, 'RUANG');
    const { jenis, id } = I.bacaRuang(ruang);
    if (jenis === 'task' && !k.data.tasks.some(t => t.id === id)) throw new GalatAgen(`Task ${id} tidak ada.`, 'RUANG');
    if (jenis === 'proyek' && !k.data.projects.some(p => p.id === id)) throw new GalatAgen(`Proyek ${id} tidak ada.`, 'RUANG');
    if (balas && !(k.susunan.perRuang.get(ruang) || []).some(m => m.id === balas)) throw new GalatAgen(`Pesan ${balas} tidak ada di ruang ${ruang}.`, 'RUANG');
    const siapa = (Array.isArray(tanya) ? tanya : [tanya]).filter(Boolean).map(x => {
      const o = I.ORANG.find(p => p.id === String(x).toLowerCase() || p.pendek.toLowerCase() === String(x).toLowerCase());
      if (!o) throw new GalatAgen(`Profil "${x}" tidak dikenal.`, 'ORANG');
      return o.id;
    });
    const e = I.periksaPeristiwa({ jenis: 'pesan', ruang, oleh: k.me, teks, target: balas, tanya: siapa, judul: judulRuang(k.data, ruang, k.susunan) });
    return (await rpc('kirimObrolan', [e])).peristiwa;
  }

  /* Pertanyaan yang sudah terjawab ditandai beres. */
  async function beres({ ruang, pesan }) {
    const k = await keadaan();
    const m = (k.susunan.perRuang.get(ruang) || []).find(x => x.id === pesan);
    if (!m) throw new GalatAgen(`Pesan ${pesan} tidak ada di ruang ${ruang}.`, 'RUANG');
    if (!m.tanya.length) throw new GalatAgen('Pesan itu bukan pertanyaan yang menunggu jawaban.', 'RUANG');
    if (!(m.tanya.includes(k.me) || m.oleh === k.me)) throw new GalatAgen('Pertanyaan itu tidak ditujukan ke profil ini.', 'RUANG');
    return (await rpc('kirimObrolan', [{ jenis: 'beres', ruang, oleh: k.me, target: pesan }])).peristiwa;
  }

  return { masuk, rpc, muat, obrolan, keadaan, ubah, kirimPesan, beres, get me() { return me; }, alamat, folderData };
}

module.exports = { buatKlien, GalatAgen, bacaEnv, rapikan, judulRuang, barisTask, revisi, pesanMenunggu, barisPesan, tglPendek, tglPanjang, jamLalu, selisihHari, potong, pendek };
