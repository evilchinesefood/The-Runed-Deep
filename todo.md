# Castle of the Winds — Development Plan

Full rewrite from compiled Elm to TypeScript + Vite. DOM-based rendering reusing existing CSS sprite sheets. Single global state architecture. Multi-input support (keyboard, mouse, touch).

---

## Phase 1: Foundation

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
- [ ] Save/load via JSON serialization to localStorage

---

## Phase 2: Character & Dungeon

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
- [ ] Item/treasure placement
- [x] Monster spawning per floor depth (61 types, progressive unlock, weighted)
- [x] Floor persistence (generated once per seed, remembered in state)

### 2.4 Map & Exploration
- [x] Tile-based map rendering (32x32 CSS sprites, two-layer floor+entity)
- [x] 8-directional movement (keyboard arrows/numpad/vim keys)
- [x] Field of view / line of sight (raycasting, extended radius with Light spell)
- [x] Fog of war (unexplored = black, explored but not visible = dimmed)
- [x] Scroll-to-follow camera centered on player
- [x] Stair navigation (> to descend, < to ascend, Enter on stairs)
- [ ] Click/tap-to-move with pathfinding
- [ ] Minimap / full map view

---

## Phase 3: Combat & Items

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
- [ ] Speed system (encumbrance affects turn order)
- [ ] Loot drops on monster death

