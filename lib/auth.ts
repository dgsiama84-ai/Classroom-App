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

// LocalStorage helpers
export const SESSION_KEYS = {
  MAHASISWA: 'mahasiswa_session',
  ADMIN: 'admin_session',
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

export function saveMahasiswaSession(session: MahasiswaSession) {
  localStorage.setItem(SESSION_KEYS.MAHASISWA, JSON.stringify(session))
}

export function saveAdminSession(session: AdminSession) {
  localStorage.setItem(SESSION_KEYS.ADMIN, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEYS.MAHASISWA)
  localStorage.removeItem(SESSION_KEYS.ADMIN)
}