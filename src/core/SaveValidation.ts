import type { GameState } from "./types";

// Match the server's decompressed limit. A valid payload can still exceed the
// browser's remaining quota; callers must preserve the old value on write failure.
export const MAX_CLOUD_SAVE_BYTES = 5_000_000;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function integer(value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): boolean {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max;
}

function records(value: unknown): boolean {
  return Array.isArray(value) && value.every(record);
}

function finiteFields(value: unknown, keys: string[]): boolean {
  return record(value) && keys.every(key => typeof value[key] === "number" && Number.isFinite(value[key]));
}

function validItem(value: unknown): boolean {
  if (!record(value) || typeof value.id !== "string") return false;
  // loadGame migrates these strings and then scans item IDs before gameplay.
  // Older items may omit enchantments, but malformed present values cannot load.
  return value.specialEnchantments === undefined || (Array.isArray(value.specialEnchantments)
    && value.specialEnchantments.every(enchantment => typeof enchantment === "string"));
}

function validItems(value: unknown): boolean {
  return Array.isArray(value) && value.every(validItem);
}

function validFloor(value: unknown): boolean {
  if (!record(value) || !integer(value.width, 1, 512) || !integer(value.height, 1, 512)) return false;
  if (!Array.isArray(value.monsters) || !value.monsters.every(monster => record(monster) && typeof monster.id === "string")) return false;
  if (!Array.isArray(value.items) || !value.items.every(placed => record(placed) && validItem(placed.item))) return false;
  const width = value.width, height = value.height;
  return ["tiles", "explored", "lit"].every(key => {
    const rows = value[key];
    return Array.isArray(rows) && rows.length === height && rows.every(row =>
      Array.isArray(row) && row.length === width && row.every(cell => key === "tiles"
        ? record(cell) && typeof cell.type === "string" && typeof cell.sprite === "string"
          && typeof cell.walkable === "boolean" && typeof cell.transparent === "boolean"
        : typeof cell === "boolean"));
  });
}

// Check the stable, loadable shape rather than requiring fields added by later
// releases: loadGame still supplies its existing legacy migrations/defaults.
function validState(value: unknown): value is GameState {
  if (!record(value) || !record(value.hero) || !record(value.floors) || !record(value.town)) return false;
  const hero = value.hero;
  if (typeof hero.name !== "string" || !hero.name.trim()) return false;
  if (!integer(hero.level, 1) || !finiteFields(hero.position, ["x", "y"])) return false;
  if (!finiteFields(hero.attributes, ["strength", "intelligence", "constitution", "dexterity"])) return false;
  if (!finiteFields(hero.resistances, ["cold", "fire", "lightning", "acid", "drain"])) return false;
  if (!["hp", "maxHp", "mp", "maxMp", "xp"].every(key => typeof hero[key] === "number" && Number.isFinite(hero[key]))) return false;
  if (!validItems(hero.inventory) || !record(hero.equipment) || !Object.values(hero.equipment).every(item => item === null || validItem(item))) return false;
  if (!Array.isArray(hero.knownSpells) || !hero.knownSpells.every(spell => typeof spell === "string") || !records(hero.activeEffects)) return false;
  if (!integer(value.currentFloor, 0) || !integer(value.turn, 0) || !integer(value.rngSeed, 0)) return false;
  if (!["mine", "lair", "crypt", "fortress", "ice", "castle", "town", "rift", "crucible"].includes(String(value.currentDungeon))) return false;
  if (!Object.values(value.floors).every(validFloor)) return false;
  if (!record(value.town.shopInventories) || !Object.values(value.town.shopInventories).every(validItems) || !records(value.messages)) return false;
  if (value.stash !== undefined && value.stash !== null && !validItems(value.stash)) return false;
  return true;
}

export function parseCloudState(json: string): GameState {
  if (json.length > MAX_CLOUD_SAVE_BYTES || new TextEncoder().encode(json).length > MAX_CLOUD_SAVE_BYTES) {
    throw new Error("Cloud save is too large. Your existing saves have not changed.");
  }
  const state: unknown = JSON.parse(json);
  if (!validState(state)) throw new Error("Invalid cloud save. Your existing saves have not changed.");
  return state;
}
