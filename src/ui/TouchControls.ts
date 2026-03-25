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

// Haptic feedback (iOS Safari)
function haptic(): void {
  if (navigator.vibrate) navigator.vibrate(10);
}

function makeBtn(
  content: string,
  size: number,
  onClick: () => void,
  isDpad = false,
): HTMLElement {
  const btn = document.createElement("div");
  btn.textContent = content;
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
    font-size:${isDpad ? '20px' : '14px'};
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

export class TouchControls {
  private container: HTMLElement;
  private dpad: HTMLElement;
  private actionBar: HTMLElement;
  private handler: TouchActionHandler | null = null;
  private autoExploreHandler: (() => void) | null = null;
  private visible = false;

  constructor() {
    // D-pad — circular buttons in a 3x3 grid
    this.dpad = document.createElement("div");
    this.dpad.style.cssText = `
      position:fixed;bottom:calc(16px + env(safe-area-inset-bottom, 0px));left:12px;z-index:1000;
      display:grid;grid-template-columns:52px 52px 52px;grid-template-rows:52px 52px 52px;
      gap:3px;touch-action:none;
    `;

    const dirs: [string, string, import("../core/types").Direction | null][] = [
      ["1/1", "\u2196", "NW"],
      ["1/2", "\u2191", "N"],
      ["1/3", "\u2197", "NE"],
      ["2/1", "\u2190", "W"],
      ["2/2", "\u23F8", null],
      ["2/3", "\u2192", "E"],
      ["3/1", "\u2199", "SW"],
      ["3/2", "\u2193", "S"],
      ["3/3", "\u2198", "SE"],
    ];

    for (const [pos, arrow, dir] of dirs) {
      const [row, col] = pos.split("/");
      const isCenter = dir === null;
      const btn = makeBtn(arrow, 52, () => {
        if (isCenter) this.handler?.({ type: "rest" });
        else this.handler?.({ type: "move", direction: dir! });
      }, true);
      btn.style.gridRow = row;
      btn.style.gridColumn = col;
      if (isCenter) {
        const centerBg = "linear-gradient(180deg, #3a3020 0%, #2a2010 40%, #1a1508 100%)";
        btn.style.background = centerBg;
        btn.dataset.defaultBg = centerBg;
        btn.style.color = "#555";
        btn.style.fontSize = "14px";
        btn.style.borderColor = "#4a3a20";
      }
      this.dpad.appendChild(btn);
    }

    // Action buttons — right side, vertical stack
    this.actionBar = document.createElement("div");
    this.actionBar.style.cssText = `
      position:fixed;bottom:calc(16px + env(safe-area-inset-bottom, 0px));right:12px;z-index:1000;
      display:flex;flex-direction:column;gap:6px;touch-action:none;
    `;

    const actions: [string, string, GameAction | null][] = [
      ["E", "Action", { type: "contextAction" }],
      ["I", "Items", { type: "setScreen", screen: "inventory" }],
      ["Z", "Spells", { type: "setScreen", screen: "spells" }],
      ["M", "Map", { type: "setScreen", screen: "map" }],
      ["\u27A4", "Auto", null], // auto-explore (Tab equivalent)
    ];

    for (const [key, label, action] of actions) {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;gap:6px;";

      const btn = makeBtn(key, 48, () => {
        if (action === null) this.autoExploreHandler?.();
        else this.handler?.(action);
      });
      row.appendChild(btn);

      const lbl = document.createElement("div");
      lbl.textContent = label;
      lbl.style.cssText = "color:#666;font-size:11px;font-family:sans-serif;width:44px;";
      row.appendChild(lbl);

      this.actionBar.appendChild(row);
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
