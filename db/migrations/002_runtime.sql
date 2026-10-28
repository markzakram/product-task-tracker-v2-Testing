-- Infrastruktur runtime dan migrasi. Tabel aplikasi dasar ada di 001_initial.sql.
CREATE TABLE IF NOT EXISTS `migrations` (
  `id` VARCHAR(100) NOT NULL,
  `checksum` CHAR(64) NOT NULL,
  `diterapkan` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `setelan` (
  `kunci` VARCHAR(64) NOT NULL,
  `nilai` TEXT NOT NULL,
  `oleh` VARCHAR(64) NOT NULL DEFAULT '',
  `diperbarui` DATETIME(3) NULL,
  PRIMARY KEY (`kunci`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Simpan juga peristiwa yang kalah/diulang, untuk jejak dan pemulihan task.
CREATE TABLE IF NOT EXISTS `real` (
  `seq` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id` VARCHAR(150) NOT NULL,
  `at` BIGINT NOT NULL,
  `sah` BOOLEAN NOT NULL,
  `payload` JSON NOT NULL,
  PRIMARY KEY (`seq`),
  KEY `ix_real_id` (`id`),
  KEY `ix_real_at` (`at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data contoh terpisah; tidak bercampur dengan tabel data real.
CREATE TABLE IF NOT EXISTS `contoh` (
  `id` TINYINT NOT NULL,
  `payload` JSON NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
