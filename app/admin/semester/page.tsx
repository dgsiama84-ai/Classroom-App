'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, Plus, X, CheckCircle2 } from 'lucide-react'
import { getAdminSession, getAdminToken, clearSession } from '@/lib/auth'
import { pressProps } from '@/components/pressProps'
import Spinner from '@/components/Spinner'
import { Semester } from '@/lib/types'
import { parseRupiah } from '@/lib/kas'

interface IuranRow { nama: string; nominal: string }
interface MatkulRow { kode: string; nama: string; dosen: string }

const inputStyle = { background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }

async function adminFetch(method: string, body?: unknown) {
  const res = await fetch('/api/semester', {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAdminToken() ?? ''}` },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  return { res, json }
}

export default function AdminSemesterPage() {
  const router = useRouter()
  const [list, setList] = useState<Semester[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [switching, setSwitching] = useState<string | null>(null)

  // Form semester baru
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [nama, setNama] = useState('')
  const [tahunAjaran, setTahunAjaran] = useState('')
  const [aktif, setAktif] = useState(true)
  const [iuran, setIuran] = useState<IuranRow[]>([{ nama: '', nominal: '' }])
  const [matkul, setMatkul] = useState<MatkulRow[]>([{ kode: '', nama: '', dosen: '' }])

  const aktifSekarang = list.find(s => s.is_aktif)

  function sessionExpired() {
    clearSession()
    router.replace('/login')
  }

  async function load() {
    const res = await fetch('/api/semester')
    const json = await res.json().catch(() => ({}))
    setList(json.data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (!getAdminSession()) { router.replace('/login'); return }
    load()
  }, [router])

  function openForm() {
    // Saran nama otomatis: Semester berikutnya
    const maxUrutan = list.reduce((m, s) => Math.max(m, s.urutan), 0)
    setNama(`Semester ${maxUrutan + 1}`)
    setShowForm(true)
    setError('')
  }

  // Kalau nama periode iuran masih kosong, otomatis pakai nama semester
  function periodeNamaDefault(row: IuranRow) {
    return row.nama.trim() || nama.trim()
  }

  async function handleAktifkan(s: Semester) {
    if (!confirm(`Jadikan "${s.nama} (${s.tahun_ajaran})" sebagai semester aktif?\n\nSemua halaman mahasiswa, admin, dan bendahara akan langsung ikut semester ini.`)) return
    setSwitching(s.id)
    setError('')
    const { res, json } = await adminFetch('PATCH', { id: s.id })
    setSwitching(null)
    if (res.status === 401 || res.status === 403) return sessionExpired()
    if (!res.ok) { setError(json.error || 'Gagal mengganti semester aktif'); return }
    load()
  }

  async function handleSimpan() {
    if (!nama.trim() || !tahunAjaran.trim()) { setError('Nama dan tahun ajaran wajib diisi'); return }
    setSaving(true)
    setError('')

    const { res, json } = await adminFetch('POST', {
      nama,
      tahun_ajaran: tahunAjaran,
      aktif,
      iuran: iuran.map(r => ({ nama: periodeNamaDefault(r), nominal: parseRupiah(r.nominal) })),
      matkul,
    })
    setSaving(false)

    if (res.status === 401 || res.status === 403) return sessionExpired()
    if (!res.ok) { setError(json.error || 'Gagal menyimpan semester'); return }

    setShowForm(false)
    setNama(''); setTahunAjaran(''); setAktif(true)
    setIuran([{ nama: '', nominal: '' }])
    setMatkul([{ kode: '', nama: '', dosen: '' }])
    load()
  }

  const updateIuran = (i: number, patch: Partial<IuranRow>) =>
    setIuran(rows => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const updateMatkul = (i: number, patch: Partial<MatkulRow>) =>
    setMatkul(rows => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold">Semester</h2>
        <button onClick={() => (showForm ? setShowForm(false) : openForm())} {...pressProps}
          className="text-sm px-3 py-1.5 rounded-lg font-medium"
          style={{ background: 'var(--accent)', color: 'white' }}>
          {showForm ? '✕ Tutup' : '+ Semester baru'}
        </button>
      </div>
      <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
        {aktifSekarang
          ? `Aktif: ${aktifSekarang.nama} (${aktifSekarang.tahun_ajaran}). Semua halaman ikut semester ini.`
          : 'Belum ada semester aktif.'}
      </p>

      {!showForm && error && <p className="text-xs mb-3 text-red-400">{error}</p>}

      {/* Form semester baru */}
      {showForm && (
        <div className="rounded-2xl p-4 mb-5 space-y-4 fade-in"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold">Tambah semester</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Nama</label>
              <input value={nama} onChange={e => setNama(e.target.value)} placeholder="Semester 4" maxLength={40}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
            </div>
            <div>
              <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>Tahun ajaran</label>
              <input value={tahunAjaran} onChange={e => setTahunAjaran(e.target.value)} placeholder="Genap 2026/2027" maxLength={40}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
            </div>
          </div>

          {/* Periode iuran */}
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Periode iuran (opsional)</p>
            <p className="text-[11px] mb-2" style={{ color: 'var(--text-dim)' }}>
              Nama dikosongkan = pakai nama semester. Bisa tambah periode lain kalau perlu.
            </p>
            <div className="space-y-2">
              {iuran.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={r.nama} onChange={e => updateIuran(i, { nama: e.target.value })}
                    placeholder={nama.trim() || 'Nama periode'}
                    className="flex-1 min-w-0 px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                  <div className="flex items-center rounded-xl px-3 w-36 shrink-0" style={inputStyle}>
                    <span className="text-xs mr-1.5" style={{ color: 'var(--text-muted)' }}>Rp</span>
                    <input value={r.nominal} inputMode="numeric" placeholder="0"
                      onChange={e => {
                        const n = parseRupiah(e.target.value)
                        updateIuran(i, { nominal: n ? n.toLocaleString('id-ID') : '' })
                      }}
                      className="w-full py-2.5 text-sm outline-none bg-transparent" style={{ color: 'var(--text)' }} />
                  </div>
                  {iuran.length > 1 && (
                    <button onClick={() => setIuran(rows => rows.filter((_, idx) => idx !== i))} {...pressProps}
                      aria-label="Hapus periode" style={{ color: 'var(--text-dim)' }}>
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => setIuran(rows => [...rows, { nama: '', nominal: '' }])} {...pressProps}
              className="text-xs mt-2 flex items-center gap-1" style={{ color: 'var(--accent-light)' }}>
              <Plus size={14} /> Tambah periode
            </button>
          </div>

          {/* Mata kuliah */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Mata kuliah (opsional)</p>
            <div className="space-y-2">
              {matkul.map((r, i) => (
                <div key={i} className="rounded-xl p-2.5 space-y-2" style={{ background: 'var(--surface2)' }}>
                  <div className="flex items-center gap-2">
                    <input value={r.kode} onChange={e => updateMatkul(i, { kode: e.target.value })} placeholder="Kode"
                      className="w-24 shrink-0 px-3 py-2 rounded-lg text-sm outline-none" style={{ ...inputStyle, background: 'var(--surface)' }} />
                    <input value={r.nama} onChange={e => updateMatkul(i, { nama: e.target.value })} placeholder="Nama mata kuliah"
                      className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm outline-none" style={{ ...inputStyle, background: 'var(--surface)' }} />
                    {matkul.length > 1 && (
                      <button onClick={() => setMatkul(rows => rows.filter((_, idx) => idx !== i))} {...pressProps}
                        aria-label="Hapus mata kuliah" style={{ color: 'var(--text-dim)' }}>
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <input value={r.dosen} onChange={e => updateMatkul(i, { dosen: e.target.value })} placeholder="Dosen (opsional)"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ ...inputStyle, background: 'var(--surface)' }} />
                </div>
              ))}
            </div>
            <button onClick={() => setMatkul(rows => [...rows, { kode: '', nama: '', dosen: '' }])} {...pressProps}
              className="text-xs mt-2 flex items-center gap-1" style={{ color: 'var(--accent-light)' }}>
              <Plus size={14} /> Tambah mata kuliah
            </button>
          </div>

          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={aktif} onChange={e => setAktif(e.target.checked)} className="mt-1" />
            <span>
              Langsung jadikan semester aktif
              <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>
                Semester {aktifSekarang?.nama ?? 'sebelumnya'} otomatis dinonaktifkan (datanya tetap aman).
              </span>
            </span>
          </label>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button onClick={handleSimpan} disabled={saving} {...pressProps}
            className="w-full py-3 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--accent)', color: 'white', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Menyimpan...' : 'Simpan semester'}
          </button>
        </div>
      )}

      {/* Daftar semester */}
      {loading ? (
        <Spinner />
      ) : list.length === 0 ? (
        <div className="text-center py-16">
          <CalendarDays size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-muted)' }}>Belum ada semester</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map(s => (
            <div key={s.id} className="rounded-xl px-4 py-3 fade-in flex items-center justify-between gap-3"
              style={{
                background: 'var(--surface)',
                border: `1px solid ${s.is_aktif ? 'var(--accent)' : 'var(--border)'}`,
              }}>
              <div className="min-w-0">
                <p className="text-sm font-medium">{s.nama}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.tahun_ajaran}</p>
              </div>
              {s.is_aktif ? (
                <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full shrink-0"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent-light)' }}>
                  <CheckCircle2 size={13} /> Aktif
                </span>
              ) : (
                <button onClick={() => handleAktifkan(s)} disabled={switching === s.id} {...pressProps}
                  className="text-xs px-3 py-1.5 rounded-lg shrink-0"
                  style={{ background: 'var(--surface2)', color: 'var(--accent-light)', border: '1px solid var(--border)' }}>
                  {switching === s.id ? '...' : 'Jadikan aktif'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
