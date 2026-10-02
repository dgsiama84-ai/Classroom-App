'use client'
import { useRef, useEffect, useLayoutEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
const THRESHOLD = 80
const FLICK_VELOCITY = 0.5 // px/ms

export function useSwipeNav(hrefs: string[]) {
  const router = useRouter()
  const pathname = usePathname()
  const ref = useRef<HTMLElement>(null)
  const s = useRef({ x: 0, y: 0, t: 0, dx: 0, lock: null as 'h' | 'v' | null })
  const enterDir = useRef<number | null>(null)
  const index = hrefs.findIndex(h => pathname.startsWith(h))

  // prefetch semua tab biar pindahnya instan
  useEffect(() => {
    hrefs.forEach(h => router.prefetch(h))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const apply = (x: number, ms = 0, ease = EASE, opacity = 1) => {
    const el = ref.current
    if (!el) return
    el.style.transition = ms ? `transform ${ms}ms ${ease}, opacity ${ms}ms ${ease}` : 'none'
    el.style.transform = x ? `translate3d(${x}px,0,0)` : ''
    el.style.opacity = String(opacity)
  }

  // halaman baru masuk dari sisi swipe
  useLayoutEffect(() => {
    const dir = enterDir.current
    if (dir === null) return
    enterDir.current = null
    apply(dir * window.innerWidth * 0.35, 0, EASE, 0)
    void ref.current?.offsetWidth // paksa reflow
    apply(0, 320, EASE, 1)
  }, [pathname])

  const onTouchStart = (e: React.TouchEvent) => {
    if (index < 0) return
    if ((e.target as HTMLElement).closest('[data-no-swipe], input, textarea, select')) return
    const t = e.touches[0]
    s.current = { x: t.clientX, y: t.clientY, t: Date.now(), dx: 0, lock: null }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    const c = s.current
    if (c.t === 0 || c.lock === 'v') return
    const t = e.touches[0]
    const mx = t.clientX - c.x
    const my = t.clientY - c.y
    if (!c.lock) {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return
      c.lock = Math.abs(mx) > Math.abs(my) ? 'h' : 'v'
      if (c.lock === 'v') return
    }
    const hasTarget = !!hrefs[index + (mx < 0 ? 1 : -1)]
    c.dx = hasTarget ? mx : mx * 0.25 // tahanan di tab ujung
    apply(c.dx, 0, EASE, 1 - Math.min(Math.abs(c.dx) / window.innerWidth, 1) * 0.5)
  }

  const onTouchEnd = () => {
    const c = s.current
    const wasH = c.lock === 'h'
    s.current = { x: 0, y: 0, t: 0, dx: 0, lock: null }
    if (!wasH) return

    const dir = c.dx < 0 ? 1 : -1
    const next = hrefs[index + dir]
    const velocity = Math.abs(c.dx) / Math.max(Date.now() - c.t, 1)
    const go = next && (Math.abs(c.dx) > THRESHOLD || (velocity > FLICK_VELOCITY && Math.abs(c.dx) > 30))

    if (go) {
      apply(-dir * window.innerWidth * 0.5, 160, 'cubic-bezier(0.4, 0, 1, 1)', 0)
      setTimeout(() => {
        enterDir.current = dir
        router.push(next)
      }, 150)
    } else {
      apply(0, 350, EASE, 1) // balik pelan
    }
  }

  return {
    ref,
    handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd },
    style: { touchAction: 'pan-y', willChange: 'transform' } as React.CSSProperties,
  }
}