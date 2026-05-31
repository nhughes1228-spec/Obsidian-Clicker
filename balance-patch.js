(() => {
  const BALANCED_RIFT_BASE_SHARDS = 100000000;

  const RIFTWORK_COST_OVERRIDES = {
    echoAmplifier: 250,
    riftFoundry: 1000,
    batonInTheVoid: 2500,
    acclaimConductor: 5000,
    resonanceEngine: 10000,
    blackglassEndowment: 25000,
  };

  function applyRiftworkBalance() {
    if (!Array.isArray(RIFTWORK)) return;

    for (const upgrade of RIFTWORK) {
      if (Object.prototype.hasOwnProperty.call(RIFTWORK_COST_OVERRIDES, upgrade.id)) {
        upgrade.cost = RIFTWORK_COST_OVERRIDES[upgrade.id];
      }
    }
  }

  getPotentialResonance = function getBalancedPotentialResonance() {
    return Math.floor(Math.cbrt(Math.max(0, state.lifetimeShards) / BALANCED_RIFT_BASE_SHARDS));
  };

  getShardsForResonance = function getBalancedShardsForResonance(level) {
    return Math.pow(level, 3) * BALANCED_RIFT_BASE_SHARDS;
  };

  applyRiftworkBalance();
  render();
})();
