// ============================================================
// Town services — temple, sage, blacksmith, inn
// ============================================================

import type { GameState, Item } from "../../core/types";
import { recomputeDerivedStats } from "../character/derived-stats";
import { ITEM_BY_ID } from "../../data/items";
import { AFFIXES, AFFIX_BY_ID, type Affix } from "../../data/Enchantments";

/** Extract affix suffix like "of Vampiric" from item name */
function extractAffixSuffix(name: string): string {
  const match = name.match(/\s+(of\s+.+)$/);
  return match ? match[1] : "";
}

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

function spendGold(state: GameState, amount: number): GameState {
  return {
    ...state,
    hero: { ...state.hero, gold: state.hero.gold - amount },
  };
}

function checkGold(state: GameState, cost: number): GameState | null {
  if (state.hero.gold < cost) {
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
  const cost = 10;
  const err = checkGold(state, cost);
  if (err) return err;

  // Search inventory
  const invIdx = state.hero.inventory.findIndex((i) => i.id === itemId);
  if (invIdx !== -1) {
    const item = state.hero.inventory[invIdx];
    if (!item.cursed)
      return addMsg(state, "That item is not cursed.", "system");
    const blessed = blessItem(item);
    const inv = state.hero.inventory.map((i, idx) =>
      idx === invIdx ? blessed : i,
    );
    return addMsg(
      spendGold(
        {
          ...state,
          hero: recomputeDerivedStats(
            { ...state.hero, inventory: inv },
            state.statueUpgrades,
          ),
        },
        cost,
      ),
      `The curse is lifted! ${blessed.name} is now blessed.`,
    );
  }

  // Search equipment
  const eq = state.hero.equipment;
  const slots = Object.keys(eq) as (keyof typeof eq)[];
  const slot = slots.find((s) => eq[s]?.id === itemId);
  if (slot) {
    const item = eq[slot]!;
    if (!item.cursed)
      return addMsg(state, "That item is not cursed.", "system");
    const blessed = blessItem(item);
    return addMsg(
      spendGold(
        {
          ...state,
          hero: recomputeDerivedStats(
            {
              ...state.hero,
              equipment: { ...eq, [slot]: blessed },
            },
            state.statueUpgrades,
          ),
        },
        cost,
      ),
      `The curse is lifted! ${blessed.name} is now blessed.`,
    );
  }

  return addMsg(state, "Item not found.", "system");
}

/** Convert a cursed item into a blessed one: flip negative enchant to positive */
export function blessItem(
  item: import("../../core/types").Item,
): import("../../core/types").Item {
  const newEnch = Math.abs(item.enchantment);
  const tpl = ITEM_BY_ID[item.templateId];
  const baseName = tpl?.name ?? item.name.replace(/\s*[+-]\d+.*$/, "");
  const baseValue = tpl?.value ?? 50;

  // Preserve affix suffix
  const suffix = extractAffixSuffix(item.name);
  const suffixStr = suffix ? ` ${suffix}` : "";

  const enchStr = newEnch > 0 ? ` +${newEnch}` : "";
  return {
    ...item,
    cursed: false,
    blessed: true,
    enchantment: newEnch,
    name: `${baseName}${enchStr}${suffixStr}`,
    identified: true,
    value: Math.max(1, baseValue + newEnch * 20),
  };
}

// ── Sage (Enchanter) ────────────────────────────────────

/** Max enchanter upgrades: +2 base, +3 per NG+ cycle */
export function getEnchanterCap(ngPlus: number): number {
  return 2 + ngPlus * 3;
}

export function sageEnchantItem(state: GameState, itemId: string): GameState {
  const cost = 100;
  const err = checkGold(state, cost);
  if (err) return err;

  const cap = getEnchanterCap(state.ngPlusCount ?? 0);

  // Search inventory
  const invIdx = state.hero.inventory.findIndex((i) => i.id === itemId);
  if (invIdx !== -1) {
    const item = state.hero.inventory[invIdx];
    if ((item.properties["enchanterUps"] ?? 0) >= cap) {
      return addMsg(
        state,
        `This item has reached the enchanter limit (+${cap}).`,
        "system",
      );
    }
    const enhanced = enchantItem(item);
    const inv = state.hero.inventory.map((i, idx) =>
      idx === invIdx ? enhanced : i,
    );
    return addMsg(
      spendGold(
        {
          ...state,
          hero: recomputeDerivedStats(
            { ...state.hero, inventory: inv },
            state.statueUpgrades,
          ),
        },
        cost,
      ),
      `The sage enchants your ${enhanced.name}!`,
    );
  }

  // Search equipment
  const eq = state.hero.equipment;
  const slots = Object.keys(eq) as (keyof typeof eq)[];
  const slot = slots.find((s) => eq[s]?.id === itemId);
  if (slot) {
    const item = eq[slot]!;
    if ((item.properties["enchanterUps"] ?? 0) >= cap) {
      return addMsg(
        state,
        `This item has reached the enchanter limit (+${cap}).`,
        "system",
      );
    }
    const enhanced = enchantItem(item);
    return addMsg(
      spendGold(
        {
          ...state,
          hero: recomputeDerivedStats(
            {
              ...state.hero,
              equipment: { ...eq, [slot]: enhanced },
            },
            state.statueUpgrades,
          ),
        },
        cost,
      ),
      `The sage enchants your ${enhanced.name}!`,
    );
  }

  return addMsg(state, "Item not found.", "system");
}

/** Add +1 enchantment to an item, rebuild name correctly */
function enchantItem(
  item: import("../../core/types").Item,
): import("../../core/types").Item {
  const newEnch = item.enchantment + 1;
  const tpl = ITEM_BY_ID[item.templateId];
  const baseName = tpl?.name ?? item.name.replace(/\s*[+-]\d+.*$/, "");

  // Detect affix suffix (e.g. "of Vampiric") from the current name
  const suffix = extractAffixSuffix(item.name);
  const suffixStr = suffix ? ` ${suffix}` : "";

  const enchStr =
    newEnch > 0 ? ` +${newEnch}` : newEnch < 0 ? ` ${newEnch}` : "";
  return {
    ...item,
    enchantment: newEnch,
    name: `${baseName}${enchStr}${suffixStr}`,
    value: Math.max(1, (tpl?.value ?? 50) + newEnch * 20),
    properties: {
      ...item.properties,
      enchanterUps: (item.properties["enchanterUps"] ?? 0) + 1,
    },
  };
}

// ── Blacksmith ──────────────────────────────────────────

/** Cost to add or reroll an affix: 200 + 200 per existing affix */
export function getBlacksmithCost(item: Item): number {
  const count = item.specialEnchantments?.length ?? 0;
  return 200 + count * 200;
}

/** Get affix cap for the blacksmith (same as loot: 5 + ngPlus*2) */
export function getBlacksmithCap(ngPlus: number): number {
  return 5 + ngPlus * 2;
}

/** Generate 3 random affix options for an item, excluding existing ones and cursed-only */
export function rollBlacksmithOptions(
  item: Item,
  ngPlus: number,
  excludeIds: string[] = [],
): { id: string; critical: boolean }[] {
  const isWeapon = item.category === "weapon";
  const isArmor = [
    "armor",
    "shield",
    "helmet",
    "cloak",
    "gauntlets",
    "boots",
    "belt",
  ].includes(item.category);
  const existing = new Set([
    ...excludeIds,
    ...(item.specialEnchantments ?? []).map((e) => e.replace(":critical", "")),
  ]);

  const pool = AFFIXES.filter((a) => {
    if (a.cursedOnly) return false;
    if (a.weaponOnly && !isWeapon) return false;
    if (a.armorOnly && !isArmor) return false;
    if (existing.has(a.id)) return false;
    return true;
  });

  if (pool.length === 0) return [];

  // Weighted selection (same as loot)
  const totalW = pool.reduce((s, a) => s + (a.weight ?? 1), 0);
  const pick = (): Affix => {
    let roll = Math.random() * totalW;
    for (const a of pool) {
      roll -= a.weight ?? 1;
      if (roll <= 0) return a;
    }
    return pool[pool.length - 1];
  };

  const critChance =
    ngPlus <= 0 ? 0.05 : ngPlus === 1 ? 0.15 : ngPlus === 2 ? 0.25 : 0.35;
  const results: { id: string; critical: boolean }[] = [];
  const used = new Set<string>();
  for (let i = 0; i < 5 && used.size < pool.length; i++) {
    let a: Affix;
    let tries = 0;
    do {
      a = pick();
      tries++;
    } while (used.has(a.id) && tries < 50);
    if (used.has(a.id)) continue;
    used.add(a.id);
    results.push({ id: a.id, critical: Math.random() < critChance });
  }
  return results;
}

/** Charge gold upfront for blacksmith work */
export function blacksmithCharge(
  state: GameState,
  itemId: string,
): GameState | null {
  const item = findItem(state, itemId);
  if (!item) return null;
  const cost = getBlacksmithCost(item);
  if (state.hero.gold < cost) return null;
  return spendGold(state, cost);
}

/** Apply a chosen affix to an item (add or replace) — gold already charged */
export function blacksmithApplyAffix(
  state: GameState,
  itemId: string,
  affixId: string,
  critical: boolean,
  replaceIdx?: number,
): GameState {
  const item = findItem(state, itemId);
  if (!item) return addMsg(state, "Item not found.", "system");

  const affixStr = critical ? `${affixId}:critical` : affixId;
  let enchants = [...(item.specialEnchantments ?? [])];

  if (
    replaceIdx !== undefined &&
    replaceIdx >= 0 &&
    replaceIdx < enchants.length
  ) {
    enchants[replaceIdx] = affixStr;
  } else {
    enchants.push(affixStr);
  }

  // Add suffix if item doesn't have one yet
  let name = item.name;
  const hasSuffix = /\s+of\s+/.test(name);
  if (!hasSuffix && enchants.length > 0) {
    let bestId = enchants[0].replace(":critical", "");
    let bestWeight = Infinity;
    for (const raw of enchants) {
      const id = raw.replace(":critical", "");
      const a = AFFIX_BY_ID[id];
      if (a && a.weight < bestWeight) {
        bestWeight = a.weight;
        bestId = id;
      }
    }
    const a = AFFIX_BY_ID[bestId];
    if (a) name = `${name} of ${a.name}`;
  }

  // Recalculate value: base + enchantment bonus + affix bonus
  const tpl = ITEM_BY_ID[item.templateId];
  const baseValue = tpl?.value ?? 50;
  const newValue = Math.max(
    1,
    baseValue + item.enchantment * 20 + enchants.length * 50,
  );

  const updated = {
    ...item,
    specialEnchantments: enchants,
    name,
    value: newValue,
  };
  return addMsg(
    applyItemUpdate(state, itemId, updated),
    `The blacksmith forges a new enchantment onto your ${item.name}!`,
  );
}

function findItem(state: GameState, id: string): Item | null {
  const inv = state.hero.inventory.find((i) => i.id === id);
  if (inv) return inv;
  for (const eq of Object.values(state.hero.equipment)) {
    if (eq?.id === id) return eq;
  }
  return null;
}

function applyItemUpdate(
  state: GameState,
  itemId: string,
  updated: Item,
): GameState {
  const invIdx = state.hero.inventory.findIndex((i) => i.id === itemId);
  if (invIdx !== -1) {
    const inv = state.hero.inventory.map((i, idx) =>
      idx === invIdx ? updated : i,
    );
    return {
      ...state,
      hero: recomputeDerivedStats(
        { ...state.hero, inventory: inv },
        state.statueUpgrades,
      ),
    };
  }
  const eq = state.hero.equipment;
  const slots = Object.keys(eq) as (keyof typeof eq)[];
  const slot = slots.find((s) => eq[s]?.id === itemId);
  if (slot) {
    return {
      ...state,
      hero: recomputeDerivedStats(
        {
          ...state.hero,
          equipment: { ...eq, [slot]: updated },
        },
        state.statueUpgrades,
      ),
    };
  }
  return state;
}
