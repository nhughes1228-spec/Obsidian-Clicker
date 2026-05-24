const SAVE_KEY = "obsidian-clicker-save-v1";
const LOGO_SRC = "assets/obsidian-winds-logo.png";

const COST_GROWTH = 1.15;
const PRESS_FEEDBACK_MS = 95;
const RIFT_BASE_SHARDS = 1000000;
const MIN_OFFLINE_SECONDS = 5;

const GENERATORS = [
  { id: "whisperer", name: "Whisperer", description: "Coaxes loose Shards from the edge of the wind.", baseCost: 15, baseRate: 0.1 },
  { id: "galeLoom", name: "Gale Loom", description: "Threads pressure into a steady obsidian draft.", baseCost: 100, baseRate: 1 },
  { id: "obsidianSpire", name: "Obsidian Spire", description: "Anchors the storm and draws Shards through the mark.", baseCost: 1100, baseRate: 8 },
  { id: "stormVault", name: "Storm Vault", description: "Stores a violent weather front behind black glass.", baseCost: 12000, baseRate: 47 },
  { id: "forgeLine", name: "Forge Line", description: "Cuts raw obsidian into a repeatable production ritual.", baseCost: 130000, baseRate: 260 },
  { id: "shardTreasury", name: "Shard Treasury", description: "Compounds every glimmer into a carefully guarded reserve.", baseCost: 1400000, baseRate: 1400 },
  { id: "obsidianShrine", name: "Obsidian Shrine", description: "Turns discipline, breath, and ceremony into Shards.", baseCost: 20000000, baseRate: 7800 },
  { id: "windOracle", name: "Wind Oracle", description: "Reads the pressure changes before they become real.", baseCost: 330000000, baseRate: 44000 },
  { id: "riftCaravan", name: "Rift Caravan", description: "Imports black glass from storms too distant to name.", baseCost: 5100000000, baseRate: 260000 },
  { id: "glassCrucible", name: "Glass Crucible", description: "Boils silence into shine and pressure into profit.", baseCost: 75000000000, baseRate: 1600000 },
  { id: "blackglassPortal", name: "Blackglass Portal", description: "Opens a clean cut through the atmosphere.", baseCost: 1000000000000, baseRate: 10000000 },
  { id: "echoChronometer", name: "Echo Chronometer", description: "Collects Shards a few seconds before they should exist.", baseCost: 14000000000000, baseRate: 65000000 },
  { id: "nullCondenser", name: "Null Condenser", description: "Condenses absence itself into something spendable.", baseCost: 170000000000000, baseRate: 430000000 },
  { id: "midnightPrism", name: "Midnight Prism", description: "Splits one beam of darkness into a thousand clean edges.", baseCost: 2100000000000000, baseRate: 2900000000 },
  { id: "chanceReed", name: "Chance Reed", description: "Bends probability until good fortune squeaks.", baseCost: 26000000000000000, baseRate: 21000000000 },
  { id: "fractalScore", name: "Fractal Score", description: "Repeats the same phrase forever, somehow larger every time.", baseCost: 310000000000000000, baseRate: 150000000000 },
];

const CLICK_UPGRADES = [
  { id: "sharperSigil", name: "Sharper Sigil", description: "Manual clicks carve twice as deeply.", cost: 100, unlock: (state) => state.lifetimeShards >= 50, apply: (state) => { state.clickMultiplier *= 2; } },
  { id: "echoingPalm", name: "Echoing Palm", description: "Each tap leaves a second pressure wave.", cost: 500, unlock: (state) => state.lifetimeShards >= 250, apply: (state) => { state.clickMultiplier *= 2; } },
  { id: "resonantTouch", name: "Resonant Touch", description: "Clicks borrow a small pulse from your passive production.", cost: 10000, unlock: () => getPassiveRate() >= 25, apply: (state) => { state.clickCpsPercent += 0.01; } },
  { id: "conductedPressure", name: "Conducted Pressure", description: "Clicks borrow even more force from the whole ensemble.", cost: 100000, unlock: () => getPassiveRate() >= 250, apply: (state) => { state.clickCpsPercent += 0.01; } },
];

