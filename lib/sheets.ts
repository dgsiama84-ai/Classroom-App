import { google } from 'googleapis'
import { JWT } from 'google-auth-library'

function getSheetsClient() {
  const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID!

function pertemuanToColIndex(pertemuan: number): number {
  return 2 + pertemuan // A=0,B=1,C=2 → P1=col3,P2=col4,...
}

function colIndexToLetter(index: number): string {
  let letter = ''
  let n = index
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter
    n = Math.floor(n / 26) - 1
  }
  return letter
}

async function ensureMatkulSheetExists(
  sheets: ReturnType<typeof getSheetsClient>,
  mataKuliah: string
): Promise<string> {
  const sheetName = mataKuliah.trim()
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
  const existing = (spreadsheet.data.sheets ?? []).map((s) => s.properties?.title ?? '')

  if (!existing.includes(sheetName)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetName } } }],
      },
    })
    const headers = [
      'No', 'Nama', 'NIM',
      ...Array.from({ length: 16 }, (_, i) => `P${i + 1}`),
      '% Hadir',
    ]
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headers] },
    })
  }

  return sheetName
}

async function updateKehadiran(
  sheets: ReturnType<typeof getSheetsClient>,
  mataKuliah: string,
  nim: string,
  nama: string,
  pertemuan: number
): Promise<void> {
  const sheetName = await ensureMatkulSheetExists(sheets, mataKuliah)

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:S`,
  })
  let rows = res.data.values ?? []

  // Cari baris mahasiswa by NIM (kolom C = index 2)
  let targetRowIndex = -1
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][2] ?? '').toString().trim() === nim.trim()) {
      targetRowIndex = i
      break
    }
  }

  // Belum ada → tambah baris baru
  if (targetRowIndex === -1) {
    const noUrut = rows.length // rows.length sudah include header
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:C`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [[noUrut, nama, nim]] },
    })

    // Fetch ulang untuk dapat row index yang benar
    const res2 = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:C`,
    })
    rows = res2.data.values ?? []
    for (let i = 1; i < rows.length; i++) {
      if ((rows[i][2] ?? '').toString().trim() === nim.trim()) {
        targetRowIndex = i
        break
      }
    }
  }

  if (targetRowIndex === -1) {
    console.error('Gagal menemukan baris mahasiswa setelah append')
    return
  }

  const colIndex = pertemuanToColIndex(pertemuan)
  const colLetter = colIndexToLetter(colIndex)
  const sheetRow = targetRowIndex + 1 // sheets 1-indexed

  // Jangan overwrite kalau sudah ✓
  const existingValue = rows[targetRowIndex]?.[colIndex]
  if (existingValue === '✓') return

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!${colLetter}${sheetRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [['✓']] },
  })
}

export async function appendToSheet(absensiData: {
  nama: string
  nim: string
  kelas: string
  mataKuliah: string
  pertemuan: number
}): Promise<void> {
  const { nama, nim, mataKuliah, pertemuan } = absensiData
  const sheets = getSheetsClient()
  await updateKehadiran(sheets, mataKuliah, nim, nama, pertemuan)
}
