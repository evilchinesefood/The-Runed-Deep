// ============================================================
// Sound system — Web Audio API synthesized effects
// No external audio files needed
// ============================================================

let ctx: AudioContext | null = null;
let enabled = true;
let volume = 0.3;

function getCtx(): AudioContext | null {
  if (!enabled) return null;
  if (!ctx) {
    try { ctx = new AudioContext(); } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function gain(c: AudioContext, v: number): GainNode {
  const g = c.createGain();
  g.gain.value = v * volume;
  g.connect(c.destination);
  return g;
}

// ── Tone generators ─────────────────────────────────────

function playTone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.3, fadeOut = true): void {
  const c = getCtx();
  if (!c) return;
  const g = gain(c, vol);
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.connect(g);
  o.start(c.currentTime);
  if (fadeOut) g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  o.stop(c.currentTime + dur);
}

function playNoise(dur: number, vol = 0.15): void {
  const c = getCtx();
  if (!c) return;
  const bufferSize = Math.floor(c.sampleRate * dur);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const g = gain(c, vol);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  src.connect(g);
  src.start(c.currentTime);
}

function playSequence(notes: [number, number][], type: OscillatorType = 'square', vol = 0.2): void {
  const c = getCtx();
  if (!c) return;
  let t = c.currentTime;
  for (const [freq, dur] of notes) {
    const g = gain(c, vol);
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g);
    o.start(t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.stop(t + dur);
    t += dur * 0.8;
  }
}

// ── Sound effects ───────────────────────────────────────

export const Sound = {
  /** Player melee hit on monster */
  meleeHit() {
    playNoise(0.08, 0.25);
    playTone(200, 0.1, 'sawtooth', 0.15);
  },

  /** Player misses */
  meleeMiss() {
    playTone(150, 0.15, 'sine', 0.08);
  },

  /** Monster hits player */
  playerHurt() {
    playTone(180, 0.12, 'sawtooth', 0.2);
    playNoise(0.1, 0.15);
  },

  /** Monster dies */
  monsterDeath() {
    playTone(300, 0.08, 'square', 0.15);
    playTone(200, 0.15, 'square', 0.12);
    playNoise(0.12, 0.1);
  },

  /** Player dies */
  playerDeath() {
    playSequence([[300, 0.2], [250, 0.2], [200, 0.3], [150, 0.5]], 'sawtooth', 0.25);
  },

  /** Level up */
  levelUp() {
    playSequence([[440, 0.1], [554, 0.1], [659, 0.1], [880, 0.25]], 'square', 0.2);
  },

  /** Spell cast (bolt) */
  spellBolt() {
    playTone(600, 0.05, 'sine', 0.15);
    playTone(400, 0.15, 'sawtooth', 0.1);
  },

  /** Spell cast (ball/AoE) */
  spellBall() {
    playNoise(0.2, 0.2);
    playTone(300, 0.3, 'sawtooth', 0.15);
  },

  /** Healing spell */
  spellHeal() {
    playSequence([[523, 0.08], [659, 0.08], [784, 0.15]], 'sine', 0.15);
  },

  /** Buff spell (shield, resist) */
  spellBuff() {
    playTone(440, 0.15, 'sine', 0.12);
    playTone(660, 0.2, 'sine', 0.1);
  },

  /** Item pickup */
  pickup() {
    playTone(800, 0.05, 'square', 0.1);
    playTone(1000, 0.08, 'square', 0.08);
  },

  /** Gold pickup */
  goldPickup() {
    playSequence([[1200, 0.04], [1500, 0.04], [1800, 0.06]], 'sine', 0.12);
  },

  /** Door open */
  doorOpen() {
    playNoise(0.15, 0.1);
    playTone(150, 0.1, 'triangle', 0.08);
  },

  /** Stairs transition */
  stairs() {
    playSequence([[300, 0.1], [350, 0.1], [400, 0.15]], 'triangle', 0.12);
  },

  /** Trap triggered */
  trap() {
    playNoise(0.15, 0.25);
    playTone(100, 0.2, 'sawtooth', 0.2);
  },

  /** Equip item */
  equip() {
    playTone(500, 0.06, 'square', 0.08);
    playNoise(0.05, 0.06);
  },

  /** UI button click */
  uiClick() {
    playTone(800, 0.03, 'square', 0.05);
  },

  /** Search found something */
  searchFound() {
    playSequence([[600, 0.06], [800, 0.08]], 'square', 0.1);
  },

  /** Victory fanfare */
  victory() {
    playSequence([
      [523, 0.15], [659, 0.15], [784, 0.15],
      [1047, 0.3], [784, 0.1], [1047, 0.4],
    ], 'square', 0.2);
  },

  /** Toggle sound on/off */
  toggle() {
    enabled = !enabled;
    return enabled;
  },

  /** Check if sound is enabled */
  isEnabled() { return enabled; },

  /** Set volume (0-1) */
  setVolume(v: number) { volume = Math.max(0, Math.min(1, v)); },
};
