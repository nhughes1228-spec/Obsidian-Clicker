import test from "node:test";
import assert from "node:assert/strict";
import {
  createFreshState,
  applyCommand,
  advanceSimulation,
  advanceTo,
  deriveEconomy,
  producerCost,
  affordableAmount,
  reconcile,
  upgradeUnlocked,
} from "../src/core.js";
import {
  PRODUCERS,
  UPGRADES,
  RESEARCH,
  BALANCE,
  SAVE_KEY,
  EDITION,
} from "../src/content.js";
import {
  createSaveStore,
  exportSave,
  parseSave,
  BACKUP_KEY,
  RECOVERY_KEY,
} from "../src/persistence.js";
import { importSave as classicImport } from "../classic/src/persistence.js";

function funded(amount = 1e8) {
  const s = createFreshState(0);
  s.obsidian = s.lifetimeObsidian = s.runObsidian = amount;
  reconcile(s);
  return s;
}
function memory() {
  const map = new Map();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
  };
}
function near(a, b) {
  assert.ok(
    Math.abs(a - b) < Math.max(1e-6, Math.abs(a) * 1e-9),
    `${a} != ${b}`,
  );
}

test("catalog has only the agreed production and research systems", () => {
  assert.equal(PRODUCERS.length, 8);
  assert.equal(UPGRADES.length, 61);
  assert.equal(RESEARCH.length, 6);
  const s = createFreshState(0);
  for (const key of [
    "momentum",
    "echoes",
    "resonance",
    "mastery",
    "activeChallenge",
    "activeExpedition",
    "acclaim",
    "attunement",
    "project",
    "criticalGusts",
  ])
    assert.equal(key in s, false);
});
test("all clicks award the displayed economy amount without timing or randomness", () => {
  const s = createFreshState(0);
  for (let i = 0; i < 100; i++) {
    const before = s.obsidian,
      amount = deriveEconomy(s).clickPower;
    applyCommand(s, { type: "click" });
    near(s.obsidian - before, amount);
  }
  assert.equal(s.obsidian, 100);
  assert.equal(s.clicks, 100);
});
test("purchases deduct batch costs, scale prices and add independent output", () => {
  const s = funded(),
    before = s.obsidian,
    cost = producerCost(s, "tray", 10);
  assert.ok(
    applyCommand(s, { type: "buyProducer", id: "tray", amount: 10 }).ok,
  );
  assert.equal(s.obsidian, before - cost);
  assert.equal(s.producers.tray, 10);
  near(deriveEconomy(s).passiveRate, 3);
  assert.ok(producerCost(s, "tray") > 15);
  applyCommand(s, { type: "buyProducer", id: "furnace" });
  assert.equal(s.producers.tray, 10);
  near(deriveEconomy(s).passiveRate, 191);
});
test("invalid purchases do not mutate state and Max is affordable", () => {
  const s = funded(1000),
    original = structuredClone(s);
  for (const amount of [0, -1, 0.1, NaN, Infinity, 10001])
    assert.equal(
      applyCommand(s, { type: "buyProducer", id: "tray", amount }).ok,
      false,
    );
  assert.deepEqual(s, original);
  const max = affordableAmount(s, "tray");
  applyCommand(s, { type: "buyProducer", id: "tray", amount: "max" });
  assert.equal(s.producers.tray, max);
  assert.ok(s.obsidian < producerCost(s, "tray"));
});
test("ordinary improvements enforce ownership and double only their producer", () => {
  const s = funded();
  assert.equal(applyCommand(s, { type: "buyUpgrade", id: "tray-0" }).ok, false);
  applyCommand(s, { type: "buyProducer", id: "tray", amount: 10 });
  applyCommand(s, { type: "buyProducer", id: "rack" });
  applyCommand(s, { type: "buyUpgrade", id: "tray-0" });
  near(deriveEconomy(s).passiveRate, 9);
  assert.equal(applyCommand(s, { type: "buyUpgrade", id: "tray-0" }).ok, false);
  assert.equal(
    upgradeUnlocked(
      s,
      UPGRADES.find((u) => u.id === "tray-1"),
    ),
    false,
  );
});
test("casting tools enforce sequence and report base plus passive share", () => {
  const s = funded(1e10);
  s.producers.furnace = 10;
  assert.equal(applyCommand(s, { type: "buyUpgrade", id: "tool-2" }).ok, false);
  for (let i = 0; i < 5; i++)
    assert.ok(applyCommand(s, { type: "buyUpgrade", id: `tool-${i}` }).ok);
  const e = deriveEconomy(s);
  near(e.clickPower, e.clickBase + e.passiveRate * 0.1);
});
test("rebuild awards gross lifetime points once and preserves permanent progress", () => {
  const s = funded(BALANCE.researchThreshold * 16);
  s.producers.furnace = 10;
  s.upgrades = ["tool-0"];
  s.settings.music = true;
  reconcile(s);
  const objectives = [...s.completedObjectives];
  assert.ok(applyCommand(s, { type: "rebuild" }).ok);
  assert.equal(s.researchPoints, 4);
  assert.equal(s.obsidian, 0);
  assert.equal(s.producers.furnace, 0);
  assert.deepEqual(s.upgrades, []);
  assert.equal(applyCommand(s, { type: "rebuild" }).ok, false);
  assert.ok(applyCommand(s, { type: "buyResearch", id: "casting" }).ok);
  assert.equal(s.researchPoints, 3);
  assert.equal(deriveEconomy(s).availableResearch, 0);
  assert.equal(deriveEconomy(s).clickPower, 2);
  assert.equal(s.settings.music, true);
  assert.deepEqual(s.completedObjectives, objectives);
});
test("all research bonuses, starter kit and automatic toggle match the catalog", () => {
  const s = funded(BALANCE.researchThreshold * 1024);
  applyCommand(s, { type: "rebuild" });
  for (const r of RESEARCH)
    assert.ok(applyCommand(s, { type: "buyResearch", id: r.id }).ok);
  assert.equal(s.researchPoints, 0);
  assert.equal(s.automation, false);
  s.lifetimeObsidian = BALANCE.researchThreshold * 1089;
  applyCommand(s, { type: "rebuild" });
  assert.equal(s.producers.tray, 10);
  near(deriveEconomy(s).passiveRate, 5.625);
  near(deriveEconomy(s).clickPower, 2);
  const plain = structuredClone(s);
  plain.research = [];
  assert.ok(producerCost(s, "rack") < producerCost(plain, "rack"));
  assert.ok(applyCommand(s, { type: "automation", enabled: true }).ok);
});
test("automation chooses shortest affordable payback, never upgrades or rebuilds", () => {
  const s = funded(100);
  s.research = ["automatic"];
  s.automation = true;
  advanceSimulation(s, 1);
  assert.equal(s.producers.rack, 1);
  assert.equal(s.producers.tray, 0);
  assert.deepEqual(s.upgrades, []);
  assert.equal(s.rebuilds, 0);
});
test("offline and live partitions conserve production with automation and unlock boundaries", () => {
  const initial = funded(25);
  initial.producers.tray = 10;
  initial.research = ["automatic"];
  initial.automation = true;
  const a = structuredClone(initial),
    b = structuredClone(initial);
  advanceSimulation(a, 3600000, { offline: true });
  for (let i = 0; i < 360; i++) advanceSimulation(b, 10000);
  near(a.obsidian, b.obsidian);
  near(a.lifetimeObsidian, b.lifetimeObsidian);
  assert.deepEqual(a.producers, b.producers);
});
test("time is credited once, capped at 24h offline, with zero a no-op", () => {
  const s = createFreshState(1000);
  s.producers.tray = 10;
  const snapshot = structuredClone(s);
  advanceSimulation(s, 0);
  assert.deepEqual(s, snapshot);
  for (const ms of [-1, NaN, Infinity, Number.MAX_VALUE])
    assert.throws(() => advanceSimulation(s, ms), RangeError);
  assert.throws(() => advanceSimulation(s, 86400001), RangeError);
  const report = advanceTo(s, 1000 + 48 * 3600000, { offline: true });
  assert.equal(report.creditedSeconds, 86400);
  near(s.obsidian, 259200);
  advanceTo(s, 1000 + 48 * 3600000, { offline: true });
  near(s.obsidian, 259200);
});
test("numeric limit stays explicit and finite", () => {
  const s = funded(BALANCE.maxNumber);
  applyCommand(s, { type: "click" });
  assert.ok(Number.isFinite(s.obsidian));
  assert.ok(Number.isSafeInteger(deriveEconomy(s).availableResearch));
  s.producers.tray = 10000;
  assert.equal(producerCost(s, "tray"), Infinity);
});
test("Workshop saves round-trip and neither edition accepts the other's saves", () => {
  const s = funded();
  assert.deepEqual(parseSave(exportSave(s), 0), s);
  assert.throws(
    () =>
      parseSave(
        JSON.stringify({
          version: 7,
          data: { shards: 1, generatorCounts: {} },
        }),
      ),
    /Classic/,
  );
  assert.throws(() => classicImport(exportSave(s)));
  assert.throws(
    () => parseSave(JSON.stringify({ edition: EDITION, version: 99, data: s })),
    /Unsupported/,
  );
  assert.throws(() => parseSave("{}"));
  assert.throws(() => parseSave("x".repeat(200001)));
});
test("invalid fields reject, imported strings cannot enter the state", () => {
  const s = funded();
  s.producers.tray = 0.5;
  assert.throws(() => parseSave(exportSave(s)));
  s.producers.tray = 0;
  s.researchPoints = 99;
  assert.throws(() => parseSave(exportSave(s)));
  s.researchPoints = 0;
  s.upgrades = ['<img src=x onerror="alert(1)">'];
  s.settings.sound = "true";
  const clean = parseSave(exportSave(s));
  assert.deepEqual(clean.upgrades, []);
  assert.equal(clean.settings.sound, true);
});
test("corrupt and future saves are protected against automatic replacement", () => {
  for (const raw of [
    "broken",
    JSON.stringify({ edition: EDITION, version: 99 }),
  ]) {
    const storage = memory();
    storage.setItem(SAVE_KEY, raw);
    const store = createSaveStore(storage, () => 1000),
      loaded = store.load();
    assert.ok(loaded.error);
    assert.equal(store.save(loaded.state).ok, false);
    assert.equal(storage.getItem(SAVE_KEY), raw);
  }
});
test("backup recovery needs explicit confirmation and preserves the original", () => {
  const storage = memory();
  storage.setItem(SAVE_KEY, "broken");
  storage.setItem(BACKUP_KEY, exportSave(funded(100)));
  const store = createSaveStore(storage),
    loaded = store.load();
  assert.equal(loaded.recovered, true);
  assert.equal(loaded.state.obsidian, 100);
  assert.equal(store.save(loaded.state).ok, false);
  assert.ok(store.replace(loaded.state).ok);
  assert.equal(storage.getItem(RECOVERY_KEY), "broken");
});
test("blocked storage and failed writes leave timestamps and Classic untouched", () => {
  const storage = memory();
  storage.setItem("obsidian-clicker-save-v1", "classic-data");
  const store = createSaveStore(storage, () => 1000),
    s = createFreshState(0);
  assert.ok(store.save(s).ok);
  assert.equal(s.lastSavedAt, 1000);
  storage.setItem = () => {
    throw new Error("quota");
  };
  assert.equal(store.save(s).ok, false);
  assert.equal(s.lastSavedAt, 1000);
  assert.equal(storage.getItem("obsidian-clicker-save-v1"), "classic-data");
  const blocked = createSaveStore({
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  });
  assert.ok(blocked.load().error);
  assert.equal(blocked.save(createFreshState()).ok, false);
});
