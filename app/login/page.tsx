'use client'
import { Eye, EyeOff } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { saveMahasiswaSession, saveAdminSession, getMahasiswaSession, getAdminSession } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'mahasiswa' | 'admin'>('mahasiswa')
  const [nim, setNim] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const mahasiswa = getMahasiswaSession()
    const admin = getAdminSession()
    if (mahasiswa) { router.replace('/mahasiswa/absensi'); return }
    if (admin) { router.replace('/admin/absensi'); return }
  }, [router])

  async function handleMahasiswaLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/mahasiswa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nim }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json.error); return }
    saveMahasiswaSession(json.mahasiswa)
    localStorage.setItem('token', json.token)
    router.push('/mahasiswa/absensi')
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json.error); return }
    saveAdminSession(json.admin)
    router.push('/admin/absensi')
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
          {(['mahasiswa', 'admin'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: mode === m ? 'var(--accent)' : 'transparent',
                color: mode === m ? 'white' : 'var(--text-muted)',
              }}>
              {m === 'mahasiswa' ? 'Mahasiswa' : 'Admin'}
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
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'} />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'var(--accent)', color: 'white', opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Memeriksa...' : 'Masuk'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="Username admin" required
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                    style={{ color: 'var(--text-muted)' }}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--accent)', color: 'white', opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Memeriksa...' : 'Masuk sebagai Admin'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}