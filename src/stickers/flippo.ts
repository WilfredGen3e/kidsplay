import type { View } from '../games/puzzle/crop';
import type { FlippoCrop } from './model';

/** Zijde van het (vierkante) editorkader; uitsnede-eenheden verwijzen hiernaar. */
export const FLIPPO_FRAME = 320;
export const FLIPPO_SIZE = 512;
export const MAX_ORIGINAL = 2048;
export const BORDER_COLORS = ['#e03131', '#f08c00', '#fcc419', '#2f9e44', '#1c7ed6', '#7048e8', '#e64980', '#212529', '#ffffff'];

type Source = HTMLImageElement | HTMLCanvasElement;

const dims = (s: Source) =>
  s instanceof HTMLImageElement ? { w: s.naturalWidth, h: s.naturalHeight } : { w: s.width, h: s.height };

/** Kopie waarvan de langste zijde maximaal `max` pixels is. */
export function fitCanvas(source: Source, max = MAX_ORIGINAL): HTMLCanvasElement {
  const { w, h } = dims(source);
  const k = Math.min(1, max / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * k);
  canvas.height = Math.round(h * k);
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function rotateCanvas(source: Source, rotation: FlippoCrop['rotation']): HTMLCanvasElement {
  const { w, h } = dims(source);
  const turned = rotation === 90 || rotation === 270;
  const canvas = document.createElement('canvas');
  canvas.width = turned ? h : w;
  canvas.height = turned ? w : h;
  const ctx = canvas.getContext('2d')!;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(source, -w / 2, -h / 2);
  return canvas;
}

export function toBlob(canvas: HTMLCanvasElement, type: 'image/png' | 'image/jpeg', quality = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Afbeelding opslaan mislukt'))), type, quality),
  );
}

/** Deterministisch kleurloos "toeval" voor de glitters, zodat een flippo er altijd hetzelfde uitziet. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const radius = i % 2 === 0 ? r : r * 0.28;
    const angle = (i * Math.PI) / 4;
    ctx.lineTo(x + Math.sin(angle) * radius, y - Math.cos(angle) * radius);
  }
  ctx.closePath();
  ctx.fill();
}

/** Ronde rand, eventueel met glitter. Tekent binnen de cirkel van `size`. */
function drawBorder(ctx: CanvasRenderingContext2D, size: number, color: string | null, glitter: boolean) {
  const c = size / 2;
  const ring = size * 0.065;
  if (color || glitter) {
    ctx.lineWidth = ring;
    if (glitter) {
      const conic = (ctx as CanvasRenderingContext2D & { createConicGradient?: (a: number, x: number, y: number) => CanvasGradient })
        .createConicGradient;
      if (conic) {
        const g = conic.call(ctx, 0, c, c);
        ['#ffd43b', '#ff8787', '#da77f2', '#74c0fc', '#8ce99a', '#ffd43b'].forEach((col, i, all) => g.addColorStop(i / (all.length - 1), col));
        ctx.strokeStyle = g;
      } else {
        ctx.strokeStyle = '#ffd43b';
      }
    } else {
      ctx.strokeStyle = color!;
    }
    ctx.beginPath();
    ctx.arc(c, c, c - ring / 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (glitter) {
    const rnd = seeded(7);
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 26; i++) {
      const angle = rnd() * Math.PI * 2;
      const radius = c - ring * (0.2 + rnd() * 1.6);
      star(ctx, c + Math.cos(angle) * radius, c + Math.sin(angle) * radius, size * (0.012 + rnd() * 0.02));
    }
  }
  // Dun randje van buiten, zodat witte flippo's op een witte pagina zichtbaar blijven.
  ctx.lineWidth = Math.max(1, size * 0.006);
  ctx.strokeStyle = 'rgb(0 0 0 / 28%)';
  ctx.beginPath();
  ctx.arc(c, c, c - ctx.lineWidth / 2, 0, Math.PI * 2);
  ctx.stroke();
}

/** Tekent de flippo: de (al gedraaide) afbeelding in een cirkel met rand, in `size` × `size` pixels. */
export function renderFlippo(
  rotated: HTMLCanvasElement,
  view: View,
  border: string | null,
  glitter: boolean,
  size = FLIPPO_SIZE,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const k = size / FLIPPO_FRAME;
  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(rotated, view.x * k, view.y * k, rotated.width * view.scale * k, rotated.height * view.scale * k);
  ctx.restore();
  drawBorder(ctx, size, border, glitter);
  return canvas;
}

/** Gouden "compleet"-sticker met een ster. */
export function goldSticker(size = FLIPPO_SIZE): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const c = size / 2;
  const g = ctx.createRadialGradient(c * 0.8, c * 0.7, size * 0.05, c, c, c);
  g.addColorStop(0, '#fff3bf');
  g.addColorStop(0.55, '#ffd43b');
  g.addColorStop(1, '#e8a200');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c, c, c, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff9db';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = (i % 2 === 0 ? 0.36 : 0.15) * size;
    const angle = (i * Math.PI) / 5;
    ctx.lineTo(c + Math.sin(angle) * radius, c * 1.05 - Math.cos(angle) * radius);
  }
  ctx.closePath();
  ctx.fill();
  drawBorder(ctx, size, '#f08c00', true);
  return canvas;
}

let goldUrl: string | undefined;
export function goldStickerUrl(): string {
  goldUrl ??= goldSticker(256).toDataURL('image/png');
  return goldUrl;
}
