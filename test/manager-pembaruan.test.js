const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');
const W = Date.parse('2026-10-26T03:00:00Z'), H = '2026-10-26';
function dasar() {
  const d = I.dataKosong();
  const p = I.proyekBaru(d, { name: 'Riset SKD', platform: 'CPNS' }, 'nynda', W);
  const buat = (title, pic = 'andika', sub = 'A2') => {
    const t = I.taskBaru(d, { title, pic, sub, project: p.id, output: 'Hasil ' + title }, 'nynda', W, H);
    Object.assign(t, { status: 'Ditinjau', updatedAt: W + 1, tinjauan: [{ id: 'aju-' + t.id, action: 'Diajukan', by: pic, at: W + 1 }] });
    return t;
  };
  const a = buat('Riset awal'), b = buat('Riset lanjutan'), c = buat('Belum dipilih');
  const versi = tasks => Object.fromEntries(tasks.map(t => [t.id, I.versiTinjauan(t)]));
  return { d, p, a, b, c, buat, versi };
}

test('Manager menyetujui pilihan saja; tiap task punya tinjauan, waktu selesai, log dan notifikasi PIC', () => {
  const { d, a, b, c, versi } = dasar();
  const sebelum = structuredClone(d);
  const r = I.jalankanPerintah(d, { aksi: 'setujuiBanyak', isi: { tasks: [a.id, b.id], versi: versi([a, b]) }, oleh: 'nynda', at: W + 2, hari: H });
  assert.equal(r.ok, true, r.galat);
  assert.deepEqual(I.ringkasHasil(r.hasil), { disetujui: 2 });
  for (const t of [a, b]) {
    assert.equal(t.status, 'Selesai');
    assert.equal(t.selesaiAt, W + 2);
    assert.equal(t.tinjauan.at(-1).by, 'nynda');
    assert.equal(t.tinjauan.at(-1).action, 'Disetujui');
  }
  assert.equal(c.status, 'Ditinjau');
  assert.equal(I.notifikasi(d, 'andika').filter(n => n.jenis === 'setuju').length, 2);
  I.terapkanUbah(sebelum, I.bedaData(sebelum, d));
  assert.deepEqual(sebelum, d, 'satu jurnal memuat seluruh persetujuan');
});

test('penolakan pilihan kosong, duplikat, hilang, stale, dan izin menjaga seluruh data tetap utuh', () => {
  for (const kasus of ['kosong', 'ganda', 'hilang', 'berubah', 'ditarik', 'tanpaVersi', 'staff', 'lead', 'dev', 'terlaluBanyak']) {
    const { d, a, b, versi } = dasar();
    let ids = [a.id, b.id], v = versi([a, b]), me = 'nynda';
    if (kasus === 'kosong') ids = [];
    if (kasus === 'ganda') ids = [a.id, a.id];
    if (kasus === 'hilang') ids.push('PRD-hilang');
    if (kasus === 'berubah') b.updatedAt++;
    if (kasus === 'ditarik') b.status = 'Dikerjakan';
    if (kasus === 'tanpaVersi') v = {};
    if (kasus === 'staff') me = 'uma';
    if (kasus === 'lead') me = 'andika';
    if (kasus === 'dev') me = I.DEV;
    if (kasus === 'terlaluBanyak') ids = Array.from({ length: 201 }, (_, i) => 'PRD-' + i);
    const sebelum = structuredClone(d);
    assert.throws(() => I.setujuiBanyak(d, ids, v, me, W + 2), undefined, kasus);
    assert.deepEqual(d, sebelum, kasus + ': tidak menyetujui sebagian');
  }
});

test('izin mengikuti persetujuan tunggal; permintaan DAE dan lanjutan tetap ditinjau tim peminta', () => {
  const { d, a, b, versi, buat } = dasar();
  const staff = buat('Task staff', 'uma');
  assert.equal(I.bolehSetujuiBanyak(staff, 'nynda', I.indeks(d)), true);
  assert.equal(I.bolehSetujuiBanyak(staff, 'andika', I.indeks(d)), false);
  for (const kait of [{ permintaanDae: 'MDA-001', peminta: 'andika', pic: 'ali' }, { diminta: 'andika', pic: 'ali', sub: 'DV7' }]) {
    Object.assign(b, { permintaanDae: '', peminta: '', diminta: '', ...kait });
    assert.equal(I.bolehSetujuiBanyak(b, 'nynda', I.indeks(d)), false);
    const sebelum = structuredClone(d);
    assert.throws(() => I.setujuiBanyak(d, [a.id, b.id], versi([a, b]), 'nynda', W + 2));
    assert.deepEqual(d, sebelum);
  }
});

