# ProductTrack v2 — sandbox

ProductTrack v2 (siklus ADDIE) yang dibangun **terpisah penuh** dari v1 yang sedang dipakai tim.
Data tetap di Google Spreadsheet khusus v2. Sejak 0.15.2 repo ini juga menjadi isi repo GitLab
`produk-cerebrum/product-task-tracker` dan jalan di Cloud Run, di domain yang semula disiapkan
untuk v1 dan belum dipakai tim (lihat *Deploy ke Cloud Run*). v1 tetap di Vercel dengan
Spreadsheet sampai digantikan.

Sejak **2.16.0** aplikasi bisa dipakai untuk pekerjaan sungguhan. Selain data contoh ada **data
real**, yang mulai kosong dan tersimpan bersama di spreadsheet v2. Mode Dev memilih sumbernya
untuk semua pengguna (lihat *Sumber data: contoh dan real*). Sejak versi itu nomornya juga
berawal 2, lanjutan dari 0.15.2, supaya terbaca sebagai v2 di samping v1 (v1.121.0).

| | v1 (sedang dipakai) | v2 (repo ini) |
|---|---|---|
| Repo | GitHub `product-task-tracker` | GitLab `produk-cerebrum/product-task-tracker` (riwayat v1 tetap tersimpan di sana) |
| Deploy | Vercel, produksi dari `master` | Cloud Run `product-task-tracker-service` → `product-task-tracker.cerehub.id`, rilis lewat tag git; sandbox Vercel (GitHub `product-task-tracker-v2-Testing`) tetap ada untuk demo |
| Spreadsheet | produksi + staging v1 | spreadsheet baru, khusus v2 |
| Service account | `task-tracker@data-intelligence-500306…` | akun baru, hanya di-share ke sheet v2 |

## Dua pengaman supaya v2 tak pernah menulis ke data v1

1. **Service account v2 hanya di-share ke spreadsheet v2.** Kalau `SPREADSHEET_ID` salah isi
   dengan ID sheet v1, Google menolak dengan 403. Tak ada yang tertulis.
2. **Penanda `_meta`.** v2 hanya mau menulis ke spreadsheet yang punya tab `_meta` berisi
   `app = producttrack-v2`, dan penanda itu hanya mau dipasang di spreadsheet yang benar-benar
   kosong. Sheet v1 (tab `Main`, `OPTIONS`, …) tetap ditolak walaupun akunnya punya akses.
   Aturannya ada di satu tempat: `api/_sheets.js`.

## Alur v2

Satu aplikasi dengan sidebar kiri seperti v1. PIN aplikasi dipakai bersama, jadi setelah masuk
setiap orang memilih profilnya sendiri; sejak 0.14.0 profil bisa dikunci dengan **PIN pribadi**
(lihat *Master & PIN profil*). Halaman pertama mengikuti peran: Staff dan Lead mulai di
**Hari Ini**, Manager di **Proyek**.

| Grup | Halaman |
|---|---|
| Ringkasan | Hari Ini · Dashboard · Laporan (bawaan: Lead & Manager) |
| Pekerjaan | Rancangan Paket · Proyek (ADDIE per tim) · Pengembangan (DAE & Manager) · Task · Komunikasi |
| Ruang Saya | Kalender Saya · Link Saya (termasuk Tautan tim) · Catatan Saya |
| Manajer | Riwayat Aktivitas (bawaan: Manager) · Master (bawaan: Lead & Manager) |
| Bantuan | Panduan |

Siapa yang melihat Laporan, Riwayat Aktivitas, dan Master, serta tombol-tombol yang dijaga
peran, sejak 2.29.0 diatur mode Dev di **Panel Dev → Izin** (lihat *Izin per peran*); yang
tertulis di README ini adalah bawaannya.

Urutan Pekerjaan mengikuti alurnya: paket dirancang, dielaborasi jadi proyek, lalu proyek
berisi task. Di ponsel sidebar menjadi laci (tombol ☰), ditambah bilah bawah: Hari Ini, Task,
Proyek, Komunikasi, Menu. Bilah atas berisi **pencarian cepat** (Ctrl+K) dan **lonceng
notifikasi**; keduanya dijelaskan di bagian *Alamat, pencarian cepat, dan notifikasi*.

Sejak 0.6.0 alurnya mengikuti PRD v3 dari Manager (*ProductTrack v3 Product Operations System*),
dengan satu penyederhanaan: tetap empat status.

- **Empat status:** Antre → Dikerjakan → Ditinjau → Selesai. Keadaan lain di PRD tidak jadi
  status sendiri; ia dihitung dan tampil sebagai label: **Siap** (yang ditunggunya sudah
  selesai), **Menunggu** (yang ditunggunya belum selesai), **Revisi** (dikembalikan peninjau),
  dan **Tertahan** (tanda yang disertai alasan).
- **Sub-stage.** Setiap task berkode: A1–A6, D1–D7, DV1–DV9, I1–I8, E1–E12 di dalam proyek;
  R1–R4 untuk pekerjaan rutin. Kode menentukan fase task dan **tim pemiliknya**: **DAE** Data &
  AI Engineer, **RAD** Research, Academic & Development, **LNA** Learning & Architecture,
  **CLO** Content & Learning Operation, dan **MG** Manager. Sejak 2.19.0 tim tampil dengan
  singkatan itu; kode lamanya (SI, AK, LA, CO) tetap dipakai di data, jadi tak ada yang perlu
  dipindah. A1, A6, D1, I8, dan E12 selalu direview Manager. Itu daftar bawaan PRD; sejak 0.14.0
  Manager mengaturnya di halaman **Master** (termasuk nama dan singkatan tim), dan form task tak
  lagi memilihkan sub-stage: harus dipilih sendiri.
- **Task turunan (0.15.0).** Lead memberi task ke timnya sendiri, atau ke Lead tim pemilik
  sub-stage-nya (mis. Andika memberi DV8 Input ke Alya). Langkah yang sudah bisa dimulai masuk
  **Antrean tim** di Hari Ini Lead itu (sejak 2.33.0 bertanda **Siap dibagi** di Kerjakan
  sekarang), dan ia membaginya dengan
  membuat **task turunan** untuk staff timnya, dari bagian Task turunan di detail task atau dari
  kolom **Task induk** di form Tambah task. Task turunan ada di
  proyek, siklus, dan tahap yang sama dengan induknya, tampil menjorok di bawahnya di halaman
  proyek dan di Task, ditinjau Lead itu (juga di sub-stage bertanda Manager), dan tak beranak lagi.
  Induknya baru bisa diajukan atau ditandai selesai setelah semua task turunannya selesai; induk
  yang masih antre ikut mulai begitu dibagi. Sejak 2.38.1, PIC induk juga bisa diganti ke Lead
  atau staff aktif dalam tim yang sama lewat **Ubah task**; PIC masing-masing turunan tetap.
  Sejak 2.21.0 namanya **task turunan** (dulu "task anak"; nama fungsi dan kolom `induk` di data
  tetap). Sejak 2.25.0 bagian Task turunan ada di detail semua task proyek (semua tahap ADDIE),
  dan **Lead tim pemilik task** juga membaginya walau PIC-nya staff timnya (mis. task Design yang
  langsung diberikan ke staff); kalau belum bisa dibagi, alasannya tampil di sana (sudah selesai,
  sedang ditinjau, atau siapa Lead yang membaginya).
  PIC-nya boleh **Lead itu sendiri**: turunan yang ia pegang tak ditinjau lagi dan langsung
  ditandai selesai, karena induknya tetap mengikuti aturan tinjauan PIC-nya. Lead tanpa staff
  pun bisa memecah task-nya.
