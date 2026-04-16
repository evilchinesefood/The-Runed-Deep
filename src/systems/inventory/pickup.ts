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
  // Pick up items within 1 tile of the player (3x3 area)
  const itemsHere = floor.items.filter(
    (i) =>
      Math.abs(i.position.x - pos.x) <= 1 &&
      Math.abs(i.position.y - pos.y) <= 1,
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
  let gold = hero.gold;

  // Base carry capacity 10kg (10000g), pack adds to it
  // Enchantment modifies capacity: +5kg per level, -5kg per cursed level
  const BASE_CARRY = 10000;
  const packItem = hero.equipment.pack;
  const packTpl = packItem ? ITEM_BY_ID[packItem.templateId] : null;
  const basePackWeight =
    packItem?.properties["weightCapacity"] ?? packTpl?.weightCapacity ?? 0;
  const enchBonus = packItem ? packItem.enchantment * 5000 : 0;
  let packCap = BASE_CARRY + Math.max(0, basePackWeight + enchBonus);
  // Belt of the Titan: double carry capacity
  for (const eq of Object.values(hero.equipment)) {
    if (eq && ITEM_BY_ID[eq.templateId]?.uniqueAbility === 'titan-power') { packCap *= 2; break; }
  }

  // Track picked up item IDs
  const pickedIds = new Set<string>();
  // First ground item that didn't fit — opens the swap drawer
  let pendingPackSwap: { groundItemId: string } | null = null;

  for (const placed of itemsHere) {
    if (placed.item.category === "currency") {
      const amount = placed.item.properties["amount"] ?? placed.item.value;
      gold += amount;
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
        if (!pendingPackSwap)
          pendingPackSwap = { groundItemId: placed.item.id };
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

  hero = { ...hero, inventory, gold };

  // Remove all picked-up items by ID (covers 3x3 area)
  const remaining = floor.items.filter((i) => !pickedIds.has(i.item.id));
  const newFloor = { ...floor, items: remaining };

  return {
    ...state,
    hero,
    floors: { ...state.floors, [floorKey]: newFloor },
    messages: [...state.messages, ...messages],
    pendingPackSwap,
    turn: state.turn + 1,
  };
}

export function processSwapPickup(
  state: GameState,
  dropItemId: string,
  pickupItemId: string,
): GameState {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return { ...state, pendingPackSwap: null };

  const groundIdx = floor.items.findIndex((i) => i.item.id === pickupItemId);
  if (groundIdx === -1) return { ...state, pendingPackSwap: null };
  const ground = floor.items[groundIdx];

  const dropIdx = state.hero.inventory.findIndex((i) => i.id === dropItemId);
  if (dropIdx === -1) return state;
  const droppedItem = state.hero.inventory[dropIdx];

  const BASE_CARRY = 10000;
  const packItem = state.hero.equipment.pack;
  const packTpl = packItem ? ITEM_BY_ID[packItem.templateId] : null;
  const basePackWeight =
    packItem?.properties["weightCapacity"] ?? packTpl?.weightCapacity ?? 0;
  const enchBonus = packItem ? packItem.enchantment * 5000 : 0;
  let packCap = BASE_CARRY + Math.max(0, basePackWeight + enchBonus);
  for (const eq of Object.values(state.hero.equipment)) {
    if (eq && ITEM_BY_ID[eq.templateId]?.uniqueAbility === "titan-power") {
      packCap *= 2;
      break;
    }
  }
  const currentWeight = state.hero.inventory.reduce((s, i) => s + i.weight, 0);
  if (currentWeight - droppedItem.weight + ground.item.weight > packCap) {
    showGameToast("Still too heavy.", "warning");
    return state;
  }

  const newInventory = [...state.hero.inventory];
  newInventory.splice(dropIdx, 1);
  newInventory.push(ground.item);

  const newItems = floor.items.filter((_, i) => i !== groundIdx);
  newItems.push({ item: droppedItem, position: { ...state.hero.position } });

  Sound.pickup();
  showGameToast(
    `Swapped ${getDisplayName(droppedItem)} \u2194 ${getDisplayName(ground.item)}`,
    "info",
  );
  trackItemPickup();
  if (ground.item.specialEnchantments)
    trackItemFound(ground.item.specialEnchantments);

  return {
    ...state,
    hero: { ...state.hero, inventory: newInventory },
    floors: {
      ...state.floors,
      [floorKey]: { ...floor, items: newItems },
    },
    messages: [
      ...state.messages,
      {
        text: `Dropped ${getDisplayName(droppedItem)} and picked up ${getDisplayName(ground.item)}.`,
        severity: "normal" as const,
        turn: state.turn,
      },
    ],
    pendingPackSwap: null,
    turn: state.turn + 1,
  };
}

export function processDismissPackSwap(state: GameState): GameState {
  if (!state.pendingPackSwap) return state;
  return { ...state, pendingPackSwap: null };
}
