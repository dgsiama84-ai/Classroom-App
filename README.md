# STIE25MA2: Sistem Kelas Digital

Aplikasi kelas digital buat Kelas 25MA2, STIE Pelita Buana Makassar. Awalnya cuma buat absensi, sekarang sekalian ngurus kas kelas. Intinya: nggak ada lagi absen kertas dan catatan kas di buku.

Dibuat untuk dipakai langsung dari HP, soalnya hampir semua orang buka lewat HP.

## Apa yang bisa dilakukan

### Untuk mahasiswa
- **Absen lewat QR**: scan QR dari dosen/admin, selesai. Sistem otomatis cek kelas, sesi, dan mencegah absen dobel.
- **Riwayat kehadiran**: lihat hadir, sakit, izin, alpa per mata kuliah, lengkap dengan persentase kehadiran.
- **AI Tutor**: tanya soal materi kuliah kapan saja.
- **Tugas kelas**.

### Untuk admin
- **Buat QR absensi** per pertemuan, dengan hitung mundur supaya nggak bisa dipakai setelah waktunya habis.
- **Rekap absensi** per pertemuan.
- **Import dari Google Sheets**: data absensi lama bisa dimasukkan sekaligus, nama mata kuliah dicocokkan otomatis.

### Untuk bendahara
- **Iuran per semester**: pilih nama, isi jumlah, selesai. Cicilan boleh. Status tiap orang (lunas, kurang, belum bayar) dihitung otomatis.
- **Kas**: pemasukan datang otomatis dari iuran, jadi bendahara tinggal catat pengeluaran (Zoom, print, fotokopi, dll).
- **Laporan siap tempel ke WhatsApp**: saldo, total iuran, pengeluaran terakhir, dan daftar yang belum bayar, tinggal salin lalu kirim ke grup.

## Cara login

Cuma satu form, nggak ada pilihan peran:

- **Mahasiswa**: ketik NIM, lalu Masuk.
- **Admin dan bendahara**: ketik username, kolom password muncul sendiri. Sistem yang menentukan kamu masuk sebagai admin atau bendahara.

## Teknologi

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Auth**: JWT (jose)
- **Sheets**: Google Sheets API v4

## Struktur singkat

```
app/
  api/            absensi, admin, ai, auth, iuran, kas, matkul, qr, tugas
  bendahara/      iuran, kas
  login/          halaman login
components/       komponen UI yang dipakai bersama
lib/              auth, helper kas, koneksi Supabase
```

Tabel utama di database: `mahasiswa`, `absensi`, `iuran_periode`, `kas_transaksi`.

## Cara menjalankan di komputer sendiri

1. Clone repo dan install dependency:

```bash
git clone https://github.com/dgsiama84-ai/Classroom-App.git
cd Classroom-App
npm install
```

2. Buat file `.env.local` di folder utama:

```env
# Umum
JWT_SECRET=isi_dengan_string_acak_yang_panjang
NEXT_PUBLIC_SUPABASE_URL=url_supabase_kamu
SUPABASE_SERVICE_ROLE_KEY=service_role_key_supabase

# Akun admin
ADMIN_USERNAME=username_admin
ADMIN_PASSWORD=password_admin_yang_kuat
ADMIN_NAMA=Nama Admin

# Akun bendahara
BENDAHARA_USERNAME=username_bendahara
BENDAHARA_PASSWORD=password_bendahara_yang_kuat
BENDAHARA_NAMA=Nama Bendahara

# Import dari Google Sheets
GOOGLE_SERVICE_ACCOUNT_EMAIL=akun_service@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
GOOGLE_SHEET_ID=id_spreadsheet_kamu
```

> **Penting**: selalu isi `ADMIN_USERNAME` dan `ADMIN_PASSWORD`. Kalau kosong, akun admin memakai password bawaan yang gampang ditebak. Akun bendahara lebih aman: kalau env-nya belum diisi, login ditolak.

3. Jalankan:

```bash
npm run dev
```

4. Buka <http://localhost:3000>

## Deploy

Deploy ke Vercel, lalu isi semua environment variable di atas lewat dashboard Vercel.

> **Catatan**: `GOOGLE_PRIVATE_KEY` di Vercel harus ditempel apa adanya dengan `\n` literal, jangan diubah jadi baris baru sungguhan.