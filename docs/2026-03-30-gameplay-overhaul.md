# Gameplay Overhaul — Spell Scaling, Character Stats, Water Terrain, Shop Scroll

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Five gameplay improvements — INT-based spell scaling with tighter damage ranges, full affix summary in character window, water as terrain obstacle with flying monsters, and scroll position preservation in service screens.

**Architecture:** Each task is independent and touches different files. Spell scaling modifies `casting.ts` damage resolution. Character window adds a new section to `character-info.ts`. Water terrain changes `generator.ts` (placement), `actions.ts` (hero movement), `ai.ts` (monster movement), and `monsters.ts` (flying ability). Scroll fix is purely in `ServiceScreen.ts`.

**Tech Stack:** TypeScript, Vite, DOM rendering, no frameworks.

---

## File Map

| Task | Files | Action |
|------|-------|--------|
| 1. Spell Scaling | `src/systems/spells/casting.ts` | Modify |
| 2. Character Window | `src/ui/character-info.ts` | Modify |
| 3. Water Terrain | `src/systems/dungeon/generator.ts` | Modify |
| 3. Water Movement (Hero) | `src/core/actions.ts` | Modify |
| 3. Water Movement (Monsters) | `src/systems/monsters/ai.ts` | Modify |
| 3. Flying Monsters | `src/data/monsters.ts` | Modify |
| 3. Pathfinding | `src/utils/pathfinding.ts` | Modify |
| 4. Shop Scroll | `src/ui/ServiceScreen.ts` | Modify |

---

### Task 1: INT-Based Spell Scaling + Tighter Damage Ranges

**Files:**
- Modify: `src/systems/spells/casting.ts:131-154` (spell case statements), `:460-508` (applySpellDamageToMonster), `:587-613` (resolveHeal)

**Summary:** Close the min-max gap upward by ~40%, then multiply all spell damage and healing by `(1 + INT/100)` where INT is the hero's effective Intelligence (base + equipment bonuses).

- [ ] **Step 1: Update attack spell base damage ranges**

In `src/systems/spells/casting.ts`, change the hardcoded damage values in the spell resolution switch (around lines 131-144):

```typescript
// Old values → New values (gap closed ~40% upward)
case "magic-arrow":
  return resolveBolt(state, spell, direction, 4, 8, "physical");
case "cold-bolt":
  return resolveBolt(state, spell, direction, 9, 16, "cold");
case "lightning-bolt":
  return resolveBolt(state, spell, direction, 13, 24, "lightning");
case "fire-bolt":
  return resolveBolt(state, spell, direction, 13, 24, "fire");
case "cold-ball":
  return resolveBall(state, spell, direction, target, 18, 32, "cold");
case "ball-lightning":
  return resolveBall(state, spell, direction, target, 22, 40, "lightning");
case "fire-ball":
  return resolveBall(state, spell, direction, target, 27, 48, "fire");
```

- [ ] **Step 2: Add INT scaling to applySpellDamageToMonster**

In `src/systems/spells/casting.ts`, in the `applySpellDamageToMonster` function (around line 468), add INT scaling **before** the existing affix multipliers. Import `getEquipAffixTotal` from Enchantments and `ITEM_BY_ID` from items (already imported). Compute effective INT the same way `recomputeDerivedStats` does:

```typescript
function applySpellDamageToMonster(
  state: GameState,
  floorKey: string,
  monsterIdx: number,
  spell: SpellDef,
  minDmg: number,
  maxDmg: number,
  element: string,
): GameState {
  const floor = state.floors[floorKey];
  if (!floor || monsterIdx >= floor.monsters.length) return state;

  const monster = floor.monsters[monsterIdx];
  let damage = rollRange(minDmg, maxDmg);

  // INT scaling — effective INT includes equipment bonuses
  const eq = state.hero.equipment;
  const soulDrainAll = Math.round(getEquipAffixTotal(eq, 'soul-drain'));
  const bonusInt = Math.round(getEquipAffixTotal(eq, 'brilliance')) + soulDrainAll;
  let uInt = 0;
  for (const slot of Object.values(eq)) {
    if (!slot) continue;
    const tpl = ITEM_BY_ID[slot.templateId];
    if (!tpl?.uniqueAbility) continue;
    if (tpl.uniqueAbility === 'crown-power') uInt += 10;
    else if (tpl.uniqueAbility === 'archmage-power') uInt += 30;
  }
  const effInt = state.hero.attributes.intelligence + bonusInt + uInt;
  damage = Math.round(damage * (1 + effInt / 100));

  // Spell Power affix (scaled) — existing code continues unchanged
  const spellPower = equipAffixTotal(state.hero.equipment, "spell-power");
  // ... rest unchanged
```

