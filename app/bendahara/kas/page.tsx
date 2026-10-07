'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDownLeft, ArrowUpRight, Copy, Check, Wallet } from 'lucide-react'
import { getBendaharaSession, clearSession } from '@/lib/auth'
import { pressProps } from '@/components/pressProps'
import Card from '@/components/Card'
import Spinner from '@/components/Spinner'
import SemesterFilter from '@/components/SemesterFilter'
import { semesterQuery } from '@/lib/hooks/useSemesterList'
import {
  KAS_KATEGORI, formatRupiah, parseRupiah, formatTanggalPendek,
  type KasTransaksi, type KasRingkasan,
} from '@/lib/kas'
import { nowInMakassar } from '@/lib/utils'

type Trx = KasTransaksi & { periode_id?: string | null }

async function kasFetch(options: RequestInit = {}, query = '') {
  const token = localStorage.getItem('bendahara_token')
  const res = await fetch(`/api/kas${query}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token ?? ''}`,
    },
  })
  const json = await res.json().catch(() => ({}))
  return { res, json }
}

export default function KasPage() {
  const router = useRouter()
  const [list, setList] = useState<Trx[]>([])
  const [ringkasan, setRingkasan] = useState<KasRingkasan>({ pemasukan: 0, pengeluaran: 0, saldo: 0 })
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // '' = semester aktif (default, diatur admin), 'all' = semua, atau id semester
  const [semester, setSemester] = useState('')
  const [saldoTotal, setSaldoTotal] = useState(0)

  // Form (khusus pengeluaran)
  const [jumlahText, setJumlahText] = useState('')
  const [keterangan, setKeterangan] = useState('')
  const [kategori, setKategori] = useState('')
  const [tanggal, setTanggal] = useState('')

  function sessionExpired() {
    clearSession()
    router.replace('/login')
  }

  async function load() {
    const { res, json } = await kasFetch({}, semesterQuery(semester))
    if (res.status === 401) return sessionExpired()
    if (!res.ok) { setError(json.error || 'Gagal memuat data kas'); setLoading(false); return }
    setList(json.data || [])
    setRingkasan(json.ringkasan)
    setSaldoTotal(json.saldo_total ?? json.ringkasan?.saldo ?? 0)
    setLoading(false)
  }

  useEffect(() => {
    if (!getBendaharaSession()) { router.replace('/login'); return }
    setTanggal(nowInMakassar().tanggal)
  }, [])

  useEffect(() => {
    if (!getBendaharaSession()) return
    setLoading(true)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semester])

  function formatJumlahInput(v: string) {
    const n = parseRupiah(v)
    setJumlahText(n ? n.toLocaleString('id-ID') : '')
  }

  async function handleSave() {
    const jumlah = parseRupiah(jumlahText)
    if (!jumlah || !keterangan.trim()) { setError('Jumlah dan keterangan wajib diisi'); return }
    setSaving(true); setError('')

    const { res, json } = await kasFetch({
      method: 'POST',
      body: JSON.stringify({ jenis: 'pengeluaran', jumlah, keterangan, kategori: kategori || null, tanggal }),
    })
    setSaving(false)
    if (res.status === 401) return sessionExpired()
    if (!res.ok) { setError(json.error || 'Gagal menyimpan'); return }

    setJumlahText(''); setKeterangan(''); setKategori('')
    setShowForm(false)
    load()
  }

  async function handleDelete(t: Trx) {
    if (!confirm(`Hapus "${t.keterangan}" (${formatRupiah(t.jumlah)})?`)) return
    setDeleting(t.id)
    const { res } = await kasFetch({ method: 'DELETE', body: JSON.stringify({ id: t.id }) })
    setDeleting(null)
    if (res.status === 401) return sessionExpired()
    load()
  }

  // Riwayat: pengeluaran + pemasukan non-iuran (iuran dilihat di halaman Iuran)
  const riwayat = useMemo(
    () => list.filter(t => t.jenis === 'pengeluaran' || !t.periode_id),
    [list]
  )

  // Format teks siap tempel ke grup WhatsApp kelas
  async function copyLaporan() {
    const baris = list
      .filter(t => t.jenis === 'pengeluaran')
      .slice(0, 10)
      .map(t => `－ ${formatTanggalPendek(t.tanggal)} · ${t.keterangan} · ${formatRupiah(t.jumlah)}`)
    const teks = [
      '*LAPORAN KAS KELAS 25MA2*',
      `Saldo: *${formatRupiah(ringkasan.saldo)}*`,
      `Iuran masuk: ${formatRupiah(ringkasan.pemasukan)}`,
      `Pengeluaran: ${formatRupiah(ringkasan.pengeluaran)}`,
      '',
      '*10 pengeluaran terakhir*',
      ...baris,
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

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold">Kas Kelas</h2>
        <button onClick={() => { setShowForm(!showForm); setError('') }} {...pressProps}
          className="text-sm px-3 py-1.5 rounded-lg font-semibold"
          style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
          {showForm ? '✕ Tutup' : '+ Pengeluaran'}
        </button>
      </div>
      <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
        Pemasukan otomatis dari iuran · 25MA2
      </p>

      <SemesterFilter value={semester} onChange={setSemester} />

      {/* Ringkasan */}
      <Card className="p-5 mb-4">
        <div className="flex items-center gap-2 text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
          <Wallet size={14} /> Saldo kas
        </div>
        <div className="text-3xl font-bold tracking-tight"
          style={{ color: ringkasan.saldo < 0 ? 'var(--danger)' : 'var(--text)' }}>
          {formatRupiah(ringkasan.saldo)}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="rounded-xl p-3" style={{ background: 'var(--surface2)' }}>
            <div className="text-[11px] mb-0.5" style={{ color: 'var(--text-muted)' }}>Iuran masuk</div>
            <div className="text-sm font-semibold" style={{ color: 'var(--accent-light)' }}>{formatRupiah(ringkasan.pemasukan)}</div>
          </div>
          <div className="rounded-xl p-3" style={{ background: 'var(--surface2)' }}>
            <div className="text-[11px] mb-0.5" style={{ color: 'var(--text-muted)' }}>Pengeluaran</div>
            <div className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>{formatRupiah(ringkasan.pengeluaran)}</div>
          </div>
        </div>
        {semester !== 'all' && (
          <p className="text-[11px] mt-3" style={{ color: 'var(--text-dim)' }}>
            Total kas semua semester: {formatRupiah(saldoTotal)}
          </p>
        )}
        <button onClick={copyLaporan} {...pressProps} disabled={list.length === 0}
          className="w-full mt-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
          style={{ background: 'transparent', border: '1px solid var(--border)', color: copied ? 'var(--accent-light)' : 'var(--text-muted)', opacity: list.length === 0 ? 0.5 : 1 }}>
          {copied ? <><Check size={16} /> Tersalin, tempel ke grup WA</> : <><Copy size={16} /> Salin laporan untuk grup WA</>}
        </button>
      </Card>

      {/* Form pengeluaran */}
      {showForm && (
        <Card className="p-4 mb-4 space-y-3 fade-in">
          <div className="text-sm font-semibold">Catat pengeluaran</div>

          <div>
            <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Jumlah</label>
            <div className="flex items-center rounded-xl px-3" style={inputStyle}>
              <span className="text-sm mr-2" style={{ color: 'var(--text-muted)' }}>Rp</span>
              <input value={jumlahText} onChange={e => formatJumlahInput(e.target.value)}
                inputMode="numeric" placeholder="0"
                className="w-full py-2.5 text-lg font-semibold outline-none bg-transparent"
                style={{ color: 'var(--text)' }} />
            </div>
          </div>

          <div>
            <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Keterangan</label>
            <input value={keterangan} onChange={e => setKeterangan(e.target.value)} maxLength={120}
              placeholder="mis. Zoom, Print absen"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
          </div>

          <div>
            <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Kategori (opsional)</label>
            <div className="flex flex-wrap gap-2">
              {KAS_KATEGORI.pengeluaran.map(k => (
                <button key={k} onClick={() => setKategori(kategori === k ? '' : k)} {...pressProps}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{
                    background: kategori === k ? 'var(--accent-soft)' : 'var(--surface2)',
                    border: `1px solid ${kategori === k ? 'var(--accent)' : 'var(--border)'}`,
                    color: kategori === k ? 'var(--accent-light)' : 'var(--text-muted)',
                  }}>
                  {k}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Tanggal</label>
            <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ ...inputStyle, colorScheme: 'dark' }} />
          </div>

          {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}

          <button onClick={handleSave} disabled={saving} {...pressProps}
            className="w-full py-3 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--accent)', color: 'var(--on-accent)', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Menyimpan...' : 'Simpan pengeluaran'}
          </button>
        </Card>
      )}

      {!showForm && error && <p className="text-xs mb-3" style={{ color: 'var(--danger)' }}>{error}</p>}

      {/* Riwayat */}
      {loading ? (
        <Spinner />
      ) : riwayat.length === 0 ? (
        <div className="text-center py-14">
          <Wallet size={40} className="mx-auto mb-3" style={{ color: 'var(--text-dim)' }} />
          <p style={{ color: 'var(--text-muted)' }}>Belum ada pengeluaran</p>
        </div>
      ) : (
        <div className="space-y-2">
          {riwayat.map(t => {
            const masuk = t.jenis === 'pemasukan'
            return (
              <Card key={t.id} className="p-3 flex items-center gap-3 fade-in">
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: masuk ? 'var(--accent-soft)' : 'rgba(241,92,109,0.15)', color: masuk ? 'var(--accent-light)' : 'var(--danger)' }}>
                  {masuk ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.keterangan}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {t.kategori ? `${t.kategori} · ` : ''}{formatTanggalPendek(t.tanggal)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold" style={{ color: masuk ? 'var(--accent-light)' : 'var(--danger)' }}>
                    {masuk ? '+' : '-'}{formatRupiah(t.jumlah)}
                  </p>
                  <button onClick={() => handleDelete(t)} disabled={deleting === t.id}
                    className="text-[11px] mt-0.5" style={{ color: 'var(--text-dim)' }}>
                    {deleting === t.id ? '...' : 'Hapus'}
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}