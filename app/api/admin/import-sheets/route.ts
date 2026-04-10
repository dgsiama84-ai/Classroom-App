import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { google } from 'googleapis'

async function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
      private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
  return google.sheets({ version: 'v4', auth })
}

function findBestMatch(tabName: string, matkulList: { id: string; nama: string; kode: string }[]) {
  const tab = tabName.toLowerCase()
  const exact = matkulList.find(m => m.nama.toLowerCase() === tab)
  if (exact) return exact
  const contains = matkulList.find(m =>
    tab.includes(m.nama.toLowerCase()) || m.nama.toLowerCase().includes(tab)
  )
  if (contains) return contains
  const tabWords = tab.split(/\s+/)
  let bestScore = 0
  let bestMatch = null
  for (const matkul of matkulList) {
    const matkulWords = matkul.nama.toLowerCase().split(/\s+/)
    const overlap = tabWords.filter(w => matkulWords.includes(w)).length
    const score = overlap / Math.max(tabWords.length, matkulWords.length)
    if (score > bestScore) {
      bestScore = score
      bestMatch = matkul
    }
  }
  return bestScore >= 0.4 ? bestMatch : null
}

function parseStatus(nilai: string): string | null {
  const v = nilai.trim().toLowerCase()
  if (['✓', '√', 'v'].includes(v)) return 'hadir'
  if (v === 'a') return 'alpa'
  if (v === 's') return 'sakit'
  if (v === 'i') return 'izin'
  return null
}

export async function POST() {
  try {
    const sheets = await getSheets()

    const meta = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    })

    const allTabs = meta.data.sheets
      ?.map(s => s.properties?.title ?? '')
      .filter(t => t !== 'Mahasiswa' && t !== '')
      ?? []

    const { data: matkulList, error: matkulError } = await supabaseAdmin
      .from('mata_kuliah')
      .select('id, kode, nama')

    if (matkulError || !matkulList) {
      return NextResponse.json({ error: 'Gagal ambil data matkul' }, { status: 500 })
    }

    const mapping = allTabs.map(tab => ({
      tab,
      matkul: findBestMatch(tab, matkulList),
    }))

    const unmapped = mapping.filter(m => !m.matkul)
    const mapped = mapping.filter(m => m.matkul)

    let totalInserted = 0
    let totalSkipped = 0
    const errors: string[] = []

    for (const { tab, matkul } of mapped) {
      if (!matkul) continue

      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID!,
        range: `${tab}!A3:T200`,
      })

      const rows = res.data.values ?? []

      for (const row of rows) {
        const nama = row[1]?.toString().trim()
        const nim = row[2]?.toString().trim()
        if (!nama || !nim) continue

        for (let i = 0; i < 16; i++) {
          const raw = row[3 + i]?.toString() ?? ''
          const status = parseStatus(raw)
          if (!status) continue

          const pertemuan = i + 1

          const { data: existing } = await supabaseAdmin
            .from('absensi')
            .select('id')
            .eq('nim', nim)
            .eq('mata_kuliah_id', matkul.id)
            .eq('pertemuan', pertemuan)
            .maybeSingle()

          if (existing) {
            totalSkipped++
            continue
          }

          const { error } = await supabaseAdmin
            .from('absensi')
            .insert({
              nim,
              nama,
              kelas: 'A2',
              mata_kuliah_id: matkul.id,
              pertemuan,
              tanggal: '2025-01-01',
              waktu: '00:00:00',
              status,
            })

          if (error) {
            if (error.code === '23505') {
              totalSkipped++
            } else {
              errors.push(`${nama} · P${pertemuan} · ${tab}: ${error.message}`)
            }
          } else {
            totalInserted++
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      inserted: totalInserted,
      skipped: totalSkipped,
      mapped: mapped.map(m => ({ tab: m.tab, matchedTo: m.matkul?.nama })),
      unmapped: unmapped.map(m => m.tab),
      errors: errors.length > 0 ? errors : undefined,
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}