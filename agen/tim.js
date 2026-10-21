/* =============================================================================
   agen/tim.js — pekerjaan Lead untuk agen AI Ali: rekap tim, laporan mingguan,
   antrean siap dibagi dengan saran PIC, dan cek kerapian data tim.

   Fungsi murni di atas keadaan dari klien.js, sama seperti laporan.js: tanpa jaringan dan
   tanpa AI, jadi bisa diuji langsung dan dijalankan Agent Office tanpa token. Hasilnya
   { baris, singkat } (laporan mingguan juga { md, html } untuk berkasnya).

   Lingkupnya tim profil agen: tim yang ia pimpin (Lead) atau tim tempat ia bekerja (staff),
   yaitu task bersub-stage milik tim itu ditambah task yang dipegang anggotanya. Task di
   proyek yang diarsipkan tidak dihitung. Tak ada yang ditulis ke ProductTrack: saran PIC
   hanya saran, yang membagi tetap Lead-nya.
   ========================================================================== */
'use strict';

const I = require('../public/inti.js');
const K = require('./klien');

/* "ditinjau X", atau (hasil permintaan ke DAE yang belum punya peninjau aktif, 2.46.0) peringatannya, bukan "Manager". */
const ditinjauOleh = (t, k) => {
  const p = I.peninjau(t, k.perId);
  return p ? `ditinjau ${K.pendek(p)}` : t.permintaanDae ? 'belum ada peninjau aktif' : `ditinjau ${K.pendek(I.MANAGER)}`;
};

const NAMA_FASE = { ...Object.fromEntries(I.TAHAP.map(x => [x.id, x.nama])), R: 'Rutin' };
const URUT_FASE = ['A', 'D', 'V', 'I', 'E', 'R', ''];
const urutTenggat = (a, b) => (a.due || '9999').localeCompare(b.due || '9999') || a.id.localeCompare(b.id, 'id', { numeric: true });
const sumber = k => (k.mode === 'real' ? 'data real' : 'data contoh');

/* ---------- Lingkup tim ---------- */

/* { kode, label, anggota (Lead + staff aktif), staff, lead, nonaktif (staff tim yang profilnya
   dinonaktifkan: task-nya tetap dihitung, supaya Lead melihat yang perlu dipindahkan) } */
function lingkupTim(k) {
  const tim = I.timOrang(k.me);
  const kode = tim ? tim.kode : '';
  const anggota = kode ? I.anggotaTim(kode) : [k.me];
  const lead = tim ? tim.lead : k.me;
  const nonaktif = I.nonaktif().filter(o => o.lead === lead && o.peran === 'staff').map(o => o.id);
  return { kode, label: kode ? I.singkatTim(kode) : K.pendek(k.me), anggota, staff: anggota.filter(id => id !== lead), lead, nonaktif };
}

function taskTim(k, l) {
  const arsip = new Set(k.data.projects.filter(p => p.arsip).map(p => p.id));
  const milik = t => (l.kode && I.timTask(t) === l.kode) || l.anggota.includes(t.pic) || l.nonaktif.includes(t.pic);
  return k.data.tasks.filter(t => milik(t) && !(t.project && arsip.has(t.project)));
}

const fase = t => t.stage || I.tahapDariKode(t.sub);
const barisPic = (t, k, catatan = '') => K.barisTask(t, k, [`PIC ${K.pendek(t.pic)}`, catatan].filter(Boolean).join(' · '));

/* Penulis laporan obrolan: judul lalu bagian-bagian "Judul (n)" berisi butir. */
function penulis(judul) {
  const baris = [judul];
  const bagian = (j, isi, tulis, maks = 8) => {
    if (!isi.length) return;
    baris.push('', `${j} (${isi.length})`);
    for (const x of isi.slice(0, maks)) baris.push('  • ' + tulis(x));
    if (isi.length > maks) baris.push(`  • …dan ${isi.length - maks} lagi`);
  };
  return { baris, bagian };
}

/* ---------- Rekap tim ---------- */

