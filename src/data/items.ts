// ============================================================
// Item Database — Castle of the Winds
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
}

// ── Weapons ───────────────────────────────────────────────

const WEAPONS: ItemTemplate[] = [
  { id: 'club', name: 'Club', category: 'weapon', sprite: 'club', equipSlot: 'weapon',
    weight: 1500, value: 5, depthMin: 1, depthMax: 8, damageMin: 1, damageMax: 4, accuracy: 0 },
  { id: 'dagger', name: 'Dagger', category: 'weapon', sprite: 'sword', equipSlot: 'weapon',
    weight: 500, value: 10, depthMin: 1, depthMax: 10, damageMin: 1, damageMax: 5, accuracy: 1 },
  { id: 'spear', name: 'Spear', category: 'weapon', sprite: 'spear', equipSlot: 'weapon',
    weight: 2500, value: 15, depthMin: 2, depthMax: 12, damageMin: 2, damageMax: 6, accuracy: 0 },
  { id: 'hand-axe', name: 'Hand Axe', category: 'weapon', sprite: 'axe', equipSlot: 'weapon',
    weight: 2000, value: 20, depthMin: 3, depthMax: 14, damageMin: 2, damageMax: 7, accuracy: 0 },
  { id: 'hammer', name: 'Hammer', category: 'weapon', sprite: 'hammer', equipSlot: 'weapon',
    weight: 2500, value: 20, depthMin: 3, depthMax: 14, damageMin: 2, damageMax: 8, accuracy: -1 },
  { id: 'mace', name: 'Mace', category: 'weapon', sprite: 'mace', equipSlot: 'weapon',
    weight: 3000, value: 30, depthMin: 5, depthMax: 18, damageMin: 3, damageMax: 8, accuracy: 0 },
  { id: 'short-sword', name: 'Short Sword', category: 'weapon', sprite: 'sword', equipSlot: 'weapon',
    weight: 1500, value: 35, depthMin: 5, depthMax: 18, damageMin: 2, damageMax: 8, accuracy: 1 },
  { id: 'flail', name: 'Flail', category: 'weapon', sprite: 'flail', equipSlot: 'weapon',
    weight: 3000, value: 40, depthMin: 7, depthMax: 22, damageMin: 3, damageMax: 10, accuracy: -1 },
  { id: 'axe', name: 'Axe', category: 'weapon', sprite: 'axe', equipSlot: 'weapon',
    weight: 3000, value: 45, depthMin: 8, depthMax: 24, damageMin: 3, damageMax: 10, accuracy: 0 },
  { id: 'war-hammer', name: 'War Hammer', category: 'weapon', sprite: 'hammer', equipSlot: 'weapon',
    weight: 3500, value: 50, depthMin: 10, depthMax: 26, damageMin: 4, damageMax: 11, accuracy: -1 },
  { id: 'long-sword', name: 'Long Sword', category: 'weapon', sprite: 'sword', equipSlot: 'weapon',
    weight: 2000, value: 60, depthMin: 10, depthMax: 28, damageMin: 3, damageMax: 11, accuracy: 1 },
  { id: 'morning-star', name: 'Morning Star', category: 'weapon', sprite: 'morning-star', equipSlot: 'weapon',
    weight: 4000, value: 55, depthMin: 12, depthMax: 28, damageMin: 4, damageMax: 12, accuracy: 0 },
  { id: 'battle-axe', name: 'Battle Axe', category: 'weapon', sprite: 'axe', equipSlot: 'weapon',
    weight: 4000, value: 70, depthMin: 14, depthMax: 32, damageMin: 4, damageMax: 13, accuracy: 0, twoHanded: true },
  { id: 'broad-sword', name: 'Broad Sword', category: 'weapon', sprite: 'sword', equipSlot: 'weapon',
    weight: 2500, value: 80, depthMin: 16, depthMax: 34, damageMin: 4, damageMax: 13, accuracy: 1 },
  { id: 'bastard-sword', name: 'Bastard Sword', category: 'weapon', sprite: 'sword-enchanted', equipSlot: 'weapon',
    weight: 3000, value: 100, depthMin: 20, depthMax: 38, damageMin: 5, damageMax: 15, accuracy: 1 },
  { id: 'two-handed-sword', name: 'Two-Handed Sword', category: 'weapon', sprite: 'sword-enchanted', equipSlot: 'weapon',
    weight: 4500, value: 120, depthMin: 24, depthMax: 99, damageMin: 6, damageMax: 18, accuracy: 0, twoHanded: true },
];

