export const SAVE_KEY = "obsidian-clicker-save-v1";
export const HEARTBEAT_KEY = "obsidian-clicker-active-heartbeat-v1";
export const SAVE_VERSION = 6;
export const COST_GROWTH = 1.15;
export const RIFT_BASE_SHARDS = 100_000_000;
export const OFFLINE_CAP_SECONDS = 12 * 60 * 60;
export const MIN_OFFLINE_SECONDS = 5;

export const GENERATORS = [
  { id: "whisperer", icon: "breath", name: "Whisperer", description: "Coaxes loose Shards from the edge of the wind.", baseCost: 15, baseRate: 0.1 },
  { id: "galeLoom", icon: "weave", name: "Gale Loom", description: "Threads pressure into a steady obsidian draft.", baseCost: 100, baseRate: 1 },
  { id: "obsidianSpire", icon: "spire", name: "Obsidian Spire", description: "Anchors the storm and draws Shards through the mark.", baseCost: 1100, baseRate: 8 },
  { id: "stormVault", icon: "vault", name: "Storm Vault", description: "Stores a violent weather front behind black glass.", baseCost: 12000, baseRate: 47 },
  { id: "forgeLine", icon: "forge", name: "Forge Line", description: "Cuts raw obsidian into a repeatable production ritual.", baseCost: 130000, baseRate: 260 },
  { id: "shardTreasury", icon: "facet", name: "Shard Treasury", description: "Compounds every glimmer into a carefully guarded reserve.", baseCost: 1400000, baseRate: 1400 },
  { id: "obsidianShrine", icon: "shrine", name: "Obsidian Shrine", description: "Turns discipline, breath, and ceremony into Shards.", baseCost: 20000000, baseRate: 7800 },
  { id: "windOracle", icon: "eye", name: "Wind Oracle", description: "Reads the pressure changes before they become real.", baseCost: 330000000, baseRate: 44000 },
  { id: "riftCaravan", icon: "passage", name: "Rift Caravan", description: "Imports black glass from storms too distant to name.", baseCost: 5100000000, baseRate: 260000 },
  { id: "glassCrucible", icon: "crucible", name: "Glass Crucible", description: "Boils silence into shine and pressure into profit.", baseCost: 75000000000, baseRate: 1600000 },
  { id: "blackglassPortal", icon: "portal", name: "Blackglass Portal", description: "Opens a clean passage through the atmosphere.", baseCost: 1000000000000, baseRate: 10000000 },
  { id: "echoChronometer", icon: "clock", name: "Echo Chronometer", description: "Collects Shards a few seconds before they should exist.", baseCost: 14000000000000, baseRate: 65000000 },
  { id: "nullCondenser", icon: "null", name: "Null Condenser", description: "Condenses absence itself into something spendable.", baseCost: 170000000000000, baseRate: 430000000 },
  { id: "midnightPrism", icon: "prism", name: "Midnight Prism", description: "Splits one beam of darkness into a thousand clean edges.", baseCost: 2100000000000000, baseRate: 2900000000 },
  { id: "chanceReed", icon: "reed", name: "Chance Reed", description: "Bends probability until good fortune sings.", baseCost: 26000000000000000, baseRate: 21000000000 },
  { id: "fractalScore", icon: "score", name: "Fractal Score", description: "Repeats the same phrase forever, somehow larger every time.", baseCost: 310000000000000000, baseRate: 150000000000 },
];

const BUILDING_TIERS = [
  { milestone: 1, costMultiplier: 10, namePrefix: "Polished", description: "work twice as quickly." },
  { milestone: 5, costMultiplier: 50, namePrefix: "Tempered", description: "find a stronger rhythm and double again." },
  { milestone: 10, costMultiplier: 100, namePrefix: "Refined", description: "settle into a stronger groove and double production." },
  { milestone: 25, costMultiplier: 500, namePrefix: "Honed", description: "lock into a cleaner current and double again." },
  { milestone: 50, costMultiplier: 5000, namePrefix: "Radiant", description: "resonate across the whole stockpile and double again." },
  { milestone: 100, costMultiplier: 50000, namePrefix: "Mythic", description: "become a permanent engine of the storm and double again." },
  { milestone: 150, costMultiplier: 500000, namePrefix: "Ascendant", description: "pull sound from the far side of the storm and double production." },
  { milestone: 200, costMultiplier: 5000000, namePrefix: "Eclipsed", description: "work under a perfect black sun and double production." },
  { milestone: 250, costMultiplier: 50000000, namePrefix: "Transcendent", description: "turn repetition into ritual and double production." },
  { milestone: 300, costMultiplier: 500000000, namePrefix: "Infinite", description: "echo through the whole design and double production." },
];

