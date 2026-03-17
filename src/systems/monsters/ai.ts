import type { GameState, Floor, Vector2 } from '../../core/types';
import { monsterAttacksPlayer } from '../combat/combat';

/**
 * Process all monster turns on the current floor.
 * Each monster: if adjacent to hero, attack. Otherwise move toward hero.
 */
export function processAllMonsterTurns(state: GameState): GameState {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  let currentState = state;

  // Process each monster — iterate by index since monsters may die between turns
  for (let i = 0; i < floor.monsters.length; i++) {
    // Re-read floor each iteration since state may have changed
    const currentFloor = currentState.floors[floorKey];
    if (!currentFloor || i >= currentFloor.monsters.length) break;

    const monster = currentFloor.monsters[i];

    // Skip dead monsters (shouldn't happen but safety check)
    if (monster.hp <= 0) continue;

    // Skip sleeping monsters
    if (monster.sleeping) continue;

    const heroPos = currentState.hero.position;
    const dist = Math.abs(monster.position.x - heroPos.x) + Math.abs(monster.position.y - heroPos.y);
    const chebyshev = Math.max(
      Math.abs(monster.position.x - heroPos.x),
      Math.abs(monster.position.y - heroPos.y)
    );

    if (chebyshev <= 1) {
      // Adjacent to hero — attack
      currentState = monsterAttacksPlayer(currentState, monster);
    } else if (dist <= 20) {
      // Within detection range — move toward hero
      currentState = moveMonsterToward(currentState, floorKey, i, heroPos);
    }
    // else: too far away, monster does nothing

    // Check if player died
    if (currentState.hero.hp <= 0) break;
  }

  return currentState;
}

/**
 * Move a monster one step toward the target position.
 * Simple greedy approach: pick the adjacent tile that's closest to target.
 */
function moveMonsterToward(
  state: GameState,
  floorKey: string,
  monsterIndex: number,
  target: Vector2,
): GameState {
  const floor = state.floors[floorKey];
  if (!floor) return state;

  const monster = floor.monsters[monsterIndex];
  const { x, y } = monster.position;

  // All 8 directions
  const deltas: Vector2[] = [
    { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
    { x: -1, y: 0 },                    { x: 1, y: 0 },
    { x: -1, y: 1 },  { x: 0, y: 1 },  { x: 1, y: 1 },
  ];

  let bestPos: Vector2 | null = null;
  let bestDist = Infinity;

  for (const d of deltas) {
    const nx = x + d.x;
    const ny = y + d.y;

    // Bounds check
    if (nx < 0 || nx >= floor.width || ny < 0 || ny >= floor.height) continue;

    // Walkable check
    if (!floor.tiles[ny][nx].walkable) continue;

    // Don't walk onto another monster
    const blocked = floor.monsters.some(
      (m, idx) => idx !== monsterIndex && m.position.x === nx && m.position.y === ny
    );
    if (blocked) continue;

    // Don't walk onto the hero (that's handled by attack)
    if (nx === target.x && ny === target.y) continue;

    const dist = Math.abs(nx - target.x) + Math.abs(ny - target.y);
    if (dist < bestDist) {
      bestDist = dist;
      bestPos = { x: nx, y: ny };
    }
  }

  if (!bestPos) return state; // Can't move

  // Update monster position
  const newMonsters = [...floor.monsters];
  newMonsters[monsterIndex] = { ...monster, position: bestPos };
  const newFloor: Floor = { ...floor, monsters: newMonsters };

  return {
    ...state,
    floors: { ...state.floors, [floorKey]: newFloor },
  };
}
