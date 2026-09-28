import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { Worker, isMainThread, parentPort } from "node:worker_threads";
import {
  createFreshState,
  applyCommand,
  advanceSimulation,
  deriveEconomy,
  purchasePreview,
  producerCost,
  upgradeUnlocked,
} from "../src/core.js";
import {
  PRODUCERS,
  UPGRADES,
  IMPROVEMENTS,
  RESEARCH,
  MODIFICATIONS,
} from "../src/content.js";
import { activeGoals, goalValue } from "../src/goals.js";
import { researchUnlocked } from "../src/research.js";

function rng(seed) {
  return () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
}
const income = (e, cps) => e.passiveRate + cps * e.clickPower;

export function shoppingOptions(state, cps, { bundles = true } = {}) {
  const before = deriveEconomy(state),
    options = [];
  const add = (command) => {
    const preview = purchasePreview(state, command, before);
    if (!preview.valid) return;
    const gain = preview.passiveGain + cps * preview.clickGain;
    options.push({
      command,
      cost: preview.cost,
      gain,
      score: preview.cost / Math.max(gain, 1e-12),
      unlock:
        command.type === "buyProducer" && state.bestOwned[command.id] === 0,
    });
  };
  for (const p of PRODUCERS)
    if (state.unlockedProducers.includes(p.id)) {
      add({ type: "buyProducer", id: p.id });
      add({ type: "buyProducer", id: p.id, amount: 10 });
      if (!bundles) continue;
      const u = IMPROVEMENTS.filter(
        (u) =>
          u.producer === p.id &&
          !state.upgrades.includes(u.id) &&
          u.owned > state.producers[p.id],
      ).sort((a, b) => a.owned - b.owned)[0];
      if (!u) continue;
      const amount = u.owned - state.producers[p.id];
      const copy = {
        ...state,
        producers: { ...state.producers, [p.id]: u.owned },
        upgrades: [...state.upgrades, u.id],
      };
      const cost = producerCost(state, p.id, amount) + u.cost;
      const gain = income(deriveEconomy(copy), cps) - income(before, cps);
      options.push({
        command: { type: "buyProducer", id: p.id, amount },
        upgrade: u.id,
        cost,
        gain,
        score: cost / Math.max(1e-12, gain),
        unlock: state.bestOwned[p.id] === 0,
      });
    }
  for (const u of UPGRADES)
    if (!state.upgrades.includes(u.id) && upgradeUnlocked(state, u))
      add({ type: "buyUpgrade", id: u.id });
  return options.filter((o) => Number.isFinite(o.cost) && o.gain > 0);
}

// A sequence of affordable purchases can be meaningful even if none of its
// individual steps reaches 5%. This conservative search is not a global solver.
export function hasMeaningfulOpportunity(state, cps) {
  const baseline = income(deriveEconomy(state), cps),
    copy = structuredClone(state);
  for (let i = 0; i < 64; i++) {
    const options = shoppingOptions(copy, cps).filter(
      (o) => o.cost <= copy.obsidian,
    );
    if (
      options.some(
        (o) =>
          o.unlock ||
          o.gain + income(deriveEconomy(copy), cps) >= baseline * 1.05,
      )
    )
      return true;
    const pick = options.sort((a, b) => a.score - b.score)[0];
    if (!pick) return false;
    if (!applyCommand(copy, pick.command).ok) return false;
    if (pick.upgrade)
      applyCommand(copy, { type: "buyUpgrade", id: pick.upgrade });
  }
  return false;
}

