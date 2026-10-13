/* Hapus task (2.23.0, permintaan user): satu dari detail task atau banyak sekaligus yang
   dicentang di tab tim proyek. Yang boleh: Manager; Lead untuk task tim (tab)-nya dan task yang
   boleh ia ubah; staff hanya task yang ia buat untuk dirinya sendiri. Turunan ikut terhapus
   bersama induknya, setorannya ikut hilang, dan rujukan di task lain (deps, tunggu) dibersihkan.
   Juga tab bawaan halaman proyek: tim sendiri, atau Ringkasan untuk Manager. */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');

const HARI = '2026-10-07';
const WAKTU = Date.UTC(2026, 9, 7, 3, 0, 0);

function data() {
  return {
    tasks: [], projects: [], log: [], dashboards: [], links: [], notes: [], setoran: [],
    packages: [{
      id: 'PKG-001', platform: 'Cerebrum', program: '', namaPaket: 'TKA_CEREBRUM', produkPic: '', mirror: false,
      dibimbing: '', latsol: '', materi: '', tryout: '', drilling: '', liveClass: '', catatan: '',
      items: [{ id: 'ITM-A', urutan: 1, kategori: 'Latsol', grup: '', nama: 'Fisika', target: 5, satuan: 'Paket', awal: 2, catatan: '' }],
      links: [],
    }],
  };
}
/* Proyek hasil elaborasi: rangkaian Latsol lintas tim, serah-terima antartim, dan satu task
   turunan di bawah DV1 (tim RAD, Lead andika). */
function siapkan() {
  const d = data();
  const { project, tasks } = I.elaborasiPaket(d, d.packages[0], { items: ['ITM-A'] }, 'nynda', WAKTU, HARI);
  const dv1 = tasks.find(t => t.sub === 'DV1');
  const anak = I.taskAnak(d, dv1, { title: 'Soal 1–10', pic: 'uma' }, 'andika', WAKTU, HARI);
  return { d, project, tasks, dv1, anak };
}
const perId = d => new Map(d.tasks.map(t => [t.id, t]));
const merujuk = (d, id) => d.tasks.filter(t => (t.deps || []).includes(id) || (t.tunggu || []).includes(id));

test('hapus task: siapa yang boleh', () => {
  const { d, tasks, dv1, anak } = siapkan();
  const m = perId(d);
  const timLA = tasks.find(t => I.timJalur(t, m) === 'LA');
  assert.ok(timLA, 'ada langkah tim LNA');
  assert.equal(I.bolehHapusTask(dv1, 'nynda', m), true, 'Manager');
  assert.equal(I.bolehHapusTask(dv1, 'andika', m), true, 'Lead tim RAD untuk task timnya');
  assert.equal(I.bolehHapusTask(anak, 'andika', m), true, 'Lead untuk turunan yang ia bagi');
  assert.equal(I.bolehHapusTask(timLA, 'andika', m), false, 'bukan task tim RAD');
  assert.equal(I.bolehHapusTask(timLA, 'alya', m), true, 'Lead tim LNA');
  assert.equal(I.bolehHapusTask(anak, 'uma', m), false, 'staff tak menghapus task yang dibagikan kepadanya');
  const sendiri = I.taskBaru(d, { title: 'Rapikan catatan', sub: 'R1', pic: 'uma' }, 'uma', WAKTU, HARI);
  assert.equal(I.bolehHapusTask(sendiri, 'uma'), true, 'staff untuk task yang ia buat sendiri');
  assert.equal(I.bolehHapusTask(sendiri, 'tri'), false, 'staff lain');
  assert.equal(I.bolehHapusTask(sendiri, 'andika'), true, 'Lead-nya');
  assert.equal(I.bolehHapusTask(sendiri, 'alya'), false, 'Lead tim lain untuk task di luar proyek');
});

