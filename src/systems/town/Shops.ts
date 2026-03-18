// ============================================================
// Shop system — buy/sell logic + inventory management
// ============================================================

import type { GameState, Item } from '../../core/types';
import { ALL_ITEM_TEMPLATES, getItemsForDepth } from '../../data/items';
import { createItemFromTemplate } from '../items/loot';

export interface ShopDef {
  id: string;
  name: string;
  categories: string[];
  buyMult: number;
  sellOnCat: number;
  sellOffCat: number;
}

export const SHOP_DEFS: Record<string, ShopDef> = {
  'weapon-shop':   { id: 'weapon-shop',   name: 'Weapon Shop',     categories: ['weapon'], buyMult: 1.0, sellOnCat: 0.6, sellOffCat: 0.3 },
  'armor-shop':    { id: 'armor-shop',    name: 'Armor Shop',      categories: ['armor','shield','helmet','cloak','bracers','gauntlets','boots','belt'], buyMult: 1.0, sellOnCat: 0.6, sellOffCat: 0.3 },
  'general-store': { id: 'general-store', name: 'General Store',   categories: ['potion','scroll','ring','amulet','misc','container'], buyMult: 1.0, sellOnCat: 0.5, sellOffCat: 0.35 },
  'magic-shop':    { id: 'magic-shop',    name: 'Magic Shop',      categories: ['spellbook','wand','staff'], buyMult: 1.2, sellOnCat: 0.55, sellOffCat: 0.25 },
  'junk-store':    { id: 'junk-store',    name: "Olaf's Junk Store", categories: [], buyMult: 0.8, sellOnCat: 0.4, sellOffCat: 0.4 },
};

export function getShopDef(shopId: string): ShopDef | undefined {
  return SHOP_DEFS[shopId];
}

export function getBuyPrice(item: Item, shopId: string): number {
  const shop = SHOP_DEFS[shopId];
  if (!shop) return item.value;
  return Math.max(1, Math.ceil(item.value * shop.buyMult));
}

export function getSellPrice(item: Item, shopId: string): number {
  const shop = SHOP_DEFS[shopId];
  if (!shop) return 1;
  const isJunk = shopId === 'junk-store';
  const inCat = !isJunk && shop.categories.includes(item.category);
  const mult = inCat ? shop.sellOnCat : shop.sellOffCat;
  return Math.max(1, Math.floor(item.value * mult));
}

export function initShopInventory(shopId: string, depth: number): Item[] {
  const shop = SHOP_DEFS[shopId];
  if (!shop) return [];

  const count = 8 + Math.floor(Math.random() * 5); // 8-12
  const candidates = getItemsForDepth(depth).filter(t => shop.categories.length === 0 || shop.categories.includes(t.category));

  // Fallback for junk store — use depth-1 everything
  const pool = candidates.length > 0 ? candidates : ALL_ITEM_TEMPLATES.filter(t => t.depthMin === 1);

  const items: Item[] = [];
  for (let i = 0; i < count; i++) {
    if (pool.length === 0) break;
    const tpl = pool[Math.floor(Math.random() * pool.length)];
    const item = createItemFromTemplate(tpl, depth);
    item.identified = true;
    items.push(item);
  }
  return items;
}

export function restockShop(items: Item[], shopId: string, depth: number): Item[] {
  if (items.length >= 20) return items;
  const toAdd = 1 + Math.floor(Math.random() * 3); // 1-3
  const newItems = initShopInventory(shopId, depth).slice(0, toAdd);
  return [...items, ...newItems];
}

function addMsg(state: GameState, text: string, severity: 'normal' | 'important' | 'system' = 'important'): GameState {
  return { ...state, messages: [...state.messages, { text, severity, turn: state.turn }] };
}

export function buyItem(state: GameState, shopId: string, itemId: string): GameState {
  const shopInv = state.town.shopInventories[shopId] ?? [];
  const idx = shopInv.findIndex(i => i.id === itemId);
  if (idx === -1) return addMsg(state, 'Item not found.', 'system');

  const item = shopInv[idx];
  const price = getBuyPrice(item, shopId);

  if (state.hero.copper < price) {
    return addMsg(state, `You cannot afford that. (${price} copper needed)`, 'system');
  }

  const newShopInv = shopInv.filter((_, i) => i !== idx);
  return addMsg({
    ...state,
    hero: {
      ...state.hero,
      copper: state.hero.copper - price,
      inventory: [...state.hero.inventory, item],
    },
    town: {
      ...state.town,
      shopInventories: { ...state.town.shopInventories, [shopId]: newShopInv },
    },
  }, `You buy ${item.name} for ${price} copper.`);
}

export function sellItem(state: GameState, shopId: string, itemId: string): GameState {
  const idx = state.hero.inventory.findIndex(i => i.id === itemId);
  if (idx === -1) return addMsg(state, 'Item not found.', 'system');

  const item = state.hero.inventory[idx];
  const price = getSellPrice(item, shopId);
  const shopInv = state.town.shopInventories[shopId] ?? [];

  return addMsg({
    ...state,
    hero: {
      ...state.hero,
      copper: state.hero.copper + price,
      inventory: state.hero.inventory.filter((_, i) => i !== idx),
    },
    town: {
      ...state.town,
      shopInventories: { ...state.town.shopInventories, [shopId]: [...shopInv, item] },
    },
  }, `You sell ${item.name} for ${price} copper.`);
}
