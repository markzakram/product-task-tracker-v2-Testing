/* Data real lewat /api/rpc (2.16.0): sumber data diatur mode Dev untuk semua pengguna; setiap
   perubahan data real diperiksa server dengan aturan aplikasi dan disimpan di tab data_real atas
   nama profil sesi itu; browser menariknya bertahap; obrolannya terpisah dari data contoh. */
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JEDA_PIN_SALAH_MS = '0';
const rpc = require('../api/rpc');
const sheet = require('../api/_sheets');
const dataReal = require('../api/_real');
const I = require('../public/inti');
const { sheetPalsu } = require('./bantu/sheet-palsu');

const PIN = '135790';
const PIN_DEV = '908172';
const ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcd';
const EMAIL = 'producttrack-v2@contoh.iam.gserviceaccount.com';

function panggil({ body, cookie } = {}) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      h: {},
      setHeader(k, v) { this.h[k.toLowerCase()] = v; },
      end(teks) { resolve({ status: this.statusCode, headers: this.h, teks, json: JSON.parse(teks) }); },
    };
    Promise.resolve(rpc({ method: 'POST', headers: cookie ? { cookie } : {}, body }, res)).catch(reject);
  });
}
const pakai = r => r.headers['set-cookie'].split(';')[0];
const aksi = (cookie, action, ...args) => panggil({ body: { action, args }, cookie });
async function masuk() { return pakai(await aksi(null, 'masuk', PIN)); }
async function sebagai(cookie, orang) {
  const r = await aksi(cookie, 'masukProfil', orang, '');
  assert.equal(r.status, 200, r.teks);
  return pakai(r);
}
function sheetV2() {
  const p = sheetPalsu([{ title: '_meta', sheetId: 1, values: [['app', 'producttrack-v2']] }], { email: EMAIL });
  sheet.klien = async () => p.k;
  return p;
}
let nomor = 0;
const perintah = (aksiData, isi) => ({ id: 'uji' + String(++nomor).padStart(5, '0'), aksi: aksiData, isi, at: Date.now(), hari: '2026-10-09' });

