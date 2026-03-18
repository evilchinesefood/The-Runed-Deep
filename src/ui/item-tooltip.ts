import type { Item } from '../core/types';
import { ITEM_BY_ID } from '../data/items';
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
    cloak: 'Cloak', bracers: 'Bracers', gauntlets: 'Gauntlets', belt: 'Belt',
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

  // Stats
  const statsBox = d('div', { marginBottom: '4px' });
  let hasStats = false;

  // Damage
  if (item.properties['damageMin'] !== undefined && item.properties['damageMax'] !== undefined) {
    let dmg = `${item.properties['damageMin']}–${item.properties['damageMax']} damage`;
    if (item.identified && item.enchantment !== 0) {
      const sign = item.enchantment > 0 ? '+' : '';
      dmg += ` (${sign}${item.enchantment} enchant)`;
    }
    statsBox.appendChild(statLine(dmg));
    hasStats = true;
  }

  // Accuracy
  const acc = item.properties['accuracy'];
  if (acc !== undefined && acc !== 0) {
    statsBox.appendChild(statLine(`${acc > 0 ? '+' : ''}${acc} accuracy`));
    hasStats = true;
  }

  // AC
  if (item.properties['ac'] !== undefined && item.properties['ac'] !== 0) {
    let acText: string;
    if (item.identified && item.enchantment !== 0) {
      const total = item.properties['ac'] + item.enchantment;
      const sign = item.enchantment > 0 ? '+' : '';
      acText = `+${total} AC (${sign}${item.enchantment} enchant)`;
    } else {
      acText = `+${item.properties['ac']} AC`;
    }
    statsBox.appendChild(statLine(acText));
    hasStats = true;
  }

  // Healing
  if (item.properties['healPct']) {
    statsBox.appendChild(statLine(`Heals ${Math.round(item.properties['healPct'] * 100)}% HP`));
    hasStats = true;
  } else if (item.properties['healAmount']) {
    statsBox.appendChild(statLine(`Heals ${item.properties['healAmount']} HP`));
    hasStats = true;
  }

  // Scroll spell
  if (item.category === 'scroll' && tpl?.spellId) {
    const spellName = tpl.spellId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    statsBox.appendChild(statLine(`Casts: ${spellName}`));
    hasStats = true;
  }

  // Potion stat gain
  if (item.templateId.startsWith('potion-gain-')) {
    const attr = item.templateId.replace('potion-gain-', '');
    statsBox.appendChild(statLine(`Permanently +1 ${attr.charAt(0).toUpperCase() + attr.slice(1)}`));
    hasStats = true;
  }

  if (hasStats) container.appendChild(statsBox);

  // Cursed
  if (item.cursed && item.identified) {
    container.appendChild(d('div', { color: '#f44', fontStyle: 'italic' }, 'Cursed — cannot be unequipped'));
  }

  // Unidentified
  if (!item.identified) {
    container.appendChild(d('div', { color: '#886', fontStyle: 'italic' }, 'Unidentified'));
  }

  // Weight + value
  const weight = (item.weight / 1000).toFixed(1);
  container.appendChild(d('div', {
    color: '#666', marginTop: '4px', fontSize: '11px',
  }, `${weight} kg · ${item.value} copper`));

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
