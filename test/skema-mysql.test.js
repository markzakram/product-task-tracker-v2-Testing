/* db/produk_base_v2.sql harus selalu sejalan dengan model data aplikasi (api/_skema.js):
   setiap koleksi punya tabel v2_<nama>, setiap field punya kolom bernama sama. Kalau
   kelak ada field baru di _skema.js tanpa kolomnya di MySQL, tes ini yang pertama gagal —
   bukan simpanan yang diam-diam membuang field itu. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const skema = require('../api/_skema');

const SQL = fs.readFileSync(path.join(__dirname, '..', 'db', 'produk_base_v2.sql'), 'utf8');

/* nama tabel → daftar kolom, dari tiap CREATE TABLE di berkas. */
function bacaTabel(sql) {
  const tabel = new Map();
  const pola = /CREATE TABLE IF NOT EXISTS `([^`]+)` \(([\s\S]*?)\n\) ENGINE/g;
  let m;
  while ((m = pola.exec(sql))) {
    const kolom = [];
    for (const baris of m[2].split('\n')) {
      const k = /^\s*`([^`]+)`\s+[A-Z]/.exec(baris);
      if (k) kolom.push(k[1]);
    }
    tabel.set(m[1], kolom);
  }
  return tabel;
}
const TABEL = bacaTabel(SQL);

test('setiap koleksi _skema.js punya tabel v2_<nama> dengan semua field-nya', () => {
  for (const [nama, field] of Object.entries(skema.TAB)) {
    const kolom = TABEL.get('v2_' + nama);
    assert.ok(kolom, `tabel v2_${nama} tidak ada di db/produk_base_v2.sql`);
    for (const f of field) assert.ok(kolom.includes(f), `v2_${nama} tidak punya kolom ${f}`);
  }
});

test('tab aplikasi (obrolan, foto, orang, master, pin) juga punya tabelnya', () => {
  const pasangan = [
    ['v2_obrolan', skema.OBROLAN], ['v2_foto', skema.FOTO], ['v2_orang', skema.ORANG_KOLOM],
    ['v2_master', skema.MASTER_KOLOM], ['v2_pin', skema.PIN_KOLOM],
  ];
  for (const [nama, field] of pasangan) {
    const kolom = TABEL.get(nama);
    assert.ok(kolom, `tabel ${nama} tidak ada`);
    for (const f of field) assert.ok(kolom.includes(f), `${nama} tidak punya kolom ${f}`);
  }
});

test('riwayat tahap proyek dan penanda pemilik ada', () => {
  assert.deepEqual(['id', 'project', 'jenis', 'dari', 'ke', 'siklus', 'oleh', 'at'].filter(k => !TABEL.get('v2_project_history').includes(k)), []);
  assert.ok(TABEL.has('v2_meta'));
  assert.match(SQL, /\('app', 'producttrack-v2'\)/);
});

test('semua tabel berawalan v2_ — tak satu pun bernama sama dengan tabel salinan v1', () => {
  const V1 = ['users', 'auth_pins', 'options', 'tasks', 'checklists', 'comments', 'activity_log', 'notifications', 'collabs',
    'collab_steps', 'packages', 'package_items', 'package_contribs', 'package_links', 'package_variants', 'user_links', 'user_notes', 'dashboards'];
  assert.equal(TABEL.size, 21);
  for (const nama of TABEL.keys()) {
    assert.ok(nama.startsWith('v2_'), nama);
    assert.ok(!V1.includes(nama), nama);
  }
});

test('berkas hanya membuat: tanpa DROP, TRUNCATE, DELETE FROM, atau ALTER', () => {
  const tanpaKomentar = SQL.replace(/--.*$/gm, '');
  assert.doesNotMatch(tanpaKomentar, /\bDROP\s+(TABLE|DATABASE|SCHEMA)\b|\bTRUNCATE\b|\bDELETE\s+FROM\b|\bALTER\s+(TABLE|DATABASE)\b/i);
});

test('setiap nama tabel dan kolom ditulis dengan backtick (`by`, `lead`, `user` adalah kata kunci MySQL)', () => {
  for (const [nama, kolom] of TABEL) {
    assert.ok(kolom.length > 0, `${nama} tanpa kolom yang terbaca — mungkin ada kolom tanpa backtick`);
  }
  const blok = [...SQL.matchAll(/CREATE TABLE IF NOT EXISTS `[^`]+` \(([\s\S]*?)\n\) ENGINE/g)].map(m => m[1]);
  for (const isi of blok) {
    for (const baris of isi.split('\n')) {
      const t = baris.trim();
      if (!t || /^(PRIMARY KEY|KEY|UNIQUE|CONSTRAINT)\b/.test(t)) continue;
      assert.match(t, /^`[^`]+`\s/, `kolom tanpa backtick: ${t}`);
    }
  }
});
