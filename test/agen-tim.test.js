/* Pekerjaan Lead agen Ali (agen/tim.js): rekap tim, antrean + saran PIC, cek kerapian
   data, dan laporan mingguan. Fungsi murni: data uji disusun langsung, tanpa server. */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');
const { lingkupTim, rekapTim, antreanSaran, cekData, laporanMingguan } = require('../agen/tim');

const HARI = '2026-10-16'; // Jumat
const jam = (iso, h = 9) => new Date(`${iso}T${String(h).padStart(2, '0')}:00:00`).getTime();
const STAFF = [
  { id: 'budi', nama: 'Budi', pendek: 'Budi', peran: 'staff', jabatan: 'Data', lead: 'ali', aktif: true },
  { id: 'citra', nama: 'Citra', pendek: 'Citra', peran: 'staff', jabatan: 'Data', lead: 'ali', aktif: true },
  { id: 'dodi', nama: 'Dodi', pendek: 'Dodi', peran: 'staff', jabatan: 'Data', lead: 'ali', aktif: false },
];

/* Tim DAE (Ali + Budi + Citra; Dodi nonaktif) dengan satu proyek di fase Development. */
function keadaanUji() {
  assert.equal(I.aturOrang(STAFF), '');
  const d = I.dataKosong();
  const w = jam('2026-10-12');
  const p = I.proyekBaru(d, { name: 'Otomasi laporan' }, 'nynda', w);
  const buat = (f, oleh = 'nynda') => I.taskBaru(d, { project: p.id, ...f }, oleh, w, '2026-10-12');
  const ubah = (t, f) => Object.assign(t, f);

  const a3 = ubah(buat({ title: 'Analisis gap data', sub: 'A3', pic: 'ali', due: '2026-10-08' }),
    { status: 'Selesai', selesaiAt: jam('2026-10-08'), output: 'Gap data tercatat' });
  const d4 = buat({ title: 'Rancangan plugin', sub: 'D4', pic: 'ali', due: '2026-10-15' });
  ubah(d4, { status: 'Selesai', selesaiAt: jam('2026-10-14'), output: 'Rancangan disetujui',
    tinjauan: [{ by: 'ali', action: 'Diajukan', at: jam('2026-10-13') }, { by: 'nynda', action: 'Disetujui', at: jam('2026-10-14') }] });
  const dv6 = buat({ title: 'Generator soal', sub: 'DV6', pic: 'ali', due: '2026-10-20' });
  // induk yang sudah selesai padahal turunannya masih jalan (sefase, jadi DV7 tak ikut menunggu)
  const api = buat({ title: 'Integrasi API', sub: 'DV6', pic: 'ali', due: '2026-10-14' });
  const diagram = I.taskAnak(d, api, { title: 'Dokumentasi API', pic: 'budi' }, 'ali', w, '2026-10-12');
  ubah(api, { status: 'Selesai', selesaiAt: jam('2026-10-14'), output: 'API tersambung' });
  const parser = I.taskAnak(d, dv6, { title: 'Modul parser', pic: 'budi', due: '2026-10-25' }, 'ali', w, '2026-10-12');
  const render = I.taskAnak(d, dv6, { title: 'Modul render', pic: 'citra', due: '2026-10-18' }, 'ali', w, '2026-10-12');
  ubah(parser, { status: 'Dikerjakan', tinjauan: [{ by: 'ali', action: 'Dikembalikan', note: 'Tambahkan tes', at: jam('2026-10-15') }] });
  ubah(render, { status: 'Ditinjau', output: 'Modul render jalan', tinjauan: [{ by: 'citra', action: 'Diajukan', at: jam('2026-10-15') }] });
  const dv7 = buat({ title: 'Prototype dashboard', sub: 'DV7', pic: 'ali', due: '2026-10-21' });
  const i5 = ubah(buat({ title: 'Deploy generator', sub: 'I5', pic: 'ali', due: '2026-10-30' }), { tertahan: true, alasanTertahan: '', tunggu: ['PRD-999'] });
  const e8 = ubah(buat({ title: 'QC akun', sub: 'E8', pic: 'ali', due: '2026-10-28' }), { pic: 'citra', status: 'Ditinjau', output: '' });
  const rutin = I.taskBaru(d, { title: 'Rekap data mingguan', sub: 'R1', pic: 'budi', due: '2026-09-25' }, 'ali', w, '2026-10-12');
  const lama = ubah(I.taskBaru(d, { title: 'Arsip skrip lama', sub: 'R1', pic: 'budi', due: '2026-10-30' }, 'ali', w, '2026-10-12'), { pic: 'dodi' });
  // task tim lain: tak boleh ikut
  I.taskBaru(d, { project: p.id, title: 'Bank soal', sub: 'DV1', pic: 'andika', due: '2026-10-20' }, 'nynda', w, '2026-10-12');

  const k = { mode: 'real', me: 'ali', data: d, hari: HARI, sekarang: jam(HARI, 15), perId: I.indeks(d) };
  return { k, p, a3, d4, api, diagram, dv6, parser, render, dv7, i5, e8, rutin, lama };
}

