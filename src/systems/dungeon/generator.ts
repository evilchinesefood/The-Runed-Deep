import type { Floor, Tile, Vector2, Difficulty, PlacedItem } from '../../core/types';
import { spawnMonsters } from '../monsters/spawning';
import { getItemsForDepth } from '../../data/items';
import { createItemFromTemplate, createCopperDrop } from '../items/loot';
import { generateBossFloor } from './BossFloors';

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  shape: 'rect' | 'cross' | 'diamond' | 'circle' | 'deadend';
}

const FLOOR_WIDTH = 50;
const FLOOR_HEIGHT = 40;
const MIN_ROOM_SIZE = 4;
const MAX_ROOM_SIZE = 10;
const ROOM_ATTEMPTS = 20;

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ── Tileset per dungeon tier ─────────────────────────────
export interface Tileset {
  floor: string;
  wall: string;
  litFloor: string;
}

export const TILESETS: Record<string, Tileset> = {
  mine:     { floor: 'dark-dgn', wall: 'rock', litFloor: 'lit-dgn' },
  fortress: { floor: 'dark-dgn', wall: 'wall-dark-dgn', litFloor: 'lit-dgn' },
  castle:   { floor: 'dark-dgn', wall: 'castle-wall', litFloor: 'lit-dgn' },
};

/** Get the dungeon ID for a given floor number (0-indexed) */
export function getDungeonForFloor(floorNum: number): 'mine' | 'fortress' | 'castle' {
  const depth = floorNum + 1;
  if (depth <= 13) return 'mine';
  if (depth <= 26) return 'fortress';
  return 'castle';
}

function getTileset(dungeonId: string): Tileset {
  return TILESETS[dungeonId] ?? TILESETS['mine'];
}

let activeTileset: Tileset = TILESETS['mine'];

function createWallTile(): Tile {
  return { type: 'wall', sprite: activeTileset.wall, walkable: false, transparent: false };
}

function createFloorTile(): Tile {
  return { type: 'floor', sprite: activeTileset.floor, walkable: true, transparent: true };
}

function createDoorTile(): Tile {
  return { type: 'door-closed', sprite: 'door-closed', walkable: false, transparent: false };
}

function createLockedDoorTile(): Tile {
  return { type: 'door-locked', sprite: 'door-closed', walkable: false, transparent: false };
}

function createSecretDoorTile(): Tile {
  return { type: 'door-secret', sprite: activeTileset.wall, walkable: false, transparent: false };
}

function createStairsTile(direction: 'up' | 'down'): Tile {
  return {
    type: direction === 'up' ? 'stairs-up' : 'stairs-down',
    sprite: direction === 'up' ? 'stairs-up' : 'stairs-down',
    walkable: true,
    transparent: true,
  };
}

// Trap definitions with sprites and damage
const TRAP_TYPES = [
  { id: 'pit', sprite: 'pit-trap', damage: [3, 8], message: 'You fall into a pit!' },
  { id: 'arrow', sprite: 'arrow-trap', damage: [2, 6], message: 'An arrow shoots from the wall!' },
  { id: 'fire', sprite: 'fire-trap', damage: [4, 10], message: 'Flames erupt beneath you!' },
  { id: 'dart', sprite: 'dart-trap', damage: [1, 4], message: 'A dart flies from a hidden slot!' },
  { id: 'portal', sprite: 'portal-trap', damage: [0, 0], message: 'A portal pulls you across the room!' },
  { id: 'acid', sprite: 'acid-trap', damage: [3, 9], message: 'Acid sprays from the floor!' },
];

