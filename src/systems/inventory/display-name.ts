import type { Item } from '../../core/types';
import { ITEM_BY_ID } from '../../data/items';

/** Returns the name shown to the player. Always shows full name. */
export function getDisplayName(item: Item): string {
  return item.name;
}

/** Returns the sprite class for an item. */
export function getDisplaySprite(item: Item): string {
  return item.sprite;
}

/** Returns the name color for an item. */
export function itemNameColor(item: Item): string {
  const tpl = ITEM_BY_ID[item.templateId];
  if (tpl?.unique) return '#f90';
  if (item.cursed) return '#f44';
  if (item.blessed) return '#c8f';
  if (item.specialEnchantments?.length) return '#f90';
  if (item.enchantment > 0) return '#4af';
  return '#fff';
}

/** Returns a CSS filter string for enchanted/cursed/blessed glow. */
export function getItemGlow(item: Item): string {
  const tpl = ITEM_BY_ID[item.templateId];
  if (tpl?.unique) return 'drop-shadow(0 0 2px rgba(255, 153, 0, 0.9))';
  if (item.cursed) return 'drop-shadow(0 0 2px rgba(255, 50, 50, 0.9))';
  if (item.blessed) return 'drop-shadow(0 0 2px rgba(200, 140, 255, 0.9))';
  if (item.specialEnchantments?.length) return 'drop-shadow(0 0 2px rgba(255, 153, 0, 0.9))';
  if (item.enchantment > 0) return 'drop-shadow(0 0 2px rgba(70, 130, 255, 0.9))';
  return '';
}
