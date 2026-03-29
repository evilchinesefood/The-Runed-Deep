import type { GameState } from "../core/types";
import { calculateScore } from "../systems/Scoring";
import { createScreen, createButton, el } from "./Theme";

export function createDeathScreen(
  container: HTMLElement,
  state: GameState,
  onContinue: () => void,
): HTMLElement {
  const hero = state.hero;

  const lastCombatMsg = [...state.messages]
    .reverse()
    .find((m) => m.severity === "combat" && m.text.includes("hits"));
  const causeOfDeath = lastCombatMsg
    ? extractKiller(lastCombatMsg.text)
    : "unknown causes";

  const score = calculateScore(
    hero.level, state.currentFloor + 1, hero.xp, state.turn, hero.copper, state.difficulty,
  );

  const screen = createScreen();
  screen.style.justifyContent = "center";
  screen.style.minHeight = "100vh";

  const tombstone = el("div", {
    maxWidth: "320px", width: "100%", padding: "40px 30px",
    background: "#1a1a1a", border: "3px solid #444",
    borderRadius: "60px 60px 0 0", textAlign: "center",
    marginBottom: "20px", boxSizing: "border-box",
  });

  tombstone.appendChild(el("div", { fontSize: "32px", fontWeight: "bold", color: "#888", marginBottom: "16px", fontFamily: "serif" }, "You Have Fallen"));
  tombstone.appendChild(el("div", { fontSize: "20px", color: "#aaa", marginBottom: "8px", fontFamily: "serif" }, hero.name));
  tombstone.appendChild(el("div", { fontSize: "14px", color: "#666", marginBottom: "16px" }, `Level ${hero.level} · Floor ${state.currentFloor + 1}`));
  tombstone.appendChild(el("hr", { border: "none", borderTop: "1px solid #333", margin: "12px 0" }));
  tombstone.appendChild(el("div", { fontSize: "13px", color: "#f44", marginBottom: "6px" }, `Slain by: ${causeOfDeath}`));
  tombstone.appendChild(el("div", { fontSize: "13px", color: "#777", marginBottom: "6px" }, `Difficulty: ${state.difficulty}`));
  tombstone.appendChild(el("div", { fontSize: "13px", color: "#777", marginBottom: "6px" }, `XP: ${hero.xp} · Gold: ${hero.copper}`));
  tombstone.appendChild(el("div", { fontSize: "13px", color: "#777", marginBottom: "6px" }, `Turns survived: ${state.turn}`));
  if (state.ngPlusCount > 0) {
    tombstone.appendChild(el("div", { fontSize: "13px", color: "#c90", marginBottom: "6px" }, `New Game Plus ${state.ngPlusCount}`));
  }
  tombstone.appendChild(el("hr", { border: "none", borderTop: "1px solid #333", margin: "12px 0" }));
  tombstone.appendChild(el("div", { fontSize: "18px", fontWeight: "bold", color: "#c90" }, `Score: ${score.toLocaleString()}`));

  screen.appendChild(tombstone);

  // Info text
  screen.appendChild(el("div", { color: "#777", fontSize: "12px", textAlign: "center", marginBottom: "12px", maxWidth: "300px" },
    "You will return to town to regroup. The dungeon floor will be regenerated."));

  const continueBtn = createButton("Continue");
  continueBtn.style.cssText += "min-width:160px;padding:12px 32px;font-size:16px;";
  continueBtn.addEventListener("click", onContinue);
  screen.appendChild(continueBtn);

  container.appendChild(screen);
  return screen;
}

function extractKiller(message: string): string {
  const match = message.match(/^The (.+?) hits/);
  if (match) return match[1];
  return "unknown causes";
}
