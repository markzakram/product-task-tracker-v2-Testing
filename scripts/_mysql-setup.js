const crypto = require('node:crypto');
const { GalatMySQL, kutip } = require('../api/_mysql-core');
const { BASE, EXTRA, SCHEMA } = require('./_mysql-model');
const { ROOTS } = require('./_mysql-snapshot');
const checksum = value => crypto.createHash('sha256').update(value).digest('hex');

async function inspeksi(c) {
  const [server] = await c.query('SELECT VERSION() AS versi, DATABASE() AS db, CURRENT_USER() AS akun');
  const [tables] = await c.query('SELECT TABLE_NAME AS nama, ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME');
  const [columns] = await c.query('SELECT TABLE_NAME AS tabel, COLUMN_NAME AS nama, COLUMN_TYPE AS tipe FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()');
  const [ssl] = await c.query("SHOW SESSION STATUS LIKE 'Ssl_cipher'");
  const result = { ...server[0], tls: !!ssl[0]?.Value, tables, columns };
  if (!/^8\./.test(result.versi)) throw new GalatMySQL('Migration ini menargetkan MySQL 8; versi server perlu ditinjau.');
  return result;
}

async function rencana(c) {
  const info = await inspeksi(c), exists = new Set(info.tables.map(t => t.nama));
  const owned = [...exists];
  if (owned.length) {
    if (!exists.has('meta')) throw new GalatMySQL('Sudah ada tabel tanpa penanda pemilik; gunakan prosedur penggantian yang eksplisit.');
    const [marker] = await c.query("SELECT nilai FROM `meta` WHERE kunci='app'");
    if (marker[0]?.nilai !== 'producttrack-v2') throw new GalatMySQL('Database tidak memiliki penanda ProductTrack v2 yang cocok.');
  }
  const steps = [
    { id: '001_initial', checksum: checksum(BASE), tables: [...SCHEMA.values()].filter(t => BASE.includes(t.create)), sql: [] },
    { id: '002_runtime', checksum: checksum(EXTRA), tables: [...SCHEMA.values()].filter(t => EXTRA.includes(t.create)), sql: [] },
    { id: '003_payload', checksum: checksum(JSON.stringify({ roots: Object.values(ROOTS), columns: ['_payload', '_position'] })), tables: [], sql: [] },
  ];
  const applied = exists.has('migrations') ? (await c.query('SELECT id, checksum FROM `migrations`'))[0] : [];
  for (const step of steps) {
    const old = applied.find(m => m.id === step.id);
    if (old && old.checksum !== step.checksum) throw new GalatMySQL('Checksum migration lama berubah: ' + step.id + '. Buat migration baru.');
    for (const table of step.tables) {
      if (!exists.has(table.name)) step.sql.push(table.create);
      else {
        const actual = new Set(info.columns.filter(col => col.tabel === table.name).map(col => col.nama));
        const missing = [...table.columns.keys()].filter(col => !actual.has(col));
        if (missing.length) throw new GalatMySQL('Tabel lama belum sesuai (' + table.name + '). Buat ALTER migration untuk: ' + missing.join(', '));
      }
    }
    if (step.id === '003_payload') for (const table of Object.values(ROOTS)) {
      const name = table;
      if (!info.columns.some(col => col.tabel === name && col.nama === '_payload')) step.sql.push('ALTER TABLE ' + kutip(name) + ' ADD COLUMN `_payload` JSON NULL');
      if (!info.columns.some(col => col.tabel === name && col.nama === '_position')) step.sql.push('ALTER TABLE ' + kutip(name) + ' ADD COLUMN `_position` INT NOT NULL DEFAULT 0');
    }
    if (old && step.sql.length) throw new GalatMySQL('Struktur berbeda dari migration yang sudah dicatat: ' + step.id);
    step.applied = !!old;
  }
  return { info, steps };
}

async function setup(pool, terapkan = false) {
  const c = await pool.getConnection();
  let locked = false;
  try {
    if (terapkan) {
      const [lock] = await c.query("SELECT GET_LOCK(CONCAT(DATABASE(), ':producttrack-setup'), 10) AS terkunci");
      if (Number(lock[0].terkunci) !== 1) throw new GalatMySQL('Setup lain sedang berjalan.');
      locked = true;
    }
    const plan = await rencana(c);
    if (terapkan) {
      await c.query(SCHEMA.get('meta').create);
      await c.query("INSERT INTO `meta` (kunci,nilai) VALUES ('app','producttrack-v2'),('skema','1') ON DUPLICATE KEY UPDATE kunci=kunci");
      await c.query(SCHEMA.get('migrations').create);
      // DDL melakukan implicit commit di MySQL. Semua langkah dapat dilanjutkan
      // setelah kegagalan; checksum dicatat hanya setelah satu migration lengkap.
      for (const step of plan.steps) if (!step.applied) {
        for (const sql of step.sql) await c.query(sql);
        if (step.id === '001_initial') await c.query("INSERT INTO `meta` (kunci,nilai) VALUES ('app','producttrack-v2'),('skema','1') ON DUPLICATE KEY UPDATE kunci=kunci");
        await c.execute('INSERT INTO `migrations` (id,checksum) VALUES (?,?)', [step.id, step.checksum]);
      }
    }
    return { database: plan.info.db, versi: plan.info.versi, tls: plan.info.tls, diterapkan: terapkan,
      migration: plan.steps.map(s => ({ id: s.id, sudahAda: s.applied, perintah: s.sql.length })) };
  } finally {
    if (locked) await c.query("SELECT RELEASE_LOCK(CONCAT(DATABASE(), ':producttrack-setup'))");
    c.release();
  }
}

module.exports = { inspeksi, rencana, setup };
