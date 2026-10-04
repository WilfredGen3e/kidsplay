/** Ingebouwde voorbeeldafbeelding tot de ouder zelf foto's kan uploaden. */
export function makeSampleImage(width = 1600, height = 1200): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext('2d')!;

  const sky = g.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#4dabf7');
  sky.addColorStop(1, '#d0ebff');
  g.fillStyle = sky;
  g.fillRect(0, 0, width, height);

  g.fillStyle = '#ffd43b';
  g.beginPath();
  g.arc(width * 0.8, height * 0.2, height * 0.12, 0, Math.PI * 2);
  g.fill();

  const hills: [string, number, number][] = [
    ['#69db7c', 0.62, 0.35],
    ['#40c057', 0.72, 0.25],
    ['#2f9e44', 0.85, 0.2],
  ];
  for (const [color, top, amp] of hills) {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, height);
    for (let x = 0; x <= width; x += 20) {
      g.lineTo(x, height * top + Math.sin(x / width * 5 + top * 10) * height * amp * 0.25);
    }
    g.lineTo(width, height);
    g.fill();
  }

  const dots = ['#ff6b6b', '#f783ac', '#9775fa', '#ffa94d', '#fff'];
  for (let i = 0; i < 40; i++) {
    g.fillStyle = dots[i % dots.length];
    g.beginPath();
    g.arc(((i * 7919) % 1000) / 1000 * width, (0.6 + ((i * 104729) % 400) / 1000) * height, 14 + (i % 4) * 8, 0, Math.PI * 2);
    g.fill();
  }
  return canvas;
}
