// ============================================================
// Town map generation — compact layout with multi-tile buildings
// ============================================================

import type { Floor, Tile, Vector2 } from '../../core/types';

const W = 25;
const H = 26;

const GRASS: Tile = { type: 'grass', sprite: 'grass', walkable: true, transparent: true };
const PATH: Tile = { type: 'path', sprite: 'path', walkable: true, transparent: true };
// WALL used as base for border construction below

export interface TownBuilding {
  id: string;
  name: string;
  flavor: string;
  x: number;       // top-left tile of sprite/footprint
  y: number;
  w: number;       // footprint width in tiles
  h: number;       // footprint height in tiles
  entranceX: number;
  entranceY: number;
  sprite: string;
  spriteW: number;
  spriteH: number;
  rotate?: number; // CSS rotation in degrees (0, 90, 180, 270)
}

// Sprite reference:
// straw-house-east  96x96 (3x3 tiles) — door on RIGHT
// straw-house-west  96x96 (3x3 tiles) — door on LEFT
// hut               64x64 (2x2 tiles) — door on RIGHT
// hut-fire          64x64 (2x2 tiles) — door on RIGHT
// house-up          96x64 (3x2 tiles) — door on TOP
// house-down1       96x64 (3x2 tiles) — door on BOTTOM
// house-right       64x96 (2x3 tiles) — door on RIGHT bottom
// junk-yard         96x96 (3x3 tiles) — door on RIGHT
// villa2            96x128 (3x4 tiles) — door on TOP
// temple            160x160 (5x5 tiles) — door on TOP
// pantheon          96x128 (3x4 tiles) — door on BOTTOM

export const TOWN_BUILDINGS: TownBuilding[] = [
  // === Left side (entrances face RIGHT toward center spine) ===
  {
    id: 'weapon-shop', name: 'Weapon Shop',
    flavor: 'Fine blades and sturdy hammers for the discerning adventurer.',
    x: 2, y: 2, w: 3, h: 3, entranceX: 5, entranceY: 3,
    sprite: 'straw-house-east', spriteW: 96, spriteH: 96,
  },
  {
    id: 'general-store', name: 'General Store',
    flavor: 'Potions, scrolls, and sundries for every occasion.',
    x: 3, y: 8, w: 2, h: 2, entranceX: 5, entranceY: 8,
    sprite: 'hut', spriteW: 64, spriteH: 64,
  },
  {
    id: 'junk-store', name: "Olaf's Junk Store",
    flavor: "One man's trash is another man's slightly different trash.",
    x: 2, y: 12, w: 3, h: 3, entranceX: 5, entranceY: 12,
    sprite: 'junk-yard', spriteW: 96, spriteH: 96,
  },
  {
    id: 'bank', name: 'Bank',
    flavor: 'Keep your wealth safe from the dangers below.',
    x: 2, y: 17, w: 3, h: 4, entranceX: 5, entranceY: 17,
    sprite: 'villa2', spriteW: 96, spriteH: 128,
  },

  // === Right side (entrances face LEFT toward center spine) ===
  {
    id: 'armor-shop', name: 'Armor Shop',
    flavor: 'Protection for every part of the body.',
    x: 19, y: 2, w: 3, h: 3, entranceX: 18, entranceY: 3,
    sprite: 'straw-house-west', spriteW: 96, spriteH: 96,
  },
  {
    id: 'inn', name: 'The Resting Stag Inn',
    flavor: 'A warm bed and a hearty meal await.',
    x: 19, y: 7, w: 3, h: 2, entranceX: 20, entranceY: 9,
    sprite: 'house-down1', spriteW: 96, spriteH: 64,
  },
  {
    id: 'sage', name: 'The Sage',
    flavor: 'Ancient knowledge to reveal the secrets of your treasures.',
    x: 20, y: 11, w: 2, h: 2, entranceX: 19, entranceY: 12,
    sprite: 'hut', spriteW: 64, spriteH: 64, rotate: 180,
  },
  {
    id: 'magic-shop', name: 'Magic Shop',
    flavor: 'Arcane tomes and enchanted wands of great power.',
    x: 20, y: 16, w: 2, h: 3, entranceX: 19, entranceY: 17,
    sprite: 'house-right', spriteW: 64, spriteH: 96, rotate: 180,
  },

  // === Temple at south center (entrance on top/north side) ===
  {
    id: 'temple', name: 'Temple of Odin',
    flavor: 'A place of healing and divine protection.',
    x: 10, y: 19, w: 5, h: 5, entranceX: 12, entranceY: 18,
    sprite: 'temple', spriteW: 160, spriteH: 160,
  },
];

