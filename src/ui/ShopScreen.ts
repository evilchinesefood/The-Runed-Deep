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
  getItemGlow,
  itemNameColor,
} from "../systems/inventory/display-name";
import { attachItemTooltip, hideItemTooltip, buildTooltipContent, setTooltipKnownSpells } from "./item-tooltip";
import { ITEM_BY_ID } from "../data/items";

const IS_MOBILE_SHOP = window.innerWidth <= 768;
let shopDrawerEl: HTMLElement | null = null;

function closeShopDrawer(): void {
  if (shopDrawerEl) { shopDrawerEl.remove(); shopDrawerEl = null; }
}

function openShopDrawer(item: Item, price: number, actionLabel: string, onAction: () => void): void {
  closeShopDrawer();
  shopDrawerEl = el("div", {
    position: "fixed", bottom: "0", left: "0", right: "0", zIndex: "2000",
    background: "#1a1a1a", borderTop: "2px solid #555",
    padding: "12px 16px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
    maxHeight: "60vh", overflowY: "auto",
    boxShadow: "0 -4px 16px rgba(0,0,0,0.8)",
  });
  shopDrawerEl.appendChild(buildTooltipContent(item));
  shopDrawerEl.appendChild(el("div", { color: "#a70", fontSize: "13px", marginTop: "6px" }, `Price: ${price} gold`));
  const btnRow = el("div", { display: "flex", gap: "8px", marginTop: "10px", justifyContent: "center" });
  const actionBtn = createButton(actionLabel);
  actionBtn.style.cssText += "min-width:80px;padding:8px 16px;font-size:14px;";
  actionBtn.addEventListener("click", (e) => { e.stopPropagation(); onAction(); });
  btnRow.appendChild(actionBtn);
  const closeBtn = createButton("Close");
  closeBtn.style.cssText += "min-width:80px;padding:8px 16px;font-size:14px;";
  closeBtn.addEventListener("click", (e) => { e.stopPropagation(); closeShopDrawer(); });
  btnRow.appendChild(closeBtn);
  shopDrawerEl.appendChild(btnRow);
  document.body.appendChild(shopDrawerEl);
}

interface ItemStack {
  item: Item;
  count: number;
}

const NO_STACK_SLOTS = new Set(['weapon', 'shield', 'helmet', 'body', 'cloak', 'gauntlets', 'belt', 'boots']);
function stackItems(items: Item[]): ItemStack[] {
  const stacks: ItemStack[] = [];
  const map = new Map<string, ItemStack>();
  for (const item of items) {
    const tpl = ITEM_BY_ID[item.templateId];
    if (tpl?.equipSlot && NO_STACK_SLOTS.has(tpl.equipSlot)) {
      stacks.push({ item, count: 1 });
      continue;
    }
    const key = `${item.templateId}|${item.enchantment}|${item.cursed}`;
    const existing = map.get(key);
    if (existing) {
      existing.count++;
    } else {
      const stack = { item, count: 1 };
      map.set(key, stack);
      stacks.push(stack);
    }
  }
  return stacks;
}

function spriteEl(sprite: string): HTMLElement {
  const s = document.createElement("div");
  s.style.cssText = "width:32px;height:32px;flex-shrink:0;";
  s.className = sprite;
  return s;
}

function itemRow(
  item: Item,
  count: number,
  priceLabel: string,
  btnText: string,
  btnDisabled: boolean,
  onClick: () => void,
  nameColor?: string,
  priceNum?: number,
): HTMLElement {
  const row = el("div", {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "3px 6px",
    borderRadius: "4px",
    cursor: IS_MOBILE_SHOP ? "pointer" : "default",
    transition: "background 0.1s",
  });
  row.addEventListener("mouseenter", () => { row.style.background = "#1a1a1a"; });
  row.addEventListener("mouseleave", () => { row.style.background = ""; });

  // Sprite with count badge
  const spriteWrap = el("div", {
    width: "32px",
    height: "32px",
    flexShrink: "0",
    position: "relative",
  });
  const sp = spriteEl(getDisplaySprite(item));
  sp.style.position = "absolute";
  sp.style.top = "0";
  sp.style.left = "0";
  const glow = getItemGlow(item);
  if (glow) sp.style.filter = glow;
  spriteWrap.appendChild(sp);
  if (count > 1) {
    const badge = el("span", {
      position: "absolute", bottom: "-2px", right: "-2px",
      background: "#c90", color: "#000", fontSize: "10px",
      fontWeight: "bold", padding: "0 3px", borderRadius: "3px", lineHeight: "14px",
    }, `${count}`);
    spriteWrap.appendChild(badge);
  }
  row.appendChild(spriteWrap);

  const displayName =
    count > 1 ? `${getDisplayName(item)} (x${count})` : getDisplayName(item);
  row.appendChild(el("div", {
    flex: "1", fontSize: "13px", color: nameColor ?? "#ccc",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  }, displayName));

  row.appendChild(el("div", { fontSize: "12px", color: "#a70", flexShrink: "0" }, priceLabel));

  if (IS_MOBILE_SHOP) {
    // Mobile: tap row to open drawer
    row.addEventListener("click", () => {
      if (!btnDisabled) openShopDrawer(item, priceNum ?? 0, btnText, onClick);
    });
  } else {
    // Desktop: inline button + tooltip
    const btn = createButton(btnText, "sm");
    if (btnDisabled) {
      btn.disabled = true;
      btn.style.opacity = "0.4";
      btn.style.cursor = "not-allowed";
    } else {
      btn.addEventListener("click", () => { hideItemTooltip(); onClick(); });
    }
    row.appendChild(btn);
    attachItemTooltip(row, item);
  }
  return row;
}

type ShopSort = "cost" | "name";