Note: `getEquipAffixTotal` is already imported at the top of `casting.ts` from `../../data/Enchantments`. The existing `equipAffixTotal` import from `../../utils/Enchants` is a different function (same logic, different module) — use whichever is already imported. Check the imports at the top of the file and use the available one.

- [ ] **Step 3: Add INT scaling to resolveHeal**

In `src/systems/spells/casting.ts`, in the `resolveHeal` function (around line 587), apply the same INT multiplier to the heal amount:

```typescript
function resolveHeal(
  state: GameState,
  spell: SpellDef,
  pct: number,
  minHeal: number,
): GameState {
  const hero = state.hero;
  const mult = getDifficultyConfig(state.difficulty).healingMult;

  // INT scaling for healing
  const eq = hero.equipment;
  const soulDrainAll = Math.round(getEquipAffixTotal(eq, 'soul-drain'));
  const bonusInt = Math.round(getEquipAffixTotal(eq, 'brilliance')) + soulDrainAll;
  let uInt = 0;
  for (const slot of Object.values(eq)) {
    if (!slot) continue;
    const tpl = ITEM_BY_ID[slot.templateId];
    if (!tpl?.uniqueAbility) continue;
    if (tpl.uniqueAbility === 'crown-power') uInt += 10;
    else if (tpl.uniqueAbility === 'archmage-power') uInt += 30;
  }
  const effInt = hero.attributes.intelligence + bonusInt + uInt;
  const intMult = 1 + effInt / 100;

  const healAmount = Math.max(
    Math.round(minHeal * mult * intMult),
    Math.floor(hero.maxHp * pct * mult * intMult),
  );
  const newHp = Math.min(hero.hp + healAmount, hero.maxHp);
  // ... rest unchanged
```

- [ ] **Step 4: Build and verify no compile errors**

Run: `cd /mnt/c/Users/evilc/OneDrive/Documents/GitHub/The-Runed-Deep && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Manual test**

Run: `npx vite --host` (kill any existing Vite first)
Test: Cast spells at various INT levels. Verify:
- Magic Arrow does 4-8 base (before INT), not 1-8
- Fire Ball does 27-48 base, not 12-48
- At 50 INT, damage should be ~1.5x base
- Heal Minor Wounds heals more with higher INT
- Kill Vite when done

- [ ] **Step 6: Commit**

```bash
git add src/systems/spells/casting.ts
git commit -m "feat: INT-based spell scaling + tighter damage ranges

Spell damage now scales with effective Intelligence (1 + INT/100).
Healing spells also scale with INT.
Closed min-max damage gap ~40% upward for more consistent damage.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Character Window — Equipment Bonuses + Attribute Breakdown

**Files:**
- Modify: `src/ui/character-info.ts:1-280`

**Summary:** Add attribute bonus display ("STR: 45 (+20)"), and a new "Equipment Bonuses" section showing all active affix totals plus computed stats (damage, dodge, MP cost reduction, regen rates, XP/gold bonuses).

- [ ] **Step 1: Add imports**

At the top of `src/ui/character-info.ts`, add imports for affix computation:

```typescript
import { AFFIXES, AFFIX_BY_ID, getAffixValue, getAffixValue2 } from "../data/Enchantments";
import { equipAffixTotal, equipAffixTotal2 } from "../utils/Enchants";
import { ITEM_BY_ID } from "../data/items";
import { getEquipAffixTotal, getEquipAffixTotal2 } from "../data/Enchantments";
```

