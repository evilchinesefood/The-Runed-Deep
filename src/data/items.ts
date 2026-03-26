// ============================================================
// Item Database — The Runed Deep
//
// All item templates organized by category. Each has a depth
// range for when it can appear as loot. Deeper = better items.
// ============================================================

import type { ItemCategory, EquipSlot } from '../core/types';

export interface ItemTemplate {
  id: string;
  name: string;
  category: ItemCategory;
  sprite: string;
  equipSlot?: EquipSlot;
  weight: number;          // grams
  value: number;           // copper pieces
  depthMin: number;        // earliest floor this appears
  depthMax: number;        // latest floor (99 = forever)
  // Combat properties
  damageMin?: number;
  damageMax?: number;
  accuracy?: number;       // hit bonus
  ac?: number;             // armor class bonus
  twoHanded?: boolean;
  // Special
  healAmount?: number;     // for potions
  healPct?: number;        // heal as % of max HP
  spellId?: string;        // for spellbooks/wands
  charges?: number;        // for wands
  // Material / container
  materialTier?: string;
  weightCapacity?: number; // max carry weight in grams
  bulkCapacity?: number;   // max bulk in grams
  // Unique items
  unique?: boolean;
  uniqueAbility?: string;  // special ability ID
}

// ── Weapons ───────────────────────────────────────────────

const WEAPONS: ItemTemplate[] = [
  { id: 'club', name: 'Club', category: 'weapon', sprite: 'club', equipSlot: 'weapon',
    weight: 1500, value: 5, depthMin: 1, depthMax: 8, damageMin: 2, damageMax: 4, accuracy: 0 },
  { id: 'dagger', name: 'Dagger', category: 'weapon', sprite: 'dagger', equipSlot: 'weapon',
    weight: 500, value: 10, depthMin: 1, depthMax: 10, damageMin: 3, damageMax: 5, accuracy: 1 },
  { id: 'spear', name: 'Spear', category: 'weapon', sprite: 'spear', equipSlot: 'weapon',
    weight: 2500, value: 15, depthMin: 2, depthMax: 12, damageMin: 4, damageMax: 6, accuracy: 0 },
  { id: 'mace', name: 'Mace', category: 'weapon', sprite: 'mace', equipSlot: 'weapon',
    weight: 3000, value: 30, depthMin: 3, depthMax: 18, damageMin: 5, damageMax: 8, accuracy: 0 },
  { id: 'short-sword', name: 'Short Sword', category: 'weapon', sprite: 'sword', equipSlot: 'weapon',
    weight: 1500, value: 35, depthMin: 5, depthMax: 18, damageMin: 5, damageMax: 8, accuracy: 1 },
  { id: 'flail', name: 'Flail', category: 'weapon', sprite: 'flail', equipSlot: 'weapon',
    weight: 3000, value: 40, depthMin: 7, depthMax: 22, damageMin: 7, damageMax: 10, accuracy: -1 },
  { id: 'long-sword', name: 'Long Sword', category: 'weapon', sprite: 'sword', equipSlot: 'weapon',
    weight: 2000, value: 60, depthMin: 10, depthMax: 99, damageMin: 9, damageMax: 13, accuracy: 1 },
  { id: 'morning-star', name: 'Morning Star', category: 'weapon', sprite: 'morning-star', equipSlot: 'weapon',
    weight: 4000, value: 55, depthMin: 12, depthMax: 28, damageMin: 8, damageMax: 12, accuracy: 0 },
  { id: 'battle-axe', name: 'Battle Axe', category: 'weapon', sprite: 'axe', equipSlot: 'weapon',
    weight: 4000, value: 70, depthMin: 14, depthMax: 99, damageMin: 9, damageMax: 13, accuracy: 0, twoHanded: true },
  { id: 'two-handed-sword', name: 'Two-Handed Sword', category: 'weapon', sprite: 'sword', equipSlot: 'weapon',
    weight: 4500, value: 120, depthMin: 18, depthMax: 99, damageMin: 12, damageMax: 18, accuracy: 0, twoHanded: true },
];

// ── Elven Weapons ─────────────────────────────────────────

