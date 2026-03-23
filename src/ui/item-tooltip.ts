import type { Item } from '../core/types';
import { ITEM_BY_ID } from '../data/items';
import { ENCHANTMENT_BY_ID } from '../data/Enchantments';
import { getDisplayName } from '../systems/inventory/display-name';

let tooltipEl: HTMLElement | null = null;

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
  if (item.cursed && item.identified) return '#f44';
  if (item.identified && item.enchantment > 0) return '#4af';
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

function buildTooltipContent(item: Item): HTMLElement {
  const tpl = ITEM_BY_ID[item.templateId];
  const container = d('div');

  // Name
  container.appendChild(d('div', {
    fontSize: '14px', fontWeight: 'bold', color: nameColor(item), marginBottom: '4px',
  }, getDisplayName(item)));

  // Category
  let catText = categoryLabel(item);
  if (item.properties['twoHanded']) catText += ' (Two-Handed)';
  container.appendChild(d('div', { color: '#888', marginBottom: '4px' }, catText));

  // Material tier
  const tier = tpl?.materialTier;
  if (tier) {
    const tierColors: Record<string, string> = { elven: '#8f8', meteoric: '#f8f' };
    container.appendChild(d('div', { color: tierColors[tier] ?? '#aaa', fontSize: '11px', marginBottom: '4px', fontStyle: 'italic' }, `${tier.charAt(0).toUpperCase() + tier.slice(1)} craftsmanship`));
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
    statsBox.appendChild(d('div', { color: '#666', paddingLeft: '8px', fontSize: '11px' }, `Slot: ${slotNames[tpl.equipSlot] ?? tpl.equipSlot}`));
    hasStats = true;
  }

  // Depth range
  if (tpl && item.identified) {
    statsBox.appendChild(d('div', { color: '#555', paddingLeft: '8px', fontSize: '10px' }, `Floors ${tpl.depthMin}–${tpl.depthMax === 99 ? '40' : tpl.depthMax}`));
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
    if (item.category === 'spellbook' && !item.identified) {
      statsBox.appendChild(d('div', { color: '#886', paddingLeft: '8px', fontSize: '11px', fontStyle: 'italic' }, 'Must identify to read'));
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
        const suffix = isCrit ? ' (Critical - 2x)' : '';
        enchBox.appendChild(d('div', { color: ench.color, fontSize: '11px', paddingLeft: '6px' }, `${prefix} ${ench.name}: ${ench.description}${suffix}`));
      }
    }
    container.appendChild(enchBox);
  }

  // Unique ability
  const tplU = ITEM_BY_ID[item.templateId];
  if (tplU?.uniqueAbility && item.identified) {
    const abilityDesc: Record<string, string> = {
      'resist-fire-75': '+75 Fire Resistance',
      'resist-cold-75': '+75 Cold Resistance',
      'resist-lightning-75': '+75 Lightning Resistance',
      'resist-drain-75': '+75 Drain Resistance, immune to level drain',
      'detect-monsters': 'Reveals all monsters on the floor',
      'lightning-boost': '+50% Lightning spell damage, +75 Lightning Resistance',
      'levitation': 'Immune to pit and portal traps, walk over water',
      'elemental-immunity': '+50% all elemental resistances, immune to traps',
      'crown-power': '+10 all attributes, +2 HP/MP regen per turn',
    };
    const desc = abilityDesc[tplU.uniqueAbility] ?? tplU.uniqueAbility;
    container.appendChild(d('div', { color: '#fc4', fontSize: '11px', fontStyle: 'italic', marginTop: '4px' }, '\u2726 ' + desc));
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
    color: '#666', marginTop: '4px', fontSize: '11px',
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

export function hideItemTooltip(): void {
  if (tooltipEl) tooltipEl.style.display = 'none';
}

export function attachItemTooltip(el: HTMLElement, item: Item): void {
  el.addEventListener('mouseenter', (e: MouseEvent) => {
    showItemTooltip(item, e.clientX, e.clientY);
  });
  el.addEventListener('mousemove', (e: MouseEvent) => {
    if (tooltipEl?.style.display === 'block') positionTooltip(tooltipEl, e.clientX, e.clientY);
  });
  el.addEventListener('mouseleave', hideItemTooltip);
}
