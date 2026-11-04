/* Catatan Saya & Link Saya di server (2.57.0). Keluhan user: catatan terlihat hilang sesudah keluar
   lalu masuk lagi, karena hanya tersimpan di browser. Kini tersimpan di Spreadsheet per profil, dan
   browser memegang salinannya. Yang dijaga di sini: hanya pemiliknya yang bisa membaca, dua perangkat
   tak saling menimpa, dan penghapusan hanya terjadi kalau pengguna benar-benar menghapus. */
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JEDA_PIN_SALAH_MS = '0';
const rpc = require('../api/rpc');
const sheet = require('../api/_sheets');
const skema = require('../api/_skema');
const I = require('../public/inti');
const { sheetPalsu } = require('./bantu/sheet-palsu');

const WAKTU = Date.UTC(2026, 10, 4, 3, 0, 0);
const catatan = (id, title, f = {}) => ({ id, user: 'ali', title, body: 'isi ' + title, folder: '', pin: false, createdAt: WAKTU, updatedAt: WAKTU, ...f });
const tautan = (id, url = 'https://contoh.id/' + id, f = {}) => ({ id, user: 'ali', title: id, url, folder: '', ...f });

/* Satu perangkat dan satu server dalam memori, memakai aturan yang sama dengan browser. */
function perangkat(awal = {}) {
  return { lokal: { notes: [], links: [], ...awal }, basis: undefined, dihapus: undefined, kalah: [], hapusLokal: [] };
}
function serverTiruan() {
  const baris = new Map();
  let jam = WAKTU;
  return {
    baris,
    daftar: () => [...baris.values()].map(x => (x.dihapus ? { jenis: x.jenis, id: x.id, rev: x.rev, dihapus: true } : { jenis: x.jenis, id: x.id, rev: x.rev, data: structuredClone(x.data) })),
    terima(me, ubah) {
      const konflik = [];
      for (const u of I.periksaMilik(ubah, me)) {
        const k = `${u.jenis}|${u.id}`;
        const lama = baris.get(k);
        if ((lama ? lama.rev : 0) !== u.rev) { konflik.push(u.id); continue; }
        baris.set(k, { jenis: u.jenis, id: u.id, rev: ++jam, dihapus: !!u.hapus, data: u.hapus ? (lama && lama.data) : u.data });
      }
      return konflik;
    },
  };
}
function sinkron(p, srv, me = 'ali', tahan = []) {
  let g;
  for (let i = 0; i < 6; i++) {
    g = I.gabungMilik({ me, lokal: p.lokal, basis: p.basis, dihapus: p.dihapus, server: srv.daftar(), tahan });
    p.lokal = g.pribadi;
    p.basis = g.basis;
    p.dihapus = g.dihapus;
    p.kalah.push(...g.kalah);
    p.hapusLokal.push(...g.hapusLokal);
    if (!g.kirim.length) return g;
    srv.terima(me, g.kirim);
  }
  throw new Error('Tidak selesai dalam 6 putaran: ' + JSON.stringify(g.kirim.map(x => x.id)));
}
const judul = p => p.lokal.notes.map(n => n.title).sort();

test('catatan lama di browser ikut terkirim, dan terbaca dari perangkat lain', () => {
  const srv = serverTiruan();
  const kantor = perangkat({ notes: [catatan('a', 'A'), catatan('b', 'B')], links: [tautan('l1')] });
  sinkron(kantor, srv);
  assert.equal(srv.baris.size, 3);
  const rumah = perangkat();
  const g = sinkron(rumah, srv);
  assert.deepEqual(judul(rumah), ['A', 'B']);
  assert.deepEqual(rumah.lokal.links.map(l => l.id), ['l1']);
  assert.equal(g.kirim.length, 0, 'tak ada yang dikirim balik');
  assert.equal(sinkron(kantor, srv).kirim.length, 0, 'keadaan stabil');
});

