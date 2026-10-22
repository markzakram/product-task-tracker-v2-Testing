# Changelog — ProductTrack v2

## 2.47.0 — Pengembangan: hierarki inisiatif dan subinisiatif (2026-10-22)

Menu **Inisiatif** menjadi **Pengembangan**. Pekerjaan berkelanjutan dapat disusun bertingkat,
misalnya Generator Soal → Generator Soal OJK → Integrasi Platform Latihan, lalu task pembaruannya.

- **Pohon pengembangan** memakai kartu, warna, dan tombol aplikasi yang sudah ada. Panah melipat
  cabang; nama membuka detail. Saringan status tetap menampilkan jalur induk hasil yang cocok.
- **Tambah subinisiatif** dari detail, dengan PIC awal mengikuti induk dan bisa diganti. Form
  **Ubah → Inisiatif induk** memindahkan cabang tanpa mengganti ID, task, diskusi, atau tautannya.
  Pilih tingkat utama untuk melepaskan dari induk. Status/PIC tiap wadah tetap mandiri.
- **Jalur navigasi dan pilihan lengkap**: lokasi induk–anak tampil di detail, pilihan tujuan
  pembaruan, pemulihan task, acara, dan penerimaan/pemetaan permintaan DAE.
- **Ringkasan seluruh turunan** menggabungkan task berjalan, telat, riwayat, angka kerja, dan
  permintaan terbuka. Setiap task dihitung satu kali per ringkasan. **Di sini saja** membatasi
  ringkasan dan riwayat ke task yang langsung menempel pada wadah terpilih.
- **Validasi bersama browser/server** menolak induk hilang, tim berbeda, diri sendiri, dan siklus
  melalui turunannya. Wadah yang memiliki subinisiatif tidak bisa dihapus. Hapus task dari
  halaman inisiatif tetap tersedia; wadah dan subinisiatifnya tetap tersimpan.
- **Kompatibel dengan data lama**: kolom `inisiatif.induk` kosong berarti tingkat utama. Data
  real menyimpan perubahan lewat jurnal yang sudah ada, tanpa impor ulang; skema Sheets dan
  referensi MySQL turut diperbarui. Data impor dengan rujukan putus tetap dapat ditampilkan.
- **Nama dan contoh**: tiga akar Generator Soal, Pengumpulan Data, dan Aplikasi Internal;
  data contoh berisi 26 wadah termasuk subinisiatif OJK/SKD, scraper, dan aplikasi. Form memberi
  saran nama. Data real yang sudah ada tidak otomatis diganti namanya atau dipindahkan.
- Panduan, README, terjemahan Inggris, dan tes hierarki/agregasi/penyimpanan diperbarui.

## 2.46.2 — Hapus task langsung dari halaman inisiatif (2026-10-22)

Permintaan user: task/pembaruan yang sudah dibuat di dalam inisiatif bisa dihapus.

- **Tombol Hapus** di setiap task yang berizin pada **Sedang berjalan** dan **Riwayat pembaruan**.
  Sebelumnya, penghapusan hanya tersedia setelah membuka detail task.
- Memakai izin dan konfirmasi hapus task yang sudah berlaku. Konfirmasi menjelaskan bahwa
  **wadah inisiatif tetap ada**; yang dihapus adalah task beserta data terkaitnya. Pembaruan lain
  tetap tersimpan dan ringkasan inisiatif dihitung ulang, termasuk setelah pembaruan terakhir dihapus.
- Form tanggapan yang menunjuk task yang baru dihapus ikut ditutup. Penanda asal permintaan DAE
  tetap tersedia pada task yang sedang berjalan.
- Tes regresi di `test/hapus-task.test.js`: hapus task berjalan dan selesai, penolakan pengguna
  tanpa izin, wadah tetap utuh, ringkasan diperbarui, serta perubahan data real tidak menghapus
  inisiatifnya. Tidak ada perubahan skema data.

## 2.46.1 — Catatan Saya tak lagi tertimpa tab lain; pulihkan catatan yang hilang (2026-10-21)

Keluhan user: catatan yang sudah dimasukkan di data real v2 hilang.

- **Penyebab:** Catatan Saya dan Link Saya hanya tersimpan di browser. Setiap tab v2 menulis ulang
  salinan miliknya setiap kali ada perubahan data real dari tim, jadi tab yang sudah lama terbuka
  menimpa catatan yang baru ditulis di tab lain. Setelah dimuat ulang, catatan itu hilang.
- **Perbaikan:** data pribadi kini hanya ditulis saat isinya berubah di tab itu, dan sebelum
  ditulis digabung dengan yang tersimpan sekarang (per catatan: yang diubah satu tab ikut tab itu,
  diubah keduanya yang terbaru, yang dihapus ikut terhapus). Tab lain yang terbuka ikut diperbarui
  seketika.
- **Pulihkan catatan:** catatan yang hilang tanpa dihapus, tetapi riwayat versinya masih ada di
  browser itu, ditawarkan di atas Catatan Saya (**Lihat dan pulihkan**). Pulihkan membuatnya
  kembali di folder Umum dari versi terakhirnya; Buang menghapus riwayatnya. Catatan yang tak
  pernah diubah sesudah dibuat tak punya riwayat versi, jadi tak bisa dipulihkan dengan cara ini.
- Tes baru `test/catatan-antartab.test.js`.

## 2.46.0 — Permintaan ke tim DAE (2026-10-21)

Permintaan user: anggota tim lain (RAD, LNA, CLO) sering butuh tim DAE membangun sesuatu dari
hasil proyeknya (generator soal, scraper, dashboard), tetapi tak ada jalur resminya. Rancangan
disetujui user lewat pratinjau; tambahan dari user: hasil kerja DAE **wajib ditinjau pengirim
permintaan**, dan Manager hanya mengawasi.

- **Mengirim.** Di detail proyek, tombol **Minta ke tim DAE** (Lead dan staff tim yang punya task
  di proyek itu; bukan anggota DAE, bukan Manager). Isinya: yang diminta, jenis (Generator soal,
  Scraper, Dashboard, Lainnya), kebutuhan, bahan riset (satu tautan per baris), dan tenggat yang
  diharapkan. Tercatat dengan proyek asal, tim peminta, dan pengirim; statusnya Menunggu.
- **Halaman Permintaan** (Pekerjaan, di bawah Inisiatif; anggota DAE, Manager, dan Dev). Lencana =
  jumlah yang menunggu. Saringan Menunggu, Diterima, Ditolak. Tiga aksi untuk yang berizin
  (`permintaan.terima`, bawaan Lead, hanya anggota DAE):
  - **Terima, buat task**: pilih inisiatif (terisi dari peta jenis, hanya yang Aktif), PIC anggota
    DAE, dan tenggat. Jadi task DAE di jalur rutin yang tertaut ke permintaan dan proyek asal.
  - **Tanya dulu**: pertanyaan masuk ke diskusi permintaan; statusnya Ditanya sampai pengirim
    membalas atau menyunting permintaannya.
  - **Tolak**: alasan wajib. Pengirim diberi tahu pada ketiganya.
