// ============================================================
// Town services — temple, sage, bank, inn
// ============================================================

import type { GameState } from "../../core/types";
import { recomputeDerivedStats } from "../character/derived-stats";
import { ITEM_BY_ID } from "../../data/items";

const AFFIX_SUFFIXES = ["of Power", "of the Ancients", "of Legends", "of the Gods", "of Valor"];

function addMsg(
  state: GameState,
  text: string,
  severity: "normal" | "important" | "system" = "important",
): GameState {
  return {
    ...state,
    messages: [...state.messages, { text, severity, turn: state.turn }],
  };
}

function spendCopper(state: GameState, amount: number): GameState {
  return {
    ...state,
    hero: { ...state.hero, copper: state.hero.copper - amount },
  };
}

function checkCopper(state: GameState, cost: number): GameState | null {
  if (state.hero.copper < cost) {
    return addMsg(state, `You need ${cost} gold for that.`, "system");
  }
  return null;
}

// ── Temple (all free except remove curse) ─────────────────

export function templeHealHP(state: GameState): GameState {
  const missing = state.hero.maxHp - state.hero.hp;
  if (missing <= 0)
    return addMsg(state, "Your health is already full.", "system");
  return addMsg(
    { ...state, hero: { ...state.hero, hp: state.hero.maxHp } },
    "The temple heals you fully.",
  );
}

export function templeHealMP(state: GameState): GameState {
  const missing = state.hero.maxMp - state.hero.mp;
  if (missing <= 0)
    return addMsg(state, "Your mana is already full.", "system");
  return addMsg(
    { ...state, hero: { ...state.hero, mp: state.hero.maxMp } },
    "The temple restores your mana.",
  );
}

export function templeCurePoison(state: GameState): GameState {
  const poisoned = state.hero.activeEffects.some((e) => e.id === "poisoned");
  if (!poisoned) return addMsg(state, "You are not poisoned.", "system");
  return addMsg(
    {
      ...state,
      hero: {
        ...state.hero,
        activeEffects: state.hero.activeEffects.filter(
          (e) => e.id !== "poisoned",
        ),
      },
    },
    "The poison is purged from your body.",
  );
}

export function templeRemoveCurse(state: GameState, itemId: string): GameState {
  const cost = 25;
  const err = checkCopper(state, cost);
  if (err) return err;

  // Search inventory
  const invIdx = state.hero.inventory.findIndex(i => i.id === itemId);
  if (invIdx !== -1) {
    const item = state.hero.inventory[invIdx];
    if (!item.cursed) return addMsg(state, "That item is not cursed.", "system");
    const blessed = blessItem(item);
    const inv = state.hero.inventory.map((i, idx) => idx === invIdx ? blessed : i);
    return addMsg(
      spendCopper({ ...state, hero: recomputeDerivedStats({ ...state.hero, inventory: inv }) }, cost),
      `The curse is lifted! ${blessed.name} is now blessed.`,
    );
  }

  // Search equipment
  const eq = state.hero.equipment;
  const slots = Object.keys(eq) as (keyof typeof eq)[];
  const slot = slots.find(s => eq[s]?.id === itemId);
  if (slot) {
    const item = eq[slot]!;
    if (!item.cursed) return addMsg(state, "That item is not cursed.", "system");
    const blessed = blessItem(item);
    return addMsg(
      spendCopper({ ...state, hero: recomputeDerivedStats({ ...state.hero, equipment: { ...eq, [slot]: blessed } }) }, cost),
      `The curse is lifted! ${blessed.name} is now blessed.`,
    );
  }

  return addMsg(state, "Item not found.", "system");
}

/** Convert a cursed item into a blessed one: flip negative enchant to positive */
function blessItem(item: import("../../core/types").Item): import("../../core/types").Item {
  const newEnch = Math.abs(item.enchantment);
  const tpl = ITEM_BY_ID[item.templateId];
  const baseName = tpl?.name ?? item.name.replace(/\s*[+-]\d+.*$/, '');
  const baseValue = tpl?.value ?? 50;

  // Preserve affix suffix
  let suffix = '';
  for (const s of AFFIX_SUFFIXES) {
    if (item.name.includes(s)) { suffix = ` ${s}`; break; }
  }

  const enchStr = newEnch > 0 ? ` +${newEnch}` : '';
  return {
    ...item,
    cursed: false,
    blessed: true,
    enchantment: newEnch,
    name: `${baseName}${enchStr}${suffix}`,
    identified: true,
    value: Math.max(1, baseValue + newEnch * 20),
  };
}

