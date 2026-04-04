// ============================================================
// Tileset adapter — bridges legacy Tileset interface to DungeonThemes
// ============================================================

import {
  type DungeonTheme,
  getThemeForDepth,
  getDungeonIdForDepth,
} from "../../data/DungeonThemes";

export interface Tileset {
  floor: string;
  wall: string;
  litFloor: string;
  wallTint: string;
}

/** Get the dungeon ID for a given floor number (1-indexed, 30 floors) */
export function getDungeonForFloor(
  floorNum: number,
): "mine" | "lair" | "crypt" | "fortress" | "ice" | "castle" {
  return getDungeonIdForDepth(floorNum) as
    | "mine"
    | "lair"
    | "crypt"
    | "fortress"
    | "ice"
    | "castle";
}

/** Build a legacy Tileset from a theme (uses first variant as default) */
function themeToTileset(theme: DungeonTheme): Tileset {
  return {
    floor: theme.floors[0],
    wall: theme.walls[0],
    litFloor: theme.litFloors[0],
    wallTint: theme.wallTint,
  };
}

/** Legacy TILESETS record — built dynamically from themes */
export const TILESETS: Record<string, Tileset> = {
  mine: themeToTileset(getThemeForDepth(1)),
  lair: themeToTileset(getThemeForDepth(6)),
  crypt: themeToTileset(getThemeForDepth(11)),
  fortress: themeToTileset(getThemeForDepth(16)),
  ice: themeToTileset(getThemeForDepth(21)),
  castle: themeToTileset(getThemeForDepth(26)),
};

export function getTileset(dungeonId: string): Tileset {
  return TILESETS[dungeonId] ?? TILESETS["mine"];
}
