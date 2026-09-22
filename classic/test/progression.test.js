import assert from "node:assert/strict";
import test from "node:test";

import { GENERATORS, UPGRADES } from "../src/content.js";
import { createFreshState, createRiftState, getPassiveRate } from "../src/economy.js";
import {
  getGeneratorPurchasePreview,
  getGeneratorUpgradeGroups,
  getNextDiscoveries,
  getUpgradeCatalog,
  getUpgradePurchasePreview,
} from "../src/progression.js";

test("fresh discoveries point to the first generator and reachable milestones", () => {
  const discoveries = getNextDiscoveries(createFreshState());
  assert.equal(discoveries.generator.label, GENERATORS[0].name);
  assert.equal(discoveries.generator.progress, 0);
  assert.ok(discoveries.upgrade);
  assert.ok(discoveries.acclaim);
  assert.equal(discoveries.rift.label, "Next Echo");
});

test("upgrade catalogs separate available, purchased, and effect categories", () => {
  const state = createFreshState();
  state.lifetimeShards = 1000;
  state.purchasedUpgrades = ["sharperSigil"];

  assert.ok(getUpgradeCatalog(state, "purchased").every((upgrade) => state.purchasedUpgrades.includes(upgrade.id)));
  assert.ok(getUpgradeCatalog(state, "click").every((upgrade) => upgrade.effect.type !== "generatorMultiplier" && upgrade.effect.type !== "globalMultiplier"));
  assert.ok(getUpgradeCatalog(state, "global").every((upgrade) => upgrade.effect.type === "globalMultiplier"));
  assert.ok(getUpgradeCatalog(state, "generator").every((upgrade) => upgrade.effect.type === "generatorMultiplier"));
});

test("generator upgrade groups preserve content order", () => {
  const groups = getGeneratorUpgradeGroups(UPGRADES);
  assert.equal(groups.length, GENERATORS.length);
  assert.equal(groups[0].generator.id, GENERATORS[0].id);
  assert.equal(groups[0].upgrades.length, 10);
});

test("generator previews match the resulting passive rate without mutating state", () => {
  const state = createFreshState();
  const preview = getGeneratorPurchasePreview(state, GENERATORS[0], 10);
  assert.equal(state.generatorCounts.whisperer, 0);
  assert.equal(preview.beforeRate, 0);
  assert.equal(preview.afterRate, 1);
  assert.equal(preview.rateGain, 1);
});

test("upgrade previews report before and after click and passive values", () => {
  const state = createFreshState();
  state.generatorCounts.whisperer = 1;
  const preview = getUpgradePurchasePreview(state, UPGRADES.find((upgrade) => upgrade.id === "whisperer-1"));
  assert.equal(preview.beforeRate, getPassiveRate(state));
  assert.equal(preview.afterRate, preview.beforeRate * 2);
  assert.ok(preview.afterClick > preview.beforeClick);
});

test("Rift completion records the run and starts a fresh timer", () => {
  const state = createFreshState();
  state.runShards = 900_000_000;
  state.runStartedAt = new Date(Date.now() - 60_000).toISOString();
  const next = createRiftState(state, 2);
  assert.equal(next.bestRunShards, state.runShards);
  assert.ok(next.lastRunSeconds >= 59 && next.lastRunSeconds <= 61);
  assert.equal(next.fastestRiftSeconds, next.lastRunSeconds);
  assert.equal(next.runShards, 0);
  assert.ok(Date.parse(next.runStartedAt) > Date.parse(state.runStartedAt));
});
