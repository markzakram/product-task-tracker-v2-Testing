/* =============================================================================
   app.js — tampilan ProductTrack v2.

   Aturan alur ada di inti.js (window.Inti); berkas ini hanya menggambar dan
   meneruskan klik ke aturan itu. Data contoh dimuat dari server setelah PIN
   benar; suntingan disimpan di browser ini (localStorage) sampai ada impor data
   contoh versi baru.

   Sidebar kiri: Ringkasan · Pekerjaan (Rancangan Paket → Proyek → Task → Komunikasi) ·
   Ruang Saya · Manajer · Bantuan. Task satu halaman dengan lima tampilan (Daftar,
   Kanban, Per orang, Timeline, Kalender). Setiap halaman, task, proyek, dan paket
   punya alamat sendiri di URL, mis. #/task/kanban/PRD-123. Ctrl+K membuka kotak cari
   & lompat. Di ponsel sidebar menjadi laci, ditambah bilah bawah. Halaman pertama
   mengikuti peran: Manager → Proyek, Lead & Staff → Hari Ini.
   ========================================================================== */

(function () {
  'use strict';

  const I = window.Inti;
  const $ = (s, akar = document) => akar.querySelector(s);
  const $$ = (s, akar = document) => [...akar.querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hariIni = () => I.isoHari(Date.now());
  const hp = () => window.matchMedia('(max-width: 899px)').matches;
  const tautanAman = u => /^https?:\/\//i.test(String(u || ''));
  const potong = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1).trimEnd() + '…' : String(s));
  /* Teks bebas (tujuan proyek, keterangan task) dengan alamat web yang bisa diklik.
     Tanda baca penutup kalimat di ujung alamat tidak ikut jadi bagian tautan. */
  function teksBertaut(s) {
    const str = String(s == null ? '' : s);
    const pola = /https?:\/\/[^\s<>"']+/g;
    let hasil = '', i = 0, m;
    while ((m = pola.exec(str))) {
      const u = m[0].replace(/[.,;:!?)\]]+$/, '');
      hasil += esc(str.slice(i, m.index)) + `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(u)}</a>`;
      i = m.index + u.length;
      pola.lastIndex = i;
    }
    return hasil + esc(str.slice(i));
  }

  /* ---------- Penyimpanan di browser ---------- */

  const AWALAN = 'pt2_';
  const ambil = (k, bawaan) => { try { const v = localStorage.getItem(AWALAN + k); return v == null ? bawaan : JSON.parse(v); } catch (e) { return bawaan; } };
  const simpan = (k, v) => { try { localStorage.setItem(AWALAN + k, JSON.stringify(v)); } catch (e) { /* penuh atau diblokir: tetap jalan */ } };
  const hapus = k => { try { localStorage.removeItem(AWALAN + k); } catch (e) { /* abaikan */ } };

  /* ---------- Halaman di sidebar ---------- */

  const HALAMAN = [
    { grup: 'Ringkasan', id: 'hari', judul: 'Hari Ini', ikon: 'matahari' },
    { grup: 'Ringkasan', id: 'dashboard', judul: 'Dashboard', ikon: 'grafik' },
    { grup: 'Ringkasan', id: 'laporan', judul: 'Laporan', ikon: 'laporan', peran: ['lead', 'manager'] },
    { grup: 'Pekerjaan', id: 'paket', judul: 'Rancangan Paket', ikon: 'kotak' },
    { grup: 'Pekerjaan', id: 'proyek', judul: 'Proyek', ikon: 'lapis' },
    { grup: 'Pekerjaan', id: 'task', judul: 'Task', ikon: 'tugas' },
    { grup: 'Pekerjaan', id: 'komunikasi', judul: 'Komunikasi', ikon: 'obrolan' },
    { grup: 'Ruang Saya', id: 'link', judul: 'Link Saya', ikon: 'penanda' },
    { grup: 'Ruang Saya', id: 'catatan', judul: 'Catatan Saya', ikon: 'catatan' },
    { grup: 'Manajer', id: 'riwayat', judul: 'Riwayat Aktivitas', ikon: 'riwayat', peran: ['manager'] },
    { grup: 'Manajer', id: 'master', judul: 'Master', ikon: 'atur', peran: ['manager'] },
    { grup: 'Bantuan', id: 'panduan', judul: 'Panduan', ikon: 'buku' },
    { grup: 'Dev', id: 'dev', judul: 'Panel Dev', ikon: 'kode', dev: true },
  ];
  const NAV_BAWAH = ['hari', 'task', 'proyek', 'komunikasi'];
  /* Tampilan halaman Task. Sampai 0.7.0 masing-masing menjadi halaman sendiri di sidebar. */
  const TAMPILAN = [
    { id: 'daftar', judul: 'Daftar', ikon: 'daftar' },
    { id: 'kanban', judul: 'Kanban', ikon: 'kolom' },
    { id: 'orang', judul: 'Per orang', ikon: 'orang' },
    { id: 'timeline', judul: 'Timeline', ikon: 'timeline' },
    { id: 'kalender', judul: 'Kalender', ikon: 'kalender' },
  ];
  const ID_TAMPILAN = TAMPILAN.map(x => x.id);

  /* Halaman yang tersimpan di browser versi lama: 0.3.0 memakai kunci "view" ("laporan" dulu
     berisi angka yang kini jadi Dashboard); 0.4–0.7 punya Kanban, Task List, Timeline,
     Kalender, dan Dashboard Lain sebagai halaman sendiri. */
  function halamanTersimpan() {
    const kini = ambil('halaman', null);
    if (kini) return kini;
    const lama = ambil('view', '');
    hapus('view');
    return ({ papan: 'kanban', laporan: 'dashboard' })[lama] || lama || '';
  }
  function halamanBoleh(id) {
    const h = HALAMAN.find(x => x.id === id);
    if (!h) return false;
    if (h.dev) return modeDev();
    return !h.peran || h.peran.includes(I.orang(S.me).peran);
  }
  const halamanAwal = () => (S.me === I.DEV ? 'dev' : I.orang(S.me).peran === 'manager' ? 'proyek' : 'hari');
  /* Saringan task bersama semua tampilan Task (PRD: per tahap, sub-stage, tim, platform). */
  const SARING_KOSONG = { jalur: '', tahap: '', sub: '', tim: '', platform: '' };
  /* Preferensi Task tersimpan. lk 2 = lingkup per peran (0.9.0); lingkup tersimpan sebelum itu
     dibuang karena "tim" Manager dulu berarti seluruh divisi, kini para Lead. */
  function prefTask() {
    const p = ambil('task', {});
    if (p.lk !== 2) delete p.lingkup;
    return p;
  }

  const S = {
    data: null,
    versi: '',
    sumber: '',
    dimuat: 0,
    me: ambil('me', null),
    view: halamanTersimpan(),
    pilih: null,
    proyek: null,
    /* Tahap yang diklik di jalur ADDIE: { proyek, tahap } — bagiannya dibuka di halaman proyek. */
    tahapBuka: null,
    /* Sub-task yang sedang diubah di detail task: { task, sub }. */
    ubahSub: null,
    /* Sumber data (2.16.0): 'contoh' atau 'real', dipilih mode Dev untuk semua pengguna. */
    mode: 'contoh',
    /* Data real (lihat ubahData): dasar = yang sudah tersimpan di server; tertunda = perintah
       browser ini yang belum diterapkan di dasar. pribadi = Link Saya dan Catatan Saya di data
       real, yang tetap di browser ini. */
    real: { generasi: '', seq: 0, dasar: null, tertunda: [], mengirim: false, gagal: 0, galat: '' },
    pribadi: { links: [], notes: [] },
    proyekArsip: false,
    task: Object.assign({ tampilan: 'daftar', lingkup: '', fokus: '', proyek: '', ...SARING_KOSONG, status: 'aktif', urut: 'due', arah: 1 },
      prefTask(), { q: '', hal: 1, saringBuka: false }),
    jadwal: { kelompok: 'proyek', mulai: '' },
    kal: { bulan: '', hari: '' },
    /* Lingkup kosong = bawaan peran (I.lingkupAwal); yang tak boleh bagi peran itu ikut jatuh ke sana. */
    dash: { lingkup: '' },
    lap: { periode: 'minggu', tim: '', buka: '' },
    /* Komunikasi: pilih = ruang yang terbuka (task:PRD-…, proyek:PRJ-…, tim:AK); balas/ubah = id
       pesan di kotak tulis; tanya = pesan berikut menunggu jawaban; draf per ruang. */
    kom: { lingkup: 'terlibat', q: '', saring: 'semua', pilih: null, balas: '', ubah: '', tanya: false, draf: {}, konteks: ambil('kom_konteks', !hp()), proyekSemua: false, lompat: '', batasBaru: null, keBawah: false },
    /* Pesan bersama dari tab obrolan spreadsheet v2 (lihat tarikObrolan). */
    obr: { peristiwa: [], sejak: 0, versi: 0, diperbarui: 0, galat: '', gagal: 0, menarik: false },
    pkt: { q: '', platform: [], dari: '', sampai: '', atur: false, pilih: null, sunting: false, kotor: false },
    /* penuh = kartu folder yang sedang menampilkan semua link-nya (selama sesi ini). */
    lnk: { q: '', penuh: new Set() },
    /* pilih = catatan yang terbuka di editor: id, '__baru' (belum tersimpan), atau null.
       warna = saringan warna; folderBaru = folder catatan baru; versiSesi = catatan yang versi
       awal sesi ini sudah disimpan. */
    ctt: { q: '', pilih: null, warna: '', folderBaru: '', versiSesi: '' },
    rwy: { jenis: '', orang: '', q: '', batas: 100 },
    pnd: { tab: ambil('pnd_tab', 'mulai'), buka: '' },
    /* Panduan yang sedang dicoba: langkahnya tampil di kotak melayang (#pemandu). */
    pemandu: null,
    pemanduKecil: false,
    palet: { q: '', pilih: 0 },
    notif: { buka: false, sebelum: 0 },
    /* Foto profil dari tab foto spreadsheet v2: isi = { orang: { gambar, diperbarui } }, sejak =
       waktu foto terbaru yang dimiliki (tarikan berikutnya hanya yang berubah). */
    foto: Object.assign({ sejak: 0, isi: {} }, ambil('foto', {}), { ditarik: 0, menarik: false }),
    navBuka: false,
    modal: null,
    seret: null,
    /* Mode Dev (0.13.0): dev = sesi Dev dari server; devSampai = kapan berakhir; pratinjau =
       sedang "Lihat sebagai" (S.me sementara orang itu); orangBaris = baris tab orang dari
       server (organogram terkini), orangSalah = alasan tab itu diabaikan. */
    dev: false, devSampai: 0, devSistem: null, devTab: 'sistem', pratinjau: null, orangBaris: [], orangSalah: '',
    /* Master & PIN profil (0.14.0): masterBaris = baris tab master dari server, masterSalah = jenis
       yang diabaikan karena rusak (beserta alasannya), berpin = profil yang memakai PIN pribadi,
       meSesi = profil yang sudah terbukti di sesi server ini (lewat PIN-nya, atau tak ber-PIN). */
    masterBaris: [], masterSalah: {}, berpin: new Set(), meSesi: '', mst: { tab: 'substage' },
  };
  {
    const KE_TAMPILAN = { kanban: 'kanban', daftar: 'daftar', timeline: 'timeline', kalender: 'kalender' };
    if (KE_TAMPILAN[S.view]) Object.assign(S, { view: 'task', task: { ...S.task, tampilan: KE_TAMPILAN[S.view] } });
    if (S.view === 'dashlain') S.view = 'link';
    if (!ID_TAMPILAN.includes(S.task.tampilan)) S.task.tampilan = 'daftar';
  }

  /* Selama "Lihat sebagai" (mode Dev) tak ada yang disimpan: perubahannya dibuang saat kembali. */
  function simpanData() {
    if (S.pratinjau) return;
    if (S.mode === 'real') {
      // Data bersama sudah dikirim lewat ubahData; di sini hanya salinan cepatnya dan data pribadi.
      S.pribadi = { links: S.data.links || [], notes: S.data.notes || [] };
      return simpanCacheReal();
    }
    simpan('data', { versi: S.versi, dimuat: S.dimuat, data: S.data });
  }

  /* ---------- Data real (2.16.0) ----------
     Satu pintu semua perubahan data bersama: ubahData(aksi, isi), dengan aksi = nama aturan di
     inti (Inti.AKSI_DATA). Data contoh: perintahnya dijalankan di browser ini saja. Data real:
     dijalankan di sini dulu supaya terasa seketika, lalu dikirim ke server; server memeriksanya
     dengan aturan yang sama dan menyimpan perubahannya untuk semua orang. Yang ditolak server
     dibatalkan di sini. S.real.dasar = keadaan yang sudah tersimpan (hanya diubah perubahan dari
     server); S.data = dasar + perintah yang belum tersimpan + Link/Catatan pribadi. */
  let urutPerintah = 0;
  const idPerintah = () => 'b' + Date.now().toString(36) + (urutPerintah++ % 1296).toString(36).padStart(2, '0') + Math.random().toString(36).slice(2, 6);
  function ubahData(aksi, isi) {
    const real = S.mode === 'real';
    if (real && S.pratinjau) throw new Error('Mode Lihat sebagai: tampilan saja, perubahan data real tidak dikirim.');
    if (real && S.me === I.DEV) throw new Error('Mode Dev tidak mengubah data real. Pilih profil untuk mengerjakannya.');
    const p = { id: idPerintah(), aksi, isi, oleh: S.me, at: Date.now(), hari: hariIni() };
    if (real && S.data === S.real.dasar) S.data = salinanDasar();
    const r = I.jalankanPerintah(S.data, p);
    if (!r.ok) {
      if (real) susunReal();
      throw new Error(r.galat);
    }
    S.pindah = (S.pindah || []).concat(r.pindah || []);
    if (real) {
      S.real.tertunda.push({ ...p, hasilLokal: I.ringkasHasil(r.hasil) });
      simpanCacheReal();
      setTimeout(kirimTertunda, 0);
    }
    return r.hasil;
  }
  /* Salinan dasar, dengan data pribadi (yang tak pernah ikut perubahan server). */
  function salinanDasar() {
    const { links, notes, ...bersama } = S.real.dasar;
    return { ...structuredClone(bersama), links: S.pribadi.links, notes: S.pribadi.notes };
  }
  /* Perintah tertunda yang kini tak lolos aturan (mis. orang lain lebih dulu menyetujui task itu)
     dibatalkan; yang sudah diterima server tinggal menunggu perubahannya tiba. */
  function susunReal() {
    const R = S.real;
    if (!R.dasar) return;
    let d = R.dasar;
    d.links = S.pribadi.links;
    d.notes = S.pribadi.notes;
    if (R.tertunda.length) {
      d = salinanDasar();
      R.tertunda = R.tertunda.filter(p => {
        const r = I.jalankanPerintah(d, p);
        if (!r.ok && !p.terkirim) toast(`Perubahan dibatalkan: ${r.galat}`, true);
        return r.ok || p.terkirim;
      });
    }
    S.data = d;
  }
  function simpanCacheReal() {
    const R = S.real;
    if (S.pratinjau || !R.dasar) return;
    const { links, notes, ...dasar } = R.dasar;
    simpan('real', { generasi: R.generasi, seq: R.seq, dasar, tertunda: R.tertunda });
    simpan('pribadi_real', S.pribadi);
  }
  /* Saat dibuka di data real: salinan cepat dari browser ini (kalau generasinya sama), lalu
     perubahan sesudahnya dari server. Perintah yang belum terkirim dikirim lagi; server membuang
     yang ternyata sudah tersimpan (ID-nya sama). */
  function mulaiReal(b) {
    const cache = ambil('real', null);
    const sama = !!(cache && cache.dasar && b && !b.dariAwal && cache.generasi === b.generasi);
    S.pribadi = ambil('pribadi_real', null) || { links: [], notes: [] };
    Object.assign(S.real, {
      generasi: sama ? cache.generasi : '',
      seq: sama ? cache.seq : 0,
      dasar: sama ? { ...I.dataKosong(), ...cache.dasar } : I.dataKosong(),
      tertunda: cache && Array.isArray(cache.tertunda) ? cache.tertunda.map(p => ({ ...p, terkirim: false })) : [],
      mengirim: false, gagal: 0, galat: '',
    });
    terimaReal(b, false);
    susunReal();
    if (S.real.tertunda.length) setTimeout(kirimTertunda, 0);
    return S.data.tasks.length || S.data.projects.length ? '' : 'Data real masih kosong. Mulai dari Proyek atau Rancangan Paket.';
  }
  /* Perubahan dari server, berurutan menurut nomornya. Ada yang terlewat: tarik dari awal.
     Yang bertanda sah: false kalah dari perubahan lain yang bersamaan (lihat api/_real.js):
     nomornya dilewati, dan perintahnya diperiksa ulang server lalu tiba lagi di nomor lain. */
  function terimaReal(b, gambar = true) {
    const R = S.real;
    if (!b) return;
    let berubah = false;
    if (b.dariAwal || (R.generasi && b.generasi !== R.generasi)) {
      R.dasar = I.dataKosong();
      R.seq = 0;
      berubah = true;
    }
    R.generasi = b.generasi || '';
    for (const e of b.peristiwa || []) {
      if (e.seq <= R.seq) continue;
      if (e.seq !== R.seq + 1) {
        Object.assign(R, { seq: 0, generasi: '', dasar: I.dataKosong() });
        setTimeout(() => tarikObrolan(), 0);
        return;
      }
      R.seq = e.seq;
      berubah = true;
      if (e.sah === false) continue;
      I.terapkanUbah(R.dasar, e.ubah);
      R.tertunda = R.tertunda.filter(p => p.id !== e.id);   // perintah sendiri yang sudah tersimpan
    }
    if (!berubah) return;
    susunReal();
    simpanCacheReal();
    if (gambar) gambarUlangAman();
  }
  /* Kirim perintah tertunda satu per satu, berurutan. Yang ditolak server dibatalkan di sini;
     yang gagal karena jaringan, server, atau sesi dicoba lagi nanti — perubahannya tetap tampil,
     dengan tanda "belum tersimpan" di kaki sidebar. */
  let jamKirim = null;
  async function kirimTertunda() {
    const R = S.real;
    if (R.mengirim || S.mode !== 'real' || S.pratinjau) return;
    R.mengirim = true;
    clearTimeout(jamKirim);
    try {
      for (let p = R.tertunda.find(x => !x.terkirim); p && S.mode === 'real'; p = R.tertunda.find(x => !x.terkirim)) {
        perbaruiStatusReal();
        const { hasilLokal, terkirim, ...perintah } = p;
        const h = await api('simpanReal', [perintah]);
        if (h.success) { terimaKonfirmasi(p, h.peristiwa); continue; }
        if (h.kode === 'SUMBER') { R.tertunda = []; simpanCacheReal(); return gantiSumber('contoh'); }
        if (h.http === 400 || (h.http === 403 && h.kode !== 'PERLU_PIN')) {
          R.tertunda = R.tertunda.filter(x => x !== p);
          susunReal();
          simpanCacheReal();
          render();
          // Biasanya karena orang lain lebih dulu mengubah hal yang sama: ambil keadaan terbarunya.
          toast(`Perubahan dibatalkan: ${h.message} Data terbaru sedang dimuat.`, true);
          setTimeout(() => tarikObrolan(), 0);
          continue;
        }
        R.gagal = Math.min(R.gagal + 1, 5);
        R.galat = h.message || 'Gagal menyimpan ke server.';
        jamKirim = setTimeout(kirimTertunda, Math.min(5000 * 2 ** (R.gagal - 1), 120000));
        return;
      }
      R.gagal = 0;
      R.galat = '';
    } finally {
      R.mengirim = false;
      perbaruiStatusReal();
    }
  }
  /* Server menyimpan perintah p sebagai perubahan e. Langsung sesudah yang sudah ada di browser
     ini: diterapkan di dasar. Ada perubahan orang lain di antaranya: semua ditarik dulu supaya
     urutannya sama dengan di server. */
  function terimaKonfirmasi(p, e) {
    const R = S.real;
    gantiIdHasil(p.hasilLokal, e.hasil);
    if (!R.generasi && !R.seq) R.generasi = e.generasi || '';
    if (e.kosong || (e.generasi === R.generasi && e.seq <= R.seq)) {
      R.tertunda = R.tertunda.filter(x => x !== p);
    } else if (e.generasi === R.generasi && e.seq === R.seq + 1) {
      I.terapkanUbah(R.dasar, e.ubah);
      R.seq = e.seq;
      R.tertunda = R.tertunda.filter(x => x !== p);
    } else {
      p.terkirim = true;
      setTimeout(() => tarikObrolan(), 0);
    }
    susunReal();
    simpanCacheReal();
    gambarUlangAman();
  }
  /* Nomor yang dipakai di browser ini bisa berbeda dengan nomor dari server (ada perubahan orang
     lain lebih dulu): pilihan yang sedang terbuka mengikuti nomor server. */
  function gantiIdHasil(lokal, server) {
    if (!lokal || !server) return;
    const peta = new Map();
    if (lokal.id && server.id && lokal.id !== server.id) peta.set(lokal.id, server.id);
    if (lokal.project && server.project && lokal.project !== server.project) peta.set(lokal.project, server.project);
    (lokal.tasks || []).forEach((id, i) => { if (server.tasks && server.tasks[i] && server.tasks[i] !== id) peta.set(id, server.tasks[i]); });
    if (!peta.size) return;
    if (peta.has(S.pilih)) S.pilih = peta.get(S.pilih);
    if (peta.has(S.proyek)) S.proyek = peta.get(S.proyek);
    if (peta.has(S.pkt.pilih)) S.pkt.pilih = peta.get(S.pkt.pilih);
  }
  /* Perubahan dari orang lain tak menggambar ulang halaman selagi orang mengetik di sana
     (ketikannya bisa hilang): ditunda sampai isian itu ditinggalkan. */
  let perluGambar = false;
  const sedangMengetik = () => {
    const a = document.activeElement;
    return !!a && !!a.closest && !!a.closest('#app') && a.matches('input:not([type="checkbox"]):not([type="radio"]), textarea, select, [contenteditable="true"]');
  };
  function gambarUlangAman() {
    perbaruiStatusReal();
    if (!S.data || $('#app').hidden) return;
    if (sedangMengetik()) { perluGambar = true; return; }
    perluGambar = false;
    render();
  }
  document.addEventListener('focusout', () => setTimeout(() => { if (perluGambar && !sedangMengetik()) gambarUlangAman(); }, 0));
  function teksStatusData() {
    if (S.mode !== 'real') return 'Data contoh. Perubahan hanya tersimpan di browser ini.';
    const n = S.real.tertunda.length;
    if (!n) return 'Data real. Semua perubahan tersimpan bersama di spreadsheet.';
    if (S.real.galat && !S.real.mengirim) return `${n} perubahan belum tersimpan: ${S.real.galat}`;
    return `Menyimpan ${n} perubahan…`;
  }
  function perbaruiStatusReal() {
    const el = $('#status-data');
    if (el) {
      el.textContent = teksStatusData();
      el.classList.toggle('merah', S.mode === 'real' && !!S.real.galat && S.real.tertunda.length > 0);
    }
    const b = $('#coba-simpan');
    if (b) b.hidden = !(S.mode === 'real' && S.real.galat && S.real.tertunda.length && !S.real.mengirim);
  }
  /* Dev mengganti sumber data: semua browser memuat ulang aplikasinya. */
  function gantiSumber(mode) {
    toast(mode === 'real' ? 'Sumber data diganti ke Data real. Memuat ulang…' : 'Sumber data diganti ke Data contoh. Memuat ulang…');
    setTimeout(() => location.reload(), 1500);
  }
  function simpanPref(ruang) {
    if (ruang === 'task') { const { q, hal, saringBuka, ...sisa } = S.task; simpan('task', { ...sisa, lk: 2 }); }
    if (ruang === 'pnd') simpan('pnd_tab', S.pnd.tab);
  }

  /* Tanda baca Komunikasi, per profil dan per ruang. Komentar data contoh yang sudah ada saat
     data dimuat dianggap terbaca. Pesan bersama dihitung baru sejak tiga hari sebelum profil
     ini pertama kali membuka aplikasi di browser ini, supaya sebutan terbaru tak terlewat. */
  let bacaMilik = null, bacaPeta = {};
  function petaBaca() {
    if (bacaMilik !== S.me) {
      bacaPeta = ambil('baca_' + S.me, {});
      // Sampai 0.9 tanda baca disimpan per ID task; sejak 0.10 per ruang (task:PRD-…).
      for (const k of Object.keys(bacaPeta)) {
        if (/^PRD-/.test(k)) { bacaPeta['task:' + k] = Math.max(Number(bacaPeta['task:' + k]) || 0, Number(bacaPeta[k]) || 0); delete bacaPeta[k]; }
      }
      bacaMilik = S.me;
    }
    return bacaPeta;
  }
  function awalBersama() {
    const kunci = 'baca_awal_' + S.me;
    let t = Number(ambil(kunci, 0)) || 0;
    if (!t) { t = Date.now() - 3 * 864e5; simpan(kunci, t); }
    return t;
  }
  const sejakBaca = (ruang, m) => Math.max(Number(petaBaca()[ruang]) || 0, m && m.bersama ? awalBersama() : S.dimuat || 0);
  function tandaiDibaca(ruang) {
    const terakhir = (susunan().perRuang.get(ruang) || []).reduce((n, m) => (m.tertunda || m.gagal ? n : Math.max(n, m.at || 0)), 0);
    const p = petaBaca();
    if (terakhir > (Number(p[ruang]) || 0)) { p[ruang] = terakhir; simpan('baca_' + S.me, p); }
  }
  /* Link Saya yang sering dibuka, dihitung di perangkat ini (sama dengan v1). */
  const petaKlik = () => ambil('klik_' + S.me, {});
  function hitungKlik(id) { const p = petaKlik(); p[id] = (p[id] || 0) + 1; simpan('klik_' + S.me, p); }

  /* ---------- Ikon (garis, mengikuti warna teks) ---------- */

  const JALUR_IKON = {
    matahari: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    kolom: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/>',
    lapis: '<path d="m12 2 9 5-9 5-9-5 9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
    grafik: '<path d="M3 3v18h18"/><path d="M7 16v-5M12 16V8M17 16v-8"/>',
    jendela: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    laporan: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
    daftar: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    timeline: '<path d="M3 3v18h18"/><path d="M7 7h8M10 12h9M6 17h6"/>',
    kalender: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    kotak: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
    obrolan: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    penanda: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
    catatan: '<path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M15 3v6h6"/>',
    riwayat: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    cari: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    tambah: '<path d="M12 5v14M5 12h14"/>',
    tutup: '<path d="M18 6 6 18M6 6l12 12"/>',
    kiri: '<path d="m15 18-6-6 6-6"/>',
    kanan: '<path d="m9 18 6-6-6-6"/>',
    bawah: '<path d="m6 9 6 6 6-6"/>',
    tautan: '<path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1 1"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1-1"/>',
    luar: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    orang: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    ulang: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    keluar: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    unduh: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    sunting: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    hapus: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    folder: '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>',
    pindah: '<path d="M2 9V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1"/><path d="M2 13h10"/><path d="m9 16 3-3-3-3"/>',
    salin: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    kilat: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    aktivitas: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    tabel: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
    papanKlip: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h6"/>',
    toga: '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
    centang: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    bulat: '<circle cx="12" cy="12" r="9"/>',
    serah: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    buku: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
    atas: '<path d="m18 15-6-6-6 6"/>',
    tugas: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 12 2 2 4-4"/>',
    saring: '<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>',
    lonceng: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    at: '<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/>',
    tanya: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    balas: '<path d="M9 17 4 12l5-5"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>',
    kirim: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    kotakMasuk: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    pesan: '<path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z"/><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    duaPanel: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
    templat: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    judulH: '<path d="M6 12h12"/><path d="M6 20V4"/><path d="M18 20V4"/>',
    tebal: '<path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8"/>',
    miring: '<path d="M19 4h-9"/><path d="M14 20H5"/><path d="M15 4 9 20"/>',
    daftarTitik: '<path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/>',
    centangKotak: '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
    mata: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    bintang: '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
    semat: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
    kode: '<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>',
    kamera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    kurang: '<path d="M5 12h14"/>',
    lainnya: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    tambahFolder: '<path d="M12 10v6M9 13h6"/><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    teks: '<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>',
    daftarNomor: '<path d="M10 6h11M10 12h11M10 18h11"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>',
    kutip: '<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.76-2-2-2H4c-1.25 0-2 .75-2 1.97V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .01-1 1.03V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.76-2-2-2h-4c-1.25 0-2 .75-2 1.97V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>',
    gembok: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    atur: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    naik: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    turun: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
  };
  const ikon = (nama, ukuran = 18) => `<svg width="${ukuran}" height="${ukuran}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${JALUR_IKON[nama] || ''}</svg>`;
  /* Nama ikon Dashboard Lain berasal dari v1 (Material Icons). */
  const IKON_DASH = { dashboard: 'jendela', bar_chart: 'grafik', timeline: 'aktivitas', table_chart: 'tabel', description: 'laporan', assignment: 'papanKlip', school: 'toga', event: 'kalender' };
  /* Logo ProductTrack (folder logo/ → public/logo, seperti v1) di alas putih. */
  const LOGO = '<span class="merek-ikon"><img src="/logo/icon-64.png" alt="" width="26" height="26" draggable="false"></span>';
  const NAMA_MEREK = '<span class="merek-nama">Product<b>Track</b></span>';

  /* ---------- Potongan tampilan ---------- */

  const WARNA = ['#0068B4', '#004F94', '#003078', '#0E7490', '#3D4654', '#7A3E9D', '#067647', '#8A4B00', '#B42318', '#9F1239', '#5B6470', '#00214F'];
  function warnaOrang(id) {
    if (id === I.DEV) return '#1C2430';
    let h = 0;
    for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return WARNA[h % WARNA.length];
  }
  /* Foto profil (0.12.0) tak ditulis di sini: kelas av-<id> mendapat fotonya dari satu stylesheet
     (pasangGayaFoto), jadi ratusan avatar tak membawa salinan gambar dan langsung berganti. */
  const avatar = (id, kelas = '') => `<span class="avatar ${kelas} av-${esc(id)}" style="background:${warnaOrang(id)}" title="${esc(I.orang(id).nama)}">${esc(I.inisial(id))}</span>`;
  const nama = id => esc(I.orang(id).pendek);
  /* Tanda agen AI (2.17.0): pesan, aktivitas, dan tinjauan yang dikerjakan agen atas nama orang itu. */
  const tandaAi = ai => (ai ? '<span class="chip-ai" title="Dikerjakan agen AI atas nama orang ini">AI</span>' : '');

  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const keDate = iso => new Date(iso + 'T00:00:00');
  const fmtTanggal = iso => (iso ? keDate(iso).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }) : '—');
  const fmtTanggalPendek = iso => (iso ? keDate(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '—');
  const fmtTanggalPanjang = iso => (iso ? keDate(iso).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—');
  const fmtWaktu = ms => (ms ? new Date(ms).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
  const fmtJam = ms => new Date(ms).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const fmtAngka = n => (Number.isInteger(n) ? String(n) : Number(n).toLocaleString('id-ID'));
  const namaBulan = bulan => { const [y, m] = bulan.split('-').map(Number); return `${BULAN[m - 1]} ${y}`; };
  function fmtRentang(dari, sampai) {
    const a = keDate(dari), b = keDate(sampai);
    if (dari === sampai) return fmtTanggalPanjang(dari);
    const akhir = b.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return `${a.getDate()}–${akhir}`;
    return `${a.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${akhir}`;
  }
  function relatif(ms) {
    if (!ms) return '';
    const d = (Date.now() - ms) / 1000;
    if (d < 60) return 'baru saja';
    if (d < 3600) return Math.floor(d / 60) + ' mnt lalu';
    if (d < 86400) return Math.floor(d / 3600) + ' jam lalu';
    if (d < 7 * 86400) return Math.floor(d / 86400) + ' hari lalu';
    return fmtWaktu(ms);
  }
  function namaSitus(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } }

  const pillStatus = s => `<span class="pill st-${String(s).toLowerCase()}">${esc(s)}</span>`;
  function chipTenggat(t) {
    if (!t.due) return '<span class="tenggat kosong">Tanpa tenggat</span>';
    if (I.selesai(t)) return `<span class="tenggat">${esc(fmtTanggal(t.due))}</span>`;
    const n = I.selisihHari(hariIni(), t.due);
    if (n < 0) return `<span class="tenggat telat">Telat ${-n} hr</span>`;
    if (n === 0) return '<span class="tenggat hari">Hari ini</span>';
    if (n === 1) return '<span class="tenggat">Besok</span>';
    return `<span class="tenggat">${esc(fmtTanggal(t.due))}</span>`;
  }
  /* Kode sub-stage (PRD v3): kode ADDIE di dalam proyek; kode R = rutin; kode ADDIE di luar
     proyek = pekerjaan "lepas" warisan v1. Task lama tanpa kode memakai huruf tahapnya. */
  function chipJalur(t) {
    const s = I.subTahap(t.sub);
    const jenis = I.jenisJalur(t);
    const ket = s ? I.namaSub(s.kode) + (s.tim ? ` · tim ${I.TIM[s.tim].nama}` : '') : '';
    if (jenis === 'proyek') {
      return s ? `<span class="chip-sub" title="${esc(I.namaTahap(s.tahap) + ' · ' + ket)}">${esc(s.kode)}</span>`
        : `<span class="huruf-tahap" title="Tahap ${esc(I.namaTahap(t.stage))}, belum ber-sub-stage">${esc(t.stage || '?')}</span>`;
    }
    if (jenis === 'lepas') return `<span class="chip-sub lepas" title="${esc('Lepas, di luar proyek · ' + ket)}">${esc(s.kode)}</span>`;
    return s ? `<span class="chip-rutin" title="${esc('Rutin · ' + ket)}">${esc(s.kode)}</span>`
      : '<span class="chip-rutin" title="Rutin, belum ber-sub-stage">Rutin</span>';
  }
  const menyetor = t => (S.data.setoran || []).some(x => x.task === t.id);
  const chipSetor = t => (menyetor(t) ? '<span class="chip-paket" title="Menaikkan progres rancangan paket saat disetujui">Paket</span>' : '');
  /* Labelnya dari Master (bawaan: Penting, Mendesak). */
  const chipPenting = t => (['Urgent', 'High'].includes(t.priority) ? `<span class="chip-penting">${esc(I.labelPrioritas(t.priority))}</span>` : '');
  const proyekDari = id => S.data.projects.find(p => p.id === id);
  const asal = t => (t.project ? (proyekDari(t.project) || { name: t.project }).name : t.kategori || 'Rutin');
  function ringkasSub(t) {
    if (!t.subtasks.length) return '';
    return `${t.subtasks.filter(s => s.done).length}/${t.subtasks.length} sub-task`;
  }

  /* Indeks task per ID, dipakai banyak potongan dalam satu kali gambar. Objek task diubah di
     tempat, jadi indeksnya tetap sah sampai jumlah task atau datanya sendiri berganti. */
  let indeksData = null, indeksJumlah = -1, indeksIsi = null;
  function perIdKini() {
    if (indeksData !== S.data || indeksJumlah !== S.data.tasks.length) {
      indeksIsi = I.indeks(S.data);
      indeksData = S.data;
      indeksJumlah = S.data.tasks.length;
    }
    return indeksIsi;
  }

  /* Keadaan turunan (PRD: Ready, Revision, Waiting, Blocked) di samping empat status. */
  const LABEL = {
    Revisi: ['lb-revisi', 'Dikembalikan peninjau: perbaiki, lalu ajukan lagi'],
    Siap: ['lb-siap', 'Bisa dimulai: tahap sebelumnya sudah selesai'],
    Menunggu: ['lb-menunggu', 'Menunggu tahap sebelumnya (atau task lain) selesai'],
    Tertahan: ['kd-risiko', 'Ditandai tertahan'],
  };
  function chipLabel(t, sembunyi = []) {
    const l = I.labelKeadaan(t, perIdKini());
    return l && !sembunyi.includes(l) ? `<span class="pill ${LABEL[l][0]}" title="${esc(LABEL[l][1])}">${l}</span>` : '';
  }

  const chipTim = kode => (I.TIM[kode]
    ? `<span class="chip-tim" title="${esc(I.TIM[kode].nama)} · Lead ${esc(I.orang(I.TIM[kode].lead).pendek)}">${esc(kode)}</span>` : '');
  /* Proyek tak punya Lead tetap: yang tampil adalah tim pemegang task terbukanya. */
  function timHtml(p) {
    const kode = I.timProyek(S.data, p);
    return kode.length ? kode.map(chipTim).join('') : '<span class="hint">tanpa task terbuka</span>';
  }
  /* Satu baris riwayat tahap. Perpindahan otomatis menyebut siapa yang memicunya. */
  function teksRiwayat(x) {
    if (x.jenis === 'siklus') return `Siklus ${esc(x.siklus)} dimulai di <strong>Analysis</strong> oleh ${nama(x.oleh)}`;
    const arah = `${esc(I.namaTahap(x.dari))} → <strong>${esc(I.namaTahap(x.ke))}</strong>`;
    if (x.jenis === 'otomatis' || !x.oleh) return `${arah} · otomatis${x.oleh ? ', dipicu ' + nama(x.oleh) : ''}`;
    return `${arah} oleh ${nama(x.oleh)}`;
  }

  /* Siklus yang sudah ditutup E12 digambar lewat semua: tak ada tahap "sekarang" lagi.
     klik: tiap tahap jadi tombol yang membuka bagian tahap itu di halaman proyek. */
  function jalurTahap(p, tahapTask, tutup = false, klik = false) {
    const ke = tutup ? I.TAHAP.length : I.TAHAP.findIndex(x => x.id === p.stage);
    const dipilih = klik && S.tahapBuka && S.tahapBuka.proyek === p.id && !S.pilih ? S.tahapBuka.tahap : '';
    const label = tutup ? `Siklus ${p.cycle || 1} selesai` : 'Tahap proyek: ' + I.namaTahap(p.stage);
    const isi = I.TAHAP.map((x, i) => {
      const kelas = [i < ke ? 'lewat' : i === ke ? 'kini' : '', tahapTask === x.id && (tutup || x.id !== p.stage) ? 'milik' : '', dipilih === x.id ? 'dipilih' : ''].filter(Boolean).join(' ');
      const dalam = `<span class="kotak">${x.id}</span><span class="nama">${x.nama}</span>`;
      return klik
        ? `<button type="button" class="${kelas}" data-aksi="tahap-proyek" data-id="${esc(p.id)}" data-tahap="${x.id}" title="Lihat task tahap ${x.nama}" aria-label="Lihat task tahap ${x.nama}">${dalam}</button>`
        : `<div class="${kelas}">${dalam}</div>`;
    }).join('');
    return klik
      ? `<div class="jalur-tahap bisa-klik" role="group" aria-label="${esc(label)}. Klik tahap untuk melihat task-nya.">${isi}</div>`
      : `<div class="jalur-tahap" role="img" aria-label="${esc(label)}">${isi}</div>`;
  }
  /* Klik tahap di jalur ADDIE: halaman proyek dengan bagian tahap itu terbuka, lalu digulir ke sana. */
  function lihatTahap(id, tahap) {
    if (S.view !== 'proyek' || S.proyek !== id) { bukaProyek(id); if (S.proyek !== id) return; }
    Object.assign(S, { tahapBuka: { proyek: id, tahap }, pilih: null });
    render();
    const el = document.getElementById('tahap-' + tahap);
    if (!el) return;
    el.open = true;
    el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    el.classList.add('sorot-tahap');
  }
  function jalurMini(p, tutup = false) {
    const ke = tutup ? I.TAHAP.length : I.TAHAP.findIndex(x => x.id === p.stage);
    return `<span class="jalur-mini" aria-label="${tutup ? 'Siklus selesai' : 'Tahap ' + esc(I.namaTahap(p.stage))}">${I.TAHAP.map((x, i) => `<span class="${i < ke ? 'lewat' : i === ke ? 'kini' : ''}">${x.id}</span>`).join('')}</span>`;
  }
  const KEADAAN = {
    aman: 'Sesuai rencana', risiko: 'Berisiko', tunggu: 'Siklus selesai', sepi: 'Tak ada task terbuka', kosong: 'Belum ada task',
    ditahan: 'Ditahan', arsip: 'Arsip',
  };
  const chipKeadaan = k => `<span class="pill kd-${k}">${KEADAAN[k]}</span>`;

  /* ---------- Hirarki task (0.15.0) ----------
     Lead tak menyerahkan task yang ia pegang ke staff; ia membuat task anak untuk staff timnya
     di bawah task itu. Di daftar, anak tampil menjorok tepat di bawah induknya. */
  function ringkasAnak(t) {
    const anak = I.anakTask(perIdKini(), t.id);
    return anak.length ? `${anak.filter(I.selesai).length}/${anak.length} task anak` : '';
  }
  function chipInduk(t) {
    const induk = perIdKini().get(t.induk);
    return `<span class="chip-induk" title="${esc(`Task anak dari ${t.induk}${induk ? ' · ' + induk.title : ''}`)}">↳ ${esc(t.induk)}</span>`;
  }
  /* Anak diletakkan tepat sesudah induknya bila induknya ada di daftar yang sama; kalau tidak,
     ia tetap di tempatnya dengan tanda ↳ induknya. */
  function susunHirarki(daftar) {
    const ada = new Set(daftar.map(t => t.id));
    const anakDari = new Map();
    for (const t of daftar) {
      if (!t.induk || !ada.has(t.induk)) continue;
      if (!anakDari.has(t.induk)) anakDari.set(t.induk, []);
      anakDari.get(t.induk).push(t);
    }
    const out = [];
    for (const t of daftar) {
      if (t.induk && ada.has(t.induk)) continue;
      out.push({ t, anak: false });
      for (const a of anakDari.get(t.id) || []) out.push({ t: a, anak: true });
    }
    return out;
  }

  /* posisi: 'anak' = menjorok di bawah induknya; 'di-induk' = di dalam detail induknya. */
  function barisTask(t, alasan = '', posisi = '') {
    const sub = ringkasSub(t);
    const keluarga = ringkasAnak(t);
    // Siap tak perlu ditandai di daftar; Menunggu/Tertahan sudah terbaca dari alasannya.
    const lb = I.labelKeadaan(t, perIdKini());
    const label = lb && lb !== 'Siap' && !String(alasan).startsWith(lb) ? chipLabel(t) : '';
    return `<button type="button" class="baris ${posisi === 'anak' ? 'anak' : ''} ${S.pilih === t.id ? 'dipilih' : ''}" data-aksi="buka-task" data-id="${esc(t.id)}">
      ${pillStatus(t.status)}
      <span class="baris-isi">
        <span class="baris-judul">${esc(t.title)}</span>
        <span class="baris-meta">${t.induk && !posisi ? chipInduk(t) + ' ' : ''}${chipJalur(t)} ${esc(asal(t))}${sub ? ' · ' + sub : ''}${keluarga ? ' · ' + keluarga : ''} ${label} ${chipSetor(t)} ${chipPenting(t)}</span>
        ${alasan ? `<span class="baris-alasan ${/^Tertahan/.test(alasan) ? 'merah' : /^Selesai/.test(alasan) && !/lewat tenggat/.test(alasan) ? 'redup' : ''}">${esc(alasan)}</span>` : ''}
      </span>
      ${chipTenggat(t)}
      ${t.pic !== S.me ? avatar(t.pic, 'kecil') : ''}
    </button>`;
  }

  function kartuTask(t, perId) {
    const sub = t.subtasks.length;
    const beres = t.subtasks.filter(s => s.done).length;
    const dep = I.depsBelum(t, perId);
    const telat = I.telat(t, hariIni());
    const keluarga = ringkasAnak(t);
    // Task proyek menunggu tahap; task lain menunggu task yang tercatat di deps-nya.
    const tunggu = !dep.length || I.selesai(t) ? ''
      : I.tungguTahap(t) ? 'Menunggu tahap ' + I.namaTahap(I.TAHAP.map(x => x.id).find(s => dep.some(d => d.stage === s)))
      : 'Menunggu ' + dep[0].id;
    return `<div class="kartu ${telat ? 'telat' : ''}" draggable="true" data-id="${esc(t.id)}">
      <span class="kartu-atas">${t.induk ? chipInduk(t) + ' ' : ''}${chipJalur(t)} ${chipLabel(t, ['Siap', 'Menunggu', 'Tertahan'])} ${chipSetor(t)} <span>${esc(asal(t))}</span></span>
      <button type="button" class="kartu-judul" data-aksi="buka-task" data-id="${esc(t.id)}">${esc(t.title)}</button>
      ${sub ? `<span class="kartu-sub"><span class="batang"><span style="width:${Math.round(beres / sub * 100)}%"></span></span>${beres}/${sub}</span>` : ''}
      ${keluarga ? `<span class="kartu-anak">${esc(keluarga)}</span>` : ''}
      ${t.tertahan ? `<span class="tanda-tahan">Tertahan: ${esc(t.alasanTertahan || 'tanpa alasan')}</span>` : tunggu ? `<span class="kartu-tunggu">${esc(tunggu)}</span>` : ''}
      <span class="kartu-bawah">${avatar(t.pic, 'kecil')} <span>${nama(t.pic)}</span> ${chipTenggat(t)}</span>
    </div>`;
  }

  /* Pilihan lingkup per peran (I.lingkupBoleh): Staff hanya Saya, jadi tanpa segmen; Lead
     Saya + Tim saya; Manager Saya + Tim saya (para Lead) + Semua. */
  const LABEL_LINGKUP = { saya: 'Saya', tim: 'Tim saya', semua: 'Semua' };
  function segmenLingkup(ruang, nilai, label = 'Lingkup', teks = LABEL_LINGKUP) {
    const opsi = I.lingkupBoleh(S.me);
    if (opsi.length < 2) return '';
    const kini = I.lingkupSah(S.me, nilai);
    return `<div class="segmen" role="group" aria-label="${label}">${opsi.map(v => `<button type="button" data-aksi="atur" data-ruang="${ruang}" data-kunci="lingkup" data-nilai="${v}" aria-pressed="${kini === v}">${teks[v]}</button>`).join('')}</div>`;
  }
  /* Keterangan di bawah judul halaman: "Task saya", "Tim Alya · 3 orang", "Seluruh divisi". */
  function ketLingkup(lingkup) {
    const ids = I.lingkupOrang(S.me, lingkup);
    if (I.lingkupSah(S.me, lingkup) === 'saya') return 'Task saya';
    return ids ? `Tim ${esc(I.orang(S.me).pendek)} · ${ids.length} orang` : 'Seluruh divisi';
  }
  const pilihan = (ruang, kunci, nilai, opsi, label) => `<label class="label-kecil">${esc(label)} <select data-aksi="saring" data-ruang="${ruang}" data-kunci="${kunci}">${opsi.map(([v, l]) => `<option value="${esc(v)}" ${nilai === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  const kotakCari = (ruang, nilai, teks) => `<label class="cari-halaman">${ikon('cari', 16)}<span class="sr">${esc(teks)}</span><input type="search" data-cari="${ruang}" placeholder="${esc(teks)}" value="${esc(nilai)}" autocomplete="off"></label>`;
  const daftarPlatform = () => [...new Set(S.data.tasks.map(t => t.platform).filter(Boolean))].sort();

  const SEMUA = ['', 'Semua'];
  const OPSI_JALUR = [SEMUA, ['proyek', 'Proyek'], ['rutin', 'Rutin'], ['lepas', 'Lepas (warisan v1)']];
  const OPSI_TAHAP = [SEMUA, ...I.TAHAP.map(x => [x.id, `${x.id} · ${x.nama}`]), ['R', 'Rutin (R)']];
  // Fungsi, bukan tetapan: nama tim bisa diubah di Master sesudah berkas ini dimuat.
  const opsiTim = () => [SEMUA, ...Object.values(I.TIM).map(x => [x.kode, `${x.kode} · ${x.nama}`])];
  const opsiSubTahap = tahap => [SEMUA, ...I.SUB_TAHAP.filter(s => s.tahap === tahap).map(s => [s.kode, `${s.kode} · ${s.nama}`])];
  /* Saringan halaman Task, berlaku di semua tampilannya. Pilihan sub-stage muncul sesudah tahap dipilih. */
  const pilihanSaring = (ruang, f) => [
    pilihan(ruang, 'jalur', f.jalur, OPSI_JALUR, 'Jalur'),
    pilihan(ruang, 'tahap', f.tahap, OPSI_TAHAP, 'Tahap'),
    f.tahap ? pilihan(ruang, 'sub', f.sub, opsiSubTahap(f.tahap), 'Sub-stage') : '',
    pilihan(ruang, 'tim', f.tim, opsiTim(), 'Tim'),
    pilihan(ruang, 'platform', f.platform, [SEMUA, ...daftarPlatform().map(x => [x, x])], 'Platform'),
  ].join('');
  const nilaiSaring = f => ({ jalur: f.jalur, tahap: f.tahap, sub: f.sub, tim: f.tim, platform: f.platform });
  const adaSaring = f => Object.keys(SARING_KOSONG).some(k => f[k]);

  /* ---------- Toast & papan klip ---------- */

  function toast(pesan, galat = false) {
    const el = document.createElement('div');
    el.className = 'toast' + (galat ? ' galat' : '');
    el.textContent = pesan;
    $('#toast').appendChild(el);
    setTimeout(() => el.remove(), galat ? 5000 : 3200);
  }

  /* Dua rasa sekaligus: Sheets memakai text/html sehingga sel bergaris banyak tetap
     satu sel; text/plain untuk tujuan lain. Cadangan execCommand bila API ditolak. */
  function salinKeKlip(teks, html, pesan) {
    const beres = () => toast(pesan);
    const lama = () => {
      const bajak = e => { e.clipboardData.setData('text/plain', teks); if (html) e.clipboardData.setData('text/html', html); e.preventDefault(); };
      document.addEventListener('copy', bajak, true);
      const ta = document.createElement('textarea');
      ta.value = teks;
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      document.removeEventListener('copy', bajak, true);
      if (ok) beres(); else toast('Peramban menolak menyalin.', true);
    };
    if (navigator.clipboard && window.ClipboardItem && html) {
      navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([teks], { type: 'text/plain' }), 'text/html': new Blob([html], { type: 'text/html' }) })]).then(beres, lama);
    } else if (navigator.clipboard && !html) {
      navigator.clipboard.writeText(teks).then(beres, lama);
    } else lama();
  }

  /* ---------- Server ---------- */

  /* batasMs: tanpa batas waktu, layar "Memuat data…" menunggu selamanya kalau server tak menjawab. */
  async function api(action, args = [], batasMs = 30000) {
    // "Lihat sebagai" hanya tampilan: tak ada pesan, foto, perubahan orang, atau Master yang terkirim.
    if (S.pratinjau && ['kirimObrolan', 'simpanFoto', 'simpanOrang', 'simpanMaster', 'aturPin', 'simpanReal', 'aturSumber'].includes(action)) {
      return { http: 0, success: false, message: 'Mode Lihat sebagai: tampilan saja, tidak ada yang dikirim. Kembali jadi Dev dulu.' };
    }
    const henti = new AbortController();
    const jam = setTimeout(() => henti.abort(), batasMs);
    const habis = `Server tidak menjawab dalam ${Math.round(batasMs / 1000)} detik. Coba lagi sebentar lagi.`;
    try {
      const r = await fetch('/api/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, args }), signal: henti.signal });
      const d = await r.json().catch(() => null);
      if (!d) return { http: r.status, success: false, message: henti.signal.aborted ? habis : `Balasan server tak terbaca (HTTP ${r.status}).` };
      // Sesi Dev lewat 12 jam (atau DEV_PIN diganti): server tak lagi menganggapnya Dev.
      if (S.dev && d.dev === false && !['keluarDev', 'masukDev'].includes(action)) setTimeout(devBerakhir, 0);
      // Profil ber-PIN yang belum (atau tak lagi) terbukti di sesi ini, mis. PIN-nya baru diganti.
      if (d.kode === 'PERLU_PIN') setTimeout(pinLagi, 0);
      return { http: r.status, ...d };
    } catch (e) {
      return { http: 0, success: false, message: henti.signal.aborted ? habis : 'Server tak terjangkau. Periksa koneksi, lalu muat ulang halaman.' };
    } finally {
      clearTimeout(jam);
    }
  }
  /* true = server v2 menjawab; 'habis' = tak menjawab dalam 15 detik; false = tak ada server. */
  async function adaServer() {
    const henti = new AbortController();
    const jam = setTimeout(() => henti.abort(), 15000);
    try {
      const d = await (await fetch('/api/rpc', { cache: 'no-store', signal: henti.signal })).json();
      return !!d && d.app === 'producttrack-v2';
    } catch (e) {
      return henti.signal.aborted ? 'habis' : false;
    } finally {
      clearTimeout(jam);
    }
  }

  function rapikan(d) {
    const daftar = x => (Array.isArray(x) ? x : []);
    const angka = v => Number(v) || 0;
    return {
      projects: daftar(d.projects).map(p => ({ ...p, lead: p.lead || '', paket: p.paket || '', history: daftar(p.history) })),
      tasks: daftar(d.tasks).map(t => ({
        ...t, sub: t.sub || '', support: daftar(t.support), deps: daftar(t.deps), subtasks: daftar(t.subtasks), comments: daftar(t.comments),
        tinjauan: daftar(t.tinjauan), evidence: daftar(t.evidence), output: t.output || '', selesaiAt: Number(t.selesaiAt) || 0,
        induk: t.induk || '',
      })),
      packages: daftar(d.packages).map(p => ({
        ...p, namaPaket: p.namaPaket || p.name || '', mirror: !!p.mirror,
        items: daftar(p.items).map(i => ({ ...i, target: angka(i.target), awal: angka(i.awal), satuan: i.satuan || 'Paket' })),
        links: daftar(p.links),
      })),
      setoran: daftar(d.setoran).map(x => ({ ...x, jumlah: Number(x.jumlah) || 0, tahap: x.tahap || '', batch: x.batch || '' })),
      dashboards: daftar(d.dashboards),
      links: daftar(d.links).map(l => ({ ...l, favorit: !!l.favorit })),
      notes: daftar(d.notes).map(n => ({ ...n, pin: !!n.pin, warna: I.WARNA_CATATAN.includes(n.warna) ? n.warna : '', createdAt: angka(n.createdAt), updatedAt: angka(n.updatedAt) })),
      log: daftar(d.log),
    };
  }

  /* ---------- Layar kunci & profil ---------- */

  /* sibuk = tanpa isian PIN; ulang = tampilkan tombol "Coba lagi" (PIN sudah benar,
     tapi datanya gagal dimuat). */
  function tampilKunci(pesan, sibuk, ulang = false) {
    $('#app').hidden = true;
    $('#profil').hidden = true;
    $('#kunci').hidden = false;
    $('#kunci-pesan').textContent = pesan || 'Masukkan PIN untuk melanjutkan.';
    $('#kunci-isian').hidden = !!sibuk;
    $('#kunci-tombol').hidden = !!sibuk;
    $('#kunci-ulang').hidden = !ulang;
    $('#kunci-reset').hidden = true;
    $('#kunci-galat').hidden = true;
    if (!sibuk) setTimeout(() => $('#kunci-pin').focus(), 30);
  }
  function kunciGagal(pesan) {
    $('#kunci-galat').textContent = pesan;
    $('#kunci-galat').hidden = false;
    const f = $('#form-kunci');
    f.classList.remove('goyang'); void f.offsetWidth; f.classList.add('goyang');
    $('#kunci-pin').value = '';
    $('#kunci-pin').focus();
  }

  function tampilProfil() {
    const kelompok = ['manager', 'lead', 'staff'].map(peran => `
      <p class="subjudul">${I.PERAN[peran]}</p>
      <div class="pilih-profil">${I.ORANG.filter(o => o.peran === peran).map(o => `
        <button type="button" data-aksi="pilih-profil" data-id="${o.id}">${avatar(o.id, 'besar')}<span>${esc(o.nama)}<span>${esc(o.jabatan)}</span></span>${S.berpin.has(o.id) ? `<span class="profil-gembok" title="Memakai PIN pribadi">${ikon('gembok', 16)}<span class="sr">memakai PIN</span></span>` : ''}</button>`).join('')}
      </div>`).join('');
    // Mode Dev sengaja tak tampil di sini (0.14.3): masuknya hanya lewat tekan-tahan logo.
    $('#profil').innerHTML = `<div class="kartu-layar lebar">
      <span class="merek">${LOGO}${NAMA_MEREK}</span>
      <div><h1 style="margin:0;font-size:22px;color:var(--navy)">Masuk sebagai siapa?</h1>
      <p class="pesan-info" style="margin-top:6px">PIN aplikasi dipakai bersama, jadi pilih profil Anda sendiri${S.berpin.size ? '; profil bergembok meminta PIN pribadinya' : ''}. Tampilan menyesuaikan peran: Staff dan Lead mulai di Hari Ini, Manager di Proyek.</p></div>
      ${kelompok}
    </div>`;
    $('#kunci').hidden = true;
    $('#app').hidden = true;
    $('#profil').hidden = false;
  }

  /* Pilih profil (0.14.0): profil ber-PIN meminta PIN pribadinya; profil lain langsung masuk,
     sambil memberi tahu server profil mana yang dipakai sesi ini. Akun Dev tak lewat sini. */
  async function pilihProfil(id, tombol) {
    if (id !== I.DEV && S.meSesi !== id) {
      if (S.berpin.has(id)) return bukaPinProfil(id);
      if (tombol) tombol.disabled = true;
      const h = await api('masukProfil', [id, '']);
      if (tombol) tombol.disabled = false;
      if (h.kode === 'PIN_PROFIL') { S.berpin.add(id); return bukaPinProfil(id); }
      if (h.http === 401) return tampilKunci('Sesi berakhir. Masukkan PIN untuk melanjutkan.', false);
      if (!h.success) return toast(h.message || 'Profil gagal dipilih. Coba lagi.', true);
      S.meSesi = h.me || id;
    }
    jadiProfil(id);
  }
  function jadiProfil(id) {
    if (S.pratinjau) S.pratinjau = null;
    gantiIdentitas(id);
    masukApp();
    toast(id === I.DEV ? `Mode Dev${S.devSampai ? ' sampai ' + jamDev() : ''}.` : `Masuk sebagai ${I.orang(S.me).pendek} (${I.PERAN[I.orang(S.me).peran]}).`);
  }
  /* lagi = sudah di dalam aplikasi, tapi server meminta PIN profil ini lagi (mis. baru diganti). */
  function bukaPinProfil(id, lagi = false) {
    const o = I.orang(id);
    bukaModal({ jenis: 'pin-profil', id, atas: true, lagi }, `<form class="form-pin" data-form="pin-profil" novalidate>
        <div class="pin-profil-kepala">${avatar(id, 'besar')}<div><h2>${esc(o.nama)}</h2><p class="hint">${esc(I.PERAN[o.peran])}${o.jabatan ? ' · ' + esc(o.jabatan) : ''}</p></div></div>
        ${lagi ? '<p class="banner kuning">Masukkan PIN Anda lagi untuk melanjutkan; PIN-nya mungkin baru diganti.</p>' : ''}
        <label class="isian">PIN profil<input id="pin-profil" type="password" inputmode="numeric" autocomplete="off" maxlength="8" required></label>
        <p class="hint">Lupa PIN? Minta Dev memasang PIN baru untuk profil ini.</p>
        ${kakiModal('Masuk')}
      </form>`);
  }
  async function kirimPinProfil(form) {
    const m = S.modal;
    if (!m || m.jenis !== 'pin-profil') return;
    const isian = $('#pin-profil');
    const tombol = form.querySelector('.tombol.utama');
    tombol.disabled = true;
    const h = await api('masukProfil', [m.id, isian.value]);
    tombol.disabled = false;
    if (h.http === 401 && h.kode !== 'PIN_PROFIL') { tutupModal(); return tampilKunci('Sesi berakhir. Masukkan PIN untuk melanjutkan.', false); }
    if (!h.success) {
      isian.value = '';
      isian.focus();
      return galatModal(h.message || 'PIN salah.');
    }
    S.meSesi = h.me || m.id;
    tutupModal();
    if (m.lagi && S.me === m.id) return toast('PIN diterima. Ulangi yang tadi.');
    jadiProfil(m.id);
  }
  /* Server menolak menulis atas nama profil ini (kode PERLU_PIN): PIN-nya diminta lagi. */
  function pinLagi() {
    S.meSesi = '';
    if (!S.me || S.me === I.DEV || S.pratinjau) return;
    S.berpin.add(S.me);
    if (!S.modal && !$('#app').hidden) bukaPinProfil(S.me, true);
  }

  /* Berganti profil (pilih profil, akun Dev, Lihat sebagai): keadaan milik profil sebelumnya tak
     boleh terbawa — draf dan balasan pesan, catatan yang terbuka, saringan, lingkup.
     ingat = false untuk "Lihat sebagai": profil yang tersimpan di browser tetap Dev. */
  function gantiIdentitas(id, { ingat = true } = {}) {
    simpanCatatanTertunda();
    S.me = id;
    if (ingat) simpan('me', S.me);
    S.view = halamanAwal();
    S.pilih = null;
    S.proyek = null;
    Object.assign(S.task, { lingkup: I.lingkupAwal(S.me), fokus: '' });
    S.dash.lingkup = '';
    S.kom.lingkup = 'terlibat';
    simpanPref('task');
    // Draf dan balasan milik profil sebelumnya tak ikut terkirim atas nama profil baru.
    Object.assign(S.kom, { pilih: null, balas: '', ubah: '', tanya: false, draf: {}, saring: 'semua', batasBaru: null });
    Object.assign(S.pkt, { pilih: null, sunting: false, kotor: false });
    Object.assign(S.ctt, { pilih: null, warna: '', folderBaru: '', versiSesi: '' });
    S.lnk.penuh = new Set();
    S.notif.buka = false;
  }

  /* Alamat yang dibuka orang (mis. tautan task yang dikirim lewat chat) dipakai sekali,
     sesudah masuk dan memilih profil. */
  let alamatAwal = location.hash;
  function masukApp() {
    $('#kunci').hidden = true;
    $('#profil').hidden = true;
    $('#app').hidden = false;
    let hasil = { hilang: '', ditolak: '' };
    if (alamatAwal) { hasil = terapkanAlamat(alamatAwal); alamatAwal = ''; }
    if (!halamanBoleh(S.view)) S.view = halamanAwal();
    simpan('halaman', S.view);
    alamatGanti = true;
    render();
    bukaEditorDariAlamat();
    if (hasil.ditolak) toast(hasil.ditolak, true);
    else if (hasil.hilang) toast(S.mode === 'real' ? `${hasil.hilang} tidak ditemukan di data real.` : `${hasil.hilang} tidak ada di data browser ini. Data contoh tersimpan per browser, jadi yang dibuat di browser lain tidak ikut.`, true);
  }

  /* reset = sesudah "Reset data contoh": data lokal sudah dibuang, jadi yang dimuat pasti
     data contoh dari spreadsheet (spreadsheet tak pernah diubah aplikasi). */
  async function muat(reset = false) {
    tampilKunci(reset ? 'Mengembalikan data contoh…' : 'Memuat data…', true);
    // Data real: cukup perubahan sesudah salinan cepat di browser ini (kalau generasinya sama).
    const cacheReal = ambil('real', null);
    const h = await api('muatContoh', [{ realSejak: cacheReal ? cacheReal.seq || 0 : 0, generasi: cacheReal ? cacheReal.generasi || '' : '' }], 45000);
    if (h.http === 401) return tampilKunci('Masukkan PIN untuk melanjutkan.', false);
    if (!h.success) {
      const pesan = h.message || `Gagal memuat data (HTTP ${h.http}).`;
      return tampilKunci(h.kode === 'SETELAN' || !h.http ? pesan : `PIN diterima, tetapi data gagal dimuat. ${pesan}`, true, true);
    }
    let pesan = '';
    try {
      // Organogram terkini (tab orang, diubah mode Dev) diterapkan sebelum layar pertama.
      S.dev = !!h.dev;
      S.devSampai = Number(h.devSampai) || 0;
      S.orangBaris = Array.isArray(h.orang) ? h.orang : [];
      S.orangSalah = I.aturOrang(S.orangBaris);
      if (S.orangSalah) catatGalat('Tab orang diabaikan: ' + S.orangSalah, 'organogram');
      // Master (0.14.0): daftar pilihan bersama, juga diterapkan sebelum layar pertama.
      S.masterBaris = Array.isArray(h.master) ? h.master : [];
      S.masterSalah = I.aturMaster(S.masterBaris);
      for (const [jenis, alasan] of Object.entries(S.masterSalah)) catatGalat(`Master ${jenis} diabaikan: ${alasan}`, 'master');
      S.berpin = new Set(Array.isArray(h.berpin) ? h.berpin : []);
      S.meSesi = h.me || '';
      S.mode = h.mode === 'real' ? 'real' : 'contoh';
      if (S.mode === 'real') {
        pesan = mulaiReal(h.real);
        S.dimuat = Date.now();
      } else {
        const lokal = ambil('data', null);
        if (h.data && lokal && lokal.versi === h.versi && lokal.data) {
          S.data = rapikan(lokal.data);
          S.dimuat = Number(lokal.dimuat) || Date.now();
        } else if (h.data) {
          S.data = rapikan(h.data);
          S.dimuat = Date.now();
          pesan = `${reset ? 'Data contoh kembali ke awal' : 'Data contoh dimuat'}: ${S.data.tasks.length} task, ${S.data.projects.length} proyek, ${S.data.packages.length} paket.`;
        } else {
          S.data = rapikan({});
          S.dimuat = Date.now();
          pesan = 'Data contoh belum diimpor ke spreadsheet v2.';
        }
        // Tahap proyek dihitung dari task-nya; samakan dulu tanpa menulis riwayat.
        I.segarkanTahap(S.data);
      }
      S.versi = h.versi || '';
      S.sumber = h.sumber || '';
      simpanData();
      if (S.me === I.DEV && !S.dev) S.me = null;
      // Profil ber-PIN yang belum terbukti di sesi ini (mis. sesudah keluar): PIN-nya diminta dulu.
      const dikenal = !!S.me && (S.me === I.DEV || I.ORANG.some(o => o.id === S.me));
      const perluPin = dikenal && S.me !== I.DEV && S.berpin.has(S.me) && S.meSesi !== S.me;
      if (!dikenal || perluPin) {
        tampilProfil();
        if (perluPin) bukaPinProfil(S.me);
      } else masukApp();
    } catch (e) {
      return galatMuat(e);
    }
    if (pesan) toast(pesan);
    // Pesan Komunikasi tersimpan bersama di spreadsheet, terpisah dari data contoh.
    tarikObrolan(true).then(jadwalkanTarik);
    tarikFoto();
  }

  /* Galat saat menyiapkan data atau menggambar layar pertama: pesannya ditampilkan, bukan
     layar "Memuat data…" selamanya. Data lokal yang rusak bisa dikosongkan dari sini. */
  function galatMuat(e) {
    console.error(e);
    catatGalat(e && e.message ? e.message : e, 'memuat');
    tampilKunci(`Aplikasi gagal disiapkan di browser ini (${e && e.message ? e.message : e}). Muat ulang halaman dengan Ctrl+Shift+R; kalau masih gagal, kirim pesan ini ke tim.`, true, true);
    $('#kunci-reset').hidden = false;
  }

  async function mulai() {
    pasangGayaFoto();
    tampilKunci('Memeriksa sesi…', true);
    const ada = await adaServer();
    if (ada === 'habis') return tampilKunci('Server tidak menjawab. Periksa koneksi, lalu coba lagi.', true, true);
    if (!ada) return tampilKunci('Aplikasi ini perlu server. Jalankan npm run dev, atau buka lewat alamat Vercel.', true);
    await muat();
  }

  /* ---------- Alamat (URL) ----------
     #/halaman[/tampilan Task | PRJ- | PKG- | id catatan][/PRD- task yang terbuka]. Contoh:
       #/task/kanban/PRD-1038    #/proyek/PRJ-33    #/paket/PKG-001    #/hari/PRD-1050
     Bisa dikirim lewat chat dan dibuka langsung; tombol Back browser memuat ulang keadaan
     dari alamat. Hanya halaman & yang terbuka yang masuk alamat; saringan tidak. */

  function alamatKini() {
    const b = ['', S.view];
    if (S.view === 'task') b.push(S.task.tampilan);
    if (S.view === 'proyek' && S.proyek) b.push(S.proyek);
    if (S.view === 'paket' && S.pkt.pilih) b.push(S.pkt.pilih);
    if (S.view === 'komunikasi' && S.kom.pilih) b.push(alamatRuang(S.kom.pilih));
    if (S.view === 'catatan' && S.ctt.pilih && S.ctt.pilih !== '__baru') b.push(S.ctt.pilih);
    if (S.pilih && S.view !== 'komunikasi') b.push(S.pilih);
    return '#' + b.map(encodeURIComponent).join('/');
  }

  /* Hasil: ok = halamannya dikenal dan boleh dibuka; hilang = ID yang dirujuk tapi tak ada
     di data browser ini (mis. task yang dibuat orang lain di browsernya). */
  function terapkanAlamat(hash) {
    const bagian = String(hash || '').replace(/^#\/?/, '').split('/').filter(Boolean)
      .map(x => { try { return decodeURIComponent(x); } catch (e) { return x; } });
    const [hal, ...sisa] = bagian;
    if (!hal || !HALAMAN.some(h => h.id === hal) || !halamanBoleh(hal)) return { ok: false, hilang: '' };
    let hilang = '', ditolak = '';
    const ada = (daftar, id) => { const ok = daftar.some(x => x.id === id); if (!ok && !hilang) hilang = id; return ok; };
    Object.assign(S, { view: hal, pilih: null });
    if (hal === 'proyek') S.proyek = null;
    if (hal === 'paket') Object.assign(S.pkt, { pilih: null, sunting: false, kotor: false });
    if (hal === 'komunikasi') S.kom.pilih = null;
    if (hal === 'catatan') S.ctt.pilih = null;
    for (const x of sisa) {
      if (hal === 'komunikasi') {
        // Ruang task yang tak ada di data browser ini tetap boleh dibuka kalau sudah ada pesannya.
        const r = ruangDariAlamat(x);
        const dikenal = r && (!/^PRD-/.test(x) || S.data.tasks.some(t => t.id === x) || susunan().perRuang.has(r))
          && (!/^PRJ-/.test(x) || S.data.projects.some(p => p.id === x));
        if (dikenal && I.bolehRuang(S.me, r)) S.kom.pilih = r;
        else if (dikenal) ditolak = `${judulRuang(r)} hanya untuk anggota timnya dan Manager.`;
        else if (!hilang) hilang = x;
        continue;
      }
      if (/^PRD-/.test(x)) { if (ada(S.data.tasks, x)) S.pilih = x; }
      else if (hal === 'task' && ID_TAMPILAN.includes(x)) S.task.tampilan = x;
      else if (hal === 'proyek' && /^PRJ-/.test(x)) { if (ada(S.data.projects, x)) S.proyek = x; }
      else if (hal === 'paket' && /^PKG-/.test(x)) { if (ada(S.data.packages, x)) S.pkt.pilih = x; }
      else if (hal === 'catatan') { const n = catatanSaya().find(c => c.id === x); if (n) pilihAwal(n); }
    }
    return { ok: true, hilang, ditolak };
  }

  /* Gambar pertama dan sesudah tombol Back: ganti alamat, jangan menambah riwayat. */
  let alamatGanti = true;
  function catatAlamat() {
    const a = alamatKini();
    const ganti = alamatGanti;
    alamatGanti = false;
    if (location.hash === a) return;
    try { history[ganti ? 'replaceState' : 'pushState'](null, '', a); } catch (e) { /* mis. dibuka dari berkas lokal */ }
  }
  window.addEventListener('popstate', () => {
    if (!S.data || $('#app').hidden) return;
    tutupModal(false);
    S.notif.buka = false;
    // #/dev tanpa sesi Dev (0.14.3) jatuh ke beranda seperti halaman lain yang tak boleh dibuka:
    // mode Dev hanya dimasuki lewat tekan-tahan logo.
    const r = terapkanAlamat(location.hash);
    if (!r.ok) S.view = halamanAwal();
    alamatGanti = true;
    render();
    bukaEditorDariAlamat();
    if (r.ditolak) toast(r.ditolak, true);
    else if (r.hilang) toast(`${r.hilang} tidak ada di data browser ini.`, true);
  });
  const tautanKe = alamat => location.href.split('#')[0] + alamat;

  /* ---------- Kerangka: sidebar, bilah atas, bilah bawah ---------- */

  function lencanaNav() {
    const h = hariIni();
    const kerja = I.pekerjaanSaya(S.data, S.me, h);
    return {
      hari: kerja.grup.filter(g => ['tinjau', 'antrean', 'telat', 'hari'].includes(g.kunci)).reduce((n, g) => n + g.isi.length, 0),
      proyek: I.orang(S.me).peran === 'manager' ? I.antreKeputusan(S.data, h).length : 0,
      komunikasi: I.daftarUtas(S.data, S.me, susunan(), { saring: 'baru', lingkup: 'terlibat', sejak: sejakBaca }).length,
    };
  }
  const lencanaHtml = (id, n) => (n ? `<span class="lencana ${id === 'hari' ? 'biru' : ''}">${n}</span>` : '');

  function renderSamping(lencana) {
    const o = I.orang(S.me);
    const grup = [...new Set(HALAMAN.map(h => h.grup))];
    $('#samping').innerHTML = `
      <div class="samping-merek">
        <a class="merek" href="#" data-aksi="ke" data-view="awal">${LOGO}<span class="merek-teks">${NAMA_MEREK}${versiBerkas() ? `<span class="merek-versi">v${esc(versiBerkas())}</span>` : ''}<small>Divisi Produk</small></span></a>
        <button type="button" class="ikon-tombol samping-tutup" data-aksi="tutup-nav" aria-label="Tutup menu">${ikon('tutup', 20)}</button>
      </div>
      <nav class="samping-nav" aria-label="Menu utama">${grup.map(g => {
        const isi = HALAMAN.filter(h => h.grup === g && halamanBoleh(h.id));
        if (!isi.length) return '';
        return `<div class="nav-grup"><p class="nav-grup-judul">${g}</p>${isi.map(h => `
          <button type="button" class="nav-item" data-aksi="ke" data-view="${h.id}" ${S.view === h.id ? 'aria-current="page"' : ''}>${ikon(h.ikon)}<span>${h.judul}</span>${lencanaHtml(h.id, lencana[h.id])}</button>`).join('')}</div>`;
      }).join('')}</nav>
      <div class="samping-kaki">
        <div class="kotak-profil">
          <div class="kotak-profil-atas">${S.me === I.DEV ? avatar(S.me, 'besar') : `<button type="button" class="ganti-foto" data-aksi="foto-profil" title="Ganti foto profil" aria-label="Ganti foto profil">${avatar(S.me, 'besar')}<span class="ganti-foto-tanda">${ikon('kamera', 12)}</span></button>`}<span><strong>${esc(o.nama)}</strong><small>${S.me === I.DEV ? `Akun teknis${S.devSampai ? ` · sampai ${esc(jamDev())}` : ''}` : `${esc(I.PERAN[o.peran])} · ${esc(o.jabatan)}`}</small></span></div>
          <div class="kotak-profil-aksi">
            <button type="button" class="tombol kecil" data-aksi="ganti-profil">${ikon('orang', 16)} Ganti profil</button>
            ${S.me === I.DEV ? `<button type="button" class="ikon-tombol" data-aksi="dev-keluar" title="Keluar mode Dev" aria-label="Keluar mode Dev">${ikon('keluar')}</button>`
    : `<button type="button" class="ikon-tombol" data-aksi="keluar" title="Keluar" aria-label="Keluar">${ikon('keluar')}</button>`}
          </div>
        </div>
        <div class="kotak-data ${S.mode === 'real' ? 'data-real' : ''}">
          <p class="samping-catatan" id="status-data">${esc(teksStatusData())}</p>
          ${S.mode === 'real'
    ? `<button type="button" class="tombol kecil" id="coba-simpan" data-aksi="coba-simpan" ${S.real.galat && S.real.tertunda.length ? '' : 'hidden'}>${ikon('ulang', 16)} Coba simpan lagi</button>`
    : `<button type="button" class="tombol kecil tombol-reset" data-aksi="reset-data">${ikon('ulang', 16)} Reset data contoh</button>`}
        </div>
      </div>`;
    $('#samping').classList.toggle('buka', S.navBuka);
    $('#samping-latar').hidden = !S.navBuka;
  }

  const PINTASAN = /Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘K' : 'Ctrl K';
  function renderKepala() {
    const h = HALAMAN.find(x => x.id === S.view);
    const baru = jumlahNotifBaru();
    $('#kepala').innerHTML = `<div class="kepala-dalam">
      <button type="button" class="ikon-tombol nav-buka" data-aksi="buka-nav" aria-label="Buka menu" aria-expanded="${S.navBuka}">${ikon('menu', 22)}</button>
      <p class="kepala-judul">${esc(h ? h.judul : 'ProductTrack')}</p>
      ${S.dev && (S.me === I.DEV || S.pratinjau) ? `<button type="button" class="chip-dev" data-aksi="${S.pratinjau ? 'pratinjau-akhiri' : 'ke'}" data-view="dev" title="${S.pratinjau ? 'Kembali jadi Dev' : 'Panel Dev'}">${ikon('kode', 14)} MODE DEV</button>` : ''}
      <button type="button" class="cari" data-aksi="palet">${ikon('cari', 16)}<span>Cari task, proyek, paket, atau halaman…</span><kbd>${PINTASAN}</kbd></button>
      <button type="button" class="ikon-tombol cari-hp" data-aksi="palet" aria-label="Cari atau lompat">${ikon('cari', 20)}</button>
      <div class="notif">
        <button type="button" class="ikon-tombol tombol-notif" data-aksi="notif" aria-expanded="${S.notif.buka}" aria-label="Notifikasi${baru ? `, ${baru} baru` : ''}">${ikon('lonceng', 20)}${baru ? `<span class="lencana">${baru > 9 ? '9+' : baru}</span>` : ''}</button>
        ${S.notif.buka ? panelNotif() : ''}
      </div>
      ${I.bolehBuatTask(S.me) ? `<button type="button" class="tombol utama tombol-tambah" data-aksi="tambah-task">${ikon('tambah', 16)} Tambah task</button>` : ''}
    </div>${spandukPratinjau()}`;
  }

  function renderNavBawah(lencana) {
    $('#nav-bawah').innerHTML = NAV_BAWAH.filter(halamanBoleh).map(id => {
      const h = HALAMAN.find(x => x.id === id);
      return `<button type="button" data-aksi="ke" data-view="${id}" ${S.view === id ? 'aria-current="page"' : ''}>${ikon(h.ikon, 22)}${h.judul}${lencanaHtml(id, lencana[id])}</button>`;
    }).join('') + `<button type="button" data-aksi="buka-nav" ${NAV_BAWAH.includes(S.view) ? '' : 'aria-current="page"'}>${ikon('menu', 22)}Menu</button>`;
    /* Tombol tambah task hanya di halaman task; di Komunikasi ia menutupi kotak tulis. */
    $('#fab').hidden = !I.bolehBuatTask(S.me) || !HALAMAN_TASK.includes(S.view);
  }
  const HALAMAN_TASK = ['hari', 'dashboard', 'task', 'proyek'];

  const GAMBAR = {
    hari: () => viewHari(), dashboard: () => viewDashboard(), laporan: () => viewLaporan(), task: () => viewTask(),
    proyek: () => viewProyek(), paket: () => viewPaket(), komunikasi: () => viewKomunikasi(),
    link: () => viewLink(), catatan: () => viewCatatan(), riwayat: () => viewRiwayat(), panduan: () => viewPanduan(),
    master: () => viewMaster(), dev: () => viewDev(),
  };
  /* Bagian halaman yang digambar ulang saat orang mengetik di kotak cari halaman,
     supaya kotaknya tidak kehilangan fokus. */
  const HASIL = { task: () => hasilTask(), paket: () => hasilPaket(), komunikasi: () => hasilKomunikasi(), link: () => hasilLink(), catatan: () => daftarCatatan(), riwayat: () => hasilRiwayat() };

  function render() {
    if (!halamanBoleh(S.view)) S.view = halamanAwal();
    tandaiRuangTerbuka();
    tutupSebutan();
    const lencana = lencanaNav();
    renderSamping(lencana);
    renderKepala();
    renderNavBawah(lencana);
    $('#isi').innerHTML = GAMBAR[S.view]();
    renderLaci();
    renderPemandu();
    gulirPesan('kom');
    gulirPesan('detail');
    for (const ta of $$('.km-isian')) if (ta.value) tumbuhkan(ta);
    const h = HALAMAN.find(x => x.id === S.view);
    document.title = (h ? h.judul : 'ProductTrack') + ' · ProductTrack v2';
    catatAlamat();
  }

  /* Suntingan paket yang belum disimpan tak boleh hilang diam-diam. */
  function bolehTinggalkanPaket() {
    if (!S.pkt.sunting || !S.pkt.kotor) return true;
    if (!confirm('Perubahan rancangan paket belum disimpan. Tinggalkan dan buang perubahannya?')) return false;
    Object.assign(S.pkt, { sunting: false, kotor: false });
    return true;
  }

  function pindahHalaman(view) {
    if (!bolehTinggalkanPaket()) return;
    simpanCatatanTertunda();
    S.view = view;
    S.navBuka = false;
    S.notif.buka = false;
    S.pilih = view === 'hari' ? S.pilih : null;
    if (view === 'proyek') S.proyek = null;
    if (view === 'paket') Object.assign(S.pkt, { pilih: null, sunting: false, kotor: false });
    simpan('halaman', S.view);
    render();
    window.scrollTo(0, 0);
    // Komunikasi menarik pesan lebih sering; masuk ke sana langsung menarik yang terbaru.
    if (view === 'komunikasi' && Date.now() - (S.obr.diperbarui || 0) > 5000) tarikObrolan();
    jadwalkanTarik();
  }
  function bukaProyek(id) {
    if (!bolehTinggalkanPaket()) return;
    Object.assign(S, { proyek: id, pilih: null, view: 'proyek', navBuka: false, tahapBuka: null });
    simpan('halaman', 'proyek');
    render();
    window.scrollTo(0, 0);
  }
  function bukaPaket(id) {
    if (!bolehTinggalkanPaket()) return;
    Object.assign(S.pkt, { pilih: id, sunting: false, kotor: false });
    Object.assign(S, { view: 'paket', pilih: null, navBuka: false });
    simpan('halaman', 'paket');
    render();
    window.scrollTo(0, 0);
  }

  const detailSebaris = () => S.view === 'hari' && window.matchMedia('(min-width: 1200px)').matches;

  function renderLaci() {
    const t = S.pilih && S.data.tasks.find(x => x.id === S.pilih);
    const tampil = !!t && !detailSebaris();
    $('#laci').hidden = !tampil;
    $('#laci-panel').innerHTML = tampil ? detailHtml(t, true) : '';
    document.body.style.overflow = tampil || S.navBuka ? 'hidden' : '';
  }

  /* ---------- Notifikasi ----------
     Dihitung dari data (inti.notifikasi). "Baru" = lebih baru dari terakhir kali profil ini
     membuka lonceng. Untuk pertama kalinya batasnya dua hari sebelum data contoh diimpor,
     supaya kejadian di skenario contoh ikut terlihat. Disimpan per profil di browser ini. */

  let notifSimpan = { kunci: '', isi: [] };
  function notifSaya() {
    const log = S.data.log;
    const kunci = `${S.me}|${S.dimuat}|${log.length}|${log[0] ? log[0].id : ''}|${S.obr.versi}`;
    if (notifSimpan.kunci !== kunci) notifSimpan = { kunci, isi: I.notifikasi(S.data, S.me, 60, susunan()) };
    return notifSimpan.isi;
  }
  function notifDibaca() {
    const v = ambil('notif_' + S.me, null);
    if (v != null) return Number(v) || 0;
    return (Date.parse(S.versi) || S.dimuat || Date.now()) - 2 * 864e5;
  }
  const jumlahNotifBaru = () => { const batas = notifDibaca(); return notifSaya().filter(n => n.at > batas).length; };
  const IKON_NOTIF = {
    baru: 'tambah', tambah: 'tambah', serah: 'serah', siap: 'centang', tinjau: 'tugas', kembali: 'ulang', setuju: 'centang',
    komentar: 'obrolan', sebut: 'at', tanya: 'tanya', siklus: 'lapis',
  };

  function kalimatNotif(n) {
    const t = n.task ? perIdKini().get(n.task) : null;
    const siapa = n.oleh ? `<strong>${nama(n.oleh)}</strong>${tandaAi(n.ai)} ` : '';
    const judul = t ? `<b>${esc(t.id)}</b> ${esc(potong(t.title, 64))}` : n.ruang ? `<b>${esc(judulRuang(n.ruang))}</b>` : esc(n.task || '');
    const kutip = s => (s ? ` “${esc(potong(teksPolos(s), 90))}”` : '');
    switch (n.jenis) {
      case 'baru': return `${siapa}memberi Anda task baru: ${judul}`;
      case 'tambah': return `${siapa}menambah task untuk dirinya sendiri: ${judul}`;
      case 'serah': return `${siapa}menyerahkan ${judul} ke Anda`;
      case 'siap': return t && I.orang(S.me).peran === 'lead' && t.lane === 'proyek' && I.timDari(S.me).length
        ? `${judul} siap: kerjakan, atau bagi ke staff lewat task anak` : `${judul} siap dikerjakan: ${t && I.tungguTahap(t) ? 'tahap sebelumnya sudah selesai' : 'task yang ditunggunya sudah selesai'}`;
      case 'tinjau': return `${siapa}mengajukan ${judul} untuk Anda tinjau`;
      case 'kembali': return `${siapa}mengembalikan ${judul}.${kutip(n.teks)}`;
      case 'setuju': return `${siapa}menyetujui ${judul}`;
      case 'komentar': return `${siapa}menulis di ${judul}:${kutip(n.teks)}`;
      case 'sebut': return `${siapa}menyebut Anda di ${judul}:${kutip(n.teks)}`;
      case 'tanya': return `${siapa}menunggu jawaban Anda di ${judul}:${kutip(n.teks)}`;
      case 'siklus': { const p = proyekDari(n.proyek); return `Siklus <strong>${esc(p ? p.name : n.proyek)}</strong> selesai: E12 disetujui, perlu keputusan Anda`; }
      default: return judul;
    }
  }

  function panelNotif() {
    const daftar = notifSaya().slice(0, 40);
    return `<div class="panel-notif" role="dialog" aria-label="Notifikasi">
      <div class="panel-notif-kepala"><strong>Notifikasi</strong><span class="hint">untuk ${esc(I.orang(S.me).pendek)}</span></div>
      <div class="panel-notif-isi">${daftar.map(n => `<button type="button" class="notif-item ${n.at > S.notif.sebelum ? 'baru' : ''}" data-aksi="notif-buka" data-id="${esc(n.task || '')}" data-proyek="${esc(n.proyek || '')}" data-ruang="${esc(n.ruang || '')}" data-pesan="${esc(n.pesan || '')}">
          <span class="notif-ikon jn-${n.jenis}">${ikon(IKON_NOTIF[n.jenis] || 'lonceng', 16)}</span>
          <span class="notif-teks">${kalimatNotif(n)}<small>${esc(relatif(n.at))}</small></span>
        </button>`).join('') || '<p class="hint panel-notif-kosong">Belum ada yang menyangkut Anda.</p>'}</div>
      <p class="panel-notif-kaki">Pesan Komunikasi terbagi untuk semua orang; aktivitas task lainnya dari data contoh browser ini. Ganti profil untuk melihat notifikasi orang lain.</p>
    </div>`;
  }

  /* Membuka lonceng menandai semuanya dibaca; yang tadinya baru tetap disorot selama panel terbuka. */
  function bukaTutupNotif(buka = !S.notif.buka) {
    S.notif.buka = buka;
    if (buka) { S.notif.sebelum = notifDibaca(); simpan('notif_' + S.me, Date.now()); }
    renderKepala();
  }

  /* ---------- Cari & lompat (Ctrl+K) ----------
     Satu kotak untuk mencari task, proyek, paket, catatan, link, atau halaman, dan untuk
     menjalankan aksi. Panah atas/bawah memilih, Enter menjalankan, Esc menutup. */

  /* Task yang muncul di pencarian mengikuti lingkup terluas peran (Staff: miliknya; Lead: timnya;
     Manager: semua), ditambah task yang melibatkan dia (pemberi, peninjau, pendukung, komentar). */
  function taskTerjangkau() {
    const ids = I.lingkupOrang(S.me, I.lingkupBoleh(S.me).slice(-1)[0]);
    return t => !ids || ids.includes(t.pic) || I.terlibat(t, S.me);
  }

  function itemPalet(q) {
    const kata = q.trim().toLowerCase();
    const cocok = s => !kata || String(s).toLowerCase().includes(kata);
    const peran = I.orang(S.me).peran;
    const isi = [];
    for (const h of HALAMAN.filter(x => halamanBoleh(x.id))) {
      if (cocok(`${h.judul} ${h.grup}`)) isi.push({ grup: 'Halaman', ikon: h.ikon, label: h.judul, ket: h.grup, jalan: () => pindahHalaman(h.id) });
    }
    if (kata) for (const t of TAMPILAN) {
      if (cocok(`task ${t.judul}`)) isi.push({ grup: 'Halaman', ikon: t.ikon, label: `Task · ${t.judul}`, ket: 'Tampilan Task', jalan: () => { S.task.tampilan = t.id; simpanPref('task'); pindahHalaman('task'); } });
    }
    const aksi = [
      I.bolehBuatTask(S.me) && ['tambah', 'Tambah task', () => bukaModal({ jenis: 'tambah' }, formTask(null))],
      peran === 'manager' && ['lapis', 'Proyek baru', () => { pindahHalaman('proyek'); bukaModal({ jenis: 'proyek' }, formProyek()); }],
      ['lead', 'manager'].includes(peran) && ['kotak', 'Rancangan paket baru', () => { pindahHalaman('paket'); bukaModal({ jenis: 'paket-baru' }, formPaketBaru()); }],
      ['catatan', 'Catatan baru', () => { pindahHalaman('catatan'); catatanBaru(); }],
      ['penanda', 'Tambah link', () => { pindahHalaman('link'); setTimeout(() => { const el = $('#link-tempel'); if (el) el.focus(); }, 30); }],
      ['lonceng', 'Buka notifikasi', () => bukaTutupNotif(true)],
      ['orang', 'Ganti profil', () => tampilProfil()],
      ['kamera', 'Foto profil', () => bukaFoto()],
      ['buku', 'Buka Panduan', () => pindahHalaman('panduan')],
      S.mode !== 'real' && ['ulang', 'Reset data contoh', () => resetData()],
    ].filter(Boolean);
    for (const [ik, label, jalan] of aksi) if (cocok(label)) isi.push({ grup: 'Aksi', ikon: ik, label, jalan });
    if (!kata) return isi;
    // Paket dan proyek lebih dulu: jumlahnya sedikit, dan biasanya itulah yang dicari lewat namanya.
    for (const p of S.data.packages.filter(x => cocok(`${x.id} ${judulPaket(x)} ${x.program} ${x.platform}`)).slice(0, 4)) {
      isi.push({ grup: 'Rancangan paket', ikon: 'kotak', label: judulPaket(p), ket: p.id, jalan: () => bukaPaket(p.id) });
    }
    for (const p of S.data.projects.filter(x => cocok(`${x.id} ${x.name} ${x.platform}`)).sort((a, b) => a.arsip - b.arsip).slice(0, 4)) {
      isi.push({ grup: 'Proyek', ikon: 'lapis', label: p.name, ket: `${p.id}${p.arsip ? ' · arsip' : ''}`, jalan: () => bukaProyek(p.id) });
    }
    for (const t of I.cari(S.data, kata, 400).filter(taskTerjangkau()).slice(0, 7)) {
      isi.push({ grup: 'Task', ikon: 'tugas', label: t.title, ket: `${t.id} · ${t.status} · ${I.orang(t.pic).pendek}`, jalan: () => bukaTask(t.id) });
    }
    for (const n of S.data.notes.filter(x => x.user === S.me && cocok(`${x.title} ${x.body}`)).slice(0, 4)) {
      isi.push({ grup: 'Catatan', ikon: 'catatan', label: judulCatatan(n), ket: n.folder || I.FOLDER_UMUM, jalan: () => bukaCatatan(n.id) });
    }
    for (const l of S.data.links.filter(x => x.user === S.me && cocok(`${x.title} ${x.url} ${x.folder}`)).slice(0, 4)) {
      isi.push({ grup: 'Link', ikon: 'tautan', label: l.title, ket: namaSitus(l.url), jalan: () => { hitungKlik(l.id); window.open(l.url, '_blank', 'noopener'); } });
    }
    return isi;
  }

  function hasilPalet() {
    const isi = itemPalet(S.palet.q);
    S.palet.isi = isi;
    S.palet.pilih = Math.min(S.palet.pilih, Math.max(0, isi.length - 1));
    let grup = '';
    return isi.map((x, i) => {
      const kepala = x.grup !== grup ? `<p class="palet-grup">${esc(x.grup)}</p>` : '';
      grup = x.grup;
      return `${kepala}<button type="button" class="palet-item ${i === S.palet.pilih ? 'aktif' : ''}" data-aksi="palet-jalan" data-i="${i}" role="option" aria-selected="${i === S.palet.pilih}">
        ${ikon(x.ikon, 16)}<span>${esc(x.label)}</span>${x.ket ? `<small>${esc(x.ket)}</small>` : ''}</button>`;
    }).join('') || '<p class="hint palet-kosong">Tidak ada yang cocok.</p>';
  }

  function bukaPalet() {
    S.palet = { q: '', pilih: 0, isi: [] };
    S.notif.buka = false;
    bukaModal({ jenis: 'palet' }, `<div class="palet">
      <label class="palet-cari">${ikon('cari', 18)}<span class="sr">Cari atau lompat</span>
        <input id="palet-q" type="search" placeholder="Cari task, proyek, paket, halaman, atau aksi…" autocomplete="off" aria-controls="palet-hasil"></label>
      <div id="palet-hasil" class="palet-hasil" role="listbox">${hasilPalet()}</div>
      <p class="palet-kaki">↑ ↓ pilih · Enter buka · Esc tutup</p>
    </div>`);
    $('#modal-panel').classList.add('panel-palet');
  }
  function geserPalet(n) {
    const jumlah = (S.palet.isi || []).length;
    if (!jumlah) return;
    S.palet.pilih = (S.palet.pilih + n + jumlah) % jumlah;
    $('#palet-hasil').innerHTML = hasilPalet();
    const aktif = $('.palet-item.aktif');
    if (aktif) aktif.scrollIntoView({ block: 'nearest' });
  }
  function jalankanPalet(i) {
    const x = (S.palet.isi || [])[i];
    if (!x) return;
    tutupModal();
    x.jalan();
  }

  /* ---------- Hari Ini ---------- */

  function sapaan() {
    const j = new Date().getHours();
    return j < 11 ? 'Selamat pagi' : j < 15 ? 'Selamat siang' : j < 18 ? 'Selamat sore' : 'Selamat malam';
  }

  function pitaPeran() {
    const o = I.orang(S.me);
    const h = hariIni();
    if (o.peran === 'staff') return '';
    const ids = I.lingkupOrang(S.me, o.peran === 'manager' ? 'semua' : 'tim');
    const p = I.perhatian(S.data, ids, S.me, h);
    const keputusan = o.peran === 'manager' ? I.antreKeputusan(S.data, h).length : 0;
    const chip = (n, teks, kelas, fokus) => (n ? `<button type="button" class="chip-aksi ${kelas}" data-aksi="fokus-papan" data-fokus="${fokus}">${n} ${teks}</button>` : '');
    const isi = [
      keputusan ? `<button type="button" class="chip-aksi kuning" data-aksi="ke" data-view="proyek">${keputusan} keputusan proyek</button>` : '',
      chip(p.tinjau, 'menunggu tinjauan Anda', 'kuning', 'tinjau'),
      chip(p.telat, 'terlambat', 'merah', 'telat'),
      chip(p.tertahan, 'tertahan', 'merah', 'tertahan'),
    ].join('');
    return `<div class="pita"><strong>${o.peran === 'manager' ? 'Divisi' : 'Tim saya'}</strong>
      <span class="pesan-info">${p.aktif} task aktif</span>
      ${isi || '<span class="pesan-info">· tidak ada yang perlu perhatian</span>'}
      <button type="button" class="tombol kecil" data-aksi="ke" data-view="task">${ikon('tugas', 16)} Buka Task</button>
    </div>`;
  }

  function viewHari() {
    const h = hariIni();
    const o = I.orang(S.me);
    const kerja = I.pekerjaanSaya(S.data, S.me, h);
    const n = kunci => (kerja.grup.find(g => g.kunci === kunci) || { isi: [] }).isi.length;
    const nHari = n('hari'), nTelat = n('telat'), nTinjau = n('tinjau'), nAntre = n('antrean');
    const kalimat = [
      nHari ? `<strong>${nHari} task</strong> untuk hari ini` : '',
      nTelat ? `<strong>${nTelat}</strong> terlambat` : '',
      nTinjau ? `<strong>${nTinjau}</strong> menunggu tinjauan Anda` : '',
      nAntre ? `<strong>${nAntre}</strong> langkah di antrean tim, siap dibagi` : '',
    ].filter(Boolean);
    const bantu = { antrean: ['lead-antrean', 'antrean tim'], tinjau: ['lead-tinjau', 'meninjau'] };
    const daftar = kerja.grup.map(g => `<section class="grup ${g.kunci}">
      <h2>${esc(g.judul)} <span class="jumlah">${g.isi.length}</span>${bantu[g.kunci] ? tanya(...bantu[g.kunci]) : ''}</h2>
      ${g.isi.map(x => barisTask(x.t, x.alasan)).join('')}
    </section>`).join('');
    const selesai = kerja.selesaiHariIni.length ? `<details class="ringkas"><summary>Selesai hari ini (${kerja.selesaiHariIni.length})</summary>
      <div class="grup">${kerja.selesaiHariIni.map(t => barisTask(t)).join('')}</div></details>` : '';
    const t = S.pilih && S.data.tasks.find(x => x.id === S.pilih);
    return `<div class="judul-halaman"><div>
        <p class="tanggal-kecil">${esc(fmtTanggalPanjang(h))}</p>
        <h1>${sapaan()}, ${esc(o.pendek)}</h1>
        <p>${kalimat.length ? 'Ada ' + kalimat.join(', ') + '.' : 'Tidak ada yang mendesak hari ini.'}</p>
      </div></div>
      <div class="dua-kolom">
        <div class="kolom-utama">
          ${ajakanPanduan()}
          ${pitaPeran()}
          ${daftar || '<div class="kosong-isi">Belum ada pekerjaan aktif untuk Anda.</div>'}
          ${selesai}
        </div>
        <div class="kolom-samping">${t ? detailHtml(t, false) : '<div class="kosong-isi">Pilih task untuk melihat detail dan langkah-langkahnya.</div>'}</div>
      </div>`;
  }

  /* ---------- Detail task ---------- */

  /* Setoran task ini ke rancangan paket. Lead/Manager task ini bisa menambah atau menghapus;
     untuk task proyek yang tertaut paket, pilihan targetnya dari paket itu saja. */
  /* Langkah tanpa setoran sendiri (mis. I1, E4) tetap bagian dari batch elaborasi: telusuri
     langkah sebelumnya yang tercatat di deps sampai langkah pertama, lalu ambil setoran batch
     itu. (Sejak 0.15.0 deps langkah elaborasi hanya catatan urutan, bukan penahan.) */
  function setoranBatch(t) {
    const perId = perIdKini();
    let akar = t;
    for (let n = 0; n < 20 && akar.deps && akar.deps.length === 1; n++) {
      const d = perId.get(akar.deps[0]);
      if (!d || d.project !== t.project) break;
      akar = d;
    }
    return (S.data.setoran || []).filter(x => x.batch === 'B-' + akar.id);
  }

  function bagianSetoran(t, proj) {
    const milik = (S.data.setoran || []).filter(x => x.task === t.id);
    const bisa = I.bolehSetor(t, S.me);
    const pk = proj && proj.paket ? paketDari(proj.paket) : null;
    const sumber = pk ? [pk] : S.data.packages.filter(x => x.items.length);
    const batch = milik.length || !t.project ? [] : setoranBatch(t);
    if (batch.length) {
      const perId = perIdKini();
      const paket = paketDari(batch[0].paket);
      const langkah = batch.map(x => { const s = perId.get(x.task); return s ? `${s.sub} ${I.namaCapaian(x.tahap || 'tayang')}${I.selesai(s) ? ' ✓' : ''}` : ''; }).filter(Boolean);
      return `<section><p class="subjudul">Progres rancangan paket</p>
        <p class="hint">Langkah ini tidak membawa capaian sendiri. Progres ${paket ? esc(judulPaket(paket)) : 'paket'} untuk batch ini naik di langkah: ${esc(langkah.join(' → '))}.</p>
      </section>`;
    }
    if (!milik.length && !(bisa && sumber.length)) return '';
    const daftar = milik.map(x => {
      const paket = paketDari(x.paket);
      const it = paket && paket.items.find(i => i.id === x.item);
      if (!paket || !it) return '';
      const cap = I.CAPAIAN.find(c => c.kode === (x.tahap || 'tayang')) || I.CAPAIAN[I.CAPAIAN.length - 1];
      return `<div class="setoran-baris">${ikon('kotak', 16)}
        <span><button type="button" class="tautan-task" data-aksi="paket-buka" data-id="${esc(paket.id)}">${esc(judulPaket(paket))}</button>
          ${esc(it.kategori)} · ${esc(it.nama)} <b>${fmtAngka(x.jumlah)} ${esc(it.satuan)}</b> <span class="pill cp-${cap.kode}">${esc(cap.nama)} ${Math.round(cap.bobot * 100)}%</span>
          <small>${I.selesai(t) ? `Sudah terhitung: batch ini "${esc(cap.nama)}" di progres paket.`
            : `Saat task ini disetujui, batch ini tercatat "${esc(cap.nama)}" (${Math.round(cap.bobot * 100)}% dari ${fmtAngka(x.jumlah)}).`}</small></span>
        ${bisa ? `<button type="button" class="ikon-tombol" data-aksi="setoran-hapus" data-id="${esc(x.id)}" aria-label="Hapus setoran">${ikon('hapus', 16)}</button>` : ''}
      </div>`;
    }).join('');
    const opsi = sumber.map(paket => `<optgroup label="${esc(judulPaket(paket))}">${paket.items.map(it =>
      `<option value="${esc(paket.id)}|${esc(it.id)}">${esc(it.kategori)} · ${esc(it.nama || '—')}</option>`).join('')}</optgroup>`).join('');
    return `<section><p class="subjudul">Setoran ke rancangan paket</p>
      ${daftar || '<p class="hint">Task ini belum menyetor ke target paket mana pun.</p>'}
      ${bisa && sumber.length ? `<form class="baris-form" data-form="setoran" data-id="${esc(t.id)}">
        <label class="sr" for="setor-${esc(t.id)}">Target paket</label>
        <select class="input" id="setor-${esc(t.id)}" name="sasaran" required>${opsi}</select>
        <label class="sr" for="setorn-${esc(t.id)}">Jumlah</label>
        <input class="input angka" id="setorn-${esc(t.id)}" name="jumlah" inputmode="decimal" placeholder="Jumlah" required maxlength="8">
        <label class="sr" for="setorc-${esc(t.id)}">Capaian saat disetujui</label>
        <select class="input" id="setorc-${esc(t.id)}" name="tahap">${opsiHtml(I.CAPAIAN.map(c => [c.kode, `${c.nama} ${Math.round(c.bobot * 100)}%`]), 'tayang')}</select>
        <button class="tombol">Setor</button>
      </form>` : ''}
    </section>`;
  }

  /* Syarat sebelum output task proyek diajukan ke gate (PRD), sebagai daftar periksa. */
  function bagianSyarat(t, perId) {
    if (t.lane !== 'proyek' || I.selesai(t) || t.status === 'Ditinjau') return '';
    const s = I.syaratAjukan(t, perId);
    const kurang = s.filter(x => !x.ok).length;
    return `<section><p class="subjudul">Syarat ajukan ${kurang ? `<span class="pill lb-revisi">${kurang} belum</span>` : '<span class="pill st-selesai">Lengkap</span>'}${tanya('staff-ajukan', 'mengajukan task')}</p>
      <ul class="syarat">${s.map(x => `<li class="${x.ok ? 'ok' : 'kurang'}">${ikon(x.ok ? 'centang' : 'bulat', 18)}<span>${esc(x.label)}</span><span class="sr">${x.ok ? 'terpenuhi' : 'belum'}</span></li>`).join('')}</ul>
    </section>`;
  }

  /* Output dan tautan bukti diisi PIC sendiri (staff juga), Lead-nya, atau Manager. Untuk task
     proyek keduanya syarat sebelum diajukan. */
  function bagianOutput(t, boleh) {
    const id = esc(t.id);
    const bukti = t.evidence.filter(e => tautanAman(e.url));
    const daftar = bukti.map(e => `<div class="bukti-baris">
        <a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${ikon('tautan', 16)} <span>${esc(e.label || e.url)}</span></a>
        ${boleh ? `<button type="button" class="ikon-tombol" data-aksi="bukti-hapus" data-id="${id}" data-bukti="${esc(e.id)}" aria-label="Hapus bukti ${esc(e.label)}">${ikon('hapus', 16)}</button>` : ''}
      </div>`).join('');
    if (!boleh && !t.output && !bukti.length) return '';
    return `<section><p class="subjudul">Output & bukti</p>
      ${boleh ? `<form class="baris-form" data-form="output" data-id="${id}">
          <label class="sr" for="out-${id}">Output</label>
          <input class="input" id="out-${id}" name="output" maxlength="200" value="${esc(t.output)}" placeholder="Hasil kerja, mis. 40 soal lolos QC" autocomplete="off">
          <button class="tombol">Simpan</button>
        </form>` : t.output ? `<p class="teks-panjang">${esc(t.output)}</p>` : '<p class="hint">Output belum diisi.</p>'}
      ${daftar ? `<div class="bukti-daftar">${daftar}</div>` : boleh ? '' : '<p class="hint">Belum ada tautan bukti.</p>'}
      ${boleh ? `<form class="baris-form" data-form="bukti" data-id="${id}">
          <label class="sr" for="bukti-${id}">Alamat bukti</label>
          <input class="input" id="bukti-${id}" name="url" maxlength="2000" inputmode="url" placeholder="Tautan bukti, mis. https://docs.google.com/…" required autocomplete="off">
          <label class="sr" for="buktil-${id}">Label bukti</label>
          <input class="input label-bukti" id="buktil-${id}" name="label" maxlength="120" placeholder="Label (opsional)" autocomplete="off">
          <button class="tombol">Tambah bukti</button>
        </form>` : ''}
    </section>`;
  }

  /* Task anak: Lead membagi task yang ia pegang ke staff timnya (0.15.0, pengganti "Serahkan
     ke staff"). Anak ditinjau Lead itu; induknya baru bisa diajukan setelah semua anaknya selesai. */
  function bagianAnak(t, perId) {
    const anak = I.anakTask(perId, t.id).slice().sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
    const bisa = I.bolehBuatAnak(t, S.me);
    if (!anak.length && !bisa) return '';
    const id = esc(t.id);
    const staf = I.timDari(S.me);
    const beres = anak.filter(I.selesai).length;
    return `<section><p class="subjudul">Task anak ${anak.length ? `· ${beres}/${anak.length} selesai` : ''}${tanya('lead-antrean', 'membagi task ke staff')}</p>
      ${anak.length ? `<div class="grup daftar-anak">${anak.map(x => barisTask(x, x.tertahan ? I.alasanTunggu(x, perId) : '', 'di-induk')).join('')}</div>` : ''}
      ${bisa ? `<form class="baris-form form-anak" data-form="anak" data-id="${id}">
          <label class="sr" for="anak-${id}">Judul task anak</label>
          <input class="input" id="anak-${id}" name="judul" placeholder="Bagian untuk staff, mis. Soal paket 1–2" required maxlength="200" autocomplete="off">
          <label class="sr" for="anakpic-${id}">PIC task anak</label>
          <select class="input" id="anakpic-${id}" name="pic">${opsiHtml(staf.map(x => [x, I.orang(x).nama]), staf[0])}</select>
          <label class="sr" for="anakdue-${id}">Tenggat task anak</label>
          <input class="input tenggat-anak" type="date" id="anakdue-${id}" name="due" value="${esc(t.due || '')}" title="Tenggat">
          <button class="tombol">${ikon('tambah', 16)} Buat task anak</button>
        </form>
        <p class="hint">Bagi pekerjaan task ini ke staff tim Anda. Task anak tampil menjorok di bawah task ini dan ditinjau Anda; task ini baru bisa ${I.peninjau(t) ? 'diajukan' : 'ditandai selesai'} setelah semua task anaknya selesai.</p>` : ''}
    </section>`;
  }

  /* Sub-task yang sedang diubah: judul dan PIC-nya, di tempat. */
  function formUbahSub(t, s, pilihan) {
    const id = esc(t.id + '-' + s.id);
    return `<form class="baris-form ceklis-ubah" data-form="sub-ubah" data-id="${esc(t.id)}" data-sub="${esc(s.id)}">
      <label class="sr" for="subu-${id}">Judul sub-task</label>
      <input class="input" id="subu-${id}" name="judul" value="${esc(s.title)}" required maxlength="200" autocomplete="off">
      <label class="sr" for="subupic-${id}">PIC sub-task</label>
      <select class="input" id="subupic-${id}" name="pic">${[...new Set([...pilihan, s.pic])].map(x => `<option value="${esc(x)}" ${x === s.pic ? 'selected' : ''}>${nama(x)}</option>`).join('')}</select>
      <button class="tombol utama">Simpan</button>
      <button type="button" class="tombol" data-aksi="sub-batal">Batal</button>
    </form>`;
  }

  function detailHtml(t, diLaci) {
    const me = S.me;
    const perId = perIdKini();
    const p = t.project ? proyekDari(t.project) : null;
    const tinjau = I.peninjau(t);
    const aksi = I.aksiUntuk(t, me, perId);
    const utama = aksi.filter(a => a.utama);
    const lain = aksi.filter(a => !a.utama);
    const tunggu = I.alasanTunggu(t, perId);
    const bisaUbah = I.bolehUbahTask(t, me);
    const bisaSub = I.bolehUbah(t, me);
    const pilihanPic = [...new Set([...(I.orang(me).peran === 'staff' ? [me] : I.picBoleh(me)), t.pic])];
    const log = S.data.log.filter(l => String(l.task).startsWith(t.id + ' ')).slice(0, 8);
    const jenis = I.jenisJalur(t);
    const s = I.subTahap(t.sub);
    const tim = I.TIM[I.timTask(t)];
    const induk = t.induk ? perId.get(t.induk) : null;

    return `<div class="detail">
      <div class="detail-atas"><div>
        <p class="detail-asal">${p ? `<button type="button" data-aksi="buka-proyek" data-id="${esc(p.id)}">${esc(p.name)}</button>` : `${jenis === 'lepas' ? 'Lepas' : 'Rutin'} · ${esc(t.kategori || 'Umum')}`} · ${esc(t.id)}</p>
        <h2>${esc(t.title)}</h2>
        ${induk ? `<p class="detail-induk">↳ Task anak dari <button type="button" data-aksi="buka-task" data-id="${esc(induk.id)}">${esc(induk.id)} · ${esc(potong(induk.title, 80))}</button></p>` : ''}
        <p class="detail-sub">${s ? `${chipJalur(t)} ${esc(s.nama)}` : '<span class="pill lb-menunggu">Belum ber-sub-stage</span>'}${tim ? ` · Tim ${esc(tim.nama)}` : ''}${s && s.reviewManager ? ' · direview Manager' : ''}${tanya('konsep-kode', 'sub-stage dan tim')}</p>
        <div class="detail-chip">${pillStatus(t.status)} ${chipLabel(t)} ${chipTenggat(t)} ${chipPenting(t)}</div>
        <div class="detail-orang">${avatar(t.pic)} PIC ${nama(t.pic)}
          ${t.support.length ? ` · bantuan ${t.support.map(nama).join(', ')}` : ''}
          · ${tinjau ? 'ditinjau ' + nama(tinjau) : jenis === 'proyek' ? 'tanpa tinjauan' : 'tanpa tinjauan (di luar proyek)'}</div>
      </div>
      <div class="detail-tombol">
        <button type="button" class="ikon-tombol" data-aksi="salin-tautan" data-alamat="#/task/${esc(t.id)}" title="Salin tautan task ini" aria-label="Salin tautan task">${ikon('tautan', 18)}</button>
        ${diLaci ? `<button type="button" class="ikon-tombol" data-aksi="tutup-detail" aria-label="Tutup">${ikon('tutup', 20)}</button>` : ''}
      </div></div>

      ${p ? `<section><p class="subjudul">Tahap proyek${t.stage !== p.stage ? ` · task ini di ${esc(I.namaTahap(t.stage))}` : ''}</p>${jalurTahap(p, t.stage, I.siklusTutup(S.data, p), true)}</section>` : ''}
      ${tunggu ? `<div class="banner ${t.tertahan ? 'merah' : 'kuning'}">${esc(tunggu)}</div>` : ''}

      ${aksi.length || bisaUbah ? `<section>
        <div class="detail-aksi">
          ${utama.map(a => `<button type="button" class="tombol utama" data-aksi="aksi-task" data-kunci="${a.kunci}" data-id="${esc(t.id)}" ${a.nonaktif ? 'disabled' : ''}>${esc(a.label)}</button>`).join('')}
          ${lain.map(a => `<button type="button" class="tombol ${['tahan', 'kembalikan'].includes(a.kunci) ? 'bahaya' : ''}" data-aksi="aksi-task" data-kunci="${a.kunci}" data-id="${esc(t.id)}" ${a.nonaktif ? 'disabled' : ''}>${esc(a.label)}</button>`).join('')}
          ${bisaUbah ? `<button type="button" class="tombol" data-aksi="ubah-task" data-id="${esc(t.id)}">Ubah</button>` : ''}
        </div>
        ${aksi.filter(a => a.nonaktif && a.alasan).map(a => `<p class="hint">${esc(a.alasan)}</p>`).join('')}
      </section>` : ''}

      ${bagianSyarat(t, perId)}
      ${bagianAnak(t, perId)}
      ${bagianOutput(t, bisaSub)}

      <section>
        <p class="subjudul">Sub-task ${t.subtasks.length ? `· ${t.subtasks.filter(s => s.done).length}/${t.subtasks.length}` : ''}</p>
        ${t.subtasks.length ? `<div class="ceklis">${t.subtasks.map(s => {
          const boleh = bisaSub || s.pic === me;
          if (bisaSub && S.ubahSub && S.ubahSub.task === t.id && S.ubahSub.sub === s.id) return formUbahSub(t, s, pilihanPic);
          return `<div class="ceklis-baris"><label class="${s.done ? 'beres' : ''}"><input type="checkbox" data-aksi="centang-sub" data-id="${esc(t.id)}" data-sub="${esc(s.id)}" ${s.done ? 'checked' : ''} ${boleh ? '' : 'disabled'}>
            <span>${esc(s.title)}</span><small>${nama(s.pic)}</small></label>
            ${bisaSub ? `<span class="ceklis-aksi">
              <button type="button" class="ikon-tombol" data-aksi="sub-ubah" data-id="${esc(t.id)}" data-sub="${esc(s.id)}" title="Ubah sub-task" aria-label="Ubah sub-task ${esc(s.title)}">${ikon('sunting', 16)}</button>
              <button type="button" class="ikon-tombol" data-aksi="sub-hapus" data-id="${esc(t.id)}" data-sub="${esc(s.id)}" title="Hapus sub-task" aria-label="Hapus sub-task ${esc(s.title)}">${ikon('hapus', 16)}</button>
            </span>` : ''}</div>`;
        }).join('')}</div>` : '<p class="hint">Belum ada sub-task.</p>'}
        ${bisaSub ? `<form class="baris-form" data-form="sub-tambah" data-id="${esc(t.id)}">
          <label class="sr" for="sub-${esc(t.id)}">Sub-task baru</label>
          <input class="input" id="sub-${esc(t.id)}" name="judul" placeholder="Tambah sub-task…" required maxlength="200">
          <label class="sr" for="subpic-${esc(t.id)}">PIC sub-task</label>
          <select class="input" id="subpic-${esc(t.id)}" name="pic">${pilihanPic.map(id => `<option value="${esc(id)}" ${id === t.pic ? 'selected' : ''}>${nama(id)}</option>`).join('')}</select>
          <button class="tombol">Tambah</button>
        </form>` : ''}
      </section>

      ${bagianSetoran(t, p)}
      ${t.detail || t.notes ? `<section><p class="subjudul">Keterangan</p>${t.detail ? `<p class="teks-panjang">${teksBertaut(t.detail)}</p>` : ''}${t.notes ? `<p class="teks-panjang">${teksBertaut(t.notes)}</p>` : ''}</section>` : ''}
      ${t.tinjauan.length ? `<section><p class="subjudul">Riwayat tinjauan</p><ul class="riwayat">${t.tinjauan.slice().sort((a, b) => b.at - a.at).map(r => `
        <li><strong>${esc(r.action)}</strong> oleh ${nama(r.by)}${tandaAi(r.ai)} <small>· ${esc(relatif(r.at))}</small>${r.note ? `<br>${esc(r.note)}` : ''}</li>`).join('')}</ul></section>` : ''}

      ${diskusiDetail(t)}

      ${log.length ? `<section><p class="subjudul">Aktivitas</p><ul class="riwayat">${log.map(l => `<li>${nama(l.by)}${tandaAi(l.ai)}: ${esc(l.detail)} <small>· ${esc(relatif(l.at))}</small></li>`).join('')}</ul></section>` : ''}
    </div>`;
  }

  /* ---------- Dashboard ---------- */

  /* Batang mendatar berlabel; label sudah berupa HTML yang aman. */
  function batangDaftar(baris, kosong = 'Tidak ada task aktif.', kelas = '') {
    const maks = Math.max(1, ...baris.map(x => x.jumlah));
    return `<div class="batang-platform ${kelas}">${baris.map(x => `<div><span>${x.label}</span><span class="batang"><span style="width:${Math.round(x.jumlah / maks * 100)}%"></span></span><b>${x.jumlah}</b></div>`).join('') || `<p class="hint">${kosong}</p>`}</div>`;
  }

  function viewDashboard() {
    const h = hariIni();
    const ids = I.lingkupOrang(S.me, S.dash.lingkup);
    const r = I.laporan(S.data, h, ids);
    const maks = Math.max(1, ...r.mingguan.map(m => m.jumlah));
    const perId = perIdKini();
    const proyekAktif = S.data.projects.filter(p => !p.arsip);
    const keadaan = {};
    for (const p of proyekAktif) { const k = I.ringkasProyek(S.data, p, h, perId).keadaan; keadaan[k] = (keadaan[k] || 0) + 1; }
    const perTahap = I.TAHAP.map(x => ({ ...x, jumlah: proyekAktif.filter(p => p.stage === x.id).length }));
    const keterangan = ketLingkup(S.dash.lingkup);
    const ubin = (n, label, kelas = '', aksi = '') => `<div class="${kelas}">${aksi ? `<button type="button" ${aksi}>` : ''}<strong>${n}</strong><span>${label}</span>${aksi ? '</button>' : ''}</div>`;
    return `<div class="judul-halaman"><div><h1>Dashboard</h1><p>${keterangan} · ${esc(S.sumber || 'Data contoh')}</p></div>
        ${segmenLingkup('dash', S.dash.lingkup)}</div>
      <div class="ubin">
        ${ubin(r.kpi.aktif, 'Task aktif')}
        ${ubin(r.kpi.telat, 'Terlambat', r.kpi.telat ? 'merah' : '', r.kpi.telat ? 'data-aksi="fokus-papan" data-fokus="telat"' : '')}
        ${ubin(r.kpi.tertahan, 'Tertahan', r.kpi.tertahan ? 'merah' : '', r.kpi.tertahan ? 'data-aksi="fokus-papan" data-fokus="tertahan"' : '')}
        ${ubin(r.kpi.ditinjau, 'Menunggu tinjauan')}
        ${ubin(r.kpi.selesai30, 'Selesai 30 hari')}
      </div>
      <div class="grid-laporan">
        <section class="kartu-polos"><p class="subjudul">Task aktif per status</p>
          ${batangDaftar(r.perStatus.map(x => ({ label: pillStatus(x.status), jumlah: x.jumlah })))}
          <p class="hint" style="margin-top:12px">Proyek ${r.perJalur.proyek} · rutin & lepas ${r.perJalur.rutin}</p>
        </section>
        <section class="kartu-polos"><p class="subjudul">Selesai per minggu</p>
          <div class="grafik-minggu">${r.mingguan.map(m => `<div><b>${m.jumlah}</b><span class="tiang" style="height:${Math.round(m.jumlah / maks * 130)}px"></span><small>${esc(fmtTanggalPendek(m.awal))}</small></div>`).join('')}</div>
        </section>
        <section class="kartu-polos wadah-tahap"><p class="subjudul">Task aktif per tahap</p>
          <div class="tahap-hitung enam">${r.perTahap.map(x => `<div><span class="huruf-tahap ${x.id === 'R' ? 'rutin' : ''}">${x.id}</span><b>${x.jumlah}</b><small>${esc(x.nama)}</small></div>`).join('')}</div>
          <p class="hint" style="margin-top:10px">Tahap mengikuti kode sub-stage task. R = rutin dan pekerjaan lepas di luar proyek.</p>
        </section>
        <section class="kartu-polos"><p class="subjudul">Task aktif per tim pemilik</p>
          ${batangDaftar(r.perTim.map(x => ({ label: `${chipTim(x.kode)} ${esc(x.nama)}`, jumlah: x.jumlah })), 'Tidak ada task aktif.', 'lebar-label')}
          <p class="hint" style="margin-top:10px">Tim pemilik = tim pemegang sub-stage task; task tanpa kode ikut tim PIC-nya.</p>
        </section>
        <section class="kartu-polos"><p class="subjudul">Task aktif per platform</p>
          ${batangDaftar(r.perPlatform.map(x => ({ label: esc(x.platform), jumlah: x.jumlah })))}
        </section>
        <section class="kartu-polos lebar-penuh"><p class="subjudul">Proyek · ${proyekAktif.length} aktif · tahap ADDIE</p>
          <div class="tahap-hitung">${perTahap.map(x => `<div><span class="huruf-tahap">${x.id}</span><b>${x.jumlah}</b><small>${x.nama}</small></div>`).join('')}</div>
          <div class="detail-chip" style="margin-top:12px">${Object.keys(KEADAAN).filter(k => keadaan[k]).map(k => `${chipKeadaan(k)} <b>${keadaan[k]}</b>`).join(' ') || '<span class="hint">Belum ada proyek aktif.</span>'}</div>
          <button type="button" class="tombol kecil" style="margin-top:12px" data-aksi="ke" data-view="proyek">${ikon('lapis', 16)} Buka Proyek</button>
        </section>
        <section class="kartu-polos lebar-penuh"><p class="subjudul">Per orang ${tanya('manager-dashboard', 'skor bottleneck')}</p>
          <div class="tabel-gulir"><table class="tabel"><thead><tr><th>Nama</th><th>Peran</th><th>Beban</th><th class="angka">Aktif</th><th class="angka">Sub-task</th><th class="angka">Terlambat</th>
            <th class="angka" title="Task orang lain yang menunggu task-nya selesai">Menahan</th><th class="angka" title="Task yang menunggu tinjauannya">Tinjauan</th>
            <th class="angka">Bottleneck</th><th class="angka">Selesai 30 hari</th></tr></thead>
          <tbody>${r.perOrang.map(x => {
            const persen = Math.min(100, Math.round(x.aktif / I.KAPASITAS * 100));
            const penuh = x.aktif >= I.KAPASITAS;
            return `<tr><td>${avatar(x.id, 'kecil')} ${nama(x.id)}</td><td>${esc(I.PERAN[I.orang(x.id).peran])}</td>
              <td><span class="beban ${penuh ? 'penuh' : ''}"><span class="batang ${penuh ? 'merah' : ''}"><span style="width:${persen}%"></span></span></span></td>
              <td class="angka">${x.aktif}</td><td class="angka">${x.subTerbuka || '—'}</td><td class="angka">${x.telat}</td>
              <td class="angka">${x.menahan || '—'}</td><td class="angka">${x.tinjau || '—'}</td>
              <td class="angka"><span class="skor ${x.bottleneck >= 6 ? 'tinggi' : x.bottleneck >= 3 ? 'sedang' : ''}">${x.bottleneck}</span></td><td class="angka">${x.selesai30}</td></tr>`;
          }).join('')}</tbody></table></div>
          <p class="hint">Beban: task aktif terhadap kapasitas ${I.KAPASITAS} per orang. Skor bottleneck (PRD) = task orang lain yang menunggu dia × 2 + tinjauan yang menunggu dia × 2 + task telatnya.</p>
        </section>
      </div>`;
  }

  /* ---------- Laporan berkala ---------- */

  function idsLaporan() {
    if (I.orang(S.me).peran === 'manager') return S.lap.tim ? [S.lap.tim, ...I.timDari(S.lap.tim)] : null;
    return I.lingkupOrang(S.me, 'tim');
  }

  function viewLaporan() {
    const h = hariIni();
    const L = S.lap;
    const isM = I.orang(S.me).peran === 'manager';
    const ids = idsLaporan();
    const { dari, sampai } = I.rentang(L.periode, h);
    const r = I.laporanPeriode(S.data, ids, dari, sampai, h);
    const lingkup = !ids ? 'Divisi Produk' : `Tim ${I.orang(ids[0]).pendek}`;
    const persenTepat = r.total.selesai ? Math.round(r.total.tepat / r.total.selesai * 100) : 0;
    const lead = I.ORANG.filter(o => o.peran === 'lead');

    const kartu = r.baris.map(b => {
      const buka = L.buka === b.id;
      const angka = [['Aktif', b.aktif, ''], ['Selesai', b.selesai.length, 'hijau'], ['Tepat', b.tepat, ''], ['Baru', b.baru, ''], ['Terlambat', b.telat.length, b.telat.length ? 'merah' : ''], ['Tertahan', b.tertahan.length, b.tertahan.length ? 'merah' : '']];
      const daftar = (judul, isi, alasan) => (isi.length ? `<div class="grup"><h3 class="sub-kecil">${judul} (${isi.length})</h3>${isi.map(t => barisTask(t, alasan ? alasan(t) : '')).join('')}</div>` : '');
      return `<section class="kartu-orang ${buka ? 'buka' : ''}">
        <button type="button" class="kartu-orang-kepala" data-aksi="lap-buka" data-id="${esc(b.id)}" aria-expanded="${buka}">
          <span class="kartu-orang-nama">${avatar(b.id)}<span><strong>${nama(b.id)}</strong><small>${esc(I.orang(b.id).jabatan)}</small></span></span>
          <span class="kartu-orang-angka">${angka.map(([l, n, k]) => `<span class="${k}"><b>${n}</b><small>${l}</small></span>`).join('')}</span>
          ${ikon(buka ? 'bawah' : 'kanan', 18)}
        </button>
        ${buka ? `<div class="kartu-orang-isi">
          ${daftar('Selesai dalam periode', b.selesai, t => `Selesai ${fmtTanggal(I.isoHari(t.selesaiAt))}${t.due && I.isoHari(t.selesaiAt) > t.due ? ' · lewat tenggat' : ''}`)}
          ${daftar('Terlambat', b.telat)}
          ${daftar('Tertahan', b.tertahan, t => 'Tertahan: ' + (t.alasanTertahan || 'tanpa alasan'))}
          ${!b.selesai.length && !b.telat.length && !b.tertahan.length ? '<p class="hint">Tidak ada yang selesai, terlambat, atau tertahan dalam periode ini.</p>' : ''}
        </div>` : ''}
      </section>`;
    }).join('');

    return `<div class="judul-halaman"><div><h1>Laporan</h1><p>${esc(lingkup)} · ${esc(fmtRentang(dari, sampai))}</p></div>
        <button type="button" class="tombol" data-aksi="lap-salin">${ikon('salin', 16)} Salin ringkasan</button></div>
      <div class="alat">
        <div class="segmen" role="group" aria-label="Periode">${I.PERIODE.map(([v, l]) => `<button type="button" data-aksi="atur" data-ruang="lap" data-kunci="periode" data-nilai="${v}" aria-pressed="${L.periode === v}">${l}</button>`).join('')}</div>
        ${isM ? pilihan('lap', 'tim', L.tim, [['', 'Seluruh divisi'], ...lead.map(o => [o.id, 'Tim ' + o.pendek])], 'Lingkup') : ''}
      </div>
      <div class="ubin">
        <div><strong>${r.total.selesai}</strong><span>Selesai${r.total.selesai ? ` · ${persenTepat}% tepat waktu` : ''}</span></div>
        <div><strong>${r.total.baru}</strong><span>Task baru</span></div>
        <div class="${r.total.telat ? 'merah' : ''}"><strong>${r.total.telat}</strong><span>Terlambat (hari ini)</span></div>
        <div class="${r.total.tertahan ? 'merah' : ''}"><strong>${r.total.tertahan}</strong><span>Tertahan (hari ini)</span></div>
        <div><strong>${r.total.aktif}</strong><span>Aktif (hari ini)</span></div>
      </div>
      <p class="hint" style="margin-bottom:10px">Selesai, tepat waktu, dan task baru dihitung dalam periode. Aktif, terlambat, dan tertahan adalah keadaan hari ini. Klik nama untuk rinciannya.</p>
      <div class="daftar-orang">${kartu}</div>
      ${r.proyek.length ? `<section class="kartu-polos" style="margin-top:16px"><p class="subjudul">Perpindahan tahap proyek</p><ul class="riwayat">${r.proyek.map(x => `
        <li><strong>${esc(x.p.name)}</strong>: ${teksRiwayat(x)} <small>· ${esc(fmtWaktu(x.at))}</small></li>`).join('')}</ul></section>` : ''}`;
  }

  function salinLaporan() {
    const h = hariIni();
    const ids = idsLaporan();
    const { dari, sampai } = I.rentang(S.lap.periode, h);
    const r = I.laporanPeriode(S.data, ids, dari, sampai, h);
    const periode = (I.PERIODE.find(([v]) => v === S.lap.periode) || [, ''])[1];
    const baris = [
      `Laporan ${!ids ? 'Divisi Produk' : 'Tim ' + I.orang(ids[0]).pendek} — ${periode} (${fmtRentang(dari, sampai)})`,
      `Selesai ${r.total.selesai} (${r.total.tepat} tepat waktu) · Baru ${r.total.baru} · Terlambat ${r.total.telat} · Tertahan ${r.total.tertahan} · Aktif ${r.total.aktif}`,
      '',
      ...r.baris.map(b => `${I.orang(b.id).pendek}: selesai ${b.selesai.length}, terlambat ${b.telat.length}, tertahan ${b.tertahan.length}, aktif ${b.aktif}`),
    ];
    const telat = r.baris.flatMap(b => b.telat);
    if (telat.length) baris.push('', 'Terlambat:', ...telat.map(t => `- ${t.id} ${t.title} (${I.orang(t.pic).pendek}, tenggat ${fmtTanggalPendek(t.due)})`));
    salinKeKlip(baris.join('\n'), '', 'Ringkasan laporan disalin. Tempel di chat atau email.');
  }

  /* ---------- Task: satu halaman, lima tampilan ----------
     Kotak cari, lingkup, saringan, dan tab fokus berlaku sama di semua tampilan; ikon di
     kanan hanya mengganti cara melihatnya: Daftar, Kanban, Per orang, Timeline, Kalender
     (sampai 0.7.0 masing-masing halaman sendiri). */

  const FOKUS = [['', 'Semua'], ['telat', 'Terlambat'], ['tertahan', 'Tertahan'], ['tinjau', 'Tinjauan saya']];
  const WARNA_KOLOM = { Antre: '#8A93A0', Dikerjakan: '#0068B4', Ditinjau: '#B86E00', Selesai: '#067647' };
  const PER_HAL = 50;

  /* Saringan bersama semua tampilan. "Tinjauan saya" memuat task siapa pun yang menunggu
     tinjauan saya, jadi lingkup orang tak berlaku di sana. */
  function saringTask(fokus = S.task.fokus) {
    const f = S.task;
    return { orang: fokus === 'tinjau' ? null : I.lingkupOrang(S.me, f.lingkup), proyek: f.proyek, ...nilaiSaring(f), fokus, me: S.me, q: f.q };
  }
  const jumlahSaring = () => [S.task.proyek, ...Object.keys(SARING_KOSONG).map(k => S.task[k])].filter(Boolean).length;
  const daftarSaring = () => I.daftarTask(S.data, { ...saringTask(), status: S.task.status, urut: S.task.urut, arah: S.task.arah }, hariIni());

  function viewTask() {
    const f = S.task;
    const n = jumlahSaring();
    const proyekSemua = S.data.projects.slice().sort((a, b) => a.arsip - b.arsip || a.name.localeCompare(b.name, 'id'));
    const lingkup = ketLingkup(f.lingkup);
    return `<div class="judul-halaman"><div><h1>Task</h1><p>${lingkup} · ganti tampilan lewat ikon di atas daftar</p></div></div>
      <div class="alat alat-task">
        ${kotakCari('task', f.q, 'Cari judul, ID, orang, proyek, sub-stage…')}
        ${segmenLingkup('task', f.lingkup)}
        <button type="button" class="tombol kecil tombol-saring" data-aksi="task-saring" aria-expanded="${f.saringBuka}">${ikon('saring', 16)} Saringan${n ? ` <span class="lencana biru">${n}</span>` : ''}</button>
        ${n && !f.saringBuka ? '<button type="button" class="tombol kecil" data-aksi="task-bersih">Hapus saringan</button>' : ''}
      </div>
      ${f.saringBuka ? `<div class="alat panel-saring">
        ${pilihan('task', 'proyek', f.proyek, [SEMUA, ...proyekSemua.map(p => [p.id, p.name + (p.arsip ? ' (arsip)' : '')])], 'Proyek')}
        ${pilihanSaring('task', f)}
        ${n ? '<button type="button" class="tombol kecil" data-aksi="task-bersih">Hapus saringan</button>' : ''}
      </div>` : ''}
      <div id="hasil">${hasilTask()}</div>`;
  }

  /* Tab fokus berangka + ikon tampilan, lalu isi tampilannya. Digambar ulang saat orang
     mengetik di kotak cari, supaya angkanya ikut. */
  function hasilTask() {
    const f = S.task;
    const h = hariIni();
    const bisaTinjau = ['lead', 'manager'].includes(I.orang(S.me).peran);
    const tab = FOKUS.filter(([k]) => k !== 'tinjau' || bisaTinjau).map(([k, l]) => {
      const n = I.daftarTask(S.data, { ...saringTask(k), status: 'aktif' }, h).length;
      return `<button type="button" class="tab-fokus ${k && n ? 'perlu' : ''}" data-aksi="atur" data-ruang="task" data-kunci="fokus" data-nilai="${k}" aria-pressed="${f.fokus === k}">${l}<span class="jumlah">${n}</span></button>`;
    }).join('');
    const ikonTampilan = TAMPILAN.map(x => `<button type="button" data-aksi="atur" data-ruang="task" data-kunci="tampilan" data-nilai="${x.id}" aria-pressed="${f.tampilan === x.id}" title="${x.judul}">${ikon(x.ikon, 18)}<span class="sr">${x.judul}</span></button>`).join('');
    const BADAN = { daftar: badanDaftar, kanban: badanKanban, orang: badanOrang, timeline: badanTimeline, kalender: badanKalender };
    return `<div class="baris-tab">
        <div class="tab-fokus-daftar" role="group" aria-label="Fokus">${tab}</div>
        <div class="segmen segmen-ikon" role="group" aria-label="Tampilan">${ikonTampilan}</div>
      </div>
      ${(BADAN[f.tampilan] || badanDaftar)(h)}`;
  }

  function badanDaftar() {
    const f = S.task;
    const semua = daftarSaring();
    // Task anak tepat di bawah induknya, sebelum dibagi per halaman.
    const tersusun = susunHirarki(semua);
    const jumlahHal = Math.max(1, Math.ceil(tersusun.length / PER_HAL));
    f.hal = Math.min(Math.max(1, f.hal), jumlahHal);
    // Task anak yang induknya tertinggal di halaman sebelumnya tampil dengan tanda ↳, tak menjorok.
    const potongan = tersusun.slice((f.hal - 1) * PER_HAL, f.hal * PER_HAL);
    const diHalaman = new Set(potongan.map(x => x.t.id));
    const isi = potongan.map(x => (x.anak && !diHalaman.has(x.t.induk) ? { ...x, anak: false } : x));
    const kolom = [['id', 'ID'], ['title', 'Task'], ['pic', 'PIC'], ['status', 'Status'], ['due', 'Tenggat'], ['platform', 'Platform']];
    const kepala = kolom.map(([k, l]) => `<th aria-sort="${f.urut === k ? (f.arah === -1 ? 'descending' : 'ascending') : 'none'}"><button type="button" class="urut" data-aksi="daftar-urut" data-kunci="${k}">${l}<span aria-hidden="true">${f.urut === k ? (f.arah === -1 ? ' ↓' : ' ↑') : ''}</span></button></th>`).join('');
    const tabel = `<div class="tabel-gulir kartu-polos rapat"><table class="tabel tabel-task"><thead><tr>${kepala}</tr></thead><tbody>${isi.map(({ t, anak }) => `
      <tr class="${anak ? 'anak' : ''} ${S.pilih === t.id ? 'dipilih' : ''}">
        <td class="kecil">${esc(t.id)}</td>
        <td><button type="button" class="tautan-task" data-aksi="buka-task" data-id="${esc(t.id)}">${esc(t.title)}</button>
          <span class="baris-meta">${t.induk && !anak ? chipInduk(t) + ' ' : ''}${chipJalur(t)} ${esc(asal(t))}${ringkasAnak(t) ? ' · ' + ringkasAnak(t) : ''} ${chipLabel(t, ['Siap'])} ${chipPenting(t)}</span></td>
        <td class="nowrap">${avatar(t.pic, 'kecil')} ${nama(t.pic)}</td>
        <td>${pillStatus(t.status)}</td>
        <td>${chipTenggat(t)}</td>
        <td class="kecil">${esc(t.platform || '—')}</td>
      </tr>`).join('')}</tbody></table></div>`;
    const nav = jumlahHal > 1 ? `<div class="halaman-nav">
        <button type="button" class="tombol kecil" data-aksi="daftar-hal" data-n="-1" ${f.hal <= 1 ? 'disabled' : ''}>${ikon('kiri', 16)} Sebelumnya</button>
        <span class="hint">Halaman ${f.hal} dari ${jumlahHal}</span>
        <button type="button" class="tombol kecil" data-aksi="daftar-hal" data-n="1" ${f.hal >= jumlahHal ? 'disabled' : ''}>Berikutnya ${ikon('kanan', 16)}</button>
      </div>` : '';
    return `<div class="alat baris-info"><p class="hint">${semua.length} task${semua.length > PER_HAL ? ` · menampilkan ${(f.hal - 1) * PER_HAL + 1}–${(f.hal - 1) * PER_HAL + isi.length}` : ''} · klik judul kolom untuk mengurutkan</p>
        <span class="spasi"></span>
        ${pilihan('task', 'status', f.status, [['aktif', 'Aktif'], SEMUA, ...I.STATUS.map(s => [s, s])], 'Status')}
        <button type="button" class="tombol kecil" data-aksi="ekspor" ${semua.length ? '' : 'disabled'}>${ikon('unduh', 16)} Ekspor CSV</button></div>
      ${semua.length ? (hp() ? `<div class="grup">${isi.map(x => barisTask(x.t, '', x.anak ? 'anak' : '')).join('')}</div>` : tabel) : '<div class="kosong-isi">Tidak ada task yang cocok dengan saringan ini.</div>'}
      ${nav}`;
  }

  function badanKanban(h) {
    const perId = perIdKini();
    const kolom = I.kolomPapan(S.data, saringTask(), h);
    const aktif = kolom.filter(k => k.status !== 'Selesai').reduce((n, k) => n + k.isi.length, 0);
    return `<div class="alat baris-info"><p class="hint">${aktif} task aktif · seret kartu antar kolom untuk memindah status</p></div>
      <div class="papan-gulir"><div class="papan">${kolom.map(k => `
        <section class="kolom" data-kolom="${k.status}" aria-label="${k.status}">
          <h2><span class="titik" style="background:${WARNA_KOLOM[k.status]}"></span>${k.status === 'Selesai' ? 'Selesai · 7 hari' : k.status}<span class="jumlah">${k.isi.length}</span></h2>
          ${k.status === 'Ditinjau' ? '<p>Task proyek menunggu persetujuan peninjau</p>' : ''}
          ${k.isi.slice(0, 40).map(t => kartuTask(t, perId)).join('') || '<p>Kosong</p>'}
          ${k.isi.length > 40 ? `<button type="button" class="tombol kecil" data-aksi="daftar-status" data-status="${k.status}">Lihat ${k.isi.length - 40} lainnya di Daftar</button>` : ''}
        </section>`).join('')}</div></div>`;
  }

  function badanOrang(h) {
    const ids = I.lingkupOrang(S.me, S.task.lingkup);
    const perId = perIdKini();
    const daftarOrang = ids || [...new Set([...I.ORANG.map(x => x.id), ...S.data.tasks.filter(I.aktif).map(t => t.pic)])];
    const aktif = I.kolomPapan(S.data, saringTask(), h).filter(k => k.status !== 'Selesai').flatMap(k => k.isi);
    const baris = I.bebanOrang(S.data, daftarOrang).map(b => {
      const milik = aktif.filter(t => t.pic === b.id);
      if (!milik.length && !ids) return '';
      return `<section class="baris-orang">
        <div class="baris-orang-kiri"><div>${avatar(b.id, 'besar')}<span><strong>${nama(b.id)}</strong><small>${esc(I.orang(b.id).jabatan)}</small></span></div>
          <span class="beban ${b.penuh ? 'penuh' : ''}"><span class="batang ${b.penuh ? 'merah' : ''}"><span style="width:${b.persen}%"></span></span>${b.aktif}/${I.KAPASITAS}${b.penuh ? ' · penuh' : ''}</span></div>
        <div class="baris-orang-kartu">${milik.map(t => kartuTask(t, perId)).join('') || '<p class="hint">Tidak ada task aktif yang cocok.</p>'}</div>
      </section>`;
    }).join('');
    return `<div class="alat baris-info"><p class="hint">Beban tiap orang: task aktif terhadap kapasitas ${I.KAPASITAS}. Klik kartu untuk membuka detailnya.</p></div>
      <div class="per-orang">${baris || '<div class="kosong-isi">Tidak ada task aktif yang cocok.</div>'}</div>`;
  }

  const HARI_JENDELA = 35;
  const HURUF_HARI = ['M', 'S', 'S', 'R', 'K', 'J', 'S'];

  function badanTimeline(h) {
    const j = S.jadwal;
    const mulai = j.mulai || I.tambahHari(I.rentang('minggu', h).dari, -7);
    const hari = Array.from({ length: HARI_JENDELA }, (_, i) => I.tambahHari(mulai, i));
    const akhir = hari[HARI_JENDELA - 1];
    const isi = I.daftarTask(S.data, { ...saringTask(), status: '' }, h)
      .map(t => ({ t, ...I.rentangTask(t) }))
      .filter(x => x.mulai && x.mulai <= akhir && x.akhir >= mulai && (I.aktif(x.t) || I.isoHari(x.t.selesaiAt) >= mulai))
      .sort((a, b) => a.mulai.localeCompare(b.mulai) || a.akhir.localeCompare(b.akhir));
    const alat = `<div class="alat baris-info">
        <button type="button" class="tombol kecil" data-aksi="jadwal-geser" data-n="-7">${ikon('kiri', 16)} Minggu sebelumnya</button>
        <button type="button" class="tombol kecil" data-aksi="jadwal-geser" data-n="0">Minggu ini</button>
        <button type="button" class="tombol kecil" data-aksi="jadwal-geser" data-n="7">Minggu berikutnya ${ikon('kanan', 16)}</button>
        <span class="hint">${esc(fmtRentang(mulai, akhir))} · ${isi.length} task</span>
        <span class="spasi"></span>
        <div class="segmen" role="group" aria-label="Kelompokkan"><button type="button" data-aksi="atur" data-ruang="jadwal" data-kunci="kelompok" data-nilai="proyek" aria-pressed="${j.kelompok === 'proyek'}">Per proyek</button><button type="button" data-aksi="atur" data-ruang="jadwal" data-kunci="kelompok" data-nilai="orang" aria-pressed="${j.kelompok === 'orang'}">Per orang</button></div>
      </div>
      <p class="legenda baris-legenda">${I.STATUS.map(s => `<span><i class="tl-${s.toLowerCase()}"></i>${s}</span>`).join('')}<span><i class="tl-telat"></i>Terlambat</span><span>Batang = tanggal mulai sampai tenggat</span></p>`;
    if (!isi.length) return alat + '<div class="kosong-isi">Tidak ada task terjadwal dalam rentang ini.</div>';

    if (hp()) {
      const perTanggal = new Map();
      for (const x of isi) {
        const k = x.akhir < mulai ? mulai : x.akhir;
        if (!perTanggal.has(k)) perTanggal.set(k, []);
        perTanggal.get(k).push(x.t);
      }
      return alat + [...perTanggal.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([tgl, daftar]) => `<section class="grup">
        <h2 class="${tgl === h ? 'kini' : ''}">${esc(fmtTanggalPanjang(tgl))} <span class="jumlah">${daftar.length}</span></h2>
        ${daftar.map(t => barisTask(t)).join('')}</section>`).join('');
    }

    const LUAR = 'Di luar proyek';
    const kunciGrup = j.kelompok === 'orang' ? x => I.orang(x.t.pic).pendek : x => (x.t.project ? asal(x.t) : LUAR);
    const grup = new Map();
    for (const x of isi) {
      const k = kunciGrup(x);
      if (!grup.has(k)) grup.set(k, []);
      grup.get(k).push(x);
    }
    const urutGrup = [...grup.keys()].sort((a, b) => (a === LUAR) - (b === LUAR) || a.localeCompare(b, 'id'));
    const kolom = iso => Math.min(HARI_JENDELA - 1, Math.max(0, I.selisihHari(mulai, iso)));
    const kini = I.selisihHari(mulai, h);
    const gayaKini = kini >= 0 && kini < HARI_JENDELA ? `style="--kini:${kini}"` : '';
    const BATAS = 250;
    let tampil = 0;
    const baris = urutGrup.map(g => {
      const anggota = grup.get(g);
      const sisa = Math.max(0, BATAS - tampil);
      const dipakai = anggota.slice(0, sisa);
      tampil += dipakai.length;
      if (!dipakai.length) return '';
      return `<div class="tl-grup"><span>${esc(g)}</span><small>${anggota.length} task</small></div>${dipakai.map(x => {
        const t = x.t;
        const telat = I.telat(t, h);
        const a = kolom(x.mulai) + 1, b = kolom(x.akhir) + 2;
        return `<div class="tl-baris">
          <button type="button" class="tl-label" data-aksi="buka-task" data-id="${esc(t.id)}" title="${esc(t.title)}">${avatar(t.pic, 'kecil')}<span>${esc(t.title)}</span></button>
          <div class="tl-jalur ${gayaKini ? 'ada-kini' : ''}" ${gayaKini}>
            <button type="button" class="tl-batang tl-${t.status.toLowerCase()} ${telat ? 'telat' : ''} ${x.mulai < mulai ? 'potong-kiri' : ''} ${x.akhir > akhir ? 'potong-kanan' : ''}" style="grid-column:${a}/${b}"
              data-aksi="buka-task" data-id="${esc(t.id)}" title="${esc(t.title)} · ${esc(fmtTanggalPendek(x.mulai))} → ${esc(fmtTanggalPendek(x.akhir))} · ${esc(t.status)}"><span>${esc(t.title)}</span></button>
          </div>
        </div>`;
      }).join('')}`;
    }).join('');
    const minggu = [];
    for (let i = 0; i < HARI_JENDELA; i += 7) minggu.push(`<span style="grid-column:${i + 1}/span 7">${esc(fmtTanggalPendek(hari[i]))}</span>`);
    return alat + `<div class="tl kartu-polos rapat">
        <div class="tl-kepala"><div class="tl-label-kosong"></div>
          <div class="tl-skala"><div class="tl-minggu">${minggu.join('')}</div>
            <div class="tl-hari">${hari.map(d => { const x = keDate(d); return `<span class="${d === h ? 'kini' : ''} ${x.getDay() % 6 === 0 ? 'libur' : ''}">${HURUF_HARI[x.getDay()]}<b>${x.getDate()}</b></span>`; }).join('')}</div></div>
        </div>
        ${baris}
      </div>
      ${isi.length > BATAS ? `<p class="hint" style="margin-top:8px">Menampilkan ${BATAS} dari ${isi.length} task. Persempit lingkup atau saringannya untuk melihat sisanya.</p>` : ''}`;
  }

  const NAMA_HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  function badanKalender(h) {
    const k = S.kal;
    const bulan = k.bulan || h.slice(0, 7);
    const grid = I.gridBulan(bulan);
    const per = new Map();
    for (const t of I.daftarTask(S.data, { ...saringTask(), status: '' }, h)) {
      if (!t.due || t.due < grid[0] || t.due > grid[grid.length - 1]) continue;
      if (!per.has(t.due)) per.set(t.due, []);
      per.get(t.due).push(t);
    }
    for (const d of per.values()) d.sort((a, b) => I.selesai(a) - I.selesai(b) || I.STATUS.indexOf(a.status) - I.STATUS.indexOf(b.status));
    const pilih = k.hari && k.hari.slice(0, 7) === bulan ? k.hari : h.slice(0, 7) === bulan ? h : '';
    const dalamBulan = [...per.entries()].filter(([d]) => d.slice(0, 7) === bulan).reduce((n, [, x]) => n + x.length, 0);
    const sel = grid.map(d => {
      const isi = per.get(d) || [];
      const aktif = isi.filter(I.aktif).length;
      return `<div class="kal-sel ${d.slice(0, 7) !== bulan ? 'luar' : ''} ${d === h ? 'kini' : ''} ${d === pilih ? 'dipilih' : ''}">
        <button type="button" class="kal-tgl" data-aksi="kal-hari" data-hari="${d}" aria-label="${esc(fmtTanggalPanjang(d))}, ${isi.length} task">${keDate(d).getDate()}${isi.length ? `<span class="kal-jumlah ${aktif ? '' : 'beres'}">${isi.length}</span>` : ''}</button>
        <div class="kal-isi">${isi.slice(0, 3).map(t => `<button type="button" class="kal-task tl-${t.status.toLowerCase()} ${I.telat(t, h) ? 'telat' : ''}" data-aksi="buka-task" data-id="${esc(t.id)}" title="${esc(t.title)} · ${esc(I.orang(t.pic).pendek)}">${esc(t.title)}</button>`).join('')}
          ${isi.length > 3 ? `<button type="button" class="kal-lagi" data-aksi="kal-hari" data-hari="${d}">+${isi.length - 3} lagi</button>` : ''}</div>
      </div>`;
    }).join('');
    const hariPilih = pilih ? per.get(pilih) || [] : [];
    return `<div class="alat baris-info">
        <button type="button" class="ikon-tombol" data-aksi="kal-geser" data-n="-1" aria-label="Bulan sebelumnya">${ikon('kiri', 20)}</button>
        <strong class="kal-bulan">${esc(namaBulan(bulan))}</strong>
        <button type="button" class="ikon-tombol" data-aksi="kal-geser" data-n="1" aria-label="Bulan berikutnya">${ikon('kanan', 20)}</button>
        <button type="button" class="tombol kecil" data-aksi="kal-geser" data-n="0">Hari ini</button>
        <span class="hint">${dalamBulan} task bertenggat bulan ini</span>
      </div>
      <div class="kal kartu-polos rapat">
        <div class="kal-kepala">${NAMA_HARI.map(x => `<span>${x}</span>`).join('')}</div>
        <div class="kal-grid">${sel}</div>
      </div>
      ${pilih ? `<section class="grup" style="margin-top:18px"><h2>Tenggat ${esc(fmtTanggalPanjang(pilih))} <span class="jumlah">${hariPilih.length}</span></h2>
        ${hariPilih.map(t => barisTask(t)).join('') || '<p class="hint">Tidak ada task bertenggat di hari ini.</p>'}</section>` : '<p class="hint" style="margin-top:14px">Pilih tanggal untuk melihat daftarnya.</p>'}`;
  }

  function eksporCsv(daftar) {
    const sel = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const perId = perIdKini();
    const judul = ['ID', 'Judul', 'Jalur', 'Proyek', 'Kategori', 'Tahap', 'Sub-stage', 'Tim', 'Platform', 'PIC', 'Status', 'Keadaan', 'Tenggat', 'Selesai', 'Task induk'];
    const baris = daftar.map(t => {
      const s = I.subTahap(t.sub);
      return [t.id, t.title, I.jenisJalur(t), t.project ? asal(t) : '', t.kategori, s && s.tahap !== 'R' ? I.namaTahap(s.tahap) : t.stage ? I.namaTahap(t.stage) : '',
        s ? I.namaSub(s.kode) : '', I.timTask(t), t.platform, I.orang(t.pic).nama, t.status, I.labelKeadaan(t, perId),
        t.due, t.selesaiAt ? I.isoHari(t.selesaiAt) : '', t.induk || ''];
    });
    const csv = '﻿' + [judul, ...baris].map(b => b.map(sel).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `producttrack-v2-${hariIni()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(`${daftar.length} task diekspor.`);
  }

  /* ---------- Proyek (tahap ADDIE) ----------
     Proyek tak punya Lead tetap dan tahapnya tak diputuskan: tahap = tahap task terbuka
     paling awal di siklus aktif. Siklus ditutup task E12 · Final approval yang disetujui;
     sesudah itu Manager memutuskan: siklus berikutnya, arsip, atau tahan. */

  function viewProyek() {
    if (S.proyek && proyekDari(S.proyek)) return viewProyekDetail(proyekDari(S.proyek));
    const h = hariIni();
    const perId = perIdKini();
    const isM = I.orang(S.me).peran === 'manager';
    const semua = S.data.projects;
    const daftar = semua.filter(p => (S.proyekArsip ? p.arsip : !p.arsip));
    const ringkas = new Map(semua.map(p => [p.id, I.ringkasProyek(S.data, p, h, perId)]));
    const keputusan = semua.filter(p => ringkas.get(p.id).siapMaju);
    const sepi = semua.filter(p => !p.arsip && ringkas.get(p.id).keadaan === 'sepi');
    const tinjau = S.data.tasks.filter(t => t.status === 'Ditinjau' && I.peninjau(t) === S.me);
    const ditahan = semua.filter(p => !p.arsip && p.decision === 'Hold');
    const nArsip = semua.filter(p => p.arsip).length;

    const baris = daftar.map(p => {
      const r = ringkas.get(p.id);
      const paket = I.paketProyek(S.data, p);
      return `<button type="button" class="baris-proyek" data-aksi="buka-proyek" data-id="${esc(p.id)}">
        <span class="baris-proyek-nama"><strong>${esc(p.name)}</strong>
          <small>${esc(p.platform)}${(p.cycle || 1) > 1 ? ' · siklus ' + p.cycle : ''}${r.tenggat ? ' · tenggat ' + esc(fmtTanggal(r.tenggat)) : ''}${paket.length ? ' · paket ' + esc(paket.map(judulPaket).join(', ')) : ''}</small>
          <span class="baris-tim">${timHtml(p)}</span></span>
        ${jalurMini(p, r.tutup)}
        <span class="baris-proyek-maju">${r.total ? `${r.selesai}/${r.total} task ${esc(I.namaTahap(p.stage))}` : 'Belum ada task'}${r.buka ? ` · ${r.buka} terbuka` : ''}
          <span class="batang"><span style="width:${r.total ? Math.round(r.selesai / r.total * 100) : 0}%"></span></span></span>
        ${chipKeadaan(r.keadaan)}
      </button>`;
    }).join('');

    /* Sesudah E12 tak ada tahap ke-6. Pilihannya: tuntas (arsip), atau ulangi ADDIE dari
       Analysis untuk perbaikan atau versi berikutnya. Kalau semua task beres, arsip yang utama. */
    const kotakKeputusan = keputusan.map(p => {
      const r = ringkas.get(p.id);
      const c = p.cycle || 1;
      const tuntas = r.semua === r.semuaSelesai;
      return `<div class="kotak-keputusan"><small>${esc(p.name)}</small>
        <strong>Siklus ${c} selesai. Arsipkan, atau ulangi untuk perbaikan?</strong>
        <small>E12 · Final approval sudah disetujui${r.buka ? `; ${r.buka} task lain masih terbuka` : ''}. Siklus ${c + 1} hanya perlu kalau ada perbaikan dari hasil evaluasi atau versi berikutnya; mulainya lagi dari Analysis.</small>
        ${isM ? `<div class="dua">${tuntas
          ? `<button type="button" class="tombol utama" data-aksi="arsip-proyek" data-id="${esc(p.id)}" data-nilai="1">Selesai, arsipkan</button>
            <button type="button" class="tombol" data-aksi="mulai-siklus" data-id="${esc(p.id)}">Siklus ${c + 1}</button>`
          : `<button type="button" class="tombol utama" data-aksi="mulai-siklus" data-id="${esc(p.id)}">Siklus ${c + 1}</button>
            <button type="button" class="tombol" data-aksi="tahan-proyek" data-id="${esc(p.id)}">Tahan</button>`}</div>` : '<small>Menunggu keputusan Manager.</small>'}
      </div>`;
    }).join('');

    return `<div class="judul-halaman"><div><h1>Proyek</h1>
        <p>${semua.length - nArsip} aktif · ${nArsip} arsip${keputusan.length ? ` · ${keputusan.length} siklus menunggu keputusan` : ''}</p></div>
        <div class="segmen" role="group" aria-label="Tampilkan"><button type="button" data-aksi="proyek-arsip" data-nilai="0" aria-pressed="${!S.proyekArsip}">Aktif</button><button type="button" data-aksi="proyek-arsip" data-nilai="1" aria-pressed="${S.proyekArsip}">Arsip (${nArsip})</button></div>
        ${isM ? `<button type="button" class="tombol utama" data-aksi="proyek-baru">${ikon('tambah', 16)} Proyek baru</button>` : ''}
      </div>
      ${isM ? ajakanPanduan() : ''}
      <div class="dua-kolom">
        <div class="kolom-utama"><div class="daftar-proyek">${baris || `<div class="kosong-isi">${S.proyekArsip ? 'Belum ada proyek arsip.' : 'Belum ada proyek aktif.'}</div>`}</div>
          <p class="hint" style="margin-top:10px">Tahap proyek dihitung dari task terbuka paling awal. Kode tim = tim pemilik sub-stage task yang masih terbuka.</p></div>
        <div class="samping-tumpuk kolom-sisi">
          <section class="kartu-polos samping-tumpuk"><p class="subjudul">Keputusan siklus ${keputusan.length ? `<span class="lencana">${keputusan.length}</span>` : ''}${tanya('manager-siklus', 'keputusan siklus')}</p>
            ${kotakKeputusan || '<p class="hint">Belum ada siklus yang ditutup. Proyek muncul di sini setelah task E12 · Final approval-nya disetujui.</p>'}</section>
          ${tinjau.length ? `<section class="kartu-polos samping-tumpuk"><p class="subjudul">Menunggu tinjauan Anda <span class="lencana">${tinjau.length}</span></p>
            <div class="grup">${tinjau.map(t => barisTask(t, 'Dari ' + I.orang(t.pic).pendek)).join('')}</div></section>` : ''}
          ${sepi.length ? `<section class="kartu-polos samping-tumpuk"><p class="subjudul">Tak ada task terbuka</p>
            <p class="hint">Semua task-nya selesai, tetapi siklusnya belum ditutup E12.</p>
            ${sepi.map(p => `<button type="button" class="baris-proyek ringkas" data-aksi="buka-proyek" data-id="${esc(p.id)}"><span class="baris-proyek-nama"><strong>${esc(p.name)}</strong><small>${esc(p.id)} · tahap ${esc(I.namaTahap(p.stage))}</small></span></button>`).join('')}</section>` : ''}
          ${ditahan.length ? `<section class="kartu-polos samping-tumpuk"><p class="subjudul">Ditahan</p>${ditahan.map(p => `<div class="kotak-keputusan"><strong>${esc(p.name)}</strong>
            ${isM ? `<div class="dua"><button type="button" class="tombol" data-aksi="lanjutkan-proyek" data-id="${esc(p.id)}">Lanjutkan proyek</button></div>` : ''}</div>`).join('')}</section>` : ''}
        </div>
      </div>`;
  }

  /* Rancangan paket yang dikerjakan proyek ini (tertaut langsung, atau lewat setoran
     task-nya). Progresnya naik bertahap setiap langkah bercapaian disetujui. Manager bisa
     menautkan proyek lama (mis. kolaborasi v1) ke paket. */
  function kartuPaketProyek(p, isM) {
    const daftar = I.paketProyek(S.data, p);
    if (!daftar.length && !isM) return '';
    const tautkan = isM ? `<label class="label-kecil tautkan">Paket utama proyek ini
      <select data-aksi="tautkan-paket" data-id="${esc(p.id)}">${opsiHtml([['', '— tidak ada —'], ...S.data.packages.map(x => [x.id, `${judulPaket(x)} (${x.id})`])], p.paket || '')}</select></label>` : '';
    const milik = new Set(S.data.tasks.filter(t => t.project === p.id).map(t => t.id));
    const isi = daftar.map(pk => {
      const r = ringkasP(pk);
      const nTask = new Set((S.data.setoran || []).filter(x => x.paket === pk.id && milik.has(x.task)).map(x => x.task)).size;
      return `<div class="paket-proyek"><strong>${esc(judulPaket(pk))}</strong><p class="hint">${esc(pk.id)} · ${esc(pk.platform || 'Tanpa platform')}${nTask ? ` · ${nTask} task proyek ini menyetor` : ''}</p>
        ${r.jumlah ? `<div class="kartu-paket-maju">${batangPaket(r)}<small>Progres ${r.persen}% · ${fmtAngka(r.terpenuhi)}/${fmtAngka(r.target)} tayang${r.digarap ? ` · ${fmtAngka(r.digarap)} digarap` : ''}</small></div>` : '<p class="hint">Paket ini belum punya target.</p>'}
        <button type="button" class="tombol kecil" data-aksi="paket-buka" data-id="${esc(pk.id)}">${ikon('kotak', 16)} Buka rancangan paket</button></div>`;
    }).join('');
    return `<section class="kartu-polos samping-tumpuk"><p class="subjudul">Rancangan paket</p>
      ${isi || '<p class="hint">Proyek ini belum mengerjakan rancangan paket mana pun.</p>'}
      ${daftar.length ? '<p class="hint">Naik bertahap setiap langkah bercapaian disetujui: konten siap, ter-input, lolos QC, tayang.</p>' : ''}
      ${tautkan}
    </section>`;
  }

  const urutSub = new Map(I.SUB_TAHAP.map((s, i) => [s.kode, i]));
  const posisiSub = k => (urutSub.has(k) ? urutSub.get(k) : 99);
  const urutTaskProyek = (a, b) => (I.selesai(a) - I.selesai(b)) || posisiSub(a.sub) - posisiSub(b.sub) || a.id.localeCompare(b.id, 'id', { numeric: true });

  function viewProyekDetail(p) {
    const h = hariIni();
    const isM = I.orang(S.me).peran === 'manager';
    const perId = perIdKini();
    const r = I.ringkasProyek(S.data, p, h, perId);
    const siklus = p.cycle || 1;
    const milik = S.data.tasks.filter(t => t.project === p.id);
    const kini = milik.filter(t => (t.cycle || 1) === siklus);
    const lama = milik.filter(t => (t.cycle || 1) !== siklus).sort(urutTaskProyek);
    const bolehTambah = I.bolehBuatTask(S.me) && !p.arsip;
    const adaKode = (tahap, sub) => (sub ? I.subBolehBagi(S.me, sub) : I.SUB_TAHAP.some(s => s.tahap === tahap && I.subBolehBagi(S.me, s.kode)));
    const tambah = (tahap, sub, label, kelas = 'kecil') => (bolehTambah && adaKode(tahap, sub)
      ? `<button type="button" class="tombol ${kelas}" data-aksi="tambah-task" data-proyek="${esc(p.id)}" data-tahap="${tahap}" ${sub ? `data-sub="${sub}"` : ''}>${ikon('tambah', 16)} ${esc(label)}</button>` : '');
    const arsipkan = isM && r.semua && r.semua === r.semuaSelesai
      ? `<button type="button" class="tombol" data-aksi="arsip-proyek" data-id="${esc(p.id)}" data-nilai="1">Arsipkan proyek</button>` : '';

    let gerbang;
    if (p.arsip) {
      gerbang = `<div class="banner biru">Proyek ini diarsipkan.</div>${isM ? `<div class="detail-aksi"><button type="button" class="tombol" data-aksi="arsip-proyek" data-id="${esc(p.id)}" data-nilai="0">Aktifkan lagi</button></div>` : ''}`;
    } else if (p.decision === 'Hold') {
      gerbang = `<div class="banner kuning">Proyek ditahan.</div>${isM ? `<div class="detail-aksi"><button type="button" class="tombol" data-aksi="lanjutkan-proyek" data-id="${esc(p.id)}">Lanjutkan proyek</button></div>` : ''}`;
    } else if (r.siapMaju) {
      // ADDIE berhenti di Evaluation. Siklus baru opsional; kalau semua beres, arsip pilihan utamanya.
      const tuntas = r.semua === r.semuaSelesai;
      const pilihan = (tombol, ket) => `<div class="pilihan-akhir">${tombol}<span>${ket}</span></div>`;
      gerbang = `<div class="banner hijau">Siklus ${siklus} selesai: semua langkah sampai E12 · Final approval sudah disetujui.${r.buka ? ` Masih ada ${r.buka} task lain yang terbuka.` : ''}</div>
        ${isM ? `<div class="daftar-pilihan"><p class="subjudul">Apa langkah berikutnya?</p>
          ${tuntas ? pilihan(`<button type="button" class="tombol utama" data-aksi="arsip-proyek" data-id="${esc(p.id)}" data-nilai="1">Selesai, arsipkan</button>`,
            'Proyek tuntas. Pindah ke Arsip; task dan riwayatnya tetap tersimpan, dan bisa diaktifkan lagi.') : ''}
          ${pilihan(`<button type="button" class="tombol ${tuntas ? '' : 'utama'}" data-aksi="mulai-siklus" data-id="${esc(p.id)}">Mulai siklus ${siklus + 1}</button>`,
            'Ulangi ADDIE dari Analysis: untuk memperbaiki temuan evaluasi atau membuat versi berikutnya (mis. paket tahun depan). Task siklus ini tetap tersimpan di "Siklus sebelumnya".')}
          ${pilihan(`<button type="button" class="tombol" data-aksi="tahan-proyek" data-id="${esc(p.id)}">Tahan</button>`,
            'Belum diputuskan sekarang. Proyek keluar dari antrean keputusan sampai dilanjutkan.')}
        </div>` : '<p class="hint">Menunggu keputusan Manager: arsipkan proyek ini, atau mulai siklus berikutnya untuk perbaikan.</p>'}`;
    } else if (r.keadaan === 'kosong') {
      gerbang = `<div class="banner kuning">Belum ada task di siklus ${siklus}. Mulai dari Analysis.</div>
        <div class="detail-aksi">${tambah('A', 'A1', 'Tambah task A1 · Intake', 'utama')}</div>`;
    } else if (r.keadaan === 'sepi') {
      gerbang = `<div class="banner kuning">Semua task siklus ini selesai, tetapi belum ada penutupan resmi. Tutup lewat task E12 · Final approval (direview Manager)${isM ? ', atau langsung arsipkan kalau proyek ini memang sudah tuntas' : ''}. Kalau masih ada pekerjaan, tambahkan task-nya.</div>
        <div class="detail-aksi">${tambah('E', 'E12', 'Tambah task E12 · Final approval', 'utama')}${arsipkan}</div>`;
    } else {
      gerbang = `<p class="hint">${r.selesai} dari ${r.total} task ${esc(I.namaTahap(p.stage))} selesai${r.telat ? ` · ${r.telat} terlambat` : ''}${r.tertahan ? ` · ${r.tertahan} tertahan` : ''}.
        Tahap pindah sendiri begitu task ${esc(I.namaTahap(p.stage))} selesai semua. Siklus ditutup lewat E12 · Final approval.</p>`;
    }

    const buka = S.tahapBuka && S.tahapBuka.proyek === p.id ? S.tahapBuka.tahap : '';
    const urutTahap = I.TAHAP.map(x => x.id);
    // Task yang hanya menunggu tahap sebelumnya: satu keterangan per bagian, bukan di tiap baris.
    const tungguTahapLalu = t => {
      if (!I.aktif(t) || t.tertahan || !I.tungguTahap(t)) return false;
      const dep = I.depsBelum(t, perId);
      return dep.length > 0 && dep.every(d => urutTahap.indexOf(d.stage) < urutTahap.indexOf(t.stage));
    };
    const bagian = urutTahap.map(st => {
      const isi = kini.filter(t => t.stage === st).sort(urutTaskProyek);
      if (!isi.length && st !== p.stage && st !== buka) return '';
      const aktif = isi.filter(I.aktif).length;
      const tunggu = isi.filter(tungguTahapLalu).flatMap(t => I.depsBelum(t, perId));
      const tahapTunggu = urutTahap.find(s => tunggu.some(d => d.stage === s));
      return `<details class="tahap-bagian" id="tahap-${st}" ${st === p.stage || st === buka ? 'open' : ''}>
        <summary><span class="huruf-tahap">${st}</span> ${esc(I.namaTahap(st))} <span class="pesan-info">· ${isi.length} task${aktif ? `, ${aktif} aktif` : isi.length ? ', selesai' : ''}</span>${st === p.stage && !r.tutup ? ' <span class="pill st-dikerjakan">Tahap sekarang</span>' : ''}</summary>
        <div class="grup">${tahapTunggu ? `<p class="hint tunggu-tahap">Menunggu tahap ${esc(I.namaTahap(tahapTunggu))} selesai. Task di tahap ini dikerjakan bersamaan setelahnya.</p>` : ''}
          ${susunHirarki(isi).map(x => barisTask(x.t, !I.aktif(x.t) || tungguTahapLalu(x.t) ? '' : I.alasanTunggu(x.t, perId), x.anak ? 'anak' : '')).join('') || `<p class="hint">Belum ada task di tahap ${esc(I.namaTahap(st))}${(p.cycle || 1) > 1 ? ' pada siklus ini' : ''}.</p>`}
          ${tambah(st, '', 'Tambah task di ' + I.namaTahap(st))}
        </div>
      </details>`;
    }).join('');
    const bagianLama = lama.length ? `<details class="tahap-bagian"><summary>Siklus sebelumnya <span class="pesan-info">· ${lama.length} task</span></summary>
      <div class="grup">${susunHirarki(lama).map(x => barisTask(x.t, '', x.anak ? 'anak' : '')).join('')}</div></details>` : '';
    const keputusan = isM && !p.arsip
      ? `<label class="label-kecil keputusan">Keputusan <select data-aksi="keputusan" data-id="${esc(p.id)}">${opsiHtml(I.KEPUTUSAN.map(k => [k, k]), p.decision || 'Build')}</select></label>`
      : `<span class="pill kd-kosong" title="Keputusan Manager untuk proyek ini">${esc(p.decision || 'Build')}</span>`;

    return `<div class="baris-kembali"><button type="button" class="kembali" data-aksi="tutup-proyek">${ikon('kiri', 18)} Semua proyek</button>
        <button type="button" class="tombol kecil" data-aksi="salin-tautan" data-alamat="#/proyek/${esc(p.id)}">${ikon('tautan', 16)} Salin tautan</button></div>
      <div class="dua-kolom" style="margin-top:8px">
        <div class="kolom-utama">
          <div class="kepala-proyek kartu-polos">
            <div><p class="detail-asal">${esc(p.platform)} · Siklus ${siklus} · ${esc(p.id)}</p>
              <h1 class="judul-besar">${esc(p.name)}</h1>
              <p class="baris-tim" style="margin-top:6px">Tim: ${timHtml(p)}</p>
              ${p.goal ? `<p class="teks-panjang" style="margin-top:8px">${teksBertaut(p.goal)}</p>` : ''}</div>
            ${jalurTahap(p, '', r.tutup, true)}
            ${gerbang}
            <div class="detail-aksi"><button type="button" class="tombol kecil" data-aksi="papan-proyek" data-id="${esc(p.id)}">${ikon('tugas', 16)} Lihat di Task</button>
              ${keputusan}
              ${isM && !p.arsip && !r.siapMaju && r.keadaan !== 'sepi' && r.semua && r.semua === r.semuaSelesai ? `<button type="button" class="tombol kecil" data-aksi="arsip-proyek" data-id="${esc(p.id)}" data-nilai="1">Arsipkan proyek</button>` : ''}</div>
          </div>
          ${bagian}
          ${bagianLama}
        </div>
        <div class="samping-tumpuk kolom-sisi">
          ${kartuPaketProyek(p, isM)}
          <section class="kartu-polos samping-tumpuk"><p class="subjudul">Ringkasan</p>
            <p class="hint">${r.semuaSelesai} dari ${r.semua} task selesai${(p.cycle || 1) > 1 ? ' (semua siklus)' : ''}.</p>
            ${r.tenggat ? `<p class="hint">Tenggat task aktif terjauh: ${esc(fmtTanggal(r.tenggat))}.</p>` : ''}
            <p class="hint">Tanpa Lead tetap: tiap task dipegang Lead tim pemilik sub-stage-nya, yang membaginya ke staff lewat task anak. Task setahap dikerjakan bersamaan; tahap berikutnya dimulai setelah tahap sebelumnya selesai.</p>
          </section>
          ${(p.history || []).length ? `<section class="kartu-polos samping-tumpuk"><p class="subjudul">Riwayat tahap</p><ul class="riwayat">${p.history.slice(0, 20).map(x => `
            <li>${teksRiwayat(x)} <small>· ${esc(relatif(x.at))}</small></li>`).join('')}</ul></section>` : ''}
        </div>
      </div>`;
  }

  /* ---------- Rancangan Paket ---------- */

  const LABEL_TARGET = {
    penuh: () => 'terpenuhi', lebih: h => 'lebih ' + fmtAngka(h.lebih), digarap: h => 'digarap ' + fmtAngka(h.digarap),
    sebagian: h => 'kurang ' + fmtAngka(h.sisa), belum: () => 'belum digarap',
  };
  const pilTarget = h => `<span class="pill tg-${h.status}">${esc(LABEL_TARGET[h.status](h))}</span>`;
  const judulPaket = p => p.namaPaket || p.program || p.id;
  const paketDari = id => S.data.packages.find(p => p.id === id);
  const kontribPaket = p => I.setoranPaket(S.data, p);
  const ringkasP = p => I.ringkasPaket(p, kontribPaket(p));
  /* Batang tiga lapis: biru tua = tayang, biru muda = bagian yang sudah dihitung dari batch
     yang baru sebagian jalan (capaian berbobot), arsir = sisa batch yang sedang digarap. */
  function batangPaket(r) {
    const sebagian = Math.max(0, r.persen - r.persenTayang);
    return `<span class="batang ganda" role="img" aria-label="Progres ${r.persen}%: ${r.persenTayang}% tayang, ${sebagian}% dari langkah yang sudah lolos, ${r.persenDigarap}% lagi sedang digarap"><span style="width:${r.persenTayang}%"></span><span class="sebagian" style="width:${sebagian}%"></span><span class="garap" style="width:${r.persenDigarap}%"></span></span>`;
  }
  const legendaPaket = '<span class="legenda"><span><i class="lg-tayang"></i>Tayang</span><span><i class="lg-sebagian"></i>Sebagian jalan</span><span><i class="lg-garap"></i>Sedang digarap</span></span>';
  const bolehElaborasi = () => ['lead', 'manager'].includes(I.orang(S.me).peran);

  /* ---------- Saringan, slicer, dan urutan Rancangan Paket (2.18.0) ----------
     Platform boleh dipilih lebih dari satu: paket cocok bila salah satu platformnya terpilih.
     Slicer jadwal pendaftaran dari–sampai: paket yang masa pendaftarannya bersinggungan dengan
     rentang itu (Inti.daftarBeririsan); selama slicer dipakai, paket tanpa jadwal tak tampil.
     Urutan kartu diatur sendiri dengan diseret (atau tombol naik/turun di "Atur urutan"),
     tersimpan di browser ini per sumber data. */
  const slicerAktif = () => !!(S.pkt.dari || S.pkt.sampai);
  function paketTersaring() {
    const kata = S.pkt.q.trim().toLowerCase();
    const pilihP = S.pkt.platform;
    return urutkanPaket(S.data.packages).filter(p => (!pilihP.length || I.platformPaket(p).some(x => pilihP.includes(x)))
      && (!slicerAktif() || I.daftarBeririsan(p, S.pkt.dari, S.pkt.sampai))
      && (!kata || [p.id, p.namaPaket, p.program, p.platform].join(' ').toLowerCase().includes(kata)));
  }
  const kunciUrutPaket = () => `pkt_urut_${S.mode}`;
  function urutkanPaket(daftar) {
    const urut = ambil(kunciUrutPaket(), []);
    if (!Array.isArray(urut) || !urut.length) return daftar.slice();
    const pos = new Map(urut.map((id, i) => [id, i]));
    // Paket yang belum ada di urutan tersimpan (mis. baru dibuat) tampil paling atas.
    return daftar.map((p, i) => [p, pos.has(p.id) ? pos.get(p.id) : -1, i]).sort((a, b) => a[1] - b[1] || a[2] - b[2]).map(x => x[0]);
  }
  /* Pindahkan paket id ke depan (atau ke belakang, sesudah = true) paket keId. */
  function pindahUrutanPaket(id, keId, sesudah) {
    if (!id || !keId || id === keId) return;
    const semua = urutkanPaket(S.data.packages).map(p => p.id).filter(x => x !== id);
    const i = semua.indexOf(keId);
    if (i < 0) return;
    semua.splice(sesudah ? i + 1 : i, 0, id);
    simpan(kunciUrutPaket(), semua);
    segarkanHasilPaket();
  }
  /* Naik/turun satu tempat di antara kartu yang sedang tampil. */
  function geserPaket(id, arah) {
    const tampil = paketTersaring().map(p => p.id);
    const i = tampil.indexOf(id);
    if (i < 0 || !tampil[i + arah]) return;
    pindahUrutanPaket(id, tampil[i + arah], arah > 0);
  }
  function segarkanHasilPaket() {
    const wadah = $('#hasil');
    if (wadah && S.view === 'paket' && !S.pkt.pilih) wadah.innerHTML = hasilPaket();
  }

  const keIso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const selisihHari = (a, b) => Math.round((keDate(b) - keDate(a)) / 864e5);
  /* Tanggal pendek; tahunnya ditulis bila perlu, mis. "1 Okt – 20 Okt 2026". */
  function rentangTgl(a, b) {
    const f = (iso, tahun) => keDate(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', ...(tahun ? { year: 'numeric' } : {}) });
    return a === b ? f(a, true) : `${f(a, a.slice(0, 4) !== b.slice(0, 4))} – ${f(b, true)}`;
  }
  /* Jadwal pendaftaran sebuah paket, dengan keadaannya hari ini. */
  function jadwalPaketHtml(p) {
    const j = I.jadwalDaftar(p);
    if (!j) return '';
    const h = hariIni();
    const [kelas, ket] = h < j.buka ? ['akan', `dibuka ${selisihHari(h, j.buka)} hari lagi`]
      : h <= j.tutup ? ['buka', j.tutup === h ? 'ditutup hari ini' : `dibuka · tutup ${selisihHari(h, j.tutup)} hari lagi`]
        : ['tutup', 'sudah ditutup'];
    return `<span class="jadwal-daftar ${kelas}">${ikon('kalender', 14)} Pendaftaran ${esc(rentangTgl(j.buka, j.tutup))} <b>${esc(ket)}</b></span>`;
  }

  /* Slicer: rentangnya dari awal bulan jadwal paling awal sampai akhir bulan jadwal paling akhir.
     Pegangan di ujung berarti tanpa batas di sisi itu; keduanya di ujung = slicer tak dipakai. */
  function rentangSlicer() {
    const j = S.data.packages.map(I.jadwalDaftar).filter(Boolean);
    if (!j.length) return null;
    const awal = keDate(j.reduce((m, x) => (x.buka < m ? x.buka : m), j[0].buka));
    const akhir = keDate(j.reduce((m, x) => (x.tutup > m ? x.tutup : m), j[0].tutup));
    const dari = keIso(new Date(awal.getFullYear(), awal.getMonth(), 1));
    const sampai = keIso(new Date(akhir.getFullYear(), akhir.getMonth() + 1, 0));
    return { dari, sampai, hari: selisihHari(dari, sampai) };
  }
  const posSlicer = (r, iso) => Math.max(0, Math.min(r.hari, selisihHari(r.dari, iso)));
  function ketSlicer() {
    if (!slicerAktif()) return 'Geser pegangan untuk menyaring paket menurut masa pendaftarannya.';
    const tanpa = S.data.packages.filter(p => !I.jadwalDaftar(p)).length;
    const rentang = S.pkt.dari && S.pkt.sampai ? rentangTgl(S.pkt.dari, S.pkt.sampai)
      : S.pkt.dari ? `mulai ${rentangTgl(S.pkt.dari, S.pkt.dari)}` : `sampai ${rentangTgl(S.pkt.sampai, S.pkt.sampai)}`;
    return `Masa pendaftaran bersinggungan dengan ${rentang}${tanpa ? ` · ${tanpa} paket tanpa jadwal tidak ditampilkan` : ''}.`;
  }
  function slicerDaftar() {
    const r = rentangSlicer();
    const label = `<span class="label-kecil">${ikon('kalender', 15)} Jadwal pendaftaran</span>`;
    if (!r) return `<div class="slicer kosong">${label}<small class="hint">Belum ada paket yang berjadwal pendaftaran. Isi lewat Ubah rancangan.</small></div>`;
    const a = S.pkt.dari ? posSlicer(r, S.pkt.dari) : 0;
    const b = S.pkt.sampai ? posSlicer(r, S.pkt.sampai) : r.hari;
    // Posisi sebagai pecahan 0–1; CSS menghitung letaknya di antara titik tengah pegangan di kedua ujung.
    const pecahan = n => (r.hari ? n / r.hari : 0).toFixed(4);
    const bulan = [];
    for (let d = keDate(r.dari); keIso(d) <= r.sampai; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) bulan.push(keIso(d));
    const langkah = Math.ceil(bulan.length / 12);
    const tanda = bulan.map((iso, i) => (i % langkah ? '' : `<span style="--x:${pecahan(posSlicer(r, iso))}">${esc(keDate(iso).toLocaleDateString('id-ID', { month: 'short', ...(i === 0 || iso.endsWith('-01-01') ? { year: '2-digit' } : {}) }))}</span>`)).join('');
    return `<div class="slicer" data-slicer-dari="${r.dari}" data-slicer-hari="${r.hari}">
        <div class="slicer-kepala">${label}
          <input type="date" class="input" data-slicer="dari" value="${esc(S.pkt.dari)}" aria-label="Pendaftaran dari tanggal">
          <span aria-hidden="true">–</span>
          <input type="date" class="input" data-slicer="sampai" value="${esc(S.pkt.sampai)}" aria-label="Pendaftaran sampai tanggal">
          <button type="button" class="tautan-kecil" data-aksi="pkt-slicer-hapus" ${slicerAktif() ? '' : 'hidden'}>Semua jadwal</button>
        </div>
        <div class="slicer-rel" style="--a:${pecahan(a)};--b:${pecahan(b)}">
          <span class="slicer-isi"></span>
          <input type="range" min="0" max="${r.hari}" step="1" value="${a}" data-slicer-geser="dari" aria-label="Awal rentang pendaftaran">
          <input type="range" min="0" max="${r.hari}" step="1" value="${b}" data-slicer-geser="sampai" aria-label="Akhir rentang pendaftaran">
        </div>
        <div class="slicer-bulan" aria-hidden="true">${tanda}</div>
        <small class="hint slicer-ket">${esc(ketSlicer())}</small>
      </div>`;
  }
  /* Pegangan slicer digeser: tanggal, isian, dan kartu ikut diperbarui tanpa menggambar ulang halaman. */
  function geserSlicer(el) {
    const w = el.closest('.slicer');
    const dari = w.dataset.slicerDari;
    const n = Number(w.dataset.slicerHari);
    const [ga, gb] = $$('[data-slicer-geser]', w);
    let a = Number(ga.value);
    let b = Number(gb.value);
    if (a > b) { if (el === ga) a = b; else b = a; ga.value = a; gb.value = b; }
    S.pkt.dari = a > 0 ? I.tambahHari(dari, a) : '';
    S.pkt.sampai = b < n ? I.tambahHari(dari, b) : '';
    $('[data-slicer="dari"]', w).value = S.pkt.dari;
    $('[data-slicer="sampai"]', w).value = S.pkt.sampai;
    const rel = $('.slicer-rel', w);
    rel.style.setProperty('--a', String(n ? a / n : 0));
    rel.style.setProperty('--b', String(n ? b / n : 0));
    $('[data-aksi="pkt-slicer-hapus"]', w).hidden = !slicerAktif();
    $('.slicer-ket', w).textContent = ketSlicer();
    segarkanHasilPaket();
  }

  function viewPaket() {
    const p = S.pkt.pilih && S.data.packages.find(x => x.id === S.pkt.pilih);
    if (p) return S.pkt.sunting ? viewPaketSunting(p) : viewPaketDetail(p);
    const bolehBuat = ['lead', 'manager'].includes(I.orang(S.me).peran);
    const hitung = new Map();
    for (const x of S.data.packages) for (const pl of I.platformPaket(x)) hitung.set(pl, (hitung.get(pl) || 0) + 1);
    const platform = I.rapikanPlatform([...hitung.keys(), ...S.pkt.platform]).split(', ').filter(Boolean);
    const chip = (nilai, teks, aktif, n) => `<button type="button" class="chip-pilih" data-aksi="pkt-platform" data-nilai="${esc(nilai)}" aria-pressed="${aktif}">${esc(teks)}${n ? ` <small>${n}</small>` : ''}</button>`;
    const adaUrutan = (ambil(kunciUrutPaket(), []) || []).length > 0;
    return `<div class="judul-halaman"><div><h1>Rancangan Paket</h1><p>Isi produk tiap paket dan target per kategori · ${S.data.packages.length} paket</p></div>
        <button type="button" class="tombol" data-aksi="paket-salin" ${S.data.packages.length ? '' : 'disabled'}>${ikon('salin', 16)} Salin ke sheet Marsel</button>
        ${bolehBuat ? `<button type="button" class="tombol utama" data-aksi="paket-baru">${ikon('tambah', 16)} Paket baru</button>` : ''}
      </div>
      <div class="alat">
        ${kotakCari('paket', S.pkt.q, 'Cari nama paket atau platform…')}
        <span class="spasi"></span>
        <button type="button" class="tombol kecil" data-aksi="pkt-atur" aria-pressed="${S.pkt.atur}">${ikon(S.pkt.atur ? 'centang' : 'naik', 16)} ${S.pkt.atur ? 'Selesai mengatur' : 'Atur urutan'}</button>
        ${adaUrutan ? '<button type="button" class="tautan-kecil" data-aksi="pkt-urut-bawaan">Urutan bawaan</button>' : ''}
      </div>
      ${platform.length ? `<div class="chip-saring" role="group" aria-label="Saring platform"><span class="label-kecil">Platform</span>
        ${chip('', 'Semua', !S.pkt.platform.length, 0)}${platform.map(x => chip(x, x, S.pkt.platform.includes(x), hitung.get(x) || 0)).join('')}</div>` : ''}
      ${slicerDaftar()}
      ${S.pkt.atur ? `<p class="hint petunjuk-urut">${hp() ? 'Pakai tombol panah di tiap kartu.' : 'Seret kartu ke tempatnya, atau pakai tombol panah.'} Urutannya tersimpan di browser ini.</p>` : ''}
      <div id="hasil">${hasilPaket()}</div>`;
  }

  function hasilPaket() {
    const daftar = paketTersaring();
    if (!daftar.length) return `<div class="kosong-isi">${S.data.packages.length ? 'Tidak ada paket yang cocok.' : 'Belum ada rancangan paket.'}</div>`;
    const seret = !hp();
    return `<div class="grid-paket${S.pkt.atur ? ' mengatur' : ''}">${daftar.map((p, i) => {
      const r = ringkasP(p);
      const perKat = I.KATEGORI_SEMUA.map(([l]) => [l, p.items.filter(it => it.kategori === l).length]).filter(([, n]) => n);
      const nProyek = I.proyekPengisi(S.data, p.id).filter(x => !x.arsip).length;
      const plat = I.platformPaket(p);
      const boleh = I.bolehUbahPaket(p, S.me);
      const buka = S.pkt.atur ? '' : `data-aksi="paket-buka" role="link" tabindex="0"`;
      return `<div class="kartu-paket" ${buka} data-id="${esc(p.id)}" data-paket="${esc(p.id)}" draggable="${seret}">
        <span class="kartu-paket-atas">${(plat.length ? plat : ['—']).map(x => `<span class="chip-platform">${esc(x)}</span>`).join('')}${p.mirror ? '<span class="pill kd-aman">Dibagikan</span>' : ''}<small>${esc(p.id)}</small></span>
        <strong class="kartu-paket-judul" ${boleh ? `data-sunting-judul="${esc(p.id)}" title="Klik dua kali untuk mengganti nama"` : ''}>${esc(judulPaket(p))}</strong>
        ${jadwalPaketHtml(p)}
        <span class="kartu-paket-maju">${batangPaket(r)}<small>${r.target ? `Progres ${r.persen}% · ${fmtAngka(r.terpenuhi)}/${fmtAngka(r.target)} tayang${r.digarap ? ` · ${fmtAngka(r.digarap)} digarap` : ''}` : 'Belum ada target'}${nProyek ? ` · ${nProyek} proyek` : ''}</small></span>
        ${perKat.length ? `<span class="kartu-paket-kat">${perKat.map(([l, n]) => `<span>${esc(l)} <b>${n}</b></span>`).join('')}</span>` : ''}
        ${p.updatedAt ? `<span class="kartu-paket-bawah"><small>Diperbarui ${esc(relatif(p.updatedAt))}</small></span>` : ''}
        ${S.pkt.atur ? `<span class="kartu-paket-urut">
          <button type="button" class="ikon-tombol" data-aksi="pkt-naik" data-id="${esc(p.id)}" aria-label="Naikkan ${esc(judulPaket(p))}" ${i ? '' : 'disabled'}>${ikon('atas', 18)}</button>
          <button type="button" class="ikon-tombol" data-aksi="pkt-turun" data-id="${esc(p.id)}" aria-label="Turunkan ${esc(judulPaket(p))}" ${i < daftar.length - 1 ? '' : 'disabled'}>${ikon('bawah', 18)}</button></span>` : ''}
      </div>`;
    }).join('')}</div>`;
  }

  /* Nama paket diganti di tempat: klik dua kali judulnya, di kartu atau di halaman paket.
     Enter menyimpan, Esc membatalkan, pindah fokus juga menyimpan. */
  let tundaBukaPaket = null;
  function mulaiSuntingJudul(el) {
    const p = paketDari(el.dataset.suntingJudul);
    if (!p || el.querySelector('input')) return;
    const kartu = el.closest('.kartu-paket');
    if (kartu) kartu.draggable = false;
    el.innerHTML = `<input class="input sunting-judul" maxlength="200" value="${esc(p.namaPaket || judulPaket(p))}" aria-label="Nama paket" data-id="${esc(p.id)}">`;
    const isian = $('input', el);
    isian.focus();
    isian.select();
  }
  function selesaiSuntingJudul(isian, simpanKah) {
    if (isian.dataset.selesai) return;
    isian.dataset.selesai = '1';
    const p = paketDari(isian.dataset.id);
    const nama = isian.value.trim();
    if (!simpanKah || !p || !nama || nama === (p.namaPaket || '')) {
      if (simpanKah && !nama) toast('Nama paket wajib diisi.', true);
      const wadah = isian.parentElement;
      const kartu = wadah && wadah.closest('.kartu-paket');
      if (wadah) wadah.textContent = p ? judulPaket(p) : '';
      if (kartu) kartu.draggable = !hp();
      return;
    }
    try {
      ubahData('ubahNamaPaket', { paket: p.id, nama });
      selesaiUbah(`Nama paket diganti menjadi ${nama}.`);
    } catch (err) {
      toast(err.message, true);
      render();
    }
  }

  /* Satu chip per batch (rangkaian langkah satu elaborasi): jumlahnya dan capaian tertinggi
     yang sudah lolos. Klik membuka langkah bercapaian berikutnya yang belum lolos. */
  function chipBatch(kontrib) {
    const batch = I.batchSetoran(kontrib).map(b => {
      const tuju = b.berikut || b.setoran[b.setoran.length - 1];
      const t = tuju.t;
      const capai = b.capai ? I.namaCapaian(b.capai) : 'belum ada capaian';
      const lanjut = b.berikut ? ` · berikutnya ${I.namaCapaian(b.berikut.tahap)}: ${b.berikut.task} (${t.status}, ${I.orang(t.pic).pendek})` : '';
      const teks = b.capai === 'tayang' ? '✓ tayang' : b.capai ? I.namaCapaian(b.capai).toLowerCase() : 'diproses';
      return `<button type="button" class="chip-setoran ${b.capai === 'tayang' ? 'masuk' : b.capai ? 'sebagian' : ''}" data-aksi="buka-task" data-id="${esc(tuju.task)}"
        title="${esc(`+${fmtAngka(b.jumlah)} · ${capai}${lanjut}`)}">+${fmtAngka(b.jumlah)} · ${esc(teks)}</button>`;
    });
    const hilang = kontrib.filter(k => k.hilang).map(k => `<span class="chip-setoran hilang" title="Task penyetornya sudah tidak ada">${esc(k.task)} hilang</span>`);
    return [...batch, ...hilang].join('');
  }
  /* Corong capaian batch-batch sebuah target: konten → input → QC → tayang. */
  function corong(h) {
    const isi = I.CAPAIAN.filter(c => h.capaian[c.kode]).map(c => `<span title="${esc(c.nama)}">${esc(c.nama.split(' ')[0])} ${fmtAngka(h.capaian[c.kode])}</span>`);
    return isi.length ? `<small class="corong">${isi.join(' → ')}</small>` : '';
  }

  function tabelTarget(items, kontribPer) {
    let grupAkhir = null;
    const baris = items.map(it => {
      const k = kontribPer.get(it.id) || [];
      const h = I.hitungTarget(it, k);
      const g = String(it.grup || '').trim();
      const kepala = g && g !== grupAkhir ? `<tr class="baris-grup"><td colspan="7">${esc(g)}</td></tr>` : '';
      grupAkhir = g;
      return `${kepala}<tr><td>${esc(it.nama || '—')}${it.catatan ? `<small class="sel-catatan">${esc(it.catatan)}</small>` : ''}${k.length ? `<span class="sumber-setoran">${chipBatch(k)}</span>` : ''}</td>
        <td class="angka" title="Sudah ada ${fmtAngka(h.awal)} + tayang dari task ${fmtAngka(h.masuk)}">${fmtAngka(h.terpenuhi)}</td>
        <td class="angka">${h.target ? h.persen + '%' : '—'}${corong(h)}</td>
        <td class="angka">${h.digarap ? fmtAngka(h.digarap) : '—'}</td>
        <td class="angka">${fmtAngka(h.target)}</td><td>${esc(it.satuan)}</td><td>${pilTarget(h)}</td></tr>`;
    }).join('');
    return `<div class="tabel-gulir"><table class="tabel tabel-target"><thead><tr><th>Target</th><th class="angka">Tayang</th><th class="angka">Progres</th><th class="angka">Digarap</th><th class="angka">Target</th><th>Satuan</th><th>Status</th></tr></thead><tbody>${baris}</tbody></table></div>`;
  }

  function viewPaketDetail(p) {
    const kontribPer = kontribPaket(p);
    const r = I.ringkasPaket(p, kontribPer);
    const proyek = I.proyekPengisi(S.data, p.id);
    const boleh = I.bolehUbahPaket(p, S.me);
    const isM = I.orang(S.me).peran === 'manager';
    const blok = I.KATEGORI_SEMUA.map(([label, kunci]) => {
      const items = p.items.filter(i => i.kategori === label);
      const catatan = String(p[kunci] || '').trim();
      if (!items.length && !catatan) return '';
      const total = items.reduce((n, i) => n + (Number(i.target) || 0), 0);
      return `<section class="kartu-polos blok-kategori">
        <div class="blok-kepala"><h2>${esc(label)}</h2>${items.length ? `<span class="hint">${items.length} target · total ${fmtAngka(total)} ${esc(items[0].satuan)}</span>` : ''}</div>
        ${catatan ? `<p class="teks-panjang">${esc(catatan)}</p>` : ''}
        ${items.length ? tabelTarget(items, kontribPer) : ''}
      </section>`;
    }).join('');
    const tautan = p.links.filter(l => tautanAman(l.url));
    return `<div class="baris-kembali"><button type="button" class="kembali" data-aksi="paket-tutup">${ikon('kiri', 18)} Semua paket</button>
        <button type="button" class="tombol kecil" data-aksi="salin-tautan" data-alamat="#/paket/${esc(p.id)}">${ikon('tautan', 16)} Salin tautan</button></div>
      <div class="kepala-proyek kartu-polos" style="margin-top:8px">
        <div><p class="detail-asal">${esc(I.platformPaket(p).join(', ') || 'Tanpa platform')} · ${esc(p.id)}${p.mirror ? ' · <span class="pill kd-aman">Dibagikan ke Lintas Divisi</span>' : ''}</p>
          <h1 class="judul-besar" ${boleh ? `data-sunting-judul="${esc(p.id)}" title="Klik dua kali untuk mengganti nama"` : ''}>${esc(judulPaket(p))}</h1>
          ${I.jadwalDaftar(p) ? `<p class="detail-jadwal">${jadwalPaketHtml(p)}</p>` : ''}
          ${p.updatedAt ? `<p class="detail-orang" style="margin-top:8px">Diperbarui ${esc(relatif(p.updatedAt))}${p.updatedBy ? ' oleh ' + nama(p.updatedBy) : ''}</p>` : ''}</div>
        <div class="detail-aksi tanpa-regang">
          ${bolehElaborasi() ? `<button type="button" class="tombol utama" data-aksi="paket-elaborasi" ${r.terbuka ? '' : 'disabled'} title="${r.terbuka ? `${r.terbuka} target belum ditangani` : 'Semua target sudah terpenuhi atau sedang digarap'}">${ikon('lapis', 16)} Elaborasi jadi proyek</button>` : ''}
          ${boleh ? `<button type="button" class="tombol" data-aksi="paket-ubah">${ikon('sunting', 16)} Ubah rancangan</button>` : ''}
          <button type="button" class="tombol" data-aksi="paket-salin" data-id="${esc(p.id)}">${ikon('salin', 16)} Salin ke sheet Marsel</button>
          ${isM ? `<button type="button" class="tombol bahaya" data-aksi="paket-hapus">${ikon('hapus', 16)} Hapus</button>` : ''}
        </div>
      </div>
      <div class="dua-kolom" style="margin-top:16px">
        <div class="kolom-utama">
          ${blok || `<div class="kosong-isi">Belum ada isi produk maupun target.${boleh ? ' Klik "Ubah rancangan" untuk mengisinya.' : ''}</div>`}
          ${String(p.catatan || '').trim() ? `<section class="kartu-polos"><p class="subjudul">Catatan produk</p><p class="teks-panjang" style="margin-top:8px">${esc(p.catatan)}</p></section>` : ''}
        </div>
        <div class="samping-tumpuk kolom-sisi">
          <section class="kartu-polos samping-tumpuk"><p class="subjudul">Ringkasan target ${tanya('konsep-progres', 'progres paket')}</p>
            ${r.jumlah ? `<div class="kartu-paket-maju">${batangPaket(r)}<small>Progres ${r.persen}% · ${fmtAngka(r.terpenuhi)} dari ${fmtAngka(r.target)} tayang${r.digarap ? ` · ${fmtAngka(r.digarap)} digarap` : ''}</small></div>
              ${legendaPaket}
              <p class="hint">${r.penuh} terpenuhi · ${r.sedang} digarap · ${r.kurang - r.sedang} belum · ${r.lebih} lebih</p>
              <ul class="bobot-capaian">${I.CAPAIAN.map(c => `<li><b>${Math.round(c.bobot * 100)}%</b> ${esc(c.nama)}</li>`).join('')}</ul>
              <p class="hint">Progres berbobot (PRD): tiap batch dihitung dari langkah bercapaian tertinggi yang sudah disetujui. Bobotnya usulan PRD dan masih menunggu keputusan Manager. Klik chip di tabel untuk membuka langkah berikutnya.</p>` : '<p class="hint">Belum ada target.</p>'}
          </section>
          <section class="kartu-polos samping-tumpuk"><p class="subjudul">Proyek pengisi</p>
            ${proyek.map(x => { const rp = I.ringkasProyek(S.data, x, hariIni(), perIdKini()); return `<button type="button" class="baris-proyek ringkas" data-aksi="buka-proyek" data-id="${esc(x.id)}">
              <span class="baris-proyek-nama"><strong>${esc(x.name)}</strong><small>${esc(x.id)} · tahap ${esc(I.namaTahap(x.stage))}${rp.total ? ` · ${rp.selesai}/${rp.total} task` : ''}</small>
              <span class="baris-tim">${timHtml(x)}</span></span>${chipKeadaan(rp.keadaan)}</button>`; }).join('')
              || `<p class="hint">Belum ada proyek.${bolehElaborasi() && r.terbuka ? ' Tekan "Elaborasi jadi proyek" untuk membuatnya.' : ''}</p>`}
          </section>
          <section class="kartu-polos samping-tumpuk tautan-daftar"><p class="subjudul">Tautan</p>
            ${tautan.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${ikon('tautan', 16)} ${esc(l.label || namaSitus(l.url))}</a>`).join('') || '<p class="hint">Belum ada tautan.</p>'}
          </section>
        </div>
      </div>`;
  }

  const opsiHtml = (daftar, terpilih) => daftar.map(([v, l]) => `<option value="${esc(v)}" ${v === terpilih ? 'selected' : ''}>${esc(l)}</option>`).join('');

  function barisTargetForm(it = {}) {
    const satuan = [...new Set([...I.SATUAN_PAKET, ...(it.satuan ? [it.satuan] : [])])];
    const v = x => esc(x === undefined || x === null ? '' : x);
    return `<div class="target-form" data-item>
      <input type="hidden" name="i-id" value="${v(it.id)}">
      <input class="input" name="i-grup" placeholder="Grup (opsional)" maxlength="120" value="${v(it.grup)}" aria-label="Grup">
      <input class="input" name="i-nama" placeholder="Nama target" maxlength="200" value="${v(it.nama)}" aria-label="Nama target">
      <label class="isian-angka ia-awal"><span>Sudah ada</span><input class="input angka" name="i-awal" inputmode="decimal" placeholder="Ada" value="${it.awal ? v(it.awal) : ''}" aria-label="Sudah ada"></label>
      <label class="isian-angka ia-target"><span>Target</span><input class="input angka" name="i-target" inputmode="decimal" placeholder="Target" value="${it.target ? v(it.target) : ''}" aria-label="Target"></label>
      <select class="input" name="i-satuan" aria-label="Satuan">${opsiHtml(satuan.map(x => [x, x]), it.satuan || 'Paket')}</select>
      <input class="input" name="i-catatan" placeholder="Catatan" maxlength="500" value="${v(it.catatan)}" aria-label="Catatan target">
      <button type="button" class="ikon-tombol" data-aksi="paket-hapus-baris" aria-label="Hapus target">${ikon('hapus', 18)}</button>
    </div>`;
  }
  const barisTautanForm = (l = {}) => `<div class="tautan-form" data-tautan>
      <input type="hidden" name="l-id" value="${esc(l.id || '')}">
      <input class="input" name="l-label" placeholder="Label, mis. Brief paket" maxlength="120" value="${esc(l.label || '')}" aria-label="Label tautan">
      <input class="input" name="l-url" placeholder="https://…" maxlength="2000" inputmode="url" value="${esc(l.url || '')}" aria-label="Alamat tautan">
      <button type="button" class="ikon-tombol" data-aksi="paket-hapus-baris" aria-label="Hapus tautan">${ikon('hapus', 18)}</button>
    </div>`;

  /* Kategori di form dan salinan paket (0.14.0): yang aktif di Master, ditambah yang nonaktif tapi
     masih berisi item atau catatan di paket itu, supaya isi lamanya tetap terbaca dan tersunting. */
  const kategoriUntuk = (...paket) => I.KATEGORI_SEMUA.filter(([label, kunci]) => I.KATEGORI_PAKET.some(([l]) => l === label)
    || paket.some(p => p.items.some(i => i.kategori === label) || String(p[kunci] || '').trim()));

  function viewPaketSunting(p) {
    const bolehBagi = ['lead', 'manager'].includes(I.orang(S.me).peran);
    const terpilih = I.platformPaket(p);
    const platform = [...new Set([...I.PLATFORM, ...terpilih])];
    const blok = kategoriUntuk(p).map(([label, kunci]) => `<section class="kartu-polos blok-kategori" data-kategori="${esc(label)}">
        <div class="blok-kepala"><h2>${esc(label)}</h2></div>
        <label class="isian">Catatan ${esc(label)} <small>Teks bebas untuk kategori ini, mis. bonus angkatan lama.</small><textarea name="${kunci}" maxlength="4000">${esc(p[kunci] || '')}</textarea></label>
        <div class="target-daftar">
          <div class="target-form kepala-target" aria-hidden="true"><span>Grup</span><span>Nama target</span><span>Ada</span><span>Target</span><span>Satuan</span><span>Catatan</span><span></span></div>
          ${p.items.filter(i => i.kategori === label).map(barisTargetForm).join('')}
        </div>
        <button type="button" class="tombol kecil" data-aksi="paket-tambah-item">${ikon('tambah', 16)} Tambah target ${esc(label)}</button>
      </section>`).join('');
    return `<form class="form-paket" data-form="paket" data-id="${esc(p.id)}" novalidate>
      <div class="judul-halaman"><div><h1>Ubah rancangan paket</h1><p>${esc(judulPaket(p))} · ${esc(p.id)}</p></div>
        <button type="button" class="tombol" data-aksi="paket-batal">Batal</button><button class="tombol utama">Simpan</button></div>
      <section class="kartu-polos isian-grid">
        <label class="isian">Nama paket <input name="namaPaket" required maxlength="200" value="${esc(p.namaPaket || '')}"></label>
        ${bolehBagi ? `<label class="centang"><input type="checkbox" name="mirror" ${p.mirror ? 'checked' : ''}> Bagikan ke Lintas Divisi</label>` : '<span></span>'}
        ${pilihPlatformHtml(platform, terpilih)}
        <label class="isian">Pendaftaran dibuka <input type="date" name="daftarBuka" value="${esc(p.daftarBuka || '')}"></label>
        <label class="isian">Pendaftaran ditutup <input type="date" name="daftarTutup" value="${esc(p.daftarTutup || '')}"><small>Boleh salah satu saja; kosongkan keduanya kalau belum ada jadwal.</small></label>
      </section>
      ${blok}
      <section class="kartu-polos blok-kategori"><label class="isian">Catatan produk <textarea name="catatan" maxlength="4000">${esc(p.catatan || '')}</textarea></label></section>
      <section class="kartu-polos blok-kategori"><div class="blok-kepala"><h2>Tautan</h2></div>
        <div class="tautan-daftar-form">${p.links.map(barisTautanForm).join('')}</div>
        <button type="button" class="tombol kecil" data-aksi="paket-tambah-link">${ikon('tambah', 16)} Tambah tautan</button>
      </section>
      <p id="galat-paket" class="pesan-galat" role="alert" hidden></p>
      <div class="modal-kaki"><button type="button" class="tombol" data-aksi="paket-batal">Batal</button><button class="tombol utama">Simpan rancangan</button></div>
    </form>`;
  }

  /* Platform paket: centang lebih dari satu (2.18.0). */
  const pilihPlatformHtml = (daftar, terpilih) => `<fieldset class="pilih-platform"><legend>Platform <small>Boleh lebih dari satu.</small></legend>
      <div>${daftar.map(x => `<label class="chip-cek"><input type="checkbox" name="platform" value="${esc(x)}" ${terpilih.includes(x) ? 'checked' : ''}><span>${esc(x)}</span></label>`).join('')}</div>
    </fieldset>`;

  function bacaFormPaket(form) {
    const el = n => form.elements.namedItem(n);
    const f = {
      namaPaket: el('namaPaket').value, platform: $$('[name="platform"]:checked', form).map(x => x.value), catatan: el('catatan').value,
      daftarBuka: el('daftarBuka').value, daftarTutup: el('daftarTutup').value,
    };
    if (el('mirror')) f.mirror = el('mirror').checked;
    for (const [, kunci] of I.KATEGORI_SEMUA) if (el(kunci)) f[kunci] = el(kunci).value;
    const nilai = (baris, n) => $(`[name="${n}"]`, baris).value;
    f.items = $$('[data-kategori]', form).flatMap(blok => $$('[data-item]', blok).map(b => ({
      kategori: blok.dataset.kategori, id: nilai(b, 'i-id'), grup: nilai(b, 'i-grup'), nama: nilai(b, 'i-nama'),
      awal: nilai(b, 'i-awal'), target: nilai(b, 'i-target'), satuan: nilai(b, 'i-satuan'), catatan: nilai(b, 'i-catatan'),
    })));
    f.links = $$('[data-tautan]', form).map(b => ({ id: nilai(b, 'l-id'), label: nilai(b, 'l-label'), url: nilai(b, 'l-url') }));
    return f;
  }

  /* Disalin dalam susunan kolom sheet Master Marsel: APK, Dibimbing, Latsol, Materi,
     Tryout, Drilling, Live Class, Catatan Produk — sama dengan v1. */
  function selPaket(p, kategori, kontribPer = kontribPaket(p)) {
    const items = p.items.filter(x => x.kategori === kategori);
    const baris = [];
    let grupAkhir = null;
    for (const it of items) {
      const g = String(it.grup || '').trim();
      if (g !== grupAkhir) { if (baris.length) baris.push(''); if (g) baris.push(g); grupAkhir = g; }
      const h = I.hitungTarget(it, kontribPer.get(it.id) || []);
      const inti = ` • ${it.nama} – ${fmtAngka(h.terpenuhi)} ${it.satuan}`;
      baris.push(h.sisa ? `${inti} + ${fmtAngka(h.sisa)} ${it.satuan} COMING SOON` : inti);
    }
    if (items.length) baris.push(` Total: ${fmtAngka(items.reduce((n, x) => n + (Number(x.target) || 0), 0))} ${items[0].satuan || 'Paket'}`);
    const kunci = (I.KATEGORI_SEMUA.find(([l]) => l === kategori) || [])[1];
    const bonus = String((kunci && p[kunci]) || '').trim();
    if (bonus) baris.push('', bonus);
    return baris.join('\n').trim();
  }
  function salinPaket(daftar) {
    if (!daftar.length) return toast('Tak ada paket untuk disalin.', true);
    // Kolom kategori mengikuti Master; bawaannya persis kolom sheet Marsel.
    const kat = kategoriUntuk(...daftar);
    const KOLOM = ['APK', ...kat.map(([l]) => l), 'Catatan Produk'];
    const sel = p => { const k = kontribPaket(p); return [p.platform || '', ...kat.map(([l]) => selPaket(p, l, k)), String(p.catatan || '')]; };
    const tsv = v => (/["\t\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v);
    const teks = [KOLOM.join('\t'), ...daftar.map(p => sel(p).map(tsv).join('\t'))].join('\n');
    const html = `<table><tr>${KOLOM.map(k => `<th>${esc(k)}</th>`).join('')}</tr>${daftar.map(p => `<tr>${sel(p).map(v => `<td>${esc(v).split('\n').join('<br>')}</td>`).join('')}</tr>`).join('')}</table>`;
    salinKeKlip(teks, html, `${daftar.length} paket disalin. Tempel (Ctrl+V) di sheet Marsel.`);
  }

  /* ---------- Komunikasi (0.10.0) ----------
     Kotak masuk kerja: saringan & ruang di kiri, daftar utas di tengah, percakapan di kanan
     (di ponsel: daftar dulu, lalu percakapan). Pesan tersimpan BERSAMA di tab `obrolan`
     spreadsheet v2 lewat /api/rpc dan ditarik berkala; komentar lama data contoh ikut tampil di
     ruang task-nya. Aturannya — ruang, sebutan, pertanyaan, siapa boleh mengubah — di Inti. */

  const SARINGAN_KOM = [
    ['baru', 'Belum dibaca', 'kotakMasuk'],
    ['sebut', 'Menyebut saya', 'at'],
    ['tanya', 'Perlu jawaban', 'tanya'],
    ['semua', 'Semua utas', 'pesan'],
  ];
  const PESAN_CEPAT = ['Sudah saya cek ✅', 'Mohon dicek ya 🙏', 'Sedang saya kerjakan', 'Butuh bantuan untuk ini'];
  const CALON_PERAN = [['semua', 'Semua orang di divisi'], ['lead', 'Semua Lead'], ['staff', 'Semua staff'], ['manager', 'Manager']];

  /* ----- Pesan bersama: susunan, tarik, kirim ----- */

  let memoSusunan = { data: null, versi: -1, isi: null };
  function susunan() {
    if (memoSusunan.data !== S.data || memoSusunan.versi !== S.obr.versi) {
      memoSusunan = { data: S.data, versi: S.obr.versi, isi: I.susunObrolan(S.data, S.obr.peristiwa) };
    }
    return memoSusunan.isi;
  }

  /* penuh = semua dari awal (saat aplikasi dibuka); selain itu hanya yang sejak tarikan terakhir. */
  async function tarikObrolan(penuh = false) {
    if (S.obr.menarik || !S.data) return;
    S.obr.menarik = true;
    const awal = penuh || !S.obr.diperbarui;
    const h = await api('sinkron', [{ obrolanSejak: awal ? 0 : S.obr.sejak, realSejak: S.real.seq, generasi: S.real.generasi }]);
    S.obr.menarik = false;
    if (h.success && h.mode && h.mode !== S.mode) return gantiSumber(h.mode);
    if (h.success && S.mode === 'real' && h.real) terimaReal(h.real);
    if (h.success) Object.assign(h, h.obrolan || { peristiwa: [] });
    if (!h.success) {
      S.obr.galat = h.http === 401 ? 'Sesi berakhir; muat ulang halaman lalu masukkan PIN.' : (h.message || 'Pesan gagal dimuat.');
      S.obr.gagal = Math.min((S.obr.gagal || 0) + 1, 4);
      perbaruiStatusObrolan();
      return;
    }
    Object.assign(S.obr, { galat: '', gagal: 0, diperbarui: Date.now() });
    const baru = h.peristiwa || [];
    let berubah = false;
    if (awal) {
      S.obr.peristiwa = [...baru, ...S.obr.peristiwa.filter(e => e.tertunda || e.gagal)];
      berubah = true;
    } else {
      const ada = new Set(S.obr.peristiwa.map(e => e.id));
      for (const e of baru) if (!ada.has(e.id)) { S.obr.peristiwa.push(e); berubah = true; }
    }
    for (const e of baru) if (e.at > S.obr.sejak) S.obr.sejak = e.at;
    if (berubah) obrolanBerubah(); else perbaruiStatusObrolan();
  }

  /* Kuota baca Sheets dihitung per service account, jadi jedanya hemat: 20 detik di
     Komunikasi, semenit di halaman lain, berhenti saat tab tak terlihat, melambat saat gagal. */
  let jamTarik = null;
  function jadwalkanTarik() {
    clearTimeout(jamTarik);
    // Data real ikut ditarik di sini, jadi di halaman lain lebih sering (30 detik).
    const dasar = S.view === 'komunikasi' ? 20000 : S.mode === 'real' ? 30000 : 60000;
    jamTarik = setTimeout(async () => {
      if (!document.hidden && S.data && !$('#app').hidden) await tarikObrolan();
      jadwalkanTarik();
    }, Math.min(dasar * 2 ** (S.obr.gagal || 0), 300000));
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !S.data || $('#app').hidden) return;
    if (Date.now() - (S.obr.diperbarui || 0) > 10000) tarikObrolan().then(jadwalkanTarik);
  });

  /* Tampil seketika (tertunda), lalu diganti baris dari server. Pesan yang gagal tetap tampil
     dengan pilihan kirim ulang; reaksi, ubah, hapus, dan beres yang gagal dibatalkan. */
  let urutSementara = 0;
  async function kirimPeristiwa(e) {
    // Lihat sebagai (mode Dev): tak ada pesan, reaksi, atau tanda yang dikirim atas nama orang itu.
    if (S.pratinjau) return toast('Mode Lihat sebagai: tampilan saja, pesan tidak dikirim.', true);
    const sementara = { ...e, id: `tmp${++urutSementara}x${Date.now().toString(36)}`, at: Date.now(), tertunda: true, asli: e };
    S.obr.peristiwa.push(sementara);
    obrolanBerubah();
    const h = await api('kirimObrolan', [e]);
    const i = S.obr.peristiwa.indexOf(sementara);
    if (h.success && h.peristiwa) {
      if (i >= 0) S.obr.peristiwa.splice(i, 1);
      if (!S.obr.peristiwa.some(x => x.id === h.peristiwa.id)) S.obr.peristiwa.push(h.peristiwa);
    } else if (e.jenis === 'pesan') {
      Object.assign(sementara, { tertunda: false, gagal: true });
      toast(`Pesan belum terkirim: ${h.message || 'server tak terjangkau'}. Kirim ulang dari gelembungnya.`, true);
    } else {
      if (i >= 0) S.obr.peristiwa.splice(i, 1);
      toast(h.message || 'Gagal tersimpan. Coba lagi.', true);
    }
    obrolanBerubah();
  }

  function obrolanBerubah() {
    S.obr.versi++;
    perbaruiObrolan();
  }
  function perbaruiStatusObrolan() {
    const el = $('#kom-status');
    if (el) el.innerHTML = statusObrolan();
  }
  /* Digambar ulang sebagian saja: kotak tulis (dengan ketikan dan kursornya) tak disentuh. */
  function perbaruiObrolan() {
    if (!S.data || $('#app').hidden) return;
    tandaiRuangTerbuka();
    const lencana = lencanaNav();
    renderSamping(lencana);
    renderNavBawah(lencana);
    renderKepala();
    if (S.view === 'komunikasi') {
      const kiri = $('#km-saring');
      if (kiri) kiri.innerHTML = saringKomHtml();
      const chip = $('#km-saring-hp');
      if (chip) chip.innerHTML = saringHpHtml();
      const daftar = $('#hasil');
      if (daftar) daftar.innerHTML = hasilKomunikasi();
    }
    perbaruiPesan('kom');
    perbaruiPesan('detail');
    perbaruiStatusObrolan();
  }
  function perbaruiPesan(wadah) {
    const kotak = $('#pesan-' + wadah);
    if (!kotak) return;
    const keBawah = S.kom.keBawah || kotak.scrollHeight - kotak.scrollTop - kotak.clientHeight < 80;
    const atas = kotak.scrollTop;
    kotak.innerHTML = daftarPesanHtml(kotak.dataset.ruang, wadah);
    kotak.scrollTop = keBawah ? kotak.scrollHeight : atas;
    S.kom.keBawah = false;
    const judul = wadah === 'detail' && $('.diskusi-detail .subjudul');
    if (judul) {
      const n = (susunan().perRuang.get(kotak.dataset.ruang) || []).filter(m => !m.dihapus).length;
      judul.textContent = 'Diskusi' + (n ? ' · ' + n : '');
    }
    perbaruiTulis();
  }
  /* Ruang yang sedang terbuka dan terlihat dianggap terbaca. */
  function tandaiRuangTerbuka() {
    if (document.hidden || !S.data) return;
    if (S.view === 'komunikasi' && S.kom.pilih) tandaiDibaca(S.kom.pilih);
    if (S.pilih) tandaiDibaca(I.ruangTask(S.pilih));
  }

  /* ----- Ruang ----- */

  function judulRuang(ruang) {
    const { jenis, id } = I.bacaRuang(ruang);
    if (jenis === 'task') {
      const t = perIdKini().get(id);
      if (t) return t.title;
      const m = (susunan().perRuang.get(ruang) || []).find(x => x.judul);
      return m ? m.judul : id;
    }
    if (jenis === 'proyek') { const p = proyekDari(id); return p ? p.name : id; }
    return 'Tim ' + ((I.TIM[id] || {}).nama || id);
  }
  /* Alamat ruang: #/komunikasi/PRD-12, #/komunikasi/PRJ-3, #/komunikasi/tim-LA. */
  function alamatRuang(ruang) {
    const { jenis, id } = I.bacaRuang(ruang);
    return jenis === 'tim' ? 'tim-' + id : id;
  }
  function ruangDariAlamat(x) {
    if (/^PRD-\d+$/.test(x)) return I.ruangTask(x);
    if (/^PRJ-\d+$/.test(x)) return I.ruangProyek(x);
    const m = /^tim-([A-Z]{2})$/.exec(x);
    return m ? I.ruangTim(m[1]) : '';
  }
  /* pesanId: digulir ke pesan itu (dari notifikasi atau kutipan); tanpa itu, ke "Pesan baru". */
  function bukaRuang(ruang, pesanId = '') {
    if (!I.bolehRuang(S.me, ruang)) return toast('Ruang itu hanya untuk anggota timnya.', true);
    Object.assign(S.kom, {
      pilih: ruang, balas: '', ubah: '', tanya: false, lompat: pesanId || 'baru',
      batasBaru: { ruang, baca: Number(petaBaca()[ruang]) || 0 },
    });
    // Dibuka dengan sengaja: terbaca, walau tab sedang tak terlihat (mis. dibuka dari notifikasi sistem).
    tandaiDibaca(ruang);
    S.notif.buka = false;
    if (S.view !== 'komunikasi' || S.pilih) { S.pilih = null; pindahHalaman('komunikasi'); } else render();
    if (!hp()) { const ta = $('#tulis-kom'); if (ta) ta.focus({ preventScroll: true }); }
  }
  /* Setelah digambar: ke pesan yang dituju, ke batas "Pesan baru", atau ke paling bawah. */
  function gulirPesan(wadah) {
    const kotak = $('#pesan-' + wadah);
    if (!kotak) return;
    const lompat = wadah === 'kom' ? S.kom.lompat : '';
    if (wadah === 'kom') S.kom.lompat = '';
    const tujuan = !lompat ? null : lompat === 'baru' ? $('.km-batas-baru', kotak) : document.getElementById(`psn-${wadah}-${lompat}`);
    if (!tujuan) { kotak.scrollTop = kotak.scrollHeight; return; }
    kotak.scrollTop = Math.max(0, tujuan.offsetTop - 48);
    if (tujuan.classList.contains('km-psn')) sorotPesan(tujuan);
  }
  function sorotPesan(el) {
    el.classList.remove('sorot');
    void el.offsetWidth;
    el.classList.add('sorot');
  }
  function lompatKePesan(wadah, id) {
    const el = document.getElementById(`psn-${wadah}-${id}`);
    if (!el) return toast('Pesan yang dibalas sudah tidak ada di percakapan ini.', true);
    const kotak = $('#pesan-' + wadah);
    kotak.scrollTop = Math.max(0, el.offsetTop - 48);
    sorotPesan(el);
  }

  /* ----- Halaman ----- */

  function statusObrolan() {
    if (S.obr.galat) return `<span class="km-status-galat">${ikon('tutup', 14)} ${esc(S.obr.galat)} Dicoba lagi otomatis.</span>`;
    if (!S.obr.diperbarui) return 'Memuat pesan bersama…';
    return `${ikon('centang', 14)} Pesan tersimpan bersama di spreadsheet v2, semua orang melihat yang sama · diperbarui ${esc(relatif(S.obr.diperbarui))}`;
  }

  const utasKom = (saring, q = '') => I.daftarUtas(S.data, S.me, susunan(), { saring, lingkup: S.kom.lingkup, q, sejak: sejakBaca });
  function hitungKom() {
    const semua = utasKom('semua');
    return {
      baru: semua.filter(x => x.baru).length,
      sebut: semua.filter(x => x.sebutBaru).length,
      tanya: semua.reduce((n, x) => n + x.tanya, 0),
      perRuang: new Map(semua.map(x => [x.ruang, x])),
    };
  }

  function saringKomHtml() {
    const h = hitungKom();
    const k = S.kom;
    const n = { baru: h.baru, sebut: h.sebut, tanya: h.tanya, semua: 0 };
    const item = (aktif, attr, ik, label, jumlah, kelas = '') => `<button type="button" class="km-item ${aktif ? 'aktif' : ''} ${kelas}" ${attr}${aktif ? ' aria-current="true"' : ''}>
        ${ik}<span class="km-item-label">${label}</span>${jumlah ? `<span class="km-n">${jumlah}</span>` : ''}</button>`;
    const kotak = SARINGAN_KOM.map(([v, l, ik]) => item(k.saring === v, `data-aksi="kom-saring" data-nilai="${v}"`, ikon(ik, 16), l, n[v], v === 'tanya' && n.tanya ? 'penting' : ''));
    const tim = I.ruangTimSaya(S.me).map(kode => {
      const r = I.ruangTim(kode);
      return item(k.pilih === r, `data-aksi="kom-buka" data-ruang="${r}"`, ikon('orang', 16), esc(I.TIM[kode].nama), (h.perRuang.get(r) || {}).baru);
    });
    const proyek = S.data.projects.filter(p => !p.arsip)
      .map(p => ({ p, x: h.perRuang.get(I.ruangProyek(p.id)) }))
      .sort((a, b) => ((b.x ? b.x.terakhir.at : 0) - (a.x ? a.x.terakhir.at : 0)) || a.p.name.localeCompare(b.p.name, 'id'));
    const tampil = (k.proyekSemua ? proyek : proyek.slice(0, 6)).map(({ p, x }) => {
      const r = I.ruangProyek(p.id);
      return item(k.pilih === r, `data-aksi="kom-buka" data-ruang="${r}" title="${esc(p.name)}"`, ikon('lapis', 16), esc(p.name), x ? x.baru : 0);
    });
    return `<p class="km-judul">Kotak masuk</p>${kotak.join('')}
      ${tim.length ? `<p class="km-judul">Ruang tim</p>${tim.join('')}` : ''}
      <p class="km-judul">Ruang proyek</p>${tampil.join('') || '<p class="hint km-item-kosong">Belum ada proyek aktif.</p>'}
      ${proyek.length > 6 ? `<button type="button" class="km-lagi" data-aksi="kom-proyek-semua">${k.proyekSemua ? 'Lebih sedikit' : `Semua proyek (${proyek.length})`}</button>` : ''}`;
  }

  /* Di layar sempit kolom kiri menjadi deretan chip di atas daftar. */
  function saringHpHtml() {
    const h = hitungKom();
    const n = { baru: h.baru, sebut: h.sebut, tanya: h.tanya };
    const chip = (aktif, attr, label, jumlah) => `<button type="button" class="km-chip ${aktif ? 'aktif' : ''}" ${attr}>${label}${jumlah ? ` <b>${jumlah}</b>` : ''}</button>`;
    return [
      ...SARINGAN_KOM.map(([v, l]) => chip(S.kom.saring === v, `data-aksi="kom-saring" data-nilai="${v}"`, l, n[v])),
      ...I.ruangTimSaya(S.me).map(kode => chip(false, `data-aksi="kom-buka" data-ruang="${I.ruangTim(kode)}"`, 'Tim ' + kode, (h.perRuang.get(I.ruangTim(kode)) || {}).baru)),
      chip(false, 'data-aksi="kom-pilih-proyek"', 'Ruang proyek…', 0),
    ].join('');
  }
  function formPilihRuang() {
    const daftar = S.data.projects.filter(p => !p.arsip).sort((a, b) => a.name.localeCompare(b.name, 'id'));
    return `<div class="form-pilih-ruang">
      <h2>Ruang proyek</h2>
      <p class="hint">Diskusi untuk seluruh proyek, di luar utas per task. Terbuka untuk semua orang.</p>
      <div class="pilih-ruang-daftar">${daftar.map(p => `<button type="button" class="km-item" data-aksi="kom-buka" data-ruang="${I.ruangProyek(p.id)}">${ikon('lapis', 16)}<span class="km-item-label">${esc(p.name)}</span><small>${esc(p.id)}</small></button>`).join('')}</div>
      <div class="modal-kaki"><button type="button" class="tombol" data-aksi="tutup-modal">Tutup</button></div>
    </div>`;
  }

  function viewKomunikasi() {
    const k = S.kom;
    if (k.pilih && !I.bolehRuang(S.me, k.pilih)) k.pilih = null;
    const segmen = segmenLingkup('kom', k.lingkup === 'terlibat' ? 'saya' : k.lingkup, 'Lingkup utas task', { ...LABEL_LINGKUP, saya: 'Saya terlibat' });
    return `<div class="judul-halaman"><div><h1>Komunikasi</h1><p id="kom-status" class="km-status-baris">${statusObrolan()}</p></div></div>
      <div class="kotak-masuk ${k.pilih ? 'buka-ruang' : ''}">
        <nav class="km-kiri kartu-polos rapat" id="km-saring" aria-label="Kotak masuk dan ruang">${saringKomHtml()}</nav>
        <section class="km-tengah kartu-polos rapat" aria-label="Daftar utas">
          <div class="km-alat">${kotakCari('komunikasi', k.q, 'Cari utas atau isi pesan…')}${segmen}</div>
          <div class="km-chips" id="km-saring-hp">${saringHpHtml()}</div>
          <div id="hasil" class="km-utas">${hasilKomunikasi()}</div>
        </section>
        <section class="km-kanan kartu-polos rapat" aria-label="Percakapan">${k.pilih ? panelRuang(k.pilih, 'kom')
          : `<div class="km-kosong-kanan">${ikon('obrolan', 32)}<p><strong>Pilih utas atau ruang</strong><br><span class="hint">Pesan tersimpan bersama: semua orang melihat percakapan yang sama.</span></p></div>`}</section>
      </div>`;
  }

  const KOSONG_UTAS = {
    baru: 'Semua sudah dibaca.',
    sebut: 'Belum ada yang menyebut Anda.',
    tanya: 'Tak ada pertanyaan yang menunggu jawaban Anda.',
    semua: 'Belum ada diskusi di lingkup ini. Cari task untuk memulai, atau buka ruang tim dan proyek.',
  };
  function hasilKomunikasi() {
    const u = utasKom(S.kom.saring, S.kom.q);
    if (!u.length) return `<p class="hint km-kosong">${S.kom.q ? 'Tidak ada utas yang cocok.' : KOSONG_UTAS[S.kom.saring] || ''}</p>`;
    return u.slice(0, 150).map(itemUtas).join('')
      + (u.length > 150 ? `<p class="hint km-kosong">Menampilkan 150 dari ${u.length} utas. Persempit dengan pencarian.</p>` : '');
  }
  function itemUtas(x) {
    const m = x.terakhir;
    const tanda = x.jenis === 'task' ? (x.t ? chipJalur(x.t) : '<span class="chip-rutin">Task</span>') : ikon(x.jenis === 'proyek' ? 'lapis' : 'orang', 16);
    const siapa = m ? (m.oleh === S.me ? 'Anda' : esc(I.orang(m.oleh).pendek)) + (m.ai ? ' (AI)' : '') : '';
    const cuplik = m ? `<b>${siapa}:</b> ${m.dihapus ? '<i>pesan dihapus</i>' : esc(potong(teksPolos(m.teks), 90))}` : '<i>Belum ada pesan. Mulai diskusi.</i>';
    const bendera = (x.tanya ? `<span class="km-tanda tanya" title="Menunggu jawaban Anda">${ikon('tanya', 13)}</span>` : '')
      + (x.sebutBaru ? `<span class="km-tanda sebut" title="Menyebut Anda">${ikon('at', 13)}</span>` : '');
    const sub = x.jenis === 'task' ? `${esc(x.p ? x.p.name : x.t ? asal(x.t) : 'Task di browser lain')} · ${esc(x.id)}` : x.jenis === 'proyek' ? 'Ruang proyek' : 'Ruang tim';
    return `<button type="button" class="km-utas-item ${S.kom.pilih === x.ruang ? 'dipilih' : ''} ${x.baru ? 'baru' : ''}" data-aksi="kom-buka" data-ruang="${esc(x.ruang)}">
        <span class="km-utas-ikon ${x.jenis}">${tanda}</span>
        <span class="km-utas-isi">
          <span class="km-utas-atas"><strong>${esc(x.judul)}</strong>${m ? `<small>${esc(waktuPendek(m.at))}</small>` : ''}</span>
          <span class="km-utas-sub">${sub}</span>
          <span class="km-utas-pesan">${bendera}<span>${cuplik}</span></span>
        </span>
        ${x.baru ? `<span class="lencana">${x.baru}</span>` : ''}
      </button>`;
  }

  function panelRuang(ruang, wadah) {
    const { jenis, id } = I.bacaRuang(ruang);
    const t = jenis === 'task' ? perIdKini().get(id) : null;
    return `<header class="km-kepala">${kepalaRuang(ruang, t)}</header>
      ${t ? konteksTask(t) : ''}
      <div class="km-pesan" id="pesan-${wadah}" data-ruang="${esc(ruang)}">${daftarPesanHtml(ruang, wadah)}</div>
      ${penulis(ruang, wadah)}`;
  }

  function kepalaRuang(ruang, t) {
    const { jenis, id } = I.bacaRuang(ruang);
    const kembali = `<button type="button" class="ikon-tombol km-kembali" data-aksi="kom-tutup" aria-label="Kembali ke daftar utas">${ikon('kiri', 20)}</button>`;
    const salin = `<button type="button" class="ikon-tombol" data-aksi="salin-tautan" data-alamat="#/komunikasi/${esc(alamatRuang(ruang))}" title="Salin tautan ruang ini" aria-label="Salin tautan ruang">${ikon('tautan', 18)}</button>`;
    if (jenis === 'task' && !t) {
      return `${kembali}<div class="km-kepala-isi"><p class="detail-asal">Task di browser lain · ${esc(id)}</p><h2>${esc(judulRuang(ruang))}</h2>
        <p class="hint">Task ini tak ada di data contoh browser Anda, tetapi percakapannya tetap terbagi.</p></div>`;
    }
    if (jenis === 'task') {
      const tombol = I.aksiUntuk(t, S.me, perIdKini()).map(a => `<button type="button" class="tombol kecil ${a.utama ? 'utama' : ''}" data-aksi="aksi-task" data-id="${esc(t.id)}" data-kunci="${a.kunci}"${a.nonaktif ? ` disabled title="${esc(a.alasan || '')}"` : ''}>${esc(a.label)}</button>`).join('');
      return `${kembali}<div class="km-kepala-isi">
          <p class="detail-asal">${esc(asal(t))} · ${esc(t.id)}</p>
          <h2>${esc(t.title)}</h2>
          <div class="detail-chip">${chipJalur(t)} ${pillStatus(t.status)} ${chipLabel(t)} ${chipTenggat(t)} <span class="hint">PIC ${nama(t.pic)}</span></div>
          ${tombol ? `<div class="km-aksi">${tombol}</div>` : ''}
        </div>
        <div class="km-kepala-alat">
          <button type="button" class="ikon-tombol" data-aksi="kom-konteks" aria-pressed="${!!S.kom.konteks}" title="${S.kom.konteks ? 'Sembunyikan' : 'Tampilkan'} konteks task" aria-label="Konteks task">${ikon('info', 18)}</button>
          ${salin}
          <button type="button" class="tombol kecil" data-aksi="buka-task" data-id="${esc(t.id)}">Detail</button>
        </div>`;
    }
    if (jenis === 'proyek') {
      const p = proyekDari(id);
      return `${kembali}<div class="km-kepala-isi"><p class="detail-asal">Ruang proyek · ${esc(id)}</p><h2>${esc(judulRuang(ruang))}</h2>
          ${p ? `<div class="detail-chip">${jalurMini(p, I.siklusTutup(S.data, p))} ${timHtml(p)}</div>` : ''}</div>
        <div class="km-kepala-alat">${salin}${p ? `<button type="button" class="tombol kecil" data-aksi="buka-proyek" data-id="${esc(p.id)}">Buka proyek</button>` : ''}</div>`;
    }
    const anggota = I.anggotaTim(id);
    return `${kembali}<div class="km-kepala-isi"><p class="detail-asal">Ruang tim · ${esc(id)}</p><h2>${esc(judulRuang(ruang))}</h2>
        <div class="km-anggota">${anggota.map(o => avatar(o)).join('')}<span class="hint">${anggota.length} anggota, ditambah Manager</span></div></div>
      <div class="km-kepala-alat">${salin}</div>`;
  }

  /* Konteks task di atas percakapan: cukup untuk memutuskan tanpa membuka detailnya. */
  function konteksTask(t) {
    if (!S.kom.konteks) return '';
    const perId = perIdKini();
    const p = t.project ? proyekDari(t.project) : null;
    const tunggu = I.aktif(t) ? I.alasanTunggu(t, perId) : '';
    const syarat = t.lane === 'proyek' && I.aktif(t) && t.status !== 'Ditinjau' ? I.syaratAjukan(t, perId) : [];
    const tinjau = I.peninjau(t);
    return `<div class="km-konteks">
        <dl class="km-fakta">
          ${t.sub ? `<div><dt>Sub-stage</dt><dd>${esc(I.namaSub(t.sub))}</dd></div>` : ''}
          ${p ? `<div><dt>Proyek</dt><dd><button type="button" class="tautan-kecil" data-aksi="buka-proyek" data-id="${esc(p.id)}">${esc(p.name)}</button></dd></div>` : ''}
          <div><dt>PIC</dt><dd>${nama(t.pic)}</dd></div>
          ${tinjau ? `<div><dt>Peninjau</dt><dd>${nama(tinjau)}</dd></div>` : ''}
          <div><dt>Tenggat</dt><dd>${t.due ? esc(fmtTanggal(t.due)) : '—'}</dd></div>
          ${t.output ? `<div class="lebar"><dt>Output</dt><dd>${esc(t.output)}</dd></div>` : ''}
        </dl>
        ${tunggu ? `<p class="km-konteks-tunggu">${esc(tunggu)}</p>` : ''}
        ${syarat.length ? `<ul class="km-syarat">${syarat.map(s => `<li class="${s.ok ? 'ok' : ''}">${ikon(s.ok ? 'centang' : 'bulat', 14)}${esc(s.label)}</li>`).join('')}</ul>` : ''}
      </div>`;
  }

  /* ----- Pesan ----- */

  const hariDari = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const selisihKalender = ms => Math.round((hariDari(new Date()) - hariDari(new Date(ms))) / 864e5);
  function waktuPendek(ms) {
    const n = selisihKalender(ms);
    if (n === 0) return fmtJam(ms);
    if (n === 1) return 'Kemarin';
    if (n < 7) return new Date(ms).toLocaleDateString('id-ID', { weekday: 'short' });
    return new Date(ms).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  }
  function labelHari(ms) {
    const n = selisihKalender(ms);
    if (n === 0) return 'Hari ini';
    if (n === 1) return 'Kemarin';
    const d = new Date(ms);
    return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) });
  }

  /* Pesan & jejak task (diajukan, dikembalikan, …) dalam satu alur waktu, dengan pemisah hari
     dan batas "Pesan baru". Di laci detail task jejaknya tak diulang (sudah ada Riwayat). */
  function daftarPesanHtml(ruang, wadah) {
    const pesan = susunan().perRuang.get(ruang) || [];
    const { jenis, id } = I.bacaRuang(ruang);
    const t = jenis === 'task' && wadah === 'kom' ? perIdKini().get(id) : null;
    const jejak = t ? I.aktivitasTask(S.data, t).map(a => ({ ...a, sistem: true })) : [];
    if (!pesan.length && !jejak.length) {
      return `<div class="km-awal">${ikon('obrolan', 28)}<p><strong>Belum ada pesan</strong><br><span class="hint">Tulis yang pertama. Ketik @ untuk menyebut orang.</span></p></div>`;
    }
    const semua = [...pesan, ...jejak].sort((a, b) => a.at - b.at);
    const b = wadah === 'kom' && S.kom.batasBaru && S.kom.batasBaru.ruang === ruang ? S.kom.batasBaru.baca : null;
    const pertamaBaru = b === null ? null
      : semua.find(x => !x.sistem && x.oleh !== S.me && !x.dihapus && x.at > Math.max(b, x.bersama ? awalBersama() : S.dimuat || 0));
    let hari = '', sebelum = null, html = '';
    for (const x of semua) {
      const h = labelHari(x.at);
      if (h !== hari) { html += `<div class="km-hari"><span>${esc(h)}</span></div>`; hari = h; sebelum = null; }
      if (x === pertamaBaru) { html += '<div class="km-batas-baru"><span>Pesan baru</span></div>'; sebelum = null; }
      if (x.sistem) { html += barisSistem(x); sebelum = null; continue; }
      const sambung = !!sebelum && sebelum.oleh === x.oleh && !!sebelum.ai === !!x.ai && x.at - sebelum.at < 5 * 60000 && !x.balas && !sebelum.tanya.length && !x.tanya.length;
      html += gelembung(x, wadah, sambung, pesan);
      sebelum = x;
    }
    return html;
  }

  const KATA_TINJAU = {
    Diajukan: ['tugas', 'mengajukan untuk ditinjau', ''], Dikembalikan: ['ulang', 'mengembalikan', 'kembali'],
    Disetujui: ['centang', 'menyetujui', 'setuju'], Ditarik: ['ulang', 'menarik dari tinjauan', ''],
  };
  function barisSistem(a) {
    const [ik, kata, kelas] = a.jenis === 'tinjau' ? KATA_TINJAU[a.aksi] || ['kilat', String(a.aksi).toLowerCase(), ''] : [a.jenis === 'create' ? 'tambah' : 'kilat', '', ''];
    const isi = a.jenis === 'tinjau'
      ? `<b>${nama(a.oleh)}</b>${tandaAi(a.ai)} ${esc(kata)}${a.teks ? `: “${esc(potong(a.teks, 200))}”` : ''}`
      : `<b>${nama(a.oleh)}</b>${tandaAi(a.ai)} · ${esc(potong(a.teks, 200))}`;
    return `<div class="km-sistem ${kelas}">${ikon(ik, 14)}<span>${isi}</span><small>${esc(fmtJam(a.at))}</small></div>`;
  }

  function gelembung(m, wadah, sambung, pesanRuang) {
    const saya = m.oleh === S.me;
    const kena = !saya && !m.dihapus && (m.tanya.includes(S.me) || I.menyebut(m.teks, S.me));
    const lokal = !m.bersama && m.at > (S.dimuat || 0);
    const kepala = sambung ? '' : `<div class="km-psn-kepala"><strong>${saya ? 'Anda' : esc(I.orang(m.oleh).nama)}</strong>${tandaAi(m.ai)}
        <small>${esc(fmtJam(m.at))}${m.diubah ? ' · diubah' : ''}${lokal ? ' · hanya di browser ini' : ''}</small></div>`;
    const isi = m.dihapus ? `<i class="km-dihapus">${m.dimoderasi ? 'Pesan dihapus oleh Dev' : 'Pesan dihapus'}</i>` : `<div class="km-teks">${formatPesan(m.teks)}</div>`;
    const status = m.tertunda ? '<div class="km-status">Mengirim…</div>'
      : m.gagal ? `<div class="km-status gagal">Belum terkirim. <button type="button" class="tautan-kecil" data-aksi="psn-ulang" data-id="${esc(m.id)}">Kirim ulang</button> · <button type="button" class="tautan-kecil" data-aksi="psn-buang" data-id="${esc(m.id)}">Buang</button></div>` : '';
    return `<div class="km-psn ${saya ? 'saya' : ''} ${sambung ? 'sambung' : ''} ${kena ? 'kena' : ''}" id="psn-${wadah}-${esc(m.id)}">
        ${saya ? '' : `<span class="km-av">${sambung ? '' : avatar(m.oleh, 'sedang')}</span>`}
        <div class="km-psn-badan">
          ${kepala}
          <div class="km-gel">${m.balas ? kutipan(m.balas) : ''}${isi}${m.tanya.length && !m.dihapus ? tandaTanya(m, pesanRuang) : ''}</div>
          ${barisReaksi(m)}${status}
        </div>
        ${m.tertunda || m.gagal || m.dihapus ? '' : alatPesan(m, saya)}
      </div>`;
  }

  function kutipan(id) {
    const r = susunan().perId.get(id);
    if (!r) return '<div class="km-kutip"><span>Pesan yang dibalas tidak ditemukan</span></div>';
    return `<button type="button" class="km-kutip" data-aksi="psn-ke" data-id="${esc(id)}"><strong>${r.oleh === S.me ? 'Anda' : esc(I.orang(r.oleh).pendek)}</strong>
      <span>${r.dihapus ? '<i>pesan dihapus</i>' : esc(potong(teksPolos(r.teks), 140))}</span></button>`;
  }

  function tandaTanya(m, pesanRuang) {
    const terbuka = I.tanyaTerbuka(m, pesanRuang);
    const siapa = m.tanya.map(id => (id === S.me ? 'Anda' : I.orang(id).pendek)).join(', ');
    const bisa = terbuka && (m.tanya.includes(S.me) || m.oleh === S.me);
    const teks = terbuka ? `Menunggu jawaban ${siapa}`
      : m.beres ? `Ditandai beres oleh ${m.beres.oleh === S.me ? 'Anda' : I.orang(m.beres.oleh).pendek}` : `Sudah dijawab ${siapa}`;
    return `<div class="km-tanya ${terbuka ? 'terbuka' : 'selesai'}">${ikon(terbuka ? 'tanya' : 'centang', 14)}<span>${esc(teks)}</span>
      ${bisa ? `<button type="button" class="tautan-kecil" data-aksi="psn-beres" data-id="${esc(m.id)}">Tandai beres</button>` : ''}</div>`;
  }

  function barisReaksi(m) {
    const isi = I.REAKSI.filter(r => (m.reaksi[r.kode] || []).length).map(r => {
      const siapa = m.reaksi[r.kode];
      const saya = siapa.includes(S.me);
      const daftar = siapa.map(id => (id === S.me ? 'Anda' : I.orang(id).pendek)).join(', ');
      return `<button type="button" class="km-reaksi ${saya ? 'saya' : ''}" data-aksi="psn-reaksi" data-id="${esc(m.id)}" data-kode="${r.kode}" aria-pressed="${saya}" title="${esc(r.nama + ': ' + daftar)}">${r.simbol} ${siapa.length}</button>`;
    }).join('');
    return isi ? `<div class="km-reaksi-baris">${isi}</div>` : '';
  }

  function alatPesan(m, saya) {
    if (modeDev()) {
      return `<div class="km-alat-psn" role="group" aria-label="Moderasi pesan">
        <button type="button" class="km-alat-tombol bahaya" data-aksi="psn-moderasi" data-id="${esc(m.id)}" title="Hapus untuk semua orang (moderasi)" aria-label="Hapus pesan ini (moderasi)">${ikon('hapus', 16)}</button>
      </div>`;
    }
    return `<div class="km-alat-psn" role="group" aria-label="Aksi pesan">
        ${I.REAKSI.map(r => `<button type="button" class="km-alat-tombol" data-aksi="psn-reaksi" data-id="${esc(m.id)}" data-kode="${r.kode}" title="${esc(r.nama)}" aria-label="Reaksi: ${esc(r.nama)}">${r.simbol}</button>`).join('')}
        <button type="button" class="km-alat-tombol" data-aksi="psn-balas" data-id="${esc(m.id)}" title="Balas" aria-label="Balas pesan ini">${ikon('balas', 16)}</button>
        ${saya ? `<button type="button" class="km-alat-tombol" data-aksi="psn-ubah" data-id="${esc(m.id)}" title="Ubah" aria-label="Ubah pesan">${ikon('sunting', 16)}</button>
        <button type="button" class="km-alat-tombol" data-aksi="psn-hapus" data-id="${esc(m.id)}" title="Hapus" aria-label="Hapus pesan">${ikon('hapus', 16)}</button>` : ''}
      </div>`;
  }

  /* Format ringan seperti v1: **tebal**, _miring_, ~~coret~~, `kode`, tautan (juga [teks](alamat)),
     dan @sebutan. Dipakai pesan Komunikasi dan Catatan Saya.
     Yang tersimpan tetap teks biasa (sel spreadsheet tetap terbaca); di sini di-escape dulu,
     baru diberi tanda, jadi tak ada celah HTML dari isi pesan. */
  const POLA_FORMAT = /`(?<kode>[^`\n]+)`|\*\*(?<tebal>[^*\n]+)\*\*|~~(?<coret>[^~\n]+)~~|\[(?<label>[^\]\n]+)\]\((?<alamat>https?:\/\/[^\s)]+)\)|(?<pra>^|[^A-Za-z0-9_])_(?<miring>[^_\n]+)_(?![A-Za-z0-9_])|(?<url>https?:\/\/[^\s<>"']+)|(?<pra2>^|[^A-Za-z0-9_])@(?<nama>[A-Za-z]+)/g;
  const teksPolos = s => String(s || '').replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1').replace(/\*\*|~~|`/g, '').replace(/(^|\s)_([^_\n]+)_/g, '$1$2').replace(/\s+/g, ' ').trim();
  function tandaSebut(kata) {
    const k = kata.toLowerCase();
    const o = I.ORANG.find(x => x.pendek.toLowerCase() === k);
    if (!o && !['semua', 'lead', 'leader', 'staff', 'manager'].includes(k)) return '@' + esc(kata);
    const kena = I.menyebut('@' + (o ? o.pendek : k), S.me);
    return `<span class="km-sebut ${kena ? 'saya' : ''}" title="${esc(o ? o.nama : CALON_PERAN.reduce((t, [a, b]) => (a === k ? b : t), 'Semua ' + k))}">@${esc(o ? o.pendek : k)}</span>`;
  }
  const sebutDalam = s => esc(s).replace(/(^|[^A-Za-z0-9_])@([A-Za-z]+)/g, (x, a, b) => a + tandaSebut(b));
  function formatPesan(teks) {
    const s = String(teks || '');
    const pola = new RegExp(POLA_FORMAT.source, 'g');
    let out = '', i = 0, m;
    while ((m = pola.exec(s))) {
      const g = m.groups;
      out += esc(s.slice(i, m.index));
      if (g.kode !== undefined) out += `<code>${esc(g.kode)}</code>`;
      else if (g.tebal !== undefined) out += `<strong>${sebutDalam(g.tebal)}</strong>`;
      else if (g.coret !== undefined) out += `<s>${sebutDalam(g.coret)}</s>`;
      else if (g.label !== undefined) out += `<a href="${esc(g.alamat)}" target="_blank" rel="noopener noreferrer">${esc(g.label)}</a>`;
      else if (g.miring !== undefined) out += `${esc(g.pra)}<em>${sebutDalam(g.miring)}</em>`;
      else if (g.url !== undefined) {
        const u = g.url.replace(/[.,;:!?)\]]+$/, '');
        out += `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(u)}</a>`;
        i = m.index + u.length;
        pola.lastIndex = i;
        continue;
      } else out += esc(g.pra2) + tandaSebut(g.nama);
      i = pola.lastIndex;
    }
    return out + esc(s.slice(i));
  }

  /* ----- Menulis ----- */

  function penulis(ruang, wadah) {
    if (S.me === I.DEV) {
      return `<div class="km-tulis km-tulis-dev">${ikon('kode', 16)}<span>Mode Dev membaca dan memoderasi, tidak menulis pesan. Untuk ikut berdiskusi, pilih profil Anda sendiri.</span></div>`;
    }
    const k = S.kom;
    const ubah = k.ubah ? susunan().perId.get(k.ubah) : null;
    const draf = ubah && ubah.ruang === ruang ? ubah.teks : k.draf[ruang] || '';
    return `<form class="km-tulis" data-form="pesan" data-ruang="${esc(ruang)}" data-wadah="${wadah}" novalidate>
        <div class="km-tulis-atas" id="tulis-atas-${wadah}">${barTulis(ruang)}</div>
        ${wadah === 'kom' ? `<div class="km-cepat" aria-label="Pesan cepat">${PESAN_CEPAT.map(p => `<button type="button" class="km-cepat-item" data-aksi="kom-cepat" data-teks="${esc(p)}">${esc(p)}</button>`).join('')}</div>` : ''}
        <div class="km-tulis-baris">
          <label class="sr" for="tulis-${wadah}">Tulis pesan</label>
          <textarea id="tulis-${wadah}" class="km-isian" name="teks" rows="1" maxlength="${I.BATAS_PESAN}" placeholder="${hp() ? 'Tulis pesan… (@ untuk sebut)' : 'Tulis pesan… ketik @ untuk menyebut'}" autocomplete="off">${esc(draf)}</textarea>
          <button type="button" class="ikon-tombol km-tanya-tombol" data-aksi="kom-tanya" aria-pressed="${!!k.tanya}" title="Tandai perlu jawaban dari orang yang disebut" aria-label="Perlu jawaban">${ikon('tanya', 18)}</button>
          <button class="tombol utama km-kirim" aria-label="Kirim pesan">${ikon('kirim', 18)}</button>
        </div>
        <div class="km-sebut-pilih" id="sebut-${wadah}" role="listbox" aria-label="Sebut orang" hidden></div>
        <p class="km-bantu">Enter kirim · Shift+Enter baris baru · **tebal** · _miring_ · \`kode\`</p>
      </form>`;
  }
  function barTulis(ruang) {
    const k = S.kom;
    const per = susunan().perId;
    const tutup = label => `<button type="button" class="km-bar-tutup" data-aksi="kom-batal" aria-label="${label}">${ikon('tutup', 14)}</button>`;
    const bar = [];
    const ubah = k.ubah && per.get(k.ubah);
    const balas = k.balas && per.get(k.balas);
    if (ubah && ubah.ruang === ruang) bar.push(`<div class="km-bar">${ikon('sunting', 14)}<span>Mengubah pesan Anda. Esc untuk batal.</span>${tutup('Batal mengubah')}</div>`);
    else if (balas && balas.ruang === ruang) {
      bar.push(`<div class="km-bar">${ikon('balas', 14)}<span>Membalas <b>${balas.oleh === S.me ? 'Anda' : esc(I.orang(balas.oleh).pendek)}</b>: ${esc(potong(teksPolos(balas.teks), 80))}</span>${tutup('Batal membalas')}</div>`);
    }
    if (k.tanya && !ubah) bar.push(`<div class="km-bar tanya">${ikon('tanya', 14)}<span>Ditandai perlu jawaban dari orang yang Anda sebut${I.bacaRuang(ruang).jenis === 'task' ? ' (tanpa sebutan: PIC task-nya)' : ''}.</span><button type="button" class="km-bar-tutup" data-aksi="kom-tanya" aria-label="Batalkan tanda perlu jawaban">${ikon('tutup', 14)}</button></div>`);
    return bar.join('');
  }
  function perbaruiTulis() {
    for (const form of $$('.km-tulis')) {
      const bar = $('.km-tulis-atas', form);
      if (bar) bar.innerHTML = barTulis(form.dataset.ruang);
      const tb = $('.km-tanya-tombol', form);
      if (tb) tb.setAttribute('aria-pressed', String(!!S.kom.tanya));
    }
  }
  const tumbuhkan = ta => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 168) + 'px'; };
  function batalTulis() {
    const k = S.kom;
    if (k.ubah) {
      k.ubah = '';
      for (const ta of $$('.km-isian')) { ta.value = k.draf[ta.closest('form').dataset.ruang] || ''; tumbuhkan(ta); }
    }
    k.balas = '';
    perbaruiTulis();
  }
  function sisipkan(ta, teks) {
    const a = ta.selectionStart ?? ta.value.length, b = ta.selectionEnd ?? ta.value.length;
    const pisah = a > 0 && !/\s$/.test(ta.value.slice(0, a)) ? ' ' : '';
    ta.value = ta.value.slice(0, a) + pisah + teks + ta.value.slice(b);
    const pos = a + pisah.length + teks.length;
    ta.focus();
    ta.setSelectionRange(pos, pos);
    if (!S.kom.ubah) S.kom.draf[ta.closest('form').dataset.ruang] = ta.value;
    tumbuhkan(ta);
  }

  function kirimPesan(form) {
    const ruang = form.dataset.ruang;
    const ta = form.elements.teks;
    const isi = ta.value.replace(/\s+$/, '');
    if (!isi.trim()) return;
    if (isi.length > I.BATAS_PESAN) return toast(`Pesan terlalu panjang (maks. ${I.BATAS_PESAN} karakter).`, true);
    const k = S.kom;
    if (k.ubah) {
      const lama = susunan().perId.get(k.ubah);
      if (lama && lama.teks !== isi) kirimPeristiwa({ jenis: 'ubah', ruang, oleh: S.me, target: k.ubah, teks: isi });
      k.ubah = '';
    } else {
      let tanya = [];
      if (k.tanya) {
        tanya = I.sebutan(isi).orang.filter(id => id !== S.me);
        const { jenis, id } = I.bacaRuang(ruang);
        const t = jenis === 'task' ? perIdKini().get(id) : null;
        if (!tanya.length && t && t.pic !== S.me) tanya = [t.pic];
        if (!tanya.length) return toast('Sebut dulu siapa yang perlu menjawab, mis. @Kiki.', true);
      }
      S.kom.keBawah = true;
      tandaiDibaca(ruang);
      kirimPeristiwa({ jenis: 'pesan', ruang, oleh: S.me, teks: isi, target: k.balas || '', tanya, judul: judulRuang(ruang) });
      Object.assign(k, { balas: '', tanya: false });
    }
    ta.value = '';
    delete k.draf[ruang];
    tumbuhkan(ta);
    perbaruiTulis();
    ta.focus();
  }

  /* @sebutan: daftar pilihan muncul saat mengetik @, dipilih dengan panah dan Enter/Tab. */
  let sebutAktif = null;
  function cariSebutan(ta) {
    const sebelum = ta.value.slice(0, ta.selectionStart);
    const m = /(^|[^A-Za-z0-9_])@([A-Za-z]*)$/.exec(sebelum);
    return m ? { awal: ta.selectionStart - m[2].length - 1, kata: m[2] } : null;
  }
  function tutupSebutan() {
    if (sebutAktif) { const kotak = $('#sebut-' + sebutAktif.wadah); if (kotak) kotak.hidden = true; }
    sebutAktif = null;
  }
  function perbaruiSebutan(ta) {
    const wadah = ta.id.replace('tulis-', '');
    const c = cariSebutan(ta);
    if (!c) return tutupSebutan();
    const kata = c.kata.toLowerCase();
    const orang = I.ORANG.filter(o => o.id !== S.me && (o.pendek.toLowerCase().startsWith(kata) || o.nama.toLowerCase().split(' ').some(b => b.startsWith(kata))));
    const peran = CALON_PERAN.filter(([k]) => k.startsWith(kata));
    const calon = [...orang.map(o => ({ sisip: o.pendek, label: o.nama, ket: o.jabatan, id: o.id })), ...peran.map(([k, l]) => ({ sisip: k, label: '@' + k, ket: l, id: '' }))].slice(0, 8);
    if (!calon.length) return tutupSebutan();
    sebutAktif = { wadah, calon, i: 0, awal: c.awal, panjang: c.kata.length };
    gambarSebutan();
  }
  function gambarSebutan() {
    const s = sebutAktif;
    const kotak = $('#sebut-' + s.wadah);
    if (!kotak) return;
    kotak.innerHTML = s.calon.map((x, i) => `<button type="button" role="option" aria-selected="${i === s.i}" class="km-calon ${i === s.i ? 'aktif' : ''}" data-aksi="sebut-pilih" data-i="${i}">
        ${x.id ? avatar(x.id) : `<span class="km-calon-ikon">${ikon('orang', 14)}</span>`}<span><b>${esc(x.label)}</b><small>${esc(x.ket)}</small></span></button>`).join('');
    kotak.hidden = false;
  }
  function pakaiSebutan(i) {
    const s = sebutAktif;
    const ta = s && $('#tulis-' + s.wadah);
    const x = s && s.calon[i];
    if (!ta || !x) return tutupSebutan();
    const sisip = '@' + x.sisip + ' ';
    ta.value = ta.value.slice(0, s.awal) + sisip + ta.value.slice(s.awal + 1 + s.panjang);
    const pos = s.awal + sisip.length;
    tutupSebutan();
    ta.focus();
    ta.setSelectionRange(pos, pos);
    if (!S.kom.ubah) S.kom.draf[ta.closest('form').dataset.ruang] = ta.value;
  }
  /* Diskusi di laci detail task: percakapan yang sama dengan ruang task di Komunikasi. */
  function diskusiDetail(t) {
    const ruang = I.ruangTask(t.id);
    const n = (susunan().perRuang.get(ruang) || []).filter(m => !m.dihapus).length;
    return `<section class="diskusi-detail">
        <div class="baris-subjudul"><p class="subjudul">Diskusi${n ? ' · ' + n : ''}</p>
          <button type="button" class="tombol kecil" data-aksi="kom-buka" data-ruang="${esc(ruang)}">${ikon('obrolan', 16)} Buka di Komunikasi</button></div>
        <div class="km-pesan ringkas" id="pesan-detail" data-ruang="${esc(ruang)}">${daftarPesanHtml(ruang, 'detail')}</div>
        ${penulis(ruang, 'detail')}
      </section>`;
  }

  /* ---------- Link Saya ----------
     Seperti ide v2: kartu per folder, link sebagai baris ringkas. Di atasnya Tautan tim
     (dulu halaman Dashboard Lain; dikelola Manager) dan ★ Favorit. Tambah cepat: tempel
     alamatnya lalu Enter, judulnya terisi sendiri dari alamat.
     Sejak 0.11.0: folder bisa diciutkan dan disematkan ke atas, kartu panjang dipotong 6 link,
     ada tampilan daftar ringkas, dan link bisa diseret ke folder lain (desktop). */

  const WARNA_FOLDER = ['#0068B4', '#0E7490', '#7A3E9D', '#067647', '#8A4B00', '#9F1239', '#3D4654'];
  function warnaFolder(nama) {
    let h = 0;
    for (const c of String(nama)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return WARNA_FOLDER[h % WARNA_FOLDER.length];
  }
  const linkSaya = () => S.data.links.filter(l => l.user === S.me);
  const folderSaya = daftar => [...new Set(daftar.map(x => x.folder).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id'));
  /* Kunci folder istimewa di tombol "buka semua", ciut, dan seret. */
  const FAVORIT = '__favorit', TIM = '__tim';
  const BATAS_KARTU = 6;

  /* Preferensi tampilan per profil di browser ini: folder yang diciutkan dan disematkan, dan
     bentuk tampilan (kartu/daftar). Bukan data, jadi tak ikut Reset data contoh. */
  function prefLink() {
    return {
      ciut: new Set(ambil('lnk_ciut_' + S.me, [])),
      semat: ambil('lnk_semat_' + S.me, []),
      tampilan: ambil('lnk_tampil_' + S.me, 'kartu') === 'daftar' ? 'daftar' : 'kartu',
    };
  }
  function simpanPrefLink(p) {
    if (p.ciut) simpan('lnk_ciut_' + S.me, [...p.ciut]);
    if (p.semat) simpan('lnk_semat_' + S.me, p.semat);
    if (p.tampilan) simpan('lnk_tampil_' + S.me, p.tampilan);
  }
  /* Kunci semua kartu yang tampil sekarang, untuk tombol Ciutkan/Buka semua. */
  function kunciKartuLink() {
    const milik = linkSaya();
    const kunci = I.kelompokFolder(milik).map(g => g.folder);
    if (milik.some(l => l.favorit)) kunci.unshift(FAVORIT);
    if (S.data.dashboards.length || I.orang(S.me).peran === 'manager') kunci.unshift(TIM);
    return kunci;
  }

  function viewLink() {
    const milik = linkSaya();
    const pref = prefLink();
    const semuaCiut = kunciKartuLink().every(k => pref.ciut.has(k));
    return `<div class="judul-halaman"><div><h1>Link Saya</h1><p>${milik.length} link pribadi ${esc(I.orang(S.me).pendek)} · ${S.data.dashboards.length} tautan tim</p></div>
        <button type="button" class="tombol" data-aksi="folder-baru">${ikon('tambahFolder', 16)} Folder baru</button></div>
      <div class="alat alat-link">
        ${kotakCari('link', S.lnk.q, 'Cari judul, alamat, folder…')}
        <form class="tempel-link" data-form="link-cepat" novalidate>
          <label class="tempel">${ikon('tautan', 16)}<span class="sr">Alamat link baru</span><input id="link-tempel" name="url" inputmode="url" placeholder="Tempel alamat link, lalu Enter…" autocomplete="off" maxlength="2000"></label>
          <label class="sr" for="link-tempel-folder">Masuk ke folder</label>
          <select id="link-tempel-folder" name="folder">${opsiHtml([['', I.FOLDER_UMUM], ...folderSaya(milik).map(f => [f, f])], ambil('lnk_folder_' + S.me, ''))}</select>
          <button class="tombol utama kecil">${ikon('tambah', 16)} Tambah</button>
        </form>
      </div>
      <div class="alat-tampil-link">
        <div class="segmen segmen-ikon" role="group" aria-label="Tampilan link">
          <button type="button" data-aksi="link-tampil" data-nilai="kartu" aria-pressed="${pref.tampilan === 'kartu'}" title="Kartu" aria-label="Tampilan kartu">${ikon('grid', 18)}</button>
          <button type="button" data-aksi="link-tampil" data-nilai="daftar" aria-pressed="${pref.tampilan === 'daftar'}" title="Daftar ringkas" aria-label="Tampilan daftar ringkas">${ikon('daftar', 18)}</button>
        </div>
        <button type="button" class="tombol kecil" data-aksi="link-ciut-semua">${ikon(semuaCiut ? 'bawah' : 'atas', 16)} ${semuaCiut ? 'Buka semua' : 'Ciutkan semua'}</button>
        <span class="hint alat-tampil-ket">Seret link ke folder lain untuk memindahkannya.</span>
      </div>
      <div id="hasil">${hasilLink()}</div>`;
  }

  function hasilLink() {
    const kata = S.lnk.q.trim().toLowerCase();
    const cocok = x => !kata || [x.title, x.url, x.folder, x.deskripsi].join(' ').toLowerCase().includes(kata);
    const milik = linkSaya().filter(cocok);
    const tim = S.data.dashboards.filter(cocok);
    const isM = I.orang(S.me).peran === 'manager';
    if (!milik.length && !tim.length && kata) return '<div class="kosong-isi">Tidak ada link yang cocok.</div>';
    const pref = prefLink();
    const klik = petaKlik();
    const sering = kata ? [] : milik.filter(l => klik[l.id]).sort((a, b) => klik[b.id] - klik[a.id]).slice(0, 5);
    const favorit = milik.filter(l => l.favorit);
    // Folder yang disematkan paling atas (urut saat disematkan), lalu Tautan tim, Favorit, dan
    // folder lain urut nama; Umum paling akhir.
    const kelompok = I.kelompokFolder(milik);
    const semat = pref.semat.map(f => kelompok.find(g => g.folder === f)).filter(Boolean);
    const kartu = [
      ...semat.map(g => kartuFolder({ kunci: g.folder, judul: g.folder, isi: g.isi, semat: true }, pref, kata)),
      tim.length || (isM && !kata) ? kartuTautanTim(tim, isM, pref, kata) : '',
      favorit.length ? kartuFolder({ kunci: FAVORIT, judul: 'Favorit', ikon: 'bintang', warna: '#B86E00', isi: favorit }, pref, kata) : '',
      ...kelompok.filter(g => !semat.includes(g)).map(g => kartuFolder({ kunci: g.folder, judul: g.folder, isi: g.isi }, pref, kata)),
    ].filter(Boolean);
    return (sering.length ? `<div class="sering-dibuka"><span class="label-kecil">${ikon('kilat', 14)} Sering dibuka di perangkat ini</span>
        ${sering.map(l => `<a class="chip-link" href="${tautanAman(l.url) ? esc(l.url) : '#'}" target="_blank" rel="noopener noreferrer" data-link="${esc(l.id)}">${esc(potong(l.title, 34))}</a>`).join('')}</div>` : '')
      + `<div class="grid-folder ${pref.tampilan === 'daftar' ? 'daftar' : ''}">${kartu.join('')}</div>`
      + (milik.length ? '' : '<p class="hint" style="margin-top:12px">Belum ada link pribadi. Tempel alamatnya di kotak di atas, atau tekan Ctrl+V di halaman ini.</p>');
  }

  /* Menu ⋯ (elemen <details>): aksi folder yang jarang dipakai, supaya nama folder tetap terbaca.
     Tertutup sendiri saat mengeklik di luarnya, memilih isinya, atau menekan Esc. */
  const menuLagi = (label, isi) => `<details class="menu-lagi">
      <summary class="ikon-tombol" title="Lainnya" aria-label="${esc(label)}">${ikon('lainnya', 16)}</summary>
      <div class="menu-lagi-isi">${isi}</div>
    </details>`;
  const butirFolder = (jenis, folder) => `<button type="button" data-aksi="folder-ganti" data-jenis="${jenis}" data-folder="${esc(folder)}">${ikon('sunting', 16)}<span>Ganti nama folder</span></button>
      <button type="button" class="bahaya" data-aksi="folder-hapus" data-jenis="${jenis}" data-folder="${esc(folder)}">${ikon('hapus', 16)}<span>Hapus folder</span></button>`;

  /* Kepala kartu: seluruh bagian nama adalah tombol ciut/buka. Saat mencari, semua terbuka. */
  function kepalaFolder(kunci, judul, ket, ikonHtml, ciut, alat) {
    return `<header class="folder-kepala">
        <button type="button" class="folder-ciut" data-aksi="link-ciut" data-folder="${esc(kunci)}" aria-expanded="${!ciut}" title="${ciut ? 'Buka' : 'Ciutkan'} ${esc(judul)}">
          <span class="folder-panah">${ikon(ciut ? 'kanan' : 'bawah', 16)}</span>
          ${ikonHtml}
          <span class="folder-nama"><strong>${esc(judul)}</strong><small>${ket}</small></span>
        </button>
        <span class="folder-alat">${alat}</span>
      </header>`;
  }
  /* Kartu panjang dipotong BATAS_KARTU link; "Lihat semua" membukanya selama sesi ini. */
  function isiFolder(kunci, baris, kata) {
    const penuh = !!kata || S.lnk.penuh.has(kunci) || baris.length <= BATAS_KARTU;
    const tampil = penuh ? baris : baris.slice(0, BATAS_KARTU);
    return `<ul class="folder-isi">${tampil.join('')}</ul>${kata || baris.length <= BATAS_KARTU ? ''
      : `<button type="button" class="folder-lagi" data-aksi="link-penuh" data-folder="${esc(kunci)}">${penuh ? 'Lebih sedikit' : `Lihat semua (${baris.length})`}</button>`}`;
  }

  function kartuFolder(g, pref, kata) {
    const umum = g.kunci === I.FOLDER_UMUM;
    const favorit = g.kunci === FAVORIT;
    const ciut = !kata && pref.ciut.has(g.kunci);
    const urut = g.isi.slice().sort((a, b) => a.title.localeCompare(b.title, 'id'));
    const ikonHtml = `<span class="folder-ikon" style="--warna:${g.warna || warnaFolder(g.judul)}">${ikon(g.ikon || 'folder', 18)}</span>`;
    const bukaSemua = `<button type="button" class="ikon-tombol" data-aksi="link-buka-semua" data-folder="${esc(g.kunci)}" title="Buka semua di tab baru" aria-label="Buka semua link ${esc(g.judul)}">${ikon('luar', 16)}</button>`;
    // Kepala ringkas: + dan ⋯ (buka semua, sematkan, ganti nama, hapus). Favorit cukup "buka semua".
    const alat = favorit ? bukaSemua : `<button type="button" class="ikon-tombol" data-aksi="link-tambah" data-folder="${esc(umum ? '' : g.kunci)}" title="Tambah link ke folder ini" aria-label="Tambah link ke ${esc(g.judul)}">${ikon('tambah', 16)}</button>
      ${menuLagi(`Menu folder ${g.judul}`, `<button type="button" data-aksi="link-buka-semua" data-folder="${esc(g.kunci)}">${ikon('luar', 16)}<span>Buka semua di tab baru</span></button>
        <button type="button" data-aksi="link-semat" data-folder="${esc(g.kunci)}" aria-pressed="${!!g.semat}">${ikon('semat', 16)}<span>${g.semat ? 'Lepas sematan' : 'Sematkan ke atas'}</span></button>
        ${umum ? '' : butirFolder('links', g.kunci)}`)}`;
    return `<section class="kartu-folder ${ciut ? 'ciut' : ''} ${g.semat ? 'disemat' : ''}" data-tujuan="${esc(g.kunci)}">
      ${kepalaFolder(g.kunci, g.judul, `${g.isi.length} link${g.semat ? ` · <span class="tanda-semat">${ikon('semat', 12)} disematkan</span>` : ''}`, ikonHtml, ciut, alat)}
      ${ciut ? '' : isiFolder(g.kunci, urut.map(barisLink), kata)}
    </section>`;
  }

  /* Seret hanya dengan tetikus: di layar sentuh, tekan lama pada link tetap memunculkan menu bawaan. */
  const bisaSeret = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  function barisLink(l) {
    return `<li class="baris-link" draggable="${bisaSeret()}" data-link-id="${esc(l.id)}">
      <a href="${tautanAman(l.url) ? esc(l.url) : '#'}" target="_blank" rel="noopener noreferrer" data-link="${esc(l.id)}" draggable="false">
        <span class="link-ikon">${ikon('tautan', 16)}</span>
        <span class="link-teks"><strong>${esc(l.title)}</strong><small>${esc(namaSitus(l.url))}${l.folder && l.favorit ? ' · ' + esc(l.folder) : ''}</small></span>
      </a>
      <span class="link-alat">
        <button type="button" class="ikon-tombol ${l.favorit ? 'nyala' : ''}" data-aksi="link-favorit" data-id="${esc(l.id)}" aria-pressed="${l.favorit}" title="${l.favorit ? 'Hapus dari favorit' : 'Jadikan favorit'}" aria-label="Favorit: ${esc(l.title)}">${ikon('bintang', 16)}</button>
        <button type="button" class="ikon-tombol" data-aksi="link-ubah" data-id="${esc(l.id)}" title="Ubah" aria-label="Ubah ${esc(l.title)}">${ikon('sunting', 16)}</button>
        <button type="button" class="ikon-tombol" data-aksi="link-pindah" data-id="${esc(l.id)}" title="Pindah folder" aria-label="Pindah folder ${esc(l.title)}">${ikon('pindah', 16)}</button>
        <button type="button" class="ikon-tombol" data-aksi="link-hapus" data-id="${esc(l.id)}" title="Hapus" aria-label="Hapus ${esc(l.title)}">${ikon('hapus', 16)}</button>
      </span>
    </li>`;
  }

  /* Dashboard dan laporan tim (dulu halaman Dashboard Lain): terlihat semua orang, Manager yang mengelola. */
  function kartuTautanTim(daftar, isM, pref, kata) {
    const ciut = !kata && pref.ciut.has(TIM);
    const ikonHtml = `<span class="folder-ikon" style="--warna:#003078">${ikon('orang', 18)}</span>`;
    const alat = `${daftar.length ? `<button type="button" class="ikon-tombol" data-aksi="link-buka-semua" data-folder="${TIM}" title="Buka semua di tab baru" aria-label="Buka semua tautan tim">${ikon('luar', 16)}</button>` : ''}
      ${isM ? `<button type="button" class="ikon-tombol" data-aksi="dashlain-tambah" title="Tambah tautan tim" aria-label="Tambah tautan tim">${ikon('tambah', 16)}</button>` : ''}`;
    const baris = daftar.map(x => `<li class="baris-link">
        <a href="${tautanAman(x.url) ? esc(x.url) : '#'}" target="_blank" rel="noopener noreferrer">
          <span class="link-ikon tim">${ikon(IKON_DASH[x.icon] || 'jendela', 16)}</span>
          <span class="link-teks"><strong>${esc(x.title)}</strong><small>${esc(x.deskripsi || namaSitus(x.url))}</small></span>
        </a>
        ${isM ? `<span class="link-alat">
          <button type="button" class="ikon-tombol" data-aksi="dashlain-ubah" data-id="${esc(x.id)}" title="Ubah" aria-label="Ubah ${esc(x.title)}">${ikon('sunting', 16)}</button>
          <button type="button" class="ikon-tombol" data-aksi="dashlain-hapus" data-id="${esc(x.id)}" title="Hapus" aria-label="Hapus ${esc(x.title)}">${ikon('hapus', 16)}</button></span>` : ''}
      </li>`);
    return `<section class="kartu-folder folder-tim ${ciut ? 'ciut' : ''}" data-tujuan="${TIM}">
      ${kepalaFolder(TIM, 'Tautan tim', `${daftar.length} dashboard & laporan · ${isM ? 'Anda yang mengelola' : 'dikelola Manager'}`, ikonHtml, ciut, alat)}
      ${ciut ? '' : baris.length ? isiFolder(TIM, baris, kata) : '<ul class="folder-isi"><li class="hint folder-kosong">Belum ada tautan tim.</li></ul>'}
    </section>`;
  }

  /* Membuka banyak tab sekaligus bisa ditahan pemblokir pop-up; yang tertahan disebutkan. */
  function bukaSemuaLink(kunci) {
    const daftar = kunci === TIM ? S.data.dashboards
      : kunci === FAVORIT ? linkSaya().filter(l => l.favorit)
        : linkSaya().filter(l => (l.folder || I.FOLDER_UMUM) === kunci);
    const aman = daftar.filter(x => tautanAman(x.url));
    let tertahan = 0;
    for (const x of aman) {
      if (!window.open(x.url, '_blank', 'noopener')) tertahan++;
      if (x.user) hitungKlik(x.id);
    }
    if (tertahan) toast(`${tertahan} dari ${aman.length} tab ditahan browser. Izinkan pop-up untuk situs ini, lalu coba lagi.`, true);
  }

  /* Seret link ke kartu folder lain (desktop). Ke Favorit = menandai favorit; Tautan tim
     dikelola Manager, jadi bukan tujuan. */
  function pindahkanLink(id, tujuan) {
    const l = S.data.links.find(x => x.id === id && x.user === S.me);
    if (!l) return;
    if (tujuan === TIM) return toast('Tautan tim dikelola Manager. Seret ke folder Anda sendiri.', true);
    try {
      if (tujuan === FAVORIT) {
        if (l.favorit) return;
        I.tandaiLink(S.data, S.me, l.id, true);
        return selesaiUbah(`${l.title} masuk Favorit.`);
      }
      const folder = tujuan === I.FOLDER_UMUM ? '' : tujuan;
      if ((l.folder || '') === folder) return;
      I.simpanLink(S.data, S.me, { ...l, folder }, l.id, Date.now());
      selesaiUbah(`${l.title} dipindah ke ${folder || I.FOLDER_UMUM}.`);
    } catch (err) { toast(err.message, true); }
  }
  /* Nama folder berganti atau folder dihapus: preferensi ciut & sematnya ikut. */
  function pindahPrefFolder(jenis, lama, baru) {
    if (jenis === 'links') {
      const p = prefLink();
      const ganti = k => (k === lama ? baru : k);
      simpanPrefLink({
        ciut: new Set([...p.ciut].map(ganti).filter(Boolean)),
        semat: [...new Set(p.semat.map(ganti).filter(Boolean))],
      });
    } else if (jenis === 'notes') {
      const ciut = new Set([...prefCatatan().ciut].map(k => (k === lama ? baru : k)).filter(Boolean));
      simpan('ctt_ciut_' + S.me, [...ciut]);
    }
  }

  /* ---------- Catatan Saya ----------
     Seperti ide v2: dua panel (daftar + editor besar), atau kartu ala Google Keep (editor
     terbuka di jendela). Daftar dikelompokkan per folder yang bisa diciutkan, yang disematkan
     paling atas. Sejak 0.14.0 editornya satu tampilan langsung ala Notion: blok judul, daftar,
     checklist yang bisa dicentang, tabel, kutipan, dan garis pemisah, dipilih lewat "/" atau
     toolbar. Tersimpan otomatis; Ctrl+S menyimpan seketika. Catatan tetap di browser ini
     (pribadi), begitu juga riwayat versinya. */

  const catatanSaya = () => S.data.notes.filter(n => n.user === S.me);
  const urutCatatan = daftar => daftar.slice().sort((a, b) => (b.pin - a.pin) || (b.updatedAt || 0) - (a.updatedAt || 0));
  /* Catatan tanpa judul memakai baris pertama isinya (tanpa penanda checklist/format) sebagai judul. */
  function barisPertama(n) {
    const b = String(n.body || '').split('\n');
    const i = b.findIndex(x => x.trim());
    return i < 0 ? '' : I.teksBarisCatatan(n.body, i);
  }
  const judulCatatan = n => n.title || potong(barisPertama(n), 60) || 'Tanpa judul';
  /* Cuplikan polos untuk daftar: penanda checklist, daftar, judul, dan format dibuang. */
  function cuplikCatatan(n) {
    const baris = String(n.body || '').split('\n');
    const lewati = n.title ? -1 : baris.findIndex(x => x.trim());
    const isi = baris.map((_, i) => (i === lewati ? '' : I.teksBarisCatatan(n.body, i))).filter(Boolean).join(' · ');
    return potong(isi, 120);
  }
  const ringkasCatatan = () => `${catatanSaya().length} catatan pribadi ${I.orang(S.me).pendek} · tersimpan otomatis di browser ini`;
  const SEMAT_CTT = '__semat';
  const WARNA_UI = [['', 'Tanpa warna'], ['biru', 'Biru'], ['hijau', 'Hijau'], ['kuning', 'Kuning'], ['merah', 'Merah'], ['ungu', 'Ungu']];

  function prefCatatan() {
    return {
      tampilan: ambil('ctt_tampil_' + S.me, 'panel') === 'kartu' ? 'kartu' : 'panel',
      ciut: new Set(ambil('ctt_ciut_' + S.me, [])),
    };
  }
  const modeKartu = () => prefCatatan().tampilan === 'kartu';

  function catatanAktif() {
    if (S.ctt.pilih === '__baru') return { id: '__baru', title: '', body: '', folder: S.ctt.folderBaru || '', pin: false, warna: '', createdAt: 0, updatedAt: 0 };
    return catatanSaya().find(n => n.id === S.ctt.pilih) || null;
  }

  function viewCatatan() {
    const milik = catatanSaya();
    const kartu = modeKartu();
    if (S.ctt.pilih && S.ctt.pilih !== '__baru' && !milik.some(n => n.id === S.ctt.pilih)) S.ctt.pilih = null;
    // Dua panel di desktop langsung membuka catatan teratas; di ponsel daftar dulu.
    if (!kartu && !S.ctt.pilih && !hp() && milik.length) pilihAwal(urutCatatan(milik)[0]);
    const n = kartu ? null : catatanAktif();
    const kepala = `<div class="judul-halaman"><div><h1>Catatan Saya</h1><p id="catatan-ringkas">${esc(ringkasCatatan())}</p></div>
        <div class="judul-alat">
          <div class="segmen segmen-ikon" role="group" aria-label="Tampilan catatan">
            <button type="button" data-aksi="ctt-tampil" data-nilai="panel" aria-pressed="${!kartu}" title="Dua panel" aria-label="Tampilan dua panel">${ikon('duaPanel', 18)}</button>
            <button type="button" data-aksi="ctt-tampil" data-nilai="kartu" aria-pressed="${kartu}" title="Kartu" aria-label="Tampilan kartu">${ikon('grid', 18)}</button>
          </div>
          <button type="button" class="tombol tombol-templat" data-aksi="ctt-templat" title="Mulai dari templat">${ikon('templat', 16)}<span>Templat</span></button>
          <button type="button" class="tombol utama" data-aksi="catatan-baru">${ikon('tambah', 16)} Catatan baru</button>
        </div></div>`;
    const alat = `<div class="catatan-alat">${kotakCari('catatan', S.ctt.q, 'Cari catatan…')}${saringWarnaHtml()}</div>`;
    if (kartu) return `${kepala}<div class="catatan-kartu-wadah">${alat}<div id="hasil" class="ctt-grup-daftar ctt-grid">${daftarCatatan()}</div></div>`;
    return `${kepala}<div class="catatan-dua ${n ? 'ada-editor' : ''}">
        <aside class="catatan-panel kartu-polos rapat">${alat}<div id="hasil" class="catatan-list ctt-grup-daftar">${daftarCatatan()}</div></aside>
        ${n ? editorCatatan(n, folderSaya(milik)) : `<section class="kartu-polos catatan-editor catatan-kosong">${ikon('catatan', 28)}
          <p><strong>${milik.length ? 'Pilih catatan di kiri' : 'Belum ada catatan'}</strong><br><span class="hint">Catatan tersimpan sendiri saat Anda menulis. Mulai dari templat bila perlu.</span></p>
          <button type="button" class="tombol utama" data-aksi="catatan-baru">${ikon('tambah', 16)} Catatan baru</button></section>`}
      </div>`;
  }

  function saringWarnaHtml() {
    return `<div class="saring-warna" role="group" aria-label="Saring menurut warna">
      <button type="button" class="saring-warna-semua" data-aksi="ctt-saring-warna" data-warna="" aria-pressed="${!S.ctt.warna}">Semua</button>
      ${WARNA_UI.slice(1).map(([w, l]) => `<button type="button" class="ctt-warna-titik w-${w}" data-aksi="ctt-saring-warna" data-warna="${w}" aria-pressed="${S.ctt.warna === w}" title="Hanya ${l.toLowerCase()}" aria-label="Saring warna ${l}"></button>`).join('')}
    </div>`;
  }

  /* Disematkan paling atas (dari folder mana pun), lalu per folder; Umum paling akhir. */
  function kelompokCatatan() {
    const kata = S.ctt.q.trim().toLowerCase();
    const isi = catatanSaya().filter(n => (!kata || [n.title, n.body, n.folder].join(' ').toLowerCase().includes(kata))
      && (!S.ctt.warna || n.warna === S.ctt.warna));
    const semat = urutCatatan(isi.filter(n => n.pin));
    const folder = I.kelompokFolder(isi.filter(n => !n.pin)).map(g => ({ kunci: g.folder, judul: g.folder, isi: urutCatatan(g.isi) }));
    return [...(semat.length ? [{ kunci: SEMAT_CTT, judul: 'Disematkan', isi: semat }] : []), ...folder];
  }

  function daftarCatatan() {
    const kartu = modeKartu();
    const grup = kelompokCatatan();
    const cari = !!S.ctt.q.trim();
    if (!grup.length) return `<p class="hint catatan-list-kosong">${cari || S.ctt.warna ? 'Tidak ada catatan yang cocok.' : 'Belum ada catatan. Tekan Catatan baru, atau mulai dari Templat.'}</p>`;
    const ciut = prefCatatan().ciut;
    return grup.map(g => {
      const tutup = !cari && ciut.has(g.kunci);
      const semat = g.kunci === SEMAT_CTT;
      return `<section class="ctt-grup ${tutup ? 'ciut' : ''}">
          <header class="ctt-grup-kepala">
            <button type="button" class="ctt-grup-tombol" data-aksi="ctt-ciut" data-folder="${esc(g.kunci)}" aria-expanded="${!tutup}">
              ${ikon(tutup ? 'kanan' : 'bawah', 14)}${ikon(semat ? 'semat' : 'folder', 14)}<strong>${esc(g.judul)}</strong><small>${g.isi.length}</small>
            </button>
            ${semat ? '' : `<button type="button" class="ikon-tombol ctt-grup-tambah" data-aksi="catatan-baru" data-folder="${esc(g.kunci === I.FOLDER_UMUM ? '' : g.kunci)}" title="Catatan baru di ${esc(g.judul)}" aria-label="Catatan baru di ${esc(g.judul)}">${ikon('tambah', 14)}</button>`}
            ${semat || g.kunci === I.FOLDER_UMUM ? '' : menuLagi(`Menu folder ${g.judul}`, butirFolder('notes', g.kunci))}
          </header>
          ${tutup ? '' : kartu ? `<div class="ctt-kartu-grid">${g.isi.map(kartuCatatan).join('')}</div>` : `<ul class="ctt-isi">${g.isi.map(itemCatatan).join('')}</ul>`}
        </section>`;
    }).join('');
  }

  const progresChecklist = n => {
    const c = I.hitungChecklist(n.body);
    return c.total ? `<span class="ctt-progres ${c.selesai === c.total ? 'beres' : ''}" title="${c.selesai} dari ${c.total} butir selesai">${ikon('centang', 12)} ${c.selesai}/${c.total}</span>` : '';
  };
  function itemCatatan(n) {
    return `<li><button type="button" class="catatan-item ${n.warna ? 'w-' + n.warna : ''} ${S.ctt.pilih === n.id ? 'dipilih' : ''}" data-aksi="catatan-pilih" data-id="${esc(n.id)}">
        <span class="catatan-item-judul">${n.pin ? ikon('semat', 14) : ''}<strong>${esc(judulCatatan(n))}</strong>${progresChecklist(n)}</span>
        <span class="catatan-item-isi">${esc(cuplikCatatan(n)) || '<i>Tidak ada teks lain</i>'}</span>
        <small>${esc(relatif(n.updatedAt))}${n.folder ? ' · ' + esc(n.folder) : ''}</small>
      </button></li>`;
  }
  /* Seperti Keep: catatan tanpa judul tampil isinya saja (baris pertamanya tak diulang sebagai judul). */
  function kartuCatatan(n) {
    return `<button type="button" class="ctt-kartu ${n.warna ? 'w-' + n.warna : ''}" data-aksi="catatan-pilih" data-id="${esc(n.id)}" aria-label="${esc(judulCatatan(n))}">
        ${n.title ? `<span class="ctt-kartu-judul">${n.pin ? ikon('semat', 14) : ''}<strong>${esc(n.title)}</strong></span>` : ''}
        <span class="ctt-kartu-isi">${renderIsiCatatan(n.body, 8) || '<i class="hint">Kosong</i>'}</span>
        <span class="ctt-kartu-kaki">${!n.title && n.pin ? ikon('semat', 12) : ''}${progresChecklist(n)}<small>${esc(relatif(n.updatedAt))}${n.folder ? ' · ' + esc(n.folder) : ''}</small></span>
      </button>`;
  }

  const statusCatatan = n => (n.id === '__baru'
    ? `${ikon('sunting', 16)} Catatan baru: tersimpan begitu Anda mulai menulis`
    : `${ikon('centang', 16)} Tersimpan · ${esc(fmtWaktu(n.updatedAt))}`);
  const aksiCatatan = n => (n.id === '__baru' ? '' : `
    <button type="button" class="ikon-tombol ${n.pin ? 'nyala' : ''}" data-aksi="catatan-semat" aria-pressed="${n.pin}" title="${n.pin ? 'Lepas sematan' : 'Sematkan di atas'}" aria-label="Sematkan catatan">${ikon('semat', 18)}</button>
    <button type="button" class="ikon-tombol" data-aksi="ctt-versi" title="Riwayat versi" aria-label="Riwayat versi catatan">${ikon('riwayat', 18)}</button>
    <button type="button" class="ikon-tombol" data-aksi="catatan-unduh" title="Unduh sebagai .txt" aria-label="Unduh catatan">${ikon('unduh', 18)}</button>
    <button type="button" class="ikon-tombol" data-aksi="catatan-hapus" title="Hapus" aria-label="Hapus catatan">${ikon('hapus', 18)}</button>`);
  const warnaCatatanHtml = n => (n.id === '__baru' ? '' : `<span class="ctt-warna" role="group" aria-label="Warna catatan">${WARNA_UI.map(([w, l]) => `<button type="button" class="ctt-warna-titik w-${w || 'polos'}" data-aksi="ctt-warna" data-warna="${w}" aria-pressed="${(n.warna || '') === w}" title="${l}" aria-label="Warna: ${l}"></button>`).join('')}</span>`);
  /* Toolbar editor: jenis blok untuk blok yang sedang diketik, lalu format teks. Semuanya juga
     lewat "/" (menu blok) dan pintasan markdown. */
  const ALAT_BLOK = [
    ['judul', 'judulH', 'Judul'], ['daftar', 'daftarTitik', 'Daftar titik'], ['nomor', 'daftarNomor', 'Daftar bernomor'],
    ['centang', 'centangKotak', 'Checklist'], ['tabel', 'tabel', 'Tabel'], ['garis', 'kurang', 'Garis pemisah'],
  ];
  const ALAT_FORMAT = [['tebal', 'tebal', 'Tebal (Ctrl+B)'], ['miring', 'miring', 'Miring (Ctrl+I)'], ['tautan', 'tautan', 'Tautan']];
  const hitungTeks = n => {
    const c = I.hitungChecklist(n.body);
    return `${n.body.length} karakter${c.total ? ` · ${c.selesai} dari ${c.total} butir selesai` : ''}`;
  };

  /* Satu tampilan langsung (0.14.0), seperti Notion: menulis, mencentang checklist, dan mengisi
     tabel di tempat yang sama, tanpa mode Baca/Sunting. Isinya diedit per blok (lihat Editor blok
     di bawah); teks catatannya disalin ke #catatan-isi (tersembunyi), yang dibaca saat menyimpan. */
  function editorCatatan(n, folder) {
    mulaiEditor(n);
    return `<section class="catatan-editor kartu-polos rapat ${n.warna ? 'w-' + n.warna : ''}" data-catatan="${esc(n.id)}">
      <div class="editor-kepala">
        ${modeKartu() ? `<button type="button" class="ikon-tombol catatan-kembali" data-aksi="catatan-kembali" title="Tutup (Esc)" aria-label="Tutup catatan">${ikon('tutup', 20)}</button>`
    : `<button type="button" class="ikon-tombol catatan-kembali" data-aksi="catatan-kembali" aria-label="Kembali ke daftar catatan">${ikon('kiri', 20)}</button>`}
        <span id="catatan-status" class="catatan-status">${statusCatatan(n)}</span>
        <span class="spasi"></span>
        <span id="catatan-aksi" class="catatan-aksi">${aksiCatatan(n)}</span>
      </div>
      <div class="editor-isi">
        <input id="catatan-judul" class="catatan-judul" maxlength="200" placeholder="Judul catatan" value="${esc(n.title)}" aria-label="Judul catatan" autocomplete="off">
        <div class="catatan-meta">
          <label class="catatan-folder">${ikon('folder', 14)}<span class="sr">Folder</span><input id="catatan-folder" list="folder-catatan" maxlength="80" placeholder="${I.FOLDER_UMUM}" value="${esc(n.folder)}" autocomplete="off"></label>
          <datalist id="folder-catatan">${folder.map(f => `<option value="${esc(f)}">`).join('')}</datalist>
          ${warnaCatatanHtml(n)}
          ${n.createdAt ? `<small>Dibuat ${esc(fmtWaktu(n.createdAt))}</small>` : ''}
        </div>
        <div class="ctt-toolbar" role="toolbar" aria-label="Jenis blok dan format">
          ${ALAT_BLOK.map(([j, ik, t]) => `<button type="button" class="ikon-tombol" data-aksi="ctt-format" data-jenis="${j}" title="${t}" aria-label="${t}">${ikon(ik, 16)}</button>`).join('')}
          <span class="ctt-toolbar-garis" aria-hidden="true"></span>
          ${ALAT_FORMAT.map(([j, ik, t]) => `<button type="button" class="ikon-tombol" data-aksi="ctt-format" data-jenis="${j}" title="${t}" aria-label="${t}">${ikon(ik, 16)}</button>`).join('')}
          <span class="ctt-toolbar-pisah"></span>
          <button type="button" class="tombol kecil" data-aksi="ctt-task" title="Jadikan task dari blok yang sedang diketik">${ikon('tugas', 14)} Jadikan task</button>
        </div>
        <div class="ne ${kosongSemua() ? 'kosong' : ''}" data-ne>${htmlSemuaBlok()}</div>
        <div class="ne-menu" id="ne-menu" role="listbox" aria-label="Pilih jenis blok" hidden></div>
        <textarea id="catatan-isi" hidden aria-hidden="true" tabindex="-1">${esc(n.body)}</textarea>
      </div>
      <div class="editor-kaki"><span id="catatan-hitung">${hitungTeks(n)}</span><span>Ketik / untuk judul, checklist, atau tabel · Ctrl+S menyimpan seketika</span></div>
    </section>`;
  }

  /* Pratinjau kartu (tampilan Keep): blok-blok dibaca saja. batas = jumlah baris paling banyak. */
  function renderIsiCatatan(isi, batas = 0) {
    const teks = String(isi || '');
    if (!teks.trim()) return '';
    const blok = I.blokCatatan(teks);
    const nomor = I.nomorDaftar(blok);
    let sisa = batas || Infinity;
    const keluar = [];
    let i = 0;
    for (; i < blok.length && sisa > 0; i++) {
      const b = blok[i];
      const gaya = b.tingkat ? ` style="--tingkat:${b.tingkat}"` : '';
      const isiTeks = formatPratinjau(b.teks) || '&nbsp;';
      if (b.jenis === 'tabel') {
        const baris = b.sel.slice(0, Math.max(1, sisa));
        sisa -= baris.length;
        keluar.push(`<table class="ctt-tabel-kecil"><tbody>${baris.map((r, k) => {
          const t = k === 0 && b.kepala ? 'th' : 'td';
          return `<tr>${r.map(x => `<${t}>${formatPratinjau(x)}</${t}>`).join('')}</tr>`;
        }).join('')}</tbody></table>`);
        continue;
      }
      sisa--;
      if (b.jenis === 'hr') keluar.push('<hr class="ctt-garis">');
      else if (b.jenis === 'todo') keluar.push(`<div class="ctt-baris cek ${b.cek ? 'sudah' : ''}"${gaya}><span class="ctt-cek ${b.cek ? 'sudah' : ''}">${b.cek ? ikon('centang', 12) : ''}</span><span class="ctt-teks">${isiTeks}</span></div>`);
      else if (/^h[123]$/.test(b.jenis)) keluar.push(`<div class="ctt-baris judul j${b.jenis[1]}"><span class="ctt-teks">${isiTeks}</span></div>`);
      else if (b.jenis === 'li') keluar.push(`<div class="ctt-baris titik"${gaya}><span class="ctt-titik" aria-hidden="true"></span><span class="ctt-teks">${isiTeks}</span></div>`);
      else if (b.jenis === 'ol') keluar.push(`<div class="ctt-baris nomor"${gaya}><span class="ctt-nomor">${nomor[i]}.</span><span class="ctt-teks">${isiTeks}</span></div>`);
      else if (b.jenis === 'kutip') keluar.push(`<div class="ctt-baris kutip"><span class="ctt-teks">${isiTeks}</span></div>`);
      else keluar.push(b.teks.trim() ? `<div class="ctt-baris"><span class="ctt-teks">${isiTeks}</span></div>` : '<div class="ctt-baris kosong"></div>');
    }
    return keluar.join('') + (i < blok.length ? '<div class="ctt-baris lagi">…</div>' : '');
  }
  /* Format ringan + "→ PRD-…" (baris yang sudah dijadikan task) menjadi tombol pembuka task. */
  const formatCatatan = s => formatPesan(s).replace(/→ (PRD-\d+)/g, '→ <button type="button" class="ctt-rujuk-task" data-aksi="buka-task" data-id="$1">$1</button>');
  /* Di dalam kartu (yang sendirinya tombol) tak boleh ada tombol atau tautan lain. */
  const formatPratinjau = s => formatPesan(s).replace(/<a [^>]*>/g, '<span class="ctt-tautan">').replace(/<\/a>/g, '</span>')
    .replace(/→ (PRD-\d+)/g, '→ <span class="ctt-rujuk-task">$1</span>');

  /* ----- Editor blok (0.14.0) -----
     Tiap blok (paragraf, judul, butir daftar, checklist, kutipan) adalah satu kotak teks
     contenteditable; tabel punya satu kotak per sel; garis pemisah bisa dipilih lalu dihapus.
     Modelnya (ED.blok) dibaca dan ditulis lewat Inti.blokCatatan/teksBlok, jadi yang tersimpan
     tetap teks biasa. Blok yang sedang diketik menampilkan teks mentahnya (**tebal**,
     [tautan](…)); blok lain menampilkan hasil formatnya, dengan tautan dan nomor task yang bisa
     diklik. Enter, Backspace, panah, Tab, menu "/", pintasan markdown ("# ", "- ", "[] ", "1. ",
     "> ", "---"), tempel beberapa baris atau sel dari spreadsheet, dan urungkan (Ctrl+Z) diatur
     di sini. Perubahan struktur menggambar ulang semua blok lalu mengembalikan kursornya. */

  const ED = { id: null, teks: '', blok: [], riwayat: [], ke: 0, tundaRiwayat: null, slash: null, fokus: null, kursorAkhir: null };
  const MAKS_KOLOM = 20;
  const KOSONG_PH = 'Tulis sesuatu, atau ketik / untuk judul, checklist, tabel…';
  /* [jenis, label, ikon, kata kunci pencarian, keterangan] — urutan menu "/". */
  const MENU_BLOK = [
    ['p', 'Teks', 'teks', 'teks paragraf biasa', 'Paragraf biasa'],
    ['h1', 'Judul 1', 'judulH', 'judul heading h1 besar', 'Judul bagian besar'],
    ['h2', 'Judul 2', 'judulH', 'judul heading h2 sedang', 'Judul bagian sedang'],
    ['h3', 'Judul 3', 'judulH', 'judul heading h3 kecil', 'Judul bagian kecil'],
    ['todo', 'Checklist', 'centangKotak', 'checklist ceklis centang todo tugas kotak', 'Butir yang bisa dicentang'],
    ['li', 'Daftar titik', 'daftarTitik', 'daftar titik bullet list butir', 'Daftar berbutir'],
    ['ol', 'Daftar bernomor', 'daftarNomor', 'daftar nomor angka numbered urut', 'Daftar 1, 2, 3'],
    ['tabel', 'Tabel', 'tabel', 'tabel table kolom baris', 'Baris dan kolom yang bisa diisi'],
    ['kutip', 'Kutipan', 'kutip', 'kutipan quote sorot', 'Teks yang disorot'],
    ['hr', 'Garis pemisah', 'kurang', 'garis pemisah divider pembatas', 'Pembatas antarbagian'],
  ];
  const PH_BLOK = { p: 'Ketik / untuk pilihan blok', h1: 'Judul 1', h2: 'Judul 2', h3: 'Judul 3', li: 'Daftar', ol: 'Daftar', todo: 'Tugas', kutip: 'Kutipan' };
  const LABEL_BLOK = Object.fromEntries(MENU_BLOK.map(([j, l]) => [j, l]));

  /* Catatan yang sama digambar ulang (mis. ganti warna): riwayat urungkan tetap. */
  function mulaiEditor(n) {
    const lanjut = ED.teks === n.body && (ED.id === n.id || ED.id === '__baru');
    ED.id = n.id;
    ED.blok = I.blokCatatan(n.body);
    ED.teks = n.body;
    ED.slash = null;
    if (!lanjut) Object.assign(ED, { riwayat: [{ teks: n.body, fokus: null }], ke: 0, fokus: null, kursorAkhir: null });
  }
  const kosongSemua = () => ED.blok.length === 1 && ED.blok[0].jenis === 'p' && !ED.blok[0].teks;

  /* --- Menggambar --- */

  function htmlSemuaBlok() {
    const { baris } = I.teksBlokDanBaris(ED.blok);
    const nomor = I.nomorDaftar(ED.blok);
    const kosong = kosongSemua();
    return ED.blok.map((b, i) => htmlBlok(b, i, baris[i], nomor[i], kosong)).join('')
      + '<div class="ne-bawah" data-aksi="ne-bawah" aria-hidden="true"></div>';
  }
  /* Teks blok yang tak sedang diketik: format ringan; tautan dan tombol task tetap bisa diklik. */
  const tampilTeks = teks => formatCatatan(teks).replace(/<(a|button) /g, '<$1 contenteditable="false" ');
  function kotakTeks(teks, atribut, kelas = '') {
    const f = tampilTeks(teks);
    return `<div class="ne-teks${kelas}" contenteditable="true" spellcheck="true" data-tampil="${f !== esc(teks) ? 'format' : 'mentah'}" ${atribut}>${f}</div>`;
  }
  function htmlBlok(b, i, baris, nomor, kosong) {
    if (b.jenis === 'hr') return `<div class="ne-blok ne-hr" data-i="${i}" tabindex="0" role="separator" aria-label="Garis pemisah. Backspace untuk menghapus."><hr></div>`;
    if (b.jenis === 'tabel') return htmlTabel(b, i);
    const judul = I.teksBarisCatatan(b.teks, 0);
    const task = ['p', 'li', 'ol', 'todo', 'kutip'].includes(b.jenis) && judul && !/→\s*PRD-\d+\s*$/.test(b.teks)
      ? `<button type="button" class="ctt-jadi-task" data-aksi="ctt-task" data-baris="${baris}" tabindex="-1" title="Jadikan task" aria-label="Jadikan task: ${esc(potong(judul, 60))}">${ikon('tugas', 14)}</button>` : '';
    const depan = b.jenis === 'todo'
      ? `<button type="button" class="ctt-cek ne-cek ${b.cek ? 'sudah' : ''}" data-aksi="ne-cek" role="checkbox" aria-checked="${!!b.cek}" tabindex="-1" aria-label="Tandai selesai">${b.cek ? ikon('centang', 12) : ''}</button>`
      : b.jenis === 'li' ? '<span class="ctt-titik ne-titik" aria-hidden="true"></span>'
        : b.jenis === 'ol' ? `<span class="ne-nomor" aria-hidden="true">${nomor}.</span>` : '';
    const ph = kosong ? KOSONG_PH : PH_BLOK[b.jenis] || '';
    return `<div class="ne-blok ne-${b.jenis}${b.jenis === 'todo' && b.cek ? ' sudah' : ''}" data-i="${i}" data-baris="${baris}"${b.tingkat ? ` style="--tingkat:${b.tingkat}"` : ''}>${depan}${kotakTeks(b.teks, `data-ph="${esc(ph)}" role="textbox" aria-label="${esc(LABEL_BLOK[b.jenis] || 'Teks')}"`)}${task}</div>`;
  }
  function htmlTabel(b, i) {
    const kolom = Math.max(1, ...b.sel.map(r => r.length));
    const sel = (teks, r, c) => {
      const t = r === 0 && b.kepala ? 'th' : 'td';
      return `<${t}>${kotakTeks(teks, `data-r="${r}" data-c="${c}" role="textbox" aria-label="Sel baris ${r + 1}, kolom ${c + 1}"`, ' ne-sel')}</${t}>`;
    };
    return `<div class="ne-blok ne-tabel" data-i="${i}">
      <div class="ne-tabel-gulir"><table><tbody>${b.sel.map((r, ri) => `<tr>${Array.from({ length: kolom }, (_, ci) => sel(r[ci] || '', ri, ci)).join('')}</tr>`).join('')}</tbody></table></div>
      <div class="ne-tabel-alat" role="toolbar" aria-label="Atur tabel">
        <button type="button" class="tombol kecil" data-aksi="ne-tabel" data-op="baris" title="Tambah baris di bawah sel yang dipilih">${ikon('tambah', 14)} Baris</button>
        <button type="button" class="tombol kecil" data-aksi="ne-tabel" data-op="kolom" title="Tambah kolom di kanan sel yang dipilih">${ikon('tambah', 14)} Kolom</button>
        <button type="button" class="tombol kecil" data-aksi="ne-tabel" data-op="hapus-baris" title="Hapus baris sel yang dipilih">${ikon('kurang', 14)} Baris</button>
        <button type="button" class="tombol kecil" data-aksi="ne-tabel" data-op="hapus-kolom" title="Hapus kolom sel yang dipilih">${ikon('kurang', 14)} Kolom</button>
        <button type="button" class="tombol kecil bahaya" data-aksi="ne-tabel" data-op="hapus" title="Hapus seluruh tabel">${ikon('hapus', 14)} Tabel</button>
      </div></div>`;
  }

  /* --- Elemen, kursor, dan model --- */

  const akarEditor = () => $('.ne[data-ne]');
  const elBlok = i => { const a = akarEditor(); return a ? a.querySelector(`:scope > [data-i="${i}"]`) : null; };
  const elFokus = () => { const a = document.activeElement; return a && a.classList && a.classList.contains('ne-teks') && a.closest('.ne[data-ne]') ? a : null; };
  function posisiEl(el) {
    const p = { i: Number(el.closest('[data-i]').dataset.i) };
    if (el.classList.contains('ne-sel')) Object.assign(p, { r: Number(el.dataset.r), c: Number(el.dataset.c) });
    return p;
  }
  const bacaTeks = el => el.textContent.replace(/ /g, ' ').replace(/[\r\n]+/g, ' ');
  function teksPosisi(p) {
    const b = ED.blok[p.i];
    if (!b) return '';
    return p.r === undefined ? b.teks || '' : (b.sel[p.r] || [])[p.c] || '';
  }
  function aturTeksPosisi(p, teks) {
    const b = ED.blok[p.i];
    if (!b) return;
    if (p.r === undefined) b.teks = teks; else b.sel[p.r][p.c] = teks;
  }
  function rentangKursor(el) {
    const sel = getSelection();
    if (!sel.rangeCount) return [0, 0];
    const r = sel.getRangeAt(0);
    if (!el.contains(r.startContainer) || !el.contains(r.endContainer)) { const n = bacaTeks(el).length; return [n, n]; }
    const ukur = (node, off) => { const p = document.createRange(); p.selectNodeContents(el); p.setEnd(node, off); return p.toString().length; };
    return [ukur(r.startContainer, r.startOffset), ukur(r.endContainer, r.endOffset)];
  }
  function aturKursor(el, a, b = a) {
    const cari = n => {
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let sisa = n, t;
      while ((t = w.nextNode())) { if (sisa <= t.length) return [t, sisa]; sisa -= t.length; }
      return [el, el.childNodes.length];
    };
    const r = document.createRange();
    r.setStart(...cari(a));
    r.setEnd(...cari(b));
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
  }
  function tampilMentah(el) {
    if (el.dataset.tampil !== 'format') return;
    el.textContent = teksPosisi(posisiEl(el));
    el.dataset.tampil = 'mentah';
  }
  /* Posisi di teks yang tampil (berformat) → posisi yang sama di teks mentahnya: tanda **, _, ~~,
     `, dan [label](alamat) dilewati (polanya sama dengan formatPesan). */
  function offsetMentah(mentah, tampil) {
    const pola = new RegExp(POLA_FORMAT.source, 'g');
    let i = 0, v = 0, m;
    while ((m = pola.exec(mentah))) {
      const g = m.groups;
      let pra = '', isi, awal;
      if (g.kode !== undefined) { isi = g.kode; awal = m.index + 1; }
      else if (g.tebal !== undefined) { isi = g.tebal; awal = m.index + 2; }
      else if (g.coret !== undefined) { isi = g.coret; awal = m.index + 2; }
      else if (g.label !== undefined) { isi = g.label; awal = m.index + 1; }
      else if (g.miring !== undefined) { pra = g.pra; isi = g.miring; awal = m.index + pra.length + 1; }
      else continue;   // tautan polos dan @sebutan tampil apa adanya
      const biasa = m.index - i + pra.length;
      if (tampil <= v + biasa) return i + (tampil - v);
      v += biasa;
      if (tampil <= v + isi.length) return awal + (tampil - v);
      v += isi.length;
      i = m.index + m[0].length;
    }
    return Math.min(mentah.length, i + (tampil - v));
  }
  /* Blok berformat yang akan diketik: ganti ke teks mentah, kursornya tetap di tempat yang sama. */
  function keMentah(el) {
    if (el.dataset.tampil !== 'format') return;
    const sel = getSelection();
    const di = sel.rangeCount && el.contains(sel.getRangeAt(0).startContainer);
    const [a, z] = di ? rentangKursor(el) : [Infinity, Infinity];
    const mentah = teksPosisi(posisiEl(el));
    tampilMentah(el);
    aturKursor(el, offsetMentah(mentah, a), offsetMentah(mentah, z));
  }
  function tampilFormat(el) {
    const teks = teksPosisi(posisiEl(el));
    const f = tampilTeks(teks);
    el.dataset.tampil = f !== esc(teks) ? 'format' : 'mentah';
    if (f !== esc(teks)) el.innerHTML = f;
    else if (!teks && el.innerHTML) el.innerHTML = '';
  }

  /* Model → teks catatan (#catatan-isi) → simpan otomatis seperti biasa. */
  function selaraskan() {
    const akar = akarEditor();
    if (akar) akar.classList.toggle('kosong', kosongSemua());
    const teks = I.teksBlok(ED.blok);
    if (teks === ED.teks) return;
    ED.teks = teks;
    const ta = $('#catatan-isi');
    if (ta) ta.value = teks;
    catatanBerubah();
    jadwalRiwayat();
  }
  function gambarBlok(fokus) {
    const akar = akarEditor();
    if (!akar) return;
    tutupMenuBlok();
    if (!ED.blok.length) ED.blok.push({ jenis: 'p', teks: '' });
    akar.innerHTML = htmlSemuaBlok();
    selaraskan();
    if (fokus) fokusKe(fokus);
  }
  /* f = { i, r?, c?, offset?, sampai?, akhir?, x?, bawah? } */
  function fokusKe(f) {
    const blok = elBlok(f.i);
    if (!blok) return;
    if (blok.classList.contains('ne-hr')) { blok.focus(); return; }
    let el = blok.querySelector(':scope > .ne-teks');
    if (blok.classList.contains('ne-tabel')) {
      const b = ED.blok[f.i];
      const r = f.r === undefined ? (f.bawah ? b.sel.length - 1 : 0) : f.r;
      el = blok.querySelector(`.ne-sel[data-r="${r}"][data-c="${f.c || 0}"]`) || blok.querySelector('.ne-sel');
    }
    if (!el) return;
    tampilMentah(el);
    el.focus();
    ED.fokus = posisiEl(el);
    const n = bacaTeks(el).length;
    if (f.x != null && letakkanDiX(el, f.x, f.bawah)) return;
    const a = f.akhir ? n : Math.min(f.offset || 0, n);
    aturKursor(el, a, f.sampai == null ? a : Math.min(f.sampai, n));
  }
  /* Panah atas/bawah: kursor tetap di kolom yang sama, di baris terakhir/pertama blok tujuan. */
  function letakkanDiX(el, x, bawah) {
    const k = el.getBoundingClientRect();
    return letakkanDiTitik(el, x, bawah ? k.bottom - 6 : k.top + 6);
  }
  function letakkanDiTitik(el, x, y) {
    let r = null;
    if (document.caretRangeFromPoint) r = document.caretRangeFromPoint(x, y);
    else if (document.caretPositionFromPoint) {
      const p = document.caretPositionFromPoint(x, y);
      if (p) { r = document.createRange(); r.setStart(p.offsetNode, p.offset); }
    }
    if (!r || !el.contains(r.startContainer)) return false;
    r.collapse(true);
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
    return true;
  }
  function xKursor() {
    const sel = getSelection();
    if (!sel.rangeCount) return null;
    const r = sel.getRangeAt(0).cloneRange();
    r.collapse(true);
    const k = r.getClientRects()[0];
    return k ? k.left : null;
  }
  /* Kursor di baris pertama (atas) atau terakhir (bawah) blok yang bisa terlipat beberapa baris. */
  function diTepi(el, atas) {
    const sel = getSelection();
    if (!sel.rangeCount) return true;
    const r = sel.getRangeAt(0).cloneRange();
    r.collapse(atas);
    const k = r.getClientRects()[0];
    if (!k) { const [a] = rentangKursor(el); return atas ? a === 0 : a >= bacaTeks(el).length; }
    const kotak = el.getBoundingClientRect();
    const garis = parseFloat(getComputedStyle(el).lineHeight) || 22;
    return atas ? k.top - kotak.top < garis * 0.75 : kotak.bottom - k.bottom < garis * 0.75;
  }
  function bentukBlok(jenis, lama = { teks: '' }) {
    const teks = lama.teks || '';
    const tingkat = ['li', 'ol', 'todo'].includes(lama.jenis) ? lama.tingkat || 0 : 0;
    if (jenis === 'todo') return { jenis, teks, tingkat, cek: false, titik: false };
    if (jenis === 'li') return { jenis, teks, tingkat, tanda: '-' };
    if (jenis === 'ol') return { jenis, teks, tingkat, nomor: 1 };
    return { jenis, teks };
  }

  /* --- Urungkan (Ctrl+Z) dan ulangi (Ctrl+Y / Ctrl+Shift+Z) ---
     Riwayat teks utuh: dicatat sesudah berhenti mengetik dan sebelum setiap perubahan struktur. */
  function kursorKini() {
    const el = elFokus();
    return el ? { ...posisiEl(el), offset: rentangKursor(el)[0] } : ED.fokus;
  }
  function jadwalRiwayat() {
    clearTimeout(ED.tundaRiwayat);
    ED.tundaRiwayat = setTimeout(catatRiwayatSekarang, 600);
  }
  function catatRiwayatSekarang() {
    clearTimeout(ED.tundaRiwayat);
    ED.tundaRiwayat = null;
    const teks = I.teksBlok(ED.blok);
    if (ED.riwayat[ED.ke] && ED.riwayat[ED.ke].teks === teks) return;
    ED.riwayat = ED.riwayat.slice(0, ED.ke + 1);
    ED.riwayat.push({ teks, fokus: kursorKini() });
    if (ED.riwayat.length > 100) ED.riwayat.shift();
    ED.ke = ED.riwayat.length - 1;
  }
  function undoEditor(arah) {
    catatRiwayatSekarang();
    const ke = ED.ke + arah;
    if (ke < 0 || ke >= ED.riwayat.length) return;
    ED.ke = ke;
    const s = ED.riwayat[ke];
    ED.blok = I.blokCatatan(s.teks);
    gambarBlok(s.fokus && ED.blok[s.fokus.i] ? s.fokus : { i: ED.blok.length - 1, akhir: true });
  }

  /* --- Mengetik --- */

  function inputBlok(el, e) {
    const p = posisiEl(el);
    const b = ED.blok[p.i];
    if (!b) return;
    const teks = bacaTeks(el);
    if (!teks && el.innerHTML && !e.isComposing) el.innerHTML = '';   // sisa <br> dari peramban: petunjuknya tampil lagi
    el.dataset.tampil = 'mentah';
    if (p.r !== undefined) { b.sel[p.r][p.c] = teks; return selaraskan(); }
    b.teks = teks;
    // Pintasan markdown di awal paragraf: "# ", "## ", "- ", "1. ", "[] ", "[x] ", "> ", "---".
    if (b.jenis === 'p' && !e.isComposing) {
      const tugas = /^[-*]\s\[([ xX]?)\]\s/.exec(teks);
      if (tugas) return jadiCeklis(el, p.i, b, teks, tugas);
      const m = /^(#{1,3}|[-*]|\d{1,3}[.)]|\[[ xX]?\]|>)\s/.exec(teks);
      if (m) return pintasan(el, p.i, m[1], m[0].length);
      if (teks === '---') { catatRiwayatSekarang(); ED.blok[p.i] = { jenis: 'p', teks: '' }; return sisipkanKhusus(p.i, 'hr'); }
    }
    // Diketik satu per satu, "- " lebih dulu menjadikannya butir daftar; kotak sesudahnya tetap checklist.
    if (b.jenis === 'li' && !e.isComposing) {
      const tugas = /^\[([ xX]?)\]\s/.exec(teks);
      if (tugas) return jadiCeklis(el, p.i, b, teks, tugas);
    }
    const [a] = rentangKursor(el);
    if (ED.slash) perbaruiMenuBlok(el);
    else if (/^insert/.test(e.inputType || 'insert') && String(e.data == null ? '/' : e.data).includes('/')) {
      // "/" di awal kata membuka menu blok (juga bila papan ketik menyisipkan "/kata" sekaligus).
      const awal = teks.lastIndexOf('/', a - 1);
      if (awal >= 0 && (awal === 0 || /\s/.test(teks[awal - 1])) && /^[^\s/]{0,20}$/.test(teks.slice(awal + 1, a))) {
        bukaMenuBlok(el, awal);
        perbaruiMenuBlok(el);
      }
    }
    selaraskan();
  }
  /* "- [ ] " gaya GitHub → checklist, sama dengan cara teksnya dibaca ulang (blokCatatan): tingkat
     dan "- "-nya tetap. */
  function jadiCeklis(el, i, b, teks, m) {
    const [a] = rentangKursor(el);
    catatRiwayatSekarang();
    ED.blok[i] = { jenis: 'todo', teks: teks.slice(m[0].length), tingkat: b.tingkat || 0, cek: /x/i.test(m[1]), titik: true };
    gambarBlok({ i, offset: Math.max(0, a - m[0].length) });
  }
  function pintasan(el, i, tanda, panjang) {
    const [a] = rentangKursor(el);
    const jenis = tanda[0] === '#' ? 'h' + tanda.length : /^[-*]$/.test(tanda) ? 'li' : /^\d/.test(tanda) ? 'ol' : tanda === '>' ? 'kutip' : 'todo';
    catatRiwayatSekarang();
    const baru = bentukBlok(jenis, { teks: ED.blok[i].teks.slice(panjang) });
    if (jenis === 'todo') baru.cek = /x/i.test(tanda);
    if (jenis === 'ol') baru.nomor = parseInt(tanda, 10) || 1;
    if (jenis === 'li') baru.tanda = tanda;
    ED.blok[i] = baru;
    gambarBlok({ i, offset: Math.max(0, a - panjang) });
  }
  /* Enter: blok dipecah di kursor. Daftar dan checklist berlanjut dengan butir baru; butir kosong
     keluar dari daftar (atau naik satu tingkat). Di tabel: turun satu sel, baris baru di akhir. */
  function enterBlok(el) {
    if (ED.slash) return pakaiMenuBlok();
    const p = posisiEl(el);
    const b = ED.blok[p.i];
    if (!b) return;
    catatRiwayatSekarang();
    if (p.r !== undefined) {
      if (p.r + 1 >= b.sel.length) b.sel.push(Array(b.sel[0].length).fill(''));
      return gambarBlok({ i: p.i, r: p.r + 1, c: p.c, akhir: true });
    }
    const [a, z] = rentangKursor(el);
    const teks = bacaTeks(el);
    const daftar = ['li', 'ol', 'todo', 'kutip'].includes(b.jenis);
    if (daftar && !teks.trim()) {
      if (b.tingkat) b.tingkat--; else ED.blok[p.i] = { jenis: 'p', teks: '' };
      return gambarBlok({ i: p.i });
    }
    const lanjut = daftar && b.jenis !== 'kutip' ? { ...bentukBlok(b.jenis, b), ...(b.jenis === 'li' ? { tanda: b.tanda } : {}), ...(b.jenis === 'todo' ? { titik: b.titik } : {}) } : { jenis: 'p' };
    if (a === 0 && z === 0 && teks) {
      ED.blok.splice(p.i, 0, { ...lanjut, teks: '' });
      return gambarBlok({ i: p.i + 1, offset: 0 });
    }
    b.teks = teks.slice(0, a);
    ED.blok.splice(p.i + 1, 0, { ...lanjut, teks: teks.slice(z) });
    gambarBlok({ i: p.i + 1, offset: 0 });
  }
  /* Backspace di awal blok: judul/daftar jadi paragraf (butir menjorok naik dulu); paragraf
     menyatu dengan blok di atasnya; garis pemisah di atasnya terhapus. */
  function hapusDiAwal(el) {
    const p = posisiEl(el);
    const b = ED.blok[p.i];
    if (!b) return;
    if (p.r !== undefined) {
      if (p.r || p.c) return pindahSel(p, -1, false);
      if (b.sel.every(r => r.every(x => !String(x).trim()))) {
        catatRiwayatSekarang();
        ED.blok.splice(p.i, 1);
        return gambarBlok(p.i > 0 ? { i: p.i - 1, akhir: true } : { i: 0 });
      }
      return pindahBlok(p.i, -1, null, true);
    }
    catatRiwayatSekarang();
    if (b.jenis !== 'p') {
      if (b.tingkat) b.tingkat--; else ED.blok[p.i] = { jenis: 'p', teks: b.teks };
      return gambarBlok({ i: p.i, offset: 0 });
    }
    const lalu = ED.blok[p.i - 1];
    if (!lalu) return;
    if (lalu.jenis === 'hr') { ED.blok.splice(p.i - 1, 1); return gambarBlok({ i: p.i - 1, offset: 0 }); }
    if (lalu.jenis === 'tabel') {
      if (!b.teks) ED.blok.splice(p.i, 1);
      const r = lalu.sel.length - 1;
      return gambarBlok({ i: p.i - 1, r, c: lalu.sel[r].length - 1, akhir: true });
    }
    const pos = (lalu.teks || '').length;
    lalu.teks = (lalu.teks || '') + b.teks;
    ED.blok.splice(p.i, 1);
    gambarBlok({ i: p.i - 1, offset: pos });
  }
  /* Delete di akhir blok: blok berikutnya (teks) naik dan menyatu. */
  function hapusDiAkhir(el) {
    const p = posisiEl(el);
    if (p.r !== undefined) return;
    const b = ED.blok[p.i], lanjut = ED.blok[p.i + 1];
    if (!b || !lanjut || lanjut.jenis === 'tabel') return;
    catatRiwayatSekarang();
    if (lanjut.jenis === 'hr') { ED.blok.splice(p.i + 1, 1); return gambarBlok({ i: p.i, akhir: true }); }
    const pos = b.teks.length;
    b.teks += lanjut.teks || '';
    ED.blok.splice(p.i + 1, 1);
    gambarBlok({ i: p.i, offset: pos });
  }
  function hapusGaris(i, arah) {
    catatRiwayatSekarang();
    ED.blok.splice(i, 1);
    if (!ED.blok.length) ED.blok.push({ jenis: 'p', teks: '' });
    gambarBlok(arah < 0 && i > 0 ? { i: i - 1, akhir: true } : { i: Math.min(i, ED.blok.length - 1) });
  }
  function indentasi(i, d) {
    const b = ED.blok[i];
    const t = Math.max(0, Math.min(3, (b.tingkat || 0) + d));
    if (t === (b.tingkat || 0)) return;
    const el = elFokus();
    const offset = el ? rentangKursor(el)[0] : 0;
    catatRiwayatSekarang();
    b.tingkat = t;
    gambarBlok({ i, offset });
  }

  /* --- Berpindah blok dan sel --- */

  function pindahBlok(i, arah, x = null, akhir = arah < 0) {
    const j = i + arah;
    if (j < 0) {
      const judul = $('#catatan-judul');
      if (judul) { judul.focus(); judul.setSelectionRange(judul.value.length, judul.value.length); }
      return;
    }
    const b = ED.blok[j];
    if (!b) return;
    if (b.jenis === 'tabel') {
      const r = arah < 0 ? b.sel.length - 1 : 0;
      return fokusKe({ i: j, r, c: kolomDiX(j, r, x), akhir });
    }
    fokusKe({ i: j, x, bawah: arah < 0, akhir });
  }
  function kolomDiX(i, r, x) {
    const sel = $$(`.ne-sel[data-r="${r}"]`, elBlok(i));
    if (x == null || !sel.length) return 0;
    const k = sel.findIndex(el => { const kotak = el.closest('td, th').getBoundingClientRect(); return x >= kotak.left && x <= kotak.right; });
    return k >= 0 ? k : x < sel[0].getBoundingClientRect().left ? 0 : sel.length - 1;
  }
  /* Kiri/kanan (dan Tab) antarsel; Tab di sel terakhir menambah baris. */
  function pindahSel(p, arah, tab) {
    const b = ED.blok[p.i];
    const kolom = b.sel[0].length;
    let r = p.r, c = p.c + arah;
    if (c >= kolom) { c = 0; r++; }
    if (c < 0) { c = kolom - 1; r--; }
    if (r < 0) return tab ? undefined : pindahBlok(p.i, -1, null, true);
    if (r >= b.sel.length) {
      if (!tab) return pindahBlok(p.i, 1, null, false);
      catatRiwayatSekarang();
      b.sel.push(Array(kolom).fill(''));
      return gambarBlok({ i: p.i, r, c: 0 });
    }
    fokusKe({ i: p.i, r, c, akhir: arah < 0 || tab });
  }
  function pindahSelVertikal(p, arah, x) {
    const b = ED.blok[p.i];
    const r = p.r + arah;
    if (r < 0 || r >= b.sel.length) return pindahBlok(p.i, arah, x);
    fokusKe({ i: p.i, r, c: p.c, x, bawah: arah < 0, akhir: arah < 0 });
  }

  /* --- Tombol (selain Enter/Backspace, yang lewat beforeinput) --- */

  function tombolEditor(e) {
    const el = e.target.closest('.ne-teks');
    const garis = e.target.closest('.ne-hr');
    const k = e.key;
    if (el) keMentah(el);
    if (ED.slash && el) {
      if (k === 'ArrowDown' || k === 'ArrowUp') { e.preventDefault(); geserMenuBlok(k === 'ArrowDown' ? 1 : -1); return true; }
      if (k === 'Enter' || k === 'Tab') { e.preventDefault(); pakaiMenuBlok(); return true; }
      if (k === 'Escape') { e.preventDefault(); tutupMenuBlok(); return true; }
    }
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      const t = String(k).toLowerCase();
      if (t === 'z') { e.preventDefault(); undoEditor(e.shiftKey ? 1 : -1); return true; }
      if (t === 'y') { e.preventDefault(); undoEditor(1); return true; }
      if (el && (t === 'b' || t === 'i')) { e.preventDefault(); bungkusPilihan(t === 'b' ? '**' : '_'); return true; }
      if (el && t === 'u') { e.preventDefault(); return true; }
      return false;
    }
    if (garis) {
      const i = Number(garis.dataset.i);
      if (k === 'Backspace' || k === 'Delete') { e.preventDefault(); hapusGaris(i, k === 'Backspace' ? -1 : 1); return true; }
      if (k === 'Enter') { e.preventDefault(); catatRiwayatSekarang(); ED.blok.splice(i + 1, 0, { jenis: 'p', teks: '' }); gambarBlok({ i: i + 1 }); return true; }
      if (k === 'ArrowUp' || k === 'ArrowLeft') { e.preventDefault(); pindahBlok(i, -1); return true; }
      if (k === 'ArrowDown' || k === 'ArrowRight') { e.preventDefault(); pindahBlok(i, 1); return true; }
      return false;
    }
    if (!el || e.isComposing) return false;
    const p = posisiEl(el);
    const b = ED.blok[p.i];
    if (!b) return false;
    if (k === 'Tab') {
      if (p.r !== undefined) { e.preventDefault(); pindahSel(p, e.shiftKey ? -1 : 1, true); return true; }
      if (['li', 'ol', 'todo'].includes(b.jenis)) { e.preventDefault(); indentasi(p.i, e.shiftKey ? -1 : 1); return true; }
      return false;
    }
    if ((k === 'ArrowUp' || k === 'ArrowDown') && !e.shiftKey && !e.altKey) {
      const atas = k === 'ArrowUp';
      if (!diTepi(el, atas)) return false;
      e.preventDefault();
      const x = xKursor();
      if (p.r !== undefined) pindahSelVertikal(p, atas ? -1 : 1, x); else pindahBlok(p.i, atas ? -1 : 1, x);
      return true;
    }
    if ((k === 'ArrowLeft' || k === 'ArrowRight') && !e.shiftKey && !e.altKey) {
      const [a, z] = rentangKursor(el);
      if (a !== z) return false;
      if (k === 'ArrowLeft' && a === 0) { e.preventDefault(); if (p.r !== undefined) pindahSel(p, -1, false); else pindahBlok(p.i, -1, null, true); return true; }
      if (k === 'ArrowRight' && a === bacaTeks(el).length) { e.preventDefault(); if (p.r !== undefined) pindahSel(p, 1, false); else pindahBlok(p.i, 1, null, false); return true; }
    }
    return false;
  }

  /* --- Menu "/" --- */

  function bukaMenuBlok(el, posisi) {
    if (el.classList.contains('ne-sel')) return;
    ED.slash = { el, posisi, q: '', pilih: 0, calon: MENU_BLOK };
    gambarMenuBlok();
  }
  function perbaruiMenuBlok(el) {
    const s = ED.slash;
    if (!s) return;
    if (s.el !== el) return tutupMenuBlok();
    const teks = bacaTeks(el);
    const [a] = rentangKursor(el);
    if (teks[s.posisi] !== '/' || a <= s.posisi) return tutupMenuBlok();
    const q = teks.slice(s.posisi + 1, a);
    if (q.length > 20 || /^\s|\s\s/.test(q)) return tutupMenuBlok();
    const k = q.toLowerCase().trim();
    s.q = q;
    s.calon = MENU_BLOK.filter(([, label, , kata]) => !k || `${label} ${kata}`.toLowerCase().includes(k));
    if (!s.calon.length && k.length > 3) return tutupMenuBlok();
    s.pilih = Math.min(s.pilih, Math.max(0, s.calon.length - 1));
    gambarMenuBlok();
  }
  function gambarMenuBlok() {
    const s = ED.slash, menu = $('#ne-menu');
    if (!s || !menu) return;
    menu.innerHTML = s.calon.length
      ? s.calon.map(([jenis, label, ik, , ket], k) => `<button type="button" class="ne-menu-item" role="option" data-aksi="ne-slash" data-jenis="${jenis}" aria-selected="${k === s.pilih}">
          <span class="ne-menu-ikon">${ikon(ik, 16)}</span><span><b>${esc(label)}</b><small>${esc(ket)}</small></span></button>`).join('')
      : '<p class="ne-menu-kosong">Tidak ada jenis blok yang cocok.</p>';
    menu.hidden = false;
    // Di bawah kursor, di dalam .editor-isi (yang ikut bergulir di jendela kartu).
    const wadah = menu.parentElement;
    const kotak = wadah.getBoundingClientRect();
    let k = s.el.getBoundingClientRect();
    const sel = getSelection();
    if (sel.rangeCount) { const r = sel.getRangeAt(0).cloneRange(); r.collapse(true); const kk = r.getClientRects()[0]; if (kk) k = kk; }
    const lebar = Math.min(290, kotak.width - 16);
    menu.style.width = lebar + 'px';
    menu.style.left = Math.max(8, Math.min(k.left - kotak.left, kotak.width - lebar - 8)) + 'px';
    menu.style.top = (k.bottom - kotak.top + wadah.scrollTop + 6) + 'px';
    const pilih = menu.querySelector('[aria-selected="true"]');
    if (pilih) pilih.scrollIntoView({ block: 'nearest' });
  }
  function geserMenuBlok(d) {
    const s = ED.slash;
    if (!s || !s.calon.length) return;
    s.pilih = (s.pilih + d + s.calon.length) % s.calon.length;
    gambarMenuBlok();
  }
  function tutupMenuBlok() {
    ED.slash = null;
    const menu = $('#ne-menu');
    if (menu && !menu.hidden) { menu.hidden = true; menu.innerHTML = ''; }
  }
  function pakaiMenuBlok(jenis) {
    const s = ED.slash;
    if (!s) return;
    const pilihan = jenis || (s.calon[s.pilih] || [])[0];
    tutupMenuBlok();
    if (!pilihan || !s.el.isConnected) return;
    const p = posisiEl(s.el);
    const teks = bacaTeks(s.el);
    catatRiwayatSekarang();
    // "/kata" yang diketik dibuang dari teksnya.
    ED.blok[p.i].teks = teks.slice(0, s.posisi) + teks.slice(s.posisi + 1 + s.q.length);
    jadikanJenis(p.i, pilihan, s.posisi);
  }
  /* Blok i menjadi jenis lain (teksnya tetap). Tabel dan garis disisipkan di bawahnya, atau
     menggantikan paragraf kosong. */
  function jadikanJenis(i, jenis, offset = 0) {
    const b = ED.blok[i];
    if (!b) return;
    if (jenis === 'tabel' || jenis === 'hr') return sisipkanKhusus(i, jenis);
    if (b.jenis === 'tabel' || b.jenis === 'hr') {
      ED.blok.splice(i + 1, 0, bentukBlok(jenis));
      return gambarBlok({ i: i + 1 });
    }
    ED.blok[i] = bentukBlok(jenis, b);
    gambarBlok({ i, offset });
  }
  function sisipkanKhusus(i, jenis) {
    const b = ED.blok[i];
    const ganti = !!b && b.jenis === 'p' && !b.teks;
    const baru = jenis === 'tabel' ? { jenis, kepala: true, sel: [['', '', ''], ['', '', ''], ['', '', '']] } : { jenis: 'hr' };
    const j = ganti ? i : i + 1;
    ED.blok.splice(j, ganti ? 1 : 0, baru);
    // Selalu ada tempat menulis di bawah tabel atau garis.
    const lanjut = ED.blok[j + 1];
    if (!lanjut || lanjut.jenis === 'tabel' || lanjut.jenis === 'hr') ED.blok.splice(j + 1, 0, { jenis: 'p', teks: '' });
    gambarBlok(jenis === 'tabel' ? { i: j, r: 0, c: 0 } : { i: j + 1 });
  }

  /* --- Toolbar, format, tautan --- */

  /* Kursor di blok yang sedang diketik, atau yang terakhir ditinggalkan (tombol toolbar di
     ponsel bisa mengambil fokus). */
  function titikKerja() {
    const el = elFokus();
    if (el) { const [a, z] = rentangKursor(el); return { p: posisiEl(el), a, z }; }
    const k = ED.kursorAkhir;
    return k && ED.blok[k.p.i] ? k : null;
  }
  function alatEditor(jenis) {
    if (jenis === 'tebal' || jenis === 'miring') return bungkusPilihan(jenis === 'tebal' ? '**' : '_');
    if (jenis === 'tautan') return sisipTautan();
    const tujuan = { judul: 'h1', daftar: 'li', nomor: 'ol', centang: 'todo', tabel: 'tabel', garis: 'hr' }[jenis];
    if (!tujuan) return;
    const t = titikKerja();
    const i = t ? t.p.i : ED.blok.length - 1;
    const b = ED.blok[i];
    catatRiwayatSekarang();
    // Jenis yang sama ditekan lagi: kembali jadi paragraf.
    if (b && b.jenis === tujuan && !['tabel', 'hr'].includes(tujuan)) { ED.blok[i] = { jenis: 'p', teks: b.teks }; return gambarBlok({ i, offset: t ? t.a : 0 }); }
    jadikanJenis(i, tujuan, t && t.p.r === undefined ? t.a : 0);
  }
  function bungkusPilihan(tanda) {
    const t = titikKerja();
    if (!t) return toast('Klik dulu teks yang ingin diformat.', true);
    const lama = teksPosisi(t.p);
    const L = tanda.length;
    const { a, z } = t;
    let baru, pa, pz;
    if (a >= L && lama.slice(a - L, a) === tanda && lama.slice(z, z + L) === tanda) {
      // Sudah bertanda: tandanya dilepas.
      baru = lama.slice(0, a - L) + lama.slice(a, z) + lama.slice(z + L);
      pa = a - L; pz = z - L;
    } else {
      const isi = lama.slice(a, z) || (tanda === '**' ? 'teks tebal' : 'teks miring');
      baru = lama.slice(0, a) + tanda + isi + tanda + lama.slice(z);
      pa = a + L; pz = a + L + isi.length;
    }
    catatRiwayatSekarang();
    aturTeksPosisi(t.p, baru);
    gambarBlok({ ...t.p, offset: pa, sampai: pz });
  }
  function sisipTautan() {
    const t = titikKerja();
    if (!t) return toast('Klik dulu di teks tempat tautan disisipkan.', true);
    const alamat = I.tautanRapi(prompt('Alamat tautan, mis. https://docs.google.com/…', 'https://') || '');
    if (!alamat) return fokusKe({ ...t.p, offset: t.a });
    const lama = teksPosisi(t.p);
    const sisip = `[${(lama.slice(t.a, t.z) || namaSitus(alamat)).replace(/[[\]]/g, '')}](${alamat})`;
    catatRiwayatSekarang();
    aturTeksPosisi(t.p, lama.slice(0, t.a) + sisip + lama.slice(t.z));
    gambarBlok({ ...t.p, offset: t.a + sisip.length });
  }
  function centangBlok(tombol) {
    const blok = tombol.closest('[data-i]');
    const b = blok && ED.blok[Number(blok.dataset.i)];
    if (!b || b.jenis !== 'todo') return;
    catatRiwayatSekarang();
    b.cek = !b.cek;
    blok.classList.toggle('sudah', b.cek);
    tombol.classList.toggle('sudah', b.cek);
    tombol.setAttribute('aria-checked', String(b.cek));
    tombol.innerHTML = b.cek ? ikon('centang', 12) : '';
    selaraskan();
  }
  /* Klik di bawah blok terakhir: lanjut menulis di paragraf kosong paling bawah. */
  function klikBawah() {
    const akhir = ED.blok[ED.blok.length - 1];
    if (akhir && akhir.jenis === 'p' && !akhir.teks) return fokusKe({ i: ED.blok.length - 1 });
    catatRiwayatSekarang();
    ED.blok.push({ jenis: 'p', teks: '' });
    gambarBlok({ i: ED.blok.length - 1 });
  }
  function opTabel(op, tombol) {
    const i = Number(tombol.closest('[data-i]').dataset.i);
    const b = ED.blok[i];
    if (!b || b.jenis !== 'tabel') return;
    const aktif = elFokus();
    const kini = aktif && aktif.classList.contains('ne-sel') ? posisiEl(aktif) : ED.fokus;
    const f = kini && kini.i === i && kini.r !== undefined ? kini : { i, r: b.sel.length - 1, c: b.sel[0].length - 1 };
    const kolom = b.sel[0].length;
    if (op === 'hapus' || (op === 'hapus-baris' && b.sel.length <= 1) || (op === 'hapus-kolom' && kolom <= 1)) {
      if (b.sel.some(r => r.some(x => String(x).trim())) && !confirm('Hapus tabel ini beserta isinya?')) return;
      catatRiwayatSekarang();
      ED.blok.splice(i, 1);
      return gambarBlok(ED.blok.length ? { i: Math.max(0, i - 1), akhir: true } : { i: 0 });
    }
    catatRiwayatSekarang();
    if (op === 'baris') { b.sel.splice(f.r + 1, 0, Array(kolom).fill('')); return gambarBlok({ i, r: f.r + 1, c: f.c }); }
    if (op === 'kolom') {
      if (kolom >= MAKS_KOLOM) return toast(`Tabel paling banyak ${MAKS_KOLOM} kolom.`, true);
      b.sel.forEach(r => r.splice(f.c + 1, 0, ''));
      return gambarBlok({ i, r: f.r, c: f.c + 1 });
    }
    if (op === 'hapus-baris') { b.sel.splice(f.r, 1); return gambarBlok({ i, r: Math.min(f.r, b.sel.length - 1), c: f.c }); }
    if (op === 'hapus-kolom') { b.sel.forEach(r => r.splice(f.c, 1)); return gambarBlok({ i, r: f.r, c: Math.min(f.c, kolom - 2) }); }
  }

  /* --- Tempel --- */

  /* Satu baris: disisipkan di kursor. Beberapa baris: dipecah jadi blok (daftar, checklist, judul
     ikut dikenali). Sel dari spreadsheet (dipisah Tab): mengisi tabel mulai dari sel ini, atau
     menjadi tabel baru di luar tabel. */
  function tempelBlok(el, mentah) {
    const teks = String(mentah || '').replace(/\r\n?/g, '\n').replace(/\n+$/, '');
    if (!teks) return;
    const p = posisiEl(el);
    const baris = teks.split('\n');
    const grid = /\t/.test(teks) ? baris.map(l => l.split('\t').map(x => x.trim()).slice(0, MAKS_KOLOM)) : null;
    if (p.r !== undefined && grid) {
      catatRiwayatSekarang();
      const b = ED.blok[p.i];
      grid.slice(0, 200).forEach((isi, dr) => isi.forEach((x, dc) => {
        const r = p.r + dr, c = p.c + dc;
        if (c >= MAKS_KOLOM) return;
        while (b.sel.length <= r) b.sel.push(Array(b.sel[0].length).fill(''));
        if (c >= b.sel[0].length) b.sel.forEach(row => { while (row.length <= c) row.push(''); });
        b.sel[r][c] = x;
      }));
      const akhir = grid[Math.min(grid.length, 200) - 1];
      return gambarBlok({ i: p.i, r: p.r + Math.min(grid.length, 200) - 1, c: Math.min(MAKS_KOLOM - 1, p.c + akhir.length - 1), akhir: true });
    }
    if (baris.length === 1 || p.r !== undefined) {
      document.execCommand('insertText', false, baris.join(' ').replace(/\t/g, ' '));
      return;
    }
    catatRiwayatSekarang();
    const b = ED.blok[p.i];
    const [a, z] = rentangKursor(el);
    const isi = bacaTeks(el);
    const kiri = isi.slice(0, a), kanan = isi.slice(z);
    const baru = grid && grid.length > 1
      ? [{ jenis: 'tabel', kepala: true, sel: grid.map(r => r.concat(Array(Math.max(0, Math.max(...grid.map(x => x.length)) - r.length)).fill(''))) }]
      : I.blokCatatan(teks);
    const pertama = baru[0];
    if (!kiri && b.jenis === 'p') ED.blok.splice(p.i, 1);       // paragraf kosong: digantikan isi tempelan
    else if (pertama.jenis === 'tabel' || pertama.jenis === 'hr') b.teks = kiri;
    else { b.teks = kiri + (pertama.teks || ''); baru.shift(); }
    const awal = !kiri && b.jenis === 'p' ? p.i : p.i + 1;
    ED.blok.splice(awal, 0, ...baru);
    let akhir = baru.length ? awal + baru.length - 1 : p.i;
    let offset;
    const terakhir = ED.blok[akhir];
    if (kanan && terakhir && terakhir.jenis !== 'tabel' && terakhir.jenis !== 'hr') {
      offset = (terakhir.teks || '').length;
      terakhir.teks = (terakhir.teks || '') + kanan;
    } else if (kanan) {
      ED.blok.splice(akhir + 1, 0, { jenis: 'p', teks: kanan });
      akhir++;
      offset = 0;
    }
    gambarBlok(offset === undefined ? { i: akhir, akhir: true } : { i: akhir, offset });
  }

  /* ----- Menyimpan ----- */

  /* Simpan otomatis: 0,7 detik setelah berhenti mengetik. Editornya tak digambar ulang,
     supaya kursor tak melompat; yang diperbarui hanya status, hitungan, dan daftar. */
  let tundaCatatan = null;
  function catatanBerubah() {
    const s = $('#catatan-status');
    if (s) s.innerHTML = `${ikon('sunting', 16)} Menyimpan…`;
    const isi = $('#catatan-isi'), hitung = $('#catatan-hitung');
    if (isi && hitung) hitung.textContent = hitungTeks({ body: isi.value });
    clearTimeout(tundaCatatan);
    tundaCatatan = setTimeout(simpanCatatanTertunda, 700);
  }
  function simpanCatatanTertunda() {
    if (!tundaCatatan) return;
    clearTimeout(tundaCatatan);
    tundaCatatan = null;
    simpanCatatanSekarang();
  }
  function simpanCatatanSekarang() {
    const ed = $('[data-catatan]');
    if (!ed) return null;
    const judul = $('#catatan-judul').value, isi = $('#catatan-isi').value, folder = $('#catatan-folder').value;
    const id = ed.dataset.catatan;
    const s = $('#catatan-status');
    if (id === '__baru' && !judul.trim() && !isi.trim()) { if (s) s.innerHTML = statusCatatan({ id }); return null; }
    try {
      if (id !== '__baru') simpanVersiSebelum(id, judul, isi);
      const n = I.simpanCatatan(S.data, S.me, { title: judul, body: isi, folder }, id === '__baru' ? '' : id, Date.now());
      simpanData();
      if (id === '__baru') {
        S.ctt.pilih = n.id;
        ed.dataset.catatan = n.id;
        ED.id = n.id;
        if (S.modal && S.modal.jenis === 'editor-catatan') S.modal.id = n.id;
        catatAlamat();
        // Blok-bloknya tak digambar ulang: kursor dan ketikan (juga di papan ketik ponsel) tetap utuh.
        if (s) s.innerHTML = statusCatatan(n);
        const aksi = $('#catatan-aksi');
        if (aksi) aksi.innerHTML = aksiCatatan(n);
        const daftarFolder = $('#folder-catatan');
        if (daftarFolder && !$('.catatan-meta .ctt-warna')) daftarFolder.insertAdjacentHTML('afterend', warnaCatatanHtml(n));
        segarkanDaftarCatatan();
        return n;
      }
      if (s) s.innerHTML = statusCatatan(n);
      segarkanDaftarCatatan();
      return n;
    } catch (e) {
      if (s) s.innerHTML = `${ikon('tutup', 16)} ${esc(e.message)}`;
      return null;
    }
  }
  function segarkanDaftarCatatan() {
    const daftar = $('#hasil'), ringkas = $('#catatan-ringkas');
    if (daftar && S.view === 'catatan') daftar.innerHTML = daftarCatatan();
    if (ringkas && S.view === 'catatan') ringkas.textContent = ringkasCatatan();
  }
  /* Gambar ulang editor saja (di halaman atau di jendela kartu); daftarnya ikut disegarkan.
     tetapFokus: setelah catatan baru pertama kali tersimpan, kursor tetap di tempatnya. */
  function gambarUlangEditor(tetapFokus = false) {
    const ed = $('[data-catatan]');
    const n = catatanAktif();
    if (!ed || !n) { render(); return null; }
    const aktif = tetapFokus && document.activeElement;
    const posisi = aktif && aktif.id && 'selectionStart' in aktif ? [aktif.id, aktif.selectionStart, aktif.selectionEnd] : null;
    const blok = aktif && aktif === elFokus() ? { ...posisiEl(aktif), offset: rentangKursor(aktif)[0] } : null;
    ed.outerHTML = editorCatatan(n, folderSaya(catatanSaya()));
    segarkanDaftarCatatan();
    if (posisi) { const el = document.getElementById(posisi[0]); if (el) { el.focus(); el.setSelectionRange(posisi[1], posisi[2]); } }
    else if (blok) fokusKe(blok);
    return n;
  }

  /* ----- Membuka dan membuat ----- */

  function pilihAwal(n) {
    Object.assign(S.ctt, { pilih: n.id, versiSesi: '' });
  }
  function pilihCatatan(id) {
    simpanCatatanTertunda();
    const n = catatanSaya().find(x => x.id === id);
    if (!n) return;
    pilihAwal(n);
    if (modeKartu() && S.view === 'catatan') bukaEditorJendela(); else render();
  }
  /* Tampilan kartu: editor terbuka di jendela; menutup jendelanya menyimpan yang tertunda. */
  const editorDiJendela = () => !!(S.modal && S.modal.jenis === 'editor-catatan');
  /* Alamat #/catatan/ID (tombol Back/Forward, muat ulang) di tampilan kartu: buka jendelanya. */
  function bukaEditorDariAlamat() {
    if (S.view === 'catatan' && modeKartu() && S.ctt.pilih && S.ctt.pilih !== '__baru' && $('#modal').hidden && catatanAktif()) bukaEditorJendela();
  }
  function bukaEditorJendela() {
    const n = catatanAktif();
    if (!n) return;
    bukaModal({ jenis: 'editor-catatan', id: n.id }, editorCatatan(n, folderSaya(catatanSaya())));
    $('#modal-panel').classList.add('panel-catatan');
    catatAlamat();
    // Catatan baru: kursor di judul. Catatan lama dibuka untuk dibaca dulu (papan ketik ponsel tak muncul).
    setTimeout(() => {
      const judul = $('#catatan-judul');
      if (n.id === '__baru' && judul) judul.focus();
      else if (document.activeElement) document.activeElement.blur();
    }, 40);
  }
  function catatanBaru(folder = '') {
    simpanCatatanTertunda();
    Object.assign(S.ctt, { pilih: '__baru', folderBaru: folder, versiSesi: '' });
    if (S.view === 'catatan' && modeKartu()) return bukaEditorJendela();
    if (S.view !== 'catatan') return pindahHalaman('catatan');
    render();
    setTimeout(() => { const j = $('#catatan-judul'); if (j) j.focus(); }, 30);
  }
  /* Dari pencarian cepat atau notifikasi: buka halaman Catatan dengan catatan itu. */
  function bukaCatatan(id) {
    simpanCatatanTertunda();
    const n = catatanSaya().find(x => x.id === id);
    if (n) pilihAwal(n);
    pindahHalaman('catatan');
    if (n && modeKartu()) bukaEditorJendela();
  }

  /* Satu blok catatan → form Tambah task yang sudah terisi. Sesudah task dibuat, nomornya
     ditempel di ujung baris blok itu (lihat kirimModal 'tambah'). baris kosong = blok yang
     sedang (atau terakhir) diketik. */
  function barisFokus() {
    const t = titikKerja();
    if (!t || t.p.r !== undefined) return -1;
    return I.teksBlokDanBaris(ED.blok).baris[t.p.i];
  }
  function jadikanTask(baris) {
    if (baris === undefined || Number.isNaN(baris)) baris = barisFokus();
    simpanCatatanTertunda();
    const n = catatanAktif();
    if (!n || n.id === '__baru') return toast('Tulis dulu isinya; catatan baru tersimpan begitu ada teksnya.', true);
    const judul = I.teksBarisCatatan(n.body, baris);
    if (!judul) return toast('Blok itu kosong. Klik di blok yang berisi teks, lalu tekan Jadikan task.', true);
    if (!I.bolehBuatTask(S.me)) return toast('Pilih profil dulu.', true);
    bukaModal({ jenis: 'tambah', catatan: n.id, baris, keEditor: editorDiJendela() }, formTask(null, { judul, detail: `Dari catatan "${judulCatatan(n)}".` }));
  }

  /* ----- Templat ----- */

  const hariPendek = () => new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  const TEMPLAT_CATATAN = [
    { nama: 'Notulen rapat', ikon: 'orang', ket: 'Peserta, agenda, keputusan, dan tindak lanjut sebagai checklist.',
      isi: () => ({ title: `Notulen rapat · ${hariPendek()}`, body: '# Peserta\n- \n\n# Agenda\n- \n\n# Keputusan\n- \n\n# Tindak lanjut\n[ ] ' }) },
    { nama: 'Rencana minggu ini', ikon: 'kalender', ket: 'Tiga prioritas, yang menunggu orang lain, dan catatan.',
      isi: () => ({ title: `Rencana minggu · ${hariPendek()}`, body: '# Prioritas\n[ ] \n[ ] \n[ ] \n\n# Menunggu orang lain\n- \n\n# Catatan\n' }) },
    { nama: 'Checklist QC', ikon: 'centang', ket: 'Butir pemeriksaan output sebelum diajukan.',
      isi: () => ({ title: 'Checklist QC · ', body: '[ ] Soal dan kunci jawaban cocok\n[ ] Gambar tampil di Web\n[ ] Gambar tampil di Android\n[ ] Pembahasan lengkap\n[ ] Show/hide sudah benar\n' }) },
    { nama: 'Catatan 1-on-1', ikon: 'obrolan', ket: 'Kabar, hambatan, dan tindak lanjut dengan Lead atau Manager.',
      isi: () => ({ title: `1-on-1 · ${hariPendek()}`, body: '# Kabar\n- \n\n# Hambatan\n- \n\n# Tindak lanjut\n[ ] ' }) },
    { nama: 'Tabel rencana produksi', ikon: 'tabel', ket: 'Item, PIC, tenggat, dan status dalam satu tabel.',
      isi: () => ({ title: `Rencana produksi · ${hariPendek()}`, body: '| Item | PIC | Tenggat | Status |\n| --- | --- | --- | --- |\n|  |  |  |  |\n|  |  |  |  |\n|  |  |  |  |\n\n# Catatan\n' }) },
  ];
  function formTemplat() {
    return `<div class="form-templat">
      <h2>Mulai dari templat</h2>
      <p class="hint">Catatan baru langsung terisi kerangkanya; semuanya bisa diubah.</p>
      <div class="templat-daftar">${TEMPLAT_CATATAN.map((t, i) => `<button type="button" class="templat-item" data-aksi="ctt-templat-pakai" data-i="${i}">
          <span class="templat-ikon">${ikon(t.ikon, 18)}</span><span><strong>${esc(t.nama)}</strong><small>${esc(t.ket)}</small></span></button>`).join('')}</div>
      <div class="modal-kaki"><button type="button" class="tombol" data-aksi="tutup-modal">Batal</button></div>
    </div>`;
  }
  function pakaiTemplat(i) {
    const t = TEMPLAT_CATATAN[i];
    if (!t) return;
    const isi = t.isi();
    const n = I.simpanCatatan(S.data, S.me, { title: isi.title, body: isi.body, folder: S.ctt.folderBaru || '' }, '', Date.now());
    simpanData();
    tutupModal();
    Object.assign(S.ctt, { pilih: n.id, versiSesi: '' });
    if (S.view !== 'catatan') pindahHalaman('catatan'); else render();
    if (modeKartu()) bukaEditorJendela();
    // Kursor di butir kosong pertama (atau sel pertama tabel), siap diketik.
    setTimeout(() => {
      const i = ED.blok.findIndex(b => (['li', 'ol', 'todo'].includes(b.jenis) && !b.teks.trim()) || b.jenis === 'tabel');
      const b = ED.blok[i];
      fokusKe(i < 0 ? { i: ED.blok.length - 1, akhir: true } : b.jenis === 'tabel' ? { i, r: Math.min(1, b.sel.length - 1), c: 0 } : { i });
    }, 80);
    toast(`${t.nama} dibuat.`);
  }

  /* ----- Riwayat versi (di browser ini) -----
     Sebelum isi lama tertimpa, versinya disimpan: sekali di awal setiap sesi menyunting sebuah
     catatan, lalu paling sering tiap 10 menit. Maksimal 15 versi per catatan. */
  const VERSI_MAKS = 15;
  const semuaVersi = () => ambil('ctt_versi', {});
  const ambilVersi = id => semuaVersi()[id] || [];
  function simpanVersi(id, isi) {
    const semua = semuaVersi();
    const daftar = semua[id] || [];
    if (daftar[0] && daftar[0].title === isi.title && daftar[0].body === isi.body) return;
    daftar.unshift({ at: Date.now(), title: isi.title, body: isi.body });
    semua[id] = daftar.slice(0, VERSI_MAKS);
    simpan('ctt_versi', semua);
  }
  function hapusVersi(id) {
    const semua = semuaVersi();
    if (!(id in semua)) return;
    delete semua[id];
    simpan('ctt_versi', semua);
  }
  function simpanVersiSebelum(id, judul, isi) {
    const lama = S.data.notes.find(x => x.id === id);
    if (!lama || (lama.title === judul && lama.body === isi)) return;
    const akhir = ambilVersi(id)[0];
    if (S.ctt.versiSesi === id && akhir && Date.now() - akhir.at < 10 * 60000) return;
    simpanVersi(id, { title: lama.title, body: lama.body });
    S.ctt.versiSesi = id;
  }
  function formVersi(n) {
    const daftar = ambilVersi(n.id);
    return `<div class="form-versi">
      <h2>Riwayat versi</h2>
      <p class="hint">Versi sebelumnya dari "${esc(judulCatatan(n))}", disimpan otomatis di browser ini (maks. ${VERSI_MAKS}). Memulihkan versi lama tidak menghapus versi sekarang.</p>
      ${daftar.length ? `<ul class="versi-daftar">${daftar.map((v, i) => `<li>
          <div><strong>${esc(fmtWaktu(v.at))}</strong><small>${esc(v.title || 'Tanpa judul')} · ${v.body.length} karakter</small>
            <p>${esc(potong(String(v.body).replace(/\s+/g, ' '), 180)) || '<i>kosong</i>'}</p></div>
          <button type="button" class="tombol kecil" data-aksi="ctt-pulihkan" data-i="${i}">Pulihkan</button></li>`).join('')}</ul>`
        : '<p class="kosong-isi">Belum ada versi lama. Versi tersimpan sendiri saat catatan ini diubah.</p>'}
      <div class="modal-kaki"><button type="button" class="tombol" data-aksi="tutup-modal">Tutup</button></div>
    </div>`;
  }
  function pulihkanVersi(i) {
    const n = catatanAktif();
    const v = n && ambilVersi(n.id)[i];
    if (!v) return;
    simpanVersi(n.id, { title: n.title, body: n.body });
    I.simpanCatatan(S.data, S.me, { title: v.title, body: v.body, folder: n.folder }, n.id, Date.now());
    simpanData();
    tutupModal();
    S.ctt.versiSesi = '';
    render();
    toast(`Versi ${fmtWaktu(v.at)} dipulihkan. Versi sebelumnya tetap ada di riwayat.`);
  }

  function unduhCatatan(n) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([n.title ? `${n.title}\n\n${n.body}` : n.body], { type: 'text/plain;charset=utf-8' }));
    a.download = `${judulCatatan(n).replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 80) || 'catatan'}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ---------- Foto profil (0.12.0) ----------
     Foto dipotong (geser & perbesar di bingkai bulat) dan diperkecil ke 192 px di browser, lalu
     disimpan di tab foto spreadsheet v2: satu baris per orang, terlihat semua orang. Nanti di
     MySQL cukup satu tabel foto_profil; aksi API-nya (muatFoto/simpanFoto) tetap sama.
     Di prototipe profil dipilih sendiri, jadi foto yang diganti adalah foto profil yang aktif. */

  const UKURAN_FOTO = [192, 160, 128];

  /* Satu stylesheet untuk semua avatar: .av-<id> mendapat background-image. Hanya data URL yang
     lolos Inti.fotoSah (base64 murni) yang dipasang, jadi isinya tak bisa keluar dari url("…"). */
  function pasangGayaFoto() {
    let el = document.getElementById('gaya-foto');
    if (!el) {
      el = document.createElement('style');
      el.id = 'gaya-foto';
      document.head.appendChild(el);
    }
    const isi = S.foto.isi && typeof S.foto.isi === 'object' ? S.foto.isi : {};
    el.textContent = Object.entries(isi)
      .filter(([id, f]) => /^[a-z0-9-]+$/.test(id) && f && I.fotoSah(f.gambar))
      .map(([id, f]) => `.avatar.av-${id}{background-image:url("${f.gambar}")!important;background-size:cover!important;background-position:center!important;color:transparent!important}`)
      .join('\n');
  }
  const simpanCacheFoto = () => simpan('foto', { sejak: S.foto.sejak, isi: S.foto.isi });
  const punyaFoto = id => !!(S.foto.isi[id] && I.fotoSah(S.foto.isi[id].gambar));

  /* Hanya yang berubah sejak foto terbaru yang dimiliki. Tumpang-tindih semenit: jam instance
     server yang meleset beberapa detik tak membuat foto terlewat. */
  async function tarikFoto() {
    const f = S.foto;
    if (f.menarik) return;
    f.menarik = true;
    f.ditarik = Date.now();
    try {
      const h = await api('muatFoto', [Math.max(0, (Number(f.sejak) || 0) - 60000)]);
      if (!h.success || !Array.isArray(h.foto) || !h.foto.length) return;
      let berubah = false;
      for (const x of h.foto) {
        if (!x || !I.ORANG.some(o => o.id === x.orang)) continue;
        const gambar = I.fotoSah(x.gambar) ? x.gambar : '';
        f.sejak = Math.max(Number(f.sejak) || 0, Number(x.diperbarui) || 0);
        if (f.isi[x.orang] && f.isi[x.orang].gambar === gambar) continue;
        f.isi[x.orang] = { gambar, diperbarui: Number(x.diperbarui) || 0 };
        berubah = true;
      }
      simpanCacheFoto();
      if (berubah) pasangGayaFoto();
    } finally {
      f.menarik = false;
    }
  }
  // Foto orang lain ikut berganti tanpa memuat ulang: paling lama 5 menit, selama tab terlihat.
  setInterval(() => {
    if (!document.hidden && S.data && !$('#app').hidden && Date.now() - S.foto.ditarik > 5 * 60000) tarikFoto();
  }, 60000);

  function formFoto() {
    const ada = punyaFoto(S.me);
    return `<div class="form-foto">
      <h2>Foto profil</h2>
      <p class="hint">Tampil di samping nama ${esc(I.orang(S.me).pendek)} di seluruh aplikasi, untuk semua orang. Disimpan di spreadsheet v2.</p>
      <div class="foto-awal" id="foto-awal">
        ${avatar(S.me, 'raksasa')}
        <div class="foto-awal-aksi">
          <button type="button" class="tombol utama" data-aksi="foto-pilih">${ikon('kamera', 16)} ${ada ? 'Ganti foto…' : 'Pilih foto…'}</button>
          ${ada ? `<button type="button" class="tombol" data-aksi="foto-hapus">${ikon('hapus', 16)} Hapus foto</button>` : ''}
          <p class="hint">JPG, PNG, atau WebP. Bisa juga diseret ke sini atau ditempel (Ctrl+V). Foto diperkecil di perangkat ini sebelum dikirim.</p>
        </div>
      </div>
      <div class="foto-potong" id="foto-potong" hidden>
        <div class="foto-panggung" id="foto-panggung" tabindex="0" role="img" aria-label="Potongan foto. Seret untuk menggeser; panah menggeser, plus dan minus memperbesar, Enter menyimpan.">
          <img id="foto-gambar" alt="" draggable="false">
          <span class="foto-bingkai" aria-hidden="true"></span>
        </div>
        <label class="foto-zoom">${ikon('kurang', 16)}<span class="sr">Perbesar</span><input type="range" id="foto-zoom" min="1" max="4" step="0.01" value="1">${ikon('tambah', 16)}</label>
        <p class="hint foto-petunjuk">Seret foto untuk menggeser. Perbesar dengan penggeser, roda tetikus, atau cubit dua jari.</p>
        <button type="button" class="tautan-kecil foto-lain" data-aksi="foto-pilih">Pilih foto lain</button>
      </div>
      <input type="file" id="foto-berkas" accept="image/jpeg,image/png,image/webp,image/*" hidden>
      <p id="galat-modal" class="pesan-galat" role="alert" hidden></p>
      <div class="modal-kaki">
        <button type="button" class="tombol" data-aksi="tutup-modal">Batal</button>
        <button type="button" class="tombol utama" data-aksi="foto-simpan" id="foto-simpan" hidden>Simpan foto</button>
      </div>
    </div>`;
  }
  function bukaFoto() {
    if (!S.me) return;
    akhiriPotong();
    bukaModal({ jenis: 'foto' }, formFoto());
    $('#modal-panel').classList.add('panel-foto');
  }

  /* ----- Memotong: x, y = posisi pojok kiri atas gambar di panggung (px); skala = dasar × zoom,
     dasar = skala terkecil yang menutup panggung, jadi bingkai tak pernah berisi ruang kosong. */
  let kerat = null;
  const skalaPotong = () => kerat.dasar * kerat.zoom;
  /* Panggung bisa berubah ukuran (ponsel diputar, jendela diubah): semua ukuran diskalakan
     bersama, jadi bagian foto yang terpotong tetap sama. */
  function sesuaikanPanggung() {
    const el = $('#foto-panggung');
    const sisi = el && el.clientWidth;
    if (!sisi || sisi === kerat.sisi) return;
    const f = sisi / kerat.sisi;
    Object.assign(kerat, { sisi, dasar: kerat.dasar * f, x: kerat.x * f, y: kerat.y * f });
  }
  function gambarPotong() {
    sesuaikanPanggung();
    const p = kerat, s = skalaPotong();
    p.x = Math.min(0, Math.max(p.sisi - p.w * s, p.x));
    p.y = Math.min(0, Math.max(p.sisi - p.h * s, p.y));
    const g = $('#foto-gambar');
    if (g) g.style.transform = `translate(${p.x}px, ${p.y}px) scale(${s})`;
  }
  /* Titik (cx, cy) di panggung tetap di tempatnya saat diperbesar; bawaannya tengah. */
  function aturZoom(z, cx = kerat.sisi / 2, cy = kerat.sisi / 2) {
    const lama = skalaPotong();
    kerat.zoom = Math.min(4, Math.max(1, Number(z) || 1));
    const baru = skalaPotong();
    kerat.x = cx - (cx - kerat.x) * (baru / lama);
    kerat.y = cy - (cy - kerat.y) * (baru / lama);
    gambarPotong();
    const r = $('#foto-zoom');
    if (r && Number(r.value) !== kerat.zoom) r.value = kerat.zoom;
  }
  function akhiriPotong() {
    if (kerat) URL.revokeObjectURL(kerat.url);
    kerat = null;
  }
  function mulaiPotong(berkas) {
    if (!berkas || !S.modal || S.modal.jenis !== 'foto') return;
    if (!/^image\//.test(berkas.type)) return galatModal('Itu bukan berkas gambar. Pilih JPG, PNG, atau WebP.');
    if (berkas.size > 30 * 1024 * 1024) return galatModal('Fotonya terlalu besar (lebih dari 30 MB). Pilih foto lain.');
    const url = URL.createObjectURL(berkas);
    const img = new Image();
    img.onload = () => {
      if (!S.modal || S.modal.jenis !== 'foto' || !img.naturalWidth) return URL.revokeObjectURL(url);
      // Foto ponsel bisa 8000 px: diperkecil dulu ke 2048 px supaya ringan digeser dan diperbesar.
      const besar = Math.max(img.naturalWidth, img.naturalHeight);
      if (besar <= 2048) return pasangPotong(img, url, img.naturalWidth, img.naturalHeight);
      const f = 2048 / besar;
      const k = document.createElement('canvas');
      k.width = Math.round(img.naturalWidth * f);
      k.height = Math.round(img.naturalHeight * f);
      k.getContext('2d').drawImage(img, 0, 0, k.width, k.height);
      URL.revokeObjectURL(url);
      k.toBlob(b => {
        if (b && S.modal && S.modal.jenis === 'foto') pasangPotong(k, URL.createObjectURL(b), k.width, k.height);
      }, 'image/jpeg', 0.92);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      galatModal('Foto ini tidak bisa dibaca browser. Pilih JPG, PNG, atau WebP (foto HEIC dari iPhone: simpan dulu sebagai JPG).');
    };
    img.src = url;
  }

  /* sumber = gambar atau kanvas yang sudah diperkecil; url = alamat tampilannya di panggung. */
  function pasangPotong(sumber, url, w, h) {
    akhiriPotong();
    $('#galat-modal').hidden = true;
    $('#foto-awal').hidden = true;
    $('#foto-potong').hidden = false;
    $('#foto-simpan').hidden = false;
    const panggung = $('#foto-panggung');
    const sisi = panggung.clientWidth || 280;
    const dasar = Math.max(sisi / w, sisi / h);
    // Mulai di tengah.
    kerat = { img: sumber, url, w, h, sisi, dasar, zoom: 1, x: (sisi - w * dasar) / 2, y: (sisi - h * dasar) / 2, jari: new Map() };
    const g = $('#foto-gambar');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    g.src = url;
    $('#foto-zoom').value = 1;
    gambarPotong();
    panggung.focus();
  }

  /* Potongan → JPEG persegi 192 px; kalau masih melebihi batas sel, mutu lalu ukurannya diturunkan. */
  function hasilPotong() {
    sesuaikanPanggung();
    const s = skalaPotong();
    for (const u of UKURAN_FOTO) {
      const kanvas = document.createElement('canvas');
      kanvas.width = kanvas.height = u;
      const c = kanvas.getContext('2d');
      c.fillStyle = '#FFFFFF';   // PNG transparan: JPEG tak punya transparansi, jadi latarnya putih
      c.fillRect(0, 0, u, u);
      c.imageSmoothingQuality = 'high';
      c.drawImage(kerat.img, -kerat.x / s, -kerat.y / s, kerat.sisi / s, kerat.sisi / s, 0, 0, u, u);
      for (const q of [0.86, 0.76, 0.66]) {
        const data = kanvas.toDataURL('image/jpeg', q);
        if (data.length <= I.FOTO_MAKS) return data;
      }
    }
    return '';
  }
  function simpanFotoSaya() {
    if (!kerat) return;
    const data = hasilPotong();
    if (!I.fotoSah(data)) return galatModal('Foto ini tidak bisa diperkecil. Coba foto lain.');
    kirimFoto(data);
  }
  /* gambar '' = hapus. */
  async function kirimFoto(gambar) {
    const tombol = $$('#modal-panel button');
    tombol.forEach(b => { b.disabled = true; });
    const sp = $('#foto-simpan');
    if (sp) sp.textContent = 'Menyimpan…';
    const h = await api('simpanFoto', [{ orang: S.me, gambar }]);
    if (!h.success || !h.foto) {
      tombol.forEach(b => { b.disabled = false; });
      if (sp) sp.textContent = 'Simpan foto';
      return galatModal(h.message || 'Foto gagal disimpan. Coba lagi.');
    }
    S.foto.isi[S.me] = { gambar: h.foto.gambar, diperbarui: h.foto.diperbarui };
    S.foto.sejak = Math.max(Number(S.foto.sejak) || 0, h.foto.diperbarui);
    simpanCacheFoto();
    pasangGayaFoto();
    if (S.modal && S.modal.jenis === 'foto') tutupModal();
    toast(gambar ? 'Foto profil disimpan. Orang lain melihatnya paling lama 5 menit lagi, atau saat membuka aplikasi.'
      : 'Foto profil dihapus; avatar kembali ke inisial.');
  }

  /* Geser dengan satu jari/tetikus, cubit dengan dua jari, roda tetikus memperbesar di titik kursor. */
  document.addEventListener('pointerdown', e => {
    const p = e.target.closest && e.target.closest('#foto-panggung');
    if (!p || !kerat) return;
    e.preventDefault();
    p.focus();
    try { p.setPointerCapture(e.pointerId); } catch (err) { /* pointer sudah lepas */ }
    kerat.jari.set(e.pointerId, { x: e.clientX, y: e.clientY });
  });
  document.addEventListener('pointermove', e => {
    if (!kerat || !kerat.jari.has(e.pointerId)) return;
    const jari = kerat.jari;
    const lama = jari.get(e.pointerId);
    jari.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (jari.size === 1) {
      kerat.x += e.clientX - lama.x;
      kerat.y += e.clientY - lama.y;
      return gambarPotong();
    }
    const lain = [...jari.entries()].find(([id]) => id !== e.pointerId);
    if (!lain) return;
    const sebelum = Math.hypot(lama.x - lain[1].x, lama.y - lain[1].y);
    const sesudah = Math.hypot(e.clientX - lain[1].x, e.clientY - lain[1].y);
    if (!sebelum) return;
    const r = $('#foto-panggung').getBoundingClientRect();
    aturZoom(kerat.zoom * (sesudah / sebelum), (e.clientX + lain[1].x) / 2 - r.left, (e.clientY + lain[1].y) / 2 - r.top);
  });
  const lepasJari = e => { if (kerat) kerat.jari.delete(e.pointerId); };
  document.addEventListener('pointerup', lepasJari);
  document.addEventListener('pointercancel', lepasJari);
  window.addEventListener('resize', () => { if (kerat) gambarPotong(); });
  document.addEventListener('wheel', e => {
    const p = e.target.closest && e.target.closest('#foto-panggung');
    if (!p || !kerat) return;
    e.preventDefault();
    const r = p.getBoundingClientRect();
    aturZoom(kerat.zoom * Math.exp(-e.deltaY / 400), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });


  /* ---------- Mode Dev (0.13.0) ----------
     Seperti v1: tekan-tahan logo ProductTrack (±2 detik) atau buka #/dev, lalu isi PIN Dev
     (env DEV_PIN di Vercel; kosong = mode Dev tertutup). Sesinya dijaga server: cookie bertanda
     tangan yang berlaku 12 jam dan batal kalau DEV_PIN diganti. Dev adalah akun teknis (I.DEV):
     hak lihatnya setara Manager, tapi bukan anggota organogram. Alatnya di halaman Panel Dev:
     Sistem (diagnosa), Pengguna (kelola orang, Lihat sebagai), dan Moderasi. */

  const modeDev = () => S.dev && S.me === I.DEV;
  const jamDev = () => (S.devSampai ? new Date(S.devSampai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '');

  /* Galat di browser ini (paling baru 20), untuk tab Sistem dan laporan diagnosa. */
  const GALAT = [];
  function catatGalat(pesan, sumber = '') {
    GALAT.unshift({ at: Date.now(), pesan: String(pesan || 'Galat tanpa pesan').slice(0, 300), sumber: String(sumber || '').slice(0, 120) });
    if (GALAT.length > 20) GALAT.length = 20;
  }
  window.addEventListener('error', e => catatGalat(e.message, e.filename ? `${String(e.filename).split('/').pop()}:${e.lineno}` : ''));
  window.addEventListener('unhandledrejection', e => catatGalat(e.reason && e.reason.message ? e.reason.message : e.reason, 'promise'));

  /* ----- Masuk: tekan-tahan logo 3 detik (di sidebar, layar PIN, atau pemilih profil). Satu-satunya
     pintu masuk mode Dev; tak ada kartu Dev di pemilih profil. ----- */
  const TAHAN_LOGO_MS = 3000;
  let tahanLogo = null, tahanAwal = null;
  let logoDitahan = false;   // klik yang menyusul tekan-tahan tak ikut menjalankan logo (ke beranda)
  document.addEventListener('pointerdown', e => {
    const logo = e.target.closest && e.target.closest('.merek');
    if (!logo || e.button > 0) return;
    clearTimeout(tahanLogo);
    logoDitahan = false;
    tahanAwal = { x: e.clientX, y: e.clientY };
    logo.classList.add('ditahan');
    tahanLogo = setTimeout(() => {
      tahanLogo = null;
      logoDitahan = true;
      logo.classList.remove('ditahan');
      bukaMasukDev();
    }, TAHAN_LOGO_MS);
  });
  function lepasLogo() {
    if (tahanLogo) { clearTimeout(tahanLogo); tahanLogo = null; }
    $$('.merek.ditahan').forEach(x => x.classList.remove('ditahan'));
  }
  document.addEventListener('pointerup', lepasLogo);
  document.addEventListener('pointercancel', lepasLogo);
  document.addEventListener('pointermove', e => {
    if (tahanLogo && tahanAwal && Math.hypot(e.clientX - tahanAwal.x, e.clientY - tahanAwal.y) > 12) lepasLogo();
  });
  // Tekan lama di ponsel memunculkan menu bawaan; di logo itu bukan yang dimaksud.
  document.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('.merek')) e.preventDefault(); });

  function bukaMasukDev() {
    if (modeDev()) return toast('Sudah dalam mode Dev.');
    if (S.dev && S.data) return jadiDev();   // sesi masih Dev (mis. sesudah Ganti profil): tak perlu PIN lagi
    bukaModal({ jenis: 'masuk-dev', atas: true }, `<form class="form-dev" data-form="masuk-dev" novalidate>
        <h2 class="judul-ikon">${ikon('kode', 20)} Mode Dev</h2>
        <p class="hint">Untuk perawatan aplikasi: diagnosa, kelola orang, Lihat sebagai, dan moderasi. Sesi Dev berlaku 12 jam.</p>
        <label class="isian">PIN Dev<input id="pin-dev" type="password" inputmode="numeric" autocomplete="off" maxlength="64" required></label>
        ${kakiModal('Masuk')}
      </form>`);
  }
  async function kirimMasukDev(form) {
    const tombol = form.querySelector('.tombol.utama');
    tombol.disabled = true;
    const h = await api('masukDev', [$('#pin-dev').value]);
    tombol.disabled = false;
    if (!h.success) {
      const isian = $('#pin-dev');
      if (isian) { isian.value = ''; isian.focus(); }
      return galatModal(h.message || 'PIN Dev salah.');
    }
    S.dev = true;
    S.devSampai = Number(h.devSampai) || 0;
    tutupModal();
    // Dari layar PIN (data belum dimuat): muat dulu, langsung sebagai Dev di Panel Dev.
    if (!S.data) {
      S.me = I.DEV;
      simpan('me', I.DEV);
      alamatAwal = '#/dev';
      return muat();
    }
    jadiDev();
  }
  function jadiDev() {
    if (S.pratinjau) akhiriPratinjau(false);
    gantiIdentitas(I.DEV);
    masukApp();
    toast(`Mode Dev aktif${S.devSampai ? ' sampai ' + jamDev() : ''}.`);
  }
  async function keluarDev() {
    const h = await api('keluarDev');
    if (!h.success) return toast(h.message || 'Gagal keluar dari mode Dev.', true);
    devSelesai();
    tampilProfil();
    toast('Keluar dari mode Dev. Pilih profil Anda.');
  }
  /* Sesi bukan Dev lagi (keluar, atau lewat 12 jam): akun Dev tak bisa dipakai. */
  function devSelesai() {
    Object.assign(S, { dev: false, devSampai: 0, devSistem: null });
    if (S.pratinjau) akhiriPratinjau(false);
    if (S.me === I.DEV) { S.me = null; hapus('me'); }
  }
  function devBerakhir() {
    const tadinya = S.me === I.DEV || !!S.pratinjau;
    devSelesai();
    if (tadinya && S.data) {
      tampilProfil();
      toast('Sesi Dev berakhir (12 jam). Masuk lagi lewat tekan-tahan logo.', true);
    }
  }

  /* ----- Lihat sebagai: layar persis milik orang itu, tanpa keluar dari mode Dev. Tampilan
     saja: yang terlanjur diubah tak disimpan (dibuang saat kembali), dan pesan, foto, serta
     perubahan orang tidak dikirim. ----- */
  function mulaiPratinjau(id) {
    if (!modeDev() || !I.ORANG.some(o => o.id === id)) return;
    if (S.modal) tutupModal();
    S.pratinjau = { orang: id };
    gantiIdentitas(id, { ingat: false });
    masukApp();
    toast(`Melihat sebagai ${I.orang(id).pendek}. Tampilan saja: perubahan tidak disimpan.`);
  }
  function akhiriPratinjau(kembali = true) {
    if (!S.pratinjau) return;
    S.pratinjau = null;
    S.obr.peristiwa = S.obr.peristiwa.filter(e => !e.tertunda && !e.gagal);
    if (S.mode === 'real') {
      S.pribadi = ambil('pribadi_real', null) || { links: [], notes: [] };
      susunReal();
    } else {
      const lokal = ambil('data', null);
      if (lokal && lokal.data) { S.data = rapikan(lokal.data); I.segarkanTahap(S.data); }
    }
    gantiIdentitas(I.DEV, { ingat: false });
    if (!kembali) return;
    S.devTab = 'pengguna';
    masukApp();
    toast('Kembali jadi Dev.');
  }
  const spandukPratinjau = () => (S.pratinjau ? `<div class="spanduk-pratinjau" role="status">${ikon('mata', 18)}
      <span>Melihat sebagai <b>${esc(I.orang(S.me).nama)}</b> · ${esc(I.PERAN[I.orang(S.me).peran])} — tampilan saja; perubahan tidak disimpan dan tak ada yang dikirim.</span>
      <button type="button" class="tombol kecil" data-aksi="pratinjau-akhiri">Kembali jadi Dev</button></div>` : '');

  /* ----- Panel Dev ----- */
  const TAB_DEV = [['sistem', 'Sistem', 'jendela'], ['pengguna', 'Pengguna', 'orang'], ['moderasi', 'Moderasi', 'obrolan']];
  function viewDev() {
    const tab = TAB_DEV.some(([id]) => id === S.devTab) ? S.devTab : 'sistem';
    return `<div class="judul-halaman"><div><h1>Panel Dev</h1><p>Mode Dev aktif${S.devSampai ? ' sampai ' + esc(jamDev()) : ''} · akun teknis untuk perawatan, bukan anggota tim</p></div>
        <button type="button" class="tombol" data-aksi="dev-keluar">${ikon('keluar', 16)} Keluar mode Dev</button></div>
      <div class="segmen dev-tab" role="group" aria-label="Bagian Panel Dev">${TAB_DEV.map(([id, l, ik]) => `<button type="button" data-aksi="dev-tab" data-nilai="${id}" aria-pressed="${tab === id}">${ikon(ik, 16)}<span>${l}</span></button>`).join('')}</div>
      <div id="dev-isi">${isiTabDev(tab)}</div>`;
  }
  const isiTabDev = (tab = S.devTab) => ({ pengguna: devPengguna, moderasi: devModerasi }[tab] || devSistem)();
  function segarkanDev() {
    const el = $('#dev-isi');
    if (el && S.view === 'dev') el.innerHTML = isiTabDev();
  }

  /* --- Sistem --- */
  async function tarikSistem() {
    S.devSistem = { memuat: true };
    const h = await api('sistem');
    S.devSistem = h.success ? { isi: h, waktu: Date.now() } : { galat: h.message || 'Gagal memeriksa server.' };
    if (h.success && h.devSampai) S.devSampai = h.devSampai;
    segarkanDev();
  }
  function devSistem() {
    const st = S.devSistem;
    if (!st) setTimeout(tarikSistem, 0);
    const server = !st || st.memuat ? '<p class="hint">Memeriksa server…</p>'
      : st.galat ? `<p class="pesan-galat">${esc(st.galat)}</p>` : kartuServer(st.isi);
    return `<div class="dev-grid">
        <section class="kartu-polos dev-kartu dev-lebar"><h2 class="judul-ikon">${ikon('lapis', 18)} Sumber data · berlaku untuk semua pengguna</h2>${kartuSumber(st && st.isi)}</section>
        <section class="kartu-polos dev-kartu"><h2 class="judul-ikon">${ikon('jendela', 18)} Server & spreadsheet</h2>${server}</section>
        <section class="kartu-polos dev-kartu"><h2 class="judul-ikon">${ikon('lapis', 18)} Browser ini</h2>${kartuBrowser()}</section>
        <section class="kartu-polos dev-kartu dev-lebar"><h2 class="judul-ikon">${ikon('info', 18)} Galat terakhir di browser ini</h2>${daftarGalat()}</section>
      </div>
      <div class="dev-aksi">
        <button type="button" class="tombol" data-aksi="dev-sistem-segarkan">${ikon('ulang', 16)} Periksa ulang</button>
        <button type="button" class="tombol" data-aksi="dev-tarik-ulang">${ikon('obrolan', 16)} Tarik ulang pesan & foto</button>
        <button type="button" class="tombol" data-aksi="dev-siapkan">${ikon('centang', 16)} Siapkan spreadsheet</button>
        <button type="button" class="tombol" data-aksi="dev-salin">${ikon('salin', 16)} Salin laporan diagnosa</button>
      </div>`;
  }
  /* Sumber data aplikasi (2.16.0): pilihan mode Dev, berlaku untuk semua pengguna. */
  const RIWAYAT_BESAR = 20 * 1048576;   // ±20 MB riwayat data_real: peringatan pindah ke MySQL
  function kartuSumber(x) {
    const r = x && x.real;
    const pilihan = (mode, judul, ket) => `<button type="button" class="pilihan-sumber" data-aksi="dev-sumber" data-nilai="${mode}" aria-pressed="${S.mode === mode}">
        <strong>${judul}${S.mode === mode ? ' · aktif' : ''}</strong><span>${ket}</span></button>`;
    return `<div class="sumber-data">
        ${pilihan('contoh', 'Data contoh', 'Hasil impor v1 dan skenario contoh. Perubahan hanya tersimpan di browser masing-masing dan bisa di-reset.')}
        ${pilihan('real', 'Data real', `Mulai kosong. Setiap perubahan tersimpan bersama di spreadsheet (tab data_real) dan terlihat semua orang.${r ? ` Tersimpan ${fmtAngka(r.perubahan)} perubahan${r.ukuran ? ` (±${fmtUkuran(r.ukuran)})` : ''}${r.diulang ? `; ${r.diulang} kalah dari perubahan yang bersamaan dan sudah diulang server` : ''}${r.rusak ? `; ${r.rusak} baris rusak dilewati` : ''}.` : ''}`)}
      </div>
      ${r && r.ukuran > RIWAYAT_BESAR ? `<p class="hint teks-merah">Riwayat data real sudah ±${fmtUkuran(r.ukuran)}. Riwayat itu dibaca utuh setiap server menyala dan setiap browser baru membuka data real, jadi pemuatan makin lambat: saatnya pindah ke MySQL (lihat README, Sumber data).</p>` : ''}
      <p class="hint">Mengganti sumber data memuat ulang aplikasi di semua browser, paling lambat sekitar satu menit kemudian (tab yang tak terlihat menyusul saat dibuka lagi). Perubahan data real yang terkirim sesudah sumbernya diganti ditolak, jadi pilih saat tim tak sedang mengisi. Obrolan Komunikasi juga terpisah per sumber data. Data yang tidak sedang dipakai tetap utuh.</p>`;
  }
  function versiBerkas() {
    const s = document.querySelector('script[src*="app.js"]');
    const m = s && /[?&]v=([^&]+)/.exec(s.getAttribute('src') || '');
    return m ? decodeURIComponent(m[1]) : '';
  }
  function kartuServer(x) {
    const vb = versiBerkas();
    const sama = !x.versi || !vb || x.versi === vb;
    const sp = x.spreadsheet || {};
    const tab = (x.tab || []).slice().sort((a, b) => a.nama.localeCompare(b.nama));
    const milikApp = ['obrolan', 'foto', 'orang', 'master', 'pin', 'setelan', 'data_real', 'obrolan_real'];
    const ag = x.agen || null;
    return `<dl class="dev-daftar">
        <dt>Lingkungan</dt><dd>${esc(x.lingkungan || '—')}${x.wilayah ? ' · ' + esc(x.wilayah) : ''}</dd>
        <dt>Versi</dt><dd>server ${esc(x.versi || '?')} · browser ${esc(vb || '?')} ${sama ? '<span class="chip-ok">sama</span>' : '<span class="chip-beda">beda: muat ulang dengan Ctrl+Shift+R</span>'}</dd>
        <dt>Akun</dt><dd class="putus">${esc(x.akun || '—')}</dd>
        <dt>Spreadsheet</dt><dd>${esc(sp.judul || '—')} · ${sp.kepemilikan === 'v2' ? 'milik v2' : esc(sp.kepemilikan || '?')}${sp.url ? ` · <a href="${esc(sp.url)}" target="_blank" rel="noopener noreferrer">buka</a>` : ''}</dd>
        <dt>Data contoh</dt><dd>${sp.contoh ? esc(fmtWaktu(Date.parse(sp.contoh.versi)) || sp.contoh.versi) + (sp.contoh.sumber ? ' · ' + esc(sp.contoh.sumber) : '') : 'belum diimpor'}</dd>
        <dt>Agen AI</dt><dd>${!ag ? '—' : ag.aktif ? `aktif · masuk sebagai ${esc(I.orang(ag.profil).pendek)}` : ag.pendek ? 'mati: AGEN_KUNCI kurang dari 32 karakter' : 'mati (AGEN_KUNCI kosong)'}</dd>
        <dt>Diperiksa</dt><dd>${esc(relatif(S.devSistem.waktu))}</dd>
      </dl>
      <table class="tabel dev-tabel-tab"><thead><tr><th>Tab</th><th class="angka">Baris</th></tr></thead><tbody>
        ${tab.map(t => `<tr><td>${esc(t.nama)}${milikApp.includes(t.nama) ? ' <small class="hint">ditulis aplikasi</small>' : ''}</td><td class="angka">${fmtAngka(t.baris)}</td></tr>`).join('')}
      </tbody></table>`;
  }
  function ukuranPenyimpanan() {
    const daftar = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('pt2_')) daftar.push([k.slice(4), (localStorage.getItem(k) || '').length * 2]);
      }
    } catch (e) { /* penyimpanan diblokir */ }
    return daftar.sort((a, b) => b[1] - a[1]);
  }
  const fmtUkuran = b => (b >= 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
  function namaPeramban() {
    const ua = navigator.userAgent;
    const m = /(Edg|OPR|Firefox|Chrome|Version)\/(\d+)/.exec(ua);
    const nama = m ? ({ Edg: 'Edge', OPR: 'Opera', Version: 'Safari' }[m[1]] || m[1]) + ' ' + m[2] : 'Peramban';
    return nama + (/Android|iPhone|iPad/.test(ua) ? ' (ponsel)' : '');
  }
  function kartuBrowser() {
    const simpanan = ukuranPenyimpanan();
    const total = simpanan.reduce((n, [, b]) => n + b, 0);
    const foto = Object.values(S.foto.isi || {}).filter(f => f && I.fotoSah(f.gambar)).length;
    return `<dl class="dev-daftar">
        <dt>Versi berkas</dt><dd>${esc(versiBerkas() || '—')}</dd>
        ${S.mode === 'real'
    ? `<dt>Data real</dt><dd>sampai perubahan nomor ${fmtAngka(S.real.seq)} · ${fmtAngka(S.data.tasks.length)} task${S.real.tertunda.length ? ` · <b class="teks-merah">${S.real.tertunda.length} belum tersimpan</b>` : ''}</dd>`
    : `<dt>Data contoh</dt><dd>${S.versi ? esc(fmtWaktu(Date.parse(S.versi)) || S.versi) : '—'} · dimuat ${esc(relatif(S.dimuat))} · ${fmtAngka(S.data.tasks.length)} task</dd>`}
        <dt>Pesan</dt><dd>${fmtAngka(S.obr.peristiwa.length)} peristiwa · ditarik ${S.obr.diperbarui ? esc(relatif(S.obr.diperbarui)) : 'belum'}${S.obr.gagal ? ` · <b class="teks-merah">${S.obr.gagal}× gagal</b>` : ''}</dd>
        <dt>Foto</dt><dd>${foto} foto tersimpan di browser</dd>
        <dt>Penyimpanan</dt><dd>${fmtUkuran(total)}${simpanan.length ? ` (${simpanan.slice(0, 4).map(([k, b]) => `${esc(k)} ${fmtUkuran(b)}`).join(', ')})` : ''}</dd>
        <dt>Peramban</dt><dd>${esc(namaPeramban())} · ${window.innerWidth}×${window.innerHeight}</dd>
      </dl>`;
  }
  const daftarGalat = () => (GALAT.length
    ? `<ul class="dev-galat">${GALAT.map(g => `<li><time>${esc(fmtJam(g.at))}</time><span>${esc(g.pesan)}${g.sumber ? ` <small>${esc(g.sumber)}</small>` : ''}</span></li>`).join('')}</ul>`
    : '<p class="hint">Tidak ada galat sejak halaman ini dibuka.</p>');
  function laporanDiagnosa() {
    const st = S.devSistem && S.devSistem.isi;
    return JSON.stringify({
      waktu: new Date().toISOString(), versiBerkas: versiBerkas(), peramban: namaPeramban(), layar: `${window.innerWidth}x${window.innerHeight}`,
      server: st ? {
        versi: st.versi, lingkungan: st.lingkungan, wilayah: st.wilayah, tab: st.tab,
        spreadsheet: st.spreadsheet && { judul: st.spreadsheet.judul, kepemilikan: st.spreadsheet.kepemilikan, contoh: st.spreadsheet.contoh },
      } : null,
      browser: { dataContoh: S.versi, task: S.data.tasks.length, peristiwa: S.obr.peristiwa.length, gagalTarik: S.obr.gagal, penyimpanan: ukuranPenyimpanan().slice(0, 8) },
      organogram: S.orangSalah || 'utuh',
      master: Object.keys(S.masterSalah).length ? S.masterSalah : 'utuh',
      profilBerpin: S.berpin.size,
      galat: GALAT,
    }, null, 2);
  }
  function tarikUlangBersama() {
    Object.assign(S.obr, { peristiwa: [], sejak: 0 });
    S.obr.versi++;
    tarikObrolan(true);
    Object.assign(S.foto, { sejak: 0, isi: {} });
    simpanCacheFoto();
    pasangGayaFoto();
    tarikFoto();
    toast('Menarik ulang semua pesan dan foto dari spreadsheet…');
  }

  /* --- Pengguna (kelola orang) --- */
  function devPengguna() {
    const semua = [...I.ORANG, ...I.nonaktif()];
    const ket = o => (o.peran === 'lead' ? `Lead · tim ${esc(o.tim || '?')}` : o.peran === 'staff' ? `Staff · atasan ${esc(I.orang(o.lead).pendek)}` : 'Manager');
    const baris = o => `<tr class="${o.aktif === false ? 'nonaktif' : ''}">
        <td><span class="dev-orang">${avatar(o.id)}<span><strong>${esc(o.nama)}</strong><small>@${esc(o.pendek)} · ${esc(o.id)}</small></span></span></td>
        <td>${ket(o)}</td>
        <td>${esc(o.jabatan || '—')}</td>
        <td>${o.aktif === false ? '<span class="chip-status mati">Nonaktif</span>' : '<span class="chip-status hidup">Aktif</span>'}</td>
        <td><span class="dev-aksi-baris">
          <button type="button" class="tombol kecil" data-aksi="dev-orang-ubah" data-id="${esc(o.id)}">${ikon('sunting', 14)} Ubah</button>
          ${o.aktif === false ? '' : `<button type="button" class="tombol kecil" data-aksi="dev-lihat" data-id="${esc(o.id)}">${ikon('mata', 14)} Lihat sebagai</button>`}
        </span></td></tr>`;
    return `${S.orangSalah ? `<p class="banner kuning">Tab orang di spreadsheet diabaikan karena organogramnya rusak: ${esc(S.orangSalah)} Simpan ulang orang yang bersangkutan dari sini untuk membetulkannya.</p>` : ''}
      <div class="dev-alat"><p class="hint">Perubahan tersimpan di tab <b>orang</b> spreadsheet v2 dan berlaku untuk semua orang saat aplikasi dimuat ulang. Orang tak dihapus, hanya dinonaktifkan, supaya namanya tetap terbaca di riwayat. PIN tiap orang diatur di Master → PIN profil.</p>
        <span class="dev-aksi-baris"><button type="button" class="tombol" data-aksi="dev-ke-pin">${ikon('gembok', 16)} PIN profil</button>
          <button type="button" class="tombol utama" data-aksi="dev-orang-baru">${ikon('tambah', 16)} Tambah orang</button></span></div>
      <div class="tabel-gulir"><table class="tabel dev-tabel"><thead><tr><th>Orang</th><th>Peran</th><th>Jabatan</th><th>Status</th><th></th></tr></thead>
        <tbody>${['manager', 'lead', 'staff'].map(p => semua.filter(o => o.peran === p).map(baris).join('')).join('')}</tbody></table></div>`;
  }
  function formOrang(o) {
    const x = o || { id: '', nama: '', pendek: '', peran: 'staff', jabatan: '', lead: '', tim: '', aktif: true };
    const manager = x.id === I.MANAGER;
    const atasan = I.ORANG.filter(p => p.peran !== 'staff' && p.id !== x.id);
    return `<form data-form="orang" novalidate>
      <h2>${o ? `Ubah ${esc(x.pendek)}` : 'Tambah orang'}</h2>
      <div class="dua-isian">
        <label class="isian">Nama lengkap<input name="nama" value="${esc(x.nama)}" maxlength="60" required></label>
        <label class="isian">Nama panggilan<input name="pendek" value="${esc(x.pendek)}" maxlength="20" required autocomplete="off"><small>Untuk @sebut: huruf saja, tanpa spasi.</small></label>
      </div>
      <label class="isian">Jabatan<input name="jabatan" value="${esc(x.jabatan || '')}" maxlength="80"></label>
      <div class="dua-isian">
        <label class="isian">Peran<select name="peran" ${manager ? 'disabled' : ''}>${opsiHtml(manager ? [['manager', 'Manager']] : [['staff', 'Staff'], ['lead', 'Lead']], x.peran)}</select></label>
        <label class="isian" data-bagian-orang="staff" ${x.peran === 'staff' ? '' : 'hidden'}>Atasan<select name="lead">${opsiHtml([['', '— pilih atasan —'], ...atasan.map(p => [p.id, `${p.nama} · ${I.PERAN[p.peran]}${p.peran === 'lead' ? ' ' + (p.tim || '') : ''}`])], x.lead || '')}</select></label>
        <label class="isian" data-bagian-orang="lead" ${x.peran === 'lead' ? '' : 'hidden'}>Tim yang dipimpin<select name="tim">${opsiHtml(I.TIM_LEAD.map(k => [k, `${k} · ${I.TIM[k].nama}`]), x.tim || 'AK')}</select></label>
      </div>
      ${manager ? '<p class="hint">Manager tetap Manager dan aktif: tinjauan dan keputusan proyek jatuh kepadanya.</p>'
        : `<label class="dev-cek"><input type="checkbox" name="aktif" ${x.aktif === false ? '' : 'checked'}> Aktif — bisa dipilih sebagai profil dan PIC</label>`}
      <p class="hint">${o ? `ID <code>${esc(x.id)}</code> tetap.` : 'ID dibuat dari nama panggilan dan tak bisa diubah sesudahnya.'} Lead baru menggantikan Lead lama timnya? Ubah dulu Lead lama (jadikan Staff), baru jadikan yang baru Lead.</p>
      ${kakiModal(o ? 'Simpan' : 'Tambah')}
    </form>`;
  }
  function idOrangBaru(pendek) {
    const dasar = String(pendek || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 17);
    const awal = /^[a-z]/.test(dasar) ? dasar : 'o' + dasar;
    const dipakai = new Set([...I.ORANG_BAWAAN, ...I.ORANG, ...I.nonaktif()].map(o => o.id).concat(I.DEV));
    if (awal.length >= 2 && !dipakai.has(awal)) return awal;
    for (let n = 2; n < 100; n++) if (!dipakai.has(awal + n)) return awal + n;
    return 'o' + Date.now().toString(36);
  }
  async function kirimOrang(form) {
    const f = Object.fromEntries(new FormData(form).entries());
    const lama = S.modal && S.modal.id ? I.orang(S.modal.id) : null;
    const manager = !!lama && lama.id === I.MANAGER;
    const aktif = form.querySelector('[name="aktif"]');
    const baris = {
      id: lama ? lama.id : idOrangBaru(f.pendek), nama: f.nama, pendek: String(f.pendek || '').trim(), jabatan: f.jabatan,
      peran: manager ? 'manager' : f.peran, lead: f.lead, tim: f.tim, aktif: manager ? true : !!(aktif && aktif.checked),
    };
    try { I.periksaOrang(baris, S.orangBaris); } catch (err) { return galatModal(err.message); }
    const tombol = form.querySelector('.tombol.utama');
    tombol.disabled = true;
    const h = await api('simpanOrang', [baris]);
    tombol.disabled = false;
    if (!h.success || !Array.isArray(h.orang)) return galatModal(h.message || 'Gagal menyimpan.');
    S.orangBaris = h.orang;
    S.orangSalah = I.aturOrang(S.orangBaris);
    tutupModal();
    render();
    toast(`${baris.pendek} ${lama ? 'disimpan' : 'ditambahkan'}. Orang lain melihat perubahannya saat membuka aplikasi lagi.`);
  }

  /* --- Moderasi --- */
  function devModerasi() {
    const pesan = [...susunan().perId.values()].filter(m => m.bersama && !m.dihapus).sort((a, b) => b.at - a.at).slice(0, 40);
    const foto = [...I.ORANG, ...I.nonaktif()].filter(o => punyaFoto(o.id));
    return `<section class="kartu-polos dev-kartu"><h2 class="judul-ikon">${ikon('obrolan', 18)} Pesan terbaru</h2>
        <p class="hint">Pesan yang dihapus mode Dev tampil "Pesan dihapus oleh Dev" untuk semua orang; isi aslinya tetap tercatat di tab obrolan. Moderasi juga bisa langsung dari gelembung pesan di Komunikasi.</p>
        ${pesan.length ? `<ul class="dev-pesan">${pesan.map(m => `<li>${avatar(m.oleh, 'kecil')}
            <div><p><b>${esc(I.orang(m.oleh).pendek)}</b> · ${esc(potong(judulRuang(m.ruang), 60))} · <small>${esc(relatif(m.at))}</small></p>
              <p class="dev-pesan-isi">${esc(potong(teksPolos(m.teks), 220))}</p></div>
            <span class="dev-aksi-baris"><button type="button" class="tombol kecil" data-aksi="kom-buka" data-ruang="${esc(m.ruang)}" data-pesan="${esc(m.id)}">Buka</button>
              <button type="button" class="tombol kecil bahaya" data-aksi="psn-moderasi" data-id="${esc(m.id)}">Hapus</button></span></li>`).join('')}</ul>`
          : '<p class="kosong-isi">Belum ada pesan bersama.</p>'}
      </section>
      <section class="kartu-polos dev-kartu"><h2 class="judul-ikon">${ikon('kamera', 18)} Foto profil</h2>
        ${foto.length ? `<div class="dev-foto">${foto.map(o => `<div class="dev-foto-item">${avatar(o.id, 'besar')}<span>${esc(o.pendek)}</span>
            <button type="button" class="tombol kecil bahaya" data-aksi="dev-foto-hapus" data-id="${esc(o.id)}">Hapus</button></div>`).join('')}</div>`
          : '<p class="kosong-isi">Belum ada yang memasang foto.</p>'}
      </section>`;
  }
  function moderasiPesan(id) {
    const m = susunan().perId.get(id);
    if (!modeDev() || !m || m.dihapus) return;
    if (!confirm(`Hapus pesan ${I.orang(m.oleh).pendek} untuk semua orang?\n\n"${potong(teksPolos(m.teks), 140)}"\n\nTampil sebagai "Pesan dihapus oleh Dev". Isi aslinya tetap tercatat di tab obrolan spreadsheet.`)) return;
    kirimPeristiwa({ jenis: 'moderasi', ruang: m.ruang, oleh: I.DEV, target: m.id }).then(segarkanDev);
  }
  async function hapusFotoOrang(id) {
    if (!confirm(`Hapus foto profil ${I.orang(id).pendek}? Avatarnya kembali ke inisial, untuk semua orang.`)) return;
    const h = await api('simpanFoto', [{ orang: id, gambar: '' }]);
    if (!h.success || !h.foto) return toast(h.message || 'Foto gagal dihapus.', true);
    S.foto.isi[id] = { gambar: '', diperbarui: h.foto.diperbarui };
    S.foto.sejak = Math.max(Number(S.foto.sejak) || 0, h.foto.diperbarui);
    simpanCacheFoto();
    pasangGayaFoto();
    segarkanDev();
    toast(`Foto ${I.orang(id).pendek} dihapus.`);
  }

  /* ---------- Master (0.14.0) ----------
     Daftar pilihan bersama — sub-stage, kategori paket & alurnya, platform, satuan, label
     prioritas, capaian, nama tim — dan PIN tiap profil. Hanya Manager dan Dev; bagian PIN profil
     hanya tampil di mode Dev (0.14.1). Tersimpan di tab master dan tab pin spreadsheet v2 dan
     berlaku bagi semua orang saat aplikasi dimuat ulang;
     aturannya (apa yang sah) di Inti. Yang sudah dipakai data tak dihapus, hanya dinonaktifkan:
     tak ditawarkan lagi, tapi data lamanya tetap terbaca. */

  const TAB_MASTER = [['substage', 'Sub-stage', 'lapis'], ['kategori', 'Kategori paket', 'kotak'], ['pilihan', 'Platform & satuan', 'daftar'],
    ['label', 'Label & bobot', 'sunting'], ['pin', 'PIN profil', 'gembok']];
  const NAMA_MASTER = { substage: 'Sub-stage', kategori: 'Kategori paket', platform: 'Platform', satuan: 'Satuan', prioritas: 'Prioritas', capaian: 'Capaian', tim: 'Nama tim' };
  const managerBerpin = () => I.ORANG.some(o => o.peran === 'manager' && S.berpin.has(o.id));
  const awalanKode = tahap => (tahap === 'V' ? 'DV' : tahap);
  /* PIN profil hanya untuk mode Dev; Manager (juga "Lihat sebagai" Manager) tak melihatnya. */
  const tabMaster = () => TAB_MASTER.filter(([id]) => id !== 'pin' || modeDev());

  function viewMaster() {
    const daftar = tabMaster();
    const tab = daftar.some(([id]) => id === S.mst.tab) ? S.mst.tab : 'substage';
    const isi = { substage: mstSub, kategori: mstKategori, pilihan: mstPilihan, label: mstLabel, pin: mstPin }[tab];
    return `<div class="judul-halaman"><div><h1>Master</h1><p>Daftar pilihan yang dipakai semua orang · tersimpan di spreadsheet v2, berlaku saat aplikasi dimuat ulang</p></div></div>
      ${modeDev() && !managerBerpin() ? `<p class="banner kuning mst-banner">${ikon('gembok', 16)}<span>Master masih terbuka: siapa pun yang memilih profil Manager bisa mengubahnya, karena Manager belum ber-PIN. Pasang PIN Manager di bagian <b>PIN profil</b>.</span></p>` : ''}
      ${Object.entries(S.masterSalah || {}).map(([j, alasan]) => `<p class="banner kuning mst-banner"><span>${esc(NAMA_MASTER[j] || j)} di tab master diabaikan, kembali ke bawaan: ${esc(alasan)} Simpan ulang isiannya dari sini untuk membetulkannya.</span></p>`).join('')}
      <div class="segmen dev-tab mst-tab" role="group" aria-label="Bagian Master">${daftar.map(([id, l, ik]) => `<button type="button" data-aksi="mst-tab" data-nilai="${id}" aria-pressed="${tab === id}">${ikon(ik, 16)}<span>${l}</span></button>`).join('')}</div>
      <div id="mst-isi">${isi()}</div>`;
  }

  /* Satu isian → server → semua daftar hidup diperbarui. form = tempat galatnya ditampilkan. */
  async function simpanMaster(jenis, isian, form) {
    try { I.periksaMaster(jenis, isian, S.masterBaris); } catch (err) { return gagalMaster(err.message, form); }
    const tombol = form && form.querySelector('button:not([type="button"])');
    if (tombol) tombol.disabled = true;
    const h = await api('simpanMaster', [jenis, isian]);
    if (tombol) tombol.disabled = false;
    if (!h.success || !Array.isArray(h.master)) return gagalMaster(h.message || 'Gagal menyimpan.', form);
    S.masterBaris = h.master;
    S.masterSalah = I.aturMaster(S.masterBaris);
    return true;
  }
  function gagalMaster(pesan, form) {
    if (form && form.closest('#modal-panel')) galatModal(pesan); else toast(pesan, true);
    return false;
  }
  const urutanBerikut = jenis => Math.max(0, ...I.daftarMaster(jenis).map(x => Number(x.urutan) || 0).filter(n => n < 999)) + 1;
  const tombolUrut = (jenis, kunci, i, n) => [[-1, 'naik', 'Naikkan'], [1, 'turun', 'Turunkan']].map(([arah, ik, label]) =>
    `<button type="button" class="ikon-tombol mst-urut" data-aksi="mst-urut" data-jenis="${jenis}" data-kunci="${esc(kunci)}" data-arah="${arah}" ${(arah < 0 ? i > 0 : i < n - 1) ? '' : 'disabled'} aria-label="${label} ${esc(kunci)}">${ikon(ik, 16)}</button>`).join('');
  /* Pindah satu tempat: urutan barunya di antara dua tetangga di tujuan, jadi cukup satu baris berubah. */
  async function urutMaster(jenis, kunci, arah) {
    const daftar = I.daftarMaster(jenis);
    const i = daftar.findIndex(x => x.kunci === kunci);
    const j = i + arah;
    if (i < 0 || j < 0 || j >= daftar.length) return;
    const u = x => Number(x.urutan) || 999;
    const [a, b] = arah < 0 ? [daftar[j - 1], daftar[j]] : [daftar[j], daftar[j + 1]];
    const urutan = !a ? u(b) / 2 : !b ? u(a) + 1 : (u(a) + u(b)) / 2;
    if (await simpanMaster(jenis, { kunci, urutan }, null)) render();
  }
  async function aktifkanMaster(jenis, kunci, aktif) {
    if (!await simpanMaster(jenis, { kunci, aktif }, null)) return;
    render();
    toast(aktif ? `${kunci} aktif lagi.` : `${kunci} dinonaktifkan: tak ditawarkan lagi, data lamanya tetap terbaca.`);
  }

  /* --- Sub-stage --- */
  function mstSub() {
    const semua = I.daftarMaster('substage');
    const nTask = new Map();
    for (const t of S.data.tasks) if (t.sub) nTask.set(t.sub, (nTask.get(t.sub) || 0) + 1);
    const alur = new Map();
    for (const k of I.daftarMaster('kategori').filter(x => x.aktif)) {
      for (const l of k.alur) { const kode = l.split(':')[0]; alur.set(kode, new Set([...(alur.get(kode) || []), k.label])); }
    }
    const nonaktif = semua.filter(s => !s.aktif).length;
    const baris = s => {
      const tim = s.tim ? I.TIM[s.tim] : null;
      const pakai = [nTask.get(s.kunci) ? `${nTask.get(s.kunci)} task` : '', alur.has(s.kunci) ? 'alur ' + [...alur.get(s.kunci)].join(', ') : ''].filter(Boolean).join(' · ');
      return `<tr class="${s.aktif ? '' : 'nonaktif'}">
        <td><span class="${I.tahapDariKode(s.kunci) === 'R' ? 'chip-rutin' : 'chip-sub'}">${esc(s.kunci)}</span></td>
        <td>${esc(s.nama)}${pakai ? `<small class="mst-pakai">${esc(pakai)}</small>` : ''}</td>
        <td>${tim ? esc(`${tim.kode} · ${tim.nama}`) : '<span class="hint">tim pemilik output</span>'}</td>
        <td>${s.reviewManager ? 'Ya' : '—'}</td>
        <td>${s.aktif ? '<span class="chip-status hidup">Aktif</span>' : '<span class="chip-status mati">Nonaktif</span>'}</td>
        <td><button type="button" class="tombol kecil" data-aksi="mst-sub-ubah" data-kunci="${esc(s.kunci)}">${ikon('sunting', 14)} Ubah</button></td></tr>`;
    };
    const grup = [...I.TAHAP.map(t => [t.id, `${awalanKode(t.id)} · ${t.nama}`]), ['R', 'R · Rutin, di luar proyek']];
    return `<div class="dev-alat"><p class="hint">Kode sub-stage menentukan tahap ADDIE task, tim pemiliknya (Lead tim itu menerima task-nya di antrean), dan apakah task-nya direview Manager. ${semua.length} sub-stage${nonaktif ? `, ${nonaktif} nonaktif` : ''}. Yang nonaktif tak ditawarkan untuk task baru; task lamanya tetap terbaca.</p>
        <button type="button" class="tombol utama" data-aksi="mst-sub-baru">${ikon('tambah', 16)} Tambah sub-stage</button></div>
      <div class="tabel-gulir"><table class="tabel dev-tabel mst-tabel"><thead><tr><th>Kode</th><th>Nama</th><th>Tim pemilik</th><th>Review Manager</th><th>Status</th><th></th></tr></thead>
        <tbody>${grup.map(([id, judul]) => {
          const isi = semua.filter(s => I.tahapDariKode(s.kunci) === id);
          return isi.length ? `<tr class="baris-grup"><td colspan="6">${esc(judul)}</td></tr>${isi.map(baris).join('')}` : '';
        }).join('')}</tbody></table></div>`;
  }
  function kodeSubBerikut(tahap) {
    const awal = awalanKode(tahap);
    const ada = new Set(I.daftarMaster('substage').map(s => s.kunci));
    for (let n = 1; n < 100; n++) if (!ada.has(awal + n)) return awal + n;
    return '';
  }
  function formMasterSub(s) {
    const x = s || { kunci: '', nama: '', tim: '', reviewManager: false, aktif: true };
    const tahap = s ? I.tahapDariKode(s.kunci) : 'V';
    const opsiTahap = [...I.TAHAP.map(t => [t.id, `${awalanKode(t.id)} · ${t.nama}`]), ['R', 'R · Rutin']];
    return `<form data-form="mst-sub" novalidate>
      <h2>${s ? `Ubah ${esc(s.kunci)}` : 'Tambah sub-stage'}</h2>
      ${s ? `<p class="hint">Kode <code>${esc(s.kunci)}</code> tetap: dipakai task yang sudah ada.</p>`
    : `<div class="dua-isian"><label class="isian">Tahap<select name="tahap">${opsiHtml(opsiTahap, tahap)}</select></label>
          <label class="isian">Kode<input name="kunci" value="${esc(kodeSubBerikut(tahap))}" maxlength="4" autocomplete="off" required><small>Terisi sendiri: nomor berikutnya di tahap itu.</small></label></div>`}
      <label class="isian">Nama<input name="nama" value="${esc(x.nama)}" maxlength="80" required></label>
      <label class="isian">Tim pemilik<select name="tim">${opsiHtml([['', '— tim pemilik output yang dikerjakan —'], ...Object.values(I.TIM).map(t => [t.kode, `${t.kode} · ${t.nama}`])], x.tim || '')}</select>
        <small>Lead tim ini memegang task-nya (masuk antrean di Hari Ini-nya) dan membaginya ke staff lewat task anak. Kosong: dipegang tim pemilik output yang dikerjakan, mis. revisi.</small></label>
      <label class="dev-cek" data-bagian-sub="review" ${tahap === 'R' ? 'hidden' : ''}><input type="checkbox" name="reviewManager" ${x.reviewManager ? 'checked' : ''}> Direview Manager sebelum selesai</label>
      ${s ? `<label class="dev-cek"><input type="checkbox" name="aktif" ${x.aktif ? 'checked' : ''}> Aktif — ditawarkan untuk task baru</label>` : ''}
      ${kakiModal(s ? 'Simpan' : 'Tambah')}
    </form>`;
  }
  async function kirimMasterSub(form) {
    const lama = S.modal && S.modal.kunci ? I.daftarMaster('substage').find(s => s.kunci === S.modal.kunci) : null;
    const el = n => form.elements.namedItem(n);
    const isian = {
      ...(lama ? { kunci: lama.kunci, aktif: el('aktif').checked } : { baru: true, kunci: el('kunci').value }),
      nama: el('nama').value, tim: el('tim').value, reviewManager: el('reviewManager').checked,
    };
    if (!await simpanMaster('substage', isian, form)) return;
    tutupModal();
    render();
    toast(`${lama ? lama.kunci + ' disimpan' : String(isian.kunci).trim().toUpperCase() + ' ditambahkan'}. Orang lain melihatnya saat membuka aplikasi lagi.`);
  }

  /* --- Kategori paket & alurnya --- */
  function mstKategori() {
    const semua = I.daftarMaster('kategori');
    const nItem = new Map();
    for (const p of S.data.packages) for (const i of p.items) nItem.set(i.kategori, (nItem.get(i.kategori) || 0) + 1);
    return `<div class="dev-alat"><p class="hint">Kategori item rancangan paket, urutannya di paket, dan alur langkahnya saat dielaborasi jadi proyek. Langkah bertanda capaian menaikkan progres paket.</p>
        <button type="button" class="tombol utama" data-aksi="mst-kat-baru">${ikon('tambah', 16)} Tambah kategori</button></div>
      <div class="mst-kategori">${semua.map((k, i) => `<section class="kartu-polos mst-kat ${k.aktif ? '' : 'nonaktif'}">
          <div class="mst-kat-kepala"><h2>${esc(k.label)}</h2>${k.aktif ? '' : '<span class="chip-status mati">Nonaktif</span>'}
            <span class="dev-aksi-baris">${tombolUrut('kategori', k.kunci, i, semua.length)}
              <button type="button" class="tombol kecil" data-aksi="mst-kat-ubah" data-kunci="${esc(k.kunci)}">${ikon('sunting', 14)} Ubah</button></span></div>
          <p class="hint">${nItem.get(k.label) ? `${nItem.get(k.label)} item paket` : 'Belum dipakai paket'} · ${k.alur.length} langkah</p>
          <ol class="mst-alur">${k.alur.map(l => {
            const [kode, cap] = l.split(':');
            const s = I.subTahap(kode);
            return `<li title="${esc(s ? s.nama : kode)}"><b>${esc(kode)}</b>${cap ? `<span class="mst-capaian">${esc(I.namaCapaian(cap))}</span>` : ''}</li>`;
          }).join('')}</ol>
        </section>`).join('')}</div>`;
  }
  function opsiLangkah(terpilih) {
    return '<option value="">— pilih sub-stage —</option>' + I.TAHAP.map(t => {
      const isi = I.SUB_TAHAP.filter(s => s.tahap === t.id && (s.aktif !== false || s.kode === terpilih));
      return isi.length ? `<optgroup label="${esc(t.nama)}">${isi.map(s => `<option value="${s.kode}" ${s.kode === terpilih ? 'selected' : ''}>${s.kode} · ${esc(s.nama)}</option>`).join('')}</optgroup>` : '';
    }).join('');
  }
  function barisLangkah(l = '') {
    const [kode = '', cap = ''] = String(l).split(':');
    return `<li class="mst-langkah" data-langkah>
      <select class="input" name="l-kode" aria-label="Sub-stage langkah">${opsiLangkah(kode)}</select>
      <select class="input" name="l-capaian" aria-label="Capaian langkah">${opsiHtml([['', 'Tanpa capaian'], ...I.CAPAIAN.map(c => [c.kode, `${c.nama} · ${Math.round(c.bobot * 100)}%`])], cap)}</select>
      <span class="mst-langkah-aksi"><button type="button" class="ikon-tombol" data-aksi="mst-langkah-naik" aria-label="Naikkan langkah">${ikon('naik', 16)}</button><button type="button" class="ikon-tombol" data-aksi="mst-langkah-hapus" aria-label="Hapus langkah">${ikon('hapus', 16)}</button></span>
    </li>`;
  }
  function formMasterKategori(k) {
    const alur = k ? k.alur : ['DV1', 'E1:konten', 'DV8:input', 'E6:qc', 'I4:tayang'];
    return `<form data-form="mst-kat" class="form-mst-kat" novalidate>
      <h2>${k ? `Ubah ${esc(k.label)}` : 'Tambah kategori'}</h2>
      ${k ? '<p class="hint">Nama kategori tetap: item paket merujuk ke nama ini.</p>'
    : '<label class="isian">Nama kategori<input name="label" maxlength="40" required placeholder="mis. Bank Soal"></label>'}
      <div class="isian"><span>Alur langkah</span>
        <ol class="mst-langkah-daftar">${alur.map(barisLangkah).join('')}</ol>
        <button type="button" class="tombol kecil mst-langkah-tambah" data-aksi="mst-langkah-tambah">${ikon('tambah', 14)} Tambah langkah</button>
        <small>Urut dari atas. Capaian menandai langkah yang menaikkan progres paket: urutannya ${I.CAPAIAN.map(c => esc(c.nama)).join(' → ')}, masing-masing sekali, dan langkah ${esc(I.namaCapaian('tayang'))} wajib ada.</small></div>
      ${k ? `<label class="dev-cek"><input type="checkbox" name="aktif" ${k.aktif ? 'checked' : ''}> Aktif — ditawarkan untuk item paket baru</label>` : ''}
      ${kakiModal(k ? 'Simpan' : 'Tambah')}
    </form>`;
  }
  async function kirimMasterKategori(form) {
    const lama = S.modal && S.modal.kunci ? I.daftarMaster('kategori').find(k => k.kunci === S.modal.kunci) : null;
    const alur = $$('[data-langkah]', form).map(li => {
      const kode = $('[name="l-kode"]', li).value;
      const cap = $('[name="l-capaian"]', li).value;
      return kode ? (cap ? `${kode}:${cap}` : kode) : '';
    });
    if (!alur.length || alur.some(l => !l)) return galatModal('Pilih sub-stage untuk setiap langkah, atau hapus langkah yang kosong.');
    const isian = lama ? { kunci: lama.kunci, alur, aktif: form.elements.namedItem('aktif').checked }
      : { baru: true, label: form.elements.namedItem('label').value, alur, urutan: urutanBerikut('kategori') };
    if (!await simpanMaster('kategori', isian, form)) return;
    tutupModal();
    render();
    toast(`Kategori ${lama ? lama.label + ' disimpan' : String(isian.label).trim() + ' ditambahkan'}. Orang lain melihatnya saat membuka aplikasi lagi.`);
  }

  /* --- Platform & satuan --- */
  function mstPilihan() {
    const kartu = (jenis, judul, ket, contoh, maks) => {
      const semua = I.daftarMaster(jenis);
      return `<section class="kartu-polos dev-kartu"><h2>${judul}</h2><p class="hint">${ket}</p>
        <ul class="mst-daftar">${semua.map((x, i) => `<li class="${x.aktif ? '' : 'nonaktif'}">
            <span class="mst-nama">${esc(x.kunci)}</span>${x.aktif ? '' : '<span class="chip-status mati">Nonaktif</span>'}
            <span class="dev-aksi-baris">${tombolUrut(jenis, x.kunci, i, semua.length)}
              <button type="button" class="tombol kecil" data-aksi="mst-aktif" data-jenis="${jenis}" data-kunci="${esc(x.kunci)}" data-nilai="${x.aktif ? '0' : '1'}">${x.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button></span></li>`).join('')}</ul>
        <form class="mst-tambah" data-form="mst-tambah" data-jenis="${jenis}" novalidate>
          <input class="input" name="kunci" maxlength="${maks}" placeholder="${esc(contoh)}" aria-label="${esc(judul)} baru" autocomplete="off">
          <button class="tombol">${ikon('tambah', 16)} Tambah</button></form>
      </section>`;
    };
    return `<div class="dev-grid">
        ${kartu('platform', 'Platform', 'Pilihan platform untuk proyek dan rancangan paket. Namanya tersimpan di data, jadi tak bisa diganti; yang tak dipakai lagi dinonaktifkan.', 'Platform baru, mis. SNBT', 40)}
        ${kartu('satuan', 'Satuan target', 'Satuan target item paket, mis. Paket, BAB, Video.', 'Satuan baru, mis. Modul', 20)}
      </div>`;
  }
  async function kirimMasterTambah(form) {
    const jenis = form.dataset.jenis;
    const kunci = form.elements.namedItem('kunci').value.replace(/\s+/g, ' ').trim();
    if (!kunci) return toast(`Isi nama ${jenis} barunya dulu.`, true);
    if (!await simpanMaster(jenis, { baru: true, kunci, urutan: urutanBerikut(jenis) }, form)) return;
    render();
    toast(`${kunci} ditambahkan. Orang lain melihatnya saat membuka aplikasi lagi.`);
  }

  /* --- Label & bobot --- */
  function mstLabel() {
    const baris = (jenis, kunci, isi) => `<form class="mst-baris" data-form="mst-label" data-jenis="${jenis}" data-kunci="${esc(kunci)}" novalidate>${isi}<button class="tombol kecil">Simpan</button></form>`;
    return `<div class="dev-grid">
      <section class="kartu-polos dev-kartu"><h2>Label prioritas</h2><p class="hint">Tingkatnya tetap empat (dipakai mengurutkan); labelnya yang tampil di task.</p>
        ${I.daftarMaster('prioritas').map(p => baris('prioritas', p.kunci, `<span class="mst-kunci">${esc(p.kunci)}</span><input class="input" name="label" value="${esc(p.label)}" maxlength="20" aria-label="Label prioritas ${esc(p.kunci)}">`)).join('')}
      </section>
      <section class="kartu-polos dev-kartu"><h2>Nama tim</h2><p class="hint">Kodenya tetap. Lead tiap tim diatur lewat mode Dev (Pengguna).</p>
        ${I.daftarMaster('tim').map(t => baris('tim', t.kunci, `<span class="mst-kunci">${esc(t.kunci)}</span><input class="input" name="nama" value="${esc(t.nama)}" maxlength="40" aria-label="Nama tim ${esc(t.kunci)}">`)).join('')}
      </section>
      <section class="kartu-polos dev-kartu dev-lebar"><h2>Capaian & bobot progres paket</h2>
        <p class="hint">Bobot naik berurutan dan ${esc(I.namaCapaian('tayang'))} selalu 100%. Menaikkan bobot: simpan dari bawah (QC) ke atas; menurunkan: dari atas.</p>
        ${I.daftarMaster('capaian').map(c => baris('capaian', c.kunci, `<span class="mst-kunci">${esc(c.kunci)}</span><input class="input" name="nama" value="${esc(c.nama)}" maxlength="30" aria-label="Nama capaian ${esc(c.kunci)}">
          <label class="mst-bobot"><input class="input angka" name="bobot" value="${esc(c.bobot)}" inputmode="numeric" maxlength="3" ${c.kunci === 'tayang' ? 'readonly' : ''} aria-label="Bobot ${esc(c.kunci)} (%)"><span>%</span></label>`)).join('')}
      </section>
    </div>`;
  }
  async function kirimMasterLabel(form) {
    const isian = { kunci: form.dataset.kunci, ...Object.fromEntries(new FormData(form).entries()) };
    if (!await simpanMaster(form.dataset.jenis, isian, form)) return;
    render();
    toast('Disimpan. Orang lain melihatnya saat membuka aplikasi lagi.');
  }

  /* --- PIN profil --- */
  function mstPin() {
    const baris = o => {
      const ada = S.berpin.has(o.id);
      return `<tr>
        <td><span class="dev-orang">${avatar(o.id)}<span><strong>${esc(o.nama)}</strong><small>${esc(I.PERAN[o.peran])}${o.jabatan ? ' · ' + esc(o.jabatan) : ''}</small></span></span></td>
        <td>${ada ? `<span class="chip-status hidup">${ikon('gembok', 12)} Ber-PIN</span>` : '<span class="chip-status mati">Tanpa PIN</span>'}</td>
        <td><span class="dev-aksi-baris">
          <button type="button" class="tombol kecil" data-aksi="mst-pin-atur" data-id="${esc(o.id)}">${ada ? 'Ganti PIN' : 'Pasang PIN'}</button>
          ${ada ? `<button type="button" class="tombol kecil bahaya" data-aksi="mst-pin-hapus" data-id="${esc(o.id)}">Hapus</button>` : ''}
        </span></td></tr>`;
    };
    return `<div class="dev-alat"><p class="hint">Bagian ini hanya tampil di mode Dev. PIN profil (4–8 angka) diminta saat memilih profil itu. Orang lain yang tahu PIN aplikasi tak bisa masuk sebagai dia, menulis pesan atas namanya, atau mengganti fotonya. PIN disimpan sebagai sidik (hash) di tab <b>pin</b>; tak ada yang bisa membacanya, termasuk Dev. Lupa PIN? Pasang PIN baru di sini.</p></div>
      <div class="tabel-gulir"><table class="tabel dev-tabel"><thead><tr><th>Profil</th><th>PIN</th><th></th></tr></thead>
        <tbody>${['manager', 'lead', 'staff'].map(p => I.ORANG.filter(o => o.peran === p).map(baris).join('')).join('')}</tbody></table></div>`;
  }
  function formPin(id) {
    const o = I.orang(id);
    return `<form data-form="mst-pin" novalidate>
      <h2 class="judul-ikon">${ikon('gembok', 20)} PIN ${esc(o.pendek)}</h2>
      <p class="hint">Sampaikan PIN barunya langsung ke ${esc(o.pendek)}, jangan lewat pesan di aplikasi.</p>
      <div class="dua-isian">
        <label class="isian">PIN baru<input name="pin" type="password" inputmode="numeric" autocomplete="new-password" maxlength="8" required></label>
        <label class="isian">Ulangi PIN<input name="ulang" type="password" inputmode="numeric" autocomplete="new-password" maxlength="8" required></label>
      </div>
      <p class="hint">4–8 angka.${o.peran === 'manager' && !managerBerpin() ? ' Begitu PIN Manager terpasang, Master hanya bisa diubah Manager (dengan PIN-nya) dan Dev.' : ''}</p>
      ${kakiModal('Simpan PIN')}
    </form>`;
  }
  /* pin '' = hapus. Hanya mode Dev (server menolak sesi lain). */
  async function aturPin(id, pin, form) {
    const h = await api('aturPin', [id, pin]);
    if (!h.success || !Array.isArray(h.berpin)) return gagalMaster(h.message || 'PIN gagal disimpan.', form);
    S.berpin = new Set(h.berpin);
    return true;
  }
  async function kirimFormPin(form) {
    const pin = form.elements.namedItem('pin').value.trim();
    if (!/^\d{4,8}$/.test(pin)) return galatModal('PIN 4–8 angka.');
    if (pin !== form.elements.namedItem('ulang').value.trim()) return galatModal('Kedua PIN tidak sama.');
    const id = S.modal.id;
    const tombol = form.querySelector('.tombol.utama');
    tombol.disabled = true;
    const ok = await aturPin(id, pin, form);
    tombol.disabled = false;
    if (!ok) return;
    tutupModal();
    render();
    toast(`PIN ${I.orang(id).pendek} disimpan.`);
  }
  async function hapusPin(id) {
    const o = I.orang(id);
    const manager = o.peran === 'manager';
    if (!confirm(`Hapus PIN ${o.pendek}? Profilnya bisa dipilih tanpa PIN lagi.${manager ? '\n\nIni PIN Manager: Master jadi terbuka lagi bagi siapa pun yang memilih profil Manager.' : ''}`)) return;
    if (!await aturPin(id, '', null)) return;
    render();
    toast(`PIN ${o.pendek} dihapus.`);
  }

  /* ---------- Riwayat Aktivitas ---------- */

  function viewRiwayat() {
    const f = S.rwy;
    return `<div class="judul-halaman"><div><h1>Riwayat Aktivitas</h1><p>Semua perubahan, terbaru di atas · ${S.data.log.length} catatan tersimpan</p></div></div>
      <div class="alat">
        ${kotakCari('riwayat', f.q, 'Cari task, isi, orang…')}
        ${pilihan('rwy', 'jenis', f.jenis, [['', 'Semua jenis'], ...Object.entries(I.JENIS_LOG)], 'Jenis')}
        ${pilihan('rwy', 'orang', f.orang, [['', 'Semua orang'], ...I.ORANG.map(o => [o.id, o.nama])], 'Orang')}
      </div>
      <div id="hasil">${hasilRiwayat()}</div>`;
  }

  function hasilRiwayat() {
    const semua = I.saringLog(S.data.log, S.rwy);
    if (!semua.length) return '<div class="kosong-isi">Tidak ada aktivitas yang cocok.</div>';
    const isi = semua.slice(0, S.rwy.batas);
    const perHari = new Map();
    for (const l of isi) {
      const k = I.isoHari(l.at) || 'tanpa-tanggal';
      if (!perHari.has(k)) perHari.set(k, []);
      perHari.get(k).push(l);
    }
    const perId = I.indeks(S.data);
    return [...perHari.entries()].map(([hari, daftar]) => `<section class="grup-log">
        <h2>${hari === 'tanpa-tanggal' ? 'Tanpa tanggal' : esc(fmtTanggalPanjang(hari))}</h2>
        <ul>${daftar.map(l => {
          const m = /^(PRD-\d+)/.exec(String(l.task));
          const t = m && perId.get(m[1]);
          return `<li class="log-baris"><time>${l.at ? esc(fmtJam(l.at)) : ''}</time>${avatar(l.by || '?', 'kecil')}
            <div><p><strong>${nama(l.by)}</strong>${tandaAi(l.ai)} <span class="chip-jenis jenis-${esc(l.type)}">${esc(I.JENIS_LOG[l.type] || l.type)}</span>
              ${t ? `<button type="button" class="tautan-task" data-aksi="buka-task" data-id="${esc(t.id)}">${esc(l.task)}</button>` : `<span>${esc(l.task)}</span>`}</p>
              ${l.detail ? `<p class="hint">${esc(l.detail)}</p>` : ''}</div></li>`;
        }).join('')}</ul></section>`).join('')
      + (semua.length > isi.length ? `<div class="halaman-nav"><button type="button" class="tombol kecil" data-aksi="rwy-lagi">Tampilkan 100 lagi</button><span class="hint">${isi.length} dari ${semua.length}</span></div>` : '');
  }

  /* ---------- Panduan ----------
     Isi dan pencari contohnya di panduan.js. Ilustrasinya dibuat di sini dari komponen
     aplikasi dengan teks contoh, bukan tangkapan layar: selalu sesuai tampilan, dan berkas
     publik tak memuat data sungguhan. "Coba sekarang" berpindah ke profil dan halaman
     contohnya, lalu langkah panduannya tampil di kotak melayang (#pemandu). */

  const P = window.Panduan || { BAGIAN: [], ILUSTRASI: [], PANDUAN: [], ISTILAH: [], cariContoh: () => null };
  const tebal = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const tanya = (id, label) => `<button type="button" class="tanya" data-aksi="panduan" data-id="${esc(id)}" title="Panduan: ${esc(label)}" aria-label="Panduan: ${esc(label)}">?</button>`;
  const tabPeran = () => ({ staff: 'staff', lead: 'lead', manager: 'manager' })[I.orang(S.me).peran] || 'mulai';
  const tombolPalsu = (isi, kelas = '') => `<span class="tombol ${kelas}">${isi}</span>`;

  const ILUSTRASI = {
    palet: () => `<div class="palet palet-ilu"><span class="palet-cari">${ikon('cari', 18)}<span>latsol matematika</span><kbd>${PINTASAN}</kbd></span>
      <p class="palet-grup">Task</p>
      <span class="palet-item aktif">${ikon('tugas', 16)}<span>DV8 · Latsol Matematika — 5 Paket</span><small>Dikerjakan</small></span>
      <span class="palet-item">${ikon('tugas', 16)}<span>E1 · Latsol Matematika — 5 Paket</span><small>Antre</small></span>
      <p class="palet-grup">Aksi</p>
      <span class="palet-item">${ikon('tambah', 16)}<span>Tambah task</span></span></div>`,
    reset: () => `<div class="kotak-data"><p class="samping-catatan">Data contoh. Perubahan hanya tersimpan di browser ini.</p>
      ${tombolPalsu(`${ikon('ulang', 16)} Reset data contoh`, 'kecil tombol-reset')}</div>`,
    status: () => `<div class="ilu-baris">${I.STATUS.map(pillStatus).join('<span class="ilu-panah">→</span>')}</div>
      <div class="ilu-baris">${['Siap', 'Menunggu', 'Revisi', 'Tertahan'].map(l => `<span class="pill ${LABEL[l][0]}">${l}</span>`).join('')}</div>`,
    kode: () => [['DV8', 'proyek'], ['E1', 'proyek'], ['R3', 'rutin'], ['A2', 'lepas']].map(([k, jalur]) => {
      const s = I.subTahap(k);
      const chip = jalur === 'rutin' ? `<span class="chip-rutin">${k}</span>` : `<span class="chip-sub ${jalur === 'lepas' ? 'lepas' : ''}">${k}</span>`;
      return `<div class="ilu-kode">${chip}<span>${esc(s.nama)}</span>${chipTim(s.tim)}<small>${jalur}</small></div>`;
    }).join(''),
    tahap: () => `<small class="ilu-ket">Sedang di Development</small>${jalurTahap({ stage: 'V', cycle: 1 })}
      <small class="ilu-ket">Siklus selesai, E12 disetujui</small>${jalurTahap({ stage: 'E', cycle: 1 }, '', true)}`,
    progres: () => `${batangPaket({ persen: 62, persenTayang: 40, persenDigarap: 25 })}<small class="ilu-ket">Progres 62% · 40% sudah tayang · 25% sedang digarap</small>
      ${legendaPaket}<ul class="bobot-capaian">${I.CAPAIAN.map(c => `<li><b>${Math.round(c.bobot * 100)}%</b> ${esc(c.nama)}</li>`).join('')}</ul>`,
    // Label syaratnya diambil dari aturan, supaya ilustrasi tak bisa berbeda dari layar sungguhan.
    syarat: () => `<p class="subjudul">Syarat ajukan <span class="pill lb-revisi">2 belum</span></p>
      <ul class="syarat">${I.syaratAjukan({ lane: 'proyek', project: 'contoh', stage: 'V', output: '', evidence: [], subtasks: [], deps: [], tertahan: false }, new Map())
        .map(x => `<li class="${x.ok ? 'ok' : 'kurang'}">${ikon(x.ok ? 'centang' : 'bulat', 18)}<span>${esc(x.label)}</span></li>`).join('')}</ul>
      ${tombolPalsu('Ajukan tinjau ke Alya', 'utama mati')}`,
    revisi: () => `<div class="ilu-baris">${pillStatus('Dikerjakan')}<span class="pill lb-revisi">Revisi</span></div>
      <p class="subjudul">Riwayat tinjauan</p>
      <ul class="riwayat"><li><strong>Dikembalikan</strong> oleh Andika <small>· 2 hari lalu</small><br>Bobot soal nomor 12–15 belum sesuai kisi-kisi.</li>
        <li><strong>Diajukan</strong> oleh Wildan <small>· 3 hari lalu</small></li></ul>`,
    tahan: () => `<div class="banner merah">Tertahan: Menunggu akses SIADU untuk tahun ajaran baru.</div><div class="ilu-baris">${tombolPalsu('Lepas tanda tertahan')}</div>`,
    antrean: () => `<p class="subjudul">Task anak</p>
      <div class="ilu-task">${pillStatus('Dikerjakan')}<span><b>DV8 · Latsol Fisika — 3 Paket</b><small><span class="chip-sub">DV8</span> Input ke SIADU/Markaz · 0/1 task anak</small></span></div>
      <div class="ilu-task ilu-anak">${pillStatus('Antre')}<span><b>Input paket 1–3</b><small>Kiki · ditinjau Alya</small></span></div>
      <div class="ilu-baris">${tombolPalsu('Kiki ▾', 'input-palsu')}${tombolPalsu(`${ikon('tambah', 16)} Buat task anak`)}</div>`,
    tinjau: () => `<p class="subjudul">Output & bukti</p><p class="teks-panjang">40 soal Latsol Fisika lolos QC</p>
      <p class="ilu-tautan">${ikon('tautan', 16)} Google Sheets · hasil QC</p>
      <div class="ilu-baris">${tombolPalsu('Setujui', 'utama')}${tombolPalsu('Kembalikan', 'bahaya')}</div>`,
    formtask: () => `<div class="ilu-isian"><small>Sub-stage</small>${tombolPalsu('DV8 · Input ke SIADU/Markaz (LA) ▾', 'input-palsu')}<small class="ilu-ket">${esc(hintSub('DV8'))}</small></div>
      <div class="ilu-isian"><small>PIC</small>${tombolPalsu('Alya · Lead tim pemilik ▾', 'input-palsu')}</div>`,
    elaborasi: () => `<ol class="ilu-alur">${I.langkahAlur('Latsol').map(l => {
      const cap = l.capaian ? I.CAPAIAN.find(c => c.kode === l.capaian) : null;
      return `<li><span class="chip-sub">${l.kode}</span><span>${esc(I.subTahap(l.kode).nama)}${cap ? `<em>${esc(cap.nama)} ${Math.round(cap.bobot * 100)}%</em>` : ''}</span></li>`;
    }).join('')}</ol>`,
    keputusan: () => `<div class="banner hijau">Siklus 1 selesai: semua langkah sampai E12 disetujui.</div>
      <div class="daftar-pilihan">${[['Selesai, arsipkan', 'utama', 'Proyek tuntas.'], ['Mulai siklus 2', '', 'Ulangi dari Analysis.'], ['Tahan', '', 'Keputusan ditunda.']]
        .map(([t, k, ket]) => `<div class="pilihan-akhir">${tombolPalsu(t, k)}<span>${ket}</span></div>`).join('')}</div>`,
    bottleneck: () => `<div class="ilu-skor"><span class="skor tinggi">9</span><span>= 3 task orang lain menunggu dia × 2<br>+ 1 tinjauan menunggu dia × 2<br>+ 1 task telat</span></div>
      <div class="ilu-baris"><span class="skor">2</span><span class="ilu-ket">aman</span><span class="skor sedang">4</span><span class="ilu-ket">mulai menumpuk</span><span class="skor tinggi">7</span><span class="ilu-ket">perlu dibantu</span></div>`,
  };

  function kartuPanduan(g, no, buka) {
    const c = g.coba ? P.cariContoh(g.id, S.data, I, hariIni(), S.me) : null;
    const siapa = c && c.profil && c.profil !== S.me ? ` sebagai ${I.orang(c.profil).pendek}` : '';
    const gambar = g.ilustrasi && ILUSTRASI[g.ilustrasi] ? `<div class="ilustrasi" role="img" aria-label="Ilustrasi: ${esc(g.judul)}">${ILUSTRASI[g.ilustrasi]()}</div>` : '';
    return `<details class="kartu-panduan" id="pnd-${esc(g.id)}" ${buka ? 'open' : ''}>
      <summary><span class="pnd-no">${no}</span><span class="pnd-teks"><span class="pnd-judul">${esc(g.judul)}</span><small>${esc(g.tujuan)}</small></span>${ikon('bawah', 18)}</summary>
      <div class="pnd-isi ${gambar ? '' : 'tanpa-gambar'}">
        <ol class="pnd-langkah">${g.langkah.map(l => `<li>${tebal(l)}</li>`).join('')}</ol>
        ${gambar}
      </div>
      ${g.coba ? `<div class="pnd-coba">${S.mode === 'real'
        ? '<p class="hint"><strong>Coba sekarang</strong> hanya untuk data contoh. Aplikasi sedang memakai data real, jadi langkah ini langsung dikerjakan pada pekerjaan sungguhan.</p>'
        : c
        ? `<button type="button" class="tombol utama" data-aksi="coba" data-id="${esc(g.id)}">${ikon('kanan', 16)} Coba sekarang${esc(siapa)}</button><small>${esc(c.ket || '')}</small>`
        : '<p class="hint">Contohnya sudah terpakai di data ini. Tekan <strong>Reset data contoh</strong> di kaki sidebar untuk mengembalikannya.</p>'}</div>` : ''}
    </details>`;
  }

  function viewPanduan() {
    const tab = P.BAGIAN.some(b => b.id === S.pnd.tab) ? S.pnd.tab : 'mulai';
    const bagian = P.BAGIAN.find(b => b.id === tab) || { ket: '' };
    const daftar = P.PANDUAN.filter(g => g.peran === tab);
    const buka = daftar.some(g => g.id === S.pnd.buka) ? S.pnd.buka : (daftar[0] || {}).id;
    const isi = tab === 'istilah'
      ? `<dl class="istilah">${P.ISTILAH.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${tebal(v)}</dd></div>`).join('')}</dl>`
      : `<div class="daftar-panduan">${daftar.map((g, i) => kartuPanduan(g, i + 1, g.id === buka)).join('')}</div>`;
    return `<div class="judul-halaman"><div><h1>Panduan</h1>
        <p>Cara memakai ProductTrack v2, langkah demi langkah. Tombol <strong>Coba sekarang</strong> membuka contohnya di data contoh, dan kotak langkah menemani selama Anda mencoba. Salah langkah tidak apa-apa: <strong>Reset data contoh</strong> di kaki sidebar mengembalikan semuanya.</p></div></div>
      <div class="segmen gulir" role="group" aria-label="Bagian panduan">${P.BAGIAN.map(b => `<button type="button" data-aksi="atur" data-ruang="pnd" data-kunci="tab" data-nilai="${b.id}" aria-pressed="${b.id === tab}">${esc(b.judul)}${b.id === tabPeran() ? '<small>peran Anda</small>' : ''}</button>`).join('')}</div>
      <p class="hint panduan-ket">${tebal(bagian.ket)}</p>
      ${isi}`;
  }

  /* Ajakan sekali per profil di halaman pertamanya; hilang setelah ditutup atau Panduan dibuka. */
  function ajakanPanduan() {
    if (ambil('kenal_' + S.me, false)) return '';
    return `<div class="ajakan">${ikon('buku', 22)}
      <div><strong>Baru mencoba ProductTrack v2?</strong><span>Panduan untuk ${esc(I.PERAN[I.orang(S.me).peran])} menjelaskan alurnya langkah demi langkah, lengkap dengan tombol Coba sekarang di data contoh.</span></div>
      <button type="button" class="tombol kecil utama" data-aksi="panduan-buka">Buka Panduan</button>
      <button type="button" class="ikon-tombol" data-aksi="kenal-tutup" aria-label="Tutup ajakan panduan">${ikon('tutup', 16)}</button>
    </div>`;
  }

  function bukaPanduan(id) {
    const g = P.PANDUAN.find(x => x.id === id);
    if (!g) return;
    Object.assign(S.pnd, { tab: g.peran, buka: g.id });
    simpanPref('pnd');
    pindahHalaman('panduan');
    setTimeout(() => { const el = document.getElementById('pnd-' + id); if (el) el.scrollIntoView({ block: 'start' }); }, 30);
  }

  function cobaPanduan(id) {
    // Di data real, mencoba berarti mengubah pekerjaan sungguhan (bisa atas nama profil lain).
    if (S.mode === 'real') return toast('Coba sekarang hanya untuk data contoh.', true);
    const c = P.cariContoh(id, S.data, I, hariIni(), S.me);
    if (!c) return toast('Contohnya sudah terpakai di data ini. Tekan Reset data contoh di kaki sidebar untuk mengembalikannya.', true);
    if (!bolehTinggalkanPaket()) return;
    // Profil ber-PIN (0.14.0) tak dipinjam lewat panduan: contohnya dibuka sebagai profil sendiri.
    const terkunci = !!c.profil && c.profil !== S.me && S.berpin.has(c.profil) && S.meSesi !== c.profil;
    const ganti = !!c.profil && c.profil !== S.me && !terkunci;
    if (ganti) {
      S.me = c.profil;
      simpan('me', S.me);
      S.kom.pilih = null;
      api('masukProfil', [S.me, '']).then(h => { if (h.success) S.meSesi = h.me || c.profil; });
    }
    simpan('kenal_' + S.me, 1);
    // Di ponsel kotak langkah mulai ringkas: kalau terbuka, ia menutupi laci detail tempat orang mencoba.
    Object.assign(S, { view: c.view, pilih: c.task || null, proyek: c.proyek || null, navBuka: false, pemandu: id, pemanduKecil: hp() });
    Object.assign(S.pkt, { pilih: c.paket || null, sunting: false, kotor: false });
    if (c.view === 'task') {
      // c.tugas = setelan halaman Task untuk contoh itu, mis. { lingkup: 'tim' }.
      Object.assign(S.task, { proyek: '', ...SARING_KOSONG, fokus: '', q: '', hal: 1 }, c.tugas || {}, c.tampilan ? { tampilan: c.tampilan } : {});
      simpanPref('task');
    }
    if (c.dash) Object.assign(S.dash, c.dash);
    simpan('halaman', S.view);
    render();
    window.scrollTo(0, 0);
    const o = I.orang(S.me);
    const arah = hp() ? 'Langkahnya ada di kotak panduan di bawah; ketuk untuk membukanya.' : 'Ikuti kotak langkah di bawah.';
    toast(ganti ? `Sekarang sebagai ${o.pendek} (${I.PERAN[o.peran]}). ${arah} Profil lain bisa dipilih lagi lewat Ganti profil.`
      : terkunci ? `Contoh ini milik ${I.orang(c.profil).pendek}, yang memakai PIN; Anda tetap sebagai ${o.pendek}. ${arah}` : arah);
  }

  /* Kotak langkah selama mencoba; tak tampil di halaman Panduan sendiri. */
  function renderPemandu() {
    const el = $('#pemandu');
    if (!el) return;
    const g = S.pemandu && P.PANDUAN.find(x => x.id === S.pemandu);
    el.hidden = !g || S.view === 'panduan';
    if (el.hidden) { el.innerHTML = ''; return; }
    el.classList.toggle('kecil', S.pemanduKecil);
    el.innerHTML = `<div class="pemandu-kepala">
        <button type="button" class="pemandu-buka" data-aksi="pemandu-kecil" aria-expanded="${!S.pemanduKecil}" title="${S.pemanduKecil ? 'Tampilkan langkah' : 'Sembunyikan langkah'}">
          ${ikon('buku', 16)}<span class="pemandu-judul">${esc(g.judul)}</span>${ikon(S.pemanduKecil ? 'atas' : 'bawah', 16)}</button>
        <button type="button" class="ikon-tombol" data-aksi="pemandu-tutup" aria-label="Tutup kotak panduan">${ikon('tutup', 16)}</button></div>
      ${S.pemanduKecil ? '' : `<ol>${g.langkah.map(l => `<li>${tebal(l)}</li>`).join('')}</ol>
        <button type="button" class="tautan-kecil" data-aksi="panduan" data-id="${esc(g.id)}">Buka di halaman Panduan</button>`}`;
  }

  /* ---------- Modal & formulir ---------- */
  /* Platform, prioritas, kategori, satuan, dan sub-stage diambil dari Inti, yang mengikuti Master. */

  function bukaModal(konteks, html) {
    S.modal = konteks;
    $('#modal').classList.toggle('atas', !!konteks.atas);
    $('#modal-panel').className = 'modal-panel';
    $('#modal-panel').innerHTML = html;
    $('#modal').hidden = false;
    setTimeout(() => { const el = $('#modal-panel input:not([type="hidden"]), #modal-panel textarea, #modal-panel select'); if (el) el.focus(); }, 30);
  }
  /* catat = false saat dipanggil tombol Back: alamatnya sudah berganti, jangan ditulis lagi. */
  function tutupModal(catat = true) {
    const m = S.modal;
    // Editor catatan di jendela (tampilan kartu): ketikan yang belum tersimpan disimpan dulu.
    const editorTutup = editorDiJendela();
    if (editorTutup) simpanCatatanTertunda();
    if (m && m.jenis === 'foto') akhiriPotong();
    S.modal = null;
    $('#modal').hidden = true;
    $('#modal-panel').innerHTML = '';
    $('#modal-panel').className = 'modal-panel';
    if (editorTutup) {
      S.ctt.pilih = null;
      segarkanDaftarCatatan();
      if (catat && S.view === 'catatan') catatAlamat();
    }
    // Riwayat versi atau Jadikan task dibuka dari editor di jendela: kembali ke editornya.
    if (m && m.keEditor && S.view === 'catatan' && modeKartu() && catatanAktif()) bukaEditorJendela();
  }
  const kakiModal = tombol => `<p id="galat-modal" class="pesan-galat" role="alert" hidden></p>
      <div class="modal-kaki"><button type="button" class="tombol" data-aksi="tutup-modal">Batal</button><button class="tombol utama">${esc(tombol)}</button></div>`;

  /* ----- Form task: sub-stage menentukan tahap, tim pemilik, dan siapa yang boleh jadi PIC ----- */

  /* Pilihan sub-stage. Task proyek: kode ADDIE per tahap. Di luar proyek: kode R; kode ADDIE
     task "lepas" warisan v1 tetap ditawarkan supaya tak hilang saat task diubah. */
  /* baru = form task baru: tanpa pilihan bawaan, sub-stage wajib dipilih sendiri (0.14.0).
     tahap = hanya sub-stage tahap itu (mis. "Tambah task di Development", atau task induk/anak
     yang tahapnya tetap). */
  function opsiSub(jenis, terpilih, baru = false, tahap = '') {
    const grup = (label, daftar) => `<optgroup label="${esc(label)}">${daftar.map(s =>
      `<option value="${s.kode}" ${s.kode === terpilih ? 'selected' : ''}>${s.kode} · ${esc(s.nama)}${s.tim ? ' (' + s.tim + ')' : ''}</option>`).join('')}</optgroup>`;
    const tampil = s => s.aktif !== false || s.kode === terpilih;
    if (jenis === 'proyek') {
      const boleh = s => s.kode === terpilih || I.subBolehBagi(S.me, s.kode);
      return (I.subTahap(terpilih) ? '' : '<option value="" selected disabled>— pilih sub-stage —</option>')
        + I.TAHAP.filter(x => !tahap || x.id === tahap)
          .map(x => { const isi = I.SUB_TAHAP.filter(s => s.tahap === x.id && boleh(s) && tampil(s)); return isi.length ? grup(x.nama, isi) : ''; }).join('');
    }
    const lama = I.subTahap(terpilih);
    return (terpilih ? '' : baru ? '<option value="" selected disabled>— pilih jenis rutin —</option>' : '<option value="" selected>— belum ber-sub-stage —</option>')
      + grup('Rutin', I.SUB_TAHAP.filter(s => s.tahap === 'R' && tampil(s)))
      + (lama && lama.tahap !== 'R' ? grup('Kode lama (lepas, warisan v1)', [lama]) : '');
  }
  function hintSub(kode) {
    const s = I.subTahap(kode);
    if (!s) return 'Pilih sub-stage: menentukan tahap task dan tim pemiliknya.';
    const tim = s.tim ? I.TIM[s.tim] : null;
    return [s.tahap !== 'R' ? 'Tahap ' + I.namaTahap(s.tahap) : 'Rutin, di luar proyek',
      tim ? `tim ${tim.nama} (Lead ${I.orang(tim.lead).pendek})` : 'dipegang tim pemilik output yang direvisi',
      s.reviewManager ? 'direview Manager' : ''].filter(Boolean).join(' · ') + '.';
  }
  /* PIC yang sah: tim sendiri (Manager: semua), plus Lead tim pemilik sub-stage bagi Lead. */
  function pilihanPic(kode, sekarang = '') {
    const pemilik = I.orang(S.me).peran === 'lead' ? I.leadSub(kode) : '';
    return [...new Set([...I.picBoleh(S.me), ...(pemilik ? [pemilik] : []), ...(sekarang ? [sekarang] : [])])];
  }
  /* PIC yang boleh dipilih saat mengubah task (0.15.0): task anak → staff tim Lead induknya;
     task yang sudah dibagi ke task anak → tetap; task Lead → tanpa staff (dibagi lewat task anak). */
  function pilihanPicUbah(t, kode) {
    const perId = perIdKini();
    const induk = t.induk ? perId.get(t.induk) : null;
    if (induk) return [...new Set([...I.timDari(induk.pic), t.pic])];
    if (I.anakTask(perId, t.id).length) return [t.pic];
    const daftar = pilihanPic(kode, t.pic);
    return I.orang(t.pic).peran === 'lead' ? daftar.filter(id => I.orang(id).peran !== 'staff') : daftar;
  }
  /* PIC bawaan task baru: Manager → Lead tim pemilik; Lead → dirinya, atau Lead tim pemilik
     kalau pekerjaan proyek itu milik tim lain (lalu ia yang membaginya ke staff-nya lewat task
     anak). Pekerjaan rutin dikerjakan tim sendiri. */
  function picBawaan(kode) {
    const pemilik = I.leadSub(kode);
    const peran = I.orang(S.me).peran;
    if (peran === 'manager') return pemilik || S.me;
    const rutin = (I.subTahap(kode) || {}).tahap === 'R';
    return peran === 'lead' && pemilik && pemilik !== S.me && !rutin ? pemilik : S.me;
  }
  const opsiPic = (daftar, terpilih, kode) => daftar.map(id => {
    const pemilik = id !== S.me && id === I.leadSub(kode) && I.orang(id).peran === 'lead';
    return `<option value="${esc(id)}" ${id === terpilih ? 'selected' : ''}>${esc(I.orang(id).nama)}${pemilik ? ' · Lead tim pemilik' : ''}</option>`;
  }).join('');

  const isianForm = (form, n) => form.elements.namedItem(n);
  function kodeFormTask(form) {
    if (form.dataset.task !== 'baru') return (isianForm(form, 'sub') || {}).value || '';
    const jalur = isianForm(form, 'jalur').value;
    return isianForm(form, jalur === 'proyek' ? 'subProyek' : 'subRutin').value;
  }
  /* Sesudah jalur, proyek, atau sub-stage berganti: perbarui keterangan dan pilihan PIC.
     PIC yang belum disentuh orang mengikuti bawaan sub-stage barunya. */
  function segarkanFormTask(form) {
    const kode = kodeFormTask(form);
    const hint = $('[data-hint-sub]', form);
    if (hint) hint.textContent = hintSub(kode);
    const pic = isianForm(form, 'pic');
    if (!pic) return;
    const pilih = pic.dataset.otomatis === '1' ? picBawaan(kode) : pic.value;
    const lama = form.dataset.task === 'ubah' ? S.data.tasks.find(x => x.id === form.dataset.id) : null;
    const daftar = lama ? pilihanPicUbah(lama, kode) : pilihanPic(kode, form.dataset.picLama || '');
    pic.innerHTML = opsiPic(daftar, daftar.includes(pilih) ? pilih : daftar[0], kode);
    segarkanInduk(form);
  }
  /* Lead yang memberi task proyek ke staff-nya bisa memasangnya sebagai task anak dari task yang
     ia pegang di proyek, siklus, dan tahap yang sama. */
  function calonInduk(form) {
    if (form.dataset.task !== 'baru' || I.orang(S.me).peran !== 'lead' || isianForm(form, 'jalur').value !== 'proyek') return [];
    if (!I.timDari(S.me).includes(isianForm(form, 'pic').value)) return [];
    const s = I.subTahap(isianForm(form, 'subProyek').value);
    const p = proyekDari(isianForm(form, 'project').value);
    if (!s || !p) return [];
    return S.data.tasks.filter(t => t.project === p.id && (t.cycle || 1) === (p.cycle || 1) && t.stage === s.tahap && I.bolehBuatAnak(t, S.me));
  }
  function segarkanInduk(form) {
    const kotak = $('[data-bagian-induk]', form);
    if (!kotak) return;
    const calon = calonInduk(form);
    const sel = isianForm(form, 'induk');
    const lama = sel.value;
    kotak.hidden = !calon.length;
    // Satu calon: langsung terpilih, kecuali orang sudah memilih "tanpa task induk" sendiri.
    const pilih = calon.some(t => t.id === lama) ? lama : calon.length === 1 && !(sel.dataset.disentuh && !lama) ? calon[0].id : '';
    sel.innerHTML = opsiHtml([['', '— tanpa task induk —'], ...calon.map(t => [t.id, `${t.id} · ${potong(t.title, 60)}`])], pilih);
  }

  function formTask(t, preset = {}) {
    if (t) return formUbahTask(t);
    const proyekAktif = S.data.projects.filter(p => !p.arsip);
    const pProyek = preset.proyek || (proyekAktif[0] || {}).id || '';
    // Dari bagian tahap di halaman proyek: task proyek, sub-stage tahap itu saja.
    const tahap = preset.proyek && I.TAHAP.some(x => x.id === preset.tahap) ? preset.tahap : '';
    const jalur = tahap ? 'proyek' : preset.jalur || (preset.proyek || proyekAktif.length ? 'proyek' : 'rutin');
    const subProyek = preset.sub && I.subBolehBagi(S.me, preset.sub) ? preset.sub : '';
    const subRutin = '';
    const kode = jalur === 'proyek' ? subProyek : subRutin;
    const staff = I.orang(S.me).peran === 'staff';
    const lead = I.orang(S.me).peran === 'lead';
    return `<form data-form="modal" data-task="baru" novalidate>
      <h2>Tambah task${tahap ? ' di ' + esc(I.namaTahap(tahap)) : ''}</h2>
      <label class="isian">Judul task <input name="title" required maxlength="200" placeholder="mis. QC output paket TO 3" value="${esc(preset.judul || '')}"></label>
      ${tahap ? `<p class="hint">Task proyek di tahap <strong>${esc(I.namaTahap(tahap))}</strong>: sub-stage yang tersedia hanya milik tahap ini.</p>` : `<div class="isian"><span>Jalur</span>
        <div class="segmen" role="group" aria-label="Jalur">
          <button type="button" data-aksi="pilih-jalur" data-jalur="proyek" aria-pressed="${jalur === 'proyek'}" ${proyekAktif.length ? '' : 'disabled'}>Proyek</button>
          <button type="button" data-aksi="pilih-jalur" data-jalur="rutin" aria-pressed="${jalur === 'rutin'}">Rutin</button>
        </div>
        <small>Proyek: sub-stage ADDIE, wajib output & bukti, ditinjau sebelum selesai. Rutin (kode R): di luar proyek, langsung selesai.</small>
      </div>`}
      ${staff ? `<p class="banner biru">Task ini untuk Anda sendiri. Sub-stage proyek yang tersedia hanya milik tim Anda; task proyek ditinjau ${esc(I.orang(I.orang(S.me).lead || I.MANAGER).pendek)} sebelum selesai, dan ia mendapat notifikasi.</p>` : ''}
      <input type="hidden" name="jalur" value="${jalur}">
      <div class="dua-isian" data-bagian="proyek" ${jalur === 'proyek' ? '' : 'hidden'}>
        <label class="isian">Proyek <select name="project">${opsiHtml(proyekAktif.map(p => [p.id, p.name]), pProyek)}</select></label>
        <label class="isian">Sub-stage <select name="subProyek" data-sub>${opsiSub('proyek', subProyek, true, tahap)}</select></label>
      </div>
      <label class="isian" data-bagian="rutin" ${jalur === 'rutin' ? '' : 'hidden'}>Jenis rutin <select name="subRutin" data-sub>${opsiSub('rutin', subRutin, true)}</select></label>
      <p class="hint" data-hint-sub>${esc(hintSub(kode))}</p>
      <div class="dua-isian">
        <label class="isian">PIC <select name="pic" data-otomatis="1">${opsiPic(pilihanPic(kode), picBawaan(kode), kode)}</select></label>
        <label class="isian">Tenggat <input type="date" name="due"></label>
      </div>
      ${lead ? `<label class="isian" data-bagian-induk hidden>Task induk <select name="induk"><option value="">— tanpa task induk —</option></select>
        <small>Task untuk staff Anda bisa dipasang di bawah task yang Anda pegang di tahap ini: tampil menjorok di bawahnya dan ditinjau Anda; task induknya baru bisa diajukan setelah semua task anaknya selesai.</small></label>` : ''}
      <div class="dua-isian">
        <label class="isian">Prioritas <select name="priority">${opsiHtml(I.PRIORITAS, 'Normal')}</select></label>
        <label class="isian">Output <input name="output" maxlength="200" placeholder="mis. 40 soal lolos QC"></label>
      </div>
      <label class="isian">Keterangan <textarea name="detail" maxlength="4000">${esc(preset.detail || '')}</textarea></label>
      ${kakiModal('Tambah task')}
    </form>`;
  }

  function formUbahTask(t) {
    const jenis = t.lane === 'proyek' ? 'proyek' : 'rutin';
    const lepas = I.jenisJalur(t) === 'lepas';
    const induk = t.induk ? perIdKini().get(t.induk) : null;
    const dibagi = I.anakTask(perIdKini(), t.id).length > 0;
    // Induk dan anaknya tetap di tahap yang sama.
    const tahap = t.lane === 'proyek' && (induk || dibagi) ? t.stage : '';
    return `<form data-form="modal" data-task="ubah" data-id="${esc(t.id)}" data-pic-lama="${esc(t.pic)}" novalidate>
      <h2>Ubah task</h2>
      <p class="hint">${t.project ? 'Proyek ' + esc(asal(t)) : (lepas ? 'Lepas' : 'Rutin') + ' · ' + esc(t.kategori || 'Umum')} · ${esc(t.id)}</p>
      ${induk ? `<p class="hint">Task anak dari ${esc(induk.id)} · ${esc(potong(induk.title, 70))}: PIC-nya staff tim ${esc(I.orang(induk.pic).pendek)}${tahap ? `, tahapnya tetap ${esc(I.namaTahap(tahap))}` : ''}.</p>`
        : dibagi ? `<p class="hint">Task ini sudah dibagi ke task anak: PIC-nya tetap${tahap ? ` dan tahapnya tetap ${esc(I.namaTahap(tahap))}` : ''}.</p>` : ''}
      <label class="isian">Judul task <input name="title" required maxlength="200" value="${esc(t.title)}"></label>
      <label class="isian">Sub-stage <select name="sub" data-sub>${opsiSub(jenis, t.sub, false, tahap)}</select></label>
      <p class="hint" data-hint-sub>${esc(hintSub(t.sub))}</p>
      <div class="dua-isian">
        <label class="isian">PIC <select name="pic">${opsiPic(pilihanPicUbah(t, t.sub), t.pic, t.sub)}</select></label>
        <label class="isian">Tenggat <input type="date" name="due" value="${esc(t.due || '')}"></label>
      </div>
      <div class="dua-isian">
        <label class="isian">Prioritas <select name="priority">${opsiHtml(I.PRIORITAS, t.priority || 'Normal')}</select></label>
        <label class="isian">Output <input name="output" maxlength="200" value="${esc(t.output || '')}"></label>
      </div>
      <label class="isian">Keterangan <textarea name="detail" maxlength="4000">${esc(t.detail || '')}</textarea></label>
      ${kakiModal('Simpan')}
    </form>`;
  }

  function formProyek() {
    return `<form data-form="modal" novalidate>
      <h2>Proyek baru</h2>
      <label class="isian">Nama proyek <input name="name" required maxlength="200" placeholder="mis. PCPM Tahap III · 10 TO"></label>
      <label class="isian">Platform <select name="platform">${I.PLATFORM.map(x => `<option>${esc(x)}</option>`).join('')}</select></label>
      <label class="isian">Tujuan <textarea name="goal" maxlength="2000" placeholder="Apa yang ingin dicapai proyek ini?"></textarea></label>
      <p class="hint">Proyek tidak punya Lead tetap: tiap task dipegang tim pemilik sub-stage-nya. Tahapnya dihitung dari task terbuka paling awal, dan siklus ditutup lewat E12 · Final approval.</p>
      ${kakiModal('Buat proyek')}
    </form>`;
  }

  /* Elaborasi (PRD "Buat / hubungkan Project"): tiap target terpilih menjadi satu batch,
     yaitu rangkaian langkah sesuai jenisnya. Langkah yang tak perlu bisa dicoret. */
  function formElaborasi(p) {
    const kontrib = kontribPaket(p);
    const proyekAktif = S.data.projects.filter(x => !x.arsip);
    const platformP = I.platformPaket(p);
    const pengisi = I.proyekPengisi(S.data, p.id).filter(x => !x.arsip);
    const tujuan = pengisi.length ? pengisi[0].id : '';
    const terbuka = new Set();
    const blok = I.KATEGORI_SEMUA.map(([label]) => {
      const items = p.items.filter(i => i.kategori === label);
      if (!items.length) return '';
      return `<fieldset class="pilih-target"><legend>${esc(label)}</legend>${items.map(it => {
        const k = kontrib.get(it.id) || [];
        const n = I.sisaTerbuka(it, k);
        const h = I.hitungTarget(it, k);
        if (n) terbuka.add(label);
        /* Jumlahnya bisa dikecilkan: target 10 tapi proyek ini cukup 5 — sisanya tetap
           terbuka untuk elaborasi berikutnya. */
        /* Tak ada yang tercentang dari awal: orang memilih sendiri target yang dikerjakan proyek ini. */
        return `<div class="pilih-baris ${n ? 'tak-dipilih' : 'mati'}">
          <label><input type="checkbox" name="item" value="${esc(it.id)}" data-kategori="${esc(label)}" ${n ? '' : 'disabled'}>
            <span>${esc(it.nama || '—')}${it.grup ? ` <small>${esc(it.grup)}</small>` : ''}</span></label>
          ${n ? `<span class="jumlah-elaborasi"><label class="sr" for="jml-${esc(it.id)}">Jumlah untuk ${esc(it.nama)}</label>
            <input class="input angka" id="jml-${esc(it.id)}" name="jumlah-${esc(it.id)}" inputmode="decimal" value="${esc(fmtAngka(n))}" maxlength="8" disabled>
            <small>dari ${esc(fmtAngka(n))} ${esc(it.satuan)}</small></span>`
            : `<small>${h.status === 'digarap' ? 'sedang digarap' : 'sudah terpenuhi'}</small>`}
        </div>`;
      }).join('')}</fieldset>`;
    }).join('');
    const alur = [...terbuka].map(k => `<fieldset class="pilih-alur" data-alur="${esc(k)}"><legend>${esc(k)}</legend>
      <ol class="alur-langkah">${I.langkahAlur(k).map(l => {
        const s = I.subTahap(l.kode);
        const lead = I.leadSub(l.kode);
        const cap = l.capaian ? I.CAPAIAN.find(c => c.kode === l.capaian) : null;
        return `<li><label class="langkah"><input type="checkbox" name="langkah" value="${esc(k)}|${esc(l.kode)}" checked>
          <span><b>${esc(l.kode)}</b> ${esc(s.nama)}<small>${lead ? esc(I.orang(lead).pendek) : '—'}${cap ? ` · <em>${esc(cap.nama)} ${Math.round(cap.bobot * 100)}%</em>` : ''}</small></span></label></li>`;
      }).join('')}</ol></fieldset>`).join('');
    return `<form data-form="modal" class="form-elaborasi" novalidate>
      <h2>Elaborasi jadi proyek</h2>
      <p class="hint">Setiap target terpilih menjadi satu <b>batch</b>: rangkaian langkah sesuai jenisnya. Tiap langkah dipegang <b>Lead tim pemilik</b> sub-stage-nya, yang membaginya ke staff lewat task anak. Langkah dikerjakan per tahap ADDIE: yang setahap berjalan bersamaan, tahap berikutnya dimulai setelah tahap sebelumnya selesai. Progres ${esc(judulPaket(p))} naik setiap langkah bercapaian disetujui.</p>
      <div class="isian"><span class="judul-pilih-target">Target yang dikerjakan
          ${terbuka.size ? '<button type="button" class="tombol kecil" data-aksi="elab-semua">Centang semua</button>' : ''}</span>${blok}
        <small>Centang target yang dikerjakan proyek ini; belum ada yang tercentang. Jumlahnya bisa dikecilkan bila proyek ini hanya mengerjakan sebagian; sisanya tetap terbuka untuk elaborasi berikutnya.</small></div>
      <fieldset class="pilih-mode"><legend>Cara elaborasi</legend>
        <label><input type="radio" name="mode" value="alur" checked><span><b>Alur lengkap per jenis</b><small>Satu task per langkah; progres naik per capaian (disarankan).</small></span></label>
        <label><input type="radio" name="mode" value="satu"><span><b>Satu task per target</b><small>Satu task produksi; progres masuk penuh saat task itu disetujui.</small></span></label>
      </fieldset>
      <div class="isian" data-bagian-elab="alur"><span>Langkah per jenis</span>${alur}
        <small>Coret langkah yang tidak perlu. Langkah terakhir yang tersisa selalu menandai tayang.</small></div>
      <div class="dua-isian">
        <label class="isian">Proyek tujuan <select name="proyek">${opsiHtml([['', '+ Proyek baru'], ...proyekAktif.map(x => [x.id, `${x.name} (${x.id})`])], tujuan)}</select></label>
        <label class="isian" data-bagian-elab="baru" ${tujuan ? 'hidden' : ''}>Nama proyek baru <input name="name" maxlength="200" value="Produksi ${esc(judulPaket(p))}"></label>
      </div>
      ${platformP.length > 1 ? `<label class="isian">Platform proyek & task <select name="platform">${opsiHtml(platformP.map(x => [x, x]), platformP[0])}</select>
        <small>Paket ini untuk beberapa platform; proyek dan task-nya memakai satu.</small></label>` : ''}
      <label class="isian">Tenggat semua langkah <input type="date" name="due"><small>Bisa diubah per task sesudahnya.</small></label>
      ${kakiModal('Buat task')}
    </form>`;
  }
  /* Langkah per jenis hanya tampil untuk jenis yang targetnya dipilih, dan hanya di mode alur.
     Tombol Buat task menunggu sampai ada target yang dicentang. */
  function segarkanFormElaborasi(form) {
    const mode = ($('[name="mode"]:checked', form) || {}).value || 'alur';
    const centang = $$('[name="item"]:checked', form);
    const dipilih = new Set(centang.map(el => el.dataset.kategori));
    const kirim = $('.modal-kaki .utama', form);
    if (kirim) {
      kirim.disabled = !centang.length;
      kirim.textContent = centang.length ? `Buat task · ${centang.length} target` : 'Centang target dulu';
    }
    const semua = $('[data-aksi="elab-semua"]', form);
    const bisa = $$('[name="item"]:not(:disabled)', form);
    if (semua) semua.textContent = bisa.length && bisa.every(el => el.checked) ? 'Kosongkan' : 'Centang semua';
    $$('[data-alur]', form).forEach(fs => { fs.hidden = !dipilih.has(fs.dataset.alur); });
    const alur = $('[data-bagian-elab="alur"]', form);
    if (alur) alur.hidden = mode !== 'alur' || !dipilih.size;
    const baru = $('[data-bagian-elab="baru"]', form);
    if (baru) baru.hidden = !!isianForm(form, 'proyek').value;
  }

  function formPaketBaru() {
    return `<form data-form="modal" novalidate>
      <h2>Rancangan paket baru</h2>
      <label class="isian">Nama paket <input name="namaPaket" required maxlength="200" placeholder="mis. PCPM Tahap III"></label>
      ${pilihPlatformHtml(I.PLATFORM, [])}
      <div class="dua-isian">
        <label class="isian">Pendaftaran dibuka <input type="date" name="daftarBuka"></label>
        <label class="isian">Pendaftaran ditutup <input type="date" name="daftarTutup"></label>
      </div>
      <p class="hint">Isi produk dan target per kategori diisi setelah paket dibuat.</p>
      ${kakiModal('Buat paket')}
    </form>`;
  }

  function formCatatan(judul, label, tombol) {
    return `<form data-form="modal" novalidate>
      <h2>${esc(judul)}</h2>
      <label class="isian">${esc(label)} <textarea name="catatan" required maxlength="1000"></textarea></label>
      ${kakiModal(tombol)}
    </form>`;
  }

  /* l kosong = link baru (folderAwal = folder kartu tempat tombol + ditekan). */
  function formLink(l, folderAwal = '') {
    const nilai = l || { title: '', url: '', folder: folderAwal };
    return `<form data-form="modal" novalidate>
      <h2>${l ? 'Ubah link' : 'Tambah link'}</h2>
      <label class="isian">Alamat (URL) <input name="url" required maxlength="2000" inputmode="url" value="${esc(nilai.url)}" placeholder="https://docs.google.com/…"></label>
      <label class="isian">Judul <input name="title" maxlength="200" value="${esc(nilai.title)}" placeholder="Kosongkan: terisi sendiri dari alamatnya"></label>
      <label class="isian">Folder <input name="folder" maxlength="80" list="folder-link-modal" value="${esc(nilai.folder)}" placeholder="${I.FOLDER_UMUM}"></label>
      <datalist id="folder-link-modal">${folderSaya(linkSaya()).map(f => `<option value="${esc(f)}">`).join('')}</datalist>
      ${kakiModal(l ? 'Simpan' : 'Tambah link')}
    </form>`;
  }

  /* Folder ada selama ada isinya, jadi folder baru langsung dibuat bersama link pertamanya. */
  function formFolderBaru() {
    return `<form data-form="modal" novalidate>
      <h2>Folder baru</h2>
      <label class="isian">Nama folder <input name="folder" required maxlength="80" placeholder="mis. Bank soal"></label>
      <label class="isian">Link pertama <input name="url" required maxlength="2000" inputmode="url" placeholder="https://docs.google.com/…"></label>
      <label class="isian">Judul link <input name="title" maxlength="200" placeholder="Kosongkan: terisi sendiri dari alamatnya"></label>
      ${kakiModal('Buat folder')}
    </form>`;
  }

  function formIsian(judul, label, nilai, tombol, saran = []) {
    return `<form data-form="modal" novalidate>
      <h2>${esc(judul)}</h2>
      <label class="isian">${esc(label)} <input name="nilai" maxlength="80" value="${esc(nilai)}" list="saran-isian" placeholder="Umum"></label>
      <datalist id="saran-isian">${saran.map(f => `<option value="${esc(f)}">`).join('')}</datalist>
      ${kakiModal(tombol)}
    </form>`;
  }

  function formDashboard(d) {
    const nilai = d || { title: '', url: '', deskripsi: '', icon: 'dashboard' };
    return `<form data-form="modal" novalidate>
      <h2>${d ? 'Ubah tautan tim' : 'Tambah tautan tim'}</h2>
      <p class="hint">Tampil di Link Saya semua orang, di kartu Tautan tim.</p>
      <label class="isian">Judul <input name="title" required maxlength="120" value="${esc(nilai.title)}" placeholder="mis. Dashboard Freelance"></label>
      <label class="isian">Alamat (URL) <input name="url" required maxlength="2000" inputmode="url" value="${esc(nilai.url)}" placeholder="https://lookerstudio.google.com/…"></label>
      <label class="isian">Deskripsi <input name="deskripsi" maxlength="300" value="${esc(nilai.deskripsi)}"></label>
      <fieldset class="pilih-ikon"><legend>Ikon</legend>${I.IKON_DASHBOARD.map(x => `<label><input type="radio" name="icon" value="${x}" ${nilai.icon === x ? 'checked' : ''}><span>${ikon(IKON_DASH[x], 22)}</span><span class="sr">${x}</span></label>`).join('')}</fieldset>
      ${kakiModal(d ? 'Simpan' : 'Tambah')}
    </form>`;
  }

  function mintaCatatan(t, kunci) {
    const teks = {
      kembalikan: [`Kembalikan ke ${I.orang(t.pic).pendek}`, 'Apa yang perlu diperbaiki?', 'Kembalikan'],
      tahan: ['Tandai tertahan', 'Apa yang menahan task ini?', 'Tandai tertahan'],
    }[kunci];
    bukaModal({ jenis: 'catatan', id: t.id, kunci }, formCatatan(...teks));
  }

  function galatModal(pesan) {
    const el = $('#galat-modal');
    if (el) { el.textContent = pesan; el.hidden = false; } else toast(pesan, true);
  }

  function kirimModal(form) {
    const f = Object.fromEntries(new FormData(form).entries());
    const m = S.modal;
    const waktu = Date.now();
    try {
      switch (m.jenis) {
        case 'tambah': {
          const proyek = f.jalur === 'proyek';
          if (!(proyek ? f.subProyek : f.subRutin)) throw new Error(proyek ? 'Pilih sub-stage dulu.' : 'Pilih jenis rutin dulu.');
          const t = ubahData('taskBaru', { f: {
            title: f.title, project: proyek ? f.project : '', sub: proyek ? f.subProyek : f.subRutin,
            pic: f.pic, due: f.due, priority: f.priority, output: f.output, detail: f.detail, induk: proyek ? f.induk || '' : '',
          } });
          // Dibuat dari baris catatan: nomor task-nya ditempel di ujung baris itu.
          const asal = m.catatan && S.data.notes.find(x => x.id === m.catatan && x.user === S.me);
          if (asal) I.simpanCatatan(S.data, S.me, { title: asal.title, body: I.tandaiBarisTask(asal.body, m.baris, t.id), folder: asal.folder }, asal.id, waktu);
          tutupModal();
          if (!asal) S.pilih = t.id;
          return selesaiUbah(`${t.id} · ${t.sub} ditambahkan untuk ${I.orang(t.pic).pendek}${t.induk ? ` sebagai task anak ${t.induk}` : ''}.${asal ? ' Nomornya ditempel di baris catatan.' : ''}`);
        }
        case 'ubah': {
          const lama = (S.data.tasks.find(x => x.id === m.id) || {}).pic;
          ubahData('ubahTask', { task: m.id, f: { title: f.title, sub: f.sub, pic: f.pic, due: f.due, priority: f.priority, output: f.output, detail: f.detail } });
          const t = S.data.tasks.find(x => x.id === m.id);
          tutupModal();
          return selesaiUbah(t.pic !== lama ? `Task disimpan; PIC-nya kini ${I.orang(t.pic).pendek}.` : 'Task disimpan.');
        }
        case 'proyek': {
          const p = ubahData('proyekBaru', { f });
          tutupModal();
          S.view = 'proyek';
          S.proyek = p.id;
          return selesaiUbah(`${p.name} dibuat. Tambahkan task pertamanya; tahap proyek mengikuti task terbuka paling awal.`);
        }
        case 'catatan': {
          ubahData('terapkanAksi', { task: m.id, kunci: m.kunci, catatan: f.catatan });
          const t = S.data.tasks.find(x => x.id === m.id);
          tutupModal();
          return selesaiUbah(m.kunci === 'kembalikan' ? `Dikembalikan ke ${I.orang(t.pic).pendek}.` : 'Ditandai tertahan.');
        }
        case 'elaborasi': {
          const p = paketDari(m.id);
          const items = new FormData(form).getAll('item');
          const jumlah = Object.fromEntries(items.map(id => [id, f['jumlah-' + id]]));
          // Semua jenis yang tampil ikut dikirim, juga yang dicoret habis: aturannya menolak batch tanpa langkah.
          const langkah = Object.fromEntries($$('[data-alur]', form).map(fs => [fs.dataset.alur, $$('[name="langkah"]:checked', fs).map(el => el.value.split('|')[1])]));
          const ada = !!f.proyek;
          const { project, tasks } = ubahData('elaborasiPaket', { paket: p.id, f: { proyek: f.proyek, name: f.name, mode: f.mode, langkah, items, jumlah, due: f.due, platform: f.platform || '' } });
          tutupModal();
          Object.assign(S.pkt, { pilih: null, sunting: false });
          Object.assign(S, { view: 'proyek', proyek: project.id, pilih: null });
          simpan('halaman', 'proyek');
          return selesaiUbah(`${tasks.length} task untuk ${items.length} target ${ada ? 'ditambahkan ke' : 'dibuat di'} ${project.id}. Langkahnya menunggu di antrean Lead tim pemiliknya dan dikerjakan per tahap ADDIE; progres ${judulPaket(p)} naik per capaian.`);
        }
        case 'paket-baru': {
          const p = ubahData('paketBaru', { f: { ...f, platform: new FormData(form).getAll('platform') } });
          tutupModal();
          Object.assign(S.pkt, { pilih: p.id, sunting: true });
          return selesaiUbah(`${p.namaPaket} dibuat. Isi produk dan targetnya.`);
        }
        case 'link': {
          const l = I.simpanLink(S.data, S.me, f, m.id, waktu);
          tutupModal();
          return selesaiUbah(m.id ? 'Link disimpan.' : `${l.title} ditambahkan ke ${l.folder || I.FOLDER_UMUM}.`);
        }
        case 'folder-baru': {
          if (!String(f.folder || '').trim()) throw new Error('Nama folder wajib diisi.');
          const l = I.simpanLink(S.data, S.me, f, '', waktu);
          tutupModal();
          return selesaiUbah(`Folder ${l.folder || I.FOLDER_UMUM} dibuat dengan link pertamanya.`);
        }
        case 'link-pindah': {
          const l = S.data.links.find(x => x.id === m.id);
          I.simpanLink(S.data, S.me, { ...l, folder: f.nilai }, m.id, waktu);
          tutupModal();
          return selesaiUbah(`Dipindah ke ${f.nilai.trim() || I.FOLDER_UMUM}.`);
        }
        case 'folder-ganti': {
          const n = I.gantiNamaFolder(S.data[m.daftar], S.me, m.folder, f.nilai);
          pindahPrefFolder(m.daftar, m.folder, String(f.nilai || '').trim() || I.FOLDER_UMUM);
          tutupModal();
          return selesaiUbah(`Folder diganti nama (${n} isi).`);
        }
        case 'dashboard':
          ubahData('simpanDashboard', { f, id: m.id || '' });
          tutupModal();
          return selesaiUbah('Tautan tim disimpan.');
      }
    } catch (e) {
      galatModal(e.message);
    }
  }

  /* Setiap perubahan: tahap proyek dihitung ulang (dan perpindahannya dicatat atas nama orang
     yang memicunya), disimpan, lalu digambar ulang. */
  function selesaiUbah(pesan) {
    // Tahap yang berpindah karena perintah sudah dihitung di ubahData; data real tak diubah di luar perintah.
    const pindah = [...(S.pindah || []), ...(S.mode === 'real' ? [] : I.segarkanTahap(S.data, Date.now(), S.me))];
    S.pindah = null;
    simpanData();
    render();
    const tahap = pindah.map(p => `${p.name} kini di tahap ${I.namaTahap(p.stage)}.`).join(' ');
    if (S.pratinjau) return toast('Mode Lihat sebagai: perubahan ini hanya tampilan dan hilang saat kembali jadi Dev.');
    if (pesan || tahap) toast([pesan, tahap].filter(Boolean).join(' '));
  }

  const PESAN_AKSI = {
    mulai: 'Mulai dikerjakan.', ajukan: 'Diajukan untuk ditinjau.', selesai: 'Selesai. Mantap!', setujui: 'Disetujui dan selesai.',
    tarik: 'Ditarik dari tinjauan.', buka: 'Dibuka kembali.', lanjutkan: 'Tanda tertahan dilepas.',
  };

  function pesanSetoran(t, kunci) {
    if (!['setujui', 'selesai', 'buka'].includes(kunci)) return '';
    const isi = (S.data.setoran || []).filter(x => x.task === t.id).map(x => {
      const pk = paketDari(x.paket);
      const it = pk && pk.items.find(i => i.id === x.item);
      return pk && it ? `${it.nama} ${fmtAngka(x.jumlah)} ${it.satuan} → ${I.namaCapaian(x.tahap || 'tayang')} (${judulPaket(pk)})` : '';
    }).filter(Boolean);
    if (!isi.length) return '';
    return kunci === 'buka' ? ` Capaiannya ditarik lagi dari progres paket: ${isi.join(', ')}.` : ` Progres paket naik: ${isi.join(', ')}.`;
  }

  function jalankanAksi(t, kunci) {
    const a = I.aksiUntuk(t, S.me, I.indeks(S.data)).find(x => x.kunci === kunci);
    if (a && a.perluCatatan) return mintaCatatan(t, kunci);
    try {
      ubahData('terapkanAksi', { task: t.id, kunci });
      selesaiUbah(PESAN_AKSI[kunci] + pesanSetoran(S.data.tasks.find(x => x.id === t.id) || t, kunci));
    } catch (e) {
      toast(e.message, true);
    }
  }

  /* ---------- Peristiwa ---------- */

  function bukaTask(id) {
    if (S.pilih !== id) S.ubahSub = null;
    S.pilih = id;
    S.notif.buka = false;
    render();
  }

  function resetData() {
    S.navBuka = false;
    if (S.pratinjau) return toast('Tidak tersedia saat Lihat sebagai. Kembali jadi Dev dulu.', true);
    if (S.mode === 'real') return toast('Data real tersimpan bersama; tidak ada yang di-reset dari browser.', true);
    if (!confirm('Reset ke data contoh awal?\n\nSemua perubahan di browser ini dihapus: task, status, proyek, paket, link, dan catatan. '
      + 'Data contoh dimuat lagi dari spreadsheet, persis seperti saat diimpor. Profil lain di browser ini ikut kembali ke awal.\n\n'
      + 'Pesan Komunikasi tersimpan bersama di spreadsheet, jadi tidak ikut terhapus.')) return render();
    hapus('data');
    Object.assign(S, { pilih: null, proyek: null, proyekArsip: false });
    Object.assign(S.pkt, { pilih: null, sunting: false, kotor: false });
    Object.assign(S.kom, { pilih: null });
    Object.assign(S.ctt, { pilih: null });
    clearTimeout(tundaCatatan);
    tundaCatatan = null;
    tutupModal();
    muat(true);
  }

  function aturNilai(ruang, kunci, nilai) {
    S[ruang][kunci] = nilai;
    if (ruang === 'task' && kunci === 'tahap') S.task.sub = '';
    if (ruang === 'task') S.task.hal = 1;
    if (ruang === 'pnd') S.pnd.buka = '';
    if (ruang === 'lap' && kunci !== 'buka') S.lap.buka = '';
    if (ruang === 'rwy') S.rwy.batas = 100;
    simpanPref(ruang);
    render();
  }

  document.addEventListener('click', e => {
    // Klik yang menyusul tekan-tahan logo (masuk mode Dev) tak ikut membuka beranda.
    if (logoDitahan && e.target.closest('.merek')) { e.preventDefault(); logoDitahan = false; return; }
    if (S.notif.buka && !e.target.closest('.notif')) bukaTutupNotif(false);
    if (sebutAktif && !e.target.closest('.km-sebut-pilih, .km-isian')) tutupSebutan();
    for (const m of $$('details.menu-lagi[open]')) if (!m.contains(e.target) || e.target.closest('.menu-lagi-isi [data-aksi]')) m.open = false;
    const tautanLink = e.target.closest('a[data-link]');
    if (tautanLink) { hitungKlik(tautanLink.dataset.link); return; }
    // Di layar sentuh, mengetuk gelembung memunculkan tombol aksinya (reaksi, balas, ubah, hapus).
    const gel = e.target.closest('.km-gel');
    if (gel && !e.target.closest('a, button')) {
      const psn = gel.closest('.km-psn');
      for (const x of $$('.km-psn.aktif')) if (x !== psn) x.classList.remove('aktif');
      if (psn) psn.classList.toggle('aktif');
    }
    // Tautan di blok catatan yang tak sedang diketik: dibuka di tab baru (bukan menaruh kursor).
    const tautanBlok = e.target.closest('.ne-teks a[href]');
    if (tautanBlok) { e.preventDefault(); window.open(tautanBlok.href, '_blank', 'noopener'); return; }
    // Rancangan Paket: mengetik nama di tempat tak membuka paketnya; klik judul kartu menunggu
    // sebentar, karena klik kedua (klik dua kali) berarti mengganti nama.
    if (e.target.closest('.sunting-judul')) return;
    const judulKartu = e.target.closest('.kartu-paket[data-aksi] [data-sunting-judul]');
    if (judulKartu) {
      clearTimeout(tundaBukaPaket);
      if (e.detail <= 1) { const id = judulKartu.dataset.suntingJudul; tundaBukaPaket = setTimeout(() => bukaPaket(id), 280); }
      return;
    }
    const kartu = e.target.closest('.kartu');
    const el = e.target.closest('[data-aksi]') || (kartu ? { dataset: { aksi: 'buka-task', id: kartu.dataset.id } } : null);
    if (!el || el.tagName === 'INPUT' || el.tagName === 'SELECT') return;
    const d = el.dataset;
    const t = d.id ? S.data && S.data.tasks.find(x => x.id === d.id) : null;
    switch (d.aksi) {
      case 'ke':
        e.preventDefault();
        pindahHalaman(d.view === 'awal' ? halamanAwal() : d.view);
        break;
      case 'buka-nav': S.navBuka = true; render(); break;
      case 'tutup-nav': S.navBuka = false; render(); break;
      case 'palet': bukaPalet(); break;
      case 'palet-jalan': jalankanPalet(Number(d.i)); break;
      case 'notif': bukaTutupNotif(); break;
      case 'notif-buka':
        S.notif.buka = false;
        if (d.pesan && d.ruang) bukaRuang(d.ruang, d.pesan);
        else if (d.proyek) bukaProyek(d.proyek);
        else if (t) bukaTask(t.id);
        else renderKepala();
        break;
      case 'salin-tautan':
        salinKeKlip(tautanKe(d.alamat), '', 'Tautan disalin. Tempel di chat; penerimanya perlu PIN v2 untuk membukanya.');
        break;
      case 'buka-task':
        if (!t) break;
        if (el.closest && el.closest('#modal-panel')) tutupModal();
        bukaTask(t.id);
        break;
      case 'tutup-detail': S.pilih = null; render(); break;
      case 'aksi-task': if (t) jalankanAksi(t, d.kunci); break;
      case 'ubah-task': if (t) bukaModal({ jenis: 'ubah', id: t.id }, formTask(t)); break;
      case 'tambah-task':
        if (!I.bolehBuatTask(S.me)) return toast('Pilih profil dulu.', true);
        bukaModal({ jenis: 'tambah' }, formTask(null, { proyek: d.proyek, tahap: d.tahap, sub: d.sub }));
        break;
      case 'pilih-jalur': {
        const form = el.closest('form');
        isianForm(form, 'jalur').value = d.jalur;
        form.querySelectorAll('[data-aksi="pilih-jalur"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.jalur === d.jalur)));
        form.querySelectorAll('[data-bagian]').forEach(b => { b.hidden = b.dataset.bagian !== d.jalur; });
        segarkanFormTask(form);
        break;
      }
      case 'elab-semua': {
        const form = el.closest('form');
        const bisa = $$('[name="item"]:not(:disabled)', form);
        const nyala = !bisa.every(x => x.checked);
        bisa.forEach(x => {
          x.checked = nyala;
          const baris = x.closest('.pilih-baris');
          baris.classList.toggle('tak-dipilih', !nyala);
          const jumlah = $('.jumlah-elaborasi .input', baris);
          if (jumlah) jumlah.disabled = !nyala;
        });
        segarkanFormElaborasi(form);
        break;
      }
      case 'tutup-modal': tutupModal(); break;
      case 'foto-profil':
        // Di ponsel tombolnya ada di laci Menu, yang lapisannya di atas jendela: tutup lacinya dulu.
        if (S.navBuka) { S.navBuka = false; render(); }
        bukaFoto();
        break;
      case 'foto-pilih': { const b = $('#foto-berkas'); if (b) b.click(); break; }
      case 'foto-simpan': simpanFotoSaya(); break;
      case 'foto-hapus':
        if (confirm('Hapus foto profil Anda? Avatar kembali ke inisial, untuk semua orang.')) kirimFoto('');
        break;
      case 'ganti-profil':
        if (!bolehTinggalkanPaket()) return;
        S.navBuka = false;
        if (S.pratinjau) akhiriPratinjau(false);
        tampilProfil();
        break;
      /* Mode Dev */
      case 'dev-keluar': keluarDev(); break;
      case 'dev-tab': S.devTab = d.nilai; render(); break;
      case 'dev-sistem-segarkan': S.devSistem = null; segarkanDev(); break;
      case 'dev-sumber': {
        const mode = d.nilai === 'real' ? 'real' : 'contoh';
        if (mode === S.mode) return;
        const tanya = mode === 'real'
          ? 'Pindahkan aplikasi ke DATA REAL untuk semua pengguna?\n\nSemua orang akan melihat data real (masih kosong sampai diisi), dan setiap perubahan tersimpan bersama di spreadsheet. Data contoh tetap utuh dan bisa dipakai lagi kapan saja.'
          : 'Kembalikan aplikasi ke DATA CONTOH untuk semua pengguna?\n\nData real tetap tersimpan di spreadsheet dan muncul lagi saat dipindah kembali.';
        if (!confirm(tanya)) return;
        api('aturSumber', [mode]).then(h => (h.success ? gantiSumber(mode) : toast(h.message || 'Gagal mengganti sumber data.', true)));
        break;
      }
      case 'coba-simpan': S.real.gagal = 0; kirimTertunda(); break;
      case 'dev-tarik-ulang': tarikUlangBersama(); break;
      case 'dev-siapkan':
        api('siapkan').then(h => toast(h.message || (h.success ? 'Spreadsheet siap.' : 'Gagal menyiapkan spreadsheet.'), !h.success));
        break;
      case 'dev-salin': salinKeKlip(laporanDiagnosa(), '', 'Laporan diagnosa disalin. Tempel di chat untuk developer.'); break;
      case 'dev-orang-baru': bukaModal({ jenis: 'orang', id: '' }, formOrang(null)); break;
      case 'dev-orang-ubah': bukaModal({ jenis: 'orang', id: d.id }, formOrang(I.orang(d.id))); break;
      case 'dev-lihat': mulaiPratinjau(d.id); break;
      case 'dev-ke-pin': S.mst.tab = 'pin'; pindahHalaman('master'); break;
      case 'pratinjau-akhiri': akhiriPratinjau(); break;
      case 'dev-foto-hapus': hapusFotoOrang(d.id); break;
      case 'psn-moderasi': moderasiPesan(d.id); break;
      /* Master */
      case 'mst-tab': {
        S.mst.tab = d.nilai;
        render();
        // Di ponsel deretan tab digeser ke samping: yang dipilih tetap terlihat.
        const aktif = $('.mst-tab [aria-pressed="true"]');
        if (aktif) aktif.scrollIntoView({ block: 'nearest', inline: 'center' });
        break;
      }
      case 'mst-sub-baru': bukaModal({ jenis: 'mst-sub', kunci: '' }, formMasterSub(null)); break;
      case 'mst-sub-ubah': {
        const s = I.daftarMaster('substage').find(x => x.kunci === d.kunci);
        if (s) bukaModal({ jenis: 'mst-sub', kunci: s.kunci }, formMasterSub(s));
        break;
      }
      case 'mst-kat-baru': bukaModal({ jenis: 'mst-kat', kunci: '' }, formMasterKategori(null)); break;
      case 'mst-kat-ubah': {
        const k = I.daftarMaster('kategori').find(x => x.kunci === d.kunci);
        if (k) bukaModal({ jenis: 'mst-kat', kunci: k.kunci }, formMasterKategori(k));
        break;
      }
      case 'mst-langkah-tambah': {
        const ol = $('.mst-langkah-daftar', el.closest('form'));
        if ($$('[data-langkah]', ol).length >= 14) return toast('Alur paling banyak 14 langkah.', true);
        ol.insertAdjacentHTML('beforeend', barisLangkah(''));
        $$('[data-langkah]', ol).pop().querySelector('select').focus();
        break;
      }
      case 'mst-langkah-naik': {
        const li = el.closest('[data-langkah]');
        if (li.previousElementSibling) li.parentNode.insertBefore(li, li.previousElementSibling);
        break;
      }
      case 'mst-langkah-hapus': {
        const li = el.closest('[data-langkah]');
        if (li.parentNode.children.length > 1) li.remove(); else toast('Alur berisi paling sedikit satu langkah.', true);
        break;
      }
      case 'mst-urut': urutMaster(d.jenis, d.kunci, Number(d.arah)); break;
      case 'mst-aktif': aktifkanMaster(d.jenis, d.kunci, d.nilai === '1'); break;
      case 'mst-pin-atur': bukaModal({ jenis: 'mst-pin', id: d.id }, formPin(d.id)); break;
      case 'mst-pin-hapus': hapusPin(d.id); break;
      case 'pilih-profil':
        if (d.id === I.DEV && !S.dev) { bukaMasukDev(); break; }
        pilihProfil(d.id, el);
        break;
      case 'reset-data': resetData(); break;
      case 'keluar':
        S.navBuka = false;
        api('keluar').then(() => tampilKunci('Anda sudah keluar. Masukkan PIN untuk masuk lagi.', false));
        break;
      case 'coba-muat': muat().catch(galatMuat); break;
      case 'reset-lokal':
        if (!confirm('Kosongkan data contoh yang tersimpan di browser ini?\n\nPerubahan Anda di browser ini hilang; data contoh dimuat lagi dari spreadsheet. Pesan Komunikasi tidak ikut terhapus.')) return;
        hapus('data');
        muat(true).catch(galatMuat);
        break;
      case 'atur': aturNilai(d.ruang, d.kunci, d.nilai); break;
      /* Halaman Task */
      case 'fokus-papan':
        Object.assign(S.task, { fokus: d.fokus, lingkup: S.view === 'dashboard' ? I.lingkupSah(S.me, S.dash.lingkup) : I.lingkupAwal(S.me), hal: 1 });
        simpanPref('task');
        pindahHalaman('task');
        break;
      case 'task-saring': S.task.saringBuka = !S.task.saringBuka; simpanPref('task'); render(); break;
      case 'task-bersih':
        Object.assign(S.task, { proyek: '', ...SARING_KOSONG, hal: 1 });
        simpanPref('task');
        render();
        break;
      case 'papan-proyek':
        Object.assign(S.task, { proyek: d.id, ...SARING_KOSONG, fokus: '', q: '', hal: 1, lingkup: I.lingkupBoleh(S.me).slice(-1)[0] });
        simpanPref('task');
        pindahHalaman('task');
        break;
      case 'daftar-status':
        Object.assign(S.task, { tampilan: 'daftar', status: d.status, hal: 1 });
        simpanPref('task');
        render();
        window.scrollTo(0, 0);
        break;
      case 'daftar-urut':
        if (S.task.urut === d.kunci) S.task.arah = S.task.arah === -1 ? 1 : -1;
        else Object.assign(S.task, { urut: d.kunci, arah: 1 });
        simpanPref('task');
        $('#hasil').innerHTML = hasilTask();
        break;
      case 'daftar-hal':
        S.task.hal += Number(d.n);
        $('#hasil').innerHTML = hasilTask();
        $('#hasil').scrollIntoView({ block: 'start' });
        break;
      case 'ekspor': eksporCsv(susunHirarki(daftarSaring()).map(x => x.t)); break;
      case 'jadwal-geser': {
        const awal = S.jadwal.mulai || I.tambahHari(I.rentang('minggu', hariIni()).dari, -7);
        S.jadwal.mulai = Number(d.n) ? I.tambahHari(awal, Number(d.n)) : '';
        render();
        break;
      }
      case 'kal-geser':
        S.kal.bulan = Number(d.n) ? I.geserBulan(S.kal.bulan || hariIni().slice(0, 7), Number(d.n)) : '';
        S.kal.hari = Number(d.n) ? '' : hariIni();
        render();
        break;
      case 'kal-hari': S.kal.hari = d.hari; if (d.hari.slice(0, 7) !== (S.kal.bulan || hariIni().slice(0, 7))) S.kal.bulan = d.hari.slice(0, 7); render(); break;
      case 'lap-buka': S.lap.buka = S.lap.buka === d.id ? '' : d.id; render(); break;
      case 'lap-salin': salinLaporan(); break;
      case 'buka-proyek': bukaProyek(d.id); break;
      case 'tutup-proyek': S.proyek = null; S.tahapBuka = null; render(); break;
      case 'tahap-proyek': lihatTahap(d.id, d.tahap); break;
      case 'proyek-arsip': S.proyekArsip = d.nilai === '1'; render(); break;
      case 'proyek-baru': bukaModal({ jenis: 'proyek' }, formProyek()); break;
      case 'mulai-siklus': {
        const p = proyekDari(d.id);
        try {
          ubahData('mulaiSiklus', { proyek: p.id });
          const q = proyekDari(p.id) || p;
          selesaiUbah(`${q.name}: siklus ${q.cycle} dimulai di Analysis. Tambahkan task-nya.`);
        } catch (err) { toast(err.message, true); }
        break;
      }
      case 'tahan-proyek': case 'lanjutkan-proyek': {
        const p = proyekDari(d.id);
        try {
          ubahData('setKeputusan', { proyek: p.id, keputusan: d.aksi === 'tahan-proyek' ? 'Hold' : 'Build' });
          selesaiUbah(d.aksi === 'tahan-proyek' ? 'Proyek ditahan.' : 'Proyek dilanjutkan.');
        } catch (err) { toast(err.message, true); }
        break;
      }
      case 'arsip-proyek': {
        const p = proyekDari(d.id || S.proyek);
        if (!p) return;
        try { ubahData('setArsip', { proyek: p.id, arsip: d.nilai === '1' }); selesaiUbah(d.nilai === '1' ? `${p.name} diarsipkan.` : `${p.name} aktif lagi.`); } catch (err) { toast(err.message, true); }
        break;
      }
      /* Rancangan Paket */
      case 'paket-buka': bukaPaket(d.id); break;
      case 'paket-elaborasi': {
        const p = paketDari(S.pkt.pilih);
        if (!p) break;
        bukaModal({ jenis: 'elaborasi', id: p.id }, formElaborasi(p));
        segarkanFormElaborasi($('#modal-panel form'));
        break;
      }
      case 'bukti-hapus':
        if (!t || !confirm('Hapus tautan bukti ini dari task?')) return;
        try { ubahData('hapusBukti', { task: t.id, bukti: d.bukti }); selesaiUbah('Bukti dihapus.'); } catch (err) { toast(err.message, true); }
        break;
      case 'sub-ubah':
        S.ubahSub = { task: d.id, sub: d.sub };
        render();
        { const isian = $('form[data-form="sub-ubah"] input[name="judul"]'); if (isian) { isian.focus(); isian.select(); } }
        break;
      case 'sub-batal': S.ubahSub = null; render(); break;
      case 'sub-hapus': {
        const s = t && t.subtasks.find(x => x.id === d.sub);
        if (!s || !confirm(`Hapus sub-task "${s.title}"?`)) return;
        try { ubahData('hapusSubtask', { task: t.id, sub: s.id }); selesaiUbah('Sub-task dihapus.'); } catch (err) { toast(err.message, true); }
        break;
      }
      case 'setoran-hapus':
        if (!confirm('Hapus setoran ini? Progres paket tidak lagi menghitung task ini untuk target tersebut.')) return;
        try { ubahData('hapusSetoran', { setoran: d.id }); selesaiUbah('Setoran dihapus.'); } catch (err) { toast(err.message, true); }
        break;
      case 'paket-tutup': Object.assign(S.pkt, { pilih: null, sunting: false, kotor: false }); render(); break;
      case 'pkt-platform': {
        const pl = d.nilai;
        S.pkt.platform = !pl ? [] : S.pkt.platform.includes(pl) ? S.pkt.platform.filter(x => x !== pl) : [...S.pkt.platform, pl];
        render();
        break;
      }
      case 'pkt-slicer-hapus': Object.assign(S.pkt, { dari: '', sampai: '' }); render(); break;
      case 'pkt-atur': S.pkt.atur = !S.pkt.atur; render(); break;
      case 'pkt-urut-bawaan': hapus(kunciUrutPaket()); render(); toast('Urutan paket kembali ke bawaan.'); break;
      case 'pkt-naik': geserPaket(d.id, -1); break;
      case 'pkt-turun': geserPaket(d.id, 1); break;
      case 'paket-baru': bukaModal({ jenis: 'paket-baru' }, formPaketBaru()); break;
      case 'paket-ubah': Object.assign(S.pkt, { sunting: true, kotor: false }); render(); window.scrollTo(0, 0); break;
      case 'paket-batal':
        if (!bolehTinggalkanPaket()) return;
        S.pkt.sunting = false;
        render();
        break;
      case 'paket-hapus': {
        const p = S.data.packages.find(x => x.id === S.pkt.pilih);
        if (!p || !confirm(`Hapus rancangan paket "${judulPaket(p)}"? Ini tidak bisa dibatalkan.`)) return;
        try { ubahData('hapusPaket', { paket: p.id }); Object.assign(S.pkt, { pilih: null, sunting: false }); selesaiUbah('Paket dihapus.'); } catch (err) { toast(err.message, true); }
        break;
      }
      case 'paket-salin':
        salinPaket(d.id ? S.data.packages.filter(p => p.id === d.id) : paketTersaring());
        break;
      case 'paket-tambah-item': {
        const blok = el.closest('[data-kategori]');
        $('.target-daftar', blok).insertAdjacentHTML('beforeend', barisTargetForm({ satuan: 'Paket' }));
        S.pkt.kotor = true;
        const baru = $$('[data-item]', blok).pop();
        $('[name="i-nama"]', baru).focus();
        break;
      }
      case 'paket-tambah-link': {
        const wadah = $('.tautan-daftar-form');
        wadah.insertAdjacentHTML('beforeend', barisTautanForm());
        S.pkt.kotor = true;
        $$('[data-tautan]', wadah).pop().querySelector('[name="l-label"]').focus();
        break;
      }
      case 'paket-hapus-baris': el.closest('[data-item], [data-tautan]').remove(); S.pkt.kotor = true; break;
      /* Komunikasi */
      case 'kom-saring':
        S.kom.saring = d.nilai;
        if (hp()) S.kom.pilih = null;
        render();
        break;
      case 'kom-buka':
        if (S.modal) tutupModal();
        bukaRuang(d.ruang, d.pesan || '');
        if (hp()) window.scrollTo(0, 0);
        break;
      case 'kom-tutup': Object.assign(S.kom, { pilih: null, balas: '', ubah: '' }); render(); break;
      case 'kom-konteks': S.kom.konteks = !S.kom.konteks; simpan('kom_konteks', S.kom.konteks); render(); break;
      case 'kom-proyek-semua': S.kom.proyekSemua = !S.kom.proyekSemua; $('#km-saring').innerHTML = saringKomHtml(); break;
      case 'kom-pilih-proyek': bukaModal({ jenis: 'pilih-ruang' }, formPilihRuang()); break;
      case 'kom-cepat': { const ta = $('#tulis-kom'); if (ta) sisipkan(ta, d.teks); break; }
      case 'kom-tanya': S.kom.tanya = !S.kom.tanya; perbaruiTulis(); break;
      case 'kom-batal': batalTulis(); break;
      case 'sebut-pilih': pakaiSebutan(Number(d.i)); break;
      case 'psn-balas':
      case 'psn-ubah': {
        const m = susunan().perId.get(d.id);
        const form = el.closest('.km-psn') && el.closest('.km-pesan') ? $(`.km-tulis[data-wadah="${el.closest('.km-pesan').id.replace('pesan-', '')}"]`) : null;
        if (!m || !form) break;
        const ta = form.elements.teks;
        if (d.aksi === 'psn-ubah') {
          if (m.oleh !== S.me) break;
          Object.assign(S.kom, { ubah: m.id, balas: '' });
          ta.value = m.teks;
        } else Object.assign(S.kom, { balas: m.id, ubah: '' });
        perbaruiTulis();
        tumbuhkan(ta);
        ta.focus();
        break;
      }
      case 'psn-reaksi': {
        const m = susunan().perId.get(d.id);
        if (!m || m.tertunda || m.gagal) break;
        const sudah = (m.reaksi[d.kode] || []).includes(S.me);
        kirimPeristiwa({ jenis: sudah ? 'lepas' : 'reaksi', ruang: m.ruang, oleh: S.me, target: m.id, kode: d.kode });
        break;
      }
      case 'psn-hapus': {
        const m = susunan().perId.get(d.id);
        if (!m || m.oleh !== S.me || !confirm('Hapus pesan ini?\n\nSemua orang akan melihat "Pesan dihapus". Teks aslinya masih tersimpan di spreadsheet v2, hanya disembunyikan di aplikasi.')) break;
        if (S.kom.ubah === m.id) batalTulis();
        kirimPeristiwa({ jenis: 'hapus', ruang: m.ruang, oleh: S.me, target: m.id });
        break;
      }
      case 'psn-beres': {
        const m = susunan().perId.get(d.id);
        if (m) kirimPeristiwa({ jenis: 'beres', ruang: m.ruang, oleh: S.me, target: m.id });
        break;
      }
      case 'psn-ke': {
        const kotak = el.closest('.km-pesan');
        if (kotak) lompatKePesan(kotak.id.replace('pesan-', ''), d.id);
        break;
      }
      case 'psn-ulang':
      case 'psn-buang': {
        const e2 = S.obr.peristiwa.find(x => x.id === d.id && x.gagal);
        if (!e2) break;
        S.obr.peristiwa.splice(S.obr.peristiwa.indexOf(e2), 1);
        if (d.aksi === 'psn-ulang') kirimPeristiwa(e2.asli); else obrolanBerubah();
        break;
      }
      /* Link Saya */
      case 'folder-baru': bukaModal({ jenis: 'folder-baru' }, formFolderBaru()); break;
      case 'link-tambah': bukaModal({ jenis: 'link', id: '' }, formLink(null, d.folder || '')); break;
      case 'link-ubah': { const l = S.data.links.find(x => x.id === d.id); if (l) bukaModal({ jenis: 'link', id: l.id }, formLink(l)); break; }
      case 'link-favorit': {
        const l = S.data.links.find(x => x.id === d.id);
        try { I.tandaiLink(S.data, S.me, d.id, !(l && l.favorit)); selesaiUbah(l && l.favorit ? `${l.title} masuk Favorit.` : ''); } catch (err) { toast(err.message, true); }
        break;
      }
      case 'link-buka-semua': bukaSemuaLink(d.folder); break;
      case 'link-ciut': {
        const p = prefLink();
        if (p.ciut.has(d.folder)) p.ciut.delete(d.folder); else p.ciut.add(d.folder);
        simpanPrefLink({ ciut: p.ciut });
        render();
        break;
      }
      case 'link-ciut-semua': {
        const kunci = kunciKartuLink();
        const p = prefLink();
        const semua = kunci.every(k => p.ciut.has(k));
        simpanPrefLink({ ciut: semua ? new Set() : new Set(kunci) });
        render();
        break;
      }
      case 'link-semat': {
        const p = prefLink();
        const semat = p.semat.includes(d.folder) ? p.semat.filter(f => f !== d.folder) : [...p.semat, d.folder];
        simpanPrefLink({ semat });
        render();
        toast(semat.includes(d.folder) ? `${d.folder} disematkan di atas.` : 'Sematan folder dilepas.');
        break;
      }
      case 'link-penuh':
        if (S.lnk.penuh.has(d.folder)) S.lnk.penuh.delete(d.folder); else S.lnk.penuh.add(d.folder);
        $('#hasil').innerHTML = hasilLink();
        break;
      case 'link-tampil': simpanPrefLink({ tampilan: d.nilai === 'daftar' ? 'daftar' : 'kartu' }); render(); break;
      case 'link-pindah': {
        const l = S.data.links.find(x => x.id === d.id);
        if (l) bukaModal({ jenis: 'link-pindah', id: l.id }, formIsian('Pindah folder', `Folder untuk "${l.title}" (kosongkan = Umum)`, l.folder, 'Pindahkan', folderSaya(linkSaya())));
        break;
      }
      case 'link-hapus': {
        const l = S.data.links.find(x => x.id === d.id);
        if (!l || !confirm(`Hapus link "${l.title}"?`)) return;
        try { I.hapusMilik(S.data.links, l.id, S.me); selesaiUbah('Link dihapus.'); } catch (err) { toast(err.message, true); }
        break;
      }
      /* Catatan Saya */
      case 'catatan-baru': catatanBaru(d.folder || ''); break;
      case 'catatan-pilih':
        pilihCatatan(d.id);
        if (hp() && !modeKartu()) window.scrollTo(0, 0);
        break;
      case 'catatan-kembali':
        if (editorDiJendela()) { tutupModal(); break; }
        simpanCatatanTertunda();
        S.ctt.pilih = null;
        render();
        break;
      case 'catatan-semat': {
        simpanCatatanTertunda();
        const n = catatanAktif();
        if (!n || n.id === '__baru') break;
        try {
          I.sematkanCatatan(S.data, S.me, n.id, !n.pin);
          selesaiUbah(n.pin ? 'Disematkan di atas daftar.' : 'Sematan dilepas.');
          if (editorDiJendela()) gambarUlangEditor();
        } catch (err) { toast(err.message, true); }
        break;
      }
      case 'ctt-tampil':
        simpanCatatanTertunda();
        simpan('ctt_tampil_' + S.me, d.nilai === 'kartu' ? 'kartu' : 'panel');
        S.ctt.pilih = null;
        render();
        break;
      case 'ctt-ciut': {
        const p = prefCatatan();
        if (p.ciut.has(d.folder)) p.ciut.delete(d.folder); else p.ciut.add(d.folder);
        simpan('ctt_ciut_' + S.me, [...p.ciut]);
        segarkanDaftarCatatan();
        break;
      }
      case 'ctt-saring-warna':
        simpanCatatanTertunda();
        S.ctt.warna = S.ctt.warna === d.warna ? '' : d.warna;
        render();
        break;
      case 'ctt-warna': {
        simpanCatatanTertunda();
        const n = catatanAktif();
        if (!n || n.id === '__baru') break;
        try { I.warnaiCatatan(S.data, S.me, n.id, d.warna); simpanData(); gambarUlangEditor(); } catch (err) { toast(err.message, true); }
        break;
      }
      case 'ctt-format': alatEditor(d.jenis); break;
      case 'ne-cek': centangBlok(el); break;
      case 'ne-tabel': opTabel(d.op, el); break;
      case 'ne-slash': pakaiMenuBlok(d.jenis); break;
      case 'ne-bawah': klikBawah(); break;
      case 'ctt-task': jadikanTask(d.baris === undefined ? undefined : Number(d.baris)); break;
      case 'ctt-templat': S.ctt.folderBaru = ''; bukaModal({ jenis: 'templat' }, formTemplat()); break;
      case 'ctt-templat-pakai': pakaiTemplat(Number(d.i)); break;
      case 'ctt-versi': {
        simpanCatatanTertunda();
        const n = catatanAktif();
        if (n && n.id !== '__baru') bukaModal({ jenis: 'versi', id: n.id, keEditor: editorDiJendela() }, formVersi(n));
        break;
      }
      case 'ctt-pulihkan': pulihkanVersi(Number(d.i)); break;
      case 'catatan-unduh': {
        simpanCatatanTertunda();
        const n = catatanAktif();
        if (n && n.id !== '__baru') unduhCatatan(n);
        break;
      }
      case 'catatan-hapus': {
        simpanCatatanTertunda();
        const n = catatanAktif();
        if (!n || n.id === '__baru' || !confirm(`Hapus catatan "${judulCatatan(n)}"? Ini tidak bisa dibatalkan; riwayat versinya ikut terhapus.`)) return;
        try {
          I.hapusMilik(S.data.notes, n.id, S.me);
          hapusVersi(n.id);
          if (editorDiJendela()) { S.modal = null; tutupModal(); }
          S.ctt.pilih = null;
          selesaiUbah('Catatan dihapus.');
        } catch (err) { toast(err.message, true); }
        break;
      }
      case 'folder-ganti':
        bukaModal({ jenis: 'folder-ganti', daftar: d.jenis, folder: d.folder }, formIsian(`Ganti nama folder "${d.folder}"`, 'Nama folder baru', d.folder, 'Simpan'));
        break;
      case 'folder-hapus': {
        if (!confirm(`Hapus folder "${d.folder}"?\n\nIsinya TIDAK ikut terhapus, hanya dipindah ke Umum.`)) return;
        try { const n = I.hapusFolder(S.data[d.jenis], S.me, d.folder); pindahPrefFolder(d.jenis, d.folder, ''); selesaiUbah(`Folder dihapus; ${n} isi pindah ke Umum.`); } catch (err) { toast(err.message, true); }
        break;
      }
      /* Tautan tim (dulu Dashboard Lain), di Link Saya; hanya Manager yang mengubah */
      case 'dashlain-tambah': bukaModal({ jenis: 'dashboard', id: '' }, formDashboard(null)); break;
      case 'dashlain-ubah': { const x = S.data.dashboards.find(y => y.id === d.id); if (x) bukaModal({ jenis: 'dashboard', id: x.id }, formDashboard(x)); break; }
      case 'dashlain-hapus': {
        const x = S.data.dashboards.find(y => y.id === d.id);
        if (!x || !confirm(`Hapus tautan tim "${x.title}"? Tautan ini hilang untuk ${S.mode === 'real' ? 'semua orang' : 'semua profil di browser ini'}.`)) return;
        try { ubahData('hapusDashboard', { id: x.id }); selesaiUbah('Tautan tim dihapus.'); } catch (err) { toast(err.message, true); }
        break;
      }
      case 'rwy-lagi': S.rwy.batas += 100; $('#hasil').innerHTML = hasilRiwayat(); break;
      /* Panduan */
      case 'panduan': bukaPanduan(d.id); break;
      case 'panduan-buka':
        simpan('kenal_' + S.me, 1);
        Object.assign(S.pnd, { tab: tabPeran(), buka: '' });
        simpanPref('pnd');
        pindahHalaman('panduan');
        break;
      case 'kenal-tutup': simpan('kenal_' + S.me, 1); render(); break;
      case 'coba': cobaPanduan(d.id); break;
      case 'pemandu-tutup': S.pemandu = null; renderPemandu(); break;
      case 'pemandu-kecil': S.pemanduKecil = !S.pemanduKecil; renderPemandu(); break;
    }
  });

  document.addEventListener('change', e => {
    const el = e.target;
    if (el.name === 'peran' && el.closest('form[data-form="orang"]')) {
      el.closest('form').querySelectorAll('[data-bagian-orang]').forEach(b => { b.hidden = b.dataset.bagianOrang !== el.value; });
      return;
    }
    // Master, sub-stage baru: kode ikut tahap yang dipilih; pekerjaan rutin tak ditinjau.
    if (el.name === 'tahap' && el.closest('form[data-form="mst-sub"]')) {
      const form = el.closest('form');
      form.elements.namedItem('kunci').value = kodeSubBerikut(el.value);
      const review = $('[data-bagian-sub="review"]', form);
      if (review) review.hidden = el.value === 'R';
      return;
    }
    if (el.id === 'foto-berkas') {
      mulaiPotong(el.files && el.files[0]);
      el.value = '';
      return;
    }
    if (el.dataset.aksi === 'centang-sub') {
      try { ubahData('centangSubtask', { task: el.dataset.id, sub: el.dataset.sub, done: el.checked }); selesaiUbah(); } catch (err) { toast(err.message, true); render(); }
    } else if (el.dataset.slicer) {
      // Isian tanggal slicer; dari yang lebih besar dari sampai ditukar.
      S.pkt[el.dataset.slicer] = el.value || '';
      if (S.pkt.dari && S.pkt.sampai && S.pkt.dari > S.pkt.sampai) [S.pkt.dari, S.pkt.sampai] = [S.pkt.sampai, S.pkt.dari];
      render();
    } else if (el.dataset.aksi === 'saring') {
      aturNilai(el.dataset.ruang, el.dataset.kunci, el.value);
    } else if (el.dataset.aksi === 'tautkan-paket') {
      const proj = proyekDari(el.dataset.id);
      try { ubahData('tautkanPaket', { proyek: proj.id, paket: el.value }); selesaiUbah(el.value ? 'Proyek ditautkan ke rancangan paket.' : 'Tautan paket dilepas.'); } catch (err) { toast(err.message, true); render(); }
    } else if (el.dataset.aksi === 'keputusan') {
      const p = proyekDari(el.dataset.id);
      try { ubahData('setKeputusan', { proyek: p.id, keputusan: el.value }); selesaiUbah(el.value === 'Hold' ? 'Proyek ditahan.' : `Keputusan proyek: ${el.value}.`); } catch (err) { toast(err.message, true); render(); }
    } else if (el.closest('.form-elaborasi')) {
      if (el.name === 'item') {
        const baris = el.closest('.pilih-baris');
        baris.classList.toggle('tak-dipilih', !el.checked);
        const jumlah = $('.jumlah-elaborasi .input', baris);
        if (jumlah) jumlah.disabled = !el.checked;
      }
      segarkanFormElaborasi(el.closest('form'));
    } else if (el.closest('form[data-task]')) {
      const form = el.closest('form');
      if (el.name === 'pic') { el.dataset.otomatis = ''; segarkanInduk(form); return; }
      if (el.name === 'induk') { el.dataset.disentuh = '1'; return; }
      segarkanFormTask(form);
    }
  });

  document.addEventListener('submit', e => {
    const form = e.target;
    if (form.dataset.form === 'pesan') { e.preventDefault(); kirimPesan(form); return; }
    if (form.id === 'form-kunci') {
      e.preventDefault();
      const tombol = $('#kunci-tombol');
      tombol.disabled = true;
      api('masuk', [$('#kunci-pin').value]).then(h => {
        tombol.disabled = false;
        if (!h.success) return kunciGagal(h.message || 'PIN salah.');
        muat();
      });
      return;
    }
    if (form.dataset.form === 'masuk-dev') { e.preventDefault(); kirimMasukDev(form); return; }
    if (form.dataset.form === 'orang') { e.preventDefault(); kirimOrang(form); return; }
    // PIN profil dan halaman Master (0.14.0).
    const khusus = { 'pin-profil': kirimPinProfil, 'mst-sub': kirimMasterSub, 'mst-kat': kirimMasterKategori,
      'mst-tambah': kirimMasterTambah, 'mst-label': kirimMasterLabel, 'mst-pin': kirimFormPin }[form.dataset.form];
    if (khusus) { e.preventDefault(); khusus(form); return; }
    const jenis = form.dataset.form;
    if (!jenis) return;
    e.preventDefault();
    const waktu = Date.now();
    if (jenis === 'modal') return kirimModal(form);
    if (jenis === 'paket') {
      try {
        ubahData('simpanPaket', { paket: form.dataset.id, f: bacaFormPaket(form) });
        Object.assign(S.pkt, { sunting: false, kotor: false });
        selesaiUbah('Rancangan paket disimpan.');
        window.scrollTo(0, 0);
      } catch (err) {
        const g = $('#galat-paket');
        g.textContent = err.message;
        g.hidden = false;
        toast(err.message, true);
      }
      return;
    }
    if (jenis === 'setoran') {
      const t = S.data.tasks.find(x => x.id === form.dataset.id);
      const [paket, item] = String(isianForm(form, 'sasaran').value).split('|');
      const isi = { paket, item, jumlah: isianForm(form, 'jumlah').value, tahap: isianForm(form, 'tahap').value };
      try { ubahData('setorkan', { task: t.id, f: isi }); selesaiUbah('Setoran disimpan.'); } catch (err) { toast(err.message, true); }
      return;
    }
    if (jenis === 'output' || jenis === 'bukti') {
      const t = S.data.tasks.find(x => x.id === form.dataset.id);
      if (!t) return;
      try {
        if (jenis === 'output') {
          ubahData('isiOutput', { task: t.id, isi: isianForm(form, 'output').value });
          selesaiUbah('Output disimpan.');
        } else {
          ubahData('tambahBukti', { task: t.id, f: { url: isianForm(form, 'url').value, label: isianForm(form, 'label').value } });
          selesaiUbah('Bukti ditambahkan.');
        }
      } catch (err) { toast(err.message, true); }
      return;
    }
    if (jenis === 'link-cepat') {
      const url = isianForm(form, 'url').value, folder = isianForm(form, 'folder').value;
      if (!url.trim()) return;
      try {
        const l = I.simpanLink(S.data, S.me, { url, folder }, '', waktu);
        simpan('lnk_folder_' + S.me, folder);
        selesaiUbah(`${l.title} ditambahkan ke ${l.folder || I.FOLDER_UMUM}. Judulnya bisa diubah lewat ikon pensil.`);
        const el = $('#link-tempel');
        if (el) el.focus();
      } catch (err) { toast(err.message, true); }
      return;
    }
    const t = S.data.tasks.find(x => x.id === form.dataset.id);
    if (!t) return;
    try {
      if (jenis === 'sub-tambah') {
        ubahData('tambahSubtask', { task: t.id, f: { title: form.judul.value, pic: form.pic.value } });
        selesaiUbah();
      } else if (jenis === 'sub-ubah') {
        ubahData('ubahSubtask', { task: t.id, sub: form.dataset.sub, f: { title: form.judul.value, pic: form.pic.value } });
        S.ubahSub = null;
        selesaiUbah('Sub-task disimpan.');
      } else if (jenis === 'anak') {
        const a = ubahData('taskAnak', { induk: t.id, f: { title: form.judul.value, pic: form.pic.value, due: form.due.value } });
        selesaiUbah(`${a.id} dibuat untuk ${I.orang(a.pic).pendek} di bawah ${t.id}.`);
      }
    } catch (err) { toast(err.message, true); }
  });

  document.addEventListener('input', e => {
    const el = e.target;
    if (el.classList && el.classList.contains('ne-teks')) { inputBlok(el, e); return; }
    if (el.id === 'foto-zoom') { if (kerat) aturZoom(Number(el.value)); return; }
    if (el.id === 'palet-q') { S.palet.q = el.value; S.palet.pilih = 0; $('#palet-hasil').innerHTML = hasilPalet(); return; }
    if (el.classList.contains('km-isian')) {
      // Draf per ruang; teks yang sedang diubah bukan draf.
      if (!S.kom.ubah) S.kom.draf[el.closest('form').dataset.ruang] = el.value;
      tumbuhkan(el);
      perbaruiSebutan(el);
      return;
    }
    if (['catatan-judul', 'catatan-isi', 'catatan-folder'].includes(el.id)) { catatanBerubah(); return; }
    if (el.closest('[data-form="paket"]')) { S.pkt.kotor = true; return; }
    if (el.dataset && el.dataset.slicerGeser) { geserSlicer(el); return; }
    const ruang = el.dataset.cari;
    if (!ruang) return;
    const kunci = { task: 'task', paket: 'pkt', komunikasi: 'kom', link: 'lnk', catatan: 'ctt', riwayat: 'rwy' }[ruang];
    S[kunci].q = el.value;
    if (kunci === 'task') S.task.hal = 1;
    if (kunci === 'rwy') S.rwy.batas = 100;
    const wadah = $('#hasil');
    if (wadah && HASIL[S.view]) wadah.innerHTML = HASIL[S.view]();
  });

  /* Di Link Saya, menempel alamat di mana saja (bukan di kotak isian) langsung menambah link. */
  document.addEventListener('paste', e => {
    // Editor catatan: hanya teks biasa (format dari halaman lain tak ikut); beberapa baris jadi blok.
    const blokTempel = e.target.closest && e.target.closest('.ne-teks');
    if (blokTempel) {
      e.preventDefault();
      keMentah(blokTempel);
      return tempelBlok(blokTempel, e.clipboardData ? e.clipboardData.getData('text/plain') : '');
    }
    const berkas = e.clipboardData && [...e.clipboardData.files].find(f => /^image\//.test(f.type));
    if (S.modal && S.modal.jenis === 'foto' && berkas) { e.preventDefault(); return mulaiPotong(berkas); }
    if (S.view !== 'link' || $('#app').hidden || !$('#modal').hidden) return;
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    const teks = (e.clipboardData && e.clipboardData.getData('text') || '').trim();
    if (!teks || /\s/.test(teks) || !I.tautanRapi(teks)) return;
    e.preventDefault();
    const isian = $('#link-tempel');
    if (!isian) return;
    isian.value = teks;
    isian.form.requestSubmit();
  });

  document.addEventListener('keydown', e => {
    const tombol = String(e.key || '').toLowerCase();
    const aplikasi = !$('#app').hidden && !!S.data;
    // Editor blok Catatan: panah, Tab, menu "/", format, dan urungkan (Enter/Backspace lewat beforeinput).
    if (e.target.closest && e.target.closest('.ne[data-ne]') && tombolEditor(e)) return;
    // Judul catatan: Enter atau panah bawah turun ke blok pertama.
    if (e.target.id === 'catatan-judul' && (e.key === 'Enter' || e.key === 'ArrowDown') && !e.isComposing) { e.preventDefault(); fokusKe({ i: 0 }); return; }
    // Rancangan Paket: nama yang sedang disunting (Enter simpan, Esc batal); Enter di kartu membukanya.
    if (e.target.classList && e.target.classList.contains('sunting-judul') && !e.isComposing) {
      if (e.key === 'Enter') { e.preventDefault(); selesaiSuntingJudul(e.target, true); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); selesaiSuntingJudul(e.target, false); }
      return;
    }
    if (e.key === 'Enter' && e.target.matches && e.target.matches('.kartu-paket[data-aksi="paket-buka"]')) { e.preventDefault(); bukaPaket(e.target.dataset.id); return; }
    // Panggung potong foto: panah menggeser, + dan − memperbesar, Enter menyimpan.
    if (e.target.id === 'foto-panggung' && kerat) {
      const d = e.shiftKey ? 30 : 8;
      const geser = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }[e.key];
      if (geser) { e.preventDefault(); kerat.x += geser[0]; kerat.y += geser[1]; return gambarPotong(); }
      if (e.key === '+' || e.key === '=') { e.preventDefault(); return aturZoom(kerat.zoom * 1.1); }
      if (e.key === '-' || e.key === '_') { e.preventDefault(); return aturZoom(kerat.zoom / 1.1); }
      if (e.key === 'Enter') { e.preventDefault(); return simpanFotoSaya(); }
    }
    // Kotak tulis Komunikasi: Enter kirim, Shift+Enter baris baru; panah memilih @sebutan.
    if (e.target.classList && e.target.classList.contains('km-isian')) {
      const kotak = sebutAktif && $('#sebut-' + sebutAktif.wadah);
      if (kotak && !kotak.hidden) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          sebutAktif.i = (sebutAktif.i + (e.key === 'ArrowDown' ? 1 : -1) + sebutAktif.calon.length) % sebutAktif.calon.length;
          return gambarSebutan();
        }
        if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); return pakaiSebutan(sebutAktif.i); }
        if (e.key === 'Escape') { e.preventDefault(); return tutupSebutan(); }
      }
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); return kirimPesan(e.target.form); }
      if (e.key === 'Escape' && (S.kom.balas || S.kom.ubah || S.kom.tanya)) { e.preventDefault(); S.kom.tanya = false; return batalTulis(); }
    }
    if ((e.ctrlKey || e.metaKey) && tombol === 'k' && aplikasi) {
      e.preventDefault();
      if (S.modal && S.modal.jenis === 'palet') tutupModal(); else bukaPalet();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && tombol === 's' && aplikasi && S.view === 'catatan' && $('[data-catatan]')) {
      e.preventDefault();
      clearTimeout(tundaCatatan);
      tundaCatatan = null;
      if (simpanCatatanSekarang()) toast('Catatan disimpan.');
      return;
    }

    if (S.modal && S.modal.jenis === 'palet') {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); geserPalet(e.key === 'ArrowDown' ? 1 : -1); return; }
      if (e.key === 'Enter') { e.preventDefault(); jalankanPalet(S.palet.pilih); return; }
    }
    if (e.key === 'Escape') {
      const menu = $('details.menu-lagi[open]');
      if (menu) { menu.open = false; return menu.querySelector('summary').focus(); }
      if (!$('#modal').hidden) return tutupModal();
      if (S.notif.buka) return bukaTutupNotif(false);
      if (S.pilih && !$('#laci').hidden) { S.pilih = null; return render(); }
      if (S.navBuka) { S.navBuka = false; return render(); }
    }
    const mengetik = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
    if (e.key === '/' && !mengetik && aplikasi && !S.modal) { e.preventDefault(); bukaPalet(); }
  });

  /* Tombol toolbar catatan, alat tabel, dan menu "/": kursor dan blok teks tetap di tempatnya saat
     ditekan. Blok berformat yang diklik berganti ke teks mentahnya SEBELUM peramban menaruh kursor,
     jadi kursornya jatuh di tempat yang diklik. Tautan dan tombol di dalam blok tak memulai sunting. */
  document.addEventListener('mousedown', e => {
    if (!e.target.closest) return;
    if (e.target.closest('.ctt-toolbar button, .ne-tabel-alat button, .ne-menu button')) { e.preventDefault(); return; }
    const el = e.target.closest('.ne-teks');
    if (!el || el === document.activeElement) return;
    if (e.target.closest('a, button')) { e.preventDefault(); return; }
    if (el.dataset.tampil !== 'format') return;
    // Isinya berganti, jadi titik klik lama tak berlaku lagi: kursor ditaruh sendiri di titik klik.
    e.preventDefault();
    tampilMentah(el);
    el.focus();
    if (!letakkanDiTitik(el, e.clientX, e.clientY)) aturKursor(el, bacaTeks(el).length);
  });
  /* Enter dan Backspace/Delete di tepi blok diatur editor (juga papan ketik ponsel, yang sering tak
     mengirim keydown yang jelas); format bawaan peramban (Ctrl+B dll.) dan seret-lepas ditolak. */
  document.addEventListener('beforeinput', e => {
    const el = e.target.closest && e.target.closest('.ne-teks');
    if (!el) return;
    keMentah(el);   // jaga-jaga: ketikan tak boleh mendarat di teks berformat (tanda formatnya hilang)
    const t = e.inputType || '';
    if (t === 'insertParagraph' || t === 'insertLineBreak') { e.preventDefault(); enterBlok(el); return; }
    if (t === 'historyUndo' || t === 'historyRedo') { e.preventDefault(); undoEditor(t === 'historyUndo' ? -1 : 1); return; }
    if (t.startsWith('format') || t === 'insertFromDrop') { e.preventDefault(); return; }
    if (t.startsWith('delete')) {
      const [a, z] = rentangKursor(el);
      if (a !== z) return;
      if (/Backward$/.test(t) && a === 0) { e.preventDefault(); hapusDiAwal(el); return; }
      if (/Forward$/.test(t) && a === bacaTeks(el).length) { e.preventDefault(); hapusDiAkhir(el); }
    }
  });
  document.addEventListener('drop', e => { if (e.target.closest && e.target.closest('.ne[data-ne]')) e.preventDefault(); });
  // Blok yang sedang diketik menampilkan teks mentah; yang ditinggalkan kembali berformat.
  document.addEventListener('focusin', e => {
    const el = e.target;
    if (!el.classList || !el.classList.contains('ne-teks')) return;
    keMentah(el);
    ED.fokus = posisiEl(el);
  });
  document.addEventListener('focusout', e => {
    const el = e.target;
    if (!el.classList || !el.classList.contains('ne-teks') || !el.isConnected) return;
    if (!document.hasFocus()) return;   // pindah jendela atau aplikasi: kursor tetap di tempatnya
    const [a, z] = rentangKursor(el);
    ED.kursorAkhir = { p: posisiEl(el), a, z };
    if (ED.slash && ED.slash.el === el) tutupMenuBlok();
    tampilFormat(el);
  });

  // Catatan yang masih menunggu simpan otomatis ikut tersimpan saat tab ditutup atau dimuat ulang.
  window.addEventListener('pagehide', () => simpanCatatanTertunda());

  /* Seret kartu antar kolom kanban (aturannya sama dengan tombol di detail), dan seret link
     ke kartu folder lain di Link Saya. */
  let seretLink = null;
  let seretPaket = null;
  document.addEventListener('dblclick', e => {
    const el = e.target.closest && e.target.closest('[data-sunting-judul]');
    if (!el || e.target.closest('.sunting-judul')) return;
    clearTimeout(tundaBukaPaket);
    e.preventDefault();
    mulaiSuntingJudul(el);
  });
  document.addEventListener('focusout', e => {
    if (e.target.classList && e.target.classList.contains('sunting-judul')) selesaiSuntingJudul(e.target, true);
  });
  /* Kartu Rancangan Paket diseret ke depan atau belakang kartu lain (sisi kiri/kanan kartu tujuan). */
  const sisiSeret = (e, kartu) => { const r = kartu.getBoundingClientRect(); return e.clientX > r.left + r.width / 2; };
  document.addEventListener('dragstart', e => {
    const kp = e.target.closest && e.target.closest('.kartu-paket[draggable="true"]');
    if (kp) {
      seretPaket = kp.dataset.paket;
      kp.classList.add('diseret');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', seretPaket);
      return;
    }
    const l = e.target.closest && e.target.closest('.baris-link[data-link-id]');
    if (l) {
      seretLink = l.dataset.linkId;
      l.classList.add('diseret');
      document.body.classList.add('menyeret-link');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', l.querySelector('a').href);
      return;
    }
    const k = e.target.closest && e.target.closest('.kartu[draggable="true"]');
    if (!k) return;
    S.seret = k.dataset.id;
    k.classList.add('diseret');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', k.dataset.id);
  });
  document.addEventListener('dragend', () => {
    S.seret = null;
    seretLink = null;
    seretPaket = null;
    document.querySelectorAll('.sisip-kiri, .sisip-kanan').forEach(x => x.classList.remove('sisip-kiri', 'sisip-kanan'));
    document.body.classList.remove('menyeret-link');
    document.querySelectorAll('.diseret, .kolom.sasaran, .kartu-folder.tujuan').forEach(x => x.classList.remove('diseret', 'sasaran', 'tujuan'));
  });
  // Folder tujuan link: semua kartu folder kecuali Tautan tim (dikelola Manager) dan folder asalnya.
  const folderTujuan = e => {
    const f = e.target.closest && e.target.closest('.kartu-folder[data-tujuan]');
    const l = f && S.data.links.find(x => x.id === seretLink);
    if (!l || f.dataset.tujuan === TIM) return null;
    if (f.dataset.tujuan === FAVORIT ? l.favorit : (l.folder || I.FOLDER_UMUM) === f.dataset.tujuan) return null;
    return f;
  };
  const adaBerkas = e => !!(e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files'));
  document.addEventListener('dragover', e => {
    if (S.modal && S.modal.jenis === 'foto' && adaBerkas(e)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; return; }
    if (seretPaket) {
      const k = e.target.closest && e.target.closest('.kartu-paket[data-paket]');
      document.querySelectorAll('.sisip-kiri, .sisip-kanan').forEach(x => x !== k && x.classList.remove('sisip-kiri', 'sisip-kanan'));
      if (!k || k.dataset.paket === seretPaket) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const kanan = sisiSeret(e, k);
      k.classList.toggle('sisip-kanan', kanan);
      k.classList.toggle('sisip-kiri', !kanan);
      return;
    }
    if (seretLink) {
      const f = folderTujuan(e);
      document.querySelectorAll('.kartu-folder.tujuan').forEach(x => x !== f && x.classList.remove('tujuan'));
      if (!f) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      f.classList.add('tujuan');
      return;
    }
    const kol = e.target.closest && e.target.closest('.kolom[data-kolom]');
    if (!kol || !S.seret) return;
    e.preventDefault();
    document.querySelectorAll('.kolom.sasaran').forEach(x => x !== kol && x.classList.remove('sasaran'));
    kol.classList.add('sasaran');
  });
  document.addEventListener('drop', e => {
    if (S.modal && S.modal.jenis === 'foto' && adaBerkas(e)) { e.preventDefault(); return mulaiPotong(e.dataTransfer.files[0]); }
    if (seretPaket) {
      const k = e.target.closest && e.target.closest('.kartu-paket[data-paket]');
      if (!k || k.dataset.paket === seretPaket) return;
      e.preventDefault();
      const id = seretPaket;
      seretPaket = null;
      pindahUrutanPaket(id, k.dataset.paket, sisiSeret(e, k));
      return;
    }
    if (seretLink) {
      const f = folderTujuan(e);
      if (!f) return;
      e.preventDefault();
      const id = seretLink;
      seretLink = null;
      pindahkanLink(id, f.dataset.tujuan);
      return;
    }
    const kol = e.target.closest && e.target.closest('.kolom[data-kolom]');
    if (!kol || !S.seret) return;
    e.preventDefault();
    const t = S.data.tasks.find(x => x.id === S.seret);
    const ke = kol.dataset.kolom;
    if (!t || t.status === ke) return;
    const hasil = I.aksiPindah(t, ke, S.me, I.indeks(S.data));
    if (hasil.galat) return toast(hasil.galat, true);
    if (hasil.perluCatatan) return mintaCatatan(t, hasil.kunci);
    jalankanAksi(t, hasil.kunci);
  });

  /* Tata letak berganti di 900px (ponsel ↔ desktop) dan 1200px (detail sebaris Hari Ini). */
  const tingkat = l => (l >= 1200 ? 2 : l >= 900 ? 1 : 0);
  let tingkatSebelumnya = tingkat(window.innerWidth);
  window.addEventListener('resize', () => {
    const kini = tingkat(window.innerWidth);
    if (kini === tingkatSebelumnya) return;
    tingkatSebelumnya = kini;
    if (kini > 0) S.navBuka = false;
    if (S.data && !$('#app').hidden && !S.pkt.sunting) render();
  });

  mulai().catch(galatMuat);
}());
