import { buildMaze, keyOf, shortestPath, type Cell, type MazeData, type PowerKind } from "./maze"
import type { GameLevel } from "./levels"
import { getCharacter, type Character } from "./characters"
import { THEMES, type Theme } from "./themes"
import { sound } from "./sound"

export type Dir = "up" | "down" | "left" | "right"

export interface HudState {
  timeLeft: number
  totalTime: number
  coins: number
  coinsTotal: number
  keys: number
  keysNeeded: number
  hintReady: boolean
  hintCooldown: number
  shield: boolean
  speed: boolean
  mapReveal: boolean
  paused: boolean
}

export interface WinStats {
  timeLeft: number
  coins: number
  stars: number
  score: number
}

export interface LoseStats {
  reason: "time" | "trap"
  coins: number
}

interface EngineOpts {
  characterId: string
  onHud: (s: HudState) => void
  onWin: (s: WinStats) => void
  onLose: (s: LoseStats) => void
  onPowerup?: (kind: PowerKind) => void
}

const DIRS: Record<Dir, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
}

const BASE_MOVE = 0.13 // seconds per cell
const smoothstep = (t: number) => t * t * (3 - 2 * t)
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

export class MazeEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private maze: MazeData
  private level: GameLevel
  private theme: Theme
  private character: Character
  private opts: EngineOpts

  private raf = 0
  private last = 0
  private running = false
  private paused = false
  private ended = false

  // player
  private px: number
  private py: number
  private fromX: number
  private fromY: number
  private moving = false
  private moveT = 0
  private heldDir: Dir | null = null
  private pendingDir: Dir | null = null
  private moveVelocity = 0
  private facing: Dir = "down"
  private facingAngle = Math.PI / 2
  private portalCd = 0
  private inputBuffer: Dir[] = []
  private readonly maxInputBuffer = 4
  private cameraX = 0
  private cameraY = 0
  private cameraZoom = 1
  private targetZoom = 1
  private particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }> = []

  // gameplay
  private timeLeft: number
  private coinsCollected = 0
  private keysHeld = 0
  private doorSet: Set<string>
  private coinSet: Set<string>
  private keySet: Set<string>
  private trapSet: Set<string>
  private movingSet: Set<string>
  private portalMap: Map<string, Cell>
  private powerMap: Map<string, PowerKind>
  private visited = new Set<string>()
  private clock = 0

  // power-ups
  private speedTimer = 0
  private mapTimer = 0
  private shield = false

  // hint
  private hintTimer = 0
  private hintCd = 0
  private hintPath: Cell[] = []

  // fx
  private hitFlash = 0
  private shake = 0

  // view
  private cell = 40
  private cssW = 0
  private cssH = 0
  private dpr = 1
  private ro: ResizeObserver | null = null

  private hudAccum = 0

  constructor(canvas: HTMLCanvasElement, level: GameLevel, opts: EngineOpts) {
    this.canvas = canvas
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("no 2d context")
    this.ctx = ctx
    this.level = level
    this.theme = THEMES[level.theme]
    this.character = getCharacter(opts.characterId)
    this.opts = opts
    this.maze = buildMaze(level.blueprint)
    this.timeLeft = level.time

    this.px = this.maze.start.x
    this.py = this.maze.start.y
    this.fromX = this.px
    this.fromY = this.py

    this.doorSet = new Set(this.maze.doors.map(keyOf))
    this.coinSet = new Set(this.maze.coins.map(keyOf))
    this.keySet = new Set(this.maze.keys.map(keyOf))
    this.trapSet = new Set(this.maze.traps.map(keyOf))
    this.movingSet = new Set(this.maze.movingWalls.map(keyOf))
    this.portalMap = new Map()
    for (const [a, b] of this.maze.portals) {
      this.portalMap.set(keyOf(a), b)
      this.portalMap.set(keyOf(b), a)
    }
    this.powerMap = new Map(this.maze.powerups.map((p) => [keyOf(p.cell), p.kind]))
  }

  start() {
    this.resize()
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(this.canvas)
    window.addEventListener("keydown", this.onKeyDown)
    window.addEventListener("keyup", this.onKeyUp)
    this.canvas.addEventListener("pointerdown", this.onPointerDown, { passive: false })
    this.canvas.addEventListener("pointermove", this.onPointerMove, { passive: false })
    this.canvas.addEventListener("pointerup", this.onPointerUp, { passive: false })
    this.canvas.addEventListener("pointercancel", this.onPointerCancel, { passive: false })
    this.running = true
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.loop)
    this.emitHud()
  }

  destroy() {
    this.running = false
    cancelAnimationFrame(this.raf)
    this.ro?.disconnect()
    window.removeEventListener("keydown", this.onKeyDown)
    window.removeEventListener("keyup", this.onKeyUp)
    this.canvas.removeEventListener("pointerdown", this.onPointerDown)
    this.canvas.removeEventListener("pointermove", this.onPointerMove)
    this.canvas.removeEventListener("pointerup", this.onPointerUp)
    this.canvas.removeEventListener("pointercancel", this.onPointerCancel)
  }

  setPaused(p: boolean) {
    this.paused = p
    this.emitHud()
  }

  setDir(dir: Dir) {
    this.heldDir = dir
    this.inputBuffer = [dir, ...this.inputBuffer.filter((queued) => queued !== dir)].slice(0, this.maxInputBuffer)
    this.facing = dir
    this.pendingDir = dir // guarantees at least one step per tap
  }

  clearDir(dir?: Dir) {
    if (!dir || this.heldDir === dir) this.heldDir = null
  }

  requestHint() {
    if (this.hintCd > 0 || this.ended) return
    this.hintPath = shortestPath(this.maze.grid, { x: this.px, y: this.py }, this.maze.exit)
    this.hintTimer = 4
    this.hintCd = 15
    sound.play("hint")
    this.emitHud()
  }

  // ---------- input ----------
  private onKeyDown = (e: KeyboardEvent) => {
    const map: Record<string, Dir> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      s: "down",
      a: "left",
      d: "right",
      W: "up",
      S: "down",
      A: "left",
      D: "right",
    }
    const dir = map[e.key]
    if (dir) {
      e.preventDefault()
      this.setDir(dir)
    }
  }

  private onKeyUp = (e: KeyboardEvent) => {
    const map: Record<string, Dir> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      s: "down",
      a: "left",
      d: "right",
      W: "up",
      S: "down",
      A: "left",
      D: "right",
    }
    this.clearDir(map[e.key])
  }

  private pStart: { x: number; y: number; id: number } | null = null
  private onPointerDown = (e: PointerEvent) => {
    e.preventDefault()
    this.canvas.setPointerCapture?.(e.pointerId)
    this.pStart = { x: e.clientX, y: e.clientY, id: e.pointerId }
  }
  private onPointerMove = (e: PointerEvent) => {
    if (!this.pStart || this.pStart.id !== e.pointerId) return
    e.preventDefault()
    const dx = e.clientX - this.pStart.x
    const dy = e.clientY - this.pStart.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return
    const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up")
    this.setDir(dir)
    this.pStart = { x: e.clientX, y: e.clientY, id: e.pointerId }
  }
  private onPointerUp = (e: PointerEvent) => {
    if (!this.pStart || this.pStart.id !== e.pointerId) return
    e.preventDefault()
    const dx = e.clientX - this.pStart.x
    const dy = e.clientY - this.pStart.y
    this.pStart = null
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return
    if (Math.abs(dx) > Math.abs(dy)) this.setDir(dx > 0 ? "right" : "left")
    else this.setDir(dy > 0 ? "down" : "up")
  }
  private onPointerCancel = () => {
    this.pStart = null
    this.clearDir()
  }

  // ---------- view ----------
  private resize() {
    const rect = this.canvas.getBoundingClientRect()
    this.cssW = rect.width
    this.cssH = rect.height
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = Math.floor(this.cssW * this.dpr)
    this.canvas.height = Math.floor(this.cssH * this.dpr)
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    this.cell = clamp(Math.floor(Math.min(this.cssW, this.cssH) / 8), 26, 60)
    const maxX = Math.max(0, this.maze.width * this.cell - this.cssW)
    const maxY = Math.max(0, this.maze.height * this.cell - this.cssH)
    this.cameraX = clamp((this.px + 0.5) * this.cell - this.cssW / 2, 0, maxX)
    this.cameraY = clamp((this.py + 0.5) * this.cell - this.cssH / 2, 0, maxY)
  }

  // ---------- collisions ----------
  private isWall(x: number, y: number) {
    if (y < 0 || y >= this.maze.height || x < 0 || x >= this.maze.width) return true
    return this.maze.grid[y][x] !== 0
  }

  private isMovingClosed(x: number, y: number) {
    if (!this.movingSet.has(`${x},${y}`)) return false
    const phase = ((x * 7 + y * 13) % 100) / 100
    const frac = (this.clock / 2.4 + phase) % 1
    return frac < 0.5
  }

  private isTrapDangerous(x: number, y: number) {
    const phase = ((x * 11 + y * 17) % 100) / 100
    const frac = (this.clock / 1.6 + phase) % 1
    return frac < 0.45
  }

  private canEnter(x: number, y: number) {
    if (this.isWall(x, y)) return false
    if (this.doorSet.has(`${x},${y}`) && this.keysHeld <= 0) return false
    if (this.isMovingClosed(x, y)) return false
    return true
  }

  // ---------- loop ----------
  private loop = (now: number) => {
    if (!this.running) return
    let dt = (now - this.last) / 1000
    this.last = now
    dt = Math.min(dt, 0.05)
    if (!this.paused && !this.ended) this.update(dt)
    this.render()
    this.raf = requestAnimationFrame(this.loop)
  }

  private update(dt: number) {
    this.clock += dt
    this.timeLeft -= dt
    if (this.portalCd > 0) this.portalCd -= dt
    if (this.speedTimer > 0) this.speedTimer -= dt
    if (this.mapTimer > 0) this.mapTimer -= dt
    if (this.hintTimer > 0) this.hintTimer -= dt
    if (this.hintCd > 0) this.hintCd -= dt
    if (this.hitFlash > 0) this.hitFlash -= dt
    if (this.shake > 0) this.shake -= dt

    if (this.timeLeft <= 0) {
      this.timeLeft = 0
      this.lose("time")
      return
    }

    // Movement uses a spring-like acceleration curve while retaining the
    // original cell-based collision and progression model.
    const targetDuration = this.speedTimer > 0 ? BASE_MOVE * 0.55 : BASE_MOVE
    const targetVelocity = 1 / targetDuration
    const acceleration = 22
    this.moveVelocity += (targetVelocity - this.moveVelocity) * Math.min(1, acceleration * dt)
    if (this.moving) {
      this.moveT += dt * this.moveVelocity
      if (this.moveT >= 1) {
        this.moveT = 0
        this.moving = false
        this.onArrive()
        if (this.ended) return
        this.tryNext()
      }
    } else {
      this.tryNext()
    }

    // standing on an active trap
    if (!this.moving) {
      const k = `${this.px},${this.py}`
      if (this.trapSet.has(k) && this.isTrapDangerous(this.px, this.py)) {
        this.hit()
        if (this.ended) return
      }
    }

    // fog memory
    this.rememberVisibility()

    this.hudAccum += dt
    if (this.hudAccum >= 0.1) {
      this.hudAccum = 0
      this.emitHud()
    }
  }

  private tryNext() {
    if (this.moving) return
    const dir = this.heldDir ?? this.inputBuffer[0] ?? this.pendingDir
    if (!dir) return
    const started = this.tryStart(dir)
    if (started) this.inputBuffer = this.inputBuffer.filter((queued) => queued !== dir)
    // Consume a queued tap once it moves, or drop it if it was blocked with no
    // active hold, so the player never lurches unexpectedly later.
    if (started || this.heldDir !== dir) this.pendingDir = null
  }

  private tryStart(dir: Dir): boolean {
    const d = DIRS[dir]
    const nx = this.px + d.dx
    const ny = this.py + d.dy
    if (!this.canEnter(nx, ny)) return false
    // consume key when passing through a door
    if (this.doorSet.has(`${nx},${ny}`)) {
      this.keysHeld -= 1
      this.doorSet.delete(`${nx},${ny}`)
      sound.play("door")
    }
    this.fromX = this.px
    this.fromY = this.py
    this.px = nx
    this.py = ny
    this.facing = dir
    this.moving = true
    this.moveT = 0
    this.moveVelocity = Math.max(this.moveVelocity, 3.5)
    sound.play("step")
    return true
  }

  private onArrive() {
    const k = `${this.px},${this.py}`

    if (this.coinSet.has(k)) {
      this.coinSet.delete(k)
      this.coinsCollected++
      sound.play("coin")
    }
    if (this.keySet.has(k)) {
      this.keySet.delete(k)
      this.keysHeld++
      sound.play("key")
    }
    if (this.powerMap.has(k)) {
      const kind = this.powerMap.get(k)!
      this.powerMap.delete(k)
      this.activatePower(kind)
    }
    if (this.trapSet.has(k) && this.isTrapDangerous(this.px, this.py)) {
      this.hit()
      if (this.ended) return
    }
    if (this.portalMap.has(k) && this.portalCd <= 0) {
      const dest = this.portalMap.get(k)!
      this.px = dest.x
      this.py = dest.y
      this.fromX = dest.x
      this.fromY = dest.y
      this.portalCd = 0.4
      this.heldDir = null
      this.pendingDir = null
      sound.play("portal")
    }
    if (this.px === this.maze.exit.x && this.py === this.maze.exit.y) {
      this.win()
    }
  }

  private activatePower(kind: PowerKind) {
    sound.play("power")
    switch (kind) {
      case "speed":
        this.speedTimer = 8
        break
      case "time":
        this.timeLeft = Math.min(this.level.time, this.timeLeft + 15)
        break
      case "map":
        this.mapTimer = 10
        break
      case "shield":
        this.shield = true
        break
    }
    this.opts.onPowerup?.(kind)
    this.emitHud()
  }

  private hit() {
    if (this.shield) {
      this.shield = false
      this.hitFlash = 0.3
      this.portalCd = 0.6 // brief grace
      sound.play("door")
      return
    }
    this.hitFlash = 0.5
    this.shake = 0.4
    this.lose("trap")
  }

  private win() {
    if (this.ended) return
    this.ended = true
    const frac = this.timeLeft / this.level.time
    const stars = frac > 0.6 ? 3 : frac > 0.3 ? 2 : 1
    const score = Math.round(this.timeLeft * 10 + this.coinsCollected * 50 + stars * 100)
    sound.play("win")
    this.opts.onWin({ timeLeft: Math.ceil(this.timeLeft), coins: this.coinsCollected, stars, score })
  }

  private lose(reason: "time" | "trap") {
    if (this.ended) return
    this.ended = true
    sound.play("lose")
    this.opts.onLose({ reason, coins: this.coinsCollected })
  }

  private rememberVisibility() {
    if (!this.level.fog) return
    const r = 3
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.hypot(dx, dy) > r + 0.5) continue
        const x = this.px + dx
        const y = this.py + dy
        if (x >= 0 && y >= 0 && x < this.maze.width && y < this.maze.height) {
          this.visited.add(`${x},${y}`)
        }
      }
    }
  }

  private lightLevel(x: number, y: number): number {
    if (!this.level.fog || this.mapTimer > 0) return 1
    const rx = this.renderX()
    const ry = this.renderY()
    const d = Math.hypot(x - rx, y - ry)
    if (d <= 3.2) return 1
    if (d <= 4.2) return 0.7
    if (this.visited.has(`${x},${y}`)) return 0.4
    return 0
  }

  private renderX() {
    return this.fromX + (this.px - this.fromX) * smoothstep(this.moveT)
  }
  private renderY() {
    return this.fromY + (this.py - this.fromY) * smoothstep(this.moveT)
  }

  private emitHud() {
    this.opts.onHud({
      timeLeft: this.timeLeft,
      totalTime: this.level.time,
      coins: this.coinsCollected,
      coinsTotal: this.maze.coins.length,
      keys: this.keysHeld,
      keysNeeded: this.doorSet.size,
      hintReady: this.hintCd <= 0,
      hintCooldown: Math.ceil(this.hintCd),
      shield: this.shield,
      speed: this.speedTimer > 0,
      mapReveal: this.mapTimer > 0,
      paused: this.paused,
    })
  }

  // ---------- render ----------
  private render() {
    const ctx = this.ctx
    const cell = this.cell
    const worldW = this.maze.width * cell
    const worldH = this.maze.height * cell
    const rx = this.renderX()
    const ry = this.renderY()

    const targetCamX = worldW <= this.cssW ? (worldW - this.cssW) / 2 : clamp((rx + 0.5) * cell - this.cssW / 2, 0, worldW - this.cssW)
    const targetCamY = worldH <= this.cssH ? (worldH - this.cssH) / 2 : clamp((ry + 0.5) * cell - this.cssH / 2, 0, worldH - this.cssH)
    this.cameraX += (targetCamX - this.cameraX) * 0.18
    this.cameraY += (targetCamY - this.cameraY) * 0.18
    this.cameraZoom += (this.targetZoom - this.cameraZoom) * 0.12
    let camX = this.cameraX
    let camY = this.cameraY

    if (this.shake > 0) {
      camX += (Math.random() - 0.5) * 8
      camY += (Math.random() - 0.5) * 8
    }

    // background
    const g = ctx.createLinearGradient(0, 0, 0, this.cssH)
    g.addColorStop(0, this.theme.bgTop)
    g.addColorStop(1, this.theme.bgBottom)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, this.cssW, this.cssH)

    const startCol = Math.max(0, Math.floor(camX / cell) - 1)
    const endCol = Math.min(this.maze.width - 1, Math.ceil((camX + this.cssW) / cell) + 1)
    const startRow = Math.max(0, Math.floor(camY / cell) - 1)
    const endRow = Math.min(this.maze.height - 1, Math.ceil((camY + this.cssH) / cell) + 1)

    for (let y = startRow; y <= endRow; y++) {
      for (let x = startCol; x <= endCol; x++) {
        const light = this.lightLevel(x, y)
        if (light <= 0) continue
        const sx = x * cell - camX
        const sy = y * cell - camY
        if (this.maze.grid[y][x] === 0) {
          this.drawFloor(sx, sy, cell, (x + y) % 2 === 0)
        } else {
          this.drawWall(sx, sy, cell)
        }
      }
    }

    // entities
    this.drawExit(camX, camY, cell)
    this.drawPortals(camX, camY, cell)
    this.drawTraps(camX, camY, cell)
    this.drawCoins(camX, camY, cell)
    this.drawKeys(camX, camY, cell)
    this.drawPowerups(camX, camY, cell)
    this.drawMovingWalls(camX, camY, cell)

    if (this.hintTimer > 0) this.drawHint(camX, camY, cell)

    // darkness overlay for partially lit cells
    if (this.level.fog && this.mapTimer <= 0) {
      for (let y = startRow; y <= endRow; y++) {
        for (let x = startCol; x <= endCol; x++) {
          const light = this.lightLevel(x, y)
          if (light >= 1) continue
          const sx = x * cell - camX
          const sy = y * cell - camY
          ctx.fillStyle = this.theme.bgBottom
          ctx.globalAlpha = 1 - light
          ctx.fillRect(sx, sy, cell + 1, cell + 1)
          ctx.globalAlpha = 1
        }
      }
    }

    this.drawPlayer(rx * cell - camX, ry * cell - camY, cell)

    if (this.hitFlash > 0) {
      ctx.fillStyle = "#ff3b3b"
      ctx.globalAlpha = Math.min(0.5, this.hitFlash)
      ctx.fillRect(0, 0, this.cssW, this.cssH)
      ctx.globalAlpha = 1
    }
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number) {
    const ctx = this.ctx
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }

  private drawFloor(sx: number, sy: number, cell: number, alt: boolean) {
    const ctx = this.ctx
    ctx.fillStyle = alt ? this.theme.floorAlt : this.theme.floor
    ctx.fillRect(sx, sy, cell + 1, cell + 1)
  }

  private drawWall(sx: number, sy: number, cell: number) {
    const ctx = this.ctx
    const depth = cell * 0.16
    ctx.fillStyle = this.theme.wallSide
    this.roundRect(sx + 1, sy + 1, cell - 2, cell - 2, cell * 0.22)
    ctx.fill()
    ctx.fillStyle = this.theme.wall
    this.roundRect(sx + 1, sy + 1, cell - 2, cell - 2 - depth, cell * 0.22)
    ctx.fill()
    ctx.fillStyle = this.theme.wallTop
    this.roundRect(sx + cell * 0.16, sy + cell * 0.12, cell * 0.68, cell * 0.28, cell * 0.14)
    ctx.fill()
  }

  private cellCenter(x: number, y: number, camX: number, camY: number, cell: number) {
    return { cx: x * cell - camX + cell / 2, cy: y * cell - camY + cell / 2 }
  }

  private lit(x: number, y: number) {
    return this.lightLevel(x, y) >= 1
  }

  private drawExit(camX: number, camY: number, cell: number) {
    const e = this.maze.exit
    if (this.lightLevel(e.x, e.y) <= 0 && !this.visited.has(keyOf(e))) return
    const { cx, cy } = this.cellCenter(e.x, e.y, camX, camY, cell)
    const ctx = this.ctx
    const pulse = 0.5 + 0.5 * Math.sin(this.clock * 4)
    ctx.save()
    ctx.shadowColor = this.theme.exit
    ctx.shadowBlur = 14 + pulse * 12
    ctx.fillStyle = this.theme.exit
    this.roundRect(cx - cell * 0.3, cy - cell * 0.36, cell * 0.6, cell * 0.72, cell * 0.16)
    ctx.fill()
    ctx.restore()
    ctx.fillStyle = "rgba(0,0,0,0.25)"
    ctx.beginPath()
    ctx.arc(cx + cell * 0.14, cy, cell * 0.05, 0, Math.PI * 2)
    ctx.fill()
  }

  private drawCoins(camX: number, camY: number, cell: number) {
    const ctx = this.ctx
    for (const k of this.coinSet) {
      const [x, y] = k.split(",").map(Number)
      if (!this.lit(x, y)) continue
      const { cx, cy } = this.cellCenter(x, y, camX, camY, cell)
      const bob = Math.sin(this.clock * 5 + x + y) * cell * 0.04
      const r = cell * 0.16
      ctx.save()
      ctx.shadowColor = "#ffd166"
      ctx.shadowBlur = 8
      ctx.fillStyle = "#ffd166"
      ctx.beginPath()
      ctx.arc(cx, cy + bob, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      ctx.fillStyle = "#b8860b"
      ctx.font = `bold ${Math.floor(cell * 0.2)}px sans-serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText("$", cx, cy + bob + 1)
    }
  }

  private drawKeys(camX: number, camY: number, cell: number) {
    const ctx = this.ctx
    for (const k of this.keySet) {
      const [x, y] = k.split(",").map(Number)
      if (!this.lit(x, y)) continue
      const { cx, cy } = this.cellCenter(x, y, camX, camY, cell)
      const bob = Math.sin(this.clock * 4 + x) * cell * 0.05
      ctx.save()
      ctx.translate(cx, cy + bob)
      ctx.shadowColor = "#ffe08a"
      ctx.shadowBlur = 10
      ctx.fillStyle = "#ffe08a"
      ctx.beginPath()
      ctx.arc(-cell * 0.1, 0, cell * 0.12, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(-cell * 0.02, -cell * 0.05, cell * 0.24, cell * 0.1)
      ctx.fillRect(cell * 0.16, 0, cell * 0.05, cell * 0.12)
      ctx.restore()
    }
  }

  private drawTraps(camX: number, camY: number, cell: number) {
    const ctx = this.ctx
    // locked doors first
    for (const k of this.doorSet) {
      const [x, y] = k.split(",").map(Number)
      if (this.lightLevel(x, y) <= 0 && !this.visited.has(k)) continue
      const sx = x * cell - camX
      const sy = y * cell - camY
      ctx.fillStyle = "#7a5230"
      this.roundRect(sx + 2, sy + 2, cell - 4, cell - 4, cell * 0.12)
      ctx.fill()
      ctx.strokeStyle = "#4a2f18"
      ctx.lineWidth = 2
      for (let i = 1; i < 3; i++) {
        ctx.beginPath()
        ctx.moveTo(sx + 2, sy + (cell * i) / 3)
        ctx.lineTo(sx + cell - 2, sy + (cell * i) / 3)
        ctx.stroke()
      }
      ctx.fillStyle = "#ffd166"
      ctx.beginPath()
      ctx.arc(sx + cell / 2, sy + cell / 2, cell * 0.08, 0, Math.PI * 2)
      ctx.fill()
    }
    // spike traps
    for (const k of this.trapSet) {
      const [x, y] = k.split(",").map(Number)
      if (!this.lit(x, y)) continue
      const sx = x * cell - camX
      const sy = y * cell - camY
      const dangerous = this.isTrapDangerous(x, y)
      const n = 4
      ctx.fillStyle = dangerous ? "#ff4d4d" : "#8a8f99"
      for (let i = 0; i < n; i++) {
        const bx = sx + ((i + 0.5) * cell) / n
        const baseY = sy + cell - 3
        const h = dangerous ? cell * 0.5 : cell * 0.14
        ctx.beginPath()
        ctx.moveTo(bx - cell * 0.09, baseY)
        ctx.lineTo(bx, baseY - h)
        ctx.lineTo(bx + cell * 0.09, baseY)
        ctx.closePath()
        ctx.fill()
      }
      if (dangerous) {
        ctx.strokeStyle = "rgba(255,80,80,0.6)"
        ctx.lineWidth = 2
        ctx.strokeRect(sx + 2, sy + 2, cell - 4, cell - 4)
      }
    }
  }

  private drawMovingWalls(camX: number, camY: number, cell: number) {
    const ctx = this.ctx
    for (const k of this.movingSet) {
      const [x, y] = k.split(",").map(Number)
      if (this.lightLevel(x, y) <= 0) continue
      const closed = this.isMovingClosed(x, y)
      const sx = x * cell - camX
      const sy = y * cell - camY
      if (closed) {
        ctx.fillStyle = this.theme.wall
        this.roundRect(sx + 2, sy + 2, cell - 4, cell - 4, cell * 0.16)
        ctx.fill()
        ctx.fillStyle = this.theme.accent
        ctx.fillRect(sx + cell * 0.2, sy + cell * 0.46, cell * 0.6, cell * 0.08)
      } else {
        ctx.strokeStyle = this.theme.accent
        ctx.lineWidth = 2
        ctx.setLineDash([4, 4])
        ctx.strokeRect(sx + 3, sy + 3, cell - 6, cell - 6)
        ctx.setLineDash([])
      }
    }
  }

  private drawPortals(camX: number, camY: number, cell: number) {
    const ctx = this.ctx
    for (const [k] of this.portalMap) {
      const [x, y] = k.split(",").map(Number)
      if (!this.lit(x, y)) continue
      const { cx, cy } = this.cellCenter(x, y, camX, camY, cell)
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(this.clock * 2)
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = i % 2 === 0 ? this.theme.accent : this.theme.glow
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(0, 0, cell * (0.1 + i * 0.08), i, i + Math.PI * 1.2)
        ctx.stroke()
      }
      ctx.restore()
    }
  }

  private drawPowerups(camX: number, camY: number, cell: number) {
    const ctx = this.ctx
    const labels: Record<PowerKind, string> = { speed: "⚡", time: "+", map: "◉", shield: "◈" }
    const colors: Record<PowerKind, string> = { speed: "#ffd166", time: "#7be0a0", map: "#4de1ff", shield: "#c79bff" }
    for (const [k, kind] of this.powerMap) {
      const [x, y] = k.split(",").map(Number)
      if (!this.lit(x, y)) continue
      const { cx, cy } = this.cellCenter(x, y, camX, camY, cell)
      const bob = Math.sin(this.clock * 4 + x + y) * cell * 0.05
      ctx.save()
      ctx.shadowColor = colors[kind]
      ctx.shadowBlur = 12
      ctx.fillStyle = colors[kind]
      this.roundRect(cx - cell * 0.2, cy - cell * 0.2 + bob, cell * 0.4, cell * 0.4, cell * 0.1)
      ctx.fill()
      ctx.restore()
      ctx.fillStyle = "#1a1526"
      ctx.font = `bold ${Math.floor(cell * 0.24)}px sans-serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(labels[kind], cx, cy + bob + 1)
    }
  }

  private drawHint(camX: number, camY: number, cell: number) {
    const ctx = this.ctx
    ctx.save()
    ctx.fillStyle = this.theme.glow
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(this.clock * 6)
    for (let i = 0; i < this.hintPath.length; i++) {
      const c = this.hintPath[i]
      const { cx, cy } = this.cellCenter(c.x, c.y, camX, camY, cell)
      ctx.beginPath()
      ctx.arc(cx, cy, cell * 0.09, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  private drawPlayer(sx: number, sy: number, cell: number) {
    const ctx = this.ctx
    const cx = sx + cell / 2
    const cy = sy + cell / 2
    const r = cell * 0.3
    const ch = this.character
    const invuln = this.shield

    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)"
    ctx.beginPath()
    ctx.ellipse(cx, cy + r * 0.9, r * 0.8, r * 0.3, 0, 0, Math.PI * 2)
    ctx.fill()

    // shield aura
    if (invuln) {
      ctx.strokeStyle = "#c79bff"
      ctx.lineWidth = 3
      ctx.globalAlpha = 0.6 + 0.3 * Math.sin(this.clock * 8)
      ctx.beginPath()
      ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // body / outfit
    ctx.fillStyle = ch.outfit
    this.roundRect(cx - r * 0.7, cy - r * 0.1, r * 1.4, r * 1.2, r * 0.4)
    ctx.fill()
    // head
    ctx.fillStyle = ch.body
    ctx.beginPath()
    ctx.arc(cx, cy - r * 0.35, r * 0.62, 0, Math.PI * 2)
    ctx.fill()
    // hat
    ctx.fillStyle = ch.hat
    if (ch.hatStyle === "helmet") {
      ctx.beginPath()
      ctx.arc(cx, cy - r * 0.5, r * 0.7, Math.PI, 0)
      ctx.fill()
    } else if (ch.hatStyle === "crown") {
      ctx.beginPath()
      ctx.moveTo(cx - r * 0.6, cy - r * 0.7)
      ctx.lineTo(cx - r * 0.6, cy - r * 1.2)
      ctx.lineTo(cx - r * 0.2, cy - r * 0.85)
      ctx.lineTo(cx, cy - r * 1.3)
      ctx.lineTo(cx + r * 0.2, cy - r * 0.85)
      ctx.lineTo(cx + r * 0.6, cy - r * 1.2)
      ctx.lineTo(cx + r * 0.6, cy - r * 0.7)
      ctx.closePath()
      ctx.fill()
    } else if (ch.hatStyle === "hood") {
      ctx.beginPath()
      ctx.arc(cx, cy - r * 0.4, r * 0.78, Math.PI * 1.05, Math.PI * 1.95)
      ctx.fill()
    } else {
      // cap
      ctx.beginPath()
      ctx.arc(cx, cy - r * 0.55, r * 0.66, Math.PI, 0)
      ctx.fill()
      ctx.fillRect(cx - r * 0.1, cy - r * 0.6, r * 0.9, r * 0.18)
    }
    // eyes
    ctx.fillStyle = "#2a2233"
    ctx.beginPath()
    ctx.arc(cx - r * 0.22, cy - r * 0.32, r * 0.1, 0, Math.PI * 2)
    ctx.arc(cx + r * 0.22, cy - r * 0.32, r * 0.1, 0, Math.PI * 2)
    ctx.fill()
  }
}
