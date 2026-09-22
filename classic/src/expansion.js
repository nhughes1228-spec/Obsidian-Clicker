import { GENERATORS } from "./content.js";

export const MASTERY_RANK_SECONDS = [7200, 28800, 86400, 259200, 604800];
export const SPECIALIZATIONS = [{ id: "focus", name: "Focus", description: "+10% production per rank for this generator" }, { id: "chorus", name: "Chorus", description: "+1% production per rank for every other generator" }];
export const EXTENDED_WORKS = [
  { id: "mastery", name: "Hall of Voices", resource: "masteryTokens", stages: [
    { name: "Gather the Voices", cost: 1e8, material: 2 }, { name: "Shape the Hall", cost: 1e10, material: 4 },
    { name: "Tune the Vault", cost: 1e12, material: 8 }, { name: "Unite the Chorus", cost: 1e14, material: 16 },
  ], reward: "+10% mastery progress per stage" },
  { id: "expedition", name: "Wayfarer Observatory", resource: "expeditionMaterials", stages: [
    { name: "Map the Winds", cost: 1e9, material: 3 }, { name: "Chart the Crossing", cost: 1e11, material: 6 },
    { name: "Raise the Lens", cost: 1e13, material: 12 }, { name: "Open the Far Sky", cost: 1e15, material: 24 },
  ], reward: "+5% expedition reward Shards per stage" },
];
export const EXPEDITION_TYPES = [
  { id: "quietStorm", name: "Silent Crossing", description: "An autonomous crew gathers without clicks.", target: 1e6 },
  { id: "singleVoice", name: "Lone Voice", description: "Only Whisperers can join this expedition.", target: 1e6 },
  { id: "fracturedTempo", name: "Broken Passage", description: "Equipment costs 50% more.", target: 1e7 },
];
export const MAX_EXPEDITION_TIER = 500;

export function createExpansionState() {
  return {
    mastery: Object.fromEntries(GENERATORS.map((item) => [item.id, { rank: 0, progress: 0, specialization: "focus", pending: "focus" }])),
    masteryTokens: 0, expeditionMaterials: 0,
    extendedWorks: { mastery: 0, expedition: 0 },
    expeditionSerial: 0, activeExpedition: null, expeditionsCompleted: 0,
    expeditionRecords: {}, expeditionRewards: {}, chapterTwoComplete: false, chapterThreeComplete: false,
    permanentLore: [], pinnedObjective: null,
  };
}

const integer = (value, max = Number.MAX_SAFE_INTEGER) => Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : 0;
export function sanitizeExpansion(raw, state) {
  for (const generator of GENERATORS) {
    const saved = raw.mastery?.[generator.id];
    if (!saved || typeof saved !== "object") continue;
    const entry = state.mastery[generator.id];
    entry.rank = integer(saved.rank, 5);
    entry.progress = Number.isFinite(saved.progress) ? Math.max(0, Math.min(MASTERY_RANK_SECONDS[entry.rank] || 0, saved.progress)) : 0;
    entry.specialization = saved.specialization === "chorus" ? "chorus" : "focus";
    entry.pending = saved.pending === "chorus" ? "chorus" : "focus";
  }
  for (const key of ["masteryTokens", "expeditionMaterials", "expeditionSerial", "expeditionsCompleted"]) state[key] = integer(raw[key]);
  for (const work of EXTENDED_WORKS) state.extendedWorks[work.id] = integer(raw.extendedWorks?.[work.id], 4);
  for (const type of EXPEDITION_TYPES) {
    const record = raw.expeditionRecords?.[type.id];
    if (record && typeof record === "object") state.expeditionRecords[type.id] = { tier: integer(record.tier, MAX_EXPEDITION_TIER), seconds: integer(record.seconds) };
    state.expeditionRewards[type.id] = integer(raw.expeditionRewards?.[type.id], 10);
  }
  state.chapterTwoComplete = raw.chapterTwoComplete === true;
  state.chapterThreeComplete = raw.chapterThreeComplete === true;
  state.permanentLore = Array.isArray(raw.permanentLore) ? [...new Set(raw.permanentLore.filter((entry) => typeof entry === "string" && entry.length <= 2000))].slice(0, 256) : [];
  for (const entry of state.chronicleEntries) {
    const lore = `${entry.title}: ${entry.text}`;
    if (["work", "discovery", "capstone"].includes(entry.type) && !state.permanentLore.includes(lore) && state.permanentLore.length < 256) state.permanentLore.push(lore);
  }
  state.pinnedObjective = ["rift", "work", "mastery", "expeditions"].includes(raw.pinnedObjective) ? raw.pinnedObjective : null;
}

