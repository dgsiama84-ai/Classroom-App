'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Copy, Search, Users } from 'lucide-react'
import { getBendaharaSession, clearSession } from '@/lib/auth'
import { pressProps } from '@/components/pressProps'
import Card from '@/components/Card'
import Spinner from '@/components/Spinner'
import { formatRupiah, parseRupiah, formatTanggalPendek, type IuranPeriode, type IuranRow } from '@/lib/kas'

type Filter = 'semua' | 'belum' | 'sudah'

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
  const [periodeList, setPeriodeList] = useState<IuranPeriode[]>([])
  const [totalMhs, setTotalMhs] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Form periode baru
  const [showForm, setShowForm] = useState(false)
  const [namaPeriode, setNamaPeriode] = useState('')
  const [nominalText, setNominalText] = useState('')
  const [saving, setSaving] = useState(false)

  // Detail periode
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<{ nama: string; nominal: number } | null>(null)
  const [rows, setRows] = useState<IuranRow[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [busyNim, setBusyNim] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('belum')
  const [q, setQ] = useState('')
  const [copied, setCopied] = useState(false)

  function expired() { clearSession(); router.replace('/login') }

  async function loadList() {
    const { res, json } = await iuranFetch('/api/iuran')
    if (res.status === 401 || res.status === 403) return expired()
    if (!res.ok) { setError(json.error || 'Gagal memuat iuran'); setLoading(false); return }
    setPeriodeList(json.data || [])
    setTotalMhs(json.total_mahasiswa || 0)
    setLoading(false)
  }

  async function loadDetail(id: string) {
    setDetailLoading(true)
    const { res, json } = await iuranFetch(`/api/iuran?periode_id=${id}`)
    if (res.status === 401 || res.status === 403) return expired()
    if (!res.ok) { setError(json.error || 'Gagal memuat detail'); setDetailLoading(false); return }
    setDetail(json.periode)
    setRows(json.rows || [])
    setDetailLoading(false)
  }

  useEffect(() => {
    if (!getBendaharaSession()) { router.replace('/login'); return }
    loadList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function openPeriode(id: string) {
    setSelectedId(id); setFilter('belum'); setQ(''); setError('')
    loadDetail(id)
  }

  function closeDetail() {
    setSelectedId(null); setDetail(null); setRows([])
    loadList()
  }

  async function handleCreate() {
    const nominal = parseRupiah(nominalText)
    if (!namaPeriode.trim() || !nominal) { setError('Nama periode dan nominal wajib diisi'); return }
    setSaving(true); setError('')
    const { res, json } = await iuranFetch('/api/iuran', {
      method: 'POST', body: JSON.stringify({ nama: namaPeriode, nominal }),
    })
    setSaving(false)
    if (res.status === 401 || res.status === 403) return expired()
    if (!res.ok) { setError(json.error || 'Gagal menyimpan'); return }
    setNamaPeriode(''); setNominalText(''); setShowForm(false)
    loadList()
  }

  async function handleDeletePeriode(p: IuranPeriode) {
    if (!confirm(`Hapus periode "${p.nama}"?`)) return
    const { res, json } = await iuranFetch('/api/iuran', { method: 'DELETE', body: JSON.stringify({ id: p.id }) })
    if (res.status === 401 || res.status === 403) return expired()
    if (!res.ok) { setError(json.error || 'Gagal menghapus'); return }
    loadList()
  }

  async function markPaid(r: IuranRow) {
    if (!selectedId) return
    setBusyNim(r.nim); setError('')
    const { res, json } = await iuranFetch('/api/iuran/bayar', {
      method: 'POST', body: JSON.stringify({ periode_id: selectedId, nim: r.nim }),
    })
    setBusyNim(null)
    if (res.status === 401 || res.status === 403) return expired()
    if (!res.ok && res.status !== 409) { setError(json.error || 'Gagal mencatat'); return }
    loadDetail(selectedId)
  }

  async function undoPaid(r: IuranRow) {
    if (!selectedId || !r.bayar) return
    if (!confirm(`Batalkan pembayaran ${r.nama}? Pemasukan di kas ikut dihapus.`)) return
    setBusyNim(r.nim); setError('')
    const { res, json } = await iuranFetch('/api/iuran/bayar', {
      method: 'DELETE', body: JSON.stringify({ id: r.bayar.id }),
    })
    setBusyNim(null)
    if (res.status === 401 || res.status === 403) return expired()
    if (!res.ok) { setError(json.error || 'Gagal membatalkan'); return }
    loadDetail(selectedId)
  }

  const stats = useMemo(() => {
    const sudah = rows.filter(r => r.bayar).length
    const terkumpul = rows.reduce((s, r) => s + (r.bayar?.jumlah ?? 0), 0)
    return { sudah, belum: rows.length - sudah, terkumpul }
  }, [rows])

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase()
    return rows.filter(r => {
      if (filter === 'belum' && r.bayar) return false
      if (filter === 'sudah' && !r.bayar) return false
      return !kw || r.nama.toLowerCase().includes(kw) || r.nim.includes(kw)
    })
  }, [rows, filter, q])

  async function copyBelumBayar() {
    if (!detail) return
    const belum = rows.filter(r => !r.bayar)
    const teks = [
      `*Belum bayar iuran ${detail.nama}* (${formatRupiah(detail.nominal)})`,
      ...belum.map((r, i) => `${i + 1}. ${r.nama}`),
      '',
      `Terkumpul ${stats.sudah}/${rows.length} orang. Mohon segera ke bendahara ya 🙏`,
    ].join('\n')
    try {
      await navigator.clipboard.writeText(teks)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    } catch { setError('Gagal menyalin. Izinkan akses clipboard di browser.') }
  }

  const inputStyle = { background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }

  /* ───────── Tampilan detail satu periode ───────── */
  if (selectedId) {
    const pct = rows.length ? Math.round((stats.sudah / rows.length) * 100) : 0
    return (
      <div className="p-4">
        <button onClick={closeDetail} {...pressProps} className="flex items-center gap-1.5 text-sm mb-3"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={16} /> Semua periode
        </button>

        {detailLoading && !detail ? <Spinner /> : detail && (
          <>
            <h2 className="text-lg font-bold">{detail.nama}</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{formatRupiah(detail.nominal)} per orang</p>

            <Card className="p-4 mb-4">
              <div className="flex items-end justify-between mb-2">
                <div>
                  <div className="text-2xl font-bold">{stats.sudah}<span className="text-base font-normal" style={{ color: 'var(--text-muted)' }}> / {rows.length} orang</span></div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Terkumpul {formatRupiah(stats.terkumpul)}</div>
                </div>
                <div className="text-sm font-semibold" style={{ color: 'var(--accent-light)' }}>{pct}%</div>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
              </div>
              <button onClick={copyBelumBayar} {...pressProps} disabled={stats.belum === 0}
                className="w-full mt-3 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                style={{ background: 'transparent', border: '1px solid var(--border)', color: copied ? 'var(--accent-light)' : 'var(--text-muted)', opacity: stats.belum === 0 ? 0.5 : 1 }}>
                {copied ? <><Check size={16} /> Tersalin</> : <><Copy size={16} /> Salin daftar belum bayar (WA)</>}
              </button>
            </Card>

            <div className="flex items-center gap-2 rounded-xl px-3 mb-3" style={inputStyle}>
              <Search size={16} style={{ color: 'var(--text-dim)' }} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nama atau NIM"
                className="w-full py-2.5 text-sm outline-none bg-transparent" style={{ color: 'var(--text)' }} />
            </div>

            <div className="flex gap-2 mb-3">
              {([['belum', `Belum (${stats.belum})`], ['sudah', `Sudah (${stats.sudah})`], ['semua', 'Semua']] as const).map(([v, label]) => (
                <button key={v} onClick={() => setFilter(v)} {...pressProps}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{
                    background: filter === v ? 'var(--accent-soft)' : 'var(--surface)',
                    border: `1px solid ${filter === v ? 'var(--accent)' : 'var(--border)'}`,
                    color: filter === v ? 'var(--accent-light)' : 'var(--text-muted)',
                  }}>
                  {label}
                </button>
              ))}
            </div>

            {error && <p className="text-xs mb-3" style={{ color: 'var(--danger)' }}>{error}</p>}

            <div className="space-y-2">
              {filtered.length === 0 && (
                <p className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>
                  {filter === 'belum' && stats.belum === 0 ? 'Semua sudah lunas 🎉' : 'Tidak ada data'}
                </p>
              )}
              {filtered.map(r => (
                <Card key={r.nim} className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.nama}</p>
                    <p className="text-xs" style={{ color: r.bayar ? 'var(--accent-light)' : 'var(--text-muted)' }}>
                      {r.bayar
                        ? `Lunas · ${formatTanggalPendek(r.bayar.tanggal)}${r.bayar.jumlah !== detail.nominal ? ` · ${formatRupiah(r.bayar.jumlah)}` : ''}`
                        : r.nim}
                    </p>
                  </div>
                  {r.bayar ? (
                    <button onClick={() => undoPaid(r)} disabled={busyNim === r.nim} {...pressProps}
                      className="text-xs px-3 py-1.5 rounded-lg shrink-0"
                      style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>
                      {busyNim === r.nim ? '...' : 'Batalkan'}
                    </button>
                  ) : (
                    <button onClick={() => markPaid(r)} disabled={busyNim === r.nim} {...pressProps}
                      className="text-sm px-4 py-1.5 rounded-lg font-semibold shrink-0"
                      style={{ background: 'var(--accent)', color: 'var(--on-accent)', opacity: busyNim === r.nim ? 0.6 : 1 }}>
                      {busyNim === r.nim ? '...' : 'Lunas'}
                    </button>
                  )}
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  /* ───────── Daftar periode ───────── */
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold">Iuran</h2>
        <button onClick={() => { setShowForm(!showForm); setError('') }} {...pressProps}
          className="text-sm px-3 py-1.5 rounded-lg font-semibold"
          style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
          {showForm ? '✕ Tutup' : '+ Periode'}
        </button>
      </div>
      <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{totalMhs} mahasiswa terdaftar</p>

      {showForm && (
        <Card className="p-4 mb-4 space-y-3 fade-in">
          <div>
            <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Nama periode</label>
            <input value={namaPeriode} onChange={e => setNamaPeriode(e.target.value)} maxLength={60}
              placeholder="mis. Kas Oktober 2026"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
          </div>
          <div>
            <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Nominal per orang</label>
            <div className="flex items-center rounded-xl px-3" style={inputStyle}>
              <span className="text-sm mr-2" style={{ color: 'var(--text-muted)' }}>Rp</span>
              <input value={nominalText} inputMode="numeric" placeholder="0"
                onChange={e => { const n = parseRupiah(e.target.value); setNominalText(n ? n.toLocaleString('id-ID') : '') }}
                className="w-full py-2.5 text-lg font-semibold outline-none bg-transparent" style={{ color: 'var(--text)' }} />
            </div>
          </div>
          {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
          <button onClick={handleCreate} disabled={saving} {...pressProps}
            className="w-full py-3 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--accent)', color: 'var(--on-accent)', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Menyimpan...' : 'Buat Periode'}
          </button>
        </Card>
      )}

      {!showForm && error && <p className="text-xs mb-3" style={{ color: 'var(--danger)' }}>{error}</p>}

      {loading ? <Spinner /> : periodeList.length === 0 ? (
        <div className="text-center py-14">
          <Users size={40} className="mx-auto mb-3" style={{ color: 'var(--text-dim)' }} />
          <p style={{ color: 'var(--text-muted)' }}>Belum ada periode iuran</p>
        </div>
      ) : (
        <div className="space-y-3">
          {periodeList.map(p => {
            const pct = totalMhs ? Math.min(100, Math.round((p.sudah_bayar / totalMhs) * 100)) : 0
            return (
              <Card key={p.id} className="p-4 fade-in">
                <button onClick={() => openPeriode(p.id)} {...pressProps} className="w-full text-left"
                  style={{ background: 'none', border: 'none', color: 'inherit' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{p.nama}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatRupiah(p.nominal)} per orang</p>
                    </div>
                    <span className="text-xs font-semibold shrink-0" style={{ color: 'var(--accent-light)' }}>{p.sudah_bayar}/{totalMhs}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden my-3" style={{ background: 'var(--surface2)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Terkumpul {formatRupiah(p.terkumpul)}</p>
                </button>
                {p.sudah_bayar === 0 && (
                  <button onClick={() => handleDeletePeriode(p)} className="text-[11px] mt-2" style={{ color: 'var(--text-dim)' }}>
                    Hapus periode
                  </button>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
