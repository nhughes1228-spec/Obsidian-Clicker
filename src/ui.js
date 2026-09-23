import {
  PRODUCERS,
  UPGRADES,
  RESEARCH,
  GOAL_LANES,
  MODIFICATIONS,
  MODIFICATION_COSTS,
  BALANCE,
  SUPPORT_PRODUCERS,
  UPGRADE_ICONS,
} from "./content.js";
import {
  deriveEconomy,
  affordableAmount,
  upgradeUnlocked,
  purchasePreview,
} from "./core.js";
import { activeGoals, goalValue } from "./goals.js";
export const $ = (id) => document.getElementById(id);
export function format(value) {
  if (!Number.isFinite(value)) return "Limit";
  if (value >= 1e15) return value.toExponential(2);
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e4) return `${(value / 1e3).toFixed(2)}K`;
  return value.toLocaleString("en-US", {
    maximumFractionDigits: value < 100 ? 2 : 0,
  });
}
function text(node, value) {
  if (node.textContent !== String(value)) node.textContent = String(value);
}
function make(tag, className = "", content = "") {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = content;
  return node;
}
const sortedUpgrades = [...UPGRADES].sort(
  (a, b) => a.cost - b.cost || a.id.localeCompare(b.id),
);

function disclosure(label) {
  const container = make("details", "item-details"),
    summary = make("summary", "", "Details"),
    body = make("p", "description");
  summary.setAttribute("aria-label", `${label} details`);
  container.append(summary, body);
  return { container, body };
}

function orderRows(container, rows) {
  const focused = document.activeElement;
  rows.forEach((row, index) => {
    if (container.children[index] !== row)
      container.insertBefore(row, container.children[index] || null);
  });
  if (
    focused?.isConnected &&
    document.activeElement !== focused &&
    container.contains(focused)
  )
    focused.focus({ preventScroll: true });
}

