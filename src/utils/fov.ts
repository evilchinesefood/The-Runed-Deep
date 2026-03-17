import type { Floor } from '../core/types';

const VIEW_RADIUS_NORMAL = 4;
const VIEW_RADIUS_LIT = 10;

/**
 * Simple raycasting field-of-view.
 * Casts rays from the player outward in all directions,
 * marking tiles as visible until hitting a non-transparent tile.
 * If `hasLight` is true, uses extended radius.
 */
export function computeFov(floor: Floor, px: number, py: number, hasLight: boolean = false): void {
  const VIEW_RADIUS = hasLight ? VIEW_RADIUS_LIT : VIEW_RADIUS_NORMAL;
  // Reset visibility
  for (let y = 0; y < floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      floor.visible[y][x] = false;
    }
  }

  // Player's tile is always visible
  if (py >= 0 && py < floor.height && px >= 0 && px < floor.width) {
    floor.visible[py][px] = true;
    floor.explored[py][px] = true;
  }

  // Cast rays in 360 degrees
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

      floor.visible[ty][tx] = true;
      floor.explored[ty][tx] = true;

      // Light spell permanently illuminates visible tiles
      if (hasLight) {
        floor.lit[ty][tx] = true;
      }

      if (!floor.tiles[ty][tx].transparent) break;
    }
  }
}
