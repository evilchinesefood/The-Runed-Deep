import { createInitialGameState, createHero } from './core/game-state';
import { GameLoop } from './core/game-loop';
import { InputManager } from './input/input-manager';
import { MapRenderer } from './rendering/map-renderer';
import { HudRenderer } from './rendering/hud-renderer';
import { createSplashScreen } from './ui/splash-screen';
import { createCharacterCreationScreen } from './ui/character-creation';
import { createCharacterInfoScreen } from './ui/character-info';
import { createInventoryScreen } from './ui/inventory-screen';
import { createDeathScreen } from './ui/death-screen';
import { createHelpScreen } from './ui/help-screen';
import { generateFloor } from './systems/dungeon/generator';
import { SPELL_BY_ID } from './data/spells';
import { AnimationRenderer } from './rendering/animations';
import { drainAnimations } from './rendering/animation-queue';
import { computeFov } from './utils/fov';
import { loadGame } from './core/save-load';
import type { GameState, Screen } from './core/types';
import { generateTestFloor, getAllSpellIds } from './systems/dungeon/TestFloor';
import { createEmptyEquipment, createDefaultResistances } from './core/game-state';

const root = document.getElementById('game-root')!;
root.style.cssText = 'background:#000;min-height:100vh;';

let mapRenderer: MapRenderer | null = null;
let hudRenderer: HudRenderer | null = null;
let animRenderer: AnimationRenderer | null = null;

const input = new InputManager();

const gameLoop = new GameLoop(createInitialGameState(), render);
input.setHandler(action => {
  if (animRenderer?.isPlaying()) return; // ignore input during animations
  gameLoop.handleAction(action);
  // After action, play any queued animations
  playPendingAnimations();
});

// Spell mode indicator
input.setSpellModeCallback((spellId) => {
  const indicator = document.getElementById('spell-mode-indicator');
  if (indicator) {
    if (spellId) {
      const spell = SPELL_BY_ID[spellId];
      indicator.textContent = `Casting: ${spell?.name ?? spellId} — pick a direction (Esc to cancel)`;
      indicator.style.display = 'block';
    } else {
      indicator.style.display = 'none';
    }
  }
});

function playPendingAnimations(): void {
  const groups = drainAnimations();
  if (groups.length === 0 || !animRenderer) return;

  // Set camera for animation positioning
  const state = gameLoop.getState();
  const VIEWPORT_X = 21;
  const VIEWPORT_Y = 15;
  const cameraX = state.hero.position.x - Math.floor(VIEWPORT_X / 2);
  const cameraY = state.hero.position.y - Math.floor(VIEWPORT_Y / 2);
  animRenderer.setCamera(cameraX, cameraY);

  for (const group of groups) {
    animRenderer.enqueue(group);
  }

  input.setEnabled(false);
  animRenderer.play().then(() => {
    input.setEnabled(true);
  });
}

// F9: Launch spell test arena
document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.code === 'F9') {
    e.preventDefault();
    const { floor: testFloor, playerStart } = generateTestFloor();
    const testState: GameState = {
      screen: 'game',
      hero: {
        name: 'Test Hero',
        gender: 'male',
        position: playerStart,
        attributes: { strength: 60, intelligence: 70, constitution: 60, dexterity: 60 },
        hp: 200, maxHp: 200,
        mp: 500, maxMp: 500,
        xp: 0, level: 10,
        equipment: createEmptyEquipment(),
        inventory: [],
        copper: 1000,
        knownSpells: getAllSpellIds(),
        activeEffects: [],
        resistances: createDefaultResistances(),
        armorValue: 6,
        equipDamageBonus: 0,
        equipAccuracyBonus: 0,
      },
      currentFloor: 0,
      currentDungeon: 'mine',
      floors: { 'mine-0': testFloor },
      town: { id: 'hamlet', shopInventories: {}, bankBalance: 0 },
      messages: [
        { text: '=== SPELL TEST ARENA ===', severity: 'important', turn: 0 },
        { text: 'All 30 spells available. 500 MP. Monsters placed for testing.', severity: 'system', turn: 0 },
        { text: 'Bolt targets: E line at y=15. AoE group: x=10-11, y=20-21.', severity: 'system', turn: 0 },
        { text: 'Items on ground near start. Cursed armor + unidentified ring for ID/curse testing.', severity: 'system', turn: 0 },
        { text: 'Enclosed room at top-right for Light spell testing.', severity: 'system', turn: 0 },
      ],
      turn: 0,
      gameTime: 0,
      difficulty: 'easy',
      rngSeed: Date.now(),
    };
    gameLoop.setState(testState);
  }
});

// Initial render
render(gameLoop.getState());

function render(state: GameState): void {
  try {
    const currentScreen = root.dataset.screen as Screen | undefined;
    if (currentScreen !== state.screen) {
      switchScreen(state);
    }

    if (state.screen === 'game') {
      // Sync known spells to input manager for number-key casting
      input.setKnownSpells(state.hero.knownSpells);

      // Compute FOV before rendering map
      const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
      const floor = state.floors[floorKey];
      if (floor) {
        computeFov(floor, state.hero.position.x, state.hero.position.y);
      }

      mapRenderer?.render(state);
      hudRenderer?.render(state);
    }
  } catch (err) {
    console.error('Render error:', err);
    const errDiv = document.createElement('div');
    errDiv.style.cssText = 'color:red;padding:20px;font-family:monospace;white-space:pre-wrap;';
    errDiv.textContent = `Render error:\n${err instanceof Error ? err.stack ?? err.message : String(err)}`;
    root.replaceChildren(errDiv);
  }
}

