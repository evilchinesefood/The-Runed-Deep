# The Runed Deep

A web-based reimagining of the classic 1989 tile-based RPG by Rick Saada. Built from the ground up in TypeScript with Vite, playable on desktop and mobile browsers.

**Play now:** [dev.jdayers.com/rd](https://dev.jdayers.com/rd/)

## About

The Runed Deep is a turn-based dungeon crawler set in Norse mythology. You descend 40 floors through an abandoned mine, ancient fortress halls, and a castle of old kings to defeat the fire lord Surtur and avenge your destroyed village.

This project is a full rewrite — not a port. The original game ran on Windows 3.1. This version uses DOM-based rendering with DCSS tileset sprites (CC0), runs entirely in the browser, and works on phones.

## Features

- **40-floor dungeon** with 3 tilesets (Mine, Fortress, Castle) and 7 hand-designed boss floors
- **68 monster types** across 5 AI behaviors (melee, ranged, caster, thief, summoner)
- **30 spells** — attack bolts/balls, healing, buffs, teleportation, detection, light
- **100+ item templates** — weapons, armor, potions, scrolls, spellbooks, wands, containers, unique items
- **Material tiers** — regular, elven (green), and meteoric steel (dark) with scaling enchantment ranges
- **9 unique named items** — resist amulets, Helm of True Sight, Helm of Storms, Boots of Levitation, Elemental Keystone, Crown of the Ancients
- **13 special enchantments** with critical variants (life steal, thorns, regen, speed boost, etc.)
- **Enchantment glow system** — blue drop-shadow for enchanted, red for cursed (same base sprite)
- **10 trap types** — physical (pit, arrow, dart), elemental with resistance checks (fire, acid, lightning, wind, rune), special (portal, cobweb)
- **Unidentified items** — generic names and sprites until identified by spell, scroll, or sage
- **Auto-identify** potions and scrolls on pickup
- **Item stacking** in inventory and shop displays
- **Town** with 9 service buildings, decorations, water feature, and sign posts
- **Map builder** dev tool for visual town layout editing
- **Character creation** — name, gender, 4 attributes, difficulty, starting spell
- **4 difficulty levels** — Easy, Intermediate, Hard, Impossible
- **New Game Plus** with scaling difficulty and enhanced loot
- **Procedural dungeon generation** — 5 room shapes, locked/secret doors, traps
- **Scoring and leaderboard** persisted to localStorage
- **18 achievements**
- **18 synthesized sound effects** via Web Audio API
- **Responsive layout** — scales to phone, tablet, and desktop
- **Touch controls** — D-pad and action buttons for mobile play
- **Click-to-move** with A* pathfinding
- **Tab auto-explore** — walks to the nearest unexplored area, stops at doors and items
- **Save/load** — 3 slots + auto-save on stairs

## Controls

| Key | Action |
|-----|--------|
| WASD / Arrows / Numpad | Move (8 directions) |
| E | Context action (pickup, stairs, enter, search) |
| G | Pick up item |
| Q | Wait / rest |
| I | Inventory |
| C | Character info |
| Z | Spell hotkey management |
| M | Minimap |
| 1-7 | Quick-cast spell |
| Tab | Auto-explore |
| F1 | Help |
| F2 | Achievements |
| F3 | Save game |
| F4 | Toggle sound |
| Esc | Close screen |

## Tech Stack

- **TypeScript** + **Vite**
- DOM-based rendering with CSS sprite sheets (no canvas for the game map)
- DCSS tileset (CC0 licensed) with custom recolors for material tiers
- Single global `GameState` with pure functional reducers
- Turn-based game loop: player acts → level-ups → tick effects → monsters act → render
- Web Audio API for sound synthesis
- localStorage for saves, leaderboard, and achievements
- No frameworks, no runtime dependencies

## Development

```bash
npm install
npm run dev       # Start dev server
npm run build     # Build for production (outputs to dist/)
```

### Dev Tools

The project includes several browser-based dev tools (gitignored, not deployed):

- `items.html` — Item browser with sprite preview, notes system, unused sprite detection
- `tiles.html` — Tile browser comparing original vs DCSS sprites
- `buildings.html` — Building sprite browser with notes
- `monsters.html` — Monster sprite preview
- `mapbuilder.html` — Visual town map builder with tile/building placement and code export

## Deployment

Run `npm run build` and copy the contents of `dist/` to any static web server. No server runtime required.

If deploying to a subdirectory (e.g. `/rd/`), build with:

```bash
npx vite build --base /rd/
```

## Project Structure

```
src/
  core/           Game state, actions, game loop, save/load
  data/           Item templates, monster data, spells, enchantments, traps
  systems/
    combat/       Melee combat, armor, damage
    character/    Derived stats, leveling, spell learning
    dungeon/      Procedural generation, tilesets, boss floors
    inventory/    Equip, pickup, drop, use items, display names, item glow
    items/        Loot generation with unique item support
    monsters/     AI (5 types), spawning, flee-once mechanic
    spells/       All 30 spell implementations
    town/         Town map (builder-exported), shops, services
  ui/             All screens (splash, creation, inventory, shop, spells, etc.)
  rendering/      Map renderer (3-layer + building overlays), HUD, spell animations
  input/          Keyboard + touch input
  utils/          FOV, pathfinding, enchantment helpers
public/
  assets/         Sprite sheets (PNG) — tiles, items, monsters, buildings, spells
  css/sprites/    CSS classes for all sprites
```

## Credits

- Original game concept by Rick Saada (Castle of the Winds, 1989)
- Dungeon tileset from [DCSS](https://github.com/crawl/crawl) (CC0)
- Built with Claude Code
