# Town & Economy Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a walkable town with 9 buildings (5 shops + 4 services), buy/sell system, Rune of Return teleport, and full economy loop.

**Architecture:** Town is a fixed-layout Floor stored as `floors['town-0']`. Buildings are tiles with `buildingId` that trigger `enterBuilding` actions. Shop/service screens are new UI screens using the existing Theme system. Shop inventories persist in TownState and restock on each visit.

**Tech Stack:** TypeScript, Vite, DOM rendering, existing Theme/Panel/Button system

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/systems/town/TownMap.ts` | Generate fixed town map with 9 buildings |
| Create | `src/systems/town/Shops.ts` | Shop inventory gen, buy/sell logic, pricing, restock |
| Create | `src/systems/town/Services.ts` | Temple/sage/bank/inn logic functions |
| Create | `src/ui/ShopScreen.ts` | Two-panel buy/sell UI for all 5 shops |
| Create | `src/ui/ServiceScreen.ts` | Service UI for temple/sage/bank/inn |
| Modify | `src/core/types.ts` | Add returnFloor, deepestFloor, DungeonId update, Screen update |
| Modify | `src/core/game-state.ts` | Initialize new fields |
| Modify | `src/core/actions.ts` | enterBuilding action, town enter/exit logic |
| Modify | `src/systems/spells/casting.ts` | Rune of Return teleports to town |
| Modify | `src/data/items.ts` | Add scroll-rune-of-return |
| Modify | `src/main.ts` | Add shop/service screen cases |
| Modify | `src/rendering/map-renderer.ts` | Buildings render as overlay tiles |

---

### Task 1: Type & State Changes

**Files:**
- Modify: `src/core/types.ts`
- Modify: `src/core/game-state.ts`

- [ ] **Step 1: Update types**

In `src/core/types.ts`:

Add `'town'` to `DungeonId`:
```ts
export type DungeonId = 'mine' | 'fortress' | 'castle' | 'town';
```

Add `'shop'` and `'service'` to `Screen`:
```ts
| 'shop'
| 'service'
```

Add to `GameState`:
```ts
returnFloor: number;         // dungeon floor to return to from town
activeBuildingId: string;    // which building the player entered
```

Add to `TownState`:
```ts
deepestFloor: number;
```

Add `buildingId` to `Tile` (already has `buildingId?: string` — verify it exists).

- [ ] **Step 2: Update game-state.ts defaults**

In `createInitialGameState`, add:
```ts
returnFloor: 0,
activeBuildingId: '',
```

In `createDefaultTown`, add `deepestFloor: 0`.

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`

---

### Task 2: Town Map Generator

**Files:**
- Create: `src/systems/town/TownMap.ts`

- [ ] **Step 1: Create TownMap.ts**

Generate a fixed 25x20 town map. All tiles pre-explored and visible. Ground is grass/path tiles. Buildings placed at fixed positions with `buildingId` set on the tile.

Layout:
```
Row 0-1:  town-wall border
Row 2-4:  Temple(center), Weapon Shop(left), Armor Shop(right)
Row 5-8:  General Store(left), paths, Magic Shop(right)
Row 9-12: Inn(center-right), open area with paths
Row 13-15: Sage(right), Bank(center)
Row 16-17: Junk Store(left), dungeon entrance(center)
Row 18-19: town-wall border
```

Each building is a single tile with:
- `type: 'building'`
- `sprite`: appropriate building CSS class
- `walkable: true`
- `transparent: true`
- `buildingId`: 'weapon-shop', 'armor-shop', 'general-store', 'magic-shop', 'junk-store', 'temple', 'sage', 'bank', 'inn'

Add `'building'` to `TileType` in types.ts.

The dungeon entrance tile uses `type: 'stairs-down'` with `sprite: 'mine-entrance'`.

Function signature:
```ts
export function generateTownMap(): { floor: Floor; playerStart: Vector2 }
```

Returns a Floor with all tiles explored, visible, no monsters, no items.

- [ ] **Step 2: Verify build**

---

### Task 3: Shop System Logic

**Files:**
- Create: `src/systems/town/Shops.ts`

