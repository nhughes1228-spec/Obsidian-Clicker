import { SAVE_KEY, SAVE_VERSION } from "./content.js";
import { sanitizeState } from "./economy.js";

export const BACKUP_KEY = `${SAVE_KEY}:backup`;
export const RECOVERY_KEY = `${SAVE_KEY}:recovery`;
const protectedStates = new WeakSet();
const MAX_SAVE_BYTES = 2_000_000;

function decode(text) {
  if (typeof text !== "string" || text.length > MAX_SAVE_BYTES) throw new Error("Save exceeds the size limit.");
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid save.");
  const envelope = Object.hasOwn(parsed, "version") || Object.hasOwn(parsed, "data");
  const version = envelope ? parsed.version : 0;
  if (!Number.isInteger(version) || version < 0 || version > SAVE_VERSION) throw new Error("Unsupported save version.");
  const source = envelope ? parsed.data : parsed;
  if (!source || typeof source !== "object" || Array.isArray(source)
      || !Number.isFinite(source.shards) || source.shards < 0
      || !source.generatorCounts || typeof source.generatorCounts !== "object"
      || Array.isArray(source.generatorCounts)) throw new Error("Not an Obsidian Clicker save.");
  // Versions 0-6 used a flat state with additive fields; v7 repairs persistent ledgers.
  const state = sanitizeState(source);
  if (!state.lastSavedAt && typeof parsed.savedAt === "string") state.lastSavedAt = parsed.savedAt;
  state.lastSimulatedAt ||= Date.parse(state.lastSavedAt || "") || Date.now();
  return { state, migrated: version !== SAVE_VERSION, error: null };
}

export function loadSavedState(storage) {
  let raw;
  try {
    storage ||= globalThis.localStorage;
    raw = storage.getItem(SAVE_KEY);
    if (!raw) return { state: sanitizeState(), migrated: false, error: null };
    const result = decode(raw);
    if (result.migrated) storage.setItem(RECOVERY_KEY, raw);
    return result;
  } catch (error) {
    let state = sanitizeState();
    let recovered = false;
    try {
      if (raw) storage.setItem(RECOVERY_KEY, raw);
      const backup = storage.getItem(BACKUP_KEY);
      if (backup) { state = decode(backup).state; recovered = true; }
    } catch { /* Preserve the original slot even when storage is unavailable. */ }
    protectedStates.add(state);
    return { state, migrated: false, error, recovered };
  }
}

export function saveState(state, storage, now = Date.now()) {
  try {
    if (protectedStates.has(state)) throw new Error("Original save protected. Export progress or explicitly import/reset to replace it.");
    storage ||= globalThis.localStorage;
    const prior = storage.getItem(SAVE_KEY);
    if (prior) { decode(prior); storage.setItem(BACKUP_KEY, prior); }
    const savedAt = new Date(now).toISOString();
    const envelope = { version: SAVE_VERSION, savedAt, data: { ...state, lastSavedAt: savedAt } };
    storage.setItem(SAVE_KEY, JSON.stringify(envelope));
    state.lastSavedAt = savedAt;
    return envelope;
  } catch (error) { return { error }; }
}

export function replaceSave(state, storage) {
  try {
    storage ||= globalThis.localStorage;
    const prior = storage.getItem(SAVE_KEY);
    if (prior) storage.setItem(RECOVERY_KEY, prior);
    const savedAt = new Date().toISOString();
    storage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, savedAt, data: { ...state, lastSavedAt: savedAt } }));
    state.lastSavedAt = savedAt;
    protectedStates.delete(state);
    return { savedAt };
  } catch (error) { return { error }; }
}

export function exportSave(state) {
  return JSON.stringify({ version: SAVE_VERSION, savedAt: new Date().toISOString(), data: state }, null, 2);
}

export function importSave(text) { return decode(text).state; }
export function getNewestActivityTime(state) { return state.lastSimulatedAt || Date.parse(state.lastSavedAt || "") || 0; }
export function startHeartbeat() { return () => {}; }
