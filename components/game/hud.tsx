"use client"

import { Pause, Clock, Coins, Key, Zap, Shield, Map, Plus } from "lucide-react"
import type { HudState } from "@/lib/engine"
import { cn } from "@/lib/utils"

export function Hud({
  hud,
  levelName,
  difficulty,
  themeEmoji,
  onPause,
}: {
  hud: HudState
  levelName: string
  difficulty: string
  themeEmoji: string
  onPause: () => void
}) {
  const pct = Math.max(0, Math.min(1, hud.timeLeft / hud.totalTime))
  const low = hud.timeLeft <= 15
  const seconds = Math.ceil(hud.timeLeft)

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPause}
          aria-label="Pause"
          className="pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-card/85 text-foreground border border-border backdrop-blur-sm shadow-lg active:scale-90 transition-transform"
        >
          <Pause size={22} className="fill-foreground" />
        </button>

        <div className="min-w-0 flex-1 rounded-2xl bg-card/85 border border-border backdrop-blur-sm px-3 py-1.5 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-display text-sm font-bold leading-tight">
              {themeEmoji} {levelName}
            </p>
            <span className="shrink-0 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
              {difficulty}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <Clock size={13} className={cn(low ? "text-destructive" : "text-muted-foreground")} />
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn("h-full rounded-full transition-[width] duration-200", low ? "bg-destructive" : "bg-accent")}
                style={{ width: `${pct * 100}%` }}
              />
            </div>
            <span className={cn("w-7 text-right font-display text-xs font-bold tabular-nums", low && "text-destructive")}>
              {seconds}
            </span>
          </div>
        </div>

        <div className="pointer-events-auto flex h-11 shrink-0 items-center gap-1 rounded-2xl bg-card/85 border border-border backdrop-blur-sm px-3 shadow-lg">
          <Coins size={18} className="text-accent" />
          <span className="font-display text-sm font-bold tabular-nums">
            {hud.coins}
            <span className="text-muted-foreground">/{hud.coinsTotal}</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {hud.keysNeeded > 0 && (
          <Chip active={hud.keys > 0} icon={<Key size={13} />} label={`${hud.keys}`} tone="amber" />
        )}
        {hud.speed && <Chip active icon={<Zap size={13} />} label="Speed" tone="amber" />}
        {hud.shield && <Chip active icon={<Shield size={13} />} label="Shield" tone="violet" />}
        {hud.mapReveal && <Chip active icon={<Map size={13} />} label="Map" tone="cyan" />}
      </div>
    </div>
  )
}

function Chip({
  active,
  icon,
  label,
  tone,
}: {
  active: boolean
  icon: React.ReactNode
  label: string
  tone: "amber" | "violet" | "cyan"
}) {
  const tones = {
    amber: "text-accent",
    violet: "text-primary",
    cyan: "text-chart-5",
  }
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full border border-border bg-card/85 px-2.5 py-1 text-xs font-bold backdrop-blur-sm shadow",
        active ? tones[tone] : "text-muted-foreground/50",
      )}
    >
      {icon}
      <span className="tabular-nums">{label}</span>
    </div>
  )
}
