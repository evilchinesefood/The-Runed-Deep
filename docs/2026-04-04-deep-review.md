# The Runed Deep — Deep Review (Combined Findings)

**Date:** 2026-04-04
**Agents:** Performance Engineer, Code Reviewer, Architect Reviewer, Frontend Developer, Critical Thinker

---

## CRITICAL

### 1. Gold 3x3 pickup/removal mismatch — silent gold duplication
**Found by:** Code Reviewer
**File:** `actions.ts:427-454`
Gold is detected in a 3x3 area but only removed from the exact tile. Gold at adjacent tiles gets added to hero gold but stays on the floor forever — infinite gold exploit.
**Fix:** Match the removal filter to the same 3x3 predicate.

### 2. `statueUpgrades` duplicated on Hero AND GameState — divergent reads
**Found by:** Architect, Code Reviewer, Critical Thinker
**File:** `types.ts:120,346`, `Statue.ts:169-182`, `derived-stats.ts`
Two copies written in sync by `purchaseUpgrade`, but `recomputeDerivedStats` reads only `hero.statueUpgrades`. Migration could zero one but not the other. UI reads `state.statueUpgrades`.
**Fix:** Remove from Hero. Pass `state.statueUpgrades` into `recomputeDerivedStats`.

### 3. CSS `background-size` repeated 6,538 times — 450KB wasted CSS
**Found by:** Frontend Developer, Performance Engineer
**File:** All sprite CSS files
Each sprite rule uses `background:` shorthand which resets `background-size`, so every rule redundantly redeclares it. ~56% of CSS payload is redundant.
**Fix:** Use `background-position` only in individual rules. Let base class carry `background` + `background-size`.

### 4. `sumRuneEffect` called 7-10x per combat action — redundant equipment scans
**Found by:** Performance Engineer
**File:** `combat.ts:26-39`
Each combat action iterates all equipment+sockets 7-10 times. With Frenzied modifier + 30 Crucible monsters = 50-100 redundant scans per turn.
**Fix:** Pre-compute a `CombatStats` cache once per turn.

### 5. `recomputeDerivedStats` makes 16+ equipment scans — called from drain hits
**Found by:** Performance Engineer
**File:** `derived-stats.ts:51-279`
16 separate `getEquipAffixTotal` calls each iterating ~12 slots. Drain-ability monsters can trigger this 10+ times per turn.
**Fix:** Single-pass equipment scan collecting all values at once.

### 6. `findIndex` per monster per turn — O(n^2) in monster AI
**Found by:** Performance Engineer
**File:** `ai.ts:1189-1195`
Linear scan for each of 30+ monsters per turn. With Frenzied = double pass.
**Fix:** Build a `Map<id, index>` before the loop.

---

## HIGH

### 7. `spriteLayers[]` built but never rendered — only layer 0 shown
**Found by:** Frontend Developer
**File:** `map-renderer.ts`, `display-name.ts`
Multi-layer sprites defined in sprite-slots.json are generated but `getDisplaySprite()` returns only the first layer. All overlay layers are silently ignored.
**Fix:** Render additional layers as stacked divs or CSS multi-background.

### 8. `calcEssence` always returns 1 for uniques — detection broken
**Found by:** Code Reviewer
**File:** `Statue.ts:11-13`
Checks `tpl.startsWith("unique-")` but no unique IDs start with that prefix. Also checks `item.properties["unique"]` which is never set. Uniques yield 1 essence instead of 10.
**Fix:** Use `ITEM_BY_ID[item.templateId]?.unique`.

### 9. NG+ hero position mutates shared reference
**Found by:** Code Reviewer
**File:** `main.ts:1440`
`ngState.hero.position = {...}` mutates the original state's hero (shallow spread). Also uses magic number `{x:12, y:17}` instead of `TOWN_START_INITIAL`.
**Fix:** Create new hero object with spread. Use the constant.

### 10. NG+ `generateFloor` omits `ngPlusCount` parameter
**Found by:** Critical Thinker
**File:** `main.ts:1403-1410`
First floor on NG+ gets NG0 difficulty monsters/loot.
**Fix:** Pass `ngCount` as 7th argument.

