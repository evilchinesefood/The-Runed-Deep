// ============================================================
// Service screen — temple, sage, bank, inn stash
// ============================================================

import type { GameState, Item } from '../core/types';
import { ITEM_BY_ID } from '../data/items';
import { createScreen, createTitleBar, createPanel, createButton, el } from './Theme';
import {
  templeHealHP, templeHealMP, templeCurePoison, templeRemoveCurse,
  sageEnchantItem, getEnchanterCap,
  getBlacksmithCost, getBlacksmithCap, rollBlacksmithOptions, blacksmithApplyAffix, blacksmithCharge,
} from '../systems/town/Services';
import { AFFIX_BY_ID, formatAffixDesc } from '../data/Enchantments';
import { getDisplaySprite, getItemGlow, itemNameColor, getDisplayName } from '../systems/inventory/display-name';
import { buildTooltipContent, attachItemTooltip, hideItemTooltip } from './item-tooltip';

const SLOT_LABELS: Record<string, string> = {
  weapon: 'Weapon', shield: 'Shield', helmet: 'Head', body: 'Body',
  cloak: 'Cloak', gauntlets: 'Hands', belt: 'Belt', boots: 'Feet',
  ringLeft: 'Ring L', ringRight: 'Ring R', amulet: 'Amulet',
  pack: 'Pack', purse: 'Purse',
};

