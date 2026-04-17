import type { GameState, GameAction, EquipSlot, Item } from "../core/types";
import { ITEM_BY_ID } from "../data/items";
import {
  getDisplayName,
  getDisplaySprite,
  getDisplaySpriteLayers,
  getItemGlow,
  itemNameColor,
} from "../systems/inventory/display-name";
import {
  attachItemTooltip,
  hideItemTooltip,
  buildTooltipContent,
  setTooltipKnownSpells,
} from "./item-tooltip";
import {
  createScreen,
  createPanel,
  createTitleBar,
  createButton,
  el,
  INVENTORY_SLOT_LABELS,
  EQUIP_SLOT_ORDER,
} from "./Theme";

function renderSpriteLayers(
  container: HTMLElement,
  item: Item,
  size = 32,
): void {
  const layers = getDisplaySpriteLayers(item);
  const glow = getItemGlow(item);
  if (layers.length <= 1) {
    const s = el("div", { width: `${size}px`, height: `${size}px` });
    if (size !== 32) {
      s.style.transform = `scale(${size / 32})`;
      s.style.transformOrigin = "top left";
      s.style.width = "32px";
      s.style.height = "32px";
    }
    s.className = getDisplaySprite(item);
    if (glow) s.style.filter = glow;
    container.appendChild(s);
  } else {
    container.style.position = "relative";
    for (const cls of layers) {
      const layer = el("div", {
        position: "absolute",
        top: "0",
        left: "0",
        width: "32px",
        height: "32px",
      });
      if (size !== 32) {
        layer.style.transform = `scale(${size / 32})`;
        layer.style.transformOrigin = "top left";
      }
      layer.className = cls;
      if (glow) layer.style.filter = glow;
      container.appendChild(layer);
    }
  }
}

function itemDisplayLabel(item: Item): string {
  return getDisplayName(item);
}

function btn(label: string, onClick: () => void): HTMLElement {
  const b = document.createElement("button");
  b.textContent = label;
  b.style.cssText =
    "padding:2px 6px;background:linear-gradient(180deg,#4a4a4a,#2a2a2a,#1a1a1a);border:1px solid #555;border-bottom:2px solid #333;color:#c9a84c;text-shadow:0 1px 2px rgba(0,0,0,0.8);cursor:pointer;font-size:12px;font-weight:bold;";
  b.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });
  return b;
}

