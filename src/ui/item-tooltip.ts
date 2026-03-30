import type { Item } from '../core/types';
import { ITEM_BY_ID } from '../data/items';
import { ENCHANTMENT_BY_ID, formatAffixDesc } from '../data/Enchantments';
import { getDisplayName } from '../systems/inventory/display-name';

let tooltipEl: HTMLElement | null = null;
let compareEl: HTMLElement | null = null;
let tabHeld = false;

document.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') { e.preventDefault(); tabHeld = true; refreshCompare(); }
});
document.addEventListener('keyup', (e) => {
  if (e.key === 'Tab') { tabHeld = false; hideCompareTooltip(); }
});

// Stored context for active hover
let activeCompareItem: Item | null = null;
let activeMouseX = 0;
let activeMouseY = 0;

function d(tag: string, styles?: Partial<CSSStyleDeclaration>, text?: string): HTMLElement {
  const e = document.createElement(tag);
  if (styles) Object.assign(e.style, styles);
  if (text !== undefined) e.textContent = text;
  return e;
}

function getTooltip(): HTMLElement {
  if (tooltipEl) return tooltipEl;
  tooltipEl = d('div', {
    position: 'fixed',
    zIndex: '9999',
    background: '#1a1a1a',
    border: '1px solid #555',
    padding: '8px 10px',
    fontFamily: "'Segoe UI', Tahoma, sans-serif",
    fontSize: '12px',
    color: '#ccc',
    pointerEvents: 'none',
    display: 'none',
    maxWidth: '260px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.8)',
  });
  document.body.appendChild(tooltipEl);
  return tooltipEl;
}

function nameColor(item: Item): string {
  const tpl = ITEM_BY_ID[item.templateId];
  if (tpl?.unique) return '#f90';
  if (item.cursed) return '#f44';
  if (item.blessed) return '#c8f';
  if (item.enchantment > 0) return '#4af';
  return '#ddd';
}


const TT_SIZE = '12px';

function statLine(text: string): HTMLElement {
  return d('div', { color: '#aeb', paddingLeft: '6px', fontSize: TT_SIZE }, `\u2022 ${text}`);
}

function iconLine(icon: string, text: string, color = '#aeb'): HTMLElement {
  return d('div', { color, paddingLeft: '6px', fontSize: TT_SIZE }, `${icon} ${text}`);
}

// Set by UI screens so tooltips can show spell learned status
let _knownSpells: string[] = [];
export function setTooltipKnownSpells(spells: string[]): void { _knownSpells = spells; }

