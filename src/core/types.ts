// ============================================================
// Core type definitions for Castle of the Winds
// ============================================================

export interface Vector2 {
  x: number;
  y: number;
}

export type Direction = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export type Screen =
  | 'splash'
  | 'character-creation'
  | 'game'
  | 'inventory'
  | 'character-info'
  | 'spells'
  | 'map'
  | 'help'
  | 'death';

export type Difficulty = 'easy' | 'intermediate' | 'hard' | 'impossible';

export type Gender = 'male' | 'female';

export type Element = 'cold' | 'fire' | 'lightning' | 'acid' | 'drain';

// ============================================================
// Character
// ============================================================

export interface Attributes {
  strength: number;
  intelligence: number;
  constitution: number;
  dexterity: number;
}

export interface ElementalResistances {
  cold: number;
  fire: number;
  lightning: number;
  acid: number;
  drain: number;
}

export type EquipSlot =
  | 'weapon'
  | 'shield'
  | 'helmet'
  | 'body'
  | 'cloak'
  | 'bracers'
  | 'gauntlets'
  | 'belt'
  | 'boots'
  | 'ringLeft'
  | 'ringRight'
  | 'amulet'
  | 'pack'
  | 'purse';

export interface Equipment {
  weapon: Item | null;
  shield: Item | null;
  helmet: Item | null;
  body: Item | null;
  cloak: Item | null;
  bracers: Item | null;
  gauntlets: Item | null;
  belt: Item | null;
  boots: Item | null;
  ringLeft: Item | null;
  ringRight: Item | null;
  amulet: Item | null;
  pack: Item | null;
  purse: Item | null;
}

export interface StatusEffect {
  id: string;
  name: string;
  turnsRemaining: number;
}

export interface Hero {
  name: string;
  gender: Gender;
  position: Vector2;
  attributes: Attributes;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  xp: number;
  level: number;
  equipment: Equipment;
  inventory: Item[];
  copper: number;
  knownSpells: string[];
  spellHotkeys: string[]; // up to 7 spell IDs for quick-cast slots 1-7
  activeEffects: StatusEffect[];
  resistances: ElementalResistances;
  armorValue: number;
  equipDamageBonus: number;
  equipAccuracyBonus: number;
}

// ============================================================
// Items
// ============================================================

export type ItemCategory =
  | 'weapon'
  | 'armor'
  | 'shield'
  | 'helmet'
  | 'cloak'
  | 'bracers'
  | 'gauntlets'
  | 'belt'
  | 'boots'
  | 'ring'
  | 'amulet'
  | 'potion'
  | 'scroll'
  | 'spellbook'
  | 'wand'
  | 'staff'
  | 'container'
  | 'currency'
  | 'misc';

export interface Item {
  id: string;
  templateId: string;
  name: string;
  category: ItemCategory;
  sprite: string;             // CSS class name
  weight: number;             // grams
  bulk: number;               // cubic cm
  value: number;              // copper pieces
  identified: boolean;
  cursed: boolean;
  enchantment: number;        // +/- modifier
  properties: Record<string, number>;
  contents?: Item[];          // for containers
}

// ============================================================
// Monsters
// ============================================================

export interface Monster {
  id: string;
  templateId: string;
  name: string;
  sprite: string;
  position: Vector2;
  hp: number;
  maxHp: number;
  damage: [number, number];   // [min, max] per hit
  speed: number;
  xpValue: number;
  resistances: ElementalResistances;
  ai: MonsterAI;
  abilities: string[];
  sleeping: boolean;
  slowed: boolean;
  fleeing: number;  // turns remaining in flee mode, 0 = not fleeing
}

export type MonsterAI = 'melee' | 'ranged' | 'caster' | 'thief' | 'summoner';

// ============================================================
// Map / Dungeon
// ============================================================

export type TileType =
  | 'floor'
  | 'wall'
  | 'door-closed'
  | 'door-open'
  | 'door-locked'
  | 'door-secret'
  | 'stairs-up'
  | 'stairs-down'
  | 'water'
  | 'grass'
  | 'path'
  | 'rock'
  | 'building'
  | 'trap';

export interface Tile {
  type: TileType;
  sprite: string;
  walkable: boolean;
  transparent: boolean;       // for line of sight
  trapType?: string;
  trapRevealed?: boolean;
  buildingId?: string;
}

export interface PlacedItem {
  item: Item;
  position: Vector2;
}

export interface Floor {
  id: string;
  tiles: Tile[][];
  monsters: Monster[];
  items: PlacedItem[];
  explored: boolean[][];
  visible: boolean[][];
  lit: boolean[][];         // permanently illuminated tiles (from Light spell)
  width: number;
  height: number;
}

export type DungeonId = 'mine' | 'fortress' | 'castle';

// ============================================================
// Town
// ============================================================

export interface TownState {
  id: string;
  shopInventories: Record<string, Item[]>;
  bankBalance: number;
}

// ============================================================
// Messages
// ============================================================

export type MessageSeverity = 'normal' | 'important' | 'combat' | 'system';

export interface Message {
  text: string;
  severity: MessageSeverity;
  turn: number;
}

// ============================================================
// Game State
// ============================================================

export interface GameState {
  screen: Screen;
  hero: Hero;
  currentFloor: number;
  currentDungeon: DungeonId;
  floors: Record<string, Floor>;  // key: "dungeonId-floorNum"
  town: TownState;
  messages: Message[];
  turn: number;
  gameTime: number;               // in-game seconds
  difficulty: Difficulty;
  rngSeed: number;
}

// ============================================================
// Actions
// ============================================================

export type GameAction =
  | { type: 'move'; direction: Direction }
  | { type: 'castSpell'; spellId: string; direction?: Direction; target?: Vector2 }
  | { type: 'pickupItem' }
  | { type: 'useStairs' }
  | { type: 'rest' }
  | { type: 'search' }
  | { type: 'useItem'; itemId: string }
  | { type: 'equipItem'; itemId: string }
  | { type: 'unequipItem'; slot: EquipSlot }
  | { type: 'dropItem'; itemId: string }
  | { type: 'enterBuilding'; buildingId: string }
  | { type: 'buyItem'; shopId: string; itemId: string }
  | { type: 'sellItem'; shopId: string; itemId: string }
  | { type: 'save' }
  | { type: 'load' }
  | { type: 'newGame' }
  | { type: 'setScreen'; screen: Screen };
