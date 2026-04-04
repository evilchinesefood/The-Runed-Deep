import type {
  GameState,
  Monster,
  Floor,
  Vector2,
  Message,
  Direction,
} from "../../core/types";
import { SPELL_BY_ID, type SpellDef } from "../../data/spells";
import { getDifficultyConfig } from "../../data/difficulty";
import { Sound } from "../Sound";
import { getDirectionVector, teleportToTown } from "../../core/actions";
import { removeCurseFromFirst } from "../inventory/use-item";
import { getMonstersForDepth } from "../../data/monsters";
import { createMonster } from "../monsters/spawning";
import { queueAnimation } from "../../rendering/animation-queue";
import {
  buildBoltAnimation,
  buildBallAnimation,
  buildHealAnimation,
  buildBuffAnimation,
  buildTeleportAnimation,
  buildDetectAnimation,
} from "../../rendering/animations";
import { equipAffixTotal, equipAffixTotal2 } from "../../utils/Enchants";
import { ITEM_BY_ID } from "../../data/items";
import { recomputeDerivedStats } from "../character/derived-stats";
import { RUNE_BY_ID, getRuneValue } from "../../data/Runes";

function fortuneXp(baseXp: number, equipment: any): number {
  let xp = baseXp;
  const pct = equipAffixTotal2(equipment, "fortune");
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
  const leechPenalty = equipAffixTotal2(equipment, "leech");
  if (leechPenalty > 0)
    xp = Math.max(1, Math.round(xp * (1 - leechPenalty / 100)));
  return xp;
}

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
  if (!spell) return addMsg(state, `Unknown spell.`, "system");

  if (!state.hero.knownSpells.includes(spellId)) {
    return addMsg(state, `You don't know that spell.`, "system");
  }

  // Arcane Mastery: reduce MP cost + Ring of the Archmage unique
  let costReduction = equipAffixTotal(state.hero.equipment, "arcane-mastery");
  for (const eq of Object.values(state.hero.equipment)) {
    if (eq && ITEM_BY_ID[eq.templateId]?.uniqueAbility === "archmage-power")
      costReduction += 25;
  }
  // Dark Pact: increase MP cost (secondary value = % increase)
  const darkPactPenalty = equipAffixTotal2(state.hero.equipment, "dark-pact");
  const costMult =
    (1 - Math.min(costReduction, 75) / 100) * (1 + darkPactPenalty / 100);
  const cost = Math.max(1, Math.round(spell.manaCost * costMult));
  if (state.hero.mp < cost) {
    return addMsg(
      state,
      `Not enough mana to cast ${spell.name}. (Need ${cost} MP)`,
      "system",
    );
  }

  // Deduct mana
  let newState: GameState = {
    ...state,
    hero: { ...state.hero, mp: state.hero.mp - cost },
  };

  // Play sound based on spell type
  if (
    ["magic-arrow", "cold-bolt", "lightning-bolt", "fire-bolt"].includes(
      spell.id,
    )
  )
    Sound.spellBolt();
  else if (["cold-ball", "ball-lightning", "fire-ball"].includes(spell.id))
    Sound.spellBall();
  else if (
    [
      "heal-minor-wounds",
      "heal-medium-wounds",
      "heal-major-wounds",
      "healing",
    ].includes(spell.id)
  )
    Sound.spellHeal();
  else if (
    [
      "shield",
      "resist-cold",
      "resist-fire",
      "resist-lightning",
      "time-stop",
    ].includes(spell.id)
  )
    Sound.spellBuff();

  // Resolve effect
  newState = resolveSpellEffect(newState, spell, direction, target);

  // Rune: Echo — chance to double-cast for free
  let echoPct = 0;
  for (const item of Object.values(newState.hero.equipment)) {
    if (!item || !item.sockets) continue;
    const effEnch = item.enchantment + (item.blessed ? 1 : 0);
    for (const rid of item.sockets) {
      if (!rid) continue;
      const r = RUNE_BY_ID[rid];
      if (r?.effect === "double-cast") echoPct += getRuneValue(rid, effEnch);
    }
  }
  if (echoPct > 0 && Math.random() * 100 < echoPct) {
    newState = resolveSpellEffect(newState, spell, direction, target);
    newState = {
      ...newState,
      messages: [
        ...newState.messages,
        {
          text: `Echo rune triggers! ${spell.name} casts again!`,
          severity: "important" as const,
          turn: newState.turn,
        },
      ],
    };
  }

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
    case "magic-arrow":
      return resolveBolt(state, spell, direction, 4, 8, "physical");
    case "cold-bolt":
      return resolveBolt(state, spell, direction, 9, 16, "cold");
    case "lightning-bolt":
      return resolveBolt(state, spell, direction, 13, 24, "lightning");
    case "fire-bolt":
      return resolveBolt(state, spell, direction, 13, 24, "fire");
    case "cold-ball":
      return resolveBall(state, spell, direction, target, 18, 32, "cold");
    case "ball-lightning":
      return resolveBall(state, spell, direction, target, 22, 40, "lightning");
    case "fire-ball":
      return resolveBall(state, spell, direction, target, 27, 48, "fire");

    // ── Healing spells ──────────────────────────────────
    case "heal-minor-wounds":
      return resolveHeal(state, spell, 0.15, 5);
    case "heal-medium-wounds":
      return resolveHeal(state, spell, 0.35, 15);
    case "heal-major-wounds":
      return resolveHeal(state, spell, 0.6, 30);
    case "healing":
      return resolveHeal(state, spell, 1.0, 999);
    case "neutralize-poison": {
      const cleaned = state.hero.activeEffects.filter(
        (e) => e.id !== "poisoned",
      );
      return {
        ...addMsg(
          state,
          `${state.hero.name} is cleansed of poison.`,
          "important",
        ),
        hero: { ...state.hero, activeEffects: cleaned },
      };
    }

    // ── Defense spells ──────────────────────────────────
    case "shield":
      return resolveShield(state, spell);
    case "resist-cold":
    case "resist-fire":
    case "resist-lightning":
      return resolveResist(state, spell);

    // ── Control spells ──────────────────────────────────
    case "sleep-monster": {
      const t =
        target ??
        (direction ? findTargetInDirection(state, direction) : undefined);
      return resolveSleepMonster(state, t);
    }
    case "slow-monster": {
      const t =
        target ??
        (direction ? findTargetInDirection(state, direction) : undefined);
      return resolveSlowMonster(state, t);
    }
    case "transmogrify-monster": {
      const t =
        target ??
        (direction ? findTargetInDirection(state, direction) : undefined);
      return resolveTransmogrify(state, t);
    }

    // ── Movement spells ─────────────────────────────────
    case "phase-door":
      return resolvePhaseDoor(state, direction);
    case "levitation": {
      const newEffects = [
        ...state.hero.activeEffects.filter((e) => e.id !== "levitation"),
        { id: "levitation", name: "Levitation", turnsRemaining: 50 },
      ];
      return {
        ...addMsg(state, `${state.hero.name} begins to float!`, "important"),
        hero: { ...state.hero, activeEffects: newEffects },
      };
    }
    case "return": {
      if (state.currentDungeon === "town") {
        return addMsg(state, "You are already in town.", "system");
      }
      return teleportToTown(state);
    }
    case "teleport":
      return resolveTeleport(state);

    // ── Divination spells ───────────────────────────────
    case "detect-objects":
      return resolveDetectObjects(state);
    case "detect-monsters":
      return resolveDetectMonsters(state);
    case "detect-traps":
      return resolveDetectTraps(state);
    case "clairvoyance":
      return resolveClairvoyance(state);

    // ── Misc spells ─────────────────────────────────────
    case "light":
      return resolveLight(state);
    case "remove-curse": {
      const msgs: Message[] = [];
      const hero = removeCurseFromFirst(state.hero, msgs, state.turn);
      return { ...state, hero, messages: [...state.messages, ...msgs] };
    }
    case "time-stop": {
      const newEffects = [
        ...state.hero.activeEffects.filter((e) => e.id !== "time-stop"),
        { id: "time-stop", name: "Time Stop", turnsRemaining: 10 },
      ];
      queueAnimation(buildBuffAnimation(state.hero.position, "#88f"));
      return {
        ...addMsg(
          state,
          `Time freezes! Monsters cannot act for 10 turns.`,
          "important",
        ),
        hero: { ...state.hero, activeEffects: newEffects },
      };
    }

    case "warcry": {
      const fk = `${state.currentDungeon}-${state.currentFloor}`;
      const fl = state.floors[fk];
      if (!fl)
        return addMsg(state, "Your warcry echoes into silence.", "system");
      const monsters = fl.monsters.map((m) =>
        m.hp > 0 ? { ...m, alerted: true } : m,
      );
      queueAnimation(buildBuffAnimation(state.hero.position, "#f84"));
      return {
        ...addMsg(
          state,
          "You let out a deafening warcry! Every creature on the floor turns toward you...",
          "important",
        ),
        floors: { ...state.floors, [fk]: { ...fl, monsters } },
      };
    }

    default:
      return addMsg(state, `${spell.name} fizzles.`, "system");
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
  if (!direction)
    return addMsg(
      state,
      `You need to pick a direction for ${spell.name}.`,
      "system",
    );

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
    if (!floor.tiles[y][x].transparent && floor.tiles[y][x].type === "wall")
      break;

    // Check for monster
    const monsterIdx = floor.monsters.findIndex(
      (m) => m.position.x === x && m.position.y === y,
    );
    if (monsterIdx !== -1) {
      queueAnimation(
        buildBoltAnimation(
          spell.id,
          state.hero.position,
          direction,
          12,
          { x, y },
          floor,
        ),
      );
      return applySpellDamageToMonster(
        state,
        floorKey,
        monsterIdx,
        spell,
        minDmg,
        maxDmg,
        element,
      );
    }
  }

  // Missed — still show the bolt flying
  queueAnimation(
    buildBoltAnimation(
      spell.id,
      state.hero.position,
      direction,
      12,
      undefined,
      floor,
    ),
  );
  return addMsg(
    state,
    `The ${spell.name} flies off into the darkness.`,
    "combat",
  );
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
  if (!target)
    return addMsg(
      state,
      `You need to pick a target for ${spell.name}.`,
      "system",
    );

  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  // Queue ball animation (projectile + explosion)
  if (direction) {
    queueAnimation(
      buildBallAnimation(
        spell.id,
        state.hero.position,
        direction,
        target,
        floor,
      ),
    );
  }

  let currentState = addMsg(
    state,
    `${state.hero.name} casts ${spell.name}!`,
    "combat",
  );

  // Direct hit on target tile
  const directIdx = floor.monsters.findIndex(
    (m) => m.position.x === target.x && m.position.y === target.y,
  );
  if (directIdx !== -1) {
    currentState = applySpellDamageToMonster(
      currentState,
      floorKey,
      directIdx,
      spell,
      minDmg,
      maxDmg,
      element,
    );
  }

  // Splash damage to adjacent 8 tiles (half damage)
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const ax = target.x + dx;
      const ay = target.y + dy;
      const currentFloor = currentState.floors[floorKey];
      if (!currentFloor) continue;
      const adjIdx = currentFloor.monsters.findIndex(
        (m) => m.position.x === ax && m.position.y === ay,
      );
      if (adjIdx !== -1) {
        currentState = applySpellDamageToMonster(
          currentState,
          floorKey,
          adjIdx,
          spell,
          Math.floor(minDmg / 2),
          Math.floor(maxDmg / 2),
          element,
        );
      }
      // Self-damage if hero is in splash
      if (
        ax === currentState.hero.position.x &&
        ay === currentState.hero.position.y
      ) {
        let selfDmg = rollRange(Math.floor(minDmg / 2), Math.floor(maxDmg / 2));
        // Apply hero's elemental resistance to self-damage
        const heroResist =
          currentState.hero.resistances[
            element as keyof typeof currentState.hero.resistances
          ] ?? 0;
        if (heroResist >= 100) {
          selfDmg = 0;
        } else if (heroResist > 0) {
          selfDmg = Math.round(selfDmg * (1 - heroResist / 100));
        }
        if (selfDmg > 0) {
          currentState = {
            ...currentState,
            hero: { ...currentState.hero, hp: currentState.hero.hp - selfDmg },
          };
          currentState = addMsg(
            currentState,
            `${currentState.hero.name} is caught in the blast for ${selfDmg} damage!`,
            "combat",
          );
        }
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

  // INT scaling — effective INT includes equipment bonuses
  const eq = state.hero.equipment;
  const soulDrainAll = Math.round(equipAffixTotal(eq, "soul-drain"));
  const bonusInt = Math.round(equipAffixTotal(eq, "brilliance")) + soulDrainAll;
  let uInt = 0;
  for (const slot of Object.values(eq)) {
    if (!slot) continue;
    const tpl = ITEM_BY_ID[slot.templateId];
    if (!tpl?.uniqueAbility) continue;
    if (tpl.uniqueAbility === "crown-power") uInt += 10;
    else if (tpl.uniqueAbility === "archmage-power") uInt += 30;
  }
  const effInt = state.hero.attributes.intelligence + bonusInt + uInt;
  damage = Math.round(damage * (1 + effInt / 100));

  // Spell Power affix (scaled)
  const spellPower = equipAffixTotal(state.hero.equipment, "spell-power");
  if (spellPower > 0) damage = Math.round(damage * (1 + spellPower / 100));

  // Dark Pact: bonus spell damage (primary value)
  const darkPactDmg = equipAffixTotal(state.hero.equipment, "dark-pact");
  if (darkPactDmg > 0) damage = Math.round(damage * (1 + darkPactDmg / 100));

  // Elemental Touched affix bonuses (primary = damage %)
  if (element === "fire") {
    const bonus = equipAffixTotal(state.hero.equipment, "fire-touched");
    if (bonus > 0) damage = Math.round(damage * (1 + bonus / 100));
  } else if (element === "cold") {
    const bonus = equipAffixTotal(state.hero.equipment, "frost-touched");
    if (bonus > 0) damage = Math.round(damage * (1 + bonus / 100));
  } else if (element === "lightning") {
    const bonus = equipAffixTotal(state.hero.equipment, "storm-touched");
    if (bonus > 0) damage = Math.round(damage * (1 + bonus / 100));
  }

  // Helm of Storms: +50% lightning damage
  if (element === "lightning") {
    for (const eq of Object.values(state.hero.equipment)) {
      if (
        eq &&
        ITEM_BY_ID[eq.templateId]?.uniqueAbility === "lightning-boost"
      ) {
        damage = Math.round(damage * 1.5);
        break;
      }
    }
  }

  // Gauntlets of the Forge: +50% fire damage
  if (element === "fire") {
    for (const eq of Object.values(state.hero.equipment)) {
      if (eq && ITEM_BY_ID[eq.templateId]?.uniqueAbility === "forge-power") {
        damage = Math.round(damage * 1.5);
        break;
      }
    }
  }

  // Apply elemental resistance
  const resistance = getElementResistance(monster, element);
  if (resistance >= 100) {
    return addMsg(
      state,
      `The ${monster.name} is immune to ${element}!`,
      "combat",
    );
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
    const resultState: GameState = {
      ...addMsg(
        state,
        `${spell.name} hits the ${monster.name} for ${damage} ${element} damage, killing it! (+${monster.xpValue} XP)`,
        "combat",
      ),
      hero: {
        ...state.hero,
        mp: state.hero.mp,
        xp: state.hero.xp + fortuneXp(monster.xpValue, state.hero.equipment),
      },
      floors: { ...state.floors, [floorKey]: newFloor },
    };
    if (monster.templateId === "surtur") {
      return { ...resultState, screen: "victory" };
    }
    return resultState;
  }

  const updatedMonster = { ...monster, hp: newHp };
  const newMonsters = [...floor.monsters];
  newMonsters[monsterIdx] = updatedMonster;
  const newFloor: Floor = { ...floor, monsters: newMonsters };
  return {
    ...addMsg(
      state,
      `${spell.name} hits the ${monster.name} for ${damage} ${element} damage. (${newHp}/${monster.maxHp} HP)`,
      "combat",
    ),
    floors: { ...state.floors, [floorKey]: newFloor },
  };
}

