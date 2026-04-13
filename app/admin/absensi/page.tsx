'use client'
import { getAdminSession } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import QRCode from 'qrcode'
import { formatDate, formatTime } from '@/lib/utils'
import Select from '@/components/select'
import { pressProps } from '@/components/pressProps'
import { QrCode, Timer, Loader2, Download, CheckCircle2, Inbox, BarChart2 } from 'lucide-react'

interface MataKuliah { id: string; kode: string; nama: string; dosen?: string }
interface QRSession { id: string; mata_kuliah_id: string; kelas: string; pertemuan: number; expires_at: string }
interface AbsensiRecord {
  id: string; nim: string; nama: string; kelas: string
  pertemuan: number; tanggal: string; waktu: string
  mata_kuliah: { kode: string; nama: string }
}
interface RekapRecord {
  nim: string; nama: string; kelas: string
  hadir: boolean; status: 'hadir' | 'sakit' | 'izin' | 'alpa' | 'belum'
  waktu: string | null
}
interface PertemuanLog {
  pertemuan: number
  is_locked: boolean
  jumlah_absensi: number
}

export default function AdminAbsensiPage() {
  const router = useRouter()

  useEffect(() => {
  const session = getAdminSession()
  if (!session) router.replace('/login')
  else setAdminNama(session.nama || session.username)
}, [router])
  const [matkulList, setMatkulList] = useState<MataKuliah[]>([])
  const [activeSession, setActiveSession] = useState<QRSession | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [absensiList, setAbsensiList] = useState<AbsensiRecord[]>([])
  const [rekapPertemuan, setRekapPertemuan] = useState<RekapRecord[]>([])
  const [pertemuanLogs, setPertemuanLogs] = useState<PertemuanLog[]>([])
  const [loading, setLoading] = useState(false)
  const [adminNama, setAdminNama] = useState('')
  const [lockingPertemuan, setLockingPertemuan] = useState<number | null>(null)
  const [tab, setTab] = useState<'generate' | 'rekap'>('generate')
  const [timeLeft, setTimeLeft] = useState(0)
  const [copied, setCopied] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    inserted: number
    skipped: number
    mapped: { tab: string; matchedTo: string }[]
    unmapped: string[]
  } | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeSessionRef = useRef<QRSession | null>(null)

  const [matkulId, setMatkulId] = useState('')
  const [kelas, setKelas] = useState('')
  const [pertemuan, setPertemuan] = useState('')
  const [durasi, setDurasi] = useState('15')

  const [rekapMatkul, setRekapMatkul] = useState('')
  const [rekapPertemuanFilter, setRekapPertemuanFilter] = useState('')

  useEffect(() => {
    fetch('/api/matkul').then(r => r.json()).then(j => setMatkulList(j.data || []))
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('active_qr_session')
    const savedUrl = localStorage.getItem('active_qr_url')
    if (saved && savedUrl) {
      try {
        const session = JSON.parse(saved)
        const expires = new Date(session.expires_at.endsWith('Z') ? session.expires_at : session.expires_at + 'Z')
        if (expires > new Date()) {
          setActiveSession(session)
          setQrDataUrl(savedUrl)
        } else {
          localStorage.removeItem('active_qr_session')
          localStorage.removeItem('active_qr_url')
        }
      } catch {
        localStorage.removeItem('active_qr_session')
        localStorage.removeItem('active_qr_url')
      }
    }
  }, [])

  useEffect(() => {
    activeSessionRef.current = activeSession
  }, [activeSession])

  useEffect(() => {
    if (activeSession) {
      updateTimeLeft()
      timerRef.current = setInterval(updateTimeLeft, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [activeSession])

  // Load pertemuan logs saat matkul + kelas dipilih
  useEffect(() => {
    if (matkulId && kelas) loadPertemuanLogs()
    else setPertemuanLogs([])
  }, [matkulId, kelas])

  function updateTimeLeft() {
    const session = activeSessionRef.current
    if (!session) return
    const expiresAt = session.expires_at.endsWith('Z') ? session.expires_at : session.expires_at + 'Z'
    const diff = new Date(expiresAt).getTime() - Date.now()
    setTimeLeft(Math.max(0, Math.floor(diff / 1000)))
    if (diff <= 0) {
      clearInterval(timerRef.current!)
      setActiveSession(null)
      setQrDataUrl('')
      localStorage.removeItem('active_qr_session')
      localStorage.removeItem('active_qr_url')
    }
  }

  async function loadPertemuanLogs() {
    const params = new URLSearchParams({ mata_kuliah_id: matkulId, kelas: kelas.toUpperCase() })
    const res = await fetch(`/api/qr/pertemuan?${params}`)
    const json = await res.json()
    setPertemuanLogs(json.data || [])
  }

  async function handleLock(p: number, lock: boolean) {
    setLockingPertemuan(p)
    await fetch('/api/qr/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mata_kuliah_id: matkulId,
        kelas: kelas.toUpperCase(),
        pertemuan: p,
        is_locked: lock,
      }),
    })
    setLockingPertemuan(null)
    loadPertemuanLogs()

    // Kalau pertemuan yang di-lock adalah yang aktif, hapus QR
    if (lock && activeSession?.pertemuan === p) {
      setActiveSession(null)
      setQrDataUrl('')
      localStorage.removeItem('active_qr_session')
      localStorage.removeItem('active_qr_url')
    }
  }

  async function generateQR() {
    if (!matkulId || !kelas || !pertemuan) return
    setLoading(true)
    const res = await fetch('/api/qr/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mata_kuliah_id: matkulId,
        kelas: kelas.toUpperCase(),
        pertemuan: parseInt(pertemuan),
        durasi_menit: parseInt(durasi),
      }),
    })
    const json = await res.json()
    setLoading(false)

    if (!json.success) {
      alert(json.error || 'Gagal generate QR')
      return
    }

    setActiveSession(json.session)
    setCopied(false)
    const absenUrl = `${window.location.origin}/absen?token=${json.session.id}`
    const url = await QRCode.toDataURL(absenUrl, {
      width: 300, margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    })
    setQrDataUrl(url)
    localStorage.setItem('active_qr_session', JSON.stringify(json.session))
    localStorage.setItem('active_qr_url', url)
    loadPertemuanLogs()
  }

  function handleCopy() {
    if (!activeSession) return
    navigator.clipboard.writeText(`${window.location.origin}/absen?token=${activeSession.id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function loadRekap() {
    const params = new URLSearchParams({ admin: 'true' })
    if (rekapMatkul && rekapPertemuanFilter) {
      params.set('mata_kuliah_id', rekapMatkul)
      params.set('pertemuan', rekapPertemuanFilter)
      const res = await fetch(`/api/absensi?${params}`)
      const json = await res.json()
      setRekapPertemuan(json.data || [])
      setAbsensiList([])
      return
    }
    if (rekapMatkul) params.set('mata_kuliah_id', rekapMatkul)
    const res = await fetch(`/api/absensi?${params}`)
    const json = await res.json()
    setAbsensiList(json.data || [])
    setRekapPertemuan([])
  }

  async function importFromSheets() {
    setImporting(true)
    setImportResult(null)
    const res = await fetch('/api/admin/import-sheets', { method: 'POST' })
    const json = await res.json()
    setImporting(false)
    if (json.success) {
      setImportResult(json)
      loadRekap()
    }
  }

  useEffect(() => {
    if (tab === 'rekap') loadRekap()
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  const formatCountdown = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const statusColor = (s: string) => {
    if (s === 'hadir') return { text: 'text-green-400', bg: '#22c55e30', label: '✓ Hadir' }
    if (s === 'sakit') return { text: 'text-blue-400', bg: '#3b82f630', label: 'S Sakit' }
    if (s === 'izin') return { text: 'text-yellow-400', bg: '#eab30830', label: 'I Izin' }
    if (s === 'alpa') return { text: 'text-red-400', bg: '#ef444430', label: 'A Alpa' }
    return { text: 'text-gray-400', bg: '#ffffff10', label: '— Belum' }
  }

  // Pertemuan yang sudah locked tidak bisa dipilih
  const lockedPertemuan = pertemuanLogs.filter(p => p.is_locked).map(p => p.pertemuan)
  const pertemuanOptions = Array.from({ length: 16 }, (_, i) => {
    const num = i + 1
    const log = pertemuanLogs.find(p => p.pertemuan === num)
    const isLocked = log?.is_locked
    return {
      value: String(num),
      label: isLocked
        ? `Pertemuan ${num} (Terkunci)`
        : log
          ? `Pertemuan ${num} (${log.jumlah_absensi} absensi)`
          : `Pertemuan ${num}`,
      disabled: isLocked,
    }
  })

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

      {tab === 'generate' ? (
        <div className="space-y-4">
          <div className="rounded-2xl p-4 space-y-3"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>Mata Kuliah</label>
              <Select value={matkulId} onChange={setMatkulId} placeholder="Pilih mata kuliah..."
                options={matkulList.map(mk => ({ value: mk.id, label: `${mk.kode} — ${mk.nama}` }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>Kelas</label>
                <Select value={kelas} onChange={setKelas} placeholder="Pilih kelas..."
                  options={[{ value: 'A2', label: 'A2' }]} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>Pertemuan ke-</label>
                <Select
                  value={pertemuan}
                  onChange={val => {
                    const log = pertemuanLogs.find(p => p.pertemuan === parseInt(val))
                    if (log?.is_locked) return
                    setPertemuan(val)
                  }}
                  placeholder="Pilih..."
                  options={pertemuanOptions}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>Durasi QR (menit)</label>
              <div className="flex gap-2">
                {['5', '10', '15', '30'].map(d => (
                  <button key={d} onClick={() => setDurasi(d)} {...pressProps}
                    className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: durasi === d ? 'var(--accent)' : 'var(--surface2)',
                      color: durasi === d ? 'white' : 'var(--text-muted)',
                      border: '1px solid var(--border)',
                    }}>
                    {d}m
                  </button>
                ))}
              </div>
            </div>
            {/* Tombol generate */}
            <button
             onClick={generateQR} {...pressProps}
             disabled={!matkulId || !kelas || !pertemuan || loading}
             className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${loading ? 'btn-pulse' : ''}`}
             style={{
              background: matkulId && kelas && pertemuan ? 'var(--accent)' : 'var(--surface2)',
              color: matkulId && kelas && pertemuan ? 'white' : 'var(--text-muted)',
              }}>
                {loading
  ? <span className="flex items-center justify-center gap-1.5"><Loader2 size={16} className="animate-spin" /> Membuat QR...</span>
  : <span className="flex items-center justify-center gap-1.5"><QrCode size={16} /> Generate QR</span>
}
            </button>
          </div>

          {/* List pertemuan + lock */}
          {matkulId && kelas && pertemuanLogs.length > 0 && (
            <div className="rounded-2xl p-4 space-y-2"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>
                Status Pertemuan
              </p>
              {pertemuanLogs.map(log => (
                <div key={log.pertemuan}
                  className="flex items-center justify-between py-2 px-3 rounded-xl"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <div>
                    <p className="text-sm font-medium">Pertemuan {log.pertemuan}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {log.jumlah_absensi} absensi
                    </p>
                  </div>
                  {!log.is_locked ? (
                    <button
                    onClick={() => handleLock(log.pertemuan, true)} {...pressProps}
                    disabled={lockingPertemuan === log.pertemuan}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                    style={{ background: '#ef444420', color: '#ef4444' }}>
                      {lockingPertemuan === log.pertemuan ? '...' : '🔒 Lock'}
                      </button>
                      ) : (
                 <span className="text-xs px-3 py-1.5 rounded-lg font-medium"
                     style={{ background: '#22c55e20', color: '#22c55e' }}>
                       Terkunci
                 </span>
                    )}
                 </div>
              ))}
            </div>
          )}

          {qrDataUrl && activeSession && (
             <div className="qr-appear rounded-2xl p-5 text-center"
    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <img src={qrDataUrl} alt="QR Code" className="mx-auto rounded-xl mb-4" style={{ width: 220 }} />
              <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl text-xs font-mono"
                style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
                <span className="truncate flex-1 text-left" style={{ color: 'var(--text-muted)' }}>
                  {`${window.location.origin}/absen?token=${activeSession.id}`}
                </span>
                <button onClick={handleCopy} {...pressProps}
                  className="shrink-0 px-2 py-1 rounded-lg font-medium text-xs transition-all"
                  style={{ background: copied ? '#22c55e' : 'var(--accent)', color: 'white' }}>
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
              <div className="flex justify-center mb-3">
                <span className={`text-2xl font-bold tabular-nums font-mono px-4 py-1.5 rounded-xl ${timeLeft < 60 ? 'text-red-400' : 'text-green-400'}`}
                  style={{ background: timeLeft < 60 ? '#ef444415' : '#22c55e15' }}>
                  <span className="flex items-center justify-center gap-1.5"><Timer size={18} />{formatCountdown(timeLeft)}</span>
                </span>
              </div>
              <p className="text-sm font-medium">
                {matkulList.find(m => m.id === activeSession.mata_kuliah_id)?.nama}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Kelas {activeSession.kelas} · Pertemuan {activeSession.pertemuan}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="rounded-2xl p-4 mb-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              Sync dari Google Sheets
            </p>
            <button onClick={importFromSheets} disabled={importing} {...pressProps}
            className="w-full py-2.5 rounded-xl text-sm font-medium"
             style={{ background: 'var(--accent)', color: 'white' }}>
              {importing
  ? <span className="flex items-center justify-center gap-1.5"><Loader2 size={16} className="animate-spin" /> Mengimpor...</span>
  : <span className="flex items-center justify-center gap-1.5"><Download size={16} /> Import Data Sheets</span>
}
            </button>
            {importResult && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                  <span className="flex items-center justify-center gap-1.5"><CheckCircle2 size={13} style={{ color: '#22c55e' }} />{importResult.inserted} diimport · {importResult.skipped} dilewati</span>
                </p>
                {importResult.mapped.map(m => (
                  <p key={m.tab} className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    ✓ {m.tab} → {m.matchedTo}
                  </p>
                ))}
                {importResult.unmapped.length > 0 && importResult.unmapped.map(t => (
                  <p key={t} className="text-xs text-red-400">✗ {t} — tidak cocok</p>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl p-4 mb-4 space-y-3"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>Mata Kuliah</label>
                <Select value={rekapMatkul} onChange={setRekapMatkul} placeholder="Semua"
                  options={matkulList.map(mk => ({ value: mk.id, label: mk.kode }))} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>Pertemuan</label>
                <Select value={rekapPertemuanFilter} onChange={setRekapPertemuanFilter} placeholder="Semua"
                  options={Array.from({ length: 16 }, (_, i) => ({
                    value: String(i + 1), label: `Pertemuan ${i + 1}`
                  }))} />
              </div>
           </div>
             <button onClick={loadRekap} {...pressProps}
             className="w-full py-2.5 rounded-xl text-sm font-medium"
               style={{ background: 'var(--accent)', color: 'white' }}>
                Tampilkan
              </button>
           </div>

          {rekapPertemuan.length > 0 ? (
            <div>
              <div className="flex gap-2 mb-3">
                {(['hadir', 'sakit', 'izin', 'alpa'] as const).map(s => {
                  const c = statusColor(s)
                  return (
                    <div key={s} className="flex-1 rounded-xl px-2 py-2 text-center"
                      style={{ background: c.bg.replace('30', '15'), border: `1px solid ${c.bg}` }}>
                      <p className={`text-lg font-bold ${c.text}`}>
                        {rekapPertemuan.filter(m => m.status === s).length}
                      </p>
                      <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{s}</p>
                    </div>
                  )
                })}
              </div>
              <div className="space-y-2">
                {rekapPertemuan.map(item => {
                  const c = statusColor(item.status)
                  return (
                    <div key={item.nim} className="rounded-xl px-4 py-3 flex items-center justify-between"
                      style={{ background: 'var(--surface)', border: `1px solid ${c.bg}` }}>
                      <div>
                        <p className="text-sm font-medium">{item.nama}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.nim} · Kelas {item.kelas}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-medium ${c.text}`}>{c.label}</span>
                        {item.waktu && item.status === 'hadir' && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{formatTime(item.waktu)}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : absensiList.length === 0 ? (
            <div className="text-center py-12">
              <Inbox size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-muted)' }}>Belum ada data absensi</p>
            </div>
          ) : (
            <div>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{absensiList.length} data ditemukan</p>
              <div className="space-y-2">
                {absensiList.map(item => (
                  <div key={item.id} className="rounded-xl px-4 py-3 flex items-center justify-between"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <div>
                      <p className="text-sm font-medium">{item.nama}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {item.nim} · Kelas {item.kelas} · Pertemuan {item.pertemuan}
                      </p>
                    </div>
                    <div className="text-right" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}