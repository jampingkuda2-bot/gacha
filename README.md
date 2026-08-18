# Gacha App 🎰

Website gacha dengan 2 mode yang bisa kamu pilih dari panel admin:
- **Spin Wheel** — roda putar hadiah kayak sebelumnya
- **Flip Card** — 8 kartu tertutup, dia pilih satu, hasilnya di-RNG beneran (bukan posisi tetap) tiap kartu dibuka

## Cara deploy ke Vercel

### 1. Upload ke GitHub
Buat repository baru (disarankan **private**), upload semua isi folder ini.

### 2. Import ke Vercel
**Add New → Project** → pilih repo tadi → **Deploy** (akan gagal dulu, wajar, env belum diisi).

### 3. Aktifkan Vercel Blob
Tab **Storage** → **Create Database** → **Blob** → pilih access **Public** → centang **"Add a read-write token env var"** → biarkan prefix default **BLOB** → Create → connect ke project ini.

### 4. Isi environment variables
**Settings → Environment Variables**:

| Nama | Isi |
|---|---|
| `ADMIN_PASSWORD` | Password buat login ke `/admin` |
| `ADMIN_SECRET` | Teks acak bebas (20+ karakter), buat keamanan sesi login |

(`BLOB_READ_WRITE_TOKEN` otomatis terisi dari langkah 3.)

### 5. Redeploy
Tab **Deployments** → titik tiga di deployment terakhir → **Redeploy**.

### 6. Atur di panel admin
Buka `namaproject.vercel.app/admin`, login pakai `ADMIN_PASSWORD`. Dari situ kamu bisa:
- Pilih mode aktif: Spin Wheel atau Flip Card
- Atur hadiah + rate buat spin wheel
- Atur isi pool flip card (foto, label, rate, tandai zonk) — hasilnya di-random tiap kartu dibuka, foto/label gak pernah kekirim ke browser sebelum kartu itu dibuka (jadi gak bisa diintip lewat inspect element)
- Atur batas main per perangkat buat masing-masing mode
- Lihat & reset data siapa aja yang udah main

## Soal keadilan & keamanan RNG
Hasil flip card **ditentukan di server**, bukan di HP pemain — jadi gak bisa dicurangi lewat inspect element atau devtools. Data foto/label tiap kemungkinan hadiah juga baru dikirim ke browser **setelah** kartu itu dipilih dan dibuka, bukan sebelumnya.
