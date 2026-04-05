import type { GameState } from "../../core/types";
import { createPanel, createButton, el } from "../Theme";
import {
  STATUE_UPGRADES,
  STATUE_CATEGORIES,
  calcEssence,
  hasRunesInSockets,
  sacrificeItem,
  upgradeCost,
  purchaseUpgrade,
} from "../../systems/town/Statue";
import { trackSacrifice } from "../../systems/Achievements";
import {
  getDisplaySprite,
  getItemGlow,
  itemNameColor,
  getDisplayName,
} from "../../systems/inventory/display-name";
import { attachItemTooltip } from "../item-tooltip";

function greyBtn(btn: HTMLButtonElement, disabled: boolean): void {
  btn.disabled = disabled;
  btn.style.opacity = disabled ? "0.4" : "1";
  btn.style.cursor = disabled ? "not-allowed" : "pointer";
}

let statueTab: "sacrifice" | "upgrades" = "sacrifice";

function buildStatueSacrifice(
  panel: HTMLElement,
  state: GameState,
  onUpdate: (s: GameState) => void,
): void {
  panel.appendChild(
    el(
      "div",
      {
        color: "#4f8",
        fontSize: "12px",
        marginBottom: "8px",
        fontStyle: "italic",
      },
      "Offer items to the Statue and receive Essence in return.",
    ),
  );

  const items = state.hero.inventory.filter(
    (i) =>
      i.category !== "currency" &&
      i.category !== "potion" &&
      i.category !== "spellbook",
  );

  if (items.length === 0) {
    panel.appendChild(
      el(
        "div",
        { color: "#555", padding: "12px", textAlign: "center" },
        "No sacrificeable items in inventory.",
      ),
    );
    return;
  }

  const list = el("div", {
    maxHeight: "clamp(200px, 50vh, 400px)",
    overflowY: "auto",
  });
  list.setAttribute("data-service-list", "1");

  for (const item of items) {
    const ess = calcEssence(item);
    const hasRunes = hasRunesInSockets(item);

    const row = el("div", {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "4px 6px",
      cursor: "pointer",
      borderRadius: "4px",
    });
    row.addEventListener("mouseenter", () => {
      row.style.background = "#1a1a1a";
    });
    row.addEventListener("mouseleave", () => {
      row.style.background = "";
    });

    // Sprite
    const spriteWrap = el("div", {
      width: "32px",
      height: "32px",
      flexShrink: "0",
    });
    spriteWrap.className = getDisplaySprite(item);
    const glow = getItemGlow(item);
    if (glow) spriteWrap.style.filter = glow;
    row.appendChild(spriteWrap);

    // Name + essence value
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
      el("div", { color: "#4f8", fontSize: "11px" }, `\u2726 ${ess} Essence`),
    );
    row.appendChild(info);

    // Sacrifice button
    const sacBtn = createButton(`\u2726${ess}`);
    sacBtn.style.cssText += "min-width:50px;";
    sacBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (hasRunes) {
        if (
          !confirm(
            "The runes inscribed here will shatter upon sacrifice. Proceed?",
          )
        )
          return;
      }
      const next = sacrificeItem(state, item.id);
      trackSacrifice();
      onUpdate(next);
    });
    row.appendChild(sacBtn);

    // Tooltip
    attachItemTooltip(row, item);
    list.appendChild(row);
  }

  panel.appendChild(list);
}

function buildStatueUpgrades(
  panel: HTMLElement,
  state: GameState,
  onUpdate: (s: GameState) => void,
): void {
  panel.appendChild(
    el(
      "div",
      {
        color: "#4f8",
        fontSize: "12px",
        marginBottom: "8px",
        fontStyle: "italic",
      },
      "Spend Essence on permanent upgrades that persist through death and New Game+.",
    ),
  );

  const list = el("div", {
    maxHeight: "clamp(200px, 50vh, 400px)",
    overflowY: "auto",
  });
  list.setAttribute("data-service-list", "1");

  for (const cat of STATUE_CATEGORIES) {
    // Category header
    list.appendChild(
      el(
        "div",
        {
          color: "#c90",
          fontSize: "13px",
          fontWeight: "bold",
          borderBottom: "1px solid #444",
          paddingBottom: "3px",
          marginTop: "10px",
          marginBottom: "6px",
        },
        cat,
      ),
    );

    const upgrades = STATUE_UPGRADES.filter((u) => u.category === cat);
    for (const upg of upgrades) {
      const count = state.statueUpgrades[upg.id] ?? 0;
      const cost = upgradeCost(count);
      const canAfford = state.hero.essence >= cost;

      const row = el("div", {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "3px 6px",
        borderRadius: "4px",
      });

      // Name + level
      const info = el("div", { flex: "1", minWidth: "0" });
      info.appendChild(
        el(
          "div",
          {
            color: "#ccc",
            fontSize: "13px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          },
          upg.name,
        ),
      );
      const detailStr =
        count > 0
          ? `Level ${count} (${upg.perPurchase}/lv) — Next: \u2726${cost}`
          : `${upg.perPurchase}/lv — Cost: \u2726${cost}`;
      info.appendChild(
        el("div", { color: "#888", fontSize: "11px" }, detailStr),
      );
      row.appendChild(info);

      // Buy button
      const buyBtn = createButton(`\u2726${cost}`, "sm");
      buyBtn.style.cssText += "min-width:50px;";
      greyBtn(buyBtn, !canAfford);
      if (canAfford) {
        buyBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const next = purchaseUpgrade(state, upg.id);
          onUpdate(next);
        });
      }
      row.appendChild(buyBtn);

      list.appendChild(row);
    }
  }

  panel.appendChild(list);
}

export function buildStatue(
  state: GameState,
  onUpdate: (s: GameState) => void,
): HTMLElement {
  const panel = createPanel();

  // Tab bar (matches inventory style)
  const tabBar = el("div", {
    display: "flex",
    borderBottom: "2px solid #333",
    marginBottom: "8px",
    gap: "0",
  });
  const makeTab = (label: string) =>
    el("div", {
      padding: "8px 20px",
      fontSize: "13px",
      cursor: "pointer",
      whiteSpace: "nowrap",
      userSelect: "none",
      transition: "color 0.15s",
    }, label);
  const sacTab = makeTab("Sacrifice");
  const upgTab = makeTab("Upgrades");

  function updateTabs(): void {
    const isSac = statueTab === "sacrifice";
    sacTab.style.color = isSac ? "#c9a84c" : "#555";
    sacTab.style.borderBottom = isSac ? "2px solid #c9a84c" : "2px solid transparent";
    sacTab.style.marginBottom = isSac ? "-2px" : "";
    upgTab.style.color = !isSac ? "#c9a84c" : "#555";
    upgTab.style.borderBottom = !isSac ? "2px solid #c9a84c" : "2px solid transparent";
    upgTab.style.marginBottom = !isSac ? "-2px" : "";
  }

  sacTab.addEventListener("click", () => { statueTab = "sacrifice"; onUpdate(state); });
  upgTab.addEventListener("click", () => { statueTab = "upgrades"; onUpdate(state); });
  tabBar.appendChild(sacTab);
  tabBar.appendChild(upgTab);
  updateTabs();
  panel.appendChild(tabBar);

  if (statueTab === "sacrifice") {
    buildStatueSacrifice(panel, state, onUpdate);
  } else {
    buildStatueUpgrades(panel, state, onUpdate);
  }

  return panel;
}