function createTrapTile(trapType: string): Tile {
  return {
    type: 'trap',
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
  difficulty: Difficulty = 'intermediate',
): { floor: Floor; playerStart: Vector2 } {
  // Set tileset based on dungeon tier
  activeTileset = getTileset(getDungeonForFloor(floorNum));

  const bossFloor = generateBossFloor(dungeonId, floorNum, floorNum + 1, difficulty);
  if (bossFloor) return bossFloor;

  const rand = seededRandom(seed + floorNum * 1000);
  const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

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
  const shapes: Room['shape'][] = ['rect', 'rect', 'rect', 'cross', 'diamond', 'circle', 'deadend'];
  const rooms: Room[] = [];
  for (let attempt = 0; attempt < ROOM_ATTEMPTS; attempt++) {
    const shape = shapes[Math.floor(rand() * shapes.length)];
    // Dead-end rooms are small
    const minS = shape === 'deadend' ? 3 : MIN_ROOM_SIZE;
    const maxS = shape === 'deadend' ? 5 : MAX_ROOM_SIZE;
    // Cross/diamond/circle need at least 5 to look right
    const minShape = (shape === 'cross' || shape === 'diamond' || shape === 'circle') ? Math.max(minS, 5) : minS;
    const w = randInt(minShape, maxS);
    const h = randInt(minShape, maxS);
    const x = randInt(1, FLOOR_WIDTH - w - 1);
    const y = randInt(1, FLOOR_HEIGHT - h - 1);
    const room: Room = { x, y, w, h, shape };

    if (rooms.every(r => !roomsOverlap(r, room))) {
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
  let playerStart: Vector2 = { x: Math.floor(rooms[0].x + rooms[0].w / 2), y: Math.floor(rooms[0].y + rooms[0].h / 2) };

  if (hasStairsUp && rooms.length > 0) {
    const r = rooms[0];
    const sx = Math.floor(r.x + r.w / 2);
    const sy = Math.floor(r.y + r.h / 2);
    tiles[sy][sx] = createStairsTile('up');
    playerStart = { x: sx, y: sy };
  }

  if (hasStairsDown && rooms.length > 1) {
    const r = rooms[rooms.length - 1];
    const sx = Math.floor(r.x + r.w / 2);
    const sy = Math.floor(r.y + r.h / 2);
    tiles[sy][sx] = createStairsTile('down');
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
  floor.monsters = spawnMonsters(floor, effectiveDepth, playerStart, rand, difficulty);

  // Place items/treasure in rooms
  floor.items = placeGroundItems(floor, rooms, effectiveDepth, playerStart, rand);

  // Place traps in corridors and rooms (not on stairs or player start)
  placeTraps(floor, rooms, effectiveDepth, playerStart, rand);

  return { floor, playerStart };
}

function carveRoom(tiles: Tile[][], room: Room): void {

  switch (room.shape) {
    case 'rect':
    default:
      for (let ry = room.y; ry < room.y + room.h; ry++) {
        for (let rx = room.x; rx < room.x + room.w; rx++) {
          tiles[ry][rx] = createFloorTile();
        }
      }
      break;

    case 'cross': {
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

    case 'diamond': {
      const hw = room.w / 2;
      const hh = room.h / 2;
      for (let ry = room.y; ry < room.y + room.h; ry++) {
        for (let rx = room.x; rx < room.x + room.w; rx++) {
          const dx = Math.abs((rx - room.x) - hw + 0.5) / hw;
          const dy = Math.abs((ry - room.y) - hh + 0.5) / hh;
          if (dx + dy <= 1.0) {
            tiles[ry][rx] = createFloorTile();
          }
        }
      }
      break;
    }

    case 'circle': {
      const hw = room.w / 2;
      const hh = room.h / 2;
      for (let ry = room.y; ry < room.y + room.h; ry++) {
        for (let rx = room.x; rx < room.x + room.w; rx++) {
          const dx = ((rx - room.x) - hw + 0.5) / hw;
          const dy = ((ry - room.y) - hh + 0.5) / hh;
          if (dx * dx + dy * dy <= 1.0) {
            tiles[ry][rx] = createFloorTile();
          }
        }
      }
      break;
    }

    case 'deadend': {
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

function carveHorizontal(tiles: Tile[][], x1: number, x2: number, y: number): void {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  for (let x = minX; x <= maxX; x++) {
    if (y >= 0 && y < tiles.length && x >= 0 && x < tiles[0].length) {
      tiles[y][x] = createFloorTile();
    }
  }
}

function carveVertical(tiles: Tile[][], y1: number, y2: number, x: number): void {
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
      if (roll < 0.30) {
        tiles[pos.y][pos.x] = createDoorTile();        // 30% normal door
      } else if (roll < 0.38) {
        tiles[pos.y][pos.x] = createLockedDoorTile();   // 8% locked door
      } else if (roll < 0.44) {
        tiles[pos.y][pos.x] = createSecretDoorTile();   // 6% secret door
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
  const verticalPassage = (up?.walkable === true) && (down?.walkable === true)
    && !(left?.walkable) && !(right?.walkable);
  // Horizontal passage: floor left and right, walls above and below
  const horizontalPassage = (left?.walkable === true) && (right?.walkable === true)
    && !(up?.walkable) && !(down?.walkable);

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
          if (floor.tiles[ry][rx].type === 'door-secret') hasSecret = true;
        }
      }
    }

    const roll = rand();
    // Secret rooms: 70% chance 1-2 items, 30% chance 3 items
    // Normal rooms: 85% empty, 10% 1 item, 5% 2 items
    const itemCount = hasSecret
      ? (roll < 0.30 ? 3 : roll < 0.70 ? 2 : 1)
      : (roll < 0.85 ? 0 : roll < 0.95 ? 1 : 2);

    for (let i = 0; i < itemCount; i++) {
      // Pick random floor position in room, not on stairs or player start
      let tries = 0;
      while (tries < 10) {
        const x = Math.floor(room.x + rand() * room.w);
        const y = Math.floor(room.y + rand() * room.h);
        const tile = floor.tiles[y]?.[x];
        if (tile?.type === 'floor' && !(x === playerStart.x && y === playerStart.y)) {
          // 25% chance copper, 75% chance item
          if (rand() < 0.25) {
            items.push({ item: createCopperDrop(depth), position: { x, y } });
          } else {
            const tpl = candidates[Math.floor(rand() * candidates.length)];
            const item = createItemFromTemplate(tpl, depth);
            // Most ground items are unidentified; 15% chance to be pre-identified
            if (item.category !== 'currency' && rand() > 0.15) {
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
      if (tile.type === 'floor'
        && !(x === playerStart.x && y === playerStart.y)
        && !floor.items.some(i => i.position.x === x && i.position.y === y)) {
        validPositions.push({ x, y });
      }
    }
  }

  // Shuffle and pick
  for (let i = validPositions.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [validPositions[i], validPositions[j]] = [validPositions[j], validPositions[i]];
  }

  const count = Math.min(trapCount, validPositions.length);
  for (let i = 0; i < count; i++) {
    const pos = validPositions[i];
    // Pick trap type — portal traps only appear on deeper floors
    const available = depth < 5
      ? TRAP_TYPES.filter(t => t.id !== 'portal')
      : TRAP_TYPES;
    const trap = available[Math.floor(rand() * available.length)];
    floor.tiles[pos.y][pos.x] = createTrapTile(trap.id);
  }
}
