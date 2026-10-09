-- =============================================================================
--  produk_base_v2.sql — tabel ProductTrack v2 di skema MySQL `produk_base`
--
--  Keputusan user (2026-10-09): v2 memakai skema yang sudah ada, tanpa skema baru.
--  Hak produk_db di produk_base sudah ALL PRIVILEGES, jadi tak perlu meminta apa pun
--  ke tim IT. Server: Cloud SQL MySQL 8.0.41, lower_case_table_names = 0 (nama tabel
--  peka huruf besar-kecil), sql_mode memuat IGNORE_SPACE dan STRICT_TRANS_TABLES.
--
--  1. AWALAN v2_. Di produk_base masih ada 18 tabel salinan v1 (tarikan 2 Okt 2026:
--     tasks, comments, packages, ...). Enam namanya sama dengan koleksi v2. Dengan
--     awalan, keduanya hidup berdampingan dan tak ada yang perlu dihapus sekarang.
--     Alat v1 (scripts/migrasi/muat.js --ulang di repo v1) mengosongkan tabel v1
--     MENURUT NAMA — tanpa awalan, alat itu akan menyapu data v2. Tabel salinan v1
--     boleh dihapus kapan saja (sumber kebenarannya spreadsheet v1), tapi itu
--     keputusan terpisah dan tidak dilakukan berkas ini.
--
--  2. SATU KOLEKSI = SATU TABEL, KOLOM = NAMA FIELD. Prinsip yang sama dengan
--     api/_skema.js untuk spreadsheet: pemetaannya terbaca sekilas. Larik bersarang
--     (subtasks, comments, tinjauan, evidence, items, links, history) jadi tabel
--     anak dengan kolom induknya.
--
--  3. SELALU PAKAI BACKTICK. Beberapa nama field adalah kata kunci MySQL: `by`
--     (selalu), `lead` (fungsi jendela sejak 8.0), dan `user` (nama fungsi; jadi
--     kata tercadang karena sql_mode IGNORE_SPACE). Lapisan data harus mengutip
--     setiap nama kolom, bukan hanya yang ini.
--
--  4. WAKTU DATETIME(3) dalam UTC (aplikasi: milidetik); TANGGAL DATE ('YYYY-MM-DD').
--     Nilai kosong aplikasi ('' atau 0) disimpan NULL. Angka seri dan zona waktu
--     adalah sumber kerumitan terbesar migrasi v1; tipe ini menutup keduanya.
--
--  5. `urutan` di koleksi yang urutannya hanya ditentukan posisi di larik
--     (sub-task, bukti, tautan, dashboard, catatan). Proyek dan task diurutkan
--     lewat nomor ID dan waktu dibuat.
--
--  6. `_diubah` diisi server sendiri (ON UPDATE), bukan field aplikasi. Gunanya
--     menarik perubahan sejak waktu tertentu tanpa memuat ulang semuanya.
--
--  7. ID dibuat SERVER, bukan browser. Di prototipe, ID task baru = nomor terbesar
--     + 1 di data browser masing-masing; dengan data bersama, dua orang yang
--     menambah task bersamaan akan mendapat ID yang sama. Tabel ini tak memakai
--     AUTO_INCREMENT untuk ID aplikasi supaya bentuk PRD-123 / PRJ-12 / PKG-001
--     tetap; nomornya ditentukan lapisan data di dalam kunci tulis.
--
--  8. `v2_meta` = penanda pemilik, padanan tab `_meta` di spreadsheet v2. Lapisan
--     data menolak menulis ke skema yang tak memuat app = producttrack-v2.
--
--  Aman dijalankan berulang (IF NOT EXISTS). Tidak ada DROP di berkas ini.
-- =============================================================================

USE produk_base;

SET FOREIGN_KEY_CHECKS = 0;


-- =============================================================================
--  PENANDA & ORANG
-- =============================================================================

