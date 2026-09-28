# Workshop Progression Report

## September 27: Expanded Research (Local)

The shop now contains 58 permanent purchases costing 4,478 RP. Existing six
purchases, prices and rewards are unchanged. Earned RP also grants a production
bonus of `0.01 * sqrt(researchAwarded)`; spending never reduces it. Applied once
to equipment output, it also benefits production-based clicks through that rate.

Fresh matrix: `npm run simulate`, 900 active runs (100 seeds for each click-rate
and strategy combination) plus 12 controls. All 900 finish all 58 research
purchases, all eight producers and all 40 modifications. First rebuild remains
session 2. Early opportunity gaps max out at 120 seconds, late gaps at 190 seconds.
Elapsed completion ranges from 4.673 to 17.009 days, using 11-25 rebuilds. The
unchanged 7-14-day gate fails, so the command still exits nonzero. This is not a
claim that every old balance target is met.

The expanded shop requires a revised modeled research policy: buy the cheapest
unlocked item, wait to recover the previous workshop's rate, then after 32 RP
earned bank at least 25% additional lifetime-awarded RP before rebuilding. This
is a simulator choice, not a cooldown or requirement imposed on players.
`simulate({rebuildFraction: 0})` provides an immediate-funding comparison. That
comparison left the three greedy seed-1 runs incomplete after 21 days: repeatedly
resetting for individual purchases remains a poor strategy, not a progress lock.
Results are not directly comparable to the old catalog-order, immediate-reset
six-item model. Raw sessions now record research count, balance and awarded RP.

Six continuous controls finish in 12.55-16.69 hours. Three greedy controls reach
49/51/53 research purchases but are censored at 24 hours; do not call them complete.
The three idle-only controls still intentionally never rebuild or buy research,
so they do not complete it. No forced idle wait or additional currency was added.

Verification: 110 unit tests, 54 browser tests, checked JavaScript and asset build
pass. Save v6 preserves v1-v5 progress and recovery copies. Screenshots cover
Research at 320/390/768/1024/1440/1920 widths, filters, tier purchases and focus.
Classic is untouched. This expansion has not been pushed or deployed.

## September 23: Stalls Repaired, Duration Still Below Target

Release note: after reviewing these results, the user explicitly requested
deployment on September 23. The pre-release hold described below is superseded
by that request. Measurements and the original strict duration gate are unchanged.

Local candidate, not deployed. `npm run simulate` ran 100 seeds per combination
of 5/7.5/10 clicks per second and all three existing strategies: 900 active runs,
plus nine continuous controls and three idle controls. The policies, shopping
pauses, clocks, completion definition and strict gate thresholds are unchanged.

Changes: price growth stays at 15% until 50 owned, then becomes 4%; the first
three equipment improvements and Casting Tool II cost 25% less. Improvements
at 100/150/200 owned now grant x24/x16/x10/x7/x5/x4/x3/x2 for Tray through Forge.
These stronger late upgrades keep cheaper equipment productive. Equipment goals
are sorted using the same cumulative bulk price calculation as purchases.
No new goals or reward entries were added. Existing output is never reduced.

### Current Results

| Clicks/s | Strategy | Completion days | Active minutes | Worst early / late opportunity gap |
| --- | --- | --- | --- | --- |
| 5 | Affordable payback | 4.00-4.01 | 186.7-189.0 | 120s / 20s |
| 5 | Saving/lookahead | 1.34-2.01 | 66.8-103.2 | 15s / 10s |
| 5 | Inexpensive bulk | 2.67-3.00 | 121.3-139.1 | 65s / 90s |
| 7.5 | Affordable payback | 3.33-3.67 | 151.8-166.8 | 120s / 10s |
| 7.5 | Saving/lookahead | 1.67 | 85.3-85.8 | 15s / 5s |
| 7.5 | Inexpensive bulk | 2.67 | 122.3-125.0 | 65s / 20s |
| 10 | Affordable payback | 3.00-3.34 | 137.7-152.7 | 70s / 5s |
| 10 | Saving/lookahead | 1.67 | 81.5-81.7 | 10s / 5s |
| 10 | Inexpensive bulk | 2.67 | 121.8-124.4 | 60s / 20s |

All 900 complete all equipment, Research and 40 modification levels. First
rebuild is session 2 in every run. First producer takes 10-25 active seconds;
first upgrade takes 5 seconds. First-visit claims remain 6-10, not the former
33-46. Observed rebuild recovery spans 400-1,380 active seconds. Raw reports
retain elapsed times separately, so overnight income is not counted as clicking.

