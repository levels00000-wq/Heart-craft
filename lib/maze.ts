export interface Cell {
  x: number
  y: number
}

export type Grid = number[][] // 0 = path, 1 = wall

export type PowerKind = "speed" | "time" | "map" | "shield"

export interface PowerUp {
  cell: Cell
  kind: PowerKind
}

export interface MazeData {
  grid: Grid
  width: number
  height: number
  start: Cell
  exit: Cell
  coins: Cell[]
  keys: Cell[]
  doors: Cell[]
  traps: Cell[]
  movingWalls: Cell[]
  portals: [Cell, Cell][]
  powerups: PowerUp[]
}

export interface LevelBlueprint {
  cols: number
  rows: number
  coins: number
  doors: number
  traps: number
  movingWalls: number
  portals: number
  powerups: number
}

export const keyOf = (c: Cell) => `${c.x},${c.y}`

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** Recursive-backtracker maze on a (cols*2+1) x (rows*2+1) grid. */
function generateGrid(cols: number, rows: number): Grid {
  const width = cols * 2 + 1
  const height = rows * 2 + 1
  const grid: Grid = Array.from({ length: height }, () => Array.from({ length: width }, () => 1))

  const visited = Array.from({ length: rows }, () => Array.from({ length: cols }, () => false))
  const stack: Cell[] = [{ x: 0, y: 0 }]
  visited[0][0] = true
  grid[1][1] = 0

  while (stack.length) {
    const cur = stack[stack.length - 1]
    const neighbors: { cell: Cell; wall: Cell }[] = []
    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ]
    for (const d of dirs) {
      const nx = cur.x + d.dx
      const ny = cur.y + d.dy
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && !visited[ny][nx]) {
        neighbors.push({
          cell: { x: nx, y: ny },
          wall: { x: cur.x * 2 + 1 + d.dx, y: cur.y * 2 + 1 + d.dy },
        })
      }
    }
    if (neighbors.length === 0) {
      stack.pop()
      continue
    }
    const pick = neighbors[Math.floor(Math.random() * neighbors.length)]
    visited[pick.cell.y][pick.cell.x] = true
    grid[pick.wall.y][pick.wall.x] = 0
    grid[pick.cell.y * 2 + 1][pick.cell.x * 2 + 1] = 0
    stack.push(pick.cell)
  }

  return grid
}

function passableCells(grid: Grid): Cell[] {
  const cells: Cell[] = []
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[0].length; x++) {
      if (grid[y][x] === 0) cells.push({ x, y })
    }
  }
  return cells
}

/** BFS returning distance map and predecessors. blocked cells are impassable. */
function bfs(grid: Grid, start: Cell, blocked: Set<string>) {
  const dist = new Map<string, number>()
  const prev = new Map<string, string>()
  const q: Cell[] = [start]
  dist.set(keyOf(start), 0)
  const dirs = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
  ]
  while (q.length) {
    const c = q.shift()!
    for (const d of dirs) {
      const n = { x: c.x + d.dx, y: c.y + d.dy }
      if (n.y < 0 || n.y >= grid.length || n.x < 0 || n.x >= grid[0].length) continue
      if (grid[n.y][n.x] !== 0) continue
      const k = keyOf(n)
      if (blocked.has(k) || dist.has(k)) continue
      dist.set(k, dist.get(keyOf(c))! + 1)
      prev.set(k, keyOf(c))
      q.push(n)
    }
  }
  return { dist, prev }
}

/** Shortest path of cells from start to goal (blocked cells impassable). */
export function shortestPath(grid: Grid, start: Cell, goal: Cell, blocked = new Set<string>()): Cell[] {
  const { dist, prev } = bfs(grid, start, blocked)
  const goalKey = keyOf(goal)
  if (!dist.has(goalKey)) return []
  const path: Cell[] = []
  let cur: string | undefined = goalKey
  while (cur) {
    const [x, y] = cur.split(",").map(Number)
    path.push({ x, y })
    cur = prev.get(cur)
  }
  return path.reverse()
}

function farthestCell(grid: Grid, start: Cell): Cell {
  const { dist } = bfs(grid, start, new Set())
  let best = start
  let bestD = -1
  for (const [k, d] of dist) {
    if (d > bestD) {
      bestD = d
      const [x, y] = k.split(",").map(Number)
      best = { x, y }
    }
  }
  return best
}

export function buildMaze(bp: LevelBlueprint): MazeData {
  const grid = generateGrid(bp.cols, bp.rows)
  const width = grid[0].length
  const height = grid.length
  const start: Cell = { x: 1, y: 1 }
  const exit = farthestCell(grid, start)

  const used = new Set<string>([keyOf(start), keyOf(exit)])
  const pool = shuffle(passableCells(grid).filter((c) => !used.has(keyOf(c))))
  const take = (): Cell | null => {
    while (pool.length) {
      const c = pool.pop()!
      if (!used.has(keyOf(c))) {
        used.add(keyOf(c))
        return c
      }
    }
    return null
  }

  const doors: Cell[] = []
  const keys: Cell[] = []
  if (bp.doors > 0) {
    const path = shortestPath(grid, start, exit)
    const interior = path.slice(2, Math.max(3, path.length - 2))
    if (interior.length) {
      const door = interior[Math.floor(interior.length / 2)]
      doors.push(door)
      used.add(keyOf(door))
      // Key must sit in the region reachable without opening the door.
      const region = bfs(grid, start, new Set([keyOf(door)])).dist
      const candidates = shuffle(
        [...region.keys()]
          .map((k) => {
            const [x, y] = k.split(",").map(Number)
            return { x, y } as Cell
          })
          .filter((c) => !used.has(keyOf(c)) && keyOf(c) !== keyOf(start)),
      )
      const key = candidates[0]
      if (key) {
        keys.push(key)
        used.add(keyOf(key))
      } else {
        // fallback: door not worth it, drop it
        doors.pop()
        used.delete(keyOf(door))
      }
    }
  }

  const coins: Cell[] = []
  for (let i = 0; i < bp.coins; i++) {
    const c = take()
    if (c) coins.push(c)
  }
  const traps: Cell[] = []
  for (let i = 0; i < bp.traps; i++) {
    const c = take()
    if (c) traps.push(c)
  }
  const movingWalls: Cell[] = []
  for (let i = 0; i < bp.movingWalls; i++) {
    const c = take()
    if (c) movingWalls.push(c)
  }
  const portals: [Cell, Cell][] = []
  for (let i = 0; i < bp.portals; i++) {
    const a = take()
    const b = take()
    if (a && b) portals.push([a, b])
  }
  const powerups: PowerUp[] = []
  const kinds: PowerKind[] = ["speed", "time", "map", "shield"]
  for (let i = 0; i < bp.powerups; i++) {
    const c = take()
    if (c) powerups.push({ cell: c, kind: kinds[Math.floor(Math.random() * kinds.length)] })
  }

  return { grid, width, height, start, exit, coins, keys, doors, traps, movingWalls, portals, powerups }
}