function getElementResistance(monster: Monster, element: string): number {
  switch (element) {
    case "cold":
      return monster.resistances.cold;
    case "fire":
      return monster.resistances.fire;
    case "lightning":
      return monster.resistances.lightning;
    case "acid":
      return monster.resistances.acid;
    case "drain":
      return monster.resistances.drain;
    default:
      return 0; // physical
  }
}

// ============================================================
// Healing spells
// ============================================================

function resolveHeal(
  state: GameState,
  spell: SpellDef,
  pct: number,
  minHeal: number,
): GameState {
  const hero = state.hero;
  const mult = getDifficultyConfig(state.difficulty).healingMult;

  // INT scaling for healing
  const eq = hero.equipment;
  const soulDrainAll = Math.round(equipAffixTotal(eq, "soul-drain"));
  const bonusInt = Math.round(equipAffixTotal(eq, "brilliance")) + soulDrainAll;
  let uInt = 0;
  for (const slot of Object.values(eq)) {
    if (!slot) continue;
    const tpl = ITEM_BY_ID[slot.templateId];
    if (!tpl?.uniqueAbility) continue;
    if (tpl.uniqueAbility === "crown-power") uInt += 10;
    else if (tpl.uniqueAbility === "archmage-power") uInt += 30;
  }
  const effInt = hero.attributes.intelligence + bonusInt + uInt;
  const intMult = 1 + effInt / 100;

  const healAmount = Math.max(
    Math.round(minHeal * mult * intMult),
    Math.floor(hero.maxHp * pct * mult * intMult),
  );
  const newHp = Math.min(hero.hp + healAmount, hero.maxHp);
  const healed = newHp - hero.hp;

  if (healed <= 0) {
    return addMsg(state, `${hero.name} is already at full health.`, "system");
  }

  queueAnimation(buildHealAnimation(hero.position));

  return {
    ...addMsg(
      state,
      `${spell.name} heals ${hero.name} for ${healed} HP. (${newHp}/${hero.maxHp})`,
      "important",
    ),
    hero: { ...hero, hp: newHp },
  };
}

