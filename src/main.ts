import { createInitialGameState, createHero } from "./core/game-state";
import { GameLoop } from "./core/game-loop";
import { InputManager } from "./input/input-manager";
import { MapRenderer } from "./rendering/map-renderer";
import { HudRenderer } from "./rendering/hud-renderer";
import { createSplashScreen } from "./ui/splash-screen";
import { createCharacterCreationScreen } from "./ui/character-creation";
import { createCharacterInfoScreen } from "./ui/character-info";
import { createInventoryScreen } from "./ui/inventory-screen";
import { createDeathScreen } from "./ui/death-screen";
import { createHelpScreen } from "./ui/help-screen";
import { createMapScreen } from "./ui/MapScreen";
import { createSpellScreen } from "./ui/SpellScreen";
import { createShopScreen } from "./ui/ShopScreen";
import { createServiceScreen } from "./ui/ServiceScreen";
import { createIntroScreen } from "./ui/IntroScreen";
import { createVictoryScreen } from "./ui/VictoryScreen";
import { generateTownMap, TOWN_START_INITIAL, TOWN_START_RETURN } from "./systems/town/TownMap";
import { initShopInventory } from "./systems/town/Shops";
import { findPath } from "./utils/Pathfinding";
import { generateFloor, getDungeonForFloor } from "./systems/dungeon/generator";
import { SPELL_BY_ID } from "./data/spells";
import { AnimationRenderer } from "./rendering/animations";
import { drainAnimations } from "./rendering/animation-queue";
import { computeFov } from "./utils/fov";
import { loadGame, saveGame } from "./core/save-load";
import type { GameState, Screen } from "./core/types";
import { generateTestFloor, getAllSpellIds } from "./systems/dungeon/TestFloor";
import {
  createEmptyEquipment,
  createDefaultResistances,
} from "./core/game-state";
import { TouchControls } from "./ui/TouchControls";
import { teleportToTown } from "./core/actions";
import { injectTheme } from "./ui/Theme";
import { Sound } from "./systems/Sound";
import {
  setOnUnlockCallback,
  trackNewGamePlus,
  trackFloorExplored,
} from "./systems/Achievements";
import { showAchievementToast } from "./ui/AchievementToast";
import { createAchievementsScreen } from "./ui/AchievementsScreen";

injectTheme();
setOnUnlockCallback(showAchievementToast);

// Prevent iOS Safari rubber-band bounce and double-tap zoom
document.addEventListener('touchmove', (e) => {
  if (!(e.target as HTMLElement)?.closest?.('.screen-scrollable, .panel, [data-shop-list]')) {
    e.preventDefault();
  }
}, { passive: false });

const root = document.getElementById("game-root")!;

let mapRenderer: MapRenderer | null = null;
let hudRenderer: HudRenderer | null = null;
let animRenderer: AnimationRenderer | null = null;

const input = new InputManager();

const gameLoop = new GameLoop(createInitialGameState(), render);

// Spell mode indicator + touch targeting mode
input.setSpellModeCallback((spellId) => {
  const indicator = document.getElementById("spell-mode-indicator");
  if (indicator) {
    if (spellId) {
      const spell = SPELL_BY_ID[spellId];
      indicator.textContent = `Casting: ${spell?.name ?? spellId} — pick a direction`;
      indicator.style.display = "block";
    } else {
      indicator.style.display = "none";
    }
  }
  // Sync touch controls targeting mode
  if (spellId) {
    touchControls.enterSpellTargetMode(spellId);
  } else {
    touchControls.cancelSpellTarget();
  }
});

// Auto-target: if exactly one visible monster, return direction to it
input.setAutoTargetCallback(() => {
  const state = gameLoop.getState();
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return null;
  const hero = state.hero.position;
  const visible = floor.monsters.filter(m => {
    if (m.hp <= 0) return false;
    const { x, y } = m.position;
    return y >= 0 && y < floor.height && x >= 0 && x < floor.width && floor.visible[y][x];
  });
  if (visible.length !== 1) return null;
  const m = visible[0];
  const dx = m.position.x - hero.x;
  const dy = m.position.y - hero.y;
  if (dx === 0 && dy === 0) return null;
  const a = ((Math.atan2(dy, dx) * 180 / Math.PI) % 360 + 360) % 360;
  if (a >= 337.5 || a < 22.5) return 'E' as const;
  if (a < 67.5) return 'SE' as const;
  if (a < 112.5) return 'S' as const;
  if (a < 157.5) return 'SW' as const;
  if (a < 202.5) return 'W' as const;
  if (a < 247.5) return 'NW' as const;
  if (a < 292.5) return 'N' as const;
  return 'NE' as const;
});

// Click-to-move: pathfind and auto-walk
let autoPath: { x: number; y: number }[] = [];
let autoWalkTimer: number | null = null;

input.setPathClickCallback((target) => {
  const state = gameLoop.getState();
  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) return;

  const path = findPath(floor, state.hero.position, target);
  if (path.length === 0) return;

  autoPath = path;
  stepAutoPath();
});

