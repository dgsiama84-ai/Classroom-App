'use client'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface Option { value: string; label: string; disabled?: boolean }

interface SelectProps {
  value: string
  onChange: (val: string) => void
  options: Option[]
  placeholder?: string
}

export default function Select({ value, onChange, options, placeholder = 'Pilih...' }: SelectProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  // Klik di luar tombol ATAU di luar menu (menu-nya sekarang di-portal ke body,
  // jadi nggak lagi berada di dalam wrapper div select ini)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (btnRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Dropdown di-portal ke <body> (position: fixed) biar nggak kejebak di dalam
  // stacking context card/tombol manapun (backdrop-blur & animasi tekan tombol
  // sama-sama bikin stacking context baru, yang bikin z-index lokal nggak berlaku
  // lintas elemen). Posisinya dihitung dari lokasi tombol tiap kali dibuka/scroll/resize.
  useEffect(() => {
    if (!open) return
    function updatePosition() {
      const rect = btnRef.current?.getBoundingClientRect()
      if (rect) setCoords({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    }
    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open])

  const selected = options.find(o => o.value === value)

  return (
    <div className="relative w-full">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2.5 rounded-xl text-sm text-left flex items-center justify-between outline-none"
        style={{
          background: 'var(--surface2)',
          border: `1px solid ${open ? 'var(--accent)' : 'var(--border)'}`,
          color: selected ? 'var(--text)' : 'var(--text-muted)',
        }}>
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <span className="ml-2 flex-shrink-0 text-xs transition-transform duration-200"
          style={{
            color: 'var(--text-muted)',
            display: 'inline-block',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}>
          ▼
        </span>
      </button>

      {mounted && open && coords && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[9999] rounded-xl shadow-lg dropdown-in"
          style={{
            top: coords.top,
            left: coords.left,
            width: coords.width,
            background: 'var(--overlay)',
            border: '1px solid var(--border)',
            maxHeight: '240px',
            overflowY: 'auto',
          }}>
          {placeholder && (
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className="w-full px-3 py-2.5 text-sm text-left"
              style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
              {placeholder}
            </button>
          )}
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              disabled={opt.disabled}
              onClick={() => { if (!opt.disabled) { onChange(opt.value); setOpen(false) } }}
              className="w-full px-3 py-2.5 text-sm text-left"
              style={{
                background: value === opt.value ? 'var(--accent)' : 'transparent',
                color: opt.disabled ? 'var(--text-muted)' : value === opt.value ? 'white' : 'var(--text)',
                opacity: opt.disabled ? 0.5 : 1,
                cursor: opt.disabled ? 'not-allowed' : 'pointer',
              }}>
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
