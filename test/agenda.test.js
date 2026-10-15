/* Kalender Saya (2.28.0): agenda pribadi per profil dengan pengingat. Aturannya di inti
   (periksaAgenda, kejadianAgenda, waktuPengingat, periksaEmail); penyimpanannya di server hanya
   untuk profil yang terbukti di sesi itu, dan tiap profil hanya melihat agendanya sendiri. */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');

test('periksaAgenda: isian dibersihkan; yang tak sah ditolak dengan alasan', () => {
  const a = I.periksaAgenda({ judul: '  Standup   tim ', tanggal: '2026-10-13', mulai: '09:00', selesai: '09:15', ulang: 'kerja', pengingat: '10', catatan: ' cek blocker ', lain: 'x' });
  assert.deepEqual(a, {
    id: '', judul: 'Standup tim', tanggal: '2026-10-13', mulai: '09:00', selesai: '09:15', ulang: 'kerja', sampai: '', pengingat: '10', catatan: 'cek blocker', beres: [],
    // Isian acara bersama (2.33.0): kosong untuk agenda pribadi.
    lokasi: '', tautan: '', peserta: [], terbuka: false, kait: [], notulen: '', tindak: [], jawaban: {}, ingat: {}, diundang: {}, ikut: {},
    jadwalAt: 0, notulenAt: 0, notulenOleh: '', contoh: false,
  });
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

/* ---------- Acara bersama (2.33.0) ---------- */

test('acara: isian dibersihkan — tempat, tautan rapat, peserta, terbuka, kaitan, tindak lanjut', () => {
  const a = I.periksaAgenda({
    judul: 'Review', tanggal: '2026-10-15', mulai: '13:00', selesai: '14:00', lokasi: '  Ruang   3 ', tautan: 'meet.google.com/abc-defg-hij',
    peserta: ['kiki', 'bilar', 'kiki', 'BUKAN ID', ''], terbuka: true,
    kait: [{ jenis: 'proyek', id: 'PRJ-3' }, { jenis: 'proyek', id: 'PRJ-3' }, { jenis: 'lain', id: 'PRJ-1' }, { jenis: 'task', id: 'bukan' }],
    tindak: [{ id: 'tlabc12', teks: '  Kirim  blueprint ', pic: 'andika', due: '2026-10-20', task: 'PRD-12' }, { id: 'tlabc13', teks: '   ' }],
  });
  assert.equal(a.lokasi, 'Ruang 3');
  assert.equal(a.tautan, 'https://meet.google.com/abc-defg-hij');
  assert.deepEqual(a.peserta, ['kiki', 'bilar']);
  assert.equal(a.terbuka, true);
  assert.deepEqual(a.kait, [{ jenis: 'proyek', id: 'PRJ-3' }]);
  assert.deepEqual(a.tindak, [{ id: 'tlabc12', teks: 'Kirim blueprint', pic: 'andika', due: '2026-10-20', task: 'PRD-12' }], 'butir kosong dibuang');
  for (const [isian, pola] of [
    [{ tautan: 'javascript:alert(1)' }, /Tautan rapat/], [{ lokasi: 'x'.repeat(201) }, /Lokasi/],
    [{ peserta: Array.from({ length: 41 }, (_, i) => 'org' + i) }, /40/], [{ notulen: 'x'.repeat(5001) }, /Notulen/],
    [{ tindak: [{ id: '../x', teks: 'a' }] }, /ID butir/], [{ tindak: [{ id: 'tlabc12', teks: 'x'.repeat(301) }] }, /300/],
  ]) assert.throws(() => I.periksaAgenda({ judul: 'x', tanggal: '2026-10-15', ...isian }), pola, JSON.stringify(isian).slice(0, 60));
  assert.equal(I.acaraBersama(a), true);
  assert.equal(I.acaraBersama(I.periksaAgenda({ judul: 'x', tanggal: '2026-10-15' })), false, 'agenda pribadi');
  // Peserta yang disimpan: pembuat & Dev dibuang; yang baru harus orang aktif; yang lama tetap.
  assert.deepEqual(I.periksaPeserta(['kiki', 'andika', 'dev'], 'andika'), ['kiki']);
  assert.throws(() => I.periksaPeserta(['siapa'], 'andika'), /Peserta siapa tidak dikenal/);
  assert.deepEqual(I.periksaPeserta(['siapa'], 'andika', ['siapa']), ['siapa']);
});

test('acara: simpanan pembuat — jawaban peserta yang tetap dipertahankan, undangan & ganti jadwal dicatat', () => {
  const lama = I.periksaAgenda({
    judul: 'Rapat', tanggal: '2026-10-15', mulai: '10:00', peserta: ['kiki', 'bilar'], id: 'agrapat1',
    jawaban: { kiki: { nilai: 'ya', at: 5 }, bilar: { nilai: 'tidak', at: 6 } }, diundang: { kiki: 1, bilar: 1 }, notulen: 'catatan', notulenAt: 9, notulenOleh: 'kiki',
  });
  const h = I.gabungAcara(lama, I.periksaAgenda({ ...lama, mulai: '11:00', peserta: ['kiki', 'nadya'], notulen: '' }), 100);
  assert.deepEqual(h.jawaban, { kiki: { nilai: 'ya', at: 5 } }, 'Bilar dilepas, jawabannya ikut hilang');
  assert.deepEqual(h.diundang, { kiki: 1, nadya: 100 }, 'Nadya baru diundang');
  assert.equal(h.jadwalAt, 100, 'jamnya berubah');
  assert.equal(h.notulen, 'catatan', 'notulen hanya berubah lewat ubahNotulen');
  assert.equal(I.gabungAcara(h, { ...h, judul: 'Rapat produk' }, 200).jadwalAt, 100, 'ganti judul saja: jadwal tetap');
  const pribadi = I.gabungAcara(null, I.periksaAgenda({ judul: 'x', tanggal: '2026-10-15' }), 5);
  assert.deepEqual([pribadi.jadwalAt, pribadi.diundang], [0, {}]);
});

test('acara: peserta menjawab dan memilih pengingatnya sendiri; acara Terbuka boleh diikuti siapa pun', () => {
  const a = { ...I.periksaAgenda({ judul: 'Rapat', tanggal: '2026-10-15', mulai: '10:00', pengingat: '10', peserta: ['kiki'] }), id: 'agrapat1', pemilik: 'andika' };
  const j = I.jawabAcara(a, 'kiki', { jawaban: 'mungkin', pengingat: '60' }, 50);
  assert.deepEqual(j.jawaban.kiki, { nilai: 'mungkin', at: 50 });
  assert.equal(I.pengingatUntuk(j, 'kiki'), '60');
  assert.equal(I.pengingatUntuk(j, 'andika'), '10', 'pembuat memakai pengingatnya sendiri');
  assert.equal(I.pengingatUntuk(I.jawabAcara(j, 'kiki', { pengingat: 'bawaan' }, 51), 'kiki'), '10', 'kembali ikut pembuat');
  assert.deepEqual(I.rekapJawaban(j), { ya: 1, mungkin: 1, tidak: 0, belum: 0 }, 'pembuat dihitung hadir');
  assert.equal(I.jawabanAcara(a, 'kiki'), '');
  assert.throws(() => I.jawabAcara(a, 'andika', { jawaban: 'ya' }, 1), /pembuat acara ini/);
  assert.throws(() => I.jawabAcara(a, 'bilar', { jawaban: 'ya' }, 1), /Hanya peserta/);
  assert.throws(() => I.jawabAcara(a, 'kiki', { jawaban: 'nanti' }, 1), /Hadir, Mungkin, atau Tidak/);
  const t = { ...a, terbuka: true };
  assert.throws(() => I.jawabAcara(t, 'bilar', { jawaban: 'tidak' }, 1), /Hadir atau Mungkin/);
  const ikut = I.jawabAcara(t, 'bilar', { jawaban: 'ya' }, 70);
  assert.deepEqual([ikut.peserta, ikut.ikut, ikut.diundang.bilar], [['kiki', 'bilar'], { bilar: 70 }, 70]);
  assert.deepEqual([I.bolehLihatAgenda(t, 'nadya'), I.bolehLihatAgenda(a, 'nadya'), I.ikutAcara(a, 'andika')], [true, false, true]);
});

test('acara: notulen oleh pembuat atau peserta, ditolak bila sudah diubah orang lain; "Jadikan task" menautkan butirnya', () => {
  const a = { ...I.periksaAgenda({ judul: 'Rapat', tanggal: '2026-10-15', peserta: ['kiki'] }), id: 'agrapat1', pemilik: 'andika' };
  const n1 = I.ubahNotulen(a, 'kiki', { notulen: 'Sepakat blueprint Jumat', tindak: [{ id: 'tlsatu1', teks: 'Kirim blueprint', pic: 'andika' }], versi: 0 }, 100);
  assert.deepEqual([n1.notulenAt, n1.notulenOleh, n1.tindak.length], [100, 'kiki', 1]);
  assert.throws(() => I.ubahNotulen(n1, 'andika', { notulen: 'x', versi: 0 }, 110), /baru saja diubah Kiki/);
  assert.throws(() => I.ubahNotulen(n1, 'bilar', { notulen: 'x', versi: 100 }, 110), /pembuat dan peserta/);
  const t = I.tandaiTindak(n1, 'andika', 'tlsatu1', 'PRD-77');
  assert.equal(t.tindak[0].task, 'PRD-77');
  assert.throws(() => I.tandaiTindak(n1, 'andika', 'tlhilang', 'PRD-77'), /tidak ditemukan/);
  assert.throws(() => I.tandaiTindak(n1, 'andika', 'tlsatu1', '<b>'), /ID task/);
  // Simpanan notulen dari salinan yang belum tahu task-nya tak melepas tautan itu.
  const n2 = I.ubahNotulen(t, 'andika', { notulen: 'Sepakat blueprint Jumat.', tindak: [{ id: 'tlsatu1', teks: 'Kirim blueprint final', pic: 'andika' }], versi: 100 }, 120);
  assert.deepEqual(n2.tindak[0], { id: 'tlsatu1', teks: 'Kirim blueprint final', pic: 'andika', due: '', task: 'PRD-77' });
});

test('acara: bentrok hanya dari acara bersama yang tak ditolak; agenda pribadi tak pernah dihitung', () => {
  const ag = (judul, f) => ({ ...I.periksaAgenda({ judul, tanggal: '2026-10-15', ...f }), id: 'ag' + judul.toLowerCase() + '00', pemilik: f.pemilik || 'andika' });
  const daftar = [
    ag('Review', { mulai: '10:00', selesai: '11:00', peserta: ['kiki'] }),
    ag('Pribadi', { mulai: '10:00', selesai: '11:00', pemilik: 'kiki' }),
    ag('Ditolak', { mulai: '10:30', peserta: ['kiki'], jawaban: { kiki: { nilai: 'tidak', at: 1 } } }),
    ag('Standup', { mulai: '09:00', selesai: '09:15', ulang: 'harian', peserta: ['kiki'] }),
    ag('Workshop', { tanggal: '2026-10-16', peserta: ['kiki'] }),
  ];
  const judul = (tgl, m, s, kecuali) => I.bentrokAcara(daftar, 'kiki', tgl, m, s, kecuali).map(a => a.judul);
  assert.deepEqual(judul('2026-10-15', '10:30', '11:30'), ['Review']);
  assert.deepEqual(judul('2026-10-15', '09:00', '10:00'), ['Standup'], 'yang berakhir 10.00 tak bentrok dengan yang mulai 10.00');
  assert.deepEqual(judul('2026-10-15', '', ''), ['Standup', 'Review'], 'sepanjang hari bentrok dengan semuanya');
  assert.deepEqual(judul('2026-10-16', '10:00', ''), ['Workshop'], 'tanpa jam selesai dianggap satu jam');
  assert.deepEqual(judul('2026-10-15', '10:30', '11:30', 'agreview00'), [], 'acara yang sedang diubah tak dihitung');
  assert.deepEqual(I.bentrokAcara(daftar, 'bilar', '2026-10-15', '10:00', '11:00'), []);
});

test('acara: notifikasi dihitung dari isi acaranya — undangan, jadwal, jawaban, notulen, batal', () => {
  const a = {
    ...I.periksaAgenda({ judul: 'Rapat', tanggal: '2026-10-15', mulai: '10:00', peserta: ['kiki', 'bilar'] }), id: 'agrapat1', pemilik: 'andika',
    diundang: { kiki: 10, bilar: 10 }, jadwalAt: 20, jawaban: { kiki: { nilai: 'ya', at: 30 } }, notulenAt: 40, notulenOleh: 'kiki',
  };
  const jenis = (me, sejak) => I.notifAcara([a], [], me, '2026-10-01', sejak).map(n => `${n.jenis}:${n.oleh}`);
  assert.deepEqual(jenis('kiki'), ['jadwal:andika', 'undang:andika'], 'notulennya sendiri tak diberitahukan');
  assert.deepEqual(jenis('bilar'), ['notulen:kiki', 'jadwal:andika', 'undang:andika']);
  assert.deepEqual(jenis('andika'), ['notulen:kiki', 'jawab:kiki']);
  assert.deepEqual(jenis('nadya'), []);
  assert.deepEqual(jenis('bilar', 25), ['notulen:kiki'], 'hanya yang sesudah batas');
  const batal = [{ id: 'agx1234', judul: 'Rapat', tanggal: '2026-10-15', pemilik: 'andika', peserta: ['kiki'], at: 50 }];
  assert.deepEqual(I.notifAcara([], batal, 'kiki', '2026-10-01').map(n => n.jenis), ['batal']);
  // Yang ikut sendiri ke acara Terbuka tak menerima "mengundang Anda"; pembuatnya menerima "ikut".
  const t = { ...a, terbuka: true, peserta: ['nadya'], diundang: { nadya: 60 }, ikut: { nadya: 60 }, jawaban: { nadya: { nilai: 'ya', at: 60 } }, jadwalAt: 0, notulenAt: 0 };
  assert.deepEqual([I.notifAcara([t], [], 'nadya', '2026-10-01').length, I.notifAcara([t], [], 'andika', '2026-10-01')[0].jenis], [0, 'ikut']);
  // Rapat mingguan: lonceng membuka kejadian berikutnya, bukan tanggal pertamanya.
  assert.equal(I.notifAcara([{ ...a, ulang: 'mingguan' }], [], 'kiki', '2026-10-20')[0].tanggal, '2026-10-22');
  assert.equal(I.kejadianBerikut(a, '2026-10-16'), '', 'sudah lewat');
});

test('acara ke kalender lain: .ics (RRULE, lipatan baris RFC 5545) dan tautan Google Calendar', () => {
  const a = {
    ...I.periksaAgenda({ judul: 'Rapat mingguan, produk; Q4', tanggal: '2026-10-15', mulai: '10:00', selesai: '11:00', ulang: 'kerja', sampai: '2026-12-31',
      tautan: 'https://meet.google.com/abc-defg-hij', peserta: ['kiki'], catatan: 'Agenda:\n1. Progres paket TKA, OJK, dan UTBK beserta kendalanya di tiap tim' }),
    id: 'agrapat1', pemilik: 'andika',
  };
  const cuti = { ...I.periksaAgenda({ judul: 'Cuti', tanggal: '2026-10-20' }), id: 'agcuti01', pemilik: 'kiki' };
  const ics = I.icsAgenda([a, cuti], { waktu: Date.UTC(2026, 9, 14) });
  const utc = (tgl, jam) => new Date(+tgl.slice(0, 4), +tgl.slice(5, 7) - 1, +tgl.slice(8), +jam.slice(0, 2), +jam.slice(3)).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  assert.match(ics, /^BEGIN:VCALENDAR\r\nVERSION:2\.0\r\n/);
  assert.match(ics, /END:VCALENDAR\r\n$/);
  assert.ok(ics.includes(`DTSTART:${utc('2026-10-15', '10:00')}\r\nDTEND:${utc('2026-10-15', '11:00')}\r\n`));
  assert.ok(ics.includes(`RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=${utc('2026-12-31', '23:59')}\r\n`));
  assert.ok(ics.includes('SUMMARY:Rapat mingguan\\, produk\\; Q4\r\n'), 'koma dan titik koma di-escape');
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20261020\r\nDTEND;VALUE=DATE:20261021\r\n'), 'sepanjang hari');
  assert.ok(ics.includes('DTSTAMP:20261014T000000Z\r\n'));
  for (const baris of ics.split('\r\n')) assert.ok(Buffer.byteLength(baris) <= 75, baris);
  const utuh = ics.replace(/\r\n /g, '');
  assert.ok(utuh.includes('DESCRIPTION:Agenda:\\n1. Progres paket TKA\\, OJK\\, dan UTBK beserta kendalanya di tiap tim\\n\\nTautan rapat: https://meet.google.com/abc-defg-hij\\n\\nDibuat oleh: Andika\\nPeserta: Kiki\\n\\nDari ProductTrack\r\n'), utuh);
  const g = new URL(I.tautanGoogle(a, { dari: 'From ProductTrack' }));
  assert.equal(g.origin + g.pathname, 'https://calendar.google.com/calendar/render');
  assert.equal(g.searchParams.get('dates'), `${utc('2026-10-15', '10:00')}/${utc('2026-10-15', '11:00')}`);
  assert.equal(g.searchParams.get('recur'), `RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=${utc('2026-12-31', '23:59')}`);
  assert.equal(g.searchParams.get('location'), 'https://meet.google.com/abc-defg-hij');
  assert.match(g.searchParams.get('details'), /From ProductTrack$/, 'label mengikuti bahasa tampilan');
});
