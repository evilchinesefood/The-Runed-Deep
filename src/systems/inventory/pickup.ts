import type { GameState, Message } from "../../core/types";
import { ITEM_BY_ID } from "../../data/items";
import { Sound } from "../Sound";
import { trackItemPickup, trackItemFound } from "../Achievements";
import { showGameToast } from "../../ui/GameToast";
import { getDisplayName } from "../inventory/display-name";

export function processPickupItem(state: GameState): GameState {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  const pos = state.hero.position;
  const itemsHere = floor.items.filter(
    (i) => i.position.x === pos.x && i.position.y === pos.y,
  );

  if (itemsHere.length === 0) {
    return {
      ...state,
      messages: [
        ...state.messages,
        {
          text: "There is nothing here to pick up.",
          severity: "system" as const,
          turn: state.turn,
        },
      ],
    };
  }

  // Pick up ALL items at this position
  const messages: Message[] = [];
  let hero = { ...state.hero };
  let inventory = [...hero.inventory];
  let copper = hero.copper;

  // Base carry capacity 10kg (10000g), pack adds to it
  const BASE_CARRY = 10000;
  const packItem = hero.equipment.pack;
  const packTpl = packItem ? ITEM_BY_ID[packItem.templateId] : null;
  let packWeight =
    packItem?.properties["weightCapacity"] ?? packTpl?.weightCapacity ?? 0;
  // Cursed packs reduce capacity (enchantment * 3000g per level)
  if (packItem && packItem.cursed && packItem.enchantment < 0) {
    packWeight = Math.max(0, packWeight + packItem.enchantment * 3000);
  }
  const packCap = BASE_CARRY + packWeight;

  // Track picked up item IDs
  const pickedIds = new Set<string>();

  for (const placed of itemsHere) {
    if (placed.item.category === "currency") {
      const amount = placed.item.properties["amount"] ?? placed.item.value;
      copper += amount;
      pickedIds.add(placed.item.id);
      messages.push({
        text: `Picked up ${placed.item.name}.`,
        severity: "normal",
        turn: state.turn,
      });
      Sound.goldPickup();
    } else {
      const currentWeight = inventory.reduce((s, i) => s + i.weight, 0);
      if (currentWeight + placed.item.weight > packCap) {
        messages.push({
          text: "Your pack is too full!",
          severity: "important",
          turn: state.turn,
        });
        showGameToast("Your pack is too full!", "warning");
        continue;
      }
      inventory.push(placed.item);
      pickedIds.add(placed.item.id);
      messages.push({
        text: `Picked up ${getDisplayName(placed.item)}.`,
        severity: "normal",
        turn: state.turn,
      });
      Sound.pickup();
      trackItemPickup();
      if (placed.item.specialEnchantments)
        trackItemFound(placed.item.specialEnchantments);
    }
  }

  hero = { ...hero, inventory, copper };

  // Only remove items that were actually picked up
  const remaining = floor.items.filter(
    (i) =>
      !(
        i.position.x === pos.x &&
        i.position.y === pos.y &&
        pickedIds.has(i.item.id)
      ),
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