// ============================================================
// Shield spell — temporary AC boost
// ============================================================

function resolveShield(state: GameState, _spell: SpellDef): GameState {
  queueAnimation(buildBuffAnimation(state.hero.position, "#48f"));
  const hero = state.hero;
  const alreadyActive = hero.activeEffects.some((e) => e.id === "shield");
  const newEffects = [
    ...hero.activeEffects.filter((e) => e.id !== "shield"),
    { id: "shield", name: "Shield", turnsRemaining: 30 },
  ];

  // Only add AC bonus if shield wasn't already active (prevents stacking)
  const newAc = alreadyActive ? hero.armorValue : hero.armorValue + 4;
  const msg = alreadyActive
    ? `${hero.name} refreshes the magical shield. (30 turns)`
    : `A magical shield surrounds ${hero.name}. (+4 AC for 30 turns)`;

  return {
    ...addMsg(state, msg, "important"),
    hero: { ...hero, activeEffects: newEffects, armorValue: newAc },
  };
}

// ============================================================
// Resist spells
// ============================================================

function resolveResist(state: GameState, spell: SpellDef): GameState {
  const element = spell.id.replace("resist-", "");
  const color =
    element === "cold" ? "#4af" : element === "fire" ? "#f64" : "#ff4";
  queueAnimation(buildBuffAnimation(state.hero.position, color));
  const hero = state.hero;
  const alreadyActive = hero.activeEffects.some((e) => e.id === spell.id);
  const newEffects = [
    ...hero.activeEffects.filter((e) => e.id !== spell.id),
    { id: spell.id, name: spell.name, turnsRemaining: 50 },
  ];
  // Resist bonus is computed by recomputeDerivedStats from active effects

  const msg = alreadyActive
    ? `${hero.name} refreshes resistance to ${element}. (50 turns)`
    : `${hero.name} gains resistance to ${element} for 50 turns.`;

  return {
    ...addMsg(state, msg, "important"),
    hero: recomputeDerivedStats({ ...hero, activeEffects: newEffects }),
  };
}

