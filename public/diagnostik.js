'use strict';
const $ = id => document.getElementById(id);
let report = null, loading = false;
const backendLabel = value => ({ sheets: 'Google Spreadsheet', mysql: 'MySQL', 'sheets-fallback': 'Cadangan spreadsheet (baca saja)' })[value] || value;
const formatTime = value => new Date(value).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour12: false }) + ' WIB';
function node(tag, text, className) { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (className) el.className = className; return el; }
function pairs(id, rows) { $(id).replaceChildren(...rows.flatMap(([key, value]) => [node('dt', key), node('dd', String(value))])); }
async function rpc(action, args = []) {
  const response = await fetch('/api/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, args }) });
  const data = await response.json();
  return { http: response.status, requestId: response.headers.get('X-Request-ID'), ...data };
}
function showLogin(message = '') {
  report = null; $('content').hidden = true; $('login').hidden = false;
  $('notice').textContent = message; $('pin').focus();
}
function render(data) {
  report = data; $('login').hidden = true; $('content').hidden = false;
  const real = data.sumber === 'real', unknown = data.sumber === 'unknown', mysql = data.backendAktif === 'mysql';
  const mysqlWrite = data.mysql.penulisanAplikasi === null ? 'Belum dapat dikonfirmasi' : data.mysql.penulisanAplikasi ? 'Aktif' : 'Tidak dilakukan';
  $('summary-title').textContent = unknown ? 'Sumber data belum dapat dikonfirmasi' : !real ? 'Mode contoh: perubahan belum masuk data real' : mysql ? 'Backend MySQL aktif' : data.backendAktif === 'sheets-fallback' ? 'Cadangan dapat dibaca; penyimpanan dijeda' : 'Data baru masuk ke spreadsheet, belum ke MySQL';
  $('summary').textContent = data.penjelasan; $('reason').textContent = data.alasan;
  const chain = ['Browser', 'Server aplikasi', unknown ? 'Sumber belum terbaca' : !real ? 'Data contoh di browser' : backendLabel(data.backendAktif)];
  $('flow').replaceChildren(...chain.flatMap((text, i) => i ? [node('span', '→'), node('b', text)] : [node('b', text)]));
  pairs('runtime', [['Versi aplikasi', data.versi], ['Lingkungan', data.lingkungan], ['Waktu pemeriksaan', formatTime(data.waktu)], ['Service', data.instance.service], ['Revisi', data.instance.revision || '—']]);
  pairs('storage', [['Backend aktif', backendLabel(data.backendAktif)], ['Sumber data', unknown ? 'Belum terkonfirmasi' : real ? 'Data real' : 'Data contoh'], ['Tujuan simpan', data.tujuanPenyimpanan], ['Penulisan MySQL', mysqlWrite], ['Galat pemeriksaan', data.sourceError || 'Tidak ada'], ['DATA_BACKEND diminta', data.backendDiminta]]);
  $('request').textContent = 'Request ID pemeriksaan: ' + data.requestId;
  pairs('mysql', [['Backend digunakan', data.mysql.backendAktif ? 'Ya' : 'Tidak'], ['Konfigurasi lengkap', data.mysql.konfigurasiLengkap ? 'Ya' : 'Belum'], ['Host', data.mysql.host || 'Belum diisi pada server'], ['Port', data.mysql.port], ['Database', data.mysql.database || 'Belum diisi pada server'], ['Isian tersedia', Object.entries(data.mysql.konfigurasiAda).map(([key, yes]) => key + ': ' + (yes ? 'terisi' : 'belum')).join(' · ')]]);
  $('scope').textContent = data.cakupanLog;
  const visible = data.logs.slice(-20).reverse();
  $('logs').replaceChildren(...(visible.length ? visible.map(log => {
    const row = node('div', undefined, 'log'), top = node('div', undefined, 'log-top');
    top.append(node('strong', log.event, log.severity === 'ERROR' ? 'bad' : ''), node('span', formatTime(log.waktu), 'muted small'));
    row.append(top, node('pre', JSON.stringify(log))); return row;
  }) : [node('p', 'Belum ada catatan penyimpanan pada instance ini.', 'muted')]));
  $('notice').textContent = 'Status berhasil dibaca. Menampilkan ' + visible.length + ' catatan terbaru pada instance ini.';
}
function reportText() {
  if (!report) return '';
  return [
    'PRODUCTTRACK — LAPORAN PENYIMPANAN UNTUK IT',
    'Sumber: respons runtime server; bukan simulasi log.',
    'Waktu: ' + formatTime(report.waktu), 'Versi: ' + report.versi,
    'Backend aktif: ' + backendLabel(report.backendAktif), 'Sumber data: ' + report.sumber,
    'Tujuan penyimpanan: ' + report.tujuanPenyimpanan,
    'Penulisan MySQL: ' + (report.mysql.penulisanAplikasi === null ? 'BELUM TERKONFIRMASI' : report.mysql.penulisanAplikasi ? 'AKTIF' : 'TIDAK DILAKUKAN'),
    'Kode penjelasan: ' + report.alasan, report.penjelasan,
    'Request ID pemeriksaan: ' + report.requestId, '',
    'LOG INSTANCE SERVER (urutan waktu)', ...report.logs.map(log => JSON.stringify(log)), '',
    'CAKUPAN', report.cakupanLog, '', 'RESPONS DIAGNOSTIK', JSON.stringify(report, null, 2),
  ].join('\n');
}
async function load() {
  if (loading) return;
  loading = true; $('reload').disabled = true;
  try {
    const data = await rpc('diagnostikPenyimpanan');
    if (data.http === 401) return showLogin('Masuk dengan PIN aplikasi untuk melihat log.');
    if (!data.success) { $('notice').textContent = data.message || 'Pemeriksaan gagal (HTTP ' + data.http + ').'; return; }
    render(data.diagnostik);
  } catch { $('notice').textContent = 'Server tidak dapat dihubungi. Periksa jaringan lalu coba lagi.'; }
  finally { loading = false; $('reload').disabled = false; }
}
$('login-form').addEventListener('submit', async event => {
  event.preventDefault(); const button = event.currentTarget.querySelector('button'); button.disabled = true;
  try {
    const data = await rpc('masuk', [$('pin').value]); $('pin').value = '';
    if (!data.success) return showLogin(data.message || 'Gagal masuk.');
    await load();
  } catch { $('notice').textContent = 'Server tidak dapat dihubungi.'; }
  finally { button.disabled = false; }
});
$('reload').addEventListener('click', load);
$('copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(reportText()); $('notice').textContent = 'Laporan tersalin dan siap dikirim ke IT.'; } catch { $('notice').textContent = 'Penyalinan tidak tersedia. Gunakan Unduh laporan .txt.'; } });
$('download').addEventListener('click', () => {
  if (!report) return;
  const url = URL.createObjectURL(new Blob([reportText()], { type: 'text/plain;charset=utf-8' }));
  const a = node('a'); a.href = url; a.download = 'producttrack-log-penyimpanan-' + report.waktu.replace(/[:.]/g, '-') + '.txt'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('logout').addEventListener('click', async () => { try { await rpc('keluar'); } finally { showLogin('Sesi telah ditutup.'); } });
load();
