import type { GameState, Message } from "../core/types";
import { xpToNextLevel } from "../systems/character/leveling";
import { SPELL_BY_ID } from "../data/spells";
import { el } from "../ui/Theme";

function bar(pct: number, color: string): HTMLElement {
  const track = el("div", {
    background: "#333",
    height: "6px",
    margin: "2px 0 4px",
  });
  const fill = el("div", {
    background: color,
    height: "100%",
    width: `${pct}%`,
  });
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

    // Spell bar — scrollable, wraps within full width
    this.spellBarEl = el("div", {
      display: "flex",
      flexWrap: "nowrap",
      width: "100%",
      maxWidth: "var(--game-width)",
      overflowY: "hidden",
      overflowX: "auto",
      margin: "3px auto",
      paddingBottom: "3px",
      gap: "3px",
      fontSize: "var(--fs-sm)",
      boxSizing: "border-box",
    });
    this.container.appendChild(this.spellBarEl);

    const isMobileHud = window.innerWidth <= 768 && window.innerHeight > window.innerWidth;
    const hud = el("div", {
      display: "flex",
      width: "100%",
      maxWidth: "var(--game-width)",
      margin: "4px auto",
      gap: "6px",
      fontSize: "var(--fs-md)",
      paddingBottom: isMobileHud ? "180px" : "0",
    });

    this.messagesEl = el("div", {
      flex: "1",
      minWidth: "0",
      height: "clamp(100px, 20vh, 160px)",
      overflowY: "auto",
      background: "#111",
      border: "1px solid #333",
      padding: "4px 6px",
    });

    this.statsEl = el("div", {
      width: "clamp(140px, 30%, 220px)",
      flexShrink: "0",
      background: "#111",
      border: "1px solid #333",
      padding: "4px 6px",
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
    const hpColor = hpPct <= 25 ? "#f44" : hpPct <= 50 ? "#fa0" : "#4f4";
    const mpColor = "#48f";

    this.statsEl.replaceChildren();

    // Name + level + status icons row
    const nameRow = el("div", {
      marginBottom: "4px",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      flexWrap: "wrap",
    });
    const strong = document.createElement("strong");
    strong.textContent = h.name;
    nameRow.appendChild(strong);
    nameRow.appendChild(el("span", { fontSize: "12px" }, `Lv.${h.level}`));

    // AC badge (first, before status effects)
    const acBadge = el(
      "span",
      {
        fontSize: "9px",
        color: "#bbb",
        background: "#1a1a1a",
        border: "1px solid #bbb",
        borderRadius: "3px",
        padding: "0px 3px",
        whiteSpace: "nowrap",
      },
      `🛡${h.armorValue}`,
    );
    acBadge.title = `Armor Class: ${h.armorValue}`;
    nameRow.appendChild(acBadge);

    // Status effect icons inline with name/level
    if (h.activeEffects.length > 0) {
      const effectStyles: Record<string, [string, string]> = {
        shield: ["🛡", "#48f"],
        "resist-cold": ["❄", "#4af"],
        "resist-fire": ["🔥", "#f64"],
        "resist-lightning": ["⚡", "#ff4"],
        poisoned: ["☠", "#4f4"],
        paralyzed: ["⛓", "#f84"],
        blinded: ["👁", "#888"],
        levitation: ["🪶", "#aaf"],
        light: ["💡", "#ff8"],
      };
      for (const eff of h.activeEffects) {
        const [icon, color] = effectStyles[eff.id] ?? ["✦", "#aaa"];
        const badge = el(
          "span",
          {
            fontSize: "9px",
            color,
            background: "#1a1a1a",
            border: `1px solid ${color}33`,
            borderRadius: "3px",
            padding: "0px 3px",
            whiteSpace: "nowrap",
          },
          `${icon}${eff.turnsRemaining}`,
        );
        badge.title = `${eff.name} (${eff.turnsRemaining} turns)`;
        nameRow.appendChild(badge);
      }
    }
    this.statsEl.appendChild(nameRow);

    const hpLabel = el("div", {}, `HP: `);
    const hpVal = el("span", { color: hpColor }, `${h.hp}/${h.maxHp}`);
    hpLabel.appendChild(hpVal);
    this.statsEl.appendChild(hpLabel);
    this.statsEl.appendChild(bar(hpPct, hpColor));

    const mpLabel = el("div", {}, `MP: `);
    const mpVal = el("span", { color: mpColor }, `${h.mp}/${h.maxMp}`);
    mpLabel.appendChild(mpVal);
    this.statsEl.appendChild(mpLabel);
    this.statsEl.appendChild(bar(mpPct, mpColor));

    const xpNeeded = xpToNextLevel(h, state.difficulty);
    const xpDisplay =
      xpNeeded === Infinity ? "MAX" : `${h.xp} (${xpNeeded} to next)`;
    const xpRow = el(
      "div",
      { fontSize: "11px", marginTop: "4px" },
      `XP: ${xpDisplay}`,
    );
    this.statsEl.appendChild(xpRow);

    const floorLabel =
      state.currentDungeon !== "town"
        ? `Floor: ${state.currentFloor + 1}`
        : "Town";
    const floorInfo = el(
      "div",
      { fontSize: "11px", marginTop: "2px" },
      `${floorLabel} | Turn: ${state.turn}`,
    );
    this.statsEl.appendChild(floorInfo);
  }

  private renderSpellBar(state: GameState): void {
    this.spellBarEl.replaceChildren();
    const hotkeys = state.hero.spellHotkeys;
    const mp = state.hero.mp;

    if (hotkeys.length === 0) {
      this.spellBarEl.appendChild(
        el(
          "div",
          { color: "#555", padding: "2px 4px" },
          "Press Z to manage spells",
        ),
      );
      return;
    }

    const max = Math.min(hotkeys.length, 5);
    for (let i = 0; i < max; i++) {
      const spell = SPELL_BY_ID[hotkeys[i]];
      if (!spell) continue;

      const canCast = mp >= spell.manaCost;
      const spellId = hotkeys[i];
      const label = `${i + 1}:${spell.name}`;
      const btn = el(
        "div",
        {
          padding: "4px 7px",
          background: canCast ? "#1a1a2a" : "#1a1a1a",
          border: `1px solid ${canCast ? "#446" : "#222"}`,
          color: canCast ? "#aac" : "#555",
          cursor: canCast ? "pointer" : "default",
          whiteSpace: "nowrap",
          userSelect: "none",
          borderRadius: "3px",
          minHeight: "28px",
          display: "flex",
          alignItems: "center",
        },
        label,
      );

      if (canCast) {
        btn.addEventListener("click", () => {
          this.onSpellClick?.(spellId);
        });
      }

      this.spellBarEl.appendChild(btn);
    }
  }

  private renderMessages(messages: Message[]): void {
    const recent = messages.slice(-50);
    this.messagesEl.replaceChildren();
    const colors: Record<string, string> = {
      combat: '#fa0',
      important: '#4f4',
      system: '#888',
      normal: '#ccc',
    };
    for (const m of recent) {
      const baseColor = colors[m.severity] ?? '#ccc';
      const line = document.createElement('div');
      line.style.margin = '1px 0';
      // Split on: enchanted items (+N), cursed items (-N), plain numbers, and item suffixes
      const parts = m.text.split(/(\S+ \+\d+|\S+ -\d+|\d+)/g);
      for (const part of parts) {
        if (/\S+ \+\d+$/.test(part)) {
          // Enchanted item name — blue
          const span = document.createElement('span');
          span.textContent = part;
          span.style.color = '#4af';
          span.style.fontWeight = 'bold';
          line.appendChild(span);
        } else if (/\S+ -\d+$/.test(part)) {
          // Cursed item name — red
          const span = document.createElement('span');
          span.textContent = part;
          span.style.color = '#f44';
          span.style.fontWeight = 'bold';
          line.appendChild(span);
        } else if (/^\d+$/.test(part)) {
          const num = document.createElement('span');
          num.textContent = part;
          num.style.color = '#fff';
          num.style.fontWeight = 'bold';
          line.appendChild(num);
        } else {
          const txt = document.createElement('span');
          txt.textContent = part;
          txt.style.color = baseColor;
          line.appendChild(txt);
        }
      }
      this.messagesEl.appendChild(line);
    }
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }
}
