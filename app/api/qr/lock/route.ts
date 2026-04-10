import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const { mata_kuliah_id, kelas, pertemuan, is_locked } = await req.json()

  if (!mata_kuliah_id || !kelas || !pertemuan) {
    return NextResponse.json({ error: 'mata_kuliah_id, kelas, pertemuan wajib diisi' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('pertemuan_log')
    .update({ is_locked })
    .eq('mata_kuliah_id', mata_kuliah_id)
    .eq('kelas', kelas)
    .eq('pertemuan', pertemuan)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Kalau di-lock, hapus session aktif sekalian
  if (is_locked) {
    await supabaseAdmin
      .from('qr_session')
      .delete()
      .eq('mata_kuliah_id', mata_kuliah_id)
      .eq('kelas', kelas)
      .eq('pertemuan', pertemuan)
  }

  return NextResponse.json({ success: true })
}