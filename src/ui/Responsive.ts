const GAME_WIDTH = 672; // viewport tiles * 32

export function getScale(): number {
  const w = window.innerWidth;
  if (w >= GAME_WIDTH + 40) return 1;
  return Math.max(0.5, (w - 16) / GAME_WIDTH);
}

export function applyResponsiveStyles(): void {
  const existing = document.getElementById('responsive-styles');
  if (existing) return;
  const style = document.createElement('style');
  style.id = 'responsive-styles';
  style.textContent = `
    @media (max-width: 720px) {
      .game-map {
        transform-origin: top center;
      }
      body {
        overflow: auto !important;
        height: auto !important;
      }
    }
    @media (max-width: 480px) {
      .game-map {
        margin: 0 !important;
      }
    }
    @media (orientation: landscape) and (max-height: 500px) {
      body {
        overflow: auto !important;
      }
    }
  `;
  document.head.appendChild(style);
}