The longest late gap without an affordable meaningful purchase/sequence is now
90 seconds, versus 900 in the deployed candidate's nine-run diagnostic. Early
gaps max out at the unchanged 120-second limit. This measures *available*
opportunities, not guaranteed human choices: the longest realized progress gap
is 575 seconds. The shortest useful affordable option can differ from the
simulated policy's choice. Strategy sensitivity has improved but remains real.

Producer first-purchase ranges in elapsed hours: Tray 0.003-0.007, Rack
0.003-0.028, Pump 0.013-0.103, Furnace 0.042-0.201, Line 0.093-16.035,
Foundry 0.157-24.074, Well 0.225-48.126, Forge 8.229-64.203. Milestone dates,
support contributions, direct production shares and goal dates are retained
for every run in `output/workshop/active-progression-100.json`.

All nine continuous controls complete in 1.95-4.89 hours. The three idle-only
controls do not complete Research because that control deliberately never
rebuilds; their 900-second gaps are reported, not counted as active-play success.
First-visit clicking contributes 10-39% of earned active income depending on
strategy. Fully upgraded clicking still adds 100%/200% to passive production at
5/10 clicks per second, excluding the small flat click amount.

**One original acceptance gate still fails:** the campaign takes 1.34-4.01 days,
not 7-14. `npm run simulate` intentionally still exits nonzero. The user has
been asked whether to accept the shorter steady arc or add more ordinary
upgrade content to support the longer target. No gate was relaxed, no artificial
waiting requirement was added, and this candidate has not been published.

Save v5 retains v1-v4 progress and the original recovery copy. Verification:
103 unit tests, 48 browser tests, checked JavaScript and public-asset build pass.
The reports below are historical and do not describe this candidate.

## New Goal Cadence: Local Follow-Up

The newer local candidate consolidates 116 claims into 36 milestones while
retaining the underlying reward ledger and 1,220 total Parts. The quick
nine-policy/rate diagnostic now records 6-10 claims during the first 15-minute
visit, versus 33-46 in the corresponding earlier seed. Production and output
tracks each have six milestones; equipment has three per producer (10/100/200).
Earlier claimed entries are deducted from each larger reward.

All nine quick runs reach all 40 modification levels, but completion varies
from 4.33 to 18.33 days and late gaps remain 900 seconds. These are one-seed
diagnostics, not a replacement for the previous 900-run benchmark. The broad
economy release gates still fail; no deployment has been made. The detailed
matrix below is historical for the pre-consolidation candidate, not validation
of the current goal cadence.

## Active-Play Candidate: Release Blocked

September 22, 2026. This is a local, unreleased candidate. Functional correctness
does not establish good pacing. Do not deploy while the simulation gates fail.

### Implemented Mechanics

- Base production: Tray 0.3/s, Rack 3/s, Pump 32/s, Furnace 188/s,
  Line 1,040/s, Foundry 8,800/s, Well 60,000/s, Forge 400,000/s.
- Pump base price 1,500 and Foundry 1.5 million; other base prices unchanged.
  Cost growth remains 1.15. No already-owned producer loses output.
- First six producers add 2% workshop support per 25 owned, capped at 200.
  Contributions add, never recursively compound. Output modifications improve
  both direct production and their own support contribution.
- Existing ordinary upgrade IDs remain; new upgrades at 75 and 150 double
  output. Casting Tools cumulatively add 1/2/4/7/10% of passive output per click.
  Improved Casting doubles that to 2/4/8/14/20%, plus the upgraded click base.
- 116 goals now award 1,220 Parts in total. All 40 modification levels still
  cost 960 Parts. Existing rewards, claims and permanent purchases are retained.

### Reproducible Model

Run `npm run simulate`: 100 seeds for each of three click rates (5, 7.5, 10/s)
and three purchasing strategies. Each active session lasts 900 seconds; visits
start eight hours apart. Successful shopping removes 0.3-1 second of clicking.
The final clock advances in five-second steps. All income, purchases, claims,
modifications, research, rebuilding and offline processing use the shared core.

Greedy buys best affordable payback. Saving considers equipment-plus-milestone
bundles and can wait for them. Inexpensive prefers cheap batches of ten or visible
upgrades and sometimes skips shopping. Automation defaults off, as in the game.
Research is bought in catalog order whenever a rebuild can fund the next item.
These are diagnostic policies, not exhaustive optimal play or measured humans.

Completion requires all eight producers purchased, all six Research purchases,
and all 40 modification levels. A small purchase is not automatically meaningful.
The harness records cumulative 5% income improvements, first producer purchases,
rebuilds and modifications. Separately, it checks affordable purchases and
sequences for a 5% improvement, including milestone lookahead. This bounded
counterfactual search is conservative, not an exhaustive solver.

