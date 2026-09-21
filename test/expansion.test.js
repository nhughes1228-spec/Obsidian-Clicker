import test from "node:test";
import assert from "node:assert/strict";
import { applyCommand, advanceSimulation, getPurchaseOptions } from "../src/core.js";
import { createFreshState, getPassiveRate, sanitizeState } from "../src/economy.js";
import { getExpeditionContracts, getExpeditionMultiplier, MASTERY_RANK_SECONDS, EXTENDED_WORKS, MAX_EXPEDITION_TIER, reconcileChapters } from "../src/expansion.js";
import { importSave, exportSave } from "../src/persistence.js";
import { GENERATORS } from "../src/content.js";

test("expedition cosmetic titles persist without increasing power", () => {
  const state = createFreshState();
  state.expeditionsCompleted = 1000;
  const multiplier = getExpeditionMultiplier(state);
  reconcileChapters(state);
  reconcileChapters(state);
  assert.equal(state.permanentLore.filter((entry) => entry.startsWith("Expedition title:")).length, 5);
  assert.equal(getExpeditionMultiplier(state), multiplier);
  assert.deepEqual(importSave(exportSave(state)).permanentLore, state.permanentLore);
});

test("automation unlocks progressively, respects its reserve, and remembers upgrades", () => {
  const state = createFreshState();
  assert.equal(applyCommand(state, { type: "automation", key: "generators", value: true }).ok, false);
  state.riftEntries = 1;
  assert.ok(applyCommand(state, { type: "automation", key: "generators", value: true }).ok);
  assert.equal(applyCommand(state, { type: "automation", key: "upgrades", value: true }).ok, false);
  state.shards = 100; state.automation.reserve = 90;
  advanceSimulation(state, 16000);
  assert.equal(state.generatorCounts.whisperer, 0);
  applyCommand(state, { type: "automation", key: "reserve", value: 80 });
  advanceSimulation(state, 16000);
  assert.equal(state.generatorCounts.whisperer, 1);
  assert.ok(state.shards >= 80);
  state.lifetimeShards = 1e8; state.shards = 1e6;
  applyCommand(state, { type: "buyUpgrade", id: "sharperSigil" });
  assert.ok(state.rememberedUpgrades.includes("sharperSigil"));
  applyCommand(state, { type: "rift" });
  assert.ok(state.rememberedUpgrades.includes("sharperSigil"));
});

test("mastery earns offline, preserves ranks at Rift, and applies pending specialization", () => {
  const state = createFreshState(); state.riftEntries = 1; state.generatorCounts.whisperer = 1000;
  advanceSimulation(state, (MASTERY_RANK_SECONDS[0] + 1) * 1000, { offline: true });
  assert.ok(state.mastery.whisperer.rank >= 1);
  assert.ok(state.masteryTokens >= 1);
  const rank = state.mastery.whisperer.rank;
  applyCommand(state, { type: "specialization", id: "whisperer", value: "chorus" });
  assert.equal(state.mastery.whisperer.specialization, "focus");
  state.lifetimeShards = 1e8;
  applyCommand(state, { type: "rift" });
  assert.equal(state.mastery.whisperer.specialization, "chorus");
  assert.equal(state.mastery.whisperer.rank, rank);
  assert.equal(applyCommand(state, { type: "specialization", id: "__proto__", value: "focus" }).ok, false);
});

test("Works require and spend both currencies exactly once", () => {
  const state = createFreshState(); state.riftEntries = 1; state.shards = 1e20;
  const stage = EXTENDED_WORKS[0].stages[0];
  assert.equal(applyCommand(state, { type: "buildWork", id: "mastery" }).ok, false);
  state.masteryTokens = stage.material;
  const before = state.shards;
  assert.ok(applyCommand(state, { type: "buildWork", id: "mastery" }).ok);
  assert.equal(state.shards, before - stage.cost);
  assert.equal(state.masteryTokens, 0);
  assert.equal(state.extendedWorks.mastery, 1);
});

