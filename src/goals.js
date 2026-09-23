import {
  GOALS,
  GOAL_LANES,
  GOAL_MILESTONES,
  MODIFICATIONS,
  MODIFICATION_COSTS,
} from "./content.js";

export function goalValue(state, goal) {
  if (goal.lane === "production") return state.lifetimeObsidian;
  if (goal.lane === "output") return state.bestRate;
  return state.bestOwned[goal.producer] || 0;
}

export function activeGoals(state) {
  const claimed = new Set(state.claimedGoals);
  return GOAL_LANES.map((lane) => {
    const goal = GOAL_MILESTONES.find(
      (g) => g.lane === lane && g.members.some((id) => !claimed.has(id)),
    );
    if (!goal) return undefined;
    const members = goal.members.filter((id) => !claimed.has(id));
    return {
      ...goal,
      members,
      reward: GOALS.filter((g) => members.includes(g.id)).reduce(
        (sum, g) => sum + g.reward,
        0,
      ),
    };
  });
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
