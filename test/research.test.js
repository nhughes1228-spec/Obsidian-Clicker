import test from "node:test";
import assert from "node:assert/strict";
import { BALANCE, RESEARCH, SAVE_KEY } from "../src/content.js";
import { createFreshState, applyCommand, deriveEconomy, producerCost, advanceSimulation, reconcile, purchasePreview } from "../src/core.js";
import { researchBenefits } from "../src/research.js";
import { exportSave, parseSave, createSaveStore, RECOVERY_KEY } from "../src/persistence.js";

const near = (a, b) => assert.ok(Math.abs(a - b) <= Math.max(1e-8, Math.abs(b) * 1e-10), `${a} != ${b}`);
function account(points) {
  const s = createFreshState(0);
  s.obsidian = s.lifetimeObsidian = s.runObsidian = BALANCE.researchThreshold * points ** 2;
  assert.ok(applyCommand(s, { type: "rebuild" }).ok);
  return s;
}
function fullyResearched() {
  const s = account(RESEARCH.reduce((sum, r) => sum + r.cost, 0));
  for (const r of RESEARCH) assert.ok(applyCommand(s, { type: "buyResearch", id: r.id }).ok, r.id);
  return s;
}

test("knowledge rewards earned RP, not potential RP, and spending never removes it", () => {
  const s = createFreshState(0);
  s.lifetimeObsidian = s.runObsidian = BALANCE.researchThreshold * 100 ** 2;
  assert.equal(deriveEconomy(s).knowledgeBonus, 0);
  applyCommand(s, { type: "rebuild" });
  s.producers.tray = 1;
  const before = deriveEconomy(s);
  near(before.knowledgeBonus, 0.1);
  near(before.passiveRate, 0.33);
  applyCommand(s, { type: "buyResearch", id: "casting" });
  assert.equal(s.researchPoints, 99);
  near(deriveEconomy(s).knowledgeBonus, 0.1);
  near(deriveEconomy(s).passiveRate, before.passiveRate);
  s.lifetimeObsidian = BALANCE.researchThreshold * 121 ** 2;
  applyCommand(s, { type: "rebuild" });
  near(deriveEconomy(s).knowledgeBonus, 0.11);
  assert.equal(applyCommand(s, { type: "rebuild" }).ok, false);
  assert.equal(s.researchAwarded, 121);
});

test("all 58 permanent purchases have unique IDs, enforce order and spend exactly once", () => {
  assert.equal(RESEARCH.length, 58);
  assert.equal(new Set(RESEARCH.map((r) => r.id)).size, 58);
  const s = account(10000);
  for (const r of RESEARCH.filter((r) => r.requires)) {
    const before = structuredClone(s);
    assert.equal(applyCommand(s, { type: "buyResearch", id: r.id }).ok, false);
    assert.deepEqual(s, before);
  }
  const full = fullyResearched();
  assert.equal(full.researchPoints, 0);
  assert.equal(full.research.length, 58);
  for (const r of RESEARCH) assert.equal(applyCommand(full, { type: "buyResearch", id: r.id }).ok, false);
  assert.deepEqual(parseSave(exportSave(full, 0), 0), full);
});

test("research lines add within a category, multiply once, and leave support unchanged", () => {
  const s = fullyResearched();
  s.producers.tray = 25;
  s.producers.forge = 10;
  s.upgrades = ["tool-0", "tool-1", "tool-2", "tool-3", "tool-4"];
  const e = deriveEconomy(s), b = researchBenefits(s);
  near(b.output, 0.5);
  near(b.click, 0.5);
  near(b.discount, 0.08);
  near(b.producers.tray, 1);
  near(e.supportMultiplier, 1.02);
  const multiplier = 1.02 * 1.25 * 1.5 * (1 + e.knowledgeBonus) * 1.5;
  near(e.passiveRate, (0.3 * 25 + 400000 * 10) * 2 * multiplier);
  near(e.clickPower, (e.clickBase + e.passiveRate * 0.1) * 3);
  const plain = structuredClone(s);
  plain.research = [];
  near(producerCost(s, "forge") / producerCost(plain, "forge"), 0.9 * 0.92);
  assert.ok(Number.isFinite(deriveEconomy({ ...s, researchAwarded: Number.MAX_SAFE_INTEGER }).passiveRate));
});

test("research previews match purchases without spending or reducing knowledge", () => {
  const s = account(1000);
  s.producers.tray = 100;
  s.upgrades = ["tool-0"];
  for (const id of ["equipment", "research-tray-0", "casting", "casting-practice-0", "workshop-output-0", "purchasing", "procurement-0"]) {
    const snapshot = structuredClone(s), before = deriveEconomy(s);
    const command = { type: "buyResearch", id };
    const preview = purchasePreview(s, command);
    assert.deepEqual(s, snapshot);
    assert.ok(preview.valid);
    assert.equal(preview.currency, "research");
    assert.ok(applyCommand(s, command).ok);
    near(deriveEconomy(s).passiveRate - before.passiveRate, preview.passiveGain);
    near(deriveEconomy(s).clickPower - before.clickPower, preview.clickGain);
    assert.equal(s.researchPoints, snapshot.researchPoints - preview.cost);
    assert.equal(deriveEconomy(s).knowledgeBonus, before.knowledgeBonus);
  }
});

test("starter research supplies equipment only at rebuild and never accumulates between resets", () => {
  const s = fullyResearched();
  assert.equal(s.producers.tray, 0);
  for (let i = 0; i < 2; i++) {
    s.lifetimeObsidian = BALANCE.researchThreshold * (s.researchAwarded + 1) ** 2;
    assert.ok(applyCommand(s, { type: "rebuild" }).ok);
    assert.equal(s.producers.tray, 60);
    assert.equal(s.producers.rack, 10);
    assert.ok(s.unlockedProducers.includes("rack"));
    assert.equal(s.research.length, 58);
  }
});

test("expanded research remains offline/live equivalent with automatic purchasing", () => {
  const a = fullyResearched();
  a.producers.tray = 60;
  a.producers.rack = 10;
  a.automation = true;
  reconcile(a);
  const b = structuredClone(a);
  advanceSimulation(a, 60000, { offline: true });
  for (let i = 0; i < 60; i++) advanceSimulation(b, 1000);
  assert.ok(Math.abs(a.obsidian - b.obsidian) < 1e-5);
  near(a.lifetimeObsidian, b.lifetimeObsidian);
  assert.deepEqual(a.producers, b.producers);
});

test("v5 research migrates without repricing, reset or loss and impossible tiers reject", () => {
  const s = account(32);
  for (const r of RESEARCH.slice(0, 6)) applyCommand(s, { type: "buyResearch", id: r.id });
  const envelope = JSON.parse(exportSave(s, 0));
  envelope.version = 5;
  const raw = JSON.stringify(envelope), map = new Map([[SAVE_KEY, raw]]);
  const store = createSaveStore({ getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) }, () => 0);
  const result = store.load();
  assert.equal(result.error, null);
  assert.deepEqual(result.state, s);
  assert.ok(store.save(result.state).ok);
  assert.equal(map.get(RECOVERY_KEY), raw);
  assert.equal(JSON.parse(map.get(SAVE_KEY)).version, 6);
  const full = fullyResearched();
  full.research = full.research.filter((id) => id !== "casting-practice-0");
  full.researchPoints += RESEARCH.find((r) => r.id === "casting-practice-0").cost;
  assert.throws(() => parseSave(exportSave(full, 0), 0), /prerequisites/);
});
