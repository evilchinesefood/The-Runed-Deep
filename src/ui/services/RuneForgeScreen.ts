import type { GameState, Item } from "../../core/types";
import {
  createPanel,
  createButton,
  el,
  greyBtn,
  SERVICE_SLOT_LABELS,
  EQUIP_SLOT_ORDER,
} from "../Theme";
import {
  RUNES,
  RUNE_BY_ID,
  formatRuneDesc,
  RUNE_TIER_COLOR,
} from "../../data/Runes";
import {
  itemNameColor,
  getDisplayName,
  getDisplaySprite,
  getItemGlow,
} from "../../systems/inventory/display-name";
import { buildTooltipContent } from "../item-tooltip";
import {
  trackRuneInscribe,
  trackSocketsFilled,
} from "../../systems/Achievements";

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

// ── Shared drawer ─────────────────────────────────────────
let forgeDrawer: HTMLElement | null = null;
function closeForgeDrawer(): void {
  if (forgeDrawer) {
    forgeDrawer.remove();
    forgeDrawer = null;
  }
}
export { closeForgeDrawer as closeRuneDrawer };

function openDrawer(content: HTMLElement, buttons: HTMLElement): void {
  closeForgeDrawer();
  forgeDrawer = el("div", {
    position: "fixed",
    bottom: "0",
    left: "0",
    right: "0",
    zIndex: "2000",
    background: "#1a1a1a",
    borderTop: "2px solid #555",
    maxHeight: "70vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 -4px 16px rgba(0,0,0,0.8)",
  });
  const scroll = el("div", { overflowY: "auto", padding: "12px 16px 8px" });
  scroll.appendChild(content);
  forgeDrawer.appendChild(scroll);
  const btnRow = el("div", {
    display: "flex",
    gap: "8px",
    padding: "8px 16px",
    paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))",
    justifyContent: "center",
    flexWrap: "wrap",
    flexShrink: "0",
    borderTop: "1px solid #333",
    background: "#1a1a1a",
  });
  btnRow.appendChild(buttons);
  forgeDrawer.appendChild(btnRow);
  document.body.appendChild(forgeDrawer);
}

function makeDrawerBtn(
  label: string,
  onClick: () => void,
  disabled = false,
): HTMLButtonElement {
  const btn = createButton(label);
  btn.style.cssText += "min-width:80px;padding:8px 16px;font-size:14px;";
  greyBtn(btn, disabled);
  if (!disabled) btn.addEventListener("click", onClick);
  return btn;
}

