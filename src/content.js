export const EDITION = "workshop";
export const SAVE_VERSION = 6;
export const SAVE_KEY = "obsidian-clicker-workshop-v1";
export const LOCK_KEY = "obsidian-clicker-workshop-writer";
export const BALANCE = {
  costGrowth: 1.15,
  bulkGrowth: 1.04,
  bulkThreshold: 50,
  researchThreshold: 7e7,
  knowledgePerRootPoint: 0.01,
  offlineSeconds: 86400,
  maxNumber: 1e150,
  maxOwned: 10000,
  supportBatch: 25,
  supportPerBatch: 0.02,
  supportCap: 200,
};
export function equipmentCostUnits(owned, amount) {
  const early = Math.min(amount, Math.max(0, BALANCE.bulkThreshold - owned));
  const bulk = amount - early;
  const series = (growth, start, count) =>
    count ? growth ** start * (growth ** count - 1) / (growth - 1) : 0;
  return series(BALANCE.costGrowth, owned, early) +
    BALANCE.costGrowth ** BALANCE.bulkThreshold *
      series(BALANCE.bulkGrowth, Math.max(0, owned - BALANCE.bulkThreshold), bulk);
}
export const PRODUCERS = [
  {
    id: "tray",
    name: "Casting Tray",
    description: "Cools small batches of volcanic glass.",
    cost: 15,
    rate: 0.3,
  },
  {
    id: "rack",
    name: "Cooling Rack",
    description: "Cools several trays at once.",
    cost: 100,
    rate: 3,
  },
  {
    id: "pump",
    name: "Cooling Pump",
    description: "Circulates water for faster cooling.",
    cost: 1500,
    rate: 32,
  },
  {
    id: "furnace",
    name: "Furnace",
    description: "Melts volcanic rock for a steady supply of glass.",
    cost: 12000,
    rate: 188,
  },
  {
    id: "line",
    name: "Casting Line",
    description: "Pours and cools glass in a continuous process.",
    cost: 130000,
    rate: 1040,
  },
  {
    id: "foundry",
    name: "Obsidian Foundry",
    description: "Brings melting, casting, and cooling under one roof.",
    cost: 1.5e6,
    rate: 8800,
  },
  {
    id: "well",
    name: "Magma Well",
    description: "Draws molten rock directly from deep underground.",
    cost: 1e7,
    rate: 60000,
  },
  {
    id: "forge",
    name: "Volcano Forge",
    description:
      "Channels a volcano through an enormous enchanted cooling chamber.",
    cost: 1e8,
    rate: 400000,
  },
];
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
const MILESTONES = [10, 25, 50, 75, 100, 150, 200];
export const SUPPORT_PRODUCERS = PRODUCERS.slice(0, 6).map((p) => p.id);
export const IMPROVEMENTS = [10, 25, 50, 100, 200].flatMap((owned, tier) =>
  PRODUCERS.map((p) => ({
    id: `${p.id}-${tier}`,
    name: `${p.name} Improvement ${ROMAN[MILESTONES.indexOf(owned)]}`,
    producer: p.id,
    owned,
    cost: p.cost * [37.5, 375, 3750, 50000, 5000000][tier],
    multiplier: 2,
  })),
);
// Keep the original five IDs intact when inserting intermediate milestones.
IMPROVEMENTS.push(
  ...[75, 150].flatMap((owned, i) =>
    PRODUCERS.map((p) => ({
      id: `${p.id}-m${owned}`,
      name: `${p.name} Improvement ${ROMAN[MILESTONES.indexOf(owned)]}`,
      producer: p.id,
      owned,
      cost: p.cost * [15000, 500000][i],
      multiplier: 2,
    })),
  ),
);
IMPROVEMENTS.sort((a, b) => a.owned - b.owned);
// Late improvements let simple equipment remain useful beside larger facilities.
const LATE_IMPROVEMENT_MULTIPLIERS = [24, 16, 10, 7, 5, 4, 3, 2];
for (const upgrade of IMPROVEMENTS)
  if (upgrade.owned >= 100)
    upgrade.multiplier = LATE_IMPROVEMENT_MULTIPLIERS[
      PRODUCERS.findIndex((p) => p.id === upgrade.producer)
    ];
