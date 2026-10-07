'use client'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  saveMahasiswaSession, saveAdminSession, saveBendaharaSession,
  getMahasiswaSession, getAdminSession, getBendaharaSession,
} from '@/lib/auth'
import { pressProps } from '@/components/pressProps'

// Field filled + perbaikan autofill Chrome (biar tidak jadi biru muda / teks hitam)
const loginCss = `
.login-field {
  width: 100%;
  height: 56px;
  padding: 0 16px;
  border-radius: 16px;
  font-size: 16px;
  outline: none;
  color: var(--text);
  background: var(--surface2);
  border: 1px solid var(--border);
  color-scheme: dark;
  transition: border-color .15s, box-shadow .15s;
}
.login-field::placeholder { color: var(--text-dim); }
.login-field:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-soft);
}
.login-field:-webkit-autofill,
.login-field:-webkit-autofill:hover,
.login-field:-webkit-autofill:focus {
  -webkit-text-fill-color: var(--text);
  caret-color: var(--text);
  -webkit-box-shadow: 0 0 0 1000px var(--surface2) inset;
  transition: background-color 9999s ease-in-out 0s;
}
`

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

  return (
    <div className="flex flex-col justify-center px-7 py-10"
      style={{ minHeight: '100dvh', background: 'radial-gradient(ellipse at 50% 0%, #1f331a 0%, #0f1710 60%)' }}>
      <style>{loginCss}</style>

      <div className="w-full max-w-sm mx-auto fade-in">

        {/* Header */}
        <div className="mb-10">
          <div className="w-16 h-16 rounded-full overflow-hidden mb-6"
            style={{ boxShadow: '0 0 40px #63f19950' }}>
            <img src="/logo.png" alt="STIE-PB" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-[34px] leading-tight font-bold tracking-tight text-white">Kelas 25MA 2</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Sistem Kelas Digital</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-id" className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              NIM atau username
            </label>
            <input
              id="login-id"
              type="text"
              value={id}
              onChange={e => { setId(e.target.value); setError('') }}
              placeholder="Masukkan NIM kamu"
              required
              autoCapitalize="none"
              autoCorrect="off"
              className="login-field"
            />
          </div>

          {needsPassword && (
            <div className="fade-in">
              <label htmlFor="login-password" className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="login-field"
                  style={{ paddingRight: 48 }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  {...pressProps}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: 'var(--text-muted)' }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button type="submit" disabled={loading}
            {...pressProps}
            className={`w-full h-14 rounded-2xl text-base font-semibold flex items-center justify-center gap-2 ${loading ? 'opacity-60' : ''}`}
            style={{ background: 'var(--accent)', color: 'white', boxShadow: '0 10px 24px -10px var(--accent)' }}>
            {loading ? 'Memeriksa...' : <>Masuk <ArrowRight size={18} /></>}
          </button>
        </form>
      </div>
    </div>
  )
}
