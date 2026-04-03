// ============================================================
// Boss floor generator — The Runed Deep
// Pre-designed layouts for all 7 boss encounters.
// ============================================================

import type {
  Floor,
  Tile,
  Vector2,
  Difficulty,
  PlacedItem,
} from "../../core/types";
import { getBossForFloor, MONSTER_BY_ID } from "../../data/monsters";
import { createMonster } from "../monsters/spawning";
import { getItemsForDepth, ALL_ITEM_TEMPLATES } from "../../data/items";
import { createItemFromTemplate } from "../items/loot";
import { getDungeonForFloor, TILESETS, type Tileset } from "./Tilesets";

const BOSS_FLOORS = new Set([5, 10, 15, 20, 25, 30]);

// ── Tile factories (use active tileset) ───────────────────

let ts: Tileset = TILESETS["mine"];

function wall(): Tile {
  return { type: "wall", sprite: ts.wall, walkable: false, transparent: false };
}

function floor(): Tile {
  return { type: "floor", sprite: ts.floor, walkable: true, transparent: true };
}

function stairsUp(): Tile {
  return {
    type: "stairs-up",
    sprite: "stairs-up",
    walkable: true,
    transparent: true,
  };
}

function stairsDown(): Tile {
  return {
    type: "stairs-down",
    sprite: "stairs-down",
    walkable: true,
    transparent: true,
  };
}

function decor(sprite: string): Tile {
  return { type: "decor", sprite, walkable: true, transparent: true };
}

function water(): Tile {
  return { type: "water", sprite: "water", walkable: true, transparent: true };
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

function carveRect(
  tiles: Tile[][],
  x: number,
  y: number,
  w: number,
  h: number,
): void {
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
  ngPlus: number = 0,
): void {
  const candidates = getItemsForDepth(depth, ngPlus);
  if (candidates.length === 0) return;

  // Boss guaranteed unique drop (always in NG+, else for bosses F30+)
  const uniqueCandidates = ALL_ITEM_TEMPLATES.filter(
    (t) => t.unique && depth >= t.depthMin && depth <= t.depthMax,
  );
  const guaranteeUnique = ngPlus >= 1 || depth >= 20;

  let placed = 0;
  for (const pos of positions) {
    if (placed >= count) break;
    const t = tiles[pos.y]?.[pos.x];
    if (!t?.walkable || t.type === "stairs-up" || t.type === "stairs-down")
      continue;

    let tpl;
    if (placed === 0 && guaranteeUnique && uniqueCandidates.length > 0) {
      // First item is guaranteed unique
      tpl =
        uniqueCandidates[Math.floor(Math.random() * uniqueCandidates.length)];
    } else {
      tpl = candidates[Math.floor(Math.random() * candidates.length)];
    }
    const item = createItemFromTemplate(tpl, depth, ngPlus);
    item.identified = true;
    items.push({ item, position: { ...pos } });
    placed++;
  }
}

// ── Monster helper ────────────────────────────────────────

function rand01(): number {
  return Math.random();
}

// ── Boss floor decoration ────────────────────────────────

const BOSS_DECOR: { sprite: string; minDepth: number; weight: number }[] = [
  { sprite: "pillar-stone", minDepth: 1, weight: 4 },
  { sprite: "pillar-broken", minDepth: 5, weight: 3 },
  { sprite: "altar", minDepth: 10, weight: 1 },
  { sprite: "altar-2", minDepth: 20, weight: 1 },
  { sprite: "statue", minDepth: 10, weight: 2 },
  { sprite: "stone-coffin", minDepth: 15, weight: 2 },
  { sprite: "fountain", minDepth: 10, weight: 1 },
];

function decorateBossFloor(
  tiles: Tile[][],
  depth: number,
  playerStart: Vector2,
  count: number,
  items: PlacedItem[] = [],
): void {
  const W = tiles[0].length,
    H = tiles.length;
  const available = BOSS_DECOR.filter((d) => depth >= d.minDepth);
  if (available.length === 0) return;

  const totalW = available.reduce((s, d) => s + d.weight, 0);
  function pick() {
    let roll = Math.random() * totalW;
    for (const d of available) {
      roll -= d.weight;
      if (roll <= 0) return d;
    }
    return available[available.length - 1];
  }

  let placed = 0;
  for (let tries = 0; tries < count * 10 && placed < count; tries++) {
    const x = 1 + Math.floor(Math.random() * (W - 2));
    const y = 1 + Math.floor(Math.random() * (H - 2));
    const t = tiles[y][x];
    if (t.type !== "floor") continue;
    if (x === playerStart.x && y === playerStart.y) continue;
    // Don't place on items
    if (items.some((i) => i.position.x === x && i.position.y === y)) continue;
    // Not adjacent to stairs
    const near = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ].some(([dx, dy]) => {
      const adj = tiles[y + dy]?.[x + dx];
      return adj?.type === "stairs-up" || adj?.type === "stairs-down";
    });
    if (near) continue;

    const d = pick();
    tiles[y][x] = decor(d.sprite);
    placed++;
  }

  // Also add 1-2 water patches in deeper boss floors
  if (depth >= 20) {
    for (let w = 0; w < 2; w++) {
      const wx = 2 + Math.floor(Math.random() * (W - 4));
      const wy = 2 + Math.floor(Math.random() * (H - 4));
      if (tiles[wy][wx].type === "floor") {
        tiles[wy][wx] = water();
        // Spread 1-2 adjacent
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          if (
            Math.random() < 0.4 &&
            tiles[wy + dy]?.[wx + dx]?.type === "floor"
          ) {
            tiles[wy + dy][wx + dx] = water();
          }
        }
      }
    }
  }
}

