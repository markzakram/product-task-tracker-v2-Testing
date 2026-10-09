/* =============================================================================
   inti.js — aturan alur ProductTrack v2, tanpa tampilan.

   Dipakai dua tempat: app.js di browser (window.Inti) dan tes di Node
   (require). Semua aturan yang menentukan apa yang boleh terjadi ada di sini,
   supaya tampilan tak bisa menyimpang dari tes.

   Alur yang dijalankan (selaras PRD v3, 7 Okt 2026):
   - Task punya empat status: Antre → Dikerjakan → Ditinjau → Selesai.
     "Tertahan" adalah tanda, bukan status: task tetap di statusnya, dengan alasan.
     Keadaan lain dari PRD (Siap, Menunggu, Revisi) dihitung, bukan diklik.
   - Setiap task punya SUB-STAGE berkode (A1–A6, D1–D7, DV1–DV9, I1–I8, E1–E12,
     R1–R4; sejak 0.14.0 daftarnya diatur di Master). Kodenya menentukan tahap ADDIE, tim
     pemilik, dan peninjaunya.
   - Jalur PROYEK: task-nya ditinjau sebelum selesai (staff oleh Lead-nya, Lead oleh
     Manager; sub-stage bertanda Manager selalu oleh Manager), dan baru bisa diajukan
     bila syaratnya lengkap: output, tautan bukti, sub-task, task anak, tahap sebelumnya.
     Jalur RUTIN (kode R, di luar proyek) tanpa tinjauan.
   - Sejak 0.15.0 task proyek di tahap ADDIE yang sama dikerjakan PARALEL; yang berurutan
     hanya tahapnya: task menunggu tahap sebelumnya di siklus itu selesai. Lead tak
     menyerahkan task-nya ke staff, melainkan membaginya jadi TASK ANAK untuk staff timnya
     (tampil menjorok di bawah induknya, ditinjau Lead itu).
   - Proyek tak punya Lead tetap: tanggung jawabnya mengikuti tim pemilik sub-stage.
     Tahap proyek dihitung dari task terbuka paling awal; siklus ditutup oleh task
     E12 yang disetujui, lalu Manager memulai siklus berikutnya.
   ========================================================================== */

