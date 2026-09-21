import { registerActiveClick, updateActivePlay } from "../src/active-play.js";
import { createFreshState, getClickPower, getOfflineProgress, getPassiveRate } from "../src/economy.js";

function seed(aspects) {
  const state = createFreshState();
  state.generatorCounts.whisperer = 25;
  state.generatorCounts.galeLoom = 10;
  state.generatorCounts.obsidianSpire = 3;
  state.activeAspects = aspects;
  return state;
}

function run(aspects, active) {
  const state = seed(aspects);
  let shards = 0;
  let now = 1000;
  for (let second = 0; second < 300; second += 1) {
    updateActivePlay(state, 1, () => 1);
    shards += getPassiveRate(state);
    if (active) {
      now += 1000;
      const click = registerActiveClick(state, now, () => 1);
      shards += getClickPower(state) * click.multiplier;
    }
  }
  return shards;
}

const report = {
  balancedIdle: run([], false),
  activeBuild: run(["tempoGlass", "clearHorizon"], true),
  idleBuild: run(["deepReservoir", "longMemory"], false),
  idleBuildOfflineHour: getOfflineProgress(seed(["deepReservoir", "longMemory"]), 3600).gain,
  ordinaryOfflineHour: getOfflineProgress(seed([]), 3600).gain,
};
console.log(JSON.stringify(report, null, 2));
if (!(report.activeBuild > report.balancedIdle && report.idleBuild > report.balancedIdle && report.idleBuildOfflineHour > report.ordinaryOfflineHour)) {
  throw new Error("Rift Aspect builds did not produce distinct advantages.");
}
