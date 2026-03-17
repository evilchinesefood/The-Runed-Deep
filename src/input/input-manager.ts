import type { GameAction, Direction } from '../core/types';

export type ActionHandler = (action: GameAction) => void;

const KEY_TO_DIRECTION: Record<string, Direction> = {
  // Arrow keys
  ArrowUp: 'N',
  ArrowDown: 'S',
  ArrowLeft: 'W',
  ArrowRight: 'E',
  // Numpad
  Numpad8: 'N',
  Numpad9: 'NE',
  Numpad6: 'E',
  Numpad3: 'SE',
  Numpad2: 'S',
  Numpad1: 'SW',
  Numpad4: 'W',
  Numpad7: 'NW',
  // Vim-style
  KeyK: 'N',
  KeyL: 'E',
  KeyJ: 'S',
  KeyH: 'W',
  KeyY: 'NW',
  KeyU: 'NE',
  KeyB: 'SW',
  KeyN: 'SE',
};

export class InputManager {
  private handler: ActionHandler | null = null;
  private enabled = true;

  constructor() {
    this.setupKeyboard();
    this.setupTouch();
  }

  setHandler(handler: ActionHandler): void {
    this.handler = handler;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private emit(action: GameAction): void {
    if (this.enabled && this.handler) {
      this.handler(action);
    }
  }

  private setupKeyboard(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!this.enabled) return;

      // Movement
      const direction = KEY_TO_DIRECTION[e.code];
      if (direction) {
        e.preventDefault();
        this.emit({ type: 'move', direction });
        return;
      }

      // Hotkeys
      switch (e.code) {
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
            // > key (Shift+Period) — go down stairs
            e.preventDefault();
            this.emit({ type: 'useStairs' });
          } else {
            e.preventDefault();
            this.emit({ type: 'rest' });
          }
          break;
        case 'Comma':
          if (e.shiftKey) {
            // < key (Shift+Comma) — go up stairs
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

      // Convert swipe to 8-directional movement
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      const direction = angleToDirection(angle);
      if (direction) {
        this.emit({ type: 'move', direction });
      }
    }, { passive: true });
  }
}

function angleToDirection(angle: number): Direction {
  // Normalize angle to 0-360
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
