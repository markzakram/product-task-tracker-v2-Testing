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
    { grup: 'Bantuan', id: 'panduan', judul: 'Panduan', ikon: 'buku' },
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
    return !!h && (!h.peran || h.peran.includes(I.orang(S.me).peran));
  }
  const halamanAwal = () => (I.orang(S.me).peran === 'manager' ? 'proyek' : 'hari');
  /* Saringan task bersama semua tampilan Task (PRD: per tahap, sub-stage, tim, rumpun). */
  const SARING_KOSONG = { jalur: '', tahap: '', sub: '', tim: '', rumpun: '', platform: '' };
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
    proyekArsip: false,
    task: Object.assign({ tampilan: 'daftar', lingkup: '', fokus: '', proyek: '', ...SARING_KOSONG, status: 'aktif', urut: 'due', arah: 1 },
      prefTask(), { q: '', hal: 1, saringBuka: false }),
    jadwal: { kelompok: 'proyek', mulai: '' },
    kal: { bulan: '', hari: '' },
    /* Lingkup kosong = bawaan peran (I.lingkupAwal); yang tak boleh bagi peran itu ikut jatuh ke sana. */
    dash: { lingkup: '' },
    lap: { periode: 'minggu', tim: '', buka: '' },
    kom: { lingkup: 'terlibat', q: '', baru: false, pilih: null },
    pkt: { q: '', platform: '', pilih: null, sunting: false, kotor: false },
    lnk: { q: '' },
    /* pilih = catatan yang terbuka di editor: id, '__baru' (belum tersimpan), atau null. */
    ctt: { q: '', folder: '', pilih: null },
    rwy: { jenis: '', orang: '', q: '', batas: 100 },
    pnd: { tab: ambil('pnd_tab', 'mulai'), buka: '' },
    /* Panduan yang sedang dicoba: langkahnya tampil di kotak melayang (#pemandu). */
    pemandu: null,
    pemanduKecil: false,
    palet: { q: '', pilih: 0 },
    notif: { buka: false, sebelum: 0 },
    navBuka: false,
    modal: null,
    seret: null,
  };
  {
    const KE_TAMPILAN = { kanban: 'kanban', daftar: 'daftar', timeline: 'timeline', kalender: 'kalender' };
    if (KE_TAMPILAN[S.view]) Object.assign(S, { view: 'task', task: { ...S.task, tampilan: KE_TAMPILAN[S.view] } });
    if (S.view === 'dashlain') S.view = 'link';
    if (!ID_TAMPILAN.includes(S.task.tampilan)) S.task.tampilan = 'daftar';
  }

  function simpanData() { simpan('data', { versi: S.versi, dimuat: S.dimuat, data: S.data }); }
  function simpanPref(ruang) {
    if (ruang === 'task') { const { q, hal, saringBuka, ...sisa } = S.task; simpan('task', { ...sisa, lk: 2 }); }
    if (ruang === 'pnd') simpan('pnd_tab', S.pnd.tab);
  }

  /* Tanda baca Komunikasi, per profil. Komentar yang sudah ada saat data dimuat
     dianggap terbaca; yang ditulis sesudahnya (oleh profil lain) belum. */
  let bacaMilik = null, bacaPeta = {};
  function petaBaca() {
    if (bacaMilik !== S.me) { bacaPeta = ambil('baca_' + S.me, {}); bacaMilik = S.me; }
    return bacaPeta;
  }
  const sejakBaca = t => Math.max(S.dimuat || 0, Number(petaBaca()[t.id]) || 0);
  function tandaiDibaca(t) {
    const terakhir = t.comments.reduce((m, k) => Math.max(m, Number(k.at) || 0), 0);
    const p = petaBaca();
    if (terakhir > (Number(p[t.id]) || 0)) { p[t.id] = terakhir; simpan('baca_' + S.me, p); }
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
    bintang: '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
    semat: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
    tambahFolder: '<path d="M12 10v6M9 13h6"/><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  };
  const ikon = (nama, ukuran = 18) => `<svg width="${ukuran}" height="${ukuran}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${JALUR_IKON[nama] || ''}</svg>`;
  /* Nama ikon Dashboard Lain berasal dari v1 (Material Icons). */
  const IKON_DASH = { dashboard: 'jendela', bar_chart: 'grafik', timeline: 'aktivitas', table_chart: 'tabel', description: 'laporan', assignment: 'papanKlip', school: 'toga', event: 'kalender' };
  const LOGO = '<span class="merek-ikon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5CC6F7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg></span>';

  /* ---------- Potongan tampilan ---------- */

  const WARNA = ['#0068B4', '#004F94', '#003078', '#0E7490', '#3D4654', '#7A3E9D', '#067647', '#8A4B00', '#B42318', '#9F1239', '#5B6470', '#00214F'];
  function warnaOrang(id) {
    let h = 0;
    for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return WARNA[h % WARNA.length];
  }
  const avatar = (id, kelas = '') => `<span class="avatar ${kelas}" style="background:${warnaOrang(id)}" title="${esc(I.orang(id).nama)}">${esc(I.inisial(id))}</span>`;
  const nama = id => esc(I.orang(id).pendek);

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
  /* Kode sub-stage (PRD v3): kode ADDIE di dalam proyek; R1–R4 = rutin; kode ADDIE di luar
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
  const chipPenting = t => (t.priority === 'Urgent' ? '<span class="chip-penting">Mendesak</span>' : t.priority === 'High' ? '<span class="chip-penting">Penting</span>' : '');
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
    Siap: ['lb-siap', 'Bisa dimulai: task yang ditunggu sudah selesai'],
    Menunggu: ['lb-menunggu', 'Menunggu task lain selesai'],
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

  function barisTask(t, alasan = '') {
    const sub = ringkasSub(t);
    // Siap tak perlu ditandai di daftar; Menunggu/Tertahan sudah terbaca dari alasannya.
    const lb = I.labelKeadaan(t, perIdKini());
    const label = lb && lb !== 'Siap' && !String(alasan).startsWith(lb) ? chipLabel(t) : '';
    return `<button type="button" class="baris ${S.pilih === t.id ? 'dipilih' : ''}" data-aksi="buka-task" data-id="${esc(t.id)}">
      ${pillStatus(t.status)}
      <span class="baris-isi">
        <span class="baris-judul">${esc(t.title)}</span>
        <span class="baris-meta">${chipJalur(t)} ${esc(asal(t))}${sub ? ' · ' + sub : ''} ${label} ${chipSetor(t)} ${chipPenting(t)}</span>
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
    return `<div class="kartu ${telat ? 'telat' : ''}" draggable="true" data-id="${esc(t.id)}">
      <span class="kartu-atas">${chipJalur(t)} ${chipLabel(t, ['Siap', 'Menunggu', 'Tertahan'])} ${chipSetor(t)} <span>${esc(asal(t))}</span></span>
      <button type="button" class="kartu-judul" data-aksi="buka-task" data-id="${esc(t.id)}">${esc(t.title)}</button>
      ${sub ? `<span class="kartu-sub"><span class="batang"><span style="width:${Math.round(beres / sub * 100)}%"></span></span>${beres}/${sub}</span>` : ''}
      ${t.tertahan ? `<span class="tanda-tahan">Tertahan: ${esc(t.alasanTertahan || 'tanpa alasan')}</span>` : dep.length && !I.selesai(t) ? `<span class="kartu-tunggu">Menunggu ${esc(dep[0].id)}</span>` : ''}
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
  const OPSI_TAHAP = [SEMUA, ...I.TAHAP.map(x => [x.id, `${x.id} · ${x.nama}`]), ['R', 'Rutin (R1–R4)']];
  const OPSI_TIM = [SEMUA, ...Object.values(I.TIM).map(x => [x.kode, `${x.kode} · ${x.nama}`])];
  const OPSI_RUMPUN = [SEMUA, ...I.RUMPUN.map(([n]) => [n, n])];
  const opsiSubTahap = tahap => [SEMUA, ...I.SUB_TAHAP.filter(s => s.tahap === tahap).map(s => [s.kode, `${s.kode} · ${s.nama}`])];
  /* Saringan halaman Task, berlaku di semua tampilannya. Pilihan sub-stage muncul sesudah tahap dipilih. */
  const pilihanSaring = (ruang, f) => [
    pilihan(ruang, 'jalur', f.jalur, OPSI_JALUR, 'Jalur'),
    pilihan(ruang, 'tahap', f.tahap, OPSI_TAHAP, 'Tahap'),
    f.tahap ? pilihan(ruang, 'sub', f.sub, opsiSubTahap(f.tahap), 'Sub-stage') : '',
    pilihan(ruang, 'tim', f.tim, OPSI_TIM, 'Tim'),
    pilihan(ruang, 'rumpun', f.rumpun, OPSI_RUMPUN, 'Rumpun'),
    pilihan(ruang, 'platform', f.platform, [SEMUA, ...daftarPlatform().map(x => [x, x])], 'Platform'),
  ].join('');
  const nilaiSaring = f => ({ jalur: f.jalur, tahap: f.tahap, sub: f.sub, tim: f.tim, rumpun: f.rumpun, platform: f.platform });
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

  async function api(action, args = []) {
    try {
      const r = await fetch('/api/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, args }) });
      const d = await r.json().catch(() => ({ success: false, message: `Balasan server tak terbaca (HTTP ${r.status}).` }));
      return { http: r.status, ...d };
    } catch (e) {
      return { http: 0, success: false, message: 'Server tak terjangkau. Periksa koneksi, lalu muat ulang halaman.' };
    }
  }
  async function adaServer() {
    try { const d = await (await fetch('/api/rpc', { cache: 'no-store' })).json(); return !!d && d.app === 'producttrack-v2'; } catch (e) { return false; }
  }

  function rapikan(d) {
    const daftar = x => (Array.isArray(x) ? x : []);
    const angka = v => Number(v) || 0;
    return {
      projects: daftar(d.projects).map(p => ({ ...p, lead: p.lead || '', paket: p.paket || '', history: daftar(p.history) })),
      tasks: daftar(d.tasks).map(t => ({
        ...t, sub: t.sub || '', support: daftar(t.support), deps: daftar(t.deps), subtasks: daftar(t.subtasks), comments: daftar(t.comments),
        tinjauan: daftar(t.tinjauan), evidence: daftar(t.evidence), output: t.output || '', selesaiAt: Number(t.selesaiAt) || 0,
      })),
      packages: daftar(d.packages).map(p => ({
        ...p, namaPaket: p.namaPaket || p.name || '', mirror: !!p.mirror,
        items: daftar(p.items).map(i => ({ ...i, target: angka(i.target), awal: angka(i.awal), satuan: i.satuan || 'Paket' })),
        links: daftar(p.links),
      })),
      setoran: daftar(d.setoran).map(x => ({ ...x, jumlah: Number(x.jumlah) || 0, tahap: x.tahap || '', batch: x.batch || '' })),
      dashboards: daftar(d.dashboards),
      links: daftar(d.links).map(l => ({ ...l, favorit: !!l.favorit })),
      notes: daftar(d.notes).map(n => ({ ...n, pin: !!n.pin, createdAt: angka(n.createdAt), updatedAt: angka(n.updatedAt) })),
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
        <button type="button" data-aksi="pilih-profil" data-id="${o.id}">${avatar(o.id, 'besar')}<span>${esc(o.nama)}<span>${esc(o.jabatan)}</span></span></button>`).join('')}
      </div>`).join('');
    $('#profil').innerHTML = `<div class="kartu-layar lebar">
      <span class="merek">${LOGO}ProductTrack</span>
      <div><h1 style="margin:0;font-size:22px;color:var(--navy)">Masuk sebagai siapa?</h1>
      <p class="pesan-info" style="margin-top:6px">PIN dipakai bersama, jadi pilih profil Anda sendiri. Tampilan menyesuaikan peran: Staff dan Lead mulai di Hari Ini, Manager di Proyek.</p></div>
      ${kelompok}
    </div>`;
    $('#kunci').hidden = true;
    $('#app').hidden = true;
    $('#profil').hidden = false;
  }

  /* Alamat yang dibuka orang (mis. tautan task yang dikirim lewat chat) dipakai sekali,
     sesudah masuk dan memilih profil. */
  let alamatAwal = location.hash;
  function masukApp() {
    $('#kunci').hidden = true;
    $('#profil').hidden = true;
    $('#app').hidden = false;
    let hilang = '';
    if (alamatAwal) { hilang = terapkanAlamat(alamatAwal).hilang; alamatAwal = ''; }
    if (!halamanBoleh(S.view)) S.view = halamanAwal();
    simpan('halaman', S.view);
    alamatGanti = true;
    render();
    if (hilang) toast(`${hilang} tidak ada di data browser ini. Data contoh tersimpan per browser, jadi yang dibuat di browser lain tidak ikut.`, true);
  }

  /* reset = sesudah "Reset data contoh": data lokal sudah dibuang, jadi yang dimuat pasti
     data contoh dari spreadsheet (spreadsheet tak pernah diubah aplikasi). */
  async function muat(reset = false) {
    tampilKunci(reset ? 'Mengembalikan data contoh…' : 'Memuat data…', true);
    const h = await api('muatContoh');
    if (h.http === 401) return tampilKunci('Masukkan PIN untuk melanjutkan.', false);
    if (!h.success) {
      const pesan = h.message || `Gagal memuat data (HTTP ${h.http}).`;
      return tampilKunci(h.kode === 'SETELAN' ? pesan : `PIN diterima, tetapi data gagal dimuat. ${pesan}`, true, true);
    }
    const lokal = ambil('data', null);
    let pesan = '';
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
    S.versi = h.versi || '';
    S.sumber = h.sumber || '';
    simpanData();
    if (!S.me || !I.ORANG.some(o => o.id === S.me)) tampilProfil();
    else masukApp();
    if (pesan) toast(pesan);
  }

  async function mulai() {
    tampilKunci('Memeriksa sesi…', true);
    if (!await adaServer()) {
      return tampilKunci('Aplikasi ini perlu server. Jalankan npm run dev, atau buka lewat alamat Vercel.', true);
    }
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
    if (S.view === 'komunikasi' && S.kom.pilih) b.push(S.kom.pilih);
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
    let hilang = '';
    const ada = (daftar, id) => { const ok = daftar.some(x => x.id === id); if (!ok && !hilang) hilang = id; return ok; };
    Object.assign(S, { view: hal, pilih: null });
    if (hal === 'proyek') S.proyek = null;
    if (hal === 'paket') Object.assign(S.pkt, { pilih: null, sunting: false, kotor: false });
    if (hal === 'komunikasi') S.kom.pilih = null;
    if (hal === 'catatan') S.ctt.pilih = null;
    for (const x of sisa) {
      if (/^PRD-/.test(x)) { if (ada(S.data.tasks, x)) { if (hal === 'komunikasi') S.kom.pilih = x; else S.pilih = x; } }
      else if (hal === 'task' && ID_TAMPILAN.includes(x)) S.task.tampilan = x;
      else if (hal === 'proyek' && /^PRJ-/.test(x)) { if (ada(S.data.projects, x)) S.proyek = x; }
      else if (hal === 'paket' && /^PKG-/.test(x)) { if (ada(S.data.packages, x)) S.pkt.pilih = x; }
      else if (hal === 'catatan' && S.data.notes.some(n => n.id === x && n.user === S.me)) S.ctt.pilih = x;
    }
    return { ok: true, hilang };
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
    tutupModal();
    S.notif.buka = false;
    const r = terapkanAlamat(location.hash);
    if (!r.ok) S.view = halamanAwal();
    alamatGanti = true;
    render();
    if (r.hilang) toast(`${r.hilang} tidak ada di data browser ini.`, true);
  });
  const tautanKe = alamat => location.href.split('#')[0] + alamat;

  /* ---------- Kerangka: sidebar, bilah atas, bilah bawah ---------- */

  function lencanaNav() {
    const h = hariIni();
    const kerja = I.pekerjaanSaya(S.data, S.me, h);
    return {
      hari: kerja.grup.filter(g => ['tinjau', 'antrean', 'telat', 'hari'].includes(g.kunci)).reduce((n, g) => n + g.isi.length, 0),
      proyek: I.orang(S.me).peran === 'manager' ? I.antreKeputusan(S.data, h).length : 0,
      komunikasi: I.utasDiskusi(S.data, S.me, 'terlibat', sejakBaca, '').filter(x => x.baru).length,
    };
  }
  const lencanaHtml = (id, n) => (n ? `<span class="lencana ${id === 'hari' ? 'biru' : ''}">${n}</span>` : '');

  function renderSamping(lencana) {
    const o = I.orang(S.me);
    const grup = [...new Set(HALAMAN.map(h => h.grup))];
    $('#samping').innerHTML = `
      <div class="samping-merek">
        <a class="merek" href="#" data-aksi="ke" data-view="awal">${LOGO}<span>ProductTrack<small>Divisi Produk · v2</small></span></a>
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
          <div class="kotak-profil-atas">${avatar(S.me, 'besar')}<span><strong>${esc(o.nama)}</strong><small>${esc(I.PERAN[o.peran])} · ${esc(o.jabatan)}</small></span></div>
          <div class="kotak-profil-aksi">
            <button type="button" class="tombol kecil" data-aksi="ganti-profil">${ikon('orang', 16)} Ganti profil</button>
            <button type="button" class="ikon-tombol" data-aksi="keluar" title="Keluar" aria-label="Keluar">${ikon('keluar')}</button>
          </div>
        </div>
        <div class="kotak-data">
          <p class="samping-catatan">Data contoh. Perubahan hanya tersimpan di browser ini.</p>
          <button type="button" class="tombol kecil tombol-reset" data-aksi="reset-data">${ikon('ulang', 16)} Reset data contoh</button>
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
      <button type="button" class="cari" data-aksi="palet">${ikon('cari', 16)}<span>Cari task, proyek, paket, atau halaman…</span><kbd>${PINTASAN}</kbd></button>
      <button type="button" class="ikon-tombol cari-hp" data-aksi="palet" aria-label="Cari atau lompat">${ikon('cari', 20)}</button>
      <div class="notif">
        <button type="button" class="ikon-tombol tombol-notif" data-aksi="notif" aria-expanded="${S.notif.buka}" aria-label="Notifikasi${baru ? `, ${baru} baru` : ''}">${ikon('lonceng', 20)}${baru ? `<span class="lencana">${baru > 9 ? '9+' : baru}</span>` : ''}</button>
        ${S.notif.buka ? panelNotif() : ''}
      </div>
      ${I.bolehBuatTask(S.me) ? `<button type="button" class="tombol utama tombol-tambah" data-aksi="tambah-task">${ikon('tambah', 16)} Tambah task</button>` : ''}
    </div>`;
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
  };
  /* Bagian halaman yang digambar ulang saat orang mengetik di kotak cari halaman,
     supaya kotaknya tidak kehilangan fokus. */
  const HASIL = { task: () => hasilTask(), paket: () => hasilPaket(), komunikasi: () => hasilKomunikasi(), link: () => hasilLink(), catatan: () => daftarCatatan(), riwayat: () => hasilRiwayat() };

  function render() {
    if (!halamanBoleh(S.view)) S.view = halamanAwal();
    const lencana = lencanaNav();
    renderSamping(lencana);
    renderKepala();
    renderNavBawah(lencana);
    $('#isi').innerHTML = GAMBAR[S.view]();
    renderLaci();
    renderPemandu();
    const isiObrolan = $('#obrolan-isi');
    if (isiObrolan) isiObrolan.scrollTop = isiObrolan.scrollHeight;
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
    const kunci = `${S.me}|${S.dimuat}|${log.length}|${log[0] ? log[0].id : ''}`;
    if (notifSimpan.kunci !== kunci) notifSimpan = { kunci, isi: I.notifikasi(S.data, S.me) };
    return notifSimpan.isi;
  }
  function notifDibaca() {
    const v = ambil('notif_' + S.me, null);
    if (v != null) return Number(v) || 0;
    return (Date.parse(S.versi) || S.dimuat || Date.now()) - 2 * 864e5;
  }
  const jumlahNotifBaru = () => { const batas = notifDibaca(); return notifSaya().filter(n => n.at > batas).length; };
  const IKON_NOTIF = { baru: 'tambah', tambah: 'tambah', serah: 'serah', siap: 'centang', tinjau: 'tugas', kembali: 'ulang', setuju: 'centang', komentar: 'obrolan', siklus: 'lapis' };

  function kalimatNotif(n) {
    const t = n.task ? perIdKini().get(n.task) : null;
    const siapa = n.oleh ? `<strong>${nama(n.oleh)}</strong> ` : '';
    const judul = t ? `<b>${esc(t.id)}</b> ${esc(potong(t.title, 64))}` : esc(n.task || '');
    const kutip = s => (s ? ` “${esc(potong(s, 90))}”` : '');
    switch (n.jenis) {
      case 'baru': return `${siapa}memberi Anda task baru: ${judul}`;
      case 'tambah': return `${siapa}menambah task untuk dirinya sendiri: ${judul}`;
      case 'serah': return `${siapa}menyerahkan ${judul} ke Anda`;
      case 'siap': return t && I.orang(S.me).peran === 'lead' && t.lane === 'proyek' && I.timDari(S.me).length
        ? `${judul} masuk antrean tim Anda, siap didelegasikan` : `${judul} siap dikerjakan: task yang ditunggunya sudah selesai`;
      case 'tinjau': return `${siapa}mengajukan ${judul} untuk Anda tinjau`;
      case 'kembali': return `${siapa}mengembalikan ${judul}.${kutip(n.teks)}`;
      case 'setuju': return `${siapa}menyetujui ${judul}`;
      case 'komentar': return `${siapa}berkomentar di ${judul}:${kutip(n.teks)}`;
      case 'siklus': { const p = proyekDari(n.proyek); return `Siklus <strong>${esc(p ? p.name : n.proyek)}</strong> selesai: E12 disetujui, perlu keputusan Anda`; }
      default: return judul;
    }
  }

  function panelNotif() {
    const daftar = notifSaya().slice(0, 40);
    return `<div class="panel-notif" role="dialog" aria-label="Notifikasi">
      <div class="panel-notif-kepala"><strong>Notifikasi</strong><span class="hint">untuk ${esc(I.orang(S.me).pendek)}</span></div>
      <div class="panel-notif-isi">${daftar.map(n => `<button type="button" class="notif-item ${n.at > S.notif.sebelum ? 'baru' : ''}" data-aksi="notif-buka" data-id="${esc(n.task || '')}" data-proyek="${esc(n.proyek || '')}">
          <span class="notif-ikon jn-${n.jenis}">${ikon(IKON_NOTIF[n.jenis] || 'lonceng', 16)}</span>
          <span class="notif-teks">${kalimatNotif(n)}<small>${esc(relatif(n.at))}</small></span>
        </button>`).join('') || '<p class="hint panel-notif-kosong">Belum ada yang menyangkut Anda.</p>'}</div>
      <p class="panel-notif-kaki">Dibaca dari aktivitas di data contoh browser ini. Ganti profil untuk melihat notifikasi orang lain.</p>
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
      ['buku', 'Buka Panduan', () => pindahHalaman('panduan')],
      ['ulang', 'Reset data contoh', () => resetData()],
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
      nAntre ? `<strong>${nAntre}</strong> langkah di antrean tim, siap didelegasikan` : '',
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

  function komentarHtml(k) {
    return `<div class="komentar ${k.author === S.me ? 'saya' : ''}">${avatar(k.author, 'kecil')}<div><small><strong>${nama(k.author)}</strong> · ${esc(relatif(k.at))}</small><p>${esc(k.text)}</p></div></div>`;
  }
  const formKomentar = t => `<form class="baris-form" data-form="komentar" data-id="${esc(t.id)}">
      <label class="sr" for="kom-${esc(t.id)}">Tulis komentar</label>
      <input class="input" id="kom-${esc(t.id)}" name="teks" placeholder="Tulis komentar…" required maxlength="2000" autocomplete="off">
      <button class="tombol">Kirim</button>
    </form>`;

  /* Setoran task ini ke rancangan paket. Lead/Manager task ini bisa menambah atau menghapus;
     untuk task proyek yang tertaut paket, pilihan targetnya dari paket itu saja. */
  /* Langkah tanpa setoran sendiri (mis. I1, E4) tetap bagian dari batch elaborasi: telusuri
     task yang ditunggunya sampai langkah pertama, lalu ambil setoran batch itu. */
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

  /* Lead menyerahkan task yang ia pegang (mis. langkah di antrean timnya) ke staff-nya. */
  function formSerahkan(t) {
    if (I.orang(S.me).peran !== 'lead' || t.pic !== S.me || I.selesai(t) || t.status === 'Ditinjau') return '';
    const staf = I.timDari(S.me);
    if (!staf.length) return '';
    const id = esc(t.id);
    return `<form class="baris-form serahkan" data-form="serahkan" data-id="${id}">
      <label class="sr" for="serah-${id}">Serahkan ke</label>
      <select class="input" id="serah-${id}" name="pic">${opsiHtml(staf.map(x => [x, I.orang(x).nama]), staf[0])}</select>
      <button class="tombol">${ikon('serah', 16)} Serahkan ke staff</button>
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
    const serahkan = formSerahkan(t);

    return `<div class="detail">
      <div class="detail-atas"><div>
        <p class="detail-asal">${p ? `<button type="button" data-aksi="buka-proyek" data-id="${esc(p.id)}">${esc(p.name)}</button>` : `${jenis === 'lepas' ? 'Lepas' : 'Rutin'} · ${esc(t.kategori || 'Umum')}`} · ${esc(t.id)}</p>
        <h2>${esc(t.title)}</h2>
        <p class="detail-sub">${s ? `${chipJalur(t)} ${esc(s.nama)}` : '<span class="pill lb-menunggu">Belum ber-sub-stage</span>'}${tim ? ` · Tim ${esc(tim.nama)}` : ''}${s && s.reviewManager ? ' · direview Manager' : ''}${tanya('konsep-kode', 'sub-stage dan tim')}</p>
        <div class="detail-chip">${pillStatus(t.status)} ${chipLabel(t)} ${chipTenggat(t)} ${chipPenting(t)}</div>
        <div class="detail-orang">${avatar(t.pic, 'kecil')} PIC ${nama(t.pic)}
          ${t.support.length ? ` · bantuan ${t.support.map(nama).join(', ')}` : ''}
          · ${tinjau ? 'ditinjau ' + nama(tinjau) : jenis === 'proyek' ? 'tanpa tinjauan' : 'tanpa tinjauan (di luar proyek)'}</div>
      </div>
      <div class="detail-tombol">
        <button type="button" class="ikon-tombol" data-aksi="salin-tautan" data-alamat="#/task/${esc(t.id)}" title="Salin tautan task ini" aria-label="Salin tautan task">${ikon('tautan', 18)}</button>
        ${diLaci ? `<button type="button" class="ikon-tombol" data-aksi="tutup-detail" aria-label="Tutup">${ikon('tutup', 20)}</button>` : ''}
      </div></div>

      ${p ? `<section><p class="subjudul">Tahap proyek${t.stage !== p.stage ? ` · task ini di ${esc(I.namaTahap(t.stage))}` : ''}</p>${jalurTahap(p, t.stage, I.siklusTutup(S.data, p), true)}</section>` : ''}
      ${tunggu ? `<div class="banner ${t.tertahan ? 'merah' : 'kuning'}">${esc(tunggu)}</div>` : ''}

      ${aksi.length || bisaUbah || serahkan ? `<section>
        <div class="detail-aksi">
          ${utama.map(a => `<button type="button" class="tombol utama" data-aksi="aksi-task" data-kunci="${a.kunci}" data-id="${esc(t.id)}" ${a.nonaktif ? 'disabled' : ''}>${esc(a.label)}</button>`).join('')}
          ${lain.map(a => `<button type="button" class="tombol ${['tahan', 'kembalikan'].includes(a.kunci) ? 'bahaya' : ''}" data-aksi="aksi-task" data-kunci="${a.kunci}" data-id="${esc(t.id)}">${esc(a.label)}</button>`).join('')}
          ${bisaUbah ? `<button type="button" class="tombol" data-aksi="ubah-task" data-id="${esc(t.id)}">Ubah</button>` : ''}
        </div>
        ${utama.filter(a => a.nonaktif).map(a => `<p class="hint">${esc(a.alasan)}</p>`).join('')}
        ${serahkan}
      </section>` : ''}

      ${bagianSyarat(t, perId)}
      ${bagianOutput(t, bisaSub)}

      <section>
        <p class="subjudul">Sub-task ${t.subtasks.length ? `· ${t.subtasks.filter(s => s.done).length}/${t.subtasks.length}` : ''}</p>
        ${t.subtasks.length ? `<div class="ceklis">${t.subtasks.map(s => {
          const boleh = bisaSub || s.pic === me;
          return `<label class="${s.done ? 'beres' : ''}"><input type="checkbox" data-aksi="centang-sub" data-id="${esc(t.id)}" data-sub="${esc(s.id)}" ${s.done ? 'checked' : ''} ${boleh ? '' : 'disabled'}>
            <span>${esc(s.title)}</span><small>${nama(s.pic)}</small></label>`;
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
        <li><strong>${esc(r.action)}</strong> oleh ${nama(r.by)} <small>· ${esc(relatif(r.at))}</small>${r.note ? `<br>${esc(r.note)}` : ''}</li>`).join('')}</ul></section>` : ''}

      <section>
        <p class="subjudul">Diskusi${t.comments.length ? ' · ' + t.comments.length : ''}</p>
        ${t.comments.map(komentarHtml).join('')}
        ${formKomentar(t)}
      </section>

      ${log.length ? `<section><p class="subjudul">Aktivitas</p><ul class="riwayat">${log.map(l => `<li>${nama(l.by)}: ${esc(l.detail)} <small>· ${esc(relatif(l.at))}</small></li>`).join('')}</ul></section>` : ''}
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
        <section class="kartu-polos"><p class="subjudul">Task aktif per tahap</p>
          <div class="tahap-hitung enam">${r.perTahap.map(x => `<div><span class="huruf-tahap ${x.id === 'R' ? 'rutin' : ''}">${x.id}</span><b>${x.jumlah}</b><small>${esc(x.nama)}</small></div>`).join('')}</div>
          <p class="hint" style="margin-top:10px">Tahap mengikuti kode sub-stage task. R = rutin dan pekerjaan lepas di luar proyek.</p>
        </section>
        <section class="kartu-polos"><p class="subjudul">Task aktif per tim pemilik</p>
          ${batangDaftar(r.perTim.map(x => ({ label: `${chipTim(x.kode)} ${esc(x.nama)}`, jumlah: x.jumlah })), 'Tidak ada task aktif.', 'lebar-label')}
          <p class="hint" style="margin-top:10px">Tim pemilik = tim pemegang sub-stage task; task tanpa kode ikut tim PIC-nya.</p>
        </section>
        <section class="kartu-polos"><p class="subjudul">Task aktif per rumpun</p>
          ${batangDaftar(r.perRumpun.map(x => ({ label: esc(x.nama), jumlah: x.jumlah })), 'Tidak ada task aktif.', 'lebar-label')}
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
    const jumlahHal = Math.max(1, Math.ceil(semua.length / PER_HAL));
    f.hal = Math.min(Math.max(1, f.hal), jumlahHal);
    const isi = semua.slice((f.hal - 1) * PER_HAL, f.hal * PER_HAL);
    const kolom = [['id', 'ID'], ['title', 'Task'], ['pic', 'PIC'], ['status', 'Status'], ['due', 'Tenggat'], ['platform', 'Platform']];
    const kepala = kolom.map(([k, l]) => `<th aria-sort="${f.urut === k ? (f.arah === -1 ? 'descending' : 'ascending') : 'none'}"><button type="button" class="urut" data-aksi="daftar-urut" data-kunci="${k}">${l}<span aria-hidden="true">${f.urut === k ? (f.arah === -1 ? ' ↓' : ' ↑') : ''}</span></button></th>`).join('');
    const tabel = `<div class="tabel-gulir kartu-polos rapat"><table class="tabel tabel-task"><thead><tr>${kepala}</tr></thead><tbody>${isi.map(t => `
      <tr class="${S.pilih === t.id ? 'dipilih' : ''}">
        <td class="kecil">${esc(t.id)}</td>
        <td><button type="button" class="tautan-task" data-aksi="buka-task" data-id="${esc(t.id)}">${esc(t.title)}</button>
          <span class="baris-meta">${chipJalur(t)} ${esc(asal(t))} ${chipLabel(t, ['Siap'])} ${chipPenting(t)}</span></td>
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
      ${semua.length ? (hp() ? `<div class="grup">${isi.map(t => barisTask(t)).join('')}</div>` : tabel) : '<div class="kosong-isi">Tidak ada task yang cocok dengan saringan ini.</div>'}
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
    const judul = ['ID', 'Judul', 'Jalur', 'Proyek', 'Kategori', 'Tahap', 'Sub-stage', 'Tim', 'Platform', 'Rumpun', 'PIC', 'Status', 'Keadaan', 'Tenggat', 'Selesai'];
    const baris = daftar.map(t => {
      const s = I.subTahap(t.sub);
      return [t.id, t.title, I.jenisJalur(t), t.project ? asal(t) : '', t.kategori, s && s.tahap !== 'R' ? I.namaTahap(s.tahap) : t.stage ? I.namaTahap(t.stage) : '',
        s ? I.namaSub(s.kode) : '', I.timTask(t), t.platform, I.rumpunDari(t.platform), I.orang(t.pic).nama, t.status, I.labelKeadaan(t, perId),
        t.due, t.selesaiAt ? I.isoHari(t.selesaiAt) : ''];
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
          <small>${esc(p.platform)} · ${esc(I.rumpunDari(p.platform))}${(p.cycle || 1) > 1 ? ' · siklus ' + p.cycle : ''}${r.tenggat ? ' · tenggat ' + esc(fmtTanggal(r.tenggat)) : ''}${paket.length ? ' · paket ' + esc(paket.map(judulPaket).join(', ')) : ''}</small>
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
    const bagian = I.TAHAP.map(x => x.id).map(st => {
      const isi = kini.filter(t => t.stage === st).sort(urutTaskProyek);
      if (!isi.length && st !== p.stage && st !== buka) return '';
      const aktif = isi.filter(I.aktif).length;
      return `<details class="tahap-bagian" id="tahap-${st}" ${st === p.stage || st === buka ? 'open' : ''}>
        <summary><span class="huruf-tahap">${st}</span> ${esc(I.namaTahap(st))} <span class="pesan-info">· ${isi.length} task${aktif ? `, ${aktif} aktif` : isi.length ? ', selesai' : ''}</span>${st === p.stage && !r.tutup ? ' <span class="pill st-dikerjakan">Tahap sekarang</span>' : ''}</summary>
        <div class="grup">${isi.map(t => barisTask(t, I.aktif(t) ? I.alasanTunggu(t, perId) : '')).join('') || `<p class="hint">Belum ada task di tahap ${esc(I.namaTahap(st))}${(p.cycle || 1) > 1 ? ' pada siklus ini' : ''}.</p>`}
          ${tambah(st, '', 'Tambah task di ' + I.namaTahap(st))}
        </div>
      </details>`;
    }).join('');
    const bagianLama = lama.length ? `<details class="tahap-bagian"><summary>Siklus sebelumnya <span class="pesan-info">· ${lama.length} task</span></summary>
      <div class="grup">${lama.map(t => barisTask(t)).join('')}</div></details>` : '';
    const keputusan = isM && !p.arsip
      ? `<label class="label-kecil keputusan">Keputusan <select data-aksi="keputusan" data-id="${esc(p.id)}">${opsiHtml(I.KEPUTUSAN.map(k => [k, k]), p.decision || 'Build')}</select></label>`
      : `<span class="pill kd-kosong" title="Keputusan Manager untuk proyek ini">${esc(p.decision || 'Build')}</span>`;

    return `<div class="baris-kembali"><button type="button" class="kembali" data-aksi="tutup-proyek">${ikon('kiri', 18)} Semua proyek</button>
        <button type="button" class="tombol kecil" data-aksi="salin-tautan" data-alamat="#/proyek/${esc(p.id)}">${ikon('tautan', 16)} Salin tautan</button></div>
      <div class="dua-kolom" style="margin-top:8px">
        <div class="kolom-utama">
          <div class="kepala-proyek kartu-polos">
            <div><p class="detail-asal">${esc(p.platform)} · ${esc(I.rumpunDari(p.platform))} · Siklus ${siklus} · ${esc(p.id)}</p>
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
            <p class="hint">Tanpa Lead tetap: tiap task dipegang tim pemilik sub-stage-nya, didelegasikan Lead tim itu.</p>
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

  function paketTersaring() {
    const kata = S.pkt.q.trim().toLowerCase();
    return S.data.packages.filter(p => (!S.pkt.platform || p.platform === S.pkt.platform)
      && (!kata || [p.id, p.namaPaket, p.program, p.platform, I.orang(p.produkPic).nama].join(' ').toLowerCase().includes(kata)));
  }

  function viewPaket() {
    const p = S.pkt.pilih && S.data.packages.find(x => x.id === S.pkt.pilih);
    if (p) return S.pkt.sunting ? viewPaketSunting(p) : viewPaketDetail(p);
    const bolehBuat = ['lead', 'manager'].includes(I.orang(S.me).peran);
    const platform = [...new Set(S.data.packages.map(x => x.platform).filter(Boolean))].sort();
    return `<div class="judul-halaman"><div><h1>Rancangan Paket</h1><p>Isi produk tiap paket dan target per kategori · ${S.data.packages.length} paket</p></div>
        <button type="button" class="tombol" data-aksi="paket-salin" ${S.data.packages.length ? '' : 'disabled'}>${ikon('salin', 16)} Salin ke sheet Marsel</button>
        ${bolehBuat ? `<button type="button" class="tombol utama" data-aksi="paket-baru">${ikon('tambah', 16)} Paket baru</button>` : ''}
      </div>
      <div class="alat">
        ${kotakCari('paket', S.pkt.q, 'Cari nama paket, program, PIC…')}
        ${pilihan('pkt', 'platform', S.pkt.platform, [['', 'Semua'], ...platform.map(x => [x, x])], 'Platform')}
      </div>
      <div id="hasil">${hasilPaket()}</div>`;
  }

  function hasilPaket() {
    const daftar = paketTersaring();
    if (!daftar.length) return `<div class="kosong-isi">${S.data.packages.length ? 'Tidak ada paket yang cocok.' : 'Belum ada rancangan paket.'}</div>`;
    return `<div class="grid-paket">${daftar.map(p => {
      const r = ringkasP(p);
      const perKat = I.KATEGORI_PAKET.map(([l]) => [l, p.items.filter(i => i.kategori === l).length]).filter(([, n]) => n);
      const nProyek = I.proyekPengisi(S.data, p.id).filter(x => !x.arsip).length;
      return `<button type="button" class="kartu-paket" data-aksi="paket-buka" data-id="${esc(p.id)}">
        <span class="kartu-paket-atas"><span class="chip-platform">${esc(p.platform || '—')}</span>${p.mirror ? '<span class="pill kd-aman">Dibagikan</span>' : ''}<small>${esc(p.id)}</small></span>
        <strong>${esc(judulPaket(p))}</strong>
        ${p.program && p.namaPaket ? `<span class="kartu-paket-program">${esc(p.program)}</span>` : ''}
        <span class="kartu-paket-maju">${batangPaket(r)}<small>${r.target ? `Progres ${r.persen}% · ${fmtAngka(r.terpenuhi)}/${fmtAngka(r.target)} tayang${r.digarap ? ` · ${fmtAngka(r.digarap)} digarap` : ''}` : 'Belum ada target'}${nProyek ? ` · ${nProyek} proyek` : ''}</small></span>
        ${perKat.length ? `<span class="kartu-paket-kat">${perKat.map(([l, n]) => `<span>${esc(l)} <b>${n}</b></span>`).join('')}</span>` : ''}
        <span class="kartu-paket-bawah">${p.produkPic ? `${avatar(p.produkPic, 'kecil')} ${nama(p.produkPic)}` : '<span class="hint">PIC produk belum diisi</span>'}${p.updatedAt ? `<small>· ${esc(relatif(p.updatedAt))}</small>` : ''}</span>
      </button>`;
    }).join('')}</div>`;
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
    const blok = I.KATEGORI_PAKET.map(([label, kunci]) => {
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
        <div><p class="detail-asal">${esc(p.platform || 'Tanpa platform')} · ${esc(p.id)}${p.mirror ? ' · <span class="pill kd-aman">Dibagikan ke Lintas Divisi</span>' : ''}</p>
          <h1 class="judul-besar">${esc(judulPaket(p))}</h1>
          ${p.program ? `<p class="teks-panjang" style="margin-top:4px">${esc(p.program)}</p>` : ''}
          <p class="detail-orang" style="margin-top:8px">${p.produkPic ? `${avatar(p.produkPic, 'kecil')} PIC produk ${nama(p.produkPic)}` : 'PIC produk belum diisi'}${p.updatedAt ? ` · diperbarui ${esc(relatif(p.updatedAt))}${p.updatedBy ? ' oleh ' + nama(p.updatedBy) : ''}` : ''}</p></div>
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

  function viewPaketSunting(p) {
    const bolehBagi = ['lead', 'manager'].includes(I.orang(S.me).peran);
    const platform = [...new Set([...PLATFORM, ...(p.platform ? [p.platform] : [])])];
    const blok = I.KATEGORI_PAKET.map(([label, kunci]) => `<section class="kartu-polos blok-kategori" data-kategori="${esc(label)}">
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
        <label class="isian">Program <input name="program" maxlength="300" value="${esc(p.program || '')}" placeholder="mis. Program Super Intensif Lolos Polri TA 2026"></label>
        <label class="isian">Platform <select name="platform">${opsiHtml([['', '—'], ...platform.map(x => [x, x])], p.platform || '')}</select></label>
        <label class="isian">PIC produk <select name="produkPic">${opsiHtml([['', '—'], ...I.ORANG.map(o => [o.id, o.nama])], p.produkPic || '')}</select></label>
        ${bolehBagi ? `<label class="centang"><input type="checkbox" name="mirror" ${p.mirror ? 'checked' : ''}> Bagikan ke Lintas Divisi</label>` : ''}
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

  function bacaFormPaket(form) {
    const el = n => form.elements.namedItem(n);
    const f = { namaPaket: el('namaPaket').value, program: el('program').value, platform: el('platform').value, produkPic: el('produkPic').value, catatan: el('catatan').value };
    if (el('mirror')) f.mirror = el('mirror').checked;
    for (const [, kunci] of I.KATEGORI_PAKET) f[kunci] = el(kunci).value;
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
    const kunci = (I.KATEGORI_PAKET.find(([l]) => l === kategori) || [])[1];
    const bonus = String((kunci && p[kunci]) || '').trim();
    if (bonus) baris.push('', bonus);
    return baris.join('\n').trim();
  }
  function salinPaket(daftar) {
    if (!daftar.length) return toast('Tak ada paket untuk disalin.', true);
    const KOLOM = ['APK', 'Dibimbing', 'Latsol', 'Materi', 'Tryout', 'Drilling', 'Live Class', 'Catatan Produk'];
    const sel = p => { const k = kontribPaket(p); return [p.platform || '', ...I.KATEGORI_PAKET.map(([l]) => selPaket(p, l, k)), String(p.catatan || '')]; };
    const tsv = v => (/["\t\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v);
    const teks = [KOLOM.join('\t'), ...daftar.map(p => sel(p).map(tsv).join('\t'))].join('\n');
    const html = `<table><tr>${KOLOM.map(k => `<th>${esc(k)}</th>`).join('')}</tr>${daftar.map(p => `<tr>${sel(p).map(v => `<td>${esc(v).split('\n').join('<br>')}</td>`).join('')}</tr>`).join('')}</table>`;
    salinKeKlip(teks, html, `${daftar.length} paket disalin. Tempel (Ctrl+V) di sheet Marsel.`);
  }

  /* ---------- Komunikasi ---------- */

  function viewKomunikasi() {
    const k = S.kom;
    const t = k.pilih && S.data.tasks.find(x => x.id === k.pilih);
    const segmen = segmenLingkup('kom', k.lingkup === 'terlibat' ? 'saya' : k.lingkup, 'Lingkup', { ...LABEL_LINGKUP, saya: 'Saya terlibat' });
    return `<div class="judul-halaman"><div><h1>Komunikasi</h1><p>Diskusi per task. Utas yang belum Anda baca muncul paling atas.</p></div></div>
      <div class="kom ${t ? 'buka-obrolan' : ''}">
        <section class="kom-daftar kartu-polos rapat">
          <div class="kom-alat">
            ${kotakCari('komunikasi', k.q, 'Cari task untuk didiskusikan…')}
            ${segmen}
            <label class="centang"><input type="checkbox" data-aksi="kom-baru" ${k.baru ? 'checked' : ''}> Belum dibaca saja</label>
          </div>
          <div id="hasil" class="kom-utas">${hasilKomunikasi()}</div>
        </section>
        <section class="kom-obrolan kartu-polos rapat">${t ? panelObrolan(t) : '<div class="kosong-isi tanpa-garis">Pilih utas di kiri untuk membaca dan membalas.</div>'}</section>
      </div>`;
  }

  function hasilKomunikasi() {
    const k = S.kom;
    const u = I.utasDiskusi(S.data, S.me, k.lingkup, sejakBaca, k.q).filter(x => !k.baru || x.baru);
    if (!u.length) return `<p class="hint" style="padding:14px">${k.q ? 'Tidak ada task yang cocok.' : k.baru ? 'Semua sudah dibaca.' : 'Belum ada diskusi di lingkup ini. Cari task untuk memulai.'}</p>`;
    return u.slice(0, 100).map(x => `<button type="button" class="utas ${k.pilih === x.t.id ? 'dipilih' : ''} ${x.baru ? 'baru' : ''}" data-aksi="kom-pilih" data-id="${esc(x.t.id)}">
        <span class="utas-atas"><strong>${esc(x.t.title)}</strong>${x.baru ? `<span class="lencana">${x.baru}</span>` : ''}</span>
        <span class="baris-meta">${chipJalur(x.t)} ${esc(asal(x.t))} · ${nama(x.t.pic)}</span>
        ${x.terakhir ? `<span class="utas-pesan"><b>${nama(x.terakhir.author)}:</b> ${esc(potong(x.terakhir.text, 90))} <small>· ${esc(relatif(x.terakhir.at))}</small></span>` : '<span class="utas-pesan">Belum ada komentar. Mulai diskusi.</span>'}
      </button>`).join('') + (u.length > 100 ? `<p class="hint" style="padding:10px 14px">Menampilkan 100 dari ${u.length} utas. Persempit dengan pencarian.</p>` : '');
  }

  function panelObrolan(t) {
    return `<div class="obrolan-kepala">
        <button type="button" class="ikon-tombol kom-kembali" data-aksi="kom-tutup" aria-label="Kembali ke daftar utas">${ikon('kiri', 20)}</button>
        <div class="obrolan-judul"><p class="detail-asal">${esc(asal(t))} · ${esc(t.id)}</p><h2>${esc(t.title)}</h2>
          <div class="detail-chip">${pillStatus(t.status)} ${chipTenggat(t)} <span class="hint">PIC ${nama(t.pic)}</span></div></div>
        <button type="button" class="tombol kecil" data-aksi="buka-task" data-id="${esc(t.id)}">Detail task</button>
      </div>
      <div class="obrolan-isi" id="obrolan-isi">${t.comments.length ? t.comments.map(komentarHtml).join('') : '<p class="hint">Belum ada komentar. Tulis yang pertama.</p>'}</div>
      <div class="obrolan-tulis">${formKomentar(t)}</div>`;
  }

  /* ---------- Link Saya ----------
     Seperti ide v2: kartu per folder, link sebagai baris ringkas. Di atasnya Tautan tim
     (dulu halaman Dashboard Lain; dikelola Manager) dan ★ Favorit. Tambah cepat: tempel
     alamatnya lalu Enter, judulnya terisi sendiri dari alamat. */

  const WARNA_FOLDER = ['#0068B4', '#0E7490', '#7A3E9D', '#067647', '#8A4B00', '#9F1239', '#3D4654'];
  function warnaFolder(nama) {
    let h = 0;
    for (const c of String(nama)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return WARNA_FOLDER[h % WARNA_FOLDER.length];
  }
  const linkSaya = () => S.data.links.filter(l => l.user === S.me);
  const folderSaya = daftar => [...new Set(daftar.map(x => x.folder).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id'));
  /* Kunci folder istimewa di tombol "buka semua". */
  const FAVORIT = '__favorit', TIM = '__tim';

  function viewLink() {
    const milik = linkSaya();
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
      <div id="hasil">${hasilLink()}</div>`;
  }

  function hasilLink() {
    const kata = S.lnk.q.trim().toLowerCase();
    const cocok = x => !kata || [x.title, x.url, x.folder, x.deskripsi].join(' ').toLowerCase().includes(kata);
    const milik = linkSaya().filter(cocok);
    const tim = S.data.dashboards.filter(cocok);
    const isM = I.orang(S.me).peran === 'manager';
    if (!milik.length && !tim.length && kata) return '<div class="kosong-isi">Tidak ada link yang cocok.</div>';
    const klik = petaKlik();
    const sering = kata ? [] : milik.filter(l => klik[l.id]).sort((a, b) => klik[b.id] - klik[a.id]).slice(0, 5);
    const favorit = milik.filter(l => l.favorit);
    const kartu = [
      tim.length || isM ? kartuTautanTim(tim, isM) : '',
      favorit.length ? kartuFolder({ kunci: FAVORIT, judul: 'Favorit', ikon: 'bintang', warna: '#B86E00', isi: favorit }) : '',
      ...I.kelompokFolder(milik).map(g => kartuFolder({ kunci: g.folder, judul: g.folder, isi: g.isi })),
    ].filter(Boolean);
    return (sering.length ? `<div class="sering-dibuka"><span class="label-kecil">${ikon('kilat', 14)} Sering dibuka di perangkat ini</span>
        ${sering.map(l => `<a class="chip-link" href="${tautanAman(l.url) ? esc(l.url) : '#'}" target="_blank" rel="noopener noreferrer" data-link="${esc(l.id)}">${esc(potong(l.title, 34))}</a>`).join('')}</div>` : '')
      + `<div class="grid-folder">${kartu.join('')}</div>`
      + (milik.length ? '' : '<p class="hint" style="margin-top:12px">Belum ada link pribadi. Tempel alamatnya di kotak di atas, atau tekan Ctrl+V di halaman ini.</p>');
  }

  function kartuFolder(g) {
    const umum = g.kunci === I.FOLDER_UMUM;
    const favorit = g.kunci === FAVORIT;
    const urut = g.isi.slice().sort((a, b) => a.title.localeCompare(b.title, 'id'));
    return `<section class="kartu-folder">
      <header class="folder-kepala">
        <span class="folder-ikon" style="--warna:${g.warna || warnaFolder(g.judul)}">${ikon(g.ikon || 'folder', 18)}</span>
        <span class="folder-nama"><strong>${esc(g.judul)}</strong><small>${g.isi.length} link</small></span>
        <span class="folder-alat">
          <button type="button" class="ikon-tombol" data-aksi="link-buka-semua" data-folder="${esc(g.kunci)}" title="Buka semua di tab baru" aria-label="Buka semua link ${esc(g.judul)}">${ikon('luar', 16)}</button>
          ${favorit ? '' : `<button type="button" class="ikon-tombol" data-aksi="link-tambah" data-folder="${esc(umum ? '' : g.kunci)}" title="Tambah link ke folder ini" aria-label="Tambah link ke ${esc(g.judul)}">${ikon('tambah', 16)}</button>`}
          ${favorit || umum ? '' : `<button type="button" class="ikon-tombol" data-aksi="folder-ganti" data-jenis="links" data-folder="${esc(g.kunci)}" title="Ganti nama folder" aria-label="Ganti nama folder ${esc(g.judul)}">${ikon('sunting', 16)}</button>
            <button type="button" class="ikon-tombol" data-aksi="folder-hapus" data-jenis="links" data-folder="${esc(g.kunci)}" title="Hapus folder (isinya pindah ke Umum)" aria-label="Hapus folder ${esc(g.judul)}">${ikon('hapus', 16)}</button>`}
        </span>
      </header>
      <ul class="folder-isi">${urut.map(barisLink).join('')}</ul>
    </section>`;
  }

  function barisLink(l) {
    return `<li class="baris-link">
      <a href="${tautanAman(l.url) ? esc(l.url) : '#'}" target="_blank" rel="noopener noreferrer" data-link="${esc(l.id)}">
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
  function kartuTautanTim(daftar, isM) {
    return `<section class="kartu-folder folder-tim">
      <header class="folder-kepala">
        <span class="folder-ikon" style="--warna:#003078">${ikon('orang', 18)}</span>
        <span class="folder-nama"><strong>Tautan tim</strong><small>${daftar.length} dashboard & laporan · ${isM ? 'Anda yang mengelola' : 'dikelola Manager'}</small></span>
        <span class="folder-alat">
          ${daftar.length ? `<button type="button" class="ikon-tombol" data-aksi="link-buka-semua" data-folder="${TIM}" title="Buka semua di tab baru" aria-label="Buka semua tautan tim">${ikon('luar', 16)}</button>` : ''}
          ${isM ? `<button type="button" class="ikon-tombol" data-aksi="dashlain-tambah" title="Tambah tautan tim" aria-label="Tambah tautan tim">${ikon('tambah', 16)}</button>` : ''}
        </span>
      </header>
      <ul class="folder-isi">${daftar.map(x => `<li class="baris-link">
          <a href="${tautanAman(x.url) ? esc(x.url) : '#'}" target="_blank" rel="noopener noreferrer">
            <span class="link-ikon tim">${ikon(IKON_DASH[x.icon] || 'jendela', 16)}</span>
            <span class="link-teks"><strong>${esc(x.title)}</strong><small>${esc(x.deskripsi || namaSitus(x.url))}</small></span>
          </a>
          ${isM ? `<span class="link-alat">
            <button type="button" class="ikon-tombol" data-aksi="dashlain-ubah" data-id="${esc(x.id)}" title="Ubah" aria-label="Ubah ${esc(x.title)}">${ikon('sunting', 16)}</button>
            <button type="button" class="ikon-tombol" data-aksi="dashlain-hapus" data-id="${esc(x.id)}" title="Hapus" aria-label="Hapus ${esc(x.title)}">${ikon('hapus', 16)}</button></span>` : ''}
        </li>`).join('') || '<li class="hint folder-kosong">Belum ada tautan tim.</li>'}</ul>
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

  /* ---------- Catatan Saya ----------
     Seperti ide v2: dua panel. Kiri daftar (cari, folder, yang disematkan di atas), kanan
     editor besar. Tersimpan otomatis saat mengetik; Ctrl+S menyimpan seketika. Di ponsel
     daftar dulu, lalu editor penuh dengan tombol kembali. */

  const catatanSaya = () => S.data.notes.filter(n => n.user === S.me);
  const urutCatatan = daftar => daftar.slice().sort((a, b) => (b.pin - a.pin) || (b.updatedAt || 0) - (a.updatedAt || 0));
  /* Catatan tanpa judul memakai baris pertama isinya sebagai judul, seperti aplikasi catatan pada umumnya. */
  const barisPertama = n => String(n.body || '').split('\n').map(s => s.trim()).find(Boolean) || '';
  const judulCatatan = n => n.title || potong(barisPertama(n), 60) || 'Tanpa judul';
  const cuplikCatatan = n => {
    const isi = String(n.body || '').trim();
    const sisa = n.title ? isi : isi.slice(isi.indexOf(barisPertama(n)) + barisPertama(n).length);
    return potong(sisa.replace(/\s+/g, ' ').trim(), 120);
  };
  function catatanAktif() {
    if (S.ctt.pilih === '__baru') return { id: '__baru', title: '', body: '', folder: S.ctt.folder === I.FOLDER_UMUM ? '' : S.ctt.folder, pin: false, createdAt: 0, updatedAt: 0 };
    return catatanSaya().find(n => n.id === S.ctt.pilih) || null;
  }

  function viewCatatan() {
    const milik = catatanSaya();
    if (S.ctt.pilih && S.ctt.pilih !== '__baru' && !milik.some(n => n.id === S.ctt.pilih)) S.ctt.pilih = null;
    // Desktop langsung membuka catatan teratas; di ponsel daftar dulu.
    if (!S.ctt.pilih && !hp() && milik.length) S.ctt.pilih = urutCatatan(milik)[0].id;
    const n = catatanAktif();
    const folder = folderSaya(milik);
    const chip = folder.length ? `<div class="chip-folder" role="group" aria-label="Folder">${[['', 'Semua'], ...folder.map(f => [f, f]), [I.FOLDER_UMUM, I.FOLDER_UMUM]]
      .map(([v, l]) => `<button type="button" data-aksi="atur" data-ruang="ctt" data-kunci="folder" data-nilai="${esc(v)}" aria-pressed="${S.ctt.folder === v}">${esc(l)}</button>`).join('')}</div>` : '';
    return `<div class="judul-halaman"><div><h1>Catatan Saya</h1><p>${milik.length} catatan pribadi ${esc(I.orang(S.me).pendek)} · tersimpan otomatis di browser ini</p></div></div>
      <div class="catatan-dua ${n ? 'ada-editor' : ''}">
        <aside class="catatan-panel kartu-polos rapat">
          <div class="catatan-alat">
            ${kotakCari('catatan', S.ctt.q, 'Cari catatan…')}
            <button type="button" class="tombol utama ikon-saja" data-aksi="catatan-baru" title="Catatan baru" aria-label="Catatan baru">${ikon('tambah', 18)}</button>
          </div>
          ${chip}
          <ul id="hasil" class="catatan-list">${daftarCatatan()}</ul>
        </aside>
        ${n ? editorCatatan(n, folder) : `<section class="kartu-polos catatan-editor catatan-kosong">${ikon('catatan', 28)}
          <p><strong>${milik.length ? 'Pilih catatan di kiri' : 'Belum ada catatan'}</strong><br><span class="hint">Catatan tersimpan sendiri saat Anda menulis.</span></p>
          <button type="button" class="tombol utama" data-aksi="catatan-baru">${ikon('tambah', 16)} Catatan baru</button></section>`}
      </div>`;
  }

  function daftarCatatan() {
    const kata = S.ctt.q.trim().toLowerCase();
    const f = S.ctt.folder;
    const isi = urutCatatan(catatanSaya().filter(n => (!kata || [n.title, n.body, n.folder].join(' ').toLowerCase().includes(kata))
      && (!f || (f === I.FOLDER_UMUM ? !n.folder : n.folder === f))));
    return isi.map(n => `<li><button type="button" class="catatan-item ${S.ctt.pilih === n.id ? 'dipilih' : ''}" data-aksi="catatan-pilih" data-id="${esc(n.id)}">
        <span class="catatan-item-judul">${n.pin ? ikon('semat', 14) : ''}<strong>${esc(judulCatatan(n))}</strong></span>
        <span class="catatan-item-isi">${esc(cuplikCatatan(n)) || '<i>Tidak ada teks lain</i>'}</span>
        <small>${esc(relatif(n.updatedAt))}${n.folder ? ' · ' + esc(n.folder) : ''}</small>
      </button></li>`).join('') || `<li class="hint catatan-list-kosong">${kata || f ? 'Tidak ada catatan yang cocok.' : 'Belum ada catatan.'}</li>`;
  }

  const statusCatatan = n => (n.id === '__baru'
    ? `${ikon('sunting', 16)} Catatan baru: tersimpan begitu Anda mulai menulis`
    : `${ikon('centang', 16)} Tersimpan · ${esc(fmtWaktu(n.updatedAt))}`);
  const aksiCatatan = n => (n.id === '__baru' ? '' : `
    <button type="button" class="ikon-tombol ${n.pin ? 'nyala' : ''}" data-aksi="catatan-semat" aria-pressed="${n.pin}" title="${n.pin ? 'Lepas sematan' : 'Sematkan di atas'}" aria-label="Sematkan catatan">${ikon('semat', 18)}</button>
    <button type="button" class="ikon-tombol" data-aksi="catatan-unduh" title="Unduh sebagai .txt" aria-label="Unduh catatan">${ikon('unduh', 18)}</button>
    <button type="button" class="ikon-tombol" data-aksi="catatan-hapus" title="Hapus" aria-label="Hapus catatan">${ikon('hapus', 18)}</button>`);

  function editorCatatan(n, folder) {
    return `<section class="catatan-editor kartu-polos rapat" data-catatan="${esc(n.id)}">
      <div class="editor-kepala">
        <button type="button" class="ikon-tombol catatan-kembali" data-aksi="catatan-kembali" aria-label="Kembali ke daftar catatan">${ikon('kiri', 20)}</button>
        <span id="catatan-status" class="catatan-status">${statusCatatan(n)}</span>
        <span class="spasi"></span>
        <span id="catatan-aksi" class="catatan-aksi">${aksiCatatan(n)}</span>
      </div>
      <div class="editor-isi">
        <input id="catatan-judul" class="catatan-judul" maxlength="200" placeholder="Judul catatan" value="${esc(n.title)}" aria-label="Judul catatan" autocomplete="off">
        <div class="catatan-meta">
          <label class="catatan-folder">${ikon('folder', 14)}<span class="sr">Folder</span><input id="catatan-folder" list="folder-catatan" maxlength="80" placeholder="${I.FOLDER_UMUM}" value="${esc(n.folder)}" autocomplete="off"></label>
          <datalist id="folder-catatan">${folder.map(f => `<option value="${esc(f)}">`).join('')}</datalist>
          ${n.createdAt ? `<small>Dibuat ${esc(fmtWaktu(n.createdAt))}</small>` : ''}
        </div>
        <textarea id="catatan-isi" class="catatan-isi" maxlength="20000" placeholder="Tulis isi catatan di sini…" aria-label="Isi catatan">${esc(n.body)}</textarea>
      </div>
      <div class="editor-kaki"><span id="catatan-hitung">${n.body.length} karakter</span><span>Ctrl+S menyimpan seketika</span></div>
    </section>`;
  }

  /* Simpan otomatis: 0,7 detik setelah berhenti mengetik. Editornya tak digambar ulang,
     supaya kursor tak melompat; yang diperbarui hanya status dan daftar di kiri. */
  let tundaCatatan = null;
  function catatanBerubah() {
    const s = $('#catatan-status');
    if (s) s.innerHTML = `${ikon('sunting', 16)} Menyimpan…`;
    const isi = $('#catatan-isi'), hitung = $('#catatan-hitung');
    if (isi && hitung) hitung.textContent = `${isi.value.length} karakter`;
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
      const n = I.simpanCatatan(S.data, S.me, { title: judul, body: isi, folder }, id === '__baru' ? '' : id, Date.now());
      simpanData();
      if (id === '__baru') {
        S.ctt.pilih = n.id;
        ed.dataset.catatan = n.id;
        $('#catatan-aksi').innerHTML = aksiCatatan(n);
        catatAlamat();
      }
      if (s) s.innerHTML = statusCatatan(n);
      const daftar = $('#hasil');
      if (daftar && S.view === 'catatan') daftar.innerHTML = daftarCatatan();
      return n;
    } catch (e) {
      if (s) s.innerHTML = `${ikon('tutup', 16)} ${esc(e.message)}`;
      return null;
    }
  }
  function catatanBaru() {
    simpanCatatanTertunda();
    S.ctt.pilih = '__baru';
    render();
    setTimeout(() => { const j = $('#catatan-judul'); if (j) j.focus(); }, 30);
  }
  function bukaCatatan(id) {
    simpanCatatanTertunda();
    S.ctt.pilih = id;
    pindahHalaman('catatan');
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
            <div><p><strong>${nama(l.by)}</strong> <span class="chip-jenis jenis-${esc(l.type)}">${esc(I.JENIS_LOG[l.type] || l.type)}</span>
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
      <ul class="syarat">${I.syaratAjukan({ output: '', evidence: [], subtasks: [], deps: [], tertahan: false }, new Map())
        .map(x => `<li class="${x.ok ? 'ok' : 'kurang'}">${ikon(x.ok ? 'centang' : 'bulat', 18)}<span>${esc(x.label)}</span></li>`).join('')}</ul>
      ${tombolPalsu('Ajukan tinjau ke Alya', 'utama mati')}`,
    revisi: () => `<div class="ilu-baris">${pillStatus('Dikerjakan')}<span class="pill lb-revisi">Revisi</span></div>
      <p class="subjudul">Riwayat tinjauan</p>
      <ul class="riwayat"><li><strong>Dikembalikan</strong> oleh Andika <small>· 2 hari lalu</small><br>Bobot soal nomor 12–15 belum sesuai kisi-kisi.</li>
        <li><strong>Diajukan</strong> oleh Wildan <small>· 3 hari lalu</small></li></ul>`,
    tahan: () => `<div class="banner merah">Tertahan: Menunggu akses SIADU untuk tahun ajaran baru.</div><div class="ilu-baris">${tombolPalsu('Lepas tanda tertahan')}</div>`,
    antrean: () => `<p class="subjudul">Antrean tim · siap didelegasikan</p>
      <div class="ilu-task">${pillStatus('Antre')}<span><b>DV8 · Latsol Fisika — 3 Paket</b><small><span class="chip-sub">DV8</span> Input ke SIADU/Markaz siap</small></span></div>
      <div class="ilu-baris">${tombolPalsu('Kiki ▾', 'input-palsu')}${tombolPalsu(`${ikon('serah', 16)} Serahkan ke staff`)}</div>`,
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
      ${g.coba ? `<div class="pnd-coba">${c
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
    const c = P.cariContoh(id, S.data, I, hariIni(), S.me);
    if (!c) return toast('Contohnya sudah terpakai di data ini. Tekan Reset data contoh di kaki sidebar untuk mengembalikannya.', true);
    if (!bolehTinggalkanPaket()) return;
    const ganti = !!c.profil && c.profil !== S.me;
    if (ganti) { S.me = c.profil; simpan('me', S.me); S.kom.pilih = null; }
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
    const t = c.task && S.data.tasks.find(x => x.id === c.task);
    if (t) tandaiDibaca(t);
    render();
    window.scrollTo(0, 0);
    const o = I.orang(S.me);
    const arah = hp() ? 'Langkahnya ada di kotak panduan di bawah; ketuk untuk membukanya.' : 'Ikuti kotak langkah di bawah.';
    toast(ganti ? `Sekarang sebagai ${o.pendek} (${I.PERAN[o.peran]}). ${arah} Profil lain bisa dipilih lagi lewat Ganti profil.` : arah);
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

  const PLATFORM = ['ASN', 'Sekdin', 'TPA', 'PPPK', 'PPG', 'BUMN', 'OJK', 'PCPM', 'Psikotes Kerja', 'Cerebrum', 'Polisi', 'Prajurit', 'TOEFL', 'Beasiswa', 'All Platform'];
  const PRIORITAS = [['Normal', 'Normal'], ['High', 'Penting'], ['Urgent', 'Mendesak'], ['Low', 'Rendah']];

  function bukaModal(konteks, html) {
    S.modal = konteks;
    $('#modal-panel').innerHTML = html;
    $('#modal').hidden = false;
    setTimeout(() => { const el = $('#modal-panel input:not([type="hidden"]), #modal-panel textarea, #modal-panel select'); if (el) el.focus(); }, 30);
  }
  function tutupModal() {
    S.modal = null;
    $('#modal').hidden = true;
    $('#modal-panel').innerHTML = '';
    $('#modal-panel').className = 'modal-panel';
  }
  const kakiModal = tombol => `<p id="galat-modal" class="pesan-galat" role="alert" hidden></p>
      <div class="modal-kaki"><button type="button" class="tombol" data-aksi="tutup-modal">Batal</button><button class="tombol utama">${esc(tombol)}</button></div>`;

  /* ----- Form task: sub-stage menentukan tahap, tim pemilik, dan siapa yang boleh jadi PIC ----- */

  /* Pilihan sub-stage. Task proyek: kode ADDIE per tahap. Di luar proyek: R1–R4; kode ADDIE
     task "lepas" warisan v1 tetap ditawarkan supaya tak hilang saat task diubah. */
  function opsiSub(jenis, terpilih) {
    const grup = (label, daftar) => `<optgroup label="${esc(label)}">${daftar.map(s =>
      `<option value="${s.kode}" ${s.kode === terpilih ? 'selected' : ''}>${s.kode} · ${esc(s.nama)}${s.tim ? ' (' + s.tim + ')' : ''}</option>`).join('')}</optgroup>`;
    if (jenis === 'proyek') {
      const boleh = s => s.kode === terpilih || I.subBolehBagi(S.me, s.kode);
      return (I.subTahap(terpilih) ? '' : '<option value="" selected disabled>— pilih sub-stage —</option>')
        + I.TAHAP.map(x => { const isi = I.SUB_TAHAP.filter(s => s.tahap === x.id && boleh(s)); return isi.length ? grup(x.nama, isi) : ''; }).join('');
    }
    const lama = I.subTahap(terpilih);
    return (terpilih ? '' : '<option value="" selected>— belum ber-sub-stage —</option>')
      + grup('Rutin', I.SUB_TAHAP.filter(s => s.tahap === 'R'))
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
  /* PIC bawaan task baru: Manager → Lead tim pemilik; Lead → dirinya, atau Lead tim pemilik
     kalau pekerjaan proyek itu milik tim lain (lalu ia yang mendelegasikan ke staff-nya).
     Pekerjaan rutin dikerjakan tim sendiri. */
  function picBawaan(kode) {
    const pemilik = I.leadSub(kode);
    const peran = I.orang(S.me).peran;
    if (peran === 'manager') return pemilik || S.me;
    const rutin = (I.subTahap(kode) || {}).tahap === 'R';
    return peran === 'lead' && pemilik && pemilik !== S.me && !rutin ? pemilik : S.me;
  }
  /* Sub-stage bawaan task proyek baru: kode pertama tahap itu yang boleh dipakai profil ini;
     bagi staff yang timnya tak punya kode di tahap itu, kode tahap berikutnya yang boleh. */
  function subAwal(tahap) {
    const boleh = I.SUB_TAHAP.filter(s => s.tahap !== 'R' && I.subBolehBagi(S.me, s.kode));
    const urut = id => I.TAHAP.findIndex(x => x.id === id);
    return (boleh.find(s => s.tahap === tahap) || boleh.find(s => urut(s.tahap) > urut(tahap)) || boleh[0] || I.SUB_TAHAP[0]).kode;
  }
  /* Jenis rutin bawaan: yang dipegang tim sendiri, kalau ada. */
  const rutinAwal = () => (I.SUB_TAHAP.find(s => s.tahap === 'R' && s.tim === (I.timOrang(S.me) || {}).kode) || I.subTahap('R1')).kode;
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
    const daftar = pilihanPic(kode, form.dataset.picLama || '');
    pic.innerHTML = opsiPic(daftar, daftar.includes(pilih) ? pilih : daftar[0], kode);
  }

  function formTask(t, preset = {}) {
    if (t) return formUbahTask(t);
    const proyekAktif = S.data.projects.filter(p => !p.arsip);
    const pProyek = preset.proyek || (proyekAktif[0] || {}).id || '';
    const jalur = preset.jalur || (preset.proyek || proyekAktif.length ? 'proyek' : 'rutin');
    const tahap = preset.tahap || ((proyekDari(pProyek) || {}).stage || 'A');
    const subProyek = preset.sub && I.subBolehBagi(S.me, preset.sub) ? preset.sub : subAwal(tahap);
    const subRutin = rutinAwal();
    const kode = jalur === 'proyek' ? subProyek : subRutin;
    const staff = I.orang(S.me).peran === 'staff';
    return `<form data-form="modal" data-task="baru" novalidate>
      <h2>Tambah task</h2>
      <label class="isian">Judul task <input name="title" required maxlength="200" placeholder="mis. QC output paket TO 3"></label>
      <div class="isian"><span>Jalur</span>
        <div class="segmen" role="group" aria-label="Jalur">
          <button type="button" data-aksi="pilih-jalur" data-jalur="proyek" aria-pressed="${jalur === 'proyek'}" ${proyekAktif.length ? '' : 'disabled'}>Proyek</button>
          <button type="button" data-aksi="pilih-jalur" data-jalur="rutin" aria-pressed="${jalur === 'rutin'}">Rutin</button>
        </div>
        <small>Proyek: sub-stage ADDIE, wajib output & bukti, ditinjau sebelum selesai. Rutin (R1–R4): di luar proyek, langsung selesai.</small>
      </div>
      ${staff ? `<p class="banner biru">Task ini untuk Anda sendiri. Sub-stage proyek yang tersedia hanya milik tim Anda; task proyek ditinjau ${esc(I.orang(I.orang(S.me).lead || I.MANAGER).pendek)} sebelum selesai, dan ia mendapat notifikasi.</p>` : ''}
      <input type="hidden" name="jalur" value="${jalur}">
      <div class="dua-isian" data-bagian="proyek" ${jalur === 'proyek' ? '' : 'hidden'}>
        <label class="isian">Proyek <select name="project">${opsiHtml(proyekAktif.map(p => [p.id, p.name]), pProyek)}</select></label>
        <label class="isian">Sub-stage <select name="subProyek" data-sub>${opsiSub('proyek', subProyek)}</select></label>
      </div>
      <label class="isian" data-bagian="rutin" ${jalur === 'rutin' ? '' : 'hidden'}>Jenis rutin <select name="subRutin" data-sub>${opsiSub('rutin', subRutin)}</select></label>
      <p class="hint" data-hint-sub>${esc(hintSub(kode))}</p>
      <div class="dua-isian">
        <label class="isian">PIC <select name="pic" data-otomatis="1">${opsiPic(pilihanPic(kode), picBawaan(kode), kode)}</select></label>
        <label class="isian">Tenggat <input type="date" name="due"></label>
      </div>
      <div class="dua-isian">
        <label class="isian">Prioritas <select name="priority">${opsiHtml(PRIORITAS, 'Normal')}</select></label>
        <label class="isian">Output <input name="output" maxlength="200" placeholder="mis. 40 soal lolos QC"></label>
      </div>
      <label class="isian">Keterangan <textarea name="detail" maxlength="4000"></textarea></label>
      ${kakiModal('Tambah task')}
    </form>`;
  }

  function formUbahTask(t) {
    const jenis = t.lane === 'proyek' ? 'proyek' : 'rutin';
    const lepas = I.jenisJalur(t) === 'lepas';
    return `<form data-form="modal" data-task="ubah" data-pic-lama="${esc(t.pic)}" novalidate>
      <h2>Ubah task</h2>
      <p class="hint">${t.project ? 'Proyek ' + esc(asal(t)) : (lepas ? 'Lepas' : 'Rutin') + ' · ' + esc(t.kategori || 'Umum')} · ${esc(t.id)}</p>
      <label class="isian">Judul task <input name="title" required maxlength="200" value="${esc(t.title)}"></label>
      <label class="isian">Sub-stage <select name="sub" data-sub>${opsiSub(jenis, t.sub)}</select></label>
      <p class="hint" data-hint-sub>${esc(hintSub(t.sub))}</p>
      <div class="dua-isian">
        <label class="isian">PIC <select name="pic">${opsiPic(pilihanPic(t.sub, t.pic), t.pic, t.sub)}</select></label>
        <label class="isian">Tenggat <input type="date" name="due" value="${esc(t.due || '')}"></label>
      </div>
      <div class="dua-isian">
        <label class="isian">Prioritas <select name="priority">${opsiHtml(PRIORITAS, t.priority || 'Normal')}</select></label>
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
      <label class="isian">Platform <select name="platform">${PLATFORM.map(x => `<option>${esc(x)}</option>`).join('')}</select></label>
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
    const pengisi = I.proyekPengisi(S.data, p.id).filter(x => !x.arsip);
    const tujuan = pengisi.length ? pengisi[0].id : '';
    const terbuka = new Set();
    const blok = I.KATEGORI_PAKET.map(([label]) => {
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
      <p class="hint">Setiap target terpilih menjadi satu <b>batch</b>: rangkaian langkah sesuai jenisnya. Tiap langkah menunggu langkah sebelumnya dan masuk ke <b>antrean Lead tim pemilik</b> sub-stage-nya untuk didelegasikan. Progres ${esc(judulPaket(p))} naik bertahap setiap langkah bercapaian disetujui.</p>
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
      <label class="isian">Program <input name="program" maxlength="300" placeholder="mis. Program Super Intensif Lolos PCPM 2026"></label>
      <div class="dua-isian">
        <label class="isian">Platform <select name="platform">${opsiHtml([['', '—'], ...PLATFORM.map(x => [x, x])], '')}</select></label>
        <label class="isian">PIC produk <select name="produkPic">${opsiHtml([['', '—'], ...I.ORANG.map(o => [o.id, o.nama])], '')}</select></label>
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
          const t = I.taskBaru(S.data, {
            title: f.title, project: proyek ? f.project : '', sub: proyek ? f.subProyek : f.subRutin,
            pic: f.pic, due: f.due, priority: f.priority, output: f.output, detail: f.detail,
          }, S.me, waktu, hariIni());
          tutupModal();
          S.pilih = t.id;
          return selesaiUbah(`${t.id} · ${t.sub} ditambahkan untuk ${I.orang(t.pic).pendek}.`);
        }
        case 'ubah': {
          const t = S.data.tasks.find(x => x.id === m.id);
          const lama = t.pic;
          I.ubahTask(S.data, t, { title: f.title, sub: f.sub, pic: f.pic, due: f.due, priority: f.priority, output: f.output, detail: f.detail }, S.me, waktu);
          tutupModal();
          return selesaiUbah(t.pic !== lama ? `Task disimpan dan diserahkan ke ${I.orang(t.pic).pendek}.` : 'Task disimpan.');
        }
        case 'proyek': {
          const p = I.proyekBaru(S.data, f, S.me, waktu);
          tutupModal();
          S.view = 'proyek';
          S.proyek = p.id;
          return selesaiUbah(`${p.name} dibuat. Tambahkan task pertamanya; tahap proyek mengikuti task terbuka paling awal.`);
        }
        case 'catatan': {
          const t = S.data.tasks.find(x => x.id === m.id);
          I.terapkanAksi(S.data, t, m.kunci, S.me, waktu, f.catatan);
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
          const { project, tasks } = I.elaborasiPaket(S.data, p, { proyek: f.proyek, name: f.name, mode: f.mode, langkah, items, jumlah, due: f.due }, S.me, waktu, hariIni());
          tutupModal();
          Object.assign(S.pkt, { pilih: null, sunting: false });
          Object.assign(S, { view: 'proyek', proyek: project.id, pilih: null });
          simpan('halaman', 'proyek');
          return selesaiUbah(`${tasks.length} task untuk ${items.length} target ${ada ? 'ditambahkan ke' : 'dibuat di'} ${project.id}. Langkah pertama tiap target menunggu di antrean Lead tim pemiliknya; progres ${judulPaket(p)} naik per capaian.`);
        }
        case 'paket-baru': {
          const p = I.paketBaru(S.data, f, S.me, waktu);
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
          tutupModal();
          return selesaiUbah(`Folder diganti nama (${n} isi).`);
        }
        case 'dashboard':
          I.simpanDashboard(S.data, S.me, f, m.id, waktu);
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
    const pindah = I.segarkanTahap(S.data, Date.now(), S.me);
    simpanData();
    render();
    const tahap = pindah.map(p => `${p.name} kini di tahap ${I.namaTahap(p.stage)}.`).join(' ');
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
      I.terapkanAksi(S.data, t, kunci, S.me, Date.now());
      selesaiUbah(PESAN_AKSI[kunci] + pesanSetoran(t, kunci));
    } catch (e) {
      toast(e.message, true);
    }
  }

  /* ---------- Peristiwa ---------- */

  function bukaTask(id) {
    S.pilih = id;
    S.notif.buka = false;
    const t = S.data.tasks.find(x => x.id === id);
    if (t) tandaiDibaca(t);
    render();
  }

  function resetData() {
    S.navBuka = false;
    if (!confirm('Reset ke data contoh awal?\n\nSemua perubahan di browser ini dihapus: task, status, komentar, proyek, paket, link, dan catatan. '
      + 'Data contoh dimuat lagi dari spreadsheet, persis seperti saat diimpor. Profil lain di browser ini ikut kembali ke awal.')) return render();
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
    if (ruang === 'kom' && kunci === 'lingkup') S.kom.pilih = null;
    if (ruang === 'rwy') S.rwy.batas = 100;
    simpanPref(ruang);
    render();
  }

  document.addEventListener('click', e => {
    if (S.notif.buka && !e.target.closest('.notif')) bukaTutupNotif(false);
    const tautanLink = e.target.closest('a[data-link]');
    if (tautanLink) { hitungKlik(tautanLink.dataset.link); return; }
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
        if (d.proyek) bukaProyek(d.proyek);
        else if (t) bukaTask(t.id);
        else renderKepala();
        break;
      case 'salin-tautan':
        salinKeKlip(tautanKe(d.alamat), '', 'Tautan disalin. Tempel di chat; penerimanya perlu PIN v2 untuk membukanya.');
        break;
      case 'buka-task': if (t) bukaTask(t.id); break;
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
      case 'ganti-profil': if (!bolehTinggalkanPaket()) return; S.navBuka = false; tampilProfil(); break;
      case 'pilih-profil':
        S.me = d.id;
        simpan('me', S.me);
        S.view = halamanAwal();
        S.pilih = null;
        S.proyek = null;
        Object.assign(S.task, { lingkup: I.lingkupAwal(S.me), fokus: '' });
        S.dash.lingkup = '';
        S.kom.lingkup = 'terlibat';
        simpanPref('task');
        Object.assign(S.kom, { pilih: null });
        Object.assign(S.pkt, { pilih: null, sunting: false, kotor: false });
        Object.assign(S.ctt, { pilih: null, folder: '' });
        S.notif.buka = false;
        masukApp();
        toast(`Masuk sebagai ${I.orang(S.me).pendek} (${I.PERAN[I.orang(S.me).peran]}).`);
        break;
      case 'reset-data': resetData(); break;
      case 'keluar':
        S.navBuka = false;
        api('keluar').then(() => tampilKunci('Anda sudah keluar. Masukkan PIN untuk masuk lagi.', false));
        break;
      case 'coba-muat': muat(); break;
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
      case 'ekspor': eksporCsv(daftarSaring()); break;
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
          I.mulaiSiklus(S.data, p, S.me, Date.now());
          selesaiUbah(`${p.name}: siklus ${p.cycle} dimulai di Analysis. Tambahkan task-nya.`);
        } catch (err) { toast(err.message, true); }
        break;
      }
      case 'tahan-proyek': case 'lanjutkan-proyek': {
        const p = proyekDari(d.id);
        try {
          I.setKeputusan(S.data, p, d.aksi === 'tahan-proyek' ? 'Hold' : 'Build', S.me, Date.now());
          selesaiUbah(d.aksi === 'tahan-proyek' ? 'Proyek ditahan.' : 'Proyek dilanjutkan.');
        } catch (err) { toast(err.message, true); }
        break;
      }
      case 'arsip-proyek': {
        const p = proyekDari(d.id || S.proyek);
        if (!p) return;
        try { I.setArsip(S.data, p, d.nilai === '1', S.me, Date.now()); selesaiUbah(d.nilai === '1' ? `${p.name} diarsipkan.` : `${p.name} aktif lagi.`); } catch (err) { toast(err.message, true); }
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
        try { I.hapusBukti(S.data, t, d.bukti, S.me, Date.now()); selesaiUbah('Bukti dihapus.'); } catch (err) { toast(err.message, true); }
        break;
      case 'setoran-hapus':
        if (!confirm('Hapus setoran ini? Progres paket tidak lagi menghitung task ini untuk target tersebut.')) return;
        try { I.hapusSetoran(S.data, d.id, S.me, Date.now()); selesaiUbah('Setoran dihapus.'); } catch (err) { toast(err.message, true); }
        break;
      case 'paket-tutup': Object.assign(S.pkt, { pilih: null, sunting: false, kotor: false }); render(); break;
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
        try { I.hapusPaket(S.data, p, S.me, Date.now()); Object.assign(S.pkt, { pilih: null, sunting: false }); selesaiUbah('Paket dihapus.'); } catch (err) { toast(err.message, true); }
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
      case 'kom-pilih':
        S.kom.pilih = d.id;
        if (t) tandaiDibaca(t);
        render();
        if (hp()) window.scrollTo(0, 0);
        break;
      case 'kom-tutup': S.kom.pilih = null; render(); break;
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
      case 'catatan-baru': catatanBaru(); break;
      case 'catatan-pilih':
        simpanCatatanTertunda();
        S.ctt.pilih = d.id;
        render();
        if (hp()) window.scrollTo(0, 0);
        break;
      case 'catatan-kembali': simpanCatatanTertunda(); S.ctt.pilih = null; render(); break;
      case 'catatan-semat': {
        simpanCatatanTertunda();
        const n = catatanAktif();
        if (!n || n.id === '__baru') break;
        try { I.sematkanCatatan(S.data, S.me, n.id, !n.pin); selesaiUbah(n.pin ? 'Disematkan di atas daftar.' : 'Sematan dilepas.'); } catch (err) { toast(err.message, true); }
        break;
      }
      case 'catatan-unduh': {
        simpanCatatanTertunda();
        const n = catatanAktif();
        if (n && n.id !== '__baru') unduhCatatan(n);
        break;
      }
      case 'catatan-hapus': {
        simpanCatatanTertunda();
        const n = catatanAktif();
        if (!n || n.id === '__baru' || !confirm(`Hapus catatan "${judulCatatan(n)}"? Ini tidak bisa dibatalkan.`)) return;
        try { I.hapusMilik(S.data.notes, n.id, S.me); S.ctt.pilih = null; selesaiUbah('Catatan dihapus.'); } catch (err) { toast(err.message, true); }
        break;
      }
      case 'folder-ganti':
        bukaModal({ jenis: 'folder-ganti', daftar: d.jenis, folder: d.folder }, formIsian(`Ganti nama folder "${d.folder}"`, 'Nama folder baru', d.folder, 'Simpan'));
        break;
      case 'folder-hapus': {
        if (!confirm(`Hapus folder "${d.folder}"?\n\nIsinya TIDAK ikut terhapus, hanya dipindah ke Umum.`)) return;
        try { const n = I.hapusFolder(S.data[d.jenis], S.me, d.folder); selesaiUbah(`Folder dihapus; ${n} isi pindah ke Umum.`); } catch (err) { toast(err.message, true); }
        break;
      }
      /* Tautan tim (dulu Dashboard Lain), di Link Saya; hanya Manager yang mengubah */
      case 'dashlain-tambah': bukaModal({ jenis: 'dashboard', id: '' }, formDashboard(null)); break;
      case 'dashlain-ubah': { const x = S.data.dashboards.find(y => y.id === d.id); if (x) bukaModal({ jenis: 'dashboard', id: x.id }, formDashboard(x)); break; }
      case 'dashlain-hapus': {
        const x = S.data.dashboards.find(y => y.id === d.id);
        if (!x || !confirm(`Hapus tautan tim "${x.title}"? Tautan ini hilang untuk semua orang di browser ini.`)) return;
        try { I.hapusDashboard(S.data, S.me, x.id, Date.now()); selesaiUbah('Tautan tim dihapus.'); } catch (err) { toast(err.message, true); }
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
    if (el.dataset.aksi === 'centang-sub') {
      const t = S.data.tasks.find(x => x.id === el.dataset.id);
      const s = t && t.subtasks.find(x => x.id === el.dataset.sub);
      if (!s) return;
      s.done = el.checked;
      t.updatedAt = Date.now();
      I.catatLog(S.data, 'update', `${t.id} · ${t.title}`, `Sub-task ${s.done ? 'selesai' : 'dibuka lagi'}: ${s.title}`, S.me, t.updatedAt);
      selesaiUbah();
    } else if (el.dataset.aksi === 'saring') {
      aturNilai(el.dataset.ruang, el.dataset.kunci, el.value);
    } else if (el.dataset.aksi === 'tautkan-paket') {
      const proj = proyekDari(el.dataset.id);
      try { I.tautkanPaket(S.data, proj, el.value, S.me, Date.now()); selesaiUbah(el.value ? 'Proyek ditautkan ke rancangan paket.' : 'Tautan paket dilepas.'); } catch (err) { toast(err.message, true); render(); }
    } else if (el.dataset.aksi === 'keputusan') {
      const p = proyekDari(el.dataset.id);
      try { I.setKeputusan(S.data, p, el.value, S.me, Date.now()); selesaiUbah(el.value === 'Hold' ? 'Proyek ditahan.' : `Keputusan proyek: ${el.value}.`); } catch (err) { toast(err.message, true); render(); }
    } else if (el.dataset.aksi === 'kom-baru') {
      S.kom.baru = el.checked;
      $('#hasil').innerHTML = hasilKomunikasi();
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
      if (el.name === 'pic') { el.dataset.otomatis = ''; return; }
      if (el.name === 'project') {
        // Proyek lain: sub-stage bawaan ikut tahap proyek itu.
        const p = proyekDari(el.value);
        if (p) isianForm(form, 'subProyek').value = subAwal(p.stage);
      }
      segarkanFormTask(form);
    }
  });

  document.addEventListener('submit', e => {
    const form = e.target;
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
    const jenis = form.dataset.form;
    if (!jenis) return;
    e.preventDefault();
    const waktu = Date.now();
    if (jenis === 'modal') return kirimModal(form);
    if (jenis === 'paket') {
      const p = S.data.packages.find(x => x.id === form.dataset.id);
      try {
        I.simpanPaket(S.data, p, bacaFormPaket(form), S.me, waktu);
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
      try { I.setorkan(S.data, t, isi, S.me, waktu); selesaiUbah('Setoran disimpan.'); } catch (err) { toast(err.message, true); }
      return;
    }
    if (jenis === 'output' || jenis === 'bukti' || jenis === 'serahkan') {
      const t = S.data.tasks.find(x => x.id === form.dataset.id);
      if (!t) return;
      try {
        if (jenis === 'output') {
          I.isiOutput(S.data, t, isianForm(form, 'output').value, S.me, waktu);
          selesaiUbah('Output disimpan.');
        } else if (jenis === 'bukti') {
          I.tambahBukti(S.data, t, { url: isianForm(form, 'url').value, label: isianForm(form, 'label').value }, S.me, waktu);
          selesaiUbah('Bukti ditambahkan.');
        } else {
          I.ubahTask(S.data, t, { pic: isianForm(form, 'pic').value }, S.me, waktu);
          selesaiUbah(`${t.id} diserahkan ke ${I.orang(t.pic).pendek}.`);
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
    if (jenis === 'komentar') {
      const teks = form.teks.value.trim();
      if (!teks) return;
      t.comments.push({ id: 'k' + waktu, author: S.me, text: teks, at: waktu });
      I.catatLog(S.data, 'comment', `${t.id} · ${t.title}`, teks.slice(0, 120), S.me, waktu);
      selesaiUbah();
      const isian = $(`#kom-${CSS.escape(t.id)}`);
      if (isian && S.view === 'komunikasi') isian.focus();
    } else if (jenis === 'sub-tambah') {
      const judul = form.judul.value.trim();
      if (!judul) return;
      t.subtasks.push({ id: 's' + waktu, title: judul, pic: form.pic.value || t.pic, due: '', done: false });
      t.updatedAt = waktu;
      I.catatLog(S.data, 'update', `${t.id} · ${t.title}`, 'Sub-task ditambah: ' + judul, S.me, waktu);
      selesaiUbah();
    }
  });

  document.addEventListener('input', e => {
    const el = e.target;
    if (el.id === 'palet-q') { S.palet.q = el.value; S.palet.pilih = 0; $('#palet-hasil').innerHTML = hasilPalet(); return; }
    if (['catatan-judul', 'catatan-isi', 'catatan-folder'].includes(el.id)) { catatanBerubah(); return; }
    if (el.closest('[data-form="paket"]')) { S.pkt.kotor = true; return; }
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
      if (!$('#modal').hidden) return tutupModal();
      if (S.notif.buka) return bukaTutupNotif(false);
      if (S.pilih && !$('#laci').hidden) { S.pilih = null; return render(); }
      if (S.navBuka) { S.navBuka = false; return render(); }
    }
    const mengetik = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (e.key === '/' && !mengetik && aplikasi && !S.modal) { e.preventDefault(); bukaPalet(); }
  });

  // Catatan yang masih menunggu simpan otomatis ikut tersimpan saat tab ditutup atau dimuat ulang.
  window.addEventListener('pagehide', () => simpanCatatanTertunda());

  /* Seret kartu antar kolom kanban: aturannya sama dengan tombol di detail. */
  document.addEventListener('dragstart', e => {
    const k = e.target.closest && e.target.closest('.kartu[draggable="true"]');
    if (!k) return;
    S.seret = k.dataset.id;
    k.classList.add('diseret');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', k.dataset.id);
  });
  document.addEventListener('dragend', () => {
    S.seret = null;
    document.querySelectorAll('.diseret, .kolom.sasaran').forEach(x => x.classList.remove('diseret', 'sasaran'));
  });
  document.addEventListener('dragover', e => {
    const kol = e.target.closest && e.target.closest('.kolom[data-kolom]');
    if (!kol || !S.seret) return;
    e.preventDefault();
    document.querySelectorAll('.kolom.sasaran').forEach(x => x !== kol && x.classList.remove('sasaran'));
    kol.classList.add('sasaran');
  });
  document.addEventListener('drop', e => {
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

  mulai();
}());
