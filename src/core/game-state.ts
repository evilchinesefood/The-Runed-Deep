import type {
  GameState,
  Hero,
  Equipment,
  Attributes,
  ElementalResistances,
  TownState,
  Difficulty,
  Gender,
} from './types';
import { computeMaxHp, computeMaxMp, computeBaseArmorValue } from '../systems/character/derived-stats';
import { getDifficultyConfig } from '../data/difficulty';

export function createDefaultAttributes(): Attributes {
  return { strength: 50, intelligence: 50, constitution: 50, dexterity: 50 };
}

export function createDefaultResistances(): ElementalResistances {
  return { cold: 0, fire: 0, lightning: 0, acid: 0, drain: 0 };
}

export function createEmptyEquipment(): Equipment {
  return {
    weapon: null,
    shield: null,
    helmet: null,
    body: null,
    cloak: null,
    bracers: null,
    gauntlets: null,
    belt: null,
    boots: null,
    ringLeft: null,
    ringRight: null,
    amulet: null,
    pack: null,
    purse: null,
  };
}

export function createHero(
  name: string,
  gender: Gender,
  attributes: Attributes,
  startingSpell?: string,
  difficulty: Difficulty = 'intermediate',
): Hero {
  const maxHp = computeMaxHp(attributes.constitution, 1);
  const maxMp = computeMaxMp(attributes.intelligence, 1);
  const armorValue = computeBaseArmorValue(attributes.dexterity);
  const config = getDifficultyConfig(difficulty);

  return {
    name,
    gender,
    position: { x: 0, y: 0 },
    attributes,
    hp: maxHp,
    maxHp,
    mp: maxMp,
    maxMp,
    xp: 0,
    level: 1,
    equipment: createEmptyEquipment(),
    inventory: [],
    copper: config.startingCopper,
    knownSpells: startingSpell ? [startingSpell] : [],
    spellHotkeys: startingSpell ? [startingSpell] : [],
    activeEffects: [],
    resistances: createDefaultResistances(),
    armorValue,
    equipDamageBonus: 0,
    equipAccuracyBonus: 0,
  };
}

export function createDefaultTown(): TownState {
  return {
    id: 'hamlet',
    shopInventories: {},
    bankBalance: 0,
  };
}

export function createInitialGameState(difficulty: Difficulty = 'easy'): GameState {
  return {
    screen: 'splash',
    hero: createHero('Hero', 'male', createDefaultAttributes()),
    currentFloor: 0,
    currentDungeon: 'mine',
    floors: {},
    town: createDefaultTown(),
    messages: [],
    turn: 0,
    gameTime: 0,
    difficulty,
    rngSeed: Date.now(),
  };
}
