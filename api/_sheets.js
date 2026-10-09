/* =============================================================================
   _sheets.js — lapisan Google Sheets untuk v2.

   Satu aturan dijaga di sini, dan hanya di sini: v2 TIDAK PERNAH menulis ke
   spreadsheet yang bukan miliknya.

   Spreadsheet milik v2 ditandai tab `_meta` yang berisi `app = producttrack-v2`.
   Penanda itu hanya mau dipasang di spreadsheet yang benar-benar kosong. Sheet v1
   (tab Main, OPTIONS, COMMENTS, ...) tidak akan pernah lolos, bahkan kalau
   SPREADSHEET_ID salah isi DAN service account-nya kebetulan punya akses ke sana.

   Itu lapis kedua. Lapis pertamanya service account v2 sendiri, yang hanya
   di-share ke sheet v2: salah ID di sana berakhir sebagai 403, bukan tulisan.
   ========================================================================== */

const fs = require('fs');
const path = require('path');
const {
  TAB, TAB_OPSIONAL, USANG, TAB_OBROLAN, OBROLAN, TAB_FOTO, FOTO, TAB_ORANG, ORANG_KOLOM, TAB_MASTER, MASTER_KOLOM, TAB_PIN, PIN_KOLOM,
  dariBaris, obrolanKeBaris, obrolanDariBaris, fotoKeBaris, fotoDariBaris, orangKeBaris, orangDariBaris,
  masterKeBaris, masterDariBaris, pinKeBaris, pinDariBaris, rakit, nomorTerbesar,
} = require('./_skema');

const PENANDA = { tab: '_meta', app: 'producttrack-v2' };
const CAKUPAN = ['https://www.googleapis.com/auth/spreadsheets'];

/* Env kurang atau salah isi — dibetulkan di Vercel atau .env, bukan di kode. */
class GalatSetelan extends Error {}
/* Permintaannya sah, tapi melanggar aturan kepemilikan di atas. */
class GalatDitolak extends Error {}

/* ---------- Setelan ---------------------------------------------------- */

const env = nama => String(process.env[nama] || '').trim();

function setelanAda() {
  return {
    spreadsheet: !!env('SPREADSHEET_ID'),
    kredensial: !!(env('GOOGLE_SERVICE_ACCOUNT_JSON') || env('GOOGLE_APPLICATION_CREDENTIALS')),
  };
}

/* Menerima ID maupun seluruh URL. Menempel seluruh link adalah kesalahan yang
   sampai masuk tabel Troubleshooting README v1; di sini diterima saja. */
function idSpreadsheet() {
  const mentah = env('SPREADSHEET_ID');
  if (!mentah) throw new GalatSetelan('SPREADSHEET_ID belum diisi — isi dengan ID spreadsheet KHUSUS v2.');
  const dariUrl = /\/spreadsheets\/d\/([A-Za-z0-9_-]+)/.exec(mentah);
  const id = dariUrl ? dariUrl[1] : mentah;
  if (!/^[A-Za-z0-9_-]{20,}$/.test(id)) {
    throw new GalatSetelan('SPREADSHEET_ID tidak berbentuk ID spreadsheet. Salin bagian di antara /d/ dan /edit pada URL-nya.');
  }
  return id;
}

/* GOOGLE_SERVICE_ACCOUNT_JSON (seluruh isi berkas kunci, satu baris) untuk Vercel;
   GOOGLE_APPLICATION_CREDENTIALS (jalur berkas) untuk lokal. Kalau keduanya terisi,
   JSON yang menang.

   Sengaja tak ada nama berkas bawaan seperti credentials.json di v1: berkas kunci v1
   yang tersalin ke folder ini tidak akan pernah terpakai diam-diam. */
function kredensial() {
  const json = env('GOOGLE_SERVICE_ACCOUNT_JSON');
  const berkas = env('GOOGLE_APPLICATION_CREDENTIALS');
  let sumber, isi;
  if (json) {
    sumber = 'GOOGLE_SERVICE_ACCOUNT_JSON';
    isi = json;
  } else if (berkas) {
    sumber = `Berkas ${berkas}`;
    try {
      isi = fs.readFileSync(path.resolve(berkas), 'utf8');
    } catch (e) {
      throw new GalatSetelan(`Berkas kunci tak terbaca: ${berkas}. Periksa GOOGLE_APPLICATION_CREDENTIALS.`);
    }
  } else {
    throw new GalatSetelan('Kredensial belum diisi. Di Vercel: GOOGLE_SERVICE_ACCOUNT_JSON. Di lokal: GOOGLE_APPLICATION_CREDENTIALS berisi jalur berkas kunci v2.');
  }
  let k;
  try {
    k = JSON.parse(isi);
  } catch (e) {
    throw new GalatSetelan(`${sumber} bukan JSON yang valid — tempel SELURUH isi berkas kunci, dalam satu baris.`);
  }
  if (!k || !k.client_email || !k.private_key) {
    throw new GalatSetelan(`${sumber} tidak memuat client_email dan private_key — itu bukan berkas kunci service account.`);
  }
  // Sebagian antarmuka menyimpan baris baru di kunci sebagai "\n" harfiah.
  return { client_email: k.client_email, private_key: String(k.private_key).replace(/\\n/g, '\n') };
}