const BUILDING_UPGRADE_TIERS = [
  { milestone: 1, costMultiplier: 10, namePrefix: "Polished", description: "work twice as quickly.", multiplier: 2 },
  { milestone: 5, costMultiplier: 50, namePrefix: "Tempered", description: "find a stronger rhythm and double again.", multiplier: 2 },
  { milestone: 25, costMultiplier: 500, namePrefix: "Honed", description: "lock into a cleaner current and double again.", multiplier: 2 },
  { milestone: 50, costMultiplier: 5000, namePrefix: "Radiant", description: "resonate across the whole stockpile and double again.", multiplier: 2 },
  { milestone: 100, costMultiplier: 50000, namePrefix: "Mythic", description: "become a permanent engine of the storm and double again.", multiplier: 2 },
];

const RIFTWORK = [
  { id: "blackglassConductance", name: "Blackglass Conductance", description: "All Shard production is permanently increased by 5%.", cost: 1, tag: "All +5%" },
  { id: "resonantPalm", name: "Resonant Palm", description: "Manual clicking carries more force. Click production is permanently increased by 15%.", cost: 3, tag: "Clicks +15%" },
  { id: "stormEtching", name: "Storm Etching", description: "Every generator cuts deeper into the storm. Generator production is permanently increased by 15%.", cost: 5, tag: "Generators +15%" },
  { id: "pressureMemory", name: "Pressure Memory", description: "Resonance remembers more clearly. Each Resonance grants 1.1% production instead of 1%.", cost: 10, tag: "Resonance +10%" },
  { id: "fracturedMultiplier", name: "Fractured Multiplier", description: "The Rift leaves a permanent fracture in the math. All Shard production is permanently increased by 25%.", cost: 25, tag: "All +25%" },
];

const UPGRADES = createUpgrades();

const state = createFreshState();
let lastTick = performance.now();
let saveTimer = 0;
let renderQueued = false;
let pressFeedbackTimer = null;
let lastRiftPointerAt = 0;

const els = {
  shardTotal: document.querySelector("#shard-total"),
  rateSummary: document.querySelector("#rate-summary"),
  clickPower: document.querySelector("#click-power"),
  passiveRate: document.querySelector("#passive-rate"),
  logoButton: document.querySelector("#logo-button"),
  logoImg: document.querySelector("#logo-img"),
  floatLayer: document.querySelector("#float-layer"),
  generatorList: document.querySelector("#generator-list"),
  upgradeList: document.querySelector("#upgrade-list"),
  riftPreview: document.querySelector("#rift-preview"),
  riftworkList: document.querySelector("#riftwork-list"),
  enterRiftBtn: document.querySelector("#enter-rift-btn"),
  statisticsList: document.querySelector("#statistics-list"),
  saveBtn: document.querySelector("#save-btn"),
  resetBtn: document.querySelector("#reset-btn"),
};

init();

function createUpgrades() {
  const buildingUpgrades = GENERATORS.flatMap((generator) =>
    BUILDING_UPGRADE_TIERS.map((tier) => ({
      id: `${generator.id}-${tier.milestone}`,
      name: `${tier.namePrefix} ${generator.name}`,
      description: `${generator.name}s ${tier.description}`,
      cost: Math.ceil(generator.baseCost * tier.costMultiplier),
      unlock: (state) => getOwned(state, generator.id) >= tier.milestone,
      apply: (state) => { state.generatorMultipliers[generator.id] *= tier.multiplier; },
    }))
  );

  return [...CLICK_UPGRADES, ...buildingUpgrades].sort((a, b) => a.cost - b.cost);
}

function createFreshState() {
  const generatorCounts = {};
  const generatorMultipliers = {};
  for (const generator of GENERATORS) {
    generatorCounts[generator.id] = 0;
    generatorMultipliers[generator.id] = 1;
  }

  return {
    shards: 0,
    lifetimeShards: 0,
    totalClicks: 0,
    clickMultiplier: 1,
    clickCpsPercent: 0,
    generatorCounts,
    generatorMultipliers,
    purchasedUpgrades: [],
    echoes: 0,
    totalEchoesEarned: 0,
    resonance: 0,
    purchasedRiftwork: [],
    riftEntries: 0,
    bestPassiveRate: 0,
    lastOfflineShards: 0,
    lastOfflineSeconds: 0,
    log: ["The first Shards wait in the wind."],
    lastSavedAt: null,
  };
}

