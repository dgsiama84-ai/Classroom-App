'use client'
import { useState, useRef, useEffect } from 'react'

interface Option { value: string; label: string; disabled?: boolean }

interface SelectProps {
  value: string
  onChange: (val: string) => void
  options: Option[]
  placeholder?: string
}

export default function Select({ value, onChange, options, placeholder = 'Pilih...' }: SelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selected = options.find(o => o.value === value)

  return (
    <div ref={ref} className="relative w-full">
      <button
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

      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded-xl shadow-lg dropdown-in"
          style={{
            background: 'var(--surface)',
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
        </div>
      )}
    </div>
  )
}