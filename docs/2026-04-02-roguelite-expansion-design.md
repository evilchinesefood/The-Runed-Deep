# The Runed Deep — Roguelite Expansion Spec

## Context

Transform RD from a linear 30-floor dungeon into a roguelite hub with repeatable side content, permanent progression, and build variety. The main dungeon remains the core experience. New systems layer on top.

This spec also includes structural changes: 30-floor dungeon (down from 40), 1-indexed floors, monster group system (hard cutoffs every 5 floors), boss every 5 floors, junk store removal.

## Sub-Projects

Build order: A → B → C → D. Each is independently playable once complete.

- **A: Core Restructure + Rune Shards + Fractured Rifts**
- **B: The Crucible (Survival Arena)**
- **C: Rune Sockets + Rune Forge + 16 Rune Effects**
- **D: Statue of Fortune + Essence + Achievements**

---

## Structural Changes (Part of Sub-Project A)

### Floor Count: 40 → 30

- Main dungeon is now floors 1-30 (internally 1-indexed everywhere)
- All floor references change from 0-indexed to 1-indexed (floor keys, generation, depth calcs, tileset ranges, save migration)
- Floor key format: `"mine-1"` through `"mine-10"`, `"fortress-11"` through `"fortress-20"`, `"castle-21"` through `"castle-30"`

### Tileset Ranges (1-indexed)

| Floors | Dungeon ID | Wall Tint |
|---|---|---|
| 1-10 | mine | none |
| 11-20 | fortress | blue #6688bb |
| 21-30 | castle | orange #bb7755 |

### Boss Floors: Every 5 Floors

| Floor | Boss | Notes |
|---|---|---|
| 5 | NEW — Queen Ant or Hydra | Early game intro boss |
| 10 | NEW — Death Knight or Iron Golem | Mid-early step up |
| 15 | Hrungnir, Hill Giant Lord | Existing, renumbered |
| 20 | Wolf-Man | Existing, renumbered |
| 25 | Frost Giant King | Existing, renumbered |
| 30 | Surtur (final) | Existing, renumbered from 40 |

Old bosses at floors 25 (Bear-Man), 33 (Stone Giant King), 36 (Fire Giant King) are removed or repurposed.

### Monster Groups — Hard Cutoffs Every 5 Floors

Monsters have `minFloor`/`maxFloor` instead of just `unlockFloor`. Once you leave a group's range, those monsters stop spawning entirely.

| Floors | Group | Theme |
|---|---|---|
| 1-5 | Early | Vermin, beasts (rats, snakes, bats, ants, bees) |
| 6-10 | Underground | Undead, goblins (skeletons, shadows, hobgoblins) |
| 11-15 | Deep | Trolls, ogres, wolves |
| 16-20 | Fortress | Warriors, constructs (golems, bandits, wizards) |
| 21-25 | Depths | Demons, elementals (elementals, devils, dragons) |
| 26-30 | Castle | Elite, legendary (giants, fiends, dragon lords) |

### New Monsters

**Shrieker** — Stationary fungus. Uncommon spawn weight. When player enters vision range, alerts ALL monsters on the floor. No attack. Low HP. Message: "The Shrieker lets out a piercing shriek! You hear movement in the darkness..." Sprite: ghost-moth or treant.

**War Drummer** — Mobile alerter. Uncommon spawn weight. Mid-floor unlock. When it spots the player, alerts all monsters within 10-tile radius. Weak melee attack. Sprite: spriggan-berserker or warmonger.

**Alert mechanic:** Alerted monsters get `alerted: boolean` flag. They pathfind toward the player even without line of sight. Flag clears when the player is no longer on the floor.

### Town Changes

- **Junk Store removed** entirely
- **General Store** moves to old Junk Store location
- **Rune Forge** (new) takes old General Store location
- **Rift Stone** (new) placed outside the Rune Forge
- **Statue of Fortune** (new) placed in remaining open space

### Junk Store Removal

- Remove from `SHOP_DEFS` in Shops.ts
- Remove from `TOWN_BUILDINGS` in TownMap.ts
- Remove `"junk-store"` references from ShopScreen.ts sell logic
- Items previously only sellable at junk store can be sold at any shop (off-category rate)

