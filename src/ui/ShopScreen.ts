// ============================================================
// Shop screen — two-panel buy/sell UI
// ============================================================

import type { GameState, Item } from "../core/types";
import {
  createScreen,
  createTitleBar,
  createPanel,
  createButton,
  el,
} from "./Theme";
import {
  SHOP_DEFS,
  getBuyPrice,
  getSellPrice,
  buyItem,
  sellItem,
} from "../systems/town/Shops";
import {
  getDisplayName,
  getDisplaySprite,
} from "../systems/inventory/display-name";
import { attachItemTooltip, hideItemTooltip } from "./item-tooltip";

function spriteEl(sprite: string): HTMLElement {
  const s = document.createElement("div");
  s.style.cssText = "width:32px;height:32px;flex-shrink:0;";
  s.className = sprite;
  return s;
}

function itemRow(
  item: Item,
  priceLabel: string,
  btnText: string,
  btnDisabled: boolean,
  onClick: () => void,
): HTMLElement {
  const row = el("div", {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "3px 6px",
    borderRadius: "4px",
    cursor: "default",
    transition: "background 0.1s",
  });
  row.addEventListener("mouseenter", () => {
    row.style.background = "#1a1a1a";
  });
  row.addEventListener("mouseleave", () => {
    row.style.background = "";
  });

  row.appendChild(spriteEl(getDisplaySprite(item)));

  const name = el(
    "div",
    {
      flex: "1",
      fontSize: "13px",
      color: "#ccc",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    getDisplayName(item),
  );
  row.appendChild(name);

  const price = el(
    "div",
    { fontSize: "12px", color: "#a70", flexShrink: "0" },
    priceLabel,
  );
  row.appendChild(price);

  const btn = createButton(btnText, "sm");
  if (btnDisabled) {
    btn.disabled = true;
    btn.style.opacity = "0.4";
    btn.style.cursor = "not-allowed";
  } else {
    btn.addEventListener("click", () => {
      hideItemTooltip();
      onClick();
    });
  }
  row.appendChild(btn);

  attachItemTooltip(row, item);
  return row;
}

function buildPanel(
  header: string,
  items: Item[],
  getPrice: (i: Item) => number,
  btnLabel: (i: Item) => string,
  canAfford: (i: Item) => boolean,
  onAction: (id: string) => void,
): HTMLElement {
  const panel = createPanel(header);
  panel.style.flex = "1";
  panel.style.minWidth = "250px";

  const list = el("div", {
    maxHeight: "clamp(200px, 40vh, 400px)",
    overflowY: "auto",
  });

  if (items.length === 0) {
    list.appendChild(
      el(
        "div",
        {
          color: "#555",
          fontSize: "12px",
          padding: "4px 6px",
          fontStyle: "italic",
        },
        "Nothing here.",
      ),
    );
  } else {
    for (const item of items) {
      const price = getPrice(item);
      const disabled = !canAfford(item);
      const row = itemRow(item, `${price}g`, btnLabel(item), disabled, () =>
        onAction(item.id),
      );
      list.appendChild(row);
    }
  }

  panel.appendChild(list);
  return panel;
}

export function createShopScreen(
  initialState: GameState,
  shopId: string,
  onTransaction: (newState: GameState) => void,
  onClose: () => void,
): HTMLElement & { cleanup: () => void } {
  const shop = SHOP_DEFS[shopId];
  const shopName = shop?.name ?? shopId;

  let state = initialState;

  const screen = createScreen() as HTMLElement & { cleanup: () => void };

  function render(): void {
    screen.replaceChildren();

    const copper = state.hero.copper;
    const shopInv = state.town.shopInventories[shopId] ?? [];

    const titleBar = createTitleBar(`${shopName}`, onClose);
    const copperLabel = el(
      "div",
      { color: "#c90", fontSize: "13px" },
      `Gold: ${copper}`,
    );
    titleBar.insertBefore(copperLabel, titleBar.lastChild);
    screen.appendChild(titleBar);

    const row = el("div", {
      display: "flex",
      gap: "8px",
      width: "100%",
      flexWrap: "wrap",
    });

    const forSale = buildPanel(
      "FOR SALE",
      shopInv,
      (i) => getBuyPrice(i, shopId),
      () => "Buy",
      (i) => copper >= getBuyPrice(i, shopId),
      (id) => {
        const next = buyItem(state, shopId, id);
        state = next;
        onTransaction(next);
        render();
      },
    );
    row.appendChild(forSale);

    const yourItems = buildPanel(
      "YOUR ITEMS",
      state.hero.inventory,
      (i) => getSellPrice(i, shopId),
      () => "Sell",
      () => true,
      (id) => {
        const next = sellItem(state, shopId, id);
        state = next;
        onTransaction(next);
        render();
      },
    );
    row.appendChild(yourItems);

    screen.appendChild(row);

    const hint = el(
      "div",
      { color: "#555", fontSize: "11px", marginTop: "4px" },
      "Press Esc to close",
    );
    screen.appendChild(hint);
  }

  render();

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };
  document.addEventListener("keydown", onKey);

  screen.cleanup = () => document.removeEventListener("keydown", onKey);

  return screen;
}
