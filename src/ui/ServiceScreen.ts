// ============================================================
// Service screen — temple, sage, bank, inn
// ============================================================

import type { GameState } from '../core/types';
import { ITEM_BY_ID } from '../data/items';
import { createScreen, createTitleBar, createPanel, createButton, el } from './Theme';
import {
  templeHealHP, templeHealMP, templeCurePoison, templeRemoveCurse,
  sageEnchantItem, getEnchanterCap,
  getBlacksmithCost, getBlacksmithCap, rollBlacksmithOptions, blacksmithApplyAffix, blacksmithCharge,
  innRest,
} from '../systems/town/Services';
import { AFFIX_BY_ID, formatAffixDesc } from '../data/Enchantments';
import { getDisplaySprite, getItemGlow, itemNameColor, getDisplayName } from '../systems/inventory/display-name';
import { buildTooltipContent } from './item-tooltip';

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

let sageDrawer: HTMLElement | null = null;
function closeSageDrawer(): void { if (sageDrawer) { sageDrawer.remove(); sageDrawer = null; } }

function buildSage(state: GameState, onUpdate: (s: GameState) => void): HTMLElement {
  const panel = createPanel('Enchantment (100g)');
  const cap = getEnchanterCap(state.ngPlusCount ?? 0);

  type Entry = { id: string; item: import('../../core/types').Item; equipped: boolean; atCap: boolean };
  const items: Entry[] = [];
  for (const item of state.hero.inventory) {
    if (ITEM_BY_ID[item.templateId]?.equipSlot && !item.cursed) {
      items.push({ id: item.id, item, equipped: false, atCap: (item.properties['enchanterUps'] ?? 0) >= cap });
    }
  }
  for (const [, item] of Object.entries(state.hero.equipment)) {
    if (item && !item.cursed) {
      items.push({ id: item.id, item, equipped: true, atCap: (item.properties['enchanterUps'] ?? 0) >= cap });
    }
  }

  if (items.length === 0) {
    panel.appendChild(el('div', { color: '#555', fontSize: '12px', fontStyle: 'italic' }, 'No items to enchant.'));
    return panel;
  }

  panel.appendChild(el('div', { color: '#888', fontSize: '11px', marginBottom: '6px' }, `Enhance equipment by +1. (Limit: +${cap} per item)`));

  const list = el('div', { maxHeight: 'clamp(200px, 50vh, 400px)', overflowY: 'auto' });

  for (const entry of items) {
    const ups = entry.item.properties['enchanterUps'] ?? 0;
    const canAfford = state.hero.copper >= 100 && !entry.atCap;

    const row = el('div', {
      display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px',
      cursor: 'pointer', borderRadius: '4px',
    });
    row.addEventListener('mouseenter', () => { row.style.background = '#1a1a1a'; });
    row.addEventListener('mouseleave', () => { row.style.background = ''; });

    // Sprite
    const spriteWrap = el('div', { width: '32px', height: '32px', flexShrink: '0' });
    spriteWrap.className = getDisplaySprite(entry.item);
    const glow = getItemGlow(entry.item);
    if (glow) spriteWrap.style.filter = glow;
    row.appendChild(spriteWrap);

    // Name + info
    const info = el('div', { flex: '1', minWidth: '0' });
    const nameText = entry.equipped ? `${getDisplayName(entry.item)} (eq)` : getDisplayName(entry.item);
    info.appendChild(el('div', { color: itemNameColor(entry.item), fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, nameText));
    info.appendChild(el('div', { color: '#888', fontSize: '11px' }, entry.atCap ? `Enchanted +${ups}/${cap} (MAX)` : `Enchanted +${ups}/${cap}`));
    row.appendChild(info);

    // Enchant button
    const enchBtn = createButton(entry.atCap ? 'MAX' : '+1', 'sm');
    greyBtn(enchBtn, !canAfford);
    if (canAfford) {
      enchBtn.addEventListener('click', (e) => { e.stopPropagation(); onUpdate(sageEnchantItem(state, entry.id)); });
    }
    row.appendChild(enchBtn);

    // Click row opens drawer
    row.addEventListener('click', () => {
      closeSageDrawer();
      sageDrawer = el('div', {
        position: 'fixed', bottom: '0', left: '0', right: '0', zIndex: '2000',
        background: '#1a1a1a', borderTop: '2px solid #555',
        padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        maxHeight: '60vh', overflowY: 'auto',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.8)',
      });
      sageDrawer.appendChild(buildTooltipContent(entry.item));
      sageDrawer.appendChild(el('div', { color: '#c9a84c', fontSize: '14px', marginTop: '6px', textAlign: 'center', fontWeight: 'bold' },
        `Enchanted +${ups}/${cap} \u00B7 Cost: 100g`));

      const btnRow = el('div', { display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'center', flexWrap: 'wrap' });
      if (!entry.atCap) {
        const drawerEnchBtn = createButton('Enchant +1');
        drawerEnchBtn.style.cssText += 'min-width:80px;padding:8px 16px;font-size:14px;';
        greyBtn(drawerEnchBtn, state.hero.copper < 100);
        if (state.hero.copper >= 100) {
          drawerEnchBtn.addEventListener('click', (e) => { e.stopPropagation(); closeSageDrawer(); onUpdate(sageEnchantItem(state, entry.id)); });
        }
        btnRow.appendChild(drawerEnchBtn);
      }
      const closeBtn = createButton('Close');
      closeBtn.style.cssText += 'min-width:80px;padding:8px 16px;font-size:14px;';
      closeBtn.addEventListener('click', closeSageDrawer);
      btnRow.appendChild(closeBtn);

      sageDrawer.appendChild(btnRow);
      document.body.appendChild(sageDrawer);
    });

    list.appendChild(row);
  }

  panel.appendChild(list);
  return panel;
}

