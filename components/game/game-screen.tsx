"use client"

import { useEffect, useRef, useState } from "react"
import { Lightbulb, Play, RotateCcw, Home, Volume2, VolumeX } from "lucide-react"
import { MazeEngine, type Dir, type HudState, type LoseStats, type WinStats } from "@/lib/engine"
import type { GameLevel } from "@/lib/levels"
import { THEMES } from "@/lib/themes"
import type { PowerKind } from "@/lib/maze"
import { sound } from "@/lib/sound"
import { Hud } from "./hud"
import { DPad } from "./dpad"
import { VirtualJoystick } from "./virtual-joystick"
import { cn } from "@/lib/utils"

const POWER_LABEL: Record<PowerKind, string> = {
  speed: "⚡ Speed Boost!",
  time: "⏱️ +15 Seconds!",
  map: "🗺️ Map Revealed!",
  shield: "🛡️ Shield Active!",
}

export function GameScreen({
  level,
  characterId,
  muted,
  onWin,
  onLose,
  onExit,
  onRestart,
  onToggleMute,
}: {
  level: GameLevel
  characterId: string
  muted: boolean
  onWin: (s: WinStats) => void
  onLose: (s: LoseStats) => void
  onExit: () => void
  onRestart: () => void
  onToggleMute: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<MazeEngine | null>(null)
  const [hud, setHud] = useState<HudState | null>(null)
  const [paused, setPaused] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    sound.unlock()
    sound.startMusic()
    const engine = new MazeEngine(canvasRef.current, level, {
      characterId,
      onHud: setHud,
      onWin,
      onLose,
      onPowerup: (kind) => {
        setToast(POWER_LABEL[kind])
        if (toastTimer.current) window.clearTimeout(toastTimer.current)
        toastTimer.current = window.setTimeout(() => setToast(null), 1600)
      },
    })
    engineRef.current = engine
    engine.start()
    return () => {
      engine.destroy()
      engineRef.current = null
      sound.stopMusic()
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const doPause = (p: boolean) => {
    setPaused(p)
    engineRef.current?.setPaused(p)
  }

  const theme = THEMES[level.theme]

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        style={{ touchAction: "none" }}
      />

      {hud && (
        <Hud
          hud={hud}
          levelName={level.name}
          difficulty={level.difficulty}
          themeEmoji={theme.emoji}
          onPause={() => doPause(true)}
        />
      )}

      {/* controls */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 p-4 pb-6">
        <div className="pointer-events-auto">
          <DPad
            onPress={(d: Dir) => engineRef.current?.setDir(d)}
            onRelease={(d: Dir) => engineRef.current?.clearDir(d)}
          />
        </div>

        <div className="pointer-events-auto flex flex-col items-center gap-2">
          <VirtualJoystick
            onDirection={(dir) => engineRef.current?.setDir(dir)}
            onRelease={() => engineRef.current?.clearDir()}
          />
          <button
            type="button"
            disabled={!hud?.hintReady}
            onClick={() => engineRef.current?.requestHint()}
            className={cn(
              "flex h-16 w-16 flex-col items-center justify-center rounded-2xl border border-border shadow-lg transition-transform active:scale-90",
              hud?.hintReady
                ? "bg-accent text-accent-foreground"
                : "bg-card/70 text-muted-foreground",
            )}
            aria-label="Show hint path"
          >
            <Lightbulb size={24} className={cn(hud?.hintReady && "fill-accent-foreground")} />
            <span className="text-[10px] font-bold leading-none mt-0.5">
              {hud?.hintReady ? "Hint" : `${hud?.hintCooldown ?? 0}s`}
            </span>
          </button>
        </div>
      </div>

      {/* power-up toast */}
      {toast && (
        <div className="pointer-events-none absolute left-1/2 top-1/4 z-20 -translate-x-1/2 animate-bounce">
          <div className="rounded-full bg-card px-5 py-2 font-display text-base font-bold text-foreground shadow-2xl border border-primary">
            {toast}
          </div>
        </div>
      )}

      {/* pause overlay */}
      {paused && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-md">
          <div className="w-72 rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="mb-5 text-center font-display text-2xl font-extrabold">Paused</h2>
            <div className="flex flex-col gap-3">
              <PauseButton icon={<Play className="fill-current" size={20} />} label="Resume" primary onClick={() => doPause(false)} />
              <PauseButton icon={<RotateCcw size={20} />} label="Restart Level" onClick={onRestart} />
              <PauseButton
                icon={muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                label={muted ? "Sound: Off" : "Sound: On"}
                onClick={onToggleMute}
              />
              <PauseButton icon={<Home size={20} />} label="Quit to Menu" onClick={onExit} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PauseButton({
  icon,
  label,
  onClick,
  primary,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-4 py-3 font-display text-base font-bold transition-transform active:scale-95",
        primary
          ? "bg-primary text-primary-foreground shadow-lg"
          : "bg-secondary text-secondary-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  )
}
