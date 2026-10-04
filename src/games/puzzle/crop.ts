/** Rekenwerk voor het uitsnijden: de foto ligt verschoven en ingezoomd achter een vast kader. */

export interface Frame {
  width: number;
  height: number;
}

export interface View {
  /** Schaal van de foto (kaderpixels per fotopixel). */
  scale: number;
  /** Positie van de linkerbovenhoek van de foto in het kader (nul of negatief). */
  x: number;
  y: number;
}

/** Kleinste schaal waarbij de foto het kader nog helemaal bedekt. */
export function coverScale(imgW: number, imgH: number, frame: Frame): number {
  return Math.max(frame.width / imgW, frame.height / imgH);
}

export function clampView(view: View, imgW: number, imgH: number, frame: Frame): View {
  const scale = Math.max(view.scale, coverScale(imgW, imgH, frame));
  return {
    scale,
    x: Math.min(0, Math.max(frame.width - imgW * scale, view.x)),
    y: Math.min(0, Math.max(frame.height - imgH * scale, view.y)),
  };
}

/** Zoomt naar `scale` rond een punt in het kader (bijvoorbeeld het midden), zonder dat de foto verspringt. */
export function zoomAround(view: View, scale: number, around: { x: number; y: number }, imgW: number, imgH: number, frame: Frame): View {
  const k = scale / view.scale;
  return clampView(
    { scale, x: around.x - (around.x - view.x) * k, y: around.y - (around.y - view.y) * k },
    imgW,
    imgH,
    frame,
  );
}

/** De zichtbare uitsnede als fracties (0–1) van de originele foto. */
export function cropFromView(view: View, imgW: number, imgH: number, frame: Frame) {
  return {
    x: -view.x / (view.scale * imgW),
    y: -view.y / (view.scale * imgH),
    width: frame.width / (view.scale * imgW),
    height: frame.height / (view.scale * imgH),
  };
}

export const ASPECTS = {
  liggend: { icon: '▭', ratio: 4 / 3 },
  staand: { icon: '▯', ratio: 3 / 4 },
  vierkant: { icon: '◻️', ratio: 1 },
} as const;
export type AspectName = keyof typeof ASPECTS;
