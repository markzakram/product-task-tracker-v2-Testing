const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sheet = require('../api/_sheets');

const ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcd';
const EMAIL = 'producttrack-v2@contoh.iam.gserviceaccount.com';

const { sheetPalsu, kosong, sheetV1 } = require('./bantu/sheet-palsu');

/* ---------- Kepemilikan ---------- */

test('spreadsheet baru (satu tab kosong) terbaca kosong', async () => {
  const { k } = kosong();
  const p = await sheet.periksa(k, ID);
  assert.equal(p.kepemilikan, 'kosong');
  assert.deepEqual(p.tab, ['Sheet1']);
  assert.equal(p.url, `https://docs.google.com/spreadsheets/d/${ID}/edit`);
  assert.equal(p.idTab, undefined, 'idTab hanya untuk dalam modul');
});

test('siapkan memasang penanda dalam SATU batchUpdate, lalu terbaca v2', async () => {
  const { k, tabs, tulisan } = kosong();
  const h = await sheet.siapkan(k, ID);
  assert.equal(h.kepemilikan, 'v2');
  assert.equal(h.berubah, true);
  assert.equal(tulisan.length, 1, 'harus atomik: tab dan isinya dalam satu permintaan');
  const [tambah, isi] = tulisan[0].requests;
  assert.equal(tambah.addSheet.properties.title, '_meta');
  assert.equal(isi.updateCells.start.sheetId, tambah.addSheet.properties.sheetId);
  const meta = tabs.find(t => t.title === '_meta');
  assert.deepEqual(meta.values[0], ['app', 'producttrack-v2']);
  assert.equal(meta.values[1][0], 'disiapkan');
  assert.ok(!Number.isNaN(Date.parse(meta.values[1][1])));
});

test('siapkan kedua kalinya tidak menulis apa pun', async () => {
  const { k, tulisan } = kosong();
  await sheet.siapkan(k, ID);
  const h = await sheet.siapkan(k, ID);
  assert.equal(h.berubah, false);
  assert.equal(h.kepemilikan, 'v2');
  assert.equal(tulisan.length, 1);
});

test('sheet v1 ditolak — dan tak satu pun tulisan terjadi', async () => {
  const { k, tulisan } = sheetV1();
  const p = await sheet.periksa(k, ID);
  assert.equal(p.kepemilikan, 'asing');
  assert.match(p.alasan, /4 tab \(Main, OPTIONS, COMMENTS, ACTIVITY\)/);
  await assert.rejects(sheet.siapkan(k, ID), err => {
    assert.ok(err instanceof sheet.GalatDitolak);
    assert.match(err.message, /"Task Management" bukan milik v2/);
    assert.match(err.message, /SPREADSHEET_ID/);
    return true;
  });
  assert.equal(tulisan.length, 0);
});

test('satu tab yang sudah berisi data ditolak', async () => {
  const { k, tulisan } = sheetPalsu([{ title: 'Data', sheetId: 0, values: [['halo']] }]);
  assert.equal((await sheet.periksa(k, ID)).kepemilikan, 'asing');
  await assert.rejects(sheet.siapkan(k, ID), sheet.GalatDitolak);
  assert.equal(tulisan.length, 0);
});

test('tab _meta milik aplikasi lain ditolak', async () => {
  const { k, tulisan } = sheetPalsu([{ title: '_meta', sheetId: 5, values: [['app', 'aplikasi-lain']] }]);
  const p = await sheet.periksa(k, ID);
  assert.equal(p.kepemilikan, 'asing');
  assert.match(p.alasan, /bukan penanda v2/);
  await assert.rejects(sheet.siapkan(k, ID), sheet.GalatDitolak);
  assert.equal(tulisan.length, 0);
});