export function createUI(dispatch) {
  let quantity = "1",
    view = "production";
  let selectedUpgrade = null,
    closeTimer;
  const previewPanel = make("aside", "upgrade-preview"),
    previewName = make("h3"),
    previewEffect = make("p", "description"),
    previewPrice = make("p", "preview-price"),
    previewBuy = make("button", "purchase");
  previewPanel.id = "upgrade-preview";
  previewEffect.id = "upgrade-preview-effect";
  previewPrice.id = "upgrade-preview-price";
  previewPanel.hidden = true;
  previewPanel.setAttribute("role", "dialog");
  previewPanel.setAttribute("aria-label", "Upgrade details");
  previewPanel.append(previewName, previewEffect, previewPrice, previewBuy);
  document.body.append(previewPanel);
  function closePreview() {
    clearTimeout(closeTimer);
    selectedUpgrade?.button.setAttribute("aria-expanded", "false");
    selectedUpgrade?.button.removeAttribute("aria-describedby");
    selectedUpgrade = null;
    previewPanel.hidden = true;
  }
  function placePreview() {
    if (!selectedUpgrade) return;
    const rect = selectedUpgrade.button.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > innerHeight) {
      closePreview();
      return;
    }
    const width = previewPanel.offsetWidth,
      height = previewPanel.offsetHeight;
    previewPanel.style.left = `${Math.max(12, Math.min(rect.left, innerWidth - width - 12))}px`;
    previewPanel.style.top = `${Math.max(12, Math.min(rect.top - height - 8 >= 12 ? rect.top - height - 8 : rect.bottom + 8, innerHeight - height - 12))}px`;
  }
  function showPreview(n) {
    clearTimeout(closeTimer);
    selectedUpgrade?.button.setAttribute("aria-expanded", "false");
    selectedUpgrade?.button.removeAttribute("aria-describedby");
    selectedUpgrade = n;
    n.button.setAttribute("aria-expanded", "true");
    n.button.setAttribute(
      "aria-describedby",
      "upgrade-preview-effect upgrade-preview-price",
    );
    previewPanel.hidden = false;
    refreshPreview();
  }
  function refreshPreview() {
    const n = selectedUpgrade;
    if (!n) return;
    text(previewName, n.u.name);
    text(previewEffect, n.effect);
    text(previewPrice, `${format(n.u.cost)} Obsidian`);
    text(
      previewBuy,
      n.purchased ? "Installed" : n.blocked ? "Not affordable" : "Buy upgrade",
    );
    previewBuy.disabled = n.blocked || n.purchased;
    placePreview();
  }
  function scheduleClose() {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(closePreview, 180);
  }
  previewPanel.addEventListener("pointerenter", () => clearTimeout(closeTimer));
  previewPanel.addEventListener("pointerleave", scheduleClose);
  previewPanel.addEventListener("focusin", () => clearTimeout(closeTimer));
  previewPanel.addEventListener("focusout", (event) => {
    if (
      !previewPanel.contains(event.relatedTarget) &&
      event.relatedTarget !== selectedUpgrade?.button
    )
      closePreview();
  });
  previewBuy.addEventListener("click", () => {
    const n = selectedUpgrade;
    if (n && !n.blocked && !n.purchased) {
      closePreview();
      dispatch({ type: "buyUpgrade", id: n.u.id });
      $("installed-summary").focus();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && selectedUpgrade) {
      const button = selectedUpgrade.button;
      const focusInside = previewPanel.contains(document.activeElement);
      if (focusInside) button.focus({ preventScroll: true });
      closePreview();
    }
  });
  document.addEventListener("pointerdown", (event) => {
    if (
      selectedUpgrade &&
      !previewPanel.contains(event.target) &&
      !selectedUpgrade.button.contains(event.target)
    )
      closePreview();
  });
  window.addEventListener("resize", placePreview);
  document.addEventListener("scroll", placePreview, true);
  const goalNodes = GOAL_LANES.map((lane) => {
    const row = make("article", "goal"),
      info = make("div"),
      label = make("span", "item-name"),
      details = make("small", "muted"),
      progress = make("progress"),
      button = make("button", "purchase");
    row.tabIndex = -1;
    progress.max = 1;
    button.dataset.goalLane = lane;
    button.addEventListener("click", () =>
      dispatch({ type: "claimGoal", id: button.dataset.goal }),
    );
    info.append(label, details, progress);
    row.append(info, button);
    $("goals-list").append(row);
    return { row, label, details, progress, button };
  });
  const modificationNodes = MODIFICATIONS.map((m) => {
    const row = make("article", "research-item"),
      info = make("div"),
      name = make("span", "item-name", m.name),
      description = make("p", "description"),
      button = make("button", "purchase");
    const details = disclosure(m.name);
    row.tabIndex = -1;
    button.dataset.modification = m.id;
    button.addEventListener("click", () =>
      dispatch({ type: "buyModification", id: m.id }),
    );
    info.append(name, description, details.container);
    row.append(info, button);
    $("modifications-list").append(row);
    return { row, description, button, details };
  });
  const producerNodes = PRODUCERS.map((p) => {
    const row = make("article", "producer"),
      info = make("div"),
      name = make("span", "item-name", p.name),
      owned = make("span", "owned"),
      stats = make("div", "item-stats"),
      button = make("button", "purchase"),
      cost = make("span"),
      unit = make("small", "", "Obsidian");
    const details = disclosure(p.name);
    name.append(owned);
    info.append(name, stats, details.container);
    button.append(cost, unit);
    button.dataset.producer = p.id;
    button.addEventListener("click", () =>
      dispatch({
        type: "buyProducer",
        id: p.id,
        amount: quantity === "max" ? "max" : Number(quantity),
      }),
    );
    row.append(info, button);
    $("producers").append(row);
    return { row, owned, stats, button, cost, unit, details };
  });
  const upgradeNodes = sortedUpgrades.map((u) => {
    const row = make("article", "upgrade"),
      button = make("button", "upgrade-icon"),
      icon = make("img"),
      tier = make("span", "upgrade-tier", u.name.split(" ").at(-1));
    const effect =
      "producer" in u
        ? `${PRODUCERS.find((p) => p.id === u.producer).name} output x${u.multiplier}`
        : `Click base +${u.base}${u.share ? `; +${u.share * 100}% of production per click` : ""}`;
    icon.src = `assets/icons/${UPGRADE_ICONS["producer" in u ? u.producer : "tool"]}.svg`;
    icon.alt = "";
    tier.setAttribute("aria-hidden", "true");
    button.append(icon, tier);
    row.append(button);
    const n = { row, button, u, effect, blocked: true, purchased: false };
    button.dataset.upgrade = u.id;
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-controls", "upgrade-preview");
    button.setAttribute("aria-expanded", "false");
    let touch = false;
    button.addEventListener("pointerdown", (event) => {
      touch = event.pointerType === "touch";
    });
    button.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "touch") showPreview(n);
    });
    button.addEventListener("pointerleave", scheduleClose);
    button.addEventListener("focus", () => showPreview(n));
    button.addEventListener("blur", (event) => {
      if (!previewPanel.contains(event.relatedTarget)) scheduleClose();
    });
    button.addEventListener("click", (event) => {
      if (touch && event.detail !== 0) {
        showPreview(n);
        return;
      }
      if (!n.blocked && !n.purchased) {
        closePreview();
        dispatch({ type: "buyUpgrade", id: u.id });
      } else showPreview(n);
    });
    $("upgrades").append(row);
    return n;
  });
  const researchNodes = RESEARCH.map((r) => {
    const row = make("article", "research-item"),
      info = make("div"),
      name = make("span", "item-name", r.name),
      desc = make("p", "description", r.description),
      button = make("button", "purchase");
    info.append(name, desc);
    row.append(info, button);
    button.dataset.research = r.id;
    button.addEventListener("click", () =>
      dispatch({ type: "buyResearch", id: r.id }),
    );
    $("research-list").append(row);
    return { row, button };
  });
  const stats = [
    "Lifetime Obsidian",
    "Best production / second",
    "Logo clicks",
    "Workshops rebuilt",
    "Research Points earned",
  ].map((label) => {
    const term = make("dt", "", label),
      value = make("dd");
    $("statistics").append(term, value);
    return value;
  });
  for (const button of document.querySelectorAll("[data-quantity]"))
    button.addEventListener("click", () => {
      quantity = button.dataset.quantity;
      dispatch({ type: "render" });
    });
  for (const tab of ["production", "research", "modifications"])
    $(`${tab}-tab`).addEventListener("click", () => {
      view = tab;
      dispatch({ type: "render" });
    });
  function render(state, { readOnly, error, recovered }) {
    if (view !== "production") closePreview();
    const economy = deriveEconomy(state);
    text($("balance"), format(state.obsidian));
    text($("rate"), format(economy.passiveRate));
    text($("click-power"), format(economy.clickPower));
    $("logo-button").disabled = readOnly;
    $("notice").hidden = !readOnly && !error;
    text(
      $("notice"),
      error ||
        (readOnly
          ? "This tab is read-only. Close the other Workshop tab and reload here to play."
          : ""),
    );
    $("limit-notice").hidden = !state.numericLimit;
    document.body.classList.toggle(
      "reduced-motion",
      state.settings.reducedMotion,
    );
    text($("parts-balance"), state.upgradeParts);
    activeGoals(state).forEach((goal, i) => {
      const n = goalNodes[i],
        previous = n.button.dataset.goal,
        focused = document.activeElement === n.button;
      const label = !goal
        ? "All goals in this track completed"
        : goal.lane === "production"
          ? `Produce ${format(goal.target)} lifetime Obsidian`
          : goal.lane === "output"
            ? `Reach ${format(goal.target)} Obsidian per second`
            : `${PRODUCERS.find((p) => p.id === goal.producer).name}: reach ${goal.target} owned`;
      text(n.label, label);
      text(
        n.details,
        goal
          ? `${format(Math.min(goalValue(state, goal), goal.target))} / ${format(goal.target)}`
          : "Rewards collected",
      );
      n.progress.value = goal
        ? Math.min(1, goalValue(state, goal) / goal.target)
        : 1;
      n.progress.setAttribute("aria-label", label);
      n.button.dataset.goal = goal?.id || "";
      text(n.button, goal ? `Claim ${goal.reward} Parts` : "Complete");
      n.button.disabled =
        readOnly || !goal || goalValue(state, goal) < goal.target;
      n.row.classList.toggle(
        "claimable",
        !!goal && goalValue(state, goal) >= goal.target,
      );
      n.button.setAttribute("aria-label", `${label}: ${n.button.textContent}`);
      if (previous && previous !== n.button.dataset.goal) {
        text($("goal-announcement"), `Reward claimed. ${label}.`);
        if (focused && n.button.disabled) n.row.focus();
      }
    });
    const researchVisible =
      economy.availableResearch > 0 || state.researchAwarded > 0;
    $("research-tab").hidden = !researchVisible;
    if (!researchVisible && view === "research") view = "production";
    for (const tab of ["production", "research", "modifications"]) {
      $(`${tab}-view`).hidden = view !== tab;
      $(`${tab}-tab`).setAttribute("aria-pressed", String(view === tab));
    }
    if (view === "production") {
      const firstLocked = PRODUCERS.findIndex(
        (p) => !state.unlockedProducers.includes(p.id),
      );
      PRODUCERS.forEach((p, index) => {
        const n = producerNodes[index],
          unlocked = state.unlockedProducers.includes(p.id);
        n.row.hidden = !unlocked && index !== firstLocked;
        if (n.row.hidden) return;
        n.row.classList.toggle("locked", !unlocked);
        text(n.owned, unlocked ? `Owned ${state.producers[p.id]}` : "");
        const amount =
          quantity === "max"
            ? Math.max(1, affordableAmount(state, p.id))
            : Number(quantity);
        const preview = purchasePreview(
          state,
          { type: "buyProducer", id: p.id, amount },
          economy,
        );
        const cost = preview.cost;
        const milestone = preview.nextMilestone;
        const support = SUPPORT_PRODUCERS.includes(p.id)
          ? `\nSupport: +${format(economy.supportByProducer[p.id] * 100)}% workshop${state.producers[p.id] < BALANCE.supportCap ? `; next at ${Math.min(BALANCE.supportCap, (Math.floor(state.producers[p.id] / BALANCE.supportBatch) + 1) * BALANCE.supportBatch)} owned` : " (maximum)"}.`
          : "";
        text(
          n.stats,
          unlocked
            ? `+${format(preview.passiveGain)} /s${amount > 1 ? ` for ${amount}` : ""}`
            : `Unlock at ${format(p.cost)} Obsidian`,
        );
        n.details.container.hidden = !unlocked;
        text(
          n.details.body,
          `${p.description}\n${format(economy.unitRates[p.id] * state.producers[p.id])}/s from this equipment. Buy ${amount}: +${format(preview.passiveGain)}/s workshop${preview.supportGain > 0 ? " including support" : ""}; +${format(preview.clickGain)}/click.${support}${milestone ? `\nNext improvement: ${milestone.owned} owned, x${milestone.multiplier}, ${format(milestone.cost)} Obsidian.` : ""}`,
        );
        text(n.cost, unlocked ? format(cost) : "Locked");
        text(n.unit, unlocked ? "Obsidian" : format(p.cost));
        n.button.setAttribute(
          "aria-label",
          `Buy ${amount} ${p.name} for ${format(cost)} Obsidian; adds ${format(preview.passiveGain)} per second to the workshop`,
        );
        n.button.disabled = readOnly || !unlocked || cost > state.obsidian;
      });
      let visible = 0;
      sortedUpgrades.forEach((u, i) => {
        const n = upgradeNodes[i],
          purchased = state.upgrades.includes(u.id);
        n.row.hidden = !purchased && !upgradeUnlocked(state, u);
        if (n.row.hidden) {
          if (selectedUpgrade === n) closePreview();
          return;
        }
        const target = $(purchased ? "installed-list" : "upgrades");
        const hadFocus = document.activeElement === n.button;
        if (n.row.parentElement !== target) target.append(n.row);
        if (hadFocus && purchased) {
          $("installed-upgrades").hidden = false;
          $("installed-summary").focus();
        }
        if (!purchased) visible++;
        n.purchased = purchased;
        n.blocked = readOnly || purchased || state.obsidian < u.cost;
        n.button.setAttribute("aria-disabled", String(n.blocked));
        n.button.classList.toggle("affordable", !n.blocked);
        n.button.setAttribute(
          "aria-label",
          purchased
            ? `${u.name} installed`
            : `Buy ${u.name} for ${format(u.cost)} Obsidian`,
        );
        if (selectedUpgrade === n) {
          if (purchased || n.row.hidden) closePreview();
          else refreshPreview();
        }
      });
      for (const purchased of [false, true])
        orderRows(
          $(purchased ? "installed-list" : "upgrades"),
          upgradeNodes
            .filter(
              (_, i) =>
                state.upgrades.includes(sortedUpgrades[i].id) === purchased,
            )
            .map((n) => n.row),
        );
      $("upgrades-empty").hidden = visible > 0;
      text($("upgrades-count"), `${state.upgrades.length} installed`);
      $("installed-upgrades").hidden = state.upgrades.length === 0;
      $("automation-row").hidden = !state.research.includes("automatic");
      $("automation").checked = state.automation;
      $("automation").disabled = readOnly;
      for (const button of document.querySelectorAll("[data-quantity]"))
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.quantity === quantity),
        );
    } else if (view === "modifications") {
      text($("modification-parts"), state.upgradeParts);
      MODIFICATIONS.forEach((m, i) => {
        const n = modificationNodes[i],
          level = state.modifications[m.id],
          cost = MODIFICATION_COSTS[level],
          owned = state.bestOwned[m.producer] > 0,
          focused = document.activeElement === n.button;
        const preview = purchasePreview(
          state,
          { type: "buyModification", id: m.id },
          economy,
        );
        const support =
          m.effect === "output" && SUPPORT_PRODUCERS.includes(m.producer)
            ? ` Support contribution also +${Math.round(level * m.perLevel * 100)}%; now +${format(economy.supportByProducer[m.producer] * 100)}% workshop production.`
            : "";
        const benefit = !preview.valid
          ? ""
          : m.effect === "price"
            ? ` Next equipment purchase: ${format(preview.producerPriceAfter)} Obsidian.`
            : ` This level adds ${format(preview.passiveGain)}/s workshop and ${format(preview.clickGain)} per click${preview.supportGain > 0 ? ", including support" : ""}.`;
        text(
          n.description,
          `Level ${level}/5. ${m.effect === "output" ? "Output +" : "Prices -"}${Math.round(level * m.perLevel * 100)}%${cost === undefined ? " (maximum)" : `; next ${m.effect === "output" ? "+" : "-"}${Math.round((level + 1) * m.perLevel * 100)}%`}.`,
        );
        text(
          n.details.body,
          `${support.trim()}${benefit}` ||
            "This modification stays after rebuilding.",
        );
        text(
          n.button,
          !owned
            ? "Own equipment first"
            : cost === undefined
              ? "Maximum"
              : `${cost} Parts`,
        );
        n.button.disabled =
          readOnly || !owned || cost === undefined || state.upgradeParts < cost;
        n.button.setAttribute(
          "aria-label",
          `${m.name}: ${n.button.textContent}`,
        );
        if (focused && n.button.disabled) n.row.focus();
      });
    } else if (view === "research") {
      text($("research-points"), format(state.researchPoints));
      text(
        $("rebuild-summary"),
        `Earn ${format(economy.availableResearch)} Research Points. Permanent improvements stay.`,
      );
      $("rebuild-open").disabled = readOnly || economy.availableResearch < 1;
      const next =
        (state.researchAwarded + economy.availableResearch + 1) ** 2 *
        BALANCE.researchThreshold;
      text(
        $("next-research"),
        `Next point at ${format(next)} lifetime Obsidian (${format(Math.max(0, next - state.lifetimeObsidian))} remaining).`,
      );
      RESEARCH.forEach((r, i) => {
        const purchased = state.research.includes(r.id),
          n = researchNodes[i];
        text(n.button, purchased ? "Researched" : `${r.cost} RP`);
        n.button.disabled =
          readOnly || purchased || state.researchPoints < r.cost;
        n.button.setAttribute(
          "aria-label",
          `${r.name}: ${purchased ? "researched" : `${r.cost} Research Points`}`,
        );
      });
      $("research-complete").hidden = state.research.length !== RESEARCH.length;
    }
    if ($("settings-dialog").open) {
      for (const key of Object.keys(state.settings)) {
        $(key).checked = state.settings[key];
        $(key).disabled = readOnly;
      }
      text(
        $("save-status"),
        error ||
          (state.lastSavedAt
            ? `Saved ${new Date(state.lastSavedAt).toLocaleTimeString()}`
            : "Not saved yet."),
      );
      $("keep-backup").hidden = !recovered;
      for (const id of ["save", "import", "reset-open", "keep-backup"])
        $(id).disabled = readOnly;
      [
        state.lifetimeObsidian,
        state.bestRate,
        state.clicks,
        state.rebuilds,
        state.researchAwarded,
      ].forEach((value, i) => text(stats[i], format(value)));
    }
  }
  return {
    render,
    feedback(amount, reduced) {
      if (!reduced) {
        const button = $("logo-button");
        button.getAnimations().forEach((animation) => animation.cancel());
        button.animate(
          [{ transform: "scale(0.975)" }, { transform: "scale(1)" }],
          { duration: 180, easing: "ease-out" },
        );
      }
      const node = make("span", "float", `+${format(amount)}`);
      // Rapid clicks share one label instead of piling up unreadable numbers.
      $("click-feedback").replaceChildren();
      $("click-feedback").append(node);
      setTimeout(() => node.remove(), reduced ? 250 : 800);
    },
  };
}
