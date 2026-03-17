import type { GameState, Vector2 } from '../core/types';

const TILE_SIZE = 32;
const VIEWPORT_TILES_X = 21;  // Odd number so player is centered
const VIEWPORT_TILES_Y = 15;

export class MapRenderer {
  private container: HTMLElement;
  private tileElements: HTMLElement[][] = [];
  private mapContainer: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;

    this.mapContainer = document.createElement('div');
    this.mapContainer.className = 'game-map';
    this.mapContainer.style.cssText = `
      position: relative;
      width: ${VIEWPORT_TILES_X * TILE_SIZE}px;
      height: ${VIEWPORT_TILES_Y * TILE_SIZE}px;
      overflow: hidden;
      margin: 0 auto;
      background: #000;
    `;
    this.container.appendChild(this.mapContainer);

    this.initTileGrid();
  }

  private initTileGrid(): void {
    for (let y = 0; y < VIEWPORT_TILES_Y; y++) {
      this.tileElements[y] = [];
      for (let x = 0; x < VIEWPORT_TILES_X; x++) {
        const el = document.createElement('div');
        el.style.cssText = `
          position: absolute;
          left: ${x * TILE_SIZE}px;
          top: ${y * TILE_SIZE}px;
          width: ${TILE_SIZE}px;
          height: ${TILE_SIZE}px;
        `;
        this.mapContainer.appendChild(el);
        this.tileElements[y][x] = el;
      }
    }
  }

  render(state: GameState): void {
    if (state.screen !== 'game') return;

    const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
    const floor = state.floors[floorKey];
    if (!floor) return;

    const cameraX = state.hero.position.x - Math.floor(VIEWPORT_TILES_X / 2);
    const cameraY = state.hero.position.y - Math.floor(VIEWPORT_TILES_Y / 2);

    for (let vy = 0; vy < VIEWPORT_TILES_Y; vy++) {
      for (let vx = 0; vx < VIEWPORT_TILES_X; vx++) {
        const worldX = cameraX + vx;
        const worldY = cameraY + vy;
        const el = this.tileElements[vy][vx];

        // Clear previous classes (keep only positional style)
        el.className = '';

        // Out of bounds
        if (worldX < 0 || worldX >= floor.width || worldY < 0 || worldY >= floor.height) {
          el.className = 'tile-rock';
          el.style.opacity = '1';
          continue;
        }

        const explored = floor.explored[worldY][worldX];
        const visible = floor.visible[worldY][worldX];

        if (!explored) {
          el.className = '';
          el.style.opacity = '0';
          continue;
        }

        // Render floor tile
        const tile = floor.tiles[worldY][worldX];
        el.className = tile.sprite;
        el.style.opacity = visible ? '1' : '0.4';

        // If visible, check for entities on this tile
        if (visible) {
          // Hero
          if (worldX === state.hero.position.x && worldY === state.hero.position.y) {
            el.className = state.hero.gender === 'male' ? 'monster-male-hero' : 'monster-female-hero';
            el.style.opacity = '1';
            continue;
          }

          // Monsters
          const monster = floor.monsters.find(
            m => m.position.x === worldX && m.position.y === worldY
          );
          if (monster) {
            el.className = monster.sprite;
            continue;
          }

          // Items on ground
          const item = floor.items.find(
            i => i.position.x === worldX && i.position.y === worldY
          );
          if (item) {
            el.className = item.item.sprite;
            continue;
          }
        }
      }
    }
  }

  getMapContainer(): HTMLElement {
    return this.mapContainer;
  }

  /** Convert a click/tap position on the map to world coordinates */
  screenToWorld(screenX: number, screenY: number, heroPos: Vector2): Vector2 | null {
    const rect = this.mapContainer.getBoundingClientRect();
    const localX = screenX - rect.left;
    const localY = screenY - rect.top;

    if (localX < 0 || localY < 0 || localX >= rect.width || localY >= rect.height) {
      return null;
    }

    const tileX = Math.floor(localX / TILE_SIZE);
    const tileY = Math.floor(localY / TILE_SIZE);

    const cameraX = heroPos.x - Math.floor(VIEWPORT_TILES_X / 2);
    const cameraY = heroPos.y - Math.floor(VIEWPORT_TILES_Y / 2);

    return {
      x: cameraX + tileX,
      y: cameraY + tileY,
    };
  }
}
