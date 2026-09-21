# Reliability and Expansion Build

## Local Preview

Run `npm ci`, then `npm start`. The default address is `http://127.0.0.1:5174`.
Port 5173 is currently occupied by another project and has not been changed.
Browser saves are origin-specific: this preview does not share storage with a
different port, hostname, or the published game. Use Export/Import when moving
progress. The production save key and asset URLs are unchanged.

## Architecture

- `src/core.js` owns progression commands and elapsed-time simulation.
  `applyCommand(state, command, context)` returns an `ok` result and mutates only
  the supplied game. `advanceSimulation(state, elapsedMs, context)` supports live
  and capped offline intervals; `advanceTo` prevents re-crediting timestamps.
  `deriveEconomy` and purchase previews share the same underlying equations.
- Context accepts an injected clock and RNG. Time slices stop at construction,
  mastery, achievement, automation and live-event boundaries. Offline production
  has a 12-hour cap; temporary effects age through the entire absence.
- Account progression is created by the mastery, long-term and Rift modules.
  Rift conversion explicitly preserves account fields and resets run fields.
  UI selection/focus state stays in the browser adapter, outside saved progress.
- Browser controls use the command interface. Web Locks elect one writer per
  origin. Secondary tabs show read-only state and receive storage updates;
  closing the writer and reloading allows another tab to take ownership.
- Checked JavaScript covers the shared core and its imported economy modules.
  The existing DOM adapter has not been converted to TypeScript.

## Save Safety

Save version 7 retains the existing localStorage key. Legacy flat saves and
versions 1-6 receive additive defaults, achievement/objective reconciliation,
and repairs for completed construction and no-income Quiet Storm saves.
Newer versions and unrelated JSON are rejected instead of silently downgraded.

The `:backup` slot stores the previous valid revision. The `:recovery` slot
preserves the pre-migration or explicitly replaced payload. A failed load may
recover the backup, but automatic writes remain disabled until an explicit
Keep Recovered Backup, Import or Reset action. Storage failures leave progress playable in memory and expose
an export/recovery notice; successful writes alone advance the saved timestamp.
Imports are limited to 2 MB and imported Chronicle text is never interpreted as
HTML. These are bounded recovery slots, not an unlimited version archive.

## Progression

- Rifts 1, 2 and 3 unlock generator purchasing, known-upgrade repurchasing and
  25% Work allocation automation. Controls include a reserve and generator target.
- Quiet Storm starts with a Whisperer. Challenges unlock at Rifts 1-3; Single
  Voice targets 1M and Fractured Tempo targets 10M. Existing completed challenges
  retain their rewards. Crossing the Rift during a challenge is disabled.
- Every generator has five permanent mastery ranks. Production trains mastery
  at a normalized, capped rate, online and offline. Focus improves its generator;
  Chorus supports other generators. Pending choices apply freely at a Rift.
- The Sanctum remains Chapter One content. Hall of Voices and Wayfarer
  Observatory each have four stages requiring both Shards and earned materials.
- Independent expedition crews inherit the dispatched mastery/Attunement/Aspect
  loadout, never the main inventory. They purchase through the shared core,
  progress offline and can be abandoned without losing the main run. Three
  offers include an always-available tier-zero recovery option.
- Expedition power rewards cap at ten per template. Materials, higher-tier
  records, permanent cosmetic titles and repeated completions remain available. Tier 500 is an explicit
  numeric ceiling; arbitrary-precision or unbounded difficulty is not enabled.
- Chapter Two requires Chapter One, 15 mastery ranks, 15 expeditions and two Hall
  stages. Chapter Three requires 40 ranks, 100 expeditions and all eight new Work
  stages. Existing Chapter One completion is never revoked.
- The Horizon section remains removed. A player can pin one optional objective.
  Estimates use the stated current rate; Rift rebuild time is reported as
  unmeasured rather than extrapolated from an unrelated run.

## Verification

Final local results: 65 unit tests, 33 Chromium browser tests and 300 fresh-save
campaigns pass. See `BALANCE_REPORT.md` for the measured progression ranges and
their limits. CI includes a one-seed-per-policy campaign smoke gate.

`npm test` runs unit/regression checks. `npm run check` checks the shared core.
`npm run test:browser` runs real Chromium tests with an isolated temporary server.
`npm run simulate` runs one 90-day seed per purchasing policy. The full acceptance
sweep is `npm run simulate:campaign -- 100 90`.

The simulator starts with a fresh save and uses legal game commands. Each day
has three five-minute visits, eight hours apart. Players click once per second
before the first Rift, then once per ten seconds while managing automation.
Greedy, lookahead and inexpensive-purchase policies differ in shopping decisions;
their challenge/Work/expedition choices are shared. This is a reproducible pacing
model, not evidence for every possible player strategy or missed-session pattern.

The generated `output/reliability/campaign-report.json` contains unlock dates,
challenge durations, Rift intervals and 30/60/90-day snapshots with next-purchase
waits and alternative activities. `longestManualPurchaseGapHours` is explicitly
a gap between manual purchases, not a claim that production or automation stopped.

Browser coverage includes six widths from 320 to 1920, fresh/mature/challenge/
capstone states, landscape, 200%-equivalent reflow (720 CSS pixels at 2x device
scale), keyboard focus, imported markup, reset cancellation and simultaneous tabs.
Screenshots are under `output/reliability/`. Real Safari/Firefox and device audio
behavior remain additional release checks; the browser suite currently uses Chromium.

## Release

`npm run build` publishes only `index.html`, `style.css`, `src/` and `assets/`
into `dist/`. Cloudflare's existing asset configuration now points to that directory.
The manual GitHub Pages workflow also uploads only `dist/`; it retains the existing
project URL. Before using that workflow, select GitHub Actions as the repository's
Pages source instead of branch-root publishing. Do not publish the repository root.

No GitHub push, Pages configuration change, or deployment is performed merely by
running this local build. The reviewed pre-change game is preserved in checkpoint
commit `0b36d17` on `codex/reliability-progression-expansion`.
