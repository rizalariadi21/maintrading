# SimuTrade ID - Simulasi Trading Saham IDX & Kripto Realtime

Aplikasi web simulasi trading (*paper trading*) dengan modal awal **Rp 100.000.000**, menggunakan harga pasar asli secara **realtime** untuk **Kripto Global** (`BTC`, `ETH`, `SOL`, `PAXG`) dan **Saham Indonesia** (`BBCA`, `BRIS`, `AMMN`, serta indeks acuan `IHSG`).

Seluruh data portofolio, kas, dan riwayat transaksi disimpan murni di **`localStorage` browser**.

---

## 🚀 Fitur Utama

- **Modal Awal Realistis**: Dimulai dari Rp 100.000.000 (disimpan aman di `localStorage`).
- **Data Pasar Asli (Real-Time)**:
  - **Kripto**: BTC, ETH, SOL, PAXG via CoinGecko API (auto kurs IDR & 24h change).
  - **Saham IDX**: BBCA, BRIS, AMMN, dan indeks IHSG via Yahoo Finance API.
- **Mekanisme Trading Nyata**:
  - **Saham IDX**: Satuan kelipatan **1 Lot = 100 Lembar**. Fee beli 0.15%, fee jual 0.25%.
  - **Kripto**: Satuan fleksibel (bisa pecahan nominal Rupiah atau unit koin). Fee 0.10%.
  - **Average Down/Up**: Kalkulasi harga beli rata-rata (*weighted average*) otomatis.
  - **Floating & Realized PnL**: Menghitung keuntungan/kerugian belum terealisasi dan yang sudah terealisasi saat jual.
- **Interactive Chart**: Grafik interaktif menggunakan TradingView Lightweight Charts dengan update tick langsung.
- **Audio Feedback**: Efek suara Web Audio synthesizer (tanpa file audio eksternal).
- **Reset Modal**: Tombol reset untuk kembali ke modal awal Rp 100 Juta kapan saja.

---

## 💻 Cara Menjalankan di Lokal

### Opsi 1: Menggunakan Python HTTP Server
```bash
cd /home/noah/maintrading
python3 -m http.server 3000
```
Lalu buka di browser: `http://localhost:3000`

### Opsi 2: Menggunakan Vercel Dev
```bash
cd /home/noah/maintrading
npx vercel dev
```

---

## 🌐 Cara Deploy ke Vercel

Karena akun Vercel kamu sudah login di laptop ini (`rizalariadi21`), kamu bisa langsung deploy dengan satu perintah:

```bash
cd /home/noah/maintrading
npx vercel --prod
```

Ikuti konfirmasi di terminal, dan aplikasi akan langsung online dengan domain publik `.vercel.app` gratis!
