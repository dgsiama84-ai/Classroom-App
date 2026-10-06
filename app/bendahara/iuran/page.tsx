'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, AlertCircle, Clock, Search, Copy, Check } from 'lucide-react'
import { getBendaharaSession, clearSession } from '@/lib/auth'
import { pressProps } from '@/components/pressProps'
import Card from '@/components/Card'
import Spinner from '@/components/Spinner'
import { formatRupiah, parseRupiah, formatTanggalPendek } from '@/lib/kas'

interface Periode {
  id: string
  nama: string
  nominal: number
  sudah_bayar: number
  terkumpul: number
}

interface MahasiswaStatus {
  nim: string
  nama: string
  kelas: string
  status: 'lunas' | 'kurang' | 'belum bayar'
  totalBayar: number
  sisa: number
  riwayat: Array<{ id: string; jumlah: number; tanggal: string }>
}

interface DetailPeriode {
  id: string
  nama: string
  nominal: number
}

async function iuranFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('bendahara_token')
  const res = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token ?? ''}`,
    },
  })
  const json = await res.json().catch(() => ({}))
  return { res, json }
}

export default function IuranPage() {
  const router = useRouter()
  const [periode, setPeriode] = useState<Periode[]>([])
  const [totalMhs, setTotalMhs] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Detail periode yang dipilih
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<DetailPeriode | null>(null)
  const [rows, setRows] = useState<MahasiswaStatus[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  // Form input
  const [selectedNim, setSelectedNim] = useState('')
  const [jumlahText, setJumlahText] = useState('')
  const [saving, setSaving] = useState(false)

  // Filter & search
  const [q, setQ] = useState('')
  const [copied, setCopied] = useState(false)

  function expired() {
    clearSession()
    router.replace('/login')
  }

  async function loadList() {
    const { res, json } = await iuranFetch('/api/iuran')
    if (res.status === 401 || res.status === 403) return expired()
    if (!res.ok) {
      setError(json.error || 'Gagal memuat iuran')
      setLoading(false)
      return
    }
    setPeriode(json.data || [])
    setTotalMhs(json.total_mahasiswa || 0)
    setLoading(false)
  }

  async function loadDetail(id: string) {
    setDetailLoading(true)
    const { res, json } = await iuranFetch(`/api/iuran?periode_id=${id}`)
    if (res.status === 401 || res.status === 403) return expired()
    if (!res.ok) {
      setError(json.error || 'Gagal memuat detail')
      setDetailLoading(false)
      return
    }
    setDetail(json.periode)
    setRows(json.rows || [])
    setDetailLoading(false)
  }

  useEffect(() => {
    if (!getBendaharaSession()) {
      router.replace('/login')
      return
    }
    loadList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function openPeriode(id: string) {
    setSelectedId(id)
    setQ('')
    setError('')
    setSelectedNim('')
    setJumlahText('')
    loadDetail(id)
  }

  function closePeriode() {
    setSelectedId(null)
    setDetail(null)
    setRows([])
    loadList()
  }

  async function handleInputPembayaran() {
    if (!selectedId || !selectedNim.trim()) {
      setError('Pilih mahasiswa dulu')
      return
    }
    const jumlah = parseRupiah(jumlahText)
    if (!jumlah) {
      setError('Masukkan jumlah pembayaran')
      return
    }

    setSaving(true)
    setError('')
    const { res, json } = await iuranFetch('/api/iuran', {
      method: 'POST',
      body: JSON.stringify({ periode_id: selectedId, nim: selectedNim, jumlah }),
    })
    setSaving(false)

    if (res.status === 401 || res.status === 403) return expired()
    if (!res.ok) {
      setError(json.error || 'Gagal menyimpan')
      return
    }

    // Clear form & reload
    setSelectedNim('')
    setJumlahText('')
    loadDetail(selectedId)
  }

  async function deletePembayaran(transaksiId: string) {
    if (!confirm('Hapus pembayaran ini?')) return
    const { res, json } = await iuranFetch('/api/iuran', {
      method: 'DELETE',
      body: JSON.stringify({ id: transaksiId }),
    })
    if (res.status === 401 || res.status === 403) return expired()
    if (!res.ok) {
      setError(json.error || 'Gagal menghapus')
      return
    }
    if (selectedId) loadDetail(selectedId)
  }

  const stats = useMemo(() => {
    const lunas = rows.filter(r => r.status === 'lunas').length
    const kurang = rows.filter(r => r.status === 'kurang').length
    const belum = rows.filter(r => r.status === 'belum bayar').length
    const terkumpul = rows.reduce((s, r) => s + r.totalBayar, 0)
    return { lunas, kurang, belum, terkumpul }
  }, [rows])

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase()
    if (!kw) return rows
    return rows.filter(r => r.nama.toLowerCase().includes(kw) || r.nim.includes(kw))
  }, [rows, q])

  async function copyBelumBayar() {
    if (!detail) return
    const belum = rows.filter(r => r.status === 'belum bayar')
    const teks = [
      `*Belum bayar iuran ${detail.nama}* (${formatRupiah(detail.nominal)})`,
      ...belum.map((r, i) => `${i + 1}. ${r.nama} (${r.nim})`),
      '',
      `Terkumpul dari ${stats.lunas} orang. Mohon segera bayar ya 🙏`,
    ].join('\n')
    try {
      await navigator.clipboard.writeText(teks)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Gagal menyalin. Izinkan akses clipboard di browser.')
    }
  }

  const inputStyle = { background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }

  /* ───────── DETAIL PERIODE ───────── */
  if (selectedId) {
    const nominal = detail?.nominal ?? 0
    const pct = rows.length ? Math.round((stats.lunas / rows.length) * 100) : 0

    return (
      <div className="p-4">
        <button onClick={closePeriode} {...pressProps} className="flex items-center gap-1.5 text-sm mb-4"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={16} /> Kembali
        </button>

        {detailLoading && !detail ? (
          <Spinner />
        ) : detail ? (
          <>
            {/* Header + Statistik */}
            <div className="mb-4">
              <h2 className="text-xl font-bold mb-1">{detail.nama}</h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {formatRupiah(nominal)} per orang
              </p>
            </div>

            {/* Progress card */}
            <Card className="p-4 mb-4">
              <div className="flex items-end justify-between mb-3">
                <div>
                  <div className="text-3xl font-bold">
                    {stats.lunas}
                    <span className="text-base font-normal ml-1" style={{ color: 'var(--text-muted)' }}>
                      / {rows.length}
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Terkumpul {formatRupiah(stats.terkumpul)}
                  </p>
                </div>
                <span className="text-2xl font-bold" style={{ color: 'var(--accent-light)' }}>
                  {pct}%
                </span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden mb-3" style={{ background: 'var(--surface2)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: 'var(--accent)' }}
                />
              </div>

              {/* Status breakdown */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg p-2" style={{ background: 'var(--surface2)' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Lunas</div>
                  <div className="font-bold text-sm" style={{ color: 'var(--accent-light)' }}>
                    {stats.lunas}
                  </div>
                </div>
                <div className="rounded-lg p-2" style={{ background: 'var(--surface2)' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Cicilan</div>
                  <div className="font-bold text-sm" style={{ color: 'var(--warning)' }}>
                    {stats.kurang}
                  </div>
                </div>
                <div className="rounded-lg p-2" style={{ background: 'var(--surface2)' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Belum bayar</div>
                  <div className="font-bold text-sm" style={{ color: 'var(--danger)' }}>
                    {stats.belum}
                  </div>
                </div>
              </div>

              <button
                onClick={copyBelumBayar}
                {...pressProps}
                disabled={stats.belum === 0}
                className="w-full mt-3 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: copied ? 'var(--accent-light)' : 'var(--text-muted)',
                  opacity: stats.belum === 0 ? 0.5 : 1,
                }}
              >
                {copied ? (
                  <>
                    <Check size={16} /> Tersalin
                  </>
                ) : (
                  <>
                    <Copy size={16} /> Salin daftar belum bayar (WA)
                  </>
                )}
              </button>
            </Card>

            {/* Form input pembayaran */}
            <Card className="p-4 mb-4 space-y-3" style={{ background: 'var(--surface)' }}>
              <div className="text-sm font-semibold mb-2">Input pembayaran baru</div>

              <div>
                <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Nama mahasiswa
                </label>
                <select
                  value={selectedNim}
                  onChange={e => setSelectedNim(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={inputStyle}
                >
                  <option value="">-- Pilih mahasiswa --</option>
                  {rows.map(r => (
                    <option key={r.nim} value={r.nim}>
                      {r.nama} ({r.nim})
                    </option>
                  ))}
                </select>
              </div>

              {selectedNim && (
                <div className="p-2.5 rounded-lg text-xs" style={{ background: 'var(--surface2)' }}>
                  {rows.find(r => r.nim === selectedNim)?.status === 'lunas' && (
                    <span style={{ color: 'var(--text-muted)' }}>✓ Sudah lunas (bisa tambah cicilan)</span>
                  )}
                  {rows.find(r => r.nim === selectedNim)?.status === 'kurang' && (
                    <span style={{ color: 'var(--warning)' }}>
                      ◐ Kurang {formatRupiah(rows.find(r => r.nim === selectedNim)?.sisa ?? 0)}
                    </span>
                  )}
                  {rows.find(r => r.nim === selectedNim)?.status === 'belum bayar' && (
                    <span style={{ color: 'var(--danger)' }}>○ Belum bayar ({formatRupiah(nominal)})</span>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Jumlah pembayaran
                </label>
                <div className="flex items-center rounded-xl px-3" style={inputStyle}>
                  <span className="text-sm mr-2" style={{ color: 'var(--text-muted)' }}>
                    Rp
                  </span>
                  <input
                    value={jumlahText}
                    onChange={e => {
                      const n = parseRupiah(e.target.value)
                      setJumlahText(n ? n.toLocaleString('id-ID') : '')
                    }}
                    inputMode="numeric"
                    placeholder="0"
                    className="w-full py-2.5 text-lg font-semibold outline-none bg-transparent"
                    style={{ color: 'var(--text)' }}
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs" style={{ color: 'var(--danger)' }}>
                  {error}
                </p>
              )}

              <button
                onClick={handleInputPembayaran}
                disabled={saving || !selectedNim}
                {...pressProps}
                className="w-full py-3 rounded-xl text-sm font-semibold"
                style={{
                  background: 'var(--accent)',
                  color: 'var(--on-accent)',
                  opacity: saving || !selectedNim ? 0.6 : 1,
                  cursor: saving || !selectedNim ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Menyimpan...' : 'Catat pembayaran'}
              </button>
            </Card>

            {/* Search */}
            <div className="flex items-center rounded-xl px-3 mb-3" style={inputStyle}>
              <Search size={16} style={{ color: 'var(--text-dim)' }} />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Cari nama atau NIM"
                className="w-full py-2.5 text-sm outline-none bg-transparent"
                style={{ color: 'var(--text)' }}
              />
            </div>

            {/* List siswa */}
            <div className="space-y-2">
              {filtered.length === 0 && (
                <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
                  {rows.length === 0 ? 'Belum ada siswa' : 'Tidak ada hasil pencarian'}
                </p>
              )}

              {filtered.map(r => (
                <Card key={r.nim} className="p-3">
                  <div className="flex items-start gap-3">
                    {/* Icon status */}
                    <div className="mt-0.5 shrink-0">
                      {r.status === 'lunas' && (
                        <CheckCircle2 size={20} style={{ color: 'var(--accent-light)' }} />
                      )}
                      {r.status === 'kurang' && (
                        <AlertCircle size={20} style={{ color: 'var(--warning)' }} />
                      )}
                      {r.status === 'belum bayar' && (
                        <Clock size={20} style={{ color: 'var(--danger)' }} />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{r.nama}</p>
                      <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                        {r.nim}
                      </p>

                      {/* Status text */}
                      <div className="text-xs mb-2 space-y-0.5">
                        {r.status === 'lunas' && (
                          <p style={{ color: 'var(--accent-light)' }}>✓ Lunas ({formatRupiah(r.totalBayar)})</p>
                        )}
                        {r.status === 'kurang' && (
                          <p style={{ color: 'var(--warning)' }}>
                            ◐ {formatRupiah(r.totalBayar)} / {formatRupiah(nominal)} — Kurang{' '}
                            {formatRupiah(r.sisa)}
                          </p>
                        )}
                        {r.status === 'belum bayar' && (
                          <p style={{ color: 'var(--danger)' }}>○ Belum bayar</p>
                        )}
                      </div>

                      {/* Riwayat cicilan */}
                      {r.riwayat.length > 0 && (
                        <div className="space-y-1 mt-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                          {r.riwayat.map((rb, idx) => (
                            <div key={rb.id} className="flex items-center justify-between text-xs">
                              <span style={{ color: 'var(--text-muted)' }}>
                                Bayar {idx + 1}: {formatRupiah(rb.jumlah)} · {formatTanggalPendek(rb.tanggal)}
                              </span>
                              <button
                                onClick={() => deletePembayaran(rb.id)}
                                className="text-[11px]"
                                style={{ color: 'var(--text-dim)' }}
                              >
                                Hapus
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        ) : null}
      </div>
    )
  }

  /* ───────── DAFTAR PERIODE ───────── */
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-1">Iuran Kelas</h2>
      <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
        Periode iuran per semester — cicilan diperbolehkan
      </p>

      {!loading && error && (
        <p className="text-xs mb-3" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}

      {loading ? (
        <Spinner />
      ) : periode.length === 0 ? (
        <div className="text-center py-14">
          <AlertCircle size={40} className="mx-auto mb-3" style={{ color: 'var(--text-dim)' }} />
          <p style={{ color: 'var(--text-muted)' }}>Belum ada periode iuran</p>
        </div>
      ) : (
        <div className="space-y-3">
          {periode.map(p => {
            const target = totalMhs * p.nominal
            const pct = target > 0 ? Math.min(100, Math.round((p.terkumpul / target) * 100)) : 0
            return (
              <Card key={p.id} className="p-4 hover:shadow-md transition-shadow fade-in">
                <button
                  onClick={() => openPeriode(p.id)}
                  {...pressProps}
                  className="w-full text-left"
                  style={{ background: 'none', border: 'none', color: 'inherit' }}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{p.nama}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {formatRupiah(p.nominal)} per orang
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">{p.sudah_bayar}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        dari {totalMhs}
                      </p>
                    </div>
                  </div>

                  <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: 'var(--surface2)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: 'var(--accent)' }}
                    />
                  </div>

                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Terkumpul {formatRupiah(p.terkumpul)}
                  </p>
                </button>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}