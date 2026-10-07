/* =============================================================================
   app.js — tampilan ProductTrack v2.

   Aturan alur ada di inti.js (window.Inti); berkas ini hanya menggambar dan
   meneruskan klik ke aturan itu. Data contoh dimuat dari server setelah PIN
   benar; suntingan disimpan di browser ini (localStorage) sampai ada impor data
   contoh versi baru.

   Menu: Hari Ini · Papan · Proyek · Laporan. Halaman pertama mengikuti peran
   profil yang dipilih: Manager → Proyek, Lead & Staff → Hari Ini.
   ========================================================================== */

(function () {
  'use strict';

  const I = window.Inti;
  const $ = (s, akar = document) => akar.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hariIni = () => I.isoHari(Date.now());

  /* ---------- Penyimpanan di browser ---------- */

  const AWALAN = 'pt2_';
  const ambil = (k, bawaan) => { try { const v = localStorage.getItem(AWALAN + k); return v == null ? bawaan : JSON.parse(v); } catch (e) { return bawaan; } };
  const simpan = (k, v) => { try { localStorage.setItem(AWALAN + k, JSON.stringify(v)); } catch (e) { /* penuh atau diblokir: tetap jalan */ } };
  const hapus = k => { try { localStorage.removeItem(AWALAN + k); } catch (e) { /* abaikan */ } };

  const S = {
    data: null,
    versi: '',
    sumber: '',
    me: ambil('me', null),
    view: ambil('view', ''),
    pilih: null,
    proyek: null,
    proyekArsip: false,
    papan: Object.assign({ kelompok: 'status', lingkup: 'tim', proyek: '', jalur: '', platform: '', fokus: '' }, ambil('papan', {})),
    menu: false,
    cari: '',
    cariLaporan: '',
    modal: null,
    seret: null,
  };

  function simpanData() { simpan('data', { versi: S.versi, data: S.data }); }

  /* ---------- Ikon (garis, mengikuti warna teks) ---------- */

  const JALUR_IKON = {
    matahari: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    kolom: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/>',
    lapis: '<path d="m12 2 9 5-9 5-9-5 9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
    grafik: '<path d="M3 3v18h18"/><path d="M7 16v-5M12 16V8M17 16v-8"/>',
    cari: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    tambah: '<path d="M12 5v14M5 12h14"/>',
    tutup: '<path d="M18 6 6 18M6 6l12 12"/>',
    kiri: '<path d="m15 18-6-6 6-6"/>',
    tautan: '<path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1 1"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1-1"/>',
    orang: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    ulang: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    keluar: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    unduh: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  };
  const ikon = (nama, ukuran = 18) => `<svg width="${ukuran}" height="${ukuran}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${JALUR_IKON[nama] || ''}</svg>`;

  /* ---------- Potongan tampilan ---------- */

  const WARNA = ['#0068B4', '#004F94', '#003078', '#0E7490', '#3D4654', '#7A3E9D', '#067647', '#8A4B00', '#B42318', '#9F1239', '#5B6470', '#00214F'];
  function warnaOrang(id) {
    let h = 0;
    for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return WARNA[h % WARNA.length];
  }
  const avatar = (id, kelas = '') => `<span class="avatar ${kelas}" style="background:${warnaOrang(id)}" title="${esc(I.orang(id).nama)}">${esc(I.inisial(id))}</span>`;
  const nama = id => esc(I.orang(id).pendek);

  const fmtTanggal = iso => (iso ? new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }) : '—');
  const fmtWaktu = ms => ms ? new Date(ms).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
  function relatif(ms) {
    if (!ms) return '';
    const d = (Date.now() - ms) / 1000;
    if (d < 60) return 'baru saja';
    if (d < 3600) return Math.floor(d / 60) + ' mnt lalu';
    if (d < 86400) return Math.floor(d / 3600) + ' jam lalu';
    if (d < 7 * 86400) return Math.floor(d / 86400) + ' hari lalu';
    return fmtWaktu(ms);
  }

  const pillStatus = s => `<span class="pill st-${s.toLowerCase()}">${esc(s)}</span>`;
  function chipTenggat(t) {
    if (!t.due) return '<span class="tenggat kosong">Tanpa tenggat</span>';
    if (I.selesai(t)) return `<span class="tenggat">${esc(fmtTanggal(t.due))}</span>`;
    const n = I.selisihHari(hariIni(), t.due);
    if (n < 0) return `<span class="tenggat telat">Telat ${-n} hr</span>`;
    if (n === 0) return '<span class="tenggat hari">Hari ini</span>';
    if (n === 1) return '<span class="tenggat">Besok</span>';
    return `<span class="tenggat">${esc(fmtTanggal(t.due))}</span>`;
  }
  const chipJalur = t => t.lane === 'proyek'
    ? `<span class="huruf-tahap" title="Tahap ${esc(I.namaTahap(t.stage))}">${esc(t.stage || '?')}</span>`
    : '<span class="chip-rutin" title="Jalur Rutin: tanpa tahap ADDIE">Rutin</span>';
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
        ${alasan ? `<span class="baris-alasan ${/^Tertahan/.test(alasan) ? 'merah' : ''}">${esc(alasan)}</span>` : ''}
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

  /* ---------- Toast ---------- */

  function toast(pesan, galat = false) {
    const el = document.createElement('div');
    el.className = 'toast' + (galat ? ' galat' : '');
    el.textContent = pesan;
    $('#toast').appendChild(el);
    setTimeout(() => el.remove(), galat ? 5000 : 3200);
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
    return {
      projects: daftar(d.projects).map(p => ({ ...p, history: daftar(p.history) })),
      tasks: daftar(d.tasks).map(t => ({
        ...t, support: daftar(t.support), deps: daftar(t.deps), subtasks: daftar(t.subtasks), comments: daftar(t.comments),
        tinjauan: daftar(t.tinjauan), evidence: daftar(t.evidence), output: t.output || '', selesaiAt: Number(t.selesaiAt) || 0,
      })),
      packages: daftar(d.packages),
      bookmarks: daftar(d.bookmarks),
      log: daftar(d.log),
    };
  }

  /* ---------- Layar kunci & profil ---------- */

  function tampilKunci(pesan, sibuk) {
    $('#app').hidden = true;
    $('#profil').hidden = true;
    $('#kunci').hidden = false;
    $('#kunci-pesan').textContent = pesan || 'Masukkan PIN untuk melanjutkan.';
    $('#kunci-isian').hidden = !!sibuk;
    $('#kunci-tombol').hidden = !!sibuk;
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
      <span class="merek"><span class="merek-ikon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5CC6F7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg></span>ProductTrack</span>
      <div><h1 style="margin:0;font-size:22px;color:var(--navy)">Masuk sebagai siapa?</h1>
      <p class="pesan-info" style="margin-top:6px">PIN dipakai bersama, jadi pilih profil Anda sendiri. Tampilan menyesuaikan peran: Staff dan Lead mulai di Hari Ini, Manager di Proyek.</p></div>
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
    if (!['hari', 'papan', 'proyek', 'laporan'].includes(S.view)) S.view = halamanAwal();
    render();
  }
  const halamanAwal = () => (I.orang(S.me).peran === 'manager' ? 'proyek' : 'hari');

  async function muat() {
    tampilKunci('Memuat data…', true);
    const h = await api('muatContoh');
    if (h.http === 401) return tampilKunci('Masukkan PIN untuk melanjutkan.', false);
    if (!h.success) return tampilKunci(h.message || 'Gagal memuat data.', h.kode === 'SETELAN');
    const lokal = ambil('data', null);
    let pesan = '';
    if (h.data && lokal && lokal.versi === h.versi && lokal.data) {
      S.data = rapikan(lokal.data);
    } else if (h.data) {
      S.data = rapikan(h.data);
      pesan = `Data contoh dimuat: ${S.data.tasks.length} task, ${S.data.projects.length} proyek.`;
    } else {
      S.data = rapikan({});
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

  /* ---------- Kerangka: kepala & navigasi ---------- */

  function itemNav() {
    const h = hariIni();
    const kerja = I.pekerjaanSaya(S.data, S.me, h);
    const mendesak = kerja.grup.filter(g => ['tinjau', 'telat', 'hari'].includes(g.kunci)).reduce((n, g) => n + g.isi.length, 0);
    const keputusan = I.orang(S.me).peran === 'manager' ? I.antreKeputusan(S.data, h).length : 0;
    return [
      { id: 'hari', label: 'Hari Ini', ikon: 'matahari', lencana: mendesak },
      { id: 'papan', label: 'Papan', ikon: 'kolom', lencana: 0 },
      { id: 'proyek', label: 'Proyek', ikon: 'lapis', lencana: keputusan },
      { id: 'laporan', label: 'Laporan', ikon: 'grafik', lencana: 0 },
    ];
  }

  function renderKepala() {
    const nav = itemNav();
    const o = I.orang(S.me);
    $('#kepala').innerHTML = `<div class="kepala-dalam">
      <a class="merek" href="#" data-aksi="ke" data-view="awal"><span class="merek-ikon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5CC6F7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg></span>ProductTrack</a>
      <nav class="nav-atas" aria-label="Menu utama">${nav.map(n => `
        <button type="button" class="nav-btn" data-aksi="ke" data-view="${n.id}" ${S.view === n.id ? 'aria-current="page"' : ''}>${ikon(n.ikon)} ${n.label}${n.lencana ? ` <span class="lencana ${n.id === 'hari' ? 'biru' : ''}">${n.lencana}</span>` : ''}</button>`).join('')}
      </nav>
      <div class="kepala-kanan">
        <label class="cari">${ikon('cari', 16)}<span class="sr">Cari task</span>
          <input id="cari-global" type="search" placeholder="Cari task, ID, orang, proyek ( / )" value="${esc(S.cari)}" autocomplete="off">
          <div id="cari-hasil" class="cari-hasil" hidden></div>
        </label>
        ${I.bolehBuatTask(S.me) ? `<button type="button" class="tombol utama tombol-tambah" data-aksi="tambah-task">${ikon('tambah', 16)} Tambah</button>` : ''}
        <button type="button" class="avatar-tombol" data-aksi="menu" aria-expanded="${S.menu}" aria-label="Menu profil">${avatar(S.me, 'besar')}</button>
        ${S.menu ? `<div class="menu-profil">
          <p><strong>${esc(o.nama)}</strong>${esc(I.PERAN[o.peran])} · ${esc(o.jabatan)}</p>
          <button type="button" data-aksi="ganti-profil">${ikon('orang')} Ganti profil</button>
          <button type="button" data-aksi="muat-ulang">${ikon('ulang')} Muat ulang data contoh</button>
          <button type="button" data-aksi="keluar">${ikon('keluar')} Keluar</button>
        </div>` : ''}
      </div>
    </div>`;
    $('#nav-bawah').innerHTML = nav.map(n => `
      <button type="button" data-aksi="ke" data-view="${n.id}" ${S.view === n.id ? 'aria-current="page"' : ''}>${ikon(n.ikon, 22)}${n.label}${n.lencana ? `<span class="lencana ${n.id === 'hari' ? 'biru' : ''}">${n.lencana}</span>` : ''}</button>`).join('');
    $('#fab').hidden = !I.bolehBuatTask(S.me);
  }

  function render() {
    renderKepala();
    const gambar = { hari: viewHari, papan: viewPapan, proyek: viewProyek, laporan: viewLaporan }[S.view] || viewHari;
    $('#isi').innerHTML = gambar();
    renderLaci();
    document.title = ({ hari: 'Hari Ini', papan: 'Papan', proyek: 'Proyek', laporan: 'Laporan' }[S.view] || 'ProductTrack') + ' · ProductTrack v2';
  }

  const detailSebaris = () => S.view === 'hari' && window.matchMedia('(min-width: 1200px)').matches;

  function renderLaci() {
    const t = S.pilih && S.data.tasks.find(x => x.id === S.pilih);
    const tampil = !!t && !detailSebaris();
    $('#laci').hidden = !tampil;
    $('#laci-panel').innerHTML = tampil ? detailHtml(t, true) : '';
    document.body.style.overflow = tampil ? 'hidden' : '';
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
    const chip = (n, teks, kelas, fokus) => n ? `<button type="button" class="chip-aksi ${kelas}" data-aksi="fokus-papan" data-fokus="${fokus}">${n} ${teks}</button>` : '';
    const isi = [
      keputusan ? `<button type="button" class="chip-aksi kuning" data-aksi="ke" data-view="proyek">${keputusan} keputusan proyek</button>` : '',
      chip(p.tinjau, 'menunggu tinjauan Anda', 'kuning', 'tinjau'),
      chip(p.telat, 'terlambat', 'merah', 'telat'),
      chip(p.tertahan, 'tertahan', 'merah', 'tertahan'),
    ].join('');
    return `<div class="pita"><strong>${o.peran === 'manager' ? 'Divisi' : 'Tim saya'}</strong>
      <span class="pesan-info">${p.aktif} task aktif</span>
      ${isi || '<span class="pesan-info">· tidak ada yang perlu perhatian</span>'}
      <button type="button" class="tombol kecil" data-aksi="ke" data-view="papan">${ikon('kolom', 16)} Buka papan</button>
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
        <p class="tanggal-kecil">${esc(new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</p>
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
      ${t.evidence.length ? `<section class="tautan-daftar"><p class="subjudul">Tautan</p>${t.evidence.map(e => /^https?:\/\//i.test(e.url)
        ? `<a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${ikon('tautan', 16)} ${esc(e.label || e.url)}</a>` : '').join('')}</section>` : ''}
      ${t.tinjauan.length ? `<section><p class="subjudul">Riwayat tinjauan</p><ul class="riwayat">${t.tinjauan.slice().sort((a, b) => b.at - a.at).map(r => `
        <li><strong>${esc(r.action)}</strong> oleh ${nama(r.by)} <small>· ${esc(relatif(r.at))}</small>${r.note ? `<br>${esc(r.note)}` : ''}</li>`).join('')}</ul></section>` : ''}

      <section>
        <p class="subjudul">Diskusi${t.comments.length ? ' · ' + t.comments.length : ''}</p>
        ${t.comments.map(k => `<div class="komentar">${avatar(k.author, 'kecil')}<div><small><strong>${nama(k.author)}</strong> · ${esc(relatif(k.at))}</small><p>${esc(k.text)}</p></div></div>`).join('')}
        <form class="baris-form" data-form="komentar" data-id="${esc(t.id)}">
          <label class="sr" for="kom-${esc(t.id)}">Tulis komentar</label>
          <input class="input" id="kom-${esc(t.id)}" name="teks" placeholder="Tulis komentar…" required maxlength="2000">
          <button class="tombol">Kirim</button>
        </form>
      </section>

      ${log.length ? `<section><p class="subjudul">Aktivitas</p><ul class="riwayat">${log.map(l => `<li>${nama(l.by)}: ${esc(l.detail)} <small>· ${esc(relatif(l.at))}</small></li>`).join('')}</ul></section>` : ''}
    </div>`;
  }

  /* ---------- Papan ---------- */

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
    const platform = [...new Set(S.data.tasks.map(t => t.platform).filter(Boolean))].sort();
    const proyekAktif = S.data.projects.filter(x => !x.arsip);
    const segmen = (kunci, nilai, label) => `<button type="button" data-aksi="papan" data-kunci="${kunci}" data-nilai="${nilai}" aria-pressed="${f[kunci] === nilai}">${label}</button>`;
    const fokus = (kunci, n, teks, kelas) => `<button type="button" class="chip-aksi ${kelas}" data-aksi="papan" data-kunci="fokus" data-nilai="${f.fokus === kunci ? '' : kunci}" aria-pressed="${f.fokus === kunci}" ${n || f.fokus === kunci ? '' : 'disabled'}>${n} ${teks}</button>`;
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
          ${k.isi.length > 40 ? `<button type="button" class="tombol kecil" data-aksi="ke" data-view="laporan">Lihat ${k.isi.length - 40} lainnya di Laporan</button>` : ''}
        </section>`).join('')}</div></div>`;
    }

    return `<div class="judul-halaman"><div><h1>Papan</h1><p>${keterangan}</p></div>
        <div class="segmen" role="group" aria-label="Lingkup">${segmen('lingkup', 'saya', 'Saya')}${segmen('lingkup', 'tim', o.peran === 'manager' ? 'Divisi' : 'Tim saya')}${o.peran === 'manager' ? '' : segmen('lingkup', 'semua', 'Semua')}</div>
        <div class="segmen" role="group" aria-label="Kelompokkan">${segmen('kelompok', 'status', 'Per status')}${segmen('kelompok', 'orang', 'Per orang')}</div>
      </div>
      <div class="alat">
        <span class="label-kecil">Perlu perhatian:</span>
        ${fokus('telat', p.telat, 'terlambat', 'merah')}${fokus('tertahan', p.tertahan, 'tertahan', 'merah')}${fokus('tinjau', p.tinjau, 'menunggu tinjauan Anda', 'kuning')}
        <span class="spasi"></span>
        <label class="label-kecil">Proyek <select data-aksi="papan-pilih" data-kunci="proyek"><option value="">Semua</option>${proyekAktif.map(x => `<option value="${esc(x.id)}" ${f.proyek === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
        <label class="label-kecil">Jalur <select data-aksi="papan-pilih" data-kunci="jalur"><option value="">Semua</option><option value="proyek" ${f.jalur === 'proyek' ? 'selected' : ''}>Proyek</option><option value="rutin" ${f.jalur === 'rutin' ? 'selected' : ''}>Rutin</option></select></label>
        <label class="label-kecil">Platform <select data-aksi="papan-pilih" data-kunci="platform"><option value="">Semua</option>${platform.map(x => `<option ${f.platform === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
        ${adaSaring ? '<button type="button" class="tombol kecil" data-aksi="papan-bersih">Hapus saringan</button>' : ''}
      </div>
      ${isi}`;
  }

  /* ---------- Proyek ---------- */

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

    return `<div class="judul-halaman"><div><h1>Proyek</h1>
        <p>${semua.length - nArsip} aktif · ${nArsip} arsip${keputusan.length ? ` · ${keputusan.length} menunggu keputusan` : ''}</p></div>
        <div class="segmen" role="group" aria-label="Tampilkan"><button type="button" data-aksi="proyek-arsip" data-nilai="0" aria-pressed="${!S.proyekArsip}">Aktif</button><button type="button" data-aksi="proyek-arsip" data-nilai="1" aria-pressed="${S.proyekArsip}">Arsip (${nArsip})</button></div>
        ${isM ? `<button type="button" class="tombol utama" data-aksi="proyek-baru">${ikon('tambah', 16)} Proyek baru</button>` : ''}
      </div>
      <div class="dua-kolom">
        <div class="kolom-utama"><div class="daftar-proyek">${baris || `<div class="kosong-isi">${S.proyekArsip ? 'Belum ada proyek arsip.' : 'Belum ada proyek aktif.'}</div>`}</div></div>
        <div class="samping-tumpuk" style="flex:1 1 360px;min-width:0;max-width:500px">
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
              <h1 style="margin:4px 0 0;font-size:24px;color:var(--navy)">${esc(p.name)}</h1>
              ${p.goal ? `<p class="teks-panjang" style="margin-top:8px">${esc(p.goal)}</p>` : ''}</div>
            ${jalurTahap(p)}
            ${gerbang}
            <div class="detail-aksi"><button type="button" class="tombol kecil" data-aksi="papan-proyek" data-id="${esc(p.id)}">${ikon('kolom', 16)} Buka di papan</button>
              ${isM && !p.arsip && r.semua && r.semua === r.semuaSelesai ? '<button type="button" class="tombol kecil" data-aksi="arsip-proyek" data-nilai="1">Arsipkan proyek</button>' : ''}</div>
          </div>
          ${bagian}
        </div>
        <div class="samping-tumpuk" style="flex:1 1 320px;min-width:0;max-width:440px">
          <section class="kartu-polos samping-tumpuk"><p class="subjudul">Ringkasan</p>
            <p class="hint">${r.semuaSelesai} dari ${r.semua} task selesai di semua tahap.</p>
            ${r.tenggat ? `<p class="hint">Tenggat task aktif terjauh: ${esc(fmtTanggal(r.tenggat))}.</p>` : ''}
          </section>
          ${(p.history || []).length ? `<section class="kartu-polos samping-tumpuk"><p class="subjudul">Riwayat tahap</p><ul class="riwayat">${p.history.map(x => `
            <li>${esc(I.namaTahap(x.dari))} → <strong>${esc(I.namaTahap(x.ke))}</strong> oleh ${nama(x.oleh)} <small>· ${esc(relatif(x.at))}</small></li>`).join('')}</ul></section>` : ''}
        </div>
      </div>`;
  }

  /* ---------- Laporan ---------- */

  function viewLaporan() {
    const h = hariIni();
    const r = I.laporan(S.data, h);
    const maks = Math.max(1, ...r.mingguan.map(m => m.jumlah));
    const maksPl = Math.max(1, ...r.perPlatform.map(x => x.jumlah));
    const hasil = I.cari(S.data, S.cariLaporan);
    return `<div class="judul-halaman"><div><h1>Laporan</h1><p>${esc(S.sumber || 'Data contoh')} · semua angka dihitung dari data di browser ini</p></div>
        <button type="button" class="tombol" data-aksi="ekspor">${ikon('unduh', 16)} Ekspor CSV</button></div>
      <div class="ubin">
        <div><strong>${r.kpi.aktif}</strong><span>Task aktif</span></div>
        <div class="${r.kpi.telat ? 'merah' : ''}"><strong>${r.kpi.telat}</strong><span>Terlambat</span></div>
        <div class="${r.kpi.tertahan ? 'merah' : ''}"><strong>${r.kpi.tertahan}</strong><span>Tertahan</span></div>
        <div><strong>${r.kpi.ditinjau}</strong><span>Menunggu tinjauan</span></div>
        <div><strong>${r.kpi.selesai30}</strong><span>Selesai 30 hari</span></div>
      </div>
      <div class="grid-laporan">
        <section class="kartu-polos"><p class="subjudul">Selesai per minggu</p>
          <div class="grafik-minggu">${r.mingguan.map(m => `<div><b>${m.jumlah}</b><span class="tiang" style="height:${Math.round(m.jumlah / maks * 130)}px"></span><small>${esc(new Date(m.awal + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }))}</small></div>`).join('')}</div>
        </section>
        <section class="kartu-polos"><p class="subjudul">Task aktif per platform</p>
          <div class="batang-platform">${r.perPlatform.map(x => `<div><span>${esc(x.platform)}</span><span class="batang"><span style="width:${Math.round(x.jumlah / maksPl * 100)}%"></span></span><b>${x.jumlah}</b></div>`).join('') || '<p class="hint">Tidak ada task aktif.</p>'}</div>
        </section>
        <section class="kartu-polos" style="grid-column:1/-1"><p class="subjudul">Per orang</p>
          <div class="tabel-gulir"><table class="tabel"><thead><tr><th>Nama</th><th>Peran</th><th class="angka">Aktif</th><th class="angka">Terlambat</th><th class="angka">Selesai 30 hari</th></tr></thead>
          <tbody>${r.perOrang.map(x => `<tr><td>${avatar(x.id, 'kecil')} ${nama(x.id)}</td><td>${esc(I.PERAN[I.orang(x.id).peran])}</td><td class="angka">${x.aktif}</td><td class="angka">${x.telat}</td><td class="angka">${x.selesai30}</td></tr>`).join('')}</tbody></table></div>
        </section>
        <section class="kartu-polos" style="grid-column:1/-1"><p class="subjudul">Arsip & pencarian</p>
          <label class="isian"><span class="sr">Cari di semua task</span><input id="cari-laporan" type="search" placeholder="Cari judul, ID, orang, proyek, platform…" value="${esc(S.cariLaporan)}" autocomplete="off"></label>
          <div id="hasil-laporan" class="grup" style="margin-top:10px">${hasilLaporan(hasil)}</div>
        </section>
      </div>`;
  }
  const hasilLaporan = hasil => (S.cariLaporan.trim()
    ? (hasil.map(t => barisTask(t)).join('') || '<p class="hint">Tidak ada yang cocok.</p>')
    : '<p class="hint">Ketik untuk mencari di semua task, termasuk yang sudah selesai.</p>');

  function eksporCsv() {
    const sel = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const judul = ['ID', 'Judul', 'Jalur', 'Proyek', 'Kategori', 'Tahap', 'Platform', 'PIC', 'Status', 'Tertahan', 'Tenggat', 'Selesai'];
    const baris = S.data.tasks.map(t => [t.id, t.title, t.lane, t.project ? asal(t) : '', t.kategori, t.stage ? I.namaTahap(t.stage) : '', t.platform,
      I.orang(t.pic).nama, t.status, t.tertahan ? 'ya' : '', t.due, t.selesaiAt ? I.isoHari(t.selesaiAt) : '']);
    const csv = '﻿' + [judul, ...baris].map(b => b.map(sel).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `producttrack-v2-${hariIni()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ---------- Modal & formulir ---------- */

  const KATEGORI = ['Operasional', 'QC', 'Develop Konten', 'Manajemen Sistem', 'Kreatif', 'Manajemen Guru', 'Data & Intelligence', 'RnD', 'Umum'];
  const PLATFORM = ['ASN', 'Sekdin', 'TPA', 'PPPK', 'PPG', 'BUMN', 'OJK', 'PCPM', 'Psikotes Kerja', 'Cerebrum', 'Polisi', 'Prajurit', 'TOEFL', 'Beasiswa', 'All Platform'];
  const PRIORITAS = [['Normal', 'Normal'], ['High', 'Penting'], ['Urgent', 'Mendesak'], ['Low', 'Rendah']];

  function bukaModal(konteks, html) {
    S.modal = konteks;
    $('#modal-panel').innerHTML = html;
    $('#modal').hidden = false;
    setTimeout(() => { const el = $('#modal-panel input, #modal-panel textarea, #modal-panel select'); if (el) el.focus(); }, 30);
  }
  function tutupModal() {
    S.modal = null;
    $('#modal').hidden = true;
    $('#modal-panel').innerHTML = '';
  }

  function formTask(t, preset = {}) {
    const ubah = !!t;
    const nilai = t || {};
    const pics = [...new Set([...I.picBoleh(S.me), ...(t ? [t.pic] : [])])];
    const proyekAktif = S.data.projects.filter(p => !p.arsip);
    const pProyek = preset.proyek || (proyekAktif[0] || {}).id || '';
    const jalur = preset.jalur || (preset.proyek ? 'proyek' : proyekAktif.length ? 'proyek' : 'rutin');
    const tahapAwal = preset.tahap || ((proyekDari(pProyek) || {}).stage || 'A');
    const opsi = (daftar, terpilih) => daftar.map(([v, l]) => `<option value="${esc(v)}" ${v === terpilih ? 'selected' : ''}>${esc(l)}</option>`).join('');
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
        <label class="isian">Proyek <select name="project">${opsi(proyekAktif.map(p => [p.id, p.name]), pProyek)}</select></label>
        <label class="isian">Tahap <select name="stage">${opsi(I.TAHAP.map(x => [x.id, x.nama]), tahapAwal)}</select></label>
      </div>
      <label class="isian" data-bagian="rutin" ${jalur === 'rutin' ? '' : 'hidden'}>Kategori <select name="kategori">${opsi(KATEGORI.map(k => [k, k]), 'Operasional')}</select></label>`}
      <div class="dua-isian">
        <label class="isian">PIC <select name="pic">${opsi(pics.map(id => [id, I.orang(id).nama]), nilai.pic || pics[0])}</select></label>
        <label class="isian">Tenggat <input type="date" name="due" value="${esc(nilai.due || '')}"></label>
      </div>
      <div class="dua-isian">
        <label class="isian">Prioritas <select name="priority">${opsi(PRIORITAS, nilai.priority || 'Normal')}</select></label>
        <label class="isian">Output <input name="output" maxlength="200" value="${esc(nilai.output || '')}" placeholder="mis. 40 soal lolos QC"></label>
      </div>
      <label class="isian">Keterangan <textarea name="detail" maxlength="4000">${esc(nilai.detail || '')}</textarea></label>
      <p id="galat-modal" class="pesan-galat" hidden></p>
      <div class="modal-kaki"><button type="button" class="tombol" data-aksi="tutup-modal">Batal</button><button class="tombol utama">${ubah ? 'Simpan' : 'Tambah task'}</button></div>
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
      <p id="galat-modal" class="pesan-galat" hidden></p>
      <div class="modal-kaki"><button type="button" class="tombol" data-aksi="tutup-modal">Batal</button><button class="tombol utama">Buat proyek</button></div>
    </form>`;
  }

  function formCatatan(judul, label, tombol) {
    return `<form data-form="modal" novalidate>
      <h2>${esc(judul)}</h2>
      <label class="isian">${esc(label)} <textarea name="catatan" required maxlength="1000"></textarea></label>
      <p id="galat-modal" class="pesan-galat" hidden></p>
      <div class="modal-kaki"><button type="button" class="tombol" data-aksi="tutup-modal">Batal</button><button class="tombol utama">${esc(tombol)}</button></div>
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
      if (m.jenis === 'tambah') {
        const t = I.taskBaru(S.data, {
          title: f.title, project: f.jalur === 'proyek' ? f.project : '', stage: f.stage, kategori: f.kategori,
          pic: f.pic, due: f.due, priority: f.priority, output: f.output, detail: f.detail,
        }, S.me, waktu, hariIni());
        tutupModal();
        S.pilih = t.id;
        selesaiUbah(`${t.id} ditambahkan untuk ${I.orang(t.pic).pendek}.`);
      } else if (m.jenis === 'ubah') {
        const t = S.data.tasks.find(x => x.id === m.id);
        if (!String(f.title || '').trim()) throw new Error('Judul task wajib diisi.');
        Object.assign(t, { title: f.title.trim(), pic: f.pic, due: f.due, priority: f.priority, output: f.output.trim(), detail: f.detail.trim(), updatedAt: waktu });
        t.support = t.support.filter(x => x !== t.pic);
        I.catatLog(S.data, 'update', `${t.id} · ${t.title}`, 'Detail task diubah', S.me, waktu);
        tutupModal();
        selesaiUbah('Task disimpan.');
      } else if (m.jenis === 'proyek') {
        const p = I.proyekBaru(S.data, f, S.me, waktu);
        tutupModal();
        S.view = 'proyek';
        S.proyek = p.id;
        selesaiUbah(`${p.name} dibuat di tahap Analysis.`);
      } else if (m.jenis === 'catatan') {
        const t = S.data.tasks.find(x => x.id === m.id);
        I.terapkanAksi(S.data, t, m.kunci, S.me, waktu, f.catatan);
        tutupModal();
        selesaiUbah(m.kunci === 'kembalikan' ? `Dikembalikan ke ${I.orang(t.pic).pendek}.` : 'Ditandai tertahan.');
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

  /* ---------- Pencarian di kepala ---------- */

  function renderCariHasil() {
    const wadah = $('#cari-hasil');
    if (!wadah) return;
    const hasil = I.cari(S.data, S.cari, 8);
    if (!S.cari.trim()) { wadah.hidden = true; return; }
    wadah.innerHTML = hasil.map(t => `<button type="button" data-aksi="buka-task" data-id="${esc(t.id)}"><span>${esc(t.title)}</span>
      <small>${esc(t.id)} · ${esc(t.status)} · ${nama(t.pic)} · ${esc(asal(t))}</small></button>`).join('') || '<p class="hint" style="padding:8px 10px;margin:0">Tidak ada yang cocok.</p>';
    wadah.hidden = false;
  }

  /* ---------- Peristiwa ---------- */

  function bukaTask(id) {
    S.pilih = id;
    S.cari = '';
    if (detailSebaris()) render();
    else { renderKepala(); renderLaci(); if (S.view === 'hari') $('#isi').innerHTML = viewHari(); }
  }

  document.addEventListener('click', e => {
    const kartu = e.target.closest('.kartu');
    const el = e.target.closest('[data-aksi]') || (kartu ? { dataset: { aksi: 'buka-task', id: kartu.dataset.id } } : null);
    if (!el) {
      if (S.menu && !e.target.closest('.menu-profil')) { S.menu = false; renderKepala(); }
      return;
    }
    const d = el.dataset;
    const t = d.id ? S.data && S.data.tasks.find(x => x.id === d.id) : null;
    switch (d.aksi) {
      case 'ke':
        e.preventDefault();
        S.view = d.view === 'awal' ? halamanAwal() : d.view;
        S.menu = false;
        S.proyek = d.view === 'proyek' ? null : S.proyek;
        simpan('view', S.view);
        render();
        window.scrollTo(0, 0);
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
      case 'menu': S.menu = !S.menu; renderKepala(); break;
      case 'ganti-profil': S.menu = false; tampilProfil(); break;
      case 'pilih-profil':
        S.me = d.id;
        simpan('me', S.me);
        S.view = halamanAwal();
        simpan('view', S.view);
        S.pilih = null;
        S.proyek = null;
        S.papan.lingkup = 'tim';
        simpan('papan', S.papan);
        masukApp();
        toast(`Masuk sebagai ${I.orang(S.me).pendek} (${I.PERAN[I.orang(S.me).peran]}).`);
        break;
      case 'muat-ulang':
        S.menu = false;
        if (!confirm('Muat ulang data contoh dari server? Perubahan di browser ini akan diganti.')) return render();
        hapus('data');
        S.pilih = null;
        muat();
        break;
      case 'keluar':
        S.menu = false;
        api('keluar').then(() => tampilKunci('Anda sudah keluar. Masukkan PIN untuk masuk lagi.', false));
        break;
      case 'fokus-papan':
        S.view = 'papan';
        S.papan.fokus = d.fokus;
        S.papan.lingkup = 'tim';
        simpan('papan', S.papan);
        simpan('view', S.view);
        render();
        break;
      case 'papan':
        S.papan[d.kunci] = d.nilai;
        simpan('papan', S.papan);
        render();
        break;
      case 'papan-bersih':
        Object.assign(S.papan, { proyek: '', jalur: '', platform: '', fokus: '' });
        simpan('papan', S.papan);
        render();
        break;
      case 'papan-proyek':
        Object.assign(S.papan, { proyek: d.id, jalur: '', platform: '', fokus: '', lingkup: I.orang(S.me).peran === 'manager' ? 'tim' : 'semua' });
        simpan('papan', S.papan);
        S.view = 'papan';
        render();
        break;
      case 'buka-proyek': S.proyek = d.id; S.pilih = null; S.view = 'proyek'; render(); window.scrollTo(0, 0); break;
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
      case 'ekspor': eksporCsv(); break;
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
    } else if (el.dataset.aksi === 'papan-pilih') {
      S.papan[el.dataset.kunci] = el.value;
      simpan('papan', S.papan);
      render();
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
    if (jenis === 'modal') return kirimModal(form);
    const t = S.data.tasks.find(x => x.id === form.dataset.id);
    if (!t) return;
    const waktu = Date.now();
    if (jenis === 'komentar') {
      const teks = form.teks.value.trim();
      if (!teks) return;
      t.comments.push({ id: 'k' + waktu, author: S.me, text: teks, at: waktu });
      I.catatLog(S.data, 'comment', `${t.id} · ${t.title}`, teks.slice(0, 120), S.me, waktu);
      selesaiUbah();
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
    if (e.target.id === 'cari-global') { S.cari = e.target.value; renderCariHasil(); }
    if (e.target.id === 'cari-laporan') { S.cariLaporan = e.target.value; $('#hasil-laporan').innerHTML = hasilLaporan(I.cari(S.data, S.cariLaporan)); }
  });

  document.addEventListener('focusout', e => {
    if (e.target.id === 'cari-global') setTimeout(() => { const w = $('#cari-hasil'); if (w && !w.contains(document.activeElement)) w.hidden = true; }, 150);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!$('#modal').hidden) return tutupModal();
      if (S.pilih && !$('#laci').hidden) { S.pilih = null; return render(); }
      if (S.menu) { S.menu = false; return renderKepala(); }
      const w = $('#cari-hasil');
      if (w && !w.hidden) { w.hidden = true; return; }
    }
    const mengetik = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (e.key === '/' && !mengetik && !$('#app').hidden) {
      const c = $('#cari-global');
      if (c && c.offsetParent) { e.preventDefault(); c.focus(); }
    }
  });

  /* Seret kartu antar kolom papan: aturannya sama dengan tombol di detail. */
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

  let lebarSebelumnya = window.innerWidth;
  window.addEventListener('resize', () => {
    const lebar = window.innerWidth;
    const lintas = (lebarSebelumnya >= 1200) !== (lebar >= 1200);
    lebarSebelumnya = lebar;
    if (lintas && S.data && !$('#app').hidden) render();
  });

  mulai();
}());
