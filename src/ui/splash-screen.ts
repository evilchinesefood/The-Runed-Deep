import type { GameAction } from '../core/types';
import { getSaveSlots } from '../core/save-load';

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

  splash.appendChild(buttons);

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

      const loadBtn = document.createElement('button');
      loadBtn.textContent = 'Load';
      loadBtn.style.cssText = 'padding:6px 16px;background:#335;color:#aaf;border:1px solid #558;cursor:pointer;';
      loadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onLoadSlot(info.slot);
      });
      row.appendChild(loadBtn);

      row.addEventListener('click', () => onLoadSlot(info.slot));

      slotContainer.appendChild(row);
    }

    splash.appendChild(slotContainer);
  }

  container.appendChild(splash);
  return splash;
}
