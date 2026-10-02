'use client'
import { useRef, useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const THRESHOLD = 80 // px minimal untuk pindah tab
const DURATION = 200 // ms

export function useSwipeNav(hrefs: string[]) {
  const router = useRouter()
  const pathname = usePathname()
  const [dx, setDx] = useState(0)
  const [animate, setAnimate] = useState(false)
  const start = useRef<{ x: number; y: number } | null>(null)
  const locked = useRef<'h' | 'v' | null>(null)
  const enterFrom = useRef<number | null>(null)

  const index = hrefs.findIndex(h => pathname.startsWith(h))

  // halaman baru masuk dari sisi berlawanan
  useEffect(() => {
    if (enterFrom.current === null) return
    const from = enterFrom.current
    enterFrom.current = null
    setAnimate(false)
    setDx(from)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setAnimate(true)
        setDx(0)
      })
    )
  }, [pathname])

  const onTouchStart = (e: React.TouchEvent) => {
    if (index < 0) return
    if ((e.target as HTMLElement).closest('[data-no-swipe], input, textarea, select')) return
    const t = e.touches[0]
    start.current = { x: t.clientX, y: t.clientY }
    locked.current = null
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!start.current) return
    const t = e.touches[0]
    const mx = t.clientX - start.current.x
    const my = t.clientY - start.current.y
    if (!locked.current) {
      if (Math.abs(mx) < 10 && Math.abs(my) < 10) return
      locked.current = Math.abs(mx) > Math.abs(my) ? 'h' : 'v'
    }
    if (locked.current !== 'h') return
    const hasTarget = !!hrefs[index + (mx < 0 ? 1 : -1)]
    setAnimate(false)
    setDx(hasTarget ? mx : mx * 0.25) // ada "tahanan" di tab ujung
  }

  const onTouchEnd = () => {
    const wasHorizontal = locked.current === 'h'
    start.current = null
    locked.current = null
    if (!wasHorizontal) return

    const next = hrefs[index + (dx < 0 ? 1 : -1)]
    setAnimate(true)
    if (next && Math.abs(dx) > THRESHOLD) {
      const out = dx < 0 ? -window.innerWidth : window.innerWidth
      setDx(out)
      setTimeout(() => {
        enterFrom.current = -out
        router.push(next)
      }, DURATION)
    } else {
      setDx(0) // balik lagi (spring back)
    }
  }

  return {
    handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd },
    style: {
      transform: dx ? `translateX(${dx}px)` : undefined,
      transition: animate ? `transform ${DURATION}ms ease-out` : 'none',
      touchAction: 'pan-y',
    } as React.CSSProperties,
  }
}