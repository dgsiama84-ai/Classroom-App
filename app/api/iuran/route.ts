import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireRole } from '@/lib/admin-auth'
import { nowInMakassar } from '@/lib/utils'
import { resolveSemesterScope } from '@/lib/semester'

// GET /api/iuran → daftar periode + progres ringkas
// GET /api/iuran?periode_id=<id> → detail: seluruh mahasiswa + status bayar (support cicilan)
export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ['bendahara'])
  if (auth instanceof NextResponse) return auth

  const searchParams = new URL(req.url).searchParams
  const periodeId = searchParams.get('periode_id')

  if (!periodeId) {
    // Daftar periode: default semester aktif. ?semester=<id> / ?semester=all untuk yang lain.
    const scope = await resolveSemesterScope(searchParams)

    let periodeQuery = supabaseAdmin
      .from('iuran_periode')
      .select('id, nama, nominal, created_at, semester_id, semester_ref:semester_id(nama, tahun_ajaran, urutan)')
    if (!scope.all) periodeQuery = periodeQuery.eq('semester_id', scope.id)

    const { data: periodeRaw, error: periodeErr } = await periodeQuery
    if (periodeErr) return NextResponse.json({ error: periodeErr.message }, { status: 500 })

    // Semester terbaru dulu, lalu nama periode
    const periodeData = (periodeRaw ?? [])
      .map(({ semester_ref, ...p }) => {
        const ref = Array.isArray(semester_ref) ? semester_ref[0] : semester_ref
        return { ...p, semester_nama: ref?.nama ?? null, semester_urutan: ref?.urutan ?? 0 }
      })
      .sort((a, b) => b.semester_urutan - a.semester_urutan || a.nama.localeCompare(b.nama))

    // Hitung progres per periode (hanya periode yang ditampilkan)
    const periodeIds = periodeData.map(p => p.id)
    const { data: bayarData, error: bayarErr } = periodeIds.length
      ? await supabaseAdmin
          .from('kas_transaksi')
          .select('periode_id, nim, jumlah')
          .in('periode_id', periodeIds)
          .eq('jenis', 'pemasukan')
      : { data: [], error: null }

    if (bayarErr) return NextResponse.json({ error: bayarErr.message }, { status: 500 })

    // Agregasi: per periode, hitung unik siswa yang bayar + total terkumpul
    const progres = new Map<string, { unik: Set<string>; sum: number }>()
    for (const b of bayarData ?? []) {
      const cur = progres.get(b.periode_id) ?? { unik: new Set(), sum: 0 }
      cur.unik.add(b.nim)
      cur.sum += Number(b.jumlah)
      progres.set(b.periode_id, cur)
    }

    const data = periodeData.map(({ semester_urutan, ...p }) => ({
      ...p,
      nominal: Number(p.nominal),
      sudah_bayar: progres.get(p.id)?.unik.size ?? 0,
      terkumpul: progres.get(p.id)?.sum ?? 0,
    }))

    // Total mahasiswa
    const { count: totalMhs } = await supabaseAdmin
      .from('mahasiswa')
      .select('nim', { count: 'exact', head: true })

    return NextResponse.json({ data, total_mahasiswa: totalMhs ?? 0 })
  }

  // Detail satu periode: semua mahasiswa + status bayar (cicilan)
  const { data: periode, error: periodeErr } = await supabaseAdmin
    .from('iuran_periode')
    .select('id, nama, nominal')
    .eq('id', periodeId)
    .single()

  if (periodeErr) return NextResponse.json({ error: 'Periode tidak ditemukan' }, { status: 404 })

  const { data: mahasiswa, error: mhsErr } = await supabaseAdmin
    .from('mahasiswa')
    .select('nim, nama, kelas')
    .order('nama')

  if (mhsErr) return NextResponse.json({ error: mhsErr.message }, { status: 500 })

  // Ambil semua pembayaran (cicilan) untuk periode ini
  const { data: pembayaran, error: bayarErr } = await supabaseAdmin
    .from('kas_transaksi')
    .select('id, nim, jumlah, tanggal')
    .eq('periode_id', periodeId)
    .eq('jenis', 'pemasukan')

  if (bayarErr) return NextResponse.json({ error: bayarErr.message }, { status: 500 })

  // Hitung total bayar per nim (untuk cicilan)
  const totalPerNim = new Map<string, number>()
  const riwayatPerNim = new Map<string, Array<{ id: string; jumlah: number; tanggal: string }>>()

  for (const p of pembayaran ?? []) {
    const current = totalPerNim.get(p.nim) ?? 0
    totalPerNim.set(p.nim, current + Number(p.jumlah))

    const hist = riwayatPerNim.get(p.nim) ?? []
    hist.push({ id: p.id, jumlah: Number(p.jumlah), tanggal: p.tanggal })
    riwayatPerNim.set(p.nim, hist)
  }

  // Buat response: status per mahasiswa
  const nominal = Number(periode.nominal)
  const rows = (mahasiswa ?? []).map(m => {
    const totalBayar = totalPerNim.get(m.nim) ?? 0
    const riwayat = riwayatPerNim.get(m.nim) ?? []

    let status: 'lunas' | 'kurang' | 'belum bayar'
    let sisa = 0

    if (totalBayar === 0) {
      status = 'belum bayar'
    } else if (totalBayar >= nominal) {
      status = 'lunas'
    } else {
      status = 'kurang'
      sisa = nominal - totalBayar
    }

    return {
      nim: m.nim,
      nama: m.nama,
      kelas: m.kelas,
      status,
      totalBayar,
      sisa,
      riwayat, // array pembayaran (cicilan)
    }
  })

  return NextResponse.json({
    periode: { ...periode, nominal },
    rows,
  })
}

