// ============================================================
// Affix system — scaled enchantments for tiered items
// effective = base + (itemEnchantment * perLevel), capped
// ============================================================

export interface Affix {
  id: string;
  name: string;
  description: string;
  color: string;
  base: number;        // base value at +0
  perLevel: number;    // bonus per +1 enchantment
  cap: number;         // maximum effective value
  base2?: number;      // second stat base (for dual-stat affixes)
  perLevel2?: number;
  cap2?: number;
  weaponOnly?: boolean;
  armorOnly?: boolean;
  cursedOnly?: boolean; // only appears on cursed items
  weight: number;      // drop weight (higher = more common)
}

// Keep old interface name for compatibility with tooltip rendering
export type SpecialEnchantment = Affix;

export const AFFIXES: Affix[] = [
  // ── Offensive ─────────────────────────────────────────────
  { id: 'sharpness', name: 'Sharpness', description: '+{v} damage', color: '#e44',
    base: 2, perLevel: 2, cap: 20, weaponOnly: true, weight: 3 },
  { id: 'might', name: 'Might', description: '+{v} Strength', color: '#e44',
    base: 5, perLevel: 3, cap: 35, weight: 1 },
  { id: 'vampiric', name: 'Vampiric', description: '{v}% damage healed', color: '#f44',
    base: 10, perLevel: 3, cap: 40, weight: 1 },
  { id: 'spell-power', name: 'Spell Power', description: '+{v}% spell damage', color: '#48f',
    base: 15, perLevel: 5, cap: 65, weight: 1 },
  { id: 'thorns', name: 'Thorns', description: '{v}% damage reflected', color: '#f84',
    base: 10, perLevel: 4, cap: 50, weight: 1 },
  { id: 'fire-touched', name: 'Fire Touched', description: '+{v}% fire damage, +{v2} fire resist', color: '#f64',
    base: 10, perLevel: 3, cap: 40, base2: 15, perLevel2: 5, cap2: 65, weight: 1 },
  { id: 'frost-touched', name: 'Frost Touched', description: '+{v}% cold damage, +{v2} cold resist', color: '#6cf',
    base: 10, perLevel: 3, cap: 40, base2: 15, perLevel2: 5, cap2: 65, weight: 1 },
  { id: 'storm-touched', name: 'Storm Touched', description: '+{v}% lightning damage, +{v2} lightning resist', color: '#ff8',
    base: 10, perLevel: 3, cap: 40, base2: 15, perLevel2: 5, cap2: 65, weight: 1 },

  // ── Defensive ─────────────────────────────────────────────
  { id: 'hardened', name: 'Hardened', description: '+{v} AC', color: '#8af',
    base: 2, perLevel: 1, cap: 12, armorOnly: true, weight: 3 },
  { id: 'fortitude', name: 'Fortitude', description: '+{v} Constitution', color: '#4c4',
    base: 5, perLevel: 3, cap: 35, weight: 1 },
  { id: 'magic-resist', name: 'Magic Resistance', description: '+{v}% all elemental resist', color: '#a8f',
    base: 10, perLevel: 3, cap: 40, weight: 1 },
  { id: 'evasion', name: 'Evasion', description: '{v}% chance to dodge', color: '#adf',
    base: 5, perLevel: 2, cap: 25, weight: 1 },
  { id: 'vitality', name: 'Vitality', description: '+{v} max HP', color: '#f44',
    base: 25, perLevel: 10, cap: 125, weight: 1 },
  { id: 'regeneration', name: 'Regeneration', description: '+{v} HP every 2 turns', color: '#4f4',
    base: 1, perLevel: 0.5, cap: 6, weight: 1 },

  // ── Utility ───────────────────────────────────────────────
  { id: 'grace', name: 'Grace', description: '+{v} Dexterity', color: '#fc4',
    base: 5, perLevel: 3, cap: 35, weight: 1 },
  { id: 'brilliance', name: 'Brilliance', description: '+{v} Intelligence', color: '#48f',
    base: 5, perLevel: 3, cap: 35, weight: 1 },
  { id: 'swiftness', name: 'Swiftness', description: '{v}% chance for extra action', color: '#fc4',
    base: 5, perLevel: 3, cap: 35, weight: 1 },
  { id: 'arcane-well', name: 'Arcane Well', description: '+{v} max MP', color: '#88f',
    base: 25, perLevel: 10, cap: 125, weight: 1 },
  { id: 'arcane-mastery', name: 'Arcane Mastery', description: '-{v}% MP cost, +{v2} MP/3 turns', color: '#a6f',
    base: 10, perLevel: 3, cap: 40, base2: 1, perLevel2: 0.5, cap2: 6, weight: 1 },
  { id: 'fortune', name: 'Fortune', description: '+{v}% gold, +{v2}% XP', color: '#fd4',
    base: 10, perLevel: 3, cap: 40, base2: 8, perLevel2: 2, cap2: 28, weight: 1 },

  // ── Cursed-only affixes (appear only on cursed items, powerful when blessed) ──
  { id: 'blood-price', name: 'Blood Price', description: '+{v}% damage, lose {v2} HP per hit', color: '#d44',
    base: 20, perLevel: 5, cap: 70, base2: 3, perLevel2: 1, cap2: 13, cursedOnly: true, weight: 2 },
  { id: 'soul-drain', name: 'Soul Drain', description: '+{v} to all stats, -{v2} max HP', color: '#a4d',
    base: 8, perLevel: 3, cap: 38, base2: 15, perLevel2: 5, cap2: 65, cursedOnly: true, weight: 1 },
  { id: 'dark-pact', name: 'Dark Pact', description: '+{v}% spell damage, +{v2}% MP cost', color: '#84f',
    base: 25, perLevel: 5, cap: 75, base2: 10, perLevel2: 3, cap2: 40, cursedOnly: true, weight: 1 },
  { id: 'berserk-fury', name: 'Berserk Fury', description: '+{v}% melee damage, +{v2}% damage taken', color: '#f66',
    base: 30, perLevel: 5, cap: 80, base2: 10, perLevel2: 3, cap2: 40, cursedOnly: true, weight: 2 },
  { id: 'leech', name: 'Leech', description: 'Heal {v}% of damage, -{v2}% XP gained', color: '#6a4',
    base: 15, perLevel: 4, cap: 55, base2: 10, perLevel2: 3, cap2: 40, cursedOnly: true, weight: 1 },
];

