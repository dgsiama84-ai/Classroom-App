'use client'
import { useRouter } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import { useEffect, useState } from 'react'
import { BookOpen, User, Plus } from 'lucide-react'
import Spinner from '@/components/Spinner'
import { pressProps } from '@/components/pressProps'

interface MataKuliah { id: string; kode: string; nama: string; dosen?: string; semester?: string }

export default function AdminMatkulPage() {
  const router = useRouter()
useEffect(() => {
  if (!getAdminSession()) router.replace('/login')
}, [router])
  const [list, setList] = useState<MataKuliah[]>([])
  const [loading, setLoading] = useState(true)
  const [kode, setKode] = useState('')
  const [nama, setNama] = useState('')
  const [dosen, setDosen] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showAll, setShowAll] = useState(false)

  async function load(all: boolean) {
    setLoading(true)
    const res = await fetch(`/api/matkul${all ? '?all=true' : ''}`)
    const json = await res.json()
    setList(json.data || [])
    setLoading(false)
  }

  useEffect(() => { load(showAll) }, [showAll])

  async function handleAdd() {
    if (!kode || !nama) { setError('Kode dan nama wajib diisi'); return }
    setSaving(true)
    setError('')

    const res = await fetch('/api/matkul', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kode, nama, dosen }),
    })
    const json = await res.json()
    setSaving(false)

    if (!res.ok) { setError(json.error); return }
    setKode(''); setNama(''); setDosen(''); setShowForm(false)
    load(showAll)
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus mata kuliah ini?')) return
    setDeleting(id)
    await fetch('/api/matkul', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setDeleting(null)
    load(showAll)
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold">Mata Kuliah</h2>
        <button onClick={() => setShowForm(v => !v)} {...pressProps}
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'var(--accent)', color: 'white' }}>
          <Plus size={18} />
        </button>
      </div>
      <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
        {list.length} mata kuliah {showAll ? '(semua semester)' : '(semester aktif)'}
      </p>

      <button onClick={() => setShowAll(v => !v)} {...pressProps}
        className="text-xs font-medium mb-4 px-3 py-1.5 rounded-lg"
        style={{ background: 'var(--surface2)', color: 'var(--accent-light)', border: '1px solid var(--border)' }}>
        {showAll ? 'Tampilkan semester aktif aja' : 'Lihat semua semester (termasuk lama)'}
      </button>

      {/* Form tambah */}
      {showForm && (
        <div className="rounded-2xl p-4 mb-4 space-y-3"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <input value={kode} onChange={e => setKode(e.target.value)} placeholder="Kode (mis. MK01)"
            className="w-full px-3 py-2.5 rounded-xl text-sm"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }} />
          <input value={nama} onChange={e => setNama(e.target.value)} placeholder="Nama mata kuliah"
            className="w-full px-3 py-2.5 rounded-xl text-sm"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }} />
          <input value={dosen} onChange={e => setDosen(e.target.value)} placeholder="Nama dosen (opsional)"
            className="w-full px-3 py-2.5 rounded-xl text-sm"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }} />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Otomatis masuk ke semester aktif.
          </p>
          <button onClick={handleAdd} disabled={saving} {...pressProps}
            className="w-full py-2.5 rounded-xl text-sm font-medium"
            style={{ background: 'var(--accent)', color: 'white' }}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <Spinner />
      ) : list.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-muted)' }}>Belum ada mata kuliah</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Tambah mata kuliah dulu</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map(mk => (
          <div key={mk.id} className="rounded-xl px-4 py-3 fade-in flex items-start justify-between"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div>
              <p className="text-sm font-medium">{mk.nama}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--accent-light)' }}>{mk.kode}</p>
              {mk.dosen && (
                <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
               <User size={12} /> {mk.dosen}
               </p>
                )}
              {mk.semester && (
                <span className="inline-block text-xs mt-1.5 px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>
                  {mk.semester}
                </span>
              )}
            </div>
            <button onClick={() => handleDelete(mk.id)} disabled={deleting === mk.id} {...pressProps}
              className="text-xs px-2 py-1 rounded-lg shrink-0"
              style={{ color: '#ef4444' }}>
              {deleting === mk.id ? '...' : 'Hapus'}
            </button>
          </div>
          ))}
        </div>
      )}
    </div>
  )
}
