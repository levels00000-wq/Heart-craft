export interface Theme {
  id: string
  name: string
  emoji: string
  bgTop: string
  bgBottom: string
  floor: string
  floorAlt: string
  wall: string
  wallTop: string
  wallSide: string
  accent: string
  exit: string
  glow: string
}

export const THEMES: Record<string, Theme> = {
  castle: {
    id: "castle",
    name: "Ancient Castle",
    emoji: "🏰",
    bgTop: "#3a2e5c",
    bgBottom: "#1c1633",
    floor: "#5b4a7a",
    floorAlt: "#52436e",
    wall: "#8a7bb8",
    wallTop: "#b3a3e0",
    wallSide: "#5f5288",
    accent: "#ffd166",
    exit: "#7be0a0",
    glow: "#c9b8ff",
  },
  jungle: {
    id: "jungle",
    name: "Jungle Ruins",
    emoji: "🌿",
    bgTop: "#1f3d2b",
    bgBottom: "#0e2118",
    floor: "#2f6b3f",
    floorAlt: "#2a6039",
    wall: "#3f8f52",
    wallTop: "#63c072",
    wallSide: "#2c6b3b",
    accent: "#ffcf5c",
    exit: "#9dff7b",
    glow: "#b6ffb0",
  },
  ice: {
    id: "ice",
    name: "Ice Cave",
    emoji: "❄️",
    bgTop: "#1b3a52",
    bgBottom: "#0c1e30",
    floor: "#3c6c8f",
    floorAlt: "#356084",
    wall: "#6fb2d6",
    wallTop: "#aee3f7",
    wallSide: "#4d90b8",
    accent: "#ffe98a",
    exit: "#a0f0d8",
    glow: "#d6f4ff",
  },
  space: {
    id: "space",
    name: "Space Station",
    emoji: "🚀",
    bgTop: "#241b3d",
    bgBottom: "#0a0718",
    floor: "#2c2a55",
    floorAlt: "#26244c",
    wall: "#4b47a8",
    wallTop: "#7d78e0",
    wallSide: "#332f78",
    accent: "#4de1ff",
    exit: "#ff8adf",
    glow: "#8af0ff",
  },
  haunted: {
    id: "haunted",
    name: "Haunted House",
    emoji: "👻",
    bgTop: "#2a1f2e",
    bgBottom: "#120c16",
    floor: "#3d2f42",
    floorAlt: "#372a3c",
    wall: "#5e4668",
    wallTop: "#8a6a97",
    wallSide: "#43324c",
    accent: "#a0ff5c",
    exit: "#ff6b6b",
    glow: "#c79bff",
  },
}
