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
| `tim.js` | pekerjaan Lead: rekap tim, laporan mingguan, antrean + saran PIC, cek kerapian data (tanpa jaringan, tanpa AI) |
| `rekap-tim.js`, `mingguan.js`, `antrean.js`, `cek-data.js` | pekerjaan tanpa token Lead untuk Agent Office |
| `task.js` | pilihan form Tambah task dan butir rekap → task: pemeriksaan dengan aturan Inti, idempotensi, penulisan lewat klien |
| `pilihan-task.js`, `buat-task.js` | pekerjaan tanpa token untuk Agent Office: ambil pilihan form task, simpan task dari rekap |
| `mcp.js`, `.mcp.json` | alat ProductTrack untuk sesi AI (server MCP lewat stdio) |
| `.claude/settings.json` | alat baca langsung jalan; alat tulis selalu minta persetujuan; Bash, Write, dan Edit ditolak |
| `CLAUDE.md` | aturan kerja agen: jujur, tidak mengarang, laporan akhir |
| `agent-office.json` | daftar pekerjaan tanpa token yang dibaca Agent Office |
| `.env` | setelan di komputer ini (salin dari `.env.example`, tidak ikut git) |
| `.data/` | salinan cepat data, jejak pengingat, `pilihan-task.json`, dan `rekap-terkirim.json` (butir yang sudah dibuat); usulan dari Agent Office di `.data/usulan/` (tidak ikut git) |
| `laporan/` | laporan mingguan (HTML & Markdown) dari `mingguan.js` (tidak ikut git) |

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
   - **Rekap tim**: Senin 08.00 (bahan rapat awal pekan).
   - **Laporan mingguan**: Jumat 16.00.
   - **Cek data tim**: Senin 08.15. Tanpa temuan = tanpa notifikasi (`senyap`).
   - **Antrean + saran PIC** cukup dijalankan saat akan membagi pekerjaan. Antrean kosong =
     tanpa notifikasi. Antrean tim hanya ada kalau tim punya staff di ProductTrack (Panel Dev →
     Pengguna).

   Pengingat yang tidak menemukan hal baru tetap tercatat di obrolan, tapi tidak mengirim
   notifikasi (`senyap`).
6. **Pasang PIN profil untuk Ali** (Panel Dev → Master → PIN profil). Tanpa PIN, siapa pun yang
   tahu PIN aplikasi bisa memilih profil Ali. Agen tidak terpengaruh, karena ia masuk dengan
   kuncinya sendiri.

## Memakai

- **Tanpa token**: tombol *Ringkasan pagi* dan *Pengingat*, atau ketik "@Ali ringkasan pagi".
  Untuk Lead: *Rekap tim*, *Laporan mingguan* ("@Ali laporan mingguan minggu lalu"),
  *Antrean & saran PIC*, dan *Cek data tim*. Semuanya hanya membaca; tak ada yang ditulis ke
  ProductTrack.
