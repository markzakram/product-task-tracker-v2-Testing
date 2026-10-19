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
     bila syaratnya lengkap: output, tautan bukti, ceklis, task turunan, tahap sebelumnya.
     Jalur RUTIN (kode R, di luar proyek) tanpa tinjauan.
   - Sejak 0.15.0 task proyek di tahap ADDIE yang sama dikerjakan PARALEL; yang berurutan
     hanya tahapnya: task menunggu tahap sebelumnya di siklus itu selesai. Lead bisa membagi
     task jadi task turunan untuk timnya, atau mengganti PIC ke staff lewat Ubah task.
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

  /* ---------- Izin per peran (2.29.0, permintaan user) ----------
     Semua yang boleh dilakukan Manager, Lead, dan Staff, dalam satu daftar. Yang tanpa "tetap"
     diatur Dev di Panel Dev → Izin (centang per peran), tersimpan di tab master (jenis izin) dan
     berlaku di browser dan server. Yang "tetap" mengikuti struktur tim dan alur tinjauan (siapa
     Lead tim pemiliknya, siapa peninjaunya), jadi hanya ditampilkan supaya daftarnya lengkap.
     aksi = sisa kalimat penolakan: "Hanya Manager yang <aksi>." */
  const PERAN_IZIN = ['manager', 'lead', 'staff'];
  const IZIN = [
    { kunci: 'proyek.buat', grup: 'Proyek', label: 'Membuat proyek', aksi: 'membuat proyek', peran: ['manager'] },
    { kunci: 'proyek.ubah', grup: 'Proyek', label: 'Mengubah nama, platform, dan tujuan proyek', aksi: 'mengubah proyek', peran: ['manager'] },
    { kunci: 'proyek.hapus', grup: 'Proyek', label: 'Menghapus proyek', aksi: 'menghapus proyek', peran: ['manager'] },
    { kunci: 'proyek.arsip', grup: 'Proyek', label: 'Mengarsipkan dan mengaktifkan lagi proyek', aksi: 'mengarsipkan proyek', peran: ['manager'] },
    { kunci: 'proyek.siklus', grup: 'Proyek', label: 'Memulai siklus baru', aksi: 'memulai siklus baru', peran: ['manager'] },
    { kunci: 'proyek.keputusan', grup: 'Proyek', label: 'Mengubah keputusan proyek (Build, Improve, Maintain, Hold)', aksi: 'memutuskan', peran: ['manager'] },
    { kunci: 'proyek.paket', grup: 'Proyek', label: 'Menautkan proyek ke rancangan paket', aksi: 'menautkan proyek ke paket', peran: ['manager'] },
    { kunci: 'paket.buat', grup: 'Rancangan Paket', label: 'Membuat rancangan paket', aksi: 'membuat paket', peran: ['manager', 'lead'] },
    { kunci: 'paket.bagikan', grup: 'Rancangan Paket', label: 'Membagikan paket ke Lintas Divisi', aksi: 'bisa membagikan paket', peran: ['manager', 'lead'] },
    { kunci: 'paket.hapus', grup: 'Rancangan Paket', label: 'Menghapus rancangan paket', aksi: 'menghapus paket', peran: ['manager'] },
    { kunci: 'paket.elaborasi', grup: 'Rancangan Paket', label: 'Mengelaborasi paket jadi proyek', aksi: 'mengelaborasi paket', peran: ['manager', 'lead'] },
    { kunci: 'paket.setoran', grup: 'Rancangan Paket', label: 'Mengatur setoran task ke paket (pada task yang boleh ia ubah)', aksi: 'mengatur setoran', peran: ['manager', 'lead'] },
    { kunci: 'task.hapusSemua', grup: 'Task', label: 'Menghapus task siapa pun', aksi: 'menghapus task siapa pun', peran: ['manager'] },
    { kunci: 'task.urutanSemua', grup: 'Task', label: 'Mengatur urutan tunggu task tim mana pun', aksi: 'mengatur urutan tunggu semua tim', peran: ['manager'] },
    { kunci: 'master.ubah', grup: 'Pengaturan', label: 'Mengubah Master (sub-stage, kategori, platform, label)', aksi: 'bisa mengubah Master', peran: ['manager', 'lead'] },
    { kunci: 'tautanTim.kelola', grup: 'Pengaturan', label: 'Mengelola Tautan tim', aksi: 'mengelola tautan tim', peran: ['manager'] },
    { kunci: 'halaman.laporan', grup: 'Halaman', label: 'Membuka Laporan', aksi: 'membuka Laporan', peran: ['manager', 'lead'] },
    { kunci: 'halaman.riwayat', grup: 'Halaman', label: 'Membuka Riwayat Aktivitas', aksi: 'membuka Riwayat Aktivitas', peran: ['manager'] },
    { kunci: 'inisiatif.kelola', grup: 'Inisiatif', label: 'Mendeklarasikan, mengubah, dan menghapus inisiatif timnya (sementara hanya tim DAE)', aksi: 'mengelola inisiatif', peran: ['manager', 'lead'] },
    { kunci: 'acara.undang', grup: 'Kalender', label: 'Membuat acara bersama: mengundang peserta dari tim mana pun, atau membukanya untuk semua orang', aksi: 'membuat acara bersama', peran: ['manager', 'lead', 'staff'] },
    // Tetap: mengikuti struktur tim dan alur tinjauan.
    { kunci: 'task.buat', grup: 'Task', label: 'Menambah task (staff: untuk dirinya sendiri)', peran: ['manager', 'lead', 'staff'], tetap: true },
    { kunci: 'task.ubah', grup: 'Task', label: 'Mengubah task: Manager semua, Lead task timnya, staff yang ia buat sendiri', peran: ['manager', 'lead', 'staff'], tetap: true },
    { kunci: 'task.kerjakan', grup: 'Task', label: 'Mengisi output, tautan, dan ceklis pengerjaan task yang dipegangnya', peran: ['manager', 'lead', 'staff'], tetap: true },
    { kunci: 'task.turunan', grup: 'Task', label: 'Membagi task jadi task turunan (Lead tim pemiliknya)', peran: ['lead'], tetap: true },
    { kunci: 'task.tinjau', grup: 'Task', label: 'Meninjau task: Lead untuk staff timnya, Manager untuk Lead dan sub-stage bertanda Manager', peran: ['manager', 'lead'], tetap: true },
    { kunci: 'task.hapusTim', grup: 'Task', label: 'Menghapus task di tab timnya sendiri', peran: ['lead'], tetap: true },
    { kunci: 'task.urutanTim', grup: 'Task', label: 'Mengatur urutan tunggu task timnya sendiri', peran: ['lead'], tetap: true },
    { kunci: 'kalender.saya', grup: 'Ruang Saya', label: 'Kalender Saya, Link Saya, Catatan Saya, dan tampilan pribadi', peran: ['manager', 'lead', 'staff'], tetap: true },
    { kunci: 'dev.atur', grup: 'Pengaturan', label: 'Orang, PIN profil, sumber data, dan izin ini (hanya mode Dev)', peran: [], tetap: true },
  ];
  const IZIN_PER = new Map(IZIN.map(x => [x.kunci, x]));
  /* Peran yang sedang berlaku per izin yang bisa diatur (dari tab master; kosong = bawaan). */
  const IZIN_KINI = new Map();
  const izinPeran = kunci => IZIN_KINI.get(kunci) || (IZIN_PER.get(kunci) || {}).peran || [];
  // Dev (akun teknis) selalu boleh: dialah yang mengatur izin ini.
  const izin = (me, kunci) => me === DEV || izinPeran(kunci).includes(orang(me).peran);
  /* Galat penolakan: "Hanya Lead atau Manager yang membuat paket." (urutan staff, lead, manager). */
  function tolakIzin(kunci) {
    const x = IZIN_PER.get(kunci);
    const nama = ['staff', 'lead', 'manager'].filter(p => izinPeran(kunci).includes(p)).map(p => PERAN[p]);
    const daftar = nama.length > 2 ? `${nama.slice(0, -1).join(', ')}, atau ${nama[nama.length - 1]}` : nama.join(' atau ');
    return new Error(nama.length ? `Hanya ${daftar} yang ${x.aksi}.` : `Tak ada peran yang boleh ${x.aksi} (diatur di Panel Dev → Izin).`);
  }
  const wajibIzin = (me, kunci) => { if (!izin(me, kunci)) throw tolakIzin(kunci); };

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

  /* Sejak 2.19.0 tim tampil dengan singkatannya: DAE (SI), RAD (AK), LNA (LA), CLO (CO). Kode
     lamanya tetap dipakai di data (sub-stage, ruang tim, organogram, Master), jadi tak ada data
     yang perlu diubah. Nama dan singkatan bisa diganti Manager di Master. */
  const SINGKAT_TIM = { MG: 'MG', AK: 'RAD', LA: 'LNA', CO: 'CLO', SI: 'DAE' };
  const TIM = {
    MG: { kode: 'MG', singkat: 'MG', nama: 'Manager', lead: 'nynda' },
    AK: { kode: 'AK', singkat: 'RAD', nama: 'Research, Academic & Development', lead: 'andika' },
    LA: { kode: 'LA', singkat: 'LNA', nama: 'Learning & Architecture', lead: 'alya' },
    CO: { kode: 'CO', singkat: 'CLO', nama: 'Content & Learning Operation', lead: 'dhea' },
    SI: { kode: 'SI', singkat: 'DAE', nama: 'Data & AI Engineer', lead: 'ali' },
  };
  const singkatTim = kode => (TIM[kode] ? TIM[kode].singkat || kode : kode || '');
  /* "LNA · Learning & Architecture": untuk judul ruang tim dan keterangan. */
  const labelTim = kode => (TIM[kode] ? `${singkatTim(kode)} · ${TIM[kode].nama}` : kode || '');
  /* Tim yang punya tab di halaman proyek, berurutan: DAE, RAD, LNA, CLO. Task Manager (A1, A6,
     I8, E12) menjadi gerbang proyek, bukan tab. */
  const TIM_PROYEK = ['SI', 'AK', 'LA', 'CO'];
  const timOrang = id => {
    const o = orang(id);
    const lead = o.peran === 'manager' ? o.id : o.peran === 'lead' ? o.id : o.lead;
    return Object.values(TIM).find(x => x.lead === lead) || null;
  };
  /* Tab yang terbuka saat halaman proyek dibuka (2.23.0, permintaan user): tab tim sendiri untuk
     Lead dan staff; Ringkasan untuk Manager dan orang yang timnya tak punya tab proyek. */
  const tabAwalProyek = me => {
    const t = timOrang(me);
    return orang(me).peran !== 'manager' && t && TIM_PROYEK.includes(t.kode) ? t.kode : 'ringkas';
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
    if (peran === 'lead' && !TIM_LEAD.includes(tim)) return salah('Lead harus memegang salah satu tim: DAE, RAD, LNA, atau CLO.');
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
  /* ---------- Yang ditunggu sebuah task: ADDIE per tim (2.19.0) ----------
     Halaman proyek dibagi per tim pemilik sub-stage (tab DAE · RAD · LNA · CLO), dan tiap tim
     menjalankan ADDIE-nya sendiri (keputusan user 2026-10-13, menggantikan tahap ADDIE bersama
     sejak 0.15.0). Task proyek menunggu:
       fase    — task tim yang sama di fase lebih awal, siklus sama (bawaan; mati bila lepasFase);
       atur    — task yang dipilih Lead timnya (t.tunggu), boleh dari tim lain: serah-terima;
       gerbang — task Manager di Analysis (A1, A6): Design dan sesudahnya di tiap tim menunggunya;
       tutup   — E12 menunggu semua task lain di siklusnya.
     Tim yang berbeda tak saling menunggu kecuali lewat gerbang atau yang diatur. Task turunan
     mengikuti induknya. Task yang diatur menunggu task setim di fase lebih lambat (mis. I4 tayang
     menunggu QC E4–E6) berdiri di fase itu (faseUrut), sehingga task fase itu tak balik
     menunggunya: urutan bawaan dan yang diatur tak pernah saling mengunci. Task lain (rutin,
     atau proyek tanpa tahap) tetap menunggu task di deps-nya. */
  const tungguTahap = t => t.lane === 'proyek' && !!t.project && URUT_TAHAP.includes(t.stage);
  const urutFase = s => URUT_TAHAP.indexOf(s);
  /* Tim sebuah task di halaman proyek: tim pemilik sub-stage-nya; task turunan ikut induknya. */
  function timJalur(t, perId) {
    const induk = t.induk && perId ? perId.get(t.induk) : null;
    return timTask(induk || t);
  }
  const akarTask = (t, perId) => (t.induk && perId.get(t.induk)) || t;
  const sesiklus = (t, perId) => (kelompok(perId).proyek.get(t.project) || [])
    .filter(x => (x.cycle || 1) === (t.cycle || 1) && URUT_TAHAP.includes(x.stage));
  /* Fase tempat task berdiri di urutan timnya: fasenya sendiri, atau fase task setim paling
     lambat yang diatur untuk ditunggunya (I4 yang menunggu E6 berdiri di Evaluation). */
  function faseUrut(x, perId, memo = new Map(), jalan = new Set()) {
    const akar = akarTask(x, perId);
    if (memo.has(akar.id)) return memo.get(akar.id);
    let f = urutFase(akar.stage);
    if (jalan.has(akar.id)) return f;   // putaran yang diatur: berhenti di sini
    jalan.add(akar.id);
    const tim = timTask(akar);
    for (const id of akar.tunggu || []) {
      const y = perId.get(id);
      if (y && y.project === akar.project && (y.cycle || 1) === (akar.cycle || 1) && timJalur(y, perId) === tim) f = Math.max(f, faseUrut(y, perId, memo, jalan));
    }
    jalan.delete(akar.id);
    memo.set(akar.id, f);
    return f;
  }
  /* Semua yang ditunggu sebuah task, selesai maupun belum: [{ t, jenis }]. */
  function ditunggu(t, perId) {
    if (!tungguTahap(t)) return (t.deps || []).map(id => perId.get(id)).filter(Boolean).map(x => ({ t: x, jenis: 'atur' }));
    const akar = akarTask(t, perId);
    const siklus = sesiklus(akar, perId);
    const out = [];
    const ada = new Set([t.id, akar.id]);
    const tambah = (x, jenis) => { if (!ada.has(x.id)) { ada.add(x.id); out.push({ t: x, jenis }); } };
    if (akar.sub === 'E12') {
      for (const x of siklus) if (x.sub !== 'E12') tambah(x, 'tutup');
      return out;
    }
    for (const id of akar.tunggu || []) {
      const x = perId.get(id);
      if (x && siklus.includes(x)) tambah(x, 'atur');
    }
    const tim = timTask(akar);
    const fase = urutFase(akar.stage);
    if (tim !== 'MG' && fase > 0) for (const x of siklus) if (x.stage === 'A' && timJalur(x, perId) === 'MG') tambah(x, 'gerbang');
    if (!akar.lepasFase) {
      const memo = new Map();
      for (const x of siklus) if (timJalur(x, perId) === tim && faseUrut(x, perId, memo) < fase) tambah(x, 'fase');
    }
    return out;
  }
  /* Yang ditunggu masih menahan? Sejak 2.30.0 (permintaan user) task yang sudah diajukan dan
     sedang ditinjau tak lagi menahan: langkah berikutnya, juga di tim lain, boleh berjalan sejajar
     selagi Lead atau Manager meninjaunya. Sejak 2.34.2 (permintaan user) begitu pula task yang
     ditandai tertahan: hambatannya tak ikut menghentikan langkah berikutnya. E12 tetap menunggu
     semua task lain benar-benar selesai (disetujui), supaya siklus tak tertutup sebelum
     tinjauannya beres. */
  const masihMenahan = x => aktif(x.t) && (x.jenis === 'tutup' || (x.t.status !== 'Ditinjau' && !x.t.tertahan));
  const tungguBelum = (t, perId) => ditunggu(t, perId).filter(masihMenahan);
  /* Kapan task terakhir diajukan (0 bila tak sedang ditinjau). */
  const waktuDiajukan = t => (t.status === 'Ditinjau' ? Math.max(0, ...(t.tinjauan || []).filter(r => r.action === 'Diajukan').map(r => r.at || 0)) : 0);
  function depsBelum(t, perId) {
    return tungguBelum(t, perId).map(x => x.t);
  }
  /* Jalur saling menunggu yang kembali ke task ini (mis. urutan yang diatur tak sengaja
     memutar), atau null. Task turunan diwakili induknya. */
  function putaranTunggu(t, perId) {
    const asal = akarTask(t, perId);
    const lihat = new Set([asal.id]);
    const jalur = [asal.id];
    const cari = x => {
      for (const y0 of depsBelum(x, perId)) {
        const y = akarTask(y0, perId);
        if (y === asal) return true;
        if (lihat.has(y.id)) continue;
        lihat.add(y.id);
        jalur.push(y.id);
        if (cari(y)) return true;
        jalur.pop();
      }
      return false;
    };
    return cari(asal) ? [...jalur, asal.id] : null;
  }
  /* terhambat = belum bisa dikerjakan sekarang (ditandai tertahan, atau menunggu task
     lain). ditandaiTertahan = hanya yang sengaja ditandai orang dengan alasan; inilah
     yang dihitung sebagai masalah. Menunggu urutan proses itu wajar, bukan masalah. */
  const terhambat = (t, perId) => aktif(t) && (!!t.tertahan || depsBelum(t, perId).length > 0);
  const ditandaiTertahan = t => aktif(t) && !!t.tertahan;
  /* Sejak 2.30.0 (permintaan user) task yang sudah diajukan (Ditinjau) sudah dikumpulkan: tak
     lagi dihitung telat walau tinjauannya lewat tenggat. Kalau dikembalikan, ia terbaca telat lagi. */
  const telat = (t, hariIni) => aktif(t) && t.status !== 'Ditinjau' && !!t.due && t.due < hariIni;
  /* Kapan hasil kerjanya dikumpulkan: saat diajukan terakhir sebelum disetujui (yang ditinjau),
     atau saat ditandai selesai (yang tanpa tinjauan). 0 bila belum. */
  function waktuKumpul(t) {
    if (t.status === 'Ditinjau') return waktuDiajukan(t);
    if (!selesai(t)) return 0;
    const aju = (t.tinjauan || []).filter(r => r.action === 'Diajukan' && (r.at || 0) <= (t.selesaiAt || Infinity)).map(r => r.at || 0);
    return aju.length ? Math.max(...aju) : t.selesaiAt || 0;
  }

  /* Siapa yang meninjau task ini sebelum selesai. null = tanpa tinjauan.
     Task rutin tak perlu ditinjau; yang terlanjur Ditinjau (bawaan "Review PM"
     dari v1) diputuskan Manager. Sub-stage bertanda Manager (A1, A6, D1, I8, E12)
     selalu direview Manager; selainnya output staff oleh Lead-nya, output Lead oleh
     Manager. */
  function peninjau(t) {
    if (t.lane !== 'proyek') return t.status === 'Ditinjau' ? MANAGER : null;
    const o = orang(t.pic);
    if (o.peran === 'manager') return null;
    // Task turunan ditinjau atasan PIC-nya (Lead yang membaginya), juga untuk sub-stage bertanda Manager.
    if (t.induk && o.peran === 'staff') return o.lead || MANAGER;
    // Turunan yang dikerjakan Lead itu sendiri (2.21.0) tak ditinjau lagi: induknya tetap
    // mengikuti aturan tinjauan PIC-nya dan menunggu semua turunannya selesai.
    if (t.induk && o.peran === 'lead') return null;
    const s = subTahap(t.sub);
    if (s && s.reviewManager) return MANAGER;
    const minta = peninjauMinta(t);
    if (minta) return minta;
    if (o.peran === 'lead') return MANAGER;
    return o.lead || MANAGER;
  }
  /* Task hasil permintaan lanjutan (2.38.0, permintaan user): ditinjau Lead tim peminta, bukan
     Lead PIC atau Manager. Contoh user: DAE membuat generator dari hasil kerja RAD, maka yang
     menyetujui RAD (Andika); Manager hanya memantau. t.diminta = orang yang meminta, diisi saat
     permintaan diterima. Tak berlaku untuk task turunan, untuk sub-stage yang direview Manager
     (diperiksa peninjau lebih dulu), dan kalau Lead itu PIC-nya sendiri (permintaan di dalam tim). */
  function peninjauMinta(t) {
    if (!t || !t.diminta || t.lane !== 'proyek' || t.induk) return '';
    const lead = leadDari(t.diminta);
    return lead && lead !== t.pic && ORANG_PER_ID.has(lead) ? lead : '';
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

  /* ---------- Task turunan (0.15.0) ----------
     Lead bisa membagi pekerjaan menjadi task turunan untuk staff timnya di bawah task itu.
     Anak ada di proyek, siklus, dan tahap yang sama dengan induknya, ditinjau Lead itu,
     dan tak beranak lagi; induknya baru bisa diajukan atau
     ditandai selesai setelah semua turunannya selesai. */
  // Sejak 2.21.0 Lead boleh memegang turunannya sendiri, jadi Lead tanpa staff pun bisa membagi.
  /* Sejak 2.25.0 (permintaan user: task turunan di semua tahap ADDIE, juga sesudah task dibuat)
     Lead tim pemilik task juga membaginya walau PIC-nya staff timnya, mis. task Design yang
     langsung diberikan ke staff. */
  function bolehBuatAnak(t, me) {
    if (!t || t.induk || !aktif(t) || t.status === 'Ditinjau' || jenisJalur(t) === 'lepas' || orang(me).peran !== 'lead') return false;
    if (t.pic === me || orang(t.pic).lead === me) return true;
    const tim = t.project ? TIM[timTask(t)] : null;
    return !!tim && tim.lead === me;
  }
  /* Kenapa task ini tak bisa dibagi oleh me, dalam kalimat untuk detail task ('' = bisa). */
  function alasanTakBisaBagi(t, me) {
    if (!t || bolehBuatAnak(t, me)) return '';
    if (t.induk) return 'Task turunan tak beranak lagi.';
    if (jenisJalur(t) === 'lepas') return 'Pekerjaan lepas warisan v1 tak dibagi jadi task turunan.';
    if (selesai(t)) return 'Task ini sudah selesai. Task turunan ditambah selama task masih berjalan.';
    if (t.status === 'Ditinjau') return 'Task ini sedang ditinjau. Task turunan bisa ditambah lagi kalau dikembalikan untuk revisi.';
    const tim = t.project ? TIM[timTask(t)] : null;
    const lead = tim && orang(tim.lead).peran === 'lead' ? tim.lead : orang(t.pic).peran === 'lead' ? t.pic : orang(t.pic).lead;
    return lead && orang(lead).peran === 'lead'
      ? `Task turunan dibuat ${orang(lead).pendek} sebagai Lead tim pemilik task ini.`
      : 'Task turunan dibuat Lead tim pemilik task ini.';
  }
  /* Siapa yang boleh jadi PIC task turunan dari induk ini: Lead pembaginya (yang memegang induk,
     atau Lead tim/atasan staff pemegangnya, 2.25.0) dan staff timnya. */
  function picTurunan(induk) {
    if (!induk) return [];
    const o = orang(induk.pic);
    const tim = induk.project ? TIM[timTask(induk)] : null;
    const pembagi = o.peran === 'lead' ? induk.pic : tim && orang(tim.lead).peran === 'lead' ? tim.lead : o.lead;
    return [...new Set([pembagi, ...timDari(pembagi)].filter(Boolean))];
  }
  /* Pilihan PIC form Ubah dan validasi server (2.38.1). Lead dan seluruh staff aktif tim
     pemilik ikut ditawarkan, juga saat PIC sekarang Lead atau task sudah punya turunan.
     Keluarga task tetap di tim pembaginya; mengganti PIC induk tak mengganti PIC turunannya.
     PIC lama tetap terbaca walau nonaktif, tetapi tak ditawarkan untuk penugasan baru. */
  function pilihanPicUbah(t, me, perId, kode = t.sub) {
    if (!bolehUbahTask(t, me)) return [];
    if (orang(me).peran === 'staff') return [t.pic];
    const induk = t.induk ? perId.get(t.induk) : null;
    const dibagi = anakTask(perId, t.id).length > 0;
    const pemilik = leadSub(kode) || (timOrang(t.pic) || {}).lead;
    let daftar = induk ? picTurunan(induk) : dibagi ? picTurunan(t)
      : [pemilik, ...timDari(pemilik), ...picBoleh(me)];
    if (dibagi) {
      const pembagi = picTurunan(t)[0];
      daftar = daftar.filter(pic => picTurunan({ ...t, sub: kode, pic })[0] === pembagi);
    }
    return [...new Set([...daftar.filter(id => ORANG_PER_ID.has(id)), t.pic])];
  }
  function salahInduk(induk, me, anak) {
    if (!induk) return 'Task induk tidak ditemukan.';
    if (!bolehBuatAnak(induk, me)) return 'Task turunan dibuat Lead yang memegang task itu atau Lead tim pemiliknya, selama task itu belum diajukan atau selesai.';
    if (anak.pic !== me && !timDari(me).includes(anak.pic)) return 'PIC task turunan: Anda sendiri atau staff tim Anda.';
    if ((induk.project || '') !== (anak.project || '')) return 'Task turunan ada di proyek yang sama dengan induknya.';
    if (induk.project && ((induk.cycle || 1) !== anak.cycle || induk.stage !== anak.stage)) {
      return `Task turunan ada di tahap yang sama dengan induknya (${namaTahap(induk.stage)}).`;
    }
    return '';
  }

  const potong = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1).trimEnd() + '…' : String(s));

  /* Alasan task belum bisa jalan, dalam kalimat untuk layar. */
  function alasanTunggu(t, perId) {
    if (t.tertahan) return 'Tertahan: ' + (t.alasanTertahan || 'tanpa alasan');
    const d = tungguBelum(t, perId);
    if (d.length && tungguTahap(t)) {
      const sebut = x => `${x.id} "${potong(x.title, 40)}" (${singkatTim(timJalur(x, perId))} · ${orang(x.pic).pendek})`;
      const jenis = ['atur', 'gerbang', 'fase', 'tutup'].find(j => d.some(x => x.jenis === j));
      const sejenis = d.filter(x => x.jenis === jenis).map(x => x.t);
      const dan = d.length > 1 ? ` dan ${d.length - 1} task lain` : '';
      if (jenis === 'tutup') return `Menunggu semua task lain di siklus ini selesai (${d.length} lagi)`;
      if (jenis === 'gerbang') return `Menunggu gerbang Manager: ${sebut(sejenis[0])}${dan}`;
      if (jenis === 'fase') {
        const tahap = URUT_TAHAP.find(s => sejenis.some(x => x.stage === s));
        const satu = sejenis.find(x => x.stage === tahap && !x.induk) || sejenis.find(x => x.stage === tahap);
        return `Menunggu fase ${namaTahap(tahap)} ${singkatTim(timJalur(t, perId))} selesai: ${sebut(satu)}${dan}`;
      }
      return `Menunggu ${sebut(sejenis[0])}${dan}`;
    }
    if (d.length) return 'Menunggu ' + d.map(x => `${x.t.id} "${potong(x.t.title, 48)}" (${orang(x.t.pic).pendek})`).join(', ');
    if (t.status === 'Ditinjau') return 'Menunggu tinjauan ' + orang(peninjau(t) || MANAGER).pendek;
    return '';
  }
  /* Versi singkat untuk kartu kanban: "Menunggu RAD · PRD-12", "Menunggu fase Design LNA", … */
  function tungguSingkat(t, perId) {
    const d = tungguBelum(t, perId);
    if (!d.length) return '';
    if (!tungguTahap(t)) return 'Menunggu ' + d[0].t.id;
    const x = ['atur', 'gerbang', 'fase', 'tutup'].map(j => d.find(y => y.jenis === j)).find(Boolean);
    if (x.jenis === 'tutup') return 'Menunggu semua task lain';
    if (x.jenis === 'gerbang') return 'Menunggu gerbang Manager';
    if (x.jenis === 'fase') return `Menunggu fase ${namaTahap(x.t.stage)} ${singkatTim(timJalur(t, perId))}`;
    return `Menunggu ${singkatTim(timJalur(x.t, perId))} · ${x.t.id}`;
  }

  /* Syarat sebelum output task proyek diajukan ke gate (PRD): output terisi, semua ceklis dan
     task turunan beres, tahap sebelumnya (atau task yang ditunggu) selesai, dan tidak tertahan.
     Sejak 2.28.0 (permintaan user) tautan hasil kerja opsional, bukan syarat. */
  function syaratAjukan(t, perId) {
    const anak = t.id ? anakTask(perId, t.id) : [];
    return [
      { kunci: 'output', label: 'Output terisi', ok: !!String(t.output || '').trim() },
      { kunci: 'sub', label: 'Semua ceklis pengerjaan selesai', ok: (t.subtasks || []).every(s => s.done) },
      ...(anak.length ? [{ kunci: 'anak', label: `Semua task turunan selesai (${anak.filter(selesai).length}/${anak.length})`, ok: anak.every(selesai) }] : []),
      { kunci: 'deps', label: 'Task yang ditunggu sudah diajukan, tertahan, atau selesai', ok: depsBelum(t, perId).length === 0 },
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
      // Task turunan tak dibuka lagi selagi induknya sedang ditinjau atau sudah selesai.
      const induk = t.induk ? perId.get(t.induk) : null;
      const kunci = !!induk && (selesai(induk) || induk.status === 'Ditinjau');
      return [{ kunci: 'buka', label: 'Buka kembali', nonaktif: kunci,
        alasan: kunci ? `Induknya ${induk.id} ${selesai(induk) ? 'sudah selesai' : 'sedang ditinjau'}: buka kembali atau kembalikan induknya dulu.` : '' }];
    }
    if (t.status === 'Ditinjau') {
      const daftar = [];
      // Manager boleh menyetujui task siapa pun, kecuali task hasil permintaan lanjutan yang
      // ditinjau tim peminta: di sana Manager hanya memantau (2.38.0).
      const pantau = !!tinjau && tinjau !== me && tinjau === peninjauMinta(t);
      if (me === tinjau || (orang(me).peran === 'manager' && !pantau)) {
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
        if (buka.length) alasan = 'Selesaikan dulu task turunannya: ' + buka.map(x => x.id).join(', ');
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

  /* Nomor ID tak dipakai ulang (2.27.0): sesudah proyek, task, atau paket dihapus, yang baru
     tetap melanjutkan nomor tertinggi, bukan mengisi ulang nomor yang dihapus (riwayat, pesan
     Komunikasi, dan tautan lama ke PRD-… itu tak berpindah ke task baru). data.nomor =
     [{ id: 'PRD', n }] mencatat nomor tertinggi saat sesuatu dihapus; selebihnya dari ID yang ada. */
  function nomorBerikut(daftar, awalan, data) {
    let n = 0;
    for (const x of daftar) {
      const m = new RegExp('^' + awalan + '-(\\d+)$').exec(x.id);
      if (m) n = Math.max(n, Number(m[1]));
    }
    const catat = data && (data.nomor || []).find(x => x.id === awalan);
    return Math.max(n, catat ? Number(catat.n) || 0 : 0) + 1;
  }
  /* Dipanggil sebelum menghapus: nomor tertinggi yang ada sekarang dicatat. */
  function catatNomor(data, daftar, awalan) {
    const n = nomorBerikut(daftar, awalan, data) - 1;
    if (!n) return;
    data.nomor = data.nomor || [];
    const ada = data.nomor.find(x => x.id === awalan);
    if (!ada) data.nomor.push({ id: awalan, n });
    else if ((Number(ada.n) || 0) < n) ada.n = n;
  }

  /* Task proyek wajib bersub-stage ADDIE (tahapnya ikut kode, lalu terkunci); task di
     luar proyek adalah jalur rutin, bersub-stage R1–R4. */
  function taskBaru(data, f, me, waktu, hariIni) {
    const p = f.project ? data.projects.find(x => x.id === f.project) : null;
    if (f.project && !p) throw new Error('Proyek tidak ditemukan.');
    if (!String(f.title || '').trim()) throw new Error('Judul task wajib diisi.');
    const s = subTahap(f.sub);
    if (s && s.dihapus && !teks(f.induk)) throw new Error(`Sub-stage ${s.kode} sudah dihapus dari Master. Pilih sub-stage lain.`);
    if (p && (!s || s.tahap === 'R')) throw new Error('Pilih sub-stage ADDIE untuk task proyek.');
    if (!p && s && s.tahap !== 'R') throw new Error('Task di luar proyek memakai sub-stage rutin (kode R).');
    if (!bolehBuatTask(me)) throw new Error('Pilih profil dulu.');
    if (orang(me).peran === 'staff') {
      if (f.pic !== me) throw new Error('Staff menambah task untuk dirinya sendiri. Penyerahan ke orang lain lewat Lead.');
      if (s && !subBolehBagi(me, s.kode)) throw new Error(`${s.kode} dipegang tim lain atau direview Manager. Staff memakai sub-stage milik timnya sendiri.`);
    }
    if (!picSah(me, f.pic, f.sub)) throw new Error('PIC itu di luar tim Anda, dan bukan Lead tim pemilik sub-stage ini.');
    const pInduk = teks(f.induk) ? data.tasks.find(x => x.id === teks(f.induk)) || null : null;
    const ini = inisiatifUntukTask(data, f.inisiatif, p, me);
    if (teks(f.induk)) {
      const salah = salahInduk(pInduk, me, { pic: f.pic, project: p ? p.id : '', cycle: p ? p.cycle || 1 : 1, stage: p ? s.tahap : '' });
      if (salah) throw new Error(salah);
    }
    const t = {
      id: 'PRD-' + String(nomorBerikut(data.tasks, 'PRD', data)).padStart(3, '0'),
      project: p ? p.id : '', lane: p ? 'proyek' : 'rutin', kategori: p ? '' : (s ? s.nama : ini ? ini.nama : f.kategori || 'Umum'),
      title: String(f.title).trim(), platform: f.platform || (p ? p.platform : 'All Platform'),
      stage: p ? s.tahap : '', sub: s ? s.kode : '', detail: String(f.detail || '').trim(),
      pic: f.pic, support: (f.support || []).filter(x => x !== f.pic), priority: f.priority || 'Normal',
      start: hariIni, due: f.due || '', status: 'Antre', tertahan: false, alasanTertahan: '',
      output: String(f.output || '').trim(), deps: (f.deps || []).slice(), tunggu: [], lepasFase: false,
      notes: '', assignedBy: me, cycle: p ? p.cycle || 1 : 1, induk: pInduk ? pInduk.id : '', inisiatif: ini ? ini.id : '',
      createdAt: waktu, updatedAt: waktu, selesaiAt: 0,
      subtasks: [], comments: [], tinjauan: [], evidence: [],
    };
    data.tasks.unshift(t);
    catatLog(data, 'create', `${t.id} · ${t.title}`, `Dibuat untuk ${orang(t.pic).pendek}${s ? ' · ' + s.kode : ''}${pInduk ? ' · task turunan ' + pInduk.id : ''}`, me, waktu);
    // Membagi task yang masih antre (dan tak menunggu apa pun) sekaligus memulainya.
    if (pInduk && pInduk.status === 'Antre' && !pInduk.tertahan && !depsBelum(pInduk, indeks(data)).length) {
      pInduk.status = 'Dikerjakan';
      pInduk.updatedAt = waktu;
      catatLog(data, 'update', `${pInduk.id} · ${pInduk.title}`, 'Mulai dikerjakan: dibagi ke task turunan', me, waktu);
    }
    return t;
  }

  /* Task turunan dari detail task induk: sub-stage, proyek, siklus, dan platform ikut induknya. */
  function taskAnak(data, induk, f, me, waktu, hariIni) {
    const salah = salahInduk(induk, me, { pic: f.pic, project: induk ? induk.project || '' : '', cycle: induk ? induk.cycle || 1 : 1, stage: induk ? induk.stage : '' });
    if (salah) throw new Error(salah);
    return taskBaru(data, {
      title: f.title, project: induk.project, sub: induk.sub, pic: f.pic, due: f.due, priority: f.priority || induk.priority,
      platform: induk.platform, detail: f.detail, kategori: induk.kategori, induk: induk.id, inisiatif: induk.inisiatif || '',
    }, me, waktu, hariIni);
  }

  /* Ceklis (daftar periksa di dalam task): ditambah, diubah, dan dihapus PIC task, Lead-nya,
     atau Manager. */
  function cariSubtask(t, id) {
    const s = (t.subtasks || []).find(x => x.id === id);
    if (!s) throw new Error('Butir ceklis tidak ditemukan.');
    return s;
  }
  /* Tautan butir ceklis (2.24.0, permintaan user): opsional; kalau diisi harus alamat http(s). */
  const TAUTAN_SUB_MAKS = 2000;
  function tautanSub(u) {
    if (!teks(u)) return '';
    const url = tautanRapi(u);
    if (!url) throw new Error('Tautan butir ceklis tidak valid. Contoh: https://docs.google.com/… (atau kosongkan).');
    if (url.length > TAUTAN_SUB_MAKS) throw new Error(`Tautan butir ceklis paling panjang ${TAUTAN_SUB_MAKS} karakter.`);
    return url;
  }
  function tambahSubtask(data, t, f, me, waktu) {
    if (!bolehUbah(t, me)) throw new Error('Hanya PIC, Lead-nya, atau Manager yang mengatur ceklis.');
    const judul = teks(f.title).slice(0, 200);
    if (!judul) throw new Error('Judul butir ceklis wajib diisi.');
    // Sejak 2.29.0 butir ceklis tak punya PIC sendiri: selalu PIC task itu.
    const s = { id: `s${waktu}-${t.subtasks.length}`, title: judul, pic: t.pic, due: '', done: false, link: tautanSub(f.link) };
    t.subtasks.push(s);
    t.updatedAt = waktu;
    catatLog(data, 'update', `${t.id} · ${t.title}`, 'Ceklis ditambah: ' + judul, me, waktu);
    return s;
  }
  function ubahSubtask(data, t, id, f, me, waktu) {
    if (!bolehUbah(t, me)) throw new Error('Hanya PIC, Lead-nya, atau Manager yang mengatur ceklis.');
    const s = cariSubtask(t, id);
    const judul = f.title === undefined ? s.title : teks(f.title).slice(0, 200);
    if (!judul) throw new Error('Judul butir ceklis wajib diisi.');
    const lama = s.title;
    const linkLama = s.link || '';
    const link = f.link === undefined ? linkLama : tautanSub(f.link);
    s.title = judul;
    if (link !== linkLama) s.link = link;
    t.updatedAt = waktu;
    const ket = link === linkLama ? '' : `; tautan ${!link ? 'dihapus' : linkLama ? 'diganti' : 'ditambah'}`;
    catatLog(data, 'update', `${t.id} · ${t.title}`, 'Ceklis diubah: ' + (lama === judul ? judul : `${lama} → ${judul}`) + ket, me, waktu);
    return s;
  }
  function hapusSubtask(data, t, id, me, waktu) {
    if (!bolehUbah(t, me)) throw new Error('Hanya PIC, Lead-nya, atau Manager yang mengatur ceklis.');
    const s = cariSubtask(t, id);
    t.subtasks.splice(t.subtasks.indexOf(s), 1);
    t.updatedAt = waktu;
    catatLog(data, 'update', `${t.id} · ${t.title}`, 'Ceklis dihapus: ' + s.title, me, waktu);
    return s;
  }
  /* Sejak 2.29.0 butir ceklis milik PIC task: yang mencentang PIC task, Lead-nya, atau Manager. */
  function centangSubtask(data, t, id, done, me, waktu) {
    const s = cariSubtask(t, id);
    if (!bolehUbah(t, me)) throw new Error('Hanya PIC task, Lead-nya, atau Manager yang mencentang ceklisnya.');
    s.done = !!done;
    t.updatedAt = waktu;
    catatLog(data, 'update', `${t.id} · ${t.title}`, `Ceklis ${s.done ? 'selesai' : 'dibuka lagi'}: ${s.title}`, me, waktu);
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
     dipertahankan. Mengganti PIC = mendelegasikan ke anggota tim sendiri atau tim pemilik
     sub-stage-nya. Induk dan turunan tetap di tim pembaginya. Staff tak bisa mengganti PIC. */
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
    // Pilihan yang ditampilkan browser juga diperiksa di server.
    const anak = data.tasks.filter(x => x.induk === t.id);
    const induk = t.induk ? data.tasks.find(x => x.id === t.induk) || null : null;
    if (pic !== t.pic && !pilihanPicUbah(t, me, indeks(data), kode).includes(pic)) {
      if (induk) throw new Error(`PIC task turunan: ${orang(picTurunan(induk)[0]).pendek} sendiri atau staff timnya.`);
      if (anak.length) throw new Error('Task ini sudah dibagi ke task turunan: pilih Lead atau staff aktif di tim yang sama.');
      throw new Error('PIC itu di luar tim Anda atau tim pemilik sub-stage ini.');
    }
    if (anak.length && (pic !== t.pic || kode !== t.sub)
      && picTurunan({ ...t, pic, sub: kode })[0] !== picTurunan(t)[0]) {
      throw new Error('Task ini sudah dibagi ke task turunan: tim pembaginya tetap sama.');
    }
    if (t.lane === 'proyek' && s && s.tahap !== t.stage && (anak.length || induk)) {
      throw new Error(`Task ${induk ? 'turunan' : 'induk'} tetap di tahap ${namaTahap(t.stage)}, sama dengan ${induk ? 'induknya' : 'task turunannya'}.`);
    }
    const ubah = [];
    const lama = { sub: t.sub, stage: t.stage, kategori: t.kategori, pic: t.pic };
    if (kode !== t.sub) {
      ubah.push(`sub-stage ${t.sub || '—'} → ${kode || '—'}`);
      t.sub = kode;
      if (t.lane === 'proyek') t.stage = s.tahap;
      else if (s) t.kategori = s.nama;
    }
    if (pic !== t.pic) { ubah.push('diserahkan ke ' + orang(pic).pendek); t.pic = pic; }
    // Pindah fase atau tim bisa membuat urutan yang diatur saling mengunci (2.19.0).
    const putar = t.lane === 'proyek' && (t.sub !== lama.sub || t.pic !== lama.pic) ? putaranTunggu(t, indeks(data)) : null;
    if (putar) {
      Object.assign(t, lama);
      throw new Error(`Perubahan ini membuat task saling menunggu: ${putar.join(' → ')}. Atur ulang urutan tunggunya dulu.`);
    }
    // Butir ceklis milik PIC task (2.29.0): ikut pindah bersama task-nya.
    if (t.pic !== lama.pic) for (const s of t.subtasks || []) s.pic = t.pic;
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
    wajibIzin(me, 'proyek.buat');
    if (!String(f.name || '').trim()) throw new Error('Nama proyek wajib diisi.');
    const p = {
      id: 'PRJ-' + nomorBerikut(data.projects, 'PRJ', data), name: String(f.name).trim(), platform: f.platform || 'All Platform',
      stage: 'A', cycle: 1, decision: 'Build', goal: String(f.goal || '').trim(), lead: '', arsip: false, paket: '', history: [],
    };
    data.projects.unshift(p);
    catatLog(data, 'create', `${p.id} · ${p.name}`, 'Proyek dibuat', me, waktu);
    return p;
  }

  /* Ubah proyek (2.28.0, permintaan user): nama, platform, dan tujuan proyek yang sudah dibuat.
     Hanya Manager, yang juga membuat proyek. ID, siklus, tahap, dan task-nya tetap. */
  function ubahProyek(data, p, f, me, waktu) {
    wajibIzin(me, 'proyek.ubah');
    if (!p || data.projects.indexOf(p) < 0) throw new Error('Proyek tidak ditemukan.');
    const nama = teks(f.name === undefined ? p.name : f.name).replace(/\s+/g, ' ');
    if (!nama) throw new Error('Nama proyek wajib diisi.');
    if (nama.length > 200) throw new Error('Nama proyek paling panjang 200 karakter.');
    const platform = f.platform === undefined ? p.platform : teks(f.platform) || 'All Platform';
    const goal = f.goal === undefined ? p.goal : String(f.goal || '').trim().slice(0, 2000);
    const ubah = [nama !== p.name ? `nama dari "${p.name}"` : '', platform !== p.platform ? `platform ${p.platform} → ${platform}` : '', goal !== (p.goal || '') ? 'tujuan' : ''].filter(Boolean);
    if (!ubah.length) return p;
    Object.assign(p, { name: nama, platform, goal });
    catatLog(data, 'update', `${p.id} · ${nama}`, 'Proyek diubah: ' + ubah.join(', '), me, waktu);
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
  /* Singkatan fase di chip tim (2.33.0): "Dev", bukan "V" yang mudah tertukar dengan D = Design. */
  const SINGKAT_TAHAP = { A: 'Ana', D: 'Des', V: 'Dev', I: 'Imp', E: 'Eva', R: 'Rutin' };
  const singkatTahap = id => SINGKAT_TAHAP[id] || id || '';
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

  /* Siklus ditutup oleh task E12 · Final approval yang sudah disetujui (bukan task turunannya). */
  const penutupSiklus = t => t.sub === 'E12' && !t.induk && selesai(t);
  const siklusTutup = (data, p) => tugasSiklus(data, p).some(penutupSiklus);

  /* Angka terlambat dan tertahan di kepala halaman proyek menurut yang melihat (2.36.0,
     permintaan user): Manager melihat semua tim; Lead dan staff hanya timnya (Lead dan staff-nya,
     menurut PIC). Kalau timnya tak punya yang terlambat, labelnya tak muncul. Profil di luar
     organogram dan mode Dev melihat semua. */
  function sorotProyek(data, p, hariIni, me) {
    const tim = orang(me).peran === 'manager' ? null : timOrang(me);
    const ids = tim ? anggotaTimLead(tim.lead) : null;
    const buka = data.tasks.filter(t => t.project === p.id && (t.cycle || 1) === (p.cycle || 1) && aktif(t) && (!ids || ids.includes(t.pic)));
    return {
      telat: buka.filter(t => telat(t, hariIni) && !t.tertahan).length, tertahan: buka.filter(ditandaiTertahan).length,
      lingkup: ids ? 'tim' : 'semua', tim: tim ? tim.kode : '',
    };
  }

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
      totalSiklus: siklus.length, selesaiSiklus: siklus.length - buka.length,
    };
  }

  /* Antrean keputusan Manager: proyek yang siklusnya sudah ditutup E12. */
  const antreKeputusan = (data, hariIni) => {
    const perId = indeks(data);
    return data.projects.filter(p => ringkasProyek(data, p, hariIni, perId).siapMaju);
  };

  /* Sesudah E12 disetujui, Manager memulai siklus berikutnya: kembali ke Analysis. */
  function mulaiSiklus(data, p, me, waktu) {
    wajibIzin(me, 'proyek.siklus');
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
    wajibIzin(me, 'proyek.keputusan');
    if (!KEPUTUSAN.includes(keputusan)) throw new Error('Keputusan tidak dikenal.');
    p.decision = keputusan;
    catatLog(data, 'gate', `${p.id} · ${p.name}`, keputusan === 'Hold' ? 'Proyek ditahan' : `Keputusan proyek: ${keputusan}`, me, waktu);
  }

  /* Proyek yang seluruh pekerjaannya sudah selesai (termasuk kolaborasi v1 yang
     tuntas) diarsipkan: tak muncul di daftar aktif maupun antrean keputusan. */
  function setArsip(data, p, arsip, me, waktu) {
    wajibIzin(me, 'proyek.arsip');
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
       belum dimulai dan belum dibagi ke staff lewat task turunan. */
    const antrean = orang(me).peran === 'lead' && timDari(me).length
      ? milik.filter(t => t.lane === 'proyek' && t.status === 'Antre' && !tunggu.includes(t) && leadSub(t.sub) === me
        && !anakTask(perId, t.id).length) : [];
    const jalan = milik.filter(t => !tunggu.includes(t) && !antrean.includes(t));
    const batasMinggu = tambahHari(hariIni, 7);

    const grup = [
      ['tinjau', 'Perlu Anda tinjau', data.tasks.filter(t => t.status === 'Ditinjau' && peninjau(t) === me).map(t => mau(t, 'Dari ' + orang(t.pic).pendek))],
      ['antrean', 'Antrean tim · siap dibagi', antrean.map(t => mau(t, `${namaSub(t.sub)} siap. Kerjakan sendiri, atau bagi ke staff lewat task turunan di detail task.`))],
      ['telat', 'Terlambat', jalan.filter(t => t.due && t.due < hariIni).map(t => mau(t))],
      ['hari', 'Hari ini', jalan.filter(t => t.due === hariIni).map(t => mau(t))],
      ['minggu', '7 hari ke depan', jalan.filter(t => t.due > hariIni && t.due <= batasMinggu).map(t => mau(t))],
      ['nanti', 'Nanti', jalan.filter(t => !t.due || t.due > batasMinggu).map(t => mau(t))],
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
  /* Halaman Task yang disaring ke satu proyek (2.35.1): lingkup 'proyek' = semua tim di proyek
     itu. Halaman proyek sudah menampilkan task semua tim kepada siapa pun, jadi angka di sana
     (mis. "2 terlambat") harus bisa ditelusuri. Tanpa saringan proyek ia jatuh ke lingkup biasa. */
  /* Sejak 2.36.0 staff juga punya "Tim saya" selagi disaring ke satu proyek: timnya (Lead dan
     staff-nya), sama dengan angka terlambat/tertahan yang ia lihat di kepala proyek (sorotProyek). */
  function lingkupTask(me, lingkup, proyek) {
    if (proyek && lingkup === 'proyek') return null;
    if (proyek && lingkup === 'tim' && orang(me).peran === 'staff') { const tim = timOrang(me); return tim ? anggotaTimLead(tim.lead) : [me]; }
    return lingkupOrang(me, lingkup);
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
     keadaan HARI INI. Tepat waktu = dikumpulkan (diajukan, sejak 2.30.0) pada atau sebelum
     tenggatnya, walau disetujuinya sesudah tenggat. */
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
        tepat: beres.filter(t => !t.due || isoHari(waktuKumpul(t)) <= t.due).length,
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

  /* ---------- Tampilan pribadi & status (2.21.0) ----------
     Keputusan user 2026-10-13: tiap profil mengatur tampilannya sendiri — warna aksen, latar
     (wallpaper), kepadatan, ukuran huruf, halaman awal, sampul profil — dan memasang status
     singkat ber-emoji yang terlihat semua orang. Disimpan PER PROFIL di tab `tampilan` (satu
     baris per orang, seperti foto), jadi ikut ke perangkat mana pun. Sampul = gambar di kolom
     sendiri; setelan hanya mencatat kapan sampul terakhir diganti (sampulAt, diisi server). */
  const AKSEN_BAWAAN = '#0068B4';
  const AKSEN = [['Biru', '#0068B4'], ['Teal', '#0E7C86'], ['Hijau', '#2E7D32'], ['Ungu', '#6E3FC1'],
    ['Magenta', '#B4237A'], ['Oranye', '#C2560A'], ['Indigo', '#3949AB'], ['Grafit', '#4A5563']];
  const LATAR = [['', 'Polos'], ['aksen', 'Gradasi aksen'], ['senja', 'Senja'], ['laut', 'Laut'], ['hutan', 'Hutan'],
    ['titik', 'Titik'], ['garis', 'Garis'], ['sampul', 'Sampul saya']];
  const KUAT_LATAR = [10, 60, 40];   // paling samar, paling jelas, bawaan (%)
  const PADAT = [['', 'Nyaman'], ['ringkas', 'Ringkas']];
  const HURUF = [['kecil', 'Kecil'], ['', 'Sedang'], ['besar', 'Besar']];
  const HALAMAN_AWAL = ['hari', 'dashboard', 'laporan', 'paket', 'proyek', 'task', 'komunikasi', 'agenda', 'link', 'catatan', 'riwayat', 'panduan'];
  /* Bahasa tampilan per profil (2.28.0): '' = Indonesia (bawaan), 'en' = English. */
  const BAHASA_TAMPILAN = [['', 'Indonesia'], ['en', 'English']];
  /* Status: emoji dari daftar ini (bukan teks bebas, supaya aman dipasang di CSS) + teks pendek. */
  const STATUS_SIAP = [['🎯', 'Fokus'], ['📅', 'Rapat'], ['🏠', 'WFH'], ['🏖️', 'Cuti'], ['🤒', 'Sakit'], ['🚗', 'Di jalan'],
    ['☕', 'Istirahat'], ['🕌', 'Ibadah']];
  const EMOJI_STATUS = [...STATUS_SIAP.map(([e]) => e), '💬', '🎧', '✈️', '📚', '🔥', '✅', '🙏', '🎉'];
  const STATUS_TEKS_MAKS = 60;
  const STATUS_BATAS = 31 * 864e5;
  const SAMPUL_MAKS = 45000;
  const sampulSah = g => typeof g === 'string' && g.length <= SAMPUL_MAKS && POLA_FOTO.test(g);
  const tampilanBawaan = () => ({ aksen: '', latar: '', kuatLatar: KUAT_LATAR[2], padat: '', huruf: '', awal: '', bahasa: '', status: null, sampulAt: 0 });

  /* ketat = isian dari browser (galat bila tak sah); longgar = baris tab (yang tak sah jadi
     bawaan, supaya satu sel rusak tak menghentikan aplikasi). Status yang sudah lewat waktunya
     dibuang saat disimpan; saat dibaca, statusAktif() yang menyaringnya. */
  function periksaTampilan(x, { ketat = false, sekarang = Date.now() } = {}) {
    const v = x && typeof x === 'object' ? x : {};
    const b = tampilanBawaan();
    const salah = pesan => { if (ketat) throw new Error(pesan); };
    const pilih = (nilai, daftar, pesan) => {
      const s = String(nilai == null ? '' : nilai);
      if (daftar.some(([k]) => k === s)) return s;
      salah(pesan);
      return '';
    };
    let aksen = String(v.aksen || '').trim().toUpperCase();
    if (aksen && !/^#[0-9A-F]{6}$/.test(aksen)) { salah('Warna aksen tidak sah.'); aksen = ''; }
    if (aksen === AKSEN_BAWAAN) aksen = '';
    let kuat = Math.round(Number(v.kuatLatar));
    if (!Number.isFinite(kuat)) kuat = b.kuatLatar;
    kuat = Math.min(KUAT_LATAR[1], Math.max(KUAT_LATAR[0], kuat));
    let awal = String(v.awal || '');
    if (awal && !HALAMAN_AWAL.includes(awal)) { salah('Halaman awal tidak dikenal.'); awal = ''; }
    let status = null;
    if (v.status && typeof v.status === 'object') {
      const teks = String(v.status.teks || '').replace(/\s+/g, ' ').trim();
      let emoji = String(v.status.emoji || '');
      const sampai = Math.max(0, Number(v.status.sampai) || 0);
      if (teks.length > STATUS_TEKS_MAKS) salah(`Teks status paling panjang ${STATUS_TEKS_MAKS} karakter.`);
      if (emoji && !EMOJI_STATUS.includes(emoji)) { salah('Emoji status tidak dikenal.'); emoji = ''; }
      if (sampai && sampai - sekarang > STATUS_BATAS) salah('Status paling lama 31 hari.');
      if ((emoji || teks) && !(ketat && sampai && sampai <= sekarang)) {
        status = { emoji: emoji || '💬', teks: teks.slice(0, STATUS_TEKS_MAKS), sampai: sampai ? Math.min(sampai, sekarang + STATUS_BATAS) : 0 };
      }
    }
    return {
      aksen, latar: pilih(v.latar, LATAR, 'Latar tidak dikenal.'), kuatLatar: kuat,
      padat: pilih(v.padat, PADAT, 'Kepadatan tidak dikenal.'), huruf: pilih(v.huruf, HURUF, 'Ukuran huruf tidak dikenal.'),
      awal, bahasa: pilih(v.bahasa, BAHASA_TAMPILAN, 'Bahasa tidak dikenal.'), status, sampulAt: Math.max(0, Number(v.sampulAt) || 0),
    };
  }
  const statusAktif = (setelan, sekarang = Date.now()) => {
    const s = setelan && setelan.status;
    return s && s.emoji && (!s.sampai || s.sampai > sekarang) ? s : null;
  };

  /* Warna aksen → token CSS untuk tema terang dan gelap, atau null untuk biru bawaan (lembar
     gaya yang berlaku). Kecerahannya digeser sampai teksnya terbaca (WCAG): aksen sebagai teks
     ≥ 4,6:1 di latar terang dan ≥ 6:1 di latar gelap; isi pekat bertulisan putih ≥ 4,6:1.
     Yang bermakna (status, capaian, sebutan) tetap memakai token --info-*, tak ikut aksen. */
  const hexKeRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  function rgbKeHsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const maks = Math.max(r, g, b), min = Math.min(r, g, b), l = (maks + min) / 2;
    if (maks === min) return [0, 0, l];
    const d = maks - min;
    const s = l > 0.5 ? d / (2 - maks - min) : d / (maks + min);
    const h = maks === r ? (g - b) / d + (g < b ? 6 : 0) : maks === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function hslKeHex(h, s, l) {
    l = Math.min(1, Math.max(0, l));
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  const luminansi = hex => {
    const [r, g, b] = hexKeRgb(hex).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const kontras = (a, b) => { const x = luminansi(a), y = luminansi(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  function tokenAksen(hex) {
    const asal = String(hex || '').toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(asal) || asal === AKSEN_BAWAAN) return null;
    const [h, s0, l0] = rgbKeHsl(hexKeRgb(asal));
    const s = s0;
    const w = l => hslKeHex(h, s, l);
    // Geser kecerahan selangkah demi selangkah sampai syaratnya terpenuhi.
    const geser = (l, arah, syarat) => {
      let x = l;
      for (let i = 0; i < 120 && !syarat(w(x)) && x >= 0 && x <= 1; i++) x += arah * 0.01;
      return Math.min(1, Math.max(0, x));
    };
    const lIsi = geser(Math.min(l0, 0.6), -1, c => kontras(c, '#FFFFFF') >= 4.6);
    const lTeks = geser(lIsi, -1, c => kontras(c, '#F6F7F9') >= 4.6);
    const lGelap = geser(Math.max(l0, 0.5), 1, c => kontras(c, '#171C23') >= 6.5);
    const sp = Math.min(s, 0.85);
    return {
      terang: {
        '--biru': w(lTeks), '--biru-tua': w(Math.max(0.1, lTeks - 0.1)), '--isi-biru': w(lIsi), '--isi-biru-tua': w(Math.max(0.08, lIsi - 0.08)),
        '--biru-muda': hslKeHex(h, sp, 0.955), '--biru-muda-2': hslKeHex(h, sp, 0.91), '--biru-garis': hslKeHex(h, sp, 0.8), '--langit': hslKeHex(h, sp, 0.62),
      },
      gelap: {
        '--biru': w(lGelap), '--biru-tua': w(Math.min(0.9, lGelap + 0.12)), '--isi-biru': w(lIsi), '--isi-biru-tua': w(Math.min(0.6, lIsi + 0.06)),
        '--biru-muda': hslKeHex(h, s * 0.55, 0.15), '--biru-muda-2': hslKeHex(h, s * 0.55, 0.21), '--biru-garis': hslKeHex(h, s * 0.6, 0.32), '--langit': hslKeHex(h, sp, 0.6),
      },
    };
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
     ai: true.
     Sejak 2.37.0 agen juga boleh membuat task (taskBaru) untuk mencatat pekerjaan harian dari
     rekap. Aturannya sama dengan form Tambah task atas nama profil agen (taskBaru memeriksa
     proyek, sub-stage, dan PIC); yang tampil sebagai AI adalah aktivitas "Dibuat untuk …". */
  const KODE_AI = 'ai';
  const AKSI_AGEN = ['terapkanAksi', 'isiOutput', 'tambahBukti', 'tambahSubtask', 'ubahSubtask', 'centangSubtask', 'taskBaru'];
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

  /* @sebutan: nama pendek (@Kiki) atau peran (@manager, @lead, @staff, @semua atau @all). */
  // @all sama dengan @semua: semua orang yang boleh membuka ruangnya (2.38.0, permintaan user).
  const PERAN_SEBUT = { manager: 'manager', lead: 'lead', leader: 'lead', staff: 'staff', semua: '*', all: '*' };
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
      const judul = jenis === 'task' ? (t ? t.title : cadangan) : jenis === 'proyek' ? (p ? p.name : cadangan) : 'Tim ' + labelTim(id);
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
  /* Kapan tiap task terakhir ditandai tertahan, dibaca dari Riwayat Aktivitas (terbaru dulu). */
  function waktuTertahan(data) {
    const peta = new Map();
    for (const l of data.log || []) {
      if (!String(l.detail || '').startsWith(DESKRIPSI.tahan)) continue;
      const id = String(l.task || '').split(' · ')[0];
      if (id && !peta.has(id)) peta.set(id, l.at || 0);
    }
    return peta;
  }
  function notifikasi(data, me, batas = 60, susunan = null) {
    const perId = indeks(data);
    const pendek = orang(me).pendek.toLowerCase();
    const out = [];
    let tahan = null;
    const sejakTertahan = x => (x.tertahan ? (tahan || (tahan = waktuTertahan(data))).get(x.id) || 0 : 0);
    const tambah = (jenis, t, at, oleh, isi = '', ai = false) => { if (at) out.push({ id: `${jenis}-${t.id}-${at}`, jenis, task: t.id, at, oleh, teks: isi, ...(ai ? { ai: true } : {}) }); };
    for (const t of data.tasks) {
      if (t.pic === me && t.status === 'Antre' && tungguTahap(t)) {
        // Yang ditunggunya baru tuntas (atau, sejak 2.30.0, diajukan; sejak 2.34.2, ditandai
        // tertahan): task ini siap dimulai (kecuali sudah siap sejak dibuat).
        const sebelum = ditunggu(t, perId);
        const at = Math.max(0, ...sebelum.map(x => x.t.selesaiAt || waktuDiajukan(x.t) || sejakTertahan(x.t)));
        if (sebelum.length && !sebelum.some(masihMenahan) && at > (t.createdAt || 0)) tambah('siap', t, at, '');
      } else if (t.pic === me && t.status === 'Antre' && (t.deps || []).length) {
        const dep = t.deps.map(id => perId.get(id)).filter(Boolean);
        if (dep.length && dep.every(selesai)) tambah('siap', t, Math.max(...dep.map(d => d.selesaiAt || 0)), '');
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
    // Permintaan lanjutan (2.36.0): untuk saya (dan, bagi Lead, untuk staff saya), jawabannya
    // untuk peminta, dan pengalihannya untuk penerima lama dan peminta.
    for (const m of data.permintaan || []) {
      const dasar = { teks: m.judul, minta: m.judul, permintaan: m.id };
      if (m.ke === me && m.dari !== me) {
        const at = m.dialihkanAt || m.createdAt;
        out.push({ id: `minta-${m.id}-${at}`, jenis: 'minta', task: m.sumber, at, oleh: m.dari, ...dasar, ...(m.dialihkan ? { alih: leadDari(m.ke) } : {}) });
      }
      if (!m.dialihkan && m.ke !== me && m.dari !== me && leadDari(m.ke) === me) {
        out.push({ id: `mintaTim-${m.id}`, jenis: 'mintaTim', task: m.sumber, at: m.createdAt, oleh: m.dari, ke: m.ke, ...dasar });
      }
      if (m.dari === me && (m.status === 'diterima' || m.status === 'ditolak') && m.oleh !== me && m.jawabAt) {
        const terima = m.status === 'diterima';
        out.push({ id: `${m.status}-${m.id}`, jenis: terima ? 'mintaTerima' : 'mintaTolak', task: terima ? m.task : m.sumber, at: m.jawabAt, oleh: m.oleh, ...dasar, teks: terima ? '' : m.alasan });
      }
      if (m.dialihkan && m.dialihkanAt && (m.dialihkan === me || m.dari === me) && leadDari(m.ke) !== me) {
        out.push({ id: `mintaAlih-${m.id}-${m.dialihkanAt}`, jenis: 'mintaAlih', task: m.sumber, at: m.dialihkanAt, oleh: leadDari(m.ke), ke: m.ke, ...dasar });
      }
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
      if (!k.selesai) b.tertunda = true;
    }
    return [...per.values()].map(b => {
      // Capaian bersama (2.26.0): satu capaian boleh dipasang di beberapa langkah alur (mis. QC
      // E4–E7), dan baru tercapai setelah semua langkah bertanda itu selesai. Batch dinilai dari
      // capaian tertinggi yang semua langkahnya sudah selesai.
      const beres = new Map();
      for (const k of b.setoran) {
        const tahap = tahapSetoran(k.tahap);
        beres.set(tahap, beres.get(tahap) !== false && !!k.selesai);
      }
      for (const [tahap, ok] of beres) if (ok && (!b.capai || BOBOT[tahap] > BOBOT[b.capai])) b.capai = tahap;
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
    wajibIzin(me, 'paket.buat');
    if (!String(f.namaPaket || '').trim()) throw new Error('Nama paket wajib diisi.');
    const p = {
      id: 'PKG-' + String(nomorBerikut(data.packages, 'PKG', data)).padStart(3, '0'),
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

  /* ---------- Kalender Saya (2.28.0, permintaan user) ----------
     Agenda pribadi tiap profil: aktivitas harian dengan jam (atau sepanjang hari), bisa berulang,
     dengan pengingat di aplikasi. Disimpan di server per profil (tab agenda), hanya dikirim ke
     profil pemiliknya. Email pribadi opsional disimpan untuk pengingat email nanti (tahap 2). */
  const ULANG_AGENDA = ['', 'harian', 'kerja', 'mingguan', 'bulanan'];
  const PENGINGAT_AGENDA = ['', '0', '5', '10', '15', '30', '60', '1440'];
  const POLA_JAM = /^([01]\d|2[0-3]):[0-5]\d$/;
  const POLA_TGL = /^\d{4}-\d{2}-\d{2}$/;
  const tglSah = s => POLA_TGL.test(s) && isoHari(keTanggal(s)) === s;
  const AGENDA_JUDUL_MAKS = 200;
  const AGENDA_CATATAN_MAKS = 2000;
  /* Acara bersama (2.33.0, permintaan user): agenda yang punya peserta, dari tim mana pun, atau
     yang Terbuka. Pembuatnya (pemilik = kolom orang di tab agenda) mengatur isi, waktu, dan
     pesertanya; peserta menjawab Hadir/Mungkin/Tidak dan memilih pengingatnya sendiri; pembuat
     dan peserta menulis notulen beserta tindak lanjutnya, yang bisa dijadikan task. Bawaannya
     hanya terlihat oleh pembuat dan peserta; yang Terbuka terlihat semua orang (Kalender di
     halaman Task) dan siapa pun boleh ikut. Tetap satu baris di tab agenda; server hanya
     mengirim baris yang boleh dilihat profil itu. */
  const JAWABAN_ACARA = ['ya', 'mungkin', 'tidak'];
  const KAIT_ACARA = ['proyek', 'task', 'paket', 'inisiatif'];
  const POLA_KAIT = /^[A-Z]{2,5}-\d{1,7}$/;
  const POLA_TINDAK = /^tl[a-z0-9]{3,24}$/;
  const PESERTA_MAKS = 40;
  const KAIT_MAKS = 6;
  const TINDAK_MAKS = 30;
  const NOTULEN_MAKS = 5000;
  const LOKASI_MAKS = 200;
  const waktuSah = x => { const n = Number(x); return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined; };
  /* { orang: nilai }: hanya kunci ID orang yang sah dan nilai yang lolos sah(). */
  function petaOrang(v, sah) {
    const hasil = {};
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const [k, x] of Object.entries(v)) {
        if (!POLA_ID_ORANG.test(k)) continue;
        const y = sah(x);
        if (y !== undefined) hasil[k] = y;
      }
    }
    return hasil;
  }
  /* Tindak lanjut di notulen: teks, PIC, tenggat, dan task yang dibuat darinya. Butir kosong dibuang. */
  function periksaTindak(daftar) {
    const hasil = [];
    for (const x of Array.isArray(daftar) ? daftar : []) {
      const v = x && typeof x === 'object' ? x : {};
      const isi = String(v.teks == null ? '' : v.teks).replace(/\s+/g, ' ').trim();
      if (!isi) continue;
      if (isi.length > 300) throw new Error('Butir tindak lanjut paling panjang 300 karakter.');
      const id = String(v.id || '').trim();
      if (!POLA_TINDAK.test(id) || hasil.some(y => y.id === id)) throw new Error('ID butir tindak lanjut tidak sah.');
      const pic = String(v.pic || '').trim(), due = String(v.due || '').trim(), task = String(v.task || '').trim();
      hasil.push({ id, teks: isi, pic: POLA_ID_ORANG.test(pic) ? pic : '', due: tglSah(due) ? due : '', task: POLA_KAIT.test(task) ? task : '' });
    }
    if (hasil.length > TINDAK_MAKS) throw new Error(`Tindak lanjut paling banyak ${TINDAK_MAKS} butir.`);
    return hasil;
  }
  function periksaAgenda(x) {
    const v = x && typeof x === 'object' ? x : {};
    const t = s => String(s == null ? '' : s).trim();
    const judul = t(v.judul).replace(/\s+/g, ' ');
    if (!judul) throw new Error('Judul agenda wajib diisi.');
    if (judul.length > AGENDA_JUDUL_MAKS) throw new Error(`Judul agenda paling panjang ${AGENDA_JUDUL_MAKS} karakter.`);
    const tanggal = t(v.tanggal);
    if (!tglSah(tanggal)) throw new Error('Tanggal agenda tidak sah.');
    const mulai = t(v.mulai), selesai = t(v.selesai);
    if (mulai && !POLA_JAM.test(mulai)) throw new Error('Jam mulai tidak sah (JJ:MM).');
    if (selesai && !POLA_JAM.test(selesai)) throw new Error('Jam selesai tidak sah (JJ:MM).');
    if (selesai && !mulai) throw new Error('Isi jam mulai dulu, atau kosongkan keduanya untuk agenda sepanjang hari.');
    if (mulai && selesai && selesai <= mulai) throw new Error('Jam selesai harus sesudah jam mulai.');
    const ulang = t(v.ulang);
    if (!ULANG_AGENDA.includes(ulang)) throw new Error('Pilihan pengulangan tidak dikenal.');
    const sampai = ulang ? t(v.sampai) : '';
    if (sampai && (!tglSah(sampai) || sampai < tanggal)) throw new Error('Tanggal akhir pengulangan harus sesudah tanggal mulai.');
    const pengingat = t(v.pengingat);
    if (!PENGINGAT_AGENDA.includes(pengingat)) throw new Error('Pilihan pengingat tidak dikenal.');
    const catatan = t(v.catatan);
    if (catatan.length > AGENDA_CATATAN_MAKS) throw new Error(`Catatan agenda paling panjang ${AGENDA_CATATAN_MAKS} karakter.`);
    // Tanggal yang sudah dicentang selesai (agenda berulang: per tanggal); yang terbaru 400 saja.
    const beres = [...new Set((Array.isArray(v.beres) ? v.beres : []).map(t).filter(tglSah))].sort().slice(-400);
    const id = t(v.id);
    if (id && !/^ag[a-z0-9-]{4,40}$/.test(id)) throw new Error('ID agenda tidak sah.');
    // Acara bersama (2.33.0): tempat, tautan rapat, peserta, terbuka, dan kaitan ke pekerjaan.
    const lokasi = t(v.lokasi).replace(/\s+/g, ' ');
    if (lokasi.length > LOKASI_MAKS) throw new Error(`Lokasi paling panjang ${LOKASI_MAKS} karakter.`);
    const tautanIsi = t(v.tautan);
    const tautan = tautanIsi ? tautanRapi(tautanIsi) : '';
    if (tautanIsi && (!tautan || tautan.length > 500)) throw new Error('Tautan rapat tidak sah. Tempel alamat lengkapnya, mis. https://meet.google.com/…');
    const peserta = [...new Set((Array.isArray(v.peserta) ? v.peserta : []).map(t).filter(x => POLA_ID_ORANG.test(x)))];
    if (peserta.length > PESERTA_MAKS) throw new Error(`Peserta paling banyak ${PESERTA_MAKS} orang.`);
    const kait = [];
    for (const k of Array.isArray(v.kait) ? v.kait : []) {
      const jenis = t(k && k.jenis), kid = t(k && k.id);
      if (KAIT_ACARA.includes(jenis) && POLA_KAIT.test(kid) && !kait.some(x => x.jenis === jenis && x.id === kid)) kait.push({ jenis, id: kid });
    }
    if (kait.length > KAIT_MAKS) throw new Error(`Tautan ke proyek, task, paket, atau inisiatif paling banyak ${KAIT_MAKS}.`);
    const notulen = String(v.notulen == null ? '' : v.notulen).replace(/\r\n?/g, '\n').trim();
    if (notulen.length > NOTULEN_MAKS) throw new Error(`Notulen paling panjang ${NOTULEN_MAKS} karakter.`);
    const notulenOleh = t(v.notulenOleh);
    return {
      id, judul, tanggal, mulai, selesai: mulai ? selesai : '', ulang, sampai, pengingat, catatan, beres,
      lokasi, tautan, peserta, terbuka: v.terbuka === true || v.terbuka === 'ya', kait, notulen, tindak: periksaTindak(v.tindak),
      // Diisi server: jawaban & pengingat pilihan tiap peserta, kapan diundang (atau ikut sendiri),
      // kapan jadwal terakhir diubah, siapa yang terakhir menulis notulen.
      jawaban: petaOrang(v.jawaban, x => (x && JAWABAN_ACARA.includes(x.nilai) ? { nilai: x.nilai, at: waktuSah(x.at) || 0 } : undefined)),
      ingat: petaOrang(v.ingat, x => (PENGINGAT_AGENDA.includes(String(x)) ? String(x) : undefined)),
      diundang: petaOrang(v.diundang, waktuSah), ikut: petaOrang(v.ikut, waktuSah),
      jadwalAt: waktuSah(v.jadwalAt) || 0, notulenAt: waktuSah(v.notulenAt) || 0, notulenOleh: POLA_ID_ORANG.test(notulenOleh) ? notulenOleh : '',
      contoh: v.contoh === true,
    };
  }
  /* Apakah agenda a terjadi pada tanggal tgl. */
  function adaPadaTanggal(a, tgl) {
    if (!a || !tglSah(tgl) || tgl < a.tanggal || (a.sampai && tgl > a.sampai)) return false;
    if (!a.ulang) return tgl === a.tanggal;
    if (a.ulang === 'harian') return true;
    const hari = keTanggal(tgl).getDay();
    if (a.ulang === 'kerja') return hari >= 1 && hari <= 5;
    if (a.ulang === 'mingguan') return hari === keTanggal(a.tanggal).getDay();
    // Bulanan: tanggal yang sama; bulan tanpa tanggal itu (mis. 31) dilewati.
    if (a.ulang === 'bulanan') return tgl.slice(8) === a.tanggal.slice(8);
    return false;
  }
  /* Kejadian agenda di antara dari..sampai (termasuk), urut menurut tanggal lalu jam. */
  function kejadianAgenda(daftar, dari, sampai) {
    const hasil = [];
    for (let d = dari, n = 0; d <= sampai && n < 400; d = tambahHari(d, 1), n++) {
      for (const a of daftar || []) if (adaPadaTanggal(a, d)) hasil.push({ a, tanggal: d, beres: (a.beres || []).includes(d) });
    }
    return hasil.sort((x, y) => x.tanggal.localeCompare(y.tanggal) || (x.a.mulai || '').localeCompare(y.a.mulai || '') || x.a.judul.localeCompare(y.a.judul));
  }
  /* Kapan pengingat kejadian ini berbunyi (milidetik, zona lokal), 0 = tanpa pengingat. Agenda
     sepanjang hari diingatkan pukul 07.00 di harinya (atau sehari sebelumnya untuk "1 hari"). */
  function waktuPengingat(a, tgl) {
    if (!a || a.pengingat === '') return 0;
    const [j, m] = (a.mulai || '07:00').split(':').map(Number);
    const d = keTanggal(tgl);
    d.setHours(j, m, 0, 0);
    const menit = Number(a.pengingat) || 0;
    return d.getTime() - (a.mulai ? menit : menit >= 1440 ? 1440 : 0) * 60000;
  }
  /* Email pribadi (opsional): '' boleh; selain itu harus berbentuk alamat email. */
  function periksaEmail(s) {
    const e = String(s == null ? '' : s).trim().toLowerCase();
    if (!e) return '';
    if (e.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) throw new Error('Alamat email tidak sah.');
    return e;
  }

  /* ----- Acara bersama (2.33.0) ----- */
  const acaraBersama = a => !!a && ((a.peserta || []).length > 0 || !!a.terbuka);
  const pemilikAgenda = a => (a && (a.pemilik || a.orang)) || '';
  /* Pembuat atau peserta (yang diundang, atau ikut sendiri ke acara Terbuka). */
  const ikutAcara = (a, me) => !!a && !!me && (pemilikAgenda(a) === me || (a.peserta || []).includes(me));
  const bolehLihatAgenda = (a, me) => ikutAcara(a, me) || (!!a && !!a.terbuka);
  /* Jawaban orang itu: pembuatnya selalu hadir; '' = belum menjawab. */
  function jawabanAcara(a, me) {
    if (pemilikAgenda(a) === me) return 'ya';
    const j = (a.jawaban || {})[me];
    return j ? j.nilai : '';
  }
  /* Rekap kehadiran; pembuatnya dihitung hadir. */
  function rekapJawaban(a) {
    const r = { ya: 1, mungkin: 0, tidak: 0, belum: 0 };
    for (const p of a.peserta || []) r[jawabanAcara(a, p) || 'belum']++;
    return r;
  }
  /* Pengingat untuk profil ini: peserta boleh memilih sendiri; bawaannya pilihan pembuat. */
  function pengingatUntuk(a, me) {
    if (pemilikAgenda(a) !== me && Object.prototype.hasOwnProperty.call(a.ingat || {}, me)) return a.ingat[me];
    return a.pengingat;
  }
  /* Tanggal kejadian pertama mulai dari tanggal itu (agenda berulang), '' = sudah lewat semua. */
  function kejadianBerikut(a, dari) {
    if (!a.ulang) return a.tanggal >= dari ? a.tanggal : '';
    for (let d = a.tanggal > dari ? a.tanggal : dari, n = 0; n < 400; d = tambahHari(d, 1), n++) {
      if (a.sampai && d > a.sampai) return '';
      if (adaPadaTanggal(a, d)) return d;
    }
    return '';
  }
  const keMenit = j => { const [h, m] = String(j).split(':').map(Number); return h * 60 + m; };
  /* Rentang menit sehari: sepanjang hari = 0–1440; tanpa jam selesai dianggap satu jam. */
  function rentangMenit(mulai, selesai) {
    if (!mulai) return [0, 1440];
    const a = keMenit(mulai);
    return [a, selesai ? keMenit(selesai) : Math.min(a + 60, 1440)];
  }
  /* Acara bersama orang itu yang bertabrakan dengan tanggal & jam ini. Yang ia tolak tak dihitung;
     agenda pribadi tak pernah dihitung (tetap rahasia pemiliknya). */
  function bentrokAcara(daftar, siapa, tanggal, mulai, selesai, kecuali = '') {
    const [a, b] = rentangMenit(mulai, selesai);
    return (daftar || []).filter(x => x.id !== kecuali && acaraBersama(x) && ikutAcara(x, siapa) && jawabanAcara(x, siapa) !== 'tidak' && adaPadaTanggal(x, tanggal))
      .filter(x => { const [c, d] = rentangMenit(x.mulai, x.selesai); return c < b && a < d; })
      .sort((x, y) => (x.mulai || '').localeCompare(y.mulai || ''));
  }
  /* Peserta yang disimpan pembuatnya: pembuatnya sendiri dibuang; yang baru ditambahkan harus
     orang aktif di organogram (yang lama tetap, meski kini nonaktif). */
  function periksaPeserta(peserta, pemilik, lama = []) {
    const hasil = (peserta || []).filter(p => p !== pemilik && p !== DEV);
    for (const p of hasil) {
      if (lama.includes(p)) continue;
      const o = ORANG_PER_ID.get(p);
      if (!o || o.aktif === false) throw new Error(`Peserta ${orang(p).pendek} tidak dikenal atau sudah nonaktif.`);
    }
    return hasil;
  }
  /* Simpanan pembuat acara. Jawaban, pengingat pilihan, dan waktu undangan peserta yang tetap
     dipertahankan; peserta baru dicatat waktu undangannya (untuk notifikasinya); perubahan
     tanggal atau jam dicatat supaya peserta diberi tahu. Notulen hanya berubah lewat ubahNotulen. */
  function gabungAcara(lama, baru, waktu) {
    const tetap = peta => Object.fromEntries(Object.entries(peta || {}).filter(([k]) => baru.peserta.includes(k)));
    const diundang = tetap(lama && lama.diundang);
    for (const p of baru.peserta) if (!diundang[p]) diundang[p] = waktu;
    const jadwalBerubah = !!lama && ['tanggal', 'mulai', 'selesai', 'ulang', 'sampai'].some(k => (lama[k] || '') !== (baru[k] || ''));
    return {
      ...baru, jawaban: tetap(lama && lama.jawaban), ingat: tetap(lama && lama.ingat), diundang, ikut: tetap(lama && lama.ikut),
      jadwalAt: jadwalBerubah && acaraBersama(baru) ? waktu : (lama && lama.jadwalAt) || 0,
      notulen: lama ? lama.notulen : '', tindak: lama ? lama.tindak : [], notulenAt: (lama && lama.notulenAt) || 0, notulenOleh: (lama && lama.notulenOleh) || '',
      contoh: !!(lama && lama.contoh),
    };
  }
  /* Jawaban dan pengingat peserta. Acara Terbuka: siapa pun boleh ikut (Hadir atau Mungkin). */
  function jawabAcara(a, me, isian, waktu) {
    if (pemilikAgenda(a) === me) throw new Error('Anda pembuat acara ini; jawaban hanya untuk peserta.');
    const x = isian && typeof isian === 'object' ? isian : {};
    const hasil = { ...a, peserta: [...(a.peserta || [])], jawaban: { ...a.jawaban }, ingat: { ...a.ingat }, diundang: { ...a.diundang }, ikut: { ...a.ikut } };
    if (!hasil.peserta.includes(me)) {
      if (!a.terbuka) throw new Error('Hanya peserta acara ini yang menjawab undangannya.');
      if (!['ya', 'mungkin'].includes(x.jawaban)) throw new Error('Pilih Hadir atau Mungkin untuk ikut acara terbuka ini.');
      if (hasil.peserta.length >= PESERTA_MAKS) throw new Error(`Peserta paling banyak ${PESERTA_MAKS} orang.`);
      hasil.peserta.push(me);
      hasil.diundang[me] = waktu;
      hasil.ikut[me] = waktu;
    }
    if (x.jawaban !== undefined) {
      if (!JAWABAN_ACARA.includes(x.jawaban)) throw new Error('Pilih Hadir, Mungkin, atau Tidak.');
      hasil.jawaban[me] = { nilai: x.jawaban, at: waktu };
    }
    if (x.pengingat !== undefined) {
      if (x.pengingat === 'bawaan') delete hasil.ingat[me];
      else if (PENGINGAT_AGENDA.includes(String(x.pengingat))) hasil.ingat[me] = String(x.pengingat);
      else throw new Error('Pilihan pengingat tidak dikenal.');
    }
    return hasil;
  }
  /* Notulen & tindak lanjut: pembuat atau peserta. versi = notulenAt yang dilihat penulisnya;
     kalau orang lain sudah menyimpan sesudahnya, ditolak supaya tulisannya tak tertimpa. Task yang
     sudah dibuat dari butir yang sama tetap tertaut. */
  function ubahNotulen(a, me, isian, waktu) {
    if (!ikutAcara(a, me)) throw new Error('Hanya pembuat dan peserta acara ini yang menulis notulennya.');
    const x = isian && typeof isian === 'object' ? isian : {};
    if ((Number(x.versi) || 0) !== (a.notulenAt || 0)) {
      throw new Error(`Notulen baru saja diubah ${orang(a.notulenOleh || pemilikAgenda(a)).pendek}. Tutup lalu buka lagi acaranya untuk melihat versi terbarunya.`);
    }
    const bersih = periksaAgenda({ ...a, notulen: x.notulen, tindak: x.tindak });
    const lama = new Map((a.tindak || []).map(b => [b.id, b]));
    const tindak = bersih.tindak.map(b => ({ ...b, task: b.task || (lama.get(b.id) || {}).task || '' }));
    return { ...a, notulen: bersih.notulen, tindak, notulenAt: waktu, notulenOleh: me };
  }
  /* Task yang dibuat dari satu butir tindak lanjut ("Jadikan task"). */
  function tandaiTindak(a, me, idTindak, idTask) {
    if (!ikutAcara(a, me)) throw new Error('Hanya pembuat dan peserta acara ini yang menulis notulennya.');
    if (!POLA_KAIT.test(String(idTask || ''))) throw new Error('ID task tidak sah.');
    if (!(a.tindak || []).some(b => b.id === idTindak)) throw new Error('Butir tindak lanjut tidak ditemukan. Mungkin baru saja dihapus dari notulen.');
    return { ...a, tindak: a.tindak.map(b => (b.id === idTindak ? { ...b, task: String(idTask) } : b)) };
  }
  /* Notifikasi acara untuk profil ini, dihitung dari acaranya sendiri: diundang, jadwal diubah,
     jawaban peserta (untuk pembuatnya), notulen ditulis orang lain, dan acara dibatalkan.
     tanggal = kejadian berikutnya mulai hari itu (agenda berulang), supaya lonceng membuka
     tanggal yang relevan. */
  function notifAcara(daftar, batal, me, hari, sejak = 0) {
    const hasil = [];
    const dasar = a => ({ agenda: a.id, tanggal: kejadianBerikut(a, hari) || a.tanggal, judul: a.judul, mulai: a.mulai || '' });
    for (const a of daftar || []) {
      if (!acaraBersama(a) || !ikutAcara(a, me)) continue;
      const pemilik = pemilikAgenda(a);
      if (pemilik !== me) {
        const undang = (a.diundang || {})[me] || 0;
        if (undang && !(a.ikut || {})[me]) hasil.push({ jenis: 'undang', at: undang, oleh: pemilik, ...dasar(a) });
        if (a.jadwalAt && a.jadwalAt > undang) hasil.push({ jenis: 'jadwal', at: a.jadwalAt, oleh: pemilik, ...dasar(a) });
      } else {
        for (const [p, j] of Object.entries(a.jawaban || {})) {
          if (j.at && (a.peserta || []).includes(p)) hasil.push({ jenis: (a.ikut || {})[p] ? 'ikut' : 'jawab', at: j.at, oleh: p, nilai: j.nilai, ...dasar(a) });
        }
      }
      if (a.notulenAt && a.notulenOleh && a.notulenOleh !== me) hasil.push({ jenis: 'notulen', at: a.notulenAt, oleh: a.notulenOleh, ...dasar(a) });
    }
    for (const b of batal || []) {
      if ((b.peserta || []).includes(me) && b.pemilik !== me) hasil.push({ jenis: 'batal', at: b.at, oleh: b.pemilik, agenda: '', tanggal: b.tanggal, judul: b.judul, mulai: b.mulai || '' });
    }
    return hasil.filter(n => n.at > sejak).sort((x, y) => y.at - x.at);
  }

  /* Ke kalender lain (Google Calendar, kalender ponsel lewat .ics): jam dalam UTC dari zona
     browser, sepanjang hari sebagai tanggal (akhir eksklusif), pengulangan sebagai RRULE. */
  const fmtUtc = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const tglPolos = iso => String(iso).replace(/-/g, '');
  function waktuLokal(tgl, jam) {
    const d = keTanggal(tgl);
    const [h, m] = jam.split(':').map(Number);
    d.setHours(h, m, 0, 0);
    return d;
  }
  function rentangKalender(a) {
    if (!a.mulai) return { hari: true, awal: tglPolos(a.tanggal), akhir: tglPolos(tambahHari(a.tanggal, 1)) };
    const awal = waktuLokal(a.tanggal, a.mulai);
    const akhir = a.selesai ? waktuLokal(a.tanggal, a.selesai) : new Date(awal.getTime() + 3600e3);
    return { hari: false, awal: fmtUtc(awal), akhir: fmtUtc(akhir) };
  }
  function aturanUlang(a) {
    const frek = { harian: 'FREQ=DAILY', kerja: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', mingguan: 'FREQ=WEEKLY', bulanan: 'FREQ=MONTHLY' }[a.ulang];
    if (!frek) return '';
    if (!a.sampai) return frek;
    return `${frek};UNTIL=${a.mulai ? fmtUtc(waktuLokal(a.sampai, '23:59')) : tglPolos(a.sampai)}`;
  }
  const LABEL_KALENDER = { tautan: 'Tautan rapat', dibuat: 'Dibuat oleh', peserta: 'Peserta', dari: 'Dari ProductTrack' };
  function teksKalender(a, label = LABEL_KALENDER) {
    const L = { ...LABEL_KALENDER, ...label };
    const bagian = [];
    if (a.catatan) bagian.push(a.catatan);
    if (a.tautan) bagian.push(`${L.tautan}: ${a.tautan}`);
    if (acaraBersama(a)) {
      bagian.push(`${L.dibuat}: ${orang(pemilikAgenda(a)).nama}` + ((a.peserta || []).length ? `\n${L.peserta}: ${a.peserta.map(p => orang(p).nama).join(', ')}` : ''));
    }
    bagian.push(L.dari);
    return bagian.join('\n\n');
  }
  function tautanGoogle(a, label) {
    const r = rentangKalender(a);
    const q = new URLSearchParams({ action: 'TEMPLATE', text: a.judul, dates: `${r.awal}/${r.akhir}`, details: teksKalender(a, label) });
    if (a.lokasi || a.tautan) q.set('location', a.lokasi || a.tautan);
    const ulang = aturanUlang(a);
    if (ulang) q.set('recur', 'RRULE:' + ulang);
    return 'https://calendar.google.com/calendar/render?' + q.toString();
  }
  const escIcs = s => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  /* RFC 5545: baris lebih dari 75 oktet dilipat; sambungannya diawali satu spasi. */
  function lipatIcs(baris) {
    const keping = [];
    let kini = '', oktet = 0;
    for (const c of baris) {
      const n = c.codePointAt(0);
      const b = n < 0x80 ? 1 : n < 0x800 ? 2 : n < 0x10000 ? 3 : 4;
      if (oktet + b > (keping.length ? 74 : 75)) { keping.push(kini); kini = ''; oktet = 0; }
      kini += c;
      oktet += b;
    }
    keping.push(kini);
    return keping.join('\r\n ');
  }
  function icsAgenda(daftar, opsi = {}) {
    const stempel = fmtUtc(new Date(opsi.waktu || Date.now()));
    const b = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cerebrum//ProductTrack v2//ID', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    for (const a of daftar || []) {
      const r = rentangKalender(a);
      b.push('BEGIN:VEVENT', `UID:${a.id}@producttrack`, `DTSTAMP:${stempel}`,
        r.hari ? `DTSTART;VALUE=DATE:${r.awal}` : `DTSTART:${r.awal}`, r.hari ? `DTEND;VALUE=DATE:${r.akhir}` : `DTEND:${r.akhir}`,
        `SUMMARY:${escIcs(a.judul)}`);
      const ulang = aturanUlang(a);
      if (ulang) b.push(`RRULE:${ulang}`);
      if (a.lokasi || a.tautan) b.push(`LOCATION:${escIcs(a.lokasi || a.tautan)}`);
      if (a.tautan) b.push(`URL:${a.tautan}`);
      b.push(`DESCRIPTION:${escIcs(teksKalender(a, opsi.label))}`, 'END:VEVENT');
    }
    b.push('END:VCALENDAR');
    return b.map(lipatIcs).join('\r\n') + '\r\n';
  }

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
    if (mirror !== !!p.mirror) wajibIzin(me, 'paket.bagikan');
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
    wajibIzin(me, 'paket.hapus');
    const i = data.packages.indexOf(p);
    if (i < 0) throw new Error('Paket tidak ditemukan.');
    catatNomor(data, data.packages, 'PKG');
    data.packages.splice(i, 1);
    if (data.setoran) data.setoran = data.setoran.filter(s => s.paket !== p.id);
    for (const proj of data.projects) if (proj.paket === p.id) proj.paket = '';
    catatLog(data, 'delete', `${p.id} · ${p.namaPaket}`, 'Rancangan paket dihapus', me, waktu);
  }

  /* ---------- Inisiatif (2.31.0, permintaan user) ----------
     Pekerjaan berkelanjutan di luar rancangan paket dan siklus ADDIE (mis. ProductTrack v2,
     Product Knowledge): dideklarasikan sekali, lalu setiap pembaruannya menjadi task biasa di
     jalur rutin yang menempel ke inisiatif itu (t.inisiatif). Task-nya tanpa tinjauan (seperti
     rutin) dan tetap terhitung di Hari Ini, beban, Dashboard, Laporan, dan telat; tak terkena
     fase atau gerbang ADDIE. Sementara ini khusus tim DAE (TIM_INISIATIF) dan Manager. */
  const TIM_INISIATIF = ['SI'];
  const STATUS_INISIATIF = [['aktif', 'Aktif'], ['ditunda', 'Ditunda'], ['selesai', 'Selesai']];
  const timInisiatif = me => { const t = timOrang(me); return t && TIM_INISIATIF.includes(t.kode) ? t.kode : ''; };
  const bolehLihatInisiatif = me => me === DEV || orang(me).peran === 'manager' || !!timInisiatif(me);
  function bolehKelolaInisiatif(me, x) {
    if (!izin(me, 'inisiatif.kelola')) return false;
    if (me === DEV || orang(me).peran === 'manager') return true;
    const tim = timInisiatif(me);
    return !!tim && (!x || x.tim === tim);
  }
  function tolakInisiatif(me) {
    if (!izin(me, 'inisiatif.kelola')) return tolakIzin('inisiatif.kelola');
    return new Error(`Inisiatif sementara khusus tim ${TIM_INISIATIF.map(singkatTim).join(', ')} dan Manager.`);
  }
  const cariInisiatif = (data, id) => (data.inisiatif || []).find(x => x.id === id) || null;
  const anggotaTimKode = kode => { const lead = (TIM[kode] || {}).lead; return lead ? [lead, ...timDari(lead)] : []; };
  function tautanInisiatif(daftar, waktu) {
    return (Array.isArray(daftar) ? daftar : []).filter(l => l && (teks(l.url) || teks(l.label))).slice(0, 20).map((l, i) => {
      const url = tautanRapi(l.url);
      if (!url) throw new Error(`Tautan "${teks(l.label) || teks(l.url)}" bukan alamat web (http/https).`);
      return { id: teks(l.id) || `il${waktu}-${i}`, urutan: i + 1, label: teks(l.label).slice(0, 200) || judulTautan(url), url };
    });
  }
  function isiInisiatif(f, lama) {
    const nama = teks(f.nama === undefined ? lama.nama : f.nama);
    if (nama.length < 2 || nama.length > 120) throw new Error('Nama inisiatif wajib diisi (2–120 karakter).');
    const tujuan = teks(f.tujuan === undefined ? lama.tujuan : f.tujuan);
    if (tujuan.length > 2000) throw new Error('Tujuan inisiatif paling panjang 2000 karakter.');
    const status = f.status === undefined ? lama.status || 'aktif' : teks(f.status);
    if (!STATUS_INISIATIF.some(([k]) => k === status)) throw new Error('Status inisiatif tidak dikenal.');
    return { nama, tujuan, status };
  }
  function inisiatifBaru(data, f, me, waktu) {
    if (!bolehKelolaInisiatif(me)) throw tolakInisiatif(me);
    const tim = timInisiatif(me) || (TIM_INISIATIF.includes(teks(f.tim)) ? teks(f.tim) : TIM_INISIATIF[0]);
    const pic = teks(f.pic) || (TIM[tim] || {}).lead || me;
    if (!anggotaTimKode(tim).includes(pic)) throw new Error(`PIC inisiatif adalah anggota tim ${singkatTim(tim)}.`);
    const daftar = data.inisiatif || (data.inisiatif = []);
    const x = {
      id: 'INI-' + String(nomorBerikut(daftar, 'INI', data)).padStart(3, '0'), ...isiInisiatif(f, {}), tim, pic,
      links: tautanInisiatif(f.links, waktu), createdBy: me, createdAt: waktu, updatedBy: me, updatedAt: waktu,
    };
    daftar.unshift(x);
    catatLog(data, 'create', `${x.id} · ${x.nama}`, 'Inisiatif dideklarasikan', me, waktu);
    return x;
  }
  function ubahInisiatif(data, x, f, me, waktu) {
    if (!bolehKelolaInisiatif(me, x)) throw tolakInisiatif(me);
    const isi = isiInisiatif(f, x);
    const pic = f.pic === undefined ? x.pic : teks(f.pic);
    if (!anggotaTimKode(x.tim).includes(pic)) throw new Error(`PIC inisiatif adalah anggota tim ${singkatTim(x.tim)}.`);
    const ubah = [];
    if (isi.nama !== x.nama) ubah.push(`nama ${x.nama} → ${isi.nama}`);
    if (isi.status !== x.status) ubah.push(`status ${x.status} → ${isi.status}`);
    if (pic !== x.pic) ubah.push('PIC ' + orang(pic).pendek);
    // Nama inisiatif juga tampil sebagai kategori task-nya (jalur rutin tanpa kode).
    if (isi.nama !== x.nama) for (const t of data.tasks) if (t.inisiatif === x.id && !t.sub) t.kategori = isi.nama;
    Object.assign(x, isi, { pic, updatedBy: me, updatedAt: waktu, ...(f.links === undefined ? {} : { links: tautanInisiatif(f.links, waktu) }) });
    catatLog(data, 'update', `${x.id} · ${x.nama}`, ubah.length ? 'Inisiatif diubah: ' + ubah.join(', ') : 'Inisiatif diubah', me, waktu);
    return x;
  }
  /* Yang sudah punya task tak dihapus (riwayat pembaruannya hilang): tandai Selesai saja. */
  function hapusInisiatif(data, x, me, waktu) {
    if (!bolehKelolaInisiatif(me, x)) throw tolakInisiatif(me);
    const n = data.tasks.filter(t => t.inisiatif === x.id).length;
    if (n) throw new Error(`Inisiatif ini punya ${n} task. Tandai Selesai saja supaya riwayat pembaruannya tetap.`);
    catatNomor(data, data.inisiatif, 'INI');
    data.inisiatif.splice(data.inisiatif.indexOf(x), 1);
    catatLog(data, 'delete', `${x.id} · ${x.nama}`, 'Inisiatif dihapus', me, waktu);
  }
  /* Inisiatif untuk task baru/ditempel: hanya task di luar proyek, inisiatif yang belum selesai. */
  function inisiatifUntukTask(data, id, proyek, me) {
    if (!teks(id)) return null;
    const x = cariInisiatif(data, teks(id));
    if (!x) throw new Error('Inisiatif tidak ditemukan.');
    if (proyek) throw new Error('Task proyek tak ditempel ke inisiatif: pembaruan inisiatif berada di luar proyek.');
    if (!bolehLihatInisiatif(me)) throw tolakInisiatif(me);
    if (x.status === 'selesai') throw new Error(`Inisiatif ${x.nama} sudah selesai. Aktifkan lagi dulu untuk menambah pembaruan.`);
    return x;
  }
  /* Menempel task lama (di luar proyek) ke inisiatif, atau melepasnya (id kosong). */
  function tempelInisiatif(data, t, id, me, waktu) {
    if (!bolehUbah(t, me)) throw new Error('Hanya PIC, Lead-nya, atau Manager yang menempelkan task ke inisiatif.');
    const x = inisiatifUntukTask(data, id, t.project, me);
    const lama = cariInisiatif(data, t.inisiatif);
    t.inisiatif = x ? x.id : '';
    if (x && !t.sub) t.kategori = x.nama;
    t.updatedAt = waktu;
    catatLog(data, 'update', `${t.id} · ${t.title}`, x ? `Ditempel ke inisiatif ${x.id} · ${x.nama}` : `Dilepas dari inisiatif ${lama ? lama.nama : ''}`.trim(), me, waktu);
    return t;
  }
  /* Ringkasan satu inisiatif: task terbuka, riwayat pembaruan yang selesai (terbaru di atas). */
  function ringkasInisiatif(data, x, hariIni) {
    const tasks = data.tasks.filter(t => t.inisiatif === x.id);
    const buka = tasks.filter(aktif);
    const beres = tasks.filter(selesai).sort((a, b) => b.selesaiAt - a.selesaiAt);
    const batas = tambahHari(hariIni, -29);
    const batas7 = tambahHari(hariIni, -6);
    return {
      tasks, buka, beres, telat: buka.filter(t => telat(t, hariIni)).length,
      selesai30: beres.filter(t => isoHari(t.selesaiAt) >= batas).length,
      // Angka kerja 7 hari terakhir (2.39.0), dan apakah pembaruannya memang mencatat angka itu.
      angka7: jumlahAngka(beres.filter(t => isoHari(t.selesaiAt) >= batas7)),
      adaAngka: beres.some(t => { const a = angkaKerja(t.output); return !!(a.commit || a.file || a.sesi); }),
      terakhir: Math.max(x.updatedAt || 0, ...tasks.map(t => Math.max(t.updatedAt || 0, t.selesaiAt || 0))),
    };
  }

  /* ---------- Linimasa pembaruan inisiatif (2.39.0, permintaan user) ----------
     Halaman inisiatif menampilkan pembaruan per hari, dengan angka kerjanya dan tanggapan
     (Manager khususnya). Tanggapan = pesan di ruang diskusi task pembaruannya, jadi tak ada
     jenis data baru; yang dihitung pesan orang selain PIC-nya. */
  /* Angka kerja dari kolom output yang diisi agen: "7 commit, 1 sesi Claude Code", "2 file disentuh". */
  function angkaKerja(teks) {
    const s = String(teks || '');
    const ambil = pola => { const m = pola.exec(s); return m ? Number(m[1]) : 0; };
    return { commit: ambil(/(\d+)\s*commit/i), file: ambil(/(\d+)\s*file/i), sesi: ambil(/(\d+)\s*sesi/i) };
  }
  const jumlahAngka = tasks => tasks.reduce((n, t) => {
    const a = angkaKerja(t.output);
    return { commit: n.commit + a.commit, file: n.file + a.file, sesi: n.sesi + a.sesi };
  }, { commit: 0, file: 0, sesi: 0 });
  /* Judul tanpa awalan nama inisiatifnya: "Agent AI: perbaikan audit" di inisiatif
     "Agent AI (Staff Tim DAE)" → "Perbaikan audit". Awalan lain dibiarkan. */
  function judulPembaruan(t, x) {
    const judul = String((t && t.title) || '');
    const m = /^([^:]{2,40}):\s+(\S[\s\S]*)$/.exec(judul);
    if (!m || !x || !String(x.nama || '').toLowerCase().startsWith(m[1].trim().toLowerCase())) return judul;
    return m[2].charAt(0).toUpperCase() + m[2].slice(1);
  }
  /* Pembaruan selesai per hari, terbaru dulu, dengan jumlah angka kerja harinya. */
  function linimasaInisiatif(tasks) {
    const grup = new Map();
    for (const t of tasks) {
      const hari = isoHari(t.selesaiAt);
      if (!grup.has(hari)) grup.set(hari, []);
      grup.get(hari).push(t);
    }
    return [...grup.entries()].sort((a, b) => b[0].localeCompare(a[0]))
      .map(([hari, isi]) => ({ hari, tasks: isi.sort((a, b) => b.selesaiAt - a.selesaiAt), angka: jumlahAngka(isi) }));
  }
  /* Tanggapan atas satu pembaruan: pesan di ruangnya dari orang selain PIC (yang belum dihapus). */
  const tanggapanPembaruan = (t, pesan) => (pesan || []).filter(m => !m.dihapus && m.oleh && m.oleh !== t.pic);
  /* Pembaruan yang belum ditanggapi `me` (untuk Manager di daftar inisiatif). perRuang = susunObrolan().perRuang. */
  const belumDitanggapi = (tasks, perRuang, me) => tasks.filter(t => t.pic !== me
    && !((perRuang && perRuang.get(ruangTask(t.id))) || []).some(m => !m.dihapus && m.oleh === me));

  /* ---------- Permintaan lanjutan (2.36.0, permintaan user) ----------
     Dari task yang sudah diajukan atau selesai, PIC-nya (juga Lead-nya atau Manager) meminta
     orang lain, tim mana pun, mengerjakan lanjutannya (contoh user: Andika selesai membuat
     rancangan, lalu meminta Ali membuat prototype). Penerima menerima dulu: Terima = jadi task
     di Antre, di proyek task asal dan tertaut ke sana; Tolak = alasan wajib; atau bertanya lewat
     obrolan task asal. Kalau yang diminta staff, Lead-nya ikut diberi tahu dan boleh menjawab
     atau mengalihkannya ke anggota timnya. Permintaan tak pernah dihapus; statusnya
     menunggu → diterima | ditolak | batal. Keputusan user 2026-10-16 (kanvas sebelum–sesudah). */
  const STATUS_MINTA = ['menunggu', 'diterima', 'ditolak', 'batal'];
  /* Lead tim seseorang: Lead-nya bagi staff, dirinya sendiri bagi Lead dan Manager. */
  const leadDari = id => { const tim = timOrang(id); return tim ? tim.lead : ''; };
  const anggotaTimLead = lead => (lead ? [lead, ...timDari(lead)] : []);
  const daftarMinta = data => data.permintaan || (data.permintaan = []);
  const bolehMinta = (t, me) => !!t && ORANG_PER_ID.has(me) && (selesai(t) || t.status === 'Ditinjau')
    && (t.pic === me || leadDari(t.pic) === me || orang(me).peran === 'manager');
  const bolehJawabMinta = (m, me) => !!m && m.status === 'menunggu' && ORANG_PER_ID.has(me) && (m.ke === me || leadDari(m.ke) === me);
  const bolehAlihkanMinta = (m, me) => !!m && m.status === 'menunggu' && ORANG_PER_ID.has(me) && leadDari(m.ke) === me;
  const bolehBatalMinta = (m, me) => !!m && m.status === 'menunggu' && m.dari === me;
  const tolakMinta = () => new Error('Permintaan ini sudah dijawab, atau bukan untuk Anda.');

  function mintaLanjutan(data, t, f, me, waktu, hariIni) {
    if (!bolehMinta(t, me)) throw new Error('Lanjutan diminta dari task yang sudah diajukan atau selesai, oleh PIC-nya, Lead-nya, atau Manager.');
    const ke = teks(f.ke);
    if (!ORANG_PER_ID.has(ke)) throw new Error('Pilih orang yang diminta.');
    if (ke === me) throw new Error('Permintaan untuk orang lain. Untuk diri sendiri, tambahkan task biasa.');
    const judul = teks(f.judul).replace(/\s+/g, ' ');
    if (!judul) throw new Error('Tulis yang dibutuhkan.');
    if (judul.length > 200) throw new Error('Yang dibutuhkan paling panjang 200 huruf.');
    const rincian = teks(f.rincian);
    if (rincian.length > 2000) throw new Error('Rincian paling panjang 2.000 huruf.');
    const s = teks(f.sub) ? subTahap(teks(f.sub)) : null;
    if (teks(f.sub) && (!s || s.dihapus)) throw new Error(`Sub-stage ${teks(f.sub)} tidak ada di Master.`);
    if (s && !!t.project === (s.tahap === 'R')) throw new Error(t.project ? 'Lanjutan task proyek memakai sub-stage ADDIE.' : 'Lanjutan task di luar proyek memakai sub-stage rutin (kode R).');
    const due = teks(f.due);
    if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) throw new Error('Tanggal tenggat tidak valid.');
    if (due && hariIni && due < hariIni) throw new Error('Tenggat harapan sudah lewat.');
    const daftar = daftarMinta(data);
    const m = {
      id: 'MNT-' + String(nomorBerikut(daftar, 'MNT', data)).padStart(3, '0'), sumber: t.id, dari: me, ke, judul, rincian,
      sub: s ? s.kode : '', due, status: 'menunggu', alasan: '', task: '', oleh: '', dialihkan: '', dialihkanAt: 0,
      createdAt: waktu, jawabAt: 0, updatedAt: waktu,
    };
    daftar.unshift(m);
    // Jenis 'update', bukan 'create': log 'create' dibaca notifikasi sebagai task baru.
    catatLog(data, 'update', `${t.id} · ${t.title}`, `Meminta lanjutan ke ${orang(ke).pendek}: ${judul}`, me, waktu);
    return m;
  }
  /* Menerima = membuat task-nya dengan aturan taskBaru (PIC dan sub-stage diperiksa seperti biasa:
     staff hanya untuk dirinya, Lead untuk timnya). Task asal yang belum selesai ditunggu. */
  function terimaPermintaan(data, m, f, me, waktu, hariIni) {
    if (!bolehJawabMinta(m, me)) throw tolakMinta();
    const asal = data.tasks.find(x => x.id === m.sumber) || null;
    const p = asal && asal.project ? data.projects.find(x => x.id === asal.project) : null;
    const tunggu = asal && p && !selesai(asal) && (asal.cycle || 1) === (p.cycle || 1) ? [asal.id] : [];
    const t = taskBaru(data, {
      title: m.judul, project: p ? p.id : '', sub: teks(f.sub) || m.sub, pic: teks(f.pic) || me,
      due: f.due === undefined ? m.due : teks(f.due), detail: m.rincian, platform: asal ? asal.platform : '', deps: tunggu,
    }, me, waktu, hariIni);
    // Ditinjau tim peminta saat diajukan (peninjauMinta, 2.38.0).
    t.diminta = m.dari;
    Object.assign(m, { status: 'diterima', task: t.id, oleh: me, jawabAt: waktu, updatedAt: waktu });
    if (asal) catatLog(data, 'update', `${asal.id} · ${asal.title}`, `Permintaan lanjutan diterima ${orang(me).pendek}: jadi ${t.id}`, me, waktu);
    return t;
  }
  function tolakPermintaan(data, m, alasan, me, waktu) {
    if (!bolehJawabMinta(m, me)) throw tolakMinta();
    const isi = teks(alasan);
    if (isi.length < 3) throw new Error('Tulis alasannya, supaya peminta tahu langkah berikutnya.');
    if (isi.length > 1000) throw new Error('Alasan paling panjang 1.000 huruf.');
    Object.assign(m, { status: 'ditolak', alasan: isi, oleh: me, jawabAt: waktu, updatedAt: waktu });
    const asal = data.tasks.find(x => x.id === m.sumber);
    if (asal) catatLog(data, 'update', `${asal.id} · ${asal.title}`, `Permintaan lanjutan ditolak ${orang(me).pendek}: ${isi}`, me, waktu);
    return m;
  }
  function batalkanPermintaan(data, m, me, waktu) {
    if (!bolehBatalMinta(m, me)) throw new Error('Hanya peminta yang membatalkan, selama belum dijawab.');
    Object.assign(m, { status: 'batal', updatedAt: waktu });
    const asal = data.tasks.find(x => x.id === m.sumber);
    if (asal) catatLog(data, 'update', `${asal.id} · ${asal.title}`, `Permintaan lanjutan ke ${orang(m.ke).pendek} dibatalkan`, me, waktu);
    return m;
  }
  /* Lead tim penerima mengalihkan ke anggota timnya (dirinya atau staff-nya). */
  function alihkanPermintaan(data, m, ke, me, waktu) {
    if (!bolehAlihkanMinta(m, me)) throw new Error('Hanya Lead tim penerima yang mengalihkan, selama belum dijawab.');
    const baru = teks(ke);
    if (!anggotaTimLead(me).includes(baru)) throw new Error('Alihkan ke anggota tim Anda.');
    if (baru === m.ke) throw new Error(`Permintaan ini sudah untuk ${orang(baru).pendek}.`);
    if (baru === m.dari) throw new Error('Tak bisa dialihkan ke pemintanya sendiri.');
    const lama = m.ke;
    Object.assign(m, { ke: baru, dialihkan: lama, dialihkanAt: waktu, updatedAt: waktu });
    const asal = data.tasks.find(x => x.id === m.sumber);
    if (asal) catatLog(data, 'update', `${asal.id} · ${asal.title}`, `Permintaan lanjutan dialihkan dari ${orang(lama).pendek} ke ${orang(baru).pendek}`, me, waktu);
    return m;
  }
  const permintaanDari = (data, id) => (data.permintaan || []).filter(m => m.sumber === id);
  /* Task yang lahir dari permintaan: permintaan asalnya, atau null. */
  const asalPermintaan = (data, id) => (id && (data.permintaan || []).find(m => m.task === id)) || null;
  /* Yang menunggu jawaban `me`: yang untuknya, dan (bagi Lead) yang untuk staff-nya (tim: true). */
  const permintaanMasuk = (data, me) => (data.permintaan || [])
    .filter(m => m.status === 'menunggu' && m.dari !== me && (m.ke === me || leadDari(m.ke) === me))
    .map(m => ({ m, tim: m.ke !== me }));
  /* Hari kerja (Senin–Jumat) sesudah `dari` sampai `ke`; libur nasional tak dihitung. */
  function hariKerja(dari, ke) {
    if (!dari || !ke || ke <= dari) return 0;
    if (selisihHari(dari, ke) > 90) return 90;
    let n = 0;
    for (let d = tambahHari(dari, 1); d <= ke; d = tambahHari(d, 1)) {
      const w = keTanggal(d).getDay();
      if (w !== 0 && w !== 6) n++;
    }
    return n;
  }
  /* Belum dijawab 2 hari kerja: masuk Perlu perhatian Lead tim penerima. */
  const BATAS_MINTA = 2;
  const umurMinta = (m, hariIni) => hariKerja(isoHari(m.dialihkanAt || m.createdAt), hariIni);
  const mintaLama = (m, hariIni) => m.status === 'menunggu' && umurMinta(m, hariIni) >= BATAS_MINTA;

  /* ---------- Duplikat rancangan paket dan proyek (2.30.0, permintaan user) ----------
     Untuk pekerjaan yang berulang. Paket: isi produk, target, catatan per kategori, dan
     tautannya disalin dengan ID baru; jadwal pendaftaran dikosongkan, tak dibagikan ke Lintas
     Divisi, dan angka "sudah ada" kembali 0 kecuali dipilih ikut. Setoran dan proyek yang
     tertaut tak ikut. */
  function duplikatPaket(data, p, f, me, waktu) {
    wajibIzin(me, 'paket.buat');
    const namaPaket = teks(f.namaPaket) || `${p.namaPaket || p.id} (salinan)`;
    const salin = JSON.parse(JSON.stringify(p));
    const baru = {
      ...salin,
      id: 'PKG-' + String(nomorBerikut(data.packages, 'PKG', data)).padStart(3, '0'),
      namaPaket, mirror: false, daftarBuka: '', daftarTutup: '', updatedBy: me, updatedAt: waktu,
      items: (salin.items || []).map((it, i) => ({ ...it, id: `i${waktu}-${i}`, urutan: i + 1, awal: f.bawaAwal ? angkaPositif(it.awal) : 0 })),
      links: (salin.links || []).map((l, i) => ({ ...l, id: `pl${waktu}-${i}`, urutan: i + 1 })),
    };
    if ('arsip' in baru) baru.arsip = false;
    data.packages.unshift(baru);
    catatLog(data, 'create', `${baru.id} · ${baru.namaPaket}`, `Rancangan paket diduplikat dari ${p.id}`, me, waktu);
    return baru;
  }
  /* Proyek: nama, platform, dan tujuan, ditambah (bila dipilih) task siklus aktifnya sebagai
     rencana baru di siklus 1 — judul, sub-stage, PIC, prioritas, keterangan, ceklis (belum
     dicentang), task turunan, dan urutan tunggu ikut; status, output, bukti, tinjauan, komentar,
     dan setoran tidak. Tenggat digeser ke hari ini dengan jarak yang sama dari awal proyek
     asalnya, atau dikosongkan. PIC yang sudah nonaktif diganti Lead tim pemilik sub-stage-nya.
     Proyek baru tak tertaut ke paket. */
  function duplikatProyek(data, p, f, me, waktu, hariIni) {
    wajibIzin(me, 'proyek.buat');
    const baru = proyekBaru(data, { name: teks(f.name) || `${p.name} (salinan)`, platform: p.platform, goal: p.goal }, me, waktu);
    const tasks = [];
    if (f.tasks !== false) {
      const asal = tugasSiklus(data, p);
      const dasar = asal.map(t => t.start || isoHari(t.createdAt)).filter(Boolean).sort()[0] || hariIni;
      const peta = new Map();
      // Yang paling lama lebih dulu, lalu ditaruh di depan: urutannya sama dengan proyek asalnya.
      for (const t of asal.slice().reverse()) {
        const pic = ORANG_PER_ID.has(t.pic) ? t.pic : leadSub(t.sub) || MANAGER;
        const x = {
          id: 'PRD-' + String(nomorBerikut(data.tasks, 'PRD', data)).padStart(3, '0'),
          project: baru.id, lane: 'proyek', kategori: '', title: t.title, platform: t.platform || baru.platform,
          stage: t.stage, sub: t.sub, detail: t.detail || '', pic, support: [], priority: t.priority || 'Normal',
          start: hariIni, due: t.due && f.tenggat !== 'kosong' ? tambahHari(hariIni, selisihHari(dasar, t.due)) : '',
          status: 'Antre', tertahan: false, alasanTertahan: '', output: '', deps: [], tunggu: [], lepasFase: !!t.lepasFase,
          notes: '', assignedBy: me, cycle: 1, induk: '', createdAt: waktu, updatedAt: waktu, selesaiAt: 0,
          subtasks: (t.subtasks || []).map((s, i) => ({ id: `s${waktu}-${tasks.length}-${i}`, title: s.title, pic, due: '', done: false, link: s.link || '' })),
          comments: [], tinjauan: [], evidence: [],
        };
        data.tasks.unshift(x);
        peta.set(t.id, x);
        tasks.push(x);
      }
      for (const t of asal) {
        const x = peta.get(t.id);
        if (t.induk && peta.has(t.induk)) x.induk = peta.get(t.induk).id;
        x.tunggu = (t.tunggu || []).filter(id => peta.has(id)).map(id => peta.get(id).id);
      }
      // Induk yang sudah punya turunan dan tak menunggu apa pun berjalan, seperti saat dibagi.
      const perId = indeks(data);
      for (const x of tasks) if (!x.induk && anakTask(perId, x.id).length && !depsBelum(x, perId).length) x.status = 'Dikerjakan';
    }
    catatLog(data, 'update', `${baru.id} · ${baru.name}`, `Diduplikat dari ${p.id} · ${p.name}${tasks.length ? ` (${tasks.length} task)` : ''}`, me, waktu);
    return { project: baru, tasks };
  }

  /* Hapus proyek (2.22.0, permintaan user). Hanya Manager, yang juga membuat proyek. Ikut
     terhapus: semua task proyek itu di semua siklus (termasuk turunan, ceklis, komentar,
     tinjauan, dan bukti yang tersimpan di dalam task) dan setoran task-task itu, jadi progres
     paket dari proyek ini hilang dan targetnya terbuka lagi untuk dielaborasi. Riwayat Aktivitas
     tetap, dan pesan Komunikasi tetap tersimpan (tab obrolan hanya bertambah). Arsip tetap jalan
     yang aman untuk proyek yang sudah selesai. */
  function ringkasHapusProyek(data, p) {
    const tasks = data.tasks.filter(t => t.project === p.id);
    const ids = new Set(tasks.map(t => t.id));
    const setoran = (data.setoran || []).filter(s => ids.has(s.task));
    return {
      task: tasks.length, turunan: tasks.filter(t => t.induk).length, terbuka: tasks.filter(aktif).length,
      setoran: setoran.length, paket: [...new Set(setoran.map(s => s.paket))],
    };
  }
  function hapusProyek(data, p, me, waktu) {
    wajibIzin(me, 'proyek.hapus');
    if (!p || data.projects.indexOf(p) < 0) throw new Error('Proyek tidak ditemukan.');
    const r = ringkasHapusProyek(data, p);
    const ids = new Set(data.tasks.filter(t => t.project === p.id).map(t => t.id));
    catatNomor(data, data.projects, 'PRJ');
    catatNomor(data, data.tasks, 'PRD');
    data.projects.splice(data.projects.indexOf(p), 1);
    for (let i = data.tasks.length - 1; i >= 0; i--) if (ids.has(data.tasks[i].id)) data.tasks.splice(i, 1);
    if (data.setoran) for (let i = data.setoran.length - 1; i >= 0; i--) if (ids.has(data.setoran[i].task)) data.setoran.splice(i, 1);
    catatLog(data, 'delete', `${p.id} · ${p.name}`, `Proyek dihapus beserta ${r.task} task${r.setoran ? ` dan ${r.setoran} setoran paket` : ''}`, me, waktu);
    return { proyek: p.id, ...r };
  }

  /* Hapus task (2.23.0, permintaan user): satu atau banyak sekaligus, mis. dipilih di tab tim
     proyek. Yang boleh: Manager; Lead untuk task yang boleh ia ubah dan semua task di tab timnya;
     staff hanya task yang ia buat untuk dirinya sendiri. Task turunan ikut terhapus bersama
     induknya, setorannya ikut hilang (progres paket turun), dan rujukan di task lain (deps,
     tunggu) dibersihkan. Riwayat Aktivitas mencatat tiap task yang dipilih. */
  const MAKS_HAPUS_TASK = 500;
  function bolehHapusTask(t, me, perId) {
    if (!t) return false;
    const r = orang(me).peran;
    if (izin(me, 'task.hapusSemua') || bolehUbahTask(t, me)) return true;
    if (r !== 'lead' || !t.project) return false;
    const tim = TIM[timJalur(t, perId)];
    return !!tim && tim.lead === me;
  }
  /* Yang akan hilang bila task-task ini dihapus (untuk jendela konfirmasi). */
  function ringkasHapusTask(data, ids) {
    const perId = indeks(data);
    const pilih = [...new Set(ids || [])].map(id => perId.get(id)).filter(Boolean);
    const dipilih = new Set(pilih.map(t => t.id));
    const turunan = data.tasks.filter(t => t.induk && dipilih.has(t.induk) && !dipilih.has(t.id));
    const semua = [...pilih, ...turunan];
    const idSemua = new Set(semua.map(t => t.id));
    return {
      tasks: semua, dipilih: pilih.length, turunan: turunan.length, selesai: semua.filter(selesai).length,
      setoran: (data.setoran || []).filter(s => idSemua.has(s.task)).length,
    };
  }
  function hapusTask(data, ids, me, waktu) {
    const daftar = [...new Set((Array.isArray(ids) ? ids : [ids]).map(teks).filter(Boolean))];
    if (!daftar.length) throw new Error('Pilih dulu task yang dihapus.');
    if (daftar.length > MAKS_HAPUS_TASK) throw new Error(`Paling banyak ${MAKS_HAPUS_TASK} task sekali hapus.`);
    const perId = indeks(data);
    // Yang sudah dihapus orang lain lebih dulu dilewati; sisanya harus boleh semua.
    const ada = daftar.filter(id => perId.has(id));
    if (!ada.length) throw new Error('Task yang dipilih sudah tidak ada.');
    const tolak = ada.map(id => perId.get(id)).filter(t => !bolehHapusTask(t, me, perId));
    if (tolak.length) {
      throw new Error(`Anda tak boleh menghapus ${tolak.map(t => t.id).join(', ')}: hanya Manager, Lead tim pemiliknya, atau staff yang membuatnya untuk dirinya sendiri.`);
    }
    const r = ringkasHapusTask(data, ada);
    const idSemua = new Set(r.tasks.map(t => t.id));
    catatNomor(data, data.tasks, 'PRD');
    for (let i = data.tasks.length - 1; i >= 0; i--) if (idSemua.has(data.tasks[i].id)) data.tasks.splice(i, 1);
    if (data.setoran) for (let i = data.setoran.length - 1; i >= 0; i--) if (idSemua.has(data.setoran[i].task)) data.setoran.splice(i, 1);
    for (const t of data.tasks) {
      if ((t.deps || []).some(id => idSemua.has(id))) t.deps = t.deps.filter(id => !idSemua.has(id));
      if ((t.tunggu || []).some(id => idSemua.has(id))) t.tunggu = t.tunggu.filter(id => !idSemua.has(id));
    }
    for (const t of r.tasks.filter(x => !x.induk || !idSemua.has(x.induk))) {
      const anak = r.tasks.filter(x => x.induk === t.id).length;
      catatLog(data, 'delete', `${t.id} · ${t.title}`, `Task dihapus${anak ? ` beserta ${anak} task turunan` : ''}`, me, waktu);
    }
    return { task: r.tasks.length, dipilih: r.dipilih, turunan: r.turunan, setoran: r.setoran };
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
    wajibIzin(me, 'paket.elaborasi');
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
        id: 'PRJ-' + nomorBerikut(data.projects, 'PRJ', data), name: teks(f.name) || `Produksi ${judul}`, platform: platform || 'All Platform',
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
      const batchIni = [];
      let sebelumnya = '';
      langkah.forEach((l, i) => {
        const sub = subTahap(l.kode);
        const t = taskBaru(data, {
          title: `${l.kode} · ${batch}`, project: proj.id, sub: l.kode, pic: leadSub(l.kode) || me, due: teks(f.due),
          priority: 'Normal', platform: platform || proj.platform, deps: sebelumnya ? [sebelumnya] : [],
          detail: [`Langkah ${i + 1} dari ${langkah.length}: ${sub.kode} · ${sub.nama}.`,
            `Target paket ${p.id} · ${it.kategori}${it.grup ? ' / ' + it.grup : ''} · ${it.nama}: ${fmtJumlah(jumlah)} ${satuan}.`,
            !l.capaian ? '' : langkah.filter(x => x.capaian === l.capaian).length > 1
              ? `Batch ini menjadi "${namaCapaian(l.capaian)}" di progres paket setelah semua langkah bertanda itu disetujui: ${langkah.filter(x => x.capaian === l.capaian).map(x => x.kode).join(', ')}.`
              : `Saat langkah ini disetujui, batch ini menjadi "${namaCapaian(l.capaian)}" di progres paket.`,
            it.catatan].filter(Boolean).join('\n'),
        }, me, waktu, hariIni);
        if (!idBatch) idBatch = 'B-' + t.id;
        if (l.capaian) data.setoran.push({ id: `st-${t.id}-${it.id}`, paket: p.id, item: it.id, task: t.id, jumlah, tahap: l.capaian, batch: idBatch, catatan: '' });
        sebelumnya = t.id;
        tasks.push(t);
        batchIni.push(t);
      });
      /* Urutan yang dipasang untuk batch ini (2.19.0), lihat ditunggu(); Lead timnya bisa
         mengubahnya:
         - serah-terima: langkah pertama sebuah tim menunggu langkah tim lain sebelumnya di batch
           ini yang fasenya sama atau lebih awal (Input LNA menunggu Produksi soal RAD, tapi tak
           menunggu QC soal RAD);
         - urutan alur: langkah yang di alur paket datang sesudah langkah setim di fase lebih
           lambat menunggu langkah itu (I4 tayang menunggu QC E4–E6, seperti PRD). */
      batchIni.forEach((t, i) => {
        if (!i) return;
        const tim = timTask(t);
        const fase = urutFase(t.stage);
        const dulu = batchIni.slice(0, i);
        const serah = timTask(batchIni[i - 1]) !== tim ? dulu.filter(x => timTask(x) !== tim && urutFase(x.stage) <= fase) : [];
        const alur = dulu.filter(x => timTask(x) === tim && urutFase(x.stage) > fase);
        if (serah.length || alur.length) t.tunggu = [...new Set([...serah, ...alur].map(x => x.id))];
      });
      // Pengaman untuk alur kategori yang disusun sendiri di Master: urutan otomatis tak boleh
      // membuat task saling menunggu. Yang memutar dilepas; Lead bisa mengaturnya sendiri.
      const perIdBatch = indeks(data);
      for (const t of batchIni) if (t.tunggu.length && putaranTunggu(t, perIdBatch)) t.tunggu = [];
    }
    segarkanTahap(data);
    return { project: proj, tasks };
  }

  /* ---------- Tab tim di halaman proyek (2.19.0) ---------- */

  /* Ringkasan tiap tim di siklus aktif proyek, urut tab. fase = fase task terbuka paling awal
     tim itu; 'selesai' kalau semuanya selesai; '' kalau tim itu belum punya task. */
  function faseTim(data, p, perId = indeks(data), hariIni = '') {
    const kini = tugasSiklus(data, p);
    return TIM_PROYEK.map(kode => {
      const milik = kini.filter(t => timJalur(t, perId) === kode);
      const buka = milik.filter(aktif);
      return {
        kode, fase: buka.length ? URUT_TAHAP.find(s => buka.some(t => t.stage === s)) : milik.length ? 'selesai' : '',
        total: milik.length, selesai: milik.length - buka.length, buka: buka.length,
        menunggu: buka.filter(t => !t.tertahan && depsBelum(t, perId).length).length,
        tertahan: buka.filter(ditandaiTertahan).length,
        telat: hariIni ? buka.filter(t => telat(t, hariIni) && !t.tertahan).length : 0,
      };
    });
  }
  /* Gerbang proyek: task Manager di siklus aktif (A1, A6 di awal; I8; E12 menutup siklus). */
  const gerbangProyek = (data, p, perId = indeks(data)) => tugasSiklus(data, p).filter(t => timJalur(t, perId) === 'MG');

  /* Putaran saling menunggu di siklus aktif proyek, untuk peringatan di halaman proyek:
     [[id, …], …]. Biasanya karena urutan yang diatur, lalu sub-stage atau status berubah. */
  function putaranProyek(data, p, perId = indeks(data)) {
    const simpul = tugasSiklus(data, p).filter(t => aktif(t) && !t.induk);
    const tepi = new Map(simpul.map(t => [t.id, [...new Set(depsBelum(t, perId).map(x => akarTask(x, perId).id))]]));
    let urut = 0;
    const idx = new Map();
    const rendah = new Map();
    const tumpuk = [];
    const diTumpuk = new Set();
    const hasil = [];
    const kunjungi = v => {
      idx.set(v, urut);
      rendah.set(v, urut++);
      tumpuk.push(v);
      diTumpuk.add(v);
      for (const w of tepi.get(v) || []) {
        if (!tepi.has(w)) continue;
        if (!idx.has(w)) { kunjungi(w); rendah.set(v, Math.min(rendah.get(v), rendah.get(w))); }
        else if (diTumpuk.has(w)) rendah.set(v, Math.min(rendah.get(v), idx.get(w)));
      }
      if (rendah.get(v) !== idx.get(v)) return;
      const komponen = [];
      let w;
      do { w = tumpuk.pop(); diTumpuk.delete(w); komponen.push(w); } while (w !== v);
      if (komponen.length > 1) hasil.push(komponen.reverse());
    };
    for (const t of simpul) if (!idx.has(t.id)) kunjungi(t.id);
    return hasil;
  }

  /* Lead tim pemilik task (atau Manager) mengatur siapa yang ditunggu task itu di tab timnya:
     ikut urutan fase tim (bawaan) atau tidak, dan task lain yang harus selesai dulu — boleh dari
     tim lain di proyek dan siklus yang sama. Task turunan mengikuti induknya; E12 tetap menunggu
     semua task lain. */
  function bolehAturTunggu(t, me, perId) {
    if (!t || !tungguTahap(t) || t.induk || t.sub === 'E12') return false;
    const r = orang(me).peran;
    if (izin(me, 'task.urutanSemua')) return true;
    const tim = TIM[timJalur(t, perId)];
    return r === 'lead' && !!tim && tim.lead === me;
  }
  function aturTunggu(data, t, f, me, waktu) {
    const perId = indeks(data);
    if (!bolehAturTunggu(t, me, perId)) {
      throw new Error(t && t.induk ? 'Task turunan mengikuti urutan induknya.' : t && t.sub === 'E12' ? 'E12 selalu menunggu semua task lain di siklusnya.'
        : 'Urutan tunggu diatur Lead tim pemilik task ini, atau Manager.');
    }
    const siklus = sesiklus(t, perId);
    const pilih = [...new Set((Array.isArray(f.tunggu) ? f.tunggu : []).map(teks).filter(Boolean))];
    for (const id of pilih) {
      const x = perId.get(id);
      if (!x || x === t || !siklus.includes(x)) throw new Error(`${id} bukan task lain di proyek dan siklus yang sama.`);
      if (x.induk) throw new Error(`${id} adalah task turunan: pilih induknya, ${x.induk}.`);
      if (x.sub === 'E12') throw new Error('E12 menutup siklus sesudah semua task lain, jadi tak bisa ditunggu.');
    }
    const lama = { tunggu: t.tunggu, lepasFase: t.lepasFase };
    Object.assign(t, { tunggu: pilih, lepasFase: !!f.lepasFase });
    const putar = putaranTunggu(t, perId);
    if (putar) {
      Object.assign(t, lama);
      throw new Error(`Urutan ini membuat task saling menunggu: ${putar.join(' → ')}. Ubah salah satunya.`);
    }
    t.updatedAt = waktu;
    const tim = singkatTim(timJalur(t, perId));
    catatLog(data, 'update', `${t.id} · ${t.title}`, `Urutan tunggu diatur: ${t.lepasFase ? `lepas dari fase ${tim}` : `ikut fase ${tim}`}${pilih.length ? `, menunggu ${pilih.join(', ')}` : ''}`, me, waktu);
    return t;
  }

  const bolehSetor = (t, me) => izin(me, 'paket.setoran') && bolehUbah(t, me);

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
    wajibIzin(me, 'paket.setoran');
    if (t && !bolehUbah(t, me)) throw new Error('Hanya Lead atau Manager task ini yang mengatur setoran.');
    const [s] = daftar.splice(i, 1);
    catatLog(data, 'update', t ? `${t.id} · ${t.title}` : s.task, `Setoran ke ${s.paket} dihapus`, me, waktu);
  }

  /* Menautkan proyek yang sudah ada (mis. kolaborasi v1) ke rancangan paket. */
  function tautkanPaket(data, proj, paketId, me, waktu) {
    wajibIzin(me, 'proyek.paket');
    if (paketId && !data.packages.some(p => p.id === paketId)) throw new Error('Paket tidak ditemukan.');
    proj.paket = paketId || '';
    catatLog(data, 'update', `${proj.id} · ${proj.name}`, paketId ? `Ditautkan ke rancangan paket ${paketId}` : 'Tautan rancangan paket dilepas', me, waktu);
  }

  /* ---------- Link Saya, Catatan Saya, Tautan tim ---------- */

  const FOLDER_UMUM = 'Umum';
  const namaFolder = f => teks(f) || FOLDER_UMUM;
  // "General" = nama tampilan Umum dalam bahasa Inggris (2.29.0), jadi juga berarti folder bawaan.
  const folderSimpan = f => ([FOLDER_UMUM.toLowerCase(), 'general'].includes(teks(f).toLowerCase()) ? '' : teks(f));

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
  /* Kartu tautan di pesan Komunikasi (2.35.0): berkas Google dikenali dari alamatnya. Judul
     berkasnya tak bisa diambil (berkas orang lain, tanpa akses), jadi kartunya menulis jenisnya
     dan alamat ringkasnya. null untuk tautan lain, yang tetap tampil sebagai tautan biasa. */
  function kartuTautan(u) {
    let url;
    try { url = new URL(u); } catch (e) { return null; }
    if (!/^https?:$/.test(url.protocol)) return null;
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    const jalur = url.pathname;
    const jenis = host === 'docs.google.com'
      ? (/^\/spreadsheets\//.test(jalur) ? ['sheets', 'Google Sheets'] : /^\/document\//.test(jalur) ? ['docs', 'Google Docs']
        : /^\/presentation\//.test(jalur) ? ['slides', 'Google Slides'] : /^\/forms\//.test(jalur) ? ['forms', 'Google Forms'] : null)
      : host === 'drive.google.com' ? ['drive', 'Google Drive'] : null;
    if (!jenis) return null;
    const bagian = jalur.split('/').filter(Boolean)[0] || '';
    return { jenis: jenis[0], judul: jenis[1], ket: bagian ? `${host} › ${bagian}` : host };
  }

  /* Balasan cepat di kotak tulis Komunikasi (2.35.0): menurut peran `me` di task itu (PIC,
     peninjau, atau orang lain) dan keadaannya. Hanya menyisipkan teks, tak pernah terkirim
     sendiri. t = null untuk ruang proyek dan ruang tim. keadaan = label yang ditulis di depannya. */
  const BALASAN_UMUM = ['Sudah saya cek ✅', 'Mohon dicek ya 🙏', 'Sedang saya kerjakan', 'Terima kasih 🙏'];
  function pesanCepatUntuk(t, me, perId) {
    if (!t) return { keadaan: '', isi: BALASAN_UMUM };
    const pic = t.pic === me;
    if (selesai(t)) return { keadaan: 'Selesai', isi: ['Terima kasih 🙏', 'Mantap, sudah beres ✅'] };
    if (t.status === 'Ditinjau' && peninjau(t) === me) return { keadaan: 'Ditinjau', isi: ['Sudah saya cek, saya setujui ✅', 'Ada revisi kecil', 'Saya cek besok pagi'] };
    if (pic && t.status === 'Ditinjau') return { keadaan: 'Ditinjau', isi: ['Sudah saya ajukan', 'Mohon dicek ya 🙏', 'Ada yang perlu saya ubah?'] };
    if (pic && t.tertahan) return { keadaan: 'Tertahan', isi: ['Masih tertahan, nanti saya kabari', 'Butuh bantuan untuk ini'] };
    if (pic) {
      const label = labelKeadaan(t, perId);
      if (label === 'Revisi') return { keadaan: 'Revisi', isi: ['Siap, saya perbaiki', 'Boleh dijelaskan bagian mana?', 'Sudah saya perbaiki'] };
      if (label === 'Menunggu') return { keadaan: 'Menunggu', isi: ['Saya tunggu task sebelumnya ya', 'Butuh bantuan untuk ini'] };
      if (t.status === 'Antre') return { keadaan: 'Antre', isi: ['Siap, segera saya mulai', 'Butuh bantuan untuk ini'] };
      return { keadaan: 'Dikerjakan', isi: ['Sedang saya kerjakan', 'Target selesai hari ini', 'Butuh bantuan untuk ini'] };
    }
    return { keadaan: '', isi: ['Sudah saya cek ✅', 'Bagaimana progresnya?', 'Butuh bantuan?'] };
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

  /* Pilih banyak catatan (2.34.0). Pindah folder sekaligus: sematan dan waktu ubahnya tetap. */
  function pindahFolderCatatan(data, me, ids, folder) {
    const tujuan = folderSimpan(folder);
    const daftar = [...new Set(ids || [])].map(id => milikSaya(data.notes, id, me));
    for (const n of daftar) n.folder = tujuan;
    return daftar.length;
  }
  /* Hapus beberapa catatan sekaligus (semuanya, atau tak satu pun bila ada yang bukan milik Anda).
     Hasilnya jejak untuk Urungkan: [{ catatan, i }] urut posisi semula. */
  function hapusCatatan(data, me, ids) {
    const jejak = [...new Set(ids || [])].map(id => {
      const catatan = milikSaya(data.notes, id, me);
      return { catatan, i: data.notes.indexOf(catatan) };
    }).sort((x, y) => x.i - y.i);
    for (let k = jejak.length - 1; k >= 0; k--) data.notes.splice(jejak[k].i, 1);
    return jejak;
  }
  /* Urungkan hapus: tiap catatan kembali ke posisinya; yang sudah ada lagi dilewati. */
  function pulihkanCatatan(data, me, jejak) {
    let n = 0;
    for (const { catatan, i } of (jejak || []).slice().sort((x, y) => x.i - y.i)) {
      if (!catatan || catatan.user !== me || data.notes.some(x => x.id === catatan.id)) continue;
      data.notes.splice(Math.min(i, data.notes.length), 0, catatan);
      n++;
    }
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

  /* Memindah dan menggandakan baris editor catatan (2.34.0). sisip = indeks tempat baris a..b
     ditaruh di larik semula (0..panjang); hasilnya indeks awal baris itu sesudah dipindah. */
  function pindahBlokKe(blok, a, b, sisip) {
    if (!Array.isArray(blok) || a < 0 || b >= blok.length || a > b) return a;
    const s = Math.max(0, Math.min(blok.length, sisip));
    if (s >= a && s <= b + 1) return a;
    const potong = blok.splice(a, b - a + 1);
    const ke = s > b ? s - potong.length : s;
    blok.splice(ke, 0, ...potong);
    return ke;
  }
  /* Naik (arah -1) atau turun (1) satu baris; -1 bila sudah di ujung. */
  function geserBlok(blok, a, b, arah) {
    if (arah < 0) return a > 0 ? pindahBlokKe(blok, a, b, a - 1) : -1;
    return b < blok.length - 1 ? pindahBlokKe(blok, a, b, b + 2) : -1;
  }
  /* Salinan baris a..b (isi tabel ikut tersalin, bukan berbagi) tepat di bawahnya; hasilnya
     indeks salinan pertama. */
  function duplikatBlok(blok, a, b) {
    const salinan = JSON.parse(JSON.stringify(blok.slice(a, b + 1)));
    blok.splice(b + 1, 0, ...salinan);
    return b + 1;
  }

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
    wajibIzin(me, 'tautanTim.kelola');
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
    wajibIzin(me, 'tautanTim.kelola');
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
  const JENIS_MASTER = ['tim', 'substage', 'platform', 'satuan', 'prioritas', 'capaian', 'kategori', 'izin'];
  const BAWAAN = {
    tim: Object.values(TIM).map(t => ({ kunci: t.kode, nama: t.nama, singkat: t.singkat, aktif: true })),
    substage: SUB_TAHAP.map(s => ({ kunci: s.kode, nama: s.nama, tim: s.tim, reviewManager: s.reviewManager, aktif: true })),
    platform: PLATFORM.map((p, i) => ({ kunci: p, aktif: true, urutan: i + 1 })),
    satuan: SATUAN_PAKET.map((p, i) => ({ kunci: p, aktif: true, urutan: i + 1 })),
    prioritas: PRIORITAS.map(([kunci, label]) => ({ kunci, label, aktif: true })),
    capaian: CAPAIAN.map(c => ({ kunci: c.kode, nama: c.nama, bobot: Math.round(c.bobot * 100), aktif: true })),
    kategori: KATEGORI_PAKET.map(([label, kunci], i) => ({ kunci, label, alur: ALUR_PAKET[label].slice(), aktif: true, urutan: i + 1 })),
    izin: IZIN.filter(x => !x.tetap).map(x => ({ kunci: x.kunci, peran: x.peran.slice(), aktif: true })),
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
        // Yang dihapus (2.24.0) tetap tersimpan sebagai penanda: kodenya tak dipakai ulang.
        const dihapus = x.dihapus === true || /^(ya|true|1)$/i.test(String(x.dihapus == null ? '' : x.dihapus).trim());
        // Pekerjaan rutin tak ditinjau.
        return { kunci: kode, nama, tim, reviewManager: tahapDariKode(kode) !== 'R' && review, aktif: aktif && !dihapus, ...(dihapus ? { dihapus: true } : {}) };
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
        const singkat = teksM(x.singkat).toUpperCase() || SINGKAT_TIM[kunci];
        if (!/^[A-Z0-9]{2,6}$/.test(singkat)) return salah('Singkatan tim 2–6 huruf atau angka, mis. DAE.');
        return { kunci, nama, singkat, aktif: true };
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
      case 'izin': {
        // Izin per peran (2.29.0): hanya yang bisa diatur; urutan peran tetap.
        const iz = IZIN_PER.get(kunci);
        if (!iz || iz.tetap) return salah('Izin tidak dikenal atau tak bisa diatur.');
        const daftar = Array.isArray(x.peran) ? x.peran : String(x.peran || '').split(',');
        return { kunci, peran: PERAN_IZIN.filter(p => daftar.map(teksM).includes(p)), aktif: true };
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
        const bertanda = k.alur.filter(l => l.split(':')[1]);
        const tanda = bertanda.map(l => l.split(':')[1]);
        const urut = tanda.map(t => KODE_CAPAIAN.indexOf(t));
        // Sejak 2.26.0 satu capaian boleh di beberapa langkah (tercapai setelah semuanya selesai);
        // yang tak boleh: mundur, mis. Konten siap sesudah Ter-input.
        const mundur = urut.findIndex((u, i) => i && u < urut[i - 1]);
        if (mundur > 0) {
          return `Alur ${k.label}: capaian tak boleh mundur (${CAPAIAN.map(c => c.nama).join(' → ')}): ${namaCapaian(tanda[mundur])} di ${bertanda[mundur].split(":")[0]} dipasang sesudah ${namaCapaian(tanda[mundur - 1])} di ${bertanda[mundur - 1].split(":")[0]}.`;
        }
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
    // Singkatan dipakai di tab proyek, chip, dan saringan, jadi tak boleh kembar (2.19.0).
    if (jenis === 'tim') return unik('Singkatan tim', x => x.singkat || SINGKAT_TIM[x.kunci]);
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
    if (jenis === 'izin') {
      IZIN_KINI.clear();
      for (const x of daftar) IZIN_KINI.set(x.kunci, x.peran.slice());
    }
    if (jenis === 'tim') for (const t of daftar) Object.assign(TIM[t.kunci], { nama: t.nama, singkat: t.singkat || SINGKAT_TIM[t.kunci] });
    if (jenis === 'substage') {
      SUB_TAHAP.length = 0;
      SUB_PER_KODE.clear();
      for (const s of daftar) {
        const o = { kode: s.kunci, nama: s.nama, tim: s.tim, reviewManager: !!s.reviewManager, tahap: tahapDariKode(s.kunci), aktif: s.aktif, ...(s.dihapus ? { dihapus: true } : {}) };
        // Yang dihapus tak ditawarkan di mana pun, tapi namanya tetap terbaca untuk data lama
        // (mis. data contoh di browser lain atau impor ulang).
        if (!s.dihapus) SUB_TAHAP.push(o);
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
    if (jenis === 'substage') periksaHapusSub(x, lama, baru);
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

  /* ---------- Hapus sub-stage (2.24.0, permintaan user) ----------
     Kode sub-stage adalah identitas: disimpan di task, tertulis di judul task hasil elaborasi,
     Riwayat Aktivitas, komentar, dan pesan. Karena itu:
     - hanya sub-stage yang belum dipakai task mana pun (data contoh dan data real) dan tak ada
       di alur kategori paket yang bisa dihapus; yang sudah dipakai cukup dinonaktifkan;
     - yang dihapus tetap tercatat (penanda dihapus) dan kodenya tak dipakai ulang; kode baru
       melanjutkan dari nomor terbesar yang pernah ada di tahap itu;
     - nomor yang tersisa tak digeser;
     - E12 menutup siklus dan dirujuk langsung oleh aturan, jadi tak bisa dihapus atau
       dinonaktifkan.
     Yang terhapus bisa dipulihkan dengan kode yang sama. */
  const SUB_TERKUNCI = ['E12'];
  const awalanTahap = tahap => (tahap === 'V' ? 'DV' : tahap);
  function kodeSubBerikut(tahap) {
    const awal = awalanTahap(tahap);
    const nomor = daftarMaster('substage').map(s => POLA_KODE_SUB.exec(s.kunci)).filter(m => m && m[1] === awal).map(m => Number(m[2]));
    const n = Math.max(0, ...nomor) + 1;
    return n < 100 ? awal + n : '';
  }
  /* sumber = [{ label, tasks }]: '' kalau kode itu belum dipakai task mana pun. */
  function salahHapusSub(kode, sumber) {
    const pakai = (sumber || []).map(x => [x.label, (x.tasks || []).filter(t => t.sub === kode).length]).filter(([, n]) => n);
    if (!pakai.length) return '';
    return `${kode} dipakai ${pakai.map(([l, n]) => `${n} task${l ? ' di ' + l : ''}`).join(' dan ')}, jadi tak bisa dihapus. Nonaktifkan saja: tak ditawarkan lagi untuk task baru, task lamanya tetap terbaca.`;
  }
  function periksaHapusSub(x, lama, baru) {
    if (lama && lama.dihapus) {
      if (baru) throw new Error(`${x.kunci} pernah ada lalu dihapus. Kode yang dihapus tak dipakai ulang supaya task dan riwayat lama tak berubah arti; pakai ${kodeSubBerikut(tahapDariKode(x.kunci))}.`);
      if (x.dihapus) throw new Error(`${x.kunci} sudah dihapus. Pulihkan dulu kalau ingin mengubahnya.`);
    }
    if (SUB_TERKUNCI.includes(x.kunci) && (x.dihapus || !x.aktif)) {
      throw new Error(`${x.kunci} · Final approval menutup siklus dan dirujuk langsung oleh aturan, jadi tak bisa dihapus atau dinonaktifkan.`);
    }
    if (x.dihapus) {
      const alur = (MASTER_KINI.kategori || []).filter(k => k.alur.some(l => l.split(':')[0] === x.kunci)).map(k => k.label);
      if (alur.length) throw new Error(`${x.kunci} dipakai alur kategori paket ${alur.join(', ')}. Ganti langkah alurnya dulu di bagian Kategori.`);
    }
  }

  /* Pindahkan sub-stage ke kode lain (2.25.0, permintaan user): pengganti "hapus lalu tambah"
     kalau hanya kegiatannya yang ingin dipindah ke kode lain. Nama, tim pemilik, dan review
     Manager pindah ke kode baru (kode yang belum pernah ada); alur kategori paket yang memakai
     kode lama ikut diganti. Kode lama dihapus kalau belum dipakai task (dipakai = jumlah task di
     data yang sedang dipakai), selain itu dinonaktifkan: task lamanya tetap memakai kode lama.
     Mengembalikan baris Master yang harus ditulis, berurutan (kode baru, alur, kode lama), dan
     daftar hidup sudah memakai hasilnya; gagal = daftar hidup dikembalikan ke baris semula. */
  function pindahSub(dari, ke, baris, dipakai) {
    const asal = daftarMaster('substage').find(s => s.kunci === dari && !s.dihapus);
    if (!asal) throw new Error(`Sub-stage ${dari || '(kosong)'} tidak ditemukan.`);
    if (SUB_TERKUNCI.includes(dari)) throw new Error(`${dari} · Final approval menutup siklus dan dirujuk langsung oleh aturan, jadi tak bisa dipindah.`);
    const kode = String(ke == null ? '' : ke).trim().toUpperCase();
    if (!kode) throw new Error('Isi kode tujuan.');
    if (kode === dari) throw new Error(`Pilih kode selain ${dari}.`);
    const ada = daftarMaster('substage').find(s => s.kunci === kode && !s.dihapus);
    if (ada) throw new Error(`${kode} sudah dipakai sub-stage "${ada.nama}". Pilih kode yang belum ada, mis. ${kodeSubBerikut(tahapDariKode(kode))}.`);
    const alurAsal = daftarMaster('kategori').filter(x => x.alur.some(l => l.split(':')[0] === dari)).map(x => x.label);
    if (alurAsal.length && tahapDariKode(kode) === 'R') throw new Error(`${dari} dipakai alur kategori paket ${alurAsal.join(', ')}, jadi kode tujuannya harus sub-stage ADDIE, bukan rutin (R).`);
    const awal = (baris || []).slice();
    let kini = awal;
    const tulis = [];
    const pakai = x => {
      kini = [...kini.filter(r => !(r.jenis === x.jenis && String(r.kunci).toLowerCase() === String(x.kunci).toLowerCase())), x];
      tulis.push(x);
      aturMaster(kini);
    };
    try {
      pakai(periksaMaster('substage', { baru: true, kunci: kode, nama: asal.nama, tim: asal.tim, reviewManager: asal.reviewManager }, kini));
      for (const k of daftarMaster('kategori').filter(x => x.alur.some(l => l.split(':')[0] === dari))) {
        const alur = k.alur.map(l => { const [c, cap] = l.split(':'); return c === dari ? (cap ? `${kode}:${cap}` : kode) : l; });
        pakai(periksaMaster('kategori', { kunci: k.kunci, alur }, kini));
      }
      pakai(periksaMaster('substage', dipakai > 0 ? { kunci: dari, aktif: false } : { kunci: dari, dihapus: true }, kini));
    } catch (err) {
      aturMaster(awal);
      throw err;
    }
    return tulis;
  }
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
  const dataKosong = () => ({ projects: [], tasks: [], packages: [], inisiatif: [], permintaan: [], dashboards: [], links: [], notes: [], setoran: [], nomor: [], log: [] });
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
    duplikatPaket: (d, x, me, w) => duplikatPaket(d, paketX(d, x), x.f || {}, me, w),
    inisiatifBaru: (d, x, me, w) => inisiatifBaru(d, x.f || {}, me, w),
    ubahInisiatif: (d, x, me, w) => ubahInisiatif(d, cariDi(d.inisiatif, x.inisiatif, 'Inisiatif'), x.f || {}, me, w),
    hapusInisiatif: (d, x, me, w) => hapusInisiatif(d, cariDi(d.inisiatif, x.inisiatif, 'Inisiatif'), me, w),
    tempelInisiatif: (d, x, me, w) => tempelInisiatif(d, tugas(d, x), x.inisiatif || '', me, w),
    duplikatProyek: (d, x, me, w, h) => duplikatProyek(d, proyekX(d, x), x.f || {}, me, w, h),
    simpanPaket: (d, x, me, w) => simpanPaket(d, paketX(d, x), x.f || {}, me, w),
    hapusPaket: (d, x, me, w) => hapusPaket(d, paketX(d, x), me, w),
    aturTunggu: (d, x, me, w) => aturTunggu(d, tugas(d, x), x, me, w),
    hapusProyek: (d, x, me, w) => hapusProyek(d, proyekX(d, x), me, w),
    ubahProyek: (d, x, me, w) => ubahProyek(d, proyekX(d, x), x.f || {}, me, w),
    hapusTask: (d, x, me, w) => hapusTask(d, x.tasks || x.task, me, w),
    ubahNamaPaket: (d, x, me, w) => ubahNamaPaket(d, paketX(d, x), x.nama, me, w),
    elaborasiPaket: (d, x, me, w, h) => elaborasiPaket(d, paketX(d, x), x.f || {}, me, w, h),
    simpanDashboard: (d, x, me, w) => simpanDashboard(d, me, x.f || {}, x.id || '', w),
    hapusDashboard: (d, x, me, w) => hapusDashboard(d, me, x.id, w),
    // Permintaan lanjutan (2.36.0).
    mintaLanjutan: (d, x, me, w, h) => mintaLanjutan(d, tugas(d, x), x.f || {}, me, w, h),
    terimaPermintaan: (d, x, me, w, h) => terimaPermintaan(d, cariDi(d.permintaan, x.permintaan, 'Permintaan'), x.f || {}, me, w, h),
    tolakPermintaan: (d, x, me, w) => tolakPermintaan(d, cariDi(d.permintaan, x.permintaan, 'Permintaan'), x.alasan, me, w),
    batalkanPermintaan: (d, x, me, w) => batalkanPermintaan(d, cariDi(d.permintaan, x.permintaan, 'Permintaan'), me, w),
    alihkanPermintaan: (d, x, me, w) => alihkanPermintaan(d, cariDi(d.permintaan, x.permintaan, 'Permintaan'), x.ke, me, w),
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
  const KOLEKSI_REAL = ['projects', 'tasks', 'packages', 'inisiatif', 'permintaan', 'setoran', 'dashboards', 'nomor'];
  const DEPAN = new Set(['projects', 'tasks', 'packages', 'inisiatif', 'permintaan']);
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
    selesai, aktif, indeks, depsBelum, duplikatPaket, duplikatProyek, waktuKumpul,
    TIM_INISIATIF, STATUS_INISIATIF, bolehLihatInisiatif, bolehKelolaInisiatif, cariInisiatif, inisiatifBaru, ubahInisiatif, hapusInisiatif, tempelInisiatif, ringkasInisiatif, terhambat, ditandaiTertahan, telat, peninjau, bolehUbah, picBoleh, bolehBuatTask, subBolehBagi, bolehUbahTask, alasanTunggu,
    anakTask, bolehBuatAnak, alasanTakBisaBagi, picTurunan, pilihanPicUbah, taskAnak, tambahSubtask, ubahSubtask, hapusSubtask, tungguTahap,
    aksiUntuk, terapkanAksi, aksiPindah, catatLog, taskBaru, proyekBaru,
    TIM, SUB_TAHAP, subTahap, leadSub, namaSub, timOrang, timTask, jenisJalur, tahapDariKode, picSah,
    syaratAjukan, labelKeadaan, isiOutput, tambahBukti, hapusBukti, ubahTask, timProyek,
    namaTahap, SINGKAT_TAHAP, singkatTahap, tahapBerikut, ringkasProyek, antreKeputusan, tahapDihitung, segarkanTahap, siklusTutup, mulaiSiklus,
    KEPUTUSAN, setKeputusan, setArsip,
    pekerjaanSaya, perhatian, lingkupBoleh, lingkupAwal, lingkupSah, lingkupOrang, lingkupTask, lingkupKom, sorotProyek,
    angkaKerja, jumlahAngka, judulPembaruan, linimasaInisiatif, tanggapanPembaruan, belumDitanggapi,
    STATUS_MINTA, leadDari, peninjauMinta, bolehMinta, bolehJawabMinta, bolehAlihkanMinta, bolehBatalMinta, mintaLanjutan, terimaPermintaan, tolakPermintaan,
    batalkanPermintaan, alihkanPermintaan, permintaanDari, asalPermintaan, permintaanMasuk, hariKerja, umurMinta, mintaLama, BATAS_MINTA, kolomPapan, bebanOrang, laporan, cari,
    PERIODE, rentang, laporanPeriode, daftarTask, rentangTask, gridBulan, geserBulan,
    terlibat, notifikasi, JENIS_LOG, saringLog,
    JENIS_PERISTIWA, REAKSI, BATAS_PESAN, ruangTask, ruangProyek, ruangTim, bacaRuang, anggotaTim, bolehRuang, ruangTimSaya,
    periksaPeristiwa, susunObrolan, sebutan, menyebut, tanyaTerbuka, aktivitasTask, daftarUtas,
    PAKET_IDENTITAS, PAKET_PRODUK, KATEGORI_PAKET, SATUAN_PAKET, hitungTarget, ringkasPaket, bolehUbahPaket, paketBaru, simpanPaket, hapusPaket,
    setoranPaket, sisaTerbuka, elaborasiPaket, bolehSetor, setorkan, hapusSetoran, tautkanPaket,
    CAPAIAN, namaCapaian, batchSetoran, ALUR_PAKET, langkahAlur, proyekPengisi, paketProyek,
    FOLDER_UMUM, tautanRapi, judulTautan, kartuTautan, pesanCepatUntuk, kelompokFolder, simpanLink, simpanCatatan, tandaiLink, sematkanCatatan, hapusMilik, gantiNamaFolder, hapusFolder,
    WARNA_CATATAN, warnaiCatatan, pindahFolderCatatan, hapusCatatan, pulihkanCatatan, hitungChecklist, centangBaris, teksBarisCatatan, tandaiBarisTask,
    JENIS_BLOK, blokCatatan, teksBlok, teksBlokDanBaris, nomorDaftar, pindahBlokKe, geserBlok, duplikatBlok,
    FOTO_MAKS, fotoSah, periksaFoto,
    AKSEN, AKSEN_BAWAAN, LATAR, KUAT_LATAR, PADAT, HURUF, HALAMAN_AWAL, BAHASA_TAMPILAN, STATUS_SIAP, EMOJI_STATUS, STATUS_TEKS_MAKS, SAMPUL_MAKS, sampulSah,
    tampilanBawaan, periksaTampilan, statusAktif, tokenAksen, kontras,
    IKON_DASHBOARD, simpanDashboard, hapusDashboard,
    centangSubtask, dataKosong, AKSI_DATA, jalankanPerintah, periksaPerintah, ringkasHasil, KOLEKSI_REAL, bedaData, terapkanUbah,
    KODE_AI, AKSI_AGEN, PESAN_AGEN, PERAN_IZIN, IZIN, izin, izinPeran,
    ULANG_AGENDA, PENGINGAT_AGENDA, periksaAgenda, adaPadaTanggal, kejadianAgenda, waktuPengingat, periksaEmail,
    JAWABAN_ACARA, KAIT_ACARA, PESERTA_MAKS, acaraBersama, pemilikAgenda, ikutAcara, bolehLihatAgenda, jawabanAcara, rekapJawaban, pengingatUntuk,
    kejadianBerikut, bentrokAcara, periksaPeserta, gabungAcara, jawabAcara, ubahNotulen, tandaiTindak, notifAcara,
    tautanGoogle, icsAgenda, teksKalender, wajibIzin, tolakIzin,
    platformPaket, rapikanPlatform, jadwalDaftar, daftarBeririsan, ubahNamaPaket,
    SINGKAT_TIM, singkatTim, labelTim, TIM_PROYEK, tugasSiklus, timJalur, ditunggu, tungguBelum, masihMenahan, putaranTunggu, tungguSingkat, faseTim, gerbangProyek, putaranProyek,
    bolehAturTunggu, aturTunggu, ringkasHapusProyek, hapusProyek, ubahProyek, tabAwalProyek, SUB_TERKUNCI, kodeSubBerikut, salahHapusSub, pindahSub, bolehHapusTask, ringkasHapusTask, hapusTask, MAKS_HAPUS_TASK,
  };
}));