// ── Elven Weapons ─────────────────────────────────────────

const ELVEN_WEAPONS: ItemTemplate[] = [
  { id: 'elven-long-sword', name: 'Elven Long Sword', category: 'weapon', sprite: 'sword-enchanted', equipSlot: 'weapon',
    weight: 1500, value: 200, depthMin: 15, depthMax: 99, damageMin: 4, damageMax: 12, accuracy: 3, materialTier: 'elven' },
  { id: 'elven-dagger', name: 'Elven Dagger', category: 'weapon', sprite: 'sword', equipSlot: 'weapon',
    weight: 300, value: 120, depthMin: 12, depthMax: 99, damageMin: 2, damageMax: 8, accuracy: 4, materialTier: 'elven' },
  { id: 'elven-spear', name: 'Elven Spear', category: 'weapon', sprite: 'spear-enchanted', equipSlot: 'weapon',
    weight: 1800, value: 150, depthMin: 14, depthMax: 99, damageMin: 3, damageMax: 10, accuracy: 3, materialTier: 'elven' },
  { id: 'elven-mace', name: 'Elven Mace', category: 'weapon', sprite: 'mace-enchanted', equipSlot: 'weapon',
    weight: 2200, value: 180, depthMin: 14, depthMax: 99, damageMin: 4, damageMax: 11, accuracy: 2, materialTier: 'elven' },
  { id: 'elven-axe', name: 'Elven Axe', category: 'weapon', sprite: 'axe-enchanted', equipSlot: 'weapon',
    weight: 2200, value: 190, depthMin: 15, depthMax: 99, damageMin: 4, damageMax: 12, accuracy: 2, materialTier: 'elven' },
  { id: 'elven-hammer', name: 'Elven Hammer', category: 'weapon', sprite: 'hammer-enchanted', equipSlot: 'weapon',
    weight: 2500, value: 175, depthMin: 14, depthMax: 99, damageMin: 5, damageMax: 13, accuracy: 1, materialTier: 'elven' },
];

const ELVEN_ARMOR: ItemTemplate[] = [
  { id: 'elven-chain-mail', name: 'Elven Chain Mail', category: 'armor', sprite: 'metal-armour-enchanted', equipSlot: 'body',
    weight: 6000, value: 300, depthMin: 16, depthMax: 99, ac: 8, materialTier: 'elven' },
  { id: 'elven-shield', name: 'Elven Shield', category: 'shield', sprite: 'metal-shield-enchanted', equipSlot: 'shield',
    weight: 2500, value: 180, depthMin: 14, depthMax: 99, ac: 4, materialTier: 'elven' },
  { id: 'elven-helmet', name: 'Elven Helmet', category: 'helmet', sprite: 'metal-helmet-enchanted', equipSlot: 'helmet',
    weight: 1000, value: 120, depthMin: 14, depthMax: 99, ac: 3, materialTier: 'elven' },
  { id: 'elven-bracers', name: 'Elven Bracers', category: 'bracers', sprite: 'bracers-enchanted', equipSlot: 'bracers',
    weight: 600, value: 300, depthMin: 14, depthMax: 99, ac: 3, materialTier: 'elven' },
  { id: 'elven-boots', name: 'Elven Boots', category: 'boots', sprite: 'boots-enchanted', equipSlot: 'boots',
    weight: 700, value: 400, depthMin: 13, depthMax: 99, ac: 2, materialTier: 'elven' },
  { id: 'elven-cloak', name: 'Elven Cloak', category: 'cloak', sprite: 'cloak-enchanted', equipSlot: 'cloak',
    weight: 600, value: 500, depthMin: 15, depthMax: 99, ac: 3, materialTier: 'elven' },
];

