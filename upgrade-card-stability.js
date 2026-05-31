(() => {
  const openUpgradeIds = new Set();
  let handlerInstalled = false;

  function installUpgradeStabilityStyles() {
    if (document.querySelector("#upgrade-card-stability-styles")) return;

    const style = document.createElement("style");
    style.id = "upgrade-card-stability-styles";
    style.textContent = `
      #upgrade-list.upgrade-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 7px;
      }

      #upgrade-list .upgrade-chip {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) 66px !important;
        align-items: stretch !important;
        gap: 0 !important;
        width: 100%;
        text-align: left !important;
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
        min-height: 48px;
        padding: 8px 9px !important;
        text-align: left !important;
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
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #upgrade-list .upgrade-chip-effect {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #upgrade-list .upgrade-chip-cost {
        justify-self: end;
        text-align: right !important;
        white-space: nowrap;
      }

      #upgrade-list .upgrade-expand-label {
        justify-self: end;
        text-align: right !important;
        white-space: nowrap;
      }

      #upgrade-list .upgrade-buy-button {
        display: grid !important;
        place-items: center !important;
        width: 66px !important;
        min-width: 66px !important;
        height: 100% !important;
        min-height: 48px !important;
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

  function installUpgradePurchaseHandler() {
    if (handlerInstalled) return;
    handlerInstalled = true;

    els.upgradeList.addEventListener("click", (event) => {
      const buyButton = event.target.closest("[data-buy-upgrade-id]");
      if (!buyButton) return;

      event.preventDefault();
      event.stopPropagation();

      const upgradeId = buyButton.dataset.buyUpgradeId;
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
      buyUpgrade(upgrade.id);
    });
  }

  function renderStableUpgrades() {
    installUpgradeStabilityStyles();
    simplifyHeaders();
    installUpgradePurchaseHandler();

    const visibleUpgrades = getVisibleStableUpgrades();
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
      const affordable = state.shards >= upgrade.cost;
      const isOpen = openUpgradeIds.has(upgrade.id);

      let row = els.upgradeList.querySelector(`[data-upgrade-id="${upgrade.id}"]`);
      if (!row) {
        row = document.createElement("div");
        row.dataset.upgradeId = upgrade.id;
      }

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

  renderUpgrades = renderStableUpgrades;
  window.renderUpgrades = renderStableUpgrades;
  render();
})();
