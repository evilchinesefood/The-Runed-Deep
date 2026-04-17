import type { GameState } from "../core/types";
import { SPELL_BY_ID, type SpellDef } from "../data/spells";
import { createScreen, createPanel, createTitleBar, createButton, el } from "./Theme";

const CATEGORY_ORDER = ["attack", "healing", "defense", "control", "movement", "divination", "misc"];
const CATEGORY_COLORS: Record<string, string> = {
  attack: "#f64", healing: "#4f4", defense: "#48f", control: "#c4f",
  movement: "#fc4", divination: "#4af", misc: "#aaa",
};

export function createSpellScreen(
  state: GameState,
  _onCast: (spellId: string) => void,
  onClose: () => void,
  onUpdateHotkeys: (hotkeys: string[]) => void,
  onSpells?: () => void,
): HTMLElement & { cleanup: () => void } {
  const h = state.hero;
  let hotkeys = [...h.spellHotkeys];
  let drawerEl: HTMLElement | null = null;

  const screen = createScreen();
  screen.classList.add("screen-scrollable");

  const titleBar = createTitleBar("Manage Hotkeys", () => { cleanup(); onClose(); });

  if (onSpells) {
    // Wrap Spells + Close together so they sit adjacent
    const closeBtnEl = titleBar.lastChild as HTMLElement;
    const btnGroup = el("div", { display: "flex", gap: "8px", alignItems: "center" });
    const spellsBtn = createButton("Spells");
    spellsBtn.addEventListener("click", () => { cleanup(); onSpells(); });
    btnGroup.appendChild(spellsBtn);
    titleBar.removeChild(closeBtnEl);
    btnGroup.appendChild(closeBtnEl);
    titleBar.appendChild(btnGroup);
  }

  screen.appendChild(titleBar);

  // Hotkey bar panel
  const hotkeyPanel = createPanel("Hotkeys (1-5)");
  screen.appendChild(hotkeyPanel);

  function renderHotkeyPanel(): void {
    const header = hotkeyPanel.firstElementChild;
    while (hotkeyPanel.lastChild && hotkeyPanel.lastChild !== header) hotkeyPanel.removeChild(hotkeyPanel.lastChild);

    for (let i = 0; i < 5; i++) {
      const slotId = hotkeys[i];
      const spell = slotId ? SPELL_BY_ID[slotId] : null;
      const row = el("div", { display: "flex", alignItems: "center", gap: "8px", padding: "3px 8px", fontSize: "12px" });
      row.appendChild(el("span", { color: "#888", width: "16px", textAlign: "center", fontFamily: "monospace" }, String(i + 1)));
      row.appendChild(el("span", { flex: "1", color: spell ? "#ddd" : "#444" }, spell ? spell.name : "\u2014 empty \u2014"));
      if (spell) {
        const removeBtn = el("div", {
          color: "#fff", cursor: "pointer", fontSize: "12px", background: "#622",
          border: "1px solid #844", borderRadius: "4px", padding: "6px 12px",
          userSelect: "none", fontWeight: "bold",
        }, "Remove");
        removeBtn.addEventListener("click", () => {
          hotkeys.splice(i, 1);
          onUpdateHotkeys([...hotkeys]);
          renderHotkeyPanel();
          renderCategoryPanels();
        });
        row.appendChild(removeBtn);
      }
      hotkeyPanel.appendChild(row);
    }
  }

  renderHotkeyPanel();

  // Category panels
  const categoryContainer = document.createElement("div");
  categoryContainer.style.width = "100%";
  screen.appendChild(categoryContainer);

  function closeDrawer(): void {
    if (drawerEl) { drawerEl.remove(); drawerEl = null; }
  }

  function openDrawer(spell: SpellDef, spellId: string): void {
    closeDrawer();
    const inHotkeys = hotkeys.includes(spellId);
    const canAdd = !inHotkeys && hotkeys.length < 5;

    drawerEl = el("div", {
      position: "fixed", bottom: "0", left: "0", right: "0", zIndex: "2000",
      background: "#1a1a1a", borderTop: "2px solid #555",
      maxHeight: "70vh", display: "flex", flexDirection: "column",
      boxShadow: "0 -4px 16px rgba(0,0,0,0.8)",
    });

    // Scrollable content area
    const scrollArea = el("div", { overflowY: "auto", padding: "12px 16px 8px", maxWidth: "480px", margin: "0 auto" });

    // Spell name + category
    const nameRow = el("div", { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" });
    nameRow.appendChild(el("div", { color: "#c9a84c", fontSize: "16px", fontWeight: "bold" }, spell.name));
    const catColor = CATEGORY_COLORS[spell.category] ?? "#aaa";
    nameRow.appendChild(el("span", { color: catColor, fontSize: "12px" }, spell.category));
    scrollArea.appendChild(nameRow);

    // Stats row
    const stats = el("div", { display: "flex", gap: "12px", fontSize: "12px", color: "#888", marginBottom: "8px" });
    stats.appendChild(el("span", {}, `${spell.manaCost} MP`));
    stats.appendChild(el("span", {}, `Level ${spell.level}`));
    const targetNames: Record<string, string> = { self: "Self", direction: "Directional", target: "Targeted", none: "Instant", area: "Area" };
    stats.appendChild(el("span", {}, targetNames[spell.targeting] ?? spell.targeting));
    if (spell.aoe) stats.appendChild(el("span", { color: "#f90" }, "AoE"));
    scrollArea.appendChild(stats);

    // Description
    scrollArea.appendChild(el("div", { color: "#ccc", fontSize: "13px", lineHeight: "1.4" }, spell.description));

    drawerEl.appendChild(scrollArea);

    // Pinned button row
    const btnRow = el("div", {
      display: "flex", gap: "8px", padding: "8px 16px",
      paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))",
      justifyContent: "center", flexWrap: "wrap", flexShrink: "0",
      borderTop: "1px solid #333", background: "#1a1a1a",
    });

    if (inHotkeys) {
      const rmBtn = createButton("Remove from Hotkeys", "danger");
      rmBtn.addEventListener("click", () => {
        hotkeys = hotkeys.filter(id => id !== spellId);
        onUpdateHotkeys([...hotkeys]);
        renderHotkeyPanel();
        renderCategoryPanels();
        closeDrawer();
      });
      btnRow.appendChild(rmBtn);
    } else if (canAdd) {
      const addBtn = createButton("Add to Hotkeys", "primary");
      addBtn.addEventListener("click", () => {
        hotkeys.push(spellId);
        onUpdateHotkeys([...hotkeys]);
        renderHotkeyPanel();
        renderCategoryPanels();
        closeDrawer();
      });
      btnRow.appendChild(addBtn);
    }

    const closeBtn2 = createButton("Close");
    closeBtn2.addEventListener("click", closeDrawer);
    btnRow.appendChild(closeBtn2);

    drawerEl.appendChild(btnRow);
    document.body.appendChild(drawerEl);
  }

  function renderCategoryPanels(): void {
    categoryContainer.replaceChildren();

    if (h.knownSpells.length === 0) {
      const panel = createPanel();
      panel.style.textAlign = "center";
      panel.style.color = "#555";
      panel.style.padding = "24px";
      panel.textContent = "No spells learned yet.";
      categoryContainer.appendChild(panel);
      return;
    }

    const grouped: Record<string, { spell: SpellDef; spellId: string }[]> = {};
    for (const sid of h.knownSpells) {
      const spell = SPELL_BY_ID[sid];
      if (!spell) continue;
      if (!grouped[spell.category]) grouped[spell.category] = [];
      grouped[spell.category].push({ spell, spellId: sid });
    }

    for (const cat of CATEGORY_ORDER) {
      const spells = grouped[cat];
      if (!spells || spells.length === 0) continue;

      // Sort alphabetically within category
      spells.sort((a, b) => a.spell.name.localeCompare(b.spell.name));

      const catColor = CATEGORY_COLORS[cat] || "#aaa";
      const panel = createPanel(cat.charAt(0).toUpperCase() + cat.slice(1));
      const header = panel.firstElementChild as HTMLElement | null;
      if (header) header.style.color = catColor;

      for (const { spell, spellId } of spells) {
        const inHotkeys = hotkeys.includes(spellId);
        const canAdd = !inHotkeys && hotkeys.length < 5;

        const row = el("div", {
          display: "flex", alignItems: "center", gap: "10px",
          padding: "4px 8px", cursor: "pointer", borderRadius: "3px",
        });

        // Hotkey badge
        const hkIdx = hotkeys.indexOf(spellId);
        row.appendChild(el("span", {
          width: "20px", textAlign: "center", fontSize: "11px", color: "#888", fontFamily: "monospace",
        }, hkIdx !== -1 ? String(hkIdx + 1) : ""));

        // Name
        row.appendChild(el("span", { flex: "1", fontSize: "13px", color: "#ddd" }, spell.name));

        // MP cost
        row.appendChild(el("span", { fontSize: "11px", color: "#48f", width: "35px", textAlign: "right" }, `${spell.manaCost} MP`));

        // +/- button
        if (inHotkeys) {
          const rmBtn = el("div", {
            color: "#fff", cursor: "pointer", fontSize: "14px", background: "#622",
            border: "1px solid #844", borderRadius: "4px", padding: "4px 10px",
            userSelect: "none", fontWeight: "bold", flexShrink: "0", minWidth: "28px", textAlign: "center",
          }, "\u2212");
          rmBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            hotkeys = hotkeys.filter(id => id !== spellId);
            onUpdateHotkeys([...hotkeys]);
            renderHotkeyPanel();
            renderCategoryPanels();
          });
          row.appendChild(rmBtn);
        } else if (canAdd) {
          const addBtn = el("div", {
            color: "#fff", cursor: "pointer", fontSize: "14px", background: "#264",
            border: "1px solid #486", borderRadius: "4px", padding: "4px 10px",
            userSelect: "none", fontWeight: "bold", flexShrink: "0", minWidth: "28px", textAlign: "center",
          }, "+");
          addBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            hotkeys.push(spellId);
            onUpdateHotkeys([...hotkeys]);
            renderHotkeyPanel();
            renderCategoryPanels();
          });
          row.appendChild(addBtn);
        } else {
          row.appendChild(el("span", { width: "32px" }, ""));
        }

        // Click row → open drawer (NOT cast)
        row.addEventListener("click", () => openDrawer(spell, spellId));
        row.addEventListener("mouseenter", () => { row.style.background = "#1a1a2a"; });
        row.addEventListener("mouseleave", () => { row.style.background = ""; });

        panel.appendChild(row);
      }
      categoryContainer.appendChild(panel);
    }
  }

  renderCategoryPanels();

  screen.appendChild(el("div", {
    width: "100%", fontSize: "11px", color: "#555", marginTop: "4px", textAlign: "center",
  }, "Tap a spell for details. Use [+]/[-] to manage hotkey slots 1-5."));

  const keyHandler = (e: KeyboardEvent) => {
    if (e.code === "Escape" || e.code === "KeyZ") {
      e.preventDefault();
      cleanup();
      onClose();
    }
  };
  document.addEventListener("keydown", keyHandler);
  const cleanup = () => {
    document.removeEventListener("keydown", keyHandler);
    closeDrawer();
  };
  (screen as HTMLElement & { cleanup: () => void }).cleanup = cleanup;
  return screen as HTMLElement & { cleanup: () => void };
}
