import {
  GENERATORS,
  HEARTBEAT_KEY,
  MIN_OFFLINE_SECONDS,
  RIFTWORK,
  SAVE_KEY,
  UPGRADES,
} from "./content.js";
import {
  createFreshState,
  createRiftState,
  deriveModifiers,
  formatDuration,
  formatNumber,
  getAcclaimCount,
  getAcclaimMultiplier,
  getAffordableGeneratorAmount,
  getAllProductionMultiplier,
  getAvailableEchoes,
  getClickPower,
  getClickRiftworkMultiplier,
  getGeneratorBatchCost,
  getGeneratorContribution,
  getGeneratorRiftworkMultiplier,
  getOfflineProgress,
  getOwned,
  getPassiveRate,
  getPotentialResonance,
  getProductionMultiplier,
  getResonanceMultiplier,
  getTotalGeneratorsOwned,
  getVisibleGenerators,
  getVisibleUpgrades,
  isUpgradeUnlocked,
} from "./economy.js";
import {
  exportSave,
  getNewestActivityTime,
  importSave,
  loadSavedState,
  saveState,
  startHeartbeat,
} from "./persistence.js";
import { createUI } from "./ui.js";
import { getNextDiscoveries } from "./progression.js";
import { claimWindRift, registerActiveClick, setAttunement, updateActivePlay } from "./active-play.js";
import { createAudioEngine } from "./audio.js";
import { togglePendingAspect, unlockAspect as unlockRiftAspect } from "./rift-strategy.js";
import {
  abandonChallenge as abandonLongTermChallenge,
  canBuyGenerator,
  discoverGenerator,
  getActiveChallenge,
  investInWork,
  reconcileLongTerm,
  setProjectAllocation as setLongTermAllocation,
  startChallenge as startLongTermChallenge,
} from "./long-term.js";

const DISPLAY_INTERVAL_MS = 100;
const AUTO_SAVE_SECONDS = 15;
const PRESS_FEEDBACK_MS = 95;
const LOGO_SRC = "assets/obsidian-winds-logo.png";

const loaded = loadSavedState();
let state = loaded.state;
let lastTick = performance.now();
let lastDisplayAt = 0;
let autoSaveTimer = 0;
let pressFeedbackTimer = null;
let forceRender = true;
let gameRandom = Math.random;

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
  objectiveAdvanced: () => audio.objective(),
});
const audio = createAudioEngine(() => state);

initialize();

function initialize() {
  const newestActivityAt = getNewestActivityTime(state);
  if (loaded.error) addLog("The previous save could not be read. A fresh storm has begun.");
  if (loaded.migrated) addLog("Your earlier save was migrated to the current format.");

  const offlineReport = applyOfflineProgress(newestActivityAt);
  reconcileLongTerm(state);
  saveState(state);
  startHeartbeat();

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
  document.querySelector("#offline-continue-btn").addEventListener("click", () => ui.els.offlineDialog.close());
  document.addEventListener("visibilitychange", handleVisibilityChange);
  document.addEventListener("keydown", handleGlobalKeydown);
  window.addEventListener("pagehide", () => saveState(state));
  window.addEventListener("beforeunload", () => saveState(state));

  ui.render(true);
  ui.showOfflineReport(offlineReport);
  ui.setSaveStatus(`Saved ${formatSaveTime(state.lastSavedAt)}`);
  requestAnimationFrame(tick);
  audio.syncMusic();
}

function handleLogoClick(event) {
  state.totalClicks += 1;
  const result = registerActiveClick(state, Date.now(), gameRandom);
  const amount = getClickPower(state) * result.multiplier;
  gainShards(amount);
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
  const deltaSeconds = Math.min(1, (now - lastTick) / 1000);
  lastTick = now;
  update(deltaSeconds);

  if (forceRender || now - lastDisplayAt >= DISPLAY_INTERVAL_MS) {
    ui.render(forceRender);
    audio.syncProduction();
    forceRender = false;
    lastDisplayAt = now;
  }
  requestAnimationFrame(tick);
}