// Auto-explore: find nearest unexplored tile and walk toward it
let autoExploring = false;

/** Items worth stopping auto-explore for (ignore junk/broken/blank with value <= 5) */
function isWorthStoppingFor(item: import("./core/types").Item): boolean {
  return item.value > 5;
}

function aeMsg(text: string): void {
  const state = gameLoop.getState();
  gameLoop.setState({
    ...state,
    messages: [...state.messages, { text, severity: 'system' as const, turn: state.turn }],
  });
}

input.setAutoExploreCallback(() => {
  if (autoExploring) {
    autoExploring = false;
    autoPath = [];
    return;
  }
  autoExploring = true;
  exploreNext();
});

function exploreNext(): void {
  if (!autoExploring) return;
  const state = gameLoop.getState();
  if (state.screen !== "game" || state.hero.hp <= 0) {
    autoExploring = false;
    return;
  }
  if (state.currentDungeon === "town") {
    aeMsg("Auto-explore is not available in town.");
    autoExploring = false;
    return;
  }

  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) {
    autoExploring = false;
    return;
  }

  // Stop if any monster is visible
  const hasVisibleMonster = floor.monsters.some(
    (m) =>
      floor.visible[m.position.y]?.[m.position.x] ||
      floor.lit[m.position.y]?.[m.position.x],
  );
  if (hasVisibleMonster) {
    aeMsg("Auto-explore stopped — monster spotted!");
    autoExploring = false;
    return;
  }

  // Stop if HP below 50%
  if (state.hero.hp < state.hero.maxHp * 0.5) {
    aeMsg(`Auto-explore stopped — HP too low (${state.hero.hp}/${state.hero.maxHp}).`);
    autoExploring = false;
    return;
  }

  // Find nearest EXPLORED walkable tile that has an unexplored walkable neighbor
  const hero = state.hero.position;
  let bestTarget: { x: number; y: number } | null = null;
  let bestDist = Infinity;

  for (let y = 0; y < floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      if (!floor.explored[y][x]) continue;
      const t = floor.tiles[y][x];
      if (!t.walkable && t.type !== "door-closed") continue;
      if (x === hero.x && y === hero.y) continue;
      let hasFrontier = false;
      for (let dy = -1; dy <= 1 && !hasFrontier; dy++) {
        for (let dx = -1; dx <= 1 && !hasFrontier; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx,
            ny = y + dy;
          if (nx >= 0 && nx < floor.width && ny >= 0 && ny < floor.height) {
            const nt = floor.tiles[ny][nx];
            if (!floor.explored[ny][nx] && (nt.walkable || nt.type === "door-closed")) {
              hasFrontier = true;
            }
          }
        }
      }
      if (!hasFrontier) continue;
      const dist = Math.abs(x - hero.x) + Math.abs(y - hero.y);
      if (dist < bestDist) {
        bestDist = dist;
        bestTarget = { x, y };
      }
    }
  }

  if (!bestTarget) {
    // Floor fully explored — navigate to stairs down
    for (let y = 0; y < floor.height && !bestTarget; y++) {
      for (let x = 0; x < floor.width && !bestTarget; x++) {
        if (floor.tiles[y][x].type === 'stairs-down') {
          if (x === hero.x && y === hero.y) {
            aeMsg("Auto-explore stopped — standing on stairs.");
            autoExploring = false;
            return;
          }
          bestTarget = { x, y };
        }
      }
    }
    if (bestTarget) {
      aeMsg("Floor explored — heading to stairs.");
    } else {
      // No stairs-down on the map at all — emergency spawn at hero's feet
      const tile = floor.tiles[hero.y][hero.x];
      if (tile.walkable) {
        floor.tiles[hero.y][hero.x] = { ...tile, type: 'stairs-down', sprite: 'stairs-down' };
        aeMsg("The ground crumbles, revealing a stairway down!");
        autoExploring = false;
        return;
      }
      aeMsg("Auto-explore stopped — floor fully explored.");
      autoExploring = false;
      return;
    }
  }

  const path = findPath(floor, hero, bestTarget);
  if (path.length === 0) {
    aeMsg("Auto-explore stopped — can't find a path.");
    autoExploring = false;
    return;
  }

  autoPath = path;
  stepAutoPathExplore();
}

