import type { Item } from '../../core/types';
import { ITEM_BY_ID } from '../../data/items';

/**
 * Returns the name shown to the player.
 * Unidentified enchanted/cursed items show the base template name.
 */
export function getDisplayName(item: Item): string {
  if (!item.identified) {
    // Spellbooks: just show "Spellbook" — hide the spell name entirely
    if (item.category === 'spellbook') return 'Spellbook';
    // Enchanted/cursed items: show base template name (no +N/-N)
    if (item.enchantment !== 0) {
      const tpl = ITEM_BY_ID[item.templateId];
      return tpl ? tpl.name : item.category;
    }
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
/**
 * Returns the name color for an item.
 * Orange for unique/legendary, blue for enchanted, red for cursed, gray for unidentified.
 */
export function itemNameColor(item: Item): string {
  if (!item.identified) return '#888';
  const tpl = ITEM_BY_ID[item.templateId];
  if (tpl?.unique) return '#f90';
  if (item.specialEnchantments?.length) return '#f90';
  if (item.cursed) return '#f44';
  if (item.blessed) return '#c8f'; // purple for blessed
  if (item.enchantment > 0) return '#4af';
  return '#fff';
}

export function getItemGlow(item: Item): string {
  if (!item.identified) return '';
  const tpl = ITEM_BY_ID[item.templateId];
  if (tpl?.unique || item.specialEnchantments?.length) return 'drop-shadow(0 0 2px rgba(255, 153, 0, 0.9))';
  if (item.cursed) return 'drop-shadow(0 0 2px rgba(255, 50, 50, 0.9))';
  if (item.blessed) return 'drop-shadow(0 0 2px rgba(200, 140, 255, 0.9))';
  if (item.enchantment > 0) return 'drop-shadow(0 0 2px rgba(70, 130, 255, 0.9))';
  return '';
}
