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
  if (!item.identified) return '#ddd';
  const tpl = ITEM_BY_ID[item.templateId];
  if (tpl?.unique || item.specialEnchantments?.length) return '#f90';
  if (item.cursed) return '#f44';
  if (item.blessed) return '#c8f';
  if (item.enchantment > 0) return '#4af';
  return '#ddd';
}

function categoryLabel(item: Item): string {
  const labels: Record<string, string> = {
    weapon: 'Weapon', armor: 'Body Armor', shield: 'Shield', helmet: 'Helmet',
    cloak: 'Cloak', gauntlets: 'Gloves', belt: 'Belt',
    boots: 'Boots', ring: 'Ring', amulet: 'Amulet', potion: 'Potion',
    scroll: 'Scroll', spellbook: 'Spellbook', wand: 'Wand', staff: 'Staff',
    container: 'Container', currency: 'Currency', misc: 'Misc',
  };
  return labels[item.category] || item.category;
}

function statLine(text: string): HTMLElement {
  const row = d('div', { color: '#aeb', paddingLeft: '8px' });
  row.textContent = `• ${text}`;
  return row;
}

// Set by UI screens so tooltips can show spell learned status
let _knownSpells: string[] = [];
export function setTooltipKnownSpells(spells: string[]): void { _knownSpells = spells; }