export function simulate({
  seed = 1,
  policy = "greedy",
  cps = 5,
  schedule = "visits",
  days = 21,
  automation = false,
  rebuildFraction = 0.25,
} = {}) {
  const state = createFreshState(0),
    random = rng(seed);
  const report = {
    seed,
    policy,
    cps,
    schedule,
    rebuildFraction,
    firstProducer: null,
    firstUpgrade: null,
    firstRebuild: null,
    researchComplete: null,
    complete: null,
    producerPurchases: {},
    producerUnlocks: {},
    milestonePurchases: {},
    goalClaims: {},
    rebuilds: [],
    sessions: [],
    longestEarlyMeaningfulGap: 0,
    longestLateMeaningfulGap: 0,
    longestAffordabilityWait: 0,
    activeSeconds: 0,
    elapsedSeconds: 0,
    clicks: 0,
    manualIncome: 0,
    passiveIncome: 0,
    offlineIncome: 0,
    completed: false,
  };
  let elapsed = 0,
    active = 0,
    clickRemainder = 0,
    session = 0,
    rebuildRecovery = null;
  const stamp = () => ({ elapsed, active, session });
  function note() {
    for (const id of state.unlockedProducers)
      report.producerUnlocks[id] ??= stamp();
    for (const p of PRODUCERS)
      if (state.producers[p.id] > 0) report.producerPurchases[p.id] ??= stamp();
    if (Object.keys(report.producerPurchases).length)
      report.firstProducer ??= stamp();
    if (state.upgrades.length) report.firstUpgrade ??= stamp();
    for (const id of state.upgrades) report.milestonePurchases[id] ??= stamp();
    if (state.research.length === RESEARCH.length)
      report.researchComplete ??= stamp();
    if (
      rebuildRecovery &&
      deriveEconomy(state).passiveRate >= rebuildRecovery.rate
    ) {
      rebuildRecovery.recovered = stamp();
      rebuildRecovery = null;
    }
  }
  function rewards() {
    let goal;
    while (
      (goal = activeGoals(state).find(
        (g) => g && goalValue(state, g) >= g.target,
      ))
    ) {
      applyCommand(state, { type: "claimGoal", id: goal.id });
      report.goalClaims[goal.id] = stamp();
    }
    let bought = false;
    for (let i = 0; i < 40; i++) {
      const economy = deriveEconomy(state);
      const choices = MODIFICATIONS.map((m) => ({
        m,
        preview: purchasePreview(
          state,
          { type: "buyModification", id: m.id },
          economy,
        ),
      })).filter(
        (o) => o.preview.valid && o.preview.cost <= state.upgradeParts,
      );
      const score = (o) =>
        (o.preview.passiveGain +
          cps * o.preview.clickGain +
          (o.m.effect === "price"
            ? economy.unitRates[o.m.id] * state.producers[o.m.id] * o.m.perLevel
            : 0)) /
        o.preview.cost;
      choices.sort((a, b) =>
        policy === "inexpensive"
          ? a.preview.cost - b.preview.cost
          : score(b) - score(a),
      );
      if (!choices.length) break;
      bought =
        applyCommand(state, { type: "buyModification", id: choices[0].m.id })
          .ok || bought;
    }
    return bought;
  }
  function research() {
    // A strictly idle control cannot bootstrap after an early rebuild. Keep its
    // earning workshop intact instead of manufacturing free starter equipment.
    if (schedule === "idle") return false;
    const nextResearch = () => RESEARCH.filter((r) => !state.research.includes(r.id) && researchUnlocked(state, r))
      .sort((a, b) => a.cost - b.cost || a.id.localeCompare(b.id))[0];
    let next = nextResearch();
    let rebuilt = false;
    if (
      next &&
      (!rebuildRecovery || deriveEconomy(state).passiveRate >= rebuildRecovery.rate) &&
      state.researchPoints < next.cost &&
      // After the initial shop, bank a batch of RP rather than rebuild for every tier.
      (state.researchAwarded < 32 || deriveEconomy(state).availableResearch >= Math.ceil(state.researchAwarded * rebuildFraction)) &&
      deriveEconomy(state).availableResearch + state.researchPoints >= next.cost
    ) {
      const rate = deriveEconomy(state).passiveRate;
      if (applyCommand(state, { type: "rebuild" }).ok) {
        report.firstRebuild ??= stamp();
        rebuildRecovery = { ...stamp(), rate, recovered: null };
        report.rebuilds.push(rebuildRecovery);
        rebuilt = true;
      }
    }
    while (next && applyCommand(state, { type: "buyResearch", id: next.id }).ok)
      next = nextResearch();
    if (automation && state.research.includes("automatic") && !state.automation)
      applyCommand(state, { type: "automation", enabled: true });
    return rebuilt;
  }
  if (schedule === "idle") {
    // The idle control performs only these legal bootstrap clicks, then shops on visits.
    applyCommand(state, { type: "click", count: 15 });
    applyCommand(state, { type: "buyProducer", id: "tray" });
  }
  const maxSessions = schedule === "continuous" ? 96 : days * 3;
  for (session = 1; session <= maxSessions; session++) {
    const start = schedule === "continuous" ? elapsed : (session - 1) * 28800;
    if (start > elapsed)
      report.offlineIncome += advanceSimulation(
        state,
        (start - elapsed) * 1000,
        { offline: true },
      ).earned;
    elapsed = start;
    let checkpoint = income(deriveEconomy(state), cps),
      lastMeaningful = 0,
      longestGap = 0;
    let lastOpportunity = 0,
      longestOpportunityGap = 0;
    const startActive = active,
      initialOwned = Object.keys(report.producerPurchases).length;
    const startManual = report.manualIncome,
      startPassive = report.passiveIncome;
    for (let t = 0; t < 900; t += 5) {
      const economy = deriveEconomy(state),
        beforeOwned = Object.keys(report.producerPurchases).length;
      const options = shoppingOptions(state, cps, {
        bundles: policy === "saving",
      });
      const meaningful = options.filter(
        (o) => o.unlock || o.gain >= income(economy, cps) * 0.05,
      );
      const earning = income(economy, cps);
      if (earning > 0 && meaningful.length)
        report.longestAffordabilityWait = Math.max(
          report.longestAffordabilityWait,
          Math.max(
            0,
            Math.min(...meaningful.map((o) => o.cost)) - state.obsidian,
          ) / earning,
        );
      const affordable = options.filter((o) => o.cost <= state.obsidian);
      let choices = policy === "saving" ? options : affordable;
      if (policy === "inexpensive") {
        // Prefer round-number batches and cheap visible upgrades, without an optimizer.
        const bulk = choices.filter(
          (o) => o.command.type === "buyUpgrade" || o.command.amount === 10,
        );
        if (bulk.length) choices = bulk;
      }
      choices.sort((a, b) =>
        policy === "inexpensive" ? a.cost - b.cost : a.score - b.score,
      );
      const pick = choices[0];
      let shoppingPause = 0;
      if (
        pick &&
        (policy !== "inexpensive" || random() > 0.15) &&
        pick.cost <= state.obsidian &&
        applyCommand(state, pick.command).ok
      ) {
        if (pick.upgrade)
          applyCommand(state, { type: "buyUpgrade", id: pick.upgrade });
        shoppingPause = 0.3 + random() * 0.7;
      }
      const modification = rewards(),
        rebuilt = research();
      note();
      const rateNow = income(deriveEconomy(state), cps);
      if (
        modification ||
        rebuilt ||
        Object.keys(report.producerPurchases).length > beforeOwned ||
        (rateNow > checkpoint && rateNow >= checkpoint * 1.05)
      ) {
        longestGap = Math.max(longestGap, t - lastMeaningful);
        lastMeaningful = t;
        checkpoint = rateNow;
      }
      if (lastMeaningful === t || hasMeaningfulOpportunity(state, cps)) {
        longestOpportunityGap = Math.max(
          longestOpportunityGap,
          t - lastOpportunity,
        );
        lastOpportunity = t;
      }
      if (
        Object.keys(report.producerPurchases).length === PRODUCERS.length &&
        state.research.length === RESEARCH.length &&
        Object.values(state.modifications).every((v) => v === 5)
      ) {
        report.complete = stamp();
        report.completed = true;
        break;
      }
      // Shopping removes clicks. Fractional rates carry across steps; batching is
      // exact because clicks cannot change click power in this edition.
      clickRemainder += schedule === "idle" ? 0 : cps * (5 - shoppingPause);
      const clicks = Math.floor(clickRemainder);
      clickRemainder -= clicks;
      if (clicks)
        report.manualIncome += applyCommand(state, {
          type: "click",
          count: clicks,
        }).amount;
      report.passiveIncome += advanceSimulation(state, 5000).earned;
      elapsed += 5;
      active += 5;
    }
    longestGap = Math.max(longestGap, active - startActive - lastMeaningful);
    longestOpportunityGap = Math.max(
      longestOpportunityGap,
      active - startActive - lastOpportunity,
    );
    const e = deriveEconomy(state);
    if (session <= 3)
      report.longestEarlyMeaningfulGap = Math.max(
        report.longestEarlyMeaningfulGap,
        longestOpportunityGap,
      );
    else
      report.longestLateMeaningfulGap = Math.max(
        report.longestLateMeaningfulGap,
        longestOpportunityGap,
      );
    report.sessions.push({
      session,
      ...stamp(),
      rate: e.passiveRate,
      clickPower: e.clickPower,
      clickIncome: report.manualIncome - startManual,
      passiveIncome: report.passiveIncome - startPassive,
      clickContribution:
        (report.manualIncome - startManual) /
        Math.max(
          1,
          report.manualIncome -
            startManual +
            report.passiveIncome -
            startPassive,
        ),
      activeMultiplier: e.passiveRate ? income(e, cps) / e.passiveRate : null,
      longestGap,
      longestOpportunityGap,
      newProducers: Object.keys(report.producerPurchases).length - initialOwned,
      support: e.supportByProducer,
      shares: Object.fromEntries(
        PRODUCERS.map((p) => [
          p.id,
          e.passiveRate
            ? (e.unitRates[p.id] * state.producers[p.id]) / e.passiveRate
            : 0,
        ]),
      ),
      owned: { ...state.producers },
      modifications: { ...state.modifications },
      parts: state.upgradeParts,
      researchOwned: state.research.length,
      researchPoints: state.researchPoints,
      researchAwarded: state.researchAwarded,
      claims: state.claimedGoals.length,
    });
    if (report.completed) break;
  }
  report.activeSeconds = active;
  report.elapsedSeconds = elapsed;
  report.clicks = state.clicks;
  return report;
}

