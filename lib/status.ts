// Sebelumnya ada 2 versi hampir sama: `statusColor()` di admin/absensi dan
// `statusConfig` di mahasiswa/riwayat. Disatukan di sini biar warna/label
// status absensi konsisten di seluruh app.

const STATUS_META: Record<string, { text: string; hex: string; label: string }> = {
  hadir: { text: 'text-green-400', hex: '#22c55e', label: '✓ Hadir' },
  sakit: { text: 'text-blue-400', hex: '#3b82f6', label: 'S Sakit' },
  izin: { text: 'text-yellow-400', hex: '#eab308', label: 'I Izin' },
  alpa: { text: 'text-red-400', hex: '#ef4444', label: 'A Alpa' },
}

export function statusMeta(status: string, alpha: string = '30') {
  const m = STATUS_META[status]
  if (!m) return { text: 'text-gray-400', bg: '#ffffff10', label: '— Belum' }
  return { text: m.text, bg: `${m.hex}${alpha}`, label: m.label }
}