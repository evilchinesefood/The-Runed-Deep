import type { GameAction, Direction } from "../core/types";
import { SPELL_BY_ID } from "../data/spells";
import { createButton as themeBtn } from "./Theme";

export type TouchActionHandler = (action: GameAction) => void;
export type SpellCastHandler = (spellId: string) => void;

let activeBtn: HTMLElement | null = null;
let repeatTimer: number | null = null;

function releaseActive(): void {
  if (activeBtn) {
    activeBtn.style.background = activeBtn.dataset.defaultBg ?? "";
    activeBtn.style.transform = "";
    activeBtn.style.borderBottomWidth = "3px";
    activeBtn = null;
  }
  if (repeatTimer) { clearInterval(repeatTimer); repeatTimer = null; }
}

document.addEventListener("touchend", releaseActive, { passive: true });
document.addEventListener("touchcancel", releaseActive, { passive: true });
document.addEventListener("mouseup", releaseActive);

function haptic(): void {
  if (navigator.vibrate) navigator.vibrate(10);
}

const BTN_BOTTOM = "12px";

function makeBtn(
  size: number,
  onClick: () => void,
  isDpad = false,
  repeatable = false,
): HTMLElement {
  const btn = document.createElement("div");
  const bg = "linear-gradient(180deg, #4a4a4a 0%, #2a2a2a 40%, #1a1a1a 100%)";
  btn.dataset.defaultBg = bg;
  btn.style.cssText = `
    width:${size}px;height:${size}px;
    display:flex;align-items:center;justify-content:center;
    background:${bg};
    color:#c9a84c;text-shadow:0 1px 2px rgba(0,0,0,0.8);
    border:2px solid #555;border-bottom:3px solid #333;
    border-radius:${isDpad ? '50%' : '8px'};
    font-weight:bold;user-select:none;touch-action:none;
    cursor:pointer;transition:all 0.08s;
    font-size:${isDpad ? '16px' : '14px'};
    line-height:1;
  `;
  const press = () => {
    releaseActive();
    activeBtn = btn;
    btn.style.background = "linear-gradient(180deg, #555 0%, #333 40%, #222 100%)";
    btn.style.transform = "translateY(1px)";
    btn.style.borderBottomWidth = "2px";
    haptic();
    if (repeatable) {
      repeatTimer = window.setInterval(() => { onClick(); }, 150);
    }
  };
  btn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    press();
    onClick();
  });
  btn.addEventListener("mousedown", (e) => {
    e.preventDefault();
    press();
    onClick();
  });
  return btn;
}

// Create SVG arrow icon element — consistent across all platforms
function createArrowIcon(rotation: number): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "18");
  svg.setAttribute("height", "18");
  svg.setAttribute("viewBox", "0 0 18 18");
  svg.style.transform = `rotate(${rotation}deg)`;
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M9 3L15 12H3Z");
  path.setAttribute("fill", "#c9a84c");
  svg.appendChild(path);
  return svg;
}