/* Email akun yang sedang dipakai, tanpa melempar. Untuk pesan galat. */
function emailAkun() {
  try { return kredensial().client_email; } catch (e) { return ''; }
}

/* Satu klien per instance. Instance Vercel yang masih hangat memakainya ulang,
   termasuk token aksesnya. */
let klienHangat = null;
async function klien() {
  if (klienHangat) return klienHangat;
  const k = kredensial();
  const { sheets, auth } = require('@googleapis/sheets');
  const ga = new auth.GoogleAuth({ credentials: k, scopes: CAKUPAN });
  klienHangat = { api: sheets({ version: 'v4', auth: ga }), email: k.client_email };
  return klienHangat;
}

/* ---------- Percobaan ulang (pola v1, CHANGELOG 1.89.2) -----------------
   Kuota baca Sheets dihitung per menit per service account, dan yang memicunya
   hampir selalu ledakan sesaat. Yang boleh diulang dibedakan dengan sengaja:
   - BACA idempoten: diulang saat kena kuota maupun gangguan sesaat.
   - TULIS hanya diulang saat kena kuota. Kena kuota berarti permintaannya ditolak
     SEBELUM dijalankan. Galat jaringan sebaliknya ambigu: bisa jadi sudah terlanjur
     dijalankan, dan mengulangnya menggandakan hasilnya. */
const JEDA_ULANG = [400, 1100];

function kodeHttp(err) {
  const n = Number((err && (err.status || (err.response && err.response.status))) || 0);
  if (n) return n;
  return typeof (err && err.code) === 'number' ? err.code : 0;
}

/* Satu teks huruf kecil berisi semua yang bisa menjelaskan sebuah galat: pesannya,
   status ('PERMISSION_DENIED'), reason ('rateLimitExceeded', 'SERVICE_DISABLED'),
   dan kode sistem ('ECONNRESET'). Bentuk galat Google berbeda antar versi pustaka;
   mencocokkan gabungannya lebih tahan daripada bergantung pada satu bidang. */
function jejak(err) {
  if (!err) return '';
  const sebab = err.cause && typeof err.cause === 'object' ? err.cause : {};
  const bagian = [err.message, err.code, sebab.status];
  for (const daftar of [sebab.errors, sebab.details, err.errors]) {
    if (Array.isArray(daftar)) for (const x of daftar) bagian.push(x && x.reason);
  }
  return bagian.filter(Boolean).join(' ').toLowerCase();
}

function kenaKuota(err) {
  return kodeHttp(err) === 429
    || /ratelimitexceeded|rate_limit_exceeded|resource_exhausted|quota exceeded/.test(jejak(err));
}

function gangguanSesaat(err) {
  return [500, 502, 503, 504].includes(kodeHttp(err))
    || /econnreset|etimedout|socket hang up|eai_again|backenderror/.test(jejak(err));
}

const tidur = ms => new Promise(r => setTimeout(r, ms));

async function panggil(fn, { tulis = false, jeda = JEDA_ULANG } = {}) {
  const bolehUlang = tulis ? kenaKuota : (e => kenaKuota(e) || gangguanSesaat(e));
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i >= jeda.length || !bolehUlang(err)) throw err;
      await tidur(jeda[i]);
    }
  }
}

/* ---------- Kepemilikan ------------------------------------------------ */

const rentang = (tab, sel) => `'${String(tab).replace(/'/g, "''")}'!${sel}`;

function petakan(baris) {
  const peta = {};
  for (const b of baris || []) {
    if (b && b[0]) peta[String(b[0]).trim()] = String(b[1] == null ? '' : b[1]).trim();
  }
  return peta;
}

/* Kepemilikan selalu satu dari tiga:
     kosong — satu tab tanpa isi. Boleh disiapkan untuk v2.
     v2     — penanda v2 ada. Boleh dipakai.
     asing  — selain itu. Tidak ditulisi, apa pun alasannya.
   idTab ikut dikembalikan untuk siapkan(); periksa() membuangnya. */