Note: `equipAffixTotal` (from `../utils/Enchants`) and `getEquipAffixTotal` (from `../data/Enchantments`) do the same thing. Use whichever doesn't cause a naming conflict. Prefer `equipAffixTotal` from `../utils/Enchants` since it's the canonical utility.

- [ ] **Step 2: Update attribute bars to show equipment bonuses**

Replace the attributes section (around lines 169-181) to compute and display bonuses:

```typescript
// ── Attributes ──────────────────────────────────────────
panel.appendChild(sectionHeader("Attributes"));

// Compute equipment bonuses for each attribute
const soulDrainAll = Math.round(equipAffixTotal(h.equipment, 'soul-drain'));
const attrBonuses: Record<string, number> = {
  strength: Math.round(equipAffixTotal(h.equipment, 'might')) + soulDrainAll,
  intelligence: Math.round(equipAffixTotal(h.equipment, 'brilliance')) + soulDrainAll,
  constitution: Math.round(equipAffixTotal(h.equipment, 'fortitude')) + soulDrainAll,
  dexterity: Math.round(equipAffixTotal(h.equipment, 'grace')) + soulDrainAll,
};

// Add unique item bonuses
for (const slot of Object.values(h.equipment)) {
  if (!slot) continue;
  const tpl = ITEM_BY_ID[slot.templateId];
  if (!tpl?.uniqueAbility) continue;
  const ua = tpl.uniqueAbility;
  if (ua === 'crown-power') {
    attrBonuses.strength += 10; attrBonuses.intelligence += 10;
    attrBonuses.constitution += 10; attrBonuses.dexterity += 10;
  } else if (ua === 'titan-power') attrBonuses.constitution += 30;
  else if (ua === 'archmage-power') attrBonuses.intelligence += 30;
  else if (ua === 'forge-power') attrBonuses.strength += 20;
}

const attrEntries: [string, keyof Attributes, string][] = [
  ["STR", "strength", "#e44"],
  ["INT", "intelligence", "#48f"],
  ["CON", "constitution", "#4c4"],
  ["DEX", "dexterity", "#fc4"],
];

for (const [label, key, color] of attrEntries) {
  const base = h.attributes[key];
  const bonus = attrBonuses[key] ?? 0;
  const row = el("div", {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "4px",
  });
  row.appendChild(
    el("span", { width: "50px", fontSize: "12px", color: "#aaa", textAlign: "right" }, label),
  );
  if (bonus > 0) {
    const valSpan = el("span", { width: "60px", fontSize: "13px", textAlign: "center" });
    valSpan.appendChild(el("span", { fontWeight: "bold" }, String(base)));
    valSpan.appendChild(el("span", { color: "#4f4", fontSize: "11px" }, ` +${bonus}`));
    row.appendChild(valSpan);
  } else {
    row.appendChild(
      el("span", { width: "60px", fontSize: "13px", fontWeight: "bold", textAlign: "center" }, String(base)),
    );
  }
  const track = el("div", { flex: "1", height: "10px", background: "#222", border: "1px solid #333" });
  const pct = Math.min(100, Math.round(((base + bonus) / 100) * 100));
  const fill = el("div", { width: `${pct}%`, height: "100%", background: color });
  track.appendChild(fill);
  row.appendChild(track);
  panel.appendChild(row);
}
```

- [ ] **Step 3: Add Equipment Bonuses section after resistances**

After the resistances section (after line 209), add a new section:

```typescript
// ── Equipment Bonuses ────────────────────────────────────
const bonusLines: [string, string, string][] = []; // [label, value, color]

// Collect all active affix totals
for (const affix of AFFIXES) {
  const v = Math.round(equipAffixTotal(h.equipment, affix.id));
  if (v <= 0) continue;
  const v2 = Math.round(equipAffixTotal2(h.equipment, affix.id));

  // Format based on affix description pattern
  let display: string;
  if (affix.base2 !== undefined && v2 > 0) {
    display = affix.description.replace('{v}', `${v}`).replace('{v2}', `${v2}`);
  } else {
    display = affix.description.replace('{v}', `${v}`);
  }
  bonusLines.push([affix.name, display, affix.color]);
}

if (bonusLines.length > 0) {
  panel.appendChild(sectionHeader("Equipment Bonuses"));

  for (const [name, display, color] of bonusLines) {
    const row = el("div", {
      display: "flex",
      gap: "8px",
      fontSize: "12px",
      marginBottom: "2px",
    });
    row.appendChild(el("span", { color, fontWeight: "bold", width: "120px", flexShrink: "0" }, name));
    row.appendChild(el("span", { color: "#ccc" }, display));
    panel.appendChild(row);
  }
}

// ── Computed Stats ─────────────────────────────────────────
panel.appendChild(sectionHeader("Combat Stats"));

// Effective damage range
const weapon = h.equipment.weapon;
if (weapon) {
  const wMin = weapon.properties['damageMin'] ?? 0;
  const wMax = weapon.properties['damageMax'] ?? 0;
  const dmgBonus = h.equipDamageBonus ?? 0;
  panel.appendChild(statLine("Melee Damage", `${wMin + dmgBonus}-${wMax + dmgBonus}`));
}

// Spell damage multiplier
const effInt = h.attributes.intelligence + (attrBonuses.intelligence ?? 0);
const intMult = Math.round((1 + effInt / 100) * 100);
const spellPower = Math.round(equipAffixTotal(h.equipment, 'spell-power'));
const darkPact = Math.round(equipAffixTotal(h.equipment, 'dark-pact'));
let spellMult = intMult;
if (spellPower > 0) spellMult = Math.round(spellMult * (1 + spellPower / 100));
if (darkPact > 0) spellMult = Math.round(spellMult * (1 + darkPact / 100));
panel.appendChild(statLine("Spell Power", `${spellMult}%`, "#48f"));

// Dodge chance
const evasion = Math.round(equipAffixTotal(h.equipment, 'evasion'));
if (evasion > 0) panel.appendChild(statLine("Dodge Chance", `${evasion}%`, "#adf"));

// Swiftness
const swiftness = Math.min(75, Math.round(equipAffixTotal(h.equipment, 'swiftness')));
if (swiftness > 0) panel.appendChild(statLine("Extra Action", `${swiftness}%`, "#fc4"));

// MP cost reduction
const arcaneMastery = Math.round(equipAffixTotal(h.equipment, 'arcane-mastery'));
let mpReduction = arcaneMastery;
for (const slot of Object.values(h.equipment)) {
  if (!slot) continue;
  const tpl = ITEM_BY_ID[slot.templateId];
  if (tpl?.uniqueAbility === 'archmage-power') { mpReduction += 25; break; }
}
const darkPactCost = Math.round(equipAffixTotal2(h.equipment, 'dark-pact'));
if (mpReduction > 0 || darkPactCost > 0) {
  const net = Math.min(75, mpReduction) - darkPactCost;
  const color = net > 0 ? "#a6f" : net < 0 ? "#f44" : "#888";
  panel.appendChild(statLine("MP Cost", `${net > 0 ? '-' : '+'}${Math.abs(net)}%`, color));
}

// Regen rates
const regenHp = Math.round(equipAffixTotal(h.equipment, 'regeneration'));
if (regenHp > 0) panel.appendChild(statLine("HP Regen", `+${regenHp} / 2 turns`, "#4f4"));
const regenMp = Math.round(equipAffixTotal2(h.equipment, 'arcane-mastery'));
if (regenMp > 0) panel.appendChild(statLine("MP Regen", `+${regenMp} / 3 turns`, "#a6f"));

// Gold/XP bonus
const goldBonus = Math.round(equipAffixTotal(h.equipment, 'fortune'));
const xpBonus = Math.round(equipAffixTotal2(h.equipment, 'fortune'));
if (goldBonus > 0) panel.appendChild(statLine("Gold Bonus", `+${goldBonus}%`, "#fd4"));
if (xpBonus > 0) panel.appendChild(statLine("XP Bonus", `+${xpBonus}%`, "#fd4"));

// Vampiric
const vampiric = Math.round(equipAffixTotal(h.equipment, 'vampiric'));
if (vampiric > 0) panel.appendChild(statLine("Life Steal", `${vampiric}%`, "#f44"));

// Thorns
const thorns = Math.round(equipAffixTotal(h.equipment, 'thorns'));
if (thorns > 0) panel.appendChild(statLine("Thorns", `${thorns}% reflected`, "#f84"));
```