// ── Floor 5: First Boss Arena ─────────────────────────────
// Map 30x25. Simple open arena with stairs.

function buildFloor5(
  dungeonId: string,
  depth: number,
  difficulty: Difficulty,
): { floor: Floor; playerStart: Vector2 } {
  const W = 30,
    H = 25;
  const tiles = initGrid(W, H);

  // Entry corridor at top
  carveRect(tiles, 13, 1, 4, 4);

  // Central arena 14x12 at (8, 8)
  carveRect(tiles, 8, 8, 14, 12);

  // Corridor: entry -> arena
  carveV(tiles, 4, 8, 15);

  // Stairs up at entry
  tiles[2][15] = stairsUp();
  const playerStart: Vector2 = { x: 15, y: 2 };

  // Corridor: arena south -> stairs down
  carveV(tiles, 19, 22, 15);
  // Stairs down behind boss
  tiles[22][15] = stairsDown();

  const monsters = [];
  const items: PlacedItem[] = [];

  // Boss in center of arena
  const bossTpl = getBossForFloor(depth);
  if (bossTpl) {
    monsters.push(
      createMonster(bossTpl, { x: 15, y: 14 }, depth, rand01, difficulty),
    );
  }

  placeLoot(
    tiles,
    items,
    depth,
    [
      { x: 10, y: 9 },
      { x: 19, y: 9 },
      { x: 15, y: 18 },
    ],
    3,
  );

  return {
    floor: {
      id: `${dungeonId}-5`,
      tiles,
      monsters,
      items,
      explored: initBoolGrid(W, H),
      visible: initBoolGrid(W, H),
      lit: initBoolGrid(W, H),
      decals: [],
      width: W,
      height: H,
    },
    playerStart,
  };
}

// ── Floor 10: Pillar Arena ───────────────────────────────
// Map 30x25. Arena with some pillars for cover.

function buildFloor10(
  dungeonId: string,
  depth: number,
  difficulty: Difficulty,
): { floor: Floor; playerStart: Vector2 } {
  const W = 30,
    H = 25;
  const tiles = initGrid(W, H);

  // Entry corridor at top
  carveRect(tiles, 13, 1, 4, 4);

  // Central arena 14x12 at (8, 8)
  carveRect(tiles, 8, 8, 14, 12);

  // Pillars inside arena for cover
  tiles[10][11] = wall();
  tiles[10][18] = wall();
  tiles[16][11] = wall();
  tiles[16][18] = wall();
  tiles[13][14] = wall();
  tiles[13][15] = wall();

  // Corridor: entry -> arena
  carveV(tiles, 4, 8, 15);

  // Stairs up at entry
  tiles[2][15] = stairsUp();
  const playerStart: Vector2 = { x: 15, y: 2 };

  // Corridor: arena south -> stairs down
  carveV(tiles, 19, 22, 15);
  // Stairs down behind boss
  tiles[22][15] = stairsDown();

  const monsters = [];
  const items: PlacedItem[] = [];

  // Boss in center of arena
  const bossTpl = getBossForFloor(depth);
  if (bossTpl) {
    monsters.push(
      createMonster(bossTpl, { x: 15, y: 14 }, depth, rand01, difficulty),
    );
  }

  placeLoot(
    tiles,
    items,
    depth,
    [
      { x: 9, y: 9 },
      { x: 20, y: 9 },
      { x: 15, y: 18 },
    ],
    3,
  );

  return {
    floor: {
      id: `${dungeonId}-10`,
      tiles,
      monsters,
      items,
      explored: initBoolGrid(W, H),
      visible: initBoolGrid(W, H),
      lit: initBoolGrid(W, H),
      decals: [],
      width: W,
      height: H,
    },
    playerStart,
  };
}

