import type { Attributes, Difficulty, Gender } from '../core/types';
import { STARTER_SPELLS } from '../data/spells';

function el(tag: string, styles?: Partial<CSSStyleDeclaration>, text?: string): HTMLElement {
  const e = document.createElement(tag);
  if (styles) Object.assign(e.style, styles);
  if (text !== undefined) e.textContent = text;
  return e;
}

const BTN_BASE = 'padding:6px 16px;color:#fff;border:1px solid #666;cursor:pointer;';
const BTN_OFF = BTN_BASE + 'background:#222;';
const BTN_ON = BTN_BASE + 'background:#555;';
const SMALL_BTN = 'width:28px;height:28px;background:#333;color:#fff;border:1px solid #555;cursor:pointer;';

export interface CharCreationResult {
  name: string;
  gender: Gender;
  attributes: Attributes;
  difficulty: Difficulty;
  startingSpell: string;
}

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
    attributes: { strength: 50, intelligence: 50, constitution: 50, dexterity: 50 } as Attributes,
    difficulty: 'easy' as Difficulty,
    startingSpell: STARTER_SPELLS[0].id,
  };

  const screen = el('div', {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px',
    background: '#000',
    color: '#ccc',
    fontFamily: "'Segoe UI', Tahoma, sans-serif",
    minHeight: '100vh',
  });

  screen.appendChild(el('h2', { color: '#c90', margin: '0 0 24px' }, 'Create Your Character'));

  // ── Name ────────────────────────────────────────────────
  const nameRow = el('div', { marginBottom: '16px' });
  nameRow.appendChild(el('label', { marginRight: '8px' }, 'Name: '));
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = state.name;
  nameInput.style.cssText = 'padding:4px 8px;font-size:14px;background:#222;color:#fff;border:1px solid #555;';
  nameInput.addEventListener('input', () => { state.name = nameInput.value; });
  nameRow.appendChild(nameInput);
  screen.appendChild(nameRow);

  // ── Gender ──────────────────────────────────────────────
  const genderRow = el('div', { marginBottom: '16px', display: 'flex', gap: '16px', alignItems: 'center' });
  genderRow.appendChild(el('span', {}, 'Gender: '));

  for (const g of ['male', 'female'] as Gender[]) {
    const btn = document.createElement('button');
    btn.textContent = g.charAt(0).toUpperCase() + g.slice(1);
    btn.style.cssText = g === state.gender ? BTN_ON : BTN_OFF;
    btn.dataset.gender = g;
    btn.addEventListener('click', () => {
      state.gender = g;
      genderRow.querySelectorAll('button').forEach(b => {
        const bb = b as HTMLButtonElement;
        bb.style.cssText = bb.dataset.gender === state.gender ? BTN_ON : BTN_OFF;
      });
    });
    genderRow.appendChild(btn);
  }
  screen.appendChild(genderRow);

  // ── Attributes ──────────────────────────────────────────
  const pointsDisplay = el('div', { marginBottom: '12px', fontSize: '14px' });
  screen.appendChild(pointsDisplay);

  const attrContainer = el('div', { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' });
  const attrNames: (keyof Attributes)[] = ['strength', 'intelligence', 'constitution', 'dexterity'];
  const attrLabels: Record<keyof Attributes, string> = {
    strength: 'Strength',
    intelligence: 'Intelligence',
    constitution: 'Constitution',
    dexterity: 'Dexterity',
  };
  const valueDisplays: Record<string, HTMLElement> = {};

  function pointsUsed(): number {
    return attrNames.reduce((sum, a) => sum + state.attributes[a], 0);
  }

  function pointsRemaining(): number {
    return TOTAL_POINTS - pointsUsed();
  }

  for (const attr of attrNames) {
    const row = el('div', { display: 'flex', alignItems: 'center', gap: '8px' });
    row.appendChild(el('span', { width: '100px', display: 'inline-block' }, attrLabels[attr]));

    const minusBtn = document.createElement('button');
    minusBtn.textContent = '-';
    minusBtn.style.cssText = SMALL_BTN;
    minusBtn.addEventListener('click', () => {
      if (state.attributes[attr] > MIN_ATTR) {
        state.attributes[attr]--;
        updateAll();
      }
    });

    const plusBtn = document.createElement('button');
    plusBtn.textContent = '+';
    plusBtn.style.cssText = SMALL_BTN;
    plusBtn.addEventListener('click', () => {
      if (state.attributes[attr] < MAX_ATTR && pointsUsed() < TOTAL_POINTS) {
        state.attributes[attr]++;
        updateAll();
      }
    });

    const valDisplay = el('span', { width: '30px', textAlign: 'center', fontWeight: 'bold' }, String(state.attributes[attr]));
    valueDisplays[attr] = valDisplay;

    row.appendChild(minusBtn);
    row.appendChild(valDisplay);
    row.appendChild(plusBtn);
    attrContainer.appendChild(row);
  }
  screen.appendChild(attrContainer);

  // ── Starting Spell ──────────────────────────────────────
  screen.appendChild(el('div', { marginBottom: '8px', fontSize: '14px', color: '#aaa' }, 'Choose your starting spell:'));

  const spellContainer = el('div', { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px', width: '400px' });

  for (const spell of STARTER_SPELLS) {
    const row = el('div', {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '6px 10px',
      border: '1px solid #444',
      cursor: 'pointer',
      background: spell.id === state.startingSpell ? '#335' : '#111',
    });
    row.dataset.spellId = spell.id;

    const radio = el('span', {
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      border: '2px solid #888',
      display: 'inline-block',
      background: spell.id === state.startingSpell ? '#48f' : 'transparent',
    });
    row.appendChild(radio);

    const info = el('div', { flex: '1' });
    info.appendChild(el('div', { fontWeight: 'bold', color: '#ddd' }, spell.name));
    info.appendChild(el('div', { fontSize: '11px', color: '#888' }, `${spell.category} — ${spell.description}`));
    row.appendChild(info);

    const costBadge = el('span', { fontSize: '11px', color: '#48f' }, `${spell.manaCost} MP`);
    row.appendChild(costBadge);

    row.addEventListener('click', () => {
      state.startingSpell = spell.id;
      updateSpellSelection();
    });

    spellContainer.appendChild(row);
  }
  screen.appendChild(spellContainer);

  function updateSpellSelection(): void {
    spellContainer.querySelectorAll<HTMLElement>('[data-spell-id]').forEach(row => {
      const selected = row.dataset.spellId === state.startingSpell;
      row.style.background = selected ? '#335' : '#111';
      const radio = row.children[0] as HTMLElement;
      radio.style.background = selected ? '#48f' : 'transparent';
    });
  }

  // ── Difficulty ──────────────────────────────────────────
  const diffRow = el('div', { marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' });
  diffRow.appendChild(el('span', {}, 'Difficulty: '));

  const difficulties: Difficulty[] = ['easy', 'intermediate', 'hard', 'impossible'];
  for (const d of difficulties) {
    const btn = document.createElement('button');
    btn.textContent = d.charAt(0).toUpperCase() + d.slice(1);
    btn.style.cssText = d === state.difficulty ? BTN_ON : BTN_OFF;
    btn.dataset.diff = d;
    btn.addEventListener('click', () => {
      state.difficulty = d;
      diffRow.querySelectorAll('button').forEach(b => {
        const bb = b as HTMLButtonElement;
        bb.style.cssText = bb.dataset.diff === d ? BTN_ON : BTN_OFF;
      });
    });
    diffRow.appendChild(btn);
  }
  screen.appendChild(diffRow);

  // ── Stat Preview ────────────────────────────────────────
  const previewBox = el('div', {
    marginBottom: '16px',
    padding: '10px 16px',
    background: '#111',
    border: '1px solid #333',
    fontSize: '12px',
    color: '#aaa',
    width: '400px',
  });
  screen.appendChild(previewBox);

  // ── Start Button + Validation ───────────────────────────
  const validationMsg = el('div', { marginBottom: '8px', fontSize: '13px', color: '#f44', height: '20px' });
  screen.appendChild(validationMsg);

  const startBtn = document.createElement('button');
  startBtn.textContent = 'Begin Adventure';
  startBtn.style.cssText = 'padding:12px 40px;font-size:18px;background:#530;color:#fc0;border:2px solid #c90;cursor:pointer;';
  startBtn.addEventListener('click', () => {
    const remaining = pointsRemaining();
    if (remaining !== 0) return;
    if (!state.name.trim()) {
      state.name = 'Hero';
    }
    onComplete({ ...state });
  });
  screen.appendChild(startBtn);

  // ── Update everything ───────────────────────────────────
  function updateAll(): void {
    for (const attr of attrNames) {
      valueDisplays[attr].textContent = String(state.attributes[attr]);
    }

    const remaining = pointsRemaining();
    pointsDisplay.textContent = `Attribute Points Remaining: ${remaining}`;
    pointsDisplay.style.color = remaining === 0 ? '#4f4' : '#fa0';

    // Stat preview
    const con = state.attributes.constitution;
    const int = state.attributes.intelligence;
    const dex = state.attributes.dexterity;
    const str = state.attributes.strength;
    const hp = 10 + Math.floor(con / 5);
    const mp = 5 + Math.floor(int / 5);
    const ac = Math.floor(dex / 10);

    previewBox.replaceChildren();
    previewBox.appendChild(el('div', { color: '#ccc', marginBottom: '4px', fontWeight: 'bold' }, 'Starting Stats Preview'));
    previewBox.appendChild(el('div', {}, `HP: ${hp}  |  MP: ${mp}  |  AC: ${ac}`));
    previewBox.appendChild(el('div', {}, `Carry capacity: ~${str * 100}g  |  Hit bonus: +${Math.floor(dex / 15)}`));

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

  container.appendChild(screen);
  return screen;
}