export function buildTooltipContent(item: Item): HTMLElement {
  const tpl = ITEM_BY_ID[item.templateId];
  const container = d('div');
  const ench = item.enchantment;

  // Name
  container.appendChild(d('div', {
    fontSize: '14px', fontWeight: 'bold', color: nameColor(item), marginBottom: '2px',
  }, getDisplayName(item)));

  // Slot + floors — right below name
  if (tpl?.equipSlot) {
    const slotNames: Record<string, string> = {
      weapon: 'Weapon', shield: 'Shield', helmet: 'Head', body: 'Body',
      cloak: 'Cloak', gauntlets: 'Hands', belt: 'Belt', boots: 'Feet',
      ringLeft: 'Ring', ringRight: 'Ring', amulet: 'Neck', pack: 'Pack', purse: 'Purse',
    };
    let slotText = slotNames[tpl.equipSlot] ?? tpl.equipSlot;
    if (item.properties['twoHanded']) slotText += ' (Two-Handed)';
    slotText += ` (Floors ${tpl.depthMin}\u2013${tpl.depthMax === 99 ? '40' : tpl.depthMax})`;
    container.appendChild(d('div', { color: '#777', fontSize: TT_SIZE, marginBottom: '4px' }, slotText));
  } else if (tpl) {
    container.appendChild(d('div', { color: '#777', fontSize: TT_SIZE, marginBottom: '4px' }, `Floors ${tpl.depthMin}\u2013${tpl.depthMax === 99 ? '40' : tpl.depthMax}`));
  }

  // Blessed/Cursed + Material tier on one line
  const tier = tpl?.materialTier;
  const statusParts: string[] = [];
  if (item.blessed) statusParts.push('\u2728 Blessed');
  if (item.cursed) statusParts.push('\u2620 Cursed');
  if (tier) statusParts.push(`${tier.charAt(0).toUpperCase() + tier.slice(1)} craftsmanship`);
  if (statusParts.length > 0) {
    const tierColors: Record<string, string> = { elven: '#8f8', meteoric: '#f8f' };
    const color = item.blessed ? '#c8f' : item.cursed ? '#f44' : tierColors[tier!] ?? '#aaa';
    container.appendChild(d('div', { color, fontSize: TT_SIZE, marginBottom: '4px', fontStyle: 'italic' }, statusParts.join(' \u00B7 ')));
  }

  // Stats
  const statsBox = d('div', { marginBottom: '4px' });
  let hasStats = false;

  // Damage
  if (item.properties['damageMin'] !== undefined && item.properties['damageMax'] !== undefined) {
    const baseMin = item.properties['damageMin'];
    const baseMax = item.properties['damageMax'];
    const effMin = baseMin + ench;
    const effMax = baseMax + ench;
    const txt = ench !== 0 ? `${effMin}\u2013${effMax} damage (base ${baseMin}\u2013${baseMax})` : `${baseMin}\u2013${baseMax} damage`;
    statsBox.appendChild(iconLine('\u2694', txt));
    hasStats = true;
  }

  // Accuracy
  const baseAcc = item.properties['accuracy'] ?? 0;
  if (item.category === 'weapon') {
    const effAcc = baseAcc + ench;
    if (ench !== 0) {
      statsBox.appendChild(iconLine('\uD83C\uDFAF', `${effAcc > 0 ? '+' : ''}${effAcc} accuracy (base ${baseAcc > 0 ? '+' : ''}${baseAcc})`));
    } else if (baseAcc !== 0) {
      statsBox.appendChild(iconLine('\uD83C\uDFAF', `${baseAcc > 0 ? '+' : ''}${baseAcc} accuracy`));
    }
    hasStats = true;
  }

  // AC
  if (item.properties['ac'] !== undefined) {
    const baseAC = item.properties['ac'];
    const effAC = baseAC + ench;
    const txt = ench !== 0 ? `+${effAC} AC (base +${baseAC})` : `+${baseAC} AC`;
    statsBox.appendChild(iconLine('\uD83D\uDEE1', txt));
    hasStats = true;
  }

  // Healing
  if (item.properties['healPct']) {
    const pct = Math.round(item.properties['healPct'] * 100);
    const flat = item.properties['healAmount'] ?? 0;
    statsBox.appendChild(iconLine('\u2764', `Heals ${pct}% HP (min ${flat})`, '#4f4'));
    hasStats = true;
  } else if (item.properties['healAmount']) {
    statsBox.appendChild(iconLine('\u2764', `Heals ${item.properties['healAmount']} HP`, '#4f4'));
    hasStats = true;
  }

  // Scroll/spellbook/wand spell
  if ((item.category === 'scroll' || item.category === 'spellbook' || item.category === 'wand') && tpl?.spellId) {
    const spellName = tpl.spellId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    statsBox.appendChild(iconLine('\u2728', `Spell: ${spellName}`, '#aaf'));
    if (item.category === 'spellbook') {
      if (_knownSpells.includes(tpl.spellId)) {
        statsBox.appendChild(iconLine('\u2713', 'Learned', '#4a4'));
      } else {
        statsBox.appendChild(iconLine('\u2717', 'Unlearned', '#fa4'));
      }
    }
    hasStats = true;
  }

  // Charges
  if (item.properties['charges'] !== undefined) {
    statsBox.appendChild(iconLine('\u26A1', `Charges: ${item.properties['charges']}`));
    hasStats = true;
  }

  // Container capacity
  if (tpl?.weightCapacity) {
    const enchBonus = item.enchantment * 5000;
    const effectiveCap = Math.max(0, tpl.weightCapacity + enchBonus);
    const txt = item.enchantment !== 0
      ? `Capacity: ${(effectiveCap / 1000).toFixed(0)} kg (base ${(tpl.weightCapacity / 1000).toFixed(0)})`
      : `Capacity: ${(tpl.weightCapacity / 1000).toFixed(0)} kg`;
    statsBox.appendChild(iconLine('\uD83C\uDF92', txt));
    hasStats = true;
  }

  // Potion stat gain
  if (item.templateId.startsWith('potion-gain-')) {
    const attr = item.templateId.replace('potion-gain-', '');
    statsBox.appendChild(iconLine('\u2B06', `Permanently +1 ${attr.charAt(0).toUpperCase() + attr.slice(1)}`, '#4f4'));
    hasStats = true;
  }

  if (hasStats) container.appendChild(statsBox);

  // Enchanter upgrades — above affixes
  const enchanterUps = item.properties['enchanterUps'];
  if (enchanterUps && enchanterUps > 0) {
    container.appendChild(iconLine('\u25C6', `Enchanted +${enchanterUps}`, '#4af'));
  }

  // Affixes
  if (item.specialEnchantments && item.specialEnchantments.length > 0) {
    const enchBox = d('div', { marginBottom: '4px' });
    for (const rawEid of item.specialEnchantments) {
      const isCrit = rawEid.endsWith(':critical');
      const eid = isCrit ? rawEid.replace(':critical', '') : rawEid;
      const aff = ENCHANTMENT_BY_ID[eid];
      if (aff) {
        const icon = isCrit ? '\u2605\u2605' : '\u2605';
        const desc = formatAffixDesc(eid, item.enchantment, isCrit);
        enchBox.appendChild(iconLine(icon, `${aff.name}: ${desc}`, aff.color));
      }
    }
    container.appendChild(enchBox);
  }

  // Unique ability
  if (tpl?.uniqueAbility) {
    const abilityDesc: Record<string, string> = {
      'resist-fire-75': item.properties?.['wardUpgraded'] ? '+99 Fire Resistance' : '+75 Fire Resistance',
      'resist-cold-75': item.properties?.['wardUpgraded'] ? '+99 Cold Resistance' : '+75 Cold Resistance',
      'resist-lightning-75': item.properties?.['wardUpgraded'] ? '+99 Lightning Resistance' : '+75 Lightning Resistance',
      'resist-drain-75': item.properties?.['wardUpgraded'] ? '+99 Drain Resistance' : '+75 Drain Resistance, immune to level drain',
      'detect-monsters': 'Reveals all monsters on the floor',
      'lightning-boost': '+50% Lightning spell damage, +75 Lightning Resistance',
      'levitation': 'Immune to pit and portal traps, walk over water',
      'elemental-immunity': '+50% all elemental resistances, immune to traps and poison',
      'crown-power': '+10 all attributes, +2 HP/MP regen per turn',
      'fortune-power': 'Double gold from drops, +25% item drop rate',
      'shadow-cloak': 'Monsters detect you 3 tiles later',
      'titan-power': '+30 Constitution, carry capacity doubled',
      'blooddrinker': 'Heals 30% of all damage dealt',
      'archmage-power': '+30 Intelligence, spells cost 25% less MP',
      'aegis-power': '+10 AC, reflect 30% melee damage',
      'forge-power': '+20 Strength, fire attacks deal +50% damage',
      'demonhide-power': '+15 AC, +50 fire/cold resist, 25% thorns',
      'worldsplitter': 'Attacks hit all adjacent enemies',
    };
    const desc = abilityDesc[tpl.uniqueAbility] ?? tpl.uniqueAbility;
    container.appendChild(iconLine('\u2726', desc, '#fc4'));
  }

  // Weight + value
  const weight = (item.weight / 1000).toFixed(1);
  container.appendChild(d('div', {
    color: '#666', marginTop: '2px', fontSize: TT_SIZE,
  }, `${weight} kg \u00B7 ${item.value} gold`));

  return container;
}

