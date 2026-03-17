import type { GameState, Attributes, Hero } from '../core/types';
import { SPELL_BY_ID } from '../data/spells';

function el(tag: string, styles?: Partial<CSSStyleDeclaration>, text?: string): HTMLElement {
  const e = document.createElement(tag);
  if (styles) Object.assign(e.style, styles);
  if (text !== undefined) e.textContent = text;
  return e;
}

function attrBar(label: string, value: number, max: number, color: string): HTMLElement {
  const row = el('div', { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' });

  row.appendChild(el('span', { width: '50px', fontSize: '12px', color: '#aaa', textAlign: 'right' }, label));
  row.appendChild(el('span', { width: '28px', fontSize: '13px', fontWeight: 'bold', textAlign: 'center' }, String(value)));

  const track = el('div', { flex: '1', height: '10px', background: '#222', border: '1px solid #333' });
  const pct = Math.min(100, Math.round((value / max) * 100));
  const fill = el('div', { width: `${pct}%`, height: '100%', background: color });
  track.appendChild(fill);
  row.appendChild(track);

  return row;
}

function statLine(label: string, value: string | number, color?: string): HTMLElement {
  const row = el('div', { display: 'flex', gap: '6px', fontSize: '13px', marginBottom: '2px' });
  row.appendChild(el('span', { color: '#888' }, `${label}:`));
  row.appendChild(el('span', { color: color ?? '#ccc', fontWeight: 'bold' }, String(value)));
  return row;
}

function sectionHeader(text: string): HTMLElement {
  return el('div', {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#c90',
    borderBottom: '1px solid #444',
    paddingBottom: '4px',
    marginTop: '12px',
    marginBottom: '8px',
  }, text);
}

export function createCharacterInfoScreen(
  state: GameState,
  onClose: () => void,
): HTMLElement {
  const h = state.hero;

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

  // Title bar
  const titleBar = el('div', {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '500px',
    marginBottom: '8px',
  });
  titleBar.appendChild(el('h2', { color: '#c90', margin: '0' }, 'Character Info'));

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close (Esc)';
  closeBtn.style.cssText = 'padding:4px 12px;background:#333;color:#ccc;border:1px solid #555;cursor:pointer;';
  closeBtn.addEventListener('click', onClose);
  titleBar.appendChild(closeBtn);
  screen.appendChild(titleBar);

  const panel = el('div', {
    width: '500px',
    background: '#111',
    border: '1px solid #333',
    padding: '16px',
  });

  // ── Identity ────────────────────────────────────────────
  const heroSprite = el('div', { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' });

  const spriteEl = el('div', { width: '32px', height: '32px' });
  spriteEl.className = h.gender === 'male' ? 'monster-male-hero' : 'monster-female-hero';
  heroSprite.appendChild(spriteEl);

  const nameBlock = el('div');
  nameBlock.appendChild(el('div', { fontSize: '18px', fontWeight: 'bold' }, h.name));
  nameBlock.appendChild(el('div', { fontSize: '12px', color: '#888' },
    `Level ${h.level} ${h.gender === 'male' ? 'Male' : 'Female'} — ${capitalize(state.difficulty)} difficulty`
  ));
  heroSprite.appendChild(nameBlock);
  panel.appendChild(heroSprite);

  // ── Vitals ──────────────────────────────────────────────
  panel.appendChild(sectionHeader('Vitals'));

  const hpPct = h.maxHp > 0 ? Math.round((h.hp / h.maxHp) * 100) : 0;
  const hpColor = hpPct <= 25 ? '#f44' : hpPct <= 50 ? '#fa0' : '#4f4';

  panel.appendChild(statLine('Hit Points', `${h.hp} / ${h.maxHp}`, hpColor));
  panel.appendChild(statLine('Mana', `${h.mp} / ${h.maxMp}`, '#48f'));
  panel.appendChild(statLine('Armor Class', h.armorValue));
  panel.appendChild(statLine('Experience', h.xp));
  panel.appendChild(statLine('Copper', h.copper));
  panel.appendChild(statLine('Turn', state.turn));

  // ── Attributes ──────────────────────────────────────────
  panel.appendChild(sectionHeader('Attributes'));

  const attrEntries: [string, keyof Attributes, string][] = [
    ['STR', 'strength', '#e44'],
    ['INT', 'intelligence', '#48f'],
    ['CON', 'constitution', '#4c4'],
    ['DEX', 'dexterity', '#fc4'],
  ];

  for (const [label, key, color] of attrEntries) {
    panel.appendChild(attrBar(label, h.attributes[key], 100, color));
  }

  // ── Resistances ─────────────────────────────────────────
  panel.appendChild(sectionHeader('Elemental Resistances'));

  const resEntries: [string, number, string][] = [
    ['Cold', h.resistances.cold, '#4af'],
    ['Fire', h.resistances.fire, '#f64'],
    ['Lightning', h.resistances.lightning, '#ff4'],
    ['Acid/Poison', h.resistances.acid, '#4f4'],
    ['Drain Life', h.resistances.drain, '#a4f'],
  ];

  for (const [label, value, color] of resEntries) {
    const resRow = el('div', { display: 'flex', gap: '8px', fontSize: '12px', marginBottom: '2px' });
    resRow.appendChild(el('span', { width: '90px', color: '#888' }, label));
    const display = value === 0 ? 'None' : value > 0 ? `+${value}%` : `${value}%`;
    const displayColor = value === 0 ? '#555' : value > 0 ? color : '#f44';
    resRow.appendChild(el('span', { color: displayColor, fontWeight: 'bold' }, display));
    panel.appendChild(resRow);
  }

  // ── Known Spells ────────────────────────────────────────
  panel.appendChild(sectionHeader('Known Spells'));

  if (h.knownSpells.length === 0) {
    panel.appendChild(el('div', { fontSize: '12px', color: '#555', fontStyle: 'italic' }, 'No spells learned yet.'));
  } else {
    for (const spellId of h.knownSpells) {
      const spell = SPELL_BY_ID[spellId];
      if (!spell) continue;

      const spellRow = el('div', { display: 'flex', gap: '8px', fontSize: '12px', marginBottom: '3px' });
      spellRow.appendChild(el('span', { color: '#ddd', fontWeight: 'bold', width: '160px' }, spell.name));
      spellRow.appendChild(el('span', { color: '#48f' }, `${spell.manaCost} MP`));
      spellRow.appendChild(el('span', { color: '#888', flex: '1' }, spell.category));
      panel.appendChild(spellRow);
    }
  }

  // ── Equipment Summary ───────────────────────────────────
  panel.appendChild(sectionHeader('Equipment'));

  const equipSlots = renderEquipmentSummary(h);
  panel.appendChild(equipSlots);

  screen.appendChild(panel);

  // Keyboard listener for Escape
  const keyHandler = (e: KeyboardEvent) => {
    if (e.code === 'Escape' || e.code === 'KeyC') {
      e.preventDefault();
      document.removeEventListener('keydown', keyHandler);
      onClose();
    }
  };
  document.addEventListener('keydown', keyHandler);

  return screen;
}

function renderEquipmentSummary(hero: Hero): HTMLElement {
  const container = el('div', { fontSize: '12px' });

  const slots: [string, keyof Hero['equipment']][] = [
    ['Weapon', 'weapon'],
    ['Shield', 'shield'],
    ['Helmet', 'helmet'],
    ['Body', 'body'],
    ['Cloak', 'cloak'],
    ['Bracers', 'bracers'],
    ['Gauntlets', 'gauntlets'],
    ['Belt', 'belt'],
    ['Boots', 'boots'],
    ['Ring (L)', 'ringLeft'],
    ['Ring (R)', 'ringRight'],
    ['Amulet', 'amulet'],
  ];

  for (const [label, slot] of slots) {
    const item = hero.equipment[slot];
    const row = el('div', { display: 'flex', gap: '8px', marginBottom: '2px' });
    row.appendChild(el('span', { width: '80px', color: '#666' }, label));
    if (item) {
      const nameColor = item.cursed ? '#f44' : item.enchantment > 0 ? '#4af' : '#ccc';
      const enchStr = item.enchantment !== 0 ? ` (${item.enchantment > 0 ? '+' : ''}${item.enchantment})` : '';
      row.appendChild(el('span', { color: nameColor }, item.name + enchStr));
    } else {
      row.appendChild(el('span', { color: '#333' }, '— empty —'));
    }
    container.appendChild(row);
  }

  return container;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