test('dua siapkan berbarengan: yang kalah tetap berakhir v2, tanpa galat', async () => {
  const { k, tabs } = kosong();
  // Penulis lain menang lebih dulu, tepat sebelum batchUpdate kita sampai.
  k.api.spreadsheets.batchUpdate = async () => {
    tabs.push({ title: '_meta', sheetId: 99, values: [['app', 'producttrack-v2'], ['disiapkan', '2026-10-07T02:00:00.000Z']] });
    throw Object.assign(new Error('Invalid requests[0].addSheet: A sheet with the name "_meta" already exists. Please enter another name.'), { status: 400 });
  };
  const h = await sheet.siapkan(k, ID);
  assert.equal(h.kepemilikan, 'v2');
  assert.equal(h.berubah, false);
});

test('nama tab berpetik tunggal dikutip dengan benar', async () => {
  const { k } = sheetPalsu([{ title: "Rekap 'Q4'", sheetId: 0, values: [] }]);
  assert.equal((await sheet.periksa(k, ID)).kepemilikan, 'kosong');
});

/* ---------- Setelan ---------- */

test('SPREADSHEET_ID menerima ID maupun seluruh URL', () => {
  process.env.SPREADSHEET_ID = ID;
  assert.equal(sheet.idSpreadsheet(), ID);
  process.env.SPREADSHEET_ID = `https://docs.google.com/spreadsheets/d/${ID}/edit#gid=0`;
  assert.equal(sheet.idSpreadsheet(), ID);
});

test('SPREADSHEET_ID kosong atau ngawur menjadi GalatSetelan yang menjelaskan', () => {
  process.env.SPREADSHEET_ID = '';
  assert.throws(() => sheet.idSpreadsheet(), err => err instanceof sheet.GalatSetelan && /belum diisi/.test(err.message));
  process.env.SPREADSHEET_ID = 'Task Management v2';
  assert.throws(() => sheet.idSpreadsheet(), /tidak berbentuk ID spreadsheet/);
});

function denganKredensial(json, berkas, fn) {
  const lama = [process.env.GOOGLE_SERVICE_ACCOUNT_JSON, process.env.GOOGLE_APPLICATION_CREDENTIALS];
  if (json === undefined) delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON; else process.env.GOOGLE_SERVICE_ACCOUNT_JSON = json;
  if (berkas === undefined) delete process.env.GOOGLE_APPLICATION_CREDENTIALS; else process.env.GOOGLE_APPLICATION_CREDENTIALS = berkas;
  try { return fn(); } finally {
    if (lama[0] === undefined) delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON; else process.env.GOOGLE_SERVICE_ACCOUNT_JSON = lama[0];
    if (lama[1] === undefined) delete process.env.GOOGLE_APPLICATION_CREDENTIALS; else process.env.GOOGLE_APPLICATION_CREDENTIALS = lama[1];
  }
}
const kunciPalsu = (extra = {}) => JSON.stringify({ type: 'service_account', client_email: EMAIL, private_key: 'baris-satu\\nbaris-dua', ...extra });

test('kredensial: "\\n" harfiah di private_key jadi baris baru', () => {
  denganKredensial(kunciPalsu(), undefined, () => {
    const k = sheet.kredensial();
    assert.equal(k.client_email, EMAIL);
    assert.equal(k.private_key, 'baris-satu\nbaris-dua');
  });
});

test('kredensial: JSON rusak dan kunci tak lengkap menyebut sumbernya', () => {
  denganKredensial('{"type": "service_account",', undefined, () => {
    assert.throws(() => sheet.kredensial(), /GOOGLE_SERVICE_ACCOUNT_JSON bukan JSON yang valid/);
  });
  denganKredensial(JSON.stringify({ client_email: EMAIL }), undefined, () => {
    assert.throws(() => sheet.kredensial(), /tidak memuat client_email dan private_key/);
  });
});

