import type { Element } from "../core/types";

export interface TrapDef {
  id: string;
  sprite: string;
  damage: [number, number];
  message: string;
  element?: Element; // if set, hero resistance reduces damage
}

export const TRAP_TYPES: TrapDef[] = [
  // Physical traps — no element
  {
    id: "pit",
    sprite: "traps-shaft",
    damage: [3, 8],
    message: "You fall into a pit!",
  },
  {
    id: "arrow",
    sprite: "traps-bolt",
    damage: [2, 6],
    message: "An arrow shoots from the wall!",
  },
  {
    id: "dart",
    sprite: "traps-spear",
    damage: [1, 4],
    message: "A dart flies from a hidden slot!",
  },

  // Elemental traps — check resistances
  {
    id: "fire",
    sprite: "traps-alarm",
    damage: [4, 10],
    element: "fire",
    message: "Flames erupt beneath you!",
  },
  {
    id: "acid",
    sprite: "traps-net",
    damage: [3, 9],
    element: "acid",
    message: "Acid sprays from the floor!",
  },
  {
    id: "lightning",
    sprite: "traps-zot",
    damage: [3, 10],
    element: "lightning",
    message: "Lightning crackles through the ground!",
  },
  {
    id: "wind",
    sprite: "traps-dispersal",
    damage: [2, 7],
    element: "cold",
    message: "A freezing gust blasts you!",
  },
  {
    id: "rune",
    sprite: "traps-binding_sigil",
    damage: [5, 12],
    element: "drain",
    message: "Dark runes flare and drain your life!",
  },

  // Special traps — no damage
  {
    id: "portal",
    sprite: "traps-teleport",
    damage: [0, 0],
    message: "A portal pulls you across the room!",
  },
  {
    id: "cobweb",
    sprite: "traps-cobweb_NESW",
    damage: [0, 0],
    message: "You walk into a thick cobweb! You lose a turn.",
  },
];

export const TRAP_DATA: Record<string, TrapDef> = Object.fromEntries(
  TRAP_TYPES.map((t) => [t.id, t]),
);