const ELVEN_WEAPONS: ItemTemplate[] = [
  { id: 'elven-long-sword', name: 'Elven Long Sword', category: 'weapon', sprite: 'sword-enchanted', equipSlot: 'weapon',
    weight: 1500, value: 200, depthMin: 15, depthMax: 99, damageMin: 8, damageMax: 12, accuracy: 3, materialTier: 'elven' },
  { id: 'elven-dagger', name: 'Elven Dagger', category: 'weapon', sprite: 'dagger-enchanted', equipSlot: 'weapon',
    weight: 300, value: 120, depthMin: 12, depthMax: 99, damageMin: 5, damageMax: 8, accuracy: 4, materialTier: 'elven' },
  { id: 'elven-spear', name: 'Elven Spear', category: 'weapon', sprite: 'spear-enchanted', equipSlot: 'weapon',
    weight: 1800, value: 150, depthMin: 14, depthMax: 99, damageMin: 7, damageMax: 10, accuracy: 3, materialTier: 'elven' },
  { id: 'elven-mace', name: 'Elven Mace', category: 'weapon', sprite: 'mace-enchanted', equipSlot: 'weapon',
    weight: 2200, value: 180, depthMin: 14, depthMax: 99, damageMin: 8, damageMax: 11, accuracy: 2, materialTier: 'elven' },
  { id: 'elven-battle-axe', name: 'Elven Battle Axe', category: 'weapon', sprite: 'axe-enchanted', equipSlot: 'weapon',
    weight: 3500, value: 250, depthMin: 15, depthMax: 99, damageMin: 10, damageMax: 14, accuracy: 2, twoHanded: true, materialTier: 'elven' },
];

const ELVEN_ARMOR: ItemTemplate[] = [
  { id: 'elven-chain-mail', name: 'Elven Chain Mail', category: 'armor', sprite: 'elven-chain-mail', equipSlot: 'body',
    weight: 6000, value: 300, depthMin: 16, depthMax: 99, ac: 8, materialTier: 'elven' },
  { id: 'elven-shield', name: 'Elven Shield', category: 'shield', sprite: 'metal-shield-enchanted', equipSlot: 'shield',
    weight: 2500, value: 180, depthMin: 14, depthMax: 99, ac: 4, materialTier: 'elven' },
  { id: 'elven-helmet', name: 'Elven Helmet', category: 'helmet', sprite: 'metal-helmet-enchanted', equipSlot: 'helmet',
    weight: 1000, value: 120, depthMin: 14, depthMax: 99, ac: 3, materialTier: 'elven' },
  { id: 'elven-gloves', name: 'Elven Gloves', category: 'gauntlets', sprite: 'gloves-elven', equipSlot: 'gauntlets',
    weight: 300, value: 350, depthMin: 14, depthMax: 99, ac: 3, materialTier: 'elven' },
  { id: 'elven-boots', name: 'Elven Boots', category: 'boots', sprite: 'boots-enchanted', equipSlot: 'boots',
    weight: 700, value: 400, depthMin: 13, depthMax: 99, ac: 2, materialTier: 'elven' },
  { id: 'elven-cloak', name: 'Elven Cloak', category: 'cloak', sprite: 'elven-cloak', equipSlot: 'cloak',
    weight: 600, value: 500, depthMin: 15, depthMax: 99, ac: 3, materialTier: 'elven' },
  { id: 'elven-belt', name: 'Elven Belt', category: 'belt', sprite: 'elven-belt', equipSlot: 'belt',
    weight: 200, value: 150, depthMin: 14, depthMax: 99, ac: 3, materialTier: 'elven' },
  { id: 'elven-ring', name: 'Elven Ring', category: 'ring', sprite: 'elven-ring', equipSlot: 'ringLeft',
    weight: 30, value: 200, depthMin: 14, depthMax: 99, ac: 3, materialTier: 'elven' },
  { id: 'elven-amulet', name: 'Elven Amulet', category: 'amulet', sprite: 'elven-amulet', equipSlot: 'amulet',
    weight: 60, value: 250, depthMin: 14, depthMax: 99, ac: 3, materialTier: 'elven' },
];

// ── Meteoric Steel Weapons & Armor ────────────────────────

const METEORIC_WEAPONS: ItemTemplate[] = [
  { id: 'meteoric-long-sword', name: 'Meteoric Long Sword', category: 'weapon', sprite: 'meteoric-sword', equipSlot: 'weapon',
    weight: 2200, value: 500, depthMin: 25, depthMax: 99, damageMin: 11, damageMax: 16, accuracy: 2, materialTier: 'meteoric' },
  { id: 'meteoric-battle-axe', name: 'Meteoric Battle Axe', category: 'weapon', sprite: 'axe-cursed', equipSlot: 'weapon',
    weight: 3500, value: 450, depthMin: 28, depthMax: 99, damageMin: 13, damageMax: 18, accuracy: 1, twoHanded: true, materialTier: 'meteoric' },
  { id: 'meteoric-flail', name: 'Meteoric Flail', category: 'weapon', sprite: 'flail-cursed', equipSlot: 'weapon',
    weight: 3200, value: 420, depthMin: 27, depthMax: 99, damageMin: 12, damageMax: 17, accuracy: 0, materialTier: 'meteoric' },
  { id: 'meteoric-morning-star', name: 'Meteoric Morning Star', category: 'weapon', sprite: 'morning-star-cursed', equipSlot: 'weapon',
    weight: 3500, value: 440, depthMin: 27, depthMax: 99, damageMin: 12, damageMax: 17, accuracy: 1, materialTier: 'meteoric' },
  { id: 'meteoric-two-handed-sword', name: 'Meteoric Two-Handed Sword', category: 'weapon', sprite: 'meteoric-two-handed-sword', equipSlot: 'weapon',
    weight: 4000, value: 600, depthMin: 30, depthMax: 99, damageMin: 16, damageMax: 22, accuracy: 1, twoHanded: true, materialTier: 'meteoric' },
];

