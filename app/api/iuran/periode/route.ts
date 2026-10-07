import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireRole } from '@/lib/admin-auth'
import { getSemesterAktifId } from '@/lib/semester'

// POST /api/iuran/periode → bikin periode iuran baru di semester aktif.
// nominal = tagihan WAJIB per orang. Lunas kalau total bayar >= nominal (cicilan boleh).
export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ['bendahara', 'admin'])
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  const nama = String(body.nama ?? '').trim()
  const nominal = Number(body.nominal)

  if (!nama || nama.length > 60) {
    return NextResponse.json({ error: 'Nama periode wajib diisi (maks 60 karakter)' }, { status: 400 })
  }
  if (!Number.isInteger(nominal) || nominal <= 0 || nominal > 100_000_000) {
    return NextResponse.json({ error: 'Nominal harus angka bulat lebih dari 0' }, { status: 400 })
  }

  const semesterId = await getSemesterAktifId()
  if (!semesterId) {
    return NextResponse.json({ error: 'Belum ada semester aktif. Atur dulu di panel admin.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('iuran_periode')
    .insert({ nama, nominal, semester_id: semesterId })
    .select('id, nama, nominal, semester_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

// DELETE /api/iuran/periode → hapus periode, HANYA kalau belum ada pembayaran sama sekali
// (buat benerin salah ketik). Periode yang sudah ada pembayarannya tidak bisa dihapus.
export async function DELETE(req: NextRequest) {
  const auth = await requireRole(req, ['bendahara', 'admin'])
  if (auth instanceof NextResponse) return auth

  const { id } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'ID periode wajib diisi' }, { status: 400 })

  const { count, error: cekErr } = await supabaseAdmin
    .from('kas_transaksi')
    .select('id', { count: 'exact', head: true })
    .eq('periode_id', id)

  if (cekErr) return NextResponse.json({ error: cekErr.message }, { status: 500 })
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: 'Periode ini sudah ada pembayarannya, tidak bisa dihapus' }, { status: 409 })
  }

  const { error } = await supabaseAdmin.from('iuran_periode').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}