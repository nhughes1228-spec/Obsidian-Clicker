import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { createFreshState, reconcile, applyCommand } from "../src/core.js";
import { SAVE_KEY, BALANCE, RESEARCH } from "../src/content.js";
import { exportSave, BACKUP_KEY } from "../src/persistence.js";
import { createFreshState as classicFresh } from "../classic/src/economy.js";
import { exportSave as classicExport } from "../classic/src/persistence.js";

const classicKey = "obsidian-clicker-save-v1";
test("claim Parts, modify equipment, rebuild and reload without losing permanent rewards", async ({
  page,
}) => {
  await seed(page, preset("mature"));
  await ready(page);
  await page.evaluate(() => window.advanceTime(1));
  const claim = page.locator('[data-goal-lane="equipment"]');
  await claim.focus();
  await page.keyboard.press("Enter");
  expect((await game(page)).upgradeParts).toBe(5);
  await expect(page.locator(".goal").nth(2)).toBeFocused();
  await page.locator("#modifications-tab").click();
  await page.locator('[data-modification="tray"]').click();
  expect((await game(page)).modifications.tray).toBe(1);
  expect((await game(page)).upgradeParts).toBe(0);
  await page.locator("#research-tab").click();
  await page.locator("#rebuild-open").click();
  await expect(page.locator("#confirm-text")).toContainText("Upgrade Parts");
  await page.locator("#confirm-action").click();
  expect((await game(page)).claimedGoals).toContain("equipment-tray-0");
  expect((await game(page)).modifications.tray).toBe(1);
  await page.reload();
  await page.waitForFunction(
    () =>
      window.render_game_to_text &&
      !JSON.parse(window.render_game_to_text()).readOnly,
  );
  expect((await game(page)).modifications.tray).toBe(1);
  expect((await game(page)).claimedGoals).toContain("equipment-tray-0");
  await page.locator("#modifications-tab").click();
  await expect(page.locator('[data-modification="tray"]')).toHaveText(
    "10 Parts",
  );
});

