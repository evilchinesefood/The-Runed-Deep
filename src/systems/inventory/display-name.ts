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
 * Unidentified items show the base template sprite (no cursed/enchanted variant).
 */
export function getDisplaySprite(item: Item): string {
  if (!item.identified) {
    const tpl = ITEM_BY_ID[item.templateId];
    return tpl ? tpl.sprite : item.sprite;
  }
  return item.sprite;
}
