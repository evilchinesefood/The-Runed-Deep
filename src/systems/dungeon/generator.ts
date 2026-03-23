import type {
  Floor,
  Tile,
  Vector2,
  Difficulty,
  PlacedItem,
} from "../../core/types";
import { spawnMonsters } from "../monsters/spawning";
import { getItemsForDepth } from "../../data/items";
import { createItemFromTemplate, createCopperDrop } from "../items/loot";
import { generateBossFloor } from "./BossFloors";
import { TRAP_TYPES as SHARED_TRAP_TYPES } from "../../data/Traps";

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  shape: "rect" | "cross" | "diamond" | "circle" | "deadend";
}

const FLOOR_WIDTH = 50;
const FLOOR_HEIGHT = 40;
const MIN_ROOM_SIZE = 4;
const MAX_ROOM_SIZE = 10;
const ROOM_ATTEMPTS = 35;
const MIN_ROOMS = 3;

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

import {
  type Tileset,
  TILESETS,
  getDungeonForFloor,
  getTileset,
} from "./Tilesets";
export { getDungeonForFloor, TILESETS, type Tileset } from "./Tilesets";

let activeTileset: Tileset = TILESETS["mine"];

function createWallTile(): Tile {
  return {
    type: "wall",
    sprite: activeTileset.wall,
    walkable: false,
    transparent: false,
  };
}

function createFloorTile(): Tile {
  return {
    type: "floor",
    sprite: activeTileset.floor,
    walkable: true,
    transparent: true,
  };
}

function createDoorTile(): Tile {
  return {
    type: "door-closed",
    sprite: "door-closed",
    walkable: false,
    transparent: false,
  };
}

function createLockedDoorTile(): Tile {
  return {
    type: "door-locked",
    sprite: "door-closed",
    walkable: false,
    transparent: false,
  };
}

function createSecretDoorTile(): Tile {
  return {
    type: "door-secret",
    sprite: activeTileset.wall,
    walkable: false,
    transparent: false,
  };
}

function createStairsTile(direction: "up" | "down"): Tile {
  return {
    type: direction === "up" ? "stairs-up" : "stairs-down",
    sprite: direction === "up" ? "stairs-up" : "stairs-down",
    walkable: true,
    transparent: true,
  };
}

// Trap definitions with sprites and damage
const TRAP_TYPES = SHARED_TRAP_TYPES;

function createTrapTile(trapType: string): Tile {
  return {
    type: "trap",
    sprite: activeTileset.floor, // looks like floor until revealed
    walkable: true,
    transparent: true,
    trapType,
    trapRevealed: false,
  };
}

function roomsOverlap(a: Room, b: Room, padding: number = 1): boolean {
  return !(
    a.x + a.w + padding <= b.x ||
    b.x + b.w + padding <= a.x ||
    a.y + a.h + padding <= b.y ||
    b.y + b.h + padding <= a.y
  );
}

export function generateFloor(
  dungeonId: string,
  floorNum: number,
  seed: number,
  hasStairsUp: boolean = true,
  hasStairsDown: boolean = true,
  difficulty: Difficulty = "intermediate",
): { floor: Floor; playerStart: Vector2 } {
  const bossFloor = generateBossFloor(
    dungeonId,
    floorNum,
    floorNum + 1,
    difficulty,
  );
  if (bossFloor) return bossFloor;

  // Retry generation up to 5 times if floor fails validation
  for (let retry = 0; retry < 5; retry++) {
    const result = generateFloorAttempt(
      dungeonId,
      floorNum,
      seed + retry * 7919,
      hasStairsUp,
      hasStairsDown,
      difficulty,
    );
    if (result) return result;
  }
  // Last resort: generate with no validation
  return generateFloorAttempt(
    dungeonId,
    floorNum,
    seed + 99999,
    hasStairsUp,
    hasStairsDown,
    difficulty,
    true,
  )!;
}