function stepAutoPathExplore(): void {
  if (!autoExploring || autoPath.length === 0) {
    autoExploring = false;
    return;
  }
  if (animRenderer?.isPlaying()) {
    autoWalkTimer = window.setTimeout(stepAutoPathExplore, 100);
    return;
  }

  const state = gameLoop.getState();
  if (state.screen !== "game" || state.hero.hp <= 0) {
    autoExploring = false;
    autoPath = [];
    return;
  }

  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (!floor) {
    autoExploring = false;
    return;
  }

  // Stop conditions
  const hasVisibleMonster = floor.monsters.some(
    (m) =>
      floor.visible[m.position.y]?.[m.position.x] ||
      floor.lit[m.position.y]?.[m.position.x],
  );
  if (hasVisibleMonster) {
    aeMsg("Auto-explore stopped — monster spotted!");
    autoExploring = false;
    autoPath = [];
    return;
  }
  if (state.hero.hp < state.hero.maxHp * 0.5) {
    aeMsg(`Auto-explore stopped — HP too low (${state.hero.hp}/${state.hero.maxHp}).`);
    autoExploring = false;
    autoPath = [];
    return;
  }

  // Check for valuable items at current position (ignore junk)
  const valuableHere = floor.items.some(
    (i) =>
      i.position.x === state.hero.position.x &&
      i.position.y === state.hero.position.y &&
      isWorthStoppingFor(i.item),
  );
  if (valuableHere) {
    aeMsg("Auto-explore stopped — item found on the ground.");
    autoExploring = false;
    autoPath = [];
    return;
  }

  const next = autoPath[0];
  const dx = next.x - state.hero.position.x;
  const dy = next.y - state.hero.position.y;

  // Stop at traps (doors are opened automatically by the move action)
  const nextTile = floor.tiles[next.y]?.[next.x];
  if (nextTile?.type === "door-locked") {
    // Only stop at locked doors — closed doors open automatically
    aeMsg("Auto-explore stopped — locked door ahead.");
    autoExploring = false;
    autoPath = [];
    return;
  }
  if (nextTile?.type === "trap" && !nextTile.trapRevealed) {
    aeMsg("Auto-explore stopped — trap detected!");
    autoExploring = false;
    autoPath = [];
    return;
  }

  // Stop if next tile has valuable items on the ground (ignore junk)
  const nextHasValuable = floor.items.some(
    (i) => i.position.x === next.x && i.position.y === next.y && isWorthStoppingFor(i.item),
  );
  if (nextHasValuable) {
    autoExploring = false;
    autoPath = [];
    return;
  }

  const direction = dxdyToDirection(dx, dy);
  if (direction) {
    autoPath.shift();
    gameLoop.handleAction({ type: "move", direction });
    playPendingAnimations();

    // Stop if hero stepped on a trap
    const postState = gameLoop.getState();
    const postFloorKey = `${postState.currentDungeon}-${postState.currentFloor}`;
    const postFloor = postState.floors[postFloorKey];
    if (postFloor) {
      const heroTile = postFloor.tiles[postState.hero.position.y]?.[postState.hero.position.x];
      if (heroTile?.type === 'trap' && heroTile.trapRevealed) {
        aeMsg("Auto-explore stopped — trap triggered!");
        autoExploring = false;
        autoPath = [];
        return;
      }
    }

    if (autoPath.length > 0) {
      autoWalkTimer = window.setTimeout(stepAutoPathExplore, 80);
    } else {
      // Stop at stairs-down
      const postState2 = gameLoop.getState();
      const pk2 = `${postState2.currentDungeon}-${postState2.currentFloor}`;
      const pf2 = postState2.floors[pk2];
      const heroTile2 = pf2?.tiles[postState2.hero.position.y]?.[postState2.hero.position.x];
      if (heroTile2?.type === 'stairs-down') {
        aeMsg("Auto-explore stopped — stairs found.");
        autoExploring = false;
        autoPath = [];
        return;
      }
      // Find next unexplored target
      setTimeout(exploreNext, 100);
    }
  } else {
    autoExploring = false;
    autoPath = [];
  }
}

function stepAutoPath(): void {
  if (autoPath.length === 0) return;
  if (animRenderer?.isPlaying()) {
    autoWalkTimer = window.setTimeout(stepAutoPath, 100);
    return;
  }

  const state = gameLoop.getState();
  if (state.screen !== "game" || state.hero.hp <= 0) {
    autoPath = [];
    return;
  }

  const next = autoPath[0];
  const dx = next.x - state.hero.position.x;
  const dy = next.y - state.hero.position.y;

  const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
  const floor = state.floors[floorKey];
  if (floor) {
    // Stop auto-walk if a monster is adjacent
    const hasAdjacentMonster = floor.monsters.some((m) => {
      const mx = Math.abs(m.position.x - state.hero.position.x);
      const my = Math.abs(m.position.y - state.hero.position.y);
      return mx <= 1 && my <= 1;
    });
    if (hasAdjacentMonster) {
      autoPath = [];
      return;
    }

    // Stop at locked doors only — closed doors open automatically on move
    const nextTile = floor.tiles[next.y]?.[next.x];
    if (nextTile?.type === "door-locked") {
      autoPath = [];
      return;
    }

    // Stop at valuable items on the ground (ignore junk)
    const nextHasValuable = floor.items.some(
      (i) => i.position.x === next.x && i.position.y === next.y && isWorthStoppingFor(i.item),
    );
    if (nextHasValuable) {
      autoPath = [];
      return;
    }
  }

  const direction = dxdyToDirection(dx, dy);
  if (direction) {
    autoPath.shift();
    gameLoop.handleAction({ type: "move", direction });
    playPendingAnimations();
    if (autoPath.length > 0) {
      autoWalkTimer = window.setTimeout(stepAutoPath, 120);
    }
  } else {
    autoPath = [];
  }
}

