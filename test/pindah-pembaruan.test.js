/* Pindah isi Pengembangan (2.48.0): pilihan atomik, riwayat utuh, izin dan konflik antar-tab. */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');
const skema = require('../api/_skema');
const W = Date.parse('2026-10-22T03:00:00Z'), H = '2026-10-22';
test.afterEach(() => { I.aturOrang([]); I.aturMaster([]); });

function dasar() {
  const d = I.dataKosong();
  const lama = I.inisiatifBaru(d, {nama:'ProductTrack'}, 'ali', W);
  const root = I.inisiatifBaru(d, {nama:'ProdukApp'}, 'ali', W);
  const tujuan = I.inisiatifBaru(d, {nama:'Manajemen Task',induk:root.id}, 'ali', W);
  const task = (title, x=lama, pic='ali') => I.taskBaru(d, {title,inisiatif:x.id,pic,due:H}, 'nynda', W, H);
  const a=task('Pembaruan selesai'), b=task('Pembaruan berjalan'), c=task('Tetap di asal');
  I.terapkanAksi(d,a,'mulai','ali',W+1); I.terapkanAksi(d,a,'selesai','ali',W+2);
  I.terapkanAksi(d,b,'mulai','ali',W+1);
  const pindah=(ts=[a,b], me='ali', ke=tujuan.id, asal=Object.fromEntries(ts.map(t=>[t.id,t.inisiatif]))) => I.pindahPembaruan(d,ts.map(t=>t.id),ke,asal,me,W+10);
  return {d,lama,root,tujuan,task,a,b,c,pindah};
}

test('pindah task selesai dan berjalan mempertahankan ID, status, tanggal, ceklis, diskusi dan bukti', () => {
  const {d,lama,root,tujuan,a,b,c,pindah}=dasar();
  Object.assign(a,{output:'Hasil teruji',comments:[{id:'kom1',text:'Diskusi tetap'}],evidence:[{id:'ev1',url:'https://contoh.id/hasil'}],subtasks:[{id:'cek1',title:'Cek',done:true}],tinjauan:[{id:'review1',by:'ali',at:W}]});
  b.deps=[a.id];
  const sebelum=structuredClone(d), awalA=structuredClone(a), awalB=structuredClone(b);
  assert.deepEqual(pindah(),{dipindah:2,tetap:0,inisiatif:tujuan.id});
  assert.deepEqual(a,{...awalA,inisiatif:tujuan.id,kategori:tujuan.nama,updatedAt:W+10});
  assert.deepEqual(b,{...awalB,inisiatif:tujuan.id,kategori:tujuan.nama,updatedAt:W+10});
  assert.equal(c.inisiatif,lama.id);
  assert.deepEqual(I.ringkasInisiatif(d,root,H).tasks.map(t=>t.id).sort(),[a.id,b.id].sort());
  assert.equal(I.ringkasInisiatif(d,lama,H).tasks.length,1);
  const beda=I.bedaData(sebelum,d);
  assert.equal(beda.inisiatif,undefined);
  assert.equal(beda.tasks.hapus,undefined);
  I.terapkanUbah(sebelum,beda); assert.deepEqual(sebelum,d);
});

test('ID ganda diproses sekali; task yang sudah di tujuan dilewati tanpa log baru', () => {
  const {d,a,b,tujuan,pindah}=dasar();
  const n=d.log.length;
  assert.deepEqual(pindah([a,a,b]),{dipindah:2,tetap:0,inisiatif:tujuan.id});
  assert.equal(d.log.length,n+2);
  const sebelum=structuredClone(d);
  assert.deepEqual(pindah(),{dipindah:0,tetap:2,inisiatif:tujuan.id});
  assert.deepEqual(d,sebelum);
});

