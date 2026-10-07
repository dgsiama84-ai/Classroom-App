import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { jwtVerify } from 'jose'
import { appendToSheet } from '@/lib/sheets'
import { nowInMakassar } from '@/lib/utils'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

async function getMahasiswaFromToken(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.replace('Bearer ', '').trim()
  if (!token) throw new Error('Token tidak ditemukan')
  const { payload } = await jwtVerify(token, JWT_SECRET)
  return payload as { nim: string; nama: string; kelas: string }
}

// Dipakai oleh path QR-session maupun path manual — sebelumnya dua-duanya
// menduplikasi blok insert + cek "sudah absen" dengan cara berbeda (yang manual
// bahkan rawan race condition karena cek-lalu-insert terpisah). Sekarang satu
// fungsi, insert dulu dan andalkan unique constraint DB buat deteksi duplikat.
async function insertAbsensi(params: {
  nim: string
  nama: string
  kelas: string
  mata_kuliah_id: string
  pertemuan: number
}) {
  const { tanggal, waktu } = nowInMakassar()

  const { data, error } = await supabaseAdmin
    .from('absensi')
    .insert({ ...params, tanggal, waktu, status: 'hadir' })
    .select()
    .single()

  if (!error) return { alreadyExists: false as const, data, tanggal, waktu }

  if (error.code === '23505') {
    const { data: existing } = await supabaseAdmin
      .from('absensi')
      .select('tanggal, waktu, status')
      .eq('nim', params.nim)
      .eq('mata_kuliah_id', params.mata_kuliah_id)
      .eq('pertemuan', params.pertemuan)
      .maybeSingle()
    return { alreadyExists: true as const, existing }
  }

  throw new Error(error.message)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (body.sessionId) {
      const mahasiswa = await getMahasiswaFromToken(req)
      const { sessionId } = body

      const { data: session, error: sessionError } = await supabaseAdmin
        .from('qr_session')
        .select('*, mata_kuliah:mata_kuliah_id(id, kode, nama)')
        .eq('id', sessionId)
        .single()

      if (sessionError || !session) {
        return NextResponse.json({ error: 'QR tidak valid' }, { status: 404 })
      }

      const expiresAt = session.expires_at.endsWith('Z')
        ? session.expires_at
        : session.expires_at + 'Z'

      if (new Date(expiresAt) < new Date()) {
        return NextResponse.json({ error: 'QR sudah kadaluarsa' }, { status: 410 })
      }

      if (session.kelas !== mahasiswa.kelas) {
        return NextResponse.json(
          { error: `QR ini untuk kelas ${session.kelas}, bukan kelas ${mahasiswa.kelas}` },
          { status: 403 }
        )
      }

      let inserted
      try {
        inserted = await insertAbsensi({
          nim: mahasiswa.nim,
          nama: mahasiswa.nama,
          kelas: mahasiswa.kelas,
          mata_kuliah_id: session.mata_kuliah_id,
          pertemuan: session.pertemuan,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal menyimpan absensi'
        return NextResponse.json({ error: msg }, { status: 500 })
      }

      if (inserted.alreadyExists) {
        return NextResponse.json({
          error: 'Kamu sudah absen di pertemuan ini',
          alreadyAbsent: true,
          data: {
            nama: mahasiswa.nama,
            mataKuliah: session.mata_kuliah.nama,
            pertemuan: session.pertemuan,
            tanggal: inserted.existing?.tanggal ?? null,
            waktu: inserted.existing?.waktu ?? null,
            status: inserted.existing?.status ?? 'hadir',
          },
        }, { status: 409 })
      }

      appendToSheet({
        nama: mahasiswa.nama,
        nim: mahasiswa.nim,
        kelas: mahasiswa.kelas,
        mataKuliah: session.mata_kuliah.nama,
        pertemuan: session.pertemuan,
      }).catch((err) => console.error('Sheets sync error:', err))

      return NextResponse.json({
        success: true,
        data: {
          nama: mahasiswa.nama,
          mataKuliah: session.mata_kuliah.nama,
          pertemuan: session.pertemuan,
          tanggal: inserted.tanggal,
          waktu: inserted.waktu,
        },
      })
    } else {
      const { nim, nama, kelas, mata_kuliah_id, pertemuan } = body

      if (!nim || !nama || !kelas || !mata_kuliah_id || !pertemuan) {
        return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
      }

      let inserted
      try {
        inserted = await insertAbsensi({ nim, nama, kelas, mata_kuliah_id, pertemuan })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal menyimpan absensi'
        return NextResponse.json({ error: msg }, { status: 500 })
      }

      if (inserted.alreadyExists) {
        return NextResponse.json({ error: 'Kamu sudah absen di pertemuan ini' }, { status: 409 })
      }

      return NextResponse.json({ success: true, data: inserted.data })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan'
    return NextResponse.json({ error: msg }, { status: 401 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const isAdmin = searchParams.get('admin') === 'true'

  if (isAdmin) {
    const matkulId = searchParams.get('mata_kuliah_id')
    const pertemuan = searchParams.get('pertemuan')

    if (matkulId && pertemuan) {
      const { data: allMahasiswa, error: mhsError } = await supabaseAdmin
        .from('mahasiswa')
        .select('nim, nama, kelas')
        .order('nama')

      if (mhsError) return NextResponse.json({ error: mhsError.message }, { status: 500 })

      const { data: absensi, error: absensiError } = await supabaseAdmin
        .from('absensi')
        .select('nim, waktu, status')
        .eq('mata_kuliah_id', matkulId)
        .eq('pertemuan', parseInt(pertemuan))

      if (absensiError) return NextResponse.json({ error: absensiError.message }, { status: 500 })

      const absensiMap = Object.fromEntries(
        absensi?.map(a => [a.nim, { waktu: a.waktu, status: a.status }]) ?? []
      )

      const result = (allMahasiswa ?? []).map(m => ({
        ...m,
        hadir: absensiMap[m.nim]?.status === 'hadir',
        status: absensiMap[m.nim]?.status ?? 'belum',
        waktu: absensiMap[m.nim]?.waktu ?? null,
      }))

      return NextResponse.json({ success: true, data: result })
    }

    let query = supabaseAdmin
      .from('absensi')
      .select('*, mata_kuliah:mata_kuliah_id(kode, nama)')
      .order('tanggal', { ascending: false })

    if (matkulId) query = query.eq('mata_kuliah_id', matkulId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data })
  }

  try {
    const mahasiswa = await getMahasiswaFromToken(req)

    const { data, error } = await supabaseAdmin
      .from('absensi')
<<<<<<< HEAD
      .select('*, mata_kuliah:mata_kuliah_id(kode, nama, semester_id)')
=======
      .select('*, mata_kuliah:mata_kuliah_id(kode, nama, semester)')
>>>>>>> 428493411cf03b72a0d0b4ecd241ba935bc6caae
      .eq('nim', mahasiswa.nim)
      .order('tanggal', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan'
    return NextResponse.json({ error: msg }, { status: 401 })
  }
}