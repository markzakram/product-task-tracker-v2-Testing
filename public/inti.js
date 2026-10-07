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
      stage: 'A', cycle: 1, decision: 'Build', goal: String(f.goal || '').trim(), lead: f.lead || MANAGER, history: [],
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

  /* ---------- Laporan & pencarian ---------- */

  function laporan(data, hariIni) {
    const perId = indeks(data);
    const tiga0 = tambahHari(hariIni, -29);
    const dalam30 = t => selesai(t) && isoHari(t.selesaiAt) >= tiga0;
    const aktifSemua = data.tasks.filter(aktif);
    const senin = (() => { const d = keTanggal(hariIni); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return isoHari(d); })();
    const mingguan = [];
    for (let i = 7; i >= 0; i--) {
      const awal = tambahHari(senin, -7 * i);
      const akhir = tambahHari(awal, 6);
      mingguan.push({ awal, jumlah: data.tasks.filter(t => selesai(t) && isoHari(t.selesaiAt) >= awal && isoHari(t.selesaiAt) <= akhir).length });
    }
    const perPlatform = {};
    for (const t of aktifSemua) perPlatform[t.platform || '—'] = (perPlatform[t.platform || '—'] || 0) + 1;
    return {
      kpi: {
        aktif: aktifSemua.length,
        telat: aktifSemua.filter(t => telat(t, hariIni) && !t.tertahan).length,
        tertahan: aktifSemua.filter(ditandaiTertahan).length,
        ditinjau: aktifSemua.filter(t => t.status === 'Ditinjau').length,
        selesai30: data.tasks.filter(dalam30).length,
      },
      mingguan,
      perOrang: ORANG.map(o => ({
        id: o.id,
        aktif: aktifSemua.filter(t => t.pic === o.id).length,
        telat: aktifSemua.filter(t => t.pic === o.id && telat(t, hariIni) && !t.tertahan).length,
        selesai30: data.tasks.filter(t => t.pic === o.id && dalam30(t)).length,
      })),
      perPlatform: Object.entries(perPlatform).sort((a, b) => b[1] - a[1]).map(([platform, jumlah]) => ({ platform, jumlah })),
    };
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
  };
}));