export function evaluateGates(reports) {
  const visits = reports.filter((r) => r.schedule === "visits");
  return {
    hasActiveRuns: visits.length > 0,
    firstRebuild: visits.every(
      (r) =>
        r.firstRebuild &&
        r.firstRebuild.session >= 2 &&
        r.firstRebuild.session <= 3,
    ),
    fullArc: visits.every(
      (r) =>
        r.complete &&
        r.complete.elapsed >= 7 * 86400 &&
        r.complete.elapsed <= 14 * 86400,
    ),
    earlyOpportunities: visits.every((r) => r.longestEarlyMeaningfulGap <= 120),
    lateOpportunities: visits.every((r) => r.longestLateMeaningfulGap <= 300),
    completion: visits.every((r) => r.completed),
  };
}

export function summarize(reports) {
  const range = (values) => {
    const valid = values.filter(Number.isFinite);
    return valid.length
      ? { min: Math.min(...valid), max: Math.max(...valid) }
      : null;
  };
  const groups = [];
  for (const cps of [5, 7.5, 10])
    for (const policy of ["greedy", "saving", "inexpensive"]) {
      const runs = reports.filter(
        (r) => r.schedule === "visits" && r.cps === cps && r.policy === policy,
      );
      if (!runs.length) continue;
      groups.push({
        cps,
        policy,
        runs: runs.length,
        completed: runs.filter((r) => r.completed).length,
        firstPurchaseActiveSeconds: range(
          runs.map((r) => r.firstProducer?.active),
        ),
        firstUpgradeActiveSeconds: range(
          runs.map((r) => r.firstUpgrade?.active),
        ),
        firstRebuildSession: range(runs.map((r) => r.firstRebuild?.session)),
        completionDays: range(runs.map((r) => r.complete?.elapsed / 86400)),
        completionActiveMinutes: range(
          runs.map((r) => r.complete?.active / 60),
        ),
        researchDays: range(
          runs.map((r) => r.researchComplete?.elapsed / 86400),
        ),
        earlyOpportunityGap: range(
          runs.map((r) => r.longestEarlyMeaningfulGap),
        ),
        lateOpportunityGap: range(runs.map((r) => r.longestLateMeaningfulGap)),
        firstVisitClickFraction: range(
          runs.map((r) => r.sessions[0].clickContribution),
        ),
        rebuildRecoveryActiveSeconds: range(
          runs.flatMap((r) =>
            r.rebuilds.map((b) =>
              b.recovered ? b.recovered.active - b.active : null,
            ),
          ),
        ),
        producerUnlockHours: Object.fromEntries(
          PRODUCERS.map((p) => [
            p.id,
            range(runs.map((r) => r.producerUnlocks[p.id]?.elapsed / 3600)),
          ]),
        ),
        producerPurchaseHours: Object.fromEntries(
          PRODUCERS.map((p) => [
            p.id,
            range(runs.map((r) => r.producerPurchases[p.id]?.elapsed / 3600)),
          ]),
        ),
      });
    }
  return { gates: evaluateGates(reports), groups };
}

