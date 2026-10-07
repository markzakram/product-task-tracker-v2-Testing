# ProductTrack v2 — sandbox

ProductTrack v2 (siklus ADDIE) yang dibangun **terpisah penuh** dari v1 yang sedang dipakai tim.
Data tetap di Google Spreadsheet dan deploy tetap di Vercel, tetapi semuanya milik v2 sendiri.

| | v1 (sedang dipakai) | v2 (repo ini) |
|---|---|---|
| Repo | `product-task-tracker` | `product-tracker-v2` |
| Vercel | project v1, produksi dari `master` | project baru, produksi dari `main` |
| Spreadsheet | produksi + staging v1 | spreadsheet baru, khusus v2 |
| Service account | `task-tracker@data-intelligence-500306…` | akun baru, hanya di-share ke sheet v2 |
| GitLab | sudah | nanti, setelah v2 matang |

## Dua pengaman supaya v2 tak pernah menulis ke data v1

1. **Service account v2 hanya di-share ke spreadsheet v2.** Kalau `SPREADSHEET_ID` salah isi
   dengan ID sheet v1, Google menolak dengan 403. Tak ada yang tertulis.
2. **Penanda `_meta`.** v2 hanya mau menulis ke spreadsheet yang punya tab `_meta` berisi
   `app = producttrack-v2`, dan penanda itu hanya mau dipasang di spreadsheet yang benar-benar
   kosong. Sheet v1 (tab `Main`, `OPTIONS`, …) tetap ditolak walaupun akunnya punya akses.
   Aturannya ada di satu tempat: `api/_sheets.js`.

## Alur v2

Satu aplikasi dengan sidebar kiri seperti v1. PIN dipakai bersama, jadi setelah masuk setiap
orang memilih profilnya sendiri. Halaman pertama mengikuti peran: Staff dan Lead mulai di
**Hari Ini**, Manager di **Proyek ADDIE**.

| Grup | Halaman |
|---|---|
| Ringkasan | Hari Ini · Dashboard · Dashboard Lain · Laporan (Lead & Manager) |
| Task | Kanban · Task List · Timeline · Kalender |
| Kolaborasi | Proyek ADDIE · Rancangan Paket · Komunikasi |
| Ruang Saya | Link Saya · Catatan Saya |
| Manajer | Riwayat Aktivitas (Manager) |

Di ponsel sidebar menjadi laci (tombol ☰), ditambah bilah bawah: Hari Ini, Kanban, Proyek,
Komunikasi, Menu.

- **Empat status:** Antre → Dikerjakan → Ditinjau → Selesai. **Tertahan** adalah tanda yang
  disertai alasan, bukan status.
- **Dua jalur:**
  - **Proyek** punya tahap ADDIE. Task-nya ditinjau sebelum selesai: task staff oleh Lead-nya,
    task Lead oleh Manager.
  - **Rutin** adalah pekerjaan di luar proyek. Tanpa tahap, tanpa tinjauan; PIC langsung
    menandai selesai.
- **Gate hanya di level proyek.** Begitu semua task di tahap aktif selesai, proyek masuk antrean
  keputusan Manager: lanjut ke tahap berikutnya, atau tahan. Dari Evaluation, proyek kembali ke
  Analysis dengan siklus baru.
- **Staff** menerima task dari Lead dan boleh memegang task rutin langsung. Staff tidak membuat task.

Semua aturan ini ada di satu berkas, `public/inti.js`, dan diuji di `test/inti.test.js` dan
`test/fitur.test.js`. Tampilan (`public/app.js`) hanya meneruskan klik ke aturan itu.

Halaman pendukung, setara v1:

- **Rancangan Paket**: identitas paket, teks per kategori (Dibimbing, Latsol, Materi, Tryout,
  Drilling, Live Class), target per kategori (sudah ada / target / satuan, status dihitung:
  terpenuhi, kurang, lebih), tautan, dan **Salin ke sheet Marsel** (susunan kolom sheet Master).
  Lead & Manager membuat paket; PIC Produk boleh menyunting paketnya; membagikan ke Lintas
  Divisi hanya Lead/Manager; menghapus hanya Manager.
- **Link Saya** dan **Catatan Saya**: per profil, berfolder (folder kosong = Umum), cari,
  ganti nama/hapus folder (isinya pindah ke Umum). Link Saya mengangkat 6 link yang paling
  sering dibuka di perangkat itu.
- **Dashboard Lain**: kartu tautan dashboard tim; dikelola Manager.
- **Komunikasi**: utas diskusi per task, yang belum dibaca di atas; lencana di sidebar.
- **Laporan**: ringkasan berkala (minggu ini, minggu lalu, bulan ini, 30 hari) per orang, bisa
  disalin sebagai teks untuk chat atau email.
- **Task List** (saring, urutkan, ekspor CSV), **Timeline** (5 minggu), **Kalender** (tenggat
  per hari), **Riwayat Aktivitas** (saring jenis, orang, kata).

## Isi

