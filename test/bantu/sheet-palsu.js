/* Tiruan Google Sheets API secukupnya untuk tes: daftar tab, baca, batchGet,
   update dan append nilai, dan batchUpdate (addSheet, deleteSheet, updateCells, repeatCell).

   Setiap panggilan tulis dicatat di `tulisan`, supaya tes bisa memastikan sebuah
   jalur benar-benar TIDAK menulis apa pun. Batas grid ditegakkan seperti aslinya:
   values.update yang melewati jumlah baris tab akan gagal. */

const galat = (status, message) => Object.assign(new Error(message), { status, code: status, config: {} });

function sheetPalsu(tabs, { judul = 'Sheet Uji', email = 'producttrack-v2@contoh.iam.gserviceaccount.com' } = {}) {
  const tulisan = [];
  for (const t of tabs) {
    t.values = t.values || [];
    t.rowCount = t.rowCount || 1000;
  }
  const namaDari = range => {
    const m = /^'((?:[^']|'')*)'!/.exec(range);
    if (!m) throw galat(400, `Unable to parse range: ${range}`);
    return m[1].replace(/''/g, "'");
  };
  const tabDari = range => {
    const t = tabs.find(x => x.title === namaDari(range));
    if (!t) throw galat(400, `Unable to parse range: ${range}`);
    return t;
  };
  const barisAwal = range => {
    const m = /!([A-Z]+)(\d+)/.exec(range);
    return m ? Number(m[2]) - 1 : 0;
  };
  /* Seperti aslinya, bacaan hanya mengembalikan baris di dalam rentang: 'A5:H' mulai baris 5,
     'A1:H2' dua baris pertama, 'A:J' semuanya. (Kolom tak dipotong; tes tak memerlukannya.) */
  const dalamRentang = (range, values) => {
    const m = /!([A-Z]+)(\d+)?(?::([A-Z]+)(\d+)?)?$/.exec(range);
    if (!m || !m[2]) return values;
    return values.slice(Number(m[2]) - 1, m[4] ? Number(m[4]) : values.length);
  };

  const api = {
    spreadsheets: {
      async get() {
        return { data: { properties: { title: judul }, sheets: tabs.map(t => ({ properties: { sheetId: t.sheetId, title: t.title } })) } };
      },
      values: {
        async get({ range }) {
          const isi = dalamRentang(range, tabDari(range).values);
          return { data: isi.length ? { values: isi } : {} };
        },
        async batchGet({ ranges }) {
          return { data: { valueRanges: ranges.map(range => { const isi = dalamRentang(range, tabDari(range).values); return isi.length ? { range, values: isi } : { range }; }) } };
        },
        async update({ range, requestBody }) {
          tulisan.push({ jenis: 'values.update', range });
          const t = tabDari(range);
          const awal = barisAwal(range);
          const isi = requestBody.values;
          if (awal + isi.length > t.rowCount) {
            throw galat(400, `Range (${range}) exceeds grid limits. Max rows: ${t.rowCount}`);
          }
          isi.forEach((b, i) => { t.values[awal + i] = b.map(String); });
          return { data: {} };
        },
        /* INSERT_ROWS seperti aslinya: baris baru ditaruh sesudah baris terakhir yang berisi,
           dan grid bertambah sendiri. */
        async append({ range, requestBody }) {
          tulisan.push({ jenis: 'values.append', range });
          const t = tabDari(range);
          let akhir = t.values.length;
          while (akhir > 0 && !(t.values[akhir - 1] || []).some(s => String(s).trim())) akhir--;
          requestBody.values.forEach((b, i) => { t.values[akhir + i] = b.map(String); });
          t.rowCount = Math.max(t.rowCount, t.values.length);
          return { data: { updates: { updatedRows: requestBody.values.length } } };
        },
      },
      async batchUpdate({ requestBody }) {
        tulisan.push({ jenis: 'batchUpdate', requests: requestBody.requests });
        for (const r of requestBody.requests) {
          if (r.addSheet) {
            const p = r.addSheet.properties;
            if (tabs.some(t => t.title === p.title)) {
              throw galat(400, `Invalid requests[0].addSheet: A sheet with the name "${p.title}" already exists. Please enter another name.`);
            }
            const sheetId = p.sheetId ?? Math.max(0, ...tabs.map(t => t.sheetId)) + 1;
            tabs.push({ title: p.title, sheetId, values: [], rowCount: (p.gridProperties && p.gridProperties.rowCount) || 1000 });
          } else if (r.deleteSheet) {
            const i = tabs.findIndex(t => t.sheetId === r.deleteSheet.sheetId);
            if (i < 0) throw galat(400, `No sheet with id: ${r.deleteSheet.sheetId}`);
            tabs.splice(i, 1);
          } else if (r.updateCells) {
            const t = tabs.find(x => x.sheetId === r.updateCells.start.sheetId);
            if (!t) throw galat(400, `No grid with id: ${r.updateCells.start.sheetId}`);
            r.updateCells.rows.forEach((b, i) => { t.values[r.updateCells.start.rowIndex + i] = b.values.map(c => c.userEnteredValue.stringValue); });
          } else if (r.repeatCell) {
            if (!tabs.some(x => x.sheetId === r.repeatCell.range.sheetId)) throw galat(400, `No grid with id: ${r.repeatCell.range.sheetId}`);
          }
        }
        return { data: {} };
      },
    },
  };
  return { k: { api, email }, tabs, tulisan, tab: nama => tabs.find(t => t.title === nama) };
}

const kosong = () => sheetPalsu([{ title: 'Sheet1', sheetId: 0 }]);

const sheetV1 = () => sheetPalsu([
  { title: 'Main', sheetId: 0, values: [['', 'Task ID', 'Created Date'], ['', 'TSK-001', '2026-07-01']] },
  { title: 'OPTIONS', sheetId: 11, values: [['Type', 'Value']] },
  { title: 'COMMENTS', sheetId: 12 },
  { title: 'ACTIVITY', sheetId: 13 },
], { judul: 'Task Management' });

module.exports = { sheetPalsu, kosong, sheetV1, galat };
