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
        '**Pekerjaan**, berurutan seperti alurnya: **Rancangan Paket** (target paket) → **Proyek** (ADDIE) → **Task** → **Komunikasi** (utas per task, ruang tim, dan ruang proyek). Anggota tim DAE, Manager, dan Dev juga melihat **Inisiatif** dan **Permintaan** (permintaan dari tim lain ke DAE; lencananya menunjukkan yang menunggu).',
        '**Task** satu halaman dengan lima tampilan. Deretan ikon di atas daftar menggantinya: Daftar, Kanban, Per orang, Timeline, dan **Kalender tim** (tenggat task, acara bersama, dan pendaftaran paket). Saringannya berlaku di semua tampilan.',
        'Yang terlihat mengikuti peran: **Staff** melihat task-nya sendiri, **Lead** juga task timnya (**Tim saya**), dan **Manager** juga para Lead serta seluruh divisi (**Semua**).',
        '**Ruang Saya**: **Kalender Saya** (agenda pribadi dan acara yang Anda ikuti), Link Saya (termasuk tautan tim), dan Catatan Saya.',
        '**Manajer**: **Riwayat Aktivitas** (Manager) dan **Master** (Lead dan Manager), tempat daftar pilihan bersama diatur. Itu bawaannya: siapa yang boleh membuka halaman ini dan apa saja yang boleh dilakukan tiap peran diatur mode Dev di **Panel Dev → Izin**.',
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
        '**Pilih beberapa baris**: **Ctrl+A** untuk semua isi, seret tetikus melewati beberapa baris, Shift+klik, atau ketuk pegangan **⋮⋮** di kiri baris. Lalu **Delete** menghapus, **Ctrl+C**/**Ctrl+X** menyalin atau memotong, **Ctrl+D** menggandakan, dan **Alt+Shift+↑/↓** memindah; tombolnya juga muncul di toolbar. **Esc** kembali menulis.',
        '**Pindah baris**: seret pegangan **⋮⋮** ke tempat garis biru. Pintasan lain: **Ctrl+Enter** mencentang checklist, **Ctrl+Shift+X** mencoret, **Ctrl+E** menandai kode.',
        '**Jadikan task** membuat task dari satu blok catatan; nomor task-nya ditempel di ujung blok itu dan bisa diklik. **Ctrl+Z** mengurungkan perubahan.',
        'Beri **warna** untuk menandai catatan dan saring menurut warnanya. **Riwayat versi** menyimpan isi lama, jadi suntingan yang keliru bisa dipulihkan.',
        'Catatan tersimpan di browser ini saja. Di data real, Catatan Saya boleh dibuka di beberapa tab sekaligus: isinya digabung dan tab lain ikut diperbarui. Catatan yang hilang tanpa dihapus, tetapi riwayat versinya masih ada, ditawarkan lewat **Lihat dan pulihkan** di atas daftar.',
        'Tombol **Pilih** di atas daftar memilih beberapa catatan sekaligus untuk dihapus, dipindah ke folder, atau diberi warna. Catatan juga bisa diseret ke folder lain, atau ke **Disematkan**.',
        'Salah hapus? Tekan **Urungkan** pada pesan yang muncul (atau **Ctrl+Z**) dalam 10 detik; catatan dan riwayat versinya kembali.',
        'Catatan pribadi dan hanya ada di **browser ini**; tidak terkirim ke spreadsheet. Unduh sebagai .txt bila perlu disimpan di tempat lain.',
      ],
    },
    {
      id: 'mulai-acara', peran: 'mulai', judul: 'Membuat acara dan rapat', tujuan: 'Mengundang orang dari tim mana pun, lalu mencatat hasilnya.', coba: true,
      langkah: [
        'Di **Kalender Saya**, tekan **Buat acara**. Bisa juga dari kartu **Acara** di halaman proyek, paket, atau inisiatif, atau ikon kalender di detail task (PIC dan peninjaunya langsung jadi peserta).',
        'Isi judul, tanggal, jam, lalu lokasi atau tautan rapat (Meet/Zoom) bila ada.',
        'Di **Peserta**, centang orangnya, atau tekan **+ RAD**, **+ LNA**, … untuk satu tim sekaligus. Peserta yang sudah punya acara lain di jam itu bertanda kuning.',
        'Centang **Terbuka** untuk acara yang boleh diikuti siapa pun, mis. demo produk atau sharing session. Tanpa itu, acaranya hanya terlihat oleh Anda dan pesertanya.',
        'Tautkan ke proyek, paket, atau inisiatif supaya acaranya tampil di halaman itu, lalu **Simpan**. Peserta mendapat notifikasi dan menjawab hadir atau tidak.',
        'Sesudah rapat, buka acaranya dan tekan **Tulis notulen**. Tambahkan butir tindak lanjut dengan PIC-nya, lalu **Jadikan task** di tiap butir.',
        'Pengingat ProductTrack hanya berbunyi selama aplikasinya terbuka. Untuk pengingat di ponsel, tekan **Google Calendar** atau **Unduh .ics** di detail acara.',
      ],
    },

    {
      id: 'konsep-status', peran: 'konsep', judul: 'Empat status dan labelnya', tujuan: 'Membaca keadaan task sekilas.', ilustrasi: 'status', coba: true,
      langkah: [
        'Setiap task berjalan lewat empat status: **Antre → Dikerjakan → Ditinjau → Selesai**.',
        'Label di sebelahnya dihitung sendiri: **Siap** (boleh dimulai), **Menunggu** (yang ditunggunya belum selesai: fase timnya, serah-terima dari tim lain, atau gerbang Manager), **Revisi** (dikembalikan peninjau), dan **Tertahan** (ada hambatan, disertai alasan).',
        'Yang ditunggu dianggap cukup begitu **diajukan** untuk ditinjau atau **ditandai tertahan**: langkah berikutnya boleh mulai tanpa menunggu tinjauannya atau hambatannya beres. Task yang tertahan sendiri baru bisa lanjut setelah tandanya dilepas, dan **E12** tetap menunggu semua task disetujui.',
        'Task proyek baru **Selesai** setelah disetujui peninjau. Task rutin langsung ditandai selesai oleh PIC-nya.',
      ],
    },
    {
      id: 'konsep-kode', peran: 'konsep', judul: 'Sub-stage dan tim pemilik', tujuan: 'Memahami kode seperti DV8 atau E1 di setiap task.', ilustrasi: 'kode', coba: true,
      langkah: [
        'Setiap task berkode **sub-stage**. Awalannya menunjukkan tahap: **A** Analysis, **D** Design, **DV** Development, **I** Implementation, **E** Evaluation. Kode **R** (R1–R4) untuk pekerjaan rutin di luar proyek. Di chip tim, fasenya ditulis singkat: **Ana**, **Des**, **Dev**, **Imp**, **Eva** (mis. **RAD · Dev**).',
        'Kode menentukan **tim pemilik**: **DAE** Data & AI Engineer, **RAD** Research, Academic & Development, **LNA** Learning & Architecture, **CLO** Content & Learning Operation, dan **MG** Manager. **Ketuk** kode, chip tim, atau label (mis. **Menunggu**) di mana pun: artinya muncul di tempat, dengan tautan ke **Istilah**.',
        'Peninjau: task staff ditinjau Lead-nya, task Lead ditinjau Manager. Kode **A1, A6, D1, I8, dan E12** selalu ditinjau Manager, kecuali task turunan: itu ditinjau Lead yang membaginya.',
        'Daftar sub-stage diatur Lead dan Manager di halaman **Master**: kode baru bisa ditambah, nama, tim pemilik, dan tinjauannya diubah, dan yang tak dipakai lagi dinonaktifkan. Yang belum pernah dipakai task bisa **dihapus**; nomor lain tak bergeser dan kodenya tak dipakai ulang, jadi kode baru melanjutkan dari nomor terbesar (mis. E13).',
        'Kode berwarna biru muda menandai pekerjaan **lepas** warisan v1: pekerjaan produk yang tidak masuk proyek mana pun.',
      ],
    },
    {
      id: 'konsep-tahap', peran: 'konsep', judul: 'ADDIE per tim dan siklus', tujuan: 'Tahu siapa menunggu siapa di sebuah proyek.', ilustrasi: 'tahap', coba: true,
      langkah: [
        'Halaman proyek dibagi per tim: tab **DAE · RAD · LNA · CLO** (tiap tab menulis fase tim itu sekarang), ditambah **Ringkasan**. Tiap tim menjalankan **ADDIE-nya sendiri**: task masuk tab tim pemilik sub-stage-nya.',
        'Fase tim **dihitung**: fase task terbuka tim itu yang paling awal. Urutan ADDIE **fleksibel** secara bawaan: task Development boleh dimulai walau Analysis timnya belum selesai. Yang belum beres tampil sebagai **pengingat** di kartu **Langkah berikutnya** dan di tab Riwayat task, tanpa menahan.',
        'Tim yang berbeda **tidak saling menunggu**, kecuali lewat **serah-terima** yang diatur Lead (mis. input LNA menunggu soal dari RAD). Task Manager di Analysis (A1, A6) adalah **gerbang Manager**; di proyek yang fleksibel gerbang ini juga hanya pengingat. Serah-terima yang diatur dan **E12** tetap menahan.',
        '**Urutan ketat**: Lead atau Manager bisa memilih **Ketatkan urutan ADDIE** di menu **⋯** proyek. Di proyek yang diketatkan, task baru bisa dimulai setelah task timnya di fase lebih awal selesai, dan fase Design dan sesudahnya menunggu gerbang Manager. **Longgarkan urutan ADDIE** mengembalikannya. Keadaannya tertulis di kepala proyek.',
        '**Lead mengatur urutan timnya** lewat tombol **Atur urutan tunggu** (di tab tim atau detail task): task mana yang ditunggu, termasuk dari tim lain, dan apakah ikut urutan fase timnya. Elaborasi paket sudah memasang serah-terima antartim dan urutan alurnya (mis. tayang menunggu QC). Urutan yang membuat task saling menunggu ditolak.',
        'Klik fase di jalur **A D V I E** sebuah tim untuk membuka task fase itu di tab timnya.',
        'Proyek selalu terbuka di **tab tim Anda**; Manager di **Ringkasan**.',
        'Kartu **Perlu perhatian Anda** di atas tab berisi yang menunggu tindakan Anda di proyek itu: tinjauan, revisi, langkah yang siap dibagi ke staff, yang terlambat, dan yang tertahan, masing-masing dengan tombolnya. Fase tanpa task dirapatkan jadi satu baris; **+ Tambah** di sampingnya menambah task di fase itu.',
        '**Hapus task**: di tab tim, buka menu **⋯** lalu pilih **Pilih task untuk dihapus**, centang task-nya (atau **Pilih semua** per fase), lalu **Hapus**. Turunan ikut terhapus bersama induknya. Satu task juga bisa dihapus dari tombol tempat sampah di detail task. Yang boleh: Manager, Lead untuk task timnya, dan staff untuk task yang ia buat sendiri.',
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
        'Buka **Hari Ini**. **Kerjakan sekarang** berisi task yang terlambat dan yang bertenggat hari ini, dengan tombol **Mulai** langsung di barisnya; di bawahnya **7 hari ke depan**. Angka di bawah sapaan bisa diklik untuk melompat ke bagiannya.',
        'Yang belum perlu ditindak dilipat dengan jumlahnya; klik judulnya untuk membuka. **Nanti**: tenggat lebih dari seminggu lagi, atau tanpa tenggat. **Belum bisa dikerjakan**: menunggu task lain, sedang ditinjau, atau tertahan, lengkap dengan alasannya.',
        '**Saya bantu** berisi task orang lain yang melibatkan Anda. Ceklis pengerjaan milik PIC task-nya, jadi ada di task Anda sendiri.',
        'Klik sebuah task untuk membuka detail dan tombol-tombolnya.',
        'Kartu **Agenda saya hari ini** berisi aktivitas pribadi Anda dari **Kalender Saya** (grup Ruang Saya): tambahkan agenda dengan jam, pengulangan, dan pengingat. Hanya Anda yang melihatnya.',
        'Undangan acara (rapat, review, sharing session) dari tim mana pun juga masuk Kalender Saya dan lonceng. Jawab **Hadir**, **Mungkin**, atau **Tidak hadir** di bagian **Menunggu jawaban Anda**.',
        'Bahasa tampilan (Indonesia atau English) dipilih dari menu akun di kanan atas; tersimpan untuk profil Anda.',
      ],
    },
    {
      id: 'staff-ajukan', peran: 'staff', judul: 'Mengerjakan task proyek sampai diajukan', tujuan: 'Menyelesaikan satu langkah proyek lalu mengirimnya ke peninjau.', ilustrasi: 'syarat', coba: true,
      langkah: [
        'Buka task-nya. Kartu **Langkah berikutnya** di atas memberi tahu apa yang perlu dilakukan sekarang. Kalau masih Antre, tekan **Mulai kerjakan** di bilah bawah.',
        'Di tab **Kerjakan**, buka **Hasil kerja** lalu tulis output-nya (mis. "40 soal lolos QC"), lalu tekan **Simpan**.',
        'Kalau ada, tempel tautan hasil kerja (Drive, Sheets, SIADU, …) lalu tekan **Tambah tautan**. Tautan ini opsional.',
        'Centang semua **ceklis pengerjaan**, kalau ada. Bilah **Syarat ajukan** di atasnya terisi satu per satu, dan yang masih kurang tertulis di bawahnya.',
        'Butir ceklis boleh punya **tautan** (opsional), mis. dokumen atau folder kerjanya: isi kolom **Tautan** saat menambah atau mengubah butir ceklis, lalu buka dari ikon di sampingnya.',
        'Setelah lengkap, tombol **Ajukan tinjau ke …** aktif. Tekan, dan task pindah ke Ditinjau.',
      ],
    },
    {
      id: 'staff-revisi', peran: 'staff', judul: 'Task dikembalikan (Revisi)', tujuan: 'Memperbaiki task yang belum disetujui.', ilustrasi: 'revisi', coba: true,
      langkah: [
        'Task yang dikembalikan kembali ke Dikerjakan dengan label **Revisi**.',
        'Alasannya tampil di kartu **Langkah berikutnya**; riwayat lengkapnya di tab **Riwayat**, dan percakapannya di tab **Diskusi**.',
        'Perbaiki hasilnya, perbarui output atau tautannya bila perlu, lalu **Ajukan** lagi.',
      ],
    },
    {
      id: 'staff-tahan', peran: 'staff', judul: 'Menandai task tertahan', tujuan: 'Memberi tahu tim bahwa ada hambatan.', ilustrasi: 'tahan', coba: true,
      langkah: [
        'Di detail task, tekan **Tandai tertahan** dan tulis alasannya, mis. "menunggu akses SIADU".',
        'Task tertahan tampil merah bagi Lead dan Manager, dan ikut terhitung di Dashboard.',
        'Setelah hambatannya beres, tekan **Lepas tanda tertahan**, lalu lanjutkan.',
        'Kalau tenggatnya tak terkejar, tekan **Minta perpanjangan tenggat** di samping tenggat (atau **Minta perpanjangan** di baris terlambat pada Hari Ini), pilih tanggal baru, dan tulis alasannya. Pengajuan langsung ke pemberi task; tenggat baru berlaku setelah disetujui.',
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
        'Di **Task ini untuk apa?**, pilih **Rutin** (kode R) untuk pekerjaan harian, atau **Proyek** bila pekerjaannya bagian dari proyek. Pilih sendiri jenis rutin atau **sub-stage**-nya; tidak ada pilihan bawaan. Sub-stage proyek yang tersedia hanya milik tim Anda; kotak cari muncul bila daftarnya panjang.',
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
        'Ketik **@** untuk menyebut orang (@Kiki) atau peran (@lead, @all atau @semua untuk semua orang). Yang disebut mendapat notifikasi di lonceng.',
        'Arahkan kursor ke pesan (di ponsel: ketuk) untuk memberi reaksi, **membalas** dengan kutipan, atau mengubah dan menghapus pesan sendiri.',
        'Tombol **?** di kotak tulis menandai pesan **perlu jawaban** dari orang yang disebut. Pesan itu ada di **Perlu jawaban** orang itu sampai dibalas atau ditandai beres.',
        'Enter mengirim, Shift+Enter membuat baris baru. Format ringan: **tebal** dengan dua bintang, _miring_ dengan garis bawah.',
        'Di utas task, **balasan cepat** di atas kotak tulis menyesuaikan peran Anda dan status task-nya (di ponsel: tombol kilat). Menekannya hanya menyisipkan teks, jadi masih bisa diubah sebelum dikirim.',
        'Kepala utas memuat aksi utama (Ajukan, Setujui, Kembalikan). **Tarik dari tinjauan** dan **Buka kembali** ada di menu **⋯** dan meminta konfirmasi. **Info task** di bawahnya bisa dibuka untuk output, proyek, dan syarat ajukan.',
        'Tautan Google Sheets, Docs, Slides, Forms, dan Drive tampil sebagai kartu kecil. Beberapa kejadian task berturut-turut (disetujui, dibuka kembali, diajukan) diringkas jadi satu baris; ketuk untuk melihat semuanya.',
      ],
    },
    {
      id: 'staff-minta', peran: 'staff', judul: 'Meminta lanjutan ke tim lain', tujuan: 'Meminta orang lain melanjutkan hasil kerja Anda, dan menjawab permintaan yang masuk.',
      langkah: [
        'Task Anda sudah **diajukan** atau **selesai**, dan hasilnya perlu dilanjutkan orang lain (mis. rancangan selesai, perlu dibuatkan prototype)? Buka detail task-nya, lalu tekan **Minta lanjutan**.',
        'Pilih orangnya (tim mana pun), tulis yang dibutuhkan, saran sub-stage, dan tenggat harapan. Proyek dan tautan ke task Anda ikut terlampir. Lead dan Manager juga bisa meminta dari task timnya.',
        'Permintaan belum jadi task. Penerimanya melihat kartu **Permintaan masuk** di **Hari Ini** dan notifikasi di lonceng. Kalau yang Anda pilih staff, Lead-nya ikut diberi tahu.',
        'Penerima menekan **Terima** (memilih PIC, sub-stage, dan tenggat; task masuk Antre di proyek yang sama dan tertaut ke task Anda), **Tolak** dengan alasan, atau **Tanya** lewat obrolan task asal.',
        'Saat task itu diajukan, yang meninjau adalah Lead tim Anda (tim peminta), bukan Manager. Manager hanya memantau. Pengecualiannya sub-stage yang memang direview Manager, dan permintaan di dalam tim sendiri.',
        'Lead tim penerima bisa **Alihkan** permintaan ke anggota timnya. Permintaan yang 2 hari kerja belum dijawab muncul di **Perlu perhatian** Dashboard.',
        'Status permintaan Anda ada di bagian **Permintaan lanjutan** pada task asal: menunggu, diterima (dengan tautan task barunya), atau ditolak beserta alasannya. Selama belum dijawab Anda bisa **Batalkan**; yang ditolak bisa **Kirim ulang** ke orang lain.',
      ],
    },

    {
      id: 'staff-minta-dae', peran: 'staff', judul: 'Meminta tim DAE membangun sesuatu', tujuan: 'Mengirim permintaan generator, scraper, dashboard, atau lainnya ke tim DAE, lalu meninjau hasilnya.',
      langkah: [
        'Buka proyek yang tim Anda kerjakan, lalu tekan **Minta ke tim DAE** (tombol di bawah judul proyek). Tombolnya hanya ada untuk Lead dan staff tim yang punya task di proyek itu; anggota DAE membuat task biasa, dan Manager hanya mengawasi.',
        'Isi **Yang diminta**, pilih **Jenis** (Generator soal, Scraper, Dashboard, atau Lainnya), tulis **Kebutuhan**, tempel **Bahan riset** satu per baris ("Judul | https://…"), dan **Tenggat yang diharapkan**. Jenis menentukan inisiatif tujuan di DAE; Lead DAE bisa menggantinya.',
        'Permintaan belum jadi task. Lead DAE diberi tahu, lalu **menerima** (jadi task DAE di sebuah inisiatif), **bertanya** (statusnya **Ditanya** sampai Anda membalas; Anda juga bisa **Sunting** permintaannya), atau **menolak** dengan alasan.',
        'Statusnya ada di blok **Permintaan ke tim lain** di halaman proyek Anda: Dikirim → Diterima → Dikerjakan → Ditinjau → Selesai, ditambah Ditanya, Revisi, atau Ditolak, lengkap dengan PIC DAE, tenggat, dan inisiatifnya.',
        'Hasilnya **wajib Anda tinjau**, bukan Lead Anda atau Manager. Saat PIC DAE mengajukan hasilnya, Anda diberi tahu dan task-nya masuk **Hari Ini**; blok permintaan juga punya tombolnya. **Setujui** menyelesaikan task dan permintaan; **Kembalikan untuk revisi** meminta catatan dan mengembalikan task ke PIC DAE, dan bisa berulang.',
        'Kalau Anda tidak aktif lagi, atau ternyata PIC task-nya sendiri, yang meninjau adalah Lead tim Anda, lalu anggota aktif lain tim Anda (yang terlibat di proyek asal didahulukan). Tidak pernah Manager atau Dev. Kalau tim Anda tak punya anggota aktif sama sekali, hasilnya tetap menunggu dengan peringatan, dan Lead DAE serta Manager hanya memantau.',
        'Perpanjangan tenggat untuk task hasil permintaan Anda juga **Anda** yang memutuskan (bukan Manager). Kalau task-nya dihapus, dipulihkan, atau dibuka kembali sesudah Anda setujui, Anda diberi tahu lewat lonceng.',
      ],
    },
    {
      id: 'lead-antrean', peran: 'lead', judul: 'Memecah langkah jadi task turunan', tujuan: 'Membagi pekerjaan langkah yang Anda pegang ke staff tim, atau ke diri sendiri.', ilustrasi: 'antrean', coba: true,
      langkah: [
        'Langkah proyek yang sub-stage-nya milik tim Anda dan sudah bisa dimulai masuk **Kerjakan sekarang** di Hari Ini, bertanda **Siap dibagi**. Tekan **Bagi ke staff** di barisnya (atau di kartu **Perlu perhatian Anda** di halaman proyek): detail task terbuka di bagian **Task turunan**, siap diisi. **Kerjakan sendiri** memulainya tanpa task turunan.',
        'Buka langkahnya. Di bagian **Task turunan**, tulis bagian pekerjaannya, pilih PIC-nya (staff tim, atau **Anda sendiri**) dan tenggat, lalu tekan **Buat task turunan**. Ulangi untuk bagian lain.',
        'Task turunan tampil menjorok di bawah langkah Anda. Yang dipegang staff Anda tinjau; yang Anda pegang sendiri langsung ditandai selesai. Lewat **Ubah task**, PIC langkah utama juga bisa diganti ke Lead atau staff aktif tim Anda, termasuk sesudah dibagi. PIC tiap task turunan tetap masing-masing.',
        'Setelah semua task turunan selesai, PIC langkah utama melengkapi output dan mengajukan ke peninjaunya. Tanpa task turunan pun bisa: kerjakan sendiri lewat **Mulai kerjakan**.',
        'Task tim Anda yang PIC-nya staff (di tahap mana pun, mis. Design) juga bisa Anda bagi dari detail task-nya. Task yang sudah selesai atau sedang ditinjau tak bisa ditambah task turunan; alasannya tampil di bagian itu.',
      ],
    },
    {
      id: 'lead-terima-dae', peran: 'lead', judul: 'Menerima permintaan ke tim DAE (Lead DAE)', tujuan: 'Menjawab permintaan dari tim lain dan mengatur inisiatif tujuannya.',
      langkah: [
        'Buka **Permintaan** (Pekerjaan, di bawah Inisiatif). Lencananya berisi yang **menunggu**. Saringan: Menunggu, Diterima, Ditolak. Permintaan baru juga masuk lonceng.',
        'Pilih permintaan untuk membaca kebutuhan, bahan risetnya, proyek asal, dan diskusinya. Tiga pilihan: **Terima, buat task**, **Tanya dulu**, atau **Tolak**.',
        '**Terima, buat task**: pilih **Masuk ke inisiatif** (terisi dari jenis permintaan, hanya inisiatif Aktif, boleh diganti), **PIC** (anggota DAE), dan **Tenggat** (bawaan: tenggat yang diharapkan). Task DAE masuk Antre sebagai pembaruan inisiatif itu, memuat kebutuhan dan bahan riset, dan tertaut ke permintaan dan proyek asalnya.',
        'Task ini **wajib ditinjau pengirim permintaan**: PIC mengisi output lalu mengajukan, pengirim menyetujui atau mengembalikan untuk revisi. PIC tidak bisa menyetujui task-nya sendiri, dan Manager tidak ikut meninjau. Menghapus task ini mengembalikan permintaan ke Menunggu; memulihkannya (Komunikasi) menautkannya lagi ke permintaan dan tetap ditinjau pengirim, kecuali permintaan itu sudah diterima lagi dengan task lain. Task-nya diberi penanda **Diminta dari <proyek> · <tim>** di halaman inisiatif.',
        '**Tanya dulu**: pertanyaan masuk ke diskusi permintaan dan pengirim diberi tahu. **Tolak**: alasan wajib, pengirim diberi tahu.',
        '**Peta jenis → inisiatif** (tombol di atas daftar) menentukan inisiatif bawaan tiap jenis. Jenis yang belum dipetakan: inisiatifnya dipilih saat menerima. Siapa yang boleh menerima dan memetakan diatur Dev di **Panel Dev → Izin** (bawaannya Lead DAE; Manager tidak pernah, kolomnya tak bisa dicentang). Hanya inisiatif **Aktif** yang bisa dipetakan; inisiatif yang ditunda tidak menerima permintaan.',
      ],
    },
    {
      id: 'lead-tinjau', peran: 'lead', judul: 'Meninjau hasil kerja', tujuan: 'Menyetujui atau mengembalikan task yang diajukan.', ilustrasi: 'tinjau', coba: true,
      langkah: [
        'Task yang menunggu Anda ada di **Kerjakan sekarang** (Hari Ini, bertanda **Tinjau**), di kartu **Perlu perhatian Anda** di halaman proyeknya, dan di **Menunggu tinjauan Anda** (Proyek).',
        'Buka task-nya: di tab **Kerjakan**, **Hasil kerja** dan ceklisnya sudah terbuka untuk diperiksa; percakapannya di tab **Diskusi**.',
        'Tekan **Setujui** kalau sudah benar. Kalau langkah itu bercapaian, progres paketnya ikut naik.',
        'Kalau belum, tekan **Kembalikan** dan tulis yang perlu diperbaiki. Task kembali ke PIC dengan label Revisi.',
        'Task yang lahir dari **permintaan lanjutan** tim Anda (mis. DAE membuat generator dari hasil kerja RAD) ditinjau oleh Anda sebagai Lead tim peminta, bukan oleh Manager atau Lead tim pengerjanya. Manager hanya memantau.',
      ],
    },
    {
      id: 'lead-buat', peran: 'lead', judul: 'Membuat task', tujuan: 'Menambah pekerjaan dengan kode dan PIC yang tepat.', ilustrasi: 'formtask', coba: true,
      langkah: [
        'Tekan **Tambah task**, lalu di **Task ini untuk apa?** pilih **Proyek** atau **Rutin**. Dari halaman proyek, proyeknya sudah terpilih; dari tab tim, **Tambah task di …** langsung memakai jalur Proyek dan hanya menawarkan sub-stage tim dan fase itu.',
        'Pilih proyek dan **sub-stage**-nya (wajib; tidak ada pilihan bawaan). Sub-stage tim Anda di atas; tim lain dilipat di **Sub-stage tim lain**. Tiap baris menyebut fasenya, timnya bila bukan tim Anda, dan bila direview Manager.',
        'Pilih **PIC**: anggota tim Anda, atau Lead tim pemilik kalau sub-stage itu milik tim lain (mis. DV8 Input dipegang Lead LNA).',
        'Kalau PIC-nya staff Anda (atau Anda sendiri) dan Anda memegang task di fase yang sama, pilih **Task induk** supaya task ini menjadi task turunannya.',
        'Isi tenggat dan keterangan (prioritas dan output ada di **Lainnya**), lalu tekan **Tambah task**.',
        'Proyek yang salah dibuat bisa dihapus lewat **Hapus proyek** di menu **⋯** halaman proyeknya (Lead dan Manager). Semua task dan setoran paketnya ikut hilang, jadi ID proyeknya harus diketik ulang; untuk proyek yang sudah selesai, pilih **arsipkan saja**.',
        'Task yang terlanjur ikut terhapus (data real) masih bisa dikembalikan: buka utasnya di **Komunikasi**, lalu tekan **Pulihkan sebagai task rutin**. ID-nya tetap, ceklis dan buktinya ikut, dan boleh langsung ditempel ke inisiatif.',
      ],
    },
    {
      id: 'lead-elaborasi', peran: 'lead', judul: 'Elaborasi rancangan paket jadi proyek', tujuan: 'Mengubah target paket menjadi langkah kerja.', ilustrasi: 'elaborasi', coba: true,
      langkah: [
        'Buka **Rancangan Paket**, pilih paketnya, lalu tekan **Elaborasi jadi proyek**.',
        'Centang target yang dikerjakan; awalnya belum ada yang tercentang (**Centang semua** bila semuanya). Jumlahnya boleh dikecilkan, mis. target 10 tapi proyek ini 5.',
        'Pilih **Alur lengkap per jenis**, lalu coret langkah yang tidak perlu.',
        'Pilih **proyek tujuan** (baru atau yang sudah ada) dan tenggat. Kotak pratinjau menghitung berapa task yang akan dibuat dan untuk siapa saja; tombolnya menulis jumlahnya, mis. **Buat 43 task**.',
        'Langkah-langkahnya masuk tab tim pemiliknya dan dikerjakan menurut fase ADDIE tim itu. Serah-terima antartim (mis. input menunggu soal) dan urutan alurnya (tayang menunggu QC) dipasang otomatis; Lead tim bisa mengubahnya lewat **Atur urutan tunggu**.',
      ],
    },
    {
      id: 'lead-pantau', peran: 'lead', judul: 'Memantau tim', tujuan: 'Melihat beban dan hambatan tim.', ilustrasi: 'bottleneck', coba: true,
      langkah: [
        'Di **Task**, pilih tampilan **Per orang** (ikon di atas daftar) untuk melihat beban tiap anggota tim.',
        'Tab **Terlambat**, **Tertahan**, dan **Tinjauan saya** di atas daftar langsung menyaring task yang perlu ditindak.',
        '**Dashboard** dibuka dengan **Perlu perhatian**: beban di atas kapasitas, pekerjaan yang ditunggu banyak task lain, yang terlambat dan tertahan, masing-masing dengan tombol ke task-nya.',
        '**Laporan** merangkum per minggu atau bulan; **Salin ringkasan** siap ditempel di chat.',
      ],
    },

    {
      id: 'manager-proyek', peran: 'manager', judul: 'Membaca halaman Proyek', tujuan: 'Melihat keadaan semua proyek sekilas.', coba: true,
      langkah: [
        'Setiap baris menunjukkan tim beserta fasenya (mis. **RAD Dev**, **CLO ✓**; ketuk chip-nya untuk artinya), progres siklus, dan keadaannya: Sesuai rencana, Berisiko, Siklus selesai, dan lainnya.',
        'Kotak **Keputusan siklus** berisi proyek yang task E12-nya sudah disetujui.',
        'Klik proyek untuk melihat **Ringkasan** semua tim dan gerbang Manager, lalu tab tiap tim dengan task per fase ADDIE-nya. Peringatan merah muncul kalau ada task yang saling menunggu.',
        '**Hapus proyek** (Manager dan Lead; menu **⋯** di halaman proyek, bersama **Ubah proyek** dan **Duplikat proyek**) menghapus proyek beserta semua task dan setoran paketnya, setelah ID proyeknya diketik ulang. Untuk proyek yang sudah selesai, lebih aman **arsipkan**: semuanya tetap ada dan bisa diaktifkan lagi. Task yang terlanjur terhapus bisa dipulihkan sebagai task rutin dari utasnya di **Komunikasi**.',
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
        '**Perlu perhatian** di paling atas: orang yang memegang task aktif melebihi kapasitas, orang yang pekerjaannya ditunggu 3 task lain atau lebih, task terlambat, task tertahan, dan proyek berisiko. Tiap baris punya tombol untuk melihatnya.',
        'Ubin di bawahnya: task aktif, terlambat, tertahan, menunggu tinjauan, dan selesai 30 hari. Ubin Terlambat dan Tertahan bisa diklik untuk membuka Task yang tersaring.',
        'Tabel **Per orang**: task aktif dari kapasitas, **Ditunggu task lain** (berapa task lain menunggu pekerjaannya selesai), **Menunggu tinjauannya**, terlambat, dan selesai 30 hari. Angka Ditunggu task lain yang tinggi berarti orang itu perlu dibantu, atau pekerjaannya dibagi.',
        'Pembagian per status, tim pemilik, platform, dan proyek per tahap ada di **Rincian lain** (dilipat).',
      ],
    },
    {
      id: 'manager-inisiatif', peran: 'manager', judul: 'Memantau dan menanggapi inisiatif', tujuan: 'Membaca pembaruan pekerjaan berkelanjutan dan memberi tanggapan.',
      langkah: [
        'Buka **Inisiatif**. Di tiap kartu tertulis berapa pembaruan 30 hari terakhir yang **belum Anda tanggapi**.',
        'Di halaman inisiatif, empat angka di atas memberi gambaran cepat: pembaruan 30 hari, commit dan sesi kerja 7 hari (kalau dicatat), dan kapan terakhir diperbarui.',
        'Pembaruan dikelompokkan per hari, terbaru di atas, lengkap dengan ringkasan, angka kerja, dan buktinya. Saringan **Belum ditanggapi** menyisakan yang belum dikomentari siapa pun.',
        'Tekan **Tanggapi** di pembaruannya: pilih **Bagus**, **Perlu dibahas**, atau **Pertanyaan**, tambahkan teks bila perlu, lalu **Kirim tanggapan**. Centang **Perlu jawaban** supaya PIC diminta menjawab (tercentang sendiri untuk Pertanyaan dan Perlu dibahas).',
        'Tanggapan tersimpan di diskusi task pembaruannya: PIC diberi tahu, bisa membalas dari halaman ini, tab Diskusi task, atau Komunikasi. Tanggapan Anda bertanda **Manager**.',
        '**Pembaruan proyek**: task rutin tim DAE yang disambungkan ke sebuah proyek tampil di tab **Pembaruan** halaman proyek itu, dengan linimasa dan **Tanggapi** yang sama. Tab itu bertanda bila ada pembaruan 30 hari terakhir yang belum Anda tanggapi.',
      ],
    },
    {
      id: 'manager-minta-dae', peran: 'manager', judul: 'Mengawasi permintaan ke tim DAE', tujuan: 'Melihat permintaan lintas tim ke DAE tanpa menjadi gerbangnya.',
      langkah: [
        'Buka **Permintaan** untuk melihat semua permintaan ke tim DAE: siapa yang meminta, dari proyek mana, jenisnya, dan statusnya. Di halaman proyek, blok **Permintaan ke tim lain** menampilkan langkahnya.',
        'Anda bisa **Tulis komentar** di permintaan mana pun, juga sesudah diterima. Komentar tidak mengubah status, dan pengirim serta Lead DAE diberi tahu.',
        'Anda **tidak** menerima, bertanya, menolak, atau meninjau: Lead DAE menjawab permintaan, dan hasil kerja DAE ditinjau pengirim permintaannya (Lead tim peminta bila pengirimnya tak aktif). Izin menerima dan memetakan tidak pernah berlaku bagi Anda, berapa pun yang dicentang di **Panel Dev → Izin**. Hasil yang belum punya peninjau aktif muncul di **Hari Ini** Anda sebagai **Menunggu peninjau · dipantau**, hanya untuk dilihat.',
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
        '**Kategori paket**: susun alur langkahnya dan tandai capaiannya berurutan (konten, input, QC, tayang; tak boleh mundur). Satu capaian boleh dipasang di beberapa langkah, mis. semua langkah QC: progresnya naik setelah semua langkah itu selesai. Langkah lain biarkan Tanpa capaian. Urutan langkah diatur dengan menyeret pegangan ≡ atau tombol naik/turun. Kategori baru langsung muncul di form rancangan paket dan di salinan sheet Marsel.',

        'Perubahan tersimpan di spreadsheet v2 dan berlaku bagi semua orang saat aplikasi dimuat ulang.',
      ],
    },
  ];

  const ISTILAH = [
    ['Status', 'Antre, Dikerjakan, Ditinjau, atau Selesai. Hanya empat ini.'],
    ['Label', 'Keadaan yang dihitung dari status: **Siap**, **Menunggu**, **Revisi**, dan **Tertahan**.'],
    ['Sub-stage', 'Kode langkah kerja: A, D, DV, I, dan E di dalam proyek; R untuk rutin. Daftarnya diatur Lead dan Manager di Master.'],
    ['Tim pemilik', 'Tim yang memegang sebuah sub-stage: DAE, RAD, LNA, CLO, atau MG (Manager). Nama dan singkatannya diatur di Master.'],
    ['Antrean tim', 'Langkah proyek yang sudah bisa dimulai, di Hari Ini Lead tim pemiliknya (bertanda **Siap dibagi**): dikerjakan sendiri atau dibagi ke staff lewat task turunan.'],
    ['Task turunan', 'Bagian pekerjaan yang dibuat Lead di bawah task yang ia pegang, untuk staff timnya atau untuk dirinya sendiri (dulu disebut task anak). Tampil menjorok di bawah induknya; yang dipegang staff ditinjau Lead itu. Induknya baru bisa diajukan setelah semua turunannya selesai.'],
    ['Syarat ajukan', 'Syarat sebelum task proyek diajukan: output, ceklis, task turunan (kalau ada), task yang ditunggu sudah diajukan, tertahan, atau selesai, dan tidak tertahan.'],
    ['Serah-terima', 'Task yang diatur menunggu task lain, juga dari tim lain. Begitu task yang ditunggu diajukan untuk ditinjau atau ditandai tertahan, task berikutnya sudah bisa mulai sejajar; E12 tetap menunggu semuanya disetujui.'],
    ['Peninjau', 'Yang menyetujui task proyek: Lead untuk task staff-nya (termasuk task turunan), Manager untuk task Lead dan kode bertanda Manager. Task hasil permintaan ke tim DAE ditinjau pengirim permintaannya (cadangannya Lead tim peminta, lalu anggota aktif lain tim itu); Manager hanya memantau.'],
    ['Permintaan ke tim DAE', 'Permintaan dari anggota tim lain (lewat **Minta ke tim DAE** di halaman proyek) agar DAE membangun generator soal, scraper, dashboard, atau lainnya. Lead DAE menerimanya jadi task di sebuah inisiatif, bertanya, atau menolak; hasilnya ditinjau pengirim. Dikelola di halaman **Permintaan**; Manager hanya mengawasi.'],
    ['Jalur', '**Proyek** (ADDIE per tim), **rutin** (kode R), atau **lepas** (kode ADDIE di luar proyek, warisan v1). Di form Tambah task dipilih lewat **Task ini untuk apa?**, ditambah **Pembaruan** untuk pembaruan inisiatif atau proyek (tim DAE dan Manager).'],
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
    ['Inisiatif', 'Pekerjaan berkelanjutan di luar rancangan paket (mis. ProductTrack v2), sementara khusus tim DAE dan Manager. Dideklarasikan sekali; tiap pembaruannya task biasa tanpa tinjauan yang tetap terhitung di Hari Ini, beban, dan Laporan.'],
    ['Pembaruan proyek', 'Task rutin yang disambungkan ke proyek yang berjalan terus, lewat **Pembaruan untuk** di form Tambah task atau di detail task-nya. Tetap rutin: tanpa tinjauan dan tak menggeser fase, progres, atau E12. Tampil di tab **Pembaruan** proyeknya, tempat Manager menanggapi. Sementara khusus tim DAE dan Manager.'],
    ['Izin', 'Daftar apa yang boleh dilakukan Manager, Lead, dan Staff, mis. membuat proyek, menghapus paket, atau membuka Laporan. Diatur mode Dev di Panel Dev → Izin dengan centang per peran; yang mengikuti struktur tim dan alur tinjauan tetap.'],
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
        // Utamakan yang sedang dikerjakan tapi output-nya belum ada; kalau tak ada, yang siap dimulai.
        const kurang = t => I.syaratAjukan(t, perId).some(s => !s.ok && s.kunci === 'output');
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
      case 'mulai-acara': return { view: 'agenda', ket: 'Kalender Saya' };

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