function rekapTim(k) {
  const l = lingkupTim(k);
  const semua = taskTim(k, l);
  const aktif = semua.filter(I.aktif);
  const label = t => I.labelKeadaan(t, k.perId);
  const telat = aktif.filter(t => I.telat(t, k.hari) && !t.tertahan).sort(urutTenggat);
  const tertahan = aktif.filter(t => t.tertahan).sort(urutTenggat);
  const revisi = aktif.filter(t => label(t) === 'Revisi').sort(urutTenggat);
  const ditinjau = aktif.filter(t => t.status === 'Ditinjau').sort(urutTenggat);
  const { dari } = I.rentang('minggu', k.hari);
  const selesaiMinggu = semua.filter(t => I.selesai(t) && I.isoHari(t.selesaiAt) >= dari);

  const w = penulis(`Rekap tim ${l.label} · ${K.tglPanjang(k.hari)} · ${sumber(k)}`);
  w.baris.push('', `Anggota: ${l.anggota.map(K.pendek).join(', ')}${l.staff.length ? '' : ' (belum ada staff di ProductTrack)'}${l.nonaktif.length ? ` · nonaktif: ${l.nonaktif.map(K.pendek).join(', ')}` : ''}`);
  w.baris.push(`Aktif ${aktif.length} · telat ${telat.length} · tertahan ${tertahan.length} · revisi ${revisi.length} · menunggu tinjauan ${ditinjau.length} · selesai minggu ini ${selesaiMinggu.length}`);
  w.bagian('Terlambat', telat, t => barisPic(t, k));
  w.bagian('Tertahan', tertahan, t => barisPic(t, k, t.alasanTertahan ? `"${K.potong(t.alasanTertahan, 80)}"` : 'tanpa alasan'));
  w.bagian('Dikembalikan untuk direvisi', revisi, t => barisPic(t, k));
  w.bagian('Menunggu tinjauan', ditinjau, t => barisPic(t, k, ditinjauOleh(t, k)));

  // Per proyek (siklus berjalan) lalu per fase ADDIE: berapa yang selesai, dan yang masih jalan.
  for (const p of k.data.projects.filter(x => !x.arsip)) {
    const milik = semua.filter(t => t.project === p.id && (t.cycle || 1) === (p.cycle || 1));
    if (!milik.some(I.aktif)) continue;
    w.baris.push('', `${p.id} · ${K.potong(p.name, 60)} · siklus ${p.cycle || 1}`);
    for (const f of URUT_FASE) {
      const isi = milik.filter(t => fase(t) === f);
      if (!isi.length) continue;
      const jalan = isi.filter(I.aktif).sort(urutTenggat);
      const ket = t => { const x = label(t) || (t.status === 'Antre' ? '' : t.status); return `${t.id}${t.sub ? ' ' + t.sub : ''} (${K.pendek(t.pic)}${x ? ', ' + x.toLowerCase() : ''})`; };
      const daftar = jalan.slice(0, 6).map(ket).join(', ') + (jalan.length > 6 ? `, …+${jalan.length - 6}` : '');
      w.baris.push(`  ${NAMA_FASE[f] || 'Lainnya'}: ${isi.length - jalan.length}/${isi.length} selesai${jalan.length ? ' · ' + daftar : ''}`);
    }
  }
  w.bagian('Rutin & di luar proyek', aktif.filter(t => !t.project).sort(urutTenggat), t => barisPic(t, k));

  w.baris.push('', `Beban per orang (task aktif dari kapasitas ${I.KAPASITAS})`);
  for (const b of I.bebanOrang(k.data, l.anggota)) w.baris.push(`  • ${K.pendek(b.id)}: ${b.aktif}/${I.KAPASITAS}${b.penuh ? ' · penuh' : ''}`);

  const turunan = semua.filter(t => t.induk);
  w.baris.push('', turunan.length
    ? `Task turunan: ${new Set(turunan.map(t => t.induk)).size} task dibagi jadi ${turunan.length} turunan (${turunan.filter(I.selesai).length} selesai, ${turunan.filter(I.aktif).length} aktif).`
    : 'Task turunan: belum ada task tim yang dibagi lewat task turunan.');

  const angka = [`${aktif.length} aktif`, telat.length && `${telat.length} telat`, tertahan.length && `${tertahan.length} tertahan`,
    revisi.length && `${revisi.length} revisi`, ditinjau.length && `${ditinjau.length} menunggu tinjauan`].filter(Boolean).join(' · ');
  return { baris: w.baris, singkat: `tim ${l.label}: ${angka}` };
}

