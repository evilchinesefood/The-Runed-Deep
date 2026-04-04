import type { GameState } from "../../core/types";

export interface ModifierFlags {
  darkness: boolean;
  frenzied: boolean;
  brittle: boolean;
  silence: boolean;
  abundance: boolean;
  cursedGround: boolean;
  glassCannon: boolean;
  swarm: boolean;
  elementalSurge: boolean;
  packhunter: boolean;
  fortunate: boolean;
  enfeebled: boolean;
}

export function getModifierFlags(state: GameState): ModifierFlags {
  const mods = state.activeRift?.modifiers ?? [];
  const has = (id: string) => mods.some((m) => m.id === id);
  return {
    darkness: has("darkness"),
    frenzied: has("frenzied"),
    brittle: has("brittle"),
    silence: has("silence"),
    abundance: has("abundance"),
    cursedGround: has("cursed-ground"),
    glassCannon: has("glass-cannon"),
    swarm: has("swarm"),
    elementalSurge: has("elemental-surge"),
    packhunter: has("packhunter"),
    fortunate: has("fortunate"),
    enfeebled: has("enfeebled"),
  };
}
