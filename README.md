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

Satu aplikasi dengan sidebar kiri seperti v1. PIN aplikasi dipakai bersama, jadi setelah masuk
setiap orang memilih profilnya sendiri; sejak 0.14.0 profil bisa dikunci dengan **PIN pribadi**
(lihat *Master & PIN profil*). Halaman pertama mengikuti peran: Staff dan Lead mulai di
**Hari Ini**, Manager di **Proyek**.

| Grup | Halaman |
|---|---|
| Ringkasan | Hari Ini · Dashboard · Laporan (Lead & Manager) |
| Pekerjaan | Rancangan Paket · Proyek (bertahap ADDIE) · Task · Komunikasi |
| Ruang Saya | Link Saya (termasuk Tautan tim) · Catatan Saya |
| Manajer | Riwayat Aktivitas · Master (Manager) |
| Bantuan | Panduan |

Urutan Pekerjaan mengikuti alurnya: paket dirancang, dielaborasi jadi proyek, lalu proyek
berisi task. Di ponsel sidebar menjadi laci (tombol ☰), ditambah bilah bawah: Hari Ini, Task,
Proyek, Komunikasi, Menu. Bilah atas berisi **pencarian cepat** (Ctrl+K) dan **lonceng
notifikasi**; keduanya dijelaskan di bagian *Alamat, pencarian cepat, dan notifikasi*.

Sejak 0.6.0 alurnya mengikuti PRD v3 dari Manager (*ProductTrack v3 Product Operations System*),
dengan satu penyederhanaan: tetap empat status.

- **Empat status:** Antre → Dikerjakan → Ditinjau → Selesai. Keadaan lain di PRD tidak jadi
  status sendiri; ia dihitung dan tampil sebagai label: **Siap** (tahap sebelumnya sudah
  selesai), **Menunggu** (tahap sebelumnya belum selesai), **Revisi** (dikembalikan peninjau),
  dan **Tertahan** (tanda yang disertai alasan).
- **Sub-stage.** Setiap task berkode: A1–A6, D1–D7, DV1–DV9, I1–I8, E1–E12 di dalam proyek;
  R1–R4 untuk pekerjaan rutin. Kode menentukan tahap task dan **tim pemiliknya** (MG Manager,
  AK Akademik, LA Learning Architecture, CO Content Ops, SI Sistem). A1, A6, D1, I8, dan E12
  selalu direview Manager. Itu daftar bawaan PRD; sejak 0.14.0 Manager mengaturnya di halaman
  **Master**, dan form task tak lagi memilihkan sub-stage: harus dipilih sendiri.
- **Task anak (0.15.0).** Lead memberi task ke timnya sendiri, atau ke Lead tim pemilik
  sub-stage-nya (mis. Andika memberi DV8 Input ke Alya). Task yang dipegang Lead **tidak
  diserahkan ke staff**: langkah yang sudah bisa dimulai masuk **Antrean tim** di Hari Ini Lead
  itu, dan ia membaginya dengan membuat **task anak** untuk staff timnya, dari bagian Task anak
  di detail task atau dari kolom **Task induk** di form Tambah task. Task anak ada di proyek,
  siklus, dan tahap yang sama dengan induknya, tampil menjorok di bawahnya di halaman proyek dan
  di Task, ditinjau Lead itu (juga di sub-stage bertanda Manager), dan tak beranak lagi.
  Induknya baru bisa diajukan atau ditandai selesai setelah semua task anaknya selesai; induk
  yang masih antre ikut mulai begitu dibagi. Induk yang sudah dibagi tetap dipegang PIC-nya.
- **Paralel per tahap (0.15.0).** Task proyek di tahap ADDIE yang sama dalam satu siklus
  dikerjakan bersamaan, siapa pun Lead-nya, dan tak saling menunggu. Yang berurutan hanya
  tahapnya: task Design baru bisa dimulai setelah semua task Analysis di siklus itu selesai, dan
  seterusnya. Pengecualian: **E12** menunggu semua task lain di siklusnya, supaya siklus tak
  tertutup selagi masih ada pekerjaan. Task rutin tetap menunggu task di `deps`-nya.
