// ============================================================
// Design System — CSS Variables + Reusable Helpers
// ============================================================

let injected = false;

export function injectTheme(): void {
  if (injected) return;
  injected = true;

  const style = document.createElement("style");
  style.id = "cotw-theme";
  style.textContent = `
    :root {
      /* Colors */
      --bg: #000;
      --bg-panel: #111;
      --bg-panel-hover: #1a1a1a;
      --bg-input: #1a1a1a;
      --bg-button: #333;
      --bg-button-hover: #444;
      --bg-button-active: #555;
      --border: #333;
      --border-light: #444;
      --border-focus: #666;
      --text: #ccc;
      --text-dim: #888;
      --text-muted: #555;
      --accent: #c90;
      --accent-dim: #a70;
      --hp-good: #4f4;
      --hp-warn: #fa0;
      --hp-crit: #f44;
      --mp: #48f;
      --str: #e44;
      --int: #48f;
      --con: #4c4;
      --dex: #fc4;
      --cursed: #f44;
      --enchanted: #4af;

      /* Spacing */
      --sp-xs: 4px;
      --sp-sm: 8px;
      --sp-md: 12px;
      --sp-lg: 16px;
      --sp-xl: 24px;

      /* Sizing */
      --game-width: min(672px, calc(100vw - 16px));
      --panel-width: min(550px, calc(100vw - 16px));
      --panel-narrow: min(480px, calc(100vw - 16px));

      /* Font */
      --font: 'Segoe UI', Tahoma, Geneva, sans-serif;
      --font-mono: 'Consolas', 'Monaco', monospace;
      --fs-xs: 10px;
      --fs-sm: 11px;
      --fs-md: 13px;
      --fs-lg: 16px;
      --fs-xl: 20px;
      --fs-title: 22px;

      /* Borders */
      --radius: 4px;
      --radius-lg: 8px;
    }

    *, *::before, *::after { box-sizing: border-box; }

    body {
      margin: 0;
      padding: 0;
      background: var(--bg);
      font-family: var(--font);
      color: var(--text);
      overflow-x: hidden;
      min-height: 100vh;
    }

    #game-root {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }

    /* Scrollbar styling */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: var(--bg-panel); }
    ::-webkit-scrollbar-thumb { background: var(--border-light); border-radius: 3px; }

    /* Screen container — centers all content */
    .screen {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      max-width: var(--game-width);
      padding: var(--sp-lg);
      margin: 0 auto;
    }

    /* Scrollable screen — hides scrollbar but allows scroll */
    .screen-scrollable {
      overflow-y: auto;
      max-height: 100vh;
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    .screen-scrollable::-webkit-scrollbar { display: none; }

    /* Panel — standard card component */
    .panel {
      width: 100%;
      background: var(--bg-panel);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: var(--sp-lg);
      margin-bottom: var(--sp-sm);
    }

    .panel-header {
      font-size: var(--fs-sm);
      font-weight: bold;
      color: var(--accent);
      letter-spacing: 0.5px;
      margin-bottom: var(--sp-md);
      padding-bottom: var(--sp-xs);
      border-bottom: 1px solid var(--border);
    }

    /* Buttons */
    .btn {
      padding: 6px 16px;
      font-size: var(--fs-md);
      font-family: var(--font);
      background: var(--bg-button);
      color: var(--text);
      border: 1px solid var(--border-focus);
      border-radius: var(--radius);
      cursor: pointer;
      user-select: none;
      transition: background 0.1s, transform 0.1s;
      min-height: 32px;
    }
    .btn:hover { background: var(--bg-button-hover); }
    .btn:active { background: var(--bg-button-active); transform: scale(0.96); }

    .btn-primary {
      background: #530;
      color: #fc0;
      border: 2px solid var(--accent);
      font-size: var(--fs-lg);
      padding: 10px 32px;
      letter-spacing: 1px;
    }
    .btn-primary:hover { background: #640; }

    .btn-danger {
      background: #411;
      color: #f66;
      border: 1px solid #633;
    }
    .btn-danger:hover { background: #522; }

    .btn-sm {
      padding: 4px 10px;
      font-size: 12px;
      min-height: 28px;
    }

    /* Title bar — used at top of most screens */
    .title-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      margin-bottom: var(--sp-sm);
    }
    .title-bar h2 {
      color: var(--accent);
      margin: 0;
      font-size: var(--fs-title);
    }

    /* Stat row */
    .stat-row {
      display: flex;
      gap: var(--sp-sm);
      font-size: var(--fs-md);
      margin-bottom: 2px;
    }
    .stat-label { color: var(--text-dim); }
    .stat-value { color: var(--text); font-weight: bold; }

    /* Item row */
    .item-row {
      display: flex;
      align-items: center;
      gap: var(--sp-sm);
      padding: 3px 6px;
      border-radius: var(--radius);
      cursor: pointer;
      transition: background 0.1s;
    }
    .item-row:hover { background: var(--bg-panel-hover); }
    .item-row.selected { background: #222; }

    /* Footer */
    .footer {
      display: flex;
      gap: var(--sp-lg);
      flex-wrap: wrap;
      font-size: var(--fs-md);
      color: var(--text-dim);
      width: 100%;
      background: var(--bg-panel);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: var(--sp-sm) var(--sp-md);
    }

    /* Game layout — map + HUD centered */
    .game-layout {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      max-width: var(--game-width);
      margin: 0 auto;
      padding-top: var(--sp-sm);
    }

    /* Responsive — tablet */
    @media (max-width: 720px) {
      :root {
        --sp-lg: 14px;
        --sp-xl: 20px;
        --fs-title: 20px;
      }
      .footer { gap: var(--sp-sm); }
    }

    /* Responsive — large phone */
    @media (max-width: 480px) {
      :root {
        --sp-lg: 10px;
        --sp-xl: 14px;
        --fs-title: 18px;
        --fs-lg: 14px;
        --fs-md: 13px;
        --fs-sm: 11px;
      }
      .btn { padding: 8px 14px; min-height: 36px; }
      .btn-sm { padding: 6px 10px; min-height: 32px; font-size: 12px; }
      .btn-primary { padding: 12px 24px; }
      .panel { padding: var(--sp-sm); }
    }

    /* Responsive — small phone */
    @media (max-width: 380px) {
      :root {
        --sp-lg: 8px;
        --sp-xl: 12px;
        --fs-title: 16px;
        --fs-lg: 13px;
      }
      .screen { padding: var(--sp-sm); }
      .btn { padding: 8px 10px; font-size: 12px; }
    }
  `;
  document.head.appendChild(style);
}

