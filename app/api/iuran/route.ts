import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireRole } from '@/lib/admin-auth'

// GET /api/iuran                  → daftar periode + progres
// GET /api/iuran?periode_id=<id>  → detail: seluruh mahasiswa + status bayar
export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ['bendahara'])
  if (auth instanceof NextResponse) return auth

  const periodeId = new URL(req.url).searchParams.get('periode_id')

  if (!periodeId) {
    const [periodeRes, bayarRes, mhsRes] = await Promise.all([
      supabaseAdmin.from('iuran_periode').select('id, nama, nominal, created_at').order('created_at', { ascending: false }),
      supabaseAdmin.from('kas_transaksi').select('periode_id, jumlah').not('periode_id', 'is', null),
      supabaseAdmin.from('mahasiswa').select('nim', { count: 'exact', head: true }),
    ])
    const err = periodeRes.error || bayarRes.error || mhsRes.error
    if (err) return NextResponse.json({ error: err.message }, { status: 500 })

    const agg = new Map<string, { n: number; sum: number }>()
    for (const b of bayarRes.data ?? []) {
      const cur = agg.get(b.periode_id) ?? { n: 0, sum: 0 }
      cur.n += 1
      cur.sum += Number(b.jumlah)
      agg.set(b.periode_id, cur)
    }
    const data = (periodeRes.data ?? []).map(p => ({
      ...p,
      nominal: Number(p.nominal),
      sudah_bayar: agg.get(p.id)?.n ?? 0,
      terkumpul: agg.get(p.id)?.sum ?? 0,
    }))
    return NextResponse.json({ data, total_mahasiswa: mhsRes.count ?? 0 })
  }

  const [periodeRes, mhsRes, bayarRes] = await Promise.all([
    supabaseAdmin.from('iuran_periode').select('id, nama, nominal').eq('id', periodeId).single(),
    supabaseAdmin.from('mahasiswa').select('nim, nama, kelas').order('nama'),
    supabaseAdmin.from('kas_transaksi').select('id, nim, jumlah, tanggal').eq('periode_id', periodeId),
  ])
  if (periodeRes.error) return NextResponse.json({ error: 'Periode tidak ditemukan' }, { status: 404 })
  if (mhsRes.error || bayarRes.error) {
    return NextResponse.json({ error: (mhsRes.error || bayarRes.error)!.message }, { status: 500 })
  }

  const byNim = new Map((bayarRes.data ?? []).map(b => [b.nim, b]))
  const rows = (mhsRes.data ?? []).map(m => {
    const b = byNim.get(m.nim)
    return { ...m, bayar: b ? { id: b.id, jumlah: Number(b.jumlah), tanggal: b.tanggal } : null }
  })
  return NextResponse.json({
    periode: { ...periodeRes.data, nominal: Number(periodeRes.data.nominal) },
    rows,
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ['bendahara'])
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const nama = String(body.nama ?? '').trim()
  const nominal = Number(body.nominal)

  if (!nama || nama.length > 60) {
    return NextResponse.json({ error: 'Nama periode wajib diisi (maks 60 karakter)' }, { status: 400 })
  }
  if (!Number.isInteger(nominal) || nominal <= 0 || nominal > 100_000_000) {
    return NextResponse.json({ error: 'Nominal harus angka bulat lebih dari 0' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('iuran_periode').insert({ nama, nominal }).select('id, nama, nominal').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireRole(req, ['bendahara'])
  if (auth instanceof NextResponse) return auth

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })

  // Periode yang sudah punya pembayaran tidak boleh dihapus, supaya catatan uang tidak yatim.
  const { count } = await supabaseAdmin
    .from('kas_transaksi').select('id', { count: 'exact', head: true }).eq('periode_id', id)
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Periode ini sudah ada pembayaran. Batalkan semua pembayaran dulu.' },
      { status: 409 }
    )
  }

  const { error } = await supabaseAdmin.from('iuran_periode').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
