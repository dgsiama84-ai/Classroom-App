// Autentikasi berbasis peran di sisi server. Login admin & bendahara masing-masing
// menerbitkan JWT (ditandatangani JWT_SECRET) dengan klaim `role`. API yang butuh
// hak khusus memanggil requireRole() dan menolak role yang salah.
import { SignJWT, jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'

export type StaffRole = 'admin' | 'bendahara'

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET!)

export async function signStaffToken(username: string, role: StaffRole) {
  return new SignJWT({ username, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('12h')
    .sign(secret())
}

export const signAdminToken = (username: string) => signStaffToken(username, 'admin')

// Mengembalikan { username, role } kalau valid, atau NextResponse 401/403 kalau tidak.
export async function requireRole(
  req: NextRequest,
  roles: StaffRole[]
): Promise<{ username: string; role: StaffRole } | NextResponse> {
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.replace('Bearer ', '').trim()
  if (!token) return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 401 })

  try {
    const { payload } = await jwtVerify(token, secret())
    const role = payload.role as StaffRole
    if (!roles.includes(role)) {
      return NextResponse.json({ error: 'Akses ditolak untuk peran ini' }, { status: 403 })
    }
    return { username: String(payload.username), role }
  } catch {
    return NextResponse.json({ error: 'Sesi habis, silakan login ulang' }, { status: 401 })
  }
}

export const requireAdmin = (req: NextRequest) => requireRole(req, ['admin'])

// Perbandingan string tanpa celah timing, untuk cek password.
export function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}
