import type { Floor, Vector2 } from '../core/types';

class MinHeap<T> {
  private h: T[] = [];
  constructor(private less: (a: T, b: T) => boolean) {}
  get size() { return this.h.length; }
  push(v: T) {
    this.h.push(v);
    let i = this.h.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(this.h[i], this.h[p])) break;
      [this.h[i], this.h[p]] = [this.h[p], this.h[i]];
      i = p;
    }
  }
  pop(): T {
    const top = this.h[0];
    const last = this.h.pop()!;
    if (this.h.length > 0) {
      this.h[0] = last;
      let i = 0;
      while (true) {
        let s = i, l = 2 * i + 1, r = 2 * i + 2;
        if (l < this.h.length && this.less(this.h[l], this.h[s])) s = l;
        if (r < this.h.length && this.less(this.h[r], this.h[s])) s = r;
        if (s === i) break;
        [this.h[i], this.h[s]] = [this.h[s], this.h[i]];
        i = s;
      }
    }
    return top;
  }
}

interface Node {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}

function heuristic(a: Vector2, b: Vector2): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

const DIRS = [
  { x: 0, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 },
  { x: 0, y: 1 }, { x: -1, y: 1 }, { x: -1, y: 0 }, { x: -1, y: -1 },
];

export function findPath(floor: Floor, start: Vector2, goal: Vector2, maxSteps = 30): Vector2[] {
  if (start.x === goal.x && start.y === goal.y) return [];

  const w = floor.width, fh = floor.height;
  const closed = new Uint8Array(w * fh);
  const gScore = Array.from({ length: fh }, () => new Float64Array(w).fill(Infinity));
  gScore[start.y][start.x] = 0;

  // Pre-build monster occupancy grid
  const monsterOcc = new Uint8Array(w * fh);
  for (const m of floor.monsters) monsterOcc[m.position.y * w + m.position.x] = 1;

  const open = new MinHeap<Node>((a, b) => a.f < b.f);
  const startNode: Node = {
    x: start.x, y: start.y,
    g: 0, h: heuristic(start, goal), f: 0, parent: null,
  };
  startNode.f = startNode.h;
  open.push(startNode);

  let iterations = 0;
  const maxIterations = maxSteps * maxSteps;

  while (open.size > 0 && iterations < maxIterations) {
    iterations++;

    const current = open.pop()!;
    const ci = current.y * w + current.x;

    if (current.x === goal.x && current.y === goal.y) {
      const path: Vector2[] = [];
      let node: Node | null = current;
      while (node && !(node.x === start.x && node.y === start.y)) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path;
    }

    if (closed[ci]) continue;
    closed[ci] = 1;

    for (const dir of DIRS) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;

      if (nx < 0 || nx >= w || ny < 0 || ny >= fh) continue;
      if (closed[ny * w + nx]) continue;

      const tile = floor.tiles[ny][nx];
      if (!tile.walkable && tile.type !== "door-closed") continue;

      if (!(nx === goal.x && ny === goal.y)) {
        if (monsterOcc[ny * w + nx]) continue;
      }

      if (!floor.explored[ny][nx]) continue;

      const tentativeG = current.g + 1;
      if (tentativeG >= gScore[ny][nx]) continue;
      gScore[ny][nx] = tentativeG;

      const h2 = heuristic({ x: nx, y: ny }, goal);
      open.push({ x: nx, y: ny, g: tentativeG, h: h2, f: tentativeG + h2, parent: current });
    }
  }

  return [];
}
