import type { GameState, Message } from '../../core/types';

export function processPickupItem(state: GameState): GameState {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  const pos = state.hero.position;
  const itemsHere = floor.items.filter(
    i => i.position.x === pos.x && i.position.y === pos.y
  );

  if (itemsHere.length === 0) {
    return {
      ...state,
      messages: [...state.messages, {
        text: 'There is nothing here to pick up.',
        severity: 'system' as const,
        turn: state.turn,
      }],
    };
  }

  // Pick up ALL items at this position
  const messages: Message[] = [];
  let hero = { ...state.hero };
  let inventory = [...hero.inventory];
  let copper = hero.copper;

  for (const placed of itemsHere) {
    if (placed.item.category === 'currency') {
      const amount = placed.item.properties['amount'] ?? placed.item.value;
      copper += amount;
      messages.push({ text: `Picked up ${placed.item.name}.`, severity: 'normal', turn: state.turn });
    } else {
      inventory.push(placed.item);
      messages.push({ text: `Picked up ${placed.item.name}.`, severity: 'normal', turn: state.turn });
    }
  }

  hero = { ...hero, inventory, copper };

  // Remove all picked items from floor
  const remaining = floor.items.filter(
    i => i.position.x !== pos.x || i.position.y !== pos.y
  );
  const newFloor = { ...floor, items: remaining };

  return {
    ...state,
    hero,
    floors: { ...state.floors, [floorKey]: newFloor },
    messages: [...state.messages, ...messages],
    turn: state.turn + 1,
  };
}
