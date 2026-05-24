const OBSIDIAN_SAVE_KEY = "obsidian-clicker-save-v1";
const OBSIDIAN_HEARTBEAT_KEY = "obsidian-clicker-active-heartbeat-v1";
const HEARTBEAT_INTERVAL_MS = 1000;

function getHeartbeatTime() {
  const value = Number(localStorage.getItem(OBSIDIAN_HEARTBEAT_KEY));
  return Number.isFinite(value) ? value : 0;
}

function writeHeartbeat() {
  localStorage.setItem(OBSIDIAN_HEARTBEAT_KEY, String(Date.now()));
}

function protectSaveTimestampFromRefreshDoubleDip() {
  const rawSave = localStorage.getItem(OBSIDIAN_SAVE_KEY);
  if (!rawSave) {
    writeHeartbeat();
    return;
  }

  try {
    const save = JSON.parse(rawSave);
    const lastSavedMs = Date.parse(save.lastSavedAt || "") || 0;
    const heartbeatMs = getHeartbeatTime();
    const newestKnownActiveMs = Math.max(lastSavedMs, heartbeatMs);

    if (newestKnownActiveMs > lastSavedMs) {
      save.lastSavedAt = new Date(newestKnownActiveMs).toISOString();
      localStorage.setItem(OBSIDIAN_SAVE_KEY, JSON.stringify(save));
    }
  } catch (error) {
    // If the save is malformed, main.js already handles that path.
  }

  writeHeartbeat();
}

protectSaveTimestampFromRefreshDoubleDip();

window.addEventListener("pagehide", writeHeartbeat);
window.addEventListener("beforeunload", writeHeartbeat);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) writeHeartbeat();
});

window.setInterval(() => {
  if (!document.hidden) writeHeartbeat();
}, HEARTBEAT_INTERVAL_MS);
