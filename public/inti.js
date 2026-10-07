/* =============================================================================
   inti.js — aturan alur ProductTrack v2, tanpa tampilan.

   Dipakai dua tempat: app.js di browser (window.Inti) dan tes di Node
   (require). Semua aturan yang menentukan apa yang boleh terjadi ada di sini,
   supaya tampilan tak bisa menyimpang dari tes.

   Alur yang dijalankan:
   - Task punya empat status: Antre → Dikerjakan → Ditinjau → Selesai.
     "Tertahan" adalah tanda, bukan status: task tetap di statusnya, dengan alasan.
   - Ada dua jalur. Jalur PROYEK punya tahap ADDIE; task-nya ditinjau sebelum
     selesai (task staff oleh Lead-nya, task Lead oleh Manager). Jalur RUTIN
     (pekerjaan di luar proyek) tanpa tahap dan tanpa tinjauan: PIC langsung
     menandai selesai.
   - Gate hanya di level proyek: Manager memajukan proyek ke tahap berikutnya
     setelah semua task di tahap itu selesai. Dari Evaluation kembali ke
     Analysis dengan siklus baru.
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
     dari v1) diputuskan Manager. */
  function peninjau(t) {
    if (t.lane !== 'proyek') return t.status === 'Ditinjau' ? MANAGER : null;
    const o = orang(t.pic);
    if (o.peran === 'manager') return null;
    if (o.peran === 'lead') return MANAGER;
    return o.lead || MANAGER;
  }

  function bolehUbah(t, me) {
    const r = orang(me).peran;
    if (r === 'manager' || t.pic === me) return true;
    if (r === 'lead') return orang(t.pic).lead === me || t.assignedBy === me;
    return false;
  }

  /* PIC yang boleh dipilih saat membuat atau mengubah task. */
  function picBoleh(me) {
    const r = orang(me).peran;
    if (r === 'manager') return ORANG.map(o => o.id);
    if (r === 'lead') return [me, ...timDari(me)];
    return [];
  }
  const bolehBuatTask = me => orang(me).peran !== 'staff';

  const potong = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1).trimEnd() + '…' : String(s));

  /* Alasan task belum bisa jalan, dalam kalimat untuk layar. */
  function alasanTunggu(t, perId) {
    if (t.tertahan) return 'Tertahan: ' + (t.alasanTertahan || 'tanpa alasan');
    const d = depsBelum(t, perId);
    if (d.length) return 'Menunggu ' + d.map(x => `${x.id} "${potong(x.title, 48)}" (${orang(x.pic).pendek})`).join(', ');
    if (t.status === 'Ditinjau') return 'Menunggu tinjauan ' + orang(peninjau(t) || MANAGER).pendek;
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
      const alasan = t.tertahan ? 'Lepas tanda tertahan dulu' : '';
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

  function taskBaru(data, f, me, waktu, hariIni) {
    const p = f.project ? data.projects.find(x => x.id === f.project) : null;
    if (f.project && !p) throw new Error('Proyek tidak ditemukan.');
    if (!String(f.title || '').trim()) throw new Error('Judul task wajib diisi.');
    if (!picBoleh(me).includes(f.pic)) throw new Error('PIC itu di luar tim Anda.');
    const t = {
      id: 'PRD-' + String(nomorBerikut(data.tasks, 'PRD')).padStart(3, '0'),
      project: p ? p.id : '', lane: p ? 'proyek' : 'rutin', kategori: p ? '' : (f.kategori || 'Umum'),
      title: String(f.title).trim(), platform: f.platform || (p ? p.platform : 'All Platform'),
      stage: p ? (f.stage || p.stage) : '', sub: '', detail: String(f.detail || '').trim(),
      pic: f.pic, support: (f.support || []).filter(x => x !== f.pic), priority: f.priority || 'Normal',
      start: hariIni, due: f.due || '', status: 'Antre', tertahan: false, alasanTertahan: '',
      output: String(f.output || '').trim(), deps: [], notes: '', assignedBy: me, cycle: p ? p.cycle || 1 : 1,
      createdAt: waktu, updatedAt: waktu, selesaiAt: 0,
      subtasks: [], comments: [], tinjauan: [], evidence: [],
    };
    data.tasks.unshift(t);
    catatLog(data, 'create', `${t.id} · ${t.title}`, `Dibuat untuk ${orang(t.pic).pendek}`, me, waktu);
    return t;
  }

  function proyekBaru(data, f, me, waktu) {
    if (orang(me).peran !== 'manager') throw new Error('Hanya Manager yang membuat proyek.');
    if (!String(f.name || '').trim()) throw new Error('Nama proyek wajib diisi.');
    const p = {
      id: 'PRJ-' + nomorBerikut(data.projects, 'PRJ'), name: String(f.name).trim(), platform: f.platform || 'All Platform',
      stage: 'A', cycle: 1, decision: 'Build', goal: String(f.goal || '').trim(), lead: f.lead || MANAGER, arsip: false, paket: '', history: [],
    };
    data.projects.unshift(p);
    catatLog(data, 'create', `${p.id} · ${p.name}`, 'Proyek dibuat di tahap Analysis', me, waktu);
    return p;
  }

  /* ---------- Proyek & gate ---------- */

  const namaTahap = id => (TAHAP.find(x => x.id === id) || { nama: '—' }).nama;
  const tahapBerikut = id => ({ A: 'D', D: 'V', V: 'I', I: 'E', E: 'A' })[id] || 'A';

  function ringkasProyek(data, p, hariIni, perId = indeks(data)) {
    const milik = data.tasks.filter(t => t.project === p.id);
    const kini = milik.filter(t => t.stage === p.stage && (t.cycle || 1) === (p.cycle || 1));
    const nSelesai = kini.filter(selesai).length;
    const nTelat = kini.filter(t => telat(t, hariIni)).length;
    const nTertahan = kini.filter(ditandaiTertahan).length;
    const ditahan = p.decision === 'Hold';
    const siapMaju = !p.arsip && !ditahan && kini.length > 0 && nSelesai === kini.length;
    const keadaan = p.arsip ? 'arsip' : ditahan ? 'ditahan' : siapMaju ? 'tunggu' : !kini.length ? 'kosong' : (nTelat || nTertahan) ? 'risiko' : 'aman';
    const tenggat = milik.filter(aktif).map(t => t.due).filter(Boolean).sort().pop() || '';
    return {
      total: kini.length, selesai: nSelesai, telat: nTelat, tertahan: nTertahan, siapMaju, keadaan, tenggat,
      semua: milik.length, semuaSelesai: milik.filter(selesai).length,
    };
  }

  const antreKeputusan = (data, hariIni) => {
    const perId = indeks(data);
    return data.projects.filter(p => ringkasProyek(data, p, hariIni, perId).siapMaju);
  };

  function majukan(data, p, me, waktu, hariIni) {
    if (orang(me).peran !== 'manager') throw new Error('Hanya Manager yang memajukan tahap proyek.');
    if (!ringkasProyek(data, p, hariIni).siapMaju) throw new Error('Masih ada task di tahap ini yang belum selesai.');
    const dari = p.stage;
    p.stage = tahapBerikut(dari);
    if (dari === 'E') p.cycle = (p.cycle || 1) + 1;
    p.history = p.history || [];
    p.history.unshift({ dari, ke: p.stage, siklus: p.cycle, oleh: me, at: waktu });
    catatLog(data, 'gate', `${p.id} · ${p.name}`, `Maju dari ${namaTahap(dari)} ke ${namaTahap(p.stage)}` + (dari === 'E' ? ` (siklus ${p.cycle})` : ''), me, waktu);
  }

  function setKeputusan(data, p, keputusan, me, waktu) {
    if (orang(me).peran !== 'manager') throw new Error('Hanya Manager yang memutuskan.');
    p.decision = keputusan;
    catatLog(data, 'gate', `${p.id} · ${p.name}`, keputusan === 'Hold' ? 'Proyek ditahan' : 'Proyek dilanjutkan', me, waktu);
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
    const jalan = milik.filter(t => !tunggu.includes(t));
    const batasMinggu = tambahHari(hariIni, 7);

    const grup = [
      ['tinjau', 'Perlu Anda tinjau', data.tasks.filter(t => t.status === 'Ditinjau' && peninjau(t) === me).map(t => mau(t, 'Dari ' + orang(t.pic).pendek))],
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

  function lingkupOrang(me, lingkup) {
    const o = orang(me);
    if (lingkup === 'saya') return [me];
    if (lingkup === 'semua') return null;
    if (o.peran === 'manager') return null;
    const lead = o.peran === 'lead' ? me : o.lead;
    return lead ? [lead, ...timDari(lead)] : [me];
  }

  function saring(data, f, hariIni, perId) {
    return data.tasks.filter(t => (!f.orang || f.orang.includes(t.pic))
      && (!f.proyek || t.project === f.proyek)
      && (!f.jalur || t.lane === f.jalur)
      && (!f.platform || t.platform === f.platform)
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
      mingguan,
      perOrang: (ids ? ids.map(orang) : ORANG).map(o => ({
        id: o.id,
        aktif: aktifSemua.filter(t => t.pic === o.id).length,
        telat: aktifSemua.filter(t => t.pic === o.id && telat(t, hariIni) && !t.tertahan).length,
        selesai30: tasks.filter(t => t.pic === o.id && dalam30(t)).length,
      })),
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
    const kata = String(f.q || '').trim().toLowerCase();
    const namaProyek = new Map(data.projects.map(p => [p.id, p.name]));
    const isi = saring(data, f, hariIni).filter(t => (!f.status || (f.status === 'aktif' ? aktif(t) : t.status === f.status))
      && (!kata || [t.id, t.title, orang(t.pic).nama, t.platform, t.kategori, namaProyek.get(t.project) || ''].join(' ').toLowerCase().includes(kata)));
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

  /* Utas diskusi: task yang punya komentar (atau cocok dengan pencarian), yang belum
     dibaca di atas, lalu yang komentarnya paling baru. sejak(t) → batas baca task itu. */
  function utasDiskusi(data, me, lingkup, sejak, q) {
    const kata = String(q || '').trim().toLowerCase();
    const ids = lingkup === 'tim' ? lingkupOrang(me, 'tim') : null;
    const namaProyek = new Map(data.projects.map(p => [p.id, p.name]));
    return data.tasks
      .filter(t => (kata ? [t.id, t.title, orang(t.pic).nama, namaProyek.get(t.project) || ''].join(' ').toLowerCase().includes(kata) : t.comments.length > 0))
      .filter(t => (lingkup === 'terlibat' ? terlibat(t, me) : lingkup === 'tim' ? !ids || ids.includes(t.pic) : true))
      .map(t => ({ t, baru: belumDibaca(t, me, sejak(t)), terakhir: t.comments.reduce((a, k) => (!a || k.at > a.at ? k : a), null) }))
      .sort((a, b) => (b.baru > 0) - (a.baru > 0) || (b.terakhir ? b.terakhir.at : 0) - (a.terakhir ? a.terakhir.at : 0));
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

  /* Setoran = "task X mengisi target Y sebanyak N". Inilah yang membuat progres paket
     bergerak sendiri: setoran terhitung begitu task-nya Selesai — untuk task proyek
     artinya sudah disetujui peninjau. Task yang masih berjalan dihitung "digarap".
     Tak ada yang ditulis saat task selesai; progres selalu dihitung ulang dari status
     task, jadi task yang dibuka kembali otomatis menurunkan angkanya lagi. */
  function setoranPaket(data, p, perId = indeks(data)) {
    const per = new Map((p.items || []).map(it => [it.id, []]));
    for (const s of data.setoran || []) {
      if (s.paket !== p.id || !per.has(s.item)) continue;
      const t = perId.get(s.task) || null;
      per.get(s.item).push({ ...s, t, selesai: !!t && selesai(t), hilang: !t });
    }
    return per;
  }

  /* Status target dihitung, tak pernah diketik:
       terpenuhi = sudah ada (awal) + setoran dari task yang Selesai
       digarap   = setoran dari task yang belum Selesai
     "Lebih" sengaja tidak dibulatkan jadi penuh: kelebihan biasanya berarti salah hitung
     atau setoran dobel, dan itu perlu terlihat. Setoran yang task-nya hilang tak dihitung. */
  function hitungTarget(it, kontrib = []) {
    const target = Number(it.target) || 0;
    const awal = Number(it.awal) || 0;
    let masuk = 0, digarap = 0;
    for (const k of kontrib) {
      if (k.hilang) continue;
      if (k.selesai) masuk += Number(k.jumlah) || 0;
      else digarap += Number(k.jumlah) || 0;
    }
    const terpenuhi = awal + masuk;
    let status = 'belum';
    if (target > 0 && terpenuhi > target) status = 'lebih';
    else if (target > 0 && terpenuhi >= target) status = 'penuh';
    else if (digarap > 0) status = 'digarap';
    else if (terpenuhi > 0) status = 'sebagian';
    return { target, awal, masuk, terpenuhi, digarap, sisa: Math.max(0, target - terpenuhi), lebih: Math.max(0, terpenuhi - target), status };
  }

  /* Yang belum ditangani siapa pun: belum terpenuhi dan belum sedang digarap. */
  function sisaTerbuka(it, kontrib = []) {
    const h = hitungTarget(it, kontrib);
    return Math.max(0, h.target - h.terpenuhi - h.digarap);
  }

  function ringkasPaket(p, kontribPer = new Map()) {
    const r = { target: 0, terpenuhi: 0, digarap: 0, sisa: 0, jumlah: (p.items || []).length, penuh: 0, lebih: 0, kurang: 0, sedang: 0, terbuka: 0 };
    for (const it of p.items || []) {
      const k = kontribPer.get(it.id) || [];
      const h = hitungTarget(it, k);
      r.target += h.target;
      r.terpenuhi += Math.min(h.terpenuhi, h.target || h.terpenuhi);
      r.digarap += Math.min(h.digarap, h.sisa);
      r.sisa += h.sisa;
      if (h.status === 'penuh') r.penuh++;
      else if (h.status === 'lebih') r.lebih++;
      else r.kurang++;
      if (h.status === 'digarap') r.sedang++;
      if (sisaTerbuka(it, k) > 0) r.terbuka++;
    }
    r.persen = r.target ? Math.round(r.terpenuhi / r.target * 100) : 0;
    r.persenDigarap = r.target ? Math.round(r.digarap / r.target * 100) : 0;
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

  /* Task hasil elaborasi ada di tahap Development; sub-tahapnya mengikuti kategori. */
  const SUB_ELABORASI = { Dibimbing: '3.3 Content Production', 'Live Class': '3.3 Content Production' };
  const fmtJumlah = n => (Number.isInteger(n) ? String(n) : String(n).replace('.', ','));

  /* Setiap target terpilih yang masih terbuka menjadi satu task proyek, yang menyetor
     sisanya ke target itu. Progres paket lalu bergerak sendiri setiap kali task itu
     disetujui. Bawaannya tahap Development: rancangan paketnya sendiri adalah hasil Design. */
  function elaborasiPaket(data, p, f, me, waktu, hariIni) {
    const peran = orang(me).peran;
    if (!['manager', 'lead'].includes(peran)) throw new Error('Hanya Lead atau Manager yang mengelaborasi paket.');
    const lead = peran === 'lead' ? me : (teks(f.lead) || MANAGER);
    if (orang(lead).peran === 'staff') throw new Error('Lead proyek harus Lead atau Manager.');
    const pic = teks(f.pic) || lead;
    if (!picBoleh(me).includes(pic)) throw new Error('PIC itu di luar tim Anda.');
    const stage = TAHAP.some(x => x.id === f.stage) ? f.stage : 'V';
    const pilih = new Set(f.items || []);
    const kontrib = setoranPaket(data, p);
    const terbuka = (p.items || []).filter(it => pilih.has(it.id))
      .map(it => ({ it, jumlah: sisaTerbuka(it, kontrib.get(it.id) || []) })).filter(x => x.jumlah > 0);
    if (!terbuka.length) throw new Error('Tidak ada target terbuka yang dipilih. Target terpilih sudah terpenuhi atau sedang digarap.');
    const judul = p.namaPaket || p.program || p.id;
    const proj = {
      id: 'PRJ-' + nomorBerikut(data.projects, 'PRJ'), name: teks(f.name) || `Produksi ${judul}`, platform: p.platform || 'All Platform',
      stage, cycle: 1, decision: 'Build', goal: teks(f.goal) || `Memenuhi target rancangan paket ${p.id} · ${judul}.`, lead, arsip: false, paket: p.id, history: [],
    };
    data.projects.unshift(proj);
    catatLog(data, 'create', `${proj.id} · ${proj.name}`, `Proyek dari rancangan paket ${p.id}, tahap ${namaTahap(stage)}`, me, waktu);
    data.setoran = data.setoran || [];
    const tasks = terbuka.map(({ it, jumlah }) => {
      const satuan = it.satuan || 'Paket';
      const t = taskBaru(data, {
        title: `${it.kategori} · ${it.nama || 'Tanpa nama'} — ${fmtJumlah(jumlah)} ${satuan}`,
        project: proj.id, stage, pic, due: teks(f.due), priority: 'Normal',
        output: `${fmtJumlah(jumlah)} ${satuan} ${it.nama || ''}`.trim(),
        detail: [`Target paket ${p.id} · ${it.kategori}${it.grup ? ' / ' + it.grup : ''} · ${it.nama}: target ${fmtJumlah(Number(it.target) || 0)} ${satuan}.`,
          `Saat task ini disetujui, ${fmtJumlah(jumlah)} ${satuan} masuk ke progres paket.`, it.catatan].filter(Boolean).join('\n'),
      }, me, waktu, hariIni);
      t.kategori = 'Develop Konten';
      t.sub = SUB_ELABORASI[it.kategori] || '3.1 Academic Content Development';
      data.setoran.push({ id: `st-${t.id}-${it.id}`, paket: p.id, item: it.id, task: t.id, jumlah, catatan: '' });
      return t;
    });
    return { project: proj, tasks };
  }

  const bolehSetor = (t, me) => ['manager', 'lead'].includes(orang(me).peran) && bolehUbah(t, me);

  /* Setoran manual dari detail task, untuk task yang dibuat di luar elaborasi.
     Satu task + satu target = satu setoran; menyetor lagi mengganti jumlahnya. */
  function setorkan(data, t, f, me, waktu) {
    if (!bolehSetor(t, me)) throw new Error('Hanya Lead atau Manager task ini yang mengatur setoran.');
    const p = data.packages.find(x => x.id === f.paket);
    if (!p) throw new Error('Paket tidak ditemukan.');
    const it = (p.items || []).find(x => x.id === f.item);
    if (!it) throw new Error('Pilih target paketnya.');
    const jumlah = angkaPositif(f.jumlah);
    if (!jumlah) throw new Error('Jumlah setoran harus lebih dari 0.');
    data.setoran = data.setoran || [];
    const ada = data.setoran.find(s => s.task === t.id && s.paket === p.id && s.item === it.id);
    if (ada) ada.jumlah = jumlah;
    else data.setoran.push({ id: `st-${t.id}-${it.id}`, paket: p.id, item: it.id, task: t.id, jumlah, catatan: teks(f.catatan) });
    catatLog(data, 'update', `${t.id} · ${t.title}`, `Setoran ke ${p.id}: ${it.kategori} · ${it.nama} ${fmtJumlah(jumlah)} ${it.satuan || 'Paket'}`, me, waktu);
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

  /* ---------- Link Saya, Catatan Saya, Dashboard Lain ---------- */

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
    const n = { id: `n${waktu}-${data.notes.length}`, user: me, ...isi };
    data.notes.unshift(n);
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

  /* Ikon Dashboard Lain memakai nama ikon v1 (Material), digambar ulang di app.js. */
  const IKON_DASHBOARD = ['dashboard', 'bar_chart', 'timeline', 'table_chart', 'description', 'assignment', 'school', 'event'];

  function simpanDashboard(data, me, f, id, waktu) {
    if (orang(me).peran !== 'manager') throw new Error('Hanya Manager yang mengelola Dashboard Lain.');
    const title = teks(f.title);
    if (!title) throw new Error('Judul dashboard wajib diisi.');
    const url = tautanRapi(f.url);
    if (!url) throw new Error('Alamat dashboard tidak valid.');
    const isi = { title, url, deskripsi: teks(f.deskripsi), icon: IKON_DASHBOARD.includes(f.icon) ? f.icon : 'dashboard' };
    if (id) {
      const d = data.dashboards.find(x => x.id === id);
      if (!d) throw new Error('Dashboard tidak ditemukan.');
      return Object.assign(d, isi);
    }
    const d = { id: `d${waktu}-${data.dashboards.length}`, ...isi };
    data.dashboards.push(d);
    catatLog(data, 'create', 'Dashboard Lain', `Dashboard "${title}" ditambahkan`, me, waktu);
    return d;
  }

  function hapusDashboard(data, me, id, waktu) {
    if (orang(me).peran !== 'manager') throw new Error('Hanya Manager yang mengelola Dashboard Lain.');
    const i = data.dashboards.findIndex(x => x.id === id);
    if (i < 0) throw new Error('Dashboard tidak ditemukan.');
    const [d] = data.dashboards.splice(i, 1);
    catatLog(data, 'delete', 'Dashboard Lain', `Dashboard "${d.title}" dihapus`, me, waktu);
  }

  function cari(data, q, batas = 50) {
    const kata = String(q || '').trim().toLowerCase();
    if (!kata) return [];
    const namaProyek = new Map(data.projects.map(p => [p.id, p.name]));
    return data.tasks.filter(t => [t.id, t.title, orang(t.pic).nama, t.platform, t.kategori, namaProyek.get(t.project) || '']
      .join(' ').toLowerCase().includes(kata)).slice(0, batas);
  }

  return {
    MANAGER, KAPASITAS, STATUS, TAHAP, PERAN, ORANG,
    orang, timDari, inisial, isoHari, selisihHari, tambahHari,
    selesai, aktif, indeks, depsBelum, terhambat, ditandaiTertahan, telat, peninjau, bolehUbah, picBoleh, bolehBuatTask, alasanTunggu,
    aksiUntuk, terapkanAksi, aksiPindah, catatLog, taskBaru, proyekBaru,
    namaTahap, tahapBerikut, ringkasProyek, antreKeputusan, majukan, setKeputusan, setArsip,
    pekerjaanSaya, perhatian, lingkupOrang, kolomPapan, bebanOrang, laporan, cari,
    PERIODE, rentang, laporanPeriode, daftarTask, rentangTask, gridBulan, geserBulan,
    terlibat, belumDibaca, utasDiskusi, JENIS_LOG, saringLog,
    PAKET_IDENTITAS, PAKET_PRODUK, KATEGORI_PAKET, SATUAN_PAKET, hitungTarget, ringkasPaket, bolehUbahPaket, paketBaru, simpanPaket, hapusPaket,
    setoranPaket, sisaTerbuka, elaborasiPaket, bolehSetor, setorkan, hapusSetoran, tautkanPaket,
    FOLDER_UMUM, tautanRapi, judulTautan, kelompokFolder, simpanLink, simpanCatatan, hapusMilik, gantiNamaFolder, hapusFolder,
    IKON_DASHBOARD, simpanDashboard, hapusDashboard,
  };
}));