test('kredensial: dari berkas, dan JSON menang kalau keduanya terisi', () => {
  const berkas = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'v2-')), 'kunci.json');
  fs.writeFileSync(berkas, kunciPalsu({ client_email: 'dari-berkas@contoh.iam.gserviceaccount.com' }));
  denganKredensial(undefined, berkas, () => {
    assert.equal(sheet.kredensial().client_email, 'dari-berkas@contoh.iam.gserviceaccount.com');
  });
  denganKredensial(kunciPalsu(), berkas, () => {
    assert.equal(sheet.kredensial().client_email, EMAIL);
  });
  denganKredensial(undefined, berkas + '.tidak-ada', () => {
    assert.throws(() => sheet.kredensial(), /Berkas kunci tak terbaca/);
  });
});

test('kredensial: tanpa keduanya, pesannya menyebut keduanya — dan tak ada nama berkas bawaan', () => {
  denganKredensial(undefined, undefined, () => {
    assert.throws(() => sheet.kredensial(), err => {
      assert.match(err.message, /GOOGLE_SERVICE_ACCOUNT_JSON/);
      assert.match(err.message, /GOOGLE_APPLICATION_CREDENTIALS/);
      return true;
    });
    assert.equal(sheet.emailAkun(), '');
  });
});

/* ---------- Pesan galat ---------- */

const galatGoogle = (status, message, sebab = {}) => Object.assign(new Error(message), { status, code: status, cause: sebab, config: {} });

test('403 biasa: belum di-share, menyebut email akun v2', () => {
  const e = galatGoogle(403, 'The caller does not have permission', { status: 'PERMISSION_DENIED' });
  const m = sheet.jelaskanGalat(e, EMAIL);
  assert.match(m, /belum di-share/);
  assert.ok(m.includes(EMAIL));
  assert.match(m, /Editor/);
});

test('403 API mati: dikenali lebih dulu dari "belum di-share", lengkap dengan tautannya', () => {
  const url = 'https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=123456';
  const e = galatGoogle(403, `Google Sheets API has not been used in project 123456 before or it is disabled. Enable it by visiting ${url} then retry.`,
    { status: 'PERMISSION_DENIED', details: [{ reason: 'SERVICE_DISABLED' }] });
  const m = sheet.jelaskanGalat(e, EMAIL);
  assert.match(m, /belum aktif/);
  assert.ok(m.includes(url));
  assert.doesNotMatch(m, /belum di-share/);
});

test('404, kunci rusak, dan kuota masing-masing punya pesannya', () => {
  assert.match(sheet.jelaskanGalat(galatGoogle(404, 'Requested entity was not found.'), EMAIL), /tidak ditemukan/);
  assert.match(sheet.jelaskanGalat(galatGoogle(400, 'invalid_grant: Invalid JWT Signature.'), EMAIL), /Kunci service account ditolak/);
  assert.match(sheet.jelaskanGalat(new Error('error:1E08010C:DECODER routines::unsupported'), EMAIL), /Kunci service account ditolak/);
  assert.match(sheet.jelaskanGalat(galatGoogle(429, "Quota exceeded for quota metric 'Read requests'"), EMAIL), /Kuota/);
});

test('GalatSetelan dan GalatDitolak diteruskan apa adanya', () => {
  assert.equal(sheet.jelaskanGalat(new sheet.GalatSetelan('isi X'), EMAIL), 'isi X');
  assert.equal(sheet.jelaskanGalat(new sheet.GalatDitolak('bukan milik v2'), EMAIL), 'bukan milik v2');
});

/* ---------- Percobaan ulang ---------- */

function gagalDulu(kali, galat) {
  let n = 0;
  const fn = async () => { n++; if (n <= kali) throw galat; return 'ok'; };
  fn.jumlah = () => n;
  return fn;
}
const JEDA_NOL = { jeda: [0, 0] };

test('baca: diulang saat kena kuota sampai berhasil', async () => {
  const fn = gagalDulu(2, galatGoogle(429, 'Quota exceeded'));
  assert.equal(await sheet.panggil(fn, JEDA_NOL), 'ok');
  assert.equal(fn.jumlah(), 3);
});

test('baca: diulang saat koneksi putus', async () => {
  const fn = gagalDulu(1, Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }));
  assert.equal(await sheet.panggil(fn, JEDA_NOL), 'ok');
  assert.equal(fn.jumlah(), 2);
});