async function bacaKeadaan({ api }, id) {
  const meta = await panggil(() => api.spreadsheets.get({
    spreadsheetId: id,
    fields: 'properties.title,sheets.properties(sheetId,title)',
  }));
  const tabs = (meta.data.sheets || []).map(s => s.properties);
  const dasar = {
    judul: meta.data.properties.title,
    tab: tabs.map(t => t.title),
    url: `https://docs.google.com/spreadsheets/d/${id}/edit`,
    idTab: tabs.map(t => t.sheetId),
  };

  if (dasar.tab.includes(PENANDA.tab)) {
    const r = await panggil(() => api.spreadsheets.values.get({ spreadsheetId: id, range: rentang(PENANDA.tab, 'A1:B20') }));
    const peta = petakan(r.data.values);
    if (peta.app === PENANDA.app) {
      return {
        ...dasar, kepemilikan: 'v2', disiapkan: peta.disiapkan || '',
        contoh: peta.contoh_versi ? { versi: peta.contoh_versi, sumber: peta.contoh_sumber || '' } : null,
        meta: peta,
      };
    }
    return { ...dasar, kepemilikan: 'asing', alasan: `Tab ${PENANDA.tab} ada, tapi isinya bukan penanda v2.` };
  }
  if (tabs.length === 1) {
    const r = await panggil(() => api.spreadsheets.values.get({ spreadsheetId: id, range: rentang(tabs[0].title, 'A1:Z100') }));
    if (!(r.data.values || []).length) return { ...dasar, kepemilikan: 'kosong' };
    return { ...dasar, kepemilikan: 'asing', alasan: `Tab "${tabs[0].title}" sudah berisi data.` };
  }
  const contoh = dasar.tab.slice(0, 5).join(', ') + (dasar.tab.length > 5 ? ', …' : '');
  return { ...dasar, kepemilikan: 'asing', alasan: `Berisi ${dasar.tab.length} tab (${contoh}) tanpa penanda v2.` };
}

function publik(keadaan) {
  const { idTab, meta, ...sisa } = keadaan;
  return sisa;
}

/* sheetId dipilih sendiri supaya permintaan lanjutan bisa merujuknya di batchUpdate
   yang sama — sheetId buatan Google baru diketahui setelah permintaannya selesai. */
function idTabBaru(dipakai) {
  let id;
  do { id = 1000000 + Math.floor(Math.random() * 2000000000); } while (dipakai.includes(id));
  dipakai.push(id);
  return id;
}

async function periksa(k, id) {
  return publik(await bacaKeadaan(k, id));
}

async function siapkan(k, id) {
  const awal = await bacaKeadaan(k, id);
  if (awal.kepemilikan === 'v2') return { ...publik(awal), berubah: false };
  if (awal.kepemilikan === 'asing') {
    throw new GalatDitolak(`Spreadsheet "${awal.judul}" bukan milik v2. ${awal.alasan} Periksa SPREADSHEET_ID — v2 hanya mau menyiapkan spreadsheet yang benar-benar kosong.`);
  }

  const idBaru = idTabBaru(awal.idTab);
  const baris = [
    ['app', PENANDA.app],
    ['disiapkan', new Date().toISOString()],
    ['catatan', 'Penanda bahwa spreadsheet ini milik ProductTrack v2. Jangan dihapus atau diubah.'],
  ];

  let berubah = true;
  try {
    /* Satu batchUpdate itu atomik: tab dan isinya jadi bersamaan, atau tidak sama
       sekali. Kalau dipecah dua, tab _meta yang terlanjur dibuat tapi gagal diisi
       akan terbaca "asing" — dan spreadsheet-nya terkunci dari v2 sendiri. */
    await panggil(() => k.api.spreadsheets.batchUpdate({
      spreadsheetId: id,
      requestBody: {
        requests: [
          { addSheet: { properties: { sheetId: idBaru, title: PENANDA.tab } } },
          {
            updateCells: {
              start: { sheetId: idBaru, rowIndex: 0, columnIndex: 0 },
              rows: baris.map(b => ({ values: b.map(s => ({ userEnteredValue: { stringValue: s } })) })),
              fields: 'userEnteredValue',
            },
          },
        ],
      },
    }), { tulis: true });
  } catch (err) {
    // Dua orang menekan Siapkan bersamaan: yang kalah mendapati tabnya sudah ada.
    if (!/already exists/.test(jejak(err))) throw err;
    berubah = false;
  }
  return { ...(await periksa(k, id)), berubah };
}

/* ---------- Data contoh ------------------------------------------------ */

/* Menulis ulang SEMUA tab data. baris = { namaTab: [[judul...], [nilai...], ...] }.

   Tab lama dihapus lalu dibuat ulang dalam satu batchUpdate atomik, dengan ukuran
   grid yang pas: values.update menolak menulis melewati batas grid (bawaannya 1000
   baris), dan tab log saja sudah 1001 baris. */