const METEORIC_ARMOR: ItemTemplate[] = [
  { id: 'meteoric-plate-mail', name: 'Meteoric Plate Mail', category: 'armor', sprite: 'metal-armour-cursed', equipSlot: 'body',
    weight: 12000, value: 800, depthMin: 28, depthMax: 99, ac: 15, materialTier: 'meteoric' },
  { id: 'meteoric-shield', name: 'Meteoric Steel Shield', category: 'shield', sprite: 'metal-shield-cursed', equipSlot: 'shield',
    weight: 4000, value: 350, depthMin: 26, depthMax: 99, ac: 7, materialTier: 'meteoric' },
  { id: 'meteoric-helm', name: 'Meteoric Helm', category: 'helmet', sprite: 'metal-helmet-cursed', equipSlot: 'helmet',
    weight: 2500, value: 400, depthMin: 26, depthMax: 99, ac: 5, materialTier: 'meteoric' },
  { id: 'meteoric-gloves', name: 'Meteoric Gloves', category: 'gauntlets', sprite: 'gloves-meteoric', equipSlot: 'gauntlets',
    weight: 1000, value: 350, depthMin: 27, depthMax: 99, ac: 4, materialTier: 'meteoric' },
  { id: 'meteoric-boots', name: 'Meteoric Boots', category: 'boots', sprite: 'boots-cursed', equipSlot: 'boots',
    weight: 2000, value: 350, depthMin: 28, depthMax: 99, ac: 4, materialTier: 'meteoric' },
  { id: 'meteoric-cloak', name: 'Meteoric Cloak', category: 'cloak', sprite: 'meteoric-cloak', equipSlot: 'cloak',
    weight: 800, value: 600, depthMin: 26, depthMax: 99, ac: 4, materialTier: 'meteoric' },
  { id: 'meteoric-belt', name: 'Meteoric Belt', category: 'belt', sprite: 'meteoric-belt', equipSlot: 'belt',
    weight: 300, value: 400, depthMin: 26, depthMax: 99, ac: 4, materialTier: 'meteoric' },
  { id: 'meteoric-ring', name: 'Meteoric Ring', category: 'ring', sprite: 'meteoric-ring', equipSlot: 'ringLeft',
    weight: 40, value: 500, depthMin: 26, depthMax: 99, ac: 4, materialTier: 'meteoric' },
  { id: 'meteoric-amulet', name: 'Meteoric Amulet', category: 'amulet', sprite: 'meteoric-amulet', equipSlot: 'amulet',
    weight: 80, value: 600, depthMin: 26, depthMax: 99, ac: 4, materialTier: 'meteoric' },
];

// ── Armor ─────────────────────────────────────────────────

const ARMOR: ItemTemplate[] = [
  { id: 'leather-armor', name: 'Leather Armor', category: 'armor', sprite: 'leather-armour', equipSlot: 'body',
    weight: 5000, value: 30, depthMin: 1, depthMax: 14, ac: 3 },
  { id: 'studded-leather', name: 'Studded Leather', category: 'armor', sprite: 'leather-armour-enchanted', equipSlot: 'body',
    weight: 6000, value: 60, depthMin: 5, depthMax: 20, ac: 5 },
  { id: 'chain-mail', name: 'Chain Mail', category: 'armor', sprite: 'metal-armour', equipSlot: 'body',
    weight: 10000, value: 100, depthMin: 8, depthMax: 26, ac: 7 },
  { id: 'plate-mail', name: 'Plate Mail', category: 'armor', sprite: 'metal-armour-enchanted', equipSlot: 'body',
    weight: 15000, value: 250, depthMin: 14, depthMax: 99, ac: 12 },
];

// ── Shields ───────────────────────────────────────────────

const SHIELDS: ItemTemplate[] = [
  { id: 'small-wood-shield', name: 'Wooden Shield', category: 'shield', sprite: 'wood-shield', equipSlot: 'shield',
    weight: 2000, value: 10, depthMin: 1, depthMax: 16, ac: 1 },
  { id: 'small-iron-shield', name: 'Iron Shield', category: 'shield', sprite: 'metal-shield', equipSlot: 'shield',
    weight: 3000, value: 30, depthMin: 5, depthMax: 99, ac: 3 },
];

