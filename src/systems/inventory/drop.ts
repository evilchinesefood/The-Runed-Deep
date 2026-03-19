import type { GameState } from '../../core/types';
import { showGameToast } from '../../ui/GameToast';

export function processDropItem(state: GameState, itemId: string): GameState {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  const idx = state.hero.inventory.findIndex(i => i.id === itemId);
  if (idx === -1) return state;

  const item = state.hero.inventory[idx];
  const newInventory = [...state.hero.inventory];
  newInventory.splice(idx, 1);

  const newItems = [...floor.items, { item, position: { ...state.hero.position } }];
  const newFloor = { ...floor, items: newItems };

  showGameToast(`Dropped ${item.name}`, 'info');
  return {
    ...state,
    hero: { ...state.hero, inventory: newInventory },
    floors: { ...state.floors, [floorKey]: newFloor },
    messages: [...state.messages, {
      text: `Dropped ${item.name}.`,
      severity: 'normal' as const,
      turn: state.turn,
    }],
    turn: state.turn + 1,
  };
}
