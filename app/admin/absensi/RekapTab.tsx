'use client'
import { useEffect, useState } from 'react'
import Select from '@/components/select'
import Card from '@/components/Card'
import { pressProps } from '@/components/pressProps'
import { Download, CheckCircle2, Inbox } from 'lucide-react'
import { formatTime } from '@/lib/utils'
import { statusMeta } from '@/lib/status'
import { useMatkulList } from '@/lib/hooks/useMatkulList'
import { AbsensiRecord, RekapRecord } from '@/lib/types'

interface ImportResult {
  inserted: number
  skipped: number
  mapped: { tab: string; matchedTo: string }[]
  unmapped: string[]
}

export default function RekapTab() {
  const allMatkulList = useMatkulList(true)

  const [absensiList, setAbsensiList] = useState<AbsensiRecord[]>([])
  const [rekapPertemuan, setRekapPertemuan] = useState<RekapRecord[]>([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  const [rekapMatkul, setRekapMatkul] = useState('')
  const [rekapPertemuanFilter, setRekapPertemuanFilter] = useState('')

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
    loadRekap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <Card className="p-4 mb-4">
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
          Sync dari Google Sheets
        </p>
        <button onClick={importFromSheets} disabled={importing} {...pressProps}
          className="w-full py-2.5 rounded-xl text-sm font-medium"
          style={{ background: 'var(--accent)', color: 'white' }}>
          {importing
            ? <span className="flex items-center justify-center gap-1.5"><Download size={16} className="animate-pulse" /> Mengimpor...</span>
            : <span className="flex items-center justify-center gap-1.5"><Download size={16} /> Import Data Sheets</span>
          }
        </button>
        {importResult && (
          <div className="mt-2 space-y-1">
            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              <span className="flex items-center justify-center gap-1.5">
                <CheckCircle2 size={13} style={{ color: '#22c55e' }} />
                {importResult.inserted} diimport · {importResult.skipped} dilewati
              </span>
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
      </Card>

      <Card className="p-4 mb-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>Mata Kuliah</label>
            <Select value={rekapMatkul} onChange={setRekapMatkul} placeholder="Semua"
              options={allMatkulList.map(mk => ({ value: mk.id, label: `${mk.kode} — ${mk.nama}${mk.semester ? ` (${mk.semester})` : ''}` }))} />
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
      </Card>

      {rekapPertemuan.length > 0 ? (
        <div>
          <div className="flex gap-2 mb-3">
            {(['hadir', 'sakit', 'izin', 'alpa'] as const).map(s => {
              const light = statusMeta(s, '15')
              const solid = statusMeta(s, '30')
              return (
                <div key={s} className="flex-1 rounded-xl px-2 py-2 text-center"
                  style={{ background: light.bg, border: `1px solid ${solid.bg}` }}>
                  <p className={`text-lg font-bold ${light.text}`}>
                    {rekapPertemuan.filter(m => m.status === s).length}
                  </p>
                  <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{s}</p>
                </div>
              )
            })}
          </div>
          <div className="space-y-2">
            {rekapPertemuan.map(item => {
              const c = statusMeta(item.status)
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
              <Card key={item.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{item.nama}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {item.nim} · Kelas {item.kelas} · Pertemuan {item.pertemuan}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}