function generateFloorAttempt(
  dungeonId: string,
  floorNum: number,
  seed: number,
  hasStairsUp: boolean,
  hasStairsDown: boolean,
  difficulty: Difficulty,
  skipValidation = false,
): { floor: Floor; playerStart: Vector2 } | null {
  activeTileset = getTileset(getDungeonForFloor(floorNum));

  const rand = seededRandom(seed + floorNum * 1000);
  const randInt = (min: number, max: number) =>
    Math.floor(rand() * (max - min + 1)) + min;

  // Initialize grid with walls
  const tiles: Tile[][] = [];
  const explored: boolean[][] = [];
  const visible: boolean[][] = [];
  const lit: boolean[][] = [];

  for (let y = 0; y < FLOOR_HEIGHT; y++) {
    tiles[y] = [];
    explored[y] = [];
    visible[y] = [];
    lit[y] = [];
    for (let x = 0; x < FLOOR_WIDTH; x++) {
      tiles[y][x] = createWallTile();
      explored[y][x] = false;
      visible[y][x] = false;
      lit[y][x] = false;
    }
  }

  // Generate rooms with random shapes
  const shapes: Room["shape"][] = [
    "rect",
    "rect",
    "rect",
    "cross",
    "diamond",
    "circle",
    "deadend",
  ];
  const rooms: Room[] = [];
  for (let attempt = 0; attempt < ROOM_ATTEMPTS; attempt++) {
    const shape = shapes[Math.floor(rand() * shapes.length)];
    // Dead-end rooms are small
    const minS = shape === "deadend" ? 3 : MIN_ROOM_SIZE;
    const maxS = shape === "deadend" ? 5 : MAX_ROOM_SIZE;
    // Cross/diamond/circle need at least 5 to look right
    const minShape =
      shape === "cross" || shape === "diamond" || shape === "circle"
        ? Math.max(minS, 5)
        : minS;
    const w = randInt(minShape, maxS);
    const h = randInt(minShape, maxS);
    const x = randInt(1, FLOOR_WIDTH - w - 1);
    const y = randInt(1, FLOOR_HEIGHT - h - 1);
    const room: Room = { x, y, w, h, shape };

    if (rooms.every((r) => !roomsOverlap(r, room))) {
      rooms.push(room);
    }
  }

  // Carve rooms based on shape
  for (const room of rooms) {
    carveRoom(tiles, room);
  }

  // Connect rooms with corridors
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1];
    const b = rooms[i];
    const ax = Math.floor(a.x + a.w / 2);
    const ay = Math.floor(a.y + a.h / 2);
    const bx = Math.floor(b.x + b.w / 2);
    const by = Math.floor(b.y + b.h / 2);

    // L-shaped corridor
    if (rand() < 0.5) {
      carveHorizontal(tiles, ax, bx, ay);
      carveVertical(tiles, ay, by, bx);
    } else {
      carveVertical(tiles, ay, by, ax);
      carveHorizontal(tiles, ax, bx, by);
    }
  }

  // Place doors at room entrances (simple heuristic: corridor meets room edge)
  for (const room of rooms) {
    placeDoors(tiles, room, rand);
  }

  // Place stairs
  let playerStart: Vector2 = {
    x: Math.floor(rooms[0].x + rooms[0].w / 2),
    y: Math.floor(rooms[0].y + rooms[0].h / 2),
  };

  if (hasStairsUp && rooms.length > 0) {
    const r = rooms[0];
    const sx = Math.floor(r.x + r.w / 2);
    const sy = Math.floor(r.y + r.h / 2);
    tiles[sy][sx] = createStairsTile("up");
    playerStart = { x: sx, y: sy };
  }

  if (hasStairsDown && rooms.length > 0) {
    const r = rooms[rooms.length - 1];
    let sx = Math.floor(r.x + r.w / 2);
    let sy = Math.floor(r.y + r.h / 2);
    // If stairs-up is already at this position (single room), offset
    if (tiles[sy][sx].type === "stairs-up") {
      sx = Math.min(r.x + r.w - 1, sx + 2);
      sy = Math.min(r.y + r.h - 1, sy + 2);
    }
    tiles[sy][sx] = createStairsTile("down");
  }

  const floor: Floor = {
    id: `${dungeonId}-${floorNum}`,
    tiles,
    monsters: [],
    items: [],
    decals: [],
    explored,
    visible,
    lit,
    width: FLOOR_WIDTH,
    height: FLOOR_HEIGHT,
  };

  // Spawn monsters appropriate for this depth
  const effectiveDepth = floorNum + 1;
  floor.monsters = spawnMonsters(
    floor,
    effectiveDepth,
    playerStart,
    rand,
    difficulty,
  );

  // Place decorative objects FIRST so items/traps don't spawn on them
  placeDecor(floor, rooms, effectiveDepth, playerStart, rand);

  // Place items/treasure in rooms (only on floor tiles, not decor/water)
  floor.items = placeGroundItems(
    floor,
    rooms,
    effectiveDepth,
    playerStart,
    rand,
  );

  // Place traps in corridors and rooms (not on stairs or player start)
  placeTraps(floor, rooms, effectiveDepth, playerStart, rand);

  // Validate floor quality
  if (!skipValidation) {
    // Must have minimum room count
    if (rooms.length < MIN_ROOMS) return null;

    // Both stairs must exist
    let hasUp = false,
      hasDown = false;
    let stairsUpPos: Vector2 | null = null;
    let stairsDownPos: Vector2 | null = null;
    for (let y = 0; y < FLOOR_HEIGHT; y++) {
      for (let x = 0; x < FLOOR_WIDTH; x++) {
        if (tiles[y][x].type === "stairs-up") {
          hasUp = true;
          stairsUpPos = { x, y };
        }
        if (tiles[y][x].type === "stairs-down") {
          hasDown = true;
          stairsDownPos = { x, y };
        }
      }
    }
    if (hasStairsUp && !hasUp) return null;
    if (hasStairsDown && !hasDown) return null;

    // Stairs must be reachable from each other (simple flood fill)
    if (stairsUpPos && stairsDownPos) {
      if (
        !tilesConnected(
          tiles,
          stairsUpPos,
          stairsDownPos,
          FLOOR_WIDTH,
          FLOOR_HEIGHT,
        )
      )
        return null;
    }
  }

  return { floor, playerStart };
}

