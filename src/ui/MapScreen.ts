import type { GameState } from '../core/types';
import { createScreen, createTitleBar, el } from './Theme';

const CELL = 12; // pixels per tile on minimap

const TILE_COLORS: Record<string, string> = {
  floor: '#555',
  wall: '#888',
  'door-closed': '#a86',
  'door-open': '#a86',
  'door-locked': '#a64',
  'door-secret': '#888', // looks like wall until found
  'stairs-up': '#48f',
  'stairs-down': '#48f',
  trap: '#555',
  grass: '#383',
  path: '#665',
  building: '#a86',
  water: '#338',
  rock: '#555',
};

export function createMapScreen(
  state: GameState,
  onClose: () => void,
): HTMLElement & { cleanup: () => void } {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];

  const screen = createScreen();
  screen.style.minHeight = '100vh';

  screen.appendChild(createTitleBar(`Floor ${state.currentFloor + 1} Map`, () => { cleanup(); onClose(); }));

  if (!floor) {
    screen.appendChild(el('div', { color: '#888' }, 'No map data available.'));
    const cleanup = () => {};
    (screen as HTMLElement & { cleanup: () => void }).cleanup = cleanup;
    return screen as HTMLElement & { cleanup: () => void };
  }

  // Canvas for the map
  const canvas = document.createElement('canvas');
  canvas.width = floor.width * CELL;
  canvas.height = floor.height * CELL;
  canvas.style.cssText = `border:1px solid #333;image-rendering:pixelated;max-width:100%;`;
  screen.appendChild(canvas);

  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw tiles
  for (let y = 0; y < floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      if (!floor.explored[y][x]) continue;

      const tile = floor.tiles[y][x];
      const isLit = floor.lit[y][x];

      let color = TILE_COLORS[tile.type] ?? '#333';

      // Lit floors are blue
      if (tile.type === 'floor' && isLit) color = '#447';

      // Revealed traps
      if (tile.type === 'trap' && tile.trapRevealed) color = '#f80';

      // Dimmed if only explored (not visible or lit)
      const visible = floor.visible[y][x];
      if (!visible && !isLit) {
        ctx.globalAlpha = 0.4;
      } else {
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = color;
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
  }

  // Draw items
  ctx.globalAlpha = 1;
  for (const placed of floor.items) {
    if (!floor.explored[placed.position.y]?.[placed.position.x]) continue;
    ctx.fillStyle = '#fc4';
    ctx.fillRect(placed.position.x * CELL + 1, placed.position.y * CELL + 1, CELL - 2, CELL - 2);
  }

  // Draw monsters (only if visible or lit)
  for (const m of floor.monsters) {
    const vis = floor.visible[m.position.y]?.[m.position.x] || floor.lit[m.position.y]?.[m.position.x];
    if (!vis) continue;
    ctx.fillStyle = '#f44';
    ctx.fillRect(m.position.x * CELL + 1, m.position.y * CELL + 1, CELL - 2, CELL - 2);
  }

  // Draw hero
  ctx.fillStyle = '#4f4';
  const hx = state.hero.position.x;
  const hy = state.hero.position.y;
  ctx.fillRect(hx * CELL, hy * CELL, CELL, CELL);
  // Hero marker border
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.strokeRect(hx * CELL, hy * CELL, CELL, CELL);

  // Legend
  const legend = el('div', {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px 16px',
    marginTop: '8px',
    fontSize: '11px',
    color: '#888',
    width: '100%',
  });
  const legendItems: [string, string][] = [
    ['#4f4', 'You'],
    ['#48f', 'Stairs'],
    ['#555', 'Floor'],
    ['#888', 'Wall'],
    ['#447', 'Lit'],
    ['#a86', 'Door'],
    ['#f44', 'Monster'],
    ['#fc4', 'Item'],
    ['#f80', 'Trap'],
  ];
  for (const [color, label] of legendItems) {
    const item = el('span', { display: 'flex', alignItems: 'center', gap: '3px' });
    const dot = el('span', { width: '8px', height: '8px', background: color, display: 'inline-block' });
    item.appendChild(dot);
    item.appendChild(document.createTextNode(label));
    legend.appendChild(item);
  }
  screen.appendChild(legend);

  // Keyboard
  const keyHandler = (e: KeyboardEvent) => {
    if (e.code === 'Escape' || e.code === 'KeyM') {
      e.preventDefault();
      cleanup();
      onClose();
    }
  };
  document.addEventListener('keydown', keyHandler);
  const cleanup = () => { document.removeEventListener('keydown', keyHandler); };
  (screen as HTMLElement & { cleanup: () => void }).cleanup = cleanup;
  return screen as HTMLElement & { cleanup: () => void };
}
