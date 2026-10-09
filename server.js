/* =============================================================================
   server.js — v2 di server Node biasa: Cloud Run lewat GitLab CI (lihat Dockerfile
   dan .gitlab-ci.yml). Di Vercel berkas ini tak dipakai; Vercel menyajikan public/
   dan api/*.js sendiri.

   Polanya disalin dari server.js yang dibuat tim IT untuk v1, dengan beberapa beda:

   1. Rute API dari peta API di bawah. v2 baru punya rpc; berkas berawalan _ di api/
      bukan rute.
   2. Tak perlu meniru res.status(): api/rpc.js v2 ditulis dengan API inti Node
      (statusCode/setHeader/end) justru supaya jalan di sini apa adanya.
   3. Body kosong diteruskan sebagai {}, bukan undefined. Pembaca body di api/rpc.js
      membaca stream sendiri kalau req.body tak ada — dan stream itu sudah habis dibaca
      di sini, jadi POST tanpa isi akan menggantung sampai batas waktu Cloud Run.
   4. Berkas statis memakai Cache-Control: no-store, sama dengan scripts/dev.js.
      index.html memuat CSS & JS dengan ?v=<versi>; yang tak boleh tersimpan basi
      adalah index.html itu sendiri.

   Tanpa dependensi. Tes: test/server.test.js.
   ========================================================================== */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PUBLIK = path.join(__dirname, 'public');
/* Tambahkan di sini kalau v2 kelak punya endpoint lain (mis. metrics/mcp seperti v1). */
const API = { rpc: './api/rpc' };
const BATAS_BODY = 5 * 1024 * 1024;
const JENIS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

function bacaBody(req) {
  return new Promise((resolve, reject) => {
    const potong = [];
    let ukuran = 0;
    req.on('data', c => {
      ukuran += c.length;
      if (ukuran > BATAS_BODY) {
        reject(Object.assign(new Error('Isi permintaan terlalu besar.'), { kode: 413 }));
        req.destroy();
      } else potong.push(c);
    });
    req.on('end', () => {
      const teks = Buffer.concat(potong).toString('utf8');
      if (!teks) return resolve({});
      if (/json/i.test(req.headers['content-type'] || '')) {
        try { return resolve(JSON.parse(teks)); } catch (e) { /* biarkan api/rpc.js yang menolak */ }
      }
      resolve(teks);
    });
    req.on('error', reject);
  });
}

function kirimTeks(res, kode, teks) {
  res.writeHead(kode, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(teks);
}

/* cleanUrls seperti vercel.json: /cek → cek.html. */
function layaniBerkas(pathname, res) {
  let p;
  try { p = decodeURIComponent(pathname); } catch (e) { return kirimTeks(res, 400, 'URL rusak.'); }
  const calon = p.endsWith('/') ? [p + 'index.html'] : [p, p + '.html'];
  for (const c of calon) {
    const berkas = path.resolve(PUBLIK, '.' + c);
    if (!berkas.startsWith(PUBLIK + path.sep)) break;   // path traversal
    let info;
    try { info = fs.statSync(berkas); } catch (e) { continue; }
    if (!info.isFile()) continue;
    res.writeHead(200, {
      'Content-Type': JENIS[path.extname(berkas).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    return fs.createReadStream(berkas).pipe(res);
  }
  return kirimTeks(res, 404, 'Tidak ditemukan.');
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://lokal');
    const m = /^\/api\/([a-z0-9-]+)\/?$/.exec(url.pathname);
    if (m && Object.prototype.hasOwnProperty.call(API, m[1])) {
      req.query = Object.fromEntries(url.searchParams);
      req.body = await bacaBody(req);
      return await require(API[m[1]])(req, res);
    }
    if (url.pathname.startsWith('/api/')) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ success: false, message: 'Tidak ada fungsi itu.' }));
    }
    return layaniBerkas(url.pathname, res);
  } catch (e) {
    if (e.kode !== 413) console.error(e);
    if (res.headersSent) return res.end();
    res.writeHead(e.kode === 413 ? 413 : 500, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ success: false, message: e.kode === 413 ? e.message : 'Galat server.' }));
  }
});

if (require.main === module) {
  const port = Number(process.env.PORT) || 8080;
  server.listen(port, () => console.log('ProductTrack v2 mendengar di :' + port));
}

module.exports = server;