test('tulis: TIDAK diulang saat koneksi putus — bisa jadi sudah terlanjur jalan', async () => {
  const fn = gagalDulu(1, Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }));
  await assert.rejects(sheet.panggil(fn, { tulis: true, ...JEDA_NOL }), /socket hang up/);
  assert.equal(fn.jumlah(), 1);
});

test('tulis: diulang saat kena kuota — ditolak sebelum dijalankan', async () => {
  const fn = gagalDulu(1, galatGoogle(429, 'Quota exceeded'));
  assert.equal(await sheet.panggil(fn, { tulis: true, ...JEDA_NOL }), 'ok');
  assert.equal(fn.jumlah(), 2);
});

test('menyerah setelah jatah ulang habis, dan galat lain tak diulang sama sekali', async () => {
  const kuota = gagalDulu(10, galatGoogle(429, 'Quota exceeded'));
  await assert.rejects(sheet.panggil(kuota, JEDA_NOL), /Quota exceeded/);
  assert.equal(kuota.jumlah(), 3);
  const izin = gagalDulu(10, galatGoogle(403, 'The caller does not have permission'));
  await assert.rejects(sheet.panggil(izin, JEDA_NOL));
  assert.equal(izin.jumlah(), 1);
});

/* ---------- Data contoh ---------- */

const { urai } = require('../api/_skema');

const contoh = () => ({
  projects: [{ id: 'PRJ-3', name: 'Proyek Uji', platform: 'PCPM', stage: 'V', cycle: 1, decision: 'Build', goal: '', history: [] }],
  tasks: [
    {
      id: 'PRD-001', project: '', title: 'Task lepas', platform: 'ASN', stage: 'A', sub: 'Market analysis', detail: '', pic: 'andika',
      support: ['uma'], priority: 'High', start: '2026-07-01', due: '2026-07-05', status: 'Done', output: '1 laporan', gate: 'Lolos',
      deps: [], issue: '', notes: '', assignedBy: 'nynda', cycle: 1, decision: '', createdAt: Date.parse('2026-07-01T01:00:00Z'),
      updatedAt: Date.parse('2026-07-05T01:00:00Z'),
      subtasks: [{ id: 's1', title: 'Kumpulkan data', pic: 'uma', due: '', status: 'Done' }],
      comments: [{ id: 'k1', author: 'nynda', text: 'Mantap, lanjut', at: Date.parse('2026-07-04T02:00:00Z') }],
      gateLog: [{ id: 'g1', by: 'nynda', action: 'Lolos', note: 'Ditandai Done di v1', at: Date.parse('2026-07-05T01:00:00Z') }],
      evidence: [{ id: 'e1', label: 'Google Docs', url: 'https://docs.google.com/document/d/x' }],
    },
    {
      id: 'PRD-646', project: 'PRJ-3', title: 'Langkah 2', platform: 'PCPM', stage: 'V', sub: '3.2 Learning Content Implementation', detail: '',
      pic: 'kiki', support: [], priority: 'Medium', start: '2026-07-20', due: '', status: 'Input', output: '', gate: 'Belum',
      deps: ['PRD-001'], issue: '', notes: '', assignedBy: 'nynda', cycle: 1, decision: '', createdAt: Date.parse('2026-07-20T04:00:00Z'),
      updatedAt: Date.parse('2026-07-20T04:00:00Z'), subtasks: [], comments: [], gateLog: [], evidence: [],
    },
  ],
  backlog: [],
  packages: [{ id: 'PKG-002', platform: 'BUMN', name: 'PT.KAI_BUMN', type: 'Premium', status: 'Aktif', components: ['Tryout', 'Latsol'], note: '' }],
  bookmarks: [{ id: 'f-1', name: 'Dashboard tim (v1)', emoji: '📈', links: [{ id: 'b2', title: 'Proyek Freelance', url: 'https://contoh.id/a' }] }],
  log: [{ id: 'l1', type: 'create', task: 'PRD-001 · Task lepas', detail: 'Dibuat', by: 'andika', at: Date.parse('2026-07-01T01:00:00Z') }],
});