- [ ] **Step 4: Build and verify no compile errors**

Run: `cd /mnt/c/Users/evilc/OneDrive/Documents/GitHub/The-Runed-Deep && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Manual test**

Run: `npx vite --host` (kill any existing Vite first)
Test: Open character screen (C key). Verify:
- Attributes show base + bonus in green (e.g., "STR: 25 +20")
- Bar fills to effective total (base + bonus)
- Equipment Bonuses section lists all active affixes with correct totals
- Combat Stats section shows melee damage range, spell power %, dodge, swiftness, MP cost, regen, gold/XP bonus
- With no gear, bonuses section is empty/hidden
- Kill Vite when done

- [ ] **Step 6: Commit**

```bash
git add src/ui/character-info.ts
git commit -m "feat: show equipment affix totals and combat stats in character window

Attributes now show base + equipment bonus (green text).
New Equipment Bonuses section lists all active affix totals.
New Combat Stats section shows melee damage, spell power,
dodge, swiftness, MP cost, regen, gold/XP, life steal, thorns.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Water Terrain Obstacle + Flying Monsters

**Files:**
- Modify: `src/systems/dungeon/generator.ts:752,806-818` (water placement)
- Modify: `src/core/actions.ts:306` (hero walkability check)
- Modify: `src/systems/monsters/ai.ts:53-69` (monster walkability)
- Modify: `src/data/monsters.ts` (add `'flying'` ability to 21 monsters)
- Modify: `src/utils/pathfinding.ts:104` (pathfinding walkability)

**Summary:** Make water tiles non-walkable. Hero can cross water only when levitating (spell or Boots of Levitation). Flying monsters can cross water and avoid traps. Water patches scale larger on deeper floors. Corridors never get water. Connectivity is guaranteed.

- [ ] **Step 1: Change water to non-walkable in generator**

In `src/systems/dungeon/generator.ts`, change the water entry in `DECOR_TYPES` (line 752):

```typescript
{ sprite: 'water', walkable: false, transparent: true, minDepth: 1, weight: 3 },
```

Also update the water spread code (lines 806-818) to use `walkable: false`:

```typescript
if (decor.sprite === 'water') {
  // Water patches scale with depth: 1-3 at shallow, 3-8 at deep
  const baseSpread = 1 + Math.floor(rand() * 3);
  const depthBonus = Math.floor(depth / 10);
  const spread = Math.min(8, baseSpread + depthBonus);
  for (let s = 0; s < spread; s++) {
    const wx = x + Math.floor(rand() * 3) - 1;
    const wy = y + Math.floor(rand() * 3) - 1;
    if (wx > 0 && wx < floor.width - 1 && wy > 0 && wy < floor.height - 1) {
      const wt = floor.tiles[wy][wx];
      if (wt.type === 'floor') {
        floor.tiles[wy][wx] = { type: 'water', sprite: 'water', walkable: false, transparent: true };
      }
    }
  }
  floor.tiles[y][x] = { type: 'water', sprite: 'water', walkable: false, transparent: true };
}
```

Note: The `placeDecor` function's existing constraint (`room.w < 5 || room.h < 5` skip, placement only inside rooms with `room.x + 1` offsets) already ensures water is placed in rooms only, never in corridors. The room interior placement means corridors stay clear.

- [ ] **Step 2: Add connectivity validation after water placement**

After the `placeDecor` call in the generator (find where `placeDecor` is called, likely near the end of the floor generation function), add a flood-fill connectivity check. If water blocks the path between stairs-up and stairs-down, remove water tiles until connected.

Find where `placeDecor` is called and add after it:

```typescript
// Validate floor connectivity after water placement
ensureConnectivity(floor);
```

Add a new function before `placeDecor`:

```typescript
/** Remove water tiles that block the path between stairs */
function ensureConnectivity(floor: Floor): void {
  const stairs: Vector2[] = [];
  for (let y = 0; y < floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      const t = floor.tiles[y][x].type;
      if (t === 'stairs-up' || t === 'stairs-down') stairs.push({ x, y });
    }
  }
  if (stairs.length < 2) return;

  // BFS from first stair — can we reach all other stairs?
  function canReach(): boolean {
    const visited = new Set<string>();
    const queue = [stairs[0]];
    visited.add(`${stairs[0].x},${stairs[0].y}`);
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const nx = cur.x + dx, ny = cur.y + dy;
        if (nx < 0 || nx >= floor.width || ny < 0 || ny >= floor.height) continue;
        const key = `${nx},${ny}`;
        if (visited.has(key)) continue;
        const tile = floor.tiles[ny][nx];
        if (!tile.walkable && tile.type !== 'door-closed' && tile.type !== 'water') continue;
        // For connectivity check: treat walkable + doors as passable (water is NOT passable)
        if (tile.type === 'water') continue;
        if (!tile.walkable && tile.type !== 'door-closed') continue;
        visited.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
    return stairs.every(s => visited.has(`${s.x},${s.y}`));
  }

  // If already connected, done
  if (canReach()) return;

  // Remove water tiles one by one (those adjacent to walkable tiles first) until connected
  const waterTiles: Vector2[] = [];
  for (let y = 0; y < floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      if (floor.tiles[y][x].type === 'water') waterTiles.push({ x, y });
    }
  }

  for (const wt of waterTiles) {
    floor.tiles[wt.y][wt.x] = { type: 'floor', sprite: 'floor', walkable: true, transparent: true };
    if (canReach()) return;
  }
}
```

- [ ] **Step 3: Update hero movement to allow water traversal when levitating**

In `src/core/actions.ts`, replace the walkability check at line 306:

```typescript
// Old:
if (!tile.walkable) return state;

// New:
if (!tile.walkable) {
  // Allow levitating heroes to cross water
  if (tile.type === 'water') {
    const isLevitating = state.hero.activeEffects.some(e => e.id === "levitation")
      || hasUniqueAbility(state.hero.equipment, 'levitation');
    if (!isLevitating) return state;
  } else {
    return state;
  }
}
```

- [ ] **Step 4: Update monster AI walkability to support flying**

In `src/systems/monsters/ai.ts`, update the `canMoveTo` function (lines 59-69):

```typescript
/** Like walkable but handles phasing (through walls) and flying (over water). */
function canMoveTo(
  floor: Floor,
  x: number,
  y: number,
  phasing: boolean,
  flying: boolean = false,
): boolean {
  if (x < 0 || x >= floor.width || y < 0 || y >= floor.height) return false;
  if (phasing) return true;
  const tile = floor.tiles[y][x];
  if (tile.walkable) return true;
  if (flying && tile.type === 'water') return true;
  return false;
}
```

Then update all call sites of `canMoveTo` in the file. In `moveToward` (around line 189):

```typescript
const phasing = monster.abilities.includes("phase-through-walls");
const flying = monster.abilities.includes("flying");
// ...
if (!canMoveTo(floor, nx, ny, phasing, flying)) continue;
```

Do the same for `moveAwayFrom` and any other function that calls `canMoveTo`. Search the file for all `canMoveTo(` calls and add the `flying` parameter.

Also update the `walkable` function for summoning placement — summoned monsters shouldn't appear on water unless the summoner is flying:

```typescript
// In summon placement code, flying monsters can be summoned on water
if (!walkable(floor, nx, ny) && !(floor.tiles[ny]?.[nx]?.type === 'water')) continue;
```

- [ ] **Step 5: Add flying ability to monsters**

In `src/data/monsters.ts`, add `'flying'` to the `abilities` array for these monsters:

