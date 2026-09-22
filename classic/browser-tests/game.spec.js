import { test, expect } from "@playwright/test";
import { createFreshState } from "../src/economy.js";
import { SAVE_KEY, SAVE_VERSION } from "../src/content.js";

async function seed(page, state) {
  await page.addInitScript(({ key, version, state }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version, data: { ...state, lastSimulatedAt: Date.now() } }));
  }, { key: SAVE_KEY, version: SAVE_VERSION, state });
}
async function ready(page) {
  await page.goto("/");
  await page.waitForFunction(() => window.render_game_to_text && !JSON.parse(window.render_game_to_text()).readOnly);
}

test("click, buy, advance, focus retention and plain-text imported Chronicle", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const state = createFreshState();
  state.shards = 1000;
  state.chronicleEntries = [{ type: "<b>untrusted</b>", title: '<img src=x onerror="window.injected=true">', text: "<script>unsafe</script>" }];
  await seed(page, state);
  await ready(page);
  await page.locator("#logo-button").click();
  const afterClick = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  expect(afterClick.shards).toBeGreaterThan(1000);
  await page.locator('[data-generator-id="whisperer"]').click();
  await page.evaluate(() => window.advanceTime(10000));
  const afterBuy = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  expect(afterBuy.generators[0].owned).toBe(1);
  expect(afterBuy.passiveRate).toBeGreaterThan(0);
  await page.locator("#top-menu summary").click();
  await page.locator('[data-goal-tab="work"]').click();
  const button = page.locator('[data-project-allocation="0.5"]');
  await button.click();
  await button.focus();
  const handle = await button.elementHandle();
  await page.waitForTimeout(300);
  expect(await handle.evaluate((node) => node.isConnected && document.activeElement === node)).toBe(true);
  await page.locator('[data-goal-tab="chronicle"]').click();
  await expect(page.locator(".chronicle-list")).toContainText('<img src=x');
  expect(await page.locator(".chronicle-list img, .chronicle-list script").count()).toBe(0);
  expect(await page.evaluate(() => window.injected)).toBeUndefined();
  expect(errors).toEqual([]);
});

test("secondary tabs cannot overwrite the primary game", async ({ page, context }) => {
  await ready(page);
  const second = await context.newPage();
  await second.goto("/");
  await second.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).readOnly);
  await second.locator("#logo-button").click();
  expect((await second.evaluate(() => JSON.parse(window.render_game_to_text()))).totalClicks).toBe(0);
  await page.locator("#logo-button").click();
  await page.keyboard.press("s");
  await expect.poll(async () => (await second.evaluate(() => JSON.parse(window.render_game_to_text()))).totalClicks).toBe(1);
  await page.close();
  await second.reload();
  await second.waitForFunction(() => !JSON.parse(window.render_game_to_text()).readOnly);
});

test("corrupt save is protected in the running browser", async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, "{corrupt"), SAVE_KEY);
  await ready(page);
  await page.locator("#logo-button").click();
  await page.keyboard.press("s");
  expect(await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY)).toBe("{corrupt");
  await page.locator("#top-menu summary").click();
  await expect(page.locator("#save-status")).toContainText("Not saved");
});

