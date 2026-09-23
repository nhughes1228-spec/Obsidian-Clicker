import {
  SAVE_KEY,
  LOCK_KEY,
  EDITION,
  PRODUCERS,
  UPGRADES,
  RESEARCH,
} from "./content.js";
import {
  createFreshState,
  applyCommand,
  advanceSimulation,
  advanceTo,
  deriveEconomy,
  upgradeUnlocked,
  purchasePreview,
} from "./core.js";
import { createSaveStore, parseSave, exportSave } from "./persistence.js";
import { createUI, $, format } from "./ui.js";
import { createAudio } from "./audio.js";
import { activeGoals, goalValue } from "./goals.js";

let state = createFreshState(),
  readOnly = true,
  error = null,
  recovered = false,
  manualClock = false,
  releaseLock,
  confirmAction,
  confirmKind;
const storage = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
};
const store = createSaveStore(storage);
const ui = createUI(dispatch),
  audio = createAudio(() => state.settings);
function render() {
  ui.render(state, { readOnly, error, recovered });
  if ($("confirm-dialog").open && confirmKind === "rebuild")
    $("confirm-text").textContent = rebuildText();
}
function tick() {
  if (readOnly || manualClock) return;
  const ms = Date.now() - state.lastSimulatedAt;
  if (ms > 0) advanceTo(state, Date.now(), { offline: true });
}
function save() {
  if (readOnly) return;
  tick();
  const result = store.save(state);
  if (!result.ok) error = result.error;
  else {
    error = null;
    recovered = false;
  }
  render();
}
function dispatch(command) {
  if (command.type === "render") {
    render();
    return;
  }
  if (readOnly) return;
  tick();
  const result = applyCommand(state, command);
  if (result.ok) {
    if (command.type === "click")
      ui.feedback(
        result.amount,
        state.settings.reducedMotion ||
          matchMedia("(prefers-reduced-motion: reduce)").matches,
      );
    if (command.type === "click" || command.type.startsWith("buy"))
      audio.tone(command.type !== "click");
    audio.sync();
    if (command.type !== "click") save();
  }
  render();
}
function confirm(title, message, action, kind = "") {
  $("confirm-title").textContent = title;
  $("confirm-text").textContent = message;
  confirmAction = action;
  confirmKind = kind;
  $("confirm-dialog").showModal();
}
function replace(next) {
  if (readOnly) return;
  const result = store.replace(next);
  if (result.ok) {
    state = next;
    error = null;
    recovered = false;
    manualClock = false;
    audio.sync();
  } else error = result.error;
  render();
}
function rebuildText() {
  return `Earn ${format(deriveEconomy(state).availableResearch)} Research Points.\n\nReset: current Obsidian, all equipment, and ordinary upgrades.\nKeep: Research Points, all research, Upgrade Parts, equipment modifications, goal progress, lifetime statistics, settings, and completed introductory objectives.${state.research.includes("starter") ? "\nStart with 10 Casting Trays." : "\nStart with an empty workshop and 1 base Obsidian per click, improved by any permanent click research."}`;
}
$("logo-button").addEventListener("click", () => dispatch({ type: "click" }));
const logo = $("logo-button").querySelector("img");
function showLogoFallback() {
  logo.hidden = true;
  $("logo-fallback").hidden = false;
}
logo.addEventListener("error", showLogoFallback);
if (logo.complete && !logo.naturalWidth) showLogoFallback();
$("settings-open").addEventListener("click", () => {
  $("settings-dialog").showModal();
  render();
});
for (const b of document.querySelectorAll("[data-close]"))
  b.addEventListener("click", () => $(b.dataset.close).close());
$("confirm-action").addEventListener("click", () => {
  $("confirm-dialog").close();
  if (!readOnly) confirmAction?.();
  confirmAction = null;
});
$("rebuild-open").addEventListener("click", () =>
  confirm(
    "Rebuild Workshop?",
    rebuildText(),
    () => dispatch({ type: "rebuild" }),
    "rebuild",
  ),
);
$("reset-open").addEventListener("click", () =>
  confirm(
    "Reset Workshop progress?",
    "This resets this edition's production, Research Points, and statistics. A recovery copy is retained. Your Classic save will not be changed.",
    () => replace(createFreshState()),
  ),
);
$("keep-backup").addEventListener("click", () =>
  confirm(
    "Keep recovered backup?",
    "Resume saving from this backup. The unreadable original will be retained in the recovery slot.",
    () => replace(state),
  ),
);
for (const key of ["sound", "music", "reducedMotion"])
  $(key).addEventListener("change", (event) =>
    dispatch({ type: "setting", key, value: event.target.checked }),
  );
