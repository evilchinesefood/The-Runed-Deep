import type { GameAction } from "../core/types";
import { getSaveSlots, deleteSave } from "../core/save-load";
import { createScreen, createPanel, createButton, el } from "./Theme";
export function createSplashScreen(
  container: HTMLElement,
  onAction: (action: GameAction) => void,
  onLoadSlot: (slot: number) => void,
): HTMLElement {
  const splash = createScreen();
  splash.style.justifyContent = "center";
  splash.style.minHeight = "100vh";

  // Logo image
  const logo = document.createElement("img");
  logo.src = "assets/logo.png";
  logo.alt = "The Runed Deep";
  logo.style.cssText = "max-width:100%;height:auto;margin-bottom:40px;";
  splash.appendChild(logo);

  // Buttons
  const buttons = el("div", {
    display: "flex",
    gap: "20px",
    marginBottom: "30px",
    flexWrap: "wrap",
    justifyContent: "center",
  });

  const newGameBtn = createButton("New Game");
  newGameBtn.addEventListener("click", () => onAction({ type: "newGame" }));
  buttons.appendChild(newGameBtn);

  splash.appendChild(buttons);

  // Save slots
  const slots = getSaveSlots();
  const hasAny = slots.some((s) => s !== null);

  if (hasAny) {
    splash.appendChild(
      el(
        "div",
        {
          fontSize: "14px",
          color: "#888",
          marginBottom: "12px",
        },
        "Saved Games",
      ),
    );

    const slotPanel = createPanel();
    slotPanel.style.display = "flex";
    slotPanel.style.flexDirection = "column";
    slotPanel.style.gap = "8px";
    slotPanel.style.padding = "8px";

    for (let i = 0; i < slots.length; i++) {
      const info = slots[i];
      if (!info) continue;

      const row = el("div", {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 16px",
        background: "#1a1a1a",
        border: "1px solid #444",
        cursor: "pointer",
        position: "relative",
      });

      const details = el("div", { flex: "1" });
      details.appendChild(
        el("div", { fontWeight: "bold", color: "#ccc" }, info.name),
      );
      details.appendChild(
        el(
          "div",
          { fontSize: "12px", color: "#888" },
          `Level ${info.level} | Floor ${info.floor} | Turn ${info.turn}`,
        ),
      );
      const date = new Date(info.timestamp);
      details.appendChild(
        el(
          "div",
          { fontSize: "11px", color: "#555" },
          date.toLocaleDateString() + " " + date.toLocaleTimeString(),
        ),
      );

      row.appendChild(details);

      const btnGroup = el("div", {
        display: "flex",
        gap: "8px",
        alignItems: "center",
      });

      const slotBtnStyle =
        "height:34px;padding:0 10px;font-size:13px;display:flex;align-items:center;justify-content:center;";

      const loadBtn = createButton("Load");
      loadBtn.style.cssText += slotBtnStyle;
      loadBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        onLoadSlot(info.slot);
      });
      btnGroup.appendChild(loadBtn);

      const delBtn = createButton("X", "danger");
      delBtn.style.cssText += slotBtnStyle + "min-width:34px;";
      const slotNum = info.slot;
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const confirm = el("div", {
          position: "absolute",
          top: "0",
          left: "0",
          right: "0",
          bottom: "0",
          background: "rgba(0,0,0,0.9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          zIndex: "10",
        });
        confirm.appendChild(
          el("span", { color: "#f88", fontSize: "13px" }, "Delete this save?"),
        );
        const yesBtn = createButton("Yes", "danger");
        yesBtn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          deleteSave(slotNum);
          row.remove();
          if (slotPanel.children.length === 0) {
            slotPanel.previousElementSibling?.remove();
            slotPanel.remove();
          }
        });
        const noBtn = createButton("No");
        noBtn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          confirm.remove();
        });
        confirm.appendChild(yesBtn);
        confirm.appendChild(noBtn);
        row.appendChild(confirm);
      });
      btnGroup.appendChild(delBtn);

      row.appendChild(btnGroup);
      row.addEventListener("click", () => onLoadSlot(info.slot));

      slotPanel.appendChild(row);
    }

    splash.appendChild(slotPanel);

  }

  // GitHub link
  const ghLink = document.createElement("a");
  ghLink.href = "https://github.com/evilchinesefood/The-Runed-Deep";
  ghLink.target = "_blank";
  ghLink.rel = "noopener noreferrer";
  ghLink.textContent = "View on GitHub";
  ghLink.style.cssText =
    "display:inline-block;margin-top:24px;padding:4px 10px;border:1px solid #444;color:#666;font-size:11px;text-decoration:none;border-radius:3px;transition:border-color 0.2s,color 0.2s;";
  ghLink.addEventListener("mouseenter", () => {
    ghLink.style.borderColor = "#666";
    ghLink.style.color = "#aaa";
  });
  ghLink.addEventListener("mouseleave", () => {
    ghLink.style.borderColor = "#444";
    ghLink.style.color = "#666";
  });
  splash.appendChild(ghLink);

  // Copyright
  const copy = el("div", {
    fontSize: "12px",
    color: "#555",
    marginTop: "12px",
    marginBottom: "16px",
    textAlign: "center",
  });
  const emailLink = document.createElement("a");
  emailLink.href = "mailto:john.d.ayers@gmail.com";
  emailLink.textContent = "john.d.ayers@gmail.com";
  emailLink.style.cssText = "color:#555;text-decoration:none;";
  emailLink.addEventListener("mouseenter", () => {
    emailLink.style.color = "#888";
  });
  emailLink.addEventListener("mouseleave", () => {
    emailLink.style.color = "#555";
  });
  copy.append(
    "Copyright \u00A9 2026 John David Ayers ( ",
    emailLink,
    " ). All rights reserved.",
  );
  splash.appendChild(copy);

  container.appendChild(splash);
  return splash;
}
