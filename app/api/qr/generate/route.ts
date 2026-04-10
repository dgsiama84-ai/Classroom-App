import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const { mata_kuliah_id, kelas, pertemuan, durasi_menit } = await req.json()

  if (!mata_kuliah_id || !kelas || !pertemuan) {
    return NextResponse.json({ error: 'mata_kuliah_id, kelas, pertemuan wajib diisi' }, { status: 400 })
  }

  // Cek apakah pertemuan sudah di-lock
  const { data: log } = await supabaseAdmin
    .from('pertemuan_log')
    .select('is_locked')
    .eq('mata_kuliah_id', mata_kuliah_id)
    .eq('kelas', kelas)
    .eq('pertemuan', pertemuan)
    .single()

  if (log?.is_locked) {
    return NextResponse.json({ error: 'Pertemuan ini sudah dikunci oleh admin' }, { status: 403 })
  }

  const durasi = durasi_menit || 15
  const expires_at = new Date(Date.now() + durasi * 60 * 1000).toISOString()

  // Hapus semua qr_session yang sudah expired
  await supabaseAdmin
    .from('qr_session')
    .delete()
    .lt('expires_at', new Date().toISOString())

  // Hapus session lama untuk matkul+kelas+pertemuan yang sama
  await supabaseAdmin
    .from('qr_session')
    .delete()
    .eq('mata_kuliah_id', mata_kuliah_id)
    .eq('kelas', kelas)
    .eq('pertemuan', pertemuan)

  const { data, error } = await supabaseAdmin
    .from('qr_session')
    .insert({ mata_kuliah_id, kelas, pertemuan, expires_at })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Catat ke pertemuan_log
  await supabaseAdmin
    .from('pertemuan_log')
    .upsert({
      mata_kuliah_id,
      kelas,
      pertemuan,
      is_locked: false,
    }, { onConflict: 'mata_kuliah_id,kelas,pertemuan' })

  return NextResponse.json({ success: true, session: data })
}