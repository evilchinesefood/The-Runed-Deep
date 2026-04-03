// ============================================================
// Core type definitions for The Runed Deep
// ============================================================

export interface Vector2 {
  x: number;
  y: number;
}

export type Direction = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export type Screen =
  | "splash"
  | "intro"
  | "character-creation"
  | "game"
  | "inventory"
  | "character-info"
  | "spells"
  | "map"
  | "help"
  | "shop"
  | "service"
  | "victory"
  | "death"
  | "achievements"
  | "rift-menu"
  | "rift-summary";

export type Difficulty =
  | "normal"
  | "intermediate"
  | "hard"
  | "nightmare"
  | "impossible";

export type Gender = "male" | "female";

export type Element = "cold" | "fire" | "lightning" | "acid" | "drain";

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
  | "weapon"
  | "shield"
  | "helmet"
  | "body"
  | "cloak"
  | "gauntlets"
  | "belt"
  | "boots"
  | "ringLeft"
  | "ringRight"
  | "amulet"
  | "pack";

export interface Equipment {
  weapon: Item | null;
  shield: Item | null;
  helmet: Item | null;
  body: Item | null;
  cloak: Item | null;
  gauntlets: Item | null;
  belt: Item | null;
  boots: Item | null;
  ringLeft: Item | null;
  ringRight: Item | null;
  amulet: Item | null;
  pack: Item | null;
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
  gold: number;
  knownSpells: string[];
  spellHotkeys: string[]; // up to 5 spell IDs for quick-cast slots 1-5
  activeEffects: StatusEffect[];
  resistances: ElementalResistances;
  armorValue: number;
  equipDamageBonus: number;
  equipAccuracyBonus: number;
  runeShards: number;
}

// ============================================================
// Items
// ============================================================

export type ItemCategory =
  | "weapon"
  | "armor"
  | "shield"
  | "helmet"
  | "cloak"
  | "gauntlets"
  | "belt"
  | "boots"
  | "ring"
  | "amulet"
  | "potion"
  | "spellbook"
  | "staff"
  | "container"
  | "currency"
  | "misc";

export interface Item {
  id: string;
  templateId: string;
  name: string;
  category: ItemCategory;
  sprite: string; // CSS class name
  weight: number; // grams
  bulk: number; // cubic cm
  value: number; // copper pieces
  identified: boolean;
  cursed: boolean;
  blessed?: boolean; // set when curse is removed at temple
  enchantment: number; // +/- modifier
  properties: Record<string, number>;
  contents?: Item[]; // for containers
  specialEnchantments?: string[]; // e.g. ['vampiric', 'might', 'regeneration']
  markedForSale?: boolean;
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
  damage: [number, number]; // [min, max] per hit
  speed: number;
  xpValue: number;
  resistances: ElementalResistances;
  ai: MonsterAI;
  abilities: string[];
  armor: number;
  sleeping: boolean;
  slowed: boolean;
  fleeing: number; // turns remaining in flee mode, 0 = not fleeing
  hasFled: boolean; // true after first flee — won't flee again
  bled: boolean; // has already left a blood splatter
  alerted: boolean; // runtime only — pathfinds toward player even without LOS
}

export type MonsterAI =
  | "melee"
  | "ranged"
  | "caster"
  | "thief"
  | "summoner"
  | "stationary";

// ============================================================
// Map / Dungeon
// ============================================================

export type TileType =
  | "floor"
  | "wall"
  | "door-closed"
  | "door-open"
  | "door-locked"
  | "door-secret"
  | "stairs-up"
  | "stairs-down"
  | "water"
  | "grass"
  | "path"
  | "rock"
  | "building"
  | "trap"
  | "decor";

export interface Tile {
  type: TileType;
  sprite: string;
  walkable: boolean;
  transparent: boolean; // for line of sight
  trapType?: string;
  trapRevealed?: boolean;
  buildingId?: string;
  rotate?: number;
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
  decals: Vector2[]; // permanent blood splatters
  explored: boolean[][];
  visible: boolean[][];
  lit: boolean[][]; // permanently illuminated tiles (from Light spell)
  width: number;
  height: number;
}

export type DungeonId = "mine" | "fortress" | "castle" | "town" | "rift";

// ============================================================
// Fractured Rift
// ============================================================

export interface RiftModifier {
  id: string;
  name: string;
  description: string;
  weight: number; // difficulty weight: positive = harder, negative = easier
}

export interface RiftOffering {
  seed: number;
  modifiers: RiftModifier[];
  rerollCount: number;
}

export interface RiftState {
  seed: number;
  modifiers: RiftModifier[];
  currentFloor: number;
  totalFloors: number;
  shardsEarned: number;
}

// ============================================================
// Town
// ============================================================

export interface TownState {
  id: string;
  shopInventories: Record<string, Item[]>;
  bankBalance: number; // deprecated — kept for save compat
  deepestFloor: number;
}

// ============================================================
// Messages
// ============================================================

export type MessageSeverity = "normal" | "important" | "combat" | "system";

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
  floors: Record<string, Floor>; // key: "dungeonId-floorNum"
  town: TownState;
  messages: Message[];
  turn: number;
  gameTime: number; // in-game seconds
  difficulty: Difficulty;
  rngSeed: number;
  returnFloor: number;
  activeBuildingId: string;
  ngPlusCount: number;
  stash: Item[];
  riftStoneUnlocked: boolean;
  riftOffering: RiftOffering | null;
  activeRift: RiftState | null;
}

// ============================================================
// Actions
// ============================================================

export type GameAction =
  | { type: "move"; direction: Direction }
  | {
      type: "castSpell";
      spellId: string;
      direction?: Direction;
      target?: Vector2;
    }
  | { type: "pickupItem" }
  | { type: "useStairs" }
  | { type: "contextAction" }
  | { type: "rest" }
  | { type: "search" }
  | { type: "useItem"; itemId: string }
  | { type: "useAllItems"; templateId: string }
  | { type: "equipItem"; itemId: string }
  | { type: "unequipItem"; slot: EquipSlot }
  | { type: "dropItem"; itemId: string }
  | { type: "enterBuilding" }
  | { type: "buyItem"; shopId: string; itemId: string }
  | { type: "sellItem"; shopId: string; itemId: string }
  | { type: "save" }
  | { type: "load" }
  | { type: "newGame" }
  | { type: "toggleMarkForSale"; itemId: string }
  | { type: "removeCurseItem"; itemId: string }
  | { type: "setScreen"; screen: Screen }
  | { type: "enterRift" }
  | { type: "exitRift" }
  | { type: "rerollRift" }
  | { type: "openRiftMenu" }
  | { type: "riftComplete" };
