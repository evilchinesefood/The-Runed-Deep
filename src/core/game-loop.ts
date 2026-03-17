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

    // 3. Process monster turns (when in game screen and a turn-consuming action happened)
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

  private processMonsterTurns(state: GameState): GameState {
    if (state.hero.hp <= 0) return state;
    return processAllMonsterTurns(state);
  }

  render(): void {
    this.onRender(this.state);
  }
}
