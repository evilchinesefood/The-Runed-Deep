import type { GameState, GameAction, Direction, Vector2, Message } from './types';
import { generateFloor } from '../systems/dungeon/generator';
import { playerAttacksMonster } from '../systems/combat/combat';
import { castSpell } from '../systems/spells/casting';
import { saveGame } from './save-load';
import { processPickupItem } from '../systems/inventory/pickup';
import { processDropItem } from '../systems/inventory/drop';
import { processEquipItem, processUnequipItem } from '../systems/inventory/equipment';
import { processUseItem } from '../systems/inventory/use-item';

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
  if (!tile.walkable) return state;

  // Check for monster at target position — attack it
  const monsterAtTarget = floor.monsters.find(
    m => m.position.x === newPos.x && m.position.y === newPos.y
  );

  if (monsterAtTarget) {
    return playerAttacksMonster(state, monsterAtTarget.id);
  }

  // Check for items at new position
  const itemsAtPos = floor.items.filter(
    i => i.position.x === newPos.x && i.position.y === newPos.y
  );
  const messages = [...state.messages];
  if (itemsAtPos.length === 1) {
    messages.push({
      text: `You see ${itemsAtPos[0].item.name} on the ground. (G to pick up)`,
      severity: 'normal' as const,
      turn: state.turn + 1,
    });
  } else if (itemsAtPos.length > 1) {
    messages.push({
      text: `You see ${itemsAtPos.length} items on the ground. (G to pick up)`,
      severity: 'normal' as const,
      turn: state.turn + 1,
    });
  }

  return {
    ...state,
    hero: { ...state.hero, position: newPos },
    messages,
    turn: state.turn + 1,
  };
}

function processCastSpell(state: GameState, action: Extract<GameAction, { type: 'castSpell' }>): GameState {
  return castSpell(state, action.spellId, action.direction, action.target);
}

function processUseStairs(state: GameState): GameState {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  const heroTile = floor.tiles[state.hero.position.y][state.hero.position.x];

  if (heroTile.type === 'stairs-down') {
    return goToFloor(state, state.currentFloor + 1, 'descend');
  } else if (heroTile.type === 'stairs-up') {
    if (state.currentFloor === 0) {
      // TODO: Return to town
      return addMessage(state, 'You cannot go up from here yet.', 'system');
    }
    return goToFloor(state, state.currentFloor - 1, 'ascend');
  }

  return addMessage(state, 'There are no stairs here.', 'system');
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

  const newState: GameState = {
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
  saveGame(newState, 1);

  return newState;
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
  return {
    ...state,
    turn: state.turn + 1,
  };
}