// ── Floor 15: Hrungnir, Hill Giant Lord ───────────────────
// Map 30x25. Large 12x10 central arena, 2 small 5x5 side rooms.

function buildFloor15(
  dungeonId: string,
  depth: number,
  difficulty: Difficulty,
): { floor: Floor; playerStart: Vector2 } {
  const W = 30,
    H = 25;
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

  // Corridor: arena south -> stairs down
  carveV(tiles, 17, 19, 15);
  // Stairs down behind boss (south of arena)
  tiles[19][15] = stairsDown();

  const monsters = [];
  const items: PlacedItem[] = [];

  // Boss in center of arena
  const bossTpl = getBossForFloor(depth);
  if (bossTpl) {
    monsters.push(
      createMonster(bossTpl, { x: 15, y: 13 }, depth, rand01, difficulty),
    );
  }

  // 3 ogre minions: 2 in side rooms, 1 in arena
  const ogre = MONSTER_BY_ID["huge-ogre"];
  if (ogre) {
    monsters.push(
      createMonster(ogre, { x: 3, y: 12 }, depth, rand01, difficulty),
    );
    monsters.push(
      createMonster(ogre, { x: 26, y: 12 }, depth, rand01, difficulty),
    );
    monsters.push(
      createMonster(ogre, { x: 11, y: 15 }, depth, rand01, difficulty),
    );
  }

  // 3 bonus loot items in arena
  placeLoot(
    tiles,
    items,
    depth,
    [
      { x: 10, y: 9 },
      { x: 19, y: 9 },
      { x: 15, y: 16 },
    ],
    3,
  );

  return {
    floor: {
      id: `${dungeonId}-15`,
      tiles,
      monsters,
      items,
      explored: initBoolGrid(W, H),
      visible: initBoolGrid(W, H),
      lit: initBoolGrid(W, H),
      decals: [],
      width: W,
      height: H,
    },
    playerStart,
  };
}

// ── Floor 20: Wolf-Man ────────────────────────────────────
// Map 30x25. 10x10 arena with 4 pillar walls, 2 side rooms with 2 white-wolf each.

function buildFloor20(
  dungeonId: string,
  depth: number,
  difficulty: Difficulty,
): { floor: Floor; playerStart: Vector2 } {
  const W = 30,
    H = 25;
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
  carveH(tiles, 19, 23, 12);

  // Entry -> arena corridor
  carveV(tiles, 4, 8, 15);

  // Stairs up at entry
  tiles[2][15] = stairsUp();
  const playerStart: Vector2 = { x: 15, y: 2 };

  // Corridor: arena south -> stairs down
  carveV(tiles, 17, 19, 15);
  // Stairs down south of arena
  tiles[19][15] = stairsDown();

  const monsters = [];
  const items: PlacedItem[] = [];

  // Boss in arena center
  const bossTpl = getBossForFloor(depth);
  if (bossTpl) {
    monsters.push(
      createMonster(bossTpl, { x: 15, y: 13 }, depth, rand01, difficulty),
    );
  }

  // 2 white-wolf per side room
  const whiteWolf = MONSTER_BY_ID["white-wolf"];
  if (whiteWolf) {
    monsters.push(
      createMonster(whiteWolf, { x: 3, y: 11 }, depth, rand01, difficulty),
    );
    monsters.push(
      createMonster(whiteWolf, { x: 5, y: 13 }, depth, rand01, difficulty),
    );
    monsters.push(
      createMonster(whiteWolf, { x: 25, y: 11 }, depth, rand01, difficulty),
    );
    monsters.push(
      createMonster(whiteWolf, { x: 26, y: 13 }, depth, rand01, difficulty),
    );
  }

  placeLoot(
    tiles,
    items,
    depth,
    [
      { x: 11, y: 9 },
      { x: 18, y: 9 },
      { x: 14, y: 16 },
    ],
    3,
  );

  return {
    floor: {
      id: `${dungeonId}-20`,
      tiles,
      monsters,
      items,
      explored: initBoolGrid(W, H),
      visible: initBoolGrid(W, H),
      lit: initBoolGrid(W, H),
      decals: [],
      width: W,
      height: H,
    },
    playerStart,
  };
}

// ── Floor 25: Frost Giant King ────────────────────────────
// Map 40x30. Entry -> left wing -> right wing -> boss chamber 14x10.

