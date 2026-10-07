import { useEffect, useState } from 'react'
import { Semester } from '@/lib/types'

// Daftar semester (terbaru dulu). Dipakai filter semester di semua halaman.
export function useSemesterList() {
  const [list, setList] = useState<Semester[]>([])

  useEffect(() => {
    let cancelled = false
    fetch('/api/semester')
      .then(r => r.json())
      .then(j => { if (!cancelled) setList(j.data || []) })
      .catch(() => { /* filter tetap jalan: default-nya semester aktif */ })
    return () => { cancelled = true }
  }, [])

  return list
}

// Nilai filter: '' = semester aktif (default), 'all' = semua, selain itu = id semester.
// Hasilnya dipasang ke query string API, mis. `/api/matkul${semesterQuery(v, '?')}`.
export function semesterQuery(value: string, prefix: '?' | '&' = '?'): string {
  return value ? `${prefix}semester=${encodeURIComponent(value)}` : ''
}