// Screen cleanup registry — called on every screen switch
const screenCleanups: (() => void)[] = [];
function addScreenCleanup(fn: () => void): void { screenCleanups.push(fn); }

function switchScreen(state: GameState): void {
  // Run all cleanup functions from previous screen
  while (screenCleanups.length > 0) screenCleanups.pop()!();

  root.replaceChildren();
  root.dataset.screen = state.screen;
  mapRenderer = null;
  hudRenderer = null;
  animRenderer = null;

  switch (state.screen) {
    case 'splash':
      input.setEnabled(false);
      createSplashScreen(
        root,
        action => gameLoop.handleAction(action),
        (slot) => {
          const loaded = loadGame(slot);
          if (loaded) {
            gameLoop.setState(loaded);
          }
        },
      );
      break;

    case 'character-creation':
      input.setEnabled(false);
      createCharacterCreationScreen(root, result => {
        try {
          const hero = createHero(result.name, result.gender, result.attributes, result.startingSpell, result.difficulty);

          // Generate the first dungeon floor
          const { floor, playerStart } = generateFloor('mine', 0, Date.now(), false, true, result.difficulty);
          hero.position = playerStart;

          const newState: GameState = {
            ...gameLoop.getState(),
            screen: 'game',
            hero,
            difficulty: result.difficulty,
            currentDungeon: 'mine',
            currentFloor: 0,
            floors: { 'mine-0': floor },
            messages: [
              { text: `${result.name} enters the Abandoned Mine...`, severity: 'important', turn: 0 },
              { text: 'Use arrow keys or numpad to move. Press ? for help.', severity: 'system', turn: 0 },
            ],
          };

          gameLoop.setState(newState);
        } catch (err) {
          console.error('Failed to start game:', err);
          const errDiv = document.createElement('div');
          errDiv.style.cssText = 'color:red;padding:20px;font-family:monospace;white-space:pre-wrap;';
          errDiv.textContent = `Error starting game:\n${err instanceof Error ? err.stack ?? err.message : String(err)}`;
          root.replaceChildren(errDiv);
        }
      });
      break;

    case 'game': {
      input.setEnabled(true);

      const gameContainer = document.createElement('div');
      gameContainer.style.cssText = 'display:flex;flex-direction:column;align-items:center;padding-top:8px;';
      root.appendChild(gameContainer);

      // Spell targeting mode indicator
      const spellIndicator = document.createElement('div');
      spellIndicator.id = 'spell-mode-indicator';
      spellIndicator.style.cssText = 'display:none;color:#ff0;background:#220;padding:4px 12px;font-size:13px;font-family:sans-serif;border:1px solid #550;margin-bottom:4px;width:672px;text-align:center;box-sizing:border-box;';
      gameContainer.appendChild(spellIndicator);

      mapRenderer = new MapRenderer(gameContainer);
      animRenderer = new AnimationRenderer(mapRenderer.getMapContainer());
      hudRenderer = new HudRenderer(gameContainer);

      // Spell bar click → enter spell casting mode
      hudRenderer.setSpellClickHandler((spellId) => {
        input.startSpellCast(spellId);
      });

      // Map click → direction for spell targeting or click-to-move
      mapRenderer.getMapContainer().addEventListener('click', (e: MouseEvent) => {
        const state = gameLoop.getState();
        const worldPos = mapRenderer!.screenToWorld(e.clientX, e.clientY, state.hero.position);
        if (worldPos) {
          input.handleMapClick(state.hero.position.x, state.hero.position.y, worldPos.x, worldPos.y);
          playPendingAnimations();
        }
      });

      break;
    }

    case 'character-info': {
      input.setEnabled(false);
      const infoScreen = createCharacterInfoScreen(gameLoop.getState(), () => {
        gameLoop.handleAction({ type: 'setScreen', screen: 'game' });
      });
      addScreenCleanup(infoScreen.cleanup);
      root.appendChild(infoScreen);
      break;
    }

    case 'inventory': {
      input.setEnabled(false);
      let invCleanup: (() => void) | null = null;
      const renderInventory = () => {
        if (invCleanup) invCleanup();
        const invScreen = createInventoryScreen(
          gameLoop.getState(),
          action => {
            gameLoop.handleAction(action);
            root.replaceChildren();
            renderInventory();
          },
          () => gameLoop.handleAction({ type: 'setScreen', screen: 'game' }),
        );
        invCleanup = invScreen.cleanup;
        addScreenCleanup(() => { if (invCleanup) invCleanup(); });
        root.replaceChildren(invScreen);
      };
      renderInventory();
      break;
    }

    case 'help': {
      input.setEnabled(false);
      const helpScreen = createHelpScreen(() => {
        gameLoop.handleAction({ type: 'setScreen', screen: 'game' });
      });
      addScreenCleanup(helpScreen.cleanup);
      root.appendChild(helpScreen);
      break;
    }

    case 'death': {
      input.setEnabled(false);
      createDeathScreen(root, gameLoop.getState(), action => {
        if (action.type === 'setScreen' && action.screen === 'splash') {
          const freshState = createInitialGameState();
          gameLoop.setState(freshState);
        }
      });
      break;
    }

    default:
      break;
  }
}
