import type { Floor, Tile, Vector2, Difficulty } from '../../core/types';
import { spawnMonsters } from '../monsters/spawning';

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
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

function createWallTile(): Tile {
  return { type: 'wall', sprite: 'rock', walkable: false, transparent: false };
}

function createFloorTile(): Tile {
  return { type: 'floor', sprite: 'dark-dgn', walkable: true, transparent: true };
}

function createDoorTile(): Tile {
  return { type: 'door-closed', sprite: 'door-closed', walkable: true, transparent: false };
}

function createStairsTile(direction: 'up' | 'down'): Tile {
  return {
    type: direction === 'up' ? 'stairs-up' : 'stairs-down',
    sprite: direction === 'up' ? 'stairs-up' : 'stairs-down',
    walkable: true,
    transparent: true,
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

  // Generate rooms
  const rooms: Room[] = [];
  for (let attempt = 0; attempt < ROOM_ATTEMPTS; attempt++) {
    const w = randInt(MIN_ROOM_SIZE, MAX_ROOM_SIZE);
    const h = randInt(MIN_ROOM_SIZE, MAX_ROOM_SIZE);
    const x = randInt(1, FLOOR_WIDTH - w - 1);
    const y = randInt(1, FLOOR_HEIGHT - h - 1);
    const room: Room = { x, y, w, h };

    if (rooms.every(r => !roomsOverlap(r, room))) {
      rooms.push(room);
    }
  }

  // Carve rooms
  for (const room of rooms) {
    for (let ry = room.y; ry < room.y + room.h; ry++) {
      for (let rx = room.x; rx < room.x + room.w; rx++) {
        tiles[ry][rx] = createFloorTile();
      }
    }
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
    explored,
    visible,
    lit,
    width: FLOOR_WIDTH,
    height: FLOOR_HEIGHT,
  };

  // Spawn monsters appropriate for this depth
  // Depth = floorNum + 1 (floor 0 is depth 1)
  const effectiveDepth = floorNum + 1;
  floor.monsters = spawnMonsters(floor, effectiveDepth, playerStart, rand, difficulty);

  return { floor, playerStart };
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
    if (isDoorworthy(tiles, pos, room) && rand() < 0.4) {
      tiles[pos.y][pos.x] = createDoorTile();
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
