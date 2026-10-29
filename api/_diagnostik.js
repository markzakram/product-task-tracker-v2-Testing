/* Log metadata penyimpanan. Jangan masukkan payload, judul/output task, PIN atau kredensial. */
const crypto = require('node:crypto');
const versi = require('../package.json').version;
const MAX = 100;
const BACKENDS = new Set(['sheets', 'mysql', 'sheets-fallback']);
const aman = (value, max = 100) => typeof value === 'string' && /^[A-Za-z0-9_.:/-]+$/.test(value) ? value.slice(0, max) : '';
const backend = k => BACKENDS.has(k?.backend) ? k.backend : 'sheets';
const target = k => backend(k) === 'mysql' ? 'mysql:real/tasks' : backend(k) === 'sheets-fallback' ? 'none:penyimpanan_dijeda' : 'sheets:data_real';
function buatLogger({ sink = row => console.log(JSON.stringify(row)), clock = Date.now, env = process.env } = {}) {
  const rows = [];
  function catat(event, input = {}) {
    const row = {
      severity: /FAILED$|REJECTED$/.test(event) ? 'ERROR' : 'INFO',
      component: 'producttrack.storage', event: aman(event), waktu: new Date(clock()).toISOString(), versi,
      service: aman(env.K_SERVICE || 'lokal'), revision: aman(env.K_REVISION || ''),
    };
    for (const key of ['requestId', 'backend', 'target', 'action', 'commandId', 'reason', 'errorCode']) {
      const value = aman(input[key], key === 'commandId' ? 150 : 100);
      if (value) row[key] = value;
    }
    for (const key of ['seq', 'durationMs', 'httpStatus']) if (Number.isSafeInteger(input[key]) && input[key] >= 0) row[key] = input[key];
    rows.push(row); if (rows.length > MAX) rows.shift();
    try { sink(row); } catch { /* Log tidak boleh menggagalkan penyimpanan. */ }
    return { ...row };
  }
  return { catat, baca: () => rows.map(row => ({ ...row })) };
}
const logger = buatLogger();
function requestId(res) {
  const id = crypto.randomUUID();
  res.setHeader('X-Request-ID', id);
  return id;
}
function baca({ k, sumber, id, lingkungan, sourceError = '' }) {
  const aktif = backend(k), tujuan = sumber === 'real' ? target(k) : sumber === 'contoh' ? 'browser:data_contoh' : 'unknown:sumber_belum_terbaca';
  logger.catat('STORAGE_STATUS', { requestId: id, backend: aktif, target: tujuan, reason: aktif === 'sheets' ? 'MYSQL_BACKEND_NOT_ACTIVE' : aktif === 'sheets-fallback' ? 'MYSQL_UNAVAILABLE_WRITES_PAUSED' : 'MYSQL_PRIMARY' });
  const config = Object.fromEntries(['MYSQL_HOST', 'MYSQL_PORT', 'MYSQL_DATABASE', 'MYSQL_USER', 'MYSQL_PASSWORD'].map(key => [key, !!process.env[key]]));
  return {
    versi, waktu: new Date().toISOString(), lingkungan, requestId: id,
    backendAktif: aktif, backendDiminta: BACKENDS.has(process.env.DATA_BACKEND) ? process.env.DATA_BACKEND : 'sheets',
    sumber, tujuanPenyimpanan: tujuan, sourceError: aman(sourceError),
    alasan: aktif === 'sheets' ? 'MYSQL_BACKEND_NOT_ACTIVE' : aktif === 'sheets-fallback' ? 'MYSQL_UNAVAILABLE_WRITES_PAUSED' : 'MYSQL_PRIMARY',
    penjelasan: sumber === 'unknown' ? 'Sumber data belum dapat dibaca. Periksa kode galat koneksi dan log di bawah. Backend yang dipilih server tetap ditampilkan.'
      : sumber !== 'real' ? 'Mode data contoh: perubahan task tersimpan di browser, bukan data real server.'
      : aktif === 'sheets' ? 'Perubahan baru disimpan di Google Spreadsheet, tab data_real. Backend ini tidak menjalankan penulisan MySQL. Impor snapshot tidak otomatis mengalihkan backend aplikasi.'
      : aktif === 'sheets-fallback' ? 'Data cadangan spreadsheet sedang ditampilkan. Penyimpanan dijeda sampai MySQL kembali tersedia.'
      : 'Perubahan utama disimpan di MySQL. Cocokkan ID perintah dan nomor jurnal pada log.',
    mysql: { backendAktif: aktif === 'mysql', penulisanAplikasi: aktif === 'mysql' ? sumber === 'unknown' ? null : sumber === 'real' : false,
      konfigurasiLengkap: ['MYSQL_HOST', 'MYSQL_DATABASE', 'MYSQL_USER', 'MYSQL_PASSWORD'].every(key => config[key]),
      konfigurasiAda: config, host: aman(process.env.MYSQL_HOST || ''), database: aman(process.env.MYSQL_DATABASE || ''), port: Number(process.env.MYSQL_PORT) || 3306 },
    instance: { service: aman(process.env.K_SERVICE || 'lokal'), revision: aman(process.env.K_REVISION || '') },
    cakupanLog: 'Maksimal 100 catatan pada instance server ini sejak proses dimulai. Cloud Run dapat memakai beberapa instance; log lengkap dilihat di Cloud Logging.',
    logs: logger.baca(),
  };
}
module.exports = { buatLogger, catat: logger.catat, backend, target, requestId, baca, errorCode: err => aman(String(err?.code || err?.kode || err?.response?.status || err?.status || err?.constructor?.name || 'ERROR')) };
