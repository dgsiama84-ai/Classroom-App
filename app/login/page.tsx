'use client'
import { Eye, EyeOff, ArrowRight, CalendarCheck, Wallet, ClipboardList } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  saveMahasiswaSession, saveAdminSession, saveBendaharaSession,
  getMahasiswaSession, getAdminSession, getBendaharaSession,
} from '@/lib/auth'
import { pressProps } from '@/components/pressProps'

// Semua warna pakai variabel root. Termasuk perbaikan autofill Chrome.
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
@keyframes login-sheet-up {
  from { transform: translateY(32px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
.login-sheet { animation: login-sheet-up .45s cubic-bezier(.2,.8,.2,1) both; }
@media (prefers-reduced-motion: reduce) { .login-sheet { animation: none; } }
`

const FITUR = [
  { icon: CalendarCheck, label: 'Absensi' },
  { icon: ClipboardList, label: 'Tugas' },
  { icon: Wallet, label: 'Kas' },
]

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
    <div className="relative flex flex-col overflow-hidden" style={{ minHeight: '100dvh' }}>
      <style>{loginCss}</style>

      {/* Hiasan geometris: lingkaran konsentris di pojok kanan atas */}
      <div aria-hidden className="pointer-events-none absolute" style={{ top: -150, right: -150 }}>
        {[300, 220, 140].map(s => (
          <div key={s} className="absolute rounded-full"
            style={{ width: s * 2, height: s * 2, top: 300 - s, left: 300 - s, border: '1px solid var(--border)' }} />
        ))}
        <div style={{ width: 600, height: 600 }} />
      </div>

      {/* Hero */}
      <section className="relative flex-1 flex flex-col justify-end px-7 pt-14 pb-10 min-h-0">
        <div className="w-16 h-16 rounded-full p-1 mb-8 shrink-0"
          style={{ background: 'var(--accent-soft)', border: '1px solid var(--border)' }}>
          <img src="/logo.png" alt="STIE-PB" className="w-full h-full rounded-full object-cover" />
        </div>

        <p className="text-2xl font-medium" style={{ color: 'var(--text-muted)' }}>Kelas</p>
        <h1 className="font-extrabold tracking-tight leading-none"
          style={{ fontSize: 'clamp(52px, 17vw, 72px)', color: 'var(--text)' }}>
          25MA 2
        </h1>
        <p className="text-sm mt-3" style={{ color: 'var(--text-muted)' }}>Sistem Kelas Digital</p>

        <div className="flex flex-wrap gap-2 mt-6">
          {FITUR.map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <Icon size={14} style={{ color: 'var(--accent-light)' }} /> {label}
            </span>
          ))}
        </div>
      </section>

      {/* Sheet form di bawah, gampang dijangkau jempol */}
      <section className="login-sheet relative px-7 pt-8 pb-10 shrink-0"
        style={{
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          borderRadius: '32px 32px 0 0',
        }}>
        <div className="w-full max-w-sm mx-auto">
          <h2 className="text-xl font-bold mb-1">Masuk</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            Mahasiswa cukup pakai NIM. Staff pakai username dan password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-id" className="sr-only">NIM atau username</label>
              <input
                id="login-id"
                type="text"
                value={id}
                onChange={e => { setId(e.target.value); setError('') }}
                placeholder="NIM atau username"
                required
                autoCapitalize="none"
                autoCorrect="off"
                className="login-field"
              />
            </div>

            {needsPassword && (
              <div className="fade-in">
                <label htmlFor="login-password" className="sr-only">Password</label>
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

            {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}

            <button type="submit" disabled={loading}
              {...pressProps}
              className={`w-full h-14 rounded-2xl text-base font-semibold flex items-center justify-center gap-2 ${loading ? 'opacity-60' : ''}`}
              style={{
                background: 'var(--accent)',
                color: 'var(--on-accent)',
                boxShadow: '0 10px 24px -10px var(--accent)',
              }}>
              {loading ? 'Memeriksa...' : <>Masuk <ArrowRight size={18} /></>}
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
