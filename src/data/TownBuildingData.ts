import type { Vector2 } from '../core/types';

export interface BuildingTile { sprite: string; type: string; overlay?: string; npcSprite?: string; }
export interface BuildingTemplate { id: string; name: string; flavor: string; width: number; height: number; tiles: (BuildingTile | null)[][]; entrance: Vector2 | Vector2[]; npc: Vector2 | null; facing?: string; }

export const TOWN_BUILDINGS_DATA: BuildingTemplate[] = [
  {
    "id": "inn",
    "name": "The Resting Stag Inn",
    "flavor": "A warm bed and a hearty meal await weary adventurers.",
    "facing": "west",
    "width": 8,
    "height": 6,
    "tiles": [
      [
        {
          "sprite": "wall-sandstone_wall1",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall1",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall1",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall7",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall3",
          "type": "wall"
        },
        null,
        null,
        null
      ],
      [
        {
          "sprite": "wall-sandstone_wall6",
          "type": "wall"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "decor-cache_of_baked_goods_1"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "decor-cache_of_fruit_0"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "decor-cache_of_fruit_2"
        },
        {
          "sprite": "wall-sandstone_wall1",
          "type": "wall"
        },
        null,
        null,
        null
      ],
      [
        {
          "sprite": "wall-sandstone_wall1",
          "type": "wall"
        },
        {
          "sprite": "floor-sand5",
          "type": "floor"
        },
        {
          "sprite": "floor-sand8",
          "type": "floor"
        },
        {
          "sprite": "floor-sand5",
          "type": "floor"
        },
        {
          "sprite": "doors-closed_door",
          "type": "door"
        },
        {
          "sprite": "wall-sandstone_wall4",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall2",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall9",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "floor-sand3",
          "type": "floor"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor"
        },
        {
          "sprite": "floor-sand8",
          "type": "floor",
          "npcSprite": "humanoids-human"
        },
        {
          "sprite": "floor-sand2",
          "type": "floor"
        },
        {
          "sprite": "wall-sandstone_wall1",
          "type": "wall"
        },
        {
          "sprite": "floor-sand2",
          "type": "floor"
        },
        {
          "sprite": "floor-sand6",
          "type": "floor"
        },
        {
          "sprite": "wall-sandstone_wall8",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall0",
          "type": "wall"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "decor-cache_of_meat_0"
        },
        {
          "sprite": "floor-sand5",
          "type": "floor"
        },
        {
          "sprite": "floor-sand5",
          "type": "floor",
          "overlay": "altars-makhleb_flame3"
        },
        {
          "sprite": "wall-sandstone_wall6",
          "type": "wall"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "decor-blue_fountain"
        },
        {
          "sprite": "wall-sandstone_wall3",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall0",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall3",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall4",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall8",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall6",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall3",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall5",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall4",
          "type": "wall"
        }
      ]
    ],
    "entrance": [
      {
        "x": 1,
        "y": 3
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 2,
        "y": 2
      }
    ],
    "npc": {
      "x": 2,
      "y": 3
    }
  },
  {
    "id": "weapon-shop",
    "name": "Weapon Shop",
    "flavor": "Blades of every make line the walls.",
    "facing": "south",
    "width": 6,
    "height": 5,
    "tiles": [
      [
        {
          "sprite": "wall-sandstone_wall9",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall7",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall7",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall0",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall0",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall9",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall1",
          "type": "wall"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "statues-statue_demonic_bust"
        },
        {
          "sprite": "floor-sand7",
          "type": "floor"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "shops-shop_weapon"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "statues-statue_centaur"
        },
        {
          "sprite": "wall-sandstone_wall8",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall0",
          "type": "wall"
        },
        {
          "sprite": "floor-sand6",
          "type": "floor"
        },
        {
          "sprite": "floor-sand8",
          "type": "floor",
          "npcSprite": "humanoids-human2"
        },
        {
          "sprite": "floor-sand6",
          "type": "floor"
        },
        {
          "sprite": "floor-sand1",
          "type": "floor"
        },
        {
          "sprite": "wall-sandstone_wall5",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall3",
          "type": "wall"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "statues-statue_archer"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor"
        },
        {
          "sprite": "floor-sand4",
          "type": "floor"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "statues-statue_axe"
        },
        {
          "sprite": "wall-sandstone_wall1",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall6",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall6",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall0",
          "type": "wall"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor"
        },
        {
          "sprite": "wall-sandstone_wall2",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall8",
          "type": "wall"
        }
      ]
    ],
    "entrance": [
      {
        "x": 3,
        "y": 3
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 3,
        "y": 4
      }
    ],
    "npc": {
      "x": 2,
      "y": 2
    }
  },
  {
    "id": "armor-shop",
    "name": "Armor Shop",
    "flavor": "Shields and plate gleam in the torchlight.",
    "facing": "east",
    "width": 6,
    "height": 5,
    "tiles": [
      [
        {
          "sprite": "wall-sandstone_wall0",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall6",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall3",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall3",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall8",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall4",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall1",
          "type": "wall"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "statues-statue_princess"
        },
        {
          "sprite": "floor-sand8",
          "type": "floor"
        },
        {
          "sprite": "floor-sand1",
          "type": "floor",
          "overlay": "shops-shop_armour"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "statues-statue_cerebov"
        },
        {
          "sprite": "wall-sandstone_wall1",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall5",
          "type": "wall"
        },
        {
          "sprite": "floor-sand4",
          "type": "floor"
        },
        {
          "sprite": "floor-sand5",
          "type": "floor"
        },
        {
          "sprite": "floor-sand4",
          "type": "floor",
          "npcSprite": "humanoids-human3"
        },
        {
          "sprite": "floor-sand7",
          "type": "floor"
        },
        {
          "sprite": "floor-sand4",
          "type": "floor"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall2",
          "type": "wall"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "statues-statue_cat"
        },
        {
          "sprite": "floor-sand8",
          "type": "floor"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor"
        },
        {
          "sprite": "floor-sand7",
          "type": "floor",
          "overlay": "statues-statue_triangle"
        },
        {
          "sprite": "wall-sandstone_wall9",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall9",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall9",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall9",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall6",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall9",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall8",
          "type": "wall"
        }
      ]
    ],
    "entrance": [
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 4,
        "y": 2
      }
    ],
    "npc": {
      "x": 3,
      "y": 2
    }
  },
  {
    "id": "general-store",
    "name": "General Store",
    "flavor": "Everything an adventurer could need, and more.",
    "facing": "south",
    "width": 7,
    "height": 6,
    "tiles": [
      [
        {
          "sprite": "wall-sandstone_wall4",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall9",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall1",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall7",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall2",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall0",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall7",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall3",
          "type": "wall"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "shops-shop_gadgets"
        },
        {
          "sprite": "floor-sand2",
          "type": "floor"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "decor-cache_of_fruit_1"
        },
        {
          "sprite": "floor-sand7",
          "type": "floor"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "shops-shop_general"
        },
        {
          "sprite": "wall-sandstone_wall5",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall8",
          "type": "wall"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor"
        },
        {
          "sprite": "floor-sand5",
          "type": "floor"
        },
        {
          "sprite": "floor-sand6",
          "type": "floor",
          "npcSprite": "humanoids-imperial_myrmidon"
        },
        {
          "sprite": "floor-sand5",
          "type": "floor"
        },
        {
          "sprite": "floor-sand4",
          "type": "floor"
        },
        {
          "sprite": "wall-sandstone_wall6",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall2",
          "type": "wall"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "decor-cache_of_baked_goods_1"
        },
        {
          "sprite": "floor-sand2",
          "type": "floor"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor"
        },
        {
          "sprite": "floor-sand5",
          "type": "floor"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "decor-dry_fountain"
        },
        {
          "sprite": "wall-sandstone_wall5",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall0",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall2",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall0",
          "type": "wall"
        },
        {
          "sprite": "floor-sand7",
          "type": "floor"
        },
        {
          "sprite": "wall-sandstone_wall1",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall5",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall6",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "floor-sand2",
          "type": "floor",
          "overlay": "statues-crumbled_column_1"
        },
        {
          "sprite": "floor-sand2",
          "type": "floor"
        },
        {
          "sprite": "floor-sand8",
          "type": "floor",
          "overlay": "statues-crumbled_column_1"
        },
        {
          "sprite": "floor-sand7",
          "type": "floor"
        },
        {
          "sprite": "floor-sand8",
          "type": "floor",
          "overlay": "statues-crumbled_column_1"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor"
        },
        {
          "sprite": "floor-sand1",
          "type": "floor",
          "overlay": "statues-crumbled_column_1"
        }
      ]
    ],
    "entrance": [
      {
        "x": 3,
        "y": 4
      },
      {
        "x": 3,
        "y": 3
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 4,
        "y": 2
      }
    ],
    "npc": {
      "x": 3,
      "y": 2
    }
  },
  {
    "id": "magic-shop",
    "name": "Magic Shop",
    "flavor": "Arcane energies crackle between dusty shelves.",
    "facing": "west",
    "width": 5,
    "height": 6,
    "tiles": [
      [
        {
          "sprite": "wall-sandstone_wall5",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall7",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall5",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall1",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall3",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall3",
          "type": "wall"
        },
        {
          "sprite": "wall-crystal_bookcase0",
          "type": "decor"
        },
        {
          "sprite": "floor-sand8",
          "type": "floor"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "gateways-enter_tartarus1"
        },
        {
          "sprite": "wall-sandstone_wall7",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall2",
          "type": "wall"
        },
        {
          "sprite": "floor-sand1",
          "type": "floor"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "vaults-arcane_conduit_0"
        },
        {
          "sprite": "floor-sand4",
          "type": "floor"
        },
        {
          "sprite": "wall-sandstone_wall4",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "floor-sand2",
          "type": "floor"
        },
        {
          "sprite": "floor-sand2",
          "type": "floor"
        },
        {
          "sprite": "floor-sand1",
          "type": "floor",
          "npcSprite": "humanoids-ironbound_beastmaster"
        },
        {
          "sprite": "floor-sand2",
          "type": "floor",
          "overlay": "traps-cobweb_NES"
        },
        {
          "sprite": "wall-sandstone_wall7",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall7",
          "type": "wall"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "vaults-stacked_books_3"
        },
        {
          "sprite": "floor-sand7",
          "type": "floor"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "gateways-sealed_stairs_down"
        },
        {
          "sprite": "wall-sandstone_wall6",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall2",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall0",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall3",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall9",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall4",
          "type": "wall"
        }
      ]
    ],
    "entrance": [
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 1,
        "y": 3
      }
    ],
    "npc": {
      "x": 2,
      "y": 3
    }
  },
  {
    "id": "rune-forge",
    "name": "Rune Forge",
    "flavor": "Ancient runes pulse with power in the forge's heat.",
    "facing": "north",
    "width": 7,
    "height": 6,
    "tiles": [
      [
        {
          "sprite": "wall-sandstone_wall7",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall8",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall5",
          "type": "wall"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor"
        },
        {
          "sprite": "wall-sandstone_wall5",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall1",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall2",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall2",
          "type": "wall"
        },
        {
          "sprite": "wall-crystal_bookcase1",
          "type": "decor"
        },
        {
          "sprite": "floor-sand5",
          "type": "floor"
        },
        {
          "sprite": "floor-sand5",
          "type": "floor"
        },
        {
          "sprite": "floor-sand5",
          "type": "floor"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "statues-statue_orb"
        },
        {
          "sprite": "wall-sandstone_wall5",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall5",
          "type": "wall"
        },
        {
          "sprite": "floor-sand8",
          "type": "floor",
          "overlay": "vaults-flower_pot_1"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor"
        },
        {
          "sprite": "floor-sand1",
          "type": "floor",
          "npcSprite": "humanoids-ironbound_preserver"
        },
        {
          "sprite": "floor-sand8",
          "type": "floor"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "vaults-flower_pot_1"
        },
        {
          "sprite": "wall-sandstone_wall3",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall7",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall4",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall2",
          "type": "wall"
        },
        {
          "sprite": "floor-sand6",
          "type": "floor"
        },
        {
          "sprite": "wall-sandstone_wall0",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall5",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall3",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall8",
          "type": "wall"
        },
        {
          "sprite": "floor-sand1",
          "type": "floor"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "vaults-arcane_conduit_0"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "vaults-alchemical_conduit_3"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "vaults-arcane_conduit_1"
        },
        {
          "sprite": "floor-sand5",
          "type": "floor"
        },
        {
          "sprite": "wall-sandstone_wall0",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall2",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall4",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall0",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall5",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall9",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall6",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall7",
          "type": "wall"
        }
      ]
    ],
    "entrance": [
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 1
      }
    ],
    "npc": {
      "x": 3,
      "y": 2
    }
  },
  {
    "id": "blacksmith",
    "name": "The Enchanter",
    "flavor": "Arcane sigils glow as enchantments are woven into steel.",
    "facing": "south",
    "width": 7,
    "height": 5,
    "tiles": [
      [
        {
          "sprite": "wall-sandstone_wall0",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall0",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall2",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall3",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall7",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall0",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall9",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall9",
          "type": "wall"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "vaults-mop_1"
        },
        {
          "sprite": "floor-sand2",
          "type": "floor"
        },
        {
          "sprite": "floor-sand1",
          "type": "floor",
          "overlay": "vaults-lectern"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "vaults-dimensional_conduit_0"
        },
        {
          "sprite": "wall-sandstone_wall7",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall5",
          "type": "wall"
        },
        {
          "sprite": "floor-sand2",
          "type": "floor"
        },
        {
          "sprite": "floor-sand7",
          "type": "floor",
          "overlay": "vaults-bedevilled_crystal_abyss_0"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor"
        },
        {
          "sprite": "floor-sand4",
          "type": "floor",
          "overlay": "vaults-bedevilled_crystal_pan_1"
        },
        {
          "sprite": "floor-sand4",
          "type": "floor"
        },
        {
          "sprite": "wall-sandstone_wall6",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall0",
          "type": "wall"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor"
        },
        {
          "sprite": "floor-sand5",
          "type": "floor"
        },
        {
          "sprite": "floor-sand1",
          "type": "floor"
        },
        {
          "sprite": "floor-sand6",
          "type": "floor"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor"
        },
        {
          "sprite": "wall-sandstone_wall9",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall0",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall9",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall8",
          "type": "wall"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor"
        },
        {
          "sprite": "wall-sandstone_wall4",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall1",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall9",
          "type": "wall"
        }
      ]
    ],
    "entrance": [
      {
        "x": 3,
        "y": 4
      },
      {
        "x": 3,
        "y": 3
      }
    ],
    "npc": {
      "x": 3,
      "y": 2
    }
  },
  {
    "id": "sage",
    "name": "The Sage",
    "flavor": "Ancient wisdom whispers from dusty tomes.",
    "facing": "north",
    "width": 5,
    "height": 5,
    "tiles": [
      [
        {
          "sprite": "wall-sandstone_wall4",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall0",
          "type": "wall"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor"
        },
        {
          "sprite": "wall-sandstone_wall5",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall7",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall6",
          "type": "wall"
        },
        {
          "sprite": "wall-crystal_bookcase2",
          "type": "decor"
        },
        {
          "sprite": "floor-sand5",
          "type": "floor"
        },
        {
          "sprite": "wall-crystal_bookcase3",
          "type": "decor"
        },
        {
          "sprite": "wall-sandstone_wall8",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall2",
          "type": "wall"
        },
        {
          "sprite": "floor-sand6",
          "type": "floor"
        },
        {
          "sprite": "floor-sand6",
          "type": "floor",
          "npcSprite": "humanoids-killer_klown_green"
        },
        {
          "sprite": "floor-sand2",
          "type": "floor"
        },
        {
          "sprite": "wall-sandstone_wall6",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall1",
          "type": "wall"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "vaults-oka_iron_statue_1"
        },
        {
          "sprite": "floor-sand4",
          "type": "floor",
          "overlay": "vaults-orb_dais"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "vaults-oka_iron_statue_2"
        },
        {
          "sprite": "wall-sandstone_wall3",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall8",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall3",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall7",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall8",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall6",
          "type": "wall"
        }
      ]
    ],
    "entrance": [
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 2,
        "y": 1
      }
    ],
    "npc": {
      "x": 2,
      "y": 2
    }
  },
  {
    "id": "temple",
    "name": "Temple of Odin",
    "flavor": "The All-Father's gaze watches over all who enter.",
    "facing": "north",
    "width": 9,
    "height": 7,
    "tiles": [
      [
        {
          "sprite": "wall-sandstone_wall3",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall7",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall8",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall7",
          "type": "wall"
        },
        {
          "sprite": "floor-sand7",
          "type": "floor"
        },
        {
          "sprite": "wall-sandstone_wall8",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall2",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall8",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall7",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall5",
          "type": "wall"
        },
        {
          "sprite": "floor-sand1",
          "type": "floor"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "statues-depths_column"
        },
        {
          "sprite": "floor-sand1",
          "type": "floor"
        },
        {
          "sprite": "floor-sand8",
          "type": "floor"
        },
        {
          "sprite": "floor-sand5",
          "type": "floor"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "statues-depths_column"
        },
        {
          "sprite": "floor-sand1",
          "type": "floor"
        },
        {
          "sprite": "wall-sandstone_wall3",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall1",
          "type": "wall"
        },
        {
          "sprite": "floor-sand1",
          "type": "floor"
        },
        {
          "sprite": "floor-sand6",
          "type": "floor"
        },
        {
          "sprite": "floor-sand5",
          "type": "floor"
        },
        {
          "sprite": "floor-sand5",
          "type": "floor"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor"
        },
        {
          "sprite": "floor-sand1",
          "type": "floor"
        },
        {
          "sprite": "wall-sandstone_wall3",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall9",
          "type": "wall"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "statues-depths_column"
        },
        {
          "sprite": "floor-sand7",
          "type": "floor"
        },
        {
          "sprite": "floor-sand5",
          "type": "floor",
          "npcSprite": "humanoids-human"
        },
        {
          "sprite": "floor-sand6",
          "type": "floor"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "statues-depths_column"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor"
        },
        {
          "sprite": "wall-sandstone_wall5",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall2",
          "type": "wall"
        },
        {
          "sprite": "floor-sand1",
          "type": "floor"
        },
        {
          "sprite": "floor-sand7",
          "type": "floor"
        },
        {
          "sprite": "floor-sand1",
          "type": "floor"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "altars-hep0"
        },
        {
          "sprite": "floor-sand8",
          "type": "floor"
        },
        {
          "sprite": "floor-sand7",
          "type": "floor"
        },
        {
          "sprite": "floor-sand4",
          "type": "floor"
        },
        {
          "sprite": "wall-sandstone_wall7",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall9",
          "type": "wall"
        },
        {
          "sprite": "floor-sand6",
          "type": "floor"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "statues-depths_column"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "statues-statue_imp"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "statues-statue_imp"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "statues-depths_column"
        },
        {
          "sprite": "floor-sand1",
          "type": "floor"
        },
        {
          "sprite": "wall-sandstone_wall6",
          "type": "wall"
        }
      ],
      [
        {
          "sprite": "wall-sandstone_wall7",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall9",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall4",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall6",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall0",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall8",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall4",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall0",
          "type": "wall"
        },
        {
          "sprite": "wall-sandstone_wall5",
          "type": "wall"
        }
      ]
    ],
    "entrance": [
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 3,
        "y": 3
      },
      {
        "x": 5,
        "y": 3
      }
    ],
    "npc": {
      "x": 4,
      "y": 3
    }
  },
  {
    "id": "rift-stone",
    "name": "Rift Stone",
    "flavor": "A crackling portal to the depths below.",
    "width": 3,
    "height": 3,
    "tiles": [
      [
        {
          "sprite": "floor-grass-pedestal_nw",
          "type": "floor"
        },
        {
          "sprite": "floor-grass-pedestal_n",
          "type": "floor"
        },
        {
          "sprite": "floor-grass-pedestal_ne",
          "type": "floor"
        }
      ],
      [
        {
          "sprite": "floor-grass-pedestal_w",
          "type": "floor"
        },
        {
          "sprite": "floor-pedestal_full",
          "type": "floor",
          "overlay": "altars-yredelemnul"
        },
        {
          "sprite": "floor-grass-pedestal_e",
          "type": "floor"
        }
      ],
      [
        {
          "sprite": "floor-grass-pedestal_sw",
          "type": "floor"
        },
        {
          "sprite": "floor-grass-pedestal_s",
          "type": "floor"
        },
        {
          "sprite": "floor-grass-pedestal_se",
          "type": "floor"
        }
      ]
    ],
    "entrance": [
      {
        "x": 1,
        "y": 1
      }
    ],
    "npc": {
      "x": 1,
      "y": 1
    }
  },
  {
    "id": "statue-of-fortune",
    "name": "Statue of Fortune",
    "flavor": "Rub the hero's shield for luck... or so they say.",
    "width": 3,
    "height": 3,
    "tiles": [
      [
        {
          "sprite": "floor-white_marble1",
          "type": "decor"
        },
        {
          "sprite": "floor-white_marble0",
          "type": "floor"
        },
        {
          "sprite": "floor-white_marble3",
          "type": "decor"
        }
      ],
      [
        {
          "sprite": "floor-white_marble6",
          "type": "floor"
        },
        {
          "sprite": "wall-church0",
          "type": "wall"
        },
        {
          "sprite": "floor-white_marble1",
          "type": "floor"
        }
      ],
      [
        {
          "sprite": "floor-white_marble5",
          "type": "decor"
        },
        {
          "sprite": "floor-white_marble7",
          "type": "floor"
        },
        {
          "sprite": "floor-white_marble7",
          "type": "decor"
        }
      ]
    ],
    "entrance": [
      {
        "x": 1,
        "y": 1
      }
    ],
    "npc": {
      "x": 1,
      "y": 1
    }
  },
  {
    "id": "crucible",
    "name": "The Crucible",
    "flavor": "A battle-scarred arena where warriors test their mettle.",
    "facing": "south",
    "width": 7,
    "height": 5,
    "tiles": [
      [
        {
          "sprite": "floor-grass0",
          "type": "floor"
        },
        {
          "sprite": "floor-grass0",
          "type": "floor"
        },
        {
          "sprite": "floor-grass0",
          "type": "floor"
        },
        {
          "sprite": "floor-sand7",
          "type": "floor"
        },
        {
          "sprite": "floor-grass0",
          "type": "floor"
        },
        {
          "sprite": "floor-grass0",
          "type": "floor"
        },
        {
          "sprite": "floor-sand7",
          "type": "floor"
        }
      ],
      [
        {
          "sprite": "floor-sand7",
          "type": "floor"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "statues-statue_ancient_hero"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor"
        },
        {
          "sprite": "floor-sand7",
          "type": "floor"
        },
        {
          "sprite": "floor-grass_full",
          "type": "floor"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "statues-statue_ancient_hero"
        },
        {
          "sprite": "floor-grass0",
          "type": "floor"
        }
      ],
      [
        {
          "sprite": "floor-grass0",
          "type": "floor"
        },
        {
          "sprite": "floor-grass_full",
          "type": "floor"
        },
        {
          "sprite": "floor-grass_full",
          "type": "floor"
        },
        {
          "sprite": "floor-grass_full",
          "type": "floor",
          "overlay": "gateways-crucible_exit"
        },
        {
          "sprite": "floor-grass_full",
          "type": "floor"
        },
        {
          "sprite": "floor-sand4",
          "type": "floor"
        },
        {
          "sprite": "floor-grass0",
          "type": "floor"
        }
      ],
      [
        {
          "sprite": "floor-grass0",
          "type": "floor"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "statues-statue_sword"
        },
        {
          "sprite": "floor-sand5",
          "type": "floor"
        },
        {
          "sprite": "floor-grass_full",
          "type": "floor"
        },
        {
          "sprite": "floor-sand7",
          "type": "floor"
        },
        {
          "sprite": "floor-sand3",
          "type": "floor",
          "overlay": "statues-statue_sword"
        },
        {
          "sprite": "floor-grass0",
          "type": "floor"
        }
      ],
      [
        {
          "sprite": "floor-grass0",
          "type": "floor"
        },
        {
          "sprite": "floor-sand7",
          "type": "floor"
        },
        {
          "sprite": "floor-grass_full",
          "type": "floor"
        },
        {
          "sprite": "floor-grass_full",
          "type": "floor"
        },
        {
          "sprite": "floor-grass_full",
          "type": "floor"
        },
        {
          "sprite": "floor-grass0",
          "type": "floor"
        },
        {
          "sprite": "floor-sand7",
          "type": "floor"
        }
      ]
    ],
    "entrance": [
      {
        "x": 3,
        "y": 2
      }
    ],
    "npc": {
      "x": 3,
      "y": 2
    }
  }
];
