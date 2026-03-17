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
- [ ] Experience and leveling (XP curve doubles per level)
- [ ] HP/MP gains on level-up based on CON/INT
- [ ] Spell learning on level-up
- [ ] Max level 30

### 2.3 Dungeon Generation
- [x] Room generation (rectangular — basic)
- [ ] Additional room types (cross, diamond, circular, dead-end)
- [x] Corridor generation connecting rooms
- [x] Stairs placement (up/down)
- [x] Door placement (open, closed)
- [ ] Locked and secret doors
- [ ] Trap placement (pit, arrow, portal, fire, acid, dart, etc.)
- [ ] Item/treasure placement
- [ ] Monster spawning per floor depth
- [ ] Floor persistence (generated once, remembered)

### 2.4 Map & Exploration
- [x] Tile-based map rendering (32x32 CSS sprites)
- [x] 8-directional movement (keyboard arrows/numpad/vim keys)
- [x] Field of view / line of sight (raycasting)
- [x] Fog of war (unexplored = hidden, explored but not visible = dimmed)
- [x] Scroll-to-follow camera centered on player
- [ ] Click/tap-to-move with pathfinding
- [ ] Light spell illumination
- [ ] Minimap / full map view

---

## Phase 3: Combat & Items

### 3.1 Combat System
- [ ] Melee attack (walk into enemy tile)
- [ ] Hit/miss calculation (based on DEX, weapon accuracy, monster evasion)
- [ ] Damage calculation (STR + weapon damage dice)
- [ ] Armor reduction
- [ ] Monster death → XP award → loot drop
- [ ] Player death → RIP screen
- [ ] Monster turn AI (move toward player, attack when adjacent)
- [ ] Speed system (encumbrance affects turn order)
- [ ] Difficulty scaling (monster HP/damage multipliers)

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
- [ ] Magic Arrow (L1, 1 MP)
- [ ] Cold Bolt (L2, 2 MP)
- [ ] Lightning Bolt (L3, 3 MP)
- [ ] Fire Bolt (L3, 3 MP)
- [ ] Cold Ball (L3, 4 MP) — AoE
- [ ] Ball Lightning (L4, 4 MP) — AoE
- [ ] Fire Ball (L4, 5 MP) — AoE

**Healing spells:**
- [ ] Heal Minor Wounds (L1, 1 MP)
- [ ] Heal Medium Wounds (L3, 3 MP)
- [ ] Heal Major Wounds (L4, 5 MP)
- [ ] Healing / full restore (L5, 6 MP)
- [ ] Neutralize Poison (L2, 3 MP)

**Defense spells:**
- [ ] Shield (L1, 1 MP)
- [ ] Resist Cold (L3, 3 MP)
- [ ] Resist Lightning (L3, 3 MP)
- [ ] Resist Fire (L3, 3 MP)

**Control spells:**
- [ ] Sleep Monster (L3, 4 MP)
- [ ] Slow Monster (L3, 4 MP)
- [ ] Transmogrify Monster (L5, 6 MP)

**Movement spells:**
- [ ] Phase Door (L1, 1 MP)
- [ ] Levitation (L2, 2 MP)
- [ ] Rune of Return (L3, 3 MP) — town ↔ dungeon
- [ ] Teleport (L3, 3 MP)

**Divination spells:**
- [ ] Detect Objects (L1, 1 MP)
- [ ] Detect Monsters (L2, 2 MP)
- [ ] Detect Traps (L2, 2 MP)
- [ ] Identify (L2, 2 MP)
- [ ] Clairvoyance (L2, 3 MP)

**Misc spells:**
- [ ] Light (L1, 1 MP)
- [ ] Remove Curse (L3, 3 MP)

**Spell mechanics:**
- [ ] Mana cost system (minimum 1 MP)
- [ ] Bolt targeting (line projectile)
- [ ] Ball targeting (AoE, 1-tile blast radius, half damage adjacent)
- [ ] Spell shortcut bar (up to 9 spells)
- [ ] Spellbook items teach spells permanently
- [ ] Wand/staff charges for non-learnable spells

### 4.2 Monster System (~90 Types)
- [ ] Monster database with stats (HP, damage, speed, XP value, resistances)
- [ ] Monster categories: animals, humanoids, undead, giants, dragons, elementals, devils, wizards
- [ ] Basic AI: move toward player, attack when adjacent
- [ ] Ranged AI: spellcasting monsters (Cold/Lightning/Fire Bolt)
- [ ] Special abilities: drain stats (undead), steal money (Sneak Thief), summon allies (wizards/devils), poison (scorpions/vipers)
- [ ] Elemental immunities/resistances per monster type
- [ ] Physical-immune monsters (slimes — must use magic)
- [ ] Monster spawning scaled to dungeon depth
- [ ] Boss monsters with pre-designed encounters

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
- [ ] Hrungnir the Hill Giant Lord (end of Part 1)
- [ ] Wolf-Man, Bear-Man (Ruined Castle mid-bosses)
- [ ] Four Giant Kings (late-game bosses)
- [ ] Surtur the Fire Giant (final boss)
- [ ] Pre-designed boss floors

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
- [ ] Character info screen with attribute bar graphs
- [ ] Spell selection UI
- [ ] Quick spell bar
- [ ] Context menus (right-click / long-press)
- [ ] Tooltips for items and monsters
- [ ] Death/RIP screen with tombstone
- [ ] Difficulty indicators

### 7.2 Touch Controls
- [ ] Virtual d-pad overlay for movement
- [ ] Tap-to-move with pathfinding
- [ ] Long-press for context actions
- [ ] Touch-friendly button sizes (min 44px)
- [ ] Swipe gestures for directional movement

### 7.3 Game Features
- [ ] Save/load (multiple save slots)
- [ ] Trap detection, triggering, disarming
- [ ] Secret door detection
- [ ] Search action
- [ ] Rest/sleep to recover HP/MP
- [ ] Time system (actions consume in-game time)
- [ ] Scoring / Valhalla's Champions leaderboard
- [ ] Attribute flavor text (replace all TODO placeholders)
- [ ] Item renaming

### 7.4 Mobile & Responsive
- [ ] Responsive layout scaling
- [ ] Portrait and landscape support
- [ ] Touch-optimized inventory management
- [ ] Performance optimization for mobile browsers
