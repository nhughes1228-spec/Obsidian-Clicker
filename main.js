const SAVE_KEY = "obsidian-clicker-save-v1";
const LOGO_SRC = "assets/obsidian-winds-logo.png";

const COST_GROWTH = 1.15;
const GLINT_SPAWN_MIN_SECONDS = 60;
const GLINT_SPAWN_MAX_SECONDS = 180;
const GLINT_LIFETIME_SECONDS = 13;

const GENERATORS = [
  {
    id: "whisperer",
    name: "Whisperer",
    cookieRole: "Cursor",
    description: "Coaxes loose Shards from the edge of the wind.",
    baseCost: 15,
    baseRate: 0.1,
  },
  {
    id: "galeLoom",
    name: "Gale Loom",
    cookieRole: "Grandma",
    description: "Threads pressure into a steady obsidian draft.",
    baseCost: 100,
    baseRate: 1,
  },
  {
    id: "obsidianSpire",
    name: "Obsidian Spire",
    cookieRole: "Farm",
    description: "Anchors the storm and draws Shards through the mark.",
    baseCost: 1100,
    baseRate: 8,
  },
  {
    id: "stormVault",
    name: "Storm Vault",
    cookieRole: "Mine",
    description: "Stores a violent weather front behind black glass.",
    baseCost: 12000,
    baseRate: 47,
  },
  {
    id: "forgeLine",
    name: "Forge Line",
    cookieRole: "Factory",
    description: "Cuts raw obsidian into a repeatable production ritual.",
    baseCost: 130000,
    baseRate: 260,
  },
  {
    id: "shardTreasury",
    name: "Shard Treasury",
    cookieRole: "Bank",
    description: "Compounds every glimmer into a carefully guarded reserve.",
    baseCost: 1400000,
    baseRate: 1400,
  },
  {
    id: "obsidianShrine",
    name: "Obsidian Shrine",
    cookieRole: "Temple",
    description: "Turns discipline, breath, and ceremony into Shards.",
    baseCost: 20000000,
    baseRate: 7800,
  },
  {
    id: "windOracle",
    name: "Wind Oracle",
    cookieRole: "Wizard Tower",
    description: "Reads the pressure changes before they become real.",
    baseCost: 330000000,
    baseRate: 44000,
  },
  {
    id: "riftCaravan",
    name: "Rift Caravan",
    cookieRole: "Shipment",
    description: "Imports black glass from storms too distant to name.",
    baseCost: 5100000000,
    baseRate: 260000,
  },
  {
    id: "glassCrucible",
    name: "Glass Crucible",
    cookieRole: "Alchemy Lab",
    description: "Boils silence into shine and pressure into profit.",
    baseCost: 75000000000,
    baseRate: 1600000,
  },
  {
    id: "blackglassPortal",
    name: "Blackglass Portal",
    cookieRole: "Portal",
    description: "Opens a clean cut through the atmosphere.",
    baseCost: 1000000000000,
    baseRate: 10000000,
  },
  {
    id: "echoChronometer",
    name: "Echo Chronometer",
    cookieRole: "Time Machine",
    description: "Collects Shards a few seconds before they should exist.",
    baseCost: 14000000000000,
    baseRate: 65000000,
  },
  {
    id: "nullCondenser",
    name: "Null Condenser",
    cookieRole: "Antimatter Condenser",
    description: "Condenses absence itself into something spendable.",
    baseCost: 170000000000000,
    baseRate: 430000000,
  },
  {
    id: "midnightPrism",
    name: "Midnight Prism",
    cookieRole: "Prism",
    description: "Splits one beam of darkness into a thousand clean edges.",
    baseCost: 2100000000000000,
    baseRate: 2900000000,
  },
  {
    id: "chanceReed",
    name: "Chance Reed",
    cookieRole: "Chancemaker",
    description: "Bends probability until good fortune squeaks.",
    baseCost: 26000000000000000,
    baseRate: 21000000000,
  },
  {
    id: "fractalScore",
    name: "Fractal Score",
    cookieRole: "Fractal Engine",
    description: "Repeats the same phrase forever, somehow larger every time.",
    baseCost: 310000000000000000,
    baseRate: 150000000000,
  },
];

