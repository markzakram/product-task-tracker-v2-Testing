/* Data real (2.16.0): perintah dijalankan dengan aturan (jalankanPerintah), yang disimpan dan
   dibagikan adalah PERUBAHANNYA (bedaData), dan browser lain menerapkannya apa adanya
   (terapkanUbah). Janji utamanya: menerapkan deret perubahan menghasilkan data yang persis sama
   dengan menjalankan deret perintahnya — juga untuk ratusan perintah acak. */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');
const { tambahDemo } = require('../scripts/_demo');
const { dataDemo, SEKARANG, HARI } = require('./bantu/data-demo');

const salin = d => JSON.parse(JSON.stringify(d));
const bersama = d => JSON.stringify(Object.fromEntries([...I.KOLEKSI_REAL, 'log'].map(k => [k, d[k]])));
let n = 0;
const perintah = (aksi, isi, oleh, at, hari = HARI) => ({ id: 'p' + String(++n).padStart(6, '0'), aksi, isi, oleh, at, hari });

/* Menjalankan perintah di "server" (data a) dan meneruskan perubahannya ke "browser" (data b). */
function jalankanDua(a, b, p) {
  const sebelum = salin(a);
  const r = I.jalankanPerintah(a, p);
  if (!r.ok) {
    // Yang gagal tak boleh disimpan; server membuang salinannya. Di sini a dipulihkan.
    Object.assign(a, sebelum);
    return r;
  }
  const ubah = JSON.parse(JSON.stringify(I.bedaData(sebelum, a)));   // seperti lewat spreadsheet
  I.terapkanUbah(b, ubah);
  return { ...r, ubah };
}

test('dari data kosong: proyek, paket, elaborasi, task anak, tinjauan — perubahan = perintah', () => {
  const a = I.dataKosong(), b = I.dataKosong();
  let w = SEKARANG;
  const jalan = (aksi, isi, oleh) => {
    const r = jalankanDua(a, b, perintah(aksi, isi, oleh, (w += 60e3)));
    assert.ok(r.ok, `${aksi} oleh ${oleh}: ${r.galat}`);
    return r;
  };
  const prj = jalan('proyekBaru', { f: { name: 'Produksi Uji', platform: 'OJK', goal: 'Uji data real' } }, 'nynda').hasil;
  jalan('taskBaru', { f: { title: 'A1 intake', project: prj.id, sub: 'A1', pic: 'nynda' } }, 'nynda');
  const pkg = jalan('paketBaru', { f: { namaPaket: 'Paket Uji', platform: 'OJK' } }, 'nynda').hasil;
  jalan('simpanPaket', { paket: pkg.id, f: { ...a.packages[0], items: [{ id: 'ITM-1', kategori: 'Latsol', grup: '', nama: 'Fisika', target: 4, satuan: 'Paket', awal: 0, catatan: '' }] } }, 'nynda');
  const elab = jalan('elaborasiPaket', { paket: pkg.id, f: { items: ['ITM-1'], proyek: prj.id } }, 'nynda');
  assert.deepEqual(I.ringkasHasil(elab.hasil).project, prj.id);
  assert.ok(elab.ubah.setoran && elab.ubah.tasks.pasang.length >= 8, 'perubahan elaborasi memuat task dan setoran baru');
  // A1 selesai → Development terbuka; Andika membagi DV1 ke Uma, Uma mengerjakan, Andika menyetujui.
  const a1 = a.tasks.find(t => t.sub === 'A1');
  jalan('isiOutput', { task: a1.id, isi: 'Kebutuhan tercatat' }, 'nynda');
  jalan('tambahBukti', { task: a1.id, f: { url: 'https://contoh.id/a1' } }, 'nynda');
  jalan('terapkanAksi', { task: a1.id, kunci: 'mulai' }, 'nynda');
  jalan('terapkanAksi', { task: a1.id, kunci: 'selesai' }, 'nynda');
  const dv1 = a.tasks.find(t => t.sub === 'DV1');
  const anak = jalan('taskAnak', { induk: dv1.id, f: { title: 'Soal 1–20', pic: 'uma' } }, 'andika').hasil;
  jalan('tambahSubtask', { task: anak.id, f: { title: 'Kunci jawaban', pic: 'uma' } }, 'uma');
  const sub = a.tasks.find(t => t.id === anak.id).subtasks[0];
  jalan('centangSubtask', { task: anak.id, sub: sub.id, done: true }, 'uma');
  jalan('isiOutput', { task: anak.id, isi: '20 soal' }, 'uma');
  jalan('tambahBukti', { task: anak.id, f: { url: 'https://contoh.id/soal' } }, 'uma');
  jalan('terapkanAksi', { task: anak.id, kunci: 'mulai' }, 'uma');
  jalan('terapkanAksi', { task: anak.id, kunci: 'ajukan' }, 'uma');
  jalan('terapkanAksi', { task: anak.id, kunci: 'kembalikan', catatan: 'Nomor 5 salah' }, 'andika');
  jalan('terapkanAksi', { task: anak.id, kunci: 'ajukan' }, 'uma');
  jalan('terapkanAksi', { task: anak.id, kunci: 'setujui' }, 'andika');
  jalan('simpanDashboard', { f: { title: 'Dashboard OJK', url: 'https://contoh.id/dash' } }, 'nynda');
  jalan('hapusSetoran', { setoran: a.setoran[0].id }, 'nynda');
  assert.equal(bersama(b), bersama(a), 'data browser = data server');
  assert.equal(a.projects[0].stage, 'V', 'tahap proyek ikut dihitung di dalam perintah');
  assert.ok(b.log.length > 20 && b.log[0].at >= b.log[b.log.length - 1].at, 'riwayat ikut, terbaru di atas');
});

