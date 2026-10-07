# Changelog — ProductTrack v2

## 0.1.0 — Kerangka sandbox (2026-10-07)

- Prototipe v3.0 masuk apa adanya sebagai `public/index.html`, sebagai titik awal yang bisa dibandingkan.
- `/api/rpc` dengan gerbang PIN. PIN dikirim sekali; setelah itu sesi dibawa cookie HttpOnly
  bertanda tangan. Gerbang yang belum disetel berarti tertutup.
- Penanda kepemilikan `_meta`. v2 hanya menulis ke spreadsheet miliknya sendiri, dan hanya mau
  menyiapkan spreadsheet yang kosong. Pemasangannya atomik (satu `batchUpdate`).
- Halaman `/cek` untuk memeriksa setelan, akun, dan spreadsheet dari browser.
- `npm run dev` meniru Vercel tanpa Vercel CLI. `npm test` berjalan tanpa koneksi ke Google.
- CI GitHub Actions: tes, plus penjaga yang gagal kalau ada kunci privat ter-commit.