// ── Meteoric Steel Weapons & Armor ────────────────────────

const METEORIC_WEAPONS: ItemTemplate[] = [
  { id: 'meteoric-long-sword', name: 'Meteoric Steel Long Sword', category: 'weapon', sprite: 'sword-enchanted', equipSlot: 'weapon',
    weight: 2200, value: 500, depthMin: 25, depthMax: 99, damageMin: 6, damageMax: 16, accuracy: 2, materialTier: 'meteoric' },
  { id: 'meteoric-battle-axe', name: 'Meteoric Battle Axe', category: 'weapon', sprite: 'axe-enchanted', equipSlot: 'weapon',
    weight: 3500, value: 450, depthMin: 28, depthMax: 99, damageMin: 7, damageMax: 18, accuracy: 1, twoHanded: true, materialTier: 'meteoric' },
  { id: 'meteoric-war-hammer', name: 'Meteoric War Hammer', category: 'weapon', sprite: 'hammer-enchanted', equipSlot: 'weapon',
    weight: 3000, value: 400, depthMin: 26, depthMax: 99, damageMin: 6, damageMax: 16, accuracy: 0, materialTier: 'meteoric' },
  { id: 'meteoric-flail', name: 'Meteoric Flail', category: 'weapon', sprite: 'flail-enchanted', equipSlot: 'weapon',
    weight: 3200, value: 420, depthMin: 27, depthMax: 99, damageMin: 6, damageMax: 17, accuracy: 0, materialTier: 'meteoric' },
  { id: 'meteoric-morning-star', name: 'Meteoric Morning Star', category: 'weapon', sprite: 'morning-star-enchanted', equipSlot: 'weapon',
    weight: 3500, value: 440, depthMin: 27, depthMax: 99, damageMin: 7, damageMax: 17, accuracy: 1, materialTier: 'meteoric' },
  { id: 'meteoric-two-handed-sword', name: 'Meteoric Two-Handed Sword', category: 'weapon', sprite: 'sword-enchanted', equipSlot: 'weapon',
    weight: 4000, value: 600, depthMin: 30, depthMax: 99, damageMin: 8, damageMax: 22, accuracy: 1, twoHanded: true, materialTier: 'meteoric' },
];

const METEORIC_ARMOR: ItemTemplate[] = [
  { id: 'meteoric-plate-mail', name: 'Meteoric Plate Mail', category: 'armor', sprite: 'metal-armour-enchanted', equipSlot: 'body',
    weight: 12000, value: 800, depthMin: 28, depthMax: 99, ac: 15, materialTier: 'meteoric' },
  { id: 'meteoric-shield', name: 'Meteoric Steel Shield', category: 'shield', sprite: 'metal-shield-enchanted', equipSlot: 'shield',
    weight: 4000, value: 350, depthMin: 26, depthMax: 99, ac: 7, materialTier: 'meteoric' },
  { id: 'meteoric-helm', name: 'Meteoric Helm', category: 'helmet', sprite: 'metal-helmet-enchanted', equipSlot: 'helmet',
    weight: 2500, value: 400, depthMin: 26, depthMax: 99, ac: 5, materialTier: 'meteoric' },
  { id: 'meteoric-gauntlets', name: 'Meteoric Gauntlets', category: 'gauntlets', sprite: 'gauntlet-enchanted', equipSlot: 'gauntlets',
    weight: 1200, value: 350, depthMin: 27, depthMax: 99, ac: 4, materialTier: 'meteoric' },
  { id: 'meteoric-boots', name: 'Meteoric Boots', category: 'boots', sprite: 'boots-enchanted', equipSlot: 'boots',
    weight: 2000, value: 350, depthMin: 28, depthMax: 99, ac: 4, materialTier: 'meteoric' },
];

// ── Armor ─────────────────────────────────────────────────

