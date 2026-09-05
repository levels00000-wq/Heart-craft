export interface Progress {
  coins: number
  unlockedLevel: number // highest level id unlocked
  stars: Record<number, number> // level id -> best stars
  bestScore: Record<number, number> // level id -> best score
  characters: string[] // unlocked character ids
  selectedCharacter: string
  muted: boolean
}

const STORAGE_KEY = "maze-escape-progress-v1"

export const defaultProgress = (): Progress => ({
  coins: 0,
  unlockedLevel: 1,
  stars: {},
  bestScore: {},
  characters: ["explorer"],
  selectedCharacter: "explorer",
  muted: false,
})

export function loadProgress(): Progress {
  if (typeof window === "undefined") return defaultProgress()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultProgress()
    return { ...defaultProgress(), ...JSON.parse(raw) }
  } catch {
    return defaultProgress()
  }
}

export function saveProgress(p: Progress) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    // ignore quota / privacy errors
  }
}