test('seluruh pilihan ditolak bila tujuan tidak sah, task hilang/proyek, atau snapshot asal kedaluwarsa', () => {
  const {d,a,b,tujuan,pindah}=dasar();
  const tetap=(fn,pola)=>{const sebelum=structuredClone(d);assert.throws(fn,pola);assert.deepEqual(d,sebelum);};
  tetap(()=>pindah([]),/Pilih pembaruan/);
  tetap(()=>pindah([a,b],'ali',''),/tujuan/);
  tetap(()=>pindah([a,b],'ali','INI-hilang'),/tidak ditemukan/);
  tujuan.status='selesai'; tetap(()=>pindah(),/sudah selesai/); tujuan.status='aktif';
  tetap(()=>I.pindahPembaruan(d,[a.id,'PRD-hilang'],tujuan.id,{[a.id]:a.inisiatif},'ali',W),/tidak tersedia/);
  tetap(()=>pindah([a,b],'ali',tujuan.id,{[a.id]:a.inisiatif,[b.id]:'INI-lain'}),/Lokasi pembaruan/);
  tetap(()=>pindah([a,b],'ali',tujuan.id,null),/Lokasi pembaruan/);
  b.project='PRJ-1'; tetap(()=>pindah(),/Task proyek/); b.project='';
  b.inisiatif=''; tetap(()=>pindah(),/sudah berada/);
  tetap(()=>I.pindahPembaruan(d,Array.from({length:201},(_,i)=>'PRD-'+i),tujuan.id,{},'ali',W),/maksimal 200/);
});

test('izin dicek per task sebelum mutasi: staff hanya miliknya, Lead tim lain ditolak, Manager boleh', () => {
  I.aturOrang([{id:'rio',nama:'Rio Engineer',pendek:'Rio',peran:'staff',jabatan:'Engineer',lead:'ali',aktif:true}]);
  const {d,a,b,pindah}=dasar();
  a.pic='rio';
  const sebelum=structuredClone(d);
  assert.throws(()=>pindah([a,b],'rio'),/Hanya PIC/);
  assert.deepEqual(d,sebelum);
  assert.throws(()=>pindah([a,b],'andika'),/Hanya PIC/);
  assert.deepEqual(d,sebelum);
  assert.equal(pindah([a],'rio').dipindah,1);
  assert.equal(pindah([b],'nynda').dipindah,1);
});

test('permintaan DAE tetap tertaut dan wajib ditinjau pengirim setelah pindah', () => {
  const {d,lama,tujuan,pindah}=dasar();
  const p=I.proyekBaru(d,{name:'Riset OJK',platform:'OJK'},'nynda',W);
  I.taskBaru(d,{title:'Riset pola soal',project:p.id,sub:'A2',pic:'andika'},'nynda',W,H);
  const m=I.kirimMintaDae(d,p,{judul:'Generator OJK',jenis:'generator',kebutuhan:'Blueprint OJK'},'andika',W,H);
  const t=I.terimaMintaDae(d,m,{inisiatif:lama.id,pic:'ali',due:H},'ali',W,H);
  const reviewer=I.peninjau(t,I.indeks(d)), status=m.status;
  pindah([t]);
  assert.equal(t.permintaanDae,m.id);
  assert.equal(m.inisiatif,tujuan.id);
  assert.equal(m.task,t.id);
  assert.equal(m.status,status);
  assert.equal(I.peninjau(t,I.indeks(d)),reviewer);
  assert.equal(reviewer,'andika');
});

test('batch dengan riwayat panjang tetap terserialisasi utuh ke jurnal Sheets', () => {
  const {d,task,tujuan,pindah}=dasar();
  const ts=Array.from({length:30},(_,i)=>task('Catatan '+i));
  for(const t of ts)t.detail='Riwayat pekerjaan. '.repeat(170);
  const sebelum=structuredClone(d);
  pindah(ts);
  const ubah=I.bedaData(sebelum,d);
  const p={id:'pindah0001',aksi:'pindahPembaruan',isi:{tasks:ts.map(t=>t.id),inisiatif:tujuan.id},oleh:'ali',at:W,hari:H,ubah};
  const baris=skema.realKeBaris(p);
  const baca=skema.realDariBaris(skema.REAL_KOLOM,baris);
  assert.equal(baca.rusak,0);
  assert.deepEqual(baca.peristiwa[0].ubah,ubah);
  I.terapkanUbah(sebelum,baca.peristiwa[0].ubah);
  assert.deepEqual(sebelum,d);
});
