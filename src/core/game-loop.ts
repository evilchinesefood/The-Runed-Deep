import type { GameState, GameAction } from "./types";
import { processAction } from "./actions";
import { processAllMonsterTurns } from "../systems/monsters/ai";
import { checkAndApplyLevelUps } from "../systems/character/leveling";
import { Sound } from "../systems/Sound";
import { hasEnchant, enchantMult } from "../utils/Enchants";

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

    // 4. Process monster turns (when in game screen, a turn-consuming action happened, and not in town)
    // Speed boost: skip monster turn every 3rd turn if hero has speed-boost equipped
    const hasSpeedBoost = hasEnchant(newState.hero.equipment, "speed-boost");
    const speedMult = enchantMult(newState.hero.equipment, "speed-boost");
    const skipModulo = speedMult >= 2 ? 2 : 3; // critical: skip every 2nd turn instead of 3rd
    const skipMonsters = hasSpeedBoost && newState.turn % skipModulo === 0;
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

    // Equipment regen enchantments
    const hasRegenHp = hasEnchant(hero.equipment, "regen-hp");
    const hasRegenMp = hasEnchant(hero.equipment, "regen-mp");
    const regenHpMult = enchantMult(hero.equipment, "regen-hp");
    const regenMpMult = enchantMult(hero.equipment, "regen-mp");
    if (hasRegenHp && state.turn % 2 === 0 && hero.hp < hero.maxHp) {
      hero = { ...hero, hp: Math.min(hero.maxHp, hero.hp + regenHpMult) };
    }
    if (hasRegenMp && state.turn % 3 === 0 && hero.mp < hero.maxMp) {
      hero = { ...hero, mp: Math.min(hero.maxMp, hero.mp + regenMpMult) };
    }

    const remaining = hero.activeEffects
      .map((e) => ({ ...e, turnsRemaining: e.turnsRemaining - 1 }))
      .filter((e) => e.turnsRemaining > 0);

    const expired = hero.activeEffects.filter(
      (e) => !remaining.find((r) => r.id === e.id),
    );

    // Poison damage tick (before expiry check — poison hurts while active)
    const poisoned = hero.activeEffects.find(
      (e) => e.id === "poisoned" && e.turnsRemaining > 1,
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

      // Reverse effect-specific bonuses
      if (e.id === "shield") {
        hero = { ...hero, armorValue: Math.max(0, hero.armorValue - 4) };
      } else if (e.id === "resist-cold") {
        hero = {
          ...hero,
          resistances: {
            ...hero.resistances,
            cold: Math.max(0, hero.resistances.cold - 50),
          },
        };
      } else if (e.id === "resist-fire") {
        hero = {
          ...hero,
          resistances: {
            ...hero.resistances,
            fire: Math.max(0, hero.resistances.fire - 50),
          },
        };
      } else if (e.id === "resist-lightning") {
        hero = {
          ...hero,
          resistances: {
            ...hero.resistances,
            lightning: Math.max(0, hero.resistances.lightning - 50),
          },
        };
      }
    }

    return {
      ...state,
      hero: { ...hero, activeEffects: remaining },
      messages,
    };
  }

  private processMonsterTurns(state: GameState): GameState {
    if (state.hero.hp <= 0) return state;
    return processAllMonsterTurns(state);
  }

  render(): void {
    this.onRender(this.state);
  }
}
