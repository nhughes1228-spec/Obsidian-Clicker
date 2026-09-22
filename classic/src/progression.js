import { ACCLAIM_MILESTONES, GENERATORS, RIFTWORK, UPGRADES } from "./content.js";
import {
  deriveModifiers,
  createRiftState,
  getAcclaimCount,
  getAvailableEchoes,
  getClickPower,
  getGeneratorBatchCost,
  getGeneratorContribution,
  getOwned,
  getPassiveRate,
  getPotentialResonance,
  getProductionMultiplier,
  getResonanceMultiplier,
  getShardsForResonance,
  getTotalGeneratorsOwned,
  isUpgradeUnlocked,
} from "./economy.js";
import { RIFT_ASPECTS, RIFT_BRANCHES } from "./rift-strategy.js";

export function getUpgradeCategory(upgrade) {
  if (upgrade.effect.type === "generatorMultiplier") return "generator";
  if (upgrade.effect.type === "globalMultiplier") return "global";
  return "click";
}

export function getUpgradeCatalog(state, filter = "available") {
  const modifiers = deriveModifiers(state);
  if (filter === "purchased") {
    return UPGRADES.filter((upgrade) => state.purchasedUpgrades.includes(upgrade.id));
  }
  if (["generator", "click", "global"].includes(filter)) {
    return UPGRADES.filter((upgrade) => getUpgradeCategory(upgrade) === filter);
  }
  return UPGRADES.filter(
    (upgrade) => !state.purchasedUpgrades.includes(upgrade.id) && isUpgradeUnlocked(state, upgrade, modifiers),
  );
}

export function getGeneratorUpgradeGroups(upgrades) {
  return GENERATORS.map((generator) => ({
    generator,
    upgrades: upgrades.filter((upgrade) => upgrade.effect.generatorId === generator.id),
  })).filter((group) => group.upgrades.length > 0);
}

export function getGeneratorPurchasePreview(state, generator, amount) {
  const safeAmount = Math.max(0, Math.floor(amount));
  const modifiers = deriveModifiers(state);
  const beforeRate = getPassiveRate(state, modifiers);
  const beforeContribution = getGeneratorContribution(state, generator, modifiers);
  const next = {
    ...state,
    generatorCounts: {
      ...state.generatorCounts,
      [generator.id]: getOwned(state, generator.id) + safeAmount,
    },
  };
  const afterRate = getPassiveRate(next, modifiers);
  return {
    amount: safeAmount,
    cost: getGeneratorBatchCost(state, generator, safeAmount),
    beforeRate,
    afterRate,
    rateGain: afterRate - beforeRate,
    beforeContribution,
    afterContribution: getGeneratorContribution(next, generator, modifiers),
  };
}

export function getUpgradePurchasePreview(state, upgrade) {
  const beforeModifiers = deriveModifiers(state);
  const beforeRate = getPassiveRate(state, beforeModifiers);
  const next = {
    ...state,
    purchasedUpgrades: [...state.purchasedUpgrades, upgrade.id],
  };
  const afterModifiers = deriveModifiers(next);
  return {
    beforeRate,
    afterRate: getPassiveRate(next, afterModifiers),
    beforeClick: getClickPower(state, beforeModifiers),
    afterClick: getClickPower(next, afterModifiers),
  };
}

export function getNextDiscoveries(state) {
  const nextGenerator = GENERATORS.find((generator) => getOwned(state, generator.id) === 0) || null;
  const lockedUpgrades = UPGRADES.filter(
    (upgrade) => !state.purchasedUpgrades.includes(upgrade.id) && !isUpgradeUnlocked(state, upgrade),
  );
  const nextUpgrade = [...lockedUpgrades].sort((a, b) => getUnlockProgress(state, b) - getUnlockProgress(state, a) || a.cost - b.cost)[0] || null;
  const nextAcclaim = ACCLAIM_MILESTONES
    .filter((milestone) => !isMilestoneComplete(state, milestone))
    .sort((a, b) => ratio(getMilestoneValue(state, b), b.amount) - ratio(getMilestoneValue(state, a), a.amount))[0] || null;
  const potentialResonance = getPotentialResonance(state);
  const nextRiftTarget = getShardsForResonance(potentialResonance + 1);

  return {
    generator: nextGenerator ? discoveryItem(nextGenerator.name, nextGenerator.baseCost, state.shards, "Shards") : null,
    upgrade: nextUpgrade ? {
      label: nextUpgrade.name,
      detail: getUnlockLabel(nextUpgrade),
      progress: getUnlockProgress(state, nextUpgrade),
    } : null,
    acclaim: nextAcclaim ? {
      label: nextAcclaim.label,
      detail: `${getMilestoneValue(state, nextAcclaim)} / ${nextAcclaim.amount}`,
      progress: ratio(getMilestoneValue(state, nextAcclaim), nextAcclaim.amount),
    } : null,
    rift: {
      label: getAvailableEchoes(state) > 0 ? `${getAvailableEchoes(state)} Echoes waiting` : "Next Echo",
      detail: `${Math.floor(state.lifetimeShards)} / ${nextRiftTarget} lifetime Shards`,
      progress: ratio(state.lifetimeShards, nextRiftTarget),
    },
  };
}

