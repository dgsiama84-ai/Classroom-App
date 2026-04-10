'use client'
import { getAdminSession, clearSession } from '@/lib/auth'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

const navItems = [
  { href: '/admin/absensi', label: 'Absensi', icon: '📋' },
  { href: '/admin/tugas', label: 'Tugas', icon: '📝' },
  { href: '/admin/matkul', label: 'Mata Kuliah', icon: '📚' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [adminName, setAdminName] = useState('')

  useEffect(() => {
    const session = getAdminSession()
    if (!session) { router.replace('/login'); return }
    setAdminName(session.username)
  }, [router])

  const handleLogout = () => {
    clearSession()
    router.replace('/login')
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: 'var(--background)' }}>

      {/* Sidebar — hanya desktop */}
      <aside className="hidden md:flex w-56 flex-col py-6 px-4 shrink-0 min-h-screen"
        style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
        <div className="mb-8">
          <div className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>STIE APP</div>
          <div className="text-lg font-bold">Panel Ketua Tingkat</div>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map(item => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
              style={{
                background: pathname === item.href ? 'var(--accent)' : 'transparent',
                color: pathname === item.href ? 'white' : 'var(--text-muted)',
              }}>
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="pt-4 mt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Login sebagai</div>
          <div className="text-sm font-medium truncate">{adminName}</div>
          <button onClick={handleLogout}
            className="mt-3 w-full text-xs text-left transition-all"
            style={{ color: 'var(--text-muted)' }}>
            Keluar →
          </button>
        </div>
      </aside>

      {/* Topbar — hanya mobile */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <span className="font-bold text-sm">Admin</span>
        <div className="flex items-center gap-3">
          <span className="text-xs truncate max-w-[100px]" style={{ color: 'var(--text-muted)' }}>{adminName}</span>
          <button onClick={handleLogout}
            className="text-xs px-2.5 py-1.5 rounded-lg"
            style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            Keluar
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0 md:p-6">
        {children}
      </main>

      {/* Bottom Navbar — hanya mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex"
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