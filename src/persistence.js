import {
  EDITION,
  SAVE_KEY,
  SAVE_VERSION,
  BALANCE,
  PRODUCERS,
  UPGRADES,
  RESEARCH,
  OBJECTIVES,
  GOALS,
  MODIFICATIONS,
  MODIFICATION_COSTS,
} from "./content.js";
import { createFreshState, reconcile } from "./core.js";
import { goalValue, modificationSpending } from "./goals.js";
export const BACKUP_KEY = `${SAVE_KEY}:backup`;
export const RECOVERY_KEY = `${SAVE_KEY}:recovery`;
const ids = (value, catalog) =>
  Array.isArray(value)
    ? [
        ...new Set(
          value.filter((id) => catalog.some((item) => item.id === id)),
        ),
      ].slice(0, catalog.length)
    : [];

export function parseSave(text, now = Date.now()) {
  if (typeof text !== "string" || text.length > 200000)
    throw new Error("Save must be smaller than 200 KB.");
  const envelope = JSON.parse(text);
  if (envelope?.edition !== EDITION)
    throw new Error(
      "This is not a Workshop save. Open Classic to use saves from the original edition.",
    );
  if (![1, 2, 3, SAVE_VERSION].includes(envelope.version))
    throw new Error(
      "Unsupported save version. The original save has been left untouched.",
    );
  const raw = envelope.data;
  if (
    !raw ||
    typeof raw !== "object" ||
    Array.isArray(raw) ||
    typeof raw.obsidian !== "number" ||
    !raw.producers ||
    typeof raw.producers !== "object"
  )
    throw new Error("Invalid Workshop save.");
  const state = createFreshState(now);
  for (const key of [
    "obsidian",
    "lifetimeObsidian",
    "runObsidian",
    "researchPoints",
    "researchAwarded",
    "rebuilds",
    "clicks",
    "bestRate",
  ]) {
    if (
      !Number.isFinite(raw[key]) ||
      raw[key] < 0 ||
      raw[key] > BALANCE.maxNumber
    )
      throw new Error(`Invalid ${key} in save.`);
    state[key] = raw[key];
  }
  for (const key of ["researchPoints", "researchAwarded", "rebuilds", "clicks"])
    if (!Number.isSafeInteger(state[key]))
      throw new Error(`Invalid ${key} in save.`);
  for (const p of PRODUCERS) {
    const n = raw.producers[p.id];
    if (!Number.isSafeInteger(n) || n < 0 || n > BALANCE.maxOwned)
      throw new Error("Invalid producer count.");
    state.producers[p.id] = n;
  }
  state.upgrades = ids(raw.upgrades, UPGRADES);
  state.research = ids(raw.research, RESEARCH);
  const spent = RESEARCH.filter((r) => state.research.includes(r.id)).reduce(
    (n, r) => n + r.cost,
    0,
  );
  if (
    state.researchPoints + spent !== state.researchAwarded ||
    state.researchAwarded >
      Math.floor(Math.sqrt(state.lifetimeObsidian / BALANCE.researchThreshold))
  )
    throw new Error("Research accounting is inconsistent.");
  if (
    state.obsidian > state.lifetimeObsidian ||
    state.runObsidian > state.lifetimeObsidian
  )
    throw new Error("Production accounting is inconsistent.");
  state.unlockedProducers = [
    ...new Set(["tray", ...ids(raw.unlockedProducers, PRODUCERS)]),
  ];
  state.completedObjectives = ids(raw.completedObjectives, OBJECTIVES);
  if (envelope.version >= 2) {
    if (
      !Number.isSafeInteger(raw.upgradeParts) ||
      raw.upgradeParts < 0 ||
      !Array.isArray(raw.claimedGoals) ||
      raw.claimedGoals.length > GOALS.length ||
      ids(raw.claimedGoals, GOALS).length !== raw.claimedGoals.length
    )
      throw new Error("Invalid goal rewards in save.");
    state.upgradeParts = raw.upgradeParts;
    state.claimedGoals = [...raw.claimedGoals];
    for (const p of PRODUCERS) {
      const count = raw.bestOwned?.[p.id];
      if (
        !Number.isSafeInteger(count) ||
        count < state.producers[p.id] ||
        count > BALANCE.maxOwned
      )
        throw new Error("Invalid equipment record in save.");
      state.bestOwned[p.id] = count;
    }
    for (const mod of MODIFICATIONS) {
      const level = raw.modifications?.[mod.id];
      if (
        !Number.isSafeInteger(level) ||
        level < 0 ||
        level > MODIFICATION_COSTS.length ||
        (level > 0 && state.bestOwned[mod.producer] < 1)
      )
        throw new Error("Invalid modification in save.");
      state.modifications[mod.id] = level;
    }
    // Inserted goals create valid holes in older histories; validate each claim
    // and its ledger, not a prefix of today's catalog.
    const claimed = GOALS.filter((g) => state.claimedGoals.includes(g.id));
    if (
      claimed.some((g) => goalValue(state, g) < g.target) ||
      claimed.reduce((sum, g) => sum + g.reward, 0) !==
        state.upgradeParts + modificationSpending(state)
    )
      throw new Error("Upgrade Parts accounting is inconsistent.");
  }
  state.automation =
    raw.automation === true && state.research.includes("automatic");
  for (const key of Object.keys(state.settings))
    if (typeof raw.settings?.[key] === "boolean")
      state.settings[key] = raw.settings[key];
  state.lastSimulatedAt = Number.isFinite(raw.lastSimulatedAt)
    ? Math.max(0, Math.min(now, raw.lastSimulatedAt))
    : now;
  state.lastSavedAt = Number.isFinite(raw.lastSavedAt)
    ? Math.max(0, Math.min(now, raw.lastSavedAt))
    : null;
  state.numericLimit = raw.numericLimit === true;
  reconcile(state);
  return state;
}