- **Sub-task** bisa ditambah, diubah (judul dan PIC), dan dihapus oleh PIC task, Lead-nya, atau
  Manager; PIC sub-task boleh mencentangnya.
- **Syarat ajukan.** Task proyek baru bisa diajukan kalau output terisi, ada minimal satu
  tautan bukti, semua sub-task selesai, semua task anak selesai (kalau ada), tahap sebelumnya
  selesai, dan tidak tertahan. Staff mengisi output dan bukti sendiri dari detail task; daftar
  periksanya tampil di sana.
- **Tinjauan:** task staff oleh Lead-nya (termasuk task anak), task Lead oleh Manager, sub-stage
  bertanda Manager oleh Manager. Pekerjaan rutin tanpa tinjauan; PIC langsung menandai selesai.
- **Proyek tanpa Lead tetap.** Yang tampil adalah tim pemegang task terbukanya.
- **Tahap proyek dihitung, bukan diputuskan:** tahap task terbuka paling awal di siklus aktif.
  Tahap pindah sendiri dan tercatat di riwayat tahap. **Siklus ditutup** oleh task E12 · Final
  approval yang disetujui. Jalur **A D V I E** di halaman proyek dan detail task bisa diklik untuk
  membuka task tahap itu. Sesudah Evaluation tidak ada tahap keenam; Manager memilih:
  **arsipkan** (proyek tuntas, pilihan utama kalau semua task beres), **mulai siklus
  berikutnya** (ADDIE diulang dari Analysis untuk perbaikan atau versi berikutnya), atau
  **tahan**. Keputusan proyek: Build, Improve, Maintain, Hold.
- **Dashboard:** task aktif per status, tahap, tim pemilik, dan platform; per orang
  ditambah sub-task terbuka dan **skor bottleneck** (task orang lain yang menunggu dia × 2 +
  tinjauan yang menunggu dia × 2 + task telatnya).
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
  Aturannya `lingkupBoleh`/`lingkupOrang` di `public/inti.js`.

Semua aturan ini ada di satu berkas, `public/inti.js`, dan diuji di `test/`. Tampilan
(`public/app.js`) hanya meneruskan klik ke aturan itu.

### Rancangan paket → proyek → progres yang bergerak sendiri

1. Di **Rancangan Paket**, Lead/Manager menekan **Elaborasi jadi proyek**. Tak ada target yang
   tercentang dari awal: targetnya dipilih sendiri (ada tombol **Centang semua**), dan tombol
   Buat task baru aktif sesudahnya. Setiap target yang dipilih menjadi satu **batch**: rangkaian task sesuai alur jenisnya. Contoh Latsol: DV1
   Produksi soal → E1 QC soal → DV8 Input → I1 Generate → E4 QC SIADU → E5 QC Web → E6 QC
   Android → I4 Show/hide. Setiap langkah dipegang Lead tim pemilik sub-stage-nya, yang
   membaginya ke staff lewat task anak. Sejak 0.15.0 langkahnya dikerjakan **per tahap ADDIE**,
   bukan satu per satu: DV1 dan DV8 berjalan bersamaan, I1 dan I4 setelah Development selesai,
   dan QC (E1, E4–E7) setelah Implementation selesai. Langkah yang tak perlu bisa dicoret. Mode
   **Satu task per target** (cara 0.5.0) tetap ada.
2. Jumlah per target bisa dikecilkan bila proyek ini hanya mengerjakan sebagian (target 10,
   proyek ini 5); sisanya tetap terbuka untuk elaborasi berikutnya. Tujuannya boleh proyek baru
   atau proyek yang sudah ada.