function init() {
  loadGame();
  applyOfflineProgress();
  els.logoImg.src = LOGO_SRC;
  els.logoImg.addEventListener("error", () => {
    els.logoButton.classList.add("logo-missing");
    addLog("Logo missing. Place the final mark at assets/obsidian-winds-logo.png.");
  });

  els.logoButton.addEventListener("pointerdown", handleLogoPress, { passive: false });
  els.enterRiftBtn.addEventListener("pointerdown", handleRiftPress, { passive: false });
  els.enterRiftBtn.addEventListener("click", handleRiftClick);
  els.riftworkList.addEventListener("pointerdown", handleRiftworkPress, { passive: false });
  els.riftworkList.addEventListener("click", handleRiftworkClick);
  els.saveBtn.addEventListener("click", () => {
    saveGame();
    addLog("Progress saved.");
  });
  els.resetBtn.addEventListener("click", resetGame);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("pagehide", saveGame);
  window.addEventListener("beforeunload", saveGame);

  render();
  requestAnimationFrame(tick);
}

function handleVisibilityChange() {
  if (document.hidden) {
    saveGame();
    return;
  }

  applyOfflineProgress();
  render();
}

function applyOfflineProgress() {
  const lastSavedMs = Date.parse(state.lastSavedAt || "");
  if (!Number.isFinite(lastSavedMs)) {
    saveGame();
    return;
  }

  const elapsedSeconds = Math.floor(Math.max(0, (Date.now() - lastSavedMs) / 1000));
  if (elapsedSeconds < MIN_OFFLINE_SECONDS) return;

  const rate = getPassiveRate();
  state.lastOfflineSeconds = elapsedSeconds;

  if (rate <= 0) {
    state.lastOfflineShards = 0;
    saveGame();
    return;
  }

  const offlineGain = rate * elapsedSeconds;
  state.lastOfflineShards = offlineGain;
  state.bestPassiveRate = Math.max(state.bestPassiveRate || 0, rate);
  gainShards(offlineGain);
  addLog(`The storm gathered ${formatNumber(offlineGain)} Shards over ${formatDuration(elapsedSeconds)}.`);
  saveGame();
}

function handleLogoPress(event) {
  event.preventDefault();

  if (event.pointerType === "mouse" && event.button !== 0) return;

  state.totalClicks += 1;
  const amount = getClickPower();
  gainShards(amount);
  spawnFloat(amount, event);
  pulseLogo();
  addLog(`Gathered ${formatNumber(amount)} Shard${amount === 1 ? "" : "s"}.`);
  scheduleRender();
}

function handleRiftPress(event) {
  event.preventDefault();
  event.stopPropagation();

  if (els.enterRiftBtn.disabled) return;
  if (event.pointerType === "mouse" && event.button !== 0) return;

  lastRiftPointerAt = performance.now();
  enterRift();
}

function handleRiftClick(event) {
  if (performance.now() - lastRiftPointerAt < 500) {
    event.preventDefault();
    return;
  }

  enterRift();
}

function handleRiftworkPress(event) {
  const button = event.target.closest("[data-riftwork-id]");
  if (!button) return;

  event.preventDefault();
  event.stopPropagation();

  if (event.pointerType === "mouse" && event.button !== 0) return;
  buyRiftwork(button.dataset.riftworkId);
}

function handleRiftworkClick(event) {
  const button = event.target.closest("[data-riftwork-id]");
  if (!button) return;
  event.preventDefault();
}

function pulseLogo() {
  window.clearTimeout(pressFeedbackTimer);
  els.logoButton.classList.remove("is-pressed");
  void els.logoButton.offsetWidth;
  els.logoButton.classList.add("is-pressed");
  pressFeedbackTimer = window.setTimeout(() => {
    els.logoButton.classList.remove("is-pressed");
  }, PRESS_FEEDBACK_MS);
}