// ── Helmets ───────────────────────────────────────────────

const HELMETS: ItemTemplate[] = [
  { id: 'leather-cap', name: 'Leather Cap', category: 'helmet', sprite: 'leather-helmet', equipSlot: 'helmet',
    weight: 500, value: 10, depthMin: 1, depthMax: 14, ac: 1 },
  { id: 'iron-helm', name: 'Iron Helm', category: 'helmet', sprite: 'metal-helmet', equipSlot: 'helmet',
    weight: 1500, value: 30, depthMin: 5, depthMax: 99, ac: 2 },
];

// ── Other Equipment ───────────────────────────────────────

const EQUIPMENT: ItemTemplate[] = [
  { id: 'cloak', name: 'Cloak', category: 'cloak', sprite: 'cloak', equipSlot: 'cloak',
    weight: 1000, value: 15, depthMin: 1, depthMax: 20, ac: 1 },
  { id: 'fine-cloak', name: 'Fine Cloak', category: 'cloak', sprite: 'cloak-enchanted', equipSlot: 'cloak',
    weight: 800, value: 40, depthMin: 10, depthMax: 99, ac: 2 },
  { id: 'leather-gloves', name: 'Leather Gloves', category: 'gauntlets', sprite: 'gloves-leather', equipSlot: 'gauntlets',
    weight: 300, value: 15, depthMin: 2, depthMax: 18, ac: 1 },
  { id: 'iron-gloves', name: 'Iron Gloves', category: 'gauntlets', sprite: 'gloves-iron', equipSlot: 'gauntlets',
    weight: 800, value: 35, depthMin: 10, depthMax: 99, ac: 2 },
  { id: 'leather-boots', name: 'Leather Boots', category: 'boots', sprite: 'boots', equipSlot: 'boots',
    weight: 800, value: 15, depthMin: 1, depthMax: 18, ac: 1 },
  { id: 'iron-boots', name: 'Iron Boots', category: 'boots', sprite: 'boots-enchanted', equipSlot: 'boots',
    weight: 1500, value: 35, depthMin: 10, depthMax: 99, ac: 2 },
  { id: 'belt', name: 'Belt', category: 'belt', sprite: 'belt-leather', equipSlot: 'belt',
    weight: 300, value: 10, depthMin: 1, depthMax: 99, ac: 1 },
  { id: 'ring', name: 'Ring', category: 'ring', sprite: 'ring', equipSlot: 'ringLeft',
    weight: 50, value: 20, depthMin: 5, depthMax: 99, ac: 1 },
  { id: 'amulet', name: 'Amulet', category: 'amulet', sprite: 'amulet-enchanted', equipSlot: 'amulet',
    weight: 100, value: 25, depthMin: 5, depthMax: 99, ac: 1 },
];

// ── Potions ───────────────────────────────────────────────

const POTIONS: ItemTemplate[] = [
  { id: 'potion-heal-minor', name: 'Potion of Minor Healing', category: 'potion', sprite: 'potion-heal-minor',
    weight: 200, value: 15, depthMin: 1, depthMax: 99, healPct: 0.25, healAmount: 8 },
  { id: 'potion-heal-medium', name: 'Potion of Medium Healing', category: 'potion', sprite: 'potion-heal-medium',
    weight: 200, value: 40, depthMin: 5, depthMax: 99, healPct: 0.50, healAmount: 20 },
  { id: 'potion-heal-major', name: 'Potion of Major Healing', category: 'potion', sprite: 'potion-heal-major',
    weight: 200, value: 80, depthMin: 12, depthMax: 99, healPct: 0.75, healAmount: 40 },
  { id: 'potion-gain-str', name: 'Draught of Gain Strength', category: 'potion', sprite: 'potion-gain-attribute',
    weight: 200, value: 200, depthMin: 5, depthMax: 99 },
  { id: 'potion-gain-int', name: 'Draught of Gain Intelligence', category: 'potion', sprite: 'potion-gain-attribute',
    weight: 200, value: 200, depthMin: 5, depthMax: 99 },
  { id: 'potion-gain-con', name: 'Draught of Gain Constitution', category: 'potion', sprite: 'potion-gain-attribute',
    weight: 200, value: 200, depthMin: 5, depthMax: 99 },
  { id: 'potion-gain-dex', name: 'Draught of Gain Dexterity', category: 'potion', sprite: 'potion-gain-attribute',
    weight: 200, value: 200, depthMin: 5, depthMax: 99 },
];

// ── Scrolls ───────────────────────────────────────────────

