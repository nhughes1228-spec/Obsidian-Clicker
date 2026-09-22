import { GENERATORS, UPGRADES, RIFTWORK, OFFLINE_CAP_SECONDS, ACCLAIM_MILESTONES } from "./content.js";
import { createFreshState, createRiftState, deriveModifiers, getPassiveRate, getClickPower, getAvailableEchoes, getAffordableGeneratorAmount, getGeneratorBatchCost, isUpgradeUnlocked, getOfflineProgress, getGeneratorContribution } from "./economy.js";
import { registerActiveClick, claimWindRift, updateActivePlay, setAttunement } from "./active-play.js";
import { canBuyGenerator, startChallenge, abandonChallenge, setProjectAllocation, getCurrentWorkStage, getProjectEfficiency, investInWork, discoverGenerator, reconcileLongTerm } from "./long-term.js";
import { reconcileObjectives } from "./identity.js";
import { togglePendingAspect, unlockAspect } from "./rift-strategy.js";
import { getGeneratorPurchasePreview, getUpgradePurchasePreview } from "./progression.js";
import { getVisibleGenerators, getVisibleUpgrades } from "./economy.js";
import { awardMastery, reconcileChapters, EXTENDED_WORKS, getExpeditionContracts, EXPEDITION_TYPES, MASTERY_RANK_SECONDS } from "./expansion.js";

const purchaseCache = new WeakMap();

/** @typedef {{now?: number, random?: () => number, offline?: boolean}} SimulationContext */

export function deriveEconomy(state) {
  const modifiers = deriveModifiers(state);
  return { modifiers, passiveRate: getPassiveRate(state, modifiers), clickPower: getClickPower(state, modifiers), availableEchoes: getAvailableEchoes(state) };
}

export function gainShards(state, gross, spent = 0) {
  if (!Number.isFinite(gross) || gross < 0 || !Number.isFinite(spent) || spent < 0 || spent > gross) throw new RangeError("Invalid production amount");
  for (const [key, amount] of [["shards", gross - spent], ["runShards", gross], ["lifetimeShards", gross]]) {
    state[key] = Math.min(Number.MAX_VALUE, state[key] + amount);
  }
}

function reconcile(state, now) {
  reconcileLongTerm(state, now);
  reconcileObjectives(state, getPassiveRate(state));
  if (!state.expeditionMode) reconcileChapters(state);
}

