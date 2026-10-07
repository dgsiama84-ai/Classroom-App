import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
<<<<<<< HEAD
import { getSemesterAktifId, resolveSemesterScope } from '@/lib/semester'

// GET /api/matkul                  → mata kuliah semester aktif
// GET /api/matkul?semester=<id>    → semester tertentu
// GET /api/matkul?semester=all     → semua semester (juga: ?all=true)
export async function GET(req: NextRequest) {
  const scope = await resolveSemesterScope(new URL(req.url).searchParams)

  let query = supabaseAdmin
    .from('mata_kuliah')
    .select('id, kode, nama, dosen, semester_id, semester_ref:semester_id(nama, tahun_ajaran)')
    .order('kode')
  if (!scope.all) query = query.eq('semester_id', scope.id)

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // `semester` = label tahun ajaran (mis. "Ganjil 2026/2027"), sama seperti sebelumnya buat UI.
  const rows = (data ?? []).map(({ semester_ref, ...mk }) => {
    const ref = Array.isArray(semester_ref) ? semester_ref[0] : semester_ref
    return { ...mk, semester: ref?.tahun_ajaran ?? null }
  })
  return Response.json({ data: rows })
}

// POST: mata kuliah baru otomatis masuk semester aktif (kecuali semester_id dikirim eksplisit).
export async function POST(req: NextRequest) {
  const { kode, nama, dosen, semester_id } = await req.json()
=======
import { ACTIVE_SEMESTER } from '@/lib/config'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const showAll = searchParams.get('all') === 'true'

  let query = supabaseAdmin.from('mata_kuliah').select('*').order('kode')
  if (!showAll) query = query.eq('semester', ACTIVE_SEMESTER)

  const { data, error } = await query

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data })
}

export async function POST(req: NextRequest) {
  const { kode, nama, dosen, semester } = await req.json()
>>>>>>> 428493411cf03b72a0d0b4ecd241ba935bc6caae

  if (!kode || !nama) {
    return NextResponse.json({ error: 'Kode dan nama wajib diisi' }, { status: 400 })
  }

<<<<<<< HEAD
  const semesterId = semester_id || (await getSemesterAktifId())
  if (!semesterId) {
    return NextResponse.json({ error: 'Belum ada semester aktif. Atur dulu di halaman Semester.' }, { status: 400 })
  }

=======
>>>>>>> 428493411cf03b72a0d0b4ecd241ba935bc6caae
  const { data, error } = await supabaseAdmin
    .from('mata_kuliah')
    .insert({
      kode: kode.trim().toUpperCase(),
      nama: nama.trim(),
      dosen: dosen?.trim() || null,
<<<<<<< HEAD
      semester_id: semesterId,
=======
      semester: semester?.trim() || ACTIVE_SEMESTER,
>>>>>>> 428493411cf03b72a0d0b4ecd241ba935bc6caae
    })
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
