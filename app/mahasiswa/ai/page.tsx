'use client'

import { useState, useRef, useEffect } from 'react'
import { getMahasiswaSession } from '@/lib/auth'
import { pressProps } from '@/components/pressProps'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const STORAGE_KEY = 'ai_chat_history'

export default function AIPage() {
  const [mounted, setMounted] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try { setMessages(JSON.parse(saved)) } catch { /* ignore */ }
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
  }, [messages, mounted])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    const session = getMahasiswaSession()
    const newHistory: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newHistory)
    setInput('')
    setLoading(true)

    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        history: messages,
        mahasiswa: session,
      }),
    })
    const json = await res.json()
    setLoading(false)

    if (res.status === 429) {
      setMessages(prev => [...prev, { role: 'assistant', content: json.error }])
      return
    }

    if (json.reply) {
      setMessages(prev => [...prev, { role: 'assistant', content: json.reply }])
      if (typeof json.remaining === 'number') setRemaining(json.remaining)
    } else {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Maaf, terjadi kesalahan. Coba lagi ya.' }])
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function clearChat() {
    setMessages([])
    localStorage.removeItem(STORAGE_KEY)
  }

  const session = mounted ? getMahasiswaSession() : null
  const firstName = session?.nama?.split(' ')[0] ?? ''

  return (
    <div className="flex flex-col h-[calc(100vh-128px)]">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2 className="text-lg font-bold">Asisten AI</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {remaining !== null ? `${remaining} pertanyaan tersisa hari ini` : 'Tanya apapun soal akademik'}
          </p>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} {...pressProps}
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            Hapus chat
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && mounted && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              🤖
            </div>
            <div>
              <p className="font-medium">{firstName ? `Halo, ${firstName}!` : 'Halo!'}</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Tanya tentang pelajaran, tugas, atau hal akademik lainnya.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {['Jelaskan konsep OOP', 'Cara buat laporan praktikum', 'Tips belajar efektif'].map(s => (
                <button key={s} onClick={() => setInput(s)} {...pressProps}
                  className="text-xs px-3 py-1.5 rounded-lg"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} fade-in`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 mr-2 mt-0.5"
                style={{ background: 'var(--accent)', color: 'white' }}>
                🤖
              </div>
            )}
            <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap"
              style={{
                background: msg.role === 'user' ? 'var(--accent)' : 'var(--surface)',
                color: 'var(--text)',
                borderBottomRightRadius: msg.role === 'user' ? '4px' : undefined,
                borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : undefined,
                border: msg.role === 'assistant' ? '1px solid var(--border)' : undefined,
              }}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start fade-in">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 mr-2"
              style={{ background: 'var(--accent)' }}>🤖</div>
            <div className="rounded-2xl rounded-bl-sm px-4 py-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full pulse-dot"
                    style={{ background: 'var(--text-muted)', animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tulis pertanyaan..."
            rows={1}
            className="flex-1 px-4 py-3 rounded-xl text-sm outline-none resize-none"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              maxHeight: '120px',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <button onClick={sendMessage} disabled={!input.trim() || loading} {...pressProps}
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{
              background: input.trim() && !loading ? 'var(--accent)' : 'var(--surface)',
              color: input.trim() && !loading ? 'white' : 'var(--text-muted)',
              border: '1px solid var(--border)',
            }}>
            ➤
          </button>
        </div>
        <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
          Enter untuk kirim · Shift+Enter baris baru
        </p>
      </div>
    </div>
  )
}