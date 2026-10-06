import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ACTIVE_SEMESTER } from '@/lib/config'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const showAll = searchParams.get('all') === 'true'

  let query = supabaseAdmin.from('mata_kuliah').select('*').order('kode')
  if (!showAll) query = query.eq('semester', ACTIVE_SEMESTER)

  const { data, error } = await query

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data })
}

export async function POST(req: NextRequest) {
  const { kode, nama, dosen, semester } = await req.json()

  if (!kode || !nama) {
    return NextResponse.json({ error: 'Kode dan nama wajib diisi' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('mata_kuliah')
    .insert({
      kode: kode.trim().toUpperCase(),
      nama: nama.trim(),
      dosen: dosen?.trim() || null,
      semester: semester?.trim() || ACTIVE_SEMESTER,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()

  if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('mata_kuliah')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
