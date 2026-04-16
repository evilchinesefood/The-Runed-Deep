import type { GameState, GameAction, Item } from "../core/types";
import { ITEM_BY_ID } from "../data/items";
import { createButton, el } from "./Theme";
import { buildTooltipContent } from "./item-tooltip";
import {
  getDisplayName,
  getDisplaySprite,
  getItemGlow,
  itemNameColor,
} from "../systems/inventory/display-name";

let drawerEl: HTMLElement | null = null;
let renderedGroundItemId: string | null = null;
let keyHandler: ((e: KeyboardEvent) => void) | null = null;

function close(): void {
  if (drawerEl) {
    drawerEl.remove();
    drawerEl = null;
  }
  renderedGroundItemId = null;
  if (keyHandler) {
    document.removeEventListener("keydown", keyHandler);
    keyHandler = null;
  }
}

function computePackCap(state: GameState): number {
  const BASE_CARRY = 10000;
  const packItem = state.hero.equipment.pack;
  const packTpl = packItem ? ITEM_BY_ID[packItem.templateId] : null;
  const basePackWeight =
    packItem?.properties["weightCapacity"] ?? packTpl?.weightCapacity ?? 0;
  const enchBonus = packItem ? packItem.enchantment * 5000 : 0;
  let cap = BASE_CARRY + Math.max(0, basePackWeight + enchBonus);
  for (const eq of Object.values(state.hero.equipment)) {
    if (eq && ITEM_BY_ID[eq.templateId]?.uniqueAbility === "titan-power") {
      cap *= 2;
      break;
    }
  }
  return cap;
}

function itemRow(
  item: Item,
  wouldFit: boolean,
  onClick: () => void,
): HTMLElement {
  const row = el("div", {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px",
    cursor: wouldFit ? "pointer" : "not-allowed",
    borderRadius: "4px",
    opacity: wouldFit ? "1" : "0.4",
  });
  if (wouldFit) {
    row.addEventListener("mouseenter", () => (row.style.background = "#222"));
    row.addEventListener("mouseleave", () => (row.style.background = ""));
    row.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick();
    });
  }

  const sprite = el("div", {
    width: "32px",
    height: "32px",
    flexShrink: "0",
  });
  sprite.className = getDisplaySprite(item);
  const glow = getItemGlow(item);
  if (glow) sprite.style.filter = glow;
  row.appendChild(sprite);

  const name = el(
    "div",
    {
      color: itemNameColor(item),
      fontSize: "13px",
      flex: "1",
      minWidth: "0",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    getDisplayName(item),
  );
  row.appendChild(name);

  row.appendChild(
    el(
      "span",
      { color: "#888", fontSize: "11px", flexShrink: "0" },
      `${(item.weight / 1000).toFixed(1)}kg`,
    ),
  );
  return row;
}

function openConfirm(
  drop: Item,
  ground: Item,
  onConfirm: () => void,
): void {
  const overlay = el("div", {
    position: "fixed",
    inset: "0",
    zIndex: "2100",
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });
  const box = el("div", {
    background: "#1a1a1a",
    border: "2px solid #555",
    borderRadius: "4px",
    padding: "16px",
    maxWidth: "320px",
    textAlign: "center",
  });
  box.appendChild(
    el(
      "div",
      { color: "#ccc", fontSize: "14px", marginBottom: "12px" },
      `Drop ${getDisplayName(drop)} to pick up ${getDisplayName(ground)}?`,
    ),
  );
  const btns = el("div", {
    display: "flex",
    gap: "8px",
    justifyContent: "center",
  });
  const swap = createButton("Swap");
  swap.style.cssText += "min-width:80px;padding:8px 16px;font-size:14px;";
  swap.addEventListener("click", () => {
    overlay.remove();
    onConfirm();
  });
  const cancel = createButton("Cancel");
  cancel.style.cssText += "min-width:80px;padding:8px 16px;font-size:14px;";
  cancel.addEventListener("click", () => overlay.remove());
  btns.appendChild(swap);
  btns.appendChild(cancel);
  box.appendChild(btns);
  overlay.appendChild(box);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}

export function renderPackSwapDrawer(
  state: GameState,
  onAction: (a: GameAction) => void,
): void {
  const pending = state.pendingPackSwap;
  if (!pending || state.screen !== "game") {
    close();
    return;
  }

  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  const ground = floor?.items.find(
    (i) => i.item.id === pending.groundItemId,
  )?.item;
  if (!ground) {
    onAction({ type: "dismissPackSwap" });
    return;
  }

  if (renderedGroundItemId === ground.id && drawerEl) return;
  close();
  renderedGroundItemId = ground.id;

  const packCap = computePackCap(state);
  const currentWeight = state.hero.inventory.reduce(
    (s, i) => s + i.weight,
    0,
  );

  drawerEl = el("div", {
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
  const scroll = el("div", {
    overflowY: "auto",
    padding: "12px 16px 8px",
    maxWidth: "480px",
    margin: "0 auto",
    width: "100%",
    boxSizing: "border-box",
  });
  scroll.appendChild(
    el(
      "div",
      {
        color: "#c9a84c",
        fontSize: "16px",
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: "6px",
      },
      "Pack Full — Drop an Item?",
    ),
  );
  scroll.appendChild(buildTooltipContent(ground));
  scroll.appendChild(
    el("div", { borderTop: "1px solid #444", margin: "10px 0 6px" }),
  );
  scroll.appendChild(
    el(
      "div",
      {
        color: "#c90",
        fontSize: "11px",
        fontWeight: "bold",
        marginBottom: "4px",
      },
      "YOUR INVENTORY",
    ),
  );

  if (state.hero.inventory.length === 0) {
    scroll.appendChild(
      el(
        "div",
        { color: "#888", fontSize: "12px", fontStyle: "italic" },
        "Your inventory is empty — drop equipment instead.",
      ),
    );
  } else {
    for (const inv of state.hero.inventory) {
      const fits = currentWeight - inv.weight + ground.weight <= packCap;
      scroll.appendChild(
        itemRow(inv, fits, () =>
          openConfirm(inv, ground, () => {
            onAction({
              type: "swapPickup",
              dropItemId: inv.id,
              pickupItemId: ground.id,
            });
          }),
        ),
      );
    }
  }
  drawerEl.appendChild(scroll);

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
  const cancelBtn = createButton("Cancel");
  cancelBtn.style.cssText += "min-width:80px;padding:8px 16px;font-size:14px;";
  cancelBtn.addEventListener("click", () => {
    onAction({ type: "dismissPackSwap" });
  });
  btnRow.appendChild(cancelBtn);
  drawerEl.appendChild(btnRow);

  document.body.appendChild(drawerEl);

  keyHandler = (e: KeyboardEvent) => {
    if (e.code === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onAction({ type: "dismissPackSwap" });
    }
  };
  document.addEventListener("keydown", keyHandler, true);
}