const CLICK_UPGRADES = [
  { id: "sharperSigil", name: "Sharper Sigil", description: "Manual clicks carve twice as deeply.", cost: 100, unlock: { type: "lifetimeShards", amount: 50 }, effect: { type: "clickMultiplier", value: 2 } },
  { id: "echoingPalm", name: "Echoing Palm", description: "Each tap leaves a second pressure wave.", cost: 500, unlock: { type: "lifetimeShards", amount: 250 }, effect: { type: "clickMultiplier", value: 2 } },
  { id: "resonantTouch", name: "Resonant Touch", description: "Clicks borrow a small pulse from your passive production.", cost: 10000, unlock: { type: "passiveRate", amount: 25 }, effect: { type: "clickCpsPercent", value: 0.01 } },
  { id: "conductedPressure", name: "Conducted Pressure", description: "Clicks borrow even more force from the whole ensemble.", cost: 100000, unlock: { type: "passiveRate", amount: 250 }, effect: { type: "clickCpsPercent", value: 0.01 } },
  { id: "obsidianKnuckles", name: "Obsidian Knuckles", description: "Clicks borrow 2% more force from your passive production.", cost: 1000000, unlock: { type: "passiveRate", amount: 1000 }, effect: { type: "clickCpsPercent", value: 0.02 } },
  { id: "thunderousGrip", name: "Thunderous Grip", description: "Manual clicks strike three times harder.", cost: 100000000, unlock: { type: "passiveRate", amount: 10000 }, effect: { type: "clickMultiplier", value: 3 } },
  { id: "conductorsStrike", name: "Conductor's Strike", description: "Clicks borrow another 3% of your passive production.", cost: 10000000000, unlock: { type: "passiveRate", amount: 100000 }, effect: { type: "clickCpsPercent", value: 0.03 } },
  { id: "geomagneticGesture", name: "Geomagnetic Gesture", description: "Manual clicks cut five times deeper through the storm.", cost: 10000000000000, unlock: { type: "passiveRate", amount: 1000000 }, effect: { type: "clickMultiplier", value: 5 } },
  { id: "stormhandTechnique", name: "Stormhand Technique", description: "Clicks borrow another 5% of your passive production.", cost: 1000000000000000, unlock: { type: "passiveRate", amount: 10000000 }, effect: { type: "clickCpsPercent", value: 0.05 } },
];

const GLOBAL_UPGRADES = [
  { id: "stormCanon", name: "Storm Canon", description: "A common language for the whole ensemble. All Shard production +10%.", cost: 5000, unlock: { type: "lifetimeShards", amount: 2500 }, effect: { type: "globalMultiplier", value: 1.1 } },
  { id: "blackglassChorus", name: "Blackglass Chorus", description: "Every engine learns to breathe together. All Shard production +15%.", cost: 50000, unlock: { type: "lifetimeShards", amount: 25000 }, effect: { type: "globalMultiplier", value: 1.15 } },
  { id: "indoorCircuit", name: "Glasshouse Circuit", description: "Pressure travels a flawless circuit through black glass. All Shard production +20%.", cost: 500000, unlock: { type: "lifetimeShards", amount: 250000 }, effect: { type: "globalMultiplier", value: 1.2 } },
  { id: "worldFinalsRun", name: "Horizon Procession", description: "The whole ensemble advances beneath a widening storm. All Shard production +25%.", cost: 5000000, unlock: { type: "lifetimeShards", amount: 2500000 }, effect: { type: "globalMultiplier", value: 1.25 } },
  { id: "grandFinale", name: "Grand Finale", description: "The whole storm resolves at once. All Shard production +30%.", cost: 50000000, unlock: { type: "lifetimeShards", amount: 25000000 }, effect: { type: "globalMultiplier", value: 1.3 } },
];

const BUILDING_UPGRADES = GENERATORS.flatMap((generator) =>
  BUILDING_TIERS.map((tier) => ({
    id: `${generator.id}-${tier.milestone}`,
    name: `${tier.namePrefix} ${generator.name}`,
    description: `${generator.name}s ${tier.description}`,
    cost: Math.ceil(generator.baseCost * tier.costMultiplier),
    unlock: { type: "generatorOwned", generatorId: generator.id, amount: tier.milestone },
    effect: { type: "generatorMultiplier", generatorId: generator.id, value: 2 },
  })),
);

