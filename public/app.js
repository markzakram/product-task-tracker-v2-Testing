/* =============================================================================
   app.js — tampilan ProductTrack v2.

   Aturan alur ada di inti.js (window.Inti); berkas ini hanya menggambar dan
   meneruskan klik ke aturan itu. Data contoh dimuat dari server setelah PIN
   benar; suntingan disimpan di browser ini (localStorage) sampai ada impor data
   contoh versi baru.

   Navigasi ada di sidebar kiri, dikelompokkan seperti v1: Ringkasan · Task ·
   Kolaborasi · Ruang Saya · Manajer. Di ponsel sidebar menjadi laci, ditambah
   bilah bawah untuk halaman yang paling sering dibuka. Halaman pertama mengikuti
   peran: Manager → Proyek ADDIE, Lead & Staff → Hari Ini.
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

  /* ---------- Penyimpanan di browser ---------- */

  const AWALAN = 'pt2_';
  const ambil = (k, bawaan) => { try { const v = localStorage.getItem(AWALAN + k); return v == null ? bawaan : JSON.parse(v); } catch (e) { return bawaan; } };
  const simpan = (k, v) => { try { localStorage.setItem(AWALAN + k, JSON.stringify(v)); } catch (e) { /* penuh atau diblokir: tetap jalan */ } };
  const hapus = k => { try { localStorage.removeItem(AWALAN + k); } catch (e) { /* abaikan */ } };

  /* ---------- Halaman di sidebar ---------- */

  const HALAMAN = [
    { grup: 'Ringkasan', id: 'hari', judul: 'Hari Ini', ikon: 'matahari' },
    { grup: 'Ringkasan', id: 'dashboard', judul: 'Dashboard', ikon: 'grafik' },
    { grup: 'Ringkasan', id: 'dashlain', judul: 'Dashboard Lain', ikon: 'jendela' },
    { grup: 'Ringkasan', id: 'laporan', judul: 'Laporan', ikon: 'laporan', peran: ['lead', 'manager'] },
    { grup: 'Task', id: 'kanban', judul: 'Kanban', ikon: 'kolom' },
    { grup: 'Task', id: 'daftar', judul: 'Task List', ikon: 'daftar' },
    { grup: 'Task', id: 'timeline', judul: 'Timeline', ikon: 'timeline' },
    { grup: 'Task', id: 'kalender', judul: 'Kalender', ikon: 'kalender' },
    { grup: 'Kolaborasi', id: 'proyek', judul: 'Proyek ADDIE', ikon: 'lapis' },
    { grup: 'Kolaborasi', id: 'paket', judul: 'Rancangan Paket', ikon: 'kotak' },
    { grup: 'Kolaborasi', id: 'komunikasi', judul: 'Komunikasi', ikon: 'obrolan' },
    { grup: 'Ruang Saya', id: 'link', judul: 'Link Saya', ikon: 'penanda' },
    { grup: 'Ruang Saya', id: 'catatan', judul: 'Catatan Saya', ikon: 'catatan' },
    { grup: 'Manajer', id: 'riwayat', judul: 'Riwayat Aktivitas', ikon: 'riwayat', peran: ['manager'] },
  ];
  const NAV_BAWAH = ['hari', 'kanban', 'proyek', 'komunikasi'];
  /* Nama halaman di 0.3.0. "laporan" dulu berisi angka-angka yang kini jadi Dashboard. */
  const VIEW_LAMA = { papan: 'kanban', laporan: 'dashboard' };

  function halamanTersimpan() {
    const kini = ambil('halaman', null);
    if (kini) return kini;
    const lama = ambil('view', '');
    hapus('view');
    return VIEW_LAMA[lama] || lama || '';
  }
  function halamanBoleh(id) {
    const h = HALAMAN.find(x => x.id === id);
    return !!h && (!h.peran || h.peran.includes(I.orang(S.me).peran));
  }
  const halamanAwal = () => (I.orang(S.me).peran === 'manager' ? 'proyek' : 'hari');

  const S = {
    data: null,
    versi: '',
    sumber: '',
    dimuat: 0,
    me: ambil('me', null),
    view: halamanTersimpan(),
    pilih: null,
    proyek: null,
    proyekArsip: false,
    papan: Object.assign({ kelompok: 'status', lingkup: 'tim', proyek: '', jalur: '', platform: '', fokus: '' }, ambil('papan', {})),
    daftar: Object.assign({ lingkup: 'tim', status: 'aktif', jalur: '', platform: '', proyek: '', urut: 'due', arah: 1 }, ambil('daftar', {}), { q: '', hal: 1 }),
    jadwal: { lingkup: 'tim', kelompok: 'proyek', mulai: '' },
    kal: { lingkup: 'saya', bulan: '', hari: '' },
    dash: { lingkup: 'tim' },
    lap: { periode: 'minggu', tim: '', buka: '' },
    kom: { lingkup: 'terlibat', q: '', baru: false, pilih: null },
    pkt: { q: '', platform: '', pilih: null, sunting: false, kotor: false },
    lnk: { q: '' },
    ctt: { q: '', buka: '' },
    rwy: { jenis: '', orang: '', q: '', batas: 100 },
    navBuka: false,
    cari: '',
    modal: null,
    seret: null,
  };

  function simpanData() { simpan('data', { versi: S.versi, dimuat: S.dimuat, data: S.data }); }
  function simpanPref(ruang) {
    if (ruang === 'papan') simpan('papan', S.papan);
    if (ruang === 'daftar') { const { q, hal, ...sisa } = S.daftar; simpan('daftar', sisa); }
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
  const chipJalur = t => (t.lane === 'proyek'
    ? `<span class="huruf-tahap" title="Tahap ${esc(I.namaTahap(t.stage))}">${esc(t.stage || '?')}</span>`
    : '<span class="chip-rutin" title="Jalur Rutin: tanpa tahap ADDIE">Rutin</span>');
  const chipPenting = t => (t.priority === 'Urgent' ? '<span class="chip-penting">Mendesak</span>' : t.priority === 'High' ? '<span class="chip-penting">Penting</span>' : '');
  const proyekDari = id => S.data.projects.find(p => p.id === id);
  const asal = t => (t.project ? (proyekDari(t.project) || { name: t.project }).name : t.kategori || 'Rutin');
  function ringkasSub(t) {
    if (!t.subtasks.length) return '';
    return `${t.subtasks.filter(s => s.done).length}/${t.subtasks.length} sub-task`;
  }

  function jalurTahap(p, tahapTask) {
    const ke = I.TAHAP.findIndex(x => x.id === p.stage);
    return `<div class="jalur-tahap" role="img" aria-label="Tahap proyek: ${esc(I.namaTahap(p.stage))}">${I.TAHAP.map((x, i) => `
      <div class="${i < ke ? 'lewat' : i === ke ? 'kini' : ''} ${tahapTask === x.id && x.id !== p.stage ? 'milik' : ''}">
        <span class="kotak">${x.id}</span><span class="nama">${x.nama}</span>
      </div>`).join('')}</div>`;
  }
  function jalurMini(p) {
    const ke = I.TAHAP.findIndex(x => x.id === p.stage);
    return `<span class="jalur-mini" aria-label="Tahap ${esc(I.namaTahap(p.stage))}">${I.TAHAP.map((x, i) => `<span class="${i < ke ? 'lewat' : i === ke ? 'kini' : ''}">${x.id}</span>`).join('')}</span>`;
  }
  const KEADAAN = { aman: 'Sesuai rencana', risiko: 'Berisiko', tunggu: 'Menunggu keputusan', kosong: 'Belum ada task', ditahan: 'Ditahan', arsip: 'Arsip' };
  const chipKeadaan = k => `<span class="pill kd-${k}">${KEADAAN[k]}</span>`;

  function barisTask(t, alasan = '') {
    const sub = ringkasSub(t);
    return `<button type="button" class="baris ${S.pilih === t.id ? 'dipilih' : ''}" data-aksi="buka-task" data-id="${esc(t.id)}">
      ${pillStatus(t.status)}
      <span class="baris-isi">
        <span class="baris-judul">${esc(t.title)}</span>
        <span class="baris-meta">${chipJalur(t)} ${esc(asal(t))}${sub ? ' · ' + sub : ''} ${chipPenting(t)}</span>
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
      <span class="kartu-atas">${chipJalur(t)} <span>${esc(asal(t))}</span></span>
      <button type="button" class="kartu-judul" data-aksi="buka-task" data-id="${esc(t.id)}">${esc(t.title)}</button>
      ${sub ? `<span class="kartu-sub"><span class="batang"><span style="width:${Math.round(beres / sub * 100)}%"></span></span>${beres}/${sub}</span>` : ''}
      ${t.tertahan ? `<span class="tanda-tahan">Tertahan: ${esc(t.alasanTertahan || 'tanpa alasan')}</span>` : dep.length && !I.selesai(t) ? `<span class="kartu-tunggu">Menunggu ${esc(dep[0].id)}</span>` : ''}
      <span class="kartu-bawah">${avatar(t.pic, 'kecil')} <span>${nama(t.pic)}</span> ${chipTenggat(t)}</span>
    </div>`;
  }

  /* Pilihan lingkup yang sama di banyak halaman. Bagi Manager, "tim" = seluruh divisi. */
  function segmenLingkup(ruang, nilai, label = 'Lingkup') {
    const manager = I.orang(S.me).peran === 'manager';
    const opsi = [['saya', 'Saya'], ['tim', manager ? 'Divisi' : 'Tim saya'], ...(manager ? [] : [['semua', 'Semua']])];
    return `<div class="segmen" role="group" aria-label="${label}">${opsi.map(([v, l]) => `<button type="button" data-aksi="atur" data-ruang="${ruang}" data-kunci="lingkup" data-nilai="${v}" aria-pressed="${nilai === v}">${l}</button>`).join('')}</div>`;
  }
  const pilihan = (ruang, kunci, nilai, opsi, label) => `<label class="label-kecil">${esc(label)} <select data-aksi="saring" data-ruang="${ruang}" data-kunci="${kunci}">${opsi.map(([v, l]) => `<option value="${esc(v)}" ${nilai === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  const kotakCari = (ruang, nilai, teks) => `<label class="cari-halaman">${ikon('cari', 16)}<span class="sr">${esc(teks)}</span><input type="search" data-cari="${ruang}" placeholder="${esc(teks)}" value="${esc(nilai)}" autocomplete="off"></label>`;
  const daftarPlatform = () => [...new Set(S.data.tasks.map(t => t.platform).filter(Boolean))].sort();

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
      projects: daftar(d.projects).map(p => ({ ...p, history: daftar(p.history) })),
      tasks: daftar(d.tasks).map(t => ({
        ...t, support: daftar(t.support), deps: daftar(t.deps), subtasks: daftar(t.subtasks), comments: daftar(t.comments),
        tinjauan: daftar(t.tinjauan), evidence: daftar(t.evidence), output: t.output || '', selesaiAt: Number(t.selesaiAt) || 0,
      })),
      packages: daftar(d.packages).map(p => ({
        ...p, namaPaket: p.namaPaket || p.name || '', mirror: !!p.mirror,
        items: daftar(p.items).map(i => ({ ...i, target: angka(i.target), awal: angka(i.awal), satuan: i.satuan || 'Paket' })),
        links: daftar(p.links),
      })),
      dashboards: daftar(d.dashboards),
      links: daftar(d.links),
      notes: daftar(d.notes),
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
      <p class="pesan-info" style="margin-top:6px">PIN dipakai bersama, jadi pilih profil Anda sendiri. Tampilan menyesuaikan peran: Staff dan Lead mulai di Hari Ini, Manager di Proyek ADDIE.</p></div>
      ${kelompok}
    </div>`;
    $('#kunci').hidden = true;
    $('#app').hidden = true;
    $('#profil').hidden = false;
  }

  function masukApp() {
    $('#kunci').hidden = true;
    $('#profil').hidden = true;
    $('#app').hidden = false;
    if (!halamanBoleh(S.view)) S.view = halamanAwal();
    simpan('halaman', S.view);
    render();
  }

  async function muat() {
    tampilKunci('Memuat data…', true);
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
      pesan = `Data contoh dimuat: ${S.data.tasks.length} task, ${S.data.projects.length} proyek, ${S.data.packages.length} paket.`;
    } else {
      S.data = rapikan({});
      S.dimuat = Date.now();
      pesan = 'Data contoh belum diimpor ke spreadsheet v2.';
    }
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

  /* ---------- Kerangka: sidebar, bilah atas, bilah bawah ---------- */

  function lencanaNav() {
    const h = hariIni();
    const kerja = I.pekerjaanSaya(S.data, S.me, h);
    return {
      hari: kerja.grup.filter(g => ['tinjau', 'telat', 'hari'].includes(g.kunci)).reduce((n, g) => n + g.isi.length, 0),
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
            <button type="button" class="ikon-tombol" data-aksi="muat-ulang" title="Muat ulang data contoh" aria-label="Muat ulang data contoh">${ikon('ulang')}</button>
            <button type="button" class="ikon-tombol" data-aksi="keluar" title="Keluar" aria-label="Keluar">${ikon('keluar')}</button>
          </div>
        </div>
        <p class="samping-catatan">Prototipe: perubahan tersimpan di browser ini.</p>
      </div>`;
    $('#samping').classList.toggle('buka', S.navBuka);
    $('#samping-latar').hidden = !S.navBuka;
  }

  function renderKepala() {
    const h = HALAMAN.find(x => x.id === S.view);
    $('#kepala').innerHTML = `<div class="kepala-dalam">
      <button type="button" class="ikon-tombol nav-buka" data-aksi="buka-nav" aria-label="Buka menu" aria-expanded="${S.navBuka}">${ikon('menu', 22)}</button>
      <p class="kepala-judul">${esc(h ? h.judul : 'ProductTrack')}</p>
      <label class="cari">${ikon('cari', 16)}<span class="sr">Cari task</span>
        <input id="cari-global" type="search" placeholder="Cari task, ID, orang, proyek ( / )" value="${esc(S.cari)}" autocomplete="off">
        <div id="cari-hasil" class="cari-hasil" hidden></div>
      </label>
      <button type="button" class="ikon-tombol cari-hp" data-aksi="ke-cari" aria-label="Cari task">${ikon('cari', 20)}</button>
      ${I.bolehBuatTask(S.me) ? `<button type="button" class="tombol utama tombol-tambah" data-aksi="tambah-task">${ikon('tambah', 16)} Tambah task</button>` : ''}
    </div>`;
  }

  function renderNavBawah(lencana) {
    $('#nav-bawah').innerHTML = NAV_BAWAH.filter(halamanBoleh).map(id => {
      const h = HALAMAN.find(x => x.id === id);
      return `<button type="button" data-aksi="ke" data-view="${id}" ${S.view === id ? 'aria-current="page"' : ''}>${ikon(h.ikon, 22)}${h.judul.replace(' ADDIE', '')}${lencanaHtml(id, lencana[id])}</button>`;
    }).join('') + `<button type="button" data-aksi="buka-nav" ${NAV_BAWAH.includes(S.view) ? '' : 'aria-current="page"'}>${ikon('menu', 22)}Menu</button>`;
    /* Tombol tambah task hanya di halaman task; di Komunikasi ia menutupi kotak tulis. */
    $('#fab').hidden = !I.bolehBuatTask(S.me) || !HALAMAN_TASK.includes(S.view);
  }
  const HALAMAN_TASK = ['hari', 'dashboard', 'kanban', 'daftar', 'timeline', 'kalender', 'proyek'];

  const GAMBAR = {
    hari: () => viewHari(), dashboard: () => viewDashboard(), dashlain: () => viewDashLain(), laporan: () => viewLaporan(),
    kanban: () => viewPapan(), daftar: () => viewDaftar(), timeline: () => viewTimeline(), kalender: () => viewKalender(),
    proyek: () => viewProyek(), paket: () => viewPaket(), komunikasi: () => viewKomunikasi(),
    link: () => viewLink(), catatan: () => viewCatatan(), riwayat: () => viewRiwayat(),
  };
  /* Bagian halaman yang digambar ulang saat orang mengetik di kotak cari halaman,
     supaya kotaknya tidak kehilangan fokus. */
  const HASIL = { daftar: () => hasilDaftar(), paket: () => hasilPaket(), komunikasi: () => hasilKomunikasi(), link: () => hasilLink(), catatan: () => hasilCatatan(), riwayat: () => hasilRiwayat() };

  function render() {
    if (!halamanBoleh(S.view)) S.view = halamanAwal();
    const lencana = lencanaNav();
    renderSamping(lencana);
    renderKepala();
    renderNavBawah(lencana);
    $('#isi').innerHTML = GAMBAR[S.view]();
    renderLaci();
    const isiObrolan = $('#obrolan-isi');
    if (isiObrolan) isiObrolan.scrollTop = isiObrolan.scrollHeight;
    const h = HALAMAN.find(x => x.id === S.view);
    document.title = (h ? h.judul : 'ProductTrack') + ' · ProductTrack v2';
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
    S.view = view;
    S.navBuka = false;
    S.pilih = view === 'hari' ? S.pilih : null;
    if (view === 'proyek') S.proyek = null;
    if (view === 'paket') Object.assign(S.pkt, { pilih: null, sunting: false, kotor: false });
    simpan('halaman', S.view);
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

  /* ---------- Hari Ini ---------- */

  function sapaan() {
    const j = new Date().getHours();
    return j < 11 ? 'Selamat pagi' : j < 15 ? 'Selamat siang' : j < 18 ? 'Selamat sore' : 'Selamat malam';
  }

  function pitaPeran() {
    const o = I.orang(S.me);
    const h = hariIni();
    if (o.peran === 'staff') return '';
    const ids = I.lingkupOrang(S.me, 'tim');
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
      <button type="button" class="tombol kecil" data-aksi="ke" data-view="kanban">${ikon('kolom', 16)} Buka kanban</button>
    </div>`;
  }

  function viewHari() {
    const h = hariIni();
    const o = I.orang(S.me);
    const kerja = I.pekerjaanSaya(S.data, S.me, h);
    const n = kunci => (kerja.grup.find(g => g.kunci === kunci) || { isi: [] }).isi.length;
    const nHari = n('hari'), nTelat = n('telat'), nTinjau = n('tinjau');
    const kalimat = [
      nHari ? `<strong>${nHari} task</strong> untuk hari ini` : '',
      nTelat ? `<strong>${nTelat}</strong> terlambat` : '',
      nTinjau ? `<strong>${nTinjau}</strong> menunggu tinjauan Anda` : '',
    ].filter(Boolean);
    const daftar = kerja.grup.map(g => `<section class="grup ${g.kunci}">
      <h2>${esc(g.judul)} <span class="jumlah">${g.isi.length}</span></h2>
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

  function detailHtml(t, diLaci) {
    const me = S.me;
    const perId = I.indeks(S.data);
    const p = t.project ? proyekDari(t.project) : null;
    const tinjau = I.peninjau(t);
    const aksi = I.aksiUntuk(t, me, perId);
    const utama = aksi.filter(a => a.utama);
    const lain = aksi.filter(a => !a.utama);
    const tunggu = I.alasanTunggu(t, perId);
    const bisaUbah = I.bolehUbah(t, me) && I.orang(me).peran !== 'staff';
    const bisaSub = I.bolehUbah(t, me);
    const pilihanPic = [...new Set([...(I.orang(me).peran === 'staff' ? [me] : I.picBoleh(me)), t.pic])];
    const log = S.data.log.filter(l => String(l.task).startsWith(t.id + ' ')).slice(0, 8);

    return `<div class="detail">
      <div class="detail-atas"><div>
        <p class="detail-asal">${p ? `<button type="button" data-aksi="buka-proyek" data-id="${esc(p.id)}">${esc(p.name)}</button>` : `Jalur Rutin · ${esc(t.kategori || 'Umum')}`} · ${esc(t.id)}</p>
        <h2>${esc(t.title)}</h2>
        <div class="detail-chip">${pillStatus(t.status)} ${chipTenggat(t)} ${chipPenting(t)} ${t.tertahan ? '<span class="pill kd-risiko">Tertahan</span>' : ''}</div>
        <div class="detail-orang">${avatar(t.pic, 'kecil')} PIC ${nama(t.pic)}
          ${t.support.length ? ` · bantuan ${t.support.map(nama).join(', ')}` : ''}
          · ${tinjau ? 'ditinjau ' + nama(tinjau) : t.lane === 'rutin' ? 'tanpa tinjauan (rutin)' : 'tanpa tinjauan'}</div>
      </div>
      ${diLaci ? `<button type="button" class="ikon-tombol" data-aksi="tutup-detail" aria-label="Tutup">${ikon('tutup', 20)}</button>` : ''}</div>

      ${p ? `<section><p class="subjudul">Tahap proyek${t.stage !== p.stage ? ` · task ini di ${esc(I.namaTahap(t.stage))}` : ''}</p>${jalurTahap(p, t.stage)}</section>` : ''}
      ${tunggu ? `<div class="banner ${t.tertahan ? 'merah' : 'kuning'}">${esc(tunggu)}</div>` : ''}

      ${aksi.length || bisaUbah ? `<section>
        <div class="detail-aksi">
          ${utama.map(a => `<button type="button" class="tombol utama" data-aksi="aksi-task" data-kunci="${a.kunci}" data-id="${esc(t.id)}" ${a.nonaktif ? 'disabled' : ''}>${esc(a.label)}</button>`).join('')}
          ${lain.map(a => `<button type="button" class="tombol ${['tahan', 'kembalikan'].includes(a.kunci) ? 'bahaya' : ''}" data-aksi="aksi-task" data-kunci="${a.kunci}" data-id="${esc(t.id)}">${esc(a.label)}</button>`).join('')}
          ${bisaUbah ? `<button type="button" class="tombol" data-aksi="ubah-task" data-id="${esc(t.id)}">Ubah</button>` : ''}
        </div>
        ${utama.filter(a => a.nonaktif).map(a => `<p class="hint">${esc(a.alasan)}</p>`).join('')}
      </section>` : ''}

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

      ${t.output ? `<section><p class="subjudul">Output</p><p class="teks-panjang">${esc(t.output)}</p></section>` : ''}
      ${t.detail || t.notes ? `<section><p class="subjudul">Keterangan</p>${t.detail ? `<p class="teks-panjang">${esc(t.detail)}</p>` : ''}${t.notes ? `<p class="teks-panjang">${esc(t.notes)}</p>` : ''}</section>` : ''}
      ${t.evidence.length ? `<section class="tautan-daftar"><p class="subjudul">Tautan</p>${t.evidence.map(e => (tautanAman(e.url)
        ? `<a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${ikon('tautan', 16)} ${esc(e.label || e.url)}</a>` : '')).join('')}</section>` : ''}
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

  function viewDashboard() {
    const h = hariIni();
    const ids = I.lingkupOrang(S.me, S.dash.lingkup);
    const r = I.laporan(S.data, h, ids);
    const maks = Math.max(1, ...r.mingguan.map(m => m.jumlah));
    const maksPl = Math.max(1, ...r.perPlatform.map(x => x.jumlah));
    const maksSt = Math.max(1, ...r.perStatus.map(x => x.jumlah));
    const perId = I.indeks(S.data);
    const proyekAktif = S.data.projects.filter(p => !p.arsip);
    const keadaan = {};
    for (const p of proyekAktif) { const k = I.ringkasProyek(S.data, p, h, perId).keadaan; keadaan[k] = (keadaan[k] || 0) + 1; }
    const perTahap = I.TAHAP.map(x => ({ ...x, jumlah: proyekAktif.filter(p => p.stage === x.id).length }));
    const keterangan = S.dash.lingkup === 'saya' ? 'Task saya' : !ids ? 'Seluruh divisi' : `Tim ${esc(I.orang(ids[0]).pendek)} · ${ids.length} orang`;
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
          <div class="batang-platform">${r.perStatus.map(x => `<div><span>${pillStatus(x.status)}</span><span class="batang"><span style="width:${Math.round(x.jumlah / maksSt * 100)}%"></span></span><b>${x.jumlah}</b></div>`).join('')}</div>
          <p class="hint" style="margin-top:12px">Jalur Proyek ${r.perJalur.proyek} · Jalur Rutin ${r.perJalur.rutin}</p>
        </section>
        <section class="kartu-polos"><p class="subjudul">Selesai per minggu</p>
          <div class="grafik-minggu">${r.mingguan.map(m => `<div><b>${m.jumlah}</b><span class="tiang" style="height:${Math.round(m.jumlah / maks * 130)}px"></span><small>${esc(fmtTanggalPendek(m.awal))}</small></div>`).join('')}</div>
        </section>
        <section class="kartu-polos"><p class="subjudul">Task aktif per platform</p>
          <div class="batang-platform">${r.perPlatform.map(x => `<div><span>${esc(x.platform)}</span><span class="batang"><span style="width:${Math.round(x.jumlah / maksPl * 100)}%"></span></span><b>${x.jumlah}</b></div>`).join('') || '<p class="hint">Tidak ada task aktif.</p>'}</div>
        </section>
        <section class="kartu-polos"><p class="subjudul">Proyek ADDIE · ${proyekAktif.length} aktif</p>
          <div class="tahap-hitung">${perTahap.map(x => `<div><span class="huruf-tahap">${x.id}</span><b>${x.jumlah}</b><small>${x.nama}</small></div>`).join('')}</div>
          <div class="detail-chip" style="margin-top:12px">${Object.keys(KEADAAN).filter(k => keadaan[k]).map(k => `${chipKeadaan(k)} <b>${keadaan[k]}</b>`).join(' ') || '<span class="hint">Belum ada proyek aktif.</span>'}</div>
          <button type="button" class="tombol kecil" style="margin-top:12px" data-aksi="ke" data-view="proyek">${ikon('lapis', 16)} Buka Proyek ADDIE</button>
        </section>
        <section class="kartu-polos lebar-penuh"><p class="subjudul">Per orang</p>
          <div class="tabel-gulir"><table class="tabel"><thead><tr><th>Nama</th><th>Peran</th><th>Beban</th><th class="angka">Aktif</th><th class="angka">Terlambat</th><th class="angka">Selesai 30 hari</th></tr></thead>
          <tbody>${r.perOrang.map(x => {
            const persen = Math.min(100, Math.round(x.aktif / I.KAPASITAS * 100));
            const penuh = x.aktif >= I.KAPASITAS;
            return `<tr><td>${avatar(x.id, 'kecil')} ${nama(x.id)}</td><td>${esc(I.PERAN[I.orang(x.id).peran])}</td>
              <td><span class="beban ${penuh ? 'penuh' : ''}"><span class="batang ${penuh ? 'merah' : ''}"><span style="width:${persen}%"></span></span></span></td>
              <td class="angka">${x.aktif}</td><td class="angka">${x.telat}</td><td class="angka">${x.selesai30}</td></tr>`;
          }).join('')}</tbody></table></div>
          <p class="hint">Beban: jumlah task aktif terhadap kapasitas ${I.KAPASITAS} task per orang.</p>
        </section>
      </div>`;
  }

  /* ---------- Dashboard Lain ---------- */

  function viewDashLain() {
    const isM = I.orang(S.me).peran === 'manager';
    const d = S.data.dashboards;
    return `<div class="judul-halaman"><div><h1>Dashboard Lain</h1><p>Dashboard dan laporan tim di luar ProductTrack. ${isM ? 'Anda bisa menambah dan mengubahnya.' : 'Dikelola Manager.'}</p></div>
        ${isM ? `<button type="button" class="tombol utama" data-aksi="dashlain-tambah">${ikon('tambah', 16)} Tambah dashboard</button>` : ''}</div>
      ${d.length ? `<div class="grid-dash">${d.map(x => `<article class="kartu-dash">
        <div class="kartu-dash-atas"><span class="dash-ikon">${ikon(IKON_DASH[x.icon] || 'jendela', 22)}</span>
          <div><h2>${esc(x.title)}</h2>${x.deskripsi ? `<p>${esc(x.deskripsi)}</p>` : ''}<small>${esc(namaSitus(x.url))}</small></div></div>
        <div class="kartu-dash-bawah">
          ${tautanAman(x.url) ? `<a class="tombol kecil utama" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${ikon('luar', 16)} Buka</a>` : ''}
          ${isM ? `<span class="spasi"></span><button type="button" class="ikon-tombol" data-aksi="dashlain-ubah" data-id="${esc(x.id)}" aria-label="Ubah ${esc(x.title)}">${ikon('sunting', 16)}</button>
            <button type="button" class="ikon-tombol" data-aksi="dashlain-hapus" data-id="${esc(x.id)}" aria-label="Hapus ${esc(x.title)}">${ikon('hapus', 16)}</button>` : ''}
        </div>
      </article>`).join('')}</div>` : '<div class="kosong-isi">Belum ada dashboard.</div>'}`;
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
        <li><strong>${esc(x.p.name)}</strong>: ${esc(I.namaTahap(x.dari))} → ${esc(I.namaTahap(x.ke))} oleh ${nama(x.oleh)} <small>· ${esc(fmtWaktu(x.at))}</small></li>`).join('')}</ul></section>` : ''}`;
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

  /* ---------- Kanban ---------- */

  const WARNA_KOLOM = { Antre: '#8A93A0', Dikerjakan: '#0068B4', Ditinjau: '#B86E00', Selesai: '#067647' };

  function viewPapan() {
    const f = S.papan;
    const h = hariIni();
    const o = I.orang(S.me);
    const ids = I.lingkupOrang(S.me, f.lingkup);
    const saringan = { orang: ids, proyek: f.proyek, jalur: f.jalur, platform: f.platform, fokus: f.fokus, me: S.me };
    const p = I.perhatian(S.data, ids, S.me, h);
    const perId = I.indeks(S.data);
    const keterangan = f.lingkup === 'saya' ? 'Task saya' : !ids ? 'Seluruh divisi' : `Tim ${esc(I.orang(ids[0]).pendek)} · ${ids.length} orang`;
    const proyekAktif = S.data.projects.filter(x => !x.arsip);
    const segmen = (kunci, nilai, label) => `<button type="button" data-aksi="atur" data-ruang="papan" data-kunci="${kunci}" data-nilai="${nilai}" aria-pressed="${f[kunci] === nilai}">${label}</button>`;
    const fokus = (kunci, n, teks, kelas) => `<button type="button" class="chip-aksi ${kelas}" data-aksi="atur" data-ruang="papan" data-kunci="fokus" data-nilai="${f.fokus === kunci ? '' : kunci}" aria-pressed="${f.fokus === kunci}" ${n || f.fokus === kunci ? '' : 'disabled'}>${n} ${teks}</button>`;
    const adaSaring = f.proyek || f.jalur || f.platform || f.fokus;

    let isi;
    if (f.kelompok === 'orang') {
      const daftarOrang = ids || [...new Set([...I.ORANG.map(x => x.id), ...S.data.tasks.filter(I.aktif).map(t => t.pic)])];
      const aktif = I.kolomPapan(S.data, saringan, h).filter(k => k.status !== 'Selesai').flatMap(k => k.isi);
      isi = `<div class="per-orang">${I.bebanOrang(S.data, daftarOrang).map(b => {
        const milik = aktif.filter(t => t.pic === b.id);
        if (!milik.length && !ids) return '';
        return `<section class="baris-orang">
          <div class="baris-orang-kiri"><div>${avatar(b.id, 'besar')}<span><strong>${nama(b.id)}</strong><small>${esc(I.orang(b.id).jabatan)}</small></span></div>
            <span class="beban ${b.penuh ? 'penuh' : ''}"><span class="batang ${b.penuh ? 'merah' : ''}"><span style="width:${b.persen}%"></span></span>${b.aktif}/${I.KAPASITAS}${b.penuh ? ' · penuh' : ''}</span></div>
          <div class="baris-orang-kartu">${milik.map(t => kartuTask(t, perId)).join('') || '<p class="hint">Tidak ada task aktif.</p>'}</div>
        </section>`;
      }).join('')}</div>`;
    } else {
      const kolom = I.kolomPapan(S.data, saringan, h);
      isi = `<div class="papan-gulir"><div class="papan">${kolom.map(k => `
        <section class="kolom" data-kolom="${k.status}" aria-label="${k.status}">
          <h2><span class="titik" style="background:${WARNA_KOLOM[k.status]}"></span>${k.status === 'Selesai' ? 'Selesai · 7 hari' : k.status}<span class="jumlah">${k.isi.length}</span></h2>
          ${k.status === 'Ditinjau' ? '<p>Task proyek menunggu persetujuan peninjau</p>' : ''}
          ${k.isi.slice(0, 40).map(t => kartuTask(t, perId)).join('') || '<p>Kosong</p>'}
          ${k.isi.length > 40 ? `<button type="button" class="tombol kecil" data-aksi="daftar-status" data-status="${k.status}">Lihat ${k.isi.length - 40} lainnya di Task List</button>` : ''}
        </section>`).join('')}</div></div>`;
    }

    return `<div class="judul-halaman"><div><h1>Kanban</h1><p>${keterangan} · seret kartu untuk memindah status</p></div>
        <div class="segmen" role="group" aria-label="Lingkup">${segmen('lingkup', 'saya', 'Saya')}${segmen('lingkup', 'tim', o.peran === 'manager' ? 'Divisi' : 'Tim saya')}${o.peran === 'manager' ? '' : segmen('lingkup', 'semua', 'Semua')}</div>
        <div class="segmen" role="group" aria-label="Kelompokkan">${segmen('kelompok', 'status', 'Per status')}${segmen('kelompok', 'orang', 'Per orang')}</div>
      </div>
      <div class="alat">
        <span class="label-kecil">Perlu perhatian:</span>
        ${fokus('telat', p.telat, 'terlambat', 'merah')}${fokus('tertahan', p.tertahan, 'tertahan', 'merah')}${fokus('tinjau', p.tinjau, 'menunggu tinjauan Anda', 'kuning')}
        <span class="spasi"></span>
        ${pilihan('papan', 'proyek', f.proyek, [['', 'Semua'], ...proyekAktif.map(x => [x.id, x.name])], 'Proyek')}
        ${pilihan('papan', 'jalur', f.jalur, [['', 'Semua'], ['proyek', 'Proyek'], ['rutin', 'Rutin']], 'Jalur')}
        ${pilihan('papan', 'platform', f.platform, [['', 'Semua'], ...daftarPlatform().map(x => [x, x])], 'Platform')}
        ${adaSaring ? '<button type="button" class="tombol kecil" data-aksi="papan-bersih">Hapus saringan</button>' : ''}
      </div>
      ${isi}`;
  }

  /* ---------- Task List ---------- */

  const PER_HAL = 50;
  const saringanDaftar = () => {
    const f = S.daftar;
    return { orang: I.lingkupOrang(S.me, f.lingkup), proyek: f.proyek, jalur: f.jalur, platform: f.platform, status: f.status, q: f.q, urut: f.urut, arah: f.arah };
  };

  function viewDaftar() {
    const f = S.daftar;
    const proyekSemua = S.data.projects.slice().sort((a, b) => a.arsip - b.arsip || a.name.localeCompare(b.name, 'id'));
    return `<div class="judul-halaman"><div><h1>Task List</h1><p>Semua task dalam satu tabel, termasuk yang sudah selesai. Klik judul kolom untuk mengurutkan.</p></div>
        ${segmenLingkup('daftar', f.lingkup)}</div>
      <div class="alat">
        ${kotakCari('daftar', f.q, 'Cari judul, ID, orang, proyek…')}
        ${pilihan('daftar', 'status', f.status, [['aktif', 'Aktif'], ['', 'Semua'], ...I.STATUS.map(s => [s, s])], 'Status')}
        ${pilihan('daftar', 'jalur', f.jalur, [['', 'Semua'], ['proyek', 'Proyek'], ['rutin', 'Rutin']], 'Jalur')}
        ${pilihan('daftar', 'proyek', f.proyek, [['', 'Semua'], ...proyekSemua.map(p => [p.id, p.name + (p.arsip ? ' (arsip)' : '')])], 'Proyek')}
        ${pilihan('daftar', 'platform', f.platform, [['', 'Semua'], ...daftarPlatform().map(x => [x, x])], 'Platform')}
      </div>
      <div id="hasil">${hasilDaftar()}</div>`;
  }

  function hasilDaftar() {
    const f = S.daftar;
    const semua = I.daftarTask(S.data, saringanDaftar(), hariIni());
    const jumlahHal = Math.max(1, Math.ceil(semua.length / PER_HAL));
    f.hal = Math.min(Math.max(1, f.hal), jumlahHal);
    const isi = semua.slice((f.hal - 1) * PER_HAL, f.hal * PER_HAL);
    const kolom = [['id', 'ID'], ['title', 'Task'], ['pic', 'PIC'], ['status', 'Status'], ['due', 'Tenggat'], ['platform', 'Platform']];
    const kepala = kolom.map(([k, l]) => `<th aria-sort="${f.urut === k ? (f.arah === -1 ? 'descending' : 'ascending') : 'none'}"><button type="button" class="urut" data-aksi="daftar-urut" data-kunci="${k}">${l}<span aria-hidden="true">${f.urut === k ? (f.arah === -1 ? ' ↓' : ' ↑') : ''}</span></button></th>`).join('');
    const tabel = `<div class="tabel-gulir kartu-polos rapat"><table class="tabel tabel-task"><thead><tr>${kepala}</tr></thead><tbody>${isi.map(t => `
      <tr class="${S.pilih === t.id ? 'dipilih' : ''}">
        <td class="kecil">${esc(t.id)}</td>
        <td><button type="button" class="tautan-task" data-aksi="buka-task" data-id="${esc(t.id)}">${esc(t.title)}</button>
          <span class="baris-meta">${chipJalur(t)} ${esc(asal(t))} ${chipPenting(t)}${t.tertahan ? ' <span class="pill kd-risiko">Tertahan</span>' : ''}</span></td>
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
    return `<div class="daftar-atas"><p class="hint">${semua.length} task${semua.length > PER_HAL ? ` · menampilkan ${(f.hal - 1) * PER_HAL + 1}–${(f.hal - 1) * PER_HAL + isi.length}` : ''}</p>
        <button type="button" class="tombol kecil" data-aksi="ekspor" ${semua.length ? '' : 'disabled'}>${ikon('unduh', 16)} Ekspor CSV</button></div>
      ${semua.length ? (hp() ? `<div class="grup">${isi.map(t => barisTask(t)).join('')}</div>` : tabel) : '<div class="kosong-isi">Tidak ada task yang cocok dengan saringan ini.</div>'}
      ${nav}`;
  }

  function eksporCsv(daftar) {
    const sel = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const judul = ['ID', 'Judul', 'Jalur', 'Proyek', 'Kategori', 'Tahap', 'Platform', 'PIC', 'Status', 'Tertahan', 'Tenggat', 'Selesai'];
    const baris = daftar.map(t => [t.id, t.title, t.lane, t.project ? asal(t) : '', t.kategori, t.stage ? I.namaTahap(t.stage) : '', t.platform,
      I.orang(t.pic).nama, t.status, t.tertahan ? 'ya' : '', t.due, t.selesaiAt ? I.isoHari(t.selesaiAt) : '']);
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

  /* ---------- Timeline ---------- */

  const HARI_JENDELA = 35;
  const HURUF_HARI = ['M', 'S', 'S', 'R', 'K', 'J', 'S'];

  function viewTimeline() {
    const j = S.jadwal;
    const h = hariIni();
    const mulai = j.mulai || I.tambahHari(I.rentang('minggu', h).dari, -7);
    const hari = Array.from({ length: HARI_JENDELA }, (_, i) => I.tambahHari(mulai, i));
    const akhir = hari[HARI_JENDELA - 1];
    const ids = I.lingkupOrang(S.me, j.lingkup);
    const isi = S.data.tasks.filter(t => !ids || ids.includes(t.pic))
      .map(t => ({ t, ...I.rentangTask(t) }))
      .filter(x => x.mulai && x.mulai <= akhir && x.akhir >= mulai && (I.aktif(x.t) || I.isoHari(x.t.selesaiAt) >= mulai))
      .sort((a, b) => a.mulai.localeCompare(b.mulai) || a.akhir.localeCompare(b.akhir));
    const kepala = `<div class="judul-halaman"><div><h1>Timeline</h1><p>${esc(fmtRentang(mulai, akhir))} · ${isi.length} task terjadwal. Batang = tanggal mulai sampai tenggat.</p></div>
        ${segmenLingkup('jadwal', j.lingkup)}
        <div class="segmen" role="group" aria-label="Kelompokkan"><button type="button" data-aksi="atur" data-ruang="jadwal" data-kunci="kelompok" data-nilai="proyek" aria-pressed="${j.kelompok === 'proyek'}">Per proyek</button><button type="button" data-aksi="atur" data-ruang="jadwal" data-kunci="kelompok" data-nilai="orang" aria-pressed="${j.kelompok === 'orang'}">Per orang</button></div>
      </div>
      <div class="alat">
        <button type="button" class="tombol kecil" data-aksi="jadwal-geser" data-n="-7">${ikon('kiri', 16)} Minggu sebelumnya</button>
        <button type="button" class="tombol kecil" data-aksi="jadwal-geser" data-n="0">Minggu ini</button>
        <button type="button" class="tombol kecil" data-aksi="jadwal-geser" data-n="7">Minggu berikutnya ${ikon('kanan', 16)}</button>
        <span class="spasi"></span>
        <span class="legenda">${I.STATUS.map(s => `<span><i class="tl-${s.toLowerCase()}"></i>${s}</span>`).join('')}<span><i class="tl-telat"></i>Terlambat</span></span>
      </div>`;
    if (!isi.length) return kepala + '<div class="kosong-isi">Tidak ada task terjadwal dalam rentang ini.</div>';

    if (hp()) {
      const perTanggal = new Map();
      for (const x of isi) {
        const k = x.akhir < mulai ? mulai : x.akhir;
        if (!perTanggal.has(k)) perTanggal.set(k, []);
        perTanggal.get(k).push(x.t);
      }
      return kepala + [...perTanggal.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([tgl, daftar]) => `<section class="grup">
        <h2 class="${tgl === h ? 'kini' : ''}">${esc(fmtTanggalPanjang(tgl))} <span class="jumlah">${daftar.length}</span></h2>
        ${daftar.map(t => barisTask(t)).join('')}</section>`).join('');
    }

    const kunciGrup = j.kelompok === 'orang' ? x => I.orang(x.t.pic).pendek : x => (x.t.project ? asal(x.t) : 'Jalur Rutin');
    const grup = new Map();
    for (const x of isi) {
      const k = kunciGrup(x);
      if (!grup.has(k)) grup.set(k, []);
      grup.get(k).push(x);
    }
    const urutGrup = [...grup.keys()].sort((a, b) => (a === 'Jalur Rutin') - (b === 'Jalur Rutin') || a.localeCompare(b, 'id'));
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
    return kepala + `<div class="tl kartu-polos rapat">
        <div class="tl-kepala"><div class="tl-label-kosong"></div>
          <div class="tl-skala"><div class="tl-minggu">${minggu.join('')}</div>
            <div class="tl-hari">${hari.map(d => { const x = keDate(d); return `<span class="${d === h ? 'kini' : ''} ${x.getDay() % 6 === 0 ? 'libur' : ''}">${HURUF_HARI[x.getDay()]}<b>${x.getDate()}</b></span>`; }).join('')}</div></div>
        </div>
        ${baris}
      </div>
      ${isi.length > BATAS ? `<p class="hint" style="margin-top:8px">Menampilkan ${BATAS} dari ${isi.length} task. Persempit lingkupnya untuk melihat sisanya.</p>` : ''}`;
  }

  /* ---------- Kalender ---------- */

  const NAMA_HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  function viewKalender() {
    const k = S.kal;
    const h = hariIni();
    const bulan = k.bulan || h.slice(0, 7);
    const grid = I.gridBulan(bulan);
    const ids = I.lingkupOrang(S.me, k.lingkup);
    const per = new Map();
    for (const t of S.data.tasks) {
      if (!t.due || t.due < grid[0] || t.due > grid[grid.length - 1] || (ids && !ids.includes(t.pic))) continue;
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
    return `<div class="judul-halaman"><div><h1>Kalender</h1><p>Tenggat task per hari · ${dalamBulan} task bertenggat di ${esc(namaBulan(bulan))}</p></div>
        ${segmenLingkup('kal', k.lingkup)}</div>
      <div class="alat">
        <button type="button" class="ikon-tombol" data-aksi="kal-geser" data-n="-1" aria-label="Bulan sebelumnya">${ikon('kiri', 20)}</button>
        <strong class="kal-bulan">${esc(namaBulan(bulan))}</strong>
        <button type="button" class="ikon-tombol" data-aksi="kal-geser" data-n="1" aria-label="Bulan berikutnya">${ikon('kanan', 20)}</button>
        <button type="button" class="tombol kecil" data-aksi="kal-geser" data-n="0">Hari ini</button>
      </div>
      <div class="kal kartu-polos rapat">
        <div class="kal-kepala">${NAMA_HARI.map(x => `<span>${x}</span>`).join('')}</div>
        <div class="kal-grid">${sel}</div>
      </div>
      ${pilih ? `<section class="grup" style="margin-top:18px"><h2>Tenggat ${esc(fmtTanggalPanjang(pilih))} <span class="jumlah">${hariPilih.length}</span></h2>
        ${hariPilih.map(t => barisTask(t)).join('') || '<p class="hint">Tidak ada task bertenggat di hari ini.</p>'}</section>` : '<p class="hint" style="margin-top:14px">Pilih tanggal untuk melihat daftarnya.</p>'}`;
  }

  /* ---------- Proyek ADDIE ---------- */

  function viewProyek() {
    if (S.proyek && proyekDari(S.proyek)) return viewProyekDetail(proyekDari(S.proyek));
    const h = hariIni();
    const perId = I.indeks(S.data);
    const isM = I.orang(S.me).peran === 'manager';
    const semua = S.data.projects;
    const daftar = semua.filter(p => (S.proyekArsip ? p.arsip : !p.arsip));
    const ringkas = new Map(semua.map(p => [p.id, I.ringkasProyek(S.data, p, h, perId)]));
    const keputusan = I.antreKeputusan(S.data, h);
    const tinjau = S.data.tasks.filter(t => t.status === 'Ditinjau' && I.peninjau(t) === S.me);
    const ditahan = semua.filter(p => !p.arsip && p.decision === 'Hold');
    const nArsip = semua.filter(p => p.arsip).length;

    const baris = daftar.map(p => {
      const r = ringkas.get(p.id);
      return `<button type="button" class="baris-proyek" data-aksi="buka-proyek" data-id="${esc(p.id)}">
        <span class="baris-proyek-nama"><strong>${esc(p.name)}</strong><small>${esc(p.platform)} · Lead ${nama(p.lead)}${r.tenggat ? ' · tenggat ' + esc(fmtTanggal(r.tenggat)) : ''}</small></span>
        ${jalurMini(p)}
        <span class="baris-proyek-maju">${r.total ? `${r.selesai}/${r.total} task tahap ${esc(I.namaTahap(p.stage))}` : 'Belum ada task di tahap ini'}
          <span class="batang"><span style="width:${r.total ? Math.round(r.selesai / r.total * 100) : 0}%"></span></span></span>
        ${chipKeadaan(r.keadaan)}
      </button>`;
    }).join('');

    const kotakKeputusan = keputusan.map(p => {
      const r = ringkas.get(p.id);
      return `<div class="kotak-keputusan"><small>${esc(p.name)}</small>
        <strong>${p.stage === 'E' ? 'Evaluasi selesai. Mulai siklus berikutnya?' : `Lanjut ke ${esc(I.namaTahap(I.tahapBerikut(p.stage)))}?`}</strong>
        <small>Semua ${r.total} task tahap ${esc(I.namaTahap(p.stage))} selesai</small>
        ${isM ? `<div class="dua"><button type="button" class="tombol utama" data-aksi="majukan" data-id="${esc(p.id)}">Lanjut ke ${esc(I.namaTahap(I.tahapBerikut(p.stage)))}</button>
          <button type="button" class="tombol" data-aksi="tahan-proyek" data-id="${esc(p.id)}">Tahan</button></div>` : '<small>Menunggu keputusan Manager.</small>'}
      </div>`;
    }).join('');

    return `<div class="judul-halaman"><div><h1>Proyek ADDIE</h1>
        <p>${semua.length - nArsip} aktif · ${nArsip} arsip${keputusan.length ? ` · ${keputusan.length} menunggu keputusan` : ''}</p></div>
        <div class="segmen" role="group" aria-label="Tampilkan"><button type="button" data-aksi="proyek-arsip" data-nilai="0" aria-pressed="${!S.proyekArsip}">Aktif</button><button type="button" data-aksi="proyek-arsip" data-nilai="1" aria-pressed="${S.proyekArsip}">Arsip (${nArsip})</button></div>
        ${isM ? `<button type="button" class="tombol utama" data-aksi="proyek-baru">${ikon('tambah', 16)} Proyek baru</button>` : ''}
      </div>
      <div class="dua-kolom">
        <div class="kolom-utama"><div class="daftar-proyek">${baris || `<div class="kosong-isi">${S.proyekArsip ? 'Belum ada proyek arsip.' : 'Belum ada proyek aktif.'}</div>`}</div></div>
        <div class="samping-tumpuk kolom-sisi">
          <section class="kartu-polos samping-tumpuk"><p class="subjudul">Keputusan tahap ${keputusan.length ? `<span class="lencana">${keputusan.length}</span>` : ''}</p>
            ${kotakKeputusan || '<p class="hint">Belum ada proyek yang semua task tahapnya selesai. Proyek muncul di sini begitu siap maju.</p>'}</section>
          ${tinjau.length ? `<section class="kartu-polos samping-tumpuk"><p class="subjudul">Menunggu tinjauan Anda <span class="lencana">${tinjau.length}</span></p>
            <div class="grup">${tinjau.map(t => barisTask(t, 'Dari ' + I.orang(t.pic).pendek)).join('')}</div></section>` : ''}
          ${ditahan.length ? `<section class="kartu-polos samping-tumpuk"><p class="subjudul">Ditahan</p>${ditahan.map(p => `<div class="kotak-keputusan"><strong>${esc(p.name)}</strong>
            ${isM ? `<div class="dua"><button type="button" class="tombol" data-aksi="lanjutkan-proyek" data-id="${esc(p.id)}">Lanjutkan proyek</button></div>` : ''}</div>`).join('')}</section>` : ''}
        </div>
      </div>`;
  }

  function viewProyekDetail(p) {
    const h = hariIni();
    const isM = I.orang(S.me).peran === 'manager';
    const bolehTambah = I.bolehBuatTask(S.me);
    const r = I.ringkasProyek(S.data, p, h);
    const milik = S.data.tasks.filter(t => t.project === p.id);
    const perId = I.indeks(S.data);
    const berikut = I.namaTahap(I.tahapBerikut(p.stage));

    let gerbang;
    if (p.arsip) {
      gerbang = `<div class="banner biru">Proyek ini diarsipkan.</div>${isM ? '<div class="detail-aksi"><button type="button" class="tombol" data-aksi="arsip-proyek" data-nilai="0">Aktifkan lagi</button></div>' : ''}`;
    } else if (p.decision === 'Hold') {
      gerbang = `<div class="banner kuning">Proyek ditahan.</div>${isM ? `<div class="detail-aksi"><button type="button" class="tombol" data-aksi="lanjutkan-proyek" data-id="${esc(p.id)}">Lanjutkan proyek</button></div>` : ''}`;
    } else if (r.siapMaju) {
      gerbang = `<div class="banner biru">Semua ${r.total} task tahap ${esc(I.namaTahap(p.stage))} selesai.${isM ? '' : ' Menunggu keputusan Manager.'}</div>
        ${isM ? `<div class="detail-aksi"><button type="button" class="tombol utama" data-aksi="majukan" data-id="${esc(p.id)}">${p.stage === 'E' ? 'Mulai siklus berikutnya' : 'Lanjut ke ' + esc(berikut)}</button>
          <button type="button" class="tombol" data-aksi="tahan-proyek" data-id="${esc(p.id)}">Tahan</button></div>` : ''}`;
    } else if (!r.total) {
      gerbang = `<div class="banner kuning">Belum ada task di tahap ${esc(I.namaTahap(p.stage))}.</div>`;
    } else {
      gerbang = `<p class="hint">${r.selesai} dari ${r.total} task tahap ${esc(I.namaTahap(p.stage))} selesai${r.telat ? ` · ${r.telat} terlambat` : ''}${r.tertahan ? ` · ${r.tertahan} tertahan` : ''}. Proyek bisa maju ke ${esc(berikut)} setelah semuanya selesai.</p>`;
    }

    const urutan = [p.stage, ...I.TAHAP.map(x => x.id).filter(x => x !== p.stage)];
    const bagian = urutan.map(st => {
      const isi = milik.filter(t => t.stage === st).sort((a, b) => (I.selesai(a) - I.selesai(b)) || (a.due || '9999').localeCompare(b.due || '9999'));
      if (!isi.length && st !== p.stage) return '';
      const aktif = isi.filter(I.aktif).length;
      return `<details class="tahap-bagian" ${st === p.stage ? 'open' : ''}>
        <summary><span class="huruf-tahap">${st}</span> ${esc(I.namaTahap(st))} <span class="pesan-info">· ${isi.length} task${aktif ? `, ${aktif} aktif` : ''}</span>${st === p.stage ? ' <span class="pill st-dikerjakan">Tahap sekarang</span>' : ''}</summary>
        <div class="grup">${isi.map(t => barisTask(t, I.aktif(t) ? I.alasanTunggu(t, perId) : '')).join('') || '<p class="hint">Belum ada task.</p>'}
          ${bolehTambah && !p.arsip ? `<button type="button" class="tombol kecil" data-aksi="tambah-task" data-proyek="${esc(p.id)}" data-tahap="${st}">${ikon('tambah', 16)} Tambah task di ${esc(I.namaTahap(st))}</button>` : ''}
        </div>
      </details>`;
    }).join('');

    return `<button type="button" class="kembali" data-aksi="tutup-proyek">${ikon('kiri', 18)} Semua proyek</button>
      <div class="dua-kolom" style="margin-top:8px">
        <div class="kolom-utama">
          <div class="kepala-proyek kartu-polos">
            <div><p class="detail-asal">${esc(p.platform)} · Lead ${nama(p.lead)} · Siklus ${p.cycle || 1} · ${esc(p.id)}</p>
              <h1 class="judul-besar">${esc(p.name)}</h1>
              ${p.goal ? `<p class="teks-panjang" style="margin-top:8px">${esc(p.goal)}</p>` : ''}</div>
            ${jalurTahap(p)}
            ${gerbang}
            <div class="detail-aksi"><button type="button" class="tombol kecil" data-aksi="papan-proyek" data-id="${esc(p.id)}">${ikon('kolom', 16)} Buka di kanban</button>
              ${isM && !p.arsip && r.semua && r.semua === r.semuaSelesai ? '<button type="button" class="tombol kecil" data-aksi="arsip-proyek" data-nilai="1">Arsipkan proyek</button>' : ''}</div>
          </div>
          ${bagian}
        </div>
        <div class="samping-tumpuk kolom-sisi">
          <section class="kartu-polos samping-tumpuk"><p class="subjudul">Ringkasan</p>
            <p class="hint">${r.semuaSelesai} dari ${r.semua} task selesai di semua tahap.</p>
            ${r.tenggat ? `<p class="hint">Tenggat task aktif terjauh: ${esc(fmtTanggal(r.tenggat))}.</p>` : ''}
          </section>
          ${(p.history || []).length ? `<section class="kartu-polos samping-tumpuk"><p class="subjudul">Riwayat tahap</p><ul class="riwayat">${p.history.map(x => `
            <li>${esc(I.namaTahap(x.dari))} → <strong>${esc(I.namaTahap(x.ke))}</strong> oleh ${nama(x.oleh)} <small>· ${esc(relatif(x.at))}</small></li>`).join('')}</ul></section>` : ''}
        </div>
      </div>`;
  }

  /* ---------- Rancangan Paket ---------- */

  const LABEL_TARGET = { penuh: () => 'terpenuhi', lebih: h => 'lebih ' + fmtAngka(h.lebih), sebagian: h => 'kurang ' + fmtAngka(h.sisa), belum: () => 'belum digarap' };
  const pilTarget = h => `<span class="pill tg-${h.status}">${esc(LABEL_TARGET[h.status](h))}</span>`;
  const judulPaket = p => p.namaPaket || p.program || p.id;

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
      const r = I.ringkasPaket(p);
      const perKat = I.KATEGORI_PAKET.map(([l]) => [l, p.items.filter(i => i.kategori === l).length]).filter(([, n]) => n);
      return `<button type="button" class="kartu-paket" data-aksi="paket-buka" data-id="${esc(p.id)}">
        <span class="kartu-paket-atas"><span class="chip-platform">${esc(p.platform || '—')}</span>${p.mirror ? '<span class="pill kd-aman">Dibagikan</span>' : ''}<small>${esc(p.id)}</small></span>
        <strong>${esc(judulPaket(p))}</strong>
        ${p.program && p.namaPaket ? `<span class="kartu-paket-program">${esc(p.program)}</span>` : ''}
        <span class="kartu-paket-maju"><span class="batang"><span style="width:${r.persen}%"></span></span><small>${r.target ? `${fmtAngka(r.terpenuhi)}/${fmtAngka(r.target)} target · ${r.persen}%` : 'Belum ada target'}</small></span>
        ${perKat.length ? `<span class="kartu-paket-kat">${perKat.map(([l, n]) => `<span>${esc(l)} <b>${n}</b></span>`).join('')}</span>` : ''}
        <span class="kartu-paket-bawah">${p.produkPic ? `${avatar(p.produkPic, 'kecil')} ${nama(p.produkPic)}` : '<span class="hint">PIC produk belum diisi</span>'}${p.updatedAt ? `<small>· ${esc(relatif(p.updatedAt))}</small>` : ''}</span>
      </button>`;
    }).join('')}</div>`;
  }

  function tabelTarget(items) {
    let grupAkhir = null;
    const baris = items.map(it => {
      const h = I.hitungTarget(it);
      const g = String(it.grup || '').trim();
      const kepala = g && g !== grupAkhir ? `<tr class="baris-grup"><td colspan="5">${esc(g)}</td></tr>` : '';
      grupAkhir = g;
      return `${kepala}<tr><td>${esc(it.nama || '—')}${it.catatan ? `<small class="sel-catatan">${esc(it.catatan)}</small>` : ''}</td>
        <td class="angka">${fmtAngka(h.terpenuhi)}</td><td class="angka">${fmtAngka(h.target)}</td><td>${esc(it.satuan)}</td><td>${pilTarget(h)}</td></tr>`;
    }).join('');
    return `<div class="tabel-gulir"><table class="tabel tabel-target"><thead><tr><th>Target</th><th class="angka">Sudah ada</th><th class="angka">Target</th><th>Satuan</th><th>Status</th></tr></thead><tbody>${baris}</tbody></table></div>`;
  }

  function viewPaketDetail(p) {
    const r = I.ringkasPaket(p);
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
        ${items.length ? tabelTarget(items) : ''}
      </section>`;
    }).join('');
    const tautan = p.links.filter(l => tautanAman(l.url));
    return `<button type="button" class="kembali" data-aksi="paket-tutup">${ikon('kiri', 18)} Semua paket</button>
      <div class="kepala-proyek kartu-polos" style="margin-top:8px">
        <div><p class="detail-asal">${esc(p.platform || 'Tanpa platform')} · ${esc(p.id)}${p.mirror ? ' · <span class="pill kd-aman">Dibagikan ke Lintas Divisi</span>' : ''}</p>
          <h1 class="judul-besar">${esc(judulPaket(p))}</h1>
          ${p.program ? `<p class="teks-panjang" style="margin-top:4px">${esc(p.program)}</p>` : ''}
          <p class="detail-orang" style="margin-top:8px">${p.produkPic ? `${avatar(p.produkPic, 'kecil')} PIC produk ${nama(p.produkPic)}` : 'PIC produk belum diisi'}${p.updatedAt ? ` · diperbarui ${esc(relatif(p.updatedAt))}${p.updatedBy ? ' oleh ' + nama(p.updatedBy) : ''}` : ''}</p></div>
        <div class="detail-aksi tanpa-regang">
          ${boleh ? `<button type="button" class="tombol utama" data-aksi="paket-ubah">${ikon('sunting', 16)} Ubah rancangan</button>` : ''}
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
          <section class="kartu-polos samping-tumpuk"><p class="subjudul">Ringkasan target</p>
            ${r.jumlah ? `<div class="kartu-paket-maju"><span class="batang"><span style="width:${r.persen}%"></span></span><small>${fmtAngka(r.terpenuhi)} dari ${fmtAngka(r.target)} · ${r.persen}%</small></div>
              <p class="hint">${r.penuh} terpenuhi · ${r.kurang} kurang · ${r.lebih} lebih</p>` : '<p class="hint">Belum ada target.</p>'}
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
  function selPaket(p, kategori) {
    const items = p.items.filter(x => x.kategori === kategori);
    const baris = [];
    let grupAkhir = null;
    for (const it of items) {
      const g = String(it.grup || '').trim();
      if (g !== grupAkhir) { if (baris.length) baris.push(''); if (g) baris.push(g); grupAkhir = g; }
      const h = I.hitungTarget(it);
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
    const sel = p => [p.platform || '', ...I.KATEGORI_PAKET.map(([l]) => selPaket(p, l)), String(p.catatan || '')];
    const tsv = v => (/["\t\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v);
    const teks = [KOLOM.join('\t'), ...daftar.map(p => sel(p).map(tsv).join('\t'))].join('\n');
    const html = `<table><tr>${KOLOM.map(k => `<th>${esc(k)}</th>`).join('')}</tr>${daftar.map(p => `<tr>${sel(p).map(v => `<td>${esc(v).split('\n').join('<br>')}</td>`).join('')}</tr>`).join('')}</table>`;
    salinKeKlip(teks, html, `${daftar.length} paket disalin. Tempel (Ctrl+V) di sheet Marsel.`);
  }

  /* ---------- Komunikasi ---------- */

  function viewKomunikasi() {
    const k = S.kom;
    const t = k.pilih && S.data.tasks.find(x => x.id === k.pilih);
    const manager = I.orang(S.me).peran === 'manager';
    const opsi = [['terlibat', 'Saya terlibat'], ...(manager ? [] : [['tim', 'Tim saya']]), ['semua', 'Semua']];
    return `<div class="judul-halaman"><div><h1>Komunikasi</h1><p>Diskusi per task. Utas yang belum Anda baca muncul paling atas.</p></div></div>
      <div class="kom ${t ? 'buka-obrolan' : ''}">
        <section class="kom-daftar kartu-polos rapat">
          <div class="kom-alat">
            ${kotakCari('komunikasi', k.q, 'Cari task untuk didiskusikan…')}
            <div class="segmen" role="group" aria-label="Lingkup">${opsi.map(([v, l]) => `<button type="button" data-aksi="atur" data-ruang="kom" data-kunci="lingkup" data-nilai="${v}" aria-pressed="${k.lingkup === v}">${l}</button>`).join('')}</div>
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

  /* ---------- Link Saya ---------- */

  function viewLink() {
    const milik = S.data.links.filter(l => l.user === S.me);
    const folder = [...new Set(milik.map(l => l.folder).filter(Boolean))].sort();
    return `<div class="judul-halaman"><div><h1>Link Saya</h1><p>Link kerja pribadi ${esc(I.orang(S.me).pendek)} · ${milik.length} link</p></div></div>
      <form class="kartu-polos form-tambah" data-form="link-tambah" novalidate>
        <label class="isian">Judul <input name="title" maxlength="200" placeholder="mis. Bank soal TIU"></label>
        <label class="isian lebar">Alamat (URL) <input name="url" required maxlength="2000" inputmode="url" placeholder="https://docs.google.com/…"></label>
        <label class="isian">Folder <input name="folder" maxlength="80" list="folder-link" placeholder="Umum"></label>
        <datalist id="folder-link">${folder.map(f => `<option value="${esc(f)}">`).join('')}</datalist>
        <button class="tombol utama">${ikon('tambah', 16)} Tambah link</button>
      </form>
      <div class="alat">${kotakCari('link', S.lnk.q, 'Cari judul, alamat, folder…')}</div>
      <div id="hasil">${hasilLink()}</div>`;
  }

  function alatFolder(jenis, folder) {
    if (folder === I.FOLDER_UMUM) return '';
    return `<span class="folder-alat">
      <button type="button" class="ikon-tombol" data-aksi="folder-ganti" data-jenis="${jenis}" data-folder="${esc(folder)}" aria-label="Ganti nama folder ${esc(folder)}" title="Ganti nama folder">${ikon('sunting', 16)}</button>
      <button type="button" class="ikon-tombol" data-aksi="folder-hapus" data-jenis="${jenis}" data-folder="${esc(folder)}" aria-label="Hapus folder ${esc(folder)}" title="Hapus folder (isinya pindah ke Umum)">${ikon('hapus', 16)}</button>
    </span>`;
  }

  function kartuLink(l) {
    return `<div class="kartu-link">
      <a href="${tautanAman(l.url) ? esc(l.url) : '#'}" target="_blank" rel="noopener noreferrer" data-link="${esc(l.id)}">
        <span class="link-ikon">${ikon('tautan', 18)}</span>
        <span class="link-teks"><strong>${esc(l.title)}</strong><small>${esc(namaSitus(l.url))}</small></span>
      </a>
      <span class="link-alat">
        <button type="button" class="ikon-tombol" data-aksi="link-ubah" data-id="${esc(l.id)}" aria-label="Ubah ${esc(l.title)}" title="Ubah">${ikon('sunting', 16)}</button>
        <button type="button" class="ikon-tombol" data-aksi="link-pindah" data-id="${esc(l.id)}" aria-label="Pindah folder ${esc(l.title)}" title="Pindah folder">${ikon('pindah', 16)}</button>
        <button type="button" class="ikon-tombol" data-aksi="link-hapus" data-id="${esc(l.id)}" aria-label="Hapus ${esc(l.title)}" title="Hapus">${ikon('hapus', 16)}</button>
      </span>
    </div>`;
  }

  function hasilLink() {
    const kata = S.lnk.q.trim().toLowerCase();
    let milik = S.data.links.filter(l => l.user === S.me);
    if (kata) milik = milik.filter(l => [l.title, l.url, l.folder].join(' ').toLowerCase().includes(kata));
    if (!milik.length) return `<div class="kosong-isi">${kata ? 'Tidak ada link yang cocok.' : 'Belum ada link. Tambahkan di atas.'}</div>`;
    const klik = petaKlik();
    const sering = kata ? [] : milik.filter(l => klik[l.id]).sort((a, b) => klik[b.id] - klik[a.id]).slice(0, 6);
    return (sering.length ? `<section class="grup-folder"><h2>${ikon('kilat', 18)} Sering dibuka <small>dihitung di perangkat ini</small></h2>
        <div class="grid-link">${sering.map(kartuLink).join('')}</div></section>` : '')
      + I.kelompokFolder(milik).map(g => `<section class="grup-folder">
        <h2>${ikon('folder', 18)} ${esc(g.folder)} <span class="jumlah">${g.isi.length}</span>${alatFolder('links', g.folder)}</h2>
        <div class="grid-link">${g.isi.slice().sort((a, b) => a.title.localeCompare(b.title, 'id')).map(kartuLink).join('')}</div>
      </section>`).join('');
  }

  /* ---------- Catatan Saya ---------- */

  function viewCatatan() {
    const milik = S.data.notes.filter(n => n.user === S.me);
    const folder = [...new Set(milik.map(n => n.folder).filter(Boolean))].sort();
    return `<div class="judul-halaman"><div><h1>Catatan Saya</h1><p>Catatan pribadi ${esc(I.orang(S.me).pendek)} · ${milik.length} catatan</p></div></div>
      <form class="kartu-polos form-catatan" data-form="catatan-tambah" novalidate>
        <div class="dua-isian">
          <label class="isian">Judul <input name="title" maxlength="200" placeholder="mis. Hasil rapat Senin"></label>
          <label class="isian">Folder <input name="folder" maxlength="80" list="folder-catatan" placeholder="Umum"></label>
        </div>
        <datalist id="folder-catatan">${folder.map(f => `<option value="${esc(f)}">`).join('')}</datalist>
        <label class="isian">Isi <textarea name="body" maxlength="20000" placeholder="Tulis catatan…"></textarea></label>
        <div class="modal-kaki"><button class="tombol utama">${ikon('tambah', 16)} Simpan catatan</button></div>
      </form>
      <div class="alat">${kotakCari('catatan', S.ctt.q, 'Cari judul, isi, folder…')}</div>
      <div id="hasil">${hasilCatatan()}</div>`;
  }

  function hasilCatatan() {
    const kata = S.ctt.q.trim().toLowerCase();
    let milik = S.data.notes.filter(n => n.user === S.me);
    if (kata) milik = milik.filter(n => [n.title, n.body, n.folder].join(' ').toLowerCase().includes(kata));
    if (!milik.length) return `<div class="kosong-isi">${kata ? 'Tidak ada catatan yang cocok.' : 'Belum ada catatan. Tulis di atas lalu simpan.'}</div>`;
    return I.kelompokFolder(milik).map(g => `<section class="grup-folder">
        <h2>${ikon('folder', 18)} ${esc(g.folder)} <span class="jumlah">${g.isi.length}</span>${alatFolder('notes', g.folder)}</h2>
        <div class="grid-catatan">${g.isi.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).map(n => {
          const utuh = S.ctt.buka === n.id;
          const panjang = String(n.body || '').length > 360 || String(n.body || '').split('\n').length > 8;
          return `<article class="kartu-catatan ${utuh ? 'utuh' : ''}">
            <h3>${esc(n.title || '(tanpa judul)')}</h3>
            ${n.body ? `<p class="teks-panjang">${esc(n.body)}</p>` : ''}
            ${panjang ? `<button type="button" class="tautan-kecil" data-aksi="catatan-buka" data-id="${esc(n.id)}">${utuh ? 'Ringkas' : 'Baca selengkapnya'}</button>` : ''}
            <footer><small>${esc(relatif(n.updatedAt))}</small><span class="spasi"></span>
              <button type="button" class="ikon-tombol" data-aksi="catatan-ubah" data-id="${esc(n.id)}" aria-label="Ubah catatan" title="Ubah">${ikon('sunting', 16)}</button>
              <button type="button" class="ikon-tombol" data-aksi="catatan-hapus" data-id="${esc(n.id)}" aria-label="Hapus catatan" title="Hapus">${ikon('hapus', 16)}</button></footer>
          </article>`;
        }).join('')}</div>
      </section>`).join('');
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

  /* ---------- Modal & formulir ---------- */

  const KATEGORI = ['Operasional', 'QC', 'Develop Konten', 'Manajemen Sistem', 'Kreatif', 'Manajemen Guru', 'Data & Intelligence', 'RnD', 'Umum'];
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
  }
  const kakiModal = tombol => `<p id="galat-modal" class="pesan-galat" role="alert" hidden></p>
      <div class="modal-kaki"><button type="button" class="tombol" data-aksi="tutup-modal">Batal</button><button class="tombol utama">${esc(tombol)}</button></div>`;

  function formTask(t, preset = {}) {
    const ubah = !!t;
    const nilai = t || {};
    const pics = [...new Set([...I.picBoleh(S.me), ...(t ? [t.pic] : [])])];
    const proyekAktif = S.data.projects.filter(p => !p.arsip);
    const pProyek = preset.proyek || (proyekAktif[0] || {}).id || '';
    const jalur = preset.jalur || (preset.proyek ? 'proyek' : proyekAktif.length ? 'proyek' : 'rutin');
    const tahapAwal = preset.tahap || ((proyekDari(pProyek) || {}).stage || 'A');
    return `<form data-form="modal" novalidate>
      <h2>${ubah ? 'Ubah task' : 'Tambah task'}</h2>
      <label class="isian">Judul task <input name="title" required maxlength="200" value="${esc(nilai.title || '')}" placeholder="mis. QC output paket TO 3"></label>
      ${ubah ? `<p class="hint">${t.project ? 'Proyek: ' + esc(asal(t)) + ' · tahap ' + esc(I.namaTahap(t.stage)) : 'Jalur Rutin · ' + esc(t.kategori)}</p>` : `
      <div class="isian"><span>Jalur</span>
        <div class="segmen" role="group" aria-label="Jalur">
          <button type="button" data-aksi="pilih-jalur" data-jalur="proyek" aria-pressed="${jalur === 'proyek'}" ${proyekAktif.length ? '' : 'disabled'}>Proyek (ADDIE)</button>
          <button type="button" data-aksi="pilih-jalur" data-jalur="rutin" aria-pressed="${jalur === 'rutin'}">Rutin</button>
        </div>
        <small>Proyek: punya tahap ADDIE dan ditinjau sebelum selesai. Rutin: pekerjaan di luar proyek, langsung selesai.</small>
      </div>
      <input type="hidden" name="jalur" value="${jalur}">
      <div class="dua-isian" data-bagian="proyek" ${jalur === 'proyek' ? '' : 'hidden'}>
        <label class="isian">Proyek <select name="project">${opsiHtml(proyekAktif.map(p => [p.id, p.name]), pProyek)}</select></label>
        <label class="isian">Tahap <select name="stage">${opsiHtml(I.TAHAP.map(x => [x.id, x.nama]), tahapAwal)}</select></label>
      </div>
      <label class="isian" data-bagian="rutin" ${jalur === 'rutin' ? '' : 'hidden'}>Kategori <select name="kategori">${opsiHtml(KATEGORI.map(k => [k, k]), 'Operasional')}</select></label>`}
      <div class="dua-isian">
        <label class="isian">PIC <select name="pic">${opsiHtml(pics.map(id => [id, I.orang(id).nama]), nilai.pic || pics[0])}</select></label>
        <label class="isian">Tenggat <input type="date" name="due" value="${esc(nilai.due || '')}"></label>
      </div>
      <div class="dua-isian">
        <label class="isian">Prioritas <select name="priority">${opsiHtml(PRIORITAS, nilai.priority || 'Normal')}</select></label>
        <label class="isian">Output <input name="output" maxlength="200" value="${esc(nilai.output || '')}" placeholder="mis. 40 soal lolos QC"></label>
      </div>
      <label class="isian">Keterangan <textarea name="detail" maxlength="4000">${esc(nilai.detail || '')}</textarea></label>
      ${kakiModal(ubah ? 'Simpan' : 'Tambah task')}
    </form>`;
  }

  function formProyek() {
    const lead = I.ORANG.filter(o => o.peran !== 'staff');
    return `<form data-form="modal" novalidate>
      <h2>Proyek baru</h2>
      <label class="isian">Nama proyek <input name="name" required maxlength="200" placeholder="mis. PCPM Tahap III · 10 TO"></label>
      <div class="dua-isian">
        <label class="isian">Platform <select name="platform">${PLATFORM.map(x => `<option>${esc(x)}</option>`).join('')}</select></label>
        <label class="isian">Lead <select name="lead">${lead.map(o => `<option value="${o.id}">${esc(o.nama)}</option>`).join('')}</select></label>
      </div>
      <label class="isian">Tujuan <textarea name="goal" maxlength="2000" placeholder="Apa yang ingin dicapai proyek ini?"></textarea></label>
      <p class="hint">Proyek baru mulai di tahap Analysis.</p>
      ${kakiModal('Buat proyek')}
    </form>`;
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

  function formLink(l) {
    const folder = [...new Set(S.data.links.filter(x => x.user === S.me).map(x => x.folder).filter(Boolean))].sort();
    return `<form data-form="modal" novalidate>
      <h2>Ubah link</h2>
      <label class="isian">Judul <input name="title" maxlength="200" value="${esc(l.title)}"></label>
      <label class="isian">Alamat (URL) <input name="url" required maxlength="2000" inputmode="url" value="${esc(l.url)}"></label>
      <label class="isian">Folder <input name="folder" maxlength="80" list="folder-link-modal" value="${esc(l.folder)}" placeholder="Umum"></label>
      <datalist id="folder-link-modal">${folder.map(f => `<option value="${esc(f)}">`).join('')}</datalist>
      ${kakiModal('Simpan')}
    </form>`;
  }

  function formNote(n) {
    const folder = [...new Set(S.data.notes.filter(x => x.user === S.me).map(x => x.folder).filter(Boolean))].sort();
    return `<form data-form="modal" novalidate>
      <h2>Ubah catatan</h2>
      <label class="isian">Judul <input name="title" maxlength="200" value="${esc(n.title)}"></label>
      <label class="isian">Isi <textarea name="body" maxlength="20000" rows="12">${esc(n.body)}</textarea></label>
      <label class="isian">Folder <input name="folder" maxlength="80" list="folder-catatan-modal" value="${esc(n.folder)}" placeholder="Umum"></label>
      <datalist id="folder-catatan-modal">${folder.map(f => `<option value="${esc(f)}">`).join('')}</datalist>
      ${kakiModal('Simpan')}
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
      <h2>${d ? 'Ubah dashboard' : 'Tambah dashboard'}</h2>
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
          const t = I.taskBaru(S.data, {
            title: f.title, project: f.jalur === 'proyek' ? f.project : '', stage: f.stage, kategori: f.kategori,
            pic: f.pic, due: f.due, priority: f.priority, output: f.output, detail: f.detail,
          }, S.me, waktu, hariIni());
          tutupModal();
          S.pilih = t.id;
          return selesaiUbah(`${t.id} ditambahkan untuk ${I.orang(t.pic).pendek}.`);
        }
        case 'ubah': {
          const t = S.data.tasks.find(x => x.id === m.id);
          if (!String(f.title || '').trim()) throw new Error('Judul task wajib diisi.');
          Object.assign(t, { title: f.title.trim(), pic: f.pic, due: f.due, priority: f.priority, output: f.output.trim(), detail: f.detail.trim(), updatedAt: waktu });
          t.support = t.support.filter(x => x !== t.pic);
          I.catatLog(S.data, 'update', `${t.id} · ${t.title}`, 'Detail task diubah', S.me, waktu);
          tutupModal();
          return selesaiUbah('Task disimpan.');
        }
        case 'proyek': {
          const p = I.proyekBaru(S.data, f, S.me, waktu);
          tutupModal();
          S.view = 'proyek';
          S.proyek = p.id;
          return selesaiUbah(`${p.name} dibuat di tahap Analysis.`);
        }
        case 'catatan': {
          const t = S.data.tasks.find(x => x.id === m.id);
          I.terapkanAksi(S.data, t, m.kunci, S.me, waktu, f.catatan);
          tutupModal();
          return selesaiUbah(m.kunci === 'kembalikan' ? `Dikembalikan ke ${I.orang(t.pic).pendek}.` : 'Ditandai tertahan.');
        }
        case 'paket-baru': {
          const p = I.paketBaru(S.data, f, S.me, waktu);
          tutupModal();
          Object.assign(S.pkt, { pilih: p.id, sunting: true });
          return selesaiUbah(`${p.namaPaket} dibuat. Isi produk dan targetnya.`);
        }
        case 'link':
          I.simpanLink(S.data, S.me, f, m.id, waktu);
          tutupModal();
          return selesaiUbah('Link disimpan.');
        case 'link-pindah': {
          const l = S.data.links.find(x => x.id === m.id);
          I.simpanLink(S.data, S.me, { ...l, folder: f.nilai }, m.id, waktu);
          tutupModal();
          return selesaiUbah(`Dipindah ke ${f.nilai.trim() || I.FOLDER_UMUM}.`);
        }
        case 'note':
          I.simpanCatatan(S.data, S.me, f, m.id, waktu);
          tutupModal();
          return selesaiUbah('Catatan disimpan.');
        case 'folder-ganti': {
          const n = I.gantiNamaFolder(S.data[m.daftar], S.me, m.folder, f.nilai);
          tutupModal();
          return selesaiUbah(`Folder diganti nama (${n} isi).`);
        }
        case 'dashboard':
          I.simpanDashboard(S.data, S.me, f, m.id, waktu);
          tutupModal();
          return selesaiUbah('Dashboard disimpan.');
      }
    } catch (e) {
      galatModal(e.message);
    }
  }

  function selesaiUbah(pesan) {
    simpanData();
    render();
    if (pesan) toast(pesan);
  }

  const PESAN_AKSI = {
    mulai: 'Mulai dikerjakan.', ajukan: 'Diajukan untuk ditinjau.', selesai: 'Selesai. Mantap!', setujui: 'Disetujui dan selesai.',
    tarik: 'Ditarik dari tinjauan.', buka: 'Dibuka kembali.', lanjutkan: 'Tanda tertahan dilepas.',
  };

  function jalankanAksi(t, kunci) {
    const a = I.aksiUntuk(t, S.me, I.indeks(S.data)).find(x => x.kunci === kunci);
    if (a && a.perluCatatan) return mintaCatatan(t, kunci);
    try {
      I.terapkanAksi(S.data, t, kunci, S.me, Date.now());
      selesaiUbah(PESAN_AKSI[kunci]);
    } catch (e) {
      toast(e.message, true);
    }
  }

  /* ---------- Pencarian di bilah atas ---------- */

  function renderCariHasil() {
    const wadah = $('#cari-hasil');
    if (!wadah) return;
    const hasil = I.cari(S.data, S.cari, 8);
    if (!S.cari.trim()) { wadah.hidden = true; return; }
    wadah.innerHTML = hasil.map(t => `<button type="button" data-aksi="buka-task" data-id="${esc(t.id)}"><span>${esc(t.title)}</span>
      <small>${esc(t.id)} · ${esc(t.status)} · ${nama(t.pic)} · ${esc(asal(t))}</small></button>`).join('')
      + (hasil.length ? `<button type="button" class="cari-semua" data-aksi="cari-semua">Lihat semua hasil di Task List ${ikon('kanan', 14)}</button>` : '<p class="hint" style="padding:8px 10px;margin:0">Tidak ada yang cocok.</p>');
    wadah.hidden = false;
  }

  /* ---------- Peristiwa ---------- */

  function bukaTask(id) {
    S.pilih = id;
    S.cari = '';
    const t = S.data.tasks.find(x => x.id === id);
    if (t) tandaiDibaca(t);
    render();
  }

  function aturNilai(ruang, kunci, nilai) {
    S[ruang][kunci] = nilai;
    if (ruang === 'daftar') S.daftar.hal = 1;
    if (ruang === 'lap' && kunci !== 'buka') S.lap.buka = '';
    if (ruang === 'kom' && kunci === 'lingkup') S.kom.pilih = null;
    if (ruang === 'rwy') S.rwy.batas = 100;
    simpanPref(ruang);
    render();
  }

  document.addEventListener('click', e => {
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
      case 'ke-cari':
        pindahHalaman('daftar');
        setTimeout(() => { const c = $('[data-cari="daftar"]'); if (c) c.focus(); }, 30);
        break;
      case 'cari-semua':
        Object.assign(S.daftar, { q: S.cari, status: '', jalur: '', proyek: '', platform: '', lingkup: I.orang(S.me).peran === 'manager' ? 'tim' : 'semua', hal: 1 });
        S.cari = '';
        pindahHalaman('daftar');
        break;
      case 'buka-task': if (t) bukaTask(t.id); break;
      case 'tutup-detail': S.pilih = null; render(); break;
      case 'aksi-task': if (t) jalankanAksi(t, d.kunci); break;
      case 'ubah-task': if (t) bukaModal({ jenis: 'ubah', id: t.id }, formTask(t)); break;
      case 'tambah-task':
        if (!I.bolehBuatTask(S.me)) return toast('Staff menerima task dari Lead. Minta Lead Anda menambahkannya.', true);
        bukaModal({ jenis: 'tambah' }, formTask(null, { proyek: d.proyek, tahap: d.tahap }));
        break;
      case 'pilih-jalur': {
        const form = el.closest('form');
        form.jalur.value = d.jalur;
        form.querySelectorAll('[data-aksi="pilih-jalur"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.jalur === d.jalur)));
        form.querySelectorAll('[data-bagian]').forEach(b => { b.hidden = b.dataset.bagian !== d.jalur; });
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
        S.papan.lingkup = 'tim';
        simpanPref('papan');
        Object.assign(S.kom, { pilih: null });
        Object.assign(S.pkt, { pilih: null, sunting: false, kotor: false });
        masukApp();
        toast(`Masuk sebagai ${I.orang(S.me).pendek} (${I.PERAN[I.orang(S.me).peran]}).`);
        break;
      case 'muat-ulang':
        if (!bolehTinggalkanPaket()) return;
        S.navBuka = false;
        if (!confirm('Muat ulang data contoh dari server? Semua perubahan di browser ini (task, paket, link, catatan) akan diganti.')) return render();
        hapus('data');
        S.pilih = null;
        muat();
        break;
      case 'keluar':
        S.navBuka = false;
        api('keluar').then(() => tampilKunci('Anda sudah keluar. Masukkan PIN untuk masuk lagi.', false));
        break;
      case 'coba-muat': muat(); break;
      case 'atur': aturNilai(d.ruang, d.kunci, d.nilai); break;
      case 'fokus-papan':
        Object.assign(S.papan, { fokus: d.fokus, lingkup: 'tim', kelompok: 'status' });
        simpanPref('papan');
        pindahHalaman('kanban');
        break;
      case 'papan-bersih':
        Object.assign(S.papan, { proyek: '', jalur: '', platform: '', fokus: '' });
        simpanPref('papan');
        render();
        break;
      case 'papan-proyek':
        Object.assign(S.papan, { proyek: d.id, jalur: '', platform: '', fokus: '', lingkup: I.orang(S.me).peran === 'manager' ? 'tim' : 'semua' });
        simpanPref('papan');
        pindahHalaman('kanban');
        break;
      case 'daftar-status':
        Object.assign(S.daftar, { status: d.status, q: '', hal: 1, lingkup: S.papan.lingkup, proyek: S.papan.proyek, jalur: S.papan.jalur, platform: S.papan.platform });
        simpanPref('daftar');
        pindahHalaman('daftar');
        break;
      case 'daftar-urut':
        if (S.daftar.urut === d.kunci) S.daftar.arah = S.daftar.arah === -1 ? 1 : -1;
        else Object.assign(S.daftar, { urut: d.kunci, arah: 1 });
        simpanPref('daftar');
        $('#hasil').innerHTML = hasilDaftar();
        break;
      case 'daftar-hal':
        S.daftar.hal += Number(d.n);
        $('#hasil').innerHTML = hasilDaftar();
        $('#hasil').scrollIntoView({ block: 'start' });
        break;
      case 'ekspor': eksporCsv(I.daftarTask(S.data, saringanDaftar(), hariIni())); break;
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
      case 'buka-proyek': S.proyek = d.id; S.pilih = null; S.view = 'proyek'; simpan('halaman', 'proyek'); render(); window.scrollTo(0, 0); break;
      case 'tutup-proyek': S.proyek = null; render(); break;
      case 'proyek-arsip': S.proyekArsip = d.nilai === '1'; render(); break;
      case 'proyek-baru': bukaModal({ jenis: 'proyek' }, formProyek()); break;
      case 'majukan': case 'tahan-proyek': case 'lanjutkan-proyek': {
        const p = proyekDari(d.id);
        try {
          if (d.aksi === 'majukan') {
            const dari = I.namaTahap(p.stage);
            I.majukan(S.data, p, S.me, Date.now(), hariIni());
            selesaiUbah(`${p.name}: ${dari} → ${I.namaTahap(p.stage)}.`);
          } else {
            I.setKeputusan(S.data, p, d.aksi === 'tahan-proyek' ? 'Hold' : 'Build', S.me, Date.now());
            selesaiUbah(d.aksi === 'tahan-proyek' ? 'Proyek ditahan.' : 'Proyek dilanjutkan.');
          }
        } catch (err) { toast(err.message, true); }
        break;
      }
      case 'arsip-proyek': {
        const p = proyekDari(S.proyek);
        try { I.setArsip(S.data, p, d.nilai === '1', S.me, Date.now()); selesaiUbah(d.nilai === '1' ? 'Proyek diarsipkan.' : 'Proyek aktif lagi.'); } catch (err) { toast(err.message, true); }
        break;
      }
      /* Rancangan Paket */
      case 'paket-buka': Object.assign(S.pkt, { pilih: d.id, sunting: false }); render(); window.scrollTo(0, 0); break;
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
      /* Link Saya & Catatan Saya */
      case 'link-ubah': { const l = S.data.links.find(x => x.id === d.id); if (l) bukaModal({ jenis: 'link', id: l.id }, formLink(l)); break; }
      case 'link-pindah': {
        const l = S.data.links.find(x => x.id === d.id);
        if (l) bukaModal({ jenis: 'link-pindah', id: l.id }, formIsian('Pindah folder', `Folder untuk "${l.title}" (kosongkan = Umum)`, l.folder, 'Pindahkan',
          [...new Set(S.data.links.filter(x => x.user === S.me).map(x => x.folder).filter(Boolean))].sort()));
        break;
      }
      case 'link-hapus': {
        const l = S.data.links.find(x => x.id === d.id);
        if (!l || !confirm(`Hapus link "${l.title}"?`)) return;
        try { I.hapusMilik(S.data.links, l.id, S.me); selesaiUbah('Link dihapus.'); } catch (err) { toast(err.message, true); }
        break;
      }
      case 'catatan-buka': S.ctt.buka = S.ctt.buka === d.id ? '' : d.id; $('#hasil').innerHTML = hasilCatatan(); break;
      case 'catatan-ubah': { const n = S.data.notes.find(x => x.id === d.id); if (n) bukaModal({ jenis: 'note', id: n.id }, formNote(n)); break; }
      case 'catatan-hapus': {
        const n = S.data.notes.find(x => x.id === d.id);
        if (!n || !confirm(`Hapus catatan "${n.title || '(tanpa judul)'}"?`)) return;
        try { I.hapusMilik(S.data.notes, n.id, S.me); selesaiUbah('Catatan dihapus.'); } catch (err) { toast(err.message, true); }
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
      /* Dashboard Lain */
      case 'dashlain-tambah': bukaModal({ jenis: 'dashboard', id: '' }, formDashboard(null)); break;
      case 'dashlain-ubah': { const x = S.data.dashboards.find(y => y.id === d.id); if (x) bukaModal({ jenis: 'dashboard', id: x.id }, formDashboard(x)); break; }
      case 'dashlain-hapus': {
        const x = S.data.dashboards.find(y => y.id === d.id);
        if (!x || !confirm(`Hapus dashboard "${x.title}"?`)) return;
        try { I.hapusDashboard(S.data, S.me, x.id, Date.now()); selesaiUbah('Dashboard dihapus.'); } catch (err) { toast(err.message, true); }
        break;
      }
      case 'rwy-lagi': S.rwy.batas += 100; $('#hasil').innerHTML = hasilRiwayat(); break;
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
    } else if (el.dataset.aksi === 'kom-baru') {
      S.kom.baru = el.checked;
      $('#hasil').innerHTML = hasilKomunikasi();
    } else if (el.name === 'project' && el.closest('[data-form="modal"]')) {
      const p = proyekDari(el.value);
      const st = el.closest('form').stage;
      if (p && st) st.value = p.stage;
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
    if (jenis === 'link-tambah' || jenis === 'catatan-tambah') {
      const f = Object.fromEntries(new FormData(form).entries());
      try {
        if (jenis === 'link-tambah') I.simpanLink(S.data, S.me, f, '', waktu);
        else I.simpanCatatan(S.data, S.me, f, '', waktu);
        selesaiUbah(jenis === 'link-tambah' ? 'Link ditambahkan.' : 'Catatan disimpan.');
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
    if (el.id === 'cari-global') { S.cari = el.value; renderCariHasil(); return; }
    if (el.closest('[data-form="paket"]')) { S.pkt.kotor = true; return; }
    const ruang = el.dataset.cari;
    if (!ruang) return;
    const kunci = { daftar: 'daftar', paket: 'pkt', komunikasi: 'kom', link: 'lnk', catatan: 'ctt', riwayat: 'rwy' }[ruang];
    S[kunci].q = el.value;
    if (kunci === 'daftar') S.daftar.hal = 1;
    if (kunci === 'rwy') S.rwy.batas = 100;
    const wadah = $('#hasil');
    if (wadah && HASIL[S.view]) wadah.innerHTML = HASIL[S.view]();
  });

  document.addEventListener('focusout', e => {
    if (e.target.id === 'cari-global') setTimeout(() => { const w = $('#cari-hasil'); if (w && !w.contains(document.activeElement)) w.hidden = true; }, 150);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!$('#modal').hidden) return tutupModal();
      if (S.pilih && !$('#laci').hidden) { S.pilih = null; return render(); }
      if (S.navBuka) { S.navBuka = false; return render(); }
      const w = $('#cari-hasil');
      if (w && !w.hidden) { w.hidden = true; return; }
    }
    const mengetik = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (e.key === '/' && !mengetik && !$('#app').hidden) {
      const c = $('#cari-global');
      if (c && c.offsetParent) { e.preventDefault(); c.focus(); }
    }
  });

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
