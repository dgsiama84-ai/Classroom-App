import { NextRequest, NextResponse } from 'next/server'
import { signStaffToken, safeEqual } from '@/lib/admin-auth'

// Kredensial bendahara terpisah dari admin. Sengaja TANPA password bawaan:
// kalau env belum diset, login ditolak.
export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  const user = process.env.BENDAHARA_USERNAME
  const pass = process.env.BENDAHARA_PASSWORD
  if (!user || !pass) {
    return NextResponse.json({ error: 'Akun bendahara belum dikonfigurasi di server' }, { status: 500 })
  }
  if (!username || !password) {
    return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 })
  }

  if (safeEqual(String(username), user) && safeEqual(String(password), pass)) {
    const token = await signStaffToken(user, 'bendahara')
    return NextResponse.json({
      success: true,
      token,
      bendahara: { username: user, nama: process.env.BENDAHARA_NAMA || user, role: 'bendahara' },
    })
  }

  return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 })
}
