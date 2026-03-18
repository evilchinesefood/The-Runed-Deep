import type { GameState, GameAction, Direction, Vector2, Message, Hero, Floor } from './types';
import { generateFloor } from '../systems/dungeon/generator';
import { playerAttacksMonster } from '../systems/combat/combat';
import { castSpell } from '../systems/spells/casting';
import { saveGame } from './save-load';
import { processPickupItem } from '../systems/inventory/pickup';
import { processDropItem } from '../systems/inventory/drop';
import { processEquipItem, processUnequipItem } from '../systems/inventory/equipment';
import { processUseItem } from '../systems/inventory/use-item';
import { generateTownMap } from '../systems/town/TownMap';
import { initShopInventory, restockShop } from '../systems/town/Shops';

const DIRECTION_VECTORS: Record<Direction, Vector2> = {
  N:  { x: 0,  y: -1 },
  NE: { x: 1,  y: -1 },
  E:  { x: 1,  y: 0 },
  SE: { x: 1,  y: 1 },
  S:  { x: 0,  y: 1 },
  SW: { x: -1, y: 1 },
  W:  { x: -1, y: 0 },
  NW: { x: -1, y: -1 },
};

export function getDirectionVector(dir: Direction): Vector2 {
  return DIRECTION_VECTORS[dir];
}