function tick(now) {
  const deltaSeconds = Math.min(1, (now - lastTick) / 1000);
  lastTick = now;
  update(deltaSeconds);
  render();
  requestAnimationFrame(tick);
}

function update(deltaSeconds) {
  const rate = getPassiveRate();
  if (rate > 0) {
    gainShards(rate * deltaSeconds);
    state.bestPassiveRate = Math.max(state.bestPassiveRate || 0, rate);
  }

  saveTimer += deltaSeconds;
  if (saveTimer >= 15) {
    saveTimer = 0;
    saveGame(false);
  }
}

function gainShards(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return;
  state.shards += amount;
  state.lifetimeShards += amount;
}

function hasRiftwork(id) {
  return state.purchasedRiftwork.includes(id);
}

function getResonancePercentPerLevel() {
  return hasRiftwork("pressureMemory") ? 1.1 : 1;
}

function getResonanceMultiplier() {
  return 1 + state.resonance * (getResonancePercentPerLevel() / 100);
}

function getAllProductionMultiplier() {
  let multiplier = 1;
  if (hasRiftwork("blackglassConductance")) multiplier *= 1.05;
  if (hasRiftwork("fracturedMultiplier")) multiplier *= 1.25;
  return multiplier;
}

function getClickRiftworkMultiplier() {
  return hasRiftwork("resonantPalm") ? 1.15 : 1;
}

function getGeneratorRiftworkMultiplier() {
  return hasRiftwork("stormEtching") ? 1.15 : 1;
}

function getProductionMultiplier() {
  return getResonanceMultiplier() * getAllProductionMultiplier();
}

function getClickPower() {
  const cpsClickBonus = getPassiveRate() * state.clickCpsPercent;
  return state.clickMultiplier * getProductionMultiplier() * getClickRiftworkMultiplier() + cpsClickBonus;
}

function getPassiveRate() {
  return GENERATORS.reduce((total, generator) => total + getGeneratorContribution(generator), 0);
}

function getGeneratorContribution(generator) {
  return getOwned(state, generator.id) * generator.baseRate * state.generatorMultipliers[generator.id] * getProductionMultiplier() * getGeneratorRiftworkMultiplier();
}

function getOwned(targetState, id) {
  return targetState.generatorCounts[id] || 0;
}

function getTotalGeneratorsOwned() {
  return Object.values(state.generatorCounts).reduce((total, count) => total + count, 0);
}

function getGeneratorCost(generator) {
  return Math.floor(generator.baseCost * Math.pow(COST_GROWTH, getOwned(state, generator.id)));
}

function getPotentialResonance() {
  return Math.floor(Math.cbrt(Math.max(0, state.lifetimeShards) / RIFT_BASE_SHARDS));
}

function getAvailableEchoes() {
  return Math.max(0, getPotentialResonance() - state.totalEchoesEarned);
}

function enterRift() {
  const echoesGained = getAvailableEchoes();
  if (echoesGained <= 0) return;

  const nextResonance = state.totalEchoesEarned + echoesGained;
  const message = `Enter the Rift? This will dissolve your current Shards, generators, and temporary upgrades into ${formatNumber(echoesGained)} Echo${echoesGained === 1 ? "" : "es"}.`;
  if (!window.confirm(message)) return;

  const preserved = {
    lifetimeShards: state.lifetimeShards,
    totalClicks: state.totalClicks,
    echoes: state.echoes + echoesGained,
    totalEchoesEarned: nextResonance,
    resonance: nextResonance,
    purchasedRiftwork: [...state.purchasedRiftwork],
    riftEntries: state.riftEntries + 1,
    bestPassiveRate: state.bestPassiveRate || 0,
    lastOfflineShards: state.lastOfflineShards || 0,
    lastOfflineSeconds: state.lastOfflineSeconds || 0,
    lastSavedAt: state.lastSavedAt,
  };

  const fresh = createFreshState();
  Object.assign(state, fresh, preserved);
  state.log = ["The Rift closes. The storm begins again, but it remembers."];
  saveGame();
  render();
}

