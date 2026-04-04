import type { GameState, Item } from "../../core/types";
import { ITEM_BY_ID } from "../../data/items";
import { createPanel, createButton, el } from "../Theme";
import {
  RUNES,
  RUNE_BY_ID,
  formatRuneDesc,
  RUNE_TIER_COLOR,
} from "../../data/Runes";
import {
  itemNameColor,
  getDisplayName,
} from "../../systems/inventory/display-name";
import { attachItemTooltip } from "../item-tooltip";
import {
  trackRuneInscribe,
  trackSocketsFilled,
} from "../../systems/Achievements";

function greyBtn(btn: HTMLButtonElement, disabled: boolean): void {
  btn.disabled = disabled;
  btn.style.opacity = disabled ? "0.4" : "1";
  btn.style.cursor = disabled ? "not-allowed" : "pointer";
}

function getAllEquipAndInv(state: GameState): Item[] {
  const items: Item[] = [];
  for (const eq of Object.values(state.hero.equipment)) {
    if (eq) items.push(eq);
  }
  for (const i of state.hero.inventory) items.push(i);
  return items;
}

function updateItemInState(state: GameState, updated: Item): GameState {
  for (const [slot, eq] of Object.entries(state.hero.equipment)) {
    if (eq && eq.id === updated.id) {
      return {
        ...state,
        hero: {
          ...state.hero,
          equipment: { ...state.hero.equipment, [slot]: updated },
        },
      };
    }
  }
  const idx = state.hero.inventory.findIndex((i) => i.id === updated.id);
  if (idx >= 0) {
    const inv = [...state.hero.inventory];
    inv[idx] = updated;
    return { ...state, hero: { ...state.hero, inventory: inv } };
  }
  return state;
}

let runeDrawer: HTMLElement | null = null;
function closeRuneDrawer(): void {
  if (runeDrawer) {
    runeDrawer.remove();
    runeDrawer = null;
  }
}

function showRunePicker(
  state: GameState,
  item: Item,
  onUpdate: (s: GameState) => void,
): void {
  closeRuneDrawer();
  const existing = (item.sockets ?? []).filter((s): s is string => s !== null);

  runeDrawer = el("div", {
    position: "fixed",
    inset: "0",
    zIndex: "300",
    background: "rgba(0,0,0,0.9)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "20px",
    overflowY: "auto",
  });

  runeDrawer.appendChild(
    el(
      "div",
      { color: "#c9a84c", fontSize: "16px", fontWeight: "bold" },
      `Inscribe Rune onto ${getDisplayName(item)}`,
    ),
  );

  const tiers: ("common" | "uncommon" | "rare")[] = [
    "common",
    "uncommon",
    "rare",
  ];
  for (const tier of tiers) {
    const tierRunes = RUNES.filter((r) => r.tier === tier);
    runeDrawer.appendChild(
      el(
        "div",
        {
          color: RUNE_TIER_COLOR[tier],
          fontSize: "13px",
          fontWeight: "bold",
          marginTop: "8px",
        },
        `${tier.charAt(0).toUpperCase() + tier.slice(1)} (${tierRunes[0]?.cost ?? 0} shards)`,
      ),
    );
    for (const rune of tierRunes) {
      const dupe = existing.includes(rune.id);
      const canAfford = state.hero.runeShards >= rune.cost && !dupe;
      const effEnch = item.enchantment + (item.blessed ? 1 : 0);
      const desc = formatRuneDesc(rune.id, effEnch);
      const btn = createButton(`\u25C6 ${rune.name}: ${desc}`);
      Object.assign(btn.style, {
        display: "block",
        width: "100%",
        maxWidth: "360px",
        textAlign: "left",
        fontSize: "12px",
        color: RUNE_TIER_COLOR[rune.tier],
      });
      if (dupe) {
        greyBtn(btn, true);
        btn.title = "Already inscribed on this item";
      } else {
        greyBtn(btn, !canAfford);
      }
      if (canAfford) {
        btn.addEventListener("click", () => {
          const newSockets = [...(item.sockets ?? [])];
          const emptyIdx = newSockets.indexOf(null);
          if (emptyIdx >= 0) newSockets[emptyIdx] = rune.id;
          const updated = { ...item, sockets: newSockets };
          let s = updateItemInState(state, updated);
          s = {
            ...s,
            hero: { ...s.hero, runeShards: s.hero.runeShards - rune.cost },
          };
          trackRuneInscribe();
          trackSocketsFilled(newSockets);
          closeRuneDrawer();
          onUpdate(s);
        });
      }
      runeDrawer!.appendChild(btn);
    }
  }

  const cancelBtn = createButton("Cancel");
  cancelBtn.style.marginTop = "12px";
  cancelBtn.addEventListener("click", closeRuneDrawer);
  runeDrawer.appendChild(cancelBtn);
  document.body.appendChild(runeDrawer);
}

