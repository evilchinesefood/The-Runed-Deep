// ============================================================
// Data-driven dungeon theme definitions
// Each theme maps to a depth range with variant tile pools
// ============================================================

export interface DungeonTheme {
  id: string;
  name: string;
  depthMin: number;
  depthMax: number;
  walls: string[];
  floors: string[];
  litFloors: string[];
  doorClosed: string[];
  doorOpen: string[];
  stairsUp: string[];
  stairsDown: string[];
  decor: string[];
  wallTint: string;
}

export const DUNGEON_THEMES: DungeonTheme[] = [
  {
    id: "mine",
    name: "Mine",
    depthMin: 1,
    depthMax: 5,
    walls: [
      "wall-stone2_brown0",
      "wall-stone2_brown1",
      "wall-stone2_brown2",
      "wall-stone2_brown3",
      "wall-stone_gray0",
      "wall-stone_gray1",
      "wall-stone_gray2",
      "wall-stone_gray3",
    ],
    floors: [
      "floor-pebble_brown0",
      "floor-pebble_brown1",
      "floor-pebble_brown2",
      "floor-pebble_brown3",
      "floor-grey_dirt0",
      "floor-grey_dirt1",
      "floor-grey_dirt2",
      "floor-grey_dirt3",
    ],
    litFloors: [
      "floor-grey_dirt_b_0",
      "floor-grey_dirt_b_1",
      "floor-grey_dirt_b_2",
      "floor-grey_dirt_b_3",
    ],
    doorClosed: ["doors-closed_door"],
    doorOpen: ["doors-open_door"],
    stairsUp: ["gateways-stone_stairs_up"],
    stairsDown: ["gateways-stone_stairs_down"],
    decor: [
      "statues-depths_column",
      "statues-crumbled_column_1",
      "statues-crumbled_column_2",
    ],
    wallTint: "",
  },
  {
    id: "lair",
    name: "Lair",
    depthMin: 6,
    depthMax: 10,
    walls: [
      "wall-brick_brown0",
      "wall-brick_brown1",
      "wall-brick_brown2",
      "wall-brick_brown3",
      "wall-brick_brown4",
      "wall-brick_brown5",
    ],
    floors: [
      "floor-lair0",
      "floor-lair1",
      "floor-lair2",
      "floor-lair3",
      "floor-dirt0",
      "floor-dirt1",
      "floor-dirt2",
    ],
    litFloors: [
      "floor-grey_dirt_b_0",
      "floor-grey_dirt_b_1",
      "floor-grey_dirt_b_2",
      "floor-grey_dirt_b_3",
    ],
    doorClosed: ["doors-closed_door"],
    doorOpen: ["doors-open_door"],
    stairsUp: ["gateways-stone_stairs_up"],
    stairsDown: ["gateways-stone_stairs_down"],
    decor: [
      "plants-bloom_plant_01",
      "plants-bloom_plant_02",
      "plants-magic_mushroom_01",
      "plants-magic_mushroom_02",
      "decor-flower_patch_0",
      "decor-flower_patch_1",
    ],
    wallTint: "",
  },
  {
    id: "crypt",
    name: "Crypt",
    depthMin: 11,
    depthMax: 15,
    walls: [
      "wall-stone_dark0",
      "wall-stone_dark1",
      "wall-stone_dark2",
      "wall-stone_dark3",
      "wall-cobalt_stone01",
      "wall-cobalt_stone02",
      "wall-cobalt_stone03",
      "wall-cobalt_stone04",
    ],
    floors: [
      "floor-crypt_domino_1a",
      "floor-crypt_domino_1b",
      "floor-crypt_domino_2a",
      "floor-crypt_domino_3a",
      "floor-green_bones01",
      "floor-green_bones02",
      "floor-green_bones03",
      "floor-green_bones04",
    ],
    litFloors: [
      "floor-grey_dirt_b_4",
      "floor-grey_dirt_b_5",
      "floor-grey_dirt_b_6",
      "floor-grey_dirt_b_7",
    ],
    doorClosed: ["doors-closed_door_crypt"],
    doorOpen: ["doors-open_door_crypt"],
    stairsUp: ["gateways-stone_stairs_up"],
    stairsDown: ["gateways-stone_stairs_down"],
    decor: [
      "statues-statue_demonic_bust",
      "statues-crumbled_column_3",
      "statues-crumbled_column_4",
      "decor-blood_fountain",
      "altars-ashenzari",
    ],
    wallTint: "",
  },
  {
    id: "fortress",
    name: "Fortress",
    depthMin: 16,
    depthMax: 20,
    walls: [
      "wall-brick_gray0",
      "wall-brick_gray1",
      "wall-brick_gray2",
      "wall-brick_gray3",
      "wall-sandstone_wall0",
      "wall-sandstone_wall1",
      "wall-sandstone_wall2",
      "wall-sandstone_wall3",
    ],
    floors: [
      "floor-sandstone_floor0",
      "floor-sandstone_floor1",
      "floor-sandstone_floor2",
      "floor-sandstone_floor3",
      "floor-rect_gray0",
      "floor-rect_gray1",
      "floor-rect_gray2",
      "floor-rect_gray3",
    ],
    litFloors: [
      "floor-grey_dirt_b_0",
      "floor-grey_dirt_b_1",
      "floor-grey_dirt_b_2",
      "floor-grey_dirt_b_3",
    ],
    doorClosed: ["doors-closed_door"],
    doorOpen: ["doors-open_door"],
    stairsUp: ["gateways-stone_stairs_up"],
    stairsDown: ["gateways-stone_stairs_down"],
    decor: [
      "statues-depths_column",
      "statues-statue_ancient_hero",
      "statues-statue_archer",
      "altars-ecumenical",
    ],
    wallTint: "#6688bb",
  },
  {
    id: "ice",
    name: "Ice",
    depthMin: 21,
    depthMax: 25,
    walls: [
      "wall-ice_block0",
      "wall-ice_block1",
      "wall-ice_block2",
      "wall-ice_block3",
      "wall-icy_stone0",
      "wall-icy_stone1",
      "wall-icy_stone2",
      "wall-icy_stone3",
    ],
    floors: [
      "floor-ice0",
      "floor-ice1",
      "floor-ice2",
      "floor-ice3",
      "floor-frozen0",
      "floor-frozen1",
      "floor-frozen2",
      "floor-frozen3",
    ],
    litFloors: [
      "floor-grey_dirt_b_4",
      "floor-grey_dirt_b_5",
      "floor-grey_dirt_b_6",
      "floor-grey_dirt_b_7",
    ],
    doorClosed: ["doors-closed_door"],
    doorOpen: ["doors-open_door"],
    stairsUp: ["gateways-stone_stairs_up"],
    stairsDown: ["gateways-stone_stairs_down"],
    decor: [
      "statues-crumbled_column_5",
      "statues-crumbled_column_6",
      "decor-blue_fountain",
      "decor-dry_fountain",
    ],
    wallTint: "",
  },
  {
    id: "castle",
    name: "Castle",
    depthMin: 26,
    depthMax: 30,
    walls: [
      "wall-marble_wall1",
      "wall-marble_wall2",
      "wall-marble_wall3",
      "wall-marble_wall4",
      "wall-vault_stone00",
      "wall-vault_stone01",
      "wall-vault_stone02",
      "wall-vault_stone03",
    ],
    floors: [
      "floor-white_marble0",
      "floor-white_marble1",
      "floor-white_marble2",
      "floor-white_marble3",
      "floor-metal_silver0",
      "floor-metal_silver1",
      "floor-metal_silver2",
      "floor-metal_silver3",
    ],
    litFloors: [
      "floor-grey_dirt_b_0",
      "floor-grey_dirt_b_1",
      "floor-grey_dirt_b_2",
      "floor-grey_dirt_b_3",
    ],
    doorClosed: ["doors-closed_door"],
    doorOpen: ["doors-open_door"],
    stairsUp: ["gateways-stone_stairs_up"],
    stairsDown: ["gateways-stone_stairs_down"],
    decor: [
      "statues-statue_angel",
      "statues-statue_ancient_hero",
      "statues-metal_statue",
      "decor-sparkling_fountain",
      "altars-elyvilon",
    ],
    wallTint: "#bb7755",
  },
];

const THEME_MAP = new Map<string, DungeonTheme>();
for (const t of DUNGEON_THEMES) THEME_MAP.set(t.id, t);

export function getThemeForDepth(depth: number): DungeonTheme {
  for (const t of DUNGEON_THEMES) {
    if (depth >= t.depthMin && depth <= t.depthMax) return t;
  }
  return DUNGEON_THEMES[0];
}

export function getThemeById(id: string): DungeonTheme {
  return THEME_MAP.get(id) ?? DUNGEON_THEMES[0];
}

export function getDungeonIdForDepth(depth: number): string {
  return getThemeForDepth(depth).id;
}

/** Pick a random element from an array using a rand function */
export function pickVariant(arr: string[], rand: () => number): string {
  return arr[Math.floor(rand() * arr.length)];
}
