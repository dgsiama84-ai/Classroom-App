'use client'
import { Eye, EyeOff } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { saveMahasiswaSession, saveAdminSession, saveBendaharaSession, getMahasiswaSession, getAdminSession, getBendaharaSession } from '@/lib/auth'
import { pressProps } from '@/components/pressProps'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'mahasiswa' | 'admin' | 'bendahara'>('mahasiswa')
  const [nim, setNim] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const mahasiswa = getMahasiswaSession()
    const admin = getAdminSession()
    const bendahara = getBendaharaSession()
    if (mahasiswa) { router.replace('/mahasiswa/absensi'); return }
    if (admin) { router.replace('/admin/absensi'); return }
    if (bendahara) { router.replace('/bendahara/kas'); return }
  }, [router])

  async function handleMahasiswaLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/mahasiswa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nim }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json) { setError(json?.error || `Server error (${res.status})`); return }
      saveMahasiswaSession(json.mahasiswa)
      localStorage.setItem('token', json.token)
      router.push('/mahasiswa/absensi')
    } catch {
      setError('Tidak bisa terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json) { setError(json?.error || `Server error (${res.status})`); return }
      saveAdminSession(json.admin)
      router.push('/admin/absensi')
    } catch {
      setError('Tidak bisa terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  async function handleBendaharaLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/bendahara', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json) { setError(json?.error || `Server error (${res.status})`); return }
      saveBendaharaSession(json.bendahara, json.token)
      router.push('/bendahara/kas')
    } catch {
      setError('Tidak bisa terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

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

        {/* Toggle */}
        <div className="flex rounded-xl p-1 mb-6" style={{ background: 'var(--surface)' }}>
          {(['mahasiswa', 'admin', 'bendahara'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); setPassword('') }}
              {...pressProps}
  className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
  style={{
    background: mode === m ? 'var(--accent)' : 'transparent',
    color: mode === m ? 'white' : 'var(--text-muted)',
              }}>
              {m === 'mahasiswa' ? 'Mahasiswa' : m === 'admin' ? 'Admin' : 'Bendahara'}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {mode === 'mahasiswa' ? (
            <form onSubmit={handleMahasiswaLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>NIM</label>
                <input type="text" value={nim} onChange={e => setNim(e.target.value)}
                  placeholder="Masukkan NIM kamu" required
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all active:scale-95 active:opacity-80"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'} />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
             <button type="submit" disabled={loading}
  {...pressProps}
  className={`w-full px-4 py-3 rounded-xl text-sm font-semibold ${loading ? 'opacity-60' : ''}`}
  style={{ background: 'var(--accent)', color: 'white' }}>
  {loading ? 'Memeriksa...' : 'Masuk'}
</button>
            </form>
          ) : (
            <form onSubmit={mode === 'bendahara' ? handleBendaharaLogin : handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                  placeholder={mode === 'bendahara' ? 'Username bendahara' : 'Username admin'} required
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Password" required
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
  {...pressProps}
  className="absolute right-3 top-1/2 -translate-y-1/2"
  style={{ color: 'var(--text-muted)' }}>
  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
</button>
                </div>
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button type="submit" disabled={loading}
  {...pressProps}
  className={`w-full py-3 rounded-xl text-sm font-semibold ${loading ? 'opacity-60' : ''}`}
  style={{ background: 'var(--accent)', color: 'white' }}>
  {loading ? 'Memeriksa...' : mode === 'bendahara' ? 'Masuk sebagai Bendahara' : 'Masuk sebagai Admin'}
</button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}