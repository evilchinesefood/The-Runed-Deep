import type { SpellAnimation } from './animations';

/**
 * Global animation queue. Spell casting and combat push animations here,
 * and the game loop plays them before the next render.
 */
let pendingAnimations: SpellAnimation[][] = [];

export function queueAnimation(anims: SpellAnimation[]): void {
  if (anims.length > 0) {
    pendingAnimations.push(anims);
  }
}

export function drainAnimations(): SpellAnimation[][] {
  const result = pendingAnimations;
  pendingAnimations = [];
  return result;
}

export function hasPendingAnimations(): boolean {
  return pendingAnimations.length > 0;
}