Raw results: `output/workshop/active-progression-100.json`.
Compact ranges: `output/workshop/active-summary-100.json`.
Every run includes observed producer unlocks/purchases, ordinary milestone dates,
goal claim dates, rebuild recovery, per-session equipment shares, support,
click income, passive income, and both realized and opportunity gaps. Offline
discoveries are timestamped at the next visit, not claimed as exact unlock times.
Rebuild recovery uses active and elapsed clocks; null means recovery was not
observed before a subsequent rebuild or the end of the run.

There are also nine continuous-play controls, each observed for 24 hours, and
three idle controls observed for 21 days. Idle controls use 15 bootstrap clicks
to buy the first Tray, then never click or rebuild; otherwise a pre-Starter-Kit
reset would leave a zero-income workshop. They are production controls, not
evidence of fully idle Research completion. Continuous noncompletion at 24 hours
is a censored result, not proof of an impossible campaign.

### Remaining Balance Blockers

Final matrix, 100 seeds in every row. Time ranges are elapsed days and cumulative
active minutes, never substituted for each other.

| Clicks/s | Policy | Completion days | Active minutes | Longest late opportunity gap (seconds) |
| --- | --- | --- | --- | --- |
| 5 | Affordable payback | 6.00-6.33 | 270-285 | 900 |
| 5 | Saving/lookahead | 4.67 | 210 | 895 |
| 5 | Inexpensive bulk | 5.33-8.67 | 240-391 | 895-900 |
| 7.5 | Affordable payback | 5.00-5.67 | 225-255 | 900 |
| 7.5 | Saving/lookahead | 4.00 | 180 | 870-880 |
| 7.5 | Inexpensive bulk | 5.33-8.00 | 240-361 | 900 |
| 10 | Affordable payback | 4.33-5.00 | 195-225 | 900 |
| 10 | Saving/lookahead | 4.33 | 195 | 875 |
| 10 | Inexpensive bulk | 5.67-8.00 | 255-364 | 900 |

First producer: 10-25 active seconds. First upgrade: 5 active seconds.
First rebuild: session 2 in all 900 runs, eight elapsed hours and 15 active
minutes after starting. Research ends in 0.67-3.34 elapsed days. Observed rebuild
recovery ranges from 315 to 1,785 active seconds; some are censored by another
rebuild. Only 243/900 runs satisfy the full 7-14-day arc. Four runs exceed the
early 120-second opportunity limit; all 900 exceed the late 300-second limit.
All nine 24-hour continuous controls reach 39/40 modification levels, but do
not complete the arc in that observation window.

The revised prices put the first rebuild in session two in the full active
matrix. Every active run reaches all equipment, Research and modifications.
However, completion is too early for most policies, and late opportunities still
have gaps approaching a full 15-minute session. The release command deliberately
returns a failing exit code. Functional test success must not override it.

Sensitivity experiments with growth 1.10-1.15, milestone multipliers 2-4 and
smaller intermediate rewards did not meet all targets together. Gentler costs
and larger multipliers often compressed completion into roughly 1-3 days;
smaller goal rewards could instead extend the final modification wait past
19 days. Those experimental constants were not retained.

Next tuning must address *where* rewards and gains occur, not merely total Parts
or overall duration: distribute affordable milestone opportunities into the
late sessions; reduce the penalty for affordable/bulk strategies; prove funding
without the hardest legacy goals; and rerun the full matrix. No additional
currency, timer, side mode, click gimmick, or offline nerf has been introduced
to hide these failures. Current results do not prove these targets impossible;
they prove this candidate has not met them.

## Historical: Goal Rewards And Modifications

September 21, 2026: 600 fresh saves, three policies x two schedules x 100 seeds.
The shared-core simulator now claims every completed active goal and buys an
affordable modification each decision. Greedy/saving favor equipment contributing
the most current output; inexpensive favors the lowest Parts cost. This is a
simple allocation policy, not an exhaustive optimizer. All purchases use commands.

| Short-visit policy | First goal + modification | First rebuild | Research complete | Modification levels bought at Research completion |
| --- | --- | --- | --- | --- |
| Greedy | 20-25 seconds | 16 hours | 3-4 days | 23 |
| Saving | 20-25 seconds | 16 hours | 1.67-2 days | 22-24 |
| Inexpensive | 20-30 seconds | 24 hours | 3.67 days | 27 |

All producers and Research are reached in every run. First ordinary upgrades
arrive in 45-120 seconds for short visits. Longest sampled affordability wait
for any ordinary purchase remains at most 180 seconds; a specific goal can take
much longer. Continuous Research completion is 15.17-15.33 hours (greedy),
9.42-9.58 hours (saving), and 16.42-16.50 hours (inexpensive).