/** The only progression command entrypoint; failed commands leave gameplay unchanged. */
export function applyCommand(state, command, context = {}) {
  const now = context.now ?? state.lastSimulatedAt ?? Date.now();
  const random = context.random ?? Math.random;
  let result = {};
  switch (command.type) {
    case "click": {
      if (state.lastActiveClickAt > 0 && now - state.lastActiveClickAt < 250) return { ok: false };
      if (!Number.isFinite(getClickPower(state))) return { ok: false };
      const click = registerActiveClick(state, now, random);
      const amount = Math.min(Number.MAX_VALUE, getClickPower(state) * click.multiplier);
      if (!Number.isFinite(amount)) return { ok: false };
      state.totalClicks += 1;
      gainShards(state, amount);
      result = { ...click, amount };
      break;
    }
    case "buyGenerator": {
      const generator = GENERATORS.find((item) => item.id === command.id);
      if (!generator || !canBuyGenerator(state, generator.id)) return { ok: false };
      const amount = command.amount === "max" ? getAffordableGeneratorAmount(state, generator) : Number(command.amount ?? 1);
      const cost = getGeneratorBatchCost(state, generator, amount);
      if (!Number.isFinite(cost) || cost > state.shards) return { ok: false };
      state.shards -= cost;
      state.generatorCounts[generator.id] += amount;
      discoverGenerator(state, generator);
      result = { amount, cost };
      break;
    }
    case "buyUpgrade": {
      const upgrade = UPGRADES.find((item) => item.id === command.id);
      if (!upgrade || state.purchasedUpgrades.includes(upgrade.id) || !isUpgradeUnlocked(state, upgrade) || upgrade.cost > state.shards) return { ok: false };
      state.shards -= upgrade.cost;
      state.purchasedUpgrades.push(upgrade.id);
      if (!state.rememberedUpgrades.includes(upgrade.id)) state.rememberedUpgrades.push(upgrade.id);
      break;
    }
    case "buyRiftwork": {
      const upgrade = RIFTWORK.find((item) => item.id === command.id);
      if (!upgrade || state.purchasedRiftwork.includes(upgrade.id) || upgrade.cost > state.echoes) return { ok: false };
      state.echoes -= upgrade.cost;
      state.purchasedRiftwork.push(upgrade.id);
      break;
    }
    case "rift": {
      const echoes = getAvailableEchoes(state);
      if (!echoes || state.activeChallenge) return { ok: false };
      Object.assign(state, createRiftState(state, echoes, now));
      result = { echoes };
      break;
    }
    case "claimWindRift": {
      const reward = claimWindRift(state, getPassiveRate(state), random);
      if (!reward) return { ok: false };
      gainShards(state, reward.bounty);
      result = reward;
      break;
    }
    case "startChallenge": if (!startChallenge(state, command.id, now)) return { ok: false }; break;
    case "abandonChallenge": if (!abandonChallenge(state)) return { ok: false }; break;
    case "allocation": setProjectAllocation(state, command.value); break;
    case "attunement": setAttunement(state, command.id); break;
    case "unlockAspect": if (!unlockAspect(state, command.id)) return { ok: false }; break;
    case "toggleAspect": if (!togglePendingAspect(state, command.id)) return { ok: false }; break;
    case "automation": {
      const key = command.key;
      const requirement = { generators: 1, upgrades: 2, work: 3, reserve: 1, target: 1 }[key];
      if (!requirement || state.riftEntries < requirement) return { ok: false };
      if (["generators", "upgrades", "work"].includes(key)) state.automation[key] = Boolean(command.value);
      else if (key === "reserve" && Number.isFinite(command.value) && command.value >= 0) state.automation.reserve = command.value;
      else if (key === "target" && (command.value === "efficient" || GENERATORS.some((item) => item.id === command.value))) state.automation.target = command.value;
      else return { ok: false };
      break;
    }
    case "specialization": {
      if (!GENERATORS.some((item) => item.id === command.id) || !["focus", "chorus"].includes(command.value) || state.riftEntries < 1) return { ok: false };
      state.mastery[command.id].pending = command.value;
      break;
    }
    case "buildWork": {
      const work = EXTENDED_WORKS.find((item) => item.id === command.id);
      if (!work || state.riftEntries < 1) return { ok: false };
      const stage = work.stages[state.extendedWorks[work.id]];
      if (!stage || state.shards < stage.cost || state[work.resource] < stage.material) return { ok: false };
      state.shards -= stage.cost;
      state[work.resource] -= stage.material;
      state.extendedWorks[work.id] += 1;
      state.permanentLore.push(`${work.name}: ${stage.name}`);
      break;
    }
    case "expeditionStart": {
      if (state.riftEntries < 2 || state.activeExpedition) return { ok: false };
      const contract = getExpeditionContracts(state).find((item) => item.key === command.key);
      if (!contract) return { ok: false };
      const crew = createFreshState();
      crew.expeditionMode = true;
      crew.lastSimulatedAt = now;
      crew.runStartedAt = new Date(now).toISOString();
      crew.activeChallenge = contract.id;
      crew.mastery = structuredClone(state.mastery);
      crew.attunement = state.attunement;
      crew.pendingAttunement = state.attunement;
      crew.unlockedAspects = [...state.unlockedAspects];
      crew.activeAspects = [...state.activeAspects];
      crew.pendingAspects = [...state.activeAspects];
      crew.generatorCounts.whisperer = 1;
      crew.riftEntries = 3;
      crew.automation.generators = true;
      crew.automation.upgrades = true;
      crew.rememberedUpgrades = UPGRADES.map((item) => item.id);
      state.activeExpedition = { type: contract.id, tier: contract.tier, seconds: 0, state: crew };
      break;
    }
    case "expeditionAbandon": if (!state.activeExpedition) return { ok: false }; state.activeExpedition = null; state.expeditionSerial += 1; break;
    case "expeditionRefresh": if (state.activeExpedition) return { ok: false }; state.expeditionSerial += 1; break;
    case "pinObjective": if (command.id !== null && !["rift", "work", "mastery", "expeditions"].includes(command.id)) return { ok: false }; state.pinnedObjective = command.id; break;
    default: return { ok: false };
  }
  reconcile(state, now);
  if (!context.automated) state.automationCountdown = Math.min(15, state.automationCountdown);
  return { ok: true, ...result };
}

