'use client'
import { pressProps } from '@/components/pressProps'
import { getAdminSession, clearSession } from '@/lib/auth'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ClipboardList, BookOpen, GraduationCap } from 'lucide-react'
import { useSwipeNav } from '@/components/useSwipeNav'

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
  const swipe = useSwipeNav(navItems.map(n => n.href))

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
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 rounded-b-3xl"
        style={{
          backgroundImage: 'linear-gradient(180deg, rgba(39,164,41,0.32), rgba(11,18,12,0))',
          backgroundColor: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
        }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
            style={{ background: 'var(--accent)', color: 'white' }}>
            {adminName.slice(0, 1).toUpperCase() || 'A'}
          </div>
          <span className="font-bold text-sm">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs truncate max-w-[100px]" style={{ color: 'var(--text-muted)' }}>{adminName}</span>
          <button onClick={handleLogout} {...pressProps}
            className="text-xs px-3 py-1.5 rounded-full"
            style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            Keluar
          </button>
        </div>
      </div>

      {/* Main content */}
      <main ref={swipe.ref} {...swipe.handlers} style={swipe.style} className="...">
  {children}
</main>

      {/* Bottom Navbar — hanya mobile, mengambang dengan highlight pill */}
      <nav className="md:hidden fixed bottom-3 left-3 right-3 z-50 flex items-center justify-around px-2 py-2 rounded-3xl shadow-lg"
        style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
        {navItems.map(item => {
          const isActive = pathname === item.href
          return (
            <button key={item.href}
              onClick={() => router.push(item.href)}
              {...pressProps}
              className="flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all"
              style={{
                background: isActive ? 'var(--accent)' : 'transparent',
                color: isActive ? 'white' : 'var(--text-muted)',
                border: 'none',
              }}>
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}