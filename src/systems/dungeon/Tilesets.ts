// ============================================================
// Tileset definitions per dungeon tier
// Separated to avoid circular imports between generator and BossFloors
// ============================================================

export interface Tileset {
  floor: string;
  wall: string;
  litFloor: string;
}

export const TILESETS: Record<string, Tileset> = {
  mine:     { floor: 'dark-dgn', wall: 'rock', litFloor: 'lit-dgn' },
  fortress: { floor: 'dark-dgn', wall: 'wall-dark-dgn', litFloor: 'lit-dgn' },
  castle:   { floor: 'dark-dgn', wall: 'castle-wall', litFloor: 'lit-dgn' },
};

/** Get the dungeon ID for a given floor number (0-indexed) */
export function getDungeonForFloor(floorNum: number): 'mine' | 'fortress' | 'castle' {
  const depth = floorNum + 1;
  if (depth <= 13) return 'mine';
  if (depth <= 26) return 'fortress';
  return 'castle';
}

export function getTileset(dungeonId: string): Tileset {
  return TILESETS[dungeonId] ?? TILESETS['mine'];
}
