export interface TrapDef {
  id: string;
  sprite: string;
  damage: [number, number];
  message: string;
}

export const TRAP_TYPES: TrapDef[] = [
  {
    id: "pit",
    sprite: "pit-trap",
    damage: [3, 8],
    message: "You fall into a pit!",
  },
  {
    id: "arrow",
    sprite: "arrow-trap",
    damage: [2, 6],
    message: "An arrow shoots from the wall!",
  },
  {
    id: "fire",
    sprite: "fire-trap",
    damage: [4, 10],
    message: "Flames erupt beneath you!",
  },
  {
    id: "dart",
    sprite: "dart-trap",
    damage: [1, 4],
    message: "A dart flies from a hidden slot!",
  },
  {
    id: "portal",
    sprite: "portal-trap",
    damage: [0, 0],
    message: "A portal pulls you across the room!",
  },
  {
    id: "acid",
    sprite: "acid-trap",
    damage: [3, 9],
    message: "Acid sprays from the floor!",
  },
];

export const TRAP_DATA: Record<string, TrapDef> = Object.fromEntries(
  TRAP_TYPES.map((t) => [t.id, t]),
);