3. Langkah bercapaian membawa **setoran**. Progres paket **berbobot**: konten siap 40% (E1/E2),
   ter-input 60% (DV8), lolos QC output 85% (QC aplikasi terakhir), tayang 100% (I4). Setiap
   batch dinilai dari langkah bercapaian tertinggi yang sudah disetujui; target baru dihitung
   **terpenuhi** saat batch-nya tayang. Bobot itu bawaan dari usulan PRD; sejak 0.14.0 nama dan
   bobotnya diatur Manager di halaman **Master** (tayang tetap 100%). Karena sejak 0.15.0 QC
   (Evaluation) dikerjakan sesudah Implementation, batch dengan alur bawaan biasanya naik dari
   ter-input (60%) langsung ke tayang (100%) begitu I4 disetujui.
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
  tampil di paket yang masih berisi item kategori itu. Lead & Manager membuat paket; PIC Produk
  dari data v1 boleh menyunting paketnya; membagikan ke Lintas Divisi hanya Lead/Manager;
  menghapus hanya Manager.
- **Task**: satu halaman dengan lima tampilan yang diganti lewat deretan ikon di atas daftar:
  **Daftar** (bisa diurutkan dan diekspor ke CSV, ikut sub-stage, tim, dan keadaannya),
  **Kanban** (seret-lepas di desktop), **Per orang**, **Timeline** (5 minggu), dan **Kalender**
  (tenggat per hari). Tab fokus berangka di atasnya: Semua, Terlambat, Tertahan, dan Tinjauan
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
  - Ada pesan cepat ("Sudah saya cek", "Mohon dicek", dan lainnya) dan draf yang tersimpan per
    ruang.
- **Mengelola pesan.** Pesan bisa dibalas dengan kutipannya dan diberi reaksi 👍 ✅ 👀 🙏.
  Pesan sendiri bisa diubah (bertanda "diubah") atau dihapus (tampil "Pesan dihapus").
- **Perlu jawaban.** Tombol **?** menandai pesan menunggu jawaban orang yang disebut; di
  ruang task tanpa sebutan, yang ditunggu adalah PIC-nya. Pesan itu muncul di **Perlu jawaban**
  orang tersebut sampai ia membalas atau seseorang menandainya beres.
- **Konteks kerja di percakapan.** Utas task memuat jejak task-nya (diajukan, dikembalikan
  beserta alasannya, disetujui, diserahkan, tertahan) dan panel konteks: sub-stage, proyek, PIC,
  peninjau, tenggat, dan syarat ajukan. Tombol aksinya (Mulai, Ajukan, Setujui, Kembalikan, …)
  ada di kepala percakapan.
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
  detik di halaman lain, berhenti saat tab tak terlihat, dan melambat saat gagal.
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

- **Memasang.** Klik foto atau inisial sendiri di kaki sidebar (di ponsel: Menu), atau cari
  "Foto profil" di pencarian cepat. Pilih berkas, seret ke jendela itu, atau tempel (Ctrl+V).
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
    orang tidak dikirim.
  - **Moderasi**: hapus pesan siapa pun (tampil "Pesan dihapus oleh Dev"; isi aslinya tetap di
    tab `obrolan`) dan foto profil siapa pun. Di Komunikasi, Dev membaca dan memoderasi langsung
    dari gelembung pesan, tapi tidak menulis.
- **Keluar**: tombol **Keluar mode Dev** di Panel Dev atau kaki sidebar.

Server: aksi `masukDev`, `keluarDev`, `sistem`, `simpanOrang`, dan peristiwa obrolan
`moderasi`; tiga yang terakhir khusus sesi Dev (403 untuk sesi biasa). Aturannya di
`public/inti.js` (`periksaOrang`, `aturOrang`, `salahOrganogram`), diuji di
`test/orang.test.js`, `test/sesi.test.js`, dan `test/rpc.test.js`.

### Master & PIN profil

Sejak 0.14.0, seperti tab Master di v1: halaman **Master** (grup Manajer; Manager dan Dev)
mengatur daftar pilihan yang dipakai semua orang. Bagian **PIN profil** (PIN pribadi tiap
profil) hanya tampil dan berlaku di mode Dev (0.14.1).

- **Sub-stage**: tambah kode baru (nomor berikutnya terisi sendiri, mis. DV10 atau R5), ubah
  nama, tim pemilik, dan "direview Manager", atau nonaktifkan.
