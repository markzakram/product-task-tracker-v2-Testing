# Changelog — ProductTrack v2

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
