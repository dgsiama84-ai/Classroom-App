// Helper fetch buat halaman mahasiswa yang sudah login (token tersimpan di localStorage).
// Sebelumnya tiap halaman (riwayat, absensi, dll) nulis ulang: ambil token → pasang
// header Authorization → fetch → cek res.ok/401 sendiri-sendiri.

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function apiFetch<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token')

  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  let json: any = null
  try { json = await res.json() } catch { /* respons kosong/bukan JSON */ }

  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('mahasiswa_session')
    throw new ApiError(json?.error || 'Sesi kamu sudah habis', 401)
  }
  if (!res.ok) {
    throw new ApiError(json?.error || `Error ${res.status}`, res.status)
  }
  return json as T
}

// Khusus alur scan-QR (/absen dan /mahasiswa/absensi): mahasiswa boleh belum login
// sama sekali, jadi perlu login-sekali-pakai pakai NIM dulu sebelum submit absensi.
// Dua halaman itu sebelumnya menduplikasi persis logic ini.
export async function ensureMahasiswaToken(nim: string): Promise<string> {
  const existing = localStorage.getItem('token')
  if (existing) return existing

  const res = await fetch('/api/auth/mahasiswa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nim: nim.trim() }),
  })
  const json = await res.json()
  if (!res.ok || !json.token) {
    throw new ApiError(json.error || 'NIM tidak ditemukan', res.status)
  }
  return json.token
}

export async function submitAbsensiQR(sessionId: string, token: string) {
  const res = await fetch('/api/absensi', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ sessionId: sessionId.trim() }),
  })
  const json = await res.json()
  return { res, json }
}