// Keep ENCHANTMENTS alias for backward compat with tooltip code
export const ENCHANTMENTS = AFFIXES;

export const AFFIX_BY_ID: Record<string, Affix> = Object.fromEntries(
  AFFIXES.map(a => [a.id, a])
);

// Backward compat alias
export const ENCHANTMENT_BY_ID = AFFIX_BY_ID;

/** Compute the effective value of an affix given the item's enchantment level */
export function getAffixValue(affixId: string, enchantLevel: number, critical: boolean): number {
  const affix = AFFIX_BY_ID[affixId];
  if (!affix) return 0;
  const mult = critical ? 2 : 1;
  return Math.min(affix.cap, (affix.base + enchantLevel * affix.perLevel) * mult);
}

/** Compute the secondary value (for dual-stat affixes like Touched) */
export function getAffixValue2(affixId: string, enchantLevel: number, critical: boolean): number {
  const affix = AFFIX_BY_ID[affixId];
  if (!affix || affix.base2 === undefined) return 0;
  const mult = critical ? 2 : 1;
  return Math.min(affix.cap2!, (affix.base2 + enchantLevel * (affix.perLevel2 ?? 0)) * mult);
}

/** Format affix description with computed values */
export function formatAffixDesc(affixId: string, enchantLevel: number, critical: boolean): string {
  const affix = AFFIX_BY_ID[affixId];
  if (!affix) return affixId;
  const v = Math.round(getAffixValue(affixId, enchantLevel, critical));
  const v2 = Math.round(getAffixValue2(affixId, enchantLevel, critical));
  return affix.description.replace('{v}', `${v}`).replace('{v2}', `${v2}`);
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

/**
 * Get total scaled affix value across all equipped items.
 * Each item contributes: getAffixValue(id, item.enchantment, isCritical)
 */
export function getEquipAffixTotal(equipment: Record<string, any>, affixId: string): number {
  let total = 0;
  for (const item of Object.values(equipment)) {
    if (!item?.specialEnchantments) continue;
    const enchants = item.specialEnchantments as string[];
    const isCrit = enchants.includes(`${affixId}:critical`);
    const has = isCrit || enchants.includes(affixId);
    if (has) {
      // Blessed items treat enchantment as +1 higher for affix scaling
      const ench = (item.enchantment ?? 0) + (item.blessed ? 1 : 0);
      total += getAffixValue(affixId, ench, isCrit);
    }
  }
  return total;
}

/** Same as getEquipAffixTotal but for the secondary value */
export function getEquipAffixTotal2(equipment: Record<string, any>, affixId: string): number {
  let total = 0;
  for (const item of Object.values(equipment)) {
    if (!item?.specialEnchantments) continue;
    const enchants = item.specialEnchantments as string[];
    const isCrit = enchants.includes(`${affixId}:critical`);
    const has = isCrit || enchants.includes(affixId);
    if (has) {
      const ench = (item.enchantment ?? 0) + (item.blessed ? 1 : 0);
      total += getAffixValue2(affixId, ench, isCrit);
    }
  }
  return total;
}

/**
 * Roll special affixes for an item.
 * isWeapon/isArmor filters weapon-only and armor-only affixes.
 */
export function rollSpecialEnchantments(
  depth: number, isTierItem: boolean, ngPlus: number = 0,
  isWeapon: boolean = false, isArmor: boolean = false,
  isCursed: boolean = false, enchantment: number = 0,
): string[] {
  const ngBonus = ngPlus * 0.15;
  let chance: number;
  let baseCount: number;
  if (isTierItem) {
    // Tier items (elven/meteoric): high affix chance, multiple affixes
    chance = Math.min(0.70, 0.25 + Math.max(0, depth - 10) * 0.01 + ngBonus);
    baseCount = 2;
  } else if (enchantment > 0 || isCursed) {
    // Enchanted or cursed items: almost always get an affix; NG+ guarantees 3+
    chance = Math.min(0.85, 0.65 + depth * 0.005 + ngBonus);
    baseCount = ngPlus > 0 ? 3 : 1;
  } else {
    // Unenchanted regular items: rare affix at deep floors only
    chance = depth >= 25 ? Math.min(0.20, 0.02 + (depth - 25) * 0.01 + ngBonus) : ngBonus > 0 ? Math.min(0.10, ngBonus) : 0;
    baseCount = 1;
  }
  if (Math.random() > chance) return [];

  // Count: scales with depth and NG+
  // Non-tier blues: cap at 3 in NG0, uncapped by depth in NG+
  const bonusCount = Math.floor(depth / 10);
  const maxCount = (!isTierItem && (enchantment > 0 || isCursed) && ngPlus === 0) ? 3 : 5 + ngPlus * 2;
  const count = Math.min(maxCount, baseCount + bonusCount + ngPlus);

  // Build weighted pool filtered by weapon/armor
  const pool = AFFIXES.filter(a => {
    if (a.weaponOnly && !isWeapon) return false;
    if (a.armorOnly && !isArmor) return false;
    if (a.cursedOnly && !isCursed) return false; // cursed-only affixes need a cursed item
    return true;
  });

  const result: string[] = [];
  const used = new Set<string>();

  for (let i = 0; i < count && pool.length > used.size; i++) {
    // Weighted random selection
    const available = pool.filter(a => !used.has(a.id));
    const totalWeight = available.reduce((s, a) => s + a.weight, 0);
    let roll = Math.random() * totalWeight;
    let picked = available[0];
    for (const a of available) {
      roll -= a.weight;
      if (roll <= 0) { picked = a; break; }
    }
    used.add(picked.id);
    result.push(picked.id);
  }

  // Critical chance by NG level: 0% / 20% / 30% / 40%
  const critChance = ngPlus <= 0 ? 0 : ngPlus === 1 ? 0.20 : ngPlus === 2 ? 0.30 : 0.40;
  if (critChance > 0) {
    return result.map(id => Math.random() < critChance ? `${id}:critical` : id);
  }

  return result;
}
