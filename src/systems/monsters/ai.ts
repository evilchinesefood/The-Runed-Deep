import type {
  GameState,
  Floor,
  Vector2,
  Monster,
  Message,
  PlacedItem,
  Hero,
} from "../../core/types";
import { monsterAttacksPlayer } from "../combat/combat";
import { queueAnimation } from "../../rendering/animation-queue";
import {
  buildBoltAnimation,
  buildBallAnimation,
} from "../../rendering/animations";
import { recomputeDerivedStats } from "../character/derived-stats";
import { getMonstersForDepth } from "../../data/monsters";
import { createMonster } from "./spawning";
import { xpRequiredForLevel } from "../character/leveling";
import { ITEM_BY_ID } from "../../data/items";
import { getModifierFlags } from "../rift/ModifierFlags";

// ── Mutable turn context (batch state mutations) ───────────

/** Mutable working context used during processAllMonsterTurns.
 *  All monster AI mutates this directly instead of copying GameState. */
interface TurnCtx {
  monsters: Monster[];
  messages: Message[];
  hero: Hero;
  items: PlacedItem[];
  decals: Vector2[];
  floor: Floor; // reference for tiles/dimensions (read-only during AI)
  floorKey: string;
  state: GameState; // base state (hero/messages updated via ctx, floors rebuilt at end)
  occ: Set<string>;
}

/** Build a snapshot GameState from the mutable context (for combat calls). */
function ctxToState(ctx: TurnCtx): GameState {
  const floor: Floor = {
    ...ctx.floor,
    monsters: ctx.monsters,
    items: ctx.items,
    decals: ctx.decals,
  };
  return {
    ...ctx.state,
    hero: ctx.hero,
    messages: ctx.messages,
    floors: { ...ctx.state.floors, [ctx.floorKey]: floor },
  };
}

/** Extract mutable fields back from a GameState returned by combat. */
function stateToCtx(ctx: TurnCtx, s: GameState): void {
  const f = s.floors[ctx.floorKey];
  if (f) {
    ctx.monsters = f.monsters;
    ctx.items = f.items;
    ctx.decals = f.decals;
  }
  ctx.hero = s.hero;
  ctx.messages = s.messages;
  // Capture screen changes (e.g., victory on Surtur thorns kill)
  ctx.state = { ...ctx.state, screen: s.screen };
  // Rebuild occupied set since combat may have removed/moved monsters
  ctx.occ.clear();
  for (const m of ctx.monsters) ctx.occ.add(`${m.position.x},${m.position.y}`);
}

// ── Helpers ─────────────────────────────────────────────────

function getDetectRange(state: GameState): number {
  let range = 20;
  for (const eq of Object.values(state.hero.equipment)) {
    if (eq && ITEM_BY_ID[eq.templateId]?.uniqueAbility === "shadow-cloak") {
      range -= 3;
      break;
    }
  }
  return range;
}

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
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: -1, y: 1 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
];

/** True if tile at (x,y) is within bounds and walkable. */
function walkable(floor: Floor, x: number, y: number): boolean {
  if (x < 0 || x >= floor.width || y < 0 || y >= floor.height) return false;
  return floor.tiles[y][x].walkable;
}

/** Like walkable but ghosts with 'phase-through-walls' can pass through walls.
 *  Flying monsters can also cross water tiles. */
function canMoveTo(
  floor: Floor,
  x: number,
  y: number,
  phasing: boolean,
  flying: boolean = false,
): boolean {
  if (x < 0 || x >= floor.width || y < 0 || y >= floor.height) return false;
  if (phasing) return true;
  const tile = floor.tiles[y][x];
  if (tile.walkable) return true;
  if (flying && tile.type === "water") return true;
  return false;
}

/** True if no other monster occupies (x,y). */
function noMonsterCtx(
  monsters: Monster[],
  x: number,
  y: number,
  excludeIdx: number,
  occ: Set<string>,
): boolean {
  const k = `${x},${y}`;
  const own = monsters[excludeIdx];
  if (own && own.position.x === x && own.position.y === y) return true;
  return !occ.has(k);
}

function buildOccupied(monsters: Monster[]): Set<string> {
  const s = new Set<string>();
  for (const m of monsters) s.add(`${m.position.x},${m.position.y}`);
  return s;
}

/**
 * Simple raycasting line-of-sight check.
 * Returns true if there are no opaque tiles between from and to (exclusive of endpoints).
 */