---

## Sub-Project A: Rune Shards + Fractured Rifts

### New Currency: Rune Shards

- `hero.runeShards: number` on Hero type
- Persists through NG+
- Displayed in HUD alongside gold

**Sources:**
- Main dungeon boss kills: 5 shards per boss
- Fractured Rift completion: 5 base + difficulty bonus from modifier weights
- Crucible waves: 1/wave (w1-10), 2/wave (w11-20), 3/wave (w21-30) + milestones (+5 w10, +10 w20, +20 w30)

### Rift Stone

- Town interactable, unlocks after clearing floor 15
- `riftStoneUnlocked: boolean` on GameState
- Interacting opens Rift menu screen

### Rift State

```
activeRift: {
  seed: number;
  modifiers: RiftModifier[];
  currentFloor: number;
  totalFloors: number;  // 5-10
  shardsEarned: number;
} | null
```

Stored on GameState. `currentDungeon = "rift"` when inside.

### Rift Offering Persistence

- `riftOffering: { seed, modifiers, rerollCount } | null` on GameState
- Persists until player enters or completes a rift
- Leaving town, dying, saving/loading does NOT reset it
- Reroll cost: 50 gold per reroll

### Rift Modifiers (12 total)

| Modifier | Effect | Difficulty Weight |
|---|---|---|
| Darkness | Vision radius halved | +1 |
| Frenzied | Monsters get +1 action per turn | +2 |
| Brittle | All enemies have -50% HP | -2 |
| Silence | No spellcasting — player, monsters, AND wands | +1 |
| Abundance | Double item drops | -1 |
| Cursed Ground | No regen, poison ticks on player each turn | +2 |
| Glass Cannon | Player deals 2x damage, takes 2x damage | +1 |
| Swarm | Double monster spawns, half XP each | +1 |
| Elemental Surge | All monsters deal fire/ice/lightning (random per rift) | +1 |
| Packhunter | Monsters alert in groups when one spots player | +1 |
| Fortunate | Double Rune Shard reward | -1 |
| Enfeebled | Player starts and stays at half max HP and half max MP | +2 |

2-5 modifiers rolled per rift.

### Rift Floor Generation

- Uses existing `generateFloor` with random tileset (mine/fortress/castle + new tilesets from unused wall sprites in the sheet)
- Monster pool based on player's deepest floor reached, not tileset
- Player enters with current gear/level/stats (same hero)
- Keep all loot found inside
- 5-10 floors per run

### Rift Modifier Display

- Show modifiers BEFORE entering with total difficulty weight
- Show estimated shard reward
- Options: Enter, Reroll (50g), Leave
- After completion: summary screen showing modifiers, floors cleared, shards earned, items found

### Death in Rifts

- Return to town, same as normal death
- Lose rift progress (must start new rift)
- Keep items picked up before death

### Saving in Rifts

- Manual saves only (no auto-save on stair transitions)
- Rift state persisted in save

---

## Sub-Project B: The Crucible

### Structure

- Always available from the start (town building)
- Single large procedural arena room — random shape and obstacle placement each entry, always one room
- Waves of enemies, escalating difficulty

### Crucible State

```
activeCrucible: {
  wave: number;
  shardsEarned: number;
  monstersRemaining: number;
} | null
```

`currentDungeon = "crucible"` when inside.

### Arena Generation

- One big room, procedurally shaped (rectangular, oval, L-shaped, etc.)
- Random obstacle placement (pillars, water, walls) for tactical variety
- No corridors, no doors, no stairs
- Player starts in center

### Wave Progression

- **Wave 1-9:** Single monster type per wave, base scaling
- **Wave 5, 10, 15, 20...:** Boss wave — random boss, scaled to wave number
- **Wave 10+:** Mix multiple monster types per wave
- **Wave 20+:** Elite modifiers on regular monsters (extra HP, extra damage)

### Wave Scaling

Monster stats: `baseStat * (1 + wave * 0.15)`

| Wave | Multiplier |
|---|---|
| 1 | 1.15x |
| 5 | 1.75x |
| 10 | 2.5x |
| 20 | 4.0x |
| 30 | 5.5x |

