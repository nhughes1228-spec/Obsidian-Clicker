import { GENERATORS } from "./content.js";

export const FIRST_RUN_OBJECTIVES = [
  { id: "firstShard", title: "Wake the Sigil", detail: "Gather your first Shard from the Obsidian Winds mark.", current: (state) => state.lifetimeShards, target: 1 },
  { id: "firstGenerator", title: "Give the Wind a Voice", detail: "Purchase a Whisperer to begin automatic production.", current: (state) => state.generatorCounts.whisperer || 0, target: 1 },
  { id: "firstUpgrade", title: "Etch the First Improvement", detail: "Purchase any upgrade from the store.", current: (state) => state.purchasedUpgrades.length, target: 1 },
  { id: "steadyCurrent", title: "Establish a Current", detail: "Reach 1 Shard per second.", current: (_state, passiveRate) => passiveRate, target: 1 },
];

export function getFirstRunObjective(state, passiveRate) {
  const objective = FIRST_RUN_OBJECTIVES.find((item) => item.current(state, passiveRate) < item.target);
  if (!objective) return null;
  const value = Math.max(0, objective.current(state, passiveRate));
  return { ...objective, value, progress: Math.min(1, value / objective.target) };
}

export function getLogoEvolution(state) {
  const acclaim = Object.keys(state.achievementDates || {}).length;
  const tier = Math.min(4,
    (state.lifetimeShards >= 1_000 ? 1 : 0)
    + (acclaim >= 5 ? 1 : 0)
    + (state.completedWorkStages >= 2 ? 1 : 0)
    + (state.riftEntries >= 1 ? 1 : 0));
  return {
    tier,
    title: ["Dormant Sigil", "Stirring Sigil", "Resonant Sigil", "Crowned Sigil", "Riftborne Sigil"][tier],
    activeGeneratorIds: GENERATORS.filter((generator) => (state.generatorCounts[generator.id] || 0) > 0).map((generator) => generator.id),
    intensity: Math.min(1, Math.log10(Math.max(1, state.lifetimeShards + 1)) / 15),
  };
}
