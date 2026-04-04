// ============================================================
// Service screen — thin dispatcher to per-building modules
// ============================================================

import type { GameState } from "../core/types";
import {
  createScreen,
  createTitleBar,
  createPanel,
  createButton,
  el,
} from "./Theme";
import { buildTemple } from "./services/TempleScreen";
import { buildSage, closeSageDrawer } from "./services/SageScreen";
import { buildBlacksmith, closeBsDrawer } from "./services/BlacksmithScreen";
import { buildStash, closeStashDrawer } from "./services/StashScreen";
import { buildRuneForge, closeRuneDrawer } from "./services/RuneForgeScreen";
import { buildStatue } from "./services/StatueScreen";

const BUILDING_NAMES: Record<string, string> = {
  temple: "Temple of Odin",
  sage: "The Sage",
  bank: "The Blacksmith",
  inn: "The Resting Stag — Your Stash",
  "rune-forge": "The Rune Forge",
  "rift-stone": "Rift Stone",
  "statue-of-fortune": "Statue of Fortune",
  crucible: "The Crucible",
};

export function createServiceScreen(
  initialState: GameState,
  buildingId: string,
  onUpdate: (newState: GameState) => void,
  onClose: () => void,
): HTMLElement & { cleanup: () => void } {
  let state = initialState;
  let scrollTop = 0;
  const title = BUILDING_NAMES[buildingId] ?? buildingId;

  const screen = createScreen() as HTMLElement & { cleanup: () => void };

  function render(): void {
    const listEl = screen.querySelector<HTMLElement>("[data-service-list]");
    if (listEl) scrollTop = listEl.scrollTop;
    screen.replaceChildren();

    const bar = createTitleBar(title, onClose);
    screen.appendChild(bar);

    if (buildingId !== "inn") {
      const currencyEl = el("div", {
        fontSize: "13px",
        marginBottom: "8px",
        display: "flex",
        gap: "12px",
      });
      const gLabel = el("span", { color: "#fff" }, "Gold: ");
      gLabel.appendChild(
        el("span", { color: "#fc4" }, `\u0024${state.hero.gold}`),
      );
      currencyEl.appendChild(gLabel);
      const sLabel = el("span", { color: "#fff" }, "Runes: ");
      sLabel.appendChild(
        el("span", { color: "#a6f" }, `\u25C6${state.hero.runeShards}`),
      );
      currencyEl.appendChild(sLabel);
      if (buildingId === "statue-of-fortune") {
        const eLabel = el("span", { color: "#fff" }, "Essence: ");
        eLabel.appendChild(
          el("span", { color: "#4f8" }, `\u2726${state.hero.essence}`),
        );
        currencyEl.appendChild(eLabel);
      }
      screen.appendChild(currencyEl);
    }

    function handleUpdate(next: GameState): void {
      state = next;
      onUpdate(next);
      render();
    }

    let content: HTMLElement;
    switch (buildingId) {
      case "temple":
        content = buildTemple(state, handleUpdate);
        break;
      case "sage":
        content = buildSage(state, handleUpdate);
        break;
      case "bank":
        content = buildBlacksmith(state, handleUpdate);
        break;
      case "inn":
        content = buildStash(state, handleUpdate);
        break;
      case "rune-forge":
        content = buildRuneForge(state, handleUpdate);
        break;
      case "rift-stone": {
        content = createPanel("Services");
        if (!state.riftStoneUnlocked) {
          content.appendChild(
            el(
              "div",
              { color: "#555", padding: "20px", textAlign: "center" },
              "The Rift Stone is dormant. Clear Floor 15 to awaken it.",
            ),
          );
        } else {
          content.appendChild(
            el(
              "div",
              {
                color: "#a6f",
                padding: "12px",
                textAlign: "center",
                fontStyle: "italic",
              },
              "A swirling vortex of energy pulses before you...",
            ),
          );
          const riftBtn = createButton("Approach the Rift Stone");
          riftBtn.style.cssText +=
            "display:block;width:100%;padding:12px;font-size:14px;margin-top:12px;";
          riftBtn.addEventListener("click", () => {
            onUpdate({ ...state, screen: "rift-menu" as any });
          });
          content.appendChild(riftBtn);
        }
        break;
      }
      case "crucible": {
        content = createPanel("Services");
        content.appendChild(
          el(
            "div",
            {
              color: "#c9a84c",
              padding: "12px",
              textAlign: "center",
              fontStyle: "italic",
            },
            "A battle-scarred arena where warriors test their mettle against endless waves of enemies.",
          ),
        );
        const crucBtn = createButton("Enter the Crucible");
        crucBtn.style.cssText +=
          "display:block;width:100%;padding:12px;font-size:14px;margin-top:12px;";
        crucBtn.addEventListener("click", () => {
          onUpdate({ ...state, screen: "crucible-menu" });
        });
        content.appendChild(crucBtn);
        break;
      }
      case "statue-of-fortune":
        content = buildStatue(state, handleUpdate);
        break;
      default:
        content = createPanel("Unknown Service");
        content.appendChild(
          el("div", { color: "#888" }, "No services available here."),
        );
    }

    screen.appendChild(content);
    screen.appendChild(
      el(
        "div",
        { color: "#555", fontSize: "11px", marginTop: "4px" },
        "Press Esc to close",
      ),
    );
    const newListEl = screen.querySelector<HTMLElement>("[data-service-list]");
    if (newListEl) newListEl.scrollTop = scrollTop;
  }

  render();

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };
  document.addEventListener("keydown", onKey);

  screen.cleanup = () => {
    document.removeEventListener("keydown", onKey);
    closeSageDrawer();
    closeBsDrawer();
    closeStashDrawer();
    closeRuneDrawer();
  };

  return screen;
}
