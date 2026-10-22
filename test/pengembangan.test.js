/* Pengembangan (2.47.0): hierarki yang tersimpan, izin, agregasi, dan kompatibilitas data lama. */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');
const skema = require('../api/_skema');
const HARI = '2026-10-22', W = Date.parse('2026-10-22T03:00:00Z');

function siapkan() {
  const d = I.dataKosong();
  const buat = (nama, induk = '', me = 'ali') => I.inisiatifBaru(d, { nama, induk }, me, W);
  const root = buat('Generator Soal');
  const ojk = buat('Generator Soal OJK', root.id, 'nynda');
  const platform = buat('Integrasi Platform Latihan', ojk.id);
  const modul = buat('Mesin Generator', platform.id);
  const skd = buat('Generator Soal SKD', root.id);
  const app = buat('Aplikasi Internal');
  const task = (x, judul) => I.taskBaru(d, { title: judul, pic: 'ali', inisiatif: x.id, due: '2026-10-21' }, 'ali', W, HARI);
  return { d, root, ojk, platform, modul, skd, app, task };
}

test('subinisiatif bertingkat mewarisi PIC/tim awal, jalur membedakan nama yang sama', () => {
  const {d,root,ojk,platform,modul,skd} = siapkan();
  assert.deepEqual([ojk.pic,ojk.tim,ojk.induk], ['ali','SI',root.id]);
  assert.deepEqual(I.jejakInisiatif(d,modul.id).map(x=>x.id),[root.id,ojk.id,platform.id,modul.id]);
  const lain=I.inisiatifBaru(d,{nama:platform.nama,induk:skd.id},'ali',W+1);
  assert.notEqual(I.namaJalurInisiatif(d,lain.id),I.namaJalurInisiatif(d,platform.id));
  assert.equal(I.urutInisiatif(d).find(b=>b.x.id===modul.id).tingkat,3);
  assert.equal(I.urutInisiatif(d).length,d.inisiatif.length);
});

test('pindah cabang mempertahankan task, ID, diskusi, dan memperbarui ringkasan kedua induk', () => {
  const {d,root,ojk,modul,app,task}=siapkan();
  const t=task(modul,'Perbarui generator');
  t.comments.push({id:'kom1',author:'ali',text:'Tetap di task ini',at:W});
  const sebelum=structuredClone(d), taskLama=structuredClone(t);
  const hasil=I.jalankanPerintah(d,{aksi:'ubahInisiatif',isi:{inisiatif:ojk.id,f:{induk:app.id}},oleh:'ali',at:W+1,hari:HARI});
  assert.equal(hasil.ok,true,hasil.galat);
  assert.deepEqual(t,taskLama);
  assert.equal(I.ringkasInisiatif(d,root,HARI).tasks.length,0);
  assert.equal(I.ringkasInisiatif(d,app,HARI).tasks.length,1);
  const beda=I.bedaData(sebelum,d);
  assert.equal(beda.tasks,undefined);
  I.terapkanUbah(sebelum,beda);
  assert.deepEqual(sebelum,d,'klien lain menerima perubahan hierarki yang sama');
  I.ubahInisiatif(d,ojk,{nama:'Generator OJK terbaru'},'ali',W+2);
  assert.equal(ojk.induk,app.id,'klien lama tanpa field induk tidak melepas hubungan');
  I.ubahInisiatif(d,ojk,{induk:''},'ali',W+3);
  assert.equal(ojk.induk,'','bisa kembali ke tingkat utama');
});