let bsDrawer: HTMLElement | null = null;
function closeBsDrawer(): void { if (bsDrawer) { bsDrawer.remove(); bsDrawer = null; } }

function buildBlacksmith(state: GameState, onUpdate: (s: GameState) => void): HTMLElement {
  const panel = createPanel('Forge');
  const ngPlus = state.ngPlusCount ?? 0;
  const cap = getBlacksmithCap(ngPlus);

  type Entry = { id: string; item: import('../../core/types').Item; equipped: boolean };
  const items: Entry[] = [];
  for (const item of state.hero.inventory) {
    if (ITEM_BY_ID[item.templateId]?.equipSlot && !item.cursed) {
      items.push({ id: item.id, item, equipped: false });
    }
  }
  for (const [, item] of Object.entries(state.hero.equipment)) {
    if (item && !item.cursed) {
      items.push({ id: item.id, item, equipped: true });
    }
  }

  if (items.length === 0) {
    panel.appendChild(el('div', { color: '#555', fontSize: '12px', fontStyle: 'italic' }, 'No items to work on.'));
    return panel;
  }

  panel.appendChild(el('div', { color: '#888', fontSize: '11px', marginBottom: '6px' }, `Add or reroll affixes. (Cap: ${cap} per item)`));

  const list = el('div', { maxHeight: 'clamp(200px, 50vh, 400px)', overflowY: 'auto' });

  for (const entry of items) {
    const cost = getBlacksmithCost(entry.item);
    const affixCount = entry.item.specialEnchantments?.length ?? 0;
    const atCap = affixCount >= cap;
    const canAfford = state.hero.copper >= cost;

    const row = el('div', {
      display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px',
      cursor: 'pointer', borderRadius: '4px',
    });
    row.addEventListener('mouseenter', () => { row.style.background = '#1a1a1a'; });
    row.addEventListener('mouseleave', () => { row.style.background = ''; });

    // Sprite
    const sprite = el('div', { width: '32px', height: '32px', flexShrink: '0' });
    sprite.className = getDisplaySprite(entry.item);
    const glow = getItemGlow(entry.item);
    if (glow) sprite.style.filter = glow;
    row.appendChild(sprite);

    // Name + info
    const info = el('div', { flex: '1', minWidth: '0' });
    const nameText = entry.equipped ? `${getDisplayName(entry.item)} (eq)` : getDisplayName(entry.item);
    info.appendChild(el('div', { color: itemNameColor(entry.item), fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, nameText));
    info.appendChild(el('div', { color: '#888', fontSize: '11px' }, `${affixCount}/${cap} affixes · ${cost}g`));
    row.appendChild(info);

    // Buttons
    if (!atCap) {
      const addBtn = createButton('Add', 'sm');
      greyBtn(addBtn, !canAfford);
      addBtn.addEventListener('click', (e) => { e.stopPropagation(); openBsDrawer(state, entry.item, 'add', ngPlus, cap, onUpdate); });
      row.appendChild(addBtn);
    }
    if (affixCount > 0) {
      const rerollBtn = createButton('Reroll', 'sm');
      greyBtn(rerollBtn, !canAfford);
      rerollBtn.addEventListener('click', (e) => { e.stopPropagation(); openBsDrawer(state, entry.item, 'reroll', ngPlus, cap, onUpdate); });
      row.appendChild(rerollBtn);
    }

    // Click row opens drawer
    row.addEventListener('click', () => openBsDrawer(state, entry.item, atCap ? 'reroll' : 'add', ngPlus, cap, onUpdate));

    list.appendChild(row);
  }

  panel.appendChild(list);
  return panel;
}

function openBsDrawer(
  state: GameState, item: import('../../core/types').Item,
  mode: 'add' | 'reroll', ngPlus: number, cap: number,
  onUpdate: (s: GameState) => void,
): void {
  closeBsDrawer();
  const cost = getBlacksmithCost(item);
  const affixCount = item.specialEnchantments?.length ?? 0;
  const canAfford = state.hero.copper >= cost;

  bsDrawer = el('div', {
    position: 'fixed', bottom: '0', left: '0', right: '0', zIndex: '2000',
    background: '#1a1a1a', borderTop: '2px solid #555',
    padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
    maxHeight: '60vh', overflowY: 'auto',
    boxShadow: '0 -4px 16px rgba(0,0,0,0.8)',
  });

  bsDrawer.appendChild(buildTooltipContent(item));
  bsDrawer.appendChild(el('div', { color: '#c9a84c', fontSize: '14px', marginTop: '6px', textAlign: 'center', fontWeight: 'bold' }, `Affixes: ${affixCount}/${cap} \u00B7 Cost: ${cost}g`));

  const btnRow = el('div', { display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'center', flexWrap: 'wrap' });

  if (mode === 'add' && affixCount < cap) {
    const addBtn = createButton('Add Affix');
    addBtn.style.cssText += 'min-width:80px;padding:8px 16px;font-size:14px;';
    greyBtn(addBtn, !canAfford);
    if (canAfford) {
      addBtn.addEventListener('click', () => {
        // Charge upfront
        const charged = blacksmithCharge(state, item.id);
        if (!charged) return;
        closeBsDrawer();
        const options = rollBlacksmithOptions(item, ngPlus);
        showAffixPicker(charged, item, options, undefined, 'add', onUpdate);
      });
    }
    btnRow.appendChild(addBtn);
  }

  if (affixCount > 0) {
    const rerollBtn = createButton('Reroll Affix');
    rerollBtn.style.cssText += 'min-width:80px;padding:8px 16px;font-size:14px;';
    greyBtn(rerollBtn, !canAfford);
    if (canAfford) {
      rerollBtn.addEventListener('click', () => {
        closeBsDrawer();
        showAffixSelect(state, item, ngPlus, onUpdate);
      });
    }
    btnRow.appendChild(rerollBtn);
  }

  const closeBtn = createButton('Close');
  closeBtn.style.cssText += 'min-width:80px;padding:8px 16px;font-size:14px;';
  closeBtn.addEventListener('click', closeBsDrawer);
  btnRow.appendChild(closeBtn);

  bsDrawer.appendChild(btnRow);
  document.body.appendChild(bsDrawer);
}

function showAffixSelect(
  state: GameState, item: import('../../core/types').Item,
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
      // Charge upfront after selecting which affix to replace
      const charged = blacksmithCharge(state, item.id);
      if (!charged) return;
      const options = rollBlacksmithOptions(item, ngPlus, [id]);
      showAffixPicker(charged, item, options, i, 'reroll', onUpdate);
    });
    overlay.appendChild(btn);
  }

  const cancelBtn = createButton('Cancel');
  cancelBtn.addEventListener('click', () => overlay.remove());
  overlay.appendChild(cancelBtn);
  document.body.appendChild(overlay);
}

