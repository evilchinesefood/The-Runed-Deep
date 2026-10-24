import './TypeScriptLoader.mjs';
import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

// Only browser boundaries are doubled: DOM, quota-controlled storage, and HTTP.
// Save parsing, splash click handlers, sync, and local saves are production code.
class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.style = {}; this.textContent = ''; this.events = {}; }
  appendChild(child) { this.children.push(child); return child; }
  append(...children) { this.children.push(...children); }
  addEventListener(type, handler) { (this.events[type] ??= []).push(handler); }
  async click() { for (const handler of this.events.click ?? []) await handler({ stopPropagation() {} }); }
  querySelector(tag) { return descendants(this).find(e => e.tagName === tag) ?? null; }
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
let remote;
let loadedSlot;
globalThis.fetch = async () => new Response(remote ?? '', { status: remote === null ? 404 : 200 });
const { createInitialGameState } = await import('../src/core/game-state.ts');
const { createSplashScreen } = await import('../src/ui/splash-screen.ts');
const { saveGame, loadGame } = await import('../src/core/save-load.ts');
const { generateFloor } = await import('../src/systems/dungeon/generator.ts');
const { getCloudCode, setCloudCode, clearCloudCode, pushSave } = await import('../src/core/CloudSave.ts');

const code = 'FGHJK-' + 'a'.repeat(32);
function state(name = 'Remote', turn = 50) {
  return { ...createInitialGameState(), hero: { ...createInitialGameState().hero, name }, turn };
}
function putSlot(slot, name = `Existing ${slot}`, turn = 1) {
  localStorage.setItem(`rd-save-${slot}`, JSON.stringify({ version: 1, timestamp: 123, state: state(name, turn) }));
}
function snapshot() { return [...localStorage.data.entries()].sort(); }
async function settle() { for (let i = 0; i < 12; i++) await new Promise(resolve => setImmediate(resolve)); }
function splash() {
  const root = createSplashScreen(new Element('main'), () => {}, slot => { loadedSlot = slot; });
  const nodes = descendants(root);
  return { root, input: nodes.find(e => e.tagName === 'input'), loads: nodes.filter(e => e.tagName === 'button' && e.textContent === 'Load') };
}
async function importSave() {
  const ui = splash();
  ui.input.value = code;
  await ui.loads[0].click();
  return ui;
}

beforeEach(() => {
  globalThis.localStorage = new Storage();
  remote = JSON.stringify(state());
  loadedSlot = null;
});

test('cloud import quota failure preserves every existing save and recovery code', async () => {
  putSlot(1); putSlot(2);
  localStorage.setItem('rd-cloud-1', 'OLDCD-' + 'b'.repeat(32));
  const before = snapshot();
  localStorage.fail = key => key.startsWith('rd-save-');
  await importSave();
  await settle();
  assert.deepEqual(snapshot(), before);
});

test('malformed imported state cannot replace a valid save or consume an empty slot', async () => {
  putSlot(1); putSlot(2);
  const before = snapshot();
  remote = JSON.stringify({ hero: { name: 'Not a game' }, currentFloor: 1 });
  await importSave();
  assert.deepEqual(snapshot(), before);
});

test('oversized imported state is rejected before replacing any slot', async () => {
  putSlot(1);
  const before = snapshot();
  remote = JSON.stringify({ ...state(), padding: 'x'.repeat(5_000_001) });
  await importSave();
  assert.deepEqual(snapshot(), before);
});

test('full local save slots are preserved when importing a different cloud save', async () => {
  putSlot(1); putSlot(2); putSlot(3);
  const before = snapshot();
  await importSave();
  assert.deepEqual(snapshot(), before);
});

test('valid import fills an empty slot and retains its recovery code', async () => {
  putSlot(1);
  const first = localStorage.getItem('rd-save-1');
  await importSave();
  assert.equal(localStorage.getItem('rd-save-1'), first);
  assert.equal(JSON.parse(localStorage.getItem('rd-save-2')).state.hero.name, 'Remote');
  assert.equal(getCloudCode(2).toLowerCase(), code.toLowerCase());
});

