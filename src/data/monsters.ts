// ============================================================
// Monster database — Castle of the Winds
//
// Monsters unlock progressively: 1-2 new types every few floors.
// Once unlocked, monsters continue to appear on deeper floors
// but newer, tougher ones are heavily favored.
//
// PROGRESSION TABLE:
// Floor  1: Giant Rat, Kobold
// Floor  2: Large Snake
// Floor  3: Giant Red Ant, Giant Bat
// Floor  4: Wild Dog
// Floor  5: Skeleton, Giant Trapdoor Spider
// Floor  6: Viper
// Floor  7: Carrion Creeper, Goblin
// Floor  8: Giant Scorpion
// Floor  9: Walking Corpse, Huge Lizard
// Floor 10: Green Slime
// Floor 11: Hobgoblin, Shadow
// Floor 12: Huge Ogre
// Floor 13: Gray Wolf, Bandit
// Floor 14: Smirking Sneak Thief
// Floor 15: White Wolf, Barrow Wight      (BOSS: Hrungnir)
// Floor 16: Brown Bear
// Floor 17: Animated Wooden Statue, Cave Bear
// Floor 18: Gelatinous Glob
// Floor 19: Animated Bronze Statue, Evil Warrior
// Floor 20: Dark Wraith                   (BOSS: Wolf-Man)
// Floor 21: Gruesome Troll, Manticore
// Floor 22: Wizard
// Floor 23: Animated Iron Statue, Necromancer
// Floor 24: Eerie Ghost
// Floor 25: Spectre, Vampire              (BOSS: Bear-Man)
// Floor 26: Animated Marble Statue
// Floor 27: Rat-Man, Bull-Man
// Floor 28: Hill Giant
// Floor 29: Ice Devil, Wind Elemental
// Floor 30: Dust Elemental                (BOSS: Frost Giant King)
// Floor 31: Two-Headed Giant, Fire Elemental
// Floor 32: Water Elemental
// Floor 33: Frost Giant, Spiked Devil     (BOSS: Stone Giant King)
// Floor 34: Ice Elemental
// Floor 35: Earth Elemental, Magma Elemental
// Floor 36: Stone Giant                   (BOSS: Fire Giant King)
// Floor 37: Horned Devil, Fire Giant
// Floor 38: White Dragon
// Floor 39: Blue Dragon, Green Dragon
// Floor 40: Abyss Fiend, Red Dragon       (BOSS: Surtur)
//
// ============================================================

import type { MonsterAI, ElementalResistances } from '../core/types';

export interface MonsterTemplate {
  id: string;
  name: string;
  sprite: string;
  hp: [number, number];
  damage: [number, number];
  speed: number;
  xpValue: number;
  armor: number;
  ai: MonsterAI;
  abilities: string[];
  resistances: Partial<ElementalResistances>;
  unlockFloor: number;      // floor this monster first appears on
  boss: boolean;
  bossFloor?: number;
}

function r(overrides: Partial<ElementalResistances>): Partial<ElementalResistances> {
  return overrides;
}

const NO_RESIST: Partial<ElementalResistances> = {};

