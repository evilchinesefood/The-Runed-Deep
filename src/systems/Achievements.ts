export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  // Combat
  {
    id: "first-blood",
    name: "First Blood",
    description: "Kill your first monster",
    icon: "⚔",
  },
  {
    id: "monster-slayer",
    name: "Monster Slayer",
    description: "Kill 100 monsters",
    icon: "💀",
  },
  {
    id: "giant-killer",
    name: "Giant Killer",
    description: "Defeat a boss monster",
    icon: "👑",
  },
  {
    id: "surturs-bane",
    name: "Surtur's Bane",
    description: "Defeat Surtur and beat the game",
    icon: "🔥",
  },
  {
    id: "untouchable",
    name: "Untouchable",
    description: "Clear a floor without taking damage",
    icon: "✨",
  },
  // Progression
  {
    id: "into-the-depths",
    name: "Into the Depths",
    description: "Reach floor 10",
    icon: "⬇",
  },
  {
    id: "fortress-breaker",
    name: "Fortress Breaker",
    description: "Enter the Underground Fortress",
    icon: "🏰",
  },
  {
    id: "castle-stormer",
    name: "Castle Stormer",
    description: "Enter The Runed Deep",
    icon: "⚡",
  },
  {
    id: "new-beginnings",
    name: "New Beginnings",
    description: "Complete New Game Plus",
    icon: "🔄",
  },
  {
    id: "maximum-power",
    name: "Maximum Power",
    description: "Reach level 30",
    icon: "⭐",
  },
  // Items & Equipment
  {
    id: "well-equipped",
    name: "Well Equipped",
    description: "Fill every equipment slot",
    icon: "🛡",
  },
  {
    id: "treasure-hunter",
    name: "Treasure Hunter",
    description: "Pick up 50 items",
    icon: "💎",
  },
  {
    id: "legendary-find",
    name: "Legendary Find",
    description: "Find an item with 4+ enchantments",
    icon: "✦",
  },
  {
    id: "elven-heritage",
    name: "Elven Heritage",
    description: "Equip 3+ elven items",
    icon: "🌿",
  },
  {
    id: "meteoric-arsenal",
    name: "Meteoric Arsenal",
    description: "Equip 3+ meteoric items",
    icon: "☄",
  },
  // Exploration & Skills
  {
    id: "cartographer",
    name: "Cartographer",
    description: "Fully explore a dungeon floor",
    icon: "🗺",
  },
  {
    id: "secret-keeper",
    name: "Secret Keeper",
    description: "Find 5 secret doors",
    icon: "🚪",
  },
  {
    id: "shopaholic",
    name: "Shopaholic",
    description: "Spend 5,000 gold at shops",
    icon: "💰",
  },
];

export const ACHIEVEMENT_BY_ID: Record<string, Achievement> =
  Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

const STORAGE_KEY = "rd-achievements";

export interface AchievementState {
  unlocked: string[];
  stats: {
    monstersKilled: number;
    itemsPickedUp: number;
    secretDoorsFound: number;
    goldSpentAtShops: number;
    floorDamageTaken: Record<string, number>;
  };
}

export function loadAchievements(): AchievementState {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (json) return JSON.parse(json);
  } catch {}
  return {
    unlocked: [],
    stats: {
      monstersKilled: 0,
      itemsPickedUp: 0,
      secretDoorsFound: 0,
      goldSpentAtShops: 0,
      floorDamageTaken: {},
    },
  };
}

export function saveAchievements(state: AchievementState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

let achState: AchievementState = loadAchievements();
let onUnlockCallback: ((achievement: Achievement) => void) | null = null;

export function setOnUnlockCallback(
  cb: (achievement: Achievement) => void,
): void {
  onUnlockCallback = cb;
}

export function getAchievementState(): AchievementState {
  return achState;
}

export function isUnlocked(id: string): boolean {
  return achState.unlocked.includes(id);
}

function unlock(id: string): void {
  if (achState.unlocked.includes(id)) return;
  achState.unlocked.push(id);
  saveAchievements(achState);
  const ach = ACHIEVEMENT_BY_ID[id];
  if (ach && onUnlockCallback) onUnlockCallback(ach);
}

export function trackMonsterKill(templateId: string, isBoss: boolean): void {
  achState.stats.monstersKilled++;
  saveAchievements(achState);

  if (achState.stats.monstersKilled === 1) unlock("first-blood");
  if (achState.stats.monstersKilled >= 100) unlock("monster-slayer");
  if (isBoss) unlock("giant-killer");
  if (templateId === "surtur") unlock("surturs-bane");
}

export function trackFloorReached(floorNum: number): void {
  const depth = floorNum + 1;
  if (depth >= 10) unlock("into-the-depths");
  if (depth >= 14) unlock("fortress-breaker");
  if (depth >= 27) unlock("castle-stormer");
}

export function trackLevelUp(level: number): void {
  if (level >= 30) unlock("maximum-power");
}

export function trackItemPickup(): void {
  achState.stats.itemsPickedUp++;
  saveAchievements(achState);
  if (achState.stats.itemsPickedUp >= 50) unlock("treasure-hunter");
}

export function trackItemFound(specialEnchantments?: string[]): void {
  if (specialEnchantments && specialEnchantments.length >= 4)
    unlock("legendary-find");
}

export function trackEquipmentCheck(equipment: Record<string, unknown>): void {
  const mainSlots = [
    "weapon",
    "shield",
    "helmet",
    "body",
    "cloak",
    "bracers",
    "gauntlets",
    "belt",
    "boots",
    "ringLeft",
    "amulet",
  ];
  const allFilled = mainSlots.every((s) => equipment[s] != null);
  if (allFilled) unlock("well-equipped");

  let elvenCount = 0;
  let meteoricCount = 0;
  for (const item of Object.values(equipment)) {
    if (!item) continue;
    const tid = (item as { templateId?: string }).templateId;
    if (tid?.startsWith("elven-")) elvenCount++;
    if (tid?.startsWith("meteoric-")) meteoricCount++;
  }
  if (elvenCount >= 3) unlock("elven-heritage");
  if (meteoricCount >= 3) unlock("meteoric-arsenal");
}

export function trackSecretDoorFound(): void {
  achState.stats.secretDoorsFound++;
  saveAchievements(achState);
  if (achState.stats.secretDoorsFound >= 5) unlock("secret-keeper");
}

export function trackGoldSpent(amount: number): void {
  achState.stats.goldSpentAtShops += amount;
  saveAchievements(achState);
  if (achState.stats.goldSpentAtShops >= 5000) unlock("shopaholic");
}

export function trackFloorDamage(floorKey: string, damage: number): void {
  if (!achState.stats.floorDamageTaken[floorKey]) {
    achState.stats.floorDamageTaken[floorKey] = 0;
  }
  achState.stats.floorDamageTaken[floorKey] += damage;
}

export function trackFloorCleared(
  floorKey: string,
  monstersRemaining: number,
): void {
  if (monstersRemaining === 0) {
    const dmg = achState.stats.floorDamageTaken[floorKey] ?? 0;
    if (dmg === 0) unlock("untouchable");
  }
}

export function trackNewGamePlus(): void {
  unlock("new-beginnings");
}

export function trackFloorExplored(
  explored: boolean[][],
  width: number,
  height: number,
  tiles: { walkable: boolean }[][],
): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (tiles[y][x].walkable && !explored[y][x]) return;
    }
  }
  unlock("cartographer");
}
