import React from 'react'

export const pressProps = {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
    e.currentTarget.style.transform = 'scale(0.95)'
    e.currentTarget.style.opacity = '0.75'
    e.currentTarget.style.transition = 'transform 0.08s ease, opacity 0.08s ease'
  },
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
    e.currentTarget.style.transform = ''
    e.currentTarget.style.opacity = ''
  },
  onPointerLeave: (e: React.PointerEvent<HTMLElement>) => {
    e.currentTarget.style.transform = ''
    e.currentTarget.style.opacity = ''
  },
}