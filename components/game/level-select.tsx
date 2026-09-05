"use client"

import { ChevronLeft, Lock } from "lucide-react"
import { LEVELS } from "@/lib/levels"
import { THEMES } from "@/lib/themes"
import type { Progress } from "@/lib/storage"
import { StarRating } from "./star-rating"
import { cn } from "@/lib/utils"

export function LevelSelect({
  progress,
  onSelect,
  onBack,
}: {
  progress: Progress
  onSelect: (id: number) => void
  onBack: () => void
}) {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 py-6">
      <header className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card shadow-lg active:scale-90 transition-transform"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="font-display text-3xl font-extrabold">Select Level</h1>
      </header>

      <div className="flex flex-col gap-3">
        {LEVELS.map((lvl) => {
          const locked = lvl.id > progress.unlockedLevel
          const stars = progress.stars[lvl.id] ?? 0
          const best = progress.bestScore[lvl.id]
          const theme = THEMES[lvl.theme]
          return (
            <button
              key={lvl.id}
              type="button"
              disabled={locked}
              onClick={() => onSelect(lvl.id)}
              className={cn(
                "relative flex items-center gap-4 overflow-hidden rounded-3xl border border-border p-4 text-left shadow-lg transition-transform",
                locked ? "opacity-60" : "active:scale-[0.98]",
              )}
              style={{
                background: `linear-gradient(135deg, ${theme.bgTop}, ${theme.bgBottom})`,
              }}
            >
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl shadow-inner"
                style={{ backgroundColor: theme.floor }}
              >
                {locked ? <Lock size={26} className="text-foreground/70" /> : theme.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display text-xs font-bold text-foreground/60">LEVEL {lvl.id}</span>
                  <span className="rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-foreground/80">
                    {lvl.difficulty}
                  </span>
                </div>
                <h2 className="truncate font-display text-lg font-extrabold text-foreground">{lvl.name}</h2>
                {locked ? (
                  <p className="text-xs text-foreground/60">Complete level {lvl.id - 1} to unlock</p>
                ) : (
                  <div className="mt-1 flex items-center gap-3">
                    <StarRating value={stars} size={16} />
                    {best != null && (
                      <span className="text-xs font-bold text-foreground/70 tabular-nums">Best {best}</span>
                    )}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