Monster pool starts with early-game monsters, introduces harder ones as waves progress.

### Between Waves

- Brief pause after clearing all enemies
- Player can use potions, cast spells, use items
- No free/passive healing (no regen ticks between waves)
- Choose: **Continue** or **Leave** (collect all rewards)

### Drops

- Gold only from killed monsters (no gear drops)
- Rune Shards are the real reward

### Shard Rewards

- Waves 1-10: 1 shard per wave
- Waves 11-20: 2 shards per wave
- Waves 21-30: 3 shards per wave
- Milestones: +5 (wave 10), +10 (wave 20), +20 (wave 30)

### Death in Crucible

- Keep everything earned (shards + gold)
- Return to town
- `crucibleBestWave: number` tracked on GameState

### Saving in Crucible

- Manual saves only

---

## Sub-Project C: Rune Sockets + Rune Forge + Rune Effects

### Sockets on Items

- New property: `sockets: (string | null)[]` on Item type
- Empty socket = `null`, inscribed rune = rune effect ID string
- Items can naturally roll 0-2 sockets during generation
- Socket chance scales with depth and item quality
- Save migration: existing items get `sockets: []` (mostly irrelevant — players will start new saves)

### Socket Display

- Tooltips show socket slots: filled sockets show rune name/icon, empty show "Empty Socket"
- Socketed items get a subtle visual indicator

### Rune Forge (Town Building)

Always available from the start, like other shops. Located at old General Store position.

**Services:**

| Service | Cost | Effect |
|---|---|---|
| Add Socket | 10 shards + 200g | Add empty socket to item (if below cap) |
| Inscribe Rune (Common) | 5 shards | Pick from full list, write into empty socket |
| Inscribe Rune (Uncommon) | 15 shards | Pick from full list |
| Inscribe Rune (Rare) | 40 shards | Pick from full list |
| Erase Rune | 100g | Remove rune, socket becomes empty. "The inscription will be ground away. The socket will remain empty." |
| Socket Cap Upgrade (2→3) | 100 shards | One-time permanent. `runeForgeMaxSockets: 2 | 3` on GameState |

### Socket Cap

- Natural roll: 0-2 sockets
- Rune Forge can add sockets up to the cap
- Base cap: 2. After permanent upgrade: 3.
- Cap tracked on GameState, persists through NG+

### Duplicate Rules

- Same rune on same item: NOT allowed
- Same rune on different items: allowed, effects stack

### Selling/Sacrificing Socketed Items

- Warning: "The runes etched into this item will be destroyed. Sell anyway?"
- Sacrifice warning: "The runes inscribed here will shatter upon sacrifice. Proceed?"
- Runes are lost with no refund

### 16 Rune Effects

All runes scale with the item's enchantment: `base * max(1, enchantment)`. Same formula as affixes.

**Common (5 shards):**

| Rune | Base | Effect |
|---|---|---|
| Flame | 1 | +% fire damage on attacks |
| Frost | 1 | +% cold damage, % chance to slow |
| Iron | 1 | +flat AC |
| Vigor | 1 | +max HP |
| Focus | 1 | +max MP |
| Fortune | 2 | +% gold find |
| Precision | 0.5 | +% critical hit chance |

**Uncommon (15 shards):**

| Rune | Base | Effect |
|---|---|---|
| Renewal | 0.25 | +HP regen per turn |
| Siphon | 1 | +MP per kill |
| Warding | 0.5 | +% all elemental resist |
| Thorns | 0.5 | +% damage reflected |
| Anchor | — | Prevent death 1x per floor/wave. Depleted on trigger, recharges on floor/wave transition. "The Anchor rune flares with light — you cling to life!" |

**Rare (40 shards):**

| Rune | Base | Effect |
|---|---|---|
| Splitting | 1 | +% splash damage to adjacent enemies |
| Echo | 1 | +% chance to double-cast spells |
| Phantom | 0.25 | +% dodge chance |
| Conversion | 0.5 | +% overkill damage healed |

### Rune Integration Points

