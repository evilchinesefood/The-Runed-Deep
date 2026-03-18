import type { GameState, Floor, Vector2, Monster, Message } from '../../core/types';
import { monsterAttacksPlayer } from '../combat/combat';
import { queueAnimation } from '../../rendering/animation-queue';
import { buildBoltAnimation, buildBallAnimation } from '../../rendering/animations';
import { recomputeDerivedStats } from '../character/derived-stats';
import { getMonstersForDepth } from '../../data/monsters';
import { createMonster } from './spawning';
import { xpRequiredForLevel } from '../character/leveling';

// ── Helpers ─────────────────────────────────────────────────

function rollRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function manhattan(a: Vector2, b: Vector2): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function chebyshev(a: Vector2, b: Vector2): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

const ALL_DIRS: Vector2[] = [
  { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
  { x: -1, y: 0 },                    { x: 1, y: 0 },
  { x: -1, y: 1 },  { x: 0, y: 1 },  { x: 1, y: 1 },
];

/** True if tile at (x,y) is within bounds and walkable. */
function walkable(floor: Floor, x: number, y: number): boolean {
  if (x < 0 || x >= floor.width || y < 0 || y >= floor.height) return false;
  return floor.tiles[y][x].walkable;
}

/** Like walkable but ghosts with 'phase-through-walls' can pass through walls. */
function canMoveTo(floor: Floor, x: number, y: number, phasing: boolean): boolean {
  if (x < 0 || x >= floor.width || y < 0 || y >= floor.height) return false;
  if (phasing) return true;
  return floor.tiles[y][x].walkable;
}

/** True if no other monster occupies (x,y) (excluding monsterIndex). */
function noMonster(floor: Floor, x: number, y: number, excludeIdx: number): boolean {
  return !floor.monsters.some((m, i) => i !== excludeIdx && m.position.x === x && m.position.y === y);
}

/**
 * Simple raycasting line-of-sight check.
 * Returns true if there are no opaque tiles between from and to (exclusive of endpoints).
 */
export function hasLineOfSight(floor: Floor, from: Vector2, to: Vector2): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  if (steps === 0) return true;

  for (let i = 1; i < steps; i++) {
    const x = Math.round(from.x + (dx * i) / steps);
    const y = Math.round(from.y + (dy * i) / steps);
    if (x < 0 || x >= floor.width || y < 0 || y >= floor.height) return false;
    if (!floor.tiles[y][x].transparent) return false;
  }
  return true;
}

/**
 * Returns the 8-direction name closest to the vector from → to.
 */
function directionTo(from: Vector2, to: Vector2): import('../../core/types').Direction {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  // atan2: east=0, south=90, west=180/-180, north=-90
  if (angle >= -22.5 && angle < 22.5)  return 'E';
  if (angle >= 22.5  && angle < 67.5)  return 'SE';
  if (angle >= 67.5  && angle < 112.5) return 'S';
  if (angle >= 112.5 && angle < 157.5) return 'SW';
  if (angle >= 157.5 || angle < -157.5) return 'W';
  if (angle >= -157.5 && angle < -112.5) return 'NW';
  if (angle >= -112.5 && angle < -67.5) return 'N';
  return 'NE';
}

function addMsg(state: GameState, text: string, severity: Message['severity'] = 'combat'): GameState {
  return {
    ...state,
    messages: [...state.messages, { text, severity, turn: state.turn }],
  };
}

function updateMonster(state: GameState, floorKey: string, idx: number, updated: Monster): GameState {
  const floor = state.floors[floorKey];
  if (!floor) return state;
  const monsters = [...floor.monsters];
  monsters[idx] = updated;
  return { ...state, floors: { ...state.floors, [floorKey]: { ...floor, monsters } } };
}

// ── Movement helpers ─────────────────────────────────────────

