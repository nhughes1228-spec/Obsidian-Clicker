import { BALANCE, PRODUCERS, RESEARCH } from "./content.js";
const researchById = new Map(RESEARCH.map((r) => [r.id, r]));
const discountResearch = RESEARCH.filter((r) => r.effect === "discount");

export function researchDiscount(state) {
  return discountResearch.reduce((sum, r) => sum + (state.research.includes(r.id) ? r.amount : 0), 0);
}

export function researchUnlocked(state, research) {
  return !research.requires || state.research.includes(research.requires);
}

// Each line adds its bonuses, then independent categories multiply once.
export function researchBenefits(state) {
  const benefits = {
    knowledgeBonus: BALANCE.knowledgePerRootPoint * Math.sqrt(state.researchAwarded),
    output: 0,
    click: 0,
    discount: 0,
    producers: Object.fromEntries(PRODUCERS.map((p) => [p.id, 0])),
    starters: Object.fromEntries(PRODUCERS.map((p) => [p.id,
      p.id === "tray" && state.research.includes("starter") ? 10 : 0])),
  };
  for (const id of state.research) {
    const r = researchById.get(id);
    if (!r) continue;
    if (r.effect === "producer") benefits.producers[r.producer] += r.amount;
    else if (r.effect === "starter") benefits.starters[r.producer] += r.amount;
    else if (r.effect === "output" || r.effect === "click" || r.effect === "discount")
      benefits[r.effect] += r.amount;
  }
  return benefits;
}
