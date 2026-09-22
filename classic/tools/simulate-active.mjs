import { registerActiveClick, updateActivePlay } from "../src/active-play.js";
import { createFreshState, getClickPower, getPassiveRate } from "../src/economy.js";

const DURATION_SECONDS = 5 * 60;

function seedState() {
  const state = createFreshState();
  state.generatorCounts.whisperer = 25;
  state.generatorCounts.galeLoom = 10;
  state.generatorCounts.obsidianSpire = 3;
  return state;
}

function simulate({ clickEverySeconds = 0 }) {
  const state = seedState();
  let gained = 0;
  let clickTimer = 0;
  let clockMs = 1_000;
  for (let second = 0; second < DURATION_SECONDS; second += 1) {
    updateActivePlay(state, 1, () => 1);
    gained += getPassiveRate(state);
    if (clickEverySeconds > 0) {
      clickTimer += 1;
      if (clickTimer >= clickEverySeconds) {
        clickTimer = 0;
        clockMs += clickEverySeconds * 1000;
        const click = registerActiveClick(state, clockMs, () => 1);
        gained += getClickPower(state) * click.multiplier;
      }
    }
  }
  return { gained, finalMomentum: state.momentum };
}

const idle = simulate({});
const attentive = simulate({ clickEverySeconds: 1 });
const advantage = attentive.gained / idle.gained;

console.log(JSON.stringify({ durationSeconds: DURATION_SECONDS, idle, attentive, activeAdvantage: advantage }, null, 2));
if (!(advantage > 1.05 && advantage < 2.5)) {
  throw new Error(`Active advantage ${advantage.toFixed(3)} is outside the 1.05x-2.5x pacing guardrail.`);
}
