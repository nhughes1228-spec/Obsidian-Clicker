Original prompt: Generate a cookie-clicker clone using the Obsidian Winds logo as the big cookie. We can figure out what all the other parts of the game will be called but for now let's focus on building the game itself.

Pacing release authorized (2026-09-23):
- User explicitly said "Deploy" after receiving the 1.3-4-day progression results. Publishing the tested rebalance to the existing GitHub main and Cloudflare custom domain; no origin change or Classic edits.
- Historical entries below describe the pre-authorization hold. The original 7-14-day simulation gate remains unchanged and failing; this release is not evidence that it passed.

Pacing repair candidate (2026-09-23, local only):
- Shared equipmentCostUnits keeps the original 15% price growth for the first 50 units, then uses 4%. Purchases, Max, previews, automation and equipment-goal ordering use this curve. No already-owned output is reduced.
- First three equipment upgrades and Casting Tool II cost 25% less. Improvements at 100/150/200 owned multiply Tray/Rack/Pump/Furnace/Line/Foundry/Well/Forge output by 24/16/10/7/5/4/3/2 respectively, keeping earlier equipment relevant. UI already displays the actual multiplier.
- Still 36 displayed goal bundles, original IDs and 1,220 Parts budget. Save v5 accepts v1-v4, preserving balances, ownership, upgrades, research, modifications and claim histories; retains the original save in recovery. Classic unchanged.
- Full fresh-save matrix: 900 active runs plus 12 controls. All active runs complete all eight producers, six Research and 40 modifications. First rebuild session 2 in all runs. Worst early opportunity gap 120s, worst late gap 90s (previous candidate 900s). Realized decisions can still lag available alternatives: worst observed realized gap 575s; no claim that every player will select an efficient purchase.
- Remaining original gate: completion is 1.34-4.01 elapsed days (66.8-189 active minutes), not 7-14 days. Strict evaluateGates and CI have NOT been weakened. Asked user whether to prioritize shorter steady progression or retain 7-14 days with more upgrades; no answer at time of writing. No push/deployment of this candidate.
- Verification: 103 unit tests, 48 browser tests, checked JavaScript and allowlist build pass. Added boundary/Max pricing, full multiplier-preview, goal-order, v4 recovery, fresh-strategy and browser tooltip regressions. Game client ran without console errors; desktop/mobile screenshots inspected. Local preview remains http://127.0.0.1:5174/.

Publication requested (2026-09-22):
- User explicitly requested pushing the current build to GitHub and bringing the playable site up to date. This supersedes the earlier publication hold, but does not resolve or waive the documented economy failures.
- Fresh verification: 98 unit tests, checked JavaScript, allowlist build and whitespace checks pass. Browser suite: 46 passed initially; the animated-logo stability test timed out and passed on isolated rerun. Previous full run passed all 47.
- Nine fresh diagnostic simulations still fail full-arc duration and late meaningful-opportunity gates. Strict CI gates are unchanged; GitHub Pages remains blocked by those failures. Verify the independent Cloudflare custom-domain deployment after pushing.
- Classic is unchanged. Save version 4 retains the existing Workshop origin/key and preserves prior reward history.

