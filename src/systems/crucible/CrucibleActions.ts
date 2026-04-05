import type { GameState } from "../../core/types";
import { generateCrucibleArena } from "./CrucibleGen";
import { spawnWave as crucibleSpawnWave, getWaveReward } from "./WaveManager";
import { trackCrucibleWave } from "../Achievements";

export function processEnterCrucible(state: GameState): GameState {
  const { floor, playerStart } = generateCrucibleArena(Date.now());

  // Spawn wave 1 immediately (rewards granted on wave clear, not entry)
  const wave1Floor = crucibleSpawnWave(floor, 1, playerStart, state.difficulty);
  trackCrucibleWave(1);

  const crucible: import("../../core/types").CrucibleState = {
    wave: 1,
    shardsEarned: 0,
    goldEarned: 0,
  };

  return {
    ...state,
    activeCrucible: crucible,
    activeRift: null,
    currentDungeon: "crucible",
    currentFloor: 0,
    returnFloor:
      state.currentDungeon !== "town" ? state.currentFloor : state.returnFloor,
    floors: { ...state.floors, "crucible-0": wave1Floor },
    hero: {
      ...state.hero,
      position: playerStart,
    },
    screen: "game",
    messages: [
      ...state.messages,
      {
        text: "You enter the Crucible. Wave 1 begins!",
        severity: "important" as const,
        turn: state.turn,
      },
    ],
  };
}

export function processExitCrucible(
  state: GameState,
  teleportToTown: (s: GameState) => GameState,
): GameState {
  const crucible = state.activeCrucible;
  let bestWave = state.crucibleBestWave ?? 0;
  if (crucible && crucible.wave > bestWave) bestWave = crucible.wave;

  return {
    ...teleportToTown({ ...state, currentFloor: state.returnFloor || 1 }),
    activeCrucible: null,
    crucibleBestWave: bestWave,
    messages: [
      ...state.messages,
      {
        text: crucible
          ? `You leave the Crucible after wave ${crucible.wave}. Earned ${crucible.shardsEarned} shards and ${crucible.goldEarned} gold.`
          : "You leave the Crucible.",
        severity: "important" as const,
        turn: state.turn,
      },
    ],
  };
}

export function processCrucibleNextWave(state: GameState): GameState {
  const crucible = state.activeCrucible;
  if (!crucible) return state;

  const nextWave = crucible.wave + 1;
  const floorKey = "crucible-0";
  const floor = state.floors[floorKey];
  if (!floor) return state;

  const updatedFloor = crucibleSpawnWave(
    floor,
    nextWave,
    state.hero.position,
    state.difficulty,
  );

  // Rewards granted on wave clear, not wave start
  trackCrucibleWave(nextWave);
  const newCrucible: import("../../core/types").CrucibleState = {
    wave: nextWave,
    shardsEarned: crucible.shardsEarned,
    goldEarned: crucible.goldEarned,
  };

  return {
    ...state,
    activeCrucible: newCrucible,
    floors: { ...state.floors, [floorKey]: updatedFloor },
    screen: "game",
    messages: [
      ...state.messages,
      {
        text: `Wave ${nextWave} begins!`,
        severity: "important" as const,
        turn: state.turn,
      },
    ],
  };
}
