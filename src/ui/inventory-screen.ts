import type { GameState, GameAction, EquipSlot, Item } from "../core/types";
import { ITEM_BY_ID } from "../data/items";
import {
  getDisplayName,
  getDisplaySprite,
  getItemGlow,
  itemNameColor,
} from "../systems/inventory/display-name";
import { attachItemTooltip, hideItemTooltip, buildTooltipContent, setTooltipKnownSpells } from "./item-tooltip";
import { createScreen, createPanel, createTitleBar, createButton, el } from "./Theme";

function sectionHeader(text: string): HTMLElement {
  return el(
    "div",
    {
      fontSize: "14px",
      fontWeight: "bold",
      color: "#c90",
      borderBottom: "1px solid #444",
      paddingBottom: "4px",
      marginBottom: "8px",
    },
    text,
  );
}


function itemDisplayLabel(item: Item): string {
  const name = getDisplayName(item);
  if (!item.identified) return `${name} (unidentified)`;
  return name;
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

// Paperdoll slot positions (x, y offsets within the 240x480 image)
// Mapped from the guide lines in equipment-dude.png
const SLOT_POSITIONS: Record<string, { x: number; y: number }> = {
  helmet: { x: 104, y: 2 },
  amulet: { x: 104, y: 78 },
  cloak: { x: 30, y: 55 },
  body: { x: 104, y: 130 },
  weapon: { x: 2, y: 170 },
  shield: { x: 206, y: 170 },
  gauntlets: { x: 4, y: 258 },
  belt: { x: 104, y: 228 },
  ringLeft: { x: 36, y: 290 },
  ringRight: { x: 172, y: 290 },
  boots: { x: 104, y: 420 },
  pack: { x: 190, y: 100 },
  purse: { x: 190, y: 258 },
};

const SLOT_LABELS: Record<string, string> = {
  weapon: "Weapon",
  shield: "Shield",
  helmet: "Helmet",
  body: "Body",
  cloak: "Cloak",
  gauntlets: "Gloves",
  belt: "Belt",
  boots: "Boots",
  ringLeft: "Ring L",
  ringRight: "Ring R",
  amulet: "Amulet",
  pack: "Pack",
  purse: "Purse",
};

function createEquipSlot(
  slotKey: EquipSlot,
  item: Item | null,
  onUnequip: () => void,
): HTMLElement {
  const pos = SLOT_POSITIONS[slotKey] ?? { x: 0, y: 0 };

  const container = el("div", {
    position: "absolute",
    left: `${pos.x}px`,
    top: `${pos.y}px`,
    width: "32px",
    height: "32px",
    cursor: item ? "pointer" : "default",
    border: item ? "1px solid #555" : "1px solid #333",
    background: "rgba(80,80,80,0.5)",
    borderRadius: "2px",
    boxSizing: "border-box",
  });

  if (item) {
    const sprite = el("div", {
      width: "32px",
      height: "32px",
      position: "absolute",
      top: "0",
      left: "0",
    });
    sprite.className = getDisplaySprite(item);
    const eqGlow = getItemGlow(item);
    if (eqGlow) sprite.style.filter = eqGlow;
    container.appendChild(sprite);
    container.addEventListener("click", onUnequip);
    container.addEventListener("mouseenter", () => {
      container.style.borderColor = "#c90";
    });
    container.addEventListener("mouseleave", () => {
      container.style.borderColor = "#555";
    });
    container.style.pointerEvents = "auto";
    attachItemTooltip(container, item);
  } else {
    container.title = `${SLOT_LABELS[slotKey]}: empty`;
    container.style.opacity = "0.7";
  }

  return container;
}

export function createInventoryScreen(
  state: GameState,
  onAction: (action: GameAction) => void,
  onClose: () => void,
  initialSelectedIdx: number = 0,
): HTMLElement & { cleanup: () => void; getSelectedIdx: () => number; getScrollTop: () => number } {
  const h = state.hero;
  setTooltipKnownSpells(h.knownSpells);
  const isMobileView = window.innerWidth <= 768;
  let selectedIdx = Math.min(initialSelectedIdx, Math.max(0, h.inventory.length - 1));

  const screen = createScreen();
  screen.classList.add("screen-scrollable");

  // ── Title bar with items-only toggle ────────────────────────
  let itemsOnlyMode = false;
  const titleBar = createTitleBar("Equipment", () => { cleanup(); onClose(); });
  const toggleViewBtn = createButton("Items", "sm");
  toggleViewBtn.style.cssText += "margin-left:auto;margin-right:8px;padding:4px 10px;font-size:12px;";
  titleBar.insertBefore(toggleViewBtn, titleBar.lastChild);
  screen.appendChild(titleBar);

  // ── Equipment panel: paperdoll + slot legend ─────────────────
  const isMobile = window.innerWidth <= 480;
  const equipPanel = createPanel();
  equipPanel.style.display = "flex";
  equipPanel.style.gap = isMobile ? "8px" : "12px";
  equipPanel.style.padding = "8px";
  equipPanel.style.flexWrap = isMobile ? "nowrap" : "wrap";

  // Left: paperdoll with overlaid equipment slots (fixed dims for positioning)
  const dollScale = isMobile ? 0.45 : 1;
  const dollW = Math.round(240 * dollScale);
  const dollH = Math.round(480 * dollScale);
  const dollWrapper = el("div", {
    position: "relative",
    width: `${dollW}px`,
    height: `${dollH}px`,
    flexShrink: "0",
    overflow: "hidden",
    background: "#fff",
    boxSizing: "border-box",
  });
  const dollBg = el("div", {
    width: "100%",
    height: "100%",
    backgroundSize: "contain",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  });
  dollBg.className = "equipment-dude";
  // Wrap paperdoll + slots in a scalable inner container
  const dollInner = el("div", {
    position: "relative",
    width: "240px",
    height: "480px",
    transformOrigin: "top left",
    transform: dollScale < 1 ? `scale(${dollScale})` : "",
  });
  dollInner.appendChild(dollBg);
  dollWrapper.appendChild(dollInner);

  // Overlay each slot at its position on the paperdoll
  const slotKeys: EquipSlot[] = [
    "helmet",
    "amulet",
    "cloak",
    "body",
    "weapon",
    "shield",
    "gauntlets",
    "belt",
    "ringLeft",
    "ringRight",
    "boots",
    "pack",
    "purse",
  ];

  for (const slotKey of slotKeys) {
    const item = h.equipment[slotKey];
    const slotEl = createEquipSlot(slotKey, item, () =>
      onAction({ type: "unequipItem", slot: slotKey }),
    );
    dollInner.appendChild(slotEl);
  }

  equipPanel.appendChild(dollWrapper);

  // Right: slot legend list (shows names for quick reference)
  const legend = el("div", {
    flex: "1",
    padding: "4px 0",
    overflowY: "auto",
  });
  legend.appendChild(sectionHeader("Equipped Items"));

  for (const slotKey of slotKeys) {
    const item = h.equipment[slotKey];
    const row = el("div", {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      marginBottom: "3px",
      padding: "2px 4px",
      fontSize: "12px",
      cursor: item ? "pointer" : "default",
      borderRadius: "2px",
    });

    const label = SLOT_LABELS[slotKey] || slotKey;
    row.appendChild(
      el("span", { color: "#666", width: "65px", flexShrink: "0" }, label),
    );

    if (item) {
      const nameSpan = el(
        "span",
        { color: itemNameColor(item) },
        itemDisplayLabel(item),
      );
      row.appendChild(nameSpan);

      if (item.properties["ac"]) {
        row.appendChild(
          el(
            "span",
            { color: "#586", fontSize: "11px", marginLeft: "4px" },
            `AC+${item.properties["ac"] + item.enchantment}`,
          ),
        );
      }
      if (item.properties["damageMin"] !== undefined) {
        const dmg = `${item.properties["damageMin"]}-${item.properties["damageMax"]}`;
        row.appendChild(
          el(
            "span",
            { color: "#865", fontSize: "11px", marginLeft: "4px" },
            dmg,
          ),
        );
      }

      if (isMobileView) {
        row.addEventListener("click", () => openEquippedDrawer(item, slotKey));
      } else {
        row.addEventListener("click", () =>
          onAction({ type: "unequipItem", slot: slotKey }),
        );
        row.addEventListener("mouseenter", () => { row.style.background = "#1a1a1a"; });
        row.addEventListener("mouseleave", () => { row.style.background = ""; });
        attachItemTooltip(row, item);
      }
    } else {
      row.appendChild(el("span", { color: "#333", fontStyle: "italic" }, "—"));
    }

    legend.appendChild(row);
  }

  equipPanel.appendChild(legend);
  screen.appendChild(equipPanel);

  // ── Inventory panel ────────────────────────────────────────
  const invPanel = createPanel("Inventory");
  invPanel.setAttribute('data-inv-panel', '1');
  invPanel.style.maxHeight = "clamp(200px, 40vh, 300px)";
  invPanel.style.overflowY = "auto";

  // Sort controls
  type SortMode = "newest" | "oldest" | "identified" | "unidentified" | "type";
  let sortMode: SortMode = (localStorage.getItem("rd-inv-sort") as SortMode) || "newest";

  const sortBar = el("div", {
    display: "flex",
    gap: "4px",
    marginBottom: "6px",
    flexWrap: "wrap",
  });
  const sortModes: [SortMode, string][] = [
    ["newest", "Newest"],
    ["oldest", "Oldest"],
    ["identified", "Identified"],
    ["unidentified", "Unidentified"],
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

  interface ItemStack { item: Item; count: number; }

  const NO_STACK_SLOTS = new Set(['weapon', 'shield', 'helmet', 'body', 'cloak', 'gauntlets', 'belt', 'boots']);
  function stackItems(items: Item[]): ItemStack[] {
    const stacks: ItemStack[] = [];
    const map = new Map<string, ItemStack>();
    for (const item of items) {
      // Weapons and armor never stack (unique affixes make each different)
      const tplS = ITEM_BY_ID[item.templateId];
      if (tplS?.equipSlot && NO_STACK_SLOTS.has(tplS.equipSlot)) {
        stacks.push({ item, count: 1 });
        continue;
      }
      const key = `${item.templateId}|${item.enchantment}|${item.identified}|${item.cursed}`;
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
      case "identified":
        return inv.sort((a, b) =>
          a.identified === b.identified ? 0 : a.identified ? -1 : 1,
        );
      case "unidentified":
        return inv.sort((a, b) =>
          a.identified === b.identified ? a.name.localeCompare(b.name) : a.identified ? 1 : -1,
        );
      case "type":
        return inv.sort((a, b) => a.category.localeCompare(b.category));
      default:
        return inv;
    }
  }

  let invRows: HTMLElement[] = [];

  // ── Detail drawer (mobile) ──────────────────────────────
  let drawerEl: HTMLElement | null = null;

  const closeDrawer = () => {
    if (drawerEl) { drawerEl.remove(); drawerEl = null; }
  };

  const openDrawer = (item: Item, tpl: any, equippedInSlot: Item | null) => {
    closeDrawer();
    drawerEl = el("div", {
      position: "fixed", bottom: "0", left: "0", right: "0", zIndex: "2000",
      background: "#1a1a1a", borderTop: "2px solid #555",
      padding: "12px 16px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
      maxHeight: "60vh", overflowY: "auto",
      boxShadow: "0 -4px 16px rgba(0,0,0,0.8)",
    });

    // Item tooltip content
    drawerEl.appendChild(buildTooltipContent(item));

    // Compare section
    if (equippedInSlot && tpl?.equipSlot) {
      const divider = el("div", { height: "1px", background: "#444", margin: "8px 0" });
      drawerEl.appendChild(divider);
      const compareLabel = el("div", {
        color: "#886", fontSize: "11px", fontWeight: "bold", marginBottom: "4px",
      }, "CURRENTLY EQUIPPED");
      drawerEl.appendChild(compareLabel);
      drawerEl.appendChild(buildTooltipContent(equippedInSlot));
    }

    // Action buttons
    const btnRow = el("div", {
      display: "flex", gap: "8px", marginTop: "10px", justifyContent: "center", flexWrap: "wrap",
    });
    const drawerBtn = (label: string, onClick: () => void) => {
      const b = createButton(label);
      b.style.cssText += "min-width:80px;padding:8px 16px;font-size:14px;";
      b.addEventListener("click", (e) => { e.stopPropagation(); closeDrawer(); onClick(); });
      return b;
    };
    if (tpl?.equipSlot) {
      btnRow.appendChild(drawerBtn("Equip", () => onAction({ type: "equipItem", itemId: item.id })));
    }
    if (["potion", "scroll", "spellbook", "wand"].includes(item.category)) {
      btnRow.appendChild(drawerBtn("Use", () => onAction({ type: "useItem", itemId: item.id })));
    }
    btnRow.appendChild(drawerBtn("Drop", () => onAction({ type: "dropItem", itemId: item.id })));
    btnRow.appendChild(drawerBtn("Close", () => closeDrawer()));
    drawerEl.appendChild(btnRow);

    document.body.appendChild(drawerEl);
  };

  const openEquippedDrawer = (item: Item, slotKey: EquipSlot) => {
    closeDrawer();
    drawerEl = el("div", {
      position: "fixed", bottom: "0", left: "0", right: "0", zIndex: "2000",
      background: "#1a1a1a", borderTop: "2px solid #555",
      padding: "12px 16px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
      maxHeight: "60vh", overflowY: "auto",
      boxShadow: "0 -4px 16px rgba(0,0,0,0.8)",
    });
    drawerEl.appendChild(buildTooltipContent(item));
    const btnRow = el("div", {
      display: "flex", gap: "8px", marginTop: "10px", justifyContent: "center", flexWrap: "wrap",
    });
    const drawerBtn = (label: string, onClick: () => void) => {
      const b = createButton(label);
      b.style.cssText += "min-width:80px;padding:8px 16px;font-size:14px;";
      b.addEventListener("click", (e) => { e.stopPropagation(); closeDrawer(); onClick(); });
      return b;
    };
    btnRow.appendChild(drawerBtn("Unequip", () => onAction({ type: "unequipItem", slot: slotKey })));
    btnRow.appendChild(drawerBtn("Close", () => closeDrawer()));
    drawerEl.appendChild(btnRow);
    document.body.appendChild(drawerEl);
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
      const spriteDiv = el("div", {
        width: "32px",
        height: "32px",
      });
      spriteDiv.className = getDisplaySprite(item) + " inventory-item";
      const invGlow = getItemGlow(item);
      if (invGlow) spriteDiv.style.filter = invGlow;
      spriteWrap.appendChild(spriteDiv);
      if (count > 1) {
        const badge = el("span", {
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
        }, `${count}`);
        spriteWrap.appendChild(badge);
      }
      row.appendChild(spriteWrap);

      // Name
      const label = count > 1 ? `${itemDisplayLabel(item)} (x${count})` : itemDisplayLabel(item);
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
      if (equipSlot === 'ringLeft' && !equippedInSlot) equippedInSlot = h.equipment.ringRight;

      if (!isMobileView) {
        // Desktop: inline action buttons + tooltip
        const actions = el("div", { display: "flex", gap: "4px", marginLeft: "8px" });
        if (tpl?.equipSlot) {
          actions.appendChild(btn("[E]", () => onAction({ type: "equipItem", itemId: item.id })));
        }
        if (["potion", "scroll", "spellbook", "wand"].includes(item.category)) {
          actions.appendChild(btn("[U]", () => onAction({ type: "useItem", itemId: item.id })));
        }
        actions.appendChild(btn("[D]", () => onAction({ type: "dropItem", itemId: item.id })));
        row.appendChild(actions);
        row.addEventListener("click", () => { selectedIdx = i; refreshSelection(); });
        attachItemTooltip(row, item, equippedInSlot);
      } else {
        // Mobile: tap row to open detail drawer
        row.addEventListener("click", () => {
          selectedIdx = i;
          refreshSelection();
          openDrawer(item, tpl, equippedInSlot);
        });
      }

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
  screen.appendChild(invPanel);

  // ── Footer ────────────────────────────────────────────────
  const allItems: Item[] = [
    ...h.inventory,
    ...Object.values(h.equipment).filter((v): v is Item => v !== null),
  ];
  const totalWeight = allItems.reduce((sum, it) => sum + it.weight, 0) / 1000;

  const footer = el("div", { width: "100%" });
  footer.className = "footer";
  footer.appendChild(
    el("span", undefined, `Weight: ${totalWeight.toFixed(1)} kg`),
  );
  footer.appendChild(el("span", undefined, `Gold: ${h.copper}`));
  footer.appendChild(el("span", undefined, `Items: ${h.inventory.length}`));

  // Show carry capacity (base 10kg + pack bonus + enchantment)
  const BASE_CARRY = 10000;
  const pack = h.equipment.pack;
  const packTpl = pack ? ITEM_BY_ID[pack.templateId] : null;
  const basePackWeight = packTpl?.weightCapacity ?? 0;
  const packEnchBonus = pack ? pack.enchantment * 5000 : 0;
  let totalCap = BASE_CARRY + Math.max(0, basePackWeight + packEnchBonus);
  for (const eq of Object.values(h.equipment)) {
    if (eq && ITEM_BY_ID[eq.templateId]?.uniqueAbility === 'titan-power') { totalCap *= 2; break; }
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

  // ── Items-only toggle ──────────────────────────────────────
  toggleViewBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    itemsOnlyMode = !itemsOnlyMode;
    toggleViewBtn.textContent = itemsOnlyMode ? "Equip" : "Items";
    equipPanel.style.display = itemsOnlyMode ? "none" : (isMobile ? "flex" : "flex");
    footer.style.display = itemsOnlyMode ? "none" : "";
    invPanel.style.maxHeight = itemsOnlyMode ? "none" : "clamp(200px, 40vh, 300px)";
  });

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
        onAction({ type: "equipItem", itemId: item.id });
      }
      return;
    }
    if (e.code === "KeyU") {
      if (
        item.category === "potion" ||
        item.category === "scroll" ||
        item.category === "spellbook" ||
        item.category === "wand"
      ) {
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
  const result = screen as HTMLElement & { cleanup: () => void; getSelectedIdx: () => number; getScrollTop: () => number };
  result.cleanup = cleanup;
  result.getSelectedIdx = () => selectedIdx;
  result.getScrollTop = () => invPanel.scrollTop;
  return result;
}
