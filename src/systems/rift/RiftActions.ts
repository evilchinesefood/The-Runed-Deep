import type { GameState, Message } from "../../core/types";
import { rollRiftModifiers, getRiftShardReward } from "./RiftModifiers";
import { generateRiftFloor } from "./RiftGen";
import { trackRiftComplete } from "../Achievements";

const RIFT_TOTAL_FLOORS = 5;

function addMessage(
  state: GameState,
  text: string,
  severity: Message["severity"],
): GameState {
  return {
    ...state,
    messages: [...state.messages, { text, severity, turn: state.turn }],
  };
}

export function processOpenRiftMenu(state: GameState): GameState {
  let offering = state.riftOffering;
  if (!offering) {
    const seed = Date.now();
    offering = { seed, modifiers: rollRiftModifiers(seed), rerollCount: 0 };
  }
  return { ...state, riftOffering: offering, screen: "rift-menu" };
}

export function processEnterRift(state: GameState): GameState {
  const offering = state.riftOffering;
  if (!offering)
    return addMessage(state, "No rift offering available.", "system");

  const rift: import("../../core/types").RiftState = {
    seed: offering.seed,
    modifiers: offering.modifiers,
    currentFloor: 1,
    totalFloors: RIFT_TOTAL_FLOORS,
    shardsEarned: 0,
  };

  const { floor, playerStart } = generateRiftFloor(rift, state);
  const riftKey = "rift-1";

  let hero = { ...state.hero, position: playerStart };

  // Enfeebled modifier: halve HP and MP
  if (rift.modifiers.some((m) => m.id === "enfeebled")) {
    hero = {
      ...hero,
      hp: Math.max(1, Math.floor(hero.maxHp / 2)),
      mp: Math.floor(hero.maxMp / 2),
    };
  }

  return {
    ...state,
    activeRift: rift,
    riftOffering: null,
    currentDungeon: "rift",
    currentFloor: 1,
    returnFloor:
      state.currentDungeon !== "town" ? state.currentFloor : state.returnFloor,
    floors: { ...state.floors, [riftKey]: floor },
    hero,
    screen: "game",
    messages: [
      ...state.messages,
      {
        text: "You step into the Fractured Rift...",
        severity: "important" as const,
        turn: state.turn,
      },
    ],
  };
}

export function processExitRift(
  state: GameState,
  teleportToTown: (s: GameState) => GameState,
): GameState {
  return {
    ...teleportToTown({ ...state, currentFloor: state.returnFloor || 1 }),
    activeRift: null,
    messages: [
      ...state.messages,
      {
        text: "You escape the rift and return to town.",
        severity: "important" as const,
        turn: state.turn,
      },
    ],
  };
}

export function processRerollRift(state: GameState): GameState {
  const offering = state.riftOffering;
  if (!offering)
    return addMessage(state, "No rift offering to reroll.", "system");

  const cost = 50;
  if (state.hero.gold < cost) {
    return addMessage(
      state,
      `Not enough gold. Reroll costs ${cost}g.`,
      "system",
    );
  }

  const newSeed = offering.seed + offering.rerollCount + 1;
  const newOffering = {
    seed: newSeed,
    modifiers: rollRiftModifiers(newSeed),
    rerollCount: offering.rerollCount + 1,
  };

  return {
    ...state,
    hero: { ...state.hero, gold: state.hero.gold - cost },
    riftOffering: newOffering,
    messages: [
      ...state.messages,
      {
        text: "The rift shifts... new modifiers appear.",
        severity: "system" as const,
        turn: state.turn,
      },
    ],
  };
}

export function processRiftComplete(state: GameState): GameState {
  const rift = state.activeRift;
  if (!rift) return state;

  const shards = getRiftShardReward(rift.modifiers);
  const totalDiff = rift.modifiers.reduce((s, m) => s + m.weight, 0);
  trackRiftComplete(totalDiff);
  return {
    ...state,
    activeRift: { ...rift, shardsEarned: shards },
    hero: { ...state.hero, runeShards: state.hero.runeShards + shards },
    screen: "rift-summary",
    messages: [
      ...state.messages,
      {
        text: `Rift conquered! You earned ${shards} Rune Shards.`,
        severity: "important" as const,
        turn: state.turn,
      },
    ],
  };
}