test.after(() => I.aturOrang([]));

test('lingkup tim: Lead DAE dan staff aktifnya; task tim lain tidak ikut', () => {
  const { k } = keadaanUji();
  const l = lingkupTim(k);
  assert.deepEqual([l.kode, l.label, l.anggota, l.staff], ['SI', 'DAE', ['ali', 'budi', 'citra'], ['budi', 'citra']]);
  assert.ok(!rekapTim(k).baris.join('\n').includes('Bank soal'));
});

test('rekap tim: angka, yang perlu perhatian, per proyek & fase, beban, task turunan', () => {
  const { k } = keadaanUji();
  const r = rekapTim(k);
  const teks = r.baris.join('\n');
  assert.match(teks, /^Rekap tim DAE · Jumat, 16 Oktober 2026 · data real/);
  assert.match(teks, /Anggota: Ali, Budi, Citra · nonaktif: Dodi\n/);
  assert.match(teks, /Aktif 9 · telat 1 · tertahan 1 · revisi 1 · menunggu tinjauan 2 · selesai minggu ini 2/);
  assert.match(teks, /Terlambat \(1\)\n {2}• PRD-\d+ · R1 · Rekap data mingguan — Antre, Siap · tenggat 25 Sep \(telat 21 hari\) · PIC Budi/);
  assert.match(teks, /Tertahan \(1\)\n {2}• PRD-\d+ · I5 · Deploy generator — Antre, Tertahan · tenggat 30 Okt · PIC Ali · tanpa alasan/);
  assert.match(teks, /Dikembalikan untuk direvisi \(1\)\n {2}• PRD-\d+ · DV6 · Modul parser — Dikerjakan, Revisi/);
  assert.match(teks, /Menunggu tinjauan \(2\)[\s\S]*Modul render — Ditinjau · tenggat 18 Okt · PIC Citra · ditinjau Ali/);
  assert.match(teks, /PRJ-1 · Otomasi laporan · siklus 1\n {2}Analysis: 1\/1 selesai\n {2}Design: 1\/1 selesai\n {2}Development: 1\/6 selesai · [^\n]*\(Budi, revisi\)/);
  assert.match(teks, /Rutin & di luar proyek \(2\)[\s\S]*Arsip skrip lama — Antre, Siap · tenggat 30 Okt · PIC Dodi/, 'task staff nonaktif tetap terlihat');
  assert.match(teks, /Beban per orang \(task aktif dari kapasitas 6\)\n {2}• Ali: 3\/6\n {2}• Budi: 3\/6\n {2}• Citra: 2\/6/);
  assert.match(teks, /Task turunan: 2 task dibagi jadi 3 turunan \(0 selesai, 3 aktif\)\./);
  assert.equal(r.singkat, 'tim DAE: 9 aktif · 1 telat · 1 tertahan · 1 revisi · 2 menunggu tinjauan');
});

