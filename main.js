const SAVE_KEY = "obsidian-clicker-save-v1";
const LOGO_SRC = "assets/obsidian-winds-logo.png";

const GENERATORS = [
  {
    id: "whisperer",
    name: "Whisperer",
    description: "Coaxes loose Shards from the edge of the wind.",
    baseCost: 15,
    baseRate: 0.1,
  },
  {
    id: "galeLoom",
    name: "Gale Loom",
    description: "Threads pressure into a steady obsidian draft.",
    baseCost: 110,
    baseRate: 1,
  },
  {
    id: "obsidianSpire",
    name: "Obsidian Spire",
    description: "Anchors the storm and draws Shards through the mark.",
    baseCost: 1200,
    baseRate: 8,
  },
  {
    id: "stormVault",
    name: "Storm Vault",
    description: "Stores a violent weather front behind black glass.",
    baseCost: 14000,
    baseRate: 47,
  },
];

const UPGRADES = [
  {
    id: "sharperSigil",
    name: "Sharper Sigil",
    description: "Manual clicks carve deeper.",
    cost: 50,
    unlock: (state) => state.lifetimeShards >= 25,
    apply: (state) => {
      state.clickMultiplier *= 2;
    },
  },
  {
    id: "echoingPalm",
    name: "Echoing Palm",
    description: "Each tap leaves a second pressure wave.",
    cost: 350,
    unlock: (state) => state.lifetimeShards >= 200,
    apply: (state) => {
      state.clickMultiplier *= 2;
    },
  },
  {
    id: "whisperChoir",
    name: "Whisper Choir",
    description: "Whisperers work twice as quickly.",
    cost: 500,
    unlock: (state) => getOwned(state, "whisperer") >= 10,
    apply: (state) => {
      state.generatorMultipliers.whisperer *= 2;
    },
  },
  {
    id: "loomTension",
    name: "Loom Tension",
    description: "Gale Looms pull a cleaner current.",
    cost: 2200,
    unlock: (state) => getOwned(state, "galeLoom") >= 5,
    apply: (state) => {
      state.generatorMultipliers.galeLoom *= 2;
    },
  },
  {
    id: "spireCrown",
    name: "Spire Crown",
    description: "Obsidian Spires resonate through the whole stockpile.",
    cost: 9500,
    unlock: (state) => getOwned(state, "obsidianSpire") >= 3,
    apply: (state) => {
      state.generatorMultipliers.obsidianSpire *= 2;
    },
  },
];

const state = createFreshState();
let lastTick = performance.now();
let saveTimer = 0;
let renderQueued = false;

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
    clickMultiplier: 1,
    generatorCounts,
    generatorMultipliers,
    purchasedUpgrades: [],
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
  const rate = getPassiveRate();
  if (rate > 0) {
    gainShards(rate * deltaSeconds);
  }

  saveTimer += deltaSeconds;
  if (saveTimer >= 15) {
    saveTimer = 0;
    saveGame(false);
  }
}

function gainShards(amount) {
  state.shards += amount;
  state.lifetimeShards += amount;
}

function getClickPower() {
  return state.clickMultiplier;
}

function getPassiveRate() {
  return GENERATORS.reduce((total, generator) => {
    return total + getOwned(state, generator.id) * generator.baseRate * state.generatorMultipliers[generator.id];
  }, 0);
}

function getOwned(targetState, id) {
  return targetState.generatorCounts[id] || 0;
}

function getGeneratorCost(generator) {
  return Math.floor(generator.baseCost * Math.pow(1.15, getOwned(state, generator.id)));
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
    const rate = generator.baseRate * state.generatorMultipliers[generator.id];
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
  for (const entry of state.log.slice(-6).reverse()) {
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
  addLog("Progress reset.");
  render();
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "0";
  if (value >= 1_000_000) {
    return `${trimNumber(value / 1_000_000)}M`;
  }
  if (value >= 10_000) {
    return `${trimNumber(value / 1_000)}K`;
  }
  if (value >= 100) {
    return Math.floor(value).toLocaleString();
  }
  if (value >= 10) {
    return trimNumber(value);
  }
  return trimNumber(value);
}

function trimNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function renderGameToText() {
  return JSON.stringify({
    coordinateSystem: "DOM layout; click target is #logo-button; origin top-left, x right, y down.",
    shards: Number(state.shards.toFixed(2)),
    lifetimeShards: Number(state.lifetimeShards.toFixed(2)),
    clickPower: getClickPower(),
    passiveRate: Number(getPassiveRate().toFixed(2)),
    generators: GENERATORS.map((generator) => ({
      id: generator.id,
      name: generator.name,
      owned: getOwned(state, generator.id),
      cost: getGeneratorCost(generator),
      rateEach: generator.baseRate * state.generatorMultipliers[generator.id],
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
