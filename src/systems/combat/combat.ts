import type { GameState, Hero, Monster, Message, Floor } from '../../core/types';
import { queueAnimation } from '../../rendering/animation-queue';
import type { SpellAnimation } from '../../rendering/animations';
import { generateLoot } from '../items/loot';

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
  const floor = state.floors[floorKey];
  if (!floor) return state;

  const monsterIndex = floor.monsters.findIndex(m => m.id === monsterId);
  if (monsterIndex === -1) return state;

  const monster = floor.monsters[monsterIndex];
  const messages: Message[] = [];

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

  // Damage
  const rawDamage = calcPlayerDamage(state.hero);
  // Monsters have an armor stat from their template
  const damage = Math.max(1, rawDamage);

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

    const newFloor: Floor = { ...floor, monsters: newMonsters, items: newItems };

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
    const newFloor: Floor = { ...floor, monsters: newMonsters };

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

  return {
    ...applyMessages(state, messages),
    hero: { ...state.hero, hp: newHp },
  };
}

function applyMessages(state: GameState, messages: Message[]): GameState {
  if (messages.length === 0) return state;
  return { ...state, messages: [...state.messages, ...messages] };
}
