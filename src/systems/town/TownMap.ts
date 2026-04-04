// ============================================================
// Town map — exact from map builder, zero auto-generation
// ============================================================

import type { Floor, Tile, Vector2 } from "../../core/types";

const W = 30;
const H = 32;

export interface TownBuilding {
  id: string;
  name: string;
  flavor: string;
  x: number;
  y: number;
  w: number;
  h: number;
  entranceX: number;
  entranceY: number;
  sprite: string;
  spriteW: number;
  spriteH: number;
  rotation?: number;
}

export const TOWN_BUILDINGS: TownBuilding[] = [
  {
    id: "inn",
    name: "The Resting Stag Inn",
    flavor: "A warm bed and a hearty meal await.",
    x: 2,
    y: 2,
    w: 4,
    h: 3,
    entranceX: 24,
    entranceY: 27,
    sprite: "building-2",
    spriteW: 106,
    spriteH: 66,
  },
  {
    id: "armor-shop",
    name: "Armor Shop",
    flavor: "Protection for every part of the body.",
    x: 2,
    y: 7,
    w: 4,
    h: 3,
    entranceX: 24,
    entranceY: 5,
    sprite: "big-hut",
    spriteW: 105,
    spriteH: 93,
  },
  {
    id: "rune-forge",
    name: "The Rune Forge",
    flavor: "Ancient flames dance within, ready to bind runes to steel.",
    x: 2,
    y: 13,
    w: 2,
    h: 2,
    entranceX: 3,
    entranceY: 10,
    sprite: "round-hut",
    spriteW: 66,
    spriteH: 59,
  },
  {
    id: "weapon-shop",
    name: "Weapon Shop",
    flavor: "Fine blades for the discerning adventurer.",
    x: 23,
    y: 3,
    w: 3,
    h: 2,
    entranceX: 3,
    entranceY: 4,
    sprite: "building-1",
    spriteW: 98,
    spriteH: 63,
  },
  {
    id: "sage",
    name: "The Sage",
    flavor: "Ancient knowledge to reveal the secrets of your treasures.",
    x: 17,
    y: 9,
    w: 2,
    h: 2,
    entranceX: 21,
    entranceY: 7,
    sprite: "round-hut",
    spriteW: 66,
    spriteH: 59,
  },
  {
    id: "magic-shop",
    name: "Magic Shop",
    flavor: "Arcane tomes and enchanted wands of great power.",
    x: 20,
    y: 8,
    w: 4,
    h: 4,
    entranceX: 3,
    entranceY: 15,
    sprite: "sage",
    spriteW: 110,
    spriteH: 109,
  },
  {
    id: "general-store",
    name: "General Store",
    flavor: "Potions, scrolls, and sundries for every occasion.",
    x: 24,
    y: 15,
    w: 4,
    h: 4,
    entranceX: 24,
    entranceY: 18,
    sprite: "big-hut",
    spriteW: 105,
    spriteH: 93,
  },
  {
    id: "rift-stone",
    name: "Rift Stone",
    flavor: "A cracked monolith humming with residual planar energy.",
    x: 5,
    y: 13,
    w: 1,
    h: 1,
    entranceX: 5,
    entranceY: 14,
    sprite: "statues-depths_column",
    spriteW: 32,
    spriteH: 32,
  },
  {
    id: "crucible",
    name: "The Crucible",
    flavor: "A battle-scarred arena where warriors test their mettle.",
    x: 10,
    y: 13,
    w: 2,
    h: 2,
    entranceX: 11,
    entranceY: 15,
    sprite: "round-hut",
    spriteW: 66,
    spriteH: 59,
  },
  {
    id: "statue-of-fortune",
    name: "Statue of Fortune",
    flavor: "A weathered idol said to bless the generous.",
    x: 8,
    y: 19,
    w: 1,
    h: 1,
    entranceX: 8,
    entranceY: 20,
    sprite: "statues-statue_ancient_hero",
    spriteW: 32,
    spriteH: 32,
  },
  {
    id: "temple",
    name: "Temple of Odin",
    flavor: "A place of healing and divine protection.",
    x: 12,
    y: 25,
    w: 5,
    h: 4,
    entranceX: 13,
    entranceY: 24,
    sprite: "temple",
    spriteW: 132,
    spriteH: 127,
  },
  {
    id: "temple",
    name: "Temple of Odin",
    flavor: "A place of healing and divine protection.",
    x: 12,
    y: 25,
    w: 5,
    h: 4,
    entranceX: 14,
    entranceY: 24,
    sprite: "temple",
    spriteW: 132,
    spriteH: 127,
  },
  {
    id: "bank",
    name: "Blacksmith",
    flavor: "Forge new enchantments onto your gear.",
    x: 22,
    y: 26,
    w: 5,
    h: 5,
    entranceX: 6,
    entranceY: 22,
    sprite: "l-building-1",
    spriteW: 143,
    spriteH: 138,
  },
];

