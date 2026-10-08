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
     R1–R4). Kodenya menentukan tahap ADDIE, tim pemilik, dan peninjaunya.
   - Jalur PROYEK: task-nya ditinjau sebelum selesai (staff oleh Lead-nya, Lead oleh
     Manager; sub-stage bertanda Manager selalu oleh Manager), dan baru bisa diajukan
     bila syaratnya lengkap: output, tautan bukti, sub-task, dependency. Jalur RUTIN
     (R1–R4, di luar proyek) tanpa tinjauan.
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

  /* Organogram Divisi Produk (sama dengan PRD). */
  const ORANG = [
    { id: 'nynda', nama: 'Nynda Ramadhanti', pendek: 'Nynda', peran: 'manager', jabatan: 'Manager Produk', lead: null },
    { id: 'ali', nama: 'Ali', pendek: 'Ali', peran: 'lead', jabatan: 'Sistem & Analisis', lead: 'nynda' },
    { id: 'andika', nama: 'Andika', pendek: 'Andika', peran: 'lead', jabatan: 'Riset & Akademik', lead: 'nynda' },
    { id: 'alya', nama: 'Alya', pendek: 'Alya', peran: 'lead', jabatan: 'Learning Architecture', lead: 'nynda' },
    { id: 'dhea', nama: 'Dhea', pendek: 'Dhea', peran: 'lead', jabatan: 'Content & Learning Operations', lead: 'nynda' },
    { id: 'uma', nama: 'Uma', pendek: 'Uma', peran: 'staff', jabatan: 'Akademik · Rumpun Uma', lead: 'andika' },
    { id: 'tri', nama: 'Tri', pendek: 'Tri', peran: 'staff', jabatan: 'Akademik · Rumpun Tri', lead: 'andika' },
    { id: 'wildan', nama: 'Wildan', pendek: 'Wildan', peran: 'staff', jabatan: 'Akademik · Rumpun Wildan', lead: 'andika' },
    { id: 'kiki', nama: 'Kiki', pendek: 'Kiki', peran: 'staff', jabatan: 'Input & QC Output', lead: 'alya' },
    { id: 'bilar', nama: 'Bilar', pendek: 'Bilar', peran: 'staff', jabatan: 'Liveclass', lead: 'alya' },
    { id: 'nadya', nama: 'Nadya', pendek: 'Nadya', peran: 'staff', jabatan: 'Guru', lead: 'dhea' },
    { id: 'bagas', nama: 'Bagas', pendek: 'Bagas', peran: 'staff', jabatan: 'Kreatif', lead: 'dhea' },
  ];
  const ORANG_PER_ID = new Map(ORANG.map(o => [o.id, o]));

  /* Nama dari v1 yang tak ada di organogram (mis. Arifah) tetap tampil, sebagai
     staff tanpa tim. Tinjauannya jatuh ke Manager. */
  function orang(id) {
    const o = ORANG_PER_ID.get(id);
    if (o) return o;
    const nama = String(id || '').trim() || '—';
    return { id, nama, pendek: nama, peran: 'staff', jabatan: 'Di luar organogram', lead: null, luar: true };
  }
  const timDari = leadId => ORANG.filter(o => o.lead === leadId && o.peran === 'staff').map(o => o.id);
  const inisial = id => orang(id).pendek.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || '?';

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
  ].map(([kode, nama, tim, manager]) => ({ kode, nama, tim, reviewManager: !!manager, tahap: tahapDariKode(kode) }));
  const SUB_PER_KODE = new Map(SUB_TAHAP.map(s => [s.kode, s]));
  const subTahap = kode => SUB_PER_KODE.get(kode) || null;
  /* Lead yang mendelegasikan task di sub-stage itu (tim pemiliknya). */
  const leadSub = kode => { const s = subTahap(kode); return s && TIM[s.tim] ? TIM[s.tim].lead : ''; };
  const namaSub = kode => { const s = subTahap(kode); return s ? `${s.kode} · ${s.nama}` : ''; };

  /* Rumpun platform: pengelompokan untuk saringan & laporan, tanpa pemilik (PRD). */
  const RUMPUN = [
    ['Kedinasan & TNI/Polri', ['Sekdin', 'Polisi', 'Prajurit']],
    ['ASN & Pendidikan', ['ASN', 'PPPK', 'PPG', 'TPA']],
    ['BUMN & Keuangan', ['BUMN', 'OJK', 'PCPM', 'Psikotes Kerja']],
    ['Bahasa & Beasiswa', ['TOEFL', 'Beasiswa']],
    ['Lainnya', ['Cerebrum', 'All Platform']],
  ];
  const rumpunDari = platform => (RUMPUN.find(([, daftar]) => daftar.includes(platform)) || ['Lainnya'])[0];

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
  const depsBelum = (t, perId) => (t.deps || []).map(id => perId.get(id)).filter(d => d && !selesai(d));
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

  const potong = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1).trimEnd() + '…' : String(s));

  /* Alasan task belum bisa jalan, dalam kalimat untuk layar. */
  function alasanTunggu(t, perId) {
    if (t.tertahan) return 'Tertahan: ' + (t.alasanTertahan || 'tanpa alasan');
    const d = depsBelum(t, perId);
    if (d.length) return 'Menunggu ' + d.map(x => `${x.id} "${potong(x.title, 48)}" (${orang(x.pic).pendek})`).join(', ');
    if (t.status === 'Ditinjau') return 'Menunggu tinjauan ' + orang(peninjau(t) || MANAGER).pendek;
    return '';
  }

  /* Syarat sebelum output task proyek diajukan ke gate (PRD): output terisi, ada tautan
     bukti, semua sub-task beres, task yang ditunggu selesai, dan tidak tertahan. */
  function syaratAjukan(t, perId) {
    return [
      { kunci: 'output', label: 'Output terisi', ok: !!String(t.output || '').trim() },
      { kunci: 'bukti', label: 'Minimal satu tautan bukti', ok: (t.evidence || []).some(e => /^https?:\/\//i.test(String(e.url || ''))) },
      { kunci: 'sub', label: 'Semua sub-task selesai', ok: (t.subtasks || []).every(s => s.done) },
      { kunci: 'deps', label: 'Task yang ditunggu sudah selesai', ok: depsBelum(t, perId).length === 0 },
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
    if (selesai(t)) return bolehUbah(t, me) ? [{ kunci: 'buka', label: 'Buka kembali' }] : [];
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
    if (!p && s && s.tahap !== 'R') throw new Error('Task di luar proyek memakai sub-stage rutin (R1–R4).');
    if (!bolehBuatTask(me)) throw new Error('Pilih profil dulu.');
    if (orang(me).peran === 'staff') {
      if (f.pic !== me) throw new Error('Staff menambah task untuk dirinya sendiri. Penyerahan ke orang lain lewat Lead.');
      if (s && !subBolehBagi(me, s.kode)) throw new Error(`${s.kode} dipegang tim lain atau direview Manager. Staff memakai sub-stage milik timnya sendiri.`);
    }
    if (!picSah(me, f.pic, f.sub)) throw new Error('PIC itu di luar tim Anda, dan bukan Lead tim pemilik sub-stage ini.');
    const t = {
      id: 'PRD-' + String(nomorBerikut(data.tasks, 'PRD')).padStart(3, '0'),
      project: p ? p.id : '', lane: p ? 'proyek' : 'rutin', kategori: p ? '' : (s ? s.nama : f.kategori || 'Umum'),
      title: String(f.title).trim(), platform: f.platform || (p ? p.platform : 'All Platform'),
      stage: p ? s.tahap : '', sub: s ? s.kode : '', detail: String(f.detail || '').trim(),
      pic: f.pic, support: (f.support || []).filter(x => x !== f.pic), priority: f.priority || 'Normal',
      start: hariIni, due: f.due || '', status: 'Antre', tertahan: false, alasanTertahan: '',
      output: String(f.output || '').trim(), deps: (f.deps || []).slice(), notes: '', assignedBy: me, cycle: p ? p.cycle || 1 : 1,
      createdAt: waktu, updatedAt: waktu, selesaiAt: 0,
      subtasks: [], comments: [], tinjauan: [], evidence: [],
    };
    data.tasks.unshift(t);
    catatLog(data, 'create', `${t.id} · ${t.title}`, `Dibuat untuk ${orang(t.pic).pendek}${s ? ' · ' + s.kode : ''}`, me, waktu);
    return t;
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
    if (t.lane !== 'proyek' && s && s.tahap !== 'R' && kode !== t.sub) throw new Error('Task di luar proyek memakai sub-stage rutin (R1–R4).');
    const pic = teks(ambil('pic', t.pic));
    if (pic !== t.pic && !picSah(me, pic, kode)) throw new Error('PIC itu di luar tim Anda, dan bukan Lead tim pemilik sub-stage ini.');
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

  /* Siklus ditutup oleh task E12 · Final approval yang sudah disetujui. */
  const siklusTutup = (data, p) => tugasSiklus(data, p).some(t => t.sub === 'E12' && selesai(t));

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
    /* Antrean tim (PRD): langkah yang sudah siap dan diserahkan ke Lead tim pemilik
       sub-stage-nya, menunggu didelegasikan ke staff. */
    const antrean = orang(me).peran === 'lead' && timDari(me).length
      ? milik.filter(t => t.lane === 'proyek' && t.status === 'Antre' && !tunggu.includes(t) && leadSub(t.sub) === me) : [];
    const jalan = milik.filter(t => !tunggu.includes(t) && !antrean.includes(t));
    const batasMinggu = tambahHari(hariIni, 7);

    const grup = [
      ['tinjau', 'Perlu Anda tinjau', data.tasks.filter(t => t.status === 'Ditinjau' && peninjau(t) === me).map(t => mau(t, 'Dari ' + orang(t.pic).pendek))],
      ['antrean', 'Antrean tim · siap didelegasikan', antrean.map(t => mau(t, `${namaSub(t.sub)} siap. Serahkan ke staff dari detail task, atau kerjakan sendiri.`))],
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
      && (!f.rumpun || rumpunDari(t.platform) === f.rumpun)
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
    const ditahanOleh = id => data.tasks.filter(t => aktif(t) && depsBelum(t, perId).some(d => d.pic === id)).length;
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
      perRumpun: RUMPUN.map(([nama]) => ({ nama, jumlah: aktifSemua.filter(t => rumpunDari(t.platform) === nama).length })),
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

  /* ---------- Komunikasi ---------- */

  function terlibat(t, me) {
    return t.pic === me || (t.support || []).includes(me) || t.assignedBy === me || peninjau(t) === me
      || (t.comments || []).some(k => k.author === me);
  }
  /* Komentar orang lain yang lebih baru dari `sejak` (milidetik). */
  const belumDibaca = (t, me, sejak) => (t.comments || []).filter(k => k.author !== me && (Number(k.at) || 0) > sejak).length;

  /* Lingkup Komunikasi mengikuti peran: "terlibat" untuk semua, "tim" Lead & Manager, "semua" Manager. */
  const lingkupKom = (me, lingkup) => { const l = lingkupSah(me, lingkup); return l === 'saya' ? 'terlibat' : l; };
  /* Utas diskusi: task yang punya komentar (atau cocok dengan pencarian), yang belum
     dibaca di atas, lalu yang komentarnya paling baru. sejak(t) → batas baca task itu. */
  function utasDiskusi(data, me, lingkup, sejak, q) {
    const kata = String(q || '').trim().toLowerCase();
    const l = lingkup === 'terlibat' ? 'terlibat' : lingkupKom(me, lingkup);
    const ids = l === 'tim' ? lingkupOrang(me, 'tim') : null;
    const namaProyek = new Map(data.projects.map(p => [p.id, p.name]));
    return data.tasks
      .filter(t => (kata ? [t.id, t.title, orang(t.pic).nama, namaProyek.get(t.project) || ''].join(' ').toLowerCase().includes(kata) : t.comments.length > 0))
      .filter(t => (l === 'terlibat' ? terlibat(t, me) : l === 'tim' ? ids.includes(t.pic) : true))
      .map(t => ({ t, baru: belumDibaca(t, me, sejak(t)), terakhir: t.comments.reduce((a, k) => (!a || k.at > a.at ? k : a), null) }))
      .sort((a, b) => (b.baru > 0) - (a.baru > 0) || (b.terakhir ? b.terakhir.at : 0) - (a.terakhir ? a.terakhir.at : 0));
  }

  /* ---------- Notifikasi ----------
     Yang menyangkut `me`, dibaca dari jejak yang sudah ada di data (log, tinjauan, komentar,
     status task); tak ada tabel notifikasi tersendiri.
       baru      task dibuat orang lain untuk saya          siap     task yang ditunggu sudah selesai
       serah     task diserahkan ke saya (delegasi)         tinjau   task diajukan, menunggu tinjauan saya
       kembali   task saya dikembalikan peninjau            setuju   task saya disetujui
       komentar  komentar baru di task yang melibatkan saya siklus   (Manager) siklus proyek ditutup E12
       tambah    (Lead) staff saya menambah task untuk dirinya sendiri
     Terbaru di atas. Penanda dibaca/belum disimpan di app.js, per profil. */
  function notifikasi(data, me, batas = 60) {
    const perId = indeks(data);
    const pendek = orang(me).pendek.toLowerCase();
    const out = [];
    const tambah = (jenis, t, at, oleh, isi = '') => { if (at) out.push({ id: `${jenis}-${t.id}-${at}`, jenis, task: t.id, at, oleh, teks: isi }); };
    for (const t of data.tasks) {
      if (t.pic === me && t.status === 'Antre' && (t.deps || []).length) {
        const ditunggu = t.deps.map(id => perId.get(id)).filter(Boolean);
        if (ditunggu.length && ditunggu.every(selesai)) tambah('siap', t, Math.max(...ditunggu.map(d => d.selesaiAt || 0)), '');
      }
      for (const r of t.tinjauan || []) {
        if (r.by === me) continue;
        if (r.action === 'Diajukan' && t.status === 'Ditinjau' && peninjau(t) === me) tambah('tinjau', t, r.at, r.by);
        if (t.pic === me && r.action === 'Dikembalikan') tambah('kembali', t, r.at, r.by, r.note);
        if (t.pic === me && r.action === 'Disetujui') tambah('setuju', t, r.at, r.by);
      }
      if (terlibat(t, me)) for (const k of t.comments || []) if (k.author !== me) tambah('komentar', t, k.at, k.author, k.text);
    }
    // Task baru dan delegasi hanya tercatat di log: "Dibuat untuk Kiki · E4", "Diubah: diserahkan ke Kiki".
    for (const l of data.log) {
      if (l.by === me) continue;
      const t = perId.get(String(l.task).split(' ')[0]);
      if (!t) continue;
      // Lead diberi tahu saat staff-nya menambah task untuk dirinya sendiri.
      if (l.type === 'create' && t.pic === l.by && orang(l.by).peran === 'staff' && orang(l.by).lead === me) { tambah('tambah', t, l.at, l.by); continue; }
      if (t.pic !== me) continue;
      const d = String(l.detail || '');
      const dibuat = /^Dibuat untuk (.+?)(?: · |$)/.exec(d);
      const serah = /(?:diserahkan|didelegasikan) ke ([^,.;]+)/i.exec(d);
      if (l.type === 'create' && dibuat && dibuat[1].trim().toLowerCase() === pendek) tambah('baru', t, l.at, l.by);
      else if (serah && serah[1].trim().toLowerCase() === pendek) tambah('serah', t, l.at, l.by);
    }
    if (orang(me).peran === 'manager') {
      for (const p of data.projects) {
        if (p.arsip || p.decision === 'Hold' || !siklusTutup(data, p)) continue;
        const e12 = tugasSiklus(data, p).filter(t => t.sub === 'E12' && selesai(t)).sort((a, b) => b.selesaiAt - a.selesaiAt)[0];
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
      platform: f.platform || '', marselPic: '', program: String(f.program || '').trim(), namaPaket: String(f.namaPaket).trim(),
      tagline: '', benefit: '', tanggal: '', tujuan: '', produkPic: f.produkPic || '',
      dibimbing: '', latsol: '', materi: '', tryout: '', drilling: '', liveClass: '', catatan: '',
      updatedBy: me, updatedAt: waktu, mirror: false, items: [], links: [],
    };
    data.packages.unshift(p);
    catatLog(data, 'create', `${p.id} · ${p.namaPaket}`, 'Rancangan paket dibuat', me, waktu);
    return p;
  }

  const angkaPositif = v => { const n = Number(String(v == null ? '' : v).replace(',', '.')); return Number.isFinite(n) && n > 0 ? n : 0; };
  const teks = v => String(v == null ? '' : v).trim();

  /* Simpan suntingan rancangan paket: identitas, teks per kategori, target, tautan.
     Membagikan (mirror) hanya boleh Lead/Manager, seperti di v1. */
  function simpanPaket(data, p, f, me, waktu) {
    if (!bolehUbahPaket(p, me)) throw new Error('Anda tidak bisa menyunting paket ini.');
    const namaPaket = teks(f.namaPaket);
    if (!namaPaket) throw new Error('Nama paket wajib diisi.');
    const mirror = f.mirror === undefined ? !!p.mirror : !!f.mirror;
    if (mirror !== !!p.mirror && !['manager', 'lead'].includes(orang(me).peran)) throw new Error('Hanya Lead atau Manager yang bisa membagikan paket.');
    const kategori = new Set(KATEGORI_PAKET.map(([l]) => l));
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
    Object.assign(p, { platform: teks(f.platform), program: teks(f.program), namaPaket, produkPic: teks(f.produkPic), items, links, mirror, updatedBy: me, updatedAt: waktu });
    for (const [kunci] of PAKET_PRODUK) p[kunci] = String(f[kunci] == null ? '' : f[kunci]).replace(/\s+$/, '');
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

    if (!proj) {
      const judul = p.namaPaket || p.program || p.id;
      proj = {
        id: 'PRJ-' + nomorBerikut(data.projects, 'PRJ'), name: teks(f.name) || `Produksi ${judul}`, platform: p.platform || 'All Platform',
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
          priority: 'Normal', platform: p.platform || proj.platform, deps: sebelumnya ? [sebelumnya] : [],
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

  return {
    MANAGER, KAPASITAS, STATUS, TAHAP, PERAN, ORANG,
    orang, timDari, inisial, isoHari, selisihHari, tambahHari,
    selesai, aktif, indeks, depsBelum, terhambat, ditandaiTertahan, telat, peninjau, bolehUbah, picBoleh, bolehBuatTask, subBolehBagi, bolehUbahTask, alasanTunggu,
    aksiUntuk, terapkanAksi, aksiPindah, catatLog, taskBaru, proyekBaru,
    TIM, SUB_TAHAP, subTahap, leadSub, namaSub, timOrang, timTask, jenisJalur, tahapDariKode, RUMPUN, rumpunDari, picSah,
    syaratAjukan, labelKeadaan, isiOutput, tambahBukti, hapusBukti, ubahTask, timProyek,
    namaTahap, tahapBerikut, ringkasProyek, antreKeputusan, tahapDihitung, segarkanTahap, siklusTutup, mulaiSiklus,
    KEPUTUSAN, setKeputusan, setArsip,
    pekerjaanSaya, perhatian, lingkupBoleh, lingkupAwal, lingkupSah, lingkupOrang, lingkupKom, kolomPapan, bebanOrang, laporan, cari,
    PERIODE, rentang, laporanPeriode, daftarTask, rentangTask, gridBulan, geserBulan,
    terlibat, belumDibaca, utasDiskusi, notifikasi, JENIS_LOG, saringLog,
    PAKET_IDENTITAS, PAKET_PRODUK, KATEGORI_PAKET, SATUAN_PAKET, hitungTarget, ringkasPaket, bolehUbahPaket, paketBaru, simpanPaket, hapusPaket,
    setoranPaket, sisaTerbuka, elaborasiPaket, bolehSetor, setorkan, hapusSetoran, tautkanPaket,
    CAPAIAN, namaCapaian, batchSetoran, ALUR_PAKET, langkahAlur, proyekPengisi, paketProyek,
    FOLDER_UMUM, tautanRapi, judulTautan, kelompokFolder, simpanLink, simpanCatatan, tandaiLink, sematkanCatatan, hapusMilik, gantiNamaFolder, hapusFolder,
    IKON_DASHBOARD, simpanDashboard, hapusDashboard,
  };
}));