test('antrean + saran PIC: langkah siap dibagi, staff berbeban ringan lebih dulu, tanpa staff = kerjakan sendiri', () => {
  const { k, dv7 } = keadaanUji();
  const r = antreanSaran(k);
  const teks = r.baris.join('\n');
  assert.match(teks, new RegExp(`• ${dv7.id} · DV7 · Prototype dashboard — Antre, Siap · tenggat 21 Okt\\n {4}saran PIC turunan: Citra \\(2/6 aktif\\), lalu Budi \\(3/6 aktif, 1 telat\\)`));
  assert.ok(!teks.includes('Generator soal'), 'yang sudah dibagi tak masuk antrean');
  assert.equal(r.singkat, `1 task siap dibagi · mis. ${dv7.id} → Citra`);

  // pengalaman di sub-stage yang sama memecah seri beban
  const { k: k2, dv7: dv7b, render } = keadaanUji();
  render.status = 'Selesai';
  render.selesaiAt = jam('2026-10-15');
  const lain = I.taskBaru(k2.data, { title: 'Prototype lama', sub: 'R1', pic: 'budi', due: '' }, 'ali', jam('2026-10-12'), '2026-10-12');
  Object.assign(lain, { sub: 'DV7', status: 'Selesai', selesaiAt: jam('2026-10-01') });
  k2.perId = I.indeks(k2.data);
  assert.match(antreanSaran(k2).baris.join('\n'), new RegExp(`${dv7b.id}[\\s\\S]*saran PIC turunan: Citra \\(1/6 aktif\\), lalu Budi \\(3/6 aktif, pernah 1x DV7, 1 telat\\)`));

  // Lead tanpa staff: tak ada saran, kerjakan sendiri
  I.aturOrang([]);
  const d = I.dataKosong();
  const p = I.proyekBaru(d, { name: 'Solo' }, 'nynda', jam('2026-10-12'));
  const t = I.taskBaru(d, { project: p.id, title: 'Skrip', sub: 'DV6', pic: 'ali', due: '2026-10-20' }, 'nynda', jam('2026-10-12'), '2026-10-12');
  const solo = antreanSaran({ mode: 'real', me: 'ali', data: d, hari: HARI, sekarang: jam(HARI), perId: I.indeks(d) });
  assert.equal(solo.singkat, 'antrean tim kosong (tim belum punya staff)', 'Lead tanpa staff tak punya Antrean tim (aturan pekerjaanSaya)');
  assert.match(solo.baris.join('\n'), /Tim DAE belum punya staff di ProductTrack, jadi tidak ada Antrean tim untuk dibagi: task tim langsung dikerjakan Ali\./);
  assert.ok(t);
});

test('cek kerapian data: tiap pemeriksaan menemukan kasusnya, data rapi = tanpa temuan', () => {
  const s = keadaanUji();
  const r = cekData(s.k);
  const teks = r.baris.join('\n');
  const ada = (judul, t, ket = '') => assert.match(teks, new RegExp(`${judul} \\(\\d+\\)[^]*?• ${t.id} [^\\n]*${ket}`), judul);
  ada('Task proyek aktif tanpa tenggat', s.diagram);
  ada('Sudah diajukan atau selesai, tapi output kosong', s.e8);
  ada('Turunan masih aktif padahal induknya sudah selesai', s.diagram, `induk ${s.api.id}`);
  ada('Tenggat turunan melewati tenggat induknya', s.parser, `induk ${s.dv6.id} tenggat 20 Okt`);
  ada('Menunggu task yang tidak ada lagi', s.i5, 'PRD-999');
  ada('PIC profilnya sudah dinonaktifkan', s.lama);
  ada('Tertahan tanpa alasan', s.i5);
  ada('Lewat tenggat lebih dari 14 hari dan belum dimulai', s.rutin);
  assert.ok(!teks.includes('Semua turunan selesai'), 'belum ada induk yang semua turunannya selesai');
  assert.equal(r.singkat, '8 temuan di data tim DAE', 'tanpa "terbanyak" kalau semua temuan berjumlah satu');

  // semua turunan selesai → induk siap diajukan
  s.parser.status = 'Selesai';
  s.render.status = 'Selesai';
  assert.match(cekData(s.k).baris.join('\n'), new RegExp(`Semua turunan selesai: induk siap diajukan \\(1\\)\\n {2}• ${s.dv6.id}[^\\n]*2 turunan selesai`));

  I.aturOrang(STAFF);
  const d = I.dataKosong();
  const p = I.proyekBaru(d, { name: 'Rapi' }, 'nynda', jam('2026-10-12'));
  I.taskBaru(d, { project: p.id, title: 'Skrip', sub: 'DV6', pic: 'ali', due: '2026-10-20' }, 'nynda', jam('2026-10-12'), '2026-10-12');
  const rapi = cekData({ mode: 'contoh', me: 'ali', data: d, hari: HARI, sekarang: jam(HARI), perId: I.indeks(d) });
  assert.deepEqual([rapi.singkat, rapi.baris.at(-1)], ['tidak ada temuan di data tim DAE', 'Tidak ada temuan: 1 task tim DAE rapi.']);
});

