import type { Floor, Tile, Vector2 } from '../../core/types';

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
  return { type: 'wall', sprite: 'tile-dark-dungeon', walkable: false, transparent: false };
}

function createFloorTile(): Tile {
  return { type: 'floor', sprite: 'tile-lit-dungeon', walkable: true, transparent: true };
}

function createDoorTile(): Tile {
  return { type: 'door-closed', sprite: 'tile-door-closed', walkable: true, transparent: false };
}

function createStairsTile(direction: 'up' | 'down'): Tile {
  return {
    type: direction === 'up' ? 'stairs-up' : 'stairs-down',
    sprite: direction === 'up' ? 'tile-stairs-up' : 'tile-stairs-down',
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
  hasStairsDown: boolean = true
): { floor: Floor; playerStart: Vector2 } {
  const rand = seededRandom(seed + floorNum * 1000);
  const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

  // Initialize grid with walls
  const tiles: Tile[][] = [];
  const explored: boolean[][] = [];
  const visible: boolean[][] = [];

  for (let y = 0; y < FLOOR_HEIGHT; y++) {
    tiles[y] = [];
    explored[y] = [];
    visible[y] = [];
    for (let x = 0; x < FLOOR_WIDTH; x++) {
      tiles[y][x] = createWallTile();
      explored[y][x] = false;
      visible[y][x] = false;
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
    width: FLOOR_WIDTH,
    height: FLOOR_HEIGHT,
  };

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
  // Check each edge tile of the room for corridor connections
  const edges: Vector2[] = [];

  for (let x = room.x; x < room.x + room.w; x++) {
    if (room.y > 0) edges.push({ x, y: room.y });
    if (room.y + room.h < tiles.length) edges.push({ x, y: room.y + room.h - 1 });
  }
  for (let y = room.y; y < room.y + room.h; y++) {
    if (room.x > 0) edges.push({ x: room.x, y });
    if (room.x + room.w < tiles[0].length) edges.push({ x: room.x + room.w - 1, y });
  }

  for (const pos of edges) {
    if (!isCorridorEntrance(tiles, pos, room)) continue;
    if (rand() < 0.3) {
      tiles[pos.y][pos.x] = createDoorTile();
    }
  }
}

function isCorridorEntrance(tiles: Tile[][], pos: Vector2, room: Room): boolean {
  // A corridor entrance is a floor tile on the room boundary
  // where the adjacent tile outside the room is also a floor tile
  const { x, y } = pos;
  const outsidePositions: Vector2[] = [];

  if (y === room.y && y > 0) outsidePositions.push({ x, y: y - 1 });
  if (y === room.y + room.h - 1 && y < tiles.length - 1) outsidePositions.push({ x, y: y + 1 });
  if (x === room.x && x > 0) outsidePositions.push({ x: x - 1, y });
  if (x === room.x + room.w - 1 && x < tiles[0].length - 1) outsidePositions.push({ x: x + 1, y });

  return outsidePositions.some(p => tiles[p.y][p.x].walkable);
}
