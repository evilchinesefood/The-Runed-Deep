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
import { computeFov } from './utils/fov';
import type { GameState, Screen } from './core/types';

const root = document.getElementById('game-root')!;
root.style.cssText = 'background:#000;min-height:100vh;';

let mapRenderer: MapRenderer | null = null;
let hudRenderer: HudRenderer | null = null;

const input = new InputManager();

const gameLoop = new GameLoop(createInitialGameState(), render);
input.setHandler(action => gameLoop.handleAction(action));

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

  switch (state.screen) {
    case 'splash':
      input.setEnabled(false);
      createSplashScreen(root, action => gameLoop.handleAction(action));
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
