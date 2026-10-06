import { NextRequest, NextResponse } from 'next/server'
import { signStaffToken, safeEqual } from '@/lib/admin-auth'

// Login gabungan admin + bendahara. Role ditentukan dari kredensial yang cocok.
export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  if (!username || !password) {
    return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 })
  }

  const u = String(username).trim()
  const p = String(password)

  // Bendahara (tanpa password bawaan: kalau env belum diset, dilewati)
  const bUser = process.env.BENDAHARA_USERNAME
  const bPass = process.env.BENDAHARA_PASSWORD
  if (bUser && bPass && safeEqual(u, bUser) && safeEqual(p, bPass)) {
    const token = await signStaffToken(bUser, 'bendahara')
    return NextResponse.json({
      success: true,
      role: 'bendahara',
      token,
      bendahara: { username: bUser, nama: process.env.BENDAHARA_NAMA || bUser, role: 'bendahara' },
    })
  }

  // Admin
  const aUser = process.env.ADMIN_USERNAME || 'admin'
  const aPass = process.env.ADMIN_PASSWORD || 'admin123'
  if (safeEqual(u, aUser) && safeEqual(p, aPass)) {
    return NextResponse.json({
      success: true,
      role: 'admin',
      admin: { username: aUser, nama: process.env.ADMIN_NAMA || aUser, role: 'admin' },
    })
  }

  return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 })
}