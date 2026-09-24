# Obsidian Clicker: Workshop Edition

## September 23 Pacing Release

The current local candidate eases equipment growth from 15% to 4% after 50
owned, discounts the first three equipment improvements and Casting Tool II,
and strengthens improvements at 100/150/200 owned for the earlier equipment.
Equipment goals use the same bulk-cost curve as purchases. There are no new
goals, currencies or systems. Existing ownership, upgrades and rewards remain.

All 900 active runs pass early/late purchase-opportunity checks and complete
the catalog, but finish in 1.34-4.01 days. The original 7-14-day gate remains
unchanged and fails. After reviewing the shorter completion range, the user
explicitly requested deployment. This publishes the shorter playable arc, not
a claim that the original duration gate passed. The independent Cloudflare
deployment is verified separately; the strict GitHub Pages gate is unchanged.

## September 22 Candidate Release

The user explicitly requested publication of the current build on September 22.
Functional checks pass, but the 7-14-day and meaningful-progress balance gates
do not. This is a playable candidate, not a balance-approved release. See
`BALANCE_REPORT.md`. Classic files and hosting origins remain unchanged.

`purchasePreview(state, command)` supplies total passive, click, and support
gains without mutation. The UI, simulation policies, and automatic purchasing
share it. Support is derived from current ownership, not stored or compounded.
The first six producers add 2% per 25 owned, capped at 200; applicable permanent
output modifications also improve that contribution.

`npm run simulate` runs the full 900 active saves plus 12 controls and exits
nonzero if a gate fails. `npm run simulate:quick` runs one seed per combination.
Raw per-session data and compact summaries are written under `output/workshop/`.
The strict simulation command and CI gates remain unchanged. GitHub Pages will
remain blocked by failing balance gates; the custom domain's independent
Cloudflare deployment must be verified separately.

## Play And Preserve

Run `npm ci`, then `npm start`. Workshop opens at `http://127.0.0.1:5174/`;
the previous game is preserved at `http://127.0.0.1:5174/classic/`.
The original logo is retained in both editions, with a text fallback if missing.
Use a static server rather than opening HTML directly: the game uses ES modules.

Workshop starts fresh. It uses `obsidian-clicker-workshop-v1`, save version 5,
and the `workshop` edition identifier. Classic retains its original
`obsidian-clicker-save-v1` save, recovery slots, and independent writer lock.
Neither edition imports the other's saves. Workshop does not read, clear,
convert, or overwrite Classic progress. As before, browser saves are tied to
the exact origin; changing hostname or port requires explicit export/import.

## The Game

The workshop cools volcanic material into obsidian. Obsidian is traded for
equipment; Research Points fund permanent improvements learned through rebuilds.
Upgrade Parts come exclusively from claimed goals and buy permanent equipment
modifications. They are not a material input or a conversion step.
There are no intermediate materials or dependencies between producer outputs.

- Eight producers, from Casting Tray through Volcano Forge, independently earn
  Obsidian. Ownership milestones 10/25/50/75/100/150/200 unlock seven output upgrades
  per producer. Five sequential Casting Tools improve clicks.
- Clicks award their derived amount every time. No timing bonus, cooldown,
  random critical hit, temporary event, or penalty for irregular clicking.
- Rebuild Workshop resets current Obsidian, equipment and ordinary upgrades.
  Permanent research, points, lifetime statistics, settings and completed
  introductory objectives remain. Parts, modifications, claimed goals, and
  best-ever ownership records also remain. Automation preference also remains.
- Three goal tracks show one goal each: lifetime production, best production
  rate, and best equipment ownership. Claiming replaces the goal with its next
  milestone. Equipment milestones are ordered by estimated purchase investment.
  There are 36 one-time milestones, not daily tasks or randomized rewards.
  Each collects a bundle from the retained 116-entry reward ledger. Already
  claimed rewards are subtracted; all 1,220 possible Parts remain available.
- Each producer has one five-level modification. Six improve their own output
  by 10% per level (50% maximum); Cooling Pump and Magma Well reduce their own
  purchase prices by 3% per level (15% maximum). Level costs are 5/10/20/35/50
  Parts. Effects are additive within the modification and multiply existing
  ordinary upgrades/research. There are no card duplicates or equipment slots.
- Research grants `floor(sqrt(lifetimeObsidian / 70000000))` points minus all
  previously awarded points. Spending does not reduce the lifetime ledger.
  Six single-purchase research improvements cost 32 RP in total. There are no
  branches, equipment slots or secondary prestige layers.
- Automatic Purchasing is optional and starts off. When enabled, it purchases
  the currently affordable producer with the shortest payback. It does not buy
  upgrades or research, and never rebuilds. It works offline as well as online.