Goals, icon shelf, and Obsidian palette (2026-09-22, unreleased):
- Checked Cookie Clicker's official store implementation: price-sorted upgrade tiles with icon artwork and hover information. Added a compact, price-sorted 56px icon shelf above equipment, using nine locally bundled Lucide icons with license; no runtime CDN dependency. Installed tiles stay separate.
- Hover/focus exposes name, effect, and cost; unavailable tiles remain inspectable. Touch taps inspect without spending, with an explicit purchase button. Escape/outside click dismisses the panel; placement stays within the viewport. Fixed a render-loop bug that canceled the hover-dismiss timer.
- Replaced green/mint accents and green-tinted surfaces with black/grey/purple throughout the Workshop UI, including affordance, progress, click surface and touch highlight. Classic unchanged.
- Consolidated 116 small reward claims into 36 milestone bundles: 6 lifetime, 6 output, and 24 equipment. Equipment checkpoints at 10/100/200. First lifetime goal is 1,000; first output goal is 100/s. The original 116-entry ledger remains solely for compatibility; grouped claims record only unclaimed entries and preserve the total 1,220 Parts budget.
- Save version 4 accepts v1-v3, retaining the existing backup/recovery behavior. Partial prior claims reduce a milestone's reward; balances, modifications, ownership and research are not reset. Initial 10/50/200 grouping delayed Parts excessively; adjusted to 10/100/200 after a simulation check.
- Verification: 98 unit tests and 47 Chromium browser tests pass, including unaffordable-icon inspection, hover dismissal, keyboard, touch confirmation, viewport placement, cost sorting, milestone claims and v3 partial-claim preservation. Nine quick active simulations reach every modification; first-visit claims drop from 33-46 to 6-10. Existing duration/late-opportunity gates still fail (4.33-18.33 days); prior 900-seed results are historical, not validation of this grouping. No push or deployment.

Streamlined presentation (2026-09-22, unreleased):
- Available upgrades now render cheapest first, including after unlocks, purchases, and rebuilds. Installed upgrades remain separate. Stable ordering preserves keyboard focus. The seven equipment milestones have consistent I-VII display names while preserving all purchase IDs.
- Equipment rows show ownership, purchase gain, and price; descriptions, support, click gains and milestones remain available in native expandable Details. Modification breakdowns use the same disclosure pattern. Removed repeated explanatory paragraphs and duplicate goal reward text.
- Moved the three tangible goals beneath the logo, making the workshop balance and click target the first screen's focus. Added restrained charcoal shading, a shaded click surface, softer shadows, subtle idle light changes, click response, and clear affordable-button contrast without restoring purple decoration.
- Raised the existing logo artwork 5% within its image box to correct its optical alignment. Rapid clicks use one feedback label instead of overlapping numbers. Reduced-motion settings cover both elements and pseudo-elements.
- Verified a fresh three-minute browser shopping sequence at seven clicks/second, with legal clicks/purchases/goal claims and no seeded funds or console errors. This presentation pass does not resolve the previously documented economy failures; no core constants or save rules changed this turn. No publication.
- Verification: 97 unit tests and 45 browser tests pass, including cost ordering across unlock/reset transitions, expandable detail focus, single click-feedback labels, optical offset, reduced-motion pseudo-elements, and the existing six-width/landscape/reflow checks. Required game-client and desktop/mobile screenshots inspected. Classic unchanged.

Active-play rebalance (2026-09-22, unreleased):
- Added additive capped equipment support, modification support effects, 75/150 ownership improvements, earlier passive click scaling, pure purchase previews, and intermediate goals while preserving old IDs and rewards.
- Save v3 accepts v1/v2 and retains original recovery data. Old goal histories may contain gaps where new milestones were inserted; ledger and eligibility validation remain enforced.
- Replaced the pacing harness with legal-command active visits at 5/7.5/10 clicks per second, shopping pauses, three strategies, complete modification progression, and strict meaningful-progress gates.
- Initial candidate fails release gates: long late-game sessions without meaningful gains and completion earlier than 7 days for most strategies. Do not push or deploy this candidate. Classic is unchanged.
- Final verification: 97 unit tests, 43 Chromium browser tests, checked JavaScript, explicit-allowlist build, and whitespace validation pass. Ran the required develop-web-game client; inspected fresh play and purchase/modification screenshots at phone, tablet and desktop sizes. No browser errors. Classic smoke test and save isolation pass.
- Final 900 active runs plus 12 controls are recorded in output/workshop/active-progression-100.json and active-summary-100.json. All active runs finish all 40 modifications, all producers and Research; all first rebuilds are in session 2. Only 243/900 satisfy 7-14 days. Four exceed the 120-second early opportunity target; every run exceeds the 300-second late target (870-900 seconds).
- The simulator separately tests affordable purchase sequences, not just observed actions, and gates remain strict. npm run simulate now runs 100 seeds per combination; simulate:quick is the smaller diagnostic. The failing simulation exit is intentional and prevents publication through the existing Pages workflow.
- Outstanding: late-game reward/milestone distribution, affordable-strategy sensitivity, funding without hardest legacy goals, and final balance calibration. No push or deployment; production remains unchanged. Local preview: http://127.0.0.1:5174/.

