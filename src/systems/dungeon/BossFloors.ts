// ============================================================
// Boss floor generator — The Runed Deep
// Pre-designed layouts for all 7 boss encounters.
// ============================================================

import type { Floor, Tile, Vector2, Difficulty, PlacedItem } from '../../core/types';
import { getBossForFloor, MONSTER_BY_ID } from '../../data/monsters';
import { createMonster } from '../monsters/spawning';
import { getItemsForDepth } from '../../data/items';
import { createItemFromTemplate } from '../items/loot';
import { getDungeonForFloor, TILESETS, type Tileset } from './Tilesets';

const BOSS_FLOORS = new Set([15, 20, 25, 30, 33, 36, 40]);

// ── Tile factories (use active tileset) ───────────────────

let ts: Tileset = TILESETS['mine'];

function wall(): Tile {
  return { type: 'wall', sprite: ts.wall, walkable: false, transparent: false };
}

function floor(): Tile {
  return { type: 'floor', sprite: ts.floor, walkable: true, transparent: true };
}

function stairsUp(): Tile {
  return { type: 'stairs-up', sprite: 'stairs-up', walkable: true, transparent: true };
}

function stairsDown(): Tile {
  return { type: 'stairs-down', sprite: 'stairs-down', walkable: true, transparent: true };
}

function trap(trapType: string): Tile {
  return { type: 'trap', sprite: ts.floor, walkable: true, transparent: true, trapType, trapRevealed: false };
}

// ── Grid helpers ──────────────────────────────────────────

function initGrid(w: number, h: number): Tile[][] {
  const tiles: Tile[][] = [];
  for (let y = 0; y < h; y++) {
    tiles[y] = [];
    for (let x = 0; x < w; x++) {
      tiles[y][x] = wall();
    }
  }
  return tiles;
}

function initBoolGrid(w: number, h: number): boolean[][] {
  const g: boolean[][] = [];
  for (let y = 0; y < h; y++) {
    g[y] = [];
    for (let x = 0; x < w; x++) g[y][x] = false;
  }
  return g;
}

function carveRect(tiles: Tile[][], x: number, y: number, w: number, h: number): void {
  for (let ry = y; ry < y + h; ry++) {
    for (let rx = x; rx < x + w; rx++) {
      if (ry >= 0 && ry < tiles.length && rx >= 0 && rx < tiles[0].length) {
        tiles[ry][rx] = floor();
      }
    }
  }
}

function carveH(tiles: Tile[][], x1: number, x2: number, y: number): void {
  const lo = Math.min(x1, x2);
  const hi = Math.max(x1, x2);
  for (let x = lo; x <= hi; x++) {
    if (y >= 0 && y < tiles.length && x >= 0 && x < tiles[0].length) {
      tiles[y][x] = floor();
    }
  }
}

function carveV(tiles: Tile[][], y1: number, y2: number, x: number): void {
  const lo = Math.min(y1, y2);
  const hi = Math.max(y1, y2);
  for (let y = lo; y <= hi; y++) {
    if (y >= 0 && y < tiles.length && x >= 0 && x < tiles[0].length) {
      tiles[y][x] = floor();
    }
  }
}

// ── Loot helper ───────────────────────────────────────────

function placeLoot(
  tiles: Tile[][],
  items: PlacedItem[],
  depth: number,
  positions: Vector2[],
  count: number,
): void {
  const candidates = getItemsForDepth(depth);
  if (candidates.length === 0) return;
  let placed = 0;
  for (const pos of positions) {
    if (placed >= count) break;
    const t = tiles[pos.y]?.[pos.x];
    if (!t?.walkable || t.type === 'stairs-up' || t.type === 'stairs-down') continue;
    const tpl = candidates[Math.floor(Math.random() * candidates.length)];
    const item = createItemFromTemplate(tpl, depth);
    item.identified = true;
    items.push({ item, position: { ...pos } });
    placed++;
  }
}

// ── Monster helper ────────────────────────────────────────

function rand01(): number {
  return Math.random();
}

// ── Floor 15: Hrungnir, Hill Giant Lord ───────────────────
// Map 30x25. Large 12x10 central arena, 2 small 5x5 side rooms.