export const TOOLS = [
  { cost: 25, base: 4, share: 0.01 },
  { cost: 1875, base: 3, share: 0.01 },
  { cost: 50000, base: 5, share: 0.02 },
  { cost: 1e6, base: 10, share: 0.03 },
  { cost: 2e7, base: 30, share: 0.03 },
].map((tool, tier) => ({
  ...tool,
  id: `tool-${tier}`,
  name: `Casting Tool ${ROMAN[tier]}`,
  requires: tier ? `tool-${tier - 1}` : null,
}));
export const UPGRADES = [...TOOLS, ...IMPROVEMENTS];
/** @type {Array<{id: string, name: string, cost: number, description: string, track?: string, category?: string, requires?: string, effect?: string, amount?: number, producer?: string}>} */
export const RESEARCH = [
  {
    id: "casting",
    name: "Improved Casting",
    cost: 1,
    description: "Click output +100%.",
  },
  {
    id: "equipment",
    name: "Efficient Equipment",
    cost: 2,
    description: "Producer output +25%.",
  },
  {
    id: "purchasing",
    name: "Better Purchasing",
    cost: 3,
    description: "Producer prices reduced by 10%.",
  },
  {
    id: "starter",
    name: "Workshop Starter Kit",
    cost: 5,
    description: "Start each rebuild with 10 Casting Trays.",
  },
  {
    id: "automatic",
    name: "Automatic Purchasing",
    cost: 8,
    description: "Unlock optional automatic producer purchasing.",
  },
  {
    id: "cooling",
    name: "Advanced Cooling",
    cost: 13,
    description: "Producer output +50%.",
  },
];
export const RESEARCH_CATEGORIES = [
  { id: "all", name: "All research" },
  { id: "workshop", name: "Workshop" },
  { id: "equipment", name: "Equipment" },
  { id: "rebuilding", name: "Rebuilding" },
];
const researchTracks = [
  { id: "workshop-output", name: "Production Planning", category: "workshop", requires: "equipment", effect: "output", amounts: [0.05, 0.1, 0.15, 0.2], costs: [4, 16, 64, 256], describe: (n) => `Workshop production +${Math.round(n * 100)}%.` },
  { id: "casting-practice", name: "Casting Practice", category: "workshop", requires: "casting", effect: "click", amounts: [0.05, 0.1, 0.15, 0.2], costs: [3, 12, 48, 192], describe: (n) => `Click output +${Math.round(n * 100)}%.` },
  { id: "procurement", name: "Equipment Procurement", category: "workshop", requires: "purchasing", effect: "discount", amounts: [0.02, 0.02, 0.02, 0.02], costs: [5, 20, 80, 320], describe: () => "Equipment discount +2 percentage points, after Better Purchasing." },
  { id: "starting-trays", name: "Prepared Casting Trays", category: "rebuilding", requires: "starter", effect: "starter", producer: "tray", amounts: [5, 10, 15, 20], costs: [4, 16, 64, 256], describe: (n) => `Start each rebuild with ${n} additional Casting Trays.` },
  { id: "starting-racks", name: "Prepared Cooling Racks", category: "rebuilding", requires: "starter", effect: "starter", producer: "rack", amounts: [1, 2, 3, 4], costs: [6, 24, 96, 384], describe: (n) => `Start each rebuild with ${n} additional Cooling Racks.` },
];
for (const track of researchTracks)
  track.amounts.forEach((amount, tier) => RESEARCH.push({
    id: `${track.id}-${tier}`, track: track.id, category: track.category,
    name: `${track.name} ${ROMAN[tier]}`, cost: track.costs[tier],
    requires: tier ? `${track.id}-${tier - 1}` : track.requires,
    effect: track.effect, amount, producer: track.producer,
    description: track.describe(amount),
  }));
for (const [index, producer] of PRODUCERS.entries())
  [3 + index, 12 + index * 3, 45 + index * 8, 150 + index * 20].forEach((cost, tier) => RESEARCH.push({
    id: `research-${producer.id}-${tier}`, track: `research-${producer.id}`,
    category: "equipment", name: `${producer.name} Research ${ROMAN[tier]}`,
    cost, requires: tier ? `research-${producer.id}-${tier - 1}` : "equipment",
    effect: "producer", producer: producer.id, amount: 0.25,
    description: `${producer.name} production +25%.`,
  }));
