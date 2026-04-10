import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  const adminUser = process.env.ADMIN_USERNAME || 'admin'
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123'

  if (!username || !password) {
    return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 })
  }

  if (username === adminUser && password === adminPass) {
  return NextResponse.json({ 
    success: true, 
    admin: { username, nama: process.env.ADMIN_NAMA || username, role: 'admin' } 
  })
}

  return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 })
}
