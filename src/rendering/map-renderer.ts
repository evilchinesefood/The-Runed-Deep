import type { GameState, Vector2 } from "../core/types";
import {
  showItemTooltip,
  showPileTooltip,
  hideItemTooltip,
} from "../ui/item-tooltip";
import { getDungeonForFloor, getTileset } from "../systems/dungeon/Tilesets";
import { getThemeForDepth } from "../data/DungeonThemes";
import {
  getDisplaySpriteLayers,
  getItemGlow,
} from "../systems/inventory/display-name";
import { pickItemSprite } from "../systems/items/SpritePool";
import { ITEM_BY_ID } from "../data/items";
import { BUILDING_FLAVORS } from "../systems/town/TownMap";
import { getEquipVisual, EQUIP_RENDER_ORDER } from "../data/EquipVisuals";
import { TOWN_CONFIG } from "../data/TownConfigData";
import { TOWN_BUILDINGS_DATA } from "../data/TownBuildingData";

const TILE_SIZE = 32;

function calcMapScale(): number {
  const w = window.innerWidth;
  if (w <= 380) return 0.625; // 20px effective
  if (w <= 480) return 0.75; // 24px effective
  if (w <= 720) return 0.875; // 28px effective
  return 1;
}

function calcViewportTiles(): { x: number; y: number } {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const scale = calcMapScale();
  const effectiveTile = TILE_SIZE * scale;
  const isLandscape = h <= 500 && w > h;
  const isPortrait = w <= 480 && h > w;

  if (isLandscape) {
    // Landscape: fill the screen, leave 20px top for stats overlay
    let tilesX = Math.floor(w / effectiveTile);
    if (tilesX % 2 === 0) tilesX--;
    tilesX = Math.max(9, Math.min(27, tilesX));
    let tilesY = Math.floor((h - 20) / effectiveTile);
    if (tilesY % 2 === 0) tilesY--;
    tilesY = Math.max(7, Math.min(15, tilesY));
    return { x: tilesX, y: tilesY };
  }

  const sidePad = w <= 480 ? 4 : 16;
  let tilesX = Math.floor(Math.min(w - sidePad, 672) / effectiveTile);
  if (tilesX % 2 === 0) tilesX--;
  tilesX = Math.max(9, Math.min(21, tilesX));

  const hudHeight = w <= 480 ? 160 : 220;
  const touchPadding = isPortrait ? Math.floor(h * 0.25) : 0;
  let tilesY = Math.floor((h - hudHeight - touchPadding) / effectiveTile);
  if (tilesY % 2 === 0) tilesY--;
  tilesY = Math.max(7, Math.min(15, tilesY));
  return { x: tilesX, y: tilesY };
}

const _initVp = calcViewportTiles();
let VIEWPORT_TILES_X = _initVp.x;
let VIEWPORT_TILES_Y = _initVp.y;

interface TileCell {
  floor: HTMLElement; // Bottom layer: terrain tile
  ground: HTMLElement; // Middle layer: items/traps on floor (transparent bg)
  entity: HTMLElement; // Top layer: monster, hero (transparent bg)
}

export class MapRenderer {
  private container: HTMLElement;
  private cells: TileCell[][] = [];
  private mapContainer: HTMLElement;
  private mapWrapper: HTMLElement;
  private lastState: GameState | null = null;
  private scale = 1;
  private _labelCamX = -1;
  private _labelCamY = -1;
  private _prevFloorKey = "";
  private _lastTipX = -1;
  private _lastTipY = -1;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scale = calcMapScale();
    const vp = calcViewportTiles();
    VIEWPORT_TILES_X = vp.x;
    VIEWPORT_TILES_Y = vp.y;

    // Wrapper clips and sizes the scaled map properly
    const isMobileMap = window.innerWidth <= 480;
    this.mapWrapper = document.createElement("div");
    this.mapWrapper.style.cssText = `
      width: ${VIEWPORT_TILES_X * TILE_SIZE * this.scale}px;
      height: ${VIEWPORT_TILES_Y * TILE_SIZE * this.scale}px;
      overflow: hidden;
      margin: ${isMobileMap ? "0" : "0 auto"};
    `;

