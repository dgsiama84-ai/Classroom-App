'use client'
import { FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatDateTime } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import Select from '@/components/select'
import Spinner from '@/components/Spinner'

interface MataKuliah { id: string; kode: string; nama: string; dosen?: string }
interface Tugas {
  id: string; judul: string; deskripsi: string; deadline: string
  mata_kuliah: { kode: string; nama: string }
}

export default function AdminTugasPage() {
  const router = useRouter()
useEffect(() => {
  if (!getAdminSession()) router.replace('/login')
}, [router])
  const [list, setList] = useState<Tugas[]>([])
  const [matkulList, setMatkulList] = useState<MataKuliah[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  // Form
  const [matkulId, setMatkulId] = useState('')
  const [judul, setJudul] = useState('')
  const [deskripsi, setDeskripsi] = useState('')
  const [deadlineDate, setDeadlineDate] = useState('')
  const [deadlineTime, setDeadlineTime] = useState('')
  const deadline = deadlineDate ? `${deadlineDate}T${deadlineTime || '23:59'}` : null
  
  async function load() {
    const [tugasRes, matkulRes] = await Promise.all([
      fetch('/api/tugas').then(r => r.json()),
      fetch('/api/matkul').then(r => r.json()),
    ])
    setList(tugasRes.data || [])
    setMatkulList(matkulRes.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd() {
    if (!matkulId || !judul || !deadline) { setError('Semua field wajib diisi'); return }
    setSaving(true); setError('')

    const res = await fetch('/api/tugas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mata_kuliah_id: matkulId, judul, deskripsi, deadline }),
    })
    const json = await res.json()
    setSaving(false)

    if (!res.ok) { setError(json.error); return }
    setMatkulId(''); setJudul(''); setDeskripsi('')
    setDeadlineDate(''); setDeadlineTime('')  // ← fix
    setShowForm(false); load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus tugas ini?')) return
    setDeleting(id)
    await fetch('/api/tugas', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setDeleting(null); load()
  }

  const isOverdue = (d: string) => new Date(d) < new Date()

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold">Tugas</h2>
        <button onClick={() => setShowForm(!showForm)}
         className="text-sm px-3 py-1.5 rounded-lg font-medium transition-all active:scale-95 active:opacity-80"
         style={{ background: 'var(--accent)', color: 'white' }}>
         {showForm ? '✕ Tutup' : '+ Tambah'}
        </button>
      </div>
      <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>{list.length} tugas</p>

      {showForm && (
        <div className="rounded-2xl p-4 mb-5 space-y-3 fade-in"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold">Tambah Tugas</p>
          <div>
  <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Mata Kuliah</label>
  <Select
    value={matkulId}
    onChange={setMatkulId}
    placeholder="Pilih mata kuliah..."
    options={matkulList.map(mk => ({ value: mk.id, label: `${mk.kode} — ${mk.nama}` }))}
  />
</div>
          <div>
            <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Judul Tugas</label>
            <input value={judul} onChange={e => setJudul(e.target.value)} placeholder="Judul tugas"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
          <div>
            <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Deskripsi (opsional)</label>
            <textarea value={deskripsi} onChange={e => setDeskripsi(e.target.value)}
              placeholder="Instruksi tugas..." rows={3}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
          <div>
            <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Deadline
            </label>
            {/* Ganti input datetime-local jadi 2 input terpisah */}
<div className="grid grid-cols-2 gap-3">
  <div>
    <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>
      Tanggal Deadline
    </label>
    <input type="date" value={deadlineDate} onChange={e => setDeadlineDate(e.target.value)}
      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
      style={{
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
        color: 'var(--text)',
        colorScheme: 'dark',
      }} />
  </div>
  <div>
    <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>
      Jam
    </label>
    <input type="time" value={deadlineTime} onChange={e => setDeadlineTime(e.target.value)}
      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
      style={{
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
        color: 'var(--text)',
        colorScheme: 'dark',
      }} />
  </div>
</div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button onClick={handleAdd} disabled={saving}
           className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 active:opacity-80"
           style={{ background: 'var(--accent)', color: 'white', opacity: saving ? 0.6 : 1 }}>
           {saving ? 'Menyimpan...' : 'Simpan Tugas'}
          </button>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : list.length === 0 ? (
        <div className="text-center py-16">
          <FileText size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-muted)' }}>Belum ada tugas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(t => (
            <div key={t.id} className="rounded-xl p-4 fade-in"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.judul}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {t.mata_kuliah?.kode} — {t.mata_kuliah?.nama}
                  </p>
                  {t.deskripsi && (
                    <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{t.deskripsi}</p>
                  )}
                  <p className="text-xs mt-2" style={{ color: isOverdue(t.deadline) ? 'var(--danger)' : 'var(--warning)' }}>
                    ⏰ {formatDateTime(t.deadline)}
                    {isOverdue(t.deadline) && ' (lewat)'}
                  </p>
                </div>
                <button onClick={() => handleDelete(t.id)} disabled={deleting === t.id}
                   className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0 transition-all active:scale-95 active:opacity-80"
                   style={{ background: '#ef444415', color: 'var(--danger)' }}>
                   {deleting === t.id ? '...' : 'Hapus'}
                  </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
