import { HEARTBEAT_KEY, SAVE_KEY, SAVE_VERSION } from "./content.js";
import { sanitizeState } from "./economy.js";

const HEARTBEAT_INTERVAL_MS = 1000;

export function loadSavedState(storage = localStorage) {
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return { state: sanitizeState(), migrated: false, error: null };

  try {
    const parsed = JSON.parse(raw);
    const isEnvelope = parsed && typeof parsed === "object" && parsed.data && Number.isFinite(parsed.version);
    const source = isEnvelope ? parsed.data : parsed;
    const state = sanitizeState(source);
    if (!state.lastSavedAt && isEnvelope && typeof parsed.savedAt === "string") {
      state.lastSavedAt = parsed.savedAt;
    }
    return { state, migrated: !isEnvelope || parsed.version !== SAVE_VERSION, error: null };
  } catch (error) {
    return { state: sanitizeState(), migrated: false, error };
  }
}

export function saveState(state, storage = localStorage) {
  state.lastSavedAt = new Date().toISOString();
  const envelope = {
    version: SAVE_VERSION,
    savedAt: state.lastSavedAt,
    data: state,
  };
  storage.setItem(SAVE_KEY, JSON.stringify(envelope));
  return envelope;
}

export function exportSave(state) {
  const envelope = {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    data: state,
  };
  return JSON.stringify(envelope, null, 2);
}

export function importSave(text) {
  const parsed = JSON.parse(text);
  const source = parsed && typeof parsed === "object" && parsed.data ? parsed.data : parsed;
  return sanitizeState(source);
}

export function getNewestActivityTime(state, storage = localStorage) {
  const savedAt = Date.parse(state.lastSavedAt || "") || 0;
  const heartbeatAt = Number(storage.getItem(HEARTBEAT_KEY)) || 0;
  return Math.max(savedAt, heartbeatAt);
}

export function startHeartbeat(storage = localStorage) {
  const write = () => storage.setItem(HEARTBEAT_KEY, String(Date.now()));
  write();
  const timer = window.setInterval(() => {
    if (!document.hidden) write();
  }, HEARTBEAT_INTERVAL_MS);
  window.addEventListener("pagehide", write);
  window.addEventListener("beforeunload", write);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) write();
  });
  return () => window.clearInterval(timer);
}