- **Catat pekerjaan sebagai task** (tanpa token): tombol *Ambil pilihan form task* dan *Simpan task
  dari rekap*. Lihat [Catat pekerjaan harian sebagai task](#catat-pekerjaan-harian-sebagai-task).
- **Dengan AI** (kredit API, kartu *Butuh token*):
  - "@Ali jawab pesan yang menunggu"
  - "@Ali PRD-123 sudah selesai: hasilnya …, buktinya https://…, ajukan tinjauan"
  - "@Ali catat sebagai task: …" (alat `pilihan_task` lalu `buat_task`)

  Setiap tulisan ke ProductTrack muncul dulu sebagai kartu **Izinkan/Tolak** berisi isinya
  (teks pesan, output, tautan, aksi). Kartu itu juga dikirim ke HP.
- **Claude Code langsung** (kuota langganan): buka folder `agen/` ini di Claude Code, setujui
  server MCP `producttrack` saat diminta, lalu beri tugas yang sama.

Perubahan task hanya tersimpan di **data real**. Selama ProductTrack memakai data contoh,
agen tetap bisa membaca dan mengirim pesan.

## Catat pekerjaan harian sebagai task

Untuk rekap kerja harian di Agent Office: usulan task yang sudah diterima Ali ditulis agennya ke
ProductTrack, atas nama Ali dan bertanda **AI**. Tanpa token. Dua skrip Node tanpa dependensi:

```bash
node agen/pilihan-task.js [--keluaran <berkas atau folder>] [--env <berkas>]
node agen/buat-task.js --berkas <usulan.json> [--env <berkas>] [--uji]
```

- **`pilihan-task.js`** hanya membaca ProductTrack dan menulis pilihan form *Tambah task* ke
  `agen/.data/pilihan-task.json` (atau `--keluaran`). Baris `BERKAS: <path>` menyebut berkasnya,
  baris terakhir `HASIL: …` meringkas isinya (jumlah proyek, sub-stage, orang, inisiatif).
- **`buat-task.js`** membaca usulan (skema di bawah), memeriksa tiap butir dengan **aturan yang
  sama dengan form Tambah task** (`Inti.taskBaru` dan aksi statusnya), lalu membuat task. Butir
  yang tidak sah ditolak dengan alasannya tanpa menghentikan butir lain. `--uji` memeriksa saja,
  tanpa menulis apa pun. Baris terakhir `HASIL: N task dibuat, M ditolak` (dengan keterangan
  dalam kurung bila ada yang dilewati atau terputus), atau `GAGAL: …` dengan kode keluar 1.
- **`--env`** menunjuk berkas setelan lain (berisi `PT_ALAMAT` dan `AGEN_KUNCI`) selain
  `agen/.env`. Berkas itu hanya dibaca dan isinya tak pernah dicetak.

**Perlu server ProductTrack 2.37.0 atau lebih baru.** Server sebelumnya menolak agen membuat
task. Sebelum server di-deploy, `buat-task.js` berhenti dengan `GAGAL: Server ProductTrack belum
mendukung …` dan tak ada yang ditulis; `--uji` dan `pilihan-task.js` tetap jalan.

### Skema berkas usulan (`buat-task.js --berkas`)

Berkas JSON, biasanya di `agen/.data/usulan/`:

```json
{
  "tanggal": "2026-10-16",
  "butir": [
    { "id": "ptk-1", "judul": "Perbarui halaman Inisiatif", "jalur": "rutin", "inisiatif": "INI-001",
      "status": "Selesai", "output": "Halaman diperbarui", "bukti": ["a1b2c3d", "public/app.js"] },
    { "id": "prj-1", "judul": "Generator laporan harian", "jalur": "proyek", "proyek": "PRJ-1", "sub": "DV6",
      "pic": "ali", "tenggat": "2026-10-20", "status": "Ditinjau", "deskripsi": "…", "output": "Generator jalan" },
    { "id": "rut-1", "judul": "Rekap data mingguan", "jalur": "rutin", "sub": "R1", "status": "Selesai" }
  ]
}
```

| Kolom | Isi |
|---|---|
| `tanggal` (berkas) | wajib, `YYYY-MM-DD`, tanggal pekerjaannya; tidak boleh belum terjadi. Menjadi tanggal mulai task, tenggat bawaan, dan bagian kunci idempotensi |
| `id` | wajib, teks unik di berkas (paling panjang 80). Bersama `tanggal` menjadi kunci "sudah dibuat" |
| `judul` | wajib, paling panjang 200 karakter |
| `jalur` | wajib: `proyek` atau `rutin`. Pembaruan inisiatif = `rutin` dengan `inisiatif` (nama `inisiatif` juga diterima sebagai jalur dan dibaca sama) |
| `proyek` | id proyek aktif (`PRJ-1`). Wajib untuk jalur proyek; dilarang untuk rutin dan inisiatif. Proyek yang diarsipkan ditolak |
| `inisiatif` | id inisiatif (`INI-001`; nama yang persis juga diterima). Opsional; wajib kalau jalurnya `inisiatif` |
| `sub` | kode sub-stage. Proyek: sub-stage ADDIE aktif, wajib. Rutin: R1–R4 (atau yang aktif di Master), wajib. Inisiatif: R-kode, boleh kosong |
| `pic` | id orang (nama pendek juga diterima). Bawaan: Ali sendiri. Harus sah menurut Inti: anggota tim Ali, atau Lead tim pemilik sub-stage |
| `pendukung` | opsional, daftar id orang (di luar kontrak minimal; form Tambah task belum punya isian ini) |
| `tenggat` | `YYYY-MM-DD`. Kosong = `tanggal` berkas |
| `status` | status awal, tanpa beda huruf. Kosong = `Antre`. Proyek: `Antre`, `Dikerjakan`, `Ditinjau`. Rutin dan inisiatif: `Antre`, `Dikerjakan`, `Selesai` |
| `deskripsi` | opsional, paling panjang 3000 karakter; jadi Keterangan task |
| `output` | opsional, paling panjang 200 karakter; **wajib** untuk status `Ditinjau` |
| `bukti` | opsional, daftar teks (hash commit atau path file), paling banyak 50 butir @ 300 karakter |

Kolom lain diabaikan dengan peringatan di hasilnya.

**Jalur dan status mengikuti Inti, bukan tebakan:**

- **Task baru selalu mulai di Antre**, seperti form. Status lain dicapai dengan aksi yang sama dengan
  tombol di ProductTrack: `Dikerjakan` = mulai; `Ditinjau` = mulai lalu ajukan; `Selesai` = mulai
  lalu selesai. Seluruh urutannya dicoba lebih dulu atas salinan data, jadi butir yang tak bisa
  mencapai statusnya ditolak sebelum ada yang ditulis. Contohnya task proyek yang menunggu fase
  sebelumnya selesai di timnya ("Menunggu fase Design DAE selesai: PRD-12") tak bisa `Dikerjakan`.
  Butir diperiksa berurutan, jadi butir yang sah memengaruhi butir sesudahnya di berkas yang sama.
- **Proyek**: tahap ADDIE mengikuti sub-stage. Task proyek ditinjau sebelum selesai (Ali → Nynda),
  jadi status tertingginya `Ditinjau`; `Selesai` ditolak.
- **Rutin**: tanpa proyek dan tanpa tinjauan, jadi boleh langsung `Selesai`. Kategori task = nama
  sub-stage-nya.
- **Inisiatif** (2.31.0): pembaruan pekerjaan berkelanjutan, berjalur rutin dan tanpa tinjauan, yang
  tertaut ke satu inisiatif. Hanya tanpa proyek; sub-stage boleh kosong (kategori task = nama
  inisiatif) atau R-kode; sub-stage ADDIE ditolak. Khusus tim DAE dan Manager. Inisiatif yang sudah
  selesai ditolak; yang sedang ditunda diterima dengan peringatan (pilihan form hanya menawarkan
  yang aktif). Status seperti rutin.
- **PIC selain Ali** hanya untuk task di `Antre`: agen tidak menaikkan status task milik orang lain.
- **Tanggal pekerjaan** hanya menjadi tanggal mulai dan tenggat bawaan. Waktu dibuat, diajukan, dan
  selesai tercatat saat butir ditulis (server memakai jam saat itu), jadi rekap yang disimpan di
  hari lain tetap terbaca selesai pada hari ia disimpan.
- Tenggat yang sudah lewat untuk task `Antre`/`Dikerjakan` membuatnya langsung terbaca terlambat;
  butirnya tetap dibuat, dengan peringatan.
- Teks yang tampak memuat rahasia (`sk-ant-…`, `password=…`, `token=…`, kunci privat) ditolak
  supaya tak sampai ke ProductTrack yang dilihat seluruh tim.

**Keterangan task** disusun dari `deskripsi`, lalu daftar `Bukti:` (ProductTrack menyimpan bukti
terpisah hanya untuk tautan web; hash commit dan path file ditulis di Keterangan, dan alamat web
di sana otomatis jadi tautan), lalu baris `Dicatat agen AI dari rekap kerja <tanggal>.` Bukti yang
tak muat di 4000 karakter dipotong dan jumlahnya disebut.

**Idempoten.** Butir yang sudah dibuat dicatat di `agen/.data/rekap-terkirim.json` (kunci
`tanggal/id`), jadi jalan ulang melewatinya (`dilewati`). Tiap perintah ke server juga memakai ID
yang diturunkan dari kunci itu, dan server membuang perintah ber-ID sama yang sudah tersimpan: kalau
catatan lokal hilang, atau jalannya terputus di tengah, jalan ulang tetap tak menggandakan task dan
melanjutkan status yang tersisa. Untuk membuat ulang butir yang sama, ganti `id`-nya.

### Hasil: `<berkas>.hasil.json`

Ditulis di sebelah berkas usulan setiap jalan (hasil jalan sebelumnya dibuang lebih dulu, jadi
berkas ini selalu milik jalan terakhir). Folder `.data/usulan` perlu menyaring `*.hasil.json`
(`kecuali` di `agent-office.json`).

```json
{
  "versi": 1, "berkas": "…/usulan-2026-10-16.json", "tanggal": "2026-10-16", "uji": false, "waktu": 1792132492500,
  "ringkas": { "dibuat": 2, "sah": 0, "ditolak": 1, "dilewati": 1 },
  "butir": [
    { "id": "ptk-1", "status": "dibuat", "judul": "…", "jalur": "rutin", "proyek": "", "inisiatif": "INI-001", "sub": "", "pic": "ali", "task": "PRD-045", "statusTask": "Selesai" },
    { "id": "prj-9", "status": "ditolak", "alasan": "Proyek PRJ-9 tidak ditemukan." },
    { "id": "rut-1", "status": "dilewati", "task": "PRD-040", "alasan": "Sudah dibuat sebagai PRD-040 (16 Okt 09.00); tidak dibuat lagi." }
  ]
}
```

`status` per butir: `dibuat` (dengan `task` dan `statusTask`), `ditolak` (dengan `alasan`), `dilewati`
(sudah dibuat sebelumnya, dengan `task`), dan `sah` hanya di mode `--uji` (belum ditulis; `statusTask`
= status yang akan dicapai). `peringatan` (daftar teks) menyertai butir yang dibuat dengan catatan,
mis. status berhenti di Antre karena server menolaknya. `bisaDiulang: true` berarti terputus di tengah
(jaringan atau server); jalankan ulang, task tidak akan digandakan.

### Skema `pilihan-task.json` (`pilihan-task.js`)

Dipakai Agent Office untuk mengisi form usulan, supaya pilihannya selalu sama dengan form Tambah task.

| Kunci | Isi |
|---|---|
| `versi`, `dibuat`, `hari` | versi format (1), waktu dibuat (ISO), tanggal hari ini |
| `mode`, `bisaBuat` | `real` atau `contoh`; `bisaBuat` false bila data contoh (task belum bisa dibuat) |
| `profil` | profil agen: `id` (`ali`), `nama`, `pendek`, `peran`, `jabatan`, `tim` (kode), `timSingkat` (DAE), `timNama` |
| `jalur[]` | tiga cara mengisi form: `proyek`, `rutin`, `inisiatif`. Tiap jalur: `kode`, `label`, `jalurButir` (nilai `jalur` di butir; inisiatif → `rutin`), `tersedia` (+ `alasan` bila tidak), `wajib` dan `opsional` (kolom butir), `subJenis`, `keterangan` |
| `proyek[]` | proyek aktif: `id`, `nama`, `platform`, `tahap`/`namaTahap`, `siklus`, `tim`/`timSingkat` (tim yang punya task terbuka), `timSaya`, `substage` (kode sub-stage proyek yang boleh dipakai, tim Ali di depan) |
| `substage.proyek[]`, `substage.rutin[]` | `kode`, `nama`, `tahap`, `namaTahap`, `tim`, `timSingkat`, `timSaya`, `reviewManager`, `pic` (id orang yang sah sebagai PIC untuk sub-stage itu, Ali di depan) |
| `inisiatif[]` | inisiatif yang belum selesai dan boleh dilihat Ali: `id` (`INI-001`), `nama`, `status` (`aktif`/`ditunda`), `statusLabel`, `tim`, `timSingkat`, `pic`, `bisaDipilih` (hanya `aktif`) |
| `orang[]` | semua orang aktif: `id`, `nama`, `pendek`, `peran`, `jabatan`, `tim`, `bolehPic` (PIC umum bagi Ali) |
| `pic` | `bawaan` (Ali) dan penjelasannya |
| `statusAwal` | `bawaan` (`Antre`), status sah per jalur (`proyek`, `rutin`, `inisiatif`), `keterangan` per status |
| `saranRekap` | pemetaan usulan rekap ke status awal: `selesai` → Ditinjau (proyek) / Selesai (rutin, inisiatif); `berjalan` → Dikerjakan |
| `tenggat` | `format`, `wajib` (false), `bawaan` (`tanggal-rekap`), `keterangan` |
| `batas` | batas panjang isian (judul, deskripsi, output, bukti, pendukung) |
| `aturan` | aturan Inti yang berlaku, dalam kalimat |

### Jalur AI (kartu Izinkan/Tolak)

Sesi AI di folder ini punya dua alat: `pilihan_task` (membaca, jalan tanpa izin) dan `buat_task`
(menulis satu task; menunggu persetujuan Ali, yang melihat semua isiannya di kartu). `buat_task`
memakai pemeriksaan yang sama; pemanggilan ulang dengan isi dan tanggal yang sama tidak membuat task
kedua. Agen tidak mengarang isi task: hanya dari yang Ali sampaikan atau berkas hasil kerjanya.