function sortItems(
  items: Item[],
  mode: ShopSort,
  getPrice: (i: Item) => number,
): Item[] {
  const sorted = [...items];
  if (mode === "cost") {
    sorted.sort((a, b) => getPrice(b) - getPrice(a));
  } else {
    sorted.sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b)));
  }
  return sorted;
}

function buildPanel(
  header: string,
  items: Item[],
  getPrice: (i: Item) => number,
  btnLabel: (i: Item) => string,
  canAfford: (i: Item) => boolean,
  onAction: (id: string) => void,
  sortMode: ShopSort,
  onSortChange: (mode: ShopSort) => void,
  soldKeys?: Set<string>,
  noStack?: boolean,
): HTMLElement {
  const panel = createPanel(header);
  panel.style.flex = "1";
  panel.style.minWidth = "250px";

  // Sort bar
  const sortBar = el("div", {
    display: "flex",
    gap: "4px",
    marginBottom: "4px",
  });
  for (const [mode, label] of [
    ["cost", "Cost"],
    ["name", "Name"],
  ] as [ShopSort, string][]) {
    const active = mode === sortMode;
    const sb = el(
      "div",
      {
        padding: "2px 8px",
        fontSize: "11px",
        cursor: "pointer",
        borderRadius: "3px",
        userSelect: "none",
        background: active ? "#446" : "#222",
        color: active ? "#aaf" : "#888",
        border: active ? "1px solid #558" : "1px solid #333",
      },
      label,
    );
    sb.addEventListener("click", () => onSortChange(mode));
    sortBar.appendChild(sb);
  }
  panel.appendChild(sortBar);

  const list = el("div", {
    maxHeight: IS_MOBILE_SHOP ? "clamp(200px, 50vh, 500px)" : "clamp(200px, 40vh, 400px)",
    overflowY: "auto",
  });
  list.setAttribute("data-shop-list", "1");

  const sorted = sortItems(items, sortMode, getPrice);

  if (sorted.length === 0) {
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
    const stacks = noStack ? sorted.map(i => ({ item: i, count: 1 })) : stackItems(sorted);
    for (const { item, count } of stacks) {
      const price = getPrice(item);
      const disabled = !canAfford(item);
      const itemKey = `${item.templateId}|${item.enchantment}`;
      const isSold = soldKeys?.has(itemKey);
      const row = itemRow(
        item,
        count,
        `${price}g`,
        btnLabel(item),
        disabled,
        () => onAction(item.id),
        isSold ? "#7a8a5a" : itemNameColor(item),
        price,
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
  setTooltipKnownSpells(state.hero.knownSpells);
  let shopScrollTop = 0;
  let invScrollTop = 0;
  let shopSort: ShopSort = "cost";
  let invSort: ShopSort = "cost";
  let itemsOnlyMode = false;
  const soldKeys = new Set<string>();

  const screen = createScreen() as HTMLElement & { cleanup: () => void };

  function render(): void {
    // Save scroll positions before rebuild
    const lists = screen.querySelectorAll<HTMLElement>("[data-shop-list]");
    if (lists[0]) shopScrollTop = lists[0].scrollTop;
    if (lists[1]) invScrollTop = lists[1].scrollTop;

    screen.replaceChildren();

    const copper = state.hero.copper;
    const shopInv = state.town.shopInventories[shopId] ?? [];

    const titleBar = createTitleBar(`${shopName}`, onClose);
    const copperLabel = el("div", { color: "#c90", fontSize: "13px" }, `Gold: ${copper}`);
    titleBar.insertBefore(copperLabel, titleBar.lastChild);
    // Items toggle button
    const itemsBtn = createButton(itemsOnlyMode ? "Shop" : "Items", "sm");
    itemsBtn.style.cssText += "margin-left:auto;margin-right:8px;padding:4px 10px;font-size:12px;";
    itemsBtn.addEventListener("click", (e) => { e.stopPropagation(); itemsOnlyMode = !itemsOnlyMode; render(); });
    titleBar.insertBefore(itemsBtn, titleBar.lastChild);
    screen.appendChild(titleBar);

    const row = el("div", {
      display: "flex",
      gap: "8px",
      width: "100%",
      flexWrap: "wrap",
    });

    if (!itemsOnlyMode) {
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
        shopSort,
        (mode) => { shopSort = mode; render(); },
        soldKeys,
      );
      row.appendChild(forSale);
    }

    const yourItems = buildPanel(
      itemsOnlyMode ? "INVENTORY" : "YOUR ITEMS",
      state.hero.inventory,
      (i) => getSellPrice(i, shopId),
      () => "Sell",
      () => true,
      (id) => {
        const sellTarget = state.hero.inventory.find((i) => i.id === id);
        if (sellTarget) soldKeys.add(`${sellTarget.templateId}|${sellTarget.enchantment}`);
        const next = sellItem(state, shopId, id);
        state = next;
        onTransaction(next);
        render();
      },
      invSort,
      (mode) => { invSort = mode; render(); },
      undefined,
      true,
    );
    if (itemsOnlyMode) yourItems.style.minWidth = "100%";
    row.appendChild(yourItems);

    screen.appendChild(row);

    const hint = el(
      "div",
      { color: "#555", fontSize: "11px", marginTop: "4px" },
      "Press Esc to close",
    );
    screen.appendChild(hint);

    // Restore scroll positions
    const newLists = screen.querySelectorAll<HTMLElement>("[data-shop-list]");
    if (newLists[0]) newLists[0].scrollTop = shopScrollTop;
    if (newLists[1]) newLists[1].scrollTop = invScrollTop;
  }

  render();

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };
  document.addEventListener("keydown", onKey);

  screen.cleanup = () => { document.removeEventListener("keydown", onKey); closeShopDrawer(); };

  return screen;
}
