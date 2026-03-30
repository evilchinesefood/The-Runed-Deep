import type { Floor } from '../core/types';

let prevVisible: [number, number][] = [];

export function computeFov(floor: Floor, px: number, py: number, radius?: number): void {
  const VIEW_RADIUS = radius ?? 4;

  // Only clear previously-visible tiles (instead of entire grid)
  for (const [y, x] of prevVisible) {
    if (y < floor.height && x < floor.width) floor.visible[y][x] = false;
  }
  prevVisible = [];

  // Player's tile is always visible
  if (py >= 0 && py < floor.height && px >= 0 && px < floor.width) {
    floor.visible[py][px] = true;
    floor.explored[py][px] = true;
    prevVisible.push([py, px]);
  }

  const RAYS = 360;
  for (let i = 0; i < RAYS; i++) {
    const angle = (i / RAYS) * Math.PI * 2;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    let cx = px + 0.5;
    let cy = py + 0.5;

    for (let step = 0; step < VIEW_RADIUS; step++) {
      cx += dx;
      cy += dy;
      const tx = Math.floor(cx);
      const ty = Math.floor(cy);

      if (tx < 0 || tx >= floor.width || ty < 0 || ty >= floor.height) break;

      if (!floor.visible[ty][tx]) {
        floor.visible[ty][tx] = true;
        prevVisible.push([ty, tx]);
      }
      floor.explored[ty][tx] = true;

      if (!floor.tiles[ty][tx].transparent) break;
    }
  }
}
