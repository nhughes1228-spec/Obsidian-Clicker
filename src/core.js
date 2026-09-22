import {
  BALANCE,
  PRODUCERS,
  UPGRADES,
  TOOLS,
  RESEARCH,
  OBJECTIVES,
  MODIFICATIONS,
  MODIFICATION_COSTS,
} from "./content.js";
import { activeGoals, goalValue, modificationFactor } from "./goals.js";

export function createFreshState(now = Date.now()) {
  return {
    obsidian: 0,
    lifetimeObsidian: 0,
    runObsidian: 0,
    producers: Object.fromEntries(PRODUCERS.map((p) => [p.id, 0])),
    upgrades: [],
    researchPoints: 0,
    researchAwarded: 0,
    research: [],
    rebuilds: 0,
    clicks: 0,
    bestRate: 0,
    unlockedProducers: [PRODUCERS[0].id],
    completedObjectives: [],
    upgradeParts: 0,
    claimedGoals: [],
    bestOwned: Object.fromEntries(PRODUCERS.map((p) => [p.id, 0])),
    modifications: Object.fromEntries(MODIFICATIONS.map((m) => [m.id, 0])),
    automation: false,
    settings: { sound: true, music: false, reducedMotion: false },
    lastSimulatedAt: now,
    lastSavedAt: null,
    numericLimit: false,
  };
}

export function deriveEconomy(state) {
  const global =
    (state.research.includes("equipment") ? 1.25 : 1) *
    (state.research.includes("cooling") ? 1.5 : 1);
  const unitRates = Object.fromEntries(
    PRODUCERS.map((p) => [
      p.id,
      p.rate *
        modificationFactor(state, p.id, "output") *
        global *
        2 **
          UPGRADES.filter(
            (u) =>
              "producer" in u &&
              u.producer === p.id &&
              state.upgrades.includes(u.id),
          ).length,
    ]),
  );
  const passiveRate = PRODUCERS.reduce(
    (sum, p) => sum + unitRates[p.id] * state.producers[p.id],
    0,
  );
  const tools = TOOLS.filter((t) => state.upgrades.includes(t.id));
  const clickBase = 1 + tools.reduce((sum, t) => sum + t.base, 0);
  const clickShare = tools.reduce((sum, t) => sum + t.share, 0);
  const clickMultiplier = state.research.includes("casting") ? 2 : 1;
  return {
    passiveRate,
    unitRates,
    clickBase,
    clickShare,
    clickMultiplier,
    clickPower: (clickBase + passiveRate * clickShare) * clickMultiplier,
    availableResearch: Math.max(
      0,
      Math.min(
        Number.MAX_SAFE_INTEGER,
        Math.floor(
          Math.sqrt(state.lifetimeObsidian / BALANCE.researchThreshold),
        ),
      ) - state.researchAwarded,
    ),
  };
}

export function producerCost(state, id, amount = 1) {
  const p = PRODUCERS.find((p) => p.id === id);
  if (
    !p ||
    !Number.isSafeInteger(amount) ||
    amount < 1 ||
    amount + state.producers[id] > BALANCE.maxOwned
  )
    return Infinity;
  const result =
    (p.cost *
      modificationFactor(state, p.id, "price") *
      (state.research.includes("purchasing") ? 0.9 : 1) *
      BALANCE.costGrowth ** state.producers[id] *
      (BALANCE.costGrowth ** amount - 1)) /
    (BALANCE.costGrowth - 1);
  return Number.isFinite(result) && result <= BALANCE.maxNumber
    ? Math.ceil(result - 1e-8)
    : Infinity;
}

