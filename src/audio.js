export function createAudioEngine(getState) {
  let context = null;
  let musicNodes = null;

  const getSettings = () => getState().settings;

  function ensureContext() {
    if (!context) context = new AudioContext();
    if (context.state === "suspended") context.resume();
    return context;
  }

  function tone(frequency, duration = 0.08, volume = 0.025) {
    if (!getSettings().sound) return;
    const audio = ensureContext();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  }

  function syncMusic() {
    if (!getSettings().music) {
      stopMusic();
      return;
    }
    if (musicNodes) return;
    const audio = ensureContext();
    const master = audio.createGain();
    const filter = audio.createBiquadFilter();
    master.gain.value = 0.008;
    filter.type = "lowpass";
    filter.frequency.value = 260;
    master.connect(filter).connect(audio.destination);
    const oscillators = [55, 82.5, 110, 164.81].map((frequency, index) => {
      const oscillator = audio.createOscillator();
      const layer = audio.createGain();
      oscillator.type = index < 2 ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      layer.gain.value = index < 2 ? 0.7 : 0;
      oscillator.connect(layer).connect(master);
      oscillator.start();
      return { oscillator, layer };
    });
    musicNodes = { oscillators, master, filter };
    syncProduction();
  }

  function stopMusic() {
    musicNodes?.oscillators?.forEach(({ oscillator }) => oscillator.stop?.());
    musicNodes = null;
  }

  function syncProduction() {
    if (!musicNodes || !context) return;
    const state = getState();
    const density = Math.min(1, Math.log10(Math.max(1, state.bestPassiveRate + 1)) / 7);
    const now = context.currentTime;
    musicNodes.master.gain.setTargetAtTime(0.007 + density * 0.008, now, 0.8);
    musicNodes.filter.frequency.setTargetAtTime(240 + density * 900, now, 1.2);
    musicNodes.oscillators.forEach(({ layer }, index) => {
      const target = index < 2 ? 0.65 : Math.max(0, density - (index === 2 ? 0.2 : 0.55)) * 0.55;
      layer.gain.setTargetAtTime(target, now, 1.4);
    });
  }

  function haptic(pattern) {
    if (getSettings().haptics && navigator.vibrate) navigator.vibrate(pattern);
  }

  return {
    click: () => tone(180, 0.05, 0.012),
    critical: () => { tone(480, 0.18, 0.04); haptic([18, 20, 28]); },
    rift: () => { tone(330, 0.25, 0.04); haptic(35); },
    purchase: () => { tone(260, 0.07, 0.018); window.setTimeout(() => tone(390, 0.1, 0.014), 55); },
    objective: () => { tone(330, 0.12, 0.02); window.setTimeout(() => tone(495, 0.18, 0.018), 85); },
    prestige: () => { tone(110, 0.5, 0.04); window.setTimeout(() => tone(220, 0.55, 0.025), 140); haptic([28, 35, 55]); },
    syncMusic,
    syncProduction,
  };
}
