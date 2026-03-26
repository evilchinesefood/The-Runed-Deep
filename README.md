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
- **Tab auto-explore** — walks to nearest unexplored area, stops at monsters/doors/traps/items, navigates to stairs when fully explored, seeks out secret doors when no path to next floor

### Combat & Monsters
- **68 monster types** across 5 AI behaviors (melee, ranged, caster, thief, summoner)
- **Elemental melee attacks** — 15+ monsters deal cold, fire, acid, or drain damage on hit (reduced by resistances)
- **Drain resistance** — Soul Ward amulet and drain resist reduce drain-stat, drain-level, and drain-hp chances
- **Giants throw projectiles** — Hill Giants, Frost Giants, Fire Giants, and their bosses use ranged boulder/ice attacks
- **Flee-once mechanic** — monsters flee at low HP once, then fight to the death
- **Elemental resistances** — cold, fire, lightning, acid, drain — checked on spells, monster abilities, melee touches, and traps
- **Evasion system** — dodge chance from gear affixes

### Magic
- **30 spells** split into two learning paths:
  - **15 auto-learned** on level-up (levels 2–16): healing, light, shield, detection, basic attacks
  - **15 spellbook-only** (found as dungeon loot): teleport, fire ball, ball lightning, resist spells, transmogrify, and more
- **Spellbooks must be identified** before use — adds strategy to the sage and identify spell
- **Spell hotkeys** — up to 5 spells bound to number keys for quick-cast
- **Resist spells** — add +50 elemental resistance via active effects, properly computed and expired

### Items & Equipment
- **100+ item templates** — weapons, armor, potions, scrolls, spellbooks, wands, containers
- **3 material tiers** — regular, elven (green sprites), meteoric steel (dark sprites) with scaling enchantment ranges

#### Affix System
- **20 scaled affixes** — each has a base value that scales with the item's +N enchantment level
- **Offensive:** Sharpness (+dmg, weapons only), Might (+STR), Vampiric (% heal), Spell Power, Thorns, Fire/Frost/Storm Touched
- **Defensive:** Hardened (+AC, armor only), Fortitude (+CON), Magic Resistance, Evasion, Vitality (+HP), Regeneration
- **Utility:** Grace (+DEX), Brilliance (+INT), Swiftness (% extra actions), Arcane Well (+MP), Arcane Mastery (-MP cost + MP regen), Fortune (+gold/XP/drops)
- **Weighted drops** — Sharpness and Hardened have 3x drop weight on their respective item types
- **Weapon/armor context** — weapon-only and armor-only affixes filtered during generation
- **Named items** — items with affixes get suffixes: "of Power", "of the Ancients", "of Legends", "of the Gods", "of Valor"
- **Color-coded rarity** — white (normal), blue (enchanted), orange (legendary/unique), red (cursed), gray (unidentified)

#### 18 Unique Items
| Item | Slot | Ability |
|------|------|---------|
| Amulet of Fire/Frost/Storm/Soul Ward | Amulet | +75% element resist (10% chance: 99%) |
| Helm of True Sight | Helmet | Reveals monsters on explored tiles |
| Helm of Storms | Helmet | +75 lightning resist, +50% lightning damage |
| Boots of Levitation | Boots | Immune to pit/portal traps |
| Elemental Keystone | Amulet | +50% all resists, trap + poison immune |
| Crown of the Ancients | Amulet | +10 all stats, +2 HP/MP regen/turn |
| Ring of Fortune | Ring | Double gold, +25% item drops |
| Cloak of Shadows | Cloak | Monsters detect 3 tiles later |
| Belt of the Titan | Belt | +30 CON, carry capacity doubled |
| Blooddrinker | Weapon | Heals 30% of all damage dealt |
| Ring of the Archmage | Ring | +30 INT, spells cost 25% less MP |
| Aegis of the Fallen | Shield | +10 AC, reflect 30% melee damage |
| Gauntlets of the Forge | Gauntlets | +20 STR, fire attacks +50% |
| Demonhide Armor | Body | +15 AC, +50 fire/cold resist, 25% thorns |
| Worldsplitter | Weapon (2H) | Highest base damage, hits all adjacent enemies |

- All uniques always roll +5 minimum enchantment and 2+ random affixes
- Boss kills guarantee a unique drop (always in NG+, F30+ otherwise)
- **Enchantment glow system** — blue glow for enchanted, red for cursed, orange for legendary/unique
- **Cursed items** generate with negative enchantments but can be freely unequipped
- **Auto-identify** potions and scrolls on pickup
- **Tab-compare tooltips** — hold Tab while hovering an equippable item to see it side-by-side with your equipped item
- **Pack enchantment** affects carry capacity (+5kg per level)
- **Stat potions** — permanent +1 to STR/INT/CON/DEX, boosted drop rate from floor 5+

