export function createAudio(getSettings) {
  let context, music;
  function audio() {
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Audio || !navigator.userActivation?.hasBeenActive) return null;
    context ||= new Audio();
    if (context.state === "suspended") context.resume().catch(() => {});
    return context;
  }
  function tone(purchase = false) {
    if (!getSettings().sound) return;
    const a = audio();
    if (!a) return;
    const oscillator = a.createOscillator(),
      gain = a.createGain();
    oscillator.frequency.value = purchase ? 330 : 180;
    gain.gain.setValueAtTime(0.015, a.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.1);
    oscillator.connect(gain).connect(a.destination);
    oscillator.start();
    oscillator.stop(a.currentTime + 0.1);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
  function sync() {
    if (!getSettings().music) {
      if (music) {
        music.nodes.forEach((n) => {
          n.stop();
          n.disconnect();
        });
        music.gain.disconnect();
        music = null;
      }
      return;
    }
    if (music) return;
    const a = audio();
    if (!a) return;
    const gain = a.createGain();
    gain.gain.value = 0.004;
    gain.connect(a.destination);
    const nodes = [55, 82.5, 110].map((frequency) => {
      const n = a.createOscillator();
      n.frequency.value = frequency;
      n.connect(gain);
      n.start();
      return n;
    });
    music = { nodes, gain };
  }
  return { tone, sync };
}
