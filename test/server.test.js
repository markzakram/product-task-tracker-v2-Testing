/**
 * Tes untuk server.js — server Cloud Run. Tanpa credential: hanya jalur yang
 * tak menyentuh Google/MySQL.
 * Jalankan: node test/server.test.js
 */
const assert = require('assert');
const http = require('http');
const server = require('../server');

function get(port, p) {
  return new Promise((resolve, reject) => {
    // path mentah (tanpa normalisasi URL) supaya "/../" benar-benar sampai ke server
    http.get({ port, path: p }, (res) => {
      let body = ''; res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'] || '', body }));
    }).on('error', reject);
  });
}

server.listen(0, async () => {
  const port = server.address().port;
  try {
    const home = await get(port, '/');
    assert.strictEqual(home.status, 200); assert.ok(home.type.startsWith('text/html'));
    console.log('  ✓ / menyajikan index.html');

    const clean = await get(port, '/index');
    assert.strictEqual(clean.status, 200);
    console.log('  ✓ cleanUrls: /index → index.html');

    const rpc = await get(port, '/api/rpc');
    assert.strictEqual(rpc.status, 200); assert.strictEqual(JSON.parse(rpc.body).ok, true);
    console.log('  ✓ GET /api/rpc sehat');

    assert.strictEqual((await get(port, '/api/_db')).status, 404);
    console.log('  ✓ modul internal api/_*.js tak terbuka');

    assert.strictEqual((await get(port, '/../package.json')).status, 404);
    assert.strictEqual((await get(port, '/%2e%2e/package.json')).status, 404);
    console.log('  ✓ path traversal ditolak');

    console.log('\nserver: semua lulus');
  } finally {
    server.close();
  }
});
