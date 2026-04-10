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

    const { data: matkulList } = await supabaseAdmin
      .from('mata_kuliah')
      .select('id, kode, nama')

    return NextResponse.json({ success: true, tabs, matkulList })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}