// ============================================================
// Loot generation — drops items when monsters die
// ============================================================

import type { Item, Vector2 } from "../../core/types";
import {
  getItemsForDepth,
  ITEM_BY_ID,
  type ItemTemplate,
} from "../../data/items";
import {
  rollSpecialEnchantments,
  getEquipAffixTotal,
  AFFIX_BY_ID,
} from "../../data/Enchantments";
import { pickItemSprite } from "./SpritePool";

let nextItemId = Date.now();

/** Pick suffix from the rarest affix (lowest weight). Ties go to first in list. */
function getAffixSuffix(enchantments: string[]): string {
  let bestId = enchantments[0].replace(":critical", "");
  let bestWeight = Infinity;
  for (const raw of enchantments) {
    const id = raw.replace(":critical", "");
    const affix = AFFIX_BY_ID[id];
    if (affix && affix.weight < bestWeight) {
      bestWeight = affix.weight;
      bestId = id;
    }
  }
  const affix = AFFIX_BY_ID[bestId];
  return affix ? `of ${affix.name}` : "of Power";
}

/** Ensure nextItemId is above all existing item IDs in a loaded save */
export function syncItemIdCounter(
  state: import("../../core/types").GameState,
): void {
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
  // Scan stash
  for (const item of state.stash) extract(item.id);
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
  equipment?: Record<string, any>,
  isBoss: boolean = false,
): Item | null {
  // Bosses always drop loot
  if (!isBoss) {
    // Fortune affix: boost drop chance
    let fortuneDropBonus = 0;
    if (equipment) {
      fortuneDropBonus = getEquipAffixTotal(equipment, "fortune") / 100;
      // fortune-power unique: +25% drop rate
      for (const eq of Object.values(equipment)) {
        if (
          eq &&
          ITEM_BY_ID[(eq as any).templateId]?.uniqueAbility === "fortune-power"
        ) {
          fortuneDropBonus += 0.25;
          break;
        }
      }
    }

    const dropChance = 0.18 + depth * 0.003 + fortuneDropBonus;
    if (Math.random() > dropChance) return null;

    // 20% chance of gold instead of an item
    if (Math.random() < 0.2) {
      return createGoldDrop(depth, equipment);
    }
  }

  const candidates = getItemsForDepth(depth, ngPlus);
  if (candidates.length === 0) return null;

  // Boss guaranteed unique drop
  if (isBoss) {
    const uniqueCandidates = candidates.filter((t) => t.unique);
    if (uniqueCandidates.length > 0) {
      const template =
        uniqueCandidates[Math.floor(Math.random() * uniqueCandidates.length)];
      return createItemFromTemplate(template, depth, ngPlus);
    }
  }

  // Unique drop gate: if a unique is selected, 97% chance to re-roll as non-unique
  // NG+ increases unique chance: 3% / 4.5% / 6% / 8%
  // NG+ increases unique chance: 1.5% / 2.5% / 3.5% / 5%
  const uniqueChance = 0.015 + ngPlus * 0.01;
  let template = candidates[Math.floor(Math.random() * candidates.length)];
  if (template.unique && Math.random() > uniqueChance) {
    const nonUnique = candidates.filter((t) => !t.unique);
    if (nonUnique.length > 0) {
      template = nonUnique[Math.floor(Math.random() * nonUnique.length)];
    }
  }

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
    if (isUnique) {
      // Uniques: guaranteed minimum enchantment, scales with NG+
      const minEnch =
        ngPlus >= 3 ? 10 : ngPlus === 2 ? 9 : ngPlus === 1 ? 7 : 5;
      const maxEnch = minEnch + 3 + ngPlus * 2;
      enchantment =
        minEnch + Math.floor(Math.random() * (maxEnch - minEnch + 1));
    } else {
      const enchantRoll = Math.random();
      if (enchantRoll < 0.1) {
        // Cursed item
        enchantment = -(Math.floor(Math.random() * 3) + 1);
        cursed = true;
      } else if (enchantRoll < 0.15 + depth * 0.015) {
        const meteoricMax = [8, 15, 20, 25][Math.min(ngPlus, 3)] ?? 25;
        const baseMax =
          tier === "meteoric"
            ? meteoricMax
            : tier === "elven"
              ? 5 + ngPlus * 2
              : 4 + ngPlus * 2;
        const depthBonus = Math.floor(depth / 8);
        const maxEnchant = baseMax + depthBonus;
        enchantment = Math.floor(Math.random() * maxEnchant) + 1;
      }
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

  // Pick sprite from pool; fall back to template sprite
  const isUnique = !!template.unique;
  const spriteLayers = pickItemSprite(template.id, isUnique);
  const sprite = spriteLayers.length > 0 ? spriteLayers[0] : template.sprite;

  const base: Item = {
    id,
    templateId: template.id,
    name,
    category: template.category,
    sprite,
    spriteLayers: spriteLayers.length > 0 ? spriteLayers : undefined,
    weight: template.weight,
    bulk: Math.floor(template.weight / 5),
    value: Math.max(1, template.value + enchantment * 20),
    identified: true,
    cursed,
    enchantment,
    properties,
  };

  const isTier = !!ITEM_BY_ID[template.id]?.materialTier;
  const isWeapon = template.category === "weapon";
  const isArmor = [
    "armor",
    "shield",
    "helmet",
    "cloak",
    "gauntlets",
    "boots",
    "belt",
  ].includes(template.category);

  // Ward amulets: 10% chance to roll 99% resist instead of 75%
  if (
    isUnique &&
    template.uniqueAbility?.startsWith("resist-") &&
    template.uniqueAbility.endsWith("-75")
  ) {
    if (Math.random() < 0.1) {
      base.properties["wardUpgraded"] = 1;
    }
  }

  // Roll affixes — only for equippable items
  let specials: string[] = [];
  if (!template.equipSlot) {
    // Non-equippable items (scrolls, spellbooks, wands, potions, misc) never get affixes
  } else if (isUnique) {
    // Always roll affixes for uniques, min count scales with NG+
    const minAffixes =
      ngPlus >= 3 ? 4 : ngPlus === 2 ? 3 : ngPlus === 1 ? 2 : 1;
    specials = rollSpecialEnchantments(
      depth,
      true,
      ngPlus,
      isWeapon,
      isArmor,
      cursed,
    );
    // Ensure minimum count — capped at 20 attempts to prevent infinite loop
    let attempts = 0;
    while (specials.length < minAffixes && attempts++ < 20) {
      const extra = rollSpecialEnchantments(
        depth,
        true,
        ngPlus,
        isWeapon,
        isArmor,
        cursed,
      );
      if (extra.length === 0) continue; // roll returned empty due to random chance, retry
      for (const e of extra) {
        const eid = e.replace(":critical", "");
        if (!specials.some((s) => s.replace(":critical", "") === eid)) {
          specials.push(e);
          if (specials.length >= minAffixes) break;
        }
      }
    }
  } else {
    specials = rollSpecialEnchantments(
      depth,
      isTier,
      ngPlus,
      isWeapon,
      isArmor,
      cursed,
      enchantment,
    );
  }

  if (specials.length > 0) {
    const suffix = getAffixSuffix(specials);
    return {
      ...base,
      name: `${base.name} ${suffix}`,
      identified: true,
      specialEnchantments: specials,
    };
  }

  return base;
}

export function createGoldDrop(
  depth: number,
  equipment?: Record<string, any>,
): Item {
  let amount = Math.floor(Math.random() * (10 + depth * 5)) + 1;
  // Fortune affix: bonus gold %
  if (equipment) {
    const goldBonus = getEquipAffixTotal(equipment, "fortune") / 100;
    // fortune-power unique: double gold
    let fortuneUniqueMult = 1;
    for (const eq of Object.values(equipment)) {
      if (
        eq &&
        ITEM_BY_ID[(eq as any).templateId]?.uniqueAbility === "fortune-power"
      ) {
        fortuneUniqueMult = 2;
        break;
      }
    }
    amount = Math.round(amount * (1 + goldBonus) * fortuneUniqueMult);
  }
  const goldLayers = pickItemSprite("gold-coins", false);
  const goldSprite = goldLayers.length > 0 ? goldLayers[0] : "coins-gold";
  return {
    id: `item-${nextItemId++}`,
    templateId: "gold-coins",
    name: `${amount} Gold`,
    category: "currency",
    sprite: goldSprite,
    spriteLayers: goldLayers.length > 0 ? goldLayers : undefined,
    weight: amount * 5,
    bulk: amount,
    value: amount,
    identified: true,
    cursed: false,
    enchantment: 0,
    properties: { amount },
  };
}
