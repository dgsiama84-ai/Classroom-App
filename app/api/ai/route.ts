import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const MODELS = [
  'openrouter/free',
  'mistralai/mistral-7b-instruct:free',
  'google/gemma-2-9b-it:free',
]

const DAILY_LIMIT = 5

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Mahasiswa {
  nama: string
  nim: string
  kelas: string
}

async function tryModel(model: string, messages: Message[], systemPrompt: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  let response: Response

  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
        'X-Title': 'Classroom App',
      },
      body: JSON.stringify({
        model,
        max_tokens: 800,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
      }),
      signal: controller.signal,
    })
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('AI timeout (terlalu lama)')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `Model ${model} gagal: ${response.status}`)
  }

  const data = await response.json()
  const reply = data.choices?.[0]?.message?.content

  if (!reply) throw new Error(`Model ${model} tidak menghasilkan respons`)

  // 🔥 safety limit
  return reply
}
async function checkAndIncrementCredit(nim: string): Promise<{ allowed: boolean; remaining: number }> {
  const today = new Date().toISOString().split('T')[0]

  const { data: credit } = await supabaseAdmin
    .from('ai_credits')
    .select('used, reset_date')
    .eq('nim', nim)
    .single()

  if (!credit) {
    // Belum ada record → insert baru
    await supabaseAdmin
      .from('ai_credits')
      .insert({ nim, used: 1, reset_date: today })
    return { allowed: true, remaining: DAILY_LIMIT - 1 }
  }

  // Reset kalau beda hari
  if (credit.reset_date !== today) {
    await supabaseAdmin
      .from('ai_credits')
      .update({ used: 1, reset_date: today })
      .eq('nim', nim)
    return { allowed: true, remaining: DAILY_LIMIT - 1 }
  }

  // Cek limit
  if (credit.used >= DAILY_LIMIT) {
    return { allowed: false, remaining: 0 }
  }

  // Increment
  await supabaseAdmin
    .from('ai_credits')
    .update({ used: credit.used + 1 })
    .eq('nim', nim)

  return { allowed: true, remaining: DAILY_LIMIT - (credit.used + 1) }
}

export async function POST(req: NextRequest) {
  const { message, history, mahasiswa }: {
    message: string
    history?: Message[]
    mahasiswa?: Mahasiswa
  } = await req.json()

  if (!message) {
    return NextResponse.json({ error: 'Pesan tidak boleh kosong' }, { status: 400 })
  }

  // Cek & increment kredit
  if (mahasiswa?.nim) {
    const { allowed, remaining } = await checkAndIncrementCredit(mahasiswa.nim)

    if (!allowed) {
      return NextResponse.json(
        { error: `Maaf, Batas ${DAILY_LIMIT} pertanyaan hari ini sudah tercapai. Coba lagi besok.` },
        { status: 429 }
      )
    }

    // Sertakan sisa kredit di response nanti
    const systemPrompt = buildSystemPrompt(mahasiswa)
    const messages: Message[] = [
      ...(history?.slice(-4) ?? []),
      { role: 'user', content: message },
    ]

    const errors: string[] = []
    for (const model of MODELS) {
      try {
        const reply = await tryModel(model, messages, systemPrompt)
        return NextResponse.json({ reply, model, remaining })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`[${model}]: ${msg}`)
        console.warn(`Fallback dari ${model}:`, msg)
      }
    }

    return NextResponse.json({ error: 'Semua model gagal', details: errors }, { status: 502 })
  }

  // Tanpa auth — tetap bisa tapi tanpa tracking
  const systemPrompt = buildSystemPrompt()
  const messages: Message[] = [
    ...(history ?? []),
    { role: 'user', content: message },
  ]

  const errors: string[] = []
  for (const model of MODELS) {
    try {
      const reply = await tryModel(model, messages, systemPrompt)
      return NextResponse.json({ reply, model })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`[${model}]: ${msg}`)
    }
  }

  return NextResponse.json({ error: 'Semua model gagal', details: errors }, { status: 502 })
}

function buildSystemPrompt(mahasiswa?: Mahasiswa): string {
  return `Kamu adalah asisten akademik untuk mahasiswa.

Jawaban HARUS:
- Jelas dan langsung ke inti
- Gunakan Bahasa Indonesia sederhana
- Hindari penjelasan panjang

${mahasiswa ? `Kamu berbicara dengan ${mahasiswa.nama} (NIM: ${mahasiswa.nim}, Kelas: ${mahasiswa.kelas}).` : ''}

Jika pertanyaan di luar akademik, jawab singkat dan arahkan kembali ke topik akademik.`
}