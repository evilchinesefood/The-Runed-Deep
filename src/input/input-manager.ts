import type { GameAction, Direction, Vector2 } from '../core/types';
import { SPELL_BY_ID } from '../data/spells';

export type ActionHandler = (action: GameAction) => void;
export type SpellModeCallback = (spellId: string | null) => void;
export type PathClickCallback = (target: Vector2) => void;

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: 'N', ArrowDown: 'S', ArrowLeft: 'W', ArrowRight: 'E',
  Numpad8: 'N', Numpad9: 'NE', Numpad6: 'E', Numpad3: 'SE',
  Numpad2: 'S', Numpad1: 'SW', Numpad4: 'W', Numpad7: 'NW',
  KeyW: 'N', KeyD: 'E', KeyS: 'S', KeyA: 'W',
};

export class InputManager {
  private handler: ActionHandler | null = null;
  private enabled = true;

  // Spell casting state
  private pendingSpellId: string | null = null;
  private onSpellModeChange: SpellModeCallback | null = null;
  private spellHotkeys: string[] = [];
  private onPathClick: PathClickCallback | null = null;
  private onAutoExplore: (() => void) | null = null;

  constructor() {
    this.setupKeyboard();
    this.setupTouch();
  }

  setHandler(handler: ActionHandler): void {
    this.handler = handler;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.cancelSpellMode();
  }

  setKnownSpells(_spells: string[]): void {
    // kept for API compatibility; hotkeys are now used for number-key casting
  }

  setSpellHotkeys(hotkeys: string[]): void {
    this.spellHotkeys = hotkeys;
  }

  setSpellModeCallback(cb: SpellModeCallback): void {
    this.onSpellModeChange = cb;
  }

  setPathClickCallback(cb: PathClickCallback): void {
    this.onPathClick = cb;
  }

  setAutoExploreCallback(cb: () => void): void {
    this.onAutoExplore = cb;
  }

  isInSpellMode(): boolean {
    return this.pendingSpellId !== null;
  }

  /** Called from UI (spell bar click) to start casting a spell */
  startSpellCast(spellId: string): void {
    if (!this.enabled) return;
    this.enterSpellMode(spellId);
  }

  /**
   * Called when the map is clicked during spell targeting mode.
   * Computes direction from hero to clicked position and casts.
   */
  handleMapClick(heroX: number, heroY: number, worldX: number, worldY: number): void {
    if (!this.enabled) return;

    if (this.pendingSpellId) {
      // Compute direction from hero to clicked tile
      const dx = worldX - heroX;
      const dy = worldY - heroY;
      if (dx === 0 && dy === 0) return;

      const direction = vectorToDirection(dx, dy);
      const spell = SPELL_BY_ID[this.pendingSpellId];

      if (spell?.targeting === 'direction') {
        this.emit({ type: 'castSpell', spellId: this.pendingSpellId, direction });
      } else if (spell?.targeting === 'target') {
        this.emit({ type: 'castSpell', spellId: this.pendingSpellId, direction, target: { x: worldX, y: worldY } });
      }

      this.pendingSpellId = null;
      this.onSpellModeChange?.(null);
      return;
    }

    // Not in spell mode — click-to-move
    const dx = worldX - heroX;
    const dy = worldY - heroY;
    if (dx === 0 && dy === 0) return;

    // Adjacent tile: move directly
    if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
      const direction = vectorToDirection(dx, dy);
      this.emit({ type: 'move', direction });
      return;
    }