// ── Slot row (matches blacksmith/sage pattern) ────────────
function slotRow(
  slotKey: string,
  item: Item | null | undefined,
  subtitle: string,
  actionBtn: HTMLButtonElement | null,
  onRowClick: (() => void) | null,
): HTMLElement {
  const row = el("div", {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "4px 6px",
    cursor: item && onRowClick ? "pointer" : "default",
    borderRadius: "4px",
  });
  if (item && onRowClick) {
    row.addEventListener("mouseenter", () => {
      row.style.background = "#1a1a1a";
    });
    row.addEventListener("mouseleave", () => {
      row.style.background = "";
    });
  }

  const spriteWrap = el("div", {
    width: "32px",
    height: "32px",
    flexShrink: "0",
  });
  if (item) {
    spriteWrap.className = getDisplaySprite(item);
    const glow = getItemGlow(item);
    if (glow) spriteWrap.style.filter = glow;
  }
  row.appendChild(spriteWrap);

  row.appendChild(
    el(
      "span",
      { color: "#666", width: "50px", flexShrink: "0", fontSize: "11px" },
      SERVICE_SLOT_LABELS[slotKey] ?? slotKey,
    ),
  );

  if (item && !item.cursed) {
    const info = el("div", { flex: "1", minWidth: "0" });
    info.appendChild(
      el(
        "div",
        {
          color: itemNameColor(item),
          fontSize: "13px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        },
        getDisplayName(item),
      ),
    );
    info.appendChild(el("div", { color: "#888", fontSize: "11px" }, subtitle));
    row.appendChild(info);
    if (actionBtn) row.appendChild(actionBtn);
    if (onRowClick) row.addEventListener("click", onRowClick);
  } else if (item && item.cursed) {
    row.appendChild(
      el(
        "span",
        { color: "#f44", flex: "1", fontSize: "13px", fontStyle: "italic" },
        `${getDisplayName(item)} (cursed)`,
      ),
    );
  } else {
    row.appendChild(
      el(
        "span",
        { color: "#333", flex: "1", fontSize: "13px", fontStyle: "italic" },
        "\u2014 empty \u2014",
      ),
    );
  }

  return row;
}

// ── Tab state ─────────────────────────────────────────────
let forgeTab: "socket" | "inscribe" | "erase" = "inscribe";

// ── Add Socket tab ────────────────────────────────────────
function buildAddSocket(
  panel: HTMLElement,
  state: GameState,
  onUpdate: (s: GameState) => void,
): void {
  const cap = state.runeForgeMaxSockets ?? 2;
  panel.appendChild(
    el(
      "div",
      { color: "#888", fontSize: "11px", marginBottom: "6px" },
      `Add an empty socket. Cost: 10 shards + 200g. Cap: ${cap}`,
    ),
  );

  const list = el("div", {
    maxHeight: "clamp(200px, 50vh, 400px)",
    overflowY: "auto",
  });
  list.setAttribute("data-service-list", "1");

  for (const slotKey of EQUIP_SLOT_ORDER) {
    const item = state.hero.equipment[slotKey];
    if (!item || item.cursed) {
      list.appendChild(slotRow(slotKey, item, "", null, null));
      continue;
    }
    const cur = item.sockets?.length ?? 0;
    const atCap = cur >= cap;
    const canAfford =
      state.hero.runeShards >= 10 && state.hero.gold >= 200 && !atCap;

    const doSocket = () => {
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
      closeForgeDrawer();
      onUpdate(s);
    };
    const openSocketDrawer = () => {
      const content = el("div", {});
      content.appendChild(buildTooltipContent(item));
      content.appendChild(
        el(
          "div",
          {
            color: "#c9a84c",
            fontSize: "14px",
            marginTop: "6px",
            textAlign: "center",
            fontWeight: "bold",
          },
          `Sockets: ${cur}/${cap} · Cost: 10 shards + 200g`,
        ),
      );
      const btns = el("div", { display: "flex", gap: "8px" });
      btns.appendChild(makeDrawerBtn("Add Socket", doSocket, !canAfford));
      btns.appendChild(makeDrawerBtn("Close", closeForgeDrawer));
      openDrawer(content, btns);
    };

    const btn = createButton(atCap ? "MAX" : "+1", "sm");
    greyBtn(btn, !canAfford);
    if (canAfford)
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        doSocket();
      });

    list.appendChild(
      slotRow(slotKey, item, `Sockets: ${cur}/${cap}`, btn, openSocketDrawer),
    );
  }
  panel.appendChild(list);
}