/** Move monster toward a target. Returns new state. */
function moveToward(state: GameState, floorKey: string, idx: number, target: Vector2): GameState {
  const floor = state.floors[floorKey];
  if (!floor) return state;
  const monster = floor.monsters[idx];
  const { x, y } = monster.position;
  const phasing = monster.abilities.includes('phase-through-walls');

  let bestPos: Vector2 | null = null;
  let bestDist = Infinity;

  for (const d of ALL_DIRS) {
    const nx = x + d.x, ny = y + d.y;
    if (!canMoveTo(floor, nx, ny, phasing)) continue;
    if (!noMonster(floor, nx, ny, idx)) continue;
    if (nx === target.x && ny === target.y) continue; // don't walk onto hero

    const dist = manhattan({ x: nx, y: ny }, target);
    if (dist < bestDist) { bestDist = dist; bestPos = { x: nx, y: ny }; }
  }

  if (!bestPos) return state;
  return updateMonster(state, floorKey, idx, { ...monster, position: bestPos });
}

/** Move monster away from a target (flee or ranged retreat). */
function moveAwayFrom(state: GameState, floorKey: string, idx: number, threat: Vector2): GameState {
  const floor = state.floors[floorKey];
  if (!floor) return state;
  const monster = floor.monsters[idx];
  const { x, y } = monster.position;
  const phasing = monster.abilities.includes('phase-through-walls');

  let bestPos: Vector2 | null = null;
  let bestDist = -Infinity;

  for (const d of ALL_DIRS) {
    const nx = x + d.x, ny = y + d.y;
    if (!canMoveTo(floor, nx, ny, phasing)) continue;
    if (!noMonster(floor, nx, ny, idx)) continue;

    const dist = manhattan({ x: nx, y: ny }, threat);
    if (dist > bestDist) { bestDist = dist; bestPos = { x: nx, y: ny }; }
  }

  if (!bestPos) return state;
  return updateMonster(state, floorKey, idx, { ...monster, position: bestPos });
}

/** Move monster to stay at a preferred distance range from the target. */
function moveToRange(
  state: GameState, floorKey: string, idx: number,
  target: Vector2, minDist: number, maxDist: number,
): GameState {
  const floor = state.floors[floorKey];
  if (!floor) return state;
  const monster = floor.monsters[idx];
  const dist = manhattan(monster.position, target);

  if (dist < minDist) return moveAwayFrom(state, floorKey, idx, target);
  if (dist > maxDist) return moveToward(state, floorKey, idx, target);
  return state; // already in range, stay put
}

// ── Summoning ────────────────────────────────────────────────

const SUMMON_TYPE_MAP: Record<string, string[]> = {
  'summon-monster': ['giant-rat', 'wild-dog', 'goblin', 'kobold'],
  'summon-undead':  ['skeleton', 'walking-corpse', 'shadow'],
  'summon-devil':   ['ice-devil', 'spiked-devil', 'horned-devil'],
};

function spawnNearSummoner(state: GameState, floorKey: string, summonerIdx: number, ability: string): GameState {
  const floor = state.floors[floorKey];
  if (!floor) return state;
  const summoner = floor.monsters[summonerIdx];

  // Count already-summoned monsters (track by summonerId property — we use a simple approach:
  // count all living monsters with templateIds matching summon pools belonging to this summoner.
  // For simplicity, cap total floor monsters from this summoner heuristically.)
  const summonedTemplateIds = SUMMON_TYPE_MAP[ability] ?? SUMMON_TYPE_MAP['summon-monster'];
  const existingSummoned = floor.monsters.filter(
    (m, i) => i !== summonerIdx && summonedTemplateIds.includes(m.templateId)
  ).length;
  if (existingSummoned >= 3) return state;

  const depth = state.currentFloor + 1;
  const available = getMonstersForDepth(depth).filter(t => summonedTemplateIds.includes(t.id));
  if (available.length === 0) return state;

  const count = rollRange(1, 2);
  let cur = state;
  let spawned = 0;

  for (const d of ALL_DIRS) {
    if (spawned >= count) break;
    const nx = summoner.position.x + d.x;
    const ny = summoner.position.y + d.y;
    if (!walkable(floor, nx, ny)) continue;

    const curFloor = cur.floors[floorKey];
    if (!curFloor) break;
    const occupied = curFloor.monsters.some(m => m.position.x === nx && m.position.y === ny);
    if (occupied) continue;
    if (cur.hero.position.x === nx && cur.hero.position.y === ny) continue;

    const template = available[Math.floor(Math.random() * available.length)];
    const newMonster = createMonster(template, { x: nx, y: ny }, depth, Math.random);

    const newMonsters = [...curFloor.monsters, newMonster];
    cur = {
      ...cur,
      floors: { ...cur.floors, [floorKey]: { ...curFloor, monsters: newMonsters } },
    };
    spawned++;
  }

  if (spawned > 0) {
    cur = addMsg(cur, `${summoner.name} summons reinforcements!`, 'important');
  }
  return cur;
}

