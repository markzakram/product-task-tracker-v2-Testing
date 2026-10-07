/* Server untuk Cloud Run (lihat Dockerfile + .gitlab-ci.yml).
   Di Vercel berkas ini tak dipakai: Vercel menyajikan public/ dan api/*.js sendiri.
   Di sini kita meniru secukupnya yang dipakai handler: req.query, req.body,
   res.status(), dan cleanUrls dari vercel.json. Tanpa dependensi. */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, 'public');
const API = { rpc: './api/rpc', metrics: './api/metrics', mcp: './api/mcp' };
const MAX_BODY = 5 * 1024 * 1024;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error('Body terlalu besar.'), { code: 413 })); req.destroy(); }
      else chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve(undefined);
      if (/json/i.test(req.headers['content-type'] || '')) {
        try { return resolve(JSON.parse(raw)); } catch (e) { /* biarkan handler yang menolak */ }
      }
      resolve(raw);
    });
    req.on('error', reject);
  });
}

function serveStatic(pathname, res) {
  const rel = decodeURIComponent(pathname);
  const candidates = rel.endsWith('/') ? [rel + 'index.html'] : [rel, rel + '.html'];
  for (const c of candidates) {
    const file = path.resolve(PUBLIC, '.' + c);
    if (!file.startsWith(PUBLIC + path.sep)) break;   // path traversal
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      return fs.createReadStream(file).pipe(res);
    }
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
}

const server = http.createServer(async (req, res) => {
  res.status = (code) => { res.statusCode = code; return res; };
  try {
    const url = new URL(req.url, 'http://localhost');
    const m = url.pathname.match(/^\/api\/([a-z]+)\/?$/);
    if (m && API[m[1]]) {
      req.query = Object.fromEntries(url.searchParams);
      req.body = await readBody(req);
      return await require(API[m[1]])(req, res);
    }
    if (url.pathname.startsWith('/api/')) return res.status(404).end(JSON.stringify({ error: 'Not found' }));
    return serveStatic(url.pathname, res);
  } catch (e) {
    console.error(e);
    if (res.headersSent) return res.end();
    res.writeHead(e.code === 413 ? 413 : 500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ __error: true, message: e.code === 413 ? e.message : 'Server error' }));
  }
});

if (require.main === module) {
  const port = Number(process.env.PORT) || 8080;
  server.listen(port, () => console.log('task-tracker listening on :' + port));
}

module.exports = server;
