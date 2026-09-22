import { ACCLAIM_MILESTONES, GENERATORS, RIFTWORK, SAVE_VERSION, UPGRADES } from "./content.js";
import { patchTemplate, syncChildren } from "./dom.js";
import { EXTENDED_WORKS, EXPEDITION_TYPES, MASTERY_RANK_SECONDS, getExpeditionContracts, getMasteryRanks } from "./expansion.js";
import {
  deriveModifiers,
  formatDuration,
  formatNumber,
  formatPercent,
  getAcclaimCount,
  getAcclaimMultiplier,
  getAffordableGeneratorAmount,
  getAllProductionMultiplier,
  getAvailableEchoes,
  getClickPower,
  getClickRiftworkMultiplier,
  getGeneratorBatchCost,
  getGeneratorContribution,
  getGeneratorRiftworkMultiplier,
  getOwned,
  getPassiveRate,
  getPotentialResonance,
  getProductionMultiplier,
  getResonanceMultiplier,
  getResonancePercentPerLevel,
  getShardsForResonance,
  getTotalGeneratorsOwned,
  getVisibleGenerators,
  getVisibleUpgrades,
  isUpgradeUnlocked,
} from "./economy.js";
import {
  getGeneratorPurchasePreview,
  getGeneratorUpgradeGroups,
  getRiftConstellation,
  getRiftForecast,
  getUpgradeCatalog,
  getUpgradeCategory,
  getUpgradePurchasePreview,
} from "./progression.js";
import { ATTUNEMENTS, WIND_RIFT_TYPES, getMomentumMultiplier } from "./active-play.js";
import { ASPECT_SLOT_COUNT, RIFT_ASPECTS } from "./rift-strategy.js";
import {
  CHALLENGES,
  PROJECT_ALLOCATIONS,
  getAchievementCatalog,
  getActiveChallenge,
  getCampaignProgress,
  getCurrentWork,
  getCurrentWorkStage,
} from "./long-term.js";
import { getFirstRunObjective, getLogoEvolution } from "./identity.js";