- [ ] **Step 1: Create Shops.ts**

```ts
import type { GameState, Item } from '../../core/types';
import { getItemsForDepth, ALL_ITEM_TEMPLATES, ITEM_BY_ID } from '../../data/items';
import { createItemFromTemplate } from '../items/loot';
```

**Shop definitions:**
```ts
interface ShopDef {
  id: string;
  name: string;
  categories: string[];  // item categories this shop deals in
  buyMult: number;       // buy price = value * buyMult
  sellOnCategory: number;  // sell price for matching items
  sellOffCategory: number; // sell price for non-matching items
}

const SHOPS: Record<string, ShopDef> = {
  'weapon-shop': { id: 'weapon-shop', name: 'Weapon Shop', categories: ['weapon'], buyMult: 1.0, sellOnCategory: 0.6, sellOffCategory: 0.3 },
  'armor-shop': { id: 'armor-shop', name: 'Armor Shop', categories: ['armor','shield','helmet','cloak','bracers','gauntlets','boots','belt'], buyMult: 1.0, sellOnCategory: 0.6, sellOffCategory: 0.3 },
  'general-store': { id: 'general-store', name: 'General Store', categories: ['potion','scroll','ring','amulet','misc','container'], buyMult: 1.0, sellOnCategory: 0.5, sellOffCategory: 0.35 },
  'magic-shop': { id: 'magic-shop', name: 'Magic Shop', categories: ['spellbook','wand','staff'], buyMult: 1.2, sellOnCategory: 0.55, sellOffCategory: 0.25 },
  'junk-store': { id: 'junk-store', name: "Olaf's Junk Store", categories: [], buyMult: 0.8, sellOnCategory: 0.4, sellOffCategory: 0.4 },
};
```

**Functions:**

`getShopDef(shopId: string): ShopDef`

`getBuyPrice(item: Item, shopId: string): number` — returns `Math.ceil(item.value * shopDef.buyMult)`

`getSellPrice(item: Item, shopId: string): number` — checks if item category matches shop categories. If yes: `Math.floor(item.value * sellOnCategory)`. If no: `Math.floor(item.value * sellOffCategory)`. Junk store always uses sellOffCategory (0.4) since categories is empty. Minimum sell price: 1.

`initShopInventory(shopId: string, depth: number): Item[]` — generates 8-12 random items from the shop's categories, scaled to depth. Each item is identified.

`restockShop(currentItems: Item[], shopId: string, depth: number): Item[]` — adds 1-3 new items if under 20 max. Returns updated array.

`buyItem(state: GameState, shopId: string, itemId: string): GameState` — removes item from shop inventory, adds to hero inventory, deducts copper. Returns updated state with messages.

`sellItem(state: GameState, shopId: string, itemId: string): GameState` — removes from hero inventory, adds to shop inventory (for buyback), adds copper. Returns updated state with messages.

- [ ] **Step 2: Verify build**

---

### Task 4: Services Logic

**Files:**
- Create: `src/systems/town/Services.ts`

- [ ] **Step 1: Create Services.ts**

Pure functions that take state and return state.

**Temple of Odin:**
```ts
export function templeHealHP(state: GameState): GameState
// Cost: 3 + ceil(missingHP * 0.5)
// Heals to max HP

export function templeHealMP(state: GameState): GameState
// Cost: 3 + ceil(missingMP * 0.75)

export function templeRemoveCurse(state: GameState): GameState
// Cost: 50. Removes curse from first cursed equipped item.

export function templeCurePoison(state: GameState): GameState
// Cost: 25. Removes poisoned effect.
```

**Sage:**
```ts
export function sageIdentifyOne(state: GameState, itemId: string): GameState
// Cost: 30. Sets identified = true on the item.

export function sageIdentifyAll(state: GameState): GameState
// Cost: 25 * count of unidentified items.
```

**Bank:**
```ts
export function bankDeposit(state: GameState, amount: number): GameState
// Moves copper from hero to town.bankBalance.

export function bankWithdraw(state: GameState, amount: number): GameState
// Moves copper from town.bankBalance to hero.
```

