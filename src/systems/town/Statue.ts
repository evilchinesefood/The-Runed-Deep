// ============================================================
// Statue of Fortune — essence sacrifice + permanent upgrades
// ============================================================

import type { GameState, Item } from "../../core/types";
import { AFFIXES } from "../../data/Enchantments";

// ── Essence calculation ──────────────────────────────────────

export function calcEssence(item: Item): number {
  const tpl = item.templateId;
  const isUnique =
    tpl.startsWith("unique-") || (item.properties?.["unique"] ? true : false);
  let val = isUnique ? 10 : 1;
  if (!isUnique && item.enchantment > 0) val += item.enchantment;
  if (item.specialEnchantments) val += item.specialEnchantments.length;
  if (item.blessed) val += 2;
  if (item.cursed) val += 1;
  return val;
}

export function hasRunesInSockets(item: Item): boolean {
  return !!item.sockets?.some((s) => s !== null);
}

export function sacrificeItem(state: GameState, itemId: string): GameState {
  const idx = state.hero.inventory.findIndex((i) => i.id === itemId);
  if (idx < 0) return state;
  const item = state.hero.inventory[idx];
  const ess = calcEssence(item);
  const inv = [...state.hero.inventory];
  inv.splice(idx, 1);
  return {
    ...state,
    hero: {
      ...state.hero,
      inventory: inv,
      essence: state.hero.essence + ess,
    },
    itemsSacrificed: state.itemsSacrificed + 1,
  };
}

// ── Upgrade definitions ──────────────────────────────────────

export interface StatueUpgrade {
  id: string;
  name: string;
  desc: string;
  category: string;
  perPurchase: string;
}

function affixUpgrades(): StatueUpgrade[] {
  return AFFIXES.filter((a) => !a.cursedOnly).map((a) => ({
    id: `affix-${a.id}`,
    name: `+${a.name} Level`,
    desc: `+1 effective enchantment level for ${a.name}`,
    category: "Affix Effectiveness",
    perPurchase: "+1 effective level",
  }));
}

export const STATUE_UPGRADES: StatueUpgrade[] = [
  // Base Stats
  {
    id: "stat-str",
    name: "+Strength",
    desc: "+5 Strength per purchase",
    category: "Base Stats",
    perPurchase: "+5",
  },
  {
    id: "stat-int",
    name: "+Intelligence",
    desc: "+5 Intelligence per purchase",
    category: "Base Stats",
    perPurchase: "+5",
  },
  {
    id: "stat-con",
    name: "+Constitution",
    desc: "+5 Constitution per purchase",
    category: "Base Stats",
    perPurchase: "+5",
  },
  {
    id: "stat-dex",
    name: "+Dexterity",
    desc: "+5 Dexterity per purchase",
    category: "Base Stats",
    perPurchase: "+5",
  },
  // Combat
  {
    id: "combat-damage",
    name: "+Base Damage",
    desc: "+1 base damage per purchase",
    category: "Combat",
    perPurchase: "+1",
  },
  {
    id: "combat-armor",
    name: "+Armor",
    desc: "+1 armor per purchase",
    category: "Combat",
    perPurchase: "+1",
  },
  // Resistances
  {
    id: "resist-fire",
    name: "+Fire Resist",
    desc: "+2 fire resistance per purchase",
    category: "Resistances",
    perPurchase: "+2",
  },
  {
    id: "resist-cold",
    name: "+Cold Resist",
    desc: "+2 cold resistance per purchase",
    category: "Resistances",
    perPurchase: "+2",
  },
  {
    id: "resist-lightning",
    name: "+Lightning Resist",
    desc: "+2 lightning resistance per purchase",
    category: "Resistances",
    perPurchase: "+2",
  },
  // Resources
  {
    id: "resource-hp",
    name: "+Max HP",
    desc: "+3 max HP per purchase",
    category: "Resources",
    perPurchase: "+3",
  },
  {
    id: "resource-mp",
    name: "+Max MP",
    desc: "+3 max MP per purchase",
    category: "Resources",
    perPurchase: "+3",
  },
  // Affix Effectiveness (generated)
  ...affixUpgrades(),
];

export const STATUE_UPGRADE_BY_ID: Record<string, StatueUpgrade> =
  Object.fromEntries(STATUE_UPGRADES.map((u) => [u.id, u]));

export const STATUE_CATEGORIES = [
  "Base Stats",
  "Combat",
  "Resistances",
  "Resources",
  "Affix Effectiveness",
];

export function upgradeCost(currentCount: number): number {
  return (currentCount + 1) * 5;
}

export function purchaseUpgrade(
  state: GameState,
  upgradeId: string,
): GameState {
  const count = state.statueUpgrades[upgradeId] ?? 0;
  const cost = upgradeCost(count);
  if (state.hero.essence < cost) return state;
  const newUpgrades = { ...state.statueUpgrades, [upgradeId]: count + 1 };
  const heroUpgrades = { ...state.hero.statueUpgrades, [upgradeId]: count + 1 };
  return {
    ...state,
    hero: {
      ...state.hero,
      essence: state.hero.essence - cost,
      statueUpgrades: heroUpgrades,
    },
    statueUpgrades: newUpgrades,
  };
}