async function tulisContoh(k, id, baris, { sumber = '' } = {}) {
  let keadaan = await bacaKeadaan(k, id);
  if (keadaan.kepemilikan === 'asing') {
    throw new GalatDitolak(`Spreadsheet "${keadaan.judul}" bukan milik v2. ${keadaan.alasan} Data contoh tidak ditulis.`);
  }
  if (keadaan.kepemilikan === 'kosong') {
    await siapkan(k, id);
    keadaan = await bacaKeadaan(k, id);
  }

  const dipakai = [...keadaan.idTab];
  const permintaan = [];
  for (const nama of USANG) {
    const i = keadaan.tab.indexOf(nama);
    if (i >= 0 && !(nama in baris)) permintaan.push({ deleteSheet: { sheetId: keadaan.idTab[i] } });
  }
  for (const [nama, isi] of Object.entries(baris)) {
    const i = keadaan.tab.indexOf(nama);
    if (i >= 0) permintaan.push({ deleteSheet: { sheetId: keadaan.idTab[i] } });
    const sheetId = idTabBaru(dipakai);
    permintaan.push({
      addSheet: {
        properties: {
          sheetId, title: nama,
          gridProperties: { rowCount: isi.length + 50, columnCount: isi[0].length, frozenRowCount: 1 },
        },
      },
    });
    permintaan.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
        cell: { userEnteredFormat: { textFormat: { bold: true } } },
        fields: 'userEnteredFormat.textFormat.bold',
      },
    });
  }
  await panggil(() => k.api.spreadsheets.batchUpdate({ spreadsheetId: id, requestBody: { requests: permintaan } }), { tulis: true });

  // Satu permintaan per tab: tiap muatan jauh di bawah batas yang disarankan Google (2 MB).
  for (const [nama, isi] of Object.entries(baris)) {
    await panggil(() => k.api.spreadsheets.values.update({
      spreadsheetId: id, range: rentang(nama, 'A1'), valueInputOption: 'RAW', requestBody: { values: isi },
    }), { tulis: true });
  }

  const versi = new Date().toISOString();
  await tulisMeta(k, id, { ...keadaan.meta, contoh_versi: versi, contoh_sumber: sumber });
  return { versi, jumlah: Object.fromEntries(Object.entries(baris).map(([n, isi]) => [n, isi.length - 1])) };
}

/* Penanda tetap di tiga baris teratas; kunci lain menyusul di bawahnya. */
async function tulisMeta(k, id, meta) {
  const urutan = ['app', 'disiapkan', 'catatan'];
  const kunci = [...urutan.filter(x => x in meta), ...Object.keys(meta).filter(x => !urutan.includes(x))];
  const isi = kunci.map(x => [x, String(meta[x])]);
  await panggil(() => k.api.spreadsheets.values.update({
    spreadsheetId: id, range: rentang(PENANDA.tab, `A1:B${isi.length}`), valueInputOption: 'RAW', requestBody: { values: isi },
  }), { tulis: true });
}

/* Dua pembacaan: metadata + penanda, lalu semua tab data dalam satu batchGet. */
async function bacaContoh(k, id) {
  const keadaan = await bacaKeadaan(k, id);
  if (keadaan.kepemilikan !== 'v2') {
    throw new GalatDitolak('Spreadsheet ini belum disiapkan untuk v2. Buka /cek lalu tekan "Siapkan untuk v2".');
  }
  const semua = Object.keys(TAB);
  const kurang = semua.filter(n => !keadaan.tab.includes(n));
  if (kurang.length === semua.length || !keadaan.contoh) return { versi: '', sumber: '', data: null };
  const wajibKurang = kurang.filter(n => !TAB_OPSIONAL.has(n));
  if (wajibKurang.length) {
    throw new GalatDitolak(`Tab data contoh tidak lengkap (tak ada: ${wajibKurang.join(', ')}). Jalankan ulang npm run impor:v1.`);
  }
  const nama = semua.filter(n => keadaan.tab.includes(n));
  const adaOrang = keadaan.tab.includes(TAB_ORANG);
  const adaMaster = keadaan.tab.includes(TAB_MASTER);
  const ranges = [...nama.map(n => rentang(n, 'A:Z')), ...(adaOrang ? [rentang(TAB_ORANG, 'A:I')] : []), ...(adaMaster ? [rentang(TAB_MASTER, 'A:F')] : [])];
  const r = await panggil(() => k.api.spreadsheets.values.batchGet({ spreadsheetId: id, ranges }));
  const tabs = Object.fromEntries(kurang.map(n => [n, []]));
  const hasil = r.data.valueRanges || [];
  hasil.slice(0, nama.length).forEach((vr, i) => {
    const [judul = [], ...isi] = vr.values || [];
    tabs[nama[i]] = isi.filter(b => b.some(sel => String(sel).trim())).map(b => dariBaris(nama[i], judul, b));
  });
  const data = rakit(tabs);
  return {
    versi: keadaan.contoh.versi,
    sumber: keadaan.contoh.sumber,
    data,
    orang: adaOrang ? barisOrangDari((hasil[nama.length] || {}).values) : [],
    master: adaMaster ? barisMasterDari((hasil[nama.length + (adaOrang ? 1 : 0)] || {}).values) : [],
    seq: {
      task: nomorTerbesar(data.tasks, 'PRD'),
      prj: nomorTerbesar(data.projects, 'PRJ'),
      pkg: nomorTerbesar(data.packages, 'PKG'),
    },
  };
}

