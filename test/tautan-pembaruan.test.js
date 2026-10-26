/* Tautan awal pembaruan (2.49.0) memakai evidence yang sudah didukung semua penyimpanan. */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/inti');
const W = Date.parse('2026-10-26T03:00:00Z'), H = '2026-10-26';
function dasar() {
  const d=I.dataKosong();
  const x=I.inisiatifBaru(d,{nama:'Scraping'},'ali',W);
  const f={title:'Scraping SKD',pic:'ali',inisiatif:x.id};
  return {d,x,f,bikin:tautan=>I.taskBaru(d,{...f,tautan},'ali',W,H)};
}

test('tautan opsional: kosong tetap sah; label otomatis atau label sendiri; https ditambahkan',()=>{
  const {bikin}=dasar();
  assert.deepEqual(bikin().evidence,[]);
  assert.deepEqual(bikin({url:' ',label:'Label saja'}).evidence,[]);
  const t=bikin({url:'docs.google.com/spreadsheets/d/hasil',label:' '});
  assert.deepEqual(t.evidence,[{id:`e${W}-0`,url:'https://docs.google.com/spreadsheets/d/hasil',label:'Google Sheets'}]);
  assert.equal(bikin({url:'https://contoh.id/hasil?a=1&b=2',label:'  Hasil scraping  '}).evidence[0].label,'Hasil scraping');
});

test('tautan tidak valid ditolak sebelum task, nomor, atau log berubah',()=>{
  const {d,bikin}=dasar(), sebelum=structuredClone(d);
  for(const url of ['javascript:alert(1)','data:text/html,test','file:///C:/data.txt','bukan alamat','https://']) {
    assert.throws(()=>bikin({url}),/Alamat bukti tidak valid/);
    assert.deepEqual(d,sebelum);
  }
});

test('tautan tersimpan melalui jurnal, tetap saat diedit dan dipindah, dapat ditambah/dihapus dari hasil kerja',()=>{
  const {d,x,f}=dasar();
  const sebelum=structuredClone(d);
  const r=I.jalankanPerintah(d,{aksi:'taskBaru',isi:{f:{...f,tautan:{url:'https://contoh.id/laporan',label:'Laporan'}}},oleh:'ali',at:W,hari:H});
  assert.equal(r.ok,true,r.galat);
  I.terapkanUbah(sebelum,I.bedaData(sebelum,d));
  assert.deepEqual(sebelum,d);
  const t=r.hasil, bukti=structuredClone(t.evidence);
  I.ubahTask(d,t,{title:'Hasil scraping SKD'},'ali',W+1);
  assert.deepEqual(t.evidence,bukti,'form lama tidak menimpa bukti');
  const tujuan=I.inisiatifBaru(d,{nama:'SKD',induk:x.id},'ali',W+2);
  I.pindahPembaruan(d,[t.id],tujuan.id,{[t.id]:x.id},'ali',W+3);
  assert.deepEqual(t.evidence,bukti);
  I.tambahBukti(d,t,{url:'https://contoh.id/data'},'ali',W+4);
  assert.equal(t.evidence.length,2);
  I.hapusBukti(d,t,bukti[0].id,'ali',W+5);
  assert.equal(t.evidence.length,1);
  assert.equal(t.evidence[0].url,'https://contoh.id/data');
});

test('form Pembaruan proyek juga menyimpan tautan; pindah ke jalur Rutin/Proyek mengabaikan isian tersembunyi',()=>{
  const {d}=dasar();
  const p=I.proyekBaru(d,{name:'Riset SKD',platform:'CPNS'},'nynda',W);
  const t=I.taskBaru(d,{title:'Pembaruan riset',pic:'ali',pembaruanProyek:p.id,tautan:{url:'https://contoh.id/riset'}},'ali',W,H);
  assert.equal(t.evidence.length,1);
  for(const f of [{sub:'R1'},{project:p.id,sub:'DV7'}]) {
    const biasa=I.taskBaru(d,{title:'Task biasa',pic:'ali',...f,tautan:{url:'javascript:alert(1)'}},'ali',W,H);
    assert.deepEqual(biasa.evidence,[]);
  }
});
