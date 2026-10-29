const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../api/_diagnostik');
const sheet = require('../api/_sheets');
const rpc = require('../api/rpc');
const real = require('../api/_real');

test('log hanya memuat metadata; kegagalan sink tidak menggagalkan operasi dan riwayat dibatasi', () => {
  const output = [];
  const log = D.buatLogger({ sink: row => output.push(row), clock: () => 1793235600000, env: { K_SERVICE: 'test-service', MYSQL_PASSWORD: 'secret-password' } });
  log.catat('DATA_WRITE_FAILED', { requestId: 'trace-1', backend: 'sheets', errorCode: 'ETIMEDOUT', password: 'secret-password', isi: { title: 'judul rahasia' }, cookie: 'cookie-rahasia', query: 'SQL-RAHASIA', message: 'raw-secret' });
  const text = JSON.stringify(log.baca());
  for (const secret of ['secret-password', 'judul rahasia', 'cookie-rahasia', 'SQL-RAHASIA', 'raw-secret']) assert.ok(!text.includes(secret));
  assert.equal(output[0].severity, 'ERROR'); assert.equal(output[0].errorCode, 'ETIMEDOUT');
  for (let n = 0; n < 120; n++) log.catat('DATA_WRITE_SUCCEEDED', { seq: n });
  assert.equal(log.baca().length, 100); assert.equal(log.baca()[0].seq, 20);
  assert.doesNotThrow(() => D.buatLogger({ sink() { throw new Error('stdout putus'); } }).catat('DATA_WRITE_SUCCEEDED'));
});

function request(body, cookie) {
  return new Promise((resolve, reject) => {
    const headers = {}, response = { statusCode: 200, setHeader(k, v) { headers[k.toLowerCase()] = v; }, end(value) { resolve({ http: this.statusCode, headers, data: JSON.parse(value) }); } };
    Promise.resolve(rpc({ method: 'POST', headers: { cookie: cookie || '' }, body }, response)).catch(reject);
  });
}
test('diagnostik membutuhkan sesi; konfigurasi MySQL tidak disalahartikan sebagai backend aktif', async () => {
  const keys = ['ACCESS_PIN', 'SESSION_SECRET', 'SPREADSHEET_ID', 'DATA_BACKEND', 'MYSQL_HOST', 'MYSQL_DATABASE', 'MYSQL_USER', 'MYSQL_PASSWORD'];
  const before = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const old = { klien: sheet.klien, sumberData: sheet.sumberData };
  try {
    Object.assign(process.env, { ACCESS_PIN: '246810', SESSION_SECRET: 's'.repeat(48), SPREADSHEET_ID: '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789', DATA_BACKEND: 'mysql', MYSQL_HOST: '34.128.116.164', MYSQL_DATABASE: 'produk_base', MYSQL_USER: 'private-user', MYSQL_PASSWORD: 'password-jangan-bocor' });
    sheet.klien = async () => ({}); sheet.sumberData = async () => 'real';
    const blocked = await request({ action: 'diagnostikPenyimpanan' }); assert.equal(blocked.http, 401);
    const login = await request({ action: 'masuk', args: ['246810'] });
    const cookie = login.headers['set-cookie'].split(';')[0];
    const read = await request({ action: 'diagnostikPenyimpanan' }, cookie);
    assert.equal(read.http, 200); assert.equal(read.data.diagnostik.backendAktif, 'sheets');
    assert.equal(read.data.diagnostik.backendDiminta, 'mysql');
    assert.equal(read.data.diagnostik.mysql.konfigurasiLengkap, true);
    assert.equal(read.data.diagnostik.mysql.penulisanAplikasi, false);
    assert.equal(read.data.diagnostik.alasan, 'MYSQL_BACKEND_NOT_ACTIVE');
    assert.equal(read.data.diagnostik.tujuanPenyimpanan, 'sheets:data_real');
    assert.equal(read.headers['x-request-id'], read.data.diagnostik.requestId);
    const text = JSON.stringify(read.data);
    for (const secret of ['password-jangan-bocor', 'private-user', '246810', 's'.repeat(48)]) assert.ok(!text.includes(secret));
    sheet.sumberData = async () => { throw Object.assign(new Error('RAW-SECRET-GOOGLE'), { code: 'ECONNRESET' }); };
    const unavailable = await request({ action: 'diagnostikPenyimpanan' }, cookie);
    assert.equal(unavailable.http, 200); assert.equal(unavailable.data.diagnostik.sumber, 'unknown');
    assert.equal(unavailable.data.diagnostik.sourceError, 'ECONNRESET');
    assert.ok(!JSON.stringify(unavailable.data).includes('RAW-SECRET-GOOGLE'));
  } finally {
    Object.assign(sheet, old);
    for (const key of keys) if (before[key] === undefined) delete process.env[key]; else process.env[key] = before[key];
  }
});

