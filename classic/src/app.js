import {
  GENERATORS,
  MIN_OFFLINE_SECONDS,
  RIFTWORK,
  SAVE_KEY,
  SAVE_VERSION,
  UPGRADES,
} from "./content.js";
import {
  createFreshState,
  deriveModifiers,
  formatDuration,
  formatNumber,
  getAcclaimCount,
  getAcclaimMultiplier,
  getAllProductionMultiplier,
  getAvailableEchoes,
  getClickPower,
  getClickRiftworkMultiplier,
  getGeneratorBatchCost,
  getGeneratorContribution,
  getGeneratorRiftworkMultiplier,
  getOwned,
  getPassiveRate,
  getProductionMultiplier,
  getResonanceMultiplier,
  getTotalGeneratorsOwned,
  getVisibleGenerators,
  getVisibleUpgrades,
} from "./economy.js";
import {
  exportSave,
  getNewestActivityTime,
  importSave,
  loadSavedState,
  saveState as persistState,
  replaceSave,
} from "./persistence.js";
import { createUI } from "./ui.js";
import { getNextDiscoveries } from "./progression.js";
import { createAudioEngine } from "./audio.js";
import {
  getActiveChallenge,
  reconcileLongTerm,
} from "./long-term.js";
import { applyCommand, advanceSimulation, advanceTo } from "./core.js";

const DISPLAY_INTERVAL_MS = 100;
const AUTO_SAVE_SECONDS = 15;
const PRESS_FEEDBACK_MS = 95;
const LOGO_SRC = "assets/obsidian-winds-logo.png";

let loaded;
let state = createFreshState();
let writer = false;
let lastSaveError = null;
let lastTick = performance.now();
let lastDisplayAt = 0;
let autoSaveTimer = 0;
let pressFeedbackTimer = null;
let forceRender = true;
let gameRandom = Math.random;
let manualTestClock = false;
let initialized = false;

const ui = createUI(() => state, {
  buyGenerator,
  buyUpgrade,
  buyRiftwork,
  requestRender,
  updateSetting,
  selectAttunement,
  unlockAspect,
  toggleAspect,
  setProjectAllocation,
  startChallenge,
  abandonChallenge,
  configureAutomation: (key, value) => { if (command("automation", { key, value }).ok) { saveState(); requestRender(true); } },
  expansionCommand: (type, fields) => { if (command(type, fields).ok) { saveState(); requestRender(true); } },
  objectiveAdvanced: () => audio.objective(),
});
const audio = createAudioEngine(() => state);

if (navigator.locks) {
  navigator.locks.request("obsidian-clicker-writer", { ifAvailable: true }, async (lock) => {
    writer = Boolean(lock);
    initialize();
    if (lock) await new Promise((resolve) => window.addEventListener("pagehide", () => { saveState(); writer = false; resolve(); }, { once: true }));
  }).catch(() => { writer = false; initialize(); });
} else initialize();

window.addEventListener("storage", (event) => {
  if (!writer && event.key === SAVE_KEY && event.newValue) {
    try { state = importSave(event.newValue); requestRender(true); } catch { /* Keep the last readable snapshot. */ }
  }
});

function command(type, fields = {}) {
  if (!writer) return { ok: false };
  return applyCommand(state, { type, ...fields }, { now: state.lastSimulatedAt || Date.now(), random: gameRandom });
}

function saveState() {
  if (!writer) return { error: new Error("Read-only tab") };
  const result = persistState(state);
  lastSaveError = result.error?.message || null;
  ui.setSaveStatus(lastSaveError ? `Not saved: ${lastSaveError}` : `Saved ${formatSaveTime(state.lastSavedAt)}`);
  updateSessionNotice();
  return result;
}

function updateSessionNotice() {
  const notice = document.querySelector("#session-status");
  notice.hidden = writer && !lastSaveError;
  notice.textContent = !writer ? navigator.locks ? "Read-only tab. Close the other game tab and reload to play." : "This browser lacks safe multi-tab saving. Use a browser with Web Locks to play." : lastSaveError ? "Progress is not saved. Open Menu to export a backup or recover your save." : "";
}

