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
  onUpdateHotkeys: (hotkeys: string[]) => void,
): HTMLElement & { cleanup: () => void } {
  const h = state.hero;
  let hotkeys = [...h.spellHotkeys];

  const screen = createScreen();
  screen.classList.add('screen-scrollable');

  // Title bar with MP display
  const titleBar = createTitleBar('Spells', () => { cleanup(); onClose(); });
  const mpSpan = el('span', { color: '#48f', fontSize: '14px' }, `MP: ${h.mp}/${h.maxMp}`);
  const closeBtn = titleBar.lastChild;
  titleBar.insertBefore(mpSpan, closeBtn);
  screen.appendChild(titleBar);

  // Hotkey bar panel
  const hotkeyPanel = createPanel('HOTKEYS (1-7)');
  screen.appendChild(hotkeyPanel);

  function renderHotkeyPanel(): void {
    // Remove all children after the header
    const header = hotkeyPanel.firstElementChild;
    while (hotkeyPanel.lastChild && hotkeyPanel.lastChild !== header) {
      hotkeyPanel.removeChild(hotkeyPanel.lastChild);
    }

    for (let i = 0; i < 7; i++) {
      const slotId = hotkeys[i];
      const spell = slotId ? SPELL_BY_ID[slotId] : null;
      const row = el('div', {
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '3px 8px', fontSize: '12px',
      });
      row.appendChild(el('span', { color: '#888', width: '16px', textAlign: 'center', fontFamily: 'monospace' }, String(i + 1)));
      row.appendChild(el('span', { flex: '1', color: spell ? '#ddd' : '#444' }, spell ? spell.name : '— empty —'));
      if (spell) {
        const removeBtn = el('div', {
          color: '#fff', cursor: 'pointer', fontSize: '12px',
          background: '#622', border: '1px solid #844', borderRadius: '4px',
          padding: '2px 10px', userSelect: 'none', fontWeight: 'bold',
          transition: 'background 0.1s',
        }, 'Remove');
        removeBtn.addEventListener('mouseenter', () => { removeBtn.style.background = '#833'; });
        removeBtn.addEventListener('mouseleave', () => { removeBtn.style.background = '#622'; });
        removeBtn.addEventListener('click', () => {
          hotkeys.splice(i, 1);
          onUpdateHotkeys([...hotkeys]);
          renderHotkeyPanel();
          renderCategoryPanels();
        });
        row.appendChild(removeBtn);
      }
      hotkeyPanel.appendChild(row);
    }
  }

  renderHotkeyPanel();

  // Category panels container — rebuild when hotkeys change
  const categoryContainer = document.createElement('div');
  screen.appendChild(categoryContainer);

  function renderCategoryPanels(): void {
    categoryContainer.replaceChildren();

    if (h.knownSpells.length === 0) {
      const panel = createPanel();
      panel.style.textAlign = 'center';
      panel.style.color = '#555';
      panel.style.padding = '24px';
      panel.textContent = 'No spells learned yet.';
      categoryContainer.appendChild(panel);
      return;
    }

    const grouped: Record<string, { spell: SpellDef; spellId: string }[]> = {};
    for (const sid of h.knownSpells) {
      const spell = SPELL_BY_ID[sid];
      if (!spell) continue;
      const cat = spell.category;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({ spell, spellId: sid });
    }

    for (const cat of CATEGORY_ORDER) {
      const spells = grouped[cat];
      if (!spells || spells.length === 0) continue;

      const catColor = CATEGORY_COLORS[cat] || '#aaa';
      const panel = createPanel(cat);
      const header = panel.firstElementChild as HTMLElement | null;
      if (header) header.style.color = catColor;

      for (const { spell, spellId } of spells) {
        const canCast = h.mp >= spell.manaCost;
        const inHotkeys = hotkeys.includes(spellId);
        const canAdd = !inHotkeys && hotkeys.length < 7;

        const row = el('div', {
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '4px 8px',
          cursor: canCast ? 'pointer' : 'default',
          borderRadius: '3px',
          opacity: canCast ? '1' : '0.4',
        });

        // Hotkey slot badge
        const hkIdx = hotkeys.indexOf(spellId);
        const badge = hkIdx !== -1 ? String(hkIdx + 1) : '';
        row.appendChild(el('span', {
          width: '20px', textAlign: 'center',
          fontSize: '11px', color: '#888', fontFamily: 'monospace',
        }, badge));

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

        // Hotkey toggle button
        if (inHotkeys) {
          const removeBtn = el('div', {
            color: '#fff', cursor: 'pointer', fontSize: '11px',
            background: '#622', border: '1px solid #844', borderRadius: '4px',
            padding: '2px 8px', userSelect: 'none', fontWeight: 'bold',
            transition: 'background 0.1s', flexShrink: '0',
          }, '\u2212'); // minus sign
          removeBtn.addEventListener('mouseenter', () => { removeBtn.style.background = '#833'; });
          removeBtn.addEventListener('mouseleave', () => { removeBtn.style.background = '#622'; });
          removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            hotkeys = hotkeys.filter(id => id !== spellId);
            onUpdateHotkeys([...hotkeys]);
            renderHotkeyPanel();
            renderCategoryPanels();
          });
          row.appendChild(removeBtn);
        } else if (canAdd) {
          const addBtn = el('div', {
            color: '#fff', cursor: 'pointer', fontSize: '11px',
            background: '#264', border: '1px solid #486', borderRadius: '4px',
            padding: '2px 8px', userSelect: 'none', fontWeight: 'bold',
            transition: 'background 0.1s', flexShrink: '0',
          }, '+');
          addBtn.addEventListener('mouseenter', () => { addBtn.style.background = '#386'; });
          addBtn.addEventListener('mouseleave', () => { addBtn.style.background = '#264'; });
          addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            hotkeys.push(spellId);
            onUpdateHotkeys([...hotkeys]);
            renderHotkeyPanel();
            renderCategoryPanels();
          });
          row.appendChild(addBtn);
        } else {
          row.appendChild(el('span', { width: '32px' }, ''));
        }

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

      categoryContainer.appendChild(panel);
    }
  }

  renderCategoryPanels();

  // Description footer
  screen.appendChild(el('div', {
    width: '100%', fontSize: '11px', color: '#555',
    marginTop: '4px', textAlign: 'center',
  }, 'Click a spell to cast it. Use [+]/[-] to manage hotkey slots 1-7.'));

  // Keyboard
  const keyHandler = (e: KeyboardEvent) => {
    if (e.code === 'Escape' || e.code === 'KeyZ') {
      e.preventDefault();
      cleanup();
      onClose();
      return;
    }
    // Number keys to quick-cast via hotkeys
    const digit = e.code.match(/^Digit([1-7])$/);
    if (digit) {
      const idx = parseInt(digit[1]) - 1;
      if (idx < hotkeys.length) {
        const sid = hotkeys[idx];
        const spell = SPELL_BY_ID[sid];
        if (spell && h.mp >= spell.manaCost) {
          e.preventDefault();
          cleanup();
          onCast(sid);
        }
      }
    }
  };
  document.addEventListener('keydown', keyHandler);
  const cleanup = () => { document.removeEventListener('keydown', keyHandler); };
  (screen as HTMLElement & { cleanup: () => void }).cleanup = cleanup;
  return screen as HTMLElement & { cleanup: () => void };
}