const SCROLLS: ItemTemplate[] = [
  { id: 'scroll-identify', name: 'Scroll of Identify', category: 'scroll', sprite: 'scroll-identify',
    weight: 50, value: 30, depthMin: 1, depthMax: 99, spellId: 'identify' },
  { id: 'scroll-teleport', name: 'Scroll of Teleport', category: 'scroll', sprite: 'scroll-teleport',
    weight: 50, value: 40, depthMin: 3, depthMax: 99, spellId: 'teleport' },
  { id: 'scroll-rune-of-return', name: 'Scroll of Rune of Return', category: 'scroll', sprite: 'scroll-return',
    weight: 50, value: 60, depthMin: 1, depthMax: 99, spellId: 'rune-of-return' },
];

// ── Spellbooks ────────────────────────────────────────────

// Spellbook-only spells — these are NOT auto-learned on level-up.
// Must find the spellbook as loot and use it (must be identified first).
const SPELLBOOKS: ItemTemplate[] = [
  { id: 'book-levitation', name: 'Spellbook of Levitation', category: 'spellbook', sprite: 'spell-book',
    weight: 500, value: 200, depthMin: 8, depthMax: 99, spellId: 'levitation' },
  { id: 'book-clairvoyance', name: 'Spellbook of Clairvoyance', category: 'spellbook', sprite: 'spell-book',
    weight: 500, value: 250, depthMin: 10, depthMax: 99, spellId: 'clairvoyance' },
  { id: 'book-lightning-bolt', name: 'Spellbook of Lightning Bolt', category: 'spellbook', sprite: 'spell-book',
    weight: 500, value: 300, depthMin: 10, depthMax: 99, spellId: 'lightning-bolt' },
  { id: 'book-fire-bolt', name: 'Spellbook of Fire Bolt', category: 'spellbook', sprite: 'spell-book',
    weight: 500, value: 250, depthMin: 10, depthMax: 99, spellId: 'fire-bolt' },
  { id: 'book-resist-fire', name: 'Spellbook of Resist Fire', category: 'spellbook', sprite: 'spell-book',
    weight: 500, value: 300, depthMin: 12, depthMax: 99, spellId: 'resist-fire' },
  { id: 'book-resist-cold', name: 'Spellbook of Resist Cold', category: 'spellbook', sprite: 'spell-book',
    weight: 500, value: 300, depthMin: 12, depthMax: 99, spellId: 'resist-cold' },
  { id: 'book-resist-lightning', name: 'Spellbook of Resist Lightning', category: 'spellbook', sprite: 'spell-book',
    weight: 500, value: 300, depthMin: 14, depthMax: 99, spellId: 'resist-lightning' },
  { id: 'book-sleep-monster', name: 'Spellbook of Sleep Monster', category: 'spellbook', sprite: 'spell-book',
    weight: 500, value: 250, depthMin: 12, depthMax: 99, spellId: 'sleep-monster' },
  { id: 'book-slow-monster', name: 'Spellbook of Slow Monster', category: 'spellbook', sprite: 'spell-book',
    weight: 500, value: 250, depthMin: 14, depthMax: 99, spellId: 'slow-monster' },
  { id: 'book-cold-ball', name: 'Spellbook of Cold Ball', category: 'spellbook', sprite: 'spell-book',
    weight: 500, value: 400, depthMin: 16, depthMax: 99, spellId: 'cold-ball' },
  { id: 'book-teleport', name: 'Spellbook of Teleport', category: 'spellbook', sprite: 'spell-book',
    weight: 500, value: 400, depthMin: 18, depthMax: 99, spellId: 'teleport' },
  { id: 'book-remove-curse', name: 'Spellbook of Remove Curse', category: 'spellbook', sprite: 'spell-book',
    weight: 500, value: 350, depthMin: 16, depthMax: 99, spellId: 'remove-curse' },
  { id: 'book-ball-lightning', name: 'Spellbook of Ball Lightning', category: 'spellbook', sprite: 'spell-book',
    weight: 500, value: 500, depthMin: 20, depthMax: 99, spellId: 'ball-lightning' },
  { id: 'book-fire-ball', name: 'Spellbook of Fire Ball', category: 'spellbook', sprite: 'spell-book',
    weight: 500, value: 500, depthMin: 20, depthMax: 99, spellId: 'fire-ball' },
  { id: 'book-transmogrify', name: 'Spellbook of Transmogrify', category: 'spellbook', sprite: 'spell-book',
    weight: 500, value: 600, depthMin: 25, depthMax: 99, spellId: 'transmogrify-monster' },
];

// ── Wands ─────────────────────────────────────────────────

