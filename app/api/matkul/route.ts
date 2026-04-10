import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('mata_kuliah')
    .select('*')
    .order('kode')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data })
}

export async function POST(req: NextRequest) {
  const { kode, nama } = await req.json()

  if (!kode || !nama) {
    return NextResponse.json({ error: 'Kode dan nama wajib diisi' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('mata_kuliah')
    .insert({ kode: kode.trim().toUpperCase(), nama: nama.trim() })
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
