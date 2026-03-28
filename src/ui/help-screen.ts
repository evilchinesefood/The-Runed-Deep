import { createScreen, createPanel, createTitleBar, el } from "./Theme";

const KEYS: [string, string][] = [
  // Movement
  ["W / A / S / D", "Move (4 directions)"],
  ["Arrow Keys / Numpad", "Move (8 directions with diagonals)"],
  ["", ""],
  // Actions
  ["E", "Context action (pickup / stairs / enter / search)"],
  ["Q", "Wait (recover HP/MP, 1-10 random turns)"],
  ["G", "Pick up item"],
  ["> or < or Enter", "Use stairs / enter building"],
  ["", ""],
  // Screens
  ["I", "Inventory / Equipment"],
  ["C", "Character info"],
  ["Z", "Spell list / Hotkey management"],
  ["M", "Full floor map"],
  ["F1", "This help screen"],
  ["F2", "Achievements"],
  ["Esc", "Close current screen / Return to game"],
  ["", ""],
  // Spells
  ["1-7", "Quick-cast spell (by hotkey slot)"],
  ["Click spell bar", "Select spell to cast"],
  ["Direction key / Click map", "Aim directional spell"],
  ["", ""],
  // Map & Navigation
  ["Tab", "Auto-explore (walk to nearest unexplored area)"],
  ["Click on map", "Auto-walk to tile (pathfinding)"],
  ["", ""],
  // System
  ["F3", "Save game"],
  ["F4", "Toggle sound on/off"],
  ["---", ""],
  ["F9", "Debug: Spell test arena"],
  ["F10", "Debug: Jump to any floor"],
  ["F11", "Debug: Teleport to town"],
];

export function createHelpScreen(
  onClose: () => void,
): HTMLElement & { cleanup: () => void } {
  const screen = createScreen();
  screen.classList.add("screen-scrollable");

  screen.appendChild(
    createTitleBar("Keyboard Controls", () => {
      cleanup();
      onClose();
    }),
  );

  // Key list
  const panel = createPanel();

  for (const [key, desc] of KEYS) {
    if (key === "" && desc === "") {
      panel.appendChild(el("div", { height: "8px" }));
      continue;
    }
    if (key === "---") {
      panel.appendChild(
        el("hr", {
          border: "none",
          borderTop: "1px solid #333",
          margin: "8px 0",
        }),
      );
      continue;
    }

    const row = el("div", {
      display: "flex",
      gap: "12px",
      marginBottom: "4px",
      fontSize: "13px",
    });

    const keyEl = el(
      "span",
      {
        width: "clamp(100px, 35%, 200px)",
        flexShrink: "0",
        color: "#aac",
        fontFamily: "monospace",
        fontSize: "12px",
      },
      key,
    );
    row.appendChild(keyEl);

    row.appendChild(el("span", { color: "#999" }, desc));
    panel.appendChild(row);
  }

  screen.appendChild(panel);

  // Tips
  const tips = createPanel("Tips");
  tips.style.marginTop = "0";
  tips.appendChild(
    el(
      "div",
      { marginBottom: "3px", fontSize: "12px", color: "#888" },
      "Walk into enemies to attack them.",
    ),
  );
  tips.appendChild(
    el(
      "div",
      { marginBottom: "3px", fontSize: "12px", color: "#888" },
      "Cast Light to permanently illuminate rooms.",
    ),
  );
  tips.appendChild(
    el(
      "div",
      { marginBottom: "3px", fontSize: "12px", color: "#888" },
      "Visit the Sage to enchant your equipment for gold.",
    ),
  );
  tips.appendChild(
    el(
      "div",
      { marginBottom: "3px", fontSize: "12px", color: "#888" },
      "Cursed items have negative enchantments but can be freely swapped.",
    ),
  );
  tips.appendChild(
    el(
      "div",
      { fontSize: "12px", color: "#888" },
      "Hover over items for detailed stat tooltips.",
    ),
  );
  screen.appendChild(tips);

  // Keyboard handler
  const keyHandler = (e: KeyboardEvent) => {
    if (e.code === "Escape" || e.code === "F1") {
      e.preventDefault();
      cleanup();
      onClose();
    }
  };
  document.addEventListener("keydown", keyHandler);
  const cleanup = () => {
    document.removeEventListener("keydown", keyHandler);
  };
  (screen as HTMLElement & { cleanup: () => void }).cleanup = cleanup;
  return screen as HTMLElement & { cleanup: () => void };
}