/* ---------- Obrolan (Komunikasi bersama, 0.10.0) ------------------------
   Satu-satunya data yang DITULIS aplikasi ke spreadsheet. Tab `obrolan` hanya bertambah
   (values.append): pesan, ubah, hapus, reaksi, dan "beres" adalah baris peristiwa, dan
   keadaan akhirnya disusun di browser (Inti.susunObrolan). Dua orang yang menulis bersamaan
   tak saling menimpa, dan tak ada baris yang perlu dikunci.

   id dan waktu `at` diberikan di sini, bukan oleh browser: urutannya satu, dan tarikan
   bertahap (sejak) tak melewatkan baris dari browser yang jamnya meleset. */

/* Kepemilikan jarang berubah. Supaya tiap tarikan obrolan tak memakan dua bacaan tambahan,
   hasil pemeriksaannya dipakai ulang di instance yang sama paling lama 10 menit. */
const UMUR_KEPEMILIKAN = 10 * 60 * 1000;
let kepemilikanHangat = null;
async function pastikanV2(k, id) {
  const h = kepemilikanHangat;
  if (h && h.k === k && h.id === id && Date.now() - h.waktu < UMUR_KEPEMILIKAN) return;
  const keadaan = await bacaKeadaan(k, id);
  if (keadaan.kepemilikan !== 'v2') {
    throw new GalatDitolak(`Spreadsheet "${keadaan.judul}" bukan milik v2${keadaan.alasan ? ': ' + keadaan.alasan : ''}. Pesan tidak dibaca atau ditulis.`);
  }
  kepemilikanHangat = { k, id, waktu: Date.now() };
}

/* Bacaan tab dipakai bersama permintaan yang berdekatan di instance yang sama: dua belas
   orang yang menarik pesan hampir bersamaan cukup memakan satu kuota baca. Kuota baca
   Sheets dihitung per service account, jadi ini yang menjaga jeda tarikan tetap aman. */
const UMUR_BACAAN = 3000;
let bacaanHangat = null;
const tabBelumAda = err => /unable to parse range/.test(jejak(err));

async function semuaObrolan(k, id) {
  const h = bacaanHangat;
  if (h && h.k === k && h.id === id && Date.now() - h.waktu < UMUR_BACAAN) return h.isi;
  let nilai = [];
  try {
    const r = await panggil(() => k.api.spreadsheets.values.get({ spreadsheetId: id, range: rentang(TAB_OBROLAN, 'A:J') }));
    nilai = r.data.values || [];
  } catch (err) {
    if (!tabBelumAda(err)) throw err;   // tab belum ada: belum pernah ada yang menulis
  }
  const [judul = [], ...isi] = nilai;
  const peristiwa = isi.filter(b => b.some(sel => String(sel).trim())).map(b => obrolanDariBaris(judul, b));
  bacaanHangat = { k, id, waktu: Date.now(), isi: peristiwa };
  return peristiwa;
}

/* sejak = waktu (ms) peristiwa terbaru yang sudah dimiliki browser. Yang sama persis ikut
   dikirim lagi (dua baris bisa bertanggal sama); browser membuang yang id-nya sudah ada. */
async function bacaObrolan(k, id, sejak = 0) {
  await pastikanV2(k, id);
  const batas = Number(sejak) || 0;
  const semua = await semuaObrolan(k, id);
  return { peristiwa: batas ? semua.filter(e => e.at >= batas) : semua, waktu: Date.now() };
}

/* Tab milik aplikasi (obrolan, foto) dan judul kolomnya dibuat dalam satu batchUpdate atomik:
   tab tanpa judul tak pernah ada, jadi baris pertama tak mungkin mendarat di baris judul. */
async function buatTabAplikasi(k, id, nama, kolom, baris = 1000) {
  const sheetId = idTabBaru([]);
  try {
    await panggil(() => k.api.spreadsheets.batchUpdate({
      spreadsheetId: id,
      requestBody: {
        requests: [
          { addSheet: { properties: { sheetId, title: nama, gridProperties: { rowCount: baris, columnCount: kolom.length, frozenRowCount: 1 } } } },
          {
            updateCells: {
              start: { sheetId, rowIndex: 0, columnIndex: 0 },
              rows: [{ values: kolom.map(s => ({ userEnteredValue: { stringValue: s } })) }],
              fields: 'userEnteredValue',
            },
          },
        ],
      },
    }), { tulis: true });
  } catch (err) {
    if (!/already exists/.test(jejak(err))) throw err;   // baru saja dibuat permintaan lain
  }
}

