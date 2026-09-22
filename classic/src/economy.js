import {
  ACCLAIM_MILESTONES,
  COST_GROWTH,
  GENERATORS,
  OFFLINE_CAP_SECONDS,
  RIFT_BASE_SHARDS,
  RIFTWORK,
  UPGRADES,
} from "./content.js";
import { createActiveState, getAttunement, getMomentumMultiplier, sanitizeActiveState } from "./active-play.js";
import { createRiftStrategyState, hasAspect, sanitizeRiftStrategyState } from "./rift-strategy.js";
import {
  canBuyGenerator,
  canClickForShards,
  createLongTermState,
  getAchievementProductionMultiplier,
  getChallengeClickMultiplier,
  getChallengeCostMultiplier,
  getChallengeOfflineMultiplier,
  getChallengeProductionMultiplier,
  getWorkOfflineMultiplier,
  getWorkProductionMultiplier,
  recordRiftDiscovery,
  reconcileLongTerm,
  sanitizeLongTermState,
} from "./long-term.js";
import { FIRST_RUN_OBJECTIVES, reconcileObjectives } from "./identity.js";
import { createExpansionState, sanitizeExpansion, getMasteryMultiplier, getExpeditionMultiplier, EXPEDITION_TYPES, MAX_EXPEDITION_TIER } from "./expansion.js";

const generatorIds = new Set(GENERATORS.map((generator) => generator.id));
const upgradeById = new Map(UPGRADES.map((upgrade) => [upgrade.id, upgrade]));
const riftworkIds = new Set(RIFTWORK.map((upgrade) => upgrade.id));

export function createFreshState() {
  return {
    ...createActiveState(),
    ...createRiftStrategyState(),
    ...createLongTermState(),
    ...createExpansionState(),
    shards: 0,
    runShards: 0,
    runStartedAt: new Date().toISOString(),
    lifetimeShards: 0,
    totalClicks: 0,
    generatorCounts: Object.fromEntries(GENERATORS.map((generator) => [generator.id, 0])),
    purchasedUpgrades: [],
    echoes: 0,
    totalEchoesEarned: 0,
    resonance: 0,
    purchasedRiftwork: [],
    riftEntries: 0,
    bestPassiveRate: 0,
    bestRunShards: 0,
    fastestRiftSeconds: 0,
    lastRunSeconds: 0,
    lastOfflineShards: 0,
    lastOfflineSeconds: 0,
    lastOfflineCreditedSeconds: 0,
    log: ["The first Shards wait in the wind."],
    lastSavedAt: null,
    lastSimulatedAt: 0,
    expeditionMode: false,
    completedObjectives: [],
    rememberedUpgrades: [],
    automation: { generators: false, upgrades: false, work: false, reserve: 0, target: "efficient" },
    automationCountdown: 15,
  };
}

