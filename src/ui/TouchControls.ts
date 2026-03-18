import type { GameAction } from '../core/types';

export type TouchActionHandler = (action: GameAction) => void;

export class TouchControls {
  private container: HTMLElement;
  private dpad: HTMLElement;
  private actionBar: HTMLElement;
  private handler: TouchActionHandler | null = null;
  private visible = false;

  constructor() {
    this.dpad = document.createElement('div');
    this.dpad.style.cssText = `
      position:fixed;bottom:20px;left:20px;z-index:1000;
      display:grid;grid-template-columns:48px 48px 48px;grid-template-rows:48px 48px 48px;
      gap:2px;touch-action:none;
    `;

    const dirs: [string, string, import('../core/types').Direction][] = [
      ['1/1', 'NW', 'NW'], ['1/2', 'N', 'N'],   ['1/3', 'NE', 'NE'],
      ['2/1', 'W', 'W'],   ['2/2', '·', 'N'],    ['2/3', 'E', 'E'],
      ['3/1', 'SW', 'SW'], ['3/2', 'S', 'S'],     ['3/3', 'SE', 'SE'],
    ];

    for (const [pos, label, dir] of dirs) {
      const [row, col] = pos.split('/');
      const btn = document.createElement('div');
      const isCenter = label === '·';
      btn.textContent = label;
      btn.style.cssText = `
        grid-row:${row};grid-column:${col};
        width:48px;height:48px;
        display:flex;align-items:center;justify-content:center;
        background:${isCenter ? '#222' : '#333'};
        color:${isCenter ? '#555' : '#aaa'};
        border:1px solid #555;border-radius:6px;
        font-size:${isCenter ? '16px' : '11px'};font-weight:bold;
        user-select:none;touch-action:none;
      `;
      if (!isCenter) {
        btn.addEventListener('touchstart', (e) => {
          e.preventDefault();
          this.handler?.({ type: 'move', direction: dir });
        });
      } else {
        btn.addEventListener('touchstart', (e) => {
          e.preventDefault();
          this.handler?.({ type: 'rest' });
        });
      }
      this.dpad.appendChild(btn);
    }

    this.actionBar = document.createElement('div');
    this.actionBar.style.cssText = `
      position:fixed;bottom:20px;right:20px;z-index:1000;
      display:flex;flex-direction:column;gap:6px;touch-action:none;
    `;

    const actions: [string, GameAction][] = [
      ['G', { type: 'pickupItem' }],
      ['I', { type: 'setScreen', screen: 'inventory' }],
      ['Z', { type: 'setScreen', screen: 'spells' }],
      ['M', { type: 'setScreen', screen: 'map' }],
      ['S', { type: 'search' }],
      ['>', { type: 'useStairs' }],
    ];

    for (const [label, action] of actions) {
      const btn = document.createElement('div');
      btn.textContent = label;
      btn.style.cssText = `
        width:44px;height:44px;
        display:flex;align-items:center;justify-content:center;
        background:#333;color:#aaa;
        border:1px solid #555;border-radius:6px;
        font-size:14px;font-weight:bold;
        user-select:none;touch-action:none;
      `;
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.handler?.(action);
      });
      this.actionBar.appendChild(btn);
    }

    this.container = document.createElement('div');
    this.container.id = 'touch-controls';
    this.container.appendChild(this.dpad);
    this.container.appendChild(this.actionBar);
  }

  setHandler(handler: TouchActionHandler): void {
    this.handler = handler;
  }

  show(): void {
    if (!this.visible) {
      document.body.appendChild(this.container);
      this.visible = true;
    }
  }

  hide(): void {
    if (this.visible) {
      this.container.remove();
      this.visible = false;
    }
  }

  static isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }
}
