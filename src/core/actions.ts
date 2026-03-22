import type {
  GameState,
  GameAction,
  Direction,
  Vector2,
  Message,
  Hero,
  Floor,
} from "./types";
import {
  generateFloor,
  getDungeonForFloor,
} from "../systems/dungeon/generator";
import { playerAttacksMonster } from "../systems/combat/combat";
import { castSpell } from "../systems/spells/casting";
import { saveGame } from "./save-load";
import { processPickupItem } from "../systems/inventory/pickup";
import { processDropItem } from "../systems/inventory/drop";
import {
  processEquipItem,
  processUnequipItem,
} from "../systems/inventory/equipment";
import { processUseItem } from "../systems/inventory/use-item";
import {
  generateTownMap,
  BUILDING_FLAVORS,
  TOWN_START_RETURN,
} from "../systems/town/TownMap";
import { initShopInventory, restockShop } from "../systems/town/Shops";
import { Sound } from "../systems/Sound";
import {
  trackSecretDoorFound,
  trackFloorReached,
  trackFloorCleared,
} from "../systems/Achievements";
import { hasEnchant } from "../utils/Enchants";
import { ITEM_BY_ID } from "../data/items";
import { TRAP_DATA } from "../data/Traps";

const DIRECTION_VECTORS: Record<Direction, Vector2> = {
  N: { x: 0, y: -1 },
  NE: { x: 1, y: -1 },
  E: { x: 1, y: 0 },
  SE: { x: 1, y: 1 },
  S: { x: 0, y: 1 },
  SW: { x: -1, y: 1 },
  W: { x: -1, y: 0 },
  NW: { x: -1, y: -1 },
};

export function getDirectionVector(dir: Direction): Vector2 {
  return DIRECTION_VECTORS[dir];
}

export function processAction(state: GameState, action: GameAction): GameState {
  // Paralyzed heroes cannot move
  if (
    action.type === "move" &&
    state.hero.activeEffects.some((e) => e.id === "paralyzed")
  ) {
    return {
      ...state,
      messages: [
        ...state.messages,
        {
          text: "You are paralyzed and cannot move!",
          severity: "important" as const,
          turn: state.turn,
        },
      ],
      turn: state.turn + 1,
    };
  }

  switch (action.type) {
    case "move":
      return processMove(state, action.direction);
    case "castSpell":
      return processCastSpell(state, action);
    case "useStairs":
      return processUseStairs(state);
    case "setScreen":
      return { ...state, screen: action.screen };
    case "save":
      return processSave(state);
    case "rest":
      return processRest(state);
    case "contextAction":
      return processContextAction(state);
    case "pickupItem":
      return processPickupItem(state);
    case "dropItem":
      return processDropItem(state, action.itemId);
    case "equipItem":
      return processEquipItem(state, action.itemId);
    case "unequipItem":
      return processUnequipItem(state, action.slot);
    case "useItem":
      return processUseItem(state, action.itemId);
    case "search":
      return processSearch(state);
    case "enterBuilding": {
      return processEnterBuilding(state);
    }
    case "newGame":
      return { ...state, screen: "character-creation" };
    default:
      return state;
  }
}

/** E key — smart context action based on what's on the hero's tile */
function processContextAction(state: GameState): GameState {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  const pos = state.hero.position;
  const tile = floor.tiles[pos.y][pos.x];

  // Building → enter it
  if (tile.type === "building" && tile.buildingId) {
    return processEnterBuilding(state);
  }

  // Stairs → use them
  if (tile.type === "stairs-up" || tile.type === "stairs-down") {
    return processUseStairs(state);
  }

  // Items on ground → pick up
  const itemsHere = floor.items.filter(
    (i) => i.position.x === pos.x && i.position.y === pos.y,
  );
  if (itemsHere.length > 0) {
    return processPickupItem(state);
  }

  // Adjacent doors or potential secrets → search
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = pos.x + dx;
      const ny = pos.y + dy;
      if (nx < 0 || nx >= floor.width || ny < 0 || ny >= floor.height) continue;
      const adj = floor.tiles[ny][nx];
      if (
        adj.type === "door-closed" ||
        adj.type === "door-locked" ||
        adj.type === "door-secret"
      ) {
        return processSearch(state);
      }
    }
  }

  // Nothing to do — E doesn't wait, only Q does
  return addMessage(state, "Nothing to interact with here.", "system");
}

