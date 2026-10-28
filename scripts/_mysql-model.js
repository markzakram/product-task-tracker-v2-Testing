/* Pemetaan kehilangan-nol: kolom relasional untuk pencarian, _payload menyimpan
   objek aplikasi utuh (termasuk urutan, history, dan properti tambahan). */
const fs = require('node:fs');
const path = require('node:path');
const { ROOTS } = require('./_mysql-snapshot');
const { GalatMySQL, kutip } = require('../api/_mysql-core');

function bacaSkema(sql) {
  const tables = new Map();
  for (const m of sql.matchAll(/CREATE TABLE IF NOT EXISTS `([^`]+)`\s*\(([\s\S]*?)\) ENGINE\s*=[\s\S]*?;/g)) {
    const columns = new Map();
    for (let line of m[2].split(/\r?\n/)) {
      line = line.replace(/--.*$/, '').trim().replace(/,$/, '');
      const c = /^`([^`]+)`\s+([A-Z]+)(?:\(([^)]*)\))?/.exec(line);
      if (c) columns.set(c[1], { name: c[1], type: c[2], size: c[3], ddl: line,
        nullable: !/NOT NULL/.test(line), default: /\bDEFAULT\b|AUTO_INCREMENT/.test(line) });
    }
    const pk = /PRIMARY KEY\s*\(([^)]+)\)/.exec(m[2]);
    const primary = [...(pk?.[1] || '').matchAll(/`([^`]+)`/g)].map(x => x[1]);
    const foreign = [...m[2].matchAll(/FOREIGN KEY\s*\(`([^`]+)`\) REFERENCES `([^`]+)` \(`([^`]+)`\)/g)]
      .map(x => ({ column: x[1], table: x[2], target: x[3] }));
    tables.set(m[1], { name: m[1], columns, primary, foreign, create: m[0] });
  }
  return tables;
}
const BASE = fs.readFileSync(path.join(__dirname, '../db/migrations/001_initial.sql'), 'utf8');
const EXTRA = fs.readFileSync(path.join(__dirname, '../db/migrations/002_runtime.sql'), 'utf8');
const SCHEMA = bacaSkema(BASE + '\n' + EXTRA);

function flatten(data) {
  const rows = Object.fromEntries(Object.keys(require('../api/_skema').TAB).map(k => [k, []]));
  rows.project_history = [];
  for (const [collection, table] of Object.entries(ROOTS)) {
    (data[collection] || []).forEach((item, n) => rows[table].push({ ...item, urutan: n, _position: n, _payload: item }));
  }
  const add = (table, items, parent, value) => (items || []).forEach((item, n) => rows[table].push({ ...item, [parent]: value, urutan: n }));
  for (const p of data.projects || []) {
    for (const h of p.history || []) rows.project_history.push({ ...h, project: p.id });
  }
  for (const t of data.tasks || []) for (const field of ['subtasks', 'comments', 'tinjauan', 'evidence']) add(field, t[field], 'task', t.id);
  for (const p of data.packages || []) { add('package_items', p.items, 'paket', p.id); add('package_links', p.links, 'paket', p.id); }
  for (const x of data.inisiatif || []) add('inisiatif_links', x.links, 'inisiatif', x.id);
  for (const x of data.permintaanDae || []) { add('permintaan_dae_links', x.bahan, 'permintaan', x.id); add('permintaan_dae_utas', x.utas, 'permintaan', x.id); }
  return rows;
}

function sqlValue(column, value) {
  if (value === undefined) {
    if (column.default) return undefined;
    if (column.nullable) return null;
    throw new GalatMySQL('Field wajib tidak ada: ' + column.name);
  }
  if (column.nullable && (value === null || value === '' || (column.type === 'DATETIME' && value === 0))) return null;
  if (column.type === 'JSON') return JSON.stringify(value);
  if (column.type === 'DATETIME') {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) throw new GalatMySQL('Waktu tidak sah pada kolom ' + column.name);
    return date.toISOString().slice(0, 23).replace('T', ' ');
  }
  if (column.type === 'DATE') {
    const date = new Date(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value)) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new GalatMySQL('Tanggal tidak sah pada kolom ' + column.name);
    return value;
  }
  if (['BOOLEAN', 'TINYINT'].includes(column.type)) return Number(!!value);
  if (['INT', 'BIGINT', 'DOUBLE', 'DECIMAL'].includes(column.type)) {
    if (!Number.isFinite(Number(value))) throw new GalatMySQL('Angka tidak sah pada kolom ' + column.name);
    return Number(value);
  }
  const text = Array.isArray(value) ? value.join(', ') : String(value ?? '');
  if (['VARCHAR', 'CHAR'].includes(column.type) && [...text].length > Number(column.size)) throw new GalatMySQL('Isi melebihi ukuran kolom ' + column.name + '; perlu migration pelebaran, data tidak dipotong.');
  if (column.type === 'TEXT' && Buffer.byteLength(text) > 65535) throw new GalatMySQL('Isi melebihi ukuran TEXT pada ' + column.name);
  return text;
}

function siapkanBaris(name, objects) {
  const table = SCHEMA.get(name);
  if (!table) throw new GalatMySQL('Tabel migrasi tidak dikenali: ' + name);
  const cols = [...table.columns.values()];
  if (objects.some(o => o._payload)) cols.push({ name: '_payload', type: 'JSON', nullable: false }, { name: '_position', type: 'INT', nullable: false });
  const output = objects.map(o => Object.fromEntries(cols.map(c => [c.name, sqlValue(c, o[c.name])]).filter(([, v]) => v !== undefined)));
  const keys = new Set();
  for (const row of output) {
    if (table.primary.some(k => row[k] === undefined)) continue;
    const key = JSON.stringify(table.primary.map(k => typeof row[k] === 'string' ? row[k].normalize('NFD').replace(/\p{M}/gu, '').toLowerCase() : row[k]));
    if (keys.has(key)) throw new GalatMySQL('ID ganda pada tabel ' + name + '. Impor dibatalkan.');
    keys.add(key);
  }
  return output;
}

function validasiRelasi(rows) {
  for (const [name, table] of SCHEMA) for (const fk of table.foreign) {
    const targets = new Set((rows[fk.table] || []).map(r => r[fk.target]));
    for (const row of rows[name] || []) if (row[fk.column] && !targets.has(row[fk.column])) {
      throw new GalatMySQL('Relasi yatim: ' + name + '.' + fk.column + '. Periksa data sumber sebelum impor.');
    }
  }
}

async function insertRows(c, table, rows) {
  kutip(table);
  for (let start = 0; start < rows.length;) {
    const batch = [], shape = Object.keys(rows[start]);
    let bytes = 0;
    while (start < rows.length && batch.length < 50 && (bytes < 512000 || !batch.length)
      && JSON.stringify(Object.keys(rows[start])) === JSON.stringify(shape)) {
      const row = rows[start++]; bytes += Buffer.byteLength(JSON.stringify(row));
      batch.push(shape.map(k => row[k]));
    }
    await c.query('INSERT INTO ' + kutip(table) + ' (' + shape.map(kutip).join(',') + ') VALUES ?', [batch]);
  }
}

module.exports = { BASE, EXTRA, SCHEMA, bacaSkema, flatten, sqlValue, siapkanBaris, validasiRelasi, insertRows };
