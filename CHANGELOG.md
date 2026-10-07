# Changelog — ProductTrack v2

## Belum dirilis

- Elaborasi bisa mengerjakan sebagian target: jumlah per target diisi sendiri (mis. target 10,
  proyek ini 5). Sisanya tetap terbuka dan bisa dielaborasi lagi oleh proyek berikutnya.
  Jumlah yang melebihi sisa ditolak; jumlah 0 berarti target itu tidak ikut.

## 0.5.0 — Rancangan paket → proyek, progres yang bergerak sendiri (2026-10-07)

- **Elaborasi jadi proyek** di Rancangan Paket (Lead/Manager): setiap target yang masih terbuka
  menjadi satu task proyek, bawaannya di tahap Development, lengkap dengan **setoran**-nya.
- Progres paket dihitung dari setoran: terpenuhi = sudah ada + setoran dari task yang Selesai
  (sudah disetujui peninjau); setoran task yang masih berjalan tampil sebagai **digarap**. Task
  yang dibuka kembali otomatis mengurangi angkanya lagi. Tabel target menampilkan task
  penyetornya; batang progres dua warna (terpenuhi / digarap).
- Detail task: bagian **Setoran ke rancangan paket** (lihat, tambah, hapus). Pesan setelah
  menyetujui menyebut apa yang masuk ke paket.
- Halaman proyek: kartu **Rancangan paket** dengan progresnya; Manager bisa menautkan proyek
  lama ke paket. Halaman paket: daftar **Proyek pengisi**.
- Menu **Proyek ADDIE** berganti nama menjadi **Proyek**. Tahap ADDIE di dalam proyek tetap.
- Impor v1 membawa tautan kolaborasi → paket (`paket_id`) dan setoran (`package_contribs`).
- `npm run impor:v1 -- --demo`: skenario contoh di atas data v1 (TKA_CEREBRUM campuran, OJK
  tuntas dan siap maju tahap, UTBK siap dielaborasi), dibangun dengan aturan aplikasi.
- Bentuk tab hanya bertambah: kolom `paket` di `projects`, tab `setoran`. Spreadsheet yang
  belum punya tab `setoran` tetap terbaca (setorannya kosong).

## 0.4.0 — Sidebar seperti v1 + halaman yang belum ada (2026-10-07)

- Menu pindah dari bilah atas ke **sidebar kiri**, dikelompokkan seperti v1: Ringkasan (Hari Ini,
  Dashboard, Dashboard Lain, Laporan), Task (Kanban, Task List, Timeline, Kalender), Kolaborasi
  (Proyek ADDIE, Rancangan Paket, Komunikasi), Ruang Saya (Link Saya, Catatan Saya), Manajer
  (Riwayat Aktivitas). Profil, muat ulang, dan keluar ada di kaki sidebar. Di ponsel sidebar
  menjadi laci, plus bilah bawah.
- Halaman baru: **Rancangan Paket** (lihat, sunting, target per kategori, salin ke sheet Marsel),
  **Link Saya**, **Catatan Saya**, **Dashboard Lain**, **Komunikasi** (utas per task dengan tanda
  belum dibaca), **Laporan** berkala per orang, **Task List**, **Timeline**, **Kalender**,
  **Riwayat Aktivitas**.
- Halaman "Papan" kini bernama **Kanban**; angka-angka "Laporan" lama kini **Dashboard** (bisa per
  saya / tim / divisi). Halaman yang tersimpan di browser ikut dipindahkan.
- Bentuk tab spreadsheet: `packages` membawa paket v1 utuh, ditambah `package_items`,
  `package_links`, `dashboards`, `links`, `notes`. Tab `bookmarks` dihapus saat impor ulang.
  **Perlu `npm run impor:v1` lagi**; versi sebelumnya tak bisa membaca bentuk baru ini.
- Impor v1: kata sandi yang tertulis di deskripsi dashboard v1 disensor. Link Saya v1 tidak
  dibawa kecuali dengan `--dengan-link`, karena di v2 PIN-nya bersama.