function buildFloor15(dungeonId: string, depth: number, difficulty: Difficulty): { floor: Floor; playerStart: Vector2 } {
  const W = 30, H = 25;
  const tiles = initGrid(W, H);

  // Entry corridor at top (2 wide, from y=1 to y=4 at x=14)
  carveRect(tiles, 13, 1, 4, 4);

  // Central arena 12x10 at (9, 8)
  carveRect(tiles, 9, 8, 12, 10);

  // Left side room 5x5 at (1, 10)
  carveRect(tiles, 1, 10, 5, 5);
  // Corridor left room -> arena
  carveH(tiles, 6, 9, 12);

  // Right side room 5x5 at (24, 10)
  carveRect(tiles, 24, 10, 5, 5);
  // Corridor right room -> arena
  carveH(tiles, 21, 24, 12);

  // Corridor: entry -> arena
  carveV(tiles, 4, 8, 15);

  // Stairs up at entry top
  tiles[2][15] = stairsUp();
  const playerStart: Vector2 = { x: 15, y: 2 };

  // Stairs down behind boss (south of arena)
  tiles[19][15] = stairsDown();

  const monsters = [];
  const items: PlacedItem[] = [];

  // Boss in center of arena
  const bossTpl = getBossForFloor(depth);
  if (bossTpl) {
    monsters.push(createMonster(bossTpl, { x: 15, y: 13 }, depth, rand01, difficulty));
  }

  // 3 hill-giant minions: 2 in side rooms, 1 in arena
  const hillGiant = MONSTER_BY_ID['hill-giant'];
  if (hillGiant) {
    monsters.push(createMonster(hillGiant, { x: 3, y: 12 }, depth, rand01, difficulty));
    monsters.push(createMonster(hillGiant, { x: 26, y: 12 }, depth, rand01, difficulty));
    monsters.push(createMonster(hillGiant, { x: 11, y: 15 }, depth, rand01, difficulty));
  }

  // 3 bonus loot items in arena
  placeLoot(tiles, items, depth, [
    { x: 10, y: 9 }, { x: 19, y: 9 }, { x: 15, y: 16 },
  ], 3);

  return {
    floor: {
      id: `${dungeonId}-15`,
      tiles, monsters, items,
      explored: initBoolGrid(W, H),
      visible: initBoolGrid(W, H),
      lit: initBoolGrid(W, H),
      decals: [], width: W, height: H,
    },
    playerStart,
  };
}

// ── Floor 20: Wolf-Man ────────────────────────────────────
// Map 30x25. 10x10 arena with 4 pillar walls, 2 side rooms with 2 white-wolf each.

function buildFloor20(dungeonId: string, depth: number, difficulty: Difficulty): { floor: Floor; playerStart: Vector2 } {
  const W = 30, H = 25;
  const tiles = initGrid(W, H);

  // Entry hall 4x3 at top
  carveRect(tiles, 13, 1, 4, 3);

  // Arena 10x10 at (10, 8)
  carveRect(tiles, 10, 8, 10, 10);

  // 4 pillar wall tiles inside arena for cover
  tiles[10][12] = wall();
  tiles[10][17] = wall();
  tiles[15][12] = wall();
  tiles[15][17] = wall();

  // Left side room 5x6 at (2, 9)
  carveRect(tiles, 2, 9, 5, 6);
  carveH(tiles, 7, 10, 12);

  // Right side room 5x6 at (23, 9)
  carveRect(tiles, 23, 9, 5, 6);
  carveH(tiles, 20, 23, 12);

  // Entry -> arena corridor
  carveV(tiles, 4, 8, 15);

  // Stairs up at entry
  tiles[2][15] = stairsUp();
  const playerStart: Vector2 = { x: 15, y: 2 };

  // Stairs down south of arena
  tiles[19][15] = stairsDown();

  const monsters = [];
  const items: PlacedItem[] = [];

  // Boss in arena center
  const bossTpl = getBossForFloor(depth);
  if (bossTpl) {
    monsters.push(createMonster(bossTpl, { x: 15, y: 13 }, depth, rand01, difficulty));
  }

  // 2 white-wolf per side room
  const whiteWolf = MONSTER_BY_ID['white-wolf'];
  if (whiteWolf) {
    monsters.push(createMonster(whiteWolf, { x: 3, y: 11 }, depth, rand01, difficulty));
    monsters.push(createMonster(whiteWolf, { x: 5, y: 13 }, depth, rand01, difficulty));
    monsters.push(createMonster(whiteWolf, { x: 25, y: 11 }, depth, rand01, difficulty));
    monsters.push(createMonster(whiteWolf, { x: 26, y: 13 }, depth, rand01, difficulty));
  }

  placeLoot(tiles, items, depth, [
    { x: 11, y: 9 }, { x: 18, y: 9 }, { x: 14, y: 16 },
  ], 3);

  return {
    floor: {
      id: `${dungeonId}-20`,
      tiles, monsters, items,
      explored: initBoolGrid(W, H),
      visible: initBoolGrid(W, H),
      lit: initBoolGrid(W, H),
      decals: [], width: W, height: H,
    },
    playerStart,
  };
}

