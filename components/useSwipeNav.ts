'use client'
import { useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export function useSwipeNav(hrefs: string[]) {
  const router = useRouter()
  const pathname = usePathname()
  const start = useRef<{ x: number; y: number } | null>(null)

  const onTouchStart = (e: React.TouchEvent) => {
    const el = e.target as HTMLElement
    // abaikan swipe di input / elemen yang scroll horizontal
    if (el.closest('[data-no-swipe], input, textarea, select')) return
    const t = e.touches[0]
    start.current = { x: t.clientX, y: t.clientY }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!start.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.current.x
    const dy = t.clientY - start.current.y
    start.current = null
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return

    const i = hrefs.findIndex(h => pathname.startsWith(h))
    const next = dx < 0 ? i + 1 : i - 1
    if (i >= 0 && hrefs[next]) router.push(hrefs[next])
  }

  return { onTouchStart, onTouchEnd }
}