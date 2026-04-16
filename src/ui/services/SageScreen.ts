import type { GameState } from "../../core/types";
import {
  createPanel,
  createButton,
  el,
  greyBtn,
  SERVICE_SLOT_LABELS,
  EQUIP_SLOT_ORDER,
} from "../Theme";
import { sageEnchantItem, getEnchanterCap } from "../../systems/town/Services";
import {
  getDisplaySprite,
  getItemGlow,
  itemNameColor,
  getDisplayName,
} from "../../systems/inventory/display-name";
import { buildTooltipContent } from "../item-tooltip";

let sageDrawer: HTMLElement | null = null;
function closeSageDrawer(): void {
  if (sageDrawer) {
    sageDrawer.remove();
    sageDrawer = null;
  }
}

export { closeSageDrawer };

export function buildSage(
  state: GameState,
  onUpdate: (s: GameState) => void,
): HTMLElement {
  const panel = createPanel();
  const cap = getEnchanterCap(state.ngPlusCount ?? 0);

  panel.appendChild(
    el(
      "div",
      { color: "#888", fontSize: "11px", marginBottom: "6px" },
      `Enhance equipment by +1 for 100g. (Limit: +${cap} per item)`,
    ),
  );

  const list = el("div", {
    maxHeight: "clamp(240px, 62vh, 560px)",
    overflowY: "auto",
  });
  list.setAttribute("data-service-list", "1");

  for (const slotKey of EQUIP_SLOT_ORDER) {
    const item = state.hero.equipment[slotKey];
    const ups = item ? (item.properties["enchanterUps"] ?? 0) : 0;
    const atCap = item ? ups >= cap : true;
    const canAfford = item && !item.cursed && state.hero.gold >= 100 && !atCap;

    const row = el("div", {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "4px 6px",
      cursor: item && !item.cursed ? "pointer" : "default",
      borderRadius: "4px",
    });
    if (item && !item.cursed) {
      row.addEventListener("mouseenter", () => {
        row.style.background = "#1a1a1a";
      });
      row.addEventListener("mouseleave", () => {
        row.style.background = "";
      });
    }

    // Sprite
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

    // Slot label
    row.appendChild(
      el(
        "span",
        { color: "#666", width: "50px", flexShrink: "0", fontSize: "11px" },
        SERVICE_SLOT_LABELS[slotKey] ?? slotKey,
      ),
    );

    if (item && !item.cursed) {
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
          atCap ? `Enchanted +${ups}/${cap} (MAX)` : `Enchanted +${ups}/${cap}`,
        ),
      );
      row.appendChild(info);

      // Enchant button
      const enchBtn = createButton(atCap ? "MAX" : "+1", "sm");
      greyBtn(enchBtn, !canAfford);
      if (canAfford) {
        enchBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          onUpdate(sageEnchantItem(state, item.id));
        });
      }
      row.appendChild(enchBtn);

      // Click row opens drawer
      row.addEventListener("click", () => {
        closeSageDrawer();
        sageDrawer = el("div", {
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
        const sageScroll = el("div", {
          overflowY: "auto",
          padding: "12px 16px 8px",
          maxWidth: "480px",
          margin: "0 auto",
        });
        sageScroll.appendChild(buildTooltipContent(item));
        sageScroll.appendChild(
          el(
            "div",
            {
              color: "#c9a84c",
              fontSize: "14px",
              marginTop: "6px",
              textAlign: "center",
              fontWeight: "bold",
            },
            `Enchanted +${ups}/${cap} \u00B7 Cost: 100g`,
          ),
        );
        sageDrawer!.appendChild(sageScroll);

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
        if (!atCap) {
          const drawerEnchBtn = createButton("Enchant +1");
          drawerEnchBtn.style.cssText +=
            "min-width:80px;padding:8px 16px;font-size:14px;";
          greyBtn(drawerEnchBtn, state.hero.gold < 100);
          if (state.hero.gold >= 100) {
            drawerEnchBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              closeSageDrawer();
              onUpdate(sageEnchantItem(state, item.id));
            });
          }
          btnRow.appendChild(drawerEnchBtn);
        }
        const closeBtn = createButton("Close");
        closeBtn.style.cssText +=
          "min-width:80px;padding:8px 16px;font-size:14px;";
        closeBtn.addEventListener("click", closeSageDrawer);
        btnRow.appendChild(closeBtn);

        sageDrawer!.appendChild(btnRow);
        document.body.appendChild(sageDrawer!);
      });
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
