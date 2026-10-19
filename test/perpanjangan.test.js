/* Banding perpanjangan tenggat (2.41.0, permintaan user): PIC mengajukan tenggat baru langsung
   ke pemberi task; pemberi menyetujui (boleh tanggal lain) atau menolak dengan alasan. */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');

const HARI = '2026-10-19';
const WAKTU = Date.UTC(2026, 9, 19, 3);
let n = 0;
const task = o => ({
  id: 'PRD-' + String(++n).padStart(3, '0'), project: '', lane: 'rutin', title: 'Task ' + n, pic: 'kiki', assignedBy: 'andika',
  status: 'Dikerjakan', due: '2026-10-20', tertahan: false, output: '', deps: [], cycle: 1, createdAt: 1, updatedAt: 1, selesaiAt: 0,
  subtasks: [], comments: [], tinjauan: [], evidence: [], ...o,
});
const data = tasks => ({ ...I.dataKosong(), tasks });
const notif = (d, me, jenis) => I.notifikasi(d, me, 200).filter(x => x.jenis === jenis);

test('pemberi task: yang memberi; task buatan sendiri ke Lead-nya; Lead ke Manager', () => {
  assert.equal(I.pemberiTask({ pic: 'kiki', assignedBy: 'andika' }), 'andika', 'Lead tim lain yang memberi');
  assert.equal(I.pemberiTask({ pic: 'kiki', assignedBy: 'kiki' }), 'alya', 'buatan sendiri: Lead-nya');
  assert.equal(I.pemberiTask({ pic: 'alya', assignedBy: 'alya' }), 'nynda', 'Lead: Manager');
  assert.equal(I.pemberiTask({ pic: 'nynda', assignedBy: 'nynda' }), '', 'Manager tak perlu mengajukan');
  assert.equal(I.pemberiTask({ pic: 'kiki', assignedBy: 'orang-lama-v1' }), 'alya', 'pemberi di luar organogram: Lead-nya');
});

test('ajukan → setujui dengan tanggal lain: tenggat berubah, PIC diberi tahu', () => {
  const t = task();
  const d = data([t]);
  assert.equal(I.bolehAjukanPanjang(d, t, 'kiki'), true);
  assert.equal(I.bolehAjukanPanjang(d, t, 'andika'), false, 'hanya PIC');
  const x = I.ajukanPerpanjangan(d, t, { due: '2026-10-27', alasan: 'Menunggu data dari tim RAD' }, 'kiki', WAKTU, HARI);
  assert.deepEqual([x.id, x.ke, x.dueLama, x.dueBaru, x.status], ['PJG-001', 'andika', '2026-10-20', '2026-10-27', 'menunggu']);
  assert.equal(t.due, '2026-10-20', 'tenggat belum berubah sebelum disetujui');
  assert.equal(I.bolehAjukanPanjang(d, t, 'kiki'), false, 'satu pengajuan menunggu per task');
  assert.deepEqual(I.panjangMasuk(d, 'andika').map(y => y.id), ['PJG-001']);
  assert.equal(notif(d, 'andika', 'panjang').length, 1);
  assert.throws(() => I.jawabPerpanjangan(d, x, { setuju: true }, 'kiki', WAKTU + 1), /bukan untuk Anda/);
  I.jawabPerpanjangan(d, x, { setuju: true, due: '2026-10-25', catatan: 'Maksimal tanggal 25' }, 'andika', WAKTU + 1);
  assert.deepEqual([x.status, x.dueJadi, t.due], ['disetujui', '2026-10-25', '2026-10-25']);
  const n1 = notif(d, 'kiki', 'panjangSetuju');
  assert.equal(n1.length, 1);
  assert.equal(n1[0].dueBaru, '2026-10-25', 'notifikasi memakai tanggal yang disetujui');
  assert.deepEqual(I.panjangMasuk(d, 'andika'), []);
});

test('tolak butuh alasan; batal hanya oleh pengaju; isian diperiksa', () => {
  const t = task();
  const d = data([t]);
  const ajukan = f => () => I.ajukanPerpanjangan(d, t, { due: '2026-10-27', alasan: 'Butuh revisi', ...f }, 'kiki', WAKTU, HARI);
  assert.throws(ajukan({ due: '2026-10-20' }), /sesudah tenggat sekarang/);
  assert.throws(ajukan({ due: 'besok' }), /Pilih tanggal/);
  assert.throws(ajukan({ alasan: ' ' }), /alasannya/);
  assert.throws(() => I.ajukanPerpanjangan(d, { ...t, status: 'Selesai' }, { due: '2026-10-27', alasan: 'x y z' }, 'kiki', WAKTU, HARI), /sudah selesai/);
  const x = ajukan({})();
  assert.throws(() => I.jawabPerpanjangan(d, x, { setuju: false, catatan: '' }, 'andika', WAKTU + 1), /penolakannya/);
  I.jawabPerpanjangan(d, x, { setuju: false, catatan: 'Klien butuh tanggal 20' }, 'nynda', WAKTU + 1);
  assert.deepEqual([x.status, x.oleh, t.due], ['ditolak', 'nynda', '2026-10-20'], 'Manager juga boleh menjawab');
  assert.equal(notif(d, 'kiki', 'panjangTolak')[0].teks, 'Klien butuh tanggal 20');
  const x2 = ajukan({ due: '2026-10-22' })();
  assert.equal(x2.id, 'PJG-002');
  assert.throws(() => I.batalkanPerpanjangan(d, x2, 'andika', WAKTU + 2), /Hanya pengaju/);
  I.batalkanPerpanjangan(d, x2, 'kiki', WAKTU + 2);
  assert.equal(x2.status, 'batal');
  assert.equal(I.bolehAjukanPanjang(d, t, 'kiki'), true, 'boleh mengajukan lagi');
});

test('perpanjangan ikut data real', () => {
  const t = task();
  const a = data([t]);
  const b = structuredClone(a);
  const r = I.jalankanPerintah(b, { aksi: 'ajukanPerpanjangan', isi: { task: t.id, f: { due: '2026-10-30', alasan: 'Data terlambat' } }, oleh: 'kiki', at: WAKTU, hari: HARI });
  assert.equal(r.ok, true, r.galat);
  const r2 = I.jalankanPerintah(b, { aksi: 'jawabPerpanjangan', isi: { perpanjangan: 'PJG-001', f: { setuju: true } }, oleh: 'andika', at: WAKTU + 1, hari: HARI });
  assert.equal(r2.ok, true, r2.galat);
  const ubah = I.bedaData(a, b);
  assert.equal(ubah.perpanjangan.pasang.length, 1);
  const c = I.terapkanUbah(structuredClone(a), ubah);
  assert.deepEqual([c.perpanjangan[0].status, c.tasks[0].due], ['disetujui', '2026-10-30']);
});
