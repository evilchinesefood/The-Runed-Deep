// ============================================================
// Town map generation — fixed 25x20 layout
// ============================================================

import type { Floor, Tile, Vector2 } from '../../core/types';

const W = 25;
const H = 20;

const WALL_TILE: Tile = { type: 'wall', sprite: 'town-wall', walkable: false, transparent: false };
const GRASS_TILE: Tile = { type: 'grass', sprite: 'grass', walkable: true, transparent: true };
const PATH_TILE: Tile = { type: 'path', sprite: 'path', walkable: true, transparent: true };

function makeTile(t: Partial<Tile> & Pick<Tile, 'type' | 'sprite' | 'walkable' | 'transparent'>): Tile {
  return { ...t };
}

function emptyGrid(): Tile[][] {
  return Array.from({ length: H }, () => Array.from({ length: W }, () => ({ ...GRASS_TILE })));
}

function placeBorder(tiles: Tile[][]): void {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (x === 0 || x === W - 1 || y === 0 || y === H - 1) {
        tiles[y][x] = { ...WALL_TILE };
      }
    }
  }
}

function setPath(tiles: Tile[][], x: number, y: number): void {
  if (x <= 0 || x >= W - 1 || y <= 0 || y >= H - 1) return;
  if (tiles[y][x].type === 'building' || tiles[y][x].type === 'stairs-down') return;
  tiles[y][x] = { ...PATH_TILE };
}

function drawHLine(tiles: Tile[][], x1: number, x2: number, y: number): void {
  const [a, b] = x1 < x2 ? [x1, x2] : [x2, x1];
  for (let x = a; x <= b; x++) setPath(tiles, x, y);
}

function drawVLine(tiles: Tile[][], x: number, y1: number, y2: number): void {
  const [a, b] = y1 < y2 ? [y1, y2] : [y2, y1];
  for (let y = a; y <= b; y++) setPath(tiles, x, y);
}

interface BuildingPlacement {
  id: string;
  x: number;
  y: number;
  sprite: string;
}

const BUILDINGS: BuildingPlacement[] = [
  { id: 'temple',        x: 12, y: 3,  sprite: 'temple' },
  { id: 'weapon-shop',   x: 4,  y: 4,  sprite: 'house-right' },
  { id: 'armor-shop',    x: 20, y: 4,  sprite: 'house-right' },
  { id: 'general-store', x: 3,  y: 9,  sprite: 'hut' },
  { id: 'magic-shop',    x: 21, y: 9,  sprite: 'villa1' },
  { id: 'inn',           x: 17, y: 10, sprite: 'hut-fire' },
  { id: 'bank',          x: 12, y: 14, sprite: 'villa2' },
  { id: 'sage',          x: 20, y: 14, sprite: 'hut' },
  { id: 'junk-store',    x: 4,  y: 14, sprite: 'junk-yard' },
];

const DUNGEON_ENTRANCE = { x: 12, y: 17, sprite: 'mine-entrance' };
const PLAYER_START: Vector2 = { x: 12, y: 10 };

function placeBuildings(tiles: Tile[][]): void {
  for (const b of BUILDINGS) {
    tiles[b.y][b.x] = makeTile({ type: 'building', sprite: b.sprite, walkable: true, transparent: true, buildingId: b.id });
  }
  tiles[DUNGEON_ENTRANCE.y][DUNGEON_ENTRANCE.x] = makeTile({ type: 'stairs-down', sprite: DUNGEON_ENTRANCE.sprite, walkable: true, transparent: true });
}

// Draw main vertical spine and horizontal spurs to each building
function drawPaths(tiles: Tile[][]): void {
  const cx = 12;

  // Main north-south spine (y:3 to y:17)
  drawVLine(tiles, cx, 3, 17);

  // temple spur already on spine
  // weapon-shop (4,4) -> spine at (12,4)
  drawHLine(tiles, 4, cx, 4);
  // armor-shop (20,4) -> spine at (12,4)
  drawHLine(tiles, cx, 20, 4);

  // general-store (3,9) -> horizontal to (12,9) on spine
  drawHLine(tiles, 3, cx, 9);
  // magic-shop (21,9) -> horizontal to (12,9) on spine
  drawHLine(tiles, cx, 21, 9);

  // inn (17,10) -> horizontal to spine at (12,10)
  drawHLine(tiles, cx, 17, 10);

  // bank (12,14) already on spine
  // sage (20,14) -> spine
  drawHLine(tiles, cx, 20, 14);
  // junk-store (4,14) -> spine
  drawHLine(tiles, 4, cx, 14);

  // dungeon entrance (12,17) already on spine
}

export function generateTownMap(): { floor: Floor; playerStart: Vector2 } {
  const tiles = emptyGrid();
  placeBorder(tiles);
  placeBuildings(tiles);
  drawPaths(tiles);

  const explored: boolean[][] = Array.from({ length: H }, () => Array(W).fill(true));
  const visible: boolean[][] = Array.from({ length: H }, () => Array(W).fill(true));
  const lit: boolean[][] = Array.from({ length: H }, () => Array(W).fill(true));

  const floor: Floor = {
    id: 'town-0',
    tiles,
    monsters: [],
    items: [],
    explored,
    visible,
    lit,
    width: W,
    height: H,
  };

  return { floor, playerStart: PLAYER_START };
}