const CLICK_UPGRADES = [
  {
    id: "sharperSigil",
    name: "Sharper Sigil",
    description: "Manual clicks carve twice as deeply.",
    cost: 100,
    unlock: (state) => state.lifetimeShards >= 50,
    apply: (state) => {
      state.clickMultiplier *= 2;
    },
  },
  {
    id: "echoingPalm",
    name: "Echoing Palm",
    description: "Each tap leaves a second pressure wave.",
    cost: 500,
    unlock: (state) => state.lifetimeShards >= 250,
    apply: (state) => {
      state.clickMultiplier *= 2;
    },
  },
  {
    id: "resonantTouch",
    name: "Resonant Touch",
    description: "Clicks borrow a small pulse from your passive production.",
    cost: 10000,
    unlock: (state) => getPassiveRate() >= 25,
    apply: (state) => {
      state.clickCpsPercent += 0.01;
    },
  },
  {
    id: "conductedPressure",
    name: "Conducted Pressure",
    description: "Clicks borrow even more force from the whole ensemble.",
    cost: 100000,
    unlock: (state) => getPassiveRate() >= 250,
    apply: (state) => {
      state.clickCpsPercent += 0.01;
    },
  },
];

const BUILDING_UPGRADE_TIERS = [
  { milestone: 1, costMultiplier: 10, namePrefix: "Polished", description: "work twice as quickly.", multiplier: 2 },
  { milestone: 5, costMultiplier: 50, namePrefix: "Tempered", description: "find a stronger rhythm and double again.", multiplier: 2 },
  { milestone: 25, costMultiplier: 500, namePrefix: "Honed", description: "lock into a cleaner current and double again.", multiplier: 2 },
  { milestone: 50, costMultiplier: 5000, namePrefix: "Radiant", description: "resonate across the whole stockpile and double again.", multiplier: 2 },
  { milestone: 100, costMultiplier: 50000, namePrefix: "Mythic", description: "become a permanent engine of the storm and double again.", multiplier: 2 },
];

const UPGRADES = createUpgrades();

const state = createFreshState();
let lastTick = performance.now();
let saveTimer = 0;
let renderQueued = false;
let glintTimer = randomGlintDelay();
let activeGlint = null;
let glintButton = null;

const els = {
  shardTotal: document.querySelector("#shard-total"),
  rateSummary: document.querySelector("#rate-summary"),
  lifetimeShards: document.querySelector("#lifetime-shards"),
  clickPower: document.querySelector("#click-power"),
  passiveRate: document.querySelector("#passive-rate"),
  logoButton: document.querySelector("#logo-button"),
  logoImg: document.querySelector("#logo-img"),
  floatLayer: document.querySelector("#float-layer"),
  generatorList: document.querySelector("#generator-list"),
  upgradeList: document.querySelector("#upgrade-list"),
  eventLog: document.querySelector("#event-log"),
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
      apply: (state) => {
        state.generatorMultipliers[generator.id] *= tier.multiplier;
      },
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
    activeBuffs: [],
    log: ["The first Shards wait in the wind."],
    lastSavedAt: null,
  };
}

function init() {
  loadGame();
  els.logoImg.src = LOGO_SRC;
  els.logoImg.addEventListener("error", () => {
    els.logoButton.classList.add("logo-missing");
    addLog("Logo missing. Place the final mark at assets/obsidian-winds-logo.png.");
  });

  els.logoButton.addEventListener("click", handleLogoClick);
  els.saveBtn.addEventListener("click", () => {
    saveGame();
    addLog("Progress saved.");
  });
  els.resetBtn.addEventListener("click", resetGame);

  render();
  requestAnimationFrame(tick);
}

function handleLogoClick(event) {
  state.totalClicks += 1;
  const amount = getClickPower();
  gainShards(amount);
  spawnFloat(amount, event);
  els.logoButton.classList.add("is-pressed");
  window.setTimeout(() => els.logoButton.classList.remove("is-pressed"), 120);
  addLog(`Gathered ${formatNumber(amount)} Shard${amount === 1 ? "" : "s"}.`);
  scheduleRender();
}