/** Advance one elapsed interval. The caller must not replay an already credited interval. */
export function advanceSimulation(state, elapsedMs, context = {}) {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new RangeError("Elapsed time must be finite and nonnegative");
  const offline = Boolean(context.offline);
  const elapsedSeconds = elapsedMs / 1000;
  const creditedSeconds = offline ? Math.min(elapsedSeconds, OFFLINE_CAP_SECONDS) : elapsedSeconds;
  if (!offline && elapsedSeconds > OFFLINE_CAP_SECONDS) throw new RangeError("Use offline advancement for long absences");
  const report = { elapsedSeconds, creditedSeconds, gain: 0, grossGain: 0, projectBase: 0, rate: getPassiveRate(state, undefined, !offline), events: [] };
  if (!elapsedMs) return report;
  const start = state.lastSimulatedAt || context.now || 0;
  let remaining = creditedSeconds;
  while (remaining > 1e-8) {
    const rate = offline ? getOfflineProgress(state, 1).grossGain : getPassiveRate(state);
    if (!Number.isFinite(rate)) throw new RangeError("Production exceeds the supported numeric range");
    const stage = getCurrentWorkStage(state);
    if (!stage) state.projectAllocation = 0;
    const allocation = state.projectAllocation;
    const toStage = stage && allocation > 0 && rate > 0
      ? Math.max(1e-8, (stage.target - state.projectProgress) / (rate * allocation * getProjectEfficiency(state))) : Infinity;
    const timers = offline ? [] : [state.productionSurgeSeconds, state.clickSurgeSeconds, state.momentumGraceSeconds, state.activeWindRift?.seconds ?? state.nextWindRiftIn].filter((seconds) => seconds > 1e-8);
    const milestones = ACCLAIM_MILESTONES.filter((item) => item.type === "lifetimeShards" && !state.achievementDates[item.id] && item.amount > state.lifetimeShards);
    const nextAchievement = rate > 0 ? Math.min(...milestones.map((item) => (item.amount - state.lifetimeShards) / rate)) : Infinity;
    const modifiers = deriveModifiers(state);
    const weights = GENERATORS.map((generator) => state.generatorCounts[generator.id] * generator.baseRate * modifiers.generatorMultipliers[generator.id]);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const contributions = Object.fromEntries(GENERATORS.map((generator, index) => [generator.id, totalWeight ? rate * weights[index] / totalWeight : 0]));
    const nextMastery = !state.expeditionMode && state.riftEntries >= 1 ? Math.min(...GENERATORS.map((generator) => {
      const mastery = state.mastery[generator.id];
      const speed = Math.min(1, contributions[generator.id] / (generator.baseRate * 1000)) * (1 + state.extendedWorks.mastery * 0.1);
      return mastery.rank < 5 && speed > 0 ? Math.max(1e-8, (MASTERY_RANK_SECONDS[mastery.rank] - mastery.progress) / speed) : Infinity;
    })) : Infinity;
    const automated = state.riftEntries >= 1 && (state.automation.generators || state.automation.upgrades || state.automation.work);
    const seconds = Math.min(remaining, offline && !state.activeExpedition ? 600 : 60, toStage, Math.max(1e-8, nextAchievement), nextMastery, ...timers, automated ? Math.max(1e-8, state.automationCountdown) : Infinity);
    const gross = Math.min(Number.MAX_VALUE, rate * seconds);
    const spent = investInWork(state, gross * allocation);
    gainShards(state, gross, Math.min(gross, spent));
    if (!state.expeditionMode && state.riftEntries >= 1) {
      awardMastery(state, seconds, contributions);
      advanceExpedition(state, seconds * 1000, context);
    }
    report.grossGain += gross;
    report.projectBase += spent;
    report.gain += gross - spent;
    state.bestPassiveRate = Math.max(state.bestPassiveRate, getPassiveRate(state, undefined, false));
    state.peakRunPassiveRate = Math.max(state.peakRunPassiveRate, rate);
    remaining = Math.max(0, remaining - seconds);
    state.lastSimulatedAt = start + (creditedSeconds - remaining) * 1000;
    if (!offline) report.events.push(...updateActivePlay(state, seconds, context.random ?? Math.random));
    if (automated) {
      state.automationCountdown -= seconds;
      if (state.automationCountdown <= 1e-7) state.automationCountdown = runAutomation(state, offline);
    }
    reconcile(state, state.lastSimulatedAt);
  }
  if (offline) {
    state.momentum = 0;
    state.momentumGraceSeconds = 0;
    state.lastActiveClickAt = 0;
    state.clickSurgeSeconds = Math.max(0, state.clickSurgeSeconds - elapsedSeconds);
    state.productionSurgeSeconds = Math.max(0, state.productionSurgeSeconds - elapsedSeconds);
    state.activeWindRift = null;
    state.nextWindRiftIn = 35;
    state.lastOfflineSeconds = elapsedSeconds;
    state.lastOfflineCreditedSeconds = creditedSeconds;
    state.lastOfflineShards = report.gain;
  }
  state.lastSimulatedAt = start + elapsedMs;
  return report;
}

