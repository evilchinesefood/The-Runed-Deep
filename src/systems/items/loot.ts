// ============================================================
// Loot generation — drops items when monsters die
// ============================================================

import type { Item, Vector2 } from "../../core/types";
import {
  getItemsForDepth,
  ITEM_BY_ID,
  type ItemTemplate,
} from "../../data/items";
import { rollSpecialEnchantments } from "../../data/Enchantments";

let nextItemId = Date.now();

/** Ensure nextItemId is above all existing item IDs in a loaded save */
export function syncItemIdCounter(state: import('../../core/types').GameState): void {
  let maxId = 0;
  const extract = (id: string) => {
    const m = id.match(/^item-(\d+)$/);
    if (m) maxId = Math.max(maxId, parseInt(m[1]));
  };
  // Scan hero inventory + equipment
  for (const item of state.hero.inventory) extract(item.id);
  for (const eq of Object.values(state.hero.equipment)) {
    if (eq) extract((eq as any).id);
  }
  // Scan floor items
  for (const floor of Object.values(state.floors)) {
    for (const placed of (floor as any).items ?? []) {
      if (placed?.item?.id) extract(placed.item.id);
    }
  }
  // Scan shop inventories
  for (const items of Object.values(state.town.shopInventories)) {
    for (const item of items as any[]) {
      if (item?.id) extract(item.id);
    }
  }
  if (maxId >= nextItemId) {
    nextItemId = maxId + 1;
  }
}

/**
 * Generate a random loot drop for a killed monster.
 * Returns null if no drop (based on drop chance).
 */
export function generateLoot(
  depth: number,
  _position: Vector2,
  ngPlus: number = 0,
): Item | null {
  // Drop chance: 30% base, increases slightly with depth
  const dropChance = 0.3 + depth * 0.005;
  if (Math.random() > dropChance) return null;

  // 20% chance of copper instead of an item
  if (Math.random() < 0.2) {
    return createCopperDrop(depth);
  }

  const candidates = getItemsForDepth(depth);
  if (candidates.length === 0) return null;

  const template = candidates[Math.floor(Math.random() * candidates.length)];
  return createItemFromTemplate(template, depth, ngPlus);
}

/**
 * Create an Item instance from a template.
 * May add random enchantments on deeper floors.
 */
export function createItemFromTemplate(
  template: ItemTemplate,
  depth: number,
  ngPlus: number = 0,
): Item {
  const id = `item-${nextItemId++}`;

  // Enchantment chance increases with depth; tier boosts enchantment range
  let enchantment = 0;
  let cursed = false;
  const tier = ITEM_BY_ID[template.id]?.materialTier;

  if (template.equipSlot) {
    const isUnique = !!template.unique;
    const enchantRoll = Math.random();
    if (!isUnique && enchantRoll < 0.05 + depth * 0.01) {
      // Cursed item (never for uniques)
      enchantment = -(Math.floor(Math.random() * 3) + 1);
      cursed = true;
    } else if (enchantRoll < (isUnique ? 0.3 + ngPlus * 0.2 : 0.15 + depth * 0.015)) {
      // Enchanted item — uniques have higher base chance, scale with NG+
      const baseMax = isUnique ? 3 + ngPlus * 3 : tier === "meteoric" ? 8 : tier === "elven" ? 4 : 3;
      const depthBonus = Math.floor(depth / 15);
      const ngBonus = tier === "meteoric" ? ngPlus * 5 : 0;
      const maxEnchant = baseMax + depthBonus + ngBonus;
      enchantment = Math.floor(Math.random() * maxEnchant) + 1;
    }
  }

  // Build properties from template
  const properties: Record<string, number> = {};
  if (template.damageMin !== undefined)
    properties["damageMin"] = template.damageMin;
  if (template.damageMax !== undefined)
    properties["damageMax"] = template.damageMax;
  if (template.accuracy !== undefined)
    properties["accuracy"] = template.accuracy;
  if (template.ac !== undefined) properties["ac"] = template.ac;
  if (template.healAmount !== undefined)
    properties["healAmount"] = template.healAmount;
  if (template.healPct !== undefined) properties["healPct"] = template.healPct;
  if (template.charges !== undefined) properties["charges"] = template.charges;
  if (template.twoHanded) properties["twoHanded"] = 1;
  if (template.weightCapacity !== undefined)
    properties["weightCapacity"] = template.weightCapacity;

  // Build display name
  let name = template.name;
  if (enchantment > 0) name = `${template.name} +${enchantment}`;
  else if (enchantment < 0) name = `${template.name} ${enchantment}`;

  // All items use their template sprite — glow differentiates enchanted/cursed
  const sprite = template.sprite;

  const base: Item = {
    id,
    templateId: template.id,
    name,
    category: template.category,
    sprite,
    weight: template.weight,
    bulk: Math.floor(template.weight / 5),
    value: Math.max(1, template.value + enchantment * 20),
    identified: !!template.unique || (template.category !== 'spellbook' && !cursed && enchantment === 0),
    cursed,
    enchantment,
    properties,
  };

  const isTier = !!ITEM_BY_ID[template.id]?.materialTier;
  const specials = rollSpecialEnchantments(depth, isTier, ngPlus);
  if (specials.length > 0) {
    const suffixes = [
      "of Power",
      "of the Ancients",
      "of Legends",
      "of the Gods",
      "of Valor",
    ];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return {
      ...base,
      name: `${base.name} ${suffix}`,
      identified: false,
      specialEnchantments: specials,
    };
  }

  return base;
}

export function createCopperDrop(depth: number): Item {
  const amount = Math.floor(Math.random() * (10 + depth * 5)) + 1;
  return {
    id: `item-${nextItemId++}`,
    templateId: "copper-coins",
    name: `${amount} Gold`,
    category: "currency",
    sprite: "coins-gold",
    weight: amount * 5,
    bulk: amount,
    value: amount,
    identified: true,
    cursed: false,
    enchantment: 0,
    properties: { amount },
  };
}
