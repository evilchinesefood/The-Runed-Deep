import type { GameState, Hero, Monster, Message, Floor } from '../../core/types';
import { queueAnimation } from '../../rendering/animation-queue';
import type { SpellAnimation } from '../../rendering/animations';
import { generateLoot } from '../items/loot';
import { processMonsterAbility } from '../monsters/ai';

// ============================================================
// Blood splatters
// ============================================================

/** Add a blood decal for a monster — only once per monster */
function maybeAddMonsterBlood(floor: Floor, monster: Monster, monsterIndex: number): Floor {
  if (monster.bled) return floor;
  if (monster.hp > monster.maxHp * 0.25 && monster.hp > 0) return floor;
  if (Math.random() > 0.75) return floor;
  // Mark monster as having bled
  const monsters = [...floor.monsters];
  monsters[monsterIndex] = { ...monsters[monsterIndex], bled: true };
  return { ...floor, monsters, decals: [...floor.decals, { x: monster.position.x, y: monster.position.y }] };
}

/** Add a blood decal for the player — once per position */
function maybeAddPlayerBlood(floor: Floor, pos: { x: number; y: number }, hp: number, maxHp: number): Floor {
  if (hp > maxHp * 0.25) return floor;
  if (Math.random() > 0.75) return floor;
  if (floor.decals.some(d => d.x === pos.x && d.y === pos.y)) return floor;
  return { ...floor, decals: [...floor.decals, { x: pos.x, y: pos.y }] };
}

// ============================================================
// Dice rolling
// ============================================================

