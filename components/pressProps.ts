export const pressProps = {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
    e.currentTarget.style.transform = 'scale(0.92)'
    e.currentTarget.style.opacity = '0.6'
    e.currentTarget.style.transition = 'transform 0.08s ease, opacity 0.08s ease'
  },
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
    e.currentTarget.style.transform = 'scale(1)'
    e.currentTarget.style.opacity = '1'
    e.currentTarget.style.transition = 'transform 0.15s ease, opacity 0.15s ease'
  },
  onPointerLeave: (e: React.PointerEvent<HTMLElement>) => {
    e.currentTarget.style.transform = 'scale(1)'
    e.currentTarget.style.opacity = '1'
    e.currentTarget.style.transition = 'transform 0.15s ease, opacity 0.15s ease'
  },
}