function initialize() {
  if (initialized) return;
  initialized = true;
  loaded = writer ? loadSavedState() : loadSavedState({ getItem: (key) => localStorage.getItem(key), setItem: () => {} });
  state = loaded.state;
  const newestActivityAt = getNewestActivityTime(state);
  if (loaded.error) addLog(loaded.recovered ? "Backup recovered. Original save protected; export or import to keep this recovery." : "Original save protected. Progress is in memory until you explicitly import or reset.");
  if (loaded.migrated) addLog("Your earlier save was migrated to the current format.");

  const offlineReport = writer ? applyOfflineProgress(newestActivityAt) : null;
  state.lastSimulatedAt ||= Date.now();
  reconcileLongTerm(state);
  saveState();

  ui.els.logoImg.src = LOGO_SRC;
  ui.els.logoImg.addEventListener("error", () => ui.els.logoButton.classList.add("logo-missing"));
  ui.els.logoButton.addEventListener("click", handleLogoClick);
  ui.els.windRiftButton.addEventListener("click", handleWindRiftClaim);
  ui.els.enterRiftBtn.addEventListener("click", enterRift);
  document.querySelector("#save-btn").addEventListener("click", manualSave);
  document.querySelector("#reset-btn").addEventListener("click", resetGame);
  document.querySelector("#export-save-btn").addEventListener("click", downloadSave);
  document.querySelector("#import-save-btn").addEventListener("click", () => document.querySelector("#import-save-input").click());
  document.querySelector("#import-save-input").addEventListener("change", handleImportFile);
  const recoveryButton = document.querySelector("#recover-save-btn");
  recoveryButton.hidden = !writer || !loaded.recovered;
  recoveryButton.addEventListener("click", () => {
    if (!writer || !window.confirm("Keep this recovered progress? The unreadable original will remain in the recovery slot.")) return;
    const result = replaceSave(state);
    if (result.error) { ui.setSaveStatus(`Recovery failed: ${result.error.message}`); return; }
    lastSaveError = null;
    recoveryButton.hidden = true;
    saveState();
  });
  document.querySelector("#offline-continue-btn").addEventListener("click", () => ui.els.offlineDialog.close());
  document.addEventListener("visibilitychange", handleVisibilityChange);
  document.addEventListener("keydown", handleGlobalKeydown);
  window.addEventListener("pointerdown", () => { if (writer) audio.syncMusic(); }, { once: true });
  window.addEventListener("keydown", () => { if (writer) audio.syncMusic(); }, { once: true });
  window.addEventListener("pagehide", () => saveState());
  window.addEventListener("beforeunload", () => saveState());

  ui.render(true);
  ui.showOfflineReport(offlineReport);
  if (!writer) ui.setSaveStatus("Read-only: close the other game tab and reload to play.");
  updateSessionNotice();
  requestAnimationFrame(tick);
  audio.syncMusic();
}

function handleLogoClick(event) {
  const result = command("click");
  if (!result.ok) return;
  const amount = result.amount;
  ui.spawnFloat(amount, normalizedPointerEvent(event), result.critical);
  pulseLogo();
  if (result.critical) {
    addLog(`Critical Gust: ${formatNumber(amount)} Shards.`);
    audio.critical();
  } else {
    audio.click();
  }
  requestRender();
}

function normalizedPointerEvent(event) {
  if (event.clientX || event.clientY) return event;
  const bounds = ui.els.logoButton.getBoundingClientRect();
  return { clientX: bounds.left + bounds.width / 2, clientY: bounds.top + bounds.height / 2 };
}

function pulseLogo() {
  window.clearTimeout(pressFeedbackTimer);
  ui.els.logoButton.classList.remove("is-pressed");
  void ui.els.logoButton.offsetWidth;
  ui.els.logoButton.classList.add("is-pressed");
  pressFeedbackTimer = window.setTimeout(() => ui.els.logoButton.classList.remove("is-pressed"), PRESS_FEEDBACK_MS);
}

function tick(now) {
  const deltaSeconds = Math.max(0, (now - lastTick) / 1000);
  lastTick = now;
  if (writer && !document.hidden && !manualTestClock) update(deltaSeconds);

  if (forceRender || now - lastDisplayAt >= DISPLAY_INTERVAL_MS) {
    ui.render(forceRender);
    audio.syncProduction();
    forceRender = false;
    lastDisplayAt = now;
  }
  requestAnimationFrame(tick);
}

function update(deltaSeconds) {
  const report = advanceTo(state, Date.now(), { random: gameRandom, offline: deltaSeconds > 5 });
  const activeEvents = report?.events || [];
  if (activeEvents.includes("riftSpawned")) {
    addLog("A Wind Rift has opened near the sigil.");
    audio.rift();
  }
  autoSaveTimer += deltaSeconds;
  if (autoSaveTimer >= AUTO_SAVE_SECONDS) {
    autoSaveTimer = 0;
    saveState();
  }
}

