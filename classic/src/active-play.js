export const ATTUNEMENTS = [
  { id: "balanced", name: "Balanced", description: "Equal footing for active and idle play.", clickMultiplier: 1, passiveMultiplier: 1, momentumGainMultiplier: 1 },
  { id: "active", name: "Active", description: "Clicks +35%, passive production -15%, Momentum builds faster.", clickMultiplier: 1.35, passiveMultiplier: 0.85, momentumGainMultiplier: 1.25 },
  { id: "idle", name: "Idle", description: "Passive production +20%, clicks -25%, Momentum fades more slowly.", clickMultiplier: 0.75, passiveMultiplier: 1.2, momentumGainMultiplier: 0.8 },
];

export const WIND_RIFT_TYPES = [
  { id: "clickSurge", name: "Focused Current", description: "Click power tripled for 20 seconds." },
  { id: "productionSurge", name: "Storm Chorus", description: "Passive production doubled for 30 seconds." },
  { id: "bounty", name: "Shardfall", description: "Immediately gather 60 seconds of passive production." },
];
import { hasAspect } from "./rift-strategy.js";
import { getAchievementCriticalBonus, getWorkEventMultiplier } from "./long-term.js";

const MAX_MOMENTUM = 100;
const MOMENTUM_GRACE_SECONDS = 1.5;

export function createActiveState() {
  return {
    momentum: 0,
    momentumGraceSeconds: 0,
    lastActiveClickAt: 0,
    criticalGusts: 0,
    windRiftsClaimed: 0,
    activeWindRift: null,
    nextWindRiftIn: 35,
    clickSurgeSeconds: 0,
    productionSurgeSeconds: 0,
    attunement: "balanced",
    pendingAttunement: "balanced",
    settings: {
      reducedMotion: false,
      sound: true,
      music: false,
      haptics: true,
    },
  };
}

export function sanitizeActiveState(raw, state) {
  const active = createActiveState();
  state.momentum = finiteRange(raw.momentum, 0, MAX_MOMENTUM, active.momentum);
  state.momentumGraceSeconds = finiteRange(raw.momentumGraceSeconds, 0, MOMENTUM_GRACE_SECONDS, 0);
  state.lastActiveClickAt = Number.isFinite(raw.lastActiveClickAt) ? Math.max(0, raw.lastActiveClickAt) : 0;
  state.criticalGusts = nonNegativeInteger(raw.criticalGusts);
  state.windRiftsClaimed = nonNegativeInteger(raw.windRiftsClaimed);
  state.nextWindRiftIn = finiteRange(raw.nextWindRiftIn, 0, 120, active.nextWindRiftIn);
  state.clickSurgeSeconds = finiteRange(raw.clickSurgeSeconds, 0, 60, 0);
  state.productionSurgeSeconds = finiteRange(raw.productionSurgeSeconds, 0, 60, 0);
  state.attunement = knownAttunement(raw.attunement);
  state.pendingAttunement = knownAttunement(raw.pendingAttunement || raw.attunement);
  state.settings = {
    ...active.settings,
    ...(raw.settings && typeof raw.settings === "object"
      ? Object.fromEntries(Object.entries(raw.settings).filter(([key, value]) => key in active.settings && typeof value === "boolean"))
      : {}),
  };
  if (raw.activeWindRift && WIND_RIFT_TYPES.some((type) => type.id === raw.activeWindRift.type)) {
    state.activeWindRift = {
      type: raw.activeWindRift.type,
      seconds: finiteRange(raw.activeWindRift.seconds, 0, 15, 0),
    };
  } else {
    state.activeWindRift = null;
  }
}

export function getAttunement(state) {
  return ATTUNEMENTS.find((item) => item.id === state.attunement) || ATTUNEMENTS[0];
}

export function getMomentumMultiplier(state) {
  return 1 + finiteRange(state.momentum, 0, MAX_MOMENTUM, 0) / 100;
}

