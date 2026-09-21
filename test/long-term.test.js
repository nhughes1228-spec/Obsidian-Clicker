import assert from "node:assert/strict";
import test from "node:test";

import { createFreshState, getClickPower, getGeneratorUnitCost, getOfflineProgress, getPassiveRate, sanitizeState } from "../src/economy.js";
import { ACCLAIM_MILESTONES } from "../src/content.js";
import {
  OBSIDIAN_WORKS,
  abandonChallenge,
  canBuyGenerator,
  discoverGenerator,
  getAchievementCatalog,
  getCampaignProgress,
  getCurrentWorkStage,
  investInWork,
  isCampaignReady,
  reconcileLongTerm,
  setProjectAllocation,
  startChallenge,
} from "../src/long-term.js";

test("Acclaim achievements reconcile once with visible rewards and Chronicle entries", () => {
  const state = createFreshState();
  state.lifetimeShards = 1_000;
  state.totalClicks = 100;
  const unlocked = reconcileLongTerm(state);
  assert.ok(unlocked.length >= 2);
  assert.ok(state.achievementDates.shards1k);
  assert.ok(state.achievementDates.clicks100);
  const chronicleCount = state.chronicleEntries.length;
  assert.equal(reconcileLongTerm(state).length, 0);
  assert.equal(state.chronicleEntries.length, chronicleCount);
  assert.equal(getAchievementCatalog(state).filter((item) => item.completedAt).length, unlocked.length);
});

test("Obsidian Work allocation advances stages without creating Shards", () => {
  const state = createFreshState();
  setProjectAllocation(state, 0.5);
  assert.equal(state.projectAllocation, 0.5);
  const target = getCurrentWorkStage(state).target;
  const invested = investInWork(state, target);
  assert.equal(invested, target);
  assert.equal(state.projectStage, 1);
  assert.equal(state.completedWorkStages, 1);
  assert.equal(state.shards, 0);
  assert.ok(state.chronicleEntries.some((entry) => entry.type === "work"));
});

test("a large Work investment can complete multiple stages", () => {
  const state = createFreshState();
  const [first, second] = OBSIDIAN_WORKS[0].stages;
  investInWork(state, first.target + second.target + 100);
  assert.equal(state.projectStage, 2);
  assert.equal(state.completedWorkStages, 2);
  assert.equal(state.projectProgress, 100);
  assert.equal(state.chronicleEntries.filter((entry) => entry.type === "work").length, 2);
});

test("offline progress separates player gain from project investment", () => {
  const state = createFreshState();
  state.generatorCounts.whisperer = 10;
  state.projectAllocation = 0.5;
  const report = getOfflineProgress(state, 60);
  assert.equal(report.gain + report.projectBase, report.grossGain);
  assert.equal(report.gain, report.projectBase);
});

test("challenge starts reset current run and enforce authored restrictions", () => {
  const quiet = createFreshState();
  quiet.shards = 100;
  quiet.generatorCounts.whisperer = 5;
  assert.equal(startChallenge(quiet, "quietStorm"), true);
  assert.equal(quiet.shards, 0);
  assert.equal(quiet.generatorCounts.whisperer, 0);
  assert.equal(getClickPower(quiet), 0);
  assert.equal(abandonChallenge(quiet), true);

  const single = createFreshState();
  startChallenge(single, "singleVoice");
  assert.equal(canBuyGenerator(single, "whisperer"), true);
  assert.equal(canBuyGenerator(single, "galeLoom"), false);

  const fractured = createFreshState();
  const ordinaryCost = getGeneratorUnitCost(fractured, { id: "whisperer", baseCost: 15 });
  startChallenge(fractured, "fracturedTempo");
  assert.ok(getGeneratorUnitCost(fractured, { id: "whisperer", baseCost: 15 }) > ordinaryCost);
});

test("challenge completion grants one-time permanent rewards", () => {
  const state = createFreshState();
  startChallenge(state, "singleVoice");
  state.runShards = 100_000_000;
  reconcileLongTerm(state);
  assert.equal(state.activeChallenge, null);
  assert.deepEqual(state.completedChallenges, ["singleVoice"]);
  state.generatorCounts.whisperer = 10;
  const rewardedRate = getPassiveRate(state);
  const ordinary = createFreshState();
  ordinary.generatorCounts.whisperer = 10;
  assert.ok(rewardedRate > getPassiveRate(ordinary));
});

test("generator discoveries and capstone completion populate the Chronicle", () => {
  const state = createFreshState();
  assert.equal(discoverGenerator(state, { id: "whisperer", name: "Whisperer", description: "A first voice." }), true);
  assert.equal(discoverGenerator(state, { id: "whisperer", name: "Whisperer", description: "A first voice." }), false);
  state.achievementDates = Object.fromEntries(ACCLAIM_MILESTONES.slice(0, 15).map((milestone) => [milestone.id, new Date().toISOString()]));
  state.completedWorkStages = 4;
  state.completedChallenges = ["quietStorm", "singleVoice", "fracturedTempo"];
  state.riftEntries = 5;
  assert.equal(isCampaignReady(state), true);
  reconcileLongTerm(state);
  assert.equal(state.campaignComplete, true);
  assert.ok(state.campaignCompletedAt);
  assert.ok(state.chronicleEntries.some((entry) => entry.type === "capstone"));
  assert.equal(getCampaignProgress(state).work.value, 4);
});

test("long-term save data sanitizes invalid projects, challenges, and Chronicle entries", () => {
  const state = sanitizeState({
    projectStage: 99,
    projectProgress: -5,
    projectAllocation: 0.33,
    activeChallenge: "unknown",
    completedChallenges: ["quietStorm", "unknown", "quietStorm"],
    chronicleEntries: [{ title: "Valid", text: "Entry" }, { nope: true }],
    discoveredGenerators: ["whisperer", "unknown"],
  });
  assert.equal(state.projectStage, 4);
  assert.equal(state.projectProgress, 0);
  assert.equal(state.projectAllocation, 0);
  assert.equal(state.activeChallenge, null);
  assert.deepEqual(state.completedChallenges, ["quietStorm"]);
  assert.equal(state.chronicleEntries.length, 1);
  assert.deepEqual(state.discoveredGenerators, ["whisperer"]);
});