/** Flood-fill reachability check between two walkable positions */
function tilesConnected(
  tiles: Tile[][],
  from: Vector2,
  to: Vector2,
  w: number,
  h: number,
): boolean {
  const visited = new Set<string>();
  const queue: Vector2[] = [from];
  visited.add(`${from.x},${from.y}`);

  while (queue.length > 0) {
    const pos = queue.shift()!;
    if (pos.x === to.x && pos.y === to.y) return true;

    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const nx = pos.x + dx;
      const ny = pos.y + dy;
      const key = `${nx},${ny}`;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      if (visited.has(key)) continue;
      if (!tiles[ny][nx].walkable) continue;
      visited.add(key);
      queue.push({ x: nx, y: ny });
    }
  }
  return false;
}

function carveRoom(tiles: Tile[][], room: Room): void {
  switch (room.shape) {
    case "rect":
    default:
      for (let ry = room.y; ry < room.y + room.h; ry++) {
        for (let rx = room.x; rx < room.x + room.w; rx++) {
          tiles[ry][rx] = createFloorTile();
        }
      }
      break;

    case "cross": {
      // Horizontal bar (full width, middle third height)
      const barH = Math.max(2, Math.floor(room.h / 3));
      const barTop = room.y + Math.floor((room.h - barH) / 2);
      for (let ry = barTop; ry < barTop + barH; ry++) {
        for (let rx = room.x; rx < room.x + room.w; rx++) {
          tiles[ry][rx] = createFloorTile();
        }
      }
      // Vertical bar (middle third width, full height)
      const barW = Math.max(2, Math.floor(room.w / 3));
      const barLeft = room.x + Math.floor((room.w - barW) / 2);
      for (let ry = room.y; ry < room.y + room.h; ry++) {
        for (let rx = barLeft; rx < barLeft + barW; rx++) {
          tiles[ry][rx] = createFloorTile();
        }
      }
      break;
    }

    case "diamond": {
      const hw = room.w / 2;
      const hh = room.h / 2;
      for (let ry = room.y; ry < room.y + room.h; ry++) {
        for (let rx = room.x; rx < room.x + room.w; rx++) {
          const dx = Math.abs(rx - room.x - hw + 0.5) / hw;
          const dy = Math.abs(ry - room.y - hh + 0.5) / hh;
          if (dx + dy <= 1.0) {
            tiles[ry][rx] = createFloorTile();
          }
        }
      }
      break;
    }

    case "circle": {
      const hw = room.w / 2;
      const hh = room.h / 2;
      for (let ry = room.y; ry < room.y + room.h; ry++) {
        for (let rx = room.x; rx < room.x + room.w; rx++) {
          const dx = (rx - room.x - hw + 0.5) / hw;
          const dy = (ry - room.y - hh + 0.5) / hh;
          if (dx * dx + dy * dy <= 1.0) {
            tiles[ry][rx] = createFloorTile();
          }
        }
      }
      break;
    }

    case "deadend": {
      // Small room, only 1-2 tiles wide in one dimension
      const narrow = Math.min(room.w, room.h);
      const isVert = room.h > room.w;
      if (isVert) {
        const midX = room.x + Math.floor(room.w / 2);
        for (let ry = room.y; ry < room.y + room.h; ry++) {
          tiles[ry][midX] = createFloorTile();
          if (narrow >= 3) tiles[ry][midX - 1] = createFloorTile();
        }
      } else {
        const midY = room.y + Math.floor(room.h / 2);
        for (let rx = room.x; rx < room.x + room.w; rx++) {
          tiles[midY][rx] = createFloorTile();
          if (narrow >= 3) tiles[midY - 1][rx] = createFloorTile();
        }
      }
      break;
    }
  }
}