- Momentum, Challenges, Expeditions, Mastery, Works, Attunements, Aspects,
  Acclaim and their currencies exist only in Classic, not Workshop state or
  imports. Research completion leaves ordinary production available; it does
  not unlock another campaign or promise endless new content.

All names, costs, effects and objectives are in `src/content.js`. The new root
modules do not import Classic code. Historical documentation and tools are
preserved under `classic/`; the root ROADMAP is marked historical.

## Core And Safety

`applyCommand(state, command)` owns clicks, purchases, rebuilds, automation and
settings. `deriveEconomy(state)` reports rates, click components and claimable
research. `advanceSimulation(state, ms, {offline})` credits production and
processes automatic purchases at affordability/unlock boundaries. `advanceTo`
uses the single saved timestamp to avoid duplicate elapsed time. Offline credit
is capped at 24 hours, with the timestamp consuming the entire absence.

The browser, unit tests and fresh-save simulator all use this core. The hooks
`render_game_to_text()` and `advanceTime(ms)` remain available. Positive test
advancement switches to a manual clock until reload/import/reset; zero is a
no-op and invalid durations throw without changing progression.

Save validation rejects unsupported versions, unrelated data, negative/nonfinite
numbers, oversized imports, fractional ownership, and inconsistent research
accounting. Parts must equal claimed goal rewards minus modification spending;
claimed goals require valid milestone records and unique IDs. Grouped milestones
do not invalidate previously claimed entries. Versions 1-4 migrate additively,
preserving the original raw save in recovery before writing version 5.
Historical equipment counts unavailable in version 1 start from current
ownership; lifetime output and best rate remain intact. Unknown item IDs and
imported strings never become UI markup.
Recovery retains a previous valid save and an explicitly replaced original.
Failed loads do not overwrite the original; keeping a recovered backup requires
confirmation. Failed writes leave progress exportable in memory.

Web Locks allow one writer per edition and origin. Other tabs are read-only and
receive save updates; reload after closing the writer to take ownership. Browsers
without Web Locks stay read-only instead of risking conflicting saves. Control
nodes persist between updates; installed upgrades collapse into a collection
with a keyboard-focus handoff. Hidden views are not rerendered.

Numbers use JavaScript Number, bounded at 1e150 with an explicit limit notice.
Counts and clocks are guarded; Research Points are capped at the safe integer
limit. This is not an arbitrary-precision or unlimited-duration economy.

## Verification And Release

Current local verification: 103 unit tests, 48 Chromium browser tests
and shared-core type checks pass. Screenshots cover 320-1920px,
landscape and zoom-equivalent reflow. The game-client screenshots were inspected.
The active progression matrix includes legal goal claims and modification
purchases. All 900 active runs pass meaningful-opportunity and first-rebuild
checks, but the 7-14-day duration gate still fails; see BALANCE_REPORT.md.
Publication of this new candidate remains blocked.

The current icon shelf uses nine locally bundled Lucide SVGs (license included
in `assets/icons/`). Hover or focus exposes upgrade details. Touch taps inspect;
the panel's Buy button confirms purchase. Price sorting and stable node ownership
are retained. The latest matrix covers the grouped goals, revised price curve,
all 900 active runs and 12 continuous/idle controls.

- `npm test`: Workshop regression tests plus all preserved Classic unit tests.
- `npm run check`: checked JavaScript for the shared core and content catalog.
- `npm run test:browser`: Chromium interaction, save isolation, corruption,
  accessibility, layout and Classic smoke tests. Screenshots: `output/workshop/`.
- `npm run simulate`: 900 active runs plus 12 continuous/idle controls.
- `npm run simulate:quick`: one seed per active combination plus controls.
- `npm run simulate:campaign -- 100`: equivalent full matrix; results and limitations
  are summarized in BALANCE_REPORT.md.
- `npm run simulate:legacy`: the archived Classic campaign smoke model.
- `npm run build`: copies only each edition's HTML, CSS, runtime modules and
  assets into `dist/`. Tests, source-control metadata, reports and tools are
  excluded. Both `/` and `/classic/` work under a project-relative base path.

The existing Cloudflare configuration targets `dist/`. The npm `prepare` hook
generates that directory during dependency installation, including Workers Builds.
GitHub Pages publishes the tested asset-only build on pushes to `main` or manual
dispatch, with GitHub Actions configured as its source. `release.json` identifies
the deployed commit, edition and save version for post-deployment verification.
Publishing is explicitly authorized by the user's deployment request; the
Cloudflare Worker and clicker.obsidianwinds.org remain the existing destination.

Real Safari/Firefox, mobile-device audio and actual browser UI zoom remain manual
release checks. Automated zoom coverage exercises equivalent CSS reflow, not the
browser's zoom controls. Simulations establish reachability under stated policies,
not guaranteed enjoyment or the duration of every possible player's game.
