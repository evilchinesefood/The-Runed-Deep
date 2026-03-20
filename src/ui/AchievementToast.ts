import type { Achievement } from "../systems/Achievements";

export function showAchievementToast(achievement: Achievement): void {
  const toast = document.createElement("div");
  toast.style.cssText = `
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10000;
    background: linear-gradient(135deg, #2a1a00, #3a2a10);
    border: 2px solid #c90;
    border-radius: 8px;
    padding: 12px 20px;
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: 'Segoe UI', sans-serif;
    box-shadow: 0 4px 16px rgba(0,0,0,0.6);
    animation: achieveSlide 0.3s ease-out;
    transition: opacity 0.5s;
  `;

  const iconEl = document.createElement("span");
  iconEl.textContent = achievement.icon;
  iconEl.style.cssText = "font-size: 24px;";
  toast.appendChild(iconEl);

  const textEl = document.createElement("div");
  const titleEl = document.createElement("div");
  titleEl.textContent = "Achievement Unlocked!";
  titleEl.style.cssText =
    "font-size: 10px; color: #c90; text-transform: uppercase; letter-spacing: 1px;";
  textEl.appendChild(titleEl);
  const nameEl = document.createElement("div");
  nameEl.textContent = achievement.name;
  nameEl.style.cssText = "font-size: 14px; color: #fff; font-weight: bold;";
  textEl.appendChild(nameEl);
  const descEl = document.createElement("div");
  descEl.textContent = achievement.description;
  descEl.style.cssText = "font-size: 11px; color: #888;";
  textEl.appendChild(descEl);
  toast.appendChild(textEl);

  if (!document.getElementById("achieve-slide-style")) {
    const style = document.createElement("style");
    style.id = "achieve-slide-style";
    style.textContent = `@keyframes achieveSlide { from { top: -60px; opacity: 0; } to { top: 10px; opacity: 1; } }`;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
  }, 2500);
  setTimeout(() => {
    toast.remove();
  }, 3000);
}
