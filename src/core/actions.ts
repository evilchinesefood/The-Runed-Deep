import type { GameState, GameAction, Direction, Vector2 } from './types';

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
    case 'setScreen':
      return { ...state, screen: action.screen };
    case 'rest':
      return processRest(state);
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

  // Check for monster at target position
  const monsterAtTarget = floor.monsters.find(
    m => m.position.x === newPos.x && m.position.y === newPos.y
  );

  if (monsterAtTarget) {
    // Combat will be handled by combat system
    return state;
  }

  return {
    ...state,
    hero: { ...state.hero, position: newPos },
    turn: state.turn + 1,
  };
}

function processRest(state: GameState): GameState {
  return {
    ...state,
    turn: state.turn + 1,
  };
}
