// ============================================================
// Spell Animation System
//
// Plays visual effects on the game map. Animations are queued
// and played sequentially. The game loop waits for animations
// to complete before processing the next action.
// ============================================================

import type { Vector2 } from '../core/types';

const TILE_SIZE = 32;

// ── Animation Types ───────────────────────────────────────

export interface ProjectileAnim {
  type: 'projectile';
  sprite: string;         // CSS class for the projectile
  path: Vector2[];        // world positions to travel through
  speed: number;          // ms per tile
  rotation: number;       // degrees to rotate the sprite (0 = default/east)
}

export interface ExplosionAnim {
  type: 'explosion';
  sprite: string;         // CSS class for the explosion
  center: Vector2;        // world position
  radius: number;         // 0 = single tile, 1 = 3x3
  duration: number;       // ms
}

export interface FlashAnim {
  type: 'flash';
  position: Vector2;      // world position
  color: string;          // CSS color
  duration: number;       // ms
}

export interface PulseAnim {
  type: 'pulse';
  position: Vector2;
  color: string;
  duration: number;
}

export type SpellAnimation = ProjectileAnim | ExplosionAnim | FlashAnim | PulseAnim;

// ── Sprite Mapping ────────────────────────────────────────

export const SPELL_SPRITES: Record<string, string> = {
  'magic-arrow': 'arrows-spell',
  'cold-bolt': 'ice-bolt-spell',
  'lightning-bolt': 'lightnig-bolt-spell',  // typo in original CSS
  'fire-bolt': 'fire-bolt-spell',
  'cold-ball': 'snow-spell',
  'ball-lightning': 'lightnig-bolt-spell',
  'fire-ball': 'fire1-spell',
  'acid-bolt': 'acid-bolt-spell',
};

export const EXPLOSION_SPRITES: Record<string, string> = {
  'cold': 'snow-spell',
  'fire': 'fire2-spell',
  'lightning': 'lightning1-spell',
};

// ── Animation Renderer ────────────────────────────────────

export class AnimationRenderer {
  private mapContainer: HTMLElement;
  private animLayer: HTMLElement;
  private queue: SpellAnimation[][] = [];  // groups of simultaneous animations
  private playing = false;
  private onComplete: (() => void) | null = null;

  // Camera offset — set from outside so animations align with the map
  private cameraX = 0;
  private cameraY = 0;

