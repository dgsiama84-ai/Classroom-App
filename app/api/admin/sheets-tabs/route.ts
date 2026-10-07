import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { google } from 'googleapis'
<<<<<<< HEAD
import { getSemesterAktifId } from '@/lib/semester'
=======
import { ACTIVE_SEMESTER } from '@/lib/config'
>>>>>>> 428493411cf03b72a0d0b4ecd241ba935bc6caae

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

export async function GET() {
  try {
    const sheets = await getSheets()

    const meta = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    })

    const tabs = meta.data.sheets
      ?.map(s => s.properties?.title ?? '')
      .filter(t => t !== 'Mahasiswa' && t !== '') // skip tab mahasiswa
      ?? []

<<<<<<< HEAD
    const semesterId = await getSemesterAktifId()
    const { data: matkulList } = await supabaseAdmin
      .from('mata_kuliah')
      .select('id, kode, nama')
      .eq('semester_id', semesterId ?? '00000000-0000-0000-0000-000000000000')
=======
    const { data: matkulList } = await supabaseAdmin
      .from('mata_kuliah')
      .select('id, kode, nama')
      .eq('semester', ACTIVE_SEMESTER)
>>>>>>> 428493411cf03b72a0d0b4ecd241ba935bc6caae

    return NextResponse.json({ success: true, tabs, matkulList })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}