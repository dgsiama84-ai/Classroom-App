'use client'
import { getAdminSession } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { pressProps } from '@/components/pressProps'
import { QrCode, BarChart2 } from 'lucide-react'
import GenerateQRTab from './GenerateQRTab'
import RekapTab from './RekapTab'

export default function AdminAbsensiPage() {
  const router = useRouter()
  const [adminNama, setAdminNama] = useState('')
  const [tab, setTab] = useState<'generate' | 'rekap'>('generate')

  useEffect(() => {
    const session = getAdminSession()
    if (!session) router.replace('/login')
    else setAdminNama(session.nama || session.username)
  }, [router])

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-1">Absensi</h2>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{adminNama}</p>

      <div className="flex rounded-xl p-1 mb-5" style={{ background: 'var(--surface)' }}>
        {(['generate', 'rekap'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} {...pressProps}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === t ? 'var(--accent)' : 'transparent',
              color: tab === t ? 'white' : 'var(--text-muted)',
            }}>
            {t === 'generate'
              ? <span className="flex items-center justify-center gap-1.5"><QrCode size={14} /> Generate QR</span>
              : <span className="flex items-center justify-center gap-1.5"><BarChart2 size={14} /> Rekap</span>
            }
          </button>
        ))}
      </div>

      {tab === 'generate' ? <GenerateQRTab /> : <RekapTab />}
    </div>
  )
}