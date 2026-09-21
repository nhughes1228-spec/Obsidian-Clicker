import { applyCommand, advanceSimulation, getPurchaseOptions } from "../src/core.js";
import { createFreshState, getAvailableEchoes, getPassiveRate, getClickPower } from "../src/economy.js";
import { CHALLENGES } from "../src/long-term.js";
import { RIFTWORK } from "../src/content.js";
import { EXTENDED_WORKS, getExpeditionContracts, getMasteryRanks } from "../src/expansion.js";

export function seededRandom(seed) {
  let value = seed >>> 0;
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
}

export function simulateCampaign({ seed = 1, policy = "greedy", days = 90 } = {}) {
  const state = createFreshState();
  state.lastSimulatedAt = 1;
  state.runStartedAt = new Date(1).toISOString();
  const random = seededRandom(seed);
  const context = { random };
  const milestones = {};
  const snapshots = [];
  const challengeDurations = {};
  let challengeStartedAt = null;
  let lastActionAt = 0;
  let longestWaitHours = 0;
  let previousRiftAt = 0;
  const rebuildHours = [];
  const note = () => {
    const hours = state.lastSimulatedAt / 3600000;
    if (state.generatorCounts.whisperer > 0) milestones.firstGeneratorHours ??= hours;
    if (state.purchasedUpgrades.length) milestones.firstUpgradeHours ??= hours;
    if (state.riftEntries) milestones.firstRiftHours ??= hours;
    if (state.campaignComplete) milestones.chapterOneHours ??= hours;
    if (state.chapterTwoComplete) milestones.chapterTwoHours ??= hours;
    if (state.chapterThreeComplete) milestones.chapterThreeHours ??= hours;
    for (const id of state.completedChallenges) if (!challengeDurations[id] && challengeStartedAt) {
      challengeDurations[id] = (state.lastSimulatedAt - challengeStartedAt) / 3600000;
      challengeStartedAt = null;
    }
  };
  const buy = () => {
    for (let count = 0; count < (policy === "inexperienced" ? 3 : 20); count++) {
      let options = getPurchaseOptions(state, 1);
      if (policy === "inexperienced") options.sort((a, b) => a.cost - b.cost);
      if (policy !== "lookahead") options = options.filter((item) => item.cost <= state.shards);
      const next = options[0];
      if (!next || !applyCommand(state, next, context).ok) break;
      longestWaitHours = Math.max(longestWaitHours, (state.lastSimulatedAt - lastActionAt) / 3600000);
      lastActionAt = state.lastSimulatedAt;
      note();
    }
  };
  for (let visit = 0; visit < days * 3; visit++) {
    if (visit) advanceSimulation(state, (8 * 3600 - 300) * 1000, { ...context, offline: true });
    note();
    if (!state.activeChallenge && getAvailableEchoes(state) > 0 && state.riftEntries < 5) {
      applyCommand(state, { type: "rift" }, context);
      if (previousRiftAt) rebuildHours.push((state.lastSimulatedAt - previousRiftAt) / 3600000);
      previousRiftAt = state.lastSimulatedAt;
      note();
    }
    for (const key of ["generators", "upgrades", "work"]) applyCommand(state, { type: "automation", key, value: true }, context);
    for (const upgrade of RIFTWORK) applyCommand(state, { type: "buyRiftwork", id: upgrade.id }, context);
    if (!state.activeChallenge) {
      const challenge = CHALLENGES.find((item) => state.riftEntries >= item.unlockRifts && !state.completedChallenges.includes(item.id));
      if (challenge && applyCommand(state, { type: "startChallenge", id: challenge.id }, context).ok) challengeStartedAt = state.lastSimulatedAt;
    }
    if (state.riftEntries >= 1) applyCommand(state, { type: "allocation", value: 0.25 }, context);
    if (state.riftEntries >= 2 && !state.activeExpedition) {
      const contracts = getExpeditionContracts(state);
      const selection = contracts.find((item) => (state.expeditionRewards[item.id] || 0) < 10) || contracts[0];
      applyCommand(state, { type: "expeditionStart", key: selection.key }, context);
    }
    for (const work of EXTENDED_WORKS) while (applyCommand(state, { type: "buildWork", id: work.id }, context).ok) {}
    const actionInterval = state.riftEntries ? 10 : 1;
    for (let second = 0; second < 300; second += actionInterval) {
      applyCommand(state, { type: "click" }, context);
      if (state.activeWindRift && (policy !== "inexperienced" || random() > 0.5)) applyCommand(state, { type: "claimWindRift" }, context);
      if (second % 5 === 0) buy();
      advanceSimulation(state, actionInterval * 1000, context);
      note();
    }
    if ([30, 60, 90].includes((visit + 1) / 3)) {
      const passiveRate = getPassiveRate(state);
      const nextCost = Math.min(...getPurchaseOptions(state).map((item) => item.cost));
      snapshots.push({ day: (visit + 1) / 3, shards: state.shards, passiveRate, generators: Object.values(state.generatorCounts).reduce((a, b) => a + b, 0), upgrades: state.purchasedUpgrades.length, rifts: state.riftEntries, challenges: [...state.completedChallenges], workStages: state.completedWorkStages, chapterOne: state.campaignComplete, chapterTwo: state.chapterTwoComplete, chapterThree: state.chapterThreeComplete, masteryRanks: getMasteryRanks(state), expeditions: state.expeditionsCompleted, extendedWorks: { ...state.extendedWorks }, activeChallenge: state.activeChallenge,
        nextPurchaseWaitHours: passiveRate > 0 ? Math.max(0, nextCost - state.shards) / (passiveRate * (1 - state.projectAllocation)) / 3600 : null,
        availableActivities: { manualEarning: getClickPower(state) > 0, rift: getAvailableEchoes(state) > 0 && !state.activeChallenge, expedition: state.riftEntries >= 2, mastery: Object.entries(state.mastery).some(([id, item]) => item.rank < 5 && state.generatorCounts[id] > 0) },
      });
    }
  }
  return { seed, policy, milestones, challengeDurations, rebuildHours, longestManualPurchaseGapHours: longestWaitHours, snapshots, finite: Number.isFinite(state.shards) && Number.isFinite(state.lifetimeShards), finalChallenge: state.activeChallenge };
}
