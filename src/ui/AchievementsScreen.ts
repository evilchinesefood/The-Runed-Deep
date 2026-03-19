import { createScreen, createTitleBar, createPanel, el } from './Theme';
import { ACHIEVEMENTS, getAchievementState } from '../systems/Achievements';

export function createAchievementsScreen(
  onClose: () => void,
): HTMLElement & { cleanup: () => void } {
  const state = getAchievementState();
  const screen = createScreen();
  screen.style.maxHeight = '100vh';
  screen.style.overflowY = 'auto';

  screen.appendChild(createTitleBar('Achievements', () => { cleanup(); onClose(); }));

  const unlocked = state.unlocked.length;
  const total = ACHIEVEMENTS.length;
  const pct = Math.round((unlocked / total) * 100);
  screen.appendChild(el('div', { marginBottom: '8px', fontSize: '13px', color: '#888', textAlign: 'center' },
    `${unlocked} / ${total} unlocked (${pct}%)`));

  const panel = createPanel();

  for (const ach of ACHIEVEMENTS) {
    const isUnlockedAch = state.unlocked.includes(ach.id);
    const row = el('div', {
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '6px 8px', marginBottom: '4px',
      opacity: isUnlockedAch ? '1' : '0.35',
      borderRadius: '4px',
      background: isUnlockedAch ? '#1a1a0a' : 'transparent',
    });
    row.appendChild(el('span', { fontSize: '20px', width: '28px', textAlign: 'center' }, ach.icon));
    const info = el('div', { flex: '1' });
    info.appendChild(el('div', { fontSize: '13px', fontWeight: 'bold', color: isUnlockedAch ? '#c90' : '#666' }, ach.name));
    info.appendChild(el('div', { fontSize: '11px', color: isUnlockedAch ? '#888' : '#444' }, ach.description));
    row.appendChild(info);
    if (isUnlockedAch) {
      row.appendChild(el('span', { fontSize: '11px', color: '#4f4' }, '✓'));
    }
    panel.appendChild(row);
  }

  screen.appendChild(panel);

  const keyHandler = (e: KeyboardEvent) => {
    if (e.code === 'Escape' || e.code === 'F2') { e.preventDefault(); cleanup(); onClose(); }
  };
  document.addEventListener('keydown', keyHandler);
  const cleanup = () => { document.removeEventListener('keydown', keyHandler); };
  (screen as HTMLElement & { cleanup: () => void }).cleanup = cleanup;
  return screen as HTMLElement & { cleanup: () => void };
}