```
public/index.html     kerangka halaman (layar PIN, pilih profil, aplikasi)
public/app.js         tampilan: sidebar, semua halaman, detail task, formulir
public/app.css        gaya tampilan, warna dari logo ProductTrack
public/inti.js        aturan alur v2, dipakai browser dan tes
public/cek.html       halaman cek: setelan, akun, spreadsheet, kepemilikan, data contoh
api/rpc.js            satu pintu API: masuk, keluar, status, siapkan, muatContoh
api/_sesi.js          gerbang PIN + cookie sesi
api/_sheets.js        Google Sheets + aturan kepemilikan + tulis/baca data contoh
api/_skema.js         bentuk tab spreadsheet v2, baris ↔ objek prototipe
scripts/impor-v1.js   npm run impor:v1 — tarikan v1 → data contoh di spreadsheet v2
scripts/_v1ke2.js     semua aturan pemetaan v1 → v2 (tabel yang bisa diubah)
scripts/dev.js        server lokal yang meniru Vercel (tanpa Vercel CLI)
test/                 npm test — Google Sheets ditiru, tanpa koneksi
```

---

## Menyiapkan (sekali)

### 1. Spreadsheet baru

Buat spreadsheet kosong, misalnya `ProductTrack v2 — SANDBOX`, dan jangan diisi apa pun.
Salin ID-nya dari URL: bagian di antara `/d/` dan `/edit`.

### 2. Service account baru

Di Google Cloud, project `data-intelligence-500306` (Google Sheets API sudah aktif di sana):

1. **IAM & Admin → Service Accounts → Create service account.** Nama: `producttrack-v2`.
2. Buka akun itu → **Keys → Add key → Create new key → JSON.** Simpan berkasnya di luar folder repo.
3. **Share** spreadsheet langkah 1 ke email akun ini sebagai **Editor** (matikan notifikasi).

Jangan share spreadsheet v1 ke akun ini. Itulah pengaman pertama.

### 3. Jalankan di komputer sendiri

```bash
npm install
cp .env.example .env
```

Isi `.env`: `SPREADSHEET_ID`, `GOOGLE_APPLICATION_CREDENTIALS` (jalur berkas kunci, misalnya
`C:/kunci/producttrack-v2.json`), `ACCESS_PIN`, dan `SESSION_SECRET`. Penjelasan tiap baris ada
di `.env.example`.

```bash
npm run dev
```

Buka <http://127.0.0.1:3000/cek>, masukkan PIN, lalu pastikan:

- **Service account** adalah email akun baru, bukan `task-tracker@…`.
- **Kepemilikan** terbaca kosong. Tekan **Siapkan untuk v2**, dan hasilnya jadi "Siap dipakai v2".

### 4. Repo GitHub

Buat repo **private** kosong bernama `product-tracker-v2` (tanpa README atau .gitignore, karena
keduanya sudah ada di sini), lalu:

```bash
git remote add origin https://github.com/administrator425/product-tracker-v2.git
git push -u origin main
```

### 5. Project Vercel baru

**Vercel → Add New → Project → Import `product-tracker-v2`.** Jangan mengubah apa pun di project v1.

- Framework Preset: **Other**. Build dan Output Directory dibiarkan kosong.
- Environment Variables, centang **Production** dan **Preview**:

| Nama | Isi |
|---|---|
| `SPREADSHEET_ID` | ID spreadsheet v2 |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | seluruh isi berkas kunci v2, dalam satu baris |
| `ACCESS_PIN` | PIN v2, jangan disamakan dengan PIN v1 |
| `SESSION_SECRET` | hasil `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

Lalu Deploy. Env hanya berlaku untuk deploy baru, jadi setelah mengubahnya selalu **Redeploy**.

### 6. Pastikan

Buka `https://<project-v2>.vercel.app/cek`. Semua setelan harus ✓, service account harus akun
baru, dan kepemilikan harus "Siap dipakai v2". Setelah impor (bagian berikut), baris
**Data contoh** menunjukkan versi dan sumbernya.

Label **Production** di project ini hanya berarti branch `main` milik v2. Tidak menyentuh v1 sama sekali.

---

## Data contoh dari v1

Aplikasi memakai data v1 sungguhan sebagai data contoh. Datanya **hanya** disimpan di
spreadsheet v2 dan baru dikirim ke browser setelah PIN server benar. Data itu tidak pernah
ditanam di `public/` (URL Vercel bisa dibuka siapa saja) dan tidak pernah masuk git.

### Mengimpor

Sumbernya tarikan v1 di disk, yaitu `db/dump/*.json` di repo v1. Tarikan itu dibuat dengan
`node scripts/migrasi/tarik.js` di repo v1, yang memakai kredensial v1 dan hanya membaca. Skrip
impor v2 tidak memegang kredensial v1, dan service account v2 memang tak punya akses ke sheet v1.

Isi `SPREADSHEET_ID` dan `GOOGLE_APPLICATION_CREDENTIALS` di `.env` (langkah 3), lalu:

```bash
npm run impor:v1 -- --kering
```

