import type {
  GameState,
  Hero,
  Monster,
  Message,
  Floor,
} from "../../core/types";
import { queueAnimation } from "../../rendering/animation-queue";
import type { SpellAnimation } from "../../rendering/animations";
import { generateLoot } from "../items/loot";
import { processMonsterAbility } from "../monsters/ai";
import { Sound } from "../Sound";
import { trackMonsterKill, trackFloorDamage } from "../Achievements";
import {
  hasEnchant,
  equipAffixTotal,
  equipAffixTotal2,
} from "../../utils/Enchants";
import { ITEM_BY_ID } from "../../data/items";
import { getDifficultyConfig } from "../../data/difficulty";
import { MONSTER_BY_ID } from "../../data/monsters";
import { getDisplayName } from "../inventory/display-name";
import { RUNE_BY_ID, getRuneValue } from "../../data/Runes";
import { getModifierFlags } from "../rift/ModifierFlags";

/** Sum a rune effect value across all equipped items */
function sumRuneEffect(equipment: any, effect: string): number {
  let total = 0;
  for (const item of Object.values(equipment)) {
    if (!item || !(item as any).sockets) continue;
    const it = item as any;
    const effEnch = it.enchantment + (it.blessed ? 1 : 0);
    for (const runeId of it.sockets) {
      if (!runeId) continue;
      const rune = RUNE_BY_ID[runeId];
      if (rune?.effect === effect) total += getRuneValue(runeId, effEnch);
    }
  }
  return total;
}

/** Build a cache of all rune effect totals for equipped items */
function buildRuneCache(equipment: any): Record<string, number> {
  const cache: Record<string, number> = {};
  for (const item of Object.values(equipment)) {
    if (!item || !(item as any).sockets) continue;
    const it = item as any;
    const effEnch = it.enchantment + (it.blessed ? 1 : 0);
    for (const runeId of it.sockets) {
      if (!runeId) continue;
      const rune = RUNE_BY_ID[runeId];
      if (rune) {
        cache[rune.effect] =
          (cache[rune.effect] || 0) + getRuneValue(runeId, effEnch);
      }
    }
  }
  return cache;
}

/** Check if any equipped item has a specific rune */
function hasRune(equipment: any, runeId: string): boolean {
  for (const item of Object.values(equipment)) {
    if (!item || !(item as any).sockets) continue;
    if ((item as any).sockets.includes(runeId)) return true;
  }
  return false;
}

function fortuneXp(
  baseXp: number,
  equipment: any,
  statueUpgrades?: Record<string, number>,
): number {
  let xp = baseXp;
  const pct = equipAffixTotal2(equipment, "fortune", statueUpgrades);
  if (pct > 0) xp = Math.round(xp * (1 + pct / 100));
  for (const eq of Object.values(equipment)) {
    if (
      eq &&
      ITEM_BY_ID[(eq as any).templateId]?.uniqueAbility === "fortune-power"
    ) {
      xp *= 2;
      break;
    }
  }
  // Leech: reduce XP gained (secondary value = % reduction)
  const leechPenalty = equipAffixTotal2(equipment, "leech", statueUpgrades);
  if (leechPenalty > 0)
    xp = Math.max(1, Math.round(xp * (1 - leechPenalty / 100)));
  return xp;
}

// ============================================================
// Blood splatters (capped to prevent unbounded growth)
// ============================================================
const MAX_DECALS = 80;
function cappedDecals(
  decals: { x: number; y: number }[],
  add: { x: number; y: number },
): { x: number; y: number }[] {
  const next = [...decals, add];
  return next.length > MAX_DECALS ? next.slice(next.length - MAX_DECALS) : next;
}

/** Check if a tile can receive blood or dropped items */
function canPlaceOnTile(floor: Floor, x: number, y: number): boolean {
  const tile = floor.tiles[y]?.[x];
  if (!tile) return false;
  const t = tile.type;
  return t === "floor" || t === "trap" || t === "path" || t === "grass";
}

