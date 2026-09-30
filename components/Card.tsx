import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** surface = card statis biasa, surface2 = sedikit lebih terang (nested/input),
   *  overlay = buat modal/dropdown yang ngambang di atas konten lain (harus tetap kebaca) */
  variant?: 'surface' | 'surface2' | 'overlay'
  bordered?: boolean
}

// Sebelumnya `style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}`
// diketik ulang di puluhan tempat. Sekarang cukup <Card>...</Card>, dan kalau suatu saat
// token warnanya berubah, cukup diubah di satu tempat ini.
export default function Card({ variant = 'surface', bordered = true, className, style, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-2xl', className)}
      style={{
        background: `var(--${variant})`,
        border: bordered ? '1px solid var(--border)' : 'none',
        ...style,
      }}
      {...props}
    />
  )
}