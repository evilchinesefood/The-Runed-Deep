import { createScreen, createPanel, createTitleBar, el } from './Theme';

const KEYS: [string, string][] = [
  // Movement
  ['Arrow Keys / Numpad / HJKL', 'Move (8 directions)'],
  ['Numpad 7,9,1,3 / YUBN', 'Diagonal movement'],
  ['', ''],
  // Actions
  ['E', 'Context action (pickup / stairs / enter / search / wait)'],
  ['G', 'Pick up item'],
  ['. (period)', 'Wait (recover HP/MP over time)'],
  ['S', 'Search nearby'],
  ['> or < or Enter', 'Use stairs / enter building'],
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
  const screen = createScreen();
  screen.style.minHeight = '100vh';

  screen.appendChild(createTitleBar('Keyboard Controls', () => { cleanup(); onClose(); }));

  // Key list
  const panel = createPanel();

  for (const [key, desc] of KEYS) {
    if (key === '' && desc === '') {
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
  const tips = createPanel('Tips');
  tips.style.marginTop = '0';
  tips.appendChild(el('div', { marginBottom: '3px', fontSize: '12px', color: '#888' }, 'Walk into enemies to attack them.'));
  tips.appendChild(el('div', { marginBottom: '3px', fontSize: '12px', color: '#888' }, 'Cast Light to permanently illuminate rooms.'));
  tips.appendChild(el('div', { marginBottom: '3px', fontSize: '12px', color: '#888' }, 'Equipping unidentified items reveals their true nature.'));
  tips.appendChild(el('div', { marginBottom: '3px', fontSize: '12px', color: '#888' }, 'Cursed items cannot be removed without Remove Curse.'));
  tips.appendChild(el('div', { fontSize: '12px', color: '#888' }, 'Hover over items for detailed stat tooltips.'));
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