/** Add a blood decal for a monster — only once per monster */
function maybeAddMonsterBlood(
  floor: Floor,
  monster: Monster,
  monsterIndex: number,
): Floor {
  if (monster.bled) return floor;
  if (monster.hp > monster.maxHp * 0.25 && monster.hp > 0) return floor;
  if (Math.random() > 0.75) return floor;
  if (!canPlaceOnTile(floor, monster.position.x, monster.position.y))
    return floor;
  const monsters = [...floor.monsters];
  monsters[monsterIndex] = { ...monsters[monsterIndex], bled: true };
  return {
    ...floor,
    monsters,
    decals: cappedDecals(floor.decals, {
      x: monster.position.x,
      y: monster.position.y,
    }),
  };
}

/** Add a blood decal for the player — once per position */
function maybeAddPlayerBlood(
  floor: Floor,
  pos: { x: number; y: number },
  hp: number,
  maxHp: number,
): Floor {
  if (hp > maxHp * 0.25) return floor;
  if (Math.random() > 0.75) return floor;
  if (!canPlaceOnTile(floor, pos.x, pos.y)) return floor;
  if (floor.decals.some((d) => d.x === pos.x && d.y === pos.y)) return floor;
  return {
    ...floor,
    decals: cappedDecals(floor.decals, { x: pos.x, y: pos.y }),
  };
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
    const weaponDmg =
      weapon.properties["damageMin"] && weapon.properties["damageMax"]
        ? rollDice(
            weapon.properties["damageMin"],
            weapon.properties["damageMax"],
          )
        : rollDice(1, 4);
    base = strBonus + weaponDmg + hero.equipDamageBonus;
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
export function playerAttacksMonster(
  state: GameState,
  monsterId: string,
): GameState {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  let floor = state.floors[floorKey];
  if (!floor) return state;

  const monsterIndex = floor.monsters.findIndex((m) => m.id === monsterId);
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
  const hitChance = calcHitChance(
    state.hero.attributes.dexterity + state.hero.equipAccuracyBonus,
    Math.floor(monster.speed * 30),
  );
  if (!doesHit(hitChance)) {
    messages.push({
      text: `${state.hero.name} misses the ${monster.name}.`,
      severity: "combat",
      turn: state.turn,
    });
    Sound.meleeMiss();
    return applyMessages(state, messages);
  }

  const rawDamage = calcPlayerDamage(state.hero);
  let damage = applyArmor(Math.max(1, rawDamage), monster.armor);

  // Build rune cache once for this attack
  const rc = buildRuneCache(state.hero.equipment);

  // Glass Cannon rift modifier: 2x player damage
  if (getModifierFlags(state).glassCannon) {
    damage = damage * 2;
  }

  // Berserk Fury: bonus melee damage (primary value = % increase)
  const berserkBonus = equipAffixTotal(
    state.hero.equipment,
    "berserk-fury",
    state.statueUpgrades,
  );
  if (berserkBonus > 0) damage = Math.round(damage * (1 + berserkBonus / 100));

  // Rune: Flame — add fire damage
  const flameDmg = rc["fire-damage"] || 0;
  if (flameDmg > 0) {
    const bonus = Math.max(1, Math.round((damage * flameDmg) / 10));
    damage += bonus;
    messages.push({
      text: `Flame rune sears for +${bonus} fire damage.`,
      severity: "combat",
      turn: state.turn,
    });
  }

  // Rune: Frost — cold damage + chance to slow
  const frostDmg = rc["cold-damage-slow"] || 0;
  if (frostDmg > 0) {
    const bonus = Math.max(1, Math.round((damage * frostDmg) / 10));
    damage += bonus;
    if (Math.random() < 0.25 && !monster.slowed) {
      const floorKey2 = `${state.currentDungeon}-${state.currentFloor}`;
      const floor2 = state.floors[floorKey2];
      if (floor2) {
        const mIdx2 = floor2.monsters.findIndex((m) => m.id === monster.id);
        if (mIdx2 >= 0) {
          const ms2 = [...floor2.monsters];
          ms2[mIdx2] = { ...ms2[mIdx2], slowed: true };
          state = {
            ...state,
            floors: {
              ...state.floors,
              [floorKey2]: { ...floor2, monsters: ms2 },
            },
          };
          floor =
            state.floors[`${state.currentDungeon}-${state.currentFloor}`]!;
          monster = floor.monsters.find((m) => m.id === monsterId)!;
          messages.push({
            text: `Frost rune chills the ${monster.name}!`,
            severity: "combat",
            turn: state.turn,
          });
        }
      }
    }
  }

  // Rune: Precision — crit chance bonus
  const critBonus = rc["crit-chance"] || 0;
  if (critBonus > 0 && Math.random() * 100 < critBonus) {
    damage = Math.round(damage * 1.5);
    messages.push({
      text: `Critical hit! (Precision rune)`,
      severity: "combat",
      turn: state.turn,
    });
  }

  // Hit flash on the monster
  queueAnimation([
    {
      type: "flash",
      position: { ...monster.position },
      color: "#fff",
      duration: 80,
    } as SpellAnimation,
  ]);
  Sound.meleeHit();

  const newHp = monster.hp - damage;

  // Blood Price: lose HP per hit (secondary value)
  const bloodCost = Math.round(
    equipAffixTotal2(state.hero.equipment, "blood-price", state.statueUpgrades),
  );
  if (bloodCost > 0 && damage > 0) {
    const newHeroHp = Math.max(1, state.hero.hp - bloodCost);
    state = { ...state, hero: { ...state.hero, hp: newHeroHp } };
    messages.push({
      text: `Blood Price costs you ${bloodCost} HP.`,
      severity: "combat",
      turn: state.turn,
    });
  }

  // Leech: heal % of damage dealt (primary value)
  const leechPct = equipAffixTotal(
    state.hero.equipment,
    "leech",
    state.statueUpgrades,
  );
  if (leechPct > 0 && damage > 0) {
    const heal = Math.max(1, Math.floor((damage * leechPct) / 100));
    const healedHp = Math.min(state.hero.maxHp, state.hero.hp + heal);
    state = { ...state, hero: { ...state.hero, hp: healedHp } };
  }

  // Vampiric — scaled heal % from affix
  if (hasEnchant(state.hero.equipment, "vampiric") && damage > 0) {
    const pct =
      equipAffixTotal(state.hero.equipment, "vampiric", state.statueUpgrades) /
      100;
    const healMult = getDifficultyConfig(state.difficulty).healingMult;
    const heal = Math.max(1, Math.floor(damage * pct * healMult));
    const healedHp = Math.min(state.hero.maxHp, state.hero.hp + heal);
    state = { ...state, hero: { ...state.hero, hp: healedHp } };
    messages.push({
      text: `Vampiric heals you for ${heal} HP.`,
      severity: "combat",
      turn: state.turn,
    });
  }

  // Blooddrinker unique: 30% of all damage healed
  if (damage > 0) {
    const weapon = state.hero.equipment.weapon;
    if (
      weapon &&
      ITEM_BY_ID[weapon.templateId]?.uniqueAbility === "blooddrinker"
    ) {
      const heal = Math.max(1, Math.floor(damage * 0.3));
      const healedHp = Math.min(state.hero.maxHp, state.hero.hp + heal);
      state = { ...state, hero: { ...state.hero, hp: healedHp } };
      messages.push({
        text: `Blooddrinker heals you for ${heal} HP.`,
        severity: "combat",
        turn: state.turn,
      });
    }
  }

  if (newHp <= 0) {
    // Monster dies
    messages.push({
      text: `${state.hero.name} hits the ${monster.name} for ${damage} damage, killing it! (+${monster.xpValue} XP)`,
      severity: "combat",
      turn: state.turn,
    });
    Sound.monsterDeath();

    // Remove monster from floor, award XP
    const newMonsters = [...floor.monsters];
    newMonsters.splice(monsterIndex, 1);

    // Loot drop — bosses always drop, guaranteed unique on F30+ or NG+
    const isBoss = !!MONSTER_BY_ID[monster.templateId]?.boss;
    const loot = generateLoot(
      state.currentFloor,
      monster.position,
      state.ngPlusCount,
      state.hero.equipment,
      isBoss,
      state.statueUpgrades,
    );
    let newItems = [...floor.items];
    if (loot) {
      newItems.push({ item: loot, position: { ...monster.position } });
      messages.push({
        text: `The ${monster.name} dropped ${getDisplayName(loot)}.`,
        severity: "normal",
        turn: state.turn,
      });
    }

    let newFloor: Floor = { ...floor, monsters: newMonsters, items: newItems };
    // Blood on death (always)
    // Blood on death — skip decor/doors/stairs
    if (
      Math.random() < 0.75 &&
      canPlaceOnTile(newFloor, monster.position.x, monster.position.y)
    ) {
      newFloor = {
        ...newFloor,
        decals: cappedDecals(newFloor.decals, {
          x: monster.position.x,
          y: monster.position.y,
        }),
      };
    }

    const shardReward = isBoss ? 5 : 0;
    if (shardReward > 0) {
      messages.push({
        text: `You found ${shardReward} Rune Shards!`,
        severity: "important",
        turn: state.turn,
      });
    }
    // Rune: Siphon — restore MP on kill
    let siphonMp = 0;
    const siphonVal = rc["mp-per-kill"] || 0;
    if (siphonVal > 0) {
      siphonMp = Math.round(siphonVal);
      messages.push({
        text: `Siphon rune restores ${siphonMp} MP.`,
        severity: "combat",
        turn: state.turn,
      });
    }

    // Rune: Conversion — heal % of overkill damage
    let convHeal = 0;
    const convPct = rc["overkill-heal"] || 0;
    if (convPct > 0 && newHp < 0) {
      convHeal = Math.max(1, Math.round((Math.abs(newHp) * convPct) / 100));
      messages.push({
        text: `Conversion rune heals you for ${convHeal} HP.`,
        severity: "combat",
        turn: state.turn,
      });
    }

    const resultState: GameState = {
      ...applyMessages(state, messages),
      hero: {
        ...state.hero,
        xp:
          state.hero.xp +
          fortuneXp(
            monster.xpValue,
            state.hero.equipment,
            state.statueUpgrades,
          ),
        runeShards: state.hero.runeShards + shardReward,
        mp: Math.min(state.hero.maxMp, state.hero.mp + siphonMp),
        hp: Math.min(state.hero.maxHp, state.hero.hp + convHeal),
      },
      floors: { ...state.floors, [floorKey]: newFloor },
      turn: state.turn + 1,
    };

    // Track achievement
    trackMonsterKill(monster.templateId, monster.xpValue >= 250);

    // Victory condition — Surtur slain
    if (monster.templateId === "surtur") {
      return { ...resultState, screen: "victory" };
    }

    // Worldsplitter AoE: damage all other adjacent monsters
    let afterKill = worldsplitterAoe(
      resultState,
      state.hero,
      monster.position,
      damage,
      messages,
    );
    // Rune: Splitting — splash damage to adjacent enemies
    afterKill = runeSplashDamage(
      afterKill,
      state.hero,
      monster.position,
      damage,
    );
    return afterKill;
  } else {
    // Monster survives
    messages.push({
      text: `${state.hero.name} hits the ${monster.name} for ${damage} damage. (${newHp}/${monster.maxHp} HP)`,
      severity: "combat",
      turn: state.turn,
    });

    const updatedMonster = { ...monster, hp: newHp };
    const newMonsters = [...floor.monsters];
    newMonsters[monsterIndex] = updatedMonster;
    let newFloor: Floor = { ...floor, monsters: newMonsters };
    newFloor = maybeAddMonsterBlood(newFloor, updatedMonster, monsterIndex);

    let resultState: GameState = {
      ...applyMessages(state, messages),
      floors: { ...state.floors, [floorKey]: newFloor },
      turn: state.turn + 1,
    };

    // Worldsplitter AoE: damage all other adjacent monsters
    let afterHit = worldsplitterAoe(
      resultState,
      state.hero,
      monster.position,
      damage,
      [],
    );
    // Rune: Splitting — splash damage to adjacent enemies
    afterHit = runeSplashDamage(afterHit, state.hero, monster.position, damage);
    return afterHit;
  }
}

/** Worldsplitter: hit all monsters adjacent to the hero (except the primary target) */
function worldsplitterAoe(
  state: GameState,
  hero: Hero,
  primaryPos: { x: number; y: number },
  baseDmg: number,
  _msgs: Message[],
): GameState {
  const weapon = hero.equipment.weapon;
  if (
    !weapon ||
    ITEM_BY_ID[weapon.templateId]?.uniqueAbility !== "worldsplitter"
  )
    return state;

  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  const aoeDmg = Math.max(1, Math.floor(baseDmg * 0.5)); // 50% of primary damage
  let result = state;

  for (const m of [...floor.monsters]) {
    if (m.position.x === primaryPos.x && m.position.y === primaryPos.y)
      continue;
    const dx = Math.abs(m.position.x - hero.position.x);
    const dy = Math.abs(m.position.y - hero.position.y);
    if (dx > 1 || dy > 1) continue;

    // Re-fetch floor each iteration (monsters may have been removed)
    const curFloor = result.floors[floorKey];
    if (!curFloor) break;
    const mIdx = curFloor.monsters.findIndex((cm) => cm.id === m.id);
    if (mIdx === -1) continue;
    const cm = curFloor.monsters[mIdx];
    const newHp = cm.hp - aoeDmg;

    if (newHp <= 0) {
      const newMonsters = [...curFloor.monsters];
      newMonsters.splice(mIdx, 1);
      result = {
        ...result,
        hero: {
          ...result.hero,
          xp:
            result.hero.xp +
            fortuneXp(cm.xpValue, hero.equipment, state.statueUpgrades),
        },
        floors: {
          ...result.floors,
          [floorKey]: { ...curFloor, monsters: newMonsters },
        },
        messages: [
          ...result.messages,
          {
            text: `Worldsplitter cleaves ${cm.name} for ${aoeDmg} damage, killing it! (+${cm.xpValue} XP)`,
            severity: "combat" as const,
            turn: result.turn,
          },
        ],
      };
      trackMonsterKill(cm.templateId, cm.xpValue >= 250);
      if (cm.templateId === "surtur") return { ...result, screen: "victory" };
    } else {
      const newMonsters = [...curFloor.monsters];
      newMonsters[mIdx] = { ...cm, hp: newHp };
      result = {
        ...result,
        floors: {
          ...result.floors,
          [floorKey]: { ...curFloor, monsters: newMonsters },
        },
        messages: [
          ...result.messages,
          {
            text: `Worldsplitter cleaves ${cm.name} for ${aoeDmg} damage. (${newHp}/${cm.maxHp})`,
            severity: "combat" as const,
            turn: result.turn,
          },
        ],
      };
    }
  }
  return result;
}

/** Rune: Splitting — splash damage to adjacent enemies (skip primary target, skip worldsplitter targets) */
function runeSplashDamage(
  state: GameState,
  hero: Hero,
  primaryPos: { x: number; y: number },
  baseDmg: number,
): GameState {
  const splashVal = sumRuneEffect(hero.equipment, "splash-damage");
  if (splashVal <= 0) return state;
  // If worldsplitter is active, skip (already handled)
  const weapon = hero.equipment.weapon;
  if (
    weapon &&
    ITEM_BY_ID[weapon.templateId]?.uniqueAbility === "worldsplitter"
  )
    return state;

  const splashDmg = Math.max(1, Math.round((baseDmg * splashVal) / 10));
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  let result = state;

  const floor = result.floors[floorKey];
  if (!floor) return result;

  for (const m of [...floor.monsters]) {
    if (m.position.x === primaryPos.x && m.position.y === primaryPos.y)
      continue;
    const dx = Math.abs(m.position.x - primaryPos.x);
    const dy = Math.abs(m.position.y - primaryPos.y);
    if (dx > 1 || dy > 1) continue;

    const curFloor = result.floors[floorKey];
    if (!curFloor) break;
    const mIdx = curFloor.monsters.findIndex((cm) => cm.id === m.id);
    if (mIdx === -1) continue;
    const cm = curFloor.monsters[mIdx];
    const mNewHp = cm.hp - splashDmg;

    if (mNewHp <= 0) {
      const newMonsters = [...curFloor.monsters];
      newMonsters.splice(mIdx, 1);
      result = {
        ...result,
        hero: {
          ...result.hero,
          xp:
            result.hero.xp +
            fortuneXp(cm.xpValue, hero.equipment, state.statueUpgrades),
        },
        floors: {
          ...result.floors,
          [floorKey]: { ...curFloor, monsters: newMonsters },
        },
        messages: [
          ...result.messages,
          {
            text: `Splitting rune hits ${cm.name} for ${splashDmg} damage, killing it! (+${cm.xpValue} XP)`,
            severity: "combat" as const,
            turn: result.turn,
          },
        ],
      };
      trackMonsterKill(cm.templateId, cm.xpValue >= 250);
      if (cm.templateId === "surtur") return { ...result, screen: "victory" };
    } else {
      const newMonsters = [...curFloor.monsters];
      newMonsters[mIdx] = { ...cm, hp: mNewHp };
      result = {
        ...result,
        floors: {
          ...result.floors,
          [floorKey]: { ...curFloor, monsters: newMonsters },
        },
        messages: [
          ...result.messages,
          {
            text: `Splitting rune hits ${cm.name} for ${splashDmg} damage. (${mNewHp}/${cm.maxHp})`,
            severity: "combat" as const,
            turn: result.turn,
          },
        ],
      };
    }
  }
  return result;
}

/**
 * Monster attacks the player. Returns updated state.
 */
export function monsterAttacksPlayer(
  state: GameState,
  monster: Monster,
): GameState {
  const messages: Message[] = [];

  // Hit check — monster "dex" approximated from speed
  const monsterDex = Math.floor(monster.speed * 40);
  const hitChance = calcHitChance(monsterDex, state.hero.attributes.dexterity);

  if (!doesHit(hitChance)) {
    messages.push({
      text: `The ${monster.name} misses ${state.hero.name}.`,
      severity: "combat",
      turn: state.turn,
    });
    return applyMessages(state, messages);
  }

  // Build rune cache once for this defense
  const rc = buildRuneCache(state.hero.equipment);

  // Rune: Phantom — dodge chance
  const phantomDodge = rc["dodge"] || 0;
  if (phantomDodge > 0 && Math.random() * 100 < phantomDodge) {
    messages.push({
      text: `${state.hero.name} phases through the ${monster.name}'s attack! (Phantom rune)`,
      severity: "combat",
      turn: state.turn,
    });
    return applyMessages(state, messages);
  }

  // Evasion — chance to dodge
  const evasionPct = equipAffixTotal(
    state.hero.equipment,
    "evasion",
    state.statueUpgrades,
  );
  if (evasionPct > 0 && Math.random() * 100 < evasionPct) {
    messages.push({
      text: `${state.hero.name} dodges the ${monster.name}'s attack!`,
      severity: "combat",
      turn: state.turn,
    });
    return applyMessages(state, messages);
  }

  const rawDamage = calcMonsterDamage(monster);
  let damage = applyArmor(rawDamage, state.hero.armorValue);

  // Glass Cannon rift modifier: 2x damage taken
  if (getModifierFlags(state).glassCannon) {
    damage = damage * 2;
  }

  // Berserk Fury: take more damage (secondary value = % increase)
  const berserkPenalty = equipAffixTotal2(
    state.hero.equipment,
    "berserk-fury",
    state.statueUpgrades,
  );
  if (berserkPenalty > 0)
    damage = Math.round(damage * (1 + berserkPenalty / 100));

  if (damage === 0) {
    messages.push({
      text: `The ${monster.name} hits ${state.hero.name}, but the armor absorbs the blow.`,
      severity: "combat",
      turn: state.turn,
    });
    return applyMessages(state, messages);
  }

  const newHp = state.hero.hp - damage;

  // Hit flash on the hero
  queueAnimation([
    {
      type: "flash",
      position: { ...state.hero.position },
      color: "#f44",
      duration: 80,
    } as SpellAnimation,
  ]);
  Sound.playerHurt();

  messages.push({
    text: `The ${monster.name} hits ${state.hero.name} for ${damage} damage. (${Math.max(0, newHp)}/${state.hero.maxHp} HP)`,
    severity: "combat",
    turn: state.turn,
  });

  // Blood splatter when player is badly wounded
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const curFloor = state.floors[floorKey];
  let floors = state.floors;
  if (curFloor) {
    const bloodFloor = maybeAddPlayerBlood(
      curFloor,
      state.hero.position,
      Math.max(0, newHp),
      state.hero.maxHp,
    );
    if (bloodFloor !== curFloor) {
      floors = { ...state.floors, [floorKey]: bloodFloor };
    }
  }

  const fk = `${state.currentDungeon}-${state.currentFloor}`;
  trackFloorDamage(fk, damage);

  let result: GameState = {
    ...applyMessages(state, messages),
    hero: { ...state.hero, hp: Math.max(0, newHp) },
    floors,
  };

  // Reflect damage (Thorns affix + unique abilities + rune)
  let monsterKilledByThorns = false;
  let totalThornsPct = equipAffixTotal(
    state.hero.equipment,
    "thorns",
    state.statueUpgrades,
  );
  totalThornsPct += rc["reflect-damage"] || 0;
  // Aegis of the Fallen: 30% reflect
  for (const eq of Object.values(state.hero.equipment)) {
    if (eq && ITEM_BY_ID[eq.templateId]?.uniqueAbility === "aegis-power")
      totalThornsPct += 30;
    if (eq && ITEM_BY_ID[eq.templateId]?.uniqueAbility === "demonhide-power")
      totalThornsPct += 25;
  }
  if (totalThornsPct > 0 && damage > 0) {
    const reflectDmg = Math.max(1, Math.floor((damage * totalThornsPct) / 100));
    const floorKey2 = `${result.currentDungeon}-${result.currentFloor}`;
    const floor2 = result.floors[floorKey2];
    if (floor2) {
      const mIdx = floor2.monsters.findIndex((m) => m.id === monster.id);
      if (mIdx >= 0) {
        const m = floor2.monsters[mIdx];
        const mNewHp = m.hp - reflectDmg;
        const newMonsters = [...floor2.monsters];
        if (mNewHp <= 0) {
          // Monster killed by Thorns — award XP, drop loot, check victory
          monsterKilledByThorns = true;
          newMonsters.splice(mIdx, 1);
          Sound.monsterDeath();
          trackMonsterKill(monster.templateId, monster.xpValue >= 250);
          const thornsBoss = !!MONSTER_BY_ID[monster.templateId]?.boss;
          const loot = generateLoot(
            result.currentFloor,
            m.position,
            result.ngPlusCount,
            result.hero.equipment,
            thornsBoss,
            state.statueUpgrades,
          );
          let newItems = [...floor2.items];
          const thornsMsgs: Message[] = [
            {
              text: `Thorns reflect ${reflectDmg} damage back at the ${monster.name}, killing it! (+${monster.xpValue} XP)`,
              severity: "combat" as const,
              turn: result.turn,
            },
          ];
          if (loot) {
            newItems.push({ item: loot, position: { ...m.position } });
            thornsMsgs.push({
              text: `The ${monster.name} dropped ${getDisplayName(loot)}.`,
              severity: "normal" as const,
              turn: result.turn,
            });
          }
          let newFloor2 = { ...floor2, monsters: newMonsters, items: newItems };
          if (
            Math.random() < 0.75 &&
            canPlaceOnTile(newFloor2, m.position.x, m.position.y)
          ) {
            newFloor2 = {
              ...newFloor2,
              decals: cappedDecals(newFloor2.decals, {
                x: m.position.x,
                y: m.position.y,
              }),
            };
          }
          result = {
            ...result,
            hero: {
              ...result.hero,
              xp:
                result.hero.xp +
                fortuneXp(
                  monster.xpValue,
                  result.hero.equipment,
                  state.statueUpgrades,
                ),
            },
            floors: { ...result.floors, [floorKey2]: newFloor2 },
            messages: [...result.messages, ...thornsMsgs],
          };
          if (monster.templateId === "surtur") {
            return { ...result, screen: "victory" };
          }
        } else {
          newMonsters[mIdx] = { ...m, hp: mNewHp };
          result = {
            ...result,
            floors: {
              ...result.floors,
              [floorKey2]: { ...floor2, monsters: newMonsters },
            },
            messages: [
              ...result.messages,
              {
                text: `Thorns reflect ${reflectDmg} damage back at the ${monster.name}!`,
                severity: "combat" as const,
                turn: result.turn,
              },
            ],
          };
        }
      }
    }
  }

  // Process on-hit abilities (poison, drain, steal, elemental touch) — skip if monster died to Thorns
  if (
    !monsterKilledByThorns &&
    monster.abilities.length > 0 &&
    result.hero.hp > 0
  ) {
    result = processMonsterAbility(result, monster);
  }

  return result;
}

function applyMessages(state: GameState, messages: Message[]): GameState {
  if (messages.length === 0) return state;
  return { ...state, messages: [...state.messages, ...messages] };
}
