function getGeneratorDeltaState() {
  if (typeof window.render_game_to_text !== "function") return null;

  try {
    return JSON.parse(window.render_game_to_text());
  } catch (error) {
    return null;
  }
}

function formatGeneratorDelta(value) {
  if (!Number.isFinite(value)) return "0";

  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs < 1000) return `${sign}${trimGeneratorDelta(abs)}`;

  const units = [
    { value: 1e60, suffix: "N" }, { value: 1e57, suffix: "OcD" }, { value: 1e54, suffix: "SpD" },
    { value: 1e51, suffix: "SxD" }, { value: 1e48, suffix: "QiD" }, { value: 1e45, suffix: "QaD" },
    { value: 1e42, suffix: "TD" }, { value: 1e39, suffix: "DD" }, { value: 1e36, suffix: "U" },
    { value: 1e33, suffix: "Dc" }, { value: 1e30, suffix: "No" }, { value: 1e27, suffix: "Oc" },
    { value: 1e24, suffix: "Sp" }, { value: 1e21, suffix: "Sx" }, { value: 1e18, suffix: "Qi" },
    { value: 1e15, suffix: "Qa" }, { value: 1e12, suffix: "T" }, { value: 1e9, suffix: "B" },
    { value: 1e6, suffix: "M" }, { value: 1e3, suffix: "K" },
  ];

  const unit = units.find((item) => abs >= item.value);
  if (!unit) return `${sign}${Math.floor(abs).toLocaleString()}`;
  return `${sign}${trimGeneratorDelta(abs / unit.value)}${unit.suffix}`;
}

function trimGeneratorDelta(value) {
  if (value >= 100) return String(Math.floor(value));
  if (value >= 10) return value.toFixed(1).replace(/\.0$/, "");
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function annotateGeneratorDeltas() {
  const snapshot = getGeneratorDeltaState();
  if (!snapshot?.generators?.length) return;

  const generatorMap = new Map(snapshot.generators.map((generator) => [generator.id, generator]));

  for (const button of document.querySelectorAll("[data-generator-id]")) {
    const generator = generatorMap.get(button.dataset.generatorId);
    if (!generator) continue;

    const rateSpans = button.querySelectorAll(".item-meta span");
    const rateSpan = Array.from(rateSpans).find((span) => span.textContent.includes("/s"));
    if (!rateSpan) continue;

    const multiplier = (snapshot.productionMultiplier || 1) * (snapshot.generatorRiftworkMultiplier || 1);
    const nextGain = generator.owned > 0
      ? generator.contribution / generator.owned
      : generator.baseRate * multiplier;

    const currentTotal = generator.owned > 0 ? generator.contribution : generator.baseRate * multiplier;
    rateSpan.textContent = `+${formatGeneratorDelta(currentTotal)}/s (+${formatGeneratorDelta(nextGain)})`;
    rateSpan.title = `Buying one more ${generator.name} adds ${formatGeneratorDelta(nextGain)} Shards per second.`;
  }
}

window.addEventListener("load", annotateGeneratorDeltas);
window.setInterval(annotateGeneratorDeltas, 250);
