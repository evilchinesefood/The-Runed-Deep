import type { GameState, GameAction, EquipSlot, Item } from '../core/types';
import { ITEM_BY_ID } from '../data/items';
import { getDisplayName, getDisplaySprite } from '../systems/inventory/display-name';
import { attachItemTooltip, hideItemTooltip } from './item-tooltip';
import { createScreen, createPanel, createTitleBar, el } from './Theme';

function sectionHeader(text: string): HTMLElement {
  return el('div', {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#c90',
    borderBottom: '1px solid #444',
    paddingBottom: '4px',
    marginBottom: '8px',
  }, text);
}

function itemNameColor(item: Item): string {
  if (!item.identified) return '#888';           // lighter gray for unidentified
  if (item.cursed) return '#f44';                // red for cursed
  if (item.enchantment > 0) return '#4af';       // blue for enchanted
  return '#fff';                                  // white for normal identified
}

function itemDisplayLabel(item: Item): string {
  const name = getDisplayName(item);
  if (!item.identified) return `${name} (unidentified)`;
  return name;
}

function btn(label: string, onClick: () => void): HTMLElement {
  const b = document.createElement('button');
  b.textContent = label;
  b.style.cssText =
    'padding:2px 6px;background:#333;border:1px solid #555;color:#ccc;cursor:pointer;font-size:12px;';
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return b;
}

// Paperdoll slot positions (x, y offsets within the 240x480 image)
// Mapped from the guide lines in equipment-dude.png
const SLOT_POSITIONS: Record<string, { x: number; y: number }> = {
  helmet:    { x: 104, y: 2 },
  amulet:    { x: 104, y: 78 },
  cloak:     { x: 30,  y: 55 },
  body:      { x: 104, y: 130 },
  weapon:    { x: 2,   y: 170 },
  shield:    { x: 206, y: 170 },
  bracers:   { x: 18,  y: 120 },
  gauntlets: { x: 4,   y: 258 },
  belt:      { x: 104, y: 228 },
  ringLeft:  { x: 36,  y: 290 },
  ringRight: { x: 172, y: 290 },
  boots:     { x: 104, y: 420 },
  pack:      { x: 190, y: 100 },
  purse:     { x: 190, y: 258 },
};

const SLOT_LABELS: Record<string, string> = {
  weapon: 'Weapon', shield: 'Shield', helmet: 'Helmet', body: 'Body',
  cloak: 'Cloak', bracers: 'Bracers', gauntlets: 'Gauntlets', belt: 'Belt',
  boots: 'Boots', ringLeft: 'Ring L', ringRight: 'Ring R', amulet: 'Amulet',
  pack: 'Pack', purse: 'Purse',
};

function createEquipSlot(
  slotKey: EquipSlot,
  item: Item | null,
  onUnequip: () => void,
): HTMLElement {
  const pos = SLOT_POSITIONS[slotKey] ?? { x: 0, y: 0 };

  const container = el('div', {
    position: 'absolute',
    left: `${pos.x}px`,
    top: `${pos.y}px`,
    width: '32px',
    height: '32px',
    cursor: item ? 'pointer' : 'default',
    border: item ? '1px solid #555' : '1px solid #333',
    background: item ? 'rgba(0,0,0,0.7)' : 'rgba(80,80,80,0.5)',
    borderRadius: '2px',
    boxSizing: 'border-box',
  });

  if (item) {
    const sprite = el('div', {
      width: '32px',
      height: '32px',
      position: 'absolute',
      top: '0',
      left: '0',
    });
    sprite.className = getDisplaySprite(item);
    container.appendChild(sprite);
    container.addEventListener('click', onUnequip);
    container.addEventListener('mouseenter', () => { container.style.borderColor = '#c90'; });
    container.addEventListener('mouseleave', () => { container.style.borderColor = '#555'; });
    container.style.pointerEvents = 'auto';
    attachItemTooltip(container, item);
  } else {
    container.title = `${SLOT_LABELS[slotKey]}: empty`;
    container.style.opacity = '0.7';
  }

  return container;
}

