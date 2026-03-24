# The Runed Deep

A web-based reimagining of the classic 1989 tile-based RPG by Rick Saada. Built from the ground up in TypeScript with Vite, playable on desktop and mobile browsers.

**Play now:** [dev.jdayers.com/rd](https://dev.jdayers.com/rd/)

## About

The Runed Deep is a turn-based dungeon crawler set in Norse mythology. You descend 40 floors through an abandoned mine, ancient fortress halls, and a castle of old kings to defeat the fire lord Surtur and avenge your destroyed village.

This project is a full rewrite — not a port. The original game ran on Windows 3.1. This version uses DOM-based rendering with DCSS tileset sprites (CC0), runs entirely in the browser, and works on phones.

## Features

### Dungeon
- **40-floor dungeon** with 3 tilesets (Mine, Fortress, Castle) and 7 hand-designed boss floors
- **Procedural generation** — 5 room shapes, locked/secret doors, decorative objects
- **10 trap types** — physical (pit, arrow, dart), elemental with resistance checks (fire, acid, lightning, wind, rune), special (portal, cobweb)
- **Dungeon decor** — pillars, altars, statues, coffins, fountains, water pools scattered in rooms and boss lairs
- **Tab auto-explore** — walks to nearest unexplored area, stops at monsters/doors/traps/items, navigates to stairs when fully explored

### Combat & Monsters
- **68 monster types** across 5 AI behaviors (melee, ranged, caster, thief, summoner)
- **Flee-once mechanic** — monsters flee at low HP once, then fight to the death
- **Elemental resistances** — cold, fire, lightning, acid, drain — checked on spells, monster abilities, and traps

### Magic
- **30 spells** split into two learning paths:
  - **15 auto-learned** on level-up (levels 2–16): healing, light, shield, detection, basic attacks
  - **15 spellbook-only** (found as dungeon loot): teleport, fire ball, ball lightning, resist spells, transmogrify, and more
- **Spellbooks must be identified** before use — adds strategy to the sage and identify spell
- **Spell hotkeys** — up to 7 spells bound to number keys for quick-cast

### Items & Equipment
- **100+ item templates** — weapons, armor, potions, scrolls, spellbooks, wands, containers
- **3 material tiers** — regular, elven (green sprites), meteoric steel (dark sprites) with scaling enchantment ranges
- **9 unique named items** with special abilities:
  - Amulets of Fire/Frost/Storm/Soul Ward (+75 element resist)
  - Helm of True Sight (reveals all monsters), Helm of Storms (+50% lightning damage)
  - Boots of Levitation (trap immune), Elemental Keystone (+50% all resists)
  - Crown of the Ancients (+10 all stats, +2 HP/MP regen — Surtur drop)
- **13 special enchantments** with NG+ critical variants (life steal, thorns, regen, speed boost, etc.)
- **Enchantment glow system** — blue drop-shadow for enchanted, red for cursed (same base sprite)
- **Cursed items** generate with negative enchantments but can be freely unequipped
- **Auto-identify** potions and scrolls on pickup
- **Item stacking** in inventory display
- **Pack enchantment** affects carry capacity (+5kg per level)
- **All equipment gives AC** — belts, rings, and amulets scale 1/2/3/4 by tier
- **Stat potions** — permanent +1 to STR/INT/CON/DEX, boosted drop rate from floor 5+

### Town
- **9 service buildings** — Inn, Armor Shop, General Store, Weapon Shop, Sage, Magic Shop, Junk Store, Temple, Bank
- **Decorative buildings** — Keep, Silo, Wall Pieces, Huts
- **Water feature**, sign posts at building entrances
- **Town layout** built with visual map builder tool, exported as exact tile data

### UI & Polish
- **Stone Slab button style** — dark stone gradient, gold text, 3D pressed border (inspired by game logo)
- **Color-coded messages** — combat (orange), important (green), system (grey), normal (light grey)
- **Bold white numbers** in all chat messages for readability
- **Rich item tooltips** — effective damage/accuracy/AC with enchantment breakdown, equip slot, floor range, unique abilities
- **Enchantment glow** on item sprites in inventory, paperdoll, and shop screens
- **Auto-explore feedback** — messages explain every stop reason (monster spotted, low HP, item found, door, trap, fully explored)
- **Character creation** — name, gender, 4 attributes with hold-to-repeat buttons, difficulty, starting spell
- **4 difficulty levels** — Easy, Intermediate, Hard, Impossible
- **New Game Plus** with scaling difficulty and enhanced loot (meteoric items scale +5 per cycle)
- **Scoring and leaderboard** persisted to localStorage
- **18 achievements**
- **18 synthesized sound effects** via Web Audio API
- **Responsive layout** — scales to phone, tablet, and desktop
- **Touch controls** — D-pad and action buttons for mobile play
- **Click-to-move** with A* pathfinding
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
| Tab | Auto-explore (navigates to stairs when done) |
| F1 | Help |
| F2 | Achievements |
| F3 | Save game |
| F4 | Toggle sound |
| Esc | Close screen |

## Tech Stack

- **TypeScript** + **Vite**
- DOM-based rendering with CSS sprite sheets (no canvas for the game map)
- 3-layer tile system: floor → ground (items/doors/traps/decor) → entity (hero/monsters)
- Building sprites rendered as positioned overlays above tiles, below entities
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

| Tool | Purpose |
|------|---------|
| `items.html` | Item browser — sprite preview, notes, unused sprite detection (checks code refs) |
| `tiles.html` | Tile browser — original vs DCSS sprite comparison with notes |
| `buildings.html` | Building sprite browser — auto-detects regions, click to add notes |
| `monsters.html` | Monster sprite preview |
| `mapbuilder.html` | Visual town map builder — place tiles/buildings, set entrances, export T,y,x,sprite format |
| `styleguide.html` | Button style guide — 5 theme options with variants |

## Deployment

Build and copy `dist/` to any static web server. No server runtime required.

```bash
npx vite build --base /rd/    # For subdirectory deploy
```

Currently deployed via SFTP to `dev.jdayers.com/rd/`.

## Project Structure

```
src/
  core/           Game state, actions, game loop, save/load with migrations
  data/           Item templates, monster data, spells, enchantments, traps
  systems/
    combat/       Melee combat, armor, damage, thorns reflect
    character/    Derived stats (AC, resistances, unique items), leveling, spell learning
    dungeon/      Procedural generation, tilesets, boss floors, decorative objects
    inventory/    Equip, pickup, drop, use items, display names, item glow
    items/        Loot generation — enchantments, specials, unique items, tier weighting
    monsters/     AI (5 types), spawning, flee-once mechanic
    spells/       All 30 spell implementations including resist buffs
    town/         Town map (exact tile data), shops, services (temple, sage, bank, inn)
  ui/             All screens — splash, creation, inventory, shop, spells, services, etc.
  rendering/      Map renderer (3-layer + building overlays + decor), HUD, spell animations
  input/          Keyboard + touch input, auto-explore, spell targeting
  utils/          FOV, pathfinding, enchantment helpers
public/
  assets/         Sprite sheets (PNG) — tiles, items, monsters, buildings, spells
  css/sprites/    CSS classes for all sprites
```

## Credits

- Original game concept by Rick Saada (Castle of the Winds, 1989)
- Dungeon tileset from [DCSS](https://github.com/crawl/crawl) (CC0)
- Built with [Claude Code](https://claude.ai/claude-code)
