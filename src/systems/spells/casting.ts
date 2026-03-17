import type { GameState, Monster, Floor, Vector2, Message, Direction } from '../../core/types';
import { SPELL_BY_ID, type SpellDef } from '../../data/spells';
import { getDirectionVector } from '../../core/actions';
import { queueAnimation } from '../../rendering/animation-queue';
import {
  buildBoltAnimation,
  buildBallAnimation,
  buildHealAnimation,
  buildBuffAnimation,
  buildTeleportAnimation,
  buildDetectAnimation,
} from '../../rendering/animations';

// ============================================================
// Spell Casting
// ============================================================

/**
 * Attempts to cast a spell. Validates mana, targeting, then resolves the effect.
 * `direction` is used for bolt spells, `target` for targeted spells.
 */
export function castSpell(
  state: GameState,
  spellId: string,
  direction?: Direction,
  target?: Vector2,
): GameState {
  const spell = SPELL_BY_ID[spellId];
  if (!spell) return addMsg(state, `Unknown spell.`, 'system');

  if (!state.hero.knownSpells.includes(spellId)) {
    return addMsg(state, `You don't know that spell.`, 'system');
  }

  const cost = Math.max(1, spell.manaCost);
  if (state.hero.mp < cost) {
    return addMsg(state, `Not enough mana to cast ${spell.name}. (Need ${cost} MP)`, 'system');
  }

  // Deduct mana
  let newState: GameState = {
    ...state,
    hero: { ...state.hero, mp: state.hero.mp - cost },
  };

  // Resolve effect
  newState = resolveSpellEffect(newState, spell, direction, target);

  // Casting consumes a turn
  return { ...newState, turn: newState.turn + 1 };
}

// ============================================================
// Spell Effect Resolution
// ============================================================

function resolveSpellEffect(
  state: GameState,
  spell: SpellDef,
  direction?: Direction,
  target?: Vector2,
): GameState {
  switch (spell.id) {
    // ── Attack spells ───────────────────────────────────
    case 'magic-arrow':
      return resolveBolt(state, spell, direction, 1, 8, 'physical');
    case 'cold-bolt':
      return resolveBolt(state, spell, direction, 4, 16, 'cold');
    case 'lightning-bolt':
      return resolveBolt(state, spell, direction, 6, 24, 'lightning');
    case 'fire-bolt':
      return resolveBolt(state, spell, direction, 6, 24, 'fire');
    case 'cold-ball':
      return resolveBall(state, spell, direction, target, 8, 32, 'cold');
    case 'ball-lightning':
      return resolveBall(state, spell, direction, target, 10, 40, 'lightning');
    case 'fire-ball':
      return resolveBall(state, spell, direction, target, 12, 48, 'fire');

    // ── Healing spells ──────────────────────────────────
    case 'heal-minor-wounds':
      return resolveHeal(state, spell, 0.15, 5);
    case 'heal-medium-wounds':
      return resolveHeal(state, spell, 0.35, 15);
    case 'heal-major-wounds':
      return resolveHeal(state, spell, 0.60, 30);
    case 'healing':
      return resolveHeal(state, spell, 1.0, 999);
    case 'neutralize-poison':
      return addMsg(state, `${state.hero.name} is cleansed of poison.`, 'system');

    // ── Defense spells ──────────────────────────────────
    case 'shield':
      return resolveShield(state, spell);
    case 'resist-cold':
    case 'resist-fire':
    case 'resist-lightning':
      return resolveResist(state, spell);

    // ── Control spells ──────────────────────────────────
    case 'sleep-monster': {
      const t = target ?? (direction ? findTargetInDirection(state, direction) : undefined);
      return resolveSleepMonster(state, t);
    }
    case 'slow-monster': {
      const t = target ?? (direction ? findTargetInDirection(state, direction) : undefined);
      return resolveSlowMonster(state, t);
    }
    case 'transmogrify-monster':
      return addMsg(state, `The air shimmers but nothing happens... yet.`, 'system');

    // ── Movement spells ─────────────────────────────────
    case 'phase-door':
      return resolvePhaseDoor(state);
    case 'levitation':
      return addMsg(state, `${state.hero.name} begins to levitate. Traps will not trigger.`, 'system');
    case 'rune-of-return':
      return addMsg(state, `A rune of return glows beneath your feet.`, 'system');
    case 'teleport':
      return resolveTeleport(state);

    // ── Divination spells ───────────────────────────────
    case 'detect-objects':
      return resolveDetectObjects(state);
    case 'detect-monsters':
      return resolveDetectMonsters(state);
    case 'detect-traps':
      return resolveDetectTraps(state);
    case 'identify':
      return addMsg(state, `The identify spell requires an item to target.`, 'system');
    case 'clairvoyance':
      return resolveClairvoyance(state);

    // ── Misc spells ─────────────────────────────────────
    case 'light':
      return resolveLight(state);
    case 'remove-curse':
      return addMsg(state, `The remove curse spell requires a cursed equipped item.`, 'system');

    default:
      return addMsg(state, `${spell.name} fizzles.`, 'system');
  }
}

