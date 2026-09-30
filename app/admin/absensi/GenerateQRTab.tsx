'use client'
import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import Select from '@/components/select'
import Card from '@/components/Card'
import { pressProps } from '@/components/pressProps'
import { QrCode, Timer, Loader2, Lock, AlertTriangle } from 'lucide-react'
import { useMatkulList } from '@/lib/hooks/useMatkulList'
import { QRSession, PertemuanLog } from '@/lib/types'

const formatCountdown = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export default function GenerateQRTab() {
  const matkulList = useMatkulList(false)

  const [activeSession, setActiveSession] = useState<QRSession | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [pertemuanLogs, setPertemuanLogs] = useState<PertemuanLog[]>([])
  const [loading, setLoading] = useState(false)
  const [lockingPertemuan, setLockingPertemuan] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [copied, setCopied] = useState(false)
  const [confirmLock, setConfirmLock] = useState<number | null>(null)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeSessionRef = useRef<QRSession | null>(null)

  const [matkulId, setMatkulId] = useState('')
  const [kelas, setKelas] = useState('')
  const [pertemuan, setPertemuan] = useState('')
  const [durasi, setDurasi] = useState('15')

  // Pulihkan sesi QR aktif dari localStorage (biar nggak ilang kalau halaman di-refresh)
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

  const confirmLog = confirmLock !== null ? pertemuanLogs.find(p => p.pertemuan === confirmLock) : null

  return (
    <div className="space-y-4">
      {/* Modal Konfirmasi Lock */}
      {confirmLock !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overlay-enter"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <Card variant="overlay" className="w-full max-w-xs p-5 modal-enter">
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: '#ef444420' }}>
                <AlertTriangle size={24} style={{ color: '#ef4444' }} />
              </div>
              <p className="font-bold text-base">Kunci Pertemuan {confirmLock}?</p>
              <p className="text-sm mt-1.5" style={{ color: 'var(--text-muted)' }}>
                Pertemuan ini akan dikunci. QR absensi tidak bisa digunakan lagi dan data tidak bisa diubah.
              </p>
              {confirmLog && (
                <p className="text-xs mt-2 px-3 py-1.5 rounded-lg"
                  style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>
                  {confirmLog.jumlah_absensi} mahasiswa sudah absen
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmLock(null)}
                {...pressProps}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                Batal
              </button>
              <button
                onClick={() => {
                  handleLock(confirmLock, true)
                  setConfirmLock(null)
                }}
                {...pressProps}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5"
                style={{ background: '#ef4444', color: 'white' }}>
                <Lock size={14} /> Kunci
              </button>
            </div>
          </Card>
        </div>
      )}

      <Card className="p-4 space-y-3">
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
      </Card>

      {matkulId && kelas && pertemuanLogs.length > 0 && (
        <Card className="p-4 space-y-2">
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
                  onClick={() => setConfirmLock(log.pertemuan)}
                  {...pressProps}
                  disabled={lockingPertemuan === log.pertemuan}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                  style={{ background: '#ef444420', color: '#ef4444' }}>
                  {lockingPertemuan === log.pertemuan
                    ? <Loader2 size={14} className="animate-spin" />
                    : <span className="flex items-center gap-1"><Lock size={13} /> Kunci</span>
                  }
                </button>
              ) : (
                <span className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{ background: '#22c55e20', color: '#22c55e' }}>
                  <Lock size={13} /> Terkunci
                </span>
              )}
            </div>
          ))}
        </Card>
      )}

      {qrDataUrl && activeSession && (
        <Card className="qr-appear p-5 text-center">
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
        </Card>
      )}
    </div>
  )
}