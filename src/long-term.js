import { ACCLAIM_MILESTONES, GENERATORS } from "./content.js";

export const PROJECT_ALLOCATIONS = [0, 0.25, 0.5];

export const OBSIDIAN_WORKS = [{
  id: "blackglassSanctum",
  name: "Blackglass Sanctum",
  description: "Raise a permanent chamber where every storm can leave something behind.",
  stages: [
    { name: "Lay the Foundation", target: 250_000, reward: "Permanent production +5%", lore: "The first black stones learn the weight of weather." },
    { name: "Tune the Chamber", target: 2_500_000, reward: "Wind Rift rewards +10%", lore: "The walls begin returning every sound a little stronger." },
    { name: "Raise the Crown", target: 25_000_000, reward: "Offline production +15%", lore: "A crown of glass catches storms that pass beyond sight." },
    { name: "Awaken the Sanctum", target: 250_000_000, reward: "Permanent production +20% and capstone progress", lore: "The Sanctum opens its dark eye and remembers every run." },
  ],
}];

export const CHALLENGES = [
  { id: "quietStorm", name: "Quiet Storm", description: "Clicks gather no Shards. Reach 1M run Shards through generators.", target: 1_000_000, reward: "Offline production +10%" },
  { id: "singleVoice", name: "Single Voice", description: "Only Whisperers may be purchased. Reach 100M run Shards.", target: 100_000_000, reward: "All production +10%" },
  { id: "fracturedTempo", name: "Fractured Tempo", description: "Generator costs are 50% higher. Reach 1B run Shards.", target: 1_000_000_000, reward: "Click power +15%" },
];

export const CAMPAIGN_REQUIREMENTS = {
  achievements: 15,
  completedWorkStages: 4,
  challenges: 3,
  riftEntries: 5,
};

export function createLongTermState() {
  return {
    achievementDates: {},
    projectId: "blackglassSanctum",
    projectStage: 0,
    projectProgress: 0,
    projectAllocation: 0,
    completedWorkStages: 0,
    activeChallenge: null,
    completedChallenges: [],
    chronicleEntries: [],
    discoveredGenerators: [],
    campaignComplete: false,
    campaignCompletedAt: null,
  };
}

export function sanitizeLongTermState(raw, state) {
  const fresh = createLongTermState();
  state.achievementDates = raw.achievementDates && typeof raw.achievementDates === "object"
    ? Object.fromEntries(Object.entries(raw.achievementDates).filter(([id, value]) => ACCLAIM_MILESTONES.some((item) => item.id === id) && typeof value === "string"))
    : {};
  state.projectId = OBSIDIAN_WORKS.some((work) => work.id === raw.projectId) ? raw.projectId : fresh.projectId;
  state.projectStage = integerRange(raw.projectStage, 0, getCurrentWork(state).stages.length);
  state.projectProgress = nonNegative(raw.projectProgress);
  state.projectAllocation = PROJECT_ALLOCATIONS.includes(raw.projectAllocation) ? raw.projectAllocation : 0;
  state.completedWorkStages = integerRange(raw.completedWorkStages, 0, getCurrentWork(state).stages.length);
  state.activeChallenge = CHALLENGES.some((item) => item.id === raw.activeChallenge) ? raw.activeChallenge : null;
  state.completedChallenges = knownIds(raw.completedChallenges, new Set(CHALLENGES.map((item) => item.id)));
  state.chronicleEntries = Array.isArray(raw.chronicleEntries)
    ? raw.chronicleEntries.filter((entry) => entry && typeof entry.title === "string" && typeof entry.text === "string").slice(-40)
    : [];
  state.discoveredGenerators = knownIds(raw.discoveredGenerators, new Set(GENERATORS.map((item) => item.id)));
  state.campaignComplete = Boolean(raw.campaignComplete);
  state.campaignCompletedAt = typeof raw.campaignCompletedAt === "string" ? raw.campaignCompletedAt : null;
}

