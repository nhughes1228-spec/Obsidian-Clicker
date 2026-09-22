import {
  GOALS,
  GOAL_LANES,
  MODIFICATIONS,
  MODIFICATION_COSTS,
} from "./content.js";

export function goalValue(state, goal) {
  if (goal.lane === "production") return state.lifetimeObsidian;
  if (goal.lane === "output") return state.bestRate;
  return state.bestOwned[goal.producer] || 0;
}

export function activeGoals(state) {
  return GOAL_LANES.map((lane) =>
    GOALS.find(
      (goal) => goal.lane === lane && !state.claimedGoals.includes(goal.id),
    ),
  );
}

export function modificationFactor(state, producer, effect) {
  const mod = MODIFICATIONS.find(
    (m) => m.producer === producer && m.effect === effect,
  );
  if (!mod) return 1;
  const bonus = (state.modifications[mod.id] || 0) * mod.perLevel;
  return effect === "price" ? 1 - bonus : 1 + bonus;
}

export function modificationSpending(state) {
  return MODIFICATIONS.reduce(
    (sum, m) =>
      sum +
      MODIFICATION_COSTS.slice(0, state.modifications[m.id]).reduce(
        (total, cost) => total + cost,
        0,
      ),
    0,
  );
}
