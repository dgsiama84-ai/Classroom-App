// app/api/auth/mahasiswa/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { SignJWT } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function POST(req: NextRequest) {
  const { nim } = await req.json()

  if (!nim) {
    return NextResponse.json({ error: 'NIM wajib diisi' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('mahasiswa')
    .select('nim, nama, kelas')
    .eq('nim', nim.trim())
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'NIM tidak ditemukan' }, { status: 401 })
  }

  const token = await new SignJWT({ nim: data.nim, nama: data.nama, kelas: data.kelas })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET)

  return NextResponse.json({ success: true, token, mahasiswa: data })
}