function carveHorizontal(
  tiles: Tile[][],
  x1: number,
  x2: number,
  y: number,
): void {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  for (let x = minX; x <= maxX; x++) {
    if (y >= 0 && y < tiles.length && x >= 0 && x < tiles[0].length) {
      tiles[y][x] = createFloorTile();
    }
  }
}

function carveVertical(
  tiles: Tile[][],
  y1: number,
  y2: number,
  x: number,
): void {
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  for (let y = minY; y <= maxY; y++) {
    if (y >= 0 && y < tiles.length && x >= 0 && x < tiles[0].length) {
      tiles[y][x] = createFloorTile();
    }
  }
}

function placeDoors(tiles: Tile[][], room: Room, rand: () => number): void {
  // Find wall tiles that sit between a room floor tile and a corridor floor tile.
  // These are the natural doorway positions — one tile outside the room boundary.
  const wallCandidates: Vector2[] = [];

  // Check tiles just outside each room edge
  // Top edge: row above the room (y = room.y - 1)
  if (room.y > 0) {
    for (let x = room.x; x < room.x + room.w; x++) {
      wallCandidates.push({ x, y: room.y - 1 });
    }
  }
  // Bottom edge: row below the room (y = room.y + room.h)
  if (room.y + room.h < tiles.length) {
    for (let x = room.x; x < room.x + room.w; x++) {
      wallCandidates.push({ x, y: room.y + room.h });
    }
  }
  // Left edge: column left of the room (x = room.x - 1)
  if (room.x > 0) {
    for (let y = room.y; y < room.y + room.h; y++) {
      wallCandidates.push({ x: room.x - 1, y });
    }
  }
  // Right edge: column right of the room (x = room.x + room.w)
  if (room.x + room.w < tiles[0].length) {
    for (let y = room.y; y < room.y + room.h; y++) {
      wallCandidates.push({ x: room.x + room.w, y });
    }
  }

  for (const pos of wallCandidates) {
    const tile = tiles[pos.y][pos.x];
    // Only place doors where corridors have already carved through walls
    if (!tile.walkable) continue;

    // Verify this tile connects a room interior to a corridor
    // (has a room floor neighbor on one side and corridor floor on another)
    if (isDoorworthy(tiles, pos, room)) {
      const roll = rand();
      if (roll < 0.3) {
        tiles[pos.y][pos.x] = createDoorTile(); // 30% normal door
      } else if (roll < 0.38) {
        tiles[pos.y][pos.x] = createLockedDoorTile(); // 8% locked door
      } else if (roll < 0.44) {
        tiles[pos.y][pos.x] = createSecretDoorTile(); // 6% secret door
      }
      // 56% no door (open passage)
    }
  }
}

function isDoorworthy(tiles: Tile[][], pos: Vector2, _room: Room): boolean {
  // A good door position is a floor tile just outside the room that has:
  // - A room floor tile on one side (inside the room)
  // - A floor tile on the opposite side (corridor continuing away)
  // AND is flanked by walls on the perpendicular axis (so it's a narrow passage)
  const { x, y } = pos;
  const h = tiles.length;
  const w = tiles[0].length;

  const up = y > 0 ? tiles[y - 1][x] : null;
  const down = y < h - 1 ? tiles[y + 1][x] : null;
  const left = x > 0 ? tiles[y][x - 1] : null;
  const right = x < w - 1 ? tiles[y][x + 1] : null;

  // Vertical passage: floor above and below, walls left and right
  const verticalPassage =
    up?.walkable === true &&
    down?.walkable === true &&
    !left?.walkable &&
    !right?.walkable;
  // Horizontal passage: floor left and right, walls above and below
  const horizontalPassage =
    left?.walkable === true &&
    right?.walkable === true &&
    !up?.walkable &&
    !down?.walkable;

  return verticalPassage || horizontalPassage;
}