// ── Floor 25: Bear-Man ────────────────────────────────────
// Map 35x28. Entry 8x8 -> corridor -> guard room 8x6 -> corridor -> boss chamber 12x10.

function buildFloor25(dungeonId: string, depth: number, difficulty: Difficulty): { floor: Floor; playerStart: Vector2 } {
  const W = 35, H = 28;
  const tiles = initGrid(W, H);

  // Entry room 8x8 at (1, 1)
  carveRect(tiles, 1, 1, 8, 8);

  // Corridor entry -> guard room
  carveH(tiles, 9, 13, 5);

  // Guard room 8x6 at (13, 3)
  carveRect(tiles, 13, 3, 8, 6);

  // Corridor guard -> boss chamber
  carveH(tiles, 21, 22, 5);

  // Boss chamber 12x10 at (22, 1)
  carveRect(tiles, 22, 1, 12, 10);

  // Stairs up in entry room
  tiles[2][3] = stairsUp();
  const playerStart: Vector2 = { x: 3, y: 2 };

  // Stairs down in boss chamber
  tiles[6][29] = stairsDown();

  const monsters = [];
  const items: PlacedItem[] = [];

  // Boss in boss chamber
  const bossTpl = getBossForFloor(depth);
  if (bossTpl) {
    monsters.push(createMonster(bossTpl, { x: 28, y: 5 }, depth, rand01, difficulty));
  }

  // 2 cave-bear in guard room, 2 in boss chamber
  const caveBear = MONSTER_BY_ID['cave-bear'];
  if (caveBear) {
    monsters.push(createMonster(caveBear, { x: 15, y: 5 }, depth, rand01, difficulty));
    monsters.push(createMonster(caveBear, { x: 19, y: 7 }, depth, rand01, difficulty));
    monsters.push(createMonster(caveBear, { x: 24, y: 3 }, depth, rand01, difficulty));
    monsters.push(createMonster(caveBear, { x: 32, y: 8 }, depth, rand01, difficulty));
  }

  placeLoot(tiles, items, depth, [
    { x: 3, y: 5 }, { x: 6, y: 7 }, { x: 25, y: 2 }, { x: 31, y: 2 },
  ], 4);

  return {
    floor: {
      id: `${dungeonId}-25`,
      tiles, monsters, items,
      explored: initBoolGrid(W, H),
      visible: initBoolGrid(W, H),
      lit: initBoolGrid(W, H),
      decals: [], width: W, height: H,
    },
    playerStart,
  };
}

// ── Floor 30: Frost Giant King ────────────────────────────
// Map 40x30. Entry -> left wing -> right wing -> boss chamber 14x10.