test('hapus banyak task lewat perintah data real: turunan, setoran, dan rujukan ikut bersih', () => {
  const { d, tasks, dv1, anak } = siapkan();
  const m = perId(d);
  const timRAD = tasks.filter(t => I.timJalur(t, m) === 'AK');
  assert.ok(timRAD.length >= 2, 'tim RAD punya beberapa langkah');
  const dirujuk = merujuk(d, dv1.id);
  assert.ok(dirujuk.length, 'langkah lain menunggu DV1');
  const setoranDv1 = d.setoran.filter(s => s.task === dv1.id).length;

  const r = I.ringkasHapusTask(d, [dv1.id, anak.id]);
  assert.deepEqual([r.dipilih, r.turunan, r.tasks.length], [2, 0, 2], 'turunan yang dicentang sendiri tak dihitung dua kali');
  assert.deepEqual([I.ringkasHapusTask(d, [dv1.id]).turunan, I.ringkasHapusTask(d, [dv1.id]).setoran], [1, setoranDv1]);

  const ids = timRAD.map(t => t.id);
  const hilang = new Set([...ids, anak.id]);
  const sebelum = JSON.parse(JSON.stringify(d));
  const jumlahLog = d.log.length;
  const h = I.jalankanPerintah(d, { aksi: 'hapusTask', isi: { tasks: ids }, oleh: 'andika', at: WAKTU + 1, hari: HARI });
  assert.equal(h.ok, true, h.galat);
  assert.deepEqual([h.hasil.task, h.hasil.dipilih, h.hasil.turunan], [ids.length + 1, ids.length, 1]);
  assert.equal(d.tasks.some(t => hilang.has(t.id)), false);
  assert.equal(d.setoran.some(s => hilang.has(s.task)), false, 'setorannya ikut hilang');
  for (const t of d.tasks) {
    assert.equal((t.deps || []).some(id => hilang.has(id)), false, `${t.id} tak lagi menunggu task yang dihapus (deps)`);
    assert.equal((t.tunggu || []).some(id => hilang.has(id)), false, `${t.id} tak lagi menunggu task yang dihapus (tunggu)`);
  }
  assert.equal(d.log.length - jumlahLog, ids.length, 'satu catatan per task yang dipilih');
  assert.ok(d.log.some(l => l.task.startsWith(dv1.id + ' ') && l.detail === 'Task dihapus beserta 1 task turunan'));

  // Di data real: baris yang dihapus, dan hanya task yang rujukannya berubah yang ditulis ulang.
  const beda = I.bedaData(sebelum, d);
  assert.deepEqual(new Set(beda.tasks.hapus), hilang);
  const ditulis = (beda.tasks.pasang || []).map(t => t.id);
  assert.ok(ditulis.length > 0 && ditulis.length < d.tasks.length, 'tak semua task ditulis ulang');
  assert.ok(dirujuk.every(t => hilang.has(t.id) || ditulis.includes(t.id)));
});

test('hapus task ditolak utuh bila ada yang tak boleh; yang sudah hilang dilewati', () => {
  const { d, tasks, dv1 } = siapkan();
  const m = perId(d);
  const timLA = tasks.find(t => I.timJalur(t, m) === 'LA');
  const jumlah = d.tasks.length;
  const h = I.jalankanPerintah(d, { aksi: 'hapusTask', isi: { tasks: [dv1.id, timLA.id] }, oleh: 'andika', at: WAKTU + 1, hari: HARI });
  assert.equal(h.ok, false);
  assert.match(h.galat, new RegExp(`tak boleh menghapus ${timLA.id}`));
  assert.equal(d.tasks.length, jumlah, 'tak ada yang terhapus');

  assert.throws(() => I.hapusTask(d, [], 'nynda', WAKTU), /Pilih dulu/);
  assert.throws(() => I.hapusTask(d, ['PRD-404'], 'nynda', WAKTU), /sudah tidak ada/);
  const r = I.hapusTask(d, ['PRD-404', timLA.id], 'nynda', WAKTU + 2);
  assert.equal(r.task, 1);
  assert.equal(d.tasks.some(t => t.id === timLA.id), false);
  // Satu task saja (dari detail task) lewat isian task.
  const h2 = I.jalankanPerintah(d, { aksi: 'hapusTask', isi: { task: dv1.id }, oleh: 'nynda', at: WAKTU + 3, hari: HARI });
  assert.equal(h2.ok, true, h2.galat);
  assert.equal(h2.hasil.turunan, 1);
});

test('tab bawaan halaman proyek: tim sendiri, Ringkasan untuk Manager', () => {
  assert.equal(I.tabAwalProyek('nynda'), 'ringkas');
  assert.deepEqual(['ali', 'andika', 'alya', 'dhea'].map(I.tabAwalProyek), ['SI', 'AK', 'LA', 'CO']);
  assert.deepEqual(['uma', 'kiki', 'nadya'].map(I.tabAwalProyek), ['AK', 'LA', 'CO'], 'staff mengikuti tim Lead-nya');
});

test('agen AI tak boleh menghapus task', () => {
  assert.equal(I.AKSI_AGEN.includes('hapusTask'), false);
  assert.equal(I.AKSI_AGEN.includes('hapusProyek'), false);
});
