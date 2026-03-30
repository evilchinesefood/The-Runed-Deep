import type {
  GameState,
  Item,
  Message,
  Hero,
  Direction,
} from "../../core/types";
import { recomputeDerivedStats } from "../character/derived-stats";
import { ITEM_BY_ID } from "../../data/items";
import { castSpell } from "../spells/casting";
import { teleportToTown } from "../../core/actions";
import { showGameToast } from "../../ui/GameToast";

export function processUseItem(state: GameState, itemId: string): GameState {
  const idx = state.hero.inventory.findIndex((i) => i.id === itemId);
  if (idx === -1) return state;

  const item = state.hero.inventory[idx];

  switch (item.category) {
    case "potion":
      return usePotion(state, item, idx);
    case "scroll":
      return useScroll(state, item, idx);
    case "spellbook":
      return useSpellbook(state, item, idx);
    case "wand":
      return useWand(state, item, idx);
    default:
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            text: `You can't use ${item.name}.`,
            severity: "system" as const,
            turn: state.turn,
          },
        ],
      };
  }
}

function removeFromInventory(hero: Hero, idx: number): Hero {
  const inv = [...hero.inventory];
  inv.splice(idx, 1);
  return { ...hero, inventory: inv };
}

function usePotion(state: GameState, item: Item, idx: number): GameState {
  const messages: Message[] = [];
  let hero = { ...state.hero };
  const tid = item.templateId;

  if (tid.startsWith("potion-heal")) {
    const pct = item.properties["healPct"] ?? 0;
    const flat = item.properties["healAmount"] ?? 0;
    const heal = Math.max(flat, Math.floor(hero.maxHp * pct));
    const oldHp = hero.hp;
    hero = { ...hero, hp: Math.min(hero.maxHp, hero.hp + heal) };
    const healed = hero.hp - oldHp;
    messages.push({
      text: `You drink the ${item.name}. Healed ${healed} HP. (${hero.hp}/${hero.maxHp})`,
      severity: "important",
      turn: state.turn,
    });
  } else if (tid === "potion-gain-str") {
    hero = {
      ...hero,
      attributes: {
        ...hero.attributes,
        strength: hero.attributes.strength + 1,
      },
    };
    hero = recomputeDerivedStats(hero);
    showGameToast('+1 Strength!', 'success');
    messages.push({
      text: "You feel stronger! (+1 Strength)",
      severity: "important",
      turn: state.turn,
    });
  } else if (tid === "potion-gain-int") {
    hero = {
      ...hero,
      attributes: {
        ...hero.attributes,
        intelligence: hero.attributes.intelligence + 1,
      },
    };
    hero = recomputeDerivedStats(hero);
    showGameToast('+1 Intelligence!', 'success');
    messages.push({
      text: "You feel smarter! (+1 Intelligence)",
      severity: "important",
      turn: state.turn,
    });
  } else if (tid === "potion-gain-con") {
    hero = {
      ...hero,
      attributes: {
        ...hero.attributes,
        constitution: hero.attributes.constitution + 1,
      },
    };
    hero = recomputeDerivedStats(hero);
    showGameToast('+1 Constitution!', 'success');
    messages.push({
      text: "You feel healthier! (+1 Constitution)",
      severity: "important",
      turn: state.turn,
    });
  } else if (tid === "potion-gain-dex") {
    hero = {
      ...hero,
      attributes: {
        ...hero.attributes,
        dexterity: hero.attributes.dexterity + 1,
      },
    };
    hero = recomputeDerivedStats(hero);
    showGameToast('+1 Dexterity!', 'success');
    messages.push({
      text: "You feel more agile! (+1 Dexterity)",
      severity: "important",
      turn: state.turn,
    });
  } else {
    messages.push({
      text: `You drink the ${item.name}. Nothing happens.`,
      severity: "normal",
      turn: state.turn,
    });
  }

  hero = removeFromInventory(hero, idx);

  return {
    ...state,
    hero,
    messages: [...state.messages, ...messages],
    turn: state.turn + 1,
  };
}

function useScroll(state: GameState, item: Item, idx: number): GameState {
  const messages: Message[] = [];
  let hero = { ...state.hero };

  if (item.templateId === "scroll-teleport") {
    const result = teleportHero(state, hero, messages);
    hero = result.hero;
    state = result.state;
    hero = removeFromInventory(hero, idx);
    return { ...state, hero, messages: [...state.messages, ...messages], turn: state.turn + 1 };
  } else if (item.templateId === "scroll-rune-of-return") {
    if (state.currentDungeon === "town") {
      hero = removeFromInventory(hero, idx);
      messages.push({
        text: "You are already in town.",
        severity: "system",
        turn: state.turn,
      });
      return { ...state, hero, messages: [...state.messages, ...messages] };
    } else {
      hero = removeFromInventory(hero, idx);
      state = teleportToTown({ ...state, hero });
      return { ...state, screen: "game", turn: state.turn + 1 };
    }
  } else {
    messages.push({
      text: `You read the ${item.name}. Nothing happens.`,
      severity: "normal",
      turn: state.turn,
    });
  }

  hero = removeFromInventory(hero, idx);

  return {
    ...state,
    hero,
    messages: [...state.messages, ...messages],
    turn: state.turn + 1,
  };
}

/** Remove curse from the first cursed equipped item. */
export function removeCurseFromFirst(
  hero: Hero,
  messages: Message[],
  turn: number,
): Hero {
  const eqSlots = Object.keys(
    hero.equipment,
  ) as (keyof typeof hero.equipment)[];
  for (const slot of eqSlots) {
    const eq = hero.equipment[slot];
    if (eq && eq.cursed) {
      const uncursed = { ...eq, cursed: false, identified: true };
      messages.push({
        text: `The curse on ${uncursed.name} has been lifted!`,
        severity: "important",
        turn,
      });
      return { ...hero, equipment: { ...hero.equipment, [slot]: uncursed } };
    }
  }
  messages.push({ text: "No cursed items found.", severity: "system", turn });
  return hero;
}

