import type { GameState, EquipSlot, Message } from '../../core/types';
import { ITEM_BY_ID } from '../../data/items';
import { recomputeDerivedStats } from '../character/derived-stats';
import { Sound } from '../Sound';
import { trackEquipmentCheck } from '../Achievements';

function msg(text: string, turn: number, severity: Message['severity'] = 'normal'): Message {
  return { text, severity, turn };
}

export function processEquipItem(state: GameState, itemId: string): GameState {
  const hero = { ...state.hero };
  const item = hero.inventory.find(i => i.id === itemId);
  if (!item) return state;

  const template = ITEM_BY_ID[item.templateId];
  if (!template || !template.equipSlot) {
    return {
      ...state,
      messages: [...state.messages, msg(`${item.name} cannot be equipped.`, state.turn, 'system')],
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
      if (shield.cursed) {
        if (!shield.identified) {
          equipment = { ...equipment, shield: { ...shield, identified: true } };
        }
        return {
          ...state,
          hero: { ...hero, equipment },
          messages: [
            ...state.messages,
            msg(`Cannot equip two-handed weapon — your shield is cursed!`, state.turn, 'important'),
          ],
        };
      }
      inventory = [...inventory, shield];
      equipment = { ...equipment, shield: null };
      messages.push(msg(`Unequipped ${shield.name}.`, state.turn));
    }
  }

  // If slot is occupied, check curse before swapping
  const existing = equipment[slot];
  if (existing) {
    if (existing.cursed) {
      const revealed = !existing.identified;
      if (revealed) {
        equipment = { ...equipment, [slot]: { ...existing, identified: true } };
      }
      return {
        ...state,
        hero: { ...hero, equipment },
        messages: [
          ...state.messages,
          msg(`${existing.name} is cursed and cannot be removed!`, state.turn, 'important'),
        ],
      };
    }
    inventory = [...inventory, existing];
    messages.push(msg(`Unequipped ${existing.name}.`, state.turn));
  }

  // Remove new item from inventory and place in slot
  // Equipping an item immediately identifies it
  const equippedItem = item.identified ? item : { ...item, identified: true };
  inventory = inventory.filter(i => i.id !== itemId);
  equipment = { ...equipment, [slot]: equippedItem };
  messages.push(msg(`Equipped ${equippedItem.name}.`, state.turn));

  const updatedHero = recomputeDerivedStats({ ...hero, equipment, inventory });

  trackEquipmentCheck(updatedHero.equipment as unknown as Record<string, unknown>);

  Sound.equip();
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

  if (item.cursed) {
    let equipment = hero.equipment;
    const messages: Message[] = [];
    if (!item.identified) {
      equipment = { ...equipment, [slot]: { ...item, identified: true } };
      messages.push(msg(`${item.name} is cursed and cannot be removed!`, state.turn, 'important'));
    } else {
      messages.push(msg(`${item.name} is cursed and cannot be removed!`, state.turn, 'important'));
    }
    return {
      ...state,
      hero: { ...hero, equipment },
      messages: [...state.messages, ...messages],
    };
  }

  const equipment = { ...hero.equipment, [slot]: null };
  const inventory = [...hero.inventory, item];
  const updatedHero = recomputeDerivedStats({ ...hero, equipment, inventory });

  Sound.equip();
  return {
    ...state,
    hero: updatedHero,
    messages: [
      ...state.messages,
      msg(`Unequipped ${item.name}.`, state.turn),
    ],
  };
}
