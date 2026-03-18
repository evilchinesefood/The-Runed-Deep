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