function getNextDifficulty(current: string): import("./core/types").Difficulty {
  const order: import("./core/types").Difficulty[] = [
    "easy",
    "intermediate",
    "hard",
    "impossible",
  ];
  const idx = order.indexOf(current as import("./core/types").Difficulty);
  return order[Math.min(order.length - 1, idx + 1)];
}

function dxdyToDirection(
  dx: number,
  dy: number,
): import("./core/types").Direction | null {
  const map: Record<string, import("./core/types").Direction> = {
    "0,-1": "N",
    "1,-1": "NE",
    "1,0": "E",
    "1,1": "SE",
    "0,1": "S",
    "-1,1": "SW",
    "-1,0": "W",
    "-1,-1": "NW",
  };
  return map[`${dx},${dy}`] ?? null;
}

// Cancel auto-move helper — called on any player input
function cancelAutoMove(): void {
  if (autoPath.length > 0 || autoExploring) {
    autoPath = [];
    autoExploring = false;
    if (autoWalkTimer) { clearTimeout(autoWalkTimer); autoWalkTimer = null; }
  }
}

// Input handler — cancels auto-walk on ANY action
input.setHandler((action) => {
  cancelAutoMove();
  if (animRenderer?.isPlaying()) return;
  gameLoop.handleAction(action);
  playPendingAnimations();
});

// Touch controls
const touchControls = new TouchControls();
touchControls.setHandler((action) => {
  cancelAutoMove();
  if (animRenderer?.isPlaying()) return;
  gameLoop.handleAction(action);
  playPendingAnimations();
});
touchControls.setAutoExploreHandler(() => {
  if (autoExploring) {
    autoExploring = false;
    autoPath = [];
    return;
  }
  autoExploring = true;
  exploreNext();
});
// Spell picker → start casting via InputManager (handles self-cast vs targeting)
touchControls.setSpellCastHandler((spellId) => {
  cancelAutoMove();
  if (animRenderer?.isPlaying()) return;
  input.startSpellCast(spellId);
  playPendingAnimations();
});

touchControls.setMenuHandler((action) => {
  if (action === 'toggle-sound') Sound.toggle();
  if (action === 'debug') {
    const input = prompt("Floor (1-40, 0=town):");
    if (!input) return;
    const num = parseInt(input);
    if (isNaN(num) || num < 0 || num > 40) return;
    const state = gameLoop.getState();
    if (num === 0) {
      gameLoop.setState(teleportToTown(state));
    } else {
      const targetFloor = num - 1;
      const targetDungeon = getDungeonForFloor(targetFloor);
      const floorKey = `${targetDungeon}-${targetFloor}`;
      let floors = { ...state.floors };
      if (!floors[floorKey]) {
        const { floor: newFloor } = generateFloor(targetDungeon, targetFloor, state.rngSeed, true, true, state.difficulty);
        floors = { ...floors, [floorKey]: newFloor };
      }
      const fl = floors[floorKey];
      let pos = { x: 1, y: 1 };
      for (let y = 0; y < fl.height; y++) {
        for (let x = 0; x < fl.width; x++) {
          if (fl.tiles[y][x].type === "stairs-up") { pos = { x, y }; break; }
        }
        if (pos.x !== 1 || pos.y !== 1) break;
      }
      gameLoop.setState({ ...state, currentFloor: targetFloor, currentDungeon: targetDungeon, floors, hero: { ...state.hero, position: pos }, messages: [...state.messages, { text: `Jumped to floor ${num}.`, severity: "system" as const, turn: state.turn }] });
    }
  }
});

function playPendingAnimations(): void {
  const groups = drainAnimations();
  if (groups.length === 0 || !animRenderer) return;

  // Set camera for animation positioning — use actual viewport size (varies by device)
  const state = gameLoop.getState();
  const vp = mapRenderer!.getViewportTiles();
  const cameraX = state.hero.position.x - Math.floor(vp.x / 2);
  const cameraY = state.hero.position.y - Math.floor(vp.y / 2);
  animRenderer.setCamera(cameraX, cameraY);

  for (const group of groups) {
    animRenderer.enqueue(group);
  }

  input.setEnabled(false);
  animRenderer.play().then(() => {
    input.setEnabled(true);
  });
}