// ============================================================
// Sleep/Slow Monster
// ============================================================

function resolveSleepMonster(
  state: GameState,
  target: Vector2 | undefined,
): GameState {
  if (!target) return addMsg(state, `You need to pick a target.`, "system");
  return applyStatusToMonster(state, target, "sleeping", `falls asleep!`);
}

function resolveSlowMonster(
  state: GameState,
  target: Vector2 | undefined,
): GameState {
  if (!target) return addMsg(state, `You need to pick a target.`, "system");
  return applyStatusToMonster(state, target, "slowed", `is slowed!`);
}

function resolveTransmogrify(
  state: GameState,
  target: Vector2 | undefined,
): GameState {
  if (!target) return addMsg(state, `You need to aim the spell.`, "system");
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  const idx = floor.monsters.findIndex(
    (m) => m.position.x === target.x && m.position.y === target.y,
  );
  if (idx === -1) return addMsg(state, `There's no monster there.`, "system");

  const original = floor.monsters[idx];
  const weakDepth = Math.max(1, state.currentFloor - 4);
  const candidates = getMonstersForDepth(weakDepth);
  if (candidates.length === 0)
    return addMsg(state, `The spell fizzles.`, "system");

  const template = candidates[Math.floor(Math.random() * candidates.length)];
  const newMonster = createMonster(
    template,
    original.position,
    weakDepth,
    Math.random,
    state.difficulty,
  );

  const newMonsters = [...floor.monsters];
  newMonsters[idx] = newMonster;
  return {
    ...addMsg(
      state,
      `The ${original.name} transforms into a ${newMonster.name}!`,
      "important",
    ),
    floors: {
      ...state.floors,
      [floorKey]: { ...floor, monsters: newMonsters },
    },
  };
}