Publication (2026-09-21):
- User explicitly authorized GitHub push and updating clicker.obsidianwinds.org.
- Confirmed the custom domain is served by the existing Cloudflare Worker with GitHub main build integration; GitHub Pages is a separate destination.
- Added asset build on npm prepare, Pages publication on main pushes, and a public release manifest containing only revision/edition/save version. No domain or save-origin change.

Workshop feedback follow-up:
- Removed the unnecessary flavor caption below the logo, retaining the visible introductory goal and progress bar.
- User approved a separate goal currency: Upgrade Parts, not additional Research Points.
- Added three persistent goal tracks (lifetime production, best output, best equipment ownership), 72 fixed goals, explicit one-time claims, and eight equipment modifications with five permanent levels each. Goal rewards total 1116 Parts; purchasing every level costs 960 Parts. No random drops, extra modes, or reset farming.
- Output modifications add 10% per level (50% cap); Pump and Well modifications reduce their own equipment prices by 3% per level (15% cap). Bonuses stack with ordinary upgrades and research through the shared core.
- Save version 2 migrates version 1 at the same key/origin, retains the original in recovery, validates Parts accounting and ownership records, and leaves Classic untouched.
- Fresh-save simulations now legally claim goals and purchase modifications. Goal spending changes purchasing decisions and makes optimized saving faster than the old 3-day Research minimum. The old 3-7-day target remains an explicit diagnostic, not a claim; upper-bound/reachability and early-game gates remain enforced. Base prices and Research accounting are unchanged.
- Added goal/modification command, migration, accounting, bounded-effect, offline, keyboard, rebuild/reload, and six-width browser coverage. Final verification results recorded in IMPLEMENTATION.md and BALANCE_REPORT.md.
- Follow-up: playtest goal cadence and allocation choices with real players; research completion is not all goal/modification completion, and the simulator currently stops at the former.

Workshop redesign (2026-09-21, current work):
- Preserved the complete previous edition in classic/ with its original save key and isolated assets. Older phase notes below describe Classic, not the new Workshop edition.
- Replaced the root game with eight producers, 45 ordinary upgrades, six permanent research purchases, deterministic clicks, and two currencies. No Momentum, side modes, timed events, loadouts, or extra material currencies are imported by the new game.
- Added independent Workshop save/recovery keys and writer lock, explicit cross-edition import rejection, a 24-hour offline cap, and a shared command/simulation core.
- Final checks pass: 82 unit tests (17 Workshop, 65 preserved Classic), 29 Chromium browser tests, shared-core JavaScript checks and 600 fresh-save progression simulations. Three five-minute visits daily complete Research in 3-4.33 modeled days; continuous schedules complete in 12.17-21.01 hours.
- Visually inspected desktop/mobile Production and Research screens and the develop-web-game client screenshots. Fixed early failed-image fallback, kept keyboard focus when upgrades move into the collapsed installed collection, and verified both editions under the dist/ subpath.
- Final results and assumptions are in BALANCE_REPORT.md; architecture, save separation and release instructions are in IMPLEMENTATION.md. Preview: http://127.0.0.1:5174/ and /classic/. No push or deployment. Remaining manual checks: real Safari/Firefox, device audio and browser UI zoom.

