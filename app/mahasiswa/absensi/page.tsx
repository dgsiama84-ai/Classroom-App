'use client'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import jsQR from 'jsqr'
import { pressProps } from '@/components/pressProps'
import { CheckCircle2, Camera, Image as ImageIcon } from 'lucide-react'

interface AbsensiResult {
  nama: string
  mataKuliah: string
  pertemuan: number
  tanggal: string
  waktu: string
}

export default function AbsenPage() {
  const searchParams = useSearchParams()
  const galeriRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [sessionId, setSessionId] = useState('')
  const [nim, setNim] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [mahasiswa, setMahasiswa] = useState<{ nama: string; nim: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false) // untuk upload file
  const [liveScanning, setLiveScanning] = useState(false) // untuk live kamera
  const [result, setResult] = useState<AbsensiResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setMahasiswa({ nama: payload.nama, nim: payload.nim })
        setIsLoggedIn(true)
      } catch {
        setIsLoggedIn(false)
      }
    }
  }, [])

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) setSessionId(token)
  }, [searchParams])

  useEffect(() => () => stopCamera(), [])

  function stopCamera() {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    setLiveScanning(false)
  }

  async function startLiveScan() {
    setLiveScanning(true)
    setError('')
    setSessionId('')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (!videoRef.current) return
      videoRef.current.srcObject = stream
      await videoRef.current.play()

      scanIntervalRef.current = setInterval(() => {
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas || video.readyState !== 4) return

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!
        ctx.drawImage(video, 0, 0)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, canvas.width, canvas.height)

        if (code?.data) {
          stopCamera()
          extractSessionId(code.data)
        }
      }, 300)
    } catch {
      setError('Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.')
      setLiveScanning(false)
    }
  }

  function extractSessionId(data: string) {
    try {
      const url = new URL(data)
      const t = url.searchParams.get('token') || url.searchParams.get('session')
      setSessionId(t || data.trim())
    } catch {
      setSessionId(data.trim())
    }
  }

  async function handleScanFile(file: File) {
    setScanning(true)
    setError('')

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const MAX = 800
        let w = img.width, h = img.height
        if (w > MAX || h > MAX) {
          const ratio = Math.min(MAX / w, MAX / h)
          w = Math.round(w * ratio)
          h = Math.round(h * ratio)
        }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        setTimeout(() => {
          const imageData = canvas.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, w, h)
          const code = jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' })
          if (code?.data) {
            extractSessionId(code.data)
          } else {
            setError('QR tidak terbaca. Coba foto lebih dekat atau terang.')
          }
          setScanning(false)
        }, 50)
      }
      img.src = e.target!.result as string
    }
    reader.readAsDataURL(file)
  }

  async function handleSubmit() {
    if (!sessionId.trim()) { setError('Scan QR atau masukkan session ID'); return }
    if (!isLoggedIn && !nim.trim()) { setError('Masukkan NIM kamu'); return }

    setLoading(true)
    setError('')

    try {
      let token = localStorage.getItem('token')

      if (!token) {
        const loginRes = await fetch('/api/auth/mahasiswa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nim: nim.trim() }),
        })
        const loginJson = await loginRes.json()
        if (!loginRes.ok || !loginJson.token) {
          setError(loginJson.error || 'NIM tidak ditemukan')
          setLoading(false)
          return
        }
        token = loginJson.token
      }

      const res = await fetch('/api/absensi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId: sessionId.trim() }),
      })
      const json = await res.json()

      if (!res.ok || !json.success) {
        setError(json.error || `Error ${res.status}`)
        return
      }

      setResult(json.data)
      setSessionId('')
      setNim('')
    } catch {
      setError('Tidak dapat terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'var(--background)' }}>
        <div className="w-full max-w-sm rounded-2xl p-6 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <CheckCircle2 size={48} className="mx-auto mb-3" style={{ color: '#22c55e' }} />
          <p className="font-bold text-base mb-1" style={{ color: '#22c55e' }}>Absensi Berhasil!</p>
          <p className="text-sm font-medium mt-3">{result.nama}</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{result.mataKuliah}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Pertemuan {result.pertemuan} · {result.tanggal} · {result.waktu}
          </p>
          <button onClick={() => setResult(null)} {...pressProps}
            className="w-full mt-6 py-3 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--accent)', color: 'white' }}>
            Ok
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 max-w-sm mx-auto"
      style={{ background: 'var(--background)' }}>

      <h2 className="text-lg font-bold mb-1">Scan QR Absensi</h2>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        {isLoggedIn && mahasiswa ? `${mahasiswa.nama} · ${mahasiswa.nim}` : 'Upload foto QR'}
      </p>

      <div className="rounded-2xl p-4 space-y-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

        {/* NIM input — hanya kalau belum login */}
        {!isLoggedIn && (
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>
              NIM
            </label>
            <input type="text" value={nim} onChange={e => setNim(e.target.value)}
              placeholder="Masukkan NIM kamu"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: 'var(--surface2)',
                border: `1px solid ${nim ? 'var(--accent)' : 'var(--border)'}`,
                color: 'var(--text)',
              }} />
          </div>
        )}

        {/* Live scanner */}
        {liveScanning && (
          <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '1' }}>
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-indigo-400 rounded-xl opacity-80" />
            </div>
          </div>
        )}

        {/* 2 tombol card — hanya saat tidak live scan */}
        {!liveScanning && (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={startLiveScan} {...pressProps}
              className="flex flex-col items-center gap-2 py-5 rounded-xl transition-all"
              style={{ background: 'var(--surface2)', border: '2px dashed var(--border)' }}>
              <Camera size={32} style={{ color: 'var(--text-muted)' }} />
              <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>Scan Live</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Buka kamera</span>
            </button>
            <button onClick={() => { if (galeriRef.current) galeriRef.current.click() }}disabled={scanning} {...pressProps}
              className="flex flex-col items-center gap-2 py-5 rounded-xl transition-all"
              style={{ background: 'var(--surface2)', border: '2px dashed var(--border)' }}>
              <ImageIcon size={32} style={{ color: 'var(--text-muted)' }} />
              <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>Upload QR</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Pilih dari galeri</span>
            </button>
          </div>
        )}

        {/* Batal live scan */}
        {liveScanning && (
          <button onClick={stopCamera} {...pressProps}
            className="w-full py-3 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>
            Batal
          </button>
        )}

        {scanning && (
          <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>⏳ Membaca QR...</p>
        )}

        {/* Divider + session ID + submit — sembunyikan saat live scan */}
        {!liveScanning && (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>atau tempel kode manual</span>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            </div>

            <input type="text" value={sessionId} onChange={e => setSessionId(e.target.value)}
              placeholder="Session ID (dari URL QR)"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono"
              style={{
                background: 'var(--surface2)',
                border: `1px solid ${sessionId ? 'var(--accent)' : 'var(--border)'}`,
                color: 'var(--text)',
              }} />

            {error && <p className="text-sm text-red-400">❌ {error}</p>}

            <button onClick={handleSubmit} disabled={loading} {...pressProps}
              className="w-full py-3 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--accent)', color: 'white', opacity: loading ? 0.6 : 1 }}>
              {loading ? '⏳ Menyimpan...' : '✓ Tandai Hadir'}
            </button>
          </>
        )}
      </div>

      <input ref={galeriRef} type="file" accept="image/*"
        className="hidden"
        onChange={e => { if (e.target.files?.[0]) handleScanFile(e.target.files[0]); e.target.value = '' }} />
    </div>
  )
}