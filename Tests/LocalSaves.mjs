import './TypeScriptLoader.mjs';
import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

// The actual splash/save/load modules run with only browser boundaries doubled.
class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.style = {}; this.textContent = ''; this.events = {}; }
  appendChild(child) { this.children.push(child); if (child instanceof Element) child.parent = this; return child; }
  append(...children) { children.forEach(child => this.appendChild(child)); }
  addEventListener(type, handler) { (this.events[type] ??= []).push(handler); }
  async click() { for (const handler of this.events.click ?? []) await handler({ stopPropagation() {} }); }
  querySelector(tag) { return descendants(this).find(e => e.tagName === tag) ?? null; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); }
  get previousElementSibling() { return this.parent?.children[this.parent.children.indexOf(this) - 1] ?? null; }
}
function descendants(element) {
  return element.children.filter(c => c instanceof Element).flatMap(c => [c, ...descendants(c)]);
}
class Storage {
  data = new Map();
  fail = () => false;
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) {
    if (this.fail(key, value)) throw new DOMException('Fixture quota exceeded', 'QuotaExceededError');
    this.data.set(key, String(value));
  }
  removeItem(key) { this.data.delete(key); }
}

globalThis.document = { createElement: tag => new Element(tag) };
globalThis.location = { hostname: 'dev.jdayers.com', reload() {} };
globalThis.localStorage = new Storage();
let requests = [];
let loadedSlot;
globalThis.fetch = async (...args) => {
  requests.push(args);
  return new Response(JSON.stringify(state('Unexpected remote', 500)));
};
const { createInitialGameState } = await import('../src/core/game-state.ts');
const { createSplashScreen } = await import('../src/ui/splash-screen.ts');
const { saveGame, loadGame, getSaveSlots } = await import('../src/core/save-load.ts');
const { generateFloor } = await import('../src/systems/dungeon/generator.ts');

const oldCode = 'FGHJK-' + 'a'.repeat(32);
function state(name = 'Local hero', turn = 50) {
  return { ...createInitialGameState(), hero: { ...createInitialGameState().hero, name }, turn };
}
function putSlot(slot, extra = {}) {
  localStorage.setItem(`rd-save-${slot}`, JSON.stringify({ version: 1, timestamp: 123, state: state(`Existing ${slot}`, slot), ...extra }));
}
function snapshot() { return [...localStorage.data.entries()].sort(); }
async function settle() { for (let i = 0; i < 12; i++) await new Promise(resolve => setImmediate(resolve)); }
function splash() {
  const root = createSplashScreen(new Element('main'), () => {}, slot => { loadedSlot = slot; });
  const nodes = descendants(root);
  return { root, nodes, loads: nodes.filter(e => e.tagName === 'button' && e.textContent === 'Load') };
}

beforeEach(() => {
  globalThis.localStorage = new Storage();
  requests = [];
  loadedSlot = null;
});

test('splash has only local controls and never syncs or rewrites existing slots', async () => {
  putSlot(1, { cloudCode: oldCode }); putSlot(2); putSlot(3);
  localStorage.setItem('rd-cloud-2', oldCode);
  localStorage.setItem('rd-achievements', 'keep');
  const before = snapshot();
  const ui = splash(); await settle();
  assert.deepEqual(ui.nodes.filter(e => e.tagName === 'button').map(e => e.textContent), ['New Game', 'Load', 'X', 'Load', 'X', 'Load', 'X']);
  assert.equal(ui.nodes.some(e => e.tagName === 'input' || /cloud|recovery/i.test(e.textContent)), false);
  assert.deepEqual(snapshot(), before);
  assert.equal(requests.length, 0);
});

test('clicking Load opens its existing local slot without a network request', async () => {
  putSlot(1, { cloudCode: oldCode }); putSlot(2);
  const before = snapshot();
  const ui = splash();
  assert.equal(ui.loads.length, 2);
  await ui.loads[0].click(); await settle();
  assert.equal(loadedSlot, 1);
  assert.equal(loadGame(loadedSlot)?.hero.name, 'Existing 1');
  assert.deepEqual(snapshot(), before);
  assert.equal(requests.length, 0);
});

