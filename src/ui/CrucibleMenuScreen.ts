// ============================================================
// Crucible Menu — entry point for the survival arena
// ============================================================

import type { GameState, GameAction } from "../core/types";
import {
  createScreen,
  createTitleBar,
  createPanel,
  createButton,
  el,
} from "./Theme";

export function createCrucibleMenuScreen(
  state: GameState,
  onAction: (action: GameAction) => void,
  onClose: () => void,
): HTMLElement & { cleanup: () => void } {
  const screen = createScreen() as HTMLElement & { cleanup: () => void };

  screen.appendChild(createTitleBar("The Crucible", onClose));

  const panel = createPanel();

  panel.appendChild(
    el(
      "div",
      {
        color: "#c9a84c",
        padding: "12px 8px",
        textAlign: "center",
        fontStyle: "italic",
        fontSize: "13px",
        lineHeight: "1.5",
      },
      "Enter the arena and face endless waves of enemies. Survive as long as you can. All rewards are kept, even in death.",
    ),
  );

  const bestWave = state.crucibleBestWave ?? 0;
  if (bestWave > 0) {
    const statRow = el("div", {
      display: "flex",
      justifyContent: "space-between",
      padding: "8px",
      borderTop: "1px solid #333",
      marginTop: "8px",
      fontSize: "13px",
    });
    statRow.appendChild(el("span", { color: "#888" }, "Best Wave"));
    statRow.appendChild(
      el("span", { fontWeight: "bold", color: "#c9a84c" }, `${bestWave}`),
    );
    panel.appendChild(statRow);
  }

  screen.appendChild(panel);

  const btnRow = el("div", {
    display: "flex",
    gap: "8px",
    width: "100%",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: "4px",
  });

  const enterBtn = createButton("Enter the Crucible", "primary");
  enterBtn.addEventListener("click", () =>
    onAction({ type: "enterCrucible" } as any),
  );
  btnRow.appendChild(enterBtn);

  screen.appendChild(btnRow);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };
  document.addEventListener("keydown", onKey);
  screen.cleanup = () => document.removeEventListener("keydown", onKey);

  return screen;
}
