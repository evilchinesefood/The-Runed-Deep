// ============================================================
// Crucible Between-Wave / Summary Screen
// ============================================================

import { createScreen, createPanel, createTitleBar, createButton, el } from "./Theme";

export function createCrucibleBetweenScreen(
  wave: number,
  shardsEarned: number,
  goldEarned: number,
  isDead: boolean,
  onContinue: () => void,
  onLeave: () => void,
): HTMLElement & { cleanup: () => void } {
  const screen = createScreen() as HTMLElement & { cleanup: () => void };

  const title = isDead ? "Defeated!" : `Wave ${wave} Cleared!`;
  screen.appendChild(createTitleBar(title, onLeave));

  const panel = createPanel("CRUCIBLE RESULTS");

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

  panel.appendChild(statRow("Wave Reached", `${wave}`, "#c9a84c"));
  panel.appendChild(
    el("div", { borderTop: "1px solid #333", margin: "8px 0" }),
  );
  panel.appendChild(statRow("Rune Shards Earned", `${shardsEarned}`, "#a6f"));
  panel.appendChild(statRow("Gold Earned", `${goldEarned}`, "#fc4"));

  screen.appendChild(panel);

  const btnRow = el("div", {
    display: "flex",
    gap: "8px",
    width: "100%",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: "8px",
  });

  if (!isDead) {
    const contBtn = createButton("Continue", "primary");
    contBtn.addEventListener("click", onContinue);
    btnRow.appendChild(contBtn);
  }

  const leaveBtn = createButton(
    isDead ? "Return to Town" : "Leave",
    isDead ? "primary" : "default",
  );
  leaveBtn.addEventListener("click", onLeave);
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
    if (e.key === "Escape") onLeave();
  };
  document.addEventListener("keydown", onKey);
  screen.cleanup = () => document.removeEventListener("keydown", onKey);

  return screen;
}
