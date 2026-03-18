import type { GameState, Item, Message, Hero } from '../../core/types';
import { recomputeDerivedStats } from '../character/derived-stats';

export function processUseItem(state: GameState, itemId: string): GameState {
  const idx = state.hero.inventory.findIndex(i => i.id === itemId);
  if (idx === -1) return state;

  const item = state.hero.inventory[idx];

  switch (item.category) {
    case 'potion':
      return usePotion(state, item, idx);
    case 'scroll':
      return useScroll(state, item, idx);
    default:
      return {
        ...state,
        messages: [...state.messages, {
          text: `You can't use ${item.name}.`,
          severity: 'system' as const,
          turn: state.turn,
        }],
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

  if (tid.startsWith('potion-heal')) {
    const pct = item.properties['healPct'] ?? 0;
    const flat = item.properties['healAmount'] ?? 0;
    const heal = Math.max(flat, Math.floor(hero.maxHp * pct));
    const oldHp = hero.hp;
    hero = { ...hero, hp: Math.min(hero.maxHp, hero.hp + heal) };
    const healed = hero.hp - oldHp;
    messages.push({
      text: `You drink the ${item.name}. Healed ${healed} HP. (${hero.hp}/${hero.maxHp})`,
      severity: 'important',
      turn: state.turn,
    });
  } else if (tid === 'potion-gain-str') {
    hero = { ...hero, attributes: { ...hero.attributes, strength: hero.attributes.strength + 1 } };
    hero = recomputeDerivedStats(hero);
    messages.push({ text: 'You feel stronger! (+1 Strength)', severity: 'important', turn: state.turn });
  } else if (tid === 'potion-gain-int') {
    hero = { ...hero, attributes: { ...hero.attributes, intelligence: hero.attributes.intelligence + 1 } };
    hero = recomputeDerivedStats(hero);
    messages.push({ text: 'You feel smarter! (+1 Intelligence)', severity: 'important', turn: state.turn });
  } else if (tid === 'potion-gain-con') {
    hero = { ...hero, attributes: { ...hero.attributes, constitution: hero.attributes.constitution + 1 } };
    hero = recomputeDerivedStats(hero);
    messages.push({ text: 'You feel healthier! (+1 Constitution)', severity: 'important', turn: state.turn });
  } else if (tid === 'potion-gain-dex') {
    hero = { ...hero, attributes: { ...hero.attributes, dexterity: hero.attributes.dexterity + 1 } };
    hero = recomputeDerivedStats(hero);
    messages.push({ text: 'You feel more agile! (+1 Dexterity)', severity: 'important', turn: state.turn });
  } else {
    messages.push({ text: `You drink the ${item.name}. Nothing happens.`, severity: 'normal', turn: state.turn });
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

  if (item.templateId === 'scroll-identify') {
    hero = identifyFirstUnknown(hero, messages, state.turn);
  } else if (item.templateId === 'scroll-teleport') {
    const result = teleportHero(state, hero, messages);
    hero = result.hero;
    state = result.state;
  } else if (item.templateId === 'scroll-remove-curse') {
    hero = removeCurseFromFirst(hero, messages, state.turn);
  } else {
    messages.push({ text: `You read the ${item.name}. Nothing happens.`, severity: 'normal', turn: state.turn });
  }

  hero = removeFromInventory(hero, idx);

  return {
    ...state,
    hero,
    messages: [...state.messages, ...messages],
    turn: state.turn + 1,
  };
}

/** Identify the first unidentified item in inventory or equipment. */
export function identifyFirstUnknown(hero: Hero, messages: Message[], turn: number): Hero {
  // Check inventory first
  const unidIdx = hero.inventory.findIndex(i => !i.identified);
  if (unidIdx !== -1) {
    const inv = [...hero.inventory];
    const identified = { ...inv[unidIdx], identified: true };
    inv[unidIdx] = identified;
    messages.push({ text: `Identified: ${identified.name}!`, severity: 'important', turn });
    return { ...hero, inventory: inv };
  }

  // Check equipment
  const eqSlots = Object.keys(hero.equipment) as (keyof typeof hero.equipment)[];
  for (const slot of eqSlots) {
    const eq = hero.equipment[slot];
    if (eq && !eq.identified) {
      const identified = { ...eq, identified: true };
      messages.push({ text: `Identified: ${identified.name}!`, severity: 'important', turn });
      return { ...hero, equipment: { ...hero.equipment, [slot]: identified } };
    }
  }

  messages.push({ text: 'Nothing to identify.', severity: 'system', turn });
  return hero;
}

/** Remove curse from the first cursed equipped item. */
export function removeCurseFromFirst(hero: Hero, messages: Message[], turn: number): Hero {
  const eqSlots = Object.keys(hero.equipment) as (keyof typeof hero.equipment)[];
  for (const slot of eqSlots) {
    const eq = hero.equipment[slot];
    if (eq && eq.cursed) {
      const uncursed = { ...eq, cursed: false, identified: true };
      messages.push({ text: `The curse on ${uncursed.name} has been lifted!`, severity: 'important', turn });
      return { ...hero, equipment: { ...hero.equipment, [slot]: uncursed } };
    }
  }
  messages.push({ text: 'No cursed items found.', severity: 'system', turn });
  return hero;
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
    if (tile?.walkable && !floor.monsters.find(m => m.position.x === x && m.position.y === y)) {
      hero = { ...hero, position: { x, y } };
      messages.push({ text: 'You read the scroll and teleport!', severity: 'important', turn: state.turn });
      return { hero, state };
    }
  }
  return { hero, state };
}