export const OBJECTIVES = [
  {
    id: "produce",
    text: "Produce your first Obsidian",
    target: 1,
    value: (s) => s.lifetimeObsidian,
  },
  {
    id: "producer",
    text: "Buy a Casting Tray",
    target: 1,
    value: (s) => s.producers.tray,
  },
  {
    id: "upgrade",
    text: "Buy your first upgrade",
    target: 1,
    value: (s) => s.upgrades.length,
  },
  {
    id: "output",
    text: "Reach 10 Obsidian per second",
    target: 10,
    value: (_s, economy) => economy.passiveRate,
  },
];

export const MODIFICATION_COSTS = [5, 10, 20, 35, 50];
export const MODIFICATIONS = PRODUCERS.map((p) => ({
  id: p.id,
  name: `${p.name} Modification`,
  producer: p.id,
  effect: ["pump", "well"].includes(p.id) ? "price" : "output",
  perLevel: ["pump", "well"].includes(p.id) ? 0.03 : 0.1,
}));
export const GOAL_LANES = ["production", "output", "equipment"];
export const GOALS = [
  ...Array.from({ length: 12 }, (_, tier) => ({
    id: `production-${tier}`,
    lane: "production",
    target: 100 * 10 ** tier,
    reward: 5 + tier * 3,
    producer: null,
  })),
  ...Array.from({ length: 12 }, (_, tier) => ({
    id: `output-${tier}`,
    lane: "output",
    target: 10 ** tier,
    reward: 5 + tier * 3,
    producer: null,
  })),
  ...[1, 10, 25, 50, 100, 200]
    .flatMap((target, tier) =>
      PRODUCERS.map((p) => ({
        id: `equipment-${p.id}-${tier}`,
        lane: "equipment",
        producer: p.id,
        target,
        reward: 5 + tier * 3,
      })),
    )
    .sort((a, b) => {
      const cost = (g) =>
        PRODUCERS.find((p) => p.id === g.producer).cost *
          equipmentCostUnits(0, g.target);
      return cost(a) - cost(b);
    }),
];
export const LEGACY_GOAL_IDS = GOALS.map((g) => g.id);
GOALS.push(
  ...["production", "output"].flatMap((lane) =>
    Array.from({ length: 11 }, (_, tier) =>
      [2, 5].map((step) => ({
        id: `${lane}-${tier}-step${step}`,
        lane,
        producer: null,
        target: (lane === "production" ? 100 : 1) * 10 ** tier * step,
        reward: 1 + Math.floor(tier / 3),
      })),
    ).flat(),
  ),
);
GOALS.sort(
  (a, b) =>
    GOAL_LANES.indexOf(a.lane) - GOAL_LANES.indexOf(b.lane) ||
    (a.lane !== "equipment" ? a.target - b.target : 0),
);

// Keep the original reward ledger intact; fewer milestones collect its entries
// together. Old claims are deducted from each bundle, never awarded twice.
export const GOAL_MILESTONES = [
  ...[1, 3, 5, 7, 9, 11].map((tier) =>
    GOALS.find((g) => g.id === `production-${tier}`),
  ),
  ...[2, 4, 6, 8, 9, 11].map((tier) =>
    GOALS.find((g) => g.id === `output-${tier}`),
  ),
  ...GOALS.filter(
    (g) => g.lane === "equipment" && [10, 100, 200].includes(g.target),
  ),
].map((anchor) => ({
  ...anchor,
  id: `milestone-${anchor.id}`,
  members: GOALS.filter(
    (g) =>
      g.lane === anchor.lane &&
      g.producer === anchor.producer &&
      g.target <= anchor.target,
  ).map((g) => g.id),
}));

export const UPGRADE_ICONS = {
  tray: "rectangle-horizontal",
  rack: "layers",
  pump: "fan",
  furnace: "flame",
  line: "cog",
  foundry: "factory",
  well: "drill",
  forge: "mountain",
  tool: "mouse-pointer-2",
};
