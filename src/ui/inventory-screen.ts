import type { GameState, GameAction, EquipSlot, Item } from '../core/types';
import { ITEM_BY_ID } from '../data/items';
import { getDisplayName } from '../systems/inventory/display-name';
import { attachItemTooltip, hideItemTooltip } from './item-tooltip';

function el(tag: string, styles?: Partial<CSSStyleDeclaration>, text?: string): HTMLElement {
  const e = document.createElement(tag);
  if (styles) Object.assign(e.style, styles);
  if (text !== undefined) e.textContent = text;
  return e;
}

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
  if (item.cursed && item.identified) return '#f44';
  if (item.identified && item.enchantment > 0) return '#4af';
  return '#ccc';
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
    sprite.className = item.sprite;
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
): HTMLElement {
  const h = state.hero;
  let selectedIdx = 0;

  const screen = el('div', {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px',
    background: '#000',
    color: '#ccc',
    fontFamily: "'Segoe UI', Tahoma, sans-serif",
    minHeight: '100vh',
  });

  // ── Title bar ──────────────────────────────────────────────
  const titleBar = el('div', {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '672px',
    marginBottom: '8px',
  });
  titleBar.appendChild(el('h2', { color: '#c90', margin: '0', fontSize: '18px' }, 'EQUIPMENT'));

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close (Esc)';
  closeBtn.style.cssText =
    'padding:4px 12px;background:#333;color:#ccc;border:1px solid #555;cursor:pointer;';
  closeBtn.addEventListener('click', () => { cleanup(); onClose(); });
  titleBar.appendChild(closeBtn);
  screen.appendChild(titleBar);

  // ── Equipment panel: paperdoll + slot legend ─────────────────
  const equipPanel = el('div', {
    width: '672px',
    background: '#111',
    border: '1px solid #333',
    display: 'flex',
    marginBottom: '8px',
    padding: '8px',
    gap: '16px',
    boxSizing: 'border-box',
  });

  // Left: paperdoll with overlaid equipment slots
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
      const nameSpan = el('span', { color: itemNameColor(item) }, getDisplayName(item));
      row.appendChild(nameSpan);

      // AC or damage info
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
  const invPanel = el('div', {
    width: '672px',
    background: '#111',
    border: '1px solid #333',
    padding: '12px',
    marginBottom: '8px',
    maxHeight: '260px',
    overflowY: 'auto',
    boxSizing: 'border-box',
  });
  invPanel.appendChild(sectionHeader('INVENTORY'));

  let invRows: HTMLElement[] = [];

  const renderInvRows = () => {
    while (invPanel.children.length > 1) invPanel.removeChild(invPanel.lastChild!);
    invRows = [];

    if (h.inventory.length === 0) {
      invPanel.appendChild(
        el('div', { color: '#555', fontStyle: 'italic', fontSize: '13px', padding: '8px 0' },
          'Your inventory is empty.'),
      );
      return;
    }

    for (let i = 0; i < h.inventory.length; i++) {
      const item = h.inventory[i];
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
      sprite.className = item.sprite + ' inventory-item';
      row.appendChild(sprite);

      // Name
      row.appendChild(el('span', {
        flex: '1', fontSize: '13px', color: itemNameColor(item),
      }, getDisplayName(item)));

      // Weight
      row.appendChild(el('span', {
        fontSize: '12px', color: '#888', width: '55px', textAlign: 'right',
      }, `${(item.weight / 1000).toFixed(1)} kg`));

      // Action buttons
      const actions = el('div', { display: 'flex', gap: '4px', marginLeft: '8px' });
      if (tpl?.equipSlot) {
        actions.appendChild(btn('[E]', () => onAction({ type: 'equipItem', itemId: item.id })));
      }
      if (item.category === 'potion' || item.category === 'scroll') {
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

  const footer = el('div', {
    width: '672px',
    background: '#111',
    border: '1px solid #333',
    padding: '8px 12px',
    display: 'flex',
    gap: '24px',
    fontSize: '13px',
    color: '#aaa',
    boxSizing: 'border-box',
  });
  footer.appendChild(el('span', undefined, `Weight: ${totalWeight.toFixed(1)} kg`));
  footer.appendChild(el('span', undefined, `Copper: ${h.copper}`));
  footer.appendChild(el('span', undefined, `Items: ${h.inventory.length}`));
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
      if (item.category === 'potion' || item.category === 'scroll') {
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

  return screen;
}