function tick(now) {
  const deltaSeconds = Math.min(1, (now - lastTick) / 1000);
  lastTick = now;
  update(deltaSeconds);
  render();
  requestAnimationFrame(tick);
}

function update(deltaSeconds) {
  updateBuffs(deltaSeconds);

  const rate = getPassiveRate();
  if (rate > 0) {
    gainShards(rate * deltaSeconds);
  }

  updateGlint(deltaSeconds);

  saveTimer += deltaSeconds;
  if (saveTimer >= 15) {
    saveTimer = 0;
    saveGame(false);
  }
}

function updateBuffs(deltaSeconds) {
  const before = state.activeBuffs.length;
  state.activeBuffs = state.activeBuffs
    .map((buff) => ({ ...buff, remaining: buff.remaining - deltaSeconds }))
    .filter((buff) => buff.remaining > 0);

  if (before !== state.activeBuffs.length) {
    addLog("A temporary resonance fades.");
  }
}

function updateGlint(deltaSeconds) {
  if (activeGlint) {
    activeGlint.remaining -= deltaSeconds;
    if (activeGlint.remaining <= 0) {
      removeGlint();
      glintTimer = randomGlintDelay();
    }
    return;
  }

  glintTimer -= deltaSeconds;
  if (glintTimer <= 0) {
    spawnGlint();
  }
}

function gainShards(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return;
  state.shards += amount;
  state.lifetimeShards += amount;
}

function getClickPower() {
  const cpsClickBonus = getPassiveRate() * state.clickCpsPercent;
  return (state.clickMultiplier + cpsClickBonus) * getClickMultiplierFromBuffs();
}

function getPassiveRate() {
  const baseRate = GENERATORS.reduce((total, generator) => {
    return total + getOwned(state, generator.id) * generator.baseRate * state.generatorMultipliers[generator.id];
  }, 0);

  return baseRate * getPassiveMultiplierFromBuffs();
}

function getPassiveMultiplierFromBuffs() {
  return state.activeBuffs.reduce((total, buff) => total * (buff.cpsMultiplier || 1), 1);
}

function getClickMultiplierFromBuffs() {
  return state.activeBuffs.reduce((total, buff) => total * (buff.clickMultiplier || 1), 1);
}

function getOwned(targetState, id) {
  return targetState.generatorCounts[id] || 0;
}

function getGeneratorCost(generator) {
  return Math.floor(generator.baseCost * Math.pow(COST_GROWTH, getOwned(state, generator.id)));
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
  if (!upgrade || state.purchasedUpgrades.includes(id) || !upgrade.unlock(state) || state.shards < upgrade.cost) {
    return;
  }

  state.shards -= upgrade.cost;
  state.purchasedUpgrades.push(id);
  upgrade.apply(state);
  addLog(`Upgraded: ${upgrade.name}.`);
  saveGame(false);
  render();
}

function spawnGlint() {
  const stage = document.querySelector(".logo-stage");
  if (!stage) return;

  removeGlint();

  activeGlint = {
    remaining: GLINT_LIFETIME_SECONDS,
  };

  glintButton = document.createElement("button");
  glintButton.type = "button";
  glintButton.className = "glint-button";
  glintButton.textContent = "✦";
  glintButton.setAttribute("aria-label", "Catch the glint");
  Object.assign(glintButton.style, {
    position: "absolute",
    zIndex: "5",
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.9)",
    background: "radial-gradient(circle, #fff9c7 0%, #f0c04c 42%, #bf3f2f 100%)",
    boxShadow: "0 0 28px rgba(213, 156, 68, 0.85), 0 12px 28px rgba(24, 25, 28, 0.24)",
    color: "#18191c",
    cursor: "pointer",
    fontSize: "2rem",
    fontWeight: "900",
    transform: "translate(-50%, -50%)",
  });

  const x = 12 + Math.random() * 76;
  const y = 12 + Math.random() * 76;
  glintButton.style.left = `${x}%`;
  glintButton.style.top = `${y}%`;

  glintButton.addEventListener("click", handleGlintClick);
  stage.append(glintButton);
  addLog("A glint flashes across the obsidian.");
}