const DECORATIONS: {
  sprite: string;
  x: number;
  y: number;
  w: number;
  h: number;
  spriteW: number;
  spriteH: number;
}[] = [
  { sprite: "keep", x: 2, y: 20, w: 4, h: 4, spriteW: 125, spriteH: 120 },
  { sprite: "silo", x: 20, y: 14, w: 2, h: 2, spriteW: 65, spriteH: 65 },
  { sprite: "wall-piece", x: 11, y: 1, w: 3, h: 1, spriteW: 90, spriteH: 31 },
  { sprite: "wall-piece", x: 15, y: 1, w: 3, h: 1, spriteW: 90, spriteH: 31 },
  { sprite: "hut-1", x: 16, y: 7, w: 2, h: 2, spriteW: 56, spriteH: 54 },
  { sprite: "hut-2", x: 10, y: 20, w: 2, h: 2, spriteW: 57, spriteH: 55 },
];

export const BUILDING_FLAVORS: Record<
  string,
  { name: string; flavor: string }
> = {};
for (const b of TOWN_BUILDINGS)
  BUILDING_FLAVORS[b.id] = { name: b.name, flavor: b.flavor };

export const TOWN_START_INITIAL: Vector2 = { x: 14, y: 23 };
export const TOWN_START_RETURN: Vector2 = { x: 14, y: 2 };

// Tile resolver
function tf(sprite: string): Tile {
  switch (sprite) {
    case "town-wall":
      return {
        type: "wall",
        sprite: "wall-brick_dark_1_0",
        walkable: false,
        transparent: false,
      };
    case "invisible-wall":
      return {
        type: "wall",
        sprite: "floor-grass_full",
        walkable: false,
        transparent: true,
      };
    case "path":
      return {
        type: "path",
        sprite: "floor-cobble_blood1",
        walkable: true,
        transparent: true,
      };
    case "water":
      return {
        type: "water",
        sprite: "water-deep_water",
        walkable: false,
        transparent: true,
      };
    case "sign":
      return {
        type: "grass",
        sprite: "statues-orcish_idol",
        walkable: true,
        transparent: true,
      };
    case "mine-entrance":
      return {
        type: "stairs-down",
        sprite: "gateways-stone_stairs_down",
        walkable: true,
        transparent: true,
      };
    case "grass":
      return {
        type: "grass",
        sprite: "floor-grass_full",
        walkable: true,
        transparent: true,
      };
    default:
      return { type: "grass", sprite, walkable: true, transparent: true };
  }
}

// Place a tile
function t(tiles: Tile[][], y: number, x: number, sprite: string): void {
  tiles[y][x] = tf(sprite);
}

