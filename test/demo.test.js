/* Skenario contoh (scripts/_demo.js) harus menghasilkan keadaan yang dijanjikannya, dengan
   aturan aplikasi yang sesungguhnya. Data di sini buatan, berbentuk hasil _v1ke2.ubah. */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');
const { tambahDemo } = require('../scripts/_demo');
const { dataDemo: data, SEKARANG, HARI } = require('./bantu/data-demo');

test('skenario contoh: proyek berjalan per tahap ADDIE — task anak, gate, capaian, penutupan siklus', () => {
  const d = data();
  const r = tambahDemo(d, SEKARANG);
  const perId = I.indeks(d);
  const per = id => d.packages.find(p => p.id === id);
  const ringkas = id => I.ringkasPaket(per(id), I.setoranPaket(d, per(id)));
  const proyekDari = id => d.projects.find(p => p.paket === id);
  const urut = I.TAHAP.map(x => x.id);

  // PKG-001: Design tuntas, Development berjalan; Implementation & Evaluation menunggu.
  const tka = proyekDari('PKG-001');
  const tTka = d.tasks.filter(t => t.project === tka.id);
  assert.equal(tka.stage, 'V');
  assert.ok(tTka.filter(t => t.stage === 'D').every(I.selesai), 'Design tuntas');
  assert.ok(tTka.filter(t => ['I', 'E'].includes(t.stage)).every(t => t.status === 'Antre' && I.depsBelum(t, perId).length),
    'Implementation & Evaluation menunggu Development selesai');
  const h = id => I.hitungTarget(per('PKG-001').items.find(i => i.id === id), I.setoranPaket(d, per('PKG-001')).get(id));
  assert.equal(h('ITM-1').capaian.konten, 1, 'Dibimbing: rancangan D5 lolos = konten siap');
  assert.ok(per('PKG-001').items.some(it => h(it.id).capaian.input > 0), 'ada batch yang sudah ter-input');
  const rTka = ringkas('PKG-001');
  assert.ok(rTka.persen > rTka.persenTayang, 'progres berbobot di atas yang sudah tayang');
  assert.ok(rTka.persen < 100);
  assert.ok(tTka.some(t => t.induk && I.labelKeadaan(t, perId) === 'Revisi'), 'ada task anak yang dikembalikan');
  assert.equal(tTka.filter(t => t.tertahan).length, 1);
  assert.equal(tTka.filter(t => I.telat(t, HARI) && !t.tertahan).length, 1);
  assert.ok(tTka.some(t => t.induk && t.status === 'Ditinjau' && I.orang(I.peninjau(t)).peran === 'lead'), 'task anak menunggu tinjauan Lead');
  assert.ok(tTka.some(t => !t.induk && t.status === 'Ditinjau' && I.peninjau(t) === I.MANAGER), 'langkah Lead menunggu tinjauan Manager');
  const antrean = I.pekerjaanSaya(d, 'alya', HARI).grup.find(g => g.kunci === 'antrean');
  assert.ok(antrean && antrean.isi.length >= 2, 'langkah siap di antrean Alya, menunggu dibagi');
  assert.ok(tTka.filter(t => I.selesai(t)).every(t => t.output && t.evidence.length), 'setiap langkah yang lolos punya output & bukti');

  // Hirarki: task anak dipegang staff tim Lead induknya, di tahap yang sama; induk yang lolos,
  // semua anaknya lolos lebih dulu. Tak ada lagi langkah Lead yang diserahkan ke staff.
  const anak = d.tasks.filter(t => t.induk);
  assert.ok(tTka.filter(t => t.induk).length > 10, 'pekerjaan dibagi ke staff lewat task anak');
  for (const a of anak) {
    const induk = perId.get(a.induk);
    assert.ok(I.timDari(induk.pic).includes(a.pic) && a.stage === induk.stage && a.project === induk.project, `${a.id} di bawah ${induk.id}`);
  }
  assert.ok(d.tasks.filter(t => I.selesai(t) && !t.induk).every(t => I.anakTask(perId, t.id).every(x => I.selesai(x) && x.selesaiAt <= t.selesaiAt)));
  assert.ok(d.tasks.filter(t => t.project && !t.induk).every(t => I.orang(t.pic).peran !== 'staff'), 'langkah proyek tetap dipegang Lead/Manager');

  // PKG-004: satu siklus penuh, tahap demi tahap, ditutup E12 → antrean keputusan Manager.
  const ojk = proyekDari('PKG-004');
  const tOjk = d.tasks.filter(t => t.project === ojk.id);
  assert.equal(per('PKG-004').items.length, 5);
  assert.equal(ringkas('PKG-004').persen, 100);
  assert.deepEqual([ojk.decision, ojk.lead], ['Build', '']);
  assert.ok(I.siklusTutup(d, ojk));
  assert.deepEqual(I.antreKeputusan(d, HARI).map(p => p.id), [ojk.id]);
  for (const t of tOjk) {
    const dulu = tOjk.filter(x => t.sub === 'E12' && !t.induk ? x.sub !== 'E12' : urut.indexOf(x.stage) < urut.indexOf(t.stage));
    assert.ok(dulu.every(x => x.selesaiAt < t.selesaiAt), `${t.id} ${t.sub} selesai setelah tahap sebelumnya tuntas`);
  }

  // PKG-006: target contoh, belum dielaborasi.
  assert.equal(per('PKG-006').items.length, 6);
  assert.equal(proyekDari('PKG-006'), undefined);
  assert.equal(ringkas('PKG-006').terbuka, 6, 'semua targetnya siap dielaborasi');

  // Riwayat tetap terbaru di atas; waktu tak ada yang di masa depan.
  assert.ok(d.log.every((l, i) => i === 0 || d.log[i - 1].at >= l.at));
  assert.ok(d.log.every(l => l.at <= SEKARANG));
  assert.ok(d.tasks.every(t => !t.selesaiAt || t.selesaiAt <= SEKARANG));
  assert.ok(r.task > 100 && r.setoran === d.setoran.length);
  assert.ok(d.notes.every(n => n.folder === 'Contoh') && d.links.every(l => l.folder === 'Contoh' && /^https:/.test(l.url)));
});