// SVG icons for action buttons
function createActionIcon(id: string): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "22");
  svg.setAttribute("height", "22");
  svg.setAttribute("viewBox", "0 0 22 22");
  const c = "#c9a84c";
  const p = (d: string, fill = c) => {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
    el.setAttribute("d", d);
    el.setAttribute("fill", fill);
    svg.appendChild(el);
    return el;
  };
  const rect = (x: number, y: number, w: number, h: number, fill = c, rx = 0) => {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    el.setAttribute("x", `${x}`); el.setAttribute("y", `${y}`);
    el.setAttribute("width", `${w}`); el.setAttribute("height", `${h}`);
    el.setAttribute("fill", fill);
    if (rx) el.setAttribute("rx", `${rx}`);
    svg.appendChild(el);
  };
  switch (id) {
    case "action": // Star/interact icon
      p("M11 2L13 8L19 8L14 12L16 18L11 14L6 18L8 12L3 8L9 8Z");
      break;
    case "auto": // Fast-forward arrow (same on mobile + desktop)
      p("M4 11L9 5L9 8.5L13 8.5L13 5L18 11L13 17L13 13.5L9 13.5L9 17Z");
      break;
    case "items": { // Backpack icon
      rect(5, 8, 12, 11, c, 2);
      const flap = document.createElementNS("http://www.w3.org/2000/svg", "path");
      flap.setAttribute("d", "M8 4C8 2 14 2 14 4");
      flap.setAttribute("fill", "none");
      flap.setAttribute("stroke", c);
      flap.setAttribute("stroke-width", "1.5");
      svg.appendChild(flap);
      rect(9, 11, 4, 3, "#1a1a1a", 1);
      break;
    }
    case "spells": { // Open book icon
      // Book covers
      const lc = document.createElementNS("http://www.w3.org/2000/svg", "path");
      lc.setAttribute("d", "M3 5C3 4 5 3 8 3L11 4L11 18L8 17C5 17 3 16 3 15Z");
      lc.setAttribute("fill", c); svg.appendChild(lc);
      const rc = document.createElementNS("http://www.w3.org/2000/svg", "path");
      rc.setAttribute("d", "M19 5C19 4 17 3 14 3L11 4L11 18L14 17C17 17 19 16 19 15Z");
      rc.setAttribute("fill", c); svg.appendChild(rc);
      // Spine
      rect(10, 4, 2, 14, "#886");
      // Page lines
      rect(5, 7, 4, 1, "#1a1a1a"); rect(5, 10, 4, 1, "#1a1a1a");
      rect(13, 7, 4, 1, "#1a1a1a"); rect(13, 10, 4, 1, "#1a1a1a");
      break;
    }
    case "map": { // Compass icon
      const circ = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circ.setAttribute("cx", "11"); circ.setAttribute("cy", "11");
      circ.setAttribute("r", "8"); circ.setAttribute("fill", "none");
      circ.setAttribute("stroke", c); circ.setAttribute("stroke-width", "1.5");
      svg.appendChild(circ);
      p("M11 4L13 10L11 11L9 10Z");
      p("M11 18L9 12L11 11L13 12Z", "#886");
      break;
    }
    case "dpad": // D-pad cross icon
      rect(3, 9, 6, 4, c, 1);
      rect(13, 9, 6, 4, c, 1);
      rect(9, 3, 4, 6, c, 1);
      rect(9, 13, 4, 6, c, 1);
      rect(9, 9, 4, 4, c, 1);
      break;
    case "rest": // Pause/rest icon
      rect(5, 4, 4, 14, c, 1);
      rect(13, 4, 4, 14, c, 1);
      break;
    case "menu": // Hamburger menu icon
      rect(3, 5, 16, 2, c, 1);
      rect(3, 10, 16, 2, c, 1);
      rect(3, 15, 16, 2, c, 1);
      break;
  }
  return svg;
}

export type MenuActionHandler = (action: string) => void;

interface LayoutSettings {
  dpadVisible: boolean;
  actionVisible: boolean;
  dpadOffsetX: number;
  dpadOffsetY: number;
  actionOffsetX: number;
  actionOffsetY: number;
  scale: number; // 0.75, 1, 1.25
}

const DEFAULT_LAYOUT: LayoutSettings = {
  dpadVisible: true, actionVisible: true,
  dpadOffsetX: 0, dpadOffsetY: 0,
  actionOffsetX: 0, actionOffsetY: 0,
  scale: 1,
};

function loadLayout(): LayoutSettings {
  try {
    const s = localStorage.getItem('rd-touch-layout');
    return s ? { ...DEFAULT_LAYOUT, ...JSON.parse(s) } : { ...DEFAULT_LAYOUT };
  } catch { return { ...DEFAULT_LAYOUT }; }
}

function saveLayout(l: LayoutSettings): void {
  try { localStorage.setItem('rd-touch-layout', JSON.stringify(l)); } catch {}
}

export class TouchControls {
  private container: HTMLElement;
  private dpad: HTMLElement;
  private actionBar: HTMLElement;
  private menuPanel: HTMLElement = document.createElement("div");
  private layoutPanel: HTMLElement = document.createElement("div");
  private spellPickerPanel: HTMLElement = document.createElement("div");
  private menuOpen = false;
  private handler: TouchActionHandler | null = null;
  private autoExploreHandler: (() => void) | null = null;
  private menuHandler: MenuActionHandler | null = null;
  private spellCastHandler: SpellCastHandler | null = null;
  private visible = false;
  private layout: LayoutSettings;
  private spellTargetMode = false;
  private pendingSpellId: string | null = null;
  private dpadBtns: { dir: Direction; btn: HTMLElement }[] = [];
  private dpadCenter: HTMLElement | null = null;

