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
import { getThemeForDepth } from "../data/DungeonThemes";
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
import { blessItem as blessItemFn } from "../systems/town/Services";
import { recomputeDerivedStats } from "../systems/character/derived-stats";
import { Sound } from "../systems/Sound";
import {
  trackSecretDoorFound,
  trackFloorReached,
  trackFloorCleared,
} from "../systems/Achievements";
// Enchant utils removed — affix checks now use unique abilities only
import { ITEM_BY_ID } from "../data/items";
import { TRAP_DATA } from "../data/Traps";
import { getDisplayName } from "../systems/inventory/display-name";
import { generateRiftFloor } from "../systems/rift/RiftGen";
import {
  processOpenRiftMenu,
  processEnterRift,
  processExitRift as _processExitRift,
  processRerollRift,
  processRiftComplete,
} from "../systems/rift/RiftActions";
import {
  processEnterCrucible,
  processExitCrucible as _processExitCrucible,
  processCrucibleNextWave,
} from "../systems/crucible/CrucibleActions";
import { getModifierFlags } from "../systems/rift/ModifierFlags";

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
    case "useAllItems": {
      let s = state;
      const ids = s.hero.inventory
        .filter((i) => i.templateId === action.templateId)
        .map((i) => i.id);
      for (const id of ids) {
        s = processUseItem(s, id);
      }
      return s;
    }
    case "toggleMarkForSale": {
      const inv = state.hero.inventory.map((i) =>
        i.id === action.itemId ? { ...i, markedForSale: !i.markedForSale } : i,
      );
      return { ...state, hero: { ...state.hero, inventory: inv } };
    }
    case "removeCurseItem": {
      const MP_COST = 3;
      if (state.hero.mp < MP_COST)
        return addMessage(state, "Not enough MP.", "system");
      // Search inventory
      const invIdx = state.hero.inventory.findIndex(
        (i) => i.id === action.itemId,
      );
      if (invIdx !== -1) {
        const item = state.hero.inventory[invIdx];
        if (!item.cursed)
          return addMessage(state, "That item is not cursed.", "system");
        const blessed = blessItemFn(item);
        const inv = state.hero.inventory.map((i, j) =>
          j === invIdx ? blessed : i,
        );
        return addMessage(
          {
            ...state,
            hero: recomputeDerivedStats(
              {
                ...state.hero,
                inventory: inv,
                mp: state.hero.mp - MP_COST,
              },
              state.statueUpgrades,
            ),
          },
          `The curse is lifted! ${blessed.name} is now blessed.`,
          "important",
        );
      }
      // Search equipment
      const eq = state.hero.equipment;
      const slots = Object.keys(eq) as (keyof typeof eq)[];
      const slot = slots.find((s) => eq[s]?.id === action.itemId);
      if (slot) {
        const item = eq[slot]!;
        if (!item.cursed)
          return addMessage(state, "That item is not cursed.", "system");
        const blessed = blessItemFn(item);
        return addMessage(
          {
            ...state,
            hero: recomputeDerivedStats(
              {
                ...state.hero,
                equipment: { ...eq, [slot]: blessed },
                mp: state.hero.mp - MP_COST,
              },
              state.statueUpgrades,
            ),
          },
          `The curse is lifted! ${blessed.name} is now blessed.`,
          "important",
        );
      }
      return addMessage(state, "Item not found.", "system");
    }
    case "search":
      return processSearch(state);
    case "enterBuilding": {
      return processEnterBuilding(state);
    }
    case "newGame":
      return { ...state, screen: "character-creation" };
    case "openRiftMenu":
      return processOpenRiftMenu(state);
    case "enterRift":
      return processEnterRift(state);
    case "exitRift":
      return _processExitRift(state, teleportToTown);
    case "rerollRift":
      return processRerollRift(state);
    case "riftComplete":
      return processRiftComplete(state);
    case "enterCrucible":
      return processEnterCrucible(state);
    case "exitCrucible":
      return _processExitCrucible(state, teleportToTown);
    case "crucibleNextWave":
      return processCrucibleNextWave(state);
    case "crucibleLeave":
      return _processExitCrucible(state, teleportToTown);
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

  // Items on ground → pick up (3x3 area)
  const itemsHere = floor.items.filter(
    (i) =>
      Math.abs(i.position.x - pos.x) <= 1 &&
      Math.abs(i.position.y - pos.y) <= 1,
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

  // Adjacent monster → attack it (move toward it to trigger combat)
  for (const m of floor.monsters) {
    const dx = m.position.x - pos.x;
    const dy = m.position.y - pos.y;
    if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && !(dx === 0 && dy === 0)) {
      const dirMap: Record<string, Direction> = {
        "0,-1": "N",
        "1,-1": "NE",
        "1,0": "E",
        "1,1": "SE",
        "0,1": "S",
        "-1,1": "SW",
        "-1,0": "W",
        "-1,-1": "NW",
      };
      const dir = dirMap[`${dx},${dy}`];
      if (dir) return processMove(state, dir);
    }
  }

  // Nothing to do
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
    const doorTheme = getThemeForDepth(state.currentFloor);
    const newTiles = [...floor.tiles];
    newTiles[newPos.y] = [...newTiles[newPos.y]];
    newTiles[newPos.y][newPos.x] = {
      type: "door-open",
      sprite: doorTheme.doorOpen[0],
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
      const lockTheme = getThemeForDepth(state.currentFloor);
      const newTiles = [...floor.tiles];
      newTiles[newPos.y] = [...newTiles[newPos.y]];
      newTiles[newPos.y][newPos.x] = {
        type: "door-open",
        sprite: lockTheme.doorOpen[0],
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

  if (!tile.walkable) {
    if (tile.type === "water") {
      const isLevitating =
        state.hero.activeEffects.some((e) => e.id === "levitation") ||
        hasUniqueAbility(state.hero.equipment, "levitation");
      if (!isLevitating) return state;
    } else {
      return state;
    }
  }

  // Check for monster at target position — attack it
  const monsterAtTarget = floor.monsters.find(
    (m) => m.position.x === newPos.x && m.position.y === newPos.y,
  );

  if (monsterAtTarget) {
    if (monsterAtTarget.templateId === "npc") {
      return addMessage(
        state,
        `${monsterAtTarget.name} stands before you.`,
        "normal",
      );
    }
    return playerAttacksMonster(state, monsterAtTarget.id);
  }

  // Move hero
  let hero = { ...state.hero, position: newPos };
  const messages = [...state.messages];
  let floors = state.floors;

  // Check for trap at new position
  const tileAtNew = floor.tiles[newPos.y][newPos.x];
  if (tileAtNew.type === "trap" && tileAtNew.trapType) {
    const isLevitating =
      state.hero.activeEffects.some((e) => e.id === "levitation") ||
      hasUniqueAbility(state.hero.equipment, "levitation");
    const isTrapImmune =
      hasUniqueAbility(state.hero.equipment, "elemental-immunity") ||
      hasUniqueAbility(state.hero.equipment, "levitation");
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

  // Auto-pickup gold, notify for other items (3x3 area)
  let currentFloor = floors[floorKey] ?? floor;
  const itemsAtPos = currentFloor.items.filter(
    (i) =>
      Math.abs(i.position.x - newPos.x) <= 1 &&
      Math.abs(i.position.y - newPos.y) <= 1,
  );
  const goldItems = itemsAtPos.filter((i) => i.item.category === "currency");
  const nonGoldItems = itemsAtPos.filter((i) => i.item.category !== "currency");

  // Auto-pickup all gold
  if (goldItems.length > 0) {
    let goldTotal = 0;
    for (const g of goldItems) {
      goldTotal += g.item.properties["amount"] ?? g.item.value;
    }
    hero = { ...hero, gold: hero.gold + goldTotal };
    currentFloor = {
      ...currentFloor,
      items: currentFloor.items.filter(
        (i) =>
          !(
            Math.abs(i.position.x - newPos.x) <= 1 &&
            Math.abs(i.position.y - newPos.y) <= 1 &&
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
      text: `You see ${getDisplayName(nonGoldItems[0].item)} on the ground. (G to pick up)`,
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
    const targetFloor = state.returnFloor || 1;
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
  const flags = getModifierFlags(state);
  if (flags.silence) {
    return addMessage(state, "Silence prevents spellcasting!", "important");
  }
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
  const shopIds = ["weapon-shop", "armor-shop", "general-store", "magic-shop"];
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

  // Rift stair handling
  if (state.currentDungeon === "rift" && state.activeRift) {
    const rift = state.activeRift;
    if (heroTile.type === "stairs-down") {
      Sound.stairs();
      if (rift.currentFloor >= rift.totalFloors) {
        // Last floor — rift complete
        return processRiftComplete(state);
      }
      // Advance to next rift floor
      const newRift = { ...rift, currentFloor: rift.currentFloor + 1 };
      const { floor: newFloor, playerStart } = generateRiftFloor(
        newRift,
        state,
      );
      const riftKey = `rift-${newRift.currentFloor}`;
      return {
        ...state,
        activeRift: newRift,
        currentFloor: newRift.currentFloor,
        floors: { ...state.floors, [riftKey]: newFloor },
        hero: { ...state.hero, position: playerStart },
        messages: [
          ...state.messages,
          {
            text: `You descend deeper into the rift. (Floor ${newRift.currentFloor}/${newRift.totalFloors})`,
            severity: "important" as const,
            turn: state.turn,
          },
        ],
        turn: state.turn + 1,
      };
    } else if (heroTile.type === "stairs-up") {
      Sound.stairs();
      if (rift.currentFloor <= 1) {
        return _processExitRift(state, teleportToTown);
      }
      // Go back up in rift
      const newRift = { ...rift, currentFloor: rift.currentFloor - 1 };
      const riftKey = `rift-${newRift.currentFloor}`;
      let floors = state.floors;
      let pos = state.hero.position;
      if (!floors[riftKey]) {
        const { floor: f, playerStart } = generateRiftFloor(newRift, state);
        floors = { ...floors, [riftKey]: f };
        pos = playerStart;
      } else {
        const f = floors[riftKey];
        for (let y = 0; y < f.height; y++) {
          for (let x = 0; x < f.width; x++) {
            if (f.tiles[y][x].type === "stairs-down") {
              pos = { x, y };
              break;
            }
          }
          if (
            pos.x !== state.hero.position.x ||
            pos.y !== state.hero.position.y
          )
            break;
        }
      }
      return {
        ...state,
        activeRift: newRift,
        currentFloor: newRift.currentFloor,
        floors,
        hero: { ...state.hero, position: pos },
        messages: [
          ...state.messages,
          {
            text: `You ascend. (Floor ${newRift.currentFloor}/${newRift.totalFloors})`,
            severity: "important" as const,
            turn: state.turn,
          },
        ],
        turn: state.turn + 1,
      };
    }
    return addMessage(state, "There are no stairs here.", "system");
  }

  if (heroTile.type === "stairs-down") {
    Sound.stairs();
    if (state.currentDungeon === "town") {
      return returnToDungeon(state);
    }
    return goToFloor(state, state.currentFloor + 1, "descend");
  } else if (heroTile.type === "stairs-up") {
    Sound.stairs();
    if (state.currentFloor <= 1) {
      return teleportToTown(state);
    }
    // If the floor below doesn't exist (pruned), go to town instead
    const belowKey = `${getDungeonForFloor(state.currentFloor - 1)}-${state.currentFloor - 1}`;
    if (!state.floors[belowKey]) {
      return teleportToTown(state);
    }
    return goToFloor(state, state.currentFloor - 1, "ascend");
  }

  return addMessage(state, "There are no stairs here.", "system");
}

const SHOP_IDS = ["weapon-shop", "armor-shop", "general-store", "magic-shop"];

export function teleportToTown(state: GameState): GameState {
  let floors = { ...state.floors };
  const townKey = "town-0";

  // Always regenerate town map (layout may have changed)
  const { floor: townFloor } = generateTownMap();
  floors = { ...floors, [townKey]: townFloor };

  const deepest = Math.max(state.town.deepestFloor, state.currentFloor);

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
    if (targetFloor === 1) {
      const { floor: newFloor } = generateFloor(
        targetDungeon,
        targetFloor,
        state.rngSeed,
        true,
        true,
        state.difficulty,
        state.ngPlusCount ?? 0,
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
        text: `You return to dungeon level ${targetFloor}.`,
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
      state.ngPlusCount ?? 0,
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

  // Check if the floor being left was cleared — refresh shops if so
  const oldFloorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const oldFloor = state.floors[oldFloorKey];
  const floorCleared = oldFloor && oldFloor.monsters.length === 0;
  if (floorCleared) {
    trackFloorCleared(oldFloorKey, 0);
    const deepest = Math.max(state.town.deepestFloor, targetFloor);
    const shopInvs = { ...state.town.shopInventories };
    for (const sid of SHOP_IDS) {
      shopInvs[sid] = shopInvs[sid]?.length
        ? restockShop(shopInvs[sid], sid, deepest)
        : initShopInventory(sid, deepest);
    }
    state = {
      ...state,
      town: { ...state.town, shopInventories: shopInvs, deepestFloor: deepest },
    };
  }

  trackFloorReached(targetFloor);

  const depthLabel = targetFloor;
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

  // Rift stone unlock at floor 15+
  if (targetFloor >= 15 && !state.riftStoneUnlocked) {
    state = { ...state, riftStoneUnlocked: true };
    messages.push({
      text: "A strange resonance pulses through you... The Rift Stone in town has awakened.",
      severity: "important" as const,
      turn: state.turn,
    });
  }

  // Prune old floors — keep current + previous only
  const keepKeys = new Set<string>();
  keepKeys.add(targetKey);
  if (targetFloor > 1) {
    keepKeys.add(`${getDungeonForFloor(targetFloor - 1)}-${targetFloor - 1}`);
  }
  const prunedFloors: typeof floors = {};
  for (const [k, v] of Object.entries(floors)) {
    if (keepKeys.has(k)) prunedFloors[k] = v;
  }

  let newState: GameState = {
    ...state,
    hero: { ...state.hero, position: arrivalPos },
    currentDungeon: targetDungeon,
    currentFloor: targetFloor,
    floors: prunedFloors,
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
  const newTiles = [...floor.tiles];
  newTiles[pos.y] = [...newTiles[pos.y]];
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
function hasUniqueAbility(
  equipment: Record<string, any>,
  ability: string,
): boolean {
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
  const newTiles = [...floor.tiles];
  const clonedRows = new Set<number>();
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = pos.x + dx;
      const y = pos.y + dy;
      if (x < 0 || x >= floor.width || y < 0 || y >= floor.height) continue;

      const tile = newTiles[y][x];

      // Reveal secret doors
      if (tile.type === "door-secret") {
        const secretTheme = getThemeForDepth(state.currentFloor);
        if (!clonedRows.has(y)) {
          newTiles[y] = [...newTiles[y]];
          clonedRows.add(y);
        }
        newTiles[y][x] = {
          type: "door-closed",
          sprite: secretTheme.doorClosed[0],
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
          pit: "traps-shaft",
          arrow: "traps-bolt",
          fire: "traps-alarm",
          dart: "traps-spear",
          portal: "traps-teleport",
          acid: "traps-net",
          lightning: "traps-zot",
          wind: "traps-dispersal",
          rune: "traps-binding_sigil",
          cobweb: "traps-cobweb_NESW",
        };
        if (!clonedRows.has(y)) {
          newTiles[y] = [...newTiles[y]];
          clonedRows.add(y);
        }
        newTiles[y][x] = {
          ...tile,
          trapRevealed: true,
          sprite: trapSprites[tile.trapType ?? ""] ?? "traps-shaft",
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

export function processCrucibleWaveCleared(state: GameState): GameState {
  const crucible = state.activeCrucible;
  if (!crucible) return state;

  let bestWave = state.crucibleBestWave ?? 0;
  if (crucible.wave > bestWave) bestWave = crucible.wave;

  return {
    ...state,
    crucibleBestWave: bestWave,
    screen: "crucible-summary",
    messages: [
      ...state.messages,
      {
        text: `Wave ${crucible.wave} cleared!`,
        severity: "important" as const,
        turn: state.turn,
      },
    ],
  };
}