test('penyimpanan yang berhasil, kiriman ulang dan kegagalan mempunyai jejak dengan ID permintaan yang sama', async () => {
  const old = { bacaReal: sheet.bacaReal, tulisReal: sheet.tulisReal };
  const events = [], client = {};
  const state = () => ({ peristiwa: [...events], generasi: 'diag-test', rusak: 0 });
  try {
    sheet.bacaReal = async () => state();
    sheet.tulisReal = async (k, id, p) => { events.push(p); return state(); };
    const p = { id: 'uji-diag-1', aksi: 'taskBaru', isi: { f: { title: 'JUDUL-TIDAK-BOLEH-ADA-DI-LOG', lane: 'rutin', pic: 'ali' } }, at: Date.now(), hari: '2026-10-29' };
    const saved = await real.simpan(client, 'sheet-secret-id', p, 'ali', { requestId: 'request-success' });
    assert.equal(saved.seq, 1);
    await real.simpan(client, 'sheet-secret-id', p, 'ali', { requestId: 'request-retry' });
    assert.equal(events.length, 1);
    sheet.tulisReal = async () => { throw Object.assign(new Error('QUERY-PASSWORD-RAHASIA'), { code: 'ETIMEDOUT' }); };
    await assert.rejects(real.simpan(client, 'sheet-secret-id', { ...p, id: 'uji-diag-2' }, 'ali', { requestId: 'request-failed' }), /QUERY-PASSWORD/);
    const logs = D.baca({ k: client, sumber: 'real', id: 'status-test', lingkungan: 'uji' }).logs;
    assert.ok(logs.some(log => log.event === 'DATA_WRITE_SUCCEEDED' && log.requestId === 'request-success' && log.seq === 1));
    assert.ok(logs.some(log => log.event === 'DATA_WRITE_DEDUPLICATED' && log.requestId === 'request-retry'));
    assert.ok(logs.some(log => log.event === 'DATA_WRITE_FAILED' && log.requestId === 'request-failed' && log.errorCode === 'ETIMEDOUT'));
    assert.ok(!JSON.stringify(logs).includes('JUDUL-TIDAK-BOLEH-ADA-DI-LOG'));
    assert.ok(!JSON.stringify(logs).includes('sheet-secret-id'));
    assert.ok(!JSON.stringify(logs).includes('QUERY-PASSWORD-RAHASIA'));
  } finally { Object.assign(sheet, old); }
});

test('mode contoh dan fallback tidak mengaku melakukan penulisan MySQL', () => {
  const example = D.baca({ k: {}, sumber: 'contoh', id: 'example', lingkungan: 'uji' });
  assert.equal(example.tujuanPenyimpanan, 'browser:data_contoh'); assert.equal(example.mysql.penulisanAplikasi, false);
  const fallback = D.baca({ k: { backend: 'sheets-fallback' }, sumber: 'real', id: 'fallback', lingkungan: 'uji' });
  assert.equal(fallback.alasan, 'MYSQL_UNAVAILABLE_WRITES_PAUSED'); assert.equal(fallback.mysql.penulisanAplikasi, false);
});