export function sanitizeState(raw = {}, expedition = false) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) raw = {};
  const fresh = createFreshState();
  const state = { ...fresh };
  const numberFields = [
    "shards",
    "runShards",
    "lifetimeShards",
    "totalClicks",
    "echoes",
    "totalEchoesEarned",
    "resonance",
    "riftEntries",
    "bestPassiveRate",
    "bestRunShards",
    "fastestRiftSeconds",
    "lastRunSeconds",
    "lastOfflineShards",
    "lastOfflineSeconds",
    "lastOfflineCreditedSeconds",
    "lastSimulatedAt",
  ];

  for (const field of numberFields) {
    if (Number.isFinite(raw[field]) && raw[field] >= 0) state[field] = raw[field];
  }

  state.generatorCounts = { ...fresh.generatorCounts };
  if (raw.generatorCounts && typeof raw.generatorCounts === "object") {
    for (const [id, count] of Object.entries(raw.generatorCounts)) {
      if (generatorIds.has(id) && Number.isFinite(count) && count >= 0) {
        state.generatorCounts[id] = Math.min(100000, Math.floor(count));
      }
    }
  }

  state.purchasedUpgrades = uniqueKnownIds(raw.purchasedUpgrades, upgradeById);
  state.rememberedUpgrades = [...new Set([...uniqueKnownIds(raw.rememberedUpgrades, upgradeById), ...state.purchasedUpgrades])];
  if (raw.automation && typeof raw.automation === "object") {
    state.automation = {
      generators: raw.automation.generators === true,
      upgrades: raw.automation.upgrades === true,
      work: raw.automation.work === true,
      reserve: Number.isFinite(raw.automation.reserve) ? Math.max(0, raw.automation.reserve) : 0,
      target: generatorIds.has(raw.automation.target) ? raw.automation.target : "efficient",
    };
  }
  state.automationCountdown = Number.isFinite(raw.automationCountdown) ? Math.max(0, Math.min(15, raw.automationCountdown)) : 15;
  state.purchasedRiftwork = uniqueKnownIds(raw.purchasedRiftwork, riftworkIds);
  state.log = Array.isArray(raw.log)
    ? raw.log.filter((entry) => typeof entry === "string").slice(-20)
    : fresh.log;
  if (!state.log.length) state.log = fresh.log;
  state.lastSavedAt = typeof raw.lastSavedAt === "string" ? raw.lastSavedAt : null;
  state.runStartedAt = typeof raw.runStartedAt === "string" && Number.isFinite(Date.parse(raw.runStartedAt))
    ? raw.runStartedAt
    : fresh.runStartedAt;
  if (!Number.isFinite(raw.runShards) && Number.isFinite(raw.shards)) {
    state.runShards = Math.max(0, raw.shards);
  }
  sanitizeActiveState(raw, state);
  sanitizeRiftStrategyState(raw, state);
  sanitizeLongTermState(raw, state);
  sanitizeExpansion(raw, state);
  state.resonance = Math.min(state.resonance, 1e100);
  state.totalEchoesEarned = Math.min(state.totalEchoesEarned, 1e100);
  state.lastSimulatedAt = Math.min(state.lastSimulatedAt, Date.now());
  state.expeditionMode = expedition;
  const savedExpedition = raw.activeExpedition;
  if (!expedition && savedExpedition && EXPEDITION_TYPES.some((type) => type.id === savedExpedition.type) && savedExpedition.state && typeof savedExpedition.state === "object") {
    const tier = Number.isFinite(savedExpedition.tier) ? Math.max(0, Math.min(MAX_EXPEDITION_TIER, Math.floor(savedExpedition.tier))) : 0;
    state.activeExpedition = { type: savedExpedition.type, tier, seconds: Number.isFinite(savedExpedition.seconds) ? Math.max(0, savedExpedition.seconds) : 0, state: sanitizeState(savedExpedition.state, true) };
    state.activeExpedition.state.activeChallenge = savedExpedition.type;
    if (!getTotalGeneratorsOwned(state.activeExpedition.state)) state.activeExpedition.state.generatorCounts.whisperer = 1;
  }
  state.completedObjectives = uniqueKnownIds(raw.completedObjectives, new Set(FIRST_RUN_OBJECTIVES.map((item) => item.id)));
  reconcileLongTerm(state);
  reconcileObjectives(state, getPassiveRate(state));
  if (state.activeChallenge === "quietStorm" && getTotalGeneratorsOwned(state) === 0) state.generatorCounts.whisperer = 1;

  return state;
}

function uniqueKnownIds(value, known) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id) => typeof id === "string" && known.has(id)))];
}

export function getOwned(state, id) {
  return state.generatorCounts[id] || 0;
}

export function getTotalGeneratorsOwned(state) {
  return Object.values(state.generatorCounts).reduce((total, count) => total + count, 0);
}

export function getAcclaimCount(state) {
  const totalGenerators = getTotalGeneratorsOwned(state);
  return ACCLAIM_MILESTONES.filter((milestone) => {
    if (state.achievementDates[milestone.id]) return true;
    if (milestone.type === "totalGenerators") return totalGenerators >= milestone.amount;
    if (milestone.type === "purchasedUpgrades") return state.purchasedUpgrades.length >= milestone.amount;
    if (milestone.type === "purchasedRiftwork") return state.purchasedRiftwork.length >= milestone.amount;
    return (state[milestone.type] || 0) >= milestone.amount;
  }).length;
}

export function deriveModifiers(state) {
  const modifiers = {
    clickMultiplier: 1,
    clickCpsPercent: 0,
    globalMultiplier: 1,
    generatorMultipliers: Object.fromEntries(GENERATORS.map((generator) => [generator.id, 1])),
  };

  for (const id of state.purchasedUpgrades) {
    const effect = upgradeById.get(id)?.effect;
    if (!effect) continue;
    if (effect.type === "clickMultiplier") modifiers.clickMultiplier *= effect.value;
    if (effect.type === "clickCpsPercent") modifiers.clickCpsPercent += effect.value;
    if (effect.type === "globalMultiplier") modifiers.globalMultiplier *= effect.value;
    if (effect.type === "generatorMultiplier" && generatorIds.has(effect.generatorId)) {
      modifiers.generatorMultipliers[effect.generatorId] *= effect.value;
    }
  }

  const chorus = Object.values(state.mastery || {}).reduce((total, item) => total + (item.specialization === "chorus" ? item.rank * 0.01 : 0), 0);
  for (const generator of GENERATORS) {
    const mastery = state.mastery?.[generator.id];
    modifiers.generatorMultipliers[generator.id] *= 1 + chorus + (mastery?.specialization === "focus" ? mastery.rank * 0.1 : -(mastery?.rank || 0) * 0.01);
  }

  return modifiers;
}

