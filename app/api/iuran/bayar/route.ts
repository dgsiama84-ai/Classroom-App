import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireRole } from '@/lib/admin-auth'
import { nowInMakassar } from '@/lib/utils'

// Tandai mahasiswa sudah bayar → otomatis jadi pemasukan di kas.
export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ['bendahara'])
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const periode_id = String(body.periode_id ?? '')
  const nim = String(body.nim ?? '').trim()
  if (!periode_id || !nim) {
    return NextResponse.json({ error: 'periode_id dan nim wajib diisi' }, { status: 400 })
  }

  const [periodeRes, mhsRes] = await Promise.all([
    supabaseAdmin.from('iuran_periode').select('nama, nominal').eq('id', periode_id).single(),
    supabaseAdmin.from('mahasiswa').select('nama').eq('nim', nim).single(),
  ])
  if (periodeRes.error) return NextResponse.json({ error: 'Periode tidak ditemukan' }, { status: 404 })
  if (mhsRes.error) return NextResponse.json({ error: 'Mahasiswa tidak ditemukan' }, { status: 404 })

  const jumlah = body.jumlah === undefined ? Number(periodeRes.data.nominal) : Number(body.jumlah)
  if (!Number.isInteger(jumlah) || jumlah <= 0 || jumlah > 100_000_000) {
    return NextResponse.json({ error: 'Jumlah harus angka bulat lebih dari 0' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('kas_transaksi')
    .insert({
      jenis: 'pemasukan',
      jumlah,
      keterangan: `Iuran ${periodeRes.data.nama} — ${mhsRes.data.nama}`.slice(0, 120),
      kategori: 'Iuran',
      tanggal: nowInMakassar().tanggal,
      dibuat_oleh: auth.username,
      periode_id,
      nim,
    })
    .select('id, jumlah, tanggal')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Mahasiswa ini sudah tercatat membayar' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, data })
}

// Batalkan pembayaran (hapus baris kas terkait).
export async function DELETE(req: NextRequest) {
  const auth = await requireRole(req, ['bendahara'])
  if (auth instanceof NextResponse) return auth

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('kas_transaksi').delete().eq('id', id).not('periode_id', 'is', null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