function useSpellbook(state: GameState, item: Item, idx: number): GameState {
  const tpl = ITEM_BY_ID[item.templateId];
  const spellId = tpl?.spellId;
  if (!spellId) {
    return {
      ...state,
      messages: [
        ...state.messages,
        {
          text: `${item.name} contains no spell.`,
          severity: "system" as const,
          turn: state.turn,
        },
      ],
    };
  }
  if (state.hero.knownSpells.includes(spellId)) {
    const name = spellId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    showGameToast(`Already learned ${name}`, 'warning');
    return {
      ...state,
      messages: [
        ...state.messages,
        {
          text: `You already know ${name}.`,
          severity: "system" as const,
          turn: state.turn,
        },
      ],
    };
  }
  const spellName = spellId
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const newHotkeys =
    state.hero.spellHotkeys.length < 5
      ? [...state.hero.spellHotkeys, spellId]
      : state.hero.spellHotkeys;
  const hero = removeFromInventory(
    {
      ...state.hero,
      knownSpells: [...state.hero.knownSpells, spellId],
      spellHotkeys: newHotkeys,
    },
    idx,
  );
  showGameToast(`Learned ${spellName}!`, 'success');
  return {
    ...state,
    hero,
    messages: [
      ...state.messages,
      {
        text: `You learn ${spellName}!`,
        severity: "important" as const,
        turn: state.turn,
      },
    ],
    turn: state.turn + 1,
  };
}

function useWand(state: GameState, item: Item, idx: number): GameState {
  const tpl = ITEM_BY_ID[item.templateId];
  const spellId = tpl?.spellId;
  if (!spellId) {
    return {
      ...state,
      messages: [
        ...state.messages,
        {
          text: `${item.name} does nothing.`,
          severity: "system" as const,
          turn: state.turn,
        },
      ],
    };
  }
  const charges = item.properties["charges"] ?? 0;
  if (charges <= 0) {
    return {
      ...state,
      messages: [
        ...state.messages,
        {
          text: `The wand is depleted.`,
          severity: "system" as const,
          turn: state.turn,
        },
      ],
    };
  }

  // Decrement charges on the item
  const updatedItem = {
    ...item,
    properties: { ...item.properties, charges: charges - 1 },
  };
  const inv = [...state.hero.inventory];
  inv[idx] = updatedItem;
  let s: GameState = { ...state, hero: { ...state.hero, inventory: inv } };

  // Find direction toward nearest visible monster
  const dir = findNearestMonsterDirection(s);

  // Cast the spell — restore MP temporarily since wands don't use MP
  const savedMp = s.hero.mp;
  s = {
    ...s,
    hero: {
      ...s.hero,
      mp: 9999,
      knownSpells: [...s.hero.knownSpells, spellId],
    },
  };
  s = castSpell(s, spellId, dir ?? "E");
  // Restore MP and knownSpells (remove wand spell if it wasn't already known)
  const wasKnown = state.hero.knownSpells.includes(spellId);
  const spells = wasKnown
    ? s.hero.knownSpells
    : s.hero.knownSpells.filter((sp) => sp !== spellId);
  s = { ...s, hero: { ...s.hero, mp: savedMp, knownSpells: spells } };

  s = {
    ...s,
    messages: [
      ...s.messages,
      {
        text: `You zap the wand! (${charges - 1} charges remaining)`,
        severity: "important" as const,
        turn: s.turn,
      },
    ],
  };
  return s;
}

function findNearestMonsterDirection(state: GameState): Direction | undefined {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return undefined;
  const hero = state.hero;
  let best: { dist: number; dir: Direction } | null = null;
  for (const m of floor.monsters) {
    if (m.hp <= 0) continue;
    const dx = m.position.x - hero.position.x;
    const dy = m.position.y - hero.position.y;
    const dist = Math.abs(dx) + Math.abs(dy);
    if (!best || dist < best.dist) {
      const dir = vecToDirection(dx, dy);
      if (dir) best = { dist, dir };
    }
  }
  return best?.dir;
}

function vecToDirection(dx: number, dy: number): Direction | undefined {
  if (dx === 0 && dy === 0) return undefined;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  if (angle >= -22.5 && angle < 22.5) return "E";
  if (angle >= 22.5 && angle < 67.5) return "SE";
  if (angle >= 67.5 && angle < 112.5) return "S";
  if (angle >= 112.5 && angle < 157.5) return "SW";
  if (angle >= 157.5 || angle < -157.5) return "W";
  if (angle >= -157.5 && angle < -112.5) return "NW";
  if (angle >= -112.5 && angle < -67.5) return "N";
  return "NE";
}

function teleportHero(
  state: GameState,
  hero: Hero,
  messages: Message[],
): { hero: Hero; state: GameState } {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return { hero, state };

  for (let tries = 0; tries < 200; tries++) {
    const x = Math.floor(Math.random() * floor.width);
    const y = Math.floor(Math.random() * floor.height);
    const tile = floor.tiles[y]?.[x];
    if (
      tile?.walkable &&
      !floor.monsters.find((m) => m.position.x === x && m.position.y === y)
    ) {
      hero = { ...hero, position: { x, y } };
      messages.push({
        text: "You read the scroll and teleport!",
        severity: "important",
        turn: state.turn,
      });
      return { hero, state };
    }
  }
  return { hero, state };
}
