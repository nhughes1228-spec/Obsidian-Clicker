import assert from "node:assert/strict";
import test from "node:test";

import { GENERATORS, SAVE_KEY, SAVE_VERSION, UPGRADES } from "../src/content.js";
import {
  createFreshState,
  createRiftState,
  deriveModifiers,
  getAffordableGeneratorAmount,
  getAvailableEchoes,
  getClickPower,
  getGeneratorBatchCost,
  getOfflineProgress,
  getPassiveRate,
  isUpgradeUnlocked,
  sanitizeState,
} from "../src/economy.js";
import { exportSave, importSave, loadSavedState, saveState } from "../src/persistence.js";

function memoryStorage(entries = {}) {
  const values = new Map(Object.entries(entries));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test("fresh state starts with the full current content catalog", () => {
  const state = createFreshState();
  assert.equal(GENERATORS.length, 16);
  assert.equal(UPGRADES.length, 174);
  assert.equal(Object.keys(state.generatorCounts).length, GENERATORS.length);
  assert.equal(getClickPower(state), 1);
  assert.equal(getPassiveRate(state), 0);
});

test("generator batch prices and max purchases share one calculation", () => {
  const state = createFreshState();
  const generator = GENERATORS[0];
  const tenCost = getGeneratorBatchCost(state, generator, 10);
  state.shards = tenCost;

  assert.equal(getAffordableGeneratorAmount(state, generator), 10);
  assert.equal(getGeneratorBatchCost(state, generator, 1), generator.baseCost);
});

test("upgrade effects are derived from purchased ids", () => {
  const state = createFreshState();
  const clickUpgrade = UPGRADES.find((upgrade) => upgrade.effect.type === "clickMultiplier");
  const globalUpgrade = UPGRADES.find((upgrade) => upgrade.effect.type === "globalMultiplier");
  state.purchasedUpgrades = [clickUpgrade.id, globalUpgrade.id];

  const modifiers = deriveModifiers(state);
  assert.equal(modifiers.clickMultiplier, clickUpgrade.effect.value);
  assert.equal(modifiers.globalMultiplier, globalUpgrade.effect.value);
  assert.equal(getClickPower(state, modifiers), clickUpgrade.effect.value * globalUpgrade.effect.value);
});

test("upgrade prerequisites use current lifetime and ownership", () => {
  const state = createFreshState();
  const clickUpgrade = UPGRADES.find((upgrade) => upgrade.id === "sharperSigil");
  const generatorUpgrade = UPGRADES.find((upgrade) => upgrade.id === "whisperer-5");
  assert.equal(isUpgradeUnlocked(state, clickUpgrade), false);
  assert.equal(isUpgradeUnlocked(state, generatorUpgrade), false);

  state.lifetimeShards = 50;
  state.generatorCounts.whisperer = 5;
  assert.equal(isUpgradeUnlocked(state, clickUpgrade), true);
  assert.equal(isUpgradeUnlocked(state, generatorUpgrade), true);
});

test("offline gains cap at 12 hours and a 24-hour simulation remains finite", () => {
  const state = createFreshState();
  state.generatorCounts.whisperer = 10;
  state.generatorCounts.galeLoom = 3;

  const report = getOfflineProgress(state, 24 * 60 * 60);
  assert.equal(report.creditedSeconds, 12 * 60 * 60);
  assert.ok(report.rate > 0);
  assert.ok(Number.isFinite(report.gain));
  assert.equal(report.gain, report.rate * 12 * 60 * 60);
});

test("rift conversion preserves permanent progress and resets the run", () => {
  const state = createFreshState();
  state.lifetimeShards = 800_000_000;
  state.shards = 1234;
  state.generatorCounts[GENERATORS[0].id] = 12;
  state.purchasedUpgrades = [UPGRADES[0].id];

  const echoes = getAvailableEchoes(state);
  const next = createRiftState(state, echoes);
  assert.equal(echoes, 2);
  assert.equal(next.echoes, 2);
  assert.equal(next.resonance, 2);
  assert.equal(next.shards, 0);
  assert.equal(next.generatorCounts[GENERATORS[0].id], 0);
  assert.deepEqual(next.purchasedUpgrades, []);
  assert.equal(next.lifetimeShards, state.lifetimeShards);
});

test("state sanitation drops unknown and malformed values", () => {
  const state = sanitizeState({
    shards: -20,
    lifetimeShards: 50,
    generatorCounts: { [GENERATORS[0].id]: 3.8, unknown: 99 },
    purchasedUpgrades: [UPGRADES[0].id, UPGRADES[0].id, "unknown"],
    purchasedRiftwork: ["unknown"],
  });

  assert.equal(state.shards, 0);
  assert.equal(state.lifetimeShards, 50);
  assert.equal(state.generatorCounts[GENERATORS[0].id], 3);
  assert.equal(state.generatorCounts.unknown, undefined);
  assert.deepEqual(state.purchasedUpgrades, [UPGRADES[0].id]);
  assert.deepEqual(state.purchasedRiftwork, []);
});

test("legacy saves migrate and current saves round-trip", () => {
  const legacy = createFreshState();
  legacy.shards = 456;
  legacy.generatorCounts[GENERATORS[0].id] = 7;
  const storage = memoryStorage({ [SAVE_KEY]: JSON.stringify(legacy) });

  const loaded = loadSavedState(storage);
  assert.equal(loaded.migrated, true);
  assert.equal(loaded.state.shards, 456);
  assert.equal(loaded.state.generatorCounts[GENERATORS[0].id], 7);

  saveState(loaded.state, storage);
  const envelope = JSON.parse(storage.getItem(SAVE_KEY));
  assert.equal(envelope.version, SAVE_VERSION);
  assert.ok(Date.parse(envelope.savedAt));
  assert.equal(importSave(exportSave(loaded.state)).shards, 456);
});