function applyStatusToMonster(
  state: GameState,
  target: Vector2,
  status: "sleeping" | "slowed",
  msg: string,
): GameState {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  const idx = floor.monsters.findIndex(
    (m) => m.position.x === target.x && m.position.y === target.y,
  );
  if (idx === -1) return addMsg(state, `There's no monster there.`, "system");

  const monster = floor.monsters[idx];
  const updated = { ...monster, [status]: true };
  const newMonsters = [...floor.monsters];
  newMonsters[idx] = updated;

  return {
    ...addMsg(state, `The ${monster.name} ${msg}`, "combat"),
    floors: {
      ...state.floors,
      [floorKey]: { ...floor, monsters: newMonsters },
    },
  };
}

// ============================================================
// Movement spells
// ============================================================

function resolvePhaseDoor(state: GameState, direction?: Direction): GameState {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  const RANGE = 6;
  const heroX = state.hero.position.x;
  const heroY = state.hero.position.y;

  if (direction) {
    // Directed phase door: find the furthest walkable tile in that direction within range
    const delta = getDirectionVector(direction);
    let bestX = heroX;
    let bestY = heroY;

    for (let i = 1; i <= RANGE; i++) {
      const nx = heroX + delta.x * i;
      const ny = heroY + delta.y * i;
      if (nx < 0 || nx >= floor.width || ny < 0 || ny >= floor.height) break;
      if (!floor.tiles[ny][nx].walkable) break;
      if (
        floor.monsters.some((m) => m.position.x === nx && m.position.y === ny)
      )
        continue;
      bestX = nx;
      bestY = ny;
    }

    if (bestX === heroX && bestY === heroY) {
      return addMsg(
        state,
        `The phase door fizzles — no safe destination in that direction.`,
        "system",
      );
    }

    queueAnimation(
      buildTeleportAnimation(state.hero.position, { x: bestX, y: bestY }),
    );
    return {
      ...addMsg(state, `${state.hero.name} phases through space!`, "important"),
      hero: { ...state.hero, position: { x: bestX, y: bestY } },
    };
  }

  // No direction: random teleport within range (fallback)
  for (let attempt = 0; attempt < 50; attempt++) {
    const dx = Math.floor(Math.random() * 13) - 6;
    const dy = Math.floor(Math.random() * 13) - 6;
    const dist = Math.abs(dx) + Math.abs(dy);
    if (dist < 3 || dist > 8) continue;

    const nx = heroX + dx;
    const ny = heroY + dy;
    if (nx < 0 || nx >= floor.width || ny < 0 || ny >= floor.height) continue;
    if (!floor.tiles[ny][nx].walkable) continue;
    if (floor.monsters.some((m) => m.position.x === nx && m.position.y === ny))
      continue;

    queueAnimation(
      buildTeleportAnimation(state.hero.position, { x: nx, y: ny }),
    );
    return {
      ...addMsg(state, `${state.hero.name} phases through space!`, "important"),
      hero: { ...state.hero, position: { x: nx, y: ny } },
    };
  }

  return addMsg(
    state,
    `The phase door fizzles — no safe destination found.`,
    "system",
  );
}