export function generateTownMap(): { floor: Floor; playerStart: Vector2 } {
  const tiles: Tile[][] = Array.from({ length: H }, () =>
    Array.from({ length: W }, () => tf("grass")),
  );

  // Every non-grass tile — exact from builder export, no auto-generation
  // Row 0: full town-wall
  t(tiles, 0, 0, "town-wall");
  t(tiles, 0, 1, "town-wall");
  t(tiles, 0, 2, "town-wall");
  t(tiles, 0, 3, "town-wall");
  t(tiles, 0, 4, "town-wall");
  t(tiles, 0, 5, "town-wall");
  t(tiles, 0, 6, "town-wall");
  t(tiles, 0, 7, "town-wall");
  t(tiles, 0, 8, "town-wall");
  t(tiles, 0, 9, "town-wall");
  t(tiles, 0, 10, "town-wall");
  t(tiles, 0, 11, "town-wall");
  t(tiles, 0, 12, "town-wall");
  t(tiles, 0, 13, "town-wall");
  t(tiles, 0, 14, "town-wall");
  t(tiles, 0, 15, "town-wall");
  t(tiles, 0, 16, "town-wall");
  t(tiles, 0, 17, "town-wall");
  t(tiles, 0, 18, "town-wall");
  t(tiles, 0, 19, "town-wall");
  t(tiles, 0, 20, "town-wall");
  t(tiles, 0, 21, "town-wall");
  t(tiles, 0, 22, "town-wall");
  t(tiles, 0, 23, "town-wall");
  t(tiles, 0, 24, "town-wall");
  t(tiles, 0, 25, "town-wall");
  t(tiles, 0, 26, "town-wall");
  t(tiles, 0, 27, "town-wall");
  t(tiles, 0, 28, "town-wall");
  t(tiles, 0, 29, "town-wall");
  // Row 1
  t(tiles, 1, 0, "town-wall");
  t(tiles, 1, 10, "invisible-wall");
  t(tiles, 1, 14, "mine-entrance");
  t(tiles, 1, 18, "invisible-wall");
  t(tiles, 1, 29, "town-wall");
  // Row 2
  t(tiles, 2, 0, "town-wall");
  t(tiles, 2, 2, "invisible-wall");
  t(tiles, 2, 3, "invisible-wall");
  t(tiles, 2, 4, "invisible-wall");
  t(tiles, 2, 11, "invisible-wall");
  t(tiles, 2, 13, "path");
  t(tiles, 2, 14, "path");
  t(tiles, 2, 17, "invisible-wall");
  t(tiles, 2, 29, "town-wall");
  // Row 3
  t(tiles, 3, 0, "town-wall");
  t(tiles, 3, 2, "invisible-wall");
  t(tiles, 3, 3, "invisible-wall");
  t(tiles, 3, 4, "invisible-wall");
  t(tiles, 3, 13, "path");
  t(tiles, 3, 14, "path");
  t(tiles, 3, 23, "invisible-wall");
  t(tiles, 3, 24, "invisible-wall");
  t(tiles, 3, 25, "invisible-wall");
  t(tiles, 3, 29, "town-wall");
  // Row 4
  t(tiles, 4, 0, "town-wall");
  t(tiles, 4, 2, "sign");
  t(tiles, 4, 3, "path");
  t(tiles, 4, 4, "path");
  t(tiles, 4, 5, "path");
  t(tiles, 4, 6, "path");
  t(tiles, 4, 7, "path");
  t(tiles, 4, 8, "path");
  t(tiles, 4, 9, "path");
  t(tiles, 4, 10, "path");
  t(tiles, 4, 11, "path");
  t(tiles, 4, 12, "path");
  t(tiles, 4, 13, "path");
  t(tiles, 4, 14, "path");
  t(tiles, 4, 23, "invisible-wall");
  t(tiles, 4, 24, "invisible-wall");
  t(tiles, 4, 25, "invisible-wall");
  t(tiles, 4, 29, "town-wall");
  // Row 5
  t(tiles, 5, 0, "town-wall");
  t(tiles, 5, 13, "path");
  t(tiles, 5, 14, "path");
  t(tiles, 5, 15, "path");
  t(tiles, 5, 16, "path");
  t(tiles, 5, 17, "path");
  t(tiles, 5, 18, "path");
  t(tiles, 5, 19, "path");
  t(tiles, 5, 20, "path");
  t(tiles, 5, 21, "path");
  t(tiles, 5, 22, "path");
  t(tiles, 5, 23, "path");
  t(tiles, 5, 24, "path");
  t(tiles, 5, 25, "sign");
  t(tiles, 5, 29, "town-wall");
  // Row 6
  t(tiles, 6, 0, "town-wall");
  t(tiles, 6, 13, "path");
  t(tiles, 6, 14, "path");
  t(tiles, 6, 21, "path");
  t(tiles, 6, 29, "town-wall");
  // Row 7
  t(tiles, 7, 0, "town-wall");
  t(tiles, 7, 2, "invisible-wall");
  t(tiles, 7, 3, "invisible-wall");
  t(tiles, 7, 4, "invisible-wall");
  t(tiles, 7, 13, "path");
  t(tiles, 7, 14, "path");
  t(tiles, 7, 16, "invisible-wall");
  t(tiles, 7, 17, "invisible-wall");
  t(tiles, 7, 20, "sign");
  t(tiles, 7, 21, "path");
  t(tiles, 7, 29, "town-wall");
  // Row 8
  t(tiles, 8, 0, "town-wall");
  t(tiles, 8, 2, "invisible-wall");
  t(tiles, 8, 3, "invisible-wall");
  t(tiles, 8, 4, "invisible-wall");
  t(tiles, 8, 13, "path");
  t(tiles, 8, 14, "path");
  t(tiles, 8, 16, "invisible-wall");
  t(tiles, 8, 17, "invisible-wall");
  t(tiles, 8, 29, "town-wall");
  // Row 9
  t(tiles, 9, 0, "town-wall");
  t(tiles, 9, 2, "invisible-wall");
  t(tiles, 9, 3, "invisible-wall");
  t(tiles, 9, 4, "invisible-wall");
  t(tiles, 9, 13, "path");
  t(tiles, 9, 14, "path");
  t(tiles, 9, 17, "invisible-wall");
  t(tiles, 9, 18, "invisible-wall");
  t(tiles, 9, 20, "invisible-wall");
  t(tiles, 9, 21, "invisible-wall");
  t(tiles, 9, 22, "invisible-wall");
  t(tiles, 9, 29, "town-wall");
  // Row 10
  t(tiles, 10, 0, "town-wall");
  t(tiles, 10, 2, "sign");
  t(tiles, 10, 3, "path");
  t(tiles, 10, 4, "path");
  t(tiles, 10, 5, "path");
  t(tiles, 10, 6, "path");
  t(tiles, 10, 7, "path");
  t(tiles, 10, 8, "path");
  t(tiles, 10, 9, "path");
  t(tiles, 10, 10, "path");
  t(tiles, 10, 11, "path");
  t(tiles, 10, 12, "path");
  t(tiles, 10, 13, "path");
  t(tiles, 10, 14, "path");
  t(tiles, 10, 17, "invisible-wall");
  t(tiles, 10, 18, "invisible-wall");
  t(tiles, 10, 20, "invisible-wall");
  t(tiles, 10, 21, "invisible-wall");
  t(tiles, 10, 22, "invisible-wall");
  t(tiles, 10, 29, "town-wall");
  // Row 11
  t(tiles, 11, 0, "town-wall");
  t(tiles, 11, 13, "path");
  t(tiles, 11, 14, "path");
  t(tiles, 11, 29, "town-wall");
  // Row 12
  t(tiles, 12, 0, "town-wall");
  t(tiles, 12, 13, "path");
  t(tiles, 12, 14, "path");
  t(tiles, 12, 29, "town-wall");
  // Row 13
  t(tiles, 13, 0, "town-wall");
  t(tiles, 13, 2, "invisible-wall");
  t(tiles, 13, 3, "invisible-wall");
  t(tiles, 13, 13, "path");
  t(tiles, 13, 14, "path");
  t(tiles, 13, 18, "water");
  t(tiles, 13, 29, "town-wall");
  // Row 14
  t(tiles, 14, 0, "town-wall");
  t(tiles, 14, 2, "invisible-wall");
  t(tiles, 14, 3, "invisible-wall");
  t(tiles, 14, 13, "path");
  t(tiles, 14, 14, "path");
  t(tiles, 14, 17, "water");
  t(tiles, 14, 18, "water");
  t(tiles, 14, 19, "water");
  t(tiles, 14, 20, "invisible-wall");
  t(tiles, 14, 21, "invisible-wall");
  t(tiles, 14, 29, "town-wall");
  // Row 15
  t(tiles, 15, 0, "town-wall");
  t(tiles, 15, 2, "sign");
  t(tiles, 15, 3, "path");
  t(tiles, 15, 4, "path");
  t(tiles, 15, 5, "path");
  t(tiles, 15, 6, "path");
  t(tiles, 15, 7, "path");
  t(tiles, 15, 8, "path");
  t(tiles, 15, 9, "path");
  t(tiles, 15, 10, "path");
  t(tiles, 15, 11, "path");
  t(tiles, 15, 12, "path");
  t(tiles, 15, 13, "path");
  t(tiles, 15, 14, "path");
  t(tiles, 15, 17, "water");
  t(tiles, 15, 18, "water");
  t(tiles, 15, 19, "water");
  t(tiles, 15, 20, "invisible-wall");
  t(tiles, 15, 21, "invisible-wall");
  t(tiles, 15, 24, "invisible-wall");
  t(tiles, 15, 25, "invisible-wall");
  t(tiles, 15, 26, "invisible-wall");
  t(tiles, 15, 27, "invisible-wall");
  t(tiles, 15, 29, "town-wall");
  // Row 16
  t(tiles, 16, 0, "town-wall");
  t(tiles, 16, 13, "path");
  t(tiles, 16, 14, "path");
  t(tiles, 16, 16, "water");
  t(tiles, 16, 17, "water");
  t(tiles, 16, 18, "water");
  t(tiles, 16, 19, "water");
  t(tiles, 16, 20, "water");
  t(tiles, 16, 24, "invisible-wall");
  t(tiles, 16, 27, "invisible-wall");
  t(tiles, 16, 29, "town-wall");
  // Row 17
  t(tiles, 17, 0, "town-wall");
  t(tiles, 17, 13, "path");
  t(tiles, 17, 14, "path");
  t(tiles, 17, 18, "water");
  t(tiles, 17, 19, "water");
  t(tiles, 17, 24, "invisible-wall");
  t(tiles, 17, 25, "invisible-wall");
  t(tiles, 17, 26, "invisible-wall");
  t(tiles, 17, 27, "invisible-wall");
  t(tiles, 17, 29, "town-wall");
  // Row 18
  t(tiles, 18, 0, "town-wall");
  t(tiles, 18, 13, "path");
  t(tiles, 18, 14, "path");
  t(tiles, 18, 15, "path");
  t(tiles, 18, 16, "path");
  t(tiles, 18, 17, "path");
  t(tiles, 18, 18, "path");
  t(tiles, 18, 19, "path");
  t(tiles, 18, 20, "path");
  t(tiles, 18, 21, "path");
  t(tiles, 18, 22, "path");
  t(tiles, 18, 23, "path");
  t(tiles, 18, 24, "path");
  t(tiles, 18, 25, "sign");
  t(tiles, 18, 29, "town-wall");
  // Row 19
  t(tiles, 19, 0, "town-wall");
  t(tiles, 19, 13, "path");
  t(tiles, 19, 14, "path");
  t(tiles, 19, 29, "town-wall");
  // Row 20
  t(tiles, 20, 0, "town-wall");
  t(tiles, 20, 2, "invisible-wall");
  t(tiles, 20, 4, "invisible-wall");
  t(tiles, 20, 5, "invisible-wall");
  t(tiles, 20, 10, "invisible-wall");
  t(tiles, 20, 11, "invisible-wall");
  t(tiles, 20, 13, "path");
  t(tiles, 20, 14, "path");
  t(tiles, 20, 29, "town-wall");
  // Row 21
  t(tiles, 21, 0, "town-wall");
  t(tiles, 21, 2, "invisible-wall");
  t(tiles, 21, 5, "invisible-wall");
  t(tiles, 21, 10, "invisible-wall");
  t(tiles, 21, 11, "invisible-wall");
  t(tiles, 21, 13, "path");
  t(tiles, 21, 14, "path");
  t(tiles, 21, 15, "path");
  t(tiles, 21, 16, "path");
  t(tiles, 21, 17, "path");
  t(tiles, 21, 18, "path");
  t(tiles, 21, 19, "path");
  t(tiles, 21, 20, "path");
  t(tiles, 21, 21, "path");
  t(tiles, 21, 22, "path");
  t(tiles, 21, 23, "path");
  t(tiles, 21, 24, "path");
  t(tiles, 21, 29, "town-wall");
  // Row 22
  t(tiles, 22, 0, "town-wall");
  t(tiles, 22, 2, "invisible-wall");
  t(tiles, 22, 5, "invisible-wall");
  t(tiles, 22, 6, "path");
  t(tiles, 22, 7, "path");
  t(tiles, 22, 8, "path");
  t(tiles, 22, 9, "path");
  t(tiles, 22, 10, "path");
  t(tiles, 22, 11, "path");
  t(tiles, 22, 12, "path");
  t(tiles, 22, 13, "path");
  t(tiles, 22, 14, "path");
  t(tiles, 22, 24, "path");
  t(tiles, 22, 29, "town-wall");
  // Row 23
  t(tiles, 23, 0, "town-wall");
  t(tiles, 23, 2, "invisible-wall");
  t(tiles, 23, 3, "invisible-wall");
  t(tiles, 23, 4, "invisible-wall");
  t(tiles, 23, 5, "invisible-wall");
  t(tiles, 23, 6, "sign");
  t(tiles, 23, 13, "path");
  t(tiles, 23, 14, "path");
  t(tiles, 23, 24, "path");
  t(tiles, 23, 29, "town-wall");
  // Row 24
  t(tiles, 24, 0, "town-wall");
  t(tiles, 24, 13, "path");
  t(tiles, 24, 14, "path");
  t(tiles, 24, 15, "sign");
  t(tiles, 24, 24, "path");
  t(tiles, 24, 29, "town-wall");
  // Row 25
  t(tiles, 25, 0, "town-wall");
  t(tiles, 25, 12, "invisible-wall");
  t(tiles, 25, 13, "invisible-wall");
  t(tiles, 25, 14, "invisible-wall");
  t(tiles, 25, 15, "invisible-wall");
  t(tiles, 25, 24, "path");
  t(tiles, 25, 25, "sign");
  t(tiles, 25, 29, "town-wall");
  // Row 26
  t(tiles, 26, 0, "town-wall");
  t(tiles, 26, 12, "invisible-wall");
  t(tiles, 26, 13, "invisible-wall");
  t(tiles, 26, 14, "invisible-wall");
  t(tiles, 26, 15, "invisible-wall");
  t(tiles, 26, 22, "invisible-wall");
  t(tiles, 26, 24, "path");
  t(tiles, 26, 29, "town-wall");
  // Row 27
  t(tiles, 27, 0, "town-wall");
  t(tiles, 27, 12, "invisible-wall");
  t(tiles, 27, 13, "invisible-wall");
  t(tiles, 27, 14, "invisible-wall");
  t(tiles, 27, 15, "invisible-wall");
  t(tiles, 27, 22, "invisible-wall");
  t(tiles, 27, 23, "invisible-wall");
  t(tiles, 27, 24, "path");
  t(tiles, 27, 25, "sign");
  t(tiles, 27, 29, "town-wall");
  // Row 28
  t(tiles, 28, 0, "town-wall");
  t(tiles, 28, 12, "invisible-wall");
  t(tiles, 28, 13, "invisible-wall");
  t(tiles, 28, 14, "invisible-wall");
  t(tiles, 28, 15, "invisible-wall");
  t(tiles, 28, 22, "invisible-wall");
  t(tiles, 28, 24, "invisible-wall");
  t(tiles, 28, 25, "invisible-wall");
  t(tiles, 28, 26, "invisible-wall");
  t(tiles, 28, 29, "town-wall");
  // Row 29
  t(tiles, 29, 0, "town-wall");
  t(tiles, 29, 22, "invisible-wall");
  t(tiles, 29, 23, "invisible-wall");
  t(tiles, 29, 24, "invisible-wall");
  t(tiles, 29, 25, "invisible-wall");
  t(tiles, 29, 26, "invisible-wall");
  t(tiles, 29, 29, "town-wall");
  // Row 30
  t(tiles, 30, 0, "town-wall");
  t(tiles, 30, 29, "town-wall");
  // Row 31: full town-wall
  t(tiles, 31, 0, "town-wall");
  t(tiles, 31, 1, "town-wall");
  t(tiles, 31, 2, "town-wall");
  t(tiles, 31, 3, "town-wall");
  t(tiles, 31, 4, "town-wall");
  t(tiles, 31, 5, "town-wall");
  t(tiles, 31, 6, "town-wall");
  t(tiles, 31, 7, "town-wall");
  t(tiles, 31, 8, "town-wall");
  t(tiles, 31, 9, "town-wall");
  t(tiles, 31, 10, "town-wall");
  t(tiles, 31, 11, "town-wall");
  t(tiles, 31, 12, "town-wall");
  t(tiles, 31, 13, "town-wall");
  t(tiles, 31, 14, "town-wall");
  t(tiles, 31, 15, "town-wall");
  t(tiles, 31, 16, "town-wall");
  t(tiles, 31, 17, "town-wall");
  t(tiles, 31, 18, "town-wall");
  t(tiles, 31, 19, "town-wall");
  t(tiles, 31, 20, "town-wall");
  t(tiles, 31, 21, "town-wall");
  t(tiles, 31, 22, "town-wall");
  t(tiles, 31, 23, "town-wall");
  t(tiles, 31, 24, "town-wall");
  t(tiles, 31, 25, "town-wall");
  t(tiles, 31, 26, "town-wall");
  t(tiles, 31, 27, "town-wall");
  t(tiles, 31, 28, "town-wall");
  t(tiles, 31, 29, "town-wall");

  // Building sprite anchors — placed AFTER tiles so they override
  for (const b of TOWN_BUILDINGS) {
    if (b.y >= 0 && b.y < H && b.x >= 0 && b.x < W)
      tiles[b.y][b.x] = {
        type: "building",
        sprite: b.sprite,
        walkable: false,
        transparent: true,
        buildingId: b.id,
        rotate: b.rotation ?? 0,
      };
    if (
      b.entranceY >= 0 &&
      b.entranceY < H &&
      b.entranceX >= 0 &&
      b.entranceX < W
    )
      tiles[b.entranceY][b.entranceX] = {
        type: "building",
        sprite: "floor-cobble_blood1",
        walkable: true,
        transparent: true,
        buildingId: b.id,
      };
  }

  // Decoration anchors
  for (const d of DECORATIONS) {
    if (d.y >= 0 && d.y < H && d.x >= 0 && d.x < W)
      tiles[d.y][d.x] = {
        type: "building",
        sprite: d.sprite,
        walkable: false,
        transparent: true,
      };
  }

  const explored = Array.from({ length: H }, () => Array(W).fill(true));
  const visible = Array.from({ length: H }, () => Array(W).fill(true));
  const lit = Array.from({ length: H }, () => Array(W).fill(true));

  return {
    floor: {
      id: "town-0",
      tiles,
      monsters: [],
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