Reliability and expansion implementation (2026-09-20):
- Preserved the previously uncommitted modular build in commit 0b36d17 before edits.
- Implemented save v7 recovery/backup protection, explicit import/reset replacement, plain-text Chronicle rendering, challenge bootstrapping, gross-income construction accounting, permanent Acclaim/objectives, and corrected Rift comparison/reset reuse.
- Added shared commands and live/offline simulation, deterministic hooks, single-writer tabs, typed core checks, bounded numeric handling, stable Work controls and consolidated inline CSS.
- Added progressive automation, gated/rebalanced challenges, five-rank generator mastery with two specializations, two resource-gated Works, independent repeatable expeditions with capped power, three campaign chapters and optional pinned objectives.
- Added regression/browser tests, a dependency lockfile, fresh-save campaign policies, an explicit dist build and CI/manual Pages workflows. No remote push or deployment has occurred.
- Final verification (2026-09-21): 65 unit tests, 33 Chromium browser tests, shared-core type checks and all 300 fresh-save campaigns pass. Screenshots and the develop-web-game client output were inspected. Chapter Three is reached in 34.33-35 modeled days; see BALANCE_REPORT.md for 30/60/90-day results and limitations.
- Added permanent expedition cosmetic titles without additional production inflation. Remaining release checks: Safari/Firefox, real-device audio and production hosting configuration. No push or deployment performed.
- Implementation details, limitations, migration behavior and release instructions are in IMPLEMENTATION.md.

Notes:
- Implemented the first playable static Obsidian Clicker scaffold with vanilla HTML/CSS/JS.
- Uses `assets/obsidian-winds-logo.png` as the main clickable logo.
- Includes click income, passive generators, upgrade unlocks, floating click feedback, save/reset, event log, responsive layout, and test hooks.
- First Playwright smoke run confirmed the logo renders, clicking increases Shards, state JSON is emitted, and no console errors were produced.
- Tuned the logo focus style after screenshot review so mouse clicks do not leave a distracting default browser focus ring.
- Deeper Playwright scenario found store buttons detaching during rapid renders; generator and upgrade rendering now keeps button DOM nodes stable while updating their labels and disabled states.
- Final screenshot review led to a subtler logo focus glow instead of a large circular outline.
- Full verification passed for click income, generator purchase, passive income via `advanceTime`, upgrade purchase, save, reset, desktop screenshot, mobile screenshot, and console-error checks.

TODO:
- Synced the workspace to GitHub `main` at commit `a510655` on 2026-08-09; the original local prototype is preserved in the sibling backup folder `Obsidian Clicker Prototype Backup 2026-08-09`.
- Confirmed the expanded build exposes 16 generators, 174 upgrades, 11 Riftwork upgrades, Acclaim, offline progress, bulk buying, statistics, and Rift prestige.
- Browser verification covered fresh progression, legacy-save loading, passive income, bulk purchase state, upgrade purchase, offline gain, Rift reset, and Riftwork purchase.
- Important follow-up: consolidate runtime patch scripts and stop rebuilding generator/upgrade DOM every animation frame; this makes automated pointer targets unstable and will become increasingly expensive as content grows.
- Product and engineering priorities are documented in `ROADMAP.md`.

Phase 0 completion (2026-08-09):
- Replaced the runtime patch stack with `src/content.js`, `src/economy.js`, `src/persistence.js`, `src/ui.js`, and `src/app.js` while preserving the 16 generators, 174 upgrades, 11 Riftwork upgrades, Acclaim, bulk buying, offline progress, and Rift prestige.
- Removed all 12 superseded top-level JavaScript patch files after verifying there were no remaining references.
- Added a version 2 save envelope, legacy migration, state sanitation, derived upgrade modifiers, save export/import, accurate save timestamps, a 12-hour offline cap, and a return summary dialog.
- Reworked store rendering so generator, upgrade, and Riftwork controls keep stable DOM nodes; live numeric display updates are limited to 10 Hz.
- Added eight Node tests covering content shape, batch/Max pricing, upgrade effects and prerequisites, offline caps, a 24-hour numerical simulation, Rift conversion, corrupt-value sanitation, and save migration/round trips.
- Final Playwright verification passed five browser scenarios: fresh click/purchase/passive income; legacy migration/bulk buying/upgrade purchase; 20-hour absence capped at 12 hours; Rift/Riftwork/export/import/reset; and mobile stacking without overflow.
- The required `develop-web-game` client was rerun after final cleanup; state output was correct and no console errors were produced. Screenshots were visually inspected at fresh, midgame, and mobile states.

