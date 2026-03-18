import type { GameState, Message } from '../core/types';
import { xpToNextLevel } from '../systems/character/leveling';
import { SPELL_BY_ID } from '../data/spells';

function el(tag: string, styles?: Partial<CSSStyleDeclaration>, text?: string): HTMLElement {
  const e = document.createElement(tag);
  if (styles) Object.assign(e.style, styles);
  if (text !== undefined) e.textContent = text;
  return e;
}

function bar(pct: number, color: string): HTMLElement {
  const track = el('div', { background: '#333', height: '6px', margin: '2px 0 4px' });
  const fill = el('div', { background: color, height: '100%', width: `${pct}%` });
  track.appendChild(fill);
  return track;
}

export type SpellClickHandler = (spellId: string) => void;

export class HudRenderer {
  private container: HTMLElement;
  private statsEl: HTMLElement;
  private messagesEl: HTMLElement;
  private spellBarEl: HTMLElement;
  private onSpellClick: SpellClickHandler | null = null;

  constructor(container: HTMLElement) {
    this.container = container;

    // Spell bar — scrollable, wraps within fixed width
    this.spellBarEl = el('div', {
      display: 'flex',
      flexWrap: 'wrap',
      width: '672px',
      maxHeight: '44px',
      overflowY: 'auto',
      margin: '2px auto',
      gap: '3px',
      fontFamily: "'Segoe UI', Tahoma, sans-serif",
      fontSize: '11px',
      boxSizing: 'border-box',
    });
    this.container.appendChild(this.spellBarEl);

    const hud = el('div', {
      display: 'flex',
      width: '672px',
      margin: '4px auto',
      gap: '8px',
      fontFamily: "'Segoe UI', Tahoma, sans-serif",
      fontSize: '13px',
      color: '#ccc',
    });

    this.messagesEl = el('div', {
      flex: '7',
      height: '150px',
      overflowY: 'auto',
      background: '#111',
      border: '1px solid #333',
      padding: '4px 6px',
    });

    this.statsEl = el('div', {
      flex: '3',
      background: '#111',
      border: '1px solid #333',
      padding: '4px 6px',
    });

    hud.appendChild(this.messagesEl);
    hud.appendChild(this.statsEl);
    this.container.appendChild(hud);
  }

  setSpellClickHandler(handler: SpellClickHandler): void {
    this.onSpellClick = handler;
  }

  render(state: GameState): void {
    this.renderSpellBar(state);
    this.renderStats(state);
    this.renderMessages(state.messages);
  }

  private renderStats(state: GameState): void {
    const h = state.hero;
    const hpPct = Math.round((h.hp / h.maxHp) * 100);
    const mpPct = h.maxMp > 0 ? Math.round((h.mp / h.maxMp) * 100) : 0;
    const hpColor = hpPct <= 25 ? '#f44' : hpPct <= 50 ? '#fa0' : '#4f4';
    const mpColor = '#48f';

    this.statsEl.replaceChildren();

    const nameRow = el('div', { marginBottom: '4px' });
    const strong = document.createElement('strong');
    strong.textContent = h.name;
    nameRow.appendChild(strong);
    nameRow.appendChild(document.createTextNode(` Lv.${h.level}`));
    this.statsEl.appendChild(nameRow);

    const hpLabel = el('div', {}, `HP: `);
    const hpVal = el('span', { color: hpColor }, `${h.hp}/${h.maxHp}`);
    hpLabel.appendChild(hpVal);
    this.statsEl.appendChild(hpLabel);
    this.statsEl.appendChild(bar(hpPct, hpColor));

    const mpLabel = el('div', {}, `MP: `);
    const mpVal = el('span', { color: mpColor }, `${h.mp}/${h.maxMp}`);
    mpLabel.appendChild(mpVal);
    this.statsEl.appendChild(mpLabel);
    this.statsEl.appendChild(bar(mpPct, mpColor));

    const attrs = el('div', { fontSize: '11px', marginTop: '4px' },
      `STR ${h.attributes.strength}  INT ${h.attributes.intelligence}  CON ${h.attributes.constitution}  DEX ${h.attributes.dexterity}`
    );
    this.statsEl.appendChild(attrs);

    const xpNeeded = xpToNextLevel(h, state.difficulty);
    const xpDisplay = xpNeeded === Infinity ? 'MAX' : `${h.xp} (${xpNeeded} to next)`;
    const info = el('div', { fontSize: '11px', marginTop: '2px' },
      `AC: ${h.armorValue}  Turn: ${state.turn}`
    );
    this.statsEl.appendChild(info);

    const xpRow = el('div', { fontSize: '11px', marginTop: '2px' },
      `XP: ${xpDisplay}`
    );
    this.statsEl.appendChild(xpRow);

    const floorInfo = el('div', { fontSize: '11px', marginTop: '2px' },
      `Floor: ${state.currentFloor + 1}  Copper: ${h.copper}`
    );
    this.statsEl.appendChild(floorInfo);
  }

  private renderSpellBar(state: GameState): void {
    this.spellBarEl.replaceChildren();
    const spells = state.hero.knownSpells;
    const mp = state.hero.mp;

    if (spells.length === 0) {
      this.spellBarEl.appendChild(el('div', { color: '#555', padding: '2px 4px' }, 'No spells known'));
      return;
    }

    for (let i = 0; i < spells.length; i++) {
      const spell = SPELL_BY_ID[spells[i]];
      if (!spell) continue;

      const canCast = mp >= spell.manaCost;
      const spellId = spells[i];
      const label = i < 9 ? `${i + 1}:${spell.name}` : spell.name;
      const btn = el('div', {
        padding: '2px 5px',
        background: canCast ? '#1a1a2a' : '#1a1a1a',
        border: `1px solid ${canCast ? '#446' : '#222'}`,
        color: canCast ? '#aac' : '#555',
        cursor: canCast ? 'pointer' : 'default',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }, label);

      if (canCast) {
        btn.addEventListener('click', () => {
          this.onSpellClick?.(spellId);
        });
      }

      this.spellBarEl.appendChild(btn);
    }
  }

  private renderMessages(messages: Message[]): void {
    const recent = messages.slice(-50);
    this.messagesEl.replaceChildren();
    for (const m of recent) {
      const color = m.severity === 'combat' ? '#fa0'
        : m.severity === 'important' ? '#ff0'
        : m.severity === 'system' ? '#888'
        : '#ccc';
      const line = el('div', { color, margin: '1px 0' }, m.text);
      this.messagesEl.appendChild(line);
    }
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }
}