// ── Ranged attack ────────────────────────────────────────────

/**
 * Handles a monster's ranged or spell attack on the hero.
 * Queues animations and applies damage.
 */
export function monsterRangedAttack(state: GameState, monster: Monster, ability: string): GameState {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  const hero = state.hero;
  const dir = directionTo(monster.position, hero.position);
  const depth = state.currentFloor + 1;

  // ── Spell bolts ──────────────────────────────────────────
  if (ability === 'cast-fire-bolt' || ability === 'cast-cold-bolt' || ability === 'cast-lightning-bolt') {
    const spellId = ability.replace('cast-', '');
    const dmg = rollRange(4, 12) + Math.floor(depth / 2);
    const elem = spellId.replace('-bolt', '') as keyof typeof hero.resistances;
    const resist = (hero.resistances[elem] ?? 0) / 100;
    const finalDmg = Math.max(1, Math.round(dmg * (1 - resist)));

    const anims = buildBoltAnimation(spellId, monster.position, dir, 12, hero.position, floor);
    queueAnimation(anims);

    const newHp = Math.max(0, hero.hp - finalDmg);
    let s = addMsg(state, `${monster.name} casts a ${spellId.replace('-', ' ')} at you for ${finalDmg} damage!`);
    s = { ...s, hero: { ...s.hero, hp: newHp } };
    return s;
  }

  // ── Physical ranged ──────────────────────────────────────
  if (ability === 'throw-boulder') {
    const dmg = rollRange(6, 14);
    const anims = buildBoltAnimation('magic-arrow', monster.position, dir, 10, hero.position, floor);
    queueAnimation(anims);
    const newHp = Math.max(0, hero.hp - dmg);
    let s = addMsg(state, `${monster.name} hurls a boulder at you for ${dmg} damage!`);
    s = { ...s, hero: { ...s.hero, hp: newHp } };
    return s;
  }

  if (ability === 'tail-spikes') {
    const dmg = rollRange(4, 10);
    const anims = buildBoltAnimation('magic-arrow', monster.position, dir, 8, hero.position, floor);
    queueAnimation(anims);
    const newHp = Math.max(0, hero.hp - dmg);
    let s = addMsg(state, `${monster.name} fires tail spikes at you for ${dmg} damage!`);
    s = { ...s, hero: { ...s.hero, hp: newHp } };
    return s;
  }

  // ── AoE ball ─────────────────────────────────────────────
  if (ability === 'throw-ice-ball') {
    const dmg = rollRange(6, 14);
    const resist = (hero.resistances.cold ?? 0) / 100;
    const finalDmg = Math.max(1, Math.round(dmg * (1 - resist)));
    const anims = buildBallAnimation('cold-ball', monster.position, dir, hero.position, floor);
    queueAnimation(anims);
    const newHp = Math.max(0, hero.hp - finalDmg);
    let s = addMsg(state, `${monster.name} hurls an ice ball at you for ${finalDmg} damage!`);
    s = { ...s, hero: { ...s.hero, hp: newHp } };
    return s;
  }

  // ── Breath weapons ───────────────────────────────────────
  const breathMatch = ability.match(/^breath-(fire|cold|lightning|acid)$/);
  if (breathMatch) {
    const elem = breathMatch[1] as keyof typeof hero.resistances;
    const dmg = rollRange(8, 20) + Math.floor(depth / 2);
    const resist = (hero.resistances[elem] ?? 0) / 100;
    const finalDmg = Math.max(1, Math.round(dmg * (1 - resist)));
    const spellId = elem === 'cold' ? 'cold-bolt' : elem === 'fire' ? 'fire-bolt' : elem === 'lightning' ? 'lightning-bolt' : 'acid-bolt';
    const anims = buildBoltAnimation(spellId, monster.position, dir, 12, hero.position, floor);
    queueAnimation(anims);
    const newHp = Math.max(0, hero.hp - finalDmg);
    let s = addMsg(state, `${monster.name} breathes ${elem} at you for ${finalDmg} damage!`);
    s = { ...s, hero: { ...s.hero, hp: newHp } };
    return s;
  }

  // ── Summon abilities (used by summoner AI) ───────────────
  const summonMatch = ability.match(/^summon-(monster|undead|devil)$/);
  if (summonMatch) {
    const floorIdx = floor.monsters.indexOf(monster);
    return spawnNearSummoner(state, floorKey, floorIdx, ability);
  }

  return state;
}

