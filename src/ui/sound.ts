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

/** Papier scheuren: een korte ruisstoot. */
export function playRip(): void {
  try {
    audio ??= new AudioContext();
    const t = audio.currentTime;
    const length = Math.floor(audio.sampleRate * 0.22);
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = audio.createBufferSource();
    source.buffer = buffer;
    const filter = audio.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1800;
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    source.connect(filter).connect(gain).connect(audio.destination);
    source.start(t);
  } catch {
    // Geen geluid beschikbaar: het spel werkt gewoon door.
  }
}

/** Glinsterend geluidje als een sticker verschijnt of in het boek landt. */
export function playSparkle(): void {
  try {
    audio ??= new AudioContext();
    const start = audio.currentTime;
    [1318.5, 1568, 2093].forEach((freq, i) => {
      const t = start + i * 0.07;
      const osc = audio!.createOscillator();
      const gain = audio!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain).connect(audio!.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  } catch {
    // Geen geluid beschikbaar: het spel werkt gewoon door.
  }
}
