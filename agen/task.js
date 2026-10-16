/* =============================================================================
   agen/task.js — agen Ali mencatat pekerjaan harian sebagai task (2.37.0).

   Dipakai pilihan-task.js dan buat-task.js (pekerjaan tanpa token di Agent Office) serta mcp.js
   (alat pilihan_task dan buat_task untuk sesi AI). Dua hal:

   1. PILIHAN FORM "Tambah task" untuk profil agen (susunPilihan): proyek aktif, sub-stage
      proyek (tim sendiri di atas) dan rutin, inisiatif, orang yang boleh jadi PIC, status awal
      yang sah, dan aturan tenggat. Hanya membaca data ProductTrack, jadi selalu sama dengan
      form aslinya.

   2. BUTIR → TASK (proses). Butir = satu pekerjaan dari rekap harian yang sudah diterima Ali.
      Tiap butir diperiksa lebih dulu dengan aturan Inti yang sama dengan form (Inti.taskBaru,
      Inti.terapkanAksi), atas salinan data, jadi butir yang tidak sah ditolak dengan pesan yang
      jelas tanpa menghentikan butir lain. Yang sah ditulis lewat klien agen (simpanReal):
        - task dibuat di Antre, persis seperti form;
        - lalu aksi status yang sama dengan tombol di ProductTrack: mulai, dan ajukan (proyek,
          menunggu tinjauan) atau selesai (rutin dan inisiatif, tanpa tinjauan);
        - server menandai aktivitasnya AI.
      IDEMPOTEN dua lapis. (a) Butir yang sudah dibuat dicatat di rekap-terkirim.json (kunci:
      tanggal + id butir), jadi jalan ulang melewatinya. (b) Tiap perintah memakai ID yang
      diturunkan dari kunci itu; server membuang perintah ber-ID sama yang sudah tersimpan,
      jadi kalau catatan lokal hilang atau jalannya terputus, jalan ulang tetap tidak
      menggandakan task dan melanjutkan status yang tersisa.

   Fungsi periksa* murni (tanpa jaringan); yang menulis hanya tulisButir dan proses.
   ========================================================================== */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const I = require('../public/inti.js');
const K = require('./klien');

/* Batas isian sama dengan form Tambah task: judul 200, output 200, Keterangan 4000. Deskripsi
   dibatasi lebih kecil supaya daftar bukti dan baris "dicatat agen AI" selalu muat. */
const BATAS = { id: 80, judul: 200, deskripsi: 3000, keterangan: 4000, output: 200, bukti: 50, panjangBukti: 300, pendukung: 10, butir: 200, berkas: 2 * 1024 * 1024 };
const JALUR = ['proyek', 'rutin'];
const KOLOM = ['id', 'judul', 'jalur', 'proyek', 'inisiatif', 'sub', 'pic', 'pendukung', 'tenggat', 'status', 'deskripsi', 'output', 'bukti'];
const FORMAT_PILIHAN = 1;
const BERKAS_REKAP = 'rekap-terkirim.json';
const KODE_LANGKAH = { mulai: 'm', ajukan: 'a', selesai: 's' };

/* ---------- Teks dan tanggal ---------- */

const KONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const bersih = s => String(s == null ? '' : s).replace(/\r\n?/g, '\n').replace(KONTROL, ' ');
const satuBaris = s => bersih(s).replace(/\s+/g, ' ').trim();
/* Teks panjang: baris tetap, spasi di ujung baris dibuang, paling banyak satu baris kosong. */
const teksPanjang = s => bersih(s).split('\n').map(b => b.replace(/[ \t]+$/, '')).join('\n').replace(/\n{3,}/g, '\n\n').trim();
/* Nilai isian yang boleh teks atau angka; selain itu null. */
const sebagaiTeks = v => (typeof v === 'string' ? v : typeof v === 'number' && Number.isFinite(v) ? String(v) : null);

function tanggalSah(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof s === 'string' ? s : '');
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

/* Pola rahasia yang tak boleh sampai ke ProductTrack (dilihat seluruh tim). Rekap sudah
   menyamarkannya; ini jaring kedua, dan butirnya ditolak supaya Ali bisa menyuntingnya. */
