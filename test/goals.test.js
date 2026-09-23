import test from "node:test";
import assert from "node:assert/strict";
import {
  createFreshState,
  applyCommand,
  advanceSimulation,
  deriveEconomy,
  producerCost,
  reconcile,
} from "../src/core.js";
import { activeGoals, goalValue, modificationSpending } from "../src/goals.js";
import {
  GOALS,
  GOAL_MILESTONES,
  MODIFICATIONS,
  MODIFICATION_COSTS,
  SAVE_KEY,
  BALANCE,
} from "../src/content.js";
import {
  parseSave,
  exportSave,
  createSaveStore,
  RECOVERY_KEY,
} from "../src/persistence.js";

function start() {
  const s = createFreshState(0);
  applyCommand(s, { type: "click", count: 1000 });
  applyCommand(s, { type: "buyProducer", id: "tray" });
  return s;
}
function claimReady(s) {
  let ready;
  while ((ready = activeGoals(s).find((g) => g && goalValue(s, g) >= g.target)))
    assert.ok(applyCommand(s, { type: "claimGoal", id: ready.id }).ok);
}
test("three goal tracks claim only completed active goals, exactly once", () => {
  const s = start();
  assert.equal(activeGoals(s).length, 3);
  const before = structuredClone(s);
  for (const id of ["invalid", "production-1", "output-0"])
    assert.equal(applyCommand(s, { type: "claimGoal", id }).ok, false);
  assert.deepEqual(s, before);
  assert.ok(
    applyCommand(s, { type: "claimGoal", id: "milestone-production-1" }).ok,
  );
  assert.equal(s.upgradeParts, 15);
  assert.equal(
    applyCommand(s, { type: "claimGoal", id: "milestone-production-1" }).ok,
    false,
  );
  assert.equal(activeGoals(s)[0].id, "milestone-production-3");
});

