import { useEffect, useState } from 'react'
import { MataKuliah } from '@/lib/types'

// all=false → cuma matkul semester aktif (buat Generate QR).
// all=true  → semua semester termasuk yang lama (buat filter Rekap).
export function useMatkulList(all: boolean) {
  const [list, setList] = useState<MataKuliah[]>([])

  useEffect(() => {
    let cancelled = false
<<<<<<< HEAD
    fetch(`/api/matkul${all ? '?semester=all' : ''}`)
=======
    fetch(`/api/matkul${all ? '?all=true' : ''}`)
>>>>>>> 428493411cf03b72a0d0b4ecd241ba935bc6caae
      .then(r => r.json())
      .then(j => { if (!cancelled) setList(j.data || []) })
    return () => { cancelled = true }
  }, [all])

  return list
}