Runes feed into `recomputeDerivedStats` and combat calculations the same way affixes do. The code sums rune values across all equipped items' sockets alongside affix values.

---

## Sub-Project D: Statue of Fortune + Essence + Achievements

### Statue of Fortune (Town Building)

Always available. Placed in open town space.

### Essence Currency

- `hero.essence: number` on Hero type
- Persists through NG+

### Sacrifice

Sacrifice any inventory item → receive Essence.

| Item Quality | Essence |
|---|---|
| Plain item | 1 |
| Enchanted | 1 + enchantment level |
| Per affix | +1 each |
| Unique | 10 base |
| Blessed | +2 bonus |
| Cursed | +1 bonus |

Runes in sockets are erased on sacrifice (no refund). Warning shown.

### Statue Upgrades (36 paths)

All upgrades: +1 purchase = cost scales 5, 10, 15, 20, 25... (+5 per purchase of same upgrade). No cap.

**Base Stats (4):**

| Upgrade | Per Purchase |
|---|---|
| +STR | +5 |
| +INT | +5 |
| +CON | +5 |
| +DEX | +5 |

**Combat (2):**

| Upgrade | Per Purchase |
|---|---|
| +Base Damage | +1 |
| +Armor | +1 |

**Affix Effectiveness (25):**
- One upgrade path per affix (all 25 affixes)
- +1 effective enchantment level for all instances of that affix across all equipment
- Same scaling formula as affixes

**Resistances (3):**

| Upgrade | Per Purchase |
|---|---|
| +Fire Resist | +2 |
| +Cold Resist | +2 |
| +Lightning Resist | +2 |

**Resources (2):**

| Upgrade | Per Purchase |
|---|---|
| +Max HP | +3 |
| +Max MP | +3 |

### Statue State

```
statueUpgrades: Record<string, number>  // upgrade_id → purchase count
```

On GameState. Persists through NG+.

### Statue Integration

Statue bonuses feed into `recomputeDerivedStats`:
- Base stat upgrades add directly to hero attributes
- Combat upgrades add to `equipDamageBonus` / `armorValue`
- Affix effectiveness adds to the enchantment level used in `getEquipAffixTotal`
- Resistances add to elemental resist calculations
- Resources add to max HP/MP

### New Achievements

| Achievement | Trigger |
|---|---|
| Rift Walker | First Fractured Rift clear |
| Rift Master | Clear a rift with 3+ hard modifiers (total weight >= 5) |
| Crucible Initiate | Reach Crucible wave 10 |
| Crucible Veteran | Reach Crucible wave 20 |
| Crucible Legend | Reach Crucible wave 30 |
| Rift Runner | Clear 10 total rifts |
| Rift Champion | Clear 25 total rifts |
| Rift Conqueror | Clear 50 total rifts |
| Devoted | Sacrifice 50 items at Statue |
| Runesmith | Inscribe your first rune |
| Fully Socketed | Fill all 3 sockets on an item |

---

## GameState Changes Summary

```
GameState additions:
  riftStoneUnlocked: boolean
  riftOffering: { seed, modifiers, rerollCount } | null
  activeRift: RiftState | null
  activeCrucible: CrucibleState | null
  runeForgeMaxSockets: 2 | 3
  statueUpgrades: Record<string, number>
  crucibleBestWave: number
  riftsCompleted: number
  itemsSacrificed: number

Hero additions:
  runeShards: number
  essence: number

Item changes:
  sockets: (string | null)[]

Monster changes:
  minFloor / maxFloor (replaces unlockFloor)
  alerted: boolean (runtime only, not saved)

Type changes:
  Difficulty: add "nightmare" — already done this session
  Screen: add "rift-menu", "crucible-menu", "rift-summary", "crucible-summary"
  currentDungeon: add "rift" | "crucible"
```

---

## NG+ Carry-Over

All expansion state persists through NG+:
- Rune Shards, Essence
- Runes inscribed in socketed gear
- Rift Stone unlocked status
- Rune Forge socket cap upgrade
- Statue of Fortune upgrades
- Crucible best wave record
- Rifts completed count

---

## Files to Modify (Key)

