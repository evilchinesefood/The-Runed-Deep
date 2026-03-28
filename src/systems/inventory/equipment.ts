import type { GameState, EquipSlot, Message } from '../../core/types';
import { ITEM_BY_ID } from '../../data/items';
import { recomputeDerivedStats } from '../character/derived-stats';
import { Sound } from '../Sound';
import { trackEquipmentCheck } from '../Achievements';
import { getDisplayName } from './display-name';
import { showGameToast } from '../../ui/GameToast';

function msg(text: string, turn: number, severity: Message['severity'] = 'normal'): Message {
  return { text, severity, turn };
}

export function processEquipItem(state: GameState, itemId: string): GameState {
  const hero = { ...state.hero };
  const item = hero.inventory.find(i => i.id === itemId);
  if (!item) return state;

  const template = ITEM_BY_ID[item.templateId];
  if (!template || !template.equipSlot) {
    showGameToast(`${getDisplayName(item)} cannot be equipped.`, 'warning');
    return {
      ...state,
      messages: [...state.messages, msg(`${getDisplayName(item)} cannot be equipped.`, state.turn, 'system')],
    };
  }

  const messages: Message[] = [];
  let slot: EquipSlot = template.equipSlot;
  let equipment = { ...hero.equipment };
  let inventory = [...hero.inventory];

  // Ring slot resolution
  if (slot === 'ringLeft') {
    if (!equipment.ringLeft) slot = 'ringLeft';
    else if (!equipment.ringRight) slot = 'ringRight';
    else slot = 'ringLeft';
  }

  // Two-handed weapon: unequip shield if needed
  if (slot === 'weapon' && item.properties['twoHanded']) {
    const shield = equipment.shield;
    if (shield) {
      inventory = [...inventory, shield];
      equipment = { ...equipment, shield: null };
      messages.push(msg(`Unequipped ${shield.name}.`, state.turn));
    }
  }

  // If slot is occupied, swap to inventory
  const existing = equipment[slot];
  if (existing) {
    inventory = [...inventory, existing];
    messages.push(msg(`Unequipped ${existing.name}.`, state.turn));
  }

  // Remove new item from inventory and place in slot
  const equippedItem = item;
  inventory = inventory.filter(i => i.id !== itemId);
  equipment = { ...equipment, [slot]: equippedItem };
  messages.push(msg(`Equipped ${equippedItem.name}.`, state.turn));

  const updatedHero = recomputeDerivedStats({ ...hero, equipment, inventory });

  trackEquipmentCheck(updatedHero.equipment as unknown as Record<string, unknown>);

  Sound.equip();
  const slotNames: Record<string, string> = { weapon: 'Weapon', shield: 'Shield', helmet: 'Head', body: 'Body', cloak: 'Cloak', gauntlets: 'Gloves', belt: 'Belt', boots: 'Feet', ringLeft: 'Ring L', ringRight: 'Ring R', amulet: 'Neck', pack: 'Pack', purse: 'Purse' };
  showGameToast(`Equipped ${equippedItem.name} → ${slotNames[slot] ?? slot}`, 'success');
  return {
    ...state,
    hero: updatedHero,
    messages: [...state.messages, ...messages],
  };
}

export function processUnequipItem(state: GameState, slot: EquipSlot): GameState {
  const hero = { ...state.hero };
  const item = hero.equipment[slot];
  if (!item) return state;

  const equipment = { ...hero.equipment, [slot]: null };
  const inventory = [...hero.inventory, item];
  const updatedHero = recomputeDerivedStats({ ...hero, equipment, inventory });

  Sound.equip();
  showGameToast(`Unequipped ${item.name}`, 'info');
  return {
    ...state,
    hero: updatedHero,
    messages: [
      ...state.messages,
      msg(`Unequipped ${item.name}.`, state.turn),
    ],
  };
}
