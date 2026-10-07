'use client'
import { Inbox } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getMahasiswaSession } from '@/lib/auth'
import Spinner from '@/components/Spinner'
import { pressProps } from '@/components/pressProps'
import SemesterFilter from '@/components/SemesterFilter'
import { useSemesterList } from '@/lib/hooks/useSemesterList'
import { apiFetch } from '@/lib/api'
import { statusMeta } from '@/lib/status'
import { AbsensiRecord } from '@/lib/types'

export default function RiwayatPage() {
  const session = getMahasiswaSession()
  const [data, setData] = useState<AbsensiRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('semua')
  // '' = semester aktif (default, diatur admin), 'all' = semua, atau id semester
  const [semester, setSemester] = useState('')
  const semesters = useSemesterList()
  const aktifId = semesters.find(s => s.is_aktif)?.id
  const semesterSiap = semester !== '' || !!aktifId

  useEffect(() => {
    if (!session) return
    apiFetch<{ data: AbsensiRecord[] }>('/api/absensi')
      .then(json => {
        // Terbaru dulu (tanggal & jam), biar matkul semester ini nongol di atas,
        // bukan matkul lama cuma karena id-nya lebih kecil secara string.
        const sorted = (json.data || []).sort((a, b) => {
          const dateCompare = b.tanggal.localeCompare(a.tanggal)
          if (dateCompare !== 0) return dateCompare
          return b.waktu.localeCompare(a.waktu)
        })
        setData(sorted)
      })
      .finally(() => setLoading(false))
  }, [session?.nim])

  // Default semester aktif; semester lain / semua lewat filter
  const targetId = semester || aktifId
  const scoped = data.filter(d => semester === 'all' || d.mata_kuliah?.semester_id === targetId)
  const matkulList = [...new Map(scoped.map(d => [d.mata_kuliah_id, d.mata_kuliah])).entries()]

  const filtered = filter === 'semua' ? scoped : scoped.filter(d => d.mata_kuliah_id === filter)

  // Hitung persentase hadir per matkul yang difilter
  const persen = filtered.length === 0 ? 0 :
    Math.round(filtered.filter(d => d.status === 'hadir').length / filtered.length * 100)

  function pilihSemester(v: string) {
    setSemester(v)
    setFilter('semua')
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-1">Riwayat Absensi</h2>
      <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
        {filtered.length} pertemuan
        {filter !== 'semua' && ` · ${persen}% hadir`}
      </p>

      <SemesterFilter value={semester} onChange={pilihSemester} />

      {/* Filter matkul */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
        <button onClick={() => setFilter('semua')} {...pressProps}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{
            background: filter === 'semua' ? 'var(--accent)' : 'var(--surface)',
            color: filter === 'semua' ? 'white' : 'var(--text-muted)',
            border: '1px solid var(--border)'
          }}>
          Semua
        </button>
        {matkulList.map(([id, mk]) => (
          <button key={id} onClick={() => setFilter(id)} {...pressProps}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap"
            style={{
              background: filter === id ? 'var(--accent)' : 'var(--surface)',
              color: filter === id ? 'white' : 'var(--text-muted)',
              border: '1px solid var(--border)'
            }}>
            {mk.nama.length > 20 ? mk.nama.slice(0, 18) + '…' : mk.nama}
          </button>
        ))}
      </div>

      {loading || !semesterSiap ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Inbox size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-muted)' }}>Belum ada riwayat absensi</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const s = statusMeta(item.status ?? 'hadir', '20')
            return (
              <div key={item.id} className="rounded-xl px-4 py-3 flex items-center justify-between fade-in"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div>
                  <p className="font-medium text-sm">{item.mata_kuliah?.nama}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Pertemuan {item.pertemuan}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-lg font-medium ${s.text}`}
                  style={{ background: s.bg }}>
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}