const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../api/_skema');
const core = require('../api/_mysql-core');
const snapshot = require('../scripts/_mysql-snapshot');
const model = require('../scripts/_mysql-model');
const { persiapkan } = require('../scripts/_mysql-import');

const env = { MYSQL_HOST: 'localhost', MYSQL_USER: 'test', MYSQL_PASSWORD: 'secret-value', MYSQL_DATABASE: 'produk_base' };
const raw = events => ({ _meta: [['app', 'producttrack-v2']], data_real: [S.REAL_KOLOM, ...events.flatMap(e => S.realKeBaris(e))] });
const event = (id, dasar, tasks) => ({ id, at: 1700000000000, oleh: 'ali', aksi: 'test', hari: '2026-10-28', isi: {}, dasar, ubah: { tasks: { pasang: tasks } } });

test('konfigurasi MySQL menolak password kosong, tidak mengganti password yang berisi spasi, dan TLS tidak turun otomatis', () => {
  assert.throws(() => core.konfigurasi({ ...env, MYSQL_PASSWORD: '' }), /MYSQL_PASSWORD/);
  assert.equal(core.konfigurasi({ ...env, MYSQL_PASSWORD: ' a b ' }).password, ' a b ');
  assert.ok(core.konfigurasi(env).ssl);
  assert.equal(core.konfigurasi({ ...env, MYSQL_SSL_MODE: 'VERIFY_IDENTITY' }).ssl.rejectUnauthorized, true);
  assert.throws(() => core.konfigurasi({ ...env, MYSQL_SSL_MODE: 'typo' }), /SSL_MODE/);
  assert.throws(() => core.konfigurasi({ ...env, MYSQL_DATABASE: 'db;DROP TABLE tasks' }), /tidak sah/);
  assert.ok(!core.pesanGalat({ code: 'ER_PARSE_ERROR', message: 'secret-value', sql: 'secret-value' }).includes('secret-value'));
});

test('snapshot mengikuti jurnal sah; perubahan yang kalah dan payload pemulihan tidak hilang', () => {
  const s = snapshot.susun(raw([event('a', null, [{ id: 'PRD-1', title: 'Pertama' }]), event('b', 0, [{ id: 'PRD-1', title: 'Kalah' }]), event('c', 2, [{ id: 'PRD-1', title: 'Terakhir' }])]), { spreadsheet: 'test' });
  assert.equal(s.real.data.tasks[0].title, 'Terakhir');
  assert.deepEqual(s.real.events.map(e => e.sah), [true, false, true]);
  assert.equal(s.real.events[1].ubah.tasks.pasang[0].title, 'Kalah');
  assert.doesNotThrow(() => snapshot.validasiSnapshot(s));
  s.real.data.tasks[0].title = 'diubah';
  assert.throws(() => snapshot.validasiSnapshot(s), /Checksum/);
});

test('sumber asing dan jurnal rusak ditolak sebelum ada penulisan', () => {
  assert.throws(() => snapshot.susun({ _meta: [['app', 'v1']] }), /bukan spreadsheet/);
  const r = raw([event('a', 0, [])]); r.data_real[1][S.REAL_KOLOM.indexOf('ubah')] = '{rusak';
  assert.throws(() => snapshot.susun(r), /rusak/);
});

test('pemetaan mempertahankan history, properti ai dan urutan; log ber-ID sama tidak dibuang', () => {
  const data = require('../public/inti').dataKosong();
  data.projects = [{ id: 'PRJ-1', history: [{ jenis: 'lanjut', dari: 'A', ke: 'D', siklus: 1, oleh: 'ali', at: 1700000000000 }] }];
  data.tasks = [{ id: 'PRD-1', project: 'PRJ-1', title: 'Task', subtasks: [], evidence: [], comments: [], tinjauan: [{ id: 'r1', by: 'ali', action: 'ajukan', note: '', at: 1700000000000, ai: true }] }];
  data.log = [{ id: 'same', type: 'a', at: 1700000000000 }, { id: 'same', type: 'b', at: 1700000000001 }];
  const rows = model.flatten(data);
  assert.equal(rows.project_history.length, 1);
  assert.equal(rows.tasks[0]._payload.tinjauan[0].ai, true);
  assert.equal(model.siapkanBaris('log', rows.log).length, 2);
  assert.throws(() => model.siapkanBaris('tasks', [rows.tasks[0], rows.tasks[0]]), /ID ganda/);
  assert.throws(() => model.validasiRelasi({ tasks: [{ project: 'missing' }] }), /Relasi yatim/);
});

test('pemetaan tanggal memakai UTC dan menolak pemotongan teks', () => {
  assert.equal(model.sqlValue({ name: 'at', type: 'DATETIME', nullable: true }, 1700000000123), '2023-11-14 22:13:20.123');
  assert.equal(model.sqlValue({ name: 'due', type: 'DATE', nullable: true }, ''), null);
  assert.throws(() => model.sqlValue({ name: 'due', type: 'DATE', nullable: true }, '2026-13-40'), core.GalatMySQL);
  assert.throws(() => model.sqlValue({ name: 'title', type: 'VARCHAR', size: 2 }, 'abc'), /tidak dipotong/);
});

test('transaksi yang gagal dibatalkan dan koneksi selalu dilepas', async () => {
  const calls = [];
  const c = Object.fromEntries(['beginTransaction', 'commit', 'rollback', 'release'].map(n => [n, async () => calls.push(n)]));
  await assert.rejects(core.transaksi({ getConnection: async () => c }, async () => { throw new Error('gagal'); }), /gagal/);
  assert.deepEqual(calls, ['beginTransaction', 'rollback', 'release']);
});

test('penggantian awal menolak database lain sebelum membuka koneksi', async () => {
  let used = false;
  const pool = { getConnection: async () => { used = true; throw new Error('tidak boleh dibuka'); } };
  await assert.rejects(require('../scripts/_mysql-reset').gantiDatabase(pool, { database: 'database_lain', terapkan: true }), /hanya diizinkan/);
  assert.equal(used, false);
});

test('rencana penggantian tidak menulis backup atau menghapus tabel', async () => {
  const calls = [];
  const connection = {
    query: async sql => { calls.push(sql); return sql.startsWith('SELECT DATABASE') ? [[{ db: 'produk_base' }]] : [[{ name: 'tasks', type: 'BASE TABLE' }]]; },
    release: () => calls.push('release'),
  };
  const result = await require('../scripts/_mysql-reset').gantiDatabase({ getConnection: async () => connection }, { database: 'produk_base', terapkan: false });
  assert.deepEqual(result.tabelAkanDiganti, ['tasks']);
  assert.ok(calls.every(sql => !/DROP|INSERT|DELETE|UPDATE/.test(sql)));
});