test('tulisContoh lalu bacaContoh mengembalikan data yang sama persis', async () => {
  const { k } = kosong();
  const asli = contoh();
  const tulis = await sheet.tulisContoh(k, ID, urai(asli), { sumber: 'Tarikan v1 uji' });
  assert.equal(tulis.jumlah.tasks, 2);
  assert.equal(tulis.jumlah.subtasks, 1);
  const baca = await sheet.bacaContoh(k, ID);
  assert.equal(baca.versi, tulis.versi);
  assert.equal(baca.sumber, 'Tarikan v1 uji');
  assert.deepEqual(baca.data.tasks, asli.tasks);
  assert.deepEqual(baca.data.projects, asli.projects);
  assert.deepEqual(baca.data.packages, asli.packages);
  assert.deepEqual(baca.data.bookmarks, asli.bookmarks);
  assert.deepEqual(baca.data.log, asli.log);
  assert.deepEqual(baca.seq, { task: 646, prj: 3, bl: 0 });
});

test('spreadsheet kosong disiapkan dulu: penanda v2 ikut terpasang', async () => {
  const { k, tab } = kosong();
  await sheet.tulisContoh(k, ID, urai(contoh()));
  assert.deepEqual(tab('_meta').values[0], ['app', 'producttrack-v2']);
  assert.equal((await sheet.periksa(k, ID)).kepemilikan, 'v2');
});

test('sheet v1 ditolak sebelum satu pun tab dibuat', async () => {
  const { k, tulisan } = sheetV1();
  await assert.rejects(sheet.tulisContoh(k, ID, urai(contoh())), err => err instanceof sheet.GalatDitolak && /bukan milik v2/.test(err.message));
  assert.equal(tulisan.length, 0);
});

test('impor ulang mengganti isi lama, bukan menumpuk', async () => {
  const { k, tab } = kosong();
  await sheet.tulisContoh(k, ID, urai(contoh()));
  const kedua = contoh();
  kedua.tasks = kedua.tasks.slice(0, 1);
  await sheet.tulisContoh(k, ID, urai(kedua));
  assert.equal(tab('tasks').values.length, 2, 'judul + 1 task');
  assert.equal((await sheet.bacaContoh(k, ID)).data.tasks.length, 1);
  assert.deepEqual(tab('_meta').values.map(b => b[0]), ['app', 'disiapkan', 'catatan', 'contoh_versi', 'contoh_sumber']);
});

test('tab dibuat seukuran isinya — log 1001 baris tak menabrak batas grid 1000', async () => {
  const { k } = kosong();
  const besar = contoh();
  besar.log = Array.from({ length: 1000 }, (_, i) => ({ id: 'l' + i, type: 'update', task: 'x', detail: '', by: 'ali', at: Date.UTC(2026, 7, 1) + i }));
  await sheet.tulisContoh(k, ID, urai(besar));
  assert.equal((await sheet.bacaContoh(k, ID)).data.log.length, 1000);
});

test('bacaContoh: belum pernah diimpor → data null; belum disiapkan → ditolak', async () => {
  const siap = kosong();
  await sheet.siapkan(siap.k, ID);
  assert.deepEqual(await sheet.bacaContoh(siap.k, ID), { versi: '', sumber: '', data: null });
  await assert.rejects(sheet.bacaContoh(kosong().k, ID), /belum disiapkan untuk v2/);
});

test('kolom yang digeser orang di spreadsheet tetap terbaca benar', async () => {
  const { k, tab } = kosong();
  await sheet.tulisContoh(k, ID, urai(contoh()));
  const t = tab('packages');
  t.values = t.values.map(b => [...b].reverse());   // urutan kolom dibalik total
  assert.deepEqual((await sheet.bacaContoh(k, ID)).data.packages, contoh().packages);
});