export function createInventoryScreen(
  state: GameState,
  onAction: (action: GameAction) => void,
  onClose: () => void,
): HTMLElement & { cleanup: () => void } {
  const h = state.hero;
  let selectedIdx = 0;

  const screen = createScreen();
  screen.style.minHeight = '100vh';

  // ── Title bar ──────────────────────────────────────────────
  screen.appendChild(createTitleBar('Equipment', () => { cleanup(); onClose(); }));

  // ── Equipment panel: paperdoll + slot legend ─────────────────
  const equipPanel = createPanel();
  equipPanel.style.display = 'flex';
  equipPanel.style.gap = '16px';
  equipPanel.style.padding = '8px';

  // Left: paperdoll with overlaid equipment slots (fixed dims for positioning)
  const dollWrapper = el('div', {
    position: 'relative',
    width: '240px',
    height: '480px',
    flexShrink: '0',
    overflow: 'hidden',
    background: '#fff',
    padding: '8px',
    boxSizing: 'border-box',
  });
  const dollBg = el('div', {
    width: '100%',
    height: '100%',
    backgroundSize: 'contain',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  });
  dollBg.className = 'equipment-dude';
  dollWrapper.appendChild(dollBg);

  // Overlay each slot at its position on the paperdoll
  const slotKeys: EquipSlot[] = [
    'helmet', 'amulet', 'cloak', 'body', 'weapon', 'shield',
    'bracers', 'gauntlets', 'belt', 'ringLeft', 'ringRight',
    'boots', 'pack', 'purse',
  ];

  for (const slotKey of slotKeys) {
    const item = h.equipment[slotKey];
    const slotEl = createEquipSlot(
      slotKey,
      item,
      () => onAction({ type: 'unequipItem', slot: slotKey }),
    );
    dollWrapper.appendChild(slotEl);
  }

  equipPanel.appendChild(dollWrapper);

  // Right: slot legend list (shows names for quick reference)
  const legend = el('div', {
    flex: '1',
    padding: '4px 0',
    overflowY: 'auto',
  });
  legend.appendChild(sectionHeader('Equipped Items'));

  for (const slotKey of slotKeys) {
    const item = h.equipment[slotKey];
    const row = el('div', {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      marginBottom: '3px',
      padding: '2px 4px',
      fontSize: '12px',
      cursor: item ? 'pointer' : 'default',
      borderRadius: '2px',
    });

    const label = SLOT_LABELS[slotKey] || slotKey;
    row.appendChild(el('span', { color: '#666', width: '65px', flexShrink: '0' }, label));

    if (item) {
      const nameSpan = el('span', { color: itemNameColor(item) }, itemDisplayLabel(item));
      row.appendChild(nameSpan);

      if (item.properties['ac']) {
        row.appendChild(el('span', { color: '#586', fontSize: '11px', marginLeft: '4px' },
          `AC+${item.properties['ac'] + item.enchantment}`));
      }
      if (item.properties['damageMin'] !== undefined) {
        const dmg = `${item.properties['damageMin']}-${item.properties['damageMax']}`;
        row.appendChild(el('span', { color: '#865', fontSize: '11px', marginLeft: '4px' }, dmg));
      }

      row.addEventListener('click', () => onAction({ type: 'unequipItem', slot: slotKey }));
      row.addEventListener('mouseenter', () => { row.style.background = '#1a1a1a'; });
      row.addEventListener('mouseleave', () => { row.style.background = ''; });
      attachItemTooltip(row, item);
    } else {
      row.appendChild(el('span', { color: '#333', fontStyle: 'italic' }, '—'));
    }

    legend.appendChild(row);
  }

  equipPanel.appendChild(legend);
  screen.appendChild(equipPanel);

  // ── Inventory panel ────────────────────────────────────────
  const invPanel = createPanel('INVENTORY');
  invPanel.style.maxHeight = '300px';
  invPanel.style.overflowY = 'auto';

  // Sort controls
  type SortMode = 'newest' | 'oldest' | 'identified' | 'type';
  let sortMode: SortMode = 'newest';

  const sortBar = el('div', { display: 'flex', gap: '4px', marginBottom: '6px', flexWrap: 'wrap' });
  const sortModes: [SortMode, string][] = [
    ['newest', 'Newest'], ['oldest', 'Oldest'], ['identified', 'Identified'], ['type', 'By Type'],
  ];
  const sortButtons: HTMLElement[] = [];
  for (const [mode, label] of sortModes) {
    const sb = el('div', {
      padding: '2px 8px', fontSize: '11px', cursor: 'pointer', borderRadius: '3px',
      userSelect: 'none', transition: 'background 0.1s',
    });
    sb.textContent = label;
    sb.addEventListener('click', () => { sortMode = mode; updateSortButtons(); renderInvRows(); });
    sortBar.appendChild(sb);
    sortButtons.push(sb);
  }
  function updateSortButtons(): void {
    sortButtons.forEach((sb, i) => {
      const active = sortModes[i][0] === sortMode;
      sb.style.background = active ? '#446' : '#222';
      sb.style.color = active ? '#aaf' : '#888';
      sb.style.border = active ? '1px solid #558' : '1px solid #333';
    });
  }
  updateSortButtons();
  invPanel.appendChild(sortBar);

  function getSortedInventory(): typeof h.inventory {
    const inv = [...h.inventory];
    switch (sortMode) {
      case 'newest': return inv.reverse();
      case 'oldest': return inv;
      case 'identified': return inv.sort((a, b) => (a.identified === b.identified ? 0 : a.identified ? -1 : 1));
      case 'type': return inv.sort((a, b) => a.category.localeCompare(b.category));
      default: return inv;
    }
  }

  let invRows: HTMLElement[] = [];

  const renderInvRows = () => {
    // Keep header + sort bar, remove the rest
    while (invPanel.children.length > 2) invPanel.removeChild(invPanel.lastChild!);
    invRows = [];

    if (h.inventory.length === 0) {
      invPanel.appendChild(
        el('div', { color: '#555', fontStyle: 'italic', fontSize: '13px', padding: '8px 0' },
          'Your inventory is empty.'),
      );
      return;
    }

    const sorted = getSortedInventory();
    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i];
      const tpl = ITEM_BY_ID[item.templateId];
      const isSelected = i === selectedIdx;

      const row = el('div', {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '3px 6px',
        background: isSelected ? '#222' : 'transparent',
        cursor: 'pointer',
        borderRadius: '2px',
      });

      // Sprite
      const sprite = el('div', { width: '32px', height: '32px', flexShrink: '0' });
      sprite.className = getDisplaySprite(item) + ' inventory-item';
      row.appendChild(sprite);

      // Name
      row.appendChild(el('span', {
        flex: '1', fontSize: '13px', color: itemNameColor(item),
      }, itemDisplayLabel(item)));

      // Weight
      row.appendChild(el('span', {
        fontSize: '12px', color: '#888', width: '55px', textAlign: 'right',
      }, `${(item.weight / 1000).toFixed(1)} kg`));

      // Action buttons
      const actions = el('div', { display: 'flex', gap: '4px', marginLeft: '8px' });
      if (tpl?.equipSlot) {
        actions.appendChild(btn('[E]', () => onAction({ type: 'equipItem', itemId: item.id })));
      }
      if (item.category === 'potion' || item.category === 'scroll' || item.category === 'spellbook' || item.category === 'wand') {
        actions.appendChild(btn('[U]', () => onAction({ type: 'useItem', itemId: item.id })));
      }
      actions.appendChild(btn('[D]', () => onAction({ type: 'dropItem', itemId: item.id })));
      row.appendChild(actions);

      row.addEventListener('click', () => { selectedIdx = i; refreshSelection(); });
      attachItemTooltip(row, item);
      invPanel.appendChild(row);
      invRows.push(row);
    }
  };

  const refreshSelection = () => {
    for (let i = 0; i < invRows.length; i++) {
      invRows[i].style.background = i === selectedIdx ? '#222' : 'transparent';
    }
  };

  renderInvRows();
  screen.appendChild(invPanel);

  // ── Footer ────────────────────────────────────────────────
  const allItems: Item[] = [
    ...h.inventory,
    ...Object.values(h.equipment).filter((v): v is Item => v !== null),
  ];
  const totalWeight = allItems.reduce((sum, it) => sum + it.weight, 0) / 1000;

  const footer = el('div', { width: '100%' });
  footer.className = 'footer';
  footer.appendChild(el('span', undefined, `Weight: ${totalWeight.toFixed(1)} kg`));
  footer.appendChild(el('span', undefined, `Gold: ${h.copper}`));
  footer.appendChild(el('span', undefined, `Items: ${h.inventory.length}`));

  // Show carry capacity (base 10kg + pack bonus)
  const BASE_CARRY = 10000;
  const pack = h.equipment.pack;
  const packTpl = pack ? ITEM_BY_ID[pack.templateId] : null;
  const totalCap = BASE_CARRY + (packTpl?.weightCapacity ?? 0);
  const invWeight = h.inventory.reduce((s, i) => s + i.weight, 0);
  const pct = Math.round((invWeight / totalCap) * 100);
  const capColor = pct > 90 ? '#f44' : pct > 70 ? '#fa0' : '#aaa';
  footer.appendChild(el('span', { color: capColor }, `Carry: ${(invWeight / 1000).toFixed(1)}/${(totalCap / 1000).toFixed(0)}kg`));

  screen.appendChild(footer);

  // ── Keyboard handler ───────────────────────────────────────
  const keyHandler = (e: KeyboardEvent) => {
    if (e.code === 'Escape' || e.code === 'KeyI') {
      e.preventDefault();
      cleanup();
      onClose();
      return;
    }

    const inv = h.inventory;
    if (inv.length === 0) return;

    if (e.code === 'ArrowUp') {
      e.preventDefault();
      selectedIdx = Math.max(0, selectedIdx - 1);
      refreshSelection();
      return;
    }
    if (e.code === 'ArrowDown') {
      e.preventDefault();
      selectedIdx = Math.min(inv.length - 1, selectedIdx + 1);
      refreshSelection();
      return;
    }

    const item = inv[selectedIdx];
    if (!item) return;

    if (e.code === 'KeyE') {
      const tpl = ITEM_BY_ID[item.templateId];
      if (tpl?.equipSlot) { e.preventDefault(); onAction({ type: 'equipItem', itemId: item.id }); }
      return;
    }
    if (e.code === 'KeyU') {
      if (item.category === 'potion' || item.category === 'scroll' || item.category === 'spellbook' || item.category === 'wand') {
        e.preventDefault(); onAction({ type: 'useItem', itemId: item.id });
      }
      return;
    }
    if (e.code === 'KeyD') {
      e.preventDefault();
      onAction({ type: 'dropItem', itemId: item.id });
      return;
    }
  };

  document.addEventListener('keydown', keyHandler);
  const cleanup = () => { document.removeEventListener('keydown', keyHandler); hideItemTooltip(); };
  (screen as HTMLElement & { cleanup: () => void }).cleanup = cleanup;
  return screen as HTMLElement & { cleanup: () => void };
}