function setProjectAllocation(value) {
  if (!command("allocation", { value: Number(value) }).ok) return;
  saveState();
  requestRender(true);
}

function startChallenge(id) {
  const challenge = getActiveChallenge({ ...state, activeChallenge: id });
  if (!challenge || !window.confirm(`Begin ${challenge.name}? This resets current-run Shards, generators, and temporary upgrades.`)) return;
  if (!command("startChallenge", { id }).ok) return;
  saveState();
  requestRender(true);
}

function abandonChallenge() {
  if (!state.activeChallenge || !window.confirm("Abandon the current challenge? Current run progress will remain, but the restriction and reward attempt will end.")) return;
  if (!command("abandonChallenge").ok) return;
  saveState();
  requestRender(true);
}

function unlockAspect(id) {
  if (!command("unlockAspect", { id }).ok) return;
  addLog("A new Rift Aspect has been unlocked.");
  audio.purchase();
  saveState();
  requestRender(true);
}

function toggleAspect(id) {
  if (!command("toggleAspect", { id }).ok) return;
  saveState();
  requestRender(true);
}

function handleWindRiftClaim() {
  const result = command("claimWindRift");
  if (!result.ok) return;
  addLog(`${result.definition.name}: ${result.definition.description}`);
  audio.rift();
  saveState();
  requestRender(true);
}

function updateSetting(key, value) {
  if (!writer) return;
  if (!(key in state.settings)) return;
  state.settings[key] = Boolean(value);
  audio.syncMusic();
  saveState();
  requestRender(true);
}

function selectAttunement(id) {
  if (!command("attunement", { id }).ok) return;
  saveState();
  requestRender(true);
}

function buyGenerator(id, mode) {
  const generator = GENERATORS.find((item) => item.id === id);
  const result = command("buyGenerator", { id, amount: mode });
  if (!result.ok) return;
  const { amount } = result;
  addLog(`Bought ${formatNumber(amount)} ${generator.name}${amount === 1 ? "" : "s"}.`);
  ui.announce(`${generator.name} purchased. Owned ${formatNumber(state.generatorCounts[id])}.`);
  audio.purchase();
  saveState();
  requestRender(true);
}

function buyUpgrade(id) {
  const upgrade = UPGRADES.find((item) => item.id === id);
  if (!command("buyUpgrade", { id }).ok) return;
  addLog(`Upgraded: ${upgrade.name}.`);
  ui.announce(`${upgrade.name} purchased.`);
  audio.purchase();
  saveState();
  requestRender(true);
}

function buyRiftwork(id) {
  const upgrade = RIFTWORK.find((item) => item.id === id);
  if (!command("buyRiftwork", { id }).ok) return;
  addLog(`Riftwork etched: ${upgrade.name}.`);
  ui.announce(`${upgrade.name} etched into permanent Riftwork.`);
  audio.purchase();
  saveState();
  requestRender(true);
}

function enterRift() {
  const echoesGained = getAvailableEchoes(state);
  if (echoesGained <= 0 || state.activeChallenge || !writer) return;
  const message = `Enter the Rift? This will dissolve your current Shards, generators, and temporary upgrades into ${formatNumber(echoesGained)} Echo${echoesGained === 1 ? "" : "es"}.`;
  if (!window.confirm(message)) return;
  if (!command("rift").ok) return;
  ui.announce(`Rift entered. ${formatNumber(echoesGained)} Echoes gathered.`);
  audio.prestige();
  saveState();
  requestRender(true);
}

function applyOfflineProgress(activityAt) {
  if (!Number.isFinite(activityAt) || activityAt <= 0) return null;
  const report = advanceTo(state, Date.now(), { offline: true, random: gameRandom });
  if (!report) return null;
  const { creditedSeconds, rate, gain } = report;
  if (gain > 0) {
    state.bestPassiveRate = Math.max(state.bestPassiveRate, rate);
    addLog(`The storm gathered ${formatNumber(gain)} Shards over ${formatDuration(creditedSeconds)}.`);
  }
  return report.elapsedSeconds >= MIN_OFFLINE_SECONDS ? report : null;
}

function handleVisibilityChange() {
  if (!writer) return;
  if (document.hidden) {
    advanceTo(state, Date.now(), { random: gameRandom, offline: Date.now() - state.lastSimulatedAt > 5000 });
    saveState();
    return;
  }
  const report = applyOfflineProgress(state.lastSimulatedAt);
  lastTick = performance.now();
  saveState();
  ui.showOfflineReport(report);
  requestRender(true);
}

