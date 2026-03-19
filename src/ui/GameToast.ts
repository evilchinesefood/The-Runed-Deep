// ============================================================
// Game toast — brief notifications for item actions
// Uses same visual style as achievement toasts
// ============================================================

let toastQueue: HTMLElement[] = [];

export type ToastType = 'info' | 'success' | 'warning' | 'error';

const TOAST_COLORS: Record<ToastType, { border: string; bg: string; icon: string }> = {
  info:    { border: '#48f', bg: 'linear-gradient(135deg, #0a1a2a, #1a2a3a)', icon: 'ℹ' },
  success: { border: '#4f4', bg: 'linear-gradient(135deg, #0a2a0a, #1a3a1a)', icon: '✓' },
  warning: { border: '#fa0', bg: 'linear-gradient(135deg, #2a1a00, #3a2a10)', icon: '⚠' },
  error:   { border: '#f44', bg: 'linear-gradient(135deg, #2a0a0a, #3a1a1a)', icon: '✗' },
};

export function showGameToast(message: string, type: ToastType = 'info', duration = 2000): void {
  const colors = TOAST_COLORS[type];

  const toast = document.createElement('div');
  const yOffset = 10 + toastQueue.length * 48;
  toast.style.cssText = `
    position: fixed;
    top: ${yOffset}px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    background: ${colors.bg};
    border: 1px solid ${colors.border};
    border-radius: 6px;
    padding: 8px 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: 'Segoe UI', sans-serif;
    box-shadow: 0 2px 12px rgba(0,0,0,0.5);
    animation: gameToastSlide 0.2s ease-out;
    transition: opacity 0.4s;
    max-width: 400px;
  `;

  const iconEl = document.createElement('span');
  iconEl.textContent = colors.icon;
  iconEl.style.cssText = `font-size: 16px; color: ${colors.border};`;
  toast.appendChild(iconEl);

  const textEl = document.createElement('span');
  textEl.textContent = message;
  textEl.style.cssText = 'font-size: 12px; color: #ccc;';
  toast.appendChild(textEl);

  // Animation
  if (!document.getElementById('game-toast-style')) {
    const style = document.createElement('style');
    style.id = 'game-toast-style';
    style.textContent = `@keyframes gameToastSlide { from { opacity: 0; transform: translateX(-50%) translateY(-20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);
  toastQueue.push(toast);

  setTimeout(() => { toast.style.opacity = '0'; }, duration - 400);
  setTimeout(() => {
    toast.remove();
    toastQueue = toastQueue.filter(t => t !== toast);
  }, duration);
}
