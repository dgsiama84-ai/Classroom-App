'use client'
import { useRouter } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import { useEffect, useState } from 'react'
import { BookOpen, User } from 'lucide-react'
import Spinner from '@/components/Spinner'

interface MataKuliah { id: string; kode: string; nama: string; dosen?: string }

export default function AdminMatkulPage() {
  const router = useRouter()
useEffect(() => {
  if (!getAdminSession()) router.replace('/login')
}, [router])
  const [list, setList] = useState<MataKuliah[]>([])
  const [loading, setLoading] = useState(true)
  const [kode, setKode] = useState('')
  const [nama, setNama] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  async function load() {
    const res = await fetch('/api/matkul')
    const json = await res.json()
    setList(json.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd() {
    if (!kode || !nama) { setError('Kode dan nama wajib diisi'); return }
    setSaving(true)
    setError('')

    const res = await fetch('/api/matkul', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kode, nama }),
    })
    const json = await res.json()
    setSaving(false)

    if (!res.ok) { setError(json.error); return }
    setKode(''); setNama(''); setShowForm(false)
    load()
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
    load()
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold">Mata Kuliah</h2>
      </div>
      <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>{list.length} mata kuliah</p>

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
          <div key={mk.id} className="rounded-xl px-4 py-3 fade-in"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-sm font-medium">{mk.nama}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--accent-light)' }}>{mk.kode}</p>
            {mk.dosen && (
              <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
             <User size={25} /> {mk.dosen}
             </p>
              )}
              </div>
          ))}
        </div>
      )}
    </div>
  )
}
