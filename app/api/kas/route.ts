import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireRole } from '@/lib/admin-auth'
import { nowInMakassar } from '@/lib/utils'
import { getSemesterAktifId, resolveSemesterScope } from '@/lib/semester'

const JENIS = ['pemasukan', 'pengeluaran']

export async function GET(req: NextRequest) {
  const admin = await requireRole(req, ['bendahara'])
  if (admin instanceof NextResponse) return admin

  const scope = await resolveSemesterScope(new URL(req.url).searchParams)

  const { data, error } = await supabaseAdmin
    .from('kas_transaksi')
    .select('id, jenis, jumlah, keterangan, kategori, tanggal, created_at, periode_id, semester_id')
    .order('tanggal', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const all = data ?? []
  const rows = scope.all ? all : all.filter(r => r.semester_id === scope.id)
  const sum = (list: typeof all, jenis: string) =>
    list.filter(r => r.jenis === jenis).reduce((s, r) => s + Number(r.jumlah), 0)
  const pemasukan = sum(rows, 'pemasukan')
  const pengeluaran = sum(rows, 'pengeluaran')

  return NextResponse.json({
    data: rows,
    ringkasan: { pemasukan, pengeluaran, saldo: pemasukan - pengeluaran },
    // Total kas di semua semester (buat info; ringkasan di atas per semester yang dipilih)
    saldo_total: sum(all, 'pemasukan') - sum(all, 'pengeluaran'),
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

  // Transaksi manual (pengeluaran) otomatis masuk semester aktif
  const semesterId = await getSemesterAktifId()
  if (!semesterId) {
    return NextResponse.json({ error: 'Belum ada semester aktif. Atur dulu di panel admin.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('kas_transaksi')
    .insert({ jenis, jumlah, keterangan, kategori, tanggal, dibuat_oleh: admin.username, semester_id: semesterId })
    .select('id, jenis, jumlah, keterangan, kategori, tanggal, created_at, semester_id')
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
