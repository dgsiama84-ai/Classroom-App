'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, AlertCircle, Clock, Wallet } from 'lucide-react'
import { getMahasiswaSession, clearSession } from '@/lib/auth'
import Card from '@/components/Card'
import Spinner from '@/components/Spinner'
import SemesterFilter from '@/components/SemesterFilter'
import { semesterQuery } from '@/lib/hooks/useSemesterList'
import { formatRupiah, formatTanggalPendek } from '@/lib/kas'

interface IuranInfo {
  id: string
  nama: string
  nominal: number
  lunas: number
  terkumpul: number
  saya: { status: 'lunas' | 'kurang' | 'belum bayar'; totalBayar: number; sisa: number }
}

interface Riwayat {
  id: string
  jenis: 'pemasukan' | 'pengeluaran'
  jumlah: number
  keterangan: string
  kategori: string | null
  tanggal: string
}

interface Data {
  ringkasan: { pemasukan: number; pengeluaran: number; saldo: number }
  saldo_total?: number
  total_mahasiswa: number
  iuran: IuranInfo[]
  riwayat: Riwayat[]
}

export default function KasMahasiswaPage() {
  const router = useRouter()
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // '' = semester aktif (default, diatur admin), 'all' = semua, atau id semester
  const [semester, setSemester] = useState('')

  useEffect(() => {
    if (!getMahasiswaSession()) { router.replace('/login'); return }

    async function load() {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/mahasiswa/kas${semesterQuery(semester)}`, {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      })
      const json = await res.json().catch(() => ({}))
      if (res.status === 401) { clearSession(); router.replace('/login'); return }
      if (!res.ok) { setError(json.error || 'Gagal memuat data kas'); setLoading(false); return }
      setError('')
      setData(json)
      setLoading(false)
    }
    load()
  }, [router, semester])

  if (loading) return <div className="p-4"><Spinner /></div>

  if (error || !data) {
    return (
      <div className="p-4">
        <p className="text-sm" style={{ color: 'var(--danger)' }}>{error || 'Data tidak tersedia'}</p>
      </div>
    )
  }

  const { ringkasan, iuran, riwayat, total_mahasiswa, saldo_total } = data

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-1">Kas Kelas</h2>
      <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
        Transparansi uang kas · 25MA2
      </p>

      <SemesterFilter value={semester} onChange={setSemester} />

      {/* Saldo */}
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
            <div className="text-[11px] mb-0.5" style={{ color: 'var(--text-muted)' }}>Pemasukan</div>
            <div className="text-sm font-semibold" style={{ color: 'var(--accent-light)' }}>
              {formatRupiah(ringkasan.pemasukan)}
            </div>
          </div>
          <div className="rounded-xl p-3" style={{ background: 'var(--surface2)' }}>
            <div className="text-[11px] mb-0.5" style={{ color: 'var(--text-muted)' }}>Pengeluaran</div>
            <div className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>
              {formatRupiah(ringkasan.pengeluaran)}
            </div>
          </div>
        </div>
        {semester !== 'all' && saldo_total !== undefined && (
          <p className="text-[11px] mt-3" style={{ color: 'var(--text-dim)' }}>
            Total kas semua semester: {formatRupiah(saldo_total)}
          </p>
        )}
      </Card>

      {/* Iuran saya */}
      <h3 className="text-sm font-semibold mb-2">Iuran kamu</h3>
      {iuran.length === 0 && (
        <p className="text-sm text-center py-6 mb-4" style={{ color: 'var(--text-muted)' }}>
          Belum ada iuran di semester ini
        </p>
      )}
      <div className="space-y-3 mb-6">
        {iuran.map(p => {
          const pct = total_mahasiswa > 0 ? Math.round((p.lunas / total_mahasiswa) * 100) : 0
          const s = p.saya
          return (
            <Card key={p.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {s.status === 'lunas' && <CheckCircle2 size={22} style={{ color: 'var(--accent-light)' }} />}
                  {s.status === 'kurang' && <AlertCircle size={22} style={{ color: 'var(--warning)' }} />}
                  {s.status === 'belum bayar' && <Clock size={22} style={{ color: 'var(--danger)' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{p.nama}</p>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    Tagihan {formatRupiah(p.nominal)}
                  </p>
                  {s.status === 'lunas' && (
                    <p className="text-xs" style={{ color: 'var(--accent-light)' }}>
                      ✓ Lunas ({formatRupiah(s.totalBayar)})
                    </p>
                  )}
                  {s.status === 'kurang' && (
                    <p className="text-xs" style={{ color: 'var(--warning)' }}>
                      ◐ Sudah {formatRupiah(s.totalBayar)}, kurang {formatRupiah(s.sisa)}
                    </p>
                  )}
                  {s.status === 'belum bayar' && (
                    <p className="text-xs" style={{ color: 'var(--danger)' }}>○ Belum bayar</p>
                  )}
                </div>
              </div>

              {/* Progres kelas: jumlah saja, tanpa nama */}
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  <span>{p.lunas} dari {total_mahasiswa} sudah lunas</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Riwayat pengeluaran */}
      <h3 className="text-sm font-semibold mb-2">Pengeluaran & pemasukan lain</h3>
      {riwayat.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Belum ada transaksi</p>
      ) : (
        <div className="space-y-2">
          {riwayat.map(t => {
            const masuk = t.jenis === 'pemasukan'
            return (
              <Card key={t.id} className="p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: masuk ? 'var(--accent-soft)' : 'rgba(241,92,109,0.15)',
                    color: masuk ? 'var(--accent-light)' : 'var(--danger)',
                  }}>
                  {masuk ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.keterangan}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {t.kategori ? `${t.kategori} · ` : ''}{formatTanggalPendek(t.tanggal)}
                  </p>
                </div>
                <p className="text-sm font-semibold shrink-0"
                  style={{ color: masuk ? 'var(--accent-light)' : 'var(--danger)' }}>
                  {masuk ? '+' : '-'}{formatRupiah(t.jumlah)}
                </p>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}