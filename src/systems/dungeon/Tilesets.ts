// ============================================================
// Tileset definitions per dungeon tier
// Separated to avoid circular imports between generator and BossFloors
// ============================================================

export interface Tileset {
  floor: string;
  wall: string;
  litFloor: string;
  wallTint: string; // CSS background-color for multiply blend tinting
}

export const TILESETS: Record<string, Tileset> = {
  mine: {
    floor: "floor-grey_dirt0",
    wall: "wall-brick_gray0",
    litFloor: "floor-grey_dirt_b_0",
    wallTint: "",
  },
  fortress: {
    floor: "floor-grey_dirt0",
    wall: "wall-brick_gray0",
    litFloor: "floor-grey_dirt_b_0",
    wallTint: "#6688bb",
  },
  castle: {
    floor: "floor-grey_dirt0",
    wall: "wall-brick_gray0",
    litFloor: "floor-grey_dirt_b_0",
    wallTint: "#bb7755",
  },
};

/** Get the dungeon ID for a given floor number (1-indexed, 30 floors) */
export function getDungeonForFloor(
  floorNum: number,
): "mine" | "fortress" | "castle" {
  if (floorNum <= 10) return "mine";
  if (floorNum <= 20) return "fortress";
  return "castle";
}

export function getTileset(dungeonId: string): Tileset {
  return TILESETS[dungeonId] ?? TILESETS["mine"];
}