let urutId = 0;
const idPeristiwa = () => 'o' + Date.now().toString(36) + (urutId++ % 1296).toString(36).padStart(2, '0') + Math.random().toString(36).slice(2, 6);

/* e sudah dibersihkan Inti.periksaPeristiwa. */
async function tulisObrolan(k, id, e) {
  await pastikanV2(k, id);
  const baris = { ...e, id: idPeristiwa(), at: Date.now() };
  const tambah = () => panggil(() => k.api.spreadsheets.values.append({
    spreadsheetId: id, range: rentang(TAB_OBROLAN, 'A1'), valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [obrolanKeBaris(baris)] },
  }), { tulis: true });
  try {
    await tambah();
  } catch (err) {
    if (!tabBelumAda(err)) throw err;
    await buatTabAplikasi(k, id, TAB_OBROLAN, OBROLAN);
    await tambah();
  }
  bacaanHangat = null;
  return baris;
}

/* ---------- Foto profil (0.12.0) ---------------------------------------
   Tab `foto`: satu baris per orang (orang, gambar, diperbarui). gambar = data URL JPEG kecil
   (192 px, paling banyak Inti.FOTO_MAKS karakter: muat di satu sel, yang batasnya 50.000).
   Berbeda dengan obrolan, baris orang yang sama DITIMPA supaya tab tetap kecil; gambar kosong
   berarti foto dihapus. Bukan data contoh: impor ulang dan Reset data contoh tak menyentuhnya. */

/* null = tab belum ada (belum pernah ada yang mengunggah). */
async function barisFoto(k, id) {
  try {
    const r = await panggil(() => k.api.spreadsheets.values.get({ spreadsheetId: id, range: rentang(TAB_FOTO, 'A:C') }));
    return r.data.values || [];
  } catch (err) {
    if (tabBelumAda(err)) return null;
    throw err;
  }
}
/* Satu foto per orang: kalau ada baris ganda (dua unggahan bersamaan), yang terbaru menang. */
function fotoTerbaru(nilai) {
  const [judul = [], ...isi] = nilai || [];
  const per = new Map();
  for (const b of isi) {
    const f = fotoDariBaris(judul, b);
    if (!f.orang) continue;
    const lama = per.get(f.orang);
    if (!lama || f.diperbarui >= lama.diperbarui) per.set(f.orang, f);
  }
  return [...per.values()];
}

/* sejak = waktu (ms) foto terbaru yang sudah dimiliki browser: yang tak berubah tak dikirim ulang. */
async function bacaFoto(k, id, sejak = 0) {
  await pastikanV2(k, id);
  const batas = Number(sejak) || 0;
  const semua = fotoTerbaru(await barisFoto(k, id));
  return { foto: batas ? semua.filter(f => f.diperbarui >= batas) : semua, waktu: Date.now() };
}

/* f sudah dibersihkan Inti.periksaFoto. Waktu diberikan server, seperti obrolan. */
async function tulisFoto(k, id, f) {
  await pastikanV2(k, id);
  const baris = { orang: f.orang, gambar: f.gambar, diperbarui: Date.now() };
  let nilai = await barisFoto(k, id);
  if (!nilai) {
    await buatTabAplikasi(k, id, TAB_FOTO, FOTO, 100);
    nilai = [FOTO];
  }
  // Baris terakhir milik orang itu ditimpa; kalau belum ada, ditambah di bawah.
  const judul = nilai[0] || FOTO;
  let n = -1;
  nilai.forEach((b, i) => { if (i > 0 && fotoDariBaris(judul, b).orang === f.orang) n = i; });
  if (n > 0) {
    await panggil(() => k.api.spreadsheets.values.update({
      spreadsheetId: id, range: rentang(TAB_FOTO, `A${n + 1}:C${n + 1}`), valueInputOption: 'RAW',
      requestBody: { values: [fotoKeBaris(baris)] },
    }), { tulis: true });
  } else {
    await panggil(() => k.api.spreadsheets.values.append({
      spreadsheetId: id, range: rentang(TAB_FOTO, 'A1'), valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [fotoKeBaris(baris)] },
    }), { tulis: true });
  }
  return baris;
}

/* ---------- Orang (kelola orang di mode Dev, 0.13.0) ---------------------
   Tab `orang`: satu baris per orang yang diubah atau ditambah mode Dev (organogram bawaan ada
   di public/inti.js). Seperti foto, baris orang yang sama ditimpa. Server juga memakainya untuk
   memeriksa pengirim pesan dan pemilik foto, jadi bacaannya disimpan sebentar (1 menit). */