(function (akar, buat) {
  if (typeof module === 'object' && module.exports) module.exports = buat();
  else akar.Inti = buat();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MANAGER = 'nynda';
  const KAPASITAS = 6;
  const STATUS = ['Antre', 'Dikerjakan', 'Ditinjau', 'Selesai'];
  const TAHAP = [
    { id: 'A', nama: 'Analysis' },
    { id: 'D', nama: 'Design' },
    { id: 'V', nama: 'Development' },
    { id: 'I', nama: 'Implementation' },
    { id: 'E', nama: 'Evaluation' },
  ];
  const PERAN = { manager: 'Manager', lead: 'Lead', staff: 'Staff' };

  /* Organogram Divisi Produk (sama dengan PRD). Sejak 0.13.0 mode Dev bisa mengubah dan
     menambah orang: perubahannya disimpan di tab `orang` spreadsheet v2 dan diterapkan lewat
     aturOrang (di browser dan di server). ORANG dan ORANG_PER_ID diubah di tempat, jadi semua
     rujukan ke keduanya ikut berubah. tim = kode tim yang dipimpin (Lead dan Manager). */
  const ORANG_BAWAAN = [
    { id: 'nynda', nama: 'Nynda Ramadhanti', pendek: 'Nynda', peran: 'manager', jabatan: 'Manager Produk', lead: null, tim: 'MG' },
    { id: 'ali', nama: 'Ali', pendek: 'Ali', peran: 'lead', jabatan: 'Data & Automation Engineer', lead: 'nynda', tim: 'SI' },
    { id: 'andika', nama: 'Andika', pendek: 'Andika', peran: 'lead', jabatan: 'Riset & Akademik', lead: 'nynda', tim: 'AK' },
    { id: 'alya', nama: 'Alya', pendek: 'Alya', peran: 'lead', jabatan: 'Learning Architecture', lead: 'nynda', tim: 'LA' },
    { id: 'dhea', nama: 'Dhea', pendek: 'Dhea', peran: 'lead', jabatan: 'Content & Learning Operations', lead: 'nynda', tim: 'CO' },
    { id: 'uma', nama: 'Uma', pendek: 'Uma', peran: 'staff', jabatan: 'Akademik', lead: 'andika' },
    { id: 'tri', nama: 'Tri', pendek: 'Tri', peran: 'staff', jabatan: 'Akademik', lead: 'andika' },
    { id: 'wildan', nama: 'Wildan', pendek: 'Wildan', peran: 'staff', jabatan: 'Akademik', lead: 'andika' },
    { id: 'kiki', nama: 'Kiki', pendek: 'Kiki', peran: 'staff', jabatan: 'Input & QC Output', lead: 'alya' },
    { id: 'bilar', nama: 'Bilar', pendek: 'Bilar', peran: 'staff', jabatan: 'Liveclass', lead: 'alya' },
    { id: 'nadya', nama: 'Nadya', pendek: 'Nadya', peran: 'staff', jabatan: 'Guru', lead: 'dhea' },
    { id: 'bagas', nama: 'Bagas', pendek: 'Bagas', peran: 'staff', jabatan: 'Kreatif', lead: 'dhea' },
  ];
  const ORANG = ORANG_BAWAAN.map(o => ({ ...o, aktif: true }));
  const ORANG_PER_ID = new Map(ORANG.map(o => [o.id, o]));
  /* Orang yang dinonaktifkan mode Dev: tak bisa dipilih lagi, tapi namanya tetap terbaca di
     riwayat, task, dan pesan lamanya. */
  const NONAKTIF = new Map();

  /* Mode Dev (0.13.0): akun teknis, bukan anggota organogram. Tak bisa jadi PIC dan tak muncul
     di laporan, dashboard, atau @sebut; hak lihatnya setara Manager. */
  const DEV = 'dev';
  const ORANG_DEV = Object.freeze({ id: DEV, nama: 'Dev', pendek: 'Dev', peran: 'manager', jabatan: 'Mode Dev', lead: null, dev: true });

  /* Nama dari v1 yang tak ada di organogram (mis. Arifah) tetap tampil, sebagai
     staff tanpa tim. Tinjauannya jatuh ke Manager. */
  function orang(id) {
    if (id === DEV) return ORANG_DEV;
    const o = ORANG_PER_ID.get(id) || NONAKTIF.get(id);
    if (o) return o;
    const nama = String(id || '').trim() || '—';
    return { id, nama, pendek: nama, peran: 'staff', jabatan: 'Di luar organogram', lead: null, luar: true };
  }
  const timDari = leadId => ORANG.filter(o => o.lead === leadId && o.peran === 'staff').map(o => o.id);
  const inisial = id => (id === DEV ? 'DEV' : orang(id).pendek.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || '?');

  /* ---------- Tim & sub-stage (PRD v3, daftar resmi 7 Okt 2026) ---------- */

  const TIM = {
    MG: { kode: 'MG', nama: 'Manager', lead: 'nynda' },
    AK: { kode: 'AK', nama: 'Akademik', lead: 'andika' },
    LA: { kode: 'LA', nama: 'Learning Architecture', lead: 'alya' },
    CO: { kode: 'CO', nama: 'Content Ops', lead: 'dhea' },
    SI: { kode: 'SI', nama: 'Sistem', lead: 'ali' },
  };
  const timOrang = id => {
    const o = orang(id);
    const lead = o.peran === 'manager' ? o.id : o.peran === 'lead' ? o.id : o.lead;
    return Object.values(TIM).find(x => x.lead === lead) || null;
  };

  /* ---------- Kelola orang (mode Dev, 0.13.0) ----------
     Satu baris tab `orang` = satu orang lengkap (bawaan yang diubah, atau orang baru):
     { id, nama, pendek, peran, jabatan, lead (atasan), tim (kode tim untuk Lead), aktif }.
     Organogram harus tetap utuh: satu Manager (MANAGER, selalu aktif), paling banyak satu Lead
     per tim, atasan staff adalah Lead atau Manager yang aktif, dan nama panggilan unik karena
     dipakai untuk @sebut. Tim tanpa Lead sementara dipegang Manager. */
  const PERAN_ORANG = ['staff', 'lead', 'manager'];
  const TIM_LEAD = ['AK', 'LA', 'CO', 'SI'];
  const POLA_ID_ORANG = /^[a-z][a-z0-9]{1,19}$/;
  const POLA_PENDEK = /^[A-Za-z]{2,20}$/;
  const PENDEK_TERLARANG = ['dev', 'manager', 'lead', 'leader', 'staff', 'semua'];
  const ya = v => v === true || /^(ya|true|1|aktif)$/i.test(String(v == null ? '' : v).trim());

  /* Bentuk bersih satu baris; ketat = untuk isian mode Dev (galat bila tak sah), longgar = untuk
     baris yang dibaca dari tab (yang tak sah dilewati supaya aplikasi tetap jalan). */
  function bersihOrang(b, ketat) {
    const x = b && typeof b === 'object' ? b : {};
    const salah = pesan => { if (ketat) throw new Error(pesan); return null; };
    const id = String(x.id || '').trim().toLowerCase();
    if (!POLA_ID_ORANG.test(id) || id === DEV) return salah('ID orang tidak sah (huruf kecil dan angka, 2–20 karakter).');
    const nama = String(x.nama == null ? '' : x.nama).replace(/\s+/g, ' ').trim();
    if (nama.length < 2 || nama.length > 60) return salah('Nama lengkap wajib diisi (2–60 karakter).');
    const pendek = String(x.pendek == null ? '' : x.pendek).trim();
    if (!POLA_PENDEK.test(pendek)) return salah('Nama panggilan hanya huruf, 2–20 karakter, tanpa spasi (dipakai untuk @sebut).');
    if (PENDEK_TERLARANG.includes(pendek.toLowerCase())) return salah(`Nama panggilan "${pendek}" sudah dipakai sistem untuk @sebut peran.`);
    const peran = String(x.peran || '');
    if (!PERAN_ORANG.includes(peran)) return salah('Peran harus Staff, Lead, atau Manager.');
    const jabatan = String(x.jabatan == null ? '' : x.jabatan).replace(/\s+/g, ' ').trim();
    if (jabatan.length > 80) return salah('Jabatan paling panjang 80 karakter.');
    const tim = peran === 'manager' ? 'MG' : peran === 'lead' ? String(x.tim || '').toUpperCase() : '';
    if (peran === 'lead' && !TIM_LEAD.includes(tim)) return salah('Lead harus memegang salah satu tim: AK, LA, CO, atau SI.');
    const lead = peran === 'manager' ? null : peran === 'lead' ? MANAGER : String(x.lead || '').trim().toLowerCase();
    if (peran === 'staff' && !lead) return salah('Pilih atasan untuk staff.');
    return { id, nama, pendek, peran, jabatan, lead, ...(tim ? { tim } : {}), aktif: x.aktif === undefined || x.aktif === null || x.aktif === '' ? true : ya(x.aktif) };
  }

  /* Bawaan + baris tab orang (yang sama id-nya menimpa) → daftar lengkap, urut bawaan dulu. */
  function susunOrang(baris) {
    const per = new Map(ORANG_BAWAAN.map(o => [o.id, { ...o, aktif: true }]));
    for (const b of baris || []) {
      const x = bersihOrang(b, false);
      if (x) per.set(x.id, x);
    }
    return [...per.values()];
  }

  /* '' kalau organogram utuh; kalau tidak, kalimat yang menjelaskan apa yang harus dibetulkan. */
  function salahOrganogram(daftar) {
    const aktif = daftar.filter(o => o.aktif);
    const per = new Map(aktif.map(o => [o.id, o]));
    const m = per.get(MANAGER);
    if (!m || m.peran !== 'manager') return 'Manager (Nynda) harus tetap aktif dan berperan Manager; tinjauan jatuh kepadanya.';
    const lain = aktif.find(o => o.peran === 'manager' && o.id !== MANAGER);
    if (lain) return `Hanya ada satu Manager. Jadikan ${lain.pendek} Lead atau Staff.`;
    for (const kode of TIM_LEAD) {
      const lead = aktif.filter(o => o.peran === 'lead' && o.tim === kode);
      if (lead.length > 1) return `Tim ${kode} punya ${lead.length} Lead (${lead.map(o => o.pendek).join(', ')}). Satu tim satu Lead: ubah dulu salah satunya.`;
    }
    for (const o of aktif) {
      if (o.peran !== 'staff') continue;
      const atasan = per.get(o.lead);
      if (atasan && atasan.peran !== 'staff') continue;
      const dulu = daftar.find(x => x.id === o.lead);
      return `Atasan ${o.pendek} harus Lead atau Manager yang aktif.${dulu ? ` ${dulu.pendek} ${dulu.aktif ? 'kini Staff' : 'nonaktif'}: pindahkan dulu staff-nya ke atasan lain.` : ''}`;
    }
    const pendek = new Map();
    for (const o of aktif) {
      const k = o.pendek.toLowerCase();
      if (pendek.has(k)) return `Nama panggilan "${o.pendek}" dipakai ${pendek.get(k)} dan ${o.nama}. Nama panggilan harus unik karena dipakai untuk @sebut.`;
      pendek.set(k, o.nama);
    }
    return '';
  }

  /* Isian mode Dev → baris bersih; galat kalau baris itu atau organogram hasilnya tak sah. */
  function periksaOrang(b, barisLain = []) {
    const x = bersihOrang(b, true);
    const salah = salahOrganogram(susunOrang([...(barisLain || []).filter(r => r && String(r.id).toLowerCase() !== x.id), x]));
    if (salah) throw new Error(salah);
    return x;
  }

  /* Terapkan baris tab orang ke daftar hidup (di tempat) dan Lead tiap tim. Organogram yang
     rusak (mis. tab diubah manual) tak diterapkan: kembali ke bawaan, dan alasannya dikembalikan. */
  function aturOrang(baris) {
    const daftar = susunOrang(baris);
    const salah = salahOrganogram(daftar);
    const pakai = salah ? susunOrang([]) : daftar;
    ORANG.length = 0;
    ORANG_PER_ID.clear();
    NONAKTIF.clear();
    for (const o of pakai) {
      if (o.aktif) { ORANG.push(o); ORANG_PER_ID.set(o.id, o); } else NONAKTIF.set(o.id, o);
    }
    for (const kode of TIM_LEAD) {
      const l = ORANG.find(o => o.peran === 'lead' && o.tim === kode);
      TIM[kode].lead = l ? l.id : MANAGER;
    }
    return salah;
  }
  const nonaktif = () => [...NONAKTIF.values()];

  /* Kode → tahap ADDIE. DV = Development (id 'V'); R = jalur rutin, di luar ADDIE. */
  const tahapDariKode = kode => (/^DV/.test(kode) ? 'V' : /^[ADIE]/.test(kode) ? kode[0] : /^R/.test(kode) ? 'R' : '');
  /* [kode, nama, tim pemilik, direview Manager]. E11 dipegang tim pemilik output yang gagal QC. */
  const SUB_TAHAP = [
    ['A1', 'Intake kebutuhan/request', 'MG', true], ['A2', 'Riset pengguna dan kompetitor', 'AK'],
    ['A3', 'Analisis data dan gap', 'SI'], ['A4', 'Mapping kurikulum/kisi-kisi', 'AK'], ['A5', 'Analisis kebutuhan guru', 'CO'],
    ['A6', 'Penentuan target dan indikator keberhasilan', 'MG', true],
    ['D1', 'Rancangan produk/fitur', 'LA', true], ['D2', 'Blueprint soal', 'AK'], ['D3', 'Rancangan materi dan video', 'CO'],
    ['D4', 'Rancangan sistem/generator/plugin', 'SI'], ['D5', 'Rancangan journey dan Dibimbing', 'LA'], ['D6', 'Panduan/SOP/template', 'LA'],
    ['D7', 'Perencanaan paket TO/latsol', 'LA'],
    ['DV1', 'Produksi soal manual', 'AK'], ['DV2', 'Produksi soal dengan generator', 'AK'], ['DV3', 'Produksi materi/modul', 'CO'],
    ['DV4', 'Produksi video/syuting', 'CO'], ['DV5', 'Editing video/desain kreatif', 'CO'], ['DV6', 'Pengembangan sistem/plugin', 'SI'],
    ['DV7', 'Pembuatan prototype', 'SI'], ['DV8', 'Input ke SIADU/Markaz', 'LA'], ['DV9', 'Migrasi/perbaikan data', 'LA'],
    ['I1', 'Generate paket TO/latsol', 'LA'], ['I2', 'Setup course/category/chapter', 'LA'], ['I3', 'Setup journey/Dibimbing', 'LA'],
    ['I4', 'Show/hide dan publikasi', 'LA'], ['I5', 'Deploy sistem/fitur', 'SI'], ['I6', 'Distribusi pekerjaan ke guru', 'CO'],
    ['I7', 'Pelaksanaan live class', 'LA'], ['I8', 'Komunikasi peluncuran', 'MG', true],
    ['E1', 'QC soal', 'AK'], ['E2', 'QC materi/modul', 'AK'], ['E3', 'QC video', 'CO'], ['E4', 'QC SIADU', 'LA'], ['E5', 'QC Web', 'LA'],
    ['E6', 'QC Android', 'LA'], ['E7', 'QC iOS', 'LA'], ['E8', 'QC akun dan sistem penilaian', 'SI'], ['E9', 'Monitoring dan evaluasi guru', 'CO'],
    ['E10', 'Analisis report/feedback', 'CO'], ['E11', 'Revisi dan validasi ulang', ''], ['E12', 'Final approval dan penutupan', 'MG', true],
    ['R1', 'Rekap & administrasi', 'CO'], ['R2', 'Report berkala', 'CO'], ['R3', 'Show/hide harian', 'LA'], ['R4', 'Pemeliharaan data', 'LA'],
  ].map(([kode, nama, tim, manager]) => ({ kode, nama, tim, reviewManager: !!manager, tahap: tahapDariKode(kode), aktif: true }));
  const SUB_PER_KODE = new Map(SUB_TAHAP.map(s => [s.kode, s]));
  const subTahap = kode => SUB_PER_KODE.get(kode) || null;
  /* Lead yang mendelegasikan task di sub-stage itu (tim pemiliknya). */
  const leadSub = kode => { const s = subTahap(kode); return s && TIM[s.tim] ? TIM[s.tim].lead : ''; };
  const namaSub = kode => { const s = subTahap(kode); return s ? `${s.kode} · ${s.nama}` : ''; };


  /* ---------- Tanggal (YYYY-MM-DD, zona lokal) ---------- */

  const pad2 = n => String(n).padStart(2, '0');
  function isoHari(waktu) {
    if (!waktu) return '';
    const d = new Date(waktu);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  function keTanggal(iso) {
    const [y, m, d] = String(iso).split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  function selisihHari(dari, ke) {
    return Math.round((keTanggal(ke) - keTanggal(dari)) / 864e5);
  }
  function tambahHari(iso, n) {
    const d = keTanggal(iso);
    d.setDate(d.getDate() + n);
    return isoHari(d);
  }

  /* ---------- Keadaan task ---------- */

  const selesai = t => t.status === 'Selesai';
  const aktif = t => !selesai(t);
  const indeks = data => new Map(data.tasks.map(t => [t.id, t]));
  /* Kelompok per indeks — task per proyek, anak per induk — dihitung sekali per indeks. Indeks
     dibuat ulang setiap jumlah task berubah, dan proyek atau induk sebuah task tak berubah
     sesudah dibuat; statusnya tetap dibaca langsung dari objek task-nya. */
  const KELOMPOK = new WeakMap();
  function kelompok(perId) {
    let k = KELOMPOK.get(perId);
    if (!k) {
      k = { proyek: new Map(), anak: new Map() };
      const masuk = (peta, kunci, t) => { if (!peta.has(kunci)) peta.set(kunci, []); peta.get(kunci).push(t); };
      for (const x of perId.values()) {
        if (x.project) masuk(k.proyek, x.project, x);
        if (x.induk) masuk(k.anak, x.induk, x);
      }
      KELOMPOK.set(perId, k);
    }
    return k;
  }
  const anakTask = (perId, id) => kelompok(perId).anak.get(id) || [];
  /* Yang harus selesai dulu sebelum task ini jalan (keputusan user 2026-10-09). Task proyek
     hanya menunggu TAHAP ADDIE sebelumnya di siklus yang sama: task di tahap yang sama — siapa
     pun Lead-nya, apa pun urutan langkah alurnya — dikerjakan paralel. Satu pengecualian: E12
     (final approval & penutupan) menunggu semua task lain di siklusnya, supaya siklus tak
     tertutup selagi masih ada pekerjaan. Task lain (rutin, atau proyek tanpa tahap) tetap
     menunggu task yang tercatat di deps-nya. */
  const tungguTahap = t => t.lane === 'proyek' && !!t.project && URUT_TAHAP.includes(t.stage);
  function pendahuluTahap(t, perId) {
    const ke = URUT_TAHAP.indexOf(t.stage);
    const siklus = t.cycle || 1;
    const tutup = t.sub === 'E12';
    return (kelompok(perId).proyek.get(t.project) || []).filter(x => x !== t && (x.cycle || 1) === siklus
      && URUT_TAHAP.indexOf(x.stage) >= 0 && (tutup ? x.sub !== 'E12' : URUT_TAHAP.indexOf(x.stage) < ke));
  }
  function depsBelum(t, perId) {
    if (!tungguTahap(t)) return (t.deps || []).map(id => perId.get(id)).filter(d => d && !selesai(d));
    return pendahuluTahap(t, perId).filter(aktif);
  }
  /* terhambat = belum bisa dikerjakan sekarang (ditandai tertahan, atau menunggu task
     lain). ditandaiTertahan = hanya yang sengaja ditandai orang dengan alasan; inilah
     yang dihitung sebagai masalah. Menunggu urutan proses itu wajar, bukan masalah. */
  const terhambat = (t, perId) => aktif(t) && (!!t.tertahan || depsBelum(t, perId).length > 0);
  const ditandaiTertahan = t => aktif(t) && !!t.tertahan;
  const telat = (t, hariIni) => aktif(t) && !!t.due && t.due < hariIni;

  /* Siapa yang meninjau task ini sebelum selesai. null = tanpa tinjauan.
     Task rutin tak perlu ditinjau; yang terlanjur Ditinjau (bawaan "Review PM"
     dari v1) diputuskan Manager. Sub-stage bertanda Manager (A1, A6, D1, I8, E12)
     selalu direview Manager; selainnya output staff oleh Lead-nya, output Lead oleh
     Manager. */
  function peninjau(t) {
    if (t.lane !== 'proyek') return t.status === 'Ditinjau' ? MANAGER : null;
    const o = orang(t.pic);
    if (o.peran === 'manager') return null;
    // Task anak ditinjau atasan PIC-nya (Lead yang membaginya), juga untuk sub-stage bertanda Manager.
    if (t.induk && o.peran === 'staff') return o.lead || MANAGER;
    const s = subTahap(t.sub);
    if (s && s.reviewManager) return MANAGER;
    if (o.peran === 'lead') return MANAGER;
    return o.lead || MANAGER;
  }

  function bolehUbah(t, me) {
    const r = orang(me).peran;
    if (r === 'manager' || t.pic === me) return true;
    if (r === 'lead') return orang(t.pic).lead === me || t.assignedBy === me;
    return false;
  }

  /* PIC yang boleh dipilih saat membuat atau mengubah task. Staff hanya dirinya sendiri. */
  function picBoleh(me) {
    const r = orang(me).peran;
    if (r === 'manager') return ORANG.map(o => o.id);
    if (r === 'lead') return [me, ...timDari(me)];
    return ORANG_PER_ID.has(me) ? [me] : [];
  }
  /* Delegasi ke tim pemilik sub-stage (PRD): Lead boleh menyerahkan task ke Lead tim
     yang memiliki sub-stage itu, mis. Andika menyerahkan DV8 Input ke Alya. */
  const picSah = (me, pic, sub) => picBoleh(me).includes(pic) || (orang(me).peran === 'lead' && !!pic && pic === leadSub(sub));
  /* Semua profil boleh menambah task. Staff menambah untuk dirinya sendiri (keputusan user
     2026-10-08, menggantikan "Staff tidak membuat task" di PRD v3). */
  const bolehBuatTask = me => ORANG_PER_ID.has(me);
  /* Sub-stage yang boleh dipakai staff: rutin R1–R4, atau sub-stage proyek milik timnya
     (E11 revisi milik siapa saja), kecuali yang direview Manager. Lead & Manager bebas. */
  function subBolehBagi(me, kode) {
    const s = subTahap(kode);
    if (!s) return false;
    if (orang(me).peran !== 'staff' || s.tahap === 'R') return true;
    const tim = timOrang(me);
    return !s.reviewManager && (s.tim === '' || (!!tim && s.tim === tim.kode));
  }
  /* Form Ubah: Lead/Manager untuk task timnya; staff hanya untuk task yang ia buat sendiri. */
  const bolehUbahTask = (t, me) => bolehUbah(t, me) && (orang(me).peran !== 'staff' || (t.assignedBy === me && t.pic === me));

  /* ---------- Task anak (0.15.0) ----------
     Lead tak menyerahkan task yang ia pegang ke staff. Ia membaginya: membuat task anak untuk
     staff timnya di bawah task itu. Anak ada di proyek, siklus, dan tahap yang sama dengan
     induknya, ditinjau Lead itu, dan tak beranak lagi; induknya baru bisa diajukan atau
     ditandai selesai setelah semua anaknya selesai. */
  const bolehBuatAnak = (t, me) => !!t && !t.induk && t.pic === me && orang(me).peran === 'lead' && aktif(t)
    && t.status !== 'Ditinjau' && jenisJalur(t) !== 'lepas' && timDari(me).length > 0;
  function salahInduk(induk, me, anak) {
    if (!induk) return 'Task induk tidak ditemukan.';
    if (!bolehBuatAnak(induk, me)) return 'Task anak dibuat Lead dari task yang ia pegang sendiri, selama task itu belum diajukan atau selesai.';
    if (!timDari(me).includes(anak.pic)) return 'Task anak untuk staff tim Anda sendiri.';
    if ((induk.project || '') !== (anak.project || '')) return 'Task anak ada di proyek yang sama dengan induknya.';
    if (induk.project && ((induk.cycle || 1) !== anak.cycle || induk.stage !== anak.stage)) {
      return `Task anak ada di tahap yang sama dengan induknya (${namaTahap(induk.stage)}).`;
    }
    return '';
  }

  const potong = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1).trimEnd() + '…' : String(s));

  /* Alasan task belum bisa jalan, dalam kalimat untuk layar. */
  function alasanTunggu(t, perId) {
    if (t.tertahan) return 'Tertahan: ' + (t.alasanTertahan || 'tanpa alasan');
    const d = depsBelum(t, perId);
    if (d.length && tungguTahap(t)) {
      const tahap = URUT_TAHAP.find(s => d.some(x => x.stage === s));
      const satu = d.find(x => x.stage === tahap && !x.induk) || d.find(x => x.stage === tahap);
      return `Menunggu tahap ${namaTahap(tahap)} selesai: ${satu.id} "${potong(satu.title, 40)}" (${orang(satu.pic).pendek})${d.length > 1 ? ` dan ${d.length - 1} task lain` : ''}`;
    }
    if (d.length) return 'Menunggu ' + d.map(x => `${x.id} "${potong(x.title, 48)}" (${orang(x.pic).pendek})`).join(', ');
    if (t.status === 'Ditinjau') return 'Menunggu tinjauan ' + orang(peninjau(t) || MANAGER).pendek;
    return '';
  }

  /* Syarat sebelum output task proyek diajukan ke gate (PRD): output terisi, ada tautan
     bukti, semua sub-task dan task anak beres, tahap sebelumnya (atau task yang ditunggu)
     selesai, dan tidak tertahan. */
  function syaratAjukan(t, perId) {
    const anak = t.id ? anakTask(perId, t.id) : [];
    return [
      { kunci: 'output', label: 'Output terisi', ok: !!String(t.output || '').trim() },
      { kunci: 'bukti', label: 'Minimal satu tautan bukti', ok: (t.evidence || []).some(e => /^https?:\/\//i.test(String(e.url || ''))) },
      { kunci: 'sub', label: 'Semua sub-task selesai', ok: (t.subtasks || []).every(s => s.done) },
      ...(anak.length ? [{ kunci: 'anak', label: `Semua task anak selesai (${anak.filter(selesai).length}/${anak.length})`, ok: anak.every(selesai) }] : []),
      { kunci: 'deps', label: tungguTahap(t) ? 'Tahap sebelumnya sudah selesai' : 'Task yang ditunggu sudah selesai', ok: depsBelum(t, perId).length === 0 },
      { kunci: 'tahan', label: 'Tidak sedang tertahan', ok: !t.tertahan },
    ];
  }
  const perluSyarat = t => t.lane === 'proyek';

  /* Keadaan yang di PRD berupa status sendiri (Ready, Revision, Blocked), di sini dihitung:
     orang cukup menggerakkan empat status, sisanya terbaca otomatis. */
  function labelKeadaan(t, perId) {
    if (selesai(t)) return '';
    if (t.tertahan) return 'Tertahan';
    if (t.status === 'Dikerjakan') {
      const akhir = (t.tinjauan || []).reduce((a, r) => (!a || r.at >= a.at ? r : a), null);
      return akhir && akhir.action === 'Dikembalikan' ? 'Revisi' : '';
    }
    if (t.status === 'Antre') return depsBelum(t, perId).length ? 'Menunggu' : 'Siap';
    return '';
  }

  /* ---------- Aksi pada task ---------- */

  /* Daftar aksi yang tersedia bagi `me`, sudah dengan alasan kalau nonaktif. */
  function aksiUntuk(t, me, perId) {
    const tinjau = peninjau(t);
    if (selesai(t)) {
      if (!bolehUbah(t, me)) return [];
      // Task anak tak dibuka lagi selagi induknya sedang ditinjau atau sudah selesai.
      const induk = t.induk ? perId.get(t.induk) : null;
      const kunci = !!induk && (selesai(induk) || induk.status === 'Ditinjau');
      return [{ kunci: 'buka', label: 'Buka kembali', nonaktif: kunci,
        alasan: kunci ? `Induknya ${induk.id} ${selesai(induk) ? 'sudah selesai' : 'sedang ditinjau'}: buka kembali atau kembalikan induknya dulu.` : '' }];
    }
    if (t.status === 'Ditinjau') {
      const daftar = [];
      if (me === tinjau || orang(me).peran === 'manager') {
        daftar.push({ kunci: 'setujui', label: 'Setujui', utama: true }, { kunci: 'kembalikan', label: 'Kembalikan', perluCatatan: true });
      }
      if (t.pic === me) daftar.push({ kunci: 'tarik', label: 'Tarik dari tinjauan' });
      return daftar;
    }
    if (!bolehUbah(t, me)) return [];
    const hambat = depsBelum(t, perId);
    const daftar = [];
    if (t.status === 'Antre') {
      const alasan = t.tertahan ? 'Lepas tanda tertahan dulu' : hambat.length ? alasanTunggu(t, perId) : '';
      daftar.push({ kunci: 'mulai', label: 'Mulai kerjakan', utama: true, nonaktif: !!alasan, alasan });
    }
    if (t.status === 'Dikerjakan') {
      let alasan = t.tertahan ? 'Lepas tanda tertahan dulu' : '';
      if (!alasan && perluSyarat(t)) {
        const kurang = syaratAjukan(t, perId).filter(s => !s.ok).map(s => s.label.toLowerCase());
        if (kurang.length) alasan = 'Lengkapi dulu: ' + kurang.join(', ');
      } else if (!alasan) {
        const buka = anakTask(perId, t.id).filter(aktif);
        if (buka.length) alasan = 'Selesaikan dulu task anaknya: ' + buka.map(x => x.id).join(', ');
      }
      daftar.push(tinjau
        ? { kunci: 'ajukan', label: 'Ajukan tinjau ke ' + orang(tinjau).pendek, utama: true, nonaktif: !!alasan, alasan }
        : { kunci: 'selesai', label: 'Tandai selesai', utama: true, nonaktif: !!alasan, alasan });
    }
    daftar.push(t.tertahan
      ? { kunci: 'lanjutkan', label: 'Lepas tanda tertahan' }
      : { kunci: 'tahan', label: 'Tandai tertahan', perluCatatan: true });
    return daftar;
  }

  const DESKRIPSI = {
    mulai: 'Mulai dikerjakan',
    ajukan: 'Diajukan untuk ditinjau',
    selesai: 'Ditandai selesai',
    setujui: 'Disetujui, selesai',
    kembalikan: 'Dikembalikan',
    tarik: 'Ditarik dari tinjauan',
    buka: 'Dibuka kembali',
    tahan: 'Ditandai tertahan',
    lanjutkan: 'Tanda tertahan dilepas',
  };

  /* Menjalankan aksi. Melempar galat kalau aksi itu tak tersedia bagi `me`. */
  function terapkanAksi(data, t, kunci, me, waktu, catatan) {
    const perId = indeks(data);
    const a = aksiUntuk(t, me, perId).find(x => x.kunci === kunci);
    if (!a) throw new Error('Aksi ini tidak tersedia untuk Anda.');
    if (a.nonaktif) throw new Error(a.alasan);
    const teks = String(catatan || '').trim();
    if (a.perluCatatan && !teks) throw new Error('Tulis alasannya dulu.');
    const catatTinjau = action => t.tinjauan.push({ id: 'r' + waktu + t.tinjauan.length, by: me, action, note: teks, at: waktu });

    switch (kunci) {
      case 'mulai': t.status = 'Dikerjakan'; break;
      case 'ajukan': t.status = 'Ditinjau'; catatTinjau('Diajukan'); break;
      case 'selesai': t.status = 'Selesai'; t.selesaiAt = waktu; break;
      case 'setujui': t.status = 'Selesai'; t.selesaiAt = waktu; catatTinjau('Disetujui'); break;
      case 'kembalikan': t.status = 'Dikerjakan'; catatTinjau('Dikembalikan'); break;
      case 'tarik': t.status = 'Dikerjakan'; catatTinjau('Ditarik'); break;
      case 'buka': t.status = 'Dikerjakan'; t.selesaiAt = 0; break;
      case 'tahan': t.tertahan = true; t.alasanTertahan = teks; break;
      case 'lanjutkan': t.tertahan = false; t.alasanTertahan = ''; break;
    }
    t.updatedAt = waktu;
    catatLog(data, ['ajukan', 'setujui', 'kembalikan', 'tarik'].includes(kunci) ? 'tinjau' : 'update',
      `${t.id} · ${t.title}`, DESKRIPSI[kunci] + (teks ? ': ' + teks : ''), me, waktu);
  }

  /* Pindah kolom di papan → aksi yang setara. */
  function aksiPindah(t, ke, me, perId) {
    const dari = t.status;
    const peta = {
      'Antre>Dikerjakan': 'mulai',
      'Dikerjakan>Ditinjau': 'ajukan',
      'Dikerjakan>Selesai': peninjau(t) ? null : 'selesai',
      'Ditinjau>Selesai': 'setujui',
      'Ditinjau>Dikerjakan': t.pic === me && me !== peninjau(t) ? 'tarik' : 'kembalikan',
      'Selesai>Dikerjakan': 'buka',
    };
    const kunci = peta[dari + '>' + ke];
    if (kunci === null) return { galat: 'Task proyek perlu ditinjau ' + orang(peninjau(t)).pendek + ' dulu. Pindahkan ke Ditinjau.' };
    if (!kunci) return { galat: `Tidak bisa memindah dari ${dari} ke ${ke}.` };
    const a = aksiUntuk(t, me, perId).find(x => x.kunci === kunci);
    if (!a) return { galat: 'Anda tidak bisa memindah task ini.' };
    if (a.nonaktif) return { galat: a.alasan };
    return { kunci, perluCatatan: !!a.perluCatatan };
  }

  function catatLog(data, type, task, detail, by, at) {
    data.log.unshift({ id: 'l' + at + data.log.length, type, task, detail, by, at });
    if (data.log.length > 1000) data.log.length = 1000;
  }

  /* ---------- Membuat task & proyek ---------- */

  function nomorBerikut(daftar, awalan) {
    let n = 0;
    for (const x of daftar) {
      const m = new RegExp('^' + awalan + '-(\\d+)$').exec(x.id);
      if (m) n = Math.max(n, Number(m[1]));
    }
    return n + 1;
  }

  /* Task proyek wajib bersub-stage ADDIE (tahapnya ikut kode, lalu terkunci); task di
     luar proyek adalah jalur rutin, bersub-stage R1–R4. */
  function taskBaru(data, f, me, waktu, hariIni) {
    const p = f.project ? data.projects.find(x => x.id === f.project) : null;
    if (f.project && !p) throw new Error('Proyek tidak ditemukan.');
    if (!String(f.title || '').trim()) throw new Error('Judul task wajib diisi.');
    const s = subTahap(f.sub);
    if (p && (!s || s.tahap === 'R')) throw new Error('Pilih sub-stage ADDIE untuk task proyek.');
    if (!p && s && s.tahap !== 'R') throw new Error('Task di luar proyek memakai sub-stage rutin (kode R).');
    if (!bolehBuatTask(me)) throw new Error('Pilih profil dulu.');
    if (orang(me).peran === 'staff') {
      if (f.pic !== me) throw new Error('Staff menambah task untuk dirinya sendiri. Penyerahan ke orang lain lewat Lead.');
      if (s && !subBolehBagi(me, s.kode)) throw new Error(`${s.kode} dipegang tim lain atau direview Manager. Staff memakai sub-stage milik timnya sendiri.`);
    }
    if (!picSah(me, f.pic, f.sub)) throw new Error('PIC itu di luar tim Anda, dan bukan Lead tim pemilik sub-stage ini.');
    const pInduk = teks(f.induk) ? data.tasks.find(x => x.id === teks(f.induk)) || null : null;
    if (teks(f.induk)) {
      const salah = salahInduk(pInduk, me, { pic: f.pic, project: p ? p.id : '', cycle: p ? p.cycle || 1 : 1, stage: p ? s.tahap : '' });
      if (salah) throw new Error(salah);
    }
    const t = {
      id: 'PRD-' + String(nomorBerikut(data.tasks, 'PRD')).padStart(3, '0'),
      project: p ? p.id : '', lane: p ? 'proyek' : 'rutin', kategori: p ? '' : (s ? s.nama : f.kategori || 'Umum'),
      title: String(f.title).trim(), platform: f.platform || (p ? p.platform : 'All Platform'),
      stage: p ? s.tahap : '', sub: s ? s.kode : '', detail: String(f.detail || '').trim(),
      pic: f.pic, support: (f.support || []).filter(x => x !== f.pic), priority: f.priority || 'Normal',
      start: hariIni, due: f.due || '', status: 'Antre', tertahan: false, alasanTertahan: '',
      output: String(f.output || '').trim(), deps: (f.deps || []).slice(), notes: '', assignedBy: me, cycle: p ? p.cycle || 1 : 1, induk: pInduk ? pInduk.id : '',
      createdAt: waktu, updatedAt: waktu, selesaiAt: 0,
      subtasks: [], comments: [], tinjauan: [], evidence: [],
    };
    data.tasks.unshift(t);
    catatLog(data, 'create', `${t.id} · ${t.title}`, `Dibuat untuk ${orang(t.pic).pendek}${s ? ' · ' + s.kode : ''}${pInduk ? ' · task anak ' + pInduk.id : ''}`, me, waktu);
    // Membagi task yang masih antre (dan tak menunggu apa pun) sekaligus memulainya.
    if (pInduk && pInduk.status === 'Antre' && !pInduk.tertahan && !depsBelum(pInduk, indeks(data)).length) {
      pInduk.status = 'Dikerjakan';
      pInduk.updatedAt = waktu;
      catatLog(data, 'update', `${pInduk.id} · ${pInduk.title}`, 'Mulai dikerjakan: dibagi ke task anak', me, waktu);
    }
    return t;
  }

  /* Task anak dari detail task induk: sub-stage, proyek, siklus, dan platform ikut induknya. */
  function taskAnak(data, induk, f, me, waktu, hariIni) {
    const salah = salahInduk(induk, me, { pic: f.pic, project: induk ? induk.project || '' : '', cycle: induk ? induk.cycle || 1 : 1, stage: induk ? induk.stage : '' });
    if (salah) throw new Error(salah);
    return taskBaru(data, {
      title: f.title, project: induk.project, sub: induk.sub, pic: f.pic, due: f.due, priority: f.priority || induk.priority,
      platform: induk.platform, detail: f.detail, kategori: induk.kategori, induk: induk.id,
    }, me, waktu, hariIni);
  }

  /* Sub-task (daftar periksa di dalam task): ditambah, diubah, dan dihapus PIC task, Lead-nya,
     atau Manager. */
  function cariSubtask(t, id) {
    const s = (t.subtasks || []).find(x => x.id === id);
    if (!s) throw new Error('Sub-task tidak ditemukan.');
    return s;
  }
  function tambahSubtask(data, t, f, me, waktu) {
    if (!bolehUbah(t, me)) throw new Error('Hanya PIC, Lead-nya, atau Manager yang mengatur sub-task.');
    const judul = teks(f.title).slice(0, 200);
    if (!judul) throw new Error('Judul sub-task wajib diisi.');
    const s = { id: `s${waktu}-${t.subtasks.length}`, title: judul, pic: teks(f.pic) || t.pic, due: '', done: false };
    t.subtasks.push(s);
    t.updatedAt = waktu;
    catatLog(data, 'update', `${t.id} · ${t.title}`, 'Sub-task ditambah: ' + judul, me, waktu);
    return s;
  }
  function ubahSubtask(data, t, id, f, me, waktu) {
    if (!bolehUbah(t, me)) throw new Error('Hanya PIC, Lead-nya, atau Manager yang mengatur sub-task.');
    const s = cariSubtask(t, id);
    const judul = f.title === undefined ? s.title : teks(f.title).slice(0, 200);
    if (!judul) throw new Error('Judul sub-task wajib diisi.');
    const lama = s.title;
    s.title = judul;
    if (f.pic !== undefined) s.pic = teks(f.pic) || t.pic;
    t.updatedAt = waktu;
    catatLog(data, 'update', `${t.id} · ${t.title}`, 'Sub-task diubah: ' + (lama === judul ? judul : `${lama} → ${judul}`), me, waktu);
    return s;
  }
  function hapusSubtask(data, t, id, me, waktu) {
    if (!bolehUbah(t, me)) throw new Error('Hanya PIC, Lead-nya, atau Manager yang mengatur sub-task.');
    const s = cariSubtask(t, id);
    t.subtasks.splice(t.subtasks.indexOf(s), 1);
    t.updatedAt = waktu;
    catatLog(data, 'update', `${t.id} · ${t.title}`, 'Sub-task dihapus: ' + s.title, me, waktu);
    return s;
  }
  /* Mencentang juga boleh PIC sub-task itu sendiri. */
  function centangSubtask(data, t, id, done, me, waktu) {
    const s = cariSubtask(t, id);
    if (!bolehUbah(t, me) && s.pic !== me) throw new Error('Hanya PIC sub-task, PIC task, Lead-nya, atau Manager yang mencentangnya.');
    s.done = !!done;
    t.updatedAt = waktu;
    catatLog(data, 'update', `${t.id} · ${t.title}`, `Sub-task ${s.done ? 'selesai' : 'dibuka lagi'}: ${s.title}`, me, waktu);
    return s;
  }

  /* Output dan tautan bukti diisi PIC sendiri (staff juga), Lead timnya, atau Manager. */
  function isiOutput(data, t, isi, me, waktu) {
    if (!bolehUbah(t, me)) throw new Error('Hanya PIC, Lead-nya, atau Manager yang mengisi output.');
    t.output = String(isi == null ? '' : isi).trim();
    t.updatedAt = waktu;
    catatLog(data, 'update', `${t.id} · ${t.title}`, t.output ? 'Output diisi: ' + potong(t.output, 100) : 'Output dikosongkan', me, waktu);
  }
  function tambahBukti(data, t, f, me, waktu) {
    if (!bolehUbah(t, me)) throw new Error('Hanya PIC, Lead-nya, atau Manager yang menambah bukti.');
    const url = tautanRapi(f.url);
    if (!url) throw new Error('Alamat bukti tidak valid. Contoh: https://docs.google.com/…');
    const e = { id: `e${waktu}-${t.evidence.length}`, label: String(f.label || '').trim() || judulTautan(url), url };
    t.evidence.push(e);
    t.updatedAt = waktu;
    catatLog(data, 'update', `${t.id} · ${t.title}`, 'Bukti ditambah: ' + e.label, me, waktu);
    return e;
  }
  function hapusBukti(data, t, id, me, waktu) {
    if (!bolehUbah(t, me)) throw new Error('Hanya PIC, Lead-nya, atau Manager yang menghapus bukti.');
    const i = t.evidence.findIndex(e => e.id === id);
    if (i < 0) throw new Error('Bukti tidak ditemukan.');
    const [e] = t.evidence.splice(i, 1);
    t.updatedAt = waktu;
    catatLog(data, 'update', `${t.id} · ${t.title}`, 'Bukti dihapus: ' + e.label, me, waktu);
  }

  /* Mengubah task (Lead/Manager; staff hanya task yang ia buat sendiri — selain itu staff
     mengisi output & bukti dari detail). Sub-stage task proyek tetap ADDIE dan tahapnya ikut
     kode; di luar proyek R1–R4, kecuali kode ADDIE task "lepas" warisan v1 yang boleh
     dipertahankan. Mengganti PIC = mendelegasikan: ke anggota tim sendiri, atau ke Lead tim
     pemilik sub-stage-nya. Staff tak bisa mengganti PIC. */
  function ubahTask(data, t, f, me, waktu) {
    if (!bolehUbahTask(t, me)) throw new Error('Hanya Lead atau Manager yang mengubah task ini; staff hanya task yang ia buat sendiri.');
    const ambil = (k, lama) => (f[k] === undefined ? lama : f[k]);
    const judul = teks(ambil('title', t.title));
    if (!judul) throw new Error('Judul task wajib diisi.');
    const kode = teks(ambil('sub', t.sub));
    const s = subTahap(kode);
    if (kode && !s) throw new Error('Sub-stage tidak dikenal.');
    if (kode !== t.sub && s && !subBolehBagi(me, kode)) throw new Error(`${kode} dipegang tim lain atau direview Manager. Staff memakai sub-stage milik timnya sendiri.`);
    if (t.lane === 'proyek' && (!s || s.tahap === 'R')) throw new Error('Pilih sub-stage ADDIE untuk task proyek.');
    if (t.lane !== 'proyek' && s && s.tahap !== 'R' && kode !== t.sub) throw new Error('Task di luar proyek memakai sub-stage rutin (kode R).');
    const pic = teks(ambil('pic', t.pic));
    if (pic !== t.pic && !picSah(me, pic, kode)) throw new Error('PIC itu di luar tim Anda, dan bukan Lead tim pemilik sub-stage ini.');
    // 0.15.0: task Lead tak diserahkan ke staff — dibagi lewat task anak. Induk dan anaknya
    // tetap di tahap yang sama, dan induk yang sudah dibagi tetap dipegang PIC-nya.
    const anak = data.tasks.filter(x => x.induk === t.id);
    const induk = t.induk ? data.tasks.find(x => x.id === t.induk) || null : null;
    if (pic !== t.pic && orang(t.pic).peran === 'lead' && orang(pic).peran === 'staff') {
      throw new Error('Task Lead tak diserahkan ke staff. Buat task anak untuk staff dari detail task-nya.');
    }
    if (pic !== t.pic && anak.length) throw new Error('Task ini sudah dibagi ke task anak, jadi PIC-nya tetap.');
    if (pic !== t.pic && induk && !timDari(induk.pic).includes(pic)) throw new Error(`PIC task anak dipilih dari staff tim ${orang(induk.pic).pendek}.`);
    if (t.lane === 'proyek' && s && s.tahap !== t.stage && (anak.length || induk)) {
      throw new Error(`Task ${induk ? 'anak' : 'induk'} tetap di tahap ${namaTahap(t.stage)}, sama dengan ${induk ? 'induknya' : 'task anaknya'}.`);
    }
    const ubah = [];
    if (kode !== t.sub) {
      ubah.push(`sub-stage ${t.sub || '—'} → ${kode || '—'}`);
      t.sub = kode;
      if (t.lane === 'proyek') t.stage = s.tahap;
      else if (s) t.kategori = s.nama;
    }
    if (pic !== t.pic) { ubah.push('diserahkan ke ' + orang(pic).pendek); t.pic = pic; }
    Object.assign(t, {
      title: judul, due: teks(ambil('due', t.due)), priority: teks(ambil('priority', t.priority)) || 'Normal',
      output: teks(ambil('output', t.output)), detail: teks(ambil('detail', t.detail)), updatedAt: waktu,
    });
    t.support = (t.support || []).filter(x => x !== t.pic);
    catatLog(data, 'update', `${t.id} · ${t.title}`, ubah.length ? 'Diubah: ' + ubah.join(', ') : 'Detail task diubah', me, waktu);
    return t;
  }

  /* Proyek tidak punya Lead tetap (PRD 7 Okt): tanggung jawabnya mengikuti tim pemilik
     sub-stage task-task di dalamnya. */
  function proyekBaru(data, f, me, waktu) {
    if (orang(me).peran !== 'manager') throw new Error('Hanya Manager yang membuat proyek.');
    if (!String(f.name || '').trim()) throw new Error('Nama proyek wajib diisi.');
    const p = {
      id: 'PRJ-' + nomorBerikut(data.projects, 'PRJ'), name: String(f.name).trim(), platform: f.platform || 'All Platform',
      stage: 'A', cycle: 1, decision: 'Build', goal: String(f.goal || '').trim(), lead: '', arsip: false, paket: '', history: [],
    };
    data.projects.unshift(p);
    catatLog(data, 'create', `${p.id} · ${p.name}`, 'Proyek dibuat', me, waktu);
    return p;
  }

  /* Tim yang memegang task terbuka sebuah proyek — pengganti "Lead proyek". */
  function timProyek(data, p) {
    const kode = new Set();
    for (const t of data.tasks) {
      if (t.project !== p.id || selesai(t)) continue;
      const s = subTahap(t.sub);
      const tim = s && s.tim ? s.tim : (timOrang(t.pic) || {}).kode;
      if (tim) kode.add(tim);
    }
    return Object.keys(TIM).filter(k => kode.has(k));
  }

  /* ---------- Proyek & gate ---------- */

  const namaTahap = id => (TAHAP.find(x => x.id === id) || { nama: '—' }).nama;
  const tahapBerikut = id => ({ A: 'D', D: 'V', V: 'I', I: 'E', E: 'A' })[id] || 'A';

  const URUT_TAHAP = TAHAP.map(x => x.id);
  const tugasSiklus = (data, p) => data.tasks.filter(t => t.project === p.id && (t.cycle || 1) === (p.cycle || 1) && URUT_TAHAP.includes(t.stage));

  /* Tahap proyek dihitung, tak diputuskan (PRD 7 Okt): tahap task terbuka paling awal di
     siklus aktif. Kalau semuanya selesai, tahap terakhir yang pernah dikerjakan. */
  function tahapDihitung(data, p) {
    const kini = tugasSiklus(data, p);
    const buka = kini.filter(aktif);
    if (buka.length) return URUT_TAHAP.find(s => buka.some(t => t.stage === s));
    if (kini.length) return [...URUT_TAHAP].reverse().find(s => kini.some(t => t.stage === s));
    return p.stage || 'A';
  }

  /* Menyamakan tahap tersimpan dengan hasil hitungan, dan mencatat perpindahannya di
     riwayat tahap proyek. Dipanggil setiap kali data berubah. */
  function segarkanTahap(data, waktu, oleh = '') {
    const pindah = [];
    for (const p of data.projects) {
      const baru = tahapDihitung(data, p);
      if (baru === p.stage) continue;
      const dari = p.stage;
      p.stage = baru;
      if (!waktu) continue;
      p.history = p.history || [];
      // oleh = orang yang tindakannya memicu perpindahan ini (mis. yang menyetujui task terakhir).
      p.history.unshift({ jenis: 'otomatis', dari, ke: baru, siklus: p.cycle || 1, oleh, at: waktu });
      catatLog(data, 'gate', `${p.id} · ${p.name}`, `Tahap berpindah otomatis: ${namaTahap(dari)} → ${namaTahap(baru)}`, oleh, waktu);
      pindah.push(p);
    }
    return pindah;
  }

  /* Siklus ditutup oleh task E12 · Final approval yang sudah disetujui (bukan task anaknya). */
  const penutupSiklus = t => t.sub === 'E12' && !t.induk && selesai(t);
  const siklusTutup = (data, p) => tugasSiklus(data, p).some(penutupSiklus);

  function ringkasProyek(data, p, hariIni, perId = indeks(data)) {
    const milik = data.tasks.filter(t => t.project === p.id);
    const siklus = milik.filter(t => (t.cycle || 1) === (p.cycle || 1));
    const kini = siklus.filter(t => t.stage === p.stage);
    const buka = siklus.filter(aktif);
    const nTelat = buka.filter(t => telat(t, hariIni) && !t.tertahan).length;
    const nTertahan = buka.filter(ditandaiTertahan).length;
    const ditahan = p.decision === 'Hold';
    const tutup = siklusTutup(data, p);
    const siapMaju = !p.arsip && !ditahan && tutup;
    const keadaan = p.arsip ? 'arsip' : ditahan ? 'ditahan' : tutup ? 'tunggu' : !siklus.length ? 'kosong'
      : !buka.length ? 'sepi' : (nTelat || nTertahan) ? 'risiko' : 'aman';
    const tenggat = milik.filter(aktif).map(t => t.due).filter(Boolean).sort().pop() || '';
    return {
      total: kini.length, selesai: kini.filter(selesai).length, telat: nTelat, tertahan: nTertahan, siapMaju, keadaan, tenggat,
      buka: buka.length, tutup, semua: milik.length, semuaSelesai: milik.filter(selesai).length,
    };
  }

  /* Antrean keputusan Manager: proyek yang siklusnya sudah ditutup E12. */
  const antreKeputusan = (data, hariIni) => {
    const perId = indeks(data);
    return data.projects.filter(p => ringkasProyek(data, p, hariIni, perId).siapMaju);
  };

  /* Sesudah E12 disetujui, Manager memulai siklus berikutnya: kembali ke Analysis. */
  function mulaiSiklus(data, p, me, waktu) {
    if (orang(me).peran !== 'manager') throw new Error('Hanya Manager yang memulai siklus baru.');
    if (!siklusTutup(data, p)) throw new Error('Siklus ditutup lewat task E12 · Final approval yang sudah disetujui.');
    const dari = p.cycle || 1;
    p.cycle = dari + 1;
    p.history = p.history || [];
    p.history.unshift({ jenis: 'siklus', dari: p.stage, ke: 'A', siklus: p.cycle, oleh: me, at: waktu });
    p.stage = 'A';
    catatLog(data, 'gate', `${p.id} · ${p.name}`, `Siklus ${dari} ditutup, siklus ${p.cycle} dimulai di Analysis`, me, waktu);
  }

  /* Keputusan proyek (PRD: dicatat di gate Analysis). Hold juga menahan proyek. */
  const KEPUTUSAN = ['Build', 'Improve', 'Maintain', 'Hold'];
  function setKeputusan(data, p, keputusan, me, waktu) {
    if (orang(me).peran !== 'manager') throw new Error('Hanya Manager yang memutuskan.');
    if (!KEPUTUSAN.includes(keputusan)) throw new Error('Keputusan tidak dikenal.');
    p.decision = keputusan;
    catatLog(data, 'gate', `${p.id} · ${p.name}`, keputusan === 'Hold' ? 'Proyek ditahan' : `Keputusan proyek: ${keputusan}`, me, waktu);
  }

  /* Proyek yang seluruh pekerjaannya sudah selesai (termasuk kolaborasi v1 yang
     tuntas) diarsipkan: tak muncul di daftar aktif maupun antrean keputusan. */
  function setArsip(data, p, arsip, me, waktu) {
    if (orang(me).peran !== 'manager') throw new Error('Hanya Manager yang mengarsipkan proyek.');
    p.arsip = !!arsip;
    catatLog(data, 'gate', `${p.id} · ${p.name}`, arsip ? 'Proyek diarsipkan' : 'Proyek diaktifkan lagi', me, waktu);
  }

  /* ---------- Hari Ini ---------- */

  const urutTenggat = (a, b) => (a.t.due || '9999').localeCompare(b.t.due || '9999') || a.t.id.localeCompare(b.t.id);

  function pekerjaanSaya(data, me, hariIni) {
    const perId = indeks(data);
    const mau = (t, alasan = '') => ({ t, alasan });
    const milik = data.tasks.filter(t => t.pic === me && aktif(t));
    const tunggu = milik.filter(t => terhambat(t, perId) || t.status === 'Ditinjau');
    /* Antrean tim (PRD): langkah proyek milik tim Lead ini yang sudah bisa dimulai, tetapi
       belum dimulai dan belum dibagi ke staff lewat task anak. */
    const antrean = orang(me).peran === 'lead' && timDari(me).length
      ? milik.filter(t => t.lane === 'proyek' && t.status === 'Antre' && !tunggu.includes(t) && leadSub(t.sub) === me
        && !anakTask(perId, t.id).length) : [];
    const jalan = milik.filter(t => !tunggu.includes(t) && !antrean.includes(t));
    const batasMinggu = tambahHari(hariIni, 7);

    const grup = [
      ['tinjau', 'Perlu Anda tinjau', data.tasks.filter(t => t.status === 'Ditinjau' && peninjau(t) === me).map(t => mau(t, 'Dari ' + orang(t.pic).pendek))],
      ['antrean', 'Antrean tim · siap dibagi', antrean.map(t => mau(t, `${namaSub(t.sub)} siap. Kerjakan sendiri, atau bagi ke staff lewat task anak di detail task.`))],
      ['telat', 'Terlambat', jalan.filter(t => t.due && t.due < hariIni).map(t => mau(t))],
      ['hari', 'Hari ini', jalan.filter(t => t.due === hariIni).map(t => mau(t))],
      ['minggu', '7 hari ke depan', jalan.filter(t => t.due > hariIni && t.due <= batasMinggu).map(t => mau(t))],
      ['nanti', 'Nanti', jalan.filter(t => !t.due || t.due > batasMinggu).map(t => mau(t))],
      ['sub', 'Sub-task untuk saya', data.tasks.filter(t => aktif(t) && t.pic !== me)
        .flatMap(t => t.subtasks.filter(s => !s.done && s.pic === me).map(s => mau(t, 'Sub-task: ' + s.title)))],
      ['tunggu', 'Belum bisa dikerjakan', tunggu.map(t => mau(t, alasanTunggu(t, perId)))],
      ['bantu', 'Saya bantu', data.tasks.filter(t => aktif(t) && t.pic !== me && (t.support || []).includes(me)).map(t => mau(t, 'PIC: ' + orang(t.pic).pendek))],
    ];
    const selesaiHariIni = data.tasks.filter(t => t.pic === me && selesai(t) && isoHari(t.selesaiAt) === hariIni);
    return {
      grup: grup.map(([kunci, judul, isi]) => ({ kunci, judul, isi: isi.sort(urutTenggat) })).filter(g => g.isi.length),
      selesaiHariIni,
    };
  }

  /* Ringkasan untuk Lead (timnya) dan Manager (seluruh divisi). */
  function perhatian(data, ids, me, hariIni) {
    const dalam = t => !ids || ids.includes(t.pic);
    return {
      tinjau: data.tasks.filter(t => t.status === 'Ditinjau' && peninjau(t) === me).length,
      tertahan: data.tasks.filter(t => dalam(t) && ditandaiTertahan(t)).length,
      telat: data.tasks.filter(t => dalam(t) && telat(t, hariIni) && !t.tertahan).length,
      aktif: data.tasks.filter(t => dalam(t) && aktif(t)).length,
    };
  }

  /* ---------- Papan ---------- */

  /* Lingkup yang boleh dilihat per peran (keputusan user 2026-10-08): Staff hanya dirinya;
     Lead dirinya dan timnya; Manager dirinya, timnya (para Lead), dan seluruh divisi.
     Lingkup yang tak boleh (mis. tersimpan dari profil lain) jatuh ke bawaan perannya. */
  const LINGKUP_PERAN = { staff: ['saya'], lead: ['saya', 'tim'], manager: ['saya', 'tim', 'semua'] };
  const LINGKUP_AWAL = { staff: 'saya', lead: 'tim', manager: 'semua' };
  const lingkupBoleh = me => LINGKUP_PERAN[orang(me).peran] || ['saya'];
  const lingkupAwal = me => LINGKUP_AWAL[orang(me).peran] || 'saya';
  const lingkupSah = (me, lingkup) => (lingkupBoleh(me).includes(lingkup) ? lingkup : lingkupAwal(me));

  /* null = tanpa batas orang. Tim = dirinya + bawahan langsungnya: staff bagi Lead, para Lead bagi Manager. */
  function lingkupOrang(me, lingkup) {
    const l = lingkupSah(me, lingkup);
    if (l === 'saya') return [me];
    if (l === 'semua') return null;
    return [me, ...ORANG.filter(o => o.lead === me).map(o => o.id)];
  }

  /* Tim pemilik sebuah task: dari sub-stage-nya; kalau tak berkode, tim PIC-nya. */
  const timTask = t => { const s = subTahap(t.sub); return (s && s.tim) || (timOrang(t.pic) || {}).kode || ''; };
  /* proyek = di dalam proyek · rutin = R1–R4 (atau belum berkode) · lepas = pekerjaan produk
     di luar proyek. "Lepas" hanya ada di data warisan v1; task baru di luar proyek selalu rutin. */
  function jenisJalur(t) {
    if (t.lane === 'proyek') return 'proyek';
    const s = subTahap(t.sub);
    return s && s.tahap !== 'R' ? 'lepas' : 'rutin';
  }

  /* Saringan bersama semua tampilan Task (Daftar, Kanban, Per orang, Timeline, Kalender).
     f.q mencari di ID, judul, PIC, platform, kategori, sub-stage, dan nama proyek. */
  function saring(data, f, hariIni, perId) {
    const kata = String(f.q || '').trim().toLowerCase();
    const namaProyek = kata ? new Map(data.projects.map(p => [p.id, p.name])) : null;
    const cocok = t => [t.id, t.title, orang(t.pic).nama, t.platform, t.kategori, t.sub, namaProyek.get(t.project) || '']
      .join(' ').toLowerCase().includes(kata);
    return data.tasks.filter(t => (!kata || cocok(t))
      && (!f.orang || f.orang.includes(t.pic))
      && (!f.proyek || t.project === f.proyek)
      && (!f.jalur || jenisJalur(t) === f.jalur)
      && (!f.platform || t.platform === f.platform)
      && (!f.tim || timTask(t) === f.tim)
      && (!f.tahap || (f.tahap === 'R' ? jenisJalur(t) === 'rutin' : t.stage === f.tahap))
      && (!f.sub || t.sub === f.sub)
      && (!f.fokus
        || (f.fokus === 'telat' && telat(t, hariIni) && !t.tertahan)
        || (f.fokus === 'tertahan' && ditandaiTertahan(t))
        || (f.fokus === 'tinjau' && t.status === 'Ditinjau' && peninjau(t) === f.me)));
  }

  /* Kolom Selesai hanya 7 hari terakhir; yang lebih lama adalah arsip (Laporan). */
  function kolomPapan(data, f, hariIni) {
    const perId = indeks(data);
    const isi = saring(data, f, hariIni, perId);
    const batas = tambahHari(hariIni, -6);
    return STATUS.map(status => {
      let daftar = isi.filter(t => t.status === status);
      if (status === 'Selesai') {
        daftar = daftar.filter(t => isoHari(t.selesaiAt) >= batas).sort((a, b) => b.selesaiAt - a.selesaiAt);
      } else {
        daftar = daftar.map(t => ({ t })).sort(urutTenggat).map(x => x.t);
      }
      return { status, isi: daftar };
    });
  }

  function bebanOrang(data, ids) {
    return ids.map(id => {
      const n = data.tasks.filter(t => t.pic === id && aktif(t)).length;
      return { id, aktif: n, persen: Math.min(100, Math.round(n / KAPASITAS * 100)), penuh: n >= KAPASITAS };
    });
  }

  /* ---------- Dashboard ---------- */

  function seninDari(iso) {
    const d = keTanggal(iso);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return isoHari(d);
  }

  /* Angka Dashboard. ids = orang yang dihitung (null = seluruh divisi). */
  function laporan(data, hariIni, ids = null) {
    const dalam = t => !ids || ids.includes(t.pic);
    const tasks = data.tasks.filter(dalam);
    const tiga0 = tambahHari(hariIni, -29);
    const dalam30 = t => selesai(t) && isoHari(t.selesaiAt) >= tiga0;
    const aktifSemua = tasks.filter(aktif);
    const senin = seninDari(hariIni);
    const mingguan = [];
    for (let i = 7; i >= 0; i--) {
      const awal = tambahHari(senin, -7 * i);
      const akhir = tambahHari(awal, 6);
      mingguan.push({ awal, jumlah: tasks.filter(t => selesai(t) && isoHari(t.selesaiAt) >= awal && isoHari(t.selesaiAt) <= akhir).length });
    }
    const perPlatform = {};
    for (const t of aktifSemua) perPlatform[t.platform || '—'] = (perPlatform[t.platform || '—'] || 0) + 1;
    /* Bottleneck (PRD) = task lain yang ia tahan × 2 + gate yang menunggu reviewnya × 2 + task telatnya. */
    const perId = indeks(data);
    // Dihitung sekali: jumlah task yang menunggu (paling tidak satu) task milik orang itu.
    const ditahan = new Map();
    for (const t of data.tasks) {
      if (!aktif(t)) continue;
      for (const pic of new Set(depsBelum(t, perId).map(d => d.pic))) ditahan.set(pic, (ditahan.get(pic) || 0) + 1);
    }
    const ditahanOleh = id => ditahan.get(id) || 0;
    const tinjauanOleh = id => data.tasks.filter(t => t.status === 'Ditinjau' && peninjau(t) === id).length;
    return {
      kpi: {
        aktif: aktifSemua.length,
        telat: aktifSemua.filter(t => telat(t, hariIni) && !t.tertahan).length,
        tertahan: aktifSemua.filter(ditandaiTertahan).length,
        ditinjau: aktifSemua.filter(t => t.status === 'Ditinjau').length,
        selesai30: tasks.filter(dalam30).length,
      },
      perStatus: STATUS.filter(s => s !== 'Selesai').map(status => ({ status, jumlah: aktifSemua.filter(t => t.status === status).length })),
      perJalur: { proyek: aktifSemua.filter(t => t.lane === 'proyek').length, rutin: aktifSemua.filter(t => t.lane !== 'proyek').length },
      perTahap: [...TAHAP, { id: 'R', nama: 'Rutin & lepas' }].map(x => ({
        ...x, jumlah: aktifSemua.filter(t => (x.id === 'R' ? t.lane !== 'proyek' : t.lane === 'proyek' && t.stage === x.id)).length,
      })),
      perTim: Object.values(TIM).map(x => ({ kode: x.kode, nama: x.nama, jumlah: aktifSemua.filter(t => timTask(t) === x.kode).length })),
      mingguan,
      perOrang: (ids ? ids.map(orang) : ORANG).map(o => {
        const nTelat = aktifSemua.filter(t => t.pic === o.id && telat(t, hariIni) && !t.tertahan).length;
        const menahan = ditahanOleh(o.id);
        const tinjau = tinjauanOleh(o.id);
        return {
          id: o.id,
          aktif: aktifSemua.filter(t => t.pic === o.id).length,
          subTerbuka: data.tasks.filter(t => aktif(t) && t.pic !== o.id).reduce((n, t) => n + t.subtasks.filter(s => !s.done && s.pic === o.id).length, 0),
          telat: nTelat, menahan, tinjau, bottleneck: menahan * 2 + tinjau * 2 + nTelat,
          selesai30: tasks.filter(t => t.pic === o.id && dalam30(t)).length,
        };
      }),
      perPlatform: Object.entries(perPlatform).sort((a, b) => b[1] - a[1]).map(([platform, jumlah]) => ({ platform, jumlah })),
    };
  }

  /* ---------- Laporan berkala (Lead: timnya, Manager: divisi) ---------- */

  const PERIODE = [['minggu', 'Minggu ini'], ['lalu', 'Minggu lalu'], ['bulan', 'Bulan ini'], ['30', '30 hari terakhir']];

  function rentang(kunci, hariIni) {
    if (kunci === 'lalu') {
      const dari = tambahHari(seninDari(hariIni), -7);
      return { dari, sampai: tambahHari(dari, 6) };
    }
    if (kunci === 'bulan') return { dari: hariIni.slice(0, 8) + '01', sampai: hariIni };
    if (kunci === '30') return { dari: tambahHari(hariIni, -29), sampai: hariIni };
    return { dari: seninDari(hariIni), sampai: hariIni };
  }

  /* Selesai & baru dihitung DALAM periode; aktif, terlambat, dan tertahan adalah
     keadaan HARI INI. Tepat waktu = selesai pada atau sebelum tenggatnya. */
  function laporanPeriode(data, ids, dari, sampai, hariIni) {
    const dalam = ms => { const h = isoHari(ms); return !!h && h >= dari && h <= sampai; };
    const daftar = ids || ORANG.map(o => o.id);
    const baris = daftar.map(id => {
      const milik = data.tasks.filter(t => t.pic === id);
      const beres = milik.filter(t => selesai(t) && dalam(t.selesaiAt)).sort((a, b) => b.selesaiAt - a.selesaiAt);
      return {
        id,
        aktif: milik.filter(aktif).length,
        selesai: beres,
        tepat: beres.filter(t => !t.due || isoHari(t.selesaiAt) <= t.due).length,
        baru: milik.filter(t => dalam(t.createdAt)).length,
        telat: milik.filter(t => telat(t, hariIni) && !t.tertahan).sort((a, b) => a.due.localeCompare(b.due)),
        tertahan: milik.filter(ditandaiTertahan),
      };
    });
    const jumlah = k => baris.reduce((n, b) => n + (Array.isArray(b[k]) ? b[k].length : b[k]), 0);
    const proyek = data.projects.flatMap(p => (p.history || []).filter(x => dalam(x.at)).map(x => ({ p, ...x })))
      .sort((a, b) => b.at - a.at);
    return {
      baris,
      total: { aktif: jumlah('aktif'), selesai: jumlah('selesai'), tepat: jumlah('tepat'), baru: jumlah('baru'), telat: jumlah('telat'), tertahan: jumlah('tertahan') },
      proyek,
    };
  }

  /* ---------- Daftar task (Task List, Timeline, Kalender) ---------- */

  const URUT_STATUS = new Map(STATUS.map((s, i) => [s, i]));
  const PEMBANDING = {
    due: (a, b) => (a.due || '9999').localeCompare(b.due || '9999'),
    id: (a, b) => a.id.localeCompare(b.id, 'id', { numeric: true }),
    title: (a, b) => a.title.localeCompare(b.title, 'id'),
    status: (a, b) => URUT_STATUS.get(a.status) - URUT_STATUS.get(b.status),
    pic: (a, b) => orang(a.pic).pendek.localeCompare(orang(b.pic).pendek, 'id'),
    platform: (a, b) => (a.platform || '').localeCompare(b.platform || '', 'id'),
  };

  /* f: saringan papan + status ('' | 'aktif' | salah satu STATUS), q, urut, arah (1 | -1). */
  function daftarTask(data, f, hariIni) {
    const isi = saring(data, f, hariIni).filter(t => !f.status || (f.status === 'aktif' ? aktif(t) : t.status === f.status));
    const banding = PEMBANDING[f.urut] || PEMBANDING.due;
    const arah = f.arah === -1 ? -1 : 1;
    return isi.sort((a, b) => arah * banding(a, b) || a.id.localeCompare(b.id, 'id', { numeric: true }));
  }

  /* Rentang jadwal task: mulai = tanggal mulai (atau tanggal dibuat), akhir = tenggat. */
  function rentangTask(t) {
    const mulai = t.start || isoHari(t.createdAt) || t.due || '';
    const akhir = t.due || mulai;
    return mulai && akhir < mulai ? { mulai: akhir, akhir: mulai } : { mulai, akhir };
  }

  /* Kotak kalender satu bulan ('YYYY-MM'), mulai Senin, 5 atau 6 minggu. */
  function gridBulan(bulan) {
    const [y, m] = bulan.split('-').map(Number);
    const awal = isoHari(new Date(y, m - 1, 1));
    const akhir = isoHari(new Date(y, m, 0));
    const mulai = seninDari(awal);
    const minggu = Math.ceil((selisihHari(mulai, akhir) + 1) / 7);
    return Array.from({ length: minggu * 7 }, (_, i) => tambahHari(mulai, i));
  }
  function geserBulan(bulan, n) {
    const [y, m] = bulan.split('-').map(Number);
    const d = new Date(y, m - 1 + n, 1);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
  }

  /* ---------- Komunikasi: ruang, pesan, sebutan, pertanyaan (0.10.0) ----------
     Pesan tersimpan BERSAMA di tab `obrolan` spreadsheet v2, sebagai peristiwa yang hanya
     bertambah — dua orang yang menulis bersamaan tak saling menimpa:
       pesan   teks baru di sebuah ruang; target = pesan yang dibalas, tanya = yang perlu menjawab
       ubah    pengirim mengganti teks pesannya       hapus  pengirim menghapus pesannya
       reaksi  memasang reaksi pada pesan             lepas  melepasnya lagi
       beres   pertanyaan dianggap terjawab (oleh yang ditanya, atau pengirimnya)
     Keadaan akhirnya disusun di sini (susunObrolan), sama di semua browser; peristiwa yang
     tak sah — mis. mengubah pesan orang lain — diabaikan. Ruang: task:PRD-… (utas per task),
     proyek:PRJ-…, tim:AK. Komentar lama di data contoh ikut tampil di ruang task-nya. */

  /* moderasi = pesan siapa pun disembunyikan mode Dev (0.13.0); server hanya menerimanya dari sesi Dev. */
  const JENIS_PERISTIWA = ['pesan', 'ubah', 'hapus', 'reaksi', 'lepas', 'beres', 'moderasi'];
  const REAKSI = [
    { kode: 'jempol', simbol: '👍', nama: 'Oke' },
    { kode: 'centang', simbol: '✅', nama: 'Sudah' },
    { kode: 'mata', simbol: '👀', nama: 'Sedang dilihat' },
    { kode: 'terima', simbol: '🙏', nama: 'Terima kasih' },
  ];
  const BATAS_PESAN = 4000;
  const POLA_RUANG = /^(task:PRD-\d+|proyek:PRJ-\d+|tim:(AK|LA|CO|SI))$/;
  const POLA_ID_PESAN = /^[A-Za-z0-9_-]{1,80}$/;

  const ruangTask = id => 'task:' + id;
  const ruangProyek = id => 'proyek:' + id;
  const ruangTim = kode => 'tim:' + kode;
  function bacaRuang(ruang) {
    const s = String(ruang || '');
    const i = s.indexOf(':');
    return i < 0 ? { jenis: '', id: s } : { jenis: s.slice(0, i), id: s.slice(i + 1) };
  }
  const anggotaTim = kode => (TIM[kode] ? [TIM[kode].lead, ...timDari(TIM[kode].lead)] : []);

  /* Ruang tim hanya untuk anggotanya dan Manager; ruang task dan proyek terbuka untuk semua,
     karena itulah konteks kerja bersama. */
  function bolehRuang(me, ruang) {
    const { jenis, id } = bacaRuang(ruang);
    if (jenis === 'task' || jenis === 'proyek') return true;
    if (jenis !== 'tim' || !TIM[id] || id === 'MG') return false;
    return orang(me).peran === 'manager' || anggotaTim(id).includes(me);
  }
  /* Ruang tim yang tampil: Manager semua tim, selain itu tim sendiri. */
  const ruangTimSaya = me => Object.keys(TIM).filter(kode => bolehRuang(me, ruangTim(kode)));

  /* Satu pintu peristiwa ke spreadsheet — dipakai server juga. Bentuknya dibersihkan, yang
     tak masuk akal ditolak. Pengirimnya tak bisa dibuktikan selama PIN dipakai bersama. */
  /* ---------- Foto profil (0.12.0) ----------
     Data URL JPEG/PNG/WebP kecil yang dipotong dan diperkecil di browser, atau '' (hapus).
     FOTO_MAKS karakter muat di satu sel spreadsheet (batasnya 50.000) dan cukup untuk 192 px.
     fotoSah juga dipakai browser sebelum memasang foto di CSS: hanya base64, tak ada tanda
     kutip atau kurung yang bisa keluar dari url("…"). */
  const FOTO_MAKS = 45000;
  const POLA_FOTO = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
  const fotoSah = g => typeof g === 'string' && g.length <= FOTO_MAKS && POLA_FOTO.test(g);
  function periksaFoto(f) {
    const x = f && typeof f === 'object' ? f : {};
    const orang = String(x.orang || '');
    const gambar = x.gambar == null ? '' : String(x.gambar);
    // Foto orang yang dinonaktifkan masih boleh dihapus (moderasi mode Dev), tak boleh diganti.
    if (!ORANG_PER_ID.has(orang) && !(gambar === '' && NONAKTIF.has(orang))) throw new Error('Profil tidak dikenal.');
    if (gambar.length > FOTO_MAKS) throw new Error('Foto terlalu besar. Pilih foto lain atau perbesar potongannya.');
    if (gambar && !POLA_FOTO.test(gambar)) throw new Error('Format foto tidak dikenal. Pakai JPG, PNG, atau WebP.');
    return { orang, gambar };
  }

  function periksaPeristiwa(e) {
    const x = e && typeof e === 'object' ? e : {};
    const jenis = String(x.jenis || '');
    if (!JENIS_PERISTIWA.includes(jenis)) throw new Error('Jenis pesan tidak dikenal.');
    const ruang = String(x.ruang || '');
    if (!POLA_RUANG.test(ruang)) throw new Error('Ruang obrolan tidak dikenal.');
    const oleh = String(x.oleh || '');
    if (jenis === 'moderasi' ? oleh !== DEV : !ORANG_PER_ID.has(oleh)) {
      throw new Error(jenis === 'moderasi' ? 'Moderasi hanya dari mode Dev.' : 'Pengirim harus profil yang terdaftar.');
    }
    const isi = String(x.teks == null ? '' : x.teks).replace(/\r\n?/g, '\n').replace(/\s+$/, '');
    if (isi.length > BATAS_PESAN) throw new Error(`Pesan terlalu panjang (maks. ${BATAS_PESAN} karakter).`);
    const target = String(x.target || '');
    if (target && !POLA_ID_PESAN.test(target)) throw new Error('Pesan yang dirujuk tidak dikenal.');
    const hasil = { jenis, ruang, oleh, teks: '', target: '', kode: '', tanya: [], judul: teks(x.judul).slice(0, 200) };
    if (jenis === 'pesan') {
      if (!isi.trim()) throw new Error('Pesan masih kosong.');
      const tanya = Array.isArray(x.tanya) ? x.tanya.map(String) : [];
      return { ...hasil, teks: isi, target, tanya: [...new Set(tanya)].filter(id => ORANG_PER_ID.has(id) && id !== oleh).slice(0, 12) };
    }
    if (!target) throw new Error('Pesan yang dirujuk wajib ada.');
    if (jenis === 'ubah') {
      if (!isi.trim()) throw new Error('Pesan masih kosong.');
      return { ...hasil, teks: isi, target };
    }
    if (jenis === 'reaksi' || jenis === 'lepas') {
      if (!REAKSI.some(r => r.kode === x.kode)) throw new Error('Reaksi tidak dikenal.');
      return { ...hasil, target, kode: x.kode };
    }
    return { ...hasil, target };
  }

  /* ---------- Agen AI (2.17.0) ----------
     Sesi agen (api/_sesi.js) terkunci pada satu profil dan hanya boleh memakai perubahan data
     dan jenis pesan di bawah ini; selebihnya (proyek, paket, Master, PIN, ...) tetap pekerjaan
     orangnya sendiri. Pesan dari agen ditandai server dengan kode KODE_AI (kolom kode hanya
     dipakai reaksi, jadi untuk pesan dan ubah selalu kosong), aktivitas dan tinjauannya dengan
     ai: true. */
  const KODE_AI = 'ai';
  const AKSI_AGEN = ['terapkanAksi', 'isiOutput', 'tambahBukti', 'tambahSubtask', 'ubahSubtask', 'centangSubtask'];
  const PESAN_AGEN = ['pesan', 'ubah', 'hapus', 'reaksi', 'lepas', 'beres'];

  /* Komentar data contoh + peristiwa bersama → pesan per ruang, terurut waktu.
     Pesan: { id, ruang, oleh, at, teks, balas, tanya, diubah, dihapus, reaksi {kode: [orang]},
     beres {oleh, at}, bersama, judul, tertunda, gagal }. */
  function susunObrolan(data, peristiwa = []) {
    const perId = new Map();
    const perRuang = new Map();
    const masuk = m => {
      perId.set(m.id, m);
      if (!perRuang.has(m.ruang)) perRuang.set(m.ruang, []);
      perRuang.get(m.ruang).push(m);
    };
    const kosong = { balas: '', diubah: 0, dihapus: false, dimoderasi: false, beres: null, judul: '', tertunda: false, gagal: false, ai: false };
    for (const t of data.tasks) {
      for (const k of t.comments || []) {
        masuk({ ...kosong, id: String(k.id), ruang: ruangTask(t.id), oleh: k.author, at: Number(k.at) || 0, teks: String(k.text || ''), tanya: [], reaksi: {}, bersama: false });
      }
    }
    const urut = (peristiwa || []).slice().sort((a, b) => (a.at - b.at) || String(a.id).localeCompare(String(b.id)));
    for (const e of urut) {
      if (e.jenis === 'pesan') {
        if (!perId.has(e.id)) {
          masuk({ ...kosong, id: e.id, ruang: e.ruang, oleh: e.oleh, at: e.at, teks: e.teks, balas: e.target || '', tanya: e.tanya || [],
            reaksi: {}, bersama: true, judul: e.judul || '', tertunda: !!e.tertunda, gagal: !!e.gagal, ai: e.kode === KODE_AI });
        }
        continue;
      }
      const m = perId.get(e.target);
      if (!m || m.ruang !== e.ruang) continue;
      if (e.jenis === 'ubah' && m.oleh === e.oleh && !m.dihapus) Object.assign(m, { teks: e.teks, diubah: e.at }, e.kode === KODE_AI ? { ai: true } : {});
      else if (e.jenis === 'hapus' && m.oleh === e.oleh) Object.assign(m, { teks: '', dihapus: true, reaksi: {} });
      else if (e.jenis === 'moderasi' && e.oleh === DEV) Object.assign(m, { teks: '', dihapus: true, dimoderasi: true, reaksi: {} });
      else if ((e.jenis === 'reaksi' || e.jenis === 'lepas') && !m.dihapus) {
        const siapa = new Set(m.reaksi[e.kode] || []);
        if (e.jenis === 'reaksi') siapa.add(e.oleh); else siapa.delete(e.oleh);
        if (siapa.size) m.reaksi[e.kode] = [...siapa]; else delete m.reaksi[e.kode];
      } else if (e.jenis === 'beres' && m.tanya.length && !m.beres && (m.tanya.includes(e.oleh) || m.oleh === e.oleh)) {
        m.beres = { oleh: e.oleh, at: e.at };
      }
    }
    for (const daftar of perRuang.values()) daftar.sort((a, b) => a.at - b.at);
    return { perId, perRuang };
  }

  /* @sebutan: nama pendek (@Kiki) atau peran (@manager, @lead, @staff, @semua). */
  const PERAN_SEBUT = { manager: 'manager', lead: 'lead', leader: 'lead', staff: 'staff', semua: '*' };
  function sebutan(isi) {
    const siapa = new Set(), peran = new Set();
    for (const m of String(isi || '').matchAll(/(^|[^A-Za-z0-9_])@([A-Za-z]+)/g)) {
      const kata = m[2].toLowerCase();
      const o = ORANG.find(x => x.pendek.toLowerCase() === kata);
      if (o) siapa.add(o.id);
      else if (PERAN_SEBUT[kata]) peran.add(PERAN_SEBUT[kata]);
    }
    return { orang: [...siapa], peran: [...peran] };
  }
  function menyebut(isi, me) {
    if (!String(isi || '').includes('@')) return false;
    const s = sebutan(isi);
    return s.orang.includes(me) || s.peran.includes('*') || s.peran.includes(orang(me).peran);
  }

  /* Pertanyaan masih terbuka bila belum ditandai beres, pesannya tak dihapus, dan belum ada
     balasan dari salah satu yang ditanya sesudahnya di ruang yang sama. */
  function tanyaTerbuka(m, pesanRuang) {
    if (!m.tanya.length || m.beres || m.dihapus) return false;
    return !pesanRuang.some(x => x.at > m.at && !x.dihapus && m.tanya.includes(x.oleh));
  }

  /* Orang yang terlibat di sebuah task: PIC, pendukung, pemberi, peninjau, yang ikut berdiskusi,
     dan yang disebut atau ditanya di utasnya. pesan = pesan ruang task itu (bila sudah disusun). */
  function terlibat(t, me, pesan) {
    if (t.pic === me || (t.support || []).includes(me) || t.assignedBy === me || peninjau(t) === me) return true;
    const daftar = pesan || (t.comments || []).map(k => ({ oleh: k.author, teks: String(k.text || ''), tanya: [] }));
    return daftar.some(m => m.oleh === me || m.tanya.includes(me) || menyebut(m.teks, me));
  }

  /* Jejak task yang ikut tampil di percakapannya: dibuat, diubah/diserahkan, mulai, tertahan,
     pengajuan dan hasil tinjauan (beserta catatannya), dibuka kembali. */
  function aktivitasTask(data, t) {
    const out = (t.tinjauan || []).map(r => ({ id: 'tj-' + r.id, at: Number(r.at) || 0, oleh: r.by, jenis: 'tinjau', aksi: r.action, teks: r.note || '', ...(r.ai ? { ai: true } : {}) }));
    for (const l of data.log) {
      if (l.type === 'comment' || l.type === 'tinjau' || String(l.task).split(' ')[0] !== t.id) continue;
      out.push({ id: 'lg-' + l.id, at: Number(l.at) || 0, oleh: l.by, jenis: l.type, aksi: '', teks: String(l.detail || ''), ...(l.ai ? { ai: true } : {}) });
    }
    return out.filter(x => x.at).sort((a, b) => a.at - b.at);
  }

  /* Lingkup Komunikasi mengikuti peran: "terlibat" untuk semua, "tim" Lead & Manager, "semua" Manager. */
  const lingkupKom = (me, lingkup) => { const l = lingkupSah(me, lingkup); return l === 'saya' ? 'terlibat' : l; };

  /* Daftar utas Komunikasi, satu per ruang.
       saring  'semua' | 'baru' (belum dibaca) | 'sebut' (menyebut saya) | 'tanya' (perlu jawaban saya)
       lingkup utas task: 'terlibat' | 'tim' | 'semua', mengikuti peran
       q       cari judul, ID, proyek, PIC, atau isi pesan; task tanpa pesan ikut bila cocok
       sejak   (ruang, pesan) → batas baca: pesan orang lain sesudahnya terhitung baru
     Ruang tim & proyek ikut bila sudah ada pesannya. Yang belum dibaca di atas, lalu yang
     paling baru. */
  function daftarUtas(data, me, susunan, { saring = 'semua', lingkup = 'terlibat', q = '', sejak = () => 0 } = {}) {
    const kata = String(q || '').trim().toLowerCase();
    const perIdTask = indeks(data);
    const proyekPer = new Map(data.projects.map(p => [p.id, p]));
    const l = lingkup === 'terlibat' ? 'terlibat' : lingkupKom(me, lingkup);
    const ids = l === 'tim' ? lingkupOrang(me, 'tim') : null;
    const masukLingkup = (t, pesan) => l === 'semua' || terlibat(t, me, pesan) || (l === 'tim' && ids.includes(t.pic));
    const cocok = (teksCari, pesan) => !kata || teksCari.toLowerCase().includes(kata)
      || pesan.some(m => !m.dihapus && m.teks.toLowerCase().includes(kata));
    const hasil = [];
    const sudah = new Set();
    for (const [ruang, pesan] of susunan.perRuang) {
      if (!pesan.length || !bolehRuang(me, ruang)) continue;
      const { jenis, id } = bacaRuang(ruang);
      const t = jenis === 'task' ? perIdTask.get(id) || null : null;
      const p = jenis === 'proyek' ? proyekPer.get(id) || null : t && t.project ? proyekPer.get(t.project) || null : null;
      if (t && !masukLingkup(t, pesan)) continue;
      // Task yang tak ada di data browser ini (dibuat di browser lain): tampil bagi yang terlibat.
      if (jenis === 'task' && !t && l !== 'semua' && !pesan.some(m => m.oleh === me || m.tanya.includes(me) || menyebut(m.teks, me))) continue;
      const cadangan = (pesan.find(m => m.judul) || {}).judul || id;
      const judul = jenis === 'task' ? (t ? t.title : cadangan) : jenis === 'proyek' ? (p ? p.name : cadangan) : 'Tim ' + TIM[id].nama;
      if (!cocok([judul, id, p ? p.name : '', t ? orang(t.pic).nama : ''].join(' '), pesan)) continue;
      const lain = pesan.filter(m => m.oleh !== me && !m.dihapus);
      const baru = lain.filter(m => m.at > sejak(ruang, m));
      const sebut = lain.filter(m => menyebut(m.teks, me));
      const tanya = pesan.filter(m => m.tanya.includes(me) && tanyaTerbuka(m, pesan)).length;
      if ((saring === 'baru' && !baru.length) || (saring === 'sebut' && !sebut.length) || (saring === 'tanya' && !tanya)) continue;
      sudah.add(ruang);
      hasil.push({
        ruang, jenis, id, judul, t, p, terakhir: pesan[pesan.length - 1], baru: baru.length,
        sebut: sebut.length, sebutBaru: sebut.filter(m => baru.includes(m)).length, sebutTerakhir: sebut.length ? sebut[sebut.length - 1].at : 0, tanya,
      });
    }
    // Pencarian juga menemukan task yang belum punya pesan, untuk memulai diskusi.
    if (kata && saring === 'semua') {
      for (const t of data.tasks) {
        const ruang = ruangTask(t.id);
        if (sudah.has(ruang) || !masukLingkup(t, [])) continue;
        const p = t.project ? proyekPer.get(t.project) || null : null;
        if (![t.id, t.title, orang(t.pic).nama, p ? p.name : ''].join(' ').toLowerCase().includes(kata)) continue;
        hasil.push({ ruang, jenis: 'task', id: t.id, judul: t.title, t, p, terakhir: null, baru: 0, sebut: 0, sebutBaru: 0, sebutTerakhir: 0, tanya: 0 });
        if (hasil.length >= 300) break;
      }
    }
    const kunci = x => (saring === 'sebut' ? x.sebutTerakhir : x.terakhir ? x.terakhir.at : 0);
    return hasil.sort((a, b) => (b.baru > 0) - (a.baru > 0) || kunci(b) - kunci(a));
  }

  /* ---------- Notifikasi ----------
     Yang menyangkut `me`, dibaca dari jejak yang sudah ada di data (log, tinjauan, komentar,
     status task); tak ada tabel notifikasi tersendiri.
       baru      task dibuat orang lain untuk saya          siap     task yang ditunggu sudah selesai
       serah     task diserahkan ke saya (delegasi)         tinjau   task diajukan, menunggu tinjauan saya
       kembali   task saya dikembalikan peninjau            setuju   task saya disetujui
       komentar  pesan baru di task yang melibatkan saya    siklus   (Manager) siklus proyek ditutup E12
       tambah    (Lead) staff saya menambah task untuk dirinya sendiri
       sebut     pesan yang menyebut saya (@Kiki, @staff, @semua), di ruang mana pun yang boleh saya buka
       tanya     pesan yang menunggu jawaban saya
     Terbaru di atas. Penanda dibaca/belum disimpan di app.js, per profil.
     susunan = hasil susunObrolan (komentar data contoh + pesan bersama); tanpanya, komentar data saja. */
  function notifikasi(data, me, batas = 60, susunan = null) {
    const perId = indeks(data);
    const pendek = orang(me).pendek.toLowerCase();
    const out = [];
    const tambah = (jenis, t, at, oleh, isi = '', ai = false) => { if (at) out.push({ id: `${jenis}-${t.id}-${at}`, jenis, task: t.id, at, oleh, teks: isi, ...(ai ? { ai: true } : {}) }); };
    for (const t of data.tasks) {
      if (t.pic === me && t.status === 'Antre' && tungguTahap(t)) {
        // Tahap sebelumnya baru tuntas: task ini siap dimulai (kecuali sudah siap sejak dibuat).
        const sebelum = pendahuluTahap(t, perId);
        const at = Math.max(0, ...sebelum.map(x => x.selesaiAt || 0));
        if (sebelum.length && sebelum.every(selesai) && at > (t.createdAt || 0)) tambah('siap', t, at, '');
      } else if (t.pic === me && t.status === 'Antre' && (t.deps || []).length) {
        const ditunggu = t.deps.map(id => perId.get(id)).filter(Boolean);
        if (ditunggu.length && ditunggu.every(selesai)) tambah('siap', t, Math.max(...ditunggu.map(d => d.selesaiAt || 0)), '');
      }
      for (const r of t.tinjauan || []) {
        if (r.by === me) continue;
        if (r.action === 'Diajukan' && t.status === 'Ditinjau' && peninjau(t) === me) tambah('tinjau', t, r.at, r.by, '', r.ai);
        if (t.pic === me && r.action === 'Dikembalikan') tambah('kembali', t, r.at, r.by, r.note, r.ai);
        if (t.pic === me && r.action === 'Disetujui') tambah('setuju', t, r.at, r.by, '', r.ai);
      }
    }
    // Pesan: pertanyaan untuk saya > sebutan > pesan di task yang melibatkan saya. Ruang tim dan
    // proyek hanya memberi tahu lewat sebutan dan pertanyaan, supaya lonceng tak riuh.
    for (const [ruang, pesan] of (susunan || susunObrolan(data, [])).perRuang) {
      if (!bolehRuang(me, ruang)) continue;
      const { jenis, id } = bacaRuang(ruang);
      const t = jenis === 'task' ? perId.get(id) : null;
      const ikut = !!t && terlibat(t, me, pesan);
      for (const m of pesan) {
        if (m.oleh === me || m.dihapus || !m.at || m.tertunda || m.gagal) continue;
        const j = m.tanya.includes(me) ? 'tanya' : menyebut(m.teks, me) ? 'sebut' : ikut ? 'komentar' : '';
        if (j) out.push({ id: `${j}-${m.id}`, jenis: j, ruang, pesan: m.id, task: t ? t.id : '', proyek: jenis === 'proyek' ? id : '', at: m.at, oleh: m.oleh, teks: m.teks, ...(m.ai ? { ai: true } : {}) });
      }
    }
    // Task baru dan delegasi hanya tercatat di log: "Dibuat untuk Kiki · E4", "Diubah: diserahkan ke Kiki".
    for (const l of data.log) {
      if (l.by === me) continue;
      const t = perId.get(String(l.task).split(' ')[0]);
      if (!t) continue;
      // Lead diberi tahu saat staff-nya menambah task untuk dirinya sendiri.
      if (l.type === 'create' && t.pic === l.by && orang(l.by).peran === 'staff' && orang(l.by).lead === me) { tambah('tambah', t, l.at, l.by, '', l.ai); continue; }
      if (t.pic !== me) continue;
      const d = String(l.detail || '');
      const dibuat = /^Dibuat untuk (.+?)(?: · |$)/.exec(d);
      const serah = /(?:diserahkan|didelegasikan) ke ([^,.;]+)/i.exec(d);
      if (l.type === 'create' && dibuat && dibuat[1].trim().toLowerCase() === pendek) tambah('baru', t, l.at, l.by, '', l.ai);
      else if (serah && serah[1].trim().toLowerCase() === pendek) tambah('serah', t, l.at, l.by, '', l.ai);
    }
    if (orang(me).peran === 'manager') {
      for (const p of data.projects) {
        if (p.arsip || p.decision === 'Hold' || !siklusTutup(data, p)) continue;
        const e12 = tugasSiklus(data, p).filter(penutupSiklus).sort((a, b) => b.selesaiAt - a.selesaiAt)[0];
        if (e12.selesaiAt) out.push({ id: `siklus-${p.id}-${e12.selesaiAt}`, jenis: 'siklus', proyek: p.id, task: e12.id, at: e12.selesaiAt, oleh: '', teks: '' });
      }
    }
    return out.sort((a, b) => b.at - a.at).slice(0, batas);
  }

  /* ---------- Riwayat aktivitas ---------- */

  const JENIS_LOG = { create: 'Dibuat', update: 'Diubah', tinjau: 'Tinjauan', gate: 'Proyek', comment: 'Komentar', delete: 'Dihapus', system: 'Sistem' };
  function saringLog(log, f) {
    const kata = String(f.q || '').trim().toLowerCase();
    return log.filter(l => (!f.jenis || l.type === f.jenis) && (!f.orang || l.by === f.orang)
      && (!kata || [l.task, l.detail, orang(l.by).nama].join(' ').toLowerCase().includes(kata)));
  }

  /* ---------- Rancangan Paket (sama dengan v1) ----------
     Yang tampil hanya sisi produk, seperti v1: area marketing (tagline, benefit, tujuan)
     tetap tersimpan supaya data tak hilang, tapi tidak disunting dari sini. */

  const PAKET_IDENTITAS = [['program', 'Program'], ['namaPaket', 'Nama paket']];
  /* Kategori target, dan kolom teks bebasnya di paket (catatan/bonus untuk kategori itu). */
  const KATEGORI_PAKET = [['Dibimbing', 'dibimbing'], ['Latsol', 'latsol'], ['Materi', 'materi'], ['Tryout', 'tryout'],
    ['Drilling', 'drilling'], ['Live Class', 'liveClass']];
  const PAKET_PRODUK = [...KATEGORI_PAKET.map(([label, kunci]) => [kunci, label]), ['catatan', 'Catatan produk']];
  const SATUAN_PAKET = ['Paket', 'BAB', 'Sesi', 'Video', 'Ebook', 'Video + Ebook'];
  /* Semua kategori, termasuk yang dinonaktifkan di Master: item paket lama tetap punya rumahnya.
     KATEGORI_PAKET = yang aktif (ditawarkan untuk item baru). */
  const KATEGORI_SEMUA = KATEGORI_PAKET.slice();
  const PLATFORM = ['ASN', 'Sekdin', 'TPA', 'PPPK', 'PPG', 'BUMN', 'OJK', 'PCPM', 'Psikotes Kerja', 'Cerebrum', 'Polisi', 'Prajurit', 'TOEFL', 'Beasiswa', 'All Platform'];
  /* [nilai, label]. Nilainya tetap (dipakai mengurutkan); labelnya bisa diubah di Master. */
  const PRIORITAS = [['Normal', 'Normal'], ['High', 'Penting'], ['Urgent', 'Mendesak'], ['Low', 'Rendah']];

  /* Capaian sebuah batch di alur langkahnya (PRD v3; bobotnya usulan PRD yang masih menunggu
     keputusan Manager — cukup ubah tabel ini): konten siap 40%, ter-input 60%, lolos QC
     output 85%, tayang 100%. Setoran tanpa tahap (cara lama, satu task) dihitung "tayang". */
  const CAPAIAN = [
    { kode: 'konten', nama: 'Konten siap', bobot: 0.4 },
    { kode: 'input', nama: 'Ter-input', bobot: 0.6 },
    { kode: 'qc', nama: 'Lolos QC output', bobot: 0.85 },
    { kode: 'tayang', nama: 'Tayang', bobot: 1 },
  ];
  const BOBOT = Object.fromEntries(CAPAIAN.map(c => [c.kode, c.bobot]));
  const tahapSetoran = s => (BOBOT[s] ? s : 'tayang');
  const namaCapaian = kode => (CAPAIAN.find(c => c.kode === kode) || { nama: kode }).nama;

  /* Setoran = "task X membawa target Y sebanyak N sampai capaian C". Inilah yang membuat
     progres paket bergerak sendiri: setoran terhitung begitu task-nya Selesai — untuk task
     proyek artinya sudah lolos gate. Tak ada yang ditulis saat task selesai; progres selalu
     dihitung ulang dari status task, jadi task yang dibuka kembali otomatis menurunkannya. */
  function setoranPaket(data, p, perId = indeks(data)) {
    const per = new Map((p.items || []).map(it => [it.id, []]));
    for (const s of data.setoran || []) {
      if (s.paket !== p.id || !per.has(s.item)) continue;
      const t = perId.get(s.task) || null;
      per.get(s.item).push({ ...s, tahap: tahapSetoran(s.tahap), t, selesai: !!t && selesai(t), hilang: !t });
    }
    return per;
  }

  /* Status target dihitung, tak pernah diketik:
       terpenuhi = sudah ada (awal) + batch yang sudah TAYANG
       kemajuan  = terpenuhi + batch yang baru sampai sebagian jalan, dikali bobot capaiannya
       digarap   = batch yang belum tayang
     "Lebih" sengaja tidak dibulatkan jadi penuh: kelebihan biasanya berarti salah hitung
     atau setoran dobel, dan itu perlu terlihat. Setoran yang task-nya hilang tak dihitung. */
  /* Satu batch = satu rangkaian langkah (kolom `batch`); setoran lama tanpa batch adalah
     batch-nya sendiri. Batch dinilai dari capaian tertinggi yang langkahnya sudah lolos;
     `berikut` = setoran pertama yang belum lolos, yakni capaian yang sedang dikejar. */
  function batchSetoran(kontrib = []) {
    const per = new Map();
    for (const k of kontrib) {
      if (k.hilang) continue;
      const kunci = k.batch || k.id || 'tanpa-id-' + per.size;
      if (!per.has(kunci)) per.set(kunci, { kunci, jumlah: 0, capai: '', tertunda: false, setoran: [] });
      const b = per.get(kunci);
      b.setoran.push(k);
      b.jumlah = Math.max(b.jumlah, Number(k.jumlah) || 0);
      const tahap = tahapSetoran(k.tahap);
      if (!k.selesai) b.tertunda = true;
      else if (!b.capai || BOBOT[tahap] > BOBOT[b.capai]) b.capai = tahap;
    }
    return [...per.values()].map(b => {
      b.setoran.sort((x, y) => BOBOT[tahapSetoran(x.tahap)] - BOBOT[tahapSetoran(y.tahap)]);
      b.berikut = b.setoran.find(k => !k.selesai) || null;
      return b;
    });
  }

  function hitungTarget(it, kontrib = []) {
    const target = Number(it.target) || 0;
    const awal = Number(it.awal) || 0;
    const capaian = { konten: 0, input: 0, qc: 0, tayang: 0 };
    let tayang = 0, kredit = 0, digarap = 0;
    for (const b of batchSetoran(kontrib)) {
      for (const c of CAPAIAN) if (b.capai && BOBOT[b.capai] >= c.bobot) capaian[c.kode] += b.jumlah;
      if (b.capai === 'tayang') { tayang += b.jumlah; continue; }
      if (b.capai) kredit += b.jumlah * BOBOT[b.capai];
      if (b.tertunda) digarap += b.jumlah;
    }
    const terpenuhi = awal + tayang;
    const kemajuan = terpenuhi + kredit;
    let status = 'belum';
    if (target > 0 && terpenuhi > target) status = 'lebih';
    else if (target > 0 && terpenuhi >= target) status = 'penuh';
    else if (digarap > 0) status = 'digarap';
    else if (terpenuhi > 0) status = 'sebagian';
    return {
      target, awal, masuk: tayang, terpenuhi, digarap, capaian, kemajuan,
      persen: target ? Math.min(100, Math.round(kemajuan / target * 100)) : 0,
      sisa: Math.max(0, target - terpenuhi), lebih: Math.max(0, terpenuhi - target), status,
    };
  }

  /* Yang belum ditangani siapa pun: belum tayang dan belum ada batch yang mengerjakannya. */
  function sisaTerbuka(it, kontrib = []) {
    const h = hitungTarget(it, kontrib);
    return Math.max(0, h.target - h.terpenuhi - h.digarap);
  }

  function ringkasPaket(p, kontribPer = new Map()) {
    const r = { target: 0, terpenuhi: 0, kemajuan: 0, digarap: 0, sisa: 0, jumlah: (p.items || []).length, penuh: 0, lebih: 0, kurang: 0, sedang: 0, terbuka: 0 };
    let kredit = 0;
    for (const it of p.items || []) {
      const k = kontribPer.get(it.id) || [];
      const h = hitungTarget(it, k);
      const batas = x => Math.min(x, h.target || x);
      r.target += h.target;
      r.terpenuhi += batas(h.terpenuhi);
      r.kemajuan += batas(h.kemajuan);
      kredit += batas(h.kemajuan) - batas(h.terpenuhi);
      r.digarap += Math.min(h.digarap, h.sisa);
      r.sisa += h.sisa;
      if (h.status === 'penuh') r.penuh++;
      else if (h.status === 'lebih') r.lebih++;
      else r.kurang++;
      if (h.status === 'digarap') r.sedang++;
      if (sisaTerbuka(it, k) > 0) r.terbuka++;
    }
    // persen = progres berbobot (PRD); persenDigarap = bagian batch berjalan yang belum terhitung.
    r.persen = r.target ? Math.round(r.kemajuan / r.target * 100) : 0;
    r.persenTayang = r.target ? Math.round(r.terpenuhi / r.target * 100) : 0;
    r.persenDigarap = r.target ? Math.max(0, Math.round((r.digarap - kredit) / r.target * 100)) : 0;
    r.isiProduk = PAKET_PRODUK.filter(([k]) => String(p[k] || '').trim()).length;
    return r;
  }

  /* Manager & Lead menyusun paket; PIC Produk boleh menyunting paketnya sendiri. */
  function bolehUbahPaket(p, me) {
    const r = orang(me).peran;
    return r === 'manager' || r === 'lead' || (!!p && p.produkPic === me);
  }

  function paketBaru(data, f, me, waktu) {
    if (!['manager', 'lead'].includes(orang(me).peran)) throw new Error('Hanya Lead atau Manager yang membuat paket.');
    if (!String(f.namaPaket || '').trim()) throw new Error('Nama paket wajib diisi.');
    const p = {
      id: 'PKG-' + String(nomorBerikut(data.packages, 'PKG')).padStart(3, '0'),
      platform: rapikanPlatform(f.platform), marselPic: '', program: String(f.program || '').trim(), namaPaket: String(f.namaPaket).trim(),
      tagline: '', benefit: '', tanggal: '', tujuan: '', produkPic: f.produkPic || '', ...aturJadwalDaftar(f, {}),
      dibimbing: '', latsol: '', materi: '', tryout: '', drilling: '', liveClass: '', catatan: '',
      updatedBy: me, updatedAt: waktu, mirror: false, items: [], links: [],
    };
    data.packages.unshift(p);
    catatLog(data, 'create', `${p.id} · ${p.namaPaket}`, 'Rancangan paket dibuat', me, waktu);
    return p;
  }

  const angkaPositif = v => { const n = Number(String(v == null ? '' : v).replace(',', '.')); return Number.isFinite(n) && n > 0 ? n : 0; };
  const teks = v => String(v == null ? '' : v).trim();

  /* ---------- Platform dan jadwal pendaftaran paket (2.18.0) ----------
     Satu paket boleh beberapa platform. Tetap satu isian teks dipisah koma ("ASN, BUMN"), supaya
     data lama, tab packages, sheet Marsel, dan pencarian tak berubah; urutannya mengikuti
     daftar Platform di Master. */
  const platformPaket = p => [...new Set(String((p && p.platform) || '').split(',').map(x => x.trim()).filter(Boolean))];
  function rapikanPlatform(nilai) {
    const daftar = [...new Set((Array.isArray(nilai) ? nilai : String(nilai == null ? '' : nilai).split(',')).map(x => String(x).trim()).filter(Boolean))];
    const urut = x => { const i = PLATFORM.indexOf(x); return i < 0 ? PLATFORM.length : i; };
    return daftar.sort((a, b) => urut(a) - urut(b)).join(', ');
  }
  /* Jadwal pendaftaran: daftarBuka dan daftarTutup, 'YYYY-MM-DD' atau kosong. Kalau hanya salah
     satu yang diisi, jadwalnya satu hari itu. */
  function tanggalSah(v, label) {
    const s = teks(v);
    if (!s) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    const d = m && new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (!d || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) throw new Error(`${label} bukan tanggal yang benar.`);
    return s;
  }
  function aturJadwalDaftar(f, lama) {
    const buka = f.daftarBuka === undefined ? lama.daftarBuka || '' : tanggalSah(f.daftarBuka, 'Tanggal pendaftaran dibuka');
    const tutup = f.daftarTutup === undefined ? lama.daftarTutup || '' : tanggalSah(f.daftarTutup, 'Tanggal pendaftaran ditutup');
    if (buka && tutup && tutup < buka) throw new Error('Pendaftaran tidak bisa ditutup sebelum dibuka.');
    return { daftarBuka: buka, daftarTutup: tutup };
  }
  function jadwalDaftar(p) {
    const buka = (p && p.daftarBuka) || '';
    const tutup = (p && p.daftarTutup) || '';
    return buka || tutup ? { buka: buka || tutup, tutup: tutup || buka } : null;
  }
  /* Masa pendaftaran paket bersinggungan dengan rentang dari–sampai (salah satunya boleh
     kosong). Paket tanpa jadwal tak pernah masuk. */
  function daftarBeririsan(p, dari, sampai) {
    const j = jadwalDaftar(p);
    return !!j && (!sampai || j.buka <= sampai) && (!dari || j.tutup >= dari);
  }
  /* Nama paket saja: klik dua kali di judulnya (2.18.0). */
  function ubahNamaPaket(data, p, nama, me, waktu) {
    if (!bolehUbahPaket(p, me)) throw new Error('Anda tidak bisa menyunting paket ini.');
    const baru = teks(nama).slice(0, 200);
    if (!baru) throw new Error('Nama paket wajib diisi.');
    if (baru === p.namaPaket) return p;
    const lama = p.namaPaket;
    Object.assign(p, { namaPaket: baru, updatedBy: me, updatedAt: waktu });
    catatLog(data, 'update', `${p.id} · ${baru}`, `Nama paket diubah dari "${lama}"`, me, waktu);
    return p;
  }

  /* Simpan suntingan rancangan paket: identitas, teks per kategori, target, tautan.
     Membagikan (mirror) hanya boleh Lead/Manager, seperti di v1. */
  function simpanPaket(data, p, f, me, waktu) {
    if (!bolehUbahPaket(p, me)) throw new Error('Anda tidak bisa menyunting paket ini.');
    const namaPaket = teks(f.namaPaket);
    if (!namaPaket) throw new Error('Nama paket wajib diisi.');
    const mirror = f.mirror === undefined ? !!p.mirror : !!f.mirror;
    if (mirror !== !!p.mirror && !['manager', 'lead'].includes(orang(me).peran)) throw new Error('Hanya Lead atau Manager yang bisa membagikan paket.');
    const kategori = new Set(KATEGORI_SEMUA.map(([l]) => l));
    const items = (f.items || []).map((it, i) => ({
      id: teks(it.id) || `i${waktu}-${i}`, urutan: i + 1,
      kategori: kategori.has(it.kategori) ? it.kategori : KATEGORI_PAKET[0][0], grup: teks(it.grup), nama: teks(it.nama),
      target: angkaPositif(it.target), satuan: teks(it.satuan) || 'Paket', awal: angkaPositif(it.awal), catatan: teks(it.catatan),
    })).filter(it => it.nama || it.target || it.awal);
    const links = (f.links || []).filter(l => teks(l.url) || teks(l.label)).map((l, i) => {
      const url = tautanRapi(l.url);
      if (!url) throw new Error(`Tautan "${teks(l.label) || teks(l.url)}" bukan alamat web (http/https).`);
      return { id: teks(l.id) || `pl${waktu}-${i}`, urutan: i + 1, label: teks(l.label) || judulTautan(url), url };
    });
    const jadwal = aturJadwalDaftar(f, p);
    Object.assign(p, {
      platform: f.platform === undefined ? p.platform : rapikanPlatform(f.platform), ...jadwal,
      namaPaket, items, links, mirror, updatedBy: me, updatedAt: waktu,
      // Program dan PIC produk tak lagi diisi (0.14.0); nilai lama hasil impor v1 dibiarkan.
      ...(f.program === undefined ? {} : { program: teks(f.program) }), ...(f.produkPic === undefined ? {} : { produkPic: teks(f.produkPic) }),
    });
    // Kategori yang tak tampil di form (nonaktif dan belum dipakai paket ini) tak ikut terhapus.
    for (const [kunci] of PAKET_PRODUK) if (f[kunci] !== undefined) p[kunci] = String(f[kunci] == null ? '' : f[kunci]).replace(/\s+$/, '');
    // Target yang dihapus membawa setorannya: setoran tanpa target tak bisa ditampilkan di mana pun.
    const adaItem = new Set(items.map(it => it.id));
    if (data.setoran) data.setoran = data.setoran.filter(s => s.paket !== p.id || adaItem.has(s.item));
    catatLog(data, 'update', `${p.id} · ${p.namaPaket}`, 'Rancangan paket diubah', me, waktu);
    return p;
  }

  function hapusPaket(data, p, me, waktu) {
    if (orang(me).peran !== 'manager') throw new Error('Hanya Manager yang menghapus paket.');
    const i = data.packages.indexOf(p);
    if (i < 0) throw new Error('Paket tidak ditemukan.');
    data.packages.splice(i, 1);
    if (data.setoran) data.setoran = data.setoran.filter(s => s.paket !== p.id);
    for (const proj of data.projects) if (proj.paket === p.id) proj.paket = '';
    catatLog(data, 'delete', `${p.id} · ${p.namaPaket}`, 'Rancangan paket dihapus', me, waktu);
  }

  /* ---------- Rancangan paket → proyek ---------- */

  const fmtJumlah = n => (Number.isInteger(n) ? String(n) : String(n).replace('.', ','));

  /* Alur langkah per jenis target (PRD v3, "Alur langkah per jenis item paket"). Tanda
     ":capaian" = langkah yang menaikkan progres batch. Alur Dibimbing dan Live Class tak
     tercantum di PRD; yang di sini usulan dan bisa diubah. */
  const ALUR_PAKET = {
    Tryout: ['DV1', 'E1:konten', 'DV8:input', 'I1', 'E4', 'E5', 'E6', 'E7:qc', 'I4:tayang'],
    Latsol: ['DV1', 'E1:konten', 'DV8:input', 'I1', 'E4', 'E5', 'E6:qc', 'I4:tayang'],
    Drilling: ['DV1', 'E1:konten', 'DV8:input', 'I1', 'E4', 'E5', 'E6:qc', 'I4:tayang'],
    Materi: ['DV3', 'E2:konten', 'DV8:input', 'I2', 'E5:qc', 'I4:tayang'],
    Dibimbing: ['D5:konten', 'I3:input', 'E5:qc', 'I4:tayang'],
    'Live Class': ['I6:konten', 'I7:tayang'],
  };
  const langkahAlur = kategori => (ALUR_PAKET[kategori] || ALUR_PAKET.Latsol).map(x => {
    const [kode, capaian = ''] = x.split(':');
    return { kode, capaian };
  });

  /* Proyek yang mengerjakan sebuah paket: ditautkan langsung, atau punya task yang menyetor ke sana. */
  function proyekPengisi(data, paketId) {
    const lewatSetoran = new Set((data.setoran || []).filter(s => s.paket === paketId)
      .map(s => (data.tasks.find(t => t.id === s.task) || {}).project).filter(Boolean));
    return data.projects.filter(p => p.paket === paketId || lewatSetoran.has(p.id));
  }
  /* Paket yang dikerjakan sebuah proyek (satu proyek boleh mengerjakan beberapa paket). */
  function paketProyek(data, proj) {
    const milik = new Set(data.tasks.filter(t => t.project === proj.id).map(t => t.id));
    const id = new Set((data.setoran || []).filter(s => milik.has(s.task)).map(s => s.paket));
    if (proj.paket) id.add(proj.paket);
    return data.packages.filter(p => id.has(p.id));
  }

  /* Rancangan paket → proyek (PRD "Buat / hubungkan Project"). Setiap target terpilih yang
     masih terbuka menjadi satu BATCH: rangkaian task sesuai alur jenisnya, masing-masing
     menunggu langkah sebelumnya dan diserahkan ke Lead tim pemilik sub-stage-nya. Langkah
     bertanda capaian membawa setoran, sehingga progres paket naik per tahap begitu
     langkahnya lolos gate.
       f.proyek   kosong = proyek baru (f.name), atau ID proyek yang sudah ada
       f.mode     'alur' (bawaan) atau 'satu' = satu task produksi per target
       f.langkah  { kategori: [kode, …] } — langkah yang dicoret tidak dibuat
       f.jumlah   { idTarget: n } — mis. target 10 tapi proyek ini cukup 5; sisanya tetap
                  terbuka untuk elaborasi berikutnya */
  function elaborasiPaket(data, p, f, me, waktu, hariIni) {
    const peran = orang(me).peran;
    if (!['manager', 'lead'].includes(peran)) throw new Error('Hanya Lead atau Manager yang mengelaborasi paket.');
    let proj = null;
    if (teks(f.proyek)) {
      proj = data.projects.find(x => x.id === f.proyek);
      if (!proj || proj.arsip) throw new Error('Proyek tujuan tidak ditemukan atau sudah diarsipkan.');
    }
    const pilih = new Set(f.items || []);
    if (!pilih.size) throw new Error('Centang dulu target yang dikerjakan proyek ini.');
    const kontrib = setoranPaket(data, p);
    const minta = f.jumlah || {};
    const terbuka = (p.items || []).filter(it => pilih.has(it.id)).map(it => {
      const sisa = sisaTerbuka(it, kontrib.get(it.id) || []);
      const isian = minta[it.id];
      const jumlah = isian === undefined || isian === null || String(isian).trim() === '' ? sisa : angkaPositif(isian);
      if (jumlah > sisa) {
        throw new Error(`${it.kategori} · ${it.nama}: ${fmtJumlah(jumlah)} melebihi sisa yang belum ditangani (${fmtJumlah(sisa)} ${it.satuan || 'Paket'}).`);
      }
      return { it, jumlah };
    }).filter(x => x.jumlah > 0);
    if (!terbuka.length) throw new Error('Tidak ada target terbuka yang dipilih. Target terpilih sudah terpenuhi atau sedang digarap.');

    const mode = f.mode === 'satu' ? 'satu' : 'alur';
    const pilihLangkah = f.langkah || {};
    const rencana = terbuka.map(({ it, jumlah }) => {
      let langkah = langkahAlur(it.kategori);
      if (mode === 'satu') langkah = [{ kode: langkah[0].kode, capaian: 'tayang' }];
      else if (pilihLangkah[it.kategori]) {
        const boleh = new Set(pilihLangkah[it.kategori]);
        langkah = langkah.filter(l => boleh.has(l.kode));
        if (!langkah.length) throw new Error(`Pilih minimal satu langkah untuk ${it.kategori}.`);
      }
      // Langkah terakhir yang tersisa selalu menandai "tayang", supaya batch bisa terpenuhi penuh.
      if (!langkah.some(l => l.capaian === 'tayang')) langkah[langkah.length - 1] = { ...langkah[langkah.length - 1], capaian: 'tayang' };
      return { it, jumlah, langkah };
    });

    // Paket boleh beberapa platform (2.18.0); proyek dan task tetap satu: yang dipilih di form, atau yang pertama.
    const platformP = platformPaket(p);
    const platform = platformP.includes(teks(f.platform)) ? teks(f.platform) : platformP[0] || '';
    if (!proj) {
      const judul = p.namaPaket || p.program || p.id;
      proj = {
        id: 'PRJ-' + nomorBerikut(data.projects, 'PRJ'), name: teks(f.name) || `Produksi ${judul}`, platform: platform || 'All Platform',
        stage: 'A', cycle: 1, decision: 'Build', goal: teks(f.goal) || `Memenuhi target rancangan paket ${p.id} · ${judul}.`,
        lead: '', arsip: false, paket: p.id, history: [],
      };
      data.projects.unshift(proj);
      catatLog(data, 'create', `${proj.id} · ${proj.name}`, `Proyek dari rancangan paket ${p.id}`, me, waktu);
    }
    if (!proj.paket) proj.paket = p.id;

    data.setoran = data.setoran || [];
    const tasks = [];
    for (const { it, jumlah, langkah } of rencana) {
      const satuan = it.satuan || 'Paket';
      const batch = `${it.kategori} ${it.nama || 'Tanpa nama'} — ${fmtJumlah(jumlah)} ${satuan}`;
      let idBatch = '';   // = 'B-' + ID task langkah pertamanya, jadi pasti unik
      let sebelumnya = '';
      langkah.forEach((l, i) => {
        const sub = subTahap(l.kode);
        const t = taskBaru(data, {
          title: `${l.kode} · ${batch}`, project: proj.id, sub: l.kode, pic: leadSub(l.kode) || me, due: teks(f.due),
          priority: 'Normal', platform: platform || proj.platform, deps: sebelumnya ? [sebelumnya] : [],
          detail: [`Langkah ${i + 1} dari ${langkah.length}: ${sub.kode} · ${sub.nama}.`,
            `Target paket ${p.id} · ${it.kategori}${it.grup ? ' / ' + it.grup : ''} · ${it.nama}: ${fmtJumlah(jumlah)} ${satuan}.`,
            l.capaian ? `Saat langkah ini disetujui, batch ini menjadi "${namaCapaian(l.capaian)}" di progres paket.` : '',
            it.catatan].filter(Boolean).join('\n'),
        }, me, waktu, hariIni);
        if (!idBatch) idBatch = 'B-' + t.id;
        if (l.capaian) data.setoran.push({ id: `st-${t.id}-${it.id}`, paket: p.id, item: it.id, task: t.id, jumlah, tahap: l.capaian, batch: idBatch, catatan: '' });
        sebelumnya = t.id;
        tasks.push(t);
      });
    }
    segarkanTahap(data);
    return { project: proj, tasks };
  }

  const bolehSetor = (t, me) => ['manager', 'lead'].includes(orang(me).peran) && bolehUbah(t, me);

  /* Setoran manual dari detail task, untuk task yang dibuat di luar elaborasi.
     Satu task + satu target = satu setoran; menyetor lagi mengganti jumlah dan capaiannya. */
  function setorkan(data, t, f, me, waktu) {
    if (!bolehSetor(t, me)) throw new Error('Hanya Lead atau Manager task ini yang mengatur setoran.');
    const p = data.packages.find(x => x.id === f.paket);
    if (!p) throw new Error('Paket tidak ditemukan.');
    const it = (p.items || []).find(x => x.id === f.item);
    if (!it) throw new Error('Pilih target paketnya.');
    const jumlah = angkaPositif(f.jumlah);
    if (!jumlah) throw new Error('Jumlah setoran harus lebih dari 0.');
    const tahap = tahapSetoran(f.tahap);
    data.setoran = data.setoran || [];
    const ada = data.setoran.find(s => s.task === t.id && s.paket === p.id && s.item === it.id);
    if (ada) Object.assign(ada, { jumlah, tahap });
    else data.setoran.push({ id: `st-${t.id}-${it.id}`, paket: p.id, item: it.id, task: t.id, jumlah, tahap, catatan: teks(f.catatan) });
    catatLog(data, 'update', `${t.id} · ${t.title}`, `Setoran ke ${p.id}: ${it.kategori} · ${it.nama} ${fmtJumlah(jumlah)} ${it.satuan || 'Paket'} (${namaCapaian(tahap)})`, me, waktu);
  }

  function hapusSetoran(data, id, me, waktu) {
    const daftar = data.setoran || [];
    const i = daftar.findIndex(s => s.id === id);
    if (i < 0) throw new Error('Setoran tidak ditemukan.');
    const t = indeks(data).get(daftar[i].task);
    if (!['manager', 'lead'].includes(orang(me).peran) || (t && !bolehUbah(t, me))) throw new Error('Hanya Lead atau Manager task ini yang mengatur setoran.');
    const [s] = daftar.splice(i, 1);
    catatLog(data, 'update', t ? `${t.id} · ${t.title}` : s.task, `Setoran ke ${s.paket} dihapus`, me, waktu);
  }

  /* Menautkan proyek yang sudah ada (mis. kolaborasi v1) ke rancangan paket. */
  function tautkanPaket(data, proj, paketId, me, waktu) {
    if (orang(me).peran !== 'manager') throw new Error('Hanya Manager yang menautkan proyek ke paket.');
    if (paketId && !data.packages.some(p => p.id === paketId)) throw new Error('Paket tidak ditemukan.');
    proj.paket = paketId || '';
    catatLog(data, 'update', `${proj.id} · ${proj.name}`, paketId ? `Ditautkan ke rancangan paket ${paketId}` : 'Tautan rancangan paket dilepas', me, waktu);
  }

  /* ---------- Link Saya, Catatan Saya, Tautan tim ---------- */

  const FOLDER_UMUM = 'Umum';
  const namaFolder = f => teks(f) || FOLDER_UMUM;
  const folderSimpan = f => (teks(f).toLowerCase() === FOLDER_UMUM.toLowerCase() ? '' : teks(f));

  /* Alamat tanpa skema ("docs.google.com/…") diberi https://. Selain http/https —
     javascript:, data:, file: — ditolak supaya tak jadi tautan berbahaya di layar orang. */
  function tautanRapi(u) {
    let s = teks(u);
    if (!s) return '';
    if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = 'https://' + s.replace(/^\/+/, '');
    try {
      const url = new URL(s);
      return /^https?:$/.test(url.protocol) && url.hostname.includes('.') ? s : '';
    } catch (e) { return ''; }
  }
  function judulTautan(u) {
    if (/docs\.google\.com\/spreadsheets/i.test(u)) return 'Google Sheets';
    if (/docs\.google\.com\/document/i.test(u)) return 'Google Docs';
    if (/docs\.google\.com\/presentation/i.test(u)) return 'Google Slides';
    if (/drive\.google\.com/i.test(u)) return 'Google Drive';
    try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return 'Tautan'; }
  }

  /* Dikelompokkan per folder, "Umum" (folder kosong) paling akhir. */
  function kelompokFolder(daftar) {
    const m = new Map();
    for (const x of daftar) {
      const f = namaFolder(x.folder);
      if (!m.has(f)) m.set(f, []);
      m.get(f).push(x);
    }
    return [...m.entries()]
      .sort(([a], [b]) => (a === FOLDER_UMUM) - (b === FOLDER_UMUM) || a.localeCompare(b, 'id'))
      .map(([folder, isi]) => ({ folder, isi }));
  }

  function milikSaya(daftar, id, me) {
    const x = daftar.find(y => y.id === id);
    if (!x || x.user !== me) throw new Error('Tidak ditemukan, atau bukan milik Anda.');
    return x;
  }

  function simpanLink(data, me, f, id, waktu) {
    const url = tautanRapi(f.url);
    if (!url) throw new Error('Alamat link tidak valid. Contoh: https://docs.google.com/…');
    const isi = { title: teks(f.title) || judulTautan(url), url, folder: folderSimpan(f.folder) };
    if (id) return Object.assign(milikSaya(data.links, id, me), isi);
    const l = { id: `u${waktu}-${data.links.length}`, user: me, ...isi };
    data.links.push(l);
    return l;
  }

  function simpanCatatan(data, me, f, id, waktu) {
    const title = teks(f.title);
    const body = String(f.body == null ? '' : f.body).replace(/\s+$/, '');
    if (!title && !body.trim()) throw new Error('Catatan tidak boleh kosong.');
    const isi = { title, body, folder: folderSimpan(f.folder), updatedAt: waktu };
    if (id) return Object.assign(milikSaya(data.notes, id, me), isi);
    const n = { id: `n${waktu}-${data.notes.length}`, user: me, createdAt: waktu, pin: false, ...isi };
    data.notes.unshift(n);
    return n;
  }

  /* Link favorit tampil di kartu ★ Favorit; catatan yang disematkan selalu di atas daftar. */
  function tandaiLink(data, me, id, favorit) {
    const l = milikSaya(data.links, id, me);
    l.favorit = !!favorit;
    return l;
  }
  function sematkanCatatan(data, me, id, pin) {
    const n = milikSaya(data.notes, id, me);
    n.pin = !!pin;
    return n;
  }

  /* Warna catatan (seperti Google Keep); kosong = tanpa warna. */
  const WARNA_CATATAN = ['biru', 'hijau', 'kuning', 'merah', 'ungu'];
  function warnaiCatatan(data, me, id, warna) {
    const n = milikSaya(data.notes, id, me);
    n.warna = WARNA_CATATAN.includes(warna) ? warna : '';
    return n;
  }

  /* Checklist di isi catatan: baris "[ ] …" atau "[x] …", boleh diawali "- ". Isinya tetap
     teks biasa, jadi catatan lama dan unduhan .txt tetap terbaca. */
  const POLA_CENTANG = /^(\s*(?:[-*]\s+)?)\[( |x|X)\]( ?)/;
  function hitungChecklist(isi) {
    let selesai = 0, total = 0;
    for (const b of String(isi || '').split('\n')) {
      const m = POLA_CENTANG.exec(b);
      if (m) { total++; if (m[2] !== ' ') selesai++; }
    }
    return { selesai, total };
  }
  function centangBaris(isi, n) {
    const baris = String(isi || '').split('\n');
    const m = POLA_CENTANG.exec(baris[n] || '');
    if (!m) return String(isi || '');
    baris[n] = baris[n].replace(POLA_CENTANG, `${m[1]}[${m[2] === ' ' ? 'x' : ' '}]${m[3]}`);
    return baris.join('\n');
  }
  /* Satu baris catatan sebagai judul task: tanpa penanda checklist, daftar, judul, kutipan,
     format, dan tanpa "→ PRD-…" yang ditempel saat baris itu sudah pernah dijadikan task.
     Baris tabel menjadi isi selnya; garis pemisah dan baris pemisah tabel menjadi kosong. */
  function teksBarisCatatan(isi, n) {
    let b = String(String(isi || '').split('\n')[n] || '');
    if (/^\s*-{3,}\s*$/.test(b)) return '';
    if (POLA_BARIS_TABEL.test(b)) {
      const sel = selTabel(b);
      if (garisTabel(sel)) return '';
      b = sel.filter(Boolean).join(' · ');
    }
    return b
      .replace(POLA_CENTANG, '')
      .replace(/^\s*(?:#{1,3}\s+|[-*]\s+|\d+[.)]\s+|>\s?)/, '')
      .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1')
      .replace(/\*\*|~~|`/g, '')
      .replace(/\s*→\s*PRD-\d+\s*$/, '')
      .trim();
  }
  /* ---------- Blok catatan (0.14.0) ----------
     Isi catatan tetap teks biasa — sel spreadsheet, unduhan .txt, pencarian, dan riwayat versi
     tetap terbaca — tapi editornya bekerja per blok seperti Notion. Satu baris = satu blok,
     kecuali tabel (baris-baris "| a | b |", baris kedua "| --- | --- |" menandai kepala tabel).
     Jenis blok: p (teks), h1–h3 (# ## ###), li (- daftar), ol (1. bernomor), todo ([ ] / [x]),
     kutip (> ), hr (---), tabel. tingkat = indentasi daftar, dua spasi per tingkat (maks. 3).
     Teks → blok → teks tak mengubah teks yang ditulis editor ini; teks lama yang ditulis tangan
     dirapikan sedikit (mis. spasi sel tabel) begitu catatannya diubah. */
  const POLA_BARIS_TABEL = /^\s*\|.*\|\s*$/;
  function selTabel(baris) {
    let s = String(baris).trim();
    if (s.startsWith('|')) s = s.slice(1);
    if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
    const sel = [];
    let kini = '';
    // Tanpa lookbehind: Safari lama gagal mengurai pola itu dan seluruh aplikasi tak jalan.
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '\\' && s[i + 1] === '|') { kini += '|'; i++; } else if (s[i] === '|') { sel.push(kini.trim()); kini = ''; } else kini += s[i];
    }
    sel.push(kini.trim());
    return sel;
  }
  const garisTabel = sel => sel.length > 0 && sel.every(x => /^:?-{3,}:?$/.test(x));
  const tingkatDari = spasi => Math.min(3, Math.floor(String(spasi || '').replace(/\t/g, '  ').length / 2));
  const JENIS_BLOK = ['p', 'h1', 'h2', 'h3', 'li', 'ol', 'todo', 'kutip', 'hr', 'tabel'];

  function blokCatatan(isi) {
    const baris = String(isi == null ? '' : isi).replace(/\r\n?/g, '\n').split('\n');
    const blok = [];
    for (let i = 0; i < baris.length; i++) {
      const b = baris[i];
      let m;
      if (POLA_BARIS_TABEL.test(b)) {
        let j = i;
        while (j + 1 < baris.length && POLA_BARIS_TABEL.test(baris[j + 1])) j++;
        const isiTabel = baris.slice(i, j + 1).map(selTabel);
        const kepala = isiTabel.length > 1 && garisTabel(isiTabel[1]);
        if (kepala) isiTabel.splice(1, 1);
        const kolom = Math.max(...isiTabel.map(r => r.length));
        blok.push({ jenis: 'tabel', kepala, sel: isiTabel.map(r => r.concat(Array(kolom - r.length).fill(''))) });
        i = j;
      } else if (/^\s*-{3,}\s*$/.test(b)) blok.push({ jenis: 'hr' });
      else if ((m = /^(#{1,3})\s+(.*)$/.exec(b))) blok.push({ jenis: 'h' + m[1].length, teks: m[2] });
      else if ((m = /^(\s*)([-*]\s+)?\[( |x|X)\]\s?(.*)$/.exec(b))) blok.push({ jenis: 'todo', tingkat: tingkatDari(m[1]), titik: !!m[2], cek: m[3] !== ' ', teks: m[4] });
      else if ((m = /^(\s*)([-*])(?:\s+(.*))?$/.exec(b))) blok.push({ jenis: 'li', tingkat: tingkatDari(m[1]), tanda: m[2], teks: m[3] || '' });
      else if ((m = /^(\s*)(\d{1,9})[.)]\s+(.*)$/.exec(b))) blok.push({ jenis: 'ol', tingkat: tingkatDari(m[1]), nomor: Number(m[2]), teks: m[3] });
      else if ((m = /^>\s?(.*)$/.exec(b))) blok.push({ jenis: 'kutip', teks: m[1] });
      else blok.push({ jenis: 'p', teks: b });
    }
    return blok;
  }

  /* Nomor tiap blok bernomor: urutan ol yang bersambung di tingkat yang sama, mulai dari nomor
     yang tertulis di butir pertamanya. Blok bukan daftar memutus urutan; daftar yang lebih
     dangkal memutus urutan yang lebih dalam. Blok lain bernilai 0. */
  function nomorDaftar(blok) {
    const lalu = [];
    return (blok || []).map(b => {
      const t = b.tingkat || 0;
      if (!['li', 'ol', 'todo'].includes(b.jenis)) { lalu.length = 0; return 0; }
      lalu.length = Math.min(lalu.length, t + 1);
      if (b.jenis !== 'ol') { lalu[t] = 0; return 0; }
      const n = lalu[t] ? lalu[t] + 1 : (Number(b.nomor) > 0 ? Number(b.nomor) : 1);
      lalu[t] = n;
      return n;
    });
  }

  const satuBaris = s => String(s == null ? '' : s).replace(/[\r\n]+/g, ' ');
  const selKeTeks = s => satuBaris(s).trim().replace(/\|/g, '\\|');
  /* Blok → teks catatan, beserta baris awal tiap blok (untuk "Jadikan task" dari sebuah blok). */
  function teksBlokDanBaris(blok) {
    const nomor = nomorDaftar(blok);
    const keluar = [];
    const baris = [];
    (blok || []).forEach((b, i) => {
      baris.push(keluar.length);
      const indent = '  '.repeat(Math.min(3, Math.max(0, b.tingkat || 0)));
      const teks = satuBaris(b.teks);
      switch (b.jenis) {
        case 'h1': case 'h2': case 'h3': keluar.push(`${'#'.repeat(Number(b.jenis[1]))} ${teks}`); break;
        case 'li': keluar.push(`${indent}${b.tanda === '*' ? '*' : '-'} ${teks}`); break;
        case 'ol': keluar.push(`${indent}${nomor[i]}. ${teks}`); break;
        case 'todo': keluar.push(`${indent}${b.titik ? '- ' : ''}[${b.cek ? 'x' : ' '}] ${teks}`); break;
        case 'kutip': keluar.push(`> ${teks}`); break;
        case 'hr': keluar.push('---'); break;
        case 'tabel': {
          const sel = Array.isArray(b.sel) && b.sel.length ? b.sel : [['']];
          const kolom = Math.max(1, ...sel.map(r => r.length));
          const baris1 = r => `| ${r.concat(Array(kolom - r.length).fill('')).map(selKeTeks).join(' | ')} |`;
          sel.forEach((r, k) => {
            keluar.push(baris1(r));
            if (k === 0 && b.kepala) keluar.push(`| ${Array(kolom).fill('---').join(' | ')} |`);
          });
          break;
        }
        default: keluar.push(teks);
      }
    });
    return { teks: keluar.join('\n'), baris };
  }
  const teksBlok = blok => teksBlokDanBaris(blok).teks;

  function tandaiBarisTask(isi, n, idTask) {
    const baris = String(isi || '').split('\n');
    if (baris[n] === undefined || baris[n].includes(idTask)) return String(isi || '');
    baris[n] = baris[n].replace(/\s+$/, '') + ' → ' + idTask;
    return baris.join('\n');
  }

  function hapusMilik(daftar, id, me) {
    const x = milikSaya(daftar, id, me);
    daftar.splice(daftar.indexOf(x), 1);
    return x;
  }

  function gantiNamaFolder(daftar, me, lama, baru) {
    if (namaFolder(lama) === FOLDER_UMUM) throw new Error('Folder "Umum" tidak bisa diganti namanya.');
    const b = teks(baru);
    if (!b) throw new Error('Nama folder wajib diisi.');
    if (!folderSimpan(b)) throw new Error('Untuk memindah isinya ke Umum, hapus foldernya.');
    let n = 0;
    for (const x of daftar) if (x.user === me && namaFolder(x.folder) === lama) { x.folder = b; n++; }
    return n;
  }

  /* Menghapus folder TIDAK menghapus isinya: semuanya pindah ke Umum. */
  function hapusFolder(daftar, me, nama) {
    if (namaFolder(nama) === FOLDER_UMUM) throw new Error('Folder "Umum" tidak bisa dihapus.');
    let n = 0;
    for (const x of daftar) if (x.user === me && namaFolder(x.folder) === nama) { x.folder = ''; n++; }
    return n;
  }

  /* Tautan tim (dulu menu Dashboard Lain). Ikonnya memakai nama ikon v1 (Material), digambar ulang di app.js. */
  const IKON_DASHBOARD = ['dashboard', 'bar_chart', 'timeline', 'table_chart', 'description', 'assignment', 'school', 'event'];

  function simpanDashboard(data, me, f, id, waktu) {
    if (orang(me).peran !== 'manager') throw new Error('Hanya Manager yang mengelola tautan tim.');
    const title = teks(f.title);
    if (!title) throw new Error('Judul tautan tim wajib diisi.');
    const url = tautanRapi(f.url);
    if (!url) throw new Error('Alamat tautan tim tidak valid.');
    const isi = { title, url, deskripsi: teks(f.deskripsi), icon: IKON_DASHBOARD.includes(f.icon) ? f.icon : 'dashboard' };
    if (id) {
      const d = data.dashboards.find(x => x.id === id);
      if (!d) throw new Error('Tautan tim tidak ditemukan.');
      return Object.assign(d, isi);
    }
    const d = { id: `d${waktu}-${data.dashboards.length}`, ...isi };
    data.dashboards.push(d);
    catatLog(data, 'create', 'Tautan tim', `"${title}" ditambahkan`, me, waktu);
    return d;
  }

  function hapusDashboard(data, me, id, waktu) {
    if (orang(me).peran !== 'manager') throw new Error('Hanya Manager yang mengelola tautan tim.');
    const i = data.dashboards.findIndex(x => x.id === id);
    if (i < 0) throw new Error('Tautan tim tidak ditemukan.');
    const [d] = data.dashboards.splice(i, 1);
    catatLog(data, 'delete', 'Tautan tim', `"${d.title}" dihapus`, me, waktu);
  }

  function cari(data, q, batas = 50) {
    const kata = String(q || '').trim().toLowerCase();
    if (!kata) return [];
    const namaProyek = new Map(data.projects.map(p => [p.id, p.name]));
    return data.tasks.filter(t => [t.id, t.title, orang(t.pic).nama, t.platform, t.kategori, t.sub, namaProyek.get(t.project) || '']
      .join(' ').toLowerCase().includes(kata)).slice(0, batas);
  }

  /* ---------- Master (0.14.0) ----------
     Daftar pilihan yang diatur Manager dan Dev di halaman Master, seperti Dropdown Master v1:
     sub-stage, platform, kategori item paket (dengan alur langkahnya), satuan item, label
     prioritas, nama dan bobot capaian, serta nama tim. Isi bawaannya di kode ini (PRD v3);
     perubahannya disimpan di tab `master` spreadsheet v2, satu baris per isian
     { jenis, kunci, aktif, urutan, ...data }, dan diterapkan lewat aturMaster (di browser dan
     di server). Daftar hidup diubah di tempat, jadi semua rujukan ikut berubah.

     Kunci yang sudah dipakai data (kode sub-stage, nama platform, kategori, satuan) tak bisa
     diganti atau dihapus, hanya dinonaktifkan: tak ditawarkan lagi, tapi data lamanya tetap
     terbaca. Status, tahap ADDIE, dan peran mengikuti alur kerja, jadi bukan bagian Master. */
  const JENIS_MASTER = ['tim', 'substage', 'platform', 'satuan', 'prioritas', 'capaian', 'kategori'];
  const BAWAAN = {
    tim: Object.values(TIM).map(t => ({ kunci: t.kode, nama: t.nama, aktif: true })),
    substage: SUB_TAHAP.map(s => ({ kunci: s.kode, nama: s.nama, tim: s.tim, reviewManager: s.reviewManager, aktif: true })),
    platform: PLATFORM.map((p, i) => ({ kunci: p, aktif: true, urutan: i + 1 })),
    satuan: SATUAN_PAKET.map((p, i) => ({ kunci: p, aktif: true, urutan: i + 1 })),
    prioritas: PRIORITAS.map(([kunci, label]) => ({ kunci, label, aktif: true })),
    capaian: CAPAIAN.map(c => ({ kunci: c.kode, nama: c.nama, bobot: Math.round(c.bobot * 100), aktif: true })),
    kategori: KATEGORI_PAKET.map(([label, kunci], i) => ({ kunci, label, alur: ALUR_PAKET[label].slice(), aktif: true, urutan: i + 1 })),
  };
  /* Daftar lengkap (termasuk yang nonaktif) yang sedang berlaku, untuk halaman Master. */
  const MASTER_KINI = {};
  const POLA_KODE_SUB = /^(A|D|DV|I|E|R)([1-9][0-9]?)$/;
  const KODE_TIM = Object.keys(TIM);
  const KODE_CAPAIAN = CAPAIAN.map(c => c.kode);
  const ya2 = v => (v === undefined || v === null || v === '' ? true : v === true || /^(ya|true|1|aktif)$/i.test(String(v).trim()));
  const angkaUrut = v => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 999);
  const urutKodeSub = (a, b) => {
    const t = x => ['A', 'D', 'V', 'I', 'E', 'R'].indexOf(tahapDariKode(x.kunci));
    const n = x => Number(POLA_KODE_SUB.exec(x.kunci)[2]);
    return t(a) - t(b) || n(a) - n(b);
  };
  /* Kunci kategori juga nama kolom catatannya di paket (p.latsol, …), jadi tak boleh sama dengan
     isian paket lain. */
  const KUNCI_PAKET = new Set(['id', 'name', 'program', 'namapaket', 'platform', 'marselpic', 'tagline', 'benefit', 'tanggal', 'tujuan',
    'produkpic', 'catatan', 'updatedby', 'updatedat', 'createdby', 'createdat', 'mirror', 'items', 'links', 'rumpun', 'arsip', 'daftarbuka', 'daftartutup',
    'constructor', 'prototype', 'tostring', 'valueof', 'hasownproperty']);
  /* Kunci kategori baru dari labelnya: huruf kecil dan angka saja. */
  function kunciKategori(label, dipakai) {
    const dasar = String(label || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'kategori';
    let k = /^[a-z]/.test(dasar) ? dasar : 'k' + dasar;
    for (let n = 2; dipakai.has(k) || KUNCI_PAKET.has(k); n++) k = dasar + n;
    return k;
  }

  /* Satu isian → bentuk bersih. ketat = isian dari halaman Master (galat bila tak sah);
     longgar = baris dari tab (yang tak sah dilewati supaya aplikasi tetap jalan). */
  function bersihMaster(jenis, b, ketat) {
    const x = b && typeof b === 'object' ? b : {};
    const salah = pesan => { if (ketat) throw new Error(pesan); return null; };
    const teksM = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
    const aktif = ya2(x.aktif);
    const urutan = angkaUrut(x.urutan);
    const kunci = teksM(x.kunci);
    switch (jenis) {
      case 'substage': {
        const kode = kunci.toUpperCase();
        if (!POLA_KODE_SUB.test(kode)) return salah('Kode sub-stage diawali A, D, DV, I, E, atau R lalu angka, mis. DV10 atau R5.');
        const nama = teksM(x.nama);
        if (nama.length < 2 || nama.length > 80) return salah('Nama sub-stage wajib diisi (2–80 karakter).');
        const tim = String(x.tim || '').toUpperCase();
        if (tim && !KODE_TIM.includes(tim)) return salah('Tim pemilik tidak dikenal.');
        const review = x.reviewManager === true || /^(ya|true|1)$/i.test(String(x.reviewManager == null ? '' : x.reviewManager).trim());
        // Pekerjaan rutin tak ditinjau.
        return { kunci: kode, nama, tim, reviewManager: tahapDariKode(kode) !== 'R' && review, aktif };
      }
      case 'platform':
      case 'satuan': {
        const maks = jenis === 'platform' ? 40 : 20;
        if (!kunci || kunci.length > maks) return salah(`Nama ${jenis} wajib diisi (paling panjang ${maks} karakter).`);
        return { kunci, aktif, urutan };
      }
      case 'prioritas': {
        if (!PRIORITAS.some(([k]) => k === kunci)) return salah('Tingkat prioritas tidak dikenal.');
        const label = teksM(x.label);
        if (!label || label.length > 20) return salah('Label prioritas wajib diisi (paling panjang 20 karakter).');
        return { kunci, label, aktif: true };
      }
      case 'capaian': {
        if (!KODE_CAPAIAN.includes(kunci)) return salah('Capaian tidak dikenal.');
        const nama = teksM(x.nama);
        if (nama.length < 2 || nama.length > 30) return salah('Nama capaian wajib diisi (2–30 karakter).');
        const bobot = Math.round(Number(x.bobot));
        if (!Number.isFinite(bobot) || bobot < 1 || bobot > 100) return salah('Bobot capaian 1–100 (%).');
        return { kunci, nama, bobot, aktif: true };
      }
      case 'tim': {
        if (!KODE_TIM.includes(kunci)) return salah('Tim tidak dikenal.');
        const nama = teksM(x.nama);
        if (nama.length < 2 || nama.length > 40) return salah('Nama tim wajib diisi (2–40 karakter).');
        return { kunci, nama, aktif: true };
      }
      case 'kategori': {
        const label = teksM(x.label);
        if (label.length < 2 || label.length > 40) return salah('Nama kategori wajib diisi (2–40 karakter).');
        if (!/^[a-z][a-z0-9]{1,30}$/i.test(kunci) || KUNCI_PAKET.has(kunci.toLowerCase())) return salah('Kunci kategori tidak sah.');
        const alur = (Array.isArray(x.alur) ? x.alur : String(x.alur || '').split(/[\s,]+/)).map(teksM).filter(Boolean);
        if (!alur.length || alur.length > 14) return salah('Alur kategori berisi 1–14 langkah.');
        const langkah = [];
        for (const l of alur) {
          const [kode, cap = ''] = l.split(':');
          const k = String(kode).toUpperCase();
          if (!POLA_KODE_SUB.test(k) || tahapDariKode(k) === 'R') return salah(`Langkah "${l}" bukan sub-stage ADDIE.`);
          if (cap && !KODE_CAPAIAN.includes(cap)) return salah(`Capaian "${cap}" tidak dikenal.`);
          langkah.push(cap ? `${k}:${cap}` : k);
        }
        return { kunci, label, alur: langkah, aktif, urutan };
      }
      default:
        return salah('Jenis master tidak dikenal.');
    }
  }

  /* Bawaan + baris tab (yang sama kuncinya menimpa) → daftar lengkap jenis itu, sudah terurut. */
  function susunMaster(jenis, baris) {
    const per = new Map(BAWAAN[jenis].map(x => [String(x.kunci).toLowerCase(), { ...x }]));
    for (const b of baris || []) {
      if (!b || b.jenis !== undefined && b.jenis !== jenis) continue;
      const x = bersihMaster(jenis, b, false);
      if (x) per.set(String(x.kunci).toLowerCase(), x);
    }
    const daftar = [...per.values()];
    if (jenis === 'substage') return daftar.sort(urutKodeSub);
    if (['platform', 'satuan', 'kategori'].includes(jenis)) return daftar.sort((a, b) => (a.urutan || 999) - (b.urutan || 999));
    return daftar;
  }

  /* '' kalau daftar itu utuh; kalau tidak, kalimat yang menjelaskan apa yang harus dibetulkan.
     subAktif = kode sub-stage yang aktif (untuk alur kategori); alurAktif = kode yang dipakai
     alur kategori aktif (untuk menonaktifkan sub-stage). */
  function salahMaster(jenis, daftar, { subAktif = null, subAda = null, alurAktif = null } = {}) {
    const unik = (nama, ambil) => {
      const lihat = new Map();
      for (const x of daftar) {
        const k = String(ambil(x)).toLowerCase();
        if (lihat.has(k)) return `${nama} "${ambil(x)}" ganda.`;
        lihat.set(k, true);
      }
      return '';
    };
    if (jenis === 'platform' || jenis === 'satuan') {
      if (!daftar.some(x => x.aktif)) return `Sisakan paling sedikit satu ${jenis} yang aktif.`;
      return unik(jenis === 'platform' ? 'Platform' : 'Satuan', x => x.kunci);
    }
    if (jenis === 'kategori') {
      if (!daftar.some(x => x.aktif)) return 'Sisakan paling sedikit satu kategori yang aktif.';
      const ganda = unik('Kategori', x => x.label);
      if (ganda) return ganda;
      for (const k of daftar) {
        const tanda = k.alur.map(l => l.split(':')[1]).filter(Boolean);
        const urut = tanda.map(t => KODE_CAPAIAN.indexOf(t));
        if (urut.some((u, i) => i && u <= urut[i - 1])) return `Alur ${k.label}: capaian harus berurutan (${KODE_CAPAIAN.join(' → ')}) dan tiap capaian sekali.`;
        if (!tanda.includes('tayang')) return `Alur ${k.label}: tandai langkah terakhirnya "tayang" (100%).`;
        for (const l of k.alur) {
          const kode = l.split(':')[0];
          if (subAda && !subAda.has(kode)) return `Alur ${k.label}: sub-stage ${kode} tidak ada.`;
          if (subAktif && k.aktif && !subAktif.has(kode)) return `Alur ${k.label}: sub-stage ${kode} nonaktif. Aktifkan dulu atau ganti langkahnya.`;
        }
      }
      return '';
    }
    if (jenis === 'substage') {
      if (alurAktif) {
        const dipakai = daftar.find(s => !s.aktif && alurAktif.has(s.kunci));
        if (dipakai) return `${dipakai.kunci} dipakai alur kategori paket. Ganti langkah alurnya dulu di bagian Kategori.`;
      }
      if (!daftar.some(s => s.aktif && tahapDariKode(s.kunci) === 'R')) return 'Sisakan paling sedikit satu jenis rutin (R) yang aktif.';
      return '';
    }
    if (jenis === 'capaian') {
      const bobot = KODE_CAPAIAN.map(k => (daftar.find(x => x.kunci === k) || {}).bobot);
      if (bobot.some((b, i) => i && b <= bobot[i - 1])) return `Bobot capaian harus naik berurutan: ${KODE_CAPAIAN.join(' < ')}.`;
      if (bobot[bobot.length - 1] !== 100) return 'Bobot "tayang" harus 100%: paket baru selesai saat tayang.';
      return '';
    }
    return '';
  }

  /* Terapkan satu jenis ke daftar hidup (di tempat). */
  function pakaiMaster(jenis, daftar) {
    MASTER_KINI[jenis] = daftar;
    if (jenis === 'tim') for (const t of daftar) TIM[t.kunci].nama = t.nama;
    if (jenis === 'substage') {
      SUB_TAHAP.length = 0;
      SUB_PER_KODE.clear();
      for (const s of daftar) {
        const o = { kode: s.kunci, nama: s.nama, tim: s.tim, reviewManager: !!s.reviewManager, tahap: tahapDariKode(s.kunci), aktif: s.aktif };
        SUB_TAHAP.push(o);
        SUB_PER_KODE.set(o.kode, o);
      }
    }
    if (jenis === 'platform') { PLATFORM.length = 0; PLATFORM.push(...daftar.filter(x => x.aktif).map(x => x.kunci)); }
    if (jenis === 'satuan') { SATUAN_PAKET.length = 0; SATUAN_PAKET.push(...daftar.filter(x => x.aktif).map(x => x.kunci)); }
    if (jenis === 'prioritas') for (const p of PRIORITAS) p[1] = (daftar.find(x => x.kunci === p[0]) || { label: p[1] }).label;
    if (jenis === 'capaian') {
      for (const c of CAPAIAN) {
        const x = daftar.find(d => d.kunci === c.kode);
        if (x) Object.assign(c, { nama: x.nama, bobot: x.bobot / 100 });
        BOBOT[c.kode] = c.bobot;
      }
    }
    if (jenis === 'kategori') {
      KATEGORI_SEMUA.length = 0;
      KATEGORI_PAKET.length = 0;
      for (const k of Object.keys(ALUR_PAKET)) delete ALUR_PAKET[k];
      for (const k of daftar) {
        KATEGORI_SEMUA.push([k.label, k.kunci]);
        if (k.aktif) KATEGORI_PAKET.push([k.label, k.kunci]);
        ALUR_PAKET[k.label] = k.alur.slice();
      }
      PAKET_PRODUK.length = 0;
      PAKET_PRODUK.push(...KATEGORI_SEMUA.map(([label, kunci]) => [kunci, label]), ['catatan', 'Catatan produk']);
    }
  }

  /* Baris tab master → semua daftar hidup. Jenis yang isiannya merusak (mis. tab diubah manual)
     tak diterapkan: kembali ke bawaan, dan alasannya dikembalikan per jenis. */
  function aturMaster(baris) {
    const salah = {};
    for (const jenis of JENIS_MASTER) {
      const daftar = susunMaster(jenis, (baris || []).filter(b => b && b.jenis === jenis));
      const konteks = jenis === 'kategori' ? { subAda: new Set(SUB_TAHAP.map(s => s.kode)) } : {};
      const s = salahMaster(jenis, daftar, konteks);
      if (s) salah[jenis] = s;
      pakaiMaster(jenis, s ? susunMaster(jenis, []) : daftar);
    }
    return salah;
  }

  /* Isian halaman Master → baris bersih; galat kalau isian itu atau daftar hasilnya tak sah. */
  function periksaMaster(jenis, b, barisLain = []) {
    if (!JENIS_MASTER.includes(jenis)) throw new Error('Jenis master tidak dikenal.');
    const lain = (barisLain || []).filter(r => r && r.jenis === jenis);
    const baru = !!(b && b.baru);
    const daftarKini = MASTER_KINI[jenis] || susunMaster(jenis, lain);
    // Kategori baru: kuncinya dibuat dari label, tak boleh menabrak yang sudah ada.
    const kunci = jenis === 'kategori' && baru ? kunciKategori(b.label, new Set(daftarKini.map(d => String(d.kunci).toLowerCase()))) : b && b.kunci;
    const sama = d => String(d.kunci).toLowerCase() === String(kunci == null ? '' : kunci).replace(/\s+/g, ' ').trim().toLowerCase();
    // Mengubah yang sudah ada: isian yang tak dikirim tetap seperti sebelumnya (mis. hanya menonaktifkan).
    const asal = baru ? null : daftarKini.find(sama);
    const isian = Object.fromEntries(Object.entries(b || {}).filter(([, v]) => v !== undefined));
    const x = bersihMaster(jenis, { ...(asal || {}), ...isian, kunci }, true);
    const lama = daftarKini.find(d => String(d.kunci).toLowerCase() === String(x.kunci).toLowerCase());
    // Item paket merujuk kategorinya lewat nama, jadi nama kategori tetap.
    if (jenis === 'kategori' && !baru && lama && x.label !== lama.label) throw new Error(`Nama kategori "${lama.label}" tak bisa diganti: item paket lama merujuk ke nama itu. Buat kategori baru, lalu nonaktifkan yang lama.`);
    if (jenis === 'kategori' && baru) {
      // kunci sudah unik
    } else if (baru && lama) {
      throw new Error(`"${x.kunci}" sudah ada. Ubah yang sudah ada, atau aktifkan lagi kalau nonaktif.`);
    } else if (!baru && !lama) {
      throw new Error(`"${x.kunci}" tidak ditemukan.`);
    }
    const daftar = susunMaster(jenis, [...lain.filter(r => String(r.kunci).toLowerCase() !== String(x.kunci).toLowerCase()), x]);
    const kategoriAktif = (MASTER_KINI.kategori || susunMaster('kategori', [])).filter(k => k.aktif);
    const konteks = jenis === 'kategori'
      ? { subAda: new Set(SUB_TAHAP.map(s => s.kode)), subAktif: new Set(SUB_TAHAP.filter(s => s.aktif !== false).map(s => s.kode)) }
      : jenis === 'substage' ? { alurAktif: new Set(kategoriAktif.flatMap(k => k.alur.map(l => l.split(':')[0]))) } : {};
    const salah = salahMaster(jenis, daftar, konteks);
    if (salah) throw new Error(salah);
    return { jenis, ...x };
  }
  const daftarMaster = jenis => (MASTER_KINI[jenis] || susunMaster(jenis, [])).map(x => ({ ...x }));
  const labelPrioritas = kunci => (PRIORITAS.find(([k]) => k === kunci) || [kunci, kunci])[1];
  for (const jenis of JENIS_MASTER) MASTER_KINI[jenis] = susunMaster(jenis, []);

  /* ---------- Data real: perintah dan perubahan (2.16.0) ----------
     Data contoh hidup di browser masing-masing. Data real dipakai bersama: setiap perubahan
     dikirim ke server sebagai PERINTAH { id, aksi, isi, oleh, at, hari } — isi hanya berisi ID dan
     isian form. Server menjalankannya dengan aturan yang sama (jalankanPerintah) di atas data real
     terkini, lalu menyimpan PERUBAHANNYA (bedaData: baris yang berubah per koleksi) di spreadsheet.
     Semua browser menerapkan perubahan itu apa adanya (terapkanUbah), tanpa menjalankan aturan
     lagi: perubahan organogram, Master, atau aturan di versi berikutnya tak bisa menggugurkan
     riwayat. Bentuk ini juga yang nanti dipindah ke MySQL (satu baris = satu baris tabel). */
  const dataKosong = () => ({ projects: [], tasks: [], packages: [], dashboards: [], links: [], notes: [], setoran: [], log: [] });
  const cariDi = (daftar, id, nama) => {
    const x = (daftar || []).find(y => y.id === id);
    if (!x) throw new Error(`${nama} ${id || '(kosong)'} tidak ditemukan.`);
    return x;
  };
  const tugas = (d, x) => cariDi(d.tasks, x.task, 'Task');
  const proyekX = (d, x) => cariDi(d.projects, x.proyek, 'Proyek');
  const paketX = (d, x) => cariDi(d.packages, x.paket, 'Paket');
  /* aksi → (data, isi, me, waktu, hari). Nama aksinya = nama fungsi aturannya. */
  const AKSI_DATA = {
    taskBaru: (d, x, me, w, h) => taskBaru(d, x.f || {}, me, w, h),
    taskAnak: (d, x, me, w, h) => taskAnak(d, cariDi(d.tasks, x.induk, 'Task induk'), x.f || {}, me, w, h),
    ubahTask: (d, x, me, w) => ubahTask(d, tugas(d, x), x.f || {}, me, w),
    terapkanAksi: (d, x, me, w) => terapkanAksi(d, tugas(d, x), x.kunci, me, w, x.catatan),
    isiOutput: (d, x, me, w) => isiOutput(d, tugas(d, x), x.isi, me, w),
    tambahBukti: (d, x, me, w) => tambahBukti(d, tugas(d, x), x.f || {}, me, w),
    hapusBukti: (d, x, me, w) => hapusBukti(d, tugas(d, x), x.bukti, me, w),
    tambahSubtask: (d, x, me, w) => tambahSubtask(d, tugas(d, x), x.f || {}, me, w),
    ubahSubtask: (d, x, me, w) => ubahSubtask(d, tugas(d, x), x.sub, x.f || {}, me, w),
    hapusSubtask: (d, x, me, w) => hapusSubtask(d, tugas(d, x), x.sub, me, w),
    centangSubtask: (d, x, me, w) => centangSubtask(d, tugas(d, x), x.sub, x.done, me, w),
    setorkan: (d, x, me, w) => setorkan(d, tugas(d, x), x.f || {}, me, w),
    hapusSetoran: (d, x, me, w) => hapusSetoran(d, x.setoran, me, w),
    proyekBaru: (d, x, me, w) => proyekBaru(d, x.f || {}, me, w),
    setKeputusan: (d, x, me, w) => setKeputusan(d, proyekX(d, x), x.keputusan, me, w),
    mulaiSiklus: (d, x, me, w) => mulaiSiklus(d, proyekX(d, x), me, w),
    setArsip: (d, x, me, w) => setArsip(d, proyekX(d, x), !!x.arsip, me, w),
    tautkanPaket: (d, x, me, w) => tautkanPaket(d, proyekX(d, x), x.paket || '', me, w),
    paketBaru: (d, x, me, w) => paketBaru(d, x.f || {}, me, w),
    simpanPaket: (d, x, me, w) => simpanPaket(d, paketX(d, x), x.f || {}, me, w),
    hapusPaket: (d, x, me, w) => hapusPaket(d, paketX(d, x), me, w),
    ubahNamaPaket: (d, x, me, w) => ubahNamaPaket(d, paketX(d, x), x.nama, me, w),
    elaborasiPaket: (d, x, me, w, h) => elaborasiPaket(d, paketX(d, x), x.f || {}, me, w, h),
    simpanDashboard: (d, x, me, w) => simpanDashboard(d, me, x.f || {}, x.id || '', w),
    hapusDashboard: (d, x, me, w) => hapusDashboard(d, me, x.id, w),
  };
  /* Menjalankan satu perintah dengan aturan, lalu menyamakan tahap proyek (seperti sesudah klik
     di aplikasi). Tak pernah melempar: { ok, hasil, pindah } atau { ok: false, galat }. Yang gagal
     bisa saja sudah mengubah sebagian data, jadi pemanggil menyusun ulang datanya. */
  function jalankanPerintah(data, p) {
    const fn = Object.prototype.hasOwnProperty.call(AKSI_DATA, p.aksi) ? AKSI_DATA[p.aksi] : null;
    if (!fn) return { ok: false, galat: `Perubahan "${p.aksi}" tidak dikenal.` };
    try {
      const hasil = fn(data, p.isi || {}, p.oleh, p.at, p.hari || isoHari(p.at));
      return { ok: true, hasil, pindah: segarkanTahap(data, p.at, p.oleh) };
    } catch (e) {
      return { ok: false, galat: e && e.message ? e.message : String(e) };
    }
  }
  /* Perintah dari browser, diperiksa server sebelum dijalankan. Satu perintah muat di satu sel
     spreadsheet (batas sel 50.000 karakter). */
  const ISI_PERINTAH_MAKS = 40000;
  function periksaPerintah(p) {
    if (!p || typeof p !== 'object') throw new Error('Perubahan kosong.');
    const aksi = String(p.aksi || '');
    if (!Object.prototype.hasOwnProperty.call(AKSI_DATA, aksi)) throw new Error(`Perubahan "${aksi || '(kosong)'}" tidak dikenal.`);
    if (!p.isi || typeof p.isi !== 'object' || Array.isArray(p.isi)) throw new Error('Isi perubahan tidak valid.');
    const json = JSON.stringify(p.isi);
    if (json.length > ISI_PERINTAH_MAKS) throw new Error('Perubahan ini terlalu besar untuk disimpan sekaligus.');
    const id = String(p.id || '');
    if (!/^[A-Za-z0-9_-]{6,40}$/.test(id)) throw new Error('ID perubahan tidak valid.');
    const hari = String(p.hari || '');
    if (hari && !/^\d{4}-\d{2}-\d{2}$/.test(hari)) throw new Error('Tanggal perubahan tidak valid.');
    return { id, aksi, isi: JSON.parse(json), hari, at: Number(p.at) || 0 };
  }
  /* Hasil perintah dalam bentuk kecil (ID saja), untuk dikirim balik ke browser. */
  function ringkasHasil(h) {
    if (!h || typeof h !== 'object') return null;
    if (h.project && Array.isArray(h.tasks)) return { project: h.project.id, tasks: h.tasks.map(t => t.id) };
    return h.id ? { id: h.id } : null;
  }
  /* Koleksi data real. Link Saya dan Catatan Saya tetap pribadi di browser. DEPAN = data baru
     ditaruh di depan, sama dengan fungsi pembuatnya (unshift); selebihnya di belakang (push). */
  const KOLEKSI_REAL = ['projects', 'tasks', 'packages', 'setoran', 'dashboards'];
  const DEPAN = new Set(['projects', 'tasks', 'packages']);
  /* Perubahan dari a ke b: baris yang baru atau berubah (pasang), yang hilang (hapus), dan
     log baru. Membandingkan per baris lewat JSON-nya. */
  function bedaData(a, b) {
    const ubah = {};
    for (const k of KOLEKSI_REAL) {
      const lama = new Map((a[k] || []).map(x => [x.id, JSON.stringify(x)]));
      const ada = new Set();
      const pasang = [];
      for (const x of b[k] || []) {
        ada.add(x.id);
        if (lama.get(x.id) !== JSON.stringify(x)) pasang.push(x);
      }
      const hapus = [...lama.keys()].filter(id => !ada.has(id));
      if (pasang.length || hapus.length) ubah[k] = { ...(pasang.length ? { pasang } : {}), ...(hapus.length ? { hapus } : {}) };
    }
    const logLama = new Set((a.log || []).map(l => l.id));
    const log = (b.log || []).filter(l => !logLama.has(l.id));
    if (log.length) ubah.log = log;
    return ubah;
  }
  /* Menerapkan perubahan apa adanya: hapus, timpa di tempat, lalu yang baru di depan/belakang. */
  function terapkanUbah(data, ubah) {
    if (!ubah) return data;
    for (const k of KOLEKSI_REAL) {
      const u = ubah[k];
      if (!u) continue;
      const daftar = data[k] || (data[k] = []);
      if (u.hapus && u.hapus.length) {
        const buang = new Set(u.hapus);
        for (let i = daftar.length - 1; i >= 0; i--) if (buang.has(daftar[i].id)) daftar.splice(i, 1);
      }
      const posisi = new Map(daftar.map((x, i) => [x.id, i]));
      const baru = [];
      for (const x of u.pasang || []) {
        const i = posisi.get(x.id);
        if (i === undefined) baru.push(x);
        else daftar[i] = x;
      }
      if (baru.length) {
        if (DEPAN.has(k)) daftar.unshift(...baru);
        else daftar.push(...baru);
      }
    }
    if (ubah.log && ubah.log.length) {
      data.log = data.log || [];
      data.log.unshift(...ubah.log);
      if (data.log.length > 1000) data.log.length = 1000;
    }
    return data;
  }

  return {
    MANAGER, KAPASITAS, STATUS, TAHAP, PERAN, ORANG,
    JENIS_MASTER, PLATFORM, PRIORITAS, KATEGORI_SEMUA, aturMaster, periksaMaster, susunMaster, salahMaster, daftarMaster, labelPrioritas,
    ORANG_BAWAAN, DEV, PERAN_ORANG, TIM_LEAD, susunOrang, salahOrganogram, periksaOrang, aturOrang, nonaktif,
    orang, timDari, inisial, isoHari, selisihHari, tambahHari,
    selesai, aktif, indeks, depsBelum, terhambat, ditandaiTertahan, telat, peninjau, bolehUbah, picBoleh, bolehBuatTask, subBolehBagi, bolehUbahTask, alasanTunggu,
    anakTask, bolehBuatAnak, taskAnak, tambahSubtask, ubahSubtask, hapusSubtask, tungguTahap,
    aksiUntuk, terapkanAksi, aksiPindah, catatLog, taskBaru, proyekBaru,
    TIM, SUB_TAHAP, subTahap, leadSub, namaSub, timOrang, timTask, jenisJalur, tahapDariKode, picSah,
    syaratAjukan, labelKeadaan, isiOutput, tambahBukti, hapusBukti, ubahTask, timProyek,
    namaTahap, tahapBerikut, ringkasProyek, antreKeputusan, tahapDihitung, segarkanTahap, siklusTutup, mulaiSiklus,
    KEPUTUSAN, setKeputusan, setArsip,
    pekerjaanSaya, perhatian, lingkupBoleh, lingkupAwal, lingkupSah, lingkupOrang, lingkupKom, kolomPapan, bebanOrang, laporan, cari,
    PERIODE, rentang, laporanPeriode, daftarTask, rentangTask, gridBulan, geserBulan,
    terlibat, notifikasi, JENIS_LOG, saringLog,
    JENIS_PERISTIWA, REAKSI, BATAS_PESAN, ruangTask, ruangProyek, ruangTim, bacaRuang, anggotaTim, bolehRuang, ruangTimSaya,
    periksaPeristiwa, susunObrolan, sebutan, menyebut, tanyaTerbuka, aktivitasTask, daftarUtas,
    PAKET_IDENTITAS, PAKET_PRODUK, KATEGORI_PAKET, SATUAN_PAKET, hitungTarget, ringkasPaket, bolehUbahPaket, paketBaru, simpanPaket, hapusPaket,
    setoranPaket, sisaTerbuka, elaborasiPaket, bolehSetor, setorkan, hapusSetoran, tautkanPaket,
    CAPAIAN, namaCapaian, batchSetoran, ALUR_PAKET, langkahAlur, proyekPengisi, paketProyek,
    FOLDER_UMUM, tautanRapi, judulTautan, kelompokFolder, simpanLink, simpanCatatan, tandaiLink, sematkanCatatan, hapusMilik, gantiNamaFolder, hapusFolder,
    WARNA_CATATAN, warnaiCatatan, hitungChecklist, centangBaris, teksBarisCatatan, tandaiBarisTask,
    JENIS_BLOK, blokCatatan, teksBlok, teksBlokDanBaris, nomorDaftar,
    FOTO_MAKS, fotoSah, periksaFoto,
    IKON_DASHBOARD, simpanDashboard, hapusDashboard,
    centangSubtask, dataKosong, AKSI_DATA, jalankanPerintah, periksaPerintah, ringkasHasil, KOLEKSI_REAL, bedaData, terapkanUbah,
    KODE_AI, AKSI_AGEN, PESAN_AGEN,
    platformPaket, rapikanPlatform, jadwalDaftar, daftarBeririsan, ubahNamaPaket,
  };
}));
