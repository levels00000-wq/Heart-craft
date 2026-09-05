"use client"

import { useCallback, useEffect, useState } from "react"
import { LEVELS } from "@/lib/levels"
import { CHARACTERS } from "@/lib/characters"
import { defaultProgress, loadProgress, saveProgress, type Progress } from "@/lib/storage"
import type { LoseStats, WinStats } from "@/lib/engine"
import { sound } from "@/lib/sound"
import { HomeScreen } from "@/components/game/home-screen"
import { LevelSelect } from "@/components/game/level-select"
import { GameScreen } from "@/components/game/game-screen"
import { ResultScreen } from "@/components/game/result-screen"
import { ShopScreen } from "@/components/game/shop-screen"

type Screen = "home" | "levels" | "play" | "result" | "shop"

interface ResultData {
  mode: "win" | "lose"
  win?: WinStats
  lose?: LoseStats
  levelId: number
  isNewBest: boolean
}

export default function Page() {
  const [progress, setProgress] = useState<Progress | null>(null)
  const [screen, setScreen] = useState<Screen>("home")
  const [currentLevelId, setCurrentLevelId] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<ResultData | null>(null)

  useEffect(() => {
    const p = loadProgress()
    setProgress(p)
    sound.setMuted(p.muted)
  }, [])

  const update = useCallback((updater: (p: Progress) => Progress) => {
    setProgress((prev) => {
      const base = prev ?? defaultProgress()
      const next = updater(base)
      saveProgress(next)
      return next
    })
  }, [])

  const startLevel = (id: number) => {
    setCurrentLevelId(id)
    setAttempt((a) => a + 1)
    setScreen("play")
  }

  const handleWin = (stats: WinStats) => {
    const id = currentLevelId
    let isNewBest = false
    update((p) => {
      const prevBest = p.bestScore[id] ?? -1
      isNewBest = stats.score > prevBest
      const prevStars = p.stars[id] ?? 0
      return {
        ...p,
        coins: p.coins + stats.coins,
        stars: { ...p.stars, [id]: Math.max(prevStars, stats.stars) },
        bestScore: { ...p.bestScore, [id]: Math.max(prevBest, stats.score) },
        unlockedLevel: Math.min(LEVELS.length, Math.max(p.unlockedLevel, id + 1)),
      }
    })
    setResult({ mode: "win", win: stats, levelId: id, isNewBest })
    setScreen("result")
  }

  const handleLose = (stats: LoseStats) => {
    update((p) => ({ ...p, coins: p.coins + stats.coins }))
    setResult({ mode: "lose", lose: stats, levelId: currentLevelId, isNewBest: false })
    setScreen("result")
  }

  const toggleMute = () => {
    update((p) => {
      const muted = !p.muted
      sound.setMuted(muted)
      return { ...p, muted }
    })
  }

  const buyCharacter = (id: string) => {
    const char = CHARACTERS.find((c) => c.id === id)
    if (!char) return
    sound.play("click")
    update((p) => {
      if (p.characters.includes(id) || p.coins < char.cost) return p
      return {
        ...p,
        coins: p.coins - char.cost,
        characters: [...p.characters, id],
        selectedCharacter: id,
      }
    })
  }

  const selectCharacter = (id: string) => {
    sound.play("click")
    update((p) => ({ ...p, selectedCharacter: id }))
  }

  if (!progress) {
    return <div className="min-h-[100dvh] w-full bg-background" />
  }

  const currentLevel = LEVELS.find((l) => l.id === currentLevelId) ?? LEVELS[0]

  if (screen === "play") {
    return (
      <GameScreen
        key={attempt}
        level={currentLevel}
        characterId={progress.selectedCharacter}
        muted={progress.muted}
        onWin={handleWin}
        onLose={handleLose}
        onExit={() => setScreen("home")}
        onRestart={() => startLevel(currentLevelId)}
        onToggleMute={toggleMute}
      />
    )
  }

  if (screen === "result" && result) {
    const lvl = LEVELS.find((l) => l.id === result.levelId) ?? LEVELS[0]
    return (
      <ResultScreen
        mode={result.mode}
        win={result.win}
        lose={result.lose}
        level={lvl}
        isNewBest={result.isNewBest}
        hasNext={result.levelId < LEVELS.length}
        onNext={() => startLevel(result.levelId + 1)}
        onRetry={() => startLevel(result.levelId)}
        onHome={() => setScreen("home")}
      />
    )
  }

  if (screen === "levels") {
    return (
      <LevelSelect
        progress={progress}
        onSelect={(id) => startLevel(id)}
        onBack={() => setScreen("home")}
      />
    )
  }

  if (screen === "shop") {
    return (
      <ShopScreen
        progress={progress}
        onBuy={buyCharacter}
        onSelect={selectCharacter}
        onBack={() => setScreen("home")}
      />
    )
  }

  return (
    <HomeScreen
      progress={progress}
      onPlay={() => startLevel(progress.unlockedLevel)}
      onLevels={() => setScreen("levels")}
      onShop={() => setScreen("shop")}
      onToggleMute={toggleMute}
    />
  )
}
