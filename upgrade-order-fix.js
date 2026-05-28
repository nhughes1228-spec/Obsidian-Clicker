(() => {
  function getUpgradeSnapshot() {
    if (typeof window.render_game_to_text !== "function") return [];

    try {
      const snapshot = JSON.parse(window.render_game_to_text());
      return Array.isArray(snapshot.availableUpgrades) ? snapshot.availableUpgrades : [];
    } catch (error) {
      return [];
    }
  }

  function forceUpgradeCostOrder() {
    const list = document.querySelector("#upgrade-list");
    if (!list) return;

    const orderedUpgrades = getUpgradeSnapshot()
      .slice()
      .sort((a, b) => (a.cost || 0) - (b.cost || 0) || String(a.name || "").localeCompare(String(b.name || "")));

    for (const upgrade of orderedUpgrades) {
      const row = list.querySelector(`[data-upgrade-id="${CSS.escape(upgrade.id)}"]`);
      if (row) list.appendChild(row);
    }
  }

  function installUpgradeOrderPatch() {
    if (typeof window.renderUpgrades !== "function") {
      window.requestAnimationFrame(installUpgradeOrderPatch);
      return;
    }

    if (window.renderUpgrades.__costOrderPatched) {
      forceUpgradeCostOrder();
      return;
    }

    const originalRenderUpgrades = window.renderUpgrades;
    window.renderUpgrades = function renderUpgradesInCostOrder(...args) {
      const result = originalRenderUpgrades.apply(this, args);
      forceUpgradeCostOrder();
      return result;
    };
    window.renderUpgrades.__costOrderPatched = true;

    forceUpgradeCostOrder();
  }

  installUpgradeOrderPatch();
})();
