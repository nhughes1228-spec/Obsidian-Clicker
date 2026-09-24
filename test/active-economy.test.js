import test from "node:test";
import assert from "node:assert/strict";
import {
  createFreshState,
  deriveEconomy,
  applyCommand,
  purchasePreview,
  purchasingOptions,
  advanceSimulation,
  reconcile,
  producerCost,
  affordableAmount,
} from "../src/core.js";
import {
  PRODUCERS,
  TOOLS,
  GOALS,
  LEGACY_GOAL_IDS,
  SAVE_KEY,
  BALANCE,
  IMPROVEMENTS,
  GOAL_MILESTONES,
  equipmentCostUnits,
} from "../src/content.js";
import {
  exportSave,
  parseSave,
  createSaveStore,
  RECOVERY_KEY,
} from "../src/persistence.js";
import { activeGoals } from "../src/goals.js";
import {
  evaluateGates,
  hasMeaningfulOpportunity,
  simulate,
} from "../tools/simulate-workshop.mjs";

const near = (a, b) =>
  assert.ok(
    Math.abs(a - b) <= Math.max(1e-8, Math.abs(b) * 1e-10),
    `${a} != ${b}`,
  );

test("bulk prices are continuous, discounted, finite and consistent across batches", () => {
  const s = createFreshState(0);
  for (const owned of [0, 49, 50, 51, 100, 200, 1000]) {
    for (const amount of [1, 10, 75]) {
      const expected = Array.from({ length: amount }, (_, i) =>
        BALANCE.costGrowth ** Math.min(owned + i, BALANCE.bulkThreshold) *
        BALANCE.bulkGrowth ** Math.max(0, owned + i - BALANCE.bulkThreshold),
      ).reduce((a, b) => a + b, 0);
      near(equipmentCostUnits(owned, amount), expected);
      s.producers.tray = owned;
      near(producerCost(s, "tray", amount), Math.ceil(15 * expected - 1e-8));
      assert.ok(producerCost(s, "tray", amount) <= Math.ceil(
        15 * BALANCE.costGrowth ** owned *
        (BALANCE.costGrowth ** amount - 1) / (BALANCE.costGrowth - 1),
      ));
    }
  }
  s.producers.tray = 49;
  const cost = producerCost(s, "tray", 10);
  s.obsidian = cost;
  assert.equal(affordableAmount(s, "tray"), 10);
  s.obsidian--;
  assert.equal(affordableAmount(s, "tray"), 9);
  s.research = ["purchasing"];
  assert.equal(producerCost(s, "tray", 10), Math.ceil(15 * 0.9 * equipmentCostUnits(49, 10) - 1e-8));
  s.producers.tray = BALANCE.maxOwned;
  assert.equal(producerCost(s, "tray"), Infinity);
  assert.equal(affordableAmount(s, "tray"), 0);
});

test("late improvements strengthen early equipment and previews use their actual multipliers", () => {
  for (const u of IMPROVEMENTS) {
    const s = funded();
    s.producers[u.producer] = u.owned;
    const before = deriveEconomy(s);
    const command = { type: "buyUpgrade", id: u.id };
    const preview = purchasePreview(s, command);
    assert.ok(applyCommand(s, command).ok);
    near(deriveEconomy(s).passiveRate, before.passiveRate * u.multiplier);
    near(preview.passiveGain, before.passiveRate * (u.multiplier - 1));
    assert.ok(u.multiplier >= 2);
  }
});

test("equipment goals follow the shared bulk-price curve without changing rewards", () => {
  const goals = GOAL_MILESTONES.filter((g) => g.lane === "equipment");
  const costs = goals.map((g) => PRODUCERS.find((p) => p.id === g.producer).cost * equipmentCostUnits(0, g.target));
  assert.deepEqual(costs, [...costs].sort((a, b) => a - b));
  assert.equal(GOALS.reduce((n, g) => n + g.reward, 0), 1220);
  assert.equal(GOAL_MILESTONES.length, 36);
});

test("fresh active strategies retain useful rebuilds and frequent purchase opportunities", () => {
  for (const policy of ["greedy", "saving", "inexpensive"]) {
    const r = simulate({ policy, cps: 7.5, seed: 75 });
    assert.ok(r.completed, policy);
    assert.equal(r.firstRebuild.session, 2, policy);
    assert.ok(r.longestEarlyMeaningfulGap <= 120, policy);
    assert.ok(r.longestLateMeaningfulGap <= 300, policy);
  }
});

