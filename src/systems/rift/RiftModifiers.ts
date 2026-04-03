import type { RiftModifier } from "../../core/types";

export const RIFT_MODIFIERS: RiftModifier[] = [
  {
    id: "darkness",
    name: "Darkness",
    description: "Vision radius halved",
    weight: 1,
  },
  {
    id: "frenzied",
    name: "Frenzied",
    description: "Monsters get +1 action per turn",
    weight: 2,
  },
  {
    id: "brittle",
    name: "Brittle",
    description: "All enemies have -50% HP",
    weight: -2,
  },
  {
    id: "silence",
    name: "Silence",
    description: "No spellcasting (player, monsters, or wands)",
    weight: 1,
  },
  {
    id: "abundance",
    name: "Abundance",
    description: "Double item drops",
    weight: -1,
  },
  {
    id: "cursed-ground",
    name: "Cursed Ground",
    description: "No regen, poison ticks each turn",
    weight: 2,
  },
  {
    id: "glass-cannon",
    name: "Glass Cannon",
    description: "Deal 2x damage, take 2x damage",
    weight: 1,
  },
  {
    id: "swarm",
    name: "Swarm",
    description: "Double monster spawns, half XP",
    weight: 1,
  },
  {
    id: "elemental-surge",
    name: "Elemental Surge",
    description: "All monsters deal elemental damage",
    weight: 1,
  },
  {
    id: "packhunter",
    name: "Packhunter",
    description: "Monsters alert in groups",
    weight: 1,
  },
  {
    id: "fortunate",
    name: "Fortunate",
    description: "Double Rune Shard reward",
    weight: -1,
  },
  {
    id: "enfeebled",
    name: "Enfeebled",
    description: "Start at half max HP and MP",
    weight: 2,
  },
];

export const RIFT_MODIFIER_BY_ID: Record<string, RiftModifier> =
  Object.fromEntries(RIFT_MODIFIERS.map((m) => [m.id, m]));

/** Roll 2-5 random modifiers for a rift offering */
export function rollRiftModifiers(seed: number): RiftModifier[] {
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };

  const count = 2 + Math.floor(rand() * 4); // 2-5
  const pool = [...RIFT_MODIFIERS];
  const result: RiftModifier[] = [];

  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(rand() * pool.length);
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }

  return result;
}

/** Calculate total difficulty weight */
export function getRiftDifficulty(modifiers: RiftModifier[]): number {
  return modifiers.reduce((sum, m) => sum + m.weight, 0);
}

/** Calculate shard reward: 5 base + difficulty bonus */
export function getRiftShardReward(modifiers: RiftModifier[]): number {
  const diff = getRiftDifficulty(modifiers);
  const fortunate = modifiers.some((m) => m.id === "fortunate");
  const base = Math.max(3, 5 + diff * 2);
  return fortunate ? base * 2 : base;
}
