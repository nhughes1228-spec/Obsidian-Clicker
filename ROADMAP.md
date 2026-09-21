# Obsidian Clicker Product and Engineering Roadmap

## Product Vision

Obsidian Clicker should become a long-form idle game that feels unmistakably connected to Obsidian Winds: precise, dramatic, musical, and slightly otherworldly. The player should always have a near-term decision, a medium-term discovery, and a long-term transformation to anticipate.

The target experience has three complementary play styles:

- **Active:** clicking, timing short events, and maintaining momentum meaningfully accelerates progress.
- **Idle:** generators, offline production, and automation make reliable progress without constant attention.
- **Strategic:** build choices, Rift timing, and permanent upgrades create distinct runs instead of a single solved purchase order.

Target progression horizons:

- First automation within 30-60 seconds.
- A meaningful unlock every 3-10 minutes during the first hour.
- First Rift after roughly 4-8 active hours or 1-2 days of mixed play.
- A materially different second run completed in 30-60 minutes.
- New systems unfolding across 2-4 weeks before the first major capstone.

## Current Baseline

The GitHub `main` build already contains a substantial game:

- 16 generator tiers and 174 generated/expanded upgrades.
- Bulk generator purchases (`1x`, `10x`, `50x`, and `Max`).
- Rift prestige with Echoes, Resonance, and 11 permanent Riftwork upgrades.
- Offline production, statistics, Acclaim milestones, progressive generator visibility, and large-number formatting.
- Responsive Obsidian Winds visual styling and deterministic browser-test hooks.

The main constraints are structural rather than a shortage of raw content:

- Six loaded scripts patch and replace shared global functions at runtime; several older patch scripts remain in the repository but are no longer loaded.
- Generator and upgrade cards are rebuilt every animation frame, creating avoidable work and unstable pointer targets for automated testing.
- The late-game store becomes an extremely long vertical list with weak grouping, filtering, and purchase history.
- Most upgrades are multiplicative production increases, so quantity grows faster than decision variety.
- Save data has no explicit schema version or migration pipeline.
- There is no economy simulator or balancing test suite, making long progression curves difficult to tune safely.

## Phase 0: Consolidate and Stabilize

**Status: Complete (2026-08-09).** The patch stack has been replaced by explicit content, economy, persistence, UI, and application modules. Legacy saves migrate through an explicit versioned envelope; offline progress is capped at 12 hours; export/import and deterministic tests are in place; interactive store nodes remain stable between updates.

**Goal:** preserve all current behavior while replacing the patch stack with a maintainable game core.

- Consolidate loaded behavior from `main.js`, `upgrade-expansion.js`, `balance-patch.js`, `store-controls.js`, `generator-batch-price.js`, and `heartbeat.js` into explicit modules for content, economy, persistence, progression, and UI.
- Remove or archive superseded patch files after confirming their behavior is either integrated or intentionally discarded.
- Stop rendering the store every animation frame. Update numeric counters on a restrained interval and rerender lists only when affordability, ownership, unlocks, or purchase mode changes.
- Add a versioned save envelope, validation, migrations, corruption fallback, and export/import.
- Recompute derived multipliers from purchased upgrade IDs instead of trusting serialized multiplier values.
- Cap offline progress initially at 12 hours and show a return summary before applying it.
- Add unit tests for generator cost sums, `Max` purchases, upgrade prerequisites, multiplier composition, Rift rewards, offline gains, and save migration.

**Exit criteria:** existing prototype saves load correctly; all current systems pass deterministic browser tests; no interactive element is replaced continuously; a 24-hour simulated run remains numerically valid.

## Phase 1: Make Progress Legible

**Status: Complete (2026-08-11).** The store now includes sticky economy controls, next-discovery guidance, before/after purchase values, six upgrade views, compact purchased history, collapsible generator milestone groups, a Riftwork collection, and four record views. Save version 3 adds current-run and completed-run records while preserving migration from earlier saves.

**Goal:** help players understand what happened, what matters now, and what comes next.

- Replace the single upgrade column with tabs or filters for Available, Purchased, Generator, Click, Global, and Rift upgrades.
- Group generator upgrades beneath their generator and collapse completed groups.
- Add a persistent next-discovery panel with the next generator, upgrade milestone, Acclaim milestone, and Rift threshold.
- Show purchased upgrades in a compact collection rather than making them disappear.
- Add production breakdowns and clear before/after values to every purchase.
- Keep currency, production, and the selected buy amount visible while scrolling on desktop and mobile.
- Convert Statistics into a full record screen with current run, lifetime, best-run, and prestige sections.

**Exit criteria:** a late-game player can identify the best next action and the next major unlock without scanning the full page.

## Phase 2: Add an Active Play Loop

**Status: Complete (2026-08-11).** Deliberate clicks now build anti-spam Momentum, critical gusts create rare fivefold strikes, and baseline click power scales from passive production. Short-lived Wind Rifts grant click surges, production surges, or passive-production bounties. Balanced, Active, and Idle Attunements apply at the next Rift, while reduced-motion, sound, music, and haptic preferences persist in save version 4.

**Goal:** make interacting with the logo valuable throughout the game without demanding endless tapping.

- Add a Momentum meter that builds from deliberate clicks and decays gently.
- Scale click value partly from passive production so active play remains relevant after automation begins.
- Add occasional Wind Rifts: short-lived targets that grant temporary production, click, discount, or offline-capacity effects.
- Add critical gusts and visual/audio feedback that intensifies with Momentum.
- Introduce active, idle, and balanced Attunements with meaningful tradeoffs; allow changing Attunement at a Rift.
- Add reduced-motion, sound, music, and haptic settings from the start of this phase.

