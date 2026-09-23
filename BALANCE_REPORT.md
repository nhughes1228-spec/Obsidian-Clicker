# Workshop Progression Report

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
