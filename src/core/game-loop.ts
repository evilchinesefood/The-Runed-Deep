import type { GameState, GameAction } from './types';
import { processAction } from './actions';
import { processAllMonsterTurns } from '../systems/monsters/ai';
import { checkAndApplyLevelUps } from '../systems/character/leveling';

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
    if (newState.screen === 'game') {
      newState = checkAndApplyLevelUps(newState);
    }

    // 3. Tick active effects (when a turn was consumed)
    if (newState.screen === 'game' && newState.turn > this.state.turn) {
      newState = this.tickActiveEffects(newState);
    }

    // 4. Process monster turns (when in game screen and a turn-consuming action happened)
    if (newState.screen === 'game' && newState.turn > this.state.turn) {
      newState = this.processMonsterTurns(newState);
    }

    // 4. Check for player death
    if (newState.screen === 'game' && newState.hero.hp <= 0) {
      newState = { ...newState, screen: 'death' };
    }

    // 4. Update state and render
    this.state = newState;
    this.onStateChange?.(newState);
    this.onRender(newState);
  }

  private tickActiveEffects(state: GameState): GameState {
    const hero = state.hero;
    const remaining = hero.activeEffects
      .map(e => ({ ...e, turnsRemaining: e.turnsRemaining - 1 }))
      .filter(e => e.turnsRemaining > 0);

    const expired = hero.activeEffects.filter(
      e => !remaining.find(r => r.id === e.id)
    );

    let messages = [...state.messages];
    for (const e of expired) {
      messages = [...messages, { text: `${e.name} has worn off.`, severity: 'system' as const, turn: state.turn }];
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
