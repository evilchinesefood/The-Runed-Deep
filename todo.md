# Castle of the Winds — Development Plan

Full rewrite from compiled Elm to TypeScript + Vite. DOM-based rendering reusing existing CSS sprite sheets. Single global state architecture. Multi-input support (keyboard, mouse, touch).

---

## Phase 1: Foundation — COMPLETE

### 1.1 Project Cleanup & Reorganization
- [x] Review entire codebase
- [x] Remove compiled Elm JS (`js/cotw.js`)
- [x] Reorganize directory structure for TypeScript rewrite
- [x] Move sprite assets to `public/assets/`
- [x] Clean up HTML files (remove old Elm bootstrap)
- [x] Keep all CSS sprite sheets (they work as-is for DOM rendering)

### 1.2 Vite + TypeScript Setup
- [x] Initialize Vite project with TypeScript template
- [x] Configure `tsconfig.json`
- [x] Create `index.html` entry point
- [x] Establish `src/` directory structure
- [x] Verify dev server runs and serves a basic page
- [x] Wire up existing CSS sprite sheets

### 1.3 Core Game Architecture
- [x] Define `GameState` type (central state object)
- [x] Implement turn-based game loop (player act → resolve → monsters act → resolve → render)
- [x] Input abstraction layer: keyboard, mouse, touch → `GameAction` union type
- [x] Basic DOM renderer: draw a tile grid using existing CSS classes
- [x] Message log system
- [x] Save/load via JSON serialization to localStorage (3 slots, auto-save on stairs, Ctrl+S manual)

---

## Phase 2: Character & Dungeon — COMPLETE

### 2.1 Character Creation
- [x] Name input
- [x] Gender selection (male/female hero sprite)
- [x] Attribute allocation (STR/INT/CON/DEX, exactly 230 points, min 20 max 72)
- [x] Difficulty selection (Easy, Intermediate, Hard, Impossible)
- [x] Starting spell selection (6 Level 1 spells)
- [x] Stat preview showing derived HP/MP/AC
- [x] Character info screen (C key) with attributes, spells, equipment, resistances

### 2.2 Character System
- [x] Four attributes: Strength, Intelligence, Constitution, Dexterity
- [x] Derived stats: HP, MP, Armor Value from attributes
- [x] Full spell database (all 30 spells defined)
- [x] Experience and leveling (doubling XP curve, difficulty scaling)
- [x] HP/MP gains on level-up based on CON/INT
- [x] 20% HP heal on level-up
- [x] Spell learning on level-up (one spell per level, fixed order)
- [x] Max level 30
- [x] XP progress shown in HUD and character info

### 2.3 Dungeon Generation
- [x] Room generation (rectangular — basic)
- [ ] Additional room types (cross, diamond, circular, dead-end)
- [x] Corridor generation connecting rooms
- [x] Stairs placement (up/down)
- [x] Door placement (in wall gaps between rooms and corridors)
- [ ] Locked and secret doors
- [ ] Trap placement (pit, arrow, portal, fire, acid, dart, etc.)
- [ ] Item/treasure placement on ground
- [x] Monster spawning per floor depth (61 types, progressive unlock, weighted)
- [x] Floor persistence (generated once per seed, remembered in state)

### 2.4 Map & Exploration
- [x] Tile-based map rendering (32x32 CSS sprites, two-layer floor+entity)
- [x] 8-directional movement (keyboard arrows/numpad/vim keys)
- [x] Field of view / line of sight (raycasting, radius 4 normal / 10 with Light)
- [x] Fog of war (unexplored = black, explored = dimmed, lit = full brightness)
- [x] Permanent room lighting via Light spell
- [x] Scroll-to-follow camera centered on player
- [x] Stair navigation (> to descend, < to ascend, Enter on stairs)
- [ ] Click/tap-to-move with pathfinding
- [ ] Minimap / full map view

---

## Phase 3: Combat — MOSTLY COMPLETE

### 3.1 Combat System
- [x] Melee attack (walk into enemy tile)
- [x] Hit/miss calculation (based on DEX vs monster evasion)
- [x] Damage calculation (STR + weapon damage)
- [x] Armor reduction on monster attacks
- [x] Monster death → XP award
- [x] Player death → RIP screen with tombstone
- [x] Monster turn AI (move toward player within 20 tiles, attack when adjacent)
- [x] Per-floor difficulty scaling (+8% HP, +5% damage per floor)
- [x] Progressive monster unlock (1-2 new types per floor, weighted spawning)
- [x] Boss monsters on specific floors
- [x] Combat hit flash animations (white on monster, red on hero)
- [x] Centralized difficulty config (Easy/Intermediate/Hard/Impossible)
- [ ] Speed system (encumbrance affects turn order)
- [ ] Loot drops on monster death

