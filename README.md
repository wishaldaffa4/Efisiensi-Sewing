# Kalkulator Efisiensi — Sewing

Web app kalkulator efisiensi produksi bagian sewing. Data diambil real-time dari Google Sheet (DATA PA & OUTPUT LINE).

## Cara Deploy ke Web (via Vercel — gratis)

### Opsi A — Lewat GitHub (direkomendasikan, paling stabil)

1. Buat akun di [github.com](https://github.com) kalau belum punya.
2. Buat repository baru (New Repository), beri nama misalnya `kalkulator-efisiensi-sewing`.
3. Upload semua isi folder ini ke repository tersebut (bisa drag & drop lewat web GitHub: klik "Add file" → "Upload files").
4. Buat akun di [vercel.com](https://vercel.com) — bisa langsung login pakai akun GitHub kamu (paling mudah).
5. Di dashboard Vercel, klik **Add New → Project**.
6. Pilih repository `kalkulator-efisiensi-sewing` yang tadi kamu upload.
7. Vercel akan otomatis mendeteksi ini project Vite — biarkan pengaturan default, klik **Deploy**.
8. Tunggu 1–2 menit, selesai — kamu akan dapat link seperti `kalkulator-efisiensi-sewing.vercel.app` yang bisa dibuka siapa saja.

### Opsi B — Lewat Vercel CLI (kalau kamu sudah familiar terminal/command line)

1. Install Node.js dari [nodejs.org](https://nodejs.org) kalau belum ada di komputer kamu.
2. Extract folder zip ini, buka terminal di dalam folder tersebut.
3. Jalankan:
   ```
   npm install -g vercel
   npm install
   vercel
   ```
4. Ikuti instruksi di layar (login/daftar Vercel, konfirmasi project). Setelah selesai, Vercel akan kasih link publiknya langsung.

## Update di Kemudian Hari

- **Data di Google Sheet** — otomatis ter-update di web app, tidak perlu deploy ulang. Cukup edit sheet-nya, web app akan fetch data terbaru tiap kali dibuka/refresh (delay sinkronisasi Google biasanya 1–5 menit).
- **Ubah tampilan/logic kalkulator** — edit file `src/App.jsx`, lalu upload ulang ke GitHub (Vercel otomatis re-deploy) atau jalankan `vercel` lagi dari CLI.

## Menjalankan di Komputer Sendiri (opsional, untuk testing sebelum deploy)

```
npm install
npm run dev
```
Lalu buka link yang muncul di terminal (biasanya `http://localhost:5173`).
