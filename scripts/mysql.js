/* mysql:cek; mysql:setup -- --terapkan; mysql:ekspor; mysql:impor -- backup.json --terapkan.
   Setup/impor tanpa --terapkan hanya memeriksa. Selalu muat .env dari lokasi eksplisit. */
const fs = require('node:fs');
const path = require('node:path');
const { muatEnv } = require('./_env');
const core = require('../api/_mysql-core');
const snapshot = require('./_mysql-snapshot');

async function main(args = process.argv.slice(2)) {
  const command = args.shift();
  const envAt = args.indexOf('--env-file');
  const envFile = envAt >= 0 ? args.splice(envAt, 2)[1] : path.join(__dirname, '../.env');
  if (!envFile || !muatEnv(path.resolve(envFile))) throw new core.GalatMySQL('Berkas .env tidak ditemukan. Gunakan --env-file bila berada di worktree.');
  for (const key of ['GOOGLE_APPLICATION_CREDENTIALS', 'MYSQL_SSL_CA_FILE']) {
    if (process.env[key] && !path.isAbsolute(process.env[key])) process.env[key] = path.resolve(path.dirname(path.resolve(envFile)), process.env[key]);
  }
  const apply = args.includes('--terapkan');
  const files = args.filter(a => !a.startsWith('--'));
  const unknown = args.filter(a => a.startsWith('--') && !['--terapkan', '--kering', '--hapus-dan-ganti=produk_base'].includes(a));
  if (unknown.length) throw new core.GalatMySQL('Opsi tidak dikenali: ' + unknown.join(', '));
  if (apply && args.includes('--kering')) throw new core.GalatMySQL('--kering dan --terapkan tidak boleh dipakai bersamaan.');
  if (command === 'ekspor') {
    const data = await snapshot.ekspor();
    const target = path.resolve(files[0] || path.join(__dirname, '../db/backups/spreadsheet-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(data), { flag: 'wx', mode: 0o600 });
    require('./_mysql-import').persiapkan(data);
    console.log(JSON.stringify({ backup: target, ...snapshot.ringkasan(data) }, null, 2));
    return;
  }
  const pool = core.buatPool();
  try {
    if (command === 'ganti-awal') {
      if (!args.includes('--hapus-dan-ganti=produk_base')) throw new core.GalatMySQL('Penggantian awal memerlukan --hapus-dan-ganti=produk_base. Tidak digunakan untuk rilis rutin.');
      console.log(JSON.stringify(await require('./_mysql-reset').gantiDatabase(pool, {
        database: process.env.MYSQL_DATABASE, backupDir: path.join(__dirname, '../db/backups'), terapkan: apply,
      }), null, 2));
    } else if (command === 'cek') {
      const result = await require('./_mysql-setup').inspeksi(pool);
      console.log(JSON.stringify({ ...result, columns: undefined }, null, 2));
    } else if (command === 'setup') {
      console.log(JSON.stringify(await require('./_mysql-setup').setup(pool, apply), null, 2));
    } else if (['impor', 'verifikasi'].includes(command)) {
      if (!files[0]) throw new core.GalatMySQL('Sebutkan lokasi backup JSON hasil mysql:ekspor.');
      const data = snapshot.validasiSnapshot(JSON.parse(fs.readFileSync(path.resolve(files[0]), 'utf8')));
      const tools = require('./_mysql-import');
      const checkSource = async () => {
        const fresh = await snapshot.bacaRaw();
        if (snapshot.hash({ raw: fresh.raw, sumber: fresh.sumber.spreadsheet }) !== data.checksum) throw new core.GalatMySQL('Spreadsheet berubah sesudah backup dibuat. Transaksi dibatalkan; ekspor ulang data terbaru.');
      };
      if (apply) await checkSource();
      const result = command === 'verifikasi' ? await tools.verifikasi(pool, data)
        : await tools.impor(pool, data, { terapkan: apply, sebelumCommit: checkSource });
      console.log(JSON.stringify(result, null, 2));
    } else throw new core.GalatMySQL('Perintah: cek, setup, ekspor, impor, atau verifikasi.');
  } finally { await pool.end(); }
}

if (require.main === module) main().catch(err => {
  const sheet = require('../api/_sheets');
  console.error(err instanceof sheet.GalatSetelan || err instanceof sheet.GalatDitolak ? err.message : core.pesanGalat(err)); process.exitCode = 1;
});
module.exports = { main };
