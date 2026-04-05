// ============================================================
// Rift Summary — shown after completing a rift run
// ============================================================

import type { GameState } from "../core/types";
import type { RiftModifier } from "../core/types";
import { createScreen, createPanel, createTitleBar, createButton, el } from "./Theme";

function weightColor(w: number): string {
  if (w >= 2) return "#f66";
  if (w === 1) return "#f88";
  if (w === -1) return "#6f6";
  if (w <= -2) return "#4f4";
  return "#ccc";
}

export function createRiftSummaryScreen(
  _state: GameState,
  shardsEarned: number,
  floorsCleared: number,
  modifiers: RiftModifier[],
  onClose: () => void,
): HTMLElement & { cleanup: () => void } {
  const screen = createScreen() as HTMLElement & { cleanup: () => void };

  screen.appendChild(createTitleBar("Rift Complete!", onClose));

  const panel = createPanel("RESULTS");
  const totalDifficulty = modifiers.reduce((s, m) => s + m.weight, 0);

  // Stat rows
  const statRow = (
    label: string,
    value: string,
    color = "#ccc",
  ): HTMLElement => {
    const row = el("div", {
      display: "flex",
      justifyContent: "space-between",
      padding: "4px 0",
      fontSize: "13px",
    });
    row.appendChild(el("span", { color: "#888" }, label));
    row.appendChild(el("span", { fontWeight: "bold", color }, value));
    return row;
  };

  panel.appendChild(statRow("Floors Cleared", `${floorsCleared}`));

  // Modifiers list
  if (modifiers.length > 0) {
    panel.appendChild(
      el(
        "div",
        {
          color: "#888",
          fontSize: "11px",
          marginTop: "8px",
          marginBottom: "4px",
          textTransform: "uppercase",
          letterSpacing: "1px",
        },
        "Modifiers",
      ),
    );
    for (const mod of modifiers) {
      const row = el("div", {
        display: "flex",
        justifyContent: "space-between",
        padding: "2px 8px",
        fontSize: "12px",
      });
      row.appendChild(el("span", { color: "#ccc" }, mod.name));
      const sign = mod.weight > 0 ? "+" : "";
      row.appendChild(
        el(
          "span",
          { color: weightColor(mod.weight), fontWeight: "bold" },
          `${sign}${mod.weight}`,
        ),
      );
      panel.appendChild(row);
    }
  }

  panel.appendChild(
    el("div", { borderTop: "1px solid #333", margin: "8px 0" }),
  );
  panel.appendChild(
    statRow(
      "Total Difficulty",
      `${totalDifficulty > 0 ? "+" : ""}${totalDifficulty}`,
      totalDifficulty > 0 ? "#f88" : totalDifficulty < 0 ? "#6f6" : "#ccc",
    ),
  );
  panel.appendChild(statRow("Rune Shards Earned", `${shardsEarned}`, "#a6f"));

  screen.appendChild(panel);

  // Return button
  const btn = createButton("Return to Town", "primary");
  btn.style.cssText += "display:block;width:100%;margin-top:8px;";
  btn.addEventListener("click", onClose);
  screen.appendChild(btn);

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
