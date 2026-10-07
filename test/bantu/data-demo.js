/* Data buatan berbentuk hasil _v1ke2.ubah, untuk menjalankan skenario contoh (scripts/_demo.js)
   di tes tanpa tarikan v1 sungguhan. */
const I = require('../../public/inti');

const SEKARANG = Date.UTC(2026, 9, 7, 5, 0, 0);
const HARI = I.isoHari(SEKARANG);

function dataDemo() {
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

module.exports = { dataDemo, SEKARANG, HARI };