/* ---------- Antrean siap dibagi + saran PIC ---------- */

/* Staff dengan beban paling ringan lebih dulu; yang penuh di belakang. Seri: yang pernah
   menyelesaikan sub-stage yang sama, lalu yang paling sedikit telat. */
function saranPic(k, t, kandidat) {
  const nilai = kandidat.map(id => {
    const milik = k.data.tasks.filter(x => x.pic === id);
    const aktif = milik.filter(I.aktif).length;
    return {
      id, aktif, penuh: aktif >= I.KAPASITAS,
      pengalaman: t.sub ? milik.filter(x => I.selesai(x) && x.sub === t.sub).length : 0,
      telat: milik.filter(x => I.telat(x, k.hari) && !x.tertahan).length,
    };
  });
  return nilai.sort((a, b) => a.penuh - b.penuh || a.aktif - b.aktif || b.pengalaman - a.pengalaman || a.telat - b.telat || a.id.localeCompare(b.id));
}

function antreanSaran(k) {
  const l = lingkupTim(k);
  const g = I.pekerjaanSaya(k.data, k.me, k.hari).grup.find(x => x.kunci === 'antrean');
  const antrean = (g ? g.isi.map(x => x.t) : []).sort(urutTenggat);
  const w = penulis(`Antrean tim ${l.label} · siap dibagi · ${K.tglPanjang(k.hari)} · ${sumber(k)}`);
  if (!antrean.length) {
    // Antrean tim hanya ada untuk Lead yang punya staff (aturan pekerjaanSaya di Inti).
    w.baris.push('', l.staff.length
      ? 'Tidak ada task di Antrean tim: langkah yang sudah bisa dimulai sudah berjalan atau sudah dibagi.'
      : `Tim ${l.label} belum punya staff di ProductTrack, jadi tidak ada Antrean tim untuk dibagi: task tim langsung dikerjakan ${K.pendek(k.me)}. Staff ditambahkan di Panel Dev → Pengguna.`);
    return { baris: w.baris, singkat: l.staff.length ? 'antrean tim kosong' : 'antrean tim kosong (tim belum punya staff)' };
  }
  const ket = (s, sub) => `${K.pendek(s.id)} (${s.aktif}/${I.KAPASITAS} aktif${s.pengalaman ? `, pernah ${s.pengalaman}x ${sub}` : ''}${s.telat ? `, ${s.telat} telat` : ''}${s.penuh ? ', penuh' : ''})`;
  let pertama = '';
  w.baris.push('');
  for (const t of antrean) {
    w.baris.push(`• ${K.barisTask(t, k)}`);
    const staff = I.picTurunan(t).filter(id => id !== t.pic && l.staff.includes(id));
    if (!staff.length) {
      w.baris.push('    saran: kerjakan sendiri. Tim ini belum punya staff di ProductTrack.');
      continue;
    }
    const urut = saranPic(k, t, staff);
    const pilih = urut.slice(0, 2);
    if (!pertama) pertama = `${t.id} → ${K.pendek(pilih[0].id)}`;
    w.baris.push(`    saran PIC turunan: ${pilih.map(s => ket(s, t.sub)).join(', lalu ')}`);
    if (urut.every(s => s.penuh)) w.baris.push('    semua staff sedang penuh: pertimbangkan menggeser tenggat atau mengerjakan sendiri.');
  }
  w.baris.push('', 'Ini hanya saran dari beban kerja saat ini. Untuk membagi: buka task di ProductTrack → bagian Task turunan.');
  return { baris: w.baris, singkat: `${antrean.length} task siap dibagi${pertama ? ` · mis. ${pertama}` : ''}` };
}

/* ---------- Cek kerapian data tim ---------- */

const PERIKSA = [
  ['tanpaTenggat', 'Task proyek aktif tanpa tenggat'],
  ['tanpaSub', 'Task proyek tanpa sub-stage'],
  ['outputKosong', 'Sudah diajukan atau selesai, tapi output kosong'],
  ['turunanTertinggal', 'Turunan masih aktif padahal induknya sudah selesai'],
  ['tenggatTurunan', 'Tenggat turunan melewati tenggat induknya'],
  ['siapAjukan', 'Semua turunan selesai: induk siap diajukan'],
  ['tungguHilang', 'Menunggu task yang tidak ada lagi'],
  ['picNonaktif', 'PIC profilnya sudah dinonaktifkan'],
  ['tertahanTanpaAlasan', 'Tertahan tanpa alasan'],
  ['telatBelumMulai', 'Lewat tenggat lebih dari 14 hari dan belum dimulai'],
];

