import test from "node:test";
import assert from "node:assert/strict";
import { SAVE_KEY, SAVE_VERSION, GENERATORS } from "../src/content.js";
import { createFreshState, createRiftState, getAcclaimCount, getPassiveRate, sanitizeState, formatPercent } from "../src/economy.js";
import { applyCommand, advanceSimulation, advanceTo } from "../src/core.js";
import { BACKUP_KEY, RECOVERY_KEY, loadSavedState, saveState, importSave, exportSave, replaceSave } from "../src/persistence.js";
import { getRiftForecast } from "../src/progression.js";
import { getFirstRunObjective } from "../src/identity.js";
import { getCurrentWorkStage, investInWork } from "../src/long-term.js";

function storage(entries = {}) {
  const data = new Map(Object.entries(entries));
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}
const context = { random: () => 0.99 };

test("corrupt and future saves remain untouched by automatic saving", () => {
  for (const raw of ["{bad json", JSON.stringify({ version: SAVE_VERSION + 1, data: createFreshState() })]) {
    const store = storage({ [SAVE_KEY]: raw });
    const loaded = loadSavedState(store);
    assert.ok(loaded.error);
    assert.ok(saveState(loaded.state, store).error);
    assert.equal(store.getItem(SAVE_KEY), raw);
    assert.equal(store.getItem(RECOVERY_KEY), raw);
  }
});

test("a readable backup recovers without replacing the damaged original", () => {
  const saved = createFreshState(); saved.shards = 432;
  const store = storage({ [SAVE_KEY]: "corrupt", [BACKUP_KEY]: exportSave(saved) });
  const loaded = loadSavedState(store);
  assert.equal(loaded.recovered, true);
  assert.equal(loaded.state.shards, 432);
  assert.ok(saveState(loaded.state, store).error);
  assert.equal(store.getItem(SAVE_KEY), "corrupt");
  assert.ok(!replaceSave(loaded.state, store).error);
  assert.equal(store.getItem(RECOVERY_KEY), "corrupt");
});

test("blocked storage and failed writes do not advance save timestamps", () => {
  const blocked = { getItem() { throw new Error("SecurityError"); }, setItem() { throw new Error("QuotaExceeded"); } };
  assert.ok(loadSavedState(blocked).error);
  const state = createFreshState();
  assert.ok(saveState(state, blocked).error);
  assert.equal(state.lastSavedAt, null);
  const quota = { getItem: () => null, setItem() { throw new Error("QuotaExceeded"); } };
  assert.ok(saveState(state, quota).error);
  assert.equal(state.lastSavedAt, null);
});

test("imports reject unrelated JSON, malformed envelopes and unsupported versions", () => {
  for (const input of ["null", "[]", '{}', '{"hello":"world"}', '{"version":7}', JSON.stringify({ version: 999, data: createFreshState() }), 'x'.repeat(2_000_001)]) assert.throws(() => importSave(input));
  for (let version = 0; version <= SAVE_VERSION; version++) {
    const state = createFreshState(); state.shards = 123;
    const text = JSON.stringify(version ? { version, data: state } : state);
    assert.equal(importSave(text).shards, 123);
  }
});

test("save backup holds the last valid revision", () => {
  const state = createFreshState(); const store = storage();
  saveState(state, store, 1000);
  state.shards = 15;
  saveState(state, store, 2000);
  assert.equal(importSave(store.getItem(BACKUP_KEY)).shards, 0);
  assert.equal(importSave(store.getItem(SAVE_KEY)).shards, 15);
});

test("Quiet Storm can earn and purchase without any clicks", () => {
  const state = createFreshState();
  state.riftEntries = 1;
  state.productionSurgeSeconds = 60; state.clickSurgeSeconds = 60;
  state.activeWindRift = { type: "bounty", seconds: 12 }; state.momentumGraceSeconds = 1;
  assert.ok(applyCommand(state, { type: "startChallenge", id: "quietStorm" }, context).ok);
  assert.equal(state.productionSurgeSeconds, 0);
  assert.equal(state.activeWindRift, null);
  advanceSimulation(state, 180_000, context);
  assert.ok(state.shards >= 17);
  assert.ok(applyCommand(state, { type: "buyGenerator", id: "whisperer" }, context).ok);
  assert.equal(state.generatorCounts.whisperer, 2);
  assert.equal(state.totalClicks, 0);
});

test("completed Work cannot divert income and overflow is returned", () => {
  const state = createFreshState();
  state.projectStage = 3; state.completedWorkStages = 3;
  state.projectProgress = getCurrentWorkStage(state).target - 10;
  assert.equal(investInWork(state, 100), 10);
  assert.equal(state.projectAllocation, 0);
  const repaired = sanitizeState({ ...state, projectAllocation: 0.5 });
  assert.equal(repaired.projectAllocation, 0);
  repaired.generatorCounts.whisperer = 10;
  const report = advanceSimulation(repaired, 10000, context);
  assert.equal(report.projectBase, 0);
  assert.equal(repaired.shards, report.grossGain);
});

