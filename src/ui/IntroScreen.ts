import { createScreen, el } from './Theme';

const PAGES = [
  {
    title: 'A Question of Vengeance',
    text: `You grew up in the small village of Bjarnarhaven, nestled in the shadow of the mountains. Life was simple — fishing, farming, and the occasional tale of ancient ruins whispered by the elders around the fire.

That peace ended the night the creatures came.

They poured from the abandoned mine on the mountainside — goblins, rats the size of dogs, and things that moved in the dark with eyes like embers. By dawn, the village was ash. Your family, your home — gone.`,
  },
  {
    title: 'The Abandoned Mine',
    text: `Among the ruins, you found the old sage Einar, barely alive. With his dying breath, he spoke of a darkness growing beneath the mountain — an ancient evil stirring in the depths of what was once a simple copper mine.

"The mine leads deeper than anyone knows," he rasped. "Fortress halls... a castle of the old kings... and at the bottom, the fire lord Surtur himself. He must be stopped, or the surface world will burn."

He pressed a worn spellbook into your hands and pointed toward the mine entrance.`,
  },
  {
    title: 'Your Quest Begins',
    text: `Armed with little more than determination and a single spell, you stand at the mouth of the mine. Forty levels of darkness, monsters, and ancient treasure lie between you and Surtur.

But you are not without hope. A small town remains near the mine entrance — merchants, a temple of Odin, and a wise sage who can aid your journey. Venture deep, grow strong, return to town to recover, and press ever downward.

The wind howls at your back. The darkness beckons.

Your quest for vengeance begins now.`,
  },
];

export function createIntroScreen(
  onComplete: () => void,
): HTMLElement {
  let pageIdx = 0;

  const screen = createScreen();
  screen.style.minHeight = '100vh';
  screen.style.justifyContent = 'center';

  // Parchment container
  const parchment = el('div', {
    maxWidth: '520px',
    width: '100%',
    background: 'linear-gradient(to bottom, #d4c5a0, #c4b48a, #d4c5a0)',
    border: '3px solid #8a7550',
    borderRadius: '4px',
    padding: '32px 36px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.6), inset 0 0 30px rgba(0,0,0,0.1)',
    color: '#2a2010',
    fontFamily: 'Georgia, serif',
    position: 'relative',
  });

  // Decorative top edge
  const topEdge = el('div', {
    position: 'absolute',
    top: '0',
    left: '0',
    right: '0',
    height: '3px',
    background: 'linear-gradient(to right, transparent, #8a7550, #a08860, #8a7550, transparent)',
  });
  parchment.appendChild(topEdge);

  const titleEl = el('h2', {
    textAlign: 'center',
    color: '#4a3520',
    fontSize: '20px',
    margin: '0 0 16px',
    fontFamily: 'Georgia, serif',
    letterSpacing: '1px',
  });
  parchment.appendChild(titleEl);

  const textEl = el('div', {
    fontSize: '14px',
    lineHeight: '1.7',
    color: '#3a2a15',
    whiteSpace: 'pre-line',
    marginBottom: '24px',
  });
  parchment.appendChild(textEl);

  // Page indicator
  const pageIndicator = el('div', {
    textAlign: 'center',
    fontSize: '12px',
    color: '#8a7550',
    marginBottom: '16px',
  });
  parchment.appendChild(pageIndicator);

  // Buttons
  const btnRow = el('div', {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
  });

  const nextBtn = el('div', {
    padding: '8px 28px',
    background: '#5a4530',
    color: '#d4c5a0',
    border: '1px solid #8a7550',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '14px',
    fontFamily: 'Georgia, serif',
    userSelect: 'none',
    transition: 'background 0.15s',
    textAlign: 'center',
  });
  nextBtn.addEventListener('mouseenter', () => { nextBtn.style.background = '#6a5540'; });
  nextBtn.addEventListener('mouseleave', () => { nextBtn.style.background = '#5a4530'; });
  btnRow.appendChild(nextBtn);

  const skipBtn = el('div', {
    padding: '8px 16px',
    color: '#8a7550',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: 'Georgia, serif',
    userSelect: 'none',
    textAlign: 'center',
  });
  skipBtn.textContent = 'Skip Intro';
  skipBtn.addEventListener('click', onComplete);
  btnRow.appendChild(skipBtn);

  parchment.appendChild(btnRow);
  screen.appendChild(parchment);

  function renderPage(): void {
    const page = PAGES[pageIdx];
    titleEl.textContent = page.title;
    textEl.textContent = page.text;
    pageIndicator.textContent = `— ${pageIdx + 1} of ${PAGES.length} —`;

    if (pageIdx < PAGES.length - 1) {
      nextBtn.textContent = 'Continue...';
      nextBtn.onclick = () => { pageIdx++; renderPage(); };
    } else {
      nextBtn.textContent = 'Begin Your Quest';
      nextBtn.onclick = onComplete;
      skipBtn.style.display = 'none';
    }
  }

  renderPage();

  // Keyboard: Enter/Space to advance, Esc to skip
  const keyHandler = (e: KeyboardEvent) => {
    if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      if (pageIdx < PAGES.length - 1) { pageIdx++; renderPage(); }
      else { cleanup(); onComplete(); }
    }
    if (e.code === 'Escape') { e.preventDefault(); cleanup(); onComplete(); }
  };
  document.addEventListener('keydown', keyHandler);
  const cleanup = () => { document.removeEventListener('keydown', keyHandler); };

  return screen;
}
