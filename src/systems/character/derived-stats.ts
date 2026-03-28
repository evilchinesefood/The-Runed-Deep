import type { Hero, Attributes, Equipment, EquipSlot } from '../../core/types';
import { ITEM_BY_ID } from '../../data/items';
import { getEquipAffixTotal, getEquipAffixTotal2 } from '../../data/Enchantments';

export function computeMaxHp(constitution: number, level: number): number {
  const base = 10 + Math.floor(constitution / 5);
  const perLevel = Math.max(1, Math.floor(constitution / 10));
  return base + perLevel * (level - 1);
}

export function computeMaxMp(intelligence: number, level: number): number {
  const base = 5 + Math.floor(intelligence / 5);
  const perLevel = Math.max(1, Math.floor(intelligence / 10));
  return base + perLevel * (level - 1);
}

export function computeBaseArmorValue(dexterity: number): number {
  return Math.floor(dexterity / 10);
}

export function computeTotalArmorValue(dexterity: number, equipment: Equipment): number {
  let ac = computeBaseArmorValue(dexterity);
  const armorSlots: EquipSlot[] = ['helmet', 'body', 'shield', 'cloak', 'gauntlets', 'boots', 'belt', 'ringLeft', 'ringRight', 'amulet'];
  for (const slot of armorSlots) {
    const item = equipment[slot];
    if (item && item.properties['ac']) {
      ac += item.properties['ac'] + item.enchantment;
    }
  }
  return ac;
}

