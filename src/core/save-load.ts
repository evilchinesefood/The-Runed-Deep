import type { GameState } from "./types";
import { syncItemIdCounter } from "../systems/items/loot";
import { getCloudCode, pushSave } from "./CloudSave";
import { getDungeonForFloor } from "../systems/dungeon/Tilesets";
import { generateTownMap } from "../systems/town/TownMap";
import { generateFloor } from "../systems/dungeon/generator";

const SAVE_KEY_PREFIX = "rd-save-";
const MAX_SLOTS = 3;

export interface SaveSlotInfo {
  slot: number;
  name: string;
  level: number;
  floor: number;
  turn: number;
  timestamp: number;
}

/**
 * Save the current game state to a slot (1-3).
 * Returns true on success.
 */
/**
 * Strip transient data from save to reduce size.
 * visible[][] is recomputed every move by computeFov.
 * Monster path arrays are recomputed every turn by AI.
 */
function pruneSaveState(state: GameState): GameState {
  // Build set of floor keys to keep
  const keep = new Set<string>();

  if (state.currentDungeon === 'town') {
    // In town: keep the return floor + its previous floor
    const rf = state.returnFloor;
    keep.add(`${getDungeonForFloor(rf)}-${rf}`);
    if (rf > 0) keep.add(`${getDungeonForFloor(rf - 1)}-${rf - 1}`);
  } else {
    // In dungeon: keep current floor + previous floor
    const cf = state.currentFloor;
    keep.add(`${state.currentDungeon}-${cf}`);
    if (cf > 0) keep.add(`${getDungeonForFloor(cf - 1)}-${cf - 1}`);
  }
  // Town is regenerated on entry — never save it

  const floors: typeof state.floors = {};
  for (const [key, floor] of Object.entries(state.floors)) {
    if (!keep.has(key)) continue;

    const monsters = floor.monsters.map((m: any) => {
      const { path, ...rest } = m;
      return rest;
    });
    const visible = Array.from({ length: floor.height }, () =>
      Array(floor.width).fill(false)
    );
    floors[key] = { ...floor, visible, monsters };
  }
  return { ...state, floors };
}

export function saveGame(state: GameState, slot: number = 1): boolean {
  if (slot < 1 || slot > MAX_SLOTS) return false;

  const saveState = pruneSaveState({ ...state, screen: "game" });
  const saveJson = JSON.stringify(saveState);

  // Push to ALL cloud-enabled slots — awaited to ensure completion
  for (let s = 1; s <= MAX_SLOTS; s++) {
    const code = getCloudCode(s);
    if (code) {
      pushSave(code, saveJson).then(ok => {
        if (!ok) console.warn(`[SAVE] Cloud push failed for code ${code}`);
      });
    }
  }

  try {
    const json = JSON.stringify({ version: 1, timestamp: Date.now(), state: saveState });
    localStorage.setItem(SAVE_KEY_PREFIX + slot, json);
    return true;
  } catch (e: any) {
    const isQuota = e?.name === 'QuotaExceededError' ||
      e?.code === 22 || // Safari
      e?.code === 1014; // Firefox
    if (isQuota) {
      try {
        localStorage.removeItem(SAVE_KEY_PREFIX + slot);
        const json = JSON.stringify({ version: 1, timestamp: Date.now(), state: saveState });
        localStorage.setItem(SAVE_KEY_PREFIX + slot, json);
        return true;
      } catch {
        const hasCloud = Array.from({ length: MAX_SLOTS }, (_, i) => getCloudCode(i + 1)).some(Boolean);
        if (hasCloud) return true;
      }
    }
    console.error("[SAVE] Failed to save game:", e);
    return false;
  }
}

/**
 * Load a game state from a slot.
 * Returns the GameState or null if no save exists.
 */
