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
- [x] Save/load via JSON serialization to localStorage (3 slots, auto-save on stairs, F3 manual)

---

## Phase 2: Character & Dungeon — COMPLETE

### 2.1 Character Creation
- [x] Name input
- [x] Gender selection (male/female hero sprite)
- [x] Attribute allocation (STR/INT/CON/DEX, exactly 230 points, min 20 max 72)
- [x] Difficulty selection (Easy, Intermediate, Hard, Impossible)
- [x] Starting spell selection (6 Level 1 spells)
- [x] Stat preview showing derived HP/MP/AC
- [x] Character info screen (C key) with attributes, spells, resistances, difficulty + NG+ display

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
- [x] Room generation (5 shapes: rectangular, cross, diamond, circular, dead-end)
- [x] Corridor generation connecting rooms
- [x] Stairs placement (up/down)
- [x] Door placement (in wall gaps between rooms and corridors)
- [x] Locked and secret doors
- [x] Trap placement (pit, arrow, portal, fire, acid, dart, etc.)
- [x] Item/treasure placement on ground
- [x] Monster spawning per floor depth (61 types, progressive unlock, weighted)
- [x] Floor persistence (generated once per seed, remembered in state)
- [x] Retry/validation system (min 3 rooms, both stairs exist, flood-fill connectivity)

### 2.4 Map & Exploration
- [x] Tile-based map rendering (32x32 CSS sprites, three-layer floor+ground+entity)
- [x] 8-directional movement (keyboard arrows/numpad/WASD)
- [x] Field of view / line of sight (raycasting, radius 4 normal / 10 with Light)
- [x] Fog of war (unexplored = black, explored = dimmed, lit = full brightness)
- [x] Permanent room lighting via Light spell
- [x] Scroll-to-follow camera centered on player
- [x] Stair navigation (> to descend, < to ascend, Enter on stairs)
- [x] Click/tap-to-move with A* pathfinding
- [x] Minimap / full map view (M key)
- [x] Tab auto-explore (walk to nearest unexplored frontier)

---

## Phase 3: Combat & Items — COMPLETE

### 3.1 Combat System
- [x] Melee attack (walk into enemy tile)
- [x] Hit/miss calculation (based on DEX vs monster evasion)
- [x] Damage calculation (STR + weapon damage)
- [x] Armor reduction on monster attacks
- [x] Monster death → XP award
- [x] Player death → RIP screen with tombstone + scoring
- [x] Monster turn AI (move toward player within 20 tiles, attack when adjacent)
- [x] Per-floor difficulty scaling (+8% HP, +5% damage per floor)
- [x] Progressive monster unlock (1-2 new types per floor across 40 floors)
- [x] Boss monsters on specific floors
- [x] Combat hit flash animations (white on monster, red on hero)
- [x] Centralized difficulty config (Easy/Intermediate/Hard/Impossible)
- [x] Loot drops on monster death
- [x] Blood decals on kill

