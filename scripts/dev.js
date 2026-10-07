/* =============================================================================
   scripts/dev.js — server lokal yang meniru Vercel, tanpa Vercel CLI dan login.

     npm run dev   →  http://127.0.0.1:3000       prototipe
                      http://127.0.0.1:3000/cek   cek sambungan

   Yang ditiru hanya yang dipakai v2: public/ sebagai akar web, cleanUrls
   (/cek → cek.html), api/<nama>.js sebagai fungsi, berkas berawalan _ di api/
   bukan rute, dan req.body yang sudah terurai dari JSON.

   Suntingan di api/ langsung berlaku tanpa restart: modulnya dimuat ulang tiap
   permintaan. Akibatnya klien Google dibuat ulang tiap permintaan juga — sedikit
   lebih lambat, dan hanya terjadi di lokal.
   ========================================================================== */

const http = require('http');
const fs = require('fs');
const path = require('path');

const AKAR = path.join(__dirname, '..');
const PUBLIK = path.join(AKAR, 'public');
const API = path.join(AKAR, 'api');

const JENIS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

/* .env dimuat sendiri. Env yang sudah ada di shell tidak ditimpa. */
function muatEnv(berkas) {
  let isi;
  try { isi = fs.readFileSync(berkas, 'utf8'); } catch (e) {
    console.warn('  .env tidak ada — salin dari .env.example lalu isi.');
    return;
  }
  for (const baris of isi.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(baris);
    if (!m || process.env[m[1]] !== undefined) continue;
    let nilai = m[2].trim();
    if (/^(['"]).*\1$/.test(nilai)) nilai = nilai.slice(1, -1);
    process.env[m[1]] = nilai;
  }
}

function kirimTeks(res, kode, teks) {
  res.statusCode = kode;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(teks);
}

function bacaBody(req) {
  return new Promise(resolve => {
    const potong = [];
    req.on('data', c => potong.push(c));
    req.on('end', () => {
      const teks = Buffer.concat(potong).toString('utf8');
      if (!teks) return resolve(undefined);
      if (/application\/json/i.test(req.headers['content-type'] || '')) {
        try { return resolve(JSON.parse(teks)); } catch (e) { /* biarkan fungsi yang menilai */ }
      }
      resolve(teks);
    });
    req.on('error', () => resolve(undefined));
  });
}

async function layaniApi(req, res, url) {
  const nama = url.pathname.slice('/api/'.length).replace(/\/$/, '');
  const berkas = path.join(API, nama + '.js');
  if (!/^[a-z0-9-]+$/i.test(nama) || !fs.existsSync(berkas)) {
    return kirimTeks(res, 404, `Tidak ada fungsi /api/${nama}`);
  }
  for (const k of Object.keys(require.cache)) {
    if (k.startsWith(API + path.sep)) delete require.cache[k];
  }
  req.query = Object.fromEntries(url.searchParams);
  req.body = await bacaBody(req);
  try {
    await require(berkas)(req, res);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) kirimTeks(res, 500, 'Fungsi gagal: ' + e.message);
  }
}

function layaniBerkas(res, url) {
  let p;
  try { p = decodeURIComponent(url.pathname); } catch (e) { return kirimTeks(res, 400, 'URL rusak.'); }
  if (p.endsWith('/')) p += 'index.html';
  let berkas = path.normalize(path.join(PUBLIK, p));
  if (!berkas.startsWith(PUBLIK + path.sep)) return kirimTeks(res, 403, 'Terlarang.');
  if (!path.extname(berkas) && fs.existsSync(berkas + '.html')) berkas += '.html';
  fs.readFile(berkas, (err, isi) => {
    if (err) return kirimTeks(res, 404, `Tidak ditemukan: ${p}`);
    res.setHeader('Content-Type', JENIS[path.extname(berkas).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(isi);
  });
}

muatEnv(path.join(AKAR, '.env'));
const PORT = Number(process.env.PORT) || 3000;
/* Bawaan hanya komputer ini. HOST=0.0.0.0 di .env membukanya untuk jaringan kantor. */
const HOST = process.env.HOST || '127.0.0.1';

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://lokal');
  if (url.pathname.startsWith('/api/')) return layaniApi(req, res, url);
  return layaniBerkas(res, url);
});

server.on('error', e => {
  if (e.code === 'EADDRINUSE') console.error(`\n  Port ${PORT} sudah dipakai. Isi PORT=3001 (atau lainnya) di .env.\n`);
  else console.error(e);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  const alamat = `http://${HOST === '0.0.0.0' ? '127.0.0.1' : HOST}:${PORT}`;
  console.log(`\n  ProductTrack v2 (lokal)\n  prototipe : ${alamat}\n  cek       : ${alamat}/cek\n`);
  if (HOST === '0.0.0.0') console.log('  HOST=0.0.0.0 — bisa dibuka dari komputer lain di jaringan yang sama.\n');
});