// ── Helper functions ───────────────────────────────────────

export function el(
  tag: string,
  styles?: Partial<CSSStyleDeclaration>,
  text?: string,
): HTMLElement {
  const e = document.createElement(tag);
  if (styles) Object.assign(e.style, styles);
  if (text !== undefined) e.textContent = text;
  return e;
}

export function createScreen(): HTMLElement {
  const s = document.createElement("div");
  s.className = "screen";
  return s;
}

export function createPanel(headerText?: string): HTMLElement {
  const p = document.createElement("div");
  p.className = "panel";
  if (headerText) {
    const h = document.createElement("div");
    h.className = "panel-header";
    h.textContent = headerText;
    p.appendChild(h);
  }
  return p;
}

export function createTitleBar(
  title: string,
  onClose?: () => void,
): HTMLElement {
  const bar = document.createElement("div");
  bar.className = "title-bar";
  const h2 = document.createElement("h2");
  h2.textContent = title;
  bar.appendChild(h2);
  if (onClose) {
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = "Close (Esc)";
    btn.addEventListener("click", onClose);
    bar.appendChild(btn);
  }
  return bar;
}

export function createButton(
  text: string,
  variant: "default" | "primary" | "danger" | "sm" = "default",
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.textContent = text;
  const classes = ["btn"];
  if (variant === "primary") classes.push("btn-primary");
  if (variant === "danger") classes.push("btn-danger");
  if (variant === "sm") classes.push("btn-sm");
  btn.className = classes.join(" ");
  return btn;
}