// ── On-hit ability processing ────────────────────────────────

/**
 * Process on-hit special abilities for a monster after melee damage is dealt.
 * Call this from combat.ts after monsterAttacksPlayer.
 */
export function processMonsterAbility(state: GameState, monster: Monster): GameState {
  let s = state;

  for (const ability of monster.abilities) {
    switch (ability) {

      case 'poison': {
        if (Math.random() < 0.30) {
          const alreadyPoisoned = s.hero.activeEffects.some(e => e.id === 'poisoned');
          if (!alreadyPoisoned) {
            const effects = [
              ...s.hero.activeEffects,
              { id: 'poisoned', name: 'Poisoned', turnsRemaining: 5 },
            ];
            s = { ...s, hero: { ...s.hero, activeEffects: effects } };
            s = addMsg(s, `${monster.name}'s attack poisons you!`, 'important');
          }
        }
        break;
      }

      case 'drain-strength':
      case 'drain-intelligence':
      case 'drain-constitution':
      case 'drain-dexterity': {
        if (Math.random() < 0.25) {
          const attr = ability.replace('drain-', '') as keyof typeof s.hero.attributes;
          const cur = s.hero.attributes[attr];
          if (cur > 10) {
            const attrs = { ...s.hero.attributes, [attr]: cur - 1 };
            let hero = recomputeDerivedStats({ ...s.hero, attributes: attrs });
            s = { ...s, hero };
            s = addMsg(s, `${monster.name} drains your ${attr}!`, 'important');
          }
        }
        break;
      }

      case 'drain-level': {
        if (Math.random() < 0.15) {
          const newLevel = Math.max(1, s.hero.level - 1);
          const newXp = xpRequiredForLevel(newLevel, s.difficulty) || 0;
          let hero = recomputeDerivedStats({ ...s.hero, level: newLevel, xp: newXp });
          s = { ...s, hero };
          s = addMsg(s, `${monster.name} drains your life force! You lose a level!`, 'important');
        }
        break;
      }

      case 'drain-hp': {
        if (Math.random() < 0.40) {
          // Monster heals for up to 10% of its max HP
          const heal = rollRange(1, Math.max(1, Math.floor(monster.maxHp * 0.1)));
          const floorKey = `${s.currentDungeon}-${s.currentFloor}`;
          const floor = s.floors[floorKey];
          if (floor) {
            const idx = floor.monsters.findIndex(m => m.id === monster.id);
            if (idx >= 0) {
              const m = floor.monsters[idx];
              const newHp = Math.min(m.maxHp, m.hp + heal);
              s = updateMonster(s, floorKey, idx, { ...m, hp: newHp });
            }
          }
          s = addMsg(s, `${monster.name} drains your life!`);
        }
        break;
      }

      case 'steal-gold': {
        if (Math.random() < 0.50 && s.hero.copper > 0) {
          const stolen = Math.min(s.hero.copper, rollRange(10, 50));
          s = { ...s, hero: { ...s.hero, copper: s.hero.copper - stolen } };
          s = addMsg(s, `${monster.name} steals ${stolen} copper!`, 'important');
        }
        break;
      }

      case 'cold-touch':
      case 'fire-touch':
      case 'acid-touch': {
        if (Math.random() < 0.50) {
          const elem = ability.replace('-touch', '') as keyof typeof s.hero.resistances;
          const rawDmg = rollRange(2, 8);
          const resist = (s.hero.resistances[elem] ?? 0) / 100;
          const dmg = Math.max(1, Math.round(rawDmg * (1 - resist)));
          const newHp = Math.max(0, s.hero.hp - dmg);
          s = { ...s, hero: { ...s.hero, hp: newHp } };
          s = addMsg(s, `${monster.name}'s ${elem} touch deals ${dmg} extra damage!`);
        }
        break;
      }

      case 'paralyze': {
        if (Math.random() < 0.20) {
          const already = s.hero.activeEffects.some(e => e.id === 'paralyzed');
          if (!already) {
            const effects = [
              ...s.hero.activeEffects,
              { id: 'paralyzed', name: 'Paralyzed', turnsRemaining: 3 },
            ];
            s = { ...s, hero: { ...s.hero, activeEffects: effects } };
            s = addMsg(s, `The ${monster.name}'s attack paralyzes you!`, 'important');
          }
        }
        break;
      }

      case 'blind': {
        if (Math.random() < 0.25) {
          const already = s.hero.activeEffects.some(e => e.id === 'blinded');
          if (!already) {
            const effects = [
              ...s.hero.activeEffects,
              { id: 'blinded', name: 'Blinded', turnsRemaining: 8 },
            ];
            s = { ...s, hero: { ...s.hero, activeEffects: effects } };
            s = addMsg(s, `The ${monster.name} blinds you!`, 'important');
          }
        }
        break;
      }

      // physical-immune is handled in combat.ts damage calc — skip here
      default:
        break;
    }
  }

  return s;
}

