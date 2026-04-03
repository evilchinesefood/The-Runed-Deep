import type { GameAction, GameState } from "../core/types";
import { getSaveSlots, deleteSave } from "../core/save-load";
import { createScreen, createPanel, createButton, el } from "./Theme";
import {
  getCloudCode,
  setCloudCode,
  clearCloudCode,
  generateCode,
  pushSave,
  pullSave,
} from "../core/CloudSave";

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

  const cloudLoadBtn = createButton("Load Cloud Save");
  buttons.appendChild(cloudLoadBtn);

  splash.appendChild(buttons);

  // Cloud load panel (toggled)
  const cloudPanel = createPanel("Load Cloud Save");
  cloudPanel.style.display = "none";
  cloudPanel.style.marginBottom = "12px";

  const cloudRow = el("div", {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    padding: "8px",
  });
  const codeInput = document.createElement("input");
  codeInput.type = "text";
  codeInput.maxLength = 5;
  codeInput.placeholder = "Enter code";
  codeInput.style.cssText =
    "background:#1a1a1a;border:1px solid #555;color:#fff;padding:6px 10px;font-size:14px;width:100px;text-transform:uppercase;font-family:monospace;letter-spacing:2px;text-align:center;border-radius:3px;";
  cloudRow.appendChild(codeInput);

  const cloudMsg = el("div", { fontSize: "12px", color: "#888", flex: "1" });
  cloudRow.appendChild(cloudMsg);

  const fetchBtn = createButton("Load");
  fetchBtn.addEventListener("click", async () => {
    const code = codeInput.value.trim().toUpperCase();
    if (code.length !== 5) {
      cloudMsg.textContent = "Code must be 5 characters.";
      cloudMsg.style.color = "#f44";
      return;
    }
    cloudMsg.textContent = "Loading...";
    cloudMsg.style.color = "#888";
    fetchBtn.disabled = true;

    const json = await pullSave(code);
    fetchBtn.disabled = false;

    if (!json) {
      cloudMsg.textContent = "Save not found or server error.";
      cloudMsg.style.color = "#f44";
      return;
    }

    // Find first empty slot, or use slot 3
    const slots = getSaveSlots();
    let targetSlot = slots.findIndex((s) => s === null) + 1;
    if (targetSlot === 0) targetSlot = 3;

    // Parse and validate
    try {
      const state = JSON.parse(json) as GameState;
      if (!state.hero?.name) throw new Error("No hero name in save data");

      // Wrap in save format and store locally
      const saveData = { version: 1, timestamp: Date.now(), state };
      const saveStr = JSON.stringify(saveData);
      try {
        localStorage.setItem(`rd-save-${targetSlot}`, saveStr);
      } catch {
        // localStorage full — clear everything and retry
        localStorage.clear();
        localStorage.setItem(`rd-save-${targetSlot}`, saveStr);
      }
      setCloudCode(targetSlot, code);

      cloudMsg.textContent = `Loaded into slot ${targetSlot}! Refreshing...`;
      cloudMsg.style.color = "#4f4";
      setTimeout(() => location.reload(), 800);
    } catch (err: any) {
      cloudMsg.textContent = `Error: ${err?.message ?? "Invalid save data."}`;
      cloudMsg.style.color = "#f44";
    }
  });
  cloudRow.appendChild(fetchBtn);
  cloudPanel.appendChild(cloudRow);
  splash.appendChild(cloudPanel);

  cloudLoadBtn.addEventListener("click", () => {
    cloudPanel.style.display =
      cloudPanel.style.display === "none" ? "block" : "none";
  });

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

      // Cloud code display
      const code = getCloudCode(info.slot);
      if (code) {
        details.appendChild(
          el(
            "div",
            {
              fontSize: "11px",
              color: "#f90",
              fontFamily: "monospace",
              letterSpacing: "1px",
            },
            `Cloud: ${code}`,
          ),
        );
      }

      row.appendChild(details);

      const btnGroup = el("div", {
        display: "flex",
        gap: "8px",
        alignItems: "center",
      });

      const slotBtnStyle =
        "height:34px;padding:0 10px;font-size:13px;display:flex;align-items:center;justify-content:center;";

      // Cloud toggle button
      const cloudBtn = createButton(code ? "\u2713" : "\u2601", "sm");
      cloudBtn.title = code ? "Cloud sync enabled" : "Enable cloud sync";
      cloudBtn.style.cssText += slotBtnStyle + "min-width:34px;font-size:16px;";
      if (code) {
        cloudBtn.style.color = "#4f4";
        cloudBtn.style.borderColor = "#4a4";
      } else {
        cloudBtn.style.color = "#aaa";
      }
      const slotForCloud = info.slot;
      cloudBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (getCloudCode(slotForCloud)) {
          // Already enabled — show disable confirm
          const wasCode = getCloudCode(slotForCloud);
          if (confirm(`Disable cloud sync? Code: ${wasCode}`)) {
            clearCloudCode(slotForCloud);
            location.reload();
          }
          return;
        }
        // Enable cloud sync
        const newCode = generateCode();
        cloudBtn.disabled = true;
        cloudBtn.textContent = "...";

        // Push current save to server
        const json = localStorage.getItem(`rd-save-${slotForCloud}`);
        if (json) {
          const saveData = JSON.parse(json);
          const ok = await pushSave(newCode, JSON.stringify(saveData.state));
          if (!ok) {
            cloudBtn.disabled = false;
            cloudBtn.textContent = "\u2601";
            alert("Failed to upload save. Try again.");
            return;
          }
        }

        setCloudCode(slotForCloud, newCode);
        location.reload();
      });
      btnGroup.appendChild(cloudBtn);

      const loadBtn = createButton("Load");
      loadBtn.style.cssText += slotBtnStyle;
      loadBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        // If cloud-enabled, pull latest from server first
        const cloudCode = getCloudCode(info.slot);
        if (cloudCode) {
          loadBtn.textContent = "Syncing...";
          loadBtn.disabled = true;
          const remote = await pullSave(cloudCode);
          if (remote) {
            try {
              const state = JSON.parse(remote) as GameState;
              if (state.hero?.name) {
                // Only overwrite local if cloud is newer (higher turn count)
                const localJson = localStorage.getItem(`rd-save-${info.slot}`);
                const localTurn = localJson
                  ? (JSON.parse(localJson).state?.turn ?? 0)
                  : 0;
                if (state.turn >= localTurn) {
                  const saveData = { version: 1, timestamp: Date.now(), state };
                  const saveStr = JSON.stringify(saveData);
                  localStorage.removeItem(`rd-save-${info.slot}`);
                  try {
                    localStorage.setItem(`rd-save-${info.slot}`, saveStr);
                  } catch {
                    localStorage.clear();
                    setCloudCode(info.slot, cloudCode);
                    try {
                      localStorage.setItem(`rd-save-${info.slot}`, saveStr);
                    } catch {
                      /* give up */
                    }
                  }
                }
              }
            } catch {
              /* use local */
            }
          }
          loadBtn.disabled = false;
        }
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
          clearCloudCode(slotNum);
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

    // Background cloud sync — pull latest for each cloud-enabled slot
    // Cloud is source of truth — always overwrite local
    for (let i = 0; i < slots.length; i++) {
      const info = slots[i];
      if (!info) continue;
      const code = getCloudCode(info.slot);
      if (!code) continue;
      const slotNum = info.slot;
      const rowEl = slotPanel.children[i] as HTMLElement | undefined;
      (async () => {
        try {
          const remote = await pullSave(code);
          if (!remote) return;
          const state = JSON.parse(remote) as GameState;
          if (!state.hero?.name) return;
          // Only overwrite local if cloud has higher turn count
          const localJson = localStorage.getItem(`rd-save-${slotNum}`);
          const localTurn = localJson
            ? (JSON.parse(localJson).state?.turn ?? 0)
            : 0;
          if (state.turn < localTurn) return;
          const saveData = { version: 1, timestamp: Date.now(), state };
          const saveStr = JSON.stringify(saveData);
          localStorage.removeItem(`rd-save-${slotNum}`);
          try {
            localStorage.setItem(`rd-save-${slotNum}`, saveStr);
          } catch {
            localStorage.clear();
            try {
              localStorage.setItem(`rd-save-${slotNum}`, saveStr);
            } catch {
              return;
            }
          }
          // Restore cloud code if cleared
          setCloudCode(slotNum, code);
          // Update the slot display in-place
          if (!rowEl) return;
          const details = rowEl.querySelector("div") as HTMLElement;
          if (!details) return;
          const children = details.children;
          if (children[0]) children[0].textContent = state.hero.name;
          if (children[1])
            children[1].textContent = `Level ${state.hero.level} | Floor ${state.currentFloor ?? 1} | Turn ${state.turn}`;
          if (children[2]) children[2].textContent = `\u2601 Synced from cloud`;
        } catch {
          /* ignore sync errors */
        }
      })();
    }
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
