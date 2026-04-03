import { createScreen, el } from "./Theme";
import { calculateScore } from "../systems/Scoring";
import type { GameState } from "../core/types";
import { Sound } from "../systems/Sound";

export function createVictoryScreen(
  state: GameState,
  onNewGamePlus: () => void,
  onTitle: () => void,
): HTMLElement {
  const hero = state.hero;

  const score = calculateScore(
    hero.level,
    state.currentFloor,
    hero.xp,
    state.turn,
    hero.gold,
    state.difficulty,
  );

  Sound.victory();

  const screen = createScreen();
  screen.style.minHeight = "100vh";
  screen.style.justifyContent = "center";

  // Parchment container
  const parchment = el("div", {
    maxWidth: "520px",
    width: "100%",
    background: "linear-gradient(to bottom, #d4c5a0, #c4b48a, #d4c5a0)",
    border: "3px solid #8a7550",
    borderRadius: "4px",
    padding: "32px 36px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.6), inset 0 0 30px rgba(0,0,0,0.1)",
    color: "#2a2010",
    fontFamily: "Georgia, serif",
    position: "relative",
  });

  // Decorative top edge
  const topEdge = el("div", {
    position: "absolute",
    top: "0",
    left: "0",
    right: "0",
    height: "3px",
    background:
      "linear-gradient(to right, transparent, #8a7550, #a08860, #8a7550, transparent)",
  });
  parchment.appendChild(topEdge);

  // Golden title
  const titleEl = el(
    "h2",
    {
      textAlign: "center",
      color: "#b8860b",
      fontSize: "28px",
      margin: "0 0 8px",
      fontFamily: "Georgia, serif",
      letterSpacing: "3px",
      textShadow: "0 1px 3px rgba(0,0,0,0.3)",
    },
    "VICTORY!",
  );
  parchment.appendChild(titleEl);

  // Decorative divider
  const divider = el(
    "div",
    {
      textAlign: "center",
      color: "#8a7550",
      fontSize: "16px",
      marginBottom: "16px",
      letterSpacing: "4px",
    },
    "⚔ ✦ ⚔",
  );
  parchment.appendChild(divider);

  // Epilogue text
  const epilogue = el(
    "div",
    {
      fontSize: "14px",
      lineHeight: "1.7",
      color: "#3a2a15",
      whiteSpace: "pre-line",
      marginBottom: "24px",
      fontStyle: "italic",
    },
    `With a final blow, Surtur falls. The ancient evil is vanquished.

The The Runed Deep grows silent. You have avenged Bjarnarhaven. Your name will be sung in the halls of Odin for eternity.`,
  );
  parchment.appendChild(epilogue);

  // Divider line
  const hr = el("div", {
    borderTop: "1px solid #8a7550",
    margin: "0 0 16px",
    opacity: "0.5",
  });
  parchment.appendChild(hr);

  // Hero stats
  const statsTitle = el(
    "div",
    {
      fontSize: "12px",
      color: "#6a5030",
      letterSpacing: "1px",
      textTransform: "uppercase",
      marginBottom: "10px",
      fontWeight: "bold",
    },
    "Hero Record",
  );
  parchment.appendChild(statsTitle);

  function statRow(label: string, value: string): HTMLElement {
    const row = el("div", {
      display: "flex",
      justifyContent: "space-between",
      fontSize: "13px",
      marginBottom: "4px",
      color: "#3a2a15",
    });
    const lbl = el("span", { color: "#6a5030" }, label);
    const val = el("span", { fontWeight: "bold", color: "#2a1a05" }, value);
    row.appendChild(lbl);
    row.appendChild(val);
    return row;
  }

  const diffLabels: Record<string, string> = {
    normal: "Normal",
    intermediate: "Intermediate",
    hard: "Hard",
    nightmare: "Nightmare",
    impossible: "Impossible",
  };

  parchment.appendChild(statRow("Name", hero.name));
  parchment.appendChild(statRow("Level", String(hero.level)));
  parchment.appendChild(statRow("Turns Survived", state.turn.toLocaleString()));
  parchment.appendChild(statRow("Gold", hero.gold.toLocaleString()));
  parchment.appendChild(
    statRow("Difficulty", diffLabels[state.difficulty] ?? state.difficulty),
  );
  if (state.ngPlusCount > 0) {
    parchment.appendChild(statRow("New Game Plus", String(state.ngPlusCount)));
  }

  // Score
  const scoreRow = el("div", {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "15px",
    marginTop: "8px",
    marginBottom: "4px",
    borderTop: "1px solid #8a7550",
    paddingTop: "8px",
    color: "#2a1a05",
  });
  const scoreLbl = el(
    "span",
    { color: "#6a5030", fontWeight: "bold" },
    "Final Score",
  );
  const scoreVal = el(
    "span",
    { fontWeight: "bold", color: "#b8860b", fontSize: "18px" },
    score.toLocaleString(),
  );
  scoreRow.appendChild(scoreLbl);
  scoreRow.appendChild(scoreVal);
  parchment.appendChild(scoreRow);

  // Buttons
  const btnRow = el("div", {
    display: "flex",
    justifyContent: "center",
    gap: "16px",
    marginTop: "20px",
  });

  const ngPlusLabel =
    state.ngPlusCount > 0
      ? `New Game Plus ${state.ngPlusCount + 1}`
      : "New Game Plus";

  const ngBtn = el(
    "div",
    {
      padding: "10px 28px",
      background: "#5a4530",
      color: "#d4c5a0",
      border: "2px solid #b8860b",
      borderRadius: "3px",
      cursor: "pointer",
      fontSize: "14px",
      fontFamily: "Georgia, serif",
      userSelect: "none",
      transition: "background 0.15s",
      textAlign: "center",
      fontWeight: "bold",
    },
    ngPlusLabel,
  );
  ngBtn.addEventListener("mouseenter", () => {
    ngBtn.style.background = "#6a5540";
  });
  ngBtn.addEventListener("mouseleave", () => {
    ngBtn.style.background = "#5a4530";
  });
  ngBtn.addEventListener("click", onNewGamePlus);
  btnRow.appendChild(ngBtn);

  const titleBtn = el(
    "div",
    {
      padding: "10px 20px",
      color: "#8a7550",
      cursor: "pointer",
      fontSize: "13px",
      fontFamily: "Georgia, serif",
      userSelect: "none",
      textAlign: "center",
    },
    "Return to Title",
  );
  titleBtn.addEventListener("click", onTitle);
  btnRow.appendChild(titleBtn);

  parchment.appendChild(btnRow);
  screen.appendChild(parchment);

  return screen;
}
