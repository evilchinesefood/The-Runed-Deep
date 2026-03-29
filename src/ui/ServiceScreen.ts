// ============================================================
// Service screen — temple, sage, bank, inn
// ============================================================

import type { GameState } from '../core/types';
import { ITEM_BY_ID } from '../data/items';
import { createScreen, createTitleBar, createPanel, createButton, el } from './Theme';
import {
  templeHealHP, templeHealMP, templeCurePoison, templeRemoveCurse,
  sageEnchantItem, getEnchanterCap,
  getBlacksmithCost, getBlacksmithCap, rollBlacksmithOptions, blacksmithApplyAffix,
  innRest,
} from '../systems/town/Services';
import { AFFIX_BY_ID, formatAffixDesc } from '../data/Enchantments';

const BUILDING_NAMES: Record<string, string> = {
  temple: 'Temple of Odin',
  sage: 'The Sage',
  bank: 'The Blacksmith',
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

function buildBlacksmith(state: GameState, onUpdate: (s: GameState) => void): HTMLElement {
  const panel = createPanel('Forge');
  const ngPlus = state.ngPlusCount ?? 0;
  const cap = getBlacksmithCap(ngPlus);

  // List equippable items
  const items: { id: string; name: string; item: import('../../core/types').Item; equipped: boolean }[] = [];
  for (const item of state.hero.inventory) {
    if (ITEM_BY_ID[item.templateId]?.equipSlot && !item.cursed) {
      items.push({ id: item.id, name: item.name, item, equipped: false });
    }
  }
  for (const [, item] of Object.entries(state.hero.equipment)) {
    if (item && !item.cursed) {
      items.push({ id: item.id, name: `${item.name} (equipped)`, item, equipped: true });
    }
  }

  if (items.length === 0) {
    panel.appendChild(el('div', { color: '#555', fontSize: '12px', fontStyle: 'italic' }, 'No items to work on.'));
    return panel;
  }

  panel.appendChild(el('div', { color: '#888', fontSize: '11px', marginBottom: '6px' }, `Add or reroll affixes. (Cap: ${cap} per item)`));

  for (const entry of items) {
    const cost = getBlacksmithCost(entry.item);
    const affixCount = entry.item.specialEnchantments?.length ?? 0;
    const atCap = affixCount >= cap;
    const canAfford = state.hero.copper >= cost;

    const row = el('div', { marginBottom: '6px', padding: '4px', background: '#111', borderRadius: '4px' });
    row.appendChild(el('div', { color: '#ccc', fontSize: '12px', fontWeight: 'bold' }, entry.name));
    row.appendChild(el('div', { color: '#888', fontSize: '11px' }, `Affixes: ${affixCount}/${cap} · Cost: ${cost}g`));

    const btnRow2 = el('div', { display: 'flex', gap: '6px', marginTop: '4px' });

    // Add Affix button
    if (!atCap) {
      const addBtn = createButton('Add Affix');
      Object.assign(addBtn.style, { fontSize: '11px', padding: '4px 8px' });
      greyBtn(addBtn, !canAfford);
      if (canAfford) {
        addBtn.addEventListener('click', () => {
          const options = rollBlacksmithOptions(entry.item, ngPlus);
          showAffixPicker(panel, state, entry.item, options, undefined, onUpdate);
        });
      }
      btnRow2.appendChild(addBtn);
    }

    // Reroll buttons for each existing affix
    if (affixCount > 0) {
      const rerollBtn = createButton('Reroll Affix');
      Object.assign(rerollBtn.style, { fontSize: '11px', padding: '4px 8px' });
      greyBtn(rerollBtn, !canAfford);
      if (canAfford) {
        rerollBtn.addEventListener('click', () => {
          showAffixSelect(panel, state, entry.item, ngPlus, onUpdate);
        });
      }
      btnRow2.appendChild(rerollBtn);
    }

    row.appendChild(btnRow2);
    panel.appendChild(row);
  }

  return panel;
}

function showAffixSelect(
  container: HTMLElement, state: GameState, item: import('../../core/types').Item,
  ngPlus: number, onUpdate: (s: GameState) => void,
): void {
  const enchants = item.specialEnchantments ?? [];
  const overlay = el('div', {
    position: 'fixed', inset: '0', zIndex: '300', background: 'rgba(0,0,0,0.9)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '8px', padding: '20px',
  });

  overlay.appendChild(el('div', { color: '#c9a84c', fontSize: '16px', fontWeight: 'bold' }, 'Select affix to replace'));

  for (let i = 0; i < enchants.length; i++) {
    const raw = enchants[i];
    const isCrit = raw.endsWith(':critical');
    const id = isCrit ? raw.replace(':critical', '') : raw;
    const aff = AFFIX_BY_ID[id];
    if (!aff) continue;
    const desc = formatAffixDesc(id, item.enchantment, isCrit);
    const prefix = isCrit ? '\u2605\u2605' : '\u2605';

    const btn = createButton(`${prefix} ${aff.name}: ${desc}`);
    Object.assign(btn.style, { display: 'block', width: '100%', maxWidth: '320px', textAlign: 'left', fontSize: '12px', color: aff.color });
    btn.addEventListener('click', () => {
      overlay.remove();
      const options = rollBlacksmithOptions(item, ngPlus, [id]);
      showAffixPicker(container, state, item, options, i, onUpdate);
    });
    overlay.appendChild(btn);
  }

  const cancelBtn = createButton('Cancel');
  cancelBtn.addEventListener('click', () => overlay.remove());
  overlay.appendChild(cancelBtn);
  document.body.appendChild(overlay);
}

function showAffixPicker(
  container: HTMLElement, state: GameState, item: import('../../core/types').Item,
  options: { id: string; critical: boolean }[], replaceIdx: number | undefined,
  onUpdate: (s: GameState) => void,
): void {
  const overlay = el('div', {
    position: 'fixed', inset: '0', zIndex: '300', background: 'rgba(0,0,0,0.9)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '8px', padding: '20px',
  });

  if (options.length === 0) {
    overlay.appendChild(el('div', { color: '#f44', fontSize: '14px', fontWeight: 'bold' }, 'No affixes available for this item.'));
    const okBtn = createButton('OK');
    okBtn.addEventListener('click', () => overlay.remove());
    overlay.appendChild(okBtn);
    document.body.appendChild(overlay);
    return;
  }

  overlay.appendChild(el('div', { color: '#c9a84c', fontSize: '16px', fontWeight: 'bold' }, 'Choose an affix'));
  overlay.appendChild(el('div', { color: '#888', fontSize: '12px', marginBottom: '4px' }, `Cost: ${getBlacksmithCost(item)}g`));

  for (const opt of options) {
    const aff = AFFIX_BY_ID[opt.id];
    if (!aff) continue;
    const desc = formatAffixDesc(opt.id, item.enchantment, opt.critical);
    const prefix = opt.critical ? '\u2605\u2605' : '\u2605';

    const btn = createButton(`${prefix} ${aff.name}: ${desc}`);
    Object.assign(btn.style, { display: 'block', width: '100%', maxWidth: '320px', textAlign: 'left', fontSize: '12px', color: aff.color });
    btn.addEventListener('click', () => {
      overlay.remove();
      onUpdate(blacksmithApplyAffix(state, item.id, opt.id, opt.critical, replaceIdx));
    });
    overlay.appendChild(btn);
  }

  const cancelBtn = createButton('Cancel');
  cancelBtn.addEventListener('click', () => overlay.remove());
  overlay.appendChild(cancelBtn);
  document.body.appendChild(overlay);
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
      case 'bank':    content = buildBlacksmith(state, handleUpdate); break;
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