test('laporan mingguan: periode Senin–hari ini, selesai, diajukan, tinjauan Lead, rencana; Markdown & HTML', () => {
  const { k, d4, api, render, parser, dv6, dv7, rutin } = keadaanUji();
  const r = laporanMingguan(k);
  assert.deepEqual([r.dari, r.sampai, r.tim], ['2026-10-12', '2026-10-16', 'DAE']);
  const teks = r.baris.join('\n');
  assert.match(teks, /^Laporan mingguan tim DAE · Senin, 12 Oktober 2026 – Jumat, 16 Oktober 2026 · data real/);
  assert.match(teks, new RegExp(`Selesai \\(2\\)\\n {2}• ${api.id} · DV6 · Integrasi API \\(Ali, 14 Okt\\)\\n {2}• ${d4.id} · D4 · Rancangan plugin \\(Ali, 14 Okt\\)`));
  assert.match(teks, /Per orang[\s\S]*• Dodi \(nonaktif\) · selesai 0 · tepat waktu 0 · baru 1 · aktif 1 · telat 0/);
  assert.match(teks, new RegExp(`Diajukan, menunggu tinjauan \\(1\\)\\n {2}• ${render.id} · DV6 · Modul render \\(Citra, ditinjau Ali\\)`));
  assert.match(teks, new RegExp(`Tinjauan oleh Ali \\(1\\)\\n {2}• ${parser.id} · DV6 · Modul parser: dikembalikan \\("Tambahkan tes"\\)`));
  assert.match(teks, new RegExp(`Terlambat & tertahan \\(2\\)\\n {2}• ${rutin.id} · R1 · Rekap data mingguan \\(Budi, tenggat 25 Sep, telat 21 hari\\)`));
  const rencana = teks.split('Rencana 7 hari ke depan (sampai 23 Okt)')[1];
  for (const t of [render, dv6, dv7]) assert.ok(rencana.includes(t.id), t.id);
  assert.ok(!rencana.includes(parser.id), 'tenggat 25 Okt di luar 7 hari');
  assert.match(r.singkat, /^minggu 12 Okt–16 Okt: 2 selesai, 2 diajukan, 1 telat, 3 tenggat 7 hari ke depan$/);

  assert.match(r.md, /^# Laporan mingguan tim DAE\n\n_Periode Senin, 12 Oktober 2026 – Jumat, 16 Oktober 2026 · disusun /);
  assert.match(r.md, /\| Orang \| Selesai \| Tepat waktu \| Baru \| Aktif \| Telat \|\n\|---\|---\|---\|---\|---\|---\|\n\| Ali \| 2 \| 2 \|/);
  assert.match(r.html, /<title>Laporan mingguan tim DAE · /);
  assert.match(r.html, /<h2>Per orang<\/h2><table><thead><tr><th>Orang<\/th>/);

  const lalu = laporanMingguan(k, 'lalu');
  assert.deepEqual([lalu.dari, lalu.sampai], ['2026-10-05', '2026-10-11']);
  assert.match(lalu.baris.join('\n'), /Selesai \(1\)\n {2}• PRD-\d+ · A3 · Analisis gap data \(Ali, 8 Okt\)/);
});

test('laporan mingguan: isi task di-escape di HTML', () => {
  const { k, d4 } = keadaanUji();
  d4.title = 'Rancangan <script>alert(1)</script> & "uji"';
  const r = laporanMingguan(k);
  assert.ok(!r.html.includes('<script>alert'), 'tag dari judul task tidak jadi HTML');
  assert.match(r.html, /Rancangan &lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; &quot;uji&quot;/);
});
