import { createInitialGameState, createHero } from './core/game-state';
import { GameLoop } from './core/game-loop';
import { InputManager } from './input/input-manager';
import { MapRenderer } from './rendering/map-renderer';
import { HudRenderer } from './rendering/hud-renderer';
import { createSplashScreen } from './ui/splash-screen';
import { createCharacterCreationScreen } from './ui/character-creation';
import { createCharacterInfoScreen } from './ui/character-info';
import { generateFloor } from './systems/dungeon/generator';
import { computeFov } from './utils/fov';
import type { GameState, Screen } from './core/types';

const root = document.getElementById('game-root')!;
root.style.cssText = 'background:#000;min-height:100vh;';

let mapRenderer: MapRenderer | null = null;
let hudRenderer: HudRenderer | null = null;

const input = new InputManager();

const gameLoop = new GameLoop(createInitialGameState(), render);
input.setHandler(action => gameLoop.handleAction(action));

// Initial render
render(gameLoop.getState());

function render(state: GameState): void {
  const currentScreen = root.dataset.screen as Screen | undefined;
  if (currentScreen !== state.screen) {
    switchScreen(state);
  }

  if (state.screen === 'game') {
    // Compute FOV before rendering map
    const floorKey = `${state.currentDungeon}-${state.currentFloor}`;
    const floor = state.floors[floorKey];
    if (floor) {
      computeFov(floor, state.hero.position.x, state.hero.position.y);
    }

    mapRenderer?.render(state);
    hudRenderer?.render(state);
  }
}

function switchScreen(state: GameState): void {
  root.replaceChildren();
  root.dataset.screen = state.screen;
  mapRenderer = null;
  hudRenderer = null;

  switch (state.screen) {
    case 'splash':
      input.setEnabled(false);
      createSplashScreen(root, action => gameLoop.handleAction(action));
      break;

    case 'character-creation':
      input.setEnabled(false);
      createCharacterCreationScreen(root, result => {
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
      });
      break;

    case 'game': {
      input.setEnabled(true);

      const gameContainer = document.createElement('div');
      gameContainer.style.cssText = 'display:flex;flex-direction:column;align-items:center;padding-top:8px;';
      root.appendChild(gameContainer);

      mapRenderer = new MapRenderer(gameContainer);
      hudRenderer = new HudRenderer(gameContainer);
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

    default:
      break;
  }
}
