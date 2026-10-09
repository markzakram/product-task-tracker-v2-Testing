/* server.js (Cloud Run): berkas statis, cleanUrls, rute API, dan pagarnya. Tanpa
   kredensial: hanya jalur yang tak menyentuh Google. Polanya sama dengan
   test/server.test.js milik v1. */
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

// Gerbang sengaja belum disetel: POST harus dijawab 503 SETELAN, bukan menggantung.
for (const k of ['ACCESS_PIN', 'SESSION_SECRET', 'DEV_PIN', 'APP_ENV', 'VERCEL_ENV']) delete process.env[k];
const server = require('../server');

function minta(port, jalur, { method = 'GET', body, jenis } = {}) {
  return new Promise((resolve, reject) => {
    // Jalur mentah (tanpa normalisasi URL) supaya "/../" benar-benar sampai ke server.
    const req = http.request({ port, host: '127.0.0.1', path: jalur, method, headers: jenis ? { 'content-type': jenis } : {} }, res => {
      let isi = '';
      res.on('data', c => { isi += c; });
      res.on('end', () => resolve({ status: res.statusCode, jenis: res.headers['content-type'] || '', cache: res.headers['cache-control'], isi }));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => req.destroy(new Error('server tak menjawab dalam 5 detik')));
    req.end(body);
  });
}

let port;
test.before(() => new Promise(selesai => server.listen(0, '127.0.0.1', () => { port = server.address().port; selesai(); })));
test.after(() => new Promise(selesai => server.close(selesai)));

test('/ menyajikan index.html, dan tak boleh disimpan basi', async () => {
  const r = await minta(port, '/');
  assert.equal(r.status, 200);
  assert.ok(r.jenis.startsWith('text/html'));
  assert.equal(r.cache, 'no-store');
  assert.match(r.isi, /app\.js\?v=/);
});

test('cleanUrls: /cek → cek.html; berkas JS dan CSS dengan jenisnya', async () => {
  assert.equal((await minta(port, '/cek')).status, 200);
  assert.ok((await minta(port, '/inti.js')).jenis.startsWith('text/javascript'));
  assert.ok((await minta(port, '/app.css')).jenis.startsWith('text/css'));
});

test('GET /api/rpc sehat', async () => {
  const r = await minta(port, '/api/rpc');
  assert.equal(r.status, 200);
  const j = JSON.parse(r.isi);
  assert.equal(j.ok, true);
  assert.equal(j.app, 'producttrack-v2');
});

test('POST tanpa isi dijawab, tidak menggantung', async () => {
  const r = await minta(port, '/api/rpc', { method: 'POST' });
  assert.equal(r.status, 503);
  assert.equal(JSON.parse(r.isi).kode, 'SETELAN');
});

test('POST berisi JSON sampai ke api/rpc.js', async () => {
  const r = await minta(port, '/api/rpc', { method: 'POST', jenis: 'application/json', body: JSON.stringify({ action: 'masuk', args: ['1234'] }) });
  assert.equal(r.status, 503);
  assert.equal(JSON.parse(r.isi).kode, 'SETELAN');
});

test('modul internal api/_*.js dan fungsi yang tak terdaftar tak terbuka', async () => {
  for (const jalur of ['/api/_sesi', '/api/_sheets', '/api/metrics', '/api/../package']) {
    assert.equal((await minta(port, jalur)).status, 404, jalur);
  }
});

test('path traversal ditolak', async () => {
  assert.equal((await minta(port, '/../package.json')).status, 404);
  assert.equal((await minta(port, '/%2e%2e/package.json')).status, 404);
  assert.equal((await minta(port, '/..%2fpackage.json')).status, 404);
});
