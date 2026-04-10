import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'


export async function POST(req: NextRequest) {
  const { session_id } = await req.json()

  if (!session_id) {
    return NextResponse.json({ error: 'session_id wajib diisi' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('qr_session')
    .select(`*, mata_kuliah(kode, nama)`)
    .eq('id', session_id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'QR tidak valid atau sudah dihapus' }, { status: 404 })
  }

  const now = new Date()
  const expiresAt = new Date(data.expires_at)
    data.expires_at.endsWith('Z') ? data.expires_at : data.expires_at + 'Z'

  if (now > expiresAt) {
    return NextResponse.json({ error: 'QR sudah kadaluarsa' }, { status: 410 })
  }

  return NextResponse.json({
    valid: true,
    session: {
      id: data.id,
      mata_kuliah_id: data.mata_kuliah_id,
      mata_kuliah: data.mata_kuliah,
      kelas: data.kelas,
      pertemuan: data.pertemuan,
      expires_at: data.expires_at,
    }
  })
}
