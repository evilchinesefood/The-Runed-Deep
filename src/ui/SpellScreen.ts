import type { GameState } from '../core/types';
import { SPELL_BY_ID, type SpellDef } from '../data/spells';

function el(tag: string, styles?: Partial<CSSStyleDeclaration>, text?: string): HTMLElement {
  const e = document.createElement(tag);
  if (styles) Object.assign(e.style, styles);
  if (text !== undefined) e.textContent = text;
  return e;
}

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

  // Title
  const titleBar = el('div', {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '550px',
    marginBottom: '8px',
  });
  titleBar.appendChild(el('h2', { color: '#c90', margin: '0', fontSize: '18px' }, 'Spells'));
  titleBar.appendChild(el('span', { color: '#48f', fontSize: '14px' }, `MP: ${h.mp}/${h.maxMp}`));

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close (Esc)';
  closeBtn.style.cssText = 'padding:4px 12px;background:#333;color:#ccc;border:1px solid #555;cursor:pointer;';
  closeBtn.addEventListener('click', () => { cleanup(); onClose(); });
  titleBar.appendChild(closeBtn);
  screen.appendChild(titleBar);

  if (h.knownSpells.length === 0) {
    const panel = el('div', {
      width: '550px', background: '#111', border: '1px solid #333',
      padding: '24px', textAlign: 'center', color: '#555',
    });
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
      const panel = el('div', {
        width: '550px', background: '#111', border: '1px solid #333',
        padding: '10px 12px', marginBottom: '6px', boxSizing: 'border-box',
      });

      // Category header
      panel.appendChild(el('div', {
        fontSize: '11px', color: catColor, fontWeight: 'bold',
        textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '1px',
      }, cat));

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
    width: '550px', fontSize: '11px', color: '#555',
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