export function reconcileLongTerm(state) {
  const unlocked = [];
  for (const milestone of ACCLAIM_MILESTONES) {
    if (!state.achievementDates[milestone.id] && getMilestoneValue(state, milestone) >= milestone.amount) {
      state.achievementDates[milestone.id] = new Date().toISOString();
      unlocked.push(milestone);
      addChronicle(state, `Acclaim: ${milestone.label}`, getAchievementReward(milestone).label, "acclaim");
    }
  }
  const challenge = getActiveChallenge(state);
  if (challenge && state.runShards >= challenge.target) {
    state.completedChallenges = [...new Set([...state.completedChallenges, challenge.id])];
    state.activeChallenge = null;
    addChronicle(state, `Challenge Complete: ${challenge.name}`, challenge.reward, "challenge");
  }
  if (!state.campaignComplete && isCampaignReady(state)) {
    state.campaignComplete = true;
    state.campaignCompletedAt = new Date().toISOString();
    addChronicle(state, "The First Storm Endures", "The initial campaign is complete. Endless play remains open.", "capstone");
  }
  return unlocked;
}

export function investInWork(state, amount) {
  if (!getCurrentWorkStage(state) || amount <= 0) return 0;
  const efficiency = getProjectEfficiency(state);
  const invested = amount * efficiency;
  state.projectProgress += invested;

  let stage = getCurrentWorkStage(state);
  while (stage && state.projectProgress >= stage.target) {
    state.projectProgress -= stage.target;
    state.projectStage += 1;
    state.completedWorkStages = Math.max(state.completedWorkStages, state.projectStage);
    addChronicle(state, `${getCurrentWork(state).name}: ${stage.name}`, `${stage.reward}. ${stage.lore}`, "work");
    stage = getCurrentWorkStage(state);
  }
  if (!stage) {
    state.projectProgress = 0;
    state.projectAllocation = 0;
  }
  return invested;
}

export function setProjectAllocation(state, value) {
  if (PROJECT_ALLOCATIONS.includes(value)) state.projectAllocation = value;
}

export function startChallenge(state, id) {
  const challenge = CHALLENGES.find((item) => item.id === id);
  if (!challenge || state.activeChallenge || state.completedChallenges.includes(id)) return false;
  state.activeChallenge = id;
  state.shards = 0;
  state.runShards = 0;
  state.runStartedAt = new Date().toISOString();
  state.generatorCounts = Object.fromEntries(GENERATORS.map((generator) => [generator.id, 0]));
  state.purchasedUpgrades = [];
  state.momentum = 0;
  state.peakRunPassiveRate = 0;
  addChronicle(state, `Challenge Begun: ${challenge.name}`, challenge.description, "challenge");
  return true;
}

export function abandonChallenge(state) {
  if (!state.activeChallenge) return false;
  state.activeChallenge = null;
  return true;
}

export function discoverGenerator(state, generator) {
  if (state.discoveredGenerators.includes(generator.id)) return false;
  state.discoveredGenerators.push(generator.id);
  addChronicle(state, generator.name, generator.description, "generator");
  return true;
}

export function recordRiftDiscovery(state, echoesGained) {
  if (state.riftEntries > 0) return false;
  addChronicle(state, "The Rift Remembers", `The first crossing returned ${echoesGained} Echo${echoesGained === 1 ? "" : "es"}.`, "rift");
  return true;
}

export function getAchievementCatalog(state) {
  return ACCLAIM_MILESTONES.map((milestone, index) => ({
    ...milestone,
    category: getAchievementCategory(milestone),
    value: getMilestoneValue(state, milestone),
    completedAt: state.achievementDates[milestone.id] || null,
    reward: getAchievementReward(milestone, index),
  }));
}

export function getAchievementReward(milestone, index = ACCLAIM_MILESTONES.findIndex((item) => item.id === milestone.id)) {
  if ((index + 1) % 5 === 0) return { type: "production", value: 0.05, label: "All production +5%" };
  if (milestone.type === "totalClicks") return { type: "critical", value: 0.005, label: "Critical chance +0.5%" };
  if (milestone.type === "riftEntries" || milestone.type === "totalEchoesEarned") return { type: "project", value: 0.05, label: "Obsidian Work efficiency +5%" };
  return { type: "cosmetic", value: 0, label: "Chronicle entry unlocked" };
}

export function getAchievementProductionMultiplier(state) {
  return 1 + getAchievementCatalog(state).filter((item) => item.completedAt && item.reward.type === "production").reduce((sum, item) => sum + item.reward.value, 0);
}

export function getAchievementCriticalBonus(state) {
  return getAchievementCatalog(state).filter((item) => item.completedAt && item.reward.type === "critical").reduce((sum, item) => sum + item.reward.value, 0);
}

