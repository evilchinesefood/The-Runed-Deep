import type { GameState, GameAction } from './types';
import { processAction } from './actions';

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

    // 2. Process monster turns (when in game screen and a turn-consuming action happened)
    if (newState.screen === 'game' && newState.turn > this.state.turn) {
      newState = this.processMonsterTurns(newState);
    }

    // 3. Update state and render
    this.state = newState;
    this.onStateChange?.(newState);
    this.onRender(newState);
  }

  private processMonsterTurns(state: GameState): GameState {
    const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
    const floor = state.floors[floorKey];
    if (!floor) return state;

    // Each monster gets a turn — will be implemented in monster AI system
    // For now, just return state unchanged
    return state;
  }

  render(): void {
    this.onRender(this.state);
  }
}