export function getMasteryMultiplier(state, generatorId) {
  let bonus = 1;
  for (const [id, mastery] of Object.entries(state.mastery || {})) {
    if (id === generatorId && mastery.specialization === "focus") bonus += mastery.rank * 0.1;
    if (id !== generatorId && mastery.specialization === "chorus") bonus += mastery.rank * 0.01;
  }
  return bonus;
}

export function getExpeditionMultiplier(state) {
  return 1 + Object.values(state.expeditionRewards || {}).reduce((total, count) => total + Math.min(10, count), 0) * 0.01;
}

export function getMasteryRanks(state) { return Object.values(state.mastery).reduce((total, item) => total + item.rank, 0); }

export function awardMastery(state, seconds, contributions) {
  if (state.riftEntries < 1) return;
  for (const generator of GENERATORS) {
    const entry = state.mastery[generator.id];
    // Normalize output and cap training speed so exponential income cannot skip ranks.
    entry.progress += seconds * Math.min(1, contributions[generator.id] / (generator.baseRate * 1000)) * (1 + state.extendedWorks.mastery * 0.1);
    while (entry.rank < 5 && entry.progress >= MASTERY_RANK_SECONDS[entry.rank]) {
      entry.progress -= MASTERY_RANK_SECONDS[entry.rank++];
      state.masteryTokens += 1;
    }
    if (entry.rank === 5) entry.progress = 0;
  }
}

export function getExpeditionContracts(state) {
  // The first offer is always a base-tier recovery path; no refresh currency or daily lock.
  return EXPEDITION_TYPES.map((type, index) => {
    const tier = index === 0 ? 0 : Math.min(MAX_EXPEDITION_TIER, (state.expeditionRecords[type.id]?.tier ?? -1) + 1);
    return { ...type, tier, key: `${state.expeditionSerial}:${type.id}:${tier}`, target: type.target * Math.pow(1.25, tier) };
  });
}

export function reconcileChapters(state) {
  for (const [count, title] of [[10, "Wayfinder"], [50, "Far Traveler"], [100, "Sky Cartographer"], [250, "Horizon Keeper"], [1000, "Beyond the Known Sky"]]) {
    const entry = `Expedition title: ${title}`;
    if (state.expeditionsCompleted >= count && !state.permanentLore.includes(entry)) state.permanentLore.push(entry);
  }
  state.chapterTwoComplete ||= state.campaignComplete && getMasteryRanks(state) >= 15 && state.expeditionsCompleted >= 15 && state.extendedWorks.mastery >= 2;
  state.chapterThreeComplete ||= state.chapterTwoComplete && getMasteryRanks(state) >= 40 && state.expeditionsCompleted >= 100 && EXTENDED_WORKS.every((work) => state.extendedWorks[work.id] === 4);
  for (const [key, text] of [["campaignComplete", "Chapter One: The First Storm Endures"], ["chapterTwoComplete", "Chapter Two: A Chorus Beyond the Glass"], ["chapterThreeComplete", "Chapter Three: The Far Sky Opens"]]) {
    if (state[key] && !state.permanentLore.includes(text)) state.permanentLore.push(text);
  }
}
