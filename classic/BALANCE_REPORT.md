# Campaign Balance Report

Verified September 21, 2026. Command: `npm run simulate:campaign -- 100 90`.
All 300 fresh-save campaigns passed the finite-number, first-Rift, campaign
completion, repeatable-endgame and alternative-activity gates.

## Model

Each of three purchasing policies ran seeds 1-100 for 90 days, with three
five-minute visits daily, eight hours apart. Every purchase, Rift, challenge,
Work and expedition uses legal commands. No completion totals are seeded.
Clicks occur once per second before the first Rift and once per ten seconds
afterward. Inexperienced shopping limits manual purchases and misses half the
events. Higher-level objective selection is shared across policies.

## Unlocks

| Policy | First generator | First upgrade | First Rift | Chapter One | Chapter Two | Chapter Three |
| --- | --- | --- | --- | --- | --- | --- |
| Greedy | 5-10 sec | 40-175 sec | 16-24 hr | 3.33-4 days | 6.33-6.67 days | 34.67-35 days |
| Inexperienced | 5-10 sec | 90-180 sec | 24 hr | 3.33 days | 6.67 days | 35 days |
| Lookahead | 5-10 sec | 30-70 sec | 16 hr | 4-5.01 days | 6-6.33 days | 34.33-34.67 days |

Observed later Rift intervals were 8-16 hours. Each required challenge was
complete by the next visit (8 hours after starting); this is an observation
interval, not a claim that completion took exactly eight hours. The final
chapter, not the preserved Chapter One capstone, is the 30-90-day target.

## 30/60/90-Day Snapshots

Ranges span all 100 seeds for each policy. Waits are the largest snapshot
estimate for the next purchase using current income, not a forecast of all
future bonuses. Snapshots are taken during the third visit on each stated day.

| Day | Policy | Mastery ranks / 80 | Expeditions completed | Maximum purchase wait |
| --- | --- | --- | --- | --- |
| 30 | Greedy | 68-70 | 84-85 | 1.86 hr |
| 30 | Inexperienced | 68-70 | 84 | 1.77 hr |
| 30 | Lookahead | 66-68 | 85-86 | 1.01 hr |
| 60 | Greedy | 77 | 174-175 | 3.99 hr |
| 60 | Inexperienced | 77 | 174 | 3.71 hr |
| 60 | Lookahead | 73-77 | 175-176 | 3.41 hr |
| 90 | Greedy | 79-80 | 264-265 | 4.92 hr |
| 90 | Inexperienced | 79-80 | 264 | 4.64 hr |
| 90 | Lookahead | 78-79 | 265-266 | 0.11 hr |

All runs had completed Chapters One and Two at day 30, and Chapter Three by
day 60. Main production, optional Rifts, mastery where incomplete and independent
expeditions provide alternatives. Tier-zero contracts remain available without
refresh currency, streaks or timed-event requirements.

## Interpretation And Remaining Work

- The longest gaps between *manual purchases* ranged up to 376 hours for greedy,
  368 for inexperienced and 600 for lookahead. Automated purchases continue
  during these gaps; they are not mandatory idle waits. Nevertheless, shopping
  becomes less central, making expedition and mastery decisions important.
- These policies demonstrate reachable campaigns, not that every build,
  arbitrary spending choice or missed-visit schedule is safe or enjoyable.
  Playtesting should measure decision variety and test alternative loadouts.
- Most mastery is earned by day 90. Repeatable contracts, tier records and
  cosmetic titles remain, but this is not infinite handcrafted content.
  Expedition power is capped and difficulty stops at tier 500; arbitrary-
  precision scaling is required before increasing that ceiling.
- The full machine-readable report is generated at
  `output/reliability/campaign-report.json`. It includes each seed's unlocks,
  reset intervals, challenge observations and snapshot alternatives. CI runs
  one seed per policy as a smoke gate; release balancing should rerun all 100.
- Browser verification covers Chromium, not real Safari/Firefox devices.
  The 200% case tests equivalent CSS reflow and device scaling, not browser UI
  zoom controls. Audio/device testing and production deployment remain separate.
