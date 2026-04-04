// ============================================================
// Crucible arena generation — single procedural room
// ============================================================

import type { Floor, Tile, Vector2 } from "../../core/types";
import { DUNGEON_THEMES, pickVariant } from "../../data/DungeonThemes";

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

type ShapeFn = (
  cx: number,
  cy: number,
  w: number,
  h: number,
  x: number,
  y: number,
) => boolean;

const SHAPES: ShapeFn[] = [
  // Rectangular
  (cx, cy, w, h, x, y) => {
    const hw = Math.floor(w / 2);
    const hh = Math.floor(h / 2);
    return x >= cx - hw && x <= cx + hw && y >= cy - hh && y <= cy + hh;
  },
  // Oval
  (cx, cy, w, h, x, y) => {
    const rx = w / 2;
    const ry = h / 2;
    const dx = (x - cx) / rx;
    const dy = (y - cy) / ry;
    return dx * dx + dy * dy <= 1;
  },
  // L-shaped (rect with a corner removed)
  (cx, cy, w, h, x, y) => {
    const hw = Math.floor(w / 2);
    const hh = Math.floor(h / 2);
    if (x < cx - hw || x > cx + hw || y < cy - hh || y > cy + hh) return false;
    // Remove top-right quadrant
    if (x > cx && y < cy) return false;
    return true;
  },
];

export function generateCrucibleArena(seed?: number): {
  floor: Floor;
  playerStart: Vector2;
} {
  const rand = seededRandom(seed ?? Date.now());
  const theme = DUNGEON_THEMES[Math.floor(rand() * DUNGEON_THEMES.length)];

  const w = 20 + Math.floor(rand() * 11); // 20-30
  const h = 20 + Math.floor(rand() * 11);
  const mapW = w + 4; // 2-tile border on each side
  const mapH = h + 4;

  const cx = Math.floor(mapW / 2);
  const cy = Math.floor(mapH / 2);

  const shapeFn = SHAPES[Math.floor(rand() * SHAPES.length)];

  // Initialize all walls
  const tiles: Tile[][] = [];
  for (let y = 0; y < mapH; y++) {
    tiles[y] = [];
    for (let x = 0; x < mapW; x++) {
      tiles[y][x] = {
        type: "wall",
        sprite: pickVariant(theme.walls, rand),
        walkable: false,
        transparent: false,
      };
    }
  }

  // Carve arena
  for (let y = 2; y < mapH - 2; y++) {
    for (let x = 2; x < mapW - 2; x++) {
      if (shapeFn(cx, cy, w, h, x, y)) {
        tiles[y][x] = {
          type: "floor",
          sprite: pickVariant(theme.floors, rand),
          walkable: true,
          transparent: true,
        };
      }
    }
  }

  // Place obstacles (3-8 pillars/walls)
  const obstacleCount = 3 + Math.floor(rand() * 6);
  for (let i = 0; i < obstacleCount; i++) {
    const ox = 4 + Math.floor(rand() * (mapW - 8));
    const oy = 4 + Math.floor(rand() * (mapH - 8));
    // Don't block center (player start)
    if (Math.abs(ox - cx) <= 2 && Math.abs(oy - cy) <= 2) continue;
    if (tiles[oy]?.[ox]?.type !== "floor") continue;

    // Pillar: 1x1 or 2x2
    const big = rand() < 0.3;
    const pw = big ? 2 : 1;
    const ph = big ? 2 : 1;
    for (let dy = 0; dy < ph; dy++) {
      for (let dx = 0; dx < pw; dx++) {
        const px = ox + dx;
        const py = oy + dy;
        if (
          py < mapH &&
          px < mapW &&
          tiles[py][px].type === "floor" &&
          !(px === cx && py === cy)
        ) {
          tiles[py][px] = {
            type: "wall",
            sprite: pickVariant(theme.walls, rand),
            walkable: false,
            transparent: false,
          };
        }
      }
    }
  }

  // Ensure center is walkable
  tiles[cy][cx] = {
    type: "floor",
    sprite: pickVariant(theme.floors, rand),
    walkable: true,
    transparent: true,
  };

  const explored = Array.from({ length: mapH }, () => Array(mapW).fill(false));
  const visible = Array.from({ length: mapH }, () => Array(mapW).fill(false));
  const lit = Array.from({ length: mapH }, () => Array(mapW).fill(false));

  const floor: Floor = {
    id: "crucible-0",
    tiles,
    monsters: [],
    items: [],
    decals: [],
    explored,
    visible,
    lit,
    width: mapW,
    height: mapH,
  };

  return { floor, playerStart: { x: cx, y: cy } };
}
