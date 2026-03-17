import type { GameState, Message } from '../core/types';

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

export class HudRenderer {
  private container: HTMLElement;
  private statsEl: HTMLElement;
  private messagesEl: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;

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
      height: '120px',
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

  render(state: GameState): void {
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

    const info = el('div', { fontSize: '11px', marginTop: '2px' },
      `AC: ${h.armorValue}  XP: ${h.xp}  Turn: ${state.turn}`
    );
    this.statsEl.appendChild(info);

    const copper = el('div', { fontSize: '11px', marginTop: '2px' },
      `Copper: ${h.copper}`
    );
    this.statsEl.appendChild(copper);
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