// ── Sage (Enchanter) ────────────────────────────────────

/** Max enchanter upgrades: +2 base, +2 per NG+ cycle */
export function getEnchanterCap(ngPlus: number): number {
  return 2 + ngPlus * 2;
}

export function sageEnchantItem(state: GameState, itemId: string): GameState {
  const cost = 100;
  const err = checkCopper(state, cost);
  if (err) return err;

  const cap = getEnchanterCap(state.ngPlusCount ?? 0);

  // Search inventory
  const invIdx = state.hero.inventory.findIndex(i => i.id === itemId);
  if (invIdx !== -1) {
    const item = state.hero.inventory[invIdx];
    if ((item.properties['enchanterUps'] ?? 0) >= cap) {
      return addMsg(state, `This item has reached the enchanter limit (+${cap}).`, "system");
    }
    const enhanced = enchantItem(item);
    const inv = state.hero.inventory.map((i, idx) => idx === invIdx ? enhanced : i);
    return addMsg(
      spendCopper({ ...state, hero: recomputeDerivedStats({ ...state.hero, inventory: inv }) }, cost),
      `The sage enchants your ${enhanced.name}!`,
    );
  }

  // Search equipment
  const eq = state.hero.equipment;
  const slots = Object.keys(eq) as (keyof typeof eq)[];
  const slot = slots.find(s => eq[s]?.id === itemId);
  if (slot) {
    const item = eq[slot]!;
    if ((item.properties['enchanterUps'] ?? 0) >= cap) {
      return addMsg(state, `This item has reached the enchanter limit (+${cap}).`, "system");
    }
    const enhanced = enchantItem(item);
    return addMsg(
      spendCopper({ ...state, hero: recomputeDerivedStats({ ...state.hero, equipment: { ...eq, [slot]: enhanced } }) }, cost),
      `The sage enchants your ${enhanced.name}!`,
    );
  }

  return addMsg(state, "Item not found.", "system");
}

/** Add +1 enchantment to an item, rebuild name correctly */
function enchantItem(item: import("../../core/types").Item): import("../../core/types").Item {
  const newEnch = item.enchantment + 1;
  const tpl = ITEM_BY_ID[item.templateId];
  const baseName = tpl?.name ?? item.name.replace(/\s*[+-]\d+.*$/, '');

  // Detect affix suffix (e.g. "of Valor") from the current name
  let suffix = '';
  for (const s of AFFIX_SUFFIXES) {
    if (item.name.includes(s)) { suffix = ` ${s}`; break; }
  }

  const enchStr = newEnch > 0 ? ` +${newEnch}` : newEnch < 0 ? ` ${newEnch}` : '';
  return {
    ...item,
    enchantment: newEnch,
    name: `${baseName}${enchStr}${suffix}`,
    value: Math.max(1, (tpl?.value ?? 50) + newEnch * 20),
    properties: { ...item.properties, enchanterUps: (item.properties['enchanterUps'] ?? 0) + 1 },
  };
}

// ── Bank ─────────────────────────────────────────────────

export function bankDeposit(state: GameState, amount: number): GameState {
  const actual = Math.min(amount, state.hero.copper);
  if (actual <= 0)
    return addMsg(state, "You have no gold to deposit.", "system");
  return addMsg(
    {
      ...state,
      hero: { ...state.hero, copper: state.hero.copper - actual },
      town: { ...state.town, bankBalance: state.town.bankBalance + actual },
    },
    `You deposit ${actual} gold.`,
  );
}

export function bankWithdraw(state: GameState, amount: number): GameState {
  const actual = Math.min(amount, state.town.bankBalance);
  if (actual <= 0) return addMsg(state, "Nothing to withdraw.", "system");
  return addMsg(
    {
      ...state,
      hero: { ...state.hero, copper: state.hero.copper + actual },
      town: { ...state.town, bankBalance: state.town.bankBalance - actual },
    },
    `You withdraw ${actual} gold.`,
  );
}

// ── Inn (free) ──────────────────────────────────────────

export function innRest(state: GameState): GameState {
  if (state.hero.hp >= state.hero.maxHp && state.hero.mp >= state.hero.maxMp) {
    return addMsg(state, "You are already fully rested.", "system");
  }

  const rested = recomputeDerivedStats({
    ...state.hero,
    hp: state.hero.maxHp,
    mp: state.hero.maxMp,
  });
  return addMsg(
    { ...state, hero: rested },
    "You sleep soundly and wake fully restored.",
  );
}
