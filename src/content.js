export const EDITION = "workshop";
export const SAVE_VERSION = 2;
export const SAVE_KEY = "obsidian-clicker-workshop-v1";
export const LOCK_KEY = "obsidian-clicker-workshop-writer";
export const BALANCE = {
  costGrowth: 1.15,
  researchThreshold: 7e7,
  offlineSeconds: 86400,
  maxNumber: 1e150,
  maxOwned: 10000,
};
export const PRODUCERS = [
  {
    id: "tray",
    name: "Casting Tray",
    description: "Cools small batches of volcanic glass.",
    cost: 15,
    rate: 0.1,
  },
  {
    id: "rack",
    name: "Cooling Rack",
    description: "Cools several trays at once.",
    cost: 100,
    rate: 1,
  },
  {
    id: "pump",
    name: "Cooling Pump",
    description: "Circulates water for faster cooling.",
    cost: 1100,
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
    cost: 1e6,
    rate: 8800,
  },
  {
    id: "well",
    name: "Magma Well",
    description: "Draws molten rock directly from deep underground.",
    cost: 1e7,
    rate: 15000,
  },
  {
    id: "forge",
    name: "Volcano Forge",
    description:
      "Channels a volcano through an enormous enchanted cooling chamber.",
    cost: 1e8,
    rate: 100000,
  },
];
const ROMAN = ["I", "II", "III", "IV", "V"];
export const IMPROVEMENTS = [10, 25, 50, 100, 200].flatMap((owned, tier) =>
  PRODUCERS.map((p) => ({
    id: `${p.id}-${tier}`,
    name: `${p.name} Improvement ${ROMAN[tier]}`,
    producer: p.id,
    owned,
    cost: p.cost * [50, 500, 5000, 50000, 5000000][tier],
    multiplier: 2,
  })),
);
export const TOOLS = [
  { cost: 25, base: 4, share: 0 },
  { cost: 2500, base: 3, share: 0 },
  { cost: 50000, base: 5, share: 0.005 },
  { cost: 1e6, base: 10, share: 0.005 },
  { cost: 2e7, base: 30, share: 0.01 },
].map((tool, tier) => ({
  ...tool,
  id: `tool-${tier}`,
  name: `Casting Tool ${ROMAN[tier]}`,
  requires: tier ? `tool-${tier - 1}` : null,
}));
export const UPGRADES = [...TOOLS, ...IMPROVEMENTS];
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
        (PRODUCERS.find((p) => p.id === g.producer).cost *
          (BALANCE.costGrowth ** g.target - 1)) /
        (BALANCE.costGrowth - 1);
      return cost(a) - cost(b);
    }),
];