function processMove(state: GameState, direction: Direction): GameState {
  const delta = getDirectionVector(direction);
  const newPos: Vector2 = {
    x: state.hero.position.x + delta.x,
    y: state.hero.position.y + delta.y,
  };

  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  // Bounds check
  if (
    newPos.x < 0 ||
    newPos.x >= floor.width ||
    newPos.y < 0 ||
    newPos.y >= floor.height
  ) {
    return state;
  }

  const tile = floor.tiles[newPos.y][newPos.x];

  // Bump into closed door → open it
  if (tile.type === "door-closed") {
    const newTiles = floor.tiles.map((row) => [...row]);
    newTiles[newPos.y][newPos.x] = {
      type: "door-open",
      sprite: "door-open",
      walkable: true,
      transparent: true,
    };
    Sound.doorOpen();
    return {
      ...state,
      floors: { ...state.floors, [floorKey]: { ...floor, tiles: newTiles } },
      messages: [
        ...state.messages,
        {
          text: "You open the door.",
          severity: "normal" as const,
          turn: state.turn,
        },
      ],
      turn: state.turn + 1,
    };
  }

  // Bump into locked door → STR check to force open
  if (tile.type === "door-locked") {
    const strCheck = Math.random() * 100 < state.hero.attributes.strength;
    if (strCheck) {
      const newTiles = floor.tiles.map((row) => [...row]);
      newTiles[newPos.y][newPos.x] = {
        type: "door-open",
        sprite: "door-open",
        walkable: true,
        transparent: true,
      };
      Sound.doorOpen();
      return {
        ...state,
        floors: { ...state.floors, [floorKey]: { ...floor, tiles: newTiles } },
        messages: [
          ...state.messages,
          {
            text: "You force the locked door open!",
            severity: "important" as const,
            turn: state.turn,
          },
        ],
        turn: state.turn + 1,
      };
    }
    return {
      ...state,
      messages: [
        ...state.messages,
        {
          text: "The door is locked. You fail to force it open.",
          severity: "normal" as const,
          turn: state.turn,
        },
      ],
      turn: state.turn + 1,
    };
  }

  if (!tile.walkable) return state;

  // Check for monster at target position — attack it
  const monsterAtTarget = floor.monsters.find(
    (m) => m.position.x === newPos.x && m.position.y === newPos.y,
  );

  if (monsterAtTarget) {
    return playerAttacksMonster(state, monsterAtTarget.id);
  }

  // Move hero
  let hero = { ...state.hero, position: newPos };
  const messages = [...state.messages];
  let floors = state.floors;

  // Check for trap at new position
  const tileAtNew = floor.tiles[newPos.y][newPos.x];
  if (tileAtNew.type === "trap" && tileAtNew.trapType) {
    const isLevitating = state.hero.activeEffects.some(
      (e) => e.id === "levitation",
    ) || hasUniqueAbility(state.hero.equipment, 'levitation');
    const isTrapImmune = hasEnchant(state.hero.equipment, "trap-immune")
      || hasUniqueAbility(state.hero.equipment, 'elemental-immunity');
    if (!isLevitating && !isTrapImmune) {
      const result = triggerTrap(
        tileAtNew,
        hero,
        newPos,
        floor,
        floorKey,
        messages,
        state.turn + 1,
      );
      hero = result.hero;
      floors = { ...state.floors, [floorKey]: result.floor };
    }
  }

  // Auto-pickup gold, notify for other items
  let currentFloor = floors[floorKey] ?? floor;
  const itemsAtPos = currentFloor.items.filter(
    (i) => i.position.x === newPos.x && i.position.y === newPos.y,
  );
  const goldItems = itemsAtPos.filter((i) => i.item.category === "currency");
  const nonGoldItems = itemsAtPos.filter((i) => i.item.category !== "currency");

  // Auto-pickup all gold
  if (goldItems.length > 0) {
    let goldTotal = 0;
    for (const g of goldItems) {
      goldTotal += g.item.properties["amount"] ?? g.item.value;
    }
    hero = { ...hero, copper: hero.copper + goldTotal };
    currentFloor = {
      ...currentFloor,
      items: currentFloor.items.filter(
        (i) =>
          !(
            i.position.x === newPos.x &&
            i.position.y === newPos.y &&
            i.item.category === "currency"
          ),
      ),
    };
    floors = { ...floors, [floorKey]: currentFloor };
    messages.push({
      text: `Picked up ${goldTotal} gold.`,
      severity: "normal" as const,
      turn: state.turn + 1,
    });
    Sound.goldPickup();
  }

  if (nonGoldItems.length === 1) {
    messages.push({
      text: `You see ${nonGoldItems[0].item.name} on the ground. (G to pick up)`,
      severity: "normal" as const,
      turn: state.turn + 1,
    });
  } else if (nonGoldItems.length > 1) {
    messages.push({
      text: `You see ${nonGoldItems.length} items on the ground. (G to pick up all)`,
      severity: "normal" as const,
      turn: state.turn + 1,
    });
  }

  // Notify when stepping onto a building entrance or dungeon entrance
  const movedTile = (floors[floorKey] ?? floor).tiles[newPos.y]?.[newPos.x];
  if (movedTile?.type === "building" && movedTile.buildingId) {
    const info = BUILDING_FLAVORS[movedTile.buildingId];
    const bName = info?.name ?? movedTile.buildingId;
    messages.push({
      text: `You are at ${bName}. (Press Enter or E to go inside)`,
      severity: "normal" as const,
      turn: state.turn + 1,
    });
  } else if (
    movedTile?.type === "stairs-down" &&
    state.currentDungeon === "town"
  ) {
    const targetFloor = state.returnFloor + 1;
    messages.push({
      text: `The entrance to the Abandoned Mine. Floor ${targetFloor} awaits. (Press Enter or E to enter)`,
      severity: "normal" as const,
      turn: state.turn + 1,
    });
  }

  return {
    ...state,
    hero,
    floors,
    messages,
    turn: state.turn + 1,
  };
}