const POLA_RAHASIA = [/sk-ant-[A-Za-z0-9_-]{8,}/, /AGEN_KUNCI\s*=/i, /\bBearer\s+[A-Za-z0-9._~+/-]{20,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\b(?:password|passwd|api[_-]?key|secret|token)\s*=\s*['"]?[^\s'"]{4,}/i];
const adaRahasia = teks => POLA_RAHASIA.some(p => p.test(teks));

/* ---------- Status awal ---------- */

/* Task baru selalu mulai di Antre (seperti form). Status lain dicapai dengan aksi yang sama dengan
   tombol di ProductTrack. Task proyek ditinjau dulu (Lead dan staff mengajukan ke peninjau), jadi
   status akhirnya Ditinjau; jalur rutin dan inisiatif tanpa tinjauan, jadi Selesai. */
const statusAkhir = (jalur, me) => (jalur === 'proyek' && I.peninjau({ lane: 'proyek', pic: me, sub: '', induk: '' }) ? 'Ditinjau' : 'Selesai');
const statusJalur = (jalur, me) => ['Antre', 'Dikerjakan', statusAkhir(jalur, me)];
function rantaiStatus(jalur, status, me) {
  if (status === 'Antre') return [];
  const mulai = { kunci: 'mulai', ke: 'Dikerjakan' };
  if (status === 'Dikerjakan') return [mulai];
  return [mulai, statusAkhir(jalur, me) === 'Ditinjau' ? { kunci: 'ajukan', ke: 'Ditinjau' } : { kunci: 'selesai', ke: 'Selesai' }];
}

/* ---------- Pilihan form Tambah task ---------- */

const urutId = (a, b) => String(a.id).localeCompare(String(b.id), 'id', { numeric: true });

/* Pilihan form untuk profil agen (k.me), dari keadaan k (klien.muat()). Bentuknya kontrak dengan
   Agent Office: lihat "Skema pilihan-task.json" di agen/README.md. */
function susunPilihan(k, { sekarang = Date.now() } = {}) {
  const me = k.me;
  const diri = I.orang(me);
  const tim = I.timOrang(me);
  const kodeTim = tim ? tim.kode : '';
  const bolehPic = new Set(I.picBoleh(me));
  const namaTahap = s => (s.tahap === 'R' ? 'Rutin' : I.namaTahap(s.tahap));
  // PIC yang sah untuk sub-stage itu (aturan Inti.picSah), profil agen di depan.
  const picUntuk = kode => {
    const sah = I.ORANG.filter(o => I.picSah(me, o.id, kode)).map(o => o.id);
    return sah.includes(me) ? [me, ...sah.filter(id => id !== me)] : sah;
  };
  const sub = s => ({
    kode: s.kode, nama: s.nama, tahap: s.tahap, namaTahap: namaTahap(s),
    tim: s.tim || '', timSingkat: s.tim ? I.singkatTim(s.tim) : '', timSaya: !!kodeTim && s.tim === kodeTim,
    reviewManager: !!s.reviewManager,
    pic: picUntuk(s.kode),
  });
  const aktif = I.SUB_TAHAP.filter(s => s.aktif !== false);
  const subProyek = aktif.filter(s => s.tahap !== 'R' && I.subBolehBagi(me, s.kode)).map(sub);
  const subRutin = aktif.filter(s => s.tahap === 'R').map(sub);
  // Seperti form: sub-stage tim sendiri di atas, tim lain sesudahnya.
  const urutKode = [...subProyek.filter(s => s.timSaya), ...subProyek.filter(s => !s.timSaya)].map(s => s.kode);

  const proyek = (k.data.projects || []).filter(p => !p.arsip).map(p => {
    const timP = I.timProyek(k.data, p);
    return {
      id: p.id, nama: p.name, platform: p.platform || '', tahap: p.stage, namaTahap: I.namaTahap(p.stage), siklus: p.cycle || 1,
      tim: timP, timSingkat: timP.map(I.singkatTim), timSaya: !!kodeTim && timP.includes(kodeTim), substage: urutKode,
    };
  }).sort((a, b) => (b.timSaya - a.timSaya) || urutId(a, b));

  // Inisiatif (2.31.0): hanya yang belum selesai; dipilih hanya yang aktif. Khusus tim DAE dan Manager.
  const bolehIni = I.bolehLihatInisiatif(me);
  const namaStatusIni = st => (I.STATUS_INISIATIF.find(([kunci]) => kunci === st) || [st, st])[1];
  const inisiatif = bolehIni ? (k.data.inisiatif || []).filter(x => x.status !== 'selesai').map(x => ({
    id: x.id, nama: x.nama, status: x.status, statusLabel: namaStatusIni(x.status), tim: x.tim, timSingkat: I.singkatTim(x.tim), pic: x.pic,
    bisaDipilih: x.status === 'aktif',
  })).sort(urutId) : [];
  const iniAda = inisiatif.some(x => x.bisaDipilih);

  const orang = I.ORANG.map(o => { const t = I.timOrang(o.id); return { id: o.id, nama: o.nama, pendek: o.pendek, peran: o.peran, jabatan: o.jabatan, tim: t ? t.kode : '', bolehPic: bolehPic.has(o.id) }; });

  const akhirProyek = statusAkhir('proyek', me);
  const tinjau = I.peninjau({ lane: 'proyek', pic: me, sub: '', induk: '' });
  const namaTinjau = tinjau ? I.orang(tinjau).pendek : '';
  const pendek = I.orang(me).pendek;
  const timLabel = kodeTim ? I.singkatTim(kodeTim) : '';
  return {
    versi: FORMAT_PILIHAN,
    dibuat: new Date(sekarang).toISOString(),
    hari: I.isoHari(sekarang),
    mode: k.mode,
    bisaBuat: k.mode === 'real',
    profil: { id: me, nama: diri.nama, pendek, peran: diri.peran, jabatan: diri.jabatan, tim: kodeTim, timSingkat: timLabel, timNama: kodeTim && I.TIM[kodeTim] ? I.TIM[kodeTim].nama : '' },
    jalur: [
      { kode: 'proyek', label: 'Proyek', jalurButir: 'proyek', tersedia: proyek.length > 0, wajib: ['proyek', 'sub'], opsional: [], subJenis: 'proyek',
        keterangan: 'Langkah di sebuah proyek: pilih proyek aktif dan sub-stage ADDIE. Ditinjau sebelum selesai.' },
      { kode: 'rutin', label: 'Rutin', jalurButir: 'rutin', tersedia: true, wajib: ['sub'], opsional: [], subJenis: 'rutin',
        keterangan: 'Pekerjaan harian di luar proyek: pilih jenis rutin (R1–R4). Tanpa tinjauan, jadi boleh langsung selesai.' },
      { kode: 'inisiatif', label: 'Inisiatif', jalurButir: 'rutin', tersedia: iniAda, wajib: ['inisiatif'], opsional: ['sub'], subJenis: 'rutin',
        keterangan: `Pembaruan pekerjaan berkelanjutan. Dikirim sebagai jalur rutin dengan isian inisiatif; jenis rutin boleh kosong. Tanpa tinjauan. Khusus tim ${I.TIM_INISIATIF.map(I.singkatTim).join(', ')} dan Manager.`,
        ...(iniAda ? {} : { alasan: bolehIni ? 'Belum ada inisiatif aktif.' : `Inisiatif hanya untuk tim ${I.TIM_INISIATIF.map(I.singkatTim).join(', ')} dan Manager.` }) },
    ],
    proyek,
    substage: { proyek: subProyek, rutin: subRutin },
    inisiatif,
    orang,
    pic: {
      bawaan: me,
      keterangan: `PIC bawaan rekap harian adalah ${pendek} sendiri (form biasa menawarkan Lead tim pemilik sub-stage). PIC lain yang sah ada di substage[].pic. Status selain Antre hanya untuk task yang PIC-nya ${pendek}.`,
    },
    statusAwal: {
      bawaan: 'Antre',
      proyek: statusJalur('proyek', me),
      rutin: statusJalur('rutin', me),
      inisiatif: statusJalur('rutin', me),
      keterangan: {
        Antre: 'Task baru menunggu dikerjakan (bawaan form Tambah task).',
        Dikerjakan: 'Langsung dimulai. Task proyek yang menunggu task lain (fase sebelumnya di timnya) belum bisa dimulai.',
        Ditinjau: tinjau ? `Diajukan untuk ditinjau ${namaTinjau}. Hanya jalur proyek; wajib ada output.` : 'Tidak dipakai: profil ini tanpa peninjau.',
        Selesai: akhirProyek === 'Selesai' ? 'Langsung selesai (tanpa tinjauan).' : 'Hanya jalur rutin dan inisiatif (tanpa tinjauan); task proyek berhenti di Ditinjau.',
      },
    },
    saranRekap: {
      selesai: { proyek: akhirProyek, rutin: 'Selesai', inisiatif: 'Selesai' },
      berjalan: { proyek: 'Dikerjakan', rutin: 'Dikerjakan', inisiatif: 'Dikerjakan' },
      keterangan: 'Pemetaan usulan rekap (selesai/berjalan) ke status awal. Untuk PIC selain pemilik profil, pakai Antre.',
    },
    tenggat: {
      format: 'YYYY-MM-DD', wajib: false, bawaan: 'tanggal-rekap',
      keterangan: 'Kosong = tanggal rekap (tanggal di berkas butir). Task Antre atau Dikerjakan dengan tenggat sebelum hari ini langsung terbaca terlambat.',
    },
    batas: { judul: BATAS.judul, deskripsi: BATAS.deskripsi, output: BATAS.output, bukti: BATAS.bukti, panjangBukti: BATAS.panjangBukti, pendukung: BATAS.pendukung },
    aturan: [
      'Task baru selalu dimulai di Antre; status lain dicapai dengan aksi yang sama dengan tombol di ProductTrack (mulai, ajukan, selesai).',
      `Proyek: pilih proyek aktif dan sub-stage ADDIE. Ditinjau ${namaTinjau || 'peninjau'} sebelum selesai, jadi status tertingginya ${akhirProyek}${akhirProyek === 'Ditinjau' ? ' (wajib output)' : ''}, bukan Selesai.`,
      'Rutin: tanpa proyek, sub-stage rutin (R1–R4 dari Master). Tanpa tinjauan, jadi boleh langsung Selesai.',
      `Inisiatif: kirim sebagai jalur rutin dengan isian inisiatif (id INI-xxx). Tanpa proyek dan tanpa tinjauan; jenis rutin boleh kosong. Hanya inisiatif yang belum selesai (dipilih: aktif; yang ditunda diterima dengan peringatan). Khusus tim ${I.TIM_INISIATIF.map(I.singkatTim).join(', ')} dan Manager.`,
      `PIC bawaan ${pendek}. PIC lain hanya yang sah untuk sub-stage itu; status selain Antre hanya untuk task yang PIC-nya ${pendek}.`,
      'Bukti (hash commit atau path file) ditulis di Keterangan task; ProductTrack hanya menyimpan tautan web sebagai bukti terpisah.',
      'Sub-stage yang dinonaktifkan atau dihapus di Master dan proyek yang diarsipkan tidak bisa dipakai.',
    ],
  };
}

/* Satu baris untuk HASIL: jumlah pilihan yang terbaca. */
function ringkasPilihan(p) {
  const sub = p.substage.proyek.length + p.substage.rutin.length;
  return `${p.proyek.length} proyek, ${sub} sub-stage (${p.substage.rutin.length} rutin), ${p.orang.length} orang, ${p.inisiatif.length} inisiatif · data ${p.mode === 'real' ? 'real' : 'contoh'}${p.bisaBuat ? '' : ' (task belum bisa dibuat)'}`;
}

/* Pilihan yang sama sebagai teks untuk alat pilihan_task (sesi AI). */
function teksPilihan(p) {
  const s = p.profil;
  const tim = (arr) => (arr.length ? arr.join(', ') : '-');
  const baris = [
    `Pilihan form Tambah task untuk ${s.pendek}${s.timSingkat ? ` (${s.timSingkat})` : ''} · data ${p.mode === 'real' ? 'real' : 'contoh'} · ${K.tglPanjang(p.hari)}`,
  ];
  if (!p.bisaBuat) baris.push('Catatan: data contoh aktif, task belum bisa dibuat. Perubahan task hanya tersimpan di data real.');
  baris.push('', 'Aturan:', ...p.aturan.map(a => '- ' + a));
  baris.push('', 'Jalur:');
  for (const j of p.jalur) baris.push(`- ${j.kode}${j.jalurButir !== j.kode ? ` (dikirim sebagai jalur ${j.jalurButir})` : ''}: butuh ${j.wajib.join(' + ')}${j.opsional.length ? `, ${j.opsional.join('/')} opsional` : ''}. Status: ${p.statusAwal[j.kode].join(', ')}.${j.tersedia ? '' : ` Belum tersedia${j.alasan ? ': ' + j.alasan : ''}`}`);
  baris.push('', `Proyek aktif (${p.proyek.length}):`);
  for (const x of p.proyek.slice(0, 40)) baris.push(`- ${x.id} · ${K.potong(x.nama, 60)} · tahap ${x.namaTahap} · tim ${tim(x.timSingkat)}${x.timSaya ? ' (termasuk tim Anda)' : ''}`);
  if (p.proyek.length > 40) baris.push(`- …dan ${p.proyek.length - 40} lagi`);
  baris.push('', 'Sub-stage proyek (tim sendiri dulu):');
  const urut = [...p.substage.proyek.filter(x => x.timSaya), ...p.substage.proyek.filter(x => !x.timSaya)];
  for (const x of urut) baris.push(`- ${x.kode} ${x.nama} · ${x.namaTahap} · ${x.timSingkat || 'tim pemilik output'}${x.reviewManager ? ' · direview Manager' : ''}`);
  baris.push('', 'Sub-stage rutin: ' + (p.substage.rutin.map(x => `${x.kode} ${x.nama} (${x.timSingkat || '-'})`).join('; ') || '-'));
  baris.push('', `Inisiatif (${p.inisiatif.length}):`);
  for (const x of p.inisiatif) baris.push(`- ${x.id} · ${K.potong(x.nama, 60)} · ${x.statusLabel}${x.bisaDipilih ? '' : ' (tidak dipilih)'} · PIC ${I.orang(x.pic).pendek}`);
  if (!p.inisiatif.length) baris.push('- (tidak ada)');
  baris.push('', 'Orang: ' + p.orang.map(o => `${o.id} (${o.pendek}${o.tim ? ', ' + I.singkatTim(o.tim) : ''}${o.bolehPic ? ', boleh jadi PIC' : ''})`).join('; '));
  baris.push(`PIC bawaan: ${p.pic.bawaan}. ${p.tenggat.keterangan}`);
  return baris.join('\n');
}

/* ---------- Memeriksa butir ---------- */

function cariOrang(x) {
  const q = String(x).trim().toLowerCase();
  return I.ORANG.find(o => o.id === q || o.pendek.toLowerCase() === q) || null;
}
/* Inisiatif dari ID (INI-001, huruf kecil boleh) atau namanya yang persis (tanpa beda huruf besar). */
function cariInisiatif(data, mentah) {
  const q = String(mentah).trim();
  const daftar = data.inisiatif || [];
  const lewatId = daftar.find(x => x.id === q.toUpperCase());
  if (lewatId) return lewatId;
  const lewatNama = daftar.filter(x => String(x.nama).toLowerCase() === q.toLowerCase());
  return lewatNama.length === 1 ? lewatNama[0] : null;
}

/* ID butir (teks atau angka), atau ''. */
function idButir(b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return '';
  const t = sebagaiTeks(b.id);
  const id = t == null ? '' : satuBaris(t);
  return id.length <= BATAS.id ? id : '';
}
const kunciRekap = (tanggal, id) => `${tanggal}/${id}`;
/* ID perintah yang tetap untuk butir yang sama: kiriman ulang tersimpan sekali di server. */
const idPerintah = (kunci, langkah) => 'rk' + crypto.createHash('sha1').update(kunci).digest('hex').slice(0, 20) + '-' + (KODE_LANGKAH[langkah] || 'b');

/* Keterangan task: deskripsi, daftar bukti, lalu tanda bahwa agen yang mencatat. Bukti berupa
   hash commit atau path file, bukan tautan web, jadi tempatnya di Keterangan (alamat web di
   sana otomatis jadi tautan); bukti yang tak muat dipotong dan disebut jumlahnya. */
function susunKeterangan(deskripsi, bukti, tanggal) {
  const kaki = `Dicatat agen AI dari rekap kerja ${tanggal}.`;
  const sisa = BATAS.keterangan - deskripsi.length - kaki.length - 80;
  const baris = [];
  let panjang = 0;
  for (const b of bukti) {
    const l = `- ${b}`;
    if (panjang + l.length + 1 > sisa) break;
    baris.push(l);
    panjang += l.length + 1;
  }
  const luput = bukti.length - baris.length;
  if (luput) baris.push(`- …dan ${luput} lainnya`);
  const teks = [deskripsi, baris.length ? `Bukti:\n${baris.join('\n')}` : '', kaki].filter(Boolean).join('\n\n');
  return { teks: teks.slice(0, BATAS.keterangan), luput };
}

/* Pemeriksaan isian satu butir (tanpa menyentuh data). Sah → { ok: true, ... rencana }; tidak sah →
   { ok: false, id, alasan }. Semua kesalahan isian dikumpulkan sekaligus, supaya Ali memperbaikinya
   dalam satu putaran. Aturan Inti (proyek, sub-stage, PIC, inisiatif, urutan tunggu) dicoba
   terpisah di simulasi(), atas salinan data. */
function periksaButir(k, b, { tanggal, hari }) {
  const me = k.me;
  if (!b || typeof b !== 'object' || Array.isArray(b)) return { ok: false, id: '', alasan: 'Butir harus berupa objek.' };
  const id = idButir(b);
  if (!id) return { ok: false, id: '', alasan: `id butir wajib: teks unik, paling panjang ${BATAS.id} karakter.` };
  const galat = [];
  const peringatan = [];
  const teks = (nama, nilai) => {
    if (nilai === undefined || nilai === null) return '';
    const t = sebagaiTeks(nilai);
    if (t == null) { galat.push(`${nama} harus berupa teks.`); return ''; }
    return t;
  };

  const judul = satuBaris(teks('judul', b.judul));
  if (!judul) galat.push('Judul task wajib diisi.');
  else if (judul.length > BATAS.judul) galat.push(`Judul paling panjang ${BATAS.judul} karakter (sekarang ${judul.length}).`);

  // Jalur. "inisiatif" (nama jalur di form) diterima sebagai rutin yang bersama isian inisiatif.
  let jalur = satuBaris(teks('jalur', b.jalur)).toLowerCase();
  const idIniMentah = satuBaris(teks('inisiatif', b.inisiatif));
  const jalurIni = jalur === 'inisiatif';
  if (jalurIni) {
    jalur = 'rutin';
    if (!idIniMentah) galat.push('Jalur inisiatif butuh isian inisiatif (id, mis. INI-001).');
  }
  const jalurSah = JALUR.includes(jalur);
  if (!jalurSah) galat.push(`jalur harus "proyek" atau "rutin" (pembaruan inisiatif: "rutin" dengan isian inisiatif)${jalur ? `, bukan "${jalur}"` : ''}.`);

  // Proyek (jalur proyek) dan sub-stage.
  const idProyek = satuBaris(teks('proyek', b.proyek)).toUpperCase();
  let proyek = null;
  if (jalur === 'proyek') {
    if (!idProyek) galat.push('Jalur proyek butuh proyek (id, mis. PRJ-1).');
    else {
      proyek = (k.data.projects || []).find(p => p.id === idProyek) || null;
      if (!proyek) galat.push(`Proyek ${idProyek} tidak ditemukan.`);
      else if (proyek.arsip) galat.push(`Proyek ${proyek.id} sudah diarsipkan.`);
    }
  } else if (jalurSah && idProyek) {
    galat.push('Jalur rutin tidak memakai proyek. Pilih jalur proyek kalau task ini bagian dari proyek, atau kosongkan proyek.');
  }

  // Inisiatif: hanya untuk task di luar proyek (rutin), khusus tim DAE dan Manager, dan yang belum selesai.
  let inisiatif = null;
  if (idIniMentah) {
    if (jalur === 'proyek') galat.push('Inisiatif hanya untuk task di luar proyek (jalur rutin). Kosongkan proyek atau inisiatifnya.');
    else if (!I.bolehLihatInisiatif(me)) galat.push(`Inisiatif sementara khusus tim ${I.TIM_INISIATIF.map(I.singkatTim).join(', ')} dan Manager.`);
    else {
      inisiatif = cariInisiatif(k.data, idIniMentah);
      if (!inisiatif) {
        const ada = (k.data.inisiatif || []).filter(x => x.status !== 'selesai').sort(urutId).map(x => x.id).join(', ');
        galat.push(`Inisiatif ${idIniMentah} tidak ditemukan${ada ? ` (yang ada: ${ada})` : ''}.`);
      } else if (inisiatif.status === 'selesai') galat.push(`Inisiatif ${inisiatif.id} · ${inisiatif.nama} sudah selesai. Aktifkan lagi dulu di ProductTrack untuk menambah pembaruan.`);
      else if (inisiatif.status !== 'aktif') peringatan.push(`Inisiatif ${inisiatif.id} · ${inisiatif.nama} sedang ${String(inisiatif.status)}; pembaruan tetap dicatat.`);
    }
  }

  const kode = satuBaris(teks('sub', b.sub)).toUpperCase();
  if (jalurSah) {
    if (!kode) {
      if (!(jalur === 'rutin' && (idIniMentah || jalurIni))) galat.push(jalur === 'proyek' ? 'Sub-stage ADDIE wajib untuk task proyek.' : 'Jenis rutin (sub-stage R1–R4) wajib untuk task rutin.');
    } else {
      const s = I.subTahap(kode);
      if (!s) galat.push(`Sub-stage ${kode} tidak dikenal.`);
      else if (s.dihapus) galat.push(`Sub-stage ${s.kode} sudah dihapus dari Master. Pilih sub-stage lain.`);
      else if (s.aktif === false) galat.push(`Sub-stage ${s.kode} dinonaktifkan di Master. Pilih sub-stage lain.`);
      else if (jalur === 'proyek' && s.tahap === 'R') galat.push('Pilih sub-stage ADDIE untuk task proyek.');
      else if (jalur === 'rutin' && s.tahap !== 'R') galat.push('Task di luar proyek memakai sub-stage rutin (kode R).');
      else if (!I.subBolehBagi(me, s.kode)) galat.push(`${s.kode} dipegang tim lain atau direview Manager. Staff memakai sub-stage milik timnya sendiri.`);
    }
  }

  // PIC dan pendukung.
  let pic = me;
  const picMentah = satuBaris(teks('pic', b.pic));
  if (picMentah) {
    const o = cariOrang(picMentah);
    if (!o) galat.push(`PIC "${picMentah}" tidak dikenal. Pilihan: ${I.ORANG.map(x => x.id).join(', ')}.`);
    else pic = o.id;
  }
  let pendukung = [];
  if (b.pendukung !== undefined && b.pendukung !== null) {
    if (!Array.isArray(b.pendukung)) galat.push('pendukung harus berupa daftar id orang.');
    else {
      for (const x of b.pendukung) {
        const t = sebagaiTeks(x);
        const o = t == null ? null : cariOrang(t);
        if (!o) galat.push(`Pendukung "${t == null ? '?' : satuBaris(t)}" tidak dikenal.`);
        else if (o.id !== pic && !pendukung.includes(o.id)) pendukung.push(o.id);
      }
      if (pendukung.length > BATAS.pendukung) galat.push(`Pendukung paling banyak ${BATAS.pendukung} orang.`);
    }
  }

  // Tenggat: kosong = tanggal rekap.
  let tenggat = tanggal;
  const tenggatMentah = satuBaris(teks('tenggat', b.tenggat));
  if (tenggatMentah) {
    if (tanggalSah(tenggatMentah)) tenggat = tenggatMentah;
    else galat.push(`Tenggat "${tenggatMentah}" bukan tanggal YYYY-MM-DD yang sah.`);
  }

  // Status awal.
  let status = 'Antre';
  const statusMentah = satuBaris(teks('status', b.status));
  if (statusMentah && jalurSah) {
    const kanon = I.STATUS.find(s => s.toLowerCase() === statusMentah.toLowerCase());
    const boleh = statusJalur(jalur, me);
    if (!kanon) galat.push(`Status "${statusMentah}" tidak dikenal. Pilihan: ${boleh.join(', ')}.`);
    else if (!boleh.includes(kanon)) {
      galat.push(kanon === 'Selesai' ? `Task proyek ditinjau dulu, jadi tidak bisa langsung Selesai: pakai ${boleh[2]} (diajukan ke peninjau).`
        : jalur === 'proyek' ? 'Task proyek profil ini tanpa tinjauan: pakai Selesai, bukan Ditinjau.'
          : 'Jalur rutin dan inisiatif tanpa tinjauan: pakai Selesai, bukan Ditinjau.');
    } else status = kanon;
  }
  // (jalur tak sah: statusnya belum bisa dinilai; galat jalurnya sudah dicatat)
  if (status !== 'Antre' && pic !== me) galat.push(`Status ${status} hanya untuk task yang PIC-nya ${I.orang(me).pendek}. Task untuk ${I.orang(pic).pendek} dibuat di Antre.`);

  // Teks: deskripsi, output, bukti.
  const deskripsi = teksPanjang(teks('deskripsi', b.deskripsi));
  if (deskripsi.length > BATAS.deskripsi) galat.push(`Deskripsi paling panjang ${BATAS.deskripsi} karakter (sekarang ${deskripsi.length}).`);
  const output = satuBaris(teks('output', b.output));
  if (output.length > BATAS.output) galat.push(`Output paling panjang ${BATAS.output} karakter (sekarang ${output.length}).`);
  if (status === 'Ditinjau' && !output) galat.push('Status Ditinjau wajib output (ringkasan hasil kerja): task proyek tidak bisa diajukan tanpa output.');
  let bukti = [];
  if (b.bukti !== undefined && b.bukti !== null) {
    if (!Array.isArray(b.bukti)) galat.push('bukti harus berupa daftar teks (hash commit atau path file).');
    else {
      bukti = b.bukti.map(x => { const t = sebagaiTeks(x); if (t == null) galat.push('Isi bukti harus berupa teks.'); return satuBaris(t == null ? '' : t); }).filter(Boolean);
      if (bukti.length > BATAS.bukti) galat.push(`Bukti paling banyak ${BATAS.bukti} butir (sekarang ${bukti.length}).`);
      if (bukti.some(x => x.length > BATAS.panjangBukti)) galat.push(`Satu bukti paling panjang ${BATAS.panjangBukti} karakter.`);
    }
  }
  if (adaRahasia([judul, deskripsi, output, ...bukti].join('\n'))) galat.push('Teks butir tampak memuat rahasia (kunci API, password, atau token). Hapus bagian itu dulu; ProductTrack dilihat seluruh tim.');

  const asing = Object.keys(b).filter(x => !KOLOM.includes(x));
  if (asing.length) peringatan.push(`Kolom tak dikenal diabaikan: ${asing.join(', ')}.`);
  if (galat.length) return { ok: false, id, alasan: galat.join(' ') };

  if (tenggat < tanggal) peringatan.push('Tenggat lebih awal dari tanggal rekap.');
  if (tenggat < hari && (status === 'Antre' || status === 'Dikerjakan')) peringatan.push('Tenggat sudah lewat, jadi task langsung terbaca terlambat.');
  const ket = susunKeterangan(deskripsi, bukti, tanggal);
  if (ket.luput) peringatan.push(`${ket.luput} bukti tidak muat di Keterangan task.`);
  return {
    ok: true, id, kunci: kunciRekap(tanggal, id), judul, jalur, proyek: proyek ? proyek.id : '', inisiatif: inisiatif ? inisiatif.id : '', sub: kode, pic, pendukung,
    tenggat, statusTask: status, rantai: rantaiStatus(jalur, status, me), peringatan,
    f: {
      title: judul, project: proyek ? proyek.id : '', sub: kode, pic, support: pendukung, due: tenggat, priority: 'Normal',
      output, detail: ket.teks, induk: '', inisiatif: inisiatif ? inisiatif.id : '',
    },
  };
}

/* Mencoba rencana butir dengan aturan Inti atas salinan `kerja` (task baru lalu aksi statusnya,
   persis urutan penulisan sungguhan). Sah → { ok, data } (salinan sesudahnya, supaya butir
   berikutnya diperiksa terhadap keadaan yang sudah menerima yang ini); tidak → { ok: false, galat }. */
function simulasi(kerja, x, { me, tanggal, waktu }) {
  const salinan = structuredClone(kerja);
  const r = I.jalankanPerintah(salinan, { id: 'uji', aksi: 'taskBaru', isi: { f: x.f }, oleh: me, at: waktu, hari: tanggal });
  if (!r.ok) return { ok: false, galat: r.galat };
  let n = 0;
  for (const l of x.rantai) {
    const s = I.jalankanPerintah(salinan, { id: 'uji', aksi: 'terapkanAksi', isi: { task: r.hasil.id, kunci: l.kunci, catatan: '' }, oleh: me, at: waktu + (++n), hari: tanggal });
    if (!s.ok) return { ok: false, galat: `Status ${x.statusTask} belum bisa dicapai: ${tanpaTitik(s.galat)}.${/^Menunggu/.test(s.galat) ? ' Pakai status Antre kalau belum bisa dimulai.' : ''}` };
  }
  return { ok: true, data: salinan };
}

/* Seluruh butir sekaligus, berurutan: [{ status: 'sah' | 'ditolak' | 'dilewati', id, ... }]. Butir
   yang sudah tercatat (sudah = rekap.butir) dilewati tanpa diperiksa. Butir sah diperiksa
   terhadap keadaan yang sudah menerima butir sah sebelumnya. */
function periksaSemua(k, daftar, { tanggal, hari, waktu = Date.now(), sudah = {} }) {
  let kerja = structuredClone(k.data);
  const lihat = new Set();
  return daftar.map(b => {
    const id = idButir(b);
    if (!id) return { status: 'ditolak', id: '', alasan: periksaButir(k, b, { tanggal, hari }).alasan };
    if (lihat.has(id)) return { status: 'ditolak', id, alasan: 'id butir ganda di berkas; setiap butir perlu id sendiri.' };
    lihat.add(id);
    const ada = sudah[kunciRekap(tanggal, id)];
    if (ada) return { status: 'dilewati', id, task: ada.task, alasan: `Sudah dibuat sebagai ${ada.task} (${tglWaktu(ada.pada)}); tidak dibuat lagi.` };
    const r = periksaButir(k, b, { tanggal, hari });
    if (!r.ok) return { status: 'ditolak', id, alasan: r.alasan };
    const coba = simulasi(kerja, r, { me: k.me, tanggal, waktu });
    if (!coba.ok) return { status: 'ditolak', id, alasan: coba.galat };
    kerja = coba.data;
    return { ...r, status: 'sah' };
  });
}

function tglWaktu(at) {
  if (!at) return 'sebelumnya';
  const d = new Date(at);
  return `${K.tglPendek(I.isoHari(at))} ${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`;
}

/* ---------- Catatan butir yang sudah dibuat ---------- */

function bacaRekap(folder) {
  try {
    const r = JSON.parse(fs.readFileSync(path.join(folder, BERKAS_REKAP), 'utf8'));
    if (r && typeof r === 'object' && r.butir && typeof r.butir === 'object' && !Array.isArray(r.butir)) return r;
  } catch (e) { /* belum ada atau rusak: mulai dari kosong */ }
  return { versi: 1, butir: {} };
}
function tulisJson(berkas, isi) {
  fs.mkdirSync(path.dirname(berkas), { recursive: true });
  const sementara = berkas + '.tmp';
  fs.writeFileSync(sementara, JSON.stringify(isi, null, 2) + '\n');
  fs.renameSync(sementara, berkas);
}
const tulisRekap = (folder, rekap) => tulisJson(path.join(folder, BERKAS_REKAP), rekap);

/* ---------- Menulis ke ProductTrack ---------- */

/* Urutan status untuk melewati langkah yang sudah terlewati: Ditinjau dan Selesai sama tinggi. */
const urutStatus = s => ({ Antre: 0, Dikerjakan: 1, Ditinjau: 2, Selesai: 2 })[s] || 0;

/* Penolakan aturan/izin (permanen) atau gangguan sementara (jaringan, server)? */
const permanen = e => e instanceof K.GalatAgen && (e.kode === 'ATURAN' || e.kode === 'AGEN' || e.http === 400 || e.http === 403 || e.http === 409);
/* Penolakan server sebelum 2.37.0: "Agen AI tidak boleh melakukan "taskBaru"" (api/rpc.js). */
const serverLama = e => e instanceof K.GalatAgen && e.http === 403 && /tidak boleh melakukan "taskBaru"/.test(e.message);
const pesanGalat = e => (e && e.message ? e.message : String(e));
const tanpaTitik = s => String(s).replace(/[.\s]+$/, '');

function idTaskDari(e, judul) {
  if (e && e.hasil && e.hasil.id) return e.hasil.id;
  const baris = e && e.ubah && e.ubah.tasks && e.ubah.tasks.pasang;
  if (!Array.isArray(baris) || !baris.length) return '';
  return (baris.find(t => t.title === judul) || baris[0]).id;
}

/* Menulis satu butir yang sudah lolos periksaSemua: buat task, lalu aksi statusnya. Keadaan k
   (hasil klien.muat()) disamakan dengan perubahan yang dikembalikan server, jadi butir
   berikutnya tak perlu menarik data lagi. */
async function tulisButir(klien, k, x, { tanggal, folder, rekap }) {
  const hasil = { id: x.id, status: 'dibuat', judul: x.judul, jalur: x.jalur, proyek: x.proyek, inisiatif: x.inisiatif, sub: x.sub, pic: x.pic, task: '', statusTask: 'Antre', peringatan: [...x.peringatan] };
  let e;
  try {
    e = await klien.ubah('taskBaru', { f: x.f }, { id: idPerintah(x.kunci, 'baru'), hari: tanggal, k });
  } catch (err) {
    // Server yang belum diperbarui menolak setiap pembuatan: hentikan seluruh jalan, jangan 12 penolakan kembar.
    if (serverLama(err)) throw new K.GalatAgen('Server ProductTrack belum mendukung agen membuat task (butuh versi 2.37.0 atau lebih baru). Deploy server dulu; belum ada task yang dibuat.', 'SERVER_LAMA', 403);
    return { id: x.id, status: 'ditolak', judul: x.judul, alasan: `Task tidak dibuat: ${pesanGalat(err)}`, ...(permanen(err) ? {} : { bisaDiulang: true }) };
  }
  const task = idTaskDari(e, x.judul);
  if (!task) return { id: x.id, status: 'ditolak', judul: x.judul, alasan: 'Task tidak dibuat: server tidak mengembalikan nomor task.', bisaDiulang: true };
  hasil.task = task;
  // ulang = server mengenali perintah ini (jalan sebelumnya sudah menyimpannya): task-nya sudah ada.
  const ulang = !!e.ulang;
  if (ulang) {
    if (!k.data.tasks.some(t => t.id === task)) Object.assign(k, await klien.muat());
  } else if (e.ubah) I.terapkanUbah(k.data, e.ubah);
  const tugas = () => k.data.tasks.find(t => t.id === task);

  let lanjut = 0;
  for (const l of x.rantai) {
    const t = tugas();
    if (!t) { hasil.peringatan.push(`Status tidak diubah: ${task} tidak ditemukan lagi di data.`); break; }
    if (urutStatus(t.status) >= urutStatus(l.ke)) continue;   // sudah sampai (atau lewat): jangan diulang
    try {
      const e2 = await klien.ubah('terapkanAksi', { task, kunci: l.kunci, catatan: '' }, { id: idPerintah(x.kunci, l.kunci), hari: tanggal, k });
      if (e2.ulang) Object.assign(k, await klien.muat());
      else if (e2.ubah) I.terapkanUbah(k.data, e2.ubah);
      lanjut++;
    } catch (err) {
      if (permanen(err)) hasil.peringatan.push(`Status berhenti di ${t.status}: ${pesanGalat(err)}`);
      else {
        hasil.bisaDiulang = true;
        hasil.peringatan.push(`Terputus saat mengubah status (${tanpaTitik(pesanGalat(err))}). Jalankan ulang untuk melanjutkan; task tidak akan digandakan.`);
      }
      break;
    }
  }
  const akhir = tugas();
  hasil.statusTask = akhir ? akhir.status : 'Antre';
  if (!ulang && hasil.statusTask !== x.statusTask && !hasil.peringatan.some(p => /^(Status|Terputus)/.test(p))) hasil.peringatan.push(`Status akhir ${hasil.statusTask}, bukan ${x.statusTask}.`);
  // Tercatat sebagai selesai kecuali terputus: yang terputus dilanjutkan jalan ulang (ID perintahnya tetap).
  if (!hasil.bisaDiulang) {
    rekap.butir[x.kunci] = { task, status: hasil.statusTask, diminta: x.statusTask, pada: klien.jam() };
    tulisRekap(folder, rekap);
  }
  if (!hasil.peringatan.length) delete hasil.peringatan;
  // Task-nya sudah ada sejak jalan sebelumnya (catatan lokal hilang atau jalannya terputus): bukan task baru.
  if (ulang) return { ...hasil, status: 'dilewati', alasan: `Sudah dibuat sebagai ${task} (dikenali server); tidak dibuat lagi.${lanjut ? ` Status dilanjutkan sampai ${hasil.statusTask}.` : ''}` };
  return hasil;
}

/* Memeriksa (dan, kalau bukan uji, menulis) butir-butir satu berkas. Mengembalikan
   { tanggal, uji, hasil: [{ id, status, ... }] }; galat fatal (data contoh, tanggal belum terjadi,
   server tak terjangkau) dilempar sebelum ada yang ditulis. */
async function proses(klien, { tanggal, butir, uji = false, folder }) {
  const hari = I.isoHari(klien.jam());
  if (tanggal > hari) throw new K.GalatAgen(`Tanggal rekap ${tanggal} belum terjadi (hari ini ${hari}).`, 'TANGGAL');
  const k = await klien.muat();
  if (k.mode !== 'real') throw new K.GalatAgen('ProductTrack sedang memakai data contoh. Task hanya bisa dibuat di data real; minta Dev memindahkan sumber datanya.', 'SUMBER');
  const rekap = bacaRekap(folder);
  const periksa = periksaSemua(k, butir, { tanggal, hari, waktu: klien.jam(), sudah: rekap.butir });
  const hasil = [];
  for (const p of periksa) {
    if (p.status === 'ditolak') hasil.push({ id: p.id, status: 'ditolak', alasan: p.alasan });
    else if (p.status === 'dilewati') hasil.push({ id: p.id, status: 'dilewati', task: p.task, alasan: p.alasan });
    else if (uji) {
      hasil.push({ id: p.id, status: 'sah', judul: p.judul, jalur: p.jalur, proyek: p.proyek, inisiatif: p.inisiatif, sub: p.sub, pic: p.pic, statusTask: p.statusTask, ...(p.peringatan.length ? { peringatan: p.peringatan } : {}) });
    } else hasil.push(await tulisButir(klien, k, p, { tanggal, folder, rekap }));
  }
  return { tanggal, uji, hasil };
}

/* Satu butir dari alat buat_task (sesi AI). ID-nya, kalau tak diberikan, diturunkan dari isinya,
   jadi pemanggilan ulang dengan isi yang sama di tanggal yang sama tidak membuat task kedua. */
async function buatSatu(klien, a) {
  const tanggal = a.tanggal ? String(a.tanggal).trim() : I.isoHari(klien.jam());
  if (!tanggalSah(tanggal)) throw new K.GalatAgen(`tanggal harus YYYY-MM-DD yang sah, bukan "${tanggal}".`, 'ISIAN');
  const dasar = [tanggal, a.judul, a.jalur, a.proyek, a.inisiatif, a.sub, a.pic].map(v => String(v == null ? '' : v).trim().toLowerCase()).join('|');
  const butir = {
    id: a.id ? String(a.id) : 'mcp-' + crypto.createHash('sha1').update(dasar).digest('hex').slice(0, 12),
    judul: a.judul, jalur: a.jalur, proyek: a.proyek, inisiatif: a.inisiatif, sub: a.sub, pic: a.pic, tenggat: a.tenggat, status: a.status,
    deskripsi: a.deskripsi, output: a.output, bukti: a.bukti, pendukung: a.pendukung,
  };
  const r = await proses(klien, { tanggal, butir: [butir], uji: false, folder: klien.folderData });
  const x = r.hasil[0];
  if (x.status === 'ditolak') throw new K.GalatAgen(x.alasan, 'ATURAN');
  return x;
}

/* ---------- Teks hasil ---------- */

const NAMA_JALUR = { proyek: 'proyek', rutin: 'rutin' };
function barisButir(x) {
  const judul = x.judul ? ` · ${K.potong(x.judul, 60)}` : '';
  const letak = x => [x.inisiatif ? `inisiatif ${x.inisiatif}` : NAMA_JALUR[x.jalur], x.proyek, x.sub].filter(Boolean).join(' ');
  const baris = [];
  if (x.status === 'dibuat') baris.push(`  • ${x.id} · dibuat ${x.task} · ${x.statusTask}${judul}`);
  else if (x.status === 'sah') baris.push(`  • ${x.id} · sah (${letak(x)}) · akan ${x.statusTask}${judul}`);
  else if (x.status === 'dilewati') baris.push(`  • ${x.id || '(tanpa id)'} · dilewati · ${x.alasan}`);
  else baris.push(`  • ${x.id || '(tanpa id)'} · DITOLAK · ${x.alasan}`);
  for (const p of x.peringatan || []) baris.push(`      ! ${p}`);
  return baris;
}
function barisHasil(r) {
  const n = s => r.hasil.filter(x => x.status === s).length;
  const lewat = n('dilewati');
  const putus = r.hasil.filter(x => x.bisaDiulang).length;
  const tambah = [lewat ? `${lewat} dilewati` : '', putus ? `${putus} terputus, jalankan ulang` : ''].filter(Boolean).join(', ');
  const kepala = r.uji ? `uji: ${n('sah')} butir sah, ${n('ditolak')} ditolak` : `${n('dibuat')} task dibuat, ${n('ditolak')} ditolak`;
  return kepala + (tambah ? ` (${tambah})` : '');
}
function teksHasilSatu(x) {
  if (x.status === 'dilewati') return `Butir ini sudah dibuat sebagai ${x.task}; tidak dibuat lagi.`;
  const orang = I.orang(x.pic).pendek;
  const letak = [x.inisiatif ? `inisiatif ${x.inisiatif}` : x.jalur === 'proyek' ? `proyek ${x.proyek}` : 'rutin', x.sub].filter(Boolean).join(' · ');
  const out = [`${x.task} dibuat untuk ${orang} · ${letak} · status ${x.statusTask}. Tampil di ProductTrack dengan tanda AI.`];
  for (const p of x.peringatan || []) out.push('Peringatan: ' + p);
  return out.join('\n');
}

/* ---------- Berkas butir dan opsi baris perintah ---------- */

/* BOM di awal berkas (disimpan editor Windows) dibuang sebelum dibaca sebagai JSON. */
const tanpaBom = teks => (teks.charCodeAt(0) === 0xFEFF ? teks.slice(1) : teks);

/* { tanggal, butir } dari berkas JSON usulan. Kesalahan di tingkat berkas melempar GalatAgen. */
function bacaBerkasButir(berkas) {
  let st;
  try { st = fs.statSync(berkas); } catch (e) { throw new K.GalatAgen(`Berkas tidak ditemukan: ${berkas}`, 'BERKAS'); }
  if (!st.isFile()) throw new K.GalatAgen(`Bukan berkas: ${berkas}`, 'BERKAS');
  if (st.size > BATAS.berkas) throw new K.GalatAgen(`Berkas terlalu besar (maks. ${BATAS.berkas / 1024 / 1024} MB).`, 'BERKAS');
  let isi;
  try { isi = JSON.parse(tanpaBom(fs.readFileSync(berkas, 'utf8'))); } catch (e) { throw new K.GalatAgen(`Berkas bukan JSON yang sah: ${e.message}`, 'BERKAS'); }
  if (!isi || typeof isi !== 'object' || Array.isArray(isi)) throw new K.GalatAgen('Isi berkas harus objek { "tanggal": "YYYY-MM-DD", "butir": [...] }.', 'BERKAS');
  if (!tanggalSah(isi.tanggal)) throw new K.GalatAgen('tanggal di berkas wajib berbentuk YYYY-MM-DD yang sah.', 'BERKAS');
  if (!Array.isArray(isi.butir)) throw new K.GalatAgen('butir di berkas harus berupa daftar.', 'BERKAS');
  if (isi.butir.length > BATAS.butir) throw new K.GalatAgen(`Terlalu banyak butir (${isi.butir.length}; maks. ${BATAS.butir} per berkas).`, 'BERKAS');
  return { tanggal: isi.tanggal, butir: isi.butir };
}

/* Isi berkas <berkas>.hasil.json. */
function hasilBerkas(r, berkas) {
  const n = s => r.hasil.filter(x => x.status === s).length;
  return {
    versi: 1, berkas, tanggal: r.tanggal, uji: r.uji, waktu: Date.now(),
    ringkas: { dibuat: n('dibuat'), sah: n('sah'), ditolak: n('ditolak'), dilewati: n('dilewati') },
    butir: r.hasil,
  };
}

/* --opsi nilai | --opsi=nilai; nilai = opsi yang butuh nilai, tanda = opsi tanpa nilai. */
function bacaArgumen(argv, { nilai = [], tanda = [] }) {
  const hasil = {};
  for (let i = 0; i < argv.length; i++) {
    let a = argv[i];
    let v;
    const sama = a.startsWith('--') ? a.indexOf('=') : -1;
    if (sama > 0) { v = a.slice(sama + 1); a = a.slice(0, sama); }
    if (tanda.includes(a)) {
      if (v !== undefined) throw new K.GalatAgen(`Opsi ${a} tidak memakai nilai.`, 'OPSI');
      hasil[a] = true;
    } else if (nilai.includes(a)) {
      if (v === undefined) v = argv[++i];
      if (v === undefined || v === '' || String(v).startsWith('--')) throw new K.GalatAgen(`Opsi ${a} butuh nilai.`, 'OPSI');
      hasil[a] = v;
    } else throw new K.GalatAgen(`Opsi tidak dikenal: ${a}. Lihat --help.`, 'OPSI');
  }
  return hasil;
}

/* Opsi untuk buatKlien. --env menunjuk berkas setelan lain (hanya dicek ada atau tidak di sini;
   isinya dibaca klien dan tak pernah dicetak). */
function opsiKlien(berkasEnv) {
  if (!berkasEnv) return {};
  const lengkap = path.resolve(berkasEnv);
  let ada = false;
  try { ada = fs.statSync(lengkap).isFile(); } catch (e) { ada = false; }
  if (!ada) throw new K.GalatAgen(`Berkas --env tidak ditemukan: ${lengkap}`, 'OPSI');
  return { berkasEnv: lengkap };
}

/* Tujuan --keluaran: berkas, atau folder (dipakai nama bawaan di dalamnya). */
function tujuanKeluaran(arg, bawaan) {
  if (!arg) return bawaan;
  const lengkap = path.resolve(arg);
  let folder = false;
  try { folder = fs.statSync(lengkap).isDirectory(); } catch (e) { folder = false; }
  return folder || /[\\/]$/.test(arg) ? path.join(lengkap, path.basename(bawaan)) : lengkap;
}

module.exports = {
  BATAS, KOLOM, tanggalSah, statusJalur, rantaiStatus, susunPilihan, ringkasPilihan, teksPilihan, periksaButir, periksaSemua, simulasi, kunciRekap, idPerintah,
  bacaRekap, tulisRekap, tulisJson, tulisButir, proses, buatSatu, barisButir, barisHasil, teksHasilSatu, bacaBerkasButir, hasilBerkas, bacaArgumen, opsiKlien, tujuanKeluaran,
};
