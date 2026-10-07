/* Skenario contoh (scripts/_demo.js) harus menghasilkan keadaan yang dijanjikannya, dengan
   aturan aplikasi yang sesungguhnya. Data di sini buatan, berbentuk hasil _v1ke2.ubah. */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');
const { tambahDemo } = require('../scripts/_demo');

const SEKARANG = Date.UTC(2026, 9, 7, 5, 0, 0);
const HARI = I.isoHari(SEKARANG);

function data() {
  const item = (id, kategori, nama, target, awal) => ({ id, urutan: 1, kategori, grup: '', nama, target, satuan: 'Paket', awal, catatan: '' });
  const paket = (id, namaPaket, items = []) => ({
    id, platform: 'Cerebrum', program: '', namaPaket, produkPic: '', mirror: false, dibimbing: '', latsol: '', materi: '', tryout: '',
    drilling: '', liveClass: '', catatan: '', marselPic: '', tagline: '', benefit: '', tanggal: '', tujuan: '', updatedBy: '', updatedAt: 0,
    items, links: [],
  });
  return {
    projects: [], tasks: [], setoran: [], links: [], notes: [], log: [{ id: 'l1', type: 'update', task: 'x', detail: 'lama', by: 'ali', at: SEKARANG - 40 * 864e5 }],
    dashboards: [{ id: 'd2', title: 'Proyek Freelance', deskripsi: '', icon: 'timeline', url: 'https://contoh.id/freelance' }],
    packages: [
      paket('PKG-001', 'TKA_CEREBRUM', [
        item('ITM-1', 'Dibimbing', 'TKA SMA', 1, 0), item('ITM-2', 'Latsol', 'Bahasa Indonesia', 5, 0), item('ITM-3', 'Latsol', 'Bahasa Inggris', 5, 0),
        item('ITM-4', 'Latsol', 'Matematika', 5, 0), item('ITM-5', 'Latsol', 'Fisika', 5, 2), item('ITM-6', 'Latsol', 'Kimia', 5, 2),
        item('ITM-7', 'Tryout', 'TO 1', 1, 0), item('ITM-8', 'Tryout', 'TO 2', 1, 0), item('ITM-9', 'Tryout', 'TO 3', 1, 0),
        item('ITM-10', 'Tryout', 'TO 4', 1, 0), item('ITM-11', 'Materi', 'Video Kimia', 2, 1), item('ITM-12', 'Latsol', 'Biologi', 5, 7),
      ]),
      paket('PKG-004', 'OJK'),
      paket('PKG-006', 'UTBK'),
    ],
  };
}

test('skenario contoh: tiga keadaan paket yang berbeda, semuanya hasil alur sungguhan', () => {
  const d = data();
  const r = tambahDemo(d, SEKARANG);
  const per = id => d.packages.find(p => p.id === id);
  const ringkas = id => I.ringkasPaket(per(id), I.setoranPaket(d, per(id)));
  const proyekDari = id => d.projects.find(p => p.paket === id);

  // PKG-001: 11 target terbuka → 11 task dengan keadaan campuran.
  const tka = d.tasks.filter(t => t.project === proyekDari('PKG-001').id);
  const hitung = s => tka.filter(t => t.status === s).length;
  assert.deepEqual([tka.length, hitung('Selesai'), hitung('Ditinjau'), hitung('Dikerjakan'), hitung('Antre')], [11, 5, 2, 2, 2]);
  assert.equal(tka.filter(t => t.tertahan).length, 1);
  assert.equal(tka.filter(t => I.telat(t, HARI) && !t.tertahan).length, 1);
  assert.ok(tka.some(t => t.tinjauan.some(x => x.action === 'Dikembalikan')), 'ada contoh task yang pernah dikembalikan');
  assert.ok(tka.every(t => t.pic !== 'andika'), 'PIC dibagi ke tim, bukan Lead-nya');
  const rTka = ringkas('PKG-001');
  assert.ok(rTka.persen > 0 && rTka.persen < 100 && rTka.digarap > 0, 'sebagian terpenuhi, sebagian digarap');
  assert.equal(I.ringkasProyek(d, proyekDari('PKG-001'), HARI).siapMaju, false);

  // PKG-004: target contoh, semua disetujui → paket penuh, proyek menunggu keputusan Manager.
  assert.equal(per('PKG-004').items.length, 5);
  assert.equal(ringkas('PKG-004').persen, 100);
  assert.deepEqual(I.antreKeputusan(d, HARI).map(p => p.paket), ['PKG-004']);

  // PKG-006: target contoh, belum dielaborasi.
  assert.equal(per('PKG-006').items.length, 6);
  assert.equal(proyekDari('PKG-006'), undefined);
  assert.equal(ringkas('PKG-006').terbuka, 6, 'semua targetnya siap dielaborasi');

  // Semua langkah tercatat di riwayat, tetap terbaru di atas; waktu tak ada yang di masa depan.
  assert.ok(d.log.every((l, i) => i === 0 || d.log[i - 1].at >= l.at));
  assert.ok(d.log.every(l => l.at <= SEKARANG));
  assert.ok(d.tasks.every(t => !t.selesaiAt || t.selesaiAt <= SEKARANG));
  assert.deepEqual([r.task, r.setoran], [16, 16]);
  assert.ok(d.notes.every(n => n.folder === 'Contoh') && d.links.every(l => l.folder === 'Contoh' && /^https:/.test(l.url)));
});
