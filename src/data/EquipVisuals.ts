// ============================================================
// Equipment → Player sprite overlay mappings
// Maps item templateId to player sprite sheet class names
// ============================================================

/** Default overlay per slot when an equipped item has no specific mapping */
export const EQUIP_VISUAL_DEFAULTS: Record<string, string> = {
  weapon: "hand1-long_sword_slant",
  shield: "hand2-kite_shield_kite1",
  helmet: "head-iron1",
  body: "body-chainmail",
  cloak: "cloak-gray",
  gauntlets: "gloves-glove_gray",
  boots: "boots-middle_brown",
};

/** Render order: bottom layer first, top layer last */
export const EQUIP_RENDER_ORDER: string[] = [
  "body", "boots", "gauntlets", "cloak", "helmet", "weapon", "shield",
];

/** Item templateId → player overlay sprite class */
export const EQUIP_VISUALS: Record<string, Record<string, string>> = {
  weapon: {
    "club": "hand1-club",
    "dagger": "hand1-dagger",
    "spear": "hand1-spear",
    "mace": "hand1-mace",
    "short-sword": "hand1-short_sword_slant",
    "flail": "hand1-flail_ball",
    "long-sword": "hand1-long_sword_slant",
    "battle-axe": "hand1-battleaxe",
    "two-handed-sword": "hand1-great_sword_slant",
    // Elven tier — elegant variants
    "elven-long-sword": "hand1-long_sword_slant2",
    "elven-dagger": "hand1-dagger_slant",
    "elven-spear": "hand1-spear2",
    "elven-mace": "hand1-mace2",
    "elven-battle-axe": "hand1-battleaxe2",
    // Meteoric tier — heavy/dark variants
    "meteoric-long-sword": "hand1-heavy_sword",
    "meteoric-battle-axe": "hand1-axe_executioner",
    "meteoric-flail": "hand1-flail_great",
    "meteoric-two-handed-sword": "hand1-triple_sword",
    // Uniques
    "blooddrinker": "hand1-sword_black",
    "worldsplitter": "hand1-triple_sword2",
  },
  shield: {
    "small-wood-shield": "hand2-buckler_round",
    "small-iron-shield": "hand2-buckler_round2",
    "elven-shield": "hand2-kite_shield_kite2",
    "meteoric-shield": "hand2-tower_shield_teal",
    // Unique
    "aegis-of-the-fallen": "hand2-kite_shield_skull",
  },
  helmet: {
    "leather-cap": "head-cap_black1",
    "iron-helm": "head-iron1",
    "elven-helmet": "head-helm_green",
    "meteoric-helm": "head-iron2",
    // Uniques
    "helm-of-true-sight": "head-crown_gold1",
    "helm-of-storms": "head-iron_red",
  },
  body: {
    "leather-armor": "body-leather_armour",
    "studded-leather": "body-jacket_stud",
    "chain-mail": "body-chainmail",
    "plate-mail": "body-plate",
    "elven-chain-mail": "body-green_chain",
    "meteoric-plate-mail": "body-plate_black",
    // Unique
    "demonhide-armor": "body-deep_troll_leather",
  },
  cloak: {
    "cloak": "cloak-gray",
    "fine-cloak": "cloak-blue",
    "elven-cloak": "cloak-green",
    "meteoric-cloak": "cloak-black",
    // Unique
    "cloak-of-shadows": "cloak-magenta",
  },
  gauntlets: {
    "leather-gloves": "gloves-glove_brown",
    "iron-gloves": "gloves-glove_gray",
    "elven-gloves": "gloves-glove_short_green",
    "meteoric-gloves": "gloves-glove_black",
    // Unique
    "gauntlets-of-the-forge": "gloves-gauntlet_blue",
  },
  boots: {
    "leather-boots": "boots-middle_brown",
    "iron-boots": "boots-middle_gray",
    "elven-boots": "boots-middle_green",
    "meteoric-boots": "boots-mesh_black",
    // Unique
    "boots-of-levitation": "boots-blue_gold",
  },
};

/** Get the player overlay sprite for an equipped item, or default, or null if slot empty */
export function getEquipVisual(slot: string, templateId: string | undefined): string | null {
  if (!templateId) return null;
  return EQUIP_VISUALS[slot]?.[templateId] ?? EQUIP_VISUAL_DEFAULTS[slot] ?? null;
}
