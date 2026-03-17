import type { GameAction, Direction } from '../core/types';
import { SPELL_BY_ID } from '../data/spells';

export type ActionHandler = (action: GameAction) => void;
export type SpellModeCallback = (spellId: string | null) => void;

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: 'N', ArrowDown: 'S', ArrowLeft: 'W', ArrowRight: 'E',
  Numpad8: 'N', Numpad9: 'NE', Numpad6: 'E', Numpad3: 'SE',
  Numpad2: 'S', Numpad1: 'SW', Numpad4: 'W', Numpad7: 'NW',
  KeyK: 'N', KeyL: 'E', KeyJ: 'S', KeyH: 'W',
  KeyY: 'NW', KeyU: 'NE', KeyB: 'SW', KeyN: 'SE',
};

export class InputManager {
  private handler: ActionHandler | null = null;
  private enabled = true;

  // Spell casting state
  private pendingSpellId: string | null = null;
  private onSpellModeChange: SpellModeCallback | null = null;
  // Known spells reference (set from outside so we can map number keys)
  private knownSpells: string[] = [];

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

  setKnownSpells(spells: string[]): void {
    this.knownSpells = spells;
  }

  setSpellModeCallback(cb: SpellModeCallback): void {
    this.onSpellModeChange = cb;
  }

  isInSpellMode(): boolean {
    return this.pendingSpellId !== null;
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

      // Movement
      const direction = KEY_TO_DIRECTION[e.code];
      if (direction) {
        e.preventDefault();
        this.emit({ type: 'move', direction });
        return;
      }

      // Number keys 1-9: quick cast spell from known spells list
      const digitMatch = e.code.match(/^Digit([1-9])$/);
      if (digitMatch && !e.shiftKey && !e.ctrlKey) {
        const idx = parseInt(digitMatch[1]) - 1;
        if (idx < this.knownSpells.length) {
          e.preventDefault();
          this.enterSpellMode(this.knownSpells[idx]);
          return;
        }
      }

      // Hotkeys
      switch (e.code) {
        case 'KeyZ':
          // Open spell list (handled by UI, emits setScreen or similar)
          e.preventDefault();
          // For now, same as number keys but shows a message
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
        case 'Period':
          if (e.shiftKey) {
            e.preventDefault();
            this.emit({ type: 'useStairs' });
          } else {
            e.preventDefault();
            this.emit({ type: 'rest' });
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
          } else {
            e.preventDefault();
            this.emit({ type: 'search' });
          }
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
