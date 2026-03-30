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

function compactBar(pct: number, color: string): HTMLElement {
  const track = el("div", { background: "#333", height: "4px", width: "60px", display: "inline-block", verticalAlign: "middle", marginLeft: "4px", borderRadius: "2px" });
  const fill = el("div", { background: color, height: "100%", width: `${pct}%`, borderRadius: "2px" });
  track.appendChild(fill);
  return track;
}

export type SpellClickHandler = (spellId: string) => void;

const isLandscapeMobile = () => window.innerHeight <= 500 && window.innerWidth > window.innerHeight;

export class HudRenderer {
  private container: HTMLElement;
  private statsEl: HTMLElement;
  private messagesEl: HTMLElement;
  private spellBarEl: HTMLElement;
  private onSpellClick: SpellClickHandler | null = null;
  private landscape: boolean;

  constructor(container: HTMLElement) {
    this.container = container;
    this.landscape = isLandscapeMobile();

    // Spell bar — hidden in landscape
    this.spellBarEl = el("div", {
      display: this.landscape ? "none" : "flex",
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

    if (this.landscape) {
      // Landscape: overlays pinned to screen edges
      this.statsEl = el("div", {
        position: "fixed",
        top: "0",
        left: "0",
        right: "0",
        zIndex: "50",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "4px 8px 4px calc(8px + env(safe-area-inset-left, 0px))",
        background: "rgba(0,0,0,0.7)",
        fontSize: "11px",
        color: "#ccc",
        pointerEvents: "none",
      });

      this.messagesEl = el("div", {
        position: "fixed",
        bottom: "100px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: "50",
        width: "60%",
        maxWidth: "400px",
        maxHeight: "60px",
        overflowY: "hidden",
        background: "rgba(0,0,0,0.6)",
        borderRadius: "4px",
        padding: "3px 8px",
        fontSize: "10px",
        pointerEvents: "none",
      });

      document.body.appendChild(this.statsEl);
      document.body.appendChild(this.messagesEl);
    } else {
      // Portrait + Desktop: normal flow layout below map
      const isPortrait = window.innerWidth <= 768 && window.innerHeight > window.innerWidth;
      const hud = el("div", {
        display: "flex",
        width: "100%",
        maxWidth: "var(--game-width)",
        margin: "4px auto",
        gap: "6px",
        fontSize: "var(--fs-md)",
        paddingBottom: "0",
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
  }

  setSpellClickHandler(handler: SpellClickHandler): void {
    this.onSpellClick = handler;
  }

  render(state: GameState): void {
    this.renderSpellBar(state);
    if (this.landscape) {
      this.renderStatsCompact(state);
    } else {
      this.renderStats(state);
    }
    this.renderMessages(state.messages);
  }

  /** Remove overlay elements (call when leaving game screen) */
  cleanup(): void {
    // Remove fixed overlays (landscape + portrait mobile)
    if (this.statsEl.style.position === "fixed") this.statsEl.remove();
    if (this.messagesEl.style.position === "fixed") this.messagesEl.remove();
  }

  // ── Compact stats bar for landscape ──────────────────────
  private renderStatsCompact(state: GameState): void {
    const h = state.hero;
    const hpPct = Math.round((h.hp / h.maxHp) * 100);
    const mpPct = h.maxMp > 0 ? Math.round((h.mp / h.maxMp) * 100) : 0;
    const hpColor = hpPct <= 25 ? "#f44" : hpPct <= 50 ? "#fa0" : "#4f4";

    this.statsEl.replaceChildren();

    // All in one row: Name Lv | HP bar | MP bar | Floor | Turn
    const add = (text: string, color = "#ccc") => {
      this.statsEl.appendChild(el("span", { color, whiteSpace: "nowrap" }, text));
    };

    add(`${h.name} Lv${h.level}`, "#fff");
    const hpSpan = el("span", { whiteSpace: "nowrap" }, `HP:${h.hp}/${h.maxHp}`);
    hpSpan.style.color = hpColor;
    hpSpan.appendChild(compactBar(hpPct, hpColor));
    this.statsEl.appendChild(hpSpan);

    const mpSpan = el("span", { whiteSpace: "nowrap" }, `MP:${h.mp}/${h.maxMp}`);
    mpSpan.style.color = "#48f";
    mpSpan.appendChild(compactBar(mpPct, "#48f"));
    this.statsEl.appendChild(mpSpan);

    const floorLabel = state.currentDungeon !== "town" ? `F${state.currentFloor + 1}` : "Town";
    add(`${floorLabel} T:${state.turn}`, "#888");

    // Status effects
    if (h.activeEffects.length > 0) {
      const icons: Record<string, string> = {
        shield: "🛡", "resist-cold": "❄", "resist-fire": "🔥",
        "resist-lightning": "⚡", poisoned: "☠", levitation: "🪶", light: "💡",
      };
      const effectStr = h.activeEffects.map(e => `${icons[e.id] ?? "✦"}${e.turnsRemaining}`).join(" ");
      add(effectStr, "#aaa");
    }
  }

  // ── Full stats panel for portrait ────────────────────────
  private renderStats(state: GameState): void {
    const h = state.hero;
    const hpPct = Math.round((h.hp / h.maxHp) * 100);
    const mpPct = h.maxMp > 0 ? Math.round((h.mp / h.maxMp) * 100) : 0;
    const hpColor = hpPct <= 25 ? "#f44" : hpPct <= 50 ? "#fa0" : "#4f4";
    const mpColor = "#48f";

    this.statsEl.replaceChildren();

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

    const acBadge = el("span", {
      fontSize: "9px", color: "#bbb", background: "#1a1a1a",
      border: "1px solid #bbb", borderRadius: "3px",
      padding: "0px 3px", whiteSpace: "nowrap",
    }, `🛡${h.armorValue}`);
    acBadge.title = `Armor Class: ${h.armorValue}`;
    nameRow.appendChild(acBadge);

    if (h.activeEffects.length > 0) {
      const effectStyles: Record<string, [string, string]> = {
        shield: ["🛡", "#48f"], "resist-cold": ["❄", "#4af"],
        "resist-fire": ["🔥", "#f64"], "resist-lightning": ["⚡", "#ff4"],
        poisoned: ["☠", "#4f4"], paralyzed: ["⛓", "#f84"],
        blinded: ["👁", "#888"], levitation: ["🪶", "#aaf"], light: ["💡", "#ff8"],
      };
      for (const eff of h.activeEffects) {
        const [icon, color] = effectStyles[eff.id] ?? ["✦", "#aaa"];
        const badge = el("span", {
          fontSize: "9px", color, background: "#1a1a1a",
          border: `1px solid ${color}33`, borderRadius: "3px",
          padding: "0px 3px", whiteSpace: "nowrap",
        }, `${icon}${eff.turnsRemaining}`);
        badge.title = `${eff.name} (${eff.turnsRemaining} turns)`;
        nameRow.appendChild(badge);
      }
    }
    this.statsEl.appendChild(nameRow);

    const hpLabel = el("div", {}, `HP: `);
    hpLabel.appendChild(el("span", { color: hpColor }, `${h.hp}/${h.maxHp}`));
    this.statsEl.appendChild(hpLabel);
    this.statsEl.appendChild(bar(hpPct, hpColor));

    const mpLabel = el("div", {}, `MP: `);
    mpLabel.appendChild(el("span", { color: mpColor }, `${h.mp}/${h.maxMp}`));
    this.statsEl.appendChild(mpLabel);
    this.statsEl.appendChild(bar(mpPct, mpColor));

    const xpNeeded = xpToNextLevel(h, state.difficulty);
    const xpDisplay = xpNeeded === Infinity ? "MAX" : `${h.xp} (${xpNeeded} to next)`;
    this.statsEl.appendChild(el("div", { fontSize: "11px", marginTop: "4px" }, `XP: ${xpDisplay}`));

    const floorLabel = state.currentDungeon !== "town" ? `Floor: ${state.currentFloor + 1}` : "Town";
    this.statsEl.appendChild(el("div", { fontSize: "11px", marginTop: "2px" }, `${floorLabel} | Turn: ${state.turn}`));
  }

  private renderSpellBar(state: GameState): void {
    this.spellBarEl.replaceChildren();
    const hotkeys = state.hero.spellHotkeys;
    const mp = state.hero.mp;

    if (hotkeys.length === 0) {
      this.spellBarEl.appendChild(el("div", { color: "#555", padding: "2px 4px" }, "Press Z to manage spells"));
      return;
    }

    const max = Math.min(hotkeys.length, 5);
    for (let i = 0; i < max; i++) {
      const spell = SPELL_BY_ID[hotkeys[i]];
      if (!spell) continue;
      const canCast = mp >= spell.manaCost;
      const spellId = hotkeys[i];
      const btn = el("div", {
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
      }, `${i + 1}:${spell.name}`);
      if (canCast) btn.addEventListener("click", () => { this.onSpellClick?.(spellId); });
      this.spellBarEl.appendChild(btn);
    }
  }

  private renderMessages(messages: Message[]): void {
    const recent = this.landscape ? messages.slice(-3) : messages.slice(-50);
    this.messagesEl.replaceChildren();
    const colors: Record<string, string> = {
      combat: '#fa0', important: '#4f4', system: '#888', normal: '#ccc',
    };
    for (const m of recent) {
      const baseColor = colors[m.severity] ?? '#ccc';
      const line = document.createElement('div');
      line.style.margin = '1px 0';
      const parts = m.text.split(/(\S+ \+\d+|\S+ -\d+|\d+)/g);
      for (const part of parts) {
        if (/\S+ \+\d+$/.test(part)) {
          const span = document.createElement('span');
          span.textContent = part;
          span.style.color = '#4af';
          span.style.fontWeight = 'bold';
          line.appendChild(span);
        } else if (/\S+ -\d+$/.test(part)) {
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
    if (!this.landscape) this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }
}
