import type { Element } from '../core/types';

export interface TrapDef {
  id: string;
  sprite: string;
  damage: [number, number];
  message: string;
  element?: Element; // if set, hero resistance reduces damage
}

export const TRAP_TYPES: TrapDef[] = [
  // Physical traps — no element
  { id: 'pit', sprite: 'pit-trap', damage: [3, 8],
    message: 'You fall into a pit!' },
  { id: 'arrow', sprite: 'arrow-trap', damage: [2, 6],
    message: 'An arrow shoots from the wall!' },
  { id: 'dart', sprite: 'dart-trap', damage: [1, 4],
    message: 'A dart flies from a hidden slot!' },

  // Elemental traps — check resistances
  { id: 'fire', sprite: 'fire-trap', damage: [4, 10], element: 'fire',
    message: 'Flames erupt beneath you!' },
  { id: 'acid', sprite: 'acid-trap', damage: [3, 9], element: 'acid',
    message: 'Acid sprays from the floor!' },
  { id: 'lightning', sprite: 'lightning-trap', damage: [3, 10], element: 'lightning',
    message: 'Lightning crackles through the ground!' },
  { id: 'wind', sprite: 'wind-trap', damage: [2, 7], element: 'cold',
    message: 'A freezing gust blasts you!' },
  { id: 'rune', sprite: 'rune-trap', damage: [5, 12], element: 'drain',
    message: 'Dark runes flare and drain your life!' },

  // Special traps — no damage
  { id: 'portal', sprite: 'portal-trap', damage: [0, 0],
    message: 'A portal pulls you across the room!' },
  { id: 'cobweb', sprite: 'cobweb-trap', damage: [0, 0],
    message: 'You walk into a thick cobweb! You lose a turn.' },
];

export const TRAP_DATA: Record<string, TrapDef> = Object.fromEntries(
  TRAP_TYPES.map((t) => [t.id, t]),
);
