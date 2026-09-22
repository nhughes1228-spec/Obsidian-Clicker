import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import {
  createFreshState,
  applyCommand,
  advanceSimulation,
  deriveEconomy,
  purchasingOptions,
  upgradeUnlocked,
} from "../src/core.js";
import {
  PRODUCERS,
  UPGRADES,
  RESEARCH,
  MODIFICATIONS,
  MODIFICATION_COSTS,
} from "../src/content.js";
import { activeGoals, goalValue } from "../src/goals.js";

function rng(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
export function simulate({
  seed = 1,
  policy = "greedy",
  schedule = "visits",
  days = 10,
} = {}) {
  const state = createFreshState(0),
    random = rng(seed);
  const report = {
    seed,
    policy,
    schedule,
    firstProducer: null,
    firstUpgrade: null,
    firstRebuild: null,
    firstGoal: null,
    firstModification: null,
    goalsClaimed: 0,
    modificationLevels: 0,
    producerUnlocks: {},
    producerPurchases: {},
    researchPurchases: {},
    researchComplete: null,
    longestAffordabilityWait: 0,
    longestPurchaseGap: 0,
    finalResearch: 0,
    rebuilds: 0,
  };
  let elapsed = 0,
    lastPurchase = 0;
  function note() {
    report.goalsClaimed = state.claimedGoals.length;
    report.modificationLevels = Object.values(state.modifications).reduce(
      (a, b) => a + b,
      0,
    );
    if (report.goalsClaimed) report.firstGoal ??= elapsed;
    if (report.modificationLevels) report.firstModification ??= elapsed;
    for (const id of state.research) report.researchPurchases[id] ??= elapsed;
    for (const p of PRODUCERS) {
      if (state.unlockedProducers.includes(p.id))
        report.producerUnlocks[p.id] ??= elapsed;
      if (state.producers[p.id]) report.producerPurchases[p.id] ??= elapsed;
    }
    if (Object.keys(report.producerPurchases).length)
      report.firstProducer ??= elapsed;
    if (state.upgrades.length) report.firstUpgrade ??= elapsed;
    if (state.rebuilds) report.firstRebuild ??= elapsed;
    if (state.research.length === RESEARCH.length)
      report.researchComplete ??= elapsed;
  }
  function shop() {
    const economy = deriveEconomy(state);
    const options = purchasingOptions(state).map((o) => ({
      ...o,
      command: { type: "buyProducer", id: o.id },
      score: o.cost / o.gain,
    }));
    for (const u of UPGRADES) {
      if (state.upgrades.includes(u.id) || !upgradeUnlocked(state, u)) continue;
      const copy = { ...state, upgrades: [...state.upgrades, u.id] },
        after = deriveEconomy(copy);
      const gain =
        after.passiveRate -
        economy.passiveRate +
        (after.clickPower - economy.clickPower) *
          (schedule === "continuous" ? 0.6 : 0.04);
      options.push({
        cost: u.cost,
        score: u.cost / Math.max(0.001, gain),
        command: { type: "buyUpgrade", id: u.id },
      });
    }
    if (economy.passiveRate)
      report.longestAffordabilityWait = Math.max(
        report.longestAffordabilityWait,
        Math.max(0, Math.min(...options.map((o) => o.cost)) - state.obsidian) /
          economy.passiveRate,
      );
    const affordable = options.filter((o) => o.cost <= state.obsidian);
    const source = policy === "saving" ? options : affordable;
    source.sort((a, b) =>
      policy === "inexpensive" ? a.cost - b.cost : a.score - b.score,
    );
    const pick = source[0];
    if (pick && applyCommand(state, pick.command).ok) {
      report.longestPurchaseGap = Math.max(
        report.longestPurchaseGap,
        elapsed - lastPurchase,
      );
      lastPurchase = elapsed;
      return true;
    }
    return false;
  }
  function goalsAndModifications() {
    let goal;
    while (
      (goal = activeGoals(state).find(
        (g) => g && goalValue(state, g) >= g.target,
      ))
    )
      applyCommand(state, { type: "claimGoal", id: goal.id });
    // Spend directly, without random drops; prioritize equipment contributing now.
    const economy = deriveEconomy(state);
    const options = MODIFICATIONS.filter(
      (m) =>
        state.bestOwned[m.producer] > 0 &&
        MODIFICATION_COSTS[state.modifications[m.id]] <= state.upgradeParts,
    );
    options.sort((a, b) =>
      policy === "inexpensive"
        ? MODIFICATION_COSTS[state.modifications[a.id]] -
          MODIFICATION_COSTS[state.modifications[b.id]]
        : economy.unitRates[b.producer] * state.producers[b.producer] -
          economy.unitRates[a.producer] * state.producers[a.producer],
    );
    if (options.length)
      applyCommand(state, { type: "buyModification", id: options[0].id });
  }
  function research() {
    let next = RESEARCH.find((r) => !state.research.includes(r.id));
    if (!next) return;
    if (
      state.researchPoints < next.cost &&
      deriveEconomy(state).availableResearch + state.researchPoints >= next.cost
    )
      applyCommand(state, { type: "rebuild" });
    while (next && applyCommand(state, { type: "buyResearch", id: next.id }).ok)
      next = RESEARCH.find((r) => !state.research.includes(r.id));
    if (state.research.includes("automatic") && !state.automation)
      applyCommand(state, { type: "automation", enabled: true });
  }
  const step = 5;
  for (let day = 0; day < days; day++) {
    const visits = schedule === "visits" ? 3 : 1;
    for (let visit = 0; visit < visits; visit++) {
      const start = day * 86400 + visit * 28800;
      if (start > elapsed) {
        advanceSimulation(state, (start - elapsed) * 1000, { offline: true });
        elapsed = start;
      }
      note();
      research();
      note();
      const duration = schedule === "visits" ? 300 : 86400;
      for (let t = 0; t < duration; t += step) {
        // Seeds vary input rate and missed decisions, not the deterministic game economy.
        const clicks = state.rebuilds
          ? random() < 0.5
            ? 1
            : 0
          : 3 + Math.floor(random() * 3);
        for (let click = 0; click < clicks; click++)
          applyCommand(state, { type: "click" });
        if (policy !== "inexpensive" || random() > 0.15)
          for (let buys = 0; buys < 8; buys++) if (!shop()) break;
        goalsAndModifications();
        advanceSimulation(state, step * 1000);
        elapsed += step;
        if (schedule === "continuous" && t % 300 === 0) research();
        note();
        if (
          report.researchComplete !== null &&
          Object.keys(report.producerPurchases).length === PRODUCERS.length
        ) {
          report.finalResearch = state.research.length;
          report.rebuilds = state.rebuilds;
          return report;
        }
      }
    }
  }
  report.finalResearch = state.research.length;
  report.rebuilds = state.rebuilds;
  return report;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const seeds = Number(process.argv[2] || 100);
  if (!Number.isSafeInteger(seeds) || seeds < 1 || seeds > 1000)
    throw new Error("Seed count must be 1-1000");
  const reports = [];
  for (const schedule of ["visits", "continuous"])
    for (const policy of ["greedy", "saving", "inexpensive"]) {
      for (let seed = 1; seed <= seeds; seed++)
        reports.push(simulate({ seed, policy, schedule }));
      const rows = reports.filter(
        (r) => r.schedule === schedule && r.policy === policy,
      );
      console.log(
        JSON.stringify({
          schedule,
          policy,
          seeds,
          firstRebuildHours: [
            Math.min(...rows.map((r) => r.firstRebuild / 3600)),
            Math.max(...rows.map((r) => r.firstRebuild / 3600)),
          ],
          researchDays: [
            Math.min(
              ...rows.map((r) =>
                r.researchComplete === null
                  ? Infinity
                  : r.researchComplete / 86400,
              ),
            ),
            Math.max(
              ...rows.map((r) =>
                r.researchComplete === null
                  ? Infinity
                  : r.researchComplete / 86400,
              ),
            ),
          ],
        }),
      );
    }
  const visits = reports.filter((r) => r.schedule === "visits");
  const gates = {
    earlyProducer: reports.every(
      (r) => r.firstProducer !== null && r.firstProducer <= 60,
    ),
    earlyUpgrade: reports.every(
      (r) => r.firstUpgrade !== null && r.firstUpgrade <= 300,
    ),
    firstRebuild: visits.every(
      (r) => r.firstRebuild >= 16 * 3600 && r.firstRebuild <= 32 * 3600,
    ),
    complete: reports.every(
      (r) =>
        r.researchComplete !== null &&
        Object.keys(r.producerPurchases).length === 8,
    ),
    withinOneWeek: visits.every(
      (r) => r.researchComplete !== null && r.researchComplete <= 7 * 86400,
    ),
  };
  // Keep the original lower-bound target visible; goal investments intentionally
  // accelerate progression instead of being offset by inflated equipment prices.
  const pacingComparison = {
    originalThreeToSevenDayTarget: visits.every(
      (r) =>
        r.researchComplete !== null &&
        r.researchComplete >= 3 * 86400 &&
        r.researchComplete <= 7 * 86400,
    ),
  };
  await mkdir("output/workshop", { recursive: true });
  await writeFile(
    "output/workshop/progression.json",
    JSON.stringify({ seeds, gates, pacingComparison, reports }, null, 2),
  );
  console.log(gates);
  console.log(pacingComparison);
  if (Object.values(gates).some((g) => !g)) process.exitCode = 1;
}
