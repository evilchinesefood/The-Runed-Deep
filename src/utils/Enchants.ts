import type { Equipment } from "../core/types";
import { getAffixValue, getAffixValue2 } from "../data/Enchantments";

/** Check if any equipped item has a specific affix */
export function hasEnchant(equipment: Equipment, id: string): boolean {
  return Object.values(equipment).some((i) =>
    i?.specialEnchantments?.some(
      (e: string) => e === id || e === `${id}:critical`,
    ),
  );
}

/** Legacy multiplier — returns 1 or 2 (critical) */
export function enchantMult(equipment: Equipment, id: string): number {
  return Object.values(equipment).some((i) =>
    i?.specialEnchantments?.includes(`${id}:critical`),
  )
    ? 2
    : 1;
}

/** Get total scaled affix value across all equipped items */
export function equipAffixTotal(equipment: Equipment, affixId: string): number {
  let total = 0;
  for (const item of Object.values(equipment)) {
    if (!item?.specialEnchantments) continue;
    const enchants = item.specialEnchantments as string[];
    const isCrit = enchants.includes(`${affixId}:critical`);
    const has = isCrit || enchants.includes(affixId);
    if (has) {
      total += getAffixValue(affixId, item.enchantment ?? 0, isCrit);
    }
  }
  return total;
}

/** Get total secondary scaled value across all equipped items */
export function equipAffixTotal2(equipment: Equipment, affixId: string): number {
  let total = 0;
  for (const item of Object.values(equipment)) {
    if (!item?.specialEnchantments) continue;
    const enchants = item.specialEnchantments as string[];
    const isCrit = enchants.includes(`${affixId}:critical`);
    const has = isCrit || enchants.includes(affixId);
    if (has) {
      total += getAffixValue2(affixId, item.enchantment ?? 0, isCrit);
    }
  }
  return total;
}