const WANDS: ItemTemplate[] = [
  { id: 'wand-fire-bolt', name: 'Wand of Fire Bolt', category: 'wand', sprite: 'wand-of-fire-bolt',
    weight: 200, value: 150, depthMin: 6, depthMax: 99, spellId: 'fire-bolt', charges: 8 },
  { id: 'wand-cold-bolt', name: 'Wand of Cold Bolt', category: 'wand', sprite: 'wand-of-cold-bolt',
    weight: 200, value: 150, depthMin: 6, depthMax: 99, spellId: 'cold-bolt', charges: 8 },
  { id: 'wand-lightning', name: 'Wand of Lightning Bolt', category: 'wand', sprite: 'wand-of-lightning',
    weight: 200, value: 150, depthMin: 8, depthMax: 99, spellId: 'lightning-bolt', charges: 6 },
  { id: 'wand-fire-ball', name: 'Wand of Fire Ball', category: 'wand', sprite: 'wand-of-fire-ball',
    weight: 200, value: 300, depthMin: 14, depthMax: 99, spellId: 'fire-ball', charges: 4 },
  { id: 'wand-cold-ball', name: 'Wand of Cold Ball', category: 'wand', sprite: 'wand-of-cold-ball',
    weight: 200, value: 300, depthMin: 14, depthMax: 99, spellId: 'cold-ball', charges: 4 },
  { id: 'wand-light', name: 'Wand of Light', category: 'wand', sprite: 'wand-of-light',
    weight: 200, value: 80, depthMin: 3, depthMax: 99, spellId: 'light', charges: 10 },
];

// ── Currency ──────────────────────────────────────────────

const CURRENCY: ItemTemplate[] = [
  { id: 'copper-coins', name: 'Gold Coins', category: 'currency', sprite: 'coins-gold',
    weight: 50, value: 0, depthMin: 1, depthMax: 99 },
];

// ── Containers ────────────────────────────────────────────

const CONTAINERS: ItemTemplate[] = [
  { id: 'small-pack', name: 'Small Pack', category: 'container', sprite: 'backpack-small', equipSlot: 'pack',
    weight: 500, value: 20, depthMin: 1, depthMax: 99, weightCapacity: 30000, bulkCapacity: 6000 },
  { id: 'large-pack', name: 'Large Pack', category: 'container', sprite: 'backpack-large', equipSlot: 'pack',
    weight: 800, value: 50, depthMin: 5, depthMax: 99, weightCapacity: 60000, bulkCapacity: 12000 },
  { id: 'pack-of-holding', name: 'Pack of Holding', category: 'container', sprite: 'backpack-enchanted', equipSlot: 'pack',
    weight: 400, value: 500, depthMin: 18, depthMax: 99, weightCapacity: 400000, bulkCapacity: 160000 },
  { id: 'leather-belt', name: 'Fine Belt', category: 'belt', sprite: 'belt-leather-enchanted', equipSlot: 'belt',
    weight: 300, value: 10, depthMin: 1, depthMax: 99, ac: 2 },
  { id: 'purse', name: 'Purse', category: 'container', sprite: 'purse-leather', equipSlot: 'purse',
    weight: 100, value: 5, depthMin: 1, depthMax: 99, weightCapacity: 10000, bulkCapacity: 2000 },
  // Elven tier containers
  { id: 'elven-pack', name: 'Elven Pack', category: 'container', sprite: 'backpack-elven', equipSlot: 'pack',
    weight: 300, value: 250, depthMin: 14, depthMax: 99, weightCapacity: 100000, bulkCapacity: 30000, materialTier: 'elven' },
  { id: 'elven-purse', name: 'Elven Purse', category: 'container', sprite: 'purse-leather-enchanted', equipSlot: 'purse',
    weight: 50, value: 100, depthMin: 14, depthMax: 99, weightCapacity: 20000, bulkCapacity: 6000, materialTier: 'elven' },
  // Meteoric tier containers
  { id: 'meteoric-pack', name: 'Meteoric Pack', category: 'container', sprite: 'backpack-cursed', equipSlot: 'pack',
    weight: 200, value: 600, depthMin: 26, depthMax: 99, weightCapacity: 160000, bulkCapacity: 60000, materialTier: 'meteoric' },
  { id: 'meteoric-purse', name: 'Meteoric Purse', category: 'container', sprite: 'purse-leather-cursed', equipSlot: 'purse',
    weight: 30, value: 300, depthMin: 26, depthMax: 99, weightCapacity: 40000, bulkCapacity: 16000, materialTier: 'meteoric' },
];

// ── Worthless / Flavor Items ───────────────────────────────