### 3.2 Item System
- [ ] Item database: weapons, armor, shields, helmets, cloaks, boots, rings, amulets, belts, bracers, gauntlets
- [ ] Item properties: base stats, weight, bulk, value
- [ ] Enchantments (+accuracy, +damage, +AC, resistances, attribute bonuses)
- [ ] Cursed items (negative effects, can't unequip until Remove Curse)
- [ ] Unidentified items (display generic name until identified)
- [ ] Material tiers: regular, elven, meteoric steel
- [ ] Consumables: potions, scrolls, spellbooks, wands, staffs
- [ ] Worthless items (Ring of Adornment, Blank Scroll, etc.)

### 3.3 Inventory & Equipment
- [ ] Equipment slots: weapon, shield, helmet, body armor, cloak, bracers, gauntlets, belt, boots, ring x2, amulet, pack, purse
- [ ] Equip/unequip with stat recalculation
- [ ] Weight and bulk tracking with encumbrance
- [ ] Container system: packs (weight+bulk limit), chests, belts (slot-based), purses (money only)
- [ ] Pack of Holding (magic compression)
- [ ] Drag-drop inventory management (mouse + touch)
- [ ] Item pickup, drop, throw
- [ ] Currency: copper pieces

---

## Phase 4: Magic & Monsters

### 4.1 Spell System (30 Spells)

**Attack spells:**
- [x] Magic Arrow (L1, 1 MP) — directional bolt
- [x] Cold Bolt (L2, 2 MP) — directional bolt, cold element
- [x] Lightning Bolt (L3, 3 MP) — directional bolt, lightning element
- [x] Fire Bolt (L3, 3 MP) — directional bolt, fire element
- [x] Cold Ball (L3, 4 MP) — AoE, cold element
- [x] Ball Lightning (L4, 4 MP) — AoE, lightning element
- [x] Fire Ball (L4, 5 MP) — AoE, fire element

**Healing spells:**
- [x] Heal Minor Wounds (L1, 1 MP) — 15% HP
- [x] Heal Medium Wounds (L3, 3 MP) — 35% HP
- [x] Heal Major Wounds (L4, 5 MP) — 60% HP
- [x] Healing / full restore (L5, 6 MP) — 100% HP
- [x] Neutralize Poison (L2, 3 MP)

**Defense spells:**
- [x] Shield (L1, 1 MP) — +4 AC for 30 turns
- [x] Resist Cold (L3, 3 MP) — +50% cold resist for 50 turns
- [x] Resist Lightning (L3, 3 MP) — +50% lightning resist for 50 turns
- [x] Resist Fire (L3, 3 MP) — +50% fire resist for 50 turns

**Control spells:**
- [x] Sleep Monster (L3, 4 MP) — directional targeting
- [x] Slow Monster (L3, 4 MP) — directional targeting
- [ ] Transmogrify Monster (L5, 6 MP) — not yet implemented

**Movement spells:**
- [x] Phase Door (L1, 1 MP) — random short teleport
- [x] Levitation (L2, 2 MP) — message only (trap avoidance not yet)
- [x] Rune of Return (L3, 3 MP) — message only (town not yet)
- [x] Teleport (L3, 3 MP) — random position on floor

**Divination spells:**
- [x] Detect Objects (L1, 1 MP) — reveals item positions
- [x] Detect Monsters (L2, 2 MP) — reveals monster positions
- [x] Detect Traps (L2, 2 MP) — reveals trap positions
- [x] Identify (L2, 2 MP) — message only (items not yet)
- [x] Clairvoyance (L2, 3 MP) — reveals 10x10 area

**Misc spells:**
- [x] Light (L1, 1 MP) — extended FOV (12 vs 8) for 100 turns
- [x] Remove Curse (L3, 3 MP) — message only (cursed items not yet)

**Spell mechanics:**
- [x] Mana cost system (minimum 1 MP)
- [x] Bolt targeting (line projectile up to 12 tiles)
- [x] Ball targeting (AoE, 1-tile blast radius, half damage adjacent)
- [x] Spell shortcut bar (number keys 1-9)
- [x] Spell bar in HUD showing known spells with hotkeys
- [x] Spell targeting mode indicator
- [x] Active effect duration tracking with expiry messages
- [x] Elemental resistance calculations
- [ ] Spellbook items teach spells permanently
- [ ] Wand/staff charges for non-learnable spells

### 4.2 Monster System
- [x] Monster database with stats (61 non-boss + 7 boss monsters)
- [x] Monster categories: animals, humanoids, undead, giants, dragons, elementals, devils, wizards
- [x] Basic AI: move toward player, attack when adjacent
- [x] Elemental immunities/resistances per monster type
- [x] Monster spawning scaled to dungeon depth (progressive tier unlock)
- [x] Boss monsters on specific floors (Hrungnir, Wolf-Man, Bear-Man, Giant Kings, Surtur)
- [ ] Ranged AI: spellcasting monsters (Cold/Lightning/Fire Bolt)
- [ ] Special abilities: drain stats, steal money, summon allies, poison
- [ ] Physical-immune monsters (slimes — must use magic)

---

## Phase 5: Town & Economy

### 5.1 Town Map
- [ ] Town rendered as a special non-combat map
- [ ] Building exteriors using existing building sprites
- [ ] Click/tap building to enter
- [ ] Building interior views with NPC interaction

### 5.2 Shops & Services
- [ ] Weapon shop — buy/sell weapons
- [ ] Armor shop — buy/sell armor
- [ ] General store — potions, scrolls, spellbooks, containers
- [ ] Magic shop — wands, staffs, enchanted items
- [ ] Junk store (Olaf's) — buys anything for max 25 CP
- [ ] Shop inventory with restocking over time

### 5.3 Town Services
- [ ] Temple of Odin — healing, remove curse, restore drained attributes
- [ ] Sage — item identification for a fee
- [ ] Bank — deposit money, letters of credit
- [ ] Inn — rest to restore HP/MP

### 5.4 Rune of Return
- [ ] Teleport between town and deepest visited dungeon level
- [ ] Works from town → dungeon and dungeon → town

---

## Phase 6: Story & Progression

### 6.1 Dungeon Progression
- [ ] Abandoned Mine (4 levels) — starting area
- [ ] Fortress near Bjarnhaven (11 levels) — mid-game
- [ ] Ruined Castle (25 levels) — Part 2 endgame

### 6.2 Boss Encounters
- [x] Boss data defined (Hrungnir, Wolf-Man, Bear-Man, Giant Kings, Surtur)
- [ ] Pre-designed boss floors
- [ ] Boss-specific loot rewards

### 6.3 Story Elements
- [ ] Opening sequence (farm destroyed, godparents killed)
- [ ] Parchment scraps at key dungeon points
- [ ] Enchanted Amulet of Kings reward (drain resistance)
- [ ] Town transitions (Tiny Hamlet → Bjarnhaven → Castle Town)
- [ ] NPC dialogue and quest guidance

### 6.4 Three Towns
- [ ] Tiny Hamlet (basic services)
- [ ] Bjarnhaven (more shops, bank)
- [ ] Castle Town (full services, 10 merchants, Jarl)

---

## Phase 7: Polish & Completeness

### 7.1 UI Polish
- [x] Character info screen with attribute bar graphs
- [x] Spell bar with number key labels
- [x] Death/RIP screen with tombstone and cause of death
- [ ] Spell selection UI (full list beyond 9)
- [ ] Context menus (right-click / long-press)
- [ ] Tooltips for items and monsters
- [ ] Difficulty indicators

### 7.2 Touch Controls
- [ ] Virtual d-pad overlay for movement
- [ ] Tap-to-move with pathfinding
- [ ] Long-press for context actions
- [ ] Touch-friendly button sizes (min 44px)
- [x] Swipe gestures for directional movement

### 7.3 Game Features
- [ ] Save/load (multiple save slots)
- [ ] Trap detection, triggering, disarming
- [ ] Secret door detection
- [ ] Search action
- [ ] Rest/sleep to recover HP/MP
- [ ] Time system (actions consume in-game time)
- [ ] Scoring / Valhalla's Champions leaderboard
- [ ] Item renaming

### 7.4 Mobile & Responsive
- [ ] Responsive layout scaling
- [ ] Portrait and landscape support
- [ ] Touch-optimized inventory management
- [ ] Performance optimization for mobile browsers