    // Distant tile: emit pathfind action (handled by game loop)
    this.onPathClick?.({ x: worldX, y: worldY });
  }

  private cancelSpellMode(): void {
    if (this.pendingSpellId) {
      this.pendingSpellId = null;
      this.onSpellModeChange?.(null);
    }
  }

  private enterSpellMode(spellId: string): void {
    const spell = SPELL_BY_ID[spellId];
    if (!spell) return;

    // Self-cast and 'none' targeting spells cast immediately
    if (spell.targeting === 'self' || spell.targeting === 'none') {
      this.emit({ type: 'castSpell', spellId });
      return;
    }

    // Direction/target spells need a second input
    this.pendingSpellId = spellId;
    this.onSpellModeChange?.(spellId);
  }

  private emit(action: GameAction): void {
    if (this.enabled && this.handler) {
      this.handler(action);
    }
  }

  private setupKeyboard(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      // Prevent Tab default (browser focus) immediately
      if (e.code === 'Tab') e.preventDefault();

      if (!this.enabled) return;

      // If in spell targeting mode, handle direction/escape
      if (this.pendingSpellId) {
        e.preventDefault();

        if (e.code === 'Escape') {
          this.cancelSpellMode();
          return;
        }

        const direction = KEY_TO_DIRECTION[e.code];
        if (direction) {
          const spell = SPELL_BY_ID[this.pendingSpellId];
          if (spell?.targeting === 'direction') {
            this.emit({ type: 'castSpell', spellId: this.pendingSpellId, direction });
          } else if (spell?.targeting === 'target') {
            // For target spells, use direction to pick the nearest monster in that direction
            // (simplified: cast at the direction as a bolt-like target)
            this.emit({ type: 'castSpell', spellId: this.pendingSpellId, direction });
          }
          this.pendingSpellId = null;
          this.onSpellModeChange?.(null);
          return;
        }
        return; // Ignore other keys in spell mode
      }

      // Movement (skip WASD when ctrl is held for Ctrl+S save)
      const direction = KEY_TO_DIRECTION[e.code];
      if (direction && !e.ctrlKey) {
        e.preventDefault();
        this.emit({ type: 'move', direction });
        return;
      }

      // Number keys 1-7: quick cast spell from hotkey slots
      const digitMatch = e.code.match(/^Digit([1-7])$/);
      if (digitMatch && !e.shiftKey && !e.ctrlKey) {
        const idx = parseInt(digitMatch[1]) - 1;
        if (idx < this.spellHotkeys.length) {
          e.preventDefault();
          this.enterSpellMode(this.spellHotkeys[idx]);
          return;
        }
      }

      // Hotkeys
      switch (e.code) {
        case 'KeyZ':
          e.preventDefault();
          this.emit({ type: 'setScreen', screen: 'spells' });
          break;
        case 'KeyM':
          e.preventDefault();
          this.emit({ type: 'setScreen', screen: 'map' });
          break;
        case 'KeyE':
          e.preventDefault();
          this.emit({ type: 'contextAction' });
          break;
        case 'KeyG':
          e.preventDefault();
          this.emit({ type: 'pickupItem' });
          break;
        case 'KeyI':
          e.preventDefault();
          this.emit({ type: 'setScreen', screen: 'inventory' });
          break;
        case 'KeyC':
          e.preventDefault();
          this.emit({ type: 'setScreen', screen: 'character-info' });
          break;
        case 'KeyQ':
          e.preventDefault();
          this.emit({ type: 'rest' });
          break;
        case 'Period':
          if (e.shiftKey) {
            e.preventDefault();
            this.emit({ type: 'useStairs' });
          }
          break;
        case 'Comma':
          if (e.shiftKey) {
            e.preventDefault();
            this.emit({ type: 'useStairs' });
          }
          break;
        case 'Enter':
          e.preventDefault();
          this.emit({ type: 'useStairs' });
          break;
        case 'KeyS':
          if (e.ctrlKey) {
            e.preventDefault();
            this.emit({ type: 'save' });
          }
          break;
        case 'F1':
          e.preventDefault();
          this.emit({ type: 'setScreen', screen: 'help' });
          break;
        case 'F2':
          e.preventDefault();
          this.emit({ type: 'setScreen', screen: 'achievements' as any });
          break;
        case 'Tab':
          e.preventDefault();
          this.onAutoExplore?.();
          break;
        case 'Escape':
          e.preventDefault();
          this.emit({ type: 'setScreen', screen: 'game' });
          break;
      }
    });
  }

  private setupTouch(): void {
    let touchStartX = 0;
    let touchStartY = 0;
    const SWIPE_THRESHOLD = 30;

    document.addEventListener('touchstart', (e: TouchEvent) => {
      if (!this.enabled) return;
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }, { passive: true });

    document.addEventListener('touchend', (e: TouchEvent) => {
      if (!this.enabled) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < SWIPE_THRESHOLD) return;

      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      const direction = angleToDirection(angle);
      if (direction) {
        this.emit({ type: 'move', direction });
      }
    }, { passive: true });
  }
}

function vectorToDirection(dx: number, dy: number): Direction {
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  return angleToDirection(angle);
}

function angleToDirection(angle: number): Direction {
  const a = ((angle % 360) + 360) % 360;
  if (a >= 337.5 || a < 22.5) return 'E';
  if (a >= 22.5 && a < 67.5) return 'SE';
  if (a >= 67.5 && a < 112.5) return 'S';
  if (a >= 112.5 && a < 157.5) return 'SW';
  if (a >= 157.5 && a < 202.5) return 'W';
  if (a >= 202.5 && a < 247.5) return 'NW';
  if (a >= 247.5 && a < 292.5) return 'N';
  return 'NE';
}
