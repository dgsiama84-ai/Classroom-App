export type KasJenis = 'pemasukan' | 'pengeluaran'

export interface KasTransaksi {
  id: string
  jenis: KasJenis
  jumlah: number
  keterangan: string
  kategori: string | null
  tanggal: string // YYYY-MM-DD
  created_at: string
  periode_id?: string | null // terisi kalau transaksi ini berasal dari iuran mahasiswa
}

export interface KasRingkasan {
  pemasukan: number
  pengeluaran: number
  saldo: number
}

export const KAS_KATEGORI: Record<KasJenis, string[]> = {
  pemasukan: ['Iuran', 'Donasi', 'Lainnya'],
  pengeluaran: ['Fotokopi', 'Konsumsi', 'Kegiatan', 'Lainnya'],
}

export function formatRupiah(n: number): string {
  const abs = Math.abs(Math.trunc(n))
  const str = 'Rp' + abs.toLocaleString('id-ID')
  return n < 0 ? `-${str}` : str
}

// "25000" / "25.000" / "Rp 25.000" → 25000
export function parseRupiah(input: string): number {
  return parseInt(input.replace(/\D/g, ''), 10) || 0
}

export function formatTanggalPendek(tanggal: string): string {
  const [y, m, d] = tanggal.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export interface IuranPeriode {
  id: string
  nama: string
  nominal: number
  created_at: string
  sudah_bayar: number
  terkumpul: number
}

export interface IuranRow {
  nim: string
  nama: string
  kelas: string
  bayar: { id: string; jumlah: number; tanggal: string } | null
}