function buyGenerator(id) {
  const generator = GENERATORS.find((item) => item.id === id);
  if (!generator) return;
  const cost = getGeneratorCost(generator);
  if (state.shards < cost) return;

  state.shards -= cost;
  state.generatorCounts[id] += 1;
  addLog(`Bought ${generator.name}.`);
  saveGame(false);
  render();
}

function buyUpgrade(id) {
  const upgrade = UPGRADES.find((item) => item.id === id);
  if (!upgrade || state.purchasedUpgrades.includes(id) || !upgrade.unlock(state) || state.shards < upgrade.cost) return;

  state.shards -= upgrade.cost;
  state.purchasedUpgrades.push(id);
  upgrade.apply(state);
  addLog(`Upgraded: ${upgrade.name}.`);
  saveGame(false);
  render();
}

function buyRiftwork(id) {
  const upgrade = RIFTWORK.find((item) => item.id === id);
  if (!upgrade || hasRiftwork(id) || state.echoes < upgrade.cost) return;

  state.echoes -= upgrade.cost;
  state.purchasedRiftwork.push(id);
  addLog(`Riftwork etched: ${upgrade.name}.`);
  saveGame();
  render();
}

function render() {
  renderQueued = false;
  const clickPower = getClickPower();
  const passiveRate = getPassiveRate();

  els.shardTotal.textContent = `${formatNumber(Math.floor(state.shards))} Shards`;
  els.rateSummary.textContent = `+${formatNumber(clickPower)} per click · ${formatNumber(passiveRate)} per second`;
  els.clickPower.textContent = formatNumber(clickPower);
  els.passiveRate.textContent = formatNumber(passiveRate);

  renderGenerators();
  renderUpgrades();
  renderRift();
  renderRiftwork();
  renderStatistics();
}

function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(render);
}

function getVisibleGenerators() {
  const ownedGenerators = GENERATORS.filter((generator) => getOwned(state, generator.id) > 0);
  const nextUnpurchased = GENERATORS.find((generator) => getOwned(state, generator.id) === 0);
  return nextUnpurchased ? [...ownedGenerators, nextUnpurchased] : ownedGenerators;
}

function renderGenerators() {
  const visibleGenerators = getVisibleGenerators();
  const visibleIds = new Set(visibleGenerators.map((generator) => generator.id));
  const passiveRate = getPassiveRate();

  for (const generator of visibleGenerators) {
    const cost = getGeneratorCost(generator);
    const owned = getOwned(state, generator.id);
    const contribution = getGeneratorContribution(generator);
    const contributionPercent = passiveRate > 0 ? (contribution / passiveRate) * 100 : 0;
    const nextLabel = owned === 0 ? "Next" : `Owned ${owned}`;

    let button = els.generatorList.querySelector(`[data-generator-id="${generator.id}"]`);
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "item-card";
      button.dataset.generatorId = generator.id;
      button.addEventListener("click", () => buyGenerator(generator.id));
      els.generatorList.append(button);
    }

    button.disabled = state.shards < cost;
    button.innerHTML = `
      <div>
        <h3>${generator.name}</h3>
        <p>${generator.description}</p>
      </div>
      <div class="item-meta">
        <span class="price">${formatNumber(cost)}</span>
        <span>${nextLabel}</span>
        <span>+${formatNumber(owned > 0 ? contribution : generator.baseRate * getProductionMultiplier() * getGeneratorRiftworkMultiplier())}/s</span>
        <span>${formatPercent(contributionPercent)} total</span>
      </div>
    `;
  }

  for (const button of els.generatorList.querySelectorAll("[data-generator-id]")) {
    if (!visibleIds.has(button.dataset.generatorId)) button.remove();
  }
}

function getVisibleUpgrades() {
  return UPGRADES.filter((upgrade) => !state.purchasedUpgrades.includes(upgrade.id) && upgrade.unlock(state));
}

