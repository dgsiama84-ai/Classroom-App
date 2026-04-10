'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { getMahasiswaSession, clearSession } from '@/lib/auth'

const navItems = [
  { href: '/mahasiswa/absensi', label: 'Absensi', icon: '📋' },
  { href: '/mahasiswa/tugas', label: 'Tugas', icon: '📚' },
  { href: '/mahasiswa/riwayat', label: 'Riwayat', icon: '📊' },
  { href: '/mahasiswa/ai', label: 'AI Tutor', icon: '🤖' },
]

export default function MahasiswaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [nama, setNama] = useState('')

  useEffect(() => {
    const session = getMahasiswaSession()
    if (!session) {
      router.replace('/login')
      return
    }
    setNama(session.nama)
  }, [router])

  function handleLogout() {
    clearSession()
    router.replace('/login')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      {/* Topbar */}
      <div className="sticky top-0 z-40 flex items-center justify-between px-4 py-3"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <span className="text-lg">🎓</span>
          <span className="font-bold text-sm">25MA 2</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs truncate max-w-[120px]" style={{ color: 'var(--text-muted)' }}>{nama}</span>
          <button onClick={handleLogout}
            className="text-xs px-2.5 py-1.5 rounded-lg"
            style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            Keluar
          </button>
        </div>
      </div>

      {/* Content — padding bottom agar tidak ketutup navbar */}
      <main className="flex-1 pb-20 overflow-y-auto">
        {children}
      </main>

      {/* Bottom Navbar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        {navItems.map(item => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href}
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-all"
              style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}>
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}