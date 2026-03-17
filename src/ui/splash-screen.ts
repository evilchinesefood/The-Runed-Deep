import type { GameAction } from '../core/types';

function el(tag: string, styles?: Partial<CSSStyleDeclaration>, text?: string): HTMLElement {
  const e = document.createElement(tag);
  if (styles) Object.assign(e.style, styles);
  if (text !== undefined) e.textContent = text;
  return e;
}

export function createSplashScreen(
  container: HTMLElement,
  onAction: (action: GameAction) => void
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

  const title = el('h1', {
    fontSize: '36px',
    color: '#c90',
    margin: '0 0 8px',
    textShadow: '2px 2px 4px #000',
  }, 'Castle of the Winds');

  const subtitle = el('div', {
    fontSize: '14px',
    color: '#888',
    marginBottom: '40px',
  }, 'A Question of Vengeance');

  const imgContainer = el('div', {
    display: 'flex',
    gap: '0px',
    marginBottom: '40px',
  });

  const img1 = document.createElement('img');
  img1.src = '/assets/landing_cotw1.jpg';
  img1.style.cssText = 'max-height: 300px;';
  img1.alt = 'Castle of the Winds';

  const img2 = document.createElement('img');
  img2.src = '/assets/landing_cotw2.jpg';
  img2.style.cssText = 'max-height: 300px;';
  img2.alt = 'Castle of the Winds';

  imgContainer.appendChild(img1);
  imgContainer.appendChild(img2);

  const buttons = el('div', {
    display: 'flex',
    gap: '20px',
  });

  const newGameBtn = document.createElement('button');
  newGameBtn.textContent = 'New Game';
  newGameBtn.style.cssText = `
    padding: 12px 32px;
    font-size: 16px;
    background: #333;
    color: #fff;
    border: 2px solid #666;
    cursor: pointer;
  `;
  newGameBtn.addEventListener('click', () => onAction({ type: 'newGame' }));

  const loadBtn = document.createElement('button');
  loadBtn.textContent = 'Load Game';
  loadBtn.style.cssText = newGameBtn.style.cssText;
  loadBtn.addEventListener('click', () => onAction({ type: 'load' }));

  buttons.appendChild(newGameBtn);
  buttons.appendChild(loadBtn);

  splash.appendChild(title);
  splash.appendChild(subtitle);
  splash.appendChild(imgContainer);
  splash.appendChild(buttons);

  container.appendChild(splash);
  return splash;
}