function manualSave() {
  if (!saveState().error) addLog("Progress saved.");
}

function handleGlobalKeydown(event) {
  if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;
  const key = event.key.toLowerCase();
  if (key === " " && target === document.body) {
    event.preventDefault();
    ui.els.logoButton.click();
  }
  if (key === "m") {
    const menu = document.querySelector("#top-menu");
    menu.open = !menu.open;
    menu.querySelector("summary")?.focus();
  }
  if (key === "s") manualSave();
  if (key === "f") toggleFullscreen();
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.();
}

function downloadSave() {
  const blob = new Blob([exportSave(state)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `obsidian-clicker-save-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  ui.setSaveStatus("Save exported");
}

async function handleImportFile(event) {
  if (!writer) return;
  const [file] = event.target.files;
  event.target.value = "";
  if (!file) return;
  try {
    if (file.size > 2_000_000) throw new Error("Save too large");
    const imported = importSave(await file.text());
    if (!window.confirm("Import this save and replace the current local progress?")) return;
    imported.lastSimulatedAt = Date.now();
    const result = replaceSave(imported);
    if (result.error) throw result.error;
    state = imported;
    lastSaveError = null;
    manualTestClock = false;
    document.querySelector("#recover-save-btn").hidden = true;
    updateSessionNotice();
    addLog("Imported progress loaded.");
    audio.syncMusic();
    ui.setSaveStatus("Imported and saved");
    requestRender(true);
  } catch (error) {
    ui.setSaveStatus("Import failed: invalid save file");
  }
}

function resetGame() {
  if (!writer) return;
  if (!window.confirm("Reset all Obsidian Clicker progress? This also clears Echoes, Resonance, and Riftwork.")) return;
  const fresh = createFreshState();
  fresh.lastSimulatedAt = Date.now();
  const result = replaceSave(fresh);
  if (result.error) { ui.setSaveStatus(`Reset failed: ${result.error.message}`); return; }
  state = fresh;
  lastSaveError = null;
  manualTestClock = false;
  document.querySelector("#recover-save-btn").hidden = true;
  updateSessionNotice();
  audio.syncMusic();
  addLog("Progress reset.");
  ui.setSaveStatus("Progress reset");
  requestRender(true);
}

function requestRender(structural = false) {
  forceRender = forceRender || structural;
}

function addLog(message) {
  state.log.push(message);
  state.log = state.log.slice(-20);
}

function formatSaveTime(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "now";
}

function renderGameToText() {
  const modifiers = deriveModifiers(state);
  const passiveRate = getPassiveRate(state, modifiers);
  return JSON.stringify({
    coordinateSystem: "DOM layout; click target is #logo-button; origin top-left, x right, y down.",
    saveVersion: SAVE_VERSION,
    shards: Number(state.shards.toFixed(2)),
    lifetimeShards: Number(state.lifetimeShards.toFixed(2)),
    totalClicks: state.totalClicks,
    momentum: Number(state.momentum.toFixed(2)),
    momentumMultiplier: Number((1 + state.momentum / 100).toFixed(3)),
    criticalGusts: state.criticalGusts,
    windRiftsClaimed: state.windRiftsClaimed,
    activeWindRift: state.activeWindRift ? { ...state.activeWindRift } : null,
    clickSurgeSeconds: Number(state.clickSurgeSeconds.toFixed(2)),
    productionSurgeSeconds: Number(state.productionSurgeSeconds.toFixed(2)),
    attunement: state.attunement,
    pendingAttunement: state.pendingAttunement,
    unlockedAspects: [...state.unlockedAspects],
    activeAspects: [...state.activeAspects],
    pendingAspects: [...state.pendingAspects],
    peakRunPassiveRate: state.peakRunPassiveRate,
    runHistory: state.runHistory.map((run) => ({ ...run, aspects: [...run.aspects] })),
    settings: { ...state.settings },
    achievementsCompleted: Object.keys(state.achievementDates).length,
    achievementDates: { ...state.achievementDates },
    project: { id: state.projectId, stage: state.projectStage, progress: state.projectProgress, allocation: state.projectAllocation, completedStages: state.completedWorkStages },
    activeChallenge: state.activeChallenge,
    completedChallenges: [...state.completedChallenges],
    chronicleEntries: state.chronicleEntries.map((entry) => ({ ...entry })),
    campaignComplete: state.campaignComplete,
    chapters: { one: state.campaignComplete, two: state.chapterTwoComplete, three: state.chapterThreeComplete },
    mastery: state.mastery,
    masteryTokens: state.masteryTokens,
    extendedWorks: state.extendedWorks,
    expeditions: { completed: state.expeditionsCompleted, materials: state.expeditionMaterials, active: state.activeExpedition ? { type: state.activeExpedition.type, tier: state.activeExpedition.tier, shards: state.activeExpedition.state.runShards, seconds: state.activeExpedition.seconds } : null, records: state.expeditionRecords },
    automation: state.automation,
    pinnedObjective: state.pinnedObjective,
    echoes: state.echoes,
    totalEchoesEarned: state.totalEchoesEarned,
    resonance: state.resonance,
    purchasedRiftwork: [...state.purchasedRiftwork],
    availableEchoes: getAvailableEchoes(state),
    resonanceMultiplier: getResonanceMultiplier(state),
    allProductionMultiplier: getAllProductionMultiplier(state, modifiers),
    clickRiftworkMultiplier: getClickRiftworkMultiplier(state),
    generatorRiftworkMultiplier: getGeneratorRiftworkMultiplier(state),
    productionMultiplier: getProductionMultiplier(state, modifiers),
    riftEntries: state.riftEntries,
    lastOfflineShards: state.lastOfflineShards,
    lastOfflineSeconds: state.lastOfflineSeconds,
    lastOfflineCreditedSeconds: state.lastOfflineCreditedSeconds,
    clickPower: getClickPower(state, modifiers),
    clickCpsPercent: modifiers.clickCpsPercent,
    passiveRate: Number(passiveRate.toFixed(2)),
    visibleGeneratorIds: getVisibleGenerators(state).map((generator) => generator.id),
    generators: GENERATORS.map((generator) => ({
      id: generator.id,
      name: generator.name,
      owned: getOwned(state, generator.id),
      cost: getGeneratorBatchCost(state, generator, 1),
      baseRate: generator.baseRate,
      contribution: getGeneratorContribution(state, generator, modifiers),
      contributionPercent: passiveRate > 0 ? (getGeneratorContribution(state, generator, modifiers) / passiveRate) * 100 : 0,
      affordable: state.shards >= getGeneratorBatchCost(state, generator, 1),
    })),
    availableUpgrades: getVisibleUpgrades(state, modifiers).map((upgrade) => ({ id: upgrade.id, name: upgrade.name, cost: upgrade.cost, affordable: state.shards >= upgrade.cost })),
    purchasedUpgrades: [...state.purchasedUpgrades],
    saved: Boolean(state.lastSavedAt) && !lastSaveError,
    saveError: lastSaveError,
    readOnly: !writer,
    acclaim: getAcclaimCount(state),
    acclaimMultiplier: getAcclaimMultiplier(state),
    globalMultiplier: modifiers.globalMultiplier,
    expandedUpgradeCount: UPGRADES.length,
    expandedRiftworkCount: RIFTWORK.length,
    totalGeneratorsOwned: getTotalGeneratorsOwned(state),
    nextDiscoveries: getNextDiscoveries(state),
    selectedBuyMode: ui.getSelectedBuyMode(),
    selectedUpgradeTab: ui.getSelectedUpgradeTab(),
    selectedRecordTab: ui.getSelectedRecordTab(),
    logoSrc: LOGO_SRC,
    logoFallbackVisible: ui.els.logoButton.classList.contains("logo-missing"),
    logoEvolution: { tier: Number(ui.els.logoStage.dataset.evolution), title: ui.els.sigilTitle.textContent, voices: ui.els.generatorVoices.children.length },
    firstRunObjective: ui.els.firstRunObjective.hidden ? null : ui.els.objectiveTitle.textContent,
  });
}

window.render_game_to_text = renderGameToText;
window.advanceTime = (ms) => {
  if (!writer) return;
  advanceSimulation(state, ms, { random: gameRandom });
  if (ms > 0) manualTestClock = true;
  ui.render(true);
};
window.force_wind_rift = (type = "clickSurge") => {
  if (!writer) return;
  state.activeWindRift = { type, seconds: 12 };
  state.nextWindRiftIn = 60;
  requestRender(true);
};
window.set_game_random = (value) => {
  if (!Number.isFinite(Number(value))) throw new RangeError("Random value must be finite");
  const fixed = Math.max(0, Math.min(1, Number(value)));
  gameRandom = () => fixed;
};
window.addEventListener("pageshow", (event) => { if (event.persisted) location.reload(); });
