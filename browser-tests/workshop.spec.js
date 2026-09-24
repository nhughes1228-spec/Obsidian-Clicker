import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { createFreshState, reconcile, applyCommand } from "../src/core.js";
import { SAVE_KEY, BALANCE, RESEARCH, UPGRADES } from "../src/content.js";
import { exportSave, BACKUP_KEY } from "../src/persistence.js";
import { createFreshState as classicFresh } from "../classic/src/economy.js";
import { exportSave as classicExport } from "../classic/src/persistence.js";

const classicKey = "obsidian-clicker-save-v1";
test("late equipment icons show their stronger multiplier and apply it once", async ({ page }) => {
  await seed(page, preset("mature"));
  await ready(page);
  await page.evaluate(() => window.advanceTime(1));
  const icon = page.locator('[data-upgrade="tray-3"]');
  await icon.hover();
  await expect(page.locator("#upgrade-preview")).toContainText("Casting Tray output x24");
  const before = await game(page);
  await icon.click();
  const after = await game(page);
  expect(after.upgrades).toContain("tray-3");
  expect(after.obsidian).toBe(before.obsidian - UPGRADES.find((u) => u.id === "tray-3").cost);
  expect(after.passiveRate).toBeCloseTo(before.passiveRate + before.unitRates.tray * 100 * 23);
  await page.locator("#installed-summary").click();
  await expect(page.locator('#installed-list [data-upgrade="tray-3"]')).toHaveAttribute("aria-disabled", "true");
  expect(after.upgrades.filter((id) => id === "tray-3")).toHaveLength(1);
});

test("upgrade icons expose hover and keyboard details, including unaffordable items", async ({
  page,
}) => {
  await ready(page);
  await page.evaluate(() => window.advanceTime(1));
  const icon = page.locator('[data-upgrade="tool-0"]');
  await icon.hover();
  const preview = page.locator("#upgrade-preview");
  await expect(preview).toBeVisible();
  await expect(preview).toContainText("Casting Tool I");
  await expect(preview).toContainText("25 Obsidian");
  await expect(preview.locator("button")).toBeDisabled();
  await page.mouse.move(5,5);
  await expect(preview).toBeHidden();
  await icon.hover();
  await expect(preview).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(preview).toBeHidden();
  await icon.focus();
  await expect(preview).toBeVisible();
  await page.keyboard.press("Enter");
  expect((await game(page)).upgrades).toEqual([]);
  expect(
    await icon.locator("img").evaluate((n) => n.complete && n.naturalWidth > 0),
  ).toBe(true);
});

test("touch upgrade inspection never spends until the explicit purchase", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 320, height: 800 },
    isMobile: true,
    hasTouch: true,
  });
  try {
    const page = await context.newPage();
    await seed(page, preset("mature"));
    await ready(page);
    await page.evaluate(() => window.advanceTime(1));
    const before = await game(page);
    await page.locator('[data-upgrade="tool-0"]').tap();
    const preview = page.locator("#upgrade-preview");
    await expect(preview).toBeVisible();
    expect((await game(page)).obsidian).toBe(before.obsidian);
    expect((await game(page)).upgrades).toEqual(before.upgrades);
    const box = await preview.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
    await mkdir("output/workshop/icons", { recursive: true });
    await page.screenshot({ path: "output/workshop/icons/touch-320.png" });
    await preview.locator("button").tap();
    expect((await game(page)).upgrades).toContain("tool-0");
    expect((await game(page)).obsidian).toBe(before.obsidian - 25);
    await expect(preview).toBeHidden();
  } finally {
    await context.close();
  }
});

