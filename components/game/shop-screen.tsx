"use client"

import { ChevronLeft, Coins, Check, Lock } from "lucide-react"
import { CHARACTERS, type Character } from "@/lib/characters"
import { LEVELS } from "@/lib/levels"
import { THEMES } from "@/lib/themes"
import type { Progress } from "@/lib/storage"
import { cn } from "@/lib/utils"

export function ShopScreen({
  progress,
  onBuy,
  onSelect,
  onBack,
}: {
  progress: Progress
  onBuy: (id: string) => void
  onSelect: (id: string) => void
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
        <h1 className="flex-1 font-display text-3xl font-extrabold">Shop</h1>
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5">
          <Coins size={16} className="text-accent" />
          <span className="font-display text-sm font-bold tabular-nums">{progress.coins}</span>
        </div>
      </header>

      <h2 className="mb-3 font-display text-lg font-bold text-muted-foreground">Characters</h2>
      <div className="grid grid-cols-2 gap-3">
        {CHARACTERS.map((c) => {
          const owned = progress.characters.includes(c.id)
          const selected = progress.selectedCharacter === c.id
          const affordable = progress.coins >= c.cost
          return (
            <div
              key={c.id}
              className={cn(
                "flex flex-col items-center gap-2 rounded-3xl border p-4 shadow-lg transition-colors",
                selected ? "border-primary bg-primary/10" : "border-border bg-card",
              )}
            >
              <Avatar character={c} />
              <p className="font-display text-sm font-bold">{c.name}</p>
              {owned ? (
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  disabled={selected}
                  className={cn(
                    "flex w-full items-center justify-center gap-1 rounded-xl py-2 text-sm font-bold transition-transform active:scale-95",
                    selected ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                  )}
                >
                  {selected ? (
                    <>
                      <Check size={16} /> Equipped
                    </>
                  ) : (
                    "Equip"
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onBuy(c.id)}
                  disabled={!affordable}
                  className={cn(
                    "flex w-full items-center justify-center gap-1 rounded-xl py-2 text-sm font-bold transition-transform active:scale-95",
                    affordable ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground",
                  )}
                >
                  <Coins size={14} /> {c.cost}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <h2 className="mb-3 mt-8 font-display text-lg font-bold text-muted-foreground">Maze Themes</h2>
      <div className="grid grid-cols-3 gap-3 pb-4">
        {LEVELS.map((lvl) => {
          const theme = THEMES[lvl.theme]
          const unlocked = lvl.id <= progress.unlockedLevel
          return (
            <div
              key={lvl.id}
              className="relative flex flex-col items-center gap-1 rounded-2xl border border-border p-3 shadow"
              style={{ background: `linear-gradient(135deg, ${theme.bgTop}, ${theme.bgBottom})` }}
            >
              <span className="text-2xl">{unlocked ? theme.emoji : <Lock size={20} className="text-foreground/60" />}</span>
              <span className="text-center text-[10px] font-bold leading-tight text-foreground/85">{theme.name}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Avatar({ character }: { character: Character }) {
  return (
    <div className="relative flex h-16 w-16 items-end justify-center">
      {/* hat */}
      <div
        className="absolute left-1/2 top-0 h-4 w-10 -translate-x-1/2 rounded-t-full"
        style={{ backgroundColor: character.hat }}
      />
      {/* head */}
      <div
        className="absolute left-1/2 top-2 h-8 w-8 -translate-x-1/2 rounded-full border-2"
        style={{ backgroundColor: character.body, borderColor: character.hat }}
      >
        <div className="absolute left-1.5 top-3 h-1.5 w-1.5 rounded-full bg-[#2a2233]" />
        <div className="absolute right-1.5 top-3 h-1.5 w-1.5 rounded-full bg-[#2a2233]" />
      </div>
      {/* body */}
      <div className="h-7 w-11 rounded-t-2xl" style={{ backgroundColor: character.outfit }} />
    </div>
  )
}