export function hasLineOfSight(
  floor: Floor,
  from: Vector2,
  to: Vector2,
): boolean {
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
function directionTo(
  from: Vector2,
  to: Vector2,
): import("../../core/types").Direction {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  // atan2: east=0, south=90, west=180/-180, north=-90
  if (angle >= -22.5 && angle < 22.5) return "E";
  if (angle >= 22.5 && angle < 67.5) return "SE";
  if (angle >= 67.5 && angle < 112.5) return "S";
  if (angle >= 112.5 && angle < 157.5) return "SW";
  if (angle >= 157.5 || angle < -157.5) return "W";
  if (angle >= -157.5 && angle < -112.5) return "NW";
  if (angle >= -112.5 && angle < -67.5) return "N";
  return "NE";
}

function addMsg(
  ctx: TurnCtx,
  text: string,
  severity: Message["severity"] = "combat",
): void {
  ctx.messages.push({ text, severity, turn: ctx.state.turn });
}

/** State-based addMsg for exported functions called from combat.ts. */
function addMsgState(
  state: GameState,
  text: string,
  severity: Message["severity"] = "combat",
): GameState {
  return {
    ...state,
    messages: [...state.messages, { text, severity, turn: state.turn }],
  };
}

/** State-based updateMonster for exported functions called from combat.ts. */
function updateMonsterState(
  state: GameState,
  floorKey: string,
  idx: number,
  updated: Monster,
): GameState {
  const floor = state.floors[floorKey];
  if (!floor) return state;
  const monsters = [...floor.monsters];
  monsters[idx] = updated;
  return {
    ...state,
    floors: { ...state.floors, [floorKey]: { ...floor, monsters } },
  };
}

// ── Movement helpers ─────────────────────────────────────────

/** Move monster toward a target. Mutates ctx in place. */
function moveToward(ctx: TurnCtx, idx: number, target: Vector2): void {
  const monster = ctx.monsters[idx];
  const { x, y } = monster.position;
  const phasing = monster.abilities.includes("phase-through-walls");
  const flying = monster.abilities.includes("flying");

  let bestPos: Vector2 | null = null;
  let bestDist = Infinity;

  for (const d of ALL_DIRS) {
    const nx = x + d.x,
      ny = y + d.y;
    if (!canMoveTo(ctx.floor, nx, ny, phasing, flying)) continue;
    if (!noMonsterCtx(ctx.monsters, nx, ny, idx, ctx.occ)) continue;
    if (nx === target.x && ny === target.y) continue;

    const dist = manhattan({ x: nx, y: ny }, target);
    if (dist < bestDist) {
      bestDist = dist;
      bestPos = { x: nx, y: ny };
    }
  }

  if (!bestPos) return;
  ctx.occ.delete(`${x},${y}`);
  ctx.occ.add(`${bestPos.x},${bestPos.y}`);
  ctx.monsters[idx] = { ...monster, position: bestPos };
}

/** Move monster away from a target (flee or ranged retreat). Mutates ctx. */
function moveAwayFrom(ctx: TurnCtx, idx: number, threat: Vector2): void {
  const monster = ctx.monsters[idx];
  const { x, y } = monster.position;
  const phasing = monster.abilities.includes("phase-through-walls");
  const flying = monster.abilities.includes("flying");

  let bestPos: Vector2 | null = null;
  let bestDist = -Infinity;

  for (const d of ALL_DIRS) {
    const nx = x + d.x,
      ny = y + d.y;
    if (!canMoveTo(ctx.floor, nx, ny, phasing, flying)) continue;
    if (!noMonsterCtx(ctx.monsters, nx, ny, idx, ctx.occ)) continue;

    const dist = manhattan({ x: nx, y: ny }, threat);
    if (dist > bestDist) {
      bestDist = dist;
      bestPos = { x: nx, y: ny };
    }
  }

  if (!bestPos) return;
  ctx.occ.delete(`${x},${y}`);
  ctx.occ.add(`${bestPos.x},${bestPos.y}`);
  ctx.monsters[idx] = { ...monster, position: bestPos };
}

/** Move monster to stay at a preferred distance range from the target. Mutates ctx. */
function moveToRange(
  ctx: TurnCtx,
  idx: number,
  target: Vector2,
  minDist: number,
  maxDist: number,
): void {
  const monster = ctx.monsters[idx];
  const dist = manhattan(monster.position, target);

  if (dist < minDist) moveAwayFrom(ctx, idx, target);
  else if (dist > maxDist) moveToward(ctx, idx, target);
  // else: already in range, stay put
}

// ── Summoning ────────────────────────────────────────────────

const SUMMON_TYPE_MAP: Record<string, string[]> = {
  "summon-monster": ["giant-rat", "wild-dog", "goblin", "kobold"],
  "summon-undead": ["skeleton", "walking-corpse", "shadow"],
  "summon-devil": ["ice-devil", "spiked-devil", "horned-devil"],
  "summon-fire-giant": ["fire-giant"],
};

function spawnNearSummoner(
  ctx: TurnCtx,
  summonerIdx: number,
  ability: string,
): void {
  const summoner = ctx.monsters[summonerIdx];

  const summonedTemplateIds =
    SUMMON_TYPE_MAP[ability] ?? SUMMON_TYPE_MAP["summon-monster"];
  const existingSummoned = ctx.monsters.filter(
    (m, i) => i !== summonerIdx && summonedTemplateIds.includes(m.templateId),
  ).length;
  if (existingSummoned >= 3) return;

  const depth = ctx.state.currentFloor;
  const available = getMonstersForDepth(depth).filter((t) =>
    summonedTemplateIds.includes(t.id),
  );
  if (available.length === 0) return;

  const count = rollRange(1, 2);
  let spawned = 0;

  for (const d of ALL_DIRS) {
    if (spawned >= count) break;
    const nx = summoner.position.x + d.x;
    const ny = summoner.position.y + d.y;
    if (!walkable(ctx.floor, nx, ny)) continue;
    if (ctx.occ.has(`${nx},${ny}`)) continue;
    if (ctx.hero.position.x === nx && ctx.hero.position.y === ny) continue;

    const template = available[Math.floor(Math.random() * available.length)];
    const newMonster = createMonster(
      template,
      { x: nx, y: ny },
      depth,
      Math.random,
    );

    ctx.monsters.push(newMonster);
    ctx.occ.add(`${nx},${ny}`);
    spawned++;
  }

  if (spawned > 0) {
    addMsg(ctx, `${summoner.name} summons reinforcements!`, "important");
  }
}

// ── Ranged attack ────────────────────────────────────────────

/**
 * Handles a monster's ranged or spell attack on the hero.
 * Queues animations and applies damage.
 */
/** Ranged/spell attack. Mutates ctx (hero HP, messages, monsters for summon). */
function monsterRangedAttack(
  ctx: TurnCtx,
  monster: Monster,
  ability: string,
): void {
  const hero = ctx.hero;
  const dir = directionTo(monster.position, hero.position);
  const depth = ctx.state.currentFloor;

  // Helper to apply ranged damage
  const applyDmg = (dmg: number, msg: string) => {
    ctx.hero = { ...ctx.hero, hp: Math.max(0, ctx.hero.hp - dmg) };
    addMsg(ctx, msg);
  };

  // ── Spell bolts ──────────────────────────────────────────
  if (
    ability === "cast-fire-bolt" ||
    ability === "cast-cold-bolt" ||
    ability === "cast-lightning-bolt"
  ) {
    const spellId = ability.replace("cast-", "");
    const dmg = rollRange(4, 12) + Math.floor(depth / 2);
    const elem = spellId.replace("-bolt", "") as keyof typeof hero.resistances;
    const resist = (hero.resistances[elem] ?? 0) / 100;
    const finalDmg = Math.max(1, Math.round(dmg * (1 - resist)));
    queueAnimation(
      buildBoltAnimation(
        spellId,
        monster.position,
        dir,
        12,
        hero.position,
        ctx.floor,
      ),
    );
    applyDmg(
      finalDmg,
      `${monster.name} casts a ${spellId.replace("-", " ")} at you for ${finalDmg} damage!`,
    );
    return;
  }

  // ── Spell balls ──────────────────────────────────────────
  const ballMatch = ability.match(/^cast-(fire|cold|lightning)-ball$/);
  if (ballMatch) {
    const elem = ballMatch[1] as keyof typeof hero.resistances;
    const spellId = `${elem}-ball`;
    const dmg = rollRange(8, 20) + Math.floor(depth / 2);
    const resist = (hero.resistances[elem] ?? 0) / 100;
    const finalDmg = Math.max(1, Math.round(dmg * (1 - resist)));
    queueAnimation(
      buildBallAnimation(
        spellId,
        monster.position,
        dir,
        hero.position,
        ctx.floor,
      ),
    );
    applyDmg(
      finalDmg,
      `${monster.name} hurls a ${elem} ball at you for ${finalDmg} damage!`,
    );
    return;
  }

  // ── Physical ranged ──────────────────────────────────────
  if (ability === "throw-boulder") {
    const dmg = rollRange(6, 14);
    queueAnimation(
      buildBoltAnimation(
        "magic-arrow",
        monster.position,
        dir,
        10,
        hero.position,
        ctx.floor,
      ),
    );
    applyDmg(dmg, `${monster.name} hurls a boulder at you for ${dmg} damage!`);
    return;
  }

  if (ability === "tail-spikes") {
    const dmg = rollRange(4, 10);
    queueAnimation(
      buildBoltAnimation(
        "magic-arrow",
        monster.position,
        dir,
        8,
        hero.position,
        ctx.floor,
      ),
    );
    applyDmg(
      dmg,
      `${monster.name} fires tail spikes at you for ${dmg} damage!`,
    );
    return;
  }

  // ── AoE ball ─────────────────────────────────────────────
  if (ability === "throw-ice-ball") {
    const dmg = rollRange(6, 14);
    const resist = (hero.resistances.cold ?? 0) / 100;
    const finalDmg = Math.max(1, Math.round(dmg * (1 - resist)));
    queueAnimation(
      buildBallAnimation(
        "cold-ball",
        monster.position,
        dir,
        hero.position,
        ctx.floor,
      ),
    );
    applyDmg(
      finalDmg,
      `${monster.name} hurls an ice ball at you for ${finalDmg} damage!`,
    );
    return;
  }

  // ── Breath weapons ───────────────────────────────────────
  const breathMatch = ability.match(/^breath-(fire|cold|lightning|acid)$/);
  if (breathMatch) {
    const elem = breathMatch[1] as keyof typeof hero.resistances;
    const dmg = rollRange(8, 20) + Math.floor(depth / 2);
    const resist = (hero.resistances[elem] ?? 0) / 100;
    const finalDmg = Math.max(1, Math.round(dmg * (1 - resist)));
    const spellId =
      elem === "cold"
        ? "cold-bolt"
        : elem === "fire"
          ? "fire-bolt"
          : elem === "lightning"
            ? "lightning-bolt"
            : "acid-bolt";
    queueAnimation(
      buildBoltAnimation(
        spellId,
        monster.position,
        dir,
        12,
        hero.position,
        ctx.floor,
      ),
    );
    applyDmg(
      finalDmg,
      `${monster.name} breathes ${elem} at you for ${finalDmg} damage!`,
    );
    return;
  }

  // ── Summon abilities (used by summoner AI) ───────────────
  const summonMatch = ability.match(
    /^summon-(monster|undead|devil|fire-giant)$/,
  );
  if (summonMatch) {
    const floorIdx = ctx.monsters.findIndex((m) => m.id === monster.id);
    if (floorIdx < 0) return;
    spawnNearSummoner(ctx, floorIdx, ability);
  }
}

// ── On-hit ability processing ────────────────────────────────

/**
 * Process on-hit special abilities for a monster after melee damage is dealt.
 * Call this from combat.ts after monsterAttacksPlayer.
 */
export function processMonsterAbility(
  state: GameState,
  monster: Monster,
): GameState {
  let s = state;

  for (const ability of monster.abilities) {
    switch (ability) {
      case "poison": {
        const isPoisonImmune = Object.values(s.hero.equipment).some(
          (eq) =>
            eq &&
            ITEM_BY_ID[eq.templateId]?.uniqueAbility === "elemental-immunity",
        );
        if (!isPoisonImmune && Math.random() < 0.3) {
          const alreadyPoisoned = s.hero.activeEffects.some(
            (e) => e.id === "poisoned",
          );
          if (!alreadyPoisoned) {
            const effects = [
              ...s.hero.activeEffects,
              { id: "poisoned", name: "Poisoned", turnsRemaining: 5 },
            ];
            s = { ...s, hero: { ...s.hero, activeEffects: effects } };
            s = addMsgState(
              s,
              `${monster.name}'s attack poisons you!`,
              "important",
            );
          }
        }
        break;
      }

      case "drain-strength":
      case "drain-intelligence":
      case "drain-constitution":
      case "drain-dexterity": {
        const drainResist = (s.hero.resistances.drain ?? 0) / 100;
        if (drainResist >= 1) break; // fully immune
        if (Math.random() < 0.25 * (1 - drainResist)) {
          const attr = ability.replace(
            "drain-",
            "",
          ) as keyof typeof s.hero.attributes;
          const cur = s.hero.attributes[attr];
          if (cur > 10) {
            const attrs = { ...s.hero.attributes, [attr]: cur - 1 };
            let hero = recomputeDerivedStats(
              { ...s.hero, attributes: attrs },
              s.statueUpgrades,
            );
            s = { ...s, hero };
            s = addMsgState(
              s,
              `${monster.name} drains your ${attr}!`,
              "important",
            );
          }
        }
        break;
      }

      case "drain-level": {
        const drainResist = (s.hero.resistances.drain ?? 0) / 100;
        if (drainResist >= 1) break;
        if (Math.random() < 0.15 * (1 - drainResist)) {
          const newLevel = Math.max(1, s.hero.level - 1);
          const newXp = xpRequiredForLevel(newLevel, s.difficulty) || 0;
          let hero = recomputeDerivedStats(
            {
              ...s.hero,
              level: newLevel,
              xp: newXp,
            },
            s.statueUpgrades,
          );
          s = { ...s, hero };
          s = addMsgState(
            s,
            `${monster.name} drains your life force! You lose a level!`,
            "important",
          );
        }
        break;
      }

      case "drain-hp": {
        const drainResist = (s.hero.resistances.drain ?? 0) / 100;
        if (drainResist >= 1) break;
        if (Math.random() < 0.4 * (1 - drainResist)) {
          // Monster drains hero HP and heals itself
          const heal = rollRange(
            1,
            Math.max(1, Math.floor(monster.maxHp * 0.1)),
          );
          const newHeroHp = Math.max(0, s.hero.hp - heal);
          s = { ...s, hero: { ...s.hero, hp: newHeroHp } };
          const floorKey = `${s.currentDungeon}-${s.currentFloor}`;
          const floor = s.floors[floorKey];
          if (floor) {
            const idx = floor.monsters.findIndex((m) => m.id === monster.id);
            if (idx >= 0) {
              const m = floor.monsters[idx];
              const newHp = Math.min(m.maxHp, m.hp + heal);
              s = updateMonsterState(s, floorKey, idx, { ...m, hp: newHp });
            }
          }
          s = addMsgState(
            s,
            `${monster.name} drains ${heal} HP from you! (${newHeroHp}/${s.hero.maxHp} HP)`,
          );
        }
        break;
      }

      case "steal-gold": {
        if (Math.random() < 0.5 && s.hero.gold > 0) {
          const stolen = Math.min(s.hero.gold, rollRange(10, 50));
          s = { ...s, hero: { ...s.hero, gold: s.hero.gold - stolen } };
          s = addMsgState(
            s,
            `${monster.name} steals ${stolen} gold!`,
            "important",
          );
        }
        break;
      }

      case "cold-touch":
      case "fire-touch":
      case "acid-touch": {
        if (Math.random() < 0.5) {
          const elem = ability.replace(
            "-touch",
            "",
          ) as keyof typeof s.hero.resistances;
          const rawDmg = rollRange(2, 8);
          const resist = (s.hero.resistances[elem] ?? 0) / 100;
          const dmg = Math.max(1, Math.round(rawDmg * (1 - resist)));
          const newHp = Math.max(0, s.hero.hp - dmg);
          s = { ...s, hero: { ...s.hero, hp: newHp } };
          s = addMsgState(
            s,
            `${monster.name}'s ${elem} touch deals ${dmg} extra damage!`,
          );
        }
        break;
      }

      case "paralyze": {
        if (Math.random() < 0.2) {
          const already = s.hero.activeEffects.some(
            (e) => e.id === "paralyzed",
          );
          if (!already) {
            const effects = [
              ...s.hero.activeEffects,
              { id: "paralyzed", name: "Paralyzed", turnsRemaining: 3 },
            ];
            s = { ...s, hero: { ...s.hero, activeEffects: effects } };
            s = addMsgState(
              s,
              `The ${monster.name}'s attack paralyzes you!`,
              "important",
            );
          }
        }
        break;
      }

      case "blind": {
        if (Math.random() < 0.25) {
          const already = s.hero.activeEffects.some((e) => e.id === "blinded");
          if (!already) {
            const effects = [
              ...s.hero.activeEffects,
              { id: "blinded", name: "Blinded", turnsRemaining: 8 },
            ];
            s = { ...s, hero: { ...s.hero, activeEffects: effects } };
            s = addMsgState(s, `The ${monster.name} blinds you!`, "important");
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

// ── Combat bridge ───────────────────────────────────────────

/** Run monsterAttacksPlayer through ctx, syncing state before/after. */
function ctxMeleeAttack(ctx: TurnCtx, monster: Monster): void {
  const s = monsterAttacksPlayer(ctxToState(ctx), monster);
  stateToCtx(ctx, s);
}

// ── Per-AI-type turn logic ───────────────────────────────────

function processMelee(ctx: TurnCtx, idx: number, detectRange: number): void {
  let monster = ctx.monsters[idx];
  const hero = ctx.hero;
  const dist = chebyshev(monster.position, hero.position);

  // Process alert abilities (e.g. War Drummer)
  if (
    monster.abilities.includes("alert-radius") ||
    monster.abilities.includes("alert-floor")
  ) {
    processAlertAbilities(ctx, idx, monster, detectRange);
  }

  // Tick flee timer
  if (monster.fleeing > 0) {
    ctx.monsters[idx] = { ...monster, fleeing: monster.fleeing - 1 };
    moveAwayFrom(ctx, idx, hero.position);
    return;
  }

  // Charge ability: rush the hero from 2-4 tiles away in a straight line
  if (dist >= 2 && dist <= 4 && monster.abilities.includes("charge")) {
    const dx = hero.position.x - monster.position.x;
    const dy = hero.position.y - monster.position.y;
    const isLine = dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy);
    if (isLine && hasLineOfSight(ctx.floor, monster.position, hero.position)) {
      const stepX = dx === 0 ? 0 : dx > 0 ? 1 : -1;
      const stepY = dy === 0 ? 0 : dy > 0 ? 1 : -1;
      const chargePos = {
        x: hero.position.x - stepX,
        y: hero.position.y - stepY,
      };
      if (
        walkable(ctx.floor, chargePos.x, chargePos.y) &&
        noMonsterCtx(ctx.monsters, chargePos.x, chargePos.y, idx, ctx.occ)
      ) {
        // Move monster to charge position
        ctx.occ.delete(`${monster.position.x},${monster.position.y}`);
        ctx.occ.add(`${chargePos.x},${chargePos.y}`);
        ctx.monsters[idx] = { ...monster, position: chargePos };
        addMsg(ctx, `The ${monster.name} charges!`, "combat");
        // Attack with a temporary boosted copy (not written back)
        const boosted = {
          ...monster,
          position: chargePos,
          damage: [
            Math.floor(monster.damage[0] * 1.5),
            Math.floor(monster.damage[1] * 1.5),
          ] as [number, number],
        };
        ctxMeleeAttack(ctx, boosted);
        return;
      }
    }
  }

  if (dist <= 1) {
    ctxMeleeAttack(ctx, monster);
    // Check flee trigger at low HP (only once per monster)
    // Re-find by ID since thorns kills may have shifted indices
    const newIdx = ctx.monsters.findIndex((m) => m.id === monster.id);
    if (newIdx >= 0) {
      const updatedMonster = ctx.monsters[newIdx];
      if (
        updatedMonster &&
        !updatedMonster.hasFled &&
        updatedMonster.hp / updatedMonster.maxHp <= 0.25 &&
        Math.random() < 0.4
      ) {
        const fleeTurns = rollRange(5, 10);
        ctx.monsters[newIdx] = {
          ...updatedMonster,
          fleeing: fleeTurns,
          hasFled: true,
        };
      }
    }
    return;
  }

  const inRange = manhattan(monster.position, hero.position) <= detectRange;
  if (inRange || monster.alerted) {
    // Low HP flee check before moving (only once per monster)
    if (
      !monster.hasFled &&
      monster.hp / monster.maxHp <= 0.25 &&
      Math.random() < 0.4
    ) {
      const fleeTurns = rollRange(5, 10);
      ctx.monsters[idx] = {
        ...monster,
        fleeing: fleeTurns,
        hasFled: true,
      };
      moveAwayFrom(ctx, idx, hero.position);
      return;
    }
    moveToward(ctx, idx, hero.position);
  }
}

function processRanged(ctx: TurnCtx, idx: number, detectRange: number): void {
  const monster = ctx.monsters[idx];
  const hero = ctx.hero;
  const dist = manhattan(monster.position, hero.position);
  const cDist = chebyshev(monster.position, hero.position);

  // Silence rift modifier: suppress cast/summon spells only
  const silenced = getModifierFlags(ctx.state).silence;

  const rangedAbilities = monster.abilities.filter(
    (a) =>
      (a.startsWith("cast-") ? !silenced : true) &&
      (a.startsWith("cast-") ||
        a.startsWith("throw-") ||
        a.startsWith("tail-") ||
        a.startsWith("breath-")),
  );

  const hasRanged = rangedAbilities.length > 0;
  const los = hasLineOfSight(ctx.floor, monster.position, hero.position);

  // Melee fallback when adjacent
  if (cDist <= 1) {
    ctxMeleeAttack(ctx, monster);
    return;
  }

  // Ranged attack if in range and LOS — stand and fire, no retreat
  if (hasRanged && los && dist <= 8) {
    const ability =
      rangedAbilities[Math.floor(Math.random() * rangedAbilities.length)];
    monsterRangedAttack(ctx, monster, ability);
    return;
  }

  // Close distance to get into firing range
  if (dist <= detectRange || monster.alerted) {
    moveToward(ctx, idx, hero.position);
  }
}

function processCaster(ctx: TurnCtx, idx: number, detectRange: number): void {
  const monster = ctx.monsters[idx];
  const hero = ctx.hero;
  const dist = manhattan(monster.position, hero.position);
  const cDist = chebyshev(monster.position, hero.position);

  // Silence rift modifier: suppress cast spells only
  const silenced = getModifierFlags(ctx.state).silence;

  const spellAbilities = silenced
    ? []
    : monster.abilities.filter((a) => a.startsWith("cast-"));
  const los = hasLineOfSight(ctx.floor, monster.position, hero.position);

  if (cDist <= 1) {
    ctxMeleeAttack(ctx, monster);
    return;
  }

  if (spellAbilities.length > 0 && los && dist >= 4 && dist <= 8) {
    // 30% chance to move instead of casting (unpredictable)
    if (Math.random() < 0.3) {
      moveToRange(ctx, idx, hero.position, 4, 8);
      return;
    }
    const spell =
      spellAbilities[Math.floor(Math.random() * spellAbilities.length)];
    monsterRangedAttack(ctx, monster, spell);
    return;
  }

  if (dist <= detectRange || monster.alerted) {
    moveToRange(ctx, idx, hero.position, 4, 8);
  }
}

function processThief(ctx: TurnCtx, idx: number, detectRange: number): void {
  let monster = ctx.monsters[idx];
  const hero = ctx.hero;
  const dist = chebyshev(monster.position, hero.position);

  // Tick flee timer
  if (monster.fleeing > 0) {
    // 30% chance to teleport away while fleeing
    if (Math.random() < 0.3) {
      for (let tries = 0; tries < 100; tries++) {
        const rx = Math.floor(Math.random() * ctx.floor.width);
        const ry = Math.floor(Math.random() * ctx.floor.height);
        if (
          walkable(ctx.floor, rx, ry) &&
          !ctx.occ.has(`${rx},${ry}`) &&
          !(rx === hero.position.x && ry === hero.position.y)
        ) {
          ctx.occ.delete(`${monster.position.x},${monster.position.y}`);
          ctx.occ.add(`${rx},${ry}`);
          ctx.monsters[idx] = {
            ...monster,
            fleeing: monster.fleeing - 1,
            position: { x: rx, y: ry },
          };
          addMsg(ctx, `The ${monster.name} vanishes!`, "important");
          return;
        }
      }
    }
    ctx.monsters[idx] = { ...monster, fleeing: monster.fleeing - 1 };
    moveAwayFrom(ctx, idx, hero.position);
    return;
  }

  if (dist <= 1) {
    const prevGold = ctx.hero.gold;
    ctxMeleeAttack(ctx, monster);
    // After stealing (handled by processMonsterAbility 'steal-gold'), flee
    if (ctx.hero.gold < prevGold) {
      const mi = ctx.monsters.findIndex((m) => m.id === monster.id);
      if (mi >= 0 && !ctx.monsters[mi].hasFled) {
        const fleeTurns = rollRange(8, 12);
        ctx.monsters[mi] = {
          ...ctx.monsters[mi],
          fleeing: fleeTurns,
          hasFled: true,
        };
      }
    }
    return;
  }

  if (
    manhattan(monster.position, hero.position) <= detectRange ||
    monster.alerted
  ) {
    moveToward(ctx, idx, hero.position);
  }
}

function processSummoner(ctx: TurnCtx, idx: number, detectRange: number): void {
  const monster = ctx.monsters[idx];
  const hero = ctx.hero;
  const dist = manhattan(monster.position, hero.position);
  const cDist = chebyshev(monster.position, hero.position);
  const los = hasLineOfSight(ctx.floor, monster.position, hero.position);

  // Silence rift modifier: suppress cast/summon spells only
  const silenced = getModifierFlags(ctx.state).silence;

  // Summon every 4-5 turns
  const summonAbilities = silenced
    ? []
    : monster.abilities.filter((a) => a.startsWith("summon-"));
  if (summonAbilities.length > 0 && dist <= 12 && ctx.state.turn % 5 === 0) {
    const ability =
      summonAbilities[Math.floor(Math.random() * summonAbilities.length)];
    spawnNearSummoner(ctx, idx, ability);
    // Also try a ranged attack this turn (throw/breath still work under silence)
    const rangedAbilities = monster.abilities.filter(
      (a) =>
        (!silenced && a.startsWith("cast-")) ||
        a.startsWith("throw-") ||
        a.startsWith("breath-"),
    );
    if (rangedAbilities.length > 0 && los && dist <= 8) {
      const ability2 =
        rangedAbilities[Math.floor(Math.random() * rangedAbilities.length)];
      // Re-find monster since summoning may have shifted things
      const mi = ctx.monsters.findIndex((m) => m.id === monster.id);
      if (mi >= 0) monsterRangedAttack(ctx, ctx.monsters[mi], ability2);
    }
    return;
  }

  // Ranged attack if in range and LOS
  const rangedAbilities = monster.abilities.filter(
    (a) =>
      (!silenced && a.startsWith("cast-")) ||
      a.startsWith("throw-") ||
      a.startsWith("breath-"),
  );
  if (rangedAbilities.length > 0 && los && dist <= 8) {
    const ability =
      rangedAbilities[Math.floor(Math.random() * rangedAbilities.length)];
    monsterRangedAttack(ctx, monster, ability);
    return;
  }

  // Stay 5-8 tiles from hero
  if (cDist <= 1) {
    ctxMeleeAttack(ctx, monster);
    return;
  }

  if (dist <= detectRange || monster.alerted) {
    moveToRange(ctx, idx, hero.position, 5, 8);
  }
}

// ── Stationary AI ───────────────────────────────────────────

function processStationary(
  ctx: TurnCtx,
  idx: number,
  detectRange: number,
): void {
  const monster = ctx.monsters[idx];
  processAlertAbilities(ctx, idx, monster, detectRange);
}

/**
 * Alert abilities: alert-floor alerts ALL monsters on the floor,
 * alert-radius alerts monsters within 10 Manhattan distance.
 */
function processAlertAbilities(
  ctx: TurnCtx,
  idx: number,
  monster: Monster,
  detectRange?: number,
): void {
  const hero = ctx.hero;
  const dist = manhattan(monster.position, hero.position);
  if (detectRange === undefined) detectRange = getDetectRange(ctx.state);

  if (dist > detectRange) return;
  if (!hasLineOfSight(ctx.floor, monster.position, hero.position)) return;

  // Already shrieked/drummed — don't fire again
  if (monster.alerted) return;

  if (monster.abilities.includes("alert-floor")) {
    for (let i = 0; i < ctx.monsters.length; i++) {
      const m = ctx.monsters[i];
      if (!m.alerted && m.hp > 0) ctx.monsters[i] = { ...m, alerted: true };
    }
    addMsg(
      ctx,
      "The Shrieker lets out a piercing shriek! You hear movement in the darkness...",
      "important",
    );
  }

  if (monster.abilities.includes("alert-radius")) {
    for (let i = 0; i < ctx.monsters.length; i++) {
      const m = ctx.monsters[i];
      if (i === idx) {
        ctx.monsters[i] = { ...m, alerted: true };
      } else if (
        !m.alerted &&
        m.hp > 0 &&
        manhattan(m.position, monster.position) <= 10
      ) {
        ctx.monsters[i] = { ...m, alerted: true };
      }
    }
    addMsg(
      ctx,
      "The War Drummer beats a frenzied rhythm! Something stirs nearby...",
      "important",
    );
  }
}

// ── Main entry point ─────────────────────────────────────────

/**
 * Process all monster turns on the current floor.
 * Batches all mutations into a single state update at the end.
 */
export function processAllMonsterTurns(state: GameState): GameState {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  const detectRange = getDetectRange(state);

  // Build mutable working copies
  let monsters = [...floor.monsters];

  // Packhunter rift modifier: when any monster spots the player, alert all within 10 tiles
  const packhunter = getModifierFlags(state).packhunter;
  if (packhunter) {
    const spotted = monsters.some(
      (m) =>
        m.hp > 0 &&
        !m.sleeping &&
        manhattan(m.position, state.hero.position) <= detectRange &&
        hasLineOfSight(floor, m.position, state.hero.position),
    );
    if (spotted) {
      for (let i = 0; i < monsters.length; i++) {
        const m = monsters[i];
        if (
          !m.alerted &&
          m.hp > 0 &&
          !m.sleeping &&
          manhattan(m.position, state.hero.position) <= 10
        ) {
          monsters[i] = { ...m, alerted: true };
        }
      }
    }
  }

  // Initialize mutable context
  const ctx: TurnCtx = {
    monsters,
    messages: [...state.messages],
    hero: state.hero,
    items: [...floor.items],
    decals: [...floor.decals],
    floor,
    floorKey,
    state,
    occ: buildOccupied(monsters),
  };

  // Collect IDs before processing (array may grow during iteration via summons)
  const monsterIds = monsters.map((m) => m.id);
  // Build id→index map for O(1) lookup
  let idxMap = new Map<string, number>();
  let idxMapLen = -1;
  const getIdx = (id: string): number => {
    if (ctx.monsters.length !== idxMapLen) {
      idxMap.clear();
      for (let i = 0; i < ctx.monsters.length; i++)
        idxMap.set(ctx.monsters[i].id, i);
      idxMapLen = ctx.monsters.length;
    }
    return idxMap.get(id) ?? -1;
  };

  for (const mId of monsterIds) {
    const idx = getIdx(mId);
    if (idx === -1) continue; // monster died

    const monster = ctx.monsters[idx];
    if (monster.hp <= 0 || monster.sleeping) continue;
    if (monster.slowed && state.turn % 2 === 0) continue; // skip every other turn

    switch (monster.ai) {
      case "melee":
        processMelee(ctx, idx, detectRange);
        break;
      case "ranged":
        processRanged(ctx, idx, detectRange);
        break;
      case "caster":
        processCaster(ctx, idx, detectRange);
        break;
      case "thief":
        processThief(ctx, idx, detectRange);
        break;
      case "summoner":
        processSummoner(ctx, idx, detectRange);
        break;
      case "stationary":
        processStationary(ctx, idx, detectRange);
        break;
    }

    // Regeneration: monsters with 'regenerate' ability recover 2 HP per turn
    const mIdx = getIdx(mId);
    if (mIdx >= 0) {
      const m = ctx.monsters[mIdx];
      if (m.abilities.includes("regenerate") && m.hp < m.maxHp && m.hp > 0) {
        ctx.monsters[mIdx] = { ...m, hp: Math.min(m.maxHp, m.hp + 2) };
      }
    }

    if (ctx.hero.hp <= 0) break;
  }

  // Produce single immutable state
  const newFloor: Floor = {
    ...floor,
    monsters: ctx.monsters,
    items: ctx.items,
    decals: ctx.decals,
  };
  return {
    ...state,
    hero: ctx.hero,
    messages: ctx.messages,
    floors: { ...state.floors, [floorKey]: newFloor },
  };
}
