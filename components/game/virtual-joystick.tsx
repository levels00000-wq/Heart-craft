"use client"

import { useRef } from "react"
import type { Dir } from "@/lib/engine"

export function VirtualJoystick({ onDirection, onRelease }: { onDirection: (dir: Dir) => void; onRelease: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const active = useRef<number | null>(null)

  const update = (clientX: number, clientY: number) => {
    const el = ref.current
    if (!el) return
    const box = el.getBoundingClientRect()
    const dx = clientX - (box.left + box.width / 2)
    const dy = clientY - (box.top + box.height / 2)
    if (Math.hypot(dx, dy) < box.width * 0.18) return
    onDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"))
  }

  return (
    <div
      ref={ref}
      aria-label="Virtual joystick"
      className="relative h-32 w-32 touch-none select-none rounded-full border border-border/70 bg-card/55 shadow-xl backdrop-blur-sm"
      onPointerDown={(event) => {
        event.preventDefault()
        active.current = event.pointerId
        ref.current?.setPointerCapture(event.pointerId)
        update(event.clientX, event.clientY)
      }}
      onPointerMove={(event) => {
        if (active.current === event.pointerId) {
          event.preventDefault()
          update(event.clientX, event.clientY)
        }
      }}
      onPointerUp={(event) => {
        if (active.current === event.pointerId) {
          active.current = null
          onRelease()
        }
      }}
      onPointerCancel={() => {
        active.current = null
        onRelease()
      }}
    >
      <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/60 bg-primary/70 shadow-lg transition-transform" />
      <span className="sr-only">Drag to move</span>
    </div>
  )
}