function resolveTeleport(state: GameState): GameState {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  // Random walkable position
  const candidates: Vector2[] = [];
  for (let y = 0; y < floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      if (
        floor.tiles[y][x].walkable &&
        !floor.monsters.some((m) => m.position.x === x && m.position.y === y)
      ) {
        candidates.push({ x, y });
      }
    }
  }

  if (candidates.length === 0)
    return addMsg(state, `The teleport fizzles.`, "system");
  const dest = candidates[Math.floor(Math.random() * candidates.length)];

  queueAnimation(buildTeleportAnimation(state.hero.position, dest));
  return {
    ...addMsg(state, `${state.hero.name} teleports!`, "important"),
    hero: { ...state.hero, position: dest },
  };
}

// ============================================================
// Divination spells
// ============================================================

function resolveDetectMonsters(state: GameState): GameState {
  queueAnimation(buildDetectAnimation(state.hero.position, "#f44"));
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  // Reveal all monster positions by marking their tiles as explored
  const explored = floor.explored.map((row) => [...row]);
  for (const m of floor.monsters) {
    if (
      m.position.y >= 0 &&
      m.position.y < floor.height &&
      m.position.x >= 0 &&
      m.position.x < floor.width
    ) {
      explored[m.position.y][m.position.x] = true;
    }
  }

  return {
    ...addMsg(
      state,
      `${state.hero.name} senses ${floor.monsters.length} monsters on this floor.`,
      "important",
    ),
    floors: { ...state.floors, [floorKey]: { ...floor, explored } },
  };
}

