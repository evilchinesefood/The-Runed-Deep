import type {
  Monster,
  Vector2,
  ElementalResistances,
  Floor,
  Difficulty,
} from "../../core/types";
import {
  getMonstersForDepth,
  getNewestUnlockFloor,
  getBossForFloor,
  type MonsterTemplate,
} from "../../data/monsters";
import { getDifficultyConfig } from "../../data/difficulty";

let nextMonsterId = Date.now();

function rollRange(min: number, max: number, rand: () => number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function fullResistances(
  partial: Partial<ElementalResistances>,
): ElementalResistances {
  return {
    cold: partial.cold ?? 0,
    fire: partial.fire ?? 0,
    lightning: partial.lightning ?? 0,
    acid: partial.acid ?? 0,
    drain: partial.drain ?? 0,
  };
}

/**
 * Per-floor scaling multiplier for HP and damage.
 * Floor 1 = 1.0x, each floor adds 8% to HP and 5% to damage.
 * This ensures even the same monster type is noticeably tougher on deeper floors.
 */
function getFloorScaling(depth: number): { hpMult: number; dmgMult: number } {
  return {
    hpMult: 1 + (depth - 1) * 0.08,
    dmgMult: 1 + (depth - 1) * 0.05,
  };
}

/**
 * Creates a Monster instance from a template at a given position.
 * Applies floor-based scaling AND difficulty scaling to HP, damage, speed.
 */
export function createMonster(
  template: MonsterTemplate,
  position: Vector2,
  depth: number,
  rand: () => number,
  difficulty: Difficulty = "intermediate",
): Monster {
  const { hpMult, dmgMult } = getFloorScaling(depth);
  const config = getDifficultyConfig(difficulty);

  const baseHp = rollRange(template.hp[0], template.hp[1], rand);
  const hp = Math.round(baseHp * hpMult * config.monsterHpMult);

  const scaledDmgMin = Math.round(
    template.damage[0] * dmgMult * config.monsterDamageMult,
  );
  const scaledDmgMax = Math.round(
    template.damage[1] * dmgMult * config.monsterDamageMult,
  );

  const speed =
    Math.round(template.speed * config.monsterSpeedMult * 100) / 100;

  return {
    id: `monster-${nextMonsterId++}`,
    templateId: template.id,
    name: template.name,
    sprite: template.sprite,
    position: { ...position },
    hp,
    maxHp: hp,
    damage: [Math.max(1, scaledDmgMin), Math.max(2, scaledDmgMax)],
    speed,
    xpValue: template.xpValue,
    resistances: fullResistances(template.resistances),
    ai: template.ai,
    armor: template.armor,
    abilities: [...template.abilities],
    sleeping: false,
    slowed: false,
    fleeing: 0,
    bled: false,
  };
}

/**
 * Picks a random monster template for the given depth.
 * Each monster is weighted by how recently it was unlocked:
 * - Monsters from the current or most recent unlock floor get weight 10
 * - Each floor of age reduces weight (older monsters fade out)
 * - Minimum weight of 1 so old monsters can still rarely appear
 */
function pickTemplate(
  depth: number,
  rand: () => number,
): MonsterTemplate | null {
  const candidates = getMonstersForDepth(depth);
  if (candidates.length === 0) return null;

  const newestFloor = getNewestUnlockFloor(depth);

  // Weight each candidate: newer = higher weight
  const weights = candidates.map((m) => {
    const age = newestFloor - m.unlockFloor; // 0 = brand new, higher = older
    // New monsters (age 0-2): weight 10
    // Recent (age 3-5): weight 5
    // Old (age 6-10): weight 2
    // Ancient (age 11+): weight 1
    if (age <= 2) return 10;
    if (age <= 5) return 5;
    if (age <= 10) return 2;
    return 1;
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let roll = rand() * totalWeight;

  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return candidates[i];
  }

  return candidates[candidates.length - 1];
}

/**
 * Collects all walkable floor tiles that are valid spawn positions.
 */
function getSpawnablePositions(floor: Floor, playerStart: Vector2): Vector2[] {
  const positions: Vector2[] = [];
  for (let y = 0; y < floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      const tile = floor.tiles[y][x];
      if (!tile.walkable) continue;
      if (tile.type === "stairs-up" || tile.type === "stairs-down") continue;
      if (x === playerStart.x && y === playerStart.y) continue;

      const dist = Math.abs(x - playerStart.x) + Math.abs(y - playerStart.y);
      if (dist < 5) continue;

      positions.push({ x, y });
    }
  }
  return positions;
}

/**
 * Spawns monsters on a dungeon floor.
 * Monster count increases slightly with depth.
 * Boss monsters spawn on their designated floors.
 */
export function spawnMonsters(
  floor: Floor,
  depth: number,
  playerStart: Vector2,
  rand: () => number,
  difficulty: Difficulty = "intermediate",
): Monster[] {
  const config = getDifficultyConfig(difficulty);
  const positions = getSpawnablePositions(floor, playerStart);
  if (positions.length === 0) return [];

  // Monster count scales with depth and difficulty
  const baseDensity = 3 + depth * 0.3;
  const density = baseDensity * config.spawnDensityMult;
  const count = Math.max(2, Math.round((positions.length * density) / 100));

  // Shuffle positions
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  const monsters: Monster[] = [];
  const usedPositions = new Set<string>();

  // Check for boss on this floor
  const boss = getBossForFloor(depth);
  if (boss && positions.length > 0) {
    const pos = positions.shift()!;
    usedPositions.add(`${pos.x},${pos.y}`);
    monsters.push(createMonster(boss, pos, depth, rand, difficulty));
  }

  // Spawn regular monsters
  for (let i = 0; i < count && i < positions.length; i++) {
    const template = pickTemplate(depth, rand);
    if (!template) continue;

    const pos = positions[i];
    const key = `${pos.x},${pos.y}`;
    if (usedPositions.has(key)) continue;
    usedPositions.add(key);

    monsters.push(createMonster(template, pos, depth, rand, difficulty));
  }

  return monsters;
}