$("automation").addEventListener("change", (event) =>
  dispatch({ type: "automation", enabled: event.target.checked }),
);
$("save").addEventListener("click", save);
$("export").addEventListener("click", () => {
  tick();
  const blob = new Blob([exportSave(state)], { type: "application/json" }),
    url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = "obsidian-workshop-save.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$("import").addEventListener("click", () => $("import-file").click());
$("import-file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file || readOnly) return;
  try {
    if (file.size > 200000)
      throw new Error("Save must be smaller than 200 KB.");
    const next = parseSave(await file.text());
    confirm(
      "Import Workshop save?",
      "Replace current Workshop progress with this save? The existing save is retained in the recovery slot. Classic progress is unchanged.",
      () => {
        advanceTo(next, Date.now(), { offline: true });
        replace(next);
      },
    );
  } catch (e) {
    error = e.message;
    render();
  }
});
document.addEventListener("pointerdown", () => audio.sync());
document.addEventListener("keydown", () => audio.sync());
window.addEventListener("storage", (event) => {
  if (!readOnly || event.key !== SAVE_KEY || !event.newValue) return;
  try {
    state = parseSave(event.newValue);
    render();
  } catch {}
});
function load(writer) {
  const result = store.load();
  state = result.state;
  error = result.error;
  recovered = result.recovered;
  readOnly = !writer;
  if (writer) {
    advanceTo(state, Date.now(), { offline: true });
    if (!error) save();
  }
  render();
}
if (navigator.locks)
  navigator.locks
    .request(LOCK_KEY, { ifAvailable: true }, async (lock) => {
      load(Boolean(lock));
      if (lock)
        await new Promise((resolve) => {
          releaseLock = resolve;
        });
    })
    .catch(() => {
      load(false);
    });
else {
  load(false);
  error =
    "This browser cannot safely coordinate saves. Use a browser with Web Locks support.";
  render();
}
window.addEventListener("pagehide", () => {
  save();
  readOnly = true;
  releaseLock?.();
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) location.reload();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) save();
  else {
    tick();
    render();
  }
});
setInterval(() => {
  tick();
  render();
}, 100);
setInterval(save, 10000);
window.advanceTime = (ms) => {
  if (!Number.isFinite(ms) || ms < 0)
    throw new RangeError("Elapsed time must be finite and nonnegative");
  if (ms === 0 || readOnly) return;
  advanceSimulation(state, ms, { offline: ms > 86400000 });
  manualClock = true;
  render();
};
window.render_game_to_text = () => {
  const economy = deriveEconomy(state);
  return JSON.stringify({
    edition: EDITION,
    obsidian: state.obsidian,
    lifetimeObsidian: state.lifetimeObsidian,
    ...economy,
    producers: PRODUCERS.map((p) => ({
      id: p.id,
      name: p.name,
      owned: state.producers[p.id],
      unlocked: state.unlockedProducers.includes(p.id),
      support: economy.supportByProducer[p.id],
      purchase: purchasePreview(
        state,
        { type: "buyProducer", id: p.id },
        economy,
      ),
    })),
    upgrades: state.upgrades,
    availableUpgrades: UPGRADES.filter(
      (u) => !state.upgrades.includes(u.id) && upgradeUnlocked(state, u),
    ).map((u) => u.id),
    researchPoints: state.researchPoints,
    researchAwarded: state.researchAwarded,
    research: state.research,
    researchComplete: state.research.length === RESEARCH.length,
    rebuilds: state.rebuilds,
    clicks: state.clicks,
    automation: state.automation,
    completedObjectives: state.completedObjectives,
    upgradeParts: state.upgradeParts,
    modifications: state.modifications,
    claimedGoals: state.claimedGoals,
    goals: activeGoals(state)
      .filter(Boolean)
      .map((goal) => ({
        ...goal,
        progress: Math.min(goal.target, goalValue(state, goal)),
        claimable: goalValue(state, goal) >= goal.target,
      })),
    saved: Boolean(state.lastSavedAt),
    saveError: error,
    readOnly,
  });
};
render();
