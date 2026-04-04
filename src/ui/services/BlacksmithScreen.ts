import type { GameState, Item, EquipSlot } from "../../core/types";
import { createPanel, createButton, el } from "../Theme";
import {
  getBlacksmithCost,
  getBlacksmithCap,
  rollBlacksmithOptions,
  blacksmithApplyAffix,
  blacksmithCharge,
} from "../../systems/town/Services";
import { AFFIX_BY_ID, formatAffixDesc } from "../../data/Enchantments";
import {
  getDisplaySprite,
  getItemGlow,
  itemNameColor,
  getDisplayName,
} from "../../systems/inventory/display-name";
import { buildTooltipContent } from "../item-tooltip";

const SLOT_LABELS: Record<string, string> = {
  weapon: "Weapon",
  shield: "Shield",
  helmet: "Head",
  body: "Body",
  cloak: "Cloak",
  gauntlets: "Hands",
  belt: "Belt",
  boots: "Feet",
  ringLeft: "Ring L",
  ringRight: "Ring R",
  amulet: "Amulet",
  pack: "Pack",
};

function greyBtn(btn: HTMLButtonElement, disabled: boolean): void {
  btn.disabled = disabled;
  btn.style.opacity = disabled ? "0.4" : "1";
  btn.style.cursor = disabled ? "not-allowed" : "pointer";
}

let bsDrawer: HTMLElement | null = null;
function closeBsDrawer(): void {
  if (bsDrawer) {
    bsDrawer.remove();
    bsDrawer = null;
  }
}

