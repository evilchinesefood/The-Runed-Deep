# The Runed Deep

A web-based reimagining of the classic 1989 tile-based RPG by Rick Saada. Built from the ground up in TypeScript with Vite, playable on desktop and mobile browsers.

**Play now:** [dev.jdayers.com/rd](https://dev.jdayers.com/rd/)

---

## About

The Runed Deep is a turn-based dungeon crawler set in Norse mythology. You descend 40 floors through an abandoned mine, ancient fortress halls, and a castle of old kings to defeat the fire lord Surtur and avenge your destroyed village.

This project is a full rewrite — not a port. The original game ran on Windows 3.1. This version runs entirely in the browser and works on phones.

---

## Features

### Dungeon
- **40-floor dungeon** with 3 tilesets (Mine, Fortress, Castle) and 7 hand-designed boss floors
- **Procedural generation** — 5 room shapes, locked/secret doors, decorative objects
- **10 trap types** — physical (pit, arrow, dart), elemental (fire, acid, lightning, wind, rune), special (portal, cobweb)
- **Tab auto-explore** — walks to nearest unexplored area, stops at monsters/doors/traps/items, navigates to stairs when fully explored

### Combat & Monsters
- **68 monster types** across 5 AI behaviors (melee, ranged, caster, thief, summoner)
- **Elemental attacks** — monsters deal cold, fire, acid, or drain damage reduced by your resistances
- **Giants throw projectiles** — boulder and ice attacks at range
- **Flee mechanic** — monsters flee at low HP once, then fight to the death
- **Elemental resistances** — cold, fire, lightning, acid, drain — checked on spells, monster abilities, and traps
- **Evasion** — dodge chance from gear affixes

### Magic
- **30 spells** split into two learning paths:
  - **15 auto-learned** on level-up (levels 2–16): healing, light, shield, detection, basic attacks, clairvoyance
  - **14 spellbook-only** (found as loot): teleport, fire ball, ball lightning, resist spells, transmogrify, and more
  - **Time Stop** (NG+ only): freeze all monsters for 10 turns
- **Spell hotkeys** — up to 5 spells bound to number keys
- **Resist spells** — temporarily add +50 elemental resistance

### Items & Equipment
- **100+ item templates** — weapons, armor, potions, scrolls, spellbooks, wands, containers
- **3 material tiers** — regular, elven, and meteoric steel with progressively better stats and enchantment ranges
- **Color-coded rarity** — white (normal), blue (enchanted), purple (blessed), orange (unique), red (cursed)
- **No identification system** — all items show full stats immediately

#### Affix System
- **25 scaled affixes** — each has a base value that scales with the item's enchantment level
- **Offensive:** Sharpness, Might, Vampiric, Spell Power, Thorns, Fire/Frost/Storm Touched
- **Defensive:** Hardened, Fortitude, Magic Resistance, Evasion, Vitality, Regeneration
- **Utility:** Grace, Brilliance, Swiftness, Arcane Well, Arcane Mastery, Fortune
- **Cursed-only:** Blood Price, Soul Drain, Dark Pact, Berserk Fury, Leech — powerful drawbacks that persist when blessed
- **Named items** — items with affixes get suffixes: "of Power", "of the Ancients", "of Legends", "of the Gods", "of Valor"

#### Unique Items
- **18 unique items** — named legendaries with special abilities not found on normal gear
- Includes resist amulets, detection helms, levitation boots, damage-reflection shields, and late-game world-altering items
- Boss kills guarantee a unique drop

#### Blessed & Cursed Items
- **Cursed items** — negative enchantments, freely unequipped, can roll powerful cursed-only affixes
- **Blessed items** — remove curse at the Temple (25g): enchantment flips positive, cursed-only affixes persist as a bonus
- **Blacksmith** — add or reroll affixes, pick from weighted options

### New Game Plus
- Completing the game unlocks a harder NG+ cycle with tougher enemies and better loot
- Affix counts, enchantment ceilings, unique drop rates, and critical affix chances all scale up with each cycle
- The item stash at The Resting Stag carries over between cycles

### Cloud Saves
- **Cross-device sync** — enable cloud saves per slot with a 5-character code
- **Auto-sync** — every save pushes to server; splash screen auto-pulls latest on load
- **Load by code** — enter a code on any device to download a save

### Town
- **9 service buildings** — Inn (Item Stash), Armor Shop, General Store, Weapon Shop, Sage (Enchanter), Magic Shop, Junk Store, Temple, Blacksmith
- **Personal Item Stash** — store items at The Resting Stag; free, unlimited in/out, persists through NG+
- **Shops restock** on floor clear and on death
- **Mark for sale** — tag items in inventory, bulk sell at matching shops

### UI & Polish
- **Rich item tooltips** — effective damage/accuracy/AC with enchantment breakdown, scaled affix values, unique abilities
- **Tab-compare tooltips** — hold Tab while hovering an equippable to compare with your equipped item
- **Character creation** — name, gender, 4 attributes, difficulty, starting spell
- **4 difficulty levels** — Easy, Intermediate, Hard, Impossible
- **18 achievements**
- **18 synthesized sound effects** via Web Audio API
- **Death respawn** — no game over; die → death summary → Continue → respawn in town
- **Click-to-move** with pathfinding
- **Touch controls** — SVG icon buttons, repositionable D-pad + action bar, resize S/M/L
- **Adjust Controls** — move, resize, show/hide D-pad and action buttons from the Commands menu
- **Landscape mode** — full-screen map with overlay HUD, compact controls
- **Mobile spell picker** — alphabetized list, hotkey management, D-pad targeting for directional spells
- **Auto-target** — directional spells auto-fire when only one visible monster is in range
- **Inventory tabs** — Equipment and Inventory tabs, item drawer with actions on mobile and desktop
- **Save/load** — 3 slots + auto-save on stairs/death + cloud sync

---

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
| 1–5 | Quick-cast spell |
| Tab | Auto-explore |
| Tab (hold) | Compare hovered item with equipped |
| F1 | Help |
| F2 | Achievements |
| F3 | Save game |
| F4 | Toggle sound |
| Esc | Close screen |

---

## Tech Stack

- **TypeScript** + **Vite**
- DOM-based rendering with CSS sprite sheets (no canvas)
- 3-layer tile system: floor → ground → entity
- DCSS tileset (CC0 licensed) with custom recolors for material tiers
- Single global `GameState` with pure functional reducers
- Web Audio API for sound synthesis
- localStorage for saves; PHP cloud save backend
- No frameworks, no runtime dependencies

---

## Development

```bash
npm install
npm run dev       # Start dev server
npm run build     # Build for production (outputs to dist/)
```

---

## Project Structure

```
src/
  core/           Game state, actions, game loop, save/load, cloud sync
  data/           Item templates, monster data, spells, affixes, traps
  systems/
    combat/       Melee combat, damage, vampiric, thorns, evasion
    character/    Derived stats, leveling
    dungeon/      Procedural generation, tilesets, boss floors
    inventory/    Equip, pickup, drop, use items
    items/        Loot generation — affixes, scaling, unique items
    monsters/     AI (5 types), spawning
    spells/       All 30 spell implementations
    town/         Town map, shops, services
  ui/             All screens — splash, creation, inventory, shop, spells, services, etc.
  rendering/      Map renderer, HUD, spell animations
  input/          Keyboard + touch input, auto-explore, spell targeting
  utils/          FOV, pathfinding, affix helpers
public/
  api/            Cloud save PHP endpoint
  assets/         Sprite sheets (PNG) — tiles, items, monsters, buildings, spells
  css/sprites/    CSS classes for all sprites
```

---

## Credits

- Original game concept by Rick Saada (Castle of the Winds, 1989)
- Dungeon tileset from [DCSS](https://github.com/crawl/crawl) (CC0)
- Built with [Claude Code](https://claude.ai/claude-code)