// ============================================================
// Ground item placement
// ============================================================

function placeGroundItems(
  floor: Floor,
  rooms: Room[],
  depth: number,
  playerStart: Vector2,
  rand: () => number,
): PlacedItem[] {
  const items: PlacedItem[] = [];
  const candidates = getItemsForDepth(depth);
  if (candidates.length === 0) return items;

  // Each room has a chance to contain 0-2 items
  // Rooms with secret doors get much higher treasure chance
  for (let r = 0; r < rooms.length; r++) {
    const room = rooms[r];

    // Check if room has any adjacent secret doors
    let hasSecret = false;
    for (let ry = room.y - 1; ry <= room.y + room.h; ry++) {
      for (let rx = room.x - 1; rx <= room.x + room.w; rx++) {
        if (ry >= 0 && ry < floor.height && rx >= 0 && rx < floor.width) {
          if (floor.tiles[ry][rx].type === "door-secret") hasSecret = true;
        }
      }
    }

    const roll = rand();
    // Secret rooms: 70% chance 1-2 items, 30% chance 3 items
    // Normal rooms: 85% empty, 10% 1 item, 5% 2 items
    const itemCount = hasSecret
      ? roll < 0.3
        ? 3
        : roll < 0.7
          ? 2
          : 1
      : roll < 0.85
        ? 0
        : roll < 0.95
          ? 1
          : 2;

    for (let i = 0; i < itemCount; i++) {
      // Pick random floor position in room, not on stairs or player start
      let tries = 0;
      while (tries < 10) {
        const x = Math.floor(room.x + rand() * room.w);
        const y = Math.floor(room.y + rand() * room.h);
        const tile = floor.tiles[y]?.[x];
        if (
          tile?.type === "floor" &&
          !(x === playerStart.x && y === playerStart.y)
        ) {
          // 25% chance copper, 75% chance item
          if (rand() < 0.25) {
            items.push({ item: createCopperDrop(depth), position: { x, y } });
          } else {
            const tpl = candidates[Math.floor(rand() * candidates.length)];
            const item = createItemFromTemplate(tpl, depth);
            // Most ground items are unidentified; 15% chance to be pre-identified
            if (item.category !== "currency" && rand() > 0.15) {
              item.identified = false;
            }
            items.push({ item, position: { x, y } });
          }
          break;
        }
        tries++;
      }
    }
  }

  return items;
}

// ============================================================
// Trap placement
// ============================================================

function placeTraps(
  floor: Floor,
  _rooms: Room[],
  depth: number,
  playerStart: Vector2,
  rand: () => number,
): void {
  // Number of traps scales with depth: 1-2 on early floors, up to 4-6 on deep floors
  const trapCount = Math.floor(1 + depth * 0.3 + rand() * 2);

  // Collect valid trap positions (floor tiles, not stairs, not player start, not doors)
  const validPositions: Vector2[] = [];
  for (let y = 1; y < floor.height - 1; y++) {
    for (let x = 1; x < floor.width - 1; x++) {
      const tile = floor.tiles[y][x];
      if (
        tile.type === "floor" &&
        !(x === playerStart.x && y === playerStart.y) &&
        !floor.items.some((i) => i.position.x === x && i.position.y === y)
      ) {
        validPositions.push({ x, y });
      }
    }
  }

  // Shuffle and pick
  for (let i = validPositions.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [validPositions[i], validPositions[j]] = [
      validPositions[j],
      validPositions[i],
    ];
  }

  const count = Math.min(trapCount, validPositions.length);
  for (let i = 0; i < count; i++) {
    const pos = validPositions[i];
    // Filter traps by depth — stronger traps appear deeper
    const available = TRAP_TYPES.filter((t) => {
      if (t.id === "portal" && depth < 5) return false;
      if (t.id === "lightning" && depth < 10) return false;
      if (t.id === "wind" && depth < 8) return false;
      if (t.id === "rune" && depth < 15) return false;
      if (t.id === "cobweb" && depth < 3) return false;
      return true;
    });
    const trap = available[Math.floor(rand() * available.length)];
    floor.tiles[pos.y][pos.x] = createTrapTile(trap.id);
  }
}

