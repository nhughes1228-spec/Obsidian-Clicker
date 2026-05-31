(() => {
  const openUpgradeIds = new Set();

  function simplifyHeaders() {
    const panels = document.querySelectorAll(".side-panel .panel");
    const generatorHeading = panels[0]?.querySelector(".section-heading div");
    const upgradeHeading = panels[1]?.querySelector(".section-heading div");
    if (generatorHeading) generatorHeading.innerHTML = "<h2>Generators</h2>";
    if (upgradeHeading) upgradeHeading.innerHTML = "<h2>Upgrades</h2>";
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

  function getSafeCost(upgrade) {
    const cost = Number(upgrade.cost);
    return Number.isFinite(cost) ? cost : Infinity;
  }

  function canAffordUpgrade(upgrade) {
    const shards = Number(state.shards);
    const cost = getSafeCost(upgrade);
    return Number.isFinite(shards) && Number.isFinite(cost) && shards >= cost;
  }

  function getVisibleUnpurchasedUpgrades() {
    return UPGRADES
      .filter((upgrade) => !state.purchasedUpgrades.includes(upgrade.id))
      .filter((upgrade) => {
        try {
          return upgrade.unlock(state);
        } catch (error) {
          return false;
        }
      })
      .slice()
      .sort((a, b) => getSafeCost(a) - getSafeCost(b) || String(a.name).localeCompare(String(b.name)));
  }

  function renderReliableUpgrades() {
    simplifyHeaders();
    els.upgradeList.classList.add("upgrade-grid");

    const visibleUpgrades = getVisibleUnpurchasedUpgrades();
    const visibleIds = new Set(visibleUpgrades.map((upgrade) => upgrade.id));

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

      const affordable = canAffordUpgrade(upgrade);
      const isOpen = openUpgradeIds.has(upgrade.id);
      row.className = `upgrade-chip ${affordable ? "is-affordable" : "is-locked"}`;
      row.innerHTML = `
        <details class="upgrade-details" ${isOpen ? "open" : ""}>
          <summary aria-label="Show details for ${upgrade.name}">
            <span>
              <span class="upgrade-chip-title">${upgrade.name}</span>
              <span class="upgrade-chip-effect">${getUpgradeEffectLabel(upgrade)}</span>
            </span>
            <span class="upgrade-chip-cost">${formatNumber(getSafeCost(upgrade))}</span>
            <span class="upgrade-expand-label">Details</span>
          </summary>
          <p class="upgrade-details-copy">${upgrade.description}</p>
        </details>
        <button class="upgrade-buy-button" type="button" data-buy-upgrade-id="${upgrade.id}" ${affordable ? "" : "disabled"}>Buy</button>
      `;

      const details = row.querySelector("details");
      details.addEventListener("toggle", () => {
        if (details.open) openUpgradeIds.add(upgrade.id);
        else openUpgradeIds.delete(upgrade.id);
      });

      const buyButton = row.querySelector("[data-buy-upgrade-id]");
      buyButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!canAffordUpgrade(upgrade)) return;
        buyUpgrade(upgrade.id);
      });

      els.upgradeList.append(row);
    }

    for (const row of els.upgradeList.querySelectorAll("[data-upgrade-id]")) {
      if (!visibleIds.has(row.dataset.upgradeId)) row.remove();
    }
  }

  function installUpgradeBuyFix() {
    if (typeof renderUpgrades !== "function" || !window.els && typeof els === "undefined") {
      window.requestAnimationFrame(installUpgradeBuyFix);
      return;
    }

    renderUpgrades = renderReliableUpgrades;
    window.renderUpgrades = renderReliableUpgrades;
    render();
  }

  installUpgradeBuyFix();
})();
