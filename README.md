# STIE25MA2 — Sistem Kelas Digital

Aplikasi manajemen kelas digital untuk mahasiswa dan dosen STIE Pelita Buana Makassar. Mendukung absensi via QR Code, rekap kehadiran, dan sinkronisasi data dari Google Sheets.

## Fitur

- 🔐 Login mahasiswa (NIM) dan admin (username/password)
- 📲 Generate QR Code absensi per pertemuan dengan countdown timer
- ✅ Scan QR untuk absensi — validasi kelas, sesi, dan duplikat otomatis
- 📊 Rekap admin: hadir, sakit, izin, alpa per pertemuan
- 📥 Import data absensi dari Google Sheets (auto-mapping matkul)
- 📚 Riwayat absensi mahasiswa per mata kuliah + persentase kehadiran
- 🤖 AI Tutor untuk mahasiswa

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Auth**: JWT via jose
- **Sheets**: Google Sheets API v4

## Cara Install

1. Clone repo dan install dependencies:
```bash
git clone https://github.com/username/repo.git
cd repo
npm install
```

2. Buat file `.env.local` di root project:
```env
JWT_SECRET=your_jwt_secret
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
GOOGLE_SHEET_ID=your_spreadsheet_id
```

3. Jalankan development server:
```bash
npm run dev
```

4. Buka [http://localhost:3000](http://localhost:3000)

## Deploy

Deploy ke Vercel — pastikan semua environment variables di atas sudah diset di Vercel dashboard.

> **Catatan**: `GOOGLE_PRIVATE_KEY` di Vercel harus di-paste as-is dengan `\n` literal, jangan diubah jadi newline asli.
