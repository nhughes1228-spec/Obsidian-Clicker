export const RIFT_BRANCHES = [
  { id: "active", name: "Active", description: "Momentum, critical gusts, and deliberate clicks." },
  { id: "idle", name: "Idle", description: "Steady generators and stronger time away." },
  { id: "economy", name: "Economy", description: "Lower costs and faster reinvestment." },
  { id: "event", name: "Event", description: "More frequent and stronger Wind Rifts." },
  { id: "discovery", name: "Discovery", description: "Accelerated openings and earlier milestones." },
];

export const RIFT_ASPECTS = [
  { id: "tempoGlass", branch: "active", name: "Tempo Glass", cost: 2, tag: "Momentum +25%", description: "Momentum builds 25% faster during this run." },
  { id: "stormPulse", branch: "active", name: "Storm Pulse", cost: 6, tag: "Critical +4%", description: "Critical Gust chance is increased by 4 percentage points." },
  { id: "deepReservoir", branch: "idle", name: "Deep Reservoir", cost: 2, tag: "Passive +20%", description: "Passive production is increased by 20% during this run." },
  { id: "longMemory", branch: "idle", name: "Long Memory", cost: 8, tag: "Offline +50%", description: "Offline rewards are increased by 50%, within the normal time cap." },
  { id: "frugalGeometry", branch: "economy", name: "Frugal Geometry", cost: 3, tag: "Costs -10%", description: "Generator purchase costs are reduced by 10%." },
  { id: "compoundScore", branch: "economy", name: "Compound Score", cost: 10, tag: "All +15%", description: "All production is increased by 15% after owning 50 generators." },
  { id: "riftBeacon", branch: "event", name: "Rift Beacon", cost: 3, tag: "Rifts +35%", description: "Wind Rifts arrive 35% more frequently." },
  { id: "lastingWeather", branch: "event", name: "Lasting Weather", cost: 9, tag: "Events +50%", description: "Wind Rift surge durations and Shardfall rewards are increased by 50%." },
  { id: "openingScore", branch: "discovery", name: "Opening Score", cost: 2, tag: "Opening x1.5", description: "Production is increased by 50% until 25 generators are owned." },
  { id: "clearHorizon", branch: "discovery", name: "Clear Horizon", cost: 7, tag: "Clicks x1.25", description: "Click power is increased by 25% until the first million run Shards." },
];

export const ASPECT_SLOT_COUNT = 2;

export function createRiftStrategyState() {
  return {
    unlockedAspects: [],
    activeAspects: [],
    pendingAspects: [],
    peakRunPassiveRate: 0,
    runHistory: [],
  };
}

export function sanitizeRiftStrategyState(raw, state) {
  const known = new Set(RIFT_ASPECTS.map((aspect) => aspect.id));
  state.unlockedAspects = knownIds(raw.unlockedAspects, known);
  state.activeAspects = knownIds(raw.activeAspects, known).filter((id) => state.unlockedAspects.includes(id)).slice(0, ASPECT_SLOT_COUNT);
  state.pendingAspects = knownIds(raw.pendingAspects, known).filter((id) => state.unlockedAspects.includes(id)).slice(0, ASPECT_SLOT_COUNT);
  state.peakRunPassiveRate = Number.isFinite(raw.peakRunPassiveRate) ? Math.max(0, raw.peakRunPassiveRate) : 0;
  state.runHistory = Array.isArray(raw.runHistory)
    ? raw.runHistory.map(sanitizeRunRecord).filter(Boolean).slice(-10)
    : [];
}

export function hasAspect(state, id) {
  return state.activeAspects.includes(id);
}

export function togglePendingAspect(state, id) {
  if (!state.unlockedAspects.includes(id)) return false;
  if (state.pendingAspects.includes(id)) {
    state.pendingAspects = state.pendingAspects.filter((aspectId) => aspectId !== id);
    return true;
  }
  if (state.pendingAspects.length >= ASPECT_SLOT_COUNT) return false;
  state.pendingAspects.push(id);
  return true;
}

export function unlockAspect(state, id) {
  const aspect = RIFT_ASPECTS.find((item) => item.id === id);
  if (!aspect || state.unlockedAspects.includes(id) || state.echoes < aspect.cost) return false;
  state.echoes -= aspect.cost;
  state.unlockedAspects.push(id);
  return true;
}

function knownIds(value, known) {
  return Array.isArray(value) ? [...new Set(value.filter((id) => known.has(id)))] : [];
}

function sanitizeRunRecord(record) {
  if (!record || typeof record !== "object") return null;
  return {
    enteredAt: typeof record.enteredAt === "string" ? record.enteredAt : new Date().toISOString(),
    durationSeconds: nonNegative(record.durationSeconds),
    runShards: nonNegative(record.runShards),
    peakPassiveRate: nonNegative(record.peakPassiveRate),
    echoesGained: nonNegative(record.echoesGained),
    attunement: ["balanced", "active", "idle"].includes(record.attunement) ? record.attunement : "balanced",
    aspects: knownIds(record.aspects, new Set(RIFT_ASPECTS.map((aspect) => aspect.id))).slice(0, ASPECT_SLOT_COUNT),
  };
}

function nonNegative(value) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}
