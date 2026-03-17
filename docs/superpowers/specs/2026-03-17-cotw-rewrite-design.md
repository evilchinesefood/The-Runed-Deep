# Castle of the Winds — TypeScript Rewrite Design Spec

## Overview

Rewrite the Castle of the Winds browser game from its current compiled Elm 0.18 codebase into TypeScript, using Vite as the build tool. The game is a faithful recreation of the 1989/1993 tile-based roguelike RPG by Rick Saada.

## Constraints

- Reuse all existing CSS sprite sheets and image assets (complete and working)
- DOM-based rendering (no Canvas) — tiles are divs with CSS background-position
- Must support keyboard, mouse, and touchscreen input
- Single-player, client-side only, no server dependency
- Save/load via localStorage

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Rendering | DOM + CSS sprites | Sprites already defined in CSS; tile count is small (~300 visible); turn-based game doesn't need Canvas performance |
| Language | TypeScript | Complex interconnected systems benefit from type safety; catches bugs at write-time |
| Build tool | Vite | Fast dev server, hot reload, minimal config, good TS support |
| State | Single global GameState | Mirrors original Elm architecture; trivial save/load via JSON; easy to debug |
| Input | Abstraction layer | Three input methods (keyboard/mouse/touch) map to same GameAction type |

## Module Structure

```
src/
  main.ts                 — Entry point, Vite bootstrap
  core/
    game-state.ts         — GameState type definition
    game-loop.ts          — Turn-based loop: player → resolve → monsters → resolve → render
    actions.ts            — GameAction union type (all possible player actions)
    save-load.ts          — JSON serialize/deserialize GameState to localStorage
  input/
    input-manager.ts      — Routes raw events to GameAction
    keyboard.ts           — Keyboard event handlers (arrows, numpad, hotkeys)
    mouse.ts              — Click-to-move, click-to-attack, drag-drop
    touch.ts              — Tap, swipe, long-press, virtual d-pad
  rendering/
    map-renderer.ts       — Renders tile grid as DOM elements with CSS sprite classes
    ui-renderer.ts        — Updates HUD, message log, status displays
    camera.ts             — Viewport tracking, scroll-to-follow player
    sprite-map.ts         — Maps tile/item/monster IDs to CSS class names
  systems/
    combat/
      combat.ts           — Attack resolution, hit/miss, damage calc
      damage.ts           — Damage types, resistance application
      dice.ts             — Dice rolling (NdM+B format)
    dungeon/
      generator.ts        — Main dungeon generation orchestrator
      rooms.ts            — Room type generators (rectangular, cross, diamond, circular, dead-end)
      corridors.ts        — Corridor connection algorithm
      placement.ts        — Stairs, doors, traps, items, monsters placement
      floor-store.ts      — Floor persistence (generated floors stored in state)
    inventory/
      inventory.ts        — Add/remove items, weight/bulk tracking
      equipment.ts        — Equip/unequip, slot validation, stat recalculation
      containers.ts       — Pack, chest, belt, purse logic
      drag-drop.ts        — Drag-drop state management
    items/
      item-types.ts       — Item type definitions
      item-db.ts          — Static item database (all weapons, armor, etc.)
      enchantments.ts     — Enchantment/curse generation and effects
      identification.ts   — Unidentified item display, identification logic
    monsters/
      monster-types.ts    — Monster type definitions
      monster-db.ts       — Static monster database (~90 types)
      monster-ai.ts       — AI behaviors (melee, ranged, caster, thief, summoner)
      spawning.ts         — Monster placement per floor depth
    spells/
      spell-types.ts      — Spell type definitions
      spell-db.ts         — Static spell database (30 spells)
      casting.ts          — Mana cost, targeting, effect resolution
      effects.ts          — Spell effect implementations (damage, heal, buff, utility)
    character/
      creation.ts         — Character creation flow
      attributes.ts       — STR/INT/CON/DEX and derived stats
      leveling.ts         — XP curve, level-up, HP/MP gains, spell learning
    shops/
      shop-types.ts       — Shop/service type definitions
      trading.ts          — Buy/sell logic, pricing
      services.ts         — Temple, sage, bank services
    town/
      town-map.ts         — Town layout and building placement
      buildings.ts        — Building interaction, interior views
  ui/
    hud.ts                — HP/MP bars, attribute display
    message-log.ts        — Scrolling message display
    menus.ts              — Game menus (file, options)
    dialogs.ts            — Modal dialogs (shop, character info, spell select)
    inventory-ui.ts       — Inventory/equipment screen
    spell-bar.ts          — Quick spell shortcut bar
    death-screen.ts       — RIP tombstone display
    splash-screen.ts      — Title screen, new/load game
    touch-controls.ts     — Virtual d-pad overlay
  data/
    items.ts              — Item data tables
    monsters.ts           — Monster data tables
    spells.ts             — Spell data tables
    tiles.ts              — Tile type definitions and properties
    dungeons.ts           — Dungeon configuration per location
  utils/
    vector.ts             — 2D vector math
    direction.ts          — 8-directional movement helpers
    pathfinding.ts        — A* algorithm
    fov.ts                — Field of view / line of sight calculation
    bresenham.ts          — Line drawing for projectiles
    rng.ts                — Seeded random number generator
    mass.ts               — Weight/bulk calculations
```