function processCastSpell(
  state: GameState,
  action: Extract<GameAction, { type: "castSpell" }>,
): GameState {
  return castSpell(state, action.spellId, action.direction, action.target);
}

function processEnterBuilding(state: GameState): GameState {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;
  const tile = floor.tiles[state.hero.position.y][state.hero.position.x];
  if (tile.type !== "building" || !tile.buildingId) {
    return addMessage(state, "There is no building here.", "system");
  }
  const shopIds = [
    "weapon-shop",
    "armor-shop",
    "general-store",
    "magic-shop",
    "junk-store",
  ];
  const screen = shopIds.includes(tile.buildingId)
    ? ("shop" as const)
    : ("service" as const);

  const info = BUILDING_FLAVORS[tile.buildingId];
  const msg = info
    ? `You enter ${info.name}. ${info.flavor}`
    : `You enter the building.`;

  Sound.doorOpen();
  return {
    ...state,
    screen,
    activeBuildingId: tile.buildingId,
    messages: [
      ...state.messages,
      { text: msg, severity: "important" as const, turn: state.turn },
    ],
  };
}

function processUseStairs(state: GameState): GameState {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  const heroTile = floor.tiles[state.hero.position.y][state.hero.position.x];

  // Redirect building entry via Enter key
  if (heroTile.type === "building") {
    return processEnterBuilding(state);
  }

  if (heroTile.type === "stairs-down") {
    Sound.stairs();
    if (state.currentDungeon === "town") {
      return returnToDungeon(state);
    }
    return goToFloor(state, state.currentFloor + 1, "descend");
  } else if (heroTile.type === "stairs-up") {
    Sound.stairs();
    if (state.currentFloor === 0) {
      return teleportToTown(state);
    }
    return goToFloor(state, state.currentFloor - 1, "ascend");
  }

  return addMessage(state, "There are no stairs here.", "system");
}

const SHOP_IDS = [
  "weapon-shop",
  "armor-shop",
  "general-store",
  "magic-shop",
  "junk-store",
];

export function teleportToTown(state: GameState): GameState {
  let floors = { ...state.floors };
  const townKey = "town-0";

  // Always regenerate town map (layout may have changed)
  const { floor: townFloor } = generateTownMap();
  floors = { ...floors, [townKey]: townFloor };

  const deepest = Math.max(state.town.deepestFloor, state.currentFloor + 1);

  let shopInventories = { ...state.town.shopInventories };
  for (const sid of SHOP_IDS) {
    if (!shopInventories[sid] || shopInventories[sid].length === 0) {
      shopInventories[sid] = initShopInventory(sid, deepest);
    } else {
      shopInventories[sid] = restockShop(shopInventories[sid], sid, deepest);
    }
  }

  return {
    ...state,
    currentDungeon: "town" as const,
    currentFloor: 0,
    returnFloor: state.currentFloor,
    floors,
    hero: { ...state.hero, position: { ...TOWN_START_RETURN } },
    town: { ...state.town, shopInventories, deepestFloor: deepest },
    messages: [
      ...state.messages,
      {
        text: "You arrive in town.",
        severity: "important" as const,
        turn: state.turn,
      },
    ],
  };
}