function handleGlintClick(event) {
  event.stopPropagation();

  const roll = Math.random();
  const rate = getPassiveRate();

  if (roll < 0.52) {
    const luckyAmount = Math.max(13, Math.min(state.shards * 0.15 + 13, rate * 60 * 15 + 13));
    gainShards(luckyAmount);
    addLog(`Lucky glint! Gained ${formatNumber(luckyAmount)} Shards.`);
  } else if (roll < 0.86) {
    state.activeBuffs.push({
      id: `frenzy-${Date.now()}`,
      name: "Frenzy",
      cpsMultiplier: 7,
      remaining: 77,
    });
    addLog("Frenzy! Production x7 for 77 seconds.");
  } else {
    state.activeBuffs.push({
      id: `click-frenzy-${Date.now()}`,
      name: "Click Frenzy",
      clickMultiplier: 77,
      remaining: 13,
    });
    addLog("Click Frenzy! Click power x77 for 13 seconds.");
  }

  spawnFloat(getClickPower(), event);
  removeGlint();
  glintTimer = randomGlintDelay();
  saveGame(false);
  render();
}

function removeGlint() {
  activeGlint = null;
  glintButton?.remove();
  glintButton = null;
}

function randomGlintDelay() {
  return GLINT_SPAWN_MIN_SECONDS + Math.random() * (GLINT_SPAWN_MAX_SECONDS - GLINT_SPAWN_MIN_SECONDS);
}

function render() {
  renderQueued = false;
  const clickPower = getClickPower();
  const passiveRate = getPassiveRate();

  els.shardTotal.textContent = `${formatNumber(Math.floor(state.shards))} Shards`;
  els.rateSummary.textContent = `+${formatNumber(clickPower)} per click · ${formatNumber(passiveRate)} per second`;
  els.lifetimeShards.textContent = formatNumber(Math.floor(state.lifetimeShards));
  els.clickPower.textContent = formatNumber(clickPower);
  els.passiveRate.textContent = formatNumber(passiveRate);

  renderGenerators();
  renderUpgrades();
  renderLog();
}

function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(render);
}

