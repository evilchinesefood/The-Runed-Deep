import type { GameState, Attributes } from "../core/types";
import { SPELL_BY_ID } from "../data/spells";
import {
  xpToNextLevel,
  xpRequiredForLevel,
} from "../systems/character/leveling";
import { createScreen, createPanel, createTitleBar, el } from "./Theme";

function attrBar(
  label: string,
  value: number,
  max: number,
  color: string,
): HTMLElement {
  const row = el("div", {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "4px",
  });

  row.appendChild(
    el(
      "span",
      { width: "50px", fontSize: "12px", color: "#aaa", textAlign: "right" },
      label,
    ),
  );
  row.appendChild(
    el(
      "span",
      {
        width: "28px",
        fontSize: "13px",
        fontWeight: "bold",
        textAlign: "center",
      },
      String(value),
    ),
  );

  const track = el("div", {
    flex: "1",
    height: "10px",
    background: "#222",
    border: "1px solid #333",
  });
  const pct = Math.min(100, Math.round((value / max) * 100));
  const fill = el("div", {
    width: `${pct}%`,
    height: "100%",
    background: color,
  });
  track.appendChild(fill);
  row.appendChild(track);

  return row;
}

function statLine(
  label: string,
  value: string | number,
  color?: string,
): HTMLElement {
  const row = el("div", {
    display: "flex",
    gap: "6px",
    fontSize: "13px",
    marginBottom: "2px",
  });
  row.appendChild(el("span", { color: "#888" }, `${label}:`));
  row.appendChild(
    el("span", { color: color ?? "#ccc", fontWeight: "bold" }, String(value)),
  );
  return row;
}

function sectionHeader(text: string): HTMLElement {
  return el(
    "div",
    {
      fontSize: "14px",
      fontWeight: "bold",
      color: "#c90",
      borderBottom: "1px solid #444",
      paddingBottom: "4px",
      marginTop: "12px",
      marginBottom: "8px",
    },
    text,
  );
}

