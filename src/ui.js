import { ACCLAIM_MILESTONES, GENERATORS, RIFTWORK, SAVE_VERSION, UPGRADES } from "./content.js";
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
  getShardsForResonance,
  getTotalGeneratorsOwned,
  getVisibleGenerators,
  getVisibleUpgrades,
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
  const riftworkNodes = new Map();
  const openUpgradeIds = new Set();
  let selectedBuyMode = "1";
  let selectedUpgradeTab = "available";
  let selectedRecordTab = "run";
  let selectedGoalTab = "acclaim";
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
    const allocation = event.target.closest("[data-project-allocation]");
    if (allocation) actions.setProjectAllocation(allocation.dataset.projectAllocation);
    const challenge = event.target.closest("[data-challenge-id]");
    if (challenge) actions.startChallenge(challenge.dataset.challengeId);
    if (event.target.closest("[data-abandon-challenge]")) actions.abandonChallenge();
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
    renderRift(state);
    renderActivePlay(state);
    renderRiftwork(state, structureChanged);
    renderStatistics(state, modifiers, passiveRate, clickPower);
    renderRunHistory(state);
    renderLongTerm(state);
    renderIdentity(state, passiveRate);
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
      renderRiftUpgradeCollection(state);
      return;
    }

    const visibleIds = new Set(visibleUpgrades.map((upgrade) => upgrade.id));
    if (structureChanged) {
      els.upgradeList.querySelectorAll(".upgrade-group").forEach((group) => group.remove());
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
      return;
    }
    empty?.remove();

    const orderedUpgrades = selectedUpgradeTab === "generator"
      ? getGeneratorUpgradeGroups(visibleUpgrades).flatMap((group) => group.upgrades)
      : visibleUpgrades;
    let previousGeneratorId = null;
    const orderedNodes = [];
    let currentGroupBody = null;
    for (const upgrade of orderedUpgrades) {
      if (structureChanged && selectedUpgradeTab === "generator" && upgrade.effect.generatorId !== previousGeneratorId) {
        previousGeneratorId = upgrade.effect.generatorId;
        const group = getGeneratorUpgradeGroups(visibleUpgrades).find((item) => item.generator.id === previousGeneratorId);
        const purchasedCount = group.upgrades.filter((item) => state.purchasedUpgrades.includes(item.id)).length;
        const groupNode = document.createElement("details");
        groupNode.className = "upgrade-group";
        groupNode.dataset.upgradeGroup = previousGeneratorId;
        groupNode.open = getOwned(state, previousGeneratorId) > 0 && purchasedCount < group.upgrades.length;
        groupNode.innerHTML = `<summary><strong></strong><span></span></summary><div class="upgrade-group-body"></div>`;
        groupNode.querySelector("strong").textContent = group.generator.name;
        groupNode.querySelector("span").textContent = `${purchasedCount} / ${group.upgrades.length}`;
        currentGroupBody = groupNode.querySelector(".upgrade-group-body");
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
        if (selectedUpgradeTab === "generator") currentGroupBody.append(row);
        else orderedNodes.push(row);
      }

      const affordable = state.shards >= upgrade.cost;
      const purchased = state.purchasedUpgrades.includes(upgrade.id);
      const preview = purchased ? null : getUpgradePurchasePreview(state, upgrade);
      row.classList.toggle("is-affordable", affordable && !purchased);
      row.classList.toggle("is-locked", !affordable && !purchased);
      row.classList.toggle("is-owned", purchased);
      row.querySelector(".upgrade-chip-cost").textContent = purchased ? "Owned" : formatNumber(upgrade.cost);
      row.querySelector(".upgrade-details-copy").textContent = purchased
        ? upgrade.description
        : `${upgrade.description} ${formatNumber(preview.beforeRate)}/s → ${formatNumber(preview.afterRate)}/s; click ${formatNumber(preview.beforeClick)} → ${formatNumber(preview.afterClick)}.`;
      row.querySelector("button").hidden = purchased;
      row.querySelector("button").disabled = purchased || !affordable;
    }
    if (structureChanged) els.upgradeList.append(...orderedNodes);
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
    const bonusAfter = nextResonance * getResonancePercentPerLevelForUi(state);

    els.enterRiftBtn.disabled = availableEchoes <= 0;
    els.enterRiftBtn.textContent = availableEchoes > 0 ? "Enter the Rift" : "The Rift Sleeps";
    const rows = [
      ["Echoes Held", formatNumber(state.echoes)],
      ["Echoes Waiting", `+${formatNumber(availableEchoes)}`],
      ["Resonance", formatNumber(state.resonance)],
      ["Resonance Bonus", `${formatPercent(bonusNow)} now · ${formatPercent(bonusAfter)} after`],
      ["Next Echo", `${formatNumber(getShardsForResonance(potentialResonance + 1))} lifetime Shards`],
      ["Passive Baseline", `${formatNumber(forecast.passiveBefore)}/s → ${formatNumber(forecast.passiveAfter)}/s`],
      ["Click Baseline", `${formatNumber(forecast.clickBefore)} → ${formatNumber(forecast.clickAfter)}`],
      ["Replay Estimate", formatDuration(forecast.replaySeconds)],
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

  function getResonancePercentPerLevelForUi(state) {
    let percent = state.purchasedRiftwork.includes("pressureMemory") ? 1.1 : 1;
    if (state.purchasedRiftwork.includes("resonanceEngine")) percent *= 1.25;
    return percent;
  }

  function renderRiftwork(state, structureChanged) {
    if (!structureChanged) return;
    const constellation = getRiftConstellation(state);
    els.riftworkList.innerHTML = constellation.map((branch) => `
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
      </section>`).join("");
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
    renderCampaignCapstone(state);
    if (selectedGoalTab === "acclaim") renderAchievements(state);
    if (selectedGoalTab === "work") renderWork(state);
    if (selectedGoalTab === "challenges") renderChallenges(state);
    if (selectedGoalTab === "chronicle") renderChronicle(state);
  }

  function renderCampaignCapstone(state) {
    const progress = getCampaignProgress(state);
    const container = document.querySelector("#campaign-capstone");
    if (state.campaignComplete) {
      container.className = "campaign-capstone is-complete";
      container.innerHTML = `<strong>The First Storm Endures</strong><span>Campaign complete · Endless play unlocked</span>`;
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
    els.goalView.innerHTML = `<article class="work-view ${stage ? "" : "is-complete"}"><p>${work.description}</p><header><span><small>Stage ${Math.min(state.projectStage + 1, work.stages.length)} / ${work.stages.length}</small><strong>${stage?.name || "Sanctum Awakened"}</strong></span><b>${stage ? `${formatNumber(state.projectProgress)} / ${formatNumber(stage.target)}` : "Complete"}</b></header><span class="work-progress"><i style="width:${Math.round(progress * 100)}%"></i></span><p class="work-reward">${stage ? stage.reward : "All Sanctum rewards are active."}</p><div class="allocation-controls">${PROJECT_ALLOCATIONS.map((value) => `<button type="button" data-project-allocation="${value}" class="${state.projectAllocation === value ? "is-selected" : ""}" ${!stage && value > 0 ? "disabled" : ""}>${value * 100}%</button>`).join("")}</div><small>Diverts the selected share of passive and offline production into construction.</small></article>`;
  }

  function renderChallenges(state) {
    const active = getActiveChallenge(state);
    els.goalView.innerHTML = `${active ? `<div class="active-challenge"><strong>${active.name}</strong><span>${formatNumber(state.runShards)} / ${formatNumber(active.target)} run Shards</span><button type="button" data-abandon-challenge>Abandon</button></div>` : ""}<div class="challenge-list">${CHALLENGES.map((challenge) => {
      const complete = state.completedChallenges.includes(challenge.id);
      return `<article class="challenge-row ${complete ? "is-complete" : ""}"><div><strong>${challenge.name}</strong><p>${challenge.description}</p><small>Reward: ${challenge.reward}</small></div><button type="button" data-challenge-id="${challenge.id}" ${active || complete ? "disabled" : ""}>${complete ? "Complete" : active?.id === challenge.id ? "Active" : "Begin"}</button></article>`;
    }).join("")}</div>`;
  }

  function renderChronicle(state) {
    if (!state.chronicleEntries.length) {
      els.goalView.innerHTML = `<p class="empty-note">Discover generators, earn Acclaim, complete Works, and cross the Rift to fill the Chronicle.</p>`;
      return;
    }
    els.goalView.innerHTML = `<div class="chronicle-list">${[...state.chronicleEntries].reverse().map((entry) => `<article><span>${entry.type}</span><div><strong>${entry.title}</strong><p>${entry.text}</p></div></article>`).join("")}</div>`;
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
