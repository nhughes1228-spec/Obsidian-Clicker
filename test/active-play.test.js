import assert from "node:assert/strict";
import test from "node:test";

import {
  claimWindRift,
  getAttunement,
  getMomentumMultiplier,
  registerActiveClick,
  setAttunement,
  updateActivePlay,
} from "../src/active-play.js";
import { createFreshState, createRiftState, getClickPower, getOfflineProgress, getPassiveRate, sanitizeState } from "../src/economy.js";

test("deliberate clicks build Momentum faster than rapid taps", () => {
  const deliberate = createFreshState();
  registerActiveClick(deliberate, 1000, () => 1);
  registerActiveClick(deliberate, 1400, () => 1);

  const rapid = createFreshState();
  registerActiveClick(rapid, 1000, () => 1);
  registerActiveClick(rapid, 1050, () => 1);
  assert.ok(deliberate.momentum > rapid.momentum);
  assert.ok(getMomentumMultiplier(deliberate) > 1);
});

test("critical gust chance produces a fivefold click result", () => {
  const state = createFreshState();
  const click = registerActiveClick(state, 1000, () => 0);
  assert.equal(click.critical, true);
  assert.equal(click.multiplier, 5);
  assert.equal(state.criticalGusts, 1);
});

test("Momentum waits through grace, then decays deterministically", () => {
  const state = createFreshState();
  state.momentum = 50;
  state.momentumGraceSeconds = 1;
  updateActivePlay(state, 0.5, () => 1);
  assert.equal(state.momentum, 50);
  updateActivePlay(state, 1, () => 1);
  assert.equal(state.momentum, 46);
});

test("Wind Rifts spawn, expire, and grant each reward type", () => {
  const state = createFreshState();
  state.nextWindRiftIn = 0;
  assert.deepEqual(updateActivePlay(state, 0.1, () => 0), ["riftSpawned"]);
  assert.equal(state.activeWindRift.type, "clickSurge");
  const clickReward = claimWindRift(state, 10);
  assert.equal(clickReward.type, "clickSurge");
  assert.equal(state.clickSurgeSeconds, 20);

  state.activeWindRift = { type: "productionSurge", seconds: 5 };
  claimWindRift(state, 10);
  assert.equal(state.productionSurgeSeconds, 30);

  state.activeWindRift = { type: "bounty", seconds: 5 };
  assert.equal(claimWindRift(state, 10).bounty, 600);
  assert.equal(state.windRiftsClaimed, 3);
});

test("Attunements trade click and passive production and apply at Rift", () => {
  const balanced = createFreshState();
  balanced.generatorCounts.whisperer = 10;
  const balancedRate = getPassiveRate(balanced);
  const balancedClick = getClickPower(balanced);

  const active = { ...balanced, attunement: "active" };
  assert.ok(getClickPower(active) > balancedClick);
  assert.ok(getPassiveRate(active) < balancedRate);

  const idle = { ...balanced, attunement: "idle" };
  assert.ok(getClickPower(idle) < balancedClick);
  assert.ok(getPassiveRate(idle) > balancedRate);

  setAttunement(balanced, "active");
  const next = createRiftState(balanced, 1);
  assert.equal(next.attunement, "active");
  assert.equal(getAttunement(next).id, "active");
});

test("temporary production surges never inflate offline rewards", () => {
  const state = createFreshState();
  state.generatorCounts.whisperer = 10;
  const ordinaryRate = getPassiveRate(state);
  state.productionSurgeSeconds = 30;
  assert.equal(getPassiveRate(state), ordinaryRate * 2);
  assert.equal(getOfflineProgress(state, 60).gain, ordinaryRate * 60);
});

test("active settings sanitize and survive malformed save input", () => {
  const state = sanitizeState({
    momentum: 500,
    attunement: "unknown",
    settings: { reducedMotion: true, sound: false, music: "yes", haptics: false },
  });
  assert.equal(state.momentum, 100);
  assert.equal(state.attunement, "balanced");
  assert.deepEqual(state.settings, { reducedMotion: true, sound: false, music: false, haptics: false });
});