| Monster ID | Line | Change |
|-----------|------|--------|
| `giant-bat` | ~109 | `abilities: ['flying']` |
| `shadow` | ~198 | `abilities: ['drain-strength', 'flying']` |
| `dark-wraith` | ~294 | `abilities: ['drain-constitution', 'flying']` |
| `manticore` | ~308 | `abilities: ['tail-spikes', 'flying']` |
| `eerie-ghost` | ~340 | `abilities: ['drain-intelligence', 'phase-through-walls', 'flying']` |
| `spectre` | ~349 | `abilities: ['drain-level', 'flying']` |
| `ice-devil` | ~396 | `abilities: ['cold-touch', 'flying']` |
| `wind-elemental` | ~403 | `abilities: ['cold-touch', 'flying']` |
| `dust-elemental` | ~412 | `abilities: ['blind', 'flying']` |
| `fire-elemental` | ~427 | `abilities: ['fire-touch', 'flying']` |
| `water-elemental` | ~436 | `abilities: ['cold-touch', 'flying']` |
| `ice-elemental` | ~461 | `abilities: ['cold-touch', 'flying']` |
| `spiked-devil` | ~451 | `abilities: ['fire-touch', 'flying']` |
| `horned-devil` | ~495 | `abilities: ['fire-touch', 'flying']` |
| `white-dragon` | ~511 | `abilities: ['breath-cold', 'flying']` |
| `blue-dragon` | ~520 | `abilities: ['breath-lightning', 'flying']` |
| `green-dragon` | ~526 | `abilities: ['breath-acid', 'flying']` |
| `red-dragon` | ~542 | `abilities: ['breath-fire', 'flying']` |
| `abyss-fiend` | ~536 | `abilities: ['summon-devil', 'teleport', 'fire-touch', 'flying']` |

- [ ] **Step 6: Make flying monsters avoid traps**

In `src/systems/monsters/ai.ts`, find where monster trap triggering happens (if monsters trigger traps). Search for `trap` in the monster AI. If monsters don't trigger traps currently, this step is already done. If they do, add a check:

```typescript
if (monster.abilities.includes('flying')) {
  // Flying monsters avoid ground traps
} else {
  // trigger trap as normal
}
```

- [ ] **Step 7: Update pathfinding for hero auto-explore**

In `src/utils/pathfinding.ts`, the walkability check at line 104 needs to consider levitation:

```typescript
// Old:
if (!tile.walkable && tile.type !== "door-closed") continue;

// New:
if (!tile.walkable && tile.type !== "door-closed") {
  if (tile.type === 'water' && heroCanLevitate) continue; // treat water as passable
  else continue;
}
```

The pathfinding function needs to accept a `canLevitate` parameter. Update the function signature and the caller to pass whether the hero is levitating. Check how `findPath` is called (likely from auto-explore in actions.ts) and pass the levitation status.

- [ ] **Step 8: Build and verify**

Run: `cd /mnt/c/Users/evilc/OneDrive/Documents/GitHub/The-Runed-Deep && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 9: Manual test**

Run: `npx vite --host` (kill any existing Vite first)
Test:
- Walk into a room with water — hero should be blocked
- Cast Levitation — hero can now cross water
- Equip Boots of Levitation — hero can cross water permanently
- Water patches should be larger on deeper floors
- Flying monsters (bats, wraiths, dragons) should cross water freely
- Non-flying monsters should path around water
- Stairs should always be reachable (connectivity check)
- Kill Vite when done

- [ ] **Step 10: Commit**

```bash
git add src/systems/dungeon/generator.ts src/core/actions.ts src/systems/monsters/ai.ts src/data/monsters.ts src/utils/pathfinding.ts
git commit -m "feat: water blocks movement, flying monsters traverse freely

Water tiles are now non-walkable obstacles.
Heroes can cross water when levitating (spell or boots).
21 monsters gain flying ability (bats, wraiths, elementals,
dragons, devils, fiends). Flying also bypasses traps.
Water patches scale larger on deeper floors.
Connectivity validation ensures stairs are always reachable.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Service Screen Scroll Preservation