// ============================================================
// Bolt spells — fire in a direction, hit first monster
// ============================================================

function resolveBolt(
  state: GameState,
  spell: SpellDef,
  direction: Direction | undefined,
  minDmg: number,
  maxDmg: number,
  element: string,
): GameState {
  if (!direction) return addMsg(state, `You need to pick a direction for ${spell.name}.`, 'system');

  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  const delta = getDirectionVector(direction);
  let x = state.hero.position.x;
  let y = state.hero.position.y;

  // Trace the bolt up to 12 tiles
  for (let step = 0; step < 12; step++) {
    x += delta.x;
    y += delta.y;

    if (x < 0 || x >= floor.width || y < 0 || y >= floor.height) break;
    if (!floor.tiles[y][x].transparent && floor.tiles[y][x].type === 'wall') break;

    // Check for monster
    const monsterIdx = floor.monsters.findIndex(m => m.position.x === x && m.position.y === y);
    if (monsterIdx !== -1) {
      queueAnimation(buildBoltAnimation(spell.id, state.hero.position, direction, 12, { x, y }, floor));
      return applySpellDamageToMonster(state, floorKey, monsterIdx, spell, minDmg, maxDmg, element);
    }
  }

  // Missed — still show the bolt flying
  queueAnimation(buildBoltAnimation(spell.id, state.hero.position, direction, 12, undefined, floor));
  return addMsg(state, `The ${spell.name} flies off into the darkness.`, 'combat');
}

// ============================================================
// Ball spells — AoE at target, half damage to adjacent
// ============================================================

function resolveBall(
  state: GameState,
  spell: SpellDef,
  direction: Direction | undefined,
  target: Vector2 | undefined,
  minDmg: number,
  maxDmg: number,
  element: string,
): GameState {
  // If we have a direction but no target, find the first monster in that direction
  if (!target && direction) {
    target = findTargetInDirection(state, direction);
  }
  if (!target) return addMsg(state, `You need to pick a target for ${spell.name}.`, 'system');

  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  // Queue ball animation (projectile + explosion)
  if (direction) {
    queueAnimation(buildBallAnimation(spell.id, state.hero.position, direction, target, floor));
  }

  let currentState = addMsg(state, `${state.hero.name} casts ${spell.name}!`, 'combat');

  // Direct hit on target tile
  const directIdx = floor.monsters.findIndex(m => m.position.x === target.x && m.position.y === target.y);
  if (directIdx !== -1) {
    currentState = applySpellDamageToMonster(currentState, floorKey, directIdx, spell, minDmg, maxDmg, element);
  }

  // Splash damage to adjacent 8 tiles (half damage)
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const ax = target.x + dx;
      const ay = target.y + dy;
      const currentFloor = currentState.floors[floorKey];
      if (!currentFloor) continue;
      const adjIdx = currentFloor.monsters.findIndex(m => m.position.x === ax && m.position.y === ay);
      if (adjIdx !== -1) {
        currentState = applySpellDamageToMonster(currentState, floorKey, adjIdx, spell, Math.floor(minDmg / 2), Math.floor(maxDmg / 2), element);
      }
      // Self-damage if hero is in splash
      if (ax === currentState.hero.position.x && ay === currentState.hero.position.y) {
        const selfDmg = rollRange(Math.floor(minDmg / 2), Math.floor(maxDmg / 2));
        currentState = {
          ...currentState,
          hero: { ...currentState.hero, hp: currentState.hero.hp - selfDmg },
        };
        currentState = addMsg(currentState, `${currentState.hero.name} is caught in the blast for ${selfDmg} damage!`, 'combat');
      }
    }
  }

  return currentState;
}

