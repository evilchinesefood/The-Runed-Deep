import type { GameState, GameAction } from '../core/types';

function el(tag: string, styles?: Partial<CSSStyleDeclaration>, text?: string): HTMLElement {
  const e = document.createElement(tag);
  if (styles) Object.assign(e.style, styles);
  if (text !== undefined) e.textContent = text;
  return e;
}

export function createDeathScreen(
  container: HTMLElement,
  state: GameState,
  onAction: (action: GameAction) => void,
): HTMLElement {
  const hero = state.hero;

  // Try to find what killed the player from the last combat message
  const lastCombatMsg = [...state.messages]
    .reverse()
    .find(m => m.severity === 'combat' && m.text.includes('hits'));
  const causeOfDeath = lastCombatMsg
    ? extractKiller(lastCombatMsg.text)
    : 'unknown causes';

  const screen = el('div', {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#000',
    color: '#ccc',
    fontFamily: "'Segoe UI', Tahoma, sans-serif",
  });

  // Tombstone
  const tombstone = el('div', {
    width: '320px',
    padding: '40px 30px',
    background: '#1a1a1a',
    border: '3px solid #444',
    borderRadius: '60px 60px 0 0',
    textAlign: 'center',
    marginBottom: '30px',
  });

  tombstone.appendChild(el('div', {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#888',
    marginBottom: '16px',
    fontFamily: 'serif',
  }, 'R.I.P.'));

  tombstone.appendChild(el('div', {
    fontSize: '20px',
    color: '#aaa',
    marginBottom: '8px',
    fontFamily: 'serif',
  }, hero.name));

  tombstone.appendChild(el('div', {
    fontSize: '14px',
    color: '#666',
    marginBottom: '16px',
  }, `Level ${hero.level} Adventurer`));

  tombstone.appendChild(el('hr', {
    border: 'none',
    borderTop: '1px solid #333',
    margin: '12px 0',
  }));

  tombstone.appendChild(el('div', {
    fontSize: '13px',
    color: '#777',
    marginBottom: '6px',
  }, `Slain by: ${causeOfDeath}`));

  tombstone.appendChild(el('div', {
    fontSize: '13px',
    color: '#777',
    marginBottom: '6px',
  }, `Dungeon level: ${state.currentFloor + 1}`));

  tombstone.appendChild(el('div', {
    fontSize: '13px',
    color: '#777',
    marginBottom: '6px',
  }, `Experience: ${hero.xp}`));

  tombstone.appendChild(el('div', {
    fontSize: '13px',
    color: '#777',
  }, `Turns survived: ${state.turn}`));

  screen.appendChild(tombstone);

  // Buttons
  const buttons = el('div', { display: 'flex', gap: '20px' });

  const newGameBtn = document.createElement('button');
  newGameBtn.textContent = 'New Game';
  newGameBtn.style.cssText = 'padding:12px 32px;font-size:16px;background:#333;color:#fff;border:2px solid #666;cursor:pointer;';
  newGameBtn.addEventListener('click', () => {
    onAction({ type: 'setScreen', screen: 'splash' });
  });

  buttons.appendChild(newGameBtn);
  screen.appendChild(buttons);

  container.appendChild(screen);
  return screen;
}

function extractKiller(message: string): string {
  // Messages look like: "The Giant Rat hits Hero for 3 damage."
  const match = message.match(/^The (.+?) hits/);
  if (match) return match[1];
  return 'unknown causes';
}