### 3.2 Item System
- [x] Item database: 80+ templates — weapons, armor, shields, helmets, cloaks, boots, rings, amulets, belts, bracers, gauntlets
- [x] Item properties: base stats, weight, bulk, value
- [x] Enchantments (+accuracy, +damage, +AC, resistances, attribute bonuses)
- [x] 13 special enchantments with critical variants for NG+
- [x] Cursed items (negative effects, can't unequip until Remove Curse)
- [x] Unidentified items (display generic name/sprite until identified)
- [x] Material tiers: regular, elven, meteoric steel
- [x] Consumables: potions, scrolls (healing, stat gain, identify, teleport, remove curse)
- [x] Spellbooks (teach spells permanently)
- [x] Wands (charges-based casting)
- [x] Worthless items (Ring of Adornment, Blank Scroll, etc.)
- [x] Containers: packs (weight+bulk limit), purses (money), belts

### 3.3 Inventory & Equipment
- [x] Equipment slots: weapon, shield, helmet, body armor, cloak, bracers, gauntlets, belt, boots, ring x2, amulet, pack, purse
- [x] Equip/unequip with stat recalculation
- [x] Weight and bulk tracking with carry capacity (10kg base + pack bonus)
- [x] Cursed packs reduce carrying capacity
- [x] Item pickup (G key / E key / auto-pickup gold), drop
- [x] Currency: copper pieces (gold)
- [x] Paperdoll inventory screen (I key) with sort modes
- [x] Item use: potions, scrolls, spellbooks
- [x] Identify spell and scroll working
- [x] Remove Curse spell, scroll, and temple service working
- [x] Item tooltips on hover

---

## Phase 4: Magic — COMPLETE

### 4.1 Spell System (30 Spells)

**Attack spells:**
- [x] Magic Arrow (L1, 1 MP) — directional bolt
- [x] Cold Bolt (L2, 2 MP) — directional bolt, cold element
- [x] Lightning Bolt (L3, 3 MP) — directional bolt, lightning element
- [x] Fire Bolt (L3, 3 MP) — directional bolt, fire element
- [x] Cold Ball (L3, 4 MP) — AoE with explosion animation
- [x] Ball Lightning (L4, 4 MP) — AoE, lightning element
- [x] Fire Ball (L4, 5 MP) — AoE, fire element

**Healing spells:**
- [x] Heal Minor/Medium/Major Wounds + full Healing
- [x] Neutralize Poison

**Defense spells:**
- [x] Shield — +4 AC for 30 turns
- [x] Resist Cold/Lightning/Fire — +50% resist for 50 turns

**Control spells:**
- [x] Sleep Monster — directional targeting
- [x] Slow Monster — directional targeting
- [x] Transmogrify Monster — polymorphs to random type

**Movement spells:**
- [x] Phase Door — directional teleport up to 6 tiles
- [x] Levitation — float over traps
- [x] Rune of Return — teleport to town and back
- [x] Teleport — random position on floor

**Divination spells:**
- [x] Detect Objects/Monsters/Traps — reveals positions
- [x] Identify — identifies first unidentified item
- [x] Clairvoyance — reveals 10x10 area

**Misc spells:**
- [x] Light — permanent room illumination, extended FOV
- [x] Remove Curse — removes curse from first cursed equipped item

**Spell mechanics:**
- [x] Mana cost system, bolt/ball targeting, spell bar (keys 1-7)
- [x] Click-to-cast (click spell bar then click map direction)
- [x] Spell hotkey management (Z key)
- [x] Directional sprite rotation on projectiles
- [x] Projectile animations stop at walls
- [x] Active effect duration tracking with expiry + stat reversal
- [x] Elemental resistance calculations

### 4.2 Monster System
- [x] 61 non-boss + 7 boss monsters with full stats
- [x] Progressive unlock (1-2 new types per floor across 40 floors)
- [x] 5 AI types: melee, ranged, caster, thief, summoner
- [x] Special abilities: drain stats, steal money, summon allies, poison, phase-through-walls
- [x] Physical-immune monsters (slimes — must use magic)
- [x] Flee, charge, regenerate behaviors
- [x] Sleeping monster wake-up on damage

---

## Phase 5: Town & Economy — COMPLETE
- [x] Town map with multi-tile building sprites and entrance tiles
- [x] Weapon/Armor/General/Magic shops with buy/sell UI
- [x] Junk store (Olaf's)
- [x] Temple of Odin (heal HP/MP free, cure poison free, remove curse 25g)
- [x] Sage (identify one 8g, identify all 6g/item)
- [x] Bank (deposit/withdraw), Inn (free rest)
- [x] Rune of Return (town ↔ dungeon teleport)
- [x] Shop inventory restocking on town visit

---

## Phase 6: Story & Progression — COMPLETE
- [x] Boss data defined (7 bosses with themed minions and loot)
- [x] Pre-designed boss floor layouts (floors 15, 20, 25, 30, 33, 36, 40)
- [x] Dungeon tilesets: Mine (no tint), Fortress (blue-steel), Castle (warm brown-red)
- [x] getDungeonForFloor: floors 1-13 mine, 14-26 fortress, 27-40 castle
- [x] Dungeon progression integration in gameplay (tilesets auto-applied in generator.ts)
- [x] Story text / opening sequence (3-page IntroScreen.ts after character creation)
- [x] Victory condition (defeat Surtur on floor 40 → victory screen, checked in combat.ts + casting.ts)
- [x] Victory screen with NG+ transition

---

## Phase 7: Polish & Completeness — COMPLETE
- [x] Character info screen with difficulty colors + NG+ display
- [x] Spell animations (projectiles, explosions, pulses, flashes)
- [x] Spell selection UI (Z key, hotkey management)
- [x] Item tooltips on hover
- [x] HUD: HP/MP bars, XP, AC badge, Floor/Turn, status effect badges
- [x] Touch controls (D-pad + action buttons)
- [x] Save/load (3 slots, auto-save on stairs, F3 manual save)
- [x] Scoring / leaderboard
- [x] Achievement system (18 achievements, localStorage persistence)
- [x] Sound effects (Web Audio API, 18 synthesized sounds, F4 toggle)
- [x] New Game Plus with scaling difficulty and critical enchantments
- [x] Auto-explore (Tab key)
- [x] Toast notifications for game events
- [x] Scrollable screens for mobile (character creation, info, inventory, help, spells)
- [x] Help screen with keybinding reference
- [ ] Options menu for sound settings

---

## Remaining Work
- [ ] Options menu for sound/display settings