if (!isMainThread) {
  parentPort.on("message", (config) =>
    parentPort.postMessage(simulate(config)),
  );
} else if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const seeds = Number(process.argv[2] || 1);
  if (!Number.isSafeInteger(seeds) || seeds < 1 || seeds > 1000)
    throw Error("Seeds must be 1-1000");
  const jobs = [];
  for (const cps of [5, 7.5, 10])
    for (const policy of ["greedy", "saving", "inexpensive"])
      for (let seed = 1; seed <= seeds; seed++)
        jobs.push({ cps, policy, seed });
  if (!process.argv.includes("--no-controls"))
    for (const policy of ["greedy", "saving", "inexpensive"]) {
      jobs.push({ cps: 0, policy, seed: 1, schedule: "idle" });
      for (const cps of [5, 7.5, 10])
        jobs.push({ cps, policy, seed: 1, schedule: "continuous" });
    }
  const reports = [],
    total = jobs.length;
  await Promise.all(
    Array.from(
      { length: Math.min(4, total) },
      () =>
        new Promise((resolve, reject) => {
          const worker = new Worker(new URL(import.meta.url));
          worker.on("error", reject);
          const next = () => {
            const job = jobs.shift();
            if (job) worker.postMessage(job);
            else worker.terminate().then(resolve);
          };
          worker.on("message", (r) => {
            reports.push(r);
            if (reports.length % 25 === 0 || total < 25)
              console.log(
                JSON.stringify({
                  done: reports.length,
                  total,
                  cps: r.cps,
                  policy: r.policy,
                  schedule: r.schedule,
                  first: r.firstRebuild?.session,
                  days: r.complete?.elapsed / 86400,
                  earlyGap: r.longestEarlyMeaningfulGap,
                  lateGap: r.longestLateMeaningfulGap,
                  levels: Object.values(r.sessions.at(-1).modifications).reduce(
                    (a, b) => a + b,
                    0,
                  ),
                }),
              );
            next();
          });
          next();
        }),
    ),
  );
  reports.sort(
    (a, b) =>
      a.schedule.localeCompare(b.schedule) ||
      a.cps - b.cps ||
      a.policy.localeCompare(b.policy) ||
      a.seed - b.seed,
  );
  const gates = evaluateGates(reports);
  await mkdir("output/workshop", { recursive: true });
  await writeFile(
    `output/workshop/active-progression-${seeds}.json`,
    JSON.stringify({ seeds, gates, reports }, null, 2),
  );
  await writeFile(
    `output/workshop/active-summary-${seeds}.json`,
    JSON.stringify(summarize(reports), null, 2),
  );
  console.log(gates);
  if (Object.values(gates).some((v) => !v)) process.exitCode = 1;
}
