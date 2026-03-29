// ============================================================
// Service screen — temple, sage, bank, inn
// ============================================================

import type { GameState } from '../core/types';
import { ITEM_BY_ID } from '../data/items';
import { createScreen, createTitleBar, createPanel, createButton, el } from './Theme';
import {
  templeHealHP, templeHealMP, templeCurePoison, templeRemoveCurse,
  sageEnchantItem, getEnchanterCap,
  bankDeposit, bankWithdraw,
  innRest,
} from '../systems/town/Services';

const BUILDING_NAMES: Record<string, string> = {
  temple: 'Temple of Odin',
  sage: 'The Sage',
  bank: 'Bank',
  inn: 'The Resting Stag Inn',
};

function greyBtn(btn: HTMLButtonElement, disabled: boolean): void {
  btn.disabled = disabled;
  btn.style.opacity = disabled ? '0.4' : '1';
  btn.style.cursor = disabled ? 'not-allowed' : 'pointer';
}

function buildTemple(state: GameState, onUpdate: (s: GameState) => void): HTMLElement {
  const panel = createPanel('Services');

  const missingHP = state.hero.maxHp - state.hero.hp;
  const missingMP = state.hero.maxMp - state.hero.mp;
  const isPoisoned = state.hero.activeEffects.some(e => e.id === 'poisoned');

  const items: [string, number, boolean, () => GameState][] = [
    ['Heal HP (free)', 0, missingHP <= 0, () => templeHealHP(state)],
    ['Restore MP (free)', 0, missingMP <= 0, () => templeHealMP(state)],
    ['Cure Poison (free)', 0, !isPoisoned, () => templeCurePoison(state)],
  ];

  for (const [label, , disabled, action] of items) {
    const btn = createButton(label);
    Object.assign(btn.style, { display: 'block', width: '100%', marginBottom: '6px', textAlign: 'left' });
    greyBtn(btn, disabled);
    btn.addEventListener('click', () => onUpdate(action()));
    panel.appendChild(btn);
  }

  // Remove Curse — list cursed items from inventory + equipment
  const cursedItems: { id: string; name: string; source: string }[] = [];
  for (const item of state.hero.inventory) {
    if (item.cursed) cursedItems.push({ id: item.id, name: item.name, source: 'inv' });
  }
  for (const [, item] of Object.entries(state.hero.equipment)) {
    if (item?.cursed) cursedItems.push({ id: item.id, name: `${item.name} (equipped)`, source: 'eq' });
  }

  if (cursedItems.length > 0) {
    panel.appendChild(el('div', { color: '#c90', fontSize: '13px', fontWeight: 'bold', margin: '12px 0 6px', borderTop: '1px solid #444', paddingTop: '8px' }, 'Remove Curse (25g)'));
    for (const ci of cursedItems) {
      const canAfford = state.hero.copper >= 25;
      const btn = createButton(`Bless: ${ci.name}`);
      Object.assign(btn.style, { display: 'block', width: '100%', marginBottom: '4px', textAlign: 'left', fontSize: '12px' });
      greyBtn(btn, !canAfford);
      btn.addEventListener('click', () => onUpdate(templeRemoveCurse(state, ci.id)));
      panel.appendChild(btn);
    }
  }

  return panel;
}

function buildSage(state: GameState, onUpdate: (s: GameState) => void): HTMLElement {
  const panel = createPanel('Enchantment (100g)');

  // List equippable items from inventory + equipment
  const cap = getEnchanterCap(state.ngPlusCount ?? 0);
  const enchantable: { id: string; name: string; atCap: boolean }[] = [];
  for (const item of state.hero.inventory) {
    if (ITEM_BY_ID[item.templateId]?.equipSlot && !item.cursed) {
      const ups = item.properties['enchanterUps'] ?? 0;
      enchantable.push({ id: item.id, name: item.name, atCap: ups >= cap });
    }
  }
  for (const [, item] of Object.entries(state.hero.equipment)) {
    if (item && !item.cursed) {
      const ups = item.properties['enchanterUps'] ?? 0;
      enchantable.push({ id: item.id, name: `${item.name} (equipped)`, atCap: ups >= cap });
    }
  }

  if (enchantable.length === 0) {
    panel.appendChild(el('div', { color: '#555', fontSize: '12px', fontStyle: 'italic' }, 'No items to enchant.'));
  } else {
    panel.appendChild(el('div', { color: '#888', fontSize: '11px', marginBottom: '6px' }, `Enhance equipment by +1. (Limit: +${cap} per item)`));
    for (const ei of enchantable) {
      const canAfford = state.hero.copper >= 100 && !ei.atCap;
      const label = ei.atCap ? `MAX: ${ei.name}` : `+1: ${ei.name}`;
      const btn = createButton(label);
      Object.assign(btn.style, { display: 'block', width: '100%', marginBottom: '4px', textAlign: 'left', fontSize: '12px' });
      greyBtn(btn, !canAfford);
      if (!ei.atCap) btn.addEventListener('click', () => onUpdate(sageEnchantItem(state, ei.id)));
      panel.appendChild(btn);
    }
  }

  return panel;
}

