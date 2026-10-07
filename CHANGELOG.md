# Changelog — ProductTrack v2

## 0.6.0 — Selaras PRD v3: sub-stage, syarat ajukan, alur per jenis, tahap dihitung (2026-10-07)

Mengikuti PRD v3 dari Manager, dengan satu penyederhanaan: tetap empat status.

- **Sub-stage** di setiap task: A1–A6, D1–D7, DV1–DV9, I1–I8, E1–E12 untuk task proyek, R1–R4
  untuk rutin. Kode menentukan tahap task dan **tim pemiliknya** (MG, AK, LA, CO, SI). Task
  proyek wajib berkode ADDIE; task baru di luar proyek berkode R. A1, A6, D1, I8, dan E12
  direview Manager.
- **Delegasi lewat tim pemilik.** Lead boleh memberi task ke Lead tim pemilik sub-stage-nya.
  Langkah yang siap masuk grup baru **Antrean tim · siap didelegasikan** di Hari Ini Lead itu,
  dan detail task punya tombol **Serahkan ke staff**.
- **Syarat ajukan** untuk task proyek: output terisi, minimal satu tautan bukti, sub-task
  beres, task yang ditunggu selesai, tidak tertahan. Daftar periksanya ada di detail task, dan
  output serta tautan bukti kini diisi langsung di sana, oleh PIC staff juga.
- **Label keadaan** dihitung dari status: Siap, Menunggu, Revisi (sesudah dikembalikan), Tertahan.
- **Tahap proyek dihitung** dari task terbuka paling awal di siklus aktif, dan pindah sendiri.
  Riwayat tahap mencatat siapa pemicunya. Tombol "Lanjut ke tahap …" dihapus. **Siklus ditutup**
  oleh task E12 · Final approval yang disetujui. Sesudah itu Manager memilih: mulai siklus
  berikutnya, arsipkan, atau tahan. Keputusan proyek bisa dipilih: Build, Improve, Maintain, Hold.
- **Proyek tanpa Lead tetap**: daftar dan halaman proyek menampilkan tim pemegang task terbuka.
  Isian Lead dihapus dari form proyek dan elaborasi.
- **Elaborasi per alur jenis**: setiap target menjadi batch langkah sesuai PRD (mis. Latsol: DV1 →
  E1 → DV8 → I1 → E4 → E5 → E6 → I4), tiap langkah diserahkan ke Lead tim pemiliknya dan
  menunggu langkah sebelumnya. Langkah bisa dicoret. Proyek tujuan boleh yang sudah ada. Mode
  satu task per target tetap tersedia.
- Elaborasi bisa mengerjakan **sebagian target**: jumlah per target diisi sendiri (mis. target
  10, proyek ini 5). Sisanya tetap terbuka untuk elaborasi berikutnya. Jumlah yang melebihi sisa
  ditolak; jumlah 0 berarti target itu tidak ikut.
- **Progres paket berbobot**: konten siap 40%, ter-input 60%, lolos QC 85%, tayang 100% (usulan
  PRD, menunggu keputusan Manager). Batang progres tiga lapis (tayang, sebagian jalan, digarap),
  kolom Progres beserta corong capaian, dan satu chip per batch. Langkah tanpa capaian sendiri
  menunjukkan di langkah mana progres batch-nya naik.
- **Rumpun platform** sebagai saringan dan angka Dashboard. Kanban dan Task List bisa disaring
  per tahap, sub-stage, tim, dan rumpun; ekspor CSV ikut sub-stage, tim, rumpun, dan keadaan.
- **Dashboard**: task aktif per tahap (A, D, V, I, E, rutin), per tim pemilik, dan per rumpun;
  per orang ditambah sub-task terbuka, menahan, tinjauan, dan **skor bottleneck**.
- Form task memilih sub-stage (dikelompokkan per tahap). Pilihan PIC menyesuaikan: tim sendiri,
  ditambah Lead tim pemilik. Form Ubah bisa mengganti sub-stage; perubahannya diperiksa aturan
  yang sama (`ubahTask`).
- Pencarian ikut mencocokkan kode sub-stage.
- **Impor v1**: task dipetakan ke sub-stage dari judulnya (cadangannya stage v1), QC masuk
  Evaluation (E1–E7). Di luar proyek, kode R1–R4 jadi rutin dan kode ADDIE jadi pekerjaan
  "lepas". Kolaborasi menjadi proyek tanpa Lead; tahapnya dihitung.
- `--demo` dibangun ulang dengan alur PRD: TKA dengan 11 batch di capaian berbeda, OJK satu
  siklus penuh ditutup E12, UTBK siap dielaborasi.
- Bentuk tab hanya bertambah: kolom `tahap` dan `batch` di tab `setoran`. Spreadsheet tanpa
  kolom itu tetap terbaca (setoran lama dihitung "tayang").

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