const klienAsli = sheet.klien;
test.beforeEach(() => {
  process.env.ACCESS_PIN = PIN;
  process.env.SESSION_SECRET = 's'.repeat(48);
  process.env.SPREADSHEET_ID = ID;
  process.env.DEV_PIN = PIN_DEV;
  for (const k of ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GOOGLE_APPLICATION_CREDENTIALS', 'VERCEL', 'VERCEL_ENV', 'APP_ENV']) delete process.env[k];
  sheet.klien = klienAsli;
});
test.after(() => { I.aturOrang([]); I.aturMaster([]); });

test('Pengembangan: server menyimpan hierarki, menolak siklus/izin, dan klien lain membaca pemindahan cabang', async () => {
  const p = sheetV2(), biasa = await masuk();
  const dev = pakai(await aksi(null, 'masukDev', PIN_DEV));
  await aksi(dev, 'aturSumber', 'real');
  const ali = await sebagai(biasa, 'ali'), andika = await sebagai(biasa, 'andika');
  const simpan = async (nama, isi) => {
    const r = await aksi(ali, 'simpanReal', perintah(nama, isi));
    assert.equal(r.status, 200, r.teks);
    return r.json.peristiwa.hasil;
  };
  const root = (await simpan('inisiatifBaru', { f: { nama: 'Generator Soal' } })).id;
  const lain = (await simpan('inisiatifBaru', { f: { nama: 'Aplikasi Internal' } })).id;
  const anak = (await simpan('inisiatifBaru', { f: { nama: 'Generator Soal OJK', induk: root } })).id;
  const cucu = (await simpan('inisiatifBaru', { f: { nama: 'Integrasi Platform', induk: anak } })).id;
  const t = (await simpan('taskBaru', { f: { title: 'Integrasi generator', pic: 'ali', inisiatif: cucu } })).id;
  const sebelum = p.tab('data_real').values.length;
  for (const [cookie, nama, isi] of [
    [ali, 'ubahInisiatif', { inisiatif: root, f: { induk: cucu } }],
    [andika, 'ubahInisiatif', { inisiatif: anak, f: { induk: lain } }],
    [ali, 'hapusInisiatif', { inisiatif: root }],
  ]) assert.equal((await aksi(cookie, 'simpanReal', perintah(nama, isi))).status, 400);
  assert.equal(p.tab('data_real').values.length, sebelum, 'penolakan tidak masuk jurnal');
  await simpan('ubahInisiatif', { inisiatif: anak, f: { induk: lain } });
  await simpan('ubahInisiatif', { inisiatif: anak, f: { nama: 'Generator OJK' } });
  const baca = await sheet.bacaReal(p.k, ID, { segar: true });
  const d = I.dataKosong();
  for (const e of baca.peristiwa) I.terapkanUbah(d, e.ubah);
  assert.equal(I.cariInisiatif(d, anak).induk, lain);
  assert.equal(I.cariInisiatif(d, cucu).induk, anak);
  assert.deepEqual(I.ringkasInisiatif(d, I.cariInisiatif(d, lain), '2026-10-22').tasks.map(x => x.id), [t]);
  assert.equal(I.ringkasInisiatif(d, I.cariInisiatif(d, root), '2026-10-22').tasks.length, 0);
  const nynda = await sebagai(biasa, 'nynda');
  const klien = I.dataKosong();
  for (const e of (await aksi(nynda, 'sinkron', { realSejak: 0 })).json.real.peristiwa) I.terapkanUbah(klien, e.ubah);
  assert.deepEqual(klien.inisiatif, d.inisiatif);
  assert.deepEqual(klien.tasks, d.tasks);
});

test('pindah pembaruan: satu perintah tersimpan, izin dan konflik asal ditolak tanpa perubahan parsial', async () => {
  const p=sheetV2(), biasa=await masuk(), dev=pakai(await aksi(null,'masukDev',PIN_DEV));
  await aksi(dev,'aturSumber','real');
  const ali=await sebagai(biasa,'ali'), andika=await sebagai(biasa,'andika');
  const simpan=async(nama,isi)=>{const r=await aksi(ali,'simpanReal',perintah(nama,isi));assert.equal(r.status,200,r.teks);return r.json.peristiwa;};
  const asal=(await simpan('inisiatifBaru',{f:{nama:'ProductTrack'}})).hasil.id;
  const tujuan=(await simpan('inisiatifBaru',{f:{nama:'ProdukApp'}})).hasil.id;
  const a=(await simpan('taskBaru',{f:{title:'Pembaruan lama',inisiatif:asal,pic:'ali'}})).hasil.id;
  const b=(await simpan('taskBaru',{f:{title:'Pembaruan lainnya',inisiatif:asal,pic:'ali'}})).hasil.id;
  const isi={tasks:[a,b],inisiatif:tujuan,asal:{[a]:asal,[b]:asal}};
  const n=p.tab('data_real').values.length;
  assert.equal((await aksi(andika,'simpanReal',perintah('pindahPembaruan',isi))).status,400);
  assert.equal((await aksi(ali,'simpanReal',perintah('pindahPembaruan',{...isi,asal:{[a]:asal,[b]:'sudah-pindah'}}))).status,400);
  assert.equal(p.tab('data_real').values.length,n);
  const hasil=await simpan('pindahPembaruan',isi);
  assert.deepEqual(hasil.hasil,{dipindah:2,tetap:0,inisiatif:tujuan});
  assert.equal(p.tab('data_real').values.length,n+1);
  const d=I.dataKosong();
  for(const e of (await sheet.bacaReal(p.k,ID,{segar:true})).peristiwa)I.terapkanUbah(d,e.ubah);
  assert.ok(d.tasks.filter(t=>[a,b].includes(t.id)).every(t=>t.inisiatif===tujuan));
  assert.equal(d.inisiatif.length,2);
});

test('pembaruan dengan tautan tersimpan bersama task; tautan salah tidak meninggalkan task kosong', async () => {
  const p=sheetV2(), biasa=await masuk(), dev=pakai(await aksi(null,'masukDev',PIN_DEV));
  await aksi(dev,'aturSumber','real');
  const ali=await sebagai(biasa,'ali');
  const x=await aksi(ali,'simpanReal',perintah('inisiatifBaru',{f:{nama:'Scraping'}}));
  const inisiatif=x.json.peristiwa.hasil.id, sebelum=p.tab('data_real').values.length;
  const f={title:'Hasil scraping',pic:'ali',inisiatif,tautan:{url:'javascript:alert(1)'}};
  assert.equal((await aksi(ali,'simpanReal',perintah('taskBaru',{f}))).status,400);
  assert.equal(p.tab('data_real').values.length,sebelum);
  f.tautan={url:'docs.google.com/spreadsheets/d/hasil',label:'Data SKD'};
  const r=await aksi(ali,'simpanReal',perintah('taskBaru',{f}));
  assert.equal(r.status,200,r.teks);
  assert.equal(p.tab('data_real').values.length,sebelum+1);
  const d=I.dataKosong();
  for(const e of (await sheet.bacaReal(p.k,ID,{segar:true})).peristiwa)I.terapkanUbah(d,e.ubah);
  assert.equal(d.tasks.length,1);
  assert.equal(d.tasks[0].evidence[0].url,'https://docs.google.com/spreadsheets/d/hasil');
  assert.equal(d.tasks[0].evidence[0].label,'Data SKD');
});

test('persetujuan massal Manager: izin, versi terbaru, satu jurnal dan pembacaan klien lain', async () => {
  const p = sheetV2(), biasa = await masuk(), dev = pakai(await aksi(null, 'masukDev', PIN_DEV));
  await aksi(dev, 'aturSumber', 'real');
  const manager = await sebagai(biasa, 'nynda'), lead = await sebagai(biasa, 'andika');
  const kirim = async (cookie, nama, isi) => {
    const r = await aksi(cookie, 'simpanReal', perintah(nama, isi));
    assert.equal(r.status, 200, r.teks);
    return r.json.peristiwa;
  };
  const proyek = (await kirim(manager, 'proyekBaru', { f: { name: 'Riset SKD', platform: 'CPNS' } })).hasil.id;
  const ids = [];
  for (const title of ['Riset awal', 'Riset lanjutan', 'Tetap ditinjau']) {
    const task = (await kirim(manager, 'taskBaru', { f: { title, project: proyek, sub: 'A2', pic: 'andika', output: 'Hasil riset lengkap' } })).hasil.id;
    await kirim(lead, 'tambahBukti', { task, f: { url: 'https://contoh.id/riset' } });
    await kirim(lead, 'terapkanAksi', { task, kunci: 'mulai' });
    await kirim(lead, 'terapkanAksi', { task, kunci: 'ajukan' });
    ids.push(task);
  }
  const baca = async () => {
    const d = I.dataKosong();
    for (const e of (await sheet.bacaReal(p.k, ID, { segar: true })).peristiwa) I.terapkanUbah(d, e.ubah);
    return d;
  };
  const d = await baca(), tasks = ids.slice(0, 2), versi = Object.fromEntries(d.tasks.map(t => [t.id, I.versiTinjauan(t)]));
  const n = p.tab('data_real').values.length;
  assert.equal((await aksi(lead, 'simpanReal', perintah('setujuiBanyak', { tasks, versi }))).status, 400);
  assert.equal((await aksi(manager, 'simpanReal', perintah('setujuiBanyak', { tasks, versi: { ...versi, [tasks[1]]: 'stale' } }))).status, 400);
  assert.equal(p.tab('data_real').values.length, n);
  const per = perintah('setujuiBanyak', { tasks, versi });
  const hasil = await aksi(manager, 'simpanReal', per);
  assert.equal(hasil.status, 200, hasil.teks);
  assert.deepEqual(hasil.json.peristiwa.hasil, { disetujui: 2 });
  assert.equal(p.tab('data_real').values.length, n + 1);
  assert.equal((await aksi(manager, 'simpanReal', per)).status, 200, 'retry id yang sama idempoten');
  assert.equal(p.tab('data_real').values.length, n + 1);
  const klien = I.dataKosong();
  for (const e of (await aksi(lead, 'sinkron', { realSejak: 0 })).json.real.peristiwa) I.terapkanUbah(klien, e.ubah);
  assert.equal(klien.tasks.filter(t => t.status === 'Selesai').length, 2);
  assert.equal(klien.tasks.find(t => t.id === ids[2]).status, 'Ditinjau');
});

test('sumber data: hanya mode Dev yang mengganti, untuk semua pengguna; data contoh tetap bawaan', async () => {
  const p = sheetV2();
  const biasa = await masuk();
  assert.equal((await aksi(biasa, 'muatContoh')).json.mode, 'contoh', 'belum ada setelan = data contoh');
  assert.equal((await aksi(biasa, 'aturSumber', 'real')).status, 403);
  const dev = pakai(await aksi(null, 'masukDev', PIN_DEV));
  assert.equal((await aksi(dev, 'aturSumber', 'semua')).status, 400);
  assert.equal(p.tab('setelan'), undefined, 'penolakan tak menulis apa pun');
  const r = await aksi(dev, 'aturSumber', 'real');
  assert.equal(r.status, 200, r.teks);
  assert.deepEqual(p.tab('setelan').values.slice(0, 2).map(b => b.slice(0, 3)), [['kunci', 'nilai', 'oleh'], ['sumber_data', 'real', 'dev']]);
  const muat = await aksi(biasa, 'muatContoh', {});
  assert.equal(muat.status, 200, muat.teks);
  assert.deepEqual([muat.json.mode, muat.json.data, muat.json.sumber, muat.json.real.seq, muat.json.real.peristiwa], ['real', null, 'Data real', 0, []]);
  assert.ok(Array.isArray(muat.json.master) && Array.isArray(muat.json.orang), 'organogram & Master tetap terkirim');
  await aksi(dev, 'aturSumber', 'contoh');
  assert.equal((await aksi(biasa, 'sinkron', {})).json.mode, 'contoh');
  assert.equal(p.tab('setelan').values.length, 2, 'setelan ditimpa, bukan ditambah');
});

test('simpanReal: hanya saat data real aktif, atas nama profil sesi, dan hanya yang lolos aturan', async () => {
  const p = sheetV2();
  const biasa = await masuk();
  const dev = pakai(await aksi(null, 'masukDev', PIN_DEV));
  const buat = perintah('proyekBaru', { f: { name: 'Produksi OJK 2027', platform: 'OJK' } });
  const contoh = await aksi(await sebagai(biasa, 'nynda'), 'simpanReal', buat);
  assert.deepEqual([contoh.status, contoh.json.kode], [403, 'SUMBER'], 'data contoh aktif: tak masuk data real');
  await aksi(dev, 'aturSumber', 'real');
  assert.equal((await aksi(biasa, 'simpanReal', buat)).status, 403, 'tanpa profil ditolak');
  const kiki = await sebagai(biasa, 'kiki');
  const tolak = await aksi(kiki, 'simpanReal', buat);
  assert.deepEqual([tolak.status, tolak.json.message], [400, 'Hanya Manager yang membuat proyek.'], 'aturan aplikasi berlaku di server');
  assert.equal(p.tab('data_real'), undefined, 'yang ditolak tak menulis apa pun');

  const nynda = await sebagai(biasa, 'nynda');
  const r = await aksi(nynda, 'simpanReal', { ...buat, oleh: 'kiki' });
  assert.equal(r.status, 200, r.teks);
  const e = r.json.peristiwa;
  assert.deepEqual([e.seq, e.oleh, e.aksi, e.hasil, e.generasi], [1, 'nynda', 'proyekBaru', { id: 'PRJ-1' }, buat.id], 'pelaku = profil sesi, bukan isian browser');
  assert.equal(e.ubah.projects.pasang[0].name, 'Produksi OJK 2027');
  assert.deepEqual(p.tab('data_real').values[0], ['id', 'bagian', 'at', 'oleh', 'aksi', 'hari', 'perintah', 'ubah', 'dasar']);
  // Kiriman ulang dengan id yang sama (balasan pertama hilang di jalan) tak menambah baris.
  const ulang = await aksi(nynda, 'simpanReal', buat);
  assert.deepEqual([ulang.json.peristiwa.seq, ulang.json.peristiwa.ulang, p.tab('data_real').values.length], [1, true, 2]);
  // Perintah berikutnya diperiksa terhadap keadaan sesudah perintah pertama.
  const task = await aksi(nynda, 'simpanReal', perintah('taskBaru', { f: { title: 'A1 intake', project: 'PRJ-1', sub: 'A1', pic: 'nynda' } }));
  assert.deepEqual([task.status, task.json.peristiwa.seq, task.json.peristiwa.hasil], [200, 2, { id: 'PRD-001' }], task.teks);
  const salah = await aksi(nynda, 'simpanReal', perintah('terapkanAksi', { task: 'PRD-001', kunci: 'setujui' }));
  assert.equal(salah.status, 400, 'aksi yang tak tersedia untuk task Antre ditolak');
  assert.equal((await aksi(nynda, 'simpanReal', { id: 'x', aksi: 'taskBaru', isi: {} })).status, 400, 'perintah yang tak rapi ditolak');
});

test('simpanReal: PIC induk bisa diganti ke staff lalu Lead; pilihan tim disimpan dan turunan tetap utuh', async () => {
  const p = sheetV2();
  const dev = pakai(await aksi(null, 'masukDev', PIN_DEV));
  await aksi(dev, 'aturSumber', 'real');
  const biasa = await masuk();
  const nynda = await sebagai(biasa, 'nynda');
  const andika = await sebagai(biasa, 'andika');
  const simpan = async (cookie, nama, isi) => {
    const r = await aksi(cookie, 'simpanReal', perintah(nama, isi));
    assert.equal(r.status, 200, r.teks);
    return r.json.peristiwa;
  };
  const proyek = await simpan(nynda, 'proyekBaru', { f: { name: 'Materi OJK' } });
  const induk = await simpan(nynda, 'taskBaru', { f: { title: 'Develop materi', project: proyek.hasil.id, sub: 'DV1', pic: 'andika' } });
  const anak = await simpan(andika, 'taskAnak', { induk: induk.hasil.id, f: { title: 'Konsep dasar', pic: 'uma' } });
  for (const [cookie, pic] of [[andika, 'tri'], [nynda, 'wildan'], [andika, 'andika']]) {
    await simpan(cookie, 'ubahTask', { task: induk.hasil.id, f: { pic } });
    const d = I.dataKosong();
    const hasil = await aksi(nynda, 'sinkron', {});
    assert.equal(hasil.status, 200, hasil.teks);
    for (const e of hasil.json.real.peristiwa) I.terapkanUbah(d, e.ubah);
    assert.equal(d.tasks.find(t => t.id === induk.hasil.id).pic, pic, 'PIC baru terbaca kembali dari server');
    assert.equal(d.tasks.find(t => t.id === anak.hasil.id).pic, 'uma', 'PIC task turunan tetap');
  }
  const jumlah = p.tab('data_real').values.length;
  const tolak = await aksi(nynda, 'simpanReal', perintah('ubahTask', { task: induk.hasil.id, f: { pic: 'kiki' } }));
  assert.equal(tolak.status, 400, 'induk tidak dipindahkan ke tim lain');
  assert.equal(p.tab('data_real').values.length, jumlah, 'penolakan tidak menulis perubahan');
});

test('sinkron: perubahan bertahap sejak nomor urut, dari awal kalau generasinya lain; obrolan data real terpisah', async () => {
  const p = sheetV2();
  const biasa = await masuk();
  const dev = pakai(await aksi(null, 'masukDev', PIN_DEV));
  const nynda = await sebagai(biasa, 'nynda');
  // Pesan di data contoh dulu.
  const pesan = { jenis: 'pesan', ruang: 'task:PRD-001', oleh: 'nynda', teks: 'Pesan data contoh' };
  assert.equal((await aksi(nynda, 'kirimObrolan', pesan)).status, 200);
  await aksi(dev, 'aturSumber', 'real');
  for (const nama of ['P1', 'P2', 'P3']) await aksi(nynda, 'simpanReal', perintah('proyekBaru', { f: { name: nama } }));
  const awal = (await aksi(nynda, 'sinkron', { realSejak: 0 })).json;
  assert.deepEqual([awal.mode, awal.real.seq, awal.real.dariAwal, awal.real.peristiwa.map(e => e.seq)], ['real', 3, true, [1, 2, 3]]);
  assert.deepEqual(awal.obrolan.peristiwa, [], 'obrolan data contoh tak terbawa ke data real');
  const lanjut = (await aksi(nynda, 'sinkron', { realSejak: 2, generasi: awal.real.generasi })).json.real;
  assert.deepEqual([lanjut.dariAwal, lanjut.peristiwa.map(e => [e.seq, e.ubah.projects.pasang[0].name])], [false, [[3, 'P3']]]);
  const lain = (await aksi(nynda, 'sinkron', { realSejak: 2, generasi: 'tab-lama' })).json.real;
  assert.deepEqual([lain.dariAwal, lain.peristiwa.length], [true, 3], 'generasi lain: semua dari awal');
  // Obrolan data real di tab sendiri.
  await aksi(nynda, 'kirimObrolan', { ...pesan, teks: 'Pesan data real' });
  assert.deepEqual(p.tab('obrolan_real').values.slice(1).map(b => b[5]), ['Pesan data real']);
  assert.deepEqual((await aksi(nynda, 'muatObrolan', 0)).json.peristiwa.map(e => e.teks), ['Pesan data real']);
  assert.equal(p.tab('obrolan').values.length, 2, 'obrolan data contoh tetap utuh');
});

test('perubahan besar terpecah ke beberapa baris berurutan dan terbaca utuh; baca bertahap mengikuti tab yang dibuat ulang', async () => {
  const p = sheetV2();
  const dev = pakai(await aksi(null, 'masukDev', PIN_DEV));
  await aksi(dev, 'aturSumber', 'real');
  const nynda = await sebagai(await masuk(), 'nynda');
  await aksi(nynda, 'simpanReal', perintah('proyekBaru', { f: { name: 'Besar' } }));
  const besar = await aksi(nynda, 'simpanReal', perintah('taskBaru', { f: { title: 'Task panjang', project: 'PRJ-1', sub: 'A2', pic: 'nynda', detail: 'Keterangan '.repeat(3500) } }));
  assert.equal(besar.status, 200, besar.teks);
  // Detail 38.500 karakter muncul di perubahan task dan di catatan perintahnya: tetap satu perubahan, beberapa baris.
  const baris = p.tab('data_real').values.slice(1);
  assert.ok(baris.length >= 2 && baris.every(b => b[7].length <= 45000), `${baris.length} baris`);
  const baca = await sheet.bacaReal(p.k, ID, { segar: true });
  assert.deepEqual([baca.peristiwa.length, baca.rusak, baca.peristiwa[1].ubah.tasks.pasang[0].detail.length], [2, 0, 'Keterangan '.repeat(3500).trim().length]);
  // Tab dihapus lalu terisi lagi (mis. data real dimulai ulang dengan tangan): generasi baru, dibaca dari awal.
  p.tabs.splice(p.tabs.indexOf(p.tab('data_real')), 1);
  await aksi(nynda, 'simpanReal', perintah('proyekBaru', { f: { name: 'Mulai lagi' } }));
  const ulang = await sheet.bacaReal(p.k, ID, { segar: true });
  assert.deepEqual([ulang.peristiwa.length, ulang.peristiwa[0].ubah.projects.pasang[0].id], [1, 'PRJ-1'], 'nomor proyek mulai lagi dari data kosong');
  assert.notEqual(ulang.generasi, baca.generasi);
});

/* Instance server kedua: antrean dan susunan keadaannya sendiri, modul spreadsheet bersama. */
function instanceLain() {
  const jalur = require.resolve('../api/_real');
  const asli = require.cache[jalur];
  delete require.cache[jalur];
  const lain = require('../api/_real');
  require.cache[jalur] = asli;
  return lain;
}

test('dua instance bersamaan: yang menyelip menang; yang kalah diperiksa ulang, lalu ditulis lagi atau ditolak', async () => {
  const p = sheetV2();
  const dev = pakai(await aksi(null, 'masukDev', PIN_DEV));
  await aksi(dev, 'aturSumber', 'real');
  const nynda = await sebagai(await masuk(), 'nynda');
  await aksi(nynda, 'simpanReal', perintah('proyekBaru', { f: { name: 'Bersama' } }));
  const lain = instanceLain();
  const tulisAsli = sheet.tulisReal;
  // Instance lain menyimpan perintahnya tepat di antara pemeriksaan dan penulisan instance ini.
  const selipkan = (buat, kali = 1) => {
    let dalam = false;
    sheet.tulisReal = async (...a) => {
      if (!dalam && kali-- > 0) {
        dalam = true;
        try { await lain.simpan(p.k, ID, buat(), 'nynda'); } finally { dalam = false; }
      }
      return tulisAsli(...a);
    };
  };
  try {
    // Dua task baru dihitung dari keadaan yang sama, jadi nomornya sama-sama PRD-001.
    selipkan(() => perintah('taskBaru', { f: { title: 'Dari instance lain', project: 'PRJ-1', sub: 'A1', pic: 'nynda' } }));
    const kita = perintah('taskBaru', { f: { title: 'Dari instance ini', project: 'PRJ-1', sub: 'A2', pic: 'nynda' } });
    const r = await aksi(nynda, 'simpanReal', kita);
    assert.equal(r.status, 200, r.teks);
    assert.deepEqual([r.json.peristiwa.seq, r.json.peristiwa.hasil], [4, { id: 'PRD-002' }], 'diperiksa ulang: dapat nomor berikutnya');
    assert.deepEqual(p.tab('data_real').values.slice(1).map(b => [b[0] === kita.id, b[8]]), [[false, '0'], [false, '1'], [true, '1'], [true, '3']]);
    const s = (await aksi(nynda, 'sinkron', { realSejak: 0 })).json.real;
    assert.deepEqual([s.seq, s.peristiwa.map(e => e.sah !== false), s.peristiwa[2].ubah], [4, [true, true, false, true], {}], 'yang kalah dikirim tanpa isi');
    const d = I.dataKosong();
    for (const e of s.peristiwa) if (e.sah !== false) I.terapkanUbah(d, e.ubah);
    assert.deepEqual(d.tasks.map(t => [t.id, t.title]).sort(), [['PRD-001', 'Dari instance lain'], ['PRD-002', 'Dari instance ini']], 'tak ada task yang tertimpa');
    const ulang = await aksi(nynda, 'simpanReal', kita);
    assert.deepEqual([ulang.json.peristiwa.seq, ulang.json.peristiwa.ulang], [4, true], 'baris yang kalah tak dihitung sudah tersimpan');

    // Aksi yang sama dua kali: yang kalah kini tak lolos aturan.
    selipkan(() => perintah('terapkanAksi', { task: 'PRD-001', kunci: 'mulai' }));
    const dobel = await aksi(nynda, 'simpanReal', perintah('terapkanAksi', { task: 'PRD-001', kunci: 'mulai' }));
    assert.equal(dobel.status, 400, dobel.teks);

    // Terus kalah: berhenti setelah PERCOBAAN_MAKS kali; browser mengirim lagi nanti.
    selipkan(() => perintah('proyekBaru', { f: { name: 'Proyek instance lain' } }), Infinity);
    const ramai = await aksi(nynda, 'simpanReal', perintah('proyekBaru', { f: { name: 'Proyek ramai' } }));
    assert.equal(ramai.status, 500, ramai.teks);
    sheet.tulisReal = tulisAsli;
    const sistem = (await aksi(dev, 'sistem')).json.real;
    const kalah = 1 + 1 + dataReal.PERCOBAAN_MAKS;
    assert.deepEqual([sistem.perubahan, sistem.diulang], [p.tab('data_real').values.length - 1 - kalah, kalah]);
    const sel = p.tab('data_real').values.slice(1).reduce((n, b) => n + b[6].length + b[7].length, 0);
    assert.equal(sistem.ukuran, sel, 'perkiraan besar riwayat = isi sel perintah dan ubah');
  } finally {
    sheet.tulisReal = tulisAsli;
  }
});

test('mode uji Dev (2.25.0): hanya sesi Dev yang memakai data contoh sementara yang lain tetap di data real; obrolannya ikut data contoh', async () => {
  const p = sheetV2();
  const biasa = await masuk();
  const dev = pakai(await aksi(null, 'masukDev', PIN_DEV));
  await aksi(dev, 'aturSumber', 'real');
  const lain = (await aksi(biasa, 'muatContoh', { uji: true })).json;
  assert.deepEqual([lain.mode, lain.uji, lain.global], ['real', false, 'real'], 'bukan sesi Dev: permintaan uji diabaikan');
  const uji = (await aksi(dev, 'muatContoh', { uji: true })).json;
  assert.deepEqual([uji.mode, uji.uji, uji.global], ['contoh', true, 'real']);
  assert.deepEqual([(await aksi(dev, 'muatContoh', {})).json.mode], ['real'], 'tanpa uji: sesi Dev pun di sumber global');
  const s = (await aksi(dev, 'sinkron', { uji: true })).json;
  assert.deepEqual([s.mode, s.uji, s.real], ['contoh', true, undefined], 'mode uji tak menarik data real');
  assert.deepEqual([(await aksi(biasa, 'sinkron', { uji: true })).json.mode], ['real']);

  // Pesan dari mode uji masuk obrolan data contoh; pengguna data real tak melihatnya.
  const devNynda = await sebagai(dev, 'nynda');
  const pesan = { jenis: 'pesan', ruang: 'task:PRD-001', oleh: 'nynda', teks: 'Coba fitur baru' };
  assert.equal((await aksi(devNynda, 'kirimObrolan', pesan, { uji: true })).status, 200);
  assert.deepEqual(p.tab('obrolan').values.slice(1).map(b => b[5]), ['Coba fitur baru']);
  assert.equal(p.tab('obrolan_real'), undefined);
  const nynda = await sebagai(biasa, 'nynda');
  assert.deepEqual((await aksi(nynda, 'sinkron', { obrolanSejak: 0 })).json.obrolan.peristiwa, []);
  assert.deepEqual((await aksi(devNynda, 'sinkron', { obrolanSejak: 0, uji: true })).json.obrolan.peristiwa.map(e => e.teks), ['Coba fitur baru']);
});

test('hapus & pindah sub-stage (2.25.0): diperiksa terhadap sumber data yang dipakai semua orang saja', async () => {
  const p = sheetV2();
  const { urai } = require('../api/_skema');
  const biasa = await masuk();
  const dev = pakai(await aksi(null, 'masukDev', PIN_DEV));
  try {
    // Data contoh memakai E8; data real memakai E9.
    const isi = { projects: [], tasks: [], packages: [], dashboards: [], links: [], notes: [], log: [] };
    I.taskBaru(isi, { title: 'Cek akun guru', sub: 'R1', pic: 'ali' }, 'ali', Date.UTC(2026, 9, 13), '2026-10-13');
    isi.tasks[0].sub = 'E8';
    await sheet.tulisContoh(p.k, ID, urai(isi), { sumber: 'uji' });
    const contohAktif = await aksi(dev, 'simpanMaster', 'substage', { kunci: 'E8', dihapus: true });
    assert.equal(contohAktif.status, 400, 'data contoh aktif: yang dipakai data contoh tak bisa dihapus');
    assert.match(contohAktif.json.message, /E8 dipakai 1 task di data contoh/);

    await aksi(dev, 'aturSumber', 'real');
    const nynda = await sebagai(biasa, 'nynda');
    await aksi(nynda, 'simpanReal', perintah('proyekBaru', { f: { name: 'Produksi uji' } }));
    const t = await aksi(nynda, 'simpanReal', perintah('taskBaru', { f: { title: 'Monitoring guru', project: 'PRJ-1', sub: 'E9', pic: 'dhea' } }));
    assert.equal(t.status, 200, t.teks);

    const e8 = await aksi(dev, 'simpanMaster', 'substage', { kunci: 'E8', dihapus: true });
    assert.equal(e8.status, 200, 'data real aktif: pemakaian di data contoh tak lagi menghalangi');
    const e9 = await aksi(dev, 'simpanMaster', 'substage', { kunci: 'E9', dihapus: true });
    assert.equal(e9.status, 400);
    assert.match(e9.json.message, /E9 dipakai 1 task di data real/);

    // Pindah: E9 dipakai data real → dinonaktifkan; E1 di alur paket, belum dipakai → dihapus dan alurnya ikut.
    const pindah = await aksi(dev, 'pindahSub', 'E9', 'E13');
    assert.equal(pindah.status, 200, pindah.teks);
    assert.deepEqual(pindah.json.tulis, [['substage', 'E13'], ['substage', 'E9']]);
    const m = new Map(pindah.json.master.map(x => [x.kunci, x]));
    assert.deepEqual([m.get('E13').nama, m.get('E13').tim, m.get('E9').aktif, m.get('E9').dihapus], ['Monitoring dan evaluasi guru', 'CO', false, undefined]);
    const alur = await aksi(dev, 'pindahSub', 'E1', 'E14');
    assert.equal(alur.status, 200, alur.teks);
    assert.deepEqual(alur.json.tulis.map(x => x[1]), ['E14', 'latsol', 'tryout', 'drilling', 'E1']);
    const latsol = alur.json.master.find(x => x.jenis === 'kategori' && x.kunci === 'latsol');
    assert.ok(latsol.alur.includes('E14:konten') && !latsol.alur.some(l => l.startsWith('E1:')));
    assert.equal(alur.json.master.find(x => x.kunci === 'E1').dihapus, true);
    const tabrak = await aksi(dev, 'pindahSub', 'E10', 'E13');
    assert.deepEqual([tabrak.status, /E13 sudah dipakai/.test(tabrak.json.message)], [400, true]);
  } finally { I.aturMaster([]); }
});