function showErasePicker(
  state: GameState,
  item: Item,
  onUpdate: (s: GameState) => void,
): void {
  closeRuneDrawer();
  runeDrawer = el("div", {
    position: "fixed",
    inset: "0",
    zIndex: "300",
    background: "rgba(0,0,0,0.9)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "20px",
  });

  runeDrawer.appendChild(
    el(
      "div",
      { color: "#c9a84c", fontSize: "16px", fontWeight: "bold" },
      `Erase rune from ${getDisplayName(item)}`,
    ),
  );

  const effEnch = item.enchantment + (item.blessed ? 1 : 0);
  for (let i = 0; i < (item.sockets ?? []).length; i++) {
    const runeId = item.sockets![i];
    if (!runeId) continue;
    const rune = RUNE_BY_ID[runeId];
    if (!rune) continue;
    const canAfford = state.hero.gold >= 100;
    const desc = formatRuneDesc(runeId, effEnch);
    const btn = createButton(
      `\u25C6 ${rune.name}: ${desc} \u2014 Erase (100g)`,
    );
    Object.assign(btn.style, {
      display: "block",
      width: "100%",
      maxWidth: "360px",
      textAlign: "left",
      fontSize: "12px",
      color: RUNE_TIER_COLOR[rune.tier],
    });
    greyBtn(btn, !canAfford);
    if (canAfford) {
      const idx = i;
      btn.addEventListener("click", () => {
        const newSockets = [...(item.sockets ?? [])];
        newSockets[idx] = null;
        const updated = { ...item, sockets: newSockets };
        let s = updateItemInState(state, updated);
        s = { ...s, hero: { ...s.hero, gold: s.hero.gold - 100 } };
        closeRuneDrawer();
        onUpdate(s);
      });
    }
    runeDrawer.appendChild(btn);
  }

  const cancelBtn = createButton("Cancel");
  cancelBtn.style.marginTop = "12px";
  cancelBtn.addEventListener("click", closeRuneDrawer);
  runeDrawer.appendChild(cancelBtn);
  document.body.appendChild(runeDrawer);
}

export { closeRuneDrawer };

