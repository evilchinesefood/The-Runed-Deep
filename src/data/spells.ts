// ============================================================
// Spell database — all 30 learnable spells from The Runed Deep
// ============================================================

export type SpellCategory =
  | 'attack'
  | 'healing'
  | 'defense'
  | 'control'
  | 'movement'
  | 'divination'
  | 'misc';

export type SpellTargeting =
  | 'self'        // affects caster only
  | 'direction'   // fires in a direction (bolts)
  | 'target'      // pick a target tile (balls, single-target)
  | 'area'        // affects area around target
  | 'none';       // no targeting needed (buffs, detection)

export type DamageElement = 'physical' | 'cold' | 'fire' | 'lightning' | 'acid' | 'drain';

export interface SpellDef {
  id: string;
  name: string;
  category: SpellCategory;
  level: number;           // minimum character level to learn
  manaCost: number;
  targeting: SpellTargeting;
  element?: DamageElement;
  aoe: boolean;            // area of effect (ball spells)
  description: string;
}

export const SPELLS: SpellDef[] = [
  // ── Attack ──────────────────────────────────────────────
  {
    id: 'magic-arrow',
    name: 'Magic Arrow',
    category: 'attack',
    level: 1,
    manaCost: 1,
    targeting: 'direction',
    element: 'physical',
    aoe: false,
    description: 'Fires a magical arrow in the chosen direction.',
  },
  {
    id: 'cold-bolt',
    name: 'Cold Bolt',
    category: 'attack',
    level: 2,
    manaCost: 2,
    targeting: 'direction',
    element: 'cold',
    aoe: false,
    description: 'Hurls a bolt of freezing cold.',
  },
  {
    id: 'lightning-bolt',
    name: 'Lightning Bolt',
    category: 'attack',
    level: 3,
    manaCost: 3,
    targeting: 'direction',
    element: 'lightning',
    aoe: false,
    description: 'Unleashes a bolt of lightning.',
  },
  {
    id: 'fire-bolt',
    name: 'Fire Bolt',
    category: 'attack',
    level: 3,
    manaCost: 3,
    targeting: 'direction',
    element: 'fire',
    aoe: false,
    description: 'Launches a bolt of fire.',
  },
  {
    id: 'cold-ball',
    name: 'Cold Ball',
    category: 'attack',
    level: 3,
    manaCost: 4,
    targeting: 'target',
    element: 'cold',
    aoe: true,
    description: 'Creates an explosion of cold at the target. Deals half damage to adjacent tiles.',
  },
  {
    id: 'ball-lightning',
    name: 'Ball Lightning',
    category: 'attack',
    level: 4,
    manaCost: 4,
    targeting: 'target',
    element: 'lightning',
    aoe: true,
    description: 'Hurls a ball of lightning that explodes on impact.',
  },
  {
    id: 'fire-ball',
    name: 'Fire Ball',
    category: 'attack',
    level: 4,
    manaCost: 5,
    targeting: 'target',
    element: 'fire',
    aoe: true,
    description: 'Launches a ball of fire that explodes at the target.',
  },

  // ── Healing ─────────────────────────────────────────────
  {
    id: 'heal-minor-wounds',
    name: 'Heal Minor Wounds',
    category: 'healing',
    level: 1,
    manaCost: 1,
    targeting: 'self',
    aoe: false,
    description: 'Heals a small amount of damage.',
  },
  {
    id: 'heal-medium-wounds',
    name: 'Heal Medium Wounds',
    category: 'healing',
    level: 3,
    manaCost: 3,
    targeting: 'self',
    aoe: false,
    description: 'Heals a moderate amount of damage.',
  },
  {
    id: 'heal-major-wounds',
    name: 'Heal Major Wounds',
    category: 'healing',
    level: 4,
    manaCost: 5,
    targeting: 'self',
    aoe: false,
    description: 'Heals a large amount of damage.',
  },
  {
    id: 'healing',
    name: 'Healing',
    category: 'healing',
    level: 5,
    manaCost: 6,
    targeting: 'self',
    aoe: false,
    description: 'Fully restores all hit points.',
  },
  {
    id: 'neutralize-poison',
    name: 'Neutralize Poison',
    category: 'healing',
    level: 2,
    manaCost: 3,
    targeting: 'self',
    aoe: false,
    description: 'Cures all poison effects.',
  },

  // ── Defense ─────────────────────────────────────────────
  {
    id: 'shield',
    name: 'Shield',
    category: 'defense',
    level: 1,
    manaCost: 1,
    targeting: 'self',
    aoe: false,
    description: 'Creates a magical shield that improves armor value.',
  },
  {
    id: 'resist-cold',
    name: 'Resist Cold',
    category: 'defense',
    level: 3,
    manaCost: 3,
    targeting: 'self',
    aoe: false,
    description: 'Grants temporary resistance to cold attacks.',
  },
  {
    id: 'resist-lightning',
    name: 'Resist Lightning',
    category: 'defense',
    level: 3,
    manaCost: 3,
    targeting: 'self',
    aoe: false,
    description: 'Grants temporary resistance to lightning attacks.',
  },
  {
    id: 'resist-fire',
    name: 'Resist Fire',
    category: 'defense',
    level: 3,
    manaCost: 3,
    targeting: 'self',
    aoe: false,
    description: 'Grants temporary resistance to fire attacks.',
  },

  // ── Control ─────────────────────────────────────────────
  {
    id: 'sleep-monster',
    name: 'Sleep Monster',
    category: 'control',
    level: 3,
    manaCost: 4,
    targeting: 'target',
    aoe: false,
    description: 'Puts a monster to sleep. It will awaken if attacked.',
  },
  {
    id: 'slow-monster',
    name: 'Slow Monster',
    category: 'control',
    level: 3,
    manaCost: 4,
    targeting: 'target',
    aoe: false,
    description: 'Slows a monster, reducing its speed.',
  },
  {
    id: 'transmogrify-monster',
    name: 'Transmogrify Monster',
    category: 'control',
    level: 5,
    manaCost: 6,
    targeting: 'target',
    aoe: false,
    description: 'Transforms a monster into a different, usually weaker creature.',
  },

  // ── Movement ────────────────────────────────────────────
  {
    id: 'phase-door',
    name: 'Phase Door',
    category: 'movement',
    level: 1,
    manaCost: 1,
    targeting: 'direction',
    aoe: false,
    description: 'Teleports you a short distance in a random direction.',
  },
  {
    id: 'levitation',
    name: 'Levitation',
    category: 'movement',
    level: 2,
    manaCost: 2,
    targeting: 'self',
    aoe: false,
    description: 'Allows you to float above the ground, avoiding traps.',
  },
  {
    id: 'rune-of-return',
    name: 'Rune of Return',
    category: 'movement',
    level: 3,
    manaCost: 3,
    targeting: 'self',
    aoe: false,
    description: 'Teleports you between town and the deepest dungeon level visited.',
  },
  {
    id: 'teleport',
    name: 'Teleport',
    category: 'movement',
    level: 3,
    manaCost: 3,
    targeting: 'self',
    aoe: false,
    description: 'Teleports you to a random location on the current floor.',
  },

  // ── Divination ──────────────────────────────────────────
  {
    id: 'detect-objects',
    name: 'Detect Objects',
    category: 'divination',
    level: 1,
    manaCost: 1,
    targeting: 'none',
    aoe: false,
    description: 'Reveals the locations of all items on the current floor.',
  },
  {
    id: 'detect-monsters',
    name: 'Detect Monsters',
    category: 'divination',
    level: 2,
    manaCost: 2,
    targeting: 'none',
    aoe: false,
    description: 'Reveals the locations of all monsters on the current floor.',
  },
  {
    id: 'detect-traps',
    name: 'Detect Traps',
    category: 'divination',
    level: 2,
    manaCost: 2,
    targeting: 'none',
    aoe: false,
    description: 'Reveals all traps within a 10-tile radius.',
  },
  {
    id: 'clairvoyance',
    name: 'Clairvoyance',
    category: 'divination',
    level: 2,
    manaCost: 3,
    targeting: 'none',
    aoe: false,
    description: 'Reveals a 10x10 area of the map including traps and secret doors.',
  },

  // ── Misc ────────────────────────────────────────────────
  {
    id: 'light',
    name: 'Light',
    category: 'misc',
    level: 1,
    manaCost: 1,
    targeting: 'self',
    aoe: false,
    description: 'Illuminates the area around you.',
  },
  {
    id: 'remove-curse',
    name: 'Remove Curse',
    category: 'misc',
    level: 3,
    manaCost: 3,
    targeting: 'self',
    aoe: false,
    description: 'Removes a curse from an equipped item, allowing it to be unequipped.',
  },
];

/** All spells indexed by id for fast lookup */
export const SPELL_BY_ID: Record<string, SpellDef> = Object.fromEntries(
  SPELLS.map(s => [s.id, s])
);

/** Spells available as starting spells (Level 1) */
export const STARTER_SPELLS: SpellDef[] = SPELLS.filter(s => s.level === 1);