Next:
- Begin Phase 1 with upgrade filters and a purchased-upgrade collection, then add next-discovery guidance.
- Build a reusable headless progression simulator before any economy rebalance.

Phase 1 completion (2026-08-11):
- Added `src/progression.js` as the shared home for upgrade categories, grouped generator milestones, next-discovery selection, and before/after purchase calculations.
- Added a sticky economy dock showing current Shards, production, and the selected bulk-buy amount while scrolling the store.
- Added a persistent discovery panel for the next generator, nearest locked upgrade, nearest Acclaim milestone, and next Rift Echo threshold.
- Added Available, Purchased, Generator, Click, Global, and Rift upgrade views. Purchased upgrades remain visible, and the 160 generator milestones are organized into 16 collapsible building groups.
- Generator cards now show total production before and after the selected purchase. Upgrade details show passive and click values before and after purchase.
- Expanded Statistics into This Run, Lifetime, Bests, and Rift record views.
- Advanced saves to version 3 with current-run Shards/start time, best completed run, last Rift duration, and fastest Rift duration; earlier saves continue to migrate through sanitation.
- Added six progression tests, bringing the Node suite to 14 passing tests. Coverage now includes discovery ordering, upgrade filters/groups, purchase previews, and Rift run records.
- Phase 1 Playwright coverage passed fresh discovery/sticky controls, all upgrade and record views, mature progression, and mobile layout without horizontal overflow.
- Re-ran the full Phase 0 browser regression matrix against save v3; all five scenarios passed with no console errors.
- Screenshot review covered fresh desktop, mature desktop, records, grouped generator upgrades on mobile, and the required game-client output. Fixed hidden purchased Buy buttons and tab clipping found during verification.

Next:
- Begin Phase 2 with accessibility/settings infrastructure, then implement Momentum.
- Add a headless active/idle progression simulator before tuning Momentum and event rewards.

Phase 2 completion (2026-08-11):
- Added `src/active-play.js` with anti-spam Momentum, grace/decay timing, critical gusts, three Wind Rift types, and Balanced/Active/Idle Attunements.
- Momentum builds fastest from clicks at least 280ms apart, doubles click power at 100%, waits 1.5 seconds before decaying, and never modifies idle production.
- Click power now receives a baseline 1% of passive production so active play remains relevant after automation. Critical gusts are fivefold clicks with chance scaling from 5% to 15% across the Momentum meter.
- Added Wind Rift targets that remain open for 12 seconds and reward a 20-second x3 click surge, a 30-second x2 production surge, or 60 seconds of passive production immediately. Temporary surges do not inflate offline credit.
- Added Balanced, Active, and Idle Attunements with click/passive/Momentum tradeoffs. Players select the next Attunement in the Rift menu; it applies only after entering the Rift.
- Added persistent reduced-motion, sound-effects, ambient-music, and haptic settings. Audio uses a small Web Audio engine and haptics use `navigator.vibrate` when available.
- Advanced saves to version 4. Momentum, active records, settings, current/pending Attunements, Rift events, and temporary effects sanitize and migrate with older saves.
- Added seven active-play tests, bringing the Node suite to 21 passing tests.
- Added `npm run simulate`; the five-minute midgame guardrail currently reports attentive play at 1.074x pure idle while leaving idle production intact.
- Phase 2 Playwright coverage passed Momentum/decay/critical behavior, all three Wind Rift rewards, settings/reduced motion, next-Rift Attunement application, and mobile target containment.
- Re-ran all Phase 0 and Phase 1 browser scenarios against save v4. All 12 combined scenarios passed with no console errors.
- Visual review covered fresh Momentum, an active Wind Rift, settings/Rift Attunement, reduced motion, and mobile. Changed the Rift pulse to animate glow instead of position so the target remains easy to click.

