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

  function simplifyHeaders() {
    const panels = document.querySelectorAll(".side-panel .panel");
    const generatorHeading = panels[0]?.querySelector(".section-heading div");
    const upgradeHeading = panels[1]?.querySelector(".section-heading div");
    if (generatorHeading) generatorHeading.innerHTML = "<h2>Generators</h2>";
    if (upgradeHeading) upgradeHeading.innerHTML = "<h2>Upgrades</h2>";
  }

  function renderCleanGeneratorCards() {
    simplifyHeaders();

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

  renderGenerators = renderCleanGeneratorCards;
  window.renderGenerators = renderCleanGeneratorCards;
  render();
})();
