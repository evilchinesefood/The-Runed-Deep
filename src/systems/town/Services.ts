// ============================================================
// Town services — temple, sage, bank, inn
// ============================================================

import type { GameState } from '../../core/types';
import { ITEM_BY_ID } from '../../data/items';
import { recomputeDerivedStats } from '../character/derived-stats';

function addMsg(state: GameState, text: string, severity: 'normal' | 'important' | 'system' = 'important'): GameState {
  return { ...state, messages: [...state.messages, { text, severity, turn: state.turn }] };
}

function spendCopper(state: GameState, amount: number): GameState {
  return { ...state, hero: { ...state.hero, copper: state.hero.copper - amount } };
}

function checkCopper(state: GameState, cost: number): GameState | null {
  if (state.hero.copper < cost) {
    return addMsg(state, `You need ${cost} gold for that.`, 'system');
  }
  return null;
}

// ── Temple (all free except remove curse) ─────────────────

export function templeHealHP(state: GameState): GameState {
  const missing = state.hero.maxHp - state.hero.hp;
  if (missing <= 0) return addMsg(state, 'Your health is already full.', 'system');
  return addMsg({ ...state, hero: { ...state.hero, hp: state.hero.maxHp } }, 'The temple heals you fully.');
}

export function templeHealMP(state: GameState): GameState {
  const missing = state.hero.maxMp - state.hero.mp;
  if (missing <= 0) return addMsg(state, 'Your mana is already full.', 'system');
  return addMsg({ ...state, hero: { ...state.hero, mp: state.hero.maxMp } }, 'The temple restores your mana.');
}

export function templeRemoveCurse(state: GameState): GameState {
  const cost = 25;
  const err = checkCopper(state, cost);
  if (err) return err;

  const eq = state.hero.equipment;
  const slots = Object.keys(eq) as (keyof typeof eq)[];
  const slot = slots.find(s => eq[s] && eq[s]!.cursed);

  if (!slot) return addMsg(state, 'You bear no cursed items.', 'system');

  const item = eq[slot]!;
  // Look up base template to restore original sprite and name
  const tpl = ITEM_BY_ID[item.templateId];
  const baseName = tpl ? tpl.name : item.name.replace(/ -\d+$/, '');
  const baseSprite = tpl ? tpl.sprite : item.sprite.replace(/-cursed$/, '');
  const newItem = { ...item, cursed: false, identified: true, enchantment: 0, name: baseName, sprite: baseSprite };
  return addMsg(spendCopper({ ...state, hero: { ...state.hero, equipment: { ...eq, [slot]: newItem } } }, cost), `The curse is lifted from your ${baseName}. (${cost} gold)`);
}

export function templeCurePoison(state: GameState): GameState {
  const poisoned = state.hero.activeEffects.some(e => e.id === 'poisoned');
  if (!poisoned) return addMsg(state, 'You are not poisoned.', 'system');
  return addMsg({ ...state, hero: { ...state.hero, activeEffects: state.hero.activeEffects.filter(e => e.id !== 'poisoned') } }, 'The poison is purged from your body.');
}

// ── Sage ─────────────────────────────────────────────────

export function sageIdentifyOne(state: GameState, itemId: string): GameState {
  const cost = 8;
  const err = checkCopper(state, cost);
  if (err) return err;

  const invIdx = state.hero.inventory.findIndex(i => i.id === itemId);
  if (invIdx !== -1) {
    const item = state.hero.inventory[invIdx];
    const identified = { ...item, identified: true };
    const inv = state.hero.inventory.map((i, idx) => (idx === invIdx ? identified : i));
    return addMsg(spendCopper({ ...state, hero: { ...state.hero, inventory: inv } }, cost), `The sage identifies your ${identified.name}.`);
  }

  const eq = state.hero.equipment;
  const slots = Object.keys(eq) as (keyof typeof eq)[];
  const slot = slots.find(s => eq[s]?.id === itemId);
  if (slot) {
    const item = eq[slot]!;
    const identified = { ...item, identified: true };
    return addMsg(spendCopper({ ...state, hero: { ...state.hero, equipment: { ...eq, [slot]: identified } } }, cost), `The sage identifies your ${identified.name}.`);
  }

  return addMsg(state, 'Item not found.', 'system');
}

export function sageIdentifyAll(state: GameState): GameState {
  const unidentInv = state.hero.inventory.filter(i => !i.identified);
  const eq = state.hero.equipment;
  const slots = Object.keys(eq) as (keyof typeof eq)[];
  const unidentEqSlots = slots.filter(s => eq[s] && !eq[s]!.identified);

  const count = unidentInv.length + unidentEqSlots.length;
  if (count === 0) return addMsg(state, 'All your items are already identified.', 'system');

  const cost = 6 * count;
  const err = checkCopper(state, cost);
  if (err) return err;

  const inv = state.hero.inventory.map(i => ({ ...i, identified: true }));
  const newEq = { ...eq };
  for (const s of unidentEqSlots) {
    newEq[s] = { ...newEq[s]!, identified: true };
  }

  return addMsg(spendCopper({ ...state, hero: { ...state.hero, inventory: inv, equipment: newEq } }, cost), `The sage identifies all ${count} item${count > 1 ? 's' : ''} for ${cost} gold.`);
}

// ── Bank ─────────────────────────────────────────────────

export function bankDeposit(state: GameState, amount: number): GameState {
  const actual = Math.min(amount, state.hero.copper);
  if (actual <= 0) return addMsg(state, 'You have no gold to deposit.', 'system');
  return addMsg({
    ...state,
    hero: { ...state.hero, copper: state.hero.copper - actual },
    town: { ...state.town, bankBalance: state.town.bankBalance + actual },
  }, `You deposit ${actual} gold.`);
}

export function bankWithdraw(state: GameState, amount: number): GameState {
  const actual = Math.min(amount, state.town.bankBalance);
  if (actual <= 0) return addMsg(state, 'Nothing to withdraw.', 'system');
  return addMsg({
    ...state,
    hero: { ...state.hero, copper: state.hero.copper + actual },
    town: { ...state.town, bankBalance: state.town.bankBalance - actual },
  }, `You withdraw ${actual} gold.`);
}

// ── Inn (free) ──────────────────────────────────────────

export function innRest(state: GameState): GameState {
  if (state.hero.hp >= state.hero.maxHp && state.hero.mp >= state.hero.maxMp) {
    return addMsg(state, 'You are already fully rested.', 'system');
  }

  const rested = recomputeDerivedStats({ ...state.hero, hp: state.hero.maxHp, mp: state.hero.maxMp });
  return addMsg({ ...state, hero: rested }, 'You sleep soundly and wake fully restored.');
}