Next:
- Begin Phase 3 with a richer pre-Rift forecast and persisted run history.
- Design the Riftwork constellation around genuinely different Active, Idle, and Event builds rather than more flat multipliers.

Phase 3 completion (2026-08-11):
- Added `src/rift-strategy.js` with five strategy branches, ten permanent Aspects, two run loadout slots, sanitized ownership/loadouts, and a ten-run history schema.
- Added Active, Idle, Economy, Event, and Discovery branches to all 11 existing Riftwork upgrades without invalidating purchases.
- Added a pre-Rift forecast showing Echoes, Resonance, effective passive and click baselines, replay estimate, dissolved generators/upgrades, selected Attunement/Aspects, and a timing recommendation.
- Replaced the flat Riftwork list with a branch-based constellation. Echoes purchase permanent Riftwork and Aspects; unlocked Aspects can be equipped or removed for the next run.
- Added ten Aspect effects through shared rules: Momentum gain, critical chance, passive/offline output, generator discounts, conditional global output, event cadence/duration/rewards, early-run production, and opening click power.
- Aspect changes apply only after entering the Rift. Existing runs retain their active build until the next reset.
- Added run history capturing completion time, run Shards, peak passive production, Echoes earned, outgoing Attunement, and outgoing Aspects. The latest ten runs appear in the Rift Chronicle.
- Advanced saves to version 5 with migration and sanitation for Aspect ownership, pending/active loadouts, run peak production, and history.
- Added seven Rift strategy tests, bringing the Node suite to 28 passing tests.
- Extended `npm run simulate` with distinct build checks. The sample active build earns 11,965 Shards in five minutes versus 10,950 balanced idle; the idle build earns 13,140 and receives 236,520 Shards for one offline hour versus 131,400 ordinary.
- Phase 3 Playwright coverage passed permanent Aspect purchases, two-slot enforcement, forecast content, next-run activation, outgoing-build history, five branches, and ten-run mobile history.
- Re-ran every Phase 0-2 browser scenario against save v5. All 14 combined scenarios passed with no console errors.
- Visual review covered the mature forecast/loadout, constellation, post-Rift chronicle, fresh game, and long mobile menu without horizontal overflow.

Next:
- Begin Phase 4 by turning Acclaim milestones into a visible achievement system with rewards.
- Use the existing simulation infrastructure to budget the first Obsidian Work before adding a second reset layer.

Phase 4 completion (2026-08-11):
- Added `src/long-term.js` with 20 rewarded Acclaim achievements, a four-stage Blackglass Sanctum, three authored challenge runs, discovery Chronicle entries, and the first campaign capstone.
- Acclaim now grants production, critical-chance, project-efficiency, and Chronicle rewards. Rewards are derived from permanent achievement dates and cannot be claimed twice.
- The Sanctum diverts 0%, 25%, or 50% of passive and offline production into construction. Large offline returns can complete multiple stages, and its four rewards affect production, Wind Rift rewards, and offline gains.
- Quiet Storm disables click income, Single Voice limits purchases to Whisperers, and Fractured Tempo raises generator costs. Completing each challenge grants a permanent account-wide reward.
- Added the Enduring Storm menu with Acclaim, Sanctum, Challenges, and Chronicle views, plus a capstone requiring 15 achievements, all four Work stages, all three challenges, and five Rifts.
- Advanced saves to version 6 with migration and sanitation for achievements, projects, challenges, discoveries, Chronicle entries, and campaign completion.
- Added eight long-term tests, bringing the Node suite to 36 passing tests. Extended `npm run simulate` with a Sanctum pacing guardrail; the representative project completes in about 200.4 hours (8.3 days).
- Phase 4 Playwright coverage passed achievements/rewards, live and offline Work allocation, challenge restrictions/completion, Chronicle population, campaign completion, and mobile layout without horizontal overflow.
- Re-ran all Phase 0-3 browser scenarios against save v6. All 18 combined browser scenarios passed with no console errors, and the required game client emitted valid v6 state.
- Visual review covered a mature Chronicle, campaign-complete mobile Acclaim, and fresh desktop play. Goal tabs use a two-row mobile layout so all labels remain readable.