## Core Types

```typescript
interface GameState {
  screen: Screen;                    // current screen (splash, creation, game, inventory, death)
  hero: Hero;                        // player character
  currentFloor: number;              // current dungeon floor index
  currentDungeon: DungeonId;         // which dungeon location
  floors: Map<string, Floor>;        // generated floors (key: "dungeonId-floorNum")
  town: TownState;                   // current town state
  messages: Message[];               // message log
  turn: number;                      // global turn counter
  gameTime: number;                  // in-game seconds elapsed
  difficulty: Difficulty;            // difficulty setting
  rngSeed: number;                   // for reproducible generation
}

interface Hero {
  name: string;
  gender: Gender;
  position: Vector2;
  attributes: Attributes;            // base STR/INT/CON/DEX
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  xp: number;
  level: number;
  equipment: Equipment;              // equipped items by slot
  inventory: Container;              // backpack contents
  purse: number;                     // copper pieces
  knownSpells: SpellId[];
  activeEffects: StatusEffect[];     // buffs/debuffs
  resistances: ElementalResistances;
}

interface Floor {
  tiles: Tile[][];                   // 2D grid
  monsters: Monster[];
  items: PlacedItem[];               // items on the ground
  explored: boolean[][];             // fog of war
  width: number;
  height: number;
}

type GameAction =
  | { type: 'move'; direction: Direction }
  | { type: 'attack'; target: Vector2 }
  | { type: 'castSpell'; spellId: SpellId; target?: Vector2 }
  | { type: 'pickupItem' }
  | { type: 'useStairs' }
  | { type: 'openDoor'; position: Vector2 }
  | { type: 'rest' }
  | { type: 'search' }
  | { type: 'useItem'; itemId: string }
  | { type: 'equipItem'; itemId: string }
  | { type: 'unequipItem'; slot: EquipSlot }
  | { type: 'dropItem'; itemId: string }
  | { type: 'enterBuilding'; buildingId: string }
  | { type: 'buyItem'; shopId: string; itemId: string }
  | { type: 'sellItem'; shopId: string; itemId: string }
  | { type: 'save' }
  | { type: 'load' };
```

## Game Loop

```
1. Wait for player input
2. Convert input → GameAction via InputManager
3. Validate action (can the player do this?)
4. Execute action → produce new GameState
5. Check for player death
6. Execute monster turns (each monster: AI decision → action → resolve)
7. Check for player death again
8. Update fog of war / field of view
9. Render new state to DOM
10. Update HUD (HP, MP, stats)
11. Flush message log
12. Return to step 1
```

## Rendering Strategy

- Game map is a CSS Grid or absolutely-positioned div container
- Each visible tile is a `<div>` with a CSS class from the existing sprite sheets
- Only tiles within the viewport are rendered (virtual scrolling for large maps)
- Monsters and items are overlaid on top of floor tiles
- Fog of war: unexplored tiles get `visibility: hidden`, explored-but-not-visible tiles get `opacity: 0.5`
- UI elements (HUD, menus, dialogs) are standard HTML/CSS overlays
- Inventory uses drag-drop API for mouse, tap-select for touch

## Input Mapping

| Input | Mouse | Keyboard | Touch |
|-------|-------|----------|-------|
| Move | Click adjacent tile | Arrow/numpad | Tap adjacent tile or d-pad |
| Move far | Click distant tile (pathfind) | — | Tap distant tile (pathfind) |
| Attack | Click monster | Walk into monster | Tap monster |
| Pickup | Click item on ground | G key | Tap item on ground |
| Cast spell | Click spell bar + click target | Number key + arrow | Tap spell bar + tap target |
| Inventory | Click inventory button | I key | Tap inventory button |
| Equip | Drag to slot | Select + E key | Tap item + tap slot |
| Context | Right-click | — | Long-press |

## Save/Load

- `GameState` serialized to JSON via `JSON.stringify`
- Stored in `localStorage` under key `cotw-save-{slotNumber}`
- Save triggers: manual save action, entering town, using stairs
- Load from splash screen or in-game menu
- Map/Set types converted to arrays for serialization