export function processAction(state: GameState, action: GameAction): GameState {
  // Paralyzed heroes cannot move
  if (action.type === 'move' && state.hero.activeEffects.some(e => e.id === 'paralyzed')) {
    return {
      ...state,
      messages: [...state.messages, { text: 'You are paralyzed and cannot move!', severity: 'important' as const, turn: state.turn }],
      turn: state.turn + 1,
    };
  }

  switch (action.type) {
    case 'move':
      return processMove(state, action.direction);
    case 'castSpell':
      return processCastSpell(state, action);
    case 'useStairs':
      return processUseStairs(state);
    case 'setScreen':
      return { ...state, screen: action.screen };
    case 'save':
      return processSave(state);
    case 'rest':
      return processRest(state);
    case 'pickupItem':
      return processPickupItem(state);
    case 'dropItem':
      return processDropItem(state, action.itemId);
    case 'equipItem':
      return processEquipItem(state, action.itemId);
    case 'unequipItem':
      return processUnequipItem(state, action.slot);
    case 'useItem':
      return processUseItem(state, action.itemId);
    case 'search':
      return processSearch(state);
    case 'enterBuilding': {
      return processEnterBuilding(state);
    }
    case 'newGame':
      return { ...state, screen: 'character-creation' };
    default:
      return state;
  }
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
  if (newPos.x < 0 || newPos.x >= floor.width || newPos.y < 0 || newPos.y >= floor.height) {
    return state;
  }

  const tile = floor.tiles[newPos.y][newPos.x];

  // Bump into closed door → open it
  if (tile.type === 'door-closed') {
    const newTiles = floor.tiles.map(row => [...row]);
    newTiles[newPos.y][newPos.x] = {
      type: 'door-open', sprite: 'door-open', walkable: true, transparent: true,
    };
    return {
      ...state,
      floors: { ...state.floors, [floorKey]: { ...floor, tiles: newTiles } },
      messages: [...state.messages, { text: 'You open the door.', severity: 'normal' as const, turn: state.turn }],
      turn: state.turn + 1,
    };
  }

  // Bump into locked door → STR check to force open
  if (tile.type === 'door-locked') {
    const strCheck = Math.random() * 100 < state.hero.attributes.strength;
    if (strCheck) {
      const newTiles = floor.tiles.map(row => [...row]);
      newTiles[newPos.y][newPos.x] = {
        type: 'door-open', sprite: 'door-broken', walkable: true, transparent: true,
      };
      return {
        ...state,
        floors: { ...state.floors, [floorKey]: { ...floor, tiles: newTiles } },
        messages: [...state.messages, { text: 'You force the locked door open!', severity: 'important' as const, turn: state.turn }],
        turn: state.turn + 1,
      };
    }
    return {
      ...state,
      messages: [...state.messages, { text: 'The door is locked. You fail to force it open.', severity: 'normal' as const, turn: state.turn }],
      turn: state.turn + 1,
    };
  }

  if (!tile.walkable) return state;

  // Check for monster at target position — attack it
  const monsterAtTarget = floor.monsters.find(
    m => m.position.x === newPos.x && m.position.y === newPos.y
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
  if (tileAtNew.type === 'trap' && tileAtNew.trapType) {
    const isLevitating = state.hero.activeEffects.some(e => e.id === 'levitation');
    if (!isLevitating) {
      const result = triggerTrap(tileAtNew, hero, newPos, floor, floorKey, messages, state.turn + 1);
      hero = result.hero;
      floors = { ...state.floors, [floorKey]: result.floor };
    }
  }

  // Check for items at new position
  const currentFloor = floors[floorKey] ?? floor;
  const itemsAtPos = currentFloor.items.filter(
    i => i.position.x === newPos.x && i.position.y === newPos.y
  );
  if (itemsAtPos.length === 1) {
    messages.push({
      text: `You see ${itemsAtPos[0].item.name} on the ground. (G to pick up)`,
      severity: 'normal' as const,
      turn: state.turn + 1,
    });
  } else if (itemsAtPos.length > 1) {
    messages.push({
      text: `You see a treasure pile with ${itemsAtPos.length} items. (G to pick up all)`,
      severity: 'normal' as const,
      turn: state.turn + 1,
    });
  }

  // Notify when stepping onto a building
  const movedTile = (floors[floorKey] ?? floor).tiles[newPos.y]?.[newPos.x];
  if (movedTile?.type === 'building' && movedTile.buildingId) {
    const names: Record<string, string> = {
      'weapon-shop': 'Weapon Shop', 'armor-shop': 'Armor Shop', 'general-store': 'General Store',
      'magic-shop': 'Magic Shop', 'junk-store': "Olaf's Junk Store", 'temple': 'Temple of Odin',
      'sage': 'The Sage', 'bank': 'Bank', 'inn': 'The Inn',
    };
    messages.push({
      text: `You are at the ${names[movedTile.buildingId] ?? movedTile.buildingId}. (Enter to go inside)`,
      severity: 'normal' as const,
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

function processCastSpell(state: GameState, action: Extract<GameAction, { type: 'castSpell' }>): GameState {
  return castSpell(state, action.spellId, action.direction, action.target);
}

function processEnterBuilding(state: GameState): GameState {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;
  const tile = floor.tiles[state.hero.position.y][state.hero.position.x];
  if (tile.type !== 'building' || !tile.buildingId) {
    return addMessage(state, 'There is no building here.', 'system');
  }
  const shopIds = ['weapon-shop', 'armor-shop', 'general-store', 'magic-shop', 'junk-store'];
  const screen = shopIds.includes(tile.buildingId) ? 'shop' as const : 'service' as const;
  return { ...state, screen, activeBuildingId: tile.buildingId };
}

function processUseStairs(state: GameState): GameState {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  const heroTile = floor.tiles[state.hero.position.y][state.hero.position.x];

  // Redirect building entry via Enter key
  if (heroTile.type === 'building') {
    return processEnterBuilding(state);
  }

  if (heroTile.type === 'stairs-down') {
    if (state.currentDungeon === 'town') {
      return returnToDungeon(state);
    }
    return goToFloor(state, state.currentFloor + 1, 'descend');
  } else if (heroTile.type === 'stairs-up') {
    if (state.currentFloor === 0) {
      return teleportToTown(state);
    }
    return goToFloor(state, state.currentFloor - 1, 'ascend');
  }

  return addMessage(state, 'There are no stairs here.', 'system');
}

const SHOP_IDS = ['weapon-shop', 'armor-shop', 'general-store', 'magic-shop', 'junk-store'];

export function teleportToTown(state: GameState): GameState {
  let floors = { ...state.floors };
  const townKey = 'town-0';

  if (!floors[townKey]) {
    const { floor } = generateTownMap();
    floors = { ...floors, [townKey]: floor };
  }

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
    currentDungeon: 'town' as any,
    currentFloor: 0,
    returnFloor: state.currentFloor,
    floors,
    hero: { ...state.hero, position: { x: 12, y: 10 } },
    town: { ...state.town, shopInventories, deepestFloor: deepest },
    messages: [...state.messages, { text: 'You arrive in town.', severity: 'important' as const, turn: state.turn }],
  };
}

function returnToDungeon(state: GameState): GameState {
  const targetFloor = state.returnFloor;
  const floorKey = `mine-${targetFloor}`;
  const floor = state.floors[floorKey];

  if (!floor) {
    return addMessage(state, 'There is nowhere to return to.', 'system');
  }

  let arrivalPos = { x: 0, y: 0 };
  for (let y = 0; y < floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      if (floor.tiles[y][x].type === 'stairs-up') {
        arrivalPos = { x, y };
        break;
      }
    }
    if (arrivalPos.x !== 0 || arrivalPos.y !== 0) break;
  }

  return {
    ...state,
    currentDungeon: 'mine',
    currentFloor: targetFloor,
    hero: { ...state.hero, position: arrivalPos },
    messages: [...state.messages, { text: `You return to dungeon level ${targetFloor + 1}.`, severity: 'important' as const, turn: state.turn }],
  };
}

function goToFloor(state: GameState, targetFloor: number, direction: 'ascend' | 'descend'): GameState {
  const targetKey = `${state.currentDungeon}-${targetFloor}`;
  let floors = { ...state.floors };

  // Generate floor if it doesn't exist yet
  if (!floors[targetKey]) {
    const { floor: newFloor } = generateFloor(
      state.currentDungeon,
      targetFloor,
      state.rngSeed,
      true,   // has stairs up
      true,   // has stairs down
      state.difficulty,
    );
    floors = { ...floors, [targetKey]: newFloor };
  }

  const targetFloorData = floors[targetKey];

  // Find the matching stairs on the target floor
  // Going down → arrive at stairs-up on the next floor
  // Going up → arrive at stairs-down on the previous floor
  const arrivalStairType = direction === 'descend' ? 'stairs-up' : 'stairs-down';
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

  // Fallback: if no matching stairs found, use center of first room
  if (!arrivalPos) {
    arrivalPos = { x: Math.floor(targetFloorData.width / 2), y: Math.floor(targetFloorData.height / 2) };
  }

  const depthLabel = targetFloor + 1;
  const verb = direction === 'descend' ? 'descends to' : 'ascends to';

  let newState: GameState = {
    ...state,
    hero: { ...state.hero, position: arrivalPos },
    currentFloor: targetFloor,
    floors,
    turn: state.turn + 1,
    messages: [
      ...state.messages,
      { text: `${state.hero.name} ${verb} level ${depthLabel}.`, severity: 'important', turn: state.turn },
    ],
  };

  // Auto-save on floor change
  const saved = saveGame(newState, 1);
  if (saved) {
    newState = {
      ...newState,
      messages: [
        ...newState.messages,
        { text: 'Game auto-saved.', severity: 'system' as const, turn: newState.turn },
      ],
    };
  }

  return newState;
}

// Trap data matching generator definitions
const TRAP_DATA: Record<string, { damage: [number, number]; message: string; sprite: string }> = {
  pit:    { damage: [3, 8],  message: 'You fall into a pit!', sprite: 'pit-trap' },
  arrow:  { damage: [2, 6],  message: 'An arrow shoots from the wall!', sprite: 'arrow-trap' },
  fire:   { damage: [4, 10], message: 'Flames erupt beneath you!', sprite: 'fire-trap' },
  dart:   { damage: [1, 4],  message: 'A dart flies from a hidden slot!', sprite: 'dart-trap' },
  portal: { damage: [0, 0],  message: 'A portal pulls you across the room!', sprite: 'portal-trap' },
  acid:   { damage: [3, 9],  message: 'Acid sprays from the floor!', sprite: 'acid-trap' },
};

function triggerTrap(
  tile: { trapType?: string; trapRevealed?: boolean },
  hero: Hero,
  pos: Vector2,
  floor: Floor,
  _floorKey: string,
  messages: Message[],
  turn: number,
): { hero: Hero; floor: Floor } {
  const trap = TRAP_DATA[tile.trapType ?? ''];
  if (!trap) return { hero, floor };

  // Reveal the trap
  const newTiles = floor.tiles.map(row => [...row]);
  newTiles[pos.y][pos.x] = {
    ...newTiles[pos.y][pos.x],
    trapRevealed: true,
    sprite: trap.sprite,
  };
  const newFloor = { ...floor, tiles: newTiles };

  // Portal trap: teleport to random floor position
  if (tile.trapType === 'portal') {
    messages.push({ text: trap.message, severity: 'important', turn });
    for (let tries = 0; tries < 200; tries++) {
      const x = Math.floor(Math.random() * floor.width);
      const y = Math.floor(Math.random() * floor.height);
      const t = floor.tiles[y]?.[x];
      if (t?.walkable && t.type !== 'trap' && !floor.monsters.some(m => m.position.x === x && m.position.y === y)) {
        hero = { ...hero, position: { x, y } };
        messages.push({ text: 'You are teleported!', severity: 'important', turn });
        break;
      }
    }
    return { hero, floor: newFloor };
  }

  // Damage traps
  const dmg = trap.damage[0] + Math.floor(Math.random() * (trap.damage[1] - trap.damage[0] + 1));
  const newHp = Math.max(0, hero.hp - dmg);
  messages.push({ text: `${trap.message} You take ${dmg} damage. (${newHp}/${hero.maxHp} HP)`, severity: 'combat', turn });
  hero = { ...hero, hp: newHp };

  return { hero, floor: newFloor };
}

function processSave(state: GameState): GameState {
  const success = saveGame(state, 1);
  const msg = success ? 'Game saved.' : 'Failed to save game!';
  return addMessage(state, msg, 'system');
}

function addMessage(state: GameState, text: string, severity: Message['severity']): GameState {
  return {
    ...state,
    messages: [...state.messages, { text, severity, turn: state.turn }],
  };
}

function processRest(state: GameState): GameState {
  let hero = { ...state.hero };
  const messages = [...state.messages];
  const gains: string[] = [];

  // Recover 1 HP per wait if below max
  if (hero.hp < hero.maxHp) {
    hero = { ...hero, hp: Math.min(hero.maxHp, hero.hp + 1) };
    gains.push('+1 HP');
  }

  // Recover 1 MP every 2 turns of waiting
  if (hero.mp < hero.maxMp && state.turn % 2 === 0) {
    hero = { ...hero, mp: Math.min(hero.maxMp, hero.mp + 1) };
    gains.push('+1 MP');
  }

  const gainText = gains.length > 0 ? ` (${gains.join(', ')})` : '';
  messages.push({
    text: `You waited.${gainText}`,
    severity: 'system' as const,
    turn: state.turn,
  });

  return {
    ...state,
    hero,
    messages,
    turn: state.turn + 1,
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
  const newTiles = floor.tiles.map(row => [...row]);
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = pos.x + dx;
      const y = pos.y + dy;
      if (x < 0 || x >= floor.width || y < 0 || y >= floor.height) continue;

      const tile = newTiles[y][x];

      // Reveal secret doors
      if (tile.type === 'door-secret') {
        newTiles[y][x] = {
          type: 'door-closed',
          sprite: 'door-closed',
          walkable: false,
          transparent: false,
        };
        messages.push({ text: 'You found a secret door!', severity: 'important' as const, turn: state.turn });
        found++;
      }

      // Reveal hidden traps
      if (tile.type === 'trap' && !tile.trapRevealed) {
        const trapSprites: Record<string, string> = {
          pit: 'pit-trap', arrow: 'arrow-trap', fire: 'fire-trap',
          dart: 'dart-trap', portal: 'portal-trap', acid: 'acid-trap',
        };
        newTiles[y][x] = {
          ...tile,
          trapRevealed: true,
          sprite: trapSprites[tile.trapType ?? ''] ?? 'pit-trap',
        };
        messages.push({ text: `You found a ${tile.trapType} trap!`, severity: 'important' as const, turn: state.turn });
        found++;
      }
    }
  }

  if (found === 0) {
    messages.push({ text: 'You search but find nothing.', severity: 'system' as const, turn: state.turn });
  }

  return {
    ...state,
    floors: { ...state.floors, [floorKey]: { ...floor, tiles: newTiles } },
    messages,
    turn: state.turn + 1,
  };
}