const ARMOR: ItemTemplate[] = [
  { id: 'leather-armor', name: 'Leather Armor', category: 'armor', sprite: 'leather-armour', equipSlot: 'body',
    weight: 5000, value: 30, depthMin: 1, depthMax: 14, ac: 3 },
  { id: 'studded-leather', name: 'Studded Leather', category: 'armor', sprite: 'leather-armour-enchanted', equipSlot: 'body',
    weight: 6000, value: 60, depthMin: 5, depthMax: 20, ac: 5 },
  { id: 'chain-mail', name: 'Chain Mail', category: 'armor', sprite: 'metal-armour', equipSlot: 'body',
    weight: 10000, value: 100, depthMin: 8, depthMax: 26, ac: 7 },
  { id: 'splint-mail', name: 'Splint Mail', category: 'armor', sprite: 'metal-armour', equipSlot: 'body',
    weight: 12000, value: 150, depthMin: 14, depthMax: 32, ac: 9 },
  { id: 'plate-mail', name: 'Plate Mail', category: 'armor', sprite: 'metal-armour-enchanted', equipSlot: 'body',
    weight: 15000, value: 250, depthMin: 20, depthMax: 99, ac: 12 },
];

// ── Shields ───────────────────────────────────────────────

const SHIELDS: ItemTemplate[] = [
  { id: 'small-wood-shield', name: 'Small Wooden Shield', category: 'shield', sprite: 'wood-shield', equipSlot: 'shield',
    weight: 2000, value: 10, depthMin: 1, depthMax: 12, ac: 1 },
  { id: 'medium-wood-shield', name: 'Medium Wooden Shield', category: 'shield', sprite: 'wood-shield', equipSlot: 'shield',
    weight: 3000, value: 20, depthMin: 3, depthMax: 16, ac: 2 },
  { id: 'small-iron-shield', name: 'Small Iron Shield', category: 'shield', sprite: 'metal-shield', equipSlot: 'shield',
    weight: 3000, value: 30, depthMin: 5, depthMax: 20, ac: 2 },
  { id: 'medium-iron-shield', name: 'Medium Iron Shield', category: 'shield', sprite: 'metal-shield', equipSlot: 'shield',
    weight: 4000, value: 50, depthMin: 8, depthMax: 26, ac: 3 },
  { id: 'large-steel-shield', name: 'Large Steel Shield', category: 'shield', sprite: 'metal-shield-enchanted', equipSlot: 'shield',
    weight: 5000, value: 80, depthMin: 14, depthMax: 99, ac: 5 },
];

// ── Helmets ───────────────────────────────────────────────

const HELMETS: ItemTemplate[] = [
  { id: 'leather-cap', name: 'Leather Cap', category: 'helmet', sprite: 'leather-helmet', equipSlot: 'helmet',
    weight: 500, value: 10, depthMin: 1, depthMax: 14, ac: 1 },
  { id: 'iron-helm', name: 'Iron Helm', category: 'helmet', sprite: 'metal-helmet', equipSlot: 'helmet',
    weight: 1500, value: 30, depthMin: 5, depthMax: 24, ac: 2 },
  { id: 'steel-helm', name: 'Steel Helm', category: 'helmet', sprite: 'metal-helmet-enchanted', equipSlot: 'helmet',
    weight: 2000, value: 60, depthMin: 12, depthMax: 99, ac: 3 },
];

// ── Other Equipment ───────────────────────────────────────