export const BUILDING_FLAVORS: Record<string, { name: string; flavor: string }> = {};
for (const b of TOWN_BUILDINGS) {
  BUILDING_FLAVORS[b.id] = { name: b.name, flavor: b.flavor };
}

const DUNGEON_ENTRANCE = { x: 12, y: 1 };
export const TOWN_START_INITIAL: Vector2 = { x: 12, y: 17 };  // first visit: near temple
export const TOWN_START_RETURN: Vector2 = { x: 12, y: 2 };    // returning from dungeon: near entrance
const PLAYER_START: Vector2 = TOWN_START_INITIAL;

export function generateTownMap(): { floor: Floor; playerStart: Vector2 } {
  const tiles: Tile[][] = Array.from({ length: H }, () =>
    Array.from({ length: W }, () => ({ ...GRASS }))
  );

  // Border walls with proper orientation
  const HWALL: Tile = { type: 'wall', sprite: 'town-wall', walkable: false, transparent: false };
  const VWALL: Tile = { type: 'wall', sprite: 'town-wall', walkable: false, transparent: false };
  const CORNER: Tile = { type: 'wall', sprite: 'town-wall', walkable: false, transparent: false };

  // North and south borders (horizontal — rotated 90°)
  for (let x = 1; x < W - 1; x++) { tiles[0][x] = { ...HWALL }; tiles[H - 1][x] = { ...HWALL }; }
  // East and west borders (vertical — default orientation)
  for (let y = 1; y < H - 1; y++) { tiles[y][0] = { ...VWALL }; tiles[y][W - 1] = { ...VWALL }; }
  // Corners — top-left correct, top-right 90°, bottom-left 90°, bottom-right 180°
  tiles[0][0] = { ...CORNER };
  tiles[0][W - 1] = { ...CORNER };
  tiles[H - 1][0] = { ...CORNER };
  tiles[H - 1][W - 1] = { ...CORNER };

  // Place building footprints as walls
  for (const b of TOWN_BUILDINGS) {
    for (let by = b.y; by < b.y + b.h && by < H; by++) {
      for (let bx = b.x; bx < b.x + b.w && bx < W; bx++) {
        tiles[by][bx] = { type: 'wall', sprite: 'rock', walkable: false, transparent: true };
      }
    }
    // Top-left for sprite overlay
    if (b.y >= 0 && b.y < H && b.x >= 0 && b.x < W) {
      tiles[b.y][b.x] = { type: 'building', sprite: b.sprite, walkable: false, transparent: true, buildingId: b.id, rotate: b.rotate ?? 0 };
    }
    // Entrance tile
    if (b.entranceY >= 0 && b.entranceY < H && b.entranceX >= 0 && b.entranceX < W) {
      tiles[b.entranceY][b.entranceX] = {
        type: 'building', sprite: 'path', walkable: true, transparent: true, buildingId: b.id,
      };
    }
  }

  // Dungeon entrance at top
  tiles[DUNGEON_ENTRANCE.y][DUNGEON_ENTRANCE.x] = {
    type: 'stairs-down', sprite: 'mine-entrance', walkable: true, transparent: true,
  };

  // === Paths ===
  // Main vertical spine (stop at temple entrance, don't extend past)
  for (let y = 1; y <= 18; y++) sp(tiles, 12, y);

  // Left branches to entrances
  for (let x = 5; x <= 12; x++) sp(tiles, x, 3);   // weapon shop
  for (let x = 5; x <= 12; x++) sp(tiles, x, 8);   // general store
  for (let x = 5; x <= 12; x++) sp(tiles, x, 12);  // junk store
  for (let x = 5; x <= 12; x++) sp(tiles, x, 17);  // bank

  // Right branches to entrances
  for (let x = 12; x <= 18; x++) sp(tiles, x, 3);  // armor shop
  for (let x = 12; x <= 20; x++) sp(tiles, x, 9);  // inn
  for (let x = 12; x <= 19; x++) sp(tiles, x, 12); // sage
  for (let x = 12; x <= 19; x++) sp(tiles, x, 17); // magic shop

  // Temple entrance
  sp(tiles, 12, 18);

  const explored = Array.from({ length: H }, () => Array(W).fill(true));
  const visible = Array.from({ length: H }, () => Array(W).fill(true));
  const lit = Array.from({ length: H }, () => Array(W).fill(true));

  return {
    floor: { id: 'town-0', tiles, monsters: [], items: [], decals: [], explored, visible, lit, width: W, height: H },
    playerStart: PLAYER_START,
  };
}

function sp(tiles: Tile[][], x: number, y: number): void {
  if (x <= 0 || x >= W - 1 || y <= 0 || y >= H - 1) return;
  const t = tiles[y][x];
  if (t.type === 'wall' || t.type === 'stairs-down' || t.type === 'building') return;
  tiles[y][x] = { ...PATH };
}
