// ============================================================
// Town map — tile-based buildings from JSON templates + config
// ============================================================

import type { Floor, Monster, Tile, Vector2 } from "../../core/types";
import {
  TOWN_BUILDINGS_DATA,
  type BuildingTemplate,
} from "../../data/TownBuildingData";
import { TOWN_CONFIG } from "../../data/TownConfigData";

const W = TOWN_CONFIG.width;
const H = TOWN_CONFIG.height;

// Build a lookup of building templates by id
const templateMap: Record<string, BuildingTemplate> = {};
for (const t of TOWN_BUILDINGS_DATA) templateMap[t.id] = t;

// ── Exports consumed by other modules ──────────────────────

export const BUILDING_FLAVORS: Record<
  string,
  { name: string; flavor: string }
> = {};
for (const t of TOWN_BUILDINGS_DATA)
  BUILDING_FLAVORS[t.id] = { name: t.name, flavor: t.flavor };

export const TOWN_START_INITIAL: Vector2 = {
  x: TOWN_CONFIG.playerSpawn.x,
  y: TOWN_CONFIG.playerSpawn.y,
};
export const TOWN_START_RETURN: Vector2 = {
  x: TOWN_CONFIG.playerReturnSpawn.x,
  y: TOWN_CONFIG.playerReturnSpawn.y,
};

// ── Feature sprite helpers ─────────────────────────────────

const FEATURE_SPRITES: Record<string, string> = {
  fountain: "decor-blue_fountain",
  well: "decor-dngn_dry_fountain",
  "market-stall": "shops-shop_general",
  graveyard: "decor-gravestone",
  garden: "plants-bloom_plant_01",
  "animal-pen": "floor-grass-dark_flowers5",
};

// ── Generator ──────────────────────────────────────────────

export function generateTownMap(): { floor: Floor; playerStart: Vector2 } {
  // 1. Fill with grass
  const tiles: Tile[][] = Array.from({ length: H }, () =>
    Array.from(
      { length: W },
      (): Tile => ({
        type: "grass",
        sprite: "floor-grass_full",
        walkable: true,
        transparent: true,
      }),
    ),
  );

  // 2. Paint water
  for (const w of TOWN_CONFIG.water) {
    if (w.y < H && w.x < W)
      tiles[w.y][w.x] = {
        type: "water",
        sprite: "water-deep_water",
        walkable: false,
        transparent: true,
      };
  }

  // 3. Paint decorations (flowers, moss, plants — walkable grass)
  for (const d of TOWN_CONFIG.decoration) {
    if (d.y < H && d.x < W)
      tiles[d.y][d.x] = {
        type: "grass",
        sprite: d.sprite,
        walkable: true,
        transparent: true,
      };
  }

  // 4. Paint trees (not walkable, but transparent)
  for (const t of TOWN_CONFIG.trees) {
    if (t.y < H && t.x < W)
      tiles[t.y][t.x] = {
        type: "wall",
        sprite: t.sprite,
        walkable: false,
        transparent: true,
      };
  }

  // 5. Paint features
  for (const f of TOWN_CONFIG.features) {
    const sprite = FEATURE_SPRITES[f.type] ?? "floor-grass_full";
    const fw = f.w ?? 1;
    const fh = f.h ?? 1;
    for (let dy = 0; dy < fh; dy++) {
      for (let dx = 0; dx < fw; dx++) {
        const fx = f.x + dx;
        const fy = f.y + dy;
        if (fy < H && fx < W)
          tiles[fy][fx] = {
            type: "grass",
            sprite,
            walkable: true,
            transparent: true,
          };
      }
    }
  }

  // 6. Stamp buildings from templates at config positions
  for (const bp of TOWN_CONFIG.buildings) {
    const tmpl = templateMap[bp.id];
    if (!tmpl) continue;

    for (let row = 0; row < tmpl.height; row++) {
      for (let col = 0; col < tmpl.width; col++) {
        const td = tmpl.tiles[row]?.[col];
        if (!td) continue;

        const tx = bp.x + col;
        const ty = bp.y + row;
        if (ty >= H || tx >= W) continue;

        switch (td.type) {
          case "wall":
            tiles[ty][tx] = {
              type: "wall",
              sprite: td.sprite,
              walkable: false,
              transparent: false,
            };
            break;
          case "floor":
            tiles[ty][tx] = {
              type: "floor",
              sprite: td.sprite,
              walkable: true,
              transparent: true,
            };
            break;
          case "door":
            tiles[ty][tx] = {
              type: "door-open",
              sprite: td.sprite,
              walkable: true,
              transparent: true,
            };
            break;
          case "decor":
            tiles[ty][tx] = {
              type: "floor",
              sprite: td.sprite,
              walkable: true,
              transparent: true,
            };
            break;
        }
      }
    }

    // Place entrance tile (type "building" with buildingId for interaction)
    const ex = bp.x + tmpl.entrance.x;
    const ey = bp.y + tmpl.entrance.y;
    if (ey < H && ex < W) {
      tiles[ey][ex] = {
        type: "building",
        sprite:
          tmpl.tiles[tmpl.entrance.y]?.[tmpl.entrance.x]?.sprite ??
          "floor-cobble_blood1",
        walkable: true,
        transparent: true,
        buildingId: tmpl.id,
      };
    }
  }

  // 6b. Create NPC monsters for buildings with npcSprite
  const npcMonsters: Monster[] = [];
  for (const bp of TOWN_CONFIG.buildings) {
    const tmpl = templateMap[bp.id];
    if (!tmpl) continue;
    const npcTile = tmpl.tiles[tmpl.npc.y]?.[tmpl.npc.x];
    if (!npcTile?.npcSprite) continue;
    const wx = bp.x + tmpl.npc.x;
    const wy = bp.y + tmpl.npc.y;
    if (wy >= H || wx >= W) continue;
    npcMonsters.push({
      id: `npc-${tmpl.id}`,
      templateId: "npc",
      name: tmpl.name,
      sprite: npcTile.npcSprite,
      position: { x: wx, y: wy },
      hp: 99999,
      maxHp: 99999,
      damage: [0, 0],
      speed: 0,
      xpValue: 0,
      resistances: {
        cold: 100,
        fire: 100,
        lightning: 100,
        acid: 100,
        drain: 100,
      },
      ai: "stationary",
      armor: 9999,
      abilities: [],
      sleeping: false,
      slowed: false,
      fleeing: 0,
      hasFled: false,
      bled: false,
      alerted: false,
    });
  }

  // 7. Mine entrance
  const me = TOWN_CONFIG.mineEntrance;
  if (me.y < H && me.x < W) {
    tiles[me.y][me.x] = {
      type: "stairs-down",
      sprite: "gateways-stone_stairs_down",
      walkable: true,
      transparent: true,
    };
  }

  // All tiles pre-explored, visible, and lit in town
  const explored = Array.from({ length: H }, () => Array(W).fill(true));
  const visible = Array.from({ length: H }, () => Array(W).fill(true));
  const lit = Array.from({ length: H }, () => Array(W).fill(true));

  return {
    floor: {
      id: "town-0",
      tiles,
      monsters: npcMonsters,
      items: [],
      decals: [],
      explored,
      visible,
      lit,
      width: W,
      height: H,
    },
    playerStart: TOWN_START_INITIAL,
  };
}