### 11. Swarm modifier can stack monsters on same tile
**Found by:** Critical Thinker, Code Reviewer
**File:** `RiftGen.ts:62-91`
Clone falls back to original position when no adjacent tile is free. Two monsters on one tile = one becomes unkillable.
**Fix:** Pick random walkable tile from full floor if adjacent fails.

### 12. Rift death corrupts `returnFloor` — player loses dungeon position
**Found by:** Critical Thinker
**File:** `actions.ts` (processEnterRift)
`returnFloor` not saved before entering rift. Death respawn uses rift floor number as dungeon return floor.
**Fix:** Save `returnFloor` on rift entry.

### 13. Abundance modifier uses `Date.now()` for item IDs — breaks `syncItemIdCounter`
**Found by:** Critical Thinker
**File:** `RiftGen.ts:105`
Duplicate items get `rift-dup-{timestamp}` IDs that don't match the `item-(\d+)` pattern. Can cause ID collisions on save/load.
**Fix:** Import and use `nextItemId` from loot module.

### 14. Duplicate temple entry in TOWN_BUILDINGS
**Found by:** Code Reviewer, Critical Thinker
**File:** `TownMap.ts:167-194`
Two identical `id: "temple"` entries create two entrance tiles. Will explode when tile-built town is integrated.
**Fix:** Remove the duplicate.

### 15. `runeForgeMaxSockets` upgrade never implemented
**Found by:** Code Reviewer
**File:** `types.ts:345`, `ServiceScreen.ts`
Field exists, initialized to 2, but no code path sets it to 3. Socket cap upgrade button in forge UI may not work.
**Fix:** Verify the Rune Forge UI upgrade handler actually writes to state.

### 16. `buildOccupied` rebuilt per-monster instead of once per turn
**Found by:** Performance Engineer
**File:** `ai.ts:98-102`
30 monsters = 30 rebuilds of the occupied set, each iterating all 30 monsters.
**Fix:** Build once, pass through.

### 17. ServiceScreen.ts is 1,980 lines — monolith handling 10 building types
**Found by:** Architect
**File:** `ServiceScreen.ts`
Module-level mutable state (`sageDrawer`, `statueTab`) persists across navigations. Adding buildings grows this file.
**Fix:** Split into per-building files. Thin dispatcher.

### 18. Building overlays fully destroyed+recreated every camera step in town
**Found by:** Frontend Developer
**File:** `map-renderer.ts:583`
20-30 createElement+appendChild calls per player step in town.
**Fix:** Reposition existing elements via transform instead of recreate.

### 19. `void offsetHeight` forced layout on every message
**Found by:** Frontend Developer
**File:** `hud-renderer.ts:433`
Synchronous layout flush on every new message. No longer needed in modern browsers.
**Fix:** Remove the line.

---

## MEDIUM

### 20. Combat/AI systems reach into `activeRift` directly via string checks
**Found by:** Architect
**File:** `combat.ts`, `ai.ts` (multiple locations)
Every new rift modifier requires editing combat.ts and/or ai.ts.
**Fix:** Introduce `ModifierFlags` struct computed once per turn.

### 21. Silence modifier blocks throw/breath abilities (should only block spells)
**Found by:** Code Reviewer
**File:** `ai.ts:843-856`
`throw-boulder` and `breath-fire` are not spells but get silenced anyway.
**Fix:** Only filter `cast-*` and `summon-*` abilities, not `throw-*`/`breath-*`.

### 22. `getDetectRange` iterates equipment per monster per turn
**Found by:** Performance Engineer
**File:** `ai.ts:22-30`
Should be computed once before the monster loop.

### 23. 0-indexed floor migration doesn't skip `crucible-0`
**Found by:** Critical Thinker
**File:** `save-load.ts:243-272`
Would convert `crucible-0` to `crucible-1` on old saves.
**Fix:** Add `k !== "crucible-0"` guard.

