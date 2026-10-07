import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'

// GET /api/semester → daftar semester (terbaru dulu). Publik: cuma nama & status aktif.
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('semester')
    .select('id, nama, tahun_ajaran, urutan, is_aktif')
    .order('urutan', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

interface MatkulInput { kode?: string; nama?: string; dosen?: string }

// POST /api/semester (admin) → bikin semester baru + mata kuliah sekaligus.
// Periode iuran BUKAN urusan admin: bendahara yang bikin dari halaman Iuran.
// Semuanya jalan di satu transaksi database: kalau satu gagal, tidak ada yang tersimpan.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  const nama = String(body.nama ?? '').trim()
  const tahunAjaran = String(body.tahun_ajaran ?? '').trim()
  const aktif = body.aktif === true

  if (!nama || !tahunAjaran) {
    return NextResponse.json({ error: 'Nama dan tahun ajaran wajib diisi' }, { status: 400 })
  }
  if (nama.length > 40 || tahunAjaran.length > 40) {
    return NextResponse.json({ error: 'Nama / tahun ajaran terlalu panjang' }, { status: 400 })
  }

  // Baris kosong dibuang; baris setengah terisi ditolak biar nggak ada data nyasar.
  const matkul: { kode: string; nama: string; dosen: string }[] = []
  for (const row of (Array.isArray(body.matkul) ? body.matkul : []) as MatkulInput[]) {
    const kode = String(row.kode ?? '').trim()
    const n = String(row.nama ?? '').trim()
    const dosen = String(row.dosen ?? '').trim()
    if (!kode && !n && !dosen) continue
    if (!kode || !n) {
      return NextResponse.json({ error: 'Mata kuliah: kode dan nama wajib diisi' }, { status: 400 })
    }
    matkul.push({ kode, nama: n, dosen })
  }

  const { data, error } = await supabaseAdmin.rpc('buat_semester', {
    p_nama: nama,
    p_tahun_ajaran: tahunAjaran,
    p_aktif: aktif,
    p_matkul: matkul,
  })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Nama atau tahun ajaran semester itu sudah ada' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, id: data })
}

// PATCH /api/semester (admin) → jadikan satu semester sebagai semester aktif.
// Pergantian dilakukan atomik di database; yang lain otomatis nonaktif.
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth

  const { id } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'ID semester wajib diisi' }, { status: 400 })

  const { error } = await supabaseAdmin.rpc('set_semester_aktif', { p_id: id })
  if (error) {
    const notFound = error.message.includes('tidak ditemukan')
    return NextResponse.json({ error: error.message }, { status: notFound ? 404 : 500 })
  }
  return NextResponse.json({ success: true })
}