function renderUpgrades() {
  const visibleUpgrades = getVisibleUpgrades();
  const visibleIds = new Set(visibleUpgrades.map((upgrade) => upgrade.id));

  if (!visibleUpgrades.length) {
    els.upgradeList.querySelectorAll("[data-upgrade-id]").forEach((button) => button.remove());
    let note = els.upgradeList.querySelector(".empty-note");
    if (!note) {
      note = document.createElement("p");
      note.className = "empty-note";
      els.upgradeList.append(note);
    }
    note.textContent = "No upgrades available yet.";
    return;
  }

  els.upgradeList.querySelector(".empty-note")?.remove();

  for (const upgrade of visibleUpgrades) {
    let button = els.upgradeList.querySelector(`[data-upgrade-id="${upgrade.id}"]`);
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "item-card";
      button.dataset.upgradeId = upgrade.id;
      button.addEventListener("click", () => buyUpgrade(upgrade.id));
      els.upgradeList.append(button);
    }

    button.disabled = state.shards < upgrade.cost;
    button.innerHTML = `
      <div>
        <h3>${upgrade.name}</h3>
        <p>${upgrade.description}</p>
      </div>
      <div class="item-meta">
        <span class="price">${formatNumber(upgrade.cost)}</span>
        <span>Upgrade</span>
      </div>
    `;
  }

  for (const button of els.upgradeList.querySelectorAll("[data-upgrade-id]")) {
    if (!visibleIds.has(button.dataset.upgradeId)) button.remove();
  }
}

