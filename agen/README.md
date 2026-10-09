# Agen AI Ali

Folder ini menjadikan profil **Ali** di ProductTrack v2 sebagai agen AI yang dijalankan dari
Agent Office (`G:\Ali\code\Agent AI`). Agen bekerja atas nama Ali dengan batasan Ali sendiri.
Semua yang ditulisnya tampil di ProductTrack dengan tanda **AI**. Cara kerjanya di server ada
di README utama, bagian *Agen AI Ali*.

| Berkas | Isi |
|---|---|
| `klien.js` | masuk dengan kunci agen, menyusun data real seperti browser, menulis lewat `simpanReal` dan `kirimObrolan` |
| `laporan.js` | isi ringkasan pagi dan pengingat (tanpa jaringan, tanpa AI) |
| `ringkasan.js`, `pengingat.js` | pekerjaan tanpa token untuk Agent Office |
| `mcp.js`, `.mcp.json` | alat ProductTrack untuk sesi AI (server MCP lewat stdio) |
| `.claude/settings.json` | alat baca langsung jalan; alat tulis selalu minta persetujuan; Bash, Write, dan Edit ditolak |
| `CLAUDE.md` | aturan kerja agen: jujur, tidak mengarang, laporan akhir |
| `agent-office.json` | daftar pekerjaan tanpa token yang dibaca Agent Office |
| `.env` | setelan di komputer ini (salin dari `.env.example`, tidak ikut git) |
| `.data/` | salinan cepat data dan jejak pengingat (tidak ikut git) |

## Menyiapkan

1. **Buat kunci agen**, cukup sekali:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Isi kunci itu di server ProductTrack** sebagai env `AGEN_KUNCI`:
   - Cloud Run: lewat tim IT (Edit & Deploy New Revision → Variables);
   - komputer sendiri: `.env` di akar repo.

   `AGEN_PROFIL` boleh dikosongkan; bawaannya `ali`. Panel Dev → Sistem → *Agen AI* harus
   menunjukkan "aktif · masuk sebagai Ali".
3. **Salin `agen/.env.example` menjadi `agen/.env`**, lalu isi `PT_ALAMAT` (alamat
   ProductTrack) dan `AGEN_KUNCI` (sama persis dengan di server).
4. **Coba dari terminal**:

   ```bash
   node agen/ringkasan.js
   ```

   Lalu `node agen/pengingat.js`. Kalau ada yang belum benar, baris `GAGAL:` menjelaskannya.
5. **Agent Office** → **Tim**: karyawan operator **Ali** memegang folder
   `G:\Ali\code\product-tracker-v2\agen`. Jadwal yang disarankan:
   - **Ringkasan pagi**: Senin–Jumat 07.30.
   - **Pengingat**: Senin–Jumat 10.00, 13.30, dan 16.00.

   Pengingat yang tidak menemukan hal baru tetap tercatat di obrolan, tapi tidak mengirim
   notifikasi (`senyap`).
6. **Pasang PIN profil untuk Ali** (Panel Dev → Master → PIN profil). Tanpa PIN, siapa pun yang
   tahu PIN aplikasi bisa memilih profil Ali. Agen tidak terpengaruh, karena ia masuk dengan
   kuncinya sendiri.

## Memakai

- **Tanpa token**: tombol *Ringkasan pagi* dan *Pengingat*, atau ketik "@Ali ringkasan pagi".
- **Dengan AI** (kredit API, kartu *Butuh token*):
  - "@Ali jawab pesan yang menunggu"
  - "@Ali PRD-123 sudah selesai: hasilnya …, buktinya https://…, ajukan tinjauan"

  Setiap tulisan ke ProductTrack muncul dulu sebagai kartu **Izinkan/Tolak** berisi isinya
  (teks pesan, output, tautan, aksi). Kartu itu juga dikirim ke HP.
- **Claude Code langsung** (kuota langganan): buka folder `agen/` ini di Claude Code, setujui
  server MCP `producttrack` saat diminta, lalu beri tugas yang sama.

Perubahan task hanya tersimpan di **data real**. Selama ProductTrack memakai data contoh,
agen tetap bisa membaca dan mengirim pesan.
