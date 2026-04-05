import type { Hero, Attributes, Equipment, EquipSlot } from "../../core/types";
import { ITEM_BY_ID } from "../../data/items";
import { getAffixValue, getAffixValue2 } from "../../data/Enchantments";
import { RUNE_BY_ID, getRuneValue } from "../../data/Runes";

/** Single-pass scan of all affix totals across equipment */
function scanAllAffixes(
  equipment: Record<string, any>,
  statueUpgrades?: Record<string, number>,
): { totals: Map<string, number>; totals2: Map<string, number> } {
  const totals = new Map<string, number>();
  const totals2 = new Map<string, number>();
  for (const item of Object.values(equipment)) {
    if (!item?.specialEnchantments) continue;
    for (const rawEid of item.specialEnchantments as string[]) {
      const isCrit = rawEid.endsWith(":critical");
      const eid = isCrit ? rawEid.replace(":critical", "") : rawEid;
      const statueBonus = statueUpgrades?.[`affix-${eid}`] ?? 0;
      const ench =
        (item.enchantment ?? 0) + (item.blessed ? 1 : 0) + statueBonus;
      const val = getAffixValue(eid, ench, isCrit);
      const val2 = getAffixValue2(eid, ench, isCrit);
      totals.set(eid, (totals.get(eid) || 0) + val);
      totals2.set(eid, (totals2.get(eid) || 0) + val2);
    }
  }
  return { totals, totals2 };
}

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

export function computeTotalArmorValue(
  dexterity: number,
  equipment: Equipment,
): number {
  let ac = computeBaseArmorValue(dexterity);
  const armorSlots: EquipSlot[] = [
    "helmet",
    "body",
    "shield",
    "cloak",
    "gauntlets",
    "boots",
    "belt",
    "ringLeft",
    "ringRight",
    "amulet",
  ];
  for (const slot of armorSlots) {
    const item = equipment[slot];
    if (item && item.properties["ac"]) {
      ac += item.properties["ac"] + item.enchantment;
    }
  }
  return ac;
}