- Layar PIN: kalau PIN benar tetapi data gagal dimuat, isian PIN tidak muncul lagi. Yang tampil
  "PIN diterima, tetapi data gagal dimuat" beserta alasannya dan tombol **Coba lagi**.
  Sebelumnya galat itu tampil di atas isian PIN, sehingga terbaca seperti PIN ditolak.

## 0.3.0 — Tampilan & alur baru (2026-10-07)

- Prototipe lama diganti aplikasi baru dengan menu **Hari Ini · Papan · Proyek · Laporan**, sesuai
  mockup yang dipilih. Halaman pertama mengikuti peran profil: Staff dan Lead mulai di Hari Ini
  (Lead ditambah ringkasan tim), Manager di Proyek.
- PIN tetap satu dan dipakai bersama; setelah masuk, orang memilih profilnya sendiri.
- Alur v2 di `public/inti.js`:
  - empat status (Antre, Dikerjakan, Ditinjau, Selesai), dengan tertahan sebagai tanda beralasan;
  - Jalur Proyek (tahap ADDIE, ditinjau Lead/Manager) dan Jalur Rutin (tanpa tahap dan tinjauan);
  - gate hanya di level proyek, diputuskan Manager.
- Data v1 dipetakan ulang ke alur itu: task lepas v1 masuk Jalur Rutin, kolaborasi menjadi proyek
  ber-Lead, kolaborasi tuntas diarsipkan, dan Hold menjadi tanda tertahan.
- Bentuk tab spreadsheet berubah: `tinjauan` menggantikan `gate_log`, dan `backlog` dihapus.
  Impor ulang membersihkan tab lama.
- Papan: per status atau per orang (dengan beban kerja), saringan perhatian, dan seret-lepas kartu
  yang memakai aturan yang sama dengan tombol.
- Laporan: angka utama, selesai per minggu, per orang, per platform, pencarian arsip, ekspor CSV.

## 0.2.0 — Data contoh dari v1 (2026-10-07)

- `npm run impor:v1` memetakan tarikan v1 (`db/dump/*.json` di repo v1) ke model ADDIE, lalu
  menulisnya ke spreadsheet v2. Tarikan 2 Oktober menghasilkan 975 task (602 task v1 + 373 proses
  kolaborasi), 26 proyek, 915 sub-task, 422 komentar, 11 paket, dan 1000 aktivitas terbaru.
- Bentuk tab spreadsheet v2 ditetapkan di `api/_skema.js`, satu tab per koleksi. Tab dibaca lewat
  judul kolomnya, jadi kolom yang digeser di spreadsheet tidak membuat isinya tertukar.
- Prototipe mengenali server: layar kuncinya memakai PIN server, lalu data contoh dimuat lewat
  aksi `muatContoh`. Tanpa server, perilakunya tetap seperti sebelumnya.
- Data contoh hanya dikirim setelah PIN benar. Data itu tak pernah ditanam di halaman publik dan
  tak pernah masuk git. Hash PIN, catatan dan tautan pribadi, serta notifikasi v1 tidak dibawa.
- `/cek` menampilkan versi dan sumber data contoh.

## 0.1.0 — Kerangka sandbox (2026-10-07)

- Prototipe v3.0 masuk apa adanya sebagai `public/index.html`, sebagai titik awal yang bisa dibandingkan.
- `/api/rpc` dengan gerbang PIN. PIN dikirim sekali; setelah itu sesi dibawa cookie HttpOnly
  bertanda tangan. Gerbang yang belum disetel berarti tertutup.
- Penanda kepemilikan `_meta`. v2 hanya menulis ke spreadsheet miliknya sendiri, dan hanya mau
  menyiapkan spreadsheet yang kosong. Pemasangannya atomik (satu `batchUpdate`).
- Halaman `/cek` untuk memeriksa setelan, akun, dan spreadsheet dari browser.
- `npm run dev` meniru Vercel tanpa Vercel CLI. `npm test` berjalan tanpa koneksi ke Google.
- CI GitHub Actions: tes, plus penjaga yang gagal kalau ada kunci privat ter-commit.
