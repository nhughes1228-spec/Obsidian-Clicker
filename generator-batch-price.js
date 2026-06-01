(() => {
  function getSelectedBuyMode() {
    return document.querySelector(".generator-buy-mode.is-selected")?.dataset.buyMode || "1";
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
    const mode = getSelectedBuyMode();
    if (mode === "max") return getAffordableGeneratorAmount(generator);
    return Number(mode);
  }

  function renderGeneratorsWithBatchPrice() {
    const visibleGenerators = getVisibleGenerators();
    const passiveRate = getPassiveRate();
    const fragment = document.createDocumentFragment();

    for (const generator of visibleGenerators) {
      const singleCost = getGeneratorCost(generator);
      const owned = getOwned(state, generator.id);
      const contribution = getGeneratorContribution(generator);
      const singleGain = generator.baseRate * state.generatorMultipliers[generator.id] * getProductionMultiplier() * getGeneratorRiftworkMultiplier();
      const shownContribution = owned > 0 ? contribution : singleGain;
      const contributionPercent = passiveRate > 0 ? (contribution / passiveRate) * 100 : 0;
      const buyAmount = getSelectedGeneratorAmount(generator);
      const batchCost = buyAmount > 0 ? getGeneratorBatchCost(generator, buyAmount) : Infinity;
      const canBuy = buyAmount > 0 && batchCost <= state.shards;
      const displayedCost = buyAmount > 0 && Number.isFinite(batchCost) ? batchCost : singleCost;

      const card = document.createElement("button");
      card.type = "button";
      card.dataset.generatorId = generator.id;
      card.className = `item-card generator-card ${canBuy ? "is-affordable" : "is-locked"}`;
      card.setAttribute("aria-disabled", canBuy ? "false" : "true");
      card.innerHTML = `
        <div>
          <h3>${generator.name}</h3>
          <p>${generator.description}</p>
        </div>
        <div class="item-meta">
          <span class="price">${formatNumber(displayedCost)}</span>
          <span>Owned ${owned}</span>
          <span>+${formatNumber(shownContribution)}/s (+${formatNumber(singleGain)})</span>
          <span>${formatPercent(contributionPercent)} total</span>
        </div>
      `;

      fragment.append(card);
    }

    els.generatorList.replaceChildren(fragment);
  }

  renderGenerators = renderGeneratorsWithBatchPrice;
  window.renderGenerators = renderGeneratorsWithBatchPrice;
  render();
})();