export function createUI(getState, actions) {
  const els = {
    shardTotal: document.querySelector("#shard-total"),
    rateSummary: document.querySelector("#rate-summary"),
    clickPower: document.querySelector("#click-power"),
    passiveRate: document.querySelector("#passive-rate"),
    momentumValue: document.querySelector("#momentum-value"),
    momentumFill: document.querySelector("#momentum-fill"),
    momentumBonus: document.querySelector("#momentum-bonus"),
    windRiftButton: document.querySelector("#wind-rift-button"),
    windRiftName: document.querySelector("#wind-rift-name"),
    windRiftTimer: document.querySelector("#wind-rift-timer"),
    dockShards: document.querySelector("#dock-shards"),
    dockRate: document.querySelector("#dock-rate"),
    logoButton: document.querySelector("#logo-button"),
    logoStage: document.querySelector("#logo-stage"),
    logoImg: document.querySelector("#logo-img"),
    generatorVoices: document.querySelector("#generator-voices"),
    sigilTitle: document.querySelector("#sigil-title"),
    firstRunObjective: document.querySelector("#first-run-objective"),
    objectiveTitle: document.querySelector("#objective-title"),
    objectiveDetail: document.querySelector("#objective-detail"),
    objectiveProgress: document.querySelector("#objective-progress"),
    floatLayer: document.querySelector("#float-layer"),
    generatorList: document.querySelector("#generator-list"),
    upgradeList: document.querySelector("#upgrade-list"),
    upgradeTabs: document.querySelector("#upgrade-tabs"),
    riftPreview: document.querySelector("#rift-preview"),
    riftworkList: document.querySelector("#riftwork-list"),
    runHistoryList: document.querySelector("#run-history-list"),
    goalView: document.querySelector("#goal-view"),
    enterRiftBtn: document.querySelector("#enter-rift-btn"),
    statisticsList: document.querySelector("#statistics-list"),
    saveStatus: document.querySelector("#save-status"),
    offlineDialog: document.querySelector("#offline-dialog"),
    offlineSummary: document.querySelector("#offline-summary"),
    announcer: document.querySelector("#game-announcer"),
  };

  const generatorNodes = new Map();
  const upgradeNodes = new Map();
  const upgradeGroupNodes = new Map();
  const riftworkNodes = new Map();
  const openUpgradeIds = new Set();
  let selectedBuyMode = "1";
  let selectedUpgradeTab = "available";
  let selectedRecordTab = "run";
  let selectedGoalTab = "acclaim";
  let lastChronicleKey = "";
  let lastStructureKey = "";
  let lastObjectiveId;

  document.querySelectorAll("[data-setting]").forEach((input) => {
    input.addEventListener("change", () => actions.updateSetting(input.dataset.setting, input.checked));
  });

  document.querySelector("#attunement-options").addEventListener("click", (event) => {
    const button = event.target.closest("[data-attunement]");
    if (button) actions.selectAttunement(button.dataset.attunement);
  });

  document.querySelector("#generator-purchase-controls")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-buy-mode]");
    if (!button) return;
    selectedBuyMode = button.dataset.buyMode;
    document.querySelectorAll("[data-buy-mode]").forEach((modeButton) => {
      modeButton.classList.toggle("is-selected", modeButton.dataset.buyMode === selectedBuyMode);
    });
    actions.requestRender(true);
  });

  els.generatorList.addEventListener("click", (event) => {
    const card = event.target.closest("[data-generator-id]");
    if (card && !card.disabled) actions.buyGenerator(card.dataset.generatorId, selectedBuyMode);
  });

  els.upgradeList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-buy-upgrade-id]");
    if (button && !button.disabled) actions.buyUpgrade(button.dataset.buyUpgradeId);
  });

  els.upgradeTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-upgrade-tab]");
    if (!button) return;
    selectedUpgradeTab = button.dataset.upgradeTab;
    selectTab(els.upgradeTabs, "upgradeTab", selectedUpgradeTab);
    actions.requestRender(true);
  });

  document.querySelector("#record-tabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-record-tab]");
    if (!button) return;
    selectedRecordTab = button.dataset.recordTab;
    selectTab(document.querySelector("#record-tabs"), "recordTab", selectedRecordTab);
    actions.requestRender(true);
  });

  document.querySelector("#goal-tabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-goal-tab]");
    if (!button) return;
    selectedGoalTab = button.dataset.goalTab;
    selectTab(document.querySelector("#goal-tabs"), "goalTab", selectedGoalTab);
    actions.requestRender(true);
  });

  els.goalView.addEventListener("click", (event) => {
    const work = event.target.closest("[data-build-work]");
    if (work) actions.expansionCommand("buildWork", { id: work.dataset.buildWork });
    const expedition = event.target.closest("[data-expedition]");
    if (expedition) actions.expansionCommand("expeditionStart", { key: expedition.dataset.expedition });
    if (event.target.closest("[data-abandon-expedition]")) actions.expansionCommand("expeditionAbandon");
    if (event.target.closest("[data-refresh-expeditions]")) actions.expansionCommand("expeditionRefresh");
    const allocation = event.target.closest("[data-project-allocation]");
    if (allocation) actions.setProjectAllocation(allocation.dataset.projectAllocation);
    const challenge = event.target.closest("[data-challenge-id]");
    if (challenge) actions.startChallenge(challenge.dataset.challengeId);
    if (event.target.closest("[data-abandon-challenge]")) actions.abandonChallenge();
  });
  els.goalView.addEventListener("change", (event) => {
    const specialization = event.target.closest("[data-specialization]");
    if (specialization) actions.expansionCommand("specialization", { id: specialization.dataset.specialization, value: specialization.value });
    const control = event.target.closest("[data-automation]");
    if (!control) return;
    actions.configureAutomation(control.dataset.automation, control.type === "checkbox" ? control.checked : control.type === "number" ? Number(control.value) : control.value);
  });
  document.querySelector("#objective-picker").addEventListener("change", (event) => actions.expansionCommand("pinObjective", { id: event.target.value || null }));
  document.querySelector("#pinned-objective").addEventListener("click", (event) => {
    if (event.target.closest("[data-recover-allocation]")) actions.setProjectAllocation(0.25);
    if (event.target.closest("[data-recover-challenge]")) actions.abandonChallenge();
    const tab = event.target.closest("[data-open-goal]");
    if (tab) { document.querySelector("#top-menu").open = true; selectedGoalTab = tab.dataset.openGoal; selectTab(document.querySelector("#goal-tabs"), "goalTab", selectedGoalTab); actions.requestRender(true); }
  });

  els.upgradeList.addEventListener("toggle", (event) => {
    const details = event.target.closest("details");
    const row = event.target.closest("[data-upgrade-id]");
    if (!details || !row) return;
    if (details.open) openUpgradeIds.add(row.dataset.upgradeId);
    else openUpgradeIds.delete(row.dataset.upgradeId);
  }, true);

  els.riftworkList.addEventListener("click", (event) => {
    const aspectButton = event.target.closest("[data-aspect-id]");
    if (aspectButton) {
      if (aspectButton.dataset.aspectAction === "unlock") actions.unlockAspect(aspectButton.dataset.aspectId);
      else actions.toggleAspect(aspectButton.dataset.aspectId);
      return;
    }
    const card = event.target.closest("[data-riftwork-id]");
    if (card && !card.disabled) actions.buyRiftwork(card.dataset.riftworkId);
  });

  function render(forceStructure = false) {
    const state = getState();
    const modifiers = deriveModifiers(state);
    const passiveRate = getPassiveRate(state, modifiers);
    const clickPower = getClickPower(state, modifiers);

    els.shardTotal.textContent = `${formatNumber(Math.floor(state.shards))} Shards`;
    els.rateSummary.textContent = `+${formatNumber(clickPower)} per click · ${formatNumber(passiveRate)} per second`;
    els.clickPower.textContent = formatNumber(clickPower);
    els.passiveRate.textContent = formatNumber(passiveRate);
    els.momentumValue.textContent = `${Math.round(state.momentum)}%`;
    els.momentumFill.style.width = `${state.momentum}%`;
    els.momentumBonus.textContent = `Clicks x${formatNumber(getMomentumMultiplier(state))}`;
    els.dockShards.textContent = formatNumber(Math.floor(state.shards));
    els.dockRate.textContent = formatNumber(passiveRate);

    const visibleGenerators = getVisibleGenerators(state);
    const visibleUpgrades = selectedUpgradeTab === "rift" ? [] : getUpgradeCatalog(state, selectedUpgradeTab);
    const structureKey = `${visibleGenerators.map((item) => item.id).join(",")}|${selectedUpgradeTab}:${visibleUpgrades.map((item) => item.id).join(",")}|${state.purchasedRiftwork.join(",")}`;
    const structureChanged = forceStructure || structureKey !== lastStructureKey;
    lastStructureKey = structureKey;

    renderGenerators(state, modifiers, passiveRate, visibleGenerators, structureChanged);
    renderUpgrades(state, visibleUpgrades, structureChanged);
    if (document.querySelector("#top-menu").open) renderRift(state);
    renderActivePlay(state);
    renderRiftwork(state, structureChanged);
    if (document.querySelector("#top-menu").open) {
      renderStatistics(state, modifiers, passiveRate, clickPower);
      renderRunHistory(state);
      renderLongTerm(state);
    }
    renderIdentity(state, passiveRate);
    renderPinnedObjective(state, passiveRate);
  }

  function renderIdentity(state, passiveRate) {
    document.body.classList.toggle("reduced-motion", state.settings.reducedMotion);
    const objective = getFirstRunObjective(state, passiveRate);
    els.firstRunObjective.hidden = !objective;
    if (objective) {
      els.objectiveTitle.textContent = objective.title;
      els.objectiveDetail.textContent = objective.detail;
      els.objectiveProgress.style.width = `${Math.round(objective.progress * 100)}%`;
    }
    const objectiveId = objective?.id || "complete";
    if (lastObjectiveId !== undefined && lastObjectiveId !== objectiveId) {
      announce(objective ? `New objective: ${objective.title}. ${objective.detail}` : "Opening objectives complete. The storm is yours to shape.");
      actions.objectiveAdvanced?.();
    }
    lastObjectiveId = objectiveId;

    const evolution = getLogoEvolution(state);
    els.logoStage.dataset.evolution = evolution.tier;
    els.logoStage.style.setProperty("--storm-intensity", evolution.intensity.toFixed(3));
    els.sigilTitle.textContent = evolution.title;
    els.logoButton.setAttribute("aria-label", `Gather Shards from the ${evolution.title}`);
    const voiceKey = evolution.activeGeneratorIds.join(",");
    if (els.generatorVoices.dataset.voices === voiceKey) return;
    els.generatorVoices.dataset.voices = voiceKey;
    els.generatorVoices.replaceChildren(...evolution.activeGeneratorIds.slice(0, 12).map((id, index) => {
      const generator = GENERATORS.find((item) => item.id === id);
      const voice = document.createElement("span");
      voice.className = "generator-voice generator-sigil";
      voice.dataset.icon = generator.icon;
      voice.style.setProperty("--voice-index", index);
      voice.style.setProperty("--voice-count", Math.min(12, evolution.activeGeneratorIds.length));
      voice.title = generator.name;
      return voice;
    }));
  }

  function renderGenerators(state, modifiers, passiveRate, visibleGenerators, structureChanged) {
    const visibleIds = new Set(visibleGenerators.map((generator) => generator.id));
    if (structureChanged) {
      for (const [id, node] of generatorNodes) {
        if (!visibleIds.has(id)) {
          node.remove();
          generatorNodes.delete(id);
        }
      }
    }

    for (const generator of visibleGenerators) {
      let card = generatorNodes.get(generator.id);
      if (!card) {
        card = document.createElement("button");
        card.type = "button";
        card.dataset.generatorId = generator.id;
        card.className = "item-card generator-card";
        card.innerHTML = `
          <span class="generator-sigil" aria-hidden="true"></span>
          <div><h3></h3><p></p></div>
          <div class="item-meta">
            <span class="price"></span>
            <span data-owned></span>
            <span data-rate></span>
            <span data-share></span>
          </div>`;
        card.querySelector("h3").textContent = generator.name;
        card.querySelector("p").textContent = generator.description;
        card.querySelector(".generator-sigil").dataset.icon = generator.icon;
        generatorNodes.set(generator.id, card);
        els.generatorList.append(card);
      }

      const owned = getOwned(state, generator.id);
      const contribution = getGeneratorContribution(state, generator, modifiers);
      const amount = selectedBuyMode === "max"
        ? getAffordableGeneratorAmount(state, generator)
        : Number(selectedBuyMode);
      const batchCost = amount > 0 ? getGeneratorBatchCost(state, generator, amount) : Infinity;
      const affordable = amount > 0 && batchCost <= state.shards;
      const preview = getGeneratorPurchasePreview(state, generator, amount);
      const singleGain = amount > 0 ? preview.rateGain / amount : 0;
      const shownContribution = owned > 0 ? contribution : singleGain;

      card.disabled = !affordable;
      card.classList.toggle("is-affordable", affordable);
      card.classList.toggle("is-locked", !affordable);
      card.querySelector(".price").textContent = formatNumber(Number.isFinite(batchCost) ? batchCost : 0);
      card.querySelector("[data-owned]").textContent = `Owned ${formatNumber(owned)}`;
      card.querySelector("[data-rate]").textContent = amount > 0
        ? `${formatNumber(passiveRate)}/s → ${formatNumber(preview.afterRate)}/s`
        : `+${formatNumber(shownContribution)}/s`;
      card.querySelector("[data-share]").textContent = `${formatPercent(passiveRate > 0 ? (contribution / passiveRate) * 100 : 0)} total`;
    }
  }

  function renderUpgrades(state, visibleUpgrades, structureChanged) {
    if (selectedUpgradeTab === "rift") {
      if (structureChanged) renderRiftUpgradeCollection(state);
      return;
    }

    const visibleIds = new Set(visibleUpgrades.map((upgrade) => upgrade.id));
    if (structureChanged) {
      for (const [id, node] of upgradeNodes) {
        if (!visibleIds.has(id)) {
          node.remove();
          upgradeNodes.delete(id);
        }
      }
    }

    els.upgradeList.classList.add("upgrade-grid");
    let empty = els.upgradeList.querySelector(".empty-note");
    if (!visibleUpgrades.length) {
      if (!empty) {
        empty = document.createElement("p");
        empty.className = "empty-note";
        els.upgradeList.append(empty);
      }
      empty.textContent = selectedUpgradeTab === "purchased" ? "No upgrades purchased yet." : "No upgrades in this view yet.";
      syncChildren(els.upgradeList, [empty]);
      return;
    }
    empty?.remove();

    const orderedUpgrades = selectedUpgradeTab === "generator"
      ? getGeneratorUpgradeGroups(visibleUpgrades).flatMap((group) => group.upgrades)
      : visibleUpgrades;
    let previousGeneratorId = null;
    const orderedNodes = [];
    let currentGroupBody = null;
    const groupedRows = new Map();
    for (const upgrade of orderedUpgrades) {
      if (structureChanged && selectedUpgradeTab === "generator" && upgrade.effect.generatorId !== previousGeneratorId) {
        previousGeneratorId = upgrade.effect.generatorId;
        const group = getGeneratorUpgradeGroups(visibleUpgrades).find((item) => item.generator.id === previousGeneratorId);
        const purchasedCount = group.upgrades.filter((item) => state.purchasedUpgrades.includes(item.id)).length;
        let groupNode = upgradeGroupNodes.get(previousGeneratorId);
        if (!groupNode) {
          groupNode = document.createElement("details");
          groupNode.className = "upgrade-group";
          groupNode.dataset.upgradeGroup = previousGeneratorId;
          groupNode.open = getOwned(state, previousGeneratorId) > 0 && purchasedCount < group.upgrades.length;
          groupNode.innerHTML = `<summary><strong></strong><span></span></summary><div class="upgrade-group-body"></div>`;
          upgradeGroupNodes.set(previousGeneratorId, groupNode);
        }
        groupNode.querySelector("strong").textContent = group.generator.name;
        groupNode.querySelector("span").textContent = `${purchasedCount} / ${group.upgrades.length}`;
        currentGroupBody = groupNode.querySelector(".upgrade-group-body");
        groupedRows.set(currentGroupBody, []);
        orderedNodes.push(groupNode);
      }
      let row = upgradeNodes.get(upgrade.id);
      if (!row) {
        row = document.createElement("div");
        row.dataset.upgradeId = upgrade.id;
        row.className = "upgrade-chip";
        row.innerHTML = `
          <details class="upgrade-details">
            <summary>
              <span><span class="upgrade-chip-title"></span><span class="upgrade-chip-effect"></span></span>
              <span class="upgrade-chip-cost"></span>
              <span class="upgrade-expand-label">Details</span>
            </summary>
            <p class="upgrade-details-copy"></p>
          </details>
          <button class="upgrade-buy-button" type="button">Buy</button>`;
        row.querySelector(".upgrade-chip-title").textContent = upgrade.name;
        row.querySelector(".upgrade-chip-effect").textContent = getEffectLabel(upgrade);
        row.querySelector(".upgrade-details-copy").textContent = upgrade.description;
        const details = row.querySelector("details");
        details.open = openUpgradeIds.has(upgrade.id);
        const button = row.querySelector("button");
        button.dataset.buyUpgradeId = upgrade.id;
        upgradeNodes.set(upgrade.id, row);
      }

      if (structureChanged) {
        if (selectedUpgradeTab === "generator") groupedRows.get(currentGroupBody).push(row);
        else orderedNodes.push(row);
      }

      const affordable = state.shards >= upgrade.cost;
      const purchased = state.purchasedUpgrades.includes(upgrade.id);
      const unlocked = isUpgradeUnlocked(state, upgrade);
      const preview = purchased ? null : getUpgradePurchasePreview(state, upgrade);
      row.classList.toggle("is-affordable", affordable && !purchased);
      row.classList.toggle("is-locked", (!affordable || !unlocked) && !purchased);
      row.classList.toggle("is-owned", purchased);
      row.querySelector(".upgrade-chip-cost").textContent = purchased ? "Owned" : formatNumber(upgrade.cost);
      row.querySelector(".upgrade-details-copy").textContent = purchased
        ? upgrade.description
        : `${upgrade.description} ${formatNumber(preview.beforeRate)}/s → ${formatNumber(preview.afterRate)}/s; click ${formatNumber(preview.beforeClick)} → ${formatNumber(preview.afterClick)}.`;
      row.querySelector("button").hidden = purchased;
      row.querySelector("button").disabled = purchased || !affordable || !unlocked;
      row.querySelector("button").textContent = unlocked ? "Buy" : "Locked";
    }
    if (structureChanged) {
      for (const [body, rows] of groupedRows) syncChildren(body, rows);
      syncChildren(els.upgradeList, orderedNodes);
    }
  }

  function renderRiftUpgradeCollection(state) {
    els.upgradeList.replaceChildren();
    els.upgradeList.classList.add("upgrade-grid");
    for (const upgrade of RIFTWORK) {
      const row = document.createElement("div");
      row.className = "owned-upgrade-row";
      row.classList.toggle("is-owned", state.purchasedRiftwork.includes(upgrade.id));
      row.innerHTML = `<span><strong></strong><small></small></span><b></b>`;
      row.querySelector("strong").textContent = upgrade.name;
      row.querySelector("small").textContent = upgrade.tag;
      row.querySelector("b").textContent = state.purchasedRiftwork.includes(upgrade.id) ? "Etched" : `${formatNumber(upgrade.cost)} Echoes`;
      els.upgradeList.append(row);
    }
  }

  function renderRift(state) {
    const forecast = getRiftForecast(state);
    const availableEchoes = getAvailableEchoes(state);
    const potentialResonance = getPotentialResonance(state);
    const nextResonance = state.totalEchoesEarned + availableEchoes;
    const bonusNow = (getResonanceMultiplier(state) - 1) * 100;
    const bonusAfter = nextResonance * getResonancePercentPerLevel(state);

    els.enterRiftBtn.disabled = availableEchoes <= 0 || Boolean(state.activeChallenge);
    els.enterRiftBtn.textContent = availableEchoes > 0 ? "Enter the Rift" : "The Rift Sleeps";
    const rows = [
      ["Echoes Held", formatNumber(state.echoes)],
      ["Echoes Waiting", `+${formatNumber(availableEchoes)}`],
      ["Resonance", formatNumber(state.resonance)],
      ["Resonance Bonus", `${formatPercent(bonusNow)} now · ${formatPercent(bonusAfter)} after`],
      ["Next Echo", `${formatNumber(getShardsForResonance(potentialResonance + 1))} lifetime Shards`],
      ["One Whisperer", `${formatNumber(forecast.passiveBefore)}/s → ${formatNumber(forecast.passiveAfter)}/s`],
      ["Click Baseline", `${formatNumber(forecast.clickBefore)} → ${formatNumber(forecast.clickAfter)}`],
      ["Replay Estimate", forecast.replaySeconds === null ? "Not yet measured" : formatDuration(forecast.replaySeconds)],
      ["Will Dissolve", `${formatNumber(forecast.lostGenerators)} generators · ${formatNumber(forecast.lostUpgrades)} upgrades`],
    ];
    els.riftPreview.innerHTML = rows.map(([label, value]) => `<div class="rift-preview-row"><span>${label}</span><strong>${value}</strong></div>`).join("");
    const options = document.querySelector("#attunement-options");
    if (!options.childElementCount) {
      for (const attunement of ATTUNEMENTS) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.attunement = attunement.id;
        button.textContent = attunement.name;
        options.append(button);
      }
    }
    options.querySelectorAll("button").forEach((button) => button.classList.toggle("is-selected", button.dataset.attunement === state.pendingAttunement));
    document.querySelector("#attunement-description").textContent = ATTUNEMENTS.find((item) => item.id === state.pendingAttunement)?.description || "";
    document.querySelector("#rift-recommendation").textContent = forecast.recommendation;
    document.querySelector("#aspect-slot-count").textContent = `${state.pendingAspects.length} / ${ASPECT_SLOT_COUNT}`;
    document.querySelector("#aspect-slots").innerHTML = Array.from({ length: ASPECT_SLOT_COUNT }, (_, index) => {
      const aspect = RIFT_ASPECTS.find((item) => item.id === state.pendingAspects[index]);
      return `<span>${aspect ? aspect.name : "Open slot"}</span>`;
    }).join("");
  }

  function renderActivePlay(state) {
    document.documentElement.classList.toggle("reduce-motion", state.settings.reducedMotion);
    document.querySelectorAll("[data-setting]").forEach((input) => {
      input.checked = state.settings[input.dataset.setting];
    });
    const activeRift = state.activeWindRift;
    els.windRiftButton.hidden = !activeRift;
    if (activeRift) {
      const definition = WIND_RIFT_TYPES.find((item) => item.id === activeRift.type);
      els.windRiftName.textContent = definition?.name || "Wind Rift";
      els.windRiftTimer.textContent = `${Math.max(1, Math.ceil(activeRift.seconds))}s`;
    }
    els.logoButton.classList.toggle("has-click-surge", state.clickSurgeSeconds > 0);
    els.logoButton.classList.toggle("has-production-surge", state.productionSurgeSeconds > 0);
  }

  function renderRiftwork(state, structureChanged) {
    if (!structureChanged) return;
    const constellation = getRiftConstellation(state);
    patchTemplate(els.riftworkList, constellation.map((branch) => `
      <section class="rift-branch" data-rift-branch="${branch.id}">
        <header><span class="branch-mark"></span><div><strong>${branch.name}</strong><small>${branch.description}</small></div></header>
        <div class="branch-path">
          ${branch.riftwork.map((upgrade) => {
            const owned = state.purchasedRiftwork.includes(upgrade.id);
            return `<button type="button" class="constellation-node ${owned ? "is-owned" : ""}" data-riftwork-id="${upgrade.id}" ${owned || state.echoes < upgrade.cost ? "disabled" : ""}>
              <span><strong>${upgrade.name}</strong><small>${upgrade.tag}</small></span><b>${owned ? "Etched" : `${formatNumber(upgrade.cost)} E`}</b>
            </button>`;
          }).join("")}
          ${branch.aspects.map((aspect) => `<button type="button" class="constellation-node aspect-node ${aspect.unlocked ? "is-unlocked" : ""} ${aspect.pending ? "is-equipped" : ""}" data-aspect-id="${aspect.id}" data-aspect-action="${aspect.unlocked ? "equip" : "unlock"}" ${!aspect.unlocked && state.echoes < aspect.cost ? "disabled" : ""}>
            <span><strong>${aspect.name}</strong><small>${aspect.description}</small></span><b>${aspect.pending ? "Slotted" : aspect.unlocked ? "Equip" : `${aspect.cost} E`}</b>
          </button>`).join("")}
        </div>
      </section>`).join(""));
  }

  function renderRunHistory(state) {
    if (!state.runHistory.length) {
      els.runHistoryList.innerHTML = `<p class="empty-note">Complete a Rift to record your first run.</p>`;
      return;
    }
    els.runHistoryList.innerHTML = [...state.runHistory].reverse().map((run, index) => {
      const aspectNames = run.aspects.map((id) => RIFT_ASPECTS.find((item) => item.id === id)?.name).filter(Boolean);
      return `<article class="run-record"><span>#${state.runHistory.length - index}</span><div><strong>${formatNumber(run.runShards)} Shards · +${formatNumber(run.echoesGained)} Echoes</strong><small>${formatDuration(run.durationSeconds)} · ${run.attunement}${aspectNames.length ? ` · ${aspectNames.join(" + ")}` : ""}</small></div><b>${formatNumber(run.peakPassiveRate)}/s peak</b></article>`;
    }).join("");
  }

  function renderLongTerm(state) {
    if (selectedGoalTab !== "chronicle") lastChronicleKey = "";
    renderCampaignCapstone(state);
    if (selectedGoalTab === "acclaim") renderAchievements(state);
    if (selectedGoalTab === "work") renderWork(state);
    if (selectedGoalTab === "challenges") renderChallenges(state);
    if (selectedGoalTab === "chronicle") renderChronicle(state);
    if (selectedGoalTab === "automation") renderAutomation(state);
    if (selectedGoalTab === "mastery") renderMastery(state);
    if (selectedGoalTab === "expeditions") renderExpeditions(state);
  }

  function renderMastery(state) {
    patchTemplate(els.goalView, `<p>${getMasteryRanks(state)} / 80 ranks · ${state.masteryTokens} Mastery tokens</p>${state.riftEntries < 1 ? '<p class="empty-note">Unlocks at the first Rift.</p>' : ""}<div class="mastery-list">${GENERATORS.map((generator) => {
      const item = state.mastery[generator.id];
      const target = MASTERY_RANK_SECONDS[item.rank];
      return `<article class="mastery-row"><header><strong>${generator.name}</strong><span>Rank ${item.rank} / 5</span></header><progress max="${target || 1}" value="${target ? item.progress : 1}" aria-label="${generator.name} mastery"></progress><label>Next Rift specialization<select data-specialization="${generator.id}" ${state.riftEntries < 1 ? "disabled" : ""}><option value="focus" ${item.pending === "focus" ? "selected" : ""}>Focus: +10% per rank</option><option value="chorus" ${item.pending === "chorus" ? "selected" : ""}>Chorus: others +1% per rank</option></select></label><small>Active: ${item.specialization === "focus" ? "Focus" : "Chorus"}${target ? ` · ${Math.floor(item.progress / target * 100)}%` : " · Mastered"}</small></article>`;
    }).join("")}</div>`);
  }

  function renderExpeditions(state) {
    const active = state.activeExpedition;
    const type = active && EXPEDITION_TYPES.find((item) => item.id === active.type);
    const target = type ? type.target * Math.pow(1.25, active.tier) : 0;
    patchTemplate(els.goalView, `<p>${state.expeditionsCompleted} expeditions completed · ${state.expeditionMaterials} Survey materials</p>${active ? `<section class="expedition-active"><strong>${type.name} · Tier ${active.tier}</strong><p>${formatNumber(active.state.runShards)} / ${formatNumber(target)} Shards</p><progress max="1" value="${Math.min(1, active.state.runShards / target)}" aria-label="Expedition progress"></progress><small>${formatNumber(getPassiveRate(active.state))}/s · ${formatDuration(active.seconds)}</small><button type="button" data-abandon-expedition>Abandon expedition</button></section>` : ""}<div class="expedition-list">${getExpeditionContracts(state).map((contract) => `<article><header><strong>${contract.name}</strong><span>Tier ${contract.tier}</span></header><p>${contract.description}</p><small>Target ${formatNumber(contract.target)} Shards · ${Math.min(10, 1 + Math.floor(contract.tier / 3))} materials</small><button type="button" data-expedition="${contract.key}" ${active || state.riftEntries < 2 ? "disabled" : ""}>${state.riftEntries < 2 ? "Unlocks at Rift 2" : "Dispatch"}</button><small>${state.expeditionRecords[contract.id] ? `Best: tier ${state.expeditionRecords[contract.id].tier} in ${formatDuration(state.expeditionRecords[contract.id].seconds)}` : "No record yet"}</small></article>`).join("")}</div><button type="button" data-refresh-expeditions ${active ? "disabled" : ""}>Refresh contracts</button>`);
  }

  function renderPinnedObjective(state, rate) {
    const container = document.querySelector("#pinned-objective");
    container.hidden = !state.pinnedObjective;
    document.querySelector("#objective-picker").value = state.pinnedObjective || "";
    if (!state.pinnedObjective) return;
    let title = "", detail = "", controls = "";
    if (state.pinnedObjective === "rift") {
      title = "Next Rift";
      const remaining = Math.max(0, getShardsForResonance(state.totalEchoesEarned + 1) - state.lifetimeShards);
      detail = remaining ? `${formatNumber(remaining)} Shards remaining${rate > 0 ? ` · ${formatDuration(remaining / rate)} at current passive rate` : " · Gather Shards to buy a Whisperer"}` : "Echoes are ready";
      if (state.activeChallenge) controls = '<button type="button" data-recover-challenge>Abandon challenge</button>';
    } else if (state.pinnedObjective === "work") {
      title = "Blackglass Sanctum";
      const stage = getCurrentWorkStage(state);
      detail = stage ? `${stage.name}: ${formatNumber(state.projectProgress)} / ${formatNumber(stage.target)}` : "Complete";
      if (stage && state.projectAllocation === 0) controls = '<button type="button" data-recover-allocation>Allocate 25%</button>';
    } else if (state.pinnedObjective === "mastery") {
      title = "Generator Mastery"; detail = `${getMasteryRanks(state)} / 80 ranks${state.riftEntries < 1 ? " · Requires first Rift" : ""}`;
      controls = '<button type="button" data-open-goal="mastery">View mastery</button>';
    } else {
      title = "Expeditions"; detail = `${state.expeditionsCompleted} completed${state.riftEntries < 2 ? " · Requires two Rifts" : state.activeExpedition ? " · Crew underway" : " · Crew available"}`;
      controls = '<button type="button" data-open-goal="expeditions">View expeditions</button>';
    }
    patchTemplate(container, `<strong>${title}</strong><p>${detail}</p>${controls}`);
  }

  function renderAutomation(state) {
    patchTemplate(els.goalView, `<div class="setting-list">${[["generators", "Generator purchasing", 1], ["upgrades", "Upgrade repurchasing", 2], ["work", "Work allocation: 25%", 3]].map(([key, label, rifts]) => `<label><span>${label}${state.riftEntries < rifts ? ` (Rift ${rifts})` : ""}</span><input type="checkbox" data-automation="${key}" ${state.automation[key] ? "checked" : ""} ${state.riftEntries < rifts ? "disabled" : ""}></label>`).join("")}<label><span>Reserve Shards</span><input type="number" min="0" step="1" data-automation="reserve" value="${state.automation.reserve}" ${state.riftEntries < 1 ? "disabled" : ""}></label><label><span>Generator target</span><select data-automation="target" ${state.riftEntries < 1 ? "disabled" : ""}>${[{ id: "efficient", name: "Best payback" }, ...GENERATORS].map((item) => `<option value="${item.id}" ${state.automation.target === item.id ? "selected" : ""}>${item.name}</option>`).join("")}</select></label></div>`);
  }

  function renderCampaignCapstone(state) {
    const progress = getCampaignProgress(state);
    const container = document.querySelector("#campaign-capstone");
    if (state.campaignComplete) {
      container.className = "campaign-capstone is-complete";
      container.innerHTML = `<strong>${state.chapterThreeComplete ? "The Far Sky Opens" : state.chapterTwoComplete ? "A Chorus Beyond the Glass" : "The First Storm Endures"}</strong><span>Chapter ${state.chapterThreeComplete ? "Three" : state.chapterTwoComplete ? "Two" : "One"} complete</span><small>${state.chapterThreeComplete ? "Repeatable expeditions and mastery remain open." : `Next chapter: ${getMasteryRanks(state)} / ${state.chapterTwoComplete ? 40 : 15} mastery ranks · ${state.expeditionsCompleted} / ${state.chapterTwoComplete ? 100 : 15} expeditions · ${state.chapterTwoComplete ? `${state.extendedWorks.mastery + state.extendedWorks.expedition} / 8 Work stages` : `${state.extendedWorks.mastery} / 2 Hall stages`}`}</small>`;
      return;
    }
    container.className = "campaign-capstone";
    container.innerHTML = `<strong>First Campaign Capstone</strong><div>${Object.entries(progress).map(([label, item]) => `<span><b>${label}</b><small>${item.value} / ${item.target}</small></span>`).join("")}</div>`;
  }

  function renderAchievements(state) {
    const achievements = getAchievementCatalog(state);
    const categories = [...new Set(achievements.map((item) => item.category))];
    els.goalView.innerHTML = categories.map((category) => `<section class="achievement-group"><header><strong>${category}</strong><span>${achievements.filter((item) => item.category === category && item.completedAt).length} / ${achievements.filter((item) => item.category === category).length}</span></header>${achievements.filter((item) => item.category === category).map((item) => {
      const progress = Math.min(1, item.value / item.amount);
      return `<article class="achievement-row ${item.completedAt ? "is-complete" : ""}"><span><strong>${item.label}</strong><small>${item.reward.label}${item.completedAt ? ` · ${new Date(item.completedAt).toLocaleDateString()}` : ""}</small><i><b style="width:${Math.round(progress * 100)}%"></b></i></span><em>${formatNumber(item.value)} / ${formatNumber(item.amount)}</em></article>`;
    }).join("")}</section>`).join("");
  }

  function renderWork(state) {
    const work = getCurrentWork(state);
    const stage = getCurrentWorkStage(state);
    const progress = stage ? Math.min(1, state.projectProgress / stage.target) : 1;
    patchTemplate(els.goalView, `<article class="work-view ${stage ? "" : "is-complete"}"><p>${work.description}</p><header><span><small>Stage ${Math.min(state.projectStage + 1, work.stages.length)} / ${work.stages.length}</small><strong>${stage?.name || "Sanctum Awakened"}</strong></span><b>${stage ? `${formatNumber(state.projectProgress)} / ${formatNumber(stage.target)}` : "Complete"}</b></header><span class="work-progress"><i style="width:${Math.round(progress * 100)}%"></i></span><p class="work-reward">${stage ? stage.reward : "All Sanctum rewards are active."}</p><div class="allocation-controls">${PROJECT_ALLOCATIONS.map((value) => `<button type="button" data-project-allocation="${value}" class="${state.projectAllocation === value ? "is-selected" : ""}" aria-pressed="${state.projectAllocation === value}" ${!stage && value > 0 ? "disabled" : ""}>${value * 100}%</button>`).join("")}</div><small>Diverts the selected share of passive and offline production into construction.</small></article>${extendedWorksMarkup(state)}`);
  }

  function extendedWorksMarkup(state) {
    return EXTENDED_WORKS.map((work) => {
      const rank = state.extendedWorks[work.id];
      const stage = work.stages[rank];
      const resource = work.resource === "masteryTokens" ? "Mastery tokens" : "Survey materials";
      return `<section class="extended-work"><header><strong>${work.name}</strong><span>${rank} / 4</span></header><p>${work.reward}</p>${stage ? `<strong>${stage.name}</strong><small>${formatNumber(stage.cost)} Shards · ${stage.material} ${resource} (${state[work.resource]} held)</small><button type="button" data-build-work="${work.id}" ${state.riftEntries < 1 || state.shards < stage.cost || state[work.resource] < stage.material ? "disabled" : ""}>Construct stage</button>` : '<strong>Complete</strong>'}</section>`;
    }).join("");
  }

  function renderChallenges(state) {
    const active = getActiveChallenge(state);
    patchTemplate(els.goalView, `${active ? `<div class="active-challenge"><strong>${active.name}</strong><span>${formatNumber(state.runShards)} / ${formatNumber(active.target)} run Shards</span><button type="button" data-abandon-challenge>Abandon</button></div>` : ""}<div class="challenge-list">${CHALLENGES.map((challenge) => {
      const complete = state.completedChallenges.includes(challenge.id);
      return `<article class="challenge-row ${complete ? "is-complete" : ""}"><div><strong>${challenge.name}</strong><p>${challenge.description}</p><small>Reward: ${challenge.reward}</small></div><button type="button" data-challenge-id="${challenge.id}" ${active || complete || state.riftEntries < challenge.unlockRifts ? "disabled" : ""}>${complete ? "Complete" : active?.id === challenge.id ? "Active" : state.riftEntries < challenge.unlockRifts ? `Rift ${challenge.unlockRifts}` : "Begin"}</button></article>`;
    }).join("")}</div>`);
  }

  function renderChronicle(state) {
    const key = JSON.stringify([state.chronicleEntries, state.permanentLore]);
    if (key === lastChronicleKey) return;
    lastChronicleKey = key;
    if (!state.chronicleEntries.length && !state.permanentLore.length) {
      els.goalView.innerHTML = `<p class="empty-note">Discover generators, earn Acclaim, complete Works, and cross the Rift to fill the Chronicle.</p>`;
      return;
    }
    const list = document.createElement("div");
    list.className = "chronicle-list";
    const archive = state.permanentLore.map((text) => ({ title: "Permanent Chronicle", type: "archive", text }));
    for (const entry of [...state.chronicleEntries].reverse().concat(archive)) {
      const article = document.createElement("article");
      const type = document.createElement("span");
      const body = document.createElement("div");
      const title = document.createElement("strong");
      const text = document.createElement("p");
      type.textContent = entry.type;
      title.textContent = entry.title;
      text.textContent = entry.text;
      body.append(title, text);
      article.append(type, body);
      list.append(article);
    }
    els.goalView.replaceChildren(list);
  }

  function renderStatistics(state, modifiers, passiveRate, clickPower) {
    const groups = {
      run: [
      ["Current Shards", formatNumber(Math.floor(state.shards))],
      ["Run Shards", formatNumber(Math.floor(state.runShards))],
      ["Run Time", formatDuration(Math.max(0, (Date.now() - Date.parse(state.runStartedAt)) / 1000))],
      ["Click Power", formatNumber(clickPower)],
      ["Momentum", `${formatNumber(state.momentum)}%`],
      ["Attunement", ATTUNEMENTS.find((item) => item.id === state.attunement)?.name || "Balanced"],
      ["Shards / Second", formatNumber(passiveRate)],
      ["Generators Owned", formatNumber(getTotalGeneratorsOwned(state))],
      ["Upgrades Purchased", formatNumber(state.purchasedUpgrades.length)],
      ],
      lifetime: [
      ["Lifetime Shards", formatNumber(Math.floor(state.lifetimeShards))],
      ["Lifetime Clicks", formatNumber(state.totalClicks)],
      ["Critical Gusts", formatNumber(state.criticalGusts)],
      ["Wind Rifts Claimed", formatNumber(state.windRiftsClaimed)],
      ["Last Offline Gain", formatNumber(state.lastOfflineShards)],
      ["Last Time Away", formatDuration(state.lastOfflineSeconds)],
      ["Acclaim", `${formatNumber(getAcclaimCount(state))} / ${formatNumber(ACCLAIM_MILESTONES.length)}`],
      ["Acclaim Bonus", `${formatNumber(getAcclaimMultiplier(state))}x`],
      ["Save Version", `v${SAVE_VERSION}`],
      ],
      bests: [
      ["Best Shards / Second", formatNumber(state.bestPassiveRate)],
      ["Best Completed Run", formatNumber(state.bestRunShards)],
      ["Last Rift Time", state.lastRunSeconds ? formatDuration(state.lastRunSeconds) : "—"],
      ["Fastest Rift", state.fastestRiftSeconds ? formatDuration(state.fastestRiftSeconds) : "—"],
      ],
      prestige: [
      ["Echoes Held", formatNumber(state.echoes)],
      ["Lifetime Echoes", formatNumber(state.totalEchoesEarned)],
      ["Riftwork Etched", `${formatNumber(state.purchasedRiftwork.length)} / ${formatNumber(RIFTWORK.length)}`],
      ["Resonance", formatNumber(state.resonance)],
      ["Rift Entries", formatNumber(state.riftEntries)],
      ["Run Records", formatNumber(state.runHistory.length)],
      ["Active Aspects", `${state.activeAspects.length} / ${ASPECT_SLOT_COUNT}`],
      ["Resonance Bonus", formatPercent((getResonanceMultiplier(state) - 1) * 100)],
      ["All Production", `${formatNumber(getAllProductionMultiplier(state, modifiers))}x`],
      ["Click Riftwork", `${formatNumber(getClickRiftworkMultiplier(state))}x`],
      ["Generator Riftwork", `${formatNumber(getGeneratorRiftworkMultiplier(state))}x`],
      ["Click CPS Bonus", formatPercent(modifiers.clickCpsPercent * 100)],
      ["Global Upgrades", `${formatNumber(modifiers.globalMultiplier)}x`],
      ],
    };
    const stats = groups[selectedRecordTab];
    els.statisticsList.innerHTML = stats.map(([label, value]) => `<div class="stat-row"><span>${label}</span><strong>${value}</strong></div>`).join("");
  }

  function spawnFloat(amount, event, critical = false) {
    const bounds = els.floatLayer.getBoundingClientRect();
    const pop = document.createElement("span");
    pop.className = "float-pop";
    pop.classList.toggle("is-critical", critical);
    pop.textContent = critical ? `Critical +${formatNumber(amount)}` : `+${formatNumber(amount)}`;
    pop.style.left = `${event.clientX - bounds.left}px`;
    pop.style.top = `${event.clientY - bounds.top}px`;
    els.floatLayer.append(pop);
    pop.addEventListener("animationend", () => pop.remove());
  }

  function showOfflineReport(report) {
    if (!report || report.elapsedSeconds < 5 || !els.offlineDialog) return;
    const capped = report.elapsedSeconds > report.creditedSeconds;
    els.offlineSummary.textContent = report.gain > 0
      ? `The storm gathered ${formatNumber(report.gain)} Shards during ${formatDuration(report.creditedSeconds)}${capped ? ` of your ${formatDuration(report.elapsedSeconds)} absence` : ""}.`
      : `You were away for ${formatDuration(report.elapsedSeconds)}. Build a generator to gather Shards while away.`;
    els.offlineDialog.showModal();
  }

  function setSaveStatus(message) {
    if (els.saveStatus) els.saveStatus.textContent = message;
  }

  function announce(message) {
    if (!els.announcer) return;
    els.announcer.textContent = "";
    window.setTimeout(() => { els.announcer.textContent = message; }, 20);
  }

  return {
    els,
    render,
    spawnFloat,
    showOfflineReport,
    setSaveStatus,
    announce,
    getSelectedBuyMode: () => selectedBuyMode,
    getSelectedUpgradeTab: () => selectedUpgradeTab,
    getSelectedRecordTab: () => selectedRecordTab,
    getSelectedGoalTab: () => selectedGoalTab,
  };
}

function selectTab(container, datasetKey, selected) {
  container.querySelectorAll("button").forEach((button) => {
    const active = button.dataset[datasetKey] === selected;
    button.classList.toggle("is-selected", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function getEffectLabel(upgrade) {
  if (upgrade.effect.type === "globalMultiplier") return "All production";
  if (upgrade.effect.type === "clickMultiplier") return "Click power";
  if (upgrade.effect.type === "clickCpsPercent") return "Click + passive";
  if (upgrade.effect.type === "generatorMultiplier") return "Generator x2";
  return "Upgrade";
}
