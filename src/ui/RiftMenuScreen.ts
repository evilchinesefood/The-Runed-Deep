// ============================================================
// Rift Menu — shows rift offering, modifiers, and actions
// ============================================================

import type { GameState, GameAction, RiftModifier } from "../core/types";
import { getRiftShardReward } from "../systems/rift/RiftModifiers";
import {
  createScreen,
  createTitleBar,
  createPanel,
  createButton,
  el,
} from "./Theme";

function diffBadge(weight: number): HTMLElement {
  const sign = weight > 0 ? "+" : "";
  let bg = "#555";
  let color = "#ccc";
  if (weight >= 2) {
    bg = "#611";
    color = "#f66";
  } else if (weight === 1) {
    bg = "#522";
    color = "#f88";
  } else if (weight === -1) {
    bg = "#253";
    color = "#6f6";
  } else if (weight <= -2) {
    bg = "#142";
    color = "#4f4";
  }

  return el(
    "span",
    {
      display: "inline-block",
      padding: "1px 6px",
      borderRadius: "3px",
      fontSize: "11px",
      fontWeight: "bold",
      background: bg,
      color,
      marginLeft: "6px",
      verticalAlign: "middle",
    },
    `${sign}${weight}`,
  );
}

function modRow(mod: RiftModifier): HTMLElement {
  const row = el("div", {
    padding: "6px 8px",
    borderBottom: "1px solid #222",
  });

  const top = el("div", { display: "flex", alignItems: "center" });
  top.appendChild(
    el(
      "span",
      { fontWeight: "bold", color: "#ccc", fontSize: "13px" },
      mod.name,
    ),
  );
  top.appendChild(diffBadge(mod.weight));
  row.appendChild(top);

  row.appendChild(
    el(
      "div",
      { color: "#888", fontSize: "11px", marginTop: "2px" },
      mod.description,
    ),
  );

  return row;
}

export function createRiftMenuScreen(
  state: GameState,
  onAction: (action: GameAction) => void,
  onClose: () => void,
): HTMLElement & { cleanup: () => void } {
  const screen = createScreen() as HTMLElement & { cleanup: () => void };

  // Dormant state
  if (!(state as any).riftStoneUnlocked) {
    screen.appendChild(createTitleBar("Rift Stone", onClose));
    const panel = createPanel();
    panel.appendChild(
      el(
        "div",
        {
          color: "#888",
          padding: "20px",
          textAlign: "center",
          fontStyle: "italic",
          fontSize: "14px",
        },
        "The Rift Stone is dormant. Clear Floor 15 to awaken it.",
      ),
    );
    const leaveBtn = createButton("Leave");
    leaveBtn.style.cssText += "display:block;width:100%;margin-top:12px;";
    leaveBtn.addEventListener("click", onClose);
    panel.appendChild(leaveBtn);
    screen.appendChild(panel);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    screen.cleanup = () => document.removeEventListener("keydown", onKey);
    return screen;
  }

  // Active rift stone
  const offering = state.riftOffering;
  const mods: RiftModifier[] = offering?.modifiers ?? [];
  const totalWeight = mods.reduce((s, m) => s + m.weight, 0);
  const shards = mods.length > 0 ? getRiftShardReward(mods) : 0;

  screen.appendChild(createTitleBar("Rift Stone", onClose));

  // Modifier panel
  const panel = createPanel("CURRENT OFFERING");

  if (mods.length === 0) {
    panel.appendChild(
      el(
        "div",
        {
          color: "#555",
          fontSize: "12px",
          fontStyle: "italic",
          padding: "8px",
        },
        "No modifiers active.",
      ),
    );
  } else {
    const list = el("div", {
      maxHeight: "clamp(200px, 50vh, 360px)",
      overflowY: "auto",
    });
    for (const mod of mods) list.appendChild(modRow(mod));
    panel.appendChild(list);
  }

  // Summary line
  const summary = el("div", {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 8px 0",
    borderTop: "1px solid #333",
    marginTop: "8px",
    fontSize: "13px",
  });
  const weightLabel = el("span", { color: "#888" }, "Total Difficulty: ");
  const weightVal = el(
    "span",
    {
      fontWeight: "bold",
      color: totalWeight > 0 ? "#f88" : totalWeight < 0 ? "#6f6" : "#ccc",
    },
    `${totalWeight > 0 ? "+" : ""}${totalWeight}`,
  );
  const left = el("span", {});
  left.appendChild(weightLabel);
  left.appendChild(weightVal);
  summary.appendChild(left);

  const shardLabel = el("span", { color: "#888" }, "Est. Shards: ");
  const shardVal = el(
    "span",
    { fontWeight: "bold", color: "#a6f" },
    `${shards}`,
  );
  const right = el("span", {});
  right.appendChild(shardLabel);
  right.appendChild(shardVal);
  summary.appendChild(right);
  panel.appendChild(summary);

  screen.appendChild(panel);

  // Button row
  const btnRow = el("div", {
    display: "flex",
    gap: "8px",
    width: "100%",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: "4px",
  });

  const enterBtn = createButton("Enter Rift", "primary");
  enterBtn.addEventListener("click", () =>
    onAction({ type: "enterRift" } as any),
  );
  btnRow.appendChild(enterBtn);

  const rerollCost = 50;
  const canReroll = state.hero.gold >= rerollCost;
  const rerollBtn = createButton(`Reroll (${rerollCost}g)`);
  rerollBtn.disabled = !canReroll;
  rerollBtn.style.opacity = canReroll ? "1" : "0.4";
  rerollBtn.style.cursor = canReroll ? "pointer" : "not-allowed";
  if (canReroll) {
    rerollBtn.addEventListener("click", () =>
      onAction({ type: "rerollRift" } as any),
    );
  }
  btnRow.appendChild(rerollBtn);

  const leaveBtn = createButton("Leave");
  leaveBtn.addEventListener("click", onClose);
  btnRow.appendChild(leaveBtn);

  screen.appendChild(btnRow);

  screen.appendChild(
    el(
      "div",
      { color: "#555", fontSize: "11px", marginTop: "4px" },
      "Press Esc to close",
    ),
  );

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };
  document.addEventListener("keydown", onKey);
  screen.cleanup = () => document.removeEventListener("keydown", onKey);

  return screen;
}