test('saving a previously linked slot updates local progress without uploading', async () => {
  putSlot(1, { cloudCode: oldCode }); putSlot(2);
  localStorage.setItem('rd-cloud-1', oldCode);
  const second = localStorage.getItem('rd-save-2');
  assert.equal(saveGame(state('Updated hero', 60), 1), true);
  await settle();
  assert.equal(loadGame(1)?.hero.name, 'Updated hero');
  assert.equal(loadGame(1)?.turn, 60);
  assert.equal(localStorage.getItem('rd-save-2'), second);
  assert.equal(localStorage.getItem('rd-cloud-1'), oldCode);
  assert.equal(requests.length, 0);
});

test('quota failure preserves every local slot and unrelated stored value', async t => {
  putSlot(1, { cloudCode: oldCode }); putSlot(2); putSlot(3);
  localStorage.setItem('rd-cloud-2', oldCode);
  localStorage.setItem('rd-achievements', 'keep');
  const before = snapshot();
  localStorage.fail = key => key.startsWith('rd-save-');
  t.mock.method(console, 'error', () => {});
  assert.equal(saveGame(state('Unsaved progress'), 1), false);
  await settle();
  assert.deepEqual(snapshot(), before);
  assert.equal(requests.length, 0);
});

test('a new local save survives reload with its generated dungeon', () => {
  const saved = state('Dungeon hero', 75);
  const { floor, playerStart } = generateFloor('mine', 1, 12345);
  saved.hero.position = playerStart;
  saved.floors = { 'mine-1': floor };
  assert.equal(saveGame(saved, 3), true);
  const loaded = loadGame(3);
  assert.equal(loaded?.hero.name, 'Dungeon hero');
  assert.equal(loaded?.turn, 75);
  assert.deepEqual(loaded?.floors['mine-1'].tiles, floor.tiles);
  assert.equal(getSaveSlots()[2]?.name, 'Dungeon hero');
  assert.equal(requests.length, 0);
});

test('older local formats still migrate on load without changing stored bytes', () => {
  const legacy = state('Legacy local');
  const { floor, playerStart } = generateFloor('mine', 1, 12345);
  legacy.currentFloor = 0;
  legacy.hero.position = playerStart;
  legacy.hero.copper = legacy.hero.gold;
  delete legacy.hero.gold;
  delete legacy.stash;
  delete floor.visible;
  delete floor.decals;
  legacy.floors = { 'mine-0': floor };
  localStorage.setItem('rd-save-1', JSON.stringify({ version: 1, timestamp: 123, state: legacy, cloudCode: oldCode }));
  const before = snapshot();
  const loaded = loadGame(1);
  assert.equal(loaded?.currentFloor, 1);
  assert.equal(loaded?.hero.gold, legacy.hero.copper);
  assert.equal(loaded?.floors['mine-1'].visible.length, floor.height);
  assert.deepEqual(snapshot(), before);
  assert.equal(requests.length, 0);
});

test('deleting a slot requires confirmation and leaves other browser data intact', async () => {
  putSlot(1); putSlot(2);
  localStorage.setItem('rd-cloud-1', 'ABCDE');
  const before = snapshot();
  const ui = splash();
  const remove = ui.nodes.find(e => e.tagName === 'button' && e.textContent === 'X');
  await remove.click();
  assert.deepEqual(snapshot(), before);
  await descendants(ui.root).find(e => e.tagName === 'button' && e.textContent === 'No').click();
  assert.deepEqual(snapshot(), before);
  await remove.click();
  await descendants(ui.root).find(e => e.tagName === 'button' && e.textContent === 'Yes').click();
  assert.equal(localStorage.getItem('rd-save-1'), null);
  assert.equal(localStorage.getItem('rd-save-2'), before.find(([key]) => key === 'rd-save-2')[1]);
  assert.equal(localStorage.getItem('rd-cloud-1'), 'ABCDE');
  assert.equal(requests.length, 0);
});

test('invalid slot numbers do not change local storage', () => {
  putSlot(1);
  const before = snapshot();
  for (const slot of [0, 4]) {
    assert.equal(saveGame(state(), slot), false);
    assert.equal(loadGame(slot), null);
  }
  assert.deepEqual(snapshot(), before);
});
