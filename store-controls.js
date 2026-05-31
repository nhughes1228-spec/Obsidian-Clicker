(() => {
  let selectedGeneratorBuyMode = "1";
  const openUpgradeIds = new Set();
  let generatorHandlerInstalled = false;
  let upgradeHandlerInstalled = false;

  function installStoreControlStyles() {
    if (document.querySelector("#store-control-styles")) return;

    const style = document.createElement("style");
    style.id = "store-control-styles";
    style.textContent = `
      .generator-purchase-controls {
        display: grid;
        gap: 7px;
        margin-bottom: 10px;
        padding: 9px;
        border: 1px solid rgba(255, 255, 255, 0.075);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.035);
      }

      .generator-purchase-controls span {
        color: var(--muted);
        font-size: 0.62rem;
        font-weight: 900;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      .generator-buy-mode-row {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 6px;
      }

      .generator-buy-mode {
        min-height: 30px;
        border: 1px solid rgba(255, 255, 255, 0.09);
        border-radius: 9px;
        background: rgba(255, 255, 255, 0.045);
        color: #ffffff;
        cursor: pointer;
        font-size: 0.68rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        touch-action: manipulation;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }

      .generator-buy-mode.is-selected {
        border-color: rgba(133, 1, 207, 0.65);
        background: rgba(114, 1, 177, 0.34);
        box-shadow: 0 0 18px rgba(114, 1, 177, 0.16);
      }

      .generator-card {
        cursor: pointer;
      }

      .generator-card.is-locked {
        opacity: 0.46;
        filter: saturate(0.76);
      }

      .upgrade-chip {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 8px;
        align-items: stretch;
        width: 100%;
        border: 1px solid rgba(255, 255, 255, 0.085);
        border-radius: 10px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.025)),
          rgba(10, 10, 12, 0.94);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 10px 26px rgba(0, 0, 0, 0.18);
        overflow: hidden;
      }

      .upgrade-chip.is-locked {
        opacity: 0.42;
        filter: saturate(0.78);
      }

      .upgrade-details { min-width: 0; }

      .upgrade-details summary {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto auto;
        align-items: center;
        gap: 8px;
        min-height: 48px;
        padding: 8px 9px;
        color: var(--ink);
        cursor: pointer;
        list-style: none;
        touch-action: manipulation;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }

      .upgrade-details summary::-webkit-details-marker { display: none; }

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
        white-space: nowrap;
      }

      .upgrade-expand-label {
        color: var(--muted);
        font-size: 0.6rem;
        font-weight: 900;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        white-space: nowrap;
      }

      .upgrade-details-copy {
        margin: 0;
        padding: 0 9px 9px;
        color: var(--muted-strong);
        font-size: 0.72rem;
        font-weight: 600;
        line-height: 1.35;
      }

      .upgrade-buy-button {
        min-width: 58px;
        padding: 0 10px;
        border: 0;
        border-left: 1px solid rgba(255, 255, 255, 0.075);
        background: rgba(114, 1, 177, 0.22);
        color: #ffffff;
        cursor: pointer;
        font-size: 0.68rem;
        font-weight: 900;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        touch-action: manipulation;
      }

      .upgrade-buy-button.is-locked {
        cursor: not-allowed;
        opacity: 0.45;
      }
    `;

    document.head.append(style);
  }

  function simplifyHeaders() {
    const panels = document.querySelectorAll(".side-panel .panel");
    const generatorHeading = panels[0]?.querySelector(".section-heading div");
    const upgradeHeading = panels[1]?.querySelector(".section-heading div");
    if (generatorHeading) generatorHeading.innerHTML = "<h2>Generators</h2>";
    if (upgradeHeading) upgradeHeading.innerHTML = "<h2>Upgrades</h2>";
  }

  function getGeneratorUnitCost(generator, offset = 0) {
    return Math.floor(generator.baseCost * Math.pow(COST_GROWTH, getOwned(state, generator.id) + offset));
  }

  function getGeneratorBatchCost(generator, amount) {
    let total = 0;
    for (let i = 0; i < amount; i += 1) {
      total += getGeneratorUnitCost(generator, i);
      if (!Number.isFinite(total)) return Infinity;
    }
    return total;
  }

  function getAffordableGeneratorAmount(generator) {
    let amount = 0;
    let total = 0;
    while (amount < 100000) {
      const nextCost = getGeneratorUnitCost(generator, amount);
      if (!Number.isFinite(nextCost) || total + nextCost > state.shards) break;
      total += nextCost;
      amount += 1;
    }
    return amount;
  }

  function getSelectedGeneratorAmount(generator) {
    if (selectedGeneratorBuyMode === "max") return getAffordableGeneratorAmount(generator);
    return Number(selectedGeneratorBuyMode);
  }

  function buySelectedGeneratorAmount(generatorId) {
    const generator = GENERATORS.find((item) => item.id === generatorId);
    if (!generator) return;

    const amount = getSelectedGeneratorAmount(generator);
    if (!Number.isFinite(amount) || amount <= 0) return;

    const cost = getGeneratorBatchCost(generator, amount);
    if (!Number.isFinite(cost) || cost > state.shards) return;

    state.shards -= cost;
    state.generatorCounts[generator.id] = getOwned(state, generator.id) + amount;
    addLog(`Bought ${formatNumber(amount)} ${generator.name}${amount === 1 ? "" : "s"}.`);
    saveGame(false);
    render();
  }

  function ensureGeneratorControls() {
    let controls = document.querySelector("#generator-purchase-controls");
    if (controls) return controls;

    controls = document.createElement("div");
    controls.id = "generator-purchase-controls";
    controls.className = "generator-purchase-controls";
    controls.innerHTML = `
      <span>Buy Amount</span>
      <div class="generator-buy-mode-row">
        <button class="generator-buy-mode is-selected" type="button" data-buy-mode="1">1x</button>
        <button class="generator-buy-mode" type="button" data-buy-mode="10">10x</button>
        <button class="generator-buy-mode" type="button" data-buy-mode="50">50x</button>
        <button class="generator-buy-mode" type="button" data-buy-mode="max">Max</button>
      </div>
    `;

    controls.addEventListener("click", (event) => {
      const button = event.target.closest("[data-buy-mode]");
      if (!button) return;
      selectedGeneratorBuyMode = button.dataset.buyMode;
      controls.querySelectorAll("[data-buy-mode]").forEach((modeButton) => {
        modeButton.classList.toggle("is-selected", modeButton.dataset.buyMode === selectedGeneratorBuyMode);
      });
      render();
    });

    els.generatorList.before(controls);
    return controls;
  }

  function installDelegatedGeneratorHandler() {
    if (generatorHandlerInstalled) return;
    generatorHandlerInstalled = true;
    els.generatorList.addEventListener("click", (event) => {
      const card = event.target.closest("[data-generator-id]");
      if (!card) return;
      event.preventDefault();
      buySelectedGeneratorAmount(card.dataset.generatorId);
    });
  }

  function renderGeneratorsWithSelector() {
    installStoreControlStyles();
    simplifyHeaders();
    ensureGeneratorControls();
    installDelegatedGeneratorHandler();

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
      const buyAmount = getSelectedGeneratorAmount(generator);
      const buyCost = buyAmount > 0 ? getGeneratorBatchCost(generator, buyAmount) : Infinity;
      const canBuy = buyAmount > 0 && buyCost <= state.shards;

      let card = els.generatorList.querySelector(`[data-generator-id="${generator.id}"]`);
      if (!card) {
        card = document.createElement("button");
        card.type = "button";
        card.dataset.generatorId = generator.id;
      }

      card.disabled = false;
      card.className = `item-card generator-card ${canBuy ? "is-affordable" : "is-locked"}`;
      card.innerHTML = `
        <div>
          <h3>${generator.name}</h3>
          <p>${generator.description}</p>
        </div>
        <div class="item-meta">
          <span class="price">${formatNumber(cost)}</span>
          <span>Owned ${owned}</span>
          <span>Buying ${selectedGeneratorBuyMode === "max" ? `Max (${formatNumber(buyAmount)})` : `${buyAmount}x`}</span>
          <span>Cost ${Number.isFinite(buyCost) ? formatNumber(buyCost) : "—"}</span>
          <span>+${formatNumber(shownContribution)}/s (+${formatNumber(singleGain)})</span>
          <span>${formatPercent(contributionPercent)} total</span>
        </div>
      `;
      els.generatorList.append(card);
    }

    for (const card of els.generatorList.querySelectorAll("[data-generator-id]")) {
      if (!visibleIds.has(card.dataset.generatorId)) card.remove();
    }
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

  function installDelegatedUpgradeHandler() {
    if (upgradeHandlerInstalled) return;
    upgradeHandlerInstalled = true;
    els.upgradeList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-buy-upgrade-id]");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      const upgrade = UPGRADES.find((item) => item.id === button.dataset.buyUpgradeId);
      if (!upgrade || state.purchasedUpgrades.includes(upgrade.id)) return;
      if (!upgrade.unlock(state) || state.shards < upgrade.cost) return;
      buyUpgrade(upgrade.id);
    });
  }

  function renderReliableUpgrades() {
    installStoreControlStyles();
    simplifyHeaders();
    installDelegatedUpgradeHandler();

    const visibleUpgrades = UPGRADES
      .filter((upgrade) => !state.purchasedUpgrades.includes(upgrade.id))
      .filter((upgrade) => {
        try { return upgrade.unlock(state); }
        catch { return false; }
      })
      .slice()
      .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));

    const visibleIds = new Set(visibleUpgrades.map((upgrade) => upgrade.id));
    els.upgradeList.classList.add("upgrade-grid");

    if (!visibleUpgrades.length) {
      els.upgradeList.querySelectorAll("[data-upgrade-id]").forEach((node) => node.remove());
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
      let row = els.upgradeList.querySelector(`[data-upgrade-id="${upgrade.id}"]`);
      if (!row) {
        row = document.createElement("div");
        row.dataset.upgradeId = upgrade.id;
      }

      const affordable = state.shards >= upgrade.cost;
      const isOpen = openUpgradeIds.has(upgrade.id);
      row.className = `upgrade-chip ${affordable ? "is-affordable" : "is-locked"}`;
      row.innerHTML = `
        <details class="upgrade-details" ${isOpen ? "open" : ""}>
          <summary>
            <span>
              <span class="upgrade-chip-title">${upgrade.name}</span>
              <span class="upgrade-chip-effect">${getUpgradeEffectLabel(upgrade)}</span>
            </span>
            <span class="upgrade-chip-cost">${formatNumber(upgrade.cost)}</span>
            <span class="upgrade-expand-label">Details</span>
          </summary>
          <p class="upgrade-details-copy">${upgrade.description}</p>
        </details>
        <button class="upgrade-buy-button ${affordable ? "" : "is-locked"}" type="button" data-buy-upgrade-id="${upgrade.id}">Buy</button>
      `;

      const details = row.querySelector("details");
      details.addEventListener("toggle", () => {
        if (details.open) openUpgradeIds.add(upgrade.id);
        else openUpgradeIds.delete(upgrade.id);
      });

      els.upgradeList.append(row);
    }

    for (const row of els.upgradeList.querySelectorAll("[data-upgrade-id]")) {
      if (!visibleIds.has(row.dataset.upgradeId)) row.remove();
    }
  }

  renderGenerators = renderGeneratorsWithSelector;
  renderUpgrades = renderReliableUpgrades;
  window.renderGenerators = renderGeneratorsWithSelector;
  window.renderUpgrades = renderReliableUpgrades;

  installStoreControlStyles();
  simplifyHeaders();
  render();
})();