// ── Inscribe tab ──────────────────────────────────────────
function buildInscribe(
  panel: HTMLElement,
  state: GameState,
  onUpdate: (s: GameState) => void,
): void {
  panel.appendChild(
    el(
      "div",
      { color: "#888", fontSize: "11px", marginBottom: "6px" },
      "Select an item to inscribe a rune into an empty socket.",
    ),
  );

  const list = el("div", {
    maxHeight: "clamp(200px, 50vh, 400px)",
    overflowY: "auto",
  });
  list.setAttribute("data-service-list", "1");

  for (const slotKey of EQUIP_SLOT_ORDER) {
    const item = state.hero.equipment[slotKey];
    if (!item || item.cursed) {
      list.appendChild(slotRow(slotKey, item, "", null, null));
      continue;
    }
    const empty = (item.sockets ?? []).filter((s) => s === null).length;
    const hasEmpty = empty > 0;

    const openInscribeDrawer = () => {
      const existing = (item.sockets ?? []).filter(
        (s): s is string => s !== null,
      );
      const content = el("div", {});
      content.appendChild(buildTooltipContent(item));
      content.appendChild(
        el(
          "div",
          {
            color: "#c9a84c",
            fontSize: "14px",
            marginTop: "8px",
            textAlign: "center",
            fontWeight: "bold",
          },
          `Inscribe Rune onto ${getDisplayName(item)}`,
        ),
      );

      const runeList = el("div", {
        marginTop: "8px",
        maxHeight: "40vh",
        overflowY: "auto",
      });
      for (const tier of ["common", "uncommon", "rare"] as const) {
        const tierRunes = RUNES.filter((r) => r.tier === tier);
        runeList.appendChild(
          el(
            "div",
            {
              color: RUNE_TIER_COLOR[tier],
              fontSize: "12px",
              fontWeight: "bold",
              marginTop: "6px",
            },
            `${tier.charAt(0).toUpperCase() + tier.slice(1)} (${tierRunes[0]?.cost ?? 0} shards)`,
          ),
        );
        for (const rune of tierRunes) {
          const dupe = existing.includes(rune.id);
          const canAfford = state.hero.runeShards >= rune.cost && !dupe;
          const effEnch = item.enchantment + (item.blessed ? 1 : 0);
          const desc = formatRuneDesc(rune.id, effEnch);
          const runeBtn = createButton(`\u25C6 ${rune.name}: ${desc}`);
          Object.assign(runeBtn.style, {
            display: "block",
            width: "100%",
            textAlign: "left",
            fontSize: "12px",
            color: RUNE_TIER_COLOR[rune.tier],
            marginBottom: "2px",
          });
          greyBtn(runeBtn, !canAfford);
          if (dupe) runeBtn.title = "Already inscribed on this item";
          if (canAfford) {
            runeBtn.addEventListener("click", () => {
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
              closeForgeDrawer();
              onUpdate(s);
            });
          }
          runeList.appendChild(runeBtn);
        }
      }
      content.appendChild(runeList);
      const btns = el("div", { display: "flex", gap: "8px" });
      btns.appendChild(makeDrawerBtn("Close", closeForgeDrawer));
      openDrawer(content, btns);
    };

    const sockets = item.sockets ?? [];
    const total = sockets.length;
    const sub = total === 0 ? "No sockets" : `${empty}/${total} empty`;
    const btn = createButton("Inscribe", "sm");
    greyBtn(btn, !hasEmpty);
    if (hasEmpty)
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openInscribeDrawer();
      });

    list.appendChild(
      slotRow(slotKey, item, sub, btn, hasEmpty ? openInscribeDrawer : null),
    );
  }
  panel.appendChild(list);
}

