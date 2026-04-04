// ============================================================
// Rune definitions — 16 runes across 3 tiers
// ============================================================

export interface RuneDef {
  id: string;
  name: string;
  description: string;
  tier: "common" | "uncommon" | "rare";
  cost: number;
  base: number;
  effect: string;
}

const RUNE_LIST: RuneDef[] = [
  // Common (5 shards)
  {
    id: "flame",
    name: "Flame",
    description: "+{v} fire damage on hit",
    tier: "common",
    cost: 5,
    base: 1,
    effect: "fire-damage",
  },
  {
    id: "frost",
    name: "Frost",
    description: "+{v} cold damage, chance to slow",
    tier: "common",
    cost: 5,
    base: 1,
    effect: "cold-damage-slow",
  },
  {
    id: "iron",
    name: "Iron",
    description: "+{v} AC",
    tier: "common",
    cost: 5,
    base: 1,
    effect: "flat-ac",
  },
  {
    id: "vigor",
    name: "Vigor",
    description: "+{v} max HP",
    tier: "common",
    cost: 5,
    base: 1,
    effect: "max-hp",
  },
  {
    id: "focus",
    name: "Focus",
    description: "+{v} max MP",
    tier: "common",
    cost: 5,
    base: 1,
    effect: "max-mp",
  },
  {
    id: "fortune",
    name: "Fortune",
    description: "+{v}% gold find",
    tier: "common",
    cost: 5,
    base: 2,
    effect: "gold-find",
  },
  {
    id: "precision",
    name: "Precision",
    description: "+{v}% crit chance",
    tier: "common",
    cost: 5,
    base: 0.5,
    effect: "crit-chance",
  },
  // Uncommon (15 shards)
  {
    id: "renewal",
    name: "Renewal",
    description: "+{v} HP regen/turn",
    tier: "uncommon",
    cost: 15,
    base: 0.25,
    effect: "hp-regen",
  },
  {
    id: "siphon",
    name: "Siphon",
    description: "+{v} MP per kill",
    tier: "uncommon",
    cost: 15,
    base: 1,
    effect: "mp-per-kill",
  },
  {
    id: "warding",
    name: "Warding",
    description: "+{v} all resist",
    tier: "uncommon",
    cost: 15,
    base: 0.5,
    effect: "all-resist",
  },
  {
    id: "thorns",
    name: "Thorns",
    description: "Reflect {v}% melee damage",
    tier: "uncommon",
    cost: 15,
    base: 0.5,
    effect: "reflect-damage",
  },
  {
    id: "anchor",
    name: "Anchor",
    description: "Prevent death once per floor",
    tier: "uncommon",
    cost: 15,
    base: 0,
    effect: "prevent-death",
  },
  // Rare (40 shards)
  {
    id: "splitting",
    name: "Splitting",
    description: "+{v} splash damage to adjacent",
    tier: "rare",
    cost: 40,
    base: 1,
    effect: "splash-damage",
  },
  {
    id: "echo",
    name: "Echo",
    description: "{v}% chance to double-cast",
    tier: "rare",
    cost: 40,
    base: 1,
    effect: "double-cast",
  },
  {
    id: "phantom",
    name: "Phantom",
    description: "+{v}% dodge chance",
    tier: "rare",
    cost: 40,
    base: 0.25,
    effect: "dodge",
  },
  {
    id: "conversion",
    name: "Conversion",
    description: "Heal {v}% of overkill damage",
    tier: "rare",
    cost: 40,
    base: 0.5,
    effect: "overkill-heal",
  },
];

export const RUNES: RuneDef[] = RUNE_LIST;
export const RUNE_BY_ID: Record<string, RuneDef> = {};
for (const r of RUNE_LIST) RUNE_BY_ID[r.id] = r;

export function getRuneValue(runeId: string, enchantment: number): number {
  const r = RUNE_BY_ID[runeId];
  if (!r) return 0;
  return r.base * Math.max(1, enchantment);
}

export function formatRuneDesc(runeId: string, enchantment: number): string {
  const r = RUNE_BY_ID[runeId];
  if (!r) return "";
  const v = getRuneValue(runeId, enchantment);
  const vStr = v % 1 === 0 ? String(v) : v.toFixed(1);
  return r.description.replace("{v}", vStr);
}

export const RUNE_TIER_COLOR: Record<string, string> = {
  common: "#aaa",
  uncommon: "#4af",
  rare: "#f90",
};