- **Kategori paket**: tambah kategori, susun **alur langkah** dan tanda capaiannya (konten →
  input → QC → tayang; tayang wajib), urutkan, nonaktifkan. Nama kategori tetap, karena item
  paket merujuk ke nama itu.
- **Platform & satuan**: tambah, urutkan, nonaktifkan.
- **Label & bobot**: label prioritas, nama tim, serta nama dan bobot capaian (naik berurutan,
  tayang 100%).
- **PIN profil** (mode Dev saja): pasang, ganti, atau hapus PIN (4–8 angka) tiap orang. Dari
  Panel Dev → Pengguna ada pintasan **PIN profil** ke bagian ini.

Yang sudah dipakai data tidak dihapus, hanya **dinonaktifkan**: tak ditawarkan lagi di form,
tapi task dan paket lamanya tetap terbaca. Perubahan berlaku untuk semua orang saat aplikasi
dimuat ulang.

**PIN profil.** Profil ber-PIN tampil bergembok di pemilih profil dan meminta PIN-nya. Server
mencatat profil yang sudah terbukti di cookie sesi (ikut sidik hash PIN-nya, jadi PIN yang
diganti membatalkan sesi lama), dan **menolak menulis atas nama profil ber-PIN** dari sesi lain:
pesan Komunikasi dan foto profil. Browser lalu meminta PIN itu lagi. PIN disimpan sebagai hash
scrypt bergaram di tab `pin` dan tak pernah dikirim ke browser.

**Siapa yang boleh.** Master: Dev, atau Manager yang terbukti lewat PIN-nya. Selama belum ada
Manager yang ber-PIN, Master masih terbuka bagi siapa pun yang memilih profil Manager (seperti
data prototipe lainnya); peringatannya hanya tampil di mode Dev. PIN profil: **hanya Dev**
(`aturPin` menolak sesi lain, termasuk Manager). **Dev sebaiknya memasang PIN Manager lebih
dulu.**

**Cara kerjanya.** Tab `master` berisi satu baris per isian yang diubah (`jenis`, `kunci`,
`data` JSON, `aktif`, `urutan`); bawaannya tetap di kode (`public/inti.js`). Isian diperiksa di
browser dan server (`periksaMaster`), jenis yang rusak karena diubah manual kembali ke bawaan
dengan alasannya. Aksi `simpanMaster`, `aturPin`, dan `masukProfil` di `/api/rpc`. Seperti
`obrolan` dan `foto`, tab `master` dan `pin` tak disentuh impor ulang maupun Reset data contoh.
Diuji di `test/master.test.js` dan `test/rpc.test.js`.

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
  komentar baru di task yang Anda ikuti, dan (Manager) siklus proyek yang selesai. Semuanya
  dihitung dari data yang sudah ada (riwayat, tinjauan, komentar, keadaan task) oleh
  `notifikasi()` di `public/inti.js`, tidak disimpan terpisah. Tanda sudah dibaca disimpan per
  profil di browser itu.

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
public/inti.js        aturan alur v2, dipakai browser dan tes
public/panduan.js     isi halaman Panduan + pencari contoh untuk "Coba sekarang"
public/cek.html       halaman cek: setelan, akun, spreadsheet, kepemilikan, data contoh
api/rpc.js            satu pintu API: masuk, keluar, status, siapkan, muatContoh, obrolan, foto, mode Dev, Master, PIN profil
api/_sesi.js          gerbang PIN + cookie sesi (mode Dev, profil terbukti)
api/_sheets.js        Google Sheets + aturan kepemilikan + data contoh + tab obrolan, foto, orang, master, pin
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
| `DEV_PIN` | (opsional) PIN mode Dev, berbeda dari `ACCESS_PIN`. Kosong = mode Dev tertutup |

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
  menunggu tinjauan Manager, task anak yang dikerjakan, dikembalikan (Revisi), terlambat,
  tertahan, dan menunggu tinjauan Lead, serta langkah yang masih di antrean Lead.
  Implementation dan Evaluation menunggu Development selesai. Setiap langkah yang lolos punya
  output dan bukti, dan pekerjaannya dibagi ke staff lewat task anak.
