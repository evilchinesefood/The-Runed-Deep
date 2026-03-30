import type { GameState, GameAction } from "./types";
import { processAction } from "./actions";
import { processAllMonsterTurns } from "../systems/monsters/ai";
import { checkAndApplyLevelUps } from "../systems/character/leveling";
import { Sound } from "../systems/Sound";
import { hasEnchant, equipAffixTotal, equipAffixTotal2 } from "../utils/Enchants";
import { getDifficultyConfig } from "../data/difficulty";
import { ITEM_BY_ID } from "../data/items";
import { recomputeDerivedStats } from "../systems/character/derived-stats";

export type RenderCallback = (state: GameState) => void;
export type StateChangeCallback = (state: GameState) => void;

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
    this.state = state;
    this.onStateChange?.(state);
    this.onRender(state);
  }

  setOnStateChange(callback: StateChangeCallback): void {
    this.onStateChange = callback;
  }

  handleAction(action: GameAction): void {
    // 1. Process player action
    let newState = processAction(this.state, action);

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
    const timeStopped = newState.hero.activeEffects.some(e => e.id === "time-stop" && e.turnsRemaining > 0);
    // Swiftness: chance-based extra action (skip monster turn) — capped at 75% total
    const swiftPct = Math.min(75, equipAffixTotal(newState.hero.equipment, "swiftness"));
    const skipMonsters = timeStopped || (swiftPct > 0 && Math.random() * 100 < swiftPct);
    if (
      newState.screen === "game" &&
      newState.turn > this.state.turn &&
      newState.currentDungeon !== "town" &&
      !skipMonsters
    ) {
      newState = this.processMonsterTurns(newState);
    }

    // 5. Check for player death
    if (newState.screen === "game" && newState.hero.hp <= 0) {
      Sound.playerDeath();
      newState = { ...newState, screen: "death" };
    }

    // 6. Update state and render
    this.state = newState;
    this.onStateChange?.(newState);
    this.onRender(newState);
  }

  private tickActiveEffects(state: GameState): GameState {
    let hero = { ...state.hero };
    let messages = [...state.messages];

    // ── Regeneration affix (scaled) ─────────────────────────
    const regenHp = equipAffixTotal(hero.equipment, "regeneration");
    if (regenHp > 0 && state.turn % 2 === 0 && hero.hp < hero.maxHp) {
      const healMult = getDifficultyConfig(state.difficulty).healingMult;
      const heal = Math.max(1, Math.round(regenHp * healMult));
      hero = { ...hero, hp: Math.min(hero.maxHp, hero.hp + heal) };
    }

    // ── Arcane Mastery MP regen (secondary value) ───────────
    if (hasEnchant(hero.equipment, "arcane-mastery") && state.turn % 3 === 0 && hero.mp < hero.maxMp) {
      const mpRegen = Math.max(1, Math.round(equipAffixTotal2(hero.equipment, "arcane-mastery")));
      hero = { ...hero, mp: Math.min(hero.maxMp, hero.mp + mpRegen) };
    }

    // ── Crown of the Ancients: +2 HP and +2 MP per turn ────
    for (const eq of Object.values(hero.equipment)) {
      if (eq && ITEM_BY_ID[eq.templateId]?.uniqueAbility === 'crown-power') {
        if (hero.hp < hero.maxHp) hero = { ...hero, hp: Math.min(hero.maxHp, hero.hp + 2) };
        if (hero.mp < hero.maxMp) hero = { ...hero, mp: Math.min(hero.maxMp, hero.mp + 2) };
        break;
      }
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

      // Shield armor bonus removed manually; resist spells handled by recomputeDerivedStats
      if (e.id === "shield") {
        hero = { ...hero, armorValue: Math.max(0, hero.armorValue - 4) };
      }
    }

    // Recompute stats if any resist spell expired (so resistance drops correctly)
    hero = { ...hero, activeEffects: remaining };
    const hasResistExpiry = expired.some(e => e.id.startsWith('resist-'));
    if (hasResistExpiry) {
      hero = recomputeDerivedStats(hero);
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