function buildFloor25(
  dungeonId: string,
  depth: number,
  difficulty: Difficulty,
): { floor: Floor; playerStart: Vector2 } {
  const W = 40,
    H = 30;
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
    monsters.push(
      createMonster(bossTpl, { x: 28, y: 15 }, depth, rand01, difficulty),
    );
  }

  // 4 frost-giants spread across wings and chamber
  const frostGiant = MONSTER_BY_ID["frost-giant"];
  if (frostGiant) {
    monsters.push(
      createMonster(frostGiant, { x: 9, y: 22 }, depth, rand01, difficulty),
    );
    monsters.push(
      createMonster(frostGiant, { x: 14, y: 23 }, depth, rand01, difficulty),
    );
    monsters.push(
      createMonster(frostGiant, { x: 24, y: 12 }, depth, rand01, difficulty),
    );
    monsters.push(
      createMonster(frostGiant, { x: 33, y: 18 }, depth, rand01, difficulty),
    );
  }

  // 2 ice-devils in left wing
  const iceDevil = MONSTER_BY_ID["ice-devil"];
  if (iceDevil) {
    monsters.push(
      createMonster(iceDevil, { x: 10, y: 7 }, depth, rand01, difficulty),
    );
    monsters.push(
      createMonster(iceDevil, { x: 14, y: 9 }, depth, rand01, difficulty),
    );
  }

  placeLoot(
    tiles,
    items,
    depth,
    [
      { x: 3, y: 13 },
      { x: 9, y: 6 },
      { x: 13, y: 21 },
      { x: 23, y: 11 },
    ],
    4,
  );

  return {
    floor: {
      id: `${dungeonId}-25`,
      tiles,
      monsters,
      items,
      explored: initBoolGrid(W, H),
      visible: initBoolGrid(W, H),
      lit: initBoolGrid(W, H),
      decals: [],
      width: W,
      height: H,
    },
    playerStart,
  };
}

// ── Floor 30: Surtur (final boss) ─────────────────────────
// Map 45x35. Entry hall -> left/right guardian chambers -> grand corridor -> throne room 16x14.

function buildFloor30(
  dungeonId: string,
  depth: number,
  difficulty: Difficulty,
): { floor: Floor; playerStart: Vector2 } {
  const W = 45,
    H = 35;
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
    monsters.push(
      createMonster(bossTpl, { x: 28, y: 17 }, depth, rand01, difficulty),
    );
  }

  // 3 fire giants as guardians
  const fireGiant = MONSTER_BY_ID["fire-giant"];
  if (fireGiant) {
    monsters.push(
      createMonster(fireGiant, { x: 10, y: 8 }, depth, rand01, difficulty),
    );
    monsters.push(
      createMonster(fireGiant, { x: 14, y: 9 }, depth, rand01, difficulty),
    );
    monsters.push(
      createMonster(fireGiant, { x: 10, y: 26 }, depth, rand01, difficulty),
    );
  }

  // 2 abyss-fiends in throne room
  const abyssFiend = MONSTER_BY_ID["abyss-fiend"];
  if (abyssFiend) {
    monsters.push(
      createMonster(abyssFiend, { x: 23, y: 12 }, depth, rand01, difficulty),
    );
    monsters.push(
      createMonster(abyssFiend, { x: 34, y: 20 }, depth, rand01, difficulty),
    );
  }

  placeLoot(
    tiles,
    items,
    depth,
    [
      { x: 3, y: 15 },
      { x: 9, y: 7 },
      { x: 14, y: 25 },
      { x: 22, y: 11 },
      { x: 35, y: 11 },
      { x: 22, y: 22 },
    ],
    6,
  );

  return {
    floor: {
      id: `${dungeonId}-30`,
      tiles,
      monsters,
      items,
      explored: initBoolGrid(W, H),
      visible: initBoolGrid(W, H),
      lit: initBoolGrid(W, H),
      decals: [],
      width: W,
      height: H,
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
  ts = TILESETS[getDungeonForFloor(floorNum)] ?? TILESETS["mine"];

  // Use floorNum for boss/monster lookups, depth for scaling
  let result: { floor: Floor; playerStart: Vector2 } | null = null;
  switch (floorNum) {
    case 5:
      result = buildFloor5(dungeonId, floorNum, difficulty);
      break;
    case 10:
      result = buildFloor10(dungeonId, floorNum, difficulty);
      break;
    case 15:
      result = buildFloor15(dungeonId, floorNum, difficulty);
      break;
    case 20:
      result = buildFloor20(dungeonId, floorNum, difficulty);
      break;
    case 25:
      result = buildFloor25(dungeonId, floorNum, difficulty);
      break;
    case 30:
      result = buildFloor30(dungeonId, floorNum, difficulty);
      break;
  }

  // Add decorative elements to boss floors
  if (result) {
    const decorCount = floorNum >= 30 ? 8 : floorNum >= 20 ? 6 : 4;
    decorateBossFloor(
      result.floor.tiles,
      depth,
      result.playerStart,
      decorCount,
      result.floor.items,
    );
  }

  return result;
}
