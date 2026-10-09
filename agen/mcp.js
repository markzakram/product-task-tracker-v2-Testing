#!/usr/bin/env node
/* =============================================================================
   agen/mcp.js — alat ProductTrack untuk sesi AI agen Ali (server MCP lewat stdio, 2.17.0).

   Didaftarkan di agen/.mcp.json, jadi sesi Claude Code di folder agen/ (tugas AI dari Agent
   Office, atau Claude Code biasa yang dibuka di folder itu) mendapat alat-alat ini. Semua
   lewat klien.js dengan kunci agen: server ProductTrack memeriksa aturannya atas nama profil
   agen dan menandai pesan serta aktivitasnya AI.

   Alat baca berjalan tanpa izin (agen/.claude/settings.json). Alat tulis tidak ada di daftar
   izin, jadi setiap pemakaiannya menunggu persetujuan: kartu Izinkan/Tolak di Agent Office
   yang menampilkan isinya.

   Protokol: JSON-RPC 2.0, satu pesan per baris di stdin/stdout. Log hanya ke stderr.
   ========================================================================== */
'use strict';

const I = require('../public/inti.js');
const K = require('./klien');
const { ringkasanPagi } = require('./laporan');

let versi = '';
try { versi = require('../package.json').version; } catch (e) { versi = '0.0.0'; }

let klien = null;
const dapatKlien = () => klien || (klien = K.buatKlien());

/* ---------- Teks untuk alat baca ---------- */
const nama = id => (id ? I.orang(id).pendek : '-');
function cariTask(k, id) {
  const t = k.data.tasks.find(x => x.id === String(id || '').trim().toUpperCase());
  if (!t) throw new K.GalatAgen(`Task ${id} tidak ada di data ${k.mode}.`, 'TASK');
  return t;
}
const tglWaktu = at => { const d = new Date(at); return `${K.tglPendek(I.isoHari(at))} ${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`; };
function barisPesanRuang(m, k) {
  const tanda = [m.ai && 'AI', m.balas && `balas ${m.balas}`, m.tanya.length && `menunggu jawaban ${m.tanya.map(nama).join(', ')}${m.beres ? ' (beres)' : ''}`, m.diubah && 'diubah'].filter(Boolean);
  return `- [${m.id}] ${nama(m.oleh)} · ${tglWaktu(m.at)}${tanda.length ? ` · ${tanda.join(' · ')}` : ''}: ${m.dihapus ? '(dihapus)' : K.potong(m.teks, 600)}`;
}

function teksPekerjaan(k) {
  const p = I.pekerjaanSaya(k.data, k.me, k.hari);
  const out = [`Pekerjaan ${nama(k.me)} · data ${k.mode} · hari ini ${K.tglPanjang(k.hari)}`];
  if (k.mode !== 'real') out.push('Catatan: data contoh aktif. Perubahan task hanya bisa di data real; pesan tetap bisa dikirim.');
  for (const g of p.grup) {
    out.push('', `[${g.judul}] (${g.isi.length})`);
    for (const x of g.isi.slice(0, 25)) out.push('- ' + K.barisTask(x.t, k, x.alasan));
    if (g.isi.length > 25) out.push(`- …dan ${g.isi.length - 25} lagi`);
  }
  const rev = K.revisi(k);
  if (rev.length) {
    out.push('', `[Dikembalikan untuk direvisi] (${rev.length})`);
    for (const t of rev) out.push('- ' + K.barisTask(t, k));
  }
  const pesan = K.pesanMenunggu(k);
  out.push('', `[Pesan menunggu ${nama(k.me)}] (${pesan.length})`);
  for (const x of pesan) out.push(`- ${x.jenis === 'tanya' ? 'pertanyaan' : 'sebutan'} · ${K.barisPesan(x, k)}`);
  if (p.selesaiHariIni.length) out.push('', `Selesai hari ini: ${p.selesaiHariIni.map(t => t.id).join(', ')}`);
  return out.join('\n');
}