  constructor(mapContainer: HTMLElement) {
    this.mapContainer = mapContainer;

    this.animLayer = document.createElement('div');
    this.animLayer.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      pointer-events: none;
      z-index: 10;
    `;
    this.mapContainer.appendChild(this.animLayer);
  }

  setCamera(cameraX: number, cameraY: number): void {
    this.cameraX = cameraX;
    this.cameraY = cameraY;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  /**
   * Queue a group of animations to play simultaneously.
   * Multiple groups play sequentially.
   */
  enqueue(anims: SpellAnimation[]): void {
    this.queue.push(anims);
  }

  /**
   * Start playing all queued animations.
   * Returns a promise that resolves when all are done.
   */
  play(): Promise<void> {
    if (this.queue.length === 0) return Promise.resolve();

    this.playing = true;
    return new Promise<void>(resolve => {
      this.onComplete = () => {
        this.playing = false;
        resolve();
      };
      this.playNextGroup();
    });
  }

  private playNextGroup(): void {
    if (this.queue.length === 0) {
      this.onComplete?.();
      return;
    }

    const group = this.queue.shift()!;
    const promises = group.map(anim => this.playOne(anim));
    Promise.all(promises).then(() => this.playNextGroup());
  }

  private playOne(anim: SpellAnimation): Promise<void> {
    switch (anim.type) {
      case 'projectile': return this.playProjectile(anim);
      case 'explosion': return this.playExplosion(anim);
      case 'flash': return this.playFlash(anim);
      case 'pulse': return this.playPulse(anim);
    }
  }

  // ── Projectile ────────────────────────────────────────

  private playProjectile(anim: ProjectileAnim): Promise<void> {
    return new Promise(resolve => {
      if (anim.path.length === 0) { resolve(); return; }

      const el = this.createSpriteEl(anim.sprite);
      if (anim.rotation !== 0) {
        el.style.transform = `rotate(${anim.rotation}deg)`;
      }
      this.animLayer.appendChild(el);

      let step = 0;
      const advance = () => {
        if (step >= anim.path.length) {
          el.remove();
          resolve();
          return;
        }

        const pos = anim.path[step];
        const screenX = (pos.x - this.cameraX) * TILE_SIZE;
        const screenY = (pos.y - this.cameraY) * TILE_SIZE;
        el.style.left = `${screenX}px`;
        el.style.top = `${screenY}px`;
        el.style.display = 'block';

        step++;
        setTimeout(advance, anim.speed);
      };

      advance();
    });
  }

  // ── Explosion ─────────────────────────────────────────

  private playExplosion(anim: ExplosionAnim): Promise<void> {
    return new Promise(resolve => {
      const elements: HTMLElement[] = [];

      for (let dy = -anim.radius; dy <= anim.radius; dy++) {
        for (let dx = -anim.radius; dx <= anim.radius; dx++) {
          const wx = anim.center.x + dx;
          const wy = anim.center.y + dy;
          const screenX = (wx - this.cameraX) * TILE_SIZE;
          const screenY = (wy - this.cameraY) * TILE_SIZE;

          const el = this.createSpriteEl(anim.sprite);
          el.style.left = `${screenX}px`;
          el.style.top = `${screenY}px`;
          el.style.display = 'block';

          // Center tile is full opacity, edges are dimmer
          const dist = Math.abs(dx) + Math.abs(dy);
          el.style.opacity = dist === 0 ? '1' : '0.6';

          this.animLayer.appendChild(el);
          elements.push(el);
        }
      }

      // Fade out
      setTimeout(() => {
        for (const el of elements) {
          el.style.transition = 'opacity 150ms';
          el.style.opacity = '0';
        }
        setTimeout(() => {
          for (const el of elements) el.remove();
          resolve();
        }, 150);
      }, anim.duration);
    });
  }

  // ── Flash (damage hit) ────────────────────────────────

  private playFlash(anim: FlashAnim): Promise<void> {
    return new Promise(resolve => {
      const screenX = (anim.position.x - this.cameraX) * TILE_SIZE;
      const screenY = (anim.position.y - this.cameraY) * TILE_SIZE;

      const el = document.createElement('div');
      el.style.cssText = `
        position: absolute;
        left: ${screenX}px; top: ${screenY}px;
        width: ${TILE_SIZE}px; height: ${TILE_SIZE}px;
        background: ${anim.color};
        opacity: 0.7;
        z-index: 11;
      `;
      this.animLayer.appendChild(el);

      setTimeout(() => {
        el.style.transition = 'opacity 100ms';
        el.style.opacity = '0';
        setTimeout(() => { el.remove(); resolve(); }, 100);
      }, anim.duration);
    });
  }

  // ── Pulse (heal/buff) ─────────────────────────────────

  private playPulse(anim: PulseAnim): Promise<void> {
    return new Promise(resolve => {
      const screenX = (anim.position.x - this.cameraX) * TILE_SIZE;
      const screenY = (anim.position.y - this.cameraY) * TILE_SIZE;

      const el = document.createElement('div');
      el.style.cssText = `
        position: absolute;
        left: ${screenX - 8}px; top: ${screenY - 8}px;
        width: ${TILE_SIZE + 16}px; height: ${TILE_SIZE + 16}px;
        border: 3px solid ${anim.color};
        border-radius: 50%;
        opacity: 0.8;
        z-index: 11;
        box-sizing: border-box;
      `;
      this.animLayer.appendChild(el);

      // Expand and fade
      requestAnimationFrame(() => {
        el.style.transition = `all ${anim.duration}ms ease-out`;
        el.style.transform = 'scale(1.5)';
        el.style.opacity = '0';
      });

      setTimeout(() => { el.remove(); resolve(); }, anim.duration);
    });
  }

  // ── Helpers ───────────────────────────────────────────

  private createSpriteEl(spriteClass: string): HTMLElement {
    const el = document.createElement('div');
    el.className = spriteClass;
    el.style.cssText = `
      position: absolute;
      width: ${TILE_SIZE}px;
      height: ${TILE_SIZE}px;
      display: none;
      z-index: 10;
    `;
    return el;
  }

  /** Remove all animation elements */
  clear(): void {
    this.animLayer.replaceChildren();
    this.queue = [];
    this.playing = false;
  }
}

// ============================================================
// Animation Builders — create animation sequences for spells
// ============================================================

import type { Direction } from '../core/types';
import { getDirectionVector } from '../core/actions';

/**
 * Direction → rotation in degrees.
 * Sprites are drawn pointing right (East) by default.
 */
const DIRECTION_ROTATION: Record<Direction, number> = {
  E: 0,
  SE: 45,
  S: 90,
  SW: 135,
  W: 180,
  NW: 225,
  N: 270,
  NE: 315,
};

import type { Floor } from '../core/types';

/**
 * Build a projectile animation along a direction from origin.
 * Stops at walls if floor data is provided.
 */
export function buildBoltAnimation(
  spellId: string,
  origin: Vector2,
  direction: Direction,
  maxRange: number,
  hitPos?: Vector2,
  floor?: Floor,
): SpellAnimation[] {
  const sprite = SPELL_SPRITES[spellId] ?? 'arrows-spell';
  const delta = getDirectionVector(direction);
  const rotation = DIRECTION_ROTATION[direction];

  const path: Vector2[] = [];
  let x = origin.x;
  let y = origin.y;

  for (let i = 0; i < maxRange; i++) {
    x += delta.x;
    y += delta.y;

    // Stop before going out of bounds or into a wall
    if (floor) {
      if (x < 0 || x >= floor.width || y < 0 || y >= floor.height) break;
      if (!floor.tiles[y][x].walkable && floor.tiles[y][x].type === 'wall') break;
    }

    path.push({ x, y });
    if (hitPos && x === hitPos.x && y === hitPos.y) break;
  }

  const anims: SpellAnimation[] = [
    { type: 'projectile', sprite, path, speed: 40, rotation },
  ];

  // Flash at hit position
  if (hitPos) {
    anims.push({
      type: 'flash',
      position: hitPos,
      color: getElementColor(spellId),
      duration: 120,
    });
  }

  return anims;
}

/**
 * Build an explosion animation at a target position.
 */
export function buildBallAnimation(
  spellId: string,
  origin: Vector2,
  direction: Direction,
  target: Vector2,
  floor?: Floor,
): SpellAnimation[] {
  const projectileSprite = SPELL_SPRITES[spellId] ?? 'fire1-spell';
  const element = getSpellElement(spellId);
  const explosionSprite = EXPLOSION_SPRITES[element] ?? 'fire2-spell';

  const delta = getDirectionVector(direction);
  const rotation = DIRECTION_ROTATION[direction];
  const path: Vector2[] = [];
  let x = origin.x;
  let y = origin.y;

  // Trace path to target, stop at walls
  for (let i = 0; i < 15; i++) {
    x += delta.x;
    y += delta.y;

    if (floor) {
      if (x < 0 || x >= floor.width || y < 0 || y >= floor.height) break;
      if (!floor.tiles[y][x].walkable && floor.tiles[y][x].type === 'wall') break;
    }

    path.push({ x, y });
    if (x === target.x && y === target.y) break;
  }

  return [
    { type: 'projectile', sprite: projectileSprite, path, speed: 40, rotation },
    { type: 'explosion', sprite: explosionSprite, center: target, radius: 1, duration: 250 },
  ];
}

/**
 * Build a heal pulse animation on the hero.
 */
export function buildHealAnimation(position: Vector2): SpellAnimation[] {
  return [
    { type: 'pulse', position, color: '#4f4', duration: 400 },
  ];
}

/**
 * Build a shield/buff animation on the hero.
 */
export function buildBuffAnimation(position: Vector2, color: string): SpellAnimation[] {
  return [
    { type: 'pulse', position, color, duration: 350 },
  ];
}

/**
 * Build a teleport flash at origin and destination.
 */
export function buildTeleportAnimation(from: Vector2, to: Vector2): SpellAnimation[] {
  return [
    { type: 'flash', position: from, color: '#88f', duration: 150 },
    { type: 'flash', position: to, color: '#88f', duration: 150 },
  ];
}

/**
 * Build a detection pulse expanding from the hero.
 */
export function buildDetectAnimation(position: Vector2, color: string): SpellAnimation[] {
  return [
    { type: 'pulse', position, color, duration: 500 },
  ];
}

// ── Helpers ────────────────────────────────────────────

function getElementColor(spellId: string): string {
  if (spellId.includes('cold') || spellId.includes('ice')) return '#4af';
  if (spellId.includes('fire')) return '#f64';
  if (spellId.includes('lightning')) return '#ff4';
  if (spellId.includes('acid')) return '#4f4';
  return '#fff'; // physical/magic arrow
}

function getSpellElement(spellId: string): string {
  if (spellId.includes('cold')) return 'cold';
  if (spellId.includes('fire')) return 'fire';
  if (spellId.includes('lightning')) return 'lightning';
  return 'fire';
}
