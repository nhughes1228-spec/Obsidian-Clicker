import assert from "node:assert/strict";
import test from "node:test";

import { GENERATORS, UPGRADES } from "../src/content.js";
import { createFreshState } from "../src/economy.js";
import { getFirstRunObjective, getLogoEvolution } from "../src/identity.js";

test("first-run objectives advance through click, generator, upgrade, and automation", () => {
  const state = createFreshState();
  assert.equal(getFirstRunObjective(state, 0).id, "firstShard");
  state.lifetimeShards = 1;
  assert.equal(getFirstRunObjective(state, 0).id, "firstGenerator");
  state.generatorCounts.whisperer = 1;
  assert.equal(getFirstRunObjective(state, 0.1).id, "firstUpgrade");
  state.purchasedUpgrades.push("sharperSigil");
  assert.equal(getFirstRunObjective(state, 0.1).id, "steadyCurrent");
  assert.equal(getFirstRunObjective(state, 1), null);
});

test("logo evolution reflects permanent milestones and owned generator voices", () => {
  const state = createFreshState();
  assert.equal(getLogoEvolution(state).tier, 0);
  state.lifetimeShards = 1_000;
  state.achievementDates = Object.fromEntries(["a", "b", "c", "d", "e"].map((id) => [id, "now"]));
  state.completedWorkStages = 2;
  state.riftEntries = 1;
  state.generatorCounts.galeLoom = 2;
  const evolution = getLogoEvolution(state);
  assert.equal(evolution.tier, 4);
  assert.deepEqual(evolution.activeGeneratorIds, ["galeLoom"]);
});

test("every generator has a distinct identity mark and legacy competition labels are gone", () => {
  assert.equal(GENERATORS.every((generator) => typeof generator.icon === "string" && generator.icon.length > 0), true);
  assert.equal(new Set(GENERATORS.map((generator) => generator.icon)).size, GENERATORS.length);
  assert.equal(UPGRADES.find((upgrade) => upgrade.id === "indoorCircuit").name, "Glasshouse Circuit");
  assert.equal(UPGRADES.find((upgrade) => upgrade.id === "worldFinalsRun").name, "Horizon Procession");
});
