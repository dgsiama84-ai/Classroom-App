'use client'
import { useSemesterList } from '@/lib/hooks/useSemesterList'

// Filter semester yang sama di semua halaman.
// value: '' = semester aktif (default, ikut pengaturan admin), 'all' = semua, atau id semester.
export default function SemesterFilter({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const semesters = useSemesterList()
  const aktif = semesters.find(s => s.is_aktif)
  const lainnya = semesters.filter(s => !s.is_aktif)

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      aria-label="Filter semester"
      className="text-xs font-medium mb-4 px-3 py-2 rounded-lg outline-none max-w-full"
      style={{ background: 'var(--surface2)', color: 'var(--accent-light)', border: '1px solid var(--border)' }}
    >
      <option value="">
        {aktif ? `Semester aktif · ${aktif.nama} (${aktif.tahun_ajaran})` : 'Semester aktif'}
      </option>
      {lainnya.map(s => (
        <option key={s.id} value={s.id}>
          {s.nama} ({s.tahun_ajaran})
        </option>
      ))}
      <option value="all">Semua semester</option>
    </select>
  )
}