test("construction conserves production and gross earnings count toward progression", () => {
  const state = createFreshState(); state.generatorCounts.whisperer = 10; state.projectAllocation = 0.5;
  const report = advanceSimulation(state, 60000, context);
  assert.ok(Math.abs(report.gain + report.projectBase - report.grossGain) < 1e-8);
  assert.equal(state.lifetimeShards, report.grossGain);
  assert.equal(state.runShards, report.grossGain);
  assert.equal(state.shards, report.gain);
});

test("offline construction completion splits rates and refunds unused allocation", () => {
  const state = createFreshState(); state.generatorCounts.whisperer = 10;
  state.projectStage = 3; state.completedWorkStages = 3;
  state.projectProgress = getCurrentWorkStage(state).target - 1;
  state.projectAllocation = 0.5;
  const before = getPassiveRate(state);
  const report = advanceSimulation(state, 60000, { offline: true });
  assert.equal(state.projectStage, 4);
  assert.ok(report.projectBase <= 1.00000001);
  assert.ok(report.grossGain > before * 60);
  assert.ok(Math.abs(state.shards + report.projectBase - report.grossGain) < 1e-7);
});

test("time is credited once, zero is a no-op, and invalid durations reject", () => {
  const state = createFreshState(); state.generatorCounts.whisperer = 1; state.lastSimulatedAt = 1000;
  advanceTo(state, 11000, context);
  const copy = structuredClone(state);
  advanceTo(state, 11000, context); advanceTo(state, 9000, context); advanceSimulation(state, 0);
  assert.deepEqual(state, copy);
  for (const duration of [-1, Infinity, NaN]) assert.throws(() => advanceSimulation(state, duration));
});

test("offline credit caps income but ages temporary effects across the full absence", () => {
  const state = createFreshState(); state.generatorCounts.whisperer = 10; state.productionSurgeSeconds = 30; state.lastSimulatedAt = 1000;
  const report = advanceSimulation(state, 86400000, { offline: true });
  assert.equal(report.creditedSeconds, 43200);
  assert.equal(state.lastSimulatedAt, 86401000);
  assert.equal(state.productionSurgeSeconds, 0);
  assert.equal(state.activeWindRift, null);
});

test("Rift forecasts compare identical holdings without mutating the source", () => {
  const state = createFreshState(); state.generatorCounts.galeLoom = 100; state.lifetimeShards = 1e8;
  state.productionSurgeSeconds = 30;
  const before = structuredClone(state);
  const forecast = getRiftForecast(state);
  assert.deepEqual(state, before);
  assert.ok(forecast.improvement > 1);
  assert.equal(forecast.replaySeconds, null);
});

test("Rifts preserve earned Acclaim and completed onboarding", () => {
  const state = createFreshState(); state.generatorCounts.whisperer = 250; state.lifetimeShards = 1e8;
  const count = getAcclaimCount(state);
  const next = createRiftState(state, 1, 10000);
  assert.ok(getAcclaimCount(next) >= count);
  assert.equal(getFirstRunObjective(next, 0), null);
});

test("invalid generator counts cannot buy fractional or unbounded batches", () => {
  const state = createFreshState(); state.shards = 1e9;
  for (const amount of [0, -1, 1.5, Infinity, 100001]) assert.equal(applyCommand(state, { type: "buyGenerator", id: GENERATORS[0].id, amount }).ok, false);
  assert.equal(state.shards, 1e9);
});

test("offline partitioning preserves income across achievement, Work, and mastery boundaries", () => {
  const bulk = createFreshState(); bulk.riftEntries = 1; bulk.lastSimulatedAt = 1;
  bulk.generatorCounts.whisperer = 1000;
  applyCommand(bulk, { type: "allocation", value: 0.5 });
  const split = structuredClone(bulk);
  advanceSimulation(bulk, 43200000, { offline: true });
  for (let tick = 0; tick < 720; tick++) advanceSimulation(split, 60000, { offline: true });
  assert.ok(Math.abs(bulk.shards - split.shards) / split.shards < 1e-8);
  assert.equal(bulk.projectStage, split.projectStage);
  assert.equal(bulk.mastery.whisperer.rank, split.mastery.whisperer.rank);
  assert.equal(bulk.lastSimulatedAt, split.lastSimulatedAt);
});

test("oversized imported Work progress cannot create negative investment or stop the loop", () => {
  const state = sanitizeState({ shards: 0, generatorCounts: { whisperer: 10 }, projectStage: 3, projectProgress: 1e100, projectAllocation: 0.5 });
  assert.doesNotThrow(() => advanceSimulation(state, 60000, { offline: true }));
  assert.equal(state.projectStage, 4);
  assert.ok(state.shards > 0);
  assert.ok(!formatPercent(150).startsWith("100"));
});