export const UPGRADES = [...CLICK_UPGRADES, ...GLOBAL_UPGRADES, ...BUILDING_UPGRADES]
  .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));

export const RIFTWORK = [
  { id: "blackglassConductance", branch: "economy", name: "Blackglass Conductance", description: "All Shard production is permanently increased by 5%.", cost: 1, tag: "All +5%" },
  { id: "resonantPalm", branch: "active", name: "Resonant Palm", description: "Manual clicking carries more force. Click production is permanently increased by 15%.", cost: 3, tag: "Clicks +15%" },
  { id: "stormEtching", branch: "idle", name: "Storm Etching", description: "Every generator cuts deeper into the storm. Generator production is permanently increased by 15%.", cost: 5, tag: "Generators +15%" },
  { id: "pressureMemory", branch: "discovery", name: "Pressure Memory", description: "Resonance remembers more clearly. Each Resonance grants 1.1% production instead of 1%.", cost: 10, tag: "Resonance +10%" },
  { id: "fracturedMultiplier", branch: "event", name: "Fractured Multiplier", description: "The Rift leaves a permanent fracture in the math. All Shard production is permanently increased by 25%.", cost: 25, tag: "All +25%" },
  { id: "echoAmplifier", branch: "event", name: "Echo Amplifier", description: "Echoes thicken the air. All Shard production is permanently increased by 50%.", cost: 250, tag: "All +50%" },
  { id: "riftFoundry", branch: "idle", name: "Rift Foundry", description: "Generators are reforged in the space between runs. Generator production is permanently increased by 50%.", cost: 1000, tag: "Generators +50%" },
  { id: "batonInTheVoid", branch: "active", name: "Baton in the Void", description: "Clicks carve through silence itself. Click production is permanently increased by 75%.", cost: 2500, tag: "Clicks +75%" },
  { id: "acclaimConductor", branch: "economy", name: "Acclaim Conductor", description: "Your reputation carries farther. Acclaim bonuses are 50% stronger.", cost: 5000, tag: "Acclaim +50%" },
  { id: "resonanceEngine", branch: "discovery", name: "Resonance Engine", description: "Each point of Resonance carries 25% more force.", cost: 10000, tag: "Resonance +25%" },
  { id: "blackglassEndowment", branch: "economy", name: "Blackglass Endowment", description: "A permanent foundation under every run. All Shard production is permanently doubled.", cost: 25000, tag: "All x2" },
];

export const ACCLAIM_MILESTONES = [
  { id: "shards1k", label: "1K lifetime Shards", type: "lifetimeShards", amount: 1000 },
  { id: "shards100k", label: "100K lifetime Shards", type: "lifetimeShards", amount: 100000 },
  { id: "shards10m", label: "10M lifetime Shards", type: "lifetimeShards", amount: 10000000 },
  { id: "shards1b", label: "1B lifetime Shards", type: "lifetimeShards", amount: 1000000000 },
  { id: "shards1t", label: "1T lifetime Shards", type: "lifetimeShards", amount: 1000000000000 },
  { id: "clicks100", label: "100 lifetime clicks", type: "totalClicks", amount: 100 },
  { id: "clicks1k", label: "1K lifetime clicks", type: "totalClicks", amount: 1000 },
  { id: "clicks10k", label: "10K lifetime clicks", type: "totalClicks", amount: 10000 },
  { id: "generators50", label: "50 generators owned", type: "totalGenerators", amount: 50 },
  { id: "generators250", label: "250 generators owned", type: "totalGenerators", amount: 250 },
  { id: "generators1000", label: "1K generators owned", type: "totalGenerators", amount: 1000 },
  { id: "upgrades25", label: "25 upgrades purchased", type: "purchasedUpgrades", amount: 25 },
  { id: "upgrades100", label: "100 upgrades purchased", type: "purchasedUpgrades", amount: 100 },
  { id: "rift1", label: "Enter the Rift once", type: "riftEntries", amount: 1 },
  { id: "rift5", label: "Enter the Rift five times", type: "riftEntries", amount: 5 },
  { id: "echoes10", label: "10 lifetime Echoes", type: "totalEchoesEarned", amount: 10 },
  { id: "echoes100", label: "100 lifetime Echoes", type: "totalEchoesEarned", amount: 100 },
  { id: "riftwork5", label: "Etch 5 Riftwork rites", type: "purchasedRiftwork", amount: 5 },
  { id: "passive1k", label: "1K best Shards per second", type: "bestPassiveRate", amount: 1000 },
  { id: "passive1m", label: "1M best Shards per second", type: "bestPassiveRate", amount: 1000000 },
];