function teksDetail(k, id) {
  const t = cariTask(k, id);
  const proyek = t.project ? k.data.projects.find(p => p.id === t.project) : null;
  const anak = I.anakTask(k.perId, t.id);
  const induk = t.induk ? k.perId.get(t.induk) : null;
  const label = I.labelKeadaan(t, k.perId);
  const out = [
    `${t.id} · ${t.title}`,
    `Status: ${t.status}${label ? ` (${label})` : ''}${t.tertahan ? ' · tertahan' : ''} · jalur ${t.lane || 'rutin'}${t.sub ? ` · ${I.namaSub(t.sub)}` : ''}`,
    `Proyek: ${proyek ? `${proyek.id} ${proyek.name}` : '-'} · PIC: ${nama(t.pic)} · Peninjau: ${nama(I.peninjau(t))} · Tenggat: ${t.due ? K.tglPanjang(t.due) : '-'} · Prioritas: ${t.priority || '-'}`,
  ];
  if ((t.support || []).length) out.push(`Pendukung: ${t.support.map(nama).join(', ')}`);
  if (induk) out.push(`Task induk: ${K.barisTask(induk, k)}`);
  if (anak.length) { out.push('Task anak:'); for (const a of anak) out.push('- ' + K.barisTask(a, k, `PIC ${nama(a.pic)}`)); }
  if (t.detail || t.notes) out.push(`Keterangan: ${K.potong([t.detail, t.notes].filter(Boolean).join(' / '), 1200)}`);
  out.push(`Output: ${t.output ? K.potong(t.output, 1200) : '(kosong)'}`);
  out.push(`Bukti: ${t.evidence.length ? '' : '(belum ada)'}`);
  for (const e of t.evidence) out.push(`- ${e.label} (${e.url})`);
  out.push(`Sub-task: ${t.subtasks.length ? '' : '(tidak ada)'}`);
  for (const s of t.subtasks) out.push(`- [${s.done ? 'x' : ' '}] ${s.id} · ${s.title} · PIC ${nama(s.pic)}`);
  if (t.lane === 'proyek') out.push('Syarat ajukan: ' + I.syaratAjukan(t, k.perId).map(s => `${s.ok ? '✓' : '✗'} ${s.label}`).join('; '));
  const aksi = I.aksiUntuk(t, k.me, k.perId);
  out.push(`Aksi untuk ${nama(k.me)}: ${aksi.length ? aksi.map(a => `${a.kunci} (${a.label}${a.nonaktif ? `, nonaktif: ${a.alasan || 'belum bisa'}` : ''}${a.perluCatatan ? ', wajib catatan' : ''})`).join('; ') : '(tidak ada)'}`);
  if (t.tinjauan.length) {
    out.push('Riwayat tinjauan:');
    for (const r of t.tinjauan.slice().sort((a, b) => a.at - b.at)) out.push(`- ${r.action} oleh ${nama(r.by)}${r.ai ? ' (AI)' : ''} · ${tglWaktu(r.at)}${r.note ? `: "${K.potong(r.note, 300)}"` : ''}`);
  }
  const pesan = k.susunan.perRuang.get(I.ruangTask(t.id)) || [];
  out.push(`Diskusi (ruang ${I.ruangTask(t.id)}, ${pesan.length} pesan${pesan.length > 15 ? ', 15 terakhir' : ''}):`);
  for (const m of pesan.slice(-15)) out.push(barisPesanRuang(m, k));
  const log = k.data.log.filter(l => String(l.task).split(' ')[0] === t.id).slice(0, 8);
  if (log.length) { out.push('Aktivitas terakhir:'); for (const l of log) out.push(`- ${nama(l.by)}${l.ai ? ' (AI)' : ''} · ${tglWaktu(l.at)}: ${K.potong(l.detail, 200)}`); }
  return out.join('\n');
}