- **ADDIE per tim (2.19.0, keputusan user 13 Okt 2026).** Halaman proyek dibagi per tim: tab
  **DAE · RAD · LNA · CLO** ditambah **Ringkasan**, dan tiap tim menjalankan ADDIE-nya sendiri.
  Sebuah task proyek menunggu (`Inti.ditunggu`):
  - **fase** — task tim yang sama di fase lebih awal, di siklus yang sama (bawaan; bisa
    dimatikan per task). Yang sefase dalam satu tim dikerjakan bersamaan.
  - **atur** — task yang dipilih Lead timnya lewat **Atur urutan tunggu** (`t.tunggu`), boleh
    dari tim lain: serah-terima, mis. input LNA menunggu soal dari RAD.
  - **gerbang** — task Manager di Analysis (A1 intake, A6 target): fase Design dan sesudahnya di
    semua tim menunggunya.
  - **tutup** — **E12** menunggu semua task lain di siklusnya, supaya siklus tak tertutup
    selagi masih ada pekerjaan.

  **Urutan ADDIE fleksibel (2.43.0, permintaan user: "ketika statusnya masih di A, V tetap bisa
  dikerjakan").** Sejak versi ini **fase** dan **gerbang** hanya *pengingat* di semua proyek:
  tetap tercatat di `Inti.ditunggu` (bertanda `saran: true`), tetapi tak menahan task untuk
  dimulai atau diajukan. **atur** dan **tutup** tetap menahan. Pengingatnya (`Inti.pengingatFase`)
  tampil di kartu **Langkah berikutnya** ("Boleh dimulai sekarang, mendahului urutan ADDIE: A2
  belum selesai") dan di bagian **Menunggu** tab Riwayat ("pengingat urutan ADDIE, tak
  menahan"); label Menunggu, notifikasi "siap", dan hitungan yang menahan tak menghitungnya.
  Lead atau Manager (izin `proyek.urutan`) bisa memilih **Ketatkan urutan ADDIE** di menu ⋯
  proyek: proyek itu (`p.ketat`, kolom `ketat` di tab projects dan `v2_projects`) kembali memakai
  fase dan gerbang sebagai penahan, seperti sebelum 2.43.0. **Longgarkan urutan ADDIE**
  mengembalikannya; keduanya tercatat di Riwayat Aktivitas, dan keadaannya tertulis di kepala
  proyek ("Urutan ADDIE fleksibel/ketat"). Duplikat proyek ikut menyalin pengaturan ini. Skenario
  contoh tetap mengerjakan langkah-langkahnya menurut urutan ADDIE, supaya riwayatnya wajar.

  **Yang sudah diajukan tak lagi menahan (2.30.0, permintaan user).** Task yang ditunggu
  dianggap cukup begitu PIC-nya mengajukannya (status Ditinjau), bukan baru saat disetujui:
  langkah berikutnya, di tim sendiri maupun tim lain, bisa mulai sejajar selagi Lead atau Manager
  meninjau. PIC task berikutnya diberi tahu saat itu juga. Kalau peninjau mengembalikannya, task
  berikutnya yang sudah berjalan tetap berjalan tetapi terbaca terhambat lagi. Pengecualiannya
  **E12**: tetap menunggu semua task lain benar-benar disetujui. Di detail task, bagian
  **Menunggu** menandai yang sedang ditinjau ("diajukan, sedang ditinjau …"). Aturannya
  `Inti.masihMenahan` dan `Inti.tungguBelum`.

  **Yang ditandai tertahan juga tak menahan (2.34.2, permintaan user).** Sistemnya sama dengan
  yang sedang ditinjau: begitu task yang ditunggu ditandai tertahan, langkah berikutnya boleh
  mulai dan diajukan, dan PIC-nya diberi tahu saat itu (waktunya dibaca dari Riwayat
  Aktivitas). Task yang tertahan sendiri tetap tak bisa dimulai atau diajukan sampai tandanya
  dilepas; begitu dilepas sebelum diajukan, langkah berikutnya yang sudah berjalan tetap
  berjalan tetapi terbaca terhambat lagi. **E12** tetap menunggu semua task disetujui. Bagian
  **Menunggu** menandainya "tertahan, tak menahan task ini".

  **Yang sudah diajukan sudah dikumpulkan (2.30.0, permintaan user).** Task berstatus Ditinjau
  tak dihitung telat lagi (Hari Ini, Dashboard, Laporan, kanban, timeline, kalender, dan agen),
  walau tinjauannya lewat tenggat; kalau dikembalikan, ia terbaca telat lagi. Di Laporan, **tepat
  waktu** dinilai dari saat diajukan terakhir sebelum disetujui, bukan saat disetujui
  (`Inti.telat`, `Inti.waktuKumpul`).

  Tim yang berbeda tak saling menunggu di luar itu. Task turunan mengikuti induknya, dan task rutin
  tetap menunggu task di `deps`-nya. Urutan yang membuat task saling menunggu ditolak saat
  disimpan, juga saat sub-stage atau PIC diubah. Task yang diatur menunggu task setim di fase
  lebih lambat (mis. I4 tayang menunggu QC) berdiri di fase itu, jadi urutan bawaan dan yang
  diatur tak pernah saling mengunci. Ini menggantikan "paralel per tahap" sejak 0.15.0, saat
  seluruh proyek menunggu tahap sebelumnya selesai, siapa pun timnya.
- **Yang mengatur urutan:** Lead tim pemilik task, atau Manager. Tombolnya ada di samping
  setiap task di tab tim dan di detail task, yang juga menampilkan semua yang ditunggu task itu
  beserta jenisnya.
- **Ubah task (2.27.0).** Tombol pensil ada di kepala detail task, di samping setiap baris
  task (task utama dan task turunan) di tab tim proyek, dan di daftar task turunan di detail
  induknya; yang boleh sama dengan sebelumnya (`Inti.bolehUbahTask`). Sejak **2.38.1**, dropdown
  PIC memuat Lead dan seluruh staff aktif tim pemilik, termasuk saat PIC sekarang Lead dan
  task sudah punya turunan. Task utama tanpa turunan juga mempertahankan pilihan delegasi
  yang sebelumnya diizinkan. PIC induk dan turunan bisa dipindah dalam tim pembaginya;
  mengganti PIC induk tidak mengganti PIC tiap turunan, dan tahapnya tetap sama. Ceklis
  pengerjaan mengikuti PIC task-nya. Daftar pilihan dan validasi server memakai aturan yang
  sama (`Inti.pilihanPicUbah`), dengan organogram terkini. Staff tetap hanya bisa menyunting
  task yang ia buat sendiri dan tidak bisa menyerahkannya kepada orang lain.
- **Ceklis pengerjaan** (dulu "sub-task"; sejak 2.28.0 namanya seperti v1, supaya tak
  tertukar dengan task turunan) bisa ditambah, diubah (judul dan **tautan opsional**), dicentang,
  dan dihapus oleh PIC task, Lead-nya, atau Manager. Sejak 2.29.0 (permintaan user) butir ceklis
  **tak punya PIC sendiri**: semuanya milik PIC task itu. Form tambah dan ubah tak lagi memilih
  PIC, Hari Ini tak lagi punya grup "Ceklis untuk saya", kolom "ceklis terbuka" di beban per orang
  Dashboard dihapus, dan saat PIC task diganti butirnya ikut. Kolom `pic` di data tetap ada dan
  diisi PIC task (data lama dengan PIC butir lain tetap terbaca, tapi PIC butir itu tak lagi
  bisa mencentangnya sendiri). Tautan
  (2.24.0) dirapikan (`https://` ditambahkan sendiri), hanya http(s), paling panjang 2000
  karakter, dan tampil di samping judul butirnya (di ponsel ikonnya saja). Nama di data tetap
  (`subtasks`, kolom `link` di tab `subtasks` dan tabel `v2_subtasks`); agen AI mengisinya lewat
  `tambah_subtask`.
- **Syarat ajukan.** Task proyek baru bisa diajukan kalau output terisi, semua ceklis pengerjaan
  selesai, semua task turunan selesai (kalau ada), task yang ditunggu sudah diajukan, tertahan
  (2.34.2), atau selesai (2.30.0), dan tidak tertahan. Sejak 2.28.0 (permintaan user) bagian **Output** di detail task
  berisi output saja; **tautan hasil kerja opsional** dan tak lagi menjadi syarat. Daftar
  periksanya tampil di detail task.
- **Tinjauan:** task staff oleh Lead-nya (termasuk task turunan), task Lead oleh Manager, sub-stage
  bertanda Manager oleh Manager. Pekerjaan rutin tanpa tinjauan; PIC langsung menandai selesai.
- **Tab bawaan (2.23.0).** Setiap kali proyek dibuka, halaman proyek langsung terbuka di tab
  tim sendiri (Lead dan staff, mis. Lead dan staff RAD di tab RAD); Manager di **Ringkasan**. Tab
  yang dipilih bertahan selama proyek itu terbuka.
- **Proyek tanpa Lead tetap.** Yang tampil adalah tim yang punya task di siklus ini beserta
  fasenya, mis. **RAD V**, **CLO ✓**.
- **Proyek tim saya disorot (2.30.0, permintaan user).** Di daftar Proyek, proyek yang punya
  task tim Lead atau staff yang sedang masuk diberi garis biru di tepi kiri, chip timnya diberi
  bingkai, dan judul halaman menyebut jumlahnya ("8 melibatkan tim RAD"). Manager tak disorot,
  karena terlibat di semua proyek.
- **Fase tim dihitung, bukan diputuskan:** fase task terbuka tim itu yang paling awal. Jalur
  **A D V I E** tiap tim (di Ringkasan, tab tim, dan detail task) bisa diklik untuk membuka task
  fase itu di tab timnya. Tahap proyek (fase paling awal di antara semua task terbukanya) tetap
  dihitung untuk riwayat tahap dan Dashboard. **Siklus ditutup** oleh task E12 · Final approval
  yang disetujui. Sesudah Evaluation tidak ada tahap keenam; Manager memilih:
  **arsipkan** (proyek tuntas, pilihan utama kalau semua task beres), **mulai siklus
  berikutnya** (ADDIE diulang dari Analysis untuk perbaikan atau versi berikutnya), atau
  **tahan**. Keputusan proyek: Build, Improve, Maintain, Hold.
- **Hapus proyek (2.22.0; sejak 2.42.0 Manager dan Lead, permintaan user).** Izinnya
  `proyek.hapus` (Panel Dev → Izin); staff tidak bisa. Tombol **Hapus proyek** (menu **⋯** halaman proyek) membuka
  ringkasan apa saja yang ikut hilang, lalu ID proyek harus diketik ulang. Yang ikut terhapus:
  - semua task proyek itu di semua siklus, termasuk task turunan, sub-task, komentar, tinjauan,
    dan bukti di dalamnya;
  - setoran task-task itu, sehingga progres paket dari proyek ini hilang dan targetnya terbuka
    lagi untuk dielaborasi.

  Riwayat Aktivitas (dengan catatan "Proyek dihapus beserta … task") dan pesan Komunikasi tetap
  tersimpan. Untuk proyek yang sudah selesai, **arsipkan saja** (tautan di jendela yang sama):
  semuanya tetap ada dan bisa diaktifkan lagi. Aturannya `Inti.hapusProyek`; di data real
  perubahannya hanya daftar baris yang dihapus. Paketnya bisa langsung dielaborasi ulang.
- **Pulihkan task yang terhapus (2.44.0, permintaan user).** Di data real, task yang terhapus
  (sendiri atau bersama proyeknya) masih bisa dikembalikan. Utasnya di **Komunikasi** menulis
  "Task terhapus" beserta siapa yang menghapus, kapan, dan bersama proyek apa; Lead dan Manager
  (izin `task.pulihkan`) menekan **Pulihkan sebagai task rutin**. Task kembali dengan ID yang
  sama (percakapannya tersambung lagi), sebagai task rutin di luar proyek: ceklis, output,
  bukti, komentar, dan riwayat tinjauannya ikut; yang sedang ditinjau kembali Dikerjakan.
  Jendelanya menawarkan **Tempel ke inisiatif (opsional)** dan tenggat baru. Isi task diambil
  server dari riwayat `data_real` (aksi RPC `taskTerhapus`, `api/_real.js`), dan `simpanReal`
  untuk aksi data `pulihkanTask` memakai isi itu, bukan kiriman browser. Aturannya
  `Inti.pulihkanTask`; agen AI tak memakainya. Di data contoh tak tersedia.
- **Ubah proyek (2.28.0, Manager).** Tombol **Ubah proyek** (menu **⋯**) mengganti nama,
  platform, dan tujuan proyek yang sudah dibuat; ID, siklus, tahap, dan task-nya tetap
  (`Inti.ubahProyek`, aksi data `ubahProyek`). Riwayat Aktivitas mencatat apa yang diubah.
- **Duplikat proyek (2.30.0, permintaan user; izin `proyek.buat`).** Untuk proyek yang berulang.
  Tombol **Duplikat proyek** membuat proyek baru di siklus 1 dengan platform dan tujuan yang
  sama, tanpa tautan paket. Bila dipilih, task siklus aktifnya ikut sebagai rencana baru: judul,
  sub-stage, PIC, prioritas, keterangan, ceklis (belum dicentang), task turunan, dan urutan
  tunggu (menunjuk task barunya). Status, output, bukti, tinjauan, komentar, dan setoran tidak;
  semua task mulai dari Antre. Tenggat digeser ke hari ini dengan jarak yang sama dari awal
  proyek asalnya, atau dikosongkan. PIC yang sudah nonaktif diganti Lead tim pemilik
  sub-stage-nya (`Inti.duplikatProyek`, aksi data `duplikatProyek`).
- **Nomor ID tak dipakai ulang (2.27.0).** Proyek, task, dan paket baru melanjutkan nomor
  tertinggi yang pernah ada, juga sesudah ada yang dihapus (sebelumnya elaborasi ulang sesudah
  hapus proyek memakai lagi PRJ-… dan PRD-… yang dihapus, sehingga riwayat dan pesan Komunikasi
  task lama menempel ke task baru). Nomor tertinggi dicatat saat menghapus di koleksi `nomor`
  (tab `nomor`, tabel `v2_nomor`, ikut data real).
- **Hapus task (2.23.0).** Di tab tim proyek, **⋯ → Pilih task untuk dihapus** memunculkan
  kotak centang di tiap task:
  - centang satu per satu (klik barisnya juga mencentang), **Pilih semua di <fase>**, atau
    **Pilih semua** di bilah yang tetap terlihat saat daftar digulir;
  - task turunan ikut tercentang dan terkunci bila induknya dipilih;
  - **Hapus N task** membuka jendela konfirmasi berisi daftar task, jumlah turunan, yang sudah
    selesai, dan setoran paket yang ikut hilang.

  Satu task juga bisa dihapus dari tombol tempat sampah di detail task. Yang boleh: Manager
  (semua task), Lead (task di tab timnya dan task yang boleh ia ubah), staff (hanya task yang ia
  buat untuk dirinya sendiri). Agen AI tidak boleh. Ikut terhapus: task turunannya, sub-task,
  komentar, tinjauan, bukti, dan setorannya (progres paket turun). Task lain yang menunggu task
  itu tak lagi menunggunya. Riwayat Aktivitas mencatat tiap task yang dipilih. Aturannya
  `Inti.hapusTask`; satu permintaan ditolak utuh bila ada satu saja task yang tak boleh dihapus.
- **Dashboard (disusun ulang di 2.33.0):** dibuka dengan **Perlu perhatian** (beban di atas
  kapasitas, pekerjaan yang ditunggu 3 task lain atau lebih, yang terlambat dan tertahan, serta
  proyek berisiko, masing-masing bertombol), lalu ubin angka, selesai per minggu, task aktif per
  tahap, dan tabel per orang: task aktif dari kapasitas 6, **Ditunggu task lain**, **Menunggu
  tinjauannya**, terlambat, dan selesai 30 hari. Per status, tim pemilik, platform, dan proyek
  per tahap dilipat di **Rincian lain**. Skor bottleneck PRD (ditunggu × 2 + tinjauan × 2 +
  telat) masih dihitung `Inti.laporan`, tetapi tak lagi ditampilkan: kolom-kolomnya lebih mudah
  dibaca daripada satu angka gabungan.
- **Staff** menerima task dari Lead, dan sejak 0.9.0 boleh **menambah task untuk dirinya
  sendiri**: rutin (kode R), atau task proyek di sub-stage milik timnya (E11 revisi juga boleh;
  sub-stage yang direview Manager tidak). PIC-nya selalu dirinya; menyerahkan ke orang lain tetap
  lewat Lead. Lead-nya mendapat notifikasi, task proyeknya tetap ditinjau Lead, dan task buatan
  sendiri bisa ia ubah. Ini keputusan user yang menggantikan "Staff tidak membuat task" di PRD v3.
- **Lingkup per peran:** Staff hanya melihat task-nya sendiri (**Saya**); Lead dirinya dan
  timnya (**Tim saya**); Manager dirinya, para Lead (**Tim saya**), dan seluruh divisi
  (**Semua**, bawaannya). Berlaku di Task, Dashboard, Komunikasi, dan pencarian cepat (ditambah
  task yang melibatkan orang itu: pemberi, peninjau, pendukung, atau yang berkomentar). Halaman
  proyek dan rancangan paket tetap terbuka untuk semua, karena itulah konteks kerja bersama.
  Maka sejak 2.35.1, selagi Task disaring ke satu proyek, Staff dan Lead mendapat pilihan
  **Semua tim** (semua tim di proyek itu); staff juga **Tim saya** (2.36.0). Label terlambat dan
  tertahan di kepala halaman proyek mengikuti yang melihat (2.36.0, permintaan user): Manager
  semua tim; Lead dan staff hanya timnya (Lead dan staff-nya, menurut PIC), dan labelnya tak
  muncul kalau timnya tak punya. Task di sub-stage tim Anda yang dipegang orang tim lain
  dihitung untuk tim pemegangnya. Diklik, label membuka Task dengan lingkup yang sama (Tim saya;
  Manager: Semua), jadi angkanya cocok; "Lihat di Task" membuka **Semua tim**.
  Aturannya `lingkupBoleh`/`lingkupOrang`/`lingkupTask`/`sorotProyek` di `public/inti.js`.

Semua aturan ini ada di satu berkas, `public/inti.js`, dan diuji di `test/`. Tampilan
(`public/app.js`) hanya meneruskan klik ke aturan itu.

### Rancangan paket → proyek → progres yang bergerak sendiri

1. Di **Rancangan Paket**, Lead/Manager menekan **Elaborasi jadi proyek**. Tak ada target yang
   tercentang dari awal: targetnya dipilih sendiri (ada tombol **Centang semua**), dan tombol
   Buat task baru aktif sesudahnya. Setiap target yang dipilih menjadi satu **batch**: rangkaian task sesuai alur jenisnya. Contoh Latsol: DV1
   Produksi soal → E1 QC soal → DV8 Input → I1 Generate → E4 QC SIADU → E5 QC Web → E6 QC
   Android → I4 Show/hide. Setiap langkah dipegang Lead tim pemilik sub-stage-nya, yang
   membaginya ke staff lewat task turunan. Sejak 2.19.0 langkahnya dikerjakan menurut **fase ADDIE
   tim pemiliknya**, dan elaborasi memasang urutan batch itu: **serah-terima** (langkah pertama
   sebuah tim menunggu langkah tim lain sebelumnya yang fasenya sama atau lebih awal: input LNA
   menunggu produksi soal RAD, tapi tak menunggu QC-nya) dan **urutan alur** di dalam tim (I4
   tayang menunggu QC E4–E6 yang di alur datang lebih dulu). Lead tim bisa mengubahnya. Langkah
   yang tak perlu bisa dicoret. Mode **Satu task per target** (cara 0.5.0) tetap ada.
2. Jumlah per target bisa dikecilkan bila proyek ini hanya mengerjakan sebagian (target 10,
   proyek ini 5); sisanya tetap terbuka untuk elaborasi berikutnya. Tujuannya boleh proyek baru
   atau proyek yang sudah ada.
3. Langkah bercapaian membawa **setoran**. Progres paket **berbobot**: konten siap 40% (E1/E2),
   ter-input 60% (DV8), lolos QC output 85% (QC aplikasi terakhir), tayang 100% (I4). Setiap
   batch dinilai dari langkah bercapaian tertinggi yang sudah disetujui; target baru dihitung
   **terpenuhi** saat batch-nya tayang. Bobot itu bawaan dari usulan PRD; sejak 0.14.0 nama dan
   bobotnya diatur Manager di halaman **Master** (tayang tetap 100%). Sejak 2.19.0 tayang (I4)
   menunggu QC lagi, jadi batch dengan alur bawaan naik ter-input (60%) → lolos QC (85%) →
   tayang (100%). Sejak 2.26.0 satu capaian boleh dipasang di **beberapa langkah** (mis. Lolos
   QC di E4–E7 yang dikerjakan bersamaan): capaian itu baru tercapai setelah semua langkah
   bertanda itu disetujui. Urutan capaiannya tetap tak boleh mundur.
4. Progres **dihitung, bukan dipicu**: tak ada yang ditulis saat task selesai. Task yang dibuka
   kembali otomatis menurunkan progresnya lagi.

Alur Dibimbing (D5 → I3 → E5 → I4) dan Live Class (I6 → I7) tidak tercantum di PRD; bawaannya
usulan (`ALUR_PAKET` di `public/inti.js`). Sejak 0.14.0 kategori paket dan alurnya diatur di
**Master**: kategori baru, langkah alur, tanda capaian, urutan, dan menonaktifkan kategori.

Task yang dibuat di luar elaborasi bisa menyetor lewat bagian **Setoran ke rancangan paket** di
detail task (Lead/Manager task itu), lengkap dengan capaiannya. Manager bisa menautkan proyek
lama ke paket dari halaman proyek. Satu paket boleh diisi beberapa proyek, dan satu proyek boleh
mengisi beberapa paket. Aturannya di `public/inti.js` (`elaborasiPaket`, `setoranPaket`,
`batchSetoran`, `hitungTarget`), diuji di `test/setoran.test.js`.

Halaman pendukung, setara v1:

- **Rancangan Paket**: nama paket dan platform (sejak 0.14.0 Program dan PIC Produk tak lagi
  diisi; nilai lamanya tetap tersimpan), teks per kategori (bawaannya Dibimbing, Latsol, Materi,
  Tryout, Drilling, Live Class; diatur di Master), target per kategori (tayang / progres
  berbobot / digarap / target / satuan, status dihitung: terpenuhi, digarap, kurang, lebih,
  beserta chip per batch), tautan, proyek pengisi, dan **Salin ke sheet Marsel** (susunan kolom
  sheet Master Marsel; kategori dari Master ikut jadi kolom). Kategori yang dinonaktifkan tetap
  tampil di paket yang masih berisi item kategori itu. **Urutan target (2.40.0, permintaan
  user)**: di form Ubah rancangan, tiap baris target punya pegangan ⋮⋮ untuk diseret (tetikus
  atau jari; sela kosong di baris juga bisa) atau digeser dengan panah atas/bawah saat
  pegangannya terfokus, di dalam kategorinya. Urutan baris itulah yang tersimpan (`urutan` dari
  `Inti.simpanPaket`) dan dipakai di tampilan, salinan sheet Marsel, dan elaborasi. Lead & Manager membuat paket; PIC Produk
  dari data v1 boleh menyunting paketnya; membagikan ke Lintas Divisi hanya Lead/Manager;
  menghapus hanya Manager. **Duplikat (2.30.0, permintaan user; izin `paket.buat`)** membuat
  rancangan baru dari paket ini: isi produk, target, catatan per kategori, dan tautan disalin
  dengan ID baru; jadwal pendaftaran dikosongkan, tak dibagikan ke Lintas Divisi, dan angka
  "sudah ada" kembali 0 kecuali dipilih ikut. Setoran dan proyek yang tertaut tidak ikut
  (`Inti.duplikatPaket`, aksi data `duplikatPaket`). Sejak 2.18.0:
  - **Platform boleh lebih dari satu.** Di form, platform dicentang. Isiannya tetap satu
    kolom teks dipisah koma ("ASN, BUMN"), jadi data lama dan sheet Marsel tak berubah.
    Saringan Platform di daftar juga bisa memilih beberapa platform: paket tampil bila salah
    satu platformnya terpilih.
  - **Elaborasi paket berplatform banyak.** Proyek dan task tetap satu platform, karena
    saringan dan Dashboard menghitung per platform. Form elaborasi menanyakan platform yang
    dipakai; bawaannya yang pertama.
  - **Jadwal pendaftaran** (buka–tutup) diisi di form paket. Jadwalnya tampil di kartu dan di
    halaman paket beserta keadaannya: akan dibuka, sedang dibuka, atau sudah ditutup.
  - **Slicer jadwal pendaftaran** di atas daftar paket, berupa dua pegangan dan isian tanggal.
    - Menampilkan paket yang masa pendaftarannya bersinggungan dengan rentang yang dipilih.
    - Pegangan di ujung berarti tanpa batas di sisi itu.
    - Selama slicer dipakai, paket tanpa jadwal tidak tampil.
  - **Urutan kartu diatur sendiri.** Di desktop kartu diseret; di ponsel lewat **Atur urutan**
    (tombol panah). Urutannya tersimpan di browser masing-masing, per sumber data; paket baru
    tampil paling atas, dan **Urutan bawaan** mengembalikannya.
  - **Klik dua kali judul paket** (di kartu atau di halaman paket) untuk mengganti nama di
    tempat. Enter atau pindah fokus menyimpan, Esc membatalkan.
    - Hanya untuk yang boleh menyunting paket itu, dan tercatat di Riwayat Aktivitas.
    - Klik sekali pada judul kartu tetap membuka paketnya, setelah jeda singkat untuk
      menunggu klik kedua.
- **Task**: satu halaman dengan lima tampilan yang diganti lewat deretan ikon di atas daftar:
  **Daftar** (bisa diurutkan dan diekspor ke CSV, ikut sub-stage, tim, dan keadaannya),
  **Kanban** (seret-lepas di desktop), **Per orang**, **Timeline** (5 minggu), dan **Kalender
  tim** (tenggat per hari, acara, dan pendaftaran paket; namanya sejak 2.33.0 supaya tak tertukar
  dengan Kalender Saya, dan keduanya saling bertaut). Tab fokus berangka di atasnya: Semua,
  Terlambat, Tertahan, dan Tinjauan
  saya (Lead & Manager). Kotak cari, lingkup (sesuai peran), dan **Saringan**
  (proyek, jalur, tahap, sub-stage, tim, platform) berlaku di semua tampilan. Tampilan
  dan saringan terakhir diingat per browser.
- **Link Saya** (gaya ide v2): kartu per folder. Tempel alamat di kotak atas lalu Enter, atau
  cukup Ctrl+V di halaman itu; judulnya terisi sendiri dan bisa diubah. ★ memasukkan link ke
  kartu **Favorit**. Baris **Sering dibuka** mengangkat 5 link yang paling sering dibuka di
  perangkat itu. Kartu **Tautan tim** (dulu menu Dashboard Lain) berisi dashboard dan laporan
  tim: terlihat semua orang, dikelola Manager. Supaya tetap rapi walau link dan folder banyak
  (0.11.0):
  - Klik nama folder untuk **menciutkan** atau membukanya; **Ciutkan semua** sekaligus.
  - Menu **⋯** di kartu: **sematkan ke atas** (paling atas, di atas Tautan tim dan Favorit;
    urutan sesuai saat disematkan), buka semua link
    sekaligus, ganti nama, dan hapus folder (isinya pindah ke Umum).
  - Kartu berisi lebih dari 6 link dipotong; **Lihat semua** membukanya.
  - Tampilan **kartu** atau **daftar ringkas** (satu kolom, link bersebelahan tanpa ikon).
  - Di desktop, link bisa **diseret** ke kartu folder lain; ke Favorit berarti menandainya ★.
    Di ponsel tetap lewat tombol Pindah folder.
  - Folder yang diciutkan, yang disematkan, dan bentuk tampilan diingat per profil di browser
    itu. Ini preferensi tampilan, jadi tidak ikut Reset data contoh.
- **Catatan Saya** (gaya ide v2, diperluas di 0.11.0). Catatan tetap pribadi dan hanya ada di
  browser itu (tidak terkirim ke spreadsheet).
  - **Dua panel** (daftar di kiri, editor besar di kanan) atau **kartu** ala Google Keep
    (editor terbuka di jendela). Daftar dikelompokkan per folder yang bisa diciutkan, dengan
    kelompok **Disematkan** paling atas. Folder catatan bisa diganti nama dan dihapus lewat ⋯.
  - **Editor blok ala Notion** (0.14.0): satu tampilan langsung, tanpa mode Baca/Sunting.
    Menulis, mencentang checklist, dan mengisi tabel terjadi di tempat yang sama. Jenis blok:
    teks, judul 1–3, daftar titik, daftar bernomor, **checklist**, **tabel**, kutipan, dan
    garis pemisah.
    - Ketik **/** untuk menu blok (bisa disaring: "/tab", "/cek"), atau pakai toolbar.
      Pintasan markdown di awal paragraf: `# `, `## `, `- `, `1. `, `[] `, `> `, `---`.
    - **Enter** memecah blok; di checklist dan daftar membuat butir berikutnya, dan di butir
      kosong keluar dari daftar. **Backspace** di awal blok mengubahnya jadi paragraf lalu
      menyatukannya dengan blok di atas. **Tab** menjorokkan butir; panah berpindah antarblok.
    - **Tabel**: Tab/Enter berpindah sel (baris baru di akhir), tombol tambah/hapus baris dan
      kolom, dan sel yang ditempel dari Google Sheets mengisi tabel sekaligus. Menempel beberapa
      baris teks memecahnya jadi blok.
    - Blok yang sedang diketik menampilkan teks mentahnya (`**tebal**`, `[teks](alamat)`);
      blok lain tampil berformat dengan tautan dan nomor task yang bisa diklik. Ctrl+B/Ctrl+I,
      dan **Ctrl+Z / Ctrl+Y** mengurungkan dan mengulang.
    - Yang tersimpan tetap **teks biasa** (tabel sebagai `| a | b |`), jadi pencarian, unduhan
      .txt, riwayat versi, dan catatan lama tetap jalan. Aturannya `blokCatatan`/`teksBlok` di
      `public/inti.js`, diuji di `test/catatan-blok.test.js`.
    - **Memilih dan memindah baris (2.34.0, permintaan user)**: **Ctrl+A** memilih semua baris
      catatan (dulu hanya satu baris, karena tiap baris kotak ketik sendiri). Seret tetikus
      melewati beberapa baris, Shift+klik, Shift+↑/↓ di tepi baris, atau ketuk pegangan **⋮⋮**
      di kiri baris juga memilih baris utuh. Yang dipilih bisa dihapus (Delete/Backspace),
      disalin atau dipotong sebagai teks catatan (Ctrl+C/Ctrl+X), digandakan (Ctrl+D), dipindah
      (Alt+Shift+↑/↓, atau seret pegangannya ke garis biru, juga dengan sentuhan), dijorokkan
      (Tab), atau dicentang (Ctrl+Enter); huruf yang diketik atau tempelan menggantikannya.
      Selama ada pilihan, toolbar berisi Salin, Potong, Duplikat, Naik, Turun, Hapus, dan Batal;
      Esc atau Batal kembali ke tempat kursor semula. Semuanya bisa diurungkan.
    - Pintasan di baris yang sedang diketik (2.34.0): Ctrl+D, Alt+Shift+↑/↓, Ctrl+Enter,
      **Ctrl+Shift+X** coret, dan **Ctrl+E** kode (tombol coret, kode, dan pilih semua juga di
      toolbar). Di tampilan dua panel, toolbar kini menempel di bawah header saat halaman
      digulir. Aturannya `pindahBlokKe`, `geserBlok`, dan `duplikatBlok` di `public/inti.js`.
  - **Jadikan task** dari blok yang sedang diketik (atau ikon di ujung blok): form Tambah task
    terisi judul dari blok itu. Sesudah task dibuat, "→ PRD-…" ditempel di ujung blok dan bisa
    diklik untuk membuka task-nya.
  - **Templat**: Notulen rapat, Rencana minggu ini, Checklist QC, Catatan 1-on-1, Tabel rencana
    produksi.
  - **Warna** (biru, hijau, kuning, merah, ungu) dan saringan menurut warna.
  - **Riwayat versi**: isi lama disimpan sebelum tertimpa (sekali di awal sesi menyunting,
    lalu paling sering tiap 10 menit; maksimal 15 versi per catatan) dan bisa dipulihkan.
    Memulihkan tidak menghapus versi sekarang.
  - Tetap **tersimpan sendiri** 0,7 detik setelah berhenti mengetik; Ctrl+S menyimpan seketika.
    Bisa disematkan, diunduh sebagai .txt, dan dihapus. Catatan tanpa judul memakai baris
    pertamanya. Di ponsel daftar dulu, lalu editor penuh.
  - **Pilih banyak catatan (2.34.0)**: tombol **Pilih** (atau Ctrl+A bila tak ada catatan yang
    terbuka) memunculkan kotak centang; Shift+klik memilih satu rentang, Esc keluar. Bilahnya:
    Pilih semua, Pindah ke folder, warna, dan Hapus. Catatan juga bisa **diseret** (tetikus)
    ke folder lain, atau ke **Disematkan** untuk menyematkannya (dari Disematkan ke folder:
    sematannya lepas).
  - **Hapus bisa diurungkan (2.34.0)**: tanpa jendela konfirmasi; pesan sesudahnya punya tombol
    **Urungkan** selama 10 detik (juga Ctrl+Z di luar editor), dan catatan beserta riwayat
    versinya kembali ke tempat semula. Aturannya `hapusCatatan`, `pulihkanCatatan`, dan
    `pindahFolderCatatan`, diuji di `test/catatan.test.js`.
- **Komunikasi** (0.10.0, "kotak masuk kerja"): lihat bagian *Komunikasi bersama* di bawah.
- **Laporan**: ringkasan berkala (minggu ini, minggu lalu, bulan ini, 30 hari) per orang, bisa
  disalin sebagai teks untuk chat atau email.
- **Riwayat Aktivitas** (Manager): saring jenis, orang, kata.

### Komunikasi bersama

Bagian pertama yang **terbagi antar orang dan perangkat** (sejak 0.12.0 bersama *Foto profil*):
pesan disimpan ke tab `obrolan` di spreadsheet v2, bukan di browser.

- **Tampilan kotak masuk.** Kolom kiri berisi saringan **Belum dibaca**, **Menyebut saya**,
  **Perlu jawaban**, dan **Semua utas**, lalu ruang tim dan ruang proyek. Kolom tengah berisi
  daftar utas; kolom kanan percakapannya. Di bawah 1360 px kolom kiri menjadi deretan chip; di
  ponsel daftar tampil dulu, lalu percakapan penuh dengan tombol kembali.
- **Ruang.** Ada tiga jenis: utas per task, **ruang proyek** (terbuka untuk semua), dan **ruang
  tim** (Lead dan staff tim itu, ditambah Manager). Alamatnya `#/komunikasi/PRD-12`,
  `#/komunikasi/PRJ-3`, dan `#/komunikasi/tim-LA`.
- **Menulis pesan.**
  - Enter mengirim, Shift+Enter membuat baris baru.
  - Format ringan seperti v1: **tebal**, _miring_, ~~coret~~, `kode`, dan tautan otomatis.
  - Ketik **@** untuk menyebut orang (@Kiki) atau peran (@manager, @lead, @staff, @semua).
    Sejak 2.38.0 (permintaan user) **@all** sama dengan @semua: semua orang yang boleh membuka
    ruang itu mendapat notifikasi (ruang task dan proyek: semua orang; ruang tim: anggota tim
    itu dan Manager).
  - **Balasan cepat** menurut peran dan keadaan task (2.35.0): PIC saat dikerjakan ("Sedang saya
    kerjakan"), saat ditinjau ("Sudah saya ajukan", "Mohon dicek ya"), saat revisi ("Siap, saya
    perbaiki"); peninjau ("Sudah saya cek, saya setujui", "Ada revisi kecil"); orang lain dan
    ruang proyek/tim mendapat balasan umum. Hanya menyisipkan teks; di ponsel dibuka lewat
    tombol kilat. Aturannya `Inti.pesanCepatUntuk`. Draf tersimpan per ruang.
  - **Kartu tautan** (2.35.0): tautan Google Sheets, Docs, Slides, Forms, dan Drive tampil
    sebagai kartu kecil berikon (judulnya label tautan, atau jenis berkasnya; judul asli berkas
    tak bisa dibaca aplikasi). Tautan lain tetap tautan biasa (`Inti.kartuTautan`).
- **Mengelola pesan.** Pesan bisa dibalas dengan kutipannya dan diberi reaksi 👍 ✅ 👀 🙏.
  Pesan sendiri bisa diubah (bertanda "diubah") atau dihapus (tampil "Pesan dihapus").
- **Perlu jawaban.** Tombol **?** menandai pesan menunggu jawaban orang yang disebut; di
  ruang task tanpa sebutan, yang ditunggu adalah PIC-nya. Pesan itu muncul di **Perlu jawaban**
  orang tersebut sampai ia membalas atau seseorang menandainya beres.
- **Konteks kerja di percakapan.** Utas task memuat jejak task-nya (diajukan, dikembalikan
  beserta alasannya, disetujui, diserahkan, tertahan). Sejak 2.35.0 (permintaan user):
  - kepala percakapan ringkas: sub-stage, status, "PIC → peninjau", dan tenggat sekali saja;
  - aksi utama (Mulai, Ajukan, Setujui, dan Kembalikan bagi peninjau) di kepala; yang membalik
    keadaan atau jarang dipakai (Tarik dari tinjauan, Buka kembali, tertahan) di menu ⋯, tetap
    dengan konfirmasi;
  - **Info task** satu baris (output, yang ditunggu, syarat ajukan n/m) yang bisa dibuka untuk
    proyek dan daftar syaratnya; pilihan buka-tutupnya diingat browser;
  - kejadian task berturut-turut diringkas jadi satu baris ("Nynda menyetujui → Ali: Dibuka
    kembali → …") yang bisa dibuka, dan tetap terbuka saat pesan baru masuk;
  - gelembung pesan sendiri berwarna aksen tipis tanpa bingkai, tautannya mengikuti warna teks.
- **Diskusi di detail task.** Bagian **Diskusi** di laci detail task memakai utas yang sama.
- **Notifikasi.** Lonceng dan lencana sidebar ikut pesan bersama: pesan baru di task yang
  melibatkan Anda, sebutan, dan pertanyaan untuk Anda. Ruang tim dan proyek hanya memberi tahu
  lewat sebutan dan pertanyaan, supaya lonceng tak riuh.

**Cara kerjanya.** Tab `obrolan` hanya bertambah (`values.append`). Setiap pesan, ubah,
hapus, reaksi, atau "beres" adalah satu baris peristiwa, dan keadaan akhirnya disusun ulang di
browser oleh `susunObrolan` di `public/inti.js`. Dua orang yang menulis bersamaan tak
saling menimpa.

- **Pemeriksaan.** Peristiwa diperiksa di browser dan di server (`periksaPeristiwa`).
  Peristiwa yang tak sah, mis. mengubah pesan orang lain, diabaikan saat disusun.
- **Waktu.** id dan waktu diberikan server, supaya tarikan bertahap tak melewatkan pesan dari
  browser yang jamnya meleset.
- **Tarikan berkala.** Browser menarik pesan baru tiap 20 detik di Komunikasi dan tiap 60
  detik di halaman lain (30 detik di data real, karena perubahan data ikut tarikan yang sama),
  berhenti saat tab tak terlihat, dan melambat saat gagal. Sejak 2.35.0 tiap 8 detik selama
  sebuah utas terbuka (ruang di Komunikasi atau tab Diskusi detail task), dan seketika saat utas
  dibuka (bila tarikan terakhir lebih dari 3 detik lalu).
- **Kuota.** Kuota baca Google Sheets dihitung per service account, jadi server juga memakai
  ulang bacaan yang berdekatan selama 3 detik.
- **Aman dari impor ulang.** `npm run impor:v1` tak pernah menyentuh tab `obrolan`
  (tab itu tak ada di `TAB` maupun `USANG`), dan **Reset data contoh** juga tidak.
- **Komentar lama** dari data contoh tetap tampil di utas task-nya.

Aturannya ada di `public/inti.js` (`susunObrolan`, `daftarUtas`, `sebutan`,
`tanyaTerbuka`, `notifikasi`) dan `api/_sheets.js` (`bacaObrolan`, `tulisObrolan`),
diuji di `test/obrolan.test.js` dan `test/rpc.test.js`.

### Foto profil

Sejak 0.12.0 setiap orang bisa memasang foto sendiri; foto itu menggantikan inisial di semua
avatar (pemilih profil, sidebar, Komunikasi, detail task, kartu, laporan) untuk semua orang.

- **Memasang.** Klik foto atau inisial sendiri di kaki sidebar, pilih **Ganti foto profil** di
  menu akun kanan atas, atau cari "Foto profil" di pencarian cepat. Pilih berkas, seret ke
  jendela itu, atau tempel (Ctrl+V).
- **Memotong.** Foto tampil di bingkai bulat: seret untuk menggeser, perbesar dengan penggeser,
  roda tetikus, atau cubit dua jari (papan tombol: panah, + dan −, Enter menyimpan).
- **Ukuran.** Potongan diperkecil di browser menjadi JPEG persegi 192 px (sekitar 10–20 KB),
  jadi foto asli tak pernah dikirim. Kalau masih melebihi batas, mutu lalu ukurannya diturunkan.
- **Menghapus.** **Hapus foto** mengembalikan avatar ke inisial.

**Cara kerjanya.** Tab `foto` di spreadsheet v2 berisi satu baris per orang (`orang`,
`gambar`, `diperbarui`). `gambar` adalah data URL base64 yang muat di satu sel (paling banyak
45.000 karakter; batas sel 50.000). Berbeda dengan `obrolan`, baris orang yang sama ditimpa,
supaya tab tetap kecil; gambar kosong berarti foto dihapus.

- **Pemeriksaan.** `periksaFoto` di `public/inti.js` dipakai browser dan server: hanya JPEG, PNG,
  atau WebP dalam base64 murni. Browser juga memeriksa ulang sebelum memasang foto, karena foto
  dipasang lewat satu stylesheet (`.av-<id>`), bukan disalin ke setiap avatar.
- **Tarikan.** Foto disimpan di browser supaya langsung tampil, lalu hanya yang berubah yang
  ditarik: saat aplikasi dibuka dan tiap 5 menit selama tab terlihat.
- **Aman dari impor ulang.** Seperti `obrolan`, tab `foto` tak disentuh `npm run impor:v1`
  maupun **Reset data contoh**.
- **Nanti di MySQL.** Cukup satu tabel `foto_profil` (id orang, gambar atau path berkas, waktu
  diperbarui). Aksi API-nya (`muatFoto`, `simpanFoto`) tetap, jadi tampilan tak perlu diubah.

Diuji di `test/rpc.test.js` (aturan foto, tab dibuat berjudul, baris ditimpa, hapus, tarikan
bertahap, isian tak sah, sheet v1 ditolak, aman dari impor ulang).

### Mode Dev

Sejak 0.13.0, seperti v1: akun teknis untuk perawatan, **bukan anggota tim**. Dev tak bisa jadi
PIC dan tak muncul di laporan, dashboard, atau @sebut; hak lihatnya setara Manager.

- **Masuk.** Tekan-tahan logo ProductTrack **3 detik** (di sidebar, layar PIN, atau pemilih
  profil; di ponsel lewat Menu), lalu isi **PIN Dev** (env `DEV_PIN`). Dari layar PIN pun bisa:
  PIN Dev sekaligus membuka aplikasi. Sejak 0.14.3 itulah **satu-satunya pintu masuk**: tak ada
  kartu Dev di pemilih profil, dan `#/dev` hanya membuka Panel Dev kalau sesi Dev sudah aktif
  (tanpa sesi Dev, alamat itu jatuh ke beranda seperti halaman lain yang tak boleh dibuka).
  Selama sesi Dev berlaku, tekan-tahan logo lagi (mis. sesudah Ganti profil) langsung kembali
  jadi Dev tanpa PIN.
- **Aman di server.** Status Dev ada di cookie sesi bertanda tangan, berlaku **12 jam**, dan batal
  kalau `DEV_PIN` diganti; sesudahnya sesi tetap jalan sebagai sesi biasa. Tak ada PIN bawaan:
  `DEV_PIN` kosong berarti mode Dev tertutup (v1 memakai 3108 kalau kosong). PIN Dev yang salah
  diperlambat seperti PIN biasa.
- **Panel Dev** (`#/dev`):
  - **Sumber data** (2.16.0, paling atas di Sistem): Data contoh atau Data real, berlaku untuk
    semua pengguna. Lihat *Sumber data: contoh dan real*.
  - **Sistem**: lingkungan, versi server dan browser (beda = muat ulang Ctrl+Shift+R), akun
    service account, kepemilikan spreadsheet, data contoh, isi tiap tab, keadaan browser
    (penyimpanan, pesan, foto), dan galat terakhir. Tombol periksa ulang, tarik ulang pesan &
    foto, **Siapkan spreadsheet** (seperti Setup v1), dan **Salin laporan diagnosa**.
  - **Pengguna**: tambah dan ubah orang (nama, nama panggilan untuk @sebut, jabatan, peran,
    atasan atau tim yang dipimpin, aktif). Orang tak dihapus, hanya dinonaktifkan, supaya namanya
    tetap terbaca di riwayat. Disimpan di tab `orang` spreadsheet v2 dan berlaku untuk semua orang
    saat aplikasi dimuat. Organogram dijaga: satu Manager (Nynda) yang selalu aktif, paling banyak
    satu Lead per tim (AK, LA, CO, SI; tim tanpa Lead sementara dipegang Manager), atasan staff
    harus Lead atau Manager yang aktif, dan nama panggilan unik. Tab yang rusak karena diubah
    manual diabaikan (kembali ke bawaan) dan alasannya tampil di sini.
  - **Lihat sebagai**: layar persis milik orang itu, dengan spanduk kuning **Kembali jadi Dev**.
    Tampilan saja: yang terlanjur diubah dibuang saat kembali, dan pesan, foto, serta perubahan
    orang tidak dikirim. Di data real perubahan data langsung ditolak.
  - **Izin** (2.29.0): tabel centang apa yang boleh dilakukan Manager, Lead, dan Staff. Lihat
    *Izin per peran*.
  - **Moderasi**: hapus pesan siapa pun (tampil "Pesan dihapus oleh Dev"; isi aslinya tetap di
    tab `obrolan`) dan foto profil siapa pun. Di Komunikasi, Dev membaca dan memoderasi langsung
    dari gelembung pesan, tapi tidak menulis.
- **Keluar**: tombol **Keluar mode Dev** di Panel Dev atau menu akun kanan atas.

Server: aksi `masukDev`, `keluarDev`, `sistem`, `simpanOrang`, dan peristiwa obrolan
`moderasi`; tiga yang terakhir khusus sesi Dev (403 untuk sesi biasa). Aturannya di
`public/inti.js` (`periksaOrang`, `aturOrang`, `salahOrganogram`), diuji di
`test/orang.test.js`, `test/sesi.test.js`, dan `test/rpc.test.js`.

### Sumber data: contoh dan real

Sejak 2.16.0 aplikasi punya dua sumber data. Mode Dev memilihnya di **Panel Dev → Sistem**, dan
pilihan itu **berlaku untuk semua pengguna**. Pilihannya disimpan di tab `setelan`
(`sumber_data`), lalu setiap browser memuat ulang aplikasinya paling lambat sekitar satu menit
kemudian; tab yang tak terlihat menyusul saat dibuka lagi. Perubahan data real yang terkirim
sesudah sumbernya diganti ditolak server, jadi ganti sumber saat tim tak sedang mengisi. Data
yang sedang tak dipakai tetap utuh, jadi sumbernya bisa dipindah bolak-balik.

| | Data contoh (bawaan) | Data real |
|---|---|---|
| Isi awal | impor v1 dan skenario contoh (*Data contoh dari v1*) | kosong |
| Task, proyek, paket, setoran, Tautan tim | diubah di browser masing-masing; **Reset data contoh** membuangnya | tersimpan bersama di tab `data_real`, terlihat semua orang |
| Komunikasi | tab `obrolan` | tab `obrolan_real`, karena nomor task-nya bisa sama |
| Link Saya & Catatan Saya | di browser itu | tetap di browser itu, terpisah dari milik data contoh |
| Panduan · **Coba sekarang** | membuka contoh nyata | diganti keterangan, karena mencoba berarti mengubah pekerjaan sungguhan |

Kaki sidebar (di ponsel: Menu) menunjukkan sumber yang dipakai dan keadaan simpanannya: semua
tersimpan, "Menyimpan N perubahan…", atau "N perubahan belum tersimpan" dengan tombol **Coba
simpan lagi**. Di data real tak ada tombol Reset. Yang boleh mengubah data real hanya profil yang
dipilih di sesi itu, dan profil ber-PIN harus terbukti. Mode Dev dan Lihat sebagai tidak
mengubah data real. Seperti `obrolan`, tab `setelan`, `data_real`, dan `obrolan_real` tak
disentuh `npm run impor:v1` maupun Reset data contoh.

**Mode uji Dev (2.25.0).** Pilihan ketiga di Panel Dev → Sistem: **Uji Dev (browser ini saja)**,
untuk mencoba fitur yang baru ditambahkan tanpa mengganggu data real.

- Browser itu memakai **data contoh** selama sesi Dev, sementara semua pengguna lain tetap di
  sumber global (mis. data real). Server hanya mengabulkannya untuk sesi Dev (`muatContoh` dan
  `sinkron` dengan `uji: true`); sesi Dev yang berakhir mengembalikan browser itu ke sumber global.
- Spanduk biru **Mode uji Dev** selalu tampil di kepala, dengan tombol **Keluar mode uji**.
- **Master** yang diubah di mode uji (tambah, hapus, pindah kode) hanya berlaku di browser itu
  (`pt2_uji_master`); keluar dari mode uji atau Reset data contoh membuangnya.
- **Lihat sebagai** di mode uji menyimpan perubahannya di data uji, jadi alur peran lain bisa
  dicoba sampai tuntas.
- Pesan Komunikasi masuk obrolan data contoh. Orang, PIN, foto, dan tampilan pribadi tak bisa
  diubah dari mode uji karena berlaku untuk pengguna lain.

**Cara kerjanya.**

- **Satu pintu.** Setiap perubahan data bersama lewat `ubahData(aksi, isi)` di `public/app.js`.
  `aksi` adalah nama aturan di `Inti.AKSI_DATA` (24 aksi: task baru dan task turunan, ubah task,
  aksi status, output dan bukti, sub-task, setoran, proyek, keputusan, siklus, arsip, paket,
  elaborasi, Tautan tim).
- **Seketika, lalu diperiksa server.** Browser menjalankan perintahnya dulu supaya terasa
  langsung, lalu mengirimnya (`simpanReal`). Server menjalankan aturan yang sama
  (`Inti.jalankanPerintah`) terhadap keadaan terkini, atas nama profil sesi itu, bukan isian
  browser. Yang lolos disimpan sebagai satu baris di `data_real`: perintahnya sebagai jejak, dan
  **perubahannya** (`Inti.bedaData`: baris data yang berubah). Nomor task atau proyek baru
  ditentukan server; nomor sementara di browser ikut diganti.
- **Riwayat diterapkan, bukan dijalankan ulang.** Keadaan disusun dengan menerapkan perubahan
  itu berurutan (`Inti.terapkanUbah`), jadi aturan, organogram, atau Master yang berubah kelak
  tak mengubah riwayat.
- **Ditolak atau gagal.** Yang ditolak server, biasanya karena orang lain lebih dulu mengubah
  hal yang sama, dibatalkan di browser dengan pesannya, lalu data terbaru dimuat. Yang gagal
  karena jaringan atau server tetap tampil dan dicoba lagi dengan jeda yang berlipat (5 detik
  sampai ±80 detik). Kiriman ulang tak tersimpan dua kali karena setiap perintah ber-ID.
- **Tarikan.** Perubahan orang lain ikut tarikan pesan Komunikasi (`sinkron`): tiap 20 detik di
  Komunikasi dan 30 detik di halaman lain, hanya yang sesudah nomor terakhir di browser itu.
  Halaman tak digambar ulang selagi orang mengetik.
- **Dua instance.** Server memeriksa perintah satu per satu, tetapi antrean itu hanya berlaku di
  satu instance, sedangkan Cloud Run boleh menjalankan dua. Karena itu setiap baris mencatat
  `dasar`: banyaknya perubahan yang sudah dilihat server saat memeriksanya. Baris yang tersalip
  perubahan dari instance lain dilewati di server maupun browser, dan servernya memeriksa ulang
  perintah itu terhadap keadaan terbaru, lalu menulis lagi atau menolaknya. Tanpa ini, dua task
  yang dibuat pada detik yang sama bisa mendapat nomor yang sama. Panel Dev menghitungnya sebagai
  "diulang".
- **Baris.** Perubahan yang lebih panjang dari satu sel dipecah ke beberapa baris (`bagian` 1/3,
  2/3, …). `generasi` (ID baris pertama) menandai tab yang dibuat ulang; browser lalu membaca
  dari awal.

**Jangan menyunting `data_real` dengan tangan.** Baris yang rusak dilewati dan dihitung di Panel
Dev. Untuk memulai data real dari kosong lagi, hapus tab `data_real`, dan `obrolan_real` kalau
obrolannya juga mau dikosongkan.

**Nanti di MySQL.** Tab `data_real` hanya bertambah, dan seluruh riwayatnya dibaca setiap kali
instance server menyala dan setiap kali browser baru pertama membuka data real. Satu perubahan
rata-rata ±1 KB, jadi misalnya 300 perubahan sehari menjadi ±8 MB sebulan. Panel Dev
menampilkan besarnya dan memberi peringatan di atas ±20 MB: saatnya pindah ke MySQL. Keadaan
terkini cukup disusun sekali dari `data_real` lalu ditulis ke tabel `v2_` di
`db/produk_base_v2.sql`; aksi API-nya (`simpanReal`, `sinkron`) bisa tetap.

Aturannya di `public/inti.js` (`AKSI_DATA`, `jalankanPerintah`, `periksaPerintah`, `bedaData`,
`terapkanUbah`), `api/_real.js`, dan `api/_sheets.js` (`bacaReal`, `tulisReal`, `bacaSetelan`),
diuji di `test/real.test.js` dan `test/real-rpc.test.js`.

### Agen AI Ali

Sejak 2.17.0 profil **Ali** bisa dijalankan oleh agen AI dari Agent Office
(`G:\Ali\code\Agent AI`). Agen bekerja atas nama Ali, dengan batasan Ali sendiri, dan semua
yang ditulisnya bertanda **AI**. Cara menyiapkan dan memakainya ada di `agen/README.md`.

- **Masuk dengan kuncinya sendiri.**
  - Server memakai env `AGEN_KUNCI` (minimal 32 karakter acak); `AGEN_PROFIL` (bawaannya
    `ali`) menentukan profilnya. Aksinya `masukAgen`.
  - Agen tak memegang PIN aplikasi. Ia tak bisa memilih profil lain, masuk mode Dev, mengganti
    sumber data, atau membuka Panel Sistem.
  - Kunci diganti atau dikosongkan = semua sesi agen batal seluruhnya. Sesi lama tak pernah
    turun menjadi sesi biasa.
  - Panel Dev → Sistem menunjukkan apakah agen aktif.
- **Yang boleh dilakukan agen** (`Inti.AKSI_AGEN`, `Inti.PESAN_AGEN`), dengan aturan yang sama
  dengan Ali:
  - membaca data dan obrolan;
  - pesan: kirim, ubah atau hapus pesan sendiri, reaksi, tandai beres;
  - di data real: isi output, tambah bukti, tambah atau ubah atau centang sub-task, dan aksi
    status (mulai, ajukan, selesai, tarik, tahan, lanjutkan, setujui, kembalikan, buka);
  - membuat task (`taskBaru`, sejak 2.37.0) untuk mencatat pekerjaan harian dari rekap. Server
    memeriksanya dengan aturan form Tambah task atas nama Ali: proyek aktif, sub-stage, PIC, dan
    inisiatif. Yang bertanda AI adalah aktivitas "Dibuat untuk …", lalu aksi status sesudahnya.

  Membuat proyek, paket, inisiatif, Master, PIN, dan foto, serta mengubah atau menghapus task,
  tetap dikerjakan Ali sendiri di aplikasi.
- **Tanda AI.** Server menandai pesan agen: kolom `kode` diisi `ai`, padahal untuk pesan biasa
  kolom itu selalu kosong. Aktivitas dan tinjauannya diberi `ai: true` di perubahan data real.
  Label **AI** tampil di:
  - Komunikasi (gelembung dan daftar utas);
  - jejak dan detail task;
  - Riwayat Aktivitas;
  - notifikasi.

  Isian dari browser tak bisa memasang maupun menghapus tanda ini.
- **Folder `agen/`.**
  - `klien.js`: masuk, menyusun data real seperti browser, dan menulis.
  - `laporan.js`: ringkasan pagi dan pengingat.
  - `ringkasan.js` dan `pengingat.js`: pekerjaan tanpa token untuk Agent Office.
  - `tim.js`: pekerjaan Lead (rekap tim, laporan mingguan, antrean + saran PIC, cek kerapian
    data), dijalankan `rekap-tim.js`, `mingguan.js`, `antrean.js`, dan `cek-data.js`.
    Laporan mingguan ditulis ke `agen/laporan/` (tak ikut git).
  - `task.js`, `pilihan-task.js`, dan `buat-task.js` (2.37.0): pilihan form Tambah task dibaca
    dari ProductTrack, dan butir rekap kerja harian yang sudah diterima Ali disimpan sebagai
    task. Cara pakai dan skemanya ada di `agen/README.md`.
  - `mcp.js` dan `.mcp.json`: alat untuk sesi AI.
  - `.claude/settings.json`: alat baca langsung jalan; alat tulis selalu minta persetujuan.
  - `CLAUDE.md`: aturan kerja agen.
  - Setelannya ada di `agen/.env`, salinan cepatnya di `agen/.data/`. Keduanya tak ikut git, dan
    folder `agen/` tak ikut image Docker.
- **Di Agent Office** karyawan operator **Ali** memegang folder `agen/`:
  - **Ringkasan pagi** dan **Pengingat** (tenggat, tinjauan, pertanyaan) berjalan tanpa token
    dan terjadwal. Pengingat yang tak menemukan hal baru tidak memberi notifikasi.
  - Untuk Ali sebagai Lead, juga tanpa token dan hanya membaca: **Rekap tim** (status per
    proyek & fase ADDIE, yang macet, beban per orang, task turunan), **Laporan mingguan** (HTML
    dan Markdown), **Antrean + saran PIC** (staff berbeban paling ringan; hanya saran), dan
    **Cek data tim** (tenggat, output, turunan, dan urutan tunggu yang perlu dirapikan).
  - **Ambil pilihan form task** (hanya membaca) dan **Simpan task dari rekap** (menulis task,
    tanpa token, bertanda AI), untuk rekap kerja harian. Butir yang sudah dibuat tidak dibuat dua
    kali, dan yang tidak sah ditolak dengan alasannya.
  - Tugas AI ("@Ali jawab pesan yang menunggu", "@Ali PRD-123 sudah selesai, …") memakai kredit
    API. Setiap tulisan muncul dulu sebagai kartu Izinkan/Tolak berisi isinya. Alat `buat_task`
    (dan `pilihan_task` untuk membaca pilihannya) ikut di sini.

Diuji di `test/agen.test.js`, termasuk alat MCP yang dijalankan lewat stdio sungguhan, serta
`test/agen-task.test.js` (aturan butir → task) dan `test/agen-task-e2e.test.js` (server uji lokal).

### Master & PIN profil

Sejak 0.14.0, seperti tab Master di v1: halaman **Master** (grup Manajer; Manager dan Dev)
mengatur daftar pilihan yang dipakai semua orang. Bagian **PIN profil** (PIN pribadi tiap
profil) hanya tampil dan berlaku di mode Dev (0.14.1).

- **Sub-stage**: tambah kode baru (terisi sendiri sesudah nomor terbesar di tahapnya, mis.
  DV10 atau E13), ubah nama, tim pemilik, dan "direview Manager", nonaktifkan, atau **hapus**
  (2.24.0):
  - yang bisa dihapus hanya sub-stage yang belum dipakai task di **sumber data yang dipakai
    semua orang** (2.25.0: saat data real aktif, pemakaian di data contoh tak lagi menghalangi;
    diperiksa server) dan tak ada di alur kategori paket; jendela hapusnya menjelaskan
    alasannya bila tak bisa, lalu menawarkan **Nonaktifkan**. Task data contoh yang memakai kode
    yang dihapus tetap terbaca namanya;
  - nomor sub-stage lain **tak bergeser**, dan kode yang dihapus **tak dipakai ulang**: kode adalah
    identitas yang tersimpan di task dan tertulis di judul task, Riwayat Aktivitas, komentar,
    dan pesan, jadi kode yang digeser atau dipakai ulang akan mengubah arti data lama;
  - yang dihapus tercatat di tab `master` (penanda `dihapus` di kolom `data`, tanpa kolom baru)
    dan tampil di bagian **Sudah dihapus**, tempat ia bisa **dipulihkan** dengan kode yang sama;
  - **E12** (Final approval) menutup siklus dan dirujuk langsung oleh aturan, jadi tak bisa
    dihapus, dinonaktifkan, atau dipindah.
  - **Pindahkan ke kode lain** (2.25.0, tombol panah di baris sub-stage): pengganti "hapus lalu
    tambah" kalau hanya kegiatannya yang ingin dipindah ke kode lain, termasuk ke tahap lain.
    Nama, tim pemilik, dan review Manager pindah ke kode baru (kode yang belum pernah ada, terisi
    sendiri sesudah nomor terbesar); alur kategori paket yang memakai kode lama ikut diganti.
    Kode lama dihapus kalau belum dipakai task, selain itu dinonaktifkan dan task lamanya tetap
    memakai kode lama. Server menulis barisnya berurutan (kode baru, alur, kode lama) lewat aksi
    `pindahSub`; aturannya `Inti.pindahSub`.
- **Kategori paket**: tambah kategori, susun **alur langkah** dan tanda capaiannya (konten →
  input → QC → tayang, tak boleh mundur; tayang wajib; sejak 2.26.0 satu capaian boleh di
  beberapa langkah), urutkan, nonaktifkan. Sejak 2.27.0 langkahnya diurutkan dengan
  **diseret** lewat pegangan ≡, atau tombol naik/turun. Nama kategori tetap, karena item
  paket merujuk ke nama itu.
- **Platform & satuan**: tambah, urutkan, nonaktifkan.
- **Label & bobot**: label prioritas, nama tim, serta nama dan bobot capaian (naik berurutan,
  tayang 100%).
- **PIN profil** (mode Dev saja): pasang, ganti, atau hapus PIN (4–8 angka) tiap orang. Dari
  Panel Dev → Pengguna ada pintasan **PIN profil** ke bagian ini.

Yang sudah dipakai data tidak dihapus, hanya **dinonaktifkan**: tak ditawarkan lagi di form,
tapi task dan paket lamanya tetap terbaca. Sub-stage yang belum pernah dipakai bisa dihapus
(lihat di atas). Perubahan berlaku untuk semua orang saat aplikasi
dimuat ulang.

**PIN profil.** Profil ber-PIN tampil bergembok di pemilih profil dan meminta PIN-nya. Server
mencatat profil yang sudah terbukti di cookie sesi (ikut sidik hash PIN-nya, jadi PIN yang
diganti membatalkan sesi lama), dan **menolak menulis atas nama profil ber-PIN** dari sesi lain:
pesan Komunikasi dan foto profil. Browser lalu meminta PIN itu lagi. PIN disimpan sebagai hash
scrypt bergaram di tab `pin` dan tak pernah dikirim ke browser.

**Siapa yang boleh.** Master: Dev, Manager, atau **Lead** (sejak 2.21.0, keputusan user: Lead
juga menambah, mengubah, dan menonaktifkan isian; sejak 2.29.0 diatur lewat izin `master.ubah`
di Panel Dev → Izin), yang terbukti lewat PIN-nya bila profilnya ber-PIN. Menghapus di Master =
menonaktifkan, supaya task dan paket lama yang memakainya tetap terbaca; sejak 2.24.0
sub-stage yang belum dipakai bisa benar-benar dihapus (Lead dan Manager). Selama belum ada
Manager yang ber-PIN, Master masih terbuka bagi siapa pun (seperti data prototipe lainnya);
peringatannya hanya tampil di mode Dev. PIN profil: **hanya Dev** (`aturPin` menolak sesi lain,
termasuk Manager). **Dev sebaiknya memasang PIN Manager lebih dulu.**

**Cara kerjanya.** Tab `master` berisi satu baris per isian yang diubah (`jenis`, `kunci`,
`data` JSON, `aktif`, `urutan`); bawaannya tetap di kode (`public/inti.js`). Isian diperiksa di
browser dan server (`periksaMaster`), jenis yang rusak karena diubah manual kembali ke bawaan
dengan alasannya. Aksi `simpanMaster`, `aturPin`, dan `masukProfil` di `/api/rpc`. Seperti
`obrolan` dan `foto`, tab `master` dan `pin` tak disentuh impor ulang maupun Reset data contoh.
Diuji di `test/master.test.js` dan `test/rpc.test.js`.

### Izin per peran (2.29.0)

Permintaan user: di mode Dev ada satu daftar semua yang boleh dilakukan Manager, Lead, dan Staff,
diatur dengan centang. Tab **Izin** di Panel Dev berisi tabel per kelompok (Proyek, Rancangan
Paket, Task, Pengaturan, Halaman, Ruang Saya) dengan kolom Manager, Lead, dan Staff.

- **Bisa diatur** (bawaan = aturan sebelum 2.29.0):

  | Izin | Bawaan |
  |---|---|
  | Membuat, mengubah, menghapus, mengarsipkan proyek; memulai siklus baru; keputusan proyek; menautkan proyek ke paket | Manager |
  | Membuat, membagikan (Lintas Divisi), dan mengelaborasi rancangan paket; mengatur setoran | Lead, Manager |
  | Menghapus rancangan paket | Manager |
  | Menghapus task siapa pun; mengatur urutan tunggu task tim mana pun | Manager |
  | Mengubah Master | Lead, Manager |
  | Mengelola Tautan tim | Manager |
  | Membuka Laporan | Lead, Manager |
  | Membuka Riwayat Aktivitas | Manager |
  | Mengelola Inisiatif (sementara hanya tim DAE) | Lead, Manager |
  | Menerima, bertanya, dan menolak permintaan ke tim DAE; mengatur peta jenis → inisiatif (2.46.0; hanya anggota DAE) | Lead |
  | Membuat acara bersama: mengundang peserta, atau membukanya untuk semua (2.33.0) | Staff, Lead, Manager |

- **Tetap** (tampil abu-abu, tak bisa dicentang): yang ditentukan struktur tim dan alur
  tinjauan, mis. siapa Lead tim pemilik sebuah sub-stage, siapa peninjau task, task yang boleh
  diubah staff (yang ia buat sendiri), membagi task jadi task turunan, ruang pribadi, dan
  pengaturan khusus Dev (orang, PIN profil, sumber data, izin). Mengubahnya lewat centang
  akan merusak alur ADDIE, jadi hanya ditampilkan supaya daftarnya lengkap.
- **Berlaku di mana:** di tombol dan halaman (yang tak boleh tak ditampilkan) dan di aturan
  `Inti` yang dijalankan browser dan server (`wajibIzin`), jadi tak bisa diakali dari browser.
  Pesan penolakannya mengikuti izin yang berlaku, mis. "Hanya Lead atau Manager yang membuat
  paket."; kalau tak satu peran pun dicentang: "Tak ada peran yang boleh … (diatur di Panel Dev →
  Izin)". **Dev selalu boleh** (akun teknis yang mengaturnya).
- **Tersimpan** di tab `master` sebagai `jenis` = `izin` (`kunci` = nama izin, `data` =
  `{"peran":[…]}`), tanpa tab atau kolom baru; berlaku bagi orang lain saat aplikasi dimuat
  ulang. **Hanya mode Dev** yang bisa mengubahnya (`simpanMaster` jenis `izin` ditolak untuk
  sesi lain, termasuk Manager). Di mode uji Dev perubahannya hanya di browser itu, seperti Master
  lain. Tombol **Kembalikan semua ke bawaan** muncul bila ada yang diubah.
- Katalognya `Inti.IZIN` (`kunci`, `grup`, `label`, `aksi` untuk pesan penolakan, `peran`
  bawaan, `tetap`); pemeriksaannya `Inti.izin(me, kunci)` dan `Inti.izinPeran(kunci)`. Diuji di
  `test/master.test.js` dan `test/rpc.test.js`.

### Pengembangan: inisiatif dan subinisiatif (2.31.0, 2.47.0)

Permintaan user: pekerjaan tim DAE (Data & AI Engineer) yang berjalan terus di luar rancangan
paket, seperti membangun ProductTrack v2, Product Knowledge, atau AI generate soal, perlu
dideklarasikan sekali, dan setiap pembaruannya tetap masuk sebagai task biasa. Proyek ADDIE
terlalu berat untuk itu (fase, gerbang Manager, dan E12 per siklus), jadi Inisiatif menjadi wadah
yang lebih ringan. Keputusan user: pembaruan **tanpa tinjauan**, dan **sementara khusus tim DAE**
(dan Manager).

- **Halaman Pengembangan** (grup Pekerjaan, di bawah Proyek): pohon inisiatif dengan status
  (Aktif, Ditunda, Selesai), PIC, progres task seluruh turunannya, dan permintaan terbuka.
  Klik panah untuk melipat cabang atau nama untuk membuka detail; akar terbaru diperbarui di atas. Hanya tampil untuk
  anggota tim DAE, Manager, dan Dev; alamatnya `#/inisiatif/INI-001`.
- **Hierarki (2.47.0)**: **Inisiatif baru** membuat wadah utama; **Tambah subinisiatif** di detail
  membuat anak yang boleh memiliki subinisiatif lagi. PIC awal mengikuti induk dan bisa diganti.
  Saran nama: **Generator Soal → Generator Soal OJK → Integrasi Platform Latihan**,
  **Pengumpulan Data → Scraper Media Sosial → Scraper X**, dan
  **Aplikasi Internal → ProductTrack → Manajemen Task**. Nama tetap bisa disesuaikan.
- **Pindahkan pekerjaan lama** lewat **Ubah → Inisiatif induk**, termasuk seluruh cabangnya;
  ID, task, komentar, dan tautan tetap sama. Pilihan tingkat utama melepaskan hubungan induk.
  Nama tujuan task/acara/permintaan menampilkan jalur lengkap untuk membedakan wadah bernama sama.
  Status dan PIC tiap wadah mandiri; perubahan induk tidak otomatis mengganti nilai anaknya.
- **Agregasi**: detail menampilkan task seluruh turunan secara bawaan, termasuk riwayat,
  telat, angka kerja, dan permintaan terbuka. **Di sini saja** membatasi ringkasan dan pembaruan
  ke task langsung. Task hanya dihitung sekali dalam satu ringkasan; hitungan global tetap berasal
  dari koleksi task. Wadah yang masih memiliki subinisiatif tidak dapat dihapus. Siklus dan
  induk dari tim lain ditolak dengan aturan yang sama di browser dan server.
- **Pindahkan (2.48.0)**: tombol **Pindahkan inisiatif** membawa wadah beserta seluruh cabang
  dan isinya ke induk pilihan. Contoh: ProductTrack → ProdukApp; task tetap di ProductTrack.
  Untuk memindahkan isi tertentu, gunakan **Pindahkan pembaruan**, pilih tujuan, lalu centang
  task. Daftar mengikuti cakupan **Termasuk turunan / Di sini saja**, mencakup semua status
  dan pembaruan lama, meski belum ditampilkan di linimasa. Pencarian mencocokkan judul, ID,
  dan jalur asal; **Pilih hasil pencarian** hanya mengubah centang hasil yang terlihat.
  Centang lain tetap dipertahankan dan masuk hitungan; **Kosongkan** melepas seluruh pilihan.
  Tombol **Pindahkan** pada satu pembaruan langsung memilih task itu. Tujuan boleh inisiatif
  Aktif atau Ditunda; yang Selesai perlu diaktifkan kembali. **Batal** tidak mengubah data.
  Maksimal 200 task sekali pindah, dengan izin PIC/Lead/Manager yang sama seperti detail task.
  Hanya task yang dicentang dipindahkan; wadah dan relasi task tetap ada. ID, status, tanggal
  selesai, output, komentar, ceklis, dan bukti tidak berubah. Permintaan DAE mengikuti task
  tanpa melewati tinjauan pengirim. Seluruh pilihan disimpan sebagai satu perintah
  `pindahPembaruan`, atau ditolak seluruhnya jika ada masalah izin, tujuan, atau lokasi asal
  yang berubah sejak form dibuka. Task yang sudah di tujuan dilewati tanpa log tambahan.
- **Deklarasi**: nama, tujuan, PIC (anggota tim DAE), dan tautan (satu per baris, "Judul |
  https://…"). Yang boleh: Lead DAE dan Manager, lewat izin `inisiatif.kelola` (Panel Dev →
  Izin). Inisiatif yang sudah punya task tak bisa dihapus; tandai **Selesai** supaya riwayatnya
  tetap, dan inisiatif yang selesai tak menerima pembaruan baru.
- **Pembaruan = task biasa**: tombol **Tambah pembaruan** membuka form Tambah task di jalur **Pembaruan**
  dengan inisiatifnya terpilih (boleh tanpa jenis rutin). Task-nya tanpa tinjauan (PIC langsung
  menandai selesai), tak terkena fase atau gerbang ADDIE, dan tetap terhitung di Hari Ini, beban,
  Dashboard, Laporan, dan telat. Form Tambah task biasa juga punya pilihan **Pembaruan untuk** di jalur
  **Pembaruan**.
- **Tautan pembaruan (2.49.0)**: form **Tambah pembaruan** menyediakan **Tautan hasil kerja
  (opsional)** dan **Label tautan (opsional)**, misalnya dokumen hasil scraping atau dashboard.
  Kosong tetap boleh; label kosong memakai nama layanan/domain. Tautan tersimpan bersama task
  sebagai bukti dan muncul pada **Sedang berjalan**, **Riwayat pembaruan**, serta **Hasil kerja**
  di detail task. Untuk task yang sudah ada atau lebih dari satu tautan, kelola dari **Hasil kerja**.
  Alamat tanpa skema dilengkapi `https://`; alamat tidak valid ditolak sebelum membuat task.
  Berlaku juga untuk form Pembaruan proyek. Menggunakan penyimpanan bukti yang sudah ada.
- **Kabar untuk Manager (2.50.0)**: task pembaruan yang baru dibuat atau selesai masuk lonceng,
  menyebut jalur lengkap tujuan. Menu Pengembangan, pohon induk/anak, dan task menampilkan
  jumlah/penanda **belum dibaca**. Ringkasan mengarah ke inisiatif tepat, termasuk cabang
  terlipat atau di luar saringan status; task turunan hanya dihitung sekali di menu.
  Klik kabar membuka task di inisiatifnya dan menandai kabar itu dibaca. **Tandai dibaca**
  pada task atau **Tandai N pembaruan dibaca** dalam detail mengikuti cakupan **Di sini saja /
  Termasuk turunan**. Membuka lonceng/daftar saja tidak menghapus penanda. Ini terpisah dari
  **Belum ditanggapi**; membaca tidak menambah komentar. Status baca tersimpan per profil dan
  sumber data di browser (belum tersinkron antarperangkat), termasuk setelah muat ulang dan
  di tab lain. Awalnya mencakup 30 hari terakhir; kabar berikutnya bertahan sampai dibaca.
  Satu kabar terakhir per task: edit biasa/komentar tidak menambah kabar, tindakan Manager
  sendiri diabaikan, dan memindahkan task tidak mengulang kabar yang sudah dibaca.
- **Detail inisiatif**: pembaruan yang sedang berjalan, dan **Riwayat pembaruan** (yang selesai,
  terbaru di atas, dengan output-nya) seperti changelog.
- **Hapus pembaruan (2.46.2)**: tombol **Hapus** tersedia langsung pada task di **Sedang berjalan**
  dan **Riwayat pembaruan**, sesuai izin hapus task yang sudah berlaku. Konfirmasi menyebut task
  dan data terkait yang ikut dihapus; **Batal** tidak mengubah data. Wadah inisiatif tetap ada,
  termasuk saat pembaruan terakhir dihapus, dan ringkasannya dihitung ulang dari task yang tersisa.
- **Linimasa dan tanggapan (2.39.0, permintaan user).** User menilai detail inisiatif "masih
  sangat jelek" dan ingin Manager bisa mengomentari pembaruan. Sesudah kanvas rekomendasi, user
  memilih Opsi A (linimasa harian) dengan komentar Manager:
  - kepala ringkas: meta (ID, tim, PIC, status), nama, tujuan (atau ajakan mengisinya), dan tombol
    berukuran biasa (Ubah, Tambah pembaruan);
  - empat ubin: pembaruan 30 hari, commit dan sesi kerja 7 hari (kalau pembaruannya mencatat angka
    itu; selain itu yang berjalan dan telat), dan terakhir diperbarui;
  - pembaruan selesai dikelompokkan per hari (Hari ini, Kemarin, lalu tanggal) dengan jumlah
    pembaruan, commit, file, dan sesi hari itu; paling banyak lima per hari sebelum "Tampilkan …
    lain", dan 40 pembaruan sebelum "lebih lama";
  - tiap pembaruan: ID dan jam selesai, judul tanpa awalan nama inisiatif ("Agent AI: …" di
    inisiatif "Agent AI (…)"), ringkasan keterangan, chip angka kerja dari kolom output ("7 commit,
    1 sesi Claude Code"), tautan bukti, dan tiga pesan terakhir diskusinya;
  - kolom samping: Tentang (tim, PIC, tanggal deklarasi, tautan), Sedang berjalan, dan Acara;
  - **Tanggapi**: tanggapan cepat (Bagus, Perlu dibahas, Pertanyaan; ditulis tebal di awal pesan)
    dan/atau teks, dengan **Perlu jawaban {PIC}** (tercentang sendiri untuk Pertanyaan dan Perlu
    dibahas). Disimpan sebagai pesan di ruang diskusi task pembaruannya, jadi tak ada jenis data
    baru: tampil juga di tab Diskusi task dan Komunikasi, PIC diberi tahu lewat notifikasi pesan
    atau "menunggu jawaban", dan pesan Manager bertanda **Manager**. PIC sendiri hanya melihat
    **Balas** di pembaruan yang sudah ada pesannya;
  - saringan **Semua · Ada tanggapan · Belum ditanggapi** (tanggapan = pesan orang selain PIC);
  - di daftar Inisiatif, Manager melihat **n pembaruan belum Anda tanggapi** (30 hari terakhir).
  Aturannya `Inti.angkaKerja`, `judulPembaruan`, `linimasaInisiatif`, `tanggapanPembaruan`,
  `belumDitanggapi`, dan `ringkasInisiatif` (`angka7`, `adaAngka`); diuji di `test/linimasa.test.js`.
- **Task lama** di luar proyek bisa ditempel ke inisiatif (atau dilepas) dari pilihan
  **Pembaruan untuk** (dulu **Inisiatif**) di detail task-nya. Task proyek tak bisa ditempel.
- **Data**: tab `inisiatif` dan `inisiatif_links` (opsional; spreadsheet lama tetap terbaca) dan
  kolom `inisiatif` di tab `tasks`; koleksi `inisiatif` ikut data real; tabel `v2_inisiatif`,
  `v2_inisiatif_links`, dan kolom `v2_tasks.inisiatif` di MySQL (kini 27 tabel). Aturannya
  `Inti.inisiatifBaru`, `ubahInisiatif`, `hapusInisiatif`, `tempelInisiatif`,
  `ringkasInisiatif`; tim yang memakainya `Inti.TIM_INISIATIF` (`['SI']`). Diuji di
  `test/inti.test.js`, `test/demo.test.js`, dan `test/sheets.test.js`.
  Sejak 2.47.0, `inisiatif.induk` menyimpan ID induk; kosong atau belum ada berarti tingkat utama.
  Data real tetap memakai jurnal `data_real`, tanpa impor ulang. Helper `jejakInisiatif`,
  `namaJalurInisiatif`, `anakInisiatif`, `turunanInisiatif`, dan `urutInisiatif` mendukung hierarki;
  `ringkasInisiatif(data, x, hari, true)` membatasi ke task langsung. Tes: `test/pengembangan.test.js`.

### Proyek umum (2.51.0)

Permintaan user: proyek di luar rancangan paket untuk semua tim, misalnya "cari guru", karena
proyek ADDIE terlalu berat untuk pekerjaan seperti itu dan Pengembangan khusus pekerjaan
berkelanjutan tim DAE. Keputusan user (sesudah kanvas rekomendasi): **tahap bebas** yang tak
menahan, task **ditinjau Lead**, pembuatnya **Lead (untuk timnya) dan Manager**, tampilan **Opsi A
daftar per tahap**, dengan Papan dan Linimasa sebagai pilihan tampilan lain seperti di halaman Task.

- **Jenis proyek** (`p.jenis = 'umum'`; kosong = proyek ADDIE). Form **Proyek baru** bertanya
  "Proyek ini untuk apa?": ADDIE (izin `proyek.buat`, bawaan Manager) atau Umum (izin baru
  `proyek.buatUmum`, bawaan Manager dan Lead). Lead hanya membuat untuk timnya sendiri; Manager
  memilih tim pemiliknya. Isiannya: tim lain yang ikut (`timProyek`, pemilik dulu), Lead proyek
  (Lead salah satu tim yang terlibat, atau Manager), tenggat proyek (`tenggat`), dan tahap
  (`tahapUmum` = `[{ id, nama }]`, paling banyak 12, bisa mulai dari templat Rekrutmen, Acara, atau
  Kerja sama, dinaikkan dan dihapus). Tahap boleh kosong.
- **Tanpa ADDIE:** tanpa sub-stage, fase, gerbang Manager, siklus, dan E12. Tahap proyeknya tak
  dihitung ulang (`segarkanTahap` melewatinya), tak masuk antrean keputusan, dan semua task selesai
  berarti keadaan **Semua task selesai** (`tuntas`), bukan "tak ada task terbuka". Rancangan paket
  tak ditautkan.
- **Task Proyek umum** = task proyek biasa (lane proyek, `stage` dan `sub` kosong, `tahapProyek` =
  ID tahap atau kosong): hasil kerja, ceklis, bukti, diskusi, dan task turunan seperti
  biasa (Atur urutan tunggu tetap khusus proyek ADDIE). Staff mengajukan, Lead-nya menyetujui; task Lead ditinjau Manager. PIC: staff
  untuk dirinya (bila timnya terlibat), Lead untuk timnya dan Lead tim lain yang terlibat
  (`Inti.pilihanPicUmum`), Manager siapa pun. Task-nya ditambah dari halaman proyeknya (form
  **Tambah task** tanpa sub-stage, dengan pilihan Tahap); form Tambah task umum di halaman Task
  hanya menawarkan proyek ADDIE. Lanjutan dari task Proyek umum masuk ke tahap yang sama.
- **Halaman Proyek umum:** kepala (Umum, ID, tim, Lead, keadaan, tujuan, Tambah task, Ubah, menu
  ⋯ dengan Duplikat, Tunda/Lanjutkan, Arsipkan, Hapus), kemajuan (task selesai, terlambat,
  tertahan, tenggat proyek), jalur tahap (selesai per tahap; tahap pertama yang masih punya task
  terbuka disorot; klik melompat ke bagiannya), dan pilihan tampilan (diingat per browser):
  - **Daftar** (bawaan): satu bagian per tahap, lalu **Tanpa tahap**, dengan baris task biasa dan
    **+ Tambah task di …**; tahap yang tuntas dilipat.
  - **Papan**: kolom per tahap; kartu diseret ke tahap lain (`pindahTahapUmum`), status tetap
    lewat tombol task.
  - **Linimasa**: batang task dari mulai sampai tenggat, dikelompokkan per tahap, 35 hari, geser
    per minggu.
  - Samping: **Perlu perhatian Anda** (tinjauan Anda dan yang terlambat), **Diskusi proyek** (ruang
    proyek di Komunikasi, tiga pesan terakhir; tempat Manager menanggapi proyek), Tentang, dan
    Acara.
- **Yang mengelola** (`Inti.bolehKelolaUmum`): Lead proyek, Lead tim pemilik, dan Manager: ubah
  proyek (nama, tim, Lead, tenggat, tahap; task di tahap yang dihapus jadi tanpa tahap), tunda,
  arsipkan. Hapus proyek tetap izin `proyek.hapus`. Di detail task, tahap bisa dipindah oleh PIC,
  Lead-nya, Lead proyek, atau Manager. Baris dan kartu task menulis nama tahapnya.
- **Data**: kolom `jenis`, `timProyek` (dipisah koma), `tahapUmum` (JSON), dan `tenggat` di tab
  `projects` dan `v2_projects`; kolom `tahapProyek` di tab `tasks` dan `v2_tasks`. Aturannya
  `Inti.proyekBaru` (→ `proyekUmumBaru`), `ubahProyek` (→ `ubahProyekUmum`), `taskBaru` (→
  `taskUmumBaru`), `pindahTahapUmum`, `ringkasProyekUmum`, `rapikanTahapUmum`; diuji di
  `test/proyek-umum.test.js` dan `test/sheets.test.js`.

### Pembaruan proyek (2.45.0)

Permintaan user: tim DAE sering membuat task rutin yang sebenarnya pembaruan inisiatif atau
proyek yang berjalan terus, dan ingin pilihan menyambungkan task itu sebagai pembaruan, tetap
dengan hasil kerja, ceklis pengerjaan, dan diskusi supaya Manager bisa mengomentarinya. Untuk
inisiatif semua itu sudah ada (2.31.0, 2.39.0); yang baru adalah proyek. Pilihan user: **tab
Pembaruan di proyek**, **sementara khusus tim DAE dan Manager** (sama dengan Inisiatif).

- **Pembaruan untuk**: di form Tambah task, jalur **Inisiatif** kini bernama **Pembaruan**
  ("Pembaruan inisiatif atau proyek yang berjalan terus"), dan pilihannya berisi dua kelompok:
  inisiatif yang belum selesai dan proyek yang tak diarsipkan. Pilihan yang sama ada di detail
  task di luar proyek, untuk menyambungkan task lama, memindahkannya, atau melepasnya. Satu task
  disambungkan ke satu tempat: inisiatif atau proyek.
- **Tetap task rutin** (`t.pembaruanProyek` = ID proyek, `t.project` tetap kosong): tanpa
  sub-stage proyek, tanpa tinjauan (PIC langsung menandai selesai), dan tak menggeser fase,
  progres siklus, label terlambat proyek, maupun E12. Tetap terhitung di Hari Ini, beban,
  Dashboard, Laporan, dan telat. Hasil kerja, ceklis, bukti, dan tab Diskusi-nya sama dengan task
  lain, kecuali setoran ke rancangan paket (seperti pembaruan inisiatif). Kepala detail task
  menulis "Pembaruan proyek · nama proyek" yang membuka tab Pembaruan.
- **Tab Pembaruan** di halaman proyek (sesudah tab tim): tampil bila proyek itu sudah punya
  pembaruan, atau bagi tim DAE dan Manager selama proyeknya tak diarsipkan. Isinya tombol **Tambah
  pembaruan**, angka terbuka/telat/selesai 30 hari, yang sedang berjalan, dan linimasa per hari
  yang sama dengan halaman Inisiatif: angka kerja dari output, bukti, tiga pesan terakhir, saringan
  Ada tanggapan/Belum ditanggapi, dan **Tanggapi** (tanggapan cepat, Perlu jawaban). Bagi Manager,
  tab itu bertanda bila ada pembaruan 30 hari terakhir yang belum ia tanggapi.
- **Hapus proyek** tak menghapus pembaruannya: sambungannya dilepas dan task-nya tetap ada
  (jendela hapus menyebut jumlahnya).
- **Data**: kolom `pembaruanProyek` di tab `tasks` dan `v2_tasks` (FK ke `v2_projects`, ON DELETE
  SET NULL). Aturannya `Inti.bolehPembaruanProyek`, `sambungProyek` (aksi data `sambungProyek`),
  `pembaruanProyek`, `ringkasPembaruanProyek`, dan `ringkasPembaruan` (dipakai bersama
  `ringkasInisiatif`). Diuji di `test/pembaruan-proyek.test.js`.
- Membuka untuk tim lain berarti mengubah `Inti.TIM_INISIATIF` (berlaku juga untuk Inisiatif);
  belum bisa diatur di Panel Dev → Izin, karena izin di sana per peran, bukan per tim.

### Persetujuan beberapa task oleh Manager (2.50.0)

Di **Hari Ini**, **Task**, atau daftar **Proyek**, tekan **Setujui beberapa task**. Daftarnya
mencakup task **Ditinjau** yang boleh disetujui Manager dengan aturan persetujuan tunggal.
Cari judul/ID/PIC/proyek; buka **Lihat hasil kerja** untuk membaca output, keterangan, dan bukti.
Centang task yang telah diperiksa, lalu **Setujui N task**. Hanya pilihan itu menjadi Selesai.
**Pilih hasil pencarian** berlaku pada baris terlihat; pilihan yang tersembunyi tetap ikut dan
dihitung. **Kosongkan** melepas seluruh pilihan, **Batal** menutup tanpa menyetujui apa pun.

Maksimal 200 task sekali proses. Satu perintah `setujuiBanyak` memeriksa seluruh izin/status
dan versi task sebelum perubahan; task hilang, berubah, atau tak lagi berizin membatalkan
seluruh pilihan. Tiap task memakai aksi persetujuan yang sama: riwayat tinjauan, log, waktu
selesai, notifikasi PIC, dan progresnya tetap diperbarui. Pengulangan ID perintah yang sama
tidak menggandakan persetujuan. Task permintaan yang ditinjau tim peminta tetap dipantau
Manager dan tidak masuk pilihan ini. Lead, Staff, dan akun Dev tidak memakai aksi massal ini.

### Banding perpanjangan tenggat (2.41.0)

Permintaan user: fitur mengajukan banding supaya tenggat diperpanjang, langsung ke pemberi task.

- **Mengajukan**: PIC task yang belum selesai dan bertenggat menekan **Minta perpanjangan
  tenggat** (di samping tenggat pada detail task, dan **Minta perpanjangan** di baris task
  terlambat pada Hari Ini), memilih tenggat baru (sesudah tenggat sekarang dan tidak lewat), dan
  menulis alasannya. Satu pengajuan menunggu per task; pengaju bisa membatalkannya.
- **Ke siapa** (`Inti.pemberiTask`): pemberi task (yang membuat atau menyerahkannya). Task yang
  dibuat PIC sendiri, atau pemberinya di luar organogram, diajukan ke Lead-nya; Lead yang membuat
  task sendiri ke Manager. Manager tak perlu mengajukan. **Task hasil permintaan ke tim DAE
  (2.46.0)** diajukan ke **pengirim permintaannya**, dengan rantai cadangan yang sama dengan
  peninjau (pengirim → Lead tim peminta → anggota aktif lain tim peminta); tak pernah ke
  Manager. Kalau tak ada siapa pun, pengajuan ditolak dengan pesan jelas. Pengajuan yang sudah
  menunggu tetap ke penerima awalnya; kalau ia keburu tak aktif, pengaju membatalkannya dan
  mengajukan lagi.
- **Menjawab**: yang dituju (atau Manager) melihat kartu **Pengajuan perpanjangan tenggat** di Hari
  Ini, notifikasi, dan spanduk di detail task. **Setujui** boleh dengan tanggal lain dan catatan;
  tenggat task baru berubah saat disetujui. **Tolak** wajib beralasan. PIC diberi tahu. Pengajuan
  untuk task hasil permintaan ke DAE (`perpanjangan.permintaanDae`) **hanya dijawab yang dituju**:
  Manager hanya mengawasi, jadi tak ikut menjawab.
- **Data**: koleksi `perpanjangan` (ID `PJG-001`; status menunggu → disetujui, ditolak, atau batal;
  `dueJadi` = tanggal yang disetujui; `permintaanDae` sejak 2.46.0) ikut data real, tab
  `perpanjangan` (opsional), dan tabel `v2_perpanjangan` (29 tabel). Jejaknya juga di Riwayat task. Aturannya `Inti.ajukanPerpanjangan`,
  `jawabPerpanjangan`, `batalkanPerpanjangan`, `panjangMasuk`; diuji di `test/perpanjangan.test.js`.

### Permintaan lanjutan lintas tim (2.36.0)

Permintaan user: dari task yang sudah selesai, minta orang lain (lintas tim) membuat task
lanjutannya; contohnya Andika selesai membuat rancangan lalu meminta Ali membuat prototype.
Gambaran sebelum–sesudahnya dibuat dulu di kanvas, lalu user memilih: penerima menerima dulu,
semua profil boleh meminta, dan permintaan boleh ke siapa pun dengan Lead-nya ikut tahu.

- **Meminta.** Di task yang **selesai** atau sudah **diajukan** (Ditinjau), PIC-nya, Lead-nya,
  atau Manager menekan **Minta lanjutan** (di kartu Langkah berikutnya dan di bagian
  **Permintaan lanjutan** tab Kerjakan). Isinya: untuk siapa (tim mana pun, tim sendiri juga),
  yang dibutuhkan, rincian, saran sub-stage (tim penerima di atas; boleh dikosongkan), dan
  tenggat harapan. Proyek dan tautan ke task asal ikut terlampir.
- **Penerima** mendapat notifikasi dan kartu **Permintaan masuk** di Hari Ini, lalu memilih:
  - **Terima**: memilih PIC (Lead boleh langsung memberikannya ke staff timnya), sub-stage, dan
    tenggat. Task-nya masuk Antre di proyek dan siklus task asal, dengan aturan task baru biasa
    (staff hanya untuk dirinya dan sub-stage timnya). Kalau task asal belum disetujui, task baru
    menunggunya. Di detail task baru tertulis "Diminta Andika dari PRD-…".
  - **Ditinjau tim peminta** (2.38.0, permintaan user): saat task itu diajukan, yang menyetujui
    atau mengembalikan adalah Lead tim peminta, bukan Lead pengerjanya atau Manager; Manager
    hanya memantau (tak bisa menyetujuinya). Contoh user: DAE membuat generator dari hasil kerja
    RAD, maka Andika (RAD) yang menyetujui task Ali. Peminta staff: Lead-nya yang meninjau. Tetap
    aturan biasa untuk sub-stage yang direview Manager, permintaan di dalam tim sendiri, dan task
    turunannya. Penandanya kolom `diminta` di task (orang yang meminta; `v2_tasks.diminta` di
    MySQL), diisi saat diterima; aturannya `Inti.peninjauMinta` di dalam `Inti.peninjau`.
    Permintaan yang diterima sebelum 2.38.0 tak punya penanda itu, jadi tetap ke peninjau lama.
  - **Tolak**: alasan wajib, dikirim ke peminta.
  - **Tanya**: membuka obrolan task asal dengan peminta sudah disebut di kotak tulis.
- **Lead tim penerima** ikut melihat permintaan untuk staff-nya di Hari Ini (dan notifikasinya),
  boleh menjawabnya, atau **Alihkan** ke dirinya atau staff lain (penerima lama dan peminta diberi
  tahu). Permintaan yang 2 hari kerja (Senin–Jumat) belum dijawab muncul di **Perlu perhatian**
  Dashboard untuk lingkup penerimanya, dan kartunya memberi tanda.
- **Peminta** melihat semua permintaannya di bagian **Permintaan lanjutan** task asal (menunggu,
  diterima dengan tautan task barunya, ditolak beserta alasannya), diberi tahu saat dijawab, bisa
  **Batalkan** selama belum dijawab, dan **Kirim ulang** yang ditolak ke orang lain.
- **Data**: koleksi `permintaan` (ID `MNT-001`, tak pernah dihapus; status menunggu → diterima,
  ditolak, atau batal) ikut data real (`KOLEKSI_REAL`), tab `permintaan` (opsional), dan tabel
  `v2_permintaan` di MySQL (kini 28 tabel). Salinan cepat data real di browser kini mencatat
  koleksi yang dikenalnya: salinan dari versi lama yang belum mengenal `permintaan` disusun ulang
  dari awal sekali, supaya permintaan yang dibuat sebelum browser itu diperbarui tak terlewat.
  Aturannya `Inti.mintaLanjutan`, `terimaPermintaan`, `tolakPermintaan`, `batalkanPermintaan`,
  `alihkanPermintaan`, `permintaanMasuk`, `mintaLama`; notifikasinya di `Inti.notifikasi`
  (`minta`, `mintaTim`, `mintaTerima`, `mintaTolak`, `mintaAlih`). Diuji di
  `test/permintaan.test.js`. Panduan: **Meminta lanjutan ke tim lain** (tab Staff).

### Permintaan ke tim DAE (2.46.0)

Permintaan user: anggota tim lain butuh DAE membangun generator soal, scraper, atau dashboard dari
hasil proyeknya, tetapi tak ada jalurnya. Rancangan disetujui lewat pratinjau; tambahan user:
hasil kerja DAE **wajib ditinjau pengirim permintaan**, dan **Manager hanya mengawasi**.

**Alur**

1. **Mengirim.** Di detail proyek, **Minta ke tim DAE** (di bawah judul). Boleh: Lead dan staff
   sebuah tim yang punya task di proyek itu (semua siklus dan status; gerbang Manager tak
   dihitung), selama proyeknya tak diarsipkan. Tidak boleh: anggota DAE (membuat task biasa),
   Manager, dan Dev. Isian: yang diminta, jenis (Generator soal, Scraper, Dashboard, Lainnya),
   kebutuhan, bahan riset (`Judul | https://…` satu per baris), tenggat yang diharapkan. Tercatat
   `MDA-nnn` dengan proyek asal, tim peminta, pengirim, dan status **menunggu**.
2. **Halaman Permintaan** (Pekerjaan, di bawah Inisiatif): untuk anggota DAE, Manager, dan Dev,
   dengan lencana jumlah yang menunggu dan saringan Menunggu (termasuk Ditanya) · Diterima
   (termasuk Selesai) · Ditolak. Panel detail memuat kebutuhan, bahan riset, proyek asal, dan
   diskusi. Yang berizin `permintaan.terima` melihat tiga aksi:
   - **Terima, buat task**: inisiatif (terisi dari peta jenis, hanya yang **Aktif**, boleh
     diganti; jenis yang belum dipetakan = kosong dan wajib dipilih), PIC (anggota DAE), tenggat
     (bawaan: tenggat yang diharapkan). Terbentuk task DAE di jalur rutin yang menempel ke
     inisiatif itu, berjudul sama dengan permintaan, berketerangan kebutuhan + bahan riset,
     bertaut ke permintaan (`t.permintaanDae`) dan proyek asal (lewat permintaannya).
     **Cari inisiatif (2.49.0)** menyaring tujuan berdasarkan nama, subinisiatif, jalur, atau ID;
     misalnya `Generator SKD`. Jalur lengkap membedakan anak bernama sama. Jumlah hasil terlihat;
     kosongkan pencarian untuk melihat semua tujuan Aktif. Pilihan saat ini tetap dipertahankan
     meski di luar hasil, diberi penanda, dan tidak otomatis diganti hasil pertama. PIC dan tenggat
     tetap terjaga, termasuk ketika ukuran layar berubah. Enter di pencarian hanya memindahkan
     fokus ke pilihan tujuan; penerimaan tetap melalui **Terima, buat task**.
   - **Tanya dulu**: butir **tanya** di diskusi permintaan; status **ditanya** sampai pengirim
     membalas (kembali **menunggu**). Selama menunggu atau ditanya, pengirim bisa **Sunting**.
   - **Tolak**: alasan wajib; pengirim diberi tahu. Tak ada yang bisa dilakukan sesudahnya.
3. **Peta jenis → inisiatif**: tombol **Peta jenis → inisiatif** di halaman Permintaan (izin
   `permintaan.peta`). Disimpan di inisiatifnya (`inisiatif.menerima`, daftar jenis), satu jenis
   satu inisiatif, jadi ikut data contoh dan real tanpa tempat penyimpanan lain. Tampil sebagai
   **Menerima permintaan** di Tentang inisiatif dan jadi bawaan saat menerima.
4. **Pengerjaan dan tinjauan oleh peminta.** Task dari permintaan memakai syarat ajukan seperti
   task proyek (output terisi, ceklis, task turunan, tidak tertahan) dan **tidak bisa langsung
   ditandai selesai**: PIC mengajukan, peninjaunya pengirim permintaan (`Inti.peninjauDae`; kalau
   pengirim tak bisa, lihat "Siapa yang meninjau" di bawah). Pengirim diberi tahu dan task masuk
   **Hari Ini**-nya ("Perlu Anda tinjau"). Pilihannya:
   - **Setujui**: task **Selesai**, permintaan **selesai**, output dan tautan bukti PIC tampil di
     blok proyek asal.
   - **Kembalikan untuk revisi**: catatan wajib; task kembali **Dikerjakan** dengan label Revisi dan
     catatannya di kartu Langkah berikutnya, PIC dikabari, `revisi` pada permintaan bertambah.
     Bisa berulang.
   PIC **tidak** bisa menyetujui task-nya sendiri. Manager **tidak** meninjau dan tidak
   menyetujui (tombolnya tak tersedia, juga lewat Kanban); ia hanya melihat dan **berkomentar**
   di permintaan. Dibuka kembali (`Buka kembali`), permintaan kembali ke Diterima sampai disetujui lagi.
5. **Pemantauan peminta.** Blok **Permintaan ke tim lain** di proyek asal (semua permintaan
   proyek itu): langkah Dikirim → Diterima → Dikerjakan → Ditinjau → Selesai, ditambah **Ditanya**,
   **Revisi** (dengan catatan terakhir), atau **Ditolak** (dengan alasan); PIC DAE, tenggat,
   inisiatif, hasil kerja, dan tombol **Balas**, **Sunting**, **Setujui**, **Kembalikan untuk
   revisi**. Langkah dihitung dari task-nya (`Inti.langkahMintaDae`), jadi tak mungkin
   menyimpang dari status task. PIC dan inisiatif yang tampil mengikuti task-nya: diserahkan ke
   orang lain atau dipindah inisiatif, permintaannya ikut (`m.pic`, `m.inisiatif`), begitu juga
   hitungan "N permintaan terbuka".
6. **Di inisiatif**: task dari permintaan bertanda **Diminta dari <proyek> · <tim>** (tertaut ke
   proyek) di Sedang berjalan, riwayat pembaruan, dan kepala detail task; kartu inisiatif
   menampilkan **N permintaan terbuka** (belum dijawab dan dipetakan ke sana, ditambah yang
   diterima ke sana dan belum selesai) bagi inisiatif yang menerima jenis permintaan. Task dari
   permintaan tak bisa dilepas dari inisiatif atau disambungkan ke proyek (boleh dipindah ke
   inisiatif lain).
7. **Notifikasi** (lonceng, dihitung dari data): `daeBaru` (Lead DAE), `daeTanya` (pengirim),
   `daeBalas` (Lead DAE), `daeKomentar` (pengirim dan Lead DAE), `daeTolak`, `daeTerima`
   (pengirim), `daeSelesai` (Lead yang menerima dan pengirim, selain penyetujunya dan PIC),
   `daeUbah` (pengirim: task-nya dihapus sehingga permintaan kembali Menunggu, dipulihkan, atau
   yang sudah ia setujui dibuka kembali; berasal dari butir *catatan* di diskusi permintaan); siap
   ditinjau, revisi, dan disetujui memakai `tinjau`, `kembali`, dan `setuju` yang sudah ada.
   `tinjau` kini **satu notifikasi per pengajuan**: hanya pengajuan terakhir yang sedang ditinjau
   (dulu, sesudah satu putaran revisi peninjau menerima dua; perbaikan ini berlaku untuk semua
   tinjauan, task proyek termasuk, dan satu pengajuan tetap menghasilkan notifikasi yang sama).
8. **Pengawasan.** Hasil permintaan yang menunggu tinjauan tapi belum punya peninjau aktif (lihat di
   bawah) tampil sebagai **Menunggu peninjau · dipantau** di **Hari Ini** Lead DAE dan Manager,
   dan sebagai peringatan "Belum ada peninjau aktif di tim X" di detail task, kartu proyek asal,
   dan halaman Permintaan. Keduanya hanya melihat: tombol Setujui/Kembalikan tidak ada bagi siapa
   pun selama peninjaunya kosong.

**Izin** (Panel Dev → Izin, grup *Permintaan ke DAE*): `permintaan.terima` dan `permintaan.peta`
bisa diatur, bawaannya **Lead**, dan hanya berlaku bagi anggota DAE (Lead tim lain punya peran
Lead tetapi bukan anggota DAE). **Manager tidak pernah** menerima, bertanya, menolak, atau
memetakan: kedua izin itu bertanda `tanpaManager`, kolom Manager-nya tak bisa dicentang di Panel
Dev, dan centangnya dibuang saat disimpan maupun dibaca dari baris lama di tab master.
`permintaan.kirim` dan `permintaan.tinjau` tetap: mengikuti struktur tim dan alur tinjauan.

**Keputusan yang diambil sendiri**

- *Siapa yang meninjau (diubah sesudah QA):* rantainya **pengirim → Lead tim peminta → anggota
  aktif lain tim peminta**, yang terlibat di proyek asal (PIC atau pendukung salah satu task
  proyek itu) didahulukan, selebihnya menurut urutan organogram. **Tidak pernah Dev, Manager,
  atau PIC task itu sendiri.** Dulu rantai terakhirnya akun Dev, tetapi di data real akun Dev
  tak bisa menulis, jadi tinjauannya buntu. Peninjau **dihitung ulang setiap dibaca**, jadi
  mengikuti organogram saat task diajukan dan saat ditinjau, tak hanya saat Terima (pengirim atau
  Lead yang dinonaktifkan sesudah diterima tidak menjebak task-nya). Tim peminta = tim yang
  tercatat di permintaan saat dikirim. Saat menerima, PIC yang membuat tak ada peninjau sah
  tetap ditolak ("Pilih PIC lain").
- *Kalau tak ada peninjau sama sekali:* task **tetap bisa diajukan dan tetap Ditinjau**, tidak
  pernah bisa ditandai selesai begitu saja, dan tak ada yang bisa menyetujuinya. Tampil
  peringatan jelas "Belum ada peninjau aktif di tim X" (detail task, kartu di proyek asal,
  halaman Permintaan), dan **Lead DAE serta Manager melihatnya di Hari Ini sebagai bahan
  pengawasan**, tanpa tombol menyetujui. Begitu ada anggota aktif di tim peminta (mis. Dev
  mengaktifkan lagi atau menambah orang), peninjaunya muncul sendiri dan task masuk Hari Ini-nya.
- *Output wajib sebelum diajukan:* pengirim meninjau hasilnya, jadi keterangan hasil harus ada.
- *Permintaan tak dibatalkan atau dihapus oleh pengirim:* ia menyunting selama belum dijawab;
  yang salah ditolak Lead DAE. Permintaan tak pernah dihapus.
- *Task yang dihapus:* permintaan yang masih berjalan kembali **menunggu** (dengan catatan di
  diskusinya, dan pengirim diberi tahu) dan bisa diterima lagi; yang sudah selesai tetap selesai.
- *Task yang dipulihkan (diubah sesudah QA):* **tetap tertaut ke permintaannya dan tetap wajib
  ditinjau pengirim**, tidak lagi menjadi rutin biasa (dulu itu melewati tinjauan: Lead DAE
  bisa menandainya selesai sendiri). Ia kembali ke inisiatif semula (atau yang dipilih), yang
  sedang ditinjau tetap Ditinjau, dan permintaannya disejajarkan: permintaan yang tadi
  menunggu kembali **Diterima** dengan task yang sama (pengirim diberi tahu), yang sudah selesai
  tetap selesai. **Pulihkan ditolak** dengan pesan jelas bila permintaannya sudah diterima lagi
  dengan task lain (supaya tak ada dua task untuk satu permintaan) atau sudah ditolak; untuk itu
  terima ulang atau kirim permintaan baru. Tombol Pulihkan di Komunikasi memakai aturan yang
  sama. Buka kembali, hapus, dan pulihkan semuanya menyejajarkan permintaan, sehingga permintaan
  tak lagi "selesai" selagi task-nya Dikerjakan.
- *Peta jenis ke inisiatif yang Ditunda (diubah sesudah QA):* **ditolak saat disimpan** ("sedang
  ditunda, jadi tidak menerima permintaan"), karena form Terima hanya menawarkan inisiatif Aktif
  dan petanya akan diam-diam tak berlaku. Dialog peta hanya menawarkan inisiatif Aktif; jenis yang
  tadinya terpetakan ke inisiatif yang kemudian ditunda tampil kosong dengan keterangannya dan
  dilepas saat disimpan. Aktif lagi: bisa dipetakan lagi.
- *Manager bukan gerbang (diubah sesudah QA):* izin terima dan peta tak pernah berlaku bagi
  Manager (lihat Izin), dan banding perpanjangan tenggat task hasil permintaan diputuskan
  pengirim, bukan Manager. Satu hal yang sengaja tidak diubah: Manager tetap bisa **Buka kembali**
  task selesai (aturan umum ProductTrack); pengirimnya diberi tahu dan permintaan kembali Diterima.
- *Agen AI (`agen/`) tak berubah:* task dari permintaan memakai aturan aksi yang sama, jadi agen
  pun hanya bisa mengajukan, dan peninjaunya tampil di detail task.

**Data dan penyimpanan**

- Koleksi `permintaanDae` (ID `MDA-001`; `bahan` = tautan, `utas` = tanya/balas/komentar/catatan)
  masuk `KOLEKSI_REAL`, jadi **data real** tersimpan di `data_real` seperti koleksi lain:
  **tanpa tab baru dan tanpa langkah manual**. Task membawa `permintaanDae` dan `peminta`;
  inisiatif membawa `menerima`.
- **Data contoh** di spreadsheet: tab `permintaan_dae`, `permintaan_dae_links`, `permintaan_dae_utas`
  (opsional, seperti tab lain yang datang belakangan: sheet yang diimpor sebelum 2.46.0 tetap
  terbaca dengan daftar kosong) dan kolom baru di `tasks` dan `inisiatif`. Dibuat otomatis oleh
  impor berikutnya; tak ada yang rusak bila tak diimpor ulang.
- MySQL: `v2_permintaan_dae`, `v2_permintaan_dae_links`, `v2_permintaan_dae_utas` (kini 32 tabel),
  `v2_tasks.permintaanDae` dan `peminta`, `v2_inisiatif.menerima`, `v2_perpanjangan.permintaanDae`
  (kolom opsional: sheet lama tanpa kolom itu tetap terbaca).
- Salinan cepat data real di browser (dan agen) yang belum mengenal `permintaanDae` disusun
  ulang dari awal **sekali** (`cacheRealKenal`), jadi tak ada permintaan yang terlewat.

**Langkah deploy / data real:** tidak ada langkah wajib. Sesudah naik versi, semua orang memuat
ulang; data real langsung bisa dipakai. Opsional: `npm run impor:v1 -- --demo` untuk menampilkan
skenario contoh (menimpa seluruh tab data contoh, seperti biasa). Peta jenis di data real masih
kosong: Lead DAE mengaturnya sekali lewat **Peta jenis → inisiatif** (tanpa peta, inisiatif dipilih
sendiri saat menerima).

Aturannya `Inti.kirimMintaDae`, `ubahMintaDae`, `terimaMintaDae`, `tolakMintaDae`,
`tanyaMintaDae`, `balasMintaDae`, `komentariMintaDae`, `aturPetaMintaDae`, `peninjauDae`,
`perluTinjau`, `peringatanPeninjauDae`, `mintaDaeTanpaPeninjau`, `alasanTakBisaPulihMintaDae`,
`langkahMintaDae`, `mintaDaeTerbuka`; aksi data dengan nama yang sama. Peninjau memerlukan
`Inti.indeks(data)` (`peninjau(t, perId)`) agar semua tempat memilih orang yang sama. Diuji di
`test/permintaan-dae.test.js` (aturan, transisi, izin, notifikasi, data contoh, skema, dan jalur
server data real). Panduan: **Meminta tim DAE membangun sesuatu** (Staff), **Menerima permintaan
ke tim DAE** (Lead), **Mengawasi permintaan ke tim DAE** (Manager).

### Alamat, pencarian cepat, dan notifikasi

- **Alamat per halaman.** Setiap halaman dan yang sedang terbuka punya alamat sendiri, mis.
  `#/task/kanban/PRD-1038`, `#/proyek/PRJ-33`, `#/paket/PKG-001`, `#/catatan/<id>`. Tombol
  **Salin tautan** ada di detail task, halaman proyek, dan rancangan paket; tautannya bisa
  ditempel di chat. Penerimanya tetap perlu PIN v2, dan alamatnya bertahan melewati layar PIN
  dan pilih profil. Tombol Back/Forward browser ikut berjalan. Saringan tidak masuk alamat.
- **Pencarian cepat**: Ctrl+K (⌘K di Mac), tombol **/**, atau kotak cari di bilah atas. Isinya
  halaman, tampilan Task, dan aksi; begitu mengetik muncul rancangan paket, proyek, task,
  catatan, dan link yang cocok. Panah atas/bawah memilih, Enter membuka.
- **Notifikasi** di lonceng bilah atas: task baru untuk Anda, task yang diserahkan ke Anda, task
  Anda yang siap dimulai, tinjauan yang menunggu Anda, task yang dikembalikan atau disetujui,
  komentar baru di task yang Anda ikuti, serta (Manager) siklus proyek yang selesai dan
  task pembaruan Pengembangan yang baru dibuat/selesai. Semuanya
  dihitung dari data yang sudah ada (riwayat, tinjauan, komentar, keadaan task) oleh
  `notifikasi()` di `public/inti.js`, tidak disimpan terpisah. Tanda sudah dibaca disimpan per
  profil di browser itu.

### Kalender Saya (2.28.0)

Permintaan user: aktivitas harian pribadi di kalender, dengan pengingat. Halaman **Kalender
Saya** di grup Ruang Saya.

- **Agenda**: judul, tanggal, jam mulai–selesai atau sepanjang hari, berulang (setiap hari, hari
  kerja, minggu, bulan, dengan batas opsional), pengingat (saat mulai sampai 1 hari sebelumnya),
  dan catatan. Tiap kejadian bisa dicentang selesai (agenda berulang: per tanggal).
- **Kalender bulan** dengan agenda dan, bila dipilih, tenggat task saya; daftar per tanggal di
  bawahnya. Hari Ini menampilkan kartu **Agenda saya hari ini**.
- **Pengingat** di dalam aplikasi: pesan singkat, lonceng notifikasi, dan notifikasi browser bila
  diizinkan (tombolnya di **Pengingat**), selama ProductTrack terbuka. Agenda sepanjang hari
  diingatkan pukul 07.00. Pengingat yang terlewat berbunyi saat aplikasi dibuka, sampai 6 jam
  sesudahnya.
- **Email pribadi (opsional)** di pengaturan pengingat: disimpan untuk pengingat email di tahap
  berikutnya; **belum ada email yang dikirim**. Tahap 2 perlu akun pengirim email dan penjadwal
  dari IT.
- **Privasi**: tersimpan di server per profil (tab `agenda` dan `pribadi`, tabel `v2_agenda` dan
  `v2_pribadi`), dan hanya dikirim ke profil yang terbukti di sesi itu (lewat PIN-nya, atau tak
  ber-PIN); tak ikut data yang dimuat semua orang. Profil tanpa PIN tetap bisa dipilih siapa pun
  dengan PIN aplikasi, jadi pasang PIN profil untuk agenda yang benar-benar pribadi. Tak
  tersedia untuk akun Dev, Lihat sebagai, dan mode uji Dev.
- Aturannya `Inti.periksaAgenda`, `kejadianAgenda`, `waktuPengingat`, `periksaEmail`; aksi
  server `muatAgenda`, `simpanAgenda`, `hapusAgenda`, `simpanPribadi`. Diuji di
  `test/agenda.test.js` dan `test/rpc.test.js`.

### Acara bersama di kalender (2.33.0)

Permintaan user: dari kalender bisa membuat acara (rapat, review, sharing session, …) dan
menambahkan orang dari tim sendiri maupun tim lain. Acara = agenda Kalender Saya yang punya
peserta, atau yang Terbuka.

- **Membuat acara**: tombol **Buat acara** di Kalender Saya, di Kalender tim, di kartu
  **Acara** halaman proyek, paket, dan inisiatif, dan ikon kalender di detail task. Isinya sama
  dengan agenda (tanggal, jam, berulang, pengingat, catatan atau agenda rapat), ditambah
  **lokasi**, **tautan rapat** (Meet/Zoom), **peserta**, **Terbuka**, dan **Terkait dengan**
  (proyek, paket, inisiatif, atau task).
- **Peserta dari tim mana pun**, dikelompokkan per tim; **+ RAD**, **+ LNA**, … menambah satu tim
  sekaligus (Lead dan staff-nya), **+ Semua Lead** semua Lead. Dari detail task, PIC dan
  peninjaunya langsung terpilih. Tamu di luar ProductTrack tidak ada (keputusan user).
- **Cek bentrok**: tiap calon peserta yang sudah punya acara lain di jam itu bertanda "ada acara
  10:00–11:00", dan peserta terpilih yang bentrok disebut di atas daftar. Hanya dari acara
  bersama; agenda pribadi orang lain tak pernah dihitung atau dibuka. Judul acara bentrok hanya
  terlihat bila penanya memang boleh melihat acara itu.
- **Undangan & jawaban**: peserta mendapat notifikasi di lonceng, acaranya muncul di Kalender
  Saya (ungu), dan bagian **Menunggu jawaban Anda** di atas kalender (juga pengingat di kartu
  Hari Ini) dengan tombol **Hadir / Mungkin / Tidak hadir**. Pembuat mendapat notifikasi tiap
  jawaban, dan detail acara menampilkan rekapnya ("3 hadir · 1 mungkin · 1 belum menjawab").
  Acara yang ditolak tetap tampil tercoret dan tak diingatkan.
- **Jendela detail** (agenda dan acara) berjarak tepi 22 px seperti form lain, juga saat
  notulen ditulis di dalamnya (2.34.1; sebelumnya isinya menempel ke tepi jendela, karena jarak
  tepi jendela hanya diberikan pada `<form>`).
- **Pengingat per peserta**: bawaannya pilihan pembuat; tiap peserta bisa menggantinya di detail
  acara (**Pengingat saya**).
- **Notifikasi**: diundang, jadwal diubah (tanggal/jam/pengulangan), jawaban peserta, ikut
  (acara Terbuka), notulen ditulis orang lain, dan acara dibatalkan (dihapus pembuatnya).
  Mengklik notifikasinya membuka Kalender Saya di tanggal itu beserta detail acaranya.
- **Privasi**: bawaannya acara hanya terlihat oleh pembuat dan pesertanya. **Terbuka** (mis.
  demo produk, sharing session) terlihat semua orang di Kalender tim dan di tanggalnya
  di Kalender Saya, dan siapa pun bisa **Ikut** (masuk kalendernya, dapat pengingat). Hanya
  pembuat yang mengubah atau menghapus acara.
- **Notulen & tindak lanjut**: pembuat dan peserta menulis notulen dan butir tindak lanjut (teks,
  PIC dari peserta, tenggat). Tiap butir punya tombol **Jadikan task**: form Tambah task terisi
  (judul, PIC bila boleh dipilih, tenggat, proyek atau inisiatif yang ditautkan acara, keterangan
  "Tindak lanjut acara …"), dan sesudah dibuat nomor task-nya menempel di butir itu beserta
  statusnya. Simpanan notulen dari versi lama ditolak supaya tulisan orang lain tak tertimpa.
- **Acara di tempat kerjanya**: kartu **Acara** di halaman proyek (juga acara yang ditautkan ke
  task proyek itu), paket, dan inisiatif, serta bagian **Acara** di tab Kerjakan detail task
  (hanya bila ada): yang akan datang dulu, lalu tiga yang sudah lewat ("ada notulen").
- **Kalender tim** (halaman Task) kini tiga lapis yang bisa dimatikan: **Tenggat task** (mengikuti
  saringan), **Acara** (yang diikuti dan yang Terbuka), dan **Pendaftaran paket** (tanggal
  dibuka dan ditutup).
- **Kalender lain**: detail acara punya **Google Calendar** (tautan template, tanpa login Google)
  dan **Unduh .ics**; pengaturan Pengingat punya **Unduh semua (.ics)** untuk kalender ponsel
  atau Outlook, karena pengingat ProductTrack hanya berbunyi selama aplikasinya terbuka.
  Perubahan sesudahnya perlu diunduh lagi (tanpa sinkron dua arah).
- **Izin**: centang baru **Membuat acara bersama** (grup Kalender) di Panel Dev → Izin, bawaannya
  semua peran. Tanpa izin itu agenda pribadi tetap bisa dibuat, dan peserta lama bisa dilepas.
- **Penyimpanan**: tetap satu baris per acara di tab `agenda` (`v2_agenda`), dengan peserta,
  jawaban, kaitan, dan notulennya di kolom `data` (JSON); kolom `orang` = pembuatnya. Server
  hanya mengirim baris yang boleh dilihat profil sesi itu (miliknya, yang ia ikuti, yang Terbuka)
  dan tanda batal dua pekan terakhir. Tarikan ulang tiap dua menit selama aplikasi terbuka, dan
  layar hanya digambar ulang bila ada yang berubah.
- Aturannya `Inti.periksaAgenda` (isian acara), `gabungAcara`, `periksaPeserta`,
  `jawabAcara`, `ubahNotulen`, `tandaiTindak`, `bentrokAcara`, `notifAcara`,
  `icsAgenda`, `tautanGoogle`; aksi server `simpanAgenda`, `jawabAcara`, `simpanNotulen`,
  `tandaiTindak`, `sibukAcara`. Diuji di `test/agenda.test.js`, `test/rpc.test.js`, dan
  `test/demo.test.js`.

### Bahasa Indonesia / English (2.28.0; tahap 2 di 2.29.0)

Pilihan **Bahasa · Language** di menu akun (kanan atas), **per profil** (tersimpan di setelan
tampilan, ikut ke perangkat lain) dan diingat perangkat itu untuk layar sebelum profil dipilih.
Tanggal dan angka mengikuti bahasanya.

- Teks ditulis dalam bahasa Indonesia dan dibungkus `tr()`; terjemahan Inggrisnya di
  `public/bahasa.js`. Yang belum diterjemahkan tetap tampil dalam bahasa Indonesia, jadi
  terjemahan ditambah bertahap.
- **Tahap 1** (2.28.0): kerangka aplikasi (sidebar, kepala, menu akun, notifikasi), Hari Ini,
  Task (semua tampilan dan saringan), detail task, Proyek, Kalender Saya, dan form task/proyek.
- **Tahap 2** (2.29.0): semua halaman lain — Dashboard, Laporan, Rancangan Paket (dan form
  elaborasi), Komunikasi, Link Saya, Catatan Saya (termasuk menu "/" dan toolbar editor), Master,
  Riwayat Aktivitas, Panel Dev, layar PIN dan pemilih profil, Ctrl+K, serta modal foto, Sesuaikan
  tampilan, dan Setel status — juga pesan singkat, konfirmasi, dan **pesan dari aturan dan
  server** (penolakan izin, syarat ajukan, alasan menunggu, galat isian). Pesan itu tetap
  dibuat dalam bahasa Indonesia oleh `Inti` dan server; `toast()` dan `galatModal()` di app.js
  menerjemahkannya lewat `trPola()`, yang mencocokkan kalimat bernama/berangka dengan daftar pola
  `POLA_TR` (±80 pola) lalu memakai terjemahan biasa. Total ±1.870 teks.
- **Belum** (tahap 3): isi **Panduan** (`public/panduan.js`) dan ilustrasinya.
- Isi yang diketik orang (judul, nama sub-stage, kategori, pesan, catatan riwayat) dan nilai Master
  tak diterjemahkan, begitu pula yang tersimpan sebagai data atau disalin ke sheet (mis. isi
  templat catatan, status siap pakai seperti "Cuti", salinan sheet Marsel).
- Kunci boleh berkonteks: `tr('Proyek§satu')` tampil "Proyek" dalam bahasa Indonesia dan "Project"
  dalam bahasa Inggris, terpisah dari `tr('Proyek')` (menu: "Projects").
- Lihat sebagai memakai bahasa orang itu tanpa mengubah bahasa perangkat; kembali jadi Dev,
  bahasanya pulih (perbaikan 2.29.0).
- `test/bahasa.test.js` memastikan setiap teks `tr('…')` di app.js punya terjemahan dengan
  `{isian}` yang sama.

### Tampilan pribadi & status (2.21.0)

Keputusan user: tiap profil mengatur tampilannya sendiri, **disimpan per profil** (ikut ke
perangkat mana pun). Dibuka lewat foto sendiri di kanan atas → **Sesuaikan tampilan** /
**Setel status**, atau Ctrl+K.

- **Warna aksen**: 8 pilihan atau warna sendiri.
  - Dipakai tombol, tautan, menu aktif, dan sorotan.
  - `Inti.tokenAksen` menggeser kecerahannya sampai terbaca di kedua tema (teks ≥ 4,6:1 di
    latar terang, ≥ 6,5:1 di latar gelap, tombol bertulisan putih ≥ 4,6:1). Diuji untuk warna
    ekstrem, termasuk putih, hitam, dan kuning terang.
  - Biru yang bermakna (status Dikerjakan, capaian paket, sebutan, kategori notifikasi, kode
    lepas) memakai token `--info-*` dan tak ikut aksen, supaya warna status sama untuk semua
    orang.
- **Latar (wallpaper)**: gradasi aksen, Senja, Laut, Hutan, pola titik/garis, atau **sampul
  sendiri** yang diburamkan, dengan penggeser Samar–Jelas (10–60%).
  - Lapisannya ada di belakang semua isi; kartu, sidebar, dan bilah atas tetap pejal.
  - Kabut (`--kabut-latar`, 70% putih atau hitam sesuai tema) dan teks sekunder yang sedikit
    lebih tegas menjaga keterbacaan. Diuji dengan gambar terburuk (hitam, putih, merah, biru,
    hijau, kuning, sian) pada 60%: semua teks di atas latar ≥ 4,5:1 di 8 halaman, kedua tema.
- **Sampul profil**: gambar 3:1 yang dipotong dan diperkecil di perangkat (≤ `SAMPUL_MAKS`
  karakter). Tampil di menu akun seperti media sosial, dan bisa jadi latar. Sejak 2.30.0
  (permintaan user) juga di **pemilih profil**: tiap kartu profil bersampul di atasnya, dengan
  avatar menumpang di tepinya; profil tanpa sampul memakai pita warna aksennya. Sampul orang lain
  diambil (`muatSampul`) hanya bila berubah dan disimpan di memori saja, tak di localStorage.
- **Kepadatan** Nyaman/Ringkas (Ringkas hanya di layar lebar) dan **ukuran huruf**
  Kecil/Sedang/Besar. Semua `font-size` di app.css memakai `--skala-huruf`, jadi hanya huruf
  yang membesar; kotak dan sasaran sentuh tetap.
- **Halaman awal**: halaman pertama tiap kali profil dipilih dan saat logo diklik; bawaannya
  Hari Ini (Staff, Lead) atau Proyek (Manager).
- **Status**: emoji dari daftar (🎯 Fokus, 📅 Rapat, 🏠 WFH, 🏖️ Cuti, 🤒 Sakit, …) dengan teks
  ≤ 60 karakter dan "hapus setelah" (1 jam, 4 jam, akhir hari, akhir minggu, atau tanpa batas).
  - Terlihat semua orang sebagai lencana di avatar dan chip di samping nama (Komunikasi, detail
    task, Per orang, pemilih profil).
  - Dipasang lewat satu lembar gaya (`#gaya-status`), jadi berganti tanpa menggambar ulang
    halaman. Teksnya di-escape per karakter.
- **Penyimpanan**: tab `tampilan` (satu baris per orang: `orang`, `setelan` JSON, `diperbarui`,
  `sampul`), tabel `v2_tampilan` di MySQL.
  - Aksi `muatTampilan(sejak)` (tanpa gambar, ditarik tiap 2 menit), `muatSampul(orang)`, dan
    `simpanTampilan({ orang, setelan, sampul? })`.
  - Seperti foto, profil ber-PIN hanya diubah dari sesi yang sudah memasukkan PIN-nya; sesi
    agen AI tak bisa mengubahnya.
  - Pilihan terakhir disalin ke `pt2_tampilan_awal`, yang dipasang `<head>` index.html sebelum
    CSS supaya tak berkedip warna bawaan.

### Detail task tertata (2.32.0)

Permintaan user: detail task terasa ramai ("banyaknya ini itu tapi memang tetap perlu"). Isinya
tetap, susunannya mengikuti "apa yang perlu dilakukan sekarang":

- **Kepala ringkas**: asal (proyek atau inisiatif) sebaris dengan tombol ikon (salin tautan,
  ubah, hapus, tutup), lalu judul, sub-stage dan tim, status dan tenggat, serta PIC dan
  peninjau, semuanya selebar laci. Sejak 2.41.0 (permintaan user) sub-stage (kode dan namanya)
  jadi judul besar dan judul task jadi sub-judul di bawahnya; task tanpa sub-stage tetap memakai
  judul task. Sejak 2.42.1 pola yang sama dipakai baris task (halaman proyek, Hari Ini, dan daftar
  lain yang memakai baris) dan kartu Kanban, dan sejak 2.43.0 juga tabel Daftar di halaman Task.
  Kolom Task di tabel itu kini diurutkan menurut tahap ADDIE dan kode sub-stage (A2, DV2, E2,
  E12, lalu rutin R1–R4), kemudian judul task; task tanpa sub-stage di belakang, menurut judulnya.
- **Kartu "Langkah berikutnya"**: apa yang perlu dilakukan dan kenapa, sekali saja (dulu
  banner, daftar Menunggu, dan teks di bawah tombol mengulang alasan yang sama). Isinya menurut
  keadaan: menunggu (dengan tombol **Lihat yang ditunggu** dan **Atur urutan tunggu**), siap
  dimulai, sedang dikerjakan (syarat yang kurang), **Revisi** (siapa yang mengembalikan dan
  catatannya), siap diajukan, sedang ditinjau (untuk peninjau: periksa lalu setujui atau
  kembalikan), tertahan, atau selesai.
- **Tiga tab bergaris bawah**: **Kerjakan**, **Diskusi** (dengan jumlah pesan), dan **Riwayat**
  (fase tim, yang ditunggu, riwayat tinjauan, aktivitas). Tab kembali ke Kerjakan setiap ganti
  task.
- **Bagian lipat di Kerjakan**, berupa baris berikon bergaris pemisah dengan status di kanan:
  **Hasil kerja** (ikon dokumen; output dan tautan;
  "belum diisi" bertanda kuning bila syarat), **Ceklis pengerjaan** ("2/5"), **Task turunan**
  ("0/1 selesai"), dan **Setoran ke rancangan paket**. Yang perlu dikerjakan sekarang terbuka
  sendiri (Hasil kerja sesudah dimulai, ceklis yang berisi saat dikerjakan atau ditinjau, task
  turunan yang ada isinya); buka-tutup yang diubah orang bertahan selama task-nya sama.
- **Syarat ajukan** menjadi bilah kemajuan ("Syarat ajukan 3/4") dengan yang masih kurang di
  bawahnya, hanya saat task dikerjakan.
- **Yang ditunggu** di tab Riwayat: yang masih berjalan di atas, yang sudah beres dilipat
  ("3 sudah beres").
- **Yang tak berlaku disembunyikan**: setoran hanya untuk task yang sudah menyetor, task proyek
  yang tertaut paket, atau task di luar proyek (bukan pembaruan inisiatif); task turunan di
  luar proyek hanya bila ada isinya atau bisa dibagi; penjelasan panjang pindah ke tombol "?".
- **Bilah aksi** (Mulai, Ajukan, Setujui, Kembalikan, Tandai tertahan, …) di bawah detail, dan
  menempel di bawah laci saat digulir; alasan tombol yang nonaktif ada di kartu langkah dan di
  keterangan tombolnya.
- **Konfirmasi Tarik dari tinjauan dan Buka kembali (2.34.3, permintaan user).** Keduanya
  membalik keadaan yang sudah diserahkan atau disetujui dan mudah terpencet, jadi jendela kecil
  menanyakannya dulu: apa akibatnya (peninjau tak lagi diminta meninjau dan task yang menunggu
  kembali menunggu; atau task selesai kembali dikerjakan, capaian paketnya ditarik). Berlaku
  dari detail task, kepala utas Komunikasi, maupun seret di Kanban (satu pintu: `jalankanAksi`).
  Fokus awalnya di **Batal**.

### Tampilan lebih jelas (2.33.0)

Permintaan user: bagian mana lagi, seperti detail task, yang bisa dibuat supaya pengguna tak
bingung. Tujuh bagian, dikerjakan sekaligus mengikuti gambaran sebelum–sesudah yang disetujui:

- **Arti di tempat**: kode sub-stage, chip tim (juga yang berfase), dan label status bisa diketuk
  (`data-arti`). Artinya muncul di kotak kecil (fase dan tim pemilik, peninjau, Lead, arti
  label) dengan tautan ke Panduan › Istilah, dan tertutup dengan klik di luar atau Esc. Fase di
  chip ditulis singkat (**Ana**, **Des**, **Dev**, **Imp**, **Eva**; `Inti.singkatTahap`), jadi
  Development (V) tak lagi tertukar dengan Design (D).
- **Halaman proyek**:
  - kemajuan siklus sebaris ("5 dari 12 task siklus ini selesai") dengan chip terlambat dan
    tertahan yang membuka Task tersaring;
  - kartu **Perlu perhatian Anda**: tinjauan untuk Anda, task yang dikembalikan, langkah tim
    Anda yang siap dibagi (**Bagi ke staff** membuka isian task turunan), yang terlambat dan
    tertahan di lingkup Anda, dan task Anda yang siap; paling banyak empat, sisanya di Task;
  - tab tim menulis fasenya ("DAE · Development", "LNA · belum ada task");
  - fase tanpa task dirapatkan jadi satu baris dengan **+ Tambah**; nama proyek tak diulang di
    tiap baris task;
  - **Ubah proyek**, **Duplikat proyek**, dan **Hapus proyek** di menu **⋯** kepala proyek;
    **Pilih task untuk dihapus** di menu **⋯** kartu tim;
  - paragraf penjelasan gerbang dan kartu Ringkasan di samping diganti tombol **?**.
- **Form Tambah task**: pertanyaan pertama **Task ini untuk apa?** (Proyek, Rutin, atau
  Inisiatif bila ada). Proyek atau inisiatifnya terisi sendiri bila form dibuka dari halamannya,
  dan wajib dipilih bila tidak. Sub-stage berupa daftar pilihan: tim sendiri di atas, tim lain di
  **Sub-stage tim lain** (dilipat), dan kotak cari bila pilihannya lebih dari 8. Prioritas dan
  output dilipat di **Lainnya**. Isian wajib yang kosong disebut namanya ("Pilih proyeknya
  dulu.").
- **Hari Ini**: angka di bawah sapaan menjadi tombol yang melompat ke bagiannya. **Kerjakan
  sekarang** menggabungkan tinjauan (**Tinjau**), langkah tim yang siap dibagi (**Kerjakan
  sendiri** atau **Bagi ke staff**), yang terlambat, dan yang bertenggat hari ini (**Mulai**),
  dengan tombolnya di baris. Urutannya: Kerjakan sekarang, agenda hari ini, 7 hari ke depan, pita
  tim (Lead dan Manager), lalu **Nanti**, **Belum bisa dikerjakan**, dan **Saya bantu** yang
  dilipat dengan jumlahnya.
- **Rancangan Paket**: tabel target berkolom Item, Target (dengan satuan), Tayang, Digarap,
  Progres, dan Status; Duplikat, Salin ke sheet Marsel, dan Hapus di menu **⋯**; paragraf metode
  progres dan daftar bobot diganti tombol **?**. Form elaborasi punya **pratinjau**: berapa task
  untuk berapa target, dan per PIC, dihitung dengan menjalankan `Inti.elaborasiPaket` pada
  salinan data (tak ada yang tersimpan); tombolnya menulis jumlahnya ("Buat 43 task"), dan isian
  yang salah tampil sebagai pesan di pratinjau.
- **Dashboard**: lihat **Dashboard** di Alur v2 (Perlu perhatian, tabel per orang berbahasa
  biasa, Rincian lain).
- **Dua kalender**: kalender di halaman Task bernama **Kalender tim**; tombol di Kalender Saya
  membuka Kalender tim, dan sebaliknya.
- Teks barunya lewat `tr()` (77 teks Inggris). Panduan ikut disesuaikan, termasuk ilustrasi form
  Tambah task dan Dashboard.

### Menu akun, mode gelap, dan posisi gulir (2.20)

- **Menu akun di kanan atas**, di samping lonceng, seperti di media sosial. Klik foto sendiri
  untuk melihat siapa yang sedang masuk, lalu Ganti foto profil, Ganti profil, Tema, dan
  Keluar. Kaki sidebar kini hanya foto, nama, dan jabatan (permintaan user).
- **Tombol tema** di samping lonceng (2.20.2): sekali klik pindah terang ↔ gelap. Ikonnya
  tema tujuan: bulan saat terang, matahari saat gelap.
- **Tema** lengkap dipilih di menu akun atau lewat Ctrl+K, lalu ketik "tema":
  - **Ikuti sistem** (bawaan) mengikuti pengaturan perangkat, juga saat perangkat berganti tema
    selagi aplikasi terbuka;
  - **Terang** dan **Gelap** menetapkan tema sendiri; tombol tema di bilah atas memilih salah
    satunya.

  Pilihannya per browser (`pt2_tema`), tidak ikut profil. Skrip kecil di `<head>`
  `public/index.html` memasang `data-tema` sebelum CSS dimuat, jadi halaman tak sempat berkedip
  terang.
- **Semua warna lewat token** di `:root` `public/app.css`, dan blok `:root[data-tema="gelap"]`
  hanya mengganti token itu. Isi pekat bertulisan putih (tombol utama, chip kode, lencana,
  batang timeline) memakai token `--isi-*` yang tetap cukup gelap untuk teks putih di kedua
  tema. `test/tema.test.js` menjaga dua hal: setiap token warna punya nilai gelap, dan tak ada
  warna baru yang tertulis langsung di luar token.
- **Posisi gulir bertahan.** Hampir setiap klik menggambar ulang halaman (`render()`). Sejak
  2.20.0, selama halamannya sama, yang berikut dikembalikan:
  - posisi gulir halaman dan wadah bergulir: menu sidebar, laci detail task, daftar utas,
    tabel, kanban, dan timeline;
  - bagian `<details>` yang dibuka atau ditutup sendiri, mis. fase di tab tim proyek.

  Pindah halaman tetap mulai dari atas. Panel obrolan tetap di pesan lama yang sedang dibaca;
  ia turun ke pesan terbaru hanya untuk utas baru, sesudah mengirim pesan, atau kalau memang
  sudah di bawah.

### Panduan di dalam aplikasi

Menu **Panduan** menjelaskan alurnya per peran (Staff, Lead, Manager), ditambah konsep dan
istilah. Setiap panduan punya tombol **Coba sekarang**: aplikasi pindah ke profil yang cocok dan
membuka contoh nyata di data contoh, lalu langkahnya tampil di kotak melayang selama orang
mencoba. Tanda **?** di layar penting membuka panduan yang bersangkutan.

Ilustrasinya sengaja dibuat dari komponen aplikasi sendiri dengan teks contoh, bukan tangkapan
layar. Dengan begitu ilustrasinya tak basi setiap tampilan berubah, dan tak ada data v1 di
berkas `public/`, yang bisa dibuka siapa saja tanpa PIN. Isi panduan ada di `public/panduan.js`
dan bisa disunting tanpa menyentuh tampilan; `cariContoh()` di berkas yang sama memilih
contohnya, diuji di `test/panduan.test.js`.

## Isi

```
public/index.html     kerangka halaman (layar PIN, pilih profil, aplikasi)
public/app.js         tampilan: sidebar, semua halaman, detail task, formulir
public/app.css        gaya tampilan, warna dari logo ProductTrack
public/logo/          ikon ProductTrack (favicon, sidebar, layar PIN), dibuat dari logo/
public/inti.js        aturan alur v2, dipakai browser dan tes
public/panduan.js     isi halaman Panduan + pencari contoh untuk "Coba sekarang"
public/cek.html       halaman cek: setelan, akun, spreadsheet, kepemilikan, data contoh
api/rpc.js            satu pintu API: masuk, keluar, status, siapkan, muatContoh, sinkron, data real, obrolan, foto, mode Dev, Master, PIN profil
api/_real.js          data real: perintah diperiksa berurutan, keadaan dari tab data_real
agen/                 agen AI Ali: klien, ringkasan & pengingat, catat task dari rekap, alat MCP (lihat agen/README.md)
api/_sesi.js          gerbang PIN + cookie sesi (mode Dev, profil terbukti)
api/_sheets.js        Google Sheets + aturan kepemilikan + data contoh + tab obrolan, foto, orang, master, pin, setelan, data_real
api/_skema.js         bentuk tab spreadsheet v2, baris ↔ objek prototipe
scripts/impor-v1.js   npm run impor:v1 — tarikan v1 → data contoh di spreadsheet v2
scripts/_v1ke2.js     semua aturan pemetaan v1 → v2 (tabel yang bisa diubah)
scripts/dev.js        server lokal yang meniru Vercel (tanpa Vercel CLI)
server.js             server Node untuk Cloud Run (npm start); Dockerfile + .gitlab-ci.yml membangunnya
test/                 npm test — Google Sheets ditiru, tanpa koneksi
db/produk_base_v2.sql rancangan tabel MySQL v2 (belum dipakai aplikasi)
logo/                 berkas logo asli (tak ikut image Docker)
```

Ikon di `public/logo/` dibuat dari `logo/logo product track.png`: margin putih dipotong, latarnya
dibuat transparan, lalu dijadikan persegi 32, 64, dan 192 px. Header memakai ikon itu di alas
putih dengan tulisan "Product" biru tua (#002870) dan "Track" biru logo (#00A8E8), seperti v1.

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
| `DEV_PIN` | (opsional) PIN mode Dev, berbeda dari `ACCESS_PIN`. Kosong = mode Dev tertutup |
| `AGEN_KUNCI` | (opsional) kunci agen AI Ali, minimal 32 karakter acak (lihat `agen/README.md`). Kosong = agen tertutup |

Lalu Deploy. Env hanya berlaku untuk deploy baru, jadi setelah mengubahnya selalu **Redeploy**.

### 6. Pastikan

Buka `https://<project-v2>.vercel.app/cek`. Semua setelan harus ✓, service account harus akun
baru, dan kepemilikan harus "Siap dipakai v2". Setelah impor (bagian berikut), baris
**Data contoh** menunjukkan versi dan sumbernya.

Label **Production** di project ini hanya berarti branch `main` milik v2. Tidak menyentuh v1 sama sekali.

---

## Deploy ke Cloud Run (GitLab)

Sejak 0.15.2 isi repo GitLab `produk-cerebrum/product-task-tracker` adalah v2. Domainnya,
`product-task-tracker.cerehub.id`, semula disiapkan tim IT untuk v1 tetapi belum dipakai tim;
v1 tetap di Vercel. `.gitlab-ci.yml`, `Dockerfile`, dan `server.js` disalin dari yang dibuat
tim IT untuk v1, dengan Node 22 dan tanpa penjaga `gas/Index.html` milik v1.

| Pemicu | Tes | Build | Deploy | `APP_ENV` |
|---|---|---|---|---|
| tag git | otomatis | manual | manual | `production` |

Push ke branch tidak menjalankan apa pun. Rilis = buat tag `v` + versi di `package.json`,
misalnya `v2.16.0`, push tag-nya, lalu jalankan **build-app-prod** dan **deploy-prod** dari
halaman pipeline di GitLab. Sejak 2.16.0 versi v2 berawal 2, jadi tagnya tak tertukar dengan tag
v1 (`v1.0.0`, `v1.0.1`) yang sudah ada di repo itu. Sebelumnya tag v2 diberi awalan `v2-`
(mis. `v2-0.15.2`).

**Env di service Cloud Run** `product-task-tracker-service` diisi sekali (Edit & Deploy New
Revision → Variables). Deploy dari CI hanya mengubah `APP_ENV`; env lain dipertahankan.

| Nama | Isi |
|---|---|
| `SPREADSHEET_ID` | ID spreadsheet v2 — **bukan** milik v1 |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | seluruh isi berkas kunci service account v2, satu baris |
| `ACCESS_PIN` | PIN v2, jangan disamakan dengan PIN v1 |
| `SESSION_SECRET` | acak, minimal 32 karakter |
| `DEV_PIN` | (opsional) PIN mode Dev, berbeda dari `ACCESS_PIN` |
| `AGEN_KUNCI` | (opsional) kunci agen AI Ali, minimal 32 karakter acak; nilai yang sama di `agen/.env` |

Service itu sebelumnya menjalankan v1, jadi env lamanya masih berisi spreadsheet dan kunci v1.
**Ganti dulu sebelum tag v2 pertama.** Kalau terlanjur, tak ada yang tertulis ke sheet v1: setiap
baca-tulis v2 memeriksa penanda `_meta` lebih dulu (lihat *Dua pengaman*), jadi aplikasinya
hanya menampilkan galat. Variabel khusus v1 (`MAGANG_PIN`, `VIEW_PIN`, `DATA_SOURCE`, `MYSQL_*`,
`METRICS_*`, `OKR_*`, dst.) tak dibaca v2 dan sebaiknya dihapus dari service itu.

Data real tak butuh env baru: tab `setelan`, `data_real`, dan `obrolan_real` dibuat sendiri di
spreadsheet v2 saat pertama dipakai. Deploy memakai `--max-instances 2`, dan data real memang
dibuat aman untuk dua instance (lihat *Sumber data*, Dua instance).

Untuk mencoba server yang sama dengan Cloud Run di komputer sendiri: isi env di shell, lalu
`npm start` → <http://localhost:8080>. Kerja sehari-hari tetap `npm run dev`, yang memuat `.env`.

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
| Task `TSK-099` | task `PRD-099` di luar proyek (nomornya tetap). Stage v1 (QC, Operasional, …) jadi kategori |
| Sub-stage | dari judul (aturan berurutan `SUB_KATA`), cadangannya dari stage v1 (`SUB_STAGE_V1`). Di luar proyek: kode R1–R4 = **rutin**, kode ADDIE = **lepas** (pekerjaan produk tanpa proyek). QC v1 masuk Evaluation (E1–E7). Yang tak cocok dibiarkan tanpa kode untuk dipetakan Lead lewat **Ubah** |
| Kolaborasi `COL-021` | **proyek** `PRJ-21` tanpa Lead tetap; tahapnya dihitung dari proses yang masih terbuka |
| Kolaborasi yang semua prosesnya tuntas | proyek **arsip** (20 dari 26), supaya tak membanjiri antrean keputusan |
| Proses kolaborasi | task proyek bersub-stage; tiap proses menunggu proses sebelumnya |
| Ceklis | sub-task (ceklis proses `COL-021#3` ikut ke task prosesnya) |
| Komentar kolaborasi | komentar di task proses pertama |
| Done / In progress / Todo | Selesai / Dikerjakan / Antre |
| Review PM / Revisi | Ditinjau / Dikerjakan (riwayat tinjauan: Diajukan / Dikembalikan) |
| Hold | Antre + tanda **tertahan** |
| `status_by` v1 | riwayat tinjauan (siapa dan kapan), hanya kalau tercatat |
| Rancangan paket | paket utuh: identitas, teks per kategori, target (`package_items`), tautan, tanda dibagikan |
| `paket_id` kolaborasi | `paket` di proyek (3 kolaborasi v1 tertaut paket) |
| Setoran (`package_contribs`) | tab `setoran`. Nomor proses → task proses itu; nomor 0 ("saat kolaborasi selesai") → task proses terakhirnya. Di tarikan 2 Oktober tabelnya kosong |
| Dashboard Lain | **Tautan tim** di Link Saya. Kata sandi yang tertulis di deskripsinya ("Pass : …") disensor saat impor |
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

### Skenario contoh (`--demo`)

```bash
npm run impor:v1 -- --demo
```

Menambah skenario di atas data v1, memakai aturan yang sama dengan tombol di aplikasi
(`scripts/_demo.js`):

- **TKA_CEREBRUM** (target asli v1) dielaborasi dua minggu lalu dengan alur lengkap. Design
  sudah tuntas dan proyeknya di Development: ada batch yang sudah ter-input, langkah Lead yang
  menunggu tinjauan Manager, task turunan yang dikerjakan, dikembalikan (Revisi), terlambat,
  tertahan, dan menunggu tinjauan Lead, serta langkah yang masih di antrean Lead. Input LNA
  menunggu soal RAD; Implementation dan Evaluation tiap tim menunggu fase Development tim itu.
  Setiap langkah yang lolos punya output dan bukti, dan pekerjaannya dibagi ke staff lewat task
  anak.
- **OJK** diberi target contoh dan menjalani satu siklus penuh: A1/A6 oleh Manager sebagai
  gerbang, keputusan Build, lalu langkah batch dikerjakan per putaran begitu tak menunggu apa pun
  lagi (soal RAD dan live class CLO lebih dulu, input LNA sesudah soalnya jadi, tayang sesudah
  QC), sampai semua batch tayang dan E12 disetujui. Siklusnya tertutup dan menunggu keputusan
  Manager.
- **UTBK** diberi target contoh tanpa dielaborasi, untuk mencoba tombol **Elaborasi jadi
  proyek** sendiri.
- **Tes Psikologi PAPI Kostick** (2.29.1): proyek **tanpa rancangan paket** yang melibatkan dua
  tim, contoh serah-terima antartim di luar alur paket.
  - Analysis: A1 intake dan A6 target oleh Manager (gerbang), A2 riset oleh Andika (RAD), yang
    sebagian dibagi ke Uma lewat task turunan.
  - Design sejajar: D2 blueprint instrumen oleh Andika (RAD) dan D4 rancangan sistem penilaian
    oleh Ali (DAE, tanpa staff; ia mengerjakan sendiri).
  - Ali memasang **DV7 Pembuatan prototype** menunggu **D2** milik RAD lewat **Atur urutan
    tunggu**. Sesudahnya I5 uji coba terbatas dan E8 QC sistem penilaian (DAE), DV1 produksi
    butir dan E1 QC butir (RAD), lalu E12 oleh Manager.
  - Keadaannya: D2 masih dikerjakan Andika (output sudah terisi). Ajukan D2 sebagai Andika, dan
    Ali langsung mendapat notifikasi bahwa DV7 siap dikerjakan, selagi Manager meninjau D2
    (2.30.0).
- **Pengembangan tim DAE** (2.47.0): 26 wadah, dengan akar **Generator Soal**, **Pengumpulan Data**,
  dan **Aplikasi Internal**, PIC Ali. Termasuk Generator Soal OJK/SKD, Scraper Media Sosial,
  Pengolahan Data, ProductTrack, Product Knowledge, dan subinisiatifnya. Task lama
  v1 Ali di luar proyek ditempel ke inisiatifnya menurut judul; ProductTrack juga punya satu
  pembaruan yang selesai dan satu yang sedang berjalan. Generator Soal, Scraper Media Sosial,
  Dashboard dan laporan, serta Otomasi operasional menerima jenis permintaan ke tim DAE (peta jenis).
- **Permintaan ke tim DAE** (2.46.0), empat keadaan lewat aturan yang sama dengan tombolnya:
  - **Generator OJK Tahap 1**: Andika (RAD) dari proyek OJK, diterima Ali di Generator Soal OJK dan
    sedang dikerjakan; Nynda (Manager) meninggalkan satu komentar.
  - **Scraper bank soal TKA SMA**: Alya (LNA) dari proyek TKA, masih menunggu (coba **Terima**,
    **Tanya dulu**, atau **Tolak** sebagai Ali).
  - **Rapikan 200 PDF materi lama**: Bagas (CLO), ditolak Ali dengan alasan.
  - **Dashboard rekap pendaftar tryout**: Dhea (CLO) dari proyek OJK, sudah satu putaran revisi dan
    kini menunggu tinjauan Dhea (coba **Setujui** atau **Kembalikan untuk revisi** sebagai Dhea).
- Beberapa Catatan Saya dan Link Saya contoh di folder "Contoh" (tautannya dari Tautan tim).
- **Acara bersama** (2.33.0), ditulis ke tab `agenda` dengan tanda contoh (hanya terlihat selama
  sumber data contoh; impor ulang menimpanya karena ID-nya tetap):
  - **Rapat mingguan Divisi Produk** (Nynda, tiap Senin 09.00, Terbuka) dengan semua Lead; Alya
    menjawab Mungkin, Dhea belum.
  - **Kickoff proyek PAPI Kostick** (sudah lewat) dengan notulen dan tiga tindak lanjut: dua sudah
    jadi task (D2 Andika, D4 Ali), satu belum (coba **Jadikan task**).
  - **Review blueprint PAPI Kostick** besok, dibuat Andika (RAD) dengan Ali (DAE), Nynda, dan Uma:
    contoh lintas tim; Uma belum menjawab.
  - **Sinkron input & QC soal TKA** (Alya, LNA) dengan Kiki, Andika, dan Dhea; Dhea tak hadir.
  - **Sharing session ProductTrack v2** (Ali, Terbuka), ditautkan ke inisiatifnya; Nadya ikut
    sendiri.

Bentuk tab hanya bertambah (kolom `paket` di `projects`; tab `setoran`, sejak 0.6.0 dengan kolom
`tahap` dan `batch`), jadi versi yang sedang live tetap bisa membaca hasil impor ini. Versi baru
pun bisa membaca spreadsheet yang belum punya tab atau kolom itu.

---

## Tes

```bash
npm test
```

Google Sheets ditiru di dalam tes, jadi tak butuh kredensial maupun jaringan. Tes yang paling
penting adalah *sheet v1 ditolak — dan tak satu pun tulisan terjadi*.

Selain tes per aturan, `test/acak.test.js` menjalankan simulasi acak dengan benih tetap:
ratusan aksi sungguhan (status, output & bukti, task turunan, ganti PIC dan sub-stage, sub-task)
oleh orang yang berganti-ganti. Tiap langkah memeriksa hirarki task turunan, urutan tahap, dan
bahwa semua hitungan tampilan tetap jalan.

Data real diuji di dua tingkat. `test/real.test.js` memastikan perubahan yang disimpan selalu
sama dengan menjalankan perintahnya, termasuk simulasi acak 2 × 400 perintah.
`test/real-rpc.test.js` menguji jalur server: sumber data hanya diganti Dev, aturan berlaku di
server atas nama profil sesi, kiriman ulang, tarikan bertahap, perubahan besar yang terpecah, tab
yang dibuat ulang, dan dua instance yang menyimpan bersamaan.

**Setiap rilis:** naikkan versi di `package.json` **dan** `?v=` di `public/index.html` (tes
`berkas` menolak kalau berbeda). Dengan begitu browser atau proxy kantor tak mencampur `inti.js`
lama dengan `app.js` baru. Catat rilisnya di `CHANGELOG.md` dan perbarui README. Sejak 2.16.0
versinya berawal 2 (v2): angka tengah naik untuk fitur, angka akhir untuk perbaikan.

## Batasan yang disadari

- **Di data contoh, suntingan hanya di browser itu.** Data contoh dimuat dari server, tetapi
  yang diubah orang (status, tinjauan, sub-task, gate proyek, paket) tersimpan di browser
  masing-masing (localStorage). Pengecualiannya pesan Komunikasi dan foto profil, yang tersimpan
  bersama di spreadsheet (lihat *Komunikasi bersama* dan *Foto profil*). Tombol **Reset data
  contoh** di kaki sidebar (di ponsel: Menu) membuang semua perubahan itu dan memuat ulang data
  contoh dari spreadsheet. Data contoh di spreadsheet tak pernah diubah aplikasi, jadi selalu
  utuh. Jejak dan tombol aksi task di percakapan mengikuti data task di browser masing-masing,
  dan **tautan ke task yang dibuat di browser lain tidak ditemukan** (aplikasi memberi tahu
  "tidak ada di data browser ini"). Di **data real** semua itu tersimpan bersama (lihat *Sumber
  data*).
- **Link Saya dan Catatan Saya tetap di browser itu**, di data contoh maupun data real, jadi
  belum terbagi antarperangkat.
  - **Beberapa tab (2.46.1, keluhan user: catatan yang sudah dimasukkan hilang).** Sampai 2.46.0
    tiap tab v2 menulis ulang salinan Catatan/Link pribadinya setiap kali ada perubahan data real
    dari tim, jadi tab yang lama terbuka menimpa catatan yang baru ditulis di tab lain. Kini
    salinan cepat data real (`simpanCacheReal`) tak lagi menulis data pribadi; data pribadi
    ditulis `simpanPribadi` hanya saat isinya berubah, sesudah digabung tiga arah dengan yang
    tersimpan (`Inti.gabungPribadi`: per ID, yang diubah satu pihak ikut pihak itu, diubah keduanya
    yang terbaru, dihapus dan tak diubah pihak lain ikut terhapus). Tab lain ikut diperbarui lewat
    peristiwa `storage`. Diuji di `test/catatan-antartab.test.js`.
  - **Pulihkan catatan.** Catatan yang hilang tanpa dihapus tetapi riwayat versinya masih ada di
    browser itu (menghapus catatan ikut menghapus riwayatnya) ditawarkan di atas Catatan Saya:
    **Lihat dan pulihkan** membuatnya kembali di folder Umum dari versi terakhirnya, dan versi
    lainnya tetap di Riwayat versi catatan itu. Hanya di data real; catatan data contoh tak
    dihitung. Catatan yang tak pernah diubah sesudah dibuat tak punya riwayat versi, jadi tak bisa
    dipulihkan dengan cara ini.
  - Data contoh masih menyimpan semuanya dalam satu salinan per browser, jadi dua tab data
    contoh tetap bisa saling menimpa.
- **Agen AI Ali hanya berjalan selama Agent Office menyala** di komputer Ali: jadwal yang
  terlewat tidak dijalankan susulan. Tugas AI-nya memakai kredit API, dan perubahan task hanya
  tersimpan di data real.
- **Data real tiba di browser lain paling lambat 20–30 detik kemudian**, dan tarikannya berhenti
  selama tab tak terlihat. Riwayat `data_real` hanya bertambah dan dibaca utuh setiap kali
  instance server menyala dan setiap kali browser baru pertama membukanya (lihat *Nanti di
  MySQL* di bagian *Sumber data*).
- **Profil tanpa PIN pribadi masih bisa dipakai siapa pun.** Foto profil dan pesan atas nama
  profil ber-PIN terlindungi sejak 0.14.0 (lihat *Master & PIN profil*); profil tanpa PIN tetap
  dipilih bebas, sama seperti data lain di prototipe. Login per orang sungguhan belum ada.
- **Notifikasi hanya di dalam aplikasi.** Pesan Komunikasi terbagi untuk semua orang; aktivitas
  task lainnya dari data di browser itu. Belum ada email atau push.
- **Pesan yang diubah atau dihapus tetap ada di spreadsheet.** Aplikasi hanya menampilkan
  versi terakhir atau "Pesan dihapus"; teks aslinya masih terbaca di tab `obrolan`. Pengirim
  pesan hanya terbukti untuk profil ber-PIN.
- **Profil dipilih sendiri** karena PIN aplikasi dipakai bersama. Selama Manager belum ber-PIN,
  siapa pun bisa masuk sebagai Manager.
- **Lingkup per peran baru di tampilan.** Staff, Lead, dan Manager melihat lingkup berbeda,
  tetapi seluruh data contoh tetap dikirim ke browser dan profil dipilih sendiri. v1 menyaring
  data di server untuk magang dan Lintas Divisi; v2 belum. Siapa pun yang tahu PIN v2 bisa
  melihat seluruh data contoh, jadi jangan bagikan PIN v2 ke magang atau Lintas Divisi.
- **Fase per tim (2.19.0).** Fase Evaluation sebuah tim menunggu semua task tim itu di fase
  sebelumnya di proyek yang sama, juga dari batch lain (mis. QC LNA sebuah Latsol menunggu
  tayang live class LNA). Lead bisa melepas task tertentu dari urutan fase timnya. Proyek dan
  task yang dibuat sebelum 2.19.0 belum punya urutan serah-terima: tim yang berbeda langsung
  berjalan sejajar sampai Lead-nya mengatur urutan. Impor v1 juga tak memasang urutan antartim,
  karena proses v1 yang diselingi tim lain bisa saling mengunci.
- **Data contoh yang diimpor sebelum 0.15.0** dijalankan dengan aturan lama: langkah batch
  berurutan, dan langkah Lead diserahkan ke staff (PIC staff, bukan task turunan). Di 0.15.0 task
  tahap berikutnya di sana yang sudah berjalan ikut menunggu tahap sebelumnya selesai. Impor
  ulang `npm run impor:v1 -- --demo` memasang skenario contoh baru; kolom `induk` di tab `tasks`
  hanya menambah, jadi versi live lama tetap membacanya.
- Task turunan hanya satu tingkat dan tak bisa dipindah ke induk lain.
- Satu task hanya menyetor saat task-nya Selesai; setoran per sub-task belum ada.
- Bobot capaian bawaan (40/60/85/100) serta alur Dibimbing dan Live Class masih usulan PRD;
  sejak 0.14.0 bisa diubah di Master.
- Dari PRD v3 yang ditunda: fase bertenggat bertingkat, template task rutin berulang, heatmap,
  dan modul Issue & Evaluasi.
- Pemetaan sub-stage task v1 berbasis kata kunci di judul, jadi sebagian kecil bisa meleset.
  Lead memperbaikinya lewat **Ubah**.
- Seret-lepas kartu di Kanban hanya di desktop; di ponsel status diubah lewat detail task.
- **Tebakan PIN hanya diperlambat** (jeda ±0,7 detik per PIN salah), belum dibatasi lajunya.
  Pakai PIN yang panjang.
- Gerbang yang belum disetel berarti **tertutup**. Ini berbeda dengan v1, yang terbuka kalau
  semua PIN kosong.

## Langkah berikutnya

1. Pindahkan data real dari spreadsheet ke MySQL sebelum riwayat `data_real` membesar (Panel
   Dev memperingatkan di atas ±20 MB). Keputusan user: spreadsheet dulu, MySQL menyusul.
   Tabelnya sudah dirancang di `db/produk_base_v2.sql`: 32 tabel berawalan `v2_` di skema
   `produk_base` yang sudah ada (keputusan user: tanpa skema baru), berdampingan dengan 18 tabel
   salinan v1 tanpa menghapusnya. `test/skema-mysql.test.js` menjaga tabel itu tetap sejalan
   dengan `api/_skema.js`. Aturannya sudah berjalan di server (`api/_real.js`), dan nomor baru
   sudah ditentukan server. MySQL hanya terjangkau dari jaringan kantor dan Cloud Run, tidak dari
   Vercel.
2. Login per orang, supaya profil berasal dari login, data bisa disaring per peran, dan Link
   Saya kembali pribadi.
3. Sebelum menggantikan v1: endpoint metrics dan MCP (dipakai sistem OKR manager), lalu migrasi
   sekali dari Spreadsheet v1 lewat pemetaan `scripts/_v1ke2.js`.