test('perintah yang melanggar aturan ditolak dengan pesannya, dan tak menghasilkan perubahan', () => {
  const a = I.dataKosong(), b = I.dataKosong();
  const prj = I.jalankanPerintah(a, perintah('proyekBaru', { f: { name: 'P' } }, 'nynda', SEKARANG)).hasil;
  Object.assign(b, salin(a));
  const r = jalankanDua(a, b, perintah('proyekBaru', { f: { name: 'Q' } }, 'kiki', SEKARANG + 1));
  assert.deepEqual([r.ok, r.galat], [false, 'Hanya Manager yang membuat proyek.']);
  assert.equal(I.jalankanPerintah(a, perintah('terapkanAksi', { task: 'PRD-404', kunci: 'mulai' }, 'kiki', SEKARANG)).galat, 'Task PRD-404 tidak ditemukan.');
  assert.match(I.jalankanPerintah(a, perintah('hapusSemua', {}, 'nynda', SEKARANG)).galat, /tidak dikenal/);
  assert.equal(bersama(b), bersama(a));
  assert.equal(prj.id, 'PRJ-1');
});

test('periksaPerintah: hanya aksi yang dikenal, isi objek, ID dan tanggal yang rapi, ukuran secukupnya', () => {
  const ok = I.periksaPerintah({ id: 'abc123', aksi: 'taskBaru', isi: { f: { title: 'x' } }, hari: '2026-10-09', at: 5, oleh: 'menyamar' });
  assert.deepEqual(ok, { id: 'abc123', aksi: 'taskBaru', isi: { f: { title: 'x' } }, hari: '2026-10-09', at: 5 }, 'oleh tak ikut: server yang menentukan');
  assert.throws(() => I.periksaPerintah({ id: 'abc123', aksi: 'constructor', isi: {} }), /tidak dikenal/);
  assert.throws(() => I.periksaPerintah({ id: 'abc123', aksi: 'taskBaru', isi: [1] }), /Isi perubahan/);
  assert.throws(() => I.periksaPerintah({ id: 'a b', aksi: 'taskBaru', isi: {} }), /ID perubahan/);
  assert.throws(() => I.periksaPerintah({ id: 'abc123', aksi: 'taskBaru', isi: {}, hari: 'kemarin' }), /Tanggal/);
  assert.throws(() => I.periksaPerintah({ id: 'abc123', aksi: 'taskBaru', isi: { f: { detail: 'x'.repeat(45000) } } }), /terlalu besar/);
});