function rollDice(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ============================================================
// Hit/Miss calculation
// ============================================================

/**
 * Chance to hit = 50% base + (attacker DEX - defender evasion) * 2%
 * Clamped between 5% and 95%.
 */
function calcHitChance(attackerDex: number, defenderEvasion: number): number {
  const chance = 50 + (attackerDex - defenderEvasion) * 2;
  return Math.max(5, Math.min(95, chance));
}

function doesHit(hitChance: number): boolean {
  return Math.random() * 100 < hitChance;
}

// ============================================================
// Damage calculation
// ============================================================

/**
 * Player damage = STR/10 + weapon base damage (if any) + enchantment
 * Reduced by target armor.
 * Minimum 1 damage on a hit.
 */
function calcPlayerDamage(hero: Hero): number {
  const strBonus = Math.floor(hero.attributes.strength / 10);
  const weapon = hero.equipment.weapon;
  let base = strBonus + rollDice(1, 3); // fist damage

  if (weapon) {
    const weaponDmg = weapon.properties['damageMin'] && weapon.properties['damageMax']
      ? rollDice(weapon.properties['damageMin'], weapon.properties['damageMax'])
      : rollDice(1, 4);
    base = strBonus + weaponDmg + weapon.enchantment;
  }

  return Math.max(1, base);
}

/**
 * Monster damage = roll between damage[0] and damage[1].
 * Reduced by player armor value.
 * Minimum 0 damage (armor can fully block).
 */
function calcMonsterDamage(monster: Monster): number {
  return rollDice(monster.damage[0], monster.damage[1]);
}

function applyArmor(rawDamage: number, armorValue: number): number {
  const reduced = rawDamage - Math.floor(armorValue / 2);
  return Math.max(0, reduced);
}

// ============================================================
// Combat resolution
// ============================================================

export interface CombatResult {
  state: GameState;
  messages: Message[];
}

/**
 * Player attacks a monster. Returns updated state.
 */
export function playerAttacksMonster(state: GameState, monsterId: string): GameState {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  let floor = state.floors[floorKey];
  if (!floor) return state;

  const monsterIndex = floor.monsters.findIndex(m => m.id === monsterId);
  if (monsterIndex === -1) return state;

  let monster = floor.monsters[monsterIndex];
  const messages: Message[] = [];

  // Wake sleeping monsters when attacked
  if (monster.sleeping) {
    const awakened = { ...monster, sleeping: false };
    const newMonsters = [...floor.monsters];
    newMonsters[monsterIndex] = awakened;
    floor = { ...floor, monsters: newMonsters };
    state = { ...state, floors: { ...state.floors, [floorKey]: floor } };
    monster = awakened;
  }

  // Hit check
  const hitChance = calcHitChance(state.hero.attributes.dexterity + state.hero.equipAccuracyBonus, Math.floor(monster.speed * 30));
  if (!doesHit(hitChance)) {
    messages.push({
      text: `${state.hero.name} misses the ${monster.name}.`,
      severity: 'combat',
      turn: state.turn,
    });
    return applyMessages(state, messages);
  }

  // Physical-immune check (slimes — heavily reduced damage)
  const isPhysicalImmune = monster.abilities.includes('physical-immune');
  const rawDamage = calcPlayerDamage(state.hero);
  let damage = Math.max(1, rawDamage);
  if (isPhysicalImmune) {
    damage = Math.max(1, Math.floor(damage * 0.1)); // 90% reduction
    messages.push({
      text: `Your weapon barely affects the ${monster.name}!`,
      severity: 'combat',
      turn: state.turn,
    });
  }

  // Hit flash on the monster
  queueAnimation([{
    type: 'flash',
    position: { ...monster.position },
    color: '#fff',
    duration: 80,
  } as SpellAnimation]);

  const newHp = monster.hp - damage;

  if (newHp <= 0) {
    // Monster dies
    messages.push({
      text: `${state.hero.name} hits the ${monster.name} for ${damage} damage, killing it! (+${monster.xpValue} XP)`,
      severity: 'combat',
      turn: state.turn,
    });

    // Remove monster from floor, award XP
    const newMonsters = [...floor.monsters];
    newMonsters.splice(monsterIndex, 1);

    // Loot drop
    const loot = generateLoot(state.currentFloor, monster.position);
    let newItems = [...floor.items];
    if (loot) {
      newItems.push({ item: loot, position: { ...monster.position } });
      messages.push({
        text: `The ${monster.name} dropped ${loot.name}.`,
        severity: 'normal',
        turn: state.turn,
      });
    }

    let newFloor: Floor = { ...floor, monsters: newMonsters, items: newItems };
    // Blood on death (always)
    // Blood on death (always, monster is already removed from array so just add decal)
    if (Math.random() < 0.75) {
      newFloor = { ...newFloor, decals: [...newFloor.decals, { x: monster.position.x, y: monster.position.y }] };
    }

    return {
      ...applyMessages(state, messages),
      hero: {
        ...state.hero,
        xp: state.hero.xp + monster.xpValue,
      },
      floors: { ...state.floors, [floorKey]: newFloor },
      turn: state.turn + 1,
    };
  } else {
    // Monster survives
    messages.push({
      text: `${state.hero.name} hits the ${monster.name} for ${damage} damage. (${newHp}/${monster.maxHp} HP)`,
      severity: 'combat',
      turn: state.turn,
    });

    const updatedMonster = { ...monster, hp: newHp };
    const newMonsters = [...floor.monsters];
    newMonsters[monsterIndex] = updatedMonster;
    let newFloor: Floor = { ...floor, monsters: newMonsters };
    // Blood splatter when monster is badly wounded
    newFloor = maybeAddMonsterBlood(newFloor, updatedMonster, monsterIndex);

    return {
      ...applyMessages(state, messages),
      floors: { ...state.floors, [floorKey]: newFloor },
      turn: state.turn + 1,
    };
  }
}

/**
 * Monster attacks the player. Returns updated state.
 */
export function monsterAttacksPlayer(state: GameState, monster: Monster): GameState {
  const messages: Message[] = [];

  // Hit check — monster "dex" approximated from speed
  const monsterDex = Math.floor(monster.speed * 40);
  const hitChance = calcHitChance(monsterDex, state.hero.attributes.dexterity);

  if (!doesHit(hitChance)) {
    messages.push({
      text: `The ${monster.name} misses ${state.hero.name}.`,
      severity: 'combat',
      turn: state.turn,
    });
    return applyMessages(state, messages);
  }

  const rawDamage = calcMonsterDamage(monster);
  const damage = applyArmor(rawDamage, state.hero.armorValue);

  if (damage === 0) {
    messages.push({
      text: `The ${monster.name} hits ${state.hero.name}, but the armor absorbs the blow.`,
      severity: 'combat',
      turn: state.turn,
    });
    return applyMessages(state, messages);
  }

  const newHp = state.hero.hp - damage;

  // Hit flash on the hero
  queueAnimation([{
    type: 'flash',
    position: { ...state.hero.position },
    color: '#f44',
    duration: 80,
  } as SpellAnimation]);

  messages.push({
    text: `The ${monster.name} hits ${state.hero.name} for ${damage} damage. (${Math.max(0, newHp)}/${state.hero.maxHp} HP)`,
    severity: 'combat',
    turn: state.turn,
  });

  // Blood splatter when player is badly wounded
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const curFloor = state.floors[floorKey];
  let floors = state.floors;
  if (curFloor) {
    const bloodFloor = maybeAddPlayerBlood(curFloor, state.hero.position, Math.max(0, newHp), state.hero.maxHp);
    if (bloodFloor !== curFloor) {
      floors = { ...state.floors, [floorKey]: bloodFloor };
    }
  }

  let result: GameState = {
    ...applyMessages(state, messages),
    hero: { ...state.hero, hp: Math.max(0, newHp) },
    floors,
  };

  // Process on-hit abilities (poison, drain, steal, elemental touch)
  if (monster.abilities.length > 0 && newHp > 0) {
    result = processMonsterAbility(result, monster);
  }

  return result;
}

function applyMessages(state: GameState, messages: Message[]): GameState {
  if (messages.length === 0) return state;
  return { ...state, messages: [...state.messages, ...messages] };
}