test("v4 rebalance migration preserves the entire account and retains the original recovery copy", () => {
  const s = funded();
  s.producers.tray = 200;
  s.upgrades = ["tray-4", "tray-m150", "tool-0"];
  s.research = ["casting"];
  s.researchAwarded = 1;
  s.rebuilds = 1;
  reconcile(s);
  while (activeGoals(s).some((g) => g && g.lane === "equipment" && g.producer === "tray")) {
    const goal = activeGoals(s).find((g) => g?.lane === "equipment");
    if (!applyCommand(s, { type: "claimGoal", id: goal.id }).ok) break;
  }
  const goal = activeGoals(s)[0];
  applyCommand(s, { type: "claimGoal", id: goal.id });
  applyCommand(s, { type: "buyModification", id: "tray" });
  const envelope = JSON.parse(exportSave(s, 0));
  envelope.version = 4;
  const original = JSON.stringify(envelope);
  const map = new Map([[SAVE_KEY, original]]);
  const store = createSaveStore({ getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) }, () => 0);
  const loaded = store.load();
  assert.equal(loaded.error, null);
  assert.deepEqual(loaded.state, s);
  assert.ok(store.save(loaded.state).ok);
  assert.equal(map.get(RECOVERY_KEY), original);
  assert.deepEqual(parseSave(map.get(SAVE_KEY), 0), loaded.state);
});
function funded() {
  const s = createFreshState(0);
  s.obsidian = s.lifetimeObsidian = s.runObsidian = 1e15;
  reconcile(s);
  return s;
}

test("support adds across six producers, caps at 200, and never recurses", () => {
  const s = funded();
  for (const p of PRODUCERS) s.producers[p.id] = 200;
  const e = deriveEconomy(s);
  near(e.supportMultiplier, 1.96);
  near(e.supportByProducer.tray, 0.16);
  assert.equal(e.supportByProducer.well, 0);
  assert.equal(e.supportByProducer.forge, 0);
  near(e.passiveRate, PRODUCERS.reduce((n, p) => n + p.rate * 200, 0) * 1.96);
  s.producers.tray = 1000;
  near(deriveEconomy(s).supportMultiplier, 1.96);
  s.modifications.tray = 5;
  near(deriveEconomy(s).supportMultiplier, 2.04);
  near(deriveEconomy(s).unitRates.tray, PRODUCERS[0].rate * 1.5 * 2.04);
});

test("pure previews match purchases across support thresholds and milestones", () => {
  for (const amount of [1, 10, "max"]) {
    const s = funded();
    s.producers.tray = 24;
    s.producers.forge = 5;
    s.upgrades = ["tool-0"];
    s.obsidian = 10000;
    const before = structuredClone(s),
      e = deriveEconomy(s);
    const command = { type: "buyProducer", id: "tray", amount };
    const preview = purchasePreview(s, command);
    assert.deepEqual(s, before);
    assert.ok(preview.valid);
    assert.ok(preview.supportGain > 0);
    assert.ok(applyCommand(s, command).ok);
    near(e.passiveRate + preview.passiveGain, deriveEconomy(s).passiveRate);
    near(e.clickPower + preview.clickGain, deriveEconomy(s).clickPower);
    near(before.obsidian - s.obsidian, preview.cost);
  }
  for (const owned of [75, 150]) {
    const s = funded();
    s.producers.tray = owned - 1;
    const command = { type: "buyUpgrade", id: `tray-m${owned}` };
    assert.equal(purchasePreview(s, command).valid, false);
    assert.equal(applyCommand(s, command).ok, false);
    s.producers.tray++;
    const e = deriveEconomy(s),
      preview = purchasePreview(s, command);
    assert.ok(applyCommand(s, command).ok);
    near(deriveEconomy(s).passiveRate, e.passiveRate + preview.passiveGain);
  }
});

test("modification previews include indirect support, preserve discounts, and rebuild resets only support", () => {
  const s = funded();
  s.producers.tray = 25;
  s.producers.pump = 1;
  s.producers.forge = 100;
  s.upgradeParts = 100;
  reconcile(s);
  for (const id of ["tray", "pump"]) {
    const before = deriveEconomy(s),
      command = { type: "buyModification", id };
    const preview = purchasePreview(s, command);
    assert.ok(applyCommand(s, command).ok);
    near(
      deriveEconomy(s).passiveRate,
      before.passiveRate + preview.passiveGain,
    );
    if (id === "tray") assert.ok(preview.supportGain > 0);
    else assert.ok(preview.producerPriceAfter > 0);
  }
  assert.ok(applyCommand(s, { type: "rebuild" }).ok);
  assert.equal(deriveEconomy(s).supportMultiplier, 1);
  assert.equal(s.modifications.tray, 1);
  assert.equal(s.modifications.pump, 1);
});