// ── Decorative objects ────────────────────────────────────

interface DecorDef {
  sprite: string;
  walkable: boolean;
  transparent: boolean;
  minDepth: number;
  weight: number;
}

const DECOR_TYPES: DecorDef[] = [
  { sprite: 'pillar-stone', walkable: false, transparent: false, minDepth: 1, weight: 5 },
  { sprite: 'pillar-broken', walkable: true, transparent: true, minDepth: 5, weight: 3 },
  { sprite: 'altar', walkable: false, transparent: true, minDepth: 10, weight: 1 },
  { sprite: 'altar-2', walkable: false, transparent: true, minDepth: 15, weight: 1 },
  { sprite: 'statue', walkable: false, transparent: true, minDepth: 8, weight: 2 },
  { sprite: 'water', walkable: false, transparent: true, minDepth: 1, weight: 3 },
  { sprite: 'stone-coffin', walkable: false, transparent: true, minDepth: 12, weight: 2 },
  { sprite: 'fountain', walkable: false, transparent: true, minDepth: 10, weight: 1 },
];

function placeDecor(
  floor: Floor,
  rooms: Room[],
  depth: number,
  playerStart: Vector2,
  rand: () => number,
): void {
  const available = DECOR_TYPES.filter(d => depth >= d.minDepth);
  if (available.length === 0) return;

  // Weight-based selection
  const totalWeight = available.reduce((s, d) => s + d.weight, 0);
  function pickDecor(): DecorDef {
    let roll = rand() * totalWeight;
    for (const d of available) {
      roll -= d.weight;
      if (roll <= 0) return d;
    }
    return available[available.length - 1];
  }

  // Place 1-3 decor per room (larger rooms get more)
  for (const room of rooms) {
    if (room.w < 5 || room.h < 5) continue; // skip small rooms
    const count = 1 + Math.floor(rand() * Math.min(3, Math.floor(room.w * room.h / 20)));

    for (let i = 0; i < count; i++) {
      // Pick a random floor tile inside the room (not edges)
      for (let tries = 0; tries < 20; tries++) {
        const x = room.x + 1 + Math.floor(rand() * (room.w - 2));
        const y = room.y + 1 + Math.floor(rand() * (room.h - 2));

        if (x <= 0 || x >= floor.width - 1 || y <= 0 || y >= floor.height - 1) continue;
        const tile = floor.tiles[y][x];
        if (tile.type !== 'floor') continue;
        if (x === playerStart.x && y === playerStart.y) continue;
        // Don't place adjacent to stairs
        const adj = [[-1,0],[1,0],[0,-1],[0,1]];
        const nearStairs = adj.some(([dx,dy]) => {
          const t = floor.tiles[y+dy]?.[x+dx];
          return t?.type === 'stairs-up' || t?.type === 'stairs-down';
        });
        if (nearStairs) continue;
        // Don't block if monster is here
        if (floor.monsters.some(m => m.position.x === x && m.position.y === y)) continue;

        const decor = pickDecor();

        // For non-walkable decor, check it won't block a path
        // Count walkable cardinal neighbors — if < 3, it might be a corridor/doorway
        if (!decor.walkable) {
          let walkableNeighbors = 0;
          for (const [dx, dy] of adj) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < floor.width && ny >= 0 && ny < floor.height) {
              if (floor.tiles[ny][nx].walkable) walkableNeighbors++;
            }
          }
          if (walkableNeighbors < 3) continue; // skip — might block a path
        }

        // Water can spread 1-3 tiles
        if (decor.sprite === 'water') {
          const spread = 1 + Math.floor(rand() * 3);
          for (let s = 0; s < spread; s++) {
            const wx = x + Math.floor(rand() * 3) - 1;
            const wy = y + Math.floor(rand() * 3) - 1;
            if (wx > 0 && wx < floor.width - 1 && wy > 0 && wy < floor.height - 1) {
              const wt = floor.tiles[wy][wx];
              if (wt.type === 'floor') {
                floor.tiles[wy][wx] = { type: 'water', sprite: 'water', walkable: false, transparent: true };
              }
            }
          }
          floor.tiles[y][x] = { type: 'water', sprite: 'water', walkable: false, transparent: true };
        } else {
          floor.tiles[y][x] = {
            type: 'decor', sprite: decor.sprite,
            walkable: decor.walkable, transparent: decor.transparent,
          };
        }
        break;
      }
    }
  }
}
