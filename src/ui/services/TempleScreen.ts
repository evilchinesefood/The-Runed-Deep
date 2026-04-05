import type { GameState } from "../../core/types";
import { createPanel, createButton, el, greyBtn } from "../Theme";
import {
  templeHealHP,
  templeHealMP,
  templeCurePoison,
  templeRemoveCurse,
} from "../../systems/town/Services";

export function buildTemple(
  state: GameState,
  onUpdate: (s: GameState) => void,
): HTMLElement {
  const panel = createPanel();

  const missingHP = state.hero.maxHp - state.hero.hp;
  const missingMP = state.hero.maxMp - state.hero.mp;
  const isPoisoned = state.hero.activeEffects.some((e) => e.id === "poisoned");

  const items: [string, number, boolean, () => GameState][] = [
    ["Heal HP (free)", 0, missingHP <= 0, () => templeHealHP(state)],
    ["Restore MP (free)", 0, missingMP <= 0, () => templeHealMP(state)],
    ["Cure Poison (free)", 0, !isPoisoned, () => templeCurePoison(state)],
  ];

  for (const [label, , disabled, action] of items) {
    const btn = createButton(label);
    Object.assign(btn.style, {
      display: "block",
      width: "100%",
      marginBottom: "6px",
      textAlign: "left",
    });
    greyBtn(btn, disabled);
    btn.addEventListener("click", () => onUpdate(action()));
    panel.appendChild(btn);
  }

  // Remove Curse — list cursed items from inventory + equipment
  const cursedItems: { id: string; name: string; source: string }[] = [];
  for (const item of state.hero.inventory) {
    if (item.cursed)
      cursedItems.push({ id: item.id, name: item.name, source: "inv" });
  }
  for (const [, item] of Object.entries(state.hero.equipment)) {
    if (item?.cursed)
      cursedItems.push({
        id: item.id,
        name: `${item.name} (equipped)`,
        source: "eq",
      });
  }

  panel.appendChild(
    el(
      "div",
      {
        color: "#c90",
        fontSize: "13px",
        fontWeight: "bold",
        margin: "12px 0 6px",
        borderTop: "1px solid #444",
        paddingTop: "8px",
      },
      "Remove Curse (10g)",
    ),
  );
  if (cursedItems.length === 0) {
    panel.appendChild(
      el(
        "div",
        {
          color: "#555",
          fontSize: "12px",
          fontStyle: "italic",
          padding: "4px 0",
        },
        "No cursed items.",
      ),
    );
  }
  for (const ci of cursedItems) {
    const canAfford = state.hero.gold >= 10;
    const btn = createButton(`Bless: ${ci.name}`);
    Object.assign(btn.style, {
      display: "block",
      width: "100%",
      marginBottom: "4px",
      textAlign: "left",
      fontSize: "12px",
    });
    greyBtn(btn, !canAfford);
    btn.addEventListener("click", () =>
      onUpdate(templeRemoveCurse(state, ci.id)),
    );
    panel.appendChild(btn);
  }

  return panel;
}
