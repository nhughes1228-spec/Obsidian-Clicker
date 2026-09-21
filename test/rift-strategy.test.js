import assert from "node:assert/strict";
import test from "node:test";

import { registerActiveClick, updateActivePlay, claimWindRift } from "../src/active-play.js";
import { createFreshState, createRiftState, getClickPower, getGeneratorUnitCost, getOfflineProgress, getPassiveRate, sanitizeState } from "../src/economy.js";
import { getRiftConstellation, getRiftForecast } from "../src/progression.js";
import { RIFT_ASPECTS, togglePendingAspect, unlockAspect } from "../src/rift-strategy.js";

test("Rift constellation exposes five branches and all ten Aspects", () => {
  const constellation = getRiftConstellation(createFreshState());
  assert.equal(constellation.length, 5);
  assert.equal(constellation.flatMap((branch) => branch.aspects).length, 10);
  assert.equal(new Set(constellation.map((branch) => branch.id)).size, 5);
});

test("Aspect unlocks spend Echoes and loadouts enforce two slots", () => {
  const state = createFreshState();
  state.echoes = 100;
  for (const aspect of RIFT_ASPECTS.slice(0, 3)) assert.equal(unlockAspect(state, aspect.id), true);
  assert.equal(state.echoes, 100 - RIFT_ASPECTS.slice(0, 3).reduce((sum, aspect) => sum + aspect.cost, 0));
  assert.equal(togglePendingAspect(state, RIFT_ASPECTS[0].id), true);
  assert.equal(togglePendingAspect(state, RIFT_ASPECTS[1].id), true);
  assert.equal(togglePendingAspect(state, RIFT_ASPECTS[2].id), false);
  assert.equal(state.pendingAspects.length, 2);
  assert.equal(togglePendingAspect(state, RIFT_ASPECTS[0].id), true);
  assert.equal(state.pendingAspects.length, 1);
});

test("Rift forecast reports losses, gains, replay estimate, and selected build", () => {
  const state = createFreshState();
  state.shards = 1000;
  state.runShards = 800_000_000;
  state.lifetimeShards = 800_000_000;
  state.generatorCounts.whisperer = 10;
  state.purchasedUpgrades = ["sharperSigil"];
  state.pendingAttunement = "active";
  state.unlockedAspects = ["tempoGlass"];
  state.pendingAspects = ["tempoGlass"];
  const forecast = getRiftForecast(state);
  assert.equal(forecast.echoes, 2);
  assert.equal(forecast.lostGenerators, 10);
  assert.equal(forecast.lostUpgrades, 1);
  assert.equal(forecast.nextAttunement, "active");
  assert.deepEqual(forecast.nextAspects, ["tempoGlass"]);
  assert.ok(forecast.replaySeconds >= 60);
  assert.ok(forecast.passiveBefore > 0);
  assert.ok(forecast.passiveAfter > 0);
  assert.ok(forecast.clickAfter > forecast.clickBefore);
});

test("Active and Idle Aspect builds produce distinct shared economy results", () => {
  const base = createFreshState();
  base.generatorCounts.whisperer = 10;
  base.runShards = 100;
  const ordinaryCost = getGeneratorUnitCost(base, { id: "whisperer", baseCost: 15 });

  const active = { ...base, activeAspects: ["tempoGlass", "clearHorizon"], momentum: 0 };
  registerActiveClick(active, 1000, () => 1);
  assert.ok(active.momentum > 7);
  assert.ok(getClickPower(active) > getClickPower(base));

  const idle = { ...base, activeAspects: ["deepReservoir", "longMemory"] };
  assert.ok(getPassiveRate(idle) > getPassiveRate(base));
  assert.ok(getOfflineProgress(idle, 60).gain > getOfflineProgress(base, 60).gain);

  const economy = { ...base, activeAspects: ["frugalGeometry"] };
  assert.ok(getGeneratorUnitCost(economy, { id: "whisperer", baseCost: 15 }) < ordinaryCost);
});

test("Event Aspects alter cadence and reward strength", () => {
  const base = createFreshState();
  base.nextWindRiftIn = 0;
  updateActivePlay(base, 0.1, () => 0);
  base.activeWindRift = null;
  base.nextWindRiftIn = 0;
  updateActivePlay(base, 0.1, () => 0);
  base.activeWindRift = { type: "bounty", seconds: 5 };
  const ordinary = claimWindRift(base, 10, () => 0);

  const event = createFreshState();
  event.activeAspects = ["riftBeacon", "lastingWeather"];
  event.activeWindRift = { type: "bounty", seconds: 5 };
  const boosted = claimWindRift(event, 10, () => 0);
  assert.ok(event.nextWindRiftIn < base.nextWindRiftIn);
  assert.equal(boosted.bounty, ordinary.bounty * 1.5);
});

test("Rift records outgoing build and activates the pending loadout", () => {
  const state = createFreshState();
  state.runShards = 800_000_000;
  state.peakRunPassiveRate = 1234;
  state.attunement = "idle";
  state.pendingAttunement = "active";
  state.unlockedAspects = ["deepReservoir", "tempoGlass"];
  state.activeAspects = ["deepReservoir"];
  state.pendingAspects = ["tempoGlass"];
  const next = createRiftState(state, 2);
  assert.deepEqual(next.activeAspects, ["tempoGlass"]);
  assert.equal(next.runHistory.length, 1);
  assert.equal(next.runHistory[0].attunement, "idle");
  assert.deepEqual(next.runHistory[0].aspects, ["deepReservoir"]);
  assert.equal(next.runHistory[0].peakPassiveRate, 1234);
});

test("Aspect ownership and run history sanitize malformed saves", () => {
  const state = sanitizeState({
    unlockedAspects: ["tempoGlass", "unknown", "tempoGlass"],
    activeAspects: ["tempoGlass", "unknown"],
    pendingAspects: ["unknown"],
    runHistory: [{ durationSeconds: -5, runShards: 12, aspects: ["tempoGlass", "unknown"] }],
  });
  assert.deepEqual(state.unlockedAspects, ["tempoGlass"]);
  assert.deepEqual(state.activeAspects, ["tempoGlass"]);
  assert.deepEqual(state.pendingAspects, []);
  assert.equal(state.runHistory[0].durationSeconds, 0);
  assert.deepEqual(state.runHistory[0].aspects, ["tempoGlass"]);
});
