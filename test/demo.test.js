/* Skenario contoh (scripts/_demo.js) harus menghasilkan keadaan yang dijanjikannya, dengan
   aturan aplikasi yang sesungguhnya. Data di sini buatan, berbentuk hasil _v1ke2.ubah. */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');
const { tambahDemo } = require('../scripts/_demo');
const { dataDemo: data, SEKARANG, HARI } = require('./bantu/data-demo');

test('skenario contoh: proyek berjalan per tim ADDIE — task turunan, gate, capaian, penutupan siklus', () => {
  const d = data();
  const r = tambahDemo(d, SEKARANG);
  const perId = I.indeks(d);
  const per = id => d.packages.find(p => p.id === id);
  const ringkas = id => I.ringkasPaket(per(id), I.setoranPaket(d, per(id)));
  const proyekDari = id => d.projects.find(p => p.paket === id);

  // PKG-001: Design tuntas, Development berjalan; Implementation & Evaluation menunggu.
  const tka = proyekDari('PKG-001');
  const tTka = d.tasks.filter(t => t.project === tka.id);
  assert.equal(tka.stage, 'V');
  assert.ok(tTka.filter(t => t.stage === 'D').every(I.selesai), 'Design tuntas');
  assert.ok(tTka.filter(t => ['I', 'E'].includes(t.stage)).every(t => t.status === 'Antre' && I.pengingatFase(t, perId).length),
    'Implementation & Evaluation diingatkan fase Development timnya (2.43.0: pengingat, tak menahan)');
  assert.ok(tTka.some(t => t.sub === 'DV8' && t.status === 'Antre' && I.depsBelum(t, perId).some(x => x.sub === 'DV1')),
    'input LNA menunggu soal RAD (serah-terima)');
  const h = id => I.hitungTarget(per('PKG-001').items.find(i => i.id === id), I.setoranPaket(d, per('PKG-001')).get(id));
  assert.equal(h('ITM-1').capaian.konten, 1, 'Dibimbing: rancangan D5 lolos = konten siap');
  assert.ok(per('PKG-001').items.some(it => h(it.id).capaian.input > 0), 'ada batch yang sudah ter-input');
  const rTka = ringkas('PKG-001');
  assert.ok(rTka.persen > rTka.persenTayang, 'progres berbobot di atas yang sudah tayang');
  assert.ok(rTka.persen < 100);
  assert.ok(tTka.some(t => t.induk && I.labelKeadaan(t, perId) === 'Revisi'), 'ada task turunan yang dikembalikan');
  assert.equal(tTka.filter(t => t.tertahan).length, 1);
  assert.equal(tTka.filter(t => I.telat(t, HARI) && !t.tertahan).length, 1);
  assert.ok(tTka.some(t => t.induk && t.status === 'Ditinjau' && I.orang(I.peninjau(t)).peran === 'lead'), 'task turunan menunggu tinjauan Lead');
  assert.ok(tTka.some(t => !t.induk && t.status === 'Ditinjau' && I.peninjau(t) === I.MANAGER), 'langkah Lead menunggu tinjauan Manager');
  const antrean = I.pekerjaanSaya(d, 'alya', HARI).grup.find(g => g.kunci === 'antrean');
  assert.ok(antrean && antrean.isi.length >= 2, 'langkah siap di antrean Alya, menunggu dibagi');
  assert.ok(tTka.filter(t => I.selesai(t)).every(t => t.output && t.evidence.length), 'setiap langkah yang lolos punya output & bukti');

  // Hirarki: task turunan dipegang staff tim Lead induknya, di tahap yang sama; induk yang lolos,
  // semua turunannya lolos lebih dulu. Tak ada lagi langkah Lead yang diserahkan ke staff.
  const anak = d.tasks.filter(t => t.induk);
  assert.ok(tTka.filter(t => t.induk).length > 10, 'pekerjaan dibagi ke staff lewat task turunan');
  for (const a of anak) {
    const induk = perId.get(a.induk);
    assert.ok(I.timDari(induk.pic).includes(a.pic) && a.stage === induk.stage && a.project === induk.project, `${a.id} di bawah ${induk.id}`);
  }
  assert.ok(d.tasks.filter(t => I.selesai(t) && !t.induk).every(t => I.anakTask(perId, t.id).every(x => I.selesai(x) && x.selesaiAt <= t.selesaiAt)));
  assert.ok(d.tasks.filter(t => t.project && !t.induk).every(t => I.orang(t.pic).peran !== 'staff'), 'langkah proyek tetap dipegang Lead/Manager');

  // PKG-004: satu siklus penuh menurut urutan yang berlaku, ditutup E12 → antrean keputusan Manager.
  const ojk = proyekDari('PKG-004');
  const tOjk = d.tasks.filter(t => t.project === ojk.id);
  assert.equal(per('PKG-004').items.length, 5);
  assert.equal(ringkas('PKG-004').persen, 100);
  assert.deepEqual([ojk.decision, ojk.lead], ['Build', '']);
  assert.ok(I.siklusTutup(d, ojk));
  assert.deepEqual(I.antreKeputusan(d, HARI).map(p => p.id), [ojk.id]);
  for (const t of tOjk) {
    const dulu = I.ditunggu(t, perId).map(x => x.t);
    assert.ok(dulu.every(x => x.selesaiAt < t.selesaiAt), `${t.id} ${t.sub} selesai setelah yang ditunggunya tuntas`);
  }
  const selesaiPertama = sub => Math.min(...tOjk.filter(t => t.sub === sub && !t.induk).map(t => t.selesaiAt));
  assert.ok(selesaiPertama('I6') < selesaiPertama('DV8'), 'live class CLO tak menunggu Development tim lain');
  assert.ok(tOjk.filter(t => t.sub === 'I4' && !t.induk).every(t => t.tunggu.length && t.tunggu.every(id => perId.get(id).selesaiAt < t.selesaiAt)),
    'tayang sesudah QC LNA');

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

test('skenario contoh PAPI Kostick (2.29.1, 2.30.0): proyek tanpa paket, serah-terima RAD → DAE', () => {
  const d = data();
  tambahDemo(d, SEKARANG);
  const perId = I.indeks(d);
  const papi = d.projects.find(p => p.name === 'Tes Psikologi PAPI Kostick');
  assert.ok(papi && !papi.paket, 'proyek tanpa rancangan paket');
  const tP = d.tasks.filter(t => t.project === papi.id);
  const sub = k => tP.find(t => t.sub === k && !t.induk);
  assert.deepEqual(['A1', 'A2', 'A6', 'D4'].filter(k => !I.selesai(sub(k))), [], 'Analysis dan rancangan DAE tuntas');
  assert.deepEqual([I.timJalur(sub('D2'), perId), I.timJalur(sub('DV7'), perId)], ['AK', 'SI'], 'dua tim berbeda');
  assert.equal(sub('D2').status, 'Dikerjakan');
  assert.equal(I.peninjau(sub('D2')), I.MANAGER);
  assert.deepEqual(sub('DV7').tunggu, [sub('D2').id], 'Ali memasang serah-terima');
  assert.deepEqual(I.depsBelum(sub('DV7'), perId).map(x => x.id), [sub('D2').id], 'prototype hanya menunggu blueprint RAD');
  assert.ok(I.pengingatFase(sub('DV1'), perId).some(x => x.t.id === sub('D2').id), 'produksi butir RAD diingatkan fase Design RAD (2.43.0)');
  assert.ok(tP.some(t => t.induk === sub('A2').id && t.pic === 'uma' && I.selesai(t)), 'riset dibagi ke Uma');
  assert.ok(tP.filter(t => !t.induk).every(t => I.orang(t.pic).peran !== 'staff'));
  // Andika mengajukan blueprint (2.30.0): prototype Ali terbuka dan ia diberi tahu, selagi
  // Manager masih meninjau D2.
  I.terapkanAksi(d, sub('D2'), 'ajukan', 'andika', SEKARANG + 1000);
  const kini = I.indeks(d);
  assert.equal(sub('D2').status, 'Ditinjau');
  assert.deepEqual(I.depsBelum(sub('DV7'), kini), []);
  assert.ok(I.notifikasi(d, 'ali').some(n => n.jenis === 'siap' && n.task === sub('DV7').id), 'notifikasi siap untuk Ali');
  assert.ok(I.pengingatFase(sub('I5'), kini).some(x => x.t.id === sub('DV7').id), 'uji coba diingatkan prototype (fase DAE, 2.43.0)');
});

test('skenario contoh Pengembangan (2.47.0): tiga akar dan subinisiatif; pembaruan biasa tetap rutin tanpa tinjauan', () => {
  const d = data();
  const r = tambahDemo(d, SEKARANG);
  assert.equal(r.inisiatif, 26);
  assert.deepEqual(d.inisiatif.filter(x => !x.induk).map(x => x.nama).sort(), ['Aplikasi Internal', 'Generator Soal', 'Pengumpulan Data']);
  assert.ok(d.inisiatif.filter(x => x.induk).every(x => I.cariInisiatif(d, x.induk)));
  assert.ok(d.inisiatif.every(x => x.tim === 'SI' && x.pic === 'ali' && x.status === 'aktif'));
  const v2 = d.inisiatif.find(x => x.nama === 'ProductTrack');
  const r2 = I.ringkasInisiatif(d, v2, HARI);
  assert.equal(r2.buka.length >= 1 && r2.beres.length >= 1, true, 'ada pembaruan berjalan dan riwayat');
  assert.ok(r2.tasks.every(t => !t.project && t.lane === 'rutin' && !I.peninjau(t)), 'task rutin, tanpa tinjauan');
  assert.ok(r2.beres.every(t => t.status === 'Selesai'));
});


test('skenario contoh Acara bersama (2.33.0): lintas tim, notulen dengan task, Terbuka, hanya untuk data contoh', () => {
  const d = data();
  const { acara } = tambahDemo(d, SEKARANG);
  assert.deepEqual(acara.map(a => a.id), ['agdemo-rapat-mingguan', 'agdemo-kickoff-papi', 'agdemo-review-papi', 'agdemo-sinkron-tka', 'agdemo-sharing-dae']);
  assert.ok(acara.every(a => a.contoh && I.acaraBersama(a) && I.periksaAgenda(a)), 'semua sah dan bertanda contoh');
  const per = Object.fromEntries(acara.map(a => [a.id.slice(7), { ...a, pemilik: a.orang }]));
  // Kickoff: notulen dengan tiga tindak lanjut, dua sudah jadi task proyek PAPI.
  const k = per['kickoff-papi'];
  const papi = d.projects.find(p => p.name === 'Tes Psikologi PAPI Kostick');
  assert.deepEqual(k.kait, [{ jenis: 'proyek', id: papi.id }]);
  assert.deepEqual(k.tindak.map(b => !!b.task), [true, true, false]);
  assert.ok(k.tindak.filter(b => b.task).every(b => d.tasks.find(t => t.id === b.task).project === papi.id));
  // Review lintas tim (RAD membuat, DAE dan Manager diundang); belum semua menjawab.
  const r = per['review-papi'];
  assert.deepEqual([r.pemilik, I.rekapJawaban(r)], ['andika', { ya: 2, mungkin: 1, tidak: 0, belum: 1 }]);
  assert.ok(I.notifAcara(Object.values(per), [], 'ali', I.isoHari(SEKARANG)).some(n => n.jenis === 'undang' && n.agenda === r.id));
  // Sharing session Terbuka: Nadya ikut sendiri, siapa pun bisa melihatnya.
  const s = per['sharing-dae'];
  assert.deepEqual([s.terbuka, s.peserta, I.bolehLihatAgenda(s, 'bagas')], [true, ['nadya'], true]);
  assert.equal(I.jawabanAcara(per['sinkron-tka'], 'dhea'), 'tidak');
});