    this.mapContainer = document.createElement("div");
    this.mapContainer.className = "game-map";
    this.mapContainer.style.cssText = `
      position: relative;
      width: ${VIEWPORT_TILES_X * TILE_SIZE}px;
      height: ${VIEWPORT_TILES_Y * TILE_SIZE}px;
      overflow: hidden;
      background: #000;
      transform-origin: top left;
      transform: scale(${this.scale});
    `;
    this.mapContainer.style.contain = "strict";
    this.mapWrapper.appendChild(this.mapContainer);
    this.container.appendChild(this.mapWrapper);

    // Trap reveal CSS class (avoids inline boxShadow in render loop)
    const trapStyle = document.createElement("style");
    trapStyle.textContent =
      ".trap-revealed{box-shadow:inset 0 0 0 20px rgba(180,40,40,0.3)}";
    document.head.appendChild(trapStyle);

    this.initTileGrid();
    this.setupTooltipEvents();
  }

  /** Set ground cell class — supports multi-layer sprites joined by '|'. */
  private setGroundClass(ground: HTMLElement, gc: string): void {
    while (ground.firstChild) ground.removeChild(ground.firstChild);
    if (gc.indexOf("|") === -1) {
      ground.className = gc;
    } else {
      ground.className = "";
      for (const cls of gc.split("|")) {
        const layer = document.createElement("div");
        layer.className = cls;
        layer.style.cssText =
          "position:absolute;top:0;left:0;width:32px;height:32px;";
        ground.appendChild(layer);
      }
    }
  }

  /** Set entity cell class — supports multi-layer sprites joined by '|'. */
  private setEntityClass(entity: HTMLElement, ec: string): void {
    while (entity.firstChild) entity.removeChild(entity.firstChild);
    if (ec.indexOf("|") === -1) {
      entity.className = ec;
    } else {
      entity.className = "";
      for (const cls of ec.split("|")) {
        const layer = document.createElement("div");
        layer.className = cls;
        layer.style.cssText =
          "position:absolute;top:0;left:0;width:32px;height:32px;";
        entity.appendChild(layer);
      }
    }
  }

  private initTileGrid(): void {
    for (let y = 0; y < VIEWPORT_TILES_Y; y++) {
      this.cells[y] = [];
      for (let x = 0; x < VIEWPORT_TILES_X; x++) {
        const left = x * TILE_SIZE;
        const top = y * TILE_SIZE;
        const posStyle = `position:absolute;left:${left}px;top:${top}px;width:${TILE_SIZE}px;height:${TILE_SIZE}px;`;

        // Floor layer (bottom)
        const floorEl = document.createElement("div");
        floorEl.style.cssText = posStyle;
        this.mapContainer.appendChild(floorEl);

        // Ground layer (middle — items/traps, transparent bg)
        const groundEl = document.createElement("div");
        groundEl.style.cssText = posStyle + "background-color:transparent;";
        this.mapContainer.appendChild(groundEl);

        // Entity layer (top — hero/monsters, transparent bg, above building overlays)
        const entityEl = document.createElement("div");
        entityEl.style.cssText =
          posStyle + "background-color:transparent;z-index:3;";
        this.mapContainer.appendChild(entityEl);

        this.cells[y][x] = {
          floor: floorEl,
          ground: groundEl,
          entity: entityEl,
        };
      }
    }
  }

  private setupTooltipEvents(): void {
    this.mapContainer.addEventListener("mousemove", (e: MouseEvent) => {
      if (!this.lastState) return;
      const state = this.lastState;
      const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
      const floor = state.floors[floorKey];
      if (!floor) {
        hideItemTooltip();
        return;
      }

      const worldPos = this.screenToWorld(
        e.clientX,
        e.clientY,
        state.hero.position,
      );
      if (!worldPos) {
        hideItemTooltip();
        return;
      }

      // Skip if same tile as last check
      if (worldPos.x === this._lastTipX && worldPos.y === this._lastTipY)
        return;
      this._lastTipX = worldPos.x;
      this._lastTipY = worldPos.y;

      const tileVisible =
        floor.visible[worldPos.y]?.[worldPos.x] ||
        floor.lit[worldPos.y]?.[worldPos.x];
      if (!tileVisible) {
        hideItemTooltip();
        return;
      }

      const groundItems: typeof floor.items = [];
      for (const i of floor.items) {
        if (i.position.x === worldPos.x && i.position.y === worldPos.y)
          groundItems.push(i);
      }
      if (groundItems.length > 1) {
        showPileTooltip(
          groundItems.map((g) => g.item),
          e.clientX,
          e.clientY,
        );
      } else if (groundItems.length === 1) {
        showItemTooltip(groundItems[0].item, e.clientX, e.clientY);
      } else {
        hideItemTooltip();
      }
    });

    this.mapContainer.addEventListener("mouseleave", () => {
      hideItemTooltip();
    });
  }

  render(state: GameState): void {
    if (state.screen !== "game") return;
    this.lastState = state;

    const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
    const floor = state.floors[floorKey];
    if (!floor) return;

    // Check for Helm of True Sight
    let hasTrueSight = false;
    for (const eq of Object.values(state.hero.equipment)) {
      if (
        eq &&
        ITEM_BY_ID[eq.templateId]?.uniqueAbility === "detect-monsters"
      ) {
        hasTrueSight = true;
        break;
      }
    }

    const cameraX = state.hero.position.x - Math.floor(VIEWPORT_TILES_X / 2);
    const cameraY = state.hero.position.y - Math.floor(VIEWPORT_TILES_Y / 2);
    const tileset =
      state.currentDungeon !== "town"
        ? getTileset(getDungeonForFloor(state.currentFloor))
        : null;
    const theme =
      state.currentDungeon !== "town"
        ? getThemeForDepth(state.currentFloor)
        : null;

    // Build spatial lookup maps (O(1) per tile instead of O(n))
    const tk = (x: number, y: number) => `${x},${y}`;
    const monsterAt = new Map<string, (typeof floor.monsters)[0]>();
    for (const m of floor.monsters)
      monsterAt.set(tk(m.position.x, m.position.y), m);

    const itemsAt = new Map<string, typeof floor.items>();
    for (const i of floor.items) {
      const k = tk(i.position.x, i.position.y);
      const arr = itemsAt.get(k);
      if (arr) arr.push(i);
      else itemsAt.set(k, [i]);
    }

    const decalSet = new Set<string>();
    if (floor.decals) for (const d of floor.decals) decalSet.add(tk(d.x, d.y));

    const inTown = state.currentDungeon === "town";
    const heroX = state.hero.position.x;
    const heroY = state.hero.position.y;
    // Build layered hero sprite: base + equipped gear overlays
    const heroBase = state.hero.gender === "male" ? "base-human_m" : "base-human_f";
    const heroLayers = [heroBase];
    for (const slot of EQUIP_RENDER_ORDER) {
      const item = state.hero.equipment[slot as keyof typeof state.hero.equipment];
      const visual = getEquipVisual(slot, item?.templateId);
      if (visual) heroLayers.push(visual);
    }
    const heroSprite = heroLayers.length > 1 ? heroLayers.join("|") : heroBase;

    for (let vy = 0; vy < VIEWPORT_TILES_Y; vy++) {
      for (let vx = 0; vx < VIEWPORT_TILES_X; vx++) {
        const worldX = cameraX + vx;
        const worldY = cameraY + vy;
        const cell = this.cells[vy][vx];

        // Compute all final values, then dirty-check write
        let fc = "",
          fb = "",
          fo = "",
          ft = "",
          ff = "",
          fbc = "",
          fbm = "";
        let gc = "",
          gd = "none",
          go = "",
          gtr = "",
          gf = "",
          gtrap = false;
        let ec = "",
          ed = "none",
          eo = "";

        // Out of bounds
        if (
          worldX < 0 ||
          worldX >= floor.width ||
          worldY < 0 ||
          worldY >= floor.height
        ) {
          fb = "#000";
          fo = "1";
        } else {
          const explored = floor.explored[worldY][worldX];
          const visible = floor.visible[worldY][worldX];
          const isLit = floor.lit[worldY][worldX];

          if (!explored) {
            fb = "#000";
            fo = "1";
          } else {
            const tile = floor.tiles[worldY][worldX];
            const isWall = tile.type === "wall";
            const isFloorLike = tile.type === "floor" || tile.type === "trap";
            const opacity = isWall
              ? visible
                ? "1"
                : "0.5"
              : visible || isLit
                ? "1"
                : "0.5";
            const key = tk(worldX, worldY);
            const hasBlood = decalSet.has(key);
            const floorSprite =
              isLit && isFloorLike && theme
                ? theme.litFloors[
                    Math.abs(worldX * 31 + worldY * 37) % theme.litFloors.length
                  ]
                : tile.sprite;

            const isTownOverlay = inTown && (
              tile.sprite.startsWith("trees-") ||
              tile.sprite.startsWith("statues-") ||
              tile.sprite.startsWith("decor-") ||
              tile.sprite.startsWith("plants-") ||
              tile.sprite.startsWith("altars-") ||
              tile.sprite.startsWith("shops-")
            );
            const isOverlayTile =
              tile.type === "stairs-up" ||
              tile.type === "stairs-down" ||
              tile.type === "door-closed" ||
              tile.type === "door-open" ||
              tile.type === "door-locked" ||
              tile.type === "building" ||
              tile.type === "decor" ||
              tile.sprite === "statues-orcish_idol" ||
              isTownOverlay ||
              (tile.type === "trap" && tile.trapRevealed);

            if (isOverlayTile) {
              fc =
                tile.type === "building" || inTown
                  ? "floor-grass0"
                  : isLit && theme
                    ? theme.litFloors[
                        Math.abs(worldX * 31 + worldY * 37) %
                          theme.litFloors.length
                      ]
                    : theme
                      ? theme.floors[
                          Math.abs(worldX * 31 + worldY * 37) %
                            theme.floors.length
                        ]
                      : "floor-grey_dirt0";
              fo = opacity;
              if (tile.type !== "building" || tile.walkable) {
                gc =
                  tile.spriteLayers && tile.spriteLayers.length > 1
                    ? tile.spriteLayers.join("|")
                    : tile.sprite;
                gd = "block";
                go = opacity;
                if (tile.type === "trap" && tile.trapRevealed) gtrap = true;
              }
            } else if (tile.sprite === "wall-brick_dark_1_0") {
              fc = "floor-grass0";
              fo = opacity;
              gc = tile.sprite;
              gd = "block";
              go = opacity;
              gtr = tile.rotate ? `rotate(${tile.rotate}deg)` : "";
            } else if (tile.spriteLayers && tile.spriteLayers.length > 1) {
              // Multi-layer tile (e.g. floor + decor overlay from building)
              fc = tile.spriteLayers[0];
              fo = opacity;
              gc = tile.spriteLayers.slice(1).join("|");
              gd = "block";
              go = opacity;
            } else {
              fc = floorSprite;
              fo = opacity;
              ft = tile.rotate ? `rotate(${tile.rotate}deg)` : "";
              if (isWall && tileset?.wallTint) {
                fbc = tileset.wallTint;
                fbm = "multiply";
              }
            }

            if (visible || isLit) {
              const itemsHere = itemsAt.get(key);
              if (itemsHere && itemsHere.length > 1) {
                const pileLayers = pickItemSprite("treasure-pile", false);
                gc =
                  pileLayers.length > 1
                    ? pileLayers.join("|")
                    : pileLayers[0] || "gold-25";
                gd = "block";
                go = "1";
              } else if (itemsHere && itemsHere.length === 1) {
                const layers = getDisplaySpriteLayers(itemsHere[0].item);
                gc = layers.length > 1 ? layers.join("|") : layers[0] || "";
                gd = "block";
                go = "1";
                const glow = getItemGlow(itemsHere[0].item);
                if (glow) gf = glow;
              } else if (hasBlood) {
                gc = "floor-cobble_blood4";
                gd = "block";
                go = "0.7";
              }

              if (worldX === heroX && worldY === heroY) {
                ec = heroSprite;
                ed = "block";
                eo = "1";
              } else {
                const monster = monsterAt.get(key);
                if (monster) {
                  ec = monster.sprite;
                  ed = "block";
                  eo = "1";
                }
              }
            } else if (hasTrueSight && explored) {
              const monster = monsterAt.get(key);
              if (monster) {
                ec = monster.sprite;
                ed = "block";
                eo = "0.5";
              }
            }
          }
        }

        // Dirty-checked DOM writes
        const p = (cell as any)._prev;
        if (!p) {
          (cell as any)._prev = {
            fc,
            fb,
            fo,
            ft,
            ff,
            fbc,
            fbm,
            gc,
            gd,
            go,
            gtr,
            gf,
            gtrap,
            ec,
            ed,
            eo,
          };
          cell.floor.className = fc;
          cell.floor.style.background = fb;
          cell.floor.style.opacity = fo;
          cell.floor.style.transform = ft;
          cell.floor.style.filter = ff;
          cell.floor.style.backgroundColor = fbc;
          cell.floor.style.backgroundBlendMode = fbm;
          this.setGroundClass(cell.ground, gc);
          cell.ground.style.display = gd;
          cell.ground.style.opacity = go;
          cell.ground.style.transform = gtr;
          cell.ground.style.filter = gf;
          if (gtrap) cell.ground.classList.add("trap-revealed");
          else cell.ground.classList.remove("trap-revealed");
          this.setEntityClass(cell.entity, ec);
          cell.entity.style.display = ed;
          cell.entity.style.opacity = eo;
        } else {
          if (p.fc !== fc) {
            cell.floor.className = fc;
            p.fc = fc;
          }
          if (p.fb !== fb) {
            cell.floor.style.background = fb;
            p.fb = fb;
          }
          if (p.fo !== fo) {
            cell.floor.style.opacity = fo;
            p.fo = fo;
          }
          if (p.ft !== ft) {
            cell.floor.style.transform = ft;
            p.ft = ft;
          }
          if (p.ff !== ff) {
            cell.floor.style.filter = ff;
            p.ff = ff;
          }
          if (p.fbc !== fbc) {
            cell.floor.style.backgroundColor = fbc;
            p.fbc = fbc;
          }
          if (p.fbm !== fbm) {
            cell.floor.style.backgroundBlendMode = fbm;
            p.fbm = fbm;
          }
          if (p.gc !== gc) {
            this.setGroundClass(cell.ground, gc);
            p.gc = gc;
          }
          if (p.gd !== gd) {
            cell.ground.style.display = gd;
            p.gd = gd;
          }
          if (p.go !== go) {
            cell.ground.style.opacity = go;
            p.go = go;
          }
          if (p.gtr !== gtr) {
            cell.ground.style.transform = gtr;
            p.gtr = gtr;
          }
          if (p.gf !== gf) {
            cell.ground.style.filter = gf;
            p.gf = gf;
          }
          if (p.gtrap !== gtrap) {
            if (gtrap) cell.ground.classList.add("trap-revealed");
            else cell.ground.classList.remove("trap-revealed");
            p.gtrap = gtrap;
          }
          if (p.ec !== ec) {
            this.setEntityClass(cell.entity, ec);
            p.ec = ec;
          }
          if (p.ed !== ed) {
            cell.entity.style.display = ed;
            p.ed = ed;
          }
          if (p.eo !== eo) {
            cell.entity.style.opacity = eo;
            p.eo = eo;
          }
        }
      }
    }

    // Render building name labels (town only)
    this.renderBuildingLabels(state, cameraX, cameraY);
  }

  private buildingLabels: HTMLElement[] = [];

  // Pre-compute label positions: building entrance positions from config
  private static _labelPositions:
    | { x: number; y: number; name: string }[]
    | null = null;
  private static getLabelPositions(): { x: number; y: number; name: string }[] {
    if (MapRenderer._labelPositions) return MapRenderer._labelPositions;
    const tmplMap: Record<string, (typeof TOWN_BUILDINGS_DATA)[0]> = {};
    for (const t of TOWN_BUILDINGS_DATA) tmplMap[t.id] = t;
    MapRenderer._labelPositions = TOWN_CONFIG.buildings.map((bp) => {
      const bid = (bp.templateId || bp.id)!;
      const tmpl = tmplMap[bid];
      if (!tmpl) return { x: bp.x, y: bp.y, name: bid };
      const info = BUILDING_FLAVORS[bid];
      // Position label right below the NPC
      const npc = tmpl.npc;
      const lx = npc ? bp.x + npc.x : bp.x + Math.floor(tmpl.width / 2);
      const ly = npc ? bp.y + npc.y + 1 : bp.y + 1;
      return {
        x: lx,
        y: ly,
        name: info?.name ?? bid,
      };
    });
    return MapRenderer._labelPositions;
  }

  private renderBuildingLabels(
    state: GameState,
    cameraX: number,
    cameraY: number,
  ): void {
    if (state.currentDungeon !== "town") {
      if (this.buildingLabels.length > 0) {
        for (const el of this.buildingLabels) el.style.display = "none";
      }
      this._labelCamX = -1;
      this._labelCamY = -1;
      this._prevFloorKey = "";
      return;
    }

    const floorKey = `${state.currentDungeon}-${state.currentFloor}`;

    // Camera only moved — reposition existing labels via transform
    if (
      this._prevFloorKey === floorKey &&
      this.buildingLabels.length > 0 &&
      (this._labelCamX !== cameraX || this._labelCamY !== cameraY)
    ) {
      this._labelCamX = cameraX;
      this._labelCamY = cameraY;
      const positions = MapRenderer.getLabelPositions();
      const vpW = VIEWPORT_TILES_X * TILE_SIZE;
      const vpH = VIEWPORT_TILES_Y * TILE_SIZE;
      for (let i = 0; i < this.buildingLabels.length; i++) {
        const lp = positions[i];
        const el = this.buildingLabels[i];
        const screenX = (lp.x - cameraX) * TILE_SIZE + TILE_SIZE / 2;
        const screenY = (lp.y - cameraY) * TILE_SIZE;
        const visible =
          screenX >= -100 &&
          screenX <= vpW + 100 &&
          screenY >= -30 &&
          screenY <= vpH + 30;
        el.style.display = visible ? "" : "none";
        el.style.transform = `translate(${screenX}px, ${screenY}px) translateX(-50%)`;
      }
      return;
    }

    // Same camera, same floor, labels exist — nothing to do
    if (
      this._labelCamX === cameraX &&
      this._labelCamY === cameraY &&
      this._prevFloorKey === floorKey &&
      this.buildingLabels.length > 0
    )
      return;

    // Floor changed or first render — recreate labels
    this._labelCamX = cameraX;
    this._labelCamY = cameraY;
    this._prevFloorKey = floorKey;

    for (const el of this.buildingLabels) el.remove();
    this.buildingLabels = [];

    const vpW = VIEWPORT_TILES_X * TILE_SIZE;
    const vpH = VIEWPORT_TILES_Y * TILE_SIZE;

    for (const lp of MapRenderer.getLabelPositions()) {
      const screenX = (lp.x - cameraX) * TILE_SIZE + TILE_SIZE / 2;
      const screenY = (lp.y - cameraY) * TILE_SIZE;
      const visible =
        screenX >= -100 &&
        screenX <= vpW + 100 &&
        screenY >= -30 &&
        screenY <= vpH + 30;

      const div = document.createElement("div");
      div.textContent = lp.name;
      div.style.cssText = `
        position:absolute;
        left:0;
        top:0;
        transform:translate(${screenX}px, ${screenY}px) translateX(-50%);
        font-size:10px;
        color:#ffd700;
        text-shadow:1px 1px 2px #000, -1px -1px 2px #000;
        white-space:nowrap;
        pointer-events:none;
        z-index:5;
        font-family:serif;
        display:${visible ? "" : "none"};
      `;
      this.mapContainer.appendChild(div);
      this.buildingLabels.push(div);
    }
  }

  getMapContainer(): HTMLElement {
    return this.mapWrapper;
  }

  getAnimContainer(): HTMLElement {
    return this.mapContainer;
  }

  getViewportTiles(): { x: number; y: number } {
    return { x: VIEWPORT_TILES_X, y: VIEWPORT_TILES_Y };
  }

  /** Convert a click/tap position on the map to world coordinates */
  screenToWorld(
    screenX: number,
    screenY: number,
    heroPos: Vector2,
  ): Vector2 | null {
    const rect = this.mapWrapper.getBoundingClientRect();
    const localX = screenX - rect.left;
    const localY = screenY - rect.top;

    if (
      localX < 0 ||
      localY < 0 ||
      localX >= rect.width ||
      localY >= rect.height
    ) {
      return null;
    }

    const effectiveTile = TILE_SIZE * this.scale;
    const tileX = Math.floor(localX / effectiveTile);
    const tileY = Math.floor(localY / effectiveTile);

    const cameraX = heroPos.x - Math.floor(VIEWPORT_TILES_X / 2);
    const cameraY = heroPos.y - Math.floor(VIEWPORT_TILES_Y / 2);

    return {
      x: cameraX + tileX,
      y: cameraY + tileY,
    };
  }
}
