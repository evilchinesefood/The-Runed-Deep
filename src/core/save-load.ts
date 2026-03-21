import type { GameState } from "./types";

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
export function saveGame(state: GameState, slot: number = 1): boolean {
  if (slot < 1 || slot > MAX_SLOTS) return false;

  try {
    // Save the game state (set screen back to 'game' so loading resumes gameplay)
    const saveState: GameState = {
      ...state,
      screen: "game",
    };

    const saveData = {
      version: 1,
      timestamp: Date.now(),
      state: saveState,
    };

    const json = JSON.stringify(saveData);
    localStorage.setItem(SAVE_KEY_PREFIX + slot, json);
    return true;
  } catch (e) {
    console.error("Failed to save game:", e);
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

    // Migration: add defaults for fields added after initial release
    state.returnFloor ??= 0;
    state.activeBuildingId ??= "";
    if (!state.hero.spellHotkeys) state.hero.spellHotkeys = [];
    state.town.deepestFloor ??= 0;
    state.ngPlusCount ??= 0;
    // Add decals array and monster armor to any floors missing them
    for (const key of Object.keys(state.floors)) {
      if (!state.floors[key].decals) state.floors[key].decals = [];
      for (const m of state.floors[key].monsters) {
        if (m.armor === undefined) m.armor = 0;
      }
    }

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
