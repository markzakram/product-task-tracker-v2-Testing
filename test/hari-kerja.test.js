/* Tenggat hanya hari kerja (2.59.0, permintaan user: "deadline masih terhitung weekend … saya ingin
   weekend tidak terhitung, termasuk juga ketika inisial deadline tidak boleh weekend"). Sabtu dan
   Minggu tak dihitung: tenggat yang dipilih atau diubah harus Senin–Jumat, dan keterlambatan, tambahan
   perpanjangan, serta geseran tenggat duplikat proyek dihitung dalam hari kerja. Tenggat lama yang
   sudah jatuh di akhir pekan tetap sah selama tak diubah. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const I = require('../public/inti');

const H = '2026-11-11';                       // Rabu
const W = Date.UTC(2026, 10, 11, 3, 0, 0);
const SABTU = '2026-11-14', MINGGU = '2026-11-15', SENIN = '2026-11-16', JUMAT = '2026-11-13';
const AKHIR_PEKAN = /tidak boleh hari Sabtu atau Minggu/;
const dataBaru = () => ({ ...I.dataKosong(), projects: [], tasks: [], log: [] });
const rutin = (d, f = {}, me = 'alya') => I.taskBaru(d, { title: 'Rekap mingguan', sub: 'R1', pic: 'kiki', due: JUMAT, ...f }, me, W, H);

test.afterEach(() => { I.aturMaster([]); I.aturOrang([]); });

test('hitungan hari kerja: Sabtu dan Minggu tak dihitung, juga untuk rentang panjang', () => {
  assert.deepEqual([I.akhirPekan(JUMAT), I.akhirPekan(SABTU), I.akhirPekan(MINGGU), I.akhirPekan(SENIN)], [false, true, true, false]);
  assert.equal(I.hariKerja(JUMAT, SENIN), 1, 'Jumat → Senin');
  assert.equal(I.hariKerja(JUMAT, SABTU), 0);
  assert.equal(I.hariKerja('2026-01-05', '2026-07-24'), 144, 'tak lagi dibatasi 90');
  assert.deepEqual([I.jarakHariKerja(SENIN, JUMAT), I.jarakHariKerja(JUMAT, SENIN)], [-1, 1]);
  assert.deepEqual([SABTU, MINGGU, SENIN, JUMAT].map(I.hariKerjaBerikut), [SENIN, SENIN, SENIN, JUMAT]);
  assert.deepEqual([I.tambahHariKerja(JUMAT, 1), I.tambahHariKerja(SENIN, 5), I.tambahHariKerja(SENIN, -1), I.tambahHariKerja(SABTU, 0)],
    [SENIN, '2026-11-23', JUMAT, SENIN]);
  // Telat dalam hari kerja, paling sedikit 1 selama sudah lewat.
  assert.deepEqual([H, JUMAT, SABTU, MINGGU, SENIN, '2026-11-17'].map(h => I.hariTelat(JUMAT, h)), [0, 0, 1, 1, 1, 2]);
  assert.equal(I.hariTelat('2026-09-25', '2026-10-16'), 15, 'tiga minggu = 15 hari kerja, bukan 21 hari');
});

test('tenggat awal task tak boleh Sabtu/Minggu, dan yang ditolak tak mengubah data apa pun', () => {
  const d = dataBaru();
  const sebelum = JSON.stringify(d);
  for (const due of [SABTU, MINGGU]) assert.throws(() => rutin(d, { due }), AKHIR_PEKAN);
  assert.equal(JSON.stringify(d), sebelum, 'nomor task dan riwayat tak terpakai');
  const t = rutin(d);
  assert.equal(t.due, JUMAT);
  assert.equal(rutin(d, { due: '' }).due, '', 'tanpa tenggat tetap boleh');
  // Lewat perintah (jalur browser, server, dan agen AI).
  const r = I.jalankanPerintah(d, { aksi: 'taskBaru', isi: { f: { title: 'X', sub: 'R1', pic: 'kiki', due: MINGGU } }, oleh: 'alya', at: W, hari: H });
  assert.deepEqual([r.ok, r.galat], [false, I.TENGGAT_AKHIR_PEKAN]);
  // Task turunan.
  assert.throws(() => I.taskAnak(d, t, { title: 'Bagian', pic: 'kiki', due: SABTU }, 'alya', W, H), AKHIR_PEKAN);
});

test('mengubah tenggat: ke Sabtu/Minggu ditolak; tenggat lama yang sudah di akhir pekan boleh dibiarkan', () => {
  const d = dataBaru();
  const t = rutin(d);
  assert.throws(() => I.ubahTask(d, t, { due: SABTU }, 'alya', W + 1), AKHIR_PEKAN);
  assert.equal(t.due, JUMAT);
  t.due = MINGGU;   // tenggat dari sebelum 2.59.0
  I.ubahTask(d, t, { title: 'Rekap mingguan tim' }, 'alya', W + 2);
  I.ubahTask(d, t, { title: 'Rekap mingguan tim LA', due: MINGGU }, 'alya', W + 3);
  assert.deepEqual([t.title, t.due], ['Rekap mingguan tim LA', MINGGU], 'tak diubah = tetap sah');
  I.ubahTask(d, t, { due: SENIN }, 'alya', W + 4);
  assert.equal(t.due, SENIN);
});

test('perpanjangan tenggat: tanggal baru dan tanggal yang disetujui harus hari kerja', () => {
  const d = dataBaru();
  const t = rutin(d);
  assert.throws(() => I.ajukanPerpanjangan(d, t, { due: SABTU, alasan: 'Menunggu data' }, 'kiki', W + 1, H), AKHIR_PEKAN);
  const x = I.ajukanPerpanjangan(d, t, { due: '2026-11-18', alasan: 'Menunggu data' }, 'kiki', W + 2, H);
  assert.throws(() => I.jawabPerpanjangan(d, x, { setuju: true, due: '2026-11-21' }, 'alya', W + 3), AKHIR_PEKAN);
  assert.equal(t.due, JUMAT, 'yang ditolak tak mengubah tenggat');
  I.jawabPerpanjangan(d, x, { setuju: true, due: SENIN }, 'alya', W + 4);
  assert.equal(t.due, SENIN);
});

test('tenggat Proyek umum, permintaan lanjutan, dan elaborasi paket juga hari kerja', () => {
  const d = dataBaru();
  const umum = f => I.proyekBaru(d, { jenis: 'umum', name: 'Rekrutmen guru', tim: ['CO', 'LA'], tahap: I.TEMPLAT_TAHAP.rekrutmen, ...f }, 'dhea', W);
  assert.throws(() => umum({ tenggat: MINGGU }), AKHIR_PEKAN);
  const p = umum({ tenggat: SENIN });
  assert.throws(() => I.ubahProyek(d, p, { tenggat: SABTU }, 'dhea', W + 1), AKHIR_PEKAN);
  assert.equal(p.tenggat, SENIN);
  // Permintaan lanjutan: tenggat harapan, lalu tenggat task saat diterima.
  const asal = Object.assign(rutin(d), { status: 'Selesai', selesaiAt: W });
  assert.throws(() => I.mintaLanjutan(d, asal, { ke: 'ali', judul: 'Prototype', due: SABTU }, 'kiki', W + 2, H), AKHIR_PEKAN);
  const m = I.mintaLanjutan(d, asal, { ke: 'ali', judul: 'Prototype', sub: 'R2', due: JUMAT }, 'kiki', W + 3, H);
  assert.throws(() => I.terimaPermintaan(d, m, { due: MINGGU }, 'ali', W + 4, H), AKHIR_PEKAN);
  m.due = SABTU;   // harapan dari sebelum 2.59.0: tenggat awal task-nya tetap harus hari kerja
  assert.throws(() => I.terimaPermintaan(d, m, {}, 'ali', W + 5, H), AKHIR_PEKAN);
  assert.equal(I.terimaPermintaan(d, m, { due: SENIN }, 'ali', W + 6, H).due, SENIN);
  // Elaborasi: ditolak sebelum proyeknya dibuat.
  const nProyek = d.projects.length;
  assert.throws(() => I.elaborasiPaket(d, { id: 'PKG-001', items: [] }, { due: SABTU }, 'nynda', W + 7, H), AKHIR_PEKAN);
  assert.equal(d.projects.length, nProyek);
});

test('tindak lanjut notulen: tenggat baru atau yang diubah harus hari kerja', () => {
  const a = { ...I.periksaAgenda({ judul: 'Rapat', tanggal: H, peserta: ['kiki'] }), id: 'agrapat1', pemilik: 'andika' };
  const butir = due => [{ id: 'tlsatu1', teks: 'Kirim blueprint', pic: 'andika', due }];
  assert.throws(() => I.ubahNotulen(a, 'kiki', { notulen: 'x', tindak: butir(SABTU), versi: 0 }, 100), AKHIR_PEKAN);
  const n1 = I.ubahNotulen(a, 'kiki', { notulen: 'x', tindak: butir(JUMAT), versi: 0 }, 100);
  const lama = { ...n1, tindak: n1.tindak.map(b => ({ ...b, due: MINGGU })) };   // dari sebelum 2.59.0
  assert.equal(I.ubahNotulen(lama, 'kiki', { notulen: 'y', tindak: butir(MINGGU), versi: 100 }, 110).tindak[0].due, MINGGU);
});

test('app.js: telat dalam hari kerja; isian tenggat memberi tahu Sabtu/Minggu; bawaan tanggal digeser ke Senin', () => {
  const APP = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
  assert.match(APP, /tr\('Telat \{n\} hr', \{ n: I\.hariTelat\(t\.due, hariIni\(\)\) \}\)/);
  assert.equal((APP.match(/terlambat \{n\} hari kerja/g) || []).length, 4, 'notifikasi, Perlu perhatian, dan detail');
  assert.match(APP, /tr\('Terlambat \{n\} hari kerja', \{ n: I\.hariTelat\(t\.due, h\) \}\)/);
  assert.doesNotMatch(APP, /terlambat \{n\} hari'|Terlambat \{n\} hari'|n: I\.selisihHari\(t\.due/, 'tak ada lagi hitungan telat hari kalender');
  assert.match(APP, /const n = I\.hariKerja\(x\.dueLama, x\.dueBaru\); return n > 0 \? tr\('\+\{n\} hari kerja'/);
  assert.match(APP, /if \(el\.matches\(ISIAN_TENGGAT\)\) periksaIsianTenggat\(el, true\);/);
  assert.match(APP, /const salah = !!el\.value && el\.value !== el\.defaultValue && I\.akhirPekan\(el\.value\);/);
  for (const pola of [/const min = tglKerja\(/, /value="\$\{esc\(tglKerja\(x\.dueBaru\)\)\}"/, /value="\$\{esc\(preset\.due \? tglKerja\(preset\.due\) : ''\)\}"/]) assert.match(APP, pola);
});