export function recomputeDerivedStats(hero: Hero): Hero {
  const eq = hero.equipment;

  // ── Scaled affix attribute bonuses ────────────────────────
  const soulDrainAll = Math.round(getEquipAffixTotal(eq, 'soul-drain'));
  const bonusStr = Math.round(getEquipAffixTotal(eq, 'might')) + soulDrainAll;
  const bonusInt = Math.round(getEquipAffixTotal(eq, 'brilliance')) + soulDrainAll;
  const bonusCon = Math.round(getEquipAffixTotal(eq, 'fortitude')) + soulDrainAll;
  const bonusDex = Math.round(getEquipAffixTotal(eq, 'grace')) + soulDrainAll;

  // ── Unique item attribute bonuses ─────────────────────────
  let uStr = 0, uInt = 0, uCon = 0, uDex = 0;
  for (const slot of Object.values(eq)) {
    if (!slot) continue;
    const tpl = ITEM_BY_ID[slot.templateId];
    if (!tpl?.uniqueAbility) continue;
    const ua = tpl.uniqueAbility;
    if (ua === 'crown-power') { uStr += 10; uInt += 10; uCon += 10; uDex += 10; }
    else if (ua === 'titan-power') uCon += 30;
    else if (ua === 'archmage-power') uInt += 30;
    else if (ua === 'forge-power') uStr += 20;
  }

  const effCon = hero.attributes.constitution + bonusCon + uCon;
  const effInt = hero.attributes.intelligence + bonusInt + uInt;
  const effDex = hero.attributes.dexterity + bonusDex + uDex;

  // ── Max HP/MP with Vitality and Arcane Well bonuses ───────
  let maxHp = computeMaxHp(effCon, hero.level);
  let maxMp = computeMaxMp(effInt, hero.level);
  maxHp += Math.round(getEquipAffixTotal(eq, 'vitality'));
  maxMp += Math.round(getEquipAffixTotal(eq, 'arcane-well'));
  // Soul Drain: reduce max HP (secondary value)
  const soulDrainHpPenalty = Math.round(getEquipAffixTotal2(eq, 'soul-drain'));
  if (soulDrainHpPenalty > 0) maxHp = Math.max(10, maxHp - soulDrainHpPenalty);

  // ── Armor value + Hardened affix ──────────────────────────
  let armorValue = computeTotalArmorValue(effDex, eq);
  armorValue += Math.round(getEquipAffixTotal(eq, 'hardened'));

  // Unique armor bonuses
  for (const slot of Object.values(eq)) {
    if (!slot) continue;
    const tpl = ITEM_BY_ID[slot.templateId];
    if (tpl?.uniqueAbility === 'aegis-power') armorValue += 10;
    if (tpl?.uniqueAbility === 'demonhide-power') armorValue += 15;
  }

  // Shield spell bonus
  const hasShield = hero.activeEffects?.some(e => e.id === 'shield');
  if (hasShield) armorValue += 4;

  // ── Weapon bonuses + Sharpness affix ──────────────────────
  let equipDamageBonus = 0;
  let equipAccuracyBonus = 0;
  const weapon = eq.weapon;
  if (weapon) {
    equipDamageBonus = weapon.enchantment;
    equipAccuracyBonus = (weapon.properties['accuracy'] ?? 0) + weapon.enchantment;
  }
  equipDamageBonus += Math.round(getEquipAffixTotal(eq, 'sharpness'));
  // Might/Strength bonus adds to melee damage (1 per 5 bonus Str)
  equipDamageBonus += Math.floor((bonusStr + uStr) / 5);

  // ── Magic Resistance (scaled, capped at 40% per affix) ───
  const magicResistBonus = Math.round(getEquipAffixTotal(eq, 'magic-resist'));

  // ── Elemental Touched resist bonuses ──────────────────────
  const fireResistBonus = Math.round(getEquipAffixTotal2(eq, 'fire-touched'));
  const coldResistBonus = Math.round(getEquipAffixTotal2(eq, 'frost-touched'));
  const lightningResistBonus = Math.round(getEquipAffixTotal2(eq, 'storm-touched'));

  // ── Unique item elemental resistances ─────────────────────
  let uniqueResist = { cold: 0, fire: 0, lightning: 0, acid: 0, drain: 0 };
  for (const slot of Object.values(eq)) {
    if (!slot) continue;
    const tpl = ITEM_BY_ID[slot.templateId];
    if (!tpl?.uniqueAbility) continue;
    const ua = tpl.uniqueAbility;
    const wardVal = slot.properties?.['wardUpgraded'] ? 99 : 75;
    if (ua === 'resist-fire-75') uniqueResist.fire += wardVal;
    else if (ua === 'resist-cold-75') uniqueResist.cold += wardVal;
    else if (ua === 'resist-lightning-75') uniqueResist.lightning += wardVal;
    else if (ua === 'resist-drain-75') uniqueResist.drain += wardVal;
    else if (ua === 'elemental-immunity') {
      uniqueResist.cold += 50; uniqueResist.fire += 50;
      uniqueResist.lightning += 50; uniqueResist.acid += 50; uniqueResist.drain += 50;
    } else if (ua === 'lightning-boost') {
      uniqueResist.lightning += 75;
    } else if (ua === 'demonhide-power') {
      uniqueResist.fire += 50; uniqueResist.cold += 50;
    }
  }

  const hp = Math.min(hero.hp, maxHp);
  const mp = Math.min(hero.mp, maxMp);

  // ── Active spell resist buffs ──────────────────────────────
  let spellResist = { cold: 0, fire: 0, lightning: 0 };
  for (const eff of hero.activeEffects ?? []) {
    if (eff.id === 'resist-cold') spellResist.cold += 50;
    if (eff.id === 'resist-fire') spellResist.fire += 50;
    if (eff.id === 'resist-lightning') spellResist.lightning += 50;
  }

  // Use createDefaultResistances base (0 for all) + all bonuses
  const resistances = {
    cold:      Math.min(100, magicResistBonus + coldResistBonus + uniqueResist.cold + spellResist.cold),
    fire:      Math.min(100, magicResistBonus + fireResistBonus + uniqueResist.fire + spellResist.fire),
    lightning: Math.min(100, magicResistBonus + lightningResistBonus + uniqueResist.lightning + spellResist.lightning),
    acid:      Math.min(100, magicResistBonus + uniqueResist.acid),
    drain:     Math.min(100, magicResistBonus + uniqueResist.drain),
  };

  return {
    ...hero,
    maxHp, maxMp, hp, mp, armorValue, equipDamageBonus, equipAccuracyBonus, resistances,
  };
}

export function getEffectiveAttribute(
  base: number,
  attr: keyof Attributes,
  equipment: Equipment
): number {
  let total = base;
  for (const item of Object.values(equipment)) {
    if (item && item.properties[attr]) total += item.properties[attr];
  }
  return total;
}
