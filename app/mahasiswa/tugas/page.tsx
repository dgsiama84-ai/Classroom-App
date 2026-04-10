'use client'

import { useEffect, useState } from 'react'
import { formatDateTime } from '@/lib/utils'

interface Tugas {
  id: string
  judul: string
  deskripsi: string
  deadline: string
  mata_kuliah: { kode: string; nama: string }
}

function isDeadlineSoon(deadline: string): boolean {
  const diff = new Date(deadline).getTime() - Date.now()
  return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000 // 3 hari
}

function isOverdue(deadline: string): boolean {
  return new Date(deadline) < new Date()
}

export default function TugasPage() {
  const [data, setData] = useState<Tugas[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/tugas')
      .then(r => r.json())
      .then(json => { setData(json.data || []); setLoading(false) })
  }, [])

  const active = data.filter(t => !isOverdue(t.deadline))
  const overdue = data.filter(t => isOverdue(t.deadline))

  function TugasCard({ tugas }: { tugas: Tugas }) {
    const soon = isDeadlineSoon(tugas.deadline)
    const over = isOverdue(tugas.deadline)
    const isOpen = expanded === tugas.id

    return (
      <div className="rounded-xl overflow-hidden fade-in"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <button className="w-full p-4 text-left" onClick={() => setExpanded(isOpen ? null : tugas.id)}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{tugas.judul}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {tugas.mata_kuliah?.kode} — {tugas.mata_kuliah?.nama}
              </p>
            </div>
            <span className="text-xs px-2 py-1 rounded-lg flex-shrink-0"
              style={{
                background: over ? '#ef444420' : soon ? '#f59e0b20' : '#6366f120',
                color: over ? 'var(--danger)' : soon ? 'var(--warning)' : 'var(--accent-light)',
              }}>
              {over ? 'Lewat' : soon ? 'Segera' : 'Aktif'}
            </span>
          </div>
          <p className="text-xs mt-2" style={{ color: over ? 'var(--danger)' : 'var(--text-muted)' }}>
            ⏰ Deadline: {formatDateTime(tugas.deadline)}
          </p>
        </button>
        {isOpen && tugas.deskripsi && (
          <div className="px-4 pb-4 pt-0 text-sm" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
            <p className="mt-3 whitespace-pre-wrap">{tugas.deskripsi}</p>
          </div>
        )}
      </div>
    )
  }

  if (loading) return (
    <div className="flex justify-center py-10">
      <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-1">Daftar Tugas</h2>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        {active.length} tugas aktif
      </p>

      {data.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📭</p>
          <p style={{ color: 'var(--text-muted)' }}>Belum ada tugas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {active.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Aktif
              </p>
              {active.map(t => <TugasCard key={t.id} tugas={t} />)}
            </>
          )}
          {overdue.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider mt-4 mb-2" style={{ color: 'var(--text-muted)' }}>
                Sudah lewat deadline
              </p>
              {overdue.map(t => <TugasCard key={t.id} tugas={t} />)}
            </>
          )}
        </div>
      )}
    </div>
  )
}