**Inn:**
```ts
export function innRest(state: GameState): GameState
// Cost: 20. Heals HP and MP to max.
```

All functions check if hero has enough copper and return unmodified state with error message if not.

- [ ] **Step 2: Verify build**

---

### Task 5: Shop UI Screen

**Files:**
- Create: `src/ui/ShopScreen.ts`

- [ ] **Step 1: Create ShopScreen.ts**

```ts
import { createScreen, createTitleBar, createPanel, createButton, el } from './Theme';
import { getShopDef, getBuyPrice, getSellPrice, buyItem, sellItem } from '../systems/town/Shops';
import { getDisplayName } from '../systems/inventory/display-name';
import { attachItemTooltip, hideItemTooltip } from './item-tooltip';
```

Function signature:
```ts
export function createShopScreen(
  state: GameState,
  shopId: string,
  onTransaction: (newState: GameState) => void,
  onClose: () => void,
): HTMLElement & { cleanup: () => void }
```

Layout:
- Title bar with shop name + copper balance
- Two-panel flex row:
  - Left panel "FOR SALE": shop items with [Buy] buttons and buy prices
  - Right panel "YOUR ITEMS": hero inventory with [Sell] buttons and sell prices
- Each item row: 32px sprite, display name, price, action button
- Copper updates after each transaction via `onTransaction` re-render
- Scrollable panels (max-height: 400px)
- Esc or close button returns to town

- [ ] **Step 2: Verify build**

---

### Task 6: Service UI Screen

**Files:**
- Create: `src/ui/ServiceScreen.ts`

- [ ] **Step 1: Create ServiceScreen.ts**

A single screen component that renders differently based on the building ID.

```ts
export function createServiceScreen(
  state: GameState,
  buildingId: string,
  onUpdate: (newState: GameState) => void,
  onClose: () => void,
): HTMLElement & { cleanup: () => void }
```

**Temple** — 4 action buttons with costs:
- "Heal HP (N copper)" — calls templeHealHP
- "Heal MP (N copper)" — calls templeHealMP
- "Remove Curse (50 copper)" — calls templeRemoveCurse
- "Cure Poison (25 copper)" — calls templeCurePoison

**Sage** — list unidentified items with [Identify] buttons:
- Each unidentified item shown with "30 copper" price
- "Identify All (N copper)" button at bottom
- Items update in real-time as identified

**Bank** — deposit/withdraw with amount inputs:
- "On hand: N copper" / "In bank: N copper"
- [Deposit All] [Withdraw All] buttons
- Amount input + [Deposit] / [Withdraw] buttons

**Inn** — single action:
- "Rest for the Night (20 copper)" button
- Greyed out if full HP/MP or can't afford

All show copper balance at top. Esc closes.

- [ ] **Step 2: Verify build**

---

### Task 7: Wire Actions & Building Entry

**Files:**
- Modify: `src/core/actions.ts`
- Modify: `src/input/input-manager.ts`

- [ ] **Step 1: Handle enterBuilding action**

In `processAction` switch, add:
```ts
case 'enterBuilding': {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;
  const tile = floor.tiles[state.hero.position.y][state.hero.position.x];
  if (tile.type !== 'building' || !tile.buildingId) {
    return { ...state, messages: [...state.messages, { text: 'There is no building here.', severity: 'system', turn: state.turn }] };
  }
  const shopIds = ['weapon-shop','armor-shop','general-store','magic-shop','junk-store'];
  const screen = shopIds.includes(tile.buildingId) ? 'shop' : 'service';
  return { ...state, screen, activeBuildingId: tile.buildingId };
}
```

- [ ] **Step 2: Handle town entry/exit in processMove and processUseStairs**

In `processUseStairs`:
- If on floor 0 and on stairs-up: teleport to town (set currentDungeon='town', currentFloor=0, generate town map if not exists, place at center)
- If in town and on stairs-down (dungeon entrance): return to mine at returnFloor stairs-up

In `processMove`:
- When stepping onto a building tile, auto-trigger enterBuilding (or show message "Press Enter to enter")

- [ ] **Step 3: Add Enter key for building entry**

