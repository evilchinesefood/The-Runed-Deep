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
  /** Player starting copper */
  startingCopper: number;
  /** Healing effectiveness multiplier (1.0 = normal) */
  healingMult: number;
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: 'Easy',
    monsterHpMult: 0.8,
    monsterDamageMult: 0.8,
    monsterSpeedMult: 0.9,
    xpPerLevelBonus: 0,
    spawnDensityMult: 0.8,
    startingCopper: 150,
    healingMult: 1.2,
  },
  intermediate: {
    label: 'Intermediate',
    monsterHpMult: 1.0,
    monsterDamageMult: 1.0,
    monsterSpeedMult: 1.0,
    xpPerLevelBonus: 20,
    spawnDensityMult: 1.0,
    startingCopper: 100,
    healingMult: 1.0,
  },
  hard: {
    label: 'Hard',
    monsterHpMult: 1.3,
    monsterDamageMult: 1.2,
    monsterSpeedMult: 1.1,
    xpPerLevelBonus: 40,
    spawnDensityMult: 1.2,
    startingCopper: 75,
    healingMult: 0.9,
  },
  impossible: {
    label: 'Impossible',
    monsterHpMult: 1.7,
    monsterDamageMult: 1.5,
    monsterSpeedMult: 1.2,
    xpPerLevelBonus: 80,
    spawnDensityMult: 1.5,
    startingCopper: 50,
    healingMult: 0.75,
  },
};

export function getDifficultyConfig(difficulty: Difficulty): DifficultyConfig {
  return DIFFICULTY_CONFIGS[difficulty];
}
