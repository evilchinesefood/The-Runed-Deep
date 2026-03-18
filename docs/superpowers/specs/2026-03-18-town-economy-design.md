# Town & Economy — Design Spec

## Overview

Add a walkable town map with 9 buildings providing shops and services. Town connects to the dungeon via Rune of Return spell, scroll, or ascending past floor 0. Completes the core gameplay loop: dungeon → loot → town → sell/buy/heal → dungeon.

## Town Map

Fixed 25x20 tile layout using existing building sprites. Pre-explored, always visible, no monsters, no fog of war. Uses grass/path ground tiles. Stored as `floors['town-0']` in the existing Floor structure.

### Buildings

| Building | Category | Position | Function |
|----------|----------|----------|----------|
| Weapon Shop | shop | NW | Buy/sell weapons |
| Armor Shop | shop | NE | Buy/sell armor, shields, helmets, equipment |
| General Store | shop | W | Buy/sell potions, scrolls, rings, amulets, misc |
| Magic Shop | shop | E | Buy/sell spellbooks, wands, staffs |
| Junk Store (Olaf's) | shop | SW | Buys anything, sells random cheap items |
| Temple of Odin | service | N-center | Heal, remove curse, cure poison |
| Sage | service | SE | Identify items |
| Bank | service | S-center | Deposit/withdraw copper |
| Inn | service | CE | Full rest to max HP/MP |

Player enters a building by stepping onto it (like stairs). Opens the building's UI screen. Esc returns to town map.

## Shop System

### Shop UI

Two-panel layout:
- **Left**: Shop inventory (items for sale). Each row: sprite, name, buy price, [Buy] button.
- **Right**: Player inventory (items to sell). Each row: sprite, name, sell price, [Sell] button.
- Copper balance always visible at top.
- Scrollable panels.

### Pricing

| Shop | On-category buy | On-category sell | Off-category sell |
|------|----------------|-----------------|-------------------|
| Weapon Shop | 100% value | 60% value | 30% value |
| Armor Shop | 100% value | 60% value | 30% value |
| General Store | 100% value | 50% value | 35% value |
| Magic Shop | 120% value | 55% value | 25% value |
| Junk Store | 80% value | 40% value | 40% value |

### Category Mapping

- Weapon Shop: `weapon`
- Armor Shop: `armor`, `shield`, `helmet`, `cloak`, `bracers`, `gauntlets`, `boots`, `belt`
- General Store: `potion`, `scroll`, `ring`, `amulet`, `currency`, `misc`, `container`
- Magic Shop: `spellbook`, `wand`, `staff`
- Junk Store: everything (universal fallback)

### Inventory Management

- Shops start with 8-12 items appropriate to their category, scaled to deepest floor reached.
- Items sold by the player appear in that shop's inventory (buyback).
- Every town visit, shops add 1-3 new random items (depth-scaled).
- Max 20 items per shop.

## Services

### Temple of Odin

- Heal to full HP — `3 + ceil(missingHP * 0.5)` copper
- Heal to full MP — `3 + ceil(missingMP * 0.75)` copper
- Remove Curse — 50 copper
- Cure Poison — 25 copper
- Buttons greyed out if can't afford or not needed.

### Sage

- Lists all unidentified items in inventory and equipment.
- Identify one item — 30 copper.
- Identify all — 25 * count copper (bulk discount).

### Bank

- Shows copper on hand + copper in bank.
- Deposit (amount or all) / Withdraw (amount or all).
- Bank copper stored in `TownState.bankBalance`.
- Bank copper preserved on death.

### Inn

- "Rest for the night" — full HP/MP, costs 20 copper.
- One button. Greyed out if full or can't afford.

All services show copper balance at top, update live after transactions.

## Town Access (Rune of Return)

### Entering Town

- Ascending past floor 0 (stairs-up on floor 0) → teleport to town.
- Casting Rune of Return spell in dungeon → teleport to town.
- Using Scroll of Rune of Return → teleport to town.
- Already in town → message "You are already in town."

### Leaving Town

- Walking onto dungeon entrance tile at town edge → return to stairs-up on the floor player left from.
- If no dungeon floor visited yet → floor 0.

### State

- `GameState.returnFloor: number` — floor player left from.
- Enter town: set `currentDungeon = 'town'`, `currentFloor = 0`, save `returnFloor`.
- Leave town: restore `currentDungeon = 'mine'`, `currentFloor = returnFloor`, place at stairs-up.

### New Scroll

Add `scroll-rune-of-return` to items.ts scroll templates.

## Data & State Changes

### Types

`GameState` — add `returnFloor: number`.
`TownState` — add `deepestFloor: number`.

### New Files

| File | Purpose |
|------|---------|
| `src/systems/town/TownMap.ts` | Generate fixed town map layout |
| `src/systems/town/Shops.ts` | Shop inventory generation, buy/sell, pricing |
| `src/systems/town/Services.ts` | Temple, sage, bank, inn logic |
| `src/ui/ShopScreen.ts` | Buy/sell UI (shared by all 5 shops) |
| `src/ui/ServiceScreen.ts` | Service UI (shared by temple, sage, bank, inn) |

### Modified Files

| File | Change |
|------|--------|
| `src/core/types.ts` | Add returnFloor, deepestFloor |
| `src/core/game-state.ts` | Initialize new fields |
| `src/core/actions.ts` | Handle enterBuilding, town entrance/exit |
| `src/systems/spells/casting.ts` | Rune of Return → teleport to town |
| `src/data/items.ts` | Add scroll-rune-of-return |
| `src/main.ts` | Shop/service screen cases in switchScreen |
| `src/rendering/map-renderer.ts` | Town buildings as overlay tiles |
| `src/input/input-manager.ts` | Enter on building triggers enterBuilding |