function openBsDrawer(
  state: GameState,
  item: Item,
  mode: "add" | "reroll",
  ngPlus: number,
  cap: number,
  onUpdate: (s: GameState) => void,
): void {
  closeBsDrawer();
  const cost = getBlacksmithCost(item);
  const affixCount = item.specialEnchantments?.length ?? 0;
  const canAfford = state.hero.gold >= cost;

  bsDrawer = el("div", {
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

  const bsScroll = el("div", { overflowY: "auto", padding: "12px 16px 8px" });
  bsScroll.appendChild(buildTooltipContent(item));
  bsScroll.appendChild(
    el(
      "div",
      {
        color: "#c9a84c",
        fontSize: "14px",
        marginTop: "6px",
        textAlign: "center",
        fontWeight: "bold",
      },
      `Affixes: ${affixCount}/${cap} \u00B7 Cost: ${cost}g`,
    ),
  );
  bsDrawer.appendChild(bsScroll);

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

  if (mode === "add" && affixCount < cap) {
    const addBtn = createButton("Add Affix");
    addBtn.style.cssText += "min-width:80px;padding:8px 16px;font-size:14px;";
    greyBtn(addBtn, !canAfford);
    if (canAfford) {
      addBtn.addEventListener("click", () => {
        const charged = blacksmithCharge(state, item.id);
        if (!charged) return;
        closeBsDrawer();
        const options = rollBlacksmithOptions(item, ngPlus);
        showAffixPicker(charged, item, options, undefined, "add", onUpdate);
      });
    }
    btnRow.appendChild(addBtn);
  }

  if (affixCount > 0) {
    const rerollBtn = createButton("Reroll Affix");
    rerollBtn.style.cssText +=
      "min-width:80px;padding:8px 16px;font-size:14px;";
    greyBtn(rerollBtn, !canAfford);
    if (canAfford) {
      rerollBtn.addEventListener("click", () => {
        closeBsDrawer();
        showAffixSelect(state, item, ngPlus, onUpdate);
      });
    }
    btnRow.appendChild(rerollBtn);
  }

  const closeBtn = createButton("Close");
  closeBtn.style.cssText += "min-width:80px;padding:8px 16px;font-size:14px;";
  closeBtn.addEventListener("click", closeBsDrawer);
  btnRow.appendChild(closeBtn);

  bsDrawer.appendChild(btnRow);
  document.body.appendChild(bsDrawer);
}

function showAffixSelect(
  state: GameState,
  item: Item,
  ngPlus: number,
  onUpdate: (s: GameState) => void,
): void {
  const enchants = item.specialEnchantments ?? [];
  const overlay = el("div", {
    position: "fixed",
    inset: "0",
    zIndex: "300",
    background: "rgba(0,0,0,0.9)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "20px",
  });

  overlay.appendChild(
    el(
      "div",
      { color: "#c9a84c", fontSize: "16px", fontWeight: "bold" },
      "Select affix to replace",
    ),
  );

  for (let i = 0; i < enchants.length; i++) {
    const raw = enchants[i];
    const isCrit = raw.endsWith(":critical");
    const id = isCrit ? raw.replace(":critical", "") : raw;
    const aff = AFFIX_BY_ID[id];
    if (!aff) continue;
    const desc = formatAffixDesc(id, item.enchantment, isCrit);
    const prefix = isCrit ? "\u2605\u2605" : "\u2605";

    const btn = createButton(`${prefix} ${aff.name}: ${desc}`);
    Object.assign(btn.style, {
      display: "block",
      width: "100%",
      maxWidth: "320px",
      textAlign: "left",
      fontSize: "12px",
      color: aff.color,
    });
    btn.addEventListener("click", () => {
      overlay.remove();
      const charged = blacksmithCharge(state, item.id);
      if (!charged) return;
      const options = rollBlacksmithOptions(item, ngPlus, [id]);
      showAffixPicker(charged, item, options, i, "reroll", onUpdate);
    });
    overlay.appendChild(btn);
  }

  const cancelBtn = createButton("Cancel");
  cancelBtn.addEventListener("click", () => overlay.remove());
  overlay.appendChild(cancelBtn);
  document.body.appendChild(overlay);
}

function showAffixPicker(
  state: GameState,
  item: Item,
  options: { id: string; critical: boolean }[],
  replaceIdx: number | undefined,
  _mode: "add" | "reroll",
  onUpdate: (s: GameState) => void,
): void {
  const overlay = el("div", {
    position: "fixed",
    inset: "0",
    zIndex: "300",
    background: "rgba(0,0,0,0.9)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "20px",
  });

  if (options.length === 0) {
    overlay.appendChild(
      el(
        "div",
        { color: "#f44", fontSize: "14px", fontWeight: "bold" },
        "No affixes available for this item.",
      ),
    );
    overlay.appendChild(
      el("div", { color: "#888", fontSize: "12px" }, "Gold has been spent."),
    );
    const okBtn = createButton("OK");
    okBtn.addEventListener("click", () => {
      overlay.remove();
      onUpdate(state);
    });
    overlay.appendChild(okBtn);
    document.body.appendChild(overlay);
    return;
  }

  const cost = getBlacksmithCost(item);
  const flavorBox = el("div", {
    maxWidth: "320px",
    textAlign: "center",
    marginBottom: "8px",
  });
  const line1 = el("div", {
    color: "#c9a84c",
    fontSize: "13px",
    fontStyle: "italic",
    marginBottom: "4px",
  });
  line1.append("The runes ignite, consuming ");
  line1.appendChild(
    el("span", { fontWeight: "bold", color: "#fc4" }, `${cost} gold`),
  );
  line1.append(" as the price of possibility.");
  flavorBox.appendChild(line1);
  flavorBox.appendChild(
    el(
      "div",
      { color: "#aaa", fontSize: "12px", marginBottom: "4px" },
      "Five enchantments emerge, choose one to bind.",
    ),
  );
  flavorBox.appendChild(
    el(
      "div",
      { color: "#666", fontSize: "11px" },
      "Refuse them, and your item remains unchanged, but the offering is lost.",
    ),
  );
  overlay.appendChild(flavorBox);

  for (const opt of options) {
    const aff = AFFIX_BY_ID[opt.id];
    if (!aff) continue;
    const desc = formatAffixDesc(opt.id, item.enchantment, opt.critical);
    const prefix = opt.critical ? "\u2605\u2605" : "\u2605";

    const btn = createButton(`${prefix} ${aff.name}: ${desc}`);
    Object.assign(btn.style, {
      display: "block",
      width: "100%",
      maxWidth: "320px",
      textAlign: "left",
      fontSize: "12px",
      color: aff.color,
    });
    btn.addEventListener("click", () => {
      overlay.remove();
      onUpdate(
        blacksmithApplyAffix(state, item.id, opt.id, opt.critical, replaceIdx),
      );
    });
    overlay.appendChild(btn);
  }

  const cancelBtn = createButton("Cancel");
  cancelBtn.addEventListener("click", () => {
    overlay.remove();
    onUpdate(state);
  });
  overlay.appendChild(cancelBtn);
  document.body.appendChild(overlay);
}

export { closeBsDrawer };

export function buildBlacksmith(
  state: GameState,
  onUpdate: (s: GameState) => void,
): HTMLElement {
  const panel = createPanel("Forge");
  const ngPlus = state.ngPlusCount ?? 0;
  const cap = getBlacksmithCap(ngPlus);

  panel.appendChild(
    el(
      "div",
      { color: "#888", fontSize: "11px", marginBottom: "6px" },
      `Add or reroll affixes. (Cap: ${cap} per item)`,
    ),
  );

  const slotOrder: EquipSlot[] = [
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
  ];

  const list = el("div", {
    maxHeight: "clamp(200px, 50vh, 400px)",
    overflowY: "auto",
  });
  list.setAttribute("data-service-list", "1");

  for (const slotKey of slotOrder) {
    const item = state.hero.equipment[slotKey];

    const row = el("div", {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "4px 6px",
      cursor: item ? "pointer" : "default",
      borderRadius: "4px",
    });
    if (item) {
      row.addEventListener("mouseenter", () => {
        row.style.background = "#1a1a1a";
      });
      row.addEventListener("mouseleave", () => {
        row.style.background = "";
      });
    }

    // Sprite
    const sprite = el("div", {
      width: "32px",
      height: "32px",
      flexShrink: "0",
    });
    if (item) {
      sprite.className = getDisplaySprite(item);
      const glow = getItemGlow(item);
      if (glow) sprite.style.filter = glow;
    }
    row.appendChild(sprite);

    // Slot label
    row.appendChild(
      el(
        "span",
        { color: "#666", width: "50px", flexShrink: "0", fontSize: "11px" },
        SLOT_LABELS[slotKey] ?? slotKey,
      ),
    );

    if (item && !item.cursed) {
      const cost = getBlacksmithCost(item);
      const affixCount = item.specialEnchantments?.length ?? 0;
      const atCap = affixCount >= cap;
      const canAfford = state.hero.gold >= cost;

      // Name + info
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
      info.appendChild(
        el(
          "div",
          { color: "#888", fontSize: "11px" },
          `${affixCount}/${cap} affixes \u00B7 ${cost}g`,
        ),
      );
      row.appendChild(info);

      // Buttons
      if (!atCap) {
        const addBtn = createButton("Add", "sm");
        greyBtn(addBtn, !canAfford);
        if (canAfford)
          addBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            openBsDrawer(state, item, "add", ngPlus, cap, onUpdate);
          });
        row.appendChild(addBtn);
      }
      if (affixCount > 0) {
        const rerollBtn = createButton("Reroll", "sm");
        greyBtn(rerollBtn, !canAfford);
        if (canAfford)
          rerollBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            openBsDrawer(state, item, "reroll", ngPlus, cap, onUpdate);
          });
        row.appendChild(rerollBtn);
      }

      row.addEventListener("click", () =>
        openBsDrawer(
          state,
          item,
          atCap ? "reroll" : "add",
          ngPlus,
          cap,
          onUpdate,
        ),
      );
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

    list.appendChild(row);
  }

  panel.appendChild(list);
  return panel;
}