test("available upgrades stay in price order after purchases, unlocks and rebuilding", async ({
  page,
}) => {
  await seed(page, preset("mature"));
  await ready(page);
  await page.evaluate(() => window.advanceTime(1));
  const verify = async () => {
    const state = await game(page);
    const expected = UPGRADES.filter((u) =>
      state.availableUpgrades.includes(u.id),
    )
      .sort((a, b) => a.cost - b.cost || a.id.localeCompare(b.id))
      .map((u) => u.id);
    const ids = await page
      .locator("#upgrades .upgrade:visible button")
      .evaluateAll((nodes) => nodes.map((n) => n.dataset.upgrade));
    expect(ids).toEqual(expected);
  };
  await verify();
  await page.locator('[data-upgrade="tool-0"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#installed-summary")).toBeFocused();
  await verify();
  const s = page.locator('[aria-label="Casting Tray details"]');
  await s.focus();
  await page.keyboard.press("Enter");
  await page.evaluate(() => window.advanceTime(1000));
  await expect(s).toBeFocused();
  await expect(s.locator("..")).toHaveAttribute("open", "");
  await page.locator("#research-tab").click();
  await page.locator("#rebuild-open").click();
  await page.locator("#confirm-action").click();
  await page.locator("#production-tab").click();
  await verify();
});

test("logo click response respects reduced motion and artwork is optically raised", async ({
  page,
}) => {
  await ready(page);
  await page.evaluate(() => window.advanceTime(1));
  const y = await page
    .locator("#logo-button img")
    .evaluate((n) => new DOMMatrixReadOnly(getComputedStyle(n).transform).m42);
  expect(y).toBeLessThan(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect(
    await page.evaluate(() => {
      document.querySelector("#logo-button").click();
      return document.querySelector("#logo-button").getAnimations().length;
    }),
  ).toBeGreaterThan(0);
  await page.waitForTimeout(250);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page.evaluate(() => {
      document.querySelector("#logo-button").click();
      return document.querySelector("#logo-button").getAnimations().length;
    }),
  ).toBe(0);
  await page.evaluate(() => {
    for (let i = 0; i < 20; i++) document.querySelector("#logo-button").click();
  });
  await expect(page.locator("#click-feedback .float")).toHaveCount(1);
  expect(
    await page
      .locator(".casting-area")
      .evaluate((n) => getComputedStyle(n, "::before").animationName),
  ).toBe("none");
});

for (const width of [320, 390, 768, 1024, 1440, 1920]) {
  test(`support purchase previews remain accurate and readable at ${width}px`, async ({
    page,
  }) => {
    const errors = await cleanConsole(page);
    await page.setViewportSize({ width, height: 900 });
    const s = preset("mature");
    s.producers.tray = 24;
    s.upgrades = ["tray-0", "tool-0"];
    reconcile(s);
    await seed(page, s);
    await ready(page);
    await page.evaluate(() => window.advanceTime(1));
    const row = page.locator(".producer").first();
    const disclosure = row.locator("summary");
    await expect(row.locator(".description")).not.toBeVisible();
    await disclosure.click();
    await expect(row.locator(".description")).toBeVisible();
    expect(await row.evaluate((n) => n.scrollWidth <= n.clientWidth)).toBe(
      true,
    );
    await disclosure.click();
    await expect(row).toContainText("next at 25 owned");
    await expect(row).toContainText("including support");
    const before = await game(page);
    const button = page.locator('[data-producer="tray"]');
    await button.focus();
    await page.keyboard.press("Enter");
    const after = await game(page);
    expect(after.passiveRate - before.passiveRate).toBeCloseTo(
      before.producers[0].purchase.passiveGain,
      6,
    );
    expect(after.supportByProducer.tray).toBeCloseTo(0.02, 6);
    await expect(button).toBeFocused();
    await page.locator('[data-quantity="10"]').click();
    await expect(row).toContainText("Buy 10");
    await button.scrollIntoViewIfNeeded();
    expect(await row.evaluate((n) => n.scrollWidth <= n.clientWidth)).toBe(
      true,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await mkdir("output/workshop/previews", { recursive: true });
    await page.screenshot({
      path: `output/workshop/previews/production-${width}.png`,
    });
    await page.locator("#modifications-tab").click();
    await expect(page.locator("#modifications-list")).toContainText(
      "Support contribution",
    );
    await page.locator('[data-modification="tray"]').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `output/workshop/previews/modifications-${width}.png`,
    });
    expect(errors).toEqual([]);
  });
}
test("claim Parts, modify equipment, rebuild and reload without losing permanent rewards", async ({
  page,
}) => {
  await seed(page, preset("mature"));
  await ready(page);
  await page.evaluate(() => window.advanceTime(1));
  const claim = page.locator('[data-goal-lane="equipment"]');
  await claim.focus();
  await page.keyboard.press("Enter");
  expect((await game(page)).upgradeParts).toBe(13);
  await expect(page.locator(".goal").nth(2)).toBeFocused();
  await page.locator("#modifications-tab").click();
  await page.locator('[data-modification="tray"]').click();
  expect((await game(page)).modifications.tray).toBe(1);
  expect((await game(page)).upgradeParts).toBe(8);
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
    "Produce 1,000 lifetime Obsidian",
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
  expect((await game(page)).obsidian).toBeCloseTo(91);
  await page.locator('[data-upgrade="tool-0"]').click();
  expect((await game(page)).clickPower).toBeCloseTo(5.003);
  const before = (await game(page)).obsidian;
  await page.locator("#logo-button").click();
  expect((await game(page)).obsidian).toBeCloseTo(before + 5.003, 6);
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