const WORTHLESS: ItemTemplate[] = [
  { id: 'blank-scroll', name: 'Blank Scroll', category: 'scroll', sprite: 'scroll',
    weight: 50, value: 2, depthMin: 1, depthMax: 99 },
  { id: 'broken-sword', name: 'Broken Sword', category: 'misc', sprite: 'broken-sword',
    weight: 1000, value: 3, depthMin: 1, depthMax: 99 },
  { id: 'broken-shield', name: 'Broken Shield', category: 'misc', sprite: 'broken-shield',
    weight: 1500, value: 3, depthMin: 1, depthMax: 99 },
  { id: 'broken-helmet', name: 'Broken Helmet', category: 'misc', sprite: 'broken-helmet',
    weight: 800, value: 2, depthMin: 1, depthMax: 99 },
  { id: 'tattered-cloak', name: 'Tattered Cloak', category: 'misc', sprite: 'broken-cloak',
    weight: 400, value: 2, depthMin: 1, depthMax: 99 },
  { id: 'old-boots', name: 'Old Boots', category: 'misc', sprite: 'broken-boot',
    weight: 600, value: 2, depthMin: 1, depthMax: 99 },
  { id: 'dented-armor', name: 'Dented Armor', category: 'misc', sprite: 'broken-armour',
    weight: 2000, value: 3, depthMin: 1, depthMax: 99 },
  { id: 'worn-belt', name: 'Worn Belt', category: 'misc', sprite: 'broken-belt',
    weight: 200, value: 1, depthMin: 1, depthMax: 99 },
  { id: 'torn-pack', name: 'Torn Pack', category: 'misc', sprite: 'backpack-broken',
    weight: 500, value: 2, depthMin: 1, depthMax: 99 },
  { id: 'parchment', name: 'Worn Parchment', category: 'misc', sprite: 'parchment',
    weight: 30, value: 1, depthMin: 1, depthMax: 99 },
];

// ── Unique / Named Items ─────────────────────────────────

const UNIQUE_ITEMS: ItemTemplate[] = [
  // Resist amulets — permanent elemental protection
  { id: 'amulet-fire-ward', name: 'Amulet of Fire Ward', category: 'amulet', sprite: 'amulet-resist-fire', equipSlot: 'amulet',
    weight: 100, value: 400, depthMin: 10, depthMax: 99, ac: 1, unique: true, uniqueAbility: 'resist-fire-75' },
  { id: 'amulet-frost-ward', name: 'Amulet of Frost Ward', category: 'amulet', sprite: 'amulet-resist-cold', equipSlot: 'amulet',
    weight: 100, value: 400, depthMin: 10, depthMax: 99, ac: 1, unique: true, uniqueAbility: 'resist-cold-75' },
  { id: 'amulet-storm-ward', name: 'Amulet of Storm Ward', category: 'amulet', sprite: 'amulet-resist-lightning', equipSlot: 'amulet',
    weight: 100, value: 400, depthMin: 12, depthMax: 99, ac: 1, unique: true, uniqueAbility: 'resist-lightning-75' },
  { id: 'amulet-soul-ward', name: 'Amulet of Soul Ward', category: 'amulet', sprite: 'amulet-resist-drain', equipSlot: 'amulet',
    weight: 100, value: 500, depthMin: 15, depthMax: 99, ac: 1, unique: true, uniqueAbility: 'resist-drain-75' },
  // Unique helmets
  { id: 'helm-of-true-sight', name: 'Helm of True Sight', category: 'helmet', sprite: 'metal-helmet-of-detect-monsters', equipSlot: 'helmet',
    weight: 1800, value: 600, depthMin: 15, depthMax: 99, ac: 3, unique: true, uniqueAbility: 'detect-monsters' },
  { id: 'helm-of-storms', name: 'Helm of Storms', category: 'helmet', sprite: 'metal-helmet-of-storms', equipSlot: 'helmet',
    weight: 2200, value: 800, depthMin: 25, depthMax: 99, ac: 5, unique: true, uniqueAbility: 'lightning-boost' },
  // Unique boots
  { id: 'boots-of-levitation', name: 'Boots of Levitation', category: 'boots', sprite: 'boots-of-levitation', equipSlot: 'boots',
    weight: 800, value: 700, depthMin: 20, depthMax: 99, ac: 3, unique: true, uniqueAbility: 'levitation' },
  // Unique amulets — late game
  { id: 'elemental-keystone', name: 'Elemental Keystone', category: 'amulet', sprite: 'elemental-portal', equipSlot: 'amulet',
    weight: 150, value: 1200, depthMin: 35, depthMax: 99, ac: 2, unique: true, uniqueAbility: 'elemental-immunity' },
  { id: 'crown-of-ancients', name: 'Crown of the Ancients', category: 'amulet', sprite: 'amulet-of-kings', equipSlot: 'amulet',
    weight: 200, value: 2000, depthMin: 40, depthMax: 99, ac: 3, unique: true, uniqueAbility: 'crown-power' },
  // ── New Uniques ───────────────────────────────────────────
  { id: 'ring-of-fortune', name: 'Ring of Fortune', category: 'ring', sprite: 'elven-ring', equipSlot: 'ringLeft',
    weight: 50, value: 500, depthMin: 15, depthMax: 99, ac: 2, unique: true, uniqueAbility: 'fortune-power' },
  { id: 'cloak-of-shadows', name: 'Cloak of Shadows', category: 'cloak', sprite: 'elven-cloak', equipSlot: 'cloak',
    weight: 600, value: 500, depthMin: 15, depthMax: 99, ac: 3, unique: true, uniqueAbility: 'shadow-cloak' },
  { id: 'belt-of-the-titan', name: 'Belt of the Titan', category: 'belt', sprite: 'belt-enchanted', equipSlot: 'belt',
    weight: 400, value: 600, depthMin: 20, depthMax: 99, ac: 3, unique: true, uniqueAbility: 'titan-power' },
  { id: 'blooddrinker', name: 'Blooddrinker', category: 'weapon', sprite: 'meteoric-sword', equipSlot: 'weapon',
    weight: 2500, value: 800, depthMin: 20, depthMax: 99, damageMin: 13, damageMax: 18, accuracy: 3, unique: true, uniqueAbility: 'blooddrinker' },
  { id: 'ring-of-the-archmage', name: 'Ring of the Archmage', category: 'ring', sprite: 'meteoric-ring', equipSlot: 'ringLeft',
    weight: 50, value: 800, depthMin: 25, depthMax: 99, ac: 3, unique: true, uniqueAbility: 'archmage-power' },
  { id: 'aegis-of-the-fallen', name: 'Aegis of the Fallen', category: 'shield', sprite: 'meteoric-shield', equipSlot: 'shield',
    weight: 3000, value: 900, depthMin: 25, depthMax: 99, ac: 8, unique: true, uniqueAbility: 'aegis-power' },
  { id: 'gauntlets-of-the-forge', name: 'Gauntlets of the Forge', category: 'gauntlets', sprite: 'gloves-meteoric', equipSlot: 'gauntlets',
    weight: 1200, value: 800, depthMin: 25, depthMax: 99, ac: 4, unique: true, uniqueAbility: 'forge-power' },
  { id: 'demonhide-armor', name: 'Demonhide Armor', category: 'armor', sprite: 'meteoric-chain-mail', equipSlot: 'body',
    weight: 5000, value: 1500, depthMin: 30, depthMax: 99, ac: 12, unique: true, uniqueAbility: 'demonhide-power' },
  { id: 'worldsplitter', name: 'Worldsplitter', category: 'weapon', sprite: 'meteoric-two-handed-sword', equipSlot: 'weapon',
    weight: 4500, value: 2000, depthMin: 35, depthMax: 99, damageMin: 25, damageMax: 35, accuracy: 2, twoHanded: true, unique: true, uniqueAbility: 'worldsplitter' },
];