function returnToDungeon(state: GameState): GameState {
  const targetFloor = state.returnFloor;
  const targetDungeon = getDungeonForFloor(targetFloor);
  const floorKey = `${targetDungeon}-${targetFloor}`;
  const floor = state.floors[floorKey];

  if (!floor) {
    if (targetFloor === 0) {
      const { floor: newFloor } = generateFloor(
        targetDungeon,
        targetFloor,
        state.rngSeed,
        true,
        true,
        state.difficulty,
      );
      state = { ...state, floors: { ...state.floors, [floorKey]: newFloor } };
      return returnToDungeon(state);
    }
    return addMessage(state, "There is nowhere to return to.", "system");
  }

  let arrivalPos = { x: 0, y: 0 };
  for (let y = 0; y < floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      if (floor.tiles[y][x].type === "stairs-up") {
        arrivalPos = { x, y };
        break;
      }
    }
    if (arrivalPos.x !== 0 || arrivalPos.y !== 0) break;
  }

  return {
    ...state,
    currentDungeon: targetDungeon,
    currentFloor: targetFloor,
    hero: { ...state.hero, position: arrivalPos },
    messages: [
      ...state.messages,
      {
        text: `You return to dungeon level ${targetFloor + 1}.`,
        severity: "important" as const,
        turn: state.turn,
      },
    ],
  };
}

function goToFloor(
  state: GameState,
  targetFloor: number,
  direction: "ascend" | "descend",
): GameState {
  // Determine dungeon tier for this floor
  const targetDungeon = getDungeonForFloor(targetFloor);
  const targetKey = `${targetDungeon}-${targetFloor}`;
  let floors = { ...state.floors };

  // Generate floor if it doesn't exist yet
  if (!floors[targetKey]) {
    const { floor: newFloor } = generateFloor(
      targetDungeon,
      targetFloor,
      state.rngSeed,
      true, // has stairs up
      true, // has stairs down
      state.difficulty,
    );
    floors = { ...floors, [targetKey]: newFloor };
  }

  const targetFloorData = floors[targetKey];

  // Find the matching stairs on the target floor
  const arrivalStairType =
    direction === "descend" ? "stairs-up" : "stairs-down";
  let arrivalPos: Vector2 | null = null;

  for (let y = 0; y < targetFloorData.height; y++) {
    for (let x = 0; x < targetFloorData.width; x++) {
      if (targetFloorData.tiles[y][x].type === arrivalStairType) {
        arrivalPos = { x, y };
        break;
      }
    }
    if (arrivalPos) break;
  }

  if (!arrivalPos) {
    arrivalPos = {
      x: Math.floor(targetFloorData.width / 2),
      y: Math.floor(targetFloorData.height / 2),
    };
  }

  // Check if the floor being left was cleared
  const oldFloorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const oldFloor = state.floors[oldFloorKey];
  if (oldFloor && oldFloor.monsters.length === 0) {
    trackFloorCleared(oldFloorKey, 0);
  }

  trackFloorReached(targetFloor);

  const depthLabel = targetFloor + 1;
  const verb = direction === "descend" ? "descends to" : "ascends to";
  const messages = [
    ...state.messages,
    {
      text: `${state.hero.name} ${verb} level ${depthLabel}.`,
      severity: "important" as const,
      turn: state.turn,
    },
  ];

  // Tier transition messages
  const prevDungeon = getDungeonForFloor(state.currentFloor);
  if (targetDungeon !== prevDungeon) {
    const tierNames: Record<string, string> = {
      mine: "the Abandoned Mine",
      fortress: "the Underground Fortress",
      castle: "The Runed Deep",
    };
    messages.push({
      text: `You enter ${tierNames[targetDungeon] ?? targetDungeon}. The air grows heavier.`,
      severity: "important" as const,
      turn: state.turn,
    });
  }

  let newState: GameState = {
    ...state,
    hero: { ...state.hero, position: arrivalPos },
    currentDungeon: targetDungeon,
    currentFloor: targetFloor,
    floors,
    turn: state.turn + 1,
    messages,
  };

  // Auto-save on floor change
  const saved = saveGame(newState, 1);
  if (saved) {
    newState = {
      ...newState,
      messages: [
        ...newState.messages,
        {
          text: "Game auto-saved.",
          severity: "system" as const,
          turn: newState.turn,
        },
      ],
    };
  }

  return newState;
}