// ============================================================
// Apply spell damage to a monster
// ============================================================

function applySpellDamageToMonster(
  state: GameState,
  floorKey: string,
  monsterIdx: number,
  spell: SpellDef,
  minDmg: number,
  maxDmg: number,
  element: string,
): GameState {
  const floor = state.floors[floorKey];
  if (!floor || monsterIdx >= floor.monsters.length) return state;

  const monster = floor.monsters[monsterIdx];
  let damage = rollRange(minDmg, maxDmg);

  // Apply elemental resistance
  const resistance = getElementResistance(monster, element);
  if (resistance >= 100) {
    return addMsg(state, `The ${monster.name} is immune to ${element}!`, 'combat');
  }
  if (resistance > 0) {
    damage = Math.round(damage * (1 - resistance / 100));
  }
  if (resistance < 0) {
    damage = Math.round(damage * (1 + Math.abs(resistance) / 100));
  }

  damage = Math.max(1, damage);
  const newHp = monster.hp - damage;

  if (newHp <= 0) {
    const newMonsters = [...floor.monsters];
    newMonsters.splice(monsterIdx, 1);
    const newFloor: Floor = { ...floor, monsters: newMonsters };
    return {
      ...addMsg(state, `${spell.name} hits the ${monster.name} for ${damage} ${element} damage, killing it! (+${monster.xpValue} XP)`, 'combat'),
      hero: { ...state.hero, mp: state.hero.mp, xp: state.hero.xp + monster.xpValue },
      floors: { ...state.floors, [floorKey]: newFloor },
    };
  }

  const updatedMonster = { ...monster, hp: newHp };
  const newMonsters = [...floor.monsters];
  newMonsters[monsterIdx] = updatedMonster;
  const newFloor: Floor = { ...floor, monsters: newMonsters };
  return {
    ...addMsg(state, `${spell.name} hits the ${monster.name} for ${damage} ${element} damage. (${newHp}/${monster.maxHp} HP)`, 'combat'),
    floors: { ...state.floors, [floorKey]: newFloor },
  };
}

function getElementResistance(monster: Monster, element: string): number {
  switch (element) {
    case 'cold': return monster.resistances.cold;
    case 'fire': return monster.resistances.fire;
    case 'lightning': return monster.resistances.lightning;
    case 'acid': return monster.resistances.acid;
    case 'drain': return monster.resistances.drain;
    default: return 0; // physical
  }
}

// ============================================================
// Healing spells
// ============================================================

function resolveHeal(state: GameState, spell: SpellDef, pct: number, minHeal: number): GameState {
  const hero = state.hero;
  const healAmount = Math.max(minHeal, Math.floor(hero.maxHp * pct));
  const newHp = Math.min(hero.hp + healAmount, hero.maxHp);
  const healed = newHp - hero.hp;

  if (healed <= 0) {
    return addMsg(state, `${hero.name} is already at full health.`, 'system');
  }

  queueAnimation(buildHealAnimation(hero.position));

  return {
    ...addMsg(state, `${spell.name} heals ${hero.name} for ${healed} HP. (${newHp}/${hero.maxHp})`, 'important'),
    hero: { ...hero, hp: newHp },
  };
}

// ============================================================
// Shield spell — temporary AC boost
// ============================================================

function resolveShield(state: GameState, _spell: SpellDef): GameState {
  queueAnimation(buildBuffAnimation(state.hero.position, '#48f'));
  const hero = state.hero;
  const newEffects = [
    ...hero.activeEffects.filter(e => e.id !== 'shield'),
    { id: 'shield', name: 'Shield', turnsRemaining: 30 },
  ];
  return {
    ...addMsg(state, `A magical shield surrounds ${hero.name}. (+4 AC for 30 turns)`, 'important'),
    hero: { ...hero, activeEffects: newEffects, armorValue: hero.armorValue + 4 },
  };
}

// ============================================================
// Resist spells
// ============================================================

