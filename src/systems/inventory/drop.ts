import type { GameState } from '../../core/types';
import { showGameToast } from '../../ui/GameToast';
import { getDisplayName } from './display-name';

export function processDropItem(state: GameState, itemId: string): GameState {
  console.log('[DROP] itemId:', itemId);
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  // Can't drop on decor, doors, stairs, water
  const heroTile = floor.tiles[state.hero.position.y]?.[state.hero.position.x];
  const dropTileType = heroTile?.type;
  if (dropTileType && dropTileType !== 'floor' && dropTileType !== 'trap' && dropTileType !== 'path' && dropTileType !== 'grass') {
    showGameToast("You can't drop items here.", 'warning');
    return {
      ...state,
      messages: [...state.messages, { text: "You can't drop items here.", severity: 'system' as const, turn: state.turn }],
    };
  }

  const idx = state.hero.inventory.findIndex(i => i.id === itemId);
  console.log('[DROP] found idx:', idx, idx >= 0 ? `${state.hero.inventory[idx].name} (${state.hero.inventory[idx].templateId})` : 'NOT FOUND');
  if (idx === -1) return state;

  const item = state.hero.inventory[idx];
  const newInventory = [...state.hero.inventory];
  newInventory.splice(idx, 1);

  const newItems = [...floor.items, { item, position: { ...state.hero.position } }];
  const newFloor = { ...floor, items: newItems };

  const dName = getDisplayName(item);
  showGameToast(`Dropped ${dName}`, 'info');
  return {
    ...state,
    hero: { ...state.hero, inventory: newInventory },
    floors: { ...state.floors, [floorKey]: newFloor },
    messages: [...state.messages, {
      text: `Dropped ${dName}.`,
      severity: 'normal' as const,
      turn: state.turn,
    }],
    turn: state.turn + 1,
  };
}
