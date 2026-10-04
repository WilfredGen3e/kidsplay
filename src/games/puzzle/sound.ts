let audio: AudioContext | undefined;

/** Kort, vrolijk klikgeluid bij het vastklikken van een stuk. */
export function playClick(): void {
  try {
    audio ??= new AudioContext();
    const t = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(660, t);
    osc.frequency.exponentialRampToValueAtTime(990, t + 0.06);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + 0.13);
  } catch {
    // Geen geluid beschikbaar: het spel werkt gewoon door.
  }
}

/** Vrolijk deuntje als de puzzel af is. */
export function playFanfare(): void {
  try {
    audio ??= new AudioContext();
    const start = audio.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const t = start + i * 0.14;
      const osc = audio!.createOscillator();
      const gain = audio!.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + (i === 3 ? 0.7 : 0.2));
      osc.connect(gain).connect(audio!.destination);
      osc.start(t);
      osc.stop(t + 0.75);
    });
  } catch {
    // Geen geluid beschikbaar: het spel werkt gewoon door.
  }
}
