export interface Character {
  id: string
  name: string
  cost: number
  body: string
  outfit: string
  hat: string
  hatStyle: "cap" | "helmet" | "hood" | "crown" | "none"
}

export const CHARACTERS: Character[] = [
  { id: "explorer", name: "Explorer", cost: 0, body: "#ffcc99", outfit: "#e07a3f", hat: "#a85528", hatStyle: "cap" },
  { id: "diver", name: "Aqua Diver", cost: 150, body: "#ffd9b3", outfit: "#3aa0d6", hat: "#1f6f9e", hatStyle: "helmet" },
  { id: "ranger", name: "Forest Ranger", cost: 250, body: "#f2c79a", outfit: "#4c9a52", hat: "#2e6b34", hatStyle: "hood" },
  { id: "astro", name: "Astronaut", cost: 400, body: "#ffe0c2", outfit: "#e8e8f0", hat: "#b8c4ff", hatStyle: "helmet" },
  { id: "royal", name: "Royal Heir", cost: 600, body: "#ffd1a8", outfit: "#8a4fd6", hat: "#ffd166", hatStyle: "crown" },
]

export function getCharacter(id: string): Character {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0]
}