test('import stores the recovery code with its save even if separate code storage is full', async () => {
  putSlot(1);
  localStorage.fail = key => key.startsWith('rd-cloud-');
  await importSave();
  assert.equal(JSON.parse(localStorage.getItem('rd-save-2')).state.hero.name, 'Remote');
  assert.equal(getCloudCode(2)?.toLowerCase(), code.toLowerCase());
});

test('inline recovery codes can be relinked and disabled without reviving a stale legacy key', () => {
  putSlot(1);
  const record = JSON.parse(localStorage.getItem('rd-save-1'));
  localStorage.setItem('rd-save-1', JSON.stringify({ ...record, cloudCode: code }));
  localStorage.setItem('rd-cloud-1', 'ABCDE');
  assert.equal(getCloudCode(1), code);
  const replacement = 'KLMNP-' + 'c'.repeat(32);
  setCloudCode(1, replacement);
  assert.equal(getCloudCode(1), replacement);
  clearCloudCode(1);
  assert.equal(getCloudCode(1), null);
  assert.deepEqual(JSON.parse(localStorage.getItem('rd-save-1')).state, record.state);
  setCloudCode(1, code);
  assert.equal(getCloudCode(1), code);
});

test('representative legacy state remains importable without newer optional fields', async () => {
  const legacy = state('Legacy');
  for (const key of ['returnFloor', 'ngPlusCount', 'stash', 'activeRift', 'activeCrucible', 'statueUpgrades', 'itemsSacrificed', 'pendingPackSwap']) delete legacy[key];
  legacy.hero.copper = legacy.hero.gold;
  delete legacy.hero.gold;
  delete legacy.hero.spellHotkeys;
  remote = JSON.stringify(legacy);
  await importSave();
  assert.equal(JSON.parse(localStorage.getItem('rd-save-1')).state.hero.name, 'Legacy');
});

test('a generated dungeon and legacy zero-indexed floor remain loadable after import', async () => {
  const legacy = state('Legacy floor');
  const { floor, playerStart } = generateFloor('mine', 1, 12345);
  legacy.currentFloor = 0;
  legacy.hero.position = playerStart;
  delete floor.visible;
  delete floor.decals;
  legacy.floors = { 'mine-0': floor };
  remote = JSON.stringify(legacy);
  await importSave();
  const loaded = loadGame(1);
  assert.equal(loaded?.currentFloor, 1);
  assert.equal(loaded?.floors['mine-1'].tiles.length, floor.height);
  assert.equal(loaded?.floors['mine-1'].visible.length, floor.height);
});

test('names accepted by character creation are not arbitrarily truncated or rejected', async () => {
  const name = 'Long hero name '.repeat(20);
  remote = JSON.stringify(state(name));
  await importSave();
  assert.equal(JSON.parse(localStorage.getItem('rd-save-1')).state.hero.name, name);
});

test('invalid core coordinates or tile cells cannot replace any local save', async () => {
  putSlot(1);
  const before = snapshot();
  const malformed = state();
  malformed.hero.position = {};
  remote = JSON.stringify(malformed);
  await importSave();
  assert.deepEqual(snapshot(), before);
  const invalidFloor = state();
  invalidFloor.floors = { 'mine-1': { width: 1, height: 1, tiles: [[null]], explored: [[false]], lit: [[false]], monsters: [], items: [] } };
  remote = JSON.stringify(invalidFloor);
  await importSave();
  assert.deepEqual(snapshot(), before);
});