function barisOrangDari(nilai) {
  const [judul = [], ...isi] = nilai || [];
  return isi.filter(b => b.some(sel => String(sel).trim())).map(b => orangDariBaris(judul, b)).filter(o => o.id);
}
const UMUR_ORANG = 60 * 1000;
let orangHangat = null;
async function bacaOrang(k, id, { segar = false } = {}) {
  const h = orangHangat;
  if (!segar && h && h.k === k && h.id === id && Date.now() - h.waktu < UMUR_ORANG) return h.isi;
  await pastikanV2(k, id);
  let nilai = [];
  try {
    const r = await panggil(() => k.api.spreadsheets.values.get({ spreadsheetId: id, range: rentang(TAB_ORANG, 'A:I') }));
    nilai = r.data.values || [];
  } catch (err) {
    if (!tabBelumAda(err)) throw err;
  }
  const isi = barisOrangDari(nilai);
  orangHangat = { k, id, waktu: Date.now(), isi };
  return isi;
}

/* o sudah dibersihkan Inti.periksaOrang. Mengembalikan semua baris sesudah ditulis. */
async function tulisOrang(k, id, o) {
  await pastikanV2(k, id);
  const baris = { ...o, diperbarui: Date.now() };
  let nilai;
  try {
    const r = await panggil(() => k.api.spreadsheets.values.get({ spreadsheetId: id, range: rentang(TAB_ORANG, 'A:I') }));
    nilai = r.data.values || [];
  } catch (err) {
    if (!tabBelumAda(err)) throw err;
    await buatTabAplikasi(k, id, TAB_ORANG, ORANG_KOLOM, 100);
    nilai = [ORANG_KOLOM];
  }
  const judul = nilai[0] || ORANG_KOLOM;
  let n = -1;
  nilai.forEach((b, i) => { if (i > 0 && orangDariBaris(judul, b).id === o.id) n = i; });
  if (n > 0) {
    await panggil(() => k.api.spreadsheets.values.update({
      spreadsheetId: id, range: rentang(TAB_ORANG, `A${n + 1}:I${n + 1}`), valueInputOption: 'RAW',
      requestBody: { values: [orangKeBaris(baris)] },
    }), { tulis: true });
  } else {
    await panggil(() => k.api.spreadsheets.values.append({
      spreadsheetId: id, range: rentang(TAB_ORANG, 'A1'), valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [orangKeBaris(baris)] },
    }), { tulis: true });
  }
  orangHangat = null;
  return bacaOrang(k, id, { segar: true });
}

/* ---------- Master & PIN (0.14.0) --------------------------------------
   Tab `master`: satu baris per isian daftar pilihan (jenis + kunci), ditimpa seperti orang.
   Tab `pin`: PIN tiap profil sebagai hash scrypt bergaram; hanya dibaca server, tak pernah
   dikirim ke browser. Keduanya bukan data contoh: impor ulang tak menyentuhnya. */
function barisMasterDari(nilai) {
  const [judul = [], ...isi] = nilai || [];
  return isi.filter(b => b.some(sel => String(sel).trim())).map(b => masterDariBaris(judul, b)).filter(m => m.jenis && m.kunci);
}
const tabAplikasi = async (k, id, nama, kolom) => {
  try {
    const r = await panggil(() => k.api.spreadsheets.values.get({ spreadsheetId: id, range: rentang(nama, 'A:' + String.fromCharCode(64 + kolom.length)) }));
    return r.data.values || [];
  } catch (err) {
    if (tabBelumAda(err)) return null;
    throw err;
  }
};
/* Timpa baris yang cocok (cocok(barisTab)), atau tambah di bawah; tab dibuat kalau belum ada. */
async function timpaAtauTambah(k, id, nama, kolom, cocok, nilaiBaris) {
  let nilai = await tabAplikasi(k, id, nama, kolom);
  if (!nilai) {
    await buatTabAplikasi(k, id, nama, kolom, 200);
    nilai = [kolom];
  }
  const judul = nilai[0] || kolom;
  let n = -1;
  nilai.forEach((b, i) => { if (i > 0 && cocok(judul, b)) n = i; });
  const akhir = String.fromCharCode(64 + kolom.length);
  if (n > 0) {
    await panggil(() => k.api.spreadsheets.values.update({
      spreadsheetId: id, range: rentang(nama, `A${n + 1}:${akhir}${n + 1}`), valueInputOption: 'RAW', requestBody: { values: [nilaiBaris] },
    }), { tulis: true });
  } else {
    await panggil(() => k.api.spreadsheets.values.append({
      spreadsheetId: id, range: rentang(nama, 'A1'), valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS', requestBody: { values: [nilaiBaris] },
    }), { tulis: true });
  }
}