function resolveResist(state: GameState, spell: SpellDef): GameState {
  const element = spell.id.replace('resist-', '');
  const color = element === 'cold' ? '#4af' : element === 'fire' ? '#f64' : '#ff4';
  queueAnimation(buildBuffAnimation(state.hero.position, color));
  const hero = state.hero;
  const newEffects = [
    ...hero.activeEffects.filter(e => e.id !== spell.id),
    { id: spell.id, name: spell.name, turnsRemaining: 50 },
  ];
  const newResistances = { ...hero.resistances };
  if (element === 'cold') newResistances.cold = Math.min(75, newResistances.cold + 50);
  else if (element === 'fire') newResistances.fire = Math.min(75, newResistances.fire + 50);
  else if (element === 'lightning') newResistances.lightning = Math.min(75, newResistances.lightning + 50);

  return {
    ...addMsg(state, `${hero.name} gains resistance to ${element} for 50 turns.`, 'important'),
    hero: { ...hero, activeEffects: newEffects, resistances: newResistances },
  };
}

// ============================================================
// Sleep/Slow Monster
// ============================================================

function resolveSleepMonster(state: GameState, target: Vector2 | undefined): GameState {
  if (!target) return addMsg(state, `You need to pick a target.`, 'system');
  return applyStatusToMonster(state, target, 'sleeping', `falls asleep!`);
}

function resolveSlowMonster(state: GameState, target: Vector2 | undefined): GameState {
  if (!target) return addMsg(state, `You need to pick a target.`, 'system');
  return applyStatusToMonster(state, target, 'slowed', `is slowed!`);
}

function applyStatusToMonster(state: GameState, target: Vector2, status: 'sleeping' | 'slowed', msg: string): GameState {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  const idx = floor.monsters.findIndex(m => m.position.x === target.x && m.position.y === target.y);
  if (idx === -1) return addMsg(state, `There's no monster there.`, 'system');

  const monster = floor.monsters[idx];
  const updated = { ...monster, [status]: true };
  const newMonsters = [...floor.monsters];
  newMonsters[idx] = updated;

  return {
    ...addMsg(state, `The ${monster.name} ${msg}`, 'combat'),
    floors: { ...state.floors, [floorKey]: { ...floor, monsters: newMonsters } },
  };
}

// ============================================================
// Movement spells
// ============================================================

function resolvePhaseDoor(state: GameState): GameState {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  // Teleport 3-6 tiles in a random direction
  for (let attempt = 0; attempt < 50; attempt++) {
    const dx = Math.floor(Math.random() * 13) - 6;
    const dy = Math.floor(Math.random() * 13) - 6;
    const dist = Math.abs(dx) + Math.abs(dy);
    if (dist < 3 || dist > 8) continue;

    const nx = state.hero.position.x + dx;
    const ny = state.hero.position.y + dy;
    if (nx < 0 || nx >= floor.width || ny < 0 || ny >= floor.height) continue;
    if (!floor.tiles[ny][nx].walkable) continue;
    if (floor.monsters.some(m => m.position.x === nx && m.position.y === ny)) continue;

    queueAnimation(buildTeleportAnimation(state.hero.position, { x: nx, y: ny }));
    return {
      ...addMsg(state, `${state.hero.name} phases through space!`, 'important'),
      hero: { ...state.hero, position: { x: nx, y: ny } },
    };
  }

  return addMsg(state, `The phase door fizzles — no safe destination found.`, 'system');
}

function resolveTeleport(state: GameState): GameState {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  // Random walkable position
  const candidates: Vector2[] = [];
  for (let y = 0; y < floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      if (floor.tiles[y][x].walkable && !floor.monsters.some(m => m.position.x === x && m.position.y === y)) {
        candidates.push({ x, y });
      }
    }
  }

  if (candidates.length === 0) return addMsg(state, `The teleport fizzles.`, 'system');
  const dest = candidates[Math.floor(Math.random() * candidates.length)];

  queueAnimation(buildTeleportAnimation(state.hero.position, dest));
  return {
    ...addMsg(state, `${state.hero.name} teleports!`, 'important'),
    hero: { ...state.hero, position: dest },
  };
}

// ============================================================
// Divination spells
// ============================================================