export function recomputeDerivedStats(
  hero: Hero,
  statueUpgrades?: Record<string, number>,
): Hero {
  const eq = hero.equipment;
  const su = statueUpgrades ?? hero.statueUpgrades ?? {};

  // ── Single-pass affix scan ───────────────────────────────
  const { totals: ax, totals2: ax2 } = scanAllAffixes(eq, su);
  const af = (id: string) => Math.round(ax.get(id) || 0);
  const af2 = (id: string) => Math.round(ax2.get(id) || 0);

  // ── Statue base stat bonuses ─────────────────────────────
  const statStr = (su["stat-str"] ?? 0) * 5;
  const statInt = (su["stat-int"] ?? 0) * 5;
  const statCon = (su["stat-con"] ?? 0) * 5;
  const statDex = (su["stat-dex"] ?? 0) * 5;

  // ── Scaled affix attribute bonuses ────────────────────────
  const soulDrainAll = af("soul-drain");
  const bonusStr = af("might") + soulDrainAll + statStr;
  const bonusInt = af("brilliance") + soulDrainAll + statInt;
  const bonusCon = af("fortitude") + soulDrainAll + statCon;
  const bonusDex = af("grace") + soulDrainAll + statDex;

  // ── Unique item attribute bonuses ─────────────────────────
  let uStr = 0,
    uInt = 0,
    uCon = 0,
    uDex = 0;
  for (const slot of Object.values(eq)) {
    if (!slot) continue;
    const tpl = ITEM_BY_ID[slot.templateId];
    if (!tpl?.uniqueAbility) continue;
    const ua = tpl.uniqueAbility;
    if (ua === "crown-power") {
      uStr += 10;
      uInt += 10;
      uCon += 10;
      uDex += 10;
    } else if (ua === "titan-power") uCon += 30;
    else if (ua === "archmage-power") uInt += 30;
    else if (ua === "forge-power") uStr += 20;
  }

  const effCon = hero.attributes.constitution + bonusCon + uCon;
  const effInt = hero.attributes.intelligence + bonusInt + uInt;
  const effDex = hero.attributes.dexterity + bonusDex + uDex;

  // ── Max HP/MP with Vitality and Arcane Well bonuses ───────
  let maxHp = computeMaxHp(effCon, hero.level);
  let maxMp = computeMaxMp(effInt, hero.level);
  maxHp += af("vitality");
  maxMp += af("arcane-well");
  // Statue resource bonuses
  maxHp += (su["resource-hp"] ?? 0) * 3;
  maxMp += (su["resource-mp"] ?? 0) * 3;
  // Soul Drain: reduce max HP (secondary value)
  const soulDrainHpPenalty = af2("soul-drain");
  if (soulDrainHpPenalty > 0) maxHp = Math.max(10, maxHp - soulDrainHpPenalty);

  // ── Armor value + Hardened affix ──────────────────────────
  let armorValue = computeTotalArmorValue(effDex, eq);
  armorValue += af("hardened");
  // Statue combat bonuses
  armorValue += (su["combat-armor"] ?? 0) * 1;

  // Unique armor bonuses
  for (const slot of Object.values(eq)) {
    if (!slot) continue;
    const tpl = ITEM_BY_ID[slot.templateId];
    if (tpl?.uniqueAbility === "aegis-power") armorValue += 10;
    if (tpl?.uniqueAbility === "demonhide-power") armorValue += 15;
  }

  // ── Rune socket bonuses ────────────────────────────────
  let runeHpBonus = 0,
    runeMpBonus = 0,
    runeAcBonus = 0;
  let runeResistBonus = 0,
    runeDodgeBonus = 0;
  for (const slot of Object.values(eq)) {
    if (!slot || !slot.sockets) continue;
    const effEnch = slot.enchantment + (slot.blessed ? 1 : 0);
    for (const runeId of slot.sockets) {
      if (!runeId) continue;
      const rune = RUNE_BY_ID[runeId];
      if (!rune) continue;
      const val = getRuneValue(runeId, effEnch);
      switch (rune.effect) {
        case "flat-ac":
          runeAcBonus += val;
          break;
        case "max-hp":
          runeHpBonus += val;
          break;
        case "max-mp":
          runeMpBonus += val;
          break;
        case "all-resist":
          runeResistBonus += val;
          break;
        case "dodge":
          runeDodgeBonus += val;
          break;
        case "hp-regen":
          // Regen handled in game-loop.ts tick, not derived stats
          break;
      }
    }
  }
  maxHp += Math.round(runeHpBonus);
  maxMp += Math.round(runeMpBonus);
  armorValue += Math.round(runeAcBonus);

  // Shield spell bonus
  const hasShield = hero.activeEffects?.some((e) => e.id === "shield");
  if (hasShield) armorValue += 4;

  // ── Weapon bonuses + Sharpness affix ──────────────────────
  let equipDamageBonus = 0;
  let equipAccuracyBonus = 0;
  const weapon = eq.weapon;
  if (weapon) {
    equipDamageBonus = weapon.enchantment;
    equipAccuracyBonus =
      (weapon.properties["accuracy"] ?? 0) + weapon.enchantment;
  }
  equipDamageBonus += af("sharpness");
  // Statue combat damage bonus
  equipDamageBonus += (su["combat-damage"] ?? 0) * 1;
  // Might/Strength bonus adds to melee damage (1 per 5 bonus Str)
  equipDamageBonus += Math.floor((bonusStr + uStr) / 5);

  // ── Magic Resistance (scaled, capped at 40% per affix) ───
  const magicResistBonus = af("magic-resist");

  // ── Elemental Touched resist bonuses ──────────────────────
  const fireResistBonus = af2("fire-touched");
  const coldResistBonus = af2("frost-touched");
  const lightningResistBonus = af2("storm-touched");

  // ── Unique item elemental resistances ─────────────────────
  let uniqueResist = { cold: 0, fire: 0, lightning: 0, acid: 0, drain: 0 };
  for (const slot of Object.values(eq)) {
    if (!slot) continue;
    const tpl = ITEM_BY_ID[slot.templateId];
    if (!tpl?.uniqueAbility) continue;
    const ua = tpl.uniqueAbility;
    const wardVal = slot.properties?.["wardUpgraded"] ? 99 : 75;
    if (ua === "resist-fire-75") uniqueResist.fire += wardVal;
    else if (ua === "resist-cold-75") uniqueResist.cold += wardVal;
    else if (ua === "resist-lightning-75") uniqueResist.lightning += wardVal;
    else if (ua === "resist-drain-75") uniqueResist.drain += wardVal;
    else if (ua === "elemental-immunity") {
      uniqueResist.cold += 50;
      uniqueResist.fire += 50;
      uniqueResist.lightning += 50;
      uniqueResist.acid += 50;
      uniqueResist.drain += 50;
    } else if (ua === "lightning-boost") {
      uniqueResist.lightning += 75;
    } else if (ua === "demonhide-power") {
      uniqueResist.fire += 50;
      uniqueResist.cold += 50;
    }
  }

  const hp = Math.min(hero.hp, maxHp);
  const mp = Math.min(hero.mp, maxMp);

  // ── Active spell resist buffs ──────────────────────────────
  let spellResist = { cold: 0, fire: 0, lightning: 0 };
  for (const eff of hero.activeEffects ?? []) {
    if (eff.id === "resist-cold") spellResist.cold += 50;
    if (eff.id === "resist-fire") spellResist.fire += 50;
    if (eff.id === "resist-lightning") spellResist.lightning += 50;
  }

  // Statue resistance bonuses
  const statueFire = (su["resist-fire"] ?? 0) * 2;
  const statueCold = (su["resist-cold"] ?? 0) * 2;
  const statueLightning = (su["resist-lightning"] ?? 0) * 2;

  // Use createDefaultResistances base (0 for all) + all bonuses
  const rr = Math.round(runeResistBonus);
  const resistances = {
    cold: Math.min(
      100,
      magicResistBonus +
        coldResistBonus +
        uniqueResist.cold +
        spellResist.cold +
        rr +
        statueCold,
    ),
    fire: Math.min(
      100,
      magicResistBonus +
        fireResistBonus +
        uniqueResist.fire +
        spellResist.fire +
        rr +
        statueFire,
    ),
    lightning: Math.min(
      100,
      magicResistBonus +
        lightningResistBonus +
        uniqueResist.lightning +
        spellResist.lightning +
        rr +
        statueLightning,
    ),
    acid: Math.min(100, magicResistBonus + uniqueResist.acid + rr),
    drain: Math.min(100, magicResistBonus + uniqueResist.drain + rr),
  };

  return {
    ...hero,
    maxHp,
    maxMp,
    hp,
    mp,
    armorValue,
    equipDamageBonus,
    equipAccuracyBonus,
    resistances,
  };
}

export function getEffectiveAttribute(
  base: number,
  attr: keyof Attributes,
  equipment: Equipment,
): number {
  let total = base;
  for (const item of Object.values(equipment)) {
    if (item && item.properties[attr]) total += item.properties[attr];
  }
  return total;
}
