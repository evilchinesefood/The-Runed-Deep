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

export function rollSpecialEnchantments(depth: number, isTierItem: boolean): string[] {
  const chance = isTierItem ? 0.15 : (depth >= 20 ? 0.05 : 0);
  if (Math.random() > chance) return [];

  const count = 2 + Math.floor(Math.random() * 4); // 2-5
  const pool = [...ENCHANTMENTS];
  const result: string[] = [];

  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool[idx].id);
    pool.splice(idx, 1);
  }

  return result;
}
