import { createInitialGameState, createHero } from './core/game-state';
import { GameLoop } from './core/game-loop';
import { InputManager } from './input/input-manager';
import { MapRenderer } from './rendering/map-renderer';
import { HudRenderer } from './rendering/hud-renderer';
import { createSplashScreen } from './ui/splash-screen';
import { createCharacterCreationScreen } from './ui/character-creation';
import { createCharacterInfoScreen } from './ui/character-info';
import { createDeathScreen } from './ui/death-screen';
import { generateFloor } from './systems/dungeon/generator';
import { SPELL_BY_ID } from './data/spells';
import { AnimationRenderer } from './rendering/animations';
import { drainAnimations } from './rendering/animation-queue';
import { computeFov } from './utils/fov';
import { loadGame } from './core/save-load';
import type { GameState, Screen } from './core/types';

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
        const hasLight = state.hero.activeEffects.some(e => e.id === 'light' && e.turnsRemaining > 0);
        computeFov(floor, state.hero.position.x, state.hero.position.y, hasLight);
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

function switchScreen(state: GameState): void {
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
          const hero = createHero(result.name, result.gender, result.attributes, result.startingSpell);

          // Generate the first dungeon floor
          const { floor, playerStart } = generateFloor('mine', 0, Date.now(), false, true);
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
      input.setEnabled(true);
      const infoScreen = createCharacterInfoScreen(gameLoop.getState(), () => {
        gameLoop.handleAction({ type: 'setScreen', screen: 'game' });
      });
      root.appendChild(infoScreen);
      break;
    }

    case 'death': {
      input.setEnabled(false);
      createDeathScreen(root, gameLoop.getState(), action => {
        if (action.type === 'setScreen' && action.screen === 'splash') {
          // Reset to a fresh game state
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