const itemLocations = {
  inventory: (save, item) => { save.hero.inventory = [item]; },
  equipment: (save, item) => { save.hero.equipment.weapon = item; },
  stash: (save, item) => { save.stash = [item]; },
  shop: (save, item) => { save.town.shopInventories = { weapons: [item] }; },
  floor: (save, item) => {
    const { floor } = generateFloor('mine', 1, 12345);
    floor.items = [{ item, position: { x: 1, y: 1 } }];
    save.floors = { 'mine-1': floor };
  },
};
const invalidLoadCases = Object.entries(itemLocations).flatMap(([name, place]) => [
  [`${name} enchantments`, save => place(save, { id: 'item-1', specialEnchantments: [null] })],
  [`${name} item id`, save => place(save, { id: 123, specialEnchantments: [] })],
]);
invalidLoadCases.push(
  ['non-array enchantments', save => { save.hero.inventory = [{ id: 'item-1', specialEnchantments: {} }]; }],
  ['non-array stash', save => { save.stash = {}; }],
  ['monster id', save => {
    const { floor } = generateFloor('mine', 1, 12345);
    floor.monsters = [{}];
    save.floors = { 'mine-1': floor };
  }],
);
for (const [name, invalidate] of invalidLoadCases) {
  test(`malformed ${name} leaves a linked save intact during background and clicked sync`, async () => {
    putSlot(1); putSlot(2);
    setCloudCode(1, code);
    const before = snapshot();
    const invalid = state();
    invalidate(invalid);
    remote = JSON.stringify(invalid);
    const ui = splash(); await settle();
    assert.deepEqual(snapshot(), before);
    await ui.loads[1].click();
    assert.equal(loadedSlot, 1);
    assert.deepEqual(snapshot(), before);
    assert.equal(loadGame(1)?.hero.name, 'Existing 1');
  });
}

test('legacy migration reports failed code persistence without rejecting or changing local saves', async t => {
  t.mock.method(console, 'warn', () => {});
  putSlot(1);
  setCloudCode(1, 'ABCDE');
  const before = snapshot();
  localStorage.fail = key => key.startsWith('rd-save-');
  assert.equal(await pushSave('ABCDE', JSON.stringify(state())), false);
  assert.deepEqual(snapshot(), before);
});

test('cloud push failure logs do not disclose the private recovery token', async t => {
  putSlot(1);
  setCloudCode(1, code);
  remote = null;
  const warnings = [];
  t.mock.method(console, 'warn', (...args) => warnings.push(args.join(' ')));
  assert.equal(saveGame(state(), 1), true);
  await settle();
  assert.equal(warnings.join('\n').includes(code.split('-')[1]), false);
});

test('background cloud sync quota failure preserves the active and other slots', async () => {
  putSlot(1); putSlot(2); putSlot(3);
  localStorage.setItem('rd-cloud-1', code);
  const before = snapshot();
  localStorage.fail = key => key.startsWith('rd-save-');
  splash(); await settle();
  assert.deepEqual(snapshot(), before);
});

test('clicked cloud sync quota failure loads the unchanged local slot', async () => {
  putSlot(1); putSlot(2); putSlot(3);
  localStorage.setItem('rd-cloud-1', code);
  remote = null;
  const ui = splash(); await settle();
  const before = snapshot();
  remote = JSON.stringify(state());
  localStorage.fail = key => key.startsWith('rd-save-');
  await ui.loads[1].click();
  assert.equal(loadedSlot, 1);
  assert.deepEqual(snapshot(), before);
});

test('valid newer sync updates only its own slot and older cloud state does not replace it', async () => {
  putSlot(1); putSlot(2);
  const second = localStorage.getItem('rd-save-2');
  localStorage.setItem('rd-cloud-1', code);
  splash(); await settle();
  assert.equal(JSON.parse(localStorage.getItem('rd-save-1')).state.turn, 50);
  assert.equal(localStorage.getItem('rd-save-2'), second);
  const newer = localStorage.getItem('rd-save-1');
  remote = JSON.stringify(state('Stale', 2));
  splash(); await settle();
  assert.equal(localStorage.getItem('rd-save-1'), newer);
});

test('regular local save failure preserves the previous slot and reports failure', t => {
  t.mock.method(console, 'error', () => {});
  putSlot(1); putSlot(2);
  const before = snapshot();
  localStorage.fail = key => key.startsWith('rd-save-');
  assert.equal(saveGame(state(), 1), false);
  assert.deepEqual(snapshot(), before);
});

test('an unrelated cloud-enabled slot does not make a failed local save successful', t => {
  t.mock.method(console, 'error', () => {});
  putSlot(1); putSlot(2);
  localStorage.setItem('rd-cloud-2', code);
  const before = snapshot();
  localStorage.fail = key => key.startsWith('rd-save-');
  assert.equal(saveGame(state(), 1), false);
  assert.deepEqual(snapshot(), before);
});
