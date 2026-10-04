/** Schaal waarmee een afbeelding van imgW × imgH met marge in het speelvlak past. */
export function fitScale(stageW: number, stageH: number, imgW: number, imgH: number, fill = 0.9): number {
  return Math.min((stageW * fill) / imgW, (stageH * fill) / imgH);
}

/** Houdt het midden van een stuk binnen het speelvlak, zodat het nooit buiten beeld verdwijnt. */
export function clampToStage(x: number, y: number, w: number, h: number, stageW: number, stageH: number) {
  return {
    x: Math.min(Math.max(x, -w / 2), stageW - w / 2),
    y: Math.min(Math.max(y, -h / 2), stageH - h / 2),
  };
}
