# Items & Inventory Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up loot drops from monster kills, item pickup (G key), equip/unequip with stat recalculation, item use (potions/scrolls), and build a paperdoll inventory screen (I key).

**Architecture:** Pure functional reducers — each action handler takes `GameState` and returns a new `GameState`. Equipment stat changes use full recompute via existing `recomputeDerivedStats`. New inventory logic lives in `src/systems/inventory/`. New UI screen follows same pattern as `character-info.ts`. No turn consumed for opening/closing inventory.

**Tech Stack:** TypeScript, Vite, DOM rendering, CSS sprite sheets (already loaded)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/systems/inventory/equipment.ts` | Equip/unequip logic, slot resolution, cursed item blocking |
| Create | `src/systems/inventory/use-item.ts` | Potion and scroll use logic |
| Create | `src/systems/inventory/pickup.ts` | Item pickup from ground |
| Create | `src/systems/inventory/drop.ts` | Drop item to ground |
| Create | `src/systems/inventory/display-name.ts` | Identification-aware item display name |
| Create | `src/ui/inventory-screen.ts` | Paperdoll equipment + bag inventory UI |
| Modify | `src/systems/combat/combat.ts:117-138` | Add loot drop on monster kill |
| Modify | `src/core/actions.ts:25-42` | Handle pickupItem, equipItem, unequipItem, useItem, dropItem |
| Modify | `src/core/types.ts:84-102` | Add `equipDamageBonus` and `equipAccuracyBonus` to Hero |
| Modify | `src/systems/character/derived-stats.ts:52-69` | Add damage/accuracy bonus to recomputeDerivedStats |
| Modify | `src/main.ts:105-221` | Add inventory screen case in switchScreen |
| Modify | `src/systems/spells/casting.ts` | Wire Identify spell to set item.identified = true |

---

### Task 1: Add Hero Derived Combat Bonuses

**Files:**
- Modify: `src/core/types.ts:84-102`
- Modify: `src/systems/character/derived-stats.ts:52-69`
- Modify: `src/core/game-state.ts` (createHero default values)

- [ ] **Step 1: Add equipDamageBonus and equipAccuracyBonus to Hero type**

In `src/core/types.ts`, add two fields after `armorValue`:

```ts
// In the Hero interface, after armorValue:
equipDamageBonus: number;
equipAccuracyBonus: number;
```

- [ ] **Step 2: Update recomputeDerivedStats to calculate weapon bonuses**

In `src/systems/character/derived-stats.ts`, extend `recomputeDerivedStats`:

```ts
export function recomputeDerivedStats(hero: Hero): Hero {
  const maxHp = computeMaxHp(hero.attributes.constitution, hero.level);
  const maxMp = computeMaxMp(hero.attributes.intelligence, hero.level);
  const armorValue = computeTotalArmorValue(hero.attributes.dexterity, hero.equipment);

  // Weapon bonuses
  let equipDamageBonus = 0;
  let equipAccuracyBonus = 0;
  const weapon = hero.equipment.weapon;
  if (weapon) {
    equipDamageBonus = weapon.enchantment;
    equipAccuracyBonus = (weapon.properties['accuracy'] ?? 0) + weapon.enchantment;
  }

  const hp = Math.min(hero.hp, maxHp);
  const mp = Math.min(hero.mp, maxMp);

  return { ...hero, maxHp, maxMp, hp, mp, armorValue, equipDamageBonus, equipAccuracyBonus };
}
```

- [ ] **Step 3: Set defaults in createHero**

In `src/core/game-state.ts`, add to the hero object returned by `createHero`:

```ts
equipDamageBonus: 0,
equipAccuracyBonus: 0,
```

- [ ] **Step 4: Verify the build compiles**

Run: `cd /mnt/c/Users/evilc/OneDrive/Documents/GitHub/Castle-of-the-Winds && npx tsc --noEmit`
Expected: No errors

---

### Task 2: Item Display Name (Identification System)

**Files:**
- Create: `src/systems/inventory/display-name.ts`

- [ ] **Step 1: Create display-name.ts**

```ts
import type { Item } from '../../core/types';
import { ITEM_BY_ID } from '../../data/items';

