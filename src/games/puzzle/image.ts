import type { Rect } from './grid';

export const MAX_IMAGE_WIDTH = 2048;

/** Uitsnede als fracties (0–1) van de originele foto. */
export type Crop = Rect;

/** Foto uit een bestand of Blob; faalt bij formaten die de webview niet kan lezen (bijvoorbeeld HEIC in Chrome). */
export async function loadImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function blobToCanvas(img: HTMLImageElement | HTMLCanvasElement): HTMLCanvasElement {
  const width = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
  const height = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(img, 0, 0);
  return canvas;
}

/** Snijdt de uitsnede uit de foto en verkleint tot maximaal MAX_IMAGE_WIDTH pixels breed. */
export function cropAndScale(source: HTMLImageElement | HTMLCanvasElement, crop: Crop): HTMLCanvasElement {
  const srcW = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const srcH = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  const sx = crop.x * srcW;
  const sy = crop.y * srcH;
  const sw = crop.width * srcW;
  const sh = crop.height * srcH;
  const scale = Math.min(1, MAX_IMAGE_WIDTH / sw);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  canvas.getContext('2d')!.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Afbeelding opslaan mislukt'))), 'image/jpeg', quality),
  );
}

/** Kleine kopie voor tegels en lijsten. */
export function thumbnail(canvas: HTMLCanvasElement, maxWidth = 400): HTMLCanvasElement {
  const k = Math.min(1, maxWidth / canvas.width);
  const copy = document.createElement('canvas');
  copy.width = Math.round(canvas.width * k);
  copy.height = Math.round(canvas.height * k);
  copy.getContext('2d')!.drawImage(canvas, 0, 0, copy.width, copy.height);
  return copy;
}