CREATE TABLE IF NOT EXISTS `v2_meta` (
  `kunci`  VARCHAR(64) NOT NULL,
  `nilai`  TEXT        NOT NULL,
  `_diubah` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`kunci`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

INSERT INTO `v2_meta` (`kunci`, `nilai`) VALUES
  ('app', 'producttrack-v2'),
  ('skema', '1')
ON DUPLICATE KEY UPDATE `kunci` = `kunci`;

-- Organogram yang diubah atau ditambah di mode Dev (tab `orang`). Organogram
-- bawaan ada di public/inti.js (ORANG_BAWAAN); baris di sini menimpanya per id.
CREATE TABLE IF NOT EXISTS `v2_orang` (
  `id`         VARCHAR(64)  NOT NULL,
  `nama`       VARCHAR(150) NOT NULL DEFAULT '',
  `pendek`     VARCHAR(64)  NOT NULL DEFAULT '',
  `peran`      VARCHAR(20)  NOT NULL DEFAULT '',
  `jabatan`    VARCHAR(150) NOT NULL DEFAULT '',
  `lead`       VARCHAR(64)  NOT NULL DEFAULT '',
  `tim`        VARCHAR(10)  NOT NULL DEFAULT '',
  `aktif`      BOOLEAN      NOT NULL DEFAULT TRUE,
  `diperbarui` DATETIME(3)  NULL,
  `_diubah`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- PIN profil: hanya dibaca server, tak pernah dikirim ke browser. hash = scrypt(PIN, garam).
CREATE TABLE IF NOT EXISTS `v2_pin` (
  `orang`      VARCHAR(64) NOT NULL,
  `hash`       CHAR(64)    NOT NULL,
  `garam`      CHAR(32)    NOT NULL,
  `diperbarui` DATETIME(3) NULL,
  `_diubah`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`orang`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Foto profil: data URL JPEG kecil (Inti.FOTO_MAKS karakter). Satu baris per orang.
CREATE TABLE IF NOT EXISTS `v2_foto` (
  `orang`      VARCHAR(64) NOT NULL,
  `gambar`     MEDIUMTEXT  NOT NULL,
  `diperbarui` DATETIME(3) NULL,
  `_diubah`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`orang`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Halaman Master: satu baris per isian daftar pilihan yang diubah. `data` = sisa
-- isiannya (nama, tim, alur, bobot, ...). Kunci tak pernah diganti, hanya dinonaktifkan;
-- urutan pecahan supaya bisa digeser tanpa menomori ulang semuanya.
CREATE TABLE IF NOT EXISTS `v2_master` (
  `jenis`      VARCHAR(40)  NOT NULL,
  `kunci`      VARCHAR(100) NOT NULL,
  `data`       JSON         NOT NULL DEFAULT (JSON_OBJECT()),
  `aktif`      BOOLEAN      NOT NULL DEFAULT TRUE,
  `urutan`     DOUBLE       NOT NULL DEFAULT 0,
  `diperbarui` DATETIME(3)  NULL,
  `_diubah`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`jenis`, `kunci`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;


-- =============================================================================
--  RANCANGAN PAKET
-- =============================================================================

CREATE TABLE IF NOT EXISTS `v2_packages` (
  `id`         VARCHAR(64)  NOT NULL,
  `platform`   VARCHAR(100) NOT NULL DEFAULT '',
  `program`    VARCHAR(200) NOT NULL DEFAULT '',
  `namaPaket`  VARCHAR(300) NOT NULL DEFAULT '',
  `produkPic`  VARCHAR(150) NOT NULL DEFAULT '',
  `dibimbing`  TEXT         NULL,
  `latsol`     TEXT         NULL,
  `materi`     TEXT         NULL,
  `tryout`     TEXT         NULL,
  `drilling`   TEXT         NULL,
  `liveClass`  TEXT         NULL,
  `catatan`    TEXT         NULL,
  `mirror`     BOOLEAN      NOT NULL DEFAULT FALSE,
  `marselPic`  VARCHAR(150) NOT NULL DEFAULT '',
  `tagline`    TEXT         NULL,
  `benefit`    TEXT         NULL,
  `tanggal`    VARCHAR(100) NOT NULL DEFAULT '',
  `tujuan`     TEXT         NULL,
  `updatedBy`  VARCHAR(64)  NOT NULL DEFAULT '',
  `updatedAt`  DATETIME(3)  NULL,
  `_diubah`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Target paket (slot). Menghapus paket membawa serta targetnya.
CREATE TABLE IF NOT EXISTS `v2_package_items` (
  `id`         VARCHAR(64)   NOT NULL,
  `paket`      VARCHAR(64)   NOT NULL,
  `urutan`     DOUBLE        NOT NULL DEFAULT 0,
  `kategori`   VARCHAR(100)  NOT NULL DEFAULT '',
  `grup`       VARCHAR(200)  NOT NULL DEFAULT '',
  `nama`       VARCHAR(300)  NOT NULL DEFAULT '',
  `target`     DECIMAL(14,2) NOT NULL DEFAULT 0,
  `satuan`     VARCHAR(50)   NOT NULL DEFAULT '',
  `awal`       DECIMAL(14,2) NOT NULL DEFAULT 0,
  `catatan`    TEXT          NULL,
  `_diubah`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ix_item_paket` (`paket`, `urutan`),
  CONSTRAINT `fk_v2_item_paket` FOREIGN KEY (`paket`) REFERENCES `v2_packages` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `v2_package_links` (
  `id`         VARCHAR(64)   NOT NULL,
  `paket`      VARCHAR(64)   NOT NULL,
  `urutan`     DOUBLE        NOT NULL DEFAULT 0,
  `label`      VARCHAR(300)  NOT NULL DEFAULT '',
  `url`        VARCHAR(2048) NOT NULL DEFAULT '',
  `_diubah`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ix_link_paket` (`paket`, `urutan`),
  CONSTRAINT `fk_v2_link_paket` FOREIGN KEY (`paket`) REFERENCES `v2_packages` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;


-- =============================================================================
--  PROYEK
-- =============================================================================

CREATE TABLE IF NOT EXISTS `v2_projects` (
  `id`         VARCHAR(64)  NOT NULL,
  `name`       VARCHAR(300) NOT NULL DEFAULT '',
  `platform`   VARCHAR(100) NOT NULL DEFAULT '',
  `stage`      VARCHAR(2)   NOT NULL DEFAULT 'A',
  `cycle`      INT          NOT NULL DEFAULT 1,
  `decision`   VARCHAR(20)  NOT NULL DEFAULT '',
  `goal`       TEXT         NULL,
  `lead`       VARCHAR(64)  NOT NULL DEFAULT '',
  `arsip`      BOOLEAN      NOT NULL DEFAULT FALSE,
  `paket`      VARCHAR(64)  NULL,
  `_diubah`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ix_proyek_paket` (`paket`),
  CONSTRAINT `fk_v2_proyek_paket` FOREIGN KEY (`paket`) REFERENCES `v2_packages` (`id`) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Riwayat tahap proyek (project.history). Di prototipe hanya ada di browser.
CREATE TABLE IF NOT EXISTS `v2_project_history` (
  `id`         BIGINT       NOT NULL AUTO_INCREMENT,
  `project`    VARCHAR(64)  NOT NULL,
  `jenis`      VARCHAR(20)  NOT NULL DEFAULT '',
  `dari`       VARCHAR(2)   NOT NULL DEFAULT '',
  `ke`         VARCHAR(2)   NOT NULL DEFAULT '',
  `siklus`     INT          NOT NULL DEFAULT 1,
  `oleh`       VARCHAR(64)  NOT NULL DEFAULT '',
  `at`         DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_histori_proyek` (`project`, `at`),
  CONSTRAINT `fk_v2_histori_proyek` FOREIGN KEY (`project`) REFERENCES `v2_projects` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;


-- =============================================================================
--  TASK
-- =============================================================================

-- project NULL = jalur rutin (di aplikasi ''). induk = task anak (satu tingkat).
-- support dan deps adalah larik ID; disimpan JSON karena aplikasi memakainya utuh.
CREATE TABLE IF NOT EXISTS `v2_tasks` (
  `id`             VARCHAR(64)  NOT NULL,
  `project`        VARCHAR(64)  NULL,
  `lane`           VARCHAR(20)  NOT NULL DEFAULT '',
  `kategori`       VARCHAR(100) NOT NULL DEFAULT '',
  `title`          VARCHAR(500) NOT NULL DEFAULT '',
  `platform`       VARCHAR(100) NOT NULL DEFAULT '',
  `stage`          VARCHAR(2)   NOT NULL DEFAULT '',
  `sub`            VARCHAR(10)  NOT NULL DEFAULT '',
  `detail`         TEXT         NULL,
  `pic`            VARCHAR(64)  NOT NULL DEFAULT '',
  `support`        JSON         NOT NULL DEFAULT (JSON_ARRAY()),
  `priority`       VARCHAR(20)  NOT NULL DEFAULT 'Normal',
  `start`          DATE         NULL,
  `due`            DATE         NULL,
  `status`         VARCHAR(20)  NOT NULL DEFAULT 'Antre',
  `tertahan`       BOOLEAN      NOT NULL DEFAULT FALSE,
  `alasanTertahan` VARCHAR(500) NOT NULL DEFAULT '',
  `output`         TEXT         NULL,
  `deps`           JSON         NOT NULL DEFAULT (JSON_ARRAY()),
  `notes`          TEXT         NULL,
  `assignedBy`     VARCHAR(64)  NOT NULL DEFAULT '',
  `cycle`          INT          NOT NULL DEFAULT 1,
  `createdAt`      DATETIME(3)  NULL,
  `updatedAt`      DATETIME(3)  NULL,
  `selesaiAt`      DATETIME(3)  NULL,
  `induk`          VARCHAR(64)  NULL,
  `_diubah`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ix_task_proyek` (`project`, `cycle`, `stage`),
  KEY `ix_task_pic` (`pic`, `status`),
  KEY `ix_task_status_due` (`status`, `due`),
  KEY `ix_task_induk` (`induk`),
  KEY `ix_task_diubah` (`_diubah`),
  CONSTRAINT `fk_v2_task_proyek` FOREIGN KEY (`project`) REFERENCES `v2_projects` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_v2_task_induk` FOREIGN KEY (`induk`) REFERENCES `v2_tasks` (`id`) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `v2_subtasks` (
  `id`         VARCHAR(64)  NOT NULL,
  `task`       VARCHAR(64)  NOT NULL,
  `urutan`     INT          NOT NULL DEFAULT 0,
  `title`      VARCHAR(500) NOT NULL DEFAULT '',
  `pic`        VARCHAR(64)  NOT NULL DEFAULT '',
  `due`        DATE         NULL,
  `done`       BOOLEAN      NOT NULL DEFAULT FALSE,
  `_diubah`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ix_subtask_task` (`task`, `urutan`),
  CONSTRAINT `fk_v2_subtask_task` FOREIGN KEY (`task`) REFERENCES `v2_tasks` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Komentar task hasil impor v1. Pesan Komunikasi baru ada di v2_obrolan.
CREATE TABLE IF NOT EXISTS `v2_comments` (
  `id`         VARCHAR(64) NOT NULL,
  `task`       VARCHAR(64) NOT NULL,
  `author`     VARCHAR(64) NOT NULL DEFAULT '',
  `text`       TEXT        NOT NULL DEFAULT (''),
  `at`         DATETIME(3) NULL,
  `_diubah`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ix_komentar_task` (`task`, `at`),
  CONSTRAINT `fk_v2_komentar_task` FOREIGN KEY (`task`) REFERENCES `v2_tasks` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Riwayat tinjauan: ajukan, setujui, kembalikan, ... `by` = kata kunci MySQL: kutip selalu.
CREATE TABLE IF NOT EXISTS `v2_tinjauan` (
  `id`         VARCHAR(64) NOT NULL,
  `task`       VARCHAR(64) NOT NULL,
  `by`         VARCHAR(64) NOT NULL DEFAULT '',
  `action`     VARCHAR(30) NOT NULL DEFAULT '',
  `note`       TEXT        NULL,
  `at`         DATETIME(3) NULL,
  `_diubah`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ix_tinjauan_task` (`task`, `at`),
  CONSTRAINT `fk_v2_tinjauan_task` FOREIGN KEY (`task`) REFERENCES `v2_tasks` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Tautan bukti output (syarat ajukan: minimal satu).
CREATE TABLE IF NOT EXISTS `v2_evidence` (
  `id`         VARCHAR(64)   NOT NULL,
  `task`       VARCHAR(64)   NOT NULL,
  `urutan`     INT           NOT NULL DEFAULT 0,
  `label`      VARCHAR(300)  NOT NULL DEFAULT '',
  `url`        VARCHAR(2048) NOT NULL DEFAULT '',
  `_diubah`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ix_bukti_task` (`task`, `urutan`),
  CONSTRAINT `fk_v2_bukti_task` FOREIGN KEY (`task`) REFERENCES `v2_tasks` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Setoran: task → target paket, dihitung saat task (langkah) itu disetujui.
-- Target atau paket dihapus → setorannya ikut hilang. Task dihapus → setoran tetap,
-- task-nya NULL (jejak bahwa pekerjaan itu pernah ada, seperti aturan v1).
CREATE TABLE IF NOT EXISTS `v2_setoran` (
  `id`         VARCHAR(128)  NOT NULL,
  `paket`      VARCHAR(64)   NOT NULL,
  `item`       VARCHAR(64)   NOT NULL,
  `task`       VARCHAR(64)   NULL,
  `jumlah`     DECIMAL(14,2) NOT NULL DEFAULT 0,
  `tahap`      VARCHAR(20)   NOT NULL DEFAULT '',
  `batch`      VARCHAR(64)   NOT NULL DEFAULT '',
  `catatan`    TEXT          NULL,
  `_diubah`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ix_setoran_item` (`item`),
  KEY `ix_setoran_task` (`task`),
  KEY `ix_setoran_paket` (`paket`),
  CONSTRAINT `fk_v2_setoran_paket` FOREIGN KEY (`paket`) REFERENCES `v2_packages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_v2_setoran_item` FOREIGN KEY (`item`) REFERENCES `v2_package_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_v2_setoran_task` FOREIGN KEY (`task`) REFERENCES `v2_tasks` (`id`) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;


-- =============================================================================
--  RUANG SAYA & TAUTAN TIM
-- =============================================================================

-- Tautan tim (dulu "Dashboard Lain").
CREATE TABLE IF NOT EXISTS `v2_dashboards` (
  `id`         VARCHAR(64)   NOT NULL,
  `urutan`     INT           NOT NULL DEFAULT 0,
  `title`      VARCHAR(300)  NOT NULL DEFAULT '',
  `deskripsi`  TEXT          NULL,
  `icon`       VARCHAR(50)   NOT NULL DEFAULT '',
  `url`        VARCHAR(2048) NOT NULL DEFAULT '',
  `_diubah`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Link Saya. `user` = kata tercadang karena IGNORE_SPACE: kutip selalu.
CREATE TABLE IF NOT EXISTS `v2_links` (
  `id`         VARCHAR(64)   NOT NULL,
  `user`       VARCHAR(64)   NOT NULL,
  `urutan`     INT           NOT NULL DEFAULT 0,
  `folder`     VARCHAR(150)  NOT NULL DEFAULT '',
  `title`      VARCHAR(300)  NOT NULL DEFAULT '',
  `url`        VARCHAR(2048) NOT NULL DEFAULT '',
  `_diubah`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ix_link_user` (`user`, `folder`, `urutan`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Catatan Saya. Di prototipe catatan sengaja hanya di browser (pilihan user); tabel ini
-- disiapkan, tapi apakah catatan ikut tersimpan di server tetap keputusan terpisah.
CREATE TABLE IF NOT EXISTS `v2_notes` (
  `id`         VARCHAR(64)  NOT NULL,
  `user`       VARCHAR(64)  NOT NULL,
  `urutan`     INT          NOT NULL DEFAULT 0,
  `folder`     VARCHAR(150) NOT NULL DEFAULT '',
  `title`      VARCHAR(300) NOT NULL DEFAULT '',
  `body`       MEDIUMTEXT   NULL,
  `updatedAt`  DATETIME(3)  NULL,
  `_diubah`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ix_catatan_user` (`user`, `folder`, `urutan`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;


-- =============================================================================
--  RIWAYAT & KOMUNIKASI (hanya bertambah)
-- =============================================================================

-- Riwayat Aktivitas. Di browser dipotong 1.000 terbaru; di sini disimpan semua dan
-- tak pernah dihapus aplikasi. `task` = label teks ("PRD-123 · judul"), bukan kunci asing.
CREATE TABLE IF NOT EXISTS `v2_log` (
  `id`         VARCHAR(64)  NOT NULL,
  `type`       VARCHAR(20)  NOT NULL DEFAULT '',
  `task`       VARCHAR(600) NOT NULL DEFAULT '',
  `detail`     TEXT         NULL,
  `by`         VARCHAR(64)  NOT NULL DEFAULT '',
  `at`         DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_log_at` (`at`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Komunikasi bersama: satu baris = satu peristiwa (pesan, ubah, hapus, reaksi, lepas,
-- beres, moderasi). id dan `at` diberikan server. Keadaan akhir disusun Inti.susunObrolan.
CREATE TABLE IF NOT EXISTS `v2_obrolan` (
  `id`         VARCHAR(64)  NOT NULL,
  `jenis`      VARCHAR(20)  NOT NULL,
  `ruang`      VARCHAR(100) NOT NULL,
  `oleh`       VARCHAR(64)  NOT NULL,
  `at`         DATETIME(3)  NOT NULL,
  `teks`       TEXT         NULL,
  `target`     VARCHAR(64)  NOT NULL DEFAULT '',
  `kode`       VARCHAR(40)  NOT NULL DEFAULT '',
  `tanya`      JSON         NOT NULL DEFAULT (JSON_ARRAY()),
  `judul`      VARCHAR(300) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `ix_obrolan_at` (`at`),
  KEY `ix_obrolan_ruang` (`ruang`, `at`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;


SET FOREIGN_KEY_CHECKS = 1;

-- Periksa: harus 21 tabel berawalan v2_ dan penanda app = producttrack-v2.
SELECT COUNT(*) AS tabel_v2
  FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = 'produk_base' AND TABLE_NAME LIKE 'v2\_%';
SELECT `kunci`, `nilai` FROM `v2_meta`;
