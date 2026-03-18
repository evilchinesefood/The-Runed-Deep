import type { Attributes, Difficulty, Gender } from '../core/types';
import { STARTER_SPELLS } from '../data/spells';

function el(tag: string, styles?: Partial<CSSStyleDeclaration>, text?: string): HTMLElement {
  const e = document.createElement(tag);
  if (styles) Object.assign(e.style, styles);
  if (text !== undefined) e.textContent = text;
  return e;
}

export interface CharCreationResult {
  name: string;
  gender: Gender;
  attributes: Attributes;
  difficulty: Difficulty;
  startingSpell: string;
}

const PANEL = 'background:#111;border:1px solid #333;padding:16px;margin-bottom:12px;width:480px;box-sizing:border-box;';

export function createCharacterCreationScreen(
  container: HTMLElement,
  onComplete: (result: CharCreationResult) => void
): HTMLElement {
  const TOTAL_POINTS = 230;
  const MIN_ATTR = 20;
  const MAX_ATTR = 72;

  const state = {
    name: 'Hero',
    gender: 'male' as Gender,
    attributes: { strength: 60, intelligence: 55, constitution: 60, dexterity: 55 } as Attributes,
    difficulty: 'easy' as Difficulty,
    startingSpell: STARTER_SPELLS[0].id,
  };

  const screen = el('div', {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px',
    background: '#000',
    color: '#ccc',
    fontFamily: "'Segoe UI', Tahoma, sans-serif",
    minHeight: '100vh',
  });

  // Title
  screen.appendChild(el('h2', {
    color: '#c90',
    margin: '0 0 20px',
    fontSize: '22px',
    letterSpacing: '1px',
  }, 'New Character'));

  // ── Name & Gender row ─────────────────────────────────
  const topPanel = document.createElement('div');
  topPanel.style.cssText = PANEL + 'display:flex;gap:24px;align-items:center;';

  // Name
  const nameGroup = el('div', { flex: '1' });
  nameGroup.appendChild(el('div', { fontSize: '11px', color: '#888', marginBottom: '4px' }, 'NAME'));
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = state.name;
  nameInput.style.cssText = 'width:100%;padding:6px 8px;font-size:14px;background:#1a1a1a;color:#fff;border:1px solid #444;box-sizing:border-box;';
  nameInput.addEventListener('input', () => { state.name = nameInput.value; });
  nameGroup.appendChild(nameInput);
  topPanel.appendChild(nameGroup);

  // Gender
  const genderGroup = el('div');
  genderGroup.appendChild(el('div', { fontSize: '11px', color: '#888', marginBottom: '4px' }, 'GENDER'));
  const genderBtns = el('div', { display: 'flex', gap: '4px' });

  for (const g of ['male', 'female'] as Gender[]) {
    const btn = document.createElement('button');
    btn.textContent = g === 'male' ? 'Male' : 'Female';
    btn.dataset.gender = g;
    btn.style.cssText = `padding:6px 14px;font-size:13px;border:1px solid #555;cursor:pointer;${g === state.gender ? 'background:#446;color:#aaf;' : 'background:#222;color:#888;'}`;
    btn.addEventListener('click', () => {
      state.gender = g;
      genderBtns.querySelectorAll('button').forEach(b => {
        const bb = b as HTMLButtonElement;
        bb.style.cssText = `padding:6px 14px;font-size:13px;border:1px solid #555;cursor:pointer;${bb.dataset.gender === g ? 'background:#446;color:#aaf;' : 'background:#222;color:#888;'}`;
      });
    });
    genderBtns.appendChild(btn);
  }
  genderGroup.appendChild(genderBtns);
  topPanel.appendChild(genderGroup);
  screen.appendChild(topPanel);

  // ── Attributes ────────────────────────────────────────
  const attrPanel = document.createElement('div');
  attrPanel.style.cssText = PANEL;

  const attrHeader = el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' });
  attrHeader.appendChild(el('div', { fontSize: '11px', color: '#888' }, 'ATTRIBUTES'));
  const pointsDisplay = el('span', { fontSize: '12px' });
  attrHeader.appendChild(pointsDisplay);
  attrPanel.appendChild(attrHeader);

  const attrNames: (keyof Attributes)[] = ['strength', 'intelligence', 'constitution', 'dexterity'];
  const attrLabels: Record<keyof Attributes, string> = { strength: 'STR', intelligence: 'INT', constitution: 'CON', dexterity: 'DEX' };
  const attrColors: Record<keyof Attributes, string> = { strength: '#e44', intelligence: '#48f', constitution: '#4c4', dexterity: '#fc4' };
  const valueDisplays: Record<string, HTMLElement> = {};
  const barFills: Record<string, HTMLElement> = {};

  function pointsUsed(): number { return attrNames.reduce((s, a) => s + state.attributes[a], 0); }
  function pointsRemaining(): number { return TOTAL_POINTS - pointsUsed(); }

  for (const attr of attrNames) {
    const row = el('div', { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' });

    row.appendChild(el('span', { width: '32px', fontSize: '12px', color: attrColors[attr], fontWeight: 'bold' }, attrLabels[attr]));

    const minus = document.createElement('button');
    minus.textContent = '-';
    minus.style.cssText = 'width:24px;height:24px;background:#222;color:#ccc;border:1px solid #444;cursor:pointer;font-size:14px;line-height:1;padding:0;';
    minus.addEventListener('click', () => { if (state.attributes[attr] > MIN_ATTR) { state.attributes[attr]--; updateAll(); } });
    row.appendChild(minus);

    // Bar
    const barTrack = el('div', { flex: '1', height: '18px', background: '#1a1a1a', border: '1px solid #333', position: 'relative' });
    const barFill = el('div', { height: '100%', background: attrColors[attr], opacity: '0.6', transition: 'width 0.1s' });
    barTrack.appendChild(barFill);
    barFills[attr] = barFill;
    row.appendChild(barTrack);

    const valDisplay = el('span', { width: '28px', textAlign: 'center', fontWeight: 'bold', fontSize: '13px' }, String(state.attributes[attr]));
    valueDisplays[attr] = valDisplay;
    row.appendChild(valDisplay);

    const plus = document.createElement('button');
    plus.textContent = '+';
    plus.style.cssText = 'width:24px;height:24px;background:#222;color:#ccc;border:1px solid #444;cursor:pointer;font-size:14px;line-height:1;padding:0;';
    plus.addEventListener('click', () => { if (state.attributes[attr] < MAX_ATTR && pointsUsed() < TOTAL_POINTS) { state.attributes[attr]++; updateAll(); } });
    row.appendChild(plus);

    attrPanel.appendChild(row);
  }
  screen.appendChild(attrPanel);

  // ── Stat Preview ──────────────────────────────────────
  const previewPanel = document.createElement('div');
  previewPanel.style.cssText = PANEL + 'display:flex;gap:24px;justify-content:center;padding:10px 16px;';
  screen.appendChild(previewPanel);

  // ── Starting Spell ────────────────────────────────────
  const spellPanel = document.createElement('div');
  spellPanel.style.cssText = PANEL;
  spellPanel.appendChild(el('div', { fontSize: '11px', color: '#888', marginBottom: '8px' }, 'STARTING SPELL'));

  for (const spell of STARTER_SPELLS) {
    const row = el('div', {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '6px 10px',
      border: '1px solid transparent',
      cursor: 'pointer',
      borderRadius: '3px',
      marginBottom: '2px',
    });
    row.dataset.spellId = spell.id;

    const dot = el('div', {
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      border: '2px solid #666',
      flexShrink: '0',
    });
    row.appendChild(dot);

    const info = el('div', { flex: '1' });
    info.appendChild(el('span', { fontWeight: 'bold', color: '#ddd', fontSize: '13px' }, spell.name));
    info.appendChild(el('span', { fontSize: '11px', color: '#666', marginLeft: '8px' }, spell.description));
    row.appendChild(info);

    row.appendChild(el('span', { fontSize: '11px', color: '#48f', flexShrink: '0' }, `${spell.manaCost} MP`));

    row.addEventListener('click', () => {
      state.startingSpell = spell.id;
      updateSpellSelection();
    });

    spellPanel.appendChild(row);
  }
  screen.appendChild(spellPanel);

  function updateSpellSelection(): void {
    spellPanel.querySelectorAll<HTMLElement>('[data-spell-id]').forEach(row => {
      const selected = row.dataset.spellId === state.startingSpell;
      row.style.background = selected ? '#1a1a2a' : 'transparent';
      row.style.borderColor = selected ? '#446' : 'transparent';
      const dot = row.children[0] as HTMLElement;
      dot.style.background = selected ? '#48f' : 'transparent';
      dot.style.borderColor = selected ? '#48f' : '#666';
    });
  }

  // ── Difficulty ────────────────────────────────────────
  const diffPanel = document.createElement('div');
  diffPanel.style.cssText = PANEL + 'display:flex;align-items:center;gap:12px;';
  diffPanel.appendChild(el('span', { fontSize: '11px', color: '#888' }, 'DIFFICULTY'));

  const difficulties: Difficulty[] = ['easy', 'intermediate', 'hard', 'impossible'];
  const diffColors: Record<Difficulty, string> = { easy: '#4c4', intermediate: '#fc4', hard: '#f84', impossible: '#f44' };

  for (const d of difficulties) {
    const btn = document.createElement('button');
    btn.textContent = d.charAt(0).toUpperCase() + d.slice(1);
    btn.dataset.diff = d;
    btn.style.cssText = `padding:5px 12px;font-size:12px;border:1px solid #444;cursor:pointer;${d === state.difficulty ? `background:#222;color:${diffColors[d]};border-color:${diffColors[d]};` : 'background:#111;color:#666;'}`;
    btn.addEventListener('click', () => {
      state.difficulty = d;
      diffPanel.querySelectorAll('button').forEach(b => {
        const bb = b as HTMLButtonElement;
        const dd = bb.dataset.diff as Difficulty;
        bb.style.cssText = `padding:5px 12px;font-size:12px;border:1px solid #444;cursor:pointer;${dd === d ? `background:#222;color:${diffColors[dd]};border-color:${diffColors[dd]};` : 'background:#111;color:#666;'}`;
      });
    });
    diffPanel.appendChild(btn);
  }
  screen.appendChild(diffPanel);

  // ── Validation + Start ────────────────────────────────
  const validationMsg = el('div', { fontSize: '13px', color: '#f44', height: '20px', marginTop: '8px' });
  screen.appendChild(validationMsg);

  const startBtn = document.createElement('button');
  startBtn.textContent = 'Begin Adventure';
  startBtn.style.cssText = 'padding:12px 40px;font-size:16px;background:#530;color:#fc0;border:2px solid #c90;cursor:pointer;margin-top:4px;letter-spacing:1px;';
  startBtn.addEventListener('click', () => {
    if (pointsRemaining() !== 0) return;
    if (!state.name.trim()) state.name = 'Hero';
    onComplete({ ...state });
  });
  screen.appendChild(startBtn);

  // ── Update loop ───────────────────────────────────────
  function updateAll(): void {
    for (const attr of attrNames) {
      valueDisplays[attr].textContent = String(state.attributes[attr]);
      const pct = ((state.attributes[attr] - MIN_ATTR) / (MAX_ATTR - MIN_ATTR)) * 100;
      barFills[attr].style.width = `${pct}%`;
    }

    const remaining = pointsRemaining();
    pointsDisplay.textContent = remaining === 0
      ? 'All points allocated'
      : `${remaining} points remaining`;
    pointsDisplay.style.color = remaining === 0 ? '#4f4' : '#fa0';

    // Preview
    const con = state.attributes.constitution;
    const int = state.attributes.intelligence;
    const dex = state.attributes.dexterity;
    const hp = 10 + Math.floor(con / 5);
    const mp = 5 + Math.floor(int / 5);
    const ac = Math.floor(dex / 10);

    previewPanel.replaceChildren();
    const stats: [string, string | number, string][] = [
      ['HP', hp, '#4c4'], ['MP', mp, '#48f'], ['AC', ac, '#fc4'],
    ];
    for (const [label, val, color] of stats) {
      const box = el('div', { textAlign: 'center' });
      box.appendChild(el('div', { fontSize: '18px', fontWeight: 'bold', color }, String(val)));
      box.appendChild(el('div', { fontSize: '10px', color: '#666' }, label));
      previewPanel.appendChild(box);
    }

    // Validation
    if (remaining > 0) {
      validationMsg.textContent = `Allocate ${remaining} more point${remaining !== 1 ? 's' : ''} to begin.`;
      startBtn.style.opacity = '0.4';
      startBtn.style.cursor = 'not-allowed';
    } else {
      validationMsg.textContent = '';
      startBtn.style.opacity = '1';
      startBtn.style.cursor = 'pointer';
    }
  }

  updateAll();
  updateSpellSelection();

  container.appendChild(screen);
  return screen;
}
