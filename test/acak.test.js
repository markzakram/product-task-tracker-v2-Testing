/* Simulasi acak dengan benih tetap: ratusan aksi sungguhan di atas skenario contoh — aksi status,
   output & bukti, task anak, ganti PIC dan sub-stage, sub-task — oleh orang yang berganti-ganti.
   Tiap langkah memeriksa bahwa hirarki task tetap utuh, task tak pernah dimulai selagi menunggu
   tahap sebelumnya, aksi yang ditolak ditolak dengan pesan (bukan galat program), dan semua
   hitungan tampilan tetap jalan. Pelengkap tes per aturan: menangkap kombinasi yang tak
   terpikirkan satu per satu. */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');
const { tambahDemo } = require('../scripts/_demo');
const { dataDemo, SEKARANG, HARI } = require('./bantu/data-demo');

/* mulberry32: deret acak yang bisa diulang dari benihnya. */
function pembuatAcak(benih) {
  let a = benih >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ORANG = I.ORANG.map(o => o.id);
const galatProgram = e => !(e instanceof Error) || e instanceof TypeError || e instanceof ReferenceError || e instanceof RangeError || !e.message;

function periksaHirarki(d, langkah) {
  const perId = I.indeks(d);
  for (const a of d.tasks.filter(t => t.induk)) {
    const p = perId.get(a.induk);
    const ket = `langkah ${langkah}, ${a.id} di bawah ${a.induk}`;
    assert.ok(p, `${ket}: induknya ada`);
    assert.ok(!p.induk, `${ket}: satu tingkat`);
    assert.equal(a.project, p.project, `${ket}: proyek sama`);
    assert.equal(a.cycle || 1, p.cycle || 1, `${ket}: siklus sama`);
    if (p.lane === 'proyek') assert.equal(a.stage, p.stage, `${ket}: tahap sama`);
    assert.equal(I.orang(a.pic).peran, 'staff', `${ket}: dipegang staff`);
    assert.ok(I.timDari(p.pic).includes(a.pic), `${ket}: staff tim ${p.pic}`);
  }
  for (const p of d.tasks) {
    const anak = I.anakTask(perId, p.id);
    if (!anak.length) continue;
    assert.equal(I.orang(p.pic).peran, 'lead', `langkah ${langkah}, ${p.id}: induk dipegang Lead`);
    if (p.status === 'Ditinjau' || I.selesai(p)) {
      assert.ok(anak.every(I.selesai), `langkah ${langkah}, ${p.id} ${p.status}: semua task anaknya selesai (${anak.map(x => x.id + ' ' + x.status).join(', ')})`);
    }
  }
}

function periksaTampilan(d) {
  const perId = I.indeks(d);
  for (const me of ORANG) {
    const kerja = I.pekerjaanSaya(d, me, HARI);
    const antrean = kerja.grup.find(g => g.kunci === 'antrean');
    if (antrean) assert.ok(antrean.isi.every(x => !I.anakTask(perId, x.t.id).length), `${me}: antrean tanpa langkah yang sudah dibagi`);
    I.notifikasi(d, me);
    for (const t of d.tasks) I.aksiUntuk(t, me, perId);
  }
  I.laporan(d, HARI);
  for (const t of d.tasks) { I.alasanTunggu(t, perId); I.syaratAjukan(t, perId); I.labelKeadaan(t, perId); }
  for (const p of d.projects) I.ringkasProyek(d, p, HARI, perId);
  for (const p of d.packages) I.ringkasPaket(p, I.setoranPaket(d, p));
}

function simulasi(benih, jumlah) {
  const d = dataDemo();
  tambahDemo(d, SEKARANG);
  I.taskBaru(d, { title: 'Show/hide paket harian', sub: 'R3', pic: 'alya' }, 'alya', SEKARANG, HARI);
  const r = pembuatAcak(benih);
  const pilih = xs => xs[Math.floor(r() * xs.length)];
  const hitung = { aksi: 0, ditolak: 0, anak: 0, pic: 0, sub: 0, subtask: 0 };
  let w = SEKARANG;
  const coba = (f, label) => {
    try { f(); return true; } catch (e) {
      assert.ok(!galatProgram(e), `${label}: galat program — ${e && e.stack}`);
      hitung.ditolak++;
      return false;
    }
  };
  for (let i = 0; i < jumlah; i++) {
    w += 60e3;
    const perId = I.indeks(d);
    const t = pilih(d.tasks);
    const pelaku = pilih([t.pic, I.peninjau(t) || t.pic, I.MANAGER, I.orang(t.pic).lead || I.MANAGER, pilih(ORANG)]);
    const jenis = r();
    if (jenis < 0.4) {
      // Aksi status yang ditawarkan ke orang itu: yang nonaktif harus ditolak, sisanya harus jalan.
      const aksi = I.aksiUntuk(t, pelaku, perId);
      if (!aksi.length) continue;
      const a = pilih(aksi);
      if (a.nonaktif) {
        assert.throws(() => I.terapkanAksi(d, t, a.kunci, pelaku, w, 'catatan uji'), e => !galatProgram(e));
        hitung.ditolak++;
      } else {
        const menunggu = I.depsBelum(t, perId).length;
        I.terapkanAksi(d, t, a.kunci, pelaku, w, 'catatan uji');
        if (a.kunci === 'mulai') assert.equal(menunggu, 0, `${t.id} dimulai selagi menunggu`);
        I.segarkanTahap(d, w, pelaku);
        hitung.aksi++;
      }
    } else if (jenis < 0.55) {
      if (I.aktif(t)) coba(() => { I.isiOutput(d, t, 'Hasil uji ' + i, t.pic, w); I.tambahBukti(d, t, { url: 'https://contoh.id/' + t.id }, t.pic, w); }, 'output');
    } else if (jenis < 0.7) {
      // Lead membagi task yang ia pegang; ditolak tepat saat bolehBuatAnak menolak.
      const staf = I.timDari(t.pic);
      const bisa = I.bolehBuatAnak(t, t.pic);
      const ok = coba(() => I.taskAnak(d, t, { title: 'Bagian uji ' + i, pic: staf.length ? pilih(staf) : 'kiki' }, t.pic, w, HARI), 'anak');
      assert.equal(ok, bisa, `${t.id}: taskAnak ${ok ? 'lolos' : 'ditolak'}, padahal bolehBuatAnak = ${bisa}`);
      if (ok) hitung.anak++;
    } else if (jenis < 0.8) {
      const lama = t.pic;
      const baru = pilih(ORANG);
      if (coba(() => I.ubahTask(d, t, { pic: baru }, pelaku, w), 'pic') && baru !== lama) {
        hitung.pic++;
        assert.ok(!(I.orang(lama).peran === 'lead' && I.orang(baru).peran === 'staff'), `${t.id}: task Lead pindah ke staff`);
      }
    } else if (jenis < 0.88) {
      if (coba(() => I.ubahTask(d, t, { sub: pilih(I.SUB_TAHAP).kode }, pelaku, w), 'sub')) hitung.sub++;
    } else {
      const s = t.subtasks.length ? pilih(t.subtasks) : null;
      const op = r();
      const ok = coba(() => {
        if (!s || op < 0.3) I.tambahSubtask(d, t, { title: 'Cek ' + i, pic: t.pic }, pelaku, w);
        else if (op < 0.6) I.ubahSubtask(d, t, s.id, { title: s.title + ' (ubah)', pic: pilih(ORANG) }, pelaku, w);
        else if (op < 0.8) s.done = !s.done;
        else I.hapusSubtask(d, t, s.id, pelaku, w);
      }, 'subtask');
      if (ok) hitung.subtask++;
    }
    periksaHirarki(d, i);
    if (i % 100 === 0) periksaTampilan(d);
  }
  periksaTampilan(d);
  return hitung;
}

test('simulasi acak: hirarki, urutan tahap, dan semua hitungan tetap utuh di bawah ratusan aksi', () => {
  for (const benih of [20261009, 7, 424242]) {
    const hitung = simulasi(benih, 500);
    for (const [k, n] of Object.entries(hitung)) assert.ok(n > 0, `benih ${benih}: ${k} terjadi (${n})`);
  }
});
