import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatTime(time: string): string {
  return time?.slice(0, 5) ?? '-'
}

export function formatDateTime(dt: string | Date): string {
  return new Date(dt).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date()
}

// Server (Vercel) jalan di UTC, tapi kelas ini di WITA (Asia/Makassar, UTC+8).
// Dipakai tiap kali nyimpen tanggal/waktu absensi biar sesuai jam lokal mahasiswa, bukan UTC.
export function nowInMakassar(): { tanggal: string; waktu: string } {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Makassar',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00'
  let hour = get('hour')
  if (hour === '24') hour = '00'
  return {
    tanggal: `${get('year')}-${get('month')}-${get('day')}`,
    waktu: `${hour}:${get('minute')}:${get('second')}`,
  }
}