export function advanceTo(state, now, context = {}) {
  if (!Number.isFinite(now) || now < 0) throw new RangeError("Invalid clock");
  if (!state.lastSimulatedAt) { state.lastSimulatedAt = now; return null; }
  return advanceSimulation(state, Math.max(0, now - state.lastSimulatedAt), context);
}

export function getPurchaseOptions(state, clicksPerSecond = 0) {
  const visibleUpgrades = getVisibleUpgrades(state);
  const signature = JSON.stringify([state.generatorCounts, state.purchasedUpgrades, visibleUpgrades.map((item) => item.id),
    state.purchasedRiftwork, state.resonance, state.achievementDates, state.completedWorkStages, state.completedChallenges,
    state.activeChallenge, state.activeAspects, state.attunement, state.momentum, state.clickSurgeSeconds > 0,
    state.productionSurgeSeconds > 0, state.runShards < 1e6, state.mastery && Object.values(state.mastery).map((item) => [item.rank, item.specialization]), state.expeditionRewards]);
  let cache = purchaseCache.get(state);
  if (!cache) { cache = new Map(); purchaseCache.set(state, cache); }
  const prior = cache.get(clicksPerSecond);
  if (prior?.signature === signature) return [...prior.options];
  const options = [];
  for (const generator of getVisibleGenerators(state)) {
    const preview = getGeneratorPurchasePreview(state, generator, 1);
    if (preview.rateGain > 0 && Number.isFinite(preview.cost)) options.push({ type: "buyGenerator", id: generator.id, cost: preview.cost, score: preview.cost / preview.rateGain });
  }
  for (const upgrade of visibleUpgrades) {
    const preview = getUpgradePurchasePreview(state, upgrade);
    const gain = preview.afterRate - preview.beforeRate + clicksPerSecond * (preview.afterClick - preview.beforeClick);
    if (gain > 0) options.push({ type: "buyUpgrade", id: upgrade.id, cost: upgrade.cost, score: upgrade.cost / gain });
  }
  options.sort((a, b) => a.score - b.score);
  cache.set(clicksPerSecond, { signature, options });
  return [...options];
}

function runAutomation(state, offline = false) {
  if (state.automation.work && state.riftEntries >= 3) setProjectAllocation(state, 0.25);
  for (let count = 0; count < 10; count++) {
    const options = getPurchaseOptions(state, 1 / 60).filter((item) => (item.type === "buyGenerator"
        ? state.automation.generators && (state.automation.target === "efficient" || item.id === state.automation.target)
        : state.riftEntries >= 2 && state.automation.upgrades && state.rememberedUpgrades.includes(item.id)));
    const option = options.find((item) => item.cost <= state.shards - state.automation.reserve);
    if (!option) {
      const rate = (offline ? getOfflineProgress(state, 1).grossGain : getPassiveRate(state, undefined, false)) * (1 - state.projectAllocation);
      const wait = rate > 0 ? Math.min(...options.map((item) => (item.cost + state.automation.reserve - state.shards) / rate)) : 3600;
      return Math.max(15, Math.min(3600, Math.ceil(wait / 15) * 15));
    }
    if (!applyCommand(state, option, { automated: true }).ok) break;
  }
  return 15;
}

function advanceExpedition(state, elapsedMs, context) {
  const expedition = state.activeExpedition;
  if (!expedition) return;
  advanceSimulation(expedition.state, elapsedMs, context);
  expedition.seconds += elapsedMs / 1000;
  const type = EXPEDITION_TYPES.find((item) => item.id === expedition.type);
  const target = type.target * Math.pow(1.25, expedition.tier);
  if (expedition.state.runShards < target) return;
  const previous = state.expeditionRecords[type.id];
  if (!previous || expedition.tier > previous.tier || (expedition.tier === previous.tier && expedition.seconds < previous.seconds)) state.expeditionRecords[type.id] = { tier: expedition.tier, seconds: expedition.seconds };
  state.expeditionsCompleted += 1;
  state.expeditionMaterials += Math.min(10, 1 + Math.floor(expedition.tier / 3));
  state.expeditionRewards[type.id] = Math.min(10, (state.expeditionRewards[type.id] || 0) + 1);
  gainShards(state, Math.min(Number.MAX_VALUE, getPassiveRate(state, undefined, false) * 60 * (1 + state.extendedWorks.expedition * 0.05)));
  state.expeditionSerial += 1;
  state.activeExpedition = null;
}
