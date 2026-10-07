# ProductTrack v2 — sandbox

Prototipe v2 (siklus ADDIE) yang dibangun **terpisah penuh** dari v1 yang sedang dipakai tim.
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

## Isi

```
public/index.html     prototipe v3.0; dengan server: PIN server + data contoh dari spreadsheet
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

Prototipe memakai data v1 sungguhan sebagai data contoh. Datanya **hanya** disimpan di
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
| Task `TSK-099` | task `PRD-099` (nomornya tetap) |
| Kolaborasi `COL-021` | proyek `PRJ-21` |
| Proses kolaborasi | task di proyek itu; tiap proses menunggu proses sebelumnya (dependency) |
| Ceklis | sub-task (ceklis proses `COL-021#3` ikut ke task prosesnya) |
| Komentar kolaborasi | komentar di task proses pertama |
| Stage v1 (QC, RnD, …) | tahap ADDIE + sub-stage, lewat tabel `TAHAP` dan aturan judul `TAHAP_KATA` |
| Status Done | Done + gate Lolos (task LCI: Published) |
| Review PM / Revisi | Review + gate Diajukan / Revision + gate Ditolak |
| `status_by` v1 | log gate (siapa dan kapan), hanya kalau tercatat |
| Kesulitan Normal | priority Medium |
| Paket & dashboard tim | Rancangan Paket & satu folder Bookmark |
| Riwayat aktivitas | 1000 terbaru (batas riwayat prototipe) |

**Tidak dibawa:** hash PIN, catatan dan tautan pribadi, notifikasi, serta rincian target paket.

Untuk mengubah pemetaan, sunting tabelnya, cek dengan `--kering`, lalu impor ulang.

---

## Tes

```bash
npm test
```

Google Sheets ditiru di dalam tes, jadi tak butuh kredensial maupun jaringan. Tes yang paling
penting adalah *sheet v1 ditolak — dan tak satu pun tulisan terjadi*.

## Batasan yang disadari

- **Suntingan belum tersimpan ke spreadsheet.** Prototipe memuat data contoh dari server,
  tetapi yang diubah orang tetap tersimpan di browser masing-masing (localStorage).
- **Belum ada penyaringan per peran.** v1 menyaring data di server untuk magang dan Lintas
  Divisi; v2 belum. Siapa pun yang tahu PIN v2 melihat seluruh data contoh, jadi jangan
  bagikan PIN v2 ke magang atau Lintas Divisi. Profil (Manager/Lead/Staff) di prototipe juga
  masih simulasi yang dipilih sendiri.
- Dengan ±1000 task, tampilan Tabel dan Kanban butuh ±0,5 detik untuk digambar.
- **Tebakan PIN hanya diperlambat** (jeda ±0,7 detik per PIN salah), belum dibatasi lajunya.
  Pakai PIN yang panjang.
- Prototipe memuat Tailwind dari `cdn.tailwindcss.com`, yang memang bukan untuk produksi.
- Gerbang yang belum disetel berarti **tertutup**. Ini berbeda dengan v1, yang terbuka kalau
  semua PIN kosong.

## Langkah berikutnya

1. Simpan suntingan ke spreadsheet: aksi tulis di `/api/rpc` di atas tab yang sudah ada
   (`api/_skema.js`), menggantikan localStorage.
2. Login per orang, supaya profil berasal dari login dan data bisa disaring per peran.
3. Setelah matang: pindah ke GitLab (salin isi CI ke `.gitlab-ci.yml`).