### 3.2 Item System — NOT STARTED
- [ ] Item database: weapons, armor, shields, helmets, cloaks, boots, rings, amulets, belts, bracers, gauntlets
- [ ] Item properties: base stats, weight, bulk, value
- [ ] Enchantments (+accuracy, +damage, +AC, resistances, attribute bonuses)
- [ ] Cursed items (negative effects, can't unequip until Remove Curse)
- [ ] Unidentified items (display generic name until identified)
- [ ] Material tiers: regular, elven, meteoric steel
- [ ] Consumables: potions, scrolls, spellbooks, wands, staffs
- [ ] Worthless items (Ring of Adornment, Blank Scroll, etc.)

### 3.3 Inventory & Equipment — NOT STARTED
- [ ] Equipment slots: weapon, shield, helmet, body armor, cloak, bracers, gauntlets, belt, boots, ring x2, amulet, pack, purse
- [ ] Equip/unequip with stat recalculation
- [ ] Weight and bulk tracking with encumbrance
- [ ] Container system: packs (weight+bulk limit), chests, belts (slot-based), purses (money only)
- [ ] Pack of Holding (magic compression)
- [ ] Drag-drop inventory management (mouse + touch)
- [ ] Item pickup, drop, throw
- [ ] Currency: copper pieces

---

## Phase 4: Magic — MOSTLY COMPLETE

### 4.1 Spell System (30 Spells)

**Attack spells:**
- [x] Magic Arrow (L1, 1 MP) — directional bolt with animation
- [x] Cold Bolt (L2, 2 MP) — directional bolt, cold element
- [x] Lightning Bolt (L3, 3 MP) — directional bolt, lightning element
- [x] Fire Bolt (L3, 3 MP) — directional bolt, fire element
- [x] Cold Ball (L3, 4 MP) — AoE with explosion animation
- [x] Ball Lightning (L4, 4 MP) — AoE, lightning element
- [x] Fire Ball (L4, 5 MP) — AoE, fire element

**Healing spells:**
- [x] Heal Minor Wounds — 15% HP with green pulse
- [x] Heal Medium Wounds — 35% HP
- [x] Heal Major Wounds — 60% HP
- [x] Healing / full restore — 100% HP
- [x] Neutralize Poison

**Defense spells:**
- [x] Shield — +4 AC for 30 turns (no stacking, refreshes duration)
- [x] Resist Cold/Lightning/Fire — +50% resist for 50 turns (removed on expiry)

**Control spells:**
- [x] Sleep Monster — directional targeting
- [x] Slow Monster — directional targeting
- [ ] Transmogrify Monster — not yet implemented

**Movement spells:**
- [x] Phase Door — directional teleport up to 6 tiles
- [x] Levitation — message only (trap avoidance not yet)
- [x] Rune of Return — message only (town not yet)
- [x] Teleport — random position on floor

**Divination spells:**
- [x] Detect Objects/Monsters/Traps — reveals positions
- [x] Identify — message only (items not yet)
- [x] Clairvoyance — reveals 10x10 area

**Misc spells:**
- [x] Light — permanent room illumination, extended FOV
- [x] Remove Curse — message only (cursed items not yet)

**Spell mechanics:**
- [x] Mana cost system, bolt/ball targeting, spell bar (keys 1-9)
- [x] Click-to-cast (click spell bar then click map direction)
- [x] Directional sprite rotation on projectiles
- [x] Projectile animations stop at walls
- [x] Active effect duration tracking with expiry + stat reversal
- [x] Elemental resistance calculations
- [ ] Spellbook items teach spells permanently
- [ ] Wand/staff charges for non-learnable spells

### 4.2 Monster System
- [x] 61 non-boss + 7 boss monsters with full stats
- [x] Progressive unlock (1-2 new types per floor across 40 floors)
- [x] Basic melee AI, weighted spawning, difficulty scaling
- [ ] Ranged AI: spellcasting monsters
- [ ] Special abilities: drain stats, steal money, summon allies, poison
- [ ] Physical-immune monsters (slimes — must use magic)

---

## Phase 5: Town & Economy — NOT STARTED
- [ ] Town map with building sprites
- [ ] Weapon/Armor/General/Magic shops
- [ ] Junk store (Olaf's)
- [ ] Temple of Odin (healing, remove curse)
- [ ] Sage (item identification)
- [ ] Bank, Inn
- [ ] Rune of Return (town ↔ dungeon teleport)

---

## Phase 6: Story & Progression — NOT STARTED
- [x] Boss data defined
- [ ] Pre-designed boss floors with rewards
- [ ] Dungeon progression (Mine → Fortress → Castle)
- [ ] Story text / parchment scraps
- [ ] Three towns with increasing services
- [ ] Opening sequence

---

## Phase 7: Polish & Completeness

### 7.1 UI
- [x] Character info screen, spell bar, death screen
- [x] Spell animations (projectiles, explosions, pulses, flashes)
- [ ] Spell selection UI (full list beyond 9)
- [ ] Context menus, tooltips
- [ ] Difficulty indicator in HUD

### 7.2 Touch Controls
- [x] Swipe gestures for movement
- [ ] Virtual d-pad, tap-to-move, long-press context

### 7.3 Game Features
- [x] Save/load (3 slots, auto-save on stairs, Ctrl+S)
- [x] Difficulty scaling (centralized config, affects all monster stats)
- [ ] Trap detection, triggering, disarming
- [ ] Secret doors
- [ ] Rest/sleep to recover HP/MP
- [ ] Scoring / leaderboard

### 7.4 Mobile & Responsive
- [ ] Responsive layout, portrait/landscape, touch inventory