- **OJK** diberi target contoh dan menjalani satu siklus penuh, tahap demi tahap: A1/A6 oleh
  Manager, keputusan Build, Development, Implementation (semua batch tayang), Evaluation, lalu
  E12 disetujui. Siklusnya tertutup dan menunggu keputusan Manager.
- **UTBK** diberi target contoh tanpa dielaborasi, untuk mencoba tombol **Elaborasi jadi
  proyek** sendiri.
- Beberapa Catatan Saya dan Link Saya contoh di folder "Contoh" (tautannya dari Tautan tim).

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
ratusan aksi sungguhan (status, output & bukti, task anak, ganti PIC dan sub-stage, sub-task)
oleh orang yang berganti-ganti. Tiap langkah memeriksa hirarki task anak, urutan tahap, dan
bahwa semua hitungan tampilan tetap jalan.

**Setiap rilis:** naikkan versi di `package.json` **dan** `?v=` di `public/index.html` (tes
`berkas` menolak kalau berbeda). Dengan begitu browser atau proxy kantor tak mencampur `inti.js`
lama dengan `app.js` baru.

## Batasan yang disadari

- **Suntingan belum tersimpan ke spreadsheet.** Data contoh dimuat dari server, tetapi yang
  diubah orang (status, tinjauan, sub-task, gate proyek, paket, link, catatan) tersimpan di
  browser masing-masing (localStorage). Pengecualiannya pesan Komunikasi dan foto profil, yang
  sudah tersimpan bersama di spreadsheet (lihat *Komunikasi bersama* dan *Foto profil*). Tombol **Reset data contoh** di kaki
  sidebar (di ponsel: Menu) membuang semua perubahan itu dan memuat ulang data contoh dari
  spreadsheet. Data contoh di spreadsheet tak pernah diubah aplikasi, jadi selalu utuh. Karena
  itu pula Catatan Saya belum terbagi antarperangkat. Jejak dan tombol aksi task di percakapan
  mengikuti data task di browser masing-masing, dan **tautan ke
  task yang dibuat di browser lain tidak ditemukan** (aplikasi memberi tahu "tidak ada di data
  browser ini"). Tautan ke apa pun yang sudah ada di data contoh selalu jalan.
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
- **Urutan tahap menggantikan urutan langkah alur (0.15.0).** Dengan alur bawaan, QC (E1,
  E4–E7) baru berjalan setelah I4 Show/hide, dan task Analysis yang terlambat menahan seluruh
  tahap sesudahnya di siklus itu.
- **Data contoh yang diimpor sebelum 0.15.0** dijalankan dengan aturan lama: langkah batch
  berurutan, dan langkah Lead diserahkan ke staff (PIC staff, bukan task anak). Di 0.15.0 task
  tahap berikutnya di sana yang sudah berjalan ikut menunggu tahap sebelumnya selesai. Impor
  ulang `npm run impor:v1 -- --demo` memasang skenario contoh baru; kolom `induk` di tab `tasks`
  hanya menambah, jadi versi live lama tetap membacanya.
- Task anak hanya satu tingkat dan tak bisa dipindah ke induk lain.
- Task belum bisa dihapus.
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

1. Simpan suntingan task, proyek, dan paket ke spreadsheet, menggantikan localStorage. Komunikasi
   (0.10.0) sudah memakai pola peristiwa yang hanya bertambah; pola yang sama bisa dipakai untuk
   status dan tinjauan task. Aturan alurnya sudah ada di `public/inti.js` dan bisa dipakai juga
   di server.
2. Login per orang, supaya profil berasal dari login, data bisa disaring per peran, dan Link
   Saya kembali pribadi.
3. Dropdown Master.
4. Setelah matang: pindah ke GitLab (salin isi CI ke `.gitlab-ci.yml`).