  constructor() {
    this.layout = loadLayout();
    const s = this.layout.scale;
    const isLandscape = window.innerWidth > window.innerHeight && window.innerHeight <= 500;
    const dpadSize = Math.max(44, Math.round((isLandscape ? 36 : 48) * s));
    const dpadGap = isLandscape ? 2 : 3;
    const actionSize = Math.max(44, Math.round((isLandscape ? 34 : 44) * s));

    // D-pad — consistent SVG arrows in a 3x3 grid
    this.dpad = document.createElement("div");
    this.dpad.style.cssText = `
      position:fixed;bottom:calc(${BTN_BOTTOM} + ${this.layout.dpadOffsetY}px);left:${12 + this.layout.dpadOffsetX}px;z-index:1000;
      display:${this.layout.dpadVisible ? 'grid' : 'none'};grid-template-columns:${dpadSize}px ${dpadSize}px ${dpadSize}px;grid-template-rows:${dpadSize}px ${dpadSize}px ${dpadSize}px;
      gap:${dpadGap}px;touch-action:none;
    `;

    // Direction: [gridPos, svgRotation, direction]
    const dirs: [string, number, Direction | null][] = [
      ["1/1", -45, "NW"],
      ["1/2", 0, "N"],
      ["1/3", 45, "NE"],
      ["2/1", -90, "W"],
      ["2/2", 0, null],
      ["2/3", 90, "E"],
      ["3/1", -135, "SW"],
      ["3/2", 180, "S"],
      ["3/3", 135, "SE"],
    ];

    for (const [pos, rot, dir] of dirs) {
      const [row, col] = pos.split("/");
      const isCenter = dir === null;
      const btn = makeBtn(dpadSize, () => {
        if (isCenter) {
          if (this.spellTargetMode) {
            this.cancelSpellTarget();
          } else {
            this.autoExploreHandler?.();
          }
        } else if (this.spellTargetMode && this.pendingSpellId) {
          this.handler?.({ type: "castSpell", spellId: this.pendingSpellId, direction: dir! });
          this.cancelSpellTarget();
        } else {
          this.handler?.({ type: "move", direction: dir! });
        }
      }, true, !isCenter && !this.spellTargetMode);
      btn.appendChild(isCenter ? createActionIcon("auto") : createArrowIcon(rot));
      btn.style.gridRow = row;
      btn.style.gridColumn = col;
      if (isCenter) {
        const centerBg = "linear-gradient(180deg, #3a3020 0%, #2a2010 40%, #1a1508 100%)";
        btn.style.background = centerBg;
        btn.dataset.defaultBg = centerBg;
        btn.style.borderColor = "#4a3a20";
        this.dpadCenter = btn;
      }
      if (dir) this.dpadBtns.push({ dir: dir!, btn });
      this.dpad.appendChild(btn);
    }

    // Action buttons — right side
    this.actionBar = document.createElement("div");
    const actDisplay = this.layout.actionVisible ? (isLandscape ? 'flex' : 'grid') : 'none';
    if (isLandscape) {
      this.actionBar.style.cssText = `
        position:fixed;bottom:calc(${BTN_BOTTOM} + ${this.layout.actionOffsetY}px);right:${12 + this.layout.actionOffsetX}px;z-index:1000;
        display:${actDisplay};flex-direction:row;flex-wrap:wrap;gap:4px;touch-action:none;
        max-width:calc(100vw - ${dpadSize * 3 + dpadGap * 2 + 20}px);
        justify-content:flex-end;
      `;
    } else {
      this.actionBar.style.cssText = `
        position:fixed;bottom:calc(${BTN_BOTTOM} + ${this.layout.actionOffsetY}px);right:${12 + this.layout.actionOffsetX}px;z-index:1000;
        display:${actDisplay};grid-template-columns:${actionSize}px ${actionSize}px;gap:6px;touch-action:none;
      `;
    }

    const actions: [string, GameAction][] = [
      ["action", { type: "contextAction" }],
      ["rest", { type: "rest" }],
      ["items", { type: "setScreen", screen: "inventory" }],
      ["spells", { type: "setScreen", screen: "spells" }],
      ["map", { type: "setScreen", screen: "map" }],
    ];

    for (const [id, action] of actions) {
      const btn = makeBtn(actionSize, () => {
        if (id === "spells") {
          this.openSpellPicker();
          return;
        }
        this.handler?.(action);
      });
      btn.appendChild(createActionIcon(id));
      btn.title = { action: "Action", rest: "Rest", items: "Items", spells: "Cast Spell", map: "Map" }[id] ?? "";
      this.actionBar.appendChild(btn);
    }

    // Menu button
    const menuBtn = makeBtn(actionSize, () => this.toggleMenu());
    menuBtn.appendChild(createActionIcon("menu"));
    menuBtn.title = "Commands";
    this.actionBar.appendChild(menuBtn);

    // Commands screen — full overlay with button list
    this.menuPanel = document.createElement("div");
    this.menuPanel.style.cssText = `
      position:fixed;inset:0;z-index:1001;
      background:rgba(0,0,0,0.85);
      display:none;flex-direction:column;align-items:center;justify-content:center;
      gap:8px;padding:20px;
    `;

    const menuTitle = document.createElement("div");
    menuTitle.textContent = "Commands";
    menuTitle.style.cssText = "color:#c9a84c;font-size:18px;font-weight:bold;font-family:sans-serif;margin-bottom:8px;text-shadow:0 1px 3px rgba(0,0,0,0.8);";
    this.menuPanel.appendChild(menuTitle);

    const menuItems: [string, () => void][] = [
      ["Adjust Controls", () => {
        this.closeMenu();
        this.openLayoutEditor();
      }],
      ["Character", () => {
        this.handler?.({ type: "setScreen", screen: "character-info" });
        this.closeMenu();
      }],
      ["Help", () => {
        this.handler?.({ type: "setScreen", screen: "help" });
        this.closeMenu();
      }],
      ["Achievements", () => {
        this.handler?.({ type: "setScreen", screen: "achievements" as any });
        this.closeMenu();
      }],
      ["Save Game", () => {
        this.handler?.({ type: "save" });
        this.closeMenu();
      }],
      ["Sound On/Off", () => {
        this.menuHandler?.('toggle-sound');
        this.closeMenu();
      }],
      ["Debug", () => {
        this.closeMenu();
        this.openDebugMenu();
      }],
      ["Close", () => {
        this.closeMenu();
      }],
    ];

    const btnStyle = `
      padding:10px 20px;min-width:200px;color:#c9a84c;font-size:14px;font-weight:bold;font-family:sans-serif;
      text-shadow:0 1px 2px rgba(0,0,0,0.8);text-align:center;
      background:linear-gradient(180deg, #4a4a4a 0%, #2a2a2a 40%, #1a1a1a 100%);
      border:2px solid #555;border-bottom:3px solid #333;border-radius:6px;
      cursor:pointer;user-select:none;touch-action:none;
    `;
    for (const [label, onClick] of menuItems) {
      const row = document.createElement("div");
      row.textContent = label;
      row.style.cssText = btnStyle;
      row.addEventListener("touchstart", (e) => { e.preventDefault(); haptic(); onClick(); });
      row.addEventListener("mousedown", (e) => { e.preventDefault(); onClick(); });
      this.menuPanel.appendChild(row);
    }

    // Spell picker overlay
    this.spellPickerPanel = document.createElement("div");
    this.spellPickerPanel.style.cssText = `
      position:fixed;inset:0;z-index:1001;
      background:rgba(0,0,0,0.9);
      display:none;flex-direction:column;align-items:center;
      padding:20px 12px;overflow-y:auto;
    `;

    // Layout editor overlay
    this.layoutPanel = document.createElement("div");
    this.layoutPanel.style.cssText = `
      position:fixed;inset:0;z-index:1001;
      background:rgba(0,0,0,0.85);
      display:none;flex-direction:column;align-items:center;justify-content:center;
      gap:6px;padding:16px;
    `;

    this.container = document.createElement("div");
    this.container.id = "touch-controls";
    this.container.appendChild(this.dpad);
    this.container.appendChild(this.actionBar);
    this.container.appendChild(this.menuPanel);
    this.container.appendChild(this.spellPickerPanel);
    this.container.appendChild(this.layoutPanel);
  }

