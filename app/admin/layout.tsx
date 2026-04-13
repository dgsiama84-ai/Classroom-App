'use client'
import { pressProps } from '@/components/pressProps'
import { getAdminSession, clearSession } from '@/lib/auth'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ClipboardList, BookOpen, GraduationCap } from 'lucide-react'

const navItems = [
  { href: '/admin/absensi', label: 'Absensi', icon: <ClipboardList size={20} /> },
  { href: '/admin/tugas', label: 'Tugas', icon: <BookOpen size={20} /> },
  { href: '/admin/matkul', label: 'Mata Kuliah', icon: <GraduationCap size={20} /> },
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
            <button key={item.href}
              onClick={() => router.push(item.href)}
              {...pressProps}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
              style={{
                background: pathname === item.href ? 'var(--accent)' : 'transparent',
                color: pathname === item.href ? 'white' : 'var(--text-muted)',
                border: 'none',
              }}>
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="pt-4 mt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Login sebagai</div>
          <div className="text-sm font-medium truncate mb-2">{adminName}</div>
          <button onClick={handleLogout} {...pressProps}
            className="text-xs px-2.5 py-1.5 rounded-lg"
            style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
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
          <button onClick={handleLogout} {...pressProps}
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
            <button key={item.href}
              onClick={() => router.push(item.href)}
              {...pressProps}
              className="flex-1 flex flex-col items-center gap-1 py-3"
              style={{
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                background: 'none',
                border: 'none',
              }}>
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}