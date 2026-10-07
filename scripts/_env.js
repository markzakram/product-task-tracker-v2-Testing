/* .env dimuat sendiri, tanpa pustaka. Env yang sudah ada di shell tidak ditimpa.
   Dipakai scripts/dev.js dan scripts/impor-v1.js. */

const fs = require('fs');

function muatEnv(berkas) {
  let isi;
  try { isi = fs.readFileSync(berkas, 'utf8'); } catch (e) { return false; }
  for (const baris of isi.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(baris);
    if (!m || process.env[m[1]] !== undefined) continue;
    let nilai = m[2].trim();
    if (/^(['"]).*\1$/.test(nilai)) nilai = nilai.slice(1, -1);
    process.env[m[1]] = nilai;
  }
  return true;
}

module.exports = { muatEnv };
