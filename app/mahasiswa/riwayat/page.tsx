'use client'

import { useEffect, useState } from 'react'
import { getMahasiswaSession } from '@/lib/auth'

interface AbsensiRecord {
  id: string
  mata_kuliah_id: string
  pertemuan: number
  tanggal: string
  waktu: string
  status: 'hadir' | 'sakit' | 'izin' | 'alpa'
  mata_kuliah: { kode: string; nama: string }
}

const statusConfig = {
  hadir: { label: '✓ Hadir', text: 'text-green-400', bg: '#22c55e20' },
  sakit: { label: 'S Sakit', text: 'text-blue-400', bg: '#3b82f620' },
  izin:  { label: 'I Izin',  text: 'text-yellow-400', bg: '#eab30820' },
  alpa:  { label: 'A Alpa',  text: 'text-red-400', bg: '#ef444420' },
}

export default function RiwayatPage() {
  const session = getMahasiswaSession()
  const [data, setData] = useState<AbsensiRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('semua')

  const matkulList = [...new Map(data.map(d => [d.mata_kuliah_id, d.mata_kuliah])).entries()]
  .sort((a, b) => a[1].kode.localeCompare(b[1].kode))
  useEffect(() => {
    if (!session) return
    const token = localStorage.getItem('token')
    fetch('/api/absensi', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(json => {
        // Urutkan per matkul lalu per pertemuan
        const sorted = (json.data || []).sort((a: AbsensiRecord, b: AbsensiRecord) => {
          if (a.mata_kuliah_id !== b.mata_kuliah_id)
            return a.mata_kuliah_id.localeCompare(b.mata_kuliah_id)
          return a.pertemuan - b.pertemuan
        })
        setData(sorted)
        setLoading(false)
      })
  }, [session?.nim])

  const filtered = filter === 'semua' ? data : data.filter(d => d.mata_kuliah_id === filter)

  // Hitung persentase hadir per matkul yang difilter
  const persen = filtered.length === 0 ? 0 :
    Math.round(filtered.filter(d => d.status === 'hadir').length / filtered.length * 100)

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-1">Riwayat Absensi</h2>
      <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
        {filtered.length} pertemuan
        {filter !== 'semua' && ` · ${persen}% hadir`}
      </p>

      {/* Filter matkul */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
        <button onClick={() => setFilter('semua')}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{
            background: filter === 'semua' ? 'var(--accent)' : 'var(--surface)',
            color: filter === 'semua' ? 'white' : 'var(--text-muted)',
            border: '1px solid var(--border)'
          }}>
          Semua
        </button>
        {matkulList.map(([id, mk]) => (
          <button key={id} onClick={() => setFilter(id)}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: filter === id ? 'var(--accent)' : 'var(--surface)',
              color: filter === id ? 'white' : 'var(--text-muted)',
              border: '1px solid var(--border)'
            }}>
            {mk.kode}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📭</p>
          <p style={{ color: 'var(--text-muted)' }}>Belum ada riwayat absensi</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const s = statusConfig[item.status] ?? statusConfig.hadir
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