export function createInventoryScreen(
  state: GameState,
  onAction: (action: GameAction) => void,
  onClose: () => void,
  initialSelectedIdx: number = 0,
  openDrawerForId?: string,
  initialItemsOnly: boolean = false,
): HTMLElement & {
  cleanup: () => void;
  getSelectedIdx: () => number;
  getScrollTop: () => number;
  getItemsOnlyMode: () => boolean;
} {
  const h = state.hero;
  setTooltipKnownSpells(h.knownSpells);
  const isMobileView = window.innerWidth <= 768;
  let selectedIdx = Math.min(
    initialSelectedIdx,
    Math.max(0, h.inventory.length - 1),
  );

  const screen = createScreen();
  screen.classList.add("screen-scrollable");

  // ── Title bar ────────────────────────────────────────────────
  let activeTab: "equipment" | "inventory" = initialItemsOnly
    ? "inventory"
    : "equipment";
  const titleBar = createTitleBar("Inventory", () => {
    cleanup();
    onClose();
  });
  screen.appendChild(titleBar);

  // ── Wrapper panel with tabs inside ──────────────────────────
  const wrapperPanel = createPanel();

  const tabBar = el("div", {
    display: "flex",
    borderBottom: "2px solid #333",
    marginBottom: "8px",
    gap: "0",
  });
  const makeTab = (label: string): HTMLElement =>
    el("div", {
      padding: "8px 20px",
      fontSize: "13px",
      cursor: "pointer",
      whiteSpace: "nowrap",
      userSelect: "none",
      transition: "color 0.15s",
    }, label);
  const tabEquip = makeTab("Equipment");
  const tabInv = makeTab("Inventory");
  tabBar.appendChild(tabEquip);
  tabBar.appendChild(tabInv);
  wrapperPanel.appendChild(tabBar);

  // Equipment content div (inside wrapper)
  const isMobile = window.innerWidth <= 480;
  const equipPanel = el("div", {
    display: "flex",
    gap: isMobile ? "0" : "12px",
    padding: "0",
  });

  // Inventory content div (inside wrapper)
  const invPanel = el("div", {});
  invPanel.setAttribute("data-inv-panel", "1");

  wrapperPanel.appendChild(equipPanel);
  wrapperPanel.appendChild(invPanel);
  screen.appendChild(wrapperPanel);

  function updateTabs(): void {
    const eq = activeTab === "equipment";
    tabEquip.style.color = eq ? "#c9a84c" : "#555";
    tabEquip.style.borderBottom = eq ? "2px solid #c9a84c" : "2px solid transparent";
    tabEquip.style.marginBottom = eq ? "-2px" : "";
    tabInv.style.color = !eq ? "#c9a84c" : "#555";
    tabInv.style.borderBottom = !eq ? "2px solid #c9a84c" : "2px solid transparent";
    tabInv.style.marginBottom = !eq ? "-2px" : "";
    equipPanel.style.display = eq ? "flex" : "none";
    invPanel.style.display = !eq ? "block" : "none";
  }
  // Detail drawer state (declared early so tab handlers can close it)
  let drawerEl: HTMLElement | null = null;
  function closeDrawer(): void {
    if (drawerEl) { drawerEl.remove(); drawerEl = null; }
  }

  tabEquip.addEventListener("click", () => {
    activeTab = "equipment";
    closeDrawer();
    updateTabs();
  });
  tabInv.addEventListener("click", () => {
    activeTab = "inventory";
    closeDrawer();
    updateTabs();
  });


  // Paperdoll — desktop only, no slot icons
  if (!isMobile) {
    const dollWrapper = el("div", {
      position: "relative",
      width: "240px",
      height: "480px",
      flexShrink: "0",
      overflow: "hidden",
    });
    const dollBg = el("div", {
      width: "100%",
      height: "100%",
      backgroundSize: "contain",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    });
    dollBg.className = "equipment-dude";
    dollWrapper.appendChild(dollBg);
    equipPanel.appendChild(dollWrapper);
  }

  // Equipment list with sprite icons
  const legend = el("div", { flex: "1", padding: "4px 0", overflowY: "auto" });

  for (const slotKey of EQUIP_SLOT_ORDER) {
    const item = h.equipment[slotKey];
    const row = el("div", {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      marginBottom: "3px",
      padding: "2px 4px",
      fontSize: "13px",
      cursor: item ? "pointer" : "default",
      borderRadius: "2px",
    });

    // Sprite icon — 32px sprite scaled to 24px
    const spriteWrap = el("div", {
      width: "24px",
      height: "24px",
      flexShrink: "0",
      overflow: "hidden",
    });
    if (item) {
      renderSpriteLayers(spriteWrap, item, 24);
    }
    row.appendChild(spriteWrap);

    const label = INVENTORY_SLOT_LABELS[slotKey] || slotKey;
    row.appendChild(
      el(
        "span",
        { color: "#666", width: "55px", flexShrink: "0", fontSize: "11px" },
        label,
      ),
    );

    if (item) {
      row.appendChild(
        el(
          "span",
          { color: itemNameColor(item), flex: "1" },
          itemDisplayLabel(item),
        ),
      );
      row.addEventListener("click", () => openEquippedDrawer(item, slotKey));
      if (!isMobileView) {
        row.addEventListener("mouseenter", () => {
          row.style.background = "#1a1a1a";
        });
        row.addEventListener("mouseleave", () => {
          row.style.background = "";
        });
        attachItemTooltip(row, item);
      }
    } else {
      row.appendChild(
        el("span", { color: "#333", fontStyle: "italic" }, "\u2014"),
      );
    }

    legend.appendChild(row);
  }

  equipPanel.appendChild(legend);

  // ── Inventory content ──────────────────────────────────────
  // Sort controls
  type SortMode = "newest" | "oldest" | "type";
  let sortMode: SortMode =
    (localStorage.getItem("rd-inv-sort") as SortMode) || "newest";

  const sortBar = el("div", {
    display: "flex",
    gap: "4px",
    marginBottom: "6px",
    flexWrap: "wrap",
  });
  const sortModes: [SortMode, string][] = [
    ["newest", "Newest"],
    ["oldest", "Oldest"],
    ["type", "By Type"],
  ];
  const sortButtons: HTMLElement[] = [];
  for (const [mode, label] of sortModes) {
    const sb = el("div", {
      padding: "2px 8px",
      fontSize: "11px",
      cursor: "pointer",
      borderRadius: "3px",
      userSelect: "none",
      transition: "background 0.1s",
    });
    sb.textContent = label;
    sb.addEventListener("click", () => {
      sortMode = mode;
      localStorage.setItem("rd-inv-sort", mode);
      updateSortButtons();
      renderInvRows();
    });
    sortBar.appendChild(sb);
    sortButtons.push(sb);
  }
  function updateSortButtons(): void {
    sortButtons.forEach((sb, i) => {
      const active = sortModes[i][0] === sortMode;
      sb.style.background = active ? "#446" : "#222";
      sb.style.color = active ? "#aaf" : "#888";
      sb.style.border = active ? "1px solid #558" : "1px solid #333";
    });
  }
  updateSortButtons();
  invPanel.appendChild(sortBar);

  interface ItemStack {
    item: Item;
    count: number;
  }

  function stackItems(items: Item[]): ItemStack[] {
    const stacks: ItemStack[] = [];
    const map = new Map<string, ItemStack>();
    for (const item of items) {
      // Equippable items never stack (unique affixes make each different)
      const tplS = ITEM_BY_ID[item.templateId];
      if (tplS?.equipSlot) {
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

  function getSortedInventory(): typeof h.inventory {
    const inv = [...h.inventory];
    switch (sortMode) {
      case "newest":
        return inv.reverse();
      case "oldest":
        return inv;
      case "type":
        return inv.sort((a, b) => a.category.localeCompare(b.category));
      default:
        return inv;
    }
  }

  let invRows: HTMLElement[] = [];

  // ── Detail drawer (mobile) ──────────────────────────────
  const openDrawer = (
    item: Item,
    tpl: any,
    equippedInSlot: Item | null,
    stackCount: number = 1,
  ) => {
    closeDrawer();
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

    // Scrollable content area
    const scrollArea = el("div", {
      overflowY: "auto",
      padding: "12px 16px 8px",
      maxWidth: "480px",
      margin: "0 auto",
    });

    // Item tooltip content
    scrollArea.appendChild(buildTooltipContent(item));

    // Compare section
    if (equippedInSlot && tpl?.equipSlot) {
      const divider = el("div", {
        height: "1px",
        background: "#444",
        margin: "8px 0",
      });
      scrollArea.appendChild(divider);
      const compareLabel = el(
        "div",
        {
          color: "#886",
          fontSize: "11px",
          fontWeight: "bold",
          marginBottom: "4px",
        },
        "CURRENTLY EQUIPPED",
      );
      scrollArea.appendChild(compareLabel);
      scrollArea.appendChild(buildTooltipContent(equippedInSlot));
    }
    drawerEl.appendChild(scrollArea);

    // Action buttons — pinned at bottom, never scrolled away
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
    const drawerBtn = (label: string, onClick: () => void, close = false) => {
      const b = createButton(label);
      b.style.cssText += "min-width:80px;padding:8px 16px;font-size:14px;";
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        if (close) closeDrawer();
        onClick();
      });
      return b;
    };
    if (tpl?.equipSlot) {
      btnRow.appendChild(drawerBtn("Equip", () => dispatchEquip(item)));
    }
    if (["potion", "spellbook"].includes(item.category)) {
      btnRow.appendChild(
        drawerBtn("Use", () => onAction({ type: "useItem", itemId: item.id })),
      );
      if (stackCount > 1 && item.category === "potion") {
        btnRow.appendChild(
          drawerBtn(`Use All (x${stackCount})`, () =>
            onAction({ type: "useAllItems", templateId: item.templateId }),
          ),
        );
      }
    }
    btnRow.appendChild(
      drawerBtn("Drop", () => onAction({ type: "dropItem", itemId: item.id })),
    );
    // Remove Curse — if item is cursed and player knows the spell
    if (item.cursed && h.knownSpells.includes("remove-curse") && h.mp >= 3) {
      btnRow.appendChild(
        drawerBtn("Uncurse", () =>
          onAction({ type: "removeCurseItem", itemId: item.id }),
        ),
      );
    }
    // Mark/Unmark for sale — dispatched through game loop
    const markLabel = item.markedForSale ? "Unmark" : "Mark";
    const markBtn = createButton(markLabel);
    markBtn.style.cssText += "min-width:80px;padding:8px 16px;font-size:14px;";
    if (item.markedForSale) {
      markBtn.style.color = "#f90";
      markBtn.style.borderColor = "#a60";
    }
    markBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeDrawer();
      onAction({ type: "toggleMarkForSale", itemId: item.id });
    });
    btnRow.appendChild(markBtn);
    btnRow.appendChild(drawerBtn("Close", () => closeDrawer(), true));
    drawerEl.appendChild(btnRow);

    document.body.appendChild(drawerEl);
  };

  const openEquippedDrawer = (item: Item, slotKey: EquipSlot) => {
    closeDrawer();
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
    const scrollArea = el("div", {
      overflowY: "auto",
      padding: "12px 16px 8px",
      maxWidth: "480px",
      margin: "0 auto",
    });
    scrollArea.appendChild(buildTooltipContent(item));
    drawerEl.appendChild(scrollArea);
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
    const drawerBtn2 = (label: string, onClick: () => void, close = false) => {
      const b = createButton(label);
      b.style.cssText += "min-width:80px;padding:8px 16px;font-size:14px;";
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        if (close) closeDrawer();
        onClick();
      });
      return b;
    };
    btnRow.appendChild(
      drawerBtn2("Unequip", () =>
        onAction({ type: "unequipItem", slot: slotKey }),
      ),
    );
    if (item.cursed && h.knownSpells.includes("remove-curse") && h.mp >= 3) {
      btnRow.appendChild(
        drawerBtn2("Uncurse", () =>
          onAction({ type: "removeCurseItem", itemId: item.id }),
        ),
      );
    }
    btnRow.appendChild(drawerBtn2("Close", () => closeDrawer(), true));
    drawerEl.appendChild(btnRow);
    document.body.appendChild(drawerEl);
  };

  const openRingSwapDrawer = (newRing: Item) => {
    const left = h.equipment.ringLeft;
    const right = h.equipment.ringRight;
    if (!left || !right) {
      onAction({ type: "equipItem", itemId: newRing.id });
      return;
    }
    closeDrawer();
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
    });
    scroll.appendChild(
      el(
        "div",
        {
          color: "#c9a84c",
          fontSize: "16px",
          fontWeight: "bold",
          textAlign: "center",
          marginBottom: "8px",
        },
        "Choose Ring Slot",
      ),
    );
    const hdr = (text: string) =>
      el(
        "div",
        {
          color: "#c90",
          fontSize: "11px",
          fontWeight: "bold",
          marginTop: "8px",
          marginBottom: "4px",
        },
        text,
      );
    const hr = () =>
      el("div", { borderTop: "1px solid #444", margin: "8px 0" });
    scroll.appendChild(hdr("NEW RING"));
    scroll.appendChild(buildTooltipContent(newRing));
    scroll.appendChild(hr());
    scroll.appendChild(hdr("LEFT RING"));
    scroll.appendChild(buildTooltipContent(left));
    scroll.appendChild(hr());
    scroll.appendChild(hdr("RIGHT RING"));
    scroll.appendChild(buildTooltipContent(right));
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
    const mkBtn = (label: string, slot: EquipSlot | null) => {
      const b = createButton(label);
      b.style.cssText += "min-width:80px;padding:8px 16px;font-size:14px;";
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        closeDrawer();
        if (slot)
          onAction({ type: "equipItemToSlot", itemId: newRing.id, slot });
      });
      return b;
    };
    btnRow.appendChild(mkBtn("Replace Left", "ringLeft"));
    btnRow.appendChild(mkBtn("Replace Right", "ringRight"));
    btnRow.appendChild(mkBtn("Cancel", null));
    drawerEl.appendChild(btnRow);
    document.body.appendChild(drawerEl);
  };

  const dispatchEquip = (item: Item) => {
    const tpl = ITEM_BY_ID[item.templateId];
    if (
      tpl?.equipSlot === "ringLeft" &&
      h.equipment.ringLeft &&
      h.equipment.ringRight
    ) {
      openRingSwapDrawer(item);
    } else {
      onAction({ type: "equipItem", itemId: item.id });
    }
  };

  const renderInvRows = () => {
    // Keep header + sort bar, remove the rest
    while (invPanel.children.length > 2)
      invPanel.removeChild(invPanel.lastChild!);
    invRows = [];

    if (h.inventory.length === 0) {
      invPanel.appendChild(
        el(
          "div",
          {
            color: "#555",
            fontStyle: "italic",
            fontSize: "13px",
            padding: "8px 0",
          },
          "Your inventory is empty.",
        ),
      );
      return;
    }

    const sorted = getSortedInventory();
    const stacks = stackItems(sorted);
    for (let i = 0; i < stacks.length; i++) {
      const { item, count } = stacks[i];
      const tpl = ITEM_BY_ID[item.templateId];
      const isSelected = i === selectedIdx;

      const row = el("div", {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "3px 6px",
        background: isSelected ? "#222" : "transparent",
        cursor: "pointer",
        borderRadius: "2px",
      });

      // Sprite
      const spriteWrap = el("div", {
        width: "32px",
        height: "32px",
        flexShrink: "0",
        position: "relative",
      });
      const layers = getDisplaySpriteLayers(item);
      if (layers.length <= 1) {
        const spriteDiv = el("div", { width: "32px", height: "32px" });
        spriteDiv.className = (layers[0] || "") + " inventory-item";
        const invGlow = getItemGlow(item);
        if (invGlow) spriteDiv.style.filter = invGlow;
        spriteWrap.appendChild(spriteDiv);
      } else {
        spriteWrap.style.position = "relative";
        const invGlow = getItemGlow(item);
        for (const cls of layers) {
          const layerDiv = el("div", {
            position: "absolute",
            top: "0",
            left: "0",
            width: "32px",
            height: "32px",
          });
          layerDiv.className = cls + " inventory-item";
          if (invGlow) layerDiv.style.filter = invGlow;
          spriteWrap.appendChild(layerDiv);
        }
      }
      if (count > 1) {
        const badge = el(
          "span",
          {
            position: "absolute",
            bottom: "-2px",
            right: "-2px",
            background: "#c90",
            color: "#000",
            fontSize: "10px",
            fontWeight: "bold",
            padding: "0 3px",
            borderRadius: "3px",
            lineHeight: "14px",
          },
          `${count}`,
        );
        spriteWrap.appendChild(badge);
      }
      if (item.markedForSale) {
        spriteWrap.appendChild(
          el(
            "span",
            {
              position: "absolute",
              top: "-2px",
              left: "-2px",
              fontSize: "12px",
              lineHeight: "12px",
            },
            "\uD83D\uDCB0",
          ),
        );
      }
      row.appendChild(spriteWrap);

      // Name
      const label =
        count > 1
          ? `${itemDisplayLabel(item)} (x${count})`
          : itemDisplayLabel(item);
      row.appendChild(
        el(
          "span",
          {
            flex: "1",
            fontSize: "13px",
            color: itemNameColor(item),
          },
          label,
        ),
      );

      // Weight
      row.appendChild(
        el(
          "span",
          {
            fontSize: "12px",
            color: "#888",
            width: "55px",
            textAlign: "right",
          },
          `${((item.weight * count) / 1000).toFixed(1)} kg`,
        ),
      );

      // Equipped item in same slot for compare
      const equipSlot = tpl?.equipSlot;
      let equippedInSlot = equipSlot ? h.equipment[equipSlot] : null;
      if (equipSlot === "ringLeft" && !equippedInSlot)
        equippedInSlot = h.equipment.ringRight;

      if (!isMobileView) {
        // Desktop: inline action buttons + tooltip
        const actions = el("div", {
          display: "flex",
          gap: "4px",
          marginLeft: "8px",
        });
        if (tpl?.equipSlot) {
          actions.appendChild(btn("[E]", () => dispatchEquip(item)));
        }
        if (["potion", "spellbook"].includes(item.category)) {
          actions.appendChild(
            btn("[U]", () => onAction({ type: "useItem", itemId: item.id })),
          );
          if (count > 1 && item.category === "potion") {
            actions.appendChild(
              btn(`[U×${count}]`, () =>
                onAction({ type: "useAllItems", templateId: item.templateId }),
              ),
            );
          }
        }
        actions.appendChild(
          btn("[D]", () => onAction({ type: "dropItem", itemId: item.id })),
        );
        row.appendChild(actions);
        attachItemTooltip(row, item, equippedInSlot);
      }
      // Both desktop and mobile: click row to open drawer
      row.addEventListener("click", () => {
        selectedIdx = i;
        refreshSelection();
        openDrawer(item, tpl, equippedInSlot, count);
      });

      invPanel.appendChild(row);
      invRows.push(row);
    }
  };

  const refreshSelection = () => {
    for (let i = 0; i < invRows.length; i++) {
      invRows[i].style.background = i === selectedIdx ? "#222" : "transparent";
    }
  };

  renderInvRows();

  // ── Footer ────────────────────────────────────────────────
  const footer = el("div", { width: "100%", alignItems: "center" });
  footer.className = "footer";
  footer.appendChild(el("span", { color: "#fc4", lineHeight: "1" }, `\u0024${h.gold}`));
  footer.appendChild(el("span", { color: "#a6f", lineHeight: "1" }, `\u25C6${h.runeShards}`));
  footer.appendChild(el("span", { color: "#4f8", lineHeight: "1" }, `\u2726${h.essence}`));
  footer.appendChild(el("span", undefined, `Items: ${h.inventory.length}`));

  // Show carry capacity (base 10kg + pack bonus + enchantment)
  const BASE_CARRY = 10000;
  const pack = h.equipment.pack;
  const packTpl = pack ? ITEM_BY_ID[pack.templateId] : null;
  const basePackWeight = packTpl?.weightCapacity ?? 0;
  const packEnchBonus = pack ? pack.enchantment * 5000 : 0;
  let totalCap = BASE_CARRY + Math.max(0, basePackWeight + packEnchBonus);
  for (const eq of Object.values(h.equipment)) {
    if (eq && ITEM_BY_ID[eq.templateId]?.uniqueAbility === "titan-power") {
      totalCap *= 2;
      break;
    }
  }
  const invWeight = h.inventory.reduce((s, i) => s + i.weight, 0);
  const pct = Math.round((invWeight / totalCap) * 100);
  const capColor = pct > 90 ? "#f44" : pct > 70 ? "#fa0" : "#aaa";
  footer.appendChild(
    el(
      "span",
      { color: capColor },
      `Carry: ${(invWeight / 1000).toFixed(1)}/${(totalCap / 1000).toFixed(0)}kg`,
    ),
  );

  screen.appendChild(footer);

  // ── Apply initial tab state ────────────────────────────────
  updateTabs();

  // ── Keyboard handler ───────────────────────────────────────
  const keyHandler = (e: KeyboardEvent) => {
    if (e.code === "Escape" || e.code === "KeyI") {
      e.preventDefault();
      cleanup();
      onClose();
      return;
    }

    const sorted = getSortedInventory();
    const stacked = stackItems(sorted);
    if (stacked.length === 0) return;

    if (e.code === "ArrowUp") {
      e.preventDefault();
      selectedIdx = Math.max(0, selectedIdx - 1);
      refreshSelection();
      return;
    }
    if (e.code === "ArrowDown") {
      e.preventDefault();
      selectedIdx = Math.min(stacked.length - 1, selectedIdx + 1);
      refreshSelection();
      return;
    }

    const item = stacked[selectedIdx]?.item;
    if (!item) return;

    if (e.code === "KeyE") {
      const tpl = ITEM_BY_ID[item.templateId];
      if (tpl?.equipSlot) {
        e.preventDefault();
        dispatchEquip(item);
      }
      return;
    }
    if (e.code === "KeyU") {
      if (item.category === "potion" || item.category === "spellbook") {
        e.preventDefault();
        onAction({ type: "useItem", itemId: item.id });
      }
      return;
    }
    if (e.code === "KeyD") {
      e.preventDefault();
      onAction({ type: "dropItem", itemId: item.id });
      return;
    }
  };

  document.addEventListener("keydown", keyHandler);
  const cleanup = () => {
    document.removeEventListener("keydown", keyHandler);
    hideItemTooltip();
    closeDrawer();
  };
  // Auto-open drawer for a specific item (used after re-render to keep drawer open)
  if (openDrawerForId) {
    const sorted = getSortedInventory();
    const stacks = stackItems(sorted);
    for (let i = 0; i < stacks.length; i++) {
      const { item, count } = stacks[i];
      if (item.id === openDrawerForId) {
        const tpl = ITEM_BY_ID[item.templateId];
        const equipSlot = tpl?.equipSlot;
        let equippedInSlot = equipSlot ? h.equipment[equipSlot] : null;
        if (equipSlot === "ringLeft" && !equippedInSlot)
          equippedInSlot = h.equipment.ringRight;
        selectedIdx = i;
        refreshSelection();
        openDrawer(item, tpl, equippedInSlot, count);
        break;
      }
    }
  }

  const result = screen as HTMLElement & {
    cleanup: () => void;
    getSelectedIdx: () => number;
    getScrollTop: () => number;
    getItemsOnlyMode: () => boolean;
  };
  result.cleanup = cleanup;
  result.getSelectedIdx = () => selectedIdx;
  result.getScrollTop = () => screen.scrollTop;
  result.getItemsOnlyMode = () => activeTab === "inventory";
  return result;
}