function triggerTrap(
  tile: { trapType?: string; trapRevealed?: boolean },
  hero: Hero,
  pos: Vector2,
  floor: Floor,
  _floorKey: string,
  messages: Message[],
  turn: number,
): { hero: Hero; floor: Floor } {
  const trap = TRAP_DATA[tile.trapType ?? ""];
  if (!trap) return { hero, floor };

  Sound.trap();

  // Reveal the trap
  const newTiles = floor.tiles.map((row) => [...row]);
  newTiles[pos.y][pos.x] = {
    ...newTiles[pos.y][pos.x],
    trapRevealed: true,
    sprite: trap.sprite,
  };
  const newFloor = { ...floor, tiles: newTiles };

  // Portal trap: teleport to random floor position
  if (tile.trapType === "portal") {
    messages.push({ text: trap.message, severity: "important", turn });
    for (let tries = 0; tries < 200; tries++) {
      const x = Math.floor(Math.random() * floor.width);
      const y = Math.floor(Math.random() * floor.height);
      const t = floor.tiles[y]?.[x];
      if (
        t?.walkable &&
        t.type !== "trap" &&
        !floor.monsters.some((m) => m.position.x === x && m.position.y === y)
      ) {
        hero = { ...hero, position: { x, y } };
        messages.push({
          text: "You are teleported!",
          severity: "important",
          turn,
        });
        break;
      }
    }
    return { hero, floor: newFloor };
  }

  // Cobweb trap: lose a turn (no damage)
  if (tile.trapType === "cobweb") {
    messages.push({ text: trap.message, severity: "important", turn });
    return { hero, floor: newFloor };
  }

  // Damage traps — apply elemental resistance if applicable
  let dmg =
    trap.damage[0] +
    Math.floor(Math.random() * (trap.damage[1] - trap.damage[0] + 1));

  if (trap.element) {
    const resist = hero.resistances[trap.element] ?? 0;
    if (resist >= 100) {
      messages.push({
        text: `${trap.message} Your resistance absorbs the damage!`,
        severity: "combat",
        turn,
      });
      return { hero, floor: newFloor };
    }
    if (resist > 0) {
      const reduced = Math.round(dmg * (1 - resist / 100));
      messages.push({
        text: `${trap.message} Resistance reduces the damage!`,
        severity: "combat",
        turn,
      });
      dmg = Math.max(1, reduced);
    } else if (resist < 0) {
      dmg = Math.round(dmg * (1 + Math.abs(resist) / 100));
    }
  }

  const newHp = Math.max(0, hero.hp - dmg);
  messages.push({
    text: `${trap.message} You take ${dmg} damage. (${newHp}/${hero.maxHp} HP)`,
    severity: "combat",
    turn,
  });
  hero = { ...hero, hp: newHp };

  return { hero, floor: newFloor };
}

/** Check if any equipped item has a specific unique ability */
function hasUniqueAbility(equipment: Record<string, any>, ability: string): boolean {
  for (const item of Object.values(equipment)) {
    if (!item?.templateId) continue;
    const tpl = ITEM_BY_ID[item.templateId];
    if (tpl?.uniqueAbility === ability) return true;
  }
  return false;
}

function processSave(state: GameState): GameState {
  const success = saveGame(state, 1);
  const msg = success ? "Game saved." : "Failed to save game!";
  return addMessage(state, msg, "system");
}

function addMessage(
  state: GameState,
  text: string,
  severity: Message["severity"],
): GameState {
  return {
    ...state,
    messages: [...state.messages, { text, severity, turn: state.turn }],
  };
}

