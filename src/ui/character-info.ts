import type { GameState, Attributes } from "../core/types";
import { SPELL_BY_ID } from "../data/spells";
import {
  xpToNextLevel,
  xpRequiredForLevel,
} from "../systems/character/leveling";
import { createScreen, createPanel, createTitleBar, el } from "./Theme";
import { AFFIXES } from "../data/Enchantments";
import { equipAffixTotal, equipAffixTotal2 } from "../utils/Enchants";
import { ITEM_BY_ID } from "../data/items";

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
  panel.appendChild(statLine("Gold", h.gold));
  panel.appendChild(statLine("Turn", state.turn));

  // ── Attributes ──────────────────────────────────────────
  panel.appendChild(sectionHeader("Attributes"));

  const soulDrainAll = Math.round(equipAffixTotal(h.equipment, "soul-drain"));
  const attrBonuses: Record<string, number> = {
    strength: Math.round(equipAffixTotal(h.equipment, "might")) + soulDrainAll,
    intelligence:
      Math.round(equipAffixTotal(h.equipment, "brilliance")) + soulDrainAll,
    constitution:
      Math.round(equipAffixTotal(h.equipment, "fortitude")) + soulDrainAll,
    dexterity: Math.round(equipAffixTotal(h.equipment, "grace")) + soulDrainAll,
  };

  for (const slot of Object.values(h.equipment)) {
    if (!slot) continue;
    const tpl = ITEM_BY_ID[slot.templateId];
    if (!tpl?.uniqueAbility) continue;
    const ua = tpl.uniqueAbility;
    if (ua === "crown-power") {
      attrBonuses.strength += 10;
      attrBonuses.intelligence += 10;
      attrBonuses.constitution += 10;
      attrBonuses.dexterity += 10;
    } else if (ua === "titan-power") attrBonuses.constitution += 30;
    else if (ua === "archmage-power") attrBonuses.intelligence += 30;
    else if (ua === "forge-power") attrBonuses.strength += 20;
  }

  const attrEntries: [string, keyof Attributes, string][] = [
    ["STR", "strength", "#e44"],
    ["INT", "intelligence", "#48f"],
    ["CON", "constitution", "#4c4"],
    ["DEX", "dexterity", "#fc4"],
  ];

  for (const [label, key, color] of attrEntries) {
    const base = h.attributes[key];
    const bonus = attrBonuses[key] ?? 0;
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
    if (bonus > 0) {
      const valSpan = el("span", {
        width: "60px",
        fontSize: "13px",
        textAlign: "center",
      });
      valSpan.appendChild(el("span", { fontWeight: "bold" }, String(base)));
      valSpan.appendChild(
        el("span", { color: "#4f4", fontSize: "11px" }, ` +${bonus}`),
      );
      row.appendChild(valSpan);
    } else {
      row.appendChild(
        el(
          "span",
          {
            width: "60px",
            fontSize: "13px",
            fontWeight: "bold",
            textAlign: "center",
          },
          String(base),
        ),
      );
    }
    const track = el("div", {
      flex: "1",
      height: "10px",
      background: "#222",
      border: "1px solid #333",
    });
    const pct = Math.min(100, Math.round(((base + bonus) / 100) * 100));
    const fill = el("div", {
      width: `${pct}%`,
      height: "100%",
      background: color,
    });
    track.appendChild(fill);
    row.appendChild(track);
    panel.appendChild(row);
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

  // ── Equipment Bonuses ────────────────────────────────────
  const bonusLines: [string, string, string][] = [];

  for (const affix of AFFIXES) {
    const v = Math.round(equipAffixTotal(h.equipment, affix.id));
    if (v <= 0) continue;
    const v2 = Math.round(equipAffixTotal2(h.equipment, affix.id));

    let display: string;
    if (affix.base2 !== undefined && v2 > 0) {
      display = affix.description
        .replace("{v}", `${v}`)
        .replace("{v2}", `${v2}`);
    } else {
      display = affix.description.replace("{v}", `${v}`);
    }
    bonusLines.push([affix.name, display, affix.color]);
  }

  if (bonusLines.length > 0) {
    panel.appendChild(sectionHeader("Equipment Bonuses"));
    for (const [name, display, color] of bonusLines) {
      const row = el("div", {
        display: "flex",
        gap: "8px",
        fontSize: "12px",
        marginBottom: "2px",
      });
      row.appendChild(
        el(
          "span",
          { color, fontWeight: "bold", width: "120px", flexShrink: "0" },
          name,
        ),
      );
      row.appendChild(el("span", { color: "#ccc" }, display));
      panel.appendChild(row);
    }
  }

  // ── Combat Stats ─────────────────────────────────────────
  panel.appendChild(sectionHeader("Combat Stats"));

  const weapon = h.equipment.weapon;
  if (weapon) {
    const wMin = weapon.properties["damageMin"] ?? 0;
    const wMax = weapon.properties["damageMax"] ?? 0;
    const dmgBonus = h.equipDamageBonus ?? 0;
    const strBonus = Math.floor(h.attributes.strength / 10);
    panel.appendChild(
      statLine(
        "Melee Damage",
        `${wMin + dmgBonus + strBonus}-${wMax + dmgBonus + strBonus}`,
      ),
    );
  }

  const effInt = h.attributes.intelligence + (attrBonuses.intelligence ?? 0);
  const intMult = Math.round((1 + effInt / 100) * 100);
  const spellPower = Math.round(equipAffixTotal(h.equipment, "spell-power"));
  const darkPact = Math.round(equipAffixTotal(h.equipment, "dark-pact"));
  let spellMult = intMult;
  if (spellPower > 0)
    spellMult = Math.round(spellMult * (1 + spellPower / 100));
  if (darkPact > 0) spellMult = Math.round(spellMult * (1 + darkPact / 100));
  panel.appendChild(statLine("Spell Power", `${spellMult}%`, "#48f"));

  const evasion = Math.round(equipAffixTotal(h.equipment, "evasion"));
  if (evasion > 0)
    panel.appendChild(statLine("Dodge Chance", `${evasion}%`, "#adf"));

  const swiftness = Math.min(
    75,
    Math.round(equipAffixTotal(h.equipment, "swiftness")),
  );
  if (swiftness > 0)
    panel.appendChild(statLine("Extra Action", `${swiftness}%`, "#fc4"));

  const arcaneMastery = Math.round(
    equipAffixTotal(h.equipment, "arcane-mastery"),
  );
  let mpReduction = arcaneMastery;
  for (const slot of Object.values(h.equipment)) {
    if (!slot) continue;
    const tpl = ITEM_BY_ID[slot.templateId];
    if (tpl?.uniqueAbility === "archmage-power") {
      mpReduction += 25;
      break;
    }
  }
  const darkPactCost = Math.round(equipAffixTotal2(h.equipment, "dark-pact"));
  if (mpReduction > 0 || darkPactCost > 0) {
    const costMult =
      (1 - Math.min(mpReduction, 75) / 100) * (1 + darkPactCost / 100);
    const pctChange = Math.round((1 - costMult) * 100);
    const color = pctChange > 0 ? "#a6f" : pctChange < 0 ? "#f44" : "#888";
    panel.appendChild(
      statLine(
        "MP Cost",
        `${pctChange > 0 ? "-" : "+"}${Math.abs(pctChange)}%`,
        color,
      ),
    );
  }

  const regenHp = Math.round(equipAffixTotal(h.equipment, "regeneration"));
  if (regenHp > 0)
    panel.appendChild(statLine("HP Regen", `+${regenHp} / 2 turns`, "#4f4"));
  const regenMp = Math.round(equipAffixTotal2(h.equipment, "arcane-mastery"));
  if (regenMp > 0)
    panel.appendChild(statLine("MP Regen", `+${regenMp} / 3 turns`, "#a6f"));

  const goldBonus = Math.round(equipAffixTotal(h.equipment, "fortune"));
  const xpBonus = Math.round(equipAffixTotal2(h.equipment, "fortune"));
  if (goldBonus > 0)
    panel.appendChild(statLine("Gold Bonus", `+${goldBonus}%`, "#fd4"));
  if (xpBonus > 0)
    panel.appendChild(statLine("XP Bonus", `+${xpBonus}%`, "#fd4"));

  const vampiric = Math.round(equipAffixTotal(h.equipment, "vampiric"));
  if (vampiric > 0)
    panel.appendChild(statLine("Life Steal", `${vampiric}%`, "#f44"));

  const thorns = Math.round(equipAffixTotal(h.equipment, "thorns"));
  if (thorns > 0)
    panel.appendChild(statLine("Thorns", `${thorns}% reflected`, "#f84"));

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