test("each expedition completes through production and legal automated purchases", () => {
  for (let index = 0; index < 3; index++) {
    const state = createFreshState(); state.riftEntries = 2; state.generatorCounts.galeLoom = 5;
    const contract = getExpeditionContracts(state)[index];
    assert.ok(applyCommand(state, { type: "expeditionStart", key: contract.key }).ok);
    const mainCounts = { ...state.generatorCounts };
    for (let hour = 0; hour < 48 && state.activeExpedition; hour++) advanceSimulation(state, 3600000, { offline: true });
    assert.equal(state.activeExpedition, null, contract.id);
    assert.equal(state.expeditionsCompleted, 1);
    assert.deepEqual(state.generatorCounts, mainCounts);
    assert.equal(state.activeChallenge, null);
    assert.ok(state.expeditionMaterials >= 1);
  }
});

test("expedition save round-trip preserves independent progress without recursive states", () => {
  const state = createFreshState(); state.riftEntries = 2;
  applyCommand(state, { type: "expeditionStart", key: getExpeditionContracts(state)[0].key });
  advanceSimulation(state, 60000, { offline: true });
  const saved = importSave(exportSave(state));
  assert.equal(saved.activeExpedition.state.runShards, state.activeExpedition.state.runShards);
  assert.equal(saved.activeExpedition.state.expeditionMode, true);
  assert.equal(saved.activeExpedition.state.activeExpedition, null);
  assert.ok(getPassiveRate(saved.activeExpedition.state) > 0);
  applyCommand(saved, { type: "expeditionAbandon" });
  assert.equal(saved.activeExpedition, null);
  assert.equal(saved.expeditionMaterials, 0);
  assert.equal(getExpeditionContracts(saved)[0].tier, 0);
});

test("expedition scaling stays finite and permanent power is capped", () => {
  const state = createFreshState();
  for (const type of ["quietStorm", "singleVoice", "fracturedTempo"]) {
    state.expeditionRecords[type] = { tier: MAX_EXPEDITION_TIER, seconds: 1 };
    state.expeditionRewards[type] = 100000;
  }
  assert.equal(getExpeditionMultiplier(state), 1.3);
  assert.ok(getExpeditionContracts(state).every((item) => Number.isFinite(item.target)));
  const clean = sanitizeState(state);
  assert.ok(Object.values(clean.expeditionRewards).every((value) => value <= 10));
});

test("purchase recommendations are stable, reusable, and invalidate after progression", () => {
  const state = createFreshState(); state.shards = 1000;
  const initial = getPurchaseOptions(state);
  initial.reverse();
  assert.equal(getPurchaseOptions(state)[0].id, "whisperer");
  applyCommand(state, { type: "buyGenerator", id: GENERATORS[0].id });
  assert.notEqual(getPurchaseOptions(state).find((item) => item.id === "whisperer").cost, 15);
});

test("rapid input cannot produce unlimited manual income", () => {
  const state = createFreshState();
  assert.ok(applyCommand(state, { type: "click" }, { now: 1000, random: () => 1 }).ok);
  const earned = state.shards;
  for (let now = 1001; now < 1250; now++) assert.equal(applyCommand(state, { type: "click" }, { now }).ok, false);
  assert.equal(state.shards, earned);
  assert.ok(applyCommand(state, { type: "click" }, { now: 1250 }).ok);
});

test("expeditions snapshot selected build bonuses and do not change an underway crew", () => {
  const state = createFreshState(); state.riftEntries = 2;
  state.mastery.whisperer.rank = 5;
  state.attunement = "idle";
  const contract = getExpeditionContracts(state)[0];
  applyCommand(state, { type: "expeditionStart", key: contract.key });
  const crew = state.activeExpedition.state;
  assert.equal(crew.mastery.whisperer.rank, 5);
  assert.equal(crew.attunement, "idle");
  state.mastery.whisperer.rank = 0;
  assert.equal(crew.mastery.whisperer.rank, 5);
  assert.ok(getPassiveRate(crew) > 0.1);
});