// ── Erase tab ─────────────────────────────────────────────
function buildErase(
  panel: HTMLElement,
  state: GameState,
  onUpdate: (s: GameState) => void,
): void {
  panel.appendChild(
    el(
      "div",
      { color: "#888", fontSize: "11px", marginBottom: "6px" },
      "Remove a rune from a socket. Cost: 100g.",
    ),
  );

  const list = el("div", {
    maxHeight: "clamp(200px, 50vh, 400px)",
    overflowY: "auto",
  });
  list.setAttribute("data-service-list", "1");

  for (const slotKey of EQUIP_SLOT_ORDER) {
    const item = state.hero.equipment[slotKey];
    if (!item || item.cursed) {
      list.appendChild(slotRow(slotKey, item, "", null, null));
      continue;
    }
    const filled = (item.sockets ?? []).filter((s) => s !== null).length;
    const hasFilled = filled > 0;

    const openEraseDrawer = () => {
      const content = el("div", {});
      content.appendChild(buildTooltipContent(item));
      content.appendChild(
        el(
          "div",
          {
            color: "#c9a84c",
            fontSize: "14px",
            marginTop: "8px",
            textAlign: "center",
            fontWeight: "bold",
          },
          `Erase Rune from ${getDisplayName(item)}`,
        ),
      );

      const runeList = el("div", { marginTop: "8px" });
      const effEnch = item.enchantment + (item.blessed ? 1 : 0);
      for (let i = 0; i < (item.sockets ?? []).length; i++) {
        const runeId = item.sockets![i];
        if (!runeId) continue;
        const rune = RUNE_BY_ID[runeId];
        if (!rune) continue;
        const canAfford = state.hero.gold >= 100;
        const desc = formatRuneDesc(runeId, effEnch);
        const eraseBtn = createButton(
          `\u25C6 ${rune.name}: ${desc} \u2014 Erase (100g)`,
        );
        Object.assign(eraseBtn.style, {
          display: "block",
          width: "100%",
          textAlign: "left",
          fontSize: "12px",
          color: RUNE_TIER_COLOR[rune.tier],
          marginBottom: "2px",
        });
        greyBtn(eraseBtn, !canAfford);
        if (canAfford) {
          const idx = i;
          eraseBtn.addEventListener("click", () => {
            const newSockets = [...(item.sockets ?? [])];
            newSockets[idx] = null;
            const updated = { ...item, sockets: newSockets };
            let s = updateItemInState(state, updated);
            s = { ...s, hero: { ...s.hero, gold: s.hero.gold - 100 } };
            closeForgeDrawer();
            onUpdate(s);
          });
        }
        runeList.appendChild(eraseBtn);
      }
      content.appendChild(runeList);
      const btns = el("div", { display: "flex", gap: "8px" });
      btns.appendChild(makeDrawerBtn("Close", closeForgeDrawer));
      openDrawer(content, btns);
    };

    const sockets = item.sockets ?? [];
    const total = sockets.length;
    const sub = total === 0 ? "No sockets" : `${filled}/${total} inscribed`;
    const btn = createButton("Erase", "sm");
    greyBtn(btn, !hasFilled);
    if (hasFilled)
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openEraseDrawer();
      });

    list.appendChild(
      slotRow(slotKey, item, sub, btn, hasFilled ? openEraseDrawer : null),
    );
  }
  panel.appendChild(list);
}

// ── Main export ───────────────────────────────────────────
export function buildRuneForge(
  state: GameState,
  onUpdate: (s: GameState) => void,
): HTMLElement {
  const panel = createPanel();

  const tabBar = el("div", {
    display: "flex",
    borderBottom: "2px solid #333",
    marginBottom: "8px",
    gap: "0",
  });
  const makeTab = (label: string) =>
    el(
      "div",
      {
        padding: "8px 20px",
        fontSize: "13px",
        cursor: "pointer",
        whiteSpace: "nowrap",
        userSelect: "none",
        transition: "color 0.15s",
      },
      label,
    );

  const tabs = [
    { key: "socket" as const, label: "Add Socket" },
    { key: "inscribe" as const, label: "Inscribe" },
    { key: "erase" as const, label: "Erase" },
  ];
  const tabEls = tabs.map((t) => makeTab(t.label));

  for (let i = 0; i < tabs.length; i++) {
    const active = forgeTab === tabs[i].key;
    tabEls[i].style.color = active ? "#c9a84c" : "#555";
    tabEls[i].style.borderBottom = active
      ? "2px solid #c9a84c"
      : "2px solid transparent";
    tabEls[i].style.marginBottom = active ? "-2px" : "";
    tabEls[i].addEventListener("click", () => {
      forgeTab = tabs[i].key;
      onUpdate(state);
    });
    tabBar.appendChild(tabEls[i]);
  }
  panel.appendChild(tabBar);

  switch (forgeTab) {
    case "socket":
      buildAddSocket(panel, state, onUpdate);
      break;
    case "inscribe":
      buildInscribe(panel, state, onUpdate);
      break;
    case "erase":
      buildErase(panel, state, onUpdate);
      break;
  }

  return panel;
}
