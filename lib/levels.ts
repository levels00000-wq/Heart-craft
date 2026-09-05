import type { LevelBlueprint } from "./maze"

export interface GameLevel {
  id: number
  name: string
  difficulty: string
  theme: string
  time: number
  fog: boolean
  blueprint: LevelBlueprint
}

export const LEVELS: GameLevel[] = [
  {
    id: 1,
    name: "Castle Gates",
    difficulty: "Easy",
    theme: "castle",
    time: 90,
    fog: false,
    blueprint: { cols: 6, rows: 6, coins: 6, doors: 0, traps: 0, movingWalls: 0, portals: 0, powerups: 1 },
  },
  {
    id: 2,
    name: "Overgrown Ruins",
    difficulty: "Medium",
    theme: "jungle",
    time: 100,
    fog: false,
    blueprint: { cols: 8, rows: 8, coins: 8, doors: 1, traps: 3, movingWalls: 0, portals: 0, powerups: 2 },
  },
  {
    id: 3,
    name: "Frozen Depths",
    difficulty: "Hard",
    theme: "ice",
    time: 110,
    fog: true,
    blueprint: { cols: 10, rows: 10, coins: 10, doors: 1, traps: 6, movingWalls: 0, portals: 1, powerups: 2 },
  },
  {
    id: 4,
    name: "Orbital Labyrinth",
    difficulty: "Extreme",
    theme: "space",
    time: 120,
    fog: true,
    blueprint: { cols: 11, rows: 11, coins: 12, doors: 1, traps: 5, movingWalls: 4, portals: 1, powerups: 3 },
  },
  {
    id: 5,
    name: "The Haunting",
    difficulty: "Nightmare",
    theme: "haunted",
    time: 130,
    fog: true,
    blueprint: { cols: 12, rows: 12, coins: 14, doors: 1, traps: 8, movingWalls: 3, portals: 2, powerups: 3 },
  },
]
