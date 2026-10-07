# Changelog — ProductTrack v2

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