function buildFloor30(dungeonId: string, depth: number, difficulty: Difficulty): { floor: Floor; playerStart: Vector2 } {
  const W = 40, H = 30;
  const tiles = initGrid(W, H);

  // Entry room 6x6 at (1, 12)
  carveRect(tiles, 1, 12, 6, 6);

  // Central corridor connecting everything
  carveH(tiles, 7, 12, 15);

  // Left wing (ice-devils) 8x6 at (8, 5)
  carveRect(tiles, 8, 5, 8, 6);
  carveV(tiles, 11, 15, 12);

  // Right wing (frost-giants) 8x6 at (8, 20)
  carveRect(tiles, 8, 20, 8, 6);
  carveV(tiles, 15, 20, 12);

  // Approach corridor to boss
  carveH(tiles, 13, 22, 15);

  // Boss chamber 14x10 at (22, 10)
  carveRect(tiles, 22, 10, 14, 10);

  // Ice pillar obstacles in boss chamber
  tiles[12][25] = wall();
  tiles[12][30] = wall();
  tiles[17][25] = wall();
  tiles[17][30] = wall();

  // Stairs up in entry room
  tiles[14][3] = stairsUp();
  const playerStart: Vector2 = { x: 3, y: 14 };

  // Stairs down in boss chamber
  tiles[15][34] = stairsDown();

  const monsters = [];
  const items: PlacedItem[] = [];

  // Boss in chamber
  const bossTpl = getBossForFloor(depth);
  if (bossTpl) {
    monsters.push(createMonster(bossTpl, { x: 28, y: 15 }, depth, rand01, difficulty));
  }

  // 4 frost-giants spread across wings and chamber
  const frostGiant = MONSTER_BY_ID['frost-giant'];
  if (frostGiant) {
    monsters.push(createMonster(frostGiant, { x: 9, y: 22 }, depth, rand01, difficulty));
    monsters.push(createMonster(frostGiant, { x: 14, y: 23 }, depth, rand01, difficulty));
    monsters.push(createMonster(frostGiant, { x: 24, y: 12 }, depth, rand01, difficulty));
    monsters.push(createMonster(frostGiant, { x: 33, y: 18 }, depth, rand01, difficulty));
  }

  // 2 ice-devils in left wing
  const iceDevil = MONSTER_BY_ID['ice-devil'];
  if (iceDevil) {
    monsters.push(createMonster(iceDevil, { x: 10, y: 7 }, depth, rand01, difficulty));
    monsters.push(createMonster(iceDevil, { x: 14, y: 9 }, depth, rand01, difficulty));
  }

  placeLoot(tiles, items, depth, [
    { x: 3, y: 13 }, { x: 9, y: 6 }, { x: 13, y: 21 }, { x: 23, y: 11 },
  ], 4);

  return {
    floor: {
      id: `${dungeonId}-30`,
      tiles, monsters, items,
      explored: initBoolGrid(W, H),
      visible: initBoolGrid(W, H),
      lit: initBoolGrid(W, H),
      decals: [], width: W, height: H,
    },
    playerStart,
  };
}

// ── Floor 33: Stone Giant King ────────────────────────────
// Map 40x30. Entry -> corridor maze -> 2 guard rooms -> throne room 14x12.

function buildFloor33(dungeonId: string, depth: number, difficulty: Difficulty): { floor: Floor; playerStart: Vector2 } {
  const W = 40, H = 30;
  const tiles = initGrid(W, H);

  // Entry room 6x5 at (1, 12)
  carveRect(tiles, 1, 12, 6, 5);

  // Maze-like corridor
  carveH(tiles, 7, 12, 14);
  carveV(tiles, 8, 14, 12);
  carveH(tiles, 12, 16, 8);
  carveV(tiles, 8, 14, 16);
  carveH(tiles, 16, 20, 14);

  // Guard room 1: 7x5 at (11, 1)
  carveRect(tiles, 11, 1, 7, 5);
  carveV(tiles, 5, 8, 14);

  // Guard room 2: 7x5 at (11, 21)
  carveRect(tiles, 11, 21, 7, 5);
  carveV(tiles, 14, 21, 14);

  // Corridor to throne
  carveH(tiles, 20, 24, 14);

  // Throne room 14x12 at (24, 8)
  carveRect(tiles, 24, 8, 14, 12);

  // Stone pillar obstacles in throne room
  tiles[10][27] = wall();
  tiles[10][33] = wall();
  tiles[16][27] = wall();
  tiles[16][33] = wall();
  tiles[13][30] = wall(); // center pillar

  // Stairs up in entry
  tiles[14][3] = stairsUp();
  const playerStart: Vector2 = { x: 3, y: 14 };

  // Stairs down in throne room
  tiles[14][36] = stairsDown();

  // Traps in maze corridor
  tiles[14][9] = trap('pit');
  tiles[8][14] = trap('arrow');
  tiles[14][18] = trap('fire');

  const monsters = [];
  const items: PlacedItem[] = [];

  // Boss in throne room
  const bossTpl = getBossForFloor(depth);
  if (bossTpl) {
    monsters.push(createMonster(bossTpl, { x: 30, y: 14 }, depth, rand01, difficulty));
  }

  // 4 stone-giants across guard rooms and throne
  const stoneGiant = MONSTER_BY_ID['stone-giant'];
  if (stoneGiant) {
    monsters.push(createMonster(stoneGiant, { x: 13, y: 3 }, depth, rand01, difficulty));
    monsters.push(createMonster(stoneGiant, { x: 16, y: 3 }, depth, rand01, difficulty));
    monsters.push(createMonster(stoneGiant, { x: 13, y: 23 }, depth, rand01, difficulty));
    monsters.push(createMonster(stoneGiant, { x: 16, y: 23 }, depth, rand01, difficulty));
  }

  // 2 earth-elementals in throne room
  const earthElem = MONSTER_BY_ID['earth-elemental'];
  if (earthElem) {
    monsters.push(createMonster(earthElem, { x: 26, y: 10 }, depth, rand01, difficulty));
    monsters.push(createMonster(earthElem, { x: 35, y: 17 }, depth, rand01, difficulty));
  }

  placeLoot(tiles, items, depth, [
    { x: 3, y: 13 }, { x: 14, y: 2 }, { x: 14, y: 22 }, { x: 25, y: 9 }, { x: 36, y: 16 },
  ], 5);

  return {
    floor: {
      id: `${dungeonId}-33`,
      tiles, monsters, items,
      explored: initBoolGrid(W, H),
      visible: initBoolGrid(W, H),
      lit: initBoolGrid(W, H),
      decals: [], width: W, height: H,
    },
    playerStart,
  };
}