export function createCharacterInfoScreen(
  state: GameState,
  onClose: () => void,
): HTMLElement & { cleanup: () => void } {
  const h = state.hero;

  const screen = createScreen();
  screen.classList.add("screen-scrollable");

  screen.appendChild(createTitleBar("Character Info", onClose));

  const panel = createPanel();

  // ── Identity ────────────────────────────────────────────
  const heroSprite = el("div", {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "8px",
  });

  const spriteEl = el("div", { width: "32px", height: "32px" });
  spriteEl.className = h.gender === "male" ? "male-hero" : "female-hero";
  heroSprite.appendChild(spriteEl);

  const nameBlock = el("div");
  nameBlock.appendChild(
    el("div", { fontSize: "18px", fontWeight: "bold" }, h.name),
  );
  const diffColors: Record<string, string> = {
    easy: "#4c4",
    intermediate: "#fc4",
    hard: "#f84",
    impossible: "#f44",
  };
  const diffColor = diffColors[state.difficulty] ?? "#888";
  const ngLabel = state.ngPlusCount > 0 ? ` +${state.ngPlusCount}` : "";
  const subRow = el("div", { fontSize: "12px", display: "flex", gap: "6px" });
  subRow.appendChild(
    el(
      "span",
      { color: "#888" },
      `Level ${h.level} ${h.gender === "male" ? "Male" : "Female"}`,
    ),
  );
  subRow.appendChild(
    el(
      "span",
      { color: diffColor, fontWeight: "bold" },
      `${capitalize(state.difficulty)}${ngLabel}`,
    ),
  );
  nameBlock.appendChild(subRow);
  heroSprite.appendChild(nameBlock);
  panel.appendChild(heroSprite);

  // ── Vitals ──────────────────────────────────────────────
  panel.appendChild(sectionHeader("Vitals"));

  const hpPct = h.maxHp > 0 ? Math.round((h.hp / h.maxHp) * 100) : 0;
  const hpColor = hpPct <= 25 ? "#f44" : hpPct <= 50 ? "#fa0" : "#4f4";

  panel.appendChild(statLine("Hit Points", `${h.hp} / ${h.maxHp}`, hpColor));
  panel.appendChild(statLine("Mana", `${h.mp} / ${h.maxMp}`, "#48f"));
  panel.appendChild(statLine("Armor Class", h.armorValue));
  const toNext = xpToNextLevel(h, state.difficulty);
  const nextLevelXp = xpRequiredForLevel(h.level + 1, state.difficulty);
  const xpStr =
    toNext === Infinity
      ? `${h.xp} (MAX LEVEL)`
      : `${h.xp} / ${nextLevelXp} (${toNext} to next)`;
  panel.appendChild(statLine("Experience", xpStr));
  panel.appendChild(statLine("Gold", h.copper));
  panel.appendChild(statLine("Turn", state.turn));

  // ── Attributes ──────────────────────────────────────────
  panel.appendChild(sectionHeader("Attributes"));

  const attrEntries: [string, keyof Attributes, string][] = [
    ["STR", "strength", "#e44"],
    ["INT", "intelligence", "#48f"],
    ["CON", "constitution", "#4c4"],
    ["DEX", "dexterity", "#fc4"],
  ];

  for (const [label, key, color] of attrEntries) {
    panel.appendChild(attrBar(label, h.attributes[key], 100, color));
  }

  // ── Resistances ─────────────────────────────────────────
  panel.appendChild(sectionHeader("Elemental Resistances"));

  const resEntries: [string, number, string][] = [
    ["Cold", h.resistances.cold, "#4af"],
    ["Fire", h.resistances.fire, "#f64"],
    ["Lightning", h.resistances.lightning, "#ff4"],
    ["Acid/Poison", h.resistances.acid, "#4f4"],
    ["Drain Life", h.resistances.drain, "#a4f"],
  ];

  for (const [label, value, color] of resEntries) {
    const resRow = el("div", {
      display: "flex",
      gap: "8px",
      fontSize: "12px",
      marginBottom: "2px",
    });
    resRow.appendChild(el("span", { width: "90px", color: "#888" }, label));
    const display =
      value === 0 ? "None" : value > 0 ? `+${value}%` : `${value}%`;
    const displayColor = value === 0 ? "#555" : value > 0 ? color : "#f44";
    resRow.appendChild(
      el("span", { color: displayColor, fontWeight: "bold" }, display),
    );
    panel.appendChild(resRow);
  }

  // ── Known Spells ────────────────────────────────────────
  panel.appendChild(sectionHeader("Known Spells"));

  if (h.knownSpells.length === 0) {
    panel.appendChild(
      el(
        "div",
        { fontSize: "12px", color: "#555", fontStyle: "italic" },
        "No spells learned yet.",
      ),
    );
  } else {
    for (const spellId of h.knownSpells) {
      const spell = SPELL_BY_ID[spellId];
      if (!spell) continue;

      const spellRow = el("div", {
        display: "flex",
        gap: "8px",
        fontSize: "12px",
        marginBottom: "3px",
      });
      spellRow.appendChild(
        el(
          "span",
          {
            color: "#ddd",
            fontWeight: "bold",
            flex: "1",
            minWidth: "0",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          },
          spell.name,
        ),
      );
      spellRow.appendChild(
        el("span", { color: "#48f" }, `${spell.manaCost} MP`),
      );
      spellRow.appendChild(
        el("span", { color: "#888", flex: "1" }, spell.category),
      );
      panel.appendChild(spellRow);
    }
  }

  screen.appendChild(panel);

  // Keyboard listener for Escape
  const keyHandler = (e: KeyboardEvent) => {
    if (e.code === "Escape" || e.code === "KeyC") {
      e.preventDefault();
      cleanup();
      onClose();
    }
  };
  document.addEventListener("keydown", keyHandler);

  const cleanup = () => {
    document.removeEventListener("keydown", keyHandler);
  };
  (screen as HTMLElement & { cleanup: () => void }).cleanup = cleanup;
  return screen as HTMLElement & { cleanup: () => void };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