  private toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
    this.menuPanel.style.display = this.menuOpen ? "flex" : "none";
  }

  private closeMenu(): void {
    this.menuOpen = false;
    this.menuPanel.style.display = "none";
  }

  private debugPanel: HTMLElement = document.createElement("div");

  private openDebugMenu(): void {
    this.debugPanel.replaceChildren();
    this.debugPanel.style.cssText = `
      position:fixed;inset:0;z-index:1001;
      background:rgba(0,0,0,0.85);
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      gap:8px;padding:20px;
    `;

    const title = document.createElement("div");
    title.textContent = "Debug Tools";
    title.style.cssText = "color:#c9a84c;font-size:18px;font-weight:bold;font-family:sans-serif;margin-bottom:8px;text-shadow:0 1px 3px rgba(0,0,0,0.8);";
    this.debugPanel.appendChild(title);

    const btnStyle = `
      padding:10px 20px;min-width:200px;color:#c9a84c;font-size:14px;font-weight:bold;font-family:sans-serif;
      text-shadow:0 1px 2px rgba(0,0,0,0.8);text-align:center;
      background:linear-gradient(180deg, #4a4a4a 0%, #2a2a2a 40%, #1a1a1a 100%);
      border:2px solid #555;border-bottom:3px solid #333;border-radius:6px;
      cursor:pointer;user-select:none;touch-action:none;
    `;

    const items: [string, string][] = [
      ["Jump to Floor", "debug-f10"],
      ["Reset (Die)", "reset"],
    ];

    for (const [label, action] of items) {
      const row = document.createElement("div");
      row.textContent = label;
      row.style.cssText = btnStyle;
      row.addEventListener("touchstart", (e) => {
        e.preventDefault(); haptic();
        this.debugPanel.style.display = "none";
        this.menuHandler?.(action);
      });
      row.addEventListener("mousedown", (e) => {
        e.preventDefault();
        this.debugPanel.style.display = "none";
        this.menuHandler?.(action);
      });
      this.debugPanel.appendChild(row);
    }

    const closeRow = document.createElement("div");
    closeRow.textContent = "Close";
    closeRow.style.cssText = btnStyle;
    closeRow.addEventListener("touchstart", (e) => { e.preventDefault(); this.debugPanel.style.display = "none"; });
    closeRow.addEventListener("mousedown", (e) => { e.preventDefault(); this.debugPanel.style.display = "none"; });
    this.debugPanel.appendChild(closeRow);

    document.body.appendChild(this.debugPanel);
  }

  private openLayoutEditor(): void {
    this.layoutPanel.replaceChildren();
    const l = this.layout;
    const step = 10;

    const title = document.createElement("div");
    title.textContent = "Adjust Controls";
    title.style.cssText = "color:#c9a84c;font-size:18px;font-weight:bold;font-family:sans-serif;margin-bottom:4px;text-shadow:0 1px 3px rgba(0,0,0,0.8);";
    this.layoutPanel.appendChild(title);

    const btnCss = `
      width:40px;height:40px;display:flex;align-items:center;justify-content:center;
      background:linear-gradient(180deg,#4a4a4a 0%,#2a2a2a 40%,#1a1a1a 100%);
      color:#c9a84c;border:2px solid #555;border-radius:6px;font-size:16px;
      cursor:pointer;user-select:none;touch-action:none;font-weight:bold;
    `;
    const toggleCss = (on: boolean) => `
      padding:8px 16px;font-size:13px;font-weight:bold;font-family:sans-serif;
      color:${on ? '#4f4' : '#f44'};text-shadow:0 1px 2px rgba(0,0,0,0.8);
      background:linear-gradient(180deg,#4a4a4a 0%,#2a2a2a 40%,#1a1a1a 100%);
      border:2px solid ${on ? '#4a4' : '#644'};border-radius:6px;
      cursor:pointer;user-select:none;touch-action:none;text-align:center;
    `;

    const tap = (el: HTMLElement, fn: () => void) => {
      el.addEventListener("touchstart", (e) => { e.preventDefault(); haptic(); fn(); });
      el.addEventListener("mousedown", (e) => { e.preventDefault(); fn(); });
    };

    const makeSection = (label: string, visKey: 'dpadVisible' | 'actionVisible', xKey: 'dpadOffsetX' | 'actionOffsetX', yKey: 'dpadOffsetY' | 'actionOffsetY') => {
      const sec = document.createElement("div");
      sec.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:4px;margin:4px 0;";

      const lbl = document.createElement("div");
      lbl.style.cssText = "color:#aaa;font-size:13px;font-family:sans-serif;";
      lbl.textContent = label;
      sec.appendChild(lbl);

      // Show/Hide toggle
      const vis = document.createElement("div");
      vis.textContent = l[visKey] ? "Visible" : "Hidden";
      vis.style.cssText = toggleCss(l[visKey]);
      tap(vis, () => {
        l[visKey] = !l[visKey];
        vis.textContent = l[visKey] ? "Visible" : "Hidden";
        vis.style.cssText = toggleCss(l[visKey]);
        this.applyLayout();
      });
      sec.appendChild(vis);

      // Arrow pad for nudging
      const grid = document.createElement("div");
      grid.style.cssText = "display:grid;grid-template-columns:40px 40px 40px;gap:2px;";

      const empty = () => { const d = document.createElement("div"); d.style.width = "40px"; return d; };
      const arrow = (text: string, fn: () => void) => {
        const b = document.createElement("div");
        b.textContent = text;
        b.style.cssText = btnCss;
        tap(b, fn);
        return b;
      };

      grid.appendChild(empty());
      grid.appendChild(arrow("\u2191", () => { l[yKey] += step; this.applyLayout(); }));
      grid.appendChild(empty());
      grid.appendChild(arrow("\u2190", () => { l[xKey] -= step; this.applyLayout(); }));
      grid.appendChild(empty());
      grid.appendChild(arrow("\u2192", () => { l[xKey] += step; this.applyLayout(); }));
      grid.appendChild(empty());
      grid.appendChild(arrow("\u2193", () => { l[yKey] -= step; this.applyLayout(); }));
      grid.appendChild(empty());

      sec.appendChild(grid);
      return sec;
    };

    // D-pad section
    this.layoutPanel.appendChild(makeSection("D-Pad", "dpadVisible", "dpadOffsetX", "dpadOffsetY"));

    // Action bar section
    this.layoutPanel.appendChild(makeSection("Action Buttons", "actionVisible", "actionOffsetX", "actionOffsetY"));

    // Scale buttons
    const scaleRow = document.createElement("div");
    scaleRow.style.cssText = "display:flex;gap:6px;align-items:center;margin:4px 0;";
    const scaleLbl = document.createElement("div");
    scaleLbl.style.cssText = "color:#aaa;font-size:13px;font-family:sans-serif;margin-right:4px;";
    scaleLbl.textContent = "Size:";
    scaleRow.appendChild(scaleLbl);
    for (const [label, val] of [["S", 0.75], ["M", 1], ["L", 1.25]] as [string, number][]) {
      const b = document.createElement("div");
      b.textContent = label;
      b.style.cssText = `
        padding:8px 16px;font-size:14px;font-weight:bold;font-family:sans-serif;
        color:${l.scale === val ? '#c9a84c' : '#666'};text-shadow:0 1px 2px rgba(0,0,0,0.8);
        background:linear-gradient(180deg,#4a4a4a 0%,#2a2a2a 40%,#1a1a1a 100%);
        border:2px solid ${l.scale === val ? '#c9a84c' : '#444'};border-radius:6px;
        cursor:pointer;user-select:none;touch-action:none;text-align:center;
      `;
      tap(b, () => {
        l.scale = val;
        saveLayout(l);
        location.reload();
      });
      scaleRow.appendChild(b);
    }
    this.layoutPanel.appendChild(scaleRow);

    // Reset + Done buttons
    const bottomRow = document.createElement("div");
    bottomRow.style.cssText = "display:flex;gap:12px;margin-top:8px;";

    const resetBtn = document.createElement("div");
    resetBtn.textContent = "Reset";
    resetBtn.style.cssText = `
      padding:10px 24px;color:#f44;font-size:14px;font-weight:bold;font-family:sans-serif;
      background:linear-gradient(180deg,#4a4a4a 0%,#2a2a2a 40%,#1a1a1a 100%);
      border:2px solid #644;border-radius:6px;cursor:pointer;user-select:none;touch-action:none;
    `;
    tap(resetBtn, () => {
      this.layout = { ...DEFAULT_LAYOUT };
      saveLayout(this.layout);
      location.reload();
    });
    bottomRow.appendChild(resetBtn);

    const doneBtn = document.createElement("div");
    doneBtn.textContent = "Done";
    doneBtn.style.cssText = `
      padding:10px 24px;color:#4f4;font-size:14px;font-weight:bold;font-family:sans-serif;
      background:linear-gradient(180deg,#4a4a4a 0%,#2a2a2a 40%,#1a1a1a 100%);
      border:2px solid #4a4;border-radius:6px;cursor:pointer;user-select:none;touch-action:none;
    `;
    tap(doneBtn, () => {
      saveLayout(this.layout);
      this.layoutPanel.style.display = "none";
    });
    bottomRow.appendChild(doneBtn);

    this.layoutPanel.appendChild(bottomRow);
    this.layoutPanel.style.display = "flex";
  }

  private applyLayout(): void {
    const l = this.layout;
    this.dpad.style.display = l.dpadVisible ? "grid" : "none";
    this.dpad.style.bottom = `calc(${BTN_BOTTOM} + ${l.dpadOffsetY}px)`;
    this.dpad.style.left = `${12 + l.dpadOffsetX}px`;
    const isLandscape = window.innerWidth > window.innerHeight && window.innerHeight <= 500;
    this.actionBar.style.display = l.actionVisible ? (isLandscape ? "flex" : "grid") : "none";
    this.actionBar.style.bottom = `calc(${BTN_BOTTOM} + ${l.actionOffsetY}px)`;
    this.actionBar.style.right = `${12 + l.actionOffsetX}px`;
  }

  public openSpellPicker(): void {
    if (!this.knownSpells || this.knownSpells.length === 0) {
      // No spells known — open spell management screen instead
      this.handler?.({ type: "setScreen", screen: "spells" });
      return;
    }
    this.buildSpellPicker();
    this.spellPickerPanel.style.display = "flex";
  }

  private closeSpellPicker(): void {
    this.spellPickerPanel.style.display = "none";
  }

  private knownSpells: string[] = [];
  private heroMp = 0;

  /** Update known spells and MP for the spell picker */
  setSpellState(knownSpells: string[], mp: number): void {
    this.knownSpells = knownSpells;
    this.heroMp = mp;
  }

  private buildSpellPicker(): void {
    this.spellPickerPanel.replaceChildren();

    // Header row: title left, manage hotkeys right
    const header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;width:100%;max-width:320px;margin-bottom:8px;";

    const title = document.createElement("div");
    title.textContent = "Cast Spell";
    title.style.cssText = "color:#c9a84c;font-size:18px;font-weight:bold;font-family:sans-serif;text-shadow:0 1px 3px rgba(0,0,0,0.8);";
    header.appendChild(title);

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:6px;";

    const manageBtn = themeBtn("Hotkeys");
    const openManage = () => { this.closeSpellPicker(); this.handler?.({ type: "setScreen", screen: "spells" }); };
    manageBtn.addEventListener("touchstart", (e) => { e.preventDefault(); haptic(); openManage(); });
    manageBtn.addEventListener("click", (e) => { e.preventDefault(); openManage(); });
    btnRow.appendChild(manageBtn);

    const closeBtn = themeBtn("Close");
    closeBtn.addEventListener("touchstart", (e) => { e.preventDefault(); this.closeSpellPicker(); });
    closeBtn.addEventListener("click", (e) => { e.preventDefault(); this.closeSpellPicker(); });
    btnRow.appendChild(closeBtn);

    header.appendChild(btnRow);
    this.spellPickerPanel.appendChild(header);

    // Scrollable spell list
    const list = document.createElement("div");
    list.style.cssText = "display:flex;flex-direction:column;gap:6px;width:100%;max-width:320px;flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;";

    // Sort alphabetically
    const sorted = [...this.knownSpells]
      .map(id => ({ id, spell: SPELL_BY_ID[id] }))
      .filter(s => s.spell)
      .sort((a, b) => a.spell!.name.localeCompare(b.spell!.name));

    for (const { id, spell } of sorted) {
      if (!spell) continue;
      const canCast = this.heroMp >= spell.manaCost;
      const row = document.createElement("div");
      const targetLabel = spell.targeting === 'self' || spell.targeting === 'none'
        ? '' : spell.targeting === 'direction' ? ' \u2190\u2191\u2192\u2193' : ' \u25ce';
      row.textContent = `${spell.name} (${spell.manaCost} MP)${targetLabel}`;
      row.style.cssText = `
        padding:10px 14px;color:${canCast ? '#c9a84c' : '#555'};font-size:14px;font-weight:bold;
        font-family:sans-serif;text-shadow:0 1px 2px rgba(0,0,0,0.8);
        background:linear-gradient(180deg, #4a4a4a 0%, #2a2a2a 40%, #1a1a1a 100%);
        border:2px solid ${canCast ? '#555' : '#333'};border-bottom:3px solid #333;border-radius:6px;
        cursor:${canCast ? 'pointer' : 'default'};user-select:none;flex-shrink:0;
      `;
      if (canCast) {
        const cast = () => { this.closeSpellPicker(); this.spellCastHandler?.(id); };
        let touchStartY = 0;
        row.addEventListener("touchstart", (e) => { touchStartY = e.touches[0].clientY; });
        row.addEventListener("touchend", (e) => {
          if (Math.abs(e.changedTouches[0].clientY - touchStartY) < 10) { haptic(); cast(); }
        });
        row.addEventListener("mousedown", (e) => { e.preventDefault(); cast(); });
      }
      list.appendChild(row);
    }

    this.spellPickerPanel.appendChild(list);
  }

  /** Enter spell targeting mode — D-pad fires spell instead of moving */
  enterSpellTargetMode(spellId: string): void {
    this.spellTargetMode = true;
    this.pendingSpellId = spellId;
    // Visual: tint D-pad buttons to indicate targeting mode
    const targetBg = "linear-gradient(180deg, #4a3a20 0%, #3a2a10 40%, #2a1a08 100%)";
    for (const { btn } of this.dpadBtns) {
      btn.style.background = targetBg;
      btn.dataset.defaultBg = targetBg;
      btn.style.borderColor = "#6a5a30";
    }
    if (this.dpadCenter) {
      // Center becomes cancel (X)
      this.dpadCenter.replaceChildren();
      const x = document.createElement("span");
      x.textContent = "\u2715";
      x.style.cssText = "color:#f44;font-size:18px;";
      this.dpadCenter.appendChild(x);
      const cancelBg = "linear-gradient(180deg, #4a2020 0%, #3a1010 40%, #2a0808 100%)";
      this.dpadCenter.style.background = cancelBg;
      this.dpadCenter.dataset.defaultBg = cancelBg;
      this.dpadCenter.style.borderColor = "#6a3030";
    }
  }

  /** Exit spell targeting mode */
  cancelSpellTarget(): void {
    this.spellTargetMode = false;
    this.pendingSpellId = null;
    // Restore D-pad appearance
    const normalBg = "linear-gradient(180deg, #4a4a4a 0%, #2a2a2a 40%, #1a1a1a 100%)";
    for (const { btn } of this.dpadBtns) {
      btn.style.background = normalBg;
      btn.dataset.defaultBg = normalBg;
      btn.style.borderColor = "#555";
    }
    if (this.dpadCenter) {
      this.dpadCenter.replaceChildren();
      this.dpadCenter.appendChild(createActionIcon("auto"));
      const centerBg = "linear-gradient(180deg, #3a3020 0%, #2a2010 40%, #1a1508 100%)";
      this.dpadCenter.style.background = centerBg;
      this.dpadCenter.dataset.defaultBg = centerBg;
      this.dpadCenter.style.borderColor = "#4a3a20";
    }
  }

  setHandler(handler: TouchActionHandler): void {
    this.handler = handler;
  }

  setAutoExploreHandler(handler: () => void): void {
    this.autoExploreHandler = handler;
  }

  setMenuHandler(handler: MenuActionHandler): void {
    this.menuHandler = handler;
  }

  setSpellCastHandler(handler: SpellCastHandler): void {
    this.spellCastHandler = handler;
  }

  show(): void {
    if (!this.visible) {
      document.body.appendChild(this.container);
      this.visible = true;
    }
  }

  hide(): void {
    if (this.visible) {
      releaseActive();
      this.cancelSpellTarget();
      this.closeSpellPicker();
      this.container.remove();
      this.visible = false;
    }
  }

  static isTouchDevice(): boolean {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }
}
