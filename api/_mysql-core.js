/* Koneksi MySQL untuk alat migrasi dan backend. Nilai rahasia tidak masuk pesan galat. */
const fs = require('node:fs');

class GalatMySQL extends Error {}
const kutip = nama => {
  if (!/^[A-Za-z0-9_]+$/.test(nama)) throw new GalatMySQL('Nama tabel/kolom MySQL tidak sah.');
  return '`' + nama + '`';
};

function konfigurasi(env = process.env) {
  const kurang = ['MYSQL_HOST', 'MYSQL_DATABASE', 'MYSQL_USER', 'MYSQL_PASSWORD'].filter(k => !env[k]);
  if (kurang.length) throw new GalatMySQL('Isi konfigurasi lokal yang masih kosong: ' + kurang.join(', ') + '.');
  const port = Number(env.MYSQL_PORT || 3306), limit = Number(env.MYSQL_CONNECTION_LIMIT || 5);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new GalatMySQL('MYSQL_PORT tidak sah.');
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw new GalatMySQL('MYSQL_CONNECTION_LIMIT harus 1–20.');
  kutip(env.MYSQL_DATABASE);
  const mode = String(env.MYSQL_SSL_MODE || 'REQUIRED').toUpperCase();
  if (!['REQUIRED', 'VERIFY_IDENTITY', 'DISABLED'].includes(mode)) throw new GalatMySQL('MYSQL_SSL_MODE harus REQUIRED, VERIFY_IDENTITY, atau DISABLED.');
  let ssl;
  if (mode !== 'DISABLED') {
    ssl = { rejectUnauthorized: mode === 'VERIFY_IDENTITY' };
    if (env.MYSQL_SSL_CA) ssl.ca = env.MYSQL_SSL_CA;
    else if (env.MYSQL_SSL_CA_FILE) {
      try { ssl.ca = fs.readFileSync(env.MYSQL_SSL_CA_FILE, 'utf8'); }
      catch { throw new GalatMySQL('MYSQL_SSL_CA_FILE tidak dapat dibaca.'); }
    }
  }
  return {
    host: env.MYSQL_HOST, port, database: env.MYSQL_DATABASE, user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD, ssl, connectionLimit: limit,
    waitForConnections: true, queueLimit: 20, connectTimeout: 10000,
    timezone: 'Z', dateStrings: true, charset: 'utf8mb4', multipleStatements: false,
    supportBigNumbers: true, bigNumberStrings: true,
  };
}

function pesanGalat(err) {
  if (err instanceof GalatMySQL) return err.message;
  const kode = String(err && err.code || 'MYSQL_GAGAL');
  const pesan = {
    ER_ACCESS_DENIED_ERROR: 'Login MySQL ditolak. Periksa username, password, dan asal koneksi yang diizinkan tim IT.',
    ER_BAD_DB_ERROR: 'Database tujuan tidak ditemukan. Cocokkan MYSQL_DATABASE dengan tim IT.',
    ER_DBACCESS_DENIED_ERROR: 'Akun belum diberi akses ke database tujuan.',
    ETIMEDOUT: 'Koneksi MySQL habis waktu. Periksa jaringan kantor/VPN dan izin koneksi server.',
    ECONNREFUSED: 'Server menolak koneksi pada host/port tersebut.',
    HANDSHAKE_NO_SSL_SUPPORT: 'Server tidak mendukung TLS. Cocokkan pengaturan SSL dengan tim IT.',
    ER_TABLEACCESS_DENIED_ERROR: 'Akun belum memiliki izin operasi tabel yang diperlukan.',
  };
  return (pesan[kode] || 'Operasi MySQL gagal; lihat kode galat tanpa isi query atau kredensial.') + ' [' + kode.replace(/[^A-Z0-9_]/gi, '') + ']';
}

function buatPool(env = process.env) {
  return require('mysql2/promise').createPool(konfigurasi(env));
}

async function transaksi(pool, kerja) {
  const c = await pool.getConnection();
  try {
    await c.beginTransaction();
    const hasil = await kerja(c);
    await c.commit();
    return hasil;
  } catch (err) {
    try { await c.rollback(); } catch { /* pesan asli dipertahankan */ }
    throw err;
  } finally { c.release(); }
}

module.exports = { GalatMySQL, kutip, konfigurasi, pesanGalat, buatPool, transaksi };
