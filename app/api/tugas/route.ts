import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mata_kuliah_id = searchParams.get('mata_kuliah_id')

  let query = supabaseAdmin
    .from('tugas')
    .select(`*, mata_kuliah(kode, nama)`)
    .order('deadline', { ascending: true })

  if (mata_kuliah_id) query = query.eq('mata_kuliah_id', mata_kuliah_id)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const { mata_kuliah_id, judul, deskripsi, deadline } = await req.json()

  if (!mata_kuliah_id || !judul || !deadline) {
    return NextResponse.json({ error: 'mata_kuliah_id, judul, deadline wajib diisi' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('tugas')
    .insert({ mata_kuliah_id, judul, deskripsi, deadline })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })

  const { error } = await supabaseAdmin.from('tugas').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
