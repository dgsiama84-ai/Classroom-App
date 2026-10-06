import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireRole } from '@/lib/admin-auth'
import { nowInMakassar } from '@/lib/utils'

const JENIS = ['pemasukan', 'pengeluaran']

export async function GET(req: NextRequest) {
  const admin = await requireRole(req, ['bendahara'])
  if (admin instanceof NextResponse) return admin

  const { data, error } = await supabaseAdmin
    .from('kas_transaksi')
    .select('id, jenis, jumlah, keterangan, kategori, tanggal, created_at, periode_id')
    .order('tanggal', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []
  const pemasukan = rows.filter(r => r.jenis === 'pemasukan').reduce((s, r) => s + Number(r.jumlah), 0)
  const pengeluaran = rows.filter(r => r.jenis === 'pengeluaran').reduce((s, r) => s + Number(r.jumlah), 0)

  return NextResponse.json({
    data: rows,
    ringkasan: { pemasukan, pengeluaran, saldo: pemasukan - pengeluaran },
  })
}

export async function POST(req: NextRequest) {
  const admin = await requireRole(req, ['bendahara'])
  if (admin instanceof NextResponse) return admin

  const body = await req.json()
  const jenis = String(body.jenis ?? '')
  const jumlah = Number(body.jumlah)
  const keterangan = String(body.keterangan ?? '').trim()
  const kategori = body.kategori ? String(body.kategori).trim().slice(0, 30) : null
  const tanggal = /^\d{4}-\d{2}-\d{2}$/.test(body.tanggal ?? '') ? body.tanggal : nowInMakassar().tanggal

  if (!JENIS.includes(jenis)) {
    return NextResponse.json({ error: 'Jenis harus pemasukan atau pengeluaran' }, { status: 400 })
  }
  if (!Number.isInteger(jumlah) || jumlah <= 0 || jumlah > 1_000_000_000) {
    return NextResponse.json({ error: 'Jumlah harus angka bulat lebih dari 0' }, { status: 400 })
  }
  if (!keterangan || keterangan.length > 120) {
    return NextResponse.json({ error: 'Keterangan wajib diisi (maks 120 karakter)' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('kas_transaksi')
    .insert({ jenis, jumlah, keterangan, kategori, tanggal, dibuat_oleh: admin.username })
    .select('id, jenis, jumlah, keterangan, kategori, tanggal, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function DELETE(req: NextRequest) {
  const admin = await requireRole(req, ['bendahara'])
  if (admin instanceof NextResponse) return admin

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })

  const { error } = await supabaseAdmin.from('kas_transaksi').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
