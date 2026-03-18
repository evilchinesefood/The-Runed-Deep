import type { GameState, Vector2 } from '../core/types';
import { showItemTooltip, hideItemTooltip } from '../ui/item-tooltip';

const TILE_SIZE = 32;
const VIEWPORT_TILES_X = 21;  // Odd number so player is centered
const VIEWPORT_TILES_Y = 15;

interface TileCell {
  floor: HTMLElement;    // Bottom layer: terrain tile
  entity: HTMLElement;   // Top layer: monster, hero, or item (transparent bg)
}

export class MapRenderer {
  private container: HTMLElement;
  private cells: TileCell[][] = [];
  private mapContainer: HTMLElement;
  private lastState: GameState | null = null;

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
    this.setupTooltipEvents();
  }

  private initTileGrid(): void {
    for (let y = 0; y < VIEWPORT_TILES_Y; y++) {
      this.cells[y] = [];
      for (let x = 0; x < VIEWPORT_TILES_X; x++) {
        const left = x * TILE_SIZE;
        const top = y * TILE_SIZE;
        const posStyle = `position:absolute;left:${left}px;top:${top}px;width:${TILE_SIZE}px;height:${TILE_SIZE}px;`;

        // Floor layer (bottom)
        const floorEl = document.createElement('div');
        floorEl.style.cssText = posStyle;
        this.mapContainer.appendChild(floorEl);

        // Entity layer (top, transparent background)
        const entityEl = document.createElement('div');
        entityEl.style.cssText = posStyle + 'background-color:transparent;';
        this.mapContainer.appendChild(entityEl);

        this.cells[y][x] = { floor: floorEl, entity: entityEl };
      }
    }
  }

  private setupTooltipEvents(): void {
    this.mapContainer.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.lastState) return;
      const state = this.lastState;
      const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
      const floor = state.floors[floorKey];
      if (!floor) { hideItemTooltip(); return; }

      const worldPos = this.screenToWorld(e.clientX, e.clientY, state.hero.position);
      if (!worldPos) { hideItemTooltip(); return; }

      // Only show tooltip for visible tiles
      const tileVisible = floor.visible[worldPos.y]?.[worldPos.x] || floor.lit[worldPos.y]?.[worldPos.x];
      if (!tileVisible) { hideItemTooltip(); return; }

      const groundItem = floor.items.find(
        i => i.position.x === worldPos.x && i.position.y === worldPos.y
      );
      if (groundItem) {
        showItemTooltip(groundItem.item, e.clientX, e.clientY);
      } else {
        hideItemTooltip();
      }
    });

    this.mapContainer.addEventListener('mouseleave', () => { hideItemTooltip(); });
  }

  render(state: GameState): void {
    if (state.screen !== 'game') return;
    this.lastState = state;

    const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
    const floor = state.floors[floorKey];
    if (!floor) return;

    const cameraX = state.hero.position.x - Math.floor(VIEWPORT_TILES_X / 2);
    const cameraY = state.hero.position.y - Math.floor(VIEWPORT_TILES_Y / 2);

    for (let vy = 0; vy < VIEWPORT_TILES_Y; vy++) {
      for (let vx = 0; vx < VIEWPORT_TILES_X; vx++) {
        const worldX = cameraX + vx;
        const worldY = cameraY + vy;
        const cell = this.cells[vy][vx];

        // Reset both layers
        cell.floor.className = '';
        cell.floor.style.background = '';
        cell.entity.className = '';
        cell.entity.style.display = 'none';

        // Out of bounds — solid black
        if (worldX < 0 || worldX >= floor.width || worldY < 0 || worldY >= floor.height) {
          cell.floor.style.background = '#000';
          cell.floor.style.opacity = '1';
          continue;
        }

        const explored = floor.explored[worldY][worldX];
        const visible = floor.visible[worldY][worldX];
        const isLit = floor.lit[worldY][worldX];

        if (!explored) {
          cell.floor.style.background = '#000';
          cell.floor.style.opacity = '1';
          continue;
        }

        const tile = floor.tiles[worldY][worldX];
        const isWall = tile.type === 'wall';
        const isFloorTile = tile.type === 'floor';

        // Walls only brighten when directly visible, never from permanent lighting
        // Floor tiles brighten from visibility OR permanent Light spell
        const opacity = isWall
          ? (visible ? '1' : '0.5')
          : ((visible || isLit) ? '1' : '0.5');

        // Use lit (blue) floor sprite only for floor tiles with permanent light
        const floorSprite = (isLit && isFloorTile) ? 'lit-dgn' : tile.sprite;

        // Tiles like stairs and doors are overlays on top of the base floor
        const isOverlayTile = tile.type === 'stairs-up' || tile.type === 'stairs-down'
          || tile.type === 'door-closed' || tile.type === 'door-open';

        if (isOverlayTile) {
          cell.floor.className = isLit ? 'lit-dgn' : 'dark-dgn';
          cell.floor.style.opacity = opacity;
          cell.entity.className = tile.sprite;
          cell.entity.style.display = 'block';
          cell.entity.style.opacity = opacity;
        } else {
          cell.floor.className = floorSprite;
          cell.floor.style.opacity = opacity;
        }

        // If visible or permanently lit, show entities (hero/monsters/items)
        if (visible || isLit) {
          // Hero
          if (worldX === state.hero.position.x && worldY === state.hero.position.y) {
            cell.entity.className = state.hero.gender === 'male' ? 'male-hero' : 'female-hero';
            cell.entity.style.display = 'block';
            cell.entity.style.opacity = '1';
            continue;
          }

          // Monsters
          const monster = floor.monsters.find(
            m => m.position.x === worldX && m.position.y === worldY
          );
          if (monster) {
            cell.entity.className = monster.sprite;
            cell.entity.style.display = 'block';
            cell.entity.style.opacity = '1';
            continue;
          }

          // Items on ground
          const item = floor.items.find(
            i => i.position.x === worldX && i.position.y === worldY
          );
          if (item) {
            cell.entity.className = item.item.sprite;
            cell.entity.style.display = 'block';
            cell.entity.style.opacity = '1';
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
