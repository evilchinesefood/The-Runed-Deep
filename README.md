# Castle of the Winds

A web-based reimagining of the classic 1989 tile-based RPG by Rick Saada. Built from the ground up in TypeScript with Vite, playable on desktop and mobile browsers.

**Play now:** [dev.jdayers.com/cotw](https://dev.jdayers.com/cotw/)

## About

Castle of the Winds is a turn-based dungeon crawler set in Norse mythology. You descend 40 floors through an abandoned mine, ancient fortress halls, and a castle of old kings to defeat the fire lord Surtur and avenge your destroyed village.

This project is a full rewrite — not a port. The original game ran on Windows 3.1. This version uses DOM-based rendering with the original CSS sprite sheets, runs entirely in the browser, and works on phones.

## Features

- **40-floor dungeon** with 3 tilesets (Mine, Fortress, Castle) and 7 hand-designed boss floors
- **68 monster types** across 5 AI behaviors (melee, ranged, caster, thief, summoner)
- **30 spells** — attack bolts/balls, healing, buffs, teleportation, detection, light
- **80+ item templates** — weapons, armor, potions, scrolls, spellbooks, wands, containers
- **Material tiers** — regular, elven, and meteoric steel with scaling enchantment ranges
- **13 special enchantments** with critical variants (life steal, thorns, regen, speed boost, etc.)
- **Cursed items** that can't be unequipped without Remove Curse
- **Unidentified items** — generic names and sprites until identified by spell, scroll, or sage
- **Town** with 5 shops, temple, sage, bank, and inn
- **Character creation** — name, gender, 4 attributes, difficulty, starting spell
- **4 difficulty levels** — Easy, Intermediate, Hard, Impossible
- **New Game Plus** with scaling difficulty and enhanced loot (meteoric items scale +5 per cycle)
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

## Deployment

Run `npm run build` and copy the contents of `dist/` to any static web server. No server runtime required.

If deploying to a subdirectory (e.g. `/cotw/`), build with:

```bash
npx vite build --base /cotw/
```

## Project Structure

```
src/
  core/           Game state, actions, game loop, save/load
  data/           Item templates, monster data, spells, enchantments, traps
  systems/
    combat/       Melee combat, armor, damage
    character/    Derived stats, leveling
    dungeon/      Procedural generation, tilesets, boss floors
    inventory/    Equip, pickup, drop, use items
    items/        Loot generation
    monsters/     AI, spawning
    spells/       All 30 spell implementations
    town/         Town map, shops, services
  ui/             All screens (splash, creation, inventory, shop, spells, etc.)
  rendering/      Map renderer, HUD, spell animations
  input/          Keyboard + touch input
  utils/          FOV, pathfinding, shared helpers
public/
  assets/         Sprite sheets (PNG)
  css/sprites/    CSS classes for all tiles, items, monsters, buildings
```
