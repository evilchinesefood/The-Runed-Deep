// ============================================================
// Loot generation — drops items when monsters die
// ============================================================

import type { Item, Vector2 } from '../../core/types';
import { getItemsForDepth, type ItemTemplate } from '../../data/items';

let nextItemId = 1;

/**
 * Generate a random loot drop for a killed monster.
 * Returns null if no drop (based on drop chance).
 */
export function generateLoot(depth: number, _position: Vector2): Item | null {
  // Drop chance: 30% base, increases slightly with depth
  const dropChance = 0.30 + depth * 0.005;
  if (Math.random() > dropChance) return null;

  // 20% chance of copper instead of an item
  if (Math.random() < 0.20) {
    return createCopperDrop(depth);
  }

  const candidates = getItemsForDepth(depth);
  if (candidates.length === 0) return null;

  const template = candidates[Math.floor(Math.random() * candidates.length)];
  return createItemFromTemplate(template, depth);
}

/**
 * Create an Item instance from a template.
 * May add random enchantments on deeper floors.
 */
export function createItemFromTemplate(template: ItemTemplate, depth: number): Item {
  const id = `item-${nextItemId++}`;

  // Enchantment chance increases with depth
  let enchantment = 0;
  let cursed = false;

  if (template.equipSlot) {
    const enchantRoll = Math.random();
    if (enchantRoll < 0.05 + depth * 0.01) {
      // Cursed item
      enchantment = -(Math.floor(Math.random() * 3) + 1);
      cursed = true;
    } else if (enchantRoll < 0.15 + depth * 0.015) {
      // Enchanted item
      enchantment = Math.floor(Math.random() * 3) + 1;
    }
  }

  // Build properties from template
  const properties: Record<string, number> = {};
  if (template.damageMin !== undefined) properties['damageMin'] = template.damageMin;
  if (template.damageMax !== undefined) properties['damageMax'] = template.damageMax;
  if (template.accuracy !== undefined) properties['accuracy'] = template.accuracy;
  if (template.ac !== undefined) properties['ac'] = template.ac;
  if (template.healAmount !== undefined) properties['healAmount'] = template.healAmount;
  if (template.healPct !== undefined) properties['healPct'] = template.healPct;
  if (template.charges !== undefined) properties['charges'] = template.charges;
  if (template.twoHanded) properties['twoHanded'] = 1;

  // Build display name
  let name = template.name;
  if (enchantment > 0) name = `${template.name} +${enchantment}`;
  else if (enchantment < 0) name = `${template.name} ${enchantment}`;

  // Pick sprite variant for cursed/enchanted
  // Skip variant suffix if base sprite already ends with -cursed or -enchanted
  let sprite = template.sprite;
  const alreadyVariant = sprite.endsWith('-enchanted') || sprite.endsWith('-cursed');
  if (!alreadyVariant) {
    if (cursed) {
      sprite = template.sprite + '-cursed';
    } else if (enchantment > 0) {
      sprite = template.sprite + '-enchanted';
    }
  }

  return {
    id,
    templateId: template.id,
    name,
    category: template.category,
    sprite,
    weight: template.weight,
    bulk: Math.floor(template.weight / 5),
    value: Math.max(1, template.value + enchantment * 20),
    identified: !cursed && enchantment === 0, // unidentified if enchanted/cursed
    cursed,
    enchantment,
    properties,
  };
}

export function createCopperDrop(depth: number): Item {
  const amount = Math.floor(Math.random() * (10 + depth * 5)) + 1;
  return {
    id: `item-${nextItemId++}`,
    templateId: 'copper-coins',
    name: `${amount} Copper`,
    category: 'currency',
    sprite: 'coins-copper',
    weight: amount * 5,
    bulk: amount,
    value: amount,
    identified: true,
    cursed: false,
    enchantment: 0,
    properties: { amount },
  };
}
