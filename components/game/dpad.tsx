"use client"

import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import type { Dir } from "@/lib/engine"

export function DPad({
  onPress,
  onRelease,
}: {
  onPress: (dir: Dir) => void
  onRelease: (dir: Dir) => void
}) {
  const btn = (dir: Dir, Icon: typeof ChevronUp, area: string) => (
    <button
      type="button"
      aria-label={dir}
      style={{ gridArea: area }}
      className="flex items-center justify-center rounded-2xl bg-card/80 text-foreground border border-border backdrop-blur-sm shadow-lg active:scale-90 active:bg-primary active:text-primary-foreground transition-transform touch-none select-none"
      onPointerDown={(e) => {
        e.preventDefault()
        onPress(dir)
      }}
      onPointerUp={(e) => {
        e.preventDefault()
        onRelease(dir)
      }}
      onPointerLeave={() => onRelease(dir)}
      onPointerCancel={() => onRelease(dir)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Icon size={30} strokeWidth={3} />
    </button>
  )

  return (
    <div
      className="grid gap-1.5 w-40 h-40 touch-none"
      style={{
        gridTemplateAreas: `". up ." "left mid right" ". down ."`,
        gridTemplateColumns: "1fr 1fr 1fr",
        gridTemplateRows: "1fr 1fr 1fr",
      }}
    >
      {btn("up", ChevronUp, "up")}
      {btn("left", ChevronLeft, "left")}
      <div style={{ gridArea: "mid" }} className="rounded-xl bg-card/40 border border-border/50" />
      {btn("right", ChevronRight, "right")}
      {btn("down", ChevronDown, "down")}
    </div>
  )
}