// ── Floor 36: Fire Giant King ─────────────────────────────
// Map 40x30. Entry -> fire trap corridor -> armory -> forge -> throne room.

function buildFloor36(dungeonId: string, depth: number, difficulty: Difficulty): { floor: Floor; playerStart: Vector2 } {
  const W = 40, H = 30;
  const tiles = initGrid(W, H);

  // Entry room 6x5 at (1, 12)
  carveRect(tiles, 1, 12, 6, 5);

  // Fire trap corridor 8x3 at (7, 13)
  carveRect(tiles, 7, 13, 8, 3);

  // Fire traps in corridor
  tiles[14][9] = trap('fire');
  tiles[14][12] = trap('fire');
  tiles[14][13] = trap('fire');

  // Armory room 8x7 at (15, 11)
  carveRect(tiles, 15, 11, 8, 7);

  // Forge room 8x7 at (15, 18) — connected below armory via short corridor
  carveRect(tiles, 15, 19, 8, 7);
  carveV(tiles, 18, 19, 19);

  // Corridor armory -> throne
  carveH(tiles, 23, 26, 14);

  // Throne room 12x12 at (26, 8)
  carveRect(tiles, 26, 8, 12, 12);

  // Stairs up in entry
  tiles[14][3] = stairsUp();
  const playerStart: Vector2 = { x: 3, y: 14 };

  // Stairs down in throne room
  tiles[14][36] = stairsDown();

  const monsters = [];
  const items: PlacedItem[] = [];

  // Boss in throne room
  const bossTpl = getBossForFloor(depth);
  if (bossTpl) {
    monsters.push(createMonster(bossTpl, { x: 31, y: 14 }, depth, rand01, difficulty));
  }

  // 4 fire-giants spread across rooms
  const fireGiant = MONSTER_BY_ID['fire-giant'];
  if (fireGiant) {
    monsters.push(createMonster(fireGiant, { x: 17, y: 13 }, depth, rand01, difficulty));
    monsters.push(createMonster(fireGiant, { x: 21, y: 13 }, depth, rand01, difficulty));
    monsters.push(createMonster(fireGiant, { x: 17, y: 21 }, depth, rand01, difficulty));
    monsters.push(createMonster(fireGiant, { x: 21, y: 23 }, depth, rand01, difficulty));
  }

  // 2 fire-elementals in throne room
  const fireElem = MONSTER_BY_ID['fire-elemental'];
  if (fireElem) {
    monsters.push(createMonster(fireElem, { x: 28, y: 10 }, depth, rand01, difficulty));
    monsters.push(createMonster(fireElem, { x: 35, y: 17 }, depth, rand01, difficulty));
  }

  placeLoot(tiles, items, depth, [
    { x: 3, y: 13 }, { x: 16, y: 12 }, { x: 22, y: 12 }, { x: 16, y: 20 }, { x: 27, y: 9 },
  ], 5);

  return {
    floor: {
      id: `${dungeonId}-36`,
      tiles, monsters, items,
      explored: initBoolGrid(W, H),
      visible: initBoolGrid(W, H),
      lit: initBoolGrid(W, H),
      decals: [], width: W, height: H,
    },
    playerStart,
  };
}

