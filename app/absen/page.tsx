'use client'
import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { pressProps } from '@/components/pressProps'
import { CheckCircle2 } from 'lucide-react'

interface AbsensiResult {
  nama: string
  mataKuliah: string
  pertemuan: number
  tanggal: string
  waktu: string
}

function AbsenContent() {
  const searchParams = useSearchParams()

  const [sessionId, setSessionId] = useState('')
  const [nim, setNim] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [mahasiswa, setMahasiswa] = useState<{ nama: string; nim: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AbsensiResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setMahasiswa({ nama: payload.nama, nim: payload.nim })
        setIsLoggedIn(true)
      } catch {
        setIsLoggedIn(false)
      }
    }
  }, [])

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) setSessionId(token)
  }, [searchParams])

  async function handleSubmit() {
    if (!sessionId.trim()) { setError('Token tidak valid'); return }
    if (!isLoggedIn && !nim.trim()) { setError('Masukkan NIM kamu'); return }

    setLoading(true)
    setError('')

    try {
      let token = localStorage.getItem('token')

      if (!token) {
        const loginRes = await fetch('/api/auth/mahasiswa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nim: nim.trim() }),
        })
        const loginJson = await loginRes.json()
        if (!loginRes.ok || !loginJson.token) {
          setError(loginJson.error || 'NIM tidak ditemukan')
          setLoading(false)
          return
        }
        token = loginJson.token
      }

      const res = await fetch('/api/absensi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId: sessionId.trim() }),
      })
      const json = await res.json()

      if (res.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('mahasiswa_session')
        setError('Sesi kamu sudah habis, silakan login ulang...')
        setTimeout(() => window.location.href = '/login', 2000)
        return
      }

      if (!res.ok || !json.success) {
        setError(json.error || `Error ${res.status}`)
        return
      }

      setResult(json.data)
    } catch {
      setError('Tidak dapat terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <CheckCircle2 size={48} className="mx-auto mb-3" style={{ color: '#22c55e' }} />
        <p className="font-bold text-base mb-1" style={{ color: '#22c55e' }}>Absensi Berhasil!</p>
        <p className="text-sm font-medium mt-3">{result.nama}</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{result.mataKuliah}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Pertemuan {result.pertemuan} · {result.tanggal} · {result.waktu}
        </p>
        {/* Tambah ini */}
        <button
          onClick={() => window.location.href = '/login'}
          {...pressProps}
          className="mt-5 w-full py-2.5 rounded-xl text-sm font-medium"
          style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
          Kembali
        </button>
      </div>
    </div>
  )
}

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <p className="text-4xl mb-2">📄</p>
          <h2 className="text-lg font-bold">Tandai Kehadiran</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {isLoggedIn && mahasiswa ? `${mahasiswa.nama} · ${mahasiswa.nim}` : 'Masukkan NIM untuk absen'}
          </p>
        </div>

        <div className="rounded-2xl p-5 space-y-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

          {!isLoggedIn && (
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                NIM
              </label>
              <input type="text" value={nim} onChange={e => setNim(e.target.value)}
                placeholder="Masukkan NIM kamu"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{
                  background: 'var(--surface2)',
                  border: `1px solid ${nim ? 'var(--accent)' : 'var(--border)'}`,
                  color: 'var(--text)',
                }} />
            </div>
          )}

          {error && <p className="text-sm text-red-400">❌ {error}</p>}

          <button onClick={handleSubmit} {...pressProps}
            disabled={loading || (!isLoggedIn && !nim.trim())}
            className="w-full py-3 rounded-xl text-sm font-semibold"
            style={{
              background: 'var(--accent)',
              color: 'white',
              opacity: loading || (!isLoggedIn && !nim.trim()) ? 0.6 : 1,
            }}>
            {loading ? '⏳ Menyimpan...' : '✓ Tandai Hadir'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AbsenPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--background)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Memuat...</p>
      </div>
    }>
      <AbsenContent />
    </Suspense>
  )
}