export function buildTooltipContent(item: Item): HTMLElement {
  const tpl = ITEM_BY_ID[item.templateId];
  const container = d('div');

  // Name
  container.appendChild(d('div', {
    fontSize: '14px', fontWeight: 'bold', color: nameColor(item), marginBottom: '4px',
  }, getDisplayName(item)));

  // Material tier
  const tier = tpl?.materialTier;
  if (tier) {
    const tierColors: Record<string, string> = { elven: '#8f8', meteoric: '#f8f' };
    container.appendChild(d('div', { color: tierColors[tier] ?? '#aaa', fontSize: '12px', marginBottom: '4px', fontStyle: 'italic' }, `${tier.charAt(0).toUpperCase() + tier.slice(1)} craftsmanship`));
  }

  // Stats
  const statsBox = d('div', { marginBottom: '4px' });
  let hasStats = false;
  const ench = item.identified ? item.enchantment : 0;

  // Damage — show effective range including enchantment
  if (item.properties['damageMin'] !== undefined && item.properties['damageMax'] !== undefined) {
    const baseMin = item.properties['damageMin'];
    const baseMax = item.properties['damageMax'];
    const effMin = baseMin + ench;
    const effMax = baseMax + ench;
    if (ench !== 0) {
      statsBox.appendChild(statLine(`${effMin}–${effMax} damage (base ${baseMin}–${baseMax})`));
    } else {
      statsBox.appendChild(statLine(`${baseMin}–${baseMax} damage`));
    }
    hasStats = true;
  }

  // Accuracy — show effective value including enchantment
  const baseAcc = item.properties['accuracy'] ?? 0;
  if (item.category === 'weapon') {
    const effAcc = baseAcc + ench;
    if (ench !== 0) {
      statsBox.appendChild(statLine(`${effAcc > 0 ? '+' : ''}${effAcc} accuracy (base ${baseAcc > 0 ? '+' : ''}${baseAcc})`));
    } else if (baseAcc !== 0) {
      statsBox.appendChild(statLine(`${baseAcc > 0 ? '+' : ''}${baseAcc} accuracy`));
    }
    hasStats = true;
  }

  // AC — show effective value including enchantment
  if (item.properties['ac'] !== undefined) {
    const baseAC = item.properties['ac'];
    const effAC = baseAC + ench;
    if (ench !== 0) {
      statsBox.appendChild(statLine(`+${effAC} AC (base +${baseAC})`));
    } else if (baseAC > 0) {
      statsBox.appendChild(statLine(`+${baseAC} AC`));
    }
    hasStats = true;
  }

  // Equip slot
  if (tpl?.equipSlot) {
    const slotNames: Record<string, string> = {
      weapon: 'Weapon', shield: 'Shield', helmet: 'Head', body: 'Body',
      cloak: 'Cloak', gauntlets: 'Hands', belt: 'Belt', boots: 'Feet',
      ringLeft: 'Ring', ringRight: 'Ring', amulet: 'Neck', pack: 'Pack', purse: 'Purse',
    };
    let slotText = `Slot: ${slotNames[tpl.equipSlot] ?? tpl.equipSlot}`;
    if (item.properties['twoHanded']) slotText += ' (Two-Handed)';
    statsBox.appendChild(d('div', { color: '#666', paddingLeft: '8px', fontSize: '12px' }, slotText));
    hasStats = true;
  }

  // Depth range
  if (tpl && item.identified) {
    statsBox.appendChild(d('div', { color: '#555', paddingLeft: '8px', fontSize: '11px' }, `Floors ${tpl.depthMin}–${tpl.depthMax === 99 ? '40' : tpl.depthMax}`));
  }

  // Healing
  if (item.properties['healPct']) {
    const pct = Math.round(item.properties['healPct'] * 100);
    const flat = item.properties['healAmount'] ?? 0;
    statsBox.appendChild(statLine(`Heals ${pct}% HP (min ${flat})`));
    hasStats = true;
  } else if (item.properties['healAmount']) {
    statsBox.appendChild(statLine(`Heals ${item.properties['healAmount']} HP`));
    hasStats = true;
  }

  // Scroll/spellbook/wand spell
  if ((item.category === 'scroll' || item.category === 'spellbook' || item.category === 'wand') && tpl?.spellId) {
    const spellName = tpl.spellId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    statsBox.appendChild(statLine(`Spell: ${spellName}`));
    if (item.category === 'spellbook') {
      if (!item.identified) {
        statsBox.appendChild(d('div', { color: '#886', paddingLeft: '8px', fontSize: '12px', fontStyle: 'italic' }, 'Must identify to read'));
      } else if (_knownSpells.includes(tpl.spellId)) {
        statsBox.appendChild(d('div', { color: '#4a4', paddingLeft: '8px', fontSize: '12px', fontWeight: 'bold' }, '\u2713 Learned'));
      } else {
        statsBox.appendChild(d('div', { color: '#fa4', paddingLeft: '8px', fontSize: '12px', fontWeight: 'bold' }, 'Unlearned'));
      }
    }
    hasStats = true;
  }

  // Charges
  if (item.properties['charges'] !== undefined) {
    statsBox.appendChild(statLine(`Charges: ${item.properties['charges']}`));
    hasStats = true;
  }

  // Container capacity (enchantment modifies: +5kg per level)
  if (tpl?.weightCapacity) {
    const enchBonus = item.enchantment * 5000;
    const effectiveCap = Math.max(0, tpl.weightCapacity + enchBonus);
    const capText = item.enchantment !== 0
      ? `Capacity: ${(effectiveCap / 1000).toFixed(0)} kg (base ${(tpl.weightCapacity / 1000).toFixed(0)})`
      : `Capacity: ${(tpl.weightCapacity / 1000).toFixed(0)} kg`;
    statsBox.appendChild(statLine(capText));
    hasStats = true;
  }

  // Potion stat gain
  if (item.templateId.startsWith('potion-gain-')) {
    const attr = item.templateId.replace('potion-gain-', '');
    statsBox.appendChild(statLine(`Permanently +1 ${attr.charAt(0).toUpperCase() + attr.slice(1)}`));
    hasStats = true;
  }

  if (hasStats) container.appendChild(statsBox);

  // Special enchantments
  if (item.specialEnchantments && item.specialEnchantments.length > 0) {
    const enchBox = d('div', { marginBottom: '4px' });
    for (const rawEid of item.specialEnchantments) {
      const isCrit = rawEid.endsWith(':critical');
      const eid = isCrit ? rawEid.replace(':critical', '') : rawEid;
      const ench = ENCHANTMENT_BY_ID[eid];
      if (ench) {
        const prefix = isCrit ? '★★' : '★';
        const desc = formatAffixDesc(eid, item.enchantment, isCrit);
        enchBox.appendChild(d('div', { color: ench.color, fontSize: '12px', paddingLeft: '6px' }, `${prefix} ${ench.name}: ${desc}`));
      }
    }
    container.appendChild(enchBox);
  }

  // Unique ability
  const tplU = ITEM_BY_ID[item.templateId];
  if (tplU?.uniqueAbility && item.identified) {
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
    const desc = abilityDesc[tplU.uniqueAbility] ?? tplU.uniqueAbility;
    container.appendChild(d('div', { color: '#fc4', fontSize: '13px', fontStyle: 'italic', marginTop: '4px' }, '\u2726 ' + desc));
  }

  // Blessed
  if (item.blessed && item.identified) {
    container.appendChild(d('div', { color: '#c8f', fontStyle: 'italic', fontWeight: 'bold' }, '\u2728 Blessed'));
  }

  // Cursed
  if (item.cursed && item.identified) {
    container.appendChild(d('div', { color: '#f44', fontStyle: 'italic' }, 'Cursed'));
  }

  // Unidentified
  if (!item.identified) {
    container.appendChild(d('div', { color: '#886', fontStyle: 'italic' }, 'Unidentified'));
  }

  // Weight + value
  const weight = (item.weight / 1000).toFixed(1);
  container.appendChild(d('div', {
    color: '#666', marginTop: '4px', fontSize: '12px',
  }, `${weight} kg · ${item.value} gold`));

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

  if (!item.identified && item.enchantment !== 0) {
    // Minimal info for unidentified enchanted items
    tip.appendChild(d('div', { fontSize: '14px', fontWeight: 'bold', color: '#ddd', marginBottom: '4px' }, getDisplayName(item)));
    tip.appendChild(d('div', { color: '#888' }, categoryLabel(item)));
    tip.appendChild(d('div', { color: '#886', fontStyle: 'italic', marginTop: '4px' }, 'Unidentified'));
    if (item.specialEnchantments && item.specialEnchantments.length > 0) {
      tip.appendChild(d('div', { color: '#a8f', fontStyle: 'italic', fontSize: '11px', marginTop: '2px' }, 'Has magical properties'));
    }
    tip.appendChild(d('div', { color: '#666', marginTop: '4px', fontSize: '11px' }, `${(item.weight / 1000).toFixed(1)} kg`));
  } else {
    tip.appendChild(buildTooltipContent(item));
  }

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
