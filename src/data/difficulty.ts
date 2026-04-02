// ============================================================
// Difficulty Configuration
//
// All difficulty-related multipliers in one place.
// Adjust these values to tune game balance per difficulty.
// ============================================================

import type { Difficulty } from '../core/types';

export interface DifficultyConfig {
  /** Display name */
  label: string;
  /** Monster HP multiplier (1.0 = normal) */
  monsterHpMult: number;
  /** Monster damage multiplier (1.0 = normal) */
  monsterDamageMult: number;
  /** Monster speed multiplier (1.0 = normal) */
  monsterSpeedMult: number;
  /** Extra XP required per level (flat bonus added per level) */
  xpPerLevelBonus: number;
  /** Monster spawn density multiplier (1.0 = normal) */
  spawnDensityMult: number;
  /** Player starting gold */
  startingGold: number;
  /** Healing effectiveness multiplier (1.0 = normal) */
  healingMult: number;
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  normal: {
    label: 'Normal',
    monsterHpMult: 1.0,
    monsterDamageMult: 1.0,
    monsterSpeedMult: 1.0,
    xpPerLevelBonus: 0,
    spawnDensityMult: 1.0,
    startingGold: 100,
    healingMult: 1.0,
  },
  intermediate: {
    label: 'Intermediate',
    monsterHpMult: 1.5,
    monsterDamageMult: 1.5,
    monsterSpeedMult: 1.0,
    xpPerLevelBonus: 20,
    spawnDensityMult: 1.2,
    startingGold: 75,
    healingMult: 0.9,
  },
  hard: {
    label: 'Hard',
    monsterHpMult: 2.0,
    monsterDamageMult: 2.0,
    monsterSpeedMult: 1.1,
    xpPerLevelBonus: 100,
    spawnDensityMult: 1.5,
    startingGold: 50,
    healingMult: 0.75,
  },
  nightmare: {
    label: 'Nightmare',
    monsterHpMult: 3.0,
    monsterDamageMult: 3.0,
    monsterSpeedMult: 1.2,
    xpPerLevelBonus: 200,
    spawnDensityMult: 2.0,
    startingGold: 0,
    healingMult: 0.6,
  },
  impossible: {
    label: 'Impossible',
    monsterHpMult: 4.0,
    monsterDamageMult: 4.0,
    monsterSpeedMult: 1.3,
    xpPerLevelBonus: 300,
    spawnDensityMult: 2.5,
    startingGold: 0,
    healingMult: 0.3,
  },
};

export function getDifficultyConfig(difficulty: Difficulty): DifficultyConfig {
  return DIFFICULTY_CONFIGS[difficulty];
}