Next:
- Begin Phase 5 by defining the final Obsidian Winds naming and narrative vocabulary before replacing generic content names.
- Prototype generator iconography and ownership-driven logo-scene activity, then extend the existing Web Audio engine into an adaptive soundscape.

Phase 5 completion (2026-08-13):
- Added `src/identity.js` with a four-step contextual opening sequence and five-stage sigil evolution driven by lifetime Shards, Acclaim, Sanctum progress, and Rift entries.
- Added a distinct code-native sigil for every generator. Owned generator types appear as restrained orbiting voices around the logo, while the same marks make store tiers easier to scan.
- Renamed the remaining competition-era global upgrades to Glasshouse Circuit and Horizon Procession while preserving their existing IDs and save compatibility.
- Expanded the ambient Web Audio engine from a static two-note drone into four production-sensitive layers with dynamic volume/filter density and distinct purchase, objective, event, critical, and prestige accents.
- Added contextual first-run objectives for the first click, first Whisperer, first upgrade, and 1 Shard per second. The sequence disappears once complete and does not interrupt returning players.
- Added polite live-region announcements for objective changes and major purchases, visible focus treatment, `Space` logo activation, `M` menu toggle, `S` save, and `F` fullscreen toggle.
- Connected both saved reduced-motion preferences and operating-system motion preferences to the new scene animation. Mobile orbit radii and objective sizing remain contained at 390px.
- Added three identity tests, bringing the Node suite to 39 passing tests. Existing economy simulators remain unchanged and passing.
- Phase 5 browser coverage passed fresh objective progression, keyboard controls, announcements, generator marks, five-stage evolution, mature ownership voices, reduced motion, and mobile layout without horizontal overflow.
- Re-ran every Phase 0-4 browser scenario against the polished build. All 18 regression scenarios passed with no console errors, and the required game client emitted valid identity state.
- Visually inspected fresh desktop, mature Riftborne desktop, and mobile states. The objective remains compact, the orbit does not obscure the logo, and the game retains its dense operational layout.

Next:
- Treat the current build as a release candidate and run external fresh/returning-player tests before adding another progression system.
- Gather real pacing data for first automation, first Rift, challenge completion, Sanctum completion, and the campaign capstone; tune only against observed gaps.

Responsive cleanup (2026-08-18):
- Removed the visible On the Horizon / Next Discoveries panel, its UI renderer, and its dedicated CSS. Discovery calculations remain available to progression logic and `render_game_to_text()`.
- Audited mature-game layouts at 360x800, 390x844, 768x1024, 1024x768, 1100x800, 1101x800, 1280x800, 1366x768, 1920x1080, and 2560x1440.
- Moved the stacked-layout breakpoint from 900px to 1100px so landscape tablets no longer compress and clip the logo orbit. At 1101px and above, the two-column layout has enough room for the full scene.
- Fixed a generic card-grid override that allowed longer generator names to collide with their sigils. Desktop uses explicit icon/text/meta columns; phones place metadata on a clean second row.
- Every audited width matched the viewport exactly with no horizontal overflow or console errors. Visual inspection covered the smallest phone, landscape tablet, breakpoint transition, compact laptop, and ultrawide desktop.
- Final browser flow passed clicking, generator purchase, passive income, upgrade purchase, menu behavior, and mobile containment. All 39 unit tests and all three economy simulators pass.

Next:
- Continue release-candidate playtesting; the responsive surface is now verified from 360px phones through 2560px desktop displays.
