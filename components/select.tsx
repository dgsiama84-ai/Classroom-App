'use client'
import { useState, useRef, useEffect } from 'react'

interface Option { value: string; label: string }

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
        <span className="ml-2 flex-shrink-0 text-xs" style={{ color: 'var(--text-muted)' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden shadow-lg"
  style={{
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    bottom: 'auto',
    maxHeight: '240px',
    overflowY: 'auto',
  }}>
          {placeholder && (
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className="w-full px-3 py-2.5 text-sm text-left transition-all"
              style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
              {placeholder}
            </button>
          )}
          <div className="max-h-60 overflow-y-auto">
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className="w-full px-3 py-2.5 text-sm text-left transition-all"
                style={{
                  background: value === opt.value ? 'var(--accent)' : 'transparent',
                  color: value === opt.value ? 'white' : 'var(--text)',
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}