test('catatan yang diambil dari server lalu disunting tetap terkirim, dan tak tertimpa isi lama', () => {
  const srv = serverTiruan();
  sinkron(perangkat({ notes: [catatan('a', 'Lama')] }), srv);
  // Seperti browser: daftar server yang sama dipakai lagi sampai ada tarikan baru.
  const daftar = srv.daftar();
  let g = I.gabungMilik({ me: 'ali', lokal: { notes: [], links: [] }, server: daftar });
  const lokal = g.pribadi;
  const basis = g.basis;
  assert.notEqual(lokal.notes[0], daftar[0].data, 'bukan objek yang sama dengan daftar server');
  Object.assign(lokal.notes[0], { title: 'Disunting', updatedAt: WAKTU + 5 });
  assert.equal(daftar[0].data.title, 'Lama', 'daftar server tak ikut berubah');
  g = I.gabungMilik({ me: 'ali', lokal, basis, server: daftar });
  assert.deepEqual(g.kirim.map(u => u.data.title), ['Disunting']);
  assert.equal(g.pribadi.notes[0].title, 'Disunting', 'suntingan tak tertimpa isi lama');
});

test('catatan dari dua browser bergabung, tak saling menimpa', () => {
  const srv = serverTiruan();
  const a = perangkat({ notes: [catatan('a', 'Dari kantor')] });
  const b = perangkat({ notes: [catatan('b', 'Dari rumah')] });
  sinkron(a, srv);
  sinkron(b, srv);
  sinkron(a, srv);
  assert.deepEqual(judul(a), ['Dari kantor', 'Dari rumah']);
  assert.deepEqual(judul(b), ['Dari kantor', 'Dari rumah']);
});

test('salinan browser kosong atau rusak tak pernah menghapus isi server: justru dipulihkan', () => {
  const srv = serverTiruan();
  const p = perangkat({ notes: [catatan('a', 'A'), catatan('b', 'B')] });
  sinkron(p, srv);
  // Salinannya hilang (data situs terhapus, atau JSON rusak), basisnya masih ada.
  p.lokal = { notes: [], links: [] };
  const g = sinkron(p, srv);
  assert.deepEqual(judul(p), ['A', 'B'], 'kembali dari server');
  assert.equal(g.kirim.length, 0);
  assert.ok([...srv.baris.values()].every(x => !x.dihapus), 'tak ada yang ditandai dihapus');
});

test('hapus hanya kalau dicatat: terhapus juga di perangkat lain, dan isinya tetap ada di server', () => {
  const srv = serverTiruan();
  const a = perangkat({ notes: [catatan('a', 'A'), catatan('b', 'B')] });
  sinkron(a, srv);
  const b = perangkat();
  sinkron(b, srv);
  a.lokal.notes = a.lokal.notes.filter(n => n.id !== 'a');
  a.dihapus = { notes: ['a'] };
  sinkron(a, srv);
  assert.equal(a.dihapus.notes.length, 0, 'catatan hapus selesai');
  assert.equal(srv.baris.get('notes|a').dihapus, true);
  assert.equal(srv.baris.get('notes|a').data.title, 'A', 'isi tetap ada untuk pemulihan manual');
  sinkron(b, srv);
  assert.deepEqual(judul(b), ['B']);
  assert.deepEqual(b.hapusLokal, ['a']);
  assert.deepEqual(b.kalah, [], 'tak berubah di sini: bukan yang kalah');
  sinkron(a, srv);
  assert.deepEqual(judul(a), ['B'], 'tak kembali lagi');
});

test('suntingan satu perangkat sampai ke yang lain; yang diubah menang atas yang dihapus', () => {
  const srv = serverTiruan();
  const a = perangkat({ notes: [catatan('a', 'A')] });
  sinkron(a, srv);
  const b = perangkat();
  sinkron(b, srv);
  Object.assign(a.lokal.notes[0], { title: 'A baru', updatedAt: WAKTU + 5 });
  sinkron(a, srv);
  sinkron(b, srv);
  assert.deepEqual(judul(b), ['A baru']);
  // A menghapus selagi B sudah mengubahnya dan terkirim lebih dulu: suntingan B menang.
  Object.assign(b.lokal.notes[0], { title: 'Diubah B', updatedAt: WAKTU + 9 });
  sinkron(b, srv);
  a.lokal.notes = [];
  a.dihapus = { notes: ['a'] };
  sinkron(a, srv);
  assert.deepEqual(judul(a), ['Diubah B']);
  assert.equal(srv.baris.get('notes|a').dihapus, false);
});

