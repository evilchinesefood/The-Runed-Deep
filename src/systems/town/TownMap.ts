// ============================================================
// Town map — tile-based buildings from JSON templates + config
// ============================================================

import type { Floor, Monster, Tile, Vector2 } from "../../core/types";
import {
  TOWN_BUILDINGS_DATA,
  type BuildingTemplate,
} from "../../data/TownBuildingData";
import { getTownConfig } from "./TownConfigLoader";

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

export function TOWN_START_INITIAL(): Vector2 {
  const cfg = getTownConfig();
  return { x: cfg.playerSpawn.x, y: cfg.playerSpawn.y };
}

export function TOWN_START_RETURN(): Vector2 {
  const cfg = getTownConfig();
  if (cfg.playerReturnSpawn) return { x: cfg.playerReturnSpawn.x, y: cfg.playerReturnSpawn.y };
  // Fallback: near mine entrance
  const me = cfg.mineEntrance;
  if (Array.isArray(me) && me.length > 0) return { x: me[0].x, y: me[0].y + 2 };
  if (me && typeof me === "object" && (me as any).x !== undefined) return { x: (me as any).x, y: (me as any).y + 2 };
  return TOWN_START_INITIAL();
}

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
  const cfg = getTownConfig();
  const W = cfg.width;
  const H = cfg.height;

  // 1. Fill with grass
  const tiles: Tile[][] = Array.from({ length: H }, () =>
    Array.from(
      { length: W },
      (): Tile => ({
        type: "grass",
        sprite: "floor-grass0",
        walkable: true,
        transparent: true,
      }),
    ),
  );

  // 2. Paint water
  for (const w of cfg.water || []) {
    if (w.y < H && w.x < W)
      tiles[w.y][w.x] = {
        type: "water",
        sprite: "water-deep_water",
        walkable: false,
        transparent: true,
      };
  }

  // 3. Paint decorations (flowers, moss, plants — rendered as overlay on grass)
  for (const d of cfg.decoration || []) {
    if (d.y < H && d.x < W)
      tiles[d.y][d.x] = {
        type: "grass",
        sprite: d.sprite,
        walkable: true,
        transparent: true,
      };
  }

  // 4. Paint trees (not walkable, but transparent — rendered as overlay on grass)
  for (const t of cfg.trees || []) {
    if (t.y < H && t.x < W)
      tiles[t.y][t.x] = {
        type: "wall",
        sprite: t.sprite,
        walkable: false,
        transparent: true,
      };
  }

  // 5. Paint features (rendered as overlay on grass)
  for (const f of cfg.features || []) {
    const sprite = FEATURE_SPRITES[f.type] ?? "floor-grass0";
    const fw = f.w ?? 1;
    const fh = f.h ?? 1;
    for (let dy = 0; dy < fh; dy++) {
      for (let dx = 0; dx < fw; dx++) {
        const fx = f.x + dx;
        const fy = f.y + dy;
        if (fy < H && fx < W)
          tiles[fy][fx] = {
            type: "grass",
            sprite: sprite,
            walkable: true,
            transparent: true,
          };
      }
    }
  }

  // 5b. Paint custom tiles from builder (overrides all terrain)
  for (const t of (cfg as any).tiles || []) {
    if (t.y < H && t.x < W) {
      const isWall = t.sprite.startsWith("wall-");
      const isWater = t.sprite.startsWith("water-");
      const isTree = t.sprite.startsWith("trees-");
      tiles[t.y][t.x] = {
        type: isWall ? "wall" : isWater ? "water" : isTree ? "wall" : "grass",
        sprite: t.sprite,
        walkable: !isWall && !isWater && !isTree,
        transparent: !isWall,
        spriteLayers: t.overlay ? [t.sprite, t.overlay] : undefined,
      };
    }
  }

  // 6. Stamp buildings from templates at config positions
  for (const bp of cfg.buildings) {
    const tmpl = templateMap[(bp.templateId || bp.id)!];
    if (!tmpl) continue;

    for (let row = 0; row < tmpl.height; row++) {
      for (let col = 0; col < tmpl.width; col++) {
        const td = tmpl.tiles[row]?.[col];
        if (!td) continue;

        const tx = bp.x + col;
        const ty = bp.y + row;
        if (ty >= H || tx >= W) continue;

        const overlay = (td as any).overlay;
        const layers = overlay ? [td.sprite, overlay] : undefined;
        switch (td.type) {
          case "wall":
            tiles[ty][tx] = {
              type: "wall",
              sprite: td.sprite,
              walkable: false,
              transparent: false,
              spriteLayers: layers,
            };
            break;
          case "floor":
            tiles[ty][tx] = {
              type: "floor",
              sprite: td.sprite,
              walkable: true,
              transparent: true,
              spriteLayers: layers,
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
              spriteLayers: layers,
            };
            break;
        }
      }
    }

    // Place entrance tiles (type "building" with buildingId for interaction)
    const entranceList = Array.isArray(tmpl.entrance)
      ? tmpl.entrance
      : tmpl.entrance ? [tmpl.entrance] : [];
    for (const ent of entranceList) {
      const ex = bp.x + ent.x;
      const ey = bp.y + ent.y;
      if (ey < H && ex < W) {
        tiles[ey][ex] = {
          type: "building",
          sprite:
            tmpl.tiles[ent.y]?.[ent.x]?.sprite ?? "floor-sand1",
          walkable: true,
          transparent: true,
          buildingId: tmpl.id,
        };
      }
    }

  }

  // 6b. Create NPC monsters for buildings with npcSprite
  const npcMonsters: Monster[] = [];
  for (const bp of cfg.buildings) {
    const tmpl = templateMap[(bp.templateId || bp.id)!];
    if (!tmpl || !tmpl.npc) continue;
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

  // 7. Mine entrance (supports single point, array, or object with numeric keys)
  let minePoints: { x: number; y: number }[] = [];
  const me = cfg.mineEntrance;
  if (Array.isArray(me)) {
    minePoints = me;
  } else if (me && typeof me === "object" && me.x !== undefined) {
    minePoints = [me as { x: number; y: number }];
  } else if (me && typeof me === "object") {
    minePoints = Object.values(me) as { x: number; y: number }[];
  }
  for (const mp of minePoints) {
    if (mp && mp.y < H && mp.x < W) {
      tiles[mp.y][mp.x] = {
        type: "stairs-down",
        sprite: "gateways-stone_stairs_down",
        walkable: true,
        transparent: true,
      };
    }
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
    playerStart: TOWN_START_INITIAL(),
  };
}
