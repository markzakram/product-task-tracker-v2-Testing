/* Hanya penggantian awal yang secara eksplisit diminta user. Tidak dipanggil
   setup rutin atau pipeline. Backup harus selesai dan diverifikasi sebelum DROP. */
const fs = require('node:fs');
const path = require('node:path');
const { kutip, GalatMySQL } = require('../api/_mysql-core');
const { hash } = require('./_mysql-snapshot');

async function gantiDatabase(pool, { database, target = 'produk_base', backupDir, terapkan = false }) {
  if (database !== 'produk_base' || target !== database) throw new GalatMySQL('Penggantian ini hanya diizinkan untuk produk_base yang telah disebutkan user.');
  const c = await pool.getConnection();
  try {
    const [[info]] = await c.query('SELECT DATABASE() AS db');
    if (info.db !== database) throw new GalatMySQL('Database aktif berbeda; penggantian ditolak.');
    const [tables] = await c.query('SELECT TABLE_NAME AS name, TABLE_TYPE AS type FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME');
    if (tables.some(t => t.type !== 'BASE TABLE')) throw new GalatMySQL('Ada view/objek selain tabel; tinjau sebelum penggantian.');
    tables.forEach(t => kutip(t.name));
    if (!terapkan) return { database, tabelAkanDiganti: tables.map(t => t.name), diterapkan: false };
    const backup = { format: 'producttrack-mysql-backup', database, dibuat: new Date().toISOString(), tables: [] };
    await c.query('START TRANSACTION WITH CONSISTENT SNAPSHOT');
    for (const t of tables) {
      const [create] = await c.query('SHOW CREATE TABLE ' + kutip(database) + '.' + kutip(t.name));
      const [rows] = await c.query('SELECT * FROM ' + kutip(database) + '.' + kutip(t.name));
      backup.tables.push({ name: t.name, create: create[0]['Create Table'], rows });
    }
    await c.commit();
    backup.checksum = hash(backup.tables);
    const file = path.join(backupDir, 'mysql-sebelum-penggantian-' + backup.dibuat.replace(/[:.]/g, '-') + '.json');
    fs.mkdirSync(backupDir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(backup), { flag: 'wx', mode: 0o600 });
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (hash(saved.tables) !== backup.checksum) throw new GalatMySQL('Verifikasi backup gagal; tabel tidak dihapus.');
    const [fresh] = await c.query('SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME');
    if (hash(fresh.map(t => t.name)) !== hash(tables.map(t => t.name))) throw new GalatMySQL('Daftar tabel berubah selama backup. Penggantian dibatalkan.');
    await c.query('SET FOREIGN_KEY_CHECKS=0');
    try {
      if (tables.length) await c.query('DROP TABLE ' + tables.map(t => kutip(database) + '.' + kutip(t.name)).join(','));
    } finally { await c.query('SET FOREIGN_KEY_CHECKS=1'); }
    return { database, backup: file, checksum: backup.checksum, tabelDiganti: tables.length, diterapkan: true };
  } finally { c.release(); }
}

module.exports = { gantiDatabase };