function update(deltaSeconds) {
  const activeEvents = updateActivePlay(state, deltaSeconds, gameRandom);
  if (activeEvents.includes("riftSpawned")) {
    addLog("A Wind Rift has opened near the sigil.");
    audio.rift();
  }
  const rate = getPassiveRate(state);
  if (rate > 0) {
    const grossProduction = rate * deltaSeconds;
    const projectBase = grossProduction * state.projectAllocation;
    gainShards(grossProduction - projectBase);
    investInWork(state, projectBase);
    state.bestPassiveRate = Math.max(state.bestPassiveRate, rate);
    state.peakRunPassiveRate = Math.max(state.peakRunPassiveRate, rate);
  }
  reconcileLongTerm(state);

  autoSaveTimer += deltaSeconds;
  if (autoSaveTimer >= AUTO_SAVE_SECONDS) {
    autoSaveTimer = 0;
    saveState(state);
    ui.setSaveStatus(`Autosaved ${formatSaveTime(state.lastSavedAt)}`);
  }
}

function setProjectAllocation(value) {
  setLongTermAllocation(state, Number(value));
  saveState(state);
  requestRender(true);
}

function startChallenge(id) {
  const challenge = getActiveChallenge({ ...state, activeChallenge: id });
  if (!challenge || !window.confirm(`Begin ${challenge.name}? This resets current-run Shards, generators, and temporary upgrades.`)) return;
  if (!startLongTermChallenge(state, id)) return;
  saveState(state);
  requestRender(true);
}

function abandonChallenge() {
  if (!state.activeChallenge || !window.confirm("Abandon the current challenge? Current run progress will remain, but the restriction and reward attempt will end.")) return;
  abandonLongTermChallenge(state);
  saveState(state);
  requestRender(true);
}

function unlockAspect(id) {
  if (!unlockRiftAspect(state, id)) return;
  addLog("A new Rift Aspect has been unlocked.");
  audio.purchase();
  saveState(state);
  requestRender(true);
}

function toggleAspect(id) {
  if (!togglePendingAspect(state, id)) return;
  saveState(state);
  requestRender(true);
}

function handleWindRiftClaim() {
  const result = claimWindRift(state, getPassiveRate(state), gameRandom);
  if (!result) return;
  if (result.bounty > 0) gainShards(result.bounty);
  addLog(`${result.definition.name}: ${result.definition.description}`);
  audio.rift();
  saveState(state);
  requestRender(true);
}

function updateSetting(key, value) {
  if (!(key in state.settings)) return;
  state.settings[key] = Boolean(value);
  audio.syncMusic();
  saveState(state);
  requestRender(true);
}

function selectAttunement(id) {
  setAttunement(state, id);
  saveState(state);
  requestRender(true);
}

function gainShards(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return;
  state.shards += amount;
  state.runShards += amount;
  state.lifetimeShards += amount;
}

function buyGenerator(id, mode) {
  const generator = GENERATORS.find((item) => item.id === id);
  if (!generator || !canBuyGenerator(state, id)) return;
  const amount = mode === "max" ? getAffordableGeneratorAmount(state, generator) : Number(mode);
  const cost = getGeneratorBatchCost(state, generator, amount);
  if (!Number.isFinite(cost) || amount <= 0 || cost > state.shards) return;

  state.shards -= cost;
  state.generatorCounts[id] = getOwned(state, id) + amount;
  discoverGenerator(state, generator);
  addLog(`Bought ${formatNumber(amount)} ${generator.name}${amount === 1 ? "" : "s"}.`);
  ui.announce(`${generator.name} purchased. Owned ${formatNumber(state.generatorCounts[id])}.`);
  audio.purchase();
  saveState(state);
  requestRender(true);
}

