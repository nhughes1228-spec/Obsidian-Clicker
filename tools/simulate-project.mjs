import { createFreshState, getPassiveRate } from "../src/economy.js";
import { getCurrentWork, investInWork } from "../src/long-term.js";

const state = createFreshState();
state.generatorCounts.whisperer = 100;
state.generatorCounts.galeLoom = 50;
state.generatorCounts.obsidianSpire = 25;
state.generatorCounts.stormVault = 10;
state.generatorCounts.forgeLine = 3;
state.projectAllocation = 0.25;

const startRate = getPassiveRate(state);
let elapsedSeconds = 0;
while (state.projectStage < getCurrentWork(state).stages.length && elapsedSeconds < 60 * 60 * 24 * 30) {
  investInWork(state, startRate * state.projectAllocation * 60);
  elapsedSeconds += 60;
}

const report = { startRate, allocation: state.projectAllocation, elapsedHours: elapsedSeconds / 3600, completedStages: state.completedWorkStages };
console.log(JSON.stringify(report, null, 2));
if (state.completedWorkStages !== 4 || report.elapsedHours < 24 || report.elapsedHours > 24 * 21) {
  throw new Error(`Sanctum pacing ${report.elapsedHours.toFixed(1)}h is outside the 1-21 day guardrail.`);
}