const EQUIPMENT: ItemTemplate[] = [
  { id: 'cloak', name: 'Cloak', category: 'cloak', sprite: 'cloak', equipSlot: 'cloak',
    weight: 1000, value: 15, depthMin: 1, depthMax: 20, ac: 1 },
  { id: 'fine-cloak', name: 'Fine Cloak', category: 'cloak', sprite: 'cloak-enchanted', equipSlot: 'cloak',
    weight: 800, value: 40, depthMin: 10, depthMax: 99, ac: 2 },
  { id: 'leather-bracers', name: 'Leather Bracers', category: 'bracers', sprite: 'bracers', equipSlot: 'bracers',
    weight: 500, value: 15, depthMin: 2, depthMax: 18, ac: 1 },
  { id: 'iron-bracers', name: 'Iron Bracers', category: 'bracers', sprite: 'bracers-enchanted', equipSlot: 'bracers',
    weight: 1000, value: 35, depthMin: 10, depthMax: 99, ac: 2 },
  { id: 'leather-gauntlets', name: 'Leather Gauntlets', category: 'gauntlets', sprite: 'gauntlet', equipSlot: 'gauntlets',
    weight: 400, value: 15, depthMin: 2, depthMax: 18, ac: 1 },
  { id: 'iron-gauntlets', name: 'Iron Gauntlets', category: 'gauntlets', sprite: 'gauntlet-enchanted', equipSlot: 'gauntlets',
    weight: 800, value: 35, depthMin: 10, depthMax: 99, ac: 2 },
  { id: 'leather-boots', name: 'Leather Boots', category: 'boots', sprite: 'boots', equipSlot: 'boots',
    weight: 800, value: 15, depthMin: 1, depthMax: 18, ac: 1 },
  { id: 'iron-boots', name: 'Iron Boots', category: 'boots', sprite: 'boots', equipSlot: 'boots',
    weight: 1500, value: 35, depthMin: 10, depthMax: 99, ac: 2 },
  { id: 'belt', name: 'Belt', category: 'belt', sprite: 'belt', equipSlot: 'belt',
    weight: 300, value: 10, depthMin: 1, depthMax: 99, ac: 0 },
  { id: 'ring', name: 'Ring', category: 'ring', sprite: 'ring', equipSlot: 'ringLeft',
    weight: 50, value: 20, depthMin: 5, depthMax: 99, ac: 0 },
  { id: 'amulet', name: 'Amulet', category: 'amulet', sprite: 'amulet', equipSlot: 'amulet',
    weight: 100, value: 25, depthMin: 5, depthMax: 99, ac: 0 },
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
    weight: 200, value: 200, depthMin: 10, depthMax: 99 },
  { id: 'potion-gain-int', name: 'Draught of Gain Intelligence', category: 'potion', sprite: 'potion-gain-attribute',
    weight: 200, value: 200, depthMin: 10, depthMax: 99 },
  { id: 'potion-gain-con', name: 'Draught of Gain Constitution', category: 'potion', sprite: 'potion-gain-attribute',
    weight: 200, value: 200, depthMin: 10, depthMax: 99 },
  { id: 'potion-gain-dex', name: 'Draught of Gain Dexterity', category: 'potion', sprite: 'potion-gain-attribute',
    weight: 200, value: 200, depthMin: 10, depthMax: 99 },
];

// ── Scrolls ───────────────────────────────────────────────

const SCROLLS: ItemTemplate[] = [
  { id: 'scroll-identify', name: 'Scroll of Identify', category: 'scroll', sprite: 'scroll',
    weight: 50, value: 30, depthMin: 1, depthMax: 99, spellId: 'identify' },
  { id: 'scroll-teleport', name: 'Scroll of Teleport', category: 'scroll', sprite: 'scroll',
    weight: 50, value: 40, depthMin: 3, depthMax: 99, spellId: 'teleport' },
  { id: 'scroll-remove-curse', name: 'Scroll of Remove Curse', category: 'scroll', sprite: 'scroll',
    weight: 50, value: 50, depthMin: 5, depthMax: 99, spellId: 'remove-curse' },
  { id: 'scroll-rune-of-return', name: 'Scroll of Rune of Return', category: 'scroll', sprite: 'scroll',
    weight: 50, value: 60, depthMin: 1, depthMax: 99, spellId: 'rune-of-return' },
];

// ── Spellbooks ────────────────────────────────────────────