test('diubah di dua perangkat: yang terbaru menang, dan yang kalah masuk riwayat versi', () => {
  const srv = serverTiruan();
  const a = perangkat({ notes: [catatan('a', 'Awal')] });
  sinkron(a, srv);
  const b = perangkat();
  sinkron(b, srv);
  Object.assign(a.lokal.notes[0], { title: 'Versi kantor', updatedAt: WAKTU + 5 });
  Object.assign(b.lokal.notes[0], { title: 'Versi rumah', updatedAt: WAKTU + 9 });
  sinkron(a, srv);
  sinkron(b, srv);
  sinkron(a, srv);
  assert.deepEqual(judul(a), ['Versi rumah']);
  assert.deepEqual(judul(b), ['Versi rumah']);
  assert.ok(a.kalah.some(n => n.title === 'Versi kantor') || b.kalah.some(n => n.title === 'Versi kantor'), 'isi yang kalah tak hilang');
});

test('catatan yang sedang ditulis tak diganti dari bawah kursor', () => {
  const srv = serverTiruan();
  const a = perangkat({ notes: [catatan('a', 'Awal')] });
  sinkron(a, srv);
  const b = perangkat();
  sinkron(b, srv);
  Object.assign(a.lokal.notes[0], { title: 'Dari kantor', updatedAt: WAKTU + 5 });
  sinkron(a, srv);
  sinkron(b, srv, 'ali', ['a']);
  assert.deepEqual(judul(b), ['Awal'], 'editor terbuka: belum diganti');
  sinkron(b, srv);
  assert.deepEqual(judul(b), ['Dari kantor'], 'sesudah ditinggalkan: ikut');
});

test('dikembalikan lewat Urungkan sesudah hapusnya terkirim: catatannya tetap kembali', () => {
  const srv = serverTiruan();
  const a = perangkat({ notes: [catatan('a', 'A')] });
  sinkron(a, srv);
  const n = a.lokal.notes[0];
  a.lokal.notes = [];
  a.dihapus = { notes: ['a'] };
  sinkron(a, srv);
  assert.equal(srv.baris.get('notes|a').dihapus, true);
  a.lokal.notes = [{ ...n, updatedAt: srv.baris.get('notes|a').rev + 1000 }];
  sinkron(a, srv);
  assert.deepEqual(judul(a), ['A']);
  assert.equal(srv.baris.get('notes|a').dihapus, false);
});

test('Urungkan sebelum hapusnya terkirim: tak ada penghapusan yang dikirim', () => {
  const srv = serverTiruan();
  const a = perangkat({ notes: [catatan('a', 'A')] });
  sinkron(a, srv);
  a.dihapus = { notes: ['a'] };   // sudah dicatat, tetapi catatannya sudah kembali
  sinkron(a, srv);
  assert.deepEqual(a.dihapus.notes, []);
  assert.equal(srv.baris.get('notes|a').dihapus, false);
});

test('butir profil lain di browser yang sama tak disentuh dan tak terkirim', () => {
  const srv = serverTiruan();
  const lain = { ...catatan('u', 'Milik Uma'), user: 'uma' };
  const a = perangkat({ notes: [catatan('a', 'A'), lain] });
  const g = sinkron(a, srv);
  assert.ok(a.lokal.notes.some(n => n.id === 'u'));
  assert.equal(srv.baris.has('notes|u'), false);
  assert.equal(g.kirim.length, 0);
});

test('catatan terlalu panjang dan link bukan alamat web tetap di browser, tanpa menahan yang lain', () => {
  const srv = serverTiruan();
  const panjang = catatan('p', 'Panjang', { body: 'x'.repeat(I.MILIK_BUTIR_MAKS + 10) });
  const a = perangkat({ notes: [panjang, catatan('a', 'A')], links: [tautan('j', 'javascript:alert(1)'), tautan('l')] });
  const g = sinkron(a, srv);
  assert.deepEqual(g.takTerkirim.sort(), ['j', 'p']);
  assert.ok(srv.baris.has('notes|a') && srv.baris.has('links|l'));
  assert.equal(srv.baris.has('notes|p'), false);
  assert.equal(a.lokal.notes.length, 2, 'tetap di browser');
});

