/* =============================================================================
   panduan.js — isi halaman Panduan, dan pencari contohnya di data contoh.

   Isinya berupa data (judul, tujuan, langkah); tampilannya digambar app.js. Ilustrasinya
   juga dibuat app.js, dari komponen aplikasi sendiri dengan teks contoh, bukan tangkapan
   layar: selalu sesuai tampilan terbaru, dan berkas publik tak memuat data sungguhan
   (folder public/ bisa dibuka tanpa PIN).

   cariContoh() memilih contoh yang cocok di data yang sedang dimuat, mis. task staff yang
   syarat ajukannya belum lengkap, supaya tombol "Coba sekarang" tetap jalan walau data
   contoh diimpor ulang. null = contohnya sudah terpakai (mis. proyeknya sudah diarsipkan);
   Reset data contoh mengembalikannya.

   Dipakai browser (window.Panduan) dan tes (require).
   ========================================================================== */

(function (akar, buat) {
  if (typeof module === 'object' && module.exports) module.exports = buat();
  else akar.Panduan = buat();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* Tab halaman Panduan. Staff, Lead, dan Manager sama dengan nama peran di inti.js. */
  const BAGIAN = [
    { id: 'mulai', judul: 'Mulai di sini', ket: 'Tiga hal yang perlu diketahui sebelum mencoba.' },
    { id: 'konsep', judul: 'Konsep', ket: 'Aturan yang berlaku di semua halaman.' },
    { id: 'staff', judul: 'Staff', ket: 'Mengerjakan task sampai disetujui.' },
    { id: 'lead', judul: 'Lead', ket: 'Membagi pekerjaan, meninjau hasil, dan mengubah rancangan paket jadi proyek.' },
    { id: 'manager', judul: 'Manager', ket: 'Membaca keadaan divisi dan memutuskan nasib proyek.' },
    { id: 'istilah', judul: 'Istilah', ket: 'Kamus singkat istilah yang dipakai di aplikasi.' },
  ];

  /* Ilustrasi yang tersedia; gambarnya ada di app.js (ILUSTRASI). */
  const ILUSTRASI = ['reset', 'palet', 'status', 'kode', 'tahap', 'progres', 'syarat', 'revisi', 'tahan', 'antrean', 'tinjau', 'formtask',
    'elaborasi', 'keputusan', 'bottleneck'];

  /* **teks** = tebal. coba: true = ada tombol "Coba sekarang" (lihat cariContoh). */
  const PANDUAN = [
    {
      id: 'mulai-prototipe', peran: 'mulai', judul: 'Apa yang sedang Anda buka', tujuan: 'Mengenal aplikasi dan data contohnya.', ilustrasi: 'reset',
      langkah: [
        'Ini prototipe **ProductTrack v2**: alur kerja Divisi Produk mengikuti PRD v3, dengan siklus ADDIE (Analysis, Design, Development, Implementation, Evaluation).',
        'Datanya **data contoh**: data v1 sungguhan ditambah skenario latihan. Ada paket TKA yang sedang diproduksi, paket OJK yang siklusnya sudah selesai, dan paket UTBK yang belum dielaborasi.',
        'Perubahan Anda hanya tersimpan **di browser ini**. Coba apa saja; orang lain tidak terganggu.',
        'Ingin mengulang dari awal? Tekan **Reset data contoh** di kaki sidebar (di ponsel: Menu).',
      ],
    },
    {
      id: 'mulai-profil', peran: 'mulai', judul: 'Masuk sebagai siapa', tujuan: 'Melihat aplikasi dari sisi Staff, Lead, atau Manager.',
      langkah: [
        'Setelah PIN, pilih profil Anda sendiri. Tampilan menyesuaikan peran: Staff dan Lead mulai di **Hari Ini**, Manager di **Proyek**.',
        'Profil **bergembok** memakai **PIN pribadi**: masukkan PIN-nya saat memilih profil itu. PIN-nya dipasang lewat mode Dev, jadi orang lain tak bisa menulis pesan atau mengganti foto atas nama Anda.',
        'Untuk melihat sisi peran lain, klik foto Anda di kanan atas (di samping lonceng), lalu **Ganti profil**.',
        'Pasang **foto profil**: klik foto atau inisial Anda di kaki sidebar, atau buka menu foto di kanan atas lalu **Ganti foto profil**. Pilih foto, geser dan perbesar di bingkai bulat, lalu **Simpan foto**. Fotonya terlihat semua orang.',
        'Tombol **Coba sekarang** di panduan ini pindah ke profil yang cocok dengan sendirinya. Kotak **langkah panduan** di pojok bawah menemani selama Anda mencoba.',
      ],
    },
    {
      id: 'mulai-menu', peran: 'mulai', judul: 'Peta menu', tujuan: 'Tahu halaman mana untuk apa.',
      langkah: [
        '**Ringkasan**: **Hari Ini** (pekerjaan Anda per tenggat; Lead juga melihat antrean timnya), **Dashboard**, dan **Laporan**.',
        '**Pekerjaan**, berurutan seperti alurnya: **Rancangan Paket** (target paket) → **Proyek** (ADDIE) → **Task** → **Komunikasi** (utas per task, ruang tim, dan ruang proyek).',
        '**Task** satu halaman dengan lima tampilan. Deretan ikon di atas daftar menggantinya: Daftar, Kanban, Per orang, Timeline, dan Kalender. Saringannya berlaku di semua tampilan.',
        'Yang terlihat mengikuti peran: **Staff** melihat task-nya sendiri, **Lead** juga task timnya (**Tim saya**), dan **Manager** juga para Lead serta seluruh divisi (**Semua**).',
        '**Ruang Saya**: Link Saya (termasuk tautan tim) dan Catatan Saya.',
        '**Manajer**: **Riwayat Aktivitas** (Manager) dan **Master** (Lead dan Manager), tempat daftar pilihan bersama diatur.',
        '**Sesuaikan tampilan** dan **Setel status** ada di menu foto Anda di kanan atas: warna aksen, latar, sampul, kepadatan, ukuran huruf, halaman awal, dan status ber-emoji. Semuanya milik profil Anda dan ikut ke perangkat lain.',
        '**Tema**: tombol bulan/matahari di samping lonceng memindah terang ↔ gelap dengan sekali klik. Untuk mengikuti tema perangkat, klik foto Anda di kanan atas lalu pilih **Sistem**; di menu yang sama ada **Ganti profil** dan **Keluar**. Pilihannya tersimpan di browser ini; bisa juga lewat Ctrl+K, ketik "tema".',
      ],
    },
    {
      id: 'mulai-cepat', peran: 'mulai', judul: 'Cari cepat, notifikasi, dan tautan', tujuan: 'Bergerak cepat tanpa menelusuri menu.', ilustrasi: 'palet',
      langkah: [
        'Tekan **Ctrl+K** (di Mac: ⌘K) atau klik kotak cari di atas. Ketik nama task, kode PRD, proyek, paket, catatan, atau halaman, lalu **Enter**.',
        'Kotak yang sama menjalankan aksi: **Tambah task**, **Catatan baru**, **Ganti profil**, **Reset data contoh**, dan lainnya.',
        '**Lonceng** di kanan atas berisi yang menyangkut Anda: task baru, task yang dikembalikan atau disetujui, tinjauan yang menunggu, pesan baru, serta sebutan dan pertanyaan untuk Anda.',
        'Setiap halaman, task, proyek, dan paket punya alamat sendiri. Tombol **Salin tautan** menyalinnya untuk dikirim di chat, dan tombol Back browser berfungsi.',
      ],
    },
    {
      id: 'mulai-ruang', peran: 'mulai', judul: 'Link Saya', tujuan: 'Menyimpan tautan kerja, serapi apa pun banyaknya.', coba: true,
      langkah: [
        'Tempel alamat di kotak atas lalu **Enter**; judulnya terisi sendiri. Bisa juga cukup **Ctrl+V** di halaman itu.',
        'Link dikelompokkan dalam kartu per folder. Klik **nama folder** untuk menciutkan atau membukanya, atau **Ciutkan semua** sekaligus. Pilihan ini diingat di browser ini.',
        'Menu **⋯** di kartu folder: **Sematkan ke atas** (paling atas, di atas Tautan tim), buka semua link sekaligus, ganti nama, atau hapus folder. Kartu berisi lebih dari 6 link dipotong; **Lihat semua** membukanya.',
        'Ikon di atas kartu berganti antara tampilan **kartu** dan **daftar ringkas**. Di komputer, **seret** link ke kartu folder lain untuk memindahkannya; ke Favorit berarti menandainya **★**.',
        'Kartu **Tautan tim** berisi dashboard dan laporan tim (dulu menu Dashboard Lain), dikelola Manager.',
      ],
    },
    {
      id: 'mulai-catatan', peran: 'mulai', judul: 'Catatan Saya', tujuan: 'Mencatat, mencentang, dan mengubah catatan jadi task.', coba: true,
      langkah: [
        'Pilih tampilan **dua panel** (daftar + editor) atau **kartu** (editor terbuka di jendela). Catatan dikelompokkan per folder yang bisa diciutkan; yang disematkan selalu di atas.',
        'Catatan **tersimpan sendiri** saat Anda menulis; **Ctrl+S** menyimpan seketika. Mulai dari **Templat** bila perlu: notulen rapat, rencana minggu, checklist QC, 1-on-1, atau tabel rencana produksi.',
        'Tulis langsung, seperti di Notion: tak ada mode Baca atau Sunting. Ketik **/** untuk memilih blok: judul, checklist, daftar, **tabel**, kutipan, atau garis pemisah. Toolbar di atas isi berisi pilihan yang sama.',
        'Pintasan: **#** lalu spasi untuk judul, **-** untuk daftar, **[]** untuk checklist, **1.** untuk daftar bernomor. **Enter** di checklist membuat butir berikutnya; Enter di butir kosong keluar dari daftar. **Tab** menjorokkan butir.',
        'Centang checklist langsung dengan mengekliknya. Di tabel, **Tab** pindah ke sel berikutnya; tombol di bawah tabel menambah atau menghapus baris dan kolom. Tempel sel dari Google Sheets untuk mengisi tabel sekaligus.',
        '**Jadikan task** membuat task dari satu blok catatan; nomor task-nya ditempel di ujung blok itu dan bisa diklik. **Ctrl+Z** mengurungkan perubahan.',
        'Beri **warna** untuk menandai catatan dan saring menurut warnanya. **Riwayat versi** menyimpan isi lama, jadi suntingan yang keliru bisa dipulihkan.',
        'Catatan pribadi dan hanya ada di **browser ini**; tidak terkirim ke spreadsheet. Unduh sebagai .txt bila perlu disimpan di tempat lain.',
      ],
    },

    {
      id: 'konsep-status', peran: 'konsep', judul: 'Empat status dan labelnya', tujuan: 'Membaca keadaan task sekilas.', ilustrasi: 'status', coba: true,
      langkah: [
        'Setiap task berjalan lewat empat status: **Antre → Dikerjakan → Ditinjau → Selesai**.',
        'Label di sebelahnya dihitung sendiri: **Siap** (boleh dimulai), **Menunggu** (yang ditunggunya belum selesai: fase timnya, serah-terima dari tim lain, atau gerbang Manager), **Revisi** (dikembalikan peninjau), dan **Tertahan** (ada hambatan, disertai alasan).',
        'Task proyek baru **Selesai** setelah disetujui peninjau. Task rutin langsung ditandai selesai oleh PIC-nya.',
      ],
    },
    {
      id: 'konsep-kode', peran: 'konsep', judul: 'Sub-stage dan tim pemilik', tujuan: 'Memahami kode seperti DV8 atau E1 di setiap task.', ilustrasi: 'kode', coba: true,
      langkah: [
        'Setiap task berkode **sub-stage**. Awalannya menunjukkan tahap: **A** Analysis, **D** Design, **DV** Development, **I** Implementation, **E** Evaluation. Kode **R** (R1–R4) untuk pekerjaan rutin di luar proyek.',
        'Kode menentukan **tim pemilik**: **DAE** Data & AI Engineer, **RAD** Research, Academic & Development, **LNA** Learning & Architecture, **CLO** Content & Learning Operation, dan **MG** Manager. Arahkan kursor ke kode untuk melihat nama lengkapnya.',
        'Peninjau: task staff ditinjau Lead-nya, task Lead ditinjau Manager. Kode **A1, A6, D1, I8, dan E12** selalu ditinjau Manager, kecuali task turunan: itu ditinjau Lead yang membaginya.',
        'Daftar sub-stage diatur Lead dan Manager di halaman **Master**: kode baru bisa ditambah, nama, tim pemilik, dan tinjauannya diubah, dan yang tak dipakai lagi dinonaktifkan. Yang belum pernah dipakai task bisa **dihapus**; nomor lain tak bergeser dan kodenya tak dipakai ulang, jadi kode baru melanjutkan dari nomor terbesar (mis. E13).',
        'Kode berwarna biru muda menandai pekerjaan **lepas** warisan v1: pekerjaan produk yang tidak masuk proyek mana pun.',
      ],
    },
    {
      id: 'konsep-tahap', peran: 'konsep', judul: 'ADDIE per tim dan siklus', tujuan: 'Tahu siapa menunggu siapa di sebuah proyek.', ilustrasi: 'tahap', coba: true,
      langkah: [
        'Halaman proyek dibagi per tim: tab **DAE · RAD · LNA · CLO**, ditambah **Ringkasan**. Tiap tim menjalankan **ADDIE-nya sendiri**: task masuk tab tim pemilik sub-stage-nya.',
        'Fase tim **dihitung**: fase task terbuka tim itu yang paling awal. Di dalam satu tim, task baru bisa dimulai setelah task tim itu di fase yang lebih awal selesai; yang sefase dikerjakan **bersamaan**.',
        'Tim yang berbeda **tidak saling menunggu**, kecuali lewat **serah-terima** yang diatur Lead (mis. input LNA menunggu soal dari RAD) dan **gerbang Manager**: task Manager di Analysis (A1, A6) ditunggu fase Design dan sesudahnya di semua tim.',
        '**Lead mengatur urutan timnya** lewat tombol **Atur urutan tunggu** (di tab tim atau detail task): task mana yang ditunggu, termasuk dari tim lain, dan apakah ikut urutan fase timnya. Elaborasi paket sudah memasang serah-terima antartim dan urutan alurnya (mis. tayang menunggu QC). Urutan yang membuat task saling menunggu ditolak.',
        'Klik fase di jalur **A D V I E** sebuah tim untuk membuka task fase itu di tab timnya.',
        'Proyek selalu terbuka di **tab tim Anda**; Manager di **Ringkasan**.',
        '**Hapus task**: di tab tim, tekan **Pilih task untuk dihapus**, centang task-nya (atau **Pilih semua** per fase), lalu **Hapus**. Turunan ikut terhapus bersama induknya. Satu task juga bisa dihapus dari tombol tempat sampah di detail task. Yang boleh: Manager, Lead untuk task timnya, dan staff untuk task yang ia buat sendiri.',
        'Siklus ditutup oleh task **E12 · Final approval** yang disetujui Manager; E12 menunggu semua task lain di siklusnya.',
        'Sesudah Evaluation tidak ada tahap keenam. Manager memilih: **arsipkan** (tuntas), **mulai siklus berikutnya** (ADDIE diulang dari Analysis untuk perbaikan atau versi berikutnya), atau **tahan**.',
      ],
    },
    {
      id: 'konsep-progres', peran: 'konsep', judul: 'Progres rancangan paket', tujuan: 'Membaca angka progres paket.', ilustrasi: 'progres', coba: true,
      langkah: [
        'Setiap target paket yang dielaborasi menjadi satu **batch**: rangkaian langkah kerja. Contoh Latsol: DV1 → E1 → DV8 → I1 → E4 → E5 → E6 → I4. Tiap langkah dikerjakan menurut fase ADDIE timnya; input LNA (DV8) menunggu soal RAD (DV1), dan tayang (I4) menunggu QC.',
        'Progres naik per **capaian**, saat langkahnya disetujui: konten siap **40%**, ter-input **60%**, lolos QC **85%**, tayang **100%** (bawaan PRD; nama dan bobotnya diatur Lead atau Manager di **Master**).',
        'Batang progres: biru = sudah tayang, biru muda = sebagian jalan, arsir ungu = sedang digarap.',
        'Di tabel target, satu chip = satu batch. Klik chip untuk membuka langkah bercapaian berikutnya.',
      ],
    },

    {
      id: 'staff-hari', peran: 'staff', judul: 'Melihat pekerjaan hari ini', tujuan: 'Tahu apa yang dikerjakan lebih dulu.', coba: true,
      langkah: [
        'Buka **Hari Ini**. Task Anda dikelompokkan: Terlambat, Hari ini, 7 hari ke depan, dan Nanti.',
        '**Belum bisa dikerjakan** berisi task yang menunggu task lain atau sedang tertahan, lengkap dengan alasannya.',
        '**Sub-task untuk saya** dan **Saya bantu** berisi task orang lain yang melibatkan Anda.',
        'Klik sebuah task untuk membuka detail dan tombol-tombolnya.',
      ],
    },
    {
      id: 'staff-ajukan', peran: 'staff', judul: 'Mengerjakan task proyek sampai diajukan', tujuan: 'Menyelesaikan satu langkah proyek lalu mengirimnya ke peninjau.', ilustrasi: 'syarat', coba: true,
      langkah: [
        'Buka task-nya. Kalau masih Antre, tekan **Mulai kerjakan**.',
        'Di **Output & bukti**, tulis hasil kerja (mis. "40 soal lolos QC"), lalu tekan **Simpan**.',
        'Tempel tautan hasil kerja (Drive, Sheets, SIADU, …) di kolom tautan bukti, lalu tekan **Tambah bukti**.',
        'Centang semua **sub-task**, kalau ada. Daftar **Syarat ajukan** berubah hijau satu per satu.',
        'Sub-task boleh punya **tautan** (opsional), mis. dokumen atau folder kerjanya: isi kolom **Tautan** saat menambah atau mengubah sub-task, lalu buka dari ikon di sampingnya.',
        'Setelah lengkap, tombol **Ajukan tinjau ke …** aktif. Tekan, dan task pindah ke Ditinjau.',
      ],
    },
    {
      id: 'staff-revisi', peran: 'staff', judul: 'Task dikembalikan (Revisi)', tujuan: 'Memperbaiki task yang belum disetujui.', ilustrasi: 'revisi', coba: true,
      langkah: [
        'Task yang dikembalikan kembali ke Dikerjakan dengan label **Revisi**.',
        'Baca alasannya di **Riwayat tinjauan** dan **Diskusi** pada detail task.',
        'Perbaiki hasilnya, perbarui output atau bukti bila perlu, lalu **Ajukan** lagi.',
      ],
    },
    {
      id: 'staff-tahan', peran: 'staff', judul: 'Menandai task tertahan', tujuan: 'Memberi tahu tim bahwa ada hambatan.', ilustrasi: 'tahan', coba: true,
      langkah: [
        'Di detail task, tekan **Tandai tertahan** dan tulis alasannya, mis. "menunggu akses SIADU".',
        'Task tertahan tampil merah bagi Lead dan Manager, dan ikut terhitung di Dashboard.',
        'Setelah hambatannya beres, tekan **Lepas tanda tertahan**, lalu lanjutkan.',
      ],
    },
    {
      id: 'staff-rutin', peran: 'staff', judul: 'Pekerjaan rutin (kode R)', tujuan: 'Mengerjakan task di luar proyek.', coba: true,
      langkah: [
        'Task rutin berkode **R1** Rekap & administrasi, **R2** Report berkala, **R3** Show/hide harian, atau **R4** Pemeliharaan data.',
        'Tidak perlu ditinjau: tekan **Mulai kerjakan**, lalu **Tandai selesai** begitu beres.',
      ],
    },
    {
      id: 'staff-tambah', peran: 'staff', judul: 'Menambah task sendiri', tujuan: 'Mencatat pekerjaan Anda yang belum ada di daftar.', coba: true,
      langkah: [
        'Tekan **Tambah task** di kanan atas (di ponsel: tombol **+**).',
        'Pilih jalur: **Rutin** (kode R) untuk pekerjaan harian, atau **Proyek** bila pekerjaannya bagian dari proyek. Pilih sendiri jenis rutin atau **sub-stage**-nya; tidak ada pilihan bawaan. Sub-stage proyek yang tersedia hanya milik tim Anda.',
        'PIC-nya otomatis Anda sendiri. Menyerahkan task ke orang lain tetap lewat Lead.',
        'Lead Anda mendapat notifikasi. Task proyek tetap diajukan ke Lead untuk ditinjau; task rutin langsung ditandai selesai.',
        'Salah ketik? Task buatan sendiri bisa diperbaiki lewat **Ubah** di detail task.',
      ],
    },
    {
      id: 'staff-diskusi', peran: 'staff', judul: 'Berdiskusi di Komunikasi', tujuan: 'Bertanya, memberi kabar, dan menjawab tanpa keluar dari aplikasi.', coba: true,
      langkah: [
        'Buka **Komunikasi**. Kiri: **Belum dibaca**, **Menyebut saya**, **Perlu jawaban**, ruang tim, dan ruang proyek. Tengah: utas. Kanan: percakapan.',
        'Pesan tersimpan bersama di spreadsheet v2: semua orang melihat percakapan yang sama. Di detail task, bagian **Diskusi** memuat utas yang sama.',
        'Ketik **@** untuk menyebut orang (@Kiki) atau peran (@lead, @semua). Yang disebut mendapat notifikasi di lonceng.',
        'Arahkan kursor ke pesan (di ponsel: ketuk) untuk memberi reaksi, **membalas** dengan kutipan, atau mengubah dan menghapus pesan sendiri.',
        'Tombol **?** di kotak tulis menandai pesan **perlu jawaban** dari orang yang disebut. Pesan itu ada di **Perlu jawaban** orang itu sampai dibalas atau ditandai beres.',
        'Enter mengirim, Shift+Enter membuat baris baru. Format ringan: **tebal** dengan dua bintang, _miring_ dengan garis bawah.',
      ],
    },

    {
      id: 'lead-antrean', peran: 'lead', judul: 'Memecah langkah jadi task turunan', tujuan: 'Membagi pekerjaan langkah yang Anda pegang ke staff tim, atau ke diri sendiri.', ilustrasi: 'antrean', coba: true,
      langkah: [
        'Langkah proyek yang sub-stage-nya milik tim Anda dan sudah bisa dimulai masuk **Antrean tim · siap dibagi** di Hari Ini.',
        'Buka langkahnya. Di bagian **Task turunan**, tulis bagian pekerjaannya, pilih PIC-nya (staff tim, atau **Anda sendiri**) dan tenggat, lalu tekan **Buat task turunan**. Ulangi untuk bagian lain.',
        'Task turunan tampil menjorok di bawah langkah Anda. Yang dipegang staff Anda tinjau; yang Anda pegang sendiri langsung ditandai selesai. Langkahnya sendiri tetap Anda pegang: task Lead tidak diserahkan ke staff.',
        'Setelah semua task turunan disetujui, lengkapi output & bukti langkah Anda, lalu ajukan ke Manager. Tanpa task turunan pun bisa: kerjakan sendiri lewat **Mulai kerjakan**.',
        'Task tim Anda yang PIC-nya staff (di tahap mana pun, mis. Design) juga bisa Anda bagi dari detail task-nya. Task yang sudah selesai atau sedang ditinjau tak bisa ditambah task turunan; alasannya tampil di bagian itu.',
      ],
    },
    {
      id: 'lead-tinjau', peran: 'lead', judul: 'Meninjau hasil kerja', tujuan: 'Menyetujui atau mengembalikan task yang diajukan.', ilustrasi: 'tinjau', coba: true,
      langkah: [
        'Task yang menunggu Anda ada di **Perlu Anda tinjau** (Hari Ini) dan **Menunggu tinjauan Anda** (Proyek).',
        'Buka task-nya, lalu periksa **Output & bukti**, sub-task, dan diskusinya.',
        'Tekan **Setujui** kalau sudah benar. Kalau langkah itu bercapaian, progres paketnya ikut naik.',
        'Kalau belum, tekan **Kembalikan** dan tulis yang perlu diperbaiki. Task kembali ke PIC dengan label Revisi.',
      ],
    },
    {
      id: 'lead-buat', peran: 'lead', judul: 'Membuat task', tujuan: 'Menambah pekerjaan dengan kode dan PIC yang tepat.', ilustrasi: 'formtask', coba: true,
      langkah: [
        'Tekan **Tambah task**, lalu pilih jalur **Proyek** atau **Rutin**. Dari tab tim di halaman proyek, **Tambah task di …** langsung memakai jalur Proyek dan hanya menawarkan sub-stage tim dan fase itu.',
        'Pilih proyek dan **sub-stage**-nya (wajib; tidak ada pilihan bawaan). Keterangan di bawahnya menyebut fase dan tim pemiliknya.',
        'Pilih **PIC**: anggota tim Anda, atau Lead tim pemilik kalau sub-stage itu milik tim lain (mis. DV8 Input dipegang Lead LNA).',
        'Kalau PIC-nya staff Anda (atau Anda sendiri) dan Anda memegang task di fase yang sama, pilih **Task induk** supaya task ini menjadi task turunannya.',
        'Isi tenggat dan keterangan, lalu tekan **Tambah task**.',
      ],
    },
    {
      id: 'lead-elaborasi', peran: 'lead', judul: 'Elaborasi rancangan paket jadi proyek', tujuan: 'Mengubah target paket menjadi langkah kerja.', ilustrasi: 'elaborasi', coba: true,
      langkah: [
        'Buka **Rancangan Paket**, pilih paketnya, lalu tekan **Elaborasi jadi proyek**.',
        'Centang target yang dikerjakan; awalnya belum ada yang tercentang (**Centang semua** bila semuanya). Jumlahnya boleh dikecilkan, mis. target 10 tapi proyek ini 5.',
        'Pilih **Alur lengkap per jenis**, lalu coret langkah yang tidak perlu.',
        'Pilih **proyek tujuan** (baru atau yang sudah ada) dan tenggat, lalu tekan **Buat task**.',
        'Langkah-langkahnya masuk tab tim pemiliknya dan dikerjakan menurut fase ADDIE tim itu. Serah-terima antartim (mis. input menunggu soal) dan urutan alurnya (tayang menunggu QC) dipasang otomatis; Lead tim bisa mengubahnya lewat **Atur urutan tunggu**.',
      ],
    },
    {
      id: 'lead-pantau', peran: 'lead', judul: 'Memantau tim', tujuan: 'Melihat beban dan hambatan tim.', ilustrasi: 'bottleneck', coba: true,
      langkah: [
        'Di **Task**, pilih tampilan **Per orang** (ikon di atas daftar) untuk melihat beban tiap anggota tim.',
        'Tab **Terlambat**, **Tertahan**, dan **Tinjauan saya** di atas daftar langsung menyaring task yang perlu ditindak.',
        '**Dashboard** menunjukkan skor bottleneck: siapa yang paling banyak ditunggu orang lain.',
        '**Laporan** merangkum per minggu atau bulan; **Salin ringkasan** siap ditempel di chat.',
      ],
    },

    {
      id: 'manager-proyek', peran: 'manager', judul: 'Membaca halaman Proyek', tujuan: 'Melihat keadaan semua proyek sekilas.', coba: true,
      langkah: [
        'Setiap baris menunjukkan tim beserta fasenya (mis. **RAD V**, **CLO ✓**), progres siklus, dan keadaannya: Sesuai rencana, Berisiko, Siklus selesai, dan lainnya.',
        'Kotak **Keputusan siklus** berisi proyek yang task E12-nya sudah disetujui.',
        'Klik proyek untuk melihat **Ringkasan** semua tim dan gerbang Manager, lalu tab tiap tim dengan task per fase ADDIE-nya. Peringatan merah muncul kalau ada task yang saling menunggu.',
        '**Hapus proyek** (di halaman proyek) menghapus proyek beserta semua task dan setoran paketnya, setelah ID proyeknya diketik ulang. Untuk proyek yang sudah selesai, lebih aman **arsipkan**: semuanya tetap ada dan bisa diaktifkan lagi.',
      ],
    },
    {
      id: 'manager-siklus', peran: 'manager', judul: 'Keputusan sesudah siklus selesai', tujuan: 'Menutup proyek, atau mengulangnya untuk perbaikan.', ilustrasi: 'keputusan', coba: true,
      langkah: [
        'Proyek muncul di **Keputusan siklus** setelah task **E12 · Final approval** disetujui.',
        '**Selesai, arsipkan**: proyek tuntas dan pindah ke Arsip. Task dan riwayatnya tetap tersimpan.',
        '**Mulai siklus berikutnya**: ADDIE diulang dari Analysis untuk perbaikan dari hasil evaluasi atau versi berikutnya. Task siklus lama tetap ada.',
        '**Tahan**: keputusan ditunda; proyek keluar dari antrean sampai dilanjutkan.',
      ],
    },
    {
      id: 'manager-baru', peran: 'manager', judul: 'Membuat proyek baru', tujuan: 'Memulai pekerjaan di luar rancangan paket.', coba: true,
      langkah: [
        'Di **Proyek**, tekan **Proyek baru**, lalu isi nama, platform, dan tujuannya.',
        'Tambahkan task pertamanya, biasanya **A1 · Intake** lalu **A6 · Target & indikator**.',
        'Pilih keputusan proyek (**Build, Improve, Maintain, Hold**) di halaman proyek.',
        'Pekerjaan dari rancangan paket tidak perlu dibuat manual: pakai **Elaborasi jadi proyek**.',
      ],
    },
    {
      id: 'manager-dashboard', peran: 'manager', judul: 'Membaca Dashboard', tujuan: 'Melihat beban dan hambatan divisi.', ilustrasi: 'bottleneck', coba: true,
      langkah: [
        'Ubin atas: task aktif, terlambat, tertahan, menunggu tinjauan, dan selesai 30 hari. Ubin Terlambat dan Tertahan bisa diklik untuk membuka Task yang tersaring.',
        'Task aktif dibagi per tahap proyek, tim pemilik, dan platform.',
        'Tabel per orang menampilkan **skor bottleneck**. Kuning mulai 3 dan merah mulai 6: orang itu perlu dibantu, atau pekerjaannya dibagi.',
      ],
    },
    {
      id: 'manager-paket', peran: 'manager', judul: 'Memantau progres rancangan paket', tujuan: 'Tahu seberapa jauh paket menuju tayang.', ilustrasi: 'progres', coba: true,
      langkah: [
        'Di **Rancangan Paket**, kartu tiap paket menampilkan progres berbobot dan jumlah yang sudah tayang.',
        'Di dalam paket ada kolom **Tayang**, **Progres**, dan **Digarap** per target. Chip per batch menunjukkan capaiannya.',
        '**Salin ke sheet Marsel** menyalin isi paket sesuai susunan kolom sheet Master Marsel.',
      ],
    },
    {
      id: 'manager-master', peran: 'manager', judul: 'Mengatur Master (Lead dan Manager)', tujuan: 'Mengubah daftar pilihan yang dipakai semua orang.', coba: true,
      langkah: [
        'Buka **Master** di grup Manajer. Isinya daftar pilihan yang dipakai semua orang: **sub-stage**, **kategori paket** dan alurnya, **platform**, **satuan**, label prioritas, capaian dan bobotnya, serta nama tim.',
        'Yang sudah dipakai data tidak dihapus, hanya **dinonaktifkan**: tak ditawarkan lagi, tapi task dan paket lamanya tetap terbaca. Panah atas-bawah mengatur urutan platform, satuan, dan kategori.',
        '**Hapus sub-stage**: tombol tempat sampah di baris sub-stage. Hanya yang belum dipakai task mana pun dan tak ada di alur paket; kalau sudah dipakai, jendelanya menawarkan **Nonaktifkan**. Kode yang dihapus tak dipakai ulang dan bisa **dipulihkan** dari bagian **Sudah dihapus**. E12 tak bisa dihapus karena menutup siklus.',
        '**Pindahkan ke kode lain** (tombol panah di baris sub-stage): kalau hanya kegiatannya yang ingin dipindah, mis. dari E10 ke I9. Nama, tim, dan review pindah ke kode baru, alur paket ikut; kode lama dihapus kalau belum dipakai task, selain itu dinonaktifkan.',
        '**Kategori paket**: susun alur langkahnya dan tandai capaiannya berurutan (konten, input, QC, tayang; tak boleh mundur). Satu capaian boleh dipasang di beberapa langkah, mis. semua langkah QC: progresnya naik setelah semua langkah itu selesai. Langkah lain biarkan Tanpa capaian. Kategori baru langsung muncul di form rancangan paket dan di salinan sheet Marsel.',

        'Perubahan tersimpan di spreadsheet v2 dan berlaku bagi semua orang saat aplikasi dimuat ulang.',
      ],
    },
  ];

  const ISTILAH = [
    ['Status', 'Antre, Dikerjakan, Ditinjau, atau Selesai. Hanya empat ini.'],
    ['Label', 'Keadaan yang dihitung dari status: **Siap**, **Menunggu**, **Revisi**, dan **Tertahan**.'],
    ['Sub-stage', 'Kode langkah kerja: A, D, DV, I, dan E di dalam proyek; R untuk rutin. Daftarnya diatur Lead dan Manager di Master.'],
    ['Tim pemilik', 'Tim yang memegang sebuah sub-stage: DAE, RAD, LNA, CLO, atau MG (Manager). Nama dan singkatannya diatur di Master.'],
    ['Antrean tim', 'Langkah proyek yang sudah bisa dimulai, di Hari Ini Lead tim pemiliknya: dikerjakan sendiri atau dibagi ke staff lewat task turunan.'],
    ['Task turunan', 'Bagian pekerjaan yang dibuat Lead di bawah task yang ia pegang, untuk staff timnya atau untuk dirinya sendiri (dulu disebut task anak). Tampil menjorok di bawah induknya; yang dipegang staff ditinjau Lead itu. Induknya baru bisa diajukan setelah semua turunannya selesai.'],
    ['Syarat ajukan', 'Syarat sebelum task proyek diajukan: output, tautan bukti, sub-task, task turunan (kalau ada), task yang ditunggu selesai, dan tidak tertahan.'],
    ['Peninjau', 'Yang menyetujui task proyek: Lead untuk task staff-nya (termasuk task turunan), Manager untuk task Lead dan kode bertanda Manager.'],
    ['Jalur', '**Proyek** (ADDIE per tim), **rutin** (kode R), atau **lepas** (kode ADDIE di luar proyek, warisan v1).'],
    ['Fase', 'A Analysis, D Design, V Development (kodenya DV), I Implementation, E Evaluation, dijalankan tiap tim di proyek. Task sefase dalam satu tim dikerjakan bersamaan; fase berikutnya menunggu fase sebelumnya tim itu selesai.'],
    ['Urutan tunggu', 'Yang harus selesai dulu sebelum sebuah task jalan: fase timnya (bawaan), serah-terima yang diatur Lead (boleh dari tim lain), gerbang Manager (A1, A6), dan untuk E12 semua task lain di siklusnya.'],
    ['Siklus', 'Satu putaran ADDIE. Ditutup task E12 yang disetujui; siklus berikutnya opsional.'],
    ['Keputusan proyek', 'Build, Improve, Maintain, atau Hold (ditahan).'],
    ['Rancangan paket', 'Isi produk dan target per kategori sebuah paket (Latsol, Tryout, Materi, dan lainnya; kategorinya diatur di Master).'],
    ['Elaborasi', 'Mengubah target paket menjadi batch langkah kerja di sebuah proyek.'],
    ['Batch', 'Rangkaian langkah untuk satu target dari satu kali elaborasi.'],
    ['Capaian', 'Titik progres batch: konten siap, ter-input, lolos QC, dan tayang (100%). Bobotnya diatur di Master.'],
    ['Setoran', 'Catatan bahwa sebuah langkah membawa target paket sampai capaian tertentu.'],
    ['Bottleneck', 'Skor orang yang paling banyak ditunggu: task orang lain × 2 + tinjauan × 2 + task telat.'],
    ['Data contoh', 'Data latihan di aplikasi ini. **Reset data contoh** di kaki sidebar mengembalikannya ke awal. Pesan Komunikasi tidak ikut di-reset.'],
    ['Ruang', 'Tempat obrolan di Komunikasi: utas per task, ruang proyek (terbuka untuk semua), dan ruang tim (anggota tim dan Manager).'],
    ['Blok', 'Satu bagian catatan: paragraf, judul, daftar, checklist, tabel, kutipan, atau garis pemisah. Ketik / di catatan untuk memilihnya.'],
    ['Master', 'Halaman Lead dan Manager (dan Dev) untuk daftar pilihan bersama: sub-stage, kategori paket, platform, satuan, prioritas, capaian, dan nama tim. Menghapus = menonaktifkan, supaya data lama yang memakainya tetap terbaca.'],
    ['Tampilan pribadi', 'Warna aksen, latar (wallpaper), sampul profil, kepadatan, ukuran huruf, dan halaman awal milik satu profil. Diatur lewat foto Anda di kanan atas → Sesuaikan tampilan, dan ikut ke perangkat mana pun.'],
    ['Status', 'Emoji dan teks singkat (mis. 🏖️ Cuti) di samping nama dan foto Anda, terlihat semua orang, dan hilang sendiri sesudah waktunya.'],
    ['PIN profil', 'PIN pribadi sebuah profil (4–8 angka), diminta saat memilih profil itu dan dipasang lewat mode Dev. Berbeda dari PIN aplikasi yang dipakai bersama.'],
    ['Perlu jawaban', 'Tanda pada pesan yang menunggu jawaban orang yang disebut. Hilang setelah orang itu membalas atau menandainya beres.'],
  ];

  const potong = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1).trimEnd() + '…' : String(s));

  /* Contoh untuk tombol "Coba sekarang" sebuah panduan, dipilih dari data yang sedang dimuat.
     Hasil: { profil?, view, tampilan?, tugas?, task?, proyek?, paket?, dash?, ket } (tampilan & tugas = setelan halaman Task) — atau null kalau
     contohnya tak ada lagi. profil kosong = tetap di profil yang sedang dipakai. Contoh milik
     `me` sendiri diutamakan, supaya profil tak perlu berganti kalau tak perlu. */
  function cariContoh(id, data, I, hariIni, me = '') {
    const perId = I.indeks(data);
    const adaProfil = x => I.ORANG.some(o => o.id === x);
    const staf = x => adaProfil(x) && I.orang(x).peran === 'staff';
    const lead = I.ORANG.filter(o => o.peran === 'lead').map(o => o.id);
    const pilihLead = nama => (lead.includes(me) ? me : lead.includes(nama) ? nama : lead[0]);
    // Task pertama yang cocok, yang PIC-nya `me` lebih dulu.
    const cari = cocok => data.tasks.find(t => t.pic === me && cocok(t)) || data.tasks.find(cocok);
    const arsip = new Set(data.projects.filter(p => p.arsip).map(p => p.id));
    const proyekAktif = t => t.lane === 'proyek' && I.aktif(t) && !arsip.has(t.project);
    const keTask = (t, profil = t && t.pic) => (t ? { profil, view: 'hari', task: t.id, ket: `${t.id} · ${potong(t.title, 70)}` } : null);
    // Proyek contoh: hasil elaborasi paket yang masih paling banyak task terbukanya.
    const proyekContoh = () => data.projects.filter(p => !p.arsip && p.paket)
      .map(p => [p, data.tasks.filter(t => t.project === p.id && I.aktif(t)).length])
      .filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([p]) => p)[0] || null;
    // Paket contoh: yang paling banyak disetor (progresnya paling "hidup").
    const paketContoh = () => data.packages.map(p => [p, (data.setoran || []).filter(s => s.paket === p.id).length])
      .filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([p]) => p)[0] || null;
    const kePaket = (p, profil) => (p ? { profil, view: 'paket', paket: p.id, ket: `${p.id} · ${p.namaPaket || p.program || p.id}` } : null);
    const keProyek = (p, profil) => (p ? { profil, view: 'proyek', proyek: p.id, ket: `${p.id} · ${p.name}` } : null);

    switch (id) {
      case 'konsep-status': return { view: 'task', tampilan: 'kanban', ket: 'Task · Kanban' };
      case 'konsep-kode': return { view: 'task', tampilan: 'daftar', ket: 'Task · Daftar' };
      case 'konsep-tahap': return keProyek(proyekContoh());
      case 'konsep-progres': return kePaket(paketContoh());

      case 'staff-hari': {
        const n = new Map();
        for (const t of data.tasks) if (I.aktif(t) && staf(t.pic)) n.set(t.pic, (n.get(t.pic) || 0) + 1);
        const [terbanyak] = [...n.entries()].sort((a, b) => b[1] - a[1]);
        const siapa = n.has(me) ? me : terbanyak && terbanyak[0];
        return siapa ? { profil: siapa, view: 'hari', ket: `Hari Ini ${I.orang(siapa).pendek}` } : null;
      }
      case 'staff-ajukan': {
        // Utamakan yang sedang dikerjakan tapi output atau buktinya belum ada; kalau tak ada, yang siap dimulai.
        const kurang = t => I.syaratAjukan(t, perId).some(s => !s.ok && (s.kunci === 'output' || s.kunci === 'bukti'));
        return keTask(cari(t => proyekAktif(t) && staf(t.pic) && t.status === 'Dikerjakan' && !t.tertahan && !I.depsBelum(t, perId).length && kurang(t))
          || cari(t => proyekAktif(t) && staf(t.pic) && I.labelKeadaan(t, perId) === 'Siap'));
      }
      case 'staff-revisi':
        return keTask(cari(t => staf(t.pic) && I.labelKeadaan(t, perId) === 'Revisi') || cari(t => adaProfil(t.pic) && I.labelKeadaan(t, perId) === 'Revisi'));
      case 'staff-tahan':
        return keTask(cari(t => staf(t.pic) && I.ditandaiTertahan(t)) || cari(t => adaProfil(t.pic) && I.ditandaiTertahan(t)));
      case 'staff-rutin':
        return keTask(cari(t => staf(t.pic) && I.aktif(t) && !t.tertahan && I.jenisJalur(t) === 'rutin' && /^R/.test(t.sub || '')));
      case 'staff-tambah': return { profil: staf(me) ? me : 'kiki', view: 'task', ket: 'Task · tombol Tambah task' };
      case 'staff-diskusi': return { view: 'komunikasi', ket: 'Komunikasi' };
      case 'mulai-ruang': return { view: 'link', ket: 'Link Saya' };
      case 'mulai-catatan': return { view: 'catatan', ket: 'Catatan Saya' };

      case 'lead-antrean':
        for (const l of lead.includes(me) ? [me, ...lead.filter(x => x !== me)] : lead) {
          const g = I.pekerjaanSaya(data, l, hariIni).grup.find(x => x.kunci === 'antrean');
          if (g && g.isi.length) return keTask(g.isi[0].t, l);
        }
        return null;
      case 'lead-tinjau': {
        const t = data.tasks.find(x => x.status === 'Ditinjau' && lead.includes(me) && I.peninjau(x) === me)
          || data.tasks.find(x => x.status === 'Ditinjau' && lead.includes(I.peninjau(x)));
        return t ? keTask(t, I.peninjau(t)) : null;
      }
      case 'lead-buat': return keProyek(proyekContoh(), pilihLead('andika'));
      case 'lead-elaborasi': {
        const terbuka = p => I.ringkasPaket(p, I.setoranPaket(data, p, perId)).terbuka > 0;
        const p = data.packages.find(x => terbuka(x) && !I.proyekPengisi(data, x.id).some(y => !y.arsip)) || data.packages.find(terbuka);
        return kePaket(p, pilihLead('alya'));
      }
      case 'lead-pantau': return { profil: pilihLead('alya'), view: 'task', tampilan: 'orang', tugas: { lingkup: 'tim' }, ket: 'Task · Per orang' };

      case 'manager-proyek': return { profil: I.MANAGER, view: 'proyek', ket: 'Halaman Proyek' };
      case 'manager-siklus': return keProyek(I.antreKeputusan(data, hariIni)[0], I.MANAGER);
      case 'manager-baru': return { profil: I.MANAGER, view: 'proyek', ket: 'Halaman Proyek' };
      case 'manager-dashboard': return { profil: I.MANAGER, view: 'dashboard', dash: { lingkup: 'semua' }, ket: 'Dashboard divisi' };
      case 'manager-paket': return kePaket(paketContoh(), I.MANAGER);
      case 'manager-master': return { profil: I.MANAGER, view: 'master', ket: 'Halaman Master' };
      default: return null;
    }
  }

  return { BAGIAN, ILUSTRASI, PANDUAN, ISTILAH, cariContoh };
}));
