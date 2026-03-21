import type { Item } from '../../core/types';
import { ITEM_BY_ID } from '../../data/items';

/**
 * Returns the name shown to the player.
 * Unidentified enchanted/cursed items show the base template name.
 */
export function getDisplayName(item: Item): string {
  if (!item.identified && item.enchantment !== 0) {
    const tpl = ITEM_BY_ID[item.templateId];
    return tpl ? tpl.name : item.category;
  }
  return item.name;
}

/**
 * Returns the sprite to show for an item.
 * Unidentified items show the base template sprite.
 */
export function getDisplaySprite(item: Item): string {
  if (!item.identified) {
    const tpl = ITEM_BY_ID[item.templateId];
    return tpl ? tpl.sprite : item.sprite;
  }
  return item.sprite;
}

/**
 * Returns a CSS filter string for enchanted/cursed glow.
 * Empty string for normal items or unidentified.
 */
export function getItemGlow(item: Item): string {
  if (!item.identified) return '';
  if (item.enchantment > 0) return 'drop-shadow(0 0 2px rgba(70, 130, 255, 0.9))';
  if (item.cursed) return 'drop-shadow(0 0 2px rgba(255, 50, 50, 0.9))';
  return '';
}