/**
 * Returns the name shown to the player.
 * Unidentified enchanted/cursed items show the base template name.
 * Identified items show name with +/- modifier.
 */
export function getDisplayName(item: Item): string {
  if (!item.identified && item.enchantment !== 0) {
    const tpl = ITEM_BY_ID[item.templateId];
    return tpl ? tpl.name : item.category;
  }
  return item.name;
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`

---

### Task 3: Wire Loot Drops into Combat

**Files:**
- Modify: `src/systems/combat/combat.ts:117-138`

- [ ] **Step 1: Import generateLoot at top of combat.ts**

```ts
import { generateLoot } from '../items/loot';
```

- [ ] **Step 2: Add loot drop in the monster-death branch**

In `playerAttacksMonster`, inside the `if (newHp <= 0)` block, after removing the monster and before the return statement:

```ts
    // Monster dies
    messages.push({
      text: `${state.hero.name} hits the ${monster.name} for ${damage} damage, killing it! (+${monster.xpValue} XP)`,
      severity: 'combat',
      turn: state.turn,
    });

    const newMonsters = [...floor.monsters];
    newMonsters.splice(monsterIndex, 1);

    // Loot drop
    const loot = generateLoot(state.currentFloor, monster.position);
    let newItems = [...floor.items];
    if (loot) {
      newItems.push({ item: loot, position: { ...monster.position } });
      messages.push({
        text: `The ${monster.name} dropped ${loot.name}.`,
        severity: 'normal',
        turn: state.turn,
      });
    }

    const newFloor: Floor = { ...floor, monsters: newMonsters, items: newItems };

    return {
      ...applyMessages(state, messages),
      hero: { ...state.hero, xp: state.hero.xp + monster.xpValue },
      floors: { ...state.floors, [floorKey]: newFloor },
      turn: state.turn + 1,
    };
```

- [ ] **Step 3: Verify build and test in-game**

Run: `npx tsc --noEmit`
Then: `npx vite` → kill a monster → verify loot message appears and item sprite shows on ground.

---

### Task 4: Item Pickup (G Key)

**Files:**
- Create: `src/systems/inventory/pickup.ts`
- Modify: `src/core/actions.ts`

- [ ] **Step 1: Create pickup.ts**

```ts
import type { GameState, Message } from '../../core/types';

export function processPickupItem(state: GameState): GameState {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  const pos = state.hero.position;
  const itemsHere = floor.items.filter(
    i => i.position.x === pos.x && i.position.y === pos.y
  );

  if (itemsHere.length === 0) {
    return {
      ...state,
      messages: [...state.messages, {
        text: 'There is nothing here to pick up.',
        severity: 'system' as const,
        turn: state.turn,
      }],
    };
  }

  // Pick up the first item
  const picked = itemsHere[0];
  const messages: Message[] = [];
  let hero = { ...state.hero };

  if (picked.item.category === 'currency') {
    const amount = picked.item.properties['amount'] ?? picked.item.value;
    hero = { ...hero, copper: hero.copper + amount };
    messages.push({ text: `Picked up ${picked.item.name}.`, severity: 'normal', turn: state.turn });
  } else {
    hero = { ...hero, inventory: [...hero.inventory, picked.item] };
    messages.push({ text: `Picked up ${picked.item.name}.`, severity: 'normal', turn: state.turn });
  }

  // Remove from floor
  const newItems = floor.items.filter(i => i !== picked);
  const newFloor = { ...floor, items: newItems };

  return {
    ...state,
    hero,
    floors: { ...state.floors, [floorKey]: newFloor },
    messages: [...state.messages, ...messages],
    turn: state.turn + 1,
  };
}
```

- [ ] **Step 2: Wire pickupItem case into processAction in actions.ts**

Add import at top:
```ts
import { processPickupItem } from '../systems/inventory/pickup';
```

Add case in the `processAction` switch:
```ts
    case 'pickupItem':
      return processPickupItem(state);
```

- [ ] **Step 3: Verify build and test**

Run: `npx tsc --noEmit`
Then: kill monster → walk onto loot → press G → verify item appears in inventory and disappears from ground.

---

### Task 5: Drop Item

**Files:**
- Create: `src/systems/inventory/drop.ts`
- Modify: `src/core/actions.ts`

- [ ] **Step 1: Create drop.ts**

```ts
import type { GameState } from '../../core/types';

export function processDropItem(state: GameState, itemId: string): GameState {
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return state;

  const idx = state.hero.inventory.findIndex(i => i.id === itemId);
  if (idx === -1) return state;

  const item = state.hero.inventory[idx];
  const newInventory = [...state.hero.inventory];
  newInventory.splice(idx, 1);

  const newItems = [...floor.items, { item, position: { ...state.hero.position } }];
  const newFloor = { ...floor, items: newItems };

  return {
    ...state,
    hero: { ...state.hero, inventory: newInventory },
    floors: { ...state.floors, [floorKey]: newFloor },
    messages: [...state.messages, {
      text: `Dropped ${item.name}.`,
      severity: 'normal' as const,
      turn: state.turn,
    }],
    turn: state.turn + 1,
  };
}
```

- [ ] **Step 2: Wire dropItem case into processAction**

Add import:
```ts
import { processDropItem } from '../systems/inventory/drop';
```

Add case:
```ts
    case 'dropItem':
      return processDropItem(state, action.itemId);
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`

---

### Task 6: Equip/Unequip System

**Files:**
- Create: `src/systems/inventory/equipment.ts`
- Modify: `src/core/actions.ts`

- [ ] **Step 1: Create equipment.ts**

```ts
import type { GameState, Item, EquipSlot, Equipment, Message } from '../../core/types';
import { ITEM_BY_ID } from '../../data/items';
import { recomputeDerivedStats } from '../character/derived-stats';

/**
 * Maps item categories to their default equip slot.
 */
function getSlotForItem(item: Item): EquipSlot | null {
  const tpl = ITEM_BY_ID[item.templateId];
  return tpl?.equipSlot ?? null;
}

export function processEquipItem(state: GameState, itemId: string): GameState {
  const idx = state.hero.inventory.findIndex(i => i.id === itemId);
  if (idx === -1) return state;

  const item = state.hero.inventory[idx];
  let slot = getSlotForItem(item);
  if (!slot) {
    return {
      ...state,
      messages: [...state.messages, {
        text: `${item.name} cannot be equipped.`,
        severity: 'system' as const,
        turn: state.turn,
      }],
    };
  }

  // Ring slot resolution: prefer empty slot
  if (slot === 'ringLeft' || slot === 'ringRight') {
    if (!state.hero.equipment.ringLeft) slot = 'ringLeft';
    else if (!state.hero.equipment.ringRight) slot = 'ringRight';
    else slot = 'ringLeft'; // default: replace left
  }

  let hero = { ...state.hero };
  let equipment = { ...hero.equipment };
  let inventory = [...hero.inventory];
  const messages: Message[] = [];

  // Two-handed weapon: unequip shield if present
  if (slot === 'weapon' && item.properties['twoHanded'] && equipment.shield) {
    const shield = equipment.shield;
    if (shield.cursed && shield.identified) {
      return {
        ...state,
        messages: [...state.messages, {
          text: `You cannot unequip the ${shield.name} — it is cursed!`,
          severity: 'important' as const,
          turn: state.turn,
        }],
      };
    }
    if (shield.cursed && !shield.identified) {
      // Reveal curse
      const revealed = { ...shield, identified: true };
      equipment = { ...equipment, shield: revealed };
      return {
        ...state,
        hero: { ...hero, equipment },
        messages: [...state.messages, {
          text: `You cannot remove the ${shield.name}! It appears to be cursed!`,
          severity: 'important' as const,
          turn: state.turn,
        }],
      };
    }
    inventory.push(shield);
    equipment = { ...equipment, shield: null };
    messages.push({ text: `Unequipped ${shield.name}.`, severity: 'normal', turn: state.turn });
  }

  // Unequip current item in that slot (if any)
  const current = equipment[slot] as Item | null;
  if (current) {
    if (current.cursed) {
      if (!current.identified) {
        const revealed = { ...current, identified: true };
        equipment = { ...equipment, [slot]: revealed };
        return {
          ...state,
          hero: { ...hero, equipment },
          messages: [...state.messages, {
            text: `You cannot remove the ${current.name}! It appears to be cursed!`,
            severity: 'important' as const,
            turn: state.turn,
          }],
        };
      }
      return {
        ...state,
        messages: [...state.messages, {
          text: `You cannot unequip the ${current.name} — it is cursed!`,
          severity: 'important' as const,
          turn: state.turn,
        }],
      };
    }
    inventory.push(current);
    messages.push({ text: `Unequipped ${current.name}.`, severity: 'normal', turn: state.turn });
  }

  // Remove new item from inventory, equip it
  inventory.splice(idx, 1);
  equipment = { ...equipment, [slot]: item };
  messages.push({ text: `Equipped ${item.name}.`, severity: 'normal', turn: state.turn });

  hero = { ...hero, inventory, equipment };
  hero = recomputeDerivedStats(hero);

  return {
    ...state,
    hero,
    messages: [...state.messages, ...messages],
  };
}

export function processUnequipItem(state: GameState, slot: EquipSlot): GameState {
  const item = state.hero.equipment[slot] as Item | null;
  if (!item) return state;

  // Cursed check
  if (item.cursed) {
    let hero = state.hero;
    if (!item.identified) {
      const revealed = { ...item, identified: true };
      const equipment = { ...hero.equipment, [slot]: revealed };
      hero = { ...hero, equipment };
    }
    return {
      ...state,
      hero,
      messages: [...state.messages, {
        text: `You cannot remove the ${item.name}! It appears to be cursed!`,
        severity: 'important' as const,
        turn: state.turn,
      }],
    };
  }

  const equipment = { ...state.hero.equipment, [slot]: null };
  const inventory = [...state.hero.inventory, item];
  let hero = { ...state.hero, equipment, inventory };
  hero = recomputeDerivedStats(hero);

  return {
    ...state,
    hero,
    messages: [...state.messages, {
      text: `Unequipped ${item.name}.`,
      severity: 'normal' as const,
      turn: state.turn,
    }],
  };
}
```

- [ ] **Step 2: Wire equipItem and unequipItem into processAction**

Add import:
```ts
import { processEquipItem, processUnequipItem } from '../systems/inventory/equipment';
```

Add cases:
```ts
    case 'equipItem':
      return processEquipItem(state, action.itemId);
    case 'unequipItem':
      return processUnequipItem(state, action.slot);
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`

---

### Task 7: Use Item (Potions & Scrolls)

**Files:**
- Create: `src/systems/inventory/use-item.ts`
- Modify: `src/core/actions.ts`
- Modify: `src/systems/spells/casting.ts` (Identify spell)

- [ ] **Step 1: Create use-item.ts**

```ts
import type { GameState, Item, Message, Hero } from '../../core/types';
import { recomputeDerivedStats } from '../character/derived-stats';

export function processUseItem(state: GameState, itemId: string): GameState {
  const idx = state.hero.inventory.findIndex(i => i.id === itemId);
  if (idx === -1) return state;

  const item = state.hero.inventory[idx];

  switch (item.category) {
    case 'potion':
      return usePotion(state, item, idx);
    case 'scroll':
      return useScroll(state, item, idx);
    default:
      return {
        ...state,
        messages: [...state.messages, {
          text: `You can't use ${item.name}.`,
          severity: 'system' as const,
          turn: state.turn,
        }],
      };
  }
}

function removeFromInventory(hero: Hero, idx: number): Hero {
  const inv = [...hero.inventory];
  inv.splice(idx, 1);
  return { ...hero, inventory: inv };
}

function usePotion(state: GameState, item: Item, idx: number): GameState {
  const messages: Message[] = [];
  let hero = { ...state.hero };
  const tid = item.templateId;

  if (tid.startsWith('potion-heal')) {
    const pct = item.properties['healPct'] ?? 0;
    const flat = item.properties['healAmount'] ?? 0;
    const heal = Math.max(flat, Math.floor(hero.maxHp * pct));
    const oldHp = hero.hp;
    hero = { ...hero, hp: Math.min(hero.maxHp, hero.hp + heal) };
    const healed = hero.hp - oldHp;
    messages.push({ text: `You drink the ${item.name}. Healed ${healed} HP. (${hero.hp}/${hero.maxHp})`, severity: 'important', turn: state.turn });
  } else if (tid === 'potion-gain-str') {
    hero = { ...hero, attributes: { ...hero.attributes, strength: hero.attributes.strength + 1 } };
    hero = recomputeDerivedStats(hero);
    messages.push({ text: 'You feel stronger! (+1 Strength)', severity: 'important', turn: state.turn });
  } else if (tid === 'potion-gain-int') {
    hero = { ...hero, attributes: { ...hero.attributes, intelligence: hero.attributes.intelligence + 1 } };
    hero = recomputeDerivedStats(hero);
    messages.push({ text: 'You feel smarter! (+1 Intelligence)', severity: 'important', turn: state.turn });
  } else if (tid === 'potion-gain-con') {
    hero = { ...hero, attributes: { ...hero.attributes, constitution: hero.attributes.constitution + 1 } };
    hero = recomputeDerivedStats(hero);
    messages.push({ text: 'You feel healthier! (+1 Constitution)', severity: 'important', turn: state.turn });
  } else if (tid === 'potion-gain-dex') {
    hero = { ...hero, attributes: { ...hero.attributes, dexterity: hero.attributes.dexterity + 1 } };
    hero = recomputeDerivedStats(hero);
    messages.push({ text: 'You feel more agile! (+1 Dexterity)', severity: 'important', turn: state.turn });
  } else {
    messages.push({ text: `You drink the ${item.name}. Nothing happens.`, severity: 'normal', turn: state.turn });
  }

  hero = removeFromInventory(hero, idx);

  return {
    ...state,
    hero,
    messages: [...state.messages, ...messages],
    turn: state.turn + 1,
  };
}

function useScroll(state: GameState, item: Item, idx: number): GameState {
  const messages: Message[] = [];
  let hero = { ...state.hero };
  const spellId = item.properties['spellId'] ?? item.templateId.replace('scroll-', '');

  if (spellId === 'identify' || item.templateId === 'scroll-identify') {
    // Find first unidentified item in inventory
    const unidIdx = hero.inventory.findIndex(i => !i.identified && i.id !== item.id);
    if (unidIdx === -1) {
      // Check equipment
      const eqSlots = Object.keys(hero.equipment) as (keyof typeof hero.equipment)[];
      let found = false;
      for (const slot of eqSlots) {
        const eq = hero.equipment[slot];
        if (eq && !eq.identified) {
          const identified = { ...eq, identified: true };
          hero = { ...hero, equipment: { ...hero.equipment, [slot]: identified } };
          messages.push({ text: `The scroll reveals: ${identified.name}!`, severity: 'important', turn: state.turn });
          found = true;
          break;
        }
      }
      if (!found) {
        messages.push({ text: 'You read the scroll, but have nothing to identify.', severity: 'system', turn: state.turn });
      }
    } else {
      const inv = [...hero.inventory];
      const identified = { ...inv[unidIdx], identified: true };
      inv[unidIdx] = identified;
      hero = { ...hero, inventory: inv };
      messages.push({ text: `The scroll reveals: ${identified.name}!`, severity: 'important', turn: state.turn });
    }
  } else if (spellId === 'teleport' || item.templateId === 'scroll-teleport') {
    // Random teleport on current floor
    const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
    const floor = state.floors[floorKey];
    if (floor) {
      let tries = 0;
      while (tries < 200) {
        const x = Math.floor(Math.random() * floor.width);
        const y = Math.floor(Math.random() * floor.height);
        const tile = floor.tiles[y]?.[x];
        if (tile?.walkable && !floor.monsters.find(m => m.position.x === x && m.position.y === y)) {
          hero = { ...hero, position: { x, y } };
          messages.push({ text: 'You read the scroll and teleport!', severity: 'important', turn: state.turn });
          break;
        }
        tries++;
      }
    }
  } else if (spellId === 'remove-curse' || item.templateId === 'scroll-remove-curse') {
    // Find first cursed equipped item
    const eqSlots = Object.keys(hero.equipment) as (keyof typeof hero.equipment)[];
    let found = false;
    for (const slot of eqSlots) {
      const eq = hero.equipment[slot];
      if (eq && eq.cursed) {
        const uncursed = { ...eq, cursed: false, identified: true };
        hero = { ...hero, equipment: { ...hero.equipment, [slot]: uncursed } };
        messages.push({ text: `The curse on ${uncursed.name} has been lifted!`, severity: 'important', turn: state.turn });
        found = true;
        break;
      }
    }
    if (!found) {
      messages.push({ text: 'You read the scroll, but nothing happens.', severity: 'system', turn: state.turn });
    }
  } else {
    messages.push({ text: `You read the ${item.name}. Nothing happens.`, severity: 'normal', turn: state.turn });
  }

  hero = removeFromInventory(hero, idx);

  return {
    ...state,
    hero,
    messages: [...state.messages, ...messages],
    turn: state.turn + 1,
  };
}
```

- [ ] **Step 2: Wire useItem case into processAction**

Add import:
```ts
import { processUseItem } from '../systems/inventory/use-item';
```

Add case:
```ts
    case 'useItem':
      return processUseItem(state, action.itemId);
```

- [ ] **Step 3: Wire Identify spell to identify items**

In `src/systems/spells/casting.ts`, find the Identify spell handler (currently a no-op message) and replace with logic that identifies the first unidentified inventory item, similar to the scroll logic above. The spell version should work the same way — find first unidentified item in inventory or equipment, set `identified: true`.

- [ ] **Step 4: Wire Remove Curse spell**

Similarly, find the Remove Curse handler in `casting.ts` and wire it to find the first cursed equipped item and set `cursed: false, identified: true`.

- [ ] **Step 5: Verify build**

Run: `npx tsc --noEmit`

---

### Task 8: Paperdoll Inventory Screen (I Key)

**Files:**
- Create: `src/ui/inventory-screen.ts`
- Modify: `src/main.ts:105-221`

- [ ] **Step 1: Create inventory-screen.ts**

Build the inventory UI using the same DOM helper pattern as `character-info.ts`. Structure:

```
┌──────────────────────────────────────────────────┐
│ EQUIPMENT                          [Close (Esc)] │
├────────────────────┬─────────────────────────────┤
│  Paperdoll area    │  Slot list with sprites     │
│  (equipment-dude)  │  Click slot = unequip       │
│  240x480           │                             │
│                    │  Each slot shows:            │
│                    │  [sprite] SlotName: ItemName │
│                    │  or "— empty —"             │
├────────────────────┴─────────────────────────────┤
│ INVENTORY                                        │
│ [sprite] Item Name        0.5 kg   [E] [U] [D]  │
│ [sprite] Item Name        1.2 kg   [E] [U] [D]  │
│ ...                                              │
├──────────────────────────────────────────────────┤
│ Weight: 12.3 kg   Copper: 245   Items: 5         │
└──────────────────────────────────────────────────┘
```

Use the `el()` helper pattern from character-info.ts. CSS classes from `inventory.css` where they fit; inline styles for the rest (matching existing dark theme: `#000` bg, `#111` panels, `#333` borders, `#ccc` text, `#c90` headers).

The function signature:
```ts
export function createInventoryScreen(
  state: GameState,
  onAction: (action: GameAction) => void,
  onClose: () => void,
): HTMLElement
```

**Equipment panel** (left side):
- Show the `equipment-dude` background (240x480 from inventory.css)
- Overlay 32x32 sprite elements for each equipped item at approximate paperdoll positions
- Each slot is clickable → calls `onAction({ type: 'unequipItem', slot })`

**Equipment slot list** (right side):
- All 14 slots listed vertically
- Each shows: 32x32 item sprite (or dim empty sprite) + slot label + item name
- Cursed items show name in red, enchanted in blue
- Unidentified items use `getDisplayName()` from display-name.ts
- Click on equipped item → unequip

**Inventory panel** (bottom):
- List all items in `hero.inventory`
- Each row: 32x32 sprite, display name, weight in kg, three action buttons:
  - [E]quip — only shown for equippable items, calls `onAction({ type: 'equipItem', itemId })`
  - [U]se — only shown for potions/scrolls, calls `onAction({ type: 'useItem', itemId })`
  - [D]rop — always shown, calls `onAction({ type: 'dropItem', itemId })`
- Selected item highlighted (keyboard nav: arrow keys to select, E/U/D keys as shortcuts)

**Footer:**
- Total weight (sum all inventory + equipment weight, display in kg)
- Copper count
- Item count

**Keyboard:**
- Up/Down arrows to select inventory item
- E key = equip selected
- U key = use selected
- D key = drop selected
- Esc or I key = close → `onClose()`

- [ ] **Step 2: Add inventory case to switchScreen in main.ts**

After the `'character-info'` case, add:

```ts
    case 'inventory': {
      input.setEnabled(true);
      const invScreen = createInventoryScreen(
        gameLoop.getState(),
        action => {
          gameLoop.handleAction(action);
          // Re-render the inventory screen with updated state
          const updated = createInventoryScreen(
            gameLoop.getState(),
            action2 => gameLoop.handleAction(action2),
            () => gameLoop.handleAction({ type: 'setScreen', screen: 'game' }),
          );
          root.replaceChildren(updated);
        },
        () => gameLoop.handleAction({ type: 'setScreen', screen: 'game' }),
      );
      root.appendChild(invScreen);
      break;
    }
```

Add import at top of main.ts:
```ts
import { createInventoryScreen } from './ui/inventory-screen';
```

- [ ] **Step 3: Verify build and test**

Run: `npx tsc --noEmit`
Then: `npx vite` → start game → press I → verify paperdoll screen appears with equipment slots and inventory list. Press Esc → back to game.

---

### Task 9: Update Combat to Use Equipment Bonuses

**Files:**
- Modify: `src/systems/combat/combat.ts:39-52`

- [ ] **Step 1: Update calcPlayerDamage to use equipDamageBonus**

The existing `calcPlayerDamage` already reads `hero.equipment.weapon` directly. This works, but now we also have `equipDamageBonus` available. The current code is already correct — it reads weapon properties and enchantment directly. No change needed here unless you want to simplify.

However, update `calcHitChance` usage in `playerAttacksMonster` to include accuracy bonus:

In the hit check line:
```ts
  const hitChance = calcHitChance(
    state.hero.attributes.dexterity + state.hero.equipAccuracyBonus,
    Math.floor(monster.speed * 30)
  );
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`

---

### Task 10: Final Integration & Polish

**Files:**
- Modify: `src/systems/inventory/pickup.ts` (auto-pickup message when walking onto items)
- Modify: `src/core/actions.ts` (add ground item notification on move)

- [ ] **Step 1: Add "you see items here" message when stepping onto ground items**

In `processMove` in `actions.ts`, after the successful move (before the return), check if there are items at the new position:

```ts
  // Check for items at new position
  const itemsAtPos = floor.items.filter(
    i => i.position.x === newPos.x && i.position.y === newPos.y
  );
  let messages = [...state.messages];
  if (itemsAtPos.length === 1) {
    messages.push({
      text: `You see ${itemsAtPos[0].item.name} on the ground. (G to pick up)`,
      severity: 'normal' as const,
      turn: state.turn + 1,
    });
  } else if (itemsAtPos.length > 1) {
    messages.push({
      text: `You see ${itemsAtPos.length} items on the ground. (G to pick up)`,
      severity: 'normal' as const,
      turn: state.turn + 1,
    });
  }
```

Then use `messages` in the return statement instead of `state.messages`.

- [ ] **Step 2: Verify full build compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Full play-test**

Run: `npx vite` and verify the complete flow:
1. Start game, enter dungeon
2. Kill a monster → loot drops on ground (visible sprite + message)
3. Walk onto loot → "You see X on the ground" message
4. Press G → item picked up, appears in inventory
5. Press I → paperdoll screen with equipment slots
6. Select item → press E → equips, stats update (AC changes visible in HUD)
7. Click equipped item → unequips back to bag
8. Pick up potion → press U → heals HP
9. Pick up scroll → press U → identifies/teleports/removes curse
10. Press D → drops item back on ground
11. Equip cursed item → try to unequip → blocked with message
12. Esc closes inventory → back to game, no turn consumed

- [ ] **Step 4: Update todo.md**

Mark completed items in the Phase 3.2 and 3.3 sections. Add "Weight/encumbrance affecting movement speed" to Phase 7 as a future TODO.