test('induk palsu, diri sendiri, turunan, tim lain, dan pengguna tak berizin ditolak tanpa perubahan', () => {
  const {d,root,ojk,modul}=siapkan();
  const sebelum=structuredClone(d);
  for (const induk of [root.id,ojk.id,modul.id,'INI-tidak-ada']) {
    assert.throws(()=>I.ubahInisiatif(d,root,{induk,nama:'Jangan tersimpan'},'ali',W+1));
    assert.deepEqual(d,sebelum);
  }
  assert.throws(()=>I.inisiatifBaru(d,{nama:'Tanpa induk sah',induk:'hilang'},'ali',W),/induk tidak ditemukan/);
  assert.throws(()=>I.ubahInisiatif(d,ojk,{induk:''},'andika',W),/khusus tim/);
  assert.deepEqual(d,sebelum);
  d.inisiatif.push({id:'INI-tim-lain',nama:'Tim lain',tim:'AK',pic:'andika'});
  assert.throws(()=>I.ubahInisiatif(d,ojk,{induk:'INI-tim-lain'},'nynda',W),/tim yang sama/);
  assert.equal(ojk.induk,root.id);
});

test('ringkasan seluruh turunan menghitung sekali; scope langsung dan hapus task tetap benar', () => {
  const {d,root,ojk,modul,skd,task}=siapkan();
  const langsung=task(root,'Koordinasi generator'), selesai=task(modul,'Perbaikan generator');
  task(skd,'Perbaikan SKD');
  I.terapkanAksi(d,selesai,'mulai','ali',W+1);
  I.terapkanAksi(d,selesai,'selesai','ali',W+2);
  let r=I.ringkasInisiatif(d,root,HARI);
  assert.deepEqual([r.tasks.length,r.buka.length,r.selesai30,r.telat],[3,2,1,2]);
  assert.deepEqual(I.ringkasInisiatif(d,root,HARI,true).tasks.map(t=>t.id),[langsung.id]);
  assert.deepEqual(I.ringkasInisiatif(d,ojk,HARI).tasks.map(t=>t.id),[selesai.id]);
  I.hapusTask(d,[selesai.id],'ali',W+3);
  r=I.ringkasInisiatif(d,root,HARI);
  assert.deepEqual([r.tasks.length,r.selesai30],[2,0]);
  assert.ok(I.cariInisiatif(d,modul.id));
  assert.throws(()=>I.hapusInisiatif(d,ojk,'ali',W+4),/subinisiatif/);
  I.hapusInisiatif(d,modul,'ali',W+4);
  assert.equal(I.cariInisiatif(d,modul.id),null);
});

test('permintaan DAE di turunan digabung sekali tanpa memindahkan tujuan permintaan', () => {
  const {d,root,ojk,modul}=siapkan();
  modul.menerima=['generator'];
  d.permintaanDae=[{id:'MDA-1',jenis:'generator',status:'menunggu'}, {id:'MDA-2',jenis:'generator',status:'diterima',inisiatif:modul.id}];
  assert.equal(I.mintaDaeTerbuka(d,root),2);
  assert.equal(I.mintaDaeTerbuka(d,ojk),2);
  assert.equal(d.permintaanDae[1].inisiatif,modul.id);
});

test('data lama, induk hilang, dan siklus impor tetap terbaca tanpa kehilangan baris', () => {
  const {d,root,ojk,modul}=siapkan();
  delete root.induk;
  assert.equal(I.urutInisiatif(d).filter(b=>b.x.id===root.id).length,1);
  root.induk=modul.id;
  const urut=I.urutInisiatif(d);
  assert.equal(new Set(urut.map(b=>b.x.id)).size,d.inisiatif.length);
  assert.equal(I.turunanInisiatif(d,root.id).filter(x=>x.id===root.id).length,0);
  assert.ok(I.jejakInisiatif(d,ojk.id).length<=d.inisiatif.length);
  ojk.induk='sudah-hilang';
  assert.equal(I.urutInisiatif(d).find(b=>b.x.id===ojk.id).tingkat,0);
});

test('skema Sheets menyimpan induk di kolom tambahan; spreadsheet lama menganggap akar', () => {
  const {d,ojk,root}=siapkan();
  const kolom=skema.TAB.inisiatif;
  const baris=skema.keBaris('inisiatif',ojk);
  assert.equal(skema.dariBaris('inisiatif',kolom,baris).induk,root.id);
  assert.equal(skema.dariBaris('inisiatif',kolom.slice(0,-1),baris.slice(0,-1)).induk,'');
});