// POST /api/iuran → input pembayaran baru (support cicilan)
export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ['bendahara'])
  if (auth instanceof NextResponse) return auth

  const { periode_id, nim, jumlah } = await req.json()

  if (!periode_id || !nim) {
    return NextResponse.json({ error: 'periode_id dan nim wajib diisi' }, { status: 400 })
  }

  // Validasi periode & mahasiswa
  const { data: periode, error: periodeErr } = await supabaseAdmin
    .from('iuran_periode')
    .select('nama, nominal, semester_id')
    .eq('id', periode_id)
    .single()

  if (periodeErr) return NextResponse.json({ error: 'Periode tidak ditemukan' }, { status: 404 })

  const { data: mhs, error: mhsErr } = await supabaseAdmin
    .from('mahasiswa')
    .select('nama')
    .eq('nim', nim)
    .single()

  if (mhsErr) return NextResponse.json({ error: 'Mahasiswa tidak ditemukan' }, { status: 404 })

  const parsedJumlah = Number(jumlah)
  if (!Number.isInteger(parsedJumlah) || parsedJumlah <= 0 || parsedJumlah > 100_000_000) {
    return NextResponse.json({ error: 'Jumlah harus angka bulat lebih dari 0' }, { status: 400 })
  }

  // Insert pembayaran (kali ini TANPA unique constraint, biar cicilan bisa)
  const { data, error } = await supabaseAdmin
    .from('kas_transaksi')
    .insert({
      jenis: 'pemasukan',
      jumlah: parsedJumlah,
      keterangan: 'Iuran', // Simpel, sesuai requirement
      kategori: 'iuran',
      tanggal: nowInMakassar().tanggal,
      dibuat_oleh: auth.username,
      periode_id,
      semester_id: periode.semester_id,
      nim,
    })
    .select('id, jumlah, tanggal')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, data })
}

// DELETE /api/iuran → batalkan satu pembayaran
export async function DELETE(req: NextRequest) {
  const auth = await requireRole(req, ['bendahara'])
  if (auth instanceof NextResponse) return auth

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID transaksi wajib diisi' }, { status: 400 })

  // Validasi bahwa transaksi ini adalah iuran (punya periode_id & nim)
  const { data: txn, error: checkErr } = await supabaseAdmin
    .from('kas_transaksi')
    .select('periode_id, nim')
    .eq('id', id)
    .single()

  if (checkErr || !txn.periode_id || !txn.nim) {
    return NextResponse.json({ error: 'Transaksi iuran tidak ditemukan' }, { status: 404 })
  }

  const { error } = await supabaseAdmin
    .from('kas_transaksi')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