export const MONSTER_TEMPLATES: MonsterTemplate[] = [

  // ── Floor 1 ─────────────────────────────────────────────
  {
    id: 'giant-rat', name: 'Giant Rat', sprite: 'giant-rat',
    hp: [6, 10], damage: [2, 4], speed: 1.1, xpValue: 3, armor: 0,
    ai: 'melee', abilities: [], resistances: NO_RESIST,
    unlockFloor: 1, boss: false,
  },
  {
    id: 'kobold', name: 'Kobold', sprite: 'kobold',
    hp: [8, 14], damage: [2, 5], speed: 1, xpValue: 5, armor: 1,
    ai: 'melee', abilities: [], resistances: NO_RESIST,
    unlockFloor: 1, boss: false,
  },

  // ── Floor 2 ─────────────────────────────────────────────
  {
    id: 'large-snake', name: 'Large Snake', sprite: 'large-snake',
    hp: [8, 14], damage: [2, 5], speed: 1, xpValue: 5, armor: 0,
    ai: 'melee', abilities: ['poison'], resistances: NO_RESIST,
    unlockFloor: 2, boss: false,
  },

  // ── Floor 3 ─────────────────────────────────────────────
  {
    id: 'giant-red-ant', name: 'Giant Red Ant', sprite: 'giant-red-ant',
    hp: [10, 16], damage: [3, 6], speed: 1, xpValue: 7, armor: 2,
    ai: 'melee', abilities: [], resistances: NO_RESIST,
    unlockFloor: 3, boss: false,
  },
  {
    id: 'giant-bat', name: 'Giant Bat', sprite: 'giant-bat',
    hp: [8, 14], damage: [2, 5], speed: 1.4, xpValue: 6, armor: 0,
    ai: 'melee', abilities: [], resistances: NO_RESIST,
    unlockFloor: 3, boss: false,
  },

  // ── Floor 4 ─────────────────────────────────────────────
  {
    id: 'wild-dog', name: 'Wild Dog', sprite: 'wild-dog',
    hp: [12, 18], damage: [3, 7], speed: 1.2, xpValue: 8, armor: 0,
    ai: 'melee', abilities: [], resistances: NO_RESIST,
    unlockFloor: 4, boss: false,
  },

  // ── Floor 5 ─────────────────────────────────────────────
  {
    id: 'skeleton', name: 'Skeleton', sprite: 'skeleton',
    hp: [14, 22], damage: [4, 8], speed: 0.9, xpValue: 12, armor: 3,
    ai: 'melee', abilities: [], resistances: r({ cold: 50, drain: 100 }),
    unlockFloor: 5, boss: false,
  },
  {
    id: 'giant-trapdoor-spider', name: 'Giant Trapdoor Spider', sprite: 'giant-trapdoor-spider',
    hp: [12, 20], damage: [4, 8], speed: 1, xpValue: 10, armor: 1,
    ai: 'melee', abilities: ['poison'], resistances: NO_RESIST,
    unlockFloor: 5, boss: false,
  },

  // ── Floor 6 ─────────────────────────────────────────────
  {
    id: 'viper', name: 'Viper', sprite: 'viper',
    hp: [12, 20], damage: [4, 8], speed: 1.1, xpValue: 12, armor: 0,
    ai: 'melee', abilities: ['poison'], resistances: NO_RESIST,
    unlockFloor: 6, boss: false,
  },

  // ── Floor 7 ─────────────────────────────────────────────
  {
    id: 'carrion-creeper', name: 'Carrion Creeper', sprite: 'carrion-creeper',
    hp: [18, 28], damage: [5, 10], speed: 0.8, xpValue: 16, armor: 2,
    ai: 'melee', abilities: ['paralyze'], resistances: NO_RESIST,
    unlockFloor: 7, boss: false,
  },
  {
    id: 'goblin', name: 'Goblin', sprite: 'goblin',
    hp: [16, 24], damage: [4, 9], speed: 1, xpValue: 14, armor: 3,
    ai: 'melee', abilities: [], resistances: NO_RESIST,
    unlockFloor: 7, boss: false,
  },

  // ── Floor 8 ─────────────────────────────────────────────
  {
    id: 'giant-scorpion', name: 'Giant Scorpion', sprite: 'giant-scorpion',
    hp: [18, 28], damage: [5, 10], speed: 1, xpValue: 16, armor: 3,
    ai: 'melee', abilities: ['poison'], resistances: NO_RESIST,
    unlockFloor: 8, boss: false,
  },

  // ── Floor 9 ─────────────────────────────────────────────
  {
    id: 'walking-corpse', name: 'Walking Corpse', sprite: 'walking-corpse',
    hp: [20, 32], damage: [5, 11], speed: 0.7, xpValue: 18, armor: 1,
    ai: 'melee', abilities: [], resistances: r({ cold: 50, drain: 100 }),
    unlockFloor: 9, boss: false,
  },
  {
    id: 'huge-lizard', name: 'Huge Lizard', sprite: 'huge-lizard',
    hp: [22, 34], damage: [6, 12], speed: 0.9, xpValue: 20, armor: 4,
    ai: 'melee', abilities: [], resistances: NO_RESIST,
    unlockFloor: 9, boss: false,
  },

  // ── Floor 10 ────────────────────────────────────────────
  {
    id: 'green-slime', name: 'Green Slime', sprite: 'green-slime',
    hp: [22, 35], damage: [4, 9], speed: 0.5, xpValue: 20, armor: 0,
    ai: 'melee', abilities: ['physical-immune'], resistances: r({ acid: 100 }),
    unlockFloor: 10, boss: false,
  },

  // ── Floor 11 ────────────────────────────────────────────
  {
    id: 'hobgoblin', name: 'Hobgoblin', sprite: 'hobgoblin',
    hp: [24, 36], damage: [6, 13], speed: 1, xpValue: 24, armor: 5,
    ai: 'melee', abilities: [], resistances: NO_RESIST,
    unlockFloor: 11, boss: false,
  },
  {
    id: 'shadow', name: 'Shadow', sprite: 'shadow',
    hp: [20, 32], damage: [6, 12], speed: 1.1, xpValue: 26, armor: 0,
    ai: 'melee', abilities: ['drain-strength'], resistances: r({ cold: 50, drain: 100 }),
    unlockFloor: 11, boss: false,
  },

  // ── Floor 12 ────────────────────────────────────────────
  {
    id: 'huge-ogre', name: 'Huge Ogre', sprite: 'huge-ogre',
    hp: [28, 42], damage: [7, 14], speed: 0.8, xpValue: 28, armor: 3,
    ai: 'melee', abilities: [], resistances: NO_RESIST,
    unlockFloor: 12, boss: false,
  },

  // ── Floor 13 ────────────────────────────────────────────
  {
    id: 'gray-wolf', name: 'Gray Wolf', sprite: 'gray-wolf',
    hp: [24, 36], damage: [6, 13], speed: 1.3, xpValue: 24, armor: 1,
    ai: 'melee', abilities: [], resistances: NO_RESIST,
    unlockFloor: 13, boss: false,
  },
  {
    id: 'bandit', name: 'Bandit', sprite: 'bandit',
    hp: [26, 40], damage: [7, 14], speed: 1, xpValue: 28, armor: 5,
    ai: 'melee', abilities: [], resistances: NO_RESIST,
    unlockFloor: 13, boss: false,
  },

  // ── Floor 14 ────────────────────────────────────────────
  {
    id: 'smirking-sneak-thief', name: 'Smirking Sneak Thief', sprite: 'smirking-sneak-thief',
    hp: [18, 28], damage: [5, 10], speed: 1.5, xpValue: 30, armor: 2,
    ai: 'thief', abilities: ['steal-gold', 'teleport'], resistances: NO_RESIST,
    unlockFloor: 14, boss: false,
  },

  // ── Floor 15 ────────────────────────────────────────────
  {
    id: 'white-wolf', name: 'White Wolf', sprite: 'white-wolf',
    hp: [28, 42], damage: [7, 15], speed: 1.3, xpValue: 32, armor: 2,
    ai: 'melee', abilities: [], resistances: r({ cold: 50 }),
    unlockFloor: 15, boss: false,
  },
  {
    id: 'barrow-wight', name: 'Barrow Wight', sprite: 'barrow-wight',
    hp: [28, 42], damage: [7, 14], speed: 0.9, xpValue: 38, armor: 3,
    ai: 'melee', abilities: ['drain-level'], resistances: r({ cold: 50, drain: 100 }),
    unlockFloor: 15, boss: false,
  },

  // ── Floor 16 ────────────────────────────────────────────
  {
    id: 'brown-bear', name: 'Brown Bear', sprite: 'brown-bear',
    hp: [34, 50], damage: [8, 16], speed: 1, xpValue: 36, armor: 3,
    ai: 'melee', abilities: [], resistances: NO_RESIST,
    unlockFloor: 16, boss: false,
  },

  // ── Floor 17 ────────────────────────────────────────────
  {
    id: 'animated-wooden-statue', name: 'Animated Wooden Statue', sprite: 'animated-wooden-statue',
    hp: [30, 44], damage: [7, 14], speed: 0.8, xpValue: 34, armor: 5,
    ai: 'melee', abilities: [], resistances: r({ fire: -50, cold: 50, drain: 100 }),
    unlockFloor: 17, boss: false,
  },
  {
    id: 'cave-bear', name: 'Cave Bear', sprite: 'cave-bear',
    hp: [40, 58], damage: [9, 18], speed: 1, xpValue: 44, armor: 4,
    ai: 'melee', abilities: [], resistances: NO_RESIST,
    unlockFloor: 17, boss: false,
  },

  // ── Floor 18 ────────────────────────────────────────────
  {
    id: 'gelatinous-glob', name: 'Gelatinous Glob', sprite: 'gelatinous-glob',
    hp: [30, 48], damage: [6, 12], speed: 0.4, xpValue: 36, armor: 0,
    ai: 'melee', abilities: ['physical-immune', 'acid-touch'], resistances: r({ acid: 100, lightning: 50 }),
    unlockFloor: 18, boss: false,
  },

  // ── Floor 19 ────────────────────────────────────────────
  {
    id: 'animated-bronze-statue', name: 'Animated Bronze Statue', sprite: 'animated-bronze-statue',
    hp: [36, 52], damage: [8, 16], speed: 0.7, xpValue: 42, armor: 8,
    ai: 'melee', abilities: [], resistances: r({ lightning: 50, drain: 100 }),
    unlockFloor: 19, boss: false,
  },
  {
    id: 'evil-warrior', name: 'Evil Warrior', sprite: 'evil-warrior',
    hp: [38, 56], damage: [9, 18], speed: 1, xpValue: 48, armor: 7,
    ai: 'melee', abilities: [], resistances: NO_RESIST,
    unlockFloor: 19, boss: false,
  },

  // ── Floor 20 ────────────────────────────────────────────
  {
    id: 'dark-wraith', name: 'Dark Wraith', sprite: 'dark-wraith',
    hp: [32, 48], damage: [8, 16], speed: 1.1, xpValue: 52, armor: 2,
    ai: 'melee', abilities: ['drain-constitution'], resistances: r({ cold: 75, drain: 100 }),
    unlockFloor: 20, boss: false,
  },

  // ── Floor 21 ────────────────────────────────────────────
  {
    id: 'gruesome-troll', name: 'Gruesome Troll', sprite: 'gruesome-troll',
    hp: [48, 70], damage: [10, 20], speed: 1, xpValue: 60, armor: 5,
    ai: 'melee', abilities: ['regenerate'], resistances: r({ fire: -50 }),
    unlockFloor: 21, boss: false,
  },
  {
    id: 'manticore', name: 'Manticore', sprite: 'manticore',
    hp: [44, 64], damage: [10, 20], speed: 1.2, xpValue: 65, armor: 5,
    ai: 'ranged', abilities: ['tail-spikes'], resistances: NO_RESIST,
    unlockFloor: 21, boss: false,
  },

  // ── Floor 22 ────────────────────────────────────────────
  {
    id: 'wizard', name: 'Wizard', sprite: 'wizard',
    hp: [30, 44], damage: [6, 12], speed: 1, xpValue: 60, armor: 2,
    ai: 'caster', abilities: ['cast-cold-bolt', 'cast-lightning-bolt', 'cast-fire-bolt', 'summon-monster'],
    resistances: NO_RESIST,
    unlockFloor: 22, boss: false,
  },

  // ── Floor 23 ────────────────────────────────────────────
  {
    id: 'animated-iron-statue', name: 'Animated Iron Statue', sprite: 'animated-iron-statue',
    hp: [50, 72], damage: [10, 20], speed: 0.6, xpValue: 58, armor: 10,
    ai: 'melee', abilities: [], resistances: r({ lightning: 75, drain: 100 }),
    unlockFloor: 23, boss: false,
  },
  {
    id: 'necromancer', name: 'Necromancer', sprite: 'necromancer',
    hp: [34, 50], damage: [7, 14], speed: 1, xpValue: 68, armor: 3,
    ai: 'caster', abilities: ['cast-cold-bolt', 'cast-lightning-bolt', 'summon-undead'],
    resistances: r({ drain: 50 }),
    unlockFloor: 23, boss: false,
  },

  // ── Floor 24 ────────────────────────────────────────────
  {
    id: 'eerie-ghost', name: 'Eerie Ghost', sprite: 'eerie-ghost',
    hp: [38, 56], damage: [9, 18], speed: 1.2, xpValue: 64, armor: 0,
    ai: 'melee', abilities: ['drain-intelligence', 'phase-through-walls'],
    resistances: r({ cold: 75, drain: 100 }),
    unlockFloor: 24, boss: false,
  },

  // ── Floor 25 ────────────────────────────────────────────
  {
    id: 'spectre', name: 'Spectre', sprite: 'spectre',
    hp: [44, 64], damage: [10, 22], speed: 1.1, xpValue: 78, armor: 0,
    ai: 'melee', abilities: ['drain-level'],
    resistances: r({ cold: 100, drain: 100 }),
    unlockFloor: 25, boss: false,
  },
  {
    id: 'vampire', name: 'Vampire', sprite: 'vampire',
    hp: [52, 75], damage: [11, 22], speed: 1.2, xpValue: 88, armor: 4,
    ai: 'melee', abilities: ['drain-hp', 'drain-level'],
    resistances: r({ cold: 50, drain: 100 }),
    unlockFloor: 25, boss: false,
  },

  // ── Floor 26 ────────────────────────────────────────────
  {
    id: 'animated-marble-statue', name: 'Animated Marble Statue', sprite: 'animated-marble-statue',
    hp: [56, 80], damage: [11, 22], speed: 0.6, xpValue: 70, armor: 12,
    ai: 'melee', abilities: [],
    resistances: r({ lightning: 100, drain: 100 }),
    unlockFloor: 26, boss: false,
  },

  // ── Floor 27 ────────────────────────────────────────────
  {
    id: 'rat-man', name: 'Rat-Man', sprite: 'rat-man',
    hp: [44, 64], damage: [10, 20], speed: 1.2, xpValue: 72, armor: 4,
    ai: 'melee', abilities: [], resistances: NO_RESIST,
    unlockFloor: 27, boss: false,
  },
  {
    id: 'bull-man', name: 'Bull-Man', sprite: 'bull-man',
    hp: [56, 82], damage: [12, 24], speed: 1, xpValue: 85, armor: 6,
    ai: 'melee', abilities: ['charge'], resistances: NO_RESIST,
    unlockFloor: 27, boss: false,
  },

  // ── Floor 28 ────────────────────────────────────────────
  {
    id: 'hill-giant', name: 'Hill Giant', sprite: 'hill-giant',
    hp: [64, 95], damage: [14, 28], speed: 0.8, xpValue: 100, armor: 6,
    ai: 'melee', abilities: ['throw-boulder'], resistances: NO_RESIST,
    unlockFloor: 28, boss: false,
  },

  // ── Floor 29 ────────────────────────────────────────────
  {
    id: 'ice-devil', name: 'Ice Devil', sprite: 'ice-devil',
    hp: [58, 85], damage: [12, 24], speed: 1, xpValue: 105, armor: 8,
    ai: 'melee', abilities: ['cold-touch'],
    resistances: r({ cold: 100, fire: -50, drain: 50 }),
    unlockFloor: 29, boss: false,
  },
  {
    id: 'wind-elemental', name: 'Wind Elemental', sprite: 'wind-elemental',
    hp: [46, 68], damage: [10, 20], speed: 1.5, xpValue: 80, armor: 2,
    ai: 'melee', abilities: [],
    resistances: r({ lightning: 50, drain: 100 }),
    unlockFloor: 29, boss: false,
  },

  // ── Floor 30 ────────────────────────────────────────────
  {
    id: 'dust-elemental', name: 'Dust Elemental', sprite: 'dust-elemental',
    hp: [50, 74], damage: [10, 20], speed: 1, xpValue: 84, armor: 4,
    ai: 'melee', abilities: ['blind'],
    resistances: r({ drain: 100 }),
    unlockFloor: 30, boss: false,
  },

  // ── Floor 31 ────────────────────────────────────────────
  {
    id: 'two-headed-giant', name: 'Two-Headed Giant', sprite: 'two-headed-giant',
    hp: [75, 110], damage: [16, 32], speed: 0.8, xpValue: 125, armor: 7,
    ai: 'melee', abilities: ['throw-boulder'], resistances: NO_RESIST,
    unlockFloor: 31, boss: false,
  },
  {
    id: 'fire-elemental', name: 'Fire Elemental', sprite: 'fire-elemental',
    hp: [56, 82], damage: [12, 26], speed: 1.1, xpValue: 110, armor: 3,
    ai: 'melee', abilities: ['fire-touch'],
    resistances: r({ fire: 100, cold: -50, drain: 100 }),
    unlockFloor: 31, boss: false,
  },

  // ── Floor 32 ────────────────────────────────────────────
  {
    id: 'water-elemental', name: 'Water Elemental', sprite: 'water-elemental',
    hp: [56, 82], damage: [12, 24], speed: 1, xpValue: 100, armor: 4,
    ai: 'melee', abilities: [],
    resistances: r({ fire: 50, cold: 50, drain: 100 }),
    unlockFloor: 32, boss: false,
  },

  // ── Floor 33 ────────────────────────────────────────────
  {
    id: 'frost-giant', name: 'Frost Giant', sprite: 'frost-giant',
    hp: [80, 120], damage: [16, 32], speed: 0.9, xpValue: 140, armor: 8,
    ai: 'melee', abilities: ['throw-ice-ball'],
    resistances: r({ cold: 100, fire: -50 }),
    unlockFloor: 33, boss: false,
  },
  {
    id: 'spiked-devil', name: 'Spiked Devil', sprite: 'spiked-devil',
    hp: [65, 95], damage: [14, 28], speed: 1.1, xpValue: 130, armor: 8,
    ai: 'melee', abilities: [],
    resistances: r({ cold: 50, fire: 100, drain: 50 }),
    unlockFloor: 33, boss: false,
  },

  // ── Floor 34 ────────────────────────────────────────────
  {
    id: 'ice-elemental', name: 'Ice Elemental', sprite: 'ice-elemental',
    hp: [58, 85], damage: [12, 26], speed: 0.9, xpValue: 110, armor: 6,
    ai: 'melee', abilities: ['cold-touch'],
    resistances: r({ cold: 100, fire: -50, drain: 100 }),
    unlockFloor: 34, boss: false,
  },

  // ── Floor 35 ────────────────────────────────────────────
  {
    id: 'earth-elemental', name: 'Earth Elemental', sprite: 'earth-elemental',
    hp: [70, 105], damage: [14, 30], speed: 0.6, xpValue: 120, armor: 10,
    ai: 'melee', abilities: [],
    resistances: r({ lightning: 50, drain: 100 }),
    unlockFloor: 35, boss: false,
  },
  {
    id: 'magma-elemental', name: 'Magma Elemental', sprite: 'magma-elemental',
    hp: [65, 95], damage: [14, 30], speed: 0.7, xpValue: 130, armor: 8,
    ai: 'melee', abilities: ['fire-touch'],
    resistances: r({ fire: 100, cold: -75, drain: 100 }),
    unlockFloor: 35, boss: false,
  },

  // ── Floor 36 ────────────────────────────────────────────
  {
    id: 'stone-giant', name: 'Stone Giant', sprite: 'stone-giant',
    hp: [90, 130], damage: [18, 36], speed: 0.7, xpValue: 155, armor: 12,
    ai: 'melee', abilities: ['throw-boulder'],
    resistances: r({ lightning: 50 }),
    unlockFloor: 36, boss: false,
  },

  // ── Floor 37 ────────────────────────────────────────────
  {
    id: 'horned-devil', name: 'Horned Devil', sprite: 'horned-devil',
    hp: [80, 115], damage: [16, 34], speed: 1, xpValue: 165, armor: 10,
    ai: 'melee', abilities: ['fire-touch'],
    resistances: r({ cold: 50, fire: 100, drain: 75 }),
    unlockFloor: 37, boss: false,
  },
  {
    id: 'fire-giant', name: 'Fire Giant', sprite: 'fire-giant',
    hp: [90, 130], damage: [18, 36], speed: 0.9, xpValue: 170, armor: 10,
    ai: 'melee', abilities: ['fire-touch', 'throw-boulder'],
    resistances: r({ fire: 100, cold: -50 }),
    unlockFloor: 37, boss: false,
  },

  // ── Floor 38 ────────────────────────────────────────────
  {
    id: 'white-dragon', name: 'White Dragon', sprite: 'white-dragon',
    hp: [85, 125], damage: [16, 34], speed: 1.1, xpValue: 185, armor: 10,
    ai: 'ranged', abilities: ['breath-cold'],
    resistances: r({ cold: 100, fire: -25 }),
    unlockFloor: 38, boss: false,
  },

  // ── Floor 39 ────────────────────────────────────────────
  {
    id: 'blue-dragon', name: 'Blue Dragon', sprite: 'blue-dragon',
    hp: [95, 140], damage: [18, 38], speed: 1.1, xpValue: 220, armor: 11,
    ai: 'ranged', abilities: ['breath-lightning'],
    resistances: r({ lightning: 100 }),
    unlockFloor: 39, boss: false,
  },
  {
    id: 'green-dragon', name: 'Green Dragon', sprite: 'green-dragon',
    hp: [95, 140], damage: [18, 38], speed: 1, xpValue: 220, armor: 12,
    ai: 'ranged', abilities: ['breath-acid'],
    resistances: r({ acid: 100 }),
    unlockFloor: 39, boss: false,
  },

  // ── Floor 40 ────────────────────────────────────────────
  {
    id: 'abyss-fiend', name: 'Abyss Fiend', sprite: 'abyss-fiend',
    hp: [100, 145], damage: [20, 40], speed: 1.1, xpValue: 240, armor: 12,
    ai: 'summoner', abilities: ['summon-devil', 'teleport'],
    resistances: r({ cold: 50, fire: 100, drain: 100 }),
    unlockFloor: 40, boss: false,
  },
  {
    id: 'red-dragon', name: 'Red Dragon', sprite: 'red-dragon',
    hp: [120, 175], damage: [22, 44], speed: 1, xpValue: 300, armor: 14,
    ai: 'ranged', abilities: ['breath-fire'],
    resistances: r({ fire: 100, cold: -25 }),
    unlockFloor: 40, boss: false,
  },

  // ── Boss Monsters (specific floors only) ────────────────
  {
    id: 'hill-giant-king', name: 'Hrungnir, Hill Giant Lord', sprite: 'hill-giant-king',
    hp: [120, 160], damage: [20, 40], speed: 0.9, xpValue: 350, armor: 10,
    ai: 'melee', abilities: ['throw-boulder'], resistances: NO_RESIST,
    unlockFloor: 99, boss: true, bossFloor: 15,
  },
  {
    id: 'wolf-man', name: 'Wolf-Man', sprite: 'wolf-man',
    hp: [100, 130], damage: [16, 32], speed: 1.3, xpValue: 250, armor: 8,
    ai: 'melee', abilities: [], resistances: NO_RESIST,
    unlockFloor: 99, boss: true, bossFloor: 20,
  },
  {
    id: 'bear-man', name: 'Bear-Man', sprite: 'bear-man',
    hp: [130, 170], damage: [18, 38], speed: 1, xpValue: 320, armor: 10,
    ai: 'melee', abilities: [], resistances: NO_RESIST,
    unlockFloor: 99, boss: true, bossFloor: 25,
  },
  {
    id: 'frost-giant-king', name: 'Frost Giant King', sprite: 'frost-giant-king',
    hp: [140, 190], damage: [22, 44], speed: 0.9, xpValue: 400, armor: 12,
    ai: 'melee', abilities: ['throw-ice-ball'],
    resistances: r({ cold: 100, fire: -50 }),
    unlockFloor: 99, boss: true, bossFloor: 30,
  },
  {
    id: 'stone-giant-king', name: 'Stone Giant King', sprite: 'stone-giant-king',
    hp: [160, 210], damage: [24, 48], speed: 0.7, xpValue: 450, armor: 15,
    ai: 'melee', abilities: ['throw-boulder'],
    resistances: r({ lightning: 75 }),
    unlockFloor: 99, boss: true, bossFloor: 33,
  },
  {
    id: 'fire-giant-king', name: 'Fire Giant King', sprite: 'fire-giant-king',
    hp: [170, 220], damage: [26, 50], speed: 0.9, xpValue: 500, armor: 14,
    ai: 'melee', abilities: ['fire-touch', 'throw-boulder'],
    resistances: r({ fire: 100, cold: -50 }),
    unlockFloor: 99, boss: true, bossFloor: 36,
  },
  {
    id: 'surtur', name: 'Surtur', sprite: 'surtur',
    hp: [250, 320], damage: [30, 60], speed: 1, xpValue: 1000, armor: 18,
    ai: 'caster', abilities: ['cast-fire-ball', 'fire-touch', 'summon-fire-giant', 'throw-boulder'],
    resistances: r({ fire: 100, cold: -50, drain: 50 }),
    unlockFloor: 99, boss: true, bossFloor: 40,
  },
];

// ============================================================
// Lookup helpers
// ============================================================

/** All templates indexed by id */
export const MONSTER_BY_ID: Record<string, MonsterTemplate> = Object.fromEntries(
  MONSTER_TEMPLATES.map(m => [m.id, m])
);

/**
 * Returns non-boss monster templates available at the given depth.
 */
export function getMonstersForDepth(depth: number): MonsterTemplate[] {
  return MONSTER_TEMPLATES.filter(m => !m.boss && depth >= m.unlockFloor);
}

/**
 * Returns the highest unlock floor among available monsters at this depth.
 */
export function getNewestUnlockFloor(depth: number): number {
  let max = 1;
  for (const m of MONSTER_TEMPLATES) {
    if (!m.boss && depth >= m.unlockFloor && m.unlockFloor > max) {
      max = m.unlockFloor;
    }
  }
  return max;
}

/**
 * Returns boss monster for a specific floor, if any.
 */
export function getBossForFloor(floor: number): MonsterTemplate | undefined {
  return MONSTER_TEMPLATES.find(m => m.boss && m.bossFloor === floor);
}
