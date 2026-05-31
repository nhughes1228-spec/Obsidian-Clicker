(() => {
  let selectedGeneratorBuyMode = "1";
  const openUpgradeIds = new Set();
  let generatorHandlerInstalled = false;
  let upgradeHandlerInstalled = false;
  let upgradeToggleHandlerInstalled = false;
  let lastUpgradePurchaseAt = 0;
  let lastUpgradePurchaseId = "";

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

      #upgrade-list.upgrade-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 7px;
      }

      #upgrade-list .upgrade-chip {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) 72px !important;
        align-items: stretch !important;
        gap: 0 !important;
        width: 100%;
        border: 1px solid rgba(255, 255, 255, 0.085);
        border-radius: 10px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.025)),
          rgba(10, 10, 12, 0.94);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 10px 26px rgba(0, 0, 0, 0.18);
        overflow: hidden;
        text-align: left !important;
      }

      #upgrade-list .upgrade-chip.is-locked {
        opacity: 0.42;
        filter: saturate(0.78);
      }

      #upgrade-list .upgrade-details {
        display: block;
        min-width: 0;
      }

      #upgrade-list .upgrade-details summary {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) auto auto !important;
        align-items: center !important;
        gap: 8px !important;
        min-height: 52px;
        padding: 8px 9px !important;
        text-align: left !important;
        cursor: pointer;
        list-style: none;
        touch-action: manipulation;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }

      #upgrade-list .upgrade-details summary::-webkit-details-marker {
        display: none;
      }

      #upgrade-list .upgrade-details summary > span:first-child {
        display: block;
        min-width: 0;
        text-align: left !important;
      }

      #upgrade-list .upgrade-chip-title,
      #upgrade-list .upgrade-chip-effect,
      #upgrade-list .upgrade-details-copy {
        text-align: left !important;
      }

      #upgrade-list .upgrade-chip-title {
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

      #upgrade-list .upgrade-chip-effect {
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

      #upgrade-list .upgrade-chip-cost {
        justify-self: end;
        color: #ffffff;
        font-size: 0.82rem;
        font-weight: 900;
        letter-spacing: -0.02em;
        text-align: right !important;
        white-space: nowrap;
      }

      #upgrade-list .upgrade-expand-label {
        justify-self: end;
        color: var(--muted);
        font-size: 0.6rem;
        font-weight: 900;
        letter-spacing: 0.12em;
        text-align: right !important;
        text-transform: uppercase;
        white-space: nowrap;
      }

      #upgrade-list .upgrade-details-copy {
        margin: 0;
        padding: 0 9px 9px;
        color: var(--muted-strong);
        font-size: 0.72rem;
        font-weight: 600;
        line-height: 1.35;
      }

      #upgrade-list .upgrade-buy-button {
        display: grid !important;
        place-items: center !important;
        width: 72px !important;
        min-width: 72px !important;
        height: 100% !important;
        min-height: 52px !important;
        margin: 0 !important;
        padding: 0 8px !important;
        align-self: stretch !important;
        justify-self: stretch !important;
        text-align: center !important;
        border: 0;
        border-left: 1px solid rgba(255, 255, 255, 0.075);
        border-radius: 0 !important;
        background: rgba(114, 1, 177, 0.24);
        color: #ffffff;
        cursor: pointer;
        font-size: 0.68rem;
        font-weight: 900;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        touch-action: manipulation;
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
        -webkit-tap-highlight-color: transparent;
      }

      #upgrade-list .upgrade-buy-button.is-locked {
        cursor: not-allowed;
        opacity: 0.45;
        filter: saturate(0.78);
      }

      #upgrade-list .upgrade-buy-button:not(.is-locked):active {
        transform: scale(0.98);
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
        <button class="generator-buy-mode ${selectedGeneratorBuyMode === "1" ? "is-selected" : ""}" type="button" data-buy-mode="1">1x</button>
        <button class="generator-buy-mode ${selectedGeneratorBuyMode === "10" ? "is-selected" : ""}" type="button" data-buy-mode="10">10x</button>
        <button class="generator-buy-mode ${selectedGeneratorBuyMode === "50" ? "is-selected" : ""}" type="button" data-buy-mode="50">50x</button>
        <button class="generator-buy-mode ${selectedGeneratorBuyMode === "max" ? "is-selected" : ""}" type="button" data-buy-mode="max">Max</button>
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
      event.stopPropagation();
      buySelectedGeneratorAmount(card.dataset.generatorId);
    });
  }

  function renderGeneratorsClean() {
    installStoreControlStyles();
    simplifyHeaders();
    ensureGeneratorControls();
    installDelegatedGeneratorHandler();

    const visibleGenerators = getVisibleGenerators();
    const passiveRate = getPassiveRate();
    const fragment = document.createDocumentFragment();

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

      const card = document.createElement("button");
      card.type = "button";
      card.dataset.generatorId = generator.id;
      card.className = `item-card generator-card ${canBuy ? "is-affordable" : "is-locked"}`;
      card.innerHTML = `
        <div>
          <h3>${generator.name}</h3>
          <p>${generator.description}</p>
        </div>
        <div class="item-meta">
          <span class="price">${formatNumber(cost)}</span>
          <span>Owned ${owned}</span>
          <span>+${formatNumber(shownContribution)}/s (+${formatNumber(singleGain)})</span>
          <span>${formatPercent(contributionPercent)} total</span>
        </div>
      `;
      fragment.append(card);
    }

    els.generatorList.replaceChildren(fragment);
  }

  function getEffectLabel(upgrade) {
    const text = upgrade.description || "Upgrade";
    if (text.includes("All Shard production")) return "All production";
    if (text.includes("Manual clicks")) return "Click power";
    if (text.includes("Clicks borrow")) return "Click + passive";
    if (text.includes("double production") || text.includes("double again")) return "Generator x2";
    if (text.includes("Generator production")) return "Generators";
    return "Upgrade";
  }

  function getVisibleStableUpgrades() {
    return UPGRADES
      .filter((upgrade) => !state.purchasedUpgrades.includes(upgrade.id))
      .filter((upgrade) => {
        try {
          return upgrade.unlock(state);
        } catch {
          return false;
        }
      })
      .slice()
      .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
  }

  function tryPurchaseUpgrade(upgradeId) {
    const now = performance.now();
    if (upgradeId === lastUpgradePurchaseId && now - lastUpgradePurchaseAt < 180) return;

    const upgrade = UPGRADES.find((item) => item.id === upgradeId);
    if (!upgrade) return;
    if (state.purchasedUpgrades.includes(upgrade.id)) return;

    let unlocked = false;
    try {
      unlocked = upgrade.unlock(state);
    } catch {
      unlocked = false;
    }

    if (!unlocked || state.shards < upgrade.cost) return;

    lastUpgradePurchaseAt = now;
    lastUpgradePurchaseId = upgradeId;
    buyUpgrade(upgrade.id);
  }

  function installDelegatedUpgradeHandler() {
    if (!upgradeHandlerInstalled) {
      upgradeHandlerInstalled = true;

      els.upgradeList.addEventListener("pointerup", (event) => {
        const buyButton = event.target.closest("[data-buy-upgrade-id]");
        if (!buyButton) return;
        event.preventDefault();
        event.stopPropagation();
        tryPurchaseUpgrade(buyButton.dataset.buyUpgradeId);
      }, { passive: false });

      els.upgradeList.addEventListener("click", (event) => {
        const buyButton = event.target.closest("[data-buy-upgrade-id]");
        if (!buyButton) return;
        event.preventDefault();
        event.stopPropagation();
        tryPurchaseUpgrade(buyButton.dataset.buyUpgradeId);
      });
    }

    if (!upgradeToggleHandlerInstalled) {
      upgradeToggleHandlerInstalled = true;
      els.upgradeList.addEventListener("toggle", (event) => {
        const details = event.target.closest("details");
        const row = event.target.closest("[data-upgrade-id]");
        if (!details || !row) return;
        if (details.open) openUpgradeIds.add(row.dataset.upgradeId);
        else openUpgradeIds.delete(row.dataset.upgradeId);
      }, true);
    }
  }

  function renderUpgradesClean() {
    installStoreControlStyles();
    simplifyHeaders();
    installDelegatedUpgradeHandler();

    const visibleUpgrades = getVisibleStableUpgrades();
    els.upgradeList.classList.add("upgrade-grid");

    if (!visibleUpgrades.length) {
      const note = document.createElement("p");
      note.className = "empty-note";
      note.textContent = "No upgrades available yet.";
      els.upgradeList.replaceChildren(note);
      return;
    }

    const fragment = document.createDocumentFragment();

    for (const upgrade of visibleUpgrades) {
      const affordable = state.shards >= upgrade.cost;
      const isOpen = openUpgradeIds.has(upgrade.id);
      const row = document.createElement("div");
      row.dataset.upgradeId = upgrade.id;
      row.className = `upgrade-chip ${affordable ? "is-affordable" : "is-locked"}`;
      row.innerHTML = `
        <details class="upgrade-details" ${isOpen ? "open" : ""}>
          <summary>
            <span>
              <span class="upgrade-chip-title">${upgrade.name}</span>
              <span class="upgrade-chip-effect">${getEffectLabel(upgrade)}</span>
            </span>
            <span class="upgrade-chip-cost">${formatNumber(upgrade.cost)}</span>
            <span class="upgrade-expand-label">Details</span>
          </summary>
          <p class="upgrade-details-copy">${upgrade.description}</p>
        </details>
        <button class="upgrade-buy-button ${affordable ? "" : "is-locked"}" type="button" data-buy-upgrade-id="${upgrade.id}">Buy</button>
      `;
      fragment.append(row);
    }

    els.upgradeList.replaceChildren(fragment);
  }

  renderGenerators = renderGeneratorsClean;
  renderUpgrades = renderUpgradesClean;
  window.renderGenerators = renderGeneratorsClean;
  window.renderUpgrades = renderUpgradesClean;

  installStoreControlStyles();
  simplifyHeaders();
  render();
})();