export function exportSave(state, now = Date.now()) {
  return JSON.stringify({
    edition: EDITION,
    version: SAVE_VERSION,
    savedAt: now,
    data: state,
  });
}

export function createSaveStore(storage, now = () => Date.now()) {
  let protectedSave = false;
  function load() {
    try {
      const raw = storage.getItem(SAVE_KEY);
      if (raw === null)
        return {
          state: createFreshState(now()),
          error: null,
          recovered: false,
        };
      try {
        return { state: parseSave(raw, now()), error: null, recovered: false };
      } catch (error) {
        protectedSave = true;
        try {
          const backup = storage.getItem(BACKUP_KEY);
          if (backup)
            return {
              state: parseSave(backup, now()),
              error:
                "Recovered a backup. Automatic saving is paused until you keep it.",
              recovered: true,
            };
        } catch {}
        return {
          state: createFreshState(now()),
          error: `${error.message} Automatic saving is paused. Export progress before resetting or importing.`,
          recovered: false,
        };
      }
    } catch {
      protectedSave = true;
      return {
        state: createFreshState(now()),
        error:
          "Storage is unavailable. Progress is in memory only; export it before leaving.",
        recovered: false,
      };
    }
  }
  function save(state, explicit = false) {
    if (protectedSave && !explicit)
      return {
        ok: false,
        error:
          "Saving is paused to protect the existing save. Export, import, or explicitly keep the recovered backup.",
      };
    try {
      const raw = storage.getItem(SAVE_KEY);
      if (raw !== null) {
        if (explicit) storage.setItem(RECOVERY_KEY, raw);
        else {
          parseSave(raw, now());
          if (JSON.parse(raw).version < SAVE_VERSION)
            storage.setItem(RECOVERY_KEY, raw);
          storage.setItem(BACKUP_KEY, raw);
        }
      }
      const savedAt = now();
      const payload = exportSave({ ...state, lastSavedAt: savedAt }, savedAt);
      storage.setItem(SAVE_KEY, payload);
      state.lastSavedAt = savedAt;
      protectedSave = false;
      return { ok: true, error: null };
    } catch {
      return {
        ok: false,
        error:
          "Save failed. Existing progress was not replaced. Export your current progress before leaving.",
      };
    }
  }
  return {
    load,
    save: (state) => save(state),
    replace: (state) => save(state, true),
  };
}
