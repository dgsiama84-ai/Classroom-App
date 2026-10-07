// Semester sekarang DATA (tabel `semester`), bukan konstanta di kode.
// Semester aktif diatur dari panel admin (halaman Semester) dan dibaca lewat helper di sini.
import { supabaseAdmin } from '@/lib/supabase-admin'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NO_MATCH_ID = '00000000-0000-0000-0000-000000000000'

export async function getSemesterAktifId(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('semester')
    .select('id')
    .eq('is_aktif', true)
    .maybeSingle()
  return data?.id ?? null
}

export interface SemesterScope {
  all: boolean
  id: string // selalu terisi; kalau tidak ada semester aktif jadi UUID kosong (hasil query kosong)
}

// Param dari query string:
//   (kosong)     → semester aktif
//   "all"        → semua semester
//   "<uuid>"     → semester tertentu
// `all=true` (format lama) tetap dianggap "all".
export async function resolveSemesterScope(searchParams: URLSearchParams): Promise<SemesterScope> {
  const raw = searchParams.get('semester') ?? (searchParams.get('all') === 'true' ? 'all' : null)
  if (raw === 'all') return { all: true, id: NO_MATCH_ID }
  if (raw && UUID_RE.test(raw)) return { all: false, id: raw }
  return { all: false, id: (await getSemesterAktifId()) ?? NO_MATCH_ID }
}