for (const width of [320, 390, 768, 1024, 1440, 1920]) {
  for (const phase of ["fresh", "mature", "challenge", "capstone"]) {
    test(`${phase} layout at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
      const state = createFreshState();
      if (phase !== "fresh") {
        state.shards = 1e70; state.lifetimeShards = 1e70; state.riftEntries = 5;
        for (const id of Object.keys(state.generatorCounts)) state.generatorCounts[id] = 30;
      }
      if (phase === "challenge") state.activeChallenge = "quietStorm";
      if (phase === "capstone") { state.campaignComplete = true; state.completedWorkStages = 4; state.projectStage = 4; }
      await seed(page, state);
      await ready(page);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.screenshot({ path: `output/reliability/${phase}-${width}.png`, fullPage: true });
      if (phase === "mature" && width === 320) await page.screenshot({ path: "output/reliability/mature-320-viewport.png" });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      const logo = await page.locator("#logo-button").boundingBox();
      expect(logo.width).toBeGreaterThan(44);
      await page.locator("#top-menu summary").click();
      for (const tab of ["work", "challenges", "chronicle", "automation", "mastery", "expeditions"]) {
        await page.locator(`[data-goal-tab="${tab}"]`).click();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      }
    });
  }
}

test("mastery, Works, expeditions, pinned goals and persistence through the interface", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const state = createFreshState();
  state.shards = 1e15; state.lifetimeShards = 1e15; state.riftEntries = 3;
  state.generatorCounts.galeLoom = 100;
  state.masteryTokens = 30; state.expeditionMaterials = 45;
  await seed(page, state);
  await ready(page);
  await page.locator("#top-menu summary").click();
  await page.locator('[data-goal-tab="work"]').click();
  await page.locator('[data-build-work="mastery"]').click();
  await expect.poll(async () => (await page.evaluate(() => JSON.parse(window.render_game_to_text()))).extendedWorks.mastery).toBe(1);
  await page.locator('[data-goal-tab="mastery"]').click();
  await page.locator('[data-specialization="galeLoom"]').selectOption("chorus");
  await page.locator('[data-goal-tab="automation"]').click();
  await page.locator('[data-automation="generators"]').check();
  await page.locator('[data-automation="reserve"]').fill("1000");
  await page.locator('[data-automation="reserve"]').press("Tab");
  await page.locator('[data-goal-tab="expeditions"]').click();
  await page.locator("[data-expedition]").first().click();
  await expect(page.locator(".expedition-active")).toBeVisible();
  await page.locator("#objective-picker").selectOption("expeditions");
  await expect(page.locator("#pinned-objective")).toContainText("Crew underway");
  await page.screenshot({ path: "output/reliability/expedition-desktop.png" });
  await page.reload();
  await page.waitForFunction(() => window.render_game_to_text && !JSON.parse(window.render_game_to_text()).readOnly);
  const loaded = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  expect(loaded.extendedWorks.mastery).toBe(1);
  expect(loaded.mastery.galeLoom.pending).toBe("chorus");
  expect(loaded.automation.reserve).toBe(1000);
  expect(loaded.expeditions.active.type).toBe("quietStorm");
  await page.locator("#top-menu summary").click();
  await page.locator('[data-goal-tab="expeditions"]').click();
  await page.locator("[data-abandon-expedition]").click();
  await expect.poll(async () => (await page.evaluate(() => JSON.parse(window.render_game_to_text()))).expeditions.active).toBeNull();
  expect(errors).toEqual([]);
});

test("landscape, zoom-equivalent reflow and long-number clipping", async ({ browser }) => {
  for (const [width, height, scale, name] of [[844, 390, 1, "landscape"], [720, 450, 2, "zoom-200"]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, hasTouch: true });
    const page = await context.newPage();
    const state = createFreshState(); state.shards = 1e70; state.riftEntries = 3;
    await seed(page, state);
    await ready(page);
    expect(await page.locator("#shard-total").evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    await page.locator("#top-menu summary").click();
    await page.locator('[data-goal-tab="mastery"]').click();
    await page.screenshot({ path: `output/reliability/${name}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await context.close();
  }
});

test("reset confirmation can cancel without losing progress", async ({ page }) => {
  await ready(page);
  await page.locator("#logo-button").click();
  await page.locator("#top-menu summary").click();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.locator("#reset-btn").click();
  expect((await page.evaluate(() => JSON.parse(window.render_game_to_text()))).totalClicks).toBe(1);
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#reset-btn").click();
  expect((await page.evaluate(() => JSON.parse(window.render_game_to_text()))).totalClicks).toBe(0);
});

test("recovered backups can be retained explicitly without deleting the original payload", async ({ page }) => {
  const state = createFreshState(); state.shards = 432;
  await page.addInitScript(({ key, state, version }) => {
    localStorage.setItem(key, "{corrupt");
    localStorage.setItem(`${key}:backup`, JSON.stringify({ version, data: state }));
  }, { key: SAVE_KEY, state, version: SAVE_VERSION });
  await ready(page);
  await page.locator("#top-menu summary").click();
  await expect(page.locator("#recover-save-btn")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#recover-save-btn").click();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).data.shards, SAVE_KEY)).toBeGreaterThanOrEqual(432);
  expect(await page.evaluate((key) => localStorage.getItem(`${key}:recovery`), SAVE_KEY)).toBe("{corrupt");
  await expect(page.locator("#session-status")).toBeHidden();
});

test("grouped upgrades retain expansion state and lock unmet prerequisites", async ({ page }) => {
  const state = createFreshState(); state.shards = 1e10; state.generatorCounts.whisperer = 10;
  await seed(page, state);
  await ready(page);
  await page.locator('[data-upgrade-tab="generator"]').click();
  const group = page.locator('[data-upgrade-group="whisperer"]');
  const handle = await group.elementHandle();
  await expect(page.locator('[data-buy-upgrade-id="whisperer-300"]')).toBeDisabled();
  await group.locator("summary").first().click();
  await page.locator('[data-generator-id="whisperer"]').click();
  await page.waitForTimeout(200);
  expect(await handle.evaluate((node) => node.isConnected && !node.open)).toBe(true);
});

test("Rift Aspect controls retain keyboard focus after unlock and equip", async ({ page }) => {
  const state = createFreshState(); state.echoes = 20; state.riftEntries = 3;
  await seed(page, state);
  await ready(page);
  await page.locator("#top-menu summary").click();
  const button = page.locator('[data-aspect-id="deepReservoir"]');
  const handle = await button.elementHandle();
  await button.click();
  await page.waitForTimeout(200);
  expect(await handle.evaluate((node) => node.isConnected && document.activeElement === node)).toBe(true);
  await button.click();
  await expect.poll(async () => (await page.evaluate(() => JSON.parse(window.render_game_to_text()))).pendingAspects).toContain("deepReservoir");
});