export function buildRuneForge(
  state: GameState,
  onUpdate: (s: GameState) => void,
): HTMLElement {
  const panel = createPanel("Rune Forge");
  const cap = state.runeForgeMaxSockets ?? 2;

  // Add Socket
  panel.appendChild(
    el(
      "div",
      {
        color: "#c9a84c",
        fontSize: "13px",
        fontWeight: "bold",
        margin: "0 0 4px",
      },
      "Add Socket (10 shards + 200g)",
    ),
  );
  panel.appendChild(
    el(
      "div",
      { color: "#888", fontSize: "11px", marginBottom: "6px" },
      `Socket cap: ${cap}`,
    ),
  );
  const socketItems = getAllEquipAndInv(state)
    .filter(
      (i) => i.sockets !== undefined || ITEM_BY_ID[i.templateId]?.equipSlot,
    )
    .filter((i) => {
      const cur = i.sockets?.length ?? 0;
      return cur < cap;
    });
  if (socketItems.length === 0) {
    panel.appendChild(
      el(
        "div",
        {
          color: "#555",
          fontSize: "12px",
          marginBottom: "8px",
          fontStyle: "italic",
        },
        "No items eligible for new sockets.",
      ),
    );
  } else {
    for (const item of socketItems) {
      const canAfford = state.hero.runeShards >= 10 && state.hero.gold >= 200;
      const curSockets = item.sockets?.length ?? 0;
      const btn = createButton(
        `${getDisplayName(item)} [${curSockets}/${cap}]`,
        "sm",
      );
      Object.assign(btn.style, {
        display: "block",
        width: "100%",
        marginBottom: "3px",
        textAlign: "left",
        fontSize: "12px",
        color: itemNameColor(item),
      });
      greyBtn(btn, !canAfford);
      if (canAfford) {
        btn.addEventListener("click", () => {
          const newSockets = [...(item.sockets ?? []), null];
          const updated = { ...item, sockets: newSockets };
          let s = updateItemInState(state, updated);
          s = {
            ...s,
            hero: {
              ...s.hero,
              runeShards: s.hero.runeShards - 10,
              gold: s.hero.gold - 200,
            },
          };
          onUpdate(s);
        });
      }
      attachItemTooltip(btn, item);
      panel.appendChild(btn);
    }
  }

  panel.appendChild(
    el("div", { borderTop: "1px solid #333", margin: "10px 0" }),
  );

  // Inscribe Rune
  panel.appendChild(
    el(
      "div",
      {
        color: "#c9a84c",
        fontSize: "13px",
        fontWeight: "bold",
        margin: "0 0 4px",
      },
      "Inscribe Rune",
    ),
  );
  const emptySocketItems = getAllEquipAndInv(state).filter((i) =>
    i.sockets?.some((s) => s === null),
  );
  if (emptySocketItems.length === 0) {
    panel.appendChild(
      el(
        "div",
        {
          color: "#555",
          fontSize: "12px",
          marginBottom: "8px",
          fontStyle: "italic",
        },
        "No items with empty sockets.",
      ),
    );
  } else {
    for (const item of emptySocketItems) {
      const btn = createButton(getDisplayName(item), "sm");
      Object.assign(btn.style, {
        display: "block",
        width: "100%",
        marginBottom: "3px",
        textAlign: "left",
        fontSize: "12px",
        color: itemNameColor(item),
      });
      btn.addEventListener("click", () => {
        showRunePicker(state, item, onUpdate);
      });
      attachItemTooltip(btn, item);
      panel.appendChild(btn);
    }
  }

  panel.appendChild(
    el("div", { borderTop: "1px solid #333", margin: "10px 0" }),
  );

  // Erase Rune (100g)
  panel.appendChild(
    el(
      "div",
      {
        color: "#c9a84c",
        fontSize: "13px",
        fontWeight: "bold",
        margin: "0 0 4px",
      },
      "Erase Rune (100g)",
    ),
  );
  panel.appendChild(
    el(
      "div",
      { color: "#888", fontSize: "11px", marginBottom: "6px" },
      "The inscription will be ground away. The socket will remain empty.",
    ),
  );
  const filledSocketItems = getAllEquipAndInv(state).filter((i) =>
    i.sockets?.some((s) => s !== null),
  );
  if (filledSocketItems.length === 0) {
    panel.appendChild(
      el(
        "div",
        {
          color: "#555",
          fontSize: "12px",
          marginBottom: "8px",
          fontStyle: "italic",
        },
        "No items with inscribed runes.",
      ),
    );
  } else {
    for (const item of filledSocketItems) {
      const btn = createButton(getDisplayName(item), "sm");
      Object.assign(btn.style, {
        display: "block",
        width: "100%",
        marginBottom: "3px",
        textAlign: "left",
        fontSize: "12px",
        color: itemNameColor(item),
      });
      btn.addEventListener("click", () => {
        showErasePicker(state, item, onUpdate);
      });
      attachItemTooltip(btn, item);
      panel.appendChild(btn);
    }
  }

  // Socket Cap Upgrade
  if (cap === 2) {
    panel.appendChild(
      el("div", { borderTop: "1px solid #333", margin: "10px 0" }),
    );
    panel.appendChild(
      el(
        "div",
        {
          color: "#c9a84c",
          fontSize: "13px",
          fontWeight: "bold",
          margin: "0 0 4px",
        },
        "Socket Cap Upgrade (100 shards)",
      ),
    );
    const canUpgrade = state.hero.runeShards >= 100;
    const upBtn = createButton("Upgrade Socket Cap (2 \u2192 3)");
    Object.assign(upBtn.style, {
      display: "block",
      width: "100%",
      padding: "10px",
      fontSize: "14px",
    });
    greyBtn(upBtn, !canUpgrade);
    if (canUpgrade) {
      upBtn.addEventListener("click", () => {
        onUpdate({
          ...state,
          runeForgeMaxSockets: 3,
          hero: { ...state.hero, runeShards: state.hero.runeShards - 100 },
        });
      });
    }
    panel.appendChild(upBtn);
  }

  return panel;
}