export function hasRiftwork(state, id) {
  return state.purchasedRiftwork.includes(id);
}

export function getAcclaimMultiplier(state) {
  const strength = hasRiftwork(state, "acclaimConductor") ? 0.03 : 0.02;
  return 1 + getAcclaimCount(state) * strength;
}

export function getResonancePercentPerLevel(state) {
  let percent = hasRiftwork(state, "pressureMemory") ? 1.1 : 1;
  if (hasRiftwork(state, "resonanceEngine")) percent *= 1.25;
  return percent;
}

export function getResonanceMultiplier(state) {
  return 1 + state.resonance * (getResonancePercentPerLevel(state) / 100);
}

export function getAllProductionMultiplier(state, modifiers = deriveModifiers(state)) {
  let multiplier = modifiers.globalMultiplier * getAcclaimMultiplier(state);
  if (hasRiftwork(state, "blackglassConductance")) multiplier *= 1.05;
  if (hasRiftwork(state, "fracturedMultiplier")) multiplier *= 1.25;
  if (hasRiftwork(state, "echoAmplifier")) multiplier *= 1.5;
  if (hasRiftwork(state, "blackglassEndowment")) multiplier *= 2;
  if (hasAspect(state, "compoundScore") && getTotalGeneratorsOwned(state) >= 50) multiplier *= 1.15;
  if (hasAspect(state, "openingScore") && getTotalGeneratorsOwned(state) < 25) multiplier *= 1.5;
  multiplier *= getAchievementProductionMultiplier(state);
  multiplier *= getWorkProductionMultiplier(state);
  multiplier *= getChallengeProductionMultiplier(state);
  multiplier *= getExpeditionMultiplier(state);
  return multiplier;
}

export function getClickRiftworkMultiplier(state) {
  let multiplier = hasRiftwork(state, "resonantPalm") ? 1.15 : 1;
  if (hasRiftwork(state, "batonInTheVoid")) multiplier *= 1.75;
  return multiplier;
}

export function getGeneratorRiftworkMultiplier(state) {
  let multiplier = hasRiftwork(state, "stormEtching") ? 1.15 : 1;
  if (hasRiftwork(state, "riftFoundry")) multiplier *= 1.5;
  return multiplier;
}

export function getProductionMultiplier(state, modifiers = deriveModifiers(state)) {
  return getResonanceMultiplier(state) * getAllProductionMultiplier(state, modifiers);
}

export function getGeneratorContribution(state, generator, modifiers = deriveModifiers(state), includeTemporaryEffects = true) {
  const surgeMultiplier = includeTemporaryEffects && state.productionSurgeSeconds > 0 ? 2 : 1;
  const aspectMultiplier = hasAspect(state, "deepReservoir") ? 1.2 : 1;
  return getOwned(state, generator.id)
    * generator.baseRate
    * modifiers.generatorMultipliers[generator.id]
    * getProductionMultiplier(state, modifiers)
    * getGeneratorRiftworkMultiplier(state)
    * getAttunement(state).passiveMultiplier
    * aspectMultiplier
    * surgeMultiplier;
}

export function getPassiveRate(state, modifiers = deriveModifiers(state), includeTemporaryEffects = true) {
  const base = GENERATORS.reduce((total, generator) => total + getOwned(state, generator.id) * generator.baseRate * modifiers.generatorMultipliers[generator.id], 0);
  return base * getProductionMultiplier(state, modifiers) * getGeneratorRiftworkMultiplier(state)
    * getAttunement(state).passiveMultiplier * (hasAspect(state, "deepReservoir") ? 1.2 : 1)
    * (includeTemporaryEffects && state.productionSurgeSeconds > 0 ? 2 : 1);
}

