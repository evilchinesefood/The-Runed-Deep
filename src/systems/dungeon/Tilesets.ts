// ============================================================
// Tileset definitions per dungeon tier
// Separated to avoid circular imports between generator and BossFloors
// ============================================================

export interface Tileset {
  floor: string;
  wall: string;
  litFloor: string;
  wallFilter: string; // CSS filter for wall color tinting
}

export const TILESETS: Record<string, Tileset> = {
  mine:     { floor: 'dark-dgn', wall: 'rock', litFloor: 'lit-dgn', wallFilter: '' },
  fortress: { floor: 'dark-dgn', wall: 'rock', litFloor: 'lit-dgn', wallFilter: 'hue-rotate(200deg) brightness(0.7) saturate(1.5)' },
  castle:   { floor: 'dark-dgn', wall: 'rock', litFloor: 'lit-dgn', wallFilter: 'hue-rotate(340deg) brightness(0.8) saturate(1.3)' },
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
