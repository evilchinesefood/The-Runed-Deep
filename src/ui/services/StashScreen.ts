import type { GameState, Item } from "../../core/types";
import { createPanel, createButton, el, greyBtn } from "../Theme";
import {
  getDisplaySprite,
  getItemGlow,
  itemNameColor,
  getDisplayName,
} from "../../systems/inventory/display-name";
import {
  buildTooltipContent,
  attachItemTooltip,
  hideItemTooltip,
} from "../item-tooltip";

const STASH_LIMIT = 50;
const isMobileStash = () => window.innerWidth <= 768;

let stashDrawerEl: HTMLElement | null = null;
function closeStashDrawer(): void {
  if (stashDrawerEl) {
    stashDrawerEl.remove();
    stashDrawerEl = null;
  }
}

function openStashDrawer(
  item: Item,
  actionLabel: string,
  onAction: () => void,
  disabled = false,
): void {
  closeStashDrawer();
  stashDrawerEl = el("div", {
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
  const stashScroll = el("div", {
    overflowY: "auto",
    padding: "12px 16px 8px",
  });
  stashScroll.appendChild(buildTooltipContent(item));
  stashDrawerEl.appendChild(stashScroll);
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
  const actionBtn = createButton(actionLabel, "primary");
  actionBtn.style.cssText += "min-width:80px;padding:8px 16px;font-size:14px;";
  if (disabled) {
    greyBtn(actionBtn, true);
  } else {
    actionBtn.addEventListener("click", () => {
      closeStashDrawer();
      onAction();
    });
  }
  const closeBtn = createButton("Close");
  closeBtn.style.cssText += "min-width:80px;padding:8px 16px;font-size:14px;";
  closeBtn.addEventListener("click", closeStashDrawer);
  btnRow.appendChild(actionBtn);
  btnRow.appendChild(closeBtn);
  stashDrawerEl.appendChild(btnRow);
  document.body.appendChild(stashDrawerEl);
}

function buildStashRow(
  item: Item,
  actionLabel: string,
  disabled: boolean,
  onAction: () => void,
  mobile: boolean,
): HTMLElement {
  const row = el("div", {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "4px 6px",
    cursor: mobile ? "pointer" : "default",
  });

  const glow = getItemGlow(item);
  const sprClass = getDisplaySprite(item);
  if (sprClass) {
    const img = el("div", {
      width: "32px",
      height: "32px",
      flexShrink: "0",
      position: "relative",
    });
    const spr = document.createElement("div");
    spr.style.cssText =
      "width:32px;height:32px;position:absolute;top:0;left:0;";
    spr.className = sprClass;
    if (glow) spr.style.filter = glow;
    img.appendChild(spr);
    row.appendChild(img);
  }

  const nameEl = el(
    "span",
    {
      flex: "1",
      color: itemNameColor(item),
      fontSize: "13px",
      ...(glow ? { textShadow: `0 0 6px ${glow}` } : {}),
    },
    getDisplayName(item),
  );
  row.appendChild(nameEl);

  if (mobile) {
    row.addEventListener("click", () =>
      openStashDrawer(item, actionLabel, onAction, disabled),
    );
  } else {
    const btn = createButton(actionLabel, "sm");
    greyBtn(btn, disabled);
    if (!disabled)
      btn.addEventListener("click", () => {
        hideItemTooltip();
        onAction();
      });
    attachItemTooltip(row, item);
    row.appendChild(btn);
  }

  return row;
}

export { closeStashDrawer };

export function buildStash(
  state: GameState,
  onUpdate: (s: GameState) => void,
): HTMLElement {
  const panel = createPanel("");
  const mobile = isMobileStash();
  const stash = state.stash ?? [];
  const stashFull = stash.length >= STASH_LIMIT;

  panel.appendChild(
    el(
      "div",
      {
        color: "#c9a84c",
        fontSize: "13px",
        fontWeight: "bold",
        marginBottom: "10px",
      },
      `Stash — ${stash.length} / ${STASH_LIMIT} items stored`,
    ),
  );

  // Stored items
  panel.appendChild(
    el(
      "div",
      {
        color: "#888",
        fontSize: "11px",
        marginBottom: "4px",
        textTransform: "uppercase",
        letterSpacing: "1px",
      },
      "Stored",
    ),
  );
  if (stash.length === 0) {
    panel.appendChild(
      el(
        "div",
        {
          color: "#555",
          fontSize: "12px",
          fontStyle: "italic",
          marginBottom: "8px",
        },
        "Nothing stored here yet.",
      ),
    );
  } else {
    for (const item of stash) {
      panel.appendChild(
        buildStashRow(
          item,
          "Retrieve",
          false,
          () => {
            const newStash = stash.filter((i) => i.id !== item.id);
            onUpdate({
              ...state,
              stash: newStash,
              hero: {
                ...state.hero,
                inventory: [...state.hero.inventory, item],
              },
            });
          },
          mobile,
        ),
      );
    }
  }

  panel.appendChild(
    el("div", { borderTop: "1px solid #333", margin: "10px 0" }),
  );

  // Inventory
  panel.appendChild(
    el(
      "div",
      {
        color: "#888",
        fontSize: "11px",
        marginBottom: "4px",
        textTransform: "uppercase",
        letterSpacing: "1px",
      },
      "Inventory",
    ),
  );
  if (state.hero.inventory.length === 0) {
    panel.appendChild(
      el(
        "div",
        { color: "#555", fontSize: "12px", fontStyle: "italic" },
        "Your inventory is empty.",
      ),
    );
  } else {
    for (const item of state.hero.inventory) {
      panel.appendChild(
        buildStashRow(
          item,
          "Store",
          stashFull,
          () => {
            const newInv = state.hero.inventory.filter((i) => i.id !== item.id);
            onUpdate({
              ...state,
              stash: [...stash, item],
              hero: { ...state.hero, inventory: newInv },
            });
          },
          mobile,
        ),
      );
    }
  }

  if (stashFull) {
    panel.appendChild(
      el(
        "div",
        {
          color: "#f84",
          fontSize: "11px",
          marginTop: "6px",
          fontStyle: "italic",
        },
        `Stash is full (${STASH_LIMIT} items max).`,
      ),
    );
  }

  return panel;
}