function buyUpgrade(id) {
  const upgrade = UPGRADES.find((item) => item.id === id);
  if (!upgrade || state.purchasedUpgrades.includes(id)) return;
  const modifiers = deriveModifiers(state);
  if (!isUpgradeUnlocked(state, upgrade, modifiers) || state.shards < upgrade.cost) return;

  state.shards -= upgrade.cost;
  state.purchasedUpgrades.push(id);
  reconcileLongTerm(state);
  addLog(`Upgraded: ${upgrade.name}.`);
  ui.announce(`${upgrade.name} purchased.`);
  audio.purchase();
  saveState(state);
  requestRender(true);
}

function buyRiftwork(id) {
  const upgrade = RIFTWORK.find((item) => item.id === id);
  if (!upgrade || state.purchasedRiftwork.includes(id) || state.echoes < upgrade.cost) return;
  state.echoes -= upgrade.cost;
  state.purchasedRiftwork.push(id);
  addLog(`Riftwork etched: ${upgrade.name}.`);
  ui.announce(`${upgrade.name} etched into permanent Riftwork.`);
  audio.purchase();
  saveState(state);
  requestRender(true);
}

function enterRift() {
  const echoesGained = getAvailableEchoes(state);
  if (echoesGained <= 0) return;
  const message = `Enter the Rift? This will dissolve your current Shards, generators, and temporary upgrades into ${formatNumber(echoesGained)} Echo${echoesGained === 1 ? "" : "es"}.`;
  if (!window.confirm(message)) return;
  state = createRiftState(state, echoesGained);
  ui.announce(`Rift entered. ${formatNumber(echoesGained)} Echoes gathered.`);
  audio.prestige();
  saveState(state);
  requestRender(true);
}

function applyOfflineProgress(activityAt) {
  if (!Number.isFinite(activityAt) || activityAt <= 0) return null;
  const elapsedSeconds = Math.floor(Math.max(0, (Date.now() - activityAt) / 1000));
  if (elapsedSeconds < MIN_OFFLINE_SECONDS) return null;
  const report = getOfflineProgress(state, elapsedSeconds);
  const { creditedSeconds, rate, gain } = report;
  state.lastOfflineSeconds = elapsedSeconds;
  state.lastOfflineCreditedSeconds = creditedSeconds;
  state.lastOfflineShards = gain;
  if (gain > 0) {
    gainShards(gain);
    investInWork(state, report.projectBase);
    state.bestPassiveRate = Math.max(state.bestPassiveRate, rate);
    addLog(`The storm gathered ${formatNumber(gain)} Shards over ${formatDuration(creditedSeconds)}.`);
  }
  return report;
}

function handleVisibilityChange() {
  if (document.hidden) {
    saveState(state);
    return;
  }
  const report = applyOfflineProgress(Date.parse(state.lastSavedAt || ""));
  saveState(state);
  ui.showOfflineReport(report);
  requestRender(true);
}

function manualSave() {
  addLog("Progress saved.");
  saveState(state);
  ui.setSaveStatus(`Saved ${formatSaveTime(state.lastSavedAt)}`);
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
  const [file] = event.target.files;
  event.target.value = "";
  if (!file) return;
  try {
    const imported = importSave(await file.text());
    if (!window.confirm("Import this save and replace the current local progress?")) return;
    state = imported;
    addLog("Imported progress loaded.");
    saveState(state);
    ui.setSaveStatus("Imported and saved");
    requestRender(true);
  } catch (error) {
    ui.setSaveStatus("Import failed: invalid save file");
  }
}

function resetGame() {
  if (!window.confirm("Reset all Obsidian Clicker progress? This also clears Echoes, Resonance, and Riftwork.")) return;
  state = createFreshState();
  localStorage.removeItem(HEARTBEAT_KEY);
  saveState(state);
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
    saveVersion: 6,
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
    saved: Boolean(localStorage.getItem(SAVE_KEY)),
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
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let index = 0; index < steps; index += 1) update(1 / 60);
  ui.render(true);
};
window.force_wind_rift = (type = "clickSurge") => {
  state.activeWindRift = { type, seconds: 12 };
  state.nextWindRiftIn = 60;
  requestRender(true);
};
window.set_game_random = (value) => {
  const fixed = Math.max(0, Math.min(1, Number(value)));
  gameRandom = () => fixed;
};
