'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Wallet, Users } from 'lucide-react'
import { pressProps } from '@/components/pressProps'
import { useSwipeNav } from '@/components/useSwipeNav'
import { getBendaharaSession, clearSession } from '@/lib/auth'

const navItems = [
  { href: '/bendahara/kas', label: 'Kas', icon: <Wallet size={20} /> },
  { href: '/bendahara/iuran', label: 'Iuran', icon: <Users size={20} /> },
]

export default function BendaharaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [nama, setNama] = useState('')
  const swipe = useSwipeNav(navItems.map(n => n.href))

  useEffect(() => {
    const session = getBendaharaSession()
    if (!session) { router.replace('/login'); return }
    setNama(session.nama || session.username)
  }, [router])

  const handleLogout = () => { clearSession(); router.replace('/login') }

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* Sidebar — desktop */}
      <aside className="hidden md:flex w-56 flex-col py-6 px-4 shrink-0 min-h-screen"
        style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
        <div className="mb-8">
          <div className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>STIE APP</div>
          <div className="text-lg font-bold">Panel Bendahara</div>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <button key={item.href} onClick={() => router.push(item.href)} {...pressProps}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm"
                style={{
                  background: active ? 'var(--accent-soft)' : 'transparent',
                  color: active ? 'var(--accent-light)' : 'var(--text-muted)',
                  border: 'none',
                }}>
                {item.icon}{item.label}
              </button>
            )
          })}
        </nav>
        <div className="pt-4 mt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Login sebagai</div>
          <div className="text-sm font-medium truncate mb-2">{nama}</div>
          <button onClick={handleLogout} {...pressProps} className="text-xs px-2.5 py-1.5 rounded-lg"
            style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            Keluar →
          </button>
        </div>
      </aside>

      {/* Topbar — mobile */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 rounded-b-3xl"
        style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent-light)' }}>
            <Wallet size={16} />
          </div>
          <span className="font-bold text-sm">Bendahara</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs truncate max-w-[100px]" style={{ color: 'var(--text-muted)' }}>{nama}</span>
          <button onClick={handleLogout} {...pressProps} className="text-xs px-3 py-1.5 rounded-full"
            style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            Keluar
          </button>
        </div>
      </div>

      <main ref={swipe.ref} {...swipe.handlers} style={{ ...swipe.style }}
        className="flex-1 w-full p-4 md:p-8 pb-28 md:pb-8 overflow-x-hidden overflow-y-auto">
        {children}
      </main>

      {/* Bottom nav — mobile */}
      <nav className="md:hidden fixed bottom-3 left-3 right-3 z-50 flex items-center justify-around px-2 py-2 rounded-3xl shadow-lg"
        style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
        {navItems.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <button key={item.href} onClick={() => router.push(item.href)} {...pressProps}
              className="flex flex-col items-center gap-1 py-1.5 px-6 rounded-2xl"
              style={{
                background: active ? 'var(--accent-soft)' : 'transparent',
                color: active ? 'var(--accent-light)' : 'var(--text-muted)',
                border: 'none',
              }}>
              <span className="flex justify-center items-center h-6">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