function teksPesanMenunggu(k) {
  const daftar = K.pesanMenunggu(k);
  if (!daftar.length) return `Tidak ada pertanyaan atau sebutan yang menunggu ${nama(k.me)}.`;
  const out = [`${daftar.length} pesan menunggu ${nama(k.me)} (pertanyaan terbuka, dan sebutan 14 hari terakhir yang belum dibalas):`];
  for (const x of daftar) out.push(`- ${x.jenis === 'tanya' ? 'PERTANYAAN' : 'sebutan'} · ${K.barisPesan(x, k)}`);
  out.push('', 'Baca konteksnya dengan baca_ruang atau detail_task sebelum membalas.');
  return out.join('\n');
}

function teksRuang(k, ruang, batas) {
  if (!I.bolehRuang(k.me, ruang)) throw new K.GalatAgen(`Ruang ${ruang} tidak bisa dibuka ${nama(k.me)}.`, 'RUANG');
  const pesan = k.susunan.perRuang.get(ruang) || [];
  const n = Math.max(1, Math.min(100, Number(batas) || 30));
  const out = [`Ruang ${ruang} · ${K.judulRuang(k.data, ruang, k.susunan)} · ${pesan.length} pesan${pesan.length > n ? `, ${n} terakhir` : ''}`];
  for (const m of pesan.slice(-n)) out.push(barisPesanRuang(m, k));
  if (!pesan.length) out.push('(belum ada pesan)');
  return out.join('\n');
}

function teksCari(k, kata) {
  const q = String(kata || '').trim().toLowerCase();
  if (!q) throw new K.GalatAgen('Isi kata yang dicari.', 'ISIAN');
  const proyek = new Map(k.data.projects.map(p => [p.id, p.name]));
  const cocok = k.data.tasks.filter(t => [t.id, t.title, t.sub, proyek.get(t.project) || '', nama(t.pic)].join(' ').toLowerCase().includes(q));
  if (!cocok.length) return `Tidak ada task yang cocok dengan "${kata}".`;
  const urut = cocok.sort((a, b) => (b.pic === k.me) - (a.pic === k.me) || (I.aktif(b) - I.aktif(a)) || (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0));
  return [`${cocok.length} task cocok${cocok.length > 20 ? ' (20 teratas)' : ''}:`, ...urut.slice(0, 20).map(t => '- ' + K.barisTask(t, k, `PIC ${nama(t.pic)}${proyek.get(t.project) ? ` · ${proyek.get(t.project)}` : ''}`))].join('\n');
}

const profilDari = x => {
  const o = I.ORANG.find(p => p.id === String(x).toLowerCase() || p.pendek.toLowerCase() === String(x).toLowerCase());
  if (!o) throw new K.GalatAgen(`Profil "${x}" tidak dikenal.`, 'ORANG');
  return o.id;
};
const tersimpan = (e, apa) => `${apa} Tersimpan sebagai perubahan data real nomor ${e.seq}${e.ulang ? ' (sudah tersimpan sebelumnya)' : ''}, tampil dengan tanda AI.`;