test('200 pilihan diterima, tidak menggandakan tinjauan saat perintah yang sama dicoba ulang', () => {
  const { d, buat, versi } = dasar();
  while (d.tasks.length < 200) buat('Task ' + d.tasks.length);
  const ids = d.tasks.map(t => t.id), v = versi(d.tasks);
  assert.equal(I.setujuiBanyak(d, ids, v, 'nynda', W + 2).disetujui, 200);
  const sesudah = structuredClone(d);
  assert.throws(() => I.setujuiBanyak(d, ids, v, 'nynda', W + 3));
  assert.deepEqual(d, sesudah);
});

function pengembangan() {
  const d = I.dataKosong();
  const root = I.inisiatifBaru(d, { nama: 'Generator' }, 'ali', W);
  const anak = I.inisiatifBaru(d, { nama: 'SKD', induk: root.id }, 'ali', W);
  const t = I.taskBaru(d, { title: 'Generator SKD', pic: 'ali', inisiatif: anak.id }, 'ali', W, H);
  return { d, root, anak, t };
}

test('kabar khusus Manager: satu per task, lokasi anak lengkap, dan hitungan induk tidak menduplikasi', () => {
  const { d, root, anak, t } = pengembangan();
  const kabar = I.notifikasiPengembangan(d, 'nynda');
  assert.equal(kabar.length, 1);
  assert.equal(kabar[0].inisiatif, anak.id);
  assert.equal(kabar[0].selesai, false);
  assert.equal(I.namaJalurInisiatif(d, kabar[0].inisiatif), 'Generator › SKD');
  assert.equal(I.ringkasInisiatif(d, root, H).tasks.filter(x => kabar.some(n => n.task === x.id)).length, 1);
  assert.equal(I.notifikasi(d, 'nynda').filter(n => n.jenis === 'pengembangan').length, 1);
  for (const me of ['ali', 'andika', I.DEV]) assert.deepEqual(I.notifikasiPengembangan(d, me), []);
  t.updatedAt += 100;
  assert.deepEqual(I.notifikasiPengembangan(d, 'nynda'), kabar, 'edit biasa tidak membuat notifikasi baru');
});

test('dibaca hanya versi yang terlihat; penyelesaian berikutnya kembali menjadi kabar baru', () => {
  const { d, t } = pengembangan();
  const baca = { [t.id]: W };
  assert.equal(I.pembaruanBelumDibaca(I.notifikasiPengembangan(d, 'nynda'), baca).length, 0);
  I.terapkanAksi(d, t, 'mulai', 'ali', W + 1);
  I.terapkanAksi(d, t, 'selesai', 'ali', W + 2);
  const kabar = I.notifikasiPengembangan(d, 'nynda');
  assert.equal(kabar.length, 1);
  assert.equal(kabar[0].selesai, true);
  assert.equal(I.pembaruanBelumDibaca(kabar, baca).length, 1);
  assert.equal(I.pembaruanBelumDibaca(kabar, { [t.id]: W + 2 }).length, 0);
  assert.equal(I.pembaruanBelumDibaca(kabar, {}, W + 3).length, 0, 'batas awal mengabaikan riwayat lama');
});

test('pindah lokasi mengikuti task tanpa mengulang kabar yang dibaca; task hilang tidak meninggalkan penanda', () => {
  const { d, root, anak, t } = pengembangan();
  const baca = { [t.id]: W };
  I.pindahPembaruan(d, [t.id], root.id, { [t.id]: anak.id }, 'ali', W + 1);
  const kabar = I.notifikasiPengembangan(d, 'nynda');
  assert.equal(kabar[0].inisiatif, root.id);
  assert.equal(I.pembaruanBelumDibaca(kabar, baca).length, 0);
  d.tasks = [];
  assert.deepEqual(I.notifikasiPengembangan(d, 'nynda'), []);
});

test('Manager tidak diberi kabar untuk tindakannya sendiri dan task tanpa wadah yang valid', () => {
  const { d, t } = pengembangan();
  t.assignedBy = 'nynda';
  assert.deepEqual(I.notifikasiPengembangan(d, 'nynda'), []);
  I.terapkanAksi(d, t, 'mulai', 'nynda', W + 1);
  I.terapkanAksi(d, t, 'selesai', 'nynda', W + 2);
  assert.deepEqual(I.notifikasiPengembangan(d, 'nynda'), []);
  t.assignedBy = 'ali'; t.status = 'Antre'; t.inisiatif = 'INI-hilang';
  assert.deepEqual(I.notifikasiPengembangan(d, 'nynda'), []);
});
