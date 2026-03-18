import type { GameState } from '../core/types';
import { SPELL_BY_ID, type SpellDef } from '../data/spells';
import { createScreen, createPanel, createTitleBar, el } from './Theme';

const CATEGORY_ORDER = ['attack', 'healing', 'defense', 'control', 'movement', 'divination', 'misc'];
const CATEGORY_COLORS: Record<string, string> = {
  attack: '#f64', healing: '#4f4', defense: '#48f', control: '#c4f',
  movement: '#fc4', divination: '#4af', misc: '#aaa',
};

export function createSpellScreen(
  state: GameState,
  onCast: (spellId: string) => void,
  onClose: () => void,
): HTMLElement & { cleanup: () => void } {
  const h = state.hero;

  const screen = createScreen();
  screen.style.minHeight = '100vh';

  // Title bar with MP display
  const titleBar = createTitleBar('Spells', () => { cleanup(); onClose(); });
  const mpSpan = el('span', { color: '#48f', fontSize: '14px' }, `MP: ${h.mp}/${h.maxMp}`);
  // Insert MP span before close button
  const closeBtn = titleBar.lastChild;
  titleBar.insertBefore(mpSpan, closeBtn);
  screen.appendChild(titleBar);

  if (h.knownSpells.length === 0) {
    const panel = createPanel();
    panel.style.textAlign = 'center';
    panel.style.color = '#555';
    panel.style.padding = '24px';
    panel.textContent = 'No spells learned yet.';
    screen.appendChild(panel);
  } else {
    // Group spells by category
    const grouped: Record<string, { spell: SpellDef; idx: number }[]> = {};
    for (let i = 0; i < h.knownSpells.length; i++) {
      const spell = SPELL_BY_ID[h.knownSpells[i]];
      if (!spell) continue;
      const cat = spell.category;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({ spell, idx: i });
    }

    for (const cat of CATEGORY_ORDER) {
      const spells = grouped[cat];
      if (!spells || spells.length === 0) continue;

      const catColor = CATEGORY_COLORS[cat] || '#aaa';
      const panel = createPanel(cat);
      // Override panel-header color with category color
      const header = panel.firstElementChild as HTMLElement | null;
      if (header) header.style.color = catColor;

      for (const { spell, idx } of spells) {
        const canCast = h.mp >= spell.manaCost;
        const row = el('div', {
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '4px 8px',
          cursor: canCast ? 'pointer' : 'default',
          borderRadius: '3px',
          opacity: canCast ? '1' : '0.4',
        });

        // Hotkey badge
        const hotkey = idx < 9 ? String(idx + 1) : '';
        row.appendChild(el('span', {
          width: '20px', textAlign: 'center',
          fontSize: '11px', color: '#666', fontFamily: 'monospace',
        }, hotkey));

        // Spell name
        row.appendChild(el('span', {
          flex: '1', fontSize: '13px', color: canCast ? '#ddd' : '#666',
        }, spell.name));

        // Level
        row.appendChild(el('span', {
          fontSize: '11px', color: '#666', width: '30px',
        }, `L${spell.level}`));

        // MP cost
        row.appendChild(el('span', {
          fontSize: '11px', color: canCast ? '#48f' : '#335', width: '35px', textAlign: 'right',
        }, `${spell.manaCost} MP`));

        // Targeting type
        row.appendChild(el('span', {
          fontSize: '10px', color: '#555', width: '50px', textAlign: 'right',
        }, spell.targeting));

        if (canCast) {
          row.addEventListener('click', () => {
            cleanup();
            onCast(spell.id);
          });
          row.addEventListener('mouseenter', () => { row.style.background = '#1a1a2a'; });
          row.addEventListener('mouseleave', () => { row.style.background = ''; });
        }

        panel.appendChild(row);
      }

      screen.appendChild(panel);
    }
  }

  // Description footer
  screen.appendChild(el('div', {
    width: '100%', fontSize: '11px', color: '#555',
    marginTop: '4px', textAlign: 'center',
  }, 'Click a spell to cast it. Keys 1-9 also work from the game screen.'));

  // Keyboard
  const keyHandler = (e: KeyboardEvent) => {
    if (e.code === 'Escape' || e.code === 'KeyZ') {
      e.preventDefault();
      cleanup();
      onClose();
      return;
    }
    // Number keys to quick-cast
    const digit = e.code.match(/^Digit([1-9])$/);
    if (digit) {
      const idx = parseInt(digit[1]) - 1;
      if (idx < h.knownSpells.length) {
        const spell = SPELL_BY_ID[h.knownSpells[idx]];
        if (spell && h.mp >= spell.manaCost) {
          e.preventDefault();
          cleanup();
          onCast(h.knownSpells[idx]);
        }
      }
    }
  };
  document.addEventListener('keydown', keyHandler);
  const cleanup = () => { document.removeEventListener('keydown', keyHandler); };
  (screen as HTMLElement & { cleanup: () => void }).cleanup = cleanup;
  return screen as HTMLElement & { cleanup: () => void };
}
