import type { GameState, Item, Message, Hero } from "../../core/types";
import { recomputeDerivedStats } from "../character/derived-stats";
import { getDifficultyConfig } from "../../data/difficulty";
import { ITEM_BY_ID } from "../../data/items";
import { showGameToast } from "../../ui/GameToast";

export function processUseItem(state: GameState, itemId: string): GameState {
  const idx = state.hero.inventory.findIndex((i) => i.id === itemId);
  if (idx === -1) return state;

  const item = state.hero.inventory[idx];

  switch (item.category) {
    case "potion":
      return usePotion(state, item, idx);
    case "spellbook":
      return useSpellbook(state, item, idx);
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
    const mult = getDifficultyConfig(state.difficulty).healingMult;
    const heal = Math.max(
      Math.round(flat * mult),
      Math.floor(hero.maxHp * pct * mult),
    );
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
    showGameToast("+1 Strength!", "success");
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
    showGameToast("+1 Intelligence!", "success");
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
    showGameToast("+1 Constitution!", "success");
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
    showGameToast("+1 Dexterity!", "success");
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
    const name = spellId
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    showGameToast(`Already learned ${name}`, "warning");
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
  showGameToast(`Learned ${spellName}!`, "success");
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

