import {
  PRODUCERS,
  UPGRADES,
  RESEARCH,
  GOAL_LANES,
  MODIFICATIONS,
  MODIFICATION_COSTS,
  BALANCE,
} from "./content.js";
import {
  deriveEconomy,
  producerCost,
  affordableAmount,
  upgradeUnlocked,
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

export function createUI(dispatch) {
  let quantity = "1",
    view = "production";
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
    row.tabIndex = -1;
    button.dataset.modification = m.id;
    button.addEventListener("click", () =>
      dispatch({ type: "buyModification", id: m.id }),
    );
    info.append(name, description);
    row.append(info, button);
    $("modifications-list").append(row);
    return { row, description, button };
  });
  const producerNodes = PRODUCERS.map((p) => {
    const row = make("article", "producer"),
      info = make("div"),
      name = make("span", "item-name", p.name),
      owned = make("span", "owned"),
      description = make("p", "description", p.description),
      stats = make("div", "item-stats"),
      button = make("button", "purchase"),
      cost = make("span"),
      unit = make("small", "", "Obsidian");
    name.append(owned);
    info.append(name, description, stats);
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
    return { row, owned, stats, button, cost, unit };
  });
  const upgradeNodes = UPGRADES.map((u) => {
    const row = make("article", "upgrade"),
      info = make("div"),
      name = make("span", "item-name", u.name),
      effect = make("p", "description"),
      button = make("button", "purchase");
    effect.textContent =
      "producer" in u
        ? "Producer output x2"
        : `Click base +${u.base}${u.share ? `; +${u.share * 100}% of production per click` : ""}`;
    info.append(name, effect);
    row.append(info, button);
    button.dataset.upgrade = u.id;
    button.addEventListener("click", () =>
      dispatch({ type: "buyUpgrade", id: u.id }),
    );
    $("upgrades").append(row);
    return { row, button };
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
          ? `${format(Math.min(goalValue(state, goal), goal.target))} / ${format(goal.target)}; reward ${goal.reward} Parts`
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
        const cost = producerCost(state, p.id, amount);
        text(
          n.stats,
          unlocked
            ? `${format(economy.unitRates[p.id] * state.producers[p.id])}/s total; +${format(economy.unitRates[p.id] * amount)}/s for ${amount}`
            : `Unlock at ${format(p.cost)} Obsidian produced this workshop`,
        );
        text(n.cost, unlocked ? format(cost) : "Locked");
        text(n.unit, unlocked ? "Obsidian" : format(p.cost));
        n.button.setAttribute(
          "aria-label",
          `Buy ${amount} ${p.name} for ${format(cost)} Obsidian`,
        );
        n.button.disabled = readOnly || !unlocked || cost > state.obsidian;
      });
      let visible = 0;
      UPGRADES.forEach((u, i) => {
        const n = upgradeNodes[i],
          purchased = state.upgrades.includes(u.id);
        n.row.hidden = !purchased && !upgradeUnlocked(state, u);
        if (n.row.hidden) return;
        const target = $(purchased ? "installed-list" : "upgrades");
        const hadFocus = document.activeElement === n.button;
        if (n.row.parentElement !== target) target.append(n.row);
        if (hadFocus && purchased) {
          $("installed-upgrades").hidden = false;
          $("installed-summary").focus();
        }
        if (!purchased) visible++;
        text(n.button, purchased ? "Installed" : `${format(u.cost)} Obsidian`);
        n.button.disabled = readOnly || purchased || state.obsidian < u.cost;
        n.button.setAttribute(
          "aria-label",
          purchased
            ? `${u.name} installed`
            : `Buy ${u.name} for ${format(u.cost)} Obsidian`,
        );
      });
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
        text(
          n.description,
          `Level ${level}/5. ${m.effect === "output" ? "Output +" : "Prices -"}${Math.round(level * m.perLevel * 100)}%${cost === undefined ? " (maximum)" : `; next ${Math.round((level + 1) * m.perLevel * 100)}%`}.`,
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
        `Rebuild now to earn ${format(economy.availableResearch)} Research Points. Equipment, Obsidian, and ordinary upgrades reset. Research, Parts, modifications, and goal progress stay.`,
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
      const node = make("span", "float", `+${format(amount)}`);
      if ($("click-feedback").childElementCount >= 8)
        $("click-feedback").firstElementChild.remove();
      $("click-feedback").append(node);
      setTimeout(() => node.remove(), reduced ? 250 : 800);
    },
  };
}
