"use client"

import { RotateCcw, Home, ChevronRight, Coins, Trophy, Skull } from "lucide-react"
import type { LoseStats, WinStats } from "@/lib/engine"
import type { GameLevel } from "@/lib/levels"
import { THEMES } from "@/lib/themes"
import { StarRating } from "./star-rating"

export function ResultScreen({
  mode,
  win,
  lose,
  level,
  isNewBest,
  hasNext,
  onNext,
  onRetry,
  onHome,
}: {
  mode: "win" | "lose"
  win?: WinStats
  lose?: LoseStats
  level: GameLevel
  isNewBest?: boolean
  hasNext: boolean
  onNext: () => void
  onRetry: () => void
  onHome: () => void
}) {
  const theme = THEMES[level.theme]

  return (
    <div
      className="flex min-h-[100dvh] w-full flex-col items-center justify-center px-6 py-10"
      style={{ background: `linear-gradient(160deg, ${theme.bgTop}, ${theme.bgBottom})` }}
    >
      <div className="w-full max-w-sm rounded-[2rem] border border-border bg-card p-7 text-center shadow-2xl">
        {mode === "win" ? (
          <>
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-accent/20 text-accent">
              <Trophy size={34} className="fill-accent/40" />
            </div>
            <h1 className="font-display text-4xl font-extrabold text-balance">Level Complete!</h1>
            <p className="mt-1 text-sm text-muted-foreground">{theme.emoji} {level.name}</p>

            <div className="my-6 flex justify-center">
              <StarRating value={win?.stars ?? 0} size={44} className="gap-2" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Stat label="Time Left" value={`${win?.timeLeft ?? 0}s`} />
              <Stat label="Score" value={`${win?.score ?? 0}`} highlight={isNewBest} />
              <Stat label="Coins" value={`+${win?.coins ?? 0}`} icon />
            </div>
            {isNewBest && (
              <p className="mt-3 font-display text-sm font-bold text-accent">★ New Best Score!</p>
            )}
          </>
        ) : (
          <>
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20 text-destructive">
              <Skull size={34} />
            </div>
            <h1 className="font-display text-4xl font-extrabold text-balance">
              {lose?.reason === "time" ? "Time's Up!" : "You Got Caught!"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground text-pretty">
              {lose?.reason === "time"
                ? "The exit slipped away. Try a faster route!"
                : "A trap got you. Watch the spikes and try again!"}
            </p>
            <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2">
              <Coins size={16} className="text-accent" />
              <span className="font-display text-sm font-bold">+{lose?.coins ?? 0} coins collected</span>
            </div>
          </>
        )}

        <div className="mt-7 flex flex-col gap-3">
          {mode === "win" && hasNext && (
            <button
              type="button"
              onClick={onNext}
              className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-xl font-extrabold text-primary-foreground shadow-[0_5px_0_oklch(0.55_0.17_300)] transition-all active:translate-y-1 active:shadow-[0_1px_0_oklch(0.55_0.17_300)]"
            >
              Next Level <ChevronRight size={24} />
            </button>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center justify-center gap-2 rounded-2xl bg-secondary py-4 font-display text-base font-bold text-secondary-foreground transition-transform active:scale-95"
            >
              <RotateCcw size={20} /> Retry
            </button>
            <button
              type="button"
              onClick={onHome}
              className="flex items-center justify-center gap-2 rounded-2xl bg-secondary py-4 font-display text-base font-bold text-secondary-foreground transition-transform active:scale-95"
            >
              <Home size={20} /> Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, highlight, icon }: { label: string; value: string; highlight?: boolean; icon?: boolean }) {
  return (
    <div className="rounded-2xl bg-secondary px-2 py-3">
      <div className="flex items-center justify-center gap-1">
        {icon && <Coins size={14} className="text-accent" />}
        <span className={`font-display text-lg font-extrabold tabular-nums ${highlight ? "text-accent" : ""}`}>{value}</span>
      </div>
      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  )
}