for (const width of [320, 390, 768, 1024, 1440, 1920]) {
  test(`goals and permanent modifications at ${width}px`, async ({ page }) => {
    const errors = await cleanConsole(page);
    await page.setViewportSize({ width, height: 900 });
    await seed(page, preset("mature"));
    await ready(page);
    await page.locator('[data-goal-lane="production"]').click();
    await page.locator("#modifications-tab").click();
    await expect(page.locator("#modifications-view")).toBeVisible();
    await expect(page.locator(".goal")).toHaveCount(3);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const buttons = await page
      .locator("#modifications-list button, #goals-list button")
      .evaluateAll((nodes) =>
        nodes.every(
          (n) =>
            n.getBoundingClientRect().height >= 44 &&
            n.scrollWidth <= n.clientWidth,
        ),
      );
    expect(buttons).toBe(true);
    await mkdir("output/workshop/goals", { recursive: true });
    await page.screenshot({
      path: `output/workshop/goals/modifications-${width}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}
test("logo has no flavor caption and three reward goals remain visible", async ({
  page,
}) => {
  await ready(page);
  await expect(page.locator(".premise")).toHaveCount(0);
  await expect(page.locator(".goal")).toHaveCount(3);
  await expect(page.locator("#goals-list")).toContainText(
    "Produce 100 lifetime Obsidian",
  );
  await page.locator("#logo-button").click();
  expect((await game(page)).goals[0].progress).toBe(1);
});
function preset(kind = "fresh") {
  const s = createFreshState();
  if (kind !== "fresh") {
    s.obsidian =
      s.lifetimeObsidian =
      s.runObsidian =
        kind === "large" ? 1e100 : BALANCE.researchThreshold * 1024;
    s.producers.tray = 100;
    s.producers.furnace = 25;
    reconcile(s);
  }
  if (kind === "large") {
    s.researchAwarded = 32;
    s.research = RESEARCH.map((r) => r.id);
  }
  return s;
}
async function seed(page, state) {
  await page.addInitScript(
    ({ key, raw }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, raw);
    },
    { key: SAVE_KEY, raw: exportSave(state) },
  );
}
async function ready(page, path = "/") {
  await page.goto(path);
  await page.waitForFunction(
    () =>
      window.render_game_to_text &&
      !JSON.parse(window.render_game_to_text()).readOnly,
  );
}
const game = (page) =>
  page.evaluate(() => JSON.parse(window.render_game_to_text()));
async function cleanConsole(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  return errors;
}

test("deterministic rapid clicks, purchases, offline time and stable focus", async ({
  page,
}) => {
  const errors = await cleanConsole(page);
  await ready(page);
  await page.evaluate(() => window.advanceTime(1));
  for (let i = 0; i < 16; i++) await page.locator("#logo-button").click();
  expect((await game(page)).obsidian).toBe(16);
  await page.locator('[data-producer="tray"]').click();
  const button = page.locator('[data-producer="tray"]'),
    handle = await button.elementHandle();
  await page.evaluate(() => window.advanceTime(300000));
  await button.focus();
  await page.waitForTimeout(300);
  expect(
    await handle.evaluate((n) => n.isConnected && document.activeElement === n),
  ).toBe(true);
  expect((await game(page)).producers[0].owned).toBe(1);
  expect((await game(page)).obsidian).toBeCloseTo(31);
  await page.locator('[data-upgrade="tool-0"]').click();
  expect((await game(page)).clickPower).toBe(5);
  const before = (await game(page)).obsidian;
  await page.locator("#logo-button").click();
  expect((await game(page)).obsidian).toBeCloseTo(before + 5);
  const snapshot = JSON.stringify(await game(page));
  await page.evaluate(() => window.advanceTime(0));
  expect(JSON.stringify(await game(page))).toBe(snapshot);
  expect(
    await page.evaluate(() => {
      try {
        window.advanceTime(-1);
        return false;
      } catch {
        return true;
      }
    }),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("research, rebuild confirmation, starter kit and automatic controls", async ({
  page,
}) => {
  await seed(page, preset("mature"));
  await ready(page);
  await page.evaluate(() => window.advanceTime(1));
  await page.locator("#research-tab").click();
  await page.locator("#rebuild-open").click();
  await expect(page.locator("#confirm-text")).toContainText(
    "32 Research Points",
  );
  await expect(page.locator("#confirm-text")).toContainText("Reset:");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect((await game(page)).rebuilds).toBe(0);
  await page.locator("#rebuild-open").click();
  await page.locator("#confirm-action").click();
  expect((await game(page)).researchPoints).toBe(32);
  expect((await game(page)).obsidian).toBe(0);
  for (const r of RESEARCH)
    await page.locator(`[data-research="${r.id}"]`).click();
  expect((await game(page)).researchComplete).toBe(true);
  await expect(page.locator("#research-complete")).toBeVisible();
  await page.locator("#production-tab").click();
  await page.locator("#automation").check();
  expect((await game(page)).automation).toBe(true);
  await page.reload();
  await page.waitForFunction(
    () =>
      window.render_game_to_text &&
      !JSON.parse(window.render_game_to_text()).readOnly,
  );
  expect((await game(page)).researchComplete).toBe(true);
  expect((await game(page)).automation).toBe(true);
});

test("secondary tab is read-only and Classic uses a separate lock and save", async ({
  page,
  context,
}) => {
  await ready(page);
  const second = await context.newPage();
  await second.goto("/");
  await expect(second.locator("#logo-button")).toBeDisabled();
  await expect(second.locator("#notice")).toContainText("read-only");
  await page.locator("#logo-button").click();
  await page.locator("#settings-open").click();
  await page.locator("#save").click();
  await expect.poll(async () => (await game(second)).clicks).toBe(1);
  const classic = await context.newPage();
  await ready(classic, "/classic/");
  await classic.locator("#logo-button").click();
  expect((await game(classic)).totalClicks).toBe(1);
  const before = await page.evaluate(
    (key) => localStorage.getItem(key),
    classicKey,
  );
  await page.locator("#reset-open").click();
  await page.locator("#confirm-action").click();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), classicKey),
  ).toBe(before);
  await second.close();
  await classic.close();
});

test("corrupt save is protected, backup recovery explicitly retains original", async ({
  page,
}) => {
  const good = exportSave(preset("mature"));
  await page.addInitScript(
    ({ key, backup, good }) => {
      localStorage.setItem(key, "broken");
      localStorage.setItem(backup, good);
    },
    { key: SAVE_KEY, backup: BACKUP_KEY, good },
  );
  await ready(page);
  await expect(page.locator("#notice")).toContainText("Recovered");
  await page.locator("#settings-open").click();
  await page.locator("#save").click();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY),
  ).toBe("broken");
  await page.locator("#keep-backup").click();
  await page.locator("#confirm-action").click();
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(`${key}:recovery`),
      SAVE_KEY,
    ),
  ).toBe("broken");
  expect(
    JSON.parse(
      await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY),
    ).edition,
  ).toBe("workshop");
});

test("Classic save imports are rejected and reset can be canceled", async ({
  page,
}) => {
  await ready(page);
  await page.locator("#logo-button").click();
  await page.locator("#settings-open").click();
  await page.locator("#import-file").setInputFiles({
    name: "classic.json",
    mimeType: "application/json",
    buffer: Buffer.from(classicExport(classicFresh())),
  });
  await expect(page.locator("#save-status")).toContainText(
    "not a Workshop save",
  );
  await page.locator("#reset-open").click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect((await game(page)).clicks).toBe(1);
});

test("Workshop import, export and settings stay isolated and literal", async ({
  page,
}) => {
  await ready(page);
  await page.locator("#settings-open").click();
  const state = preset("mature");
  state.upgrades = ['<img src=x onerror="window.injected=1">'];
  await page.locator("#import-file").setInputFiles({
    name: "workshop.json",
    mimeType: "application/json",
    buffer: Buffer.from(exportSave(state)),
  });
  await page.locator("#confirm-action").click();
  expect((await game(page)).upgrades).toEqual([]);
  await page.locator("#reducedMotion").check();
  await page.locator("#sound").uncheck();
  await expect(page.locator("body")).toHaveClass(/reduced-motion/);
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#export").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("obsidian-workshop-save.json");
  expect(await page.evaluate(() => window.injected)).toBeUndefined();
});

test("installed upgrades collapse without losing keyboard navigation", async ({
  page,
}) => {
  await seed(page, preset("mature"));
  await ready(page);
  const button = page.locator('[data-upgrade="tool-0"]');
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#installed-summary")).toBeFocused();
  await expect(button).toBeHidden();
  await page.keyboard.press("Enter");
  await expect(button).toBeVisible();
  await page.waitForTimeout(300);
  await expect(page.locator("#installed-upgrades")).toHaveAttribute("open", "");
});

test("blocked storage remains playable in memory with a visible export warning", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("Storage blocked");
    };
    Storage.prototype.setItem = () => {
      throw new Error("Storage blocked");
    };
  });
  const errors = await cleanConsole(page);
  await ready(page);
  await expect(page.locator("#notice")).toContainText("Storage is unavailable");
  await page.locator("#logo-button").click();
  expect((await game(page)).obsidian).toBe(1);
  await page.locator("#settings-open").click();
  await page.locator("#save").click();
  expect((await game(page)).saved).toBe(false);
  expect(errors).toEqual([]);
});

test("missing logo uses the temporary text fallback", async ({ page }) => {
  await page.route("**/assets/obsidian-winds-logo.png", (route) =>
    route.abort(),
  );
  await ready(page);
  await expect(page.locator("#logo-fallback")).toBeVisible();
  await page.locator("#logo-button").click();
  expect((await game(page)).obsidian).toBe(1);
});

for (const width of [320, 390, 768, 1024, 1440, 1920])
  for (const kind of ["fresh", "mature", "large"]) {
    test(`${kind} layout at ${width}px`, async ({ page }) => {
      const errors = await cleanConsole(page);
      await page.setViewportSize({ width, height: 900 });
      await seed(page, preset(kind));
      await ready(page);
      await page.evaluate(() => window.advanceTime(1));
      const overflow = () =>
        page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      expect(await overflow()).toBe(false);
      await expect(page.locator("#logo-button img")).toBeVisible();
      expect(
        await page
          .locator("#logo-button img")
          .evaluate((img) => img.naturalWidth),
      ).toBeGreaterThan(0);
      await mkdir("output/workshop", { recursive: true });
      await page.screenshot({
        path: `output/workshop/${kind}-${width}.png`,
        fullPage: false,
      });
      if (kind !== "fresh") {
        await page.locator("#research-tab").click();
        expect(await overflow()).toBe(false);
        await page.screenshot({
          path: `output/workshop/research-${kind}-${width}.png`,
          fullPage: false,
        });
      }
      await page.locator("#settings-open").click();
      await expect(page.locator("#settings-dialog")).toBeVisible();
      expect(await overflow()).toBe(false);
      await page.keyboard.press("Escape");
      await expect(page.locator("#settings-open")).toBeFocused();
      expect(errors).toEqual([]);
    });
  }

test("landscape, keyboard and zoom-equivalent reflow", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await seed(page, preset("large"));
  await ready(page);
  await page.locator("#settings-open").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#settings-dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#settings-open")).toBeFocused();
  await page.setViewportSize({ width: 720, height: 450 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "output/workshop/zoom-reflow.png" });
});

test("Classic loads an existing save and renders its logo at the archived path", async ({
  page,
}) => {
  const state = classicFresh();
  state.shards = 1234;
  state.lifetimeShards = 1234;
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), {
    key: classicKey,
    raw: classicExport(state),
  });
  await ready(page, "/classic/");
  expect((await game(page)).shards).toBe(1234);
  expect(
    await page.locator("#logo-img").evaluate((img) => img.naturalWidth),
  ).toBeGreaterThan(0);
  await page.locator("#logo-button").click();
  expect((await game(page)).shards).toBeGreaterThan(1234);
});