function resolveDetectMonsters(state: GameState): GameState {
  queueAnimation(buildDetectAnimation(state.hero.position, '#f44'));
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  // Reveal all monster positions by marking their tiles as explored
  const explored = floor.explored.map(row => [...row]);
  for (const m of floor.monsters) {
    if (m.position.y >= 0 && m.position.y < floor.height && m.position.x >= 0 && m.position.x < floor.width) {
      explored[m.position.y][m.position.x] = true;
    }
  }

  return {
    ...addMsg(state, `${state.hero.name} senses ${floor.monsters.length} monsters on this floor.`, 'important'),
    floors: { ...state.floors, [floorKey]: { ...floor, explored } },
  };
}

function resolveDetectObjects(state: GameState): GameState {
  queueAnimation(buildDetectAnimation(state.hero.position, '#ff0'));
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  const explored = floor.explored.map(row => [...row]);
  for (const item of floor.items) {
    if (item.position.y >= 0 && item.position.y < floor.height) {
      explored[item.position.y][item.position.x] = true;
    }
  }

  return {
    ...addMsg(state, `${state.hero.name} senses ${floor.items.length} items on this floor.`, 'important'),
    floors: { ...state.floors, [floorKey]: { ...floor, explored } },
  };
}

function resolveDetectTraps(state: GameState): GameState {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  let trapsFound = 0;
  const tiles = floor.tiles.map(row => row.map(t => {
    if (t.type === 'trap' && !t.trapRevealed) {
      const dist = Math.abs(0) // all traps for now
      if (dist >= 0) { trapsFound++; return { ...t, trapRevealed: true }; }
    }
    return t;
  }));

  return {
    ...addMsg(state, trapsFound > 0 ? `${state.hero.name} detects ${trapsFound} traps!` : `No traps detected nearby.`, 'important'),
    floors: { ...state.floors, [floorKey]: { ...floor, tiles } },
  };
}

function resolveClairvoyance(state: GameState): GameState {
  queueAnimation(buildDetectAnimation(state.hero.position, '#88f'));
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  // Reveal 10x10 area around the player
  const explored = floor.explored.map(row => [...row]);
  const px = state.hero.position.x;
  const py = state.hero.position.y;

  for (let dy = -5; dy <= 5; dy++) {
    for (let dx = -5; dx <= 5; dx++) {
      const x = px + dx;
      const y = py + dy;
      if (x >= 0 && x < floor.width && y >= 0 && y < floor.height) {
        explored[y][x] = true;
      }
    }
  }

  return {
    ...addMsg(state, `${state.hero.name}'s vision expands, revealing the surrounding area.`, 'important'),
    floors: { ...state.floors, [floorKey]: { ...floor, explored } },
  };
}

// ============================================================
// Light spell — increase FOV radius temporarily
// ============================================================

function resolveLight(state: GameState): GameState {
  queueAnimation(buildBuffAnimation(state.hero.position, '#ff8'));
  const hero = state.hero;
  const newEffects = [
    ...hero.activeEffects.filter(e => e.id !== 'light'),
    { id: 'light', name: 'Light', turnsRemaining: 100 },
  ];
  return {
    ...addMsg(state, `The area around ${hero.name} brightens.`, 'important'),
    hero: { ...hero, activeEffects: newEffects },
  };
}

// ============================================================
// Helpers
// ============================================================

/**
 * Find the nearest monster in a given direction from the hero.
 * Traces a line up to 12 tiles and returns the first monster position found.
 */
function findTargetInDirection(state: GameState, direction: Direction): Vector2 | undefined {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return undefined;

  const delta = getDirectionVector(direction);
  let x = state.hero.position.x;
  let y = state.hero.position.y;

  for (let step = 0; step < 12; step++) {
    x += delta.x;
    y += delta.y;
    if (x < 0 || x >= floor.width || y < 0 || y >= floor.height) break;
    if (!floor.tiles[y][x].walkable) break;

    const monster = floor.monsters.find(m => m.position.x === x && m.position.y === y);
    if (monster) return { x, y };
  }

  // No monster found — target the furthest open tile in that direction
  return { x: x - delta.x, y: y - delta.y };
}

function rollRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addMsg(state: GameState, text: string, severity: Message['severity']): GameState {
  return { ...state, messages: [...state.messages, { text, severity, turn: state.turn }] };
}
