import type { GameAction } from '../core/types';
import { getSaveSlots, deleteSave } from '../core/save-load';
import { getLeaderboard } from '../systems/Scoring';

function el(tag: string, styles?: Partial<CSSStyleDeclaration>, text?: string): HTMLElement {
  const e = document.createElement(tag);
  if (styles) Object.assign(e.style, styles);
  if (text !== undefined) e.textContent = text;
  return e;
}

const BTN_STYLE = `
  padding: 12px 32px;
  font-size: 16px;
  background: #333;
  color: #fff;
  border: 2px solid #666;
  cursor: pointer;
`;

export function createSplashScreen(
  container: HTMLElement,
  onAction: (action: GameAction) => void,
  onLoadSlot: (slot: number) => void,
): HTMLElement {
  const splash = el('div', {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#000',
    color: '#ccc',
    fontFamily: "'Segoe UI', Tahoma, sans-serif",
  });

  // Logo image
  const logo = document.createElement('img');
  logo.src = '/assets/logo.png';
  logo.alt = 'Castle of the Winds';
  logo.style.cssText = 'max-width:400px;height:auto;margin-bottom:24px;';
  splash.appendChild(logo);

  splash.appendChild(el('h1', {
    fontSize: '36px',
    color: '#c90',
    margin: '0 0 40px',
    textShadow: '2px 2px 4px #000',
  }, 'Castle of the Winds'));

  // Buttons
  const buttons = el('div', { display: 'flex', gap: '20px', marginBottom: '30px' });

  const newGameBtn = document.createElement('button');
  newGameBtn.textContent = 'New Game';
  newGameBtn.style.cssText = BTN_STYLE;
  newGameBtn.addEventListener('click', () => onAction({ type: 'newGame' }));
  buttons.appendChild(newGameBtn);

  const lbBtn = document.createElement('button');
  lbBtn.textContent = 'Leaderboard';
  lbBtn.style.cssText = BTN_STYLE;
  buttons.appendChild(lbBtn);

  splash.appendChild(buttons);

  // Leaderboard panel (toggled)
  const lbPanel = el('div', {
    display: 'none',
    width: '440px',
    background: '#111',
    border: '1px solid #444',
    padding: '16px',
    marginBottom: '20px',
    boxSizing: 'border-box',
  });

  const lbTitle = el('div', {
    fontSize: '14px',
    color: '#888',
    textAlign: 'center',
    marginBottom: '10px',
    letterSpacing: '1px',
    textTransform: 'uppercase',
  }, 'Hall of the Fallen');
  lbPanel.appendChild(lbTitle);

  const renderLeaderboard = () => {
    // Clear previous entries (keep title)
    while (lbPanel.children.length > 1) lbPanel.removeChild(lbPanel.lastChild!);

    const entries = getLeaderboard();
    if (entries.length === 0) {
      lbPanel.appendChild(el('div', { color: '#555', textAlign: 'center', fontSize: '13px' }, 'No runs recorded yet.'));
      return;
    }

    const table = el('div', {
      display: 'grid',
      gridTemplateColumns: '24px 1fr 70px 50px 50px 80px',
      gap: '2px 8px',
      fontSize: '12px',
    });

    for (const h of ['#', 'Name', 'Score', 'Lvl', 'Floor', 'Diff']) {
      table.appendChild(el('div', { color: '#555', fontWeight: 'bold', paddingBottom: '4px' }, h));
    }

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      table.appendChild(el('div', { color: '#666' }, `${i + 1}`));
      table.appendChild(el('div', { color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, e.name));
      table.appendChild(el('div', { color: '#666' }, e.score.toLocaleString()));
      table.appendChild(el('div', { color: '#666' }, `${e.level}`));
      table.appendChild(el('div', { color: '#666' }, `${e.floor}`));
      table.appendChild(el('div', { color: '#666', fontSize: '11px' }, e.difficulty));
    }

    lbPanel.appendChild(table);
  };

  lbBtn.addEventListener('click', () => {
    if (lbPanel.style.display === 'none') {
      renderLeaderboard();
      lbPanel.style.display = 'block';
    } else {
      lbPanel.style.display = 'none';
    }
  });

  splash.appendChild(lbPanel);

  // Save slots
  const slots = getSaveSlots();
  const hasAny = slots.some(s => s !== null);

  if (hasAny) {
    splash.appendChild(el('div', {
      fontSize: '14px',
      color: '#888',
      marginBottom: '12px',
    }, 'Saved Games'));

    const slotContainer = el('div', {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      width: '400px',
    });

    for (let i = 0; i < slots.length; i++) {
      const info = slots[i];
      if (!info) continue;

      const row = el('div', {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 16px',
        background: '#1a1a1a',
        border: '1px solid #444',
        cursor: 'pointer',
        position: 'relative',
      });

      const details = el('div');
      details.appendChild(el('div', { fontWeight: 'bold', color: '#ccc' }, info.name));
      details.appendChild(el('div', { fontSize: '12px', color: '#888' },
        `Level ${info.level} | Floor ${info.floor} | Turn ${info.turn}`
      ));
      const date = new Date(info.timestamp);
      details.appendChild(el('div', { fontSize: '11px', color: '#555' },
        date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
      ));
      row.appendChild(details);

      const btnGroup = el('div', { display: 'flex', gap: '8px', alignItems: 'center' });

      const loadBtn = document.createElement('button');
      loadBtn.textContent = 'Load';
      loadBtn.style.cssText = 'padding:6px 16px;background:#335;color:#aaf;border:1px solid #558;cursor:pointer;';
      loadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onLoadSlot(info.slot);
      });
      btnGroup.appendChild(loadBtn);

      // Delete button
      const delBtn = document.createElement('button');
      delBtn.textContent = 'X';
      delBtn.style.cssText = 'padding:4px 8px;background:#411;color:#f66;border:1px solid #633;cursor:pointer;font-weight:bold;font-size:12px;';
      const slotNum = info.slot;
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Show confirmation
        const confirm = el('div', {
          position: 'absolute',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          background: 'rgba(0,0,0,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          zIndex: '10',
        });
        confirm.appendChild(el('span', { color: '#f88', fontSize: '13px' }, 'Delete this save?'));
        const yesBtn = document.createElement('button');
        yesBtn.textContent = 'Yes';
        yesBtn.style.cssText = 'padding:4px 14px;background:#622;color:#faa;border:1px solid #844;cursor:pointer;';
        yesBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          deleteSave(slotNum);
          row.remove();
          // If no saves left, remove the entire section
          if (slotContainer.children.length === 0) {
            slotContainer.previousElementSibling?.remove(); // "Saved Games" label
            slotContainer.remove();
          }
        });
        const noBtn = document.createElement('button');
        noBtn.textContent = 'No';
        noBtn.style.cssText = 'padding:4px 14px;background:#333;color:#ccc;border:1px solid #555;cursor:pointer;';
        noBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          confirm.remove();
        });
        confirm.appendChild(yesBtn);
        confirm.appendChild(noBtn);
        row.appendChild(confirm);
      });
      btnGroup.appendChild(delBtn);

      row.appendChild(btnGroup);
      row.addEventListener('click', () => onLoadSlot(info.slot));

      slotContainer.appendChild(row);
    }

    splash.appendChild(slotContainer);
  }

  container.appendChild(splash);
  return splash;
}
