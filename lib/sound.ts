// Lightweight Web Audio sound engine — no external assets.
// All effects are synthesized so the game works fully offline.

type SfxName = "step" | "coin" | "key" | "door" | "portal" | "power" | "win" | "lose" | "hint" | "click"

class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musicGain: GainNode | null = null
  private musicTimer: number | null = null
  private musicStep = 0
  private _muted = false

  private ensure() {
    if (typeof window === "undefined") return null
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = this._muted ? 0 : 0.9
      this.master.connect(this.ctx.destination)
      this.musicGain = this.ctx.createGain()
      this.musicGain.gain.value = 0.18
      this.musicGain.connect(this.master)
    }
    if (this.ctx.state === "suspended") void this.ctx.resume()
    return this.ctx
  }

  unlock() {
    this.ensure()
  }

  get muted() {
    return this._muted
  }

  setMuted(m: boolean) {
    this._muted = m
    if (this.master) this.master.gain.value = m ? 0 : 0.9
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, when = 0, target?: GainNode) {
    const ctx = this.ensure()
    if (!ctx || !this.master) return
    const t = ctx.currentTime + when
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(g)
    g.connect(target ?? this.master)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }

  play(name: SfxName) {
    if (this._muted) return
    switch (name) {
      case "step":
        this.tone(180 + Math.random() * 40, 0.06, "triangle", 0.12)
        break
      case "coin":
        this.tone(880, 0.08, "square", 0.16)
        this.tone(1320, 0.09, "square", 0.14, 0.06)
        break
      case "key":
        this.tone(660, 0.1, "sawtooth", 0.14)
        this.tone(990, 0.12, "sawtooth", 0.12, 0.08)
        break
      case "door":
        this.tone(200, 0.22, "sawtooth", 0.18)
        break
      case "portal":
        this.tone(500, 0.18, "sine", 0.16)
        this.tone(900, 0.2, "sine", 0.14, 0.05)
        break
      case "power":
        this.tone(600, 0.1, "square", 0.16)
        this.tone(800, 0.1, "square", 0.16, 0.08)
        this.tone(1100, 0.14, "square", 0.16, 0.16)
        break
      case "hint":
        this.tone(1000, 0.12, "sine", 0.16)
        break
      case "click":
        this.tone(420, 0.05, "square", 0.14)
        break
      case "win":
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, "triangle", 0.2, i * 0.12))
        break
      case "lose":
        [400, 320, 240, 160].forEach((f, i) => this.tone(f, 0.24, "sawtooth", 0.18, i * 0.12))
        break
    }
  }

  startMusic() {
    const ctx = this.ensure()
    if (!ctx || this.musicTimer !== null) return
    // Gentle adventurous arpeggio loop.
    const scale = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63]
    const bass = [130.81, 130.81, 174.61, 196.0]
    this.musicStep = 0
    this.musicTimer = window.setInterval(() => {
      if (this._muted) return
      const note = scale[this.musicStep % scale.length]
      this.tone(note, 0.28, "triangle", 0.14, 0, this.musicGain ?? undefined)
      if (this.musicStep % 2 === 0) {
        const b = bass[Math.floor(this.musicStep / 2) % bass.length]
        this.tone(b, 0.4, "sine", 0.18, 0, this.musicGain ?? undefined)
      }
      this.musicStep++
    }, 260)
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer)
      this.musicTimer = null
    }
  }
}

export const sound = new SoundEngine()