/* ---------- Daftar alat ---------- */
const teks = { type: 'string' };
const ALAT = [
  {
    name: 'pekerjaan_saya', title: 'Pekerjaan Ali',
    description: 'Daftar pekerjaan Ali di ProductTrack: perlu ditinjau, antrean tim, terlambat, tenggat hari ini dan 7 hari ke depan, sub-task, task yang belum bisa dikerjakan, task yang dikembalikan untuk direvisi, dan pesan yang menunggu jawaban Ali. Mulai dari sini.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    baca: true,
    jalankan: async c => teksPekerjaan(await c.keadaan()),
  },
  {
    name: 'ringkasan_pagi', title: 'Ringkasan pagi',
    description: 'Ringkasan singkat pekerjaan dan pesan untuk Ali hari ini (sama dengan ringkasan pagi di Agent Office).',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    baca: true,
    jalankan: async c => ringkasanPagi(await c.keadaan()).baris.join('\n'),
  },
  {
    name: 'detail_task', title: 'Detail task',
    description: 'Detail satu task: status, PIC, peninjau, tenggat, output, bukti, sub-task (dengan id-nya), syarat ajukan, aksi yang tersedia untuk Ali, riwayat tinjauan, diskusi (dengan id pesan), dan aktivitas terakhir.',
    inputSchema: { type: 'object', properties: { task: { ...teks, description: 'ID task, mis. PRD-123' } }, required: ['task'], additionalProperties: false },
    baca: true,
    jalankan: async (c, a) => teksDetail(await c.keadaan(), a.task),
  },
  {
    name: 'pesan_menunggu', title: 'Pesan menunggu Ali',
    description: 'Pertanyaan yang menunggu jawaban Ali dan sebutan @Ali 14 hari terakhir yang belum dibalas, lengkap dengan ruang dan id pesannya.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    baca: true,
    jalankan: async c => teksPesanMenunggu(await c.keadaan()),
  },
  {
    name: 'baca_ruang', title: 'Baca ruang obrolan',
    description: 'Pesan di satu ruang Komunikasi: task:PRD-123, proyek:PRJ-3, atau tim:SI. Tiap pesan dengan id, pengirim, waktu, balasan, dan pertanyaan.',
    inputSchema: { type: 'object', properties: { ruang: { ...teks, description: 'task:PRD-123, proyek:PRJ-3, atau tim:AK/LA/CO/SI' }, batas: { type: 'integer', minimum: 1, maximum: 100, description: 'jumlah pesan terakhir (bawaan 30)' } }, required: ['ruang'], additionalProperties: false },
    baca: true,
    jalankan: async (c, a) => teksRuang(await c.keadaan(), String(a.ruang || ''), a.batas),
  },
  {
    name: 'cari_task', title: 'Cari task',
    description: 'Cari task menurut ID, judul, sub-stage, nama proyek, atau nama PIC. Task milik Ali dan yang aktif didahulukan.',
    inputSchema: { type: 'object', properties: { kata: { ...teks, description: 'kata yang dicari' } }, required: ['kata'], additionalProperties: false },
    baca: true,
    jalankan: async (c, a) => teksCari(await c.keadaan(), a.kata),
  },
  {
    name: 'kirim_pesan', title: 'Kirim pesan sebagai Ali (AI)',
    description: 'Kirim pesan di ruang Komunikasi atas nama Ali; tampil dengan tanda AI. Perlu persetujuan Ali. Untuk membalas pesan tertentu isi balas_ke dengan id pesannya. tanya = orang yang ditunggu jawabannya (nama pendek), hanya kalau memang perlu jawaban.',
    inputSchema: {
      type: 'object',
      properties: {
        ruang: { ...teks, description: 'task:PRD-123, proyek:PRJ-3, atau tim:SI' },
        teks: { ...teks, description: 'isi pesan, bahasa Indonesia yang singkat dan sopan' },
        balas_ke: { ...teks, description: 'id pesan yang dibalas (opsional)' },
        tanya: { type: 'array', items: teks, description: 'nama pendek orang yang ditunggu jawabannya (opsional)' },
      },
      required: ['ruang', 'teks'], additionalProperties: false,
    },
    jalankan: async (c, a) => {
      const e = await c.kirimPesan({ ruang: String(a.ruang || ''), teks: String(a.teks || ''), balas: a.balas_ke ? String(a.balas_ke) : '', tanya: a.tanya || [] });
      return `Pesan terkirim di ${e.ruang} (id ${e.id}), tampil sebagai ${nama(e.oleh)} dengan tanda AI.`;
    },
  },
  {
    name: 'tandai_beres', title: 'Tandai pertanyaan beres',
    description: 'Tandai pertanyaan untuk Ali sudah terjawab, supaya keluar dari "Perlu jawaban". Pakai sesudah jawabannya terkirim. Perlu persetujuan Ali.',
    inputSchema: { type: 'object', properties: { ruang: teks, pesan: { ...teks, description: 'id pesan pertanyaannya' } }, required: ['ruang', 'pesan'], additionalProperties: false },
    jalankan: async (c, a) => { await c.beres({ ruang: String(a.ruang || ''), pesan: String(a.pesan || '') }); return `Pertanyaan ${a.pesan} ditandai beres.`; },
  },
  {
    name: 'isi_output', title: 'Isi output task',
    description: 'Isi atau ganti output task (ringkasan hasil kerja). Hanya dari fakta yang diberikan Ali atau yang terbaca di berkas hasil kerjanya, jangan mengarang. Perlu persetujuan Ali.',
    inputSchema: { type: 'object', properties: { task: teks, output: { ...teks, description: 'ringkasan hasil kerja' } }, required: ['task', 'output'], additionalProperties: false },
    jalankan: async (c, a) => tersimpan(await c.ubah('isiOutput', { task: String(a.task || '').toUpperCase(), isi: String(a.output || '') }), `Output ${String(a.task).toUpperCase()} diisi.`),
  },
  {
    name: 'tambah_bukti', title: 'Tambah tautan bukti',
    description: 'Tambah tautan bukti (https://…) ke task. Hanya tautan nyata yang diberikan Ali atau tertulis di hasil kerjanya. Perlu persetujuan Ali.',
    inputSchema: { type: 'object', properties: { task: teks, url: { ...teks, description: 'https://…' }, label: { ...teks, description: 'nama tautan (opsional)' } }, required: ['task', 'url'], additionalProperties: false },
    jalankan: async (c, a) => tersimpan(await c.ubah('tambahBukti', { task: String(a.task || '').toUpperCase(), f: { url: String(a.url || ''), label: String(a.label || '') } }), `Bukti ditambahkan ke ${String(a.task).toUpperCase()}.`),
  },
  {
    name: 'tambah_subtask', title: 'Tambah sub-task',
    description: 'Tambah sub-task ke task (PIC bawaannya PIC task). Perlu persetujuan Ali.',
    inputSchema: { type: 'object', properties: { task: teks, judul: teks, pic: { ...teks, description: 'nama pendek PIC sub-task (opsional)' } }, required: ['task', 'judul'], additionalProperties: false },
    jalankan: async (c, a) => tersimpan(await c.ubah('tambahSubtask', { task: String(a.task || '').toUpperCase(), f: { title: String(a.judul || ''), ...(a.pic ? { pic: profilDari(a.pic) } : {}) } }), `Sub-task ditambahkan ke ${String(a.task).toUpperCase()}.`),
  },
  {
    name: 'centang_subtask', title: 'Centang sub-task',
    description: 'Tandai sub-task selesai (selesai: true) atau buka lagi (false). id sub-task dari detail_task. Perlu persetujuan Ali.',
    inputSchema: { type: 'object', properties: { task: teks, subtask: { ...teks, description: 'id sub-task, mis. s1791…-0' }, selesai: { type: 'boolean' } }, required: ['task', 'subtask', 'selesai'], additionalProperties: false },
    jalankan: async (c, a) => tersimpan(await c.ubah('centangSubtask', { task: String(a.task || '').toUpperCase(), sub: String(a.subtask || ''), done: !!a.selesai }), `Sub-task ${a.subtask} ${a.selesai ? 'ditandai selesai' : 'dibuka lagi'}.`),
  },
  {
    name: 'aksi_task', title: 'Aksi status task',
    description: 'Jalankan aksi status yang tersedia untuk Ali (lihat "Aksi untuk Ali" di detail_task): mulai, ajukan, selesai, tarik, tahan, lanjutkan, setujui, kembalikan, buka. kembalikan dan tahan wajib catatan. Jangan menyetujui atau mengembalikan pekerjaan orang lain kecuali Ali memintanya. Perlu persetujuan Ali.',
    inputSchema: {
      type: 'object',
      properties: { task: teks, aksi: { type: 'string', enum: ['mulai', 'ajukan', 'selesai', 'tarik', 'tahan', 'lanjutkan', 'setujui', 'kembalikan', 'buka'] }, catatan: { ...teks, description: 'alasan atau catatan (wajib untuk kembalikan dan tahan)' } },
      required: ['task', 'aksi'], additionalProperties: false,
    },
    jalankan: async (c, a) => {
      const k = await c.keadaan();
      const t = cariTask(k, a.task);
      const ada = I.aksiUntuk(t, k.me, k.perId).find(x => x.kunci === a.aksi);
      if (!ada) throw new K.GalatAgen(`Aksi "${a.aksi}" tidak tersedia untuk ${nama(k.me)} di ${t.id} (status ${t.status}).`, 'ATURAN');
      if (ada.nonaktif) throw new K.GalatAgen(`Aksi "${a.aksi}" belum bisa: ${ada.alasan || 'syaratnya belum terpenuhi'}.`, 'ATURAN');
      if (ada.perluCatatan && !String(a.catatan || '').trim()) throw new K.GalatAgen(`Aksi "${a.aksi}" wajib disertai catatan.`, 'ATURAN');
      const e = await c.ubah('terapkanAksi', { task: t.id, kunci: a.aksi, catatan: String(a.catatan || '') });
      return tersimpan(e, `${t.id}: ${ada.label}.`);
    },
  },
];