test('periksaMilik: pemilik selalu profil sesi, dan isian yang tak sah ditolak', () => {
  const [u] = I.periksaMilik([{ jenis: 'notes', id: 'a', rev: 0, data: { title: 'x', user: 'nynda', id: 'lain' } }], 'ali');
  assert.deepEqual([u.data.user, u.data.id], ['ali', 'a'], 'tak bisa menulis atas nama orang lain');
  assert.throws(() => I.periksaMilik([], 'ali'), /1–/);
  assert.throws(() => I.periksaMilik(Array(I.MILIK_KIRIM_MAKS + 1).fill({ jenis: 'notes', id: 'a', data: {} }), 'ali'), /1–/);
  assert.throws(() => I.periksaMilik([{ jenis: 'lain', id: 'a', data: {} }], 'ali'), /Jenis/);
  assert.throws(() => I.periksaMilik([{ jenis: 'notes', id: '', data: {} }], 'ali'), /ID/);
  assert.throws(() => I.periksaMilik([{ jenis: 'links', id: 'l', data: { url: 'javascript:alert(1)' } }], 'ali'), /alamat web/);
  assert.throws(() => I.periksaMilik([{ jenis: 'notes', id: 'a', data: { body: 'x'.repeat(I.MILIK_BUTIR_MAKS + 1) } }], 'ali'), /terlalu panjang/);
  assert.equal(I.periksaMilik([{ jenis: 'notes', id: 'a', hapus: true, rev: 7 }], 'ali')[0].hapus, true);
});

test('baris tab: isi panjang dipecah per sel, kembali utuh, dan emoji tak terbelah', () => {
  const json = JSON.stringify({ body: '😀'.repeat(60000) + 'akhir' });
  const baris = skema.milikKeBaris({ id: 'a', orang: 'ali', jenis: 'notes', rev: WAKTU, json });
  assert.equal(baris.length, skema.MILIK_KOLOM.length);
  for (const sel of baris) assert.ok(String(sel).length <= skema.MILIK_SEL, 'muat satu sel');
  const x = skema.milikDariBaris(skema.MILIK_KOLOM, baris);
  assert.deepEqual([x.id, x.orang, x.jenis, x.rev, x.dihapus, x.json], ['a', 'ali', 'notes', WAKTU, false, json]);
});

/* ---------- Lewat server sungguhan, dengan Sheets tiruan ---------- */
const PIN = '135790';
const RAHASIA = 's'.repeat(48);
const ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcd';

function panggil(body, cookie) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200, h: {},
      setHeader(k, v) { this.h[k.toLowerCase()] = v; },
      end(teks) { resolve({ status: this.statusCode, headers: this.h, json: JSON.parse(teks) }); },
    };
    Promise.resolve(rpc({ method: 'POST', headers: cookie ? { cookie } : {}, body }, res)).catch(reject);
  });
}
const aksi = (cookie, action, ...args) => panggil({ action, args }, cookie);
const kueGabung = (lama, r) => { const c = r.headers['set-cookie']; return c ? String(Array.isArray(c) ? c[0] : c).split(';')[0] : lama; };

async function siapkan() {
  process.env.ACCESS_PIN = PIN;
  process.env.SESSION_SECRET = RAHASIA;
  process.env.SPREADSHEET_ID = ID;
  const p = sheetPalsu([{ title: '_meta', sheetId: 1, values: [['kunci', 'nilai'], ['app', 'producttrack-v2']] }]);
  sheet.klien = async () => p.k;
  await sheet.siapkan(p.k, ID).catch(() => null);
  const masuk = await panggil({ action: 'masuk', args: [PIN] });
  return { p, kue: masuk.headers['set-cookie'].split(';')[0] };
}
async function sebagai(kue, orang) {
  const r = await aksi(kue, 'masukProfil', orang, '');
  assert.equal(r.status, 200, JSON.stringify(r.json));
  return kueGabung(kue, r);
}