async function bacaMaster(k, id) {
  await pastikanV2(k, id);
  return barisMasterDari(await tabAplikasi(k, id, TAB_MASTER, MASTER_KOLOM));
}
/* m sudah dibersihkan Inti.periksaMaster. Mengembalikan semua baris sesudah ditulis. */
async function tulisMaster(k, id, m) {
  await pastikanV2(k, id);
  const baris = { ...m, diperbarui: Date.now() };
  const sama = (judul, b) => { const x = masterDariBaris(judul, b); return x.jenis === m.jenis && x.kunci.toLowerCase() === String(m.kunci).toLowerCase(); };
  await timpaAtauTambah(k, id, TAB_MASTER, MASTER_KOLOM, sama, masterKeBaris(baris));
  return bacaMaster(k, id);
}

const UMUR_PIN = 60 * 1000;
let pinHangat = null;
/* Map orang → { hash, garam }; hanya yang PIN-nya terisi. */
async function bacaPin(k, id, { segar = false } = {}) {
  const h = pinHangat;
  if (!segar && h && h.k === k && h.id === id && Date.now() - h.waktu < UMUR_PIN) return h.isi;
  await pastikanV2(k, id);
  const [judul = [], ...isi] = (await tabAplikasi(k, id, TAB_PIN, PIN_KOLOM)) || [];
  const peta = new Map();
  for (const b of isi) {
    const p = pinDariBaris(judul, b);
    if (p.orang && p.hash) peta.set(p.orang, p);
  }
  pinHangat = { k, id, waktu: Date.now(), isi: peta };
  return peta;
}
/* hash kosong = PIN profil itu dihapus. */
async function tulisPin(k, id, orang, hash, garam) {
  await pastikanV2(k, id);
  const sama = (judul, b) => pinDariBaris(judul, b).orang === orang;
  await timpaAtauTambah(k, id, TAB_PIN, PIN_KOLOM, sama, pinKeBaris({ orang, hash, garam, diperbarui: Date.now() }));
  pinHangat = null;
  return bacaPin(k, id, { segar: true });
}

/* Panel Sistem mode Dev: isi tiap tab (baris berisi, tanpa judul), dalam satu batchGet. */
async function hitungTab(k, id) {
  const keadaan = await bacaKeadaan(k, id);
  if (!keadaan.tab.length) return [];
  const r = await panggil(() => k.api.spreadsheets.values.batchGet({ spreadsheetId: id, ranges: keadaan.tab.map(n => rentang(n, 'A:A')) }));
  return keadaan.tab.map((nama, i) => {
    const nilai = ((r.data.valueRanges || [])[i] || {}).values || [];
    const isi = nilai.filter(b => b.some(sel => String(sel).trim())).length;
    return { nama, baris: nama === PENANDA.tab ? isi : Math.max(0, isi - 1) };
  });
}

/* ---------- Pesan galat ------------------------------------------------
   Kegagalan pertama hampir selalu salah satu dari lima ini, dan pesan mentah Google
   tak menyebut langkah perbaikannya. */
function jelaskanGalat(err, email) {
  if (err instanceof GalatSetelan || err instanceof GalatDitolak) return err.message;
  const t = jejak(err);
  const kode = kodeHttp(err);
  if (/has not been used|is disabled|accessnotconfigured|service_disabled/.test(t)) {
    const tautan = /https:\/\/console\.(developers|cloud)\.google\.com\/\S+/.exec((err && err.message) || '');
    return 'Google Sheets API belum aktif di project Google Cloud milik service account ini.'
      + (tautan ? ` Aktifkan di: ${tautan[0]}` : ' Aktifkan di APIs & Services → Library → Google Sheets API.');
  }
  if (/invalid_grant|decoder routines|pem routines|no key or keyfile/.test(t)) {
    return 'Kunci service account ditolak Google. Buat kunci JSON baru, lalu tempel ulang SELURUH isinya.';
  }
  if (kode === 404 || /requested entity was not found/.test(t)) return 'Spreadsheet tidak ditemukan. Periksa SPREADSHEET_ID.';
  if (kode === 403 || /caller does not have permission|permission_denied/.test(t)) {
    return `Spreadsheet belum di-share ke ${email || 'service account v2'} sebagai Editor.`;
  }
  if (kenaKuota(err)) return 'Kuota Google Sheets sedang penuh. Tunggu sekitar satu menit, lalu coba lagi.';
  if (gangguanSesaat(err)) return 'Google Sheets sedang tak terjangkau. Coba lagi sebentar lagi.';
  return 'Kesalahan tak terduga: ' + ((err && err.message) || String(err));
}

module.exports = {
  PENANDA, GalatSetelan, GalatDitolak,
  setelanAda, idSpreadsheet, kredensial, emailAkun, klien,
  panggil, kenaKuota, gangguanSesaat,
  periksa, siapkan, tulisContoh, bacaContoh, bacaObrolan, tulisObrolan, bacaFoto, tulisFoto,
  bacaOrang, tulisOrang, bacaMaster, tulisMaster, bacaPin, tulisPin, hitungTab, jelaskanGalat,
};
