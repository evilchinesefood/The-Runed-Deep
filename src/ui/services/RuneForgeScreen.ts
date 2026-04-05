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
import { attachItemTooltip, buildTooltipContent } from "../item-tooltip";
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

// ── Tab state ─────────────────────────────────────────────
let forgeTab: "socket" | "inscribe" | "erase" = "inscribe";

function buildItemList(
  items: Item[],
  emptyMsg: string,
  panel: HTMLElement,
  makeRow: (item: Item) => HTMLElement,
): void {
  if (items.length === 0) {
    panel.appendChild(
      el("div", { color: "#555", fontSize: "12px", fontStyle: "italic", padding: "8px 0" }, emptyMsg),
    );
    return;
  }
  const list = el("div", { maxHeight: "clamp(200px, 50vh, 400px)", overflowY: "auto" });
  list.setAttribute("data-service-list", "1");
  for (const item of items) list.appendChild(makeRow(item));
  panel.appendChild(list);
}

function showSocketDrawer(
  state: GameState,
  item: Item,
  onUpdate: (s: GameState) => void,
): void {
  closeRuneDrawer();
  const cap = state.runeForgeMaxSockets ?? 2;
  const curSockets = item.sockets?.length ?? 0;
  const canAfford = state.hero.runeShards >= 10 && state.hero.gold >= 200;

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
    el("div", { color: "#c9a84c", fontSize: "16px", fontWeight: "bold" },
      `Add Socket to ${getDisplayName(item)}`),
  );
  runeDrawer.appendChild(
    el("div", { color: "#888", fontSize: "12px", marginBottom: "8px" },
      `Sockets: ${curSockets}/${cap} · Cost: 10 shards + 200g`),
  );
  runeDrawer.appendChild(buildTooltipContent(item));

  const addBtn = createButton("Add Socket");
  addBtn.style.cssText += "min-width:120px;padding:10px 20px;font-size:14px;margin-top:12px;";
  greyBtn(addBtn, !canAfford);
  if (canAfford) {
    addBtn.addEventListener("click", () => {
      const newSockets = [...(item.sockets ?? []), null];
      const updated = { ...item, sockets: newSockets };
      let s = updateItemInState(state, updated);
      s = { ...s, hero: { ...s.hero, runeShards: s.hero.runeShards - 10, gold: s.hero.gold - 200 } };
      closeRuneDrawer();
      onUpdate(s);
    });
  }
  runeDrawer.appendChild(addBtn);

  const cancelBtn = createButton("Cancel");
  cancelBtn.style.marginTop = "8px";
  cancelBtn.addEventListener("click", closeRuneDrawer);
  runeDrawer.appendChild(cancelBtn);
  document.body.appendChild(runeDrawer);
}

function buildAddSocket(panel: HTMLElement, state: GameState, onUpdate: (s: GameState) => void): void {
  const cap = state.runeForgeMaxSockets ?? 2;
  panel.appendChild(
    el("div", { color: "#888", fontSize: "11px", marginBottom: "6px" }, `Add an empty socket to an item. Cost: 10 shards + 200g. Socket cap: ${cap}`),
  );
  const items = getAllEquipAndInv(state)
    .filter((i) => i.sockets !== undefined || ITEM_BY_ID[i.templateId]?.equipSlot)
    .filter((i) => (i.sockets?.length ?? 0) < cap);
  buildItemList(items, "No items eligible for new sockets.", panel, (item) => {
    const curSockets = item.sockets?.length ?? 0;
    const btn = createButton(`${getDisplayName(item)} [${curSockets}/${cap}]`, "sm");
    Object.assign(btn.style, {
      display: "block", width: "100%", marginBottom: "3px",
      textAlign: "left", fontSize: "12px", color: itemNameColor(item),
    });
    btn.addEventListener("click", () => showSocketDrawer(state, item, onUpdate));
    attachItemTooltip(btn, item);
    return btn;
  });
}

function buildInscribe(panel: HTMLElement, state: GameState, onUpdate: (s: GameState) => void): void {
  panel.appendChild(
    el("div", { color: "#888", fontSize: "11px", marginBottom: "6px" }, "Select an item with an empty socket to inscribe a rune."),
  );
  const items = getAllEquipAndInv(state).filter((i) => i.sockets?.some((s) => s === null));
  buildItemList(items, "No items with empty sockets.", panel, (item) => {
    const btn = createButton(getDisplayName(item), "sm");
    Object.assign(btn.style, {
      display: "block", width: "100%", marginBottom: "3px",
      textAlign: "left", fontSize: "12px", color: itemNameColor(item),
    });
    btn.addEventListener("click", () => showRunePicker(state, item, onUpdate));
    attachItemTooltip(btn, item);
    return btn;
  });
}

function buildErase(panel: HTMLElement, state: GameState, onUpdate: (s: GameState) => void): void {
  panel.appendChild(
    el("div", { color: "#888", fontSize: "11px", marginBottom: "6px" }, "Remove a rune from a socket. Cost: 100g. The socket remains empty."),
  );
  const items = getAllEquipAndInv(state).filter((i) => i.sockets?.some((s) => s !== null));
  buildItemList(items, "No items with inscribed runes.", panel, (item) => {
    const btn = createButton(getDisplayName(item), "sm");
    Object.assign(btn.style, {
      display: "block", width: "100%", marginBottom: "3px",
      textAlign: "left", fontSize: "12px", color: itemNameColor(item),
    });
    btn.addEventListener("click", () => showErasePicker(state, item, onUpdate));
    attachItemTooltip(btn, item);
    return btn;
  });
}

export function buildRuneForge(
  state: GameState,
  onUpdate: (s: GameState) => void,
): HTMLElement {
  const panel = createPanel();

  // Tab bar
  const tabBar = el("div", {
    display: "flex",
    borderBottom: "2px solid #333",
    marginBottom: "8px",
    gap: "0",
  });
  const makeTab = (label: string) =>
    el("div", {
      padding: "8px 12px",
      fontSize: "12px",
      cursor: "pointer",
      whiteSpace: "nowrap",
      userSelect: "none",
      transition: "color 0.15s",
    }, label);

  const tabs = [
    { key: "socket" as const, label: "Add Socket" },
    { key: "inscribe" as const, label: "Inscribe" },
    { key: "erase" as const, label: "Erase" },
  ];
  const tabEls = tabs.map((t) => makeTab(t.label));

  for (let i = 0; i < tabs.length; i++) {
    const active = forgeTab === tabs[i].key;
    tabEls[i].style.color = active ? "#c9a84c" : "#555";
    tabEls[i].style.borderBottom = active ? "2px solid #c9a84c" : "2px solid transparent";
    tabEls[i].style.marginBottom = active ? "-2px" : "";
    tabEls[i].addEventListener("click", () => { forgeTab = tabs[i].key; onUpdate(state); });
    tabBar.appendChild(tabEls[i]);
  }
  panel.appendChild(tabBar);

  // Tab content
  switch (forgeTab) {
    case "socket": buildAddSocket(panel, state, onUpdate); break;
    case "inscribe": buildInscribe(panel, state, onUpdate); break;
    case "erase": buildErase(panel, state, onUpdate); break;
  }

  return panel;
}
