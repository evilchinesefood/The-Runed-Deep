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

  const picked = itemsHere[0];
  const messages: Message[] = [];
  let hero = { ...state.hero };

  if (picked.item.category === 'currency') {
    const amount = picked.item.properties['amount'] ?? picked.item.value;
    hero = { ...hero, copper: hero.copper + amount };
    messages.push({ text: `Picked up ${picked.item.name}.`, severity: 'normal', turn: state.turn });
  } else {
    hero = { ...hero, inventory: [...hero.inventory, picked.item] };
    messages.push({ text: `Picked up ${picked.item.name}.`, severity: 'normal', turn: state.turn });
  }

  const newItems = floor.items.filter(i => i !== picked);
  const newFloor = { ...floor, items: newItems };

  return {
    ...state,
    hero,
    floors: { ...state.floors, [floorKey]: newFloor },
    messages: [...state.messages, ...messages],
    turn: state.turn + 1,
  };
}