test("v3 partial claims reduce a grouped reward without loss or duplicate Parts", () => {
  const s = start();
  s.claimedGoals = ["production-0"];
  s.upgradeParts = 5;
  const raw = JSON.parse(exportSave(s));
  raw.version = 3;
  const loaded = parseSave(JSON.stringify(raw), 0);
  assert.deepEqual(loaded.claimedGoals, s.claimedGoals);
  const goal = activeGoals(loaded)[0];
  assert.equal(goal.target, 1000);
  assert.equal(goal.reward, 10);
  assert.ok(applyCommand(loaded, { type: "claimGoal", id: goal.id }).ok);
  assert.equal(loaded.upgradeParts, 15);
  assert.equal(new Set(loaded.claimedGoals).size, loaded.claimedGoals.length);
  assert.equal(
    applyCommand(loaded, { type: "claimGoal", id: goal.id }).ok,
    false,
  );
  assert.deepEqual(parseSave(exportSave(loaded), 0), loaded);
});
test("claimed Parts buy an equipment-specific permanent improvement", () => {
  const s = start();
  claimReady(s);
  const before = deriveEconomy(s),
    parts = s.upgradeParts;
  assert.equal(
    applyCommand(s, { type: "buyModification", id: "rack" }).ok,
    false,
  );
  assert.ok(applyCommand(s, { type: "buyModification", id: "tray" }).ok);
  assert.equal(s.upgradeParts, parts - 5);
  assert.equal(deriveEconomy(s).unitRates.tray, before.unitRates.tray * 1.1);
  assert.equal(deriveEconomy(s).unitRates.rack, before.unitRates.rack);
  assert.equal(deriveEconomy(s).clickPower, 1);
  assert.deepEqual(parseSave(exportSave(s), s.lastSimulatedAt), s);
});
test("goals and Parts survive rebuilding without duplicate rewards or lost ownership records", () => {
  const s = start();
  claimReady(s);
  applyCommand(s, { type: "buyModification", id: "tray" });
  s.lifetimeObsidian = s.runObsidian = BALANCE.researchThreshold;
  const claimed = [...s.claimedGoals],
    parts = s.upgradeParts;
  assert.ok(applyCommand(s, { type: "rebuild" }).ok);
  assert.equal(s.producers.tray, 0);
  assert.equal(s.bestOwned.tray, 1);
  assert.equal(s.modifications.tray, 1);
  assert.equal(s.upgradeParts, parts);
  assert.deepEqual(s.claimedGoals, claimed);
  for (const id of claimed)
    assert.equal(applyCommand(s, { type: "claimGoal", id }).ok, false);
  assert.equal(applyCommand(s, { type: "rebuild" }).ok, false);
  assert.deepEqual(parseSave(exportSave(s), s.lastSimulatedAt), s);
});
test("offline goals and modified production agree with live partitions", () => {
  const a = start();
  claimReady(a);
  applyCommand(a, { type: "buyModification", id: "tray" });
  const b = structuredClone(a);
  advanceSimulation(a, 3600000, { offline: true });
  for (let i = 0; i < 60; i++) advanceSimulation(b, 60000);
  assert.ok(Math.abs(a.lifetimeObsidian - b.lifetimeObsidian) < 1e-8);
  assert.deepEqual(activeGoals(a), activeGoals(b));
  assert.equal(a.upgradeParts, b.upgradeParts);
  assert.equal(a.upgradeParts, 10); // Offline completion never claims automatically.
});
test("modification effects are bounded and rewards can fund the complete catalog", () => {
  assert.equal(GOAL_MILESTONES.length, 36);
  const s = start();
  s.lifetimeObsidian = s.runObsidian = s.obsidian = 1e25;
  for (const p of Object.keys(s.producers)) s.producers[p] = 200;
  s.bestRate = 1e11;
  reconcile(s);
  claimReady(s);
  assert.equal(s.claimedGoals.length, GOALS.length);
  assert.ok(
    s.upgradeParts >=
      MODIFICATIONS.length * MODIFICATION_COSTS.reduce((a, b) => a + b),
  );
  const plain = structuredClone(s);
  for (const m of MODIFICATIONS) {
    for (let i = 0; i < 5; i++)
      assert.ok(applyCommand(s, { type: "buyModification", id: m.id }).ok);
    assert.equal(
      applyCommand(s, { type: "buyModification", id: m.id }).ok,
      false,
    );
  }
  assert.equal(modificationSpending(s), 960);
  assert.ok(
    Math.abs(producerCost(s, "pump") / producerCost(plain, "pump") - 0.85) <
      1e-8,
  );
  const boosted = deriveEconomy(s),
    original = deriveEconomy(plain);
  assert.ok(
    Math.abs(
      boosted.unitRates.tray / original.unitRates.tray -
        (1.5 * boosted.supportMultiplier) / original.supportMultiplier,
    ) < 1e-10,
  );
  assert.deepEqual(parseSave(exportSave(s), s.lastSimulatedAt), s);
});
test("v1 migrates additively and the original is retained in recovery", () => {
  const s = start();
  const raw = JSON.parse(exportSave(s));
  raw.version = 1;
  for (const key of [
    "upgradeParts",
    "claimedGoals",
    "modifications",
    "bestOwned",
  ])
    delete raw.data[key];
  const original = JSON.stringify(raw),
    map = new Map([[SAVE_KEY, original]]);
  const store = createSaveStore(
    { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) },
    () => 0,
  );
  const migrated = store.load();
  assert.equal(migrated.error, null);
  assert.equal(migrated.state.bestOwned.tray, 1);
  assert.equal(migrated.state.obsidian, s.obsidian);
  assert.equal(migrated.state.upgradeParts, 0);
  assert.ok(store.save(migrated.state).ok);
  assert.equal(map.get(RECOVERY_KEY), original);
  assert.ok(store.save(migrated.state).ok);
  assert.equal(map.get(RECOVERY_KEY), original);
});
test("malformed reward ledgers, over-level modifications and injected goal ids are rejected", () => {
  const base = start();
  claimReady(base);
  const mutations = [
    (s) => s.upgradeParts++,
    (s) => s.claimedGoals.push(s.claimedGoals[0]),
    (s) => s.claimedGoals.push("<img src=x onerror=alert(1)>"),
    (s) => (s.modifications.tray = 6),
    (s) => (s.bestOwned.tray = -1),
    (s) => (s.claimedGoals = ["production-2"]),
  ];
  for (const mutate of mutations) {
    const s = structuredClone(base);
    mutate(s);
    assert.throws(() => parseSave(exportSave(s)));
  }
});