### New Game Plus
- Affix cap scales: 5 / 7 / 9 / unlimited (+2 per NG cycle)
- Critical affix chance: 0% / 20% / 30% / 40% (doubled effect)
- Meteoric enchantment range: +8 / +15 / +20 / +25
- Unique items scale: min enchant +5/+7/+9/+10, min affixes 2/3/4/5
- Boss guaranteed unique drops in all NG+ cycles
- Unique drop rate bonus: +50% / +100% / +150% per NG level

### Cloud Saves
- **Cross-device sync** — enable cloud saves per slot with a 5-character code
- **Auto-sync** — every save pushes to server, loading pulls latest
- **Load by code** — enter a code on any device to download a save
- PHP backend with rate limiting, save validation, flat-file storage

### Town
- **9 service buildings** — Inn, Armor Shop, General Store, Weapon Shop, Sage, Magic Shop, Junk Store, Temple, Bank
- **Decorative buildings** — Keep, Silo, Wall Pieces, Huts
- **Water feature**, sign posts at building entrances
- **Town layout** built with visual map builder tool, exported as exact tile data

### UI & Polish
- **Stone Slab button style** — dark stone gradient, gold text, 3D pressed border
- **Color-coded messages** — combat (orange), important (green), system (grey), normal (light grey)
- **Bold white numbers** in all chat messages for readability
- **Rich item tooltips** — effective damage/accuracy/AC with enchantment breakdown, scaled affix values, unique abilities
- **Auto-explore feedback** — messages explain every stop reason (monster spotted, low HP, item found, door, trap, fully explored)
- **Character creation** — name, gender, 4 attributes with hold-to-repeat buttons, difficulty, starting spell
- **4 difficulty levels** — Easy, Intermediate, Hard, Impossible
- **Scoring and leaderboard** persisted to localStorage
- **18 achievements**
- **18 synthesized sound effects** via Web Audio API
- **Responsive layout** — scales to phone, tablet, and desktop
- **Touch controls** — SVG icon buttons, hideable D-pad, portrait 2-wide grid layout
- **Mobile detail drawer** — tap inventory items for full tooltip + compare + Equip/Use/Drop buttons
- **Commands menu** — access Character, Help, Achievements, Save, Sound, Debug from touch
- **Action button attacks** adjacent monsters on mobile
- **Portrait viewport** shrinks 25% to prevent overlap with touch controls
- **Click-to-move** with A* pathfinding
- **Save/load** — 3 slots + auto-save on stairs + cloud sync

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
| 1-5 | Quick-cast spell |
| Tab | Auto-explore (navigates to stairs when done) |
| Tab (hold) | Compare hovered item with equipped |
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
- PHP cloud save backend with rate limiting
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

Build and copy `dist/` to any static web server. The cloud save PHP endpoint needs a PHP-capable server.

```bash
npx vite build --base /rd/    # For subdirectory deploy
```

Currently deployed via SFTP to `dev.jdayers.com/rd/`.

## Project Structure

```
src/
  core/           Game state, actions, game loop, save/load, cloud sync
  data/           Item templates, monster data, spells, affixes, traps
  systems/
    combat/       Melee combat, armor, damage, vampiric heal, thorns, evasion
    character/    Derived stats (AC, resistances, affix bonuses, uniques), leveling
    dungeon/      Procedural generation, tilesets, boss floors, decorative objects
    inventory/    Equip, pickup, drop, use items, display names, item glow
    items/        Loot generation — affixes, scaling, unique items, tier weighting
    monsters/     AI (5 types), spawning, flee-once mechanic
    spells/       All 30 spell implementations including resist buffs
    town/         Town map (exact tile data), shops, services (temple, sage, bank, inn)
  ui/             All screens — splash, creation, inventory, shop, spells, services, etc.
  rendering/      Map renderer (3-layer + building overlays + decor), HUD, spell animations
  input/          Keyboard + touch input, auto-explore, spell targeting
  utils/          FOV, pathfinding, affix helpers
public/
  api/            Cloud save PHP endpoint
  assets/         Sprite sheets (PNG) — tiles, items, monsters, buildings, spells
  css/sprites/    CSS classes for all sprites
```

## Credits

- Original game concept by Rick Saada (Castle of the Winds, 1989)
- Dungeon tileset from [DCSS](https://github.com/crawl/crawl) (CC0)
- Built with [Claude Code](https://claude.ai/claude-code)
