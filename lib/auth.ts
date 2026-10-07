export interface MahasiswaSession {
  nim: string
  nama: string
  kelas: string
}

export interface AdminSession {
  username: string
  nama: string
  role: 'admin'
}

export interface BendaharaSession {
  username: string
  nama: string
  role: 'bendahara'
}

// LocalStorage helpers
export const SESSION_KEYS = {
  MAHASISWA: 'mahasiswa_session',
  ADMIN: 'admin_session',
  ADMIN_TOKEN: 'admin_token',
  BENDAHARA: 'bendahara_session',
  BENDAHARA_TOKEN: 'bendahara_token',
}

export function getMahasiswaSession(): MahasiswaSession | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(SESSION_KEYS.MAHASISWA)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function getAdminSession(): AdminSession | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(SESSION_KEYS.ADMIN)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

// Sesi bendahara dianggap valid hanya kalau token-nya juga ada,
// karena semua API kas memverifikasi token itu di server.
export function getBendaharaSession(): BendaharaSession | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(SESSION_KEYS.BENDAHARA)
  if (!raw || !localStorage.getItem(SESSION_KEYS.BENDAHARA_TOKEN)) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function saveMahasiswaSession(session: MahasiswaSession) {
  localStorage.setItem(SESSION_KEYS.MAHASISWA, JSON.stringify(session))
}

export function saveAdminSession(session: AdminSession, token?: string) {
  localStorage.setItem(SESSION_KEYS.ADMIN, JSON.stringify(session))
  if (token) localStorage.setItem(SESSION_KEYS.ADMIN_TOKEN, token)
}

// Token admin dipakai API yang butuh hak admin (mis. /api/semester).
export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(SESSION_KEYS.ADMIN_TOKEN)
}

export function saveBendaharaSession(session: BendaharaSession, token: string) {
  localStorage.setItem(SESSION_KEYS.BENDAHARA, JSON.stringify(session))
  localStorage.setItem(SESSION_KEYS.BENDAHARA_TOKEN, token)
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEYS.MAHASISWA)
  localStorage.removeItem(SESSION_KEYS.ADMIN)
  localStorage.removeItem(SESSION_KEYS.ADMIN_TOKEN)
  localStorage.removeItem(SESSION_KEYS.BENDAHARA)
  localStorage.removeItem(SESSION_KEYS.BENDAHARA_TOKEN)
}