function resolveDetectObjects(state: GameState): GameState {
  queueAnimation(buildDetectAnimation(state.hero.position, "#ff0"));
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  const explored = floor.explored.map((row) => [...row]);
  for (const item of floor.items) {
    if (item.position.y >= 0 && item.position.y < floor.height) {
      explored[item.position.y][item.position.x] = true;
    }
  }

  return {
    ...addMsg(
      state,
      `${state.hero.name} senses ${floor.items.length} items on this floor.`,
      "important",
    ),
    floors: { ...state.floors, [floorKey]: { ...floor, explored } },
  };
}

function resolveDetectTraps(state: GameState): GameState {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  let trapsFound = 0;
  const tiles = floor.tiles.map((row) =>
    row.map((t) => {
      if (t.type === "trap" && !t.trapRevealed) {
        trapsFound++;
        return { ...t, trapRevealed: true };
      }
      return t;
    }),
  );

  return {
    ...addMsg(
      state,
      trapsFound > 0
        ? `${state.hero.name} detects ${trapsFound} traps!`
        : `No traps detected nearby.`,
      "important",
    ),
    floors: { ...state.floors, [floorKey]: { ...floor, tiles } },
  };
}

function resolveClairvoyance(state: GameState): GameState {
  queueAnimation(buildDetectAnimation(state.hero.position, "#88f"));
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  // Reveal 10x10 area around the player
  const explored = floor.explored.map((row) => [...row]);
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
    ...addMsg(
      state,
      `${state.hero.name}'s vision expands, revealing the surrounding area.`,
      "important",
    ),
    floors: { ...state.floors, [floorKey]: { ...floor, explored } },
  };
}