// ── Per-AI-type turn logic ───────────────────────────────────

function processMelee(state: GameState, floorKey: string, idx: number): GameState {
  const floor = state.floors[floorKey];
  if (!floor) return state;
  let monster = floor.monsters[idx];
  const hero = state.hero;
  const dist = chebyshev(monster.position, hero.position);

  // Tick flee timer
  if (monster.fleeing > 0) {
    monster = { ...monster, fleeing: monster.fleeing - 1 };
    let s = updateMonster(state, floorKey, idx, monster);
    return moveAwayFrom(s, floorKey, idx, hero.position);
  }

  // Charge ability: rush the hero from 2-4 tiles away in a straight line
  if (dist >= 2 && dist <= 4 && monster.abilities.includes('charge')) {
    const dx = hero.position.x - monster.position.x;
    const dy = hero.position.y - monster.position.y;
    const isLine = dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy);
    if (isLine && hasLineOfSight(floor, monster.position, hero.position)) {
      const stepX = dx === 0 ? 0 : dx > 0 ? 1 : -1;
      const stepY = dy === 0 ? 0 : dy > 0 ? 1 : -1;
      const chargePos = { x: hero.position.x - stepX, y: hero.position.y - stepY };
      if (walkable(floor, chargePos.x, chargePos.y) && noMonster(floor, chargePos.x, chargePos.y, idx)) {
        let s = updateMonster(state, floorKey, idx, { ...monster, position: chargePos });
        s = addMsg(s, `The ${monster.name} charges!`, 'combat');
        const boosted = { ...monster, position: chargePos, damage: [Math.floor(monster.damage[0] * 1.5), Math.floor(monster.damage[1] * 1.5)] as [number, number] };
        const newFloor = s.floors[floorKey];
        if (newFloor) {
          const newIdx = newFloor.monsters.findIndex(m => m.id === monster.id);
          if (newIdx >= 0) {
            s = updateMonster(s, floorKey, newIdx, boosted);
            return monsterAttacksPlayer(s, boosted);
          }
        }
      }
    }
  }

  if (dist <= 1) {
    // Attack
    let s = monsterAttacksPlayer(state, monster);
    // Check flee trigger at low HP
    const updatedFloor = s.floors[floorKey];
    if (updatedFloor) {
      const updatedMonster = updatedFloor.monsters[idx];
      if (updatedMonster && updatedMonster.hp / updatedMonster.maxHp <= 0.25 && Math.random() < 0.40) {
        const fleeTurns = rollRange(5, 10);
        s = updateMonster(s, floorKey, idx, { ...updatedMonster, fleeing: fleeTurns });
      }
    }
    return s;
  }

  if (manhattan(monster.position, hero.position) <= 20) {
    // Low HP flee check before moving
    if (monster.hp / monster.maxHp <= 0.25 && Math.random() < 0.40) {
      const fleeTurns = rollRange(5, 10);
      let s = updateMonster(state, floorKey, idx, { ...monster, fleeing: fleeTurns });
      return moveAwayFrom(s, floorKey, idx, hero.position);
    }
    return moveToward(state, floorKey, idx, hero.position);
  }

  return state;
}

