/* Kalender Saya (2.28.0): agenda pribadi per profil dengan pengingat. Aturannya di inti
   (periksaAgenda, kejadianAgenda, waktuPengingat, periksaEmail); penyimpanannya di server hanya
   untuk profil yang terbukti di sesi itu, dan tiap profil hanya melihat agendanya sendiri. */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');

test('periksaAgenda: isian dibersihkan; yang tak sah ditolak dengan alasan', () => {
  const a = I.periksaAgenda({ judul: '  Standup   tim ', tanggal: '2026-10-13', mulai: '09:00', selesai: '09:15', ulang: 'kerja', pengingat: '10', catatan: ' cek blocker ', lain: 'x' });
  assert.deepEqual(a, { id: '', judul: 'Standup tim', tanggal: '2026-10-13', mulai: '09:00', selesai: '09:15', ulang: 'kerja', sampai: '', pengingat: '10', catatan: 'cek blocker', beres: [] });
  assert.equal(I.periksaAgenda({ judul: 'Cuti', tanggal: '2026-10-20', mulai: '', selesai: '', pengingat: '' }).mulai, '', 'sepanjang hari');
  assert.equal(I.periksaAgenda({ judul: 'x', tanggal: '2026-10-13', sampai: '2026-12-01' }).sampai, '', 'sampai hanya untuk yang berulang');
  for (const [isian, pola] of [
    [{ tanggal: '2026-10-13' }, /Judul/], [{ judul: 'x'.repeat(201), tanggal: '2026-10-13' }, /200/], [{ judul: 'x', tanggal: '2026-02-30' }, /Tanggal/],
    [{ judul: 'x', tanggal: '2026-10-13', mulai: '25:00' }, /Jam mulai/], [{ judul: 'x', tanggal: '2026-10-13', selesai: '10:00' }, /jam mulai dulu/],
    [{ judul: 'x', tanggal: '2026-10-13', mulai: '10:00', selesai: '09:00' }, /sesudah jam mulai/], [{ judul: 'x', tanggal: '2026-10-13', ulang: 'tahunan' }, /pengulangan/],
    [{ judul: 'x', tanggal: '2026-10-13', ulang: 'harian', sampai: '2026-10-01' }, /akhir pengulangan/], [{ judul: 'x', tanggal: '2026-10-13', pengingat: '7' }, /pengingat/],
    [{ judul: 'x', tanggal: '2026-10-13', id: '../x' }, /ID agenda/],
  ]) assert.throws(() => I.periksaAgenda(isian), pola, JSON.stringify(isian));
  const b = I.periksaAgenda({ judul: 'x', tanggal: '2026-10-13', beres: ['2026-10-14', 'bukan', '2026-10-14', '2026-10-13'] });
  assert.deepEqual(b.beres, ['2026-10-13', '2026-10-14'], 'tanggal selesai unik, terurut, yang tak sah dibuang');
});

test('kejadianAgenda: sekali, harian, hari kerja, mingguan, bulanan, dan batas sampai', () => {
  const ag = f => I.periksaAgenda({ judul: f.judul || 'x', tanggal: '2026-10-13', ...f });   // Selasa
  const tgl = (a, dari = '2026-10-12', sampai = '2026-10-25') => I.kejadianAgenda([a], dari, sampai).map(k => k.tanggal.slice(8)).join(' ');
  assert.equal(tgl(ag({})), '13');
  assert.equal(tgl(ag({ ulang: 'harian', sampai: '2026-10-16' })), '13 14 15 16');
  assert.equal(tgl(ag({ ulang: 'kerja' })), '13 14 15 16 19 20 21 22 23', 'Sabtu–Minggu dilewati');
  assert.equal(tgl(ag({ ulang: 'mingguan' })), '13 20');
  assert.equal(tgl(ag({ ulang: 'bulanan' }), '2026-10-01', '2026-12-31'), '13 13 13');
  assert.equal(tgl(I.periksaAgenda({ judul: 'akhir', tanggal: '2026-01-31', ulang: 'bulanan' }), '2026-02-01', '2026-03-31'), '31', 'Februari tanpa tanggal 31 dilewati');
  // Urut tanggal lalu jam; agenda sepanjang hari lebih dulu; tanda selesai per tanggal.
  const pagi = ag({ judul: 'Pagi', mulai: '08:00', ulang: 'harian', beres: ['2026-10-14'] });
  const siang = ag({ judul: 'Siang', mulai: '13:00' });
  const sehari = ag({ judul: 'Cuti setengah hari' });
  const k = I.kejadianAgenda([siang, pagi, sehari], '2026-10-13', '2026-10-14');
  assert.deepEqual(k.map(x => `${x.tanggal.slice(8)} ${x.a.judul} ${x.beres ? '✓' : ''}`.trim()), ['13 Cuti setengah hari', '13 Pagi', '13 Siang', '14 Pagi ✓']);
});

test('waktuPengingat: menit sebelum jam mulai; sepanjang hari pukul 07.00 (atau sehari sebelumnya)', () => {
  const jam = ms => { const d = new Date(ms); return `${I.isoHari(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const ag = f => I.periksaAgenda({ judul: 'x', tanggal: '2026-10-13', ...f });
  assert.equal(jam(I.waktuPengingat(ag({ mulai: '09:00', pengingat: '10' }), '2026-10-13')), '2026-10-13 08:50');
  assert.equal(jam(I.waktuPengingat(ag({ mulai: '09:00', pengingat: '0' }), '2026-10-13')), '2026-10-13 09:00');
  assert.equal(jam(I.waktuPengingat(ag({ mulai: '09:00', pengingat: '1440' }), '2026-10-13')), '2026-10-12 09:00');
  assert.equal(jam(I.waktuPengingat(ag({ pengingat: '30' }), '2026-10-13')), '2026-10-13 07:00');
  assert.equal(jam(I.waktuPengingat(ag({ pengingat: '1440' }), '2026-10-13')), '2026-10-12 07:00');
  assert.equal(I.waktuPengingat(ag({ mulai: '09:00', pengingat: '' }), '2026-10-13'), 0, 'tanpa pengingat');
});

test('periksaEmail: opsional; yang diisi harus alamat email', () => {
  assert.equal(I.periksaEmail(''), '');
  assert.equal(I.periksaEmail('  Ali@Contoh.CO.id '), 'ali@contoh.co.id');
  for (const s of ['ali', 'ali@', '@contoh.com', 'ali@contoh', 'a b@contoh.com', 'x'.repeat(120) + '@contoh.com']) assert.throws(() => I.periksaEmail(s), /email/, s);
});

test('halaman awal boleh Kalender Saya; bahasa tampilan per profil', () => {
  assert.equal(I.periksaTampilan({ awal: 'agenda', bahasa: 'en' }, { ketat: true }).awal, 'agenda');
  assert.equal(I.periksaTampilan({ bahasa: 'en' }).bahasa, 'en');
  assert.equal(I.periksaTampilan({ bahasa: 'fr' }).bahasa, '');
});
