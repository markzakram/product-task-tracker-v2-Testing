-- ProductTrack: skema MySQL produk_base, nama tabel tanpa awalan versi.
-- Keputusan user 28 Oktober 2026: ganti tabel lama setelah backup terverifikasi.
-- Berkas ini hanya membuat struktur; penggantian awal adalah perintah terpisah.
-- Field aplikasi utuh disimpan di _payload oleh migration runtime.

USE produk_base;

SET FOREIGN_KEY_CHECKS = 0;


-- =============================================================================
--  PENANDA & ORANG
-- =============================================================================

CREATE TABLE IF NOT EXISTS `meta` (
  `kunci`  VARCHAR(64) NOT NULL,
  `nilai`  TEXT        NOT NULL,
  `_diubah` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`kunci`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

INSERT INTO `meta` (`kunci`, `nilai`) VALUES
  ('app', 'producttrack-v2'),
  ('skema', '1')
ON DUPLICATE KEY UPDATE `kunci` = `kunci`;

-- Organogram yang diubah atau ditambah di mode Dev (tab `orang`). Organogram
-- bawaan ada di public/inti.js (ORANG_BAWAAN); baris di sini menimpanya per id.
CREATE TABLE IF NOT EXISTS `orang` (
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
CREATE TABLE IF NOT EXISTS `pin` (
  `orang`      VARCHAR(64) NOT NULL,
  `hash`       CHAR(64)    NOT NULL,
  `garam`      CHAR(32)    NOT NULL,
  `diperbarui` DATETIME(3) NULL,
  `_diubah`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`orang`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Foto profil: data URL JPEG kecil (Inti.FOTO_MAKS karakter). Satu baris per orang.
CREATE TABLE IF NOT EXISTS `foto` (
  `orang`      VARCHAR(64) NOT NULL,
  `gambar`     MEDIUMTEXT  NOT NULL,
  `diperbarui` DATETIME(3) NULL,
  `_diubah`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`orang`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Tampilan pribadi & status (2.21.0): satu baris per orang. `setelan` = aksen, latar,
-- kepadatan, ukuran huruf, halaman awal, status ber-emoji, sampulAt. `sampul` = data URL
-- gambar sampul (Inti.SAMPUL_MAKS karakter), dibaca terpisah dari setelan.
CREATE TABLE IF NOT EXISTS `tampilan` (
  `orang`      VARCHAR(64) NOT NULL,
  `setelan`    JSON        NOT NULL DEFAULT (JSON_OBJECT()),
  `diperbarui` DATETIME(3) NULL,
  `sampul`     MEDIUMTEXT  NULL,
  `_diubah`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`orang`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Halaman Master: satu baris per isian daftar pilihan yang diubah. `data` = sisa
-- isiannya (nama, tim, alur, bobot, ...). Kunci tak pernah diganti, hanya dinonaktifkan;
-- urutan pecahan supaya bisa digeser tanpa menomori ulang semuanya.
CREATE TABLE IF NOT EXISTS `master` (
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

CREATE TABLE IF NOT EXISTS `packages` (
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
  `daftarBuka` DATE         NULL,
  `daftarTutup` DATE        NULL,
  `updatedBy`  VARCHAR(64)  NOT NULL DEFAULT '',
  `updatedAt`  DATETIME(3)  NULL,
  `_diubah`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Target paket (slot). Menghapus paket membawa serta targetnya.
CREATE TABLE IF NOT EXISTS `package_items` (
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
  CONSTRAINT `fk_item_paket` FOREIGN KEY (`paket`) REFERENCES `packages` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `package_links` (
  `id`         VARCHAR(64)   NOT NULL,
  `paket`      VARCHAR(64)   NOT NULL,
  `urutan`     DOUBLE        NOT NULL DEFAULT 0,
  `label`      VARCHAR(300)  NOT NULL DEFAULT '',
  `url`        VARCHAR(2048) NOT NULL DEFAULT '',
  `_diubah`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ix_link_paket` (`paket`, `urutan`),
  CONSTRAINT `fk_link_paket` FOREIGN KEY (`paket`) REFERENCES `packages` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;


-- =============================================================================
--  PROYEK
-- =============================================================================

-- jenis (2.51.0): 'umum' = Proyek umum (tanpa ADDIE dan rancangan paket), kosong = proyek ADDIE.
-- timProyek = kode tim terlibat dipisah koma (pemilik dulu); tahapUmum = JSON [{id, nama}]; tenggat proyek.
-- penutupan (2.52.0) = JSON {status, oleh, at, catatan, peninjau, jawabAt, alasan}: penutupan Proyek umum ditinjau Manager.
-- ketat (2.43.0): urutan ADDIE proyek diketatkan; fase dan gerbang Manager kembali menahan.
-- Bawaannya FALSE: fase dan gerbang hanya pengingat.
CREATE TABLE IF NOT EXISTS `projects` (
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
  `ketat`      BOOLEAN      NOT NULL DEFAULT FALSE,
  `jenis`      VARCHAR(10)  NOT NULL DEFAULT '',
  `timProyek`  VARCHAR(100) NOT NULL DEFAULT '',
  `tahapUmum`  JSON         NULL,
  `tenggat`    DATE         NULL,
  `penutupan`  JSON         NULL,
  `_diubah`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ix_proyek_paket` (`paket`),
  CONSTRAINT `fk_proyek_paket` FOREIGN KEY (`paket`) REFERENCES `packages` (`id`) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Riwayat tahap proyek (project.history). Di prototipe hanya ada di browser.
CREATE TABLE IF NOT EXISTS `project_history` (
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
  CONSTRAINT `fk_histori_proyek` FOREIGN KEY (`project`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;


-- =============================================================================
--  INISIATIF (2.31.0)
-- =============================================================================

-- Pekerjaan berkelanjutan di luar rancangan paket dan siklus ADDIE (mis. ProductTrack v2).
-- Tiap pembaruannya task biasa di jalur rutin yang menaut lewat tasks.inisiatif.
CREATE TABLE IF NOT EXISTS `inisiatif` (
  `id`         VARCHAR(64)  NOT NULL,
  `nama`       VARCHAR(200) NOT NULL DEFAULT '',
  `tujuan`     TEXT         NULL,
  `tim`        VARCHAR(10)  NOT NULL DEFAULT '',
  `pic`        VARCHAR(64)  NOT NULL DEFAULT '',
  `status`     VARCHAR(20)  NOT NULL DEFAULT 'aktif',
  `createdBy`  VARCHAR(64)  NOT NULL DEFAULT '',
  `createdAt`  DATETIME(3)  NULL,
  `updatedBy`  VARCHAR(64)  NOT NULL DEFAULT '',
  `updatedAt`  DATETIME(3)  NULL,
  `menerima`   JSON         NOT NULL DEFAULT (JSON_ARRAY()),   -- jenis permintaan ke tim DAE yang diterima inisiatif ini (2.46.0)
  `induk`      VARCHAR(64)  NOT NULL DEFAULT '',              -- kosong = akar Pengembangan (2.47.0)
  `_diubah`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ix_inisiatif_tim` (`tim`, `status`),
  KEY `ix_inisiatif_induk` (`induk`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `inisiatif_links` (
  `id`         VARCHAR(64)   NOT NULL,
  `inisiatif`  VARCHAR(64)   NOT NULL,
  `urutan`     DOUBLE        NOT NULL DEFAULT 0,
  `label`      VARCHAR(300)  NOT NULL DEFAULT '',
  `url`        VARCHAR(2048) NOT NULL DEFAULT '',
  `_diubah`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ix_link_inisiatif` (`inisiatif`, `urutan`),
  CONSTRAINT `fk_link_inisiatif` FOREIGN KEY (`inisiatif`) REFERENCES `inisiatif` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;


-- =============================================================================
--  PERMINTAAN LANJUTAN (2.36.0)
-- =============================================================================

-- Dari task asal (sumber) yang sudah diajukan atau selesai, satu orang diminta mengerjakan
-- lanjutannya. Diterima = task baru (kolom task); ditolak = alasan. Tak pernah dihapus, dan tanpa
-- foreign key ke tasks: task asal boleh dihapus tanpa menghapus jejak permintaannya.
CREATE TABLE IF NOT EXISTS `permintaan` (
  `id`           VARCHAR(64)   NOT NULL,
  `sumber`       VARCHAR(64)   NOT NULL,
  `dari`         VARCHAR(64)   NOT NULL,
  `ke`           VARCHAR(64)   NOT NULL,
  `judul`        VARCHAR(200)  NOT NULL DEFAULT '',
  `rincian`      TEXT          NULL,
  `sub`          VARCHAR(16)   NOT NULL DEFAULT '',
  `due`          DATE          NULL,
  `status`       VARCHAR(20)   NOT NULL DEFAULT 'menunggu',
  `alasan`       TEXT          NULL,
  `task`         VARCHAR(64)   NOT NULL DEFAULT '',
  `oleh`         VARCHAR(64)   NOT NULL DEFAULT '',
  `dialihkan`    VARCHAR(64)   NOT NULL DEFAULT '',
  `dialihkanAt`  DATETIME(3)   NULL,
  `createdAt`    DATETIME(3)   NULL,
  `jawabAt`      DATETIME(3)   NULL,
  `updatedAt`    DATETIME(3)   NULL,
  `_diubah`      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ix_minta_ke` (`ke`, `status`),
  KEY `ix_minta_sumber` (`sumber`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;


-- =============================================================================
--  BANDING PERPANJANGAN TENGGAT (2.41.0)
-- =============================================================================

-- PIC mengajukan tenggat baru ke pemberi task (ke). Disetujui = tenggat task berubah ke dueJadi;
-- ditolak = catatan. Tanpa foreign key ke tasks supaya jejaknya tetap bila task dihapus.
-- permintaanDae (2.46.0) = permintaan ke tim DAE yang melahirkan task-nya; pemberinya pengirim permintaan, bukan Manager.
CREATE TABLE IF NOT EXISTS `perpanjangan` (
  `id`         VARCHAR(64)  NOT NULL,
  `task`       VARCHAR(64)  NOT NULL,
  `dari`       VARCHAR(64)  NOT NULL,
  `ke`         VARCHAR(64)  NOT NULL,
  `dueLama`    DATE         NULL,
  `dueBaru`    DATE         NULL,
  `alasan`     TEXT         NULL,
  `status`     VARCHAR(20)  NOT NULL DEFAULT 'menunggu',
  `catatan`    TEXT         NULL,
  `oleh`       VARCHAR(64)  NOT NULL DEFAULT '',
  `dueJadi`    DATE         NULL,
  `createdAt`  DATETIME(3)  NULL,
  `jawabAt`    DATETIME(3)  NULL,
  `updatedAt`  DATETIME(3)  NULL,
  `permintaanDae` VARCHAR(64) NULL,
  `_diubah`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ix_panjang_ke` (`ke`, `status`),
  KEY `ix_panjang_task` (`task`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;


-- =============================================================================
--  PERMINTAAN KE TIM DAE (2.46.0)
-- =============================================================================

-- Anggota tim lain (dari, timPeminta) meminta tim DAE membangun sesuatu, lewat proyek asal.
-- Lead DAE menerima (jadi task DAE di sebuah inisiatif: kolom task + inisiatif + pic), bertanya
-- (status ditanya, utasnya di permintaan_dae_utas), atau menolak (alasan). Task yang lahir wajib
-- ditinjau pengirimnya (tasks.permintaanDae + peminta); revisi = jumlah putaran dikembalikan.
-- Tak pernah dihapus, dan tanpa foreign key ke projects/tasks: proyek atau task asal boleh
-- dihapus tanpa menghapus jejak permintaannya.
CREATE TABLE IF NOT EXISTS `permintaan_dae` (
  `id`           VARCHAR(64)   NOT NULL,
  `proyek`       VARCHAR(64)   NOT NULL,
  `timPeminta`   VARCHAR(10)   NOT NULL DEFAULT '',
  `dari`         VARCHAR(64)   NOT NULL,
  `judul`        VARCHAR(200)  NOT NULL DEFAULT '',
  `jenis`        VARCHAR(20)   NOT NULL DEFAULT '',
  `kebutuhan`    TEXT          NULL,
  `due`          DATE          NULL,
  `status`       VARCHAR(20)   NOT NULL DEFAULT 'menunggu',
  `alasan`       TEXT          NULL,
  `task`         VARCHAR(64)   NOT NULL DEFAULT '',
  `inisiatif`    VARCHAR(64)   NOT NULL DEFAULT '',
  `pic`          VARCHAR(64)   NOT NULL DEFAULT '',
  `dueTerima`    DATE          NULL,
  `oleh`         VARCHAR(64)   NOT NULL DEFAULT '',
  `revisi`       INT           NOT NULL DEFAULT 0,
  `createdAt`    DATETIME(3)   NULL,
  `jawabAt`      DATETIME(3)   NULL,
  `selesaiAt`    DATETIME(3)   NULL,
  `updatedAt`    DATETIME(3)   NULL,
  `_diubah`      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ix_mdae_status` (`status`, `jenis`),
  KEY `ix_mdae_proyek` (`proyek`),
  KEY `ix_mdae_dari` (`dari`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Bahan riset permintaan: tautan berjudul, berurutan.
CREATE TABLE IF NOT EXISTS `permintaan_dae_links` (
  `id`         VARCHAR(64)   NOT NULL,
  `permintaan` VARCHAR(64)   NOT NULL,
  `urutan`     DOUBLE        NOT NULL DEFAULT 0,
  `label`      VARCHAR(300)  NOT NULL DEFAULT '',
  `url`        VARCHAR(2048) NOT NULL DEFAULT '',
  `_diubah`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ix_mdae_link` (`permintaan`, `urutan`),
  CONSTRAINT `fk_mdae_link` FOREIGN KEY (`permintaan`) REFERENCES `permintaan_dae` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Utas tanya-jawab dan komentar. jenis: tanya (Lead DAE), balas (pengirim), komentar (siapa pun
-- yang boleh melihat, mis. Manager), catatan (dari sistem).
CREATE TABLE IF NOT EXISTS `permintaan_dae_utas` (
  `id`         VARCHAR(64)  NOT NULL,
  `permintaan` VARCHAR(64)  NOT NULL,
  `oleh`       VARCHAR(64)  NOT NULL DEFAULT '',
  `at`         DATETIME(3)  NULL,
  `jenis`      VARCHAR(20)  NOT NULL DEFAULT '',
  `teks`       TEXT         NULL,
  `_diubah`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ix_mdae_utas` (`permintaan`, `at`),
  CONSTRAINT `fk_mdae_utas` FOREIGN KEY (`permintaan`) REFERENCES `permintaan_dae` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;


-- =============================================================================
--  TASK
-- =============================================================================

-- project NULL = jalur rutin (di aplikasi ''). induk = task anak (satu tingkat).
-- inisiatif NULL = bukan pembaruan inisiatif (di aplikasi ''), 2.31.0.
-- diminta = orang yang meminta task ini lewat permintaan lanjutan (2.38.0); Lead timnya yang meninjau.
-- pembaruanProyek = proyek yang diperbarui task rutin ini (2.45.0); task-nya tetap di luar proyek (project NULL).
-- permintaanDae = permintaan ke tim DAE yang melahirkan task ini (2.46.0); peminta = pengirimnya, yang wajib meninjau hasilnya.
-- support, deps, dan tunggu adalah larik ID; disimpan JSON karena aplikasi memakainya utuh.
-- tunggu + lepasFase (2.19.0) = urutan yang diatur Lead tim di tab timnya di halaman proyek.
CREATE TABLE IF NOT EXISTS `tasks` (
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
  `tunggu`         JSON         NOT NULL DEFAULT (JSON_ARRAY()),
  `lepasFase`      BOOLEAN      NOT NULL DEFAULT FALSE,
  `notes`          TEXT         NULL,
  `assignedBy`     VARCHAR(64)  NOT NULL DEFAULT '',
  `cycle`          INT          NOT NULL DEFAULT 1,
  `createdAt`      DATETIME(3)  NULL,
  `updatedAt`      DATETIME(3)  NULL,
  `selesaiAt`      DATETIME(3)  NULL,
  `induk`          VARCHAR(64)  NULL,
  `inisiatif`      VARCHAR(64)  NULL,
  `diminta`        VARCHAR(64)  NULL,
  `pembaruanProyek` VARCHAR(64) NULL,
  `permintaanDae`  VARCHAR(64)  NULL,
  `peminta`        VARCHAR(64)  NULL,
  `tahapProyek`    VARCHAR(16)  NOT NULL DEFAULT '',
  `_diubah`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ix_task_proyek` (`project`, `cycle`, `stage`),
  KEY `ix_task_pic` (`pic`, `status`),
  KEY `ix_task_status_due` (`status`, `due`),
  KEY `ix_task_induk` (`induk`),
  KEY `ix_task_inisiatif` (`inisiatif`),
  KEY `ix_task_pembaruan` (`pembaruanProyek`),
  KEY `ix_task_mdae` (`permintaanDae`),
  KEY `ix_task_diubah` (`_diubah`),
  CONSTRAINT `fk_task_proyek` FOREIGN KEY (`project`) REFERENCES `projects` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_task_induk` FOREIGN KEY (`induk`) REFERENCES `tasks` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_task_inisiatif` FOREIGN KEY (`inisiatif`) REFERENCES `inisiatif` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_task_pembaruan` FOREIGN KEY (`pembaruanProyek`) REFERENCES `projects` (`id`) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `subtasks` (
  `id`         VARCHAR(64)  NOT NULL,
  `task`       VARCHAR(64)  NOT NULL,
  `urutan`     INT          NOT NULL DEFAULT 0,
  `title`      VARCHAR(500) NOT NULL DEFAULT '',
  `pic`        VARCHAR(64)  NOT NULL DEFAULT '',
  `due`        DATE         NULL,
  `done`       BOOLEAN      NOT NULL DEFAULT FALSE,
  `link`       VARCHAR(2000) NOT NULL DEFAULT '',   -- tautan opsional (2.24.0)
  `_diubah`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ix_subtask_task` (`task`, `urutan`),
  CONSTRAINT `fk_subtask_task` FOREIGN KEY (`task`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Komentar task hasil impor v1. Pesan Komunikasi baru ada di obrolan.
CREATE TABLE IF NOT EXISTS `comments` (
  `id`         VARCHAR(64) NOT NULL,
  `task`       VARCHAR(64) NOT NULL,
  `author`     VARCHAR(64) NOT NULL DEFAULT '',
  `text`       TEXT        NOT NULL DEFAULT (''),
  `at`         DATETIME(3) NULL,
  `_diubah`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ix_komentar_task` (`task`, `at`),
  CONSTRAINT `fk_komentar_task` FOREIGN KEY (`task`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Riwayat tinjauan: ajukan, setujui, kembalikan, ... `by` = kata kunci MySQL: kutip selalu.
CREATE TABLE IF NOT EXISTS `tinjauan` (
  `id`         VARCHAR(64) NOT NULL,
  `task`       VARCHAR(64) NOT NULL,
  `by`         VARCHAR(64) NOT NULL DEFAULT '',
  `action`     VARCHAR(30) NOT NULL DEFAULT '',
  `note`       TEXT        NULL,
  `at`         DATETIME(3) NULL,
  `_diubah`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ix_tinjauan_task` (`task`, `at`),
  CONSTRAINT `fk_tinjauan_task` FOREIGN KEY (`task`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Tautan bukti output (syarat ajukan: minimal satu).
CREATE TABLE IF NOT EXISTS `evidence` (
  `id`         VARCHAR(64)   NOT NULL,
  `task`       VARCHAR(64)   NOT NULL,
  `urutan`     INT           NOT NULL DEFAULT 0,
  `label`      VARCHAR(300)  NOT NULL DEFAULT '',
  `url`        VARCHAR(2048) NOT NULL DEFAULT '',
  `_diubah`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ix_bukti_task` (`task`, `urutan`),
  CONSTRAINT `fk_bukti_task` FOREIGN KEY (`task`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Setoran: task → target paket, dihitung saat task (langkah) itu disetujui.
-- Target atau paket dihapus → setorannya ikut hilang. Task dihapus → setoran tetap,
-- task-nya NULL (jejak bahwa pekerjaan itu pernah ada, seperti aturan v1).
CREATE TABLE IF NOT EXISTS `setoran` (
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
  CONSTRAINT `fk_setoran_paket` FOREIGN KEY (`paket`) REFERENCES `packages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_setoran_item` FOREIGN KEY (`item`) REFERENCES `package_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_setoran_task` FOREIGN KEY (`task`) REFERENCES `tasks` (`id`) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Kalender Saya (2.28.0): agenda pribadi per profil (data = JSON isinya), hanya untuk
-- pemiliknya; yang dihapus ditandai. Email pribadi opsional untuk pengingat email nanti.
-- Acara bersama (2.33.0): peserta, jawaban, kaitan, dan notulen ikut di `data`; `orang` =
-- pembuatnya. Saringan "yang boleh dilihat" (pembuat, peserta, Terbuka) dilakukan server.
CREATE TABLE IF NOT EXISTS `agenda` (
  `id`         VARCHAR(64)  NOT NULL,
  `orang`      VARCHAR(64)  NOT NULL,
  `data`       JSON         NOT NULL DEFAULT (JSON_OBJECT()),
  `diperbarui` DATETIME(3)  NULL,
  `dihapus`    BOOLEAN      NOT NULL DEFAULT FALSE,
  `_diubah`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ix_agenda_orang` (`orang`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `pribadi` (
  `orang`      VARCHAR(64)  NOT NULL,
  `email`      VARCHAR(120) NOT NULL DEFAULT '',
  `diperbarui` DATETIME(3)  NULL,
  `_diubah`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`orang`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Nomor ID tertinggi yang pernah dipakai per awalan (PRD, PRJ, PKG), dicatat saat ada yang
-- dihapus, supaya nomornya tak dipakai ulang (2.27.0).
CREATE TABLE IF NOT EXISTS `nomor` (
  `id`         VARCHAR(10)  NOT NULL,
  `n`          INT          NOT NULL DEFAULT 0,
  `_diubah`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;


-- =============================================================================
--  RUANG SAYA & TAUTAN TIM
-- =============================================================================

-- Tautan tim (dulu "Dashboard Lain").
CREATE TABLE IF NOT EXISTS `dashboards` (
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
CREATE TABLE IF NOT EXISTS `links` (
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
CREATE TABLE IF NOT EXISTS `notes` (
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
CREATE TABLE IF NOT EXISTS `log` (
  `row_id`     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id`         VARCHAR(64)  NOT NULL,
  `type`       VARCHAR(20)  NOT NULL DEFAULT '',
  `task`       VARCHAR(600) NOT NULL DEFAULT '',
  `detail`     TEXT         NULL,
  `by`         VARCHAR(64)  NOT NULL DEFAULT '',
  `at`         DATETIME(3)  NOT NULL,
  PRIMARY KEY (`row_id`),
  KEY `ix_log_id` (`id`),
  KEY `ix_log_at` (`at`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Komunikasi bersama: satu baris = satu peristiwa (pesan, ubah, hapus, reaksi, lepas,
-- beres, moderasi). id dan `at` diberikan server. Keadaan akhir disusun Inti.susunObrolan.
CREATE TABLE IF NOT EXISTS `obrolan` (
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

-- Periksa: 32 tabel aplikasi berawalan ; runtime menambah tabel migration/jurnal/setelan/contoh.
SELECT COUNT(*) AS tabel_v2
  FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = 'produk_base' AND TABLE_NAME LIKE 'v2\_%';
SELECT `kunci`, `nilai` FROM `meta`;
