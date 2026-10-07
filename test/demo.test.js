/* Skenario contoh (scripts/_demo.js) harus menghasilkan keadaan yang dijanjikannya, dengan
   aturan aplikasi yang sesungguhnya. Data di sini buatan, berbentuk hasil _v1ke2.ubah. */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');
const { tambahDemo } = require('../scripts/_demo');
const { dataDemo: data, SEKARANG, HARI } = require('./bantu/data-demo');

test('skenario contoh: alur PRD berjalan sungguhan — batch beralur, delegasi, gate, capaian, penutupan siklus', () => {
  const d = data();
  const r = tambahDemo(d, SEKARANG);
  const per = id => d.packages.find(p => p.id === id);
  const ringkas = id => I.ringkasPaket(per(id), I.setoranPaket(d, per(id)));
  const proyekDari = id => d.projects.find(p => p.paket === id);

  // PKG-001: 11 batch di capaian berbeda.
  const tka = proyekDari('PKG-001');
  const tTka = d.tasks.filter(t => t.project === tka.id);
  const h = id => I.hitungTarget(per('PKG-001').items.find(i => i.id === id), I.setoranPaket(d, per('PKG-001')).get(id));
  assert.equal(h('ITM-1').status, 'penuh', 'batch pertama sudah tayang');
  assert.ok(Object.values(per('PKG-001').items).some(it => h(it.id).capaian.input > 0 && h(it.id).terpenuhi < it.target), 'ada yang baru ter-input');
  const rTka = ringkas('PKG-001');
  assert.ok(rTka.persen > rTka.persenTayang, 'progres berbobot di atas yang sudah tayang');
  assert.ok(rTka.persen < 100);
  assert.ok(tTka.some(t => I.labelKeadaan(t, I.indeks(d)) === 'Revisi'), 'ada langkah yang dikembalikan');
  assert.equal(tTka.filter(t => t.tertahan).length, 1);
  assert.equal(tTka.filter(t => I.telat(t, HARI) && !t.tertahan).length, 1);
  assert.ok(tTka.some(t => t.status === 'Ditinjau'));
  const antrean = I.pekerjaanSaya(d, 'alya', HARI).grup.find(g => g.kunci === 'antrean');
  assert.ok(antrean && antrean.isi.length >= 2, 'langkah siap di antrean Alya, menunggu didelegasikan');
  assert.ok(tTka.filter(t => I.selesai(t)).every(t => t.output && t.evidence.length), 'setiap langkah yang lolos punya output & bukti');
  assert.ok(tTka.filter(t => I.selesai(t) && I.orang(t.pic).peran === 'staff').length > 10, 'pekerjaan didelegasikan ke staff');

  // PKG-004: satu siklus penuh, ditutup E12 → antrean keputusan Manager.
  const ojk = proyekDari('PKG-004');
  assert.equal(per('PKG-004').items.length, 5);
  assert.equal(ringkas('PKG-004').persen, 100);
  assert.deepEqual([ojk.decision, ojk.lead], ['Build', '']);
  assert.ok(I.siklusTutup(d, ojk));
  assert.deepEqual(I.antreKeputusan(d, HARI).map(p => p.id), [ojk.id]);

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