In input-manager.ts, the Enter key currently triggers `useStairs`. When on a building tile, it should trigger `enterBuilding` instead. The input manager doesn't know the tile type — so keep Enter as `useStairs`, and handle the building check in `processUseStairs` (if tile is building, redirect to enterBuilding logic).

Actually simpler: in `processAction`, when the hero is on a building tile and presses Enter (useStairs), check if it's a building and enter it. Add this check at the top of `processUseStairs`.

- [ ] **Step 4: Verify build**

---

### Task 8: Rune of Return & Scroll

**Files:**
- Modify: `src/systems/spells/casting.ts`
- Modify: `src/data/items.ts`
- Modify: `src/systems/inventory/use-item.ts`

- [ ] **Step 1: Update Rune of Return spell**

In casting.ts, replace the stub:
```ts
case 'rune-of-return': {
  if (state.currentDungeon === 'town') {
    return addMsg(state, 'You are already in town.', 'system');
  }
  // Teleport to town
  return teleportToTown(state);
}
```

Create `teleportToTown(state)` helper that:
- Stores `returnFloor = state.currentFloor`
- Sets `currentDungeon = 'town'`, `currentFloor = 0`
- Generates town map if not in floors
- Places hero at town center
- Updates `town.deepestFloor` if current floor is deeper
- Restocks shops
- Message: "You are transported to town."

- [ ] **Step 2: Add scroll-rune-of-return to items.ts**

```ts
{ id: 'scroll-rune-of-return', name: 'Scroll of Rune of Return', category: 'scroll', sprite: 'scroll',
  weight: 50, value: 60, depthMin: 1, depthMax: 99, spellId: 'rune-of-return' },
```

- [ ] **Step 3: Handle scroll in use-item.ts**

The scroll system already handles spellId-based scrolls via `castSpell`. Verify that `scroll-rune-of-return` with spellId `rune-of-return` works through the existing scroll use flow. If not, add an explicit case.

- [ ] **Step 4: Verify build**

---

### Task 9: Wire Screens in main.ts

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Add shop and service screen cases**

Import ShopScreen and ServiceScreen. Add to switchScreen:

```ts
case 'shop': {
  input.setEnabled(false);
  const shopId = gameLoop.getState().activeBuildingId;
  const renderShop = () => {
    const shopScreen = createShopScreen(
      gameLoop.getState(),
      shopId,
      (newState) => { gameLoop.setState(newState); root.replaceChildren(); renderShop(); },
      () => gameLoop.handleAction({ type: 'setScreen', screen: 'game' }),
    );
    addScreenCleanup(shopScreen.cleanup);
    root.replaceChildren(shopScreen);
  };
  renderShop();
  break;
}

case 'service': {
  input.setEnabled(false);
  const buildingId = gameLoop.getState().activeBuildingId;
  const renderService = () => {
    const svcScreen = createServiceScreen(
      gameLoop.getState(),
      buildingId,
      (newState) => { gameLoop.setState(newState); root.replaceChildren(); renderService(); },
      () => gameLoop.handleAction({ type: 'setScreen', screen: 'game' }),
    );
    addScreenCleanup(svcScreen.cleanup);
    root.replaceChildren(svcScreen);
  };
  renderService();
  break;
}
```

- [ ] **Step 2: Verify build**

---

### Task 10: Map Renderer Building Support

**Files:**
- Modify: `src/rendering/map-renderer.ts`

- [ ] **Step 1: Render buildings as overlay tiles**

In the overlay tile check, add `tile.type === 'building'`:
```ts
const isOverlayTile = tile.type === 'stairs-up' || tile.type === 'stairs-down'
  || tile.type === 'door-closed' || tile.type === 'door-open' || tile.type === 'door-locked'
  || (tile.type === 'trap' && tile.trapRevealed)
  || tile.type === 'building';
```

Buildings render on the ground layer (sprite from tile.sprite) with grass underneath on the floor layer.

- [ ] **Step 2: Verify build and test full flow**

Run: `npx tsc --noEmit`
Then: start game → ascend past floor 0 → walk around town → enter shops → buy/sell → use services → return to dungeon.