function processRest(state: GameState): GameState {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];

  // Check for nearby enemies — fail if within 5 tiles
  if (floor) {
    const nearbyMonster = floor.monsters.find((m) => {
      const dist = Math.max(
        Math.abs(m.position.x - state.hero.position.x),
        Math.abs(m.position.y - state.hero.position.y),
      );
      return dist <= 5;
    });
    if (nearbyMonster) {
      const dist = Math.max(
        Math.abs(nearbyMonster.position.x - state.hero.position.x),
        Math.abs(nearbyMonster.position.y - state.hero.position.y),
      );
      // Close enemy: chance to get ambushed (30% if adjacent, 15% if 2-3 tiles)
      const ambushChance = dist <= 1 ? 0.3 : dist <= 3 ? 0.15 : 0;
      if (Math.random() < ambushChance) {
        return {
          ...state,
          messages: [
            ...state.messages,
            {
              text: `A ${nearbyMonster.name} catches you off guard while resting!`,
              severity: "combat" as const,
              turn: state.turn,
            },
          ],
          turn: state.turn + 1,
        };
      }
      // Even if no ambush, waiting ends early with warning
      return {
        ...state,
        hero: {
          ...state.hero,
          hp: Math.min(state.hero.maxHp, state.hero.hp + 1),
        },
        messages: [
          ...state.messages,
          {
            text: `You rest briefly but sense danger nearby. (+1 HP)`,
            severity: "system" as const,
            turn: state.turn,
          },
        ],
        turn: state.turn + 1,
      };
    }
  }

  // Safe to rest — random 1-10 turns
  const waitTurns = Math.floor(Math.random() * 10) + 1;
  let hero = { ...state.hero };
  let hpGain = 0;
  let mpGain = 0;

  for (let t = 0; t < waitTurns; t++) {
    if (hero.hp < hero.maxHp) {
      hero = { ...hero, hp: Math.min(hero.maxHp, hero.hp + 1) };
      hpGain++;
    }
    if (hero.mp < hero.maxMp && (state.turn + t) % 2 === 0) {
      hero = { ...hero, mp: Math.min(hero.maxMp, hero.mp + 1) };
      mpGain++;
    }
  }

  const gains: string[] = [];
  if (hpGain > 0) gains.push(`+${hpGain} HP`);
  if (mpGain > 0) gains.push(`+${mpGain} MP`);
  const gainText = gains.length > 0 ? ` (${gains.join(", ")})` : "";

  const messages = [
    ...state.messages,
    {
      text: `You waited ${waitTurns} turn${waitTurns > 1 ? "s" : ""}.${gainText}`,
      severity: "system" as const,
      turn: state.turn,
    },
  ];

  return {
    ...state,
    hero,
    messages,
    turn: state.turn + waitTurns,
  };
}

function processSearch(state: GameState): GameState {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  const pos = state.hero.position;
  const messages = [...state.messages];
  let found = 0;

  // Check all 8 adjacent tiles + current tile for secret doors and hidden traps
  const newTiles = floor.tiles.map((row) => [...row]);
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = pos.x + dx;
      const y = pos.y + dy;
      if (x < 0 || x >= floor.width || y < 0 || y >= floor.height) continue;

      const tile = newTiles[y][x];

      // Reveal secret doors
      if (tile.type === "door-secret") {
        newTiles[y][x] = {
          type: "door-closed",
          sprite: "door-closed",
          walkable: false,
          transparent: false,
        };
        messages.push({
          text: "You found a secret door!",
          severity: "important" as const,
          turn: state.turn,
        });
        found++;
        trackSecretDoorFound();
      }

      // Reveal hidden traps
      if (tile.type === "trap" && !tile.trapRevealed) {
        const trapSprites: Record<string, string> = {
          pit: "pit-trap",
          arrow: "arrow-trap",
          fire: "fire-trap",
          dart: "dart-trap",
          portal: "portal-trap",
          acid: "acid-trap",
          lightning: "lightning-trap",
          wind: "wind-trap",
          rune: "rune-trap",
          cobweb: "cobweb-trap",
        };
        newTiles[y][x] = {
          ...tile,
          trapRevealed: true,
          sprite: trapSprites[tile.trapType ?? ""] ?? "pit-trap",
        };
        messages.push({
          text: `You found a ${tile.trapType} trap!`,
          severity: "important" as const,
          turn: state.turn,
        });
        found++;
      }
    }
  }

  if (found === 0) {
    messages.push({
      text: "You search but find nothing.",
      severity: "system" as const,
      turn: state.turn,
    });
  } else {
    Sound.searchFound();
  }

  return {
    ...state,
    floors: { ...state.floors, [floorKey]: { ...floor, tiles: newTiles } },
    messages,
    turn: state.turn + 1,
  };
}