const SPELLBOOKS: ItemTemplate[] = [
  { id: 'book-heal-medium', name: 'Spellbook of Heal Medium Wounds', category: 'spellbook', sprite: 'spell-book',
    weight: 500, value: 200, depthMin: 8, depthMax: 99, spellId: 'heal-medium-wounds' },
  { id: 'book-fire-bolt', name: 'Spellbook of Fire Bolt', category: 'spellbook', sprite: 'spell-book',
    weight: 500, value: 250, depthMin: 10, depthMax: 99, spellId: 'fire-bolt' },
  { id: 'book-shield', name: 'Spellbook of Shield', category: 'spellbook', sprite: 'spell-book',
    weight: 500, value: 200, depthMin: 6, depthMax: 99, spellId: 'shield' },
  { id: 'book-teleport', name: 'Spellbook of Teleport', category: 'spellbook', sprite: 'spell-book',
    weight: 500, value: 300, depthMin: 12, depthMax: 99, spellId: 'teleport' },
  { id: 'book-heal-major', name: 'Spellbook of Heal Major Wounds', category: 'spellbook', sprite: 'spell-book',
    weight: 500, value: 400, depthMin: 15, depthMax: 99, spellId: 'heal-major-wounds' },
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
  { id: 'small-pack', name: 'Small Pack', category: 'container', sprite: 'bag', equipSlot: 'pack',
    weight: 500, value: 20, depthMin: 1, depthMax: 99, weightCapacity: 15000, bulkCapacity: 3000 },
  { id: 'large-pack', name: 'Large Pack', category: 'container', sprite: 'pack', equipSlot: 'pack',
    weight: 800, value: 50, depthMin: 5, depthMax: 99, weightCapacity: 30000, bulkCapacity: 6000 },
  { id: 'pack-of-holding', name: 'Pack of Holding', category: 'container', sprite: 'pack-enchanted', equipSlot: 'pack',
    weight: 400, value: 500, depthMin: 18, depthMax: 99, weightCapacity: 100000, bulkCapacity: 50000 },
  { id: 'leather-belt', name: 'Leather Belt', category: 'belt', sprite: 'belt', equipSlot: 'belt',
    weight: 300, value: 10, depthMin: 1, depthMax: 99, ac: 0 },
  { id: 'belt-of-wands', name: 'Belt of Wand Quiver', category: 'belt', sprite: 'belt-wand-quiver', equipSlot: 'belt',
    weight: 400, value: 40, depthMin: 8, depthMax: 99, ac: 0, weightCapacity: 2000, bulkCapacity: 500 },
  { id: 'purse', name: 'Purse', category: 'container', sprite: 'purse', equipSlot: 'purse',
    weight: 100, value: 5, depthMin: 1, depthMax: 99, weightCapacity: 5000, bulkCapacity: 1000 },
  // Elven tier containers
  { id: 'elven-pack', name: 'Elven Pack', category: 'container', sprite: 'pack-enchanted', equipSlot: 'pack',
    weight: 300, value: 250, depthMin: 14, depthMax: 99, weightCapacity: 50000, bulkCapacity: 15000, materialTier: 'elven' },
  { id: 'elven-purse', name: 'Elven Purse', category: 'container', sprite: 'purse', equipSlot: 'purse',
    weight: 50, value: 100, depthMin: 14, depthMax: 99, weightCapacity: 10000, bulkCapacity: 3000, materialTier: 'elven' },
  // Meteoric tier containers
  { id: 'meteoric-pack', name: 'Meteoric Pack', category: 'container', sprite: 'pack-enchanted', equipSlot: 'pack',
    weight: 200, value: 600, depthMin: 26, depthMax: 99, weightCapacity: 80000, bulkCapacity: 30000, materialTier: 'meteoric' },
  { id: 'meteoric-purse', name: 'Meteoric Purse', category: 'container', sprite: 'purse', equipSlot: 'purse',
    weight: 30, value: 300, depthMin: 26, depthMax: 99, weightCapacity: 20000, bulkCapacity: 8000, materialTier: 'meteoric' },
];

// ── Worthless / Flavor Items ───────────────────────────────

const WORTHLESS: ItemTemplate[] = [
  { id: 'ring-adornment', name: 'Ring of Adornment', category: 'ring', sprite: 'ring', equipSlot: 'ringLeft',
    weight: 50, value: 5, depthMin: 1, depthMax: 99, ac: 0 },
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
  { id: 'apple', name: 'Apple', category: 'misc', sprite: 'apple',
    weight: 150, value: 1, depthMin: 1, depthMax: 99 },
  { id: 'parchment', name: 'Worn Parchment', category: 'misc', sprite: 'parchment',
    weight: 30, value: 1, depthMin: 1, depthMax: 99 },
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

  return available;
}
