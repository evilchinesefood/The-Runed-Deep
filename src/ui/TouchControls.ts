import type { GameAction } from "../core/types";

export type TouchActionHandler = (action: GameAction) => void;

let activeBtn: HTMLElement | null = null;

function releaseActive(): void {
  if (activeBtn) {
    activeBtn.style.background = activeBtn.dataset.defaultBg ?? "";
    activeBtn.style.transform = "";
    activeBtn.style.borderBottomWidth = "3px";
    activeBtn = null;
  }
}

document.addEventListener("touchend", releaseActive, { passive: true });
document.addEventListener("touchcancel", releaseActive, { passive: true });
document.addEventListener("mouseup", releaseActive);

function haptic(): void {
  if (navigator.vibrate) navigator.vibrate(10);
}

function makeBtn(
  size: number,
  onClick: () => void,
  isDpad = false,
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

function createPauseIcon(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("viewBox", "0 0 16 16");
  const r1 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  r1.setAttribute("x", "3"); r1.setAttribute("y", "2");
  r1.setAttribute("width", "4"); r1.setAttribute("height", "12");
  r1.setAttribute("rx", "1"); r1.setAttribute("fill", "#666");
  const r2 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  r2.setAttribute("x", "9"); r2.setAttribute("y", "2");
  r2.setAttribute("width", "4"); r2.setAttribute("height", "12");
  r2.setAttribute("rx", "1"); r2.setAttribute("fill", "#666");
  svg.appendChild(r1);
  svg.appendChild(r2);
  return svg;
}

// SVG icons for mobile action buttons
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
  }
  return svg;
}

export class TouchControls {
  private container: HTMLElement;
  private dpad: HTMLElement;
  private actionBar: HTMLElement;
  private handler: TouchActionHandler | null = null;
  private autoExploreHandler: (() => void) | null = null;
  private visible = false;
  private dpadVisible = true;

  constructor() {
    // D-pad — consistent SVG arrows in a 3x3 grid
    this.dpad = document.createElement("div");
    this.dpad.style.cssText = `
      position:fixed;bottom:calc(16px + env(safe-area-inset-bottom, 0px));left:12px;z-index:1000;
      display:grid;grid-template-columns:48px 48px 48px;grid-template-rows:48px 48px 48px;
      gap:3px;touch-action:none;
    `;

    // Direction: [gridPos, svgRotation, direction]
    const dirs: [string, number, import("../core/types").Direction | null][] = [
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
      const btn = makeBtn(48, () => {
        if (isCenter) this.handler?.({ type: "rest" });
        else this.handler?.({ type: "move", direction: dir! });
      }, true);
      btn.appendChild(isCenter ? createPauseIcon() : createArrowIcon(rot));
      btn.style.gridRow = row;
      btn.style.gridColumn = col;
      if (isCenter) {
        const centerBg = "linear-gradient(180deg, #3a3020 0%, #2a2010 40%, #1a1508 100%)";
        btn.style.background = centerBg;
        btn.dataset.defaultBg = centerBg;
        btn.style.borderColor = "#4a3a20";
      }
      this.dpad.appendChild(btn);
    }

    // Action buttons — right side
    // Mobile: 2-wide grid with icons, no labels. Desktop: vertical stack with labels.
    const isMobile = true; // always use mobile icon view
    const isPortrait = isMobile && window.innerHeight > window.innerWidth;
    this.actionBar = document.createElement("div");
    if (isPortrait) {
      this.actionBar.style.cssText = `
        position:fixed;bottom:calc(16px + env(safe-area-inset-bottom, 0px));right:12px;z-index:1000;
        display:grid;grid-template-columns:44px 44px;gap:6px;touch-action:none;
      `;
    } else if (isMobile) {
      this.actionBar.style.cssText = `
        position:fixed;bottom:calc(16px + env(safe-area-inset-bottom, 0px));right:12px;z-index:1000;
        display:flex;flex-direction:column;gap:6px;touch-action:none;
      `;
    } else {
      this.actionBar.style.cssText = `
        position:fixed;bottom:calc(16px + env(safe-area-inset-bottom, 0px));right:12px;z-index:1000;
        display:flex;flex-direction:column;gap:6px;touch-action:none;
      `;
    }

    const actions: [string, GameAction | null][] = [
      ["action", { type: "contextAction" }],
      ["auto", null],
      ["items", { type: "setScreen", screen: "inventory" }],
      ["spells", { type: "setScreen", screen: "spells" }],
      ["map", { type: "setScreen", screen: "map" }],
    ];

    for (const [id, action] of actions) {
      const btn = makeBtn(44, () => {
        if (action === null) this.autoExploreHandler?.();
        else this.handler?.(action);
      });
      if (isMobile) {
        btn.appendChild(createActionIcon(id));
      } else {
        // Desktop: use icon for auto, letters for rest
        if (id === "auto") {
          btn.appendChild(createActionIcon("auto"));
        } else {
          btn.textContent = { action: "E", items: "I", spells: "Z", map: "M" }[id] ?? "";
        }
      }
      btn.title = { action: "Action", items: "Items", spells: "Spells", map: "Map", auto: "Auto-Explore" }[id] ?? "";
      if (!isMobile) {
        const row = document.createElement("div");
        row.style.cssText = "display:flex;align-items:center;gap:6px;";
        row.appendChild(btn);
        const lbl = document.createElement("div");
        lbl.textContent = btn.title;
        lbl.style.cssText = "color:#666;font-size:11px;font-family:sans-serif;width:40px;";
        row.appendChild(lbl);
        this.actionBar.appendChild(row);
      } else {
        this.actionBar.appendChild(btn);
      }
    }

    // D-pad toggle button
    const toggleBtn = makeBtn(44, () => {
      this.dpadVisible = !this.dpadVisible;
      this.dpad.style.display = this.dpadVisible ? "grid" : "none";
      toggleBtn.style.opacity = this.dpadVisible ? "1" : "0.5";
    });
    if (isMobile) {
      toggleBtn.appendChild(createActionIcon("dpad"));
    } else {
      toggleBtn.textContent = "\u2630";
    }
    toggleBtn.title = "D-pad";
    if (!isMobile) {
      const toggleRow = document.createElement("div");
      toggleRow.style.cssText = "display:flex;align-items:center;gap:6px;margin-top:4px;";
      toggleRow.appendChild(toggleBtn);
      const toggleLbl = document.createElement("div");
      toggleLbl.textContent = "D-pad";
      toggleLbl.style.cssText = "color:#666;font-size:11px;font-family:sans-serif;width:40px;";
      toggleRow.appendChild(toggleLbl);
      this.actionBar.appendChild(toggleRow);
    } else {
      this.actionBar.appendChild(toggleBtn);
    }

    this.container = document.createElement("div");
    this.container.id = "touch-controls";
    this.container.appendChild(this.dpad);
    this.container.appendChild(this.actionBar);
  }

  setHandler(handler: TouchActionHandler): void {
    this.handler = handler;
  }

  setAutoExploreHandler(handler: () => void): void {
    this.autoExploreHandler = handler;
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
      this.container.remove();
      this.visible = false;
    }
  }

  static isTouchDevice(): boolean {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }
}