function positionTooltip(tip: HTMLElement, x: number, y: number): void {
  tip.style.display = 'block';
  const pad = 12;
  let left = x + pad;
  let top = y + pad;
  const rect = tip.getBoundingClientRect();
  if (left + rect.width > window.innerWidth - 8) left = x - rect.width - pad;
  if (top + rect.height > window.innerHeight - 8) top = y - rect.height - pad;
  tip.style.left = `${Math.max(4, left)}px`;
  tip.style.top = `${Math.max(4, top)}px`;
}

export function showItemTooltip(item: Item, x: number, y: number): void {
  const tip = getTooltip();
  tip.replaceChildren();

  tip.appendChild(buildTooltipContent(item));

  positionTooltip(tip, x, y);
}

export function showPileTooltip(items: Item[], x: number, y: number): void {
  const tip = getTooltip();
  tip.replaceChildren();
  tip.appendChild(d('div', { fontSize: '14px', fontWeight: 'bold', color: '#fc4', marginBottom: '4px' }, `Treasure Pile (${items.length} items)`));
  for (const item of items.slice(0, 8)) {
    tip.appendChild(d('div', { fontSize: '12px', color: '#ccc', paddingLeft: '6px' }, `· ${getDisplayName(item)}`));
  }
  if (items.length > 8) {
    tip.appendChild(d('div', { fontSize: '11px', color: '#888', paddingLeft: '6px' }, `...and ${items.length - 8} more`));
  }
  tip.appendChild(d('div', { fontSize: '11px', color: '#888', marginTop: '4px' }, 'Press G to pick up all'));
  positionTooltip(tip, x, y);
}