export function getProjectEfficiency(state) {
  return 1 + getAchievementCatalog(state).filter((item) => item.completedAt && item.reward.type === "project").reduce((sum, item) => sum + item.reward.value, 0);
}

export function getWorkProductionMultiplier(state) {
  let multiplier = 1;
  if (state.completedWorkStages >= 1) multiplier *= 1.05;
  if (state.completedWorkStages >= 4) multiplier *= 1.2;
  return multiplier;
}

export function getWorkEventMultiplier(state) {
  return state.completedWorkStages >= 2 ? 1.1 : 1;
}

export function getWorkOfflineMultiplier(state) {
  return state.completedWorkStages >= 3 ? 1.15 : 1;
}

export function getChallengeProductionMultiplier(state) {
  return state.completedChallenges.includes("singleVoice") ? 1.1 : 1;
}

export function getChallengeClickMultiplier(state) {
  return state.completedChallenges.includes("fracturedTempo") ? 1.15 : 1;
}

export function getChallengeOfflineMultiplier(state) {
  return state.completedChallenges.includes("quietStorm") ? 1.1 : 1;
}

export function getActiveChallenge(state) {
  return CHALLENGES.find((item) => item.id === state.activeChallenge) || null;
}

export function canClickForShards(state) {
  return state.activeChallenge !== "quietStorm";
}

export function canBuyGenerator(state, id) {
  return state.activeChallenge !== "singleVoice" || id === "whisperer";
}

export function getChallengeCostMultiplier(state) {
  return state.activeChallenge === "fracturedTempo" ? 1.5 : 1;
}

export function getCurrentWork(state) {
  return OBSIDIAN_WORKS.find((work) => work.id === state.projectId) || OBSIDIAN_WORKS[0];
}

export function getCurrentWorkStage(state) {
  return getCurrentWork(state).stages[state.projectStage] || null;
}

export function isCampaignReady(state) {
  return getAchievementCatalog(state).filter((item) => item.completedAt).length >= CAMPAIGN_REQUIREMENTS.achievements
    && state.completedWorkStages >= CAMPAIGN_REQUIREMENTS.completedWorkStages
    && state.completedChallenges.length >= CAMPAIGN_REQUIREMENTS.challenges
    && state.riftEntries >= CAMPAIGN_REQUIREMENTS.riftEntries;
}

export function getCampaignProgress(state) {
  return {
    achievements: { value: getAchievementCatalog(state).filter((item) => item.completedAt).length, target: CAMPAIGN_REQUIREMENTS.achievements },
    work: { value: state.completedWorkStages, target: CAMPAIGN_REQUIREMENTS.completedWorkStages },
    challenges: { value: state.completedChallenges.length, target: CAMPAIGN_REQUIREMENTS.challenges },
    rifts: { value: state.riftEntries, target: CAMPAIGN_REQUIREMENTS.riftEntries },
  };
}

function addChronicle(state, title, text, type) {
  state.chronicleEntries.push({ id: `${type}-${Date.now()}-${state.chronicleEntries.length}`, type, title, text, unlockedAt: new Date().toISOString() });
  state.chronicleEntries = state.chronicleEntries.slice(-40);
}

function getAchievementCategory(milestone) {
  if (milestone.type === "lifetimeShards" || milestone.type === "bestPassiveRate") return "Production";
  if (milestone.type === "totalClicks") return "Active";
  if (milestone.type === "totalGenerators" || milestone.type === "purchasedUpgrades") return "Collection";
  return "Rift";
}

function getMilestoneValue(state, milestone) {
  if (milestone.type === "totalGenerators") return Object.values(state.generatorCounts).reduce((sum, count) => sum + count, 0);
  if (milestone.type === "purchasedUpgrades") return state.purchasedUpgrades.length;
  if (milestone.type === "purchasedRiftwork") return state.purchasedRiftwork.length;
  return state[milestone.type] || 0;
}

function knownIds(value, known) {
  return Array.isArray(value) ? [...new Set(value.filter((id) => known.has(id)))] : [];
}

function nonNegative(value) { return Number.isFinite(value) ? Math.max(0, value) : 0; }
function integerRange(value, min, max) { return Number.isFinite(value) ? Math.min(max, Math.max(min, Math.floor(value))) : min; }
