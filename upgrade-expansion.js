(() => {
  const EXTRA_BUILDING_TIERS = [
    { milestone: 10, costMultiplier: 100, namePrefix: "Refined", description: "settle into a stronger groove and double production.", multiplier: 2 },
    { milestone: 150, costMultiplier: 500000, namePrefix: "Ascendant", description: "pull sound from the far side of the storm and double production.", multiplier: 2 },
    { milestone: 200, costMultiplier: 5000000, namePrefix: "Eclipsed", description: "work under a perfect black sun and double production.", multiplier: 2 },
    { milestone: 250, costMultiplier: 50000000, namePrefix: "Transcendent", description: "turn repetition into ritual and double production.", multiplier: 2 },
    { milestone: 300, costMultiplier: 500000000, namePrefix: "Infinite", description: "echo through the whole design and double production.", multiplier: 2 },
  ];

  const GLOBAL_UPGRADES = [
    {
      id: "stormCanon",
      name: "Storm Canon",
      description: "A common language for the whole ensemble. All Shard production +10%.",
      cost: 5000,
      unlock: (state) => state.lifetimeShards >= 2500,
      apply: (state) => { state.globalMultiplier *= 1.1; },
    },
    {
      id: "blackglassChorus",
      name: "Blackglass Chorus",
      description: "Every engine learns to breathe together. All Shard production +15%.",
      cost: 50000,
      unlock: (state) => state.lifetimeShards >= 25000,
      apply: (state) => { state.globalMultiplier *= 1.15; },
    },
    {
      id: "indoorCircuit",
      name: "Indoor Circuit",
      description: "The system finds a cleaner competitive rhythm. All Shard production +20%.",
      cost: 500000,
      unlock: (state) => state.lifetimeShards >= 250000,
      apply: (state) => { state.globalMultiplier *= 1.2; },
    },
    {
      id: "worldFinalsRun",
      name: "World Finals Run",
      description: "Momentum compounds under the lights. All Shard production +25%.",
      cost: 5000000,
      unlock: (state) => state.lifetimeShards >= 2500000,
      apply: (state) => { state.globalMultiplier *= 1.25; },
    },
    {
      id: "grandFinale",
      name: "Grand Finale",
      description: "The whole storm resolves at once. All Shard production +30%.",
      cost: 50000000,
      unlock: (state) => state.lifetimeShards >= 25000000,
      apply: (state) => { state.globalMultiplier *= 1.3; },
    },
  ];

  const EXTRA_CLICK_UPGRADES = [
    {
      id: "obsidianKnuckles",
      name: "Obsidian Knuckles",
      description: "Clicks borrow 2% more force from your passive production.",
      cost: 1000000,
      unlock: () => getPassiveRate() >= 1000,
      apply: (state) => { state.clickCpsPercent += 0.02; },
    },
    {
      id: "thunderousGrip",
      name: "Thunderous Grip",
      description: "Manual clicks strike three times harder.",
      cost: 100000000,
      unlock: () => getPassiveRate() >= 10000,
      apply: (state) => { state.clickMultiplier *= 3; },
    },
    {
      id: "conductorsStrike",
      name: "Conductor's Strike",
      description: "Clicks borrow another 3% of your passive production.",
      cost: 10000000000,
      unlock: () => getPassiveRate() >= 100000,
      apply: (state) => { state.clickCpsPercent += 0.03; },
    },
    {
      id: "geomagneticGesture",
      name: "Geomagnetic Gesture",
      description: "Manual clicks cut five times deeper through the storm.",
      cost: 10000000000000,
      unlock: () => getPassiveRate() >= 1000000,
      apply: (state) => { state.clickMultiplier *= 5; },
    },
    {
      id: "stormhandTechnique",
      name: "Stormhand Technique",
      description: "Clicks borrow another 5% of your passive production.",
      cost: 1000000000000000,
      unlock: () => getPassiveRate() >= 10000000,
      apply: (state) => { state.clickCpsPercent += 0.05; },
    },
  ];

  const EXTRA_RIFTWORK = [
    { id: "echoAmplifier", name: "Echo Amplifier", description: "Echoes thicken the air. All Shard production is permanently increased by 50%.", cost: 50, tag: "All +50%" },
    { id: "riftFoundry", name: "Rift Foundry", description: "Generators are reforged in the space between runs. Generator production is permanently increased by 50%.", cost: 100, tag: "Generators +50%" },
    { id: "batonInTheVoid", name: "Baton in the Void", description: "Clicks carve through silence itself. Click production is permanently increased by 75%.", cost: 150, tag: "Clicks +75%" },
    { id: "acclaimConductor", name: "Acclaim Conductor", description: "Your reputation carries farther. Acclaim bonuses are 50% stronger.", cost: 250, tag: "Acclaim +50%" },
    { id: "resonanceEngine", name: "Resonance Engine", description: "Each point of Resonance carries 25% more force.", cost: 500, tag: "Resonance +25%" },
    { id: "blackglassEndowment", name: "Blackglass Endowment", description: "A permanent foundation under every run. All Shard production is permanently doubled.", cost: 1000, tag: "All x2" },
  ];

  const ACCLAIM_MILESTONES = [
    { id: "shards1k", label: "1K lifetime Shards", met: () => state.lifetimeShards >= 1000 },
    { id: "shards100k", label: "100K lifetime Shards", met: () => state.lifetimeShards >= 100000 },
    { id: "shards10m", label: "10M lifetime Shards", met: () => state.lifetimeShards >= 10000000 },
    { id: "shards1b", label: "1B lifetime Shards", met: () => state.lifetimeShards >= 1000000000 },
    { id: "shards1t", label: "1T lifetime Shards", met: () => state.lifetimeShards >= 1000000000000 },
    { id: "clicks100", label: "100 lifetime clicks", met: () => state.totalClicks >= 100 },
    { id: "clicks1k", label: "1K lifetime clicks", met: () => state.totalClicks >= 1000 },
    { id: "clicks10k", label: "10K lifetime clicks", met: () => state.totalClicks >= 10000 },
    { id: "generators50", label: "50 generators owned", met: () => getTotalGeneratorsOwned() >= 50 },
    { id: "generators250", label: "250 generators owned", met: () => getTotalGeneratorsOwned() >= 250 },
    { id: "generators1000", label: "1K generators owned", met: () => getTotalGeneratorsOwned() >= 1000 },
    { id: "upgrades25", label: "25 upgrades purchased", met: () => state.purchasedUpgrades.length >= 25 },
    { id: "upgrades100", label: "100 upgrades purchased", met: () => state.purchasedUpgrades.length >= 100 },
    { id: "rift1", label: "Enter the Rift once", met: () => state.riftEntries >= 1 },
    { id: "rift5", label: "Enter the Rift five times", met: () => state.riftEntries >= 5 },
    { id: "echoes10", label: "10 lifetime Echoes", met: () => state.totalEchoesEarned >= 10 },
    { id: "echoes100", label: "100 lifetime Echoes", met: () => state.totalEchoesEarned >= 100 },
    { id: "riftwork5", label: "Etch 5 Riftwork rites", met: () => state.purchasedRiftwork.length >= 5 },
    { id: "passive1k", label: "1K best Shards per second", met: () => (state.bestPassiveRate || 0) >= 1000 },
    { id: "passive1m", label: "1M best Shards per second", met: () => (state.bestPassiveRate || 0) >= 1000000 },
  ];

  function ensureExpansionState() {
    if (!Number.isFinite(state.globalMultiplier)) state.globalMultiplier = 1;
  }

  function addUniqueUpgrade(upgrade) {
    if (!UPGRADES.some((item) => item.id === upgrade.id)) UPGRADES.push(upgrade);
  }

  function addUniqueRiftwork(upgrade) {
    if (!RIFTWORK.some((item) => item.id === upgrade.id)) RIFTWORK.push(upgrade);
  }

  function installCompactUpgradeStyles() {
    if (document.querySelector("#compact-upgrade-styles")) return;

    const style = document.createElement("style");
    style.id = "compact-upgrade-styles";
    style.textContent = `
      #upgrade-list.upgrade-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(138px, 1fr));
        gap: 7px;
      }

      .upgrade-chip {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 8px;
        min-height: 50px;
        width: 100%;
        padding: 8px 9px;
        border: 1px solid rgba(255, 255, 255, 0.085);
        border-radius: 10px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.025)),
          rgba(10, 10, 12, 0.94);
        color: var(--ink);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 10px 26px rgba(0, 0, 0, 0.18);
        cursor: pointer;
        text-align: left;
        touch-action: manipulation;
        transition: transform 120ms ease, border-color 120ms ease, background 120ms ease, opacity 120ms ease;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }

      .upgrade-chip:hover:not(:disabled) {
        transform: translateY(-1px);
        border-color: rgba(133, 1, 207, 0.58);
        background:
          linear-gradient(180deg, rgba(114, 1, 177, 0.22), rgba(255, 255, 255, 0.035)),
          rgba(12, 12, 14, 0.98);
      }

      .upgrade-chip:active:not(:disabled) {
        transform: translateY(0) scale(0.99);
      }

      .upgrade-chip:disabled {
        cursor: not-allowed;
        opacity: 0.36;
        filter: saturate(0.75);
      }

      .upgrade-chip-title {
        display: block;
        overflow: hidden;
        color: #ffffff;
        font-size: 0.78rem;
        font-weight: 900;
        letter-spacing: -0.01em;
        line-height: 1.08;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .upgrade-chip-effect {
        display: block;
        overflow: hidden;
        margin-top: 3px;
        color: var(--muted);
        font-size: 0.61rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        line-height: 1.05;
        text-overflow: ellipsis;
        text-transform: uppercase;
        white-space: nowrap;
      }

      .upgrade-chip-cost {
        color: #ffffff;
        font-size: 0.82rem;
        font-weight: 900;
        letter-spacing: -0.02em;
        text-align: right;
        text-shadow: 0 0 16px rgba(133, 1, 207, 0.35);
        white-space: nowrap;
      }

      @media (max-width: 560px) {
        #upgrade-list.upgrade-grid {
          grid-template-columns: 1fr;
          gap: 6px;
        }

        .upgrade-chip {
          min-height: 46px;
          padding: 8px 9px;
        }
      }
    `;

    document.head.append(style);
  }

  function getUpgradeEffectLabel(upgrade) {
    const text = upgrade.description || "Upgrade";
    if (text.includes("All Shard production")) return "All production";
    if (text.includes("Manual clicks")) return "Click power";
    if (text.includes("Clicks borrow")) return "Click + passive";
    if (text.includes("double production") || text.includes("double again")) return "Generator x2";
    if (text.includes("Generator production")) return "Generators";
    return "Upgrade";
  }

  function installExpandedUpgrades() {
    ensureExpansionState();
    installCompactUpgradeStyles();

    for (const generator of GENERATORS) {
      for (const tier of EXTRA_BUILDING_TIERS) {
        addUniqueUpgrade({
          id: `${generator.id}-${tier.milestone}`,
          name: `${tier.namePrefix} ${generator.name}`,
          description: `${generator.name}s ${tier.description}`,
          cost: Math.ceil(generator.baseCost * tier.costMultiplier),
          unlock: (state) => getOwned(state, generator.id) >= tier.milestone,
          apply: (state) => { state.generatorMultipliers[generator.id] *= tier.multiplier; },
        });
      }
    }

    GLOBAL_UPGRADES.forEach(addUniqueUpgrade);
    EXTRA_CLICK_UPGRADES.forEach(addUniqueUpgrade);
    EXTRA_RIFTWORK.forEach(addUniqueRiftwork);
    UPGRADES.sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
  }

  function getAcclaimCount() {
    return ACCLAIM_MILESTONES.filter((milestone) => milestone.met()).length;
  }

  function getAcclaimMultiplier() {
    const strength = hasRiftwork("acclaimConductor") ? 0.03 : 0.02;
    return 1 + getAcclaimCount() * strength;
  }

  const originalGetAllProductionMultiplier = getAllProductionMultiplier;
  getAllProductionMultiplier = function expandedAllProductionMultiplier() {
    ensureExpansionState();
    let multiplier = originalGetAllProductionMultiplier();
    multiplier *= state.globalMultiplier;
    multiplier *= getAcclaimMultiplier();
    if (hasRiftwork("echoAmplifier")) multiplier *= 1.5;
    if (hasRiftwork("blackglassEndowment")) multiplier *= 2;
    return multiplier;
  };

  const originalGetGeneratorRiftworkMultiplier = getGeneratorRiftworkMultiplier;
  getGeneratorRiftworkMultiplier = function expandedGeneratorRiftworkMultiplier() {
    let multiplier = originalGetGeneratorRiftworkMultiplier();
    if (hasRiftwork("riftFoundry")) multiplier *= 1.5;
    return multiplier;
  };

  const originalGetClickRiftworkMultiplier = getClickRiftworkMultiplier;
  getClickRiftworkMultiplier = function expandedClickRiftworkMultiplier() {
    let multiplier = originalGetClickRiftworkMultiplier();
    if (hasRiftwork("batonInTheVoid")) multiplier *= 1.75;
    return multiplier;
  };

  const originalGetResonancePercentPerLevel = getResonancePercentPerLevel;
  getResonancePercentPerLevel = function expandedResonancePercentPerLevel() {
    let percent = originalGetResonancePercentPerLevel();
    if (hasRiftwork("resonanceEngine")) percent *= 1.25;
    return percent;
  };

  renderGenerators = function renderGeneratorsWithPurchaseDeltas() {
    const visibleGenerators = getVisibleGenerators();
    const visibleIds = new Set(visibleGenerators.map((generator) => generator.id));
    const passiveRate = getPassiveRate();

    for (const generator of visibleGenerators) {
      const cost = getGeneratorCost(generator);
      const owned = getOwned(state, generator.id);
      const contribution = getGeneratorContribution(generator);
      const singleGain = generator.baseRate * state.generatorMultipliers[generator.id] * getProductionMultiplier() * getGeneratorRiftworkMultiplier();
      const shownContribution = owned > 0 ? contribution : singleGain;
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
          <span>+${formatNumber(shownContribution)}/s (+${formatNumber(singleGain)})</span>
          <span>${formatPercent(contributionPercent)} total</span>
        </div>
      `;
    }

    for (const button of els.generatorList.querySelectorAll("[data-generator-id]")) {
      if (!visibleIds.has(button.dataset.generatorId)) button.remove();
    }
  };

  renderUpgrades = function renderCompactSortedUpgrades() {
    installCompactUpgradeStyles();
    const visibleUpgrades = getVisibleUpgrades()
      .slice()
      .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
    const visibleIds = new Set(visibleUpgrades.map((upgrade) => upgrade.id));

    els.upgradeList.classList.add("upgrade-grid");

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
        button.dataset.upgradeId = upgrade.id;
        button.addEventListener("click", () => buyUpgrade(upgrade.id));
        els.upgradeList.append(button);
      }

      button.className = "upgrade-chip";
      button.disabled = state.shards < upgrade.cost;
      button.title = `${upgrade.name}\n${upgrade.description}\nCost: ${formatNumber(upgrade.cost)} Shards`;
      button.setAttribute("aria-label", `${upgrade.name}. ${upgrade.description}. Costs ${formatNumber(upgrade.cost)} Shards.`);
      button.innerHTML = `
        <span>
          <span class="upgrade-chip-title">${upgrade.name}</span>
          <span class="upgrade-chip-effect">${getUpgradeEffectLabel(upgrade)}</span>
        </span>
        <span class="upgrade-chip-cost">${formatNumber(upgrade.cost)}</span>
      `;
    }

    for (const button of els.upgradeList.querySelectorAll("[data-upgrade-id]")) {
      if (!visibleIds.has(button.dataset.upgradeId)) button.remove();
    }
  };

  const originalRenderStatistics = renderStatistics;
  renderStatistics = function renderStatisticsWithAcclaim() {
    originalRenderStatistics();
    const rows = [
      ["Acclaim", `${formatNumber(getAcclaimCount())} / ${formatNumber(ACCLAIM_MILESTONES.length)}`],
      ["Acclaim Bonus", `${formatNumber(getAcclaimMultiplier())}x`],
      ["Global Upgrades", `${formatNumber(state.globalMultiplier)}x`],
    ];

    els.statisticsList.insertAdjacentHTML("beforeend", rows
      .map(([label, value]) => `<div class="stat-row"><span>${label}</span><strong>${value}</strong></div>`)
      .join(""));
  };

  const originalRenderGameToText = renderGameToText;
  renderGameToText = function expandedRenderGameToText() {
    const snapshot = JSON.parse(originalRenderGameToText());
    snapshot.acclaim = getAcclaimCount();
    snapshot.acclaimMultiplier = getAcclaimMultiplier();
    snapshot.globalMultiplier = state.globalMultiplier;
    snapshot.expandedUpgradeCount = UPGRADES.length;
    snapshot.expandedRiftworkCount = RIFTWORK.length;
    return JSON.stringify(snapshot);
  };
  window.render_game_to_text = renderGameToText;

  installExpandedUpgrades();
  saveGame(false);
  render();
})();
