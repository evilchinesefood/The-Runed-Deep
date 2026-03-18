import type { GameState, GameAction } from '../core/types';
import { calculateScore, addToLeaderboard, getLeaderboard } from '../systems/Scoring';

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

  const lastCombatMsg = [...state.messages]
    .reverse()
    .find(m => m.severity === 'combat' && m.text.includes('hits'));
  const causeOfDeath = lastCombatMsg
    ? extractKiller(lastCombatMsg.text)
    : 'unknown causes';

  const score = calculateScore(
    hero.level,
    state.currentFloor + 1,
    hero.xp,
    state.turn,
    hero.copper,
    state.difficulty,
  );

  const entry = {
    name: hero.name,
    score,
    level: hero.level,
    floor: state.currentFloor + 1,
    turns: state.turn,
    difficulty: state.difficulty,
    causeOfDeath,
    timestamp: Date.now(),
  };
  const rank = addToLeaderboard(entry);
  const leaderboard = getLeaderboard();

  const screen = el('div', {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#000',
    color: '#ccc',
    fontFamily: "'Segoe UI', Tahoma, sans-serif",
    padding: '20px',
    boxSizing: 'border-box',
  });

  // Tombstone
  const tombstone = el('div', {
    width: '320px',
    padding: '40px 30px',
    background: '#1a1a1a',
    border: '3px solid #444',
    borderRadius: '60px 60px 0 0',
    textAlign: 'center',
    marginBottom: '20px',
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
    marginBottom: '6px',
  }, `Turns survived: ${state.turn}`));

  tombstone.appendChild(el('hr', {
    border: 'none',
    borderTop: '1px solid #333',
    margin: '12px 0',
  }));

  tombstone.appendChild(el('div', {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#c90',
    marginBottom: '4px',
  }, `Score: ${score.toLocaleString()}`));

  if (rank > 0) {
    tombstone.appendChild(el('div', {
      fontSize: '13px',
      color: '#9c6',
    }, `Rank #${rank} on the leaderboard!`));
  }

  screen.appendChild(tombstone);

  // Leaderboard
  if (leaderboard.length > 0) {
    const lbSection = el('div', {
      width: '400px',
      marginBottom: '24px',
    });

    lbSection.appendChild(el('div', {
      fontSize: '14px',
      color: '#888',
      textAlign: 'center',
      marginBottom: '8px',
      letterSpacing: '1px',
      textTransform: 'uppercase',
    }, 'Hall of the Fallen'));

    const table = el('div', {
      display: 'grid',
      gridTemplateColumns: '24px 1fr 70px 50px 50px 80px',
      gap: '2px 8px',
      fontSize: '12px',
    });

    // Header row
    const headers = ['#', 'Name', 'Score', 'Lvl', 'Floor', 'Diff'];
    for (const h of headers) {
      table.appendChild(el('div', { color: '#555', fontWeight: 'bold', paddingBottom: '4px' }, h));
    }

    for (let i = 0; i < leaderboard.length; i++) {
      const e = leaderboard[i];
      const isCurrentRun = rank > 0 && i === rank - 1;
      const rowColor = isCurrentRun ? '#c90' : '#666';

      table.appendChild(el('div', { color: rowColor }, `${i + 1}`));
      table.appendChild(el('div', { color: isCurrentRun ? '#fc0' : '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, e.name));
      table.appendChild(el('div', { color: rowColor }, e.score.toLocaleString()));
      table.appendChild(el('div', { color: rowColor }, `${e.level}`));
      table.appendChild(el('div', { color: rowColor }, `${e.floor}`));
      table.appendChild(el('div', { color: rowColor, fontSize: '11px' }, e.difficulty));
    }

    lbSection.appendChild(table);
    screen.appendChild(lbSection);
  }

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
  const match = message.match(/^The (.+?) hits/);
  if (match) return match[1];
  return 'unknown causes';
}
