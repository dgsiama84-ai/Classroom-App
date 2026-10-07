import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mata_kuliah_id = searchParams.get('mata_kuliah_id')
  const kelas = searchParams.get('kelas')

  if (!mata_kuliah_id || !kelas) {
    return NextResponse.json({ error: 'mata_kuliah_id dan kelas wajib diisi' }, { status: 400 })
  }

  // Fetch pertemuan log
  const { data: logs, error } = await supabaseAdmin
    .from('pertemuan_log')
    .select('pertemuan, is_locked')
    .eq('mata_kuliah_id', mata_kuliah_id)
    .eq('kelas', kelas)
    .order('pertemuan', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch jumlah absensi per pertemuan
  const { data: absensi } = await supabaseAdmin
    .from('absensi')
    .select('pertemuan')
    .eq('mata_kuliah_id', mata_kuliah_id)
    .eq('kelas', kelas)

  // Hitung jumlah absensi per pertemuan
  const absensiCount: Record<number, number> = {}
  absensi?.forEach(a => {
    absensiCount[a.pertemuan] = (absensiCount[a.pertemuan] || 0) + 1
  })

  const result = logs?.map(log => ({
    pertemuan: log.pertemuan,
    is_locked: log.is_locked,
    jumlah_absensi: absensiCount[log.pertemuan] || 0,
  }))

  return NextResponse.json({ success: true, data: result })
}