**Files:**
- Modify: `src/ui/ServiceScreen.ts:556-587` (render function)

**Summary:** Save the scroll position of the scrollable list container before `replaceChildren()`, restore it after rebuild. Same pattern as ShopScreen.

- [ ] **Step 1: Add scroll position tracking**

In `src/ui/ServiceScreen.ts`, add a closure variable inside `createServiceScreen` (around line 551, after `let state = initialState;`):

```typescript
let scrollTop = 0;
```

- [ ] **Step 2: Save scroll position before rebuild**

In the `render()` function (line 556), before `screen.replaceChildren()`:

```typescript
function render(): void {
  // Save scroll position of any scrollable list
  const scrollable = screen.querySelector<HTMLElement>('[style*="overflow"]');
  if (scrollable) scrollTop = scrollable.scrollTop;

  screen.replaceChildren();
```

Note: A more robust approach is to query all elements with `overflowY: auto` or `overflowY: scroll`. Since the sage and blacksmith both create a `list` div with `overflowY: 'auto'`, querying for that style match works. Alternatively, add a data attribute `data-service-list` to the list elements in `buildSage` and `buildBlacksmith`:

In `buildSage` (line 96):
```typescript
const list = el('div', { maxHeight: 'clamp(200px, 50vh, 400px)', overflowY: 'auto' });
list.setAttribute('data-service-list', '1');
```

In `buildBlacksmith` (line 200):
```typescript
const list = el('div', { maxHeight: 'clamp(200px, 50vh, 400px)', overflowY: 'auto' });
list.setAttribute('data-service-list', '1');
```

In `buildStash` — add the same to both the stored items list and inventory list if they become scrollable. Currently stash has no explicit scroll container, so this may not be needed.

Then in `render()`:

```typescript
function render(): void {
  // Save scroll position
  const listEl = screen.querySelector<HTMLElement>('[data-service-list]');
  if (listEl) scrollTop = listEl.scrollTop;

  screen.replaceChildren();
  // ... existing build code ...

  // Restore scroll position
  const newListEl = screen.querySelector<HTMLElement>('[data-service-list]');
  if (newListEl) newListEl.scrollTop = scrollTop;
}
```

- [ ] **Step 3: Add scroll restoration at end of render**

At the end of the `render()` function, after `screen.appendChild(content)` and the hint text (line 586):

```typescript
screen.appendChild(content);
screen.appendChild(el('div', { color: '#555', fontSize: '11px', marginTop: '4px' }, 'Press Esc to close'));

// Restore scroll position
const newListEl = screen.querySelector<HTMLElement>('[data-service-list]');
if (newListEl) newListEl.scrollTop = scrollTop;
```

- [ ] **Step 4: Build and verify**

Run: `cd /mnt/c/Users/evilc/OneDrive/Documents/GitHub/The-Runed-Deep && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Manual test**

Run: `npx vite --host` (kill any existing Vite first)
Test:
- Open Sage → scroll down to a lower item → click Enchant +1 → list should stay at same scroll position
- Open Blacksmith → scroll down → Add affix → after returning, scroll should be preserved
- Test Temple (shouldn't need scroll, but verify no regression)
- Test Inn stash (verify no regression)
- Kill Vite when done

- [ ] **Step 6: Commit**

```bash
git add src/ui/ServiceScreen.ts
git commit -m "fix: preserve scroll position in service screens after actions

Sage enchanting and Blacksmith now maintain scroll position
when the UI rebuilds after an action. Uses data-service-list
attribute to track the scrollable container.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Implementation Order

1. **Task 4: Scroll fix** — smallest, pure UX, quick win
2. **Task 2: Character window** — self-contained UI addition
3. **Task 1: Spell scaling** — data + logic change, easy to verify
4. **Task 3: Water + flying** — most complex, touches movement/AI/generation

## Final Steps

After all tasks:

- [ ] Run `npx prettier --write src/` to format everything
- [ ] Run full build: `npx vite build --base=/rd/`
- [ ] Deploy to dev.jdayers.com
- [ ] Final commit with any formatting changes