**Pacing tradeoff:** optimized saving now beats the previous 3-7-day target.
Goal investments change purchasing paths as well as rates, so duration is not
proportional to bonus size. Base prices and Research accounting remain unchanged;
new rewards are not canceled by inflating existing costs. The seven-day ceiling,
early-game timing and completion gates remain enforced. The original 3-7-day
target remains explicitly reported as `originalThreeToSevenDayTarget: false`.
This is a changed pacing outcome, not proof that the original minimum passed.

There are 72 fixed goals awarding 1116 Parts; all 40 modification levels cost 960.
Output bonuses cap at +50% and price reductions at 15%, per affected producer.
Research completion is **not** completion of all goals or modifications. The
simulation stops at Research plus all eight producers; it does not establish the
time needed for the final goals. Tests verify complete reward funding and rank
caps, not a legal full-goal campaign. Late-goal cadence needs actual playtesting.

Results live in `output/workshop/progression.json`; the report includes first
claims/modifications, claimed goal totals, modification level totals and the
previous timing fields. UI tests additionally cover claim -> spend -> rebuild ->
reload and ensure modifications and claimed goals remain permanent.

## Baseline Before Goal Rewards

The following measurements are historical, before the new reward system.
Verified September 21, 2026 using the earlier `npm run simulate:campaign -- 100`.
All 600 fresh-save runs pass the early-purchase, early-upgrade, first-rebuild,
complete-producer-range and Research completion gates. Previous campaign results
belong to Classic and are preserved in `classic/BALANCE_REPORT.md`.

## Model

Three shopping policies, each with 100 deterministic input seeds, run under two
schedules. Short visits are three five-minute sessions per day, eight hours apart.
Continuous play makes decisions throughout elapsed time. Before the first rebuild,
each five-second step supplies 3-5 legal clicks; afterward it supplies 0-1.

Greedy buys the best affordable payback; saving waits for the best payback;
inexpensive buys the cheapest option and skips 15% of shopping decisions. Up to
eight sequential legal purchases occur per decision. Research is bought in catalog
order, with rebuilds when the next purchase can be funded. Automation is enabled
when purchased. No balances, producer ownership or completion totals are seeded.

This model tests different shopping behavior, not every research order or click
speed. Decision resolution is five seconds. Offline unlocks are observed at the
next visit, not reported as exact timestamps within an absence.

## Short Visits

| Policy | First producer | First upgrade | First rebuild | All research | Final producer first purchased |
| --- | --- | --- | --- | --- | --- |
| Greedy | 20-25 sec | 60-115 sec | 24 hr | 3.33 days | 72.01 hr |
| Saving | 20-25 sec | 45-55 sec | 16 hr | 3-3.33 days | 32.06-56.09 hr |
| Inexpensive | 20-30 sec | 95-125 sec | 24 hr | 4-4.33 days | 96 hr |

These results meet the several-day target without inserting cooldowns or required
idle waits. The longest sampled wait to afford *any* purchase was three minutes.
Waiting for a particular expensive upgrade can take longer, especially under the
saving policy. Long gaps between manual purchases also include time between visits
and automatic buying; they are not claims that production stopped.

## Producer Discovery

Ranges across all 300 short-visit runs, in hours from a fresh save. Discovery means
the purchase prerequisite was met, not that the player immediately bought it.

| Producer | Discovery observed | First purchase |
| --- | --- | --- |
| Casting Tray | Available immediately | 0.006-0.009 hr |
| Cooling Rack | 0.017-0.032 hr | 0.021-0.073 hr |
| Cooling Pump | 0.053-8 hr | 0.079-8.013 hr |
| Furnace | 8 hr | 8.002-16.005 hr |
| Casting Line | 8-8.031 hr | 8.007-16.021 hr |
| Obsidian Foundry | 8-16 hr | 8.003-48.014 hr |
| Magma Well | 16 hr | 16.012-80.024 hr |
| Volcano Forge | 16-24 hr | 32.052-96 hr |

## Continuous Play

| Policy | First rebuild | All research | Final producer first purchased |
| --- | --- | --- | --- |
| Greedy | 1.42 hr | 20.08-20.26 hr | 9.03-9.17 hr |
| Saving | 0.59 hr | 12.17-12.26 hr | 1.37-1.43 hr |
| Inexpensive | 1.51 hr | 20.92-21.01 hr | 9.65-9.77 hr |

Continuous play is intentionally faster than the short-visit target. More intense
clicking, different research priorities or more frequent visits can change these
results. Research ends after six improvements; continued equipment growth is
available, but this edition makes no months-long content promise.

The generated `output/workshop/progression.json` contains every seed's producer
discoveries and purchases, research purchases, first rebuild, completion time,
longest sampled affordability wait and manual purchase gap. CI uses one seed per
policy/schedule; balancing releases should rerun the full 100-seed matrix.