export function getRiftworkCatalog(state) {
  return RIFTWORK.map((upgrade) => ({ ...upgrade, purchased: state.purchasedRiftwork.includes(upgrade.id) }));
}

export function getRiftForecast(state) {
  const echoes = getAvailableEchoes(state);
  const currentMultiplier = getProductionMultiplier(state);
  const futureState = createRiftState(state, echoes, state.lastSimulatedAt || Date.now());
  const futureMultiplier = getProductionMultiplier(futureState);
  const basket = Object.fromEntries(GENERATORS.map((generator) => [generator.id, generator.id === "whisperer" ? 1 : 0]));
  const baseline = { generatorCounts: basket, purchasedUpgrades: [], runShards: 0, momentum: 0, clickSurgeSeconds: 0, productionSurgeSeconds: 0 };
  const comparisonCurrent = { ...state, ...baseline, achievementDates: futureState.achievementDates };
  const comparisonFuture = { ...futureState, ...baseline };
  const passiveBefore = getPassiveRate(comparisonCurrent);
  const passiveAfter = getPassiveRate(comparisonFuture);
  const clickBefore = getClickPower(comparisonCurrent);
  const clickAfter = getClickPower(comparisonFuture);
  const improvement = passiveBefore > 0 ? passiveAfter / passiveBefore : futureMultiplier / Math.max(currentMultiplier, 0.0001);
  const replaySeconds = null;
  return {
    echoes,
    resonanceBefore: state.resonance,
    resonanceAfter: futureState.resonance,
    multiplierBefore: currentMultiplier,
    multiplierAfter: futureMultiplier,
    passiveBefore,
    passiveAfter,
    clickBefore,
    clickAfter,
    improvement,
    replaySeconds,
    lostShards: state.shards,
    lostGenerators: getTotalGeneratorsOwned(state),
    lostUpgrades: state.purchasedUpgrades.length,
    nextAttunement: state.pendingAttunement,
    nextAspects: [...state.pendingAspects],
    recommendation: state.activeChallenge ? "Crossing unavailable during a challenge." : echoes <= 0 ? "No Echoes available yet." : `${echoes} Echoes ready. Run inventory resets; permanent rewards remain.`,
  };
}

export function getRiftConstellation(state) {
  return RIFT_BRANCHES.map((branch) => ({
    ...branch,
    riftwork: RIFTWORK.filter((upgrade) => upgrade.branch === branch.id),
    aspects: RIFT_ASPECTS.filter((aspect) => aspect.branch === branch.id).map((aspect) => ({
      ...aspect,
      unlocked: state.unlockedAspects.includes(aspect.id),
      active: state.activeAspects.includes(aspect.id),
      pending: state.pendingAspects.includes(aspect.id),
    })),
  }));
}

function discoveryItem(label, target, value, unit) {
  return { label, detail: `${Math.floor(value)} / ${target} ${unit}`, progress: ratio(value, target) };
}

function ratio(value, target) {
  return Math.max(0, Math.min(1, target > 0 ? value / target : 1));
}

function getUnlockProgress(state, upgrade) {
  if (upgrade.unlock.type === "lifetimeShards") return ratio(state.lifetimeShards, upgrade.unlock.amount);
  if (upgrade.unlock.type === "generatorOwned") return ratio(getOwned(state, upgrade.unlock.generatorId), upgrade.unlock.amount);
  if (upgrade.unlock.type === "passiveRate") return ratio(getPassiveRate(state), upgrade.unlock.amount);
  return 0;
}

function getUnlockLabel(upgrade) {
  if (upgrade.unlock.type === "lifetimeShards") return `${upgrade.unlock.amount} lifetime Shards`;
  if (upgrade.unlock.type === "generatorOwned") {
    const generator = GENERATORS.find((item) => item.id === upgrade.unlock.generatorId);
    return `Own ${upgrade.unlock.amount} ${generator?.name || "generators"}`;
  }
  return `${upgrade.unlock.amount} Shards per second`;
}

function isMilestoneComplete(state, milestone) {
  return getMilestoneValue(state, milestone) >= milestone.amount;
}

function getMilestoneValue(state, milestone) {
  if (milestone.type === "totalGenerators") return getTotalGeneratorsOwned(state);
  if (milestone.type === "purchasedUpgrades") return state.purchasedUpgrades.length;
  if (milestone.type === "purchasedRiftwork") return state.purchasedRiftwork.length;
  return state[milestone.type] || 0;
}