- **Peta jenis → inisiatif** (tombol di halaman Permintaan, izin `permintaan.peta`, bawaan Lead
  DAE). Disimpan di inisiatifnya (kolom `menerima`) dan tampil di Tentang inisiatif. Hanya
  inisiatif Aktif yang bisa dipetakan: yang Ditunda ditolak saat disimpan ("sedang ditunda, jadi
  tidak menerima permintaan"), karena form Terima hanya menawarkan yang Aktif.
- **Tinjauan wajib oleh pengirim.** Task dari permintaan tidak bisa langsung ditandai selesai: PIC
  mengisi output lalu mengajukan, pengirim menyetujui (task dan permintaan Selesai, output tampil
  di proyek asal) atau mengembalikan untuk revisi (catatan wajib, putaran dihitung, bisa
  berulang). PIC tak bisa menyetujui task-nya sendiri; Manager tak bisa menyetujui atau meninjau,
  hanya melihat dan berkomentar. Peninjau: pengirim, lalu Lead tim peminta, lalu anggota aktif lain
  tim peminta (yang terlibat di proyek asal didahulukan); tak pernah Dev, Manager, atau PIC.
  Dihitung ulang saat diajukan dan saat ditinjau. Kalau tak ada siapa pun, task tetap Ditinjau
  dengan peringatan "Belum ada peninjau aktif di tim X"; Lead DAE dan Manager melihatnya di Hari Ini
  sebagai bahan pengawasan, tanpa bisa menyetujui.
- **Blok Permintaan ke tim lain** di proyek asal: langkah Dikirim → Diterima → Dikerjakan →
  Ditinjau → Selesai (ditambah Ditanya, Revisi, Ditolak), PIC DAE, tenggat, inisiatif, hasil kerja,
  dan tombol Setujui / Kembalikan untuk revisi bagi pengirim.
- **Di inisiatif**: task dari permintaan bertanda "Diminta dari <proyek> · <tim>" (juga di riwayat
  pembaruan dan detail task), kartu menampilkan jumlah permintaan terbuka, dan Tentang memuat jenis
  yang diterimanya.
- **Notifikasi** (lonceng): permintaan baru (Lead DAE), ditanya, dibalas, komentar, ditolak,
  diterima, siap ditinjau, revisi, selesai, dan **berubah** (pengirim: task-nya dihapus sehingga
  permintaan kembali Menunggu, dipulihkan, atau yang sudah ia setujui dibuka kembali).
- **Izin baru** di Panel Dev → Izin: `permintaan.terima` dan `permintaan.peta` (bisa diatur,
  bawaan Lead; **Manager tak pernah**, kolomnya tak bisa dicentang), `permintaan.kirim` dan
  `permintaan.tinjau` (tetap).
- **Hapus, Pulihkan, dan Buka kembali.** Task yang dihapus mengembalikan permintaan ke Menunggu.
  Task yang dipulihkan **tetap tertaut ke permintaannya dan tetap ditinjau pengirim** (bukan task
  rutin biasa), dan permintaannya disejajarkan; Pulihkan ditolak bila permintaannya sudah diterima
  lagi dengan task lain atau sudah ditolak. PIC dan inisiatif permintaan mengikuti task-nya.
- **Banding perpanjangan tenggat** task dari permintaan diputuskan pengirim (rantai cadangan seperti
  peninjau), bukan Manager; kolom `permintaanDae` di `perpanjangan`.
- Perbaikan dari 2.45.0 yang ikut: pengajuan tinjau yang dikembalikan lalu diajukan lagi tak lagi
  memberi peninjau **dua** notifikasi "tinjau" (juga untuk task proyek).
- **Data**: koleksi `permintaanDae` (ID `MDA-001`) ikut data real tanpa tab atau langkah baru;
  untuk data contoh tab `permintaan_dae`, `permintaan_dae_links`, `permintaan_dae_utas` (opsional;
  sheet lama tetap terbaca), kolom `menerima` di `inisiatif`, `permintaanDae` + `peminta` di
  `tasks`, dan `permintaanDae` di `perpanjangan`; tiga tabel dan empat kolom yang sama di
  `db/produk_base_v2.sql` (kini 32 tabel).
- **Data contoh**: enam inisiatif (Generator Soal menggantikan "AI Generate Soal", Dashboard dan
  laporan menggantikan "Dashboard internal", ditambah Scraper dan data kompetitor serta Otomasi
  operasional) dan empat permintaan yang meniru pratinjau. Tampil setelah `npm run impor:v1 -- --demo`
  dijalankan lagi.
- Tes baru `test/permintaan-dae.test.js` (34 tes, termasuk satu tes per butir perbaikan QA); tes lama yang disesuaikan: `test/demo.test.js`
  (daftar inisiatif contoh), `test/skema-mysql.test.js` (jumlah tabel), `test/sheets.test.js`
  (fixture). Panduan: Staff, Lead, Manager, dan Istilah; terjemahan Inggris ditambah.
## 2.45.0 — Task rutin bisa disambungkan sebagai pembaruan proyek (2026-10-20)

Permintaan user: tim DAE sering membuat task rutin yang sebenarnya pembaruan inisiatif atau
proyek yang berjalan terus; ingin pilihan menyambungkannya sebagai pembaruan, tetap dengan hasil
kerja, ceklis pengerjaan, dan diskusi supaya Manager bisa mengomentarinya. Pilihan user: tab
Pembaruan di proyek, sementara khusus tim DAE dan Manager.

- **Pembaruan untuk** (form Tambah task dan detail task di luar proyek): pilih inisiatif atau
  proyek. Jalur **Inisiatif** di form kini bernama **Pembaruan**. Satu task disambungkan ke satu
  tempat; memindahkannya ke yang lain melepas yang lama.
- **Pembaruan proyek tetap task rutin**: tanpa tinjauan, tak menggeser fase, progres, label
  terlambat proyek, maupun E12; hasil kerja, ceklis, bukti, dan diskusinya seperti task lain.
  Seperti pembaruan inisiatif, tak menyetor ke rancangan paket.
- **Tab Pembaruan** di halaman proyek: tombol Tambah pembaruan, yang sedang berjalan, dan
  linimasa per hari dengan **Tanggapi** seperti halaman Inisiatif. Bagi Manager, tab itu
  bertanda bila ada pembaruan 30 hari yang belum ia tanggapi.
- Menghapus proyek melepas pembaruannya, task-nya tetap ada.
- Data: kolom `pembaruanProyek` di tab `tasks` dan `v2_tasks`. Tes baru
  `test/pembaruan-proyek.test.js`; panduan Manager dan Istilah diperbarui.

## 2.44.0 — Pulihkan task yang terhapus sebagai task rutin (2026-10-20)

Permintaan user: task PRD-190 hilang. Riwayat data real menunjukkan task itu ikut terhapus saat
proyeknya (PRJ-4) dihapus pada 19 Oktober pukul 17.53; pengajuan perpanjangannya tak pernah
tersimpan. User minta: "pulihkan saja tetapi buat saja dalam bentuk task rutin yang nantinya
bakal terhubung dengan task inisiatif (opsional)".

- **Pulihkan sebagai task rutin.** Di **Komunikasi**, utas task yang sudah terhapus dari data real
  kini menulis "Task terhapus" (bukan "Task di browser lain"), menyebut siapa yang menghapus,
  kapan, dan bersama proyek apa. Lead dan Manager (izin baru `task.pulihkan`) mendapat tombol
  **Pulihkan sebagai task rutin**: task kembali dengan **ID yang sama**, jadi percakapannya
  tersambung lagi.
- Yang ikut: judul, PIC, pemberi, keterangan, ceklis beserta centangnya, output, bukti, komentar,
  dan riwayat tinjauan. Yang berubah: jadi task rutin di luar proyek (proyek dan sub-stage-nya
  dilepas), status **Ditinjau** kembali **Dikerjakan** karena task rutin tak ditinjau.
- **Tempel ke inisiatif (opsional)** di jendela yang sama: task tampil sebagai pembaruan di
  halaman inisiatif itu. Inisiatif yang namanya ada di judul task dipilihkan lebih dulu. Tenggat
  bisa diganti sekaligus.
- **Isinya diambil server, bukan browser.** Aksi RPC baru `taskTerhapus` membaca isi terakhir task
  dari riwayat `data_real`; `simpanReal` untuk `pulihkanTask` mengisi ulang isi task dari riwayat
  itu, apa pun yang dikirim browser. Agen AI tak bisa memulihkan task.
- Di data contoh tak ada tombol ini (data contoh tersimpan per browser).
- Tes baru `test/pulihkan.test.js`.

## 2.43.0 — Urutan ADDIE fleksibel; sub-stage jadi judul di tabel Daftar (2026-10-20)

Permintaan user: (1) "ADDIE dibuat fleksibel saja, jadi ketika statusnya masih di A, V tetap
bisa dikerjakan" — dipilih untuk semua proyek, termasuk gerbang Manager; (2) tabel Daftar juga
memakai sub-stage sebagai judul.

- **Fase dan gerbang Manager kini pengingat, bukan penahan.** Task di fase lebih akhir boleh
  dimulai dan diajukan walau task timnya di fase lebih awal, atau A1/A6 Manager, belum selesai.
  Kartu **Langkah berikutnya** tetap **Siap dimulai**, ditambah keterangan "Boleh dimulai
  sekarang, mendahului urutan ADDIE: A2 belum selesai" dan tombol **Lihat pengingat**. Bagian
  **Menunggu** di tab Riwayat menandainya "pengingat urutan ADDIE, tak menahan".
- **Yang tetap menahan:** urutan yang diatur Lead lewat **Atur urutan tunggu** (serah-terima
  antartim, mis. input LNA menunggu soal RAD) dan **E12** yang menutup siklus.
- **Ketatkan urutan ADDIE** (menu ⋯ proyek, Lead dan Manager; izin baru `proyek.urutan`):
  proyek itu kembali memakai fase dan gerbang sebagai penahan, seperti sebelumnya.
  **Longgarkan urutan ADDIE** mengembalikannya. Tercatat di Riwayat Aktivitas; kepala proyek
  menulis "Urutan ADDIE fleksibel" atau "Urutan ADDIE ketat". Duplikat proyek ikut menyalinnya.
- Notifikasi "siap", label Menunggu, dan hitungan yang menahan hanya memakai yang benar-benar
  menahan. Agen AI Ali ikut aturan yang sama (status Dikerjakan tak ditolak karena fase di proyek
  yang fleksibel).
- **Tabel Daftar** (halaman Task): kolom Task memakai kode dan nama sub-stage sebagai judul,
  judul task di bawahnya. Urutan kolom itu menurut tahap ADDIE dan kode sub-stage (A2, DV2, E2,
  E12, lalu rutin), kemudian judul task; task tanpa sub-stage di belakang.
- Perbaikan 2.42.1: kelas judul task di bawah sub-stage bertabrakan dengan kepala bagian Diskusi
  (`baris-subjudul`), kini `baris-task-sub`.
- Data: kolom `ketat` di tab `projects` (spreadsheet) dan tabel `v2_projects` (MySQL).
- Skenario contoh tetap mengerjakan langkahnya menurut urutan ADDIE. Tes lama untuk fase dan
  gerbang memakai proyek yang diketatkan; tes baru `test/addie-fleksibel.test.js`.

## 2.42.1 — Sub-stage jadi judul juga di baris dan kartu task (2026-10-20)

Permintaan user (tangkapan layar): detail task sudah benar, tetapi tampilan pratinjau task di
halaman proyek juga harus memakai sub-stage sebagai judul.

- **Baris task** (halaman proyek, Hari Ini, dan daftar lain yang memakai baris): kode dan nama
  sub-stage jadi judul ("D2 Kerangka course"), judul task di bawahnya. Task tanpa sub-stage tak
  berubah.
- **Kartu Kanban**: nama sub-stage jadi judul kartu (kodenya tetap di baris atas), judul task di
  bawahnya.
- Tabel Daftar di halaman Task tetap judul task dulu, karena kolom itu bisa diurutkan menurut judul.

## 2.42.0 — Lead juga bisa menghapus proyek (2026-10-19)

Permintaan user: fitur hapus proyek yang sudah dibuat, hanya untuk Manager dan Lead.

- Hapus proyek sudah ada sejak 2.22.0 (menu **⋯** halaman proyek), tetapi bawaan izinnya hanya
  Manager. Bawaan izin `proyek.hapus` kini Manager dan Lead; staff tetap tidak bisa. Berlaku di
  browser dan di server (data real).
- Pengamannya tetap: ringkasan apa saja yang ikut hilang (task, turunan, setoran paket), ID proyek
  harus diketik ulang, dan pilihan **arsipkan saja** untuk proyek yang sudah selesai.
- Kalau Panel Dev → Izin pernah menyimpan pengaturan sendiri untuk "Menghapus proyek", pengaturan
  itu yang berlaku: centang Lead di sana.
- Panduan Lead dan Manager diperbarui; tes izin ditambah.

## 2.41.0 — Banding perpanjangan tenggat; sub-stage jadi judul detail task (2026-10-19)

Permintaan user: (1) di detail task, sub-stage jadi judul dan judul task jadi sub-judulnya
("ditukar saja"); (2) fitur mengajukan banding supaya tenggat diperpanjang, langsung ke pemberi
task. (3) Lead harus bisa menjadikan staff-nya PIC lewat Ubah task seperti Andika.

- **Kepala detail task**: kode dan nama sub-stage jadi judul besar, judul task jadi sub-judul,
  lalu tim pemiliknya. Task tanpa sub-stage tak berubah.
- **Minta perpanjangan tenggat** (PIC, task belum selesai dan bertenggat): tenggat baru dan alasan,
  dikirim ke pemberi task (`Inti.pemberiTask`: yang memberi; task buatan sendiri ke Lead-nya;
  Lead ke Manager). Juga dari baris task terlambat di Hari Ini.
- Yang dituju (atau Manager) melihat kartu di Hari Ini, notifikasi, dan spanduk di detail task;
  **Setujui** (boleh tanggal lain, catatan opsional) mengubah tenggat, **Tolak** wajib beralasan;
  PIC diberi tahu. Pengaju bisa membatalkan selama belum dijawab.
- Data: koleksi `perpanjangan` di data real, tab opsional `perpanjangan`, tabel `v2_perpanjangan`
  (29 tabel). Salinan cepat data real dari versi sebelumnya disusun ulang sekali.
- (3) Tak ada perubahan aturan: dengan organogram bawaan, Ubah task bagi Lead (Alya, Dhea,
  Andika) sudah menawarkan dirinya dan semua staff timnya (diperiksa lagi di aplikasi dan
  `test/pic-task.test.js`). Ikon pensil hanya hilang bila profil yang membuka tak dianggap Lead
  task itu, misalnya perannya di organogram (Mode Dev → Orang) bukan Lead.
- Tes baru `test/perpanjangan.test.js`. 347 tes.

## 2.40.0 — Urutan target rancangan paket bisa diseret (2026-10-19)

Permintaan user: daftar target yang sudah dibuat di rancangan paket bisa di-drag supaya
urutannya sesuai keinginan pembuat rancangan.

- Di form **Ubah rancangan paket**, tiap baris target punya pegangan ⋮⋮ di kiri. Seret dengan
  tetikus atau jari (sela kosong di baris juga bisa dipegang; isiannya tetap bisa diketik), atau
  fokuskan pegangannya lalu tekan panah atas/bawah. Barisnya pindah langsung, di dalam
  kategorinya; halaman ikut bergulir saat diseret ke tepi.
- Urutan baru tersimpan saat **Simpan rancangan** (urutan baris form = `urutan` target), dan
  form ditandai berubah sehingga Batal tetap meminta konfirmasi.
- Di ponsel pegangannya memanjang di sisi kiri kartu target.
- Tes baru di `test/paket.test.js`.

## 2.39.0 — Halaman inisiatif sebagai linimasa, dengan tanggapan Manager (2026-10-19)

Permintaan user: halaman detail inisiatif "masih sangat jelek", dan Manager perlu bisa
mengomentari pembaruan-pembaruannya. Sesudah melihat kanvas rekomendasi (sebelum, tiga opsi,
alur komentar, ponsel), user memilih Opsi A dengan komentar Manager.

- **Kepala ringkas**: tombol Tambah pembaruan berukuran biasa (dulu selebar halaman), tujuan atau
  ajakan mengisinya.
- **Empat ubin**: pembaruan 30 hari, commit dan sesi kerja 7 hari (dibaca dari kolom output yang
  diisi agen; inisiatif tanpa angka itu menampilkan yang berjalan dan telat), terakhir diperbarui.
- **Linimasa per hari**: Hari ini/Kemarin/tanggal dengan jumlah pembaruan, commit, file, dan sesi;
  kartu pembaruan dengan judul tanpa awalan nama inisiatif, ringkasan, chip angka kerja, bukti,
  dan pesan terakhirnya. Riwayat lama yang tak sejajar (judul merah di tengah) diganti.
- **Tanggapan**: tombol Tanggapi dengan tanggapan cepat (Bagus, Perlu dibahas, Pertanyaan) dan
  Perlu jawaban; disimpan di diskusi task pembaruannya (tanpa data baru), bertanda Manager, dan
  memberi tahu PIC. Saringan Ada tanggapan / Belum ditanggapi; di daftar Inisiatif, Manager melihat
  berapa pembaruan 30 hari yang belum ia tanggapi.
- Kolom samping Tentang, Sedang berjalan, dan Acara; di ponsel semuanya bertumpuk.
- Panduan baru **Memantau dan menanggapi inisiatif** (Manager). Tes baru `test/linimasa.test.js`.

## 2.38.1 — Edit PIC menampilkan Lead dan seluruh staff tim (2026-10-19)

Permintaan user (screenshot): dropdown PIC task induk yang sudah punya lima task turunan hanya
menampilkan Lead. Aturan lama mengunci PIC induk dan menyembunyikan staff untuk task milik Lead.

- **Ubah task** menawarkan Lead dan seluruh staff aktif tim pemilik dari organogram terkini,
  termasuk pada task milik Lead dan task induk yang sudah dibagi. Daftar pilihan dan validasi
  penyimpanan memakai `Inti.pilihanPicUbah` yang sama di browser dan server.
- PIC induk dan turunannya bisa diganti dalam tim pembagi. PIC masing-masing turunan tetap;
  ceklis pengerjaan mengikuti PIC task yang diubah. Tahap induk dan turunan tetap sama, dan
  induk tetap menunggu semua turunannya selesai sebelum diajukan.
- Izin penyuntingan tetap berlaku: staff tidak menyerahkan task ke orang lain. Profil nonaktif
  tidak ditawarkan untuk penugasan baru; PIC lama tetap terbaca sampai diganti.
- Petunjuk form, terjemahan, dan Panduan diperbarui. Regresi diuji pada induk dengan lima turunan,
  pergantian Lead/staff, perubahan organogram, batas izin, serta simpan dan sinkron data real.

## 2.38.0 — Task hasil permintaan ditinjau tim peminta; sebutan @all (2026-10-19)

Permintaan user: (1) task lanjutan yang diminta divisi 1 ke divisi 2 ditinjau divisi peminta
("kalau buat generator dari hasil kerja RAD berarti DAE ... yang acc itu RAD bukan manager.
Manager hanya memantau untuk case ini"). (2) Tag @all supaya masuk ke notifikasi semua user.

- **Peninjau task hasil permintaan** = Lead tim peminta (`Inti.peninjauMinta`, di dalam
  `Inti.peninjau`): Andika meminta Ali → task Ali ditinjau Andika, bukan Nynda; peminta staff →
  Lead-nya. Tombol Setujui/Kembalikan hanya untuknya; Manager tak lagi bisa menyetujui task ini
  (hanya memantau). Pengecualian: sub-stage yang direview Manager, permintaan di dalam tim
  sendiri, dan task turunan. Detail task menulis "ditinjau Andika (tim peminta; Manager
  memantau)", dan form Terima memberi tahu peninjaunya sebelum diterima.
- Kolom baru `diminta` di task (tab `tasks`, `v2_tasks.diminta`), diisi saat permintaan
  diterima. Permintaan yang diterima sebelum versi ini tetap ke peninjau lama.
- **@all** = @semua: semua yang boleh membuka ruangnya mendapat notifikasi (ruang task/proyek
  semua orang; ruang tim anggotanya dan Manager). Muncul di saran saat mengetik @.
- Panduan **Meninjau hasil kerja** dan **Meminta lanjutan ke tim lain** diperbarui. Tes baru di
  `test/permintaan.test.js` dan `test/obrolan.test.js`.

## 2.37.0 — Agen Ali mencatat pekerjaan harian sebagai task (2026-10-16)

Permintaan user: pekerjaan harian Ali (commit, perubahan yang belum di-commit, sesi kerja) dicatat
di ProductTrack tanpa mengetik ulang. Rekap disusun di Agent Office; usulan yang diterima Ali
ditulis agennya sebagai task. Sebelumnya server menolak agen membuat task.

**Perlu deploy server: ya.** Satu perubahan di `public/inti.js` (`taskBaru` masuk
`Inti.AKSI_AGEN`) dibaca `api/rpc.js` dan tak ada tanpa deploy. Sebelum server di-deploy,
`agen/buat-task.js` berhenti dengan "Server ProductTrack belum mendukung agen membuat task" dan tak
ada yang ditulis; `agen/pilihan-task.js` dan `buat-task.js --uji` tetap jalan karena hanya membaca.
Browser tak berubah (versi dan `?v=` naik karena `inti.js` berubah).

- **Server**: agen boleh membuat task (`taskBaru`). Server memeriksanya seperti form Tambah task
  atas nama Ali (proyek, sub-stage, PIC, inisiatif); yang bertanda AI adalah aktivitas "Dibuat
  untuk …" dan aksi statusnya. Proyek, paket, inisiatif, Master, PIN, serta ubah dan hapus task
  tetap pekerjaan Ali di aplikasi.
- **Pilihan form** (`agen/pilihan-task.js`, hanya membaca): proyek aktif beserta timnya, sub-stage
  proyek (tim Ali di atas) dan rutin, inisiatif yang bisa dipakai, orang yang boleh jadi PIC, status
  awal yang sah per jalur, dan aturan tenggat, ke `agen/.data/pilihan-task.json`.
- **Butir → task** (`agen/buat-task.js --berkas <usulan.json> [--uji]`): tiap butir diperiksa dengan
  aturan Inti yang sama dengan form (jalur **proyek**, **rutin**, dan pembaruan **inisiatif**), lalu
  dibuat di Antre dan dinaikkan ke status yang diminta dengan aksi yang sama dengan tombol (mulai,
  ajukan, selesai). Yang tidak sah ditolak dengan alasannya tanpa menghentikan butir lain; hasil per
  butir di `<berkas>.hasil.json`. Task proyek berhenti di Ditinjau (ditinjau Nynda), rutin dan inisiatif
  boleh Selesai. Hash commit dan path file ditulis di Keterangan task, bersama baris "Dicatat agen AI".
- **Idempoten**: butir yang sudah dibuat dicatat di `agen/.data/rekap-terkirim.json`, dan tiap
  perintah memakai ID tetap yang dikenali server, jadi jalan ulang (juga setelah catatan hilang atau
  jalan yang terputus) tak menggandakan task.
- **Agent Office**: pekerjaan baru `pilihantask` ("Ambil pilihan form task") dan `buattask` ("Simpan
  task dari rekap", isian berkas di `.data/usulan`, centang Uji saja) di `agen/agent-office.json`.
- **Alat MCP** `pilihan_task` (membaca) dan `buat_task` (menulis, lewat kartu Izinkan/Tolak). Aturan
  kerja agen (`agen/CLAUDE.md`) dan README (`agen/README.md`: cara pakai dan skema) diperbarui.
- Fungsinya di `agen/task.js`. Tes baru `test/agen-task.test.js` (aturan butir, idempotensi, urutan
  penulisan) dan `test/agen-task-e2e.test.js` (server uji lokal: agen masuk, mengambil pilihan, lalu
  membuat task proyek, rutin, dan inisiatif; butir tak sah ditolak; jalan ulang tak menggandakan).
  330 tes.

## Belum dirilis — Agen Ali: pekerjaan Lead (2026-10-13)

Permintaan user: agen Ali punya pekerjaan yang sesuai perannya sebagai Lead tim DAE. Semuanya
tanpa token, hanya membaca ProductTrack, dan hanya mengubah folder `agen/` (tidak ikut image
Docker), jadi versi aplikasi tidak naik.

- **Rekap tim** (`agen/rekap-tim.js`): status semua task tim per proyek (siklus berjalan) dan
  fase ADDIE, yang telat, tertahan, revisi, dan menunggu tinjauan, beban per orang dari
  kapasitas 6, serta berapa task yang dibagi lewat task turunan.
- **Laporan mingguan** (`agen/mingguan.js`, `--lalu` untuk minggu lalu): selesai (tepat
  waktu), diajukan, tinjauan oleh Ali, terlambat & tertahan, rencana 7 hari ke depan, dan kabar
  proyek. Ringkasannya di obrolan Agent Office; lengkapnya HTML (bisa dicetak jadi PDF) dan
  Markdown di `agen/laporan/` (tidak ikut git).
- **Antrean tim + saran PIC** (`agen/antrean.js`): langkah di Antrean tim dengan saran staff
  berbeban paling ringan, lalu yang pernah menyelesaikan sub-stage yang sama. Hanya saran;
  membagi task tetap dari ProductTrack. Tim tanpa staff mendapat penjelasan, bukan daftar kosong.
- **Cek kerapian data tim** (`agen/cek-data.js`): task proyek tanpa tenggat atau sub-stage,
  output kosong padahal sudah diajukan/selesai, turunan yang tertinggal, tenggat turunan
  melewati induknya, induk yang siap diajukan, menunggu task yang tidak ada lagi, PIC nonaktif,
  tertahan tanpa alasan, dan telat lebih dari 14 hari tanpa dimulai.
- Lingkupnya tim profil agen (`Inti.timOrang`): task bersub-stage milik tim ditambah task
  anggotanya, termasuk staff yang profilnya sudah dinonaktifkan (supaya terlihat untuk
  dipindahkan). Proyek arsip tidak dihitung.
- Ringkasan pagi: bagian "Sub-task untuk Anda" dihapus; sejak 2.29.0 butir ceklis tak punya PIC
  sendiri, jadi bagian itu selalu kosong.
- Fungsinya murni di `agen/tim.js`. Tes baru di `test/agen-tim.test.js` dan
  `test/agen.test.js` (keempat skrip dijalankan terhadap server uji). 272 tes.

## 2.36.0 — Permintaan lanjutan lintas tim; label terlambat per tim di proyek (2026-10-16)

Permintaan user: (1) dari task yang sudah selesai, bisa meminta penambahan task lintas tim
("Andika telah membuat rancangan, ingin request ke Ali untuk pembuatan prototype"); sesudah
melihat kanvas sebelum–sesudah, user memilih penerima menerima dulu, semua profil boleh meminta,
dan permintaan ke siapa pun dengan Lead-nya ikut tahu. (2) Label terlambat di halaman proyek:
Manager melihat semua; Lead dan timnya hanya kalau tim dan Lead-nya punya yang terlambat.

- **Minta lanjutan** di task yang selesai atau sudah diajukan (kartu Langkah berikutnya dan
  bagian baru **Permintaan lanjutan**), oleh PIC, Lead-nya, atau Manager: untuk siapa (tim mana
  pun), yang dibutuhkan, rincian, saran sub-stage (tim penerima di atas), tenggat harapan.
- **Permintaan masuk** di Hari Ini penerima (dan Lead-nya bila penerimanya staff), dengan
  **Terima** (PIC, sub-stage, tenggat → task di Antre, di proyek task asal, tertaut ke sana dan
  menunggunya bila belum disetujui), **Tolak** (alasan wajib), **Tanya** (obrolan task asal,
  peminta sudah disebut), dan **Alihkan** bagi Lead tim penerima.
- Peminta melihat statusnya di task asal (menunggu, diterima + task barunya, ditolak + alasan),
  bisa **Batalkan** dan **Kirim ulang**. Task baru menulis "Diminta … dari PRD-…".
- Notifikasi baru: diminta, staff Anda diminta, diterima, ditolak, dialihkan.
- Belum dijawab 2 hari kerja: masuk **Perlu perhatian** Dashboard dan diberi tanda di kartunya.
- Data: koleksi `permintaan` (ID `MNT-…`) di data real, tab `permintaan` (opsional), tabel
  `v2_permintaan` (28 tabel). Salinan cepat data real dari versi lama yang belum mengenal
  koleksi ini disusun ulang dari awal sekali.
- **Label terlambat/tertahan di kepala proyek** (`Inti.sorotProyek`): Manager semua tim; Lead dan
  staff hanya timnya (menurut PIC); tak muncul kalau timnya tak punya. Diklik → Task dengan
  **Tim saya** (staff kini juga punya pilihan ini selagi disaring ke satu proyek), jadi angkanya
  sama. Contoh data uji: proyek dengan 6 terlambat → Manager 6, Lead/staff LNA 4, Lead CLO 2,
  Lead RAD tanpa label (dua task di sub-stage RAD dipegang Lead CLO).
- Panduan baru **Meminta lanjutan ke tim lain**. Tes baru `test/permintaan.test.js` (8). 304 tes.

## 2.35.1 — Angka terlambat di proyek kini bisa ditelusuri di Task (2026-10-16)

Keluhan user (tangkapan layar): halaman proyek menulis "2 terlambat", tetapi sesudah diklik tab
Terlambat di Task berisi 0. Penyebab: angka di proyek menghitung semua tim, sedangkan Task untuk
Lead dibuka dengan lingkup **Tim saya** (Staff: **Saya**), jadi task terlambat milik tim lain
tak terlihat.

- Selagi Task disaring ke satu proyek, Staff dan Lead mendapat pilihan lingkup **Semua tim**
  (`Inti.lingkupTask`); keterangannya "Semua tim di proyek ini". Halaman proyek memang sudah
  menampilkan task semua tim kepada siapa pun, jadi tak ada yang baru terlihat.
- Chip "n terlambat" dan "n tertahan", "Lihat di Task", dan "dan n lagi · lihat di Task" di
  halaman proyek membuka Task dengan lingkup itu (Manager tetap **Semua**). **Tim saya** tetap
  bisa dipilih. Tanpa saringan proyek pilihan itu hilang dan lingkup kembali ke bawaan peran.
- Tes baru di `test/inti.test.js`. 296 tes.

## 2.35.0 — Obrolan lebih jelas: kepala ringkas, balasan cepat menurut keadaan, kartu tautan (2026-10-15)

Permintaan user: rekomendasi perbaikan fitur obrolan; sesudah melihat gambaran sebelum–sesudah
(kanvas "Obrolan sebelum–sesudah"), user meminta nomor 1–7 dikerjakan sekaligus.

- **Kepala utas ringkas**: sub-stage, status, "PIC → peninjau", dan tenggat sekali saja (dulu
  diulang di kotak konteks). Di ponsel nama sub-stage disembunyikan; kodenya tetap bisa diketuk.
- **Aksi pembalik di menu ⋯**: kepala utas memuat aksi utama (Mulai, Ajukan, Setujui, dan
  Kembalikan bagi peninjau); Tarik dari tinjauan, Buka kembali, dan tanda tertahan pindah ke ⋯,
  tetap dengan konfirmasi 2.34.3.
- **Info task** menggantikan kotak konteks: satu baris (output, yang ditunggu, syarat ajukan
  n/m) yang bisa dibuka untuk proyek dan daftar syaratnya.
- **Gelembung sendiri** berwarna aksen tipis tanpa bingkai (dulu dengan aksen gelap seperti
  merah terbaca seperti peringatan); tautan di dalamnya mengikuti warna teks.
- **Kejadian task berturut-turut diringkas** jadi satu baris yang bisa dibuka, dan tetap
  terbuka saat pesan baru masuk.
- **Balasan cepat menurut peran dan keadaan** (PIC dikerjakan/ditinjau/revisi/tertahan,
  peninjau, orang lain, ruang proyek/tim), dengan labelnya ("Balasan cepat · Ditinjau"). Di
  ponsel dibuka lewat tombol kilat dan menutup sendiri sesudah dipilih.
- **Lebih langsung**: pesan ditarik tiap 8 detik selama utas terbuka (dulu 20 detik di
  Komunikasi dan 30–60 detik di tab Diskusi halaman lain), dan seketika saat utas dibuka. Server
  tetap memakai bacaan yang sama selama 3 detik untuk semua, jadi kuota Sheets aman.
- **Kartu tautan** untuk Google Sheets, Docs, Slides, Forms, dan Drive: ikon jenisnya, judul
  (label tautan atau jenis berkas), dan alamat ringkas. Tautan lain tetap tautan biasa.
- Tes baru di `test/obrolan.test.js` (`kartuTautan`, `pesanCepatUntuk`). 295 tes.

## 2.34.3 — Konfirmasi sebelum Tarik dari tinjauan dan Buka kembali (2026-10-15)

Permintaan user (dengan tangkapan layar utas yang tak sengaja dibuka kembali): popup
verifikasi bila task akan ditarik kembali.

- **Tarik dari tinjauan** dan **Buka kembali** kini menanyakan dulu, dengan akibatnya: peninjau
  tak lagi diminta meninjau dan task yang menunggunya kembali menunggu; atau task yang sudah
  selesai kembali ke Dikerjakan (capaian paketnya ditarik lagi, bila ada).
- Berlaku dari detail task, kepala utas Komunikasi, dan seret kartu di Kanban. Fokus awalnya di
  **Batal**, jadi Enter yang tak sengaja tak menjalankannya.

## 2.34.2 — Task tertahan tak lagi menahan langkah berikutnya (2026-10-15)

Permintaan user: task yang tertahan (hold) bisa lanjut ke task berikutnya, dengan sistem yang
sama seperti yang sedang ditinjau.

- **Yang ditandai tertahan tak lagi menahan**: task yang menunggunya (urutan tunggu antartim,
  fase tim, gerbang Manager) boleh mulai dan diajukan, seperti saat task yang ditunggu sedang
  ditinjau (2.30.0). PIC-nya diberi tahu ("siap dimulai") saat tanda tertahan dipasang.
- Task yang tertahan sendiri tetap tak bisa dimulai atau diajukan sampai tandanya dilepas.
  Kalau dilepas sebelum diajukan, langkah berikutnya yang sudah berjalan tetap berjalan tetapi
  terbaca terhambat lagi. **E12** tetap menunggu semua task disetujui.
- Syarat ajukan menjadi "Task yang ditunggu sudah diajukan, tertahan, atau selesai"; bagian
  **Menunggu** di detail task menandai task tertahan dengan ikon jeda dan "tertahan, tak menahan
  task ini" (sebelumnya semua yang tak menahan terbaca "diajukan, sedang ditinjau").
- Tes baru di `test/inti.test.js`. 293 tes.

## 2.34.1 — Detail acara tak lagi menempel ke tepi jendela (2026-10-15)

Permintaan user (dengan tangkapan layar): tampilan acara bersama yang sudah dibuat "sangat
mepet" dengan tepi jendelanya.

- **Detail agenda dan acara** kini berjarak 22 px dari tepi jendela, sama dengan form lain.
  Sebelumnya jarak tepi jendela hanya diberikan pada `<form>`, sedangkan detail acara bukan
  form. Form notulen di dalamnya tetap sejajar dengan isi lain (tanpa jarak ganda).
- Jendela **Ruang proyek** di Komunikasi (layar sempit) punya masalah yang sama; ikut
  diperbaiki.

## 2.34.0 — Catatan Saya lebih interaktif: pilih semua, pindah baris, pilih banyak catatan (2026-10-15)

Permintaan user: di Catatan Saya, Ctrl+A memilih semua lalu bisa dihapus, karena "masih kurang
interaktif". Ditanya apa lagi yang kurang, user memilih semua usulan.

- **Memilih baris di editor**: Ctrl+A memilih semua baris catatan (dulu hanya satu baris, karena
  tiap baris kotak ketik sendiri). Juga seret tetikus melewati beberapa baris, Shift+klik,
  Shift+↑/↓ di tepi baris, atau ketuk pegangan ⋮⋮. Yang dipilih bisa dihapus, disalin atau
  dipotong (sebagai teks catatan), digandakan, dipindah, dijorokkan, atau dicentang; huruf yang
  diketik menggantikannya dengan jenis baris yang sama, tempelan menggantikannya. Tindakannya
  juga di toolbar (layar sentuh); Esc kembali ke tempat kursor semula; semuanya bisa diurungkan.
- **Pindah baris**: seret pegangan ⋮⋮ di kiri baris ke tempat garis biru (juga sentuhan), atau
  Alt+Shift+↑/↓; tombol naik/turun di toolbar saat ada pilihan.
- **Pintasan baru**: Ctrl+D menggandakan baris, Ctrl+Enter mencentang checklist, Ctrl+Shift+X
  mencoret, Ctrl+E menandai kode; tombol coret, kode, dan pilih semua di toolbar.
- **Pilih banyak catatan**: tombol Pilih (atau Ctrl+A bila tak ada catatan terbuka), Shift+klik
  untuk satu rentang, Esc keluar; hapus, pindah ke folder, atau beri warna sekaligus.
- **Hapus bisa diurungkan**: tanpa konfirmasi; pesan "… dihapus · Urungkan" selama 10 detik
  (atau Ctrl+Z), lalu catatan dan riwayat versinya kembali ke tempat semula.
- **Seret catatan ke folder** lain (tetikus), atau ke Disematkan untuk menyematkannya.
- Perbaikan: di tampilan dua panel, toolbar editor kini menempel di bawah header saat halaman
  digulir (sebelumnya terkurung kartu editornya).
- Tes baru di `test/catatan-blok.test.js` dan `test/catatan.test.js`. 292 tes.

## 2.33.0 — Kalender: acara bersama lintas tim; tampilan yang lebih jelas (2026-10-14)

Dua permintaan user.

- **Acara bersama di kalender.** Dari kalender bisa membuat acara seperti rapat dan menambahkan
  anggota dari tim sendiri maupun tim lain, ditambah rekomendasi lain. Keputusan user: semua
  sekaligus; acara bawaannya hanya untuk peserta dan bisa dibuat Terbuka; tanpa tamu di luar
  ProductTrack.
  - **Acara** = agenda dengan peserta (dari tim mana pun) atau Terbuka: lokasi, tautan rapat,
    kaitan ke proyek/paket/inisiatif/task, tombol **+ tim** dan **+ Semua Lead**.
  - **Cek bentrok** jadwal peserta saat memilih (dari acara bersama saja; agenda pribadi tak
    pernah dibuka).
  - **Undangan, jawaban Hadir/Mungkin/Tidak, dan pengingat per peserta**; bagian "Menunggu
    jawaban Anda" di Kalender Saya dan pengingatnya di Hari Ini.
  - **Notifikasi** diundang, jadwal diubah, jawaban, ikut, notulen, dan dibatalkan.
  - **Notulen & tindak lanjut**, tiap butir bisa **Jadikan task** dan tertaut ke task-nya.
  - **Acara di proyek, paket, inisiatif, dan detail task**; ikon kalender di detail task untuk
    menjadwalkan acara dengan PIC dan peninjaunya.
  - **Kalender di halaman Task**: lapis Tenggat task, Acara, dan Pendaftaran paket.
  - **Google Calendar dan .ics** per acara, dan **Unduh semua (.ics)** di pengaturan Pengingat.
  - **Izin baru** "Membuat acara bersama" (Panel Dev → Izin), bawaannya semua peran.
  - Data contoh: lima acara (rapat mingguan, kickoff PAPI dengan notulen, review PAPI lintas
    tim, sinkron TKA, sharing session Terbuka), hanya terlihat selama sumber data contoh.
  - Catatan agenda kini sampai 2.000 karakter (agenda rapat).
- **Tampilan yang lebih jelas**, supaya pengguna tak bingung: tujuh bagian, mengikuti gambaran
  sebelum–sesudah yang disetujui user.
  - **Arti di tempat**: kode sub-stage (mis. DV1), chip tim dan fasenya, dan label (Menunggu,
    Revisi, …) bisa diketuk; artinya muncul di kotak kecil dengan tautan ke Panduan › Istilah.
    Fase di chip ditulis singkat (**RAD Dev**, bukan **RAD V**) supaya Development tak tertukar
    dengan Design (`Inti.singkatTahap`).
  - **Halaman proyek**: kemajuan siklus sebaris dengan chip terlambat dan tertahan; kartu
    **Perlu perhatian Anda** (tinjauan, revisi, langkah siap dibagi, terlambat, tertahan; paling
    banyak empat, masing-masing bertombol); tab tim menulis fasenya ("DAE · Development"); fase
    kosong dirapatkan jadi satu baris dengan **+ Tambah**; nama proyek tak diulang di tiap baris
    task; **Ubah, Duplikat, Hapus proyek** dan **Pilih task untuk dihapus** pindah ke menu
    **⋯**; paragraf penjelasan dan kartu Ringkasan di samping diganti tombol **?**.
  - **Form Tambah task**: dimulai dengan **Task ini untuk apa?** (Proyek, Rutin, atau
    Inisiatif); proyek atau inisiatifnya terisi sendiri bila dibuka dari halamannya; sub-stage
    menjadi daftar pilihan dengan tim sendiri di atas, tim lain dilipat, dan kotak cari;
    prioritas dan output dilipat di **Lainnya**; isian wajib yang kosong disebut namanya.
  - **Hari Ini**: angka di bawah sapaan menjadi tombol yang melompat ke bagiannya; **Kerjakan
    sekarang** menggabungkan tinjauan, langkah tim yang siap dibagi, yang terlambat, dan yang
    bertenggat hari ini, dengan tombolnya langsung di baris (**Tinjau**, **Kerjakan sendiri**,
    **Bagi ke staff**, **Mulai**); Nanti, Belum bisa dikerjakan, dan Saya bantu dilipat dengan
    jumlahnya. **Bagi ke staff** membuka detail task tepat di isian task turunan.
  - **Rancangan Paket**: satu kolom **Target** dengan satuannya (sebelumnya dua kolom bernama
    Target); Duplikat, Salin ke sheet Marsel, dan Hapus di menu **⋯**; paragraf metode progres
    diganti tombol **?**. Elaborasi menampilkan **pratinjau** jumlah task per PIC sebelum dibuat,
    dan tombolnya menulis jumlahnya ("Buat 43 task").
  - **Dashboard**: dibuka dengan **Perlu perhatian** (beban di atas kapasitas, pekerjaan yang
    ditunggu banyak task lain, terlambat, tertahan, proyek berisiko); tabel per orang berbahasa
    biasa (**Ditunggu task lain**, **Menunggu tinjauannya**) menggantikan kolom Menahan dan skor
    bottleneck; grafik per status, tim, platform, dan proyek per tahap dilipat di **Rincian
    lain**.
  - **Dua kalender**: kalender di halaman Task menjadi **Kalender tim**, dengan tautan ke
    Kalender Saya dan sebaliknya.
  - Panduan menyesuaikan tombol yang pindah dan nama yang berganti, termasuk ilustrasi form
    Tambah task dan Dashboard; 77 teks baru berbahasa Inggris, dan 7 teks serta gaya skor
    Dashboard lama yang tak terpakai dibuang.
- Tes baru di `test/agenda.test.js`, `test/rpc.test.js`, `test/demo.test.js`, dan
  `test/inti.test.js`. 290 tes.

## 2.32.1 — Detail task: tab bergaris bawah dan bagian berikon (2026-10-14)

Permintaan user: detail task mengikuti rancangan yang disetujui.

- **Kerjakan, Diskusi, Riwayat menjadi tab bergaris bawah** (bukan tombol segmen); Diskusi selalu
  dengan jumlah pesannya.
- **Bagian lipat menjadi baris berikon** bergaris pemisah: Hasil kerja (ikon dokumen, keterangan
  "Output dan tautan"), Ceklis pengerjaan (ikon daftar centang; "0 butir" bila kosong), Task
  turunan (ikon cabang baru), Setoran ke paket (ikon kotak); status di kanan, isinya menjorok
  sejajar judul.
- Label **Langkah berikutnya** huruf biasa; task tertahan diawali "Tertahan: …".
- **Syarat ajukan** sebaris dengan bilah kemajuannya.

## 2.32.0 — Detail task tertata (2026-10-14)

Permintaan user: detail task lebih rapi tanpa membuang isinya. Dua tahap sekaligus.

- **Kartu "Langkah berikutnya"** menggantikan banner kuning, teks di bawah tombol, dan
  pengulangan alasan menunggu: satu kalimat menurut keadaan task (menunggu, siap dimulai,
  dikerjakan, revisi dengan catatan peninjau, siap diajukan, ditinjau, tertahan, selesai).
- **Tab Kerjakan, Diskusi (jumlah pesan), Riwayat.** Fase tim, yang ditunggu, riwayat tinjauan,
  dan aktivitas pindah ke Riwayat.
- **Bagian lipat** di Kerjakan dengan status di judulnya (Hasil kerja, Ceklis pengerjaan, Task
  turunan, Setoran); yang relevan terbuka sendiri. Output dan tautan hasil kerja digabung.
- **Syarat ajukan** menjadi bilah kemajuan dengan daftar yang masih kurang, hanya saat dikerjakan.
- **Yang ditunggu**: yang sudah beres dilipat.
- **Yang tak berlaku disembunyikan**: setoran di proyek tanpa paket dan di pembaruan inisiatif;
  task turunan kosong di luar proyek; paragraf penjelasan pindah ke tombol "?".
- **Bilah aksi** di bawah, menempel di bawah laci; tombol teks "Ubah" yang dobel dihapus (ikon
  pensil di kepala tetap).
- **Kepala ringkas**: tombol ikon sebaris dengan asal task, judul selebar laci (dulu terlipat di
  ponsel).
- Ringkasan impor data contoh kini menyebut jumlah inisiatif DAE.

## 2.31.0 — Inisiatif: pekerjaan berkelanjutan tim DAE (2026-10-14)

Permintaan user: pekerjaan Data & AI Engineer yang terus berjalan di luar rancangan paket
(ProductTrack v2, Product Knowledge, dan lain-lain) dideklarasikan sekali, dan tiap
pembaruannya masuk sebagai task.

- **Halaman Inisiatif** (grup Pekerjaan): kartu per inisiatif (status, PIC, tujuan, terbuka /
  telat / selesai 30 hari, terakhir diperbarui) dan detailnya (pembaruan yang berjalan dan
  **Riwayat pembaruan**). Sementara khusus tim DAE dan Manager; izin `inisiatif.kelola` (Lead,
  Manager) di Panel Dev → Izin.
- **Pembaruan = task biasa** lewat **Tambah pembaruan**: jalur rutin, boleh tanpa jenis rutin,
  **tanpa tinjauan**, tak terkena fase ADDIE, tetap terhitung di Hari Ini, beban, Dashboard,
  Laporan, dan telat. Task lama di luar proyek bisa ditempel atau dilepas dari detail task-nya.
- Inisiatif yang sudah punya task tak bisa dihapus (tandai Selesai); nomor INI-… tak dipakai
  ulang.
- Data: tab `inisiatif`, `inisiatif_links`, kolom `tasks.inisiatif`; koleksi data real
  `inisiatif`; MySQL `v2_inisiatif`, `v2_inisiatif_links`, `v2_tasks.inisiatif` (27 tabel).
- Data contoh: empat inisiatif Ali, dengan task lama v1-nya ditempel menurut judul.
- Tes baru di `test/inti.test.js`, `test/demo.test.js`, `test/sheets.test.js`. 278 tes.

## 2.30.0 — Duplikat paket & proyek, yang diajukan tak lagi menahan, proyek tim disorot, sampul di pemilih profil (2026-10-13)

Empat permintaan user.

- **Duplikat rancangan paket** (tombol **Duplikat** di detail paket, izin `paket.buat`): isi produk,
  target, catatan kategori, dan tautan disalin dengan ID baru; jadwal pendaftaran kosong, tak
  dibagikan, "sudah ada" kembali 0 (atau ikut, bila dipilih); setoran dan proyek tak ikut.
- **Duplikat proyek** (tombol **Duplikat proyek**, izin `proyek.buat`): proyek baru di siklus 1,
  tanpa tautan paket, ditambah (bila dipilih) task siklus aktifnya sebagai rencana baru — task
  turunan, ceklis, dan urutan tunggu ikut; status, output, bukti, tinjauan, komentar, dan setoran
  tidak. Tenggat digeser ke hari ini dengan jarak yang sama, atau dikosongkan.
- **Yang sudah diajukan tak lagi menahan**: task yang ditunggu (urutan tunggu antartim, fase tim,
  gerbang) dianggap cukup begitu diajukan untuk ditinjau, jadi langkah berikutnya bisa mulai
  sejajar selagi Lead atau Manager meninjau; PIC-nya diberi tahu saat itu. E12 tetap menunggu
  semua task disetujui. Syarat ajukan menjadi "task yang ditunggu sudah diajukan atau selesai".
  Yang sudah diajukan juga sudah dikumpulkan: tak dihitung telat (di semua tampilan dan agen),
  dan tepat waktu di Laporan dinilai dari saat diajukan, bukan saat disetujui.
  Skenario contoh PAPI Kostick menyesuaikan: blueprint RAD masih dikerjakan, dan begitu
  diajukan, prototype DAE terbuka.
- **Proyek tim saya disorot** di daftar Proyek (garis tepi, chip tim berbingkai, jumlahnya di
  judul) untuk Lead dan staff.
- **Sampul di pemilih profil**: kartu profil bersampul; tanpa sampul, pita warna aksen. Sampul
  orang lain disimpan di memori saja.
- Tes baru di `test/inti.test.js` (aturan diajukan, tak dihitung telat, duplikat paket, duplikat
  proyek). 276 tes.

## 2.29.1 — Data contoh: proyek lintas tim PAPI Kostick (2026-10-13)

Permintaan user: contoh proyek yang dikerjakan dua tim, dari riset dan rancangan RAD (Andika) ke
prototype DAE (Ali).

- Skenario contoh baru (`scripts/_demo.js`, `npm run impor:v1 -- --demo`): **Tes Psikologi PAPI
  Kostick**, proyek tanpa rancangan paket. A1/A6 oleh Manager, A2 dan D2 oleh RAD, D4 oleh DAE
  sejajar, dan **DV7 prototype DAE menunggu D2 RAD** (serah-terima lewat Atur urutan tunggu).
  D2 sedang ditinjau Manager; begitu disetujui, Ali mendapat notifikasi DV7 siap.
- Data contoh di spreadsheet baru berisi proyek ini sesudah impor ulang `--demo`.
- Tes: skenario PAPI di `test/demo.test.js`. Simulasi acak (`test/acak.test.js`) kini membagi task
  Lead tanpa staff ke Lead itu sendiri, dan mengikuti aturan 2.29.0 (task turunan Lead boleh
  pindah ke staff).

## 2.29.0 — Izin per peran, bahasa Inggris tahap 2, ceklis milik PIC task, PIC turunan ke staff (2026-10-13)

Empat permintaan user.

- **Izin per peran** (Panel Dev → **Izin**): satu tabel centang semua yang boleh dilakukan Manager,
  Lead, dan Staff, per kelompok (Proyek, Rancangan Paket, Task, Pengaturan, Halaman, Ruang Saya).
  - 18 izin bisa diatur, bawaannya sama dengan aturan sebelumnya: membuat, mengubah, menghapus,
    mengarsipkan proyek, siklus baru, keputusan, menautkan paket; membuat, membagikan, menghapus,
    mengelaborasi paket dan mengatur setoran; menghapus task siapa pun; urutan tunggu semua tim;
    mengubah Master; mengelola Tautan tim; membuka Laporan dan Riwayat Aktivitas.
  - Yang mengikuti struktur tim dan alur tinjauan (task turunan, peninjau, task milik staff, ruang
    pribadi, pengaturan Dev) tampil abu-abu, tak bisa diubah.
  - Berlaku di tombol, halaman, dan aturan `Inti` di browser dan server (`wajibIzin`); pesan
    penolakannya mengikuti izin, mis. "Hanya Lead atau Manager yang membuat paket.". Dev selalu
    boleh.
  - Tersimpan di tab `master` (`jenis` = `izin`), tanpa tab atau kolom baru; **hanya mode Dev** yang
    mengubahnya. Tombol **Kembalikan semua ke bawaan**.
- **Bahasa Inggris tahap 2**: semua halaman lain, modal, pesan singkat, dan pesan dari aturan dan
  server (lewat `trPola()` dan ±80 pola). ±1.870 teks; yang tersisa isi Panduan (tahap 3).
  - Tanggal di Laporan, Timeline, Rancangan Paket, dan Komunikasi mengikuti bahasa.
  - Kunci berkonteks (`'Proyek§satu'` → "Project", `'Proyek'` → "Projects").
  - Folder bawaan tampil "General" dalam bahasa Inggris; mengetik "General" juga berarti folder
    bawaan.
  - Perbaikan: Lihat sebagai tak lagi mengubah bahasa perangkat Dev.
- **Ceklis pengerjaan milik PIC task**: butirnya tak punya PIC sendiri. Form tak lagi memilih PIC;
  yang mencentang PIC task, Lead-nya, atau Manager; butirnya ikut saat PIC task diganti; grup
  "Ceklis untuk saya" di Hari Ini dan kolom "Ceklis" di beban per orang Dashboard dihapus. Alat
  agen `tambah_subtask` tak lagi menerima PIC.
- **PIC task turunan ke staff** (perbaikan): turunan yang dipegang Lead kini bisa dipindah langsung
  ke staff timnya; dulu ditolak "Task Lead tak diserahkan ke staff". Aturan itu kini hanya untuk
  task Lead yang bukan turunan.
- Lain-lain: `aria-label` tombol hapus tautan di detail task kelebihan `}`; nama capaian di chip
  batch tak lagi dikecilkan semuanya ("lolos QC output"); pesan "perlu server" tak lagi menyebut
  Vercel; tabel Izin dirapatkan di ponsel.
- Tes baru di `test/master.test.js`, `test/rpc.test.js`, `test/inti.test.js`, `test/fitur.test.js`,
  dan `test/bahasa.test.js`. 264 tes.

## 2.28.0 — Kalender Saya, bahasa EN/ID, ceklis pengerjaan, output saja, ubah proyek (2026-10-13)

Lima permintaan user.

- **Kalender Saya** (tahap 1, grup Ruang Saya): aktivitas harian pribadi dengan pengingat.
  - Agenda: judul, tanggal, jam atau sepanjang hari, berulang (harian, hari kerja, mingguan,
    bulanan, dengan batas opsional), pengingat, catatan; dicentang selesai per tanggal.
  - Kalender bulan berisi agenda dan, bila dipilih, tenggat task saya; daftar per tanggal; kartu
    **Agenda saya hari ini** di Hari Ini.
  - Pengingat di aplikasi: pesan singkat, lonceng, dan notifikasi browser bila diizinkan, selama
    ProductTrack terbuka; agenda sepanjang hari pukul 07.00.
  - Email pribadi opsional disimpan untuk tahap 2 (pengingat email); belum ada email terkirim.
  - Tersimpan di server per profil (tab `agenda`, `pribadi`; tabel `v2_agenda`, `v2_pribadi`, kini
    25 tabel) dan hanya dikirim ke profil sesi itu.
- **Bahasa Indonesia / English, tahap 1**: pilihan di menu akun, per profil. Kerangka aplikasi,
  Hari Ini, Task, detail task, Proyek, Kalender Saya, dan form task/proyek sudah berbahasa
  Inggris (434 teks, `public/bahasa.js`); halaman lain menyusul. Tanggal dan angka mengikuti
  bahasanya. Berkas statis kini lima (`bahasa.js` baru), semua dengan `?v=`.
- **"Sub-task" menjadi "Ceklis pengerjaan"** seperti v1, supaya tak tertukar dengan task turunan:
  di detail task, Hari Ini (Ceklis untuk saya), syarat ajukan, pesan galat, Riwayat Aktivitas,
  Panduan, dan alat agen. Nama di data tetap.
- **Output saja**: bagian "Output & bukti" di detail task menjadi **Output**; tautan hasil kerja
  opsional dan tak lagi syarat ajukan.
- **Ubah proyek** (Manager): nama, platform, dan tujuan proyek yang sudah dibuat
  (`Inti.ubahProyek`).
- Tes baru: `test/agenda.test.js`, `test/bahasa.test.js`, dan tambahan di `test/rpc.test.js`.
  261 tes.

## 2.27.0 — Nomor tak dipakai ulang, tombol Ubah, seret langkah alur (2026-10-13)

Revisi user.

- **Elaborasi ulang sesudah hapus proyek.** Diuji ulang di data real (paket baru → elaborasi →
  hapus proyek → elaborasi lagi): elaborasi ulangnya berjalan, tetapi proyek dan task barunya
  memakai lagi nomor yang dihapus (PRJ-1, PRD-001…), sehingga riwayat, pesan Komunikasi, dan
  tautan task lama menempel ke task baru. Kini **nomor ID tak dipakai ulang**: proyek, task, dan
  paket baru melanjutkan nomor tertinggi yang pernah ada.
  - Nomor tertinggi dicatat saat menghapus (`Inti.catatNomor`, dipakai `hapusProyek`,
    `hapusTask`, `hapusPaket`) di koleksi baru `nomor` (tab `nomor` opsional, tabel
    `v2_nomor`, 23 tabel); ikut data real seperti koleksi lain.
- **Tombol Ubah (pensil) di semua tingkat task**: di kepala detail task (samping Salin tautan),
  di samping setiap baris task utama dan task turunan di tab tim proyek, dan di daftar task
  turunan di detail induknya. Sub-task tetap punya pensilnya sendiri. Yang boleh mengubah tak
  berubah (`Inti.bolehUbahTask`).
- **PIC task turunan**: kini bisa diganti ke Lead pembaginya atau staff timnya, juga untuk turunan
  dari task yang dipegang staff (2.25.0); sebelumnya ditolak "PIC task turunan: <staff> sendiri
  atau staff timnya" (`Inti.picTurunan`).
- **Langkah alur kategori paket bisa diseret** lewat pegangan ≡ di form kategori (Master), dengan
  penanda sisip di atas/bawah langkah tujuan; tombol naik ditemani tombol turun untuk keyboard dan
  layar sentuh. Jendela kategori sedikit lebih lebar.
- README dan Panduan menyebutnya. Tes baru di `test/hapus-task.test.js`; tes skema MySQL kini
  23 tabel. 252 tes.

## 2.26.0 — Capaian bersama di alur kategori paket (2026-10-13)

Permintaan user, sesudah Lead mendapat galat "capaian harus berurutan dan tiap capaian sekali"
saat menandai semua langkah QC Latsol (E4–E7) sebagai Lolos QC.

- **Satu capaian boleh dipasang di beberapa langkah** alur kategori paket, mis. Konten siap di DV1
  dan E1, atau Lolos QC di E4, E5, E6, dan E7 yang dikerjakan bersamaan.
- **Tercapai setelah semuanya selesai**: batch baru naik ke capaian itu setelah semua langkah
  bertanda itu disetujui (`Inti.batchSetoran`); sebelumnya langkah pertama yang selesai sudah
  menaikkannya. Batch tetap dinilai dari capaian tertinggi yang lengkap.
- **Tetap ditolak: capaian mundur**, mis. Konten siap sesudah Ter-input. Pesannya kini menyebut
  langkahnya: "Konten siap di I1 dipasang sesudah Ter-input di DV8". Tayang tetap wajib ada.
- Keterangan task hasil elaborasi menyebut semua langkah dalam satu capaian ("… setelah semua
  langkah bertanda itu disetujui: E4, E5, E6, E7"). Tayang (I4) tetap menunggu semua QC tim LNA.
- Teks bantuan di form kategori (Master), README (Rancangan paket, Master), dan Panduan
  (Mengatur Master) menyebutnya. Tes baru di `test/setoran.test.js`. 250 tes.

## 2.25.0 — Pindah kode sub-stage, mode uji Dev, task turunan, form paket (2026-10-13)

Lima revisi user.

- **Hapus sub-stage diperiksa di sumber data yang dipakai semua orang.** Saat data real aktif,
  sub-stage yang hanya dipakai data contoh kini bisa dihapus (sebelumnya ditolak "dipakai … task
  di data contoh"). Task data contoh yang memakainya tetap terbaca namanya. Jendela hapus
  menyebut sumber yang diperiksa.
- **Pindahkan sub-stage ke kode lain** (tombol panah di Master, Lead dan Manager), pengganti
  "hapus lalu tambah":
  - nama, tim pemilik, dan review Manager pindah ke kode baru, juga ke tahap lain (mis. E10 →
    I9); kode tujuan harus belum pernah ada, terisi sendiri sesudah nomor terbesar;
  - alur kategori paket yang memakai kode lama ikut diganti;
  - kode lama dihapus kalau belum dipakai task, selain itu dinonaktifkan dan task lamanya tetap
    memakai kode lama; nomor lain tak bergeser; E12 tak bisa dipindah;
  - aturannya `Inti.pindahSub`; server (aksi `pindahSub`) menulis barisnya berurutan: kode baru,
    alur, kode lama.
- **Mode uji Dev**: pilihan ketiga di Panel Dev → Sistem, **Uji Dev (browser ini saja)**.
  - Browser itu memakai data contoh selama sesi Dev, sementara pengguna lain tetap di sumber
    global. Server hanya mengabulkannya untuk sesi Dev; sesi Dev yang berakhir mengembalikan
    browser ke sumber global.
  - Spanduk biru **Mode uji Dev** selalu tampil, dengan **Keluar mode uji**.
  - Master yang diubah di mode uji hanya berlaku di browser itu; Lihat sebagai menyimpan
    perubahannya di data uji; pesan masuk obrolan data contoh; orang, PIN, foto, dan tampilan
    pribadi tak bisa diubah.
- **Task turunan di semua tahap ADDIE.** Bagian Task turunan kini ada di detail semua task
  proyek. Lead tim pemilik task juga bisa membaginya walau PIC-nya staff timnya (sebelumnya hanya
  Lead yang memegang task itu sendiri), mis. task Design yang langsung diberikan ke staff. Kalau
  belum bisa dibagi, alasannya tampil: sudah selesai, sedang ditinjau, atau Lead mana yang
  membaginya (`Inti.alasanTakBisaBagi`).
- **Perbaikan: isian Rancangan Paket hilang beberapa detik sesudah diketik.** Saat data real
  aktif, tarikan berkala (±30 detik) menggambar ulang layar setiap kali kursor tak sedang di
  isian, dan form paket yang belum disimpan ikut digambar ulang dari data. Kini selama ada
  perubahan yang belum disimpan, form yang sedang terbuka dipakai lagi apa adanya, termasuk
  baris yang baru ditambah.
- Bilah pilih task (2.23.0) kini menempel tepat di bawah kepala, juga saat spanduk Lihat sebagai
  atau mode uji membuat kepala lebih tinggi.
- README (Mode uji Dev, Master & PIN profil, Task turunan) dan Panduan (Mengatur Master;
  Memecah langkah jadi task turunan) menyebutnya. Tes baru di `test/master.test.js`,
  `test/real-rpc.test.js`, dan `test/inti.test.js`. 249 tes.

## 2.24.0 — Hapus sub-stage di Master; tautan sub-task (2026-10-13)

Permintaan user: sub-stage di Master (yang diatur Lead dan Manager) bisa dihapus juga, dan
sub-stage baru melanjutkan ke kode terbaru. Usulan user untuk menggeser nomor yang tersisa
(E3 jadi E1, dst.) tak dipakai, sesuai keputusan user sesudah membahasnya: kode adalah
identitas yang tersimpan di task dan tertulis di judul task hasil elaborasi, Riwayat Aktivitas,
komentar, pesan, alur paket, dan impor v1, jadi nomor yang digeser akan mengubah arti data lama.

- **Tombol hapus** (tempat sampah) di tiap baris sub-stage di Master, untuk Lead dan Manager.
  - Hanya sub-stage yang belum dipakai task mana pun dan tak ada di alur kategori paket. Browser
    memeriksa data yang sedang dipakai; server memeriksa lagi data contoh dan data real
    (`Inti.salahHapusSub`, `dataReal.tasksKini`).
  - Bila tak bisa, jendelanya menjelaskan alasannya (mis. "E4 dipakai 57 task di data contoh")
    dan menawarkan **Nonaktifkan**.
- **Kode tak dipakai ulang, nomor lain tak bergeser.** Yang dihapus tercatat sebagai penanda
  `dihapus` di kolom `data` tab `master` (tanpa kolom atau tabel baru), tak ditawarkan di mana
  pun, tapi namanya tetap terbaca untuk data lama. Kode yang dihapus ditolak bila diketik lagi
  untuk sub-stage baru, dengan saran kode berikutnya.
- **Kode baru melanjutkan dari nomor terbesar** di tahapnya, termasuk yang sudah dihapus
  (`Inti.kodeSubBerikut`, mis. E13). Sebelumnya kode baru mengisi nomor kosong pertama, yang
  sesudah ada hapus bisa memakai ulang kode lama.
- **Sudah dihapus**: daftar di bawah tabel sub-stage dengan tombol **Pulihkan** (kode yang sama,
  aktif lagi).
- **E12 terkunci**: menutup siklus dan dirujuk langsung oleh aturan, jadi tak bisa dihapus atau
  dinonaktifkan. Task baru tak bisa memakai kode yang sudah dihapus; tombol tambah A1/A6/E12 di
  Ringkasan proyek hanya tampil bila sub-stage-nya aktif.
- **Tautan opsional di sub-task** (permintaan user): isian **Tautan** di form tambah dan ubah
  sub-task di detail task; tampil di samping judulnya sebagai nama layanannya (Google Docs,
  Google Drive, …), di ponsel ikonnya saja. Dirapikan seperti tautan bukti (`https://`
  ditambahkan sendiri), hanya http(s), paling panjang 2000 karakter. Riwayat Aktivitas mencatat
  tautan yang ditambah, diganti, atau dihapus. Kolom baru `link` di tab `subtasks` (spreadsheet
  lama tanpa kolom itu tetap terbaca) dan `v2_subtasks`. Alat agen `tambah_subtask` menerima
  `tautan`, dan `detail_task` menampilkannya.
- README (Master & PIN profil; Sub-task) dan Panduan (Mengatur Master; Sub-stage dan tim
  pemilik; Mengerjakan task proyek sampai diajukan) menyebutnya. Tes baru di
  `test/master.test.js`, `test/rpc.test.js`, dan `test/inti.test.js`. 245 tes.

## 2.23.0 — Hapus banyak task di tab tim; tab bawaan proyek (2026-10-13)

Permintaan user: task di tab tim proyek bisa dipilih untuk menentukan mana yang dihapus kalau
banyak; dan halaman proyek langsung terbuka di tab tim sendiri, Manager di Ringkasan.

- **Pilih task untuk dihapus** (tab tim proyek): tombol di kartu tim memunculkan kotak centang
  di tiap task.
  - Klik baris juga mencentang; **Pilih semua di <fase>** per bagian fase; **Pilih semua** /
    **Kosongkan** di bilah yang menempel di bawah kepala saat daftar digulir (dua baris di
    ponsel).
  - Task turunan ikut tercentang dan terkunci bila induknya dipilih. Task yang tak boleh Anda
    hapus kotaknya nonaktif.
  - **Hapus N task** membuka jendela konfirmasi: daftar task (turunan di bawah induknya), jumlah
    turunan, yang sudah selesai, dan setoran paket yang ikut hilang.
- **Hapus satu task** dari tombol tempat sampah di detail task, dengan jendela yang sama.
- **Aturan** (`Inti.bolehHapusTask`, `ringkasHapusTask`, `hapusTask`, aksi data `hapusTask`):
  - boleh: Manager; Lead untuk task di tab timnya dan task yang boleh ia ubah; staff hanya task
    yang ia buat untuk dirinya sendiri; agen AI tidak;
  - ikut terhapus: task turunan, sub-task, komentar, tinjauan, bukti, dan setorannya;
  - task lain yang menunggu task itu (deps, tunggu) dibersihkan rujukannya;
  - satu permintaan ditolak utuh bila ada task yang tak boleh; task yang sudah dihapus orang lain
    dilewati; paling banyak 500 task sekali hapus;
  - Riwayat Aktivitas mencatat tiap task yang dipilih ("Task dihapus beserta N task turunan").
    Di data real perubahannya baris yang dihapus ditambah task yang rujukannya berubah.
- **Tab bawaan proyek** (`Inti.tabAwalProyek`): setiap kali proyek dibuka (dari daftar proyek,
  pencarian, notifikasi, atau detail task), tab tim sendiri untuk Lead dan staff, **Ringkasan**
  untuk Manager. Sebelumnya tab terakhir yang dipilih terbawa saat proyek dibuka lagi.
- README (batasan "Task belum bisa dihapus" dihapus) dan Panduan (ADDIE per tim dan siklus)
  menyebutnya. Tes baru `test/hapus-task.test.js`, termasuk lewat perintah data real. 241 tes.

## 2.22.0 — Hapus proyek (2026-10-13)

Permintaan user: proyek yang sudah dibuat bisa dihapus juga.

- **Hapus proyek** (Manager, yang juga membuat proyek): tombol di halaman proyek.
  - Jendela konfirmasinya merangkum apa saja yang ikut hilang: jumlah task (dan task turunan,
    juga yang masih terbuka) serta setoran ke rancangan paket mana.
  - Tombol **Hapus permanen** baru aktif setelah ID proyek diketik ulang.
  - Tautan **arsipkan saja** di jendela yang sama menjadi jalan aman untuk proyek yang sudah
    selesai.
- **Yang ikut terhapus** (`Inti.hapusProyek`, aksi data `hapusProyek`):
  - semua task proyek itu di semua siklus, termasuk turunan, sub-task, komentar, tinjauan, dan
    bukti di dalamnya;
  - setoran task-task itu, sehingga progres paket dari proyek ini hilang dan targetnya terbuka
    lagi.
- **Yang tetap**: Riwayat Aktivitas mencatat "Proyek dihapus beserta … task dan … setoran
  paket", dan pesan Komunikasi tetap tersimpan. Di data real perubahannya hanya daftar baris
  yang dihapus.
- Panduan (Membaca halaman Proyek) dan README menyebutnya. Tes baru di `test/setoran.test.js`,
  termasuk lewat perintah data real. 236 tes.

## 2.21.0 — Tampilan pribadi & status; Master untuk Lead; task turunan (2026-10-13)

Permintaan user:
- tiap orang bisa mengatur tampilan ProductTrack-nya sendiri. Pilihan user: warna aksen,
  wallpaper, kepadatan & ukuran huruf, halaman awal, sampul profil, status ber-emoji, dan
  disimpan **per profil**;
- revisi:
  1. Master boleh diubah Lead juga;
  2. judul di detail task memenuhi lebar;
  3. PIC task anak boleh Lead itu sendiri;
  4. "task anak" diganti "task turunan".

- **Sesuaikan tampilan** (menu foto di kanan atas, atau Ctrl+K). Setiap pilihan langsung
  terlihat (pratinjau). Tersimpan setelah Simpan; Batal atau Esc mengembalikannya.
  - **Warna aksen**: 8 pilihan + warna sendiri.
    - `Inti.tokenAksen` menggeser kecerahan sampai terbaca di tema terang dan gelap.
    - Biru bermakna (status Dikerjakan, capaian paket, sebutan, kategori notifikasi, kode
      lepas, batang timeline) dipindah ke token `--info-*` dan tak ikut aksen.
  - **Latar**: gradasi aksen, Senja, Laut, Hutan, titik, garis, atau sampul sendiri yang
    diburamkan, dengan penggeser Samar–Jelas 10–60%.
    - Lapisan `#latar` di belakang semua isi.
    - Kabut `--kabut-latar` (70%) dan teks sekunder yang lebih tegas menjaga keterbacaan.
      Diuji dengan gambar terburuk di 8 halaman, kedua tema: semua teks ≥ 4,5:1.
  - **Sampul profil**: dipotong 3:1 dan diperkecil di perangkat. Tampil sebagai banner di menu
    akun.
  - **Kepadatan** Nyaman/Ringkas (layar lebar) dan **ukuran huruf** Kecil/Sedang/Besar (335
    `font-size` kini memakai `--skala-huruf`).
  - **Halaman awal** sendiri, dipakai saat profil dipilih dan saat logo diklik.
- **Status singkat**: emoji dari daftar + teks ≤ 60 karakter + "hapus setelah".
  - Terlihat semua orang sebagai lencana di avatar dan chip di samping nama (Komunikasi, detail
    task, Per orang, pemilih profil).
  - Dipasang lewat satu lembar gaya, tanpa menggambar ulang halaman.
- **Penyimpanan per profil**: tab `tampilan` (orang, setelan, diperbarui, sampul) dan tabel
  `v2_tampilan` (22 tabel).
  - Aksi `muatTampilan(sejak)` (tanpa gambar, ditarik tiap 2 menit), `muatSampul(orang)`, dan
    `simpanTampilan`.
  - Profil ber-PIN perlu PIN-nya; sesi agen AI ditolak; akun Dev memakai tampilan bawaan.
  - Pilihan terakhir dipasang `<head>` index.html dari `pt2_tampilan_awal`.
  - Perangkat baru langsung memakai tampilan profil begitu profilnya dipilih (diuji).
- **Master untuk Lead**: tambah, ubah, dan nonaktifkan isian Master (menghapus = menonaktifkan,
  supaya data lama tetap terbaca).
  - Lead ber-PIN perlu memasukkan PIN-nya; bagian PIN profil tetap khusus Dev.
  - Server juga menerapkan organogram terkini sebelum memeriksa izin.
- **Task turunan** (dulu "task anak") di semua teks aplikasi, Panduan, README, dan agen AI.
  Nama fungsi dan kolom data `induk` tetap.
- **PIC task turunan boleh Lead itu sendiri** ("saya sendiri" di pilihan PIC).
  - Turunan yang ia pegang tak ditinjau lagi, karena induknya tetap ditinjau Manager.
  - Lead tanpa staff pun bisa memecah task-nya.
  - Di form Tambah task, task induk ditawarkan tapi tak dipilih otomatis bila PIC-nya diri sendiri.
- **Judul detail task memenuhi lebar.** Aturan `.detail-atas > div` ikut membuat kolom tombol
  (tautan, tutup) melebar setengah. Kini kolom tombol hanya selebar ikonnya, berjajar di kanan
  atas.
- Bilah atas di atas tombol + (FAB) di ponsel, supaya panel akun dan notifikasi tak tertimpa.
- Tes baru `test/tampilan.test.js` (aturan, kontras aksen, RPC per profil, PIN). Tes Master untuk
  Lead, turunan untuk Lead sendiri, dan agen. 235 tes.

## 2.20.2 — Tombol tema di samping lonceng (2026-10-13)

Permintaan user: "tambahkan juga tombol tema di samping lonceng".

- **Tombol bulan/matahari** di bilah atas, tepat di kiri lonceng (juga di ponsel).
  - Sekali klik pindah terang ↔ gelap dan tersimpan seperti pilihan di menu akun.
  - Ikonnya tema tujuan: bulan saat terang, matahari saat gelap. Labelnya "Ganti ke tema
    gelap/terang".
- **Ikuti sistem** tetap di menu akun. Selama pilihan itu aktif, ikon tombolnya ikut berganti
  saat tema perangkat berganti, atau saat tab kembali aktif.
- Panduan (Peta menu) dan README menyebut tombol ini.

## 2.20.1 — Menu akun di kanan atas: ganti profil, tema, dan keluar (2026-10-13)

Masukan user (dengan tangkapan layar kaki sidebar 2.20.0): sakelar tema di bawah sidebar kurang
bagus. Sidebar cukup nama, foto, dan posisi; ganti tema dan ganti profil sebaiknya di samping
tombol notifikasi, seperti di media sosial.

- **Menu akun di kanan atas**, di samping lonceng (bilah atas ponsel juga).
  - Klik foto sendiri untuk melihat siapa yang sedang masuk (nama, peran, jabatan).
  - Isinya: Ganti foto profil, Ganti profil, Tema (Sistem · Terang · Gelap), dan Keluar (atau
    Keluar mode Dev).
  - Tertutup saat klik di luar, memilih isinya, atau Esc (fokus kembali ke tombol foto).
    Memilih tema membiarkannya terbuka supaya hasilnya langsung terlihat.
  - Membuka menu akun menutup panel notifikasi, dan sebaliknya.
- **Urutan bilah atas** kini Tambah task · lonceng · foto, seperti pola media sosial.
- **Kaki sidebar** tinggal foto, nama, dan jabatan; foto di sana tetap bisa diklik untuk ganti
  foto. Tombol Ganti profil, Keluar, dan sakelar tema di sana dibuang.
- Panduan (Peta menu, ganti profil, foto profil) dan README menyebut letak baru.

## 2.20.0 — Mode gelap, dan posisi gulir yang bertahan saat klik (2026-10-13)

Permintaan user: "buatkan juga untuk darkmodenya karena belum ada", dan "ketika kadang saya scroll
dan klik button malah kembali lagi keatas scrollnya, saya ingin lebih stay dengan hasil scroll".

- **Mode gelap.**
  - Sakelar **Tema** di kaki sidebar (Ikuti sistem · Terang · Gelap), juga lewat Ctrl+K.
  - Bawaannya ikut perangkat. Pilihan disimpan per browser (`pt2_tema`).
  - Skrip kecil di `<head>` index.html memasang `data-tema` sebelum CSS dimuat, jadi halaman tak
    berkedip terang. `meta theme-color` ikut berganti.
  - Tema dicek lagi saat tab kembali aktif, untuk peramban yang tak memberi tahu pergantian tema
    perangkat.
- **Warna jadi token.**
  - ±150 warna yang tertulis langsung di app.css kini lewat token. Ada token baru untuk garis
    halus, latar sekunder, amber, ungu paket, nama merek, dan isi pekat `--isi-*` bertulisan
    putih.
  - Tinta tipis (garis kode, tabel catatan, kutipan) memakai `color-mix` dari `--tinta`, jadi
    ikut terang di mode gelap.
  - Nilai terangnya sama dengan warna sebelumnya: tema terang tidak berubah.
  - Blok `:root[data-tema="gelap"]` mengganti token. Warna catatan, ikon folder, dan tepi avatar
    punya versi gelapnya sendiri.
  - Diperiksa dengan pemeriksa kontras di 16 halaman: tak ada teks di bawah 3,5:1.
- **Posisi gulir bertahan saat halaman digambar ulang.**
  - Sebelumnya `render()` mengganti isi sidebar, halaman, dan laci detail. Bagian `<details>`
    yang dibuka sendiri tertutup lagi, sehingga halaman memendek dan gulir terlempar ke atas.
    Wadah bergulir juga kembali ke awal: menu sidebar, laci detail, daftar utas, tabel, kanban,
    dan timeline.
  - Kini posisi gulir dan bagian yang dibuka atau ditutup sendiri dikembalikan selama halamannya
    sama (`catatGulir`, `pulihkanGulir`).
  - Bagian yang dibuka aturan halaman (mis. fase yang sedang berjalan) tetap mengikuti aturannya.
    Pindah halaman tetap mulai dari atas.
  - Panel obrolan tak lagi dipaksa turun ke pesan terbaru saat Anda membaca pesan lama di utas
    yang sama.
- Panduan "Peta menu" menyebut sakelar tema. Tes baru `test/tema.test.js`. 230 tes.

## 2.19.0 — ADDIE per tim: tab DAE · RAD · LNA · CLO, urutan tunggu diatur Lead (2026-10-13)

Permintaan user: tab proyek bukan lagi satu ADDIE, melainkan per tim, dan tiap tim punya
ADDIE-nya sendiri yang diatur Lead-nya. Pilihan user: CLO punya tab sendiri; Lead mengatur
siapa menunggu siapa di tabnya; gerbang Manager mengikuti rekomendasi (tetap di tingkat
proyek).

- **Tim tampil dengan singkatannya.**
  - DAE (Data & AI Engineer), RAD (Research, Academic & Development), LNA (Learning &
    Architecture), CLO (Content & Learning Operation), MG (Manager).
  - Kode lama (SI, AK, LA, CO) tetap dipakai di data: sub-stage, ruang tim, organogram, dan
    Master. Tak ada data yang dipindah.
  - Nama dan singkatan diatur di Master → Label & bobot. Singkatan 2–6 huruf atau angka dan tak
    boleh kembar. Baris tim lama tanpa singkatan memakai bawaan (`SINGKAT_TIM`).
  - Tampil di chip tim, form task, saringan, CSV, Komunikasi (ruang tim), Dashboard, dan Master.
- **Aturan tunggu baru** (`Inti.ditunggu`), menggantikan "paralel per tahap" 0.15.0. Sebuah
  task proyek menunggu:
  - **fase**: task tim yang sama di fase lebih awal, di siklus yang sama. Ini bawaan dan bisa
    dimatikan per task (`lepasFase`).
  - **atur**: task pilihan Lead (`tunggu`), boleh dari tim lain.
  - **gerbang**: task Manager di Analysis (A1, A6), untuk fase Design dan sesudahnya.
  - **tutup**: E12 menunggu semua task lain di siklusnya.

  Tim yang berbeda tak saling menunggu di luar itu. Task anak mengikuti induknya.
- **Tak ada yang saling mengunci.**
  - Task yang diatur menunggu task setim di fase lebih lambat berdiri di fase itu (`faseUrut`).
  - Urutan yang saling menunggu ditolak saat disimpan (`putaranTunggu`), juga saat sub-stage atau
    PIC diubah.
  - Putaran yang lolos (mis. tab diubah manual) tampil sebagai peringatan merah di halaman
    proyek (`putaranProyek`).
- **Atur urutan tunggu** (`Inti.aturTunggu`, aksi data `aturTunggu`).
  - Hanya Lead tim pemilik task, atau Manager.
  - Form-nya memuat centang "Ikut urutan fase" dan daftar task lain di proyek dan siklus yang
    sama per tim, dengan kotak cari. Pilihan yang sudah dicentang tampil paling atas.
  - Tak bisa memilih task anak (pilih induknya), E12, atau task proyek lain.
  - Tercatat di Riwayat Aktivitas.
- **Elaborasi memasang urutan batch.**
  - Serah-terima: langkah pertama sebuah tim menunggu langkah tim lain sebelumnya yang fasenya
    sama atau lebih awal. Contohnya DV8 menunggu DV1 (bukan E1), Materi E2 dan DV8 menunggu DV3,
    dan I7 menunggu I6.
  - Urutan alur di dalam tim: I4 tayang menunggu QC E4–E7 yang datang lebih dulu di alur.
  - Pengaman: urutan otomatis yang memutar dilepas, untuk alur kategori yang disusun sendiri di
    Master.
- **Halaman proyek.**
  - Tab **Ringkasan** berisi kartu tiap tim (jalur fase, angka selesai, menunggu, terlambat, dan
    tertahan) dan kartu **Gerbang Manager** dengan tombol A1, A6, E12.
  - Tab **DAE · RAD · LNA · CLO** berisi bagian per fase. Lead melihat tombol urutan di samping
    setiap task, dan tombol **Tambah task di …** hanya menawarkan sub-stage tim dan fase itu.
  - Tab bawaan: tim sendiri untuk Lead dan staff, Ringkasan untuk Manager.
  - Fase yang timnya tak punya sub-stage maupun task (mis. Analysis LNA) tak ditampilkan.
- **Daftar proyek** menampilkan chip fase tiap tim (mis. "RAD V", "CLO ✓") dan progres siklus,
  menggantikan jalur ADDIE mini proyek.
- **Detail task.**
  - Bagian "Fase LNA di proyek ini" (atau keterangan gerbang untuk task Manager).
  - Daftar **Menunggu**: semua yang ditunggu beserta jenisnya, mana yang sudah selesai, dan
    tombol **Atur urutan tunggu**.
- **Alasan menunggu baru.** Contohnya: "Menunggu fase Development LNA selesai: …", "Menunggu
  gerbang Manager: …", dan "Menunggu PRD-x "…" (RAD · Andika)".
  - Kartu kanban memakai versi singkat (`tungguSingkat`).
  - Syarat ajukan menjadi "Task yang ditunggu sudah selesai".
- **Kolom baru `tunggu` dan `lepasFase`.**
  - Di tab `tasks` (hanya menambah) dan di `v2_tasks` (`db/produk_base_v2.sql`).
  - Impor v1 mengisinya kosong: proses v1 yang diselingi tim lain bisa saling mengunci kalau
    urutannya dipasang.
- **Skenario contoh.** OJK kini dijalankan per putaran kesiapan (soal RAD dan live class CLO
  lebih dulu, tayang sesudah QC). Dua batch TKA menunjukkan input LNA di antrean Alya.
- **Panduan.**
  - "Tahap proyek dan siklus" menjadi "ADDIE per tim dan siklus", dengan ilustrasi fase per tim.
  - Istilah baru: Fase dan Urutan tunggu.
  - Teks tim, label, syarat, elaborasi, dan halaman Proyek ikut disesuaikan.
- **Agen AI Ali:** persona menyebut tim DAE, dan alat `baca_ruang` menjelaskan kode ruang tim.
- Tes baru (ADDIE per tim, aturTunggu, singkatan Master). Tes elaborasi, notifikasi, dan
  skenario contoh disesuaikan. 227 tes.

## 2.18.0 — Rancangan Paket: platform ganda, jadwal pendaftaran, urutan seret, nama di tempat (2026-10-09)

Permintaan user, semuanya di Rancangan Paket. Pilihan user: urutan disimpan per browser, dan
slicer menyaring paket yang masa pendaftarannya bersinggungan dengan rentang yang dipilih.

- **Platform lebih dari satu.**
  - Form paket (baru dan ubah) memakai centang platform.
  - Isiannya tetap satu kolom teks dipisah koma, urut mengikuti Master (`Inti.platformPaket`,
    `Inti.rapikanPlatform`).
  - Saringan Platform di daftar kini chip yang bisa dipilih beberapa sekaligus.
  - Menyimpan form tanpa isian platform tak lagi mengosongkan platform.
- **Elaborasi paket berplatform banyak:** proyek dan task memakai platform yang dipilih di form
  elaborasi, bawaannya yang pertama.
- **Jadwal pendaftaran paket.**
  - Isian baru `daftarBuka` dan `daftarTutup` di form. Tanggal diperiksa, dan tutup tak boleh
    sebelum buka. Kalau hanya satu yang diisi, jadwalnya satu hari itu.
  - Tampil di kartu dan halaman paket dengan keadaannya.
  - Kolom baru di tab `packages` (hanya menambah) dan di `v2_packages` (`db/produk_base_v2.sql`).
- **Slicer jadwal pendaftaran:**
  - dua pegangan di atas rentang bulan jadwal yang ada, ditambah isian tanggal dari–sampai;
  - menyaring paket yang masa pendaftarannya bersinggungan dengan rentang itu
    (`Inti.daftarBeririsan`);
  - keterangannya menyebut berapa paket tanpa jadwal yang disembunyikan.
- **Urutan kartu paket:**
  - diseret di desktop, atau tombol panah di mode *Atur urutan* (juga di ponsel);
  - tersimpan di browser per sumber data;
  - *Urutan bawaan* menghapus urutan tersimpan.
- **Ganti nama di tempat:**
  - klik dua kali judul paket di kartu atau halaman paket;
  - aturannya `ubahNamaPaket`: hanya yang boleh menyunting paket itu, tercatat di aktivitas, dan
    juga berlaku di data real;
  - Enter atau pindah fokus menyimpan, Esc membatalkan.
- Tes baru `test/paket.test.js`. 225 tes.

## 2.17.0 — Agen AI Ali (2026-10-09)

Permintaan user: profil Ali dijalankan oleh agen AI dari Agent Office (`G:\Ali\code\Agent AI`),
dengan batasan Ali sendiri. Pilihan user: agen boleh menulis, tapi selalu dengan persetujuan;
tim melihat tanda AI; dan empat pekerjaan pertama (ringkasan pagi, jawab Komunikasi, perbarui
task dari hasil kerja, pengingat tenggat & tinjauan).

- **Kunci agen.** Aksi `masukAgen` dengan env `AGEN_KUNCI` (minimal 32 karakter) membuka sesi
  yang terkunci pada profil `AGEN_PROFIL` (bawaannya `ali`). Sesi itu hanya boleh:
  - membaca;
  - mengirim pesan atas nama Ali;
  - melakukan perubahan data real dalam `Inti.AKSI_AGEN`: aksi status, output, bukti, sub-task.

  Memilih profil lain, mode Dev, Master, PIN, foto, dan sumber data ditolak (403). Kunci yang
  diganti atau dikosongkan membatalkan sesi agen seluruhnya (401). GET `/api/rpc` dan Panel Dev
  hanya menunjukkan apakah agen aktif, tanpa kuncinya.
- **Tanda AI dari server.**
  - Pesan agen diberi `kode` `ai`; kolom itu hanya dipakai reaksi, jadi tab obrolan tak perlu
    kolom baru.
  - Aktivitas dan tinjauan agen diberi `ai: true` di perubahan data real.
  - Label **AI** tampil di Komunikasi (gelembung dan daftar utas), jejak dan detail task,
    Riwayat Aktivitas, dan notifikasi.
  - Isian browser tak bisa memalsukan atau menghapus tandanya.
- **Folder `agen/`** (tak ikut image Docker):
  - klien ProductTrack yang menyusun data real seperti browser;
  - ringkasan pagi dan pengingat sebagai pekerjaan tanpa token (`agent-office.json`). Pengingat
    tak mengulang yang sudah diingatkan, dan tak mengingatkan task yang masih menunggu tahap
    sebelumnya;
  - server MCP `producttrack` dengan 13 alat untuk sesi AI. Alat baca langsung jalan; alat tulis
    selalu menunggu persetujuan;
  - `CLAUDE.md` berisi aturan kerja agen;
  - panduan di `agen/README.md`.
- Panel Dev → Sistem: baris *Agen AI*. Tab `setelan`, `data_real`, dan `obrolan_real` kini
  ditandai "ditulis aplikasi".
- Agent Office ikut diubah (repo terpisah):
  - karyawan **Ali** memegang folder `agen/`;
  - pekerjaan bisa `senyap` (hasil tanpa kabar baru tidak dikirim sebagai notifikasi);
  - kartu izin alat MCP menampilkan isiannya utuh.
- README: bagian *Agen AI Ali*. Tes baru `test/agen.test.js`: kunci, batasan sesi, tanda AI,
  klien, ringkasan & pengingat, dan alat MCP lewat stdio. 220 tes.

## 2.16.1 — Jabatan bawaan tanpa "Rumpun" (2026-10-09)

- Jabatan bawaan Uma, Tri, dan Wildan kini "Akademik". Saat rumpun dihapus di 0.14.0, yang
  dibuang hanya saringan, kolom CSV, dan bagian Dashboard-nya. Teks "Akademik · Rumpun …" di
  jabatan ketiganya tertinggal dan masih tampil di pemilih profil, kaki sidebar, dan Panel Dev.
  Jabatan yang pernah disimpan lewat Panel Dev → Pengguna (tab `orang`) tetap dipakai; ubah di
  sana kalau perlu.
- Tes: jabatan bawaan tak lagi memuat "rumpun". 213 tes.

## 2.16.0 — Data real tersimpan bersama, logo seperti v1 (2026-10-09)

Nomor versi kini berawal 2 (v2), lanjutan dari 0.15.2, dan tag rilisnya `v2.16.0`. Keputusan
user: data tetap di spreadsheet dulu; pindah ke MySQL menyusul.

- **Sumber data: contoh atau real.** Panel Dev → Sistem punya pilihan Data contoh / Data real
  yang berlaku untuk semua pengguna (tab `setelan`, aksi `aturSumber`, khusus Dev). Semua browser
  memuat ulang aplikasinya paling lambat sekitar satu menit kemudian. Data yang sedang tak
  dipakai tetap utuh. Bawaannya data contoh.
- **Data real** mulai kosong. Perubahan task, proyek, paket, setoran, dan Tautan tim tersimpan
  bersama di tab `data_real` dan terlihat semua orang. Browser menerapkannya seketika, server
  memeriksanya dengan aturan yang sama atas nama profil sesi (aksi `simpanReal`), dan perubahan
  orang lain tiba lewat tarikan berkala (aksi `sinkron`: 20 detik di Komunikasi, 30 detik di
  halaman lain). Yang ditolak server dibatalkan dengan pesannya. Yang gagal karena jaringan
  dicoba lagi, dengan keadaannya di kaki sidebar dan tombol **Coba simpan lagi**.
- Yang disimpan adalah **perubahannya**, bukan hanya perintahnya: riwayat diterapkan apa adanya,
  jadi aturan yang berubah kelak tak mengubah data lama. Perubahan besar dipecah ke beberapa
  baris; tab yang dibuat ulang dikenali dari generasinya.
- **Aman untuk dua instance Cloud Run** (`--max-instances 2`). Setiap baris mencatat `dasar`.
  Baris yang tersalip perubahan dari instance lain dilewati, lalu perintahnya diperiksa ulang
  dan ditulis lagi atau ditolak. Tanpa ini dua task baru pada detik yang sama bisa bernomor sama.
- Komunikasi data real di tab `obrolan_real`, terpisah dari obrolan data contoh. Link Saya dan
  Catatan Saya tetap di browser, terpisah per sumber data.
- Di data real: **Reset data contoh** tak ada, **Coba sekarang** di Panduan diganti keterangan,
  dan mode Dev serta Lihat sebagai tak mengubah data.
- Panel Dev menampilkan jumlah perubahan, besar riwayatnya, baris yang diulang atau rusak, dan
  peringatan di atas ±20 MB: saatnya pindah ke MySQL.
- Semua perubahan data di tampilan kini lewat satu pintu, `ubahData(aksi, isi)`. Aturannya di
  `public/inti.js`: `AKSI_DATA` (24 aksi), `jalankanPerintah`, `periksaPerintah`, `bedaData`,
  `terapkanUbah`. Mencentang sub-task kini lewat aturan `centangSubtask` (PIC task, Lead-nya,
  Manager, atau PIC sub-task itu) dan tercatat di Aktivitas.
- **Logo seperti v1.** Ikon dari folder `logo/` dipakai di sidebar, layar PIN, pemilih profil,
  favicon, dan ikon layar beranda (`public/logo/`): "Product" biru tua, "Track" biru logo, dan
  versinya kecil di samping nama.
- **Skema MySQL v2 disiapkan** (`db/produk_base_v2.sql`), belum dipakai aplikasi. Keputusan
  user: tanpa skema baru, tabel v2 dibuat di `produk_base` yang sudah ada. 21 tabel berawalan
  `v2_` — satu per koleksi model data, kolom bernama sama dengan field-nya — berdampingan dengan
  18 tabel salinan v1, yang tak dihapus. Awalan itu juga menjauhkan tabel v2 dari `muat.js
  --ulang` di repo v1, yang mengosongkan tabel menurut nama. Berkasnya hanya membuat (tanpa
  DROP), aman dijalankan berulang, dan diakhiri pemeriksaan jumlah tabel.
- README: bagian *Sumber data: contoh dan real*, penomoran 2.x dan tag rilis, logo.
- Tes baru: `test/real.test.js`, `test/real-rpc.test.js` (termasuk dua instance yang menyimpan
  bersamaan), dan `test/skema-mysql.test.js` (setiap koleksi dan field di `api/_skema.js` punya
  tabel dan kolomnya). 213 tes.

## 0.15.2 — Siap jalan di Cloud Run lewat GitLab (2026-10-09)

Keputusan user: v2 menggantikan isi repo GitLab `produk-cerebrum/product-task-tracker` dan
domain `product-task-tracker.cerehub.id`, yang disiapkan tim IT untuk v1 tetapi belum dipakai
tim. v1 tetap di Vercel dengan Spreadsheet sampai digantikan. Tampilan dan aturan tak berubah.

- `server.js`, `Dockerfile`, `.dockerignore`, dan `.gitlab-ci.yml` mengikuti pola yang dibuat tim
  IT untuk v1: pipeline hanya terpicu tag git, build dan deploy produksi manual, service Cloud
  Run `product-task-tracker-service`. Bedanya Node 22 (sesuai `engines`) dan tanpa penjaga
  `gas/Index.html` milik v1.
- `server.js` meneruskan body kosong sebagai `{}`. Dengan pola server v1 (`undefined`), POST
  tanpa isi ke `api/rpc.js` v2 menggantung karena pembacanya menunggu stream yang sudah habis.
- Nama lingkungan di `/cek` dan Panel Sistem kini juga dibaca dari `APP_ENV`, yang diisi CI saat
  deploy ke Cloud Run. Sebelumnya di luar Vercel selalu "lokal".
- `npm start` menjalankan server yang sama dengan Cloud Run.
- README: bagian *Deploy ke Cloud Run (GitLab)* — env yang harus diganti di service itu sebelum tag
  pertama, dan langkah berikutnya: penyimpanan langsung ke MySQL.
- Tes baru: `test/server.test.js` dan `APP_ENV`. 197 tes.

## 0.15.1 — Hasil QC menyeluruh (2026-10-09)

Dari QC menyeluruh: simulasi acak di data v1 sungguhan, smoke test 11 profil × 4 lebar layar,
dan alur task anak dari dibagi sampai disetujui Manager.

- Task anak tak bisa dibuka kembali selagi induknya ditinjau atau sudah selesai; tombolnya
  nonaktif dengan alasan. Tombol aksi sekunder yang nonaktif kini memang tampil nonaktif.
- Langkah yang sudah dibagi ke task anak tak lagi muncul di "Antrean tim · siap dibagi".
- Task Daftar: task anak yang induknya ada di halaman sebelumnya tampil dengan chip ↳, bukan
  menjorok tanpa induk.
- Timeline dan tabel Task Daftar kini bisa digulir mendatar. Sebelumnya ujung kanannya
  terpotong di layar sempit karena `.kartu-polos.rapat` menimpa `overflow-x: auto`.
- Panduan di ponsel: kartu "Mulai cepat" tak lagi melebar keluar layar. Grid satu kolom di
  tampilan ponsel kini `minmax(0, 1fr)`.
- Catatan: mengetik "- [ ] " (gaya GitHub) langsung menjadi checklist, sama dengan cara
  teksnya dibaca ulang. Sebelumnya tampil sebagai butir daftar berteks "[ ]" dan baru berubah
  jadi checklist saat catatan dibuka lagi.
- Tes baru: simulasi acak dengan benih tetap (`test/acak.test.js`), antrean, dan kunci buka
  kembali. 189 tes.

## 0.15.0 — Task anak, paralel per tahap, sub-task bisa diubah (2026-10-09)

- **Task anak menggantikan "Serahkan ke staff".** Task yang dipegang Lead tak lagi bisa
  diserahkan ke staff (juga lewat Ubah, juga oleh Manager). Lead membaginya dengan membuat task
  anak untuk staff timnya: dari bagian **Task anak** di detail task, atau dari kolom **Task
  induk** di form Tambah task (muncul saat Lead memilih staff sebagai PIC). Task anak ada di
  proyek, siklus, dan tahap yang sama dengan induknya, ditinjau Lead itu (juga di sub-stage
  bertanda Manager), dan tak beranak lagi.
- **Tampil menjorok.** Di halaman proyek dan Task (Daftar, juga di ponsel), task anak tepat di
  bawah induknya dengan garis penghubung; di tabel bertanda ↳. Di daftar lain (Hari Ini, Kanban,
  Kalender, Timeline di ponsel) task anak membawa chip **↳ PRD-…** induknya, dan induk
  menampilkan "N/M task anak". Detail task anak menautkan ke induknya. Ekspor CSV mendapat kolom
  Task induk.
- **Induk menunggu anaknya.** Syarat ajukan bertambah "Semua task anak selesai"; task rutin yang
  punya task anak baru bisa ditandai selesai setelah anaknya beres. Induk yang masih antre
  ikut mulai begitu dibagi. Induk yang sudah dibagi tetap dipegang PIC-nya, dan tahap induk-anak
  tak bisa diganti lewat Ubah.
- **Paralel per tahap.** Task proyek di tahap ADDIE yang sama dalam satu siklus tak lagi saling
  menunggu, siapa pun Lead-nya; yang berurutan hanya tahapnya (A → D → DV → I → E). Pesannya
  "Menunggu tahap Development selesai: …", dan di halaman proyek cukup satu keterangan per
  bagian tahap. E12 menunggu semua task lain di siklusnya, dan hanya E12 yang bukan task anak
  yang menutup siklus. Notifikasi "siap" muncul saat tahap sebelumnya tuntas. Task rutin tetap
  memakai `deps`. Langkah elaborasi tetap mencatat urutannya di `deps`, hanya untuk menemukan
  batch-nya.
- **Sub-task bisa diubah dan dihapus.** Ikon pensil mengubah judul dan PIC di tempat, ikon
  tempat sampah menghapus (dengan konfirmasi). Aturannya pindah ke `public/inti.js`
  (`tambahSubtask`, `ubahSubtask`, `hapusSubtask`) dan tercatat di Aktivitas.
- **"Tambah task di Development"** di halaman proyek langsung memakai jalur Proyek dan hanya
  menawarkan sub-stage tahap itu (juga untuk tahap lain).
- Skenario contoh (`scripts/_demo.js`) ditulis ulang untuk aturan baru: TKA di Development
  dengan task anak di berbagai keadaan, OJK satu siklus penuh tahap demi tahap. Panduan, README,
  dan teks aplikasi tak lagi menyebut delegasi.
- Kolom baru `induk` di tab `tasks` (hanya menambah; versi live lama mengabaikannya).
- 186 tes.

## 0.14.3 — Mode Dev tersembunyi (2026-10-09)

- Kartu **Dev** tak lagi tampil di pemilih profil ("Masuk sebagai siapa?"), juga saat sesi Dev
  masih berlaku.
- Mode Dev hanya dimasuki lewat **tekan-tahan logo ProductTrack 3 detik** (sebelumnya ±2 detik).
  Selama sesi Dev berlaku, tekan-tahan logo langsung kembali jadi Dev tanpa PIN.
- Membuka `#/dev` tanpa sesi Dev tak lagi memunculkan isian PIN Dev; alamat itu jatuh ke beranda.
  Dengan sesi Dev aktif, `#/dev` tetap membuka Panel Dev.

## 0.14.2 — Daftar proyek dan Dashboard lebih rapi (2026-10-09)

- **Proyek:** jalur ADDIE di tiap baris kini lurus satu kolom, begitu juga progres dan label
  keadaannya (Berisiko, Siklus selesai, …), berapa pun panjang nama proyek dan labelnya. Kalau
  daftarnya sempit (mis. layar laptop), progres turun ke bawah nama; di ponsel semuanya bertumpuk.
- **Proyek:** batang progres task di tiap baris kini tampil (sebelumnya tingginya 0).
- **Proyek → Menunggu tinjauan Anda:** judul task tak lagi terpecah satu kata per baris; status,
  tenggat, dan PIC pindah ke bawah judul seperti di ponsel.
- **Dashboard → Task aktif per tahap:** enam kotak (A D V I E R) sama besar, 3 × 2 di kartu yang
  sempit dan sebaris kalau kartunya lebar; nama tahap yang panjang tak lagi melebarkan kotaknya.
  Kotak tahap ADDIE di bawah (Proyek · tahap ADDIE) juga dijaga sama lebar.

## 0.14.1 — PIN profil hanya untuk mode Dev (2026-10-09)

- Bagian **PIN profil** di halaman Master kini hanya tampil di **mode Dev**; Manager (juga "Lihat
  sebagai" Manager) melihat Master tanpa bagian itu. Peringatan "Master masih terbuka" juga hanya
  tampil di mode Dev.
- Server ikut: `aturPin` hanya menerima sesi Dev, jadi Manager tak bisa memasang atau menghapus
  PIN lewat API. Aturan Master tidak berubah (Dev, atau Manager yang terbukti lewat PIN-nya).
- Panel Dev → Pengguna punya tombol pintasan **PIN profil**. Jendela PIN profil menyebut "minta
  Dev" untuk PIN yang lupa.
- Penolakan izin (mis. "Hanya mode Dev", "Profil … memakai PIN") tak lagi diawali "Kesalahan tak
  terduga".
- Panduan, README (termasuk batasan yang sudah tak berlaku sejak 0.14.0), dan tes diperbarui.
- **Perlu dilakukan:** masuk mode Dev, buka Master → PIN profil (atau Panel Dev → Pengguna →
  PIN profil), pasang PIN Manager dulu, lalu PIN anggota lain.

## 0.14.0 — Master, PIN profil, dan catatan ala Notion (2026-10-09)

- **Rumpun dihapus.** Saringan rumpun di Task, kolom rumpun di ekspor CSV, dan bagian "Task aktif
  per rumpun" di Dashboard tak ada lagi. Saringan rumpun yang tersimpan di browser diabaikan.
- **Rancangan paket tanpa Program dan PIC.** Form paket baru hanya meminta nama paket dan
  platform; form ubah, kartu, dan detail paket tak lagi menampilkan Program dan PIC produk.
  Nilai lamanya tetap tersimpan di data.
- **Sub-stage dipilih sendiri.** Form Tambah task tak lagi memilihkan sub-stage atau jenis rutin;
  keduanya wajib dipilih.
- **Halaman Master** (grup Manajer; Manager dan Dev), seperti tab Master v1. Daftar pilihan yang
  dipakai semua orang kini bisa diatur tanpa mengubah kode:
  - **Sub-stage**: tambah kode (mis. DV10, R5), ubah nama, tim pemilik, dan tinjauan Manager.
  - **Kategori paket**: tambah kategori, susun alur langkah dan tanda capaiannya, urutkan.
  - **Platform** dan **satuan target**: tambah dan urutkan.
  - **Label prioritas**, **nama tim**, serta **nama dan bobot capaian**.
  - Yang sudah dipakai data hanya **dinonaktifkan**: tak ditawarkan lagi, data lamanya tetap
    terbaca. Isian diperiksa supaya alur tetap sah (mis. sub-stage yang dipakai alur aktif tak
    bisa dinonaktifkan, bobot capaian naik berurutan dan tayang 100%).
  - Tersimpan di tab baru `master` spreadsheet v2 dan berlaku untuk semua orang saat aplikasi
    dimuat. Jenis yang rusak karena diubah manual kembali ke bawaan, dengan alasannya.
- **PIN profil.** Manager (atau Dev) memasang PIN 4–8 angka tiap orang di Master → PIN profil.
  Profil ber-PIN tampil bergembok dan meminta PIN-nya saat dipilih, juga sesudah keluar-masuk.
  - Server menolak pesan Komunikasi dan foto profil atas nama profil ber-PIN dari sesi yang belum
    memasukkan PIN-nya; aplikasi lalu memintanya. PIN yang diganti membatalkan sesi lama.
  - PIN disimpan sebagai hash bergaram di tab baru `pin`; tak pernah dikirim ke browser.
  - Master dan PIN hanya bisa diubah Dev atau Manager yang terbukti lewat PIN-nya. Selama
    Manager belum ber-PIN, keduanya masih terbuka (dengan peringatan di halaman Master).
  - "Coba sekarang" di Panduan tak lagi meminjam profil ber-PIN; contohnya dibuka sebagai profil
    sendiri.
- **Catatan Saya: editor ala Notion.** Mode Baca/Sunting dihapus; menulis, mencentang, dan
  mengisi tabel kini di satu tampilan.
  - Blok: teks, judul 1–3, daftar titik, daftar bernomor, checklist, **tabel**, kutipan, garis.
  - Ketik **/** untuk menu blok, atau pintasan `# `, `- `, `1. `, `[] `, `> `, `---`. Enter di
    checklist membuat butir berikutnya; Tab menjorokkan; Ctrl+Z/Ctrl+Y mengurungkan.
  - Tabel: Tab/Enter antarsel, tambah/hapus baris dan kolom, tempel sel dari Google Sheets.
  - Tetap tersimpan sebagai teks biasa (tabel `| a | b |`), jadi pencarian, unduhan .txt,
    riwayat versi, Jadikan task, dan catatan lama tetap jalan. Kartu Keep ikut menampilkan tabel.
  - Templat baru: **Tabel rencana produksi**.
- Panduan, README, dan tes diperbarui (`test/master.test.js`, `test/catatan-blok.test.js`, dan
  tes RPC Master & PIN).
- **Perlu dilakukan sesudah deploy:** buka Master → **PIN profil**, pasang **PIN Manager** dulu,
  lalu PIN anggota lain dan sampaikan langsung ke masing-masing.

## 0.13.0 — Mode Dev (2026-10-08)

- **Mode Dev seperti v1.** Tekan-tahan logo ProductTrack ±2 detik (atau buka `#/dev`), lalu isi
  **PIN Dev** (env baru `DEV_PIN`). Bisa juga langsung dari layar PIN. Dev adalah akun teknis,
  bukan anggota tim: tak jadi PIC, tak ada di laporan, dashboard, atau @sebut; hak lihatnya
  setara Manager. Tanda **MODE DEV** tampil di kepala.
  - Sesi Dev dijaga server: cookie bertanda tangan, berlaku **12 jam**, batal kalau `DEV_PIN`
    diganti. Tanpa PIN bawaan: `DEV_PIN` kosong = mode Dev tertutup.
- **Panel Dev** dengan tiga bagian:
  - **Sistem**: diagnosa server, spreadsheet (isi tiap tab), versi server vs browser, keadaan
    browser, dan galat terakhir; tombol Siapkan spreadsheet, tarik ulang pesan & foto, dan salin
    laporan diagnosa.
  - **Pengguna**: tambah, ubah, dan nonaktifkan orang (nama, nama panggilan, jabatan, peran,
    atasan atau tim). Disimpan di tab baru `orang` spreadsheet v2 dan berlaku untuk semua orang;
    organogram dijaga tetap utuh (satu Manager, satu Lead per tim, atasan aktif, nama panggilan
    unik). Ganti jabatan tak perlu lewat kode lagi.
  - **Lihat sebagai**: pratinjau layar siapa pun dengan spanduk kuning "Kembali jadi Dev";
    tampilan saja, tak ada yang disimpan atau dikirim.
  - **Moderasi**: hapus pesan siapa pun ("Pesan dihapus oleh Dev") dan foto profil siapa pun.
    Di Komunikasi, Dev memoderasi langsung dari gelembung pesan dan tidak menulis pesan.
- Data contoh kini membawa baris tab `orang` (dalam bacaan yang sama), jadi organogram terkini
  berlaku sebelum layar pertama. Server memakai organogram yang sama untuk memeriksa pengirim
  pesan dan pemilik foto.
- **Perlu disetel:** tambahkan `DEV_PIN` di Vercel (Production dan Preview), lalu Redeploy.

## 0.12.2 — Jabatan Ali (2026-10-08)

- Jabatan Ali kini **Data & Automation Engineer** (sebelumnya Sistem & Analisis). Tampil di
  pemilih profil, sidebar, tampilan Per orang, dan daftar @sebut. Peran (Lead) dan timnya
  (SI · Sistem) tidak berubah.

## 0.12.1 — Avatar lebih besar (2026-10-08)

- Supaya foto profil terlihat jelas, semua avatar diperbesar:
  - **Obrolan** (Komunikasi dan Diskusi di detail task): 24 → 36 px (32 px di ponsel).
  - **Sidebar, pemilih profil, dan tampilan Per orang**: 40 → 48 px.
  - **Kartu, tabel, timeline, dan riwayat**: 24 → 28 px.
  - **PIC di detail task dan paket, pilihan @sebut, dan anggota ruang tim**: 32 px.

## 0.12.0 — Foto profil (2026-10-08)

- **Foto profil unggahan sendiri.** Klik foto atau inisial sendiri di kaki sidebar (di ponsel:
  Menu), atau cari "Foto profil" di pencarian cepat. Foto menggantikan inisial di semua avatar,
  untuk semua orang.
  - Pilih berkas, seret ke jendela, atau tempel (Ctrl+V); JPG, PNG, atau WebP.
  - Atur di **bingkai bulat**: seret untuk menggeser, perbesar dengan penggeser, roda tetikus,
    atau cubit dua jari. Papan tombol: panah, + dan −, Enter menyimpan.
  - Diperkecil di browser menjadi JPEG persegi 192 px; foto asli tak pernah dikirim.
  - **Hapus foto** mengembalikan avatar ke inisial.
- **Tersimpan bersama di spreadsheet v2**, tab baru `foto`: satu baris per orang, ditimpa saat
  diganti. Impor ulang data contoh dan Reset data contoh tidak menyentuhnya.
  - Aksi baru di `/api/rpc`: `muatFoto` (hanya yang berubah sejak waktu tertentu) dan
    `simpanFoto`. Isinya diperiksa di browser dan server (`periksaFoto`), dan spreadsheet yang
    bukan milik v2 tetap ditolak.
  - Browser menyimpan foto supaya langsung tampil saat dibuka, lalu menarik yang berubah saat
    aplikasi dibuka dan tiap 5 menit.
- Disiapkan untuk MySQL nanti: cukup satu tabel `foto_profil`; aksi API dan tampilannya tetap.
- **Panduan:** langkah memasang foto profil di *Masuk sebagai siapa*.

## 0.11.1 — Aplikasi tak lagi tertahan di "Memuat data…" (2026-10-08)

- Sesudah 0.11.0 dirilis, aplikasi bisa berhenti di **Memuat data…** tanpa pesan apa pun.
  Penyebab yang paling mungkin: browser atau proxy memakai `inti.js` lama bersama `app.js` baru.
  - `index.html` kini memuat CSS & JS dengan `?v=<versi>`, jadi berkas lama dan baru tak bisa
    tercampur. Tes `berkas` memastikan `?v=` selalu sama dengan versi `package.json`.
  - Galat saat menyiapkan data atau menggambar layar pertama kini **ditampilkan** di layar itu,
    dengan tombol **Coba lagi** dan **Reset data contoh di browser ini** (jalan keluar kalau
    data lokal rusak).
  - Permintaan ke server punya **batas waktu** (memuat data 45 detik, lainnya 30 detik; cek
    sesi 15 detik). Kalau server tak menjawab, muncul pesan dan tombol Coba lagi.

## 0.11.0 — Link Saya yang ringkas, Catatan Saya yang lebih kaya (2026-10-08)

- **Link Saya tetap rapi walau link dan foldernya banyak:**
  - Folder bisa **diciutkan**: klik namanya, atau **Ciutkan semua / Buka semua** sekaligus.
    Saat mencari, semua folder terbuka.
  - **Sematkan folder ke atas**: tampil paling atas, di atas Tautan tim dan Favorit (urutan
    sesuai saat disematkan; ditandai di kepalanya).
  - Kartu berisi lebih dari **6 link** dipotong; **Lihat semua (n)** membukanya.
  - Tampilan **daftar ringkas**: satu kolom, link bersebelahan tanpa ikon.
  - **Seret link** ke kartu folder lain untuk memindahkannya (desktop); ke Favorit berarti
    menandainya ★. Tautan tim bukan tujuan seret.
  - Kepala kartu kini ringkas: **+** dan menu **⋯** (buka semua, sematkan, ganti nama, hapus).
  - Folder yang diciutkan, yang disematkan, dan bentuk tampilan diingat per profil di browser
    ini, dan ikut berganti saat foldernya diganti nama.
- **Catatan Saya:**
  - Tampilan **dua panel** atau **kartu** (editor terbuka di jendela; tombol Back menutupnya).
  - Daftar dikelompokkan per **folder yang bisa diciutkan**, dengan kelompok **Disematkan**
    paling atas; tombol + di tiap folder membuat catatan langsung di folder itu. Folder catatan
    bisa diganti nama dan dihapus.
  - Mode **Baca** dan **Sunting** (Ctrl+E). Baca menampilkan format dan **checklist yang bisa
    dicentang**; klik teksnya untuk menyunting tepat di baris itu.
  - **Toolbar format**: judul, tebal, miring, daftar, checklist, dan tautan `[teks](alamat)`
    (format tautan ini juga tampil di pesan Komunikasi).
  - **Jadikan task** dari satu baris catatan: form Tambah task terisi, lalu "→ PRD-…" ditempel
    di baris itu dan bisa diklik.
  - **Templat**: notulen rapat, rencana minggu ini, checklist QC, catatan 1-on-1.
  - **Warna catatan** dan saringan menurut warna.
  - **Riwayat versi** (maksimal 15 per catatan, di browser ini) yang bisa dipulihkan.
  - Progres checklist (mis. 2/5) tampil di daftar dan kartu.
- Catatan tetap pribadi dan hanya di browser ini; tidak ada perubahan di spreadsheet maupun
  `/api`.
- **Panduan:** *Link Saya* dan *Catatan Saya* kini panduan terpisah dengan tombol Coba sekarang
  masing-masing, ditambah istilah Mode Baca.

## 0.10.0 — Komunikasi bersama: kotak masuk kerja (2026-10-08)

- **Pesan Komunikasi tersimpan bersama** di tab baru `obrolan` spreadsheet v2. Ini data pertama
  yang ditulis aplikasi ke spreadsheet, dan semua orang melihat percakapan yang sama.
  - Tab itu hanya bertambah (pesan, ubah, hapus, reaksi, dan "beres" sebagai baris
    peristiwa), jadi penulis bersamaan tak saling menimpa.
  - Impor ulang data contoh dan Reset data contoh tidak menyentuhnya.
  - Aksi baru di `/api/rpc`: `muatObrolan` dan `kirimObrolan`. Isinya diperiksa di browser dan
    server, dan spreadsheet yang bukan milik v2 tetap ditolak.
- **Tampilan kotak masuk tiga kolom:**
  - Kiri: saringan **Belum dibaca**, **Menyebut saya**, **Perlu jawaban**, **Semua utas**, lalu
    ruang tim dan ruang proyek.
  - Tengah: daftar utas dengan penanda sebutan dan pertanyaan.
  - Kanan: percakapan bergelembung dengan pemisah hari dan batas "Pesan baru".
  - Di ponsel daftar tampil dulu, lalu percakapan penuh.
- **Ruang tim** (anggota tim dan Manager) dan **ruang proyek** (terbuka untuk semua), di luar
  utas per task.
- **@sebut** orang atau peran (@lead, @staff, @semua), dengan daftar pilihan saat mengetik @.
  Yang disebut mendapat notifikasi dan muncul di **Menyebut saya**.
- **Balas dengan kutipan**, **reaksi** 👍 ✅ 👀 🙏, **pesan cepat**, **ubah/hapus** pesan
  sendiri, format ringan (**tebal**, _miring_, ~~coret~~, `kode`, tautan), Enter kirim dan
  Shift+Enter baris baru, serta draf per ruang.
- **Perlu jawaban:** pesan bisa ditandai menunggu jawaban orang yang disebut (di ruang task
  tanpa sebutan: PIC-nya). Tanda itu terbuka sampai orang itu membalas atau ada yang menandainya
  beres.
- **Konteks kerja di percakapan:**
  - Jejak task tampil sebagai baris sistem (diajukan, dikembalikan beserta alasannya,
    disetujui, diserahkan, tertahan).
  - Panel konteks (sub-stage, proyek, PIC, peninjau, tenggat, syarat ajukan) dan tombol aksi
    task (Mulai, Ajukan, Setujui, Kembalikan, …) ada di kepala percakapan.
- **Diskusi di detail task** memakai utas yang sama, dengan tombol "Buka di Komunikasi".
- **Lonceng:** jenis notifikasi baru **sebut** dan **tanya**; pesan di ruang tim dan proyek hanya
  memberi tahu lewat keduanya.
- **Panduan diperbarui:** *Berdiskusi di Komunikasi*, ditambah istilah Ruang dan Perlu jawaban.

## 0.9.0 — Lingkup per peran, staff menambah task, ADDIE bisa diklik (2026-10-08)

- **Lingkup mengikuti peran.** Staff hanya melihat task-nya sendiri (pilihan lingkupnya tidak
  ditampilkan), Lead melihat **Saya** dan **Tim saya**, dan Manager melihat **Saya**, **Tim
  saya** (para Lead), dan **Semua** (bawaannya). Berlaku di Task, Dashboard, Komunikasi, dan
  pencarian cepat. Sebelumnya staff dan Lead bisa memilih "Semua", sedangkan Manager hanya
  punya "Divisi". Lingkup yang tersimpan dari 0.8.0 dibuang sekali, karena "tim" Manager kini
  berarti para Lead.
- **Staff bisa menambah task** untuk dirinya sendiri: rutin (R1–R4), atau task proyek di
  sub-stage milik timnya (selain yang direview Manager). PIC-nya selalu dirinya, task proyeknya
  tetap ditinjau Lead, dan task buatan sendiri bisa ia ubah. Lead-nya mendapat notifikasi
  "menambah task untuk dirinya sendiri". Tombol tambah per tahap di halaman proyek hanya muncul
  di tahap yang punya sub-stage tim staff itu. Panduan baru: *Menambah task sendiri*.
- **Elaborasi tanpa centang bawaan.** Target harus dipilih sendiri; ada tombol **Centang
  semua**/**Kosongkan**, dan tombol Buat task menunggu sampai ada target (lalu menyebut
  jumlahnya). Langkah per jenis muncul setelah targetnya dicentang.
- **Jalur ADDIE bisa diklik** di halaman proyek dan detail task: halaman bergulir ke bagian
  tahap itu dan membukanya, juga untuk tahap yang belum punya task.
- Alamat web di tujuan proyek dan keterangan task kini bisa diklik.
- Nama tahap di jalur ADDIE tak lagi bertumpuk di ponsel (dipotong dengan elipsis).

## 0.8.0 — Sidebar ringkas, halaman Task, Link & Catatan gaya ide v2 (2026-10-08)

- **Sidebar ditata ulang.** Grup Pekerjaan berurutan sesuai alurnya: Rancangan Paket → Proyek →
  Task → Komunikasi. Grup Task dan Kolaborasi digabung ke sana. Menu Dashboard Lain dihapus;
  isinya pindah ke Link Saya sebagai kartu **Tautan tim**. Bilah bawah ponsel: Hari Ini, Task,
  Proyek, Komunikasi, Menu. Halaman yang tersimpan dari versi lama (Kanban, Task List, Timeline,
  Kalender, Dashboard Lain) otomatis diarahkan ke penggantinya.
- **Satu halaman Task** dengan lima tampilan dalam bingkai yang sama, diganti lewat ikon: Daftar,
  Kanban, Per orang (baru), Timeline, Kalender. Tab fokus berangka (Semua, Terlambat, Tertahan,
  Tinjauan saya), kotak cari, lingkup, dan panel **Saringan** berlencana berlaku di semua
  tampilan. Cari kini juga menemukan nama proyek.
- **Link Saya gaya ide v2**: kartu per folder, tempel alamat lalu Enter (atau Ctrl+V di
  halaman itu) dan judulnya terisi sendiri, ★ Favorit, buka semua isi kartu sekaligus, pindah
  folder, Folder baru. Kartu **Tautan tim** terlihat semua orang dan dikelola Manager.
- **Catatan Saya gaya ide v2**: dua panel (daftar + editor besar), tersimpan otomatis saat
  mengetik, Ctrl+S menyimpan seketika, sematkan di atas, unduh .txt, folder sebagai chip.
  Catatan tanpa judul memakai baris pertamanya. Di ponsel daftar dulu, lalu editor penuh.
- **Alamat per halaman**: setiap halaman, tampilan Task, proyek, paket, catatan, dan task yang
  terbuka punya alamat (`#/task/kanban/PRD-1038`). Tombol **Salin tautan** di detail task,
  proyek, dan paket. Back/Forward browser berjalan, dan alamat yang dibuka sebelum memasukkan PIN
  tetap dituju sesudahnya.
- **Pencarian cepat** (Ctrl+K / ⌘K, atau /): lompat ke halaman, tampilan, aksi, rancangan paket,
  proyek, task, catatan, dan link dengan papan ketik.
- **Notifikasi** di lonceng bilah atas: task baru atau diserahkan ke Anda, task yang siap
  dimulai, tinjauan yang menunggu, dikembalikan/disetujui, komentar baru, dan siklus proyek yang
  selesai (Manager). Dihitung dari data yang ada (`notifikasi()` di `public/inti.js`).
- Panduan diperbarui untuk halaman Task, ditambah dua panduan baru: pencarian cepat & lonceng,
  serta Link Saya & Catatan Saya. Ilustrasi baru untuk pencarian cepat.
- Perbaikan tampilan ponsel: Dashboard tak lagi melebar melewati layar (kotak tahap jadi tiga
  kolom, tabel per orang bergulir di dalam kartunya), tab fokus Task bergeser tanpa batang
  gulir, dan Saringan tersusun dua kolom.

## 0.7.0 — Panduan di dalam aplikasi (2026-10-07)

- Menu **Panduan** di sidebar (grup Bantuan), dengan tab Mulai di sini, Konsep, Staff, Lead,
  Manager, dan Istilah: 23 panduan langkah demi langkah dan 19 istilah. Tab peran sendiri
  ditandai "peran Anda".
- **Coba sekarang** di tiap panduan: pindah ke profil yang cocok dan membuka contoh nyata di data
  contoh. Misalnya task staff yang syarat ajukannya belum lengkap, langkah di antrean Lead, atau
  OJK yang siklusnya sudah selesai. Contoh milik profil yang sedang dipakai diutamakan. Kalau
  contohnya sudah terpakai, panduan menyarankan Reset data contoh.
- **Kotak langkah** melayang menemani selama mencoba. Di ponsel ia mulai ringkas (ketuk judulnya
  untuk membuka) supaya tak menutupi laci detail.
- Tanda **?** membuka panduan terkait dari layar yang bersangkutan: Syarat ajukan, sub-stage di
  detail task, Antrean tim dan Perlu Anda tinjau di Hari Ini, Keputusan siklus, Ringkasan target
  paket, dan tabel per orang di Dashboard.
- Ajakan sekali per profil di halaman pertamanya: "Baru mencoba ProductTrack v2?".
- Ilustrasi panduan dibuat dari komponen aplikasi sendiri dengan teks contoh, bukan tangkapan
  layar: selalu sesuai tampilan terbaru, dan berkas publik tak memuat data sungguhan.
- Isi panduan dan pencari contohnya di `public/panduan.js`, diuji di `test/panduan.test.js`.

## 0.6.1 — Akhir siklus lebih jelas, tombol Reset data contoh (2026-10-07)

- Sesudah E12 disetujui, pilihannya dijelaskan satu per satu: **Selesai, arsipkan** (tombol
  utama kalau semua task sudah beres), **Mulai siklus berikutnya** (ADDIE diulang dari Analysis
  untuk perbaikan atau versi berikutnya), atau **Tahan**. Sebelumnya "Mulai siklus 2" menjadi
  tombol utama, sehingga terkesan proyek wajib lanjut ke "tahap berikutnya" walau sudah tuntas.
- Siklus yang sudah ditutup digambar selesai di jalur tahap: kelima tahap terisi, tanpa tanda
  "tahap sekarang" di Evaluation. Banner proyek yang semua task-nya selesai tanpa E12 kini
  menyebut bahwa Manager juga bisa langsung mengarsipkannya.
- Tombol **Reset data contoh** berlabel di kaki sidebar (di ponsel: Menu), menggantikan ikon ↻
  "Muat ulang data contoh" yang sulit ditemukan. Reset membuang semua perubahan di browser itu
  dan memuat ulang data contoh dari spreadsheet, persis seperti saat diimpor.

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