test('server: hanya pemiliknya yang membaca; dua perangkat tak saling menimpa; hapus menyisakan isi', async () => {
  const { p, kue } = await siapkan();
  const ali = await sebagai(kue, 'ali');
  const uma = await sebagai(kue, 'uma');

  let r = await aksi(ali, 'muatMilik', {});
  assert.deepEqual([r.status, r.json.orang, r.json.butir, r.json.n], [200, 'ali', [], 0], 'tab belum ada: kosong, bukan galat');

  r = await aksi(ali, 'simpanMilik', [{ jenis: 'notes', id: 'n1', rev: 0, data: catatan('n1', 'Rahasia Ali') }, { jenis: 'links', id: 'u1', rev: 0, data: tautan('u1') }]);
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.deepEqual(r.json.konflik, []);
  const rev1 = r.json.butir.find(x => x.id === 'n1').rev;
  assert.ok(rev1 > 0);
  assert.equal(p.tab('milik_saya').values[0].join(), skema.MILIK_KOLOM.join());
  assert.equal(p.tab('milik_saya').values.length, 3);

  r = await aksi(uma, 'muatMilik', {});
  assert.deepEqual(r.json.butir, [], 'Uma tak melihat isi Ali');
  assert.ok(!JSON.stringify(r.json).includes('Rahasia'));
  // ID yang sama milik profil lain: baris sendiri, tak menimpa.
  r = await aksi(uma, 'simpanMilik', [{ jenis: 'notes', id: 'n1', rev: 0, data: { ...catatan('n1', 'Milik Uma'), user: 'nynda' } }]);
  assert.equal(r.json.butir[0].data.user, 'uma', 'pemilik selalu profil sesi');
  assert.equal((await aksi(ali, 'muatMilik', {})).json.butir.find(x => x.id === 'n1').data.title, 'Rahasia Ali');

  // Perangkat lain dengan versi lama tak menimpa: butirnya dikembalikan sebagai konflik.
  r = await aksi(ali, 'simpanMilik', [{ jenis: 'notes', id: 'n1', rev: rev1, data: catatan('n1', 'Baru') }]);
  assert.deepEqual(r.json.konflik, []);
  r = await aksi(ali, 'simpanMilik', [{ jenis: 'notes', id: 'n1', rev: rev1, data: catatan('n1', 'Basi') }]);
  assert.deepEqual(r.json.konflik, ['n1']);
  assert.equal(r.json.butir.find(x => x.id === 'n1').data.title, 'Baru');
  assert.equal(p.tab('milik_saya').values.length, 4, 'diubah di barisnya, bukan baris baru');

  // Tak berubah: isinya tak dikirim ulang.
  const seb = await aksi(ali, 'muatMilik', {});
  r = await aksi(ali, 'muatMilik', { rev: seb.json.rev, n: seb.json.n });
  assert.deepEqual([r.json.sama, r.json.butir], [true, undefined]);

  // Hapus: tanpa isi di jawaban, tetapi barisnya tetap menyimpan isi.
  const revNow = seb.json.butir.find(x => x.id === 'n1').rev;
  r = await aksi(ali, 'simpanMilik', [{ jenis: 'notes', id: 'n1', rev: revNow, hapus: true }]);
  const t = r.json.butir.find(x => x.id === 'n1');
  assert.deepEqual([t.dihapus, t.data], [true, undefined]);
  const barisTab = p.tab('milik_saya').values.find(b => b[0] === 'n1' && b[1] === 'ali');
  assert.equal(barisTab[4], 'ya');
  assert.ok(barisTab[5].includes('Baru'));
});

test('server: profil harus terbukti; profil ber-PIN diminta PIN-nya; agen dan isian rusak ditolak', async () => {
  const { kue } = await siapkan();
  let r = await aksi(kue, 'muatMilik', {});
  assert.deepEqual([r.status, r.json.kode], [403, 'PROFIL'], 'belum memilih profil');
  r = await aksi(kue, 'simpanMilik', [{ jenis: 'notes', id: 'a', rev: 0, data: catatan('a', 'A') }]);
  assert.deepEqual([r.status, r.json.kode], [403, 'PROFIL']);

  const ali = await sebagai(kue, 'ali');
  r = await aksi(ali, 'simpanMilik', [{ jenis: 'lain', id: 'a', data: {} }]);
  assert.equal(r.status, 400);

  await sheet.tulisPin(await sheet.klien(), ID, 'ali', 'x'.repeat(64), 'garam');
  r = await aksi(ali, 'muatMilik', {});
  assert.deepEqual([r.status, r.json.kode], [403, 'PERLU_PIN'], 'PIN baru dipasang: diminta lagi');

  process.env.AGEN_KUNCI = 'k'.repeat(40);
  process.env.AGEN_PROFIL = 'uma';
  const agen = await panggil({ action: 'masukAgen', args: ['k'.repeat(40)] });
  const kueAgen = kueGabung(kue, agen);
  for (const [a, ...args] of [['muatMilik', {}], ['simpanMilik', []]]) {
    r = await aksi(kueAgen, a, ...args);
    assert.equal(r.status, 403, `${a}: ${JSON.stringify(r.json)}`);
    assert.equal(r.json.kode, 'AGEN');
  }
  delete process.env.AGEN_KUNCI;
  delete process.env.AGEN_PROFIL;
});