/* ---------- JSON-RPC lewat stdio ---------- */
const VERSI_PROTOKOL = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const keluar = pesan => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...pesan }) + '\n');
const balas = (id, result) => keluar({ id, result });
const galat = (id, code, message) => keluar({ id, error: { code, message } });

async function tangani(p) {
  const { id, method, params = {} } = p || {};
  const pertanyaan = id !== undefined && id !== null;
  if (method === 'initialize') {
    return balas(id, {
      protocolVersion: VERSI_PROTOKOL.includes(params.protocolVersion) ? params.protocolVersion : VERSI_PROTOKOL[1],
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'producttrack', title: 'ProductTrack · agen Ali', version: versi },
      instructions: 'Alat ProductTrack v2 atas nama Ali (Lead tim Sistem). Mulai dari pekerjaan_saya atau pesan_menunggu. Alat tulis (kirim_pesan, tandai_beres, isi_output, tambah_bukti, tambah_subtask, centang_subtask, aksi_task) menunggu persetujuan Ali dan tampil di ProductTrack dengan tanda AI.',
    });
  }
  if (typeof method === 'string' && method.startsWith('notifications/')) return;
  if (method === 'ping') return balas(id, {});
  if (method === 'tools/list') return balas(id, { tools: ALAT.map(a => ({ name: a.name, title: a.title, description: a.description, inputSchema: a.inputSchema, annotations: { title: a.title, readOnlyHint: !!a.baca, destructiveHint: false, idempotentHint: !!a.baca, openWorldHint: false } })) });
  if (method === 'tools/call') {
    const alat = ALAT.find(a => a.name === params.name);
    if (!alat) return galat(id, -32602, `Alat tidak dikenal: ${params.name}`);
    try {
      const hasil = await alat.jalankan(dapatKlien(), params.arguments && typeof params.arguments === 'object' ? params.arguments : {});
      return balas(id, { content: [{ type: 'text', text: hasil }] });
    } catch (e) {
      if (!(e instanceof K.GalatAgen)) console.error('[agen-mcp]', e);
      return balas(id, { content: [{ type: 'text', text: `Gagal: ${e.message}` }], isError: true });
    }
  }
  if (pertanyaan) return galat(id, -32601, `Metode tidak dikenal: ${method}`);
}

if (require.main === module) {
  let sisa = '';
  let antre = Promise.resolve();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', potongan => {
    sisa += potongan;
    let i;
    while ((i = sisa.indexOf('\n')) >= 0) {
      const baris = sisa.slice(0, i).trim();
      sisa = sisa.slice(i + 1);
      if (!baris) continue;
      let pesan;
      try { pesan = JSON.parse(baris); } catch (e) { galat(null, -32700, 'JSON tak terbaca.'); continue; }
      antre = antre.then(() => tangani(pesan)).catch(e => console.error('[agen-mcp]', e));
    }
  });
  process.stdin.on('end', () => { antre.then(() => process.exit(0)); });
}

module.exports = { ALAT, tangani, teksPekerjaan, teksDetail, teksPesanMenunggu, teksRuang, teksCari, aturKlien: c => { klien = c; } };