test('terapkanUbah: timpa di tempat, hapus, task baru di depan, setoran baru di belakang, log dibatasi 1000', () => {
  const d = I.dataKosong();
  d.tasks = [{ id: 'PRD-002', title: 'lama' }, { id: 'PRD-001', title: 'satu' }];
  d.setoran = [{ id: 's1' }];
  d.log = Array.from({ length: 1000 }, (_, i) => ({ id: 'l' + i, at: 1000 - i }));
  I.terapkanUbah(d, {
    tasks: { pasang: [{ id: 'PRD-004' }, { id: 'PRD-003' }, { id: 'PRD-001', title: 'diubah' }], hapus: ['PRD-002'] },
    setoran: { pasang: [{ id: 's2' }] },
    log: [{ id: 'lbaru', at: 2000 }],
  });
  assert.deepEqual(d.tasks.map(t => t.id + (t.title ? ':' + t.title : '')), ['PRD-004', 'PRD-003', 'PRD-001:diubah']);
  assert.deepEqual(d.setoran.map(s => s.id), ['s1', 's2']);
  assert.deepEqual([d.log.length, d.log[0].id], [1000, 'lbaru']);
  assert.equal(I.bedaData(d, d).tasks, undefined, 'tanpa perubahan, tanpa isi');
});

/* mulberry32, seperti test/acak.test.js. */
function pembuatAcak(benih) {
  let x = benih >>> 0;
  return () => {
    x = (x + 0x6D2B79F5) >>> 0;
    let t = x;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('simulasi acak: ratusan perintah sungguhan, perubahan yang diteruskan selalu sama dengan perintahnya', () => {
  const ORANG = I.ORANG.map(o => o.id);
  for (const benih of [11, 2026]) {
    const a = dataDemo();
    tambahDemo(a, SEKARANG);
    const b = salin(a);
    const r = pembuatAcak(benih);
    const pilih = xs => xs[Math.floor(r() * xs.length)];
    let w = SEKARANG, ok = 0, tolak = 0;
    for (let i = 0; i < 400; i++) {
      w += 60e3;
      const t = pilih(a.tasks);
      const oleh = pilih([t.pic, I.peninjau(t) || t.pic, I.MANAGER, I.orang(t.pic).lead || I.MANAGER, pilih(ORANG)]);
      const j = r();
      let p;
      if (j < 0.4) {
        const aksi = I.aksiUntuk(t, oleh, I.indeks(a)).filter(x => !x.nonaktif);
        if (!aksi.length) continue;
        p = perintah('terapkanAksi', { task: t.id, kunci: pilih(aksi).kunci, catatan: 'catatan uji' }, oleh, w);
      } else if (j < 0.5) p = perintah('isiOutput', { task: t.id, isi: 'Hasil ' + i }, t.pic, w);
      else if (j < 0.58) p = perintah('tambahBukti', { task: t.id, f: { url: 'https://contoh.id/' + i } }, t.pic, w);
      else if (j < 0.7) p = perintah('taskAnak', { induk: t.id, f: { title: 'Bagian ' + i, pic: pilih(I.timDari(t.pic).concat('kiki')) } }, t.pic, w);
      else if (j < 0.78) p = perintah('ubahTask', { task: t.id, f: { pic: pilih(ORANG) } }, oleh, w);
      else if (j < 0.84) p = perintah('ubahTask', { task: t.id, f: { sub: pilih(I.SUB_TAHAP).kode, due: '2026-11-0' + (1 + (i % 9)) } }, oleh, w);
      else if (j < 0.9) p = perintah('tambahSubtask', { task: t.id, f: { title: 'Cek ' + i, pic: t.pic } }, oleh, w);
      else {
        const s = t.subtasks.length ? pilih(t.subtasks) : null;
        if (!s) continue;
        p = r() < 0.6 ? perintah('centangSubtask', { task: t.id, sub: s.id, done: !s.done }, oleh, w)
          : perintah('hapusSubtask', { task: t.id, sub: s.id }, oleh, w);
      }
      const hasil = jalankanDua(a, b, p);
      if (hasil.ok) ok++; else tolak++;
      if (i % 50 === 0) assert.equal(bersama(b), bersama(a), `benih ${benih}, langkah ${i}`);
    }
    assert.equal(bersama(b), bersama(a), `benih ${benih}: akhir`);
    assert.ok(ok > 100 && tolak > 20, `benih ${benih}: ${ok} diterima, ${tolak} ditolak`);
  }
});
