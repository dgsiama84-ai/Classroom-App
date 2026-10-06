// Tipe data yang dipakai bareng di banyak halaman (admin & mahasiswa),
// biar nggak didefinisikan ulang beda-beda di tiap file.

export interface MataKuliah {
  id: string
  kode: string
  nama: string
  dosen?: string
  semester?: string
}

export interface QRSession {
  id: string
  mata_kuliah_id: string
  kelas: string
  pertemuan: number
  expires_at: string
}

export type AbsensiStatus = 'hadir' | 'sakit' | 'izin' | 'alpa'

export interface AbsensiRecord {
  id: string
  nim: string
  nama: string
  kelas: string
  pertemuan: number
  tanggal: string
  waktu: string
  status?: AbsensiStatus
  mata_kuliah_id: string
  mata_kuliah: { kode: string; nama: string; semester?: string }
}

export interface RekapRecord {
  nim: string
  nama: string
  kelas: string
  hadir: boolean
  status: AbsensiStatus | 'belum'
  waktu: string | null
}

export interface PertemuanLog {
  pertemuan: number
  is_locked: boolean
  jumlah_absensi: number
}

// Hasil submit absensi lewat QR (dipakai di /absen dan /mahasiswa/absensi)
export interface AbsensiResult {
  nama: string
  mataKuliah: string
  pertemuan: number
  tanggal: string | null
  waktu: string | null
  status?: string
}