export function affordableAmount(state, id) {
  let lo = 0,
    hi = BALANCE.maxOwned - state.producers[id];
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (producerCost(state, id, mid) <= state.obsidian) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export function upgradeUnlocked(state, upgrade) {
  return "producer" in upgrade
    ? state.producers[upgrade.producer] >= upgrade.owned
    : !upgrade.requires || state.upgrades.includes(upgrade.requires);
}

export function reconcile(state) {
  for (const p of PRODUCERS)
    state.bestOwned[p.id] = Math.max(
      state.bestOwned[p.id],
      state.producers[p.id],
    );
  const economy = deriveEconomy(state);
  state.bestRate = Math.max(state.bestRate, economy.passiveRate);
  for (const p of PRODUCERS)
    if (
      (state.runObsidian >= p.cost || state.producers[p.id] > 0) &&
      !state.unlockedProducers.includes(p.id)
    )
      state.unlockedProducers.push(p.id);
  for (const o of OBJECTIVES)
    if (
      o.value(state, economy) >= o.target &&
      !state.completedObjectives.includes(o.id)
    )
      state.completedObjectives.push(o.id);
}

function earn(state, amount) {
  if (!Number.isFinite(amount) || amount < 0)
    throw new RangeError("Invalid production");
  for (const key of ["obsidian", "lifetimeObsidian", "runObsidian"]) {
    if (amount > 0 && state[key] >= BALANCE.maxNumber - amount)
      state.numericLimit = true;
    state[key] = Math.min(BALANCE.maxNumber, state[key] + amount);
  }
}

/** Commands are the only entry point for player actions; simulation calls them too. */
export function applyCommand(state, command) {
  if (command.type === "click") {
    const amount = deriveEconomy(state).clickPower;
    earn(state, amount);
    state.clicks = Math.min(Number.MAX_SAFE_INTEGER, state.clicks + 1);
    reconcile(state);
    return { ok: true, amount };
  }
  if (command.type === "buyProducer") {
    if (!state.unlockedProducers.includes(command.id)) return { ok: false };
    const amount =
      command.amount === "max"
        ? affordableAmount(state, command.id)
        : (command.amount ?? 1);
    const cost = producerCost(state, command.id, amount);
    if (amount < 1 || cost > state.obsidian) return { ok: false };
    state.obsidian -= cost;
    state.producers[command.id] += amount;
  } else if (command.type === "buyUpgrade") {
    const u = UPGRADES.find((u) => u.id === command.id);
    if (
      !u ||
      state.upgrades.includes(u.id) ||
      !upgradeUnlocked(state, u) ||
      state.obsidian < u.cost
    )
      return { ok: false };
    state.obsidian -= u.cost;
    state.upgrades.push(u.id);
  } else if (command.type === "claimGoal") {
    const goal = activeGoals(state).find((g) => g?.id === command.id);
    if (!goal || goalValue(state, goal) < goal.target) return { ok: false };
    state.claimedGoals.push(goal.id);
    state.upgradeParts += goal.reward;
  } else if (command.type === "buyModification") {
    const mod = MODIFICATIONS.find((m) => m.id === command.id);
    if (!mod || state.bestOwned[mod.producer] < 1) return { ok: false };
    const cost = MODIFICATION_COSTS[state.modifications[mod.id]];
    if (cost === undefined || state.upgradeParts < cost) return { ok: false };
    state.upgradeParts -= cost;
    state.modifications[mod.id]++;
  } else if (command.type === "buyResearch") {
    const r = RESEARCH.find((r) => r.id === command.id);
    if (!r || state.research.includes(r.id) || state.researchPoints < r.cost)
      return { ok: false };
    state.researchPoints -= r.cost;
    state.research.push(r.id);
  } else if (command.type === "rebuild") {
    const points = deriveEconomy(state).availableResearch;
    if (points < 1) return { ok: false };
    state.researchPoints += points;
    state.researchAwarded += points;
    state.rebuilds++;
    state.obsidian = 0;
    state.runObsidian = 0;
    state.upgrades = [];
    state.producers = Object.fromEntries(
      PRODUCERS.map((p) => [
        p.id,
        p.id === "tray" && state.research.includes("starter") ? 10 : 0,
      ]),
    );
    state.unlockedProducers = ["tray"];
    reconcile(state);
    return { ok: true, points };
  } else if (command.type === "automation") {
    if (
      !state.research.includes("automatic") ||
      typeof command.enabled !== "boolean"
    )
      return { ok: false };
    state.automation = command.enabled;
  } else if (command.type === "setting") {
    if (
      !Object.hasOwn(state.settings, command.key) ||
      typeof command.value !== "boolean"
    )
      return { ok: false };
    state.settings[command.key] = command.value;
  } else return { ok: false };
  reconcile(state);
  return { ok: true };
}

export function purchasingOptions(state) {
  const economy = deriveEconomy(state);
  return PRODUCERS.filter((p) => state.unlockedProducers.includes(p.id))
    .map((p) => ({
      id: p.id,
      cost: producerCost(state, p.id),
      gain: economy.unitRates[p.id],
      payback: producerCost(state, p.id) / economy.unitRates[p.id],
    }))
    .filter((o) => Number.isFinite(o.cost));
}

/** Event-based automation avoids frame-dependent purchases, including during offline time. */
export function advanceSimulation(state, ms, { offline = false } = {}) {
  if (!Number.isFinite(ms) || ms < 0)
    throw new RangeError("Elapsed time must be finite and nonnegative");
  if (ms > Number.MAX_SAFE_INTEGER - state.lastSimulatedAt)
    throw new RangeError("Elapsed time exceeds the supported clock range");
  if (ms === 0) return { earned: 0, creditedSeconds: 0 };
  if (ms > 86400000 && !offline)
    throw new RangeError("Use offline advancement for long absences");
  let remaining = Math.min(ms / 1000, BALANCE.offlineSeconds);
  const creditedSeconds = remaining,
    before = state.lifetimeObsidian;
  while (remaining > 1e-9) {
    reconcile(state);
    const rate = deriveEconomy(state).passiveRate;
    const options =
      state.automation && state.research.includes("automatic")
        ? purchasingOptions(state)
        : [];
    const best = options
      .filter((o) => o.cost <= state.obsidian)
      .sort((a, b) => a.payback - b.payback)[0];
    if (best) {
      applyCommand(state, { type: "buyProducer", id: best.id });
      continue;
    }
    const next =
      rate > 0 && options.length
        ? Math.min(
            ...options.map((o) =>
              Math.max(0, (o.cost - state.obsidian) / rate),
            ),
          )
        : Infinity;
    const unlock =
      rate > 0
        ? Math.min(
            ...PRODUCERS.filter(
              (p) => !state.unlockedProducers.includes(p.id),
            ).map((p) => Math.max(0, (p.cost - state.runObsidian) / rate)),
          )
        : Infinity;
    const seconds = Math.min(remaining, Math.max(1e-9, Math.min(next, unlock)));
    earn(state, rate * seconds);
    remaining = Math.max(0, remaining - seconds);
  }
  state.lastSimulatedAt += ms;
  reconcile(state);
  return { earned: state.lifetimeObsidian - before, creditedSeconds };
}

export function advanceTo(state, now, options = {}) {
  if (!Number.isFinite(now) || now < 0)
    throw new RangeError("Invalid timestamp");
  return advanceSimulation(
    state,
    Math.max(0, now - state.lastSimulatedAt),
    options,
  );
}
