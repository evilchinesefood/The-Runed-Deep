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
  ["1-5", "Quick-cast spell (by hotkey slot)"],
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
  ["F10", "Debug: Jump to any floor"],
  ["F12", "Debug: Reset (die and respawn in town)"],
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

  // Credits — GitHub source link + "made with love"
  const credits = el("div", {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    marginTop: "8px",
    marginBottom: "8px",
  });

  const ghLink = document.createElement("a");
  ghLink.href = "https://github.com/evilchinesefood/The-Runed-Deep";
  ghLink.target = "_blank";
  ghLink.rel = "noopener noreferrer";
  ghLink.className = "rd-source-link";
  ghLink.innerHTML =
    '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" fill="currentColor">' +
    '<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.65 7.65 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>' +
    "</svg> Source on GitHub";
  credits.appendChild(ghLink);

  const credit = document.createElement("a");
  credit.href = "https://jdayers.com/";
  credit.target = "_blank";
  credit.rel = "noopener noreferrer";
  credit.className = "credit";
  credit.innerHTML =
    '&gt; made with <span class="heart">❤</span> by david ayers<span class="cursor">_</span>';
  credits.appendChild(credit);

  screen.appendChild(credits);

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
