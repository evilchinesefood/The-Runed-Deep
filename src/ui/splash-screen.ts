import type { GameAction } from '../core/types';
import { getSaveSlots, deleteSave } from '../core/save-load';
import { getLeaderboard } from '../systems/Scoring';
import { createScreen, createPanel, createButton, el } from './Theme';

export function createSplashScreen(
  container: HTMLElement,
  onAction: (action: GameAction) => void,
  onLoadSlot: (slot: number) => void,
): HTMLElement {
  const splash = createScreen();
  splash.style.justifyContent = 'center';
  splash.style.minHeight = '100vh';

  // Logo image
  const logo = document.createElement('img');
  logo.src = '/assets/logo.png';
  logo.alt = 'Castle of the Winds';
  logo.style.cssText = 'max-width:100%;height:auto;margin-bottom:40px;';
  splash.appendChild(logo);

  // Buttons
  const buttons = el('div', { display: 'flex', gap: '20px', marginBottom: '30px' });

  const newGameBtn = createButton('New Game');
  newGameBtn.addEventListener('click', () => onAction({ type: 'newGame' }));
  buttons.appendChild(newGameBtn);

  const lbBtn = createButton('Leaderboard');
  buttons.appendChild(lbBtn);

  splash.appendChild(buttons);

  // Leaderboard panel (toggled)
  const lbPanel = createPanel('Hall of the Fallen');
  lbPanel.style.display = 'none';

  const renderLeaderboard = () => {
    // Clear previous entries (keep header)
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

    const slotPanel = createPanel();
    slotPanel.style.display = 'flex';
    slotPanel.style.flexDirection = 'column';
    slotPanel.style.gap = '8px';
    slotPanel.style.padding = '8px';

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

      const loadBtn = createButton('Load');
      loadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onLoadSlot(info.slot);
      });
      btnGroup.appendChild(loadBtn);

      const delBtn = createButton('X', 'danger');
      delBtn.style.fontSize = '12px';
      delBtn.style.padding = '4px 8px';
      const slotNum = info.slot;
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
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
        const yesBtn = createButton('Yes', 'danger');
        yesBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          deleteSave(slotNum);
          row.remove();
          if (slotPanel.children.length === 0) {
            slotPanel.previousElementSibling?.remove();
            slotPanel.remove();
          }
        });
        const noBtn = createButton('No');
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

      slotPanel.appendChild(row);
    }

    splash.appendChild(slotPanel);
  }

  container.appendChild(splash);
  return splash;
}