function renderRift() {
  const availableEchoes = getAvailableEchoes();
  const potentialResonance = getPotentialResonance();
  const nextResonance = state.totalEchoesEarned + availableEchoes;
  const bonusNow = (getResonanceMultiplier() - 1) * 100;
  const resonanceAfter = nextResonance * getResonancePercentPerLevel();

  els.enterRiftBtn.disabled = availableEchoes <= 0;
  els.enterRiftBtn.textContent = availableEchoes > 0 ? "Enter the Rift" : "The Rift Sleeps";

  els.riftPreview.innerHTML = [
    ["Echoes Held", formatNumber(state.echoes)],
    ["Echoes Waiting", `+${formatNumber(availableEchoes)}`],
    ["Resonance", formatNumber(state.resonance)],
    ["Resonance Bonus", `${formatPercent(bonusNow)} now · ${formatPercent(resonanceAfter)} after`],
    ["Next Echo", `${formatNumber(getShardsForResonance(potentialResonance + 1))} lifetime Shards`],
  ]
    .map(([label, value]) => `<div class="rift-preview-row"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
}

function renderRiftwork() {
  els.riftworkList.innerHTML = RIFTWORK.map((upgrade) => {
    const owned = hasRiftwork(upgrade.id);
    const affordable = state.echoes >= upgrade.cost;
    const disabled = owned || !affordable;
    const status = owned ? "Etched" : `${formatNumber(upgrade.cost)} Echo${upgrade.cost === 1 ? "" : "es"}`;

    return `
      <button class="riftwork-card ${owned ? "is-owned" : ""}" type="button" data-riftwork-id="${upgrade.id}" ${disabled ? "disabled" : ""}>
        <div>
          <h3>${upgrade.name}</h3>
          <p>${upgrade.description}</p>
        </div>
        <div class="riftwork-meta">
          <span class="price">${status}</span>
          <span>${upgrade.tag}</span>
        </div>
      </button>
    `;
  }).join("");
}

function getShardsForResonance(level) {
  return Math.pow(level, 3) * RIFT_BASE_SHARDS;
}

function renderStatistics() {
  const stats = [
    ["Current Shards", formatNumber(Math.floor(state.shards))],
    ["Lifetime Shards", formatNumber(Math.floor(state.lifetimeShards))],
    ["Lifetime Clicks", formatNumber(state.totalClicks)],
    ["Click Power", formatNumber(getClickPower())],
    ["Shards / Second", formatNumber(getPassiveRate())],
    ["Best Shards / Second", formatNumber(state.bestPassiveRate || 0)],
    ["Last Offline Gain", formatNumber(state.lastOfflineShards || 0)],
    ["Last Time Away", formatDuration(state.lastOfflineSeconds || 0)],
    ["Generators Owned", formatNumber(getTotalGeneratorsOwned())],
    ["Upgrades Purchased", formatNumber(state.purchasedUpgrades.length)],
    ["Echoes Held", formatNumber(state.echoes)],
    ["Lifetime Echoes", formatNumber(state.totalEchoesEarned)],
    ["Riftwork Etched", `${formatNumber(state.purchasedRiftwork.length)} / ${formatNumber(RIFTWORK.length)}`],
    ["Resonance", formatNumber(state.resonance)],
    ["Rift Entries", formatNumber(state.riftEntries)],
    ["Resonance Bonus", formatPercent((getResonanceMultiplier() - 1) * 100)],
    ["All Production", `${formatNumber(getAllProductionMultiplier())}x`],
    ["Click Riftwork", `${formatNumber(getClickRiftworkMultiplier())}x`],
    ["Generator Riftwork", `${formatNumber(getGeneratorRiftworkMultiplier())}x`],
    ["Click CPS Bonus", formatPercent(state.clickCpsPercent * 100)],
  ];

  els.statisticsList.innerHTML = stats
    .map(([label, value]) => `<div class="stat-row"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
}

function spawnFloat(amount, event) {
  const bounds = els.floatLayer.getBoundingClientRect();
  const x = event.clientX - bounds.left;
  const y = event.clientY - bounds.top;
  const pop = document.createElement("span");
  pop.className = "float-pop";
  pop.textContent = `+${formatNumber(amount)}`;
  pop.style.left = `${x}px`;
  pop.style.top = `${y}px`;
  els.floatLayer.append(pop);
  pop.addEventListener("animationend", () => pop.remove());
}

function addLog(message) {
  state.log.push(message);
  state.log = state.log.slice(-20);
}

function saveGame(updateTimestamp = true) {
  if (updateTimestamp) state.lastSavedAt = new Date().toISOString();
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return;

  try {
    const saved = JSON.parse(raw);
    const fresh = createFreshState();
    Object.assign(state, fresh, saved);
    state.generatorCounts = { ...fresh.generatorCounts, ...saved.generatorCounts };
    state.generatorMultipliers = { ...fresh.generatorMultipliers, ...saved.generatorMultipliers };
    state.purchasedUpgrades = Array.isArray(saved.purchasedUpgrades) ? saved.purchasedUpgrades : [];
    state.purchasedRiftwork = Array.isArray(saved.purchasedRiftwork) ? saved.purchasedRiftwork : [];
    state.clickCpsPercent = Number.isFinite(saved.clickCpsPercent) ? saved.clickCpsPercent : fresh.clickCpsPercent;
    state.totalClicks = Number.isFinite(saved.totalClicks) ? saved.totalClicks : fresh.totalClicks;
    state.echoes = Number.isFinite(saved.echoes) ? saved.echoes : fresh.echoes;
    state.totalEchoesEarned = Number.isFinite(saved.totalEchoesEarned) ? saved.totalEchoesEarned : fresh.totalEchoesEarned;
    state.resonance = Number.isFinite(saved.resonance) ? saved.resonance : state.totalEchoesEarned;
    state.riftEntries = Number.isFinite(saved.riftEntries) ? saved.riftEntries : fresh.riftEntries;
    state.bestPassiveRate = Number.isFinite(saved.bestPassiveRate) ? saved.bestPassiveRate : fresh.bestPassiveRate;
    state.lastOfflineShards = Number.isFinite(saved.lastOfflineShards) ? saved.lastOfflineShards : fresh.lastOfflineShards;
    state.lastOfflineSeconds = Number.isFinite(saved.lastOfflineSeconds) ? saved.lastOfflineSeconds : fresh.lastOfflineSeconds;
    state.log = Array.isArray(saved.log) && saved.log.length ? saved.log.slice(-20) : fresh.log;
  } catch (error) {
    addLog("Save data could not be loaded.");
  }
}

function resetGame() {
  if (!window.confirm("Reset all Obsidian Clicker progress? This also clears Echoes, Resonance, and Riftwork.")) return;
  localStorage.removeItem(SAVE_KEY);
  const fresh = createFreshState();
  Object.assign(state, fresh);
  addLog("Progress reset.");
  render();
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "0";

  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs < 1000) return `${sign}${trimNumber(abs)}`;

  const units = [
    { value: 1e60, suffix: "N" }, { value: 1e57, suffix: "OcD" }, { value: 1e54, suffix: "SpD" },
    { value: 1e51, suffix: "SxD" }, { value: 1e48, suffix: "QiD" }, { value: 1e45, suffix: "QaD" },
    { value: 1e42, suffix: "TD" }, { value: 1e39, suffix: "DD" }, { value: 1e36, suffix: "U" },
    { value: 1e33, suffix: "Dc" }, { value: 1e30, suffix: "No" }, { value: 1e27, suffix: "Oc" },
    { value: 1e24, suffix: "Sp" }, { value: 1e21, suffix: "Sx" }, { value: 1e18, suffix: "Qi" },
    { value: 1e15, suffix: "Qa" }, { value: 1e12, suffix: "T" }, { value: 1e9, suffix: "B" },
    { value: 1e6, suffix: "M" }, { value: 1e3, suffix: "K" },
  ];

  const unit = units.find((item) => abs >= item.value);
  if (!unit) return `${sign}${Math.floor(abs).toLocaleString()}`;

  return `${sign}${trimNumber(abs / unit.value)}${unit.suffix}`;
}

