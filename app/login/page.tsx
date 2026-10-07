'use client'
import { Eye, EyeOff } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  saveMahasiswaSession, saveAdminSession, saveBendaharaSession,
  getMahasiswaSession, getAdminSession, getBendaharaSession,
} from '@/lib/auth'
import { pressProps } from '@/components/pressProps'

export default function LoginPage() {
  const router = useRouter()
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Angka semua = NIM mahasiswa. Ada huruf = username staff (butuh password).
  const value = id.trim()
  const isNim = /^\d+$/.test(value)
  const needsPassword = value !== '' && !isNim

  useEffect(() => {
    if (getMahasiswaSession()) { router.replace('/mahasiswa/absensi'); return }
    if (getAdminSession()) { router.replace('/admin/absensi'); return }
    if (getBendaharaSession()) { router.replace('/bendahara/kas'); return }
  }, [router])

  async function loginMahasiswa() {
    const res = await fetch('/api/auth/mahasiswa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nim: value }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok || !json) { setError(json?.error || `Server error (${res.status})`); return }
    saveMahasiswaSession(json.mahasiswa)
    localStorage.setItem('token', json.token)
    router.push('/mahasiswa/absensi')
  }

  async function loginStaff() {
    const res = await fetch('/api/auth/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: value, password }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok || !json) { setError(json?.error || `Server error (${res.status})`); return }

    if (json.role === 'bendahara') {
      saveBendaharaSession(json.bendahara, json.token)
      router.push('/bendahara/kas')
    } else {
      saveAdminSession(json.admin, json.token)
      router.push('/admin/absensi')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (isNim) await loginMahasiswa()
      else await loginStaff()
    } catch {
      setError('Tidak bisa terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = { background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1f331a 0%, #0f1710 60%)' }}>
      <div className="w-full max-w-sm fade-in">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 overflow-hidden"
            style={{ boxShadow: '0 0 40px #63f19950' }}>
            <img src="/logo.png" alt="STIE-PB" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-white">KELAS 25MA 2</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Sistem Kelas Digital</p>
        </div>

        {/* Form */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                NIM atau username
              </label>
              <input
                type="text"
                value={id}
                onChange={e => { setId(e.target.value); setError('') }}
                placeholder="Masukkan NIM kamu"
                required
                autoCapitalize="none"
                autoCorrect="off"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            {needsPassword && (
              <div className="fade-in">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    {...pressProps}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-muted)' }}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button type="submit" disabled={loading}
              {...pressProps}
              className={`w-full py-3 rounded-xl text-sm font-semibold ${loading ? 'opacity-60' : ''}`}
              style={{ background: 'var(--accent)', color: 'white' }}>
              {loading ? 'Memeriksa...' : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}