const BUILDING_NAMES: Record<string, string> = {
  temple: 'Temple of Odin',
  sage: 'The Sage',
  bank: 'The Blacksmith',
  inn: 'The Resting Stag — Your Stash',
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

  const sageSlots: import('../../core/types').EquipSlot[] = [
    'helmet', 'amulet', 'cloak', 'body', 'weapon', 'shield',
    'gauntlets', 'belt', 'ringLeft', 'ringRight', 'boots', 'pack', 'purse',
  ];

  panel.appendChild(el('div', { color: '#888', fontSize: '11px', marginBottom: '6px' }, `Enhance equipment by +1. (Limit: +${cap} per item)`));

  const list = el('div', { maxHeight: 'clamp(200px, 50vh, 400px)', overflowY: 'auto' });

  for (const slotKey of sageSlots) {
    const item = state.hero.equipment[slotKey];
    const ups = item ? (item.properties['enchanterUps'] ?? 0) : 0;
    const atCap = item ? ups >= cap : true;
    const canAfford = item && !item.cursed && state.hero.copper >= 100 && !atCap;

    const row = el('div', {
      display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px',
      cursor: item && !item.cursed ? 'pointer' : 'default', borderRadius: '4px',
    });
    if (item && !item.cursed) {
      row.addEventListener('mouseenter', () => { row.style.background = '#1a1a1a'; });
      row.addEventListener('mouseleave', () => { row.style.background = ''; });
    }

    // Sprite
    const spriteWrap = el('div', { width: '32px', height: '32px', flexShrink: '0' });
    if (item) {
      spriteWrap.className = getDisplaySprite(item);
      const glow = getItemGlow(item);
      if (glow) spriteWrap.style.filter = glow;
    }
    row.appendChild(spriteWrap);

    // Slot label
    row.appendChild(el('span', { color: '#666', width: '50px', flexShrink: '0', fontSize: '11px' }, SLOT_LABELS[slotKey] ?? slotKey));

    if (item && !item.cursed) {
      // Name + info
      const info = el('div', { flex: '1', minWidth: '0' });
      info.appendChild(el('div', { color: itemNameColor(item), fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, getDisplayName(item)));
      info.appendChild(el('div', { color: '#888', fontSize: '11px' }, atCap ? `Enchanted +${ups}/${cap} (MAX)` : `Enchanted +${ups}/${cap}`));
      row.appendChild(info);

      // Enchant button
      const enchBtn = createButton(atCap ? 'MAX' : '+1', 'sm');
      greyBtn(enchBtn, !canAfford);
      if (canAfford) {
        enchBtn.addEventListener('click', (e) => { e.stopPropagation(); onUpdate(sageEnchantItem(state, item.id)); });
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
        sageDrawer.appendChild(buildTooltipContent(item));
        sageDrawer.appendChild(el('div', { color: '#c9a84c', fontSize: '14px', marginTop: '6px', textAlign: 'center', fontWeight: 'bold' },
          `Enchanted +${ups}/${cap} \u00B7 Cost: 100g`));

        const btnRow = el('div', { display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'center', flexWrap: 'wrap' });
        if (!atCap) {
          const drawerEnchBtn = createButton('Enchant +1');
          drawerEnchBtn.style.cssText += 'min-width:80px;padding:8px 16px;font-size:14px;';
          greyBtn(drawerEnchBtn, state.hero.copper < 100);
          if (state.hero.copper >= 100) {
            drawerEnchBtn.addEventListener('click', (e) => { e.stopPropagation(); closeSageDrawer(); onUpdate(sageEnchantItem(state, item.id)); });
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
    } else if (item && item.cursed) {
      row.appendChild(el('span', { color: '#f44', flex: '1', fontSize: '13px', fontStyle: 'italic' }, `${getDisplayName(item)} (cursed)`));
    } else {
      row.appendChild(el('span', { color: '#333', flex: '1', fontSize: '13px', fontStyle: 'italic' }, '\u2014 empty \u2014'));
    }

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

  panel.appendChild(el('div', { color: '#888', fontSize: '11px', marginBottom: '6px' }, `Add or reroll affixes. (Cap: ${cap} per item)`));

  const slotOrder: import('../../core/types').EquipSlot[] = [
    'helmet', 'amulet', 'cloak', 'body', 'weapon', 'shield',
    'gauntlets', 'belt', 'ringLeft', 'ringRight', 'boots', 'pack', 'purse',
  ];

  const list = el('div', { maxHeight: 'clamp(200px, 50vh, 400px)', overflowY: 'auto' });

  for (const slotKey of slotOrder) {
    const item = state.hero.equipment[slotKey];

    const row = el('div', {
      display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px',
      cursor: item ? 'pointer' : 'default', borderRadius: '4px',
    });
    if (item) {
      row.addEventListener('mouseenter', () => { row.style.background = '#1a1a1a'; });
      row.addEventListener('mouseleave', () => { row.style.background = ''; });
    }

    // Sprite
    const sprite = el('div', { width: '32px', height: '32px', flexShrink: '0' });
    if (item) {
      sprite.className = getDisplaySprite(item);
      const glow = getItemGlow(item);
      if (glow) sprite.style.filter = glow;
    }
    row.appendChild(sprite);

    // Slot label
    row.appendChild(el('span', { color: '#666', width: '50px', flexShrink: '0', fontSize: '11px' }, SLOT_LABELS[slotKey] ?? slotKey));

    if (item && !item.cursed) {
      const cost = getBlacksmithCost(item);
      const affixCount = item.specialEnchantments?.length ?? 0;
      const atCap = affixCount >= cap;
      const canAfford = state.hero.copper >= cost;

      // Name + info
      const info = el('div', { flex: '1', minWidth: '0' });
      info.appendChild(el('div', { color: itemNameColor(item), fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, getDisplayName(item)));
      info.appendChild(el('div', { color: '#888', fontSize: '11px' }, `${affixCount}/${cap} affixes \u00B7 ${cost}g`));
      row.appendChild(info);

      // Buttons
      if (!atCap) {
        const addBtn = createButton('Add', 'sm');
        greyBtn(addBtn, !canAfford);
        if (canAfford) addBtn.addEventListener('click', (e) => { e.stopPropagation(); openBsDrawer(state, item, 'add', ngPlus, cap, onUpdate); });
        row.appendChild(addBtn);
      }
      if (affixCount > 0) {
        const rerollBtn = createButton('Reroll', 'sm');
        greyBtn(rerollBtn, !canAfford);
        if (canAfford) rerollBtn.addEventListener('click', (e) => { e.stopPropagation(); openBsDrawer(state, item, 'reroll', ngPlus, cap, onUpdate); });
        row.appendChild(rerollBtn);
      }

      row.addEventListener('click', () => openBsDrawer(state, item, atCap ? 'reroll' : 'add', ngPlus, cap, onUpdate));
    } else if (item && item.cursed) {
      row.appendChild(el('span', { color: '#f44', flex: '1', fontSize: '13px', fontStyle: 'italic' }, `${getDisplayName(item)} (cursed)`));
    } else {
      row.appendChild(el('span', { color: '#333', flex: '1', fontSize: '13px', fontStyle: 'italic' }, '\u2014 empty \u2014'));
    }

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

const STASH_LIMIT = 50;
const isMobileStash = () => window.innerWidth <= 768;

let stashDrawerEl: HTMLElement | null = null;
function closeStashDrawer(): void {
  if (stashDrawerEl) { stashDrawerEl.remove(); stashDrawerEl = null; }
}

function openStashDrawer(item: Item, actionLabel: string, onAction: () => void, disabled = false): void {
  closeStashDrawer();
  stashDrawerEl = el('div', {
    position: 'fixed', bottom: '0', left: '0', right: '0', zIndex: '2000',
    background: '#1a1a1a', borderTop: '2px solid #555',
    padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
    maxHeight: '60vh', overflowY: 'auto',
    boxShadow: '0 -4px 16px rgba(0,0,0,0.8)',
  });
  stashDrawerEl.appendChild(buildTooltipContent(item));
  const btnRow = el('div', { display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'center', flexWrap: 'wrap' });
  const actionBtn = createButton(actionLabel, 'primary');
  actionBtn.style.cssText += 'min-width:80px;padding:8px 16px;font-size:14px;';
  if (disabled) {
    greyBtn(actionBtn, true);
  } else {
    actionBtn.addEventListener('click', () => { closeStashDrawer(); onAction(); });
  }
  const closeBtn = createButton('Close');
  closeBtn.style.cssText += 'min-width:80px;padding:8px 16px;font-size:14px;';
  closeBtn.addEventListener('click', closeStashDrawer);
  btnRow.appendChild(actionBtn);
  btnRow.appendChild(closeBtn);
  stashDrawerEl.appendChild(btnRow);
  document.body.appendChild(stashDrawerEl);
}

function buildStashRow(
  item: Item, actionLabel: string, disabled: boolean,
  onAction: () => void, mobile: boolean,
): HTMLElement {
  const row = el('div', {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '4px 6px', borderBottom: '1px solid #222',
    cursor: mobile ? 'pointer' : 'default', minHeight: '36px',
  });

  const glow = getItemGlow(item);
  const sprClass = getDisplaySprite(item);
  if (sprClass) {
    const img = el('div', { width: '32px', height: '32px', flexShrink: '0', position: 'relative' });
    const spr = document.createElement('div');
    spr.style.cssText = 'width:32px;height:32px;position:absolute;top:0;left:0;';
    spr.className = sprClass;
    if (glow) spr.style.filter = glow;
    img.appendChild(spr);
    row.appendChild(img);
  }

  const nameEl = el('span', {
    flex: '1', color: itemNameColor(item), fontSize: '13px',
    ...(glow ? { textShadow: `0 0 6px ${glow}` } : {}),
  }, getDisplayName(item));
  row.appendChild(nameEl);

  if (mobile) {
    row.addEventListener('click', () => openStashDrawer(item, actionLabel, onAction, disabled));
  } else {
    const btn = createButton(actionLabel, 'sm');
    greyBtn(btn, disabled);
    if (!disabled) btn.addEventListener('click', () => { hideItemTooltip(); onAction(); });
    attachItemTooltip(row, item);
    row.appendChild(btn);
  }

  return row;
}

function buildStash(state: GameState, onUpdate: (s: GameState) => void): HTMLElement {
  const panel = createPanel('');
  const mobile = isMobileStash();
  const stash = state.stash ?? [];
  const stashFull = stash.length >= STASH_LIMIT;

  panel.appendChild(el('div', {
    color: '#c9a84c', fontSize: '13px', fontWeight: 'bold', marginBottom: '10px',
  }, `Stash — ${stash.length} / ${STASH_LIMIT} items stored`));

  // Stored items
  panel.appendChild(el('div', { color: '#888', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }, 'Stored'));
  if (stash.length === 0) {
    panel.appendChild(el('div', { color: '#555', fontSize: '12px', fontStyle: 'italic', marginBottom: '8px' }, 'Nothing stored here yet.'));
  } else {
    for (const item of stash) {
      panel.appendChild(buildStashRow(item, 'Retrieve', false, () => {
        const newStash = stash.filter(i => i.id !== item.id);
        onUpdate({ ...state, stash: newStash, hero: { ...state.hero, inventory: [...state.hero.inventory, item] } });
      }, mobile));
    }
  }

  panel.appendChild(el('div', { borderTop: '1px solid #333', margin: '10px 0' }));

  // Inventory
  panel.appendChild(el('div', { color: '#888', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }, 'Inventory'));
  if (state.hero.inventory.length === 0) {
    panel.appendChild(el('div', { color: '#555', fontSize: '12px', fontStyle: 'italic' }, 'Your inventory is empty.'));
  } else {
    for (const item of state.hero.inventory) {
      panel.appendChild(buildStashRow(item, 'Store', stashFull, () => {
        const newInv = state.hero.inventory.filter(i => i.id !== item.id);
        onUpdate({ ...state, stash: [...stash, item], hero: { ...state.hero, inventory: newInv } });
      }, mobile));
    }
  }

  if (stashFull) {
    panel.appendChild(el('div', { color: '#f84', fontSize: '11px', marginTop: '6px', fontStyle: 'italic' }, `Stash is full (${STASH_LIMIT} items max).`));
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

    if (buildingId !== 'inn') {
      const copper = el('div', { color: '#c90', fontSize: '13px', marginBottom: '8px' });
      copper.textContent = `Gold: ${state.hero.copper}`;
      screen.appendChild(copper);
    }

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
      case 'inn':     content = buildStash(state, handleUpdate); break;
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

  screen.cleanup = () => { document.removeEventListener('keydown', onKey); closeSageDrawer(); closeBsDrawer(); closeStashDrawer(); };

  return screen;
}
