import type { Floor, Tile, Monster, PlacedItem, Item } from "../../core/types";
import { SPELLS } from "../../data/spells";
import { ALL_ITEM_TEMPLATES } from "../../data/items";
import { createItemFromTemplate } from "../items/loot";

const W = 40;
const H = 30;

function wall(): Tile {
  return {
    type: "wall",
    sprite: "wall-brick_gray0",
    walkable: false,
    transparent: false,
  };
}
function floor(): Tile {
  return {
    type: "floor",
    sprite: "floor-grey_dirt0",
    walkable: true,
    transparent: true,
  };
}

let monsterId = 1;
function makeMonster(
  templateId: string,
  name: string,
  sprite: string,
  x: number,
  y: number,
  hp: number,
  dmg: [number, number],
  xp: number,
): Monster {
  return {
    id: `test-m-${monsterId++}`,
    templateId,
    name,
    sprite,
    position: { x, y },
    hp,
    maxHp: hp,
    damage: dmg,
    speed: 0.5,
    xpValue: xp,
    resistances: { cold: 0, fire: 0, lightning: 0, acid: 0, drain: 0 },
    ai: "melee",
    armor: 0,
    abilities: [],
    sleeping: false,
    slowed: false,
    fleeing: 0,
    hasFled: false,
    bled: false,
    alerted: false,
  };
}

export function generateTestFloor(): {
  floor: Floor;
  playerStart: { x: number; y: number };
} {
  monsterId = 1;

  // Build tiles — big open room with walls around edge
  const tiles: Tile[][] = [];
  const explored: boolean[][] = [];
  const visible: boolean[][] = [];
  const lit: boolean[][] = [];

  for (let y = 0; y < H; y++) {
    tiles[y] = [];
    explored[y] = [];
    visible[y] = [];
    lit[y] = [];
    for (let x = 0; x < W; x++) {
      const isEdge = x === 0 || x === W - 1 || y === 0 || y === H - 1;
      tiles[y][x] = isEdge ? wall() : floor();
      explored[y][x] = true; // All pre-explored
      visible[y][x] = false;
      lit[y][x] = false;
    }
  }

  // Add some internal walls for testing LOS / Light
  for (let y = 8; y <= 14; y++) tiles[y][15] = wall();
  for (let x = 20; x <= 28; x++) tiles[10][x] = wall();
  // Small enclosed room (top-right) for Light testing
  for (let x = 30; x <= 37; x++) {
    tiles[3][x] = wall();
    tiles[8][x] = wall();
  }
  for (let y = 3; y <= 8; y++) {
    tiles[y][30] = wall();
    tiles[y][37] = wall();
  }
  tiles[5][30] = floor(); // doorway

  // Monsters at various distances for spell testing
  const monsters: Monster[] = [
    // Melee targets nearby
    makeMonster("giant-rat", "Giant Rat", "giant-rat", 5, 5, 8, [1, 3], 5),
    makeMonster("kobold", "Kobold", "kobold", 7, 5, 12, [2, 4], 10),
    // Ranged targets in a line (east) for bolt testing
    makeMonster("skeleton", "Skeleton", "skeleton", 8, 15, 20, [3, 6], 20),
    makeMonster(
      "walking-corpse",
      "Walking Corpse",
      "walking-corpse",
      12,
      15,
      30,
      [4, 8],
      30,
    ),
    makeMonster("hobgoblin", "Hobgoblin", "hobgoblin", 16, 15, 25, [5, 9], 25),
    // Group for AoE testing
    makeMonster("goblin", "Goblin", "goblin", 10, 20, 10, [2, 4], 8),
    makeMonster("goblin", "Goblin", "goblin", 11, 20, 10, [2, 4], 8),
    makeMonster("goblin", "Goblin", "goblin", 10, 21, 10, [2, 4], 8),
    makeMonster("goblin", "Goblin", "goblin", 11, 21, 10, [2, 4], 8),
    // Sleeping target for Sleep spell test
    makeMonster(
      "gruesome-troll",
      "Gruesome Troll",
      "gruesome-troll",
      20,
      5,
      50,
      [6, 12],
      50,
    ),
    // Target behind wall (for LOS testing)
    makeMonster(
      "necromancer",
      "Necromancer",
      "necromancer",
      33,
      5,
      35,
      [5, 10],
      40,
    ),
  ];

  // Items on ground — mix of types for pickup/identify testing
  const items: PlacedItem[] = [];
  const potionTpl = ALL_ITEM_TEMPLATES.find(
    (t) => t.id === "potion-heal-minor",
  )!;
  const swordTpl = ALL_ITEM_TEMPLATES.find((t) => t.id === "long-sword")!;
  const armorTpl = ALL_ITEM_TEMPLATES.find((t) => t.id === "chain-mail")!;
  const ringTpl = ALL_ITEM_TEMPLATES.find((t) => t.id === "ring")!;

  // Normal items
  items.push({
    item: createItemFromTemplate(potionTpl, 5),
    position: { x: 3, y: 12 },
  });
  items.push({
    item: createItemFromTemplate(potionTpl, 5),
    position: { x: 3, y: 13 },
  });

  // Enchanted sword (+2)
  const enchSword: Item = {
    ...createItemFromTemplate(swordTpl, 15),
    name: "Long Sword +2",
    enchantment: 2,
    identified: true,
    sprite: "sword-enchanted",
  };
  items.push({ item: enchSword, position: { x: 4, y: 12 } });

  // Cursed armor (unidentified)
  const cursedArmor: Item = {
    ...createItemFromTemplate(armorTpl, 10),
    name: "Chain Mail -1",
    enchantment: -1,
    cursed: true,
    identified: false,
    sprite: "metal-armour-cursed",
  };
  items.push({ item: cursedArmor, position: { x: 4, y: 13 } });

  // Unidentified enchanted ring
  const enchRing: Item = {
    ...createItemFromTemplate(ringTpl, 10),
    name: "Ring +1",
    enchantment: 1,
    identified: false,
    sprite: "ring-enchanted",
  };
  items.push({ item: enchRing, position: { x: 4, y: 14 } });

  return {
    floor: {
      id: "test-0",
      tiles,
      monsters,
      items,
      decals: [],
      explored,
      visible,
      lit,
      width: W,
      height: H,
    },
    playerStart: { x: 5, y: 15 },
  };
}

/** Returns all spell IDs for the hero to know */
export function getAllSpellIds(): string[] {
  return SPELLS.map((s) => s.id);
}
