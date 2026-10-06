import { useEffect, useState } from 'react'
import { MataKuliah } from '@/lib/types'

// all=false → cuma matkul semester aktif (buat Generate QR).
// all=true  → semua semester termasuk yang lama (buat filter Rekap).
export function useMatkulList(all: boolean) {
  const [list, setList] = useState<MataKuliah[]>([])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/matkul${all ? '?all=true' : ''}`)
      .then(r => r.json())
      .then(j => { if (!cancelled) setList(j.data || []) })
    return () => { cancelled = true }
  }, [all])

  return list
}