function buildBank(state: GameState, onUpdate: (s: GameState) => void): HTMLElement {
  const panel = createPanel('Banking');

  panel.appendChild(el('div', { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }, ''));
  const onHand = el('div', { fontSize: '13px', color: '#ccc', marginBottom: '4px' }, `On hand: ${state.hero.copper} gold`);
  const inBank = el('div', { fontSize: '13px', color: '#ccc', marginBottom: '12px' }, `In bank: ${state.town.bankBalance} gold`);
  panel.appendChild(onHand);
  panel.appendChild(inBank);

  const btnRow = el('div', { display: 'flex', gap: '8px' });

  const depBtn = createButton('Deposit All');
  greyBtn(depBtn, state.hero.copper <= 0);
  depBtn.addEventListener('click', () => onUpdate(bankDeposit(state, state.hero.copper)));
  btnRow.appendChild(depBtn);

  const wdBtn = createButton('Withdraw All');
  greyBtn(wdBtn, state.town.bankBalance <= 0);
  wdBtn.addEventListener('click', () => onUpdate(bankWithdraw(state, state.town.bankBalance)));
  btnRow.appendChild(wdBtn);

  panel.appendChild(btnRow);
  return panel;
}

function buildInn(state: GameState, onUpdate: (s: GameState) => void): HTMLElement {
  const panel = createPanel('Rest');

  const alreadyFull = state.hero.hp >= state.hero.maxHp && state.hero.mp >= state.hero.maxMp;

  const btn = createButton('Rest for the Night (free)', 'primary');
  Object.assign(btn.style, { display: 'block', width: '100%', marginTop: '4px' });
  greyBtn(btn, alreadyFull);
  btn.addEventListener('click', () => onUpdate(innRest(state)));
  panel.appendChild(btn);

  if (alreadyFull) {
    panel.appendChild(el('div', { color: '#555', fontSize: '12px', marginTop: '6px', fontStyle: 'italic' }, 'You are already fully rested.'));
  }

  return panel;
}

export function createServiceScreen(
  initialState: GameState,
  buildingId: string,
  onUpdate: (newState: GameState) => void,
  onClose: () => void,
): HTMLElement & { cleanup: () => void } {
  let state = initialState;
  const title = BUILDING_NAMES[buildingId] ?? buildingId;

  const screen = createScreen() as HTMLElement & { cleanup: () => void };

  function render(): void {
    screen.replaceChildren();

    const bar = createTitleBar(title, onClose);
    screen.appendChild(bar);

    const copper = el('div', { color: '#c90', fontSize: '13px', marginBottom: '8px' });
    copper.textContent = `Gold: ${state.hero.copper}`;
    screen.appendChild(copper);

    function handleUpdate(next: GameState): void {
      state = next;
      onUpdate(next);
      render();
    }

    let content: HTMLElement;
    switch (buildingId) {
      case 'temple':  content = buildTemple(state, handleUpdate); break;
      case 'sage':    content = buildSage(state, handleUpdate); break;
      case 'bank':    content = buildBank(state, handleUpdate); break;
      case 'inn':     content = buildInn(state, handleUpdate); break;
      default:
        content = createPanel('Unknown Service');
        content.appendChild(el('div', { color: '#888' }, 'No services available here.'));
    }

    screen.appendChild(content);
    screen.appendChild(el('div', { color: '#555', fontSize: '11px', marginTop: '4px' }, 'Press Esc to close'));
  }

  render();

  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
  document.addEventListener('keydown', onKey);

  screen.cleanup = () => document.removeEventListener('keydown', onKey);

  return screen;
}
