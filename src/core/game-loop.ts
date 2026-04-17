import type { GameState, GameAction } from "./types";
import { processAction, processCrucibleWaveCleared } from "./actions";
import { processAllMonsterTurns } from "../systems/monsters/ai";
import { checkAndApplyLevelUps } from "../systems/character/leveling";
import { Sound } from "../systems/Sound";
import {
  hasEnchant,
  equipAffixTotal,
  equipAffixTotal2,
} from "../utils/Enchants";
import { getDifficultyConfig } from "../data/difficulty";
import { ITEM_BY_ID } from "../data/items";
import { recomputeDerivedStats } from "../systems/character/derived-stats";
import { getRuneValue } from "../data/Runes";
import { getModifierFlags } from "../systems/rift/ModifierFlags";

export type RenderCallback = (state: GameState) => void;
export type StateChangeCallback = (state: GameState) => void;

const MAX_MESSAGES = 200;
function pruneMessages(state: GameState): GameState {
  if (state.messages.length <= MAX_MESSAGES) return state;
  return { ...state, messages: state.messages.slice(-MAX_MESSAGES) };
}

export class GameLoop {
  private state: GameState;
  private onRender: RenderCallback;
  private onStateChange: StateChangeCallback | null = null;

  constructor(initialState: GameState, onRender: RenderCallback) {
    this.state = initialState;
    this.onRender = onRender;
  }

  getState(): GameState {
    return this.state;
  }

  setState(state: GameState): void {
    this.state = pruneMessages(state);
    this.onStateChange?.(this.state);
    this.onRender(this.state);
  }

  setOnStateChange(callback: StateChangeCallback): void {
    this.onStateChange = callback;
  }

  handleAction(action: GameAction): void {
    // 1. Process player action
    let newState = processAction(this.state, action);

    // 1b. Reset anchor rune flags on floor change (equipment + inventory)
    if (
      newState.currentFloor !== this.state.currentFloor ||
      newState.currentDungeon !== this.state.currentDungeon
    ) {
      for (const [slot, item] of Object.entries(newState.hero.equipment)) {
        if (item && item.properties["anchorUsed"]) {
          const { anchorUsed, ...rest } = item.properties;
          newState = {
            ...newState,
            hero: {
              ...newState.hero,
              equipment: {
                ...newState.hero.equipment,
                [slot]: { ...item, properties: rest },
              },
            },
          };
        }
      }
      const inv = newState.hero.inventory.map((item) => {
        if (item.properties["anchorUsed"]) {
          const { anchorUsed, ...rest } = item.properties;
          return { ...item, properties: rest };
        }
        return item;
      });
      newState = { ...newState, hero: { ...newState.hero, inventory: inv } };
    }

    // 2. Check for level-ups (after XP gain from combat)
    if (newState.screen === "game") {
      newState = checkAndApplyLevelUps(newState);
    }

    // 3. Tick active effects (when a turn was consumed)
    if (newState.screen === "game" && newState.turn > this.state.turn) {
      newState = this.tickActiveEffects(newState);
    }

    // 4. Process monster turns
    // Time Stop: freeze all monsters unconditionally
    const timeStopped = newState.hero.activeEffects.some(
      (e) => e.id === "time-stop" && e.turnsRemaining > 0,
    );
    // Swiftness: chance-based extra action (skip monster turn)
    const swiftPct = Math.min(
      75,
      equipAffixTotal(
        newState.hero.equipment,
        "swiftness",
        newState.statueUpgrades,
      ),
    );
    const skipMonsters =
      timeStopped || (swiftPct > 0 && Math.random() * 100 < swiftPct);
    if (
      newState.screen === "game" &&
      newState.turn > this.state.turn &&
      newState.currentDungeon !== "town" &&
      !skipMonsters
    ) {
      newState = this.processMonsterTurns(newState);
      // Frenzied: monsters get an extra action
      if (getModifierFlags(newState).frenzied) {
        newState = this.processMonsterTurns(newState);
      }
    }

    // 5. Check for Anchor rune (prevent death once per floor)
    if (newState.screen === "game" && newState.hero.hp <= 0) {
      let anchored = false;
      for (const item of Object.values(newState.hero.equipment)) {
        if (!item || !item.sockets) continue;
        if (item.sockets.includes("anchor") && !item.properties["anchorUsed"]) {
          const updated = {
            ...item,
            properties: { ...item.properties, anchorUsed: 1 },
          };
          for (const [slot, eq] of Object.entries(newState.hero.equipment)) {
            if (eq && eq.id === item.id) {
              newState = {
                ...newState,
                hero: {
                  ...newState.hero,
                  hp: 1,
                  equipment: { ...newState.hero.equipment, [slot]: updated },
                },
                messages: [
                  ...newState.messages,
                  {
                    text: "The Anchor rune flares! You cling to life with 1 HP!",
                    severity: "important" as const,
                    turn: newState.turn,
                  },
                ],
              };
              anchored = true;
              break;
            }
          }
          if (anchored) break;
        }
      }
    }

    // Check for player death
    if (newState.screen === "game" && newState.hero.hp <= 0) {
      Sound.playerDeath();
      // Clear active rift on death
      if (newState.activeRift) {
        newState = { ...newState, activeRift: null };
      }
      // Crucible death: keep rewards, show summary
      if (newState.currentDungeon === "crucible" && newState.activeCrucible) {
        let bestWave = newState.crucibleBestWave ?? 0;
        if (newState.activeCrucible.wave > bestWave)
          bestWave = newState.activeCrucible.wave;
        newState = {
          ...newState,
          crucibleBestWave: bestWave,
          screen: "crucible-summary",
        };
      } else {
        newState = { ...newState, screen: "death" };
      }
    }

    // 5b. Crucible wave cleared check
    if (
      newState.screen === "game" &&
      newState.currentDungeon === "crucible" &&
      newState.activeCrucible &&
      newState.activeCrucible.wave > 0
    ) {
      const cFloor = newState.floors["crucible-0"];
      if (cFloor && cFloor.monsters.length === 0) {
        newState = processCrucibleWaveCleared(newState);
      }
    }

    // 6. Update state and render
    this.state = pruneMessages(newState);
    this.onStateChange?.(this.state);
    this.onRender(this.state);
  }

