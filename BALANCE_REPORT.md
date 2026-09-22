# Workshop Progression Report

## Current: Goal Rewards And Modifications

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
