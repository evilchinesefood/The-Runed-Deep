import type { GameState, Hero, Difficulty, Message } from '../../core/types';
import { computeMaxHp, computeMaxMp, recomputeDerivedStats } from './derived-stats';
import { SPELLS } from '../../data/spells';
import { getDifficultyConfig } from '../../data/difficulty';
import { Sound } from '../Sound';
import { trackLevelUp } from '../Achievements';

// ============================================================
// XP Thresholds
// ============================================================

// Each level requires roughly double the previous level's XP.
// Difficulty adds a flat bonus per level to the requirement.
// Max level: 30

const BASE_XP_TABLE: number[] = [
  0,      // Level 1 (starting)
  20,     // Level 2
  50,     // Level 3
  110,    // Level 4
  230,    // Level 5
  470,    // Level 6
  950,    // Level 7
  1900,   // Level 8
  3800,   // Level 9
  7500,   // Level 10
  15000,  // Level 11
  28000,  // Level 12
  50000,  // Level 13
  85000,  // Level 14
  140000, // Level 15
  220000, // Level 16
  340000, // Level 17
  520000, // Level 18
  780000, // Level 19
  1100000,// Level 20
  1500000,// Level 21
  2000000,// Level 22
  2600000,// Level 23
  3400000,// Level 24
  4400000,// Level 25
  5600000,// Level 26
  7200000,// Level 27
  9200000,// Level 28
  12000000,// Level 29
  15000000,// Level 30
];

const MAX_LEVEL = 30;

/**
 * Returns the total XP required to reach a given level.
 */
export function xpRequiredForLevel(level: number, difficulty: Difficulty): number {
  if (level <= 1) return 0;
  if (level > MAX_LEVEL) return Infinity;

  const base = BASE_XP_TABLE[level - 1] ?? Infinity;
  const config = getDifficultyConfig(difficulty);
  const diffBonus = config.xpPerLevelBonus * (level - 1);
  return base + diffBonus;
}

/**
 * Returns the XP needed to reach the NEXT level from the current one.
 */
export function xpToNextLevel(hero: Hero, difficulty: Difficulty): number {
  if (hero.level >= MAX_LEVEL) return Infinity;
  const required = xpRequiredForLevel(hero.level + 1, difficulty);
  return Math.max(0, required - hero.xp);
}

// ============================================================
// Spell Learning Order
// ============================================================

// Spells are learned in a fixed order, one per level-up.
// The order progresses through spell levels, mixing categories
// so the player gets a balanced set of abilities.

// ~15 essential spells auto-learned on level-up.
// The other ~15 spells are spellbook-only (found as dungeon loot).
const SPELL_LEARN_ORDER: string[] = [
  // Level 2:
  'heal-minor-wounds',
  // Level 3:
  'light',
  // Level 4:
  'detect-objects',
  // Level 5:
  'shield',
  // Level 6:
  'phase-door',
  // Level 7:
  'magic-arrow',
  // Level 8:
  'cold-bolt',
  // Level 9:
  'detect-monsters',
  // Level 10:
  'detect-traps',
  // Level 11:
  'neutralize-poison',
  // Level 12:
  'heal-medium-wounds',
  // Level 13:
  'detect-traps',
  // Level 14:
  'rune-of-return',
  // Level 15:
  'heal-major-wounds',
  // Level 16:
  'healing',
  // Spellbook-only (NOT auto-learned):
  // levitation, clairvoyance, lightning-bolt, resist-fire, resist-cold,
  // resist-lightning, fire-bolt, sleep-monster, cold-ball, slow-monster,
  // teleport, remove-curse, ball-lightning, fire-ball, transmogrify-monster
];

/**
 * Returns the spell ID the player learns at a given level, or null if none.
 * The index is (level - 2) because level 1 is starting, first learn is at level 2.
 */
function getSpellForLevel(level: number): string | null {
  const index = level - 2;
  if (index < 0 || index >= SPELL_LEARN_ORDER.length) return null;
  return SPELL_LEARN_ORDER[index];
}

// ============================================================
// Level-Up Processing
// ============================================================

/**
 * Checks if the hero should level up and applies all level-ups.
 * Can handle multiple level-ups at once (e.g., from a large XP gain).
 * Returns the updated game state with messages for each level-up.
 */
export function checkAndApplyLevelUps(state: GameState): GameState {
  let hero = { ...state.hero };
  const messages: Message[] = [];
  const difficulty = state.difficulty;

  while (hero.level < MAX_LEVEL) {
    const required = xpRequiredForLevel(hero.level + 1, difficulty);
    if (hero.xp < required) break;

    // Level up!
    hero.level++;

    // HP gain: CON/10, minimum 1. Also heal 20% of max HP.
    const hpGain = Math.max(1, Math.floor(hero.attributes.constitution / 10));
    const newMaxHp = computeMaxHp(hero.attributes.constitution, hero.level);
    hero.maxHp = newMaxHp;
    const healAmount = hpGain + Math.floor(newMaxHp * 0.2);
    hero.hp = Math.min(hero.hp + healAmount, newMaxHp);

    // MP gain: INT/10, minimum 1
    const mpGain = Math.max(1, Math.floor(hero.attributes.intelligence / 10));
    const newMaxMp = computeMaxMp(hero.attributes.intelligence, hero.level);
    hero.maxMp = newMaxMp;
    hero.mp = Math.min(hero.mp + mpGain, newMaxMp);

    // Recompute all derived stats (AC, resistances, etc.) using full stat system
    hero = { ...recomputeDerivedStats(hero), maxHp: hero.maxHp, maxMp: hero.maxMp, hp: hero.hp, mp: hero.mp };

    Sound.levelUp();
    trackLevelUp(hero.level);
    messages.push({
      text: `*** ${hero.name} has reached level ${hero.level}! ***`,
      severity: 'important',
      turn: state.turn,
    });

    messages.push({
      text: `HP +${hpGain} (${hero.hp}/${hero.maxHp}) | MP +${mpGain} (${hero.mp}/${hero.maxMp})`,
      severity: 'important',
      turn: state.turn,
    });

    // Learn a spell
    const spellId = getSpellForLevel(hero.level);
    if (spellId && !hero.knownSpells.includes(spellId)) {
      hero.knownSpells = [...hero.knownSpells, spellId];
      if (hero.spellHotkeys.length < 5) {
        hero.spellHotkeys = [...hero.spellHotkeys, spellId];
      }
      const spell = SPELLS.find(s => s.id === spellId);
      const spellName = spell?.name ?? spellId;
      messages.push({
        text: `${hero.name} has learned the spell: ${spellName}!`,
        severity: 'important',
        turn: state.turn,
      });
    }
  }

  if (messages.length === 0) return state;

  return {
    ...state,
    hero,
    messages: [...state.messages, ...messages],
  };
}
