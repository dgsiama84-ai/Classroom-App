import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { supabaseAdmin } from '@/lib/supabase-admin'
<<<<<<< HEAD
import { resolveSemesterScope } from '@/lib/semester'
=======
>>>>>>> 428493411cf03b72a0d0b4ecd241ba935bc6caae

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

// Ambil NIM dari token mahasiswa. Token staff (tanpa nim) otomatis ditolak.
async function getNim(req: NextRequest): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload.nim ? String(payload.nim) : null
  } catch {
    return null
  }
}

// GET /api/mahasiswa/kas
// Hanya baca. Data orang lain TIDAK dikirim: cuma jumlah, tanpa nama/NIM.
export async function GET(req: NextRequest) {
  const nim = await getNim(req)
  if (!nim) return NextResponse.json({ error: 'Sesi tidak valid' }, { status: 401 })

<<<<<<< HEAD
  // Default semester aktif. ?semester=<id> atau ?semester=all untuk yang lain.
  const scope = await resolveSemesterScope(new URL(req.url).searchParams)

  let periodeQuery = supabaseAdmin.from('iuran_periode').select('id, nama, nominal, semester_id').order('nama')
  if (!scope.all) periodeQuery = periodeQuery.eq('semester_id', scope.id)

  const [periodeRes, trxRes, mhsRes] = await Promise.all([
    periodeQuery,
    supabaseAdmin
      .from('kas_transaksi')
      .select('id, jenis, jumlah, keterangan, kategori, tanggal, created_at, periode_id, semester_id, nim')
=======
  const [periodeRes, trxRes, mhsRes] = await Promise.all([
    supabaseAdmin.from('iuran_periode').select('id, nama, nominal').order('nama'),
    supabaseAdmin
      .from('kas_transaksi')
      .select('id, jenis, jumlah, keterangan, kategori, tanggal, created_at, periode_id, nim')
>>>>>>> 428493411cf03b72a0d0b4ecd241ba935bc6caae
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false }),
    supabaseAdmin.from('mahasiswa').select('nim', { count: 'exact', head: true }),
  ])

  if (periodeRes.error) return NextResponse.json({ error: periodeRes.error.message }, { status: 500 })
  if (trxRes.error) return NextResponse.json({ error: trxRes.error.message }, { status: 500 })

<<<<<<< HEAD
  const trxSemua = trxRes.data ?? []
  const trx = scope.all ? trxSemua : trxSemua.filter(t => t.semester_id === scope.id)
  const totalMahasiswa = mhsRes.count ?? 0

  // Ringkasan saldo (untuk semester yang dipilih) + total semua semester
  const hitung = (list: typeof trxSemua, jenis: string) =>
    list.filter(t => t.jenis === jenis).reduce((s, t) => s + Number(t.jumlah), 0)
  const pemasukan = hitung(trx, 'pemasukan')
  const pengeluaran = hitung(trx, 'pengeluaran')
  const saldoTotal = hitung(trxSemua, 'pemasukan') - hitung(trxSemua, 'pengeluaran')
=======
  const trx = trxRes.data ?? []
  const totalMahasiswa = mhsRes.count ?? 0

  // Ringkasan saldo
  const pemasukan = trx.filter(t => t.jenis === 'pemasukan').reduce((s, t) => s + Number(t.jumlah), 0)
  const pengeluaran = trx.filter(t => t.jenis === 'pengeluaran').reduce((s, t) => s + Number(t.jumlah), 0)
>>>>>>> 428493411cf03b72a0d0b4ecd241ba935bc6caae

  // Iuran per periode + status milik si peminta saja
  const iuran = (periodeRes.data ?? []).map(p => {
    const nominal = Number(p.nominal)
    const perNim = new Map<string, number>()
    for (const t of trx) {
      if (t.jenis !== 'pemasukan' || t.periode_id !== p.id || !t.nim) continue
      perNim.set(t.nim, (perNim.get(t.nim) ?? 0) + Number(t.jumlah))
    }
    const totals = Array.from(perNim.values())
    const sayaBayar = perNim.get(nim) ?? 0

    return {
      id: p.id,
      nama: p.nama,
      nominal,
      lunas: totals.filter(v => v >= nominal).length,
      terkumpul: totals.reduce((s, v) => s + v, 0),
      saya: {
        status: sayaBayar === 0 ? 'belum bayar' : sayaBayar >= nominal ? 'lunas' : 'kurang',
        totalBayar: sayaBayar,
        sisa: Math.max(0, nominal - sayaBayar),
      },
    }
  })

  // Riwayat umum: pengeluaran + pemasukan non-iuran (tanpa nim siapa pun)
  const riwayat = trx
    .filter(t => !t.periode_id)
    .map(t => ({
      id: t.id,
      jenis: t.jenis,
      jumlah: Number(t.jumlah),
      keterangan: t.keterangan,
      kategori: t.kategori,
      tanggal: t.tanggal,
    }))

  return NextResponse.json({
    ringkasan: { pemasukan, pengeluaran, saldo: pemasukan - pengeluaran },
<<<<<<< HEAD
    saldo_total: saldoTotal,
=======
>>>>>>> 428493411cf03b72a0d0b4ecd241ba935bc6caae
    total_mahasiswa: totalMahasiswa,
    iuran,
    riwayat,
  })
}