  private tickActiveEffects(state: GameState): GameState {
    let hero = { ...state.hero };
    let messages = [...state.messages];

    // ── Cursed Ground: suppress regen, deal poison damage ───
    const cursedGround = getModifierFlags(state).cursedGround;

    // ── Regeneration affix (scaled) ─────────────────────────
    const regenHp = equipAffixTotal(
      hero.equipment,
      "regeneration",
      state.statueUpgrades,
    );
    if (
      regenHp > 0 &&
      state.turn % 2 === 0 &&
      hero.hp < hero.maxHp &&
      !cursedGround
    ) {
      const healMult = getDifficultyConfig(state.difficulty).healingMult;
      const heal = Math.max(1, Math.round(regenHp * healMult));
      hero = { ...hero, hp: Math.min(hero.maxHp, hero.hp + heal) };
    }

    // ── Renewal rune HP regen ─────────────────────────────
    if (state.turn % 2 === 0 && hero.hp < hero.maxHp && !cursedGround) {
      let runeRegen = 0;
      for (const item of Object.values(hero.equipment)) {
        if (!item || !item.sockets) continue;
        const effEnch = item.enchantment + (item.blessed ? 1 : 0);
        for (const rid of item.sockets) {
          if (rid === "renewal") runeRegen += getRuneValue(rid, effEnch);
        }
      }
      if (runeRegen > 0) {
        const healMult = getDifficultyConfig(state.difficulty).healingMult;
        const heal = Math.max(1, Math.round(runeRegen * healMult));
        hero = { ...hero, hp: Math.min(hero.maxHp, hero.hp + heal) };
      }
    }

    // ── Arcane Mastery MP regen (secondary value) ───────────
    if (
      hasEnchant(hero.equipment, "arcane-mastery") &&
      state.turn % 3 === 0 &&
      hero.mp < hero.maxMp &&
      !cursedGround
    ) {
      const mpRegen = Math.max(
        1,
        Math.round(
          equipAffixTotal2(
            hero.equipment,
            "arcane-mastery",
            state.statueUpgrades,
          ),
        ),
      );
      hero = { ...hero, mp: Math.min(hero.maxMp, hero.mp + mpRegen) };
    }

    // ── Crown of the Ancients: +2 HP and +2 MP per turn ────
    if (!cursedGround) {
      for (const eq of Object.values(hero.equipment)) {
        if (eq && ITEM_BY_ID[eq.templateId]?.uniqueAbility === "crown-power") {
          if (hero.hp < hero.maxHp)
            hero = { ...hero, hp: Math.min(hero.maxHp, hero.hp + 2) };
          if (hero.mp < hero.maxMp)
            hero = { ...hero, mp: Math.min(hero.maxMp, hero.mp + 2) };
          break;
        }
      }
    }

    // ── Cursed Ground poison tick ─────────────────────────
    if (cursedGround) {
      const cgDmg = 3;
      hero = { ...hero, hp: Math.max(0, hero.hp - cgDmg) };
      messages = [
        ...messages,
        {
          text: `Cursed ground saps your life! ${cgDmg} damage. (${hero.hp}/${hero.maxHp} HP)`,
          severity: "combat" as const,
          turn: state.turn,
        },
      ];
    }

    const remaining = hero.activeEffects
      .map((e) => ({ ...e, turnsRemaining: e.turnsRemaining - 1 }))
      .filter((e) => e.turnsRemaining > 0);

    const expired = hero.activeEffects.filter(
      (e) => !remaining.find((r) => r.id === e.id),
    );

    // Poison damage tick
    const poisoned = hero.activeEffects.find(
      (e) => e.id === "poisoned" && e.turnsRemaining > 0,
    );
    if (poisoned) {
      const poisonDmg = 3;
      hero = { ...hero, hp: Math.max(0, hero.hp - poisonDmg) };
      messages = [
        ...messages,
        {
          text: `Poison deals ${poisonDmg} damage! (${hero.hp}/${hero.maxHp} HP)`,
          severity: "combat" as const,
          turn: state.turn,
        },
      ];
    }

    for (const e of expired) {
      messages = [
        ...messages,
        {
          text: `${e.name} has worn off.`,
          severity: "system" as const,
          turn: state.turn,
        },
      ];
    }

    // Recompute so shield's +4 AC and resist bonuses drop correctly when those effects end.
    hero = { ...hero, activeEffects: remaining };
    const needsRecompute = expired.some(
      (e) => e.id === "shield" || e.id.startsWith("resist-"),
    );
    if (needsRecompute) {
      hero = recomputeDerivedStats(hero, state.statueUpgrades);
    }

    return { ...state, hero, messages };
  }

  private processMonsterTurns(state: GameState): GameState {
    if (state.hero.hp <= 0) return state;
    return processAllMonsterTurns(state);
  }

  render(): void {
    this.onRender(this.state);
  }
}