// ============================================================
// Light spell — increase FOV radius temporarily
// ============================================================

function resolveLight(state: GameState): GameState {
  queueAnimation(buildBuffAnimation(state.hero.position, "#ff8"));

  // Immediately light all visible floor tiles in extended FOV, no persistent effect
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return addMsg(state, "Nothing happens.", "system");

  const newFloor = { ...floor, lit: floor.lit.map((row) => [...row]) };

  // Compute extended FOV and mark floor tiles as permanently lit
  const VIEW_RADIUS = 10;
  const px = state.hero.position.x;
  const py = state.hero.position.y;

  // Light player tile (floor and trap tiles — not walls)
  const canLight = (t: string) =>
    t === "floor" ||
    t === "trap" ||
    t === "decor" ||
    t === "stairs-up" ||
    t === "stairs-down";
  if (newFloor.tiles[py]?.[px] && canLight(newFloor.tiles[py][px].type)) {
    newFloor.lit[py][px] = true;
  }

  // Cast rays outward
  const RAYS = 360;
  for (let i = 0; i < RAYS; i++) {
    const angle = (i / RAYS) * Math.PI * 2;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let cx = px + 0.5;
    let cy = py + 0.5;

    for (let step = 0; step < VIEW_RADIUS; step++) {
      cx += dx;
      cy += dy;
      const tx = Math.floor(cx);
      const ty = Math.floor(cy);
      if (tx < 0 || tx >= newFloor.width || ty < 0 || ty >= newFloor.height)
        break;
      if (canLight(newFloor.tiles[ty][tx].type)) {
        newFloor.lit[ty][tx] = true;
      }
      if (!newFloor.tiles[ty][tx].transparent) break;
    }
  }

  return {
    ...addMsg(
      state,
      `The area around ${state.hero.name} brightens.`,
      "important",
    ),
    floors: { ...state.floors, [floorKey]: newFloor },
  };
}

// ============================================================
// Helpers
// ============================================================

/**
 * Find the nearest monster in a given direction from the hero.
 * Traces a line up to 12 tiles and returns the first monster position found.
 */
function findTargetInDirection(
  state: GameState,
  direction: Direction,
): Vector2 | undefined {
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

    const monster = floor.monsters.find(
      (m) => m.position.x === x && m.position.y === y,
    );
    if (monster) return { x, y };
  }

  // No monster found — target the furthest open tile in that direction
  return { x: x - delta.x, y: y - delta.y };
}

function rollRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addMsg(
  state: GameState,
  text: string,
  severity: Message["severity"],
): GameState {
  return {
    ...state,
    messages: [...state.messages, { text, severity, turn: state.turn }],
  };
}
