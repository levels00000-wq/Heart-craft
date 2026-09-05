"use client"

import { Play, Grid3x3, ShoppingBag, Volume2, VolumeX, Coins, Star } from "lucide-react"
import type { Progress } from "@/lib/storage"
import { LEVELS } from "@/lib/levels"

export function HomeScreen({
  progress,
  onPlay,
  onLevels,
  onShop,
  onToggleMute,
}: {
  progress: Progress
  onPlay: () => void
  onLevels: () => void
  onShop: () => void
  onToggleMute: () => void
}) {
  const totalStars = Object.values(progress.stars).reduce((a, b) => a + b, 0)
  const maxStars = LEVELS.length * 3

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center overflow-hidden">
      <img
        src="/images/hero.png"
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-60"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />

      <button
        type="button"
        onClick={onToggleMute}
        aria-label={progress.muted ? "Unmute" : "Mute"}
        className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card/80 text-foreground backdrop-blur-sm shadow-lg active:scale-90 transition-transform"
      >
        {progress.muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>

      <div className="relative z-10 flex w-full max-w-md flex-1 flex-col items-center justify-between px-6 py-10">
        <div className="mt-10 flex flex-col items-center text-center">
          <span className="mb-3 rounded-full border border-primary/40 bg-primary/15 px-4 py-1 text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Maze Escape
          </span>
          <h1 className="font-display text-6xl font-extrabold leading-[0.95] text-balance drop-shadow-[0_4px_0_rgba(0,0,0,0.35)]">
            Escape the
            <span className="block text-accent">Adventure</span>
          </h1>
          <p className="mt-4 max-w-xs text-pretty text-sm text-muted-foreground">
            Race through enchanted mazes, dodge traps, grab treasure and find the exit before time runs out.
          </p>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-3 py-1.5 backdrop-blur-sm">
              <Coins size={16} className="text-accent" />
              <span className="font-display text-sm font-bold tabular-nums">{progress.coins}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-3 py-1.5 backdrop-blur-sm">
              <Star size={16} className="fill-accent text-accent" />
              <span className="font-display text-sm font-bold tabular-nums">
                {totalStars}/{maxStars}
              </span>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3">
          <button
            type="button"
            onClick={onPlay}
            className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-5 font-display text-2xl font-extrabold text-primary-foreground shadow-[0_6px_0_oklch(0.55_0.17_300)] transition-all active:translate-y-1 active:shadow-[0_2px_0_oklch(0.55_0.17_300)]"
          >
            <Play size={26} className="fill-current" />
            Play
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onLevels}
              className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-4 font-display text-base font-bold text-card-foreground shadow-lg transition-transform active:scale-95"
            >
              <Grid3x3 size={20} />
              Levels
            </button>
            <button
              type="button"
              onClick={onShop}
              className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-4 font-display text-base font-bold text-card-foreground shadow-lg transition-transform active:scale-95"
            >
              <ShoppingBag size={20} />
              Shop
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
