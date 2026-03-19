export interface SpecialEnchantment {
  id: string;
  name: string;
  description: string;
  color: string;
}

export const ENCHANTMENTS: SpecialEnchantment[] = [
  { id: 'magic-resist', name: 'Magic Resistance', description: '+25% all elemental resistance', color: '#a8f' },
  { id: 'life-steal', name: 'Life Steal', description: 'Heal 15% of melee damage dealt', color: '#f44' },
  { id: 'spell-damage', name: 'Spell Power', description: '+30% spell damage', color: '#48f' },
  { id: 'speed-boost', name: 'Swiftness', description: 'Extra action every 3 turns', color: '#fc4' },
  { id: 'poison-immune', name: 'Poison Immunity', description: 'Immune to poison', color: '#4f4' },
  { id: 'trap-immune', name: 'Trap Immunity', description: 'Immune to traps', color: '#886' },
  { id: 'str-bonus', name: 'Might', description: '+10 Strength', color: '#e44' },
  { id: 'int-bonus', name: 'Brilliance', description: '+10 Intelligence', color: '#48f' },
  { id: 'con-bonus', name: 'Fortitude', description: '+10 Constitution', color: '#4c4' },
  { id: 'dex-bonus', name: 'Grace', description: '+10 Dexterity', color: '#fc4' },
  { id: 'reflect-damage', name: 'Thorns', description: 'Reflect 20% of melee damage taken', color: '#f84' },
  { id: 'regen-hp', name: 'Regeneration', description: '+1 HP every 2 turns', color: '#4f4' },
  { id: 'regen-mp', name: 'Meditation', description: '+1 MP every 3 turns', color: '#48f' },
];

export const ENCHANTMENT_BY_ID: Record<string, SpecialEnchantment> = Object.fromEntries(
  ENCHANTMENTS.map(e => [e.id, e])
);

/** Roll special enchantments for an item. Chance and count scale with depth. */
export function rollSpecialEnchantments(depth: number, isTierItem: boolean, ngPlus: number = 0): string[] {
  const ngBonus = ngPlus * 0.15;
  let chance: number;
  if (isTierItem) {
    chance = Math.min(0.60, 0.15 + Math.max(0, depth - 15) * 0.01 + ngBonus);
  } else {
    chance = depth >= 15 ? Math.min(0.35, 0.02 + (depth - 15) * 0.005 + ngBonus) : ngBonus > 0 ? Math.min(0.20, ngBonus) : 0;
  }
  if (Math.random() > chance) return [];

  // Count scales with depth: base 2, +1 per 10 floors, max 5
  const baseCount = 2;
  const bonusCount = Math.floor(depth / 10);
  const count = Math.min(5, baseCount + bonusCount);

  const pool = [...ENCHANTMENTS];
  const result: string[] = [];

  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool[idx].id);
    pool.splice(idx, 1);
  }

  // In NG+, enchantments have 20% chance to be critical (doubled effect)
  if (ngPlus > 0) {
    return result.map(id => Math.random() < 0.20 ? `${id}:critical` : id);
  }

  return result;
}

/** Check if an item's enchantment list contains an enchantment. Returns multiplier: 0=none, 1=normal, 2=critical */
export function getEnchantStrength(enchants: string[] | undefined, id: string): number {
  if (!enchants) return 0;
  if (enchants.includes(`${id}:critical`)) return 2;
  if (enchants.includes(id)) return 1;
  return 0;
}

/** Sum enchantment strength across all equipped items. */
export function getEquipEnchantTotal(equipment: Record<string, any>, enchId: string): number {
  let total = 0;
  for (const item of Object.values(equipment)) {
    if (item?.specialEnchantments) {
      total += getEnchantStrength(item.specialEnchantments as string[], enchId);
    }
  }
  return total;
}