function getCompareTooltip(): HTMLElement {
  if (compareEl) return compareEl;
  compareEl = d('div', {
    position: 'fixed',
    zIndex: '9998',
    background: '#1a1a0a',
    border: '1px solid #665',
    padding: '8px 10px',
    fontFamily: "'Segoe UI', Tahoma, sans-serif",
    fontSize: '12px',
    color: '#ccc',
    pointerEvents: 'none',
    display: 'none',
    maxWidth: '260px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.8)',
  });
  document.body.appendChild(compareEl);
  return compareEl;
}

function showCompareTooltip(equippedItem: Item, x: number, y: number): void {
  const tip = getCompareTooltip();
  tip.replaceChildren();
  tip.appendChild(d('div', { color: '#886', fontSize: '10px', marginBottom: '4px', fontWeight: 'bold' }, 'EQUIPPED'));
  tip.appendChild(buildTooltipContent(equippedItem));
  // Position to the left of the main tooltip
  tip.style.display = 'block';
  const mainRect = tooltipEl?.getBoundingClientRect();
  if (mainRect) {
    let left = mainRect.left - tip.offsetWidth - 8;
    if (left < 4) left = mainRect.right + 8;
    tip.style.left = `${Math.max(4, left)}px`;
    tip.style.top = `${mainRect.top}px`;
  } else {
    positionTooltip(tip, x - 280, y);
  }
}

function hideCompareTooltip(): void {
  if (compareEl) compareEl.style.display = 'none';
}

function refreshCompare(): void {
  if (tabHeld && activeCompareItem && tooltipEl?.style.display === 'block') {
    showCompareTooltip(activeCompareItem, activeMouseX, activeMouseY);
  }
}

export function hideItemTooltip(): void {
  if (tooltipEl) tooltipEl.style.display = 'none';
  hideCompareTooltip();
  activeCompareItem = null;
}

export function attachItemTooltip(el: HTMLElement, item: Item, equippedItem?: Item | null): void {
  el.addEventListener('mouseenter', (e: MouseEvent) => {
    showItemTooltip(item, e.clientX, e.clientY);
    activeCompareItem = equippedItem ?? null;
    activeMouseX = e.clientX;
    activeMouseY = e.clientY;
    if (tabHeld && activeCompareItem) {
      showCompareTooltip(activeCompareItem, e.clientX, e.clientY);
    }
  });
  el.addEventListener('mousemove', (e: MouseEvent) => {
    activeMouseX = e.clientX;
    activeMouseY = e.clientY;
    if (tooltipEl?.style.display === 'block') positionTooltip(tooltipEl, e.clientX, e.clientY);
    if (tabHeld && activeCompareItem && compareEl?.style.display === 'block') {
      const mainRect = tooltipEl?.getBoundingClientRect();
      if (mainRect && compareEl) {
        let left = mainRect.left - compareEl.offsetWidth - 8;
        if (left < 4) left = mainRect.right + 8;
        compareEl.style.left = `${Math.max(4, left)}px`;
        compareEl.style.top = `${mainRect.top}px`;
      }
    }
  });
  el.addEventListener('mouseleave', hideItemTooltip);
}
