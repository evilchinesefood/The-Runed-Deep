import type { GameAction } from '../core/types';

export type TouchActionHandler = (action: GameAction) => void;

function makeBtn(content: string, size: number, onClick: () => void): HTMLElement {
  const btn = document.createElement('div');
  btn.textContent = content;
  btn.style.cssText = `
    width:${size}px;height:${size}px;
    display:flex;align-items:center;justify-content:center;
    background:#333;color:#aaa;
    border:1px solid #555;border-radius:6px;
    font-weight:bold;user-select:none;touch-action:none;
    cursor:pointer;transition:background 0.08s,transform 0.08s;
  `;
  const press = () => { btn.style.background = '#555'; btn.style.transform = 'scale(0.92)'; };
  const release = () => { btn.style.background = '#333'; btn.style.transform = ''; };
  btn.addEventListener('touchstart', (e) => { e.preventDefault(); press(); onClick(); });
  btn.addEventListener('touchend', release);
  btn.addEventListener('touchcancel', release);
  btn.addEventListener('mousedown', (e) => { e.preventDefault(); press(); onClick(); });
  btn.addEventListener('mouseup', release);
  btn.addEventListener('mouseleave', release);
  return btn;
}

export class TouchControls {
  private container: HTMLElement;
  private dpad: HTMLElement;
  private actionBar: HTMLElement;
  private handler: TouchActionHandler | null = null;
  private visible = false;

  constructor() {
    // D-pad with arrow symbols
    this.dpad = document.createElement('div');
    this.dpad.style.cssText = `
      position:fixed;bottom:20px;left:20px;z-index:1000;
      display:grid;grid-template-columns:48px 48px 48px;grid-template-rows:48px 48px 48px;
      gap:2px;touch-action:none;
    `;

    const dirs: [string, string, import('../core/types').Direction | null][] = [
      ['1/1', '\u2196', 'NW'], ['1/2', '\u2191', 'N'],  ['1/3', '\u2197', 'NE'],
      ['2/1', '\u2190', 'W'],  ['2/2', '\u23F8', null],  ['2/3', '\u2192', 'E'],
      ['3/1', '\u2199', 'SW'], ['3/2', '\u2193', 'S'],   ['3/3', '\u2198', 'SE'],
    ];

    for (const [pos, arrow, dir] of dirs) {
      const [row, col] = pos.split('/');
      const isCenter = dir === null;
      const btn = makeBtn(arrow, 48, () => {
        if (isCenter) this.handler?.({ type: 'rest' });
        else this.handler?.({ type: 'move', direction: dir! });
      });
      btn.style.gridRow = row;
      btn.style.gridColumn = col;
      btn.style.fontSize = isCenter ? '14px' : '18px';
      if (isCenter) { btn.style.background = '#222'; btn.style.color = '#555'; }
      this.dpad.appendChild(btn);
    }

    // Action buttons with labels
    this.actionBar = document.createElement('div');
    this.actionBar.style.cssText = `
      position:fixed;bottom:20px;right:20px;z-index:1000;
      display:flex;flex-direction:column;gap:4px;touch-action:none;
    `;

    const actions: [string, string, GameAction][] = [
      ['G', 'Pickup', { type: 'pickupItem' }],
      ['I', 'Items', { type: 'setScreen', screen: 'inventory' }],
      ['Z', 'Spells', { type: 'setScreen', screen: 'spells' }],
      ['M', 'Map', { type: 'setScreen', screen: 'map' }],
      ['S', 'Search', { type: 'search' }],
      ['>', 'Stairs', { type: 'useStairs' }],
    ];

    for (const [key, label, action] of actions) {
      const row = document.createElement('div');
      row.style.cssText = `display:flex;align-items:center;gap:4px;`;

      const btn = makeBtn(key, 40, () => this.handler?.(action));
      btn.style.fontSize = '13px';
      row.appendChild(btn);

      const lbl = document.createElement('div');
      lbl.textContent = label;
      lbl.style.cssText = 'color:#666;font-size:10px;font-family:sans-serif;width:40px;';
      row.appendChild(lbl);

      this.actionBar.appendChild(row);
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