export function registerActiveClick(state, now = Date.now(), random = Math.random) {
  const interval = state.lastActiveClickAt > 0 ? now - state.lastActiveClickAt : Infinity;
  const deliberateFactor = interval >= 280 ? 1 : interval >= 140 ? 0.45 : 0.15;
  const attunement = getAttunement(state);
  const aspectGain = hasAspect(state, "tempoGlass") ? 1.25 : 1;
  const momentumGain = 7 * deliberateFactor * attunement.momentumGainMultiplier * aspectGain;
  state.momentum = Math.min(MAX_MOMENTUM, state.momentum + momentumGain);
  state.lastActiveClickAt = now;
  state.momentumGraceSeconds = MOMENTUM_GRACE_SECONDS;
  const criticalChance = 0.05 + state.momentum * 0.001 + (hasAspect(state, "stormPulse") ? 0.04 : 0) + getAchievementCriticalBonus(state);
  const critical = random() < criticalChance;
  if (critical) state.criticalGusts += 1;
  return { critical, momentumGain, multiplier: critical ? 5 : 1 };
}

export function updateActivePlay(state, deltaSeconds, random = Math.random) {
  const events = [];
  const decaySeconds = Math.max(0, deltaSeconds - state.momentumGraceSeconds);
  state.momentumGraceSeconds = Math.max(0, state.momentumGraceSeconds - deltaSeconds);
  if (state.momentumGraceSeconds <= 0 && state.momentum > 0) {
    const decay = state.attunement === "idle" ? 2 : 4;
    state.momentum = Math.max(0, state.momentum - decay * decaySeconds);
  }

  state.clickSurgeSeconds = Math.max(0, state.clickSurgeSeconds - deltaSeconds);
  state.productionSurgeSeconds = Math.max(0, state.productionSurgeSeconds - deltaSeconds);

  if (state.activeWindRift) {
    state.activeWindRift.seconds -= deltaSeconds;
    if (state.activeWindRift.seconds <= 0) {
      state.activeWindRift = null;
      state.nextWindRiftIn = getNextRiftDelay(state, random);
      events.push("riftExpired");
    }
  } else {
    state.nextWindRiftIn -= deltaSeconds;
    if (state.nextWindRiftIn <= 0) {
      const type = WIND_RIFT_TYPES[Math.floor(random() * WIND_RIFT_TYPES.length)] || WIND_RIFT_TYPES[0];
      state.activeWindRift = { type: type.id, seconds: 12 };
      events.push("riftSpawned");
    }
  }
  return events;
}

export function claimWindRift(state, passiveRate, random = Math.random) {
  if (!state.activeWindRift) return null;
  const type = state.activeWindRift.type;
  state.activeWindRift = null;
  state.nextWindRiftIn = getNextRiftDelay(state, random);
  state.windRiftsClaimed += 1;
  const rewardMultiplier = (hasAspect(state, "lastingWeather") ? 1.5 : 1) * getWorkEventMultiplier(state);
  if (type === "clickSurge") state.clickSurgeSeconds = Math.max(state.clickSurgeSeconds, 20 * rewardMultiplier);
  if (type === "productionSurge") state.productionSurgeSeconds = Math.max(state.productionSurgeSeconds, 30 * rewardMultiplier);
  const bounty = type === "bounty" ? passiveRate * 60 * rewardMultiplier : 0;
  return { type, bounty, definition: WIND_RIFT_TYPES.find((item) => item.id === type) };
}

export function setAttunement(state, id) {
  if (ATTUNEMENTS.some((item) => item.id === id)) state.pendingAttunement = id;
}

function getNextRiftDelay(state, random) {
  const delay = 45 + random() * 30;
  return hasAspect(state, "riftBeacon") ? delay / 1.35 : delay;
}

function knownAttunement(id) {
  return ATTUNEMENTS.some((item) => item.id === id) ? id : "balanced";
}

function finiteRange(value, min, max, fallback) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function nonNegativeInteger(value) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}
