import type { Hero, Attributes, Equipment, EquipSlot } from '../../core/types';

/**
 * Computes max HP from Constitution.
 * Base 10 + CON/5 at level 1. Each level-up adds CON/10 (minimum 1).
 */
export function computeMaxHp(constitution: number, level: number): number {
  const base = 10 + Math.floor(constitution / 5);
  const perLevel = Math.max(1, Math.floor(constitution / 10));
  return base + perLevel * (level - 1);
}

/**
 * Computes max MP from Intelligence.
 * Base 5 + INT/5 at level 1. Each level-up adds INT/10 (minimum 1).
 */
export function computeMaxMp(intelligence: number, level: number): number {
  const base = 5 + Math.floor(intelligence / 5);
  const perLevel = Math.max(1, Math.floor(intelligence / 10));
  return base + perLevel * (level - 1);
}

/**
 * Computes base armor value from Dexterity.
 * DEX/10 as baseline AC before equipment.
 */
export function computeBaseArmorValue(dexterity: number): number {
  return Math.floor(dexterity / 10);
}

/**
 * Computes total armor value from base DEX + all equipped armor pieces.
 */
export function computeTotalArmorValue(dexterity: number, equipment: Equipment): number {
  let ac = computeBaseArmorValue(dexterity);

  const armorSlots: EquipSlot[] = ['helmet', 'body', 'shield', 'cloak', 'bracers', 'gauntlets', 'boots', 'belt'];
  for (const slot of armorSlots) {
    const item = equipment[slot];
    if (item && item.properties['ac']) {
      ac += item.properties['ac'] + item.enchantment;
    }
  }

  return ac;
}

/**
 * Recomputes all derived stats on a hero and returns an updated copy.
 * Call this after any attribute change, level-up, or equipment change.
 */
export function recomputeDerivedStats(hero: Hero): Hero {
  // Special enchantment attribute bonuses from equipment (handles critical variants)
  let bonusStr = 0, bonusInt = 0, bonusCon = 0, bonusDex = 0;
  for (const slot of Object.values(hero.equipment)) {
    if (!slot?.specialEnchantments) continue;
    for (const e of slot.specialEnchantments) {
      const isCrit = (e as string).endsWith(':critical');
      const mult = isCrit ? 2 : 1;
      const base = isCrit ? (e as string).replace(':critical', '') : e;
      if (base === 'str-bonus') bonusStr += 10 * mult;
      if (base === 'int-bonus') bonusInt += 10 * mult;
      if (base === 'con-bonus') bonusCon += 10 * mult;
      if (base === 'dex-bonus') bonusDex += 10 * mult;
    }
  }
  const effCon = hero.attributes.constitution + bonusCon;
  const effInt = hero.attributes.intelligence + bonusInt;
  const effDex = hero.attributes.dexterity + bonusDex;

  const maxHp = computeMaxHp(effCon, hero.level);
  const maxMp = computeMaxMp(effInt, hero.level);
  let armorValue = computeTotalArmorValue(effDex, hero.equipment);

  // Preserve Shield spell bonus
  const hasShield = hero.activeEffects?.some(e => e.id === 'shield');
  if (hasShield) armorValue += 4;

  // Weapon bonuses
  let equipDamageBonus = 0;
  let equipAccuracyBonus = 0;
  const weapon = hero.equipment.weapon;
  if (weapon) {
    equipDamageBonus = weapon.enchantment;
    equipAccuracyBonus = (weapon.properties['accuracy'] ?? 0) + weapon.enchantment;
  }

  // Clamp current HP/MP to new max (don't exceed, but don't reduce if already below)
  const hp = Math.min(hero.hp, maxHp);
  const mp = Math.min(hero.mp, maxMp);

  return {
    ...hero,
    maxHp,
    maxMp,
    hp,
    mp,
    armorValue,
    equipDamageBonus,
    equipAccuracyBonus,
  };
}

/**
 * Returns the effective attribute value including equipment bonuses.
 */
export function getEffectiveAttribute(
  base: number,
  attr: keyof Attributes,
  equipment: Equipment
): number {
  let total = base;

  const slots = Object.values(equipment);
  for (const item of slots) {
    if (item && item.properties[attr]) {
      total += item.properties[attr];
    }
  }

  return total;
}
