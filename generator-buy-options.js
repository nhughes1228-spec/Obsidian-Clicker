(() => {
  const BUY_OPTIONS = [
    { label: "1", amount: 1 },
    { label: "10", amount: 10 },
    { label: "50", amount: 50 },
    { label: "Max", amount: "max" },
  ];

  function installGeneratorBuyStyles() {
    if (document.querySelector("#generator-buy-option-styles")) return;

    const style = document.createElement("style");
    style.id = "generator-buy-option-styles";
    style.textContent = `
      .generator-card {
        cursor: default;
      }

      .generator-card .item-meta {
        min-width: 132px;
      }

      .generator-buy-row {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 4px;
        margin-top: 4px;
      }

      .generator-buy-button {
        min-height: 28px;
        padding: 5px 6px;
        border: 1px solid rgba(255, 255, 255, 0.075);
        border-radius: 8px;
        background: rgba(114, 1, 177, 0.18);
        color: #ffffff;
        cursor: pointer;
        font-size: 0.64rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        touch-action: manipulation;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }

      .generator-buy-button:hover:not(:disabled) {
        border-color: rgba(133, 1, 207, 0.6);
        background: rgba(133, 1, 207, 0.34);
      }

      .generator-buy-button:active:not(:disabled) {
        transform: scale(0.97);
      }

      .generator-buy-button:disabled {
        cursor: not-allowed;
        opacity: 0.35;
        filter: saturate(0.75);
      }

      @media (max-width: 560px) {
        .generator-card {
          grid-template-columns: 1fr;
        }

        .generator-card .item-meta {
          justify-items: stretch;
          min-width: 0;
          text-align: left;
        }

        .generator-buy-row {
          grid-template-columns: repeat(4, minmax(54px, 1fr));
        }
      }
    `;

    document.head.append(style);
  }

  function getGeneratorUnitCost(generator, offset = 0) {
    return Math.floor(generator.baseCost * Math.pow(COST_GROWTH, getOwned(state, generator.id) + offset));
  }

  function getGeneratorPurchaseCost(generator, amount) {
    let total = 0;
    for (let i = 0; i < amount; i += 1) {
      total += getGeneratorUnitCost(generator, i);
      if (!Number.isFinite(total) || total > state.shards) return total;
    }
    return total;
  }

  function getAffordableGeneratorAmount(generator) {
    if (state.shards < getGeneratorUnitCost(generator)) return 0;

    let low = 1;
    let high = 1;

    while (getGeneratorPurchaseCost(generator, high) <= state.shards && high < 100000) {
      low = high;
      high *= 2;
    }

    high = Math.min(high, 100000);

    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (getGeneratorPurchaseCost(generator, mid) <= state.shards) low = mid;
      else high = mid - 1;
    }

    return low;
  }

  function buyGeneratorAmount(id, requestedAmount) {
    const generator = GENERATORS.find((item) => item.id === id);
    if (!generator) return;

    const amount = requestedAmount === "max" ? getAffordableGeneratorAmount(generator) : requestedAmount;
    if (!Number.isFinite(amount) || amount <= 0) return;

    const totalCost = getGeneratorPurchaseCost(generator, amount);
    if (!Number.isFinite(totalCost) || totalCost <= 0 || state.shards < totalCost) return;

    state.shards -= totalCost;
    state.generatorCounts[id] += amount;
    addLog(`Bought ${formatNumber(amount)} ${generator.name}${amount === 1 ? "" : "s"}.`);
    saveGame(false);
    render();
  }

  function getButtonDisabled(generator, amount) {
    if (amount === "max") return getAffordableGeneratorAmount(generator) <= 0;
    return getGeneratorPurchaseCost(generator, amount) > state.shards;
  }

  function renderGeneratorsWithBuyOptions() {
    installGeneratorBuyStyles();

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
      const maxAmount = getAffordableGeneratorAmount(generator);

      let card = els.generatorList.querySelector(`[data-generator-id="${generator.id}"]`);
      if (!card) {
        card = document.createElement("div");
        card.className = "item-card generator-card";
        card.dataset.generatorId = generator.id;
        els.generatorList.append(card);
      }

      card.className = "item-card generator-card";
      card.innerHTML = `
        <div>
          <h3>${generator.name}</h3>
          <p>${generator.description}</p>
        </div>
        <div class="item-meta">
          <span class="price">${formatNumber(cost)}</span>
          <span>${nextLabel}</span>
          <span>+${formatNumber(shownContribution)}/s (+${formatNumber(singleGain)})</span>
          <span>${formatPercent(contributionPercent)} total</span>
          <div class="generator-buy-row" aria-label="Buy ${generator.name}">
            ${BUY_OPTIONS.map((option) => {
              const disabled = getButtonDisabled(generator, option.amount);
              const label = option.amount === "max" ? `Max${maxAmount > 0 ? ` ${formatNumber(maxAmount)}` : ""}` : `Buy ${option.label}`;
              return `<button class="generator-buy-button" type="button" data-buy-generator-id="${generator.id}" data-buy-generator-amount="${option.amount}" ${disabled ? "disabled" : ""}>${label}</button>`;
            }).join("")}
          </div>
        </div>
      `;

      for (const button of card.querySelectorAll("[data-buy-generator-id]")) {
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          const amountValue = button.dataset.buyGeneratorAmount;
          const amount = amountValue === "max" ? "max" : Number(amountValue);
          buyGeneratorAmount(button.dataset.buyGeneratorId, amount);
        });
      }
    }

    for (const card of els.generatorList.querySelectorAll("[data-generator-id]")) {
      if (!visibleIds.has(card.dataset.generatorId)) card.remove();
    }
  }

  function installGeneratorBuyOptions() {
    if (typeof window.renderGenerators !== "function") {
      window.requestAnimationFrame(installGeneratorBuyOptions);
      return;
    }

    window.renderGenerators = renderGeneratorsWithBuyOptions;
    installGeneratorBuyStyles();
    render();
  }

  installGeneratorBuyOptions();
})();