function showAffixPicker(
  state: GameState, item: import('../../core/types').Item,
  options: { id: string; critical: boolean }[], replaceIdx: number | undefined,
  mode: 'add' | 'reroll', onUpdate: (s: GameState) => void,
): void {
  const overlay = el('div', {
    position: 'fixed', inset: '0', zIndex: '300', background: 'rgba(0,0,0,0.9)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '8px', padding: '20px',
  });

  if (options.length === 0) {
    overlay.appendChild(el('div', { color: '#f44', fontSize: '14px', fontWeight: 'bold' }, 'No affixes available for this item.'));
    overlay.appendChild(el('div', { color: '#888', fontSize: '12px' }, 'Gold has been spent.'));
    const okBtn = createButton('OK');
    okBtn.addEventListener('click', () => { overlay.remove(); onUpdate(state); });
    overlay.appendChild(okBtn);
    document.body.appendChild(overlay);
    return;
  }

  const cost = getBlacksmithCost(item);
  const flavorBox = el('div', { maxWidth: '320px', textAlign: 'center', marginBottom: '8px' });
  const line1 = el('div', { color: '#c9a84c', fontSize: '13px', fontStyle: 'italic', marginBottom: '4px' });
  line1.append('The runes ignite, consuming ');
  line1.appendChild(el('span', { fontWeight: 'bold', color: '#fc4' }, `${cost} gold`));
  line1.append(' as the price of possibility.');
  flavorBox.appendChild(line1);
  flavorBox.appendChild(el('div', { color: '#aaa', fontSize: '12px', marginBottom: '4px' },
    'Five enchantments emerge, choose one to bind.'));
  flavorBox.appendChild(el('div', { color: '#666', fontSize: '11px' },
    'Refuse them, and your item remains unchanged, but the offering is lost.'));
  overlay.appendChild(flavorBox);

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
  cancelBtn.addEventListener('click', () => { overlay.remove(); onUpdate(state); });
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

  screen.cleanup = () => { document.removeEventListener('keydown', onKey); closeSageDrawer(); closeBsDrawer(); };

  return screen;
}