// ============================================================
// Exports
// ============================================================

export const ALL_ITEM_TEMPLATES: ItemTemplate[] = [
  ...WEAPONS,
  ...ELVEN_WEAPONS,
  ...ELVEN_ARMOR,
  ...METEORIC_WEAPONS,
  ...METEORIC_ARMOR,
  ...ARMOR,
  ...SHIELDS,
  ...HELMETS,
  ...EQUIPMENT,
  ...POTIONS,
  ...SCROLLS,
  ...SPELLBOOKS,
  ...WANDS,
  ...CURRENCY,
  ...CONTAINERS,
  ...WORTHLESS,
  ...UNIQUE_ITEMS,
];

export const ITEM_BY_ID: Record<string, ItemTemplate> = Object.fromEntries(
  ALL_ITEM_TEMPLATES.map(t => [t.id, t])
);

/**
 * Get item templates that can appear at the given depth.
 * Tier items are weighted higher on deeper floors.
 */
export function getItemsForDepth(depth: number): ItemTemplate[] {
  const available = ALL_ITEM_TEMPLATES.filter(
    t => depth >= t.depthMin && depth <= t.depthMax && t.category !== 'currency'
  );

  // On deeper floors, duplicate tier items in the pool to increase their chance
  // Floor 15+: tier items appear 2x, Floor 25+: 3x, Floor 30+: 4x, Floor 35+: 5x
  if (depth >= 15) {
    const tierItems = available.filter(t => t.materialTier);
    const dupes = depth >= 35 ? 4 : depth >= 30 ? 3 : depth >= 25 ? 2 : 1;
    for (let d = 0; d < dupes; d++) {
      available.push(...tierItems);
    }
  }

  // Stat potions appear 3x in the pool for higher drop rate
  const statPotions = available.filter(t => t.id.startsWith('potion-gain-'));
  available.push(...statPotions, ...statPotions);

  return available;
}