### 24. Crucible death allows "Continue" button — can start next wave while dead
**Found by:** Code Reviewer
**File:** `CrucibleSummaryScreen.ts`, `game-loop.ts`
`activeCrucible` not cleared on death, only on exit. UI shows both buttons.
**Fix:** Hide "Continue" when `isDead`.

### 25. Tooltip full DOM rebuild on every tile hover transition
**Found by:** Frontend Developer
**File:** `item-tooltip.ts`
15-25 DOM nodes created per hover. Compare tooltip forces reflow.
**Fix:** Cache tooltip content by item ID.

### 26. `actions.ts` at 1,469 lines is a god module
**Found by:** Architect
**File:** `actions.ts`
Rift/crucible lifecycle functions belong in their system folders.

### 27. Boss shard reward: spec says 2, code gives 5
**Found by:** Critical Thinker
**File:** `combat.ts:431` vs `docs/2026-04-02-roguelite-expansion-design.md:97`
Intentional change or spec drift.

### 28. Magic shop references `"staff"` category — no staff items exist
**Found by:** Code Reviewer
**File:** `Shops.ts:56-60`
Dead category after item removal.

### 29. Rift tilesets only use mine/fortress/castle — excludes 3 of 6 themes
**Found by:** Code Reviewer
**File:** `RiftGen.ts:10`
Lair, crypt, ice never appear in rifts.

### 30. No `will-change: transform` on map container
**Found by:** Frontend Developer
**File:** `map-renderer.ts:108`
No GPU layer guarantee for the main game view.

---

## LOW

### 31. Stale wand/scroll references in comments and shop flavor text
**Found by:** Code Reviewer
**File:** `loot.ts:251`, `TownMap.ts:100`

### 32. Dead `enchantMult` function never called
**Found by:** Code Reviewer
**File:** `utils/Enchants.ts:14-20`

### 33. Dead action types: `buyItem`, `sellItem`, `load`
**Found by:** Code Reviewer
**File:** `types.ts:373-376`

### 34. `bankBalance` deprecated field kept for save compat
**Found by:** Architect
**File:** `types.ts:304`

### 35. Touch repeat timer not cancelled on touchmove outside button
**Found by:** Frontend Developer
**File:** `TouchControls.ts`

### 36. `mousemove` on map container lacks `{ passive: true }`
**Found by:** Frontend Developer
**File:** `map-renderer.ts:156`

### 37. 8 blocking CSS link tags — should be bundled or preloaded
**Found by:** Frontend Developer
**File:** `index.html`

### 38. FOV module-level `prevVisible` mutable state — correctness risk
**Found by:** Performance Engineer
**File:** `fov.ts:1-47`

### 39. Stash persists through NG+ — intentional but undocumented
**Found by:** Code Reviewer
**File:** `main.ts:1412-1438`

---

## Priority Implementation Order

| Priority | # | Issue | Impact | Effort |
|---|---|---|---|---|
| 1 | 1 | Gold duplication exploit | Game-breaking | Low |
| 2 | 2 | statueUpgrades dual ownership | Data corruption | Medium |
| 3 | 8 | Essence always 1 for uniques | Feature broken | Low |
| 4 | 3 | CSS background-size bloat | 450KB waste | Low (script) |
| 5 | 9+10 | NG+ hero mutation + missing ngPlus | NG+ broken | Low |
| 6 | 11 | Swarm monster stacking | Unkillable monsters | Low |
| 7 | 12 | Rift death returnFloor | Lost position | Low |
| 8 | 13 | Abundance item ID collision | Save corruption | Low |
| 9 | 14 | Duplicate temple | Future integration | Low |
| 10 | 15 | Socket cap upgrade dead | Feature missing | Medium |
| 11 | 4+5+6 | Performance: combat/stat/AI scans | Crucible lag | High |
| 12 | 7 | Multi-layer sprites not rendered | Visual bug | Medium |
| 13 | 16+22 | AI occupied set + detect range | Performance | Medium |
| 14 | 17 | ServiceScreen monolith | Maintainability | High |
| 15 | 19 | Remove offsetHeight hack | Quick win | Low |