function cekData(k) {
  const l = lingkupTim(k);
  const semua = taskTim(k, l);
  const temuan = Object.fromEntries(PERIKSA.map(([kunci]) => [kunci, []]));
  const catat = (kunci, t, ket = '') => temuan[kunci].push({ t, ket });
  const nonaktif = new Set(I.nonaktif().map(o => o.id));
  for (const t of semua) {
    const induk = t.induk ? k.perId.get(t.induk) : null;
    if (I.selesai(t) || t.status === 'Ditinjau') {
      if (!String(t.output || '').trim()) catat('outputKosong', t);
    }
    if (!I.aktif(t)) continue;
    if (t.lane === 'proyek' && !t.due) catat('tanpaTenggat', t);
    if (t.lane === 'proyek' && !t.sub) catat('tanpaSub', t);
    if (induk && I.selesai(induk)) catat('turunanTertinggal', t, `induk ${induk.id}`);
    if (induk && t.due && induk.due && t.due > induk.due) catat('tenggatTurunan', t, `induk ${induk.id} tenggat ${K.tglPendek(induk.due)}`);
    const anak = I.anakTask(k.perId, t.id);
    if (anak.length && anak.every(I.selesai) && t.status !== 'Ditinjau') catat('siapAjukan', t, `${anak.length} turunan selesai`);
    const hilang = [...(t.deps || []), ...(t.tunggu || [])].filter(id => !k.perId.has(id));
    if (hilang.length) catat('tungguHilang', t, hilang.join(', '));
    if (nonaktif.has(t.pic)) catat('picNonaktif', t);
    if (t.tertahan && !String(t.alasanTertahan || '').trim()) catat('tertahanTanpaAlasan', t);
    if (t.status === 'Antre' && t.due && K.selisihHari(t.due, k.hari) > 14) catat('telatBelumMulai', t);
  }
  const w = penulis(`Cek kerapian data tim ${l.label} · ${K.tglPanjang(k.hari)} · ${sumber(k)}`);
  let n = 0;
  for (const [kunci, judul] of PERIKSA) {
    const isi = temuan[kunci].sort((a, b) => urutTenggat(a.t, b.t));
    n += isi.length;
    w.bagian(judul, isi, x => barisPic(x.t, k, x.ket), 10);
  }
  if (!n) w.baris.push('', `Tidak ada temuan: ${semua.length} task tim ${l.label} rapi.`);
  const terbanyak = PERIKSA.map(([kunci, judul]) => [judul, temuan[kunci].length]).filter(x => x[1] > 1).sort((a, b) => b[1] - a[1])[0];
  return { baris: w.baris, singkat: n ? `${n} temuan di data tim ${l.label}${terbanyak ? ` · terbanyak: ${terbanyak[0].toLowerCase()} (${terbanyak[1]})` : ''}` : `tidak ada temuan di data tim ${l.label}` };
}

/* ---------- Laporan mingguan ---------- */

/* Laporan sebagai bagian-bagian, lalu dirender ke baris obrolan, Markdown, dan HTML.
   bagian: { judul, tabel?: { kolom, baris }, daftar?: [teks], kosong?: teks } */