function processRanged(state: GameState, floorKey: string, idx: number): GameState {
  const floor = state.floors[floorKey];
  if (!floor) return state;
  const monster = floor.monsters[idx];
  const hero = state.hero;
  const dist = manhattan(monster.position, hero.position);
  const cDist = chebyshev(monster.position, hero.position);

  const rangedAbilities = monster.abilities.filter(a =>
    a.startsWith('cast-') || a.startsWith('throw-') || a.startsWith('tail-') || a.startsWith('breath-')
  );

  const hasRanged = rangedAbilities.length > 0;
  const los = hasLineOfSight(floor, monster.position, hero.position);

  // Stay in 3-6 tile range
  if (cDist < 3) {
    return moveAwayFrom(state, floorKey, idx, hero.position);
  }

  if (hasRanged && los && dist <= 8) {
    const ability = rangedAbilities[Math.floor(Math.random() * rangedAbilities.length)];
    return monsterRangedAttack(state, monster, ability);
  }

  // Out of range or no LOS — move toward or melee if adjacent
  if (cDist <= 1) {
    return monsterAttacksPlayer(state, monster);
  }

  if (dist <= 20) {
    return moveToRange(state, floorKey, idx, hero.position, 3, 6);
  }

  return state;
}

function processCaster(state: GameState, floorKey: string, idx: number): GameState {
  const floor = state.floors[floorKey];
  if (!floor) return state;
  const monster = floor.monsters[idx];
  const hero = state.hero;
  const dist = manhattan(monster.position, hero.position);
  const cDist = chebyshev(monster.position, hero.position);

  const spellAbilities = monster.abilities.filter(a => a.startsWith('cast-'));
  const los = hasLineOfSight(floor, monster.position, hero.position);

  if (cDist <= 1) {
    // Too close — melee fallback
    return monsterAttacksPlayer(state, monster);
  }

  if (spellAbilities.length > 0 && los && dist >= 4 && dist <= 8) {
    // 30% chance to move instead of casting (unpredictable)
    if (Math.random() < 0.30) {
      return moveToRange(state, floorKey, idx, hero.position, 4, 8);
    }
    const spell = spellAbilities[Math.floor(Math.random() * spellAbilities.length)];
    return monsterRangedAttack(state, monster, spell);
  }

  if (dist <= 20) {
    return moveToRange(state, floorKey, idx, hero.position, 4, 8);
  }

  return state;
}

function processThief(state: GameState, floorKey: string, idx: number): GameState {
  const floor = state.floors[floorKey];
  if (!floor) return state;
  let monster = floor.monsters[idx];
  const hero = state.hero;
  const dist = chebyshev(monster.position, hero.position);

  // Tick flee timer
  if (monster.fleeing > 0) {
    // 30% chance to teleport away while fleeing
    if (Math.random() < 0.30) {
      for (let tries = 0; tries < 100; tries++) {
        const rx = Math.floor(Math.random() * floor.width);
        const ry = Math.floor(Math.random() * floor.height);
        if (walkable(floor, rx, ry) && noMonster(floor, rx, ry, idx) && !(rx === hero.position.x && ry === hero.position.y)) {
          monster = { ...monster, fleeing: monster.fleeing - 1, position: { x: rx, y: ry } };
          let s = updateMonster(state, floorKey, idx, monster);
          return addMsg(s, `The ${monster.name} vanishes!`, 'important');
        }
      }
    }
    monster = { ...monster, fleeing: monster.fleeing - 1 };
    let s = updateMonster(state, floorKey, idx, monster);
    return moveAwayFrom(s, floorKey, idx, hero.position);
  }

  if (dist <= 1) {
    let s = monsterAttacksPlayer(state, monster);
    // 50% chance to steal gold on hit
    if (Math.random() < 0.50 && s.hero.copper > 0) {
      const stolen = Math.min(s.hero.copper, rollRange(10, 50));
      s = { ...s, hero: { ...s.hero, copper: s.hero.copper - stolen } };
      s = addMsg(s, `${monster.name} steals ${stolen} copper!`, 'important');
      // After stealing, flee
      const curFloor = s.floors[floorKey];
      if (curFloor) {
        const mi = curFloor.monsters.findIndex(m => m.id === monster.id);
        if (mi >= 0) {
          const fleeTurns = rollRange(8, 12);
          s = updateMonster(s, floorKey, mi, { ...curFloor.monsters[mi], fleeing: fleeTurns });
        }
      }
    }
    return s;
  }

  if (manhattan(monster.position, hero.position) <= 20) {
    return moveToward(state, floorKey, idx, hero.position);
  }

  return state;
}