export function loadGame(slot: number = 1): GameState | null {
  if (slot < 1 || slot > MAX_SLOTS) return null;

  try {
    const json = localStorage.getItem(SAVE_KEY_PREFIX + slot);
    if (!json) return null;

    const saveData = JSON.parse(json);
    if (!saveData || !saveData.state) return null;

    // Ensure screen is set to game
    const state: GameState = {
      ...saveData.state,
      screen: "game",
    };

    // Migration: rename copper → gold
    if ((state.hero as any).copper !== undefined && (state.hero as any).gold === undefined) {
      state.hero.gold = (state.hero as any).copper;
      delete (state.hero as any).copper;
    }
    // Migration: rename copper-coins templateId → gold-coins
    const renameCopperCoins = (item: any) => {
      if (item?.templateId === 'copper-coins') item.templateId = 'gold-coins';
    };
    for (const item of state.hero.inventory) renameCopperCoins(item);
    for (const key of Object.keys(state.floors)) {
      for (const placed of state.floors[key].items ?? []) renameCopperCoins(placed?.item);
    }
    for (const item of state.stash ?? []) renameCopperCoins(item);

    // Migration: add defaults for fields added after initial release
    state.returnFloor ??= 0;
    state.activeBuildingId ??= "";
    if (!state.hero.spellHotkeys) state.hero.spellHotkeys = [];
    state.town.deepestFloor ??= 0;
    state.ngPlusCount ??= 0;
    state.stash ??= [];
    // Add decals array and monster armor to any floors missing them
    for (const key of Object.keys(state.floors)) {
      if (!state.floors[key].decals) state.floors[key].decals = [];
      for (const m of state.floors[key].monsters) {
        if (m.armor === undefined) m.armor = 0;
        (m as any).hasFled ??= false;
      }
    }

    // Migrate old enchantment IDs to new affix IDs
    const ENCHANT_MIGRATION: Record<string, string> = {
      'life-steal': 'vampiric', 'reflect-damage': 'thorns', 'speed-boost': 'swiftness',
      'spell-damage': 'spell-power', 'regen-hp': 'regeneration', 'regen-mp': 'arcane-mastery',
      'str-bonus': 'might', 'int-bonus': 'brilliance', 'con-bonus': 'fortitude',
      'dex-bonus': 'grace', 'poison-immune': 'magic-resist', 'trap-immune': 'magic-resist',
    };
    function migrateEnchants(item: any) {
      if (!item?.specialEnchantments) return;
      item.specialEnchantments = item.specialEnchantments.map((e: string) => {
        const isCrit = e.endsWith(':critical');
        const base = isCrit ? e.replace(':critical', '') : e;
        const mapped = ENCHANT_MIGRATION[base];
        return mapped ? (isCrit ? `${mapped}:critical` : mapped) : e;
      });
    }
    for (const item of state.hero.inventory) migrateEnchants(item);
    for (const eq of Object.values(state.hero.equipment)) if (eq) migrateEnchants(eq);
    for (const key of Object.keys(state.floors)) {
      for (const placed of state.floors[key].items ?? []) migrateEnchants(placed?.item);
    }
    for (const items of Object.values(state.town.shopInventories)) {
      for (const item of items as any[]) migrateEnchants(item);
    }

    // Ensure visible arrays exist (stripped from saves to reduce size)
    for (const key of Object.keys(state.floors)) {
      const f = state.floors[key];
      if (!f.visible || f.visible.length === 0) {
        f.visible = Array.from({ length: f.height }, () => Array(f.width).fill(false));
      }
    }

    // Regenerate missing floors (pruned from save)
    const currentKey = `${state.currentDungeon}-${state.currentFloor}`;
    if (!state.floors[currentKey]) {
      if (state.currentDungeon === 'town') {
        const { floor: townFloor } = generateTownMap();
        state.floors['town-0'] = townFloor;
      } else {
        const { floor: newFloor } = generateFloor(
          state.currentDungeon, state.currentFloor, state.rngSeed, true, true, state.difficulty, state.ngPlusCount ?? 0,
        );
        state.floors[currentKey] = newFloor;
      }
    }

    // Ensure new item IDs don't collide with loaded items
    syncItemIdCounter(state);

    return state;
  } catch (e) {
    console.error("Failed to load game:", e);
    return null;
  }
}

/**
 * Get info about all save slots without loading full state.
 */
export function getSaveSlots(): (SaveSlotInfo | null)[] {
  const slots: (SaveSlotInfo | null)[] = [];

  for (let slot = 1; slot <= MAX_SLOTS; slot++) {
    try {
      const json = localStorage.getItem(SAVE_KEY_PREFIX + slot);
      if (!json) {
        slots.push(null);
        continue;
      }

      const saveData = JSON.parse(json);
      if (!saveData?.state?.hero) {
        slots.push(null);
        continue;
      }

      slots.push({
        slot,
        name: saveData.state.hero.name,
        level: saveData.state.hero.level,
        floor: saveData.state.currentFloor + 1,
        turn: saveData.state.turn,
        timestamp: saveData.timestamp ?? 0,
      });
    } catch {
      slots.push(null);
    }
  }

  return slots;
}

/**
 * Delete a save slot.
 */
export function deleteSave(slot: number): void {
  localStorage.removeItem(SAVE_KEY_PREFIX + slot);
}

/**
 * Check if any save exists.
 */
export function hasAnySave(): boolean {
  for (let slot = 1; slot <= MAX_SLOTS; slot++) {
    if (localStorage.getItem(SAVE_KEY_PREFIX + slot)) return true;
  }
  return false;
}