function renderGenerators() {
  const seen = new Set();
  for (const generator of GENERATORS) {
    const cost = getGeneratorCost(generator);
    const owned = getOwned(state, generator.id);
    const rate = generator.baseRate * state.generatorMultipliers[generator.id] * getPassiveMultiplierFromBuffs();
    seen.add(generator.id);

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
        <small class="cookie-role">Cookie role: ${generator.cookieRole}</small>
      </div>
      <div class="item-meta">
        <span class="price">${formatNumber(cost)}</span>
        <span>Owned ${owned}</span>
        <span>+${formatNumber(rate)}/s</span>
      </div>
    `;
  }

  for (const button of els.generatorList.querySelectorAll("[data-generator-id]")) {
    if (!seen.has(button.dataset.generatorId)) {
      button.remove();
    }
  }
}

function renderUpgrades() {
  const available = UPGRADES.filter((upgrade) => !state.purchasedUpgrades.includes(upgrade.id) && upgrade.unlock(state));
  const seen = new Set();

  if (!available.length) {
    els.upgradeList.querySelectorAll("[data-upgrade-id]").forEach((button) => button.remove());
    let note = els.upgradeList.querySelector(".empty-note");
    if (!note) {
      note = document.createElement("p");
      note.className = "empty-note";
      els.upgradeList.append(note);
    }
    note.textContent = "More upgrades will surface as the stockpile grows.";
    return;
  }

  els.upgradeList.querySelector(".empty-note")?.remove();

  for (const upgrade of available) {
    seen.add(upgrade.id);
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
    if (!seen.has(button.dataset.upgradeId)) {
      button.remove();
    }
  }
}

function renderLog() {
  els.eventLog.innerHTML = "";
  const buffSummary = state.activeBuffs.map((buff) => `${buff.name}: ${Math.ceil(buff.remaining)}s`);
  const entries = [...state.log.slice(-6), ...buffSummary].reverse();

  for (const entry of entries) {
    const item = document.createElement("p");
    item.textContent = entry;
    els.eventLog.append(item);
  }
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
  if (updateTimestamp) {
    state.lastSavedAt = new Date().toISOString();
  }
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
    state.activeBuffs = Array.isArray(saved.activeBuffs) ? saved.activeBuffs : [];
    state.clickCpsPercent = Number.isFinite(saved.clickCpsPercent) ? saved.clickCpsPercent : fresh.clickCpsPercent;
    state.totalClicks = Number.isFinite(saved.totalClicks) ? saved.totalClicks : fresh.totalClicks;
    state.log = Array.isArray(saved.log) && saved.log.length ? saved.log.slice(-20) : fresh.log;
  } catch (error) {
    addLog("Save data could not be loaded.");
  }
}

function resetGame() {
  if (!window.confirm("Reset all Obsidian Clicker progress?")) return;
  localStorage.removeItem(SAVE_KEY);
  const fresh = createFreshState();
  Object.assign(state, fresh);
  removeGlint();
  glintTimer = randomGlintDelay();
  addLog("Progress reset.");
  render();
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "0";

  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs < 1000) {
    return `${sign}${trimNumber(abs)}`;
  }

  const units = [
    { value: 1e60, suffix: "N" },
    { value: 1e57, suffix: "OcD" },
    { value: 1e54, suffix: "SpD" },
    { value: 1e51, suffix: "SxD" },
    { value: 1e48, suffix: "QiD" },
    { value: 1e45, suffix: "QaD" },
    { value: 1e42, suffix: "TD" },
    { value: 1e39, suffix: "DD" },
    { value: 1e36, suffix: "U" },
    { value: 1e33, suffix: "Dc" },
    { value: 1e30, suffix: "No" },
    { value: 1e27, suffix: "Oc" },
    { value: 1e24, suffix: "Sp" },
    { value: 1e21, suffix: "Sx" },
    { value: 1e18, suffix: "Qi" },
    { value: 1e15, suffix: "Qa" },
    { value: 1e12, suffix: "T" },
    { value: 1e9, suffix: "B" },
    { value: 1e6, suffix: "M" },
    { value: 1e3, suffix: "K" },
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

function renderGameToText() {
  return JSON.stringify({
    coordinateSystem: "DOM layout; click target is #logo-button; origin top-left, x right, y down.",
    shards: Number(state.shards.toFixed(2)),
    lifetimeShards: Number(state.lifetimeShards.toFixed(2)),
    totalClicks: state.totalClicks,
    clickPower: getClickPower(),
    clickCpsPercent: state.clickCpsPercent,
    passiveRate: Number(getPassiveRate().toFixed(2)),
    activeBuffs: state.activeBuffs.map((buff) => ({
      name: buff.name,
      remaining: Number(buff.remaining.toFixed(1)),
      cpsMultiplier: buff.cpsMultiplier || 1,
      clickMultiplier: buff.clickMultiplier || 1,
    })),
    glintVisible: Boolean(activeGlint),
    generators: GENERATORS.map((generator) => ({
      id: generator.id,
      name: generator.name,
      cookieRole: generator.cookieRole,
      owned: getOwned(state, generator.id),
      cost: getGeneratorCost(generator),
      baseRate: generator.baseRate,
      rateEach: generator.baseRate * state.generatorMultipliers[generator.id] * getPassiveMultiplierFromBuffs(),
      affordable: state.shards >= getGeneratorCost(generator),
    })),
    availableUpgrades: UPGRADES.filter((upgrade) => !state.purchasedUpgrades.includes(upgrade.id) && upgrade.unlock(state)).map((upgrade) => ({
      id: upgrade.id,
      name: upgrade.name,
      cost: upgrade.cost,
      affordable: state.shards >= upgrade.cost,
    })),
    purchasedUpgrades: [...state.purchasedUpgrades],
    saved: Boolean(localStorage.getItem(SAVE_KEY)),
    logoSrc: LOGO_SRC,
    logoFallbackVisible: els.logoButton.classList.contains("logo-missing"),
  });
}

window.render_game_to_text = renderGameToText;
window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < steps; i += 1) {
    update(1 / 60);
  }
  render();
};