test("established clicks give 2x/3x total income at 5/10 cps; batched clicks are equivalent", () => {
  const s = funded();
  s.producers.forge = 100;
  s.upgrades = TOOLS.map((t) => t.id);
  s.research = ["casting"];
  const e = deriveEconomy(s);
  near(e.clickShare, 0.1);
  near(e.clickPower, (e.clickBase + 0.1 * e.passiveRate) * 2);
  assert.ok(Math.abs(1 + (5 * e.clickPower) / e.passiveRate - 2) < 0.001);
  assert.ok(Math.abs(1 + (10 * e.clickPower) / e.passiveRate - 3) < 0.001);
  const a = createFreshState(0),
    b = createFreshState(0);
  applyCommand(a, { type: "click", count: 100 });
  for (let i = 0; i < 100; i++) applyCommand(b, { type: "click" });
  assert.deepEqual(a, b);
  for (const count of [0, -1, 0.5, NaN, Infinity, 10001])
    assert.equal(applyCommand(a, { type: "click", count }).ok, false);
  assert.deepEqual(a, b);
});

test("automation ranks total support gains and remains partition independent", () => {
  const s = funded();
  s.producers.tray = 24;
  s.producers.forge = 100;
  s.research = ["automatic"];
  s.automation = true;
  const options = purchasingOptions(s).sort((a, b) => a.payback - b.payback);
  assert.equal(options[0].id, "tray");
  s.obsidian = options[0].cost;
  const a = structuredClone(s),
    b = structuredClone(s);
  advanceSimulation(a, 60000, { offline: true });
  for (let i = 0; i < 60; i++) advanceSimulation(b, 1000);
  near(a.obsidian, b.obsidian);
  near(a.lifetimeObsidian, b.lifetimeObsidian);
  assert.deepEqual(a.producers, b.producers);
});

test("v2 claims survive inserted goals with their ledger and raw recovery intact", () => {
  const s = funded();
  s.claimedGoals = ["production-0", "production-1"];
  s.upgradeParts = 13;
  const raw = JSON.parse(exportSave(s));
  raw.version = 2;
  const original = JSON.stringify(raw),
    map = new Map([[SAVE_KEY, original]]);
  const store = createSaveStore(
    { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) },
    () => 0,
  );
  const loaded = store.load();
  assert.equal(loaded.error, null);
  assert.deepEqual(loaded.state.claimedGoals, s.claimedGoals);
  assert.equal(loaded.state.upgradeParts, 13);
  assert.equal(activeGoals(loaded.state)[0].id, "milestone-production-1");
  assert.equal(activeGoals(loaded.state)[0].reward, 2);
  assert.equal(
    applyCommand(loaded.state, { type: "claimGoal", id: "production-1" }).ok,
    false,
  );
  assert.ok(
    applyCommand(loaded.state, {
      type: "claimGoal",
      id: "milestone-production-1",
    }).ok,
  );
  assert.ok(store.save(loaded.state).ok);
  assert.equal(map.get(RECOVERY_KEY), original);
  assert.deepEqual(parseSave(map.get(SAVE_KEY), 0), loaded.state);
  assert.equal(new Set(GOALS.map((g) => g.id)).size, GOALS.length);
  for (const id of LEGACY_GOAL_IDS) assert.ok(GOALS.some((g) => g.id === id));
});

test("economy gates reject a completed but stalled or too-short campaign", () => {
  const report = {
    schedule: "visits",
    firstRebuild: { session: 2 },
    complete: { elapsed: 8 * 86400 },
    longestEarlyMeaningfulGap: 120,
    longestLateMeaningfulGap: 300,
    completed: true,
  };
  assert.ok(Object.values(evaluateGates([report])).every(Boolean));
  assert.equal(
    evaluateGates([{ ...report, longestLateMeaningfulGap: 900 }])
      .lateOpportunities,
    false,
  );
  assert.equal(
    evaluateGates([{ ...report, complete: { elapsed: 4 * 86400 } }]).fullArc,
    false,
  );
});

test("meaningful opportunities include affordable sequences without mutating progress", () => {
  const s = funded();
  s.producers.tray = 10;
  s.producers.forge = 10;
  for (const p of PRODUCERS) s.bestOwned[p.id] = Math.max(1, s.producers[p.id]);
  s.obsidian = 0;
  assert.equal(hasMeaningfulOpportunity(s, 5), false);
  s.obsidian = 1e12;
  const before = structuredClone(s);
  assert.equal(hasMeaningfulOpportunity(s, 5), true);
  assert.deepEqual(s, before);
  assert.equal(evaluateGates([]).hasActiveRuns, false);
});