export function getOfflineProgress(state, elapsedSeconds) {
  const safeElapsedSeconds = Number.isFinite(elapsedSeconds)
    ? Math.max(0, Math.floor(elapsedSeconds))
    : 0;
  const creditedSeconds = Math.min(safeElapsedSeconds, OFFLINE_CAP_SECONDS);
  const rate = getPassiveRate(state, deriveModifiers(state), false);
  return {
    elapsedSeconds: safeElapsedSeconds,
    creditedSeconds,
    rate,
    grossGain: rate * creditedSeconds
      * (hasAspect(state, "longMemory") ? 1.5 : 1)
      * getWorkOfflineMultiplier(state)
      * getChallengeOfflineMultiplier(state),
    gain: rate * creditedSeconds
      * (hasAspect(state, "longMemory") ? 1.5 : 1)
      * getWorkOfflineMultiplier(state)
      * getChallengeOfflineMultiplier(state)
      * (1 - state.projectAllocation),
    projectBase: rate * creditedSeconds
      * (hasAspect(state, "longMemory") ? 1.5 : 1)
      * getWorkOfflineMultiplier(state)
      * getChallengeOfflineMultiplier(state)
      * state.projectAllocation,
  };
}

export function getClickPower(state, modifiers = deriveModifiers(state)) {
  const passiveRate = getPassiveRate(state, modifiers);
  const baseClick = modifiers.clickMultiplier
    * getProductionMultiplier(state, modifiers)
    * getClickRiftworkMultiplier(state)
    + passiveRate * (0.01 + modifiers.clickCpsPercent);
  const surgeMultiplier = state.clickSurgeSeconds > 0 ? 3 : 1;
  const discoveryMultiplier = hasAspect(state, "clearHorizon") && state.runShards < 1_000_000 ? 1.25 : 1;
  const challengeClick = canClickForShards(state) ? 1 : 0;
  return baseClick * getAttunement(state).clickMultiplier * getMomentumMultiplier(state) * surgeMultiplier * discoveryMultiplier * getChallengeClickMultiplier(state) * challengeClick;
}

export function getGeneratorUnitCost(state, generator, offset = 0) {
  const aspectDiscount = hasAspect(state, "frugalGeometry") ? 0.9 : 1;
  return Math.floor(generator.baseCost * Math.pow(COST_GROWTH, getOwned(state, generator.id) + offset) * aspectDiscount * getChallengeCostMultiplier(state));
}

export function getGeneratorBatchCost(state, generator, amount) {
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 100000) return Infinity;
  let total = 0;
  for (let offset = 0; offset < amount; offset += 1) {
    total += getGeneratorUnitCost(state, generator, offset);
    if (!Number.isFinite(total)) return Infinity;
  }
  return total;
}

export function getAffordableGeneratorAmount(state, generator, limit = 100000) {
  let amount = 0;
  let total = 0;
  while (amount < limit) {
    const nextCost = getGeneratorUnitCost(state, generator, amount);
    if (!Number.isFinite(nextCost) || total + nextCost > state.shards) break;
    total += nextCost;
    amount += 1;
  }
  return amount;
}

export function getVisibleGenerators(state) {
  const eligible = GENERATORS.filter((generator) => canBuyGenerator(state, generator.id));
  const owned = eligible.filter((generator) => getOwned(state, generator.id) > 0);
  const next = eligible.find((generator) => getOwned(state, generator.id) === 0);
  return next ? [...owned, next] : owned;
}

export function isUpgradeUnlocked(state, upgrade, modifiers = deriveModifiers(state)) {
  if (upgrade.unlock.type === "lifetimeShards") return state.lifetimeShards >= upgrade.unlock.amount;
  if (upgrade.unlock.type === "generatorOwned") return getOwned(state, upgrade.unlock.generatorId) >= upgrade.unlock.amount;
  if (upgrade.unlock.type === "passiveRate") return getPassiveRate(state, modifiers) >= upgrade.unlock.amount;
  return false;
}

export function getVisibleUpgrades(state, modifiers = deriveModifiers(state)) {
  return UPGRADES.filter(
    (upgrade) => !state.purchasedUpgrades.includes(upgrade.id) && isUpgradeUnlocked(state, upgrade, modifiers),
  );
}

export function getPotentialResonance(state) {
  return Math.floor(Math.cbrt(Math.max(0, state.lifetimeShards) / RIFT_BASE_SHARDS));
}

export function getAvailableEchoes(state) {
  return Math.max(0, getPotentialResonance(state) - state.totalEchoesEarned);
}

export function getShardsForResonance(level) {
  return Math.pow(level, 3) * RIFT_BASE_SHARDS;
}

