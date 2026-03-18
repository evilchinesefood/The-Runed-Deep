import type { Floor, Vector2 } from '../core/types';

interface Node {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}

function heuristic(a: Vector2, b: Vector2): number {
  // Chebyshev distance (allows diagonal movement)
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

const DIRS = [
  { x: 0, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 },
  { x: 0, y: 1 }, { x: -1, y: 1 }, { x: -1, y: 0 }, { x: -1, y: -1 },
];

/**
 * A* pathfinding. Returns array of positions from start to goal (excluding start).
 * Returns empty array if no path found. Avoids monsters.
 * Max search distance to prevent lag on large maps.
 */
export function findPath(floor: Floor, start: Vector2, goal: Vector2, maxSteps = 30): Vector2[] {
  if (start.x === goal.x && start.y === goal.y) return [];

  const key = (x: number, y: number) => `${x},${y}`;
  const open: Node[] = [];
  const closed = new Set<string>();

  const startNode: Node = {
    x: start.x, y: start.y,
    g: 0, h: heuristic(start, goal), f: 0, parent: null,
  };
  startNode.f = startNode.h;
  open.push(startNode);

  let iterations = 0;
  const maxIterations = maxSteps * maxSteps;

  while (open.length > 0 && iterations < maxIterations) {
    iterations++;

    // Find lowest f
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bestIdx].f) bestIdx = i;
    }
    const current = open.splice(bestIdx, 1)[0];
    const ck = key(current.x, current.y);

    if (current.x === goal.x && current.y === goal.y) {
      // Reconstruct path
      const path: Vector2[] = [];
      let node: Node | null = current;
      while (node && !(node.x === start.x && node.y === start.y)) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path;
    }

    closed.add(ck);

    for (const dir of DIRS) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;
      const nk = key(nx, ny);

      if (closed.has(nk)) continue;
      if (nx < 0 || nx >= floor.width || ny < 0 || ny >= floor.height) continue;

      const tile = floor.tiles[ny][nx];
      if (!tile.walkable) continue;

      // Allow moving to goal even if monster is there (to attack it)
      if (!(nx === goal.x && ny === goal.y)) {
        if (floor.monsters.some(m => m.position.x === nx && m.position.y === ny)) continue;
      }

      // Only path through explored tiles (don't path through fog)
      if (!floor.explored[ny][nx]) continue;

      const g = current.g + 1;
      const existing = open.find(n => n.x === nx && n.y === ny);
      if (existing && g >= existing.g) continue;

      const h = heuristic({ x: nx, y: ny }, goal);
      const node: Node = { x: nx, y: ny, g, h, f: g + h, parent: current };

      if (existing) {
        existing.g = g;
        existing.f = g + h;
        existing.parent = current;
      } else {
        open.push(node);
      }
    }
  }

  return []; // No path found
}