function processSummoner(state: GameState, floorKey: string, idx: number): GameState {
  const floor = state.floors[floorKey];
  if (!floor) return state;
  const monster = floor.monsters[idx];
  const hero = state.hero;
  const dist = manhattan(monster.position, hero.position);
  const cDist = chebyshev(monster.position, hero.position);
  const los = hasLineOfSight(floor, monster.position, hero.position);

  // Summon every 4-5 turns
  const summonAbilities = monster.abilities.filter(a => a.startsWith('summon-'));
  if (summonAbilities.length > 0 && dist <= 12 && state.turn % rollRange(4, 5) === 0) {
    const ability = summonAbilities[Math.floor(Math.random() * summonAbilities.length)];
    let s = spawnNearSummoner(state, floorKey, idx, ability);
    // Also try a ranged attack this turn
    const rangedAbilities = monster.abilities.filter(a =>
      a.startsWith('cast-') || a.startsWith('throw-') || a.startsWith('breath-')
    );
    if (rangedAbilities.length > 0 && los && dist <= 8) {
      const ability2 = rangedAbilities[Math.floor(Math.random() * rangedAbilities.length)];
      const curFloor = s.floors[floorKey];
      if (curFloor) {
        const mi = curFloor.monsters.findIndex(m => m.id === monster.id);
        if (mi >= 0) s = monsterRangedAttack(s, curFloor.monsters[mi], ability2);
      }
    }
    return s;
  }

  // Ranged attack if in range and LOS
  const rangedAbilities = monster.abilities.filter(a =>
    a.startsWith('cast-') || a.startsWith('throw-') || a.startsWith('breath-')
  );
  if (rangedAbilities.length > 0 && los && dist <= 8) {
    const ability = rangedAbilities[Math.floor(Math.random() * rangedAbilities.length)];
    return monsterRangedAttack(state, monster, ability);
  }

  // Stay 5-8 tiles from hero
  if (cDist <= 1) {
    return monsterAttacksPlayer(state, monster);
  }

  if (dist <= 20) {
    return moveToRange(state, floorKey, idx, hero.position, 5, 8);
  }

  return state;
}

// ── Main entry point ─────────────────────────────────────────

/**
 * Process all monster turns on the current floor.
 */
export function processAllMonsterTurns(state: GameState): GameState {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  let cur = state;

  // Collect IDs before processing (array may change during iteration)
  const monsterIds = floor.monsters.map(m => m.id);

  for (const mId of monsterIds) {
    const curFloor = cur.floors[floorKey];
    if (!curFloor) break;

    const idx = curFloor.monsters.findIndex(m => m.id === mId);
    if (idx === -1) continue; // monster died

    const monster = curFloor.monsters[idx];
    if (monster.hp <= 0 || monster.sleeping) continue;

    switch (monster.ai) {
      case 'melee':    cur = processMelee(cur, floorKey, idx);    break;
      case 'ranged':   cur = processRanged(cur, floorKey, idx);   break;
      case 'caster':   cur = processCaster(cur, floorKey, idx);   break;
      case 'thief':    cur = processThief(cur, floorKey, idx);    break;
      case 'summoner': cur = processSummoner(cur, floorKey, idx); break;
    }

    // Regeneration: monsters with 'regenerate' ability recover 2 HP per turn
    const afterFloor = cur.floors[floorKey];
    if (afterFloor) {
      const mIdx = afterFloor.monsters.findIndex(m => m.id === mId);
      if (mIdx >= 0) {
        const m = afterFloor.monsters[mIdx];
        if (m.abilities.includes('regenerate') && m.hp < m.maxHp && m.hp > 0) {
          const healed = Math.min(m.maxHp, m.hp + 2);
          cur = updateMonster(cur, floorKey, mIdx, { ...m, hp: healed });
        }
      }
    }

    if (cur.hero.hp <= 0) break;
  }

  return cur;
}