function laporanMingguan(k, kunci = 'minggu') {
  const l = lingkupTim(k);
  const { dari, sampai } = I.rentang(kunci, k.hari);
  const lp = I.laporanPeriode(k.data, [...l.anggota, ...l.nonaktif], dari, sampai, k.hari);
  const dalam = at => { const h = I.isoHari(at); return !!h && h >= dari && h <= sampai; };
  const semua = taskTim(k, l);
  const tinjauan = semua.flatMap(t => (t.tinjauan || []).filter(r => dalam(r.at)).map(r => ({ t, r })));
  const diajukan = tinjauan.filter(x => x.r.action === 'Diajukan' && l.anggota.includes(x.r.by));
  const ditinjauSaya = k.data.tasks.flatMap(t => (t.tinjauan || []).filter(r => dalam(r.at) && r.by === k.me && (r.action === 'Disetujui' || r.action === 'Dikembalikan')).map(r => ({ t, r })));
  const selesai = lp.baris.flatMap(b => b.selesai).sort((a, b) => a.selesaiAt - b.selesaiAt);
  const telat = lp.baris.flatMap(b => b.telat).sort(urutTenggat);
  const tertahan = lp.baris.flatMap(b => b.tertahan).sort(urutTenggat);
  const dasar = kunci === 'lalu' ? sampai : k.hari;
  const batas = I.tambahHari(dasar, 7);
  const rencana = semua.filter(t => I.aktif(t) && t.due && t.due > dasar && t.due <= batas).sort(urutTenggat);
  const proyekTim = new Set(semua.map(t => t.project).filter(Boolean));
  const kabar = lp.proyek.filter(x => proyekTim.has(x.p.id));
  const t1 = t => `${t.id}${t.sub ? ' · ' + t.sub : ''} · ${K.potong(t.title, 70)}`;

  const bagian = [
    { judul: 'Ringkasan', tabel: { kolom: ['', 'Jumlah'], baris: [
      ['Selesai', `${lp.total.selesai} (${lp.total.tepat} tepat waktu)`],
      ['Diajukan untuk ditinjau', String(diajukan.length)],
      ['Task baru', String(lp.total.baru)],
      ['Aktif saat ini', String(lp.total.aktif)],
      ['Terlambat', String(lp.total.telat)],
      ['Tertahan', String(lp.total.tertahan)],
    ] } },
    { judul: 'Per orang', tabel: { kolom: ['Orang', 'Selesai', 'Tepat waktu', 'Baru', 'Aktif', 'Telat'],
      baris: lp.baris.filter(b => !l.nonaktif.includes(b.id) || b.aktif || b.selesai.length).map(b => [K.pendek(b.id) + (l.nonaktif.includes(b.id) ? ' (nonaktif)' : ''), String(b.selesai.length), String(b.tepat), String(b.baru), String(b.aktif), String(b.telat.length)]) } },
    { judul: 'Selesai', daftar: selesai.map(t => `${t1(t)} (${K.pendek(t.pic)}, ${K.tglPendek(I.isoHari(t.selesaiAt))})`), kosong: 'Belum ada task yang selesai di periode ini.' },
    { judul: 'Diajukan, menunggu tinjauan', daftar: diajukan.filter(x => x.t.status === 'Ditinjau').map(x => `${t1(x.t)} (${K.pendek(x.r.by)}, ${ditinjauOleh(x.t, k)})`), kosong: 'Tidak ada.' },
    { judul: `Tinjauan oleh ${K.pendek(k.me)}`, daftar: ditinjauSaya.map(x => `${t1(x.t)}: ${x.r.action.toLowerCase()}${x.r.note ? ` ("${K.potong(x.r.note, 90)}")` : ''}`), kosong: 'Tidak ada tinjauan di periode ini.' },
    { judul: 'Terlambat & tertahan', daftar: [
      ...telat.map(t => `${t1(t)} (${K.pendek(t.pic)}, tenggat ${K.tglPendek(t.due)}, telat ${K.selisihHari(t.due, k.hari)} hari)`),
      ...tertahan.map(t => `${t1(t)} (${K.pendek(t.pic)}, tertahan${t.alasanTertahan ? `: ${K.potong(t.alasanTertahan, 80)}` : ''})`),
    ], kosong: 'Tidak ada.' },
    { judul: `Rencana 7 hari ke depan (sampai ${K.tglPendek(batas)})`, daftar: rencana.map(t => `${t1(t)} (${K.pendek(t.pic)}, tenggat ${K.tglPendek(t.due)})`), kosong: 'Belum ada tenggat di 7 hari ke depan.' },
    ...(kabar.length ? [{ judul: 'Kabar proyek', daftar: kabar.map(x => `${x.p.id} · ${K.potong(x.p.name, 50)}: ${x.jenis === 'siklus'
      ? `siklus ${x.siklus || 2} dimulai`
      : `tahap ${I.namaTahap(x.dari)} → ${I.namaTahap(x.ke)}`} (${K.tglPendek(I.isoHari(x.at))})`) }] : []),
  ];
  const judul = `Laporan mingguan tim ${l.label}`;
  const periode = `${K.tglPanjang(dari)} – ${K.tglPanjang(sampai)}`;
  const sub = `Periode ${periode} · disusun ${K.tglPanjang(k.hari)} dari ${sumber(k)} ProductTrack oleh agen ${K.pendek(k.me)}`;

  const baris = [`${judul} · ${periode} · ${sumber(k)}`];
  for (const b of bagian) {
    baris.push('', b.tabel ? b.judul : `${b.judul} (${b.daftar.length})`);
    if (b.tabel) for (const r of b.tabel.baris) baris.push('  • ' + (b.tabel.kolom[0] ? r.map((x, i) => (i ? `${b.tabel.kolom[i].toLowerCase()} ${x}` : x)).join(' · ') : `${r[0]}: ${r[1]}`));
    else if (!b.daftar.length) baris.push('  ' + (b.kosong || 'Tidak ada.'));
    else { for (const x of b.daftar.slice(0, 8)) baris.push('  • ' + x); if (b.daftar.length > 8) baris.push(`  • …dan ${b.daftar.length - 8} lagi (lengkapnya di berkas laporan)`); }
  }

  const sel = s => String(s).replace(/\|/g, '\\|');
  const md = [`# ${judul}`, '', `_${sub}_`];
  for (const b of bagian) {
    md.push('', `## ${b.judul}`, '');
    if (b.tabel) md.push(`| ${b.tabel.kolom.map(sel).join(' | ')} |`, `|${b.tabel.kolom.map(() => '---').join('|')}|`, ...b.tabel.baris.map(r => `| ${r.map(sel).join(' | ')} |`));
    else if (!b.daftar.length) md.push(b.kosong || 'Tidak ada.');
    else md.push(...b.daftar.map(x => `- ${x}`));
  }

  const e = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const isi = bagian.map(b => `<section><h2>${e(b.judul)}</h2>${b.tabel
    ? `<table><thead><tr>${b.tabel.kolom.map(x => `<th>${e(x)}</th>`).join('')}</tr></thead><tbody>${b.tabel.baris.map(r => `<tr>${r.map(x => `<td>${e(x)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    : b.daftar.length ? `<ul>${b.daftar.map(x => `<li>${e(x)}</li>`).join('')}</ul>` : `<p class="kosong">${e(b.kosong || 'Tidak ada.')}</p>`}</section>`).join('\n');
  const html = `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(judul)} · ${e(periode)}</title>
<style>
  :root { color-scheme: light dark; --tinta: #1f2430; --redup: #5b6475; --garis: #dde1e8; --latar: #fff; --aksen: #1d6f8a; }
  @media (prefers-color-scheme: dark) { :root { --tinta: #e6e9ef; --redup: #a4acbb; --garis: #353b47; --latar: #15181e; --aksen: #6cc3df; } }
  body { margin: 0; background: var(--latar); color: var(--tinta); font: 14px/1.55 "Segoe UI", system-ui, sans-serif; }
  main { max-width: 860px; margin: 0 auto; padding: 28px 16px 48px; }
  h1 { margin: 0 0 4px; font-size: 22px; } .sub { margin: 0 0 18px; color: var(--redup); font-size: 13px; }
  h2 { margin: 22px 0 8px; font-size: 15px; color: var(--aksen); border-bottom: 1px solid var(--garis); padding-bottom: 4px; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; } th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--garis); }
  th { color: var(--redup); font-weight: 600; } ul { margin: 0; padding-left: 20px; } li { margin: 3px 0; } .kosong { color: var(--redup); margin: 0; }
  @media print { body { font-size: 11pt; } main { padding: 0; } h2 { break-after: avoid; } }
</style></head>
<body><main><h1>${e(judul)}</h1><p class="sub">${e(sub)}</p>
${isi}
</main></body></html>
`;
  const singkat = `minggu ${K.tglPendek(dari)}–${K.tglPendek(sampai)}: ${lp.total.selesai} selesai, ${diajukan.length} diajukan, ${lp.total.telat} telat, ${rencana.length} tenggat 7 hari ke depan`;
  return { baris, singkat, md: md.join('\n') + '\n', html, dari, sampai, tim: l.label };
}

module.exports = { lingkupTim, taskTim, rekapTim, antreanSaran, cekData, laporanMingguan, saranPic, PERIKSA };