// ── Floor 40: Surtur (final boss) ─────────────────────────
// Map 45x35. Entry hall -> left/right guardian chambers -> grand corridor -> throne room 16x14.

function buildFloor40(dungeonId: string, depth: number, difficulty: Difficulty): { floor: Floor; playerStart: Vector2 } {
  const W = 45, H = 35;
  const tiles = initGrid(W, H);

  // Entry hall 8x6 at (1, 14)
  carveRect(tiles, 1, 14, 8, 6);

  // Central grand corridor 4x3 at (9, 16)
  carveRect(tiles, 9, 16, 4, 3);

  // Left guardian chamber 9x7 at (8, 5)
  carveRect(tiles, 8, 5, 9, 7);
  carveV(tiles, 12, 16, 12);

  // Right guardian chamber 9x7 at (8, 23)
  carveRect(tiles, 8, 23, 9, 7);
  carveV(tiles, 16, 23, 12);

  // Grand corridor 8x3 at (13, 16)
  carveRect(tiles, 13, 16, 8, 3);

  // Throne room 16x14 at (21, 10)
  carveRect(tiles, 21, 10, 16, 14);

  // Fire pillars in throne room (wall tiles = impassable)
  tiles[12][24] = wall();
  tiles[12][30] = wall();
  tiles[20][24] = wall();
  tiles[20][30] = wall();
  // Lava columns near throne
  tiles[13][33] = wall();
  tiles[14][33] = wall();
  tiles[15][33] = wall();
  tiles[18][33] = wall();
  tiles[19][33] = wall();
  tiles[20][33] = wall();

  // Stairs up in entry hall
  tiles[17][3] = stairsUp();
  const playerStart: Vector2 = { x: 3, y: 17 };

  // No stairs down — final floor

  const monsters = [];
  const items: PlacedItem[] = [];

  // Surtur — final boss
  const bossTpl = getBossForFloor(depth);
  if (bossTpl) {
    monsters.push(createMonster(bossTpl, { x: 28, y: 17 }, depth, rand01, difficulty));
  }

  // 3 fire-giant-kings as guardians
  const fireGiantKing = MONSTER_BY_ID['fire-giant-king'];
  if (fireGiantKing) {
    monsters.push(createMonster(fireGiantKing, { x: 10, y: 8 }, depth, rand01, difficulty));
    monsters.push(createMonster(fireGiantKing, { x: 14, y: 9 }, depth, rand01, difficulty));
    monsters.push(createMonster(fireGiantKing, { x: 10, y: 26 }, depth, rand01, difficulty));
  }

  // 2 abyss-fiends in throne room
  const abyssFiend = MONSTER_BY_ID['abyss-fiend'];
  if (abyssFiend) {
    monsters.push(createMonster(abyssFiend, { x: 23, y: 12 }, depth, rand01, difficulty));
    monsters.push(createMonster(abyssFiend, { x: 34, y: 20 }, depth, rand01, difficulty));
  }

  placeLoot(tiles, items, depth, [
    { x: 3, y: 15 }, { x: 9, y: 7 }, { x: 14, y: 25 }, { x: 22, y: 11 }, { x: 35, y: 11 }, { x: 22, y: 22 },
  ], 6);

  return {
    floor: {
      id: `${dungeonId}-40`,
      tiles, monsters, items,
      explored: initBoolGrid(W, H),
      visible: initBoolGrid(W, H),
      lit: initBoolGrid(W, H),
      decals: [], width: W, height: H,
    },
    playerStart,
  };
}

// ── Public API ────────────────────────────────────────────

export function generateBossFloor(
  dungeonId: string,
  floorNum: number,
  depth: number,
  difficulty: Difficulty,
): { floor: Floor; playerStart: Vector2 } | null {
  if (!BOSS_FLOORS.has(floorNum)) return null;
  ts = TILESETS[getDungeonForFloor(floorNum)] ?? TILESETS['mine'];

  switch (floorNum) {
    case 15: return buildFloor15(dungeonId, depth, difficulty);
    case 20: return buildFloor20(dungeonId, depth, difficulty);
    case 25: return buildFloor25(dungeonId, depth, difficulty);
    case 30: return buildFloor30(dungeonId, depth, difficulty);
    case 33: return buildFloor33(dungeonId, depth, difficulty);
    case 36: return buildFloor36(dungeonId, depth, difficulty);
    case 40: return buildFloor40(dungeonId, depth, difficulty);
    default: return null;
  }
}