export function createRiftState(original, echoesGained, now = Date.now()) {
  const state = structuredClone(original);
  reconcileLongTerm(state, now);
  reconcileObjectives(state, getPassiveRate(state));
  const fresh = createFreshState();
  for (const entry of Object.values(state.mastery)) entry.specialization = entry.pending;
  const totalEchoesEarned = state.totalEchoesEarned + echoesGained;
  const runSeconds = Math.max(0, Math.floor((now - Date.parse(state.runStartedAt || "")) / 1000)) || 0;
  recordRiftDiscovery(state, echoesGained);
  return {
    ...fresh,
    ...Object.fromEntries(Object.keys(createExpansionState()).map((key) => [key, structuredClone(state[key])])),
    runStartedAt: new Date(now).toISOString(),
    lastSimulatedAt: state.lastSimulatedAt,
    completedObjectives: [...state.completedObjectives],
    rememberedUpgrades: [...new Set([...state.rememberedUpgrades, ...state.purchasedUpgrades])],
    automation: { ...state.automation },
    lifetimeShards: state.lifetimeShards,
    totalClicks: state.totalClicks,
    criticalGusts: state.criticalGusts,
    windRiftsClaimed: state.windRiftsClaimed,
    echoes: state.echoes + echoesGained,
    totalEchoesEarned,
    resonance: totalEchoesEarned,
    purchasedRiftwork: [...state.purchasedRiftwork],
    riftEntries: state.riftEntries + 1,
    bestPassiveRate: state.bestPassiveRate,
    bestRunShards: Math.max(state.bestRunShards, state.runShards),
    fastestRiftSeconds: state.fastestRiftSeconds > 0 ? Math.min(state.fastestRiftSeconds, runSeconds) : runSeconds,
    lastRunSeconds: runSeconds,
    lastOfflineShards: state.lastOfflineShards,
    lastOfflineSeconds: state.lastOfflineSeconds,
    lastOfflineCreditedSeconds: state.lastOfflineCreditedSeconds,
    attunement: state.pendingAttunement,
    pendingAttunement: state.pendingAttunement,
    settings: { ...state.settings },
    achievementDates: { ...state.achievementDates },
    projectId: state.projectId,
    projectStage: state.projectStage,
    projectProgress: state.projectProgress,
    projectAllocation: state.projectAllocation,
    completedWorkStages: state.completedWorkStages,
    activeChallenge: state.activeChallenge,
    completedChallenges: [...state.completedChallenges],
    chronicleEntries: [...state.chronicleEntries],
    discoveredGenerators: [...state.discoveredGenerators],
    campaignComplete: state.campaignComplete,
    campaignCompletedAt: state.campaignCompletedAt,
    unlockedAspects: [...state.unlockedAspects],
    activeAspects: [...state.pendingAspects],
    pendingAspects: [...state.pendingAspects],
    runHistory: [...state.runHistory, {
      enteredAt: new Date(now).toISOString(),
      durationSeconds: runSeconds,
      runShards: state.runShards,
      peakPassiveRate: state.peakRunPassiveRate,
      echoesGained,
      attunement: state.attunement,
      aspects: [...state.activeAspects],
    }].slice(-10),
    log: ["The Rift closes. The storm begins again, but it remembers."],
    lastSavedAt: state.lastSavedAt,
  };
}

export function formatNumber(value) {
  if (!Number.isFinite(value)) return value === Infinity ? "Limit" : "Unavailable";
  if (Math.abs(value) >= 1e63) return value.toExponential(2).replace("e+", "e");
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs < 1000) return `${sign}${trimNumber(abs)}`;
  /** @type {Array<[number, string]>} */
  const units = [
    [1e60, "N"], [1e57, "OcD"], [1e54, "SpD"], [1e51, "SxD"], [1e48, "QiD"],
    [1e45, "QaD"], [1e42, "TD"], [1e39, "DD"], [1e36, "U"], [1e33, "Dc"],
    [1e30, "No"], [1e27, "Oc"], [1e24, "Sp"], [1e21, "Sx"], [1e18, "Qi"],
    [1e15, "Qa"], [1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"],
  ];
  const unit = units.find(([threshold]) => abs >= threshold);
  return unit ? `${sign}${trimNumber(abs / unit[0])}${unit[1]}` : `${sign}${Math.floor(abs).toLocaleString()}`;
}

function trimNumber(value) {
  if (value >= 100) return String(Math.floor(value));
  if (value >= 10) return value.toFixed(1).replace(/\.0$/, "");
  return value.toFixed(2).replace(/\.?0+$/, "");
}

export function formatPercent(value) {
  if (!Number.isFinite(value)) return "0%";
  if (value >= 1000) return `${formatNumber(value)}%`;
  if (value > 100) return `${value.toFixed(1).replace(/\.0$/, "")}%`;
  if (value >= 99.95) return "100%";
  if (value >= 10) return `${value.toFixed(1).replace(/\.0$/, "")}%`;
  if (value > 0) return `${value.toFixed(2).replace(/\.?0+$/, "")}%`;
  return "0%";
}

export function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  if (seconds < 60) return `${seconds}s`;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
