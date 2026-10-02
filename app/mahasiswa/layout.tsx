'use client'
import { pressProps } from '@/components/pressProps'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getMahasiswaSession, clearSession } from '@/lib/auth'
import { ClipboardList, BookOpen, History, Bot, GraduationCap } from 'lucide-react'
import { useSwipeNav } from '@/components/useSwipeNav'

const navItems = [
  { href: '/mahasiswa/absensi', label: 'Absensi', icon: <ClipboardList size={20} /> },
  { href: '/mahasiswa/tugas', label: 'Tugas', icon: <BookOpen size={20} /> },
  { href: '/mahasiswa/riwayat', label: 'Riwayat', icon: <History size={20} /> },
  { href: '/mahasiswa/ai', label: 'Asisten', icon: <Bot size={20} /> },
]

export default function MahasiswaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [nama, setNama] = useState('')
  const swipe = useSwipeNav(navItems.map(n => n.href))
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
    <div className="min-h-screen flex flex-col overflow-x-hidden" style={{ background: 'var(--background)' }}>
      {/* Topbar */}
      <div className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 rounded-b-3xl"
        style={{
          backgroundImage: 'linear-gradient(180deg, rgba(39,164,41,0.32), rgba(11,18,12,0))',
          backgroundColor: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
        }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'var(--accent)', color: 'white' }}>
            <GraduationCap size={16} />
          </div>
          <span className="font-bold text-sm">25MA 2</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs truncate max-w-[120px]" style={{ color: 'var(--text-muted)' }}>{nama}</span>
          {/* Tombol keluar */}
<button onClick={handleLogout}
  {...pressProps}
  className="text-xs px-3 py-1.5 rounded-full"
  style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
  Keluar
</button>
        </div>
      </div>

      {/* Content — padding bottom agar tidak ketutup navbar */}
      <main {...swipe.handlers} style={swipe.style} className="flex-1 pb-24 overflow-y-auto">
            {children}
      </main>

      {/* Bottom nav — mengambang, item aktif dapat highlight pill */}
      <nav className="fixed bottom-3 left-3 right-3 z-50 flex items-center justify-around px-2 py-2 rounded-3xl shadow-lg"
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