// F4: Toggle sound / F9: spell test arena / F10: boss test / F11: town teleport
document.addEventListener("keydown", (e: KeyboardEvent) => {
  if (e.code === "F4") {
    e.preventDefault();
    Sound.toggle();
    return;
  }

  if (e.code === "F9") {
    e.preventDefault();
    const { floor: testFloor, playerStart } = generateTestFloor();
    const testState: GameState = {
      screen: "game",
      hero: {
        name: "Test Hero",
        gender: "male",
        position: playerStart,
        attributes: {
          strength: 60,
          intelligence: 70,
          constitution: 60,
          dexterity: 60,
        },
        hp: 200,
        maxHp: 200,
        mp: 500,
        maxMp: 500,
        xp: 0,
        level: 10,
        equipment: createEmptyEquipment(),
        inventory: [],
        copper: 1000,
        knownSpells: getAllSpellIds(),
        spellHotkeys: getAllSpellIds().slice(0, 5),
        activeEffects: [],
        resistances: createDefaultResistances(),
        armorValue: 6,
        equipDamageBonus: 0,
        equipAccuracyBonus: 0,
      },
      currentFloor: 0,
      currentDungeon: "mine",
      floors: { "mine-0": testFloor },
      town: {
        id: "hamlet",
        shopInventories: {},
        bankBalance: 0,
        deepestFloor: 10,
      },
      messages: [
        { text: "=== SPELL TEST ARENA ===", severity: "important", turn: 0 },
        {
          text: "All 30 spells available. 500 MP. Monsters placed for testing.",
          severity: "system",
          turn: 0,
        },
        {
          text: "Bolt targets: E line at y=15. AoE group: x=10-11, y=20-21.",
          severity: "system",
          turn: 0,
        },
        {
          text: "Items on ground near start. Cursed armor + unidentified ring for ID/curse testing.",
          severity: "system",
          turn: 0,
        },
        {
          text: "Enclosed room at top-right for Light spell testing.",
          severity: "system",
          turn: 0,
        },
      ],
      turn: 0,
      gameTime: 0,
      difficulty: "easy",
      rngSeed: Date.now(),
      returnFloor: 0,
      activeBuildingId: "",
      ngPlusCount: 0,
    };
    gameLoop.setState(testState);
  }

  // F10: Jump to any floor (or town) — keeps current hero as-is
  if (e.code === "F10") {
    e.preventDefault();
    const input = prompt("Enter floor number (1-40), or 0 for town:");
    if (!input) return;
    const num = parseInt(input);
    if (isNaN(num) || num < 0 || num > 40) return;

    const state = gameLoop.getState();
    if (state.screen !== "game") return;

    if (num === 0) {
      // Jump to town
      gameLoop.setState(teleportToTown(state));
      return;
    }

    const targetFloor = num - 1; // 0-indexed
    const targetDungeon = getDungeonForFloor(targetFloor);
    const floorKey = `${targetDungeon}-${targetFloor}`;
    let floors = { ...state.floors };

    // Generate the floor if it doesn't exist
    if (!floors[floorKey]) {
      const { floor: newFloor } = generateFloor(
        targetDungeon,
        targetFloor,
        state.rngSeed,
        true,
        true,
        state.difficulty,
      );
      floors = { ...floors, [floorKey]: newFloor };
    }

    // Find stairs-up as arrival position
    const fl = floors[floorKey];
    let pos = { x: 1, y: 1 };
    for (let y = 0; y < fl.height; y++) {
      for (let x = 0; x < fl.width; x++) {
        if (fl.tiles[y][x].type === "stairs-up") {
          pos = { x, y };
          break;
        }
      }
      if (pos.x !== 1 || pos.y !== 1) break;
    }

    gameLoop.setState({
      ...state,
      currentFloor: targetFloor,
      currentDungeon: targetDungeon,
      floors,
      hero: { ...state.hero, position: pos },
      messages: [
        ...state.messages,
        {
          text: `Jumped to floor ${num}.`,
          severity: "system" as const,
          turn: state.turn,
        },
      ],
    });
  }

  // F11: Teleport to town
  if (e.code === "F11") {
    e.preventDefault();
    const state = gameLoop.getState();
    gameLoop.setState(teleportToTown(state));
  }
});

// Screen cleanup — called on every screen switch
const screenCleanups: (() => void)[] = [];
function addScreenCleanup(fn: () => void): void {
  screenCleanups.push(fn);
}

// Initial render
render(gameLoop.getState());

// Re-render on orientation/resize change (debounced)
let resizeTimer: number | null = null;
let lastW = window.innerWidth;
let lastH = window.innerHeight;
window.addEventListener("resize", () => {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    const w = window.innerWidth, h = window.innerHeight;
    if (w === lastW && h === lastH) return;
    lastW = w; lastH = h;
    // Force full screen rebuild
    const state = gameLoop.getState();
    root.dataset.screen = "";
    touchControls.hide();
    render(state);
  }, 300);
});

function render(state: GameState): void {
  try {
    const currentScreen = root.dataset.screen as Screen | undefined;
    if (currentScreen !== state.screen) {
      switchScreen(state);
    }

    if (state.screen === "game") {
      // Sync known spells to input manager for number-key casting
      input.setKnownSpells(state.hero.knownSpells);
      input.setSpellHotkeys(state.hero.spellHotkeys);
      touchControls.setSpellState(state.hero.knownSpells, state.hero.mp);

      // Compute FOV before rendering map
      const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
      const floor = state.floors[floorKey];
      if (floor) {
        if (state.currentDungeon !== "town") {
          const isBlinded = state.hero.activeEffects.some(
            (e) => e.id === "blinded",
          );
          const fovRadius = isBlinded ? 1 : 4;
          computeFov(
            floor,
            state.hero.position.x,
            state.hero.position.y,
            fovRadius,
          );
          trackFloorExplored(
            floor.explored,
            floor.width,
            floor.height,
            floor.tiles,
          );
        } else {
          for (let y = 0; y < floor.height; y++)
            for (let x = 0; x < floor.width; x++) floor.visible[y][x] = true;
        }
      }

      mapRenderer?.render(state);
      hudRenderer?.render(state);
    }
  } catch (err) {
    console.error("Render error:", err);
    const errDiv = document.createElement("div");
    errDiv.style.cssText =
      "color:red;padding:20px;font-family:monospace;white-space:pre-wrap;";
    errDiv.textContent = `Render error:\n${err instanceof Error ? (err.stack ?? err.message) : String(err)}`;
    root.replaceChildren(errDiv);
  }
}

function switchScreen(state: GameState): void {
  // Run all cleanup functions from previous screen
  while (screenCleanups.length > 0) screenCleanups.pop()!();

  // Hide touch controls by default; shown only on game screen
  touchControls.hide();

  root.replaceChildren();
  root.dataset.screen = state.screen;
  hudRenderer?.cleanup();
  mapRenderer = null;
  hudRenderer = null;
  animRenderer = null;

  switch (state.screen) {
    case "splash":
      input.setEnabled(false);
      createSplashScreen(
        root,
        (action) => gameLoop.handleAction(action),
        (slot) => {
          const loaded = loadGame(slot);
          if (loaded) {
            gameLoop.setState(loaded);
          }
        },
      );
      break;

    case "intro":
      input.setEnabled(false);
      root.appendChild(
        createIntroScreen(() => {
          gameLoop.handleAction({ type: "setScreen", screen: "game" });
        }),
      );
      break;

    case "character-creation":
      input.setEnabled(false);
      createCharacterCreationScreen(root, (result) => {
        try {
          const hero = createHero(
            result.name,
            result.gender,
            result.attributes,
            result.startingSpell,
            result.difficulty,
          );

          // Generate first dungeon floor (for when player enters the mine)
          const { floor: dungeonFloor } = generateFloor(
            "mine",
            0,
            Date.now(),
            true,
            true,
            result.difficulty,
          );

          // Generate town and start player near temple
          const { floor: townFloor } = generateTownMap();
          hero.position = { ...TOWN_START_INITIAL };

          // Initialize shop inventories
          const shopIds = [
            "weapon-shop",
            "armor-shop",
            "general-store",
            "magic-shop",
            "junk-store",
          ];
          const shopInventories: Record<string, import("./core/types").Item[]> =
            {};
          for (const sid of shopIds)
            shopInventories[sid] = initShopInventory(sid, 1);

          const newState: GameState = {
            ...gameLoop.getState(),
            screen: "intro",
            hero,
            difficulty: result.difficulty,
            currentDungeon: "town",
            currentFloor: 0,
            floors: { "mine-0": dungeonFloor, "town-0": townFloor },
            town: {
              id: "hamlet",
              shopInventories,
              bankBalance: 0,
              deepestFloor: 1,
            },
            messages: [
              {
                text: `Welcome to Bjarnarhaven, ${result.name}.`,
                severity: "important",
                turn: 0,
              },
              {
                text: "Explore the town. When ready, enter the mine to the north.",
                severity: "system",
                turn: 0,
              },
              {
                text: "Press F1 for help with controls.",
                severity: "system",
                turn: 0,
              },
            ],
          };

          gameLoop.setState(newState);
        } catch (err) {
          console.error("Failed to start game:", err);
          const errDiv = document.createElement("div");
          errDiv.style.cssText =
            "color:red;padding:20px;font-family:monospace;white-space:pre-wrap;";
          errDiv.textContent = `Error starting game:\n${err instanceof Error ? (err.stack ?? err.message) : String(err)}`;
          root.replaceChildren(errDiv);
        }
      });
      break;

    case "game": {
      input.setEnabled(true);
      touchControls.show();

      const gameContainer = document.createElement("div");
      gameContainer.className = "game-layout";
      root.appendChild(gameContainer);

      // Spell targeting mode indicator
      const spellIndicator = document.createElement("div");
      spellIndicator.id = "spell-mode-indicator";
      spellIndicator.style.cssText =
        "display:none;color:#ff0;background:#220;padding:4px 12px;font-size:13px;border:1px solid #550;margin-bottom:4px;width:100%;max-width:var(--game-width);text-align:center;";
      gameContainer.appendChild(spellIndicator);

      mapRenderer = new MapRenderer(gameContainer);
      animRenderer = new AnimationRenderer(mapRenderer.getAnimContainer());
      hudRenderer = new HudRenderer(gameContainer);

      // Spell bar click → enter spell casting mode
      hudRenderer.setSpellClickHandler((spellId) => {
        input.startSpellCast(spellId);
      });

      // Map click/tap → direction for spell targeting or click-to-move
      const mapEl = mapRenderer.getMapContainer();
      const handleMapTap = (x: number, y: number) => {
        const state = gameLoop.getState();
        const worldPos = mapRenderer!.screenToWorld(x, y, state.hero.position);
        if (worldPos) {
          input.handleMapClick(
            state.hero.position.x,
            state.hero.position.y,
            worldPos.x,
            worldPos.y,
          );
          playPendingAnimations();
        }
      };
      // Touch: use touchend for faster response with correct coordinates
      let mapTouchHandled = false;
      mapEl.addEventListener("touchend", (e: TouchEvent) => {
        if (e.changedTouches.length === 0) return;
        const t = e.changedTouches[0];
        mapTouchHandled = true;
        handleMapTap(t.clientX, t.clientY);
      }, { passive: true });
      // Mouse: fallback click for desktop
      mapEl.addEventListener("click", (e: MouseEvent) => {
        if (mapTouchHandled) { mapTouchHandled = false; return; } // skip if touch handled
        handleMapTap(e.clientX, e.clientY);
      });

      break;
    }

    case "character-info": {
      input.setEnabled(false);
      const infoScreen = createCharacterInfoScreen(gameLoop.getState(), () => {
        gameLoop.handleAction({ type: "setScreen", screen: "game" });
      });
      addScreenCleanup(infoScreen.cleanup);
      root.appendChild(infoScreen);
      break;
    }

    case "inventory": {
      input.setEnabled(false);
      let invCleanup: (() => void) | null = null;
      let invSelectedIdx = 0;
      let invScrollTop = 0;
      let invDrawerItemId: string | undefined;
      let currentInvScreen: ReturnType<typeof createInventoryScreen> | null = null;

      const saveInvPosition = () => {
        if (currentInvScreen) {
          invSelectedIdx = currentInvScreen.getSelectedIdx();
          invScrollTop = currentInvScreen.getScrollTop();
        }
      };

      const renderInventory = () => {
        if (invCleanup) invCleanup();
        const reopenId = invDrawerItemId;
        const invScreen = createInventoryScreen(
          gameLoop.getState(),
          (action) => {
            saveInvPosition();
            // Track which item the action is on so we can re-open its drawer
            const actionId = (action as any).itemId;
            gameLoop.handleAction(action);
            if (gameLoop.getState().screen !== "inventory") return;
            // If item still exists in inventory, keep drawer open for it
            invDrawerItemId = actionId && gameLoop.getState().hero.inventory.some(i => i.id === actionId) ? actionId : undefined;
            root.replaceChildren();
            renderInventory();
          },
          () => gameLoop.handleAction({ type: "setScreen", screen: "game" }),
          invSelectedIdx,
          reopenId,
        );
        currentInvScreen = invScreen;
        invCleanup = invScreen.cleanup;
        addScreenCleanup(() => {
          if (invCleanup) invCleanup();
        });
        root.replaceChildren(invScreen);
        requestAnimationFrame(() => {
          const panel = invScreen.querySelector('[data-inv-panel]') as HTMLElement;
          if (panel && invScrollTop > 0) panel.scrollTop = invScrollTop;
        });
      };
      renderInventory();
      break;
    }

    case "spells": {
      input.setEnabled(false);
      const spellScreen = createSpellScreen(
        gameLoop.getState(),
        (spellId) => {
          gameLoop.handleAction({ type: "setScreen", screen: "game" });
          setTimeout(() => input.startSpellCast(spellId), 50);
        },
        () => gameLoop.handleAction({ type: "setScreen", screen: "game" }),
        (hotkeys) => {
          const s = gameLoop.getState();
          gameLoop.setState({
            ...s,
            hero: { ...s.hero, spellHotkeys: hotkeys },
          });
        },
        () => {
          gameLoop.handleAction({ type: "setScreen", screen: "game" });
          setTimeout(() => touchControls.openSpellPicker(), 50);
        },
      );
      addScreenCleanup(spellScreen.cleanup);
      root.appendChild(spellScreen);
      break;
    }

    case "map": {
      input.setEnabled(false);
      const mapScreen = createMapScreen(gameLoop.getState(), () =>
        gameLoop.handleAction({ type: "setScreen", screen: "game" }),
      );
      addScreenCleanup(mapScreen.cleanup);
      root.appendChild(mapScreen);
      break;
    }

    case "help": {
      input.setEnabled(false);
      const helpScreen = createHelpScreen(() => {
        gameLoop.handleAction({ type: "setScreen", screen: "game" });
      });
      addScreenCleanup(helpScreen.cleanup);
      root.appendChild(helpScreen);
      break;
    }

    case "shop": {
      input.setEnabled(false);
      const shopId = gameLoop.getState().activeBuildingId;
      const shopScreen = createShopScreen(
        state,
        shopId,
        (newState) => {
          gameLoop.setState(newState);
          // Shop's internal render() handles the visual update + scroll restore
        },
        () => gameLoop.handleAction({ type: "setScreen", screen: "game" }),
      );
      addScreenCleanup(shopScreen.cleanup);
      root.replaceChildren(shopScreen);
      break;
    }

    case "service": {
      input.setEnabled(false);
      const buildingId = gameLoop.getState().activeBuildingId;
      const svcScreen = createServiceScreen(
        state,
        buildingId,
        (newState) => {
          gameLoop.setState(newState);
        },
        () => gameLoop.handleAction({ type: "setScreen", screen: "game" }),
      );
      addScreenCleanup(svcScreen.cleanup);
      root.replaceChildren(svcScreen);
      break;
    }

    case "victory": {
      input.setEnabled(false);
      touchControls.hide();
      const victoryScreen = createVictoryScreen(
        gameLoop.getState(),
        () => {
          trackNewGamePlus();
          const s = gameLoop.getState();
          const nextDifficulty = getNextDifficulty(s.difficulty);
          const ngCount = s.ngPlusCount + 1;

          const { floor: townFloor } = generateTownMap();
          const { floor: dungeonFloor } = generateFloor(
            "mine",
            0,
            Date.now(),
            true,
            true,
            nextDifficulty,
          );

          const ngState: GameState = {
            ...s,
            screen: "game",
            currentDungeon: "town",
            currentFloor: 0,
            floors: { "mine-0": dungeonFloor, "town-0": townFloor },
            difficulty: nextDifficulty,
            ngPlusCount: ngCount,
            returnFloor: 0,
            messages: [
              {
                text: `=== NEW GAME PLUS ${ngCount} ===`,
                severity: "important",
                turn: s.turn,
              },
              {
                text: `Difficulty increased to ${nextDifficulty}. Loot quality improved.`,
                severity: "system",
                turn: s.turn,
              },
              {
                text: "The dungeon has been reborn. Surtur stirs once more...",
                severity: "important",
                turn: s.turn,
              },
            ],
            town: { ...s.town, shopInventories: {}, deepestFloor: 1 },
          };
          ngState.hero.position = { x: 12, y: 17 };
          gameLoop.setState(ngState);
        },
        () => {
          const freshState = createInitialGameState();
          gameLoop.setState(freshState);
        },
      );
      root.appendChild(victoryScreen);
      break;
    }

    case "death": {
      input.setEnabled(false);
      touchControls.hide();
      createDeathScreen(root, gameLoop.getState(), () => {
        // Respawn in town — keep hero, regenerate death floor, refresh shops
        const s = gameLoop.getState();
        const deathFloor = s.currentFloor;
        const deathDungeon = s.currentDungeon;
        const deathKey = `${deathDungeon}-${deathFloor}`;

        // Regenerate town + death floor
        const { floor: townFloor } = generateTownMap();
        const { floor: newDungeonFloor } = generateFloor(
          deathDungeon, deathFloor, Date.now(), true, true, s.difficulty,
        );
        const floors = { ...s.floors, 'town-0': townFloor, [deathKey]: newDungeonFloor };

        // Refresh shop inventories
        const deepest = Math.max(s.town.deepestFloor, deathFloor + 1);
        const shopInventories: Record<string, any> = {};
        for (const sid of ['weapon-shop', 'armor-shop', 'general-store', 'magic-shop', 'junk-store']) {
          shopInventories[sid] = initShopInventory(sid, deepest);
        }

        const respawned: GameState = {
          ...s,
          screen: 'game',
          currentDungeon: 'town',
          currentFloor: 0,
          returnFloor: deathFloor,
          floors,
          hero: {
            ...s.hero,
            hp: s.hero.maxHp,
            mp: s.hero.maxMp,
            position: { ...TOWN_START_RETURN },
            activeEffects: [],
          },
          town: { ...s.town, shopInventories, deepestFloor: deepest },
          messages: [
            {
              text: `${s.hero.name} awakens in town, battered but alive.`,
              severity: 'important' as const,
              turn: s.turn,
            },
            {
              text: 'The dungeon floor has shifted. You must try again.',
              severity: 'system' as const,
              turn: s.turn,
            },
          ],
        };
        gameLoop.setState(respawned);
        saveGame(respawned, 1);
      });
      break;
    }

    case "achievements": {
      input.setEnabled(false);
      const achScreen = createAchievementsScreen(() => {
        gameLoop.handleAction({ type: "setScreen", screen: "game" });
      });
      addScreenCleanup(achScreen.cleanup);
      root.appendChild(achScreen);
      break;
    }

    default:
      break;
  }
}