| File | Changes |
|---|---|
| `src/core/types.ts` | All new types, Screen additions, Item.sockets, Monster.minFloor/maxFloor |
| `src/core/game-state.ts` | New initial state fields |
| `src/core/actions.ts` | Rift/crucible transitions, building routing, 1-indexing |
| `src/core/save-load.ts` | Migration for all new fields, floor key renaming, difficulty |
| `src/core/game-loop.ts` | Rift modifier effects, crucible wave logic |
| `src/data/monsters.ts` | minFloor/maxFloor, new monsters (Shrieker, War Drummer) |
| `src/data/items.ts` | Socket generation on items |
| `src/data/Enchantments.ts` | Rune effect definitions |
| `src/data/difficulty.ts` | Already updated this session |
| `src/systems/dungeon/generator.ts` | 1-indexed floors, rift generation, new tilesets |
| `src/systems/dungeon/Tilesets.ts` | New tileset ranges, rift tilesets |
| `src/systems/dungeon/BossFloors.ts` | New bosses at 5/10, renumber existing, remove old |
| `src/systems/monsters/spawning.ts` | Group-based spawning, alert mechanic |
| `src/systems/monsters/ai.ts` | Alert pathfinding for Packhunter/Shrieker/War Drummer |
| `src/systems/items/loot.ts` | Socket rolling, rune shard drops from bosses |
| `src/systems/town/TownMap.ts` | Remove junk store, add new buildings, rearrange |
| `src/systems/town/Shops.ts` | Remove junk store def |
| `src/systems/town/Services.ts` | Enchanter cap (done), new service routing |
| `src/systems/character/derived-stats.ts` | Rune bonuses, statue bonuses |
| `src/systems/combat/combat.ts` | Rune combat effects, anchor rune |
| `src/systems/Achievements.ts` | New achievement definitions and tracking |
| `src/systems/Scoring.ts` | Already updated this session |
| `src/ui/ServiceScreen.ts` | New building UIs (Rift Stone, Rune Forge, Statue) |
| `src/ui/item-tooltip.ts` | Socket display |
| `src/ui/inventory-screen.ts` | Socket display, sell warnings |
| `src/ui/ShopScreen.ts` | Sell warnings for socketed items |
| `src/ui/character-info.ts` | Rune shard/essence display |
| `src/rendering/hud-renderer.ts` | Rune shard display |
| `src/main.ts` | New screen cases, rift/crucible render loops |

### New Files

| File | Purpose |
|---|---|
| `src/systems/rift/RiftGen.ts` | Rift floor generation, modifier application |
| `src/systems/rift/RiftModifiers.ts` | Modifier definitions and effects |
| `src/systems/crucible/CrucibleGen.ts` | Arena generation |
| `src/systems/crucible/WaveManager.ts` | Wave spawning, scaling, progression |
| `src/data/Runes.ts` | Rune effect definitions (16 runes) |
| `src/ui/RiftMenuScreen.ts` | Rift Stone UI — modifier display, enter/reroll |
| `src/ui/RiftSummaryScreen.ts` | Post-rift results screen |
| `src/ui/CrucibleMenuScreen.ts` | Crucible entry UI |
| `src/ui/CrucibleSummaryScreen.ts` | Post-crucible results screen |

---

## Verification

After each sub-project:
1. `npx tsc --noEmit` — no new type errors
2. `npx vite build --base=/rd/` — builds successfully
3. Spin up 3 review agents in parallel:
   - **Game Developer** (`~/.claude/projects/-home-evilc/memory/agents/volt/07-specialized-domains/game-developer.md`) — gameplay logic, balance, player experience
   - **Performance Engineer** (`~/.claude/projects/-home-evilc/memory/agents/volt/04-quality-security/performance-engineer.md`) — runtime performance, memory, rendering
   - **Code Reviewer** (`~/.claude/projects/-home-evilc/memory/agents/volt/04-quality-security/code-reviewer.md`) — code quality, patterns, bugs
4. Address findings from all 3 reviewers
5. Deploy to dev.jdayers.com/rd/
6. User tests live on site
7. Fix any issues found, redeploy

4 sub-projects = 4 deploy + test cycles.
