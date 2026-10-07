/* Halaman Panduan: isinya utuh, dan setiap tombol "Coba sekarang" menemukan contoh nyata di
   skenario contoh (scripts/_demo.js) — dengan aturan aplikasi yang sesungguhnya. */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');
const P = require('../public/panduan');
const { tambahDemo } = require('../scripts/_demo');
const { dataDemo, SEKARANG, HARI } = require('./bantu/data-demo');

function dataContoh() {
  const d = dataDemo();
  tambahDemo(d, SEKARANG);
  // Data v1 sungguhan punya task rutin staff; data buatan ini belum.
  I.taskBaru(d, { title: 'Show/hide paket harian', sub: 'R3', pic: 'kiki' }, 'alya', SEKARANG, HARI);
  return d;
}

test('isi panduan: id unik, tab dan ilustrasi dikenal, setiap panduan berjudul, bertujuan, dan berlangkah', () => {
  const tab = new Set(P.BAGIAN.map(b => b.id));
  const ids = P.PANDUAN.map(g => g.id);
  assert.equal(new Set(ids).size, ids.length, 'id panduan unik');
  for (const g of P.PANDUAN) {
    assert.ok(tab.has(g.peran) && g.peran !== 'istilah', `${g.id}: tab ${g.peran}`);
    assert.ok(g.judul && g.tujuan && g.langkah.length, `${g.id}: judul, tujuan, langkah`);
    assert.ok(!g.ilustrasi || P.ILUSTRASI.includes(g.ilustrasi), `${g.id}: ilustrasi ${g.ilustrasi}`);
    assert.ok(g.langkah.every(l => (l.match(/\*\*/g) || []).length % 2 === 0), `${g.id}: tanda tebal berpasangan`);
  }
  for (const peran of ['staff', 'lead', 'manager']) assert.ok(P.PANDUAN.some(g => g.peran === peran), `ada panduan untuk ${peran}`);
  assert.ok(P.ISTILAH.length >= 10 && P.ISTILAH.every(([k, v]) => k && v));
});

test('Coba sekarang: setiap panduan menemukan contoh yang benar-benar ada', () => {
  const d = dataContoh();
  const perId = I.indeks(d);
  for (const g of P.PANDUAN.filter(x => x.coba)) {
    const c = P.cariContoh(g.id, d, I, HARI);
    assert.ok(c, `${g.id}: ada contoh`);
    assert.ok(c.view, `${g.id}: halaman tujuan`);
    if (c.profil) assert.ok(I.ORANG.some(o => o.id === c.profil), `${g.id}: profil ${c.profil} bisa dipilih`);
    if (c.task) assert.ok(perId.has(c.task), `${g.id}: task ${c.task}`);
    if (c.proyek) assert.ok(d.projects.some(p => p.id === c.proyek), `${g.id}: proyek ${c.proyek}`);
    if (c.paket) assert.ok(d.packages.some(p => p.id === c.paket), `${g.id}: paket ${c.paket}`);
  }
});

test('Coba sekarang memilih contoh yang cocok dengan panduannya', () => {
  const d = dataContoh();
  const perId = I.indeks(d);
  const c = id => P.cariContoh(id, d, I, HARI);
  const task = id => perId.get(c(id).task);

  const ajukan = task('staff-ajukan');
  assert.equal(I.orang(ajukan.pic).peran, 'staff');
  assert.ok(I.syaratAjukan(ajukan, perId).some(s => !s.ok), 'syarat ajukannya belum lengkap, jadi bisa dilatih');
  assert.equal(c('staff-ajukan').profil, ajukan.pic, 'dicoba sebagai PIC-nya');

  assert.equal(I.labelKeadaan(task('staff-revisi'), perId), 'Revisi');
  assert.ok(task('staff-tahan').tertahan);
  assert.equal(I.jenisJalur(task('staff-rutin')), 'rutin');

  const antre = c('lead-antrean');
  assert.equal(I.orang(antre.profil).peran, 'lead');
  assert.equal(perId.get(antre.task).pic, antre.profil, 'langkah di antrean Lead itu sendiri');

  const tinjau = c('lead-tinjau');
  assert.equal(I.peninjau(perId.get(tinjau.task)), tinjau.profil, 'dicoba sebagai peninjaunya');

  assert.equal(c('lead-elaborasi').paket, 'PKG-006', 'paket yang targetnya terbuka dan belum punya proyek');
  assert.equal(c('manager-siklus').proyek, d.projects.find(p => p.paket === 'PKG-004').id, 'OJK, yang siklusnya sudah ditutup E12');
  assert.equal(c('konsep-progres').paket, 'PKG-001', 'paket yang paling banyak disetor');
});

test('contoh milik profil yang sedang dipakai diutamakan, supaya profil tak berganti tanpa perlu', () => {
  const d = dataContoh();
  const perId = I.indeks(d);
  for (const me of ['kiki', 'uma']) {
    const c = P.cariContoh('staff-ajukan', d, I, HARI, me);
    assert.equal(c.profil, me, `${me} berlatih dengan task-nya sendiri`);
    assert.equal(perId.get(c.task).pic, me);
  }
  assert.equal(P.cariContoh('lead-antrean', d, I, HARI, 'dhea').profil, 'dhea', 'antrean Dhea sendiri, bukan Lead lain');
  assert.equal(P.cariContoh('lead-buat', d, I, HARI, 'ali').profil, 'ali', 'Lead mana pun boleh mencoba membuat task');
  assert.equal(P.cariContoh('manager-siklus', d, I, HARI, 'kiki').profil, I.MANAGER, 'keputusan siklus tetap dicoba sebagai Manager');
});

test('contoh yang sudah terpakai → null, supaya halaman Panduan menyarankan Reset', () => {
  const d = dataContoh();
  const ojk = d.projects.find(p => p.paket === 'PKG-004');
  I.setArsip(d, ojk, true, I.MANAGER, SEKARANG);
  assert.equal(P.cariContoh('manager-siklus', d, I, HARI), null);
  assert.equal(P.cariContoh('tak-ada', d, I, HARI), null);
});