**Exit criteria:** five minutes of attentive play is observably stronger than five minutes idle, while idle progress remains satisfying and no optimal strategy requires constant clicking.

## Phase 3: Deepen the Rift

**Status: Complete (2026-08-11).** The Rift now forecasts Echo rewards, effective passive/click baselines, replay time, and dissolved resources. Riftwork is organized into five visible branches alongside ten permanent Aspects. Players unlock Aspects with Echoes and equip up to two for the next run, creating distinct Active, Idle, Economy, Event, and Discovery builds. The last ten completed runs record duration, Shards, peak production, Echoes, Attunement, and Aspects in save version 5.

**Goal:** make prestige a strategic transformation rather than a flat reset bonus.

- Replace the linear Riftwork shop with a visible constellation containing Active, Idle, Economy, Event, and Discovery branches.
- Add mutually exclusive or limited-slot Riftwork choices that produce distinct run builds.
- Give the pre-Rift screen a projected replay time, production improvement, lost resources, and recommended threshold.
- Add run modifiers unlocked by Resonance, such as faster early tiers, altered event behavior, generator specialization, or restricted challenge runs.
- Add permanent quality-of-life unlocks: automatic early upgrades, configurable bulk buying, event assistance, and increased offline cap.
- Preserve a compact run history with duration, peak production, Echoes earned, and chosen Attunement.

**Exit criteria:** two sensible Rift builds play differently, and the first five Rifts each unlock a new capability rather than only a percentage increase.

## Phase 4: Create Long-Term Goals

**Status: Complete (2026-08-11).** Acclaim is now a 20-entry achievement collection with progress and permanent rewards. The four-stage Blackglass Sanctum converts configurable shares of passive/offline production into multi-day construction, three authored challenge runs grant permanent bonuses, and the Chronicle records achievements, discoveries, projects, challenges, and the campaign capstone. Save version 6 preserves and sanitizes all long-term state.

**Goal:** sustain discovery for weeks without relying only on larger numbers.

- Turn Acclaim milestones into visible achievements with categories, progress, and select cosmetic or mechanical rewards.
- Add multi-stage Obsidian Works: long projects that consume production over time and unlock new mechanics, visual states, or story fragments.
- Introduce a second major reset only after the Rift loop is mature; it should reorganize the economy rather than simply multiply it.
- Add challenge runs with authored constraints and one-time permanent rewards.
- Add a codex/chronicle for generator lore, Rift discoveries, records, and unlocked logo treatments.
- Add a clear first capstone that marks completion of the initial campaign while leaving endless and challenge play available.

**Exit criteria:** the game has meaningful objectives at session, day, week, and campaign scales.

## Phase 5: Obsidian Winds Identity and Polish

**Status: Complete (2026-08-13).** Every generator now carries a distinct sigil in the store and an ownership-driven voice around the central logo. The logo evolves through five permanent visual states, first-run objectives guide the opening loop contextually, and the ambient Web Audio mix gains layers as production grows. Competition-era labels were replaced without changing save IDs, while live announcements, keyboard shortcuts, visible focus, reduced-motion support, and mobile containment complete the accessibility pass.

**Goal:** make the experience memorable beyond its economy.

- Replace remaining generic and competition-themed upgrade names with a coherent Obsidian Winds vocabulary and narrative progression.
- Give generator tiers distinct iconography and subtle visual activity in the main scene as ownership grows.
- Add layered logo evolution tied to lifetime production, Acclaim, and Rift count.
- Create an adaptive soundscape whose density grows with production and whose accents respond to clicks, purchases, events, and Rifts.
- Add first-run onboarding through contextual objectives rather than a separate tutorial wall.
- Complete keyboard navigation, visible focus, contrast, screen-reader status announcements, reduced motion, and touch-target review.

**Exit criteria:** screenshots, sound, terminology, and interaction feel specific to this game and remain readable on desktop and mobile.

## Balancing and Validation

- Build a headless economy simulator from the same content definitions used by the game.
- Model idle, casual, and active players and report time to every generator, upgrade tier, Rift, and permanent unlock.
- Track expected payback time and production share so obsolete generators regain value through synergies rather than disappearing permanently.
- Define pacing budgets before adding content; every new mechanic must serve a target gap in the progression curve.
- Maintain automated scenarios for fresh start, legacy migration, offline return, all bulk-buy modes, upgrade purchase, Rift preview/reset, Riftwork purchase, mobile layout, and multi-day simulation.
- Visually inspect fresh, midgame, first-Rift, and mature-Rift screenshots after every major UI change.

## Recommended Next Milestone

The six-phase implementation roadmap is complete. The next milestone should be **Release Candidate Playtesting**, in this order:

1. Run fresh, active, idle, and returning-player sessions with external testers and record where expectations diverge from the interface.
2. Measure real time to first automation, upgrade, Rift, completed challenge, Sanctum stage, and campaign capstone against the pacing targets above.
3. Review the complete Obsidian Winds vocabulary with the project owner and make any final lore or naming changes as one save-compatible content pass.
4. Tune reward values only after playtest evidence identifies a specific pacing gap; preserve simulator guardrails with every adjustment.
5. Prepare a release checklist covering save backups, deployment, browser/device coverage, audio consent behavior, and regression results.

New systems should wait until playtesting shows a real retention or clarity need. The current build already spans session, run, day, week, and campaign horizons.
