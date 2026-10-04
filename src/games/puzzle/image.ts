import type { PieceInfo, Rect } from './grid';

export const MAX_IMAGE_WIDTH = 2048;

/** Uitsnede als fracties (0–1) van de originele foto. */
export type Crop = Rect;

/** Snijdt de uitsnede uit de foto en verkleint tot maximaal MAX_IMAGE_WIDTH pixels breed. */
export function cropAndScale(source: CanvasImageSource & { width: number; height: number }, crop: Crop): HTMLCanvasElement {
  const sx = crop.x * source.width;
  const sy = crop.y * source.height;
  const sw = crop.width * source.width;
  const sh = crop.height * source.height;
  const scale = Math.min(1, MAX_IMAGE_WIDTH / sw);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  canvas.getContext('2d')!.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Eén canvas per stuk, rechthoekig uitgeknipt uit de (verkleinde) afbeelding. */
export function sliceRectangular(image: HTMLCanvasElement, pieces: PieceInfo[]): Map<number, HTMLCanvasElement> {
  const result = new Map<number, HTMLCanvasElement>();
  for (const { id, rect } of pieces) {
    const canvas = document.createElement('canvas');
    canvas.width = rect.width;
    canvas.height = rect.height;
    canvas.getContext('2d')!.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
    result.set(id, canvas);
  }
  return result;
}