function trimNumber(value) {
  if (value >= 100) return String(Math.floor(value));
  if (value >= 10) return value.toFixed(1).replace(/\.0$/, "");
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "0%";
  if (value >= 99.95) return "100%";
  if (value >= 10) return `${value.toFixed(1).replace(/\.0$/, "")}%`;
  if (value > 0) return `${value.toFixed(2).replace(/\.?0+$/, "")}%`;
  return "0%";
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  if (seconds < 60) return `${seconds}s`;

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function renderGameToText() {
  return JSON.stringify({
    coordinateSystem: "DOM layout; click target is #logo-button; origin top-left, x right, y down.",
    shards: Number(state.shards.toFixed(2)),
    lifetimeShards: Number(state.lifetimeShards.toFixed(2)),
    totalClicks: state.totalClicks,
    echoes: state.echoes,
    totalEchoesEarned: state.totalEchoesEarned,
    resonance: state.resonance,
    purchasedRiftwork: [...state.purchasedRiftwork],
    availableEchoes: getAvailableEchoes(),
    resonanceMultiplier: getResonanceMultiplier(),
    allProductionMultiplier: getAllProductionMultiplier(),
    clickRiftworkMultiplier: getClickRiftworkMultiplier(),
    generatorRiftworkMultiplier: getGeneratorRiftworkMultiplier(),
    productionMultiplier: getProductionMultiplier(),
    riftEntries: state.riftEntries,
    lastOfflineShards: state.lastOfflineShards,
    lastOfflineSeconds: state.lastOfflineSeconds,
    clickPower: getClickPower(),
    clickCpsPercent: state.clickCpsPercent,
    passiveRate: Number(getPassiveRate().toFixed(2)),
    visibleGeneratorIds: getVisibleGenerators().map((generator) => generator.id),
    generators: GENERATORS.map((generator) => ({
      id: generator.id,
      name: generator.name,
      owned: getOwned(state, generator.id),
      cost: getGeneratorCost(generator),
      baseRate: generator.baseRate,
      contribution: getGeneratorContribution(generator),
      contributionPercent: getPassiveRate() > 0 ? (getGeneratorContribution(generator) / getPassiveRate()) * 100 : 0,
      affordable: state.shards >= getGeneratorCost(generator),
    })),
    availableUpgrades: getVisibleUpgrades().map((upgrade) => ({ id: upgrade.id, name: upgrade.name, cost: upgrade.cost, affordable: state.shards >= upgrade.cost })),
    purchasedUpgrades: [...state.purchasedUpgrades],
    saved: Boolean(localStorage.getItem(SAVE_KEY)),
    logoSrc: LOGO_SRC,
    logoFallbackVisible: els.logoButton.classList.contains("logo-missing"),
  });
}

window.render_game_to_text = renderGameToText;
window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < steps; i += 1) update(1 / 60);
  render();
};
