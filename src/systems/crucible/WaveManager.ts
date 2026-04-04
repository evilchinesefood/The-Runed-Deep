// ============================================================
// Crucible wave spawning and scaling
// ============================================================

import type { Floor, Vector2, Monster, Difficulty } from "../../core/types";
import { MONSTER_TEMPLATES, type MonsterTemplate } from "../../data/monsters";
import { createMonster } from "../monsters/spawning";

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Map wave number to which monster groups (minFloor ranges) are available */
function getWaveFloorRange(wave: number): [number, number] {
  if (wave <= 5) return [1, 5];
  if (wave <= 10) return [1, 10];
  if (wave <= 15) return [1, 15];
  if (wave <= 20) return [6, 20];
  if (wave <= 25) return [11, 25];
  return [16, 30];
}

function getCandidates(wave: number): MonsterTemplate[] {
  const [minF, maxF] = getWaveFloorRange(wave);
  return MONSTER_TEMPLATES.filter(
    (m) => !m.boss && m.minFloor >= minF && m.minFloor <= maxF,
  );
}

function getBossCandidates(): MonsterTemplate[] {
  return MONSTER_TEMPLATES.filter((m) => m.boss);
}

function getSpawnablePositions(floor: Floor, playerPos: Vector2): Vector2[] {
  const pos: Vector2[] = [];
  for (let y = 0; y < floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      if (!floor.tiles[y][x].walkable) continue;
      const dist = Math.abs(x - playerPos.x) + Math.abs(y - playerPos.y);
      if (dist < 4) continue;
      pos.push({ x, y });
    }
  }
  return pos;
}

function scaleMonster(m: Monster, wave: number): Monster {
  const mult = 1 + wave * 0.15;
  const hp = Math.max(1, Math.round(m.maxHp * mult));
  const dmin = Math.max(1, Math.round(m.damage[0] * mult));
  const dmax = Math.max(2, Math.round(m.damage[1] * mult));

  let xp = Math.round(m.xpValue * (1 + wave * 0.05));

  // Wave 20+: elite modifiers
  if (wave >= 20) {
    return {
      ...m,
      hp: Math.round(hp * 1.3),
      maxHp: Math.round(hp * 1.3),
      damage: [Math.round(dmin * 1.2), Math.round(dmax * 1.2)],
      xpValue: Math.round(xp * 1.3),
    };
  }

  return { ...m, hp, maxHp: hp, damage: [dmin, dmax], xpValue: xp };
}

export function spawnWave(
  floor: Floor,
  wave: number,
  playerPos: Vector2,
  difficulty: Difficulty = "intermediate",
): Floor {
  const rand = seededRandom(Date.now() + wave * 9973);
  const positions = getSpawnablePositions(floor, playerPos);

  // Shuffle
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  const monsters: Monster[] = [];
  const isBossWave = wave > 0 && wave % 5 === 0;

  if (isBossWave) {
    const bosses = getBossCandidates();
    if (bosses.length > 0 && positions.length > 0) {
      const t = bosses[Math.floor(rand() * bosses.length)];
      const m = createMonster(t, positions[0], 1, rand, difficulty);
      monsters.push(scaleMonster(m, wave));
    }
    // Also add some regular monsters on boss waves
    const extraCount = Math.min(
      2 + Math.floor(wave / 10),
      positions.length - 1,
    );
    const candidates = getCandidates(wave);
    for (let i = 0; i < extraCount && i + 1 < positions.length; i++) {
      if (candidates.length === 0) break;
      const t = candidates[Math.floor(rand() * candidates.length)];
      const m = createMonster(t, positions[i + 1], 1, rand, difficulty);
      monsters.push(scaleMonster(m, wave));
    }
  } else {
    // Regular wave
    const count = Math.min(3 + Math.floor(wave * 0.5), positions.length, 12);
    const candidates = getCandidates(wave);
    if (candidates.length === 0) return floor;

    // Waves 1-9: single type. 10+: mix
    const singleType = wave < 10;
    const chosenTemplate = singleType
      ? candidates[Math.floor(rand() * candidates.length)]
      : null;

    for (let i = 0; i < count; i++) {
      const t = singleType
        ? chosenTemplate!
        : candidates[Math.floor(rand() * candidates.length)];
      const m = createMonster(t, positions[i], 1, rand, difficulty);
      monsters.push(scaleMonster(m, wave));
    }
  }

  // Clear dead monsters from floor, add new ones
  return {
    ...floor,
    monsters: [...floor.monsters.filter((m) => m.hp > 0), ...monsters],
  };
}

export function getWaveReward(wave: number): { shards: number; gold: number } {
  let shards = 0;
  if (wave <= 10) shards = 1;
  else if (wave <= 20) shards = 2;
  else shards = 3;

  // Milestones
  if (wave === 10) shards += 5;
  if (wave === 20) shards += 10;
  if (wave === 30) shards += 20;

  const gold = 5 + wave * 3;

  return { shards, gold };
}
