function el(tag: string, styles?: Partial<CSSStyleDeclaration>, text?: string): HTMLElement {
  const e = document.createElement(tag);
  if (styles) Object.assign(e.style, styles);
  if (text !== undefined) e.textContent = text;
  return e;
}

const KEYS: [string, string][] = [
  // Movement
  ['Arrow Keys / Numpad / HJKL', 'Move (8 directions)'],
  ['Numpad 7,9,1,3 / YUBN', 'Diagonal movement'],
  ['', ''],
  // Actions
  ['G', 'Pick up item'],
  ['. (period)', 'Wait (recover HP/MP over time)'],
  ['S', 'Search nearby'],
  ['> or < or Enter', 'Use stairs'],
  ['', ''],
  // Screens
  ['I', 'Inventory / Equipment'],
  ['C', 'Character info'],
  ['?', 'This help screen'],
  ['Esc', 'Close current screen / Return to game'],
  ['', ''],
  // Spells
  ['Z', 'Open full spell list'],
  ['1-9', 'Quick-cast spell (by slot)'],
  ['Click spell bar', 'Select spell to cast'],
  ['Direction key / Click map', 'Aim directional spell'],
  ['', ''],
  // Map & Navigation
  ['M', 'Full floor map'],
  ['Click on map', 'Auto-walk to tile (pathfinding)'],
  ['', ''],
  // System
  ['Ctrl+S', 'Save game'],
  ['F9', 'Debug: Spell test arena'],
];

export function createHelpScreen(onClose: () => void): HTMLElement & { cleanup: () => void } {
  const screen = el('div', {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px',
    background: '#000',
    color: '#ccc',
    fontFamily: "'Segoe UI', Tahoma, sans-serif",
    minHeight: '100vh',
  });

  // Title bar
  const titleBar = el('div', {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '500px',
    marginBottom: '12px',
  });
  titleBar.appendChild(el('h2', { color: '#c90', margin: '0', fontSize: '18px' }, 'Keyboard Controls'));

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close (Esc)';
  closeBtn.style.cssText = 'padding:4px 12px;background:#333;color:#ccc;border:1px solid #555;cursor:pointer;';
  closeBtn.addEventListener('click', () => { cleanup(); onClose(); });
  titleBar.appendChild(closeBtn);
  screen.appendChild(titleBar);

  // Key list
  const panel = el('div', {
    width: '500px',
    background: '#111',
    border: '1px solid #333',
    padding: '16px',
  });

  for (const [key, desc] of KEYS) {
    if (key === '' && desc === '') {
      // Spacer
      panel.appendChild(el('div', { height: '8px' }));
      continue;
    }

    const row = el('div', {
      display: 'flex',
      gap: '12px',
      marginBottom: '4px',
      fontSize: '13px',
    });

    const keyEl = el('span', {
      width: '200px',
      flexShrink: '0',
      color: '#aac',
      fontFamily: 'monospace',
      fontSize: '12px',
    }, key);
    row.appendChild(keyEl);

    row.appendChild(el('span', { color: '#999' }, desc));
    panel.appendChild(row);
  }

  screen.appendChild(panel);

  // Tips
  const tips = el('div', {
    width: '500px',
    background: '#111',
    border: '1px solid #333',
    padding: '12px 16px',
    marginTop: '8px',
    fontSize: '12px',
    color: '#888',
  });
  tips.appendChild(el('div', { color: '#c90', marginBottom: '6px', fontWeight: 'bold' }, 'Tips'));
  tips.appendChild(el('div', { marginBottom: '3px' }, 'Walk into enemies to attack them.'));
  tips.appendChild(el('div', { marginBottom: '3px' }, 'Cast Light to permanently illuminate rooms.'));
  tips.appendChild(el('div', { marginBottom: '3px' }, 'Equipping unidentified items reveals their true nature.'));
  tips.appendChild(el('div', { marginBottom: '3px' }, 'Cursed items cannot be removed without Remove Curse.'));
  tips.appendChild(el('div', {}, 'Hover over items for detailed stat tooltips.'));
  screen.appendChild(tips);

  // Keyboard handler
  const keyHandler = (e: KeyboardEvent) => {
    if (e.code === 'Escape' || (e.code === 'Slash' && e.shiftKey)) {
      e.preventDefault();
      cleanup();
      onClose();
    }
  };
  document.addEventListener('keydown', keyHandler);
  const cleanup = () => { document.removeEventListener('keydown', keyHandler); };
  (screen as HTMLElement & { cleanup: () => void }).cleanup = cleanup;
  return screen as HTMLElement & { cleanup: () => void };
}