Perintah itu hanya memetakan dan menampilkan ringkasan, tanpa menulis apa pun. Kalau hasilnya
masuk akal, jalankan:

```bash
npm run impor:v1
```

Semua tab data contoh ditulis ulang setiap kali perintah ini dijalankan. Penanda `_meta`
mencatat versinya. Browser yang memegang versi lama otomatis memuat versi baru saat dibuka;
selama versinya sama, suntingan di browser itu dibiarkan.

### Pemetaan (semuanya di `scripts/_v1ke2.js`)

| v1 | v2 |
|---|---|
| Task `TSK-099` | task `PRD-099` di **Jalur Rutin** (nomornya tetap). Stage v1 (QC, Operasional, …) jadi kategori |
| Kolaborasi `COL-021` | **proyek** `PRJ-21`. Lead-nya = Lead yang timnya paling banyak memegang prosesnya |
| Kolaborasi yang semua prosesnya tuntas | proyek **arsip** (20 dari 26), supaya tak membanjiri antrean keputusan |
| Proses kolaborasi | task proyek; tiap proses menunggu proses sebelumnya. Tahap ADDIE dari tabel `TAHAP` dan aturan judul `TAHAP_KATA` |
| Ceklis | sub-task (ceklis proses `COL-021#3` ikut ke task prosesnya) |
| Komentar kolaborasi | komentar di task proses pertama |
| Done / In progress / Todo | Selesai / Dikerjakan / Antre |
| Review PM / Revisi | Ditinjau / Dikerjakan (riwayat tinjauan: Diajukan / Dikembalikan) |
| Hold | Antre + tanda **tertahan** |
| `status_by` v1 | riwayat tinjauan (siapa dan kapan), hanya kalau tercatat |
| Rancangan paket | paket utuh: identitas, teks per kategori, target (`package_items`), tautan, tanda dibagikan |
| Dashboard tim | Dashboard Lain. Kata sandi yang tertulis di deskripsinya ("Pass : …") disensor saat impor |
| Link Saya | **tidak dibawa** kecuali `--dengan-link` (lihat di bawah) |
| Riwayat aktivitas | 1000 terbaru |

**Tidak dibawa:** hash PIN, catatan pribadi, notifikasi, dan (bawaannya) Link Saya.

Link Saya di v1 hanya terlihat oleh pemiliknya karena PIN-nya per orang. Di v2 PIN-nya bersama
dan profil dipilih sendiri, jadi siapa pun yang memegang PIN bisa membuka Link Saya orang lain.
Bawa hanya kalau pemilik link-nya setuju:

```bash
npm run impor:v1 -- --dengan-link
```

Untuk mengubah pemetaan, sunting tabelnya, cek dengan `--kering`, lalu impor ulang.

---

## Tes

```bash
npm test
```

Google Sheets ditiru di dalam tes, jadi tak butuh kredensial maupun jaringan. Tes yang paling
penting adalah *sheet v1 ditolak — dan tak satu pun tulisan terjadi*.

## Batasan yang disadari

- **Suntingan belum tersimpan ke spreadsheet.** Data contoh dimuat dari server, tetapi yang
  diubah orang (status, tinjauan, sub-task, komentar, gate proyek, paket, link, catatan)
  tersimpan di browser masing-masing (localStorage). Tombol ↻ di kaki sidebar (**Muat ulang
  data contoh**) mengembalikannya. Karena itu Komunikasi dan Catatan Saya belum terbagi
  antarperangkat.
- **Profil dipilih sendiri** karena PIN dipakai bersama. Siapa pun bisa masuk sebagai Manager.
- **Belum ada penyaringan per peran.** v1 menyaring data di server untuk magang dan Lintas
  Divisi; v2 belum. Siapa pun yang tahu PIN v2 melihat seluruh data contoh, jadi jangan
  bagikan PIN v2 ke magang atau Lintas Divisi.
- Task belum bisa dihapus. Dropdown Master v1 belum ada: pilihan platform & kategori masih tetap
  di kode.
- Setoran target paket dari proses kolaborasi (v1: `package_contribs`) belum ada; "sudah ada"
  diisi tangan.
- Seret-lepas kartu di Kanban hanya di desktop; di ponsel status diubah lewat detail task.
- **Tebakan PIN hanya diperlambat** (jeda ±0,7 detik per PIN salah), belum dibatasi lajunya.
  Pakai PIN yang panjang.
- Gerbang yang belum disetel berarti **tertutup**. Ini berbeda dengan v1, yang terbuka kalau
  semua PIN kosong.

## Langkah berikutnya

1. Simpan suntingan ke spreadsheet: aksi tulis di `/api/rpc` di atas tab yang sudah ada
   (`api/_skema.js`), menggantikan localStorage. Aturan alurnya sudah ada di `public/inti.js`
   dan bisa dipakai juga di server.
2. Login per orang, supaya profil berasal dari login, data bisa disaring per peran, dan Link
   Saya kembali pribadi.
3. Dropdown Master.
4. Setelah matang: pindah ke GitLab (salin isi CI ke